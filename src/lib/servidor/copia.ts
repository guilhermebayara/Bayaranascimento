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
import { banco, esquecerAsLeiturasDoPedido } from './ambiente';
import { tamanhoDoBanco } from './repositorio';
import { TABELAS_DA_COPIA, TABELA_DA_MARCA, garantirGatilhosDaMarca, nomeDoGatilho, precisaDosGatilhos } from './marca-da-copia';
import { AVISO_A_PARTIR_DE, LIMITE_DO_PLANO, situacaoDoBanco } from '../tamanho-do-banco';
import { MARCA_DO_ACERVO, baixarCopiaEmPartes, linhasPorParte, type CopiaDoAcervoInteira, type EsquemaDaCopia, type IndiceDaCopia, type ParteDaCopia } from '../copia-em-partes';

export type Copia = CopiaDoAcervoInteira;

/** As tabelas do banco, em ordem de nome: as mesmas da cópia inteira de antes (a da marca fica de fora). */
async function nomesDasTabelas(): Promise<string[]> {
  const { results } = await banco().prepare(TABELAS_DA_COPIA).all<{ name: string }>();
  return results.map((t: { name: string }) => t.name);
}

const entreAspas = (nome: string) => `"${nome.replace(/"/g, '""')}"`;

/** Sem a linha da marca, a cópia não tem como saber se algo foi gravado no meio: recusa em vez de arriscar. */
export class CopiaSemMarca extends Error {}

// --- A régua da conferência (D1f3): as chaves de cada tabela, lidas das pragmas ---

const PRIMARIAS = `SELECT m.name AS t, p.name AS c, p.pk AS o FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type = 'table' AND p.pk > 0`;
const UNICAS = `SELECT m.name AS t, i.name AS i, c.name AS c, c.seqno AS o FROM sqlite_master m JOIN pragma_index_list(m.name) i JOIN pragma_index_info(i.name) c
     WHERE m.type = 'table' AND i."unique" = 1 AND i.partial = 0`;
const ESTRANGEIRAS = `SELECT m.name AS t, f.id AS i, f.seq AS o, f."table" AS para, f."from" AS de, f."to" AS ate FROM sqlite_master m JOIN pragma_foreign_key_list(m.name) f WHERE m.type = 'table'`;
const GATILHOS = `SELECT name FROM sqlite_master WHERE type = 'trigger' AND name LIKE '${TABELA_DA_MARCA}\\_%' ESCAPE '\\'`;

type Linha = Record<string, unknown>;
const linhasDe = (r: unknown) => ((r as { results?: Linha[] } | undefined)?.results ?? []) as Linha[];

/** Monta a régua das tabelas da cópia a partir das linhas das três pragmas. */
function montarEsquema(nomes: string[], primarias: Linha[], unicas: Linha[], estrangeiras: Linha[]): EsquemaDaCopia {
  const esquema: EsquemaDaCopia = Object.fromEntries(nomes.map((t) => [t, { unicas: [], estrangeiras: [] }]));
  const emOrdem = (linhas: Linha[]) => [...linhas].sort((a, b) => Number(a.o) - Number(b.o));
  const porTabela = (linhas: Linha[], chave: (l: Linha) => string) => {
    const grupos = new Map<string, Linha[]>();
    for (const l of linhas) grupos.set(chave(l), [...(grupos.get(chave(l)) ?? []), l]);
    return grupos;
  };
  const chavesPrimarias = new Map<string, string[]>();
  for (const [t, ls] of porTabela(primarias, (l) => String(l.t))) chavesPrimarias.set(t, emOrdem(ls).map((l) => String(l.c)));
  for (const t of nomes) {
    const pk = chavesPrimarias.get(t);
    if (pk?.length) esquema[t]!.unicas.push(pk);
  }
  for (const [id, ls] of porTabela(unicas, (l) => `${l.t}\u0000${l.i}`)) {
    const t = String(ls[0]!.t);
    if (!esquema[t] || ls.some((l) => l.c === null)) continue; // índice de expressão: fica para a marca
    const colunas = emOrdem(ls).map((l) => String(l.c));
    if (!esquema[t]!.unicas.some((u) => u.join('\u0000') === colunas.join('\u0000'))) esquema[t]!.unicas.push(colunas);
    void id;
  }
  for (const [, ls] of porTabela(estrangeiras, (l) => `${l.t}\u0000${l.i}`)) {
    const t = String(ls[0]!.t);
    if (!esquema[t]) continue;
    const ordem = emOrdem(ls);
    const para = String(ordem[0]!.para);
    const colunas = ordem.map((l) => String(l.de));
    // Sem as colunas de lá, a chave aponta para a primária da outra tabela
    const referencias = ordem.every((l) => l.ate !== null) ? ordem.map((l) => String(l.ate)) : (chavesPrimarias.get(para) ?? []);
    esquema[t]!.estrangeiras.push({ colunas, tabela: para, referencias });
  }
  return esquema;
}

