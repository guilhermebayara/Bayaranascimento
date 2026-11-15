// Datas flexíveis das memórias: só ano, mês e ano, data completa, ou aproximada.

export interface DataFlexivel {
  ano: number;
  mes: number | null;
  dia: number | null;
  aproximada: boolean;
}

export const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** "12 de março de 1994", "março de 1994", "1994" ou "por volta de 1994". */
export function formatarData(d: DataFlexivel): string {
  let texto = String(d.ano);
  if (d.mes) texto = `${MESES[d.mes - 1]} de ${d.ano}`;
  if (d.mes && d.dia) texto = `${d.dia} de ${texto}`;
  return d.aproximada ? `por volta de ${texto}` : texto;
}

/** Parte da data sem o ano, para usar ao lado do ano grande na linha do tempo. */
export function formatarDiaMes(d: DataFlexivel): string {
  if (!d.mes) return d.aproximada ? 'data aproximada' : '';
  const texto = d.dia ? `${d.dia} de ${MESES[d.mes - 1]}` : MESES[d.mes - 1];
  return d.aproximada ? `por volta de ${texto}` : texto;
}

export function agruparPorAno<T extends { ano: number }>(itens: T[]): { ano: number; itens: T[] }[] {
  const grupos = new Map<number, T[]>();
  for (const item of itens) {
    const lista = grupos.get(item.ano) ?? [];
    lista.push(item);
    grupos.set(item.ano, lista);
  }
  return [...grupos.entries()].map(([ano, lista]) => ({ ano, itens: lista }));
}
