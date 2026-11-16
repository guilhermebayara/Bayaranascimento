// Áudios nos relatos (decisão do Gui em "Decidido, a construir", liberada em 16/11/2026).
// Funções puras, testadas em testes/audios.test.ts.
//
// Espaço: os áudios dividem o bucket das fotos. Gravado no navegador a 32 kbps, um minuto de voz
// ocupa cerca de 240 KB; o iPhone pode gravar em qualidade maior, até cerca de 1 MB por minuto.
// O plano gratuito do R2 dá 10 GB por mês para a conta inteira (developers.cloudflare.com/r2/pricing,
// conferido em 16/11/2026): produção, homologação e prévias dividem esse espaço com as fotos.
// Por isso o teto da produção é 3 GB, e o da homologação e das prévias, que só servem para testar, 200 MB.

/** Uma gravação no site para sozinha neste tempo */
export const MINUTOS_POR_GRAVACAO = 15;
/** Taxa pedida ao gravador do navegador. Voz fica boa assim, e o arquivo, pequeno */
export const BITS_POR_SEGUNDO = 32_000;
/** Tamanho máximo de um arquivo de áudio, gravado ou enviado */
export const LIMITE_POR_ARQUIVO = 25 * 1024 * 1024;
/** Teto de todos os áudios juntos da produção, inclusive os removidos (que continuam no bucket) */
export const LIMITE_TOTAL = 3 * 1024 * 1024 * 1024;
/** Teto da homologação, das prévias e do computador: só para testar */
export const LIMITE_TOTAL_DE_TESTE = 200 * 1024 * 1024;

/** O teto de cada ambiente. Só a produção tem o espaço de verdade. */
export function limiteTotal(ambiente: string): number {
  return ambiente === 'producao' ? LIMITE_TOTAL : LIMITE_TOTAL_DE_TESTE;
}
/** Quantos áudios um relato pode ter */
export const AUDIOS_POR_RELATO = 20;

export interface FormatoDeAudio {
  tipo: string;
  extensao: 'webm' | 'ogg' | 'm4a' | 'mp3' | 'wav';
}

/** Confere os primeiros bytes do arquivo: o tipo informado pelo navegador não vale. */
export function formatoDoAudio(bytes: Uint8Array): FormatoDeAudio | undefined {
  const texto = (inicio: number, fim: number) => String.fromCharCode(...bytes.slice(inicio, fim));
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return { tipo: 'audio/webm', extensao: 'webm' };
  if (texto(0, 4) === 'OggS') return { tipo: 'audio/ogg', extensao: 'ogg' };
  if (texto(4, 8) === 'ftyp') return { tipo: 'audio/mp4', extensao: 'm4a' };
  if (texto(0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return { tipo: 'audio/mpeg', extensao: 'mp3' };
  if (texto(0, 4) === 'RIFF' && texto(8, 12) === 'WAVE') return { tipo: 'audio/wav', extensao: 'wav' };
  return undefined;
}

/** Chave do arquivo no bucket, debaixo de "audios/". A rota /audios/<ano>/<id>.<ext> serve. */
export const CHAVE_DE_AUDIO = /^\d{4}\/[0-9a-f-]{36}\.(webm|ogg|m4a|mp3|wav)$/;

/** Duração em texto curto: "45 s", "3 min", "1 h 05 min". */
export function duracaoEmTexto(segundos: number | null | undefined): string {
  if (!segundos || !Number.isFinite(segundos)) return '';
  const total = Math.round(segundos);
  if (total < 60) return `${total} s`;
  const minutos = Math.round(total / 60);
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, '0')} min`;
}

/** Cabe mais este arquivo dentro do teto? */
export function cabeNoLimite(totalAtual: number, tamanho: number, limite: number = LIMITE_TOTAL): boolean {
  return tamanho <= LIMITE_POR_ARQUIVO && totalAtual + tamanho <= limite;
}
