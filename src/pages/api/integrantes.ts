// Cadastro de integrantes: criar uma pessoa ou bicho, e editar a ficha de quem já existe.
import type { APIRoute } from 'astro';
import { pessoasComAcesso } from '../../lib/servidor/acesso';
import { arrumarTexto, criarSlug, slugUnico, validarData } from '../../lib/servidor/conteudo';
import { campo, campoNumero, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { bucketDeFotos } from '../../lib/servidor/ambiente';
import { podeEditarIntegrante, podeMudarRetrato, type Usuario } from '../../lib/servidor/permissoes';
import { LIMITE_DO_RETRATO, PASTA_DOS_RETRATOS, formatoDoRetrato } from '../../lib/retratos';
import { atualizarIntegrante, criarIntegranteCompleto, definirParentes, listarIntegrantes, listarIntegrantesQueVe, listarNucleos, type DadosDoIntegrante } from '../../lib/servidor/repositorio';

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

/**
 * A foto de retrato que veio com a ficha, já recortada e reduzida pelo navegador. Devolve o arquivo
 * conferido pelo conteúdo, ou o recado do problema. Sem arquivo, nada muda.
 */
async function lerRetrato(dados: FormData): Promise<{ bytes?: Uint8Array; tipo?: string; extensao?: string; erro?: string }> {
  const valor = dados.get('retrato');
  if (!(valor instanceof File) || valor.size === 0) return {};
  if (valor.size > LIMITE_DO_RETRATO) return { erro: 'A foto de retrato é grande demais. Escolha de novo, que o site reduz.' };
  const bytes = new Uint8Array(await valor.arrayBuffer());
  const formato = formatoDoRetrato(bytes);
  if (!formato) return { erro: 'Formato de foto não aceito. Envie JPG, PNG ou WebP.' };
  return { bytes, ...formato };
}

/** Guarda o retrato no bucket das fotos, debaixo de "retratos/", com uma chave nova. Nada é sobrescrito. */
async function guardarRetrato(retrato: { bytes: Uint8Array; tipo: string; extensao: string }, integrante: string, usuario: Usuario): Promise<string> {
  const chave = `${crypto.randomUUID()}.${retrato.extensao}`;
  await bucketDeFotos().put(`${PASTA_DOS_RETRATOS}${chave}`, retrato.bytes, {
    httpMetadata: { contentType: retrato.tipo },
    customMetadata: { enviadoPor: usuario.pessoa, integrante },
  });
  return chave;
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
  // Sem "Já faleceu" marcado, a data de falecimento não vale (o campo some da tela)
  const falecido = dados.get('falecido') === 'on';
  const falecimento = falecido ? lerData(dados, 'falecimento', 'falecimento') : {};
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
    falecido,
    sobre: arrumarTexto(campo(dados, 'sobre', 5000)) || undefined,
  };

  // Foto de retrato: "Trocar foto" manda o arquivo recortado; "Tirar foto" manda tirarRetrato
  const retrato = await lerRetrato(dados);
  if (retrato.erro) return voltar(request, origem, { erro: retrato.erro });
  const tirarRetrato = dados.get('tirarRetrato') === '1';

  // Quem só existe num laço privado de outra pessoa responde como quem não existe (C1, 17/11/2026).
  // Os ids de todos só servem para o endereço novo não repetir o de ninguém.
  const integrantes = await listarIntegrantesQueVe(usuario);
  const todosOsIds = new Set([...(await listarIntegrantes()).map((i) => i.id), 'nova']);

  if (id) {
    const anterior = integrantes.find((i) => i.id === id);
    if (!anterior) return voltar(request, '/pessoas', { erro: 'Pessoa não encontrada.' });
    const comAcesso = await pessoasComAcesso();
    const decisao = podeEditarIntegrante(usuario, anterior, comAcesso);
    if (!decisao.ok) return voltar(request, `/pessoas/${id}`, { erro: decisao.motivo });
    if (retrato.bytes || tirarRetrato) {
      const pode = podeMudarRetrato(usuario, anterior, comAcesso);
      if (!pode.ok) return voltar(request, `/pessoas/${id}`, { erro: pode.motivo });
      // Trocar ou tirar não apaga o arquivo antigo: a chave anterior fica na versão guardada do cadastro
      ficha.retrato = retrato.bytes ? await guardarRetrato(retrato as Required<typeof retrato>, id, usuario) : null;
    }
    await atualizarIntegrante(anterior, ficha, usuario);
    // Família: só as de parente. Quem é membro (acessa o site) continua como está.
    if (dados.has('parenteDe') || anterior.parenteDe.length) {
      const nucleos = new Set((await listarNucleos()).map((n) => n.id));
      const escolhidas = dados.getAll('parenteDe').map(String).filter((n) => nucleos.has(n) && !anterior.nucleos.includes(n));
      await definirParentes(id, escolhidas);
    }
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
  const novoId = slugUnico(base, todosOsIds);
  // Quem cadastra pode editar a página, então pode pôr o retrato
  if (retrato.bytes) ficha.retrato = await guardarRetrato(retrato as Required<typeof retrato>, novoId, usuario);
  await criarIntegranteCompleto(novoId, ficha, usuario);
  return voltar(request, `/pessoas/${novoId}/editar?novo=1`, { ok: `${nome} entrou no acervo. Agora, os laços.` });
};
