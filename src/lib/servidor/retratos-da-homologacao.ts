// Conserto da homologação, uma vez só (defeito visto pelo Gui depois da sessão H, 18/11/2026): as
// pessoas apareciam sem retrato. O espelho da sessão G levou os retratos reais para o bucket da
// homologação e, sem eles na cópia, deixou as pessoas com as iniciais; o #97 voltou o espelho às fotos
// de exemplo, mas o banco da homologação continuava com o espelho antigo.
//
// Aqui, só na homologação: todo retrato que não é de exemplo volta a ser uma das fotos do Chico e da
// Karol (o mesmo sorteio do espelho). Só o banco muda: os arquivos de retrato que a sessão G gravou no
// bucket da homologação deixam de ser usados, e quem apaga é o Gui, pelo painel do Cloudflare (o site só
// apaga arquivo na limpeza do bucket de teste e nas fotos sem memória; ver a guarda da produção). Um erro
// aqui nunca derruba o site: tenta de novo no próximo começo.
import { retratosDeExemploParaHomologacao } from '../fotos-de-exemplo';
import { ehHomologacao } from './ambiente';

export const AJUSTE_DOS_RETRATOS_DA_HOMOLOGACAO = 'retratos-da-homologacao-de-exemplo';

export async function consertarRetratosDaHomologacao(db: D1Database): Promise<void> {
  if (!ehHomologacao()) return;
  try {
    const feito = await db.prepare('SELECT 1 FROM ajustes WHERE chave = ?').bind(AJUSTE_DOS_RETRATOS_DA_HOMOLOGACAO).first();
    if (feito) return;

    const { results } = await db.prepare('SELECT id, retrato, tratamento, tipo FROM integrantes').all<{ id: string; retrato: string | null; tratamento: string | null; tipo: string }>();
    const mudancas = retratosDeExemploParaHomologacao(results);
    if (mudancas.length) await db.batch(mudancas.map((m) => db.prepare('UPDATE integrantes SET retrato = ? WHERE id = ?').bind(m.retrato, m.id)));

    await db
      .prepare(`INSERT INTO ajustes (chave, valor) VALUES (?, ?) ON CONFLICT (chave) DO NOTHING`)
      .bind(AJUSTE_DOS_RETRATOS_DA_HOMOLOGACAO, JSON.stringify({ retratos: mudancas.length }))
      .run();
  } catch (erro) {
    console.error('Não consegui consertar os retratos da homologação:', erro);
  }
}
