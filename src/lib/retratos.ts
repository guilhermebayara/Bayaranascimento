// Foto de retrato do cadastro da pessoa (decisão do Gui, 16/11/2026). Funções puras, usadas pelo
// servidor, pelo navegador e pelos testes.
//
// O retrato é só por envio de foto nova: o navegador recorta um quadrado (a pessoa arrasta e aproxima)
// e reduz para LADO_DO_RETRATO antes de enviar. O arquivo fica no bucket das fotos, debaixo de
// "retratos/", e a chave fica em integrantes.retrato (migração 016). Trocar ou tirar não apaga o
// arquivo antigo: a chave anterior fica nas versões guardadas do cadastro.

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

export const enderecoDoRetrato = (chave: string) => `/retratos/${chave}`;

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
 * O arco em que o retrato aparece no site, dentro do quadro de enquadrar (resposta do Gui à P119,
 * 17/11/2026). O arquivo guardado é o quadrado inteiro; o site mostra a altura toda e a faixa do meio
 * da largura, com o alto arredondado. O quadro desenha este arco por cima, e o que fica de fora, mais
 * apagado: o que a pessoa enquadra é o que ela vê depois.
 */
export function arcoDoRetrato(quadrado: number): { x: number; y: number; largura: number; altura: number; raio: number } {
  const largura = quadrado * PROPORCAO_DO_RETRATO;
  return { x: (quadrado - largura) / 2, y: 0, largura, altura: quadrado, raio: largura / 2 };
}
