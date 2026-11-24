// Entrega as fotos do bucket, que é privado. Cada pedido confere se a pessoa pode ver a memória a que a
// foto pertence.
//
// As cópias menores (sessão D1b, src/lib/copias-das-fotos.ts) passam por aqui também, com o tamanho na
// frente da chave da original: /fotos/pequena/2026/<código>.jpg. A conferência é a da original, com a chave
// da original: quem não vê a foto recebe a mesma recusa na cópia. Sem a cópia no bucket, vai a original.
import type { APIRoute } from 'astro';
import { bucketDeFotos, bucketDosExemplos } from '../../lib/servidor/ambiente';
import { semLogin } from '../../lib/servidor/acesso';
import { ehChaveDeExemplo } from '../../lib/fotos-de-exemplo';
import { chaveDaCopia, lerCaminhoDaFoto } from '../../lib/copias-das-fotos';
import { cabecalhoDeGuardar } from '../../lib/servidor/http';
import { acessoAFoto } from '../../lib/servidor/repositorio';

const CHAVE_VALIDA = /^\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
const naoEncontrada = () => new Response('Foto não encontrada', { status: 404 });

export const GET: APIRoute = async ({ params, request, locals }) => {
  const { chave, tamanho } = lerCaminhoDaFoto(params.chave ?? '');
  const exemplo = ehChaveDeExemplo(chave);
  if (!CHAVE_VALIDA.test(chave) && !exemplo) return naoEncontrada();
  // Quem não pode ver recebe a mesma resposta de uma foto que não existe, na original e nas cópias
  const acesso = await acessoAFoto(locals.usuario, chave);
  if (!acesso) return naoEncontrada();

  // As fotos de exemplo (o Chico e a Karol) e as cópias delas são lidas do bucket de teste, também na
  // homologação, e só debaixo de exemplos/
  const ler = (k: string) => (exemplo ? bucketDosExemplos()?.get(k, { onlyIf: request.headers }) : bucketDeFotos().get(k, { onlyIf: request.headers }));
  const formato = exemplo ? 'webp' : acesso.copias?.formato;
  const objeto = (tamanho && formato ? await ler(chaveDaCopia(chave, tamanho, formato)) : null) ?? (await ler(chave));
  if (!objeto) return naoEncontrada();

  const headers = new Headers();
  objeto.writeHttpMetadata(headers);
  headers.set('ETag', objeto.httpEtag);
  // Foto de memória publicada fica guardada no aparelho por 7 dias; rascunho, lixeira, foto solta ou
  // removida: o navegador confere a permissão de novo a cada uso
  for (const [nome, valor] of Object.entries(cabecalhoDeGuardar(acesso.guardar, semLogin()))) headers.set(nome, valor);
  headers.set('X-Content-Type-Options', 'nosniff');

  if (!('body' in objeto)) return new Response(null, { status: 304, headers });
  return new Response(objeto.body, { headers });
};
