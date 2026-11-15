// Cria ou atualiza uma memória: a ficha, as fotos já enviadas, pessoas novas,
// núcleos, visibilidade e, se houver, o relato de quem está registrando.
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { lerTemas } from '../../lib/capitulos';
import { TIPO_OUTRO } from '../../lib/tipos';
import { pessoasComAcesso } from '../../lib/servidor/acesso';
import { arrumarTexto, criarSlug, slugUnico, validarData } from '../../lib/servidor/conteudo';
import { erro, json, mesmaOrigem } from '../../lib/servidor/http';
import { podeEditarMemoria, podeEscreverRelato, podeRemoverFoto, validarVisibilidade } from '../../lib/servidor/permissoes';
import {
  atualizarMemoria,
  criarIntegrante,
  criarMemoria,
  garantirTemas,
  listarCapitulos,
  idsDeMemorias,
  listarIntegrantes,
  listarNucleos,
  obterFotos,
  obterMemoria,
  obterRelato,
  salvarRelato,
  type DadosDaMemoria,
} from '../../lib/servidor/repositorio';

const opcional = (maximo: number) => z.string().trim().max(maximo).optional();

const Pedido = z.object({
  id: z.string().max(120).optional(),
  titulo: z.string().trim().min(1, 'Dê um título para a memória.').max(120),
  ano: z.number().int(),
  mes: z.number().int().min(1).max(12).optional(),
  dia: z.number().int().min(1).max(31).optional(),
  aproximada: z.boolean().default(false),
  tipo: z.string().max(60),
  tipoOutro: opcional(40),
  // ids de integrantes que já existem, ou "nova:0", "nova:1"... apontando para novasPessoas
  pessoas: z.array(z.string().max(80)).max(60).default([]),
  novasPessoas: z.array(z.object({ nome: z.string().trim().min(1).max(80) })).max(20).default([]),
  lugar: opcional(120),
  nucleos: z.array(z.string().max(80)).max(20).default([]),
  visibilidade: z.enum(['todos', 'nucleos']).default('todos'),
  situacao: z.enum(['rascunho', 'publicada']).default('publicada'),
  fotos: z.array(z.object({ id: z.number().int(), legenda: opcional(200), principal: z.boolean().default(false) })).max(30).default([]),
  // capítulos reunidos em que a memória entra, e temas como texto livre separado por vírgulas
  capitulos: z.array(z.string().max(120)).max(20).optional(),
  temas: z.string().max(500).optional(),
  relato: z.object({ por: z.string().max(80), texto: z.string().max(20000) }).optional(),
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  const { usuario } = locals;

  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    return erro(400, 'Envio inválido.');
  }
  const lido = Pedido.safeParse(bruto);
  if (!lido.success) return erro(400, lido.error.issues[0]?.message ?? 'Confira os campos.');
  const pedido = lido.data;

  if (!locals.tipos.some((t) => t.id === pedido.tipo)) return erro(400, 'Escolha o tipo de momento.');

  const erroData = validarData(pedido.ano, pedido.mes, pedido.dia);
  if (erroData) return erro(400, erroData);

  // Edição: a memória precisa existir, ser visível para a pessoa e poder ser alterada por ela
  const anterior = pedido.id ? await obterMemoria(usuario, pedido.id) : undefined;
  if (pedido.id && !anterior) return erro(404, 'Memória não encontrada.');
  if (anterior) {
    const decisao = podeEditarMemoria(usuario, anterior);
    if (!decisao.ok) return erro(403, decisao.motivo);
  }
  // Uma memória publicada não volta a ser rascunho
  const situacao = anterior?.situacao === 'publicada' ? 'publicada' : pedido.situacao;

  // Núcleos: a pessoa marca os seus. Numa edição, os que já estavam continuam valendo.
  const nucleosExistentes = new Set((await listarNucleos()).map((n) => n.id));
  const permitidos = new Set([...usuario.nucleos, ...(anterior?.nucleos ?? [])]);
  const nucleos = [...new Set(pedido.nucleos)];
  if (nucleos.some((n) => !nucleosExistentes.has(n) || !permitidos.has(n))) {
    return erro(400, 'Você só pode marcar núcleos de que faz parte.');
  }
  const visivel = validarVisibilidade(usuario, pedido.visibilidade, nucleos);
  if (!visivel.ok) return erro(400, visivel.motivo);

  // Pessoas novas: cadastro mínimo, reaproveitando quem já existe com o mesmo nome
  const integrantesAtuais = await listarIntegrantes();
  // "nova" é o endereço do formulário de cadastro, então não pode ser id de ninguém
  const idsIntegrantes = new Set([...integrantesAtuais.map((i) => i.id), 'nova']);
  const idsNovas: string[] = [];
  for (const nova of pedido.novasPessoas) {
    const base = criarSlug(nova.nome);
    const jaExiste = integrantesAtuais.find((i) => criarSlug(i.nome) === base);
    if (jaExiste) {
      idsNovas.push(jaExiste.id);
      continue;
    }
    const id = slugUnico(base, idsIntegrantes);
    await criarIntegrante(id, nova.nome, usuario.pessoa);
    idsIntegrantes.add(id);
    idsNovas.push(id);
  }
  const resolver = (ref: string): string | undefined => {
    const nova = /^nova:(\d+)$/.exec(ref);
    if (nova) return idsNovas[Number(nova[1])];
    return ref !== 'nova' && idsIntegrantes.has(ref) ? ref : undefined;
  };
  const integrantes: string[] = [];
  for (const ref of pedido.pessoas) {
    const id = resolver(ref);
    if (!id) return erro(400, 'Uma das pessoas marcadas não existe no acervo.');
    if (!integrantes.includes(id)) integrantes.push(id);
  }

  // Fotos: entram as que a pessoa acabou de enviar e as que já eram desta memória
  const fotosNoBanco = await obterFotos(pedido.fotos.map((f) => f.id));
  for (const foto of pedido.fotos) {
    const registro = fotosNoBanco.find((f) => f.id === foto.id);
    const solta = registro && registro.memoriaId === null && registro.enviadaPor === usuario.pessoa;
    const desta = registro && anterior && registro.memoriaId === anterior.id;
    if (!solta && !desta) return erro(400, 'Uma das fotos não foi encontrada. Tente enviar de novo.');
  }
  const fotos = pedido.fotos.map((f) => ({ ...f }));
  if (fotos.length > 0 && !fotos.some((f) => f.principal)) fotos[0].principal = true;

  // Fotos que saíram da lista vão para a lixeira, e só quem enviou pode tirá-las
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
    ano: pedido.ano,
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
  if (pedido.relato && textoDoRelato) {
    relatoPor = resolver(pedido.relato.por);
    if (!relatoPor) return erro(400, 'Não encontrei a pessoa que contou o relato.');
  }

  let id: string;
  if (anterior) {
    id = anterior.id;
    await atualizarMemoria(anterior, dados, usuario, removidas.map((f) => f.id));
  } else {
    id = slugUnico(`${pedido.ano}-${criarSlug(pedido.titulo)}`, await idsDeMemorias());
    await criarMemoria(id, dados, usuario);
  }

  if (relatoPor) {
    const existente = await obterRelato(id, relatoPor);
    const decisao = podeEscreverRelato(usuario, relatoPor, existente, await pessoasComAcesso());
    if (!decisao.ok) return erro(403, `A memória foi salva, mas o relato não: ${decisao.motivo}`);
    // Relato já publicado continua publicado. Os demais acompanham a situação da memória.
    const situacaoDoRelato = existente?.situacao === 'publicada' ? 'publicada' : situacao;
    await salvarRelato(id, relatoPor, textoDoRelato, situacaoDoRelato, usuario, existente);
  }

  return json({ id, situacao, url: situacao === 'rascunho' ? `/nova?id=${id}` : `/memorias/${id}` }, anterior ? 200 : 201);
};