/** As pragmas uma a uma, para um banco que não aceite a pragma como tabela na consulta (o caminho de reserva). */
async function pragmasUmaAUma(nomes: string[]): Promise<{ primarias: Linha[]; unicas: Linha[]; estrangeiras: Linha[] }> {
  const q = (sql: string) => banco().prepare(sql);
  const [info, indices, fks] = await Promise.all(
    ['table_info', 'index_list', 'foreign_key_list'].map((pragma) => banco().batch(nomes.map((t) => q(`PRAGMA ${pragma}(${entreAspas(t)})`)))),
  );
  const primarias = nomes.flatMap((t, k) => linhasDe(info![k]).filter((l) => Number(l.pk) > 0).map((l) => ({ t, c: l.name, o: l.pk })));
  const estrangeiras = nomes.flatMap((t, k) => linhasDe(fks![k]).map((l) => ({ t, i: l.id, o: l.seq, para: l.table, de: l.from, ate: l.to })));
  const listas = nomes.flatMap((t, k) => linhasDe(indices![k]).filter((l) => Number(l.unique) === 1 && Number(l.partial) === 0).map((l) => ({ t, i: String(l.name) })));
  const colunas = listas.length ? await banco().batch(listas.map((l) => q(`PRAGMA index_info(${entreAspas(l.i)})`))) : [];
  const unicas = listas.flatMap((l, k) => linhasDe(colunas[k]).map((c) => ({ t: l.t, i: l.i, c: c.name, o: c.seqno })));
  return { primarias, unicas, estrangeiras };
}

/**
 * O primeiro pedido: as tabelas, quantas linhas cada uma tem, a marca, a régua da conferência e o tamanho do
 * banco. A lista, as contagens, a marca, os gatilhos e as pragmas vêm num lote só, que é uma transação: tudo do
 * mesmo instante. Uma tabela listada sem os gatilhos (criada ou refeita entre garantirGatilhosDaMarca e o lote,
 * o caso b da terceira rodada da revisão) faz o índice garantir os gatilhos e ler de novo.
 */
