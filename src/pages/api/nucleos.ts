// Famílias (núcleos): só os administradores mudam os sobrenomes de que cada uma é feita.
// É o que a assinatura do nome usa embaixo de "MEMÓRIAS" (docs/visual.md, "Assinatura do nome").
import type { APIRoute } from 'astro';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { atualizarSobrenomesDoNucleo, listarNucleos } from '../../lib/servidor/repositorio';
import { lerListaDeSobrenomes } from '../../lib/sobrenomes';

const PAGINA = '/admin/familias';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario } = locals;
  if (!usuario.admin) return voltar(request, '/', { erro: 'Só os administradores cuidam das famílias.' });

  const dados = await request.formData();
  const id = campo(dados, 'id', 60);
  const nucleo = (await listarNucleos()).find((n) => n.id === id);
  if (!nucleo) return voltar(request, PAGINA, { erro: 'Família não encontrada.' });

  const lido = lerListaDeSobrenomes(campo(dados, 'sobrenomes', 200));
  if ('erro' in lido) return voltar(request, PAGINA, { erro: lido.erro });
  await atualizarSobrenomesDoNucleo(id, lido.sobrenomes);
  return voltar(request, PAGINA, { ok: `Sobrenomes da família ${nucleo.nome} atualizados.` });
};
