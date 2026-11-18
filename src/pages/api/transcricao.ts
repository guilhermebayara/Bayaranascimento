// Transcrição automática de um áudio (onda 2; regras em src/lib/transcricao.ts). Só funciona com o binding
// "AI" no wrangler.jsonc e o ajuste ligado pelos administradores; hoje, nenhum dos dois. Só transcreve quem
// enviou o áudio ou registrou o relato dele, e o texto volta para a caixa da transcrição do formulário,
// como rascunho: só vale quando quem registrou revisa e salva o relato. Um teto por dia mantém o uso
// bem abaixo da cota gratuita do Workers AI.
import type { APIRoute } from 'astro';
import { MAXIMO_POR_AUDIO, MODELO_DE_TRANSCRICAO, cabeNoTeto, chaveDoUso, minutosDoAudio, textoDaTranscricao } from '../../lib/transcricao';
import { bucketDeFotos, modeloDeTranscricao } from '../../lib/servidor/ambiente';
import { erro, json, mesmaOrigem } from '../../lib/servidor/http';
import { audioParaTranscrever, salvarAjuste } from '../../lib/servidor/repositorio';
import { minutosUsadosHoje, situacaoDaTranscricaoAgora } from '../../lib/servidor/transcricao';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  if ((await situacaoDaTranscricaoAgora()) !== 'ligada') return erro(404, 'A transcrição automática não está ligada.');
  const modelo = modeloDeTranscricao();
  if (!modelo) return erro(404, 'A transcrição automática não está ligada.');
  let id = 0;
  try {
    id = Number((await request.json() as { audio?: unknown }).audio);
  } catch {
    return erro(400, 'Pedido inválido.');
  }
  const audio = await audioParaTranscrever(id, locals.usuario);
  if (!audio) return erro(404, 'Áudio não encontrado.');
  if (audio.tamanho > MAXIMO_POR_AUDIO) return erro(413, 'Este áudio é grande demais para a transcrição automática.');
  const minutos = minutosDoAudio(audio.duracao, audio.tamanho);
  const hoje = new Date();
  const usados = await minutosUsadosHoje(hoje);
  if (!cabeNoTeto(usados, minutos)) return erro(429, 'A transcrição automática chegou ao limite de hoje. Tente amanhã, ou escreva a transcrição.');
  const arquivo = await bucketDeFotos().get(`audios/${audio.chave}`);
  if (!arquivo) return erro(404, 'Áudio não encontrado.');
  // Anota o uso antes de chamar, para dois pedidos ao mesmo tempo não passarem juntos do teto
  await salvarAjuste(chaveDoUso(hoje), usados + minutos, locals.usuario);
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  let base64 = '';
  for (let i = 0; i < bytes.length; i += 0x8000) base64 += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  try {
    const resposta = await modelo.run(MODELO_DE_TRANSCRICAO, { audio: btoa(base64), language: 'pt' });
    const texto = textoDaTranscricao(resposta);
    if (!texto) return erro(422, 'Não consegui entender o áudio. Escreva a transcrição.');
    return json({ texto });
  } catch {
    return erro(502, 'A transcrição automática não respondeu agora. Tente de novo mais tarde.');
  }
};
