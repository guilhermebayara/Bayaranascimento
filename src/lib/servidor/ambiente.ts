// Em que ambiente o pedido está, e com que banco e fotos ele trabalha.
//
// A homologação é a prévia da branch `homologa`, em homologa.memorias.bayara.com.br. Ela usa
// um banco e um bucket só dela, com a estrutura da família espelhada da produção e nomes e
// memórias inventados (ver espelho.ts). As outras prévias dividem o banco de teste, com o
// acervo de exemplo. A escolha é feita pelo endereço do pedido, porque o Cloudflare aplica a
// mesma configuração a todas as prévias.
import { AsyncLocalStorage } from 'node:async_hooks';
import { env } from 'cloudflare:workers';
import type { Tipo } from '../tipos';

export const ENDERECO_DA_HOMOLOGACAO = 'homologa.memorias.bayara.com.br';

// Os tipos do D1 vêm da configuração do Worker (src/env.d.ts)
type Banco = Cloudflare.Env['DB'];
type ComandoDoBanco = ReturnType<Banco['prepare']>;
type Resultado = Awaited<ReturnType<ComandoDoBanco['all']>>;

interface Pedido {
  homologa: boolean;
  tipos?: readonly Tipo[];
  apelidos?: ReadonlyMap<string, string>;
  /** A pessoa vista pelo "Ver como", só onde ele existe (guardarVerComoDoPedido) */
  verComo?: string;
  /** Quem pede (definirPessoaDoPedido). Entra na chave de tudo o que o pedido guarda. */
  pessoa?: string;
  /** As leituras do banco guardadas durante o pedido (a guarda por pedido, ver guardarLeitura) */
  guardadas: Map<string, Guardada>;
  /** O que o pedido fez no banco, para o cabeçalho Server-Timing */
  medida: MedidaDoPedido;
  /** O banco do pedido, embrulhado uma vez só */
  embrulho?: { de: Banco; banco: Banco };
}

/**
 * O que um pedido fez no banco: consultas (cada comando, também os de um lote), idas (cada viagem ao banco),
 * as linhas que o banco devolveu (as que o Worker converte em objetos; a leitura guardada não conta de novo)
 * e o tempo.
 */
export interface MedidaDoPedido {
  inicio: number;
  consultas: number;
  idas: number;
  linhas: number;
  msNoBanco: number;
}

interface Guardada {
  sql: string;
  resultado: Promise<Resultado>;
}

const doPedido = new AsyncLocalStorage<Pedido>();

/**
 * Os tipos de momento do pedido em curso, com a cor e o rabisco que os administradores escolheram.
 * O middleware guarda a lista aqui, e é daqui que estiloDoTipo e IconeDoTipo leem a escolha
 * (lerEscolhasDe, em src/lib/visual.ts). Fica junto do pedido, e não numa variável do módulo,
 * porque o mesmo servidor atende a homologação e as prévias, cada uma com o banco dela.
 */
export function guardarTiposDoPedido(tipos: readonly Tipo[]): void {
  const pedido = doPedido.getStore();
  if (pedido) pedido.tipos = tipos;
}
export function tiposDoPedido(): readonly Tipo[] | undefined {
  return doPedido.getStore()?.tipos;
}

/**
 * Os apelidos que quem está logado deu a outras pessoas ("Como você chama", src/lib/apelidos.ts). O
 * middleware guarda aqui, só nas páginas (as rotas de /api e a administração leem os de sempre), e
 * listarIntegrantes troca o apelido por eles. Ficam junto do pedido: são de uma pessoa só.
 */
export function guardarApelidosDoPedido(apelidos: ReadonlyMap<string, string>): void {
  const pedido = doPedido.getStore();
  if (pedido) pedido.apelidos = apelidos;
}
export function apelidosDoPedido(): ReadonlyMap<string, string> | undefined {
  return doPedido.getStore()?.apelidos;
}

/**
 * A pessoa vista pelo "Ver como", para o marcador nos endereços das fotos e dos retratos
 * (src/lib/marcador-do-ver-como.ts). O middleware guarda aqui só onde existe o "Ver como" (semLogin); na
 * produção fica vazia, e os endereços ficam como sempre foram.
 */
