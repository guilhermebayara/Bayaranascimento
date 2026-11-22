// Excluir e recuperar: memórias na lixeira, versões anteriores e fotos removidas.
import type { APIRoute } from 'astro';
import { mensagensDerivadas, textoDasMensagens, type Mensagem } from '../../lib/conversa';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { avisarQuemEstava } from '../../lib/servidor/avisos';
import { alcanceDaCorrecao, podeApagarDeVez, podeEditarMemoria, podeExcluirMemoria, podeVerVersao } from '../../lib/servidor/permissoes';
import {
  apagarCapituloDeVez,
  apagarMemoriaDeVez,
  atualizarMemoria,
  listarCapitulosExcluidos,
  excluirMemoria,
  gravarMensagens,
  listarAudiosDosRelatos,
  listarFotosDoRelato,
  listarMensagensDosRelatos,
  idsDasPessoasExcluidas,
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

  // Apagar de vez (onda 2): só os administradores, item a item, e só o que eles veem na lixeira.
  // Quem não vê o item recebe o mesmo que para um item que não existe.
  if (acao === 'apagar-de-vez') {
    const decisao = podeApagarDeVez(usuario, { naLixeira: true });
    if (!decisao.ok) return voltar(request, '/lixeira', { erro: decisao.motivo });
    const excluida = (await listarExcluidas(usuario)).find((m) => m.id === id && podeExcluirMemoria(usuario, m).ok);
    if (!excluida || !(await apagarMemoriaDeVez(id, usuario))) return voltar(request, '/lixeira', { erro: 'Memória não encontrada na lixeira.' });
    return voltar(request, '/lixeira', { ok: `"${excluida.titulo}" foi apagada de vez.` });
  }
  if (acao === 'apagar-capitulo-de-vez') {
    const decisao = podeApagarDeVez(usuario, { naLixeira: true });
    if (!decisao.ok) return voltar(request, '/lixeira', { erro: decisao.motivo });
    const capitulo = (await listarCapitulosExcluidos(usuario)).find((c) => c.id === campo(dados, 'capitulo', 120));
    if (!capitulo || !(await apagarCapituloDeVez(capitulo.id, usuario))) return voltar(request, '/lixeira', { erro: 'Capítulo não encontrado na lixeira.' });
    return voltar(request, '/lixeira', { ok: `O capítulo "${capitulo.titulo}" foi apagado de vez.` });
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
    // Quem está na lixeira (excluir pessoa) volta na versão, escondido como hoje, para restaurar a pessoa devolvê-la
    const existentes = new Set([...(await listarIntegrantes()).map((i) => i.id), ...(await idsDasPessoasExcluidas())]);
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
    // Restaurar é uma correção: quem a versão devolve a "Quem estava" recebe o aviso (QA de 23/11/2026, docs/historico/qa/2026-11-23-relatorio.md)
    await avisarQuemEstava({ ...memoria, integrantes: restaurada.integrantes }, memoria.integrantes, usuario);
    return voltar(request, pagina, { ok: 'Versão restaurada. A versão que estava no ar foi para o histórico.' });
  }

  if (acao === 'restaurar-relato') {
    // Cada pessoa só mexe no relato que escreveu ou registrou
    const por = campo(dados, 'por', 80);
    const relato = await obterRelato(memoria.id, por, usuario);
    if (!relato || relato.registradoPor !== usuario.pessoa) return voltar(request, historico, { erro: 'Só quem escreveu o relato pode restaurar uma versão dele.' });
    const versao = (await listarVersoes<Relato & { mensagens?: Mensagem[] }>('relato', String(relato.id))).find((v) => v.id === Number(campo(dados, 'versao', 12)));
    if (!versao) return voltar(request, historico, { erro: 'Versão não encontrada.' });
    // O relato como conversa: a versão traz as mensagens de antes. Os áudios e as fotos que saíram do
    // relato não voltam por aqui (a mensagem deles fica de fora); os textos e a ordem voltam.
    const hoje = (await listarMensagensDosRelatos([relato])).get(relato.id) ?? [];
    const antigas = versao.dados.mensagens ?? mensagensDerivadas(versao.dados.texto, [], []);
    const audios = new Set((await listarAudiosDosRelatos([relato.id])).get(relato.id)?.map((a) => a.id) ?? []);
    const fotos = new Set((await listarFotosDoRelato(relato.id)).map((f) => f.id));
    const voltam = [
      ...antigas.filter((m) => (m.tipo === 'audio' ? audios.has(m.audioId!) : m.tipo === 'foto' ? fotos.has(m.fotoId!) : Boolean(m.texto?.trim()))),
      // Áudio ou foto de hoje que a versão não tinha continua, no fim
      ...hoje.filter((m) => m.tipo !== 'texto' && !antigas.some((a) => a.tipo === m.tipo && a.audioId === m.audioId && a.fotoId === m.fotoId)),
    ];
    await salvarRelato(memoria.id, por, textoDasMensagens(voltam), relato.situacao, usuario, relato, { guardar: true, mensagens: hoje });
    await gravarMensagens(relato.id, voltam);
    return voltar(request, pagina, { ok: 'Texto do relato restaurado.' });
  }

  if (acao === 'restaurar-foto') {
    const devolvida = await restaurarFoto(Number(campo(dados, 'foto', 12)), memoria.id, usuario);
    return devolvida ? voltar(request, pagina, { ok: 'Foto restaurada.' }) : voltar(request, historico, { erro: 'Só quem enviou a foto e quem a removeu podem restaurá-la.' });
  }

  return voltar(request, pagina, { erro: 'Ação desconhecida.' });
};
