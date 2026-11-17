// Cria ou atualiza uma memória: a ficha, as fotos já enviadas, pessoas novas,
// núcleos, visibilidade e, se houver, o relato de quem está registrando.
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { lerTemas } from '../../lib/capitulos';
import { SEM_ANO } from '../../lib/datas';
import { TIPO_OUTRO } from '../../lib/tipos';
import { AUDIOS_POR_RELATO } from '../../lib/audios';
import { pessoasComAcesso } from '../../lib/servidor/acesso';
import { arrumarTexto, codigoNovo, criarSlug, slugUnico, validarData } from '../../lib/servidor/conteudo';
import { avisarQuemEstava } from '../../lib/servidor/avisos';
import { erro, json, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { alcanceDaCorrecao, mudancaDeConteudo, podeEditarMemoria, podeEscreverRelato, podeMudarQuemVe, podeRemoverFoto, validarVisibilidade } from '../../lib/servidor/permissoes';
import {
  atualizarMemoria,
  criarIntegrante,
  criarMemoria,
  garantirTemas,
  listarCapitulos,
  idsDeMemorias,
  listarIntegrantes,
  listarIntegrantesQueVe,
  listarNucleos,
  obterFotos,
  obterMemoria,
  obterRelato,
  salvarRelato,
  type DadosDaMemoria,
  type Memoria,
  ligarAudios,
  obterRelatoRegistradoPor,
} from '../../lib/servidor/repositorio';

const opcional = (maximo: number) => z.string().trim().max(maximo).optional();

const Pedido = z.object({
  id: z.string().max(120).optional(),
  titulo: z.string().trim().min(1, 'Dê um título para a memória.').max(120),
  // Sem ano, só o rascunho (ver SEM_ANO, em src/lib/datas.ts)
  ano: z.number().int().nullable().optional(),
  mes: z.number().int().min(1).max(12).optional(),
  dia: z.number().int().min(1).max(31).optional(),
  aproximada: z.boolean().default(false),
  tipo: z.string().max(60),
  tipoOutro: opcional(40),
  // ids de integrantes que já existem, ou "nova:0", "nova:1"... apontando para novasPessoas
  pessoas: z.array(z.string().max(80)).max(60).default([]),
  novasPessoas: z.array(z.object({ nome: z.string().trim().min(1).max(80), tratamento: z.enum(['ela', 'ele']).nullable().optional() })).max(20).default([]),
  lugar: opcional(120),
  nucleos: z.array(z.string().max(80)).max(20).default([]),
  visibilidade: z.enum(['todos', 'nucleos']).default('todos'),
  situacao: z.enum(['rascunho', 'publicada']).default('publicada'),
  fotos: z.array(z.object({ id: z.number().int(), legenda: opcional(200), principal: z.boolean().default(false) })).max(30).default([]),
  // capítulos reunidos em que a memória entra, e temas como texto livre separado por vírgulas
  capitulos: z.array(z.string().max(120)).max(20).optional(),
  temas: z.string().max(500).optional(),
  relato: z
    .object({
      por: z.string().max(80),
      texto: z.string().max(20000),
      // Áudios gravados ou enviados na etapa do relato, ainda soltos (ver api/audios.ts)
      audios: z.array(z.object({ id: z.number().int().positive(), transcricao: z.string().max(20000).optional() })).max(AUDIOS_POR_RELATO).optional(),
    })
    .optional(),
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  // Sem JavaScript, o formulário chega como formulário comum: vira o mesmo pedido, e a resposta vira página
  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) {
    const dados = await request.formData();
    const id = String(dados.get('id') ?? '') || undefined;
    const anterior = id ? await obterMemoria(locals.usuario, id) : undefined;
    const resposta = await tratar(pedidoDoFormulario(dados, anterior), locals);
    const corpo = (await resposta.json()) as { erro?: string; url?: string; situacao?: string };
    if (!resposta.ok) return voltar(request, id ? `/nova?id=${id}` : '/nova', { erro: corpo.erro ?? 'Não consegui salvar.' });
    const recado = corpo.situacao === 'rascunho' ? 'Rascunho salvo.' : anterior?.situacao === 'publicada' ? 'Memória atualizada. A versão anterior está no histórico.' : 'Memória publicada.';
    return voltar(request, corpo.url!, { ok: recado });
  }
  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    return erro(400, 'Envio inválido.');
  }
  return tratar(bruto, locals);
};

