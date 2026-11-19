// Escreve ou edita um relato em uma memória que a pessoa vê.
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { pessoasComAcesso } from '../../lib/servidor/acesso';
import { arrumarTexto } from '../../lib/servidor/conteudo';
import { avisarRelatoNovo } from '../../lib/servidor/avisos';
import { erro, json, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { podeEscreverRelato, veORelato } from '../../lib/servidor/permissoes';
import { AUDIOS_POR_RELATO } from '../../lib/audios';
import { MENSAGENS_POR_RELATO, mensagensDerivadas, paragrafos, soAcrescentou, textoDasMensagens, type Mensagem } from '../../lib/conversa';
import {
  gravarMensagens,
  ligarAudios,
  ligarFotosDoRelato,
  listarAudiosDosRelatos,
  listarFotosDoRelato,
  listarIntegrantesQueVe,
  listarMensagensDosRelatos,
  obterMemoria,
  obterMensagem,
  obterRelato,
  obterRelatoRegistradoPor,
  pessoasQueONaoVe,
  salvarRelato,
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
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  // Sem JavaScript, o formulário chega como formulário comum, e a resposta vira página com recado
  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) {
    const dados = await request.formData();
    const texto = (nome: string) => String(dados.get(nome) ?? '');
    const resposta = await tratar(
      {
        memoria: texto('memoria'),
        por: texto('por'),
        texto: texto('texto'),
        situacao: texto('situacao') || 'publicada',
        acrescentar: texto('acrescentar') === '1',
        ...(Number(texto('cita')) > 0 ? { cita: Number(texto('cita')) } : {}),
      },
      locals,
    );
    const corpo = (await resposta.json()) as { erro?: string; url?: string; situacao?: string };
    if (!resposta.ok) return voltar(request, `/memorias/${encodeURIComponent(texto('memoria'))}/relato`, { erro: corpo.erro ?? 'Não consegui salvar.' });
    // A janela sem script: mandou uma mensagem, continua escrevendo; publicou, vai para a memória
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
  return tratar(bruto, locals);
};

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
  await salvarRelato(memoriaId, por, arrumarTexto(texto), situacao, usuario, existente, { guardar, ...(mensagens ? { mensagens: antes } : {}) });
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
    const [doRelato, fotosDoRelato, naoVe] = await Promise.all([listarAudiosDosRelatos([salvo.id]), listarFotosDoRelato(salvo.id), pessoasQueONaoVe(usuario)]);
    const audiosFicaram = new Set((doRelato.get(salvo.id) ?? []).map((a) => a.id));
    const fotosFicaram = new Set(fotosDoRelato.map((f) => f.id));
    const citaveis = new Map<number, boolean>();
    for (const id of new Set(mensagens.map((m) => m.citaId).filter((c): c is number => Boolean(c)))) {
      const citada = await obterMensagem(id);
      citaveis.set(
        id,
        Boolean(citada && citada.memoriaId === memoriaId && citada.relatoId !== salvo.id && citada.situacao === 'publicada' && veORelato(citada, usuario, naoVe)),
      );
    }
    const validas = mensagens
      .map(paraMensagem)
      .filter((m) => (m.tipo === 'audio' ? audiosFicaram.has(m.audioId!) : m.tipo === 'foto' ? fotosFicaram.has(m.fotoId!) : Boolean(m.texto?.trim())))
      .map((m) => ({ ...m, citaId: m.tipo === 'texto' && m.citaId && citaveis.get(m.citaId) ? m.citaId : null }));
    gravadas = await gravarMensagens(salvo.id, validas);
  } else if (salvo) {
    // Sem a lista de mensagens (um envio de antes da conversa), a conversa é refeita do texto, dos áudios e
    // das fotos que ficaram, para não ficar velha
    const [doRelato, fotosDoRelato] = await Promise.all([listarAudiosDosRelatos([salvo.id]), listarFotosDoRelato(salvo.id)]);
    await gravarMensagens(salvo.id, mensagensDerivadas(arrumarTexto(texto), (doRelato.get(salvo.id) ?? []).map((a) => a.id), fotosDoRelato.map((f) => f.id)));
  }
  // Avisos: o relato acabou de ser publicado (src/lib/avisos.ts). Editar um relato publicado não avisa ninguém.
  if (salvo && situacao === 'publicada' && existente?.situacao !== 'publicada') await avisarRelatoNovo(memoria, salvo, usuario);
  return json({ url: `/memorias/${memoriaId}`, situacao, editado: Boolean(existente), ...(gravadas ? { mensagens: gravadas } : {}) }, existente ? 200 : 201);
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
