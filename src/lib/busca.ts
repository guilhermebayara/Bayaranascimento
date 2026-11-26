// A busca do site (a busca como porta, proposta B da exploração E2, docs/regras/explorar.md, "A busca"):
// a regra, sem tela e sem banco.
//
// Quem procura pensa em palavras ("Natal", "Sabará") e em gente ("minha mãe", "vó"), e não na organização
// do acervo. Uma caixa só acha no título, no lugar, nas pessoas (pelo nome, pelo apelido e pelo que cada
// uma é para quem procura), no capítulo, no tema, no tipo, no ano, no texto dos relatos publicados, nas
// transcrições dos áudios e na legenda das fotos. Sem diferença de acento e de maiúscula.
//
// Quem monta os documentos (src/lib/servidor/busca.ts) entrega só o que a pessoa vê: memória publicada
// que ela vê, pessoa que ela vê, relato que ela lê na página da memória, foto que ela vê. Nada aqui
// acrescenta memória, pessoa ou texto: o resultado, os trechos e as contagens saem sempre desses
// documentos.
import { normalizar, palavras } from './texto';

export { normalizar, palavras };

/** Onde a palavra foi achada. A ordem é a do peso: o título vale mais que o relato. */
export type Campo = 'titulo' | 'pessoa' | 'lugar' | 'capitulo' | 'tema' | 'tipo' | 'ano' | 'legenda' | 'relato' | 'audio';

export const PESOS: Record<Campo, number> = { titulo: 8, pessoa: 5, lugar: 5, capitulo: 3, tema: 3, tipo: 2, ano: 2, legenda: 2, relato: 1, audio: 1 };

/** Uma pessoa da memória como quem procura a vê: o nome de sempre e o que ela é para quem procura. */
export interface PessoaDaBusca {
  id: string;
  /** o nome com que aparece para quem procura (o apelido dele, o da família ou o nome) */
  nome: string;
  /** os outros nomes que acham a pessoa: o nome da ficha, o apelido da família */
  outrosNomes: string[];
  /** o parentesco de quem procura, já com o possessivo: "sua mãe"; "você" para a própria pessoa */
  parentesco?: string;
}

/** Um texto da memória além do título: o relato publicado, a transcrição de um áudio dele, a legenda de uma foto. */
export interface TextoDaBusca {
  campo: 'relato' | 'audio' | 'legenda';
  /** o nome de quem contou, para o trecho: "no relato de Giovanna" (na legenda, vazio) */
  por: string;
  texto: string;
}

/** Tudo o que acha uma memória, só com o que quem procura vê. */
export interface DocumentoDaBusca {
  id: string;
  titulo: string;
  ano: number;
  lugar: string | null;
  tipo: string | null;
  capitulos: string[];
  temas: string[];
  pessoas: PessoaDaBusca[];
  textos: TextoDaBusca[];
}

// --- Normalizar --------------------------------------------------------------------------------

/**
 * Palavras que não ajudam a achar: quem escreve "aquele Natal na casa da vó" procura "natal", "casa" e
 * "vó". O possessivo também cai ("minha mãe" é "mãe"): o parentesco já é do ponto de vista de quem
 * procura.
 */
export const PALAVRAS_VAZIAS = new Set(
  'a o as os da do das dos de na no nas nos em e um uma uns umas com que aquele aquela aqueles aquelas aquilo esse essa este esta isso isto meu minha meus minhas seu sua seus suas nosso nossa nossos nossas teu tua foi era quando pra para por pelo pela ao aos ou'.split(' '),
);

/** Outras formas de dizer o mesmo parentesco, como a família fala: avó também é "vó" e "vovó". */
const FORMAS_DO_PARENTESCO: Record<string, string[]> = {
  avo: ['vo', 'vovo'],
  bisavo: ['bisa', 'biso'],
  mae: ['mamae'],
  pai: ['papai'],
  tia: ['titia'],
  tio: ['titio'],
};

/** O que se procura: as palavras que contam, normalizadas, sem repetir. Até oito. */
export function termos(busca: string): string[] {
  const vistos = new Set<string>();
  for (const { palavra } of palavras(normalizar(busca))) if (!PALAVRAS_VAZIAS.has(palavra)) vistos.add(palavra);
  return [...vistos].slice(0, 8);
}

