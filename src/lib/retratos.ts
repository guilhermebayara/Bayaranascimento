// Foto de retrato do cadastro da pessoa (decisão do Gui, 16/11/2026). Funções puras, usadas pelo
// servidor, pelo navegador e pelos testes.
//
// O retrato é só por envio de foto nova: o navegador recorta um quadrado (a pessoa arrasta e aproxima)
// e reduz para LADO_DO_RETRATO antes de enviar. O arquivo fica no bucket das fotos, debaixo de
// "retratos/", e a chave fica em integrantes.retrato (migração 016). Trocar ou tirar não apaga o
// arquivo antigo: a chave anterior fica nas versões guardadas do cadastro.

import { formatoDaCopia, medidaDaImagem } from './copias-das-fotos';

/** Lado do quadrado enviado, em pixels: sobra para a página da pessoa em tela grande. */
export const LADO_DO_RETRATO = 800;
export const QUALIDADE_DO_RETRATO = 0.85;
/** Um quadrado de 800 px em JPEG fica perto de 150 KB. O limite só barra o que não veio do recorte. */
export const LIMITE_DO_RETRATO = 2 * 1024 * 1024;
/** Quanto dá para aproximar no recorte, a partir da foto inteira cobrindo o quadrado. */
export const ZOOM_MAXIMO = 4;

/** A chave é sempre gerada pelo site: um código aleatório e a extensão. Nada de caminho vindo de fora. */
export const CHAVE_DE_RETRATO = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
export const PASTA_DOS_RETRATOS = 'retratos/';

// --- A cópia pequena do retrato (sessão D1c, decisão do Gui de 23/11/2026) ---
// No envio, o navegador faz, além do quadrado de 800 px, uma cópia de LADO_DA_COPIA_DO_RETRATO, em WebP onde
// sabe gerar e em JPEG onde não sabe (o Safari do iPhone). Ela mora no bucket ao lado da original, com nome
// próprio ("retratos/<código>.pequeno.webp"), e passa pela rota da original (/retratos/pequeno/<chave>), com
// a mesma conferência: quem não vê o retrato recebe a mesma recusa na cópia. Sem cópia, a rota entrega a
// original. O retrato de exemplo usa a cópia pequena da foto de exemplo (480 px no lado menor).

/**
 * O lado da cópia, em pixels. O maior retrato de lista é o de "Quem estava" na memória, no celular: 106 ×
 * 132 px na tela. A foto é um quadrado que cobre o retângulo de 4 por 5 pela altura, então em densidade 3 ela
 * precisa de 132 × 3 = 396 px. Os retratos grandes (a página da pessoa, a do laço e "Sua conta") pedem a
 * original quando a cópia não basta (fontesDoRetrato).
 */
export const LADO_DA_COPIA_DO_RETRATO = 400;
export const QUALIDADE_DA_COPIA_DO_RETRATO = { webp: 0.82, jpg: 0.85 } as const;
/** Uma cópia de 400 px fica perto de 30 KB. O limite só barra o que não veio do navegador. */
export const LIMITE_DA_COPIA_DO_RETRATO = 300 * 1024;

export type FormatoDaCopiaDoRetrato = 'webp' | 'jpg';

/** O que o banco guarda da cópia de um retrato (retratos_enviados.copia, migração 111). */
export interface CopiaDoRetrato {
  formato: FormatoDaCopiaDoRetrato;
  lado: number;
  bytes: number;
}

/** O endereço do retrato nas telas: a cópia pequena, que a rota troca pela original quando não há cópia. */
export const enderecoDoRetrato = (chave: string) => `/retratos/pequeno/${chave}`;
/** O endereço da original: o ajuste da Administração e os retratos grandes, quando a cópia não basta. */
export const enderecoDoRetratoInteiro = (chave: string) => `/retratos/${chave}`;

/** Lê o caminho depois de /retratos/: "pequeno/<chave>" é a cópia de "<chave>". */
export function lerCaminhoDoRetrato(caminho: string): { chave: string; pequeno: boolean } {
  return caminho.startsWith('pequeno/') ? { chave: caminho.slice('pequeno/'.length), pequeno: true } : { chave: caminho, pequeno: false };
}

/**
 * O nome da cópia no bucket, dentro de "retratos/". Nunca é o nome de uma original: a original é o código e a
 * extensão (CHAVE_DE_RETRATO), e a cópia tem "pequeno" no meio.
 */
