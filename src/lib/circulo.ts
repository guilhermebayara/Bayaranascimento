// O círculo (docs/decisoes.md, "Círculo"): a pessoa no centro e três faixas, Muito próximo, Próximo e
// Conhecido. A proximidade é contínua, de 0 (colado no centro) a 99 (a borda do círculo); 100 é
// "Fora do círculo". Aqui ficam só as contas, sem tela e sem banco, para ter teste.

export const FORA_DO_CIRCULO = 100;

export interface Faixa {
  id: 1 | 2 | 3;
  nome: string;
  /** de onde a faixa começa, inclusive */
  de: number;
  /** até onde vai, sem incluir */
  ate: number;
  /** o meio: onde entra quem não tem valor declarado, e os três níveis antigos do laço do coração */
  meio: number;
}

export const FAIXAS: Faixa[] = [
  { id: 1, nome: 'Muito próximo', de: 0, ate: 33, meio: 16 },
  { id: 2, nome: 'Próximo', de: 33, ate: 66, meio: 50 },
  { id: 3, nome: 'Conhecido', de: 66, ate: FORA_DO_CIRCULO, meio: 83 },
];

/** A faixa de um valor. Quem está fora do círculo não tem faixa. */
export function faixaDoValor(valor: number): Faixa | null {
  return FAIXAS.find((f) => valor >= f.de && valor < f.ate) ?? null;
}

export const nomeDaProximidade = (valor: number): string => faixaDoValor(valor)?.nome ?? 'Fora do círculo';

// Sem valor declarado, a família vem pela distância na árvore (os caminhos de Relacao.caminho):
// pais, filhos, irmãos e casal em Muito próximo; avós, netos, tios, sobrinhos e cunhados em Próximo.
const MUITO_PROXIMO = new Set(['U', 'D', 'UD', 'C']);
const PROXIMO = new Set(['UU', 'DD', 'UUD', 'UDD', 'UDC', 'CUD']);

/**
 * A proximidade de quem não tem valor declarado. `caminho` é o da árvore, se houver. Laço do coração
 * sem proximidade entra em Próximo. O resto da família fica em Conhecido.
 */
export function proximidadePadrao(pessoa: { caminho?: string | null; doCoracao?: boolean }): number {
  if (pessoa.caminho && MUITO_PROXIMO.has(pessoa.caminho)) return FAIXAS[0]!.meio;
  if (pessoa.caminho && PROXIMO.has(pessoa.caminho)) return FAIXAS[1]!.meio;
  if (pessoa.doCoracao) return FAIXAS[1]!.meio;
  return FAIXAS[2]!.meio;
}

/** Os três níveis antigos do laço do coração (1, 2 e 3) na escala nova: o meio de cada faixa. */
export const valorDoNivel = (nivel: number): number | null => FAIXAS.find((f) => f.id === nivel)?.meio ?? null;

/** O nível antigo (1, 2 ou 3) de um valor, para o laço do coração continuar dizendo a faixa. Fora do círculo: nenhum. */
export const nivelDoValor = (valor: number): number | null => faixaDoValor(valor)?.id ?? null;

/** Lê o que veio de um pedido: inteiro de 0 a 100, ou nada. */
export function lerProximidade(bruto: unknown): number | null {
  const n = typeof bruto === 'number' ? bruto : typeof bruto === 'string' && /^\d{1,3}$/.test(bruto.trim()) ? Number(bruto) : Number.NaN;
  return Number.isInteger(n) && n >= 0 && n <= FORA_DO_CIRCULO ? n : null;
}

/** Lê um ângulo em graus, de -180 a 360, ou nada. */
export function lerAngulo(bruto: unknown): number | null {
  const n = typeof bruto === 'number' ? bruto : typeof bruto === 'string' && /^-?\d{1,3}(\.\d{1,2})?$/.test(bruto.trim()) ? Number(bruto) : Number.NaN;
  return Number.isFinite(n) && n >= -180 && n <= 360 ? Math.round(n * 10) / 10 : null;
}

// --- O desenho em anéis -----------------------------------------------------------------------
// As medidas são em porcentagem do diâmetro do círculo. O centro fica em 50%.

const RAIO_DO_CENTRO = 9.5;
const PASSO = 0.39;
/** Quanto além da borda alguém precisa ser solto para sair do círculo */
const MARGEM_DE_FORA = 3.5;

/** A distância do centro para uma proximidade, em porcentagem do diâmetro. */
export const raioDe = (valor: number): number => RAIO_DO_CENTRO + Math.min(Math.max(valor, 0), FORA_DO_CIRCULO - 1) * PASSO;

/** O diâmetro de cada anel, em porcentagem do diâmetro do círculo: o anel vai até onde a faixa acaba. */
export const diametroDoAnel = (faixa: Faixa): number => (faixa.id === 3 ? 100 : raioDe(faixa.ate) * 2);

/** A proximidade de um ponto a `raio` do centro. Solto além da borda, com folga, é "Fora do círculo". */
export function valorDoRaio(raio: number): number {
  if (raio > raioDe(FORA_DO_CIRCULO - 1) + MARGEM_DE_FORA) return FORA_DO_CIRCULO;
  return Math.round(Math.min(Math.max((raio - RAIO_DO_CENTRO) / PASSO, 0), FORA_DO_CIRCULO - 1));
}

/** O ponto de alguém no círculo, em porcentagem do diâmetro, a partir do centro. */
export function pontoDe(valor: number, angulo: number): { x: number; y: number } {
  const r = raioDe(valor);
  const rad = (angulo * Math.PI) / 180;
  return { x: Math.round(r * Math.cos(rad) * 100) / 100, y: Math.round(r * Math.sin(rad) * 100) / 100 };
}

// No alto de cada anel fica o nome da faixa: quem não escolheu um lugar se espalha pelo resto da volta
const VAO_DO_NOME = [80, 56, 40];

/**
 * Dá um ângulo a quem não escolheu o próprio lugar. Em cada faixa, as pessoas se espalham pela volta
 * inteira, menos o trecho do nome da faixa, e vizinhos de proximidade parecida ficam em lados
 * opostos, para não se cobrirem. Quem já tem ângulo (arrastou) fica onde pôs.
 */
export function distribuir<P extends { id: string; valor: number; angulo: number | null }>(pessoas: P[]): (P & { angulo: number })[] {
  const saida: (P & { angulo: number })[] = [];
  for (const faixa of FAIXAS) {
    const daFaixa = pessoas.filter((p) => faixaDoValor(p.valor)?.id === faixa.id).sort((a, b) => a.valor - b.valor || a.id.localeCompare(b.id));
    const vao = VAO_DO_NOME[faixa.id - 1]!;
    daFaixa.forEach((p, i) => {
      const lugar = i % 2 === 0 ? i / 2 : daFaixa.length - (i + 1) / 2;
      const automatico = -90 + vao / 2 + ((360 - vao) / daFaixa.length) * (lugar + 0.5);
      saida.push({ ...p, angulo: p.angulo ?? Math.round(automatico * 10) / 10 });
    });
  }
  return saida;
}
