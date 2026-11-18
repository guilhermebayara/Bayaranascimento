// "Como você chama", só seu (decisão do Gui, 18/11/2026; regras em src/lib/apelidos.ts): guarda o apelido
// que quem está logado dá a outra pessoa. Só o dono escreve e lê as linhas dele, e só de quem ele vê;
// quem ele não vê recebe a mesma resposta de quem não existe. Sem apelido, a linha sai.
import type { APIRoute } from 'astro';
import { lerApelido, podeDarApelido } from '../../lib/apelidos';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { guardarMeuApelido, listarIntegrantesQueVe } from '../../lib/servidor/repositorio';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario } = locals;
  const dados = await request.formData();
  const pessoa = campo(dados, 'pessoa', 80);
  const ve = (await listarIntegrantesQueVe(usuario)).some((i) => i.id === pessoa);
  if (!podeDarApelido(usuario.pessoa, pessoa, ve)) return voltar(request, '/pessoas', { erro: 'Pessoa não encontrada.' });
  const pagina = `/pessoas/${pessoa}`;
  const lido = lerApelido(dados.get('apelido'));
  if (!lido.ok) return voltar(request, `${pagina}#como-voce-chama`, { erro: lido.motivo });
  await guardarMeuApelido(usuario.pessoa, pessoa, lido.apelido);
  return voltar(request, pagina, { ok: lido.apelido ? `Pronto. Para você, aparece como ${lido.apelido} no site inteiro.` : 'Pronto. Voltou ao nome de sempre.' });
};
