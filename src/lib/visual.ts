// Funções puras do sistema visual (docs/visual.md, "Sistema"), usadas pelas telas e pelos testes.
import type { DataFlexivel } from './datas';
import { LARGURAS_DAS_LETRAS } from '../visual/medidas-das-serifas';

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
 * As onze cores aprovadas pelo Gui em 16/11/2026: servem às famílias, aos capítulos e aos tipos de
 * momento de sempre. Tipo sem cor escolhida ganha uma delas, pelo id.
 */
export const CORES = ['manteiga', 'verde', 'rosa', 'roxo', 'azul', 'pessego', 'coral', 'turquesa', 'orquidea', 'ardosia', 'areia'] as const;
export type Cor = (typeof CORES)[number];

/**
 * A paleta ampliada (resposta do Gui à pergunta 11 do PR #38, 17/11/2026): as onze e mais doze, para
 * os administradores escolherem a cor de cada tipo de momento em /admin/tipos. Os valores estão em
 * src/visual/tokens.css, nos quatro tons de sempre, com o contraste conferido em testes/paleta.test.ts.
 * PROVISÓRIO (pergunta 1 do PR dos tipos): as doze cores novas e os nomes delas.
 */
export const CORES_NOVAS = ['limao', 'oliva', 'menta', 'musgo', 'ceu', 'petroleo', 'anil', 'uva', 'ameixa', 'cereja', 'terracota', 'cacau'] as const;
export const PALETA = [...CORES, ...CORES_NOVAS] as const;
export type CorDaPaleta = (typeof PALETA)[number];

/** O nome de cada cor, como a pessoa lê na grade de /admin/tipos e em /sistema. */
export const NOMES_DAS_CORES: Record<CorDaPaleta, string> = {
  manteiga: 'Manteiga',
  verde: 'Verde',
  rosa: 'Rosa',
  roxo: 'Roxo',
  azul: 'Azul',
  pessego: 'Pêssego',
  coral: 'Coral',
  turquesa: 'Turquesa',
  orquidea: 'Orquídea',
  ardosia: 'Ardósia',
  areia: 'Areia',
  limao: 'Limão',
  oliva: 'Oliva',
  menta: 'Menta',
  musgo: 'Musgo',
  ceu: 'Céu',
  petroleo: 'Petróleo',
  anil: 'Anil',
  uva: 'Uva',
  ameixa: 'Ameixa',
  cereja: 'Cereja',
  terracota: 'Terracota',
  cacau: 'Cacau',
};

export const ehCorDaPaleta = (nome: string | null | undefined): nome is CorDaPaleta => (PALETA as readonly string[]).includes(nome ?? '');

