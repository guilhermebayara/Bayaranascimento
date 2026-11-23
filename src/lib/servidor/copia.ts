// Cópia de segurança do banco: todas as tabelas, linha por linha, em partes (sessão D1e, decisão do Gui de
// 23/11/2026; o formato e quem junta estão em src/lib/copia-em-partes.ts).
//
// Vai para o Google Drive uma vez por mês (ver docs/copia-no-drive.md) e pode ser baixada a qualquer momento
// pelos admins, em "Baixar cópia do acervo". As fotos não entram: elas ficam no R2 e são grandes demais para
// caber aqui.
//
// Cada pedido lê uma página de uma tabela só, em ordem de rowid, a partir da última linha da página anterior,
// e entrega as linhas como listas de valores (`raw`), sem recuo: assim cada pedido fica abaixo de 10 ms de CPU
// com o acervo cheio. O índice só diz as tabelas e quantas linhas cada uma tem, o que a cópia inteira já diz.
import { banco } from './ambiente';
import { tamanhoDoBanco } from './repositorio';
import { AVISO_A_PARTIR_DE, LIMITE_DO_PLANO, situacaoDoBanco } from '../tamanho-do-banco';
import { MARCA_DO_ACERVO, juntarPartes, linhasPorParte, type CopiaDoAcervoInteira, type IndiceDaCopia, type ParteDaCopia } from '../copia-em-partes';

export type Copia = CopiaDoAcervoInteira;

const TABELAS = `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'
     ORDER BY name`;

/** As tabelas do banco, em ordem de nome: as mesmas da cópia inteira de antes. */
async function nomesDasTabelas(): Promise<string[]> {
  const { results } = await banco().prepare(TABELAS).all<{ name: string }>();
  return results.map((t: { name: string }) => t.name);
}

const entreAspas = (nome: string) => `"${nome.replace(/"/g, '""')}"`;

/** O primeiro pedido: as tabelas, quantas linhas cada uma tem e o tamanho do banco. */
export async function montarIndice(): Promise<IndiceDaCopia> {
  const nomes = await nomesDasTabelas();
  const contagens = nomes.length ? await banco().batch(nomes.map((nome) => banco().prepare(`SELECT COUNT(*) AS n FROM ${entreAspas(nome)}`))) : [];
  const situacao = situacaoDoBanco(await tamanhoDoBanco());
  return {
    acervo: MARCA_DO_ACERVO,
    gerada_em: new Date().toISOString(),
    banco: {
      tamanho_em_bytes: situacao?.bytes ?? null,
      aviso_a_partir_de: AVISO_A_PARTIR_DE,
      limite_do_plano: LIMITE_DO_PLANO,
      passou_do_aviso: situacao?.passouDoAviso ?? false,
    },
    indice: nomes.map((tabela, i) => ({ tabela, linhas: Number((contagens[i]?.results?.[0] as { n?: number } | undefined)?.n ?? 0) })),
  };
}

/** Uma página de uma tabela, a partir da linha seguinte a `depois` (o rowid da última linha da página anterior). */
export async function montarParte(tabela: string, depois: number | null, nomes?: string[]): Promise<ParteDaCopia | null> {
  // O nome entra no SQL: só vale o de uma tabela que está no índice
  if (!(nomes ?? (await nomesDasTabelas())).includes(tabela)) return null;
  const tamanho = linhasPorParte(tabela);
  // Uma linha a mais, só para saber se a tabela continua; o rowid vem na primeira coluna e sai da parte
  const comando = banco().prepare(
    `SELECT rowid AS "__linha_da_copia", * FROM ${entreAspas(tabela)}${depois === null ? '' : ' WHERE rowid > ?1'} ORDER BY rowid LIMIT ${tamanho + 1}`,
  );
  const [cabecalho, ...linhas] = (await (depois === null ? comando : comando.bind(depois)).raw({ columnNames: true })) as [string[], ...unknown[][]];
  const continua = linhas.length > tamanho;
  const pagina = continua ? linhas.slice(0, tamanho) : linhas;
  return {
    acervo: MARCA_DO_ACERVO,
    tabela,
    colunas: (cabecalho ?? []).slice(1),
    linhas: pagina.map((l) => l.slice(1)),
    proxima: continua ? Number(pagina[pagina.length - 1]![0]) : null,
  };
}

/**
 * A cópia inteira, montada das partes como o script do Drive e o navegador montam. Não é servida a ninguém
 * (seria o pedido pesado de antes): fica para os testes e para quem precisa da cópia dentro do servidor.
 */
export async function montarCopia(): Promise<Copia> {
  const indice = await montarIndice();
  const nomes = indice.indice.map((t) => t.tabela);
  const partes: ParteDaCopia[] = [];
  for (const tabela of nomes) {
    let depois: number | null = null;
    for (;;) {
      const parte: ParteDaCopia = (await montarParte(tabela, depois, nomes))!;
      partes.push(parte);
      if (parte.proxima === null) break;
      depois = parte.proxima;
    }
  }
  return juntarPartes(indice, partes);
}

const json = (dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' } });

/**
 * A resposta de `/api/copia`: o índice sem parâmetros, ou a parte pedida em `tabela` e `depois`. `terminou` diz
 * se esta foi a última página da última tabela do índice, para a anotação da cópia mensal (middleware).
 * Quem pode pedir é conferido antes, igual para o índice e para cada parte.
 */
export async function respostaDaCopia(url: URL): Promise<{ resposta: Response; terminou: boolean }> {
  const tabela = url.searchParams.get('tabela');
  if (tabela === null) return { resposta: json(await montarIndice()), terminou: false };
  const textoDepois = url.searchParams.get('depois');
  if (textoDepois !== null && !/^-?\d{1,18}$/.test(textoDepois)) return { resposta: json({ erro: 'A parte pedida não existe.' }, 400), terminou: false };
  const nomes = await nomesDasTabelas();
  const parte = await montarParte(tabela, textoDepois === null ? null : Number(textoDepois), nomes);
  if (!parte) return { resposta: json({ erro: 'A parte pedida não existe.' }, 404), terminou: false };
  return { resposta: json(parte), terminou: parte.proxima === null && tabela === nomes[nomes.length - 1] };
}
