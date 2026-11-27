// O relato como conversa (migração 103-mensagens-do-relato): os relatos gravados antes da conversa, ou que
// chegam sem mensagens (o espelho da produção, os exemplos semeados depois das migrações), ganham as
// mensagens derivadas deles, sem perda: os áudios, cada parágrafo e as fotos (mensagensDerivadas, em
// src/lib/conversa.ts). Assim toda mensagem tem id, e qualquer uma pode ser citada. Só acrescenta linhas
// na tabela das mensagens: o relato, o texto, os áudios e as fotos não mudam. Roda no começo do servidor,
// depois das migrações e dos exemplos, e depois disso a consulta não acha mais nada. Um erro aqui nunca
// derruba o site: tenta de novo no próximo começo.
import { mensagensDerivadas } from '../conversa';
import type { consertarRetratosDaHomologacao } from './retratos-da-homologacao';

// O tipo do banco vem do conserto vizinho: os tipos do D1 não estão no tsc das sessões (erros antigos)
type Banco = Parameters<typeof consertarRetratosDaHomologacao>[0];

export async function darMensagensAosRelatosDeAntes(db: Banco): Promise<number> {
  try {
    const { results: relatos } = await db
      .prepare(`SELECT id, texto, atualizado_em, criado_em FROM relatos r WHERE NOT EXISTS (SELECT 1 FROM relato_mensagens m WHERE m.relato_id = r.id) LIMIT 500`)
      .all<{ id: number; texto: string; atualizado_em: string | null; criado_em: string }>();
    if (!relatos.length) return 0;
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
    return relatos.length;
  } catch (erro) {
    console.error('Não consegui dar mensagens aos relatos de antes:', erro);
    return 0;
  }
}