/** A cor de cada tipo de momento de sempre (aprovado pelo Gui, 16/11/2026). */
export const COR_DO_TIPO: Record<string, Cor> = {
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

/** A cor de um tipo que ninguém escolheu: a de sempre, ou uma das onze, pelo id. */
export function corDeReserva(tipo: string): Cor {
  return COR_DO_TIPO[tipo] ?? CORES[numeroDo(`tipo:${tipo}`) % CORES.length]!;
}

/**
 * O que os administradores escolheram para cada tipo em /admin/tipos: a cor da paleta e o rabisco.
 * A lista vive no banco; quem a entrega é o servidor, a cada pedido (src/middleware.ts chama
 * lerEscolhasDe uma vez, apontando para os tipos do pedido em curso). Sem lista (nos testes, no
 * navegador), vale a reserva: a cor e o rabisco de sempre.
 */
export interface EscolhaDoTipo {
  id: string;
  corDaPaleta?: string | null;
  icone?: string | null;
}
let escolhas: () => readonly EscolhaDoTipo[] | undefined = () => undefined;
export function lerEscolhasDe(fonte: () => readonly EscolhaDoTipo[] | undefined): void {
  escolhas = fonte;
}
const escolhaDo = (tipo: string) => escolhas()?.find((t) => t.id === tipo);

/** A cor de um tipo de momento: a que os administradores escolheram ou, sem escolha, a de reserva. */
export function corDoTipo(tipo: string): CorDaPaleta {
  const escolhida = escolhaDo(tipo)?.corDaPaleta;
  return ehCorDaPaleta(escolhida) ? escolhida : corDeReserva(tipo);
}

/**
 * O rabisco de um tipo de momento (src/visual/rabiscos.ts): o que os administradores escolheram ou,
 * sem escolha, o de sempre (o tipo de hoje tem o rabisco com o nome dele; o criado depois, o brilho).
 * Quem confere se o nome existe é o IconeDoTipo, que cai no brilho.
 */
export function iconeDoTipo(tipo: string): string {
  return escolhaDo(tipo)?.icone || tipo;
}

/** O estilo que leva uma cor da paleta a um trecho da página, nos papéis do tipo de momento. */
export function estiloDaCor(cor: string): string {
  return `--tipo-pastel: var(--${cor}-pastel); --tipo-meio: var(--${cor}-meio); --tipo-cor: var(--${cor}-vivo); --tipo-tinta: var(--${cor}-tinta)`;
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
  return estiloDaCor(corDoTipo(tipo));
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
/** A década como se fala: "Anos 90"; de 2000 em diante, com o ano inteiro ("Anos 2010"). */
export function nomeDaDecada(decada: number): { rotulo: string; numero: string } {
  return { rotulo: 'Anos', numero: decada >= 1900 && decada < 2000 ? String(decada % 100).padStart(2, '0') : String(decada) };
}

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

/** O que a assinatura precisa saber de cada núcleo: o nome e os sobrenomes de que ele é feito. */
export interface NucleoDaAssinatura {
  id: string;
  nome: string;
  /** As famílias de que o núcleo é feito ("Bayara Bracarense" são Bayara e Bracarense). Vazio: as palavras do nome. */
  sobrenomes?: string[];
}

export interface AssinaturaDaTela {
  /** A linha de baixo da assinatura: "Bayara & Bracarense", "Bayara", "Bayara, Bracarense & Silva" */
  sobrenomes: string;
  /** O nome por extenso, para o texto corrido e para quem não vê: "Memórias Bayara e Bracarense" */
  porExtenso: string;
  /** A cor da tela: 'tudo' ou a posição do núcleo na ordem das famílias ('0', '1', '2', '3') */
  familia: string;
}

/** Quantas famílias têm cor própria em tokens.css ([data-familia='0'] a [data-familia='3']). A quinta volta à primeira. */
export const CORES_DAS_FAMILIAS = 4;

const sobrenomesDoNucleo = (n: NucleoDaAssinatura): string[] =>
  (n.sobrenomes?.length ? n.sobrenomes : n.nome.trim().split(/\s+/)).map((s) => s.trim()).filter(Boolean);

/**
 * A assinatura e a cor da tela para o que está sendo visto (docs/visual.md, "Assinatura do nome").
 *
 * - Nenhum núcleo, ou nenhum conhecido: a família completa, com os sobrenomes de todos os núcleos.
 * - Um núcleo só: o nome dele, como é ("Bayara Bracarense"), e a cor dele. O "&" junta famílias,
 *   então só aparece quando a tela é de mais de uma (decisão do Gui, 16/11/2026).
 * - Vários núcleos: os sobrenomes deles sem repetir, na ordem dos núcleos (a dos lados da árvore),
 *   com vírgula entre eles e "&" antes do último ("Bayara, Bracarense & Silva").
 *
 * `nucleos` é a lista inteira, na ordem do banco. `doQueSeVe` são os ids dos núcleos da tela:
 * o núcleo filtrado na linha do tempo, os núcleos da memória ou do capítulo, as famílias da pessoa.
 */
export function assinaturaDaTela(doQueSeVe: string[], nucleos: NucleoDaAssinatura[]): AssinaturaDaTela {
  const vistos = nucleos.filter((n) => doQueSeVe.includes(n.id));
  let sobrenomes: string;
  let familia = 'tudo';
  if (vistos.length === 1) {
    sobrenomes = vistos[0]!.nome.trim();
    familia = String(nucleos.indexOf(vistos[0]!) % CORES_DAS_FAMILIAS);
  } else {
    const unicos: string[] = [];
    for (const nucleo of vistos.length ? vistos : nucleos) {
      for (const sobrenome of sobrenomesDoNucleo(nucleo)) if (!unicos.includes(sobrenome)) unicos.push(sobrenome);
    }
    sobrenomes = juntar(unicos, '&');
  }
  return { sobrenomes, porExtenso: porExtensoDaAssinatura(sobrenomes), familia };
}

/** No texto corrido e na aba do navegador, o nome vai por extenso: "Memórias Bayara e Bracarense". */
export function porExtensoDaAssinatura(sobrenomes: string): string {
  return `Memórias ${sobrenomes.replace(/ & /g, ' e ')}`;
}

/** A linha de sobrenomes que fecha na largura de "MEMÓRIAS": a medida de cada serifa foi tirada com ela. */
export const SOBRENOMES_DE_REFERENCIA = 'Bayara & Bracarense';

/** A largura de um texto em em, numa serifa do sistema, somando a largura de cada letra. */
export function larguraNaSerifa(texto: string, serifa: Fontes): number {
  const letras = LARGURAS_DAS_LETRAS[serifa];
  // Letra que a tabela não tem conta como um "n"
  return [...texto].reduce((soma, letra) => soma + (letras[letra] ?? letras.n!), 0);
}

/**
 * Quanto a linha de sobrenomes precisa encolher para caber na largura da página, em cada serifa.
 * Até a largura de "Bayara & Bracarense", nada (1). Uma linha mais longa, como a de três famílias,
 * encolhe na proporção, para nunca passar da largura de "MEMÓRIAS".
 */
export function encolheDaAssinatura(sobrenomes: string): Record<Fontes, number> {
  const de = (serifa: Fontes) => Math.min(1, Math.round((larguraNaSerifa(SOBRENOMES_DE_REFERENCIA, serifa) / larguraNaSerifa(sobrenomes, serifa)) * 1000) / 1000);
  return { a: de('a'), b: de('b'), c: de('c') };
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

/**
 * As fontes do sistema. São três combinações de licença livre (docs/visual.md), e cada uma tem as
 * quatro famílias de tipo do site, uma por papel: serifa nos títulos, grotesca no texto, mono nas
 * fichas e manuscrita na assinatura dos relatos. Os acertos de cada uma estão em src/visual/fontes.css.
 */
export const COMBINACOES_DE_FONTES = [
  { id: 'a', nome: 'Macia', serifa: 'Fraunces', grotesca: 'Geist', mono: 'Geist Mono', mao: 'Oooh Baby' },
  { id: 'b', nome: 'Editorial', serifa: 'Instrument Serif', grotesca: 'Instrument Sans', mono: 'IBM Plex Mono', mao: 'Reenie Beanie' },
  { id: 'c', nome: 'De cartaz', serifa: 'DM Serif Display', grotesca: 'DM Sans', mono: 'DM Mono', mao: 'Nothing You Could Do' },
] as const;

export type Fontes = (typeof COMBINACOES_DE_FONTES)[number]['id'];

/** Os quatro papéis do tipo. Nenhuma família aparece fora do seu papel. */
export const PAPEIS_DAS_FONTES = ['serifa', 'grotesca', 'mono', 'mao'] as const;
export type PapelDaFonte = (typeof PAPEIS_DAS_FONTES)[number];

/** De qual combinação vem a fonte de cada papel. */
export type FontesDoSite = Record<PapelDaFonte, Fontes>;

/** Uma combinação inteira: os quatro papéis com as fontes dela. */
export function combinacao(id: Fontes): FontesDoSite {
  return { serifa: id, grotesca: id, mono: id, mao: id };
}

/**
 * A FONTE DO SITE. Trocar é mudar esta linha, e mais nada.
 *
 * Uma combinação inteira: combinacao('a'), combinacao('b') ou combinacao('c').
 * Misturando: { ...combinacao('a'), mao: 'b' } usa a manuscrita da B com o resto da A.
 *
 * A escolha espera a Giovanna e o Magno (docs/visual.md). O monograma, o ícone do site e a largura
 * da assinatura acompanham a serifa escolhida sozinhos.
 */
export const FONTES_DO_SITE: FontesDoSite = combinacao('a');

/** A combinação pedida na faixa de teste, se for uma das três. */
export function combinacaoValida(valor: string | null | undefined): Fontes | null {
  return COMBINACOES_DE_FONTES.find((c) => c.id === valor)?.id ?? null;
}

/** A combinação a que estas fontes correspondem, quando os quatro papéis vêm da mesma. */
export function combinacaoDe(fontes: FontesDoSite): Fontes | null {
  return PAPEIS_DAS_FONTES.every((papel) => fontes[papel] === fontes.serifa) ? fontes.serifa : null;
}

/** Os atributos que levam as fontes a um trecho da página: data-serifa, data-grotesca, data-mono e data-mao. */
export function atributosDasFontes(fontes: FontesDoSite): Record<`data-${PapelDaFonte}`, Fontes> {
  return { 'data-serifa': fontes.serifa, 'data-grotesca': fontes.grotesca, 'data-mono': fontes.mono, 'data-mao': fontes.mao };
}

/** Como as fontes se chamam, para mostrar: "Fraunces, Geist, Geist Mono e Oooh Baby". */
export function nomesDasFontes(fontes: FontesDoSite): string {
  const de = (papel: PapelDaFonte) => COMBINACOES_DE_FONTES.find((c) => c.id === fontes[papel])![papel];
  return `${de('serifa')}, ${de('grotesca')}, ${de('mono')} e ${de('mao')}`;
}

/** A cor de um núcleo: a posição dele na ordem das famílias. Núcleo desconhecido: as famílias juntas. */
export function corDoNucleo(id: string | null | undefined, ordemDosNucleos: string[]): string {
  const indice = id ? ordemDosNucleos.indexOf(id) : -1;
  return indice >= 0 ? String(indice % CORES_DAS_FAMILIAS) : 'tudo';
}

/** A cor de uma pessoa, para o retrato sem foto: a do primeiro núcleo dela, na ordem das famílias. */
export function corDaPessoa(familiasDaPessoa: string[], ordemDosNucleos: string[]): string {
  return corDoNucleo(ordemDosNucleos.find((n) => familiasDaPessoa.includes(n)), ordemDosNucleos);
}
