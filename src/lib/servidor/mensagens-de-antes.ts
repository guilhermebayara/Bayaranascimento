// O relato como conversa (migração 103-mensagens-do-relato): os relatos gravados antes da conversa, ou que
// chegam sem mensagens (o espelho da produção, os exemplos semeados depois das migrações), ganham as
// mensagens derivadas deles, sem perda: os áudios, cada parágrafo e as fotos (mensagensDerivadas, em
// src/lib/conversa.ts). Assim toda mensagem tem id, e qualquer uma pode ser citada. Só acrescenta linhas
// na tabela das mensagens: o relato, o texto, os áudios e as fotos não mudam. Roda no começo do servidor,
// depois das migrações e dos exemplos, e depois disso uma marca em ajustes dispensa a varredura. O espelho refaz a marca depois de trocar os relatos. Um erro aqui nunca
// derruba o site: tenta de novo no próximo começo.
import { mensagensDerivadas } from '../conversa';
import type { consertarRetratosDaHomologacao } from './retratos-da-homologacao';

// O tipo do banco vem do conserto vizinho: os tipos do D1 não estão no tsc das sessões (erros antigos)
type Banco = Parameters<typeof consertarRetratosDaHomologacao>[0];

export const MARCA_DAS_MENSAGENS_DE_ANTES = 'mensagens-dos-relatos-de-antes';

export async function darMensagensAosRelatosDeAntes(db: Banco, { refazer = false } = {}): Promise<number> {
  try {
    if (refazer) await db.prepare('DELETE FROM ajustes WHERE chave = ?').bind(MARCA_DAS_MENSAGENS_DE_ANTES).run();
    const feita = await db.prepare('SELECT 1 FROM ajustes WHERE chave = ?').bind(MARCA_DAS_MENSAGENS_DE_ANTES).first();
    if (feita) return 0;
    let total = 0;
    let depois = 0;
    while (true) {
      const { results: relatos } = await db
        .prepare(`SELECT id, texto, atualizado_em, criado_em FROM relatos r WHERE r.id > ? AND NOT EXISTS (SELECT 1 FROM relato_mensagens m WHERE m.relato_id = r.id) ORDER BY r.id LIMIT 500`).bind(depois)
        .all<{ id: number; texto: string; atualizado_em: string | null; criado_em: string }>();
      if (!relatos.length) break;
      depois = relatos.at(-1)!.id;
      const ids = relatos.map((r: { id: number }) => r.id);
      const lista = ids.map(() => '?').join(', ');
      const [audios, fotos] = await db.batch<{ id: number; relato_id: number }>([
        db.prepare(`SELECT id, relato_id FROM audios WHERE removido_em IS NULL AND relato_id IN (${lista}) ORDER BY ordem, id`).bind(...ids),
        db.prepare(`SELECT id, relato_id FROM fotos WHERE removida_em IS NULL AND relato_id IN (${lista}) ORDER BY memoria_id IS NULL, ordem, id`).bind(...ids),
      ]);
      const de = (linhas: { id: number; relato_id: number }[], relato: number) => linhas.filter((l) => l.relato_id === relato).map((l) => l.id);
      const comandos = relatos.flatMap((r: { id: number; texto: string; criado_em: string }) =>
        mensagensDerivadas(r.texto ?? '', de(audios.results, r.id), de(fotos.results, r.id)).map((m, ordem) =>
          db
            .prepare('INSERT INTO relato_mensagens (relato_id, ordem, tipo, texto, audio_id, foto_id, enviada_em) VALUES (?, ?, ?, ?, ?, ?, ?)')
            // A hora de cada mensagem de antes é a do relato: tudo contado de uma vez, sem "Contou mais em"
            .bind(r.id, ordem, m.tipo, m.texto ?? null, m.audioId ?? null, m.fotoId ?? null, r.criado_em),
        ),
      );
      for (let i = 0; i < comandos.length; i += 80) await db.batch(comandos.slice(i, i + 80));
      total += relatos.length;
    }
    // Só marca depois de percorrer todos os lotes sem erro, inclusive os relatos vazios sem mensagem derivável.
    await db.prepare('INSERT OR REPLACE INTO ajustes (chave, valor) VALUES (?, ?)').bind(MARCA_DAS_MENSAGENS_DE_ANTES, JSON.stringify({ relatos: total })).run();
    return total;
  } catch (erro) {
    console.error('Não consegui dar mensagens aos relatos de antes:', erro);
    return 0;
  }
}
