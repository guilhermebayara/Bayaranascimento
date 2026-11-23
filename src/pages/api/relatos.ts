// Escreve ou edita um relato em uma memória que a pessoa vê.
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { pessoasComAcesso } from '../../lib/servidor/acesso';
import { arrumarTexto } from '../../lib/servidor/conteudo';
import { avisarRelatoNovo, comoPublicoAntigo, paraQuemPassouAVer } from '../../lib/servidor/avisos';
import { erro, json, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { chaveDoPublico, podeEscreverRelato, publicoDaChave, relatoQueNasce, veORelato, type Publico, type Usuario } from '../../lib/servidor/permissoes';
import { AUDIOS_POR_RELATO } from '../../lib/audios';
import { MENSAGENS_POR_RELATO, mensagensDerivadas, paragrafos, soAcrescentou, textoDasMensagens, type Mensagem } from '../../lib/conversa';
import {
  comandosDasMensagens,
  gravarMensagens,
  ligarAudios,
  ligarFotosDoRelato,
  listarAudiosDosRelatos,
  listarFotosDoRelato,
  listarIntegrantesQueVe,
  listarMensagensDosRelatos,
  listarNucleos,
  EnvioRepetido,
  MemoriaMudou,
  obterMemoria,
  obterMensagem,
  obterRelato,
  obterRelatoRegistradoPor,
  pessoasQueONaoVe,
  publicosQueAMemoriaJaTeve,
  RECADO_MEMORIA_MUDOU,
  refazerSeAMemoriaMudou,
  salvarRelato,
  type Memoria,
} from '../../lib/servidor/repositorio';

const Pedido = z.object({
  memoria: z.string().max(120),
  por: z.string().max(80),
  // Com áudio, o texto é opcional: o relato pode ser só a voz de quem contou
  texto: z.string().trim().max(20000).default(''),
  situacao: z.enum(['rascunho', 'publicada']).default('publicada'),
  // Só o formulário com script manda a lista. Sem ela, os áudios do relato ficam como estão.
  audios: z
    .array(z.object({ id: z.number().int().positive(), transcricao: z.string().max(20000).optional() }))
    .max(AUDIOS_POR_RELATO, `Um relato pode ter até ${AUDIOS_POR_RELATO} áudios.`)
    .optional(),
  // Fotos pelo relato (docs/decisoes.md): as que a pessoa enviou neste formulário e as que já vieram
  // com o relato, na ordem. Só o formulário com script manda a lista; sem ela, as fotos ficam como estão.
  fotos: z
    .array(z.object({ id: z.number().int().positive(), legenda: z.string().max(200).optional() }))
    .max(30, 'Um relato pode trazer até 30 fotos.')
    .optional(),
  // O relato como conversa (src/lib/conversa.ts): as mensagens, na ordem. Com elas, o texto, os áudios e as
  // fotos saem delas, e o que veio à parte não vale. Só a janela de escrever com script manda.
  mensagens: z
    .array(
      z.object({
        id: z.number().int().positive().optional(),
        tipo: z.enum(['texto', 'audio', 'foto']),
        texto: z.string().max(20000).optional(),
        audioId: z.number().int().positive().optional(),
        fotoId: z.number().int().positive().optional(),
        citaId: z.number().int().positive().nullable().optional(),
        transcricao: z.string().max(20000).optional(),
        legenda: z.string().max(200).optional(),
      }),
    )
    .max(MENSAGENS_POR_RELATO, `Um relato pode ter até ${MENSAGENS_POR_RELATO} mensagens.`)
    .optional(),
  // Sem script, a janela de escrever manda só a mensagem nova: ela entra no fim da conversa
  acrescentar: z.boolean().default(false),
  // Sem script, a mensagem nova pode citar uma mensagem de outra pessoa (o "Citar" da memória)
  cita: z.number().int().positive().optional(),
  // Quem via a memória quando a página abriu (chaveDoPublico): o relato que nasce depois de ela abrir para
  // mais gente nasce só para esse público e espera o sim de quem escreveu (Y3 do PR #160)
  publico: z.string().max(2000).optional(),
  // O código de envio único da janela sem script (D3 da sessão Z): o toque duplo não grava a mensagem duas vezes
  envio: z.string().max(80).optional(),
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  // Sem JavaScript, o formulário chega como formulário comum, e a resposta vira página com recado
  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) {
    const dados = await request.formData();
    const texto = (nome: string) => String(dados.get(nome) ?? '');
    const resposta = await tratarComAMemoriaDeAgora(
      {
        memoria: texto('memoria'),
        por: texto('por'),
        texto: texto('texto'),
        situacao: texto('situacao') || 'publicada',
        acrescentar: texto('acrescentar') === '1',
        ...(Number(texto('cita')) > 0 ? { cita: Number(texto('cita')) } : {}),
        ...(texto('publico') ? { publico: texto('publico') } : {}),
        ...(texto('envio') ? { envio: texto('envio') } : {}),
      },
      locals,
    );
    const corpo = (await resposta.json()) as { erro?: string; url?: string; situacao?: string };
    if (!resposta.ok) return voltar(request, `/memorias/${encodeURIComponent(texto('memoria'))}/relato`, { erro: corpo.erro ?? 'Não consegui salvar.' });
    // A janela sem script: mandou uma mensagem, continua escrevendo; publicou, vai para a memória, no relato
    // de quem publicou (crítica C1). "Publicar relato" se diz pelo nome do botão, para o texto que ficou na
    // caixa ir junto e a pessoa ir à memória do mesmo jeito, também no toque duplo
    if (texto('publicar') === '1') return voltar(request, corpo.url!, { ok: corpo.situacao === 'rascunho' ? 'Rascunho do relato salvo. Só você vê.' : 'Relato publicado.' });
    if (texto('acrescentar') === '1' && (texto('texto').trim() || texto('situacao') !== 'publicada')) {
      const volta = `/memorias/${encodeURIComponent(texto('memoria'))}/relato${texto('por') !== locals.usuario.pessoa ? `?por=${encodeURIComponent(texto('por'))}` : ''}`;
      return voltar(request, volta, { ok: corpo.situacao === 'rascunho' ? 'Mensagem guardada no rascunho. Só você vê até publicar.' : 'Mensagem enviada. Ela já está na memória.' });
    }
    return voltar(request, corpo.url!, { ok: corpo.situacao === 'rascunho' ? 'Rascunho do relato salvo. Só você vê.' : 'Relato publicado.' });
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
 * A gravação do relato confere a versão da memória, como os outros lotes (Y3 do PR #160): se a memória mudou
 * entre a leitura e o lote (outro relato, uma mudança de quem vê), nada é gravado, e o pedido é tratado de
 * novo, lendo a memória de agora. O lote do relato é a primeira gravação de tratar, então a nova tentativa
 * nunca refaz o que já foi gravado. Depois de três tentativas, a pessoa recebe o recado.
 */
async function tratarComAMemoriaDeAgora(bruto: unknown, locals: App.Locals): Promise<Response> {
  const resposta = await refazerSeAMemoriaMudou(() => tratar(bruto, locals));
  return resposta instanceof MemoriaMudou ? erro(409, RECADO_MEMORIA_MUDOU) : resposta;
}

/**
 * Quem via a memória quando a página do relato abriu. A página manda (chaveDoPublico). A página de antes,
 * sem o campo, conta como o público mais fechado que a memória já teve desde que o relato começou: como a
 * página não diz quando abriu, só dá para saber quando quem vê a memória nunca mudou; senão, conta como só
 * a família de quem escreve (decisão do Gui, 22/11/2026).
 */
async function publicoQueAPaginaMostrava(chave: string | undefined, memoria: Memoria, usuario: Usuario): Promise<Publico> {
  const daPagina = chave ? publicoDaChave(chave) : undefined;
  if (daPagina) return daPagina;
  if ((await publicosQueAMemoriaJaTeve(memoria)).size === 1) return memoria;
  return { visibilidade: 'nucleos', nucleos: usuario.nucleos };
}

/**
 * O público que a página mandou precisa ser um que ela pode ter mostrado (D5 da sessão Z): todos, famílias
 * da memória ou de quem escreve, ou um público que a memória já teve (a página aberta antes de quem criou
 * mudar quem vê). O que a tela não oferece é recusado.
 */
async function aPaginaPodeTerMostrado(chave: string, memoria: Memoria, usuario: Usuario): Promise<boolean> {
  const publico = publicoDaChave(chave);
  if (!publico) return false;
  if (publico.visibilidade === 'todos') return true;
  const conhecidas = new Set([...memoria.nucleos, ...usuario.nucleos]);
  if (publico.nucleos.every((n) => conhecidas.has(n))) return true;
  return (await publicosQueAMemoriaJaTeve(memoria)).has(chaveDoPublico(publico));
}

/**
 * O que a tabela dos envios guarda (migração 109): o resumo do código da página junto com quem envia, o
 * relato e o texto. Assim o código só vale para a mesma pessoa, o mesmo relato e o mesmo texto: o toque
 * duplo repete tudo e não grava de novo, e a mesma página enviada outra vez com outro texto grava a mensagem
 * nova, como antes de o código existir (revisão Z2, 23/11/2026). O resumo não se desfaz: nem o código nem o
 * texto ficam na tabela.
 */
async function chaveDoEnvio(codigo: string, pessoa: string, memoriaId: string, por: string, texto: string): Promise<string> {
  const resumo = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([codigo, pessoa, memoriaId, por, texto])));
  return [...new Uint8Array(resumo)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function tratar(bruto: unknown, locals: App.Locals): Promise<Response> {
  const { usuario } = locals;
  const lido = Pedido.safeParse(bruto);
  if (!lido.success) return erro(400, lido.error.issues[0]?.message ?? 'Confira os campos.');
  const { memoria: memoriaId, por } = lido.data;
  let mensagens = lido.data.mensagens;
  // Sem script: a mensagem nova (cada parágrafo, uma mensagem) entra no fim das que o relato já tem.
  // Sem texto novo, é só publicar o que já está lá.
  if (lido.data.acrescentar && !mensagens) {
    const ja = await obterRelato(memoriaId, por, usuario);
    const atuais = ja ? ((await listarMensagensDosRelatos([ja])).get(ja.id) ?? []) : [];
    mensagens = [...atuais, ...paragrafos(lido.data.texto).map((t, i) => ({ tipo: 'texto' as const, texto: t, citaId: i === 0 ? (lido.data.cita ?? null) : null }))];
  }
  // Com as mensagens, o texto, os áudios e as fotos saem delas, na ordem da conversa
  const texto = mensagens ? textoDasMensagens(mensagens) : lido.data.texto;
  const audios = mensagens
    ? mensagens.filter((m) => m.tipo === 'audio' && m.audioId).map((m) => ({ id: m.audioId!, ...(m.transcricao?.trim() ? { transcricao: m.transcricao } : {}) }))
    : lido.data.audios;
  const fotos = mensagens ? mensagens.filter((m) => m.tipo === 'foto' && m.fotoId).map((m) => ({ id: m.fotoId!, ...(m.legenda?.trim() ? { legenda: m.legenda } : {}) })) : lido.data.fotos;
  if (audios && audios.length > AUDIOS_POR_RELATO) return erro(400, `Um relato pode ter até ${AUDIOS_POR_RELATO} áudios.`);

  // Quem não vê a memória recebe o mesmo que para uma memória inexistente
  const memoria = await obterMemoria(usuario, memoriaId);
  if (!memoria) return erro(404, 'Memória não encontrada.');
  if (!(await listarIntegrantesQueVe(usuario)).some((i) => i.id === por)) return erro(400, 'Pessoa não encontrada.');
  if (lido.data.publico !== undefined && !(await aPaginaPodeTerMostrado(lido.data.publico, memoria, usuario))) return erro(400, 'Envio inválido.');

  const existente = await obterRelato(memoriaId, por, usuario);
  const decisao = podeEscreverRelato(usuario, por, existente, await pessoasComAcesso());
  if (!decisao.ok) return erro(403, decisao.motivo);
  // O relato precisa de texto ou de pelo menos um áudio; na conversa, de pelo menos uma mensagem
  if (mensagens) {
    if (!mensagens.some((m) => (m.tipo === 'texto' ? m.texto?.trim() : true))) return erro(400, 'Mande pelo menos uma mensagem: um texto, um áudio ou uma foto.');
  } else {
    const temAudio = audios ? audios.length > 0 : Boolean(existente && (await listarAudiosDosRelatos([existente.id])).get(existente.id)?.length);
    if (!texto.trim() && !temAudio) return erro(400, 'Escreva o relato ou grave um áudio antes de salvar.');
  }

  // Em memória ainda em rascunho, o relato também fica em rascunho. Relato publicado não volta atrás.
  let situacao = lido.data.situacao;
  if (memoria.situacao === 'rascunho') situacao = 'rascunho';
  if (existente?.situacao === 'publicada') situacao = 'publicada';

  // As mensagens de antes, para o histórico: só acrescentar no fim (voltar e contar mais) não guarda versão
  const antes = existente ? ((await listarMensagensDosRelatos([existente])).get(existente.id) ?? []) : [];
  const guardar = !mensagens || !soAcrescentou(antes, mensagens.map(paraMensagem));
  // O relato que nasce depois de a memória abrir para mais gente do que a página mostrava nasce só para esse
  // público e espera o sim de quem escreveu, com o pedido de quem criou a memória (relatoQueNasce). O
  // relato que já existia entrou na conta da ampliação
  let nasce: { soParaNucleos: string[]; de: string; paraQuem: string } | undefined;
  if (!existente && memoria.situacao === 'publicada') {
    const mostrava = await publicoQueAPaginaMostrava(lido.data.publico, memoria, usuario);
    const { soParaNucleos } = relatoQueNasce(mostrava, memoria, usuario.pessoa, memoria.criadaPor);
    if (soParaNucleos) nasce = { soParaNucleos, de: memoria.criadaPor, paraQuem: paraQuemPassouAVer(comoPublicoAntigo(soParaNucleos), memoria, await listarNucleos()) };
  }
  const envio = lido.data.envio ? await chaveDoEnvio(lido.data.envio, usuario.pessoa, memoriaId, por, lido.data.texto) : undefined;
  // O envio sem script (com o código) grava as mensagens no mesmo lote do relato e do código: se o banco falha,
  // nada fica, e a nova tentativa com o mesmo código grava tudo (fila da revisão Z2, sessão AA). As mensagens
  // dele são as do relato, que já estão nele, e as de texto novas: dá para conferir antes do lote
  const mensagensNoLote = envio && mensagens ? await mensagensValidas(mensagens, existente?.id, memoriaId, usuario) : undefined;
  const junto = mensagensNoLote ? await comandosDasMensagens(existente && existente.registradoPor === usuario.pessoa ? existente.id : { memoriaId, por, registradoPor: usuario.pessoa }, mensagensNoLote) : [];
  try {
    await salvarRelato(memoriaId, por, arrumarTexto(texto), situacao, usuario, existente, { guardar, ...(mensagens ? { mensagens: antes } : {}) }, { conferir: memoria.versao, nasce, envio, junto });
  } catch (e) {
    // O mesmo envio de novo (o toque duplo sem script): o primeiro já gravou, e este responde como ele, sem gravar
    if (!(e instanceof EnvioRepetido)) throw e;
    const agora = await obterRelatoRegistradoPor(memoriaId, por, usuario);
    return json({ url: noRelato(memoriaId, agora?.id), situacao: agora?.situacao ?? situacao, editado: true }, 200);
  }
  const salvo = await obterRelatoRegistradoPor(memoriaId, por, usuario);
  if (salvo && audios) await ligarAudios(salvo.id, memoriaId, audios, usuario);
  // Fotos: sem a lista (o formulário sem script), as que já estavam com o relato continuam, e as que
  // esperavam o rascunho entram na memória quando ele é publicado
  if (salvo) {
    const lista = fotos ?? (await listarFotosDoRelato(salvo.id)).map((f) => ({ id: f.id, legenda: f.legenda ?? undefined }));
    if (fotos || lista.length) await ligarFotosDoRelato({ id: salvo.id, memoriaId, situacao }, lista, usuario);
  }
  // As mensagens: só as que apontam para um áudio ou uma foto que ficou mesmo no relato, e a citação só de
  // uma mensagem publicada de outra pessoa, nesta memória, que quem escreve vê
  let gravadas: Mensagem[] | undefined;
  if (salvo && mensagens) {
    // As do envio sem script já foram no lote do relato
    gravadas = mensagensNoLote ? ((await listarMensagensDosRelatos([salvo])).get(salvo.id) ?? []) : await gravarMensagens(salvo.id, await mensagensValidas(mensagens, salvo.id, memoriaId, usuario));
  } else if (salvo) {
    // Sem a lista de mensagens (um envio de antes da conversa), a conversa é refeita do texto, dos áudios e
    // das fotos que ficaram, para não ficar velha
    const [doRelato, fotosDoRelato] = await Promise.all([listarAudiosDosRelatos([salvo.id]), listarFotosDoRelato(salvo.id)]);
    await gravarMensagens(salvo.id, mensagensDerivadas(arrumarTexto(texto), (doRelato.get(salvo.id) ?? []).map((a) => a.id), fotosDoRelato.map((f) => f.id)));
  }
  // Avisos: o relato acabou de ser publicado (src/lib/avisos.ts). Editar um relato publicado não avisa ninguém.
  if (salvo && situacao === 'publicada' && existente?.situacao !== 'publicada') await avisarRelatoNovo(memoria, salvo, usuario);
  return json({ url: noRelato(memoriaId, salvo?.id), situacao, editado: Boolean(existente), ...(gravadas ? { mensagens: gravadas } : {}) }, existente ? 200 : 201);
}

/** A memória, no relato que acabou de ser gravado: publicar leva a ele (crítica C1, resposta do Gui de 22/11/2026) */
const noRelato = (memoriaId: string, relatoId: number | undefined) => `/memorias/${memoriaId}${relatoId ? `#relato-${relatoId}` : ''}`;

/**
 * As mensagens que ficam: só as que apontam para um áudio ou uma foto que está mesmo no relato, e a citação
 * só de uma mensagem publicada de outra pessoa, nesta memória, que quem escreve vê. `relatoId` vazio: o
 * relato ainda vai nascer, e não tem áudio nem foto.
 */
async function mensagensValidas(
  mensagens: { id?: number; tipo: Mensagem['tipo']; texto?: string; audioId?: number; fotoId?: number; citaId?: number | null }[],
  relatoId: number | undefined,
  memoriaId: string,
  usuario: Usuario,
): Promise<Mensagem[]> {
  const [doRelato, fotosDoRelato, naoVe] = await Promise.all([
    relatoId ? listarAudiosDosRelatos([relatoId]) : new Map<number, { id: number }[]>(),
    relatoId ? listarFotosDoRelato(relatoId) : [],
    pessoasQueONaoVe(usuario),
  ]);
  const audiosFicaram = new Set((relatoId ? (doRelato.get(relatoId) ?? []) : []).map((a) => a.id));
  const fotosFicaram = new Set(fotosDoRelato.map((f) => f.id));
  const citaveis = new Map<number, boolean>();
  for (const id of new Set(mensagens.map((m) => m.citaId).filter((c): c is number => Boolean(c)))) {
    const citada = await obterMensagem(id);
    citaveis.set(id, Boolean(citada && citada.memoriaId === memoriaId && citada.relatoId !== relatoId && citada.situacao === 'publicada' && veORelato(citada, usuario, naoVe)));
  }
  return mensagens
    .map(paraMensagem)
    .filter((m) => (m.tipo === 'audio' ? audiosFicaram.has(m.audioId!) : m.tipo === 'foto' ? fotosFicaram.has(m.fotoId!) : Boolean(m.texto?.trim())))
    .map((m) => ({ ...m, citaId: m.tipo === 'texto' && m.citaId && citaveis.get(m.citaId) ? m.citaId : null }));
}

/** A mensagem como o banco guarda, sem a transcrição e a legenda, que moram no áudio e na foto */
function paraMensagem(m: { id?: number; tipo: Mensagem['tipo']; texto?: string; audioId?: number; fotoId?: number; citaId?: number | null }): Mensagem {
  return {
    ...(m.id ? { id: m.id } : {}),
    tipo: m.tipo,
    ...(m.tipo === 'texto' ? { texto: arrumarTexto(m.texto ?? '') } : {}),
    ...(m.tipo === 'audio' ? { audioId: m.audioId } : {}),
    ...(m.tipo === 'foto' ? { fotoId: m.fotoId } : {}),
    citaId: m.citaId ?? null,
  };
}
