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
import { banco, ehHomologacao } from './ambiente';

const ULTIMA_IMPORTACAO = 'ultima_importacao_do_espelho';

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
  const bytes = new TextEncoder().encode(JSON.stringify(copia));
  const arquivo = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const repetido = `FROM ajustes WHERE chave = ? AND json_extract(valor, '$.arquivo') = ?
    AND json_extract(valor, '$.marca') = (SELECT valor FROM marca_da_copia WHERE id = 1)`;
  const ultima = () => db.prepare(`SELECT json_extract(valor, '$.resumo') AS resumo ${repetido}`).bind(ULTIMA_IMPORTACAO, arquivo).first<{ resumo: string }>();
  const ja = await ultima();
  if (ja) return JSON.parse(ja.resumo) as Espelho['resumo'];

  try {
    await db.batch([
      // Se o mesmo arquivo entrou enquanto este pedido esperava o lote, a chave duplicada devolve o lote.
      db.prepare(`INSERT INTO ajustes (chave, valor) SELECT chave, valor ${repetido}`).bind(ULTIMA_IMPORTACAO, arquivo),
      ...comandosDoEspelho(espelho).map((c) => db.prepare(c.sql).bind(...c.valores)),
      // A gravação do ajuste sobe a marca uma vez, pelo gatilho que já cobre a tabela.
      db.prepare(`INSERT INTO ajustes (chave, valor)
        SELECT ?, json_object('arquivo', ?, 'marca', valor + 1, 'resumo', json(?)) FROM marca_da_copia WHERE id = 1
        ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, mudado_em = datetime('now')`)
        .bind(ULTIMA_IMPORTACAO, arquivo, JSON.stringify(espelho.resumo)),
    ]);
  } catch (erro) {
    if (String(erro).includes('UNIQUE constraint failed: ajustes.chave')) {
      const concorrente = await ultima();
      if (concorrente) return JSON.parse(concorrente.resumo) as Espelho['resumo'];
    }
    throw erro;
  }
  return espelho.resumo;
}
