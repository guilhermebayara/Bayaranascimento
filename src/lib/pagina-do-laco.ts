// A página do laço (onda 2, decisão do Gui de 17/11/2026): a história de duas pessoas, com as fases do
// casal no tempo e as memórias em que as duas estão. Chega-se pela ficha da árvore ("Ver o laço") e
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

/**
 * O período do laço, para a pílula da capa: do primeiro ano conhecido (das fases e das memórias) ao
 * último, ou "a hoje" quando a fase de hoje segue. Sem ano nenhum, não há período.
 */
export function periodoDoLaco(faixas: readonly Faixa[], anosDasMemorias: readonly number[]): string | null {
  const anos = [...faixas.flatMap((f) => [f.de, f.ate]), ...anosDasMemorias.filter((a) => a > 0)];
  if (anos.length === 0) return null;
  const de = Math.min(...anos);
  if (faixas.some((f) => f.aberta)) return `${de} a hoje`;
  const ate = Math.max(...anos);
  return de === ate ? String(de) : `${de} a ${ate}`;
}

/**
 * De que fase é cada memória, pelo ano: a fase que estava valendo naquele ano. No ano em que uma fase
 * dá lugar à outra, vale a que começa. A separação é um momento e só fica com as memórias do ano dela;
 * o que veio depois dela, sem outra fase, não é de fase nenhuma. Devolve, para cada fase (na ordem
 * das fases do casal), os índices das memórias dela. Fase sem ano não recebe memória: não há como saber.
 */
export function memoriasDasFases(fases: readonly Fase[], anosDasMemorias: readonly number[], anoAtual: number): number[][] {
  const comAno = fases.map((f, i) => ({ f, i })).filter((x) => x.f.inicioAno);
  const faixas = faixasDasFases(fases, anoAtual);
  const porFase: number[][] = fases.map(() => []);
  anosDasMemorias.forEach((ano, n) => {
    if (!(ano > 0)) return;
    for (let k = faixas.length - 1; k >= 0; k--) {
      if (faixas[k].de <= ano && ano <= faixas[k].ate) {
        porFase[comAno[k].i].push(n);
        return;
      }
    }
  });
  return porFase;
}

/** O endereço da página do laço, sempre na mesma ordem. */
export const enderecoDoLaco = (x: string, y: string): string => (x < y ? `/lacos/${x}/${y}` : `/lacos/${y}/${x}`);
