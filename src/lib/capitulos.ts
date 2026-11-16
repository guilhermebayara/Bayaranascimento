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
const curta = (d: DataSolta) => (d.mes ? `${MESES[d.mes - 1]} de ${d.ano}` : String(d.ano));

/** "2019 a 2021", "mar de 2020 em diante", "2026". */
export function formatarPeriodo(inicio: DataSolta | null, fim: DataSolta | null, aberto = false): string {
  if (!inicio) return '';
  if (!fim) return aberto ? `${curta(inicio)} em diante` : curta(inicio);
  const a = curta(inicio);
  const b = curta(fim);
  return a === b ? a : `${a} a ${b}`;
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

/** Editar um capítulo: quem criou e quem tem memórias nele. */
export function podeEditarCapitulo(usuario: QuemOlha, c: Pick<Capitulo, 'visibilidade' | 'nucleos' | 'criadoPor'>, autoresDasMemorias: string[]): boolean {
  if (!podeVerCapitulo(usuario, c)) return false;
  return c.criadoPor === usuario.pessoa || autoresDasMemorias.includes(usuario.pessoa);
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
