// Restaurar uma versão da ficha de uma pessoa ou de um laço (onda 2, decisão do Gui de 17/11/2026), como
// na memória. Cada restauração segue a permissão de hoje para mudar aquilo: a ficha, quem pode editar a
// página; a filiação e o casal, quem mexe nos laços; o laço do coração, o dono e, nos que veem, os
// administradores. Quem não vê a versão recebe o mesmo que para uma que não existe.
import type { APIRoute } from 'astro';
import { casalDesfeito } from '../../lib/ex-casal';
import { veAVersaoDoLaco, type VersaoDeLaco } from '../../lib/historico-da-pessoa';
import { pessoasComAcesso } from '../../lib/servidor/acesso';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { podeEditarIntegrante, podeMexerEmLaco, podeMudarLacoDoCoracao, podeMudarQuemVeOCasal } from '../../lib/servidor/permissoes';
import {
  atualizarIntegrante,
  listarFiliacoes,
  listarIntegrantesQueVe,
  obterCasalDoPar,
  obterVersao,
  pessoasQueONaoVe,
  restaurarLacoDoCoracao,
  salvarCasal,
  salvarFiliacao,
  type Integrante,
} from '../../lib/servidor/repositorio';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario } = locals;
  const dados = await request.formData();
  const pessoaId = campo(dados, 'pessoa', 80);
  const integrantes = await listarIntegrantesQueVe(usuario);
  const pessoa = integrantes.find((i) => i.id === pessoaId);
  if (!pessoa) return voltar(request, '/pessoas', { erro: 'Pessoa não encontrada.' });
  const volta = `/pessoas/${pessoa.id}/historico`;
  const naoEncontrada = () => voltar(request, volta, { erro: 'Versão não encontrada.' });
  const versao = await obterVersao(Number(campo(dados, 'versao', 12)));
  if (!versao) return naoEncontrada();
  const achar = (id: string) => integrantes.find((i) => i.id === id);
  const comAcesso = await pessoasComAcesso();

  if (versao.tipo === 'integrante') {
    if (versao.itemId !== pessoa.id) return naoEncontrada();
    const decisao = podeEditarIntegrante(usuario, pessoa, comAcesso);
    if (!decisao.ok) return voltar(request, volta, { erro: decisao.motivo });
    const antiga = versao.dados as Integrante;
    // Volta a ficha e a foto de retrato. As famílias ficam como estão hoje: acesso é com os administradores
    await atualizarIntegrante(
      pessoa,
      {
        nome: antiga.nome,
        apelido: antiga.apelido ?? undefined,
        tipo: antiga.tipo,
        especie: antiga.especie ?? undefined,
        tratamento: antiga.tratamento ?? null,
        nascimentoAno: antiga.nascimentoAno ?? undefined,
        nascimentoMes: antiga.nascimentoMes ?? undefined,
        nascimentoDia: antiga.nascimentoDia ?? undefined,
        falecimentoAno: antiga.falecimentoAno ?? undefined,
        falecimentoMes: antiga.falecimentoMes ?? undefined,
        falecimentoDia: antiga.falecimentoDia ?? undefined,
        falecido: Boolean(antiga.falecido),
        sobre: antiga.sobre ?? undefined,
        retrato: antiga.retrato ?? null,
      },
      usuario,
    );
    return voltar(request, volta, { ok: 'Versão restaurada. A ficha que estava no ar foi para o histórico.' });
  }

  if (!['filiacao', 'casal', 'laco-coracao'].includes(versao.tipo)) return naoEncontrada();
  const laco = { tipo: versao.tipo, dados: versao.dados } as VersaoDeLaco;
  if (!veAVersaoDoLaco(laco, usuario, await pessoasQueONaoVe(usuario))) return naoEncontrada();
  const [x, y] = laco.tipo === 'filiacao' ? [laco.dados.filho, laco.dados.responsavel] : laco.tipo === 'casal' ? [laco.dados.a, laco.dados.b] : [laco.dados.dono, laco.dados.pessoa];
  if (x !== pessoa.id && y !== pessoa.id) return naoEncontrada();
  const [um, outro] = [achar(x), achar(y)];
  if (!um || !outro) return voltar(request, volta, { erro: 'Uma das pessoas deste laço não está mais no acervo.' });

  if (laco.tipo === 'filiacao') {
    const decisao = podeMexerEmLaco(usuario, [um, outro]);
    if (!decisao.ok) return voltar(request, volta, { erro: decisao.motivo });
    if ((await listarFiliacoes()).some((f) => f.filho === x && f.responsavel === y)) return voltar(request, volta, { erro: 'Este laço já existe. Para mudar a filiação, use “Editar”.' });
    const d = laco.dados;
    await salvarFiliacao(x, y, d.qualidade, usuario, d.adocao_ano ? { ano: d.adocao_ano, mes: d.adocao_mes ?? null, dia: d.adocao_dia ?? null } : null);
    return voltar(request, volta, { ok: 'Laço restaurado.' });
  }

  if (laco.tipo === 'casal') {
    const decisao = podeMexerEmLaco(usuario, [um, outro]);
    if (!decisao.ok) return voltar(request, volta, { erro: decisao.motivo });
    const d = laco.dados;
    // Quem vê um casal desfeito é das duas pessoas (ex-casal): os outros restauram as fases, e quem vê fica
    const atual = await obterCasalDoPar(d.a, d.b, usuario);
    const podeQuemVe = podeMudarQuemVeOCasal(usuario, d, comAcesso).ok || !casalDesfeito(d);
    const visibilidade = podeQuemVe || !atual ? d.visibilidade : atual.visibilidade;
    const nucleos = podeQuemVe || !atual ? (d.nucleos ?? []) : (atual.nucleos ?? []);
    try {
      await salvarCasal(d.a, d.b, d.fases, visibilidade, usuario, nucleos, Boolean(d.jaDaFamilia));
    } catch {
      return voltar(request, volta, { erro: 'Não foi possível restaurar esse casal.' });
    }
    return voltar(request, volta, { ok: 'Casal restaurado. A versão que estava no ar foi para o histórico.' });
  }

  const d = laco.dados;
  const decisao = podeMudarLacoDoCoracao(usuario, { dono: d.dono, privado: Boolean(d.privado) });
  if (!decisao.ok) return voltar(request, volta, { erro: decisao.motivo });
  await restaurarLacoDoCoracao(d, usuario);
  return voltar(request, volta, { ok: 'Laço do coração restaurado.' });
};
