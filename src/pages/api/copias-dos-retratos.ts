// O ajuste "Fazer as cópias das fotos que já existem" também faz as cópias dos retratos de antes (sessão
// D1c, 23/11/2026; a página é src/pages/admin/copias-das-fotos.astro). Roda no navegador do administrador:
// ele pede aqui a lista dos retratos sem cópia que vê, baixa cada original pela rota dos retratos, reduz no
// aparelho e manda a cópia para cá. Nada da original muda: a cópia tem nome próprio no bucket
// (chaveDaCopiaDoRetrato), e o retrato que já tem cópia é recusado, sem trocar nada.
//
// Revisão R-D1 (sessão D1d): como a rota das cópias das fotos, aceita só os retratos que o ajuste lista
// (retratoEstaNoAjuste) e reserva o retrato no banco antes de gravar no bucket (reservarCopias).
import type { APIRoute } from 'astro';
import { bucketDeFotos } from '../../lib/servidor/ambiente';
import { erro, json, mesmaOrigem } from '../../lib/servidor/http';
import { podeFazerCopiasDasFotos } from '../../lib/servidor/permissoes';
import { acessoAoRetrato, alvoDoRetrato, guardarCopiaDoRetrato, listarRetratosSemCopia, reservarCopias, retratoEstaNoAjuste, retratoTemCopia, soltarReserva } from '../../lib/servidor/repositorio';
import { CHAVE_DE_RETRATO, LIMITE_DA_COPIA_DO_RETRATO, PASTA_DOS_RETRATOS, chaveDaCopiaDoRetrato, conferirCopiaDoRetrato } from '../../lib/retratos';

/** Os retratos sem cópia que o administrador vê, um por chave. */
export const GET: APIRoute = async ({ locals }) => {
  const decisao = podeFazerCopiasDasFotos(locals.usuario);
  if (!decisao.ok) return erro(403, decisao.motivo);
  return json({ chaves: await listarRetratosSemCopia(locals.usuario) });
};

/** A cópia de um retrato: chave e pequeno. */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  const decisao = podeFazerCopiasDasFotos(locals.usuario);
  if (!decisao.ok) return erro(403, decisao.motivo);
  if (Number(request.headers.get('Content-Length') ?? 0) > LIMITE_DA_COPIA_DO_RETRATO + 4096) return erro(413, 'A cópia é grande demais.');

  let chave = '';
  let pequeno: File | null = null;
  try {
    const dados = await request.formData();
    chave = String(dados.get('chave') ?? '');
    const p = dados.get('pequeno');
    if (p instanceof File) pequeno = p;
  } catch {
    return erro(400, 'Envio inválido.');
  }
  if (!pequeno) return erro(400, 'Falta a cópia.');
  // Os retratos de exemplo usam as cópias das fotos de exemplo, feitas no computador
  if (!CHAVE_DE_RETRATO.test(chave)) return erro(404, 'Retrato não encontrado.');
  // Quem não vê o retrato recebe o mesmo que para um retrato que não existe
  if (!(await acessoAoRetrato(locals.usuario, chave))) return erro(404, 'Retrato não encontrado.');
  if (await retratoTemCopia(chave)) return erro(409, 'Este retrato já tem a cópia.');
  if (!(await retratoEstaNoAjuste(locals.usuario, chave))) return erro(404, 'Retrato não encontrado.');

  // O lado da cópia é conferido com o da original guardada
  const original = await bucketDeFotos().get(`${PASTA_DOS_RETRATOS}${chave}`);
  if (!original) return erro(404, 'Retrato não encontrado.');
  const bytesDaOriginal = new Uint8Array(await original.arrayBuffer());
  const bytes = new Uint8Array(await pequeno.arrayBuffer());
  const conferida = conferirCopiaDoRetrato(bytesDaOriginal, bytes);
  if ('erro' in conferida) return erro(400, conferida.erro);

  // Só um pedido grava: o que perde a reserva não grava nada
  const reserva = await reservarCopias(alvoDoRetrato(chave));
  if (!reserva) return erro(409, 'A cópia deste retrato já está sendo feita.');
  let guardada = false;
  try {
    if (await retratoTemCopia(chave)) return erro(409, 'Este retrato já tem a cópia.');
    const tipo = conferida.copia.formato === 'webp' ? 'image/webp' : 'image/jpeg';
    await bucketDeFotos().put(`${PASTA_DOS_RETRATOS}${chaveDaCopiaDoRetrato(chave, conferida.copia.formato)}`, bytes, { httpMetadata: { contentType: tipo }, customMetadata: { copiaDe: chave, feitaPor: locals.usuario.pessoa } });
    const linhas = await guardarCopiaDoRetrato(chave, bytesDaOriginal.byteLength, conferida.copia, reserva);
    guardada = true;
    return json({ chave, linhas }, linhas ? 201 : 409);
  } finally {
    if (!guardada) await soltarReserva(alvoDoRetrato(chave), reserva);
  }
};
