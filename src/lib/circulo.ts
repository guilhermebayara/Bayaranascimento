// O círculo (docs/regras/circulo.md, "Círculo"): a pessoa no centro e três faixas, Muito próximo, Próximo e
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
// "A" é o ex que virou amigo: vale como laço do coração sem proximidade (observação do Gui, 18/11/2026)
const PROXIMO = new Set(['UU', 'DD', 'UUD', 'UDD', 'UDC', 'CUD', 'A']);

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

// --- O slider: do mais distante ao mais próximo ------------------------------------------------
// Em todo lugar (decisão do Gui, 18/11/2026), o slider começa em "Fora do círculo" (ou em "Conhecido",
// onde fora do círculo não é opção) à esquerda e termina em "Muito próximo" à direita, como se
// aumentasse a proximidade: a seta para a direita e para cima aproxima. O banco continua guardando o
// valor de sempre (0 colado no centro, 100 fora); a posição do slider é o contrário dele.

/** A posição do slider (0 à esquerda, 100 à direita) para um valor guardado. */
export const posicaoDoSlider = (valor: number): number => FORA_DO_CIRCULO - Math.min(Math.max(Math.round(valor), 0), FORA_DO_CIRCULO);

/** O valor guardado para uma posição do slider. */
export const valorDaPosicao = (posicao: number): number => FORA_DO_CIRCULO - Math.min(Math.max(Math.round(posicao), 0), FORA_DO_CIRCULO);

/** A menor posição do slider: 0 é "Fora do círculo"; sem essa opção, começa em Conhecido. */
export const posicaoMinima = (comFora: boolean): number => (comFora ? 0 : 1);

/** As pontas do slider, da esquerda para a direita. */
export const pontasDoSlider = (comFora: boolean): [string, string] => [comFora ? 'Fora do círculo' : FAIXAS[2]!.nome, FAIXAS[0]!.nome];

/**
 * "Fora do círculo" tem um trecho só dele, à esquerda da régua (acabamento, proposta A, escolha do Gui de
 * 18/11/2026): no slider, as posições abaixo de 1 são todas fora, e o botão assenta no meio do trecho.
 * O que se guarda não muda: fora continua sendo a posição 0.
 */
export const TRECHO_DE_FORA = 13;

/** O menor valor do slider: o começo do trecho de fora, ou Conhecido onde fora não é opção. */
export const minimoDoSlider = (comFora: boolean): number => (comFora ? -TRECHO_DE_FORA : 1);

/** Onde o botão do slider fica para um valor guardado: o meio do trecho de fora, ou a posição. */
export function lugarNoSlider(valor: number, comFora: boolean): number {
  const posicao = posicaoDoSlider(valor);
  if (posicao >= 1) return posicao;
  return comFora ? -Math.floor(TRECHO_DE_FORA / 2) : 1;
}

/** A posição (de 0 a 100) de um lugar do slider: o trecho de fora inteiro é a posição 0. */
export const posicaoDoLugar = (lugar: number): number => Math.min(Math.max(Math.round(lugar), 0), FORA_DO_CIRCULO);

/** Um lugar do slider em porcentagem da barra, para o desenho. */
export const porcentagemNoSlider = (lugar: number, comFora: boolean): number => {
  const minimo = minimoDoSlider(comFora);
  return Math.round(((lugar - minimo) / (FORA_DO_CIRCULO - minimo)) * 1000) / 10;
};

/**
 * As faixas do slider, da esquerda para a direita, com o nome curto que vai embaixo de cada trecho e onde
 * cada uma acaba (a marca de troca), em porcentagem da barra. O slider é livre: as marcas só dizem onde a
 * faixa muda.
 */
export function faixasDoSlider(comFora: boolean): { nome: string; curto: string; largura: number; ate: number }[] {
  const minimo = minimoDoSlider(comFora);
  // Entre uma posição e a seguinte: fora | conhecido | próximo | muito próximo
  const cortes = [...(comFora ? [0.5] : []), FORA_DO_CIRCULO - FAIXAS[2]!.de + 0.5, FORA_DO_CIRCULO - FAIXAS[1]!.de + 0.5, FORA_DO_CIRCULO];
  const nomes = [...(comFora ? [{ nome: 'Fora do círculo', curto: 'Fora' }] : []), ...[...FAIXAS].reverse().map((f) => ({ nome: f.nome, curto: f.nome }))];
  return nomes.map((n, i) => ({ ...n, largura: Math.round((cortes[i]! - (i === 0 ? minimo : cortes[i - 1]!)) * 10) / 10, ate: porcentagemNoSlider(cortes[i]!, comFora) }));
}

/** Lê o que o slider mandou: um inteiro do começo do trecho de fora a 100, já como posição (fora é 0). */
export function lerPosicao(bruto: unknown): number | null {
  const n = typeof bruto === 'number' ? bruto : typeof bruto === 'string' && /^-?\d{1,3}$/.test(bruto.trim()) ? Number(bruto) : Number.NaN;
  return Number.isInteger(n) && n >= -TRECHO_DE_FORA && n <= FORA_DO_CIRCULO ? posicaoDoLugar(n) : null;
}

/**
 * O que um formulário com o slider pede: a posição de agora e a de quando a página abriu. Sem mexer no
 * slider, nada muda (o slider sempre tem um valor, e "não dizer" é não mexer). Mexido, devolve o valor
 * guardado; fora do círculo só vale onde é opção.
 */
export function proximidadeDoFormulario(posicao: unknown, antes: unknown, comFora = true): { mexeu: false } | { mexeu: true; valor: number } | { erro: string } {
  if (posicao === null || posicao === undefined || posicao === '') return { mexeu: false };
  const p = lerPosicao(posicao);
  if (p === null || p < posicaoMinima(comFora)) return { erro: `A proximidade vai de ${pontasDoSlider(comFora).join(' a ')}.` };
  const a = lerPosicao(antes);
  if (a !== null && a === p) return { mexeu: false };
  return { mexeu: true, valor: valorDaPosicao(p) };
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
