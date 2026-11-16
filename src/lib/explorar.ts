// Explorar (docs/decisoes.md, "Explorar"): os filtros e as ordens, sem tela. A tela (linha do tempo,
// mural, modo TV e ao acaso) é da revisão visual; ela lê o endereço com lerFiltros, chama explorar e
// escreve o endereço com paraEndereco, para guardar ou mandar o link.
//
// Quem chama entrega só as memórias que a pessoa vê (listarMemorias). Nada aqui acrescenta memória:
// o resultado, o sorteio e as contagens saem sempre dessa lista.
//
// Entre filtros diferentes vale o "e". Dentro de um mesmo filtro, vale o "ou" (este tipo ou aquele,
// esta família ou aquela), menos nas pessoas, que são "pessoas juntas": a memória precisa ter todas.

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
  /** as memórias em que esta pessoa já contou algo */
  contou: string | null;
  /** as memórias em que esta pessoa estava e ainda não contou */
  falta: string | null;
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
  contou: null,
  falta: null,
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
const id = (texto: string | null) => (texto && texto.length <= 80 ? texto.trim() || null : null);

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
    contou: id(p.get('contou')),
    falta: id(p.get('falta')),
    ordem: ORDENS.includes(ordem as Ordem) ? (ordem as Ordem) : ORDEM_PADRAO,
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
  if (f.contou) p.set('contou', f.contou);
  if (f.falta) p.set('falta', f.falta);
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
  if (f.contou && !ctx.contaram.get(m.id)?.has(f.contou)) return false;
  if (f.falta && (!m.integrantes.includes(f.falta) || ctx.contaram.get(m.id)?.has(f.falta))) return false;
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
  const quebra = f.tipos.length > 0 || f.comAudio || f.comFoto || Boolean(f.contou) || Boolean(f.falta);
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
