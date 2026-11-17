// Explorar (docs/decisoes.md, "Explorar"): os filtros e as ordens, sem tela. A tela (linha do tempo,
// mural, modo TV e ao acaso) é da revisão visual; ela lê o endereço com lerFiltros, chama explorar e
// escreve o endereço com paraEndereco, para guardar ou mandar o link.
//
// Quem chama entrega só as memórias que a pessoa vê (listarMemorias). Nada aqui acrescenta memória:
// o resultado, o sorteio e as contagens saem sempre dessa lista.
//
// Entre filtros diferentes vale o "e". Dentro de um mesmo filtro, vale o "ou" (este tipo ou aquele,
// esta família ou aquela), menos nas pessoas, que são "pessoas juntas": a memória precisa ter todas.

import type { DataFlexivel } from './datas';
import { carimboDaData, diaMesCurto } from './visual';

export type Ordem = 'recentes' | 'antigas' | 'entraram' | 'contadas';
export const ORDENS: Ordem[] = ['recentes', 'antigas', 'entraram', 'contadas'];
export const ORDEM_PADRAO: Ordem = 'recentes';

export const NOMES_DAS_ORDENS: Record<Ordem, string> = {
  recentes: 'Mais recentes primeiro',
  antigas: 'Mais antigas primeiro',
  entraram: 'Entraram por último',
  contadas: 'Mais contadas',
};

export interface Filtros {
  tipos: string[];
  /** pessoas juntas: a memória tem todas */
  pessoas: string[];
  /** ids de núcleo; no endereço, "nucleo", como os atalhos das famílias */
  familias: string[];
  capitulos: string[];
  temas: string[];
  /** período: de um ano a outro, os dois inclusive */
  de: number | null;
  ate: number | null;
  /** uma década: 1990 vale de 1990 a 1999 */
  decada: number | null;
  comAudio: boolean;
  comFoto: boolean;
  /** as memórias em que quem está olhando já contou algo */
  contou: boolean;
  /** as memórias em que quem está olhando estava e ainda não contou */
  falta: boolean;
  ordem: Ordem;
}

export const SEM_FILTRO: Filtros = {
  tipos: [],
  pessoas: [],
  familias: [],
  capitulos: [],
  temas: [],
  de: null,
  ate: null,
  decada: null,
  comAudio: false,
  comFoto: false,
  contou: false,
  falta: false,
  ordem: ORDEM_PADRAO,
};

const ANO_MINIMO = 1800;
const ANO_MAXIMO = 2200;

function ano(texto: string | null): number | null {
  if (!texto || !/^\d{4}$/.test(texto)) return null;
  const n = Number(texto);
  return n >= ANO_MINIMO && n <= ANO_MAXIMO ? n : null;
}

const lista = (p: URLSearchParams, nome: string) => [...new Set(p.getAll(nome).flatMap((v) => v.split(',')).map((v) => v.trim()).filter((v) => v && v.length <= 80))].slice(0, 20);

/** Lê os filtros do endereço. O que não faz sentido é ignorado, sem erro. */
export function lerFiltros(p: URLSearchParams): Filtros {
  const ordem = p.get('ordem');
  const decada = ano(p.get('decada'));
  return {
    tipos: lista(p, 'tipo'),
    pessoas: lista(p, 'pessoa'),
    familias: lista(p, 'nucleo'),
    capitulos: lista(p, 'capitulo'),
    temas: lista(p, 'tema'),
    de: ano(p.get('de')),
    ate: ano(p.get('ate')),
    decada: decada !== null && decada % 10 === 0 ? decada : null,
    comAudio: p.get('audio') === '1',
    comFoto: p.get('foto') === '1',
    // Valem só para quem está olhando (decisão do Gui, 16/11/2026): "contou=giovanna" vira o próprio
    contou: p.has('contou'),
    falta: p.has('falta'),
    ordem: ORDENS.includes(ordem as Ordem) ? (ordem as Ordem) : ORDEM_PADRAO,
  };
}

