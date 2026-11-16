// Regra da guarda da produção que nasceu do QA de 15/11/2026: nenhuma migração pode apagar uma tabela
// da qual outra ainda depende com ON DELETE CASCADE. No SQLite, apagar a tabela apaga as linhas dela antes,
// e a cascata leva junto as linhas da outra. Foi o risco da migração 012: apagar "casais" com as fases
// ainda apontando para ela levaria todas as fases do acervo. A tabela que depende é refeita antes.

/** As migrações de src/lib/servidor/banco.ts, em ordem, com os comandos SQL de cada uma. */
export function lerMigracoes(textoDoBanco) {
  const inicio = textoDoBanco.indexOf('const MIGRACOES');
  if (inicio < 0) return [];
  const fim = textoDoBanco.indexOf('\n];', inicio);
  const lista = textoDoBanco.slice(inicio, fim < 0 ? undefined : fim);
  const partes = lista.split(/\bid: '([^']+)'/);
  const migracoes = [];
  for (let i = 1; i < partes.length; i += 2) {
    // Comentários de linha podem ter crases; só os textos entre crases fora deles são SQL
    const corpo = partes[i + 1].replace(/\/\/[^\n]*/g, '');
    migracoes.push({ id: partes[i], sql: [...corpo.matchAll(/`([^`]*)`/g)].map((m) => m[1]) });
  }
  return migracoes;
}

/** As migrações que apagam uma tabela enquanto outra ainda depende dela com exclusão em cascata. */
export function cascatasPerigosas(textoDoBanco) {
  const problemas = [];
  // tabela -> tabelas de que ela depende com ON DELETE CASCADE
  const depende = new Map();
  const nome = (n) => n.replace(/"/g, '').toLowerCase();
  for (const { id, sql } of lerMigracoes(textoDoBanco)) {
    for (const comando of sql) {
      const criar = /^\s*CREATE TABLE\s+(?:IF NOT EXISTS\s+)?("?[\w]+"?)\s*\(/i.exec(comando);
      if (criar) {
        const tabela = nome(criar[1]);
        if (!depende.has(tabela)) {
          const pais = [...comando.matchAll(/REFERENCES\s+("?\w+"?)\s*\([^)]*\)\s*ON DELETE CASCADE/gi)].map((m) => nome(m[1]));
          depende.set(tabela, new Set(pais));
        }
        continue;
      }
      const apagar = /^\s*DROP TABLE\s+(?:IF EXISTS\s+)?("?[\w]+"?)/i.exec(comando);
      if (apagar) {
        const tabela = nome(apagar[1]);
        const filhas = [...depende].filter(([outra, pais]) => outra !== tabela && pais.has(tabela)).map(([outra]) => outra);
        if (filhas.length) {
          problemas.push(`${id}: DROP TABLE ${tabela} apagaria em cascata as linhas de ${filhas.join(', ')}. Refaça ${filhas.length > 1 ? 'essas tabelas' : 'essa tabela'} antes, apontando para a tabela nova.`);
        }
        depende.delete(tabela);
        continue;
      }
      const renomear = /^\s*ALTER TABLE\s+("?\w+"?)\s+RENAME TO\s+("?\w+"?)/i.exec(comando);
      if (renomear) {
        const [de, para] = [nome(renomear[1]), nome(renomear[2])];
        if (depende.has(de)) {
          depende.set(para, depende.get(de));
          depende.delete(de);
        }
        // O SQLite troca as referências das outras tabelas junto
        for (const pais of depende.values()) {
          if (pais.delete(de)) pais.add(para);
        }
      }
    }
  }
  return problemas;
}
