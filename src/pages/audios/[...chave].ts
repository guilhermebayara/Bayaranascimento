// Entrega os áudios do bucket, que é privado. Cada pedido confere se a pessoa pode ouvir.
// Atende pedidos de trecho (Range): o Safari só toca áudio assim.
import type { APIRoute } from 'astro';
import { CHAVE_DE_AUDIO } from '../../lib/audios';
import { ehChaveDeAudioDeExemplo } from '../../lib/audios-de-exemplo';
import { bucketDeFotos, temAcervoDeExemplo } from '../../lib/servidor/ambiente';
import { podeOuvirAudio } from '../../lib/servidor/repositorio';

const naoEncontrado = () => new Response('Áudio não encontrado', { status: 404 });

export const GET: APIRoute = async ({ params, request, locals }) => {
  const chave = params.chave ?? '';
  // Os áudios de exemplo (voz sintetizada) só existem nas prévias de teste e no computador
  const deExemplo = temAcervoDeExemplo() && ehChaveDeAudioDeExemplo(chave);
  if (!CHAVE_DE_AUDIO.test(chave) && !deExemplo) return naoEncontrado();
  // Quem não pode ouvir recebe a mesma resposta de um áudio que não existe
  if (!(await podeOuvirAudio(locals.usuario, chave))) return naoEncontrado();

  const pedeTrecho = request.headers.has('Range');
  const objeto = await bucketDeFotos().get(`audios/${chave}`, pedeTrecho ? { range: request.headers } : { onlyIf: request.headers });
  if (!objeto) return naoEncontrado();

  const headers = new Headers();
  objeto.writeHttpMetadata(headers);
  headers.set('ETag', objeto.httpEtag);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'private, no-cache');
  headers.set('X-Content-Type-Options', 'nosniff');

  if (!('body' in objeto)) return new Response(null, { status: 304, headers });
  const trecho = objeto.range as { offset?: number; length?: number; suffix?: number } | undefined;
  if (pedeTrecho && trecho) {
    const inicio = trecho.suffix !== undefined ? objeto.size - trecho.suffix : (trecho.offset ?? 0);
    const tamanho = trecho.suffix !== undefined ? trecho.suffix : (trecho.length ?? objeto.size - inicio);
    headers.set('Content-Range', `bytes ${inicio}-${inicio + tamanho - 1}/${objeto.size}`);
    headers.set('Content-Length', String(tamanho));
    return new Response(objeto.body, { status: 206, headers });
  }
  headers.set('Content-Length', String(objeto.size));
  return new Response(objeto.body, { headers });
};
