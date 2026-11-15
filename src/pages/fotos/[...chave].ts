// Entrega as fotos do bucket, que é privado. Cada pedido confere se a pessoa
// pode ver a memória a que a foto pertence.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { podeVerFoto } from '../../lib/servidor/repositorio';

const CHAVE_VALIDA = /^\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
const naoEncontrada = () => new Response('Foto não encontrada', { status: 404 });

export const GET: APIRoute = async ({ params, request, locals }) => {
  const chave = params.chave ?? '';
  if (!CHAVE_VALIDA.test(chave)) return naoEncontrada();
  // Quem não pode ver recebe a mesma resposta de uma foto que não existe
  if (!(await podeVerFoto(locals.usuario, chave))) return naoEncontrada();

  const objeto = await env.FOTOS.get(chave, { onlyIf: request.headers });
  if (!objeto) return naoEncontrada();

  const headers = new Headers();
  objeto.writeHttpMetadata(headers);
  headers.set('ETag', objeto.httpEtag);
  // O navegador guarda a foto, mas confere a permissão de novo a cada uso
  headers.set('Cache-Control', 'private, no-cache');
  headers.set('X-Content-Type-Options', 'nosniff');

  if (!('body' in objeto)) return new Response(null, { status: 304, headers });
  return new Response(objeto.body, { headers });
};
