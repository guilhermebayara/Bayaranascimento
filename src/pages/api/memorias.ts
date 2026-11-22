// Cria ou atualiza uma memória: a ficha, as fotos já enviadas, pessoas novas,
// núcleos, visibilidade e, se houver, o relato de quem está registrando.
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { lerTemas } from '../../lib/capitulos';
import { SEM_ANO } from '../../lib/datas';
import { mensagemDaPessoaPrivada } from '../../lib/memoria';
import { TIPO_OUTRO } from '../../lib/tipos';
import { AUDIOS_POR_RELATO } from '../../lib/audios';
import { MENSAGENS_POR_RELATO, paragrafos, soAcrescentou, textoDasMensagens, type Mensagem } from '../../lib/conversa';
import { pessoasComAcesso } from '../../lib/servidor/acesso';
import { arrumarTexto, codigoNovo, criarSlug, slugUnico, validarData } from '../../lib/servidor/conteudo';
import { avisosDeQuemEstava, mudancaDeQuemVe } from '../../lib/servidor/avisos';
import { erro, json, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { alcanceDaCorrecao, mudancaDeConteudo, podeEditarMemoria, podeEscreverRelato, podeMudarQuemVe, podeRemoverFoto, publicoMudou, validarVisibilidade } from '../../lib/servidor/permissoes';
import {
  atualizarMemoria,
  comandoDeCriarIntegrante,
  comandosDeAbrirLacosPrivados,
  comandosDoRelato,
  comandosDosAvisos,
  criarMemoria,
  resolverTemas,
  type Comando,
  listarCapitulos,
  idsDeMemorias,
  listarIntegrantes,
  listarIntegrantesQueVe,
  listarNucleos,
  obterFotos,
  obterMemoria,
  obterRelato,
  type DadosDaMemoria,
  type Memoria,
  audiosQueEntram,
  comandosDasMensagens,
  comandosDosAudios,
  pessoasQueSoVoceVe,
  listarAudiosDosRelatos,
  listarMensagensDosRelatos,
  codigoRepetido,
  MemoriaMudou,
  RECADO_MEMORIA_MUDOU,
  refazerSeAMemoriaMudou,
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
  // Publicar com alguém que só você vê: a escolha da pessoa depois do aviso (ver mensagemDaPessoaPrivada)
  pessoasPrivadas: z.enum(['abrir', 'sem-citar']).optional(),
  // As fotos que ficam, na ordem. Sem a lista (o formulário sem script), as fotos ficam como estão
  fotos: z.array(z.object({ id: z.number().int(), legenda: opcional(200), principal: z.boolean().default(false) })).max(30).optional(),
  // As fotos que a página mostrava quando abriu: só sai da memória a que está aqui e não está em "fotos"
  // (Y3 do PR #160). A foto que entrou depois não está em nenhuma das duas, e fica
  fotosMostradas: z.array(z.number().int()).max(60).optional(),
  // capítulos reunidos em que a memória entra, e temas como texto livre separado por vírgulas
  capitulos: z.array(z.string().max(120)).max(20).optional(),
  temas: z.string().max(500).optional(),
  relato: z
    .object({
      por: z.string().max(80),
      texto: z.string().max(20000),
      // Áudios gravados ou enviados na etapa do relato, ainda soltos (ver api/audios.ts)
      audios: z.array(z.object({ id: z.number().int().positive(), transcricao: z.string().max(20000).optional() })).max(AUDIOS_POR_RELATO).optional(),
      // O relato como conversa (src/lib/conversa.ts): as mensagens, na ordem. Na memória nova, só texto e áudio
      mensagens: z
        .array(
          z.object({
            id: z.number().int().positive().optional(),
            tipo: z.enum(['texto', 'audio']),
            texto: z.string().max(20000).optional(),
            audioId: z.number().int().positive().optional(),
          }),
        )
        .max(MENSAGENS_POR_RELATO)
        .optional(),
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
    const resposta = await tratarComAMemoriaDeAgora(pedidoDoFormulario(dados, anterior), locals);
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
  return tratarComAMemoriaDeAgora(bruto, locals);
};

/**
 * Mudar quem vê conta com os relatos que a rota leu. Se outro lote mudou a memória ou os relatos dela no
 * meio tempo (um relato novo, uma resposta ao pedido, outro salvamento), o lote volta sem gravar nada
 * (MemoriaMudou), e o pedido é tratado de novo, lendo o banco de agora: a espera sai de todo relato que
 * existe na hora do lote (revisão Y2 do PR #160, item 4b). Tratar não grava nada antes do lote: a pessoa
 * nova e o tema novo só ganham o id antes e são cadastrados no mesmo lote da memória, então a nova
 * tentativa começa do zero (Y3 do PR #160). Depois de três tentativas, a pessoa recebe o recado, com e
 * sem script.
 */
async function tratarComAMemoriaDeAgora(bruto: unknown, locals: App.Locals): Promise<Response> {
  // O código da memória, da pessoa nova ou do tema novo que outro pedido usou no meio tempo: o lote voltou
  // inteiro, e o site tenta de novo sozinho, com outro código. Se ainda assim falhar, a pessoa volta para a
  // página com o recado e com o que digitou (D2 da sessão Z, 22/11/2026)
  for (let vez = 1; ; vez++) {
    try {
      const resposta = await refazerSeAMemoriaMudou(() => tratar(bruto, locals));
      return resposta instanceof MemoriaMudou ? erro(409, RECADO_MEMORIA_MUDOU) : resposta;
    } catch (e) {
      if (!codigoRepetido(e)) throw e;
      if (vez >= TENTATIVAS_COM_CODIGO_NOVO) return erro(503, 'Não consegui salvar.');
    }
  }
}
const TENTATIVAS_COM_CODIGO_NOVO = 3;

const mesmasFamilias = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((n) => b.includes(n));

/**
 * O formulário comum, no formato do pedido em JSON. Fotos só se enviam e se tiram com JavaScript: sem a
 * lista, as que a memória tem na hora de gravar ficam, lidas dentro de cada tentativa (Y3 do PR #160).
 */
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
    fotosMostradas: dados.getAll('fotosMostradas').map(Number).filter((n) => Number.isInteger(n) && n > 0),
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
  // As pessoas novas só ganham o id aqui: o cadastro é gravado depois de todas as conferências, para um
  // pedido recusado não deixar ninguém cadastrado pela metade (QA de 23/11/2026, docs/historico/qa/2026-11-23-relatorio.md)
  const idsNovas: string[] = [];
  const aCadastrar: { id: string; nome: string; tratamento: 'ela' | 'ele' | null }[] = [];
  for (const nova of pedido.novasPessoas) {
    const base = criarSlug(nova.nome);
    const jaExiste = integrantesAtuais.find((i) => criarSlug(i.nome) === base) ?? aCadastrar.find((c) => criarSlug(c.nome) === base);
    if (jaExiste) {
      idsNovas.push(jaExiste.id);
      continue;
    }
    const id = slugUnico(base, idsIntegrantes);
    aCadastrar.push({ id, nome: nova.nome, tratamento: nova.tratamento ?? null });
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

  // Fotos: entram as que a pessoa acabou de enviar e as que já eram desta memória. Sem a lista, ficam as que
  // a memória tem agora, lidas nesta tentativa (anterior é lido de novo a cada vez)
  const pedidas = pedido.fotos ?? (anterior?.fotos ?? []).map((f) => ({ id: f.id, legenda: f.legenda ?? undefined, principal: f.principal }));
  const fotosNoBanco = await obterFotos(pedidas.map((f) => f.id));
  for (const foto of pedidas) {
    const registro = fotosNoBanco.find((f) => f.id === foto.id);
    // A foto presa a um relato em rascunho espera o relato: não entra pelo formulário da memória
    const solta = registro && registro.memoriaId === null && registro.relatoId === null && registro.enviadaPor === usuario.pessoa;
    const desta = registro && anterior && registro.memoriaId === anterior.id;
    if (!solta && !desta) return erro(400, 'Uma das fotos não foi encontrada. Tente enviar de novo.');
  }
  const fotos = pedidas.map((f) => ({ ...f }));
  if (fotos.length > 0 && !fotos.some((f) => f.principal)) fotos[0].principal = true;

  // Só sai da memória a foto que a pessoa viu e tirou (Y3 do PR #160): a que a página mostrava e não está
  // mais na lista. A que entrou depois (por um relato, por "Acrescentar fotos") fica, no fim da ordem e como
  // estava. A página de antes, que não diz o que mostrava, não tira foto nenhuma
  const mostradas = new Set(pedido.fotosMostradas ?? []);
  const mantidas = new Set(fotos.map((f) => f.id));
  const removidas = (anterior?.fotos ?? []).filter((f) => mostradas.has(f.id) && !mantidas.has(f.id));
  const naoVistas = (anterior?.fotos ?? []).filter((f) => !mantidas.has(f.id) && !mostradas.has(f.id));
  const temPrincipal = fotos.some((f) => f.principal);
  for (const f of naoVistas) fotos.push({ id: f.id, legenda: f.legenda ?? undefined, principal: f.principal && !temPrincipal });

  // O administrador que não criou a memória nem está nela corrige só os dados (decisão do Gui, 16/11/2026)
  if (anterior && alcanceDaCorrecao(usuario, anterior) === 'dados') {
    // As fotos que a página não mostrava ficam como estão: a conferência é só sobre as que a pessoa viu
    const vistas = pedido.fotosMostradas ? anterior.fotos.filter((f) => mostradas.has(f.id)) : anterior.fotos;
    const conteudo = mudancaDeConteudo({ ...anterior, fotos: vistas }, { titulo: pedido.titulo, nucleos, fotos: pedidas });
    if (!conteudo.ok) return erro(403, conteudo.motivo);
  }

  // As fotos tiradas vão para a lixeira; quem tira é quem enviou ou um administrador
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
    temas: undefined,
    fotos,
  };

  // Relato de quem está registrando (ou de alguém sem acesso, registrado por ela)
  const textoDoRelato = pedido.relato ? arrumarTexto(pedido.relato.texto) : '';
  let relatoPor: string | undefined;
  const audiosDoRelato = pedido.relato?.audios;
  if (pedido.relato && (textoDoRelato || audiosDoRelato?.length)) {
    relatoPor = resolver(pedido.relato.por);
    if (!relatoPor) return erro(400, 'Não encontrei a pessoa que contou o relato.');
    // Conferido antes de salvar: o relato recusado não deixa a memória salva sem ele (QA de 23/11/2026, docs/historico/qa/2026-11-23-relatorio.md)
    const existente = anterior ? await obterRelato(anterior.id, relatoPor, usuario) : undefined;
    const decisao = podeEscreverRelato(usuario, relatoPor, existente, await pessoasComAcesso());
    if (!decisao.ok) return erro(403, decisao.motivo);
  }

  // Memória com alguém que só você vê (docs/decisoes.md): o site nunca publica revelando por tabela uma
  // pessoa que só existe num laço "só eu vejo". Sem escolha, nada é salvo e a pessoa decide: abrir a
  // pessoa para todos, publicar sem citá-la ou continuar em rascunho (que salva sem esta conferência).
  // "Abrir" entra no lote da memória: se ele perde, o laço continua "só eu vejo" (Y3 do PR #160)
  let lacosAbertos: Comando[] = [];
  if (situacao === 'publicada') {
    const soMinhas = await pessoasQueSoVoceVe(usuario);
    const privadas = integrantes.filter((i) => soMinhas.has(i));
    if (privadas.length > 0) {
      if (pedido.pessoasPrivadas === 'abrir') lacosAbertos = comandosDeAbrirLacosPrivados(usuario, privadas);
      else if (pedido.pessoasPrivadas === 'sem-citar') for (const p of privadas) integrantes.splice(integrantes.indexOf(p), 1);
      else {
        const nomes = privadas.map((p) => integrantesAtuais.find((i) => i.id === p)?.nome ?? p);
        return json({ erro: mensagemDaPessoaPrivada(nomes, anterior?.situacao === 'publicada'), codigo: 'pessoa-privada', pessoas: privadas.map((id, n) => ({ id, nome: nomes[n] })) }, 409);
      }
    }
  }

  // Tudo conferido. Nada é gravado antes do lote: as pessoas novas e os temas novos só ganham o id aqui, e o
  // cadastro deles vai no mesmo lote da memória, junto com o laço aberto, o relato e os avisos. Se o lote
  // perde a corrida (MemoriaMudou), nada fica, e a nova tentativa começa do zero (Y3 do PR #160)
  const temasNovos = pedido.temas === undefined ? undefined : await resolverTemas(lerTemas(pedido.temas), usuario);
  dados.temas = temasNovos?.ids;
  const antesDaFicha: Comando[] = [...aCadastrar.map((nova) => comandoDeCriarIntegrante(nova.id, nova.nome, usuario.pessoa, nova.tratamento)), ...(temasNovos?.comandos ?? []), ...lacosAbertos];

  let id = anterior?.id ?? '';
  // Um código no endereço, e não o título: ver codigoNovo
  if (!anterior) id = codigoNovo(await idsDeMemorias());
  // Avisos: quem entrou agora em "Quem estava" de uma memória publicada (src/lib/avisos.ts)
  const marcadosAntes = anterior?.situacao === 'publicada' ? anterior.integrantes : [];
  const avisos = comandosDosAvisos(await avisosDeQuemEstava({ id, situacao, visibilidade: dados.visibilidade, nucleos, integrantes, criadaPor: anterior?.criadaPor ?? usuario.pessoa }, marcadosAntes, usuario));

  // Relato de quem está registrando: no mesmo lote, com os áudios e as mensagens dele. Relato já publicado
  // continua publicado; os demais acompanham a situação da memória. Um lote só: se ele falha, nada fica, o
  // áudio continua solto e a nova tentativa cria a memória uma vez (D1, revisões do PR #160)
  let doRelato: { comandos: Comando[]; nasce: boolean } | undefined;
  if (relatoPor) {
    const existente = anterior ? await obterRelato(id, relatoPor, usuario) : undefined;
    const situacaoDoRelato = existente?.situacao === 'publicada' ? 'publicada' : situacao;
    // As mensagens de antes, para o histórico e para o envio sem script, que acrescenta no fim
    const antesDoRelato = existente ? ((await listarMensagensDosRelatos([existente])).get(existente.id) ?? []) : [];
    const mensagens: Mensagem[] = pedido.relato?.mensagens
      ? pedido.relato.mensagens.map((m) => ({ ...(m.id ? { id: m.id } : {}), tipo: m.tipo, ...(m.tipo === 'texto' ? { texto: arrumarTexto(m.texto ?? '') } : { audioId: m.audioId }) }))
      : [...antesDoRelato, ...paragrafos(textoDoRelato).map((t) => ({ tipo: 'texto' as const, texto: t }))];
    const texto = pedido.relato?.mensagens ? textoDasMensagens(mensagens) : textoDasMensagens(mensagens) || textoDoRelato;
    // O relato de quem registra: o id, se já existe, ou a consulta que o acha no lote em que nasce. O relato
    // registrado por outra pessoa não recebe os áudios nem as mensagens de quem salva
    const meu = !existente ? { memoriaId: id, por: relatoPor, registradoPor: usuario.pessoa } : existente.registradoPor === usuario.pessoa ? existente.id : undefined;
    const relatoId = typeof meu === 'number' ? meu : null;
    // Os áudios: só os que a pessoa enviou para esta memória e ainda estão soltos ou neste relato. Sem a
    // lista, os do relato ficam como estão
    const aceitos = meu && audiosDoRelato ? await audiosQueEntram(relatoId, id, audiosDoRelato, usuario) : undefined;
    const ficaram = new Set(aceitos ? aceitos.map((a) => a.id) : relatoId ? ((await listarAudiosDosRelatos([relatoId])).get(relatoId) ?? []).map((a) => a.id) : []);
    // Só as mensagens de áudio que ficaram mesmo no relato
    const validas = mensagens.filter((m) => (m.tipo === 'audio' ? ficaram.has(m.audioId!) : Boolean(m.texto?.trim())));
    doRelato = {
      comandos: [
        ...comandosDoRelato(id, relatoPor, texto, situacaoDoRelato, usuario, existente, { guardar: !soAcrescentou(antesDoRelato, mensagens), mensagens: antesDoRelato }),
        ...(meu && aceitos ? comandosDosAudios(meu, id, aceitos) : []),
        ...(meu ? await comandosDasMensagens(meu, validas) : []),
      ],
      nasce: !existente,
    };
  }

  // Quem vê mudou numa memória publicada: ao ampliar, os relatos que já existiam esperam o sim de quem
  // os registrou (docs/decisoes.md, "Ampliar quem vê uma memória com relatos"). Salvar sem mudar o
  // público não toca em relato nenhum, e a mudança grava a memória, os relatos e os pedidos numa
  // transação só (revisão Y do PR #160)
  let esperam: { por: string }[] = [];
  const depoisDaFicha = [...(doRelato?.comandos ?? []), ...avisos];
  if (anterior) {
    const publicoAntes = { visibilidade: anterior.visibilidade, nucleos: anterior.nucleos };
    const publicoDepois = { visibilidade: dados.visibilidade, nucleos };
    // Só quem criou grava o público, e só quando ele mudou de fato. Numa memória aberta a todos, marcar ou
    // tirar famílias grava só as marcas, se ela ainda estiver aberta na hora do lote. Quem não criou nunca
    // regrava o público que leu: se quem criou o mudou no meio tempo, vale o de quem criou (revisão Y2 do PR #160)
    const mudou = anterior.criadaPor === usuario.pessoa && publicoMudou(publicoAntes, publicoDepois);
    const marcas = !mudou && anterior.visibilidade === 'todos' && dados.visibilidade === 'todos' && !mesmasFamilias(anterior.nucleos, nucleos);
    const mudanca =
      mudou && anterior.situacao === 'publicada'
        ? await mudancaDeQuemVe(id, publicoAntes, publicoDepois, usuario, anterior.criadaPor)
        : { comandos: [], esperam: [] };
    esperam = mudanca.esperam;
    // O relato que nasce junto conta com o público que a rota leu: se a memória mudou depois, o lote volta
    await atualizarMemoria(anterior, dados, usuario, removidas.map((f) => f.id), {
      antes: antesDaFicha,
      junto: [...mudanca.comandos, ...depoisDaFicha],
      quemVe: mudou ? 'mudou' : marcas ? 'marcas' : 'nao',
      conferir: Boolean(doRelato?.nasce),
    });
  } else {
    await criarMemoria(id, dados, usuario, { antes: antesDaFicha, junto: depoisDaFicha });
  }

  // "esperam": de quem são os relatos que passaram a esperar, para quem ampliou ver ao salvar
  return json({ id, situacao, url: situacao === 'rascunho' ? `/nova?id=${id}` : `/memorias/${id}`, esperam: esperam.map((r) => r.por) }, anterior ? 200 : 201);
}