export function chaveDaCopiaDoRetrato(chave: string, formato: FormatoDaCopiaDoRetrato): string {
  const base = /^([0-9a-f-]{36})\.(jpg|png|webp)$/.exec(chave)?.[1];
  if (!base) throw new Error(`Chave de retrato inválida: ${chave}`);
  return `${base}.pequeno.${formato}`;
}

/** O lado da cópia de um retrato de lado × lado: nunca maior que ele. */
export const ladoDaCopiaDoRetrato = (lado: number) => Math.max(1, Math.min(LADO_DA_COPIA_DO_RETRATO, Math.round(lado)));

/** Lê retratos_enviados.copia. Qualquer coisa fora do formato vale como "sem cópia": a rota usa a original. */
export function lerCopiaDoRetrato(texto: unknown): CopiaDoRetrato | null {
  if (typeof texto !== 'string' || !texto) return null;
  try {
    const c = JSON.parse(texto) as Partial<CopiaDoRetrato>;
    if ((c.formato !== 'webp' && c.formato !== 'jpg') || !Number.isInteger(c.lado) || (c.lado ?? 0) <= 0) return null;
    return { formato: c.formato, lado: c.lado!, bytes: Number(c.bytes) || 0 };
  } catch {
    return null;
  }
}

/**
 * Confere a cópia que chegou com um retrato: WebP ou JPEG, quadrada e do lado esperado para a original
 * (com 2 px de folga para o arredondamento de cada navegador). Devolve o que o banco guarda, ou o motivo.
 */
export function conferirCopiaDoRetrato(original: Uint8Array, copia: Uint8Array): { copia: CopiaDoRetrato } | { erro: string } {
  const formato = formatoDaCopia(copia);
  if (!formato) return { erro: 'A cópia do retrato precisa ser WebP ou JPEG.' };
  if (copia.byteLength > LIMITE_DA_COPIA_DO_RETRATO) return { erro: 'A cópia do retrato é grande demais.' };
  const daOriginal = medidaDaImagem(original);
  const medida = medidaDaImagem(copia);
  if (!daOriginal || !medida) return { erro: 'Não consegui ler o tamanho do retrato.' };
  const esperado = ladoDaCopiaDoRetrato(Math.min(daOriginal[0], daOriginal[1]));
  if (Math.abs(medida[0] - esperado) > 2 || Math.abs(medida[1] - esperado) > 2) return { erro: 'A cópia do retrato não tem o tamanho esperado.' };
  return { copia: { formato, lado: medida[0], bytes: copia.byteLength } };
}

export const gravarCopiaDoRetrato = (c: CopiaDoRetrato) => JSON.stringify({ formato: c.formato, lado: c.lado, bytes: c.bytes });

/** As fontes do <img> de um retrato. */
export interface FontesDoRetrato {
  src: string;
  srcset?: string;
  sizes?: string;
}

/**
 * O que vai no <img> do retrato. Os retratos de lista e o do topo usam só a cópia. Os grandes (`grande`: a
 * página da pessoa, a do laço e "Sua conta", até 300 px de altura na tela) dizem ao navegador as duas: a
 * cópia na TV e no computador comum, a original no celular, onde a cópia ficaria borrada. O quadrado cobre o
 * retângulo pela altura, então `sizes` é a altura do retrato na tela.
 */
export function fontesDoRetrato(endereco: string, grande = false): FontesDoRetrato {
  if (!grande || !endereco.startsWith('/retratos/pequeno/')) return { src: endereco };
  const inteiro = `/retratos/${endereco.slice('/retratos/pequeno/'.length)}`;
  return { src: endereco, srcset: `${endereco} ${LADO_DA_COPIA_DO_RETRATO}w, ${inteiro} ${LADO_DO_RETRATO}w`, sizes: '300px' };
}

/** Confere os primeiros bytes: o tipo informado pelo navegador não vale. */
export function formatoDoRetrato(bytes: Uint8Array): { tipo: string; extensao: 'jpg' | 'png' | 'webp' } | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { tipo: 'image/jpeg', extensao: 'jpg' };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { tipo: 'image/png', extensao: 'png' };
  const texto = String.fromCharCode(...bytes.slice(0, 12));
  if (texto.startsWith('RIFF') && texto.slice(8, 12) === 'WEBP') return { tipo: 'image/webp', extensao: 'webp' };
  return undefined;
}

