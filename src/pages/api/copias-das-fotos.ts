// O ajuste "Fazer as cópias das fotos que já existem" (sessão D1b, 23/11/2026; a página é
// src/pages/admin/copias-das-fotos.astro). Roda no navegador do administrador: ele pede aqui a lista das
// fotos sem cópia que vê, baixa cada original pela rota das fotos, reduz no aparelho e manda as duas cópias
// para cá. Nada da original muda: a cópia tem nome próprio no bucket (chaveDaCopia), e a foto que já tem
// cópia é recusada, sem trocar nada.
//
// Revisão R-D1 (sessão D1d): a rota aceita só as fotos que o ajuste lista (fotoEstaNoAjuste), e reserva a foto
// no banco antes de gravar no bucket (reservarCopias). Dois envios ao mesmo tempo: só um grava, e o outro
// recebe 409 sem gravar nada.
import type { APIRoute } from 'astro';
import { bucketDeFotos } from '../../lib/servidor/ambiente';
import { erro, json, mesmaOrigem } from '../../lib/servidor/http';
import { podeFazerCopiasDasFotos } from '../../lib/servidor/permissoes';
import { acessoAFoto, alvoDaFoto, fotoEstaNoAjuste, guardarCopias, listarFotosSemCopia, reservarCopias, soltarReserva, temCopias } from '../../lib/servidor/repositorio';
import { LIMITE_DA_COPIA, chaveDaCopia, conferirCopias } from '../../lib/copias-das-fotos';

const CHAVE_VALIDA = /^\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** As fotos sem cópia que o administrador vê, uma por chave. */
export const GET: APIRoute = async ({ locals }) => {
  const decisao = podeFazerCopiasDasFotos(locals.usuario);
  if (!decisao.ok) return erro(403, decisao.motivo);
  return json({ chaves: await listarFotosSemCopia(locals.usuario) });
};

/** As duas cópias de uma foto: chave, pequena e media. */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  const decisao = podeFazerCopiasDasFotos(locals.usuario);
  if (!decisao.ok) return erro(403, decisao.motivo);
  if (Number(request.headers.get('Content-Length') ?? 0) > LIMITE_DA_COPIA.pequena + LIMITE_DA_COPIA.media + 4096) return erro(413, 'As cópias são grandes demais.');

  let chave = '';
  let pequena: File | null = null;
  let media: File | null = null;
  try {
    const dados = await request.formData();
    chave = String(dados.get('chave') ?? '');
    const p = dados.get('pequena');
    const m = dados.get('media');
    if (p instanceof File && m instanceof File) [pequena, media] = [p, m];
  } catch {
    return erro(400, 'Envio inválido.');
  }
  if (!pequena || !media) return erro(400, 'Faltam as cópias.');
  // As fotos de exemplo têm as cópias delas no bucket de teste, feitas no computador
  if (!CHAVE_VALIDA.test(chave)) return erro(404, 'Foto não encontrada.');
  // Quem não vê a foto recebe o mesmo que para uma foto que não existe
  if (!(await acessoAFoto(locals.usuario, chave))) return erro(404, 'Foto não encontrada.');
  if (await temCopias(chave)) return erro(409, 'Esta foto já tem as cópias.');
  // Só o que o ajuste lista: a foto solta antiga e a removida, que o administrador vê para conferir, ficam de fora
  if (!(await fotoEstaNoAjuste(locals.usuario, chave))) return erro(404, 'Foto não encontrada.');

  // A proporção das cópias é conferida com a da original guardada
  const original = await bucketDeFotos().get(chave);
  if (!original) return erro(404, 'Foto não encontrada.');
  const bytes = { pequena: new Uint8Array(await pequena.arrayBuffer()), media: new Uint8Array(await media.arrayBuffer()) };
  const conferidas = conferirCopias(new Uint8Array(await original.arrayBuffer()), bytes.pequena, bytes.media);
  if ('erro' in conferidas) return erro(400, conferidas.erro);

  // Só um pedido grava: o que perde a reserva não grava nada
  const reserva = await reservarCopias(alvoDaFoto(chave));
  if (!reserva) return erro(409, 'As cópias desta foto já estão sendo feitas.');
  let guardadas = false;
  try {
    // Outro pedido pode ter terminado entre a primeira conferência e a reserva
    if (await temCopias(chave)) return erro(409, 'Esta foto já tem as cópias.');
    const tipo = conferidas.copias.formato === 'webp' ? 'image/webp' : 'image/jpeg';
    for (const t of ['pequena', 'media'] as const) {
      await bucketDeFotos().put(chaveDaCopia(chave, t, conferidas.copias.formato), bytes[t], { httpMetadata: { contentType: tipo }, customMetadata: { copiaDe: chave, feitaPor: locals.usuario.pessoa } });
    }
    const linhas = await guardarCopias(chave, conferidas.copias, reserva);
    guardadas = true;
    return json({ chave, linhas }, linhas ? 201 : 409);
  } finally {
    // guardarCopias solta a reserva no mesmo lote; fora dele (recusa ou falha no meio), ela sai aqui
    if (!guardadas) await soltarReserva(alvoDaFoto(chave), reserva);
  }
};
