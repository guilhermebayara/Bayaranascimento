// Contraste e distância entre cores, sem tela: a conta da WCAG (luminância relativa e razão de
// contraste) e a distância no espaço OKLab, que acompanha o que o olho vê. Serve ao teste da paleta
// (testes/paleta.test.ts) e à página do sistema, que escreve a razão ao lado de cada cor.

type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb;
}
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** A luminância relativa de uma cor em hexadecimal, pela WCAG 2. */
export function luminancia(hex: string): number {
  const [r, g, b] = rgb(hex).map(linear) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A razão de contraste entre duas cores, pela WCAG 2: de 1 (iguais) a 21 (preto e branco). */
export function contraste(a: string, b: string): number {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (clara + 0.05) / (escura + 0.05);
}

function oklab(hex: string): Rgb {
  const [r, g, b] = rgb(hex).map(linear) as Rgb;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/** A distância entre duas cores no OKLab: 0 para a mesma cor, perto de 1 entre preto e branco. */
export function distancia(a: string, b: string): number {
  const [x, y] = [oklab(a), oklab(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

export const TONS = ['pastel', 'meio', 'vivo', 'tinta'] as const;
export type Tom = (typeof TONS)[number];

/** Os valores das cores escritos em tokens.css: "--verde-pastel: #cfe6c0" vira { verde: { pastel: '#cfe6c0' } }. */
export function coresDosTokens(css: string): Record<string, Record<Tom, string>> {
  const cores: Record<string, Record<string, string>> = {};
  for (const [, nome, tom, valor] of css.matchAll(/--([a-z]+)-(pastel|meio|vivo|tinta):\s*(#[0-9a-fA-F]{6})\s*;/g)) (cores[nome!] ??= {})[tom!] = valor!;
  return cores as Record<string, Record<Tom, string>>;
}

/** Um valor neutro de tokens.css, pelo nome ("creme", "tinta"). */
export function neutroDosTokens(css: string, nome: string): string {
  const achado = new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(css);
  if (!achado) throw new Error(`tokens.css não tem --${nome}`);
  return achado[1]!;
}