export function guardarVerComoDoPedido(pessoa: string): void {
  const pedido = doPedido.getStore();
  if (pedido) pedido.verComo = pessoa;
}
export function verComoDoPedido(): string | undefined {
  return doPedido.getStore()?.verComo;
}

/** Roda o tratamento de um pedido sabendo se ele é da homologação. Cada pedido começa com a guarda vazia. */
export function noPedido<T>(request: Request, tratar: () => T): T {
  const homologa = new URL(request.url).hostname === ENDERECO_DA_HOMOLOGACAO && Boolean(env.DB_HOMOLOGA && env.FOTOS_HOMOLOGA);
  return doPedido.run({ homologa, guardadas: new Map(), medida: { inicio: Date.now(), consultas: 0, idas: 0, linhas: 0, msNoBanco: 0 } }, tratar);
}

/**
 * Quem pede: a pessoa do login ou, nas prévias, a do "Ver como". Ela entra na chave de toda leitura guardada,
 * para o que foi lido como uma pessoa nunca servir a outra. Trocar a pessoa no meio do pedido faz ler de novo.
 */
export function definirPessoaDoPedido(pessoa: string | undefined): void {
  const pedido = doPedido.getStore();
  if (pedido) pedido.pessoa = pessoa;
}

/** O que o pedido em curso fez no banco até agora. */
export function medidaDoPedido(): MedidaDoPedido | undefined {
  return doPedido.getStore()?.medida;
}

/**
 * O cabeçalho Server-Timing do pedido: o tempo do servidor e o que ele fez no D1 (consultas, idas e linhas
 * devolvidas), para medir a produção de verdade (causa 1e da medição M1 e seção 8 da M2, docs/desempenho/).
 * Só números: nada do acervo.
 */
export function servidorTiming(agora = Date.now()): string | undefined {
  const medida = medidaDoPedido();
  if (!medida) return undefined;
  return `servidor;dur=${agora - medida.inicio}, d1;dur=${medida.msNoBanco};desc="consultas=${medida.consultas} idas=${medida.idas} linhas=${medida.linhas}"`;
}

export function ehHomologacao(): boolean {
  return doPedido.getStore()?.homologa ?? false;
}

export type Ambiente = 'producao' | 'homologa' | 'previa' | 'desenvolvimento';

export function ambiente(): Ambiente {
  if (ehHomologacao()) return 'homologa';
  // No computador (npm run dev) é sempre desenvolvimento, com o acervo de exemplo, mesmo sem o .dev.vars.
  // Sem isso, o wrangler.jsonc dizia "producao" e o site abria vazio. No build, DEV é sempre falso.
  if (import.meta.env.DEV) return 'desenvolvimento';
  return env.AMBIENTE;
}

/**
 * O banco do pedido. Dentro de um pedido, vem embrulhado pela guarda por pedido (guardarLeitura): o que já
 * foi lido no mesmo pedido, pela mesma pessoa, não vai ao banco de novo. Fora de um pedido (testes,
 * scripts), é o banco como está.
 */
/**
 * Esquece o que o pedido já leu: a leitura seguinte vai ao banco. Para quem lê de novo de propósito, no mesmo
 * pedido, porque o banco pode ter mudado por fora dele (o índice da cópia, quando uma tabela nasce no meio).
 */
export function esquecerAsLeiturasDoPedido(): void {
  doPedido.getStore()?.guardadas.clear();
}

export function banco(): Banco {
  const real = bancoDoAmbiente();
  const pedido = doPedido.getStore();
  if (!pedido) return real;
  const ja = pedido.embrulho;
  if (ja && ja.de === real) return ja.banco;
  const embrulhado = embrulhar(real, pedido);
  pedido.embrulho = { de: real, banco: embrulhado };
  return embrulhado;
}

function bancoDoAmbiente(): Banco {
  return ehHomologacao() ? env.DB_HOMOLOGA! : env.DB;
}