/** O que existe e a pessoa vê, para conferir os filtros lidos do endereço. */
export interface FiltrosConhecidos {
  tipos: ReadonlySet<string>;
  /** as pessoas que a pessoa logada vê (sem quem só existe num laço privado de outra pessoa) */
  pessoas: ReadonlySet<string>;
  familias: ReadonlySet<string>;
  /** os capítulos que a pessoa vê */
  capitulos: ReadonlySet<string>;
  /** os temas que a pessoa vê */
  temas: ReadonlySet<string>;
}

/**
 * Tira dos filtros o que não existe ou a pessoa não vê, como se não estivesse no endereço: o que
 * não faz sentido é ignorado. Achado do QA de código de 17/11/2026: um tipo, uma pessoa, um capítulo
 * ou um tema desconhecido no endereço dava zero memórias com o resumo "Nenhum filtro", e o resumo
 * escrevia o nome de quem só existe num laço privado de outra pessoa. Assim, o que a pessoa não vê
 * responde igual ao que não existe.
 */
export function soFiltrosConhecidos(f: Filtros, conhecidos: FiltrosConhecidos): Filtros {
  return {
    ...f,
    tipos: f.tipos.filter((id) => conhecidos.tipos.has(id)),
    pessoas: f.pessoas.filter((id) => conhecidos.pessoas.has(id)),
    familias: f.familias.filter((id) => conhecidos.familias.has(id)),
    capitulos: f.capitulos.filter((id) => conhecidos.capitulos.has(id)),
    temas: f.temas.filter((id) => conhecidos.temas.has(id)),
  };
}

/** Escreve os filtros no endereço, sem o que está no padrão. lerFiltros(paraEndereco(f)) devolve f. */
export function paraEndereco(f: Filtros): URLSearchParams {
  const p = new URLSearchParams();
  for (const t of f.tipos) p.append('tipo', t);
  for (const x of f.pessoas) p.append('pessoa', x);
  for (const n of f.familias) p.append('nucleo', n);
  for (const c of f.capitulos) p.append('capitulo', c);
  for (const t of f.temas) p.append('tema', t);
  if (f.de !== null) p.set('de', String(f.de));
  if (f.ate !== null) p.set('ate', String(f.ate));
  if (f.decada !== null) p.set('decada', String(f.decada));
  if (f.comAudio) p.set('audio', '1');
  if (f.comFoto) p.set('foto', '1');
  if (f.contou) p.set('contou', '1');
  if (f.falta) p.set('falta', '1');
  if (f.ordem !== ORDEM_PADRAO) p.set('ordem', f.ordem);
  return p;
}

export interface MemoriaDoExplorar {
  id: string;
  ano: number;
  mes: number | null;
  dia: number | null;
  tipo: string;
  integrantes: string[];
  nucleos: string[];
  temas: string[];
  fotos: unknown[];
  /** quantidade de relatos publicados */
  relatos: number;
  /** quando entrou no acervo (data de cadastro) */
  criadaEm: string;
}

/** O que os filtros precisam saber além da memória. Só sobre as memórias que a pessoa vê. */
export interface Contexto {
  /** quem está olhando: "contou" e "falta" valem só para essa pessoa */
  eu: string;
  /** a memória é deste capítulo? (a regra é a da página do capítulo) */
  doCapitulo: (memoriaId: string, capituloId: string) => boolean;
  /** memórias com áudio em algum relato publicado */
  comAudio: Set<string>;
  /** quem já contou algo (relato publicado) em cada memória */
  contaram: Map<string, Set<string>>;
}

export function passa(m: MemoriaDoExplorar, f: Filtros, ctx: Contexto): boolean {
  if (f.tipos.length && !f.tipos.includes(m.tipo)) return false;
  if (f.pessoas.length && !f.pessoas.every((p) => m.integrantes.includes(p))) return false;
  if (f.familias.length && !f.familias.some((n) => m.nucleos.includes(n))) return false;
  if (f.capitulos.length && !f.capitulos.some((c) => ctx.doCapitulo(m.id, c))) return false;
  if (f.temas.length && !f.temas.some((t) => m.temas.includes(t))) return false;
  if (f.de !== null && m.ano < f.de) return false;
  if (f.ate !== null && m.ano > f.ate) return false;
  if (f.decada !== null && (m.ano < f.decada || m.ano > f.decada + 9)) return false;
  if (f.comAudio && !ctx.comAudio.has(m.id)) return false;
  if (f.comFoto && m.fotos.length === 0) return false;
  if (f.contou && !ctx.contaram.get(m.id)?.has(ctx.eu)) return false;
  if (f.falta && (!m.integrantes.includes(ctx.eu) || ctx.contaram.get(m.id)?.has(ctx.eu))) return false;
  return true;
}

