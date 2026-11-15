// Grava o espelho da produção no banco da homologação. Ver lib/espelho.ts.
import { comandosDoEspelho, espelhar, type CopiaDoAcervo, type Espelho } from '../espelho';
import { banco, ehHomologacao } from './ambiente';

/** O espelho só existe na homologação e no computador. Nunca na produção nem nas outras prévias. */
export function podeEspelhar(): boolean {
  return ehHomologacao() || import.meta.env.DEV;
}

export async function gravarEspelho(copia: CopiaDoAcervo): Promise<Espelho['resumo']> {
  if (!podeEspelhar()) throw new Error('O espelho só pode ser gravado na homologação.');
  const espelho = espelhar(copia);
  const db = banco();
  await db.batch(comandosDoEspelho(espelho).map((c) => db.prepare(c.sql).bind(...c.valores)));
  return espelho.resumo;
}
