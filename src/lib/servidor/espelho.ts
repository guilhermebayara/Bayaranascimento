// Grava o espelho da produção no banco da homologação. Ver lib/espelho.ts.
//
// Só o banco: nenhum arquivo da produção chega à homologação (observação do Gui, 18/11/2026). Os
// retratos e as fotos das memórias do espelho apontam para as 11 fotos de exemplo, lidas do bucket de
// teste. A produção nunca grava na homologação: quem grava é a própria homologação, ao receber a cópia
// enviada por um administrador.
//
// Desde a sessão D1e, só a cópia para o espelho (src/lib/copia-para-o-espelho.ts) é aceita: a cópia inteira do
// acervo é recusada com recado, para nada além das tabelas da família chegar à homologação.
import { comandosDoEspelho, espelhar, type CopiaDoAcervo, type Espelho } from '../espelho';
import { recusaDaCopiaParaOEspelho } from '../copia-para-o-espelho';
import { darMensagensAosRelatosDeAntes } from './mensagens-de-antes';
import { banco, ehHomologacao } from './ambiente';

/** O espelho só existe na homologação e no computador. Nunca na produção nem nas outras prévias. */
export function podeEspelhar(): boolean {
  return ehHomologacao() || import.meta.env.DEV;
}

export async function gravarEspelho(copia: CopiaDoAcervo): Promise<Espelho['resumo']> {
  if (!podeEspelhar()) throw new Error('O espelho só pode ser gravado na homologação.');
  const recusa = recusaDaCopiaParaOEspelho(copia);
  if (recusa) throw new Error(recusa);
  const espelho = espelhar(copia);
  const db = banco();
  await db.batch(comandosDoEspelho(espelho).map((c) => db.prepare(c.sql).bind(...c.valores)));
  await darMensagensAosRelatosDeAntes(db, { refazer: true });
  return espelho.resumo;
}