const pelaData = (a: MemoriaDoExplorar, b: MemoriaDoExplorar) => a.ano - b.ano || (a.mes ?? 0) - (b.mes ?? 0) || (a.dia ?? 0) - (b.dia ?? 0) || a.criadaEm.localeCompare(b.criadaEm);

export function ordenar<M extends MemoriaDoExplorar>(memorias: M[], ordem: Ordem): M[] {
  const copia = [...memorias];
  switch (ordem) {
    case 'antigas':
      return copia.sort(pelaData);
    case 'entraram':
      return copia.sort((a, b) => b.criadaEm.localeCompare(a.criadaEm) || pelaData(b, a));
    case 'contadas':
      return copia.sort((a, b) => b.relatos - a.relatos || pelaData(b, a));
    default:
      return copia.sort((a, b) => pelaData(b, a));
  }
}

/**
 * Os trilhos de capítulo e a barra de décadas só aparecem na linha do tempo ordenada por data e sem
 * filtro que quebre a continuidade (tipo, áudio, foto, relatos). Nos outros casos, o capítulo vem
 * escrito na memória.
 */
export function mostraTrilhos(f: Filtros): boolean {
  const pelaDataDaMemoria = f.ordem === 'recentes' || f.ordem === 'antigas';
  // Pessoas juntas, como família, capítulo e tema, não quebra (decisão do Gui, 16/11/2026)
  const quebra = f.tipos.length > 0 || f.comAudio || f.comFoto || f.contou || f.falta;
  return pelaDataDaMemoria && !quebra;
}

/** Os filtros ligados, para dizer "nenhum filtro" ou mostrar o botão de limpar. */
export const temFiltro = (f: Filtros): boolean => paraEndereco({ ...f, ordem: ORDEM_PADRAO }).size > 0;

export function explorar<M extends MemoriaDoExplorar>(memorias: M[], f: Filtros, ctx: Contexto): { memorias: M[]; total: number; trilhos: boolean } {
  const filtradas = ordenar(
    memorias.filter((m) => passa(m, f, ctx)),
    f.ordem,
  );
  return { memorias: filtradas, total: filtradas.length, trilhos: mostraTrilhos(f) };
}

/**
 * "Me mostre uma memória": uma memória sorteada entre as que passam nos filtros, e outra a cada
 * toque, sem repetir a anterior quando há mais de uma. `sorte` devolve um número de 0 a 1.
 */
export function sortear<M extends { id: string }>(memorias: M[], anterior: string | null = null, sorte: () => number = Math.random): M | undefined {
  const candidatas = memorias.length > 1 && anterior ? memorias.filter((m) => m.id !== anterior) : memorias;
  if (candidatas.length === 0) return undefined;
  return candidatas[Math.min(candidatas.length - 1, Math.floor(sorte() * candidatas.length))];
}

// --- A tela do Explorar: as formas de ver e o endereço de cada uma -----------------------------

/** As formas de ver do Explorar. No endereço, "ver"; sem ele, a linha do tempo. */
export type Forma = 'linha' | 'mural' | 'lista' | 'tv' | 'acaso';
export const FORMAS: Forma[] = ['linha', 'mural', 'lista', 'tv', 'acaso'];
export const FORMA_PADRAO: Forma = 'linha';

export const NOMES_DAS_FORMAS: Record<Forma, string> = {
  linha: 'Linha do tempo',
  mural: 'Mural de fotos',
  // O nome é do Gui (17/11/2026)
  lista: 'Lista',
  tv: 'Modo TV',
  acaso: 'Me mostre uma memória',
};

/**
 * "Forma de ver" tem só as formas que trocam o conteúdo no lugar e mantêm os controles. "Modo TV" e
 * "Me mostre uma memória" levam a outra tela: são saídas, e aparecem ao lado, com seta (resposta do
 * Gui à P34 do QA de design de 17/11/2026).
 */
