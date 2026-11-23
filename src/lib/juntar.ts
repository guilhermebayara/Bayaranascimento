// Juntar cadastros duplicados (onda 2, decisão do Gui de 17/11/2026): a ficha que fica recebe, campo a
// campo, o que o administrador escolheu de cada uma das duas. Testado em testes/duplicados.test.ts.
import type { DadosDoIntegrante, Integrante } from './servidor/repositorio';

/** A chave do ajuste com os pares que um administrador disse que não são a mesma pessoa. */
export const AJUSTE_DOS_NAO_DUPLICADOS = 'nao-sao-duplicados';

/** Os campos que o administrador escolhe de uma ficha ou da outra. */
export const CAMPOS_DA_JUNCAO = ['nome', 'apelido', 'tipo', 'tratamento', 'nascimento', 'falecimento', 'sobre', 'retrato'] as const;

export function fichaJuntada(fica: Integrante, sai: Integrante, escolha: (campo: (typeof CAMPOS_DA_JUNCAO)[number]) => 'fica' | 'sai'): DadosDoIntegrante {
  const de = (c: (typeof CAMPOS_DA_JUNCAO)[number]) => (escolha(c) === 'sai' ? sai : fica);
  const n = de('nascimento');
  const f = de('falecimento');
  const t = de('tipo');
  return {
    nome: de('nome').nome,
    apelido: de('apelido').apelido ?? undefined,
    tipo: t.tipo,
    especie: t.especie ?? undefined,
    tratamento: de('tratamento').tratamento,
    nascimentoAno: n.nascimentoAno ?? undefined,
    nascimentoMes: n.nascimentoMes ?? undefined,
    nascimentoDia: n.nascimentoDia ?? undefined,
    falecimentoAno: f.falecimentoAno ?? undefined,
    falecimentoMes: f.falecimentoMes ?? undefined,
    falecimentoDia: f.falecimentoDia ?? undefined,
    falecido: fica.falecido || sai.falecido,
    sobre: de('sobre').sobre ?? undefined,
    retrato: de('retrato').retrato ?? null,
  };
}


/**
 * O recado de quando as duas fichas têm relato na mesma memória (decisão do Gui, 23/11/2026): os títulos que
 * quem olha vê e, se houver outras, "e memórias que você não vê", sem título nem número. Vazio sem conflito.
 */
export function recadoDosConflitos(conflitos: { titulos: string[]; outras: boolean }[]): string {
  const titulos = [...new Set(conflitos.flatMap((c) => c.titulos))].map((t) => `“${t}”`);
  const outras = conflitos.some((c) => c.outras);
  if (titulos.length === 0 && !outras) return '';
  const partes = [...titulos, ...(outras ? ['memórias que você não vê'] : [])];
  const lista = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`;
  return `As duas fichas têm relato em ${lista}. Cada pessoa tem um relato por memória: deixe um só antes de juntar.`;
}
