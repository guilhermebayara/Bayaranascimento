// Regras puras do painel pessoal (docs/regras/inicio.md, "Início (painel pessoal)").
import type { DataFlexivel } from './datas';
import { comoOCasalAparece, faseAtual, type Casal } from './parentesco';

export interface Dia {
  ano: number;
  mes: number;
  dia: number;
}

/** O quão perto de hoje, em outros anos, a memória aconteceu. */
export type Proximidade = 'natal' | 'dia' | 'semana' | 'mes';

export const TITULO_DA_PROXIMIDADE: Record<Proximidade, string> = {
  natal: 'No Natal, em outros anos',
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

/** Os dias do Natal, de 24 a 26 de dezembro (resposta do Gui à crítica C1, 22/11/2026). */
export const noNatal = (hoje: { mes: number; dia: number }): boolean => hoje.mes === 12 && hoje.dia >= 24 && hoje.dia <= 26;

/**
 * "Neste dia, em 1994" (ideia do Gui, 16/11/2026). Das memórias que a pessoa vê, as de outros anos
 * que aconteceram no mesmo dia e mês de hoje. Sem nenhuma, as da mesma semana (até três dias antes
 * ou depois). Sem nenhuma ainda, as do mesmo mês, e aí entram as que só têm mês e ano.
 * Data aproximada e memória deste ano ficam de fora. Devolve as mais recentes primeiro.
 * No Natal, de 24 a 26 de dezembro, vêm antes as memórias de 24 e de 25 de dezembro de todos os
 * outros anos (resposta do Gui à crítica C1, 22/11/2026): no dia 25, a família quer os Natais, e o
 * de 24/12 ficava de fora porque o dia 25 tinha uma memória. Sem nenhuma, vale a regra de sempre.
 */
export function emOutrosAnos<T extends DataFlexivel>(memorias: T[], hoje: Dia, maximo = 4): { proximidade: Proximidade; itens: T[] } | undefined {
  const candidatas = memorias.filter((m) => m.ano < hoje.ano && !m.aproximada && m.mes);
  const comDia = candidatas.filter((m) => m.dia);
  const niveis: [Proximidade, T[]][] = [
    ['natal', noNatal(hoje) ? comDia.filter((m) => m.mes === 12 && (m.dia === 24 || m.dia === 25)) : []],
    ['dia', comDia.filter((m) => m.mes === hoje.mes && m.dia === hoje.dia)],
    ['semana', comDia.filter((m) => distancia({ mes: m.mes!, dia: m.dia! }, hoje) <= 3)],
    ['mes', candidatas.filter((m) => m.mes === hoje.mes)],
  ];
  for (const [proximidade, itens] of niveis) {
    if (itens.length) return { proximidade, itens: [...itens].sort((a, b) => b.ano - a.ano).slice(0, maximo) };
  }
  return undefined;
}

// --- Visitas e carta (docs/regras/inicio.md, "Início (painel pessoal)") -----------------
//
// Cada pessoa com acesso tem um registro de visitas. Uma visita é uma sequência de idas ao painel
// sem uma pausa longa: quem volta ao painel depois de PAUSA_ENTRE_VISITAS começa uma visita nova.
// "O que entrou de novo" conta a partir do fim da visita anterior, e por isso não some ao recarregar
// a página nem ao voltar para o painel no meio da mesma visita.
//
// A carta de Natal aparece no alto uma vez só: na primeira ida ao Início em que ela existe, e aí a
// tela é só a carta (resposta do Gui às perguntas P14 e P15 do QA de design de 17/11/2026). Na ida
// seguinte, mesmo que seja um minuto depois, vem o Início normal, com a carta num link discreto.
// Se a pessoa entrar antes de a carta ser escrita (os administradores, antes do Natal), a carta
// aparece no alto na primeira ida ao Início depois de escrita.

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
  /** quando a carta apareceu no alto, a única vez; vazio se ainda não apareceu */
  carta: string | null;
}

