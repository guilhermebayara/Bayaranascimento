// Escreve ou edita um relato em uma memória que a pessoa vê.
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { pessoasComAcesso } from '../../lib/servidor/acesso';
import { arrumarTexto } from '../../lib/servidor/conteudo';
import { erro, json, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { podeEscreverRelato } from '../../lib/servidor/permissoes';
import { AUDIOS_POR_RELATO } from '../../lib/audios';
import { ligarAudios, listarAudiosDosRelatos, listarIntegrantes, obterMemoria, obterRelato, obterRelatoRegistradoPor, salvarRelato } from '../../lib/servidor/repositorio';

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
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  // Sem JavaScript, o formulário chega como formulário comum, e a resposta vira página com recado
  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) {
    const dados = await request.formData();
    const texto = (nome: string) => String(dados.get(nome) ?? '');
    const resposta = await tratar({ memoria: texto('memoria'), por: texto('por'), texto: texto('texto'), situacao: texto('situacao') || 'publicada' }, locals);
    const corpo = (await resposta.json()) as { erro?: string; url?: string; situacao?: string };
    if (!resposta.ok) return voltar(request, `/memorias/${encodeURIComponent(texto('memoria'))}/relato`, { erro: corpo.erro ?? 'Não consegui salvar.' });
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
  const { memoria: memoriaId, por, texto, audios } = lido.data;

  // Quem não vê a memória recebe o mesmo que para uma memória inexistente
  const memoria = await obterMemoria(usuario, memoriaId);
  if (!memoria) return erro(404, 'Memória não encontrada.');
  if (!(await listarIntegrantes()).some((i) => i.id === por)) return erro(400, 'Pessoa não encontrada.');

  const existente = await obterRelato(memoriaId, por, usuario);
  const decisao = podeEscreverRelato(usuario, por, existente, await pessoasComAcesso());
  if (!decisao.ok) return erro(403, decisao.motivo);
  // O relato precisa de texto ou de pelo menos um áudio
  const temAudio = audios ? audios.length > 0 : Boolean(existente && (await listarAudiosDosRelatos([existente.id])).get(existente.id)?.length);
  if (!texto.trim() && !temAudio) return erro(400, 'Escreva o relato ou grave um áudio antes de salvar.');

  // Em memória ainda em rascunho, o relato também fica em rascunho. Relato publicado não volta atrás.
  let situacao = lido.data.situacao;
  if (memoria.situacao === 'rascunho') situacao = 'rascunho';
  if (existente?.situacao === 'publicada') situacao = 'publicada';

  await salvarRelato(memoriaId, por, arrumarTexto(texto), situacao, usuario, existente);
  if (audios) {
    const salvo = await obterRelatoRegistradoPor(memoriaId, por, usuario);
    if (salvo) await ligarAudios(salvo.id, memoriaId, audios, usuario);
  }
  return json({ url: `/memorias/${memoriaId}`, situacao, editado: Boolean(existente) }, existente ? 200 : 201);
}
