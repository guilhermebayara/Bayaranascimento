// Entrega as fotos de retrato do bucket, que é privado. Só o retrato atual de alguém que a pessoa
// logada vê. Quem não vê recebe a mesma resposta de um retrato que não existe.
import type { APIRoute } from 'astro';
import { bucketDeFotos } from '../../lib/servidor/ambiente';
import { podeVerRetratoDaChave } from '../../lib/servidor/repositorio';
import { CHAVE_DE_RETRATO, PASTA_DOS_RETRATOS } from '../../lib/retratos';

const naoEncontrado = () => new Response('Retrato não encontrado', { status: 404 });

export const GET: APIRoute = async ({ params, request, locals }) => {
  const chave = params.chave ?? '';
  if (!CHAVE_DE_RETRATO.test(chave)) return naoEncontrado();
  if (!(await podeVerRetratoDaChave(locals.usuario, chave))) return naoEncontrado();

  const objeto = await bucketDeFotos().get(`${PASTA_DOS_RETRATOS}${chave}`, { onlyIf: request.headers });
  if (!objeto) return naoEncontrado();

  const headers = new Headers();
  objeto.writeHttpMetadata(headers);
  headers.set('ETag', objeto.httpEtag);
  // O navegador guarda o retrato, mas confere a permissão de novo a cada uso
  headers.set('Cache-Control', 'private, no-cache');
  headers.set('X-Content-Type-Options', 'nosniff');

  if (!('body' in objeto)) return new Response(null, { status: 304, headers });
  return new Response(objeto.body, { headers });
};
