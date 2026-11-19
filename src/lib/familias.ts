// Sugestão de família no cadastro (decisão do Gui, 15/11/2026). Quem entra no acervo por um laço de árvore
// com alguém da família já sai marcado como parente dela, e quem cadastrou confirma ou troca na página.
// Função pura: vale igual no servidor e nos testes.

import { corDaPessoa } from './visual';

/** Quem acessa o site em 15/11/2026: os membros dos núcleos. O resto da família virou parente (migração 013). */
export const NUCLEO_INICIAL = ['gui', 'giovanna', 'lucas-magno', 'elizete', 'ana-candida', 'lucio', 'regina'];

export interface DadosDasFamilias {
  /** núcleos de cada pessoa, como membro ou como parente */
  familias: Map<string, string[]>;
  casais: { a: string; b: string }[];
  filiacoes: { filho: string; responsavel: string }[];
}

export type LacoNovo =
  /** a pessoa nova é filha de `com` */
  | { tipo: 'filho-de'; com: string }
  /** a pessoa nova é pai ou mãe de `com` */
  | { tipo: 'pai-de'; com: string }
  | { tipo: 'casal'; com: string };

const de = (dados: Pick<DadosDasFamilias, 'familias'>, id: string) => dados.familias.get(id) ?? [];
const conjuges = (dados: Pick<DadosDasFamilias, 'casais'>, id: string) => dados.casais.flatMap((c) => (c.a === id ? [c.b] : c.b === id ? [c.a] : []));

/**
 * A família de onde a pessoa veio: as famílias dela menos as que ela formou com quem casou.
 * A Giovanna é Bayara e Bayara Bracarense; o Bayara Bracarense ela divide com o Magno, então ela veio do Bayara.
 * Quando não sobra nada (a Elizete e o Aguilar são os dois do Bayara), valem todas.
 */
export function familiaDeOrigem(dados: Pick<DadosDasFamilias, 'familias' | 'casais'>, id: string): string[] {
  const dosConjuges = new Set(conjuges(dados, id).flatMap((c) => de(dados, c)));
  const origem = de(dados, id).filter((n) => !dosConjuges.has(n));
  return origem.length ? origem : de(dados, id);
}

/**
 * A família que a pessoa formou com quem casou, quando há: a Giovanna e o Magno formaram o Bayara
 * Bracarense. Quem não formou outra (o Gui, a Elizete, o Aguilar) não tem. Com mais de uma, a mais recente.
 */
export function familiaFormada(dados: Pick<DadosDasFamilias, 'familias' | 'casais'>, id: string): string | undefined {
  const origem = new Set(familiaDeOrigem(dados, id));
  return de(dados, id).filter((n) => !origem.has(n)).at(-1);
}

/**
 * A família que vale como a da pessoa hoje: a mais recente, que ela formou com quem casou. A Giovanna e o
 * Magno veem a cor do Bayara Bracarense, que criaram juntos (decisão do Gui, 16/11/2026). Quem não formou
 * outra fica com a de origem: o Gui e a Elizete, com o Bayara.
 */
export function familiaMaisRecente(dados: DadosDasFamilias, id: string): string | undefined {
  return familiaFormada(dados, id) ?? de(dados, id)[0];
}

/**
 * A cor de cada pessoa, onde ela leva uma cor só (o fundo do retrato, as iniciais, a abertura da página):
 * a do núcleo que ela formou, quando há, e senão a da primeira família dela na ordem das famílias
 * (pedido do Gui, 18/11/2026: a Giovanna é Bayara Bracarense, e não Bayara). O cartão da árvore não usa
 * esta cor: leva as duas, na diagonal. Os casais são os que quem olha vê.
 */
export function coresDasPessoas(
  pessoas: { id: string; nucleos: string[]; parenteDe: string[] }[],
  casais: { a: string; b: string }[],
  ordemDosNucleos: string[],
): (id: string) => string {
  const familias = new Map(pessoas.map((p) => [p.id, [...p.nucleos, ...p.parenteDe]]));
  const dados = { familias, casais };
  const cores = new Map<string, string>();
  return (id) => {
    let cor = cores.get(id);
    if (!cor) {
      cor = corDaPessoa(familias.get(id) ?? [], ordemDosNucleos, familiaFormada(dados, id));
      cores.set(id, cor);
    }
    return cor;
  };
}

/** O que dois pais dividem: o filho da Giovanna com o Magno é do Bayara Bracarense, o núcleo que os dois criaram. */
function emComum(dados: DadosDasFamilias, a: string, b: string): string[] {
  const deB = new Set(de(dados, b));
  return de(dados, a).filter((n) => deB.has(n));
}

/**
 * As famílias sugeridas para quem ainda não tem nenhuma e acaba de ganhar um laço de árvore.
 * - Filho: se os pais dividem um núcleo, esse; se não, a família de origem de cada um. Com um pai só
 *   cadastrado, vale o que ele divide com quem está casado, porque o outro pai costuma vir em seguida.
 * - Pai ou mãe, e casal: a família de origem da pessoa a quem se liga.
 */
export function sugerirFamilias(dados: DadosDasFamilias, novo: string, laco: LacoNovo): string[] {
  if (laco.tipo === 'filho-de') {
    const pais = [...new Set([laco.com, ...dados.filiacoes.filter((f) => f.filho === novo).map((f) => f.responsavel)])];
    if (pais.length >= 2) {
      const comum = emComum(dados, pais[0], pais[1]);
      return comum.length ? comum : [...new Set(pais.flatMap((p) => familiaDeOrigem(dados, p)))];
    }
    for (const conjuge of conjuges(dados, laco.com)) {
      const comum = emComum(dados, laco.com, conjuge);
      if (comum.length) return comum;
    }
    return familiaDeOrigem(dados, laco.com);
  }
  return familiaDeOrigem(dados, laco.com);
}
