// Regra da guarda da produção que nasceu do QA de 15/11/2026: nenhuma migração pode apagar uma tabela
// da qual outra ainda depende com ON DELETE CASCADE. No SQLite, apagar a tabela apaga as linhas dela antes,
// e a cascata leva junto as linhas da outra. Foi o risco da migração 012: apagar "casais" com as fases
// ainda apontando para ela levaria todas as fases do acervo. A tabela que depende é refeita antes.
//
// Desde a sessão AC1 (26/11/2026, B-2 da auditoria AC) a regra vale também para ON DELETE SET NULL (e SET
// DEFAULT), que dispara no DROP TABLE mesmo com defer_foreign_keys: refazer "memorias" anularia
// fotos.memoria_id e audios.memoria_id. E vale para a chave que entra por ALTER TABLE ... ADD COLUMN ...
// REFERENCES, como fotos.relato_id (migração 022), e não só para a declarada no CREATE TABLE.

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

// O que a exclusão da tabela-pai faz com a linha que depende dela
const REFERENCIA = /REFERENCES\s+("?\w+"?)\s*(?:\([^)]*\))?\s*(?:ON UPDATE\s+(?:SET NULL|SET DEFAULT|NO ACTION|RESTRICT|CASCADE)\s*)?ON DELETE\s+(CASCADE|SET NULL|SET DEFAULT)/gi;
const COMO = { CASCADE: 'apagaria em cascata as linhas de', 'SET NULL': 'anularia (ON DELETE SET NULL) as chaves de', 'SET DEFAULT': 'trocaria pelo padrão (ON DELETE SET DEFAULT) as chaves de' };

/** As migrações que apagam uma tabela enquanto outra ainda depende dela com exclusão em cascata ou que anula a chave. */
export function cascatasPerigosas(textoDoBanco) {
  const problemas = [];
  // tabela -> tabela-pai -> o que a exclusão do pai faz com ela (CASCADE, SET NULL, SET DEFAULT), em conjunto: uma tabela pode apontar duas vezes para o mesmo pai
  const depende = new Map();
  const nome = (n) => n.replace(/"/g, '').toLowerCase();
  const referencias = (comando) => {
    const pais = new Map();
    for (const m of comando.matchAll(REFERENCIA)) {
      const pai = nome(m[1]);
      pais.set(pai, (pais.get(pai) ?? new Set()).add(m[2].toUpperCase().replace(/\s+/g, ' ')));
    }
    return pais;
  };
  for (const { id, sql } of lerMigracoes(textoDoBanco)) {
    for (const comando of sql) {
      const criar = /^\s*CREATE TABLE\s+(?:IF NOT EXISTS\s+)?("?[\w]+"?)\s*\(/i.exec(comando);
      if (criar) {
        const tabela = nome(criar[1]);
        if (!depende.has(tabela)) depende.set(tabela, referencias(comando));
        continue;
      }
      const acrescentar = /^\s*ALTER TABLE\s+("?\w+"?)\s+ADD\s+(?:COLUMN\s+)?/i.exec(comando);
      if (acrescentar) {
        const tabela = nome(acrescentar[1]);
        const novas = referencias(comando);
        if (novas.size) {
          const pais = depende.get(tabela) ?? new Map();
          for (const [pai, acoes] of novas) pais.set(pai, new Set([...(pais.get(pai) ?? []), ...acoes]));
          depende.set(tabela, pais);
        }
        continue;
      }
      const apagar = /^\s*DROP TABLE\s+(?:IF EXISTS\s+)?("?[\w]+"?)/i.exec(comando);
      if (apagar) {
        const tabela = nome(apagar[1]);
        for (const acao of Object.keys(COMO)) {
          const filhas = [...depende].filter(([outra, pais]) => outra !== tabela && pais.get(tabela)?.has(acao)).map(([outra]) => outra);
          if (filhas.length) {
            problemas.push(`${id}: DROP TABLE ${tabela} ${COMO[acao]} ${filhas.join(', ')}. Refaça ${filhas.length > 1 ? 'essas tabelas' : 'essa tabela'} antes, apontando para a tabela nova.`);
          }
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
          if (pais.has(de)) {
            pais.set(para, pais.get(de));
            pais.delete(de);
          }
        }
      }
    }
  }
  return problemas;
}
