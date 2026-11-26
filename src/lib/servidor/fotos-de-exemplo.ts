// As fotos de exemplo no banco e no bucket de teste (decisão do Gui, 16/11/2026). Só rodam nas prévias
// e no computador: são chamadas dentro da proteção das memórias de exemplo, em banco.ts, e conferem o
// ambiente de novo aqui. A guarda da produção (scripts/confere-producao.mjs) falha se isso mudar.
import { AMBIENTES_COM_EXEMPLOS, ambiente, bucketDeTesteParaGravar, ehHomologacao } from './ambiente';
import { fotoDeMemoriaDeExemplo, paraLimpar, retratoDeExemplo } from '../fotos-de-exemplo';

const soNoTeste = () => AMBIENTES_COM_EXEMPLOS.includes(ambiente()) && !ehHomologacao();

/**
 * Nenhuma foto de exemplo fica vazia: as que nasceram com a chave vazia (o espaço reservado de antes)
 * passam a apontar para uma das 11 fotos. Os retratos de exemplo entram uma vez só, protegidos pela
 * existência de um deles: quem tirar ou trocar um retrato ao testar não o vê voltar.
 */
export async function semearFotosDeExemplo(db: D1Database): Promise<void> {
  if (!soNoTeste()) return;
  const comandos: D1PreparedStatement[] = [];
  const { results: vazias } = await db.prepare(`SELECT id, memoria_id, ordem FROM fotos WHERE chave = ''`).all<{ id: number; memoria_id: string | null; ordem: number }>();
  for (const f of vazias) {
    comandos.push(db.prepare('UPDATE fotos SET chave = ? WHERE id = ?').bind(fotoDeMemoriaDeExemplo(f.memoria_id ?? String(f.id), f.ordem), f.id));
  }
  const ja = await db.prepare(`SELECT 1 AS ok FROM integrantes WHERE retrato LIKE 'exemplos/%' LIMIT 1`).first();
  if (!ja) {
    const { results: pessoas } = await db
      .prepare('SELECT id, tratamento, tipo FROM integrantes WHERE retrato IS NULL')
      .all<{ id: string; tratamento: 'ela' | 'ele' | null; tipo: string }>();
    for (const p of pessoas) {
      comandos.push(db.prepare('UPDATE integrantes SET retrato = ? WHERE id = ?').bind(retratoDeExemplo(p.id, p.tratamento, p.tipo === 'bicho'), p.id));
    }
  }
  if (comandos.length) await db.batch(comandos);
}

/**
 * Limpeza do bucket de teste: as fotos e os retratos que as prévias enviaram ao testar são apagados
 * depois de 7 dias, e o registro passa a apontar para uma foto de exemplo, pelo mesmo sorteio. Nunca
 * apaga nada de exemplos/, nem os áudios (que têm o teto deles). Roda no máximo uma vez por dia, no
 * primeiro acesso a uma prévia, e um erro aqui nunca derruba o site.
 *
 * Por que 7 dias: o plano gratuito do R2 vai até 10 GB, somando a produção, a homologação e todas as
 * prévias, e cada prévia de teste é descartável. Sem a faxina, as fotos enviadas ao testar ocupariam a cota
 * que é da família.
 */
export async function limparBucketDeTeste(db: D1Database, agora = new Date()): Promise<void> {
  if (!soNoTeste()) return;
  try {
    // A marca do dia só existe no banco de teste: a tabela nasce aqui, e não numa migração
    await db.prepare(`CREATE TABLE IF NOT EXISTS limpezas_do_teste (dia TEXT PRIMARY KEY, feita_em TEXT NOT NULL DEFAULT (datetime('now')))`).run();
    const marca = await db.prepare('INSERT OR IGNORE INTO limpezas_do_teste (dia) VALUES (?)').bind(agora.toISOString().slice(0, 10)).run();
    if (!marca.meta.changes) return;

    const bucket = bucketDeTesteParaGravar();
    const objetos: { key: string; uploaded: Date }[] = [];
    let cursor: string | undefined;
    do {
      const pagina = await bucket.list({ cursor, limit: 1000 });
      objetos.push(...pagina.objects.map((o) => ({ key: o.key, uploaded: o.uploaded })));
      cursor = pagina.truncated ? pagina.cursor : undefined;
    } while (cursor);

    const apagar = paraLimpar(objetos, agora);
    if (apagar.length === 0) return;
    for (let i = 0; i < apagar.length; i += 1000) await bucket.delete(apagar.slice(i, i + 1000));

    const lista = JSON.stringify(apagar);
    const { results: fotos } = await db
      .prepare('SELECT id, memoria_id, ordem FROM fotos WHERE chave IN (SELECT value FROM json_each(?))')
      .bind(lista)
      .all<{ id: number; memoria_id: string | null; ordem: number }>();
    const { results: pessoas } = await db
      .prepare(`SELECT id, tratamento, tipo FROM integrantes WHERE 'retratos/' || retrato IN (SELECT value FROM json_each(?))`)
      .bind(lista)
      .all<{ id: string; tratamento: 'ela' | 'ele' | null; tipo: string }>();
    const comandos = [
      ...fotos.map((f) => db.prepare('UPDATE fotos SET chave = ? WHERE id = ?').bind(fotoDeMemoriaDeExemplo(f.memoria_id ?? String(f.id), f.ordem), f.id)),
      ...pessoas.map((p) => db.prepare('UPDATE integrantes SET retrato = ? WHERE id = ?').bind(retratoDeExemplo(p.id, p.tratamento, p.tipo === 'bicho'), p.id)),
    ];
    if (comandos.length) await db.batch(comandos);
  } catch (erro) {
    console.error('Limpeza do bucket de teste falhou', erro);
  }
}