// --- A guarda por pedido (causa 1a da medição M1, docs/desempenho/2026-11-22-medicao.md) ---
//
// Uma página lia a mesma coisa do banco muitas vezes: numa memória, as pessoas excluídas 14 vezes, os
// casais 8, as filiações 7. Agora cada leitura fica guardada durante o pedido, com a chave feita da pessoa
// do pedido, do SQL e dos valores. Regras:
// - A guarda vive no pedido (AsyncLocalStorage), nunca numa variável do módulo: o Worker reaproveita o
//   processo entre pedidos, e um pedido nunca recebe o que outro leu.
// - A pessoa do pedido está na chave: com o "Ver como", o que foi lido como uma pessoa nunca serve a outra.
// - Uma gravação no mesmo pedido faz ler de novo o que pode ter mudado: o que lê a tabela gravada
//   (INSERT e UPDATE) ou tudo (DELETE, que pode apagar em cascata, e qualquer outra coisa).
// - Um lote de leituras guarda cada leitura dele; a leitura que já está guardada não vai ao banco.

type Valor = string | number | boolean | null;
interface Comando {
  real: ComandoDoBanco;
  sql: string;
  valores: unknown[];
}

const LEITURA = /^\s*(SELECT|WITH)\b/i;
const GRAVA = /\b(INSERT|UPDATE|DELETE|REPLACE)\b/i;
/** A tabela que um INSERT ou UPDATE grava. Fora desses dois, vazio: tudo é lido de novo. */
const TABELA_GRAVADA = /^\s*(?:INSERT\s+(?:OR\s+(?:IGNORE|ABORT|FAIL|ROLLBACK)\s+)?INTO|UPDATE\s+(?:OR\s+(?:IGNORE|ABORT|FAIL|ROLLBACK)\s+)?)\s*["`[]?(\w+)/i;

const ehLeitura = (sql: string) => LEITURA.test(sql) && !GRAVA.test(sql);

/** A chave da leitura, ou vazio quando ela não pode ser guardada (sorteio, valores que não são simples). */
function chaveDaLeitura(pedido: Pedido, c: Comando): string | undefined {
  if (!ehLeitura(c.sql) || /\bRANDOM\s*\(/i.test(c.sql)) return undefined;
  if (!c.valores.every((v): v is Valor => v === null || ['string', 'number', 'boolean'].includes(typeof v))) return undefined;
  return `${pedido.pessoa ?? ''}\u0001${c.sql}\u0001${JSON.stringify(c.valores)}`;
}

/** Esquece o que a gravação pode ter mudado. */
function esquecerDepoisDeGravar(pedido: Pedido, sqls: string[]): void {
  const gravadas: string[] = [];
  for (const sql of sqls) {
    if (ehLeitura(sql)) continue;
    const tabela = TABELA_GRAVADA.exec(sql)?.[1];
    if (!tabela) {
      pedido.guardadas.clear();
      return;
    }
    gravadas.push(tabela);
  }
  if (gravadas.length === 0) return;
  // Um gatilho da tabela gravada pode gravar em outras: elas também são lidas de novo
  const tabelas = comOQueOsGatilhosGravam(gravadas);
  if (!tabelas) {
    pedido.guardadas.clear();
    return;
  }
  const lida = new RegExp(`\\b(${tabelas.join('|')})\\b`, 'i');
  for (const [chave, guardada] of pedido.guardadas) if (lida.test(guardada.sql)) pedido.guardadas.delete(chave);
}

// --- Os gatilhos que gravam (item 3 da revisão R-D1, sessão D1d) ---
//
// Um gatilho que grava em outra tabela muda essa outra sem que a instrução diga. A guarda conhece os gatilhos
// pelo próprio SQL das migrações: banco.ts passa a lista MIGRACOES inteira para cobrirGatilhosQueGravam ao
// carregar, e nenhuma lista precisa ser lembrada à mão. Gravar na tabela de origem esquece também as de
// destino, e as que os gatilhos delas gravam. Um gatilho que apaga (DELETE ou REPLACE, que podem apagar em
// cascata) ou cujo destino não se lê esquece a guarda inteira. testes/guarda-gatilhos.test.ts confere o
// esquema de verdade contra o que a guarda conhece: um gatilho que grava sem estar coberto faz o teste falhar.
// A cobertura fica no módulo porque vem do código das migrações, igual para todos os bancos e pedidos.

/** Qualquer tabela: a gravação esquece a guarda inteira. */
const TODAS = '*';
const GATILHO = /\bCREATE\s+(?:TEMP(?:ORARY)?\s+)?TRIGGER\b[\s\S]*?\bON\s+["`[]?(\w+)[\s\S]*?\bBEGIN\b([\s\S]*)$/i;
const GRAVA_NO_CORPO = /\b(INSERT|UPDATE|DELETE|REPLACE)\b/gi;
const DESTINO_NO_CORPO = /\b(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|UPDATE\s+(?:OR\s+\w+\s+)?)\s*["`[]?(\w+)/gi;
/** De cada tabela de origem, as tabelas em que os gatilhos dela gravam. */
const gatilhosCobertos = new Map<string, Set<string>>();

/** Os gatilhos que gravam, lidos de uma lista de SQL: de cada tabela de origem, as tabelas de destino. */
export function gatilhosQueGravam(sqls: readonly string[]): Map<string, Set<string>> {
  const mapa = new Map<string, Set<string>>();
  for (const sql of sqls) {
    const achado = GATILHO.exec(sql);
    if (!achado) continue;
    const origem = achado[1].toLowerCase();
    const corpo = achado[2];
    const gravacoes = corpo.match(GRAVA_NO_CORPO) ?? [];
    if (gravacoes.length === 0) continue;
    const destinos = mapa.get(origem) ?? new Set<string>();
    const lidos = [...corpo.matchAll(DESTINO_NO_CORPO)].map((d) => d[1].toLowerCase());
    // Apagar, ou gravar sem o destino legível: tudo
    if (gravacoes.some((g) => /DELETE|REPLACE/i.test(g)) || lidos.length < gravacoes.length) destinos.add(TODAS);
    for (const d of lidos) destinos.add(d);
    mapa.set(origem, destinos);
  }
  return mapa;
}

/** Faz a guarda conhecer os gatilhos que gravam (chamado por banco.ts com o SQL de todas as migrações). */
export function cobrirGatilhosQueGravam(sqls: readonly string[]): void {
  for (const [origem, destinos] of gatilhosQueGravam(sqls)) {
    const ja = gatilhosCobertos.get(origem) ?? new Set<string>();
    for (const d of destinos) ja.add(d);
    gatilhosCobertos.set(origem, ja);
  }
}

/**
 * As tabelas em que os gatilhos de toda tabela gravam: a marca da cópia (marca-da-copia.ts), cujos gatilhos são
 * criados fora das migrações, em cada tabela que existe. Gravar em qualquer tabela esquece o que leu a marca.
 */
const gravadasDeTodaTabela = new Set<string>();
export function cobrirGravacaoEmTodaTabela(destino: string): void {
  gravadasDeTodaTabela.add(destino.toLowerCase());
}

/** Os gatilhos que gravam e que a guarda não conhece, entre os SQL dados (o esquema de verdade, nos testes). */
export function gatilhosSemCobertura(sqls: readonly string[]): string[] {
  const faltam: string[] = [];
  for (const [origem, destinos] of gatilhosQueGravam(sqls)) {
    const cobertos = gatilhosCobertos.get(origem);
    for (const d of destinos) if (!cobertos?.has(d) && !gravadasDeTodaTabela.has(d)) faltam.push(`${origem} -> ${d}`);
  }
  return faltam;
}

/** As tabelas gravadas e as que os gatilhos delas gravam, em cadeia; vazio quando é preciso esquecer tudo. */
function comOQueOsGatilhosGravam(gravadas: readonly string[]): string[] | undefined {
  const todas = new Set([...gravadas.map((t) => t.toLowerCase()), ...gravadasDeTodaTabela]);
  const fila = [...todas];
  while (fila.length > 0) {
    for (const destino of gatilhosCobertos.get(fila.pop()!) ?? []) {
      if (destino === TODAS) return undefined;
      if (!todas.has(destino)) {
        todas.add(destino);
        fila.push(destino);
      }
    }
  }
  return [...todas];
}

/**
 * Quantas linhas uma resposta do banco trouxe: o resultado de um comando (`results`), o de um lote (a soma) ou o
 * de `raw()` (as linhas, menos a dos nomes das colunas quando pedida).
 */
export function linhasDevolvidas(resposta: unknown, comNomesDasColunas = false): number {
  if (Array.isArray(resposta)) {
    if (resposta.every((r) => r && typeof r === 'object' && !Array.isArray(r) && 'results' in r)) return resposta.reduce((soma, r) => soma + linhasDevolvidas(r), 0);
    return Math.max(0, resposta.length - (comNomesDasColunas ? 1 : 0));
  }
  const linhas = (resposta as { results?: unknown } | null)?.results;
  return Array.isArray(linhas) ? linhas.length : 0;
}

/** Uma ida ao banco, contada para o Server-Timing. */
async function ida<T>(pedido: Pedido, consultas: number, fazer: () => Promise<T>, contar: (r: T) => number = linhasDevolvidas): Promise<T> {
  const inicio = Date.now();
  pedido.medida.consultas += consultas;
  pedido.medida.idas += 1;
  try {
    const resposta = await fazer();
    pedido.medida.linhas += contar(resposta);
    return resposta;
  } finally {
    pedido.medida.msNoBanco += Date.now() - inicio;
  }
}

/** Uma cópia do resultado guardado, para quem chama poder mexer na lista sem mudar a guardada. */
const copia = (r: Resultado): Resultado => ({ ...r, results: [...(r.results ?? [])] });

function embrulhar(real: Banco, pedido: Pedido): Banco {
  const deVerdade = new WeakMap<object, Comando>();

  /** A leitura guardada, ou a ida ao banco que a guarda. */
  const ler = (c: Comando, ir: () => Promise<Resultado>): Promise<Resultado> => {
    const chave = chaveDaLeitura(pedido, c);
    if (!chave) return ida(pedido, 1, ir);
    const ja = pedido.guardadas.get(chave);
    if (ja) return ja.resultado;
    const resultado = ida(pedido, 1, ir);
    guardar(chave, c.sql, resultado);
    return resultado;
  };
  const guardar = (chave: string, sql: string, resultado: Promise<Resultado>) => {
    const guardada = { sql, resultado };
    pedido.guardadas.set(chave, guardada);
    // Uma leitura que falhou não fica guardada: quem pedir de novo tenta de novo
    resultado.catch(() => {
      if (pedido.guardadas.get(chave) === guardada) pedido.guardadas.delete(chave);
    });
  };
  /** Uma gravação: esquece o que ela pode mudar antes e depois, porque uma leitura pode ter começado no meio. */
  const gravar = async <T>(sqls: string[], consultas: number, fazer: () => Promise<T>): Promise<T> => {
    esquecerDepoisDeGravar(pedido, sqls);
    try {
      return await ida(pedido, consultas, fazer);
    } finally {
      esquecerDepoisDeGravar(pedido, sqls);
    }
  };

  const comando = (c: Comando): ComandoDoBanco => {
    const embrulhado = {
      bind: (...valores: unknown[]) => comando({ real: c.real.bind(...valores), sql: c.sql, valores }),
      all: async () => (ehLeitura(c.sql) ? copia(await ler(c, () => c.real.all())) : gravar([c.sql], 1, () => c.real.all())),
      run: async () => (ehLeitura(c.sql) ? copia(await ler(c, () => c.real.all())) : gravar([c.sql], 1, () => c.real.run())),
      first: async (coluna?: string) => {
        if (!ehLeitura(c.sql)) return gravar([c.sql], 1, () => (coluna ? c.real.first(coluna) : c.real.first()));
        const linha = ((await ler(c, () => c.real.all())).results?.[0] ?? null) as Record<string, unknown> | null;
        if (linha === null) return null;
        return coluna === undefined ? { ...linha } : (linha[coluna] ?? null);
      },
      raw: (opcoes?: { columnNames?: boolean }) =>
        ehLeitura(c.sql) ? ida(pedido, 1, () => c.real.raw(opcoes), (r) => linhasDevolvidas(r, Boolean(opcoes?.columnNames))) : gravar([c.sql], 1, () => c.real.raw(opcoes)),
    } as unknown as ComandoDoBanco;
    deVerdade.set(embrulhado, c);
    return embrulhado;
  };

  const lote = async (lista: ComandoDoBanco[]): Promise<Resultado[]> => {
    const comandos = lista.map((s) => deVerdade.get(s) ?? { real: s, sql: '', valores: [] });
    // Com gravação no meio, o lote vai inteiro, como uma transação, e esquece o que pode ter mudado
    if (!comandos.every((c) => ehLeitura(c.sql))) return gravar(comandos.map((c) => c.sql), comandos.length, () => real.batch(comandos.map((c) => c.real)));
    // Só leituras: vão ao banco, num lote só, as que ainda não estão guardadas
    const chaves = comandos.map((c) => chaveDaLeitura(pedido, c));
    const resultados: (Promise<Resultado> | undefined)[] = chaves.map((chave) => (chave ? pedido.guardadas.get(chave)?.resultado : undefined));
    const faltam = comandos.map((_, i) => i).filter((i) => !resultados[i]);
    if (faltam.length > 0) {
      const doLote: Promise<Resultado[]> = ida(pedido, faltam.length, () => real.batch(faltam.map((i) => comandos[i].real)));
      faltam.forEach((i, posicao) => {
        const resultado: Promise<Resultado> = doLote.then((r: Resultado[]) => r[posicao]);
        resultados[i] = resultado;
        const chave = chaves[i];
        if (chave) guardar(chave, comandos[i].sql, resultado);
      });
    }
    return (await Promise.all(resultados as Promise<Resultado>[])).map(copia);
  };

  return new Proxy(real, {
    get(alvo, nome) {
      if (nome === 'prepare') return (sql: string) => comando({ real: alvo.prepare(sql), sql, valores: [] });
      if (nome === 'batch') return lote;
      if (nome === 'exec') return (sql: string) => gravar([''], 1, () => alvo.exec(sql));
      const valor = Reflect.get(alvo, nome);
      return typeof valor === 'function' ? valor.bind(alvo) : valor;
    },
  });
}

export function bucketDeFotos(): R2Bucket {
  return ehHomologacao() ? env.FOTOS_HOMOLOGA! : env.FOTOS;
}

/** Os únicos ambientes que recebem o acervo de exemplo. Produção e homologação nunca. */
export const AMBIENTES_COM_EXEMPLOS: Ambiente[] = ['previa', 'desenvolvimento'];

/** As prévias de teste e o computador: onde o acervo de exemplo existe. */
export function temAcervoDeExemplo(): boolean {
  return AMBIENTES_COM_EXEMPLOS.includes(ambiente()) && !ehHomologacao();
}

/**
 * Onde as 11 fotos de exemplo (o Chico e a Karol) são lidas: debaixo de "exemplos/" no bucket de teste.
 * Nas prévias e na homologação, FOTOS é o bucket de teste (bloco "previews" do wrangler.jsonc); a
 * homologação só lê dele, e o bucket dela continua sendo FOTOS_HOMOLOGA. Na produção não existe.
 */
export function bucketDosExemplos(): R2Bucket | null {
  return ambiente() === 'producao' ? null : env.FOTOS;
}

/**
 * O bucket de teste, para gravar ou apagar: o envio das fotos de exemplo e a limpeza de 7 dias. Só nas
 * prévias e no computador. Na produção e na homologação, recusa.
 */
export function bucketDeTesteParaGravar(): R2Bucket {
  if (!AMBIENTES_COM_EXEMPLOS.includes(ambiente()) || ehHomologacao()) throw new Error('Só as prévias de teste gravam no bucket de teste.');
  return env.FOTOS;
}

/**
 * O Workers AI, para a transcrição automática (onda 2). Vazio enquanto o binding "AI" não estiver no
 * wrangler.jsonc: a transcrição fica pronta e desligada (src/lib/transcricao.ts).
 */
export function modeloDeTranscricao(): Cloudflare.Env['AI'] | null {
  return env.AI ?? null;
}
