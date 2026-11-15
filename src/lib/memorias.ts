import { getCollection, type CollectionEntry } from 'astro:content';

export type Memoria = CollectionEntry<'memorias'>;
export type Pessoa = CollectionEntry<'pessoas'>;

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** Todas as memórias publicadas, da mais antiga para a mais recente. */
export async function listarMemorias(): Promise<Memoria[]> {
  const todas = await getCollection('memorias', ({ data }) => !data.rascunho);
  return todas.sort((a, b) => chave(a) - chave(b));
}

export async function listarPessoas(): Promise<Pessoa[]> {
  const todas = await getCollection('pessoas');
  return todas.sort((a, b) => a.data.ordem - b.data.ordem);
}

function chave(m: Memoria): number {
  const { ano, mes = 0, dia = 0 } = m.data;
  return ano * 10000 + mes * 100 + dia;
}

/** "12 de março de 1994", "março de 1994", "1994" ou "por volta de 1994". */
export function formatarData(m: Memoria): string {
  const { ano, mes, dia, aproximada } = m.data;
  let texto = String(ano);
  if (mes) texto = `${MESES[mes - 1]} de ${ano}`;
  if (mes && dia) texto = `${dia} de ${texto}`;
  return aproximada ? `por volta de ${texto}` : texto;
}

/** Parte da data sem o ano, para usar ao lado do ano grande na linha do tempo. */
export function formatarDiaMes(m: Memoria): string {
  const { mes, dia, aproximada } = m.data;
  if (!mes) return aproximada ? 'data aproximada' : '';
  const texto = dia ? `${dia} de ${MESES[mes - 1]}` : MESES[mes - 1];
  return aproximada ? `por volta de ${texto}` : texto;
}

export function agruparPorAno(memorias: Memoria[]): { ano: number; itens: Memoria[] }[] {
  const grupos = new Map<number, Memoria[]>();
  for (const m of memorias) {
    const lista = grupos.get(m.data.ano) ?? [];
    lista.push(m);
    grupos.set(m.data.ano, lista);
  }
  return [...grupos.entries()].map(([ano, itens]) => ({ ano, itens }));
}

export function fotoChave(m: Memoria) {
  return m.data.fotos.find((f) => f.chave) ?? m.data.fotos[0];
}

export function nomeCurto(p: Pessoa): string {
  return p.data.apelido ?? p.data.nome;
}
