// O histórico de pessoas e laços (onda 2, decisão do Gui de 17/11/2026): quem pode editar vê as versões,
// com quem mudou e quando, e restaura uma, como na memória. As versões já eram guardadas: a ficha a cada
// salvar, a filiação ao remover, o casal ao mudar e ao remover, e o laço do coração ao mudar e ao
// remover. Regras puras, testadas em testes/historico-da-pessoa.test.ts.
import { formatarData } from './datas';
import { podeVerCasal, podeVerLacoDoCoracao, type Casal, type Papel, type Qualidade } from './parentesco';

/** O que a ficha mostra para comparar uma versão com a seguinte. */
export interface FichaParaComparar {
  nome: string;
  'como é chamado': string;
  'pessoa ou bichinho': string;
  'que bichinho': string;
  'como se referir': string;
  nascimento: string;
  falecimento: string;
  sobre: string;
  'foto de retrato': string;
}

interface FichaGuardada {
  nome: string;
  apelido?: string | null;
  tipo?: 'pessoa' | 'bicho';
  especie?: string | null;
  tratamento?: 'ela' | 'ele' | null;
  nascimentoAno?: number | null;
  nascimentoMes?: number | null;
  nascimentoDia?: number | null;
  falecimentoAno?: number | null;
  falecimentoMes?: number | null;
  falecimentoDia?: number | null;
  falecido?: boolean;
  sobre?: string | null;
  retrato?: string | null;
}

const data = (ano?: number | null, mes?: number | null, dia?: number | null) => (ano ? formatarData({ ano, mes: mes ?? null, dia: dia ?? null, aproximada: false }) : '');

export function fichaParaComparar(f: FichaGuardada): FichaParaComparar {
  return {
    nome: f.nome,
    'como é chamado': f.apelido ?? '',
    'pessoa ou bichinho': f.tipo === 'bicho' ? 'bichinho' : 'pessoa',
    'que bichinho': f.tipo === 'bicho' ? (f.especie ?? '') : '',
    'como se referir': f.tratamento ?? 'não informar',
    nascimento: data(f.nascimentoAno, f.nascimentoMes, f.nascimentoDia),
    falecimento: data(f.falecimentoAno, f.falecimentoMes, f.falecimentoDia) || (f.falecido ? 'já faleceu, sem data' : ''),
    sobre: f.sobre ?? '',
    // A foto não aparece no histórico: só que ela mudou
    'foto de retrato': f.retrato ? `uma foto (${f.retrato.slice(0, 8)})` : 'sem foto',
  };
}

/** Os campos que mudaram entre uma versão e a seguinte (ou o que está hoje). */
export function oQueMudou(antes: FichaParaComparar, depois: FichaParaComparar): (keyof FichaParaComparar)[] {
  return (Object.keys(antes) as (keyof FichaParaComparar)[]).filter((campo) => antes[campo] !== depois[campo]);
}

/** Uma versão de laço, como fica guardada em versoes.dados. */
export type VersaoDeLaco =
  | { tipo: 'filiacao'; dados: { filho: string; responsavel: string; qualidade: Qualidade; adocao_ano?: number | null; adocao_mes?: number | null; adocao_dia?: number | null } }
  | { tipo: 'casal'; dados: Casal }
  | { tipo: 'laco-coracao'; dados: { dono: string; pessoa: string; nome: string; papel: Papel | null; proximidade?: number | null; privado: number | boolean } };

/** As duas pessoas de um laço guardado. */
export function pessoasDoLaco(v: VersaoDeLaco): [string, string] {
  if (v.tipo === 'filiacao') return [v.dados.filho, v.dados.responsavel];
  if (v.tipo === 'casal') return [v.dados.a, v.dados.b];
  return [v.dados.dono, v.dados.pessoa];
}

/**
 * Quem vê uma versão de laço: com as mesmas regras do laço de hoje. Um casal restrito (só os dois, ou
 * famílias escolhidas) só aparece para quem veria o casal; um laço do coração "só eu vejo", só para o
 * dono; e nada de quem a pessoa não vê (quem só existe num laço privado de outra pessoa).
 */
export function veAVersaoDoLaco(v: VersaoDeLaco, quem: { pessoa: string; nucleos: readonly string[] }, naoVe: ReadonlySet<string>): boolean {
  if (pessoasDoLaco(v).some((id) => naoVe.has(id))) return false;
  if (v.tipo === 'casal') return podeVerCasal(quem.pessoa, v.dados, quem.nucleos);
  if (v.tipo === 'laco-coracao') return podeVerLacoDoCoracao(quem.pessoa, { dono: v.dados.dono, privado: Boolean(v.dados.privado) });
  return true;
}

/**
 * A versão de um laço do coração como pode ser mostrada: a proximidade é só do dono, e sai para os
 * outros (o administrador que muda o laço de outra pessoa vê o nome e o lugar na árvore).
 */
export function semOQueEDoDono<T extends VersaoDeLaco>(v: T, quem: string): T {
  if (v.tipo !== 'laco-coracao' || v.dados.dono === quem) return v;
  return { ...v, dados: { ...v.dados, proximidade: null } };
}
