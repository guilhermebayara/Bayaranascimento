// As duas cópias menores de cada foto (sessão D1b, decisão 4 do Gui em docs/briefs/desempenho.md, 23/11/2026).
// Funções puras, usadas pelo navegador (que faz as cópias no envio), pelo servidor (que as guarda e
// entrega) e pelos testes.
//
// Cada foto do acervo continua guardada como chegou (até 2400 px, src/lib/cliente/fotos.ts). No envio, o
// navegador faz mais duas cópias: a pequena, com 480 px no lado menor, para o mural, a linha do tempo, a
// lista, o Início, a pessoa e o capítulo; e a média, com 1200 px no lado menor, para a memória e o palco do
// modo TV. WebP onde o navegador sabe gerar, JPEG onde não sabe (o Safari do iPhone).
//
// A cópia mora no bucket ao lado da original, com o nome dela e o tamanho: "2026/<código>.jpg" ganha
// "2026/<código>.pequena.webp" e "2026/<código>.media.webp". Ela é entregue pela mesma rota da original
// (/fotos/pequena/2026/<código>.jpg), que confere a permissão da original: quem não vê a foto não vê a
// cópia. Sem cópia, a tela usa a original, e a rota da cópia também cai na original: nunca uma foto quebrada.

import { copiasDeExemplo } from './fotos-de-exemplo';

export type Tamanho = 'pequena' | 'media';
export type FormatoDaCopia = 'webp' | 'jpg';
export const TAMANHOS: readonly Tamanho[] = ['pequena', 'media'];

/** O lado menor de cada cópia, em pixels. */
export const LADO_MENOR: Record<Tamanho, number> = { pequena: 480, media: 1200 };
/** O lado maior nunca passa disto: o dobro do lado menor, para panorâmica não virar cópia grande. */
const LADO_MAIOR: Record<Tamanho, number> = { pequena: 960, media: 2400 };
export const QUALIDADE_DA_COPIA: Record<FormatoDaCopia, number> = { webp: 0.8, jpg: 0.82 };
/** O teto de cada arquivo que o site aceita como cópia. Uma pequena fica perto de 50 KB; uma média, de 200 KB. */
export const LIMITE_DA_COPIA: Record<Tamanho, number> = { pequena: 400 * 1024, media: 3 * 1024 * 1024 };

export type Medida = [largura: number, altura: number];

/** O que o banco guarda de uma foto que já tem cópias (fotos.copias, migração 110). */
export interface Copias {
  formato: FormatoDaCopia;
  pequena: Medida;
  media: Medida;
  /** a medida da original, para a galeria escolher entre a média e a original */
  original?: Medida;
  /** os bytes das duas cópias juntas, para a conta do espaço */
  bytes: number;
}

/** A medida da cópia de uma foto de largura × altura. Nunca maior que a foto. */
export function medidaDaCopia(largura: number, altura: number, tamanho: Tamanho): Medida {
  const escala = Math.min(1, LADO_MENOR[tamanho] / Math.min(largura, altura), LADO_MAIOR[tamanho] / Math.max(largura, altura));
  return [Math.max(1, Math.round(largura * escala)), Math.max(1, Math.round(altura * escala))];
}

const FOTO = /^(\d{4}\/[0-9a-f-]{36})\.(jpg|png|webp)$/;
const EXEMPLO = /^(exemplos\/(?:chico|karol)-\d+)\.jpg$/;

/**
 * O nome da cópia no bucket. Nunca é o nome de uma original: a original termina em ".jpg", ".png" ou
 * ".webp" logo depois do código, e a cópia tem o tamanho no meio.
 */
export function chaveDaCopia(chave: string, tamanho: Tamanho, formato: FormatoDaCopia): string {
  const base = FOTO.exec(chave)?.[1] ?? EXEMPLO.exec(chave)?.[1];
  if (!base) throw new Error(`Chave de foto inválida: ${chave}`);
  return `${base}.${tamanho}.${formato}`;
}

/**
 * Os nomes de todas as cópias que uma foto pode ter no bucket: os dois tamanhos, nos dois formatos. A rota
 * das fotos sem memória (src/pages/api/fotos-soltas.ts) apaga a original e estas, e só estas: nomes que não
 * existem no bucket não fazem nada.
 */
