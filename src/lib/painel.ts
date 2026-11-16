// Regras puras do painel pessoal (docs/decisoes.md, "Painel pessoal como página inicial").
import type { DataFlexivel } from './datas';

export interface Dia {
  ano: number;
  mes: number;
  dia: number;
}

/** O quão perto de hoje, em outros anos, a memória aconteceu. */
export type Proximidade = 'dia' | 'semana' | 'mes';

export const TITULO_DA_PROXIMIDADE: Record<Proximidade, string> = {
  dia: 'Neste dia, em outros anos',
  semana: 'Nesta semana, em outros anos',
  mes: 'Neste mês, em outros anos',
};

// O dia do ano num ano bissexto de referência, para 29 de fevereiro ter lugar
const diaDoAno = (mes: number, dia: number) => Math.round((Date.UTC(2000, mes - 1, dia) - Date.UTC(2000, 0, 1)) / 86400000);

function distancia(a: { mes: number; dia: number }, b: { mes: number; dia: number }): number {
  const d = Math.abs(diaDoAno(a.mes, a.dia) - diaDoAno(b.mes, b.dia));
  // 30 de dezembro e 2 de janeiro estão a três dias um do outro
  return Math.min(d, 366 - d);
}

/**
 * "Neste dia, em 1994" (ideia do Gui, 16/11/2026). Das memórias que a pessoa vê, as de outros anos
 * que aconteceram no mesmo dia e mês de hoje. Sem nenhuma, as da mesma semana (até três dias antes
 * ou depois). Sem nenhuma ainda, as do mesmo mês, e aí entram as que só têm mês e ano.
 * Data aproximada e memória deste ano ficam de fora. Devolve as mais recentes primeiro.
 */
export function emOutrosAnos<T extends DataFlexivel>(memorias: T[], hoje: Dia, maximo = 4): { proximidade: Proximidade; itens: T[] } | undefined {
  const candidatas = memorias.filter((m) => m.ano < hoje.ano && !m.aproximada && m.mes);
  const comDia = candidatas.filter((m) => m.dia);
  const niveis: [Proximidade, T[]][] = [
    ['dia', comDia.filter((m) => m.mes === hoje.mes && m.dia === hoje.dia)],
    ['semana', comDia.filter((m) => distancia({ mes: m.mes!, dia: m.dia! }, hoje) <= 3)],
    ['mes', candidatas.filter((m) => m.mes === hoje.mes)],
  ];
  for (const [proximidade, itens] of niveis) {
    if (itens.length) return { proximidade, itens: [...itens].sort((a, b) => b.ano - a.ano).slice(0, maximo) };
  }
  return undefined;
}