export const FORMAS_NO_LUGAR = ['linha', 'mural', 'lista'] as const satisfies readonly Forma[];
export const FORMAS_QUE_SAEM = ['tv', 'acaso'] as const satisfies readonly Forma[];

export function lerForma(p: URLSearchParams): Forma {
  const ver = p.get('ver');
  return FORMAS.includes(ver as Forma) ? (ver as Forma) : FORMA_PADRAO;
}

/**
 * O endereço do Explorar com os filtros, a ordem e a forma de ver. `mais` leva o que é só de uma
 * forma: a memória da vez no modo TV e no "ao acaso" (`m`) e o "Passar sozinho" (passarNoEndereco).
 */
export function enderecoDoExplorar(f: Filtros, forma: Forma = FORMA_PADRAO, mais: Record<string, string | undefined> = {}): string {
  const p = paraEndereco(f);
  if (forma !== FORMA_PADRAO) p.set('ver', forma);
  for (const [nome, valor] of Object.entries(mais)) if (valor) p.set(nome, valor);
  const busca = p.toString();
  return busca ? `/explorar?${busca}` : '/explorar';
}

/**
 * Depois de uma troca sem recarregar, a rolagem volta para o que a pessoa estava olhando. Se a
 * memória dela saiu, vale a do ano mais próximo; no empate, o ano mais antigo, que na ordem de
 * sempre é o que vem logo abaixo. Sem nenhum ano, não há para onde voltar.
 */
export function anoMaisProximo(anos: number[], alvo: number): number | undefined {
  let melhor: number | undefined;
  for (const ano of anos) {
    if (melhor === undefined || Math.abs(ano - alvo) < Math.abs(melhor - alvo) || (Math.abs(ano - alvo) === Math.abs(melhor - alvo) && ano < melhor)) melhor = ano;
  }
  return melhor;
}

/**
 * O filtro de família aceita mais de uma (decisão do Gui, 16/11/2026): tocar numa família liga ou
 * desliga só ela, e as memórias de qualquer uma das marcadas entram. A ordem é a das famílias no
 * site, para o endereço não depender da ordem dos toques.
 */
export function alternarFamilia(marcadas: string[], id: string, todas: string[]): string[] {
  const novas = marcadas.includes(id) ? marcadas.filter((f) => f !== id) : [...marcadas, id];
  const naOrdem = todas.filter((f) => novas.includes(f));
  // Marcar todas é a família completa: o filtro desliga sozinho (decisão do Gui, 17/11/2026)
  return naOrdem.length === todas.length ? [] : naOrdem;
}

/**
 * A animação do modo TV (docs/visual.md, "O modo TV é o lugar de experimentar"): três, para quem
 * está vendo escolher em "Ajustes" (decisão do Gui, 17/11/2026: a escolha fica com as pessoas, sem
 * fechar numa só). No endereço, `mov`; sem ele, a primeira.
 */
export const MOVIMENTOS = [
  { id: 'a', nome: 'Álbum' },
  { id: 'b', nome: 'Revelação' },
  { id: 'c', nome: 'Mesa' },
] as const;
export type Movimento = (typeof MOVIMENTOS)[number]['id'];
export const MOVIMENTO_PADRAO: Movimento = 'a';

export function lerMovimento(p: URLSearchParams): Movimento {
  const pedido = p.get('mov');
  return MOVIMENTOS.find((m) => m.id === pedido)?.id ?? MOVIMENTO_PADRAO;
}

export const movimentoNoEndereco = (movimento: Movimento): Record<string, string | undefined> => ({ mov: movimento === MOVIMENTO_PADRAO ? undefined : movimento });

/**
 * O tamanho das fotos no mural (decisão do Gui, 17/11/2026): quem está vendo escolhe a densidade,
 * com fotos menores ou maiores. Fica no endereço, em `tamanho`; sem ele, o tamanho médio.
 */
export type Tamanho = 'pequenas' | 'medias' | 'grandes';
export const TAMANHOS: Tamanho[] = ['pequenas', 'medias', 'grandes'];
export const TAMANHO_PADRAO: Tamanho = 'medias';
export const NOMES_DOS_TAMANHOS: Record<Tamanho, string> = { pequenas: 'Pequenas', medias: 'Médias', grandes: 'Grandes' };