export interface Chegada {
  registro: RegistroDeVisitas;
  /** a carta sozinha na tela, no lugar do painel: só na ida em que ela aparece pela primeira vez */
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
  // A carta aparece no alto uma vez: nesta ida, se ainda não tinha aparecido
  const cartaNoAlto = haCarta && !registro.carta;
  if (cartaNoAlto) registro = { ...registro, carta: ja };
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

// --- Aniversários de casamento ----------------------------------------------------------------

export interface AniversarioDeCasamento {
  casal: Casal;
  mes: number;
  dia: number;
  /** quantos dias faltam: 0 é hoje */
  emDias: number;
  /** quantos anos de casados vão fazer, quando o ano do casamento é conhecido */
  anos: number | null;
}

/**
 * Os aniversários de casamento dos próximos `dias` dias (decisão do Gui, 18/11/2026: "Elizete e Aguilar,
 * 30 anos de casados"). Só de casais atuais, com o casamento como fase de hoje, e só quando a data do
 * casamento tem dia e mês. `casais` são os que a pessoa vê (listarCasais já aplica quem vê o casal), e
 * `sai` diz quem não entra: quem ela não vê, o ex que ela deixou discreto ou fora e quem já faleceu. Se
 * um dos dois faleceu, o casal não entra: o painel não lembra datas de quem já se foi.
 */
export function aniversariosDeCasamento(casais: readonly Casal[], hoje: Dia, sai: (id: string) => boolean, dias = 30): AniversarioDeCasamento[] {
  const inicio = Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia);
  const lista: AniversarioDeCasamento[] = [];
  for (const casal of casais) {
    const fase = faseAtual(casal);
    if (!fase || fase.tipo !== 'casamento' || comoOCasalAparece(casal) !== 'casal') continue;
    if (!fase.inicioMes || !fase.inicioDia || sai(casal.a) || sai(casal.b)) continue;
    for (const ano of [hoje.ano, hoje.ano + 1]) {
      const dia = fase.inicioMes === 2 && fase.inicioDia === 29 && !bissexto(ano) ? 28 : fase.inicioDia;
      const emDias = Math.round((Date.UTC(ano, fase.inicioMes - 1, dia) - inicio) / 86400000);
      if (emDias < 0) continue;
      const anos = fase.inicioAno ? ano - fase.inicioAno : null;
      // O casamento que ainda nem aconteceu (a data é deste ano, mais adiante) não é aniversário
      if (emDias <= dias && (anos === null || anos > 0)) lista.push({ casal, mes: fase.inicioMes, dia, emDias, anos });
      break;
    }
  }
  return lista.sort((a, b) => a.emDias - b.emDias);
}

/** "30 anos de casados", "1 ano de casados" ou, sem o ano do casamento, "aniversário de casamento". */
export const anosDeCasados = (anos: number | null): string => (anos ? `${anos} ${anos === 1 ? 'ano' : 'anos'} de casados` : 'aniversário de casamento');

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

// --- O nome para quem olha ------------------------------------------------------------------

// O parentesco que um apelido pode trazer na frente, e a palavra com que possessivo() diz o mesmo
const PARENTESCO_NO_APELIDO: Record<string, string> = {
  vó: 'avó',
  vovó: 'avó',
  avó: 'avó',
  vô: 'avô',
  vovô: 'avô',
  avô: 'avô',
  bisa: 'bisavó',
  bisavó: 'bisavó',
  bisavô: 'bisavô',
  tia: 'tia',
  tio: 'tio',
  'tia-avó': 'tia-avó',
  'tio-avô': 'tio-avô',
  prima: 'prima',
  primo: 'primo',
  mãe: 'mãe',
  mamãe: 'mãe',
  pai: 'pai',
  papai: 'pai',
  madrinha: 'madrinha',
  dinda: 'madrinha',
  padrinho: 'padrinho',
  dindo: 'padrinho',
};

/**
 * O apelido é um só por pessoa, e costuma ser o do ponto de vista de quem cadastrou: "Tia Lourdes".
 * Para a irmã dela, o Início mostra "Lourdes", com "sua irmã" embaixo (resposta do Gui à pergunta
 * P22 do QA de design de 17/11/2026). Quando o parentesco do apelido é o de quem olha, o apelido
 * fica e o parentesco não se repete. Sem parentesco conhecido com quem olha, o apelido fica como
 * está: é o nome que a família usa. `parentesco` é o que possessivo() devolve ("sua tia").
 */
export function nomeParaQuemOlha(nome: string, parentesco: string | undefined): { nome: string; parentesco: string | undefined } {
  const [primeira = '', ...resto] = nome.trim().split(/\s+/);
  const doApelido = PARENTESCO_NO_APELIDO[primeira.toLowerCase()];
  if (!doApelido || resto.length === 0 || !parentesco) return { nome, parentesco };
  const meu = parentesco.split(' ').slice(1).join(' ').toLowerCase();
  // "Vó Bela" serve também para a bisneta, e "Tio Zeca" para o sobrinho de consideração
  const eOMesmo = meu === doApelido || meu.startsWith(`${doApelido} `) || (['avó', 'avô'].includes(doApelido) && meu.endsWith(doApelido) && !meu.includes('-'));
  // Aprovado antes: o parentesco só some quando o apelido traz a mesma palavra ("Tia Cida", "sua tia")
  if (eOMesmo) return { nome, parentesco: nome.toLowerCase().startsWith(`${meu} `) ? undefined : parentesco };
  return { nome: resto.join(' '), parentesco };
}

