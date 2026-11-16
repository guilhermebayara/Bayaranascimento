// Capítulos na linha do tempo (docs/decisoes.md, "Capítulos na linha do tempo"): a montagem dos
// trilhos, sem tela, como a da árvore. Cada capítulo é um trilho vertical à esquerda das memórias,
// do começo ao fim dele. As memórias do capítulo se prendem ao trilho; uma memória de fora, no
// meio, fica no lugar dela na ordem do tempo e o trilho segue tracejado nesse trecho.
//
// Quem chama entrega só o que a pessoa pode ver: as memórias da linha do tempo dela, na ordem da
// tela (das mais recentes para as mais antigas), e os capítulos visíveis para ela.
import { dentroDoPeriodo, formatarPeriodo, periodoDasMemorias, type Capitulo, type DataSolta } from './capitulos';

export interface MemoriaDaLinha extends DataSolta {
  id: string;
  /** capítulos reunidos em que a memória foi colocada */
  capitulos: string[];
}

export type CapituloDaLinha = Pick<Capitulo, 'id' | 'titulo' | 'modo' | 'inicio' | 'fim' | 'dentroDe'>;

/** Como o trilho passa por uma memória: presa a ele, ou de fora (tracejado). */
export type Estado = 'preso' | 'fora';

export interface TrilhoDoCapitulo {
  id: string;
  titulo: string;
  /** "2019 a 2021", "mar de 2020 em diante" */
  periodo: string;
  /** a posição do trilho, da esquerda para a direita, começando em 0 */
  trilho: number;
  /** posição, na lista, da memória mais recente do capítulo: é onde o trilho começa, no alto */
  primeira: number;
  /** posição da mais antiga: é onde o trilho termina, embaixo */
  ultima: number;
  /** o capítulo maior em que este está, se ele também aparece nesta linha do tempo */
  dentroDe: string | null;
}

export interface LinhaDaMemoria {
  id: string;
  /** o que há em cada trilho na altura desta memória */
  trilhos: (Estado | null)[];
  /** em cada trilho, se o capítulo já vinha da memória de cima (para o espaço entre um ano e outro) */
  chega: (Estado | null)[];
  /** capítulos que começam aqui, no alto do trilho, do trilho mais à esquerda para a direita */
  abre: string[];
  /** capítulos que terminam aqui, do trilho mais à direita para a esquerda */
  fecha: string[];
  /** todos os capítulos da memória que aparecem nesta linha do tempo, para a etiqueta */
  capitulos: string[];
}

export interface Trilhos {
  capitulos: TrilhoDoCapitulo[];
  linhas: LinhaDaMemoria[];
  /** quantos trilhos a linha do tempo usa, no trecho mais cheio */
  quantos: number;
}

/** Quantos trilhos cabem em cada largura. A partir daí, o capítulo vira etiqueta na memória. */
export const CABEM = { celular: 2, computador: 4, telaGrande: 6 } as const;

/** Um capítulo aparece como trilho enquanto houver lugar; depois, como etiqueta na memória. */
export const comoAparece = (trilho: number, cabem: number): 'trilho' | 'etiqueta' => (trilho < cabem ? 'trilho' : 'etiqueta');

