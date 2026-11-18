// Ex-casal: quem vê e como aparece para mim (decisões do Gui, 18/11/2026). Regras puras, testadas em
// testes/ex-casal.test.ts. Quem vê o laço é a visibilidade do casal (parentesco.ts, podeVerCasal). Como o
// ex aparece é de cada uma das duas pessoas do casal, só para ela, sem mudar o que os outros veem:
// - presente: como hoje;
// - discreto: na árvore, o cartão ganha uma tarja sobre o nome e não abre nada, mas o caminho até os
//   parentes dele continua; sai da página de quem escolheu e do círculo dela;
// - fora: sai também da árvore de quem escolheu.
// Nas memórias, quem é discreto ou fora continua em "Quem estava", só com o nome, sem retrato e sem link.
import { auge, comoOCasalAparece, estaoJuntos, faseAtual, type Casal, type ComoOCasalAparece, type Tratamento } from './parentesco';

export { comoOCasalAparece, apareceComoCasal, apareceComoCoracao, type ComoOCasalAparece } from './parentesco';

export type ModoDoEx = 'presente' | 'discreto' | 'fora';
export const MODOS_DO_EX: ModoDoEx[] = ['presente', 'discreto', 'fora'];

/** O casal acabou: a fase de hoje não é estar junto (separação ou amizade). */
export const casalDesfeito = (casal: Casal): boolean => casal.fases.length > 0 && !estaoJuntos(casal);

/** O ex que virou amigo: a fase de hoje do casal é amizade. */
export const viraramAmigos = (casal: Casal): boolean => faseAtual(casal)?.tipo === 'amizade';

/**
 * Ex de verdade: o casal acabou e não virou amizade. O ex que virou amigo se comporta como laço do
 * coração em todo o site (observação do Gui, 18/11/2026, o caso do Thiago): não é ex na página, na
 * árvore, no círculo nem nas escolhas de como o ex aparece.
 */
export const ehEx = (casal: Casal): boolean => casalDesfeito(casal) && !viraramAmigos(casal);

/**
 * Para a árvore (decisões do Gui, 18/11/2026; regra em comoOCasalAparece, em parentesco.ts): o casal que
 * é família (junto ou ex) fica nos casais; o namoro sem "já é da família" e o ex que virou amigo entram
 * como laço do coração, desenhados com a linha tracejada; o namoro que acabou sem nunca ter sido da
 * família não entra. A página do laço continua com a história toda.
 */
export function separarAmizades<C extends Casal>(casais: readonly C[]): { casais: C[]; amizades: { a: string; b: string; tipo: 'namoro' | 'amizade' }[] } {
  const comFases = casais.filter((c) => c.fases.length > 0);
  const como = (c: C) => comoOCasalAparece(c);
  return {
    casais: comFases.filter((c) => como(c) === 'casal' || como(c) === 'ex'),
    amizades: comFases
      .filter((c) => como(c) === 'namoro' || como(c) === 'amizade')
      .map((c) => ({ a: c.a, b: c.b, tipo: como(c) as 'namoro' | 'amizade' })),
  };
}

/**
 * O que a pessoa foi no casal, para quem virou amigo (pedido do Gui, 18/11/2026): na página, "amigo" e,
 * logo abaixo, só "ex-namorado", "ex-namorada" ou "ex-marido", pela fase mais adiantada e por como se
 * referir, sem datas.
 */
export function exDoAmigo(casal: Pick<Casal, 'fases'>, tratamento: Tratamento): string {
  const formas: Record<string, [string, string]> = {
    casamento: ['ex-esposa', 'ex-marido'],
    uniao: ['ex-companheira', 'ex-companheiro'],
    noivado: ['ex-noiva', 'ex-noivo'],
    namoro: ['ex-namorada', 'ex-namorado'],
  };
  const [ela, ele] = formas[auge(casal)] ?? formas.namoro;
  return tratamento === 'ela' ? ela : tratamento === 'ele' ? ele : `${ele} ou ${ela}`;
}

/** O rótulo do laço de casal que aparece como laço do coração, para quem não é do casal: "namorada de Giovanna". */
export function rotuloDoCasalDoCoracao(tipo: 'namoro' | 'amizade', tratamento: Tratamento, de: string): string {
  const [ela, ele] = tipo === 'namoro' ? ['namorada', 'namorado'] : ['amiga', 'amigo'];
  return `${tratamento === 'ela' ? ela : tratamento === 'ele' ? ele : `${ele} ou ${ela}`} de ${de}`;
}

/**
 * A situação do casal em uma ou duas palavras, para "Editar página e laços" e a página do laço. Quando um
 * dos dois já faleceu, no passado (QA de 18/11/2026: o laço do Vô Tonho dizia "Juntos"): "foram casados",
 * "viveram juntos", "namoraram", "foram amigos", "se separaram". `elas` é quando as duas são tratadas
 * como "ela".
 */
export function situacaoDoCasal(casal: Pick<Casal, 'fases' | 'jaDaFamilia'>, passado: { faleceu: boolean; elas?: boolean } = { faleceu: false }): string {
  const como: ComoOCasalAparece = comoOCasalAparece(casal);
  if (passado.faleceu) {
    if (como === 'amizade') return passado.elas ? 'foram amigas' : 'foram amigos';
    if (como === 'namoro' || como === 'namoro-que-acabou') return 'namoraram';
    if (como === 'casal') return auge(casal) === 'casamento' ? (passado.elas ? 'foram casadas' : 'foram casados') : 'viveram juntos';
    return 'se separaram';
  }
  if (como === 'amizade') return 'hoje, amigos';
  if (como === 'namoro') return 'namorando';
  if (como === 'casal') return 'juntos';
  if (como === 'namoro-que-acabou') return 'namoraram, não estão mais juntos';
  return 'não estão mais juntos';
}

/** Quem é ex desta pessoa, pelos casais desfeitos que ela vê. */
export function exesDe(pessoa: string, casais: readonly Casal[]): Set<string> {
  const ex = new Set<string>();
  for (const c of casais) {
    if (!ehEx(c)) continue;
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

/**
 * Em Pessoas e em "Quem estava" (decisão do Gui depois do QA de 18/11/2026): o discreto continua, com a
 * tarja "assunto encerrado" no lugar do nome, sem retrato e sem link; quem escolheu "Fora" quer que ele
 * suma, e ele sai das duas listas. O relato que ele contou continua na memória.
 */
export function naListaDeQuemOlha(modo: ModoDoEx | undefined): 'normal' | 'tarja' | 'fora' {
  return modo === 'discreto' ? 'tarja' : modo === 'fora' ? 'fora' : 'normal';
}

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