/** O formulário comum, no formato do pedido em JSON. Fotos só se enviam com JavaScript: as que já estão ficam. */
function pedidoDoFormulario(dados: FormData, anterior: Memoria | undefined): unknown {
  const texto = (nome: string) => String(dados.get(nome) ?? '').trim();
  const numero = (nome: string) => (texto(nome) ? Number(texto(nome)) : undefined);
  const relato = texto('relato');
  return {
    id: anterior?.id,
    titulo: texto('titulo'),
    ano: numero('ano'),
    mes: numero('mes'),
    dia: numero('dia'),
    aproximada: dados.get('aproximada') === 'on',
    tipo: texto('tipo'),
    tipoOutro: texto('tipo') === 'outro' ? texto('tipoOutro') || undefined : undefined,
    pessoas: dados.getAll('pessoas').map(String),
    lugar: texto('lugar') || undefined,
    capitulos: dados.getAll('capitulos').map(String),
    temas: texto('temas'),
    nucleos: dados.getAll('nucleos').map(String),
    visibilidade: texto('visibilidade') || 'todos',
    situacao: texto('situacao') === 'rascunho' ? 'rascunho' : 'publicada',
    fotos: (anterior?.fotos ?? []).map((f) => ({ id: f.id, legenda: f.legenda ?? undefined, principal: f.principal })),
    relato: relato ? { por: texto('relatoPor'), texto: relato } : undefined,
  };
}

