// Funções puras do visual novo (docs/visual.md), usadas pelas telas do conceito e pelos testes.
import type { DataFlexivel } from './datas';

/** Um número fixo tirado de um texto (FNV-1a, 32 bits): o mesmo id sempre dá o mesmo resultado. */
function numeroDo(texto: string): number {
  let h = 0x811c9dc5;
  for (const c of texto) {
    h ^= c.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** As poucas inclinações da polaroid, em graus. */
export const GIROS = [-3, -1.5, 1, 2.5];

/** A inclinação da polaroid de uma memória: escolhida pelo id, para ficar sempre igual. */
export function giroDoId(id: string): number {
  return GIROS[numeroDo(`giro:${id}`) % GIROS.length]!;
}

/** A forma de cor atrás da foto: 0 círculo, 1 arco, 2 cápsula. Também pelo id. */
export function formaDoId(id: string): number {
  return numeroDo(`forma:${id}`) % 3;
}

/**
 * A cor de cada tipo de momento no visual novo: uma das onze cores do site, uma para cada tipo
 * de hoje (aprovado pelo Gui, 16/11/2026). As cores gravadas no banco (tabela tipos) continuam
 * as de hoje; na fase 2, esta paleta é aplicada em /admin/tipos. Tipo criado depois pelos
 * administradores ganha uma das onze, pelo id.
 */
export const CORES = ['manteiga', 'verde', 'rosa', 'roxo', 'azul', 'pessego', 'coral', 'turquesa', 'orquidea', 'ardosia', 'areia'] as const;
export type Cor = (typeof CORES)[number];

const COR_DO_TIPO: Record<string, Cor> = {
  nascimento: 'verde',
  aniversario: 'rosa',
  casamento: 'roxo',
  conquista: 'manteiga',
  viagem: 'azul',
  casa: 'pessego',
  festa: 'coral',
  causo: 'turquesa',
  cotidiano: 'areia',
  despedida: 'ardosia',
  outro: 'orquidea',
};

export function corDoTipo(tipo: string): Cor {
  return COR_DO_TIPO[tipo] ?? CORES[numeroDo(`tipo:${tipo}`) % CORES.length]!;
}

/**
 * As cores dos capítulos na linha do tempo, na ordem em que são dadas (a montagem garante que dois
 * capítulos que convivem nunca dividem a cor). As duas mais claras ficam por último.
 */
export const CORES_DOS_CAPITULOS: Cor[] = ['azul', 'coral', 'verde', 'roxo', 'turquesa', 'rosa', 'pessego', 'orquidea', 'ardosia', 'manteiga', 'areia'];

/** O estilo que leva a cor de um capítulo ao trilho dele e ao sinal dele em cada memória. */
export function estiloDoCapitulo(cor: number): string {
  const nome = CORES_DOS_CAPITULOS[cor % CORES_DOS_CAPITULOS.length]!;
  return `--trilho-cor: var(--${nome}-meio); --trilho-ponto: var(--${nome}-vivo)`;
}

/** O estilo que leva a cor do tipo a um trecho da página: o pastel, o vivo e a tinta dele. */
export function estiloDoTipo(tipo: string): string {
  const cor = corDoTipo(tipo);
  return `--tipo-pastel: var(--${cor}-pastel); --tipo-meio: var(--${cor}-meio); --tipo-cor: var(--${cor}-vivo); --tipo-tinta: var(--${cor}-tinta)`;
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** O dia e o mês como no carimbo do laboratório: "24 dez", "dez" ou vazio. A caixa alta é do CSS. */
export function diaMesCurto(d: Pick<DataFlexivel, 'mes' | 'dia'>): string {
  if (!d.mes) return '';
  const mes = MESES_CURTOS[d.mes - 1]!;
  return d.dia ? `${d.dia} ${mes}` : mes;
}

/** A data inteira do carimbo: "24 dez 2025", "dez 2025", "2025" ou "por volta de 1994". */
export function carimboDaData(d: DataFlexivel): string {
  const texto = [diaMesCurto(d), String(d.ano)].filter(Boolean).join(' ');
  return d.aproximada ? `por volta de ${texto}` : texto;
}

/** A legenda da foto: "Belo Horizonte (2025)". Sem lugar, só o ano. */
export function legendaLugarAno(lugar: string | null | undefined, ano: number): string {
  return lugar?.trim() ? `${lugar.trim()} (${ano})` : String(ano);
}

/** Uma lista de nomes que cabe numa linha: "Ana, Bia, Caio e mais 6". */
export function listaCurta(nomes: string[], maximo = 3): string {
  if (nomes.length <= maximo) return juntar(nomes, 'e');
  const resto = nomes.length - maximo;
  return `${nomes.slice(0, maximo).join(', ')} e mais ${resto}`;
}

function juntar(itens: string[], ligacao: string): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} ${ligacao} ${itens[itens.length - 1]}`;
}

/**
 * Os sobrenomes da assinatura para o que está sendo visto: sem repetir, na ordem dos núcleos
 * (a dos lados da árvore), com "&" antes do último ("Bayara, Bracarense & Silva").
 *
 * No conceito, os sobrenomes saem do nome de cada núcleo ("Bayara Bracarense" são dois).
 * Na fase 2, cada núcleo passa a dizer de quais famílias é feito, numa migração própria
 * (docs/decisoes.md, "Assinatura do nome"), e esta função recebe essa lista.
 */
export function sobrenomesDaAssinatura(nomesDosNucleos: string[]): string {
  const sobrenomes: string[] = [];
  for (const nome of nomesDosNucleos) {
    for (const parte of nome.trim().split(/\s+/)) {
      if (parte && !sobrenomes.includes(parte)) sobrenomes.push(parte);
    }
  }
  return juntar(sobrenomes, '&');
}

/**
 * A cor da tela: a da família do que está sendo visto. Com um núcleo só, a cor dele (pela
 * posição na ordem dos núcleos); com nenhum ou com vários, "tudo", as famílias juntas.
 */
export function familiaDaTela(nucleosDoQueSeVe: string[], ordemDosNucleos: string[]): string {
  if (nucleosDoQueSeVe.length !== 1) return 'tudo';
  const indice = ordemDosNucleos.indexOf(nucleosDoQueSeVe[0]!);
  return indice >= 0 ? String(indice % 4) : 'tudo';
}

/** O primeiro trecho de um relato, para a abertura da memória: até o fim da primeira ou da segunda frase. */
export function trechoDoRelato(texto: string, maximo = 150): string {
  const limpo = texto.trim().split(/\n{2,}/)[0]!.trim();
  if (limpo.length <= maximo) return limpo;
  const frases = limpo.match(/[^.!?…]+[.!?…]+/g) ?? [limpo];
  let trecho = '';
  for (const frase of frases) {
    if (trecho && (trecho + frase).length > maximo) break;
    trecho += frase;
  }
  if (trecho.length > maximo) return `${trecho.slice(0, maximo).replace(/\s+\S*$/, '')}…`;
  return trecho.trim();
}

export const COMBINACOES_DE_FONTES = [
  { id: 'a', nome: 'Macia', fontes: 'Fraunces, Geist, Geist Mono e Oooh Baby' },
  { id: 'b', nome: 'Editorial', fontes: 'Instrument Serif, Instrument Sans, IBM Plex Mono e Reenie Beanie' },
  { id: 'c', nome: 'De cartaz', fontes: 'DM Serif Display, DM Sans, DM Mono e Nothing You Could Do' },
] as const;

export type Fontes = (typeof COMBINACOES_DE_FONTES)[number]['id'];

export function fontesValidas(valor: string | null | undefined): Fontes {
  return COMBINACOES_DE_FONTES.find((c) => c.id === valor)?.id ?? 'a';
}