export function montarTrilhos(memorias: MemoriaDaLinha[], capitulos: CapituloDaLinha[]): Trilhos {
  // Quem é de cada capítulo: no de época, quem cai no período; no reunido, quem foi colocado.
  // O capítulo maior leva também as memórias dos capítulos de dentro.
  const proprias = new Map<string, Set<number>>();
  for (const c of capitulos) {
    const dele = new Set<number>();
    memorias.forEach((m, i) => {
      const entra = c.modo === 'epoca' ? Boolean(c.inicio) && dentroDoPeriodo(m, c.inicio!, c.fim) : m.capitulos.includes(c.id);
      if (entra) dele.add(i);
    });
    proprias.set(c.id, dele);
  }
  const membros = new Map<string, Set<number>>();
  for (const c of capitulos) {
    const todos = new Set(proprias.get(c.id));
    for (const filho of capitulos) if (filho.dentroDe === c.id) for (const i of proprias.get(filho.id)!) todos.add(i);
    membros.set(c.id, todos);
  }

  // Capítulo sem nenhuma memória nesta linha do tempo não aparece
  const ativos = capitulos.filter((c) => membros.get(c.id)!.size > 0);
  const ativo = new Set(ativos.map((c) => c.id));
  const paiDe = (c: CapituloDaLinha) => (c.dentroDe && ativo.has(c.dentroDe) ? c.dentroDe : null);
  const trecho = (c: CapituloDaLinha) => {
    const posicoes = [...membros.get(c.id)!];
    return { primeira: Math.min(...posicoes), ultima: Math.max(...posicoes) };
  };
  // O mais longo primeiro; no empate, o que começa mais no alto, e depois o título
  const porTamanho = (a: CapituloDaLinha, b: CapituloDaLinha) => {
    const [ta, tb] = [trecho(a), trecho(b)];
    return tb.ultima - tb.primeira - (ta.ultima - ta.primeira) || ta.primeira - tb.primeira || a.titulo.localeCompare(b.titulo, 'pt-BR');
  };

  // Trilhos lado a lado: o mais longo ou de fora mais à esquerda. Cada capítulo fica no primeiro
  // trilho livre no trecho dele; o de dentro vem logo depois do de fora, sempre à direita dele.
  const postos: TrilhoDoCapitulo[] = [];
  const livre = (trilho: number, t: { primeira: number; ultima: number }) => !postos.some((p) => p.trilho === trilho && p.primeira <= t.ultima && t.primeira <= p.ultima);
  const colocar = (c: CapituloDaLinha, aPartirDe: number) => {
    const t = trecho(c);
    let trilho = aPartirDe;
    while (!livre(trilho, t)) trilho++;
    postos.push({ id: c.id, titulo: c.titulo, periodo: periodoDoCapitulo(c, [...membros.get(c.id)!].map((i) => memorias[i]!)), trilho, ...t, dentroDe: paiDe(c) });
    return trilho;
  };
  for (const c of ativos.filter((x) => !paiDe(x)).sort(porTamanho)) {
    const trilho = colocar(c, 0);
    for (const filho of ativos.filter((x) => paiDe(x) === c.id).sort(porTamanho)) colocar(filho, trilho + 1);
  }

  const quantos = postos.reduce((n, p) => Math.max(n, p.trilho + 1), 0);
  const linhas = memorias.map((m, i): LinhaDaMemoria => {
    const trilhos: (Estado | null)[] = Array(quantos).fill(null);
    const chega: (Estado | null)[] = Array(quantos).fill(null);
    const aqui = postos.filter((p) => p.primeira <= i && i <= p.ultima);
    for (const p of aqui) {
      const estado: Estado = membros.get(p.id)!.has(i) ? 'preso' : 'fora';
      trilhos[p.trilho] = estado;
      if (p.primeira < i) chega[p.trilho] = estado;
    }
    return {
      id: m.id,
      trilhos,
      chega,
      abre: aqui.filter((p) => p.primeira === i).sort((a, b) => a.trilho - b.trilho).map((p) => p.id),
      fecha: aqui.filter((p) => p.ultima === i).sort((a, b) => b.trilho - a.trilho).map((p) => p.id),
      capitulos: aqui.filter((p) => membros.get(p.id)!.has(i)).sort((a, b) => a.trilho - b.trilho).map((p) => p.id),
    };
  });

  return { capitulos: postos.sort((a, b) => a.trilho - b.trilho || a.primeira - b.primeira), linhas, quantos };
}

/** O período escrito no alto do trilho: o do capítulo de época; no reunido, da primeira à última memória. */
function periodoDoCapitulo(c: CapituloDaLinha, dele: DataSolta[]): string {
  if (c.modo === 'epoca') return formatarPeriodo(c.inicio, c.fim, true);
  const periodo = periodoDasMemorias(dele);
  return periodo ? formatarPeriodo({ ano: periodo.inicio.ano }, { ano: periodo.fim.ano }) : '';
}

/**
 * O que cada trilho mostra numa linha de marca (o título no alto ou o "começo de" embaixo), que
 * fica junto de uma memória. Os outros capítulos passam por ela: os que já tinham começado e, na
 * marca do alto, os que abrem antes (mais à esquerda); na de baixo, os que fecham depois.
 */
export function trilhosNaMarca(montagem: Trilhos, posicao: number, capitulo: string, marca: 'abre' | 'fecha'): (Estado | 'ponta' | null)[] {
  const dele = montagem.capitulos.find((c) => c.id === capitulo)!;
  const linha = montagem.linhas[posicao]!;
  const resultado: (Estado | 'ponta' | null)[] = Array(montagem.quantos).fill(null);
  for (const c of montagem.capitulos) {
    if (c.primeira > posicao || c.ultima < posicao) continue;
    if (c.id === capitulo) {
      resultado[c.trilho] = 'ponta';
      continue;
    }
    const passa = marca === 'abre' ? c.primeira < posicao || c.trilho < dele.trilho : c.ultima > posicao || c.trilho < dele.trilho;
    if (passa) resultado[c.trilho] = linha.trilhos[c.trilho] ?? null;
  }
  return resultado;
}
