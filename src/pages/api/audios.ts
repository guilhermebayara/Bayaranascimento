// Recebe um áudio gravado no site ou enviado como arquivo, para um relato de uma memória que a pessoa vê.
// O áudio nasce solto e só passa a pertencer ao relato quando ele é salvo (ver api/relatos.ts).
import type { APIRoute } from 'astro';
import { cabeNoLimite, formatoDoAudio, limiteTotal, LIMITE_POR_ARQUIVO, MINUTOS_POR_GRAVACAO } from '../../lib/audios';
import { ambiente, bucketDeFotos } from '../../lib/servidor/ambiente';
import { erro, json, mesmaOrigem } from '../../lib/servidor/http';
import { espacoDosAudios, obterMemoria, registrarAudio } from '../../lib/servidor/repositorio';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  const tamanhoInformado = Number(request.headers.get('Content-Length') ?? 0);
  if (tamanhoInformado > LIMITE_POR_ARQUIVO + 8192) return erro(413, 'O áudio é grande demais. O limite é de 25 MB por arquivo.');

  let arquivo: File | null = null;
  let memoriaId = '';
  let duracao: number | null = null;
  try {
    const dados = await request.formData();
    const valor = dados.get('audio');
    if (valor instanceof File) arquivo = valor;
    memoriaId = String(dados.get('memoria') ?? '');
    const segundos = Number(dados.get('duracao'));
    duracao = Number.isFinite(segundos) && segundos > 0 ? Math.min(segundos, 24 * 3600) : null;
  } catch {
    return erro(400, 'Envio inválido.');
  }
  if (!arquivo) return erro(400, 'Nenhum áudio recebido.');
  if (arquivo.size > LIMITE_POR_ARQUIVO) return erro(413, `O áudio é grande demais. O limite é de 25 MB por arquivo (cerca de ${MINUTOS_POR_GRAVACAO} minutos gravados no site).`);

  // Numa memória nova, o áudio chega antes de a memória existir: fica solto, só quem enviou ouve,
  // e entra no relato quando a memória é salva. Numa memória que existe, quem não a vê recebe o
  // mesmo que para uma memória que não existe.
  const memoria = memoriaId ? await obterMemoria(locals.usuario, memoriaId) : undefined;
  if (memoriaId && !memoria) return erro(404, 'Memória não encontrada.');

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const formato = formatoDoAudio(bytes);
  if (!formato) return erro(415, 'Formato não aceito. Envie áudio em M4A, MP3, OGG, OPUS, WEBM ou WAV.');

  // Teto do espaço dos áudios: o acervo fica dentro do plano gratuito, com folga para as fotos
  if (!cabeNoLimite(await espacoDosAudios(), bytes.byteLength, limiteTotal(ambiente()))) {
    return erro(507, 'O espaço reservado para os áudios do acervo acabou. Avise o Gui ou a Giovanna.');
  }

  const chave = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${formato.extensao}`;
  await bucketDeFotos().put(`audios/${chave}`, bytes, {
    httpMetadata: { contentType: formato.tipo },
    customMetadata: { enviadoPor: locals.usuario.pessoa },
  });
  const id = await registrarAudio({ chave, tipo: formato.tipo, tamanho: bytes.byteLength, duracao, memoriaId: memoria?.id ?? null }, locals.usuario);
  return json({ id, src: `/audios/${chave}`, duracao }, 201);
};