export function lerTamanho(p: URLSearchParams): Tamanho {
  const pedido = p.get('tamanho');
  return TAMANHOS.includes(pedido as Tamanho) ? (pedido as Tamanho) : TAMANHO_PADRAO;
}

/** O que vai no endereço para um tamanho (para `mais`, em enderecoDoExplorar): o padrão não vai. */
export const tamanhoNoEndereco = (tamanho: Tamanho): Record<string, string | undefined> => ({ tamanho: tamanho === TAMANHO_PADRAO ? undefined : tamanho });

/**
 * "Passar sozinho", no modo TV (decisão do Gui, 17/11/2026): quem está vendo escolhe o tempo de
 * cada memória, entre 8, 10 e 15 segundos, e pode pausar e retomar. Fica no endereço, como os
 * filtros: `passar` leva os segundos e `pausa`, a pausa. Sem `passar`, nada passa sozinho.
 */
export const TEMPOS_DE_PASSAR = [8, 10, 15] as const;
export const TEMPO_DE_PASSAR_PADRAO = 10;

export interface Passar {
  /** os segundos de cada memória; null quando "Passar sozinho" está desligado */
  tempo: number | null;
  pausado: boolean;
}

export function lerPassar(p: URLSearchParams): Passar {
  const pedido = p.get('passar');
  if (pedido === null) return { tempo: null, pausado: false };
  const segundos = Number(pedido);
  // Um valor fora da lista (como o "1" dos primeiros endereços) vale o padrão
  const tempo = (TEMPOS_DE_PASSAR as readonly number[]).includes(segundos) ? segundos : TEMPO_DE_PASSAR_PADRAO;
  return { tempo, pausado: p.get('pausa') === '1' };
}

/** O que vai no endereço para um estado do "Passar sozinho" (para `mais`, em enderecoDoExplorar). */
export function passarNoEndereco(passar: Passar): Record<string, string | undefined> {
  if (passar.tempo === null) return {};
  return { passar: String(passar.tempo), pausa: passar.pausado ? '1' : undefined };
}

/**
 * O modo TV sem rede (resposta do Gui ao C3 do QA de código de 17/11/2026): a memória da tela fica,
 * a passagem espera com este aviso e volta sozinha quando a rede volta.
 */
export const AVISO_SEM_REDE = 'Sem conexão. Tentando de novo…';
/** De quanto em quanto tempo a passagem é tentada de novo enquanto a rede não volta. */
export const SEGUNDOS_ATE_TENTAR_DE_NOVO = 5;

/**
 * A passagem falhou por falta de rede? Sem rede, o `fetch` rejeita com um TypeError, e o navegador
 * pode já saber que está fora do ar (`online`). Uma resposta com erro do servidor (500, 404) não é
 * falta de rede: essa continua caindo na navegação comum.
 */
export function falhaDeRede(erro: unknown, online: boolean): boolean {
  return !online || erro instanceof TypeError;
}

/**
 * A linha da conta, abaixo da assinatura, que o leitor de tela anuncia a cada troca: "46 memórias ·
 * de 1958 a 2026". Sem resultado, diz "Nenhuma memória" (resposta do Gui à P38, 17/11/2026).
 */
export function contaDoExplorar(anos: number[]): string {
  if (anos.length === 0) return 'Nenhuma memória';
  const primeiro = Math.min(...anos);
  const ultimo = Math.max(...anos);
  const quantas = `${anos.length} ${anos.length === 1 ? 'memória' : 'memórias'}`;
  return `${quantas} · ${primeiro === ultimo ? `em ${primeiro}` : `de ${primeiro} a ${ultimo}`}`;
}

/**
 * A ação do fim dos filtros, que fecha o painel e leva ao resultado: "Ver as 3 memórias" (resposta
 * do Gui à P33, 17/11/2026). Sem resultado não há para onde levar.
 */
export function acaoDeVerOResultado(quantas: number): string | null {
  if (quantas <= 0) return null;
  return quantas === 1 ? 'Ver a memória' : `Ver as ${quantas} memórias`;
}

/** A âncora de cada memória na linha do tempo: é para ela que o modo TV e o "ao acaso" voltam (P39). */
export const ancoraDaMemoria = (id: string) => `memoria-${id}`;

