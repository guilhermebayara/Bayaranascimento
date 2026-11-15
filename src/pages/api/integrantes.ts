// Cadastro de integrantes: criar uma pessoa ou bicho, e editar a ficha de quem já existe.
import type { APIRoute } from 'astro';
import { pessoasComAcesso } from '../../lib/servidor/acesso';
import { arrumarTexto, criarSlug, slugUnico, validarData } from '../../lib/servidor/conteudo';
import { campo, campoNumero, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { podeEditarIntegrante } from '../../lib/servidor/permissoes';
import { atualizarIntegrante, criarIntegranteCompleto, listarIntegrantes, type DadosDoIntegrante } from '../../lib/servidor/repositorio';

function lerData(dados: FormData, prefixo: string, rotulo: string): { ano?: number; mes?: number; dia?: number; erro?: string } {
  const ano = campoNumero(dados, `${prefixo}Ano`);
  const mes = campoNumero(dados, `${prefixo}Mes`);
  const dia = campoNumero(dados, `${prefixo}Dia`);
  if ([ano, mes, dia].some((n) => Number.isNaN(n))) return { erro: `Confira a data de ${rotulo}.` };
  if (ano === undefined) return mes || dia ? { erro: `Para informar mês ou dia de ${rotulo}, informe também o ano.` } : {};
  if (mes !== undefined && (mes < 1 || mes > 12)) return { erro: `Confira o mês de ${rotulo}.` };
  const problema = validarData(ano, mes, dia);
  return problema ? { erro: `Data de ${rotulo}: ${problema}` } : { ano, mes, dia: mes ? dia : undefined };
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario } = locals;
  const dados = await request.formData();
  const id = campo(dados, 'id', 80);
  const origem = id ? `/pessoas/${id}/editar` : '/pessoas/nova';

  const nome = campo(dados, 'nome', 80);
  if (!nome) return voltar(request, origem, { erro: 'Escreva o nome.' });
  const tipo = campo(dados, 'tipo', 10) === 'bicho' ? 'bicho' : 'pessoa';
  const tratamentoBruto = campo(dados, 'tratamento', 5);
  const nascimento = lerData(dados, 'nascimento', 'nascimento');
  if (nascimento.erro) return voltar(request, origem, { erro: nascimento.erro });
  const falecimento = lerData(dados, 'falecimento', 'falecimento');
  if (falecimento.erro) return voltar(request, origem, { erro: falecimento.erro });
  if (nascimento.ano && falecimento.ano && falecimento.ano < nascimento.ano) {
    return voltar(request, origem, { erro: 'O falecimento não pode ser antes do nascimento.' });
  }

  const ficha: DadosDoIntegrante = {
    nome,
    apelido: campo(dados, 'apelido', 40) || undefined,
    tipo,
    especie: campo(dados, 'especie', 40) || undefined,
    tratamento: tratamentoBruto === 'ela' || tratamentoBruto === 'ele' ? tratamentoBruto : null,
    nascimentoAno: nascimento.ano,
    nascimentoMes: nascimento.mes,
    nascimentoDia: nascimento.dia,
    falecimentoAno: falecimento.ano,
    falecimentoMes: falecimento.mes,
    falecimentoDia: falecimento.dia,
    sobre: arrumarTexto(campo(dados, 'sobre', 5000)) || undefined,
  };

  const integrantes = await listarIntegrantes();

  if (id) {
    const anterior = integrantes.find((i) => i.id === id);
    if (!anterior) return voltar(request, '/pessoas', { erro: 'Pessoa não encontrada.' });
    const decisao = podeEditarIntegrante(usuario, anterior, await pessoasComAcesso());
    if (!decisao.ok) return voltar(request, `/pessoas/${id}`, { erro: decisao.motivo });
    await atualizarIntegrante(anterior, ficha, usuario);
    return voltar(request, `/pessoas/${id}`, { ok: 'Página atualizada.' });
  }

  // Cadastro novo: avisa quando já existe alguém com o mesmo nome, para a mesma pessoa não nascer duas vezes
  const base = criarSlug(nome);
  const parecida = integrantes.find((i) => criarSlug(i.nome) === base || (i.apelido && criarSlug(i.apelido) === base));
  if (parecida && dados.get('outra') !== 'on') {
    return voltar(request, origem, {
      erro: `Já existe ${parecida.nome} no acervo. Se for outra pessoa com o mesmo nome, marque a opção no fim do formulário e salve de novo.`,
    });
  }
  // "nova" é o endereço deste formulário, então não pode ser id de ninguém
  const novoId = slugUnico(base, new Set([...integrantes.map((i) => i.id), 'nova']));
  await criarIntegranteCompleto(novoId, ficha, usuario);
  return voltar(request, `/pessoas/${novoId}/editar`, { ok: `${nome} entrou no acervo. Agora dá para dizer de quem é filho, com quem é casado e assim por diante.` });
};
