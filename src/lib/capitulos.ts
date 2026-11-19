// Capítulos e temas: regras puras, sem banco.
//
// Um capítulo reúne memórias que formam um momento maior. Tem dois modos:
// - reunido: alguém adiciona cada memória, e o período é calculado por elas;
// - por período (modo 'epoca' no banco): tem início e fim, e as memórias entram sozinhas pela data.
//
// Época e capítulo (decisão do Gui, 16/11/2026): o capítulo por período diz de quem é, com pessoas,
// famílias ou os dois. Entram só as memórias do período em que alguma dessas pessoas está ou que são
// de uma dessas famílias. Sem ninguém marcado, ele é uma época, que vale para a família inteira, como
// a pandemia: entra tudo o que aconteceu no período.

import { problemaNaData } from './datas';

export interface DataSolta {
  ano: number;
  mes?: number | null;
  dia?: number | null;
}

export interface Capitulo {
  id: string;
  titulo: string;
  abertura: string | null;
  /** 'epoca' é o capítulo por período; o nome ficou no banco */
  modo: 'reunido' | 'epoca';
  inicio: DataSolta | null;
  fim: DataSolta | null;
  /** capítulo maior em que este está, quando houver. No máximo dois níveis. */
  dentroDe: string | null;
  visibilidade: 'todos' | 'nucleos';
  nucleos: string[];
  criadoPor: string;
  temas: string[];
  /** de quem é o capítulo por período: as pessoas. Vazio junto com `familias` quer dizer época, de todos. */
  pessoas: string[];
  /** de quem é o capítulo por período: as famílias (ids de núcleo) */
  familias: string[];
}

export interface Tema {
  id: string;
  nome: string;
}

/** Número comparável: a parte que falta vale o começo (ou o fim) do período. */
function ordem(d: DataSolta, fimDoPeriodo: boolean): number {
  const mes = d.mes ?? (fimDoPeriodo ? 12 : 1);
  const dia = d.dia ?? (fimDoPeriodo ? 31 : 1);
  return d.ano * 10000 + mes * 100 + dia;
}

/**
 * A data cai dentro do período? Quem só sabe o ano entra se o ano inteiro
 * tocar o período. Sem fim, o período segue aberto.
 */
export function dentroDoPeriodo(data: DataSolta, inicio: DataSolta, fim: DataSolta | null): boolean {
  const comeca = ordem(data, false);
  const termina = ordem(data, true);
  if (termina < ordem(inicio, false)) return false;
  if (fim && comeca > ordem(fim, true)) return false;
  return true;
}

/** O capítulo por período sem pessoas nem famílias é uma época: vale para a família inteira. */
export function ehEpoca(c: Pick<Capitulo, 'modo'> & Partial<Pick<Capitulo, 'pessoas' | 'familias'>>): boolean {
  return c.modo === 'epoca' && (c.pessoas?.length ?? 0) + (c.familias?.length ?? 0) === 0;
}

/** O que a regra precisa saber de uma memória para dizer se ela é de um capítulo. */
export interface MemoriaParaCapitulo extends DataSolta {
  /** capítulos reunidos em que a memória foi colocada */
  capitulos: string[];
  /** quem estava */
  integrantes?: string[];
  /** as famílias da memória */
  nucleos?: string[];
}

/**
 * A memória é deste capítulo? No reunido, se foi colocada nele. No por período, se a data cai
 * dentro do período e, quando o capítulo é de alguém, se alguma dessas pessoas está nela ou se ela
 * é de uma dessas famílias. Vale para a página do capítulo, a lista de capítulos, a ficha da memória
 * e a linha do tempo.
 */
export function memoriaDoCapitulo(
  m: MemoriaParaCapitulo,
  c: Pick<Capitulo, 'id' | 'modo' | 'inicio' | 'fim'> & Partial<Pick<Capitulo, 'pessoas' | 'familias'>>,
): boolean {
  if (c.modo === 'reunido') return m.capitulos.includes(c.id);
  if (!c.inicio || !dentroDoPeriodo(m, c.inicio, c.fim)) return false;
  if (ehEpoca(c)) return true;
  const pessoas = c.pessoas ?? [];
  const familias = c.familias ?? [];
  return (m.integrantes ?? []).some((p) => pessoas.includes(p)) || (m.nucleos ?? []).some((n) => familias.includes(n));
}

