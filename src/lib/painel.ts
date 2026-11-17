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

// --- Visitas e carta (docs/decisoes.md, "Painel pessoal como página inicial") -----------------
//
// Cada pessoa com acesso tem um registro de visitas. Uma visita é uma sequência de idas ao painel
// sem uma pausa longa: quem volta ao painel depois de PAUSA_ENTRE_VISITAS começa uma visita nova.
// "O que entrou de novo" conta a partir do fim da visita anterior, e por isso não some ao recarregar
// a página nem ao voltar para o painel no meio da mesma visita.
//
// A carta de Natal aparece no alto durante a primeira visita em que ela existe. Depois, fica num
// link discreto. Se a pessoa entrar antes de a carta ser escrita (os administradores, antes do
// Natal), a carta aparece no alto na primeira visita depois de escrita.

/** Duas horas sem abrir o painel encerram uma visita. */
export const PAUSA_ENTRE_VISITAS = 2 * 60 * 60 * 1000;

/** Datas no formato do SQLite, em UTC: "2026-12-24 21:00:00". Comparáveis como texto. */
export const paraOBanco = (d: Date): string => d.toISOString().slice(0, 19).replace('T', ' ');
const doBanco = (s: string): number => Date.parse(`${s.replace(' ', 'T')}Z`);

export interface RegistroDeVisitas {
  /** a primeira vez que a pessoa abriu o painel */
  primeira: string;
  /** quando começou a visita atual */
  visita: string;
  /** a última vez que abriu o painel */
  ultima: string;
  /** a última vez que abriu o painel na visita anterior: "o que entrou de novo" conta daí */
  anterior: string | null;
  /** quando a carta apareceu no alto pela primeira vez; vazio se ainda não apareceu */
  carta: string | null;
}

export interface Chegada {
  registro: RegistroDeVisitas;
  /** a carta no alto do painel */
  cartaNoAlto: boolean;
  /** de quando conta o que entrou de novo. Vazio na primeira visita, que abre com a carta. */
  novidadesDesde: string | null;
}

/** Registra uma ida ao painel e diz o que mostrar. */
export function chegarAoPainel(anterior: RegistroDeVisitas | undefined, agora: Date, haCarta: boolean): Chegada {
  const ja = paraOBanco(agora);
  let registro: RegistroDeVisitas;
  if (!anterior) {
    registro = { primeira: ja, visita: ja, ultima: ja, anterior: null, carta: null };
  } else if (agora.getTime() - doBanco(anterior.ultima) < PAUSA_ENTRE_VISITAS) {
    registro = { ...anterior, ultima: ja };
  } else {
    registro = { ...anterior, visita: ja, ultima: ja, anterior: anterior.ultima };
  }
  // A carta fica no alto durante toda a visita em que apareceu pela primeira vez
  if (haCarta && !registro.carta) registro = { ...registro, carta: ja };
  const cartaNoAlto = haCarta && registro.carta !== null && registro.carta >= registro.visita;
  return { registro, cartaNoAlto, novidadesDesde: registro.anterior };
}

/** "Oi, Elizete," (pedido do Gui, 17/11/2026: a mesma saudação para todo mundo) */
export function saudacao(nome: string): string {
  return `Oi, ${nome},`;
}

// --- O que entrou de novo -------------------------------------------------------------------

export interface MemoriaNova {
  id: string;
  criadaPor: string;
  /** quando foi publicada (para memórias antigas, quando foi criada) */
  publicadaEm: string;
}

export interface RelatoNovo {
  id: number;
  memoriaId: string;
  por: string;
  registradoPor: string;
  publicadoEm: string;
}

/**
 * Memórias e relatos publicados depois de `desde`, por outras pessoas, entre os que quem olha vê.
 * `memorias` são as memórias que a pessoa vê; um relato de memória fora dessa lista não entra. O
 * relato de uma memória que também é nova fica de fora, porque a memória já aparece.
 * Devolve os mais novos primeiro.
 */
