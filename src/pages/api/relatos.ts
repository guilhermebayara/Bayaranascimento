// Escreve ou edita um relato em uma memória que a pessoa vê.
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { pessoasComAcesso } from '../../lib/servidor/acesso';
import { arrumarTexto } from '../../lib/servidor/conteudo';
import { avisosDeRelatoNovo, comoPublicoAntigo, paraQuemPassouAVer } from '../../lib/servidor/avisos';
import { erro, json, mesmaOrigem, pedeJson, voltar } from '../../lib/servidor/http';
import { recadoDaValidacao, recadoDoTetoDoRelato } from '../../lib/servidor/recados-de-validacao';
import { chaveDoPublico, podeEscreverRelato, publicoDaChave, relatoQueNasce, veORelato, type Publico, type Usuario } from '../../lib/servidor/permissoes';
import { AUDIOS_POR_RELATO } from '../../lib/audios';
import { MENSAGENS_POR_RELATO, mensagensDerivadas, paragrafos, soAcrescentou, textoDasMensagens, type Mensagem } from '../../lib/conversa';
import {
  acompanharConversa,
  audiosQueEntram,
  comandosDasFotosDoRelato,
  comandosDasMensagens,
  comandosDosAudios,
  comandosDosAvisos,
  fotosQueEntram,
  listarIntegrantesQueVe,
  listarMensagensDosRelatos,
  listarMensagensGravadas,
  listarNucleos,
  envioJaGravado,
  EnvioRepetido,
  MemoriaMudou,
  obterMemoria,
  obterMensagem,
  obterRelato,
  obterRelatoRegistradoPor,
  pessoasQueONaoVe,
  publicosQueAMemoriaJaTeve,
  RECADO_MEMORIA_MUDOU,
  RelatoMudou,
  refazerSeAMemoriaMudou,
  salvarRelato,
  type Memoria,
  type RelatoNoLote,
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
    .max(AUDIOS_POR_RELATO)
    .optional(),
  // Fotos pelo relato (docs/regras/relatos.md): as que a pessoa enviou neste formulário e as que já vieram
  // com o relato, na ordem. Só o formulário com script manda a lista; sem ela, as fotos ficam como estão.
  fotos: z
    .array(z.object({ id: z.number().int().positive(), legenda: z.string().max(200).optional() }))
    .max(30)
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
    .max(MENSAGENS_POR_RELATO)
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

export const POST: APIRoute = async ({ request, locals, rewrite }) => {
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
    const destino = `/memorias/${encodeURIComponent(texto('memoria'))}/relato`;
    if (resposta instanceof RelatoMudou || !resposta.ok) {
      const conflito = resposta instanceof RelatoMudou;
      const status = conflito ? 409 : resposta.status;
      const recado = conflito ? RECADO_MEMORIA_MUDOU : (await resposta.json() as { erro?: string }).erro ?? 'Não consegui salvar.';
      if (pedeJson(request) || (!rewrite && conflito)) return erro(status, recado);
      const volta = new URL(destino, request.url);
      if (texto('por') !== locals.usuario.pessoa) volta.searchParams.set('por', texto('por'));
      if (Number(texto('cita')) > 0) volta.searchParams.set('cita', texto('cita'));
      volta.searchParams.set('erro', recado);
      if (!rewrite) return voltar(request, volta.href);

      // Devolve a caixa preenchida neste pedido. O texto não vai para o endereço nem para o banco.
      locals.textoDoRelatoDevolvido = texto('texto');
      const pagina = await rewrite(new Request(volta, { method: 'GET', headers: request.headers }));
      if (pagina.headers.has('Location')) return pagina;
      return new Response(pagina.body, { status, headers: pagina.headers });
    }
    const corpo = (await resposta.json()) as { url?: string; situacao?: string };
    // A janela sem script: mandou uma mensagem, continua escrevendo; publicou, vai para a memória, no relato
    // de quem publicou (crítica C1). "Publicar relato" se diz pelo nome do botão, para o texto que ficou na
    // caixa ir junto e a pessoa ir à memória do mesmo jeito, também no toque duplo
    if (texto('publicar') === '1') return voltar(request, corpo.url!, { ok: corpo.situacao === 'rascunho' ? 'Rascunho do relato salvo. Só você vê.' : 'Relato publicado.' });
    if (texto('acrescentar') === '1' && (texto('texto').trim() || texto('situacao') !== 'publicada')) {
      const volta = `${destino}${texto('por') !== locals.usuario.pessoa ? `?por=${encodeURIComponent(texto('por'))}` : ''}`;
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
  const resposta = await tratarComAMemoriaDeAgora(bruto, locals);
  return resposta instanceof RelatoMudou ? erro(409, RECADO_MEMORIA_MUDOU) : resposta;
};

/**
 * A versão da memória é conferida no lote. Ao refazer a conta, a conversa lida no primeiro pedido
 * protege a edição. O envio que só acrescenta relê a conversa para escrever no fim.
 */
async function tratarComAMemoriaDeAgora(bruto: unknown, locals: App.Locals): Promise<Response | RelatoMudou> {
  const conversa = acompanharConversa();
  const resposta = await refazerSeAMemoriaMudou(() => tratar(bruto, locals, conversa));
  if (resposta instanceof RelatoMudou) return resposta;
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

async function tratar(bruto: unknown, locals: App.Locals, conversa: ReturnType<typeof acompanharConversa>): Promise<Response> {
  const { usuario } = locals;
  const lido = Pedido.safeParse(bruto);
  if (!lido.success) return erro(400, recadoDaValidacao(lido.error.issues[0], 'relato'));
  const { memoria: memoriaId, por } = lido.data;
  // A versão precisa ser lida antes das mensagens, inclusive quando o formulário acrescenta no fim.
  const memoria = await obterMemoria(usuario, memoriaId);
  let mensagens = lido.data.mensagens;
  const acrescentar = lido.data.acrescentar && !mensagens;
  // Uma lista do formulário com script pode editar as mídias. Acrescentar só usa as que já estão ligadas.
  const audios = mensagens
    ? mensagens.filter((m) => m.tipo === 'audio' && m.audioId).map((m) => ({ id: m.audioId!, ...(m.transcricao?.trim() ? { transcricao: m.transcricao } : {}) }))
    : acrescentar ? undefined : lido.data.audios;
  const fotos = mensagens ? mensagens.filter((m) => m.tipo === 'foto' && m.fotoId).map((m) => ({ id: m.fotoId!, ...(m.legenda?.trim() ? { legenda: m.legenda } : {}) })) : acrescentar ? undefined : lido.data.fotos;
  const limiteDeAudios = recadoDoTetoDoRelato('audios', AUDIOS_POR_RELATO);
  if (audios && audios.length > AUDIOS_POR_RELATO) return erro(400, limiteDeAudios);

  // Quem não vê a memória recebe o mesmo que para uma memória inexistente
  if (!memoria) return erro(404, 'Memória não encontrada.');
  if (!(await listarIntegrantesQueVe(usuario)).some((i) => i.id === por)) return erro(400, 'Pessoa não encontrada.');
  if (lido.data.publico !== undefined && !(await aPaginaPodeTerMostrado(lido.data.publico, memoria, usuario))) return erro(400, 'Envio inválido.');

  const existente = await obterRelato(memoriaId, por, usuario);
  const decisao = podeEscreverRelato(usuario, por, existente, await pessoasComAcesso());
  if (!decisao.ok) return erro(403, decisao.motivo);
  // Em memória ainda em rascunho, o relato também fica em rascunho. Relato publicado não volta atrás.
  let situacao = lido.data.situacao;
  if (memoria.situacao === 'rascunho') situacao = 'rascunho';
  if (existente?.situacao === 'publicada') situacao = 'publicada';
  const envio = lido.data.envio ? await chaveDoEnvio(lido.data.envio, usuario.pessoa, memoriaId, por, lido.data.texto) : undefined;
  const repetirResposta = async () => {
    const agora = await obterRelatoRegistradoPor(memoriaId, por, usuario);
    return json({ url: noRelato(memoriaId, agora?.id), situacao: agora?.situacao ?? situacao, editado: true }, 200);
  };
  const { mensagens: antes, audios: audiosAtuais } = await conversa.ler(existente, acrescentar);
  // Se a leitura já trouxe a mensagem que completou a conversa, o código que gravou junto com ela também existe.
  if (envio && await envioJaGravado(envio)) return repetirResposta();
  if (acrescentar) {
    mensagens = [...antes, ...paragrafos(lido.data.texto).map((t, i) => ({ tipo: 'texto' as const, texto: t, citaId: i === 0 ? (lido.data.cita ?? null) : null }))];
    if (mensagens.length > MENSAGENS_POR_RELATO) return erro(400, recadoDoTetoDoRelato('mensagens', MENSAGENS_POR_RELATO));
    if (mensagens.filter((m) => m.tipo === 'audio').length > AUDIOS_POR_RELATO) return erro(400, limiteDeAudios);
  }
  const texto = mensagens ? textoDasMensagens(mensagens) : lido.data.texto;
  // O relato precisa de texto ou de pelo menos um áudio; na conversa, de pelo menos uma mensagem
  if (mensagens) {
    if (!mensagens.some((m) => (m.tipo === 'texto' ? m.texto?.trim() : true))) return erro(400, 'Mande pelo menos uma mensagem: um texto, um áudio ou uma foto.');
  } else {
    const temAudio = (audios ?? audiosAtuais).length > 0;
    if (!texto.trim() && !temAudio) return erro(400, 'Escreva o relato ou grave um áudio antes de salvar.');
  }

  // As mensagens de antes, para o histórico: só acrescentar no fim (voltar e contar mais) não guarda versão
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
  const id = existente?.id ?? null;
  const relato: RelatoNoLote = id ?? { memoriaId, por, registradoPor: usuario.pessoa };
  const [audiosAceitos, fotosDoRelato] = await Promise.all([
    audios ? audiosQueEntram(id, memoriaId, audios, usuario) : undefined,
    fotosQueEntram(id, memoriaId, situacao, fotos, usuario),
  ]);
  const audiosDoRelato = audiosAceitos ?? audiosAtuais;
  // Cada áudio fica com a ordem da última vez em que aparece na lista.
  const audiosQueFicam = [...new Set(audiosDoRelato.map((a) => a.id).reverse())].reverse();
  const textoArrumado = arrumarTexto(texto);
  const validas = mensagens
    ? await mensagensValidas(mensagens, existente?.id, memoriaId, usuario, new Set(audiosQueFicam), new Set(fotosDoRelato.ficam))
    : mensagensDerivadas(textoArrumado, audiosQueFicam, fotosDoRelato.ficam);
  const avisos = situacao === 'publicada' && existente?.situacao !== 'publicada'
    ? await avisosDeRelatoNovo(memoria, { por, registradoPor: usuario.pessoa }, usuario)
    : [];
  const junto = [
    ...(audiosAceitos ? comandosDosAudios(relato, memoriaId, audiosAceitos) : []),
    ...(fotosDoRelato.ligar ? comandosDasFotosDoRelato(relato, memoriaId, situacao, fotosDoRelato.aceitas, usuario) : []),
    ...await comandosDasMensagens(relato, validas),
    ...comandosDosAvisos(avisos, relato),
  ];
  try {
    await salvarRelato(memoriaId, por, textoArrumado, situacao, usuario, existente, { guardar, ...(mensagens ? { mensagens: antes } : {}) }, { conferir: memoria.versao, nasce, envio, junto });
  } catch (e) {
    // O mesmo envio de novo (o toque duplo sem script): o primeiro já gravou, e este responde como ele, sem gravar
    if (!(e instanceof EnvioRepetido)) throw e;
    return repetirResposta();
  }
  const salvo = await obterRelatoRegistradoPor(memoriaId, por, usuario);
  const gravadas = salvo && mensagens
    ? ((envio ? await listarMensagensDosRelatos([salvo]) : await listarMensagensGravadas([salvo.id])).get(salvo.id) ?? [])
    : undefined;
  return json({ url: noRelato(memoriaId, salvo?.id), situacao, editado: Boolean(existente), ...(gravadas ? { mensagens: gravadas } : {}) }, existente ? 200 : 201);
}

/** A memória, no relato que acabou de ser gravado: publicar leva a ele (crítica C1, resposta do Gui de 22/11/2026) */
const noRelato = (memoriaId: string, relatoId: number | undefined) => `/memorias/${memoriaId}${relatoId ? `#relato-${relatoId}` : ''}`;

/**
 * As mensagens que ficam: só as que apontam para um áudio ou uma foto que está mesmo no relato, e a citação
 * só de uma mensagem publicada de outra pessoa, nesta memória, que quem escreve vê.
 */
async function mensagensValidas(
  mensagens: { id?: number; tipo: Mensagem['tipo']; texto?: string; audioId?: number; fotoId?: number; citaId?: number | null }[],
  relatoId: number | undefined,
  memoriaId: string,
  usuario: Usuario,
  audiosFicaram: ReadonlySet<number>,
  fotosFicaram: ReadonlySet<number>,
): Promise<Mensagem[]> {
  const naoVe = await pessoasQueONaoVe(usuario);
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