/**
 * A escolha "Como as memórias entram?" do formulário. No banco, época e capítulo por período são o
 * mesmo modo ('epoca'): a época é o que não tem ninguém marcado.
 */
export type ModoDoFormulario = 'reunido' | 'periodo' | 'epoca';

export function modoNoFormulario(c: (Pick<Capitulo, 'modo'> & Partial<Pick<Capitulo, 'pessoas' | 'familias'>>) | undefined): ModoDoFormulario {
  if (!c || c.modo === 'reunido') return 'reunido';
  return ehEpoca(c) ? 'epoca' : 'periodo';
}

export function lerModoDoFormulario(valor: string): ModoDoFormulario {
  return valor === 'periodo' || valor === 'epoca' ? valor : 'reunido';
}

/** "Época", "Capítulo por período" ou "Capítulo", para o selo da página. */
export function nomeDoModo(c: Pick<Capitulo, 'modo'> & Partial<Pick<Capitulo, 'pessoas' | 'familias'>>): string {
  if (ehEpoca(c)) return 'Época';
  return c.modo === 'epoca' ? 'Capítulo por período' : 'Capítulo';
}

/** Período de um capítulo reunido: da primeira à última memória que quem olha pode ver. */
export function periodoDasMemorias(memorias: DataSolta[]): { inicio: DataSolta; fim: DataSolta } | null {
  if (memorias.length === 0) return null;
  const ordenadas = [...memorias].sort((a, b) => ordem(a, false) - ordem(b, false));
  return { inicio: ordenadas[0], fim: ordenadas[ordenadas.length - 1] };
}