/**
 * A linha do tempo termina onde o acervo começa? Só na ordem de sempre, e quando a última memória da
 * tela é a mais antiga de tudo o que a pessoa vê: com um filtro que tira as mais antigas, a frase
 * "Aqui começa o acervo." não seria verdade.
 */
export function terminaNoComecoDoAcervo<M extends MemoriaDoExplorar>(naTela: M[], todas: M[], ordem: Ordem): boolean {
  if (ordem !== 'recentes' || naTela.length === 0) return false;
  return ordenar(todas, 'antigas')[0]?.id === naTela.at(-1)!.id;
}

/** Os nomes de que o resumo precisa: de cada id, o nome que aparece na tela. */
export interface NomesDosFiltros {
  tipo: (id: string) => string | undefined;
  pessoa: (id: string) => string | undefined;
  capitulo: (id: string) => string | undefined;
  tema: (id: string) => string | undefined;
}

/**
 * Os filtros ligados, um por item, como aparecem escritos no controle fechado. A família não entra:
 * ela tem o controle dela, logo acima. O que o endereço pede e não existe (um tipo apagado, um
 * capítulo que a pessoa não vê) não é escrito.
 */
export function resumoDosFiltros(f: Filtros, nomes: NomesDosFiltros): string[] {
  const achados = (ids: string[], nome: (id: string) => string | undefined) => ids.map(nome).filter((n): n is string => Boolean(n));
  const itens = [...achados(f.tipos, nomes.tipo)];
  const pessoas = achados(f.pessoas, nomes.pessoa);
  if (pessoas.length) itens.push(pessoas.length === 1 ? `com ${pessoas[0]}` : `com ${pessoas.slice(0, -1).join(', ')} e ${pessoas.at(-1)} juntos`);
  itens.push(...achados(f.capitulos, nomes.capitulo), ...achados(f.temas, nomes.tema));
  if (f.decada !== null) itens.push(`anos ${f.decada}`);
  if (f.de !== null && f.ate !== null) itens.push(f.de === f.ate ? `${f.de}` : `de ${f.de} a ${f.ate}`);
  else if (f.de !== null) itens.push(`de ${f.de} em diante`);
  else if (f.ate !== null) itens.push(`até ${f.ate}`);
  if (f.comFoto) itens.push('com foto');
  if (f.comAudio) itens.push('com áudio');
  if (f.contou) itens.push('você já contou');
  if (f.falta) itens.push('você estava e ainda não contou');
  return itens;
}

/** As vizinhas de uma memória numa lista: a de antes e a de depois, na ordem em que a lista está. */
export function vizinhasNaLista<M extends { id: string }>(memorias: M[], id: string): { posicao: number; antes?: M; depois?: M } {
  const posicao = memorias.findIndex((m) => m.id === id);
  if (posicao < 0) return { posicao };
  return { posicao, antes: memorias[posicao - 1], depois: memorias[posicao + 1] };
}

/**
 * "Só as fotos", no modo TV: os controles ficam escondidos, e sempre há caminho de volta (defeito
 * achado pelo Gui, 17/11/2026: depois de "Só as fotos" não dava para voltar ao texto nem chegar aos
 * ajustes). O que cada gesto faz nesse modo:
 *
 * - Esc volta ao modo com texto, sempre;
 * - as setas para os lados continuam trocando de memória, sem mostrar os controles;
 * - qualquer outro gesto (toque, clique, movimento do mouse, Enter, seta para cima, qualquer botão do
 *   controle da TV) traz os controles de volta por alguns segundos, com "Mostrar o texto" em destaque;
 * - com os controles à vista, o gesto faz o que sempre fez, e o tempo deles na tela recomeça.
 */
export type GestoNoPalco = { tipo: 'tecla'; tecla: string } | { tipo: 'toque' } | { tipo: 'mouse' };
export type ReacaoEmSoFotos = 'voltar-ao-texto' | 'passar' | 'mostrar-controles' | 'seguir';

export function reacaoEmSoFotos(gesto: GestoNoPalco, controlesAVista: boolean): ReacaoEmSoFotos {
  if (gesto.tipo === 'tecla') {
    if (gesto.tecla === 'Escape') return 'voltar-ao-texto';
    if (gesto.tecla === 'ArrowLeft' || gesto.tecla === 'ArrowRight') return 'passar';
  }
  return controlesAVista ? 'seguir' : 'mostrar-controles';
}

