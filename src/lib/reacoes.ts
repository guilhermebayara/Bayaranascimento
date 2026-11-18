// Reações (onda 2, decisão do Gui de 17/11/2026): em relato e em foto, quatro símbolos desenhados com os
// rabiscos do site, nunca emoji do aparelho. Tocar num símbolo marca ou desmarca o seu; "Quem marcou" mostra
// os nomes, só de quem a pessoa vê. "Eu estava lá" numa memória em que a pessoa não está marcada oferece
// "Quer entrar em Quem estava?", com um toque. Testado em testes/reacoes.test.ts.
import { rabisco } from '../visual/rabiscos';

export const SIMBOLOS = ['coracao', 'riso', 'saudade', 'estava'] as const;
export type SimboloDaReacao = (typeof SIMBOLOS)[number];

export interface Simbolo {
  id: SimboloDaReacao;
  /** o nome dito ao leitor de tela e em "Quem marcou" */
  nome: string;
  /** o miolo do SVG, na caixa de 24 por 24 dos rabiscos */
  desenho: string;
  /** desenho feito para as reações, à espera do acabamento visual */
  provisorio: boolean;
}

/**
 * O riso não tinha rabisco: este é provisório, no mesmo traço dos outros (uma carinha de olhos fechados
 * e boca aberta). Os outros três vêm de src/visual/rabiscos.ts: o coração, a flor (saudade) e a câmera
 * ("eu estava lá").
 */
const RISO = '<circle cx="12" cy="12" r="8.2"/><path d="M8 10.2c.6-.8 1.4-.8 2 0M14 10.2c.6-.8 1.4-.8 2 0"/><path d="M7.8 13.4c.9 2.4 2.4 3.6 4.2 3.6s3.3-1.2 4.2-3.6z"/>';

export const SIMBOLOS_DAS_REACOES: Simbolo[] = [
  { id: 'coracao', nome: 'Coração', desenho: rabisco('coracao').desenho, provisorio: false },
  { id: 'riso', nome: 'Riso', desenho: RISO, provisorio: true },
  { id: 'saudade', nome: 'Saudade', desenho: rabisco('despedida').desenho, provisorio: false },
  { id: 'estava', nome: 'Eu estava lá', desenho: rabisco('camera').desenho, provisorio: false },
];

export const ehSimbolo = (valor: string): valor is SimboloDaReacao => (SIMBOLOS as readonly string[]).includes(valor);

/** "Gui e Elizete", "Gui, Elizete e mais 3" */
export function nomesDeQuemMarcou(nomes: string[], maximo = 4): string {
  if (nomes.length <= maximo) return nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : (nomes[0] ?? '');
  return `${nomes.slice(0, maximo).join(', ')} e mais ${nomes.length - maximo}`;
}

/** Oferecer "Quer entrar em Quem estava?": marcou "eu estava lá" e não está marcada na memória. */
export const ofereceEntrar = (disseQueEstava: boolean, estaNaMemoria: boolean): boolean => disseQueEstava && !estaNaMemoria;