export function novidades<M extends MemoriaNova, R extends RelatoNovo>(memorias: M[], relatos: R[], desde: string | null, eu: string): { memorias: M[]; relatos: R[] } {
  if (!desde) return { memorias: [], relatos: [] };
  const novas = memorias.filter((m) => m.publicadaEm > desde && m.criadaPor !== eu).sort((a, b) => b.publicadaEm.localeCompare(a.publicadaEm));
  const vistas = new Set(memorias.map((m) => m.id));
  const jaNovas = new Set(novas.map((m) => m.id));
  const relatosNovos = relatos
    .filter((r) => r.publicadoEm > desde && r.por !== eu && r.registradoPor !== eu && vistas.has(r.memoriaId) && !jaNovas.has(r.memoriaId))
    .sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm));
  return { memorias: novas, relatos: relatosNovos };
}

// --- Aniversários ---------------------------------------------------------------------------

export interface PessoaComNascimento {
  id: string;
  nascimentoAno: number | null;
  nascimentoMes: number | null;
  nascimentoDia: number | null;
  falecido: boolean;
}

export interface Aniversario<P> {
  pessoa: P;
  mes: number;
  dia: number;
  /** quantos dias faltam: 0 é hoje */
  emDias: number;
  /** a idade que vai fazer, quando o ano de nascimento é conhecido */
  faz: number | null;
}

const bissexto = (ano: number) => (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;

/**
 * Os aniversários dos próximos `dias` dias, a contar de hoje, de quem está vivo e de quem a pessoa vê.
 * Quem tem só o ano de nascimento não entra. Quem nasceu em 29 de fevereiro faz aniversário no dia 28
 * nos anos que não são bissextos. Do mais próximo para o mais distante.
 */
export function aniversarios<P extends PessoaComNascimento>(pessoas: P[], hoje: Dia, naoVe: Set<string>, eu: string, dias = 30): Aniversario<P>[] {
  const inicio = Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia);
  const lista: Aniversario<P>[] = [];
  for (const p of pessoas) {
    if (p.falecido || naoVe.has(p.id) || p.id === eu || !p.nascimentoMes || !p.nascimentoDia) continue;
    for (const ano of [hoje.ano, hoje.ano + 1]) {
      const dia = p.nascimentoMes === 2 && p.nascimentoDia === 29 && !bissexto(ano) ? 28 : p.nascimentoDia;
      const emDias = Math.round((Date.UTC(ano, p.nascimentoMes - 1, dia) - inicio) / 86400000);
      if (emDias < 0) continue;
      if (emDias <= dias) lista.push({ pessoa: p, mes: p.nascimentoMes, dia, emDias, faz: p.nascimentoAno ? ano - p.nascimentoAno : null });
      break;
    }
  }
  return lista.sort((a, b) => a.emDias - b.emDias);
}

// --- Uma memória para contar ----------------------------------------------------------------

/**
 * Uma memória em que a pessoa aparece e ainda não contou nada (nem em rascunho), para escrever o
 * primeiro relato. A mais recente com foto; sem nenhuma com foto, a mais recente.
 * `memorias` vem da mais antiga para a mais recente, como listarMemorias devolve.
 */
export function memoriaParaContar<M extends { id: string; integrantes: string[]; fotos: unknown[] }>(
  memorias: M[],
  comRelatoMeu: Set<string>,
  eu: string,
  /** as que já estão no painel, entre as novidades */
  jaNoPainel: Set<string> = new Set(),
): M | undefined {
  const minhas = [...memorias].reverse().filter((m) => m.integrantes.includes(eu) && !comRelatoMeu.has(m.id) && !jaNoPainel.has(m.id));
  return minhas.find((m) => m.fotos.length > 0) ?? minhas[0];
}

/** O dia de hoje no horário de Brasília, onde a família está. */
export function hojeNoBrasil(agora: Date): Dia {
  const [ano, mes, dia] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(agora)
    .split('-')
    .map(Number);
  return { ano: ano!, mes: mes!, dia: dia! };
}

/**
 * "sua avó Bela", sem repetir o parentesco quando o apelido já começa com ele: "sua Tia Cida", e não
 * "sua tia Tia Cida". `parentesco` é o que possessivo() devolve ("sua tia"); sem ele, só o nome.
 */
export function comParentesco(parentesco: string | undefined, nome: string): string {
  if (!parentesco) return nome;
  const [artigo, ...resto] = parentesco.split(' ');
  const relacao = resto.join(' ');
  return nome.toLowerCase().startsWith(`${relacao.toLowerCase()} `) ? `${artigo} ${nome}` : `${parentesco} ${nome}`;
}