export function chavesDasCopias(chave: string): string[] {
  return TAMANHOS.flatMap((tamanho) => (['webp', 'jpg'] as const).map((formato) => chaveDaCopia(chave, tamanho, formato)));
}

/** O endereço da foto no site: a original, ou a cópia, pela mesma rota. */
export const enderecoDaFoto = (chave: string, tamanho?: Tamanho) => (tamanho ? `/fotos/${tamanho}/${chave}` : `/fotos/${chave}`);

/** Lê o caminho depois de /fotos/: "pequena/2026/x.jpg" é a cópia pequena de "2026/x.jpg". */
export function lerCaminhoDaFoto(caminho: string): { chave: string; tamanho?: Tamanho } {
  const [primeiro, ...resto] = caminho.split('/');
  if (resto.length && TAMANHOS.includes(primeiro as Tamanho)) return { chave: resto.join('/'), tamanho: primeiro as Tamanho };
  return { chave: caminho };
}

/** Lê fotos.copias. Qualquer coisa fora do formato vale como "sem cópia": a tela usa a original. */
export function lerCopias(texto: unknown): Copias | null {
  if (typeof texto !== 'string' || !texto) return null;
  try {
    const c = JSON.parse(texto) as Partial<Copias>;
    const medida = (m: unknown): m is Medida => Array.isArray(m) && m.length === 2 && m.every((n) => Number.isInteger(n) && n > 0);
    if ((c.formato !== 'webp' && c.formato !== 'jpg') || !medida(c.pequena) || !medida(c.media)) return null;
    return { formato: c.formato, pequena: c.pequena, media: c.media, ...(medida(c.original) ? { original: c.original } : {}), bytes: Number(c.bytes) || 0 };
  } catch {
    return null;
  }
}

export const gravarCopias = (c: Copias) => JSON.stringify({ formato: c.formato, pequena: c.pequena, media: c.media, original: c.original, bytes: c.bytes });

// --- As medidas de um arquivo de imagem, pelos primeiros bytes ---

/** Largura e altura de um JPEG, PNG ou WebP, lidas do próprio arquivo. Nada, se não der para ler. */
export function medidaDaImagem(b: Uint8Array): Medida | undefined {
  const u16 = (i: number) => (b[i]! << 8) | b[i + 1]!;
  const le16 = (i: number) => b[i]! | (b[i + 1]! << 8);
  const le24 = (i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
  const texto = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  if (b.length < 30) return undefined;
  // PNG: o IHDR vem logo depois da assinatura
  if (b[0] === 0x89 && texto(1, 3) === 'PNG' && texto(12, 4) === 'IHDR') {
    const u32 = (i: number) => ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0;
    return [u32(16), u32(20)];
  }
  // WebP: com perda (VP8), sem perda (VP8L) ou estendido (VP8X)
  if (texto(0, 4) === 'RIFF' && texto(8, 4) === 'WEBP') {
    const bloco = texto(12, 4);
    if (bloco === 'VP8 ' && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) return [le16(26) & 0x3fff, le16(28) & 0x3fff];
    if (bloco === 'VP8L' && b[20] === 0x2f) return [1 + (((b[22]! & 0x3f) << 8) | b[21]!), 1 + (((b[24]! & 0x0f) << 10) | (b[23]! << 2) | ((b[22]! & 0xc0) >> 6))];
    if (bloco === 'VP8X') return [1 + le24(24), 1 + le24(27)];
    return undefined;
  }
  // JPEG: anda de marcador em marcador até o começo do quadro (SOF)
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return undefined;
      const marcador = b[i + 1]!;
      if (marcador === 0xff) {
        i += 1;
        continue;
      }
      if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) return [u16(i + 7), u16(i + 5)];
      if (marcador === 0xd8 || (marcador >= 0xd0 && marcador <= 0xd7) || marcador === 0x01) {
        i += 2;
        continue;
      }
      i += 2 + u16(i + 2);
    }
  }
  return undefined;
}

