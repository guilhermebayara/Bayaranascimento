// Recebe uma foto já reduzida pelo navegador e guarda no bucket.
// A foto nasce solta e só passa a pertencer a uma memória quando ela é salva.
import type { APIRoute } from 'astro';
import { bucketDeFotos } from '../../lib/servidor/ambiente';
import { erro, json, mesmaOrigem } from '../../lib/servidor/http';
import { registrarFoto } from '../../lib/servidor/repositorio';

const LIMITE = 15 * 1024 * 1024;

/** Confere os primeiros bytes do arquivo: não confiamos no tipo informado pelo navegador. */
function tipoReal(bytes: Uint8Array): { tipo: string; extensao: string } | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { tipo: 'image/jpeg', extensao: 'jpg' };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { tipo: 'image/png', extensao: 'png' };
  }
  const texto = String.fromCharCode(...bytes.slice(0, 12));
  if (texto.startsWith('RIFF') && texto.slice(8, 12) === 'WEBP') return { tipo: 'image/webp', extensao: 'webp' };
  return undefined;
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  const tamanho = Number(request.headers.get('Content-Length') ?? 0);
  if (tamanho > LIMITE + 4096) return erro(413, 'A foto é grande demais.');

  let arquivo: File | null = null;
  try {
    const valor = (await request.formData()).get('foto');
    if (valor instanceof File) arquivo = valor;
  } catch {
    return erro(400, 'Envio inválido.');
  }
  if (!arquivo) return erro(400, 'Nenhuma foto recebida.');
  if (arquivo.size > LIMITE) return erro(413, 'A foto é grande demais.');

  const dados = new Uint8Array(await arquivo.arrayBuffer());
  const formato = tipoReal(dados);
  if (!formato) return erro(415, 'Formato não aceito. Envie JPG, PNG ou WebP.');

  const chave = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${formato.extensao}`;
  await bucketDeFotos().put(chave, dados, {
    httpMetadata: { contentType: formato.tipo },
    customMetadata: { enviadaPor: locals.usuario.pessoa },
  });
  const id = await registrarFoto(chave, locals.usuario);
  return json({ id, src: `/fotos/${chave}` }, 201);
};
