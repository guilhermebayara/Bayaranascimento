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

interface Vida {
  nascimentoAno: number | null;
  nascimentoMes?: number | null;
  nascimentoDia?: number | null;
  falecimentoAno: number | null;
  falecimentoMes?: number | null;
  falecimentoDia?: number | null;
}

/** Anos de vida para listas e para a árvore: "1942 a 2019", "1994" ou vazio. */
export function anosDeVida(v: Vida): string {
  if (v.nascimentoAno && v.falecimentoAno) return `${v.nascimentoAno} a ${v.falecimentoAno}`;
  if (v.nascimentoAno) return String(v.nascimentoAno);
  if (v.falecimentoAno) return `até ${v.falecimentoAno}`;
  return '';
}

/** Nascimento e falecimento por extenso, com o que se souber de cada data. */
export function datasDeVida(v: Vida): string[] {
  const linhas: string[] = [];
  const data = (ano: number, mes?: number | null, dia?: number | null) => formatarData({ ano, mes: mes ?? null, dia: dia ?? null, aproximada: false });
  if (v.nascimentoAno) linhas.push(`Nascimento: ${data(v.nascimentoAno, v.nascimentoMes, v.nascimentoDia)}`);
  if (v.falecimentoAno) linhas.push(`Falecimento: ${data(v.falecimentoAno, v.falecimentoMes, v.falecimentoDia)}`);
  return linhas;
}

/** Momento gravado pelo banco (UTC, "2026-11-15 14:03:22") no horário de Brasília: "15 de novembro de 2026, 11:03". */
export function formatarMomento(texto: string): string {
  const data = new Date(`${texto.replace(' ', 'T')}Z`);
  if (Number.isNaN(data.getTime())) return texto;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(data).replace(' às ', ', ');
}

/** Quantos dias o mês tem. Sem o ano, fevereiro conta 29, para não recusar um 29 que pode existir. */
export function diasNoMes(mes: number, ano?: number): number {
  return new Date(Date.UTC(ano ?? 2000, mes, 0)).getUTCDate();
}

/**
 * O que está errado numa data enquanto a pessoa escolhe, para avisar na hora e não só ao salvar.
 * O ano fora do intervalo fica com a validação do próprio campo.
 */
export function problemaNaData(ano?: number, mes?: number, dia?: number): string | undefined {
  if (!dia) return undefined;
  if (!mes) return 'Para informar o dia, escolha também o mês.';
  const limite = diasNoMes(mes, ano);
  if (dia < 1 || dia > limite) {
    const nome = MESES[mes - 1];
    return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}${ano && mes === 2 ? ` de ${ano}` : ''} tem ${limite} dias.`;
  }
  return undefined;
}
