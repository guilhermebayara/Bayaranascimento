// A marca de mudança do acervo (item 1 da revisão D1f, 24/11/2026; migração 113).
//
// A cópia do acervo vem em partes, e cada parte é um pedido (src/lib/servidor/copia.ts). Uma gravação entre
// duas partes deixava o arquivo juntado com o relato sem a memória, e a restauração falhava. Agora o banco
// tem um número que sobe a cada gravação em qualquer tabela, por gatilhos: o índice e cada parte trazem esse
// número, lido na mesma consulta das linhas. Quem junta (o script do Drive e o navegador) só aceita a cópia
// em que o número ficou igual do índice à última parte: nenhuma gravação entrou no meio, e o arquivo é o banco
// de um instante só. Se mudou, a sequência inteira é refeita, num número limitado de vezes.
//
// Os gatilhos não ficam numa migração: as tabelas mudam (as prévias criam `limpezas_do_teste` fora das
// migrações, e refazer uma tabela apaga os gatilhos dela). garantirGatilhosDaMarca cria os que faltam em toda
// tabela que existe, ao preparar o banco e de novo no índice da cópia, e a guarda por pedido sabe que gravar
// em qualquer tabela muda a marca (cobrirGravacaoEmTodaTabela, em ambiente.ts).

/** A tabela da marca: uma linha só, fora da cópia (ela não faz parte do acervo). */
export const TABELA_DA_MARCA = 'marca_da_copia';

/** As tabelas que a cópia leva: todas, menos as do próprio SQLite, as da Cloudflare e a da marca. */
export const TABELAS_DA_COPIA = `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name <> '${TABELA_DA_MARCA}'
     ORDER BY name`;

const OPERACOES = ['INSERT', 'UPDATE', 'DELETE'] as const;
const entreAspas = (nome: string) => `"${nome.replace(/"/g, '""')}"`;
const nomeDoGatilho = (tabela: string, operacao: (typeof OPERACOES)[number]) => `${TABELA_DA_MARCA}_${tabela}_${operacao.toLowerCase()}`;

/** Os três gatilhos de uma tabela: depois de inserir, mudar ou apagar uma linha, a marca sobe. */
export function gatilhosDaMarca(tabela: string): string[] {
  return OPERACOES.map(
    (operacao) =>
      `CREATE TRIGGER IF NOT EXISTS ${entreAspas(nomeDoGatilho(tabela, operacao))} AFTER ${operacao} ON ${entreAspas(tabela)} BEGIN UPDATE ${TABELA_DA_MARCA} SET valor = valor + 1 WHERE id = 1; END`,
  );
}

/** A tabela entra na cópia (a mesma regra de TABELAS_DA_COPIA)? */
export const tabelaDaCopia = (nome: string) => !/^sqlite_/i.test(nome) && !/^_cf_/i.test(nome) && nome !== TABELA_DA_MARCA;

interface BancoParaAMarca {
  prepare(sql: string): { all<T>(): Promise<{ results: T[] }> };
  batch(comandos: never[]): Promise<unknown>;
}

/**
 * Cria os gatilhos que faltam, em toda tabela da cópia. Uma leitura só quando nada falta; devolve quantos
 * gatilhos foram criados. Sem a tabela da marca (antes da migração 113), não faz nada.
 */
export async function garantirGatilhosDaMarca(db: BancoParaAMarca): Promise<number> {
  const { results } = await db.prepare(`SELECT type, name FROM sqlite_master WHERE type IN ('table', 'trigger')`).all<{ type: string; name: string }>();
  const linhas = results as { type: string; name: string }[];
  if (!linhas.some((l) => l.type === 'table' && l.name === TABELA_DA_MARCA)) return 0;
  const existentes = new Set(linhas.filter((l) => l.type === 'trigger').map((l) => l.name));
  const faltam: string[] = [];
  for (const { name: tabela } of linhas.filter((l) => l.type === 'table' && tabelaDaCopia(l.name))) {
    const sqls = gatilhosDaMarca(tabela);
    OPERACOES.forEach((operacao, i) => {
      if (!existentes.has(nomeDoGatilho(tabela, operacao))) faltam.push(sqls[i]!);
    });
  }
  if (faltam.length > 0) await db.batch(faltam.map((sql) => db.prepare(sql) as never));
  return faltam.length;
}