// --- A composição do Início -----------------------------------------------------------------

export type CartaoDoInicio = 'contar' | 'outros-anos' | 'aniversarios' | 'voce';

export interface ComposicaoDoInicio {
  /**
   * O que fica à direita da abertura, no computador (resposta do Gui à pergunta P13): as novidades;
   * sem novidade, "Neste dia, em outros anos"; sem ele, a memória para contar.
   */
  mesa: 'novidades' | 'outros-anos' | 'contar' | 'vazia';
  /** o envelope só aparece quando chegou algo */
  envelope: boolean;
  /** o relato e "E mais N" numa fileira de largura inteira, embaixo da abertura e das fotos (P18) */
  filaInteira: boolean;
  /** os cartões, na ordem da página: "Você no acervo" primeiro (crítica C1), e contar antes de "Neste dia" (P16) */
  cartoes: CartaoDoInicio[];
  /** "Neste dia" com três ou quatro memórias ocupa uma faixa; com uma ou duas, é um cartão da fileira (P19) */
  outrosAnosEmFaixa: boolean;
  /** quantos cartões dividem a fileira no computador, fora a faixa e o que foi para a mesa */
  naFileira: number;
}

/** Decide onde cada parte do Início fica, a partir do que há para mostrar. */
export function composicaoDoInicio(ha: { memoriasNovas: number; relatosNovos: number; outrosAnos: number; contar: boolean; aniversarios: boolean; voce: boolean }): ComposicaoDoInicio {
  const novidade = ha.memoriasNovas + ha.relatosNovos > 0;
  const mesa = novidade ? 'novidades' : ha.outrosAnos > 0 ? 'outros-anos' : ha.contar ? 'contar' : 'vazia';
  const naMesa = Math.min(ha.memoriasNovas, 2);
  const foraDaMesa = ha.memoriasNovas - naMesa + Math.max(ha.relatosNovos - 1, 0);
  const cartoes: CartaoDoInicio[] = [];
  // "Você no acervo" vem antes do convite para contar (resposta do Gui à crítica C1, 22/11/2026): no
  // primeiro dia, a vontade é se ver; contar fica para depois
  if (ha.voce) cartoes.push('voce');
  if (ha.contar) cartoes.push('contar');
  if (ha.outrosAnos > 0) cartoes.push('outros-anos');
  if (ha.aniversarios) cartoes.push('aniversarios');
  const outrosAnosEmFaixa = mesa !== 'outros-anos' && ha.outrosAnos > 2;
  const foraDaFileira = (c: CartaoDoInicio) => c === mesa || (c === 'outros-anos' && outrosAnosEmFaixa) || (c === 'contar' && outrosAnosEmFaixa);
  return {
    mesa,
    envelope: novidade,
    filaInteira: naMesa > 0 && foraDaMesa > 0,
    cartoes,
    outrosAnosEmFaixa,
    naFileira: cartoes.filter((c) => !foraDaFileira(c)).length,
  };
}

/** "Sua última visita foi em 17 nov.": o ano só entra quando não é o ano corrente (P25). */
export function anoDaUltimaVisita(ultima: Dia, hoje: Dia): string {
  return ultima.ano === hoje.ano ? '' : ` de ${ultima.ano}`;
}

/**
 * "Você no acervo", proposta B do conceito da sessão H (escolha do Gui, 18/11/2026): a frase com quantas
 * memórias e de que ano a que ano, e as fotos das quatro mais recentes em que a pessoa aparece. As
 * memórias chegam da mais recente para a mais antiga; só entra quem tem foto.
 */
export function voceNoAcervo<M extends { ano: number; fotos: unknown[] }>(minhas: M[], quantasFotos = 4): { quantas: number; de?: number; ate?: number; comFoto: M[] } {
  const anos = minhas.map((m) => m.ano);
  const de = anos.length ? Math.min(...anos) : undefined;
  const ate = anos.length ? Math.max(...anos) : undefined;
  return { quantas: minhas.length, ...(de !== ate ? { de, ate } : {}), comFoto: minhas.filter((m) => m.fotos.length > 0).slice(0, quantasFotos) };
}
