// Transcrição automática dos áudios (onda 2, decisão do Gui de 17/11/2026): Whisper no Workers AI, só se
// couber na cota gratuita. A transcrição entra como rascunho, na caixa da transcrição do próprio
// formulário do relato, e quem registrou revisa antes de salvar. Testado em testes/transcricao.test.ts.
//
// A cota (documentação do Cloudflare, "Workers AI, Pricing", conferida em 18/11/2026): 10.000 neurônios
// por dia de graça, no plano gratuito e no pago. No plano gratuito, passar da cota faz o pedido falhar,
// sem cobrança; no Workers Paid, o que passa é cobrado (US$ 0,011 por mil neurônios). O
// whisper-large-v3-turbo gasta 46,63 neurônios por minuto de áudio: cerca de 214 minutos por dia cabem na
// cota. O site para antes, num teto próprio por dia, para nunca chegar perto dela, mesmo que o plano mude.
//
// Fica desligada de dois jeitos, e precisa dos dois para ligar: o binding "AI" no wrangler.jsonc (hoje
// não está) e o ajuste "transcricao-automatica", que os administradores ligam em Administração.

export const MODELO_DE_TRANSCRICAO = '@cf/openai/whisper-large-v3-turbo';
/** Neurônios por minuto de áudio do modelo (documentação do Cloudflare) */
export const NEURONIOS_POR_MINUTO = 46.63;
/** A cota gratuita do Workers AI, por dia */
export const COTA_GRATUITA_POR_DIA = 10_000;
/** O teto do site, em minutos por dia: 150 minutos são cerca de 7.000 neurônios, bem abaixo da cota */
export const TETO_DE_MINUTOS_POR_DIA = 150;
/** O ajuste que os administradores ligam */
export const AJUSTE_DA_TRANSCRICAO = 'transcricao-automatica';
/** Um áudio maior que isso não vai inteiro para o modelo */
export const MAXIMO_POR_AUDIO = 25 * 1024 * 1024;

/**
 * Quantos minutos um áudio conta para o teto: a duração, quando se sabe; senão, a estimativa pelo
 * tamanho na taxa da gravação do site (32 kbps), sempre arredondada para cima.
 */
export function minutosDoAudio(duracaoEmSegundos: number | null, tamanhoEmBytes: number): number {
  if (duracaoEmSegundos && duracaoEmSegundos > 0) return Math.ceil(duracaoEmSegundos / 60);
  return Math.max(1, Math.ceil(tamanhoEmBytes / (32_000 / 8) / 60));
}

/** Cabe mais este áudio no teto do dia? */
export const cabeNoTeto = (usadosHoje: number, minutos: number, teto = TETO_DE_MINUTOS_POR_DIA): boolean => usadosHoje + minutos <= teto;

/** A chave do uso de um dia, nos ajustes: "transcricao-uso-2026-11-18" */
export const chaveDoUso = (hoje: Date): string => `transcricao-uso-${hoje.toISOString().slice(0, 10)}`;

/** O texto que volta do modelo, limpo: sem espaços sobrando. */
export function textoDaTranscricao(resposta: unknown): string {
  const texto = typeof resposta === 'object' && resposta && 'text' in resposta ? String((resposta as { text: unknown }).text ?? '') : '';
  return texto.replace(/\s+/g, ' ').trim();
}

/** Em que pé está, para a administração e para o formulário. */
export type SituacaoDaTranscricao = 'sem-binding' | 'desligada' | 'ligada';
export function situacaoDaTranscricao(temBinding: boolean, ajusteLigado: boolean): SituacaoDaTranscricao {
  if (!temBinding) return 'sem-binding';
  return ajusteLigado ? 'ligada' : 'desligada';
}
