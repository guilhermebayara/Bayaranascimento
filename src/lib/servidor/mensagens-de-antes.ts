// O relato como conversa: conserto dos relatos antigos e das cópias anteriores à conversa.
// A versão da marca distingue as cópias que podiam levar um relato sem as mensagens. Relatos novos
// invalidam a marca no próprio lote de gravação. Não altera os gatilhos nem o formato da cópia.
import { mensagensDerivadas } from '../conversa';
import type { consertarRetratosDaHomologacao } from './retratos-da-homologacao';
type Banco = Parameters<typeof consertarRetratosDaHomologacao>[0];
export const MARCA_DAS_MENSAGENS_DE_ANTES = 'mensagens-dos-relatos-de-antes';

export async function darMensagensAosRelatosDeAntes(db: Banco, { refazer = false, estrito = false } = {}): Promise<number> {
  try {
    if (refazer) await db.prepare('DELETE FROM ajustes WHERE chave = ?').bind(MARCA_DAS_MENSAGENS_DE_ANTES).run();
    const feita = await db.prepare("SELECT 1 FROM ajustes WHERE chave = ? AND json_extract(valor, '$.versao') = 2").bind(MARCA_DAS_MENSAGENS_DE_ANTES).first();
    if (feita) return 0;
    // A marca antiga não atesta a conclusão, inclusive quando veio numa restauração.
    await db.prepare('DELETE FROM ajustes WHERE chave = ?').bind(MARCA_DAS_MENSAGENS_DE_ANTES).run();
    let total = 0, depois = 0;
    while (true) {
      const { results: relatos } = await db.prepare('SELECT id, texto, criado_em FROM relatos WHERE id > ? ORDER BY id LIMIT 500').bind(depois)
        .all<{ id: number; texto: string; criado_em: string }>();
      if (!relatos.length) break;
      depois = relatos.at(-1)!.id;
      const ids = JSON.stringify(relatos.map((r) => r.id));
      const [audios, fotos, mensagens] = await db.batch<Record<string, unknown>>([
        db.prepare('SELECT id, relato_id FROM audios WHERE removido_em IS NULL AND relato_id IN (SELECT value FROM json_each(?)) ORDER BY ordem, id').bind(ids),
        db.prepare('SELECT id, relato_id FROM fotos WHERE removida_em IS NULL AND relato_id IN (SELECT value FROM json_each(?)) ORDER BY memoria_id IS NULL, ordem, id').bind(ids),
        db.prepare('SELECT relato_id, ordem, tipo, texto, audio_id, foto_id FROM relato_mensagens WHERE relato_id IN (SELECT value FROM json_each(?)) ORDER BY ordem, id').bind(ids),
      ]);
      const de = (linhas: Record<string, unknown>[], id: number) => linhas.filter((l) => l.relato_id === id).map((l) => Number(l.id));
      for (const r of relatos) {
        const derivadas = mensagensDerivadas(r.texto ?? '', de(audios.results, r.id), de(fotos.results, r.id));
        const existentes = mensagens.results.filter((m) => m.relato_id === r.id);
        // Uma conversa já editada pertence à pessoa. Só retoma o prefixo exato que o conserto antigo
        // deixou ao falhar entre lotes; mantém os ids existentes e as citações deles.
        const prefixo = existentes.every((m, i) => {
          const d = derivadas[i];
          return d && m.ordem === i && m.tipo === d.tipo && m.texto === (d.texto ?? null) && m.audio_id === (d.audioId ?? null) && m.foto_id === (d.fotoId ?? null);
        });
        if (!prefixo || existentes.length >= derivadas.length) continue;
        // Um comando é atômico também para relatos com mais de 80 parágrafos. A guarda evita duplicar
        // mensagens se outra gravação alterou o relato depois da leitura.
        await db.prepare(`INSERT INTO relato_mensagens (relato_id, ordem, tipo, texto, audio_id, foto_id, enviada_em)
          SELECT ?1, CAST(j.key AS INTEGER), json_extract(j.value, '$.tipo'), json_extract(j.value, '$.texto'),
            json_extract(j.value, '$.audioId'), json_extract(j.value, '$.fotoId'), ?2 FROM json_each(?3) j
          WHERE CAST(j.key AS INTEGER) >= ?4 AND (SELECT COUNT(*) FROM relato_mensagens WHERE relato_id = ?1) = ?4
          AND EXISTS (SELECT 1 FROM relatos WHERE id = ?1 AND COALESCE(texto, '') = ?5)`)
          .bind(r.id, r.criado_em, JSON.stringify(derivadas), existentes.length, r.texto ?? '').run();
        total++;
      }
    }
    // Se nasceu outro relato durante a passada, a próxima abertura ainda precisa conferir.
    await db.prepare(`INSERT OR REPLACE INTO ajustes (chave, valor) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM relatos WHERE id > ?)`)
      .bind(MARCA_DAS_MENSAGENS_DE_ANTES, JSON.stringify({ versao: 2, relatos: total }), depois).run();
    return total;
  } catch (erro) {
    if (estrito) throw erro;
    console.error('Não consegui dar mensagens aos relatos de antes:', erro);
    return 0;
  }
}
