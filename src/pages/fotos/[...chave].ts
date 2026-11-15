// Entrega as fotos do bucket. O bucket é privado: só quem passou pelo login chega aqui.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { temLoginValido } from '../../lib/servidor/acesso';

export const prerender = false;

const CHAVE_VALIDA = /^\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export const GET: APIRoute = async ({ params, request }) => {
  const chave = params.chave ?? '';
  if (!CHAVE_VALIDA.test(chave)) return new Response('Foto não encontrada', { status: 404 });

  // O domínio já fica atrás do login. Conferimos de novo aqui por garantia.
  if (!(await temLoginValido(request))) return new Response('Entre no site para ver as fotos', { status: 401 });

  const objeto = await env.FOTOS.get(chave, { onlyIf: request.headers });
  if (!objeto) return new Response('Foto não encontrada', { status: 404 });

  const headers = new Headers();
  objeto.writeHttpMetadata(headers);
  headers.set('ETag', objeto.httpEtag);
  // "private": o navegador de quem está logado guarda a foto, servidores intermediários não
  headers.set('Cache-Control', 'private, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');

  if (!('body' in objeto)) return new Response(null, { status: 304, headers });
  return new Response(objeto.body, { headers });
};