/** A busca do endereço (`q`): o texto aparado, com no máximo 80 letras. Vazio é sem busca. */
export function lerBusca(p: URLSearchParams): string {
  return (p.get('q') ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

/**
 * A palavra procurada acha a palavra do texto? Palavra curta (até duas letras, como "vó") precisa ser
 * inteira, senão "vo" acharia "voltou"; a partir de três letras vale o começo, para achar enquanto se
 * digita ("sab" acha "Sabará"). O ano precisa ser inteiro.
 */
export function acha(termo: string, palavra: string): boolean {
  if (termo.length <= 2 || /^\d+$/.test(termo)) return palavra === termo;
  return palavra.startsWith(termo) || singular(palavra).startsWith(singular(termo));
}

/**
 * O singular simples, para "natal" achar o capítulo "Natais" e "casamentos" achar "Casamento". Só as
 * terminações mais comuns do português; o que não reconhece fica como está.
 */
export function singular(palavra: string): string {
  if (palavra.length <= 3) return palavra;
  const trocas: [RegExp, string][] = [
    [/ais$/, 'al'],
    [/eis$/, 'el'],
    [/ois$/, 'ol'],
    [/uis$/, 'ul'],
    [/(oes|aes)$/, 'ao'],
    [/ns$/, 'm'],
    [/([rsz])es$/, '$1'],
    [/s$/, ''],
  ];
  for (const [de, para] of trocas) if (de.test(palavra)) return palavra.replace(de, para);
  return palavra;
}

/** A primeira palavra do texto que o termo acha, com a posição; ou nada. */
function achaNoTexto(termo: string, texto: string): { inicio: number; fim: number } | undefined {
  const normal = normalizar(texto);
  for (const p of palavras(normal)) if (acha(termo, p.palavra)) return { inicio: p.inicio, fim: p.inicio + p.palavra.length };
  return undefined;
}

const achaEmAlgum = (termo: string, textos: (string | null | undefined)[]) => textos.some((t) => t && achaNoTexto(termo, t));

/** As palavras de um parentesco ("sua avó") com as outras formas dele ("vó", "vovó"). */
function palavrasDoParentesco(parentesco: string): string[] {
  const base = palavras(normalizar(parentesco)).map((p) => p.palavra);
  return [...base, ...base.flatMap((p) => FORMAS_DO_PARENTESCO[p] ?? [])];
}

// --- Achar -------------------------------------------------------------------------------------

/** Por que a memória foi achada, para dizer na tela quando o título não basta. */
export type Motivo =
  | { campo: 'pessoa'; nome: string; parentesco?: string }
  | { campo: 'lugar' | 'capitulo' | 'tema' | 'tipo'; texto: string }
  | { campo: 'relato' | 'audio' | 'legenda'; por: string; trecho: Trecho };

/** Um pedaço do texto em volta da palavra achada, já cortado, com a palavra marcada. */
export interface Trecho {
  antes: string;
  achado: string;
  depois: string;
}

export interface Achado {
  id: string;
  /** quanto mais alto, mais a memória responde à busca (título vale mais que relato) */
  pontos: number;
  /** o que acha a memória fora do título, um por campo, na ordem do peso */
  motivos: Motivo[];
}

const TAMANHO_DO_TRECHO = 34;

/** O trecho em volta de [inicio, fim), cortado em palavra inteira, com reticências onde cortou. */
export function trechoEmVolta(texto: string, inicio: number, fim: number, folga = TAMANHO_DO_TRECHO): Trecho {
  let de = Math.max(0, inicio - folga);
  let ate = Math.min(texto.length, fim + folga);
  if (de > 0) {
    const espaco = texto.indexOf(' ', de);
    de = espaco >= 0 && espaco < inicio ? espaco + 1 : de;
  }
  if (ate < texto.length) {
    const espaco = texto.lastIndexOf(' ', ate);
    ate = espaco > fim ? espaco : ate;
  }
  const limpo = (s: string) => s.replace(/\s+/g, ' ');
  return {
    antes: (de > 0 ? '…' : '') + limpo(texto.slice(de, inicio)),
    achado: texto.slice(inicio, fim),
    depois: limpo(texto.slice(fim, ate)) + (ate < texto.length ? '…' : ''),
  };
}

/**
 * A memória responde à busca? Cada palavra procurada precisa ser achada em algum lugar da memória (o
 * "e" entre as palavras); dentro da memória, vale o lugar de mais peso. Devolve os pontos e o porquê, ou
 * nada quando alguma palavra não é achada.
 */
export function acharNaMemoria(doc: DocumentoDaBusca, procurados: string[]): Achado | undefined {
  if (procurados.length === 0) return undefined;
  let pontos = 0;
  const motivos = new Map<string, Motivo>();
  for (const termo of procurados) {
    let melhor: { campo: Campo; motivo?: Motivo } | undefined;
    const tentar = (campo: Campo, ok: boolean, motivo?: () => Motivo) => {
      if (ok && (!melhor || PESOS[campo] > PESOS[melhor.campo])) melhor = { campo, motivo: motivo?.() };
    };
    tentar('titulo', achaEmAlgum(termo, [doc.titulo]));
    for (const p of doc.pessoas) {
      const pelaPessoa = achaEmAlgum(termo, [p.nome, ...p.outrosNomes]) || (p.parentesco !== undefined && palavrasDoParentesco(p.parentesco).some((w) => acha(termo, w)));
      tentar('pessoa', pelaPessoa, () => ({ campo: 'pessoa', nome: p.nome, parentesco: p.parentesco }));
    }
    tentar('lugar', achaEmAlgum(termo, [doc.lugar]), () => ({ campo: 'lugar', texto: doc.lugar! }));
    for (const c of doc.capitulos) tentar('capitulo', achaEmAlgum(termo, [c]), () => ({ campo: 'capitulo', texto: c }));
    for (const t of doc.temas) tentar('tema', achaEmAlgum(termo, [t]), () => ({ campo: 'tema', texto: t }));
    tentar('tipo', achaEmAlgum(termo, [doc.tipo]), () => ({ campo: 'tipo', texto: doc.tipo! }));
    tentar('ano', /^\d{4}$/.test(termo) && String(doc.ano) === termo);
    if (!melhor || PESOS[melhor.campo] < PESOS.legenda) {
      // Só vale ler os textos quando nada de mais peso achou a palavra; a legenda pesa mais que o relato
      for (const t of [...doc.textos].sort((a, b) => PESOS[b.campo] - PESOS[a.campo])) {
        const onde = achaNoTexto(termo, t.texto);
        if (onde) {
          tentar(t.campo, true, () => ({ campo: t.campo, por: t.por, trecho: trechoEmVolta(t.texto, onde.inicio, onde.fim) }));
          break;
        }
      }
    }
    if (!melhor) return undefined;
    pontos += PESOS[melhor.campo];
    // Um motivo por campo e por pessoa: "com Vó Vivica" não se repete para "vó" e "vivica"
    if (melhor.motivo) {
      const chave = melhor.motivo.campo === 'pessoa' ? `pessoa:${melhor.motivo.nome}` : melhor.motivo.campo === 'relato' || melhor.motivo.campo === 'audio' || melhor.motivo.campo === 'legenda' ? 'texto' : melhor.motivo.campo;
      if (!motivos.has(chave)) motivos.set(chave, melhor.motivo);
    }
  }
  const ordem: Motivo['campo'][] = ['pessoa', 'lugar', 'capitulo', 'tema', 'tipo', 'legenda', 'relato', 'audio'];
  return { id: doc.id, pontos, motivos: [...motivos.values()].sort((a, b) => ordem.indexOf(a.campo) - ordem.indexOf(b.campo)) };
}

/** Todas as memórias que respondem à busca, das que mais respondem para as que menos. */
export function buscar(docs: DocumentoDaBusca[], busca: string): Achado[] {
  const procurados = termos(busca);
  if (procurados.length === 0) return [];
  return docs
    .map((d) => acharNaMemoria(d, procurados))
    .filter((a): a is Achado => Boolean(a))
    .sort((a, b) => b.pontos - a.pontos);
}

// --- Pessoas, capítulos e temas que a busca acha (o resultado agrupado) ---------------------------

export interface PessoaAchada {
  id: string;
  nome: string;
  parentesco?: string;
  /** em quantas das memórias que a pessoa vê ela está */
  memorias: number;
}

/**
 * As pessoas cujo nome, apelido ou parentesco responde a todas as palavras procuradas ("minha mãe",
 * "vivica", "vó"). Só entre as pessoas das memórias que quem procura vê.
 */
export function buscarPessoas(docs: DocumentoDaBusca[], busca: string): PessoaAchada[] {
  const procurados = termos(busca);
  if (procurados.length === 0) return [];
  const porId = new Map<string, PessoaAchada & { pessoa: PessoaDaBusca }>();
  for (const d of docs) for (const p of d.pessoas) {
    const ja = porId.get(p.id);
    if (ja) ja.memorias += 1;
    else porId.set(p.id, { id: p.id, nome: p.nome, parentesco: p.parentesco, memorias: 1, pessoa: p });
  }
  const responde = (p: PessoaDaBusca) => procurados.every((t) => achaEmAlgum(t, [p.nome, ...p.outrosNomes]) || (p.parentesco !== undefined && palavrasDoParentesco(p.parentesco).some((w) => acha(t, w))));
  return [...porId.values()]
    .filter((p) => responde(p.pessoa))
    .sort((a, b) => b.memorias - a.memorias || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map(({ pessoa: _, ...resto }) => resto);
}

/** Os nomes (de capítulo ou de tema) que respondem a todas as palavras procuradas. */
export function buscarNomes<T extends { id: string; nome: string }>(lista: T[], busca: string): T[] {
  const procurados = termos(busca);
  if (procurados.length === 0) return [];
  return lista.filter((x) => procurados.every((t) => achaEmAlgum(t, [x.nome])));
}

/** O que a tela diz do porquê, em texto corrido, sem o trecho: "com Vó Vivica, sua mãe", "em Sabará". */
export function textoDoMotivo(m: Motivo): string {
  switch (m.campo) {
    case 'pessoa':
      return m.parentesco && m.parentesco !== 'você' ? `com ${m.nome}, ${m.parentesco}` : `com ${m.nome}`;
    case 'lugar':
      return `em ${m.texto}`;
    case 'capitulo':
      return `no capítulo “${m.texto}”`;
    case 'tema':
      return `no tema “${m.texto}”`;
    case 'tipo':
      return m.texto;
    case 'relato':
      return `no relato de ${m.por}`;
    case 'audio':
      return `no áudio de ${m.por}`;
    case 'legenda':
      return 'na legenda de uma foto';
  }
}

/** A busca na ficha ligada do Explorar e no título da tela: entre aspas curvas. */
export const buscaEntreAspas = (busca: string) => `“${busca}”`;

// --- A consulta do índice (src/lib/servidor/busca.ts) ---------------------------------------------

/**
 * A expressão do FTS5 que acha os candidatos de um termo no índice da busca (migração 116). O índice tira
 * acento e maiúscula do mesmo jeito (tokenize unicode61 remove_diacritics 2), e a regra de cima (acha)
 * confere de novo cada candidato, com o texto de verdade: a expressão só precisa achar tudo o que acha
 * acharia, nunca menos. Por isso, além do começo da palavra, leva o singular e as formas do plural que
 * mudam o fim ("natal" acha "Natais"). Palavra curta e ano, inteiros, como em acha. O termo só tem letras
 * e números (termos), e cada forma vai entre aspas.
 */
export function consultaDoIndice(termo: string): string {
  // Entre aspas do FTS5, que são as do JSON para um termo só de letras e números
  const entreAspas = (forma: string) => JSON.stringify(forma);
  if (termo.length <= 2 || /^\d+$/.test(termo)) return entreAspas(termo);
  const s = singular(termo);
  const formas = new Set([termo, s]);
  const plurais: [RegExp, string[]][] = [
    [/al$/, ['ais']],
    [/el$/, ['eis']],
    [/ol$/, ['ois']],
    [/ul$/, ['uis']],
    [/ao$/, ['oes', 'aes']],
    [/m$/, ['ns']],
  ];
  for (const [fim, trocas] of plurais) if (fim.test(s)) for (const t of trocas) formas.add(s.replace(fim, t));
  return [...formas].map((f) => `${entreAspas(f)}*`).join(' OR ');
}

/**
 * O que a busca achou, numa frase: "6 memórias e 1 pessoa com “natal”", ou "Nada com “bicicleta”". É o que
 * a folha mostra no alto do resultado e o que o leitor de tela ouve quando a busca termina.
 */
export function resumoDaBusca({ busca, memorias, pessoas, nomes }: { busca: string; memorias: number; pessoas: number; nomes: number }): string {
  if (!busca) return '';
  const partes = [
    memorias > 0 && (memorias === 1 ? '1 memória' : `${memorias} memórias`),
    pessoas > 0 && (pessoas === 1 ? '1 pessoa' : `${pessoas} pessoas`),
    nomes > 0 && (nomes === 1 ? '1 capítulo ou tema' : `${nomes} capítulos e temas`),
  ].filter((p): p is string => Boolean(p));
  if (partes.length === 0) return `Nada com ${buscaEntreAspas(busca)}`;
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}` : partes[0];
  return `${lista} com ${buscaEntreAspas(busca)}`;
}