async function tratar(bruto: unknown, locals: App.Locals): Promise<Response> {
  const { usuario } = locals;
  const lido = Pedido.safeParse(bruto);
  if (!lido.success) return erro(400, lido.error.issues[0]?.message ?? 'Confira os campos.');
  const pedido = lido.data;

  // O tipo começa sem marcação no formulário. Um rascunho pode ser salvo sem ele; para publicar, é obrigatório.
  const rascunhoSemTipo = !pedido.tipo && pedido.situacao === 'rascunho';
  if (!rascunhoSemTipo && !locals.tipos.some((t) => t.id === pedido.tipo)) return erro(400, 'Escolha o tipo de momento.');

  // Edição: a memória precisa existir, ser visível para a pessoa e poder ser alterada por ela
  const anterior = pedido.id ? await obterMemoria(usuario, pedido.id) : undefined;
  if (pedido.id && !anterior) return erro(404, 'Memória não encontrada.');
  if (anterior) {
    const decisao = podeEditarMemoria(usuario, anterior);
    if (!decisao.ok) return erro(403, decisao.motivo);
  }
  // Uma memória publicada não volta a ser rascunho
  const situacao = anterior?.situacao === 'publicada' ? 'publicada' : pedido.situacao;
  if (situacao === 'publicada' && !pedido.tipo) return erro(400, 'Escolha o tipo de momento.');
  // O ano também: o rascunho pode ser salvo só com o título, e para publicar o ano é obrigatório
  // (resposta do Gui à P132 do QA de design, 17/11/2026). Ano informado é conferido sempre.
  const ano = pedido.ano || undefined;
  if (ano === undefined && situacao === 'publicada') return erro(400, 'Informe o ano, mesmo que seja aproximado.');
  const erroData = ano === undefined ? undefined : validarData(ano, pedido.mes, pedido.dia);
  if (erroData) return erro(400, erroData);

  // Núcleos: a pessoa marca os seus. Numa edição, os que já estavam continuam valendo.
  const nucleosExistentes = new Set((await listarNucleos()).map((n) => n.id));
  const permitidos = new Set([...usuario.nucleos, ...(anterior?.nucleos ?? [])]);
  const nucleos = [...new Set(pedido.nucleos)];
  if (nucleos.some((n) => !nucleosExistentes.has(n) || !permitidos.has(n))) {
    return erro(400, 'Você só pode marcar famílias de que faz parte.');
  }
  if (anterior) {
    const quemVe = podeMudarQuemVe(usuario, anterior, pedido.visibilidade, nucleos);
    if (!quemVe.ok) return erro(403, quemVe.motivo);
  }
  const visivel = validarVisibilidade(usuario, pedido.visibilidade, nucleos);
  if (!visivel.ok) return erro(400, visivel.motivo);

  // Pessoas novas: cadastro mínimo, reaproveitando quem já existe com o mesmo nome
  // Só se marca quem a pessoa vê: quem só existe num laço privado de outra pessoa não pode ser marcado
  // nem reaproveitado pelo nome (C1, 17/11/2026). Os ids de todos só servem para o id novo não repetir.
  const integrantesAtuais = await listarIntegrantesQueVe(usuario);
  const marcaveis = new Set(integrantesAtuais.map((i) => i.id));
  // "nova" é o endereço do formulário de cadastro, então não pode ser id de ninguém
  const idsIntegrantes = new Set([...(await listarIntegrantes()).map((i) => i.id), 'nova']);
  const idsNovas: string[] = [];
  for (const nova of pedido.novasPessoas) {
    const base = criarSlug(nova.nome);
    const jaExiste = integrantesAtuais.find((i) => criarSlug(i.nome) === base);
    if (jaExiste) {
      idsNovas.push(jaExiste.id);
      continue;
    }
    const id = slugUnico(base, idsIntegrantes);
    await criarIntegrante(id, nova.nome, usuario.pessoa, nova.tratamento ?? null);
    idsIntegrantes.add(id);
    idsNovas.push(id);
  }
  const resolver = (ref: string): string | undefined => {
    const nova = /^nova:(\d+)$/.exec(ref);
    if (nova) return idsNovas[Number(nova[1])];
    return marcaveis.has(ref) ? ref : undefined;
  };
  const integrantes: string[] = [];
  for (const ref of pedido.pessoas) {
    const id = resolver(ref);
    if (!id) return erro(400, 'Uma das pessoas marcadas não existe no acervo.');
    if (!integrantes.includes(id)) integrantes.push(id);
  }
  // Numa edição, quem já estava marcado e a pessoa não vê continua: o formulário nem mostrou essa marca
  for (const id of anterior?.integrantes ?? []) if (!marcaveis.has(id) && !integrantes.includes(id)) integrantes.push(id);

  // Fotos: entram as que a pessoa acabou de enviar e as que já eram desta memória
  const fotosNoBanco = await obterFotos(pedido.fotos.map((f) => f.id));
  for (const foto of pedido.fotos) {
    const registro = fotosNoBanco.find((f) => f.id === foto.id);
    // A foto presa a um relato em rascunho espera o relato: não entra pelo formulário da memória
    const solta = registro && registro.memoriaId === null && registro.relatoId === null && registro.enviadaPor === usuario.pessoa;
    const desta = registro && anterior && registro.memoriaId === anterior.id;
    if (!solta && !desta) return erro(400, 'Uma das fotos não foi encontrada. Tente enviar de novo.');
  }
  const fotos = pedido.fotos.map((f) => ({ ...f }));
  if (fotos.length > 0 && !fotos.some((f) => f.principal)) fotos[0].principal = true;

  // O administrador que não criou a memória nem está nela corrige só os dados (decisão do Gui, 16/11/2026)
  if (anterior && alcanceDaCorrecao(usuario, anterior) === 'dados') {
    const conteudo = mudancaDeConteudo(anterior, { titulo: pedido.titulo, nucleos, fotos: pedido.fotos });
    if (!conteudo.ok) return erro(403, conteudo.motivo);
  }

  // Fotos que saíram da lista vão para a lixeira; quem tira é quem enviou ou um administrador
  const mantidas = new Set(fotos.map((f) => f.id));
  const removidas = (anterior?.fotos ?? []).filter((f) => !mantidas.has(f.id));
  for (const foto of removidas) {
    const decisao = podeRemoverFoto(usuario, foto.enviadaPor);
    if (!decisao.ok) return erro(403, decisao.motivo);
  }

  // Capítulos: só os reunidos que a pessoa vê. Os que ela não vê e já estavam continuam.
  let capitulos: string[] | undefined;
  if (pedido.capitulos) {
    const visiveis = new Set((await listarCapitulos(usuario)).filter((c) => c.modo === 'reunido').map((c) => c.id));
    if (pedido.capitulos.some((c) => !visiveis.has(c))) return erro(400, 'Um dos capítulos marcados não existe.');
    const ocultos = (anterior?.capitulos ?? []).filter((c) => !visiveis.has(c));
    capitulos = [...new Set([...pedido.capitulos, ...ocultos])];
  }
  const temas = pedido.temas === undefined ? undefined : await garantirTemas(lerTemas(pedido.temas), usuario);

  const dados: DadosDaMemoria = {
    titulo: pedido.titulo,
    ano: ano ?? SEM_ANO,
    mes: pedido.mes,
    dia: pedido.mes ? pedido.dia : undefined,
    aproximada: pedido.aproximada,
    tipo: pedido.tipo,
    tipoOutro: pedido.tipo === TIPO_OUTRO ? pedido.tipoOutro || undefined : undefined,
    lugar: pedido.lugar || undefined,
    visibilidade: pedido.visibilidade,
    situacao,
    nucleos,
    integrantes,
    capitulos,
    temas,
    fotos,
  };

  // Relato de quem está registrando (ou de alguém sem acesso, registrado por ela)
  const textoDoRelato = pedido.relato ? arrumarTexto(pedido.relato.texto) : '';
  let relatoPor: string | undefined;
  const audiosDoRelato = pedido.relato?.audios;
  if (pedido.relato && (textoDoRelato || audiosDoRelato?.length)) {
    relatoPor = resolver(pedido.relato.por);
    if (!relatoPor) return erro(400, 'Não encontrei a pessoa que contou o relato.');
  }

  let id: string;
  if (anterior) {
    id = anterior.id;
    await atualizarMemoria(anterior, dados, usuario, removidas.map((f) => f.id));
  } else {
    // Um código no endereço, e não o título: ver codigoNovo
    id = codigoNovo(await idsDeMemorias());
    await criarMemoria(id, dados, usuario);
  }
  // Avisos: quem entrou agora em "Quem estava" de uma memória publicada (src/lib/avisos.ts)
  const antes = anterior?.situacao === 'publicada' ? anterior.integrantes : [];
  await avisarQuemEstava({ id, situacao, visibilidade: dados.visibilidade, nucleos, integrantes, criadaPor: anterior?.criadaPor ?? usuario.pessoa }, antes, usuario);

  if (relatoPor) {
    const existente = await obterRelato(id, relatoPor, usuario);
    const decisao = podeEscreverRelato(usuario, relatoPor, existente, await pessoasComAcesso());
    if (!decisao.ok) return erro(403, `A memória foi salva, mas o relato não: ${decisao.motivo}`);
    // Relato já publicado continua publicado. Os demais acompanham a situação da memória.
    const situacaoDoRelato = existente?.situacao === 'publicada' ? 'publicada' : situacao;
    await salvarRelato(id, relatoPor, textoDoRelato, situacaoDoRelato, usuario, existente);
    if (audiosDoRelato) {
      const meu = await obterRelatoRegistradoPor(id, relatoPor, usuario);
      if (meu) await ligarAudios(meu.id, id, audiosDoRelato, usuario);
    }
  }

  return json({ id, situacao, url: situacao === 'rascunho' ? `/nova?id=${id}` : `/memorias/${id}` }, anterior ? 200 : 201);
}
