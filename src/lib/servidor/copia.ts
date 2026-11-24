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
//
// A marca de mudança (item 1 da revisão D1f; marca-da-copia.ts): o índice e cada parte trazem `marca`, lida na
// mesma consulta das linhas. Quem junta só aceita a sequência em que ela não mudou, e a refaz se mudou.
import { banco } from './ambiente';
import { tamanhoDoBanco } from './repositorio';
import { TABELAS_DA_COPIA, TABELA_DA_MARCA, garantirGatilhosDaMarca } from './marca-da-copia';
import { AVISO_A_PARTIR_DE, LIMITE_DO_PLANO, situacaoDoBanco } from '../tamanho-do-banco';
import { MARCA_DO_ACERVO, baixarCopiaEmPartes, linhasPorParte, type CopiaDoAcervoInteira, type IndiceDaCopia, type ParteDaCopia } from '../copia-em-partes';

export type Copia = CopiaDoAcervoInteira;

/** As tabelas do banco, em ordem de nome: as mesmas da cópia inteira de antes (a da marca fica de fora). */
async function nomesDasTabelas(): Promise<string[]> {
  const { results } = await banco().prepare(TABELAS_DA_COPIA).all<{ name: string }>();
  return results.map((t: { name: string }) => t.name);
}

const entreAspas = (nome: string) => `"${nome.replace(/"/g, '""')}"`;

/** Sem a linha da marca, a cópia não tem como saber se algo foi gravado no meio: recusa em vez de arriscar. */
export class CopiaSemMarca extends Error {}

/** O primeiro pedido: as tabelas, quantas linhas cada uma tem, a marca e o tamanho do banco. */
export async function montarIndice(): Promise<IndiceDaCopia> {
  // Uma tabela nova sem os gatilhos da marca ganha agora, antes de a marca ser lida
  await garantirGatilhosDaMarca(banco());
  const nomes = await nomesDasTabelas();
  // Num lote só, que é uma transação: as contagens e a marca do mesmo instante
  const [marca, ...contagens] = await banco().batch([
    banco().prepare(`SELECT valor FROM ${TABELA_DA_MARCA} WHERE id = 1`),
    ...nomes.map((nome) => banco().prepare(`SELECT COUNT(*) AS n FROM ${entreAspas(nome)}`)),
  ]);
  const valor = (marca?.results?.[0] as { valor?: number } | undefined)?.valor;
  if (typeof valor !== 'number') throw new CopiaSemMarca('A marca de mudança do acervo não existe.');
  const situacao = situacaoDoBanco(await tamanhoDoBanco());
  return {
    acervo: MARCA_DO_ACERVO,
    gerada_em: new Date().toISOString(),
    marca: valor,
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
  // Uma consulta só, para a marca e as linhas serem do mesmo instante: a página (com uma linha a mais, só para
  // saber se a tabela continua) e, no fim, uma linha a mais com a marca no lugar do rowid ("marca:<n>") e as
  // colunas vazias. A marca vai uma vez, e não em toda linha: a parte custa o mesmo que antes.
  const t = entreAspas(tabela);
  const comando = banco().prepare(
    `SELECT * FROM (SELECT rowid AS "__linha_da_copia", * FROM ${t}${depois === null ? '' : ' WHERE rowid > ?1'} ORDER BY rowid LIMIT ${tamanho + 1})
     UNION ALL SELECT 'marca:' || m.valor, x.* FROM ${TABELA_DA_MARCA} m LEFT JOIN ${t} x ON 0 WHERE m.id = 1`,
  );
  const [cabecalho, ...todas] = (await (depois === null ? comando : comando.bind(depois)).raw({ columnNames: true })) as [string[], ...unknown[][]];
  const linhaDaMarca = todas.findIndex((l) => typeof l[0] === 'string' && l[0].startsWith('marca:'));
  if (linhaDaMarca < 0) throw new CopiaSemMarca('A marca de mudança do acervo não existe.');
  const marca = Number((todas[linhaDaMarca]![0] as string).slice('marca:'.length));
  const linhas = todas.filter((_, i) => i !== linhaDaMarca);
  // Em ordem de rowid, como a página pediu (a união não muda a ordem; conferido sem custo)
  for (let i = 1; i < linhas.length; i++) if (Number(linhas[i]![0]) < Number(linhas[i - 1]![0])) linhas.sort((a, b) => Number(a[0]) - Number(b[0]));
  const continua = linhas.length > tamanho;
  const pagina = continua ? linhas.slice(0, tamanho) : linhas;
  return {
    acervo: MARCA_DO_ACERVO,
    tabela,
    marca,
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
  // As mesmas regras de quem junta, com a marca conferida: as partes são lidas aqui mesmo, sem pedido
  return baixarCopiaEmPartes(
    async (endereco) => {
      const busca = new URL(endereco, 'http://copia').searchParams;
      const tabela = busca.get('tabela');
      if (tabela === null) return montarIndice();
      const depois = busca.get('depois');
      return montarParte(tabela, depois === null ? null : Number(depois));
    },
    undefined,
    async () => undefined,
  );
}

const json = (dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' } });

/**
 * A resposta de `/api/copia`: o índice sem parâmetros, ou a parte pedida em `tabela` e `depois`. `terminou` diz
 * se esta foi a última página da última tabela do índice, para a anotação da cópia mensal (middleware).
 * Quem pode pedir é conferido antes, igual para o índice e para cada parte.
 */
export async function respostaDaCopia(url: URL): Promise<{ resposta: Response; terminou: boolean }> {
  try {
    const tabela = url.searchParams.get('tabela');
    if (tabela === null) return { resposta: json(await montarIndice()), terminou: false };
    const textoDepois = url.searchParams.get('depois');
    if (textoDepois !== null && !/^-?\d{1,18}$/.test(textoDepois)) return { resposta: json({ erro: 'A parte pedida não existe.' }, 400), terminou: false };
    const nomes = await nomesDasTabelas();
    const parte = await montarParte(tabela, textoDepois === null ? null : Number(textoDepois), nomes);
    if (!parte) return { resposta: json({ erro: 'A parte pedida não existe.' }, 404), terminou: false };
    return { resposta: json(parte), terminou: parte.proxima === null && tabela === nomes[nomes.length - 1] };
  } catch (erro) {
    if (erro instanceof CopiaSemMarca) return { resposta: json({ erro: 'A cópia não pode conferir se o acervo mudou no meio dela.' }, 500), terminou: false };
    throw erro;
  }
}