export async function montarIndice(): Promise<IndiceDaCopia> {
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    // Cada tentativa lê o banco de novo, e não o que a anterior guardou no pedido
    esquecerAsLeiturasDoPedido();
    await garantirGatilhosDaMarca(banco());
    const nomes = await nomesDasTabelas();
    const comandos = [
      banco().prepare(TABELAS_DA_COPIA),
      banco().prepare(`SELECT valor FROM ${TABELA_DA_MARCA} WHERE id = 1`),
      banco().prepare(GATILHOS),
      ...nomes.map((nome) => banco().prepare(`SELECT COUNT(*) AS n FROM ${entreAspas(nome)}`)),
    ];
    const pragmas = [banco().prepare(PRIMARIAS), banco().prepare(UNICAS), banco().prepare(ESTRANGEIRAS)];
    let resultados: unknown[];
    let regua: { primarias: Linha[]; unicas: Linha[]; estrangeiras: Linha[] };
    try {
      resultados = await banco().batch([...comandos, ...pragmas]);
      const [p, u, e] = resultados.slice(comandos.length);
      regua = { primarias: linhasDe(p), unicas: linhasDe(u), estrangeiras: linhasDe(e) };
    } catch {
      // Sem a pragma como tabela: o lote sem elas, e as pragmas uma a uma, conferidas por uma segunda leitura da marca
      resultados = await banco().batch(comandos);
      regua = await pragmasUmaAUma(nomes);
    }
    const [lista, marca, gatilhos, ...contagens] = resultados;
    const listadas = linhasDe(lista).map((l) => String(l.name));
    const valor = (linhasDe(marca)[0] as { valor?: number } | undefined)?.valor;
    if (typeof valor !== 'number') throw new CopiaSemMarca('A marca de mudança do acervo não existe.');
    const existentes = new Set(linhasDe(gatilhos).map((g) => String(g.name)));
    const semGatilho = listadas.filter((t) => precisaDosGatilhos(t) && ['INSERT', 'UPDATE', 'DELETE'].some((op) => !existentes.has(nomeDoGatilho(t, op as 'INSERT'))));
    // Uma tabela nova ou refeita no meio: garante os gatilhos e lê tudo de novo
    if (listadas.join('\u0000') !== nomes.join('\u0000') || semGatilho.length > 0) continue;
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
      indice: nomes.map((tabela, i) => ({ tabela, linhas: Number((linhasDe(contagens[i])[0] as { n?: number } | undefined)?.n ?? 0) })),
      esquema: montarEsquema(nomes, regua.primarias, regua.unicas, regua.estrangeiras),
    };
  }
  throw new CopiaSemMarca('As tabelas mudaram enquanto o índice era lido.');
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
 * A resposta de `/api/copia`: o índice sem parâmetros, ou a parte pedida em `tabela` e `depois`. Quem pode pedir
 * é conferido antes, igual para o índice e para cada parte. `confirmar` é só da cópia mensal (middleware,
 * respostaDaConfirmacao): aqui, recusado.
 */
export async function respostaDaCopia(url: URL): Promise<Response> {
  try {
    if (url.searchParams.has('confirmar')) return json({ erro: 'A parte pedida não existe.' }, 404);
    const tabela = url.searchParams.get('tabela');
    if (tabela === null) return json(await montarIndice());
    const textoDepois = url.searchParams.get('depois');
    if (textoDepois !== null && !/^-?\d{1,18}$/.test(textoDepois)) return json({ erro: 'A parte pedida não existe.' }, 400);
    const parte = await montarParte(tabela, textoDepois === null ? null : Number(textoDepois));
    if (!parte) return json({ erro: 'A parte pedida não existe.' }, 404);
    return json(parte);
  } catch (erro) {
    if (erro instanceof CopiaSemMarca) return json({ erro: 'A cópia não pode conferir se o acervo mudou no meio dela.' }, 500);
    throw erro;
  }
}

/**
 * A confirmação da cópia mensal (D1f3): o script do Drive, depois de gravar o arquivo, pede
 * `/api/copia?confirmar=<gerada_em do índice>` com o token de serviço, e só então a cópia é anotada em
 * copias_mensais. Uma passada descartada nunca chega aqui. Vale só uma data de cópia das últimas 24 horas.
 */
export async function respostaDaConfirmacao(url: URL, anotar: () => Promise<void>): Promise<Response> {
  const texto = url.searchParams.get('confirmar') ?? '';
  const quando = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(texto) ? Date.parse(texto) : NaN;
  const agora = Date.now();
  if (!Number.isFinite(quando) || quando > agora + 5 * 60_000 || quando < agora - 24 * 60 * 60_000) return json({ erro: 'A confirmação não vale para esta cópia.' }, 400);
  await anotar();
  return json({ acervo: MARCA_DO_ACERVO, anotada: true, gerada_em: texto });
}
