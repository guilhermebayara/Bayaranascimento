// Excluir e recuperar: memórias na lixeira, versões anteriores e fotos removidas.
import type { APIRoute } from 'astro';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { alcanceDaCorrecao, podeEditarMemoria, podeExcluirMemoria, podeVerVersao } from '../../lib/servidor/permissoes';
import {
  atualizarMemoria,
  excluirMemoria,
  listarExcluidas,
  listarIntegrantes,
  listarVersoes,
  obterMemoria,
  obterRelato,
  restaurarExcluida,
  restaurarFoto,
  salvarRelato,
  type DadosDaMemoria,
  type Memoria,
  type Relato,
} from '../../lib/servidor/repositorio';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario, tipos } = locals;
  const dados = await request.formData();
  const acao = campo(dados, 'acao', 30);
  const id = campo(dados, 'memoria', 120);

  if (acao === 'restaurar-excluida') {
    // Só entra na lixeira de alguém o que essa pessoa veria. Recuperar segue a regra de excluir.
    const excluida = (await listarExcluidas(usuario)).find((m) => m.id === id);
    if (!excluida) return voltar(request, '/lixeira', { erro: 'Memória não encontrada na lixeira.' });
    const decisao = podeExcluirMemoria(usuario, excluida);
    if (!decisao.ok) return voltar(request, '/', { erro: decisao.motivo });
    await restaurarExcluida(id);
    // Restaurar não tira ninguém da lixeira (resposta do Gui à P154, 17/11/2026): a página mostra o
    // recado e o caminho para o que voltou, e quem veio restaurar duas coisas continua ali
    return voltar(request, `/lixeira?restaurada=${encodeURIComponent(id)}`, { ok: excluida.situacao === 'rascunho' ? 'Rascunho restaurado.' : 'Memória restaurada.' });
  }

  const memoria = await obterMemoria(usuario, id);
  if (!memoria) return voltar(request, '/', { erro: 'Memória não encontrada.' });
  const pagina = `/memorias/${memoria.id}`;
  const historico = `${pagina}/historico`;

  if (acao === 'excluir') {
    const decisao = podeExcluirMemoria(usuario, memoria);
    if (!decisao.ok) return voltar(request, pagina, { erro: decisao.motivo });
    await excluirMemoria(memoria.id, usuario);
    const rascunho = memoria.situacao === 'rascunho';
    // A página Rascunhos saiu (resposta do Gui à P150, 17/11/2026): os rascunhos e a lixeira moram em "Sua conta"
    return voltar(request, rascunho ? '/conta' : '/', {
      ok: rascunho ? 'Rascunho descartado. Ele fica na lixeira e pode ser restaurado.' : `"${memoria.titulo}" foi para a lixeira. Dá para restaurar pela lixeira, em Sua conta.`,
    });
  }

  if (acao === 'restaurar-versao') {
    const decisao = podeEditarMemoria(usuario, memoria);
    if (!decisao.ok) return voltar(request, pagina, { erro: decisao.motivo });
    // Restaurar traz o título de volta: o administrador que corrige só os dados não restaura versões
    if (alcanceDaCorrecao(usuario, memoria) !== 'tudo') return voltar(request, historico, { erro: 'Só quem criou a memória e quem está nela restauram uma versão, porque ela traz o título de volta.' });
    const versao = (await listarVersoes<Memoria>('memoria', memoria.id))
      .find((v) => v.id === Number(campo(dados, 'versao', 12)) && podeVerVersao(usuario, memoria, v.dados));
    if (!versao) return voltar(request, historico, { erro: 'Versão não encontrada.' });
    const antiga = versao.dados;
    const existentes = new Set((await listarIntegrantes()).map((i) => i.id));
    // Volta a ficha: título, data, tipo, lugar e pessoas. Quem vê, núcleos e fotos ficam como estão hoje,
    // para uma restauração nunca abrir a memória a mais gente sem alguém decidir isso.
    const restaurada: DadosDaMemoria = {
      titulo: antiga.titulo,
      ano: antiga.ano,
      mes: antiga.mes ?? undefined,
      dia: antiga.dia ?? undefined,
      aproximada: Boolean(antiga.aproximada),
      tipo: tipos.some((t) => t.id === antiga.tipo) ? antiga.tipo : memoria.tipo,
      tipoOutro: antiga.tipoOutro ?? undefined,
      lugar: antiga.lugar ?? undefined,
      visibilidade: memoria.visibilidade,
      situacao: memoria.situacao,
      nucleos: memoria.nucleos,
      integrantes: (antiga.integrantes ?? []).filter((i) => existentes.has(i)),
      fotos: memoria.fotos.map((f) => ({ id: f.id, legenda: f.legenda ?? undefined, principal: f.principal })),
    };
    await atualizarMemoria(memoria, restaurada, usuario, []);
    return voltar(request, pagina, { ok: 'Versão restaurada. A versão que estava no ar foi para o histórico.' });
  }

  if (acao === 'restaurar-relato') {
    // Cada pessoa só mexe no relato que escreveu ou registrou
    const por = campo(dados, 'por', 80);
    const relato = await obterRelato(memoria.id, por, usuario);
    if (!relato || relato.registradoPor !== usuario.pessoa) return voltar(request, historico, { erro: 'Só quem escreveu o relato pode restaurar uma versão dele.' });
    const versao = (await listarVersoes<Relato>('relato', String(relato.id))).find((v) => v.id === Number(campo(dados, 'versao', 12)));
    if (!versao) return voltar(request, historico, { erro: 'Versão não encontrada.' });
    await salvarRelato(memoria.id, por, versao.dados.texto, relato.situacao, usuario, relato);
    return voltar(request, pagina, { ok: 'Texto do relato restaurado.' });
  }

  if (acao === 'restaurar-foto') {
    const devolvida = await restaurarFoto(Number(campo(dados, 'foto', 12)), memoria.id, usuario);
    return devolvida ? voltar(request, pagina, { ok: 'Foto restaurada.' }) : voltar(request, historico, { erro: 'Só quem enviou a foto e quem a removeu podem restaurá-la.' });
  }

  return voltar(request, pagina, { erro: 'Ação desconhecida.' });
};
