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

  // A tela envia todas as famílias de uma vez (resposta do Gui à P171, 17/11/2026). Confere tudo
  // antes de gravar: com um erro numa família, nenhuma muda.
  const dados = await request.formData();
  const novos: { id: string; sobrenomes: string[] }[] = [];
  for (const nucleo of await listarNucleos()) {
    if (!dados.has(`sobrenomes-${nucleo.id}`)) continue;
    const lido = lerListaDeSobrenomes(campo(dados, `sobrenomes-${nucleo.id}`, 200));
    if ('erro' in lido) return voltar(request, PAGINA, { erro: `${nucleo.nome}: ${lido.erro}` });
    novos.push({ id: nucleo.id, sobrenomes: lido.sobrenomes });
  }
  if (novos.length === 0) return voltar(request, PAGINA, { erro: 'Família não encontrada.' });
  for (const { id, sobrenomes } of novos) await atualizarSobrenomesDoNucleo(id, sobrenomes);
  return voltar(request, PAGINA, { ok: 'Sobrenomes das famílias atualizados.' });
};