const LIGACOES = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/** As iniciais de quem ainda não tem retrato: a primeira e a última palavra do nome ("Vó Bela" → "VB"). */
export function iniciais(nome: string): string {
  const palavras = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p && !LIGACOES.has(p.toLowerCase()));
  if (palavras.length === 0) return '?';
  const primeira = (p: string) => [...p][0]!.toUpperCase();
  return palavras.length === 1 ? primeira(palavras[0]!) : primeira(palavras[0]!) + primeira(palavras[palavras.length - 1]!);
}

export interface Enquadramento {
  /** 1 é a foto inteira cobrindo o quadrado pelo lado menor */
  zoom: number;
  /** canto de cima à esquerda da foto, em relação ao quadrado, em pixels de tela */
  x: number;
  y: number;
}

/** A escala da foto na tela para um zoom: com zoom 1, o lado menor da foto ocupa o quadrado. */
export const escalaDoEnquadramento = (largura: number, altura: number, quadrado: number, zoom: number) => (quadrado / Math.min(largura, altura)) * zoom;

/** Segura a foto dentro do quadrado: nunca sobra fundo vazio num canto. */
export function ajustarEnquadramento(largura: number, altura: number, quadrado: number, e: Enquadramento): Enquadramento {
  const zoom = Math.min(ZOOM_MAXIMO, Math.max(1, e.zoom));
  const escala = escalaDoEnquadramento(largura, altura, quadrado, zoom);
  const prender = (valor: number, tamanho: number) => Math.min(0, Math.max(quadrado - tamanho * escala, valor));
  return { zoom, x: prender(e.x, largura), y: prender(e.y, altura) };
}

/** Começa com a foto centralizada e inteira no lado menor. */
export function enquadramentoInicial(largura: number, altura: number, quadrado: number): Enquadramento {
  const escala = escalaDoEnquadramento(largura, altura, quadrado, 1);
  return { zoom: 1, x: (quadrado - largura * escala) / 2, y: (quadrado - altura * escala) / 2 };
}

/**
 * Muda o zoom mantendo parado o ponto do meio do quadrado, como num celular. Já devolve ajustado.
 */
export function aproximar(largura: number, altura: number, quadrado: number, e: Enquadramento, zoom: number): Enquadramento {
  const antes = escalaDoEnquadramento(largura, altura, quadrado, e.zoom);
  const novoZoom = Math.min(ZOOM_MAXIMO, Math.max(1, zoom));
  const depois = escalaDoEnquadramento(largura, altura, quadrado, novoZoom);
  const meio = quadrado / 2;
  // O ponto da foto que está no meio do quadrado continua no meio
  const fx = (meio - e.x) / antes;
  const fy = (meio - e.y) / antes;
  return ajustarEnquadramento(largura, altura, quadrado, { zoom: novoZoom, x: meio - fx * depois, y: meio - fy * depois });
}

/** O pedaço da foto original que vira o retrato, em pixels da foto. Sempre um quadrado dentro dela. */
export function recorteDaFoto(largura: number, altura: number, quadrado: number, e: Enquadramento): { x: number; y: number; lado: number } {
  const certo = ajustarEnquadramento(largura, altura, quadrado, e);
  const escala = escalaDoEnquadramento(largura, altura, quadrado, certo.zoom);
  const lado = Math.min(quadrado / escala, largura, altura);
  const x = Math.min(largura - lado, Math.max(0, -certo.x / escala));
  const y = Math.min(altura - lado, Math.max(0, -certo.y / escala));
  return { x, y, lado };
}

/** A proporção do retrato no site, largura por altura (`.retrato`, em src/visual/pecas.css: 4 por 5). */
export const PROPORCAO_DO_RETRATO = 4 / 5;

/**
 * O retângulo em que o retrato aparece no site, dentro do quadro de enquadrar (resposta do Gui à P119,
 * 17/11/2026; o retrato de foto de álbum, 18/11/2026). O arquivo guardado é o quadrado inteiro; o site
 * mostra a altura toda e a faixa do meio da largura. O quadro desenha este retângulo por cima, com as
 * cantoneiras, e o que fica de fora, mais apagado: o que a pessoa enquadra é o que ela vê depois.
 */
export function quadroDoRetrato(quadrado: number): { x: number; y: number; largura: number; altura: number; cantoneira: number } {
  const largura = quadrado * PROPORCAO_DO_RETRATO;
  return { x: (quadrado - largura) / 2, y: 0, largura, altura: quadrado, cantoneira: Math.min(32, largura * 0.06 + 6) };
}
