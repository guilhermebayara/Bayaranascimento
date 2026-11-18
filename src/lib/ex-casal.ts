// Ex-casal: quem vê e como aparece para mim (decisões do Gui, 18/11/2026). Regras puras, testadas em
// testes/ex-casal.test.ts. Quem vê o laço é a visibilidade do casal (parentesco.ts, podeVerCasal). Como o
// ex aparece é de cada uma das duas pessoas do casal, só para ela, sem mudar o que os outros veem:
// - presente: como hoje;
// - discreto: na árvore, o cartão ganha uma tarja sobre o nome e não abre nada, mas o caminho até os
//   parentes dele continua; sai da página de quem escolheu e do círculo dela;
// - fora: sai também da árvore de quem escolheu.
// Nas memórias, quem é discreto ou fora continua em "Quem estava", só com o nome, sem retrato e sem link.
import { estaoJuntos, faseAtual, type Casal } from './parentesco';

export type ModoDoEx = 'presente' | 'discreto' | 'fora';
export const MODOS_DO_EX: ModoDoEx[] = ['presente', 'discreto', 'fora'];

/** O casal acabou: a fase de hoje não é estar junto (separação ou amizade). */
export const casalDesfeito = (casal: Casal): boolean => casal.fases.length > 0 && !estaoJuntos(casal);

/** O ex que virou amigo: a fase de hoje do casal é amizade. */
export const viraramAmigos = (casal: Casal): boolean => faseAtual(casal)?.tipo === 'amizade';

/**
 * Para a árvore (observação do Gui, 18/11/2026): o casal que virou amizade sai dos casais e entra como
 * amizade, desenhada com a linha tracejada do coração. A página do laço continua com a história toda.
 */
export function separarAmizades<C extends Casal>(casais: readonly C[]): { casais: C[]; amizades: { a: string; b: string }[] } {
  const comFases = casais.filter((c) => c.fases.length > 0);
  return {
    casais: comFases.filter((c) => !viraramAmigos(c)),
    amizades: comFases.filter(viraramAmigos).map((c) => ({ a: c.a, b: c.b })),
  };
}

/** Quem é ex desta pessoa, pelos casais desfeitos que ela vê. */
export function exesDe(pessoa: string, casais: readonly Casal[]): Set<string> {
  const ex = new Set<string>();
  for (const c of casais) {
    if (!casalDesfeito(c)) continue;
    if (c.a === pessoa) ex.add(c.b);
    if (c.b === pessoa) ex.add(c.a);
  }
  // Quem continua junto num outro registro do mesmo par não é ex
  for (const c of casais) if (!casalDesfeito(c) && c.fases.length > 0 && (c.a === pessoa || c.b === pessoa)) ex.delete(c.a === pessoa ? c.b : c.a);
  return ex;
}

/**
 * Os modos guardados que ainda valem: só de quem continua ex de quem escolheu. Um casal que voltou, ou
 * que deixou de existir, faz a escolha perder o efeito sem apagá-la.
 */
export function modosQueValem(guardados: ReadonlyMap<string, ModoDoEx>, exes: ReadonlySet<string>): Map<string, Exclude<ModoDoEx, 'presente'>> {
  const valem = new Map<string, Exclude<ModoDoEx, 'presente'>>();
  for (const [pessoa, modo] of guardados) if (exes.has(pessoa) && modo !== 'presente') valem.set(pessoa, modo);
  return valem;
}

/**
 * Ex "Fora" que é pai ou mãe de alguém que quem escolheu vê vale como "Discreto" (resposta do Gui à
 * sessão F, 18/11/2026): a tarja fica, e o caminho até o filho e a família dele continua na árvore.
 * Conta qualquer filiação em que o ex é o responsável, e o filho precisa ser alguém que a pessoa vê.
 */
export function foraQueEPaiViraDiscreto(
  modos: ReadonlyMap<string, Exclude<ModoDoEx, 'presente'>>,
  filiacoes: readonly { filho: string; responsavel: string }[],
  ve: (id: string) => boolean,
): Map<string, Exclude<ModoDoEx, 'presente'>> {
  const valem = new Map(modos);
  for (const [pessoa, modo] of modos) {
    if (modo === 'fora' && filiacoes.some((f) => f.responsavel === pessoa && ve(f.filho))) valem.set(pessoa, 'discreto');
  }
  return valem;
}

/** Sai da página e do círculo de quem escolheu: discreto ou fora. */
export const saiDaMinhaPagina = (modo: ModoDoEx | undefined): boolean => modo === 'discreto' || modo === 'fora';

/** Em "Quem estava": só o nome, sem retrato e sem link. */
export const soONomeNaMemoria = saiDaMinhaPagina;

/** As opções do formulário, com o que cada uma faz, ditas para quem escolhe. */
export function opcoesDoModo(nome: string): { valor: ModoDoEx; rotulo: string; dica: string }[] {
  return [
    { valor: 'presente', rotulo: 'Presente', dica: `${nome} aparece para você como para todo mundo.` },
    { valor: 'discreto', rotulo: 'Discreto', dica: `Na sua árvore, ${nome} fica com uma tarja sobre o nome, sem abrir nada, e o caminho até os parentes continua. Sai da sua página e do seu círculo.` },
    { valor: 'fora', rotulo: 'Fora', dica: `${nome} sai também da sua árvore. Quem só se liga por essa pessoa vem por outro caminho ou não aparece para você. Se ${nome} é pai ou mãe de alguém que você vê, fica como Discreto, para o caminho até o filho continuar.` },
  ];
}

/** As opções de quem vê um casal desfeito. */
export function opcoesDeQuemVe(): { valor: Casal['visibilidade']; rotulo: string; dica: string }[] {
  return [
    { valor: 'todos', rotulo: 'Todos', dica: 'Todo mundo que entra no acervo vê este laço na árvore e nas páginas.' },
    { valor: 'nucleos', rotulo: 'Famílias escolhidas', dica: 'Só quem é das famílias marcadas abaixo vê o laço. As duas pessoas continuam no acervo e nas memórias.' },
    { valor: 'privado', rotulo: 'Só os dois', dica: 'Só vocês dois veem o laço. Quando um dos dois é pai ou mãe de alguém, continua aparecendo pela filiação.' },
  ];
}
