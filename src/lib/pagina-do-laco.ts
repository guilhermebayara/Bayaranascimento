// A página do laço (onda 2, decisão do Gui de 17/11/2026): a linha do tempo de duas pessoas, com as fases
// do casal como faixas e as memórias em que as duas estão. Chega-se pela ficha da árvore ("Ver o laço") e
// pela edição dos laços. Funções puras, testadas em testes/pagina-do-laco.test.ts.
import { FASES, FASES_JUNTOS, type Fase, type TipoDeFase } from './parentesco';

export interface Faixa {
  tipo: TipoDeFase;
  rotulo: string;
  de: number;
  /** o último ano da faixa; igual a `de` num momento (a separação) */
  ate: number;
  /** a faixa segue até hoje */
  aberta: boolean;
}

/**
 * As fases como faixas no tempo. Cada fase vai do início ao fim informado, ou até o começo da seguinte; a
 * última, se é de estar junto e não tem fim, segue até hoje. A separação é um momento. Fase sem ano
 * nenhum não vira faixa: não há onde pôr.
 */
export function faixasDasFases(fases: readonly Fase[], anoAtual: number): Faixa[] {
  const faixas: Faixa[] = [];
  fases.forEach((fase, i) => {
    const ultima = i === fases.length - 1;
    const seguinte = fases.slice(i + 1).find((f) => f.inicioAno)?.inicioAno ?? null;
    const de = fase.inicioAno ?? null;
    if (de === null) return;
    const momento = fase.tipo === 'separacao' && !fase.fimAno;
    const aberta = ultima && !fase.fimAno && FASES_JUNTOS.includes(fase.tipo);
    const ate = momento ? de : (fase.fimAno ?? seguinte ?? (aberta || fase.tipo === 'amizade' ? anoAtual : de));
    faixas.push({ tipo: fase.tipo, rotulo: FASES[fase.tipo], de, ate: Math.max(de, ate), aberta: aberta || (ultima && fase.tipo === 'amizade' && !fase.fimAno) });
  });
  return faixas;
}

/** O começo e o fim da linha do tempo: das faixas e das memórias, com um ano de folga dos dois lados. */
export function periodoDoLaco(faixas: readonly Faixa[], anosDasMemorias: readonly number[], anoAtual: number): { de: number; ate: number } | null {
  const anos = [...faixas.flatMap((f) => [f.de, f.ate]), ...anosDasMemorias.filter((a) => a > 0)];
  if (anos.length === 0) return null;
  const de = Math.min(...anos) - 1;
  const ate = Math.min(anoAtual, Math.max(...anos) + 1);
  return { de, ate: Math.max(ate, de + 2) };
}

/** Onde um ano fica na linha, de 0 a 100. */
export function posicao(ano: number, periodo: { de: number; ate: number }): number {
  return Math.max(0, Math.min(100, ((ano - periodo.de) / (periodo.ate - periodo.de)) * 100));
}

/** As marcas de ano da régua: a cada 5, 10 ou 20 anos, conforme o tamanho. */
export function marcasDosAnos(periodo: { de: number; ate: number }): number[] {
  const largura = periodo.ate - periodo.de;
  const passo = largura <= 15 ? 5 : largura <= 50 ? 10 : 20;
  const marcas: number[] = [];
  for (let ano = Math.ceil(periodo.de / passo) * passo; ano <= periodo.ate; ano += passo) marcas.push(ano);
  return marcas;
}

/** O endereço da página do laço, sempre na mesma ordem. */
export const enderecoDoLaco = (x: string, y: string): string => (x < y ? `/lacos/${x}/${y}` : `/lacos/${y}/${x}`);
