// Grava o espelho da produção no banco e no bucket da homologação. Ver lib/espelho.ts.
//
// A produção nunca grava na homologação: ela não enxerga o banco nem o bucket de lá (a guarda confere o
// wrangler.jsonc). Quem grava é a própria homologação, ao receber a cópia enviada por um administrador.
import { comandosDoEspelho, espelhar, type CopiaDoAcervo, type Espelho } from '../espelho';
import { PASTA_DOS_RETRATOS } from '../retratos';
import { banco, bucketDeFotos, ehHomologacao } from './ambiente';

/** O espelho só existe na homologação e no computador. Nunca na produção nem nas outras prévias. */
export function podeEspelhar(): boolean {
  return ehHomologacao() || import.meta.env.DEV;
}

const TIPOS = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const;

export async function gravarEspelho(copia: CopiaDoAcervo): Promise<Espelho['resumo']> {
  if (!podeEspelhar()) throw new Error('O espelho só pode ser gravado na homologação.');
  const espelho = espelhar(copia);
  // Os retratos primeiro: se um falhar, o banco fica como estava, e nenhum cadastro aponta para um arquivo que não existe
  for (const { chave, base64 } of espelho.retratos) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const tipo = TIPOS[chave.split('.').pop() as keyof typeof TIPOS] ?? 'image/jpeg';
    await bucketDeFotos().put(`${PASTA_DOS_RETRATOS}${chave}`, bytes, { httpMetadata: { contentType: tipo } });
  }
  const db = banco();
  await db.batch(comandosDoEspelho(espelho).map((c) => db.prepare(c.sql).bind(...c.valores)));
  return espelho.resumo;
}