/** Como um período se sobrepõe a outro: inteiro, em parte, ou nada. */
export function sobreposicao(
  dentro: { inicio: DataSolta; fim: DataSolta | null },
  fora: { inicio: DataSolta; fim: DataSolta | null },
): 'inteiro' | 'parte' | 'nada' {
  const a0 = ordem(dentro.inicio, false);
  const a1 = dentro.fim ? ordem(dentro.fim, true) : Infinity;
  const b0 = ordem(fora.inicio, false);
  const b1 = fora.fim ? ordem(fora.fim, true) : Infinity;
  if (a1 < b0 || a0 > b1) return 'nada';
  return a0 >= b0 && a1 <= b1 ? 'inteiro' : 'parte';
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const curta = (d: DataSolta, comDia: boolean) => (d.mes ? `${comDia && d.dia ? `${d.dia} de ` : ''}${MESES[d.mes - 1]} de ${d.ano}` : String(d.ano));

/**
 * "2019 a 2021", "mar de 2020 em diante", "2026". `comDia` mostra o dia, quando há ("11 de mar de 2020
 * em diante"): vale para as datas do próprio capítulo por período e da época. O período do capítulo
 * reunido vem das memórias e fica sem o dia.
 */
export function formatarPeriodo(inicio: DataSolta | null, fim: DataSolta | null, aberto = false, comDia = false): string {
  if (!inicio) return '';
  if (!fim) return aberto ? `${curta(inicio, comDia)} em diante` : curta(inicio, comDia);
  const a = curta(inicio, comDia);
  const b = curta(fim, comDia);
  return a === b ? a : `${a} a ${b}`;
}

/**
 * As datas do capítulo por período e da época, como chegam do formulário: o ano, e o mês e o dia
 * opcionais, como as outras datas do site (pedido do Gui, 18/11/2026: para alguns capítulos, o dia faz
 * diferença). O início é obrigatório e o fim pode ficar em aberto. Devolve o erro, se houver.
 */
export function lerPeriodoDoCapitulo(
  campos: Record<'inicioAno' | 'inicioMes' | 'inicioDia' | 'fimAno' | 'fimMes' | 'fimDia', number | undefined>,
  anoAtual: number,
  epoca: boolean,
): { inicio: DataSolta; fim: DataSolta | undefined } | { erro: string } {
  const invalida = `Confira as datas. Os anos precisam estar entre 1800 e ${anoAtual}.`;
  const ler = (prefixo: 'inicio' | 'fim'): DataSolta | undefined | { erro: string } => {
    const ano = campos[`${prefixo}Ano`];
    const mes = campos[`${prefixo}Mes`];
    const dia = campos[`${prefixo}Dia`];
    if (ano === undefined) return mes || dia ? { erro: invalida } : undefined;
    if (!Number.isInteger(ano) || ano < 1800 || ano > anoAtual) return { erro: invalida };
    if (mes !== undefined && (!Number.isInteger(mes) || mes < 1 || mes > 12)) return { erro: invalida };
    if (dia !== undefined && !Number.isInteger(dia)) return { erro: invalida };
    const problema = problemaNaData(ano, mes, dia);
    if (problema) return { erro: problema };
    return { ano, mes: mes ?? null, dia: dia ?? null };
  };
  const inicio = ler('inicio');
  const fim = ler('fim');
  if (inicio && 'erro' in inicio) return inicio;
  if (fim && 'erro' in fim) return fim;
  if (!inicio) return { erro: epoca ? 'Uma época precisa de um ano de início.' : 'Um capítulo por período precisa de um ano de início.' };
  // Só compara o que as duas datas sabem: "2020" e "mar de 2020" não se contradizem
  const ordemComum = (d: DataSolta, outra: DataSolta) =>
    d.ano * 10000 + (d.mes && outra.mes ? d.mes : 0) * 100 + (d.mes && outra.mes && d.dia && outra.dia ? d.dia : 0);
  if (fim && ordemComum(fim, inicio) < ordemComum(inicio, fim)) return { erro: 'O período não pode terminar antes de começar.' };
  return { inicio, fim };
}

export interface QuemOlha {
  pessoa: string;
  admin: boolean;
  nucleos: string[];
}

/** O capítulo tem visibilidade própria, que vale para título e abertura. As memórias mantêm cada uma a sua. */
export function podeVerCapitulo(usuario: QuemOlha, c: Pick<Capitulo, 'visibilidade' | 'nucleos'>): boolean {
  return c.visibilidade === 'todos' || c.nucleos.some((n) => usuario.nucleos.includes(n));
}

/**
 * Um capítulo pode ficar dentro de outro, com no máximo dois níveis: o de fora
 * não pode estar dentro de ninguém, e o de dentro não pode ter capítulos próprios.
 */
export function validarAninhamento(capitulo: { id?: string; temFilhos: boolean }, pai: Pick<Capitulo, 'id' | 'dentroDe'> | undefined): string | undefined {
  if (!pai) return undefined;
  if (pai.id === capitulo.id) return 'Um capítulo não pode ficar dentro dele mesmo.';
  if (pai.dentroDe) return 'Esse capítulo já está dentro de outro. São no máximo dois níveis.';
  if (capitulo.temFilhos) return 'Este capítulo já tem capítulos dentro dele, então não pode entrar em outro.';
  return undefined;
}

/**
 * De quem é o capítulo por período, como chegou do formulário: sem repetição, e só pessoas e
 * famílias que existem no acervo. Devolve o erro, se houver.
 */
export function lerDeQuem(
  pedido: { pessoas: string[]; familias: string[] },
  existentes: { pessoas: Set<string>; familias: Set<string> },
): { pessoas: string[]; familias: string[] } | { erro: string } {
  const pessoas = [...new Set(pedido.pessoas.map((p) => p.trim()).filter(Boolean))];
  const familias = [...new Set(pedido.familias.map((f) => f.trim()).filter(Boolean))];
  if (pessoas.length > 60 || familias.length > 20) return { erro: 'São pessoas ou famílias demais para um capítulo.' };
  if (pessoas.some((p) => !existentes.pessoas.has(p))) return { erro: 'Uma das pessoas marcadas não está no acervo.' };
  if (familias.some((f) => !existentes.familias.has(f))) return { erro: 'Uma das famílias marcadas não existe.' };
  return { pessoas, familias };
}

/** "Viagens, casas onde moramos" → nomes limpos, sem repetição. */
export function lerTemas(texto: string): string[] {
  const vistos = new Set<string>();
  const nomes: string[] = [];
  for (const parte of texto.split(/[,;\n]/)) {
    const nome = parte.trim().replace(/\s+/g, ' ').slice(0, 40);
    const chave = nome.toLowerCase();
    if (nome && !vistos.has(chave)) {
      vistos.add(chave);
      nomes.push(nome);
    }
  }
  return nomes.slice(0, 12);
}

// --- A página do capítulo (respostas do Gui ao QA de design de 17/11/2026) ----------------------

/**
 * As formas de ver as memórias na página do capítulo (P69): os marcos numerados, que são o padrão,
 * e o mural e a lista do Explorar. A escolha fica no endereço, em `ver`, como na página da pessoa.
 */
export const FORMAS_DO_CAPITULO = ['marcos', 'mural', 'lista'] as const;
export type FormaDoCapitulo = (typeof FORMAS_DO_CAPITULO)[number];
export const NOMES_DAS_FORMAS_DO_CAPITULO: Record<FormaDoCapitulo, string> = { marcos: 'Linha do tempo', mural: 'Mural de fotos', lista: 'Lista' };

export function lerFormaDoCapitulo(p: URLSearchParams): FormaDoCapitulo {
  const ver = p.get('ver');
  return FORMAS_DO_CAPITULO.find((f) => f === ver) ?? 'marcos';
}

/** O endereço da página do capítulo em cada forma de ver. Os marcos, que são o padrão, não vão no endereço. */
export function enderecoDoCapitulo(id: string, forma: FormaDoCapitulo = 'marcos', mais: Record<string, string | undefined> = {}): string {
  const p = new URLSearchParams();
  if (forma !== 'marcos') p.set('ver', forma);
  for (const [nome, valor] of Object.entries(mais)) if (valor) p.set(nome, valor);
  return `/capitulos/${id}${p.size > 0 ? `?${p}` : ''}`;
}

/** O título da parte das memórias (P71): a época não é capítulo. */
export function tituloDasMemorias(c: Pick<Capitulo, 'modo'> & Partial<Pick<Capitulo, 'pessoas' | 'familias'>>, quantas: number): string {
  if (quantas === 0) return 'Memórias';
  return ehEpoca(c) ? 'Memórias da época' : 'Memórias do capítulo';
}

/**
 * O que a linha de "Aconteceu neste período" diz de cada capítulo (P73): só a exceção. No acervo
 * real, o raro é o que atravessa a borda do capítulo (resposta do Gui à 46-N9, 17/11/2026): o que
 * aconteceu em parte é marcado, e o que coube inteiro no período fica sem nada.
 */
export function detalheDoCruzamento(como: 'inteiro' | 'parte'): string | undefined {
  return como === 'parte' ? 'em parte neste período' : undefined;
}

// --- Editar capítulo: as memórias (P78 do QA de design de 17/11/2026) ---------------------------

/** As memórias para marcar: as que já estão no capítulo primeiro, sem mexer na ordem dentro de cada grupo. */
export function ordemDeMarcar<M extends { capitulos: string[] }>(memorias: M[], capitulo: string): M[] {
  return [...memorias.filter((m) => m.capitulos.includes(capitulo)), ...memorias.filter((m) => !m.capitulos.includes(capitulo))];
}

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** A busca de memória acha por qualquer pedaço do título ou da data, sem ligar para acento nem maiúscula. Cada palavra do termo precisa aparecer. */
export function achaNaBusca(texto: string, termo: string): boolean {
  const onde = semAcento(texto);
  const palavras = semAcento(termo).split(/\s+/).filter(Boolean);
  return palavras.length > 0 && palavras.every((p) => onde.includes(p));
}

// --- A linha de um capítulo no sumário e na página do tema (P83) --------------------------------

/**
 * O período e a conta das memórias de um capítulo, entre as que quem olha pode ver: o que a linha
 * do sumário mostra. No reunido contam as memórias dele e as dos capítulos de dentro.
 */
export function resumoDoCapitulo<M extends MemoriaParaCapitulo>(c: Capitulo, capitulos: Capitulo[], memorias: M[]): { periodo: string; ordem: number; memorias: number } {
  const ids = new Set([c.id, ...capitulos.filter((x) => x.dentroDe === c.id).map((x) => x.id)]);
  const dele = c.modo === 'epoca' ? memorias.filter((m) => memoriaDoCapitulo(m, c)) : memorias.filter((m) => m.capitulos.some((id) => ids.has(id)));
  const p = c.modo === 'epoca' ? (c.inicio ? { inicio: c.inicio, fim: c.fim } : null) : periodoDasMemorias(dele);
  return {
    periodo: p ? formatarPeriodo(p.inicio, p.fim, c.modo === 'epoca', c.modo === 'epoca') : '',
    // O dia do capítulo por período entra como fração, para dois do mesmo mês seguirem a ordem do dia
    ordem: p ? p.inicio.ano * 100 + (p.inicio.mes ?? 0) + (c.modo === 'epoca' && p.inicio.mes ? (p.inicio.dia ?? 0) / 100 : 0) : 999999,
    memorias: dele.length,
  };
}
