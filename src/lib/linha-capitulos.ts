// Capítulos na linha do tempo (docs/decisoes.md, "Capítulos na linha do tempo"): a montagem dos
// trilhos, sem tela, como a da árvore. Cada capítulo é um trilho vertical à esquerda das memórias,
// do começo ao fim dele. As memórias do capítulo se prendem ao trilho; uma memória de fora, no
// meio, fica no lugar dela na ordem do tempo e o trilho segue tracejado nesse trecho.
//
// Quem chama entrega só o que a pessoa pode ver: as memórias da linha do tempo dela, na ordem da
// tela (das mais recentes para as mais antigas), e os capítulos visíveis para ela.
//
// PROPOSTA em avaliação (16/11/2026), para o furo que o Gui achou: pela regra de hoje, toda
// memória que cai no período de um capítulo de época é dele, mesmo quando o capítulo é da vida de
// uma pessoa só. A proposta separa duas coisas, e a montagem já entende as duas:
// - a época de todos (`deTodos`), que vale para a família inteira, como a pandemia: não vira
//   trilho, porque todo mundo está dentro; vira uma marca no começo e outra no fim;
// - o capítulo com período e pessoas (`pessoas`): entram as memórias do período em que alguma
//   dessas pessoas está. As outras memórias do período ficam de fora, e o trilho segue tracejado.
// Sem `deTodos` nem `pessoas`, o capítulo de época continua valendo como hoje.
import { dentroDoPeriodo, formatarPeriodo, periodoDasMemorias, type Capitulo, type DataSolta } from './capitulos';

export interface MemoriaDaLinha extends DataSolta {
  id: string;
  /** capítulos reunidos em que a memória foi colocada */
  capitulos: string[];
  /** quem estava na memória: só é preciso para capítulo com período e pessoas */
  integrantes?: string[];
}

export type CapituloDaLinha = Pick<Capitulo, 'id' | 'titulo' | 'modo' | 'inicio' | 'fim' | 'dentroDe'> & {
  /** de quem é o capítulo de época: entram as memórias do período em que alguma dessas pessoas está */
  pessoas?: string[];
  /** época que vale para a família inteira: vira marca, e não trilho */
  deTodos?: boolean;
};

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
  /** a cor do capítulo: um número de 0 em diante. Capítulos que convivem nunca dividem a cor. */
  cor: number;
}

/** Uma época de todos: o trecho da linha do tempo que ela cobre, para as marcas do começo e do fim. */
export interface EpocaDaLinha {
  id: string;
  titulo: string;
  periodo: string;
  primeira: number;
  ultima: number;
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
  /** todos os capítulos da memória que aparecem nesta linha do tempo: o sinal de cada um nela */
  capitulos: string[];
  /** épocas de todos cuja marca do alto vem antes desta memória, e cuja marca do fim vem depois */
  epocaAbre: string[];
  epocaFecha: string[];
}

export interface Trilhos {
  capitulos: TrilhoDoCapitulo[];
  epocas: EpocaDaLinha[];
  linhas: LinhaDaMemoria[];
  /** quantos trilhos a linha do tempo usa, no trecho mais cheio */
  quantos: number;
}

/** Quantos trilhos cabem em cada largura. A partir daí, o capítulo aparece só pelo sinal na memória. */
export const CABEM = { celular: 2, computador: 4, telaGrande: 6 } as const;

/** Um capítulo aparece como trilho enquanto houver lugar; depois, só pelo sinal na memória. */
export const comoAparece = (trilho: number, cabem: number): 'trilho' | 'etiqueta' => (trilho < cabem ? 'trilho' : 'etiqueta');

