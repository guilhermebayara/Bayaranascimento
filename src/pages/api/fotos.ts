// Recebe uma foto já reduzida pelo navegador e guarda no bucket.
// A foto nasce solta e só passa a pertencer a uma memória quando ela é salva.
//
// Com ela vêm as duas cópias menores que o navegador fez (sessão D1b, src/lib/copias-das-fotos.ts), nos
// campos "pequena" e "media". Elas são conferidas (formato, medida e proporção da original) e guardadas
// ao lado da original, com nome próprio. Cópia que não passa fica de fora, e a foto entra assim mesmo: a
// tela usa a original.
import type { APIRoute } from 'astro';
import { bucketDeFotos } from '../../lib/servidor/ambiente';
import { erro, json, mesmaOrigem } from '../../lib/servidor/http';
import { registrarFoto } from '../../lib/servidor/repositorio';
import { LIMITE_DA_COPIA, chaveDaCopia, conferirCopias, enderecoDaFoto, type Copias } from '../../lib/copias-das-fotos';

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
  if (tamanho > LIMITE + LIMITE_DA_COPIA.pequena + LIMITE_DA_COPIA.media + 4096) return erro(413, 'A foto é grande demais.');

  let arquivo: File | null = null;
  let pequena: File | null = null;
  let media: File | null = null;
  try {
    const dados = await request.formData();
    const valor = dados.get('foto');
    if (valor instanceof File) arquivo = valor;
    const p = dados.get('pequena');
    const m = dados.get('media');
    if (p instanceof File && m instanceof File) [pequena, media] = [p, m];
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

  // As cópias, quando vieram e passaram na conferência. Um erro aqui não perde a foto.
  let copias: Copias | null = null;
  if (pequena && media) {
    try {
      const bytes = { pequena: new Uint8Array(await pequena.arrayBuffer()), media: new Uint8Array(await media.arrayBuffer()) };
      const conferidas = conferirCopias(dados, bytes.pequena, bytes.media);
      if ('copias' in conferidas) {
        const tipo = conferidas.copias.formato === 'webp' ? 'image/webp' : 'image/jpeg';
        for (const t of ['pequena', 'media'] as const) {
          await bucketDeFotos().put(chaveDaCopia(chave, t, conferidas.copias.formato), bytes[t], { httpMetadata: { contentType: tipo }, customMetadata: { copiaDe: chave } });
        }
        copias = conferidas.copias;
      }
    } catch (e) {
      console.error('Não consegui guardar as cópias da foto:', e);
    }
  }
  const id = await registrarFoto(chave, locals.usuario, dados.byteLength, copias);
  return json({ id, src: enderecoDaFoto(chave), copias: Boolean(copias) }, 201);
};
