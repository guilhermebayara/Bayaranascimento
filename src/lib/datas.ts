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

/**
 * O ano de um rascunho salvo antes de a data ser informada (resposta do Gui à P132 do QA de design,
 * 17/11/2026): o rascunho pode ser salvo só com o título, e o ano só é obrigatório para publicar.
 * A coluna do banco não aceita vazio, então o rascunho sem data guarda 0. Memória publicada nunca
 * tem este valor: a publicação exige o ano entre 1800 e o ano atual.
 */
export const SEM_ANO = 0;
/** O que o site escreve no lugar da data de um rascunho que ainda não tem ano. */
export const SEM_DATA = 'sem data';

/** "12 de março de 1994", "março de 1994", "1994" ou "por volta de 1994". Rascunho sem ano: "sem data". */
export function formatarData(d: DataFlexivel): string {
  if (!d.ano) return SEM_DATA;
  let texto = String(d.ano);
  if (d.mes) texto = `${MESES[d.mes - 1]} de ${d.ano}`;
  if (d.mes && d.dia) texto = `${d.dia} de ${texto}`;
  return d.aproximada ? `por volta de ${texto}` : texto;
}

/**
 * A data dentro da frase "Isso aconteceu ___" da Nova memória (docs/visual.md, "A data no formulário em
 * frase"): como o site já escreve, com a preposição que a frase pede. "em 24 de dezembro de 2025",
 * "em dezembro de 2025", "em 2025", "por volta de 1994". Sem ano, a pergunta que a lacuna faz.
 */
export function dataNaFrase(d: { ano?: number; mes?: number; dia?: number; aproximada?: boolean }): string {
  if (!d.ano) return 'em que data?';
  const texto = formatarData({ ano: d.ano, mes: d.mes, dia: d.mes ? d.dia : undefined, aproximada: d.aproximada });
  return d.aproximada ? texto : `em ${texto}`;
}

/** Parte da data sem o ano, para usar ao lado do ano grande na linha do tempo. */
export function formatarDiaMes(d: DataFlexivel): string {
  if (!d.mes) return d.aproximada ? 'data aproximada' : '';
  const texto = d.dia ? `${d.dia} de ${MESES[d.mes - 1]}` : MESES[d.mes - 1];
  return d.aproximada ? `por volta de ${texto}` : texto;
}

/**
 * A linha do tempo mostra as memórias mais recentes primeiro, e rolar leva ao passado (decisão do Gui,
 * 16/11/2026). Recebe a lista em ordem de data, da mais antiga para a mais nova, e devolve ao contrário.
 */
export function maisRecentesPrimeiro<T>(itens: T[]): T[] {
  return [...itens].reverse();
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
  /** já faleceu, mesmo sem data conhecida */
  falecido?: boolean;
}

/** Já faleceu: está marcado assim, ou tem data de falecimento. */
export const jaFaleceu = (v: Pick<Vida, 'falecido' | 'falecimentoAno'>): boolean => Boolean(v.falecido || v.falecimentoAno);

/**
 * O ano de nascimento, para listas e para a árvore: "1994" ou vazio. A data do falecimento, e o ano
 * também, ficam ocultos em todo lugar (decisão do Gui, 17/11/2026): só aparecem na página da pessoa,
 * para quem pedir em "Mostrar datas".
 */
export function anosDeVida(v: Vida): string {
  return v.nascimentoAno ? String(v.nascimentoAno) : '';
}

/** Nascimento e falecimento por extenso, com o que se souber de cada data. */
export function datasDeVida(v: Vida): string[] {
  const linhas: string[] = [];
  const data = (ano: number, mes?: number | null, dia?: number | null) => formatarData({ ano, mes: mes ?? null, dia: dia ?? null, aproximada: false });
  if (v.nascimentoAno) linhas.push(`Nascimento: ${data(v.nascimentoAno, v.nascimentoMes, v.nascimentoDia)}`);
  if (v.falecimentoAno) linhas.push(`Falecimento: ${data(v.falecimentoAno, v.falecimentoMes, v.falecimentoDia)}`);
  else if (v.falecido) linhas.push('Falecimento: data desconhecida');
  return linhas;
}

/**
 * Nascimento e falecimento sem rótulo, para o carimbo da página da pessoa (resposta do Gui ao QA de
 * design, 17/11/2026, P108): "1999", "4 de maio de 1942", "1942 a 2019", "1930 a ?" ou vazio.
 * Cada data entra com o que se souber dela.
 *
 * O falecimento só entra com `comFalecimento`, que a página liga quando a pessoa pede em "Mostrar
 * datas" (decisão do Gui, 17/11/2026). Sem isso, só o nascimento.
 */
export function vidaSemRotulo(v: Vida, comFalecimento = false): string {
  const data = (ano: number, mes?: number | null, dia?: number | null) => formatarData({ ano, mes: mes ?? null, dia: dia ?? null, aproximada: false });
  const nascimento = v.nascimentoAno ? data(v.nascimentoAno, v.nascimentoMes, v.nascimentoDia) : '';
  if (!comFalecimento) return nascimento;
  const falecimento = v.falecimentoAno ? data(v.falecimentoAno, v.falecimentoMes, v.falecimentoDia) : v.falecido ? '?' : '';
  if (nascimento && falecimento) return `${nascimento} a ${falecimento}`;
  if (falecimento && falecimento !== '?') return `até ${falecimento}`;
  return nascimento;
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
 * O ano fora do intervalo do campo, para avisar ao lado, como a data que não existe (resposta do Gui
 * à P143 do QA de design, 17/11/2026). O texto foi aprovado por ele.
 */
export function problemaNoAno(ano: number | undefined, minimo: number, maximo: number): string | undefined {
  if (ano === undefined || Number.isNaN(ano)) return undefined;
  return Number.isInteger(ano) && ano >= minimo && ano <= maximo ? undefined : `O ano vai de ${minimo} a ${maximo}.`;
}

/**
 * O que está errado numa data enquanto a pessoa escolhe, para avisar na hora e não só ao salvar.
 * O ano fora do intervalo é de problemaNoAno.
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
