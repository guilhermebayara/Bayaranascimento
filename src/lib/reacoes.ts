// Reações (onda 2, decisão do Gui de 17/11/2026; refeitas no padrão das redes em 18/11/2026): na memória,
// em cada relato e em cada foto, quatro símbolos desenhados com os rabiscos do site, nunca emoji do
// aparelho. Um toque marca o coração, no lugar, sem recarregar; segurar (ou passar o mouse) abre os
// quatro, cada um com o nome. Ao lado, as reações recebidas com o número; tocar no número mostra quem
// marcou, só quem a pessoa vê. "Eu estava lá" numa memória em que a pessoa não está marcada oferece
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
}

/**
 * O riso (versão final, 18/11/2026): uma carinha de olhos em arco e boca bem aberta, no mesmo traço dos
 * rabiscos, que se lê como riso a 20 px ao lado dos outros. As variações que não ficaram estão em
 * docs/visual/sessao-j/icones-e-cores/. Os outros três vêm de src/visual/rabiscos.ts: o coração, a flor
 * (saudade) e a câmera ("eu estava lá").
 */
const RISO = '<circle cx="12" cy="12" r="8.4"/><path d="M7.2 10.6c.6-1.6 2.4-1.6 3 0M13.8 10.6c.6-1.6 2.4-1.6 3 0"/><path d="M7 13.2h10c-.3 3-2.3 5-5 5s-4.7-2-5-5z"/>';

export const SIMBOLOS_DAS_REACOES: Simbolo[] = [
  { id: 'coracao', nome: 'Coração', desenho: rabisco('coracao').desenho },
  { id: 'riso', nome: 'Riso', desenho: RISO },
  { id: 'saudade', nome: 'Saudade', desenho: rabisco('despedida').desenho },
  { id: 'estava', nome: 'Eu estava lá', desenho: rabisco('camera').desenho },
];

export const ehSimbolo = (valor: string): valor is SimboloDaReacao => (SIMBOLOS as readonly string[]).includes(valor);

export const ALVOS = ['memoria', 'relato', 'foto'] as const;
export type AlvoDaReacao = (typeof ALVOS)[number];
export const ehAlvo = (valor: string): valor is AlvoDaReacao => (ALVOS as readonly string[]).includes(valor);

/** O resumo das reações de um item, o mesmo para a página e para a resposta da rota, que redesenha no lugar. */
export interface ResumoDasReacoes {
  /** quantas marcas ao todo (uma pessoa pode marcar mais de um símbolo) */
  total: number;
  /** os símbolos que a pessoa marcou */
  minhas: SimboloDaReacao[];
  /** os símbolos recebidos, na ordem dos símbolos, com os nomes de quem marcou ("você" para quem olha) */
  recebidas: { simbolo: SimboloDaReacao; nome: string; conta: number; quem: string }[];
}

export function resumoDasReacoes(marcas: ReadonlyMap<SimboloDaReacao, readonly string[]> | undefined, eu: string, nome: (id: string) => string): ResumoDasReacoes {
  const recebidas = SIMBOLOS_DAS_REACOES.filter((s) => (marcas?.get(s.id) ?? []).length > 0).map((s) => {
    const quem = marcas!.get(s.id)!;
    // Quem olha vem primeiro, como "você"
    const ordem = [...quem.filter((id) => id === eu), ...quem.filter((id) => id !== eu)];
    return { simbolo: s.id, nome: s.nome, conta: quem.length, quem: nomesDeQuemMarcou(ordem.map((id) => (id === eu ? 'você' : nome(id))), 12) };
  });
  return {
    total: recebidas.reduce((n, r) => n + r.conta, 0),
    minhas: SIMBOLOS.filter((s) => (marcas?.get(s) ?? []).includes(eu)),
    recebidas,
  };
}

/** "Gui e Elizete", "Gui, Elizete e mais 3" */
export function nomesDeQuemMarcou(nomes: string[], maximo = 4): string {
  if (nomes.length <= maximo) return nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : (nomes[0] ?? '');
  return `${nomes.slice(0, maximo).join(', ')} e mais ${nomes.length - maximo}`;
}

/** Oferecer "Quer entrar em Quem estava?": marcou "eu estava lá" e não está marcada na memória. */
export const ofereceEntrar = (disseQueEstava: boolean, estaNaMemoria: boolean): boolean => disseQueEstava && !estaNaMemoria;