/** O formato de uma cópia pelos primeiros bytes. Só WebP e JPEG são cópia. */
export function formatoDaCopia(b: Uint8Array): FormatoDaCopia | undefined {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'webp';
  return undefined;
}

/**
 * Confere as duas cópias que chegaram com uma foto: o mesmo formato, o tamanho certo para cada uma e a
 * mesma proporção da original. Devolve o que o banco guarda, ou o motivo da recusa.
 */
export function conferirCopias(original: Uint8Array, pequena: Uint8Array, media: Uint8Array): { copias: Copias } | { erro: string } {
  const formato = formatoDaCopia(pequena);
  if (!formato || formatoDaCopia(media) !== formato) return { erro: 'As cópias precisam ser WebP ou JPEG, as duas no mesmo formato.' };
  if (pequena.byteLength > LIMITE_DA_COPIA.pequena || media.byteLength > LIMITE_DA_COPIA.media) return { erro: 'Uma das cópias é grande demais.' };
  const daOriginal = medidaDaImagem(original);
  const mp = medidaDaImagem(pequena);
  const mm = medidaDaImagem(media);
  if (!daOriginal || !mp || !mm) return { erro: 'Não consegui ler o tamanho das fotos.' };
  for (const [tamanho, medida] of [['pequena', mp], ['media', mm]] as const) {
    const esperada = medidaDaCopia(daOriginal[0], daOriginal[1], tamanho);
    // Uma folga de 2 px para o arredondamento de cada navegador
    if (Math.abs(medida[0] - esperada[0]) > 2 || Math.abs(medida[1] - esperada[1]) > 2) return { erro: `A cópia ${tamanho} não tem o tamanho esperado.` };
  }
  return { copias: { formato, pequena: mp, media: mm, original: daOriginal, bytes: pequena.byteLength + media.byteLength } };
}

// --- As fontes de uma foto na tela ---

/** Uma foto como as telas recebem: a chave e, quando já existem, as cópias. */
export interface FotoComCopias {
  chave: string;
  copias?: Copias | null;
}

export interface Fontes {
  src: string;
  srcset?: string;
  sizes?: string;
}

/**
 * A largura que as telas dizem ao navegador (`sizes`) para as fotos de lista, no celular, fica em 160 px no
 * máximo: o navegador pega a menor cópia que cobre a densidade da tela, e num celular de densidade 3,
 * 160 × 3 = 480 ainda é a pequena. A foto aparece com densidade de 2,4 a 2,6, nítida no celular. O mural
 * "Grandes" diz a largura de verdade e leva a média.
 */
export const LARGURA_MAXIMA_NO_CELULAR = 160;

/**
 * Como a foto é usada na tela:
 * - "pequena": as fotos de lista (mural, linha do tempo, lista, Início, pessoa, capítulo, as de trás da
 *   pilha). A pequena, e a média para quando a caixa é grande; `sizes` diz a largura da caixa na tela.
 * - "media": a foto principal da memória e o palco do modo TV.
 * - "inteira": a galeria em tela cheia. A média, e a original para a tela grande.
 */
export type Uso = Tamanho | 'inteira';

/**
 * O que vai no <img> de uma foto, numa peça só para todas as telas. Sem cópias, a original. A foto de
 * exemplo usa as cópias de COPIAS_DE_EXEMPLO.
 */
export function fontesDaFoto(foto: FotoComCopias, uso: Uso, sizes = '240px'): Fontes {
  // As fotos de exemplo (o Chico e a Karol) têm as cópias delas no bucket de teste
  const copias = foto.copias ?? copiasDeExemplo(foto.chave);
  if (!copias) return { src: enderecoDaFoto(foto.chave) };
  const media = enderecoDaFoto(foto.chave, 'media');
  if (uso === 'media') return { src: media };
  if (uso === 'inteira') {
    if (!copias.original) return { src: media };
    return { src: media, srcset: `${media} ${copias.media[0]}w, ${enderecoDaFoto(foto.chave)} ${copias.original[0]}w`, sizes: '100vw' };
  }
  const pequena = enderecoDaFoto(foto.chave, 'pequena');
  return { src: pequena, srcset: `${pequena} ${copias.pequena[0]}w, ${media} ${copias.media[0]}w`, sizes };
}