/** Quanto tempo os controles ficam na tela, em "Só as fotos", depois do último gesto. */
export const SEGUNDOS_DOS_CONTROLES = 5;

// --- A lista: uma memória por linha ---------------------------------------------------------------
// Forma de ver pedida pelo Gui em 17/11/2026, no modelo do "Já rolou" da agenda da @bsurda: o ano
// grande abre cada bloco, e cada memória é uma linha. Aqui ficam as partes da linha que têm regra.

/** As formas de ver da página da pessoa: as mesmas do Explorar, sem o modo TV e o sorteio. */
export const FORMAS_DA_PESSOA = ['linha', 'mural', 'lista'] as const satisfies readonly Forma[];
export type FormaDaPessoa = (typeof FORMAS_DA_PESSOA)[number];

export function lerFormaDaPessoa(p: URLSearchParams): FormaDaPessoa {
  const ver = p.get('ver');
  return FORMAS_DA_PESSOA.find((f) => f === ver) ?? FORMA_PADRAO;
}

/** O endereço da página da pessoa em cada forma de ver. A linha do tempo, que é o padrão, não vai no endereço. */
export function enderecoDaPessoa(id: string, forma: FormaDaPessoa = FORMA_PADRAO): string {
  return `/pessoas/${id}${forma === FORMA_PADRAO ? '' : `?ver=${forma}`}`;
}

/**
 * A data na linha da lista (resposta do Gui à P45, 17/11/2026: quem só tem o ano fica em branco). Dentro do bloco do ano, só o dia e o mês ("24 dez", "dez"); a data
 * aproximada diz "por volta de", com o mês quando ele é conhecido; quem só tem o ano fica sem nada,
 * porque o ano já está no alto do bloco. Fora da ordem do tempo não há bloco: a data vai inteira.
 */
export function dataNaLista(d: DataFlexivel, noBlocoDoAno: boolean): string {
  if (!noBlocoDoAno) return carimboDaData(d);
  const diaMes = diaMesCurto(d);
  if (d.aproximada) return diaMes ? `por volta de ${MES_SO(d)}` : 'por volta de';
  return diaMes;
}
// Com a data aproximada, o dia não entra: "por volta de dez"
const MES_SO = (d: DataFlexivel) => diaMesCurto({ mes: d.mes, dia: null });

// O nome que começa pelo parentesco ou pelo tratamento só diz quem é com a palavra seguinte
const TRATAMENTOS = new Set(['vó', 'vô', 'vovó', 'vovô', 'bisa', 'bisavó', 'bisavô', 'tia', 'tio', 'prima', 'primo', 'madrinha', 'padrinho', 'dinda', 'dindo', 'dona', 'seu']);

/**
 * O nome de alguém numa linha curta: como é chamado na família ou, sem apelido, o primeiro nome
 * (resposta do Gui à P46, 17/11/2026). O nome de família com duas palavras entra inteiro: "Vó Bela"
 * e "Prima Carol", e não "Vó" e "Prima".
 */
export function nomeCurto(pessoa: { nome: string; apelido?: string | null }): string {
  const apelido = pessoa.apelido?.trim();
  if (apelido) return apelido;
  const [primeira, segunda] = pessoa.nome.trim().split(/\s+/);
  if (!primeira) return pessoa.nome;
  return segunda && TRATAMENTOS.has(primeira.toLowerCase()) ? `${primeira} ${segunda}` : primeira;
}

/** Quem estava, na linha da lista: até três nomes, na ordem da memória, e "+N" para o resto. */
export function quemNaLista(nomes: string[], maximo = 3): { nomes: string[]; mais: number; texto: string } {
  const primeiros = nomes.slice(0, maximo);
  const mais = Math.max(0, nomes.length - maximo);
  return { nomes: primeiros, mais, texto: [primeiros.join(', '), mais > 0 ? `+${mais}` : ''].filter(Boolean).join(' ') };
}

/** A lista segue a linha do tempo no rascunho: quem escreveu vê o dela, levando ao formulário. */
export const mostraRascunho = (forma: Forma) => forma === 'linha' || forma === 'lista';
