// Excluir pessoa (decisão do Gui depois da sessão I, 18/11/2026; regras em permissoes.ts): excluir e
// restaurar, pedir a exclusão e recusar o pedido. A pessoa excluída vai para a lixeira, com volta.
import type { APIRoute } from 'astro';
import { pessoasComAcesso } from '../../lib/servidor/acesso';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { podeCuidarDaExclusao, podeExcluirPessoa, podePedirExclusao } from '../../lib/servidor/permissoes';
import {
  excluirPessoa,
  listarIntegrantesQueVe,
  listarPedidosDeExclusao,
  listarPessoasExcluidas,
  pedirExclusao,
  recusarPedidoDeExclusao,
  restaurarPessoa,
} from '../../lib/servidor/repositorio';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario } = locals;
  const dados = await request.formData();
  const acao = campo(dados, 'acao', 30);
  const id = campo(dados, 'pessoa', 120);

  if (acao === 'excluir' || acao === 'pedir') {
    // Quem a pessoa não vê responde como quem não existe
    const pessoa = (await listarIntegrantesQueVe(usuario)).find((i) => i.id === id);
    if (!pessoa) return voltar(request, '/pessoas', { erro: 'Pessoa não encontrada.' });
    const alvo = { id: pessoa.id, acessa: (await pessoasComAcesso()).has(pessoa.id) };
    const editar = `/pessoas/${pessoa.id}/editar`;
    if (acao === 'excluir') {
      const decisao = podeExcluirPessoa(usuario, alvo);
      if (!decisao.ok) return voltar(request, editar, { erro: decisao.motivo });
      await excluirPessoa(pessoa.id, usuario);
      return voltar(request, '/pessoas', { ok: `${pessoa.nome} foi para a lixeira. Dá para restaurar pela lixeira, em Sua conta.` });
    }
    const decisao = podePedirExclusao(usuario, alvo);
    if (!decisao.ok) return voltar(request, editar, { erro: decisao.motivo });
    const entrou = await pedirExclusao(pessoa.id, campo(dados, 'motivo', 500), usuario);
    return voltar(request, editar, {
      ok: entrou ? `Pedido enviado. Um administrador vai aprovar ou recusar a exclusão de ${pessoa.nome}.` : `Já há um pedido para excluir ${pessoa.nome}.`,
    });
  }

  const decisao = podeCuidarDaExclusao(usuario);
  if (!decisao.ok) return voltar(request, '/conta', { erro: decisao.motivo });

  if (acao === 'restaurar') {
    const pessoa = (await listarPessoasExcluidas()).find((p) => p.id === id);
    if (!pessoa || !(await restaurarPessoa(pessoa.id))) return voltar(request, '/lixeira', { erro: 'Pessoa não encontrada na lixeira.' });
    // Restaurar a pessoa leva à página dela, que voltou ("Excluir pessoa", em docs/regras/lixeira.md; QA de 18/11/2026)
    return voltar(request, `/pessoas/${encodeURIComponent(pessoa.id)}`, { ok: `${pessoa.nome} voltou ao acervo, com a página, os laços e “Quem estava”.` });
  }

  if (acao === 'aprovar' || acao === 'recusar') {
    const pedido = (await listarPedidosDeExclusao()).find((p) => p.id === Number(campo(dados, 'pedido', 12)));
    // O pedido de alguém que o administrador não vê responde como um que não existe
    const pessoa = pedido && (await listarIntegrantesQueVe(usuario)).find((i) => i.id === pedido.pessoa);
    if (!pedido || !pessoa) return voltar(request, '/admin/exclusoes', { erro: 'Pedido não encontrado.' });
    if (acao === 'recusar') {
      await recusarPedidoDeExclusao(pedido.id, usuario);
      return voltar(request, '/admin/exclusoes', { ok: `Pedido recusado. ${pessoa.nome} continua no acervo.` });
    }
    const pode = podeExcluirPessoa(usuario, { id: pessoa.id, acessa: (await pessoasComAcesso()).has(pessoa.id) });
    if (!pode.ok) return voltar(request, '/admin/exclusoes', { erro: pode.motivo });
    await excluirPessoa(pessoa.id, usuario);
    return voltar(request, '/admin/exclusoes', { ok: `${pessoa.nome} foi para a lixeira. Dá para restaurar pela lixeira.` });
  }

  return voltar(request, '/conta', { erro: 'Ação desconhecida.' });
};
