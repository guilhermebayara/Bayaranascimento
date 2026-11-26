// Os casos que a pessoa não pode ver, acrescentados ao acervo de exemplo de um banco de teste
// (testes/apoio/d1.ts). Vieram de testes/visibilidade-banco.test.ts, que confere que nada muda quando eles
// entram; o teste de equivalência de quem vê o quê (testes/quem-ve-equivalencia.test.ts) usa os mesmos
// casos para comparar o SQL com o TS (sessão AC3, 26/11/2026).
import type { DatabaseSync } from './d1';

type Valor = string | number | null;
const executar = (sqlite: DatabaseSync, texto: string, ...valores: Valor[]) => sqlite.prepare(texto).run(...valores);

/** A memória aberta a todos em que entra o relato de quem só existe num laço privado */
export const memoriaAberta = (sqlite: DatabaseSync): string =>
  (sqlite.prepare(`SELECT id FROM memorias WHERE situacao = 'publicada' AND visibilidade = 'todos' AND excluida_em IS NULL AND id NOT LIKE 'zz-%' ORDER BY id LIMIT 1`).get() as { id: string }).id;

/** O relato publicado, com áudio, em nome de 'zz-pessoa', registrado por `registrador` */
export function relatoDaEscondida(sqlite: DatabaseSync, registrador: string): { memoria: string; relato: number } {
  const sql = (texto: string, ...valores: Valor[]) => executar(sqlite, texto, ...valores);
  const memoria = memoriaAberta(sqlite);
  sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, publicado_em) VALUES (?, 'zz-pessoa', ?, 'Relato escondido', 'publicada', datetime('now'))`, memoria, registrador);
  const relato = (sqlite.prepare('SELECT MAX(id) AS id FROM relatos').get() as { id: number }).id;
  sql(`INSERT INTO audios (relato_id, memoria_id, chave, tipo, tamanho, enviado_por) VALUES (?, ?, 'zz-voz.webm', 'audio/webm', 10, ?)`, relato, memoria, registrador);
  // A foto que veio com o relato segue o relato (QA de 18/11/2026: o arquivo era entregue pela rota)
  sql(`INSERT INTO fotos (memoria_id, relato_id, chave, principal, enviada_por) VALUES (?, ?, '2026/zz-foto-do-relato.jpg', 0, ?)`, memoria, relato, registrador);
  return { memoria, relato };
}

/** Acrescenta só o que `quem` não pode ver. */
export function acrescentarEscondido(sqlite: DatabaseSync, quem: string): void {
  const sql = (texto: string, ...valores: Valor[]) => executar(sqlite, texto, ...valores);
  const outro = quem === 'gui' ? 'giovanna' : 'gui';
  // Uma família de que a pessoa não é membro, e alguém que é
  const [familia, membro] = quem === 'lucas-magno' ? ['bayara-nascimento', 'elizete'] : ['bracarense', 'lucio'];
  sql(`INSERT INTO integrantes (id, nome, tipo, nascimento_ano, nascimento_mes, nascimento_dia, retrato, tratamento) VALUES ('zz-pessoa', 'Pessoa Escondida', 'pessoa', 1980, 11, 20, 'retratos/zz.jpg', 'ela')`);
  sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, papel, proximidade, privado) VALUES (?, 'zz-pessoa', 'Laço escondido', 'irmao', 1, 1)`, outro);
  sql(`INSERT INTO casais (a_id, b_id, visibilidade, criado_por) VALUES (?, 'zz-pessoa', 'privado', ?)`, outro, outro);
  sql(`INSERT INTO temas (id, nome) VALUES ('zz-tema', 'Tema escondido')`);
  const temaVisivel = (sqlite.prepare('SELECT tema_id FROM tema_memorias LIMIT 1').get() as { tema_id: string }).tema_id;
  const memorias: [string, string, 'todos' | 'nucleos', string, string | null][] = [
    ['zz-restrita', 'publicada', 'nucleos', membro, null],
    ['zz-rascunho', 'rascunho', 'todos', outro, null],
    // Na lixeira e restrita: nem um administrador que não é da família a via
    ['zz-lixeira', 'publicada', 'nucleos', membro, '2026-11-10 10:00:00'],
  ];
  for (const [id, situacao, visibilidade, por, lixo] of memorias) {
    sql(
      `INSERT INTO memorias (id, titulo, ano, mes, dia, tipo, tipo_outro, visibilidade, situacao, criada_por, publicada_em, excluida_em, excluida_por)
       VALUES (?, 'Escondida', 1995, 11, 17, 'outro', 'Texto escondido', ?, ?, ?, datetime('now'), ?, ?)`,
      id, visibilidade, situacao, por, lixo, lixo ? outro : null,
    );
    if (visibilidade === 'nucleos') sql('INSERT INTO memoria_nucleos VALUES (?, ?)', id, familia);
    for (const p of [quem, outro]) sql('INSERT INTO memoria_integrantes VALUES (?, ?)', id, p);
    sql(`INSERT INTO fotos (memoria_id, chave, principal, enviada_por) VALUES (?, ?, 1, ?)`, id, `2026/zz-${id}.jpg`, quem);
    sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, publicado_em) VALUES (?, ?, ?, 'Escondido', 'publicada', datetime('now'))`, id, por, por);
    const relato = (sqlite.prepare('SELECT MAX(id) AS id FROM relatos').get() as { id: number }).id;
    sql(`INSERT INTO audios (relato_id, memoria_id, chave, tipo, tamanho, enviado_por) VALUES (?, ?, ?, 'audio/webm', 10, ?)`, relato, id, `zz-${id}.webm`, por);
    sql('INSERT INTO tema_memorias VALUES (?, ?)', 'zz-tema', id);
    sql('INSERT INTO tema_memorias VALUES (?, ?)', temaVisivel, id);
    for (const c of ['natais', 'viagens-de-familia']) sql('INSERT INTO capitulo_memorias VALUES (?, ?)', c, id);
  }
  // Rascunho de relato de outra pessoa em toda memória aberta a todos
  for (const { id } of sqlite.prepare(`SELECT id FROM memorias WHERE situacao = 'publicada' AND visibilidade = 'todos' AND id NOT LIKE 'zz-%'`).all() as { id: string }[]) {
    sql(`INSERT OR IGNORE INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, ?, 'Rascunho escondido', 'rascunho')`, id, outro, outro);
  }
  // Um relato registrado em nome de quem só existe no laço privado, com áudio, numa memória que a pessoa
  // vê: some inteiro, da página, da contagem, dos áudios e das novidades (decisão do Gui, 17/11/2026)
  relatoDaEscondida(sqlite, outro);
  sql(`INSERT INTO capitulos (id, titulo, modo, inicio_ano, fim_ano, visibilidade, criado_por) VALUES ('zz-cap', 'Capítulo escondido', 'epoca', 1990, 2000, 'nucleos', ?)`, membro);
  sql('INSERT INTO capitulo_nucleos VALUES (?, ?)', 'zz-cap', familia);
  sql(`INSERT INTO capitulos (id, titulo, modo, visibilidade, criado_por, excluido_em, excluido_por) VALUES ('zz-cap-lixeira', 'Na lixeira', 'reunido', 'nucleos', ?, '2026-11-10 10:00:00', ?)`, membro, membro);
  sql('INSERT INTO capitulo_nucleos VALUES (?, ?)', 'zz-cap-lixeira', familia);
  for (const c of ['zz-cap', 'zz-cap-lixeira']) sql('INSERT INTO tema_capitulos VALUES (?, ?)', 'zz-tema', c);
  sql('INSERT INTO tema_capitulos VALUES (?, ?)', temaVisivel, 'zz-cap');
}