export function montarTrilhos(memorias: MemoriaDaLinha[], todos: CapituloDaLinha[]): Trilhos {
  const noPeriodo = (c: CapituloDaLinha) => memorias.flatMap((m, i) => (c.inicio && dentroDoPeriodo(m, c.inicio, c.fim) ? [i] : []));

  // As épocas de todos não entram na conta dos trilhos: viram marca no começo e no fim
  const epocas: EpocaDaLinha[] = [];
  for (const c of todos.filter((x) => x.modo === 'epoca' && x.deTodos)) {
    const posicoes = noPeriodo(c);
    if (posicoes.length) epocas.push({ id: c.id, titulo: c.titulo, periodo: formatarPeriodo(c.inicio, c.fim, true), primeira: Math.min(...posicoes), ultima: Math.max(...posicoes) });
  }
  const capitulos = todos.filter((x) => !(x.modo === 'epoca' && x.deTodos));

  // Quem é de cada capítulo: no reunido, quem foi colocado; no de época, quem cai no período e,
  // se o capítulo for de algumas pessoas, só as memórias em que alguma delas está.
  // O capítulo maior leva também as memórias dos capítulos de dentro.
  const proprias = new Map<string, Set<number>>();
  for (const c of capitulos) {
    const dele = new Set<number>();
    if (c.modo === 'epoca') {
      const dePessoas = c.pessoas?.length ? new Set(c.pessoas) : null;
      for (const i of noPeriodo(c)) if (!dePessoas || memorias[i]!.integrantes?.some((p) => dePessoas.has(p))) dele.add(i);
    } else {
      memorias.forEach((m, i) => m.capitulos.includes(c.id) && dele.add(i));
    }
    proprias.set(c.id, dele);
  }
  const membros = new Map<string, Set<number>>();
  for (const c of capitulos) {
    const dele = new Set(proprias.get(c.id));
    for (const filho of capitulos) if (filho.dentroDe === c.id) for (const i of proprias.get(filho.id)!) dele.add(i);
    membros.set(c.id, dele);
  }

  // Capítulo sem nenhuma memória nesta linha do tempo não aparece
  const ativos = capitulos.filter((c) => membros.get(c.id)!.size > 0);
  const ativo = new Set(ativos.map((c) => c.id));
  const paiDe = (c: CapituloDaLinha) => (c.dentroDe && ativo.has(c.dentroDe) ? c.dentroDe : null);
  // O trilho do capítulo reunido vai da primeira à última memória dele. O do capítulo de época vai
  // do começo ao fim do período, mesmo que as memórias das pontas sejam de fora.
  const trecho = (c: CapituloDaLinha) => {
    const posicoes = [...membros.get(c.id)!, ...(c.modo === 'epoca' ? noPeriodo(c) : [])];
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
  const convivem = (a: { primeira: number; ultima: number }, b: { primeira: number; ultima: number }) => a.primeira <= b.ultima && b.primeira <= a.ultima;
  const colocar = (c: CapituloDaLinha, aPartirDe: number) => {
    const t = trecho(c);
    let trilho = aPartirDe;
    while (postos.some((p) => p.trilho === trilho && convivem(p, t))) trilho++;
    postos.push({ id: c.id, titulo: c.titulo, periodo: periodoDoCapitulo(c, [...membros.get(c.id)!].map((i) => memorias[i]!)), trilho, ...t, dentroDe: paiDe(c), cor: 0 });
    return trilho;
  };
  for (const c of ativos.filter((x) => !paiDe(x)).sort(porTamanho)) {
    const trilho = colocar(c, 0);
    for (const filho of ativos.filter((x) => paiDe(x) === c.id).sort(porTamanho)) colocar(filho, trilho + 1);
  }

  // A cor de cada capítulo, na ordem em que aparecem na tela: a primeira que nenhum capítulo que
  // convive com ele usa. Assim dois trilhos lado a lado nunca têm a mesma cor.
  const coloridos: TrilhoDoCapitulo[] = [];
  for (const p of [...postos].sort((a, b) => a.primeira - b.primeira || a.trilho - b.trilho)) {
    const usadas = new Set(coloridos.filter((outro) => convivem(outro, p)).map((outro) => outro.cor));
    let cor = coloridos.length;
    for (let tentativa = 0; tentativa <= usadas.size; tentativa++) {
      if (!usadas.has(tentativa)) {
        cor = tentativa;
        break;
      }
    }
    p.cor = cor;
    coloridos.push(p);
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
      epocaAbre: epocas.filter((e) => e.primeira === i).map((e) => e.id),
      epocaFecha: epocas.filter((e) => e.ultima === i).map((e) => e.id),
    };
  });

  return { capitulos: postos.sort((a, b) => a.trilho - b.trilho || a.primeira - b.primeira), epocas, linhas, quantos };
}

/** O período escrito no alto do trilho: o do capítulo de época; no reunido, da primeira à última memória. */
function periodoDoCapitulo(c: CapituloDaLinha, dele: DataSolta[]): string {
  if (c.modo === 'epoca') return formatarPeriodo(c.inicio, c.fim, true);
  const periodo = periodoDasMemorias(dele);
  return periodo ? formatarPeriodo({ ano: periodo.inicio.ano }, { ano: periodo.fim.ano }) : '';
}

/** O capítulo que ocupa cada trilho na altura de uma memória (para a cor de cada trecho de trilho). */
export function capitulosNosTrilhos(montagem: Trilhos, posicao: number): (TrilhoDoCapitulo | null)[] {
  const resultado: (TrilhoDoCapitulo | null)[] = Array(montagem.quantos).fill(null);
  for (const c of montagem.capitulos) if (c.primeira <= posicao && posicao <= c.ultima) resultado[c.trilho] = c;
  return resultado;
}

/**
 * O que cada trilho mostra numa linha de marca (o título no alto ou o "começo do capítulo" embaixo),
 * que fica junto de uma memória. Os outros capítulos passam por ela: os que já tinham começado e, na
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

/**
 * Os trilhos que passam pela marca de uma época de todos. A marca do alto vem antes de tudo o que
 * fica junto da memória, então só passam os capítulos que já vinham de cima; a do fim vem depois de
 * tudo, então só passam os que continuam na memória de baixo.
 */
export function trilhosNaEpoca(montagem: Trilhos, posicao: number, marca: 'abre' | 'fecha'): (Estado | null)[] {
  if (marca === 'abre') return montagem.linhas[posicao]!.chega;
  return montagem.linhas[posicao + 1]?.chega ?? Array(montagem.quantos).fill(null);
}
