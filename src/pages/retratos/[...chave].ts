// Entrega as fotos de retrato do bucket, que é privado. Só o retrato atual de alguém que a pessoa
// logada vê. Quem não vê recebe a mesma resposta de um retrato que não existe.
//
// A cópia pequena (sessão D1c, src/lib/retratos.ts) passa por aqui também, com "pequeno/" na frente da chave
// da original: /retratos/pequeno/<chave>. A conferência é a da original, com a chave da original: quem não vê
// o retrato recebe a mesma recusa na cópia. Sem a cópia no bucket, vai a original.
import type { APIRoute } from 'astro';
import { bucketDeFotos, bucketDosExemplos } from '../../lib/servidor/ambiente';
import { semLogin } from '../../lib/servidor/acesso';
import { ehChaveDeExemplo } from '../../lib/fotos-de-exemplo';
import { chaveDaCopia } from '../../lib/copias-das-fotos';
import { cabecalhoDeGuardar } from '../../lib/servidor/http';
import { acessoAoRetrato } from '../../lib/servidor/repositorio';
import { CHAVE_DE_RETRATO, PASTA_DOS_RETRATOS, chaveDaCopiaDoRetrato, lerCaminhoDoRetrato } from '../../lib/retratos';

const naoEncontrado = () => new Response('Retrato não encontrado', { status: 404 });

export const GET: APIRoute = async ({ params, request, locals }) => {
  const { chave, pequeno } = lerCaminhoDoRetrato(params.chave ?? '');
  const exemplo = ehChaveDeExemplo(chave);
  if (!CHAVE_DE_RETRATO.test(chave) && !exemplo) return naoEncontrado();
  const acesso = await acessoAoRetrato(locals.usuario, chave);
  if (!acesso) return naoEncontrado();

  // O retrato de exemplo é uma das 11 fotos do bucket de teste, recortada em quadrado na tela; a cópia dele é
  // a cópia pequena da foto de exemplo
  const ler = (k: string) => (exemplo ? bucketDosExemplos()?.get(k, { onlyIf: request.headers }) : bucketDeFotos().get(`${PASTA_DOS_RETRATOS}${k}`, { onlyIf: request.headers }));
  const daCopia = !pequeno ? null : exemplo ? chaveDaCopia(chave, 'pequena', 'webp') : acesso.copia ? chaveDaCopiaDoRetrato(chave, acesso.copia.formato) : null;
  const objeto = (daCopia ? await ler(daCopia) : null) ?? (await ler(chave));
  if (!objeto) return naoEncontrado();

  const headers = new Headers();
  objeto.writeHttpMetadata(headers);
  headers.set('ETag', objeto.httpEtag);
  // O retrato fica guardado no aparelho por 7 dias; o de quem está na lixeira é conferido a cada uso.
  // Trocar o retrato grava um arquivo com nome novo (src/pages/api/integrantes.ts, guardarRetrato).
  for (const [nome, valor] of Object.entries(cabecalhoDeGuardar(acesso.guardar, semLogin()))) headers.set(nome, valor);
  headers.set('X-Content-Type-Options', 'nosniff');

  if (!('body' in objeto)) return new Response(null, { status: 304, headers });
  return new Response(objeto.body, { headers });
};
