// Estrutura do banco de dados (D1) e sua evolução.
//
// O próprio site aplica as migrações na primeira visita depois de publicado.
// Cada migração roda uma única vez, dentro de uma transação, e fica anotada
// na tabela _migracoes. Para mudar a estrutura, acrescente um item no fim da
// lista: nunca edite uma migração que já foi publicada.
import { env } from 'cloudflare:workers';
import { semearExemplos } from './semente';

interface Migracao {
  id: string;
  sql: string[];
}

const MIGRACOES: Migracao[] = [
  {
    id: '001-base',
    sql: [
      // Integrantes: pessoas e bichos
      `CREATE TABLE IF NOT EXISTS integrantes (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        apelido TEXT,
        tipo TEXT NOT NULL DEFAULT 'pessoa' CHECK (tipo IN ('pessoa', 'bicho')),
        especie TEXT,
        nascimento_ano INTEGER,
        falecimento_ano INTEGER,
        sobre TEXT,
        foto TEXT,
        admin INTEGER NOT NULL DEFAULT 0,
        ordem INTEGER NOT NULL DEFAULT 50,
        criado_por TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS nucleos (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        descricao TEXT,
        ordem INTEGER NOT NULL DEFAULT 50
      )`,
      // Quem é membro de um núcleo vê o que for restrito a ele
      `CREATE TABLE IF NOT EXISTS nucleo_membros (
        nucleo_id TEXT NOT NULL REFERENCES nucleos(id),
        integrante_id TEXT NOT NULL REFERENCES integrantes(id),
        PRIMARY KEY (nucleo_id, integrante_id)
      )`,
      `CREATE TABLE IF NOT EXISTS memorias (
        id TEXT PRIMARY KEY,
        titulo TEXT NOT NULL,
        ano INTEGER NOT NULL,
        mes INTEGER,
        dia INTEGER,
        aproximada INTEGER NOT NULL DEFAULT 0,
        tipo TEXT NOT NULL,
        lugar TEXT,
        visibilidade TEXT NOT NULL DEFAULT 'todos' CHECK (visibilidade IN ('todos', 'nucleos')),
        situacao TEXT NOT NULL DEFAULT 'publicada' CHECK (situacao IN ('rascunho', 'publicada')),
        exemplo INTEGER NOT NULL DEFAULT 0,
        criada_por TEXT NOT NULL REFERENCES integrantes(id),
        criada_em TEXT NOT NULL DEFAULT (datetime('now')),
        atualizada_em TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS memorias_por_data ON memorias (ano, mes, dia)`,
      // Núcleos a que a memória pertence. Com visibilidade 'nucleos', só eles veem.
      `CREATE TABLE IF NOT EXISTS memoria_nucleos (
        memoria_id TEXT NOT NULL REFERENCES memorias(id) ON DELETE CASCADE,
        nucleo_id TEXT NOT NULL REFERENCES nucleos(id),
        PRIMARY KEY (memoria_id, nucleo_id)
      )`,
      `CREATE TABLE IF NOT EXISTS memoria_integrantes (
        memoria_id TEXT NOT NULL REFERENCES memorias(id) ON DELETE CASCADE,
        integrante_id TEXT NOT NULL REFERENCES integrantes(id),
        PRIMARY KEY (memoria_id, integrante_id)
      )`,
      `CREATE INDEX IF NOT EXISTS memorias_do_integrante ON memoria_integrantes (integrante_id)`,
      // A foto nasce solta (memoria_id vazio) no envio e é ligada ao salvar a memória
      `CREATE TABLE IF NOT EXISTS fotos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memoria_id TEXT REFERENCES memorias(id) ON DELETE SET NULL,
        chave TEXT NOT NULL,
        legenda TEXT,
        principal INTEGER NOT NULL DEFAULT 0,
        ordem INTEGER NOT NULL DEFAULT 0,
        enviada_por TEXT NOT NULL REFERENCES integrantes(id),
        enviada_em TEXT NOT NULL DEFAULT (datetime('now')),
        removida_em TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS fotos_da_memoria ON fotos (memoria_id)`,
      `CREATE INDEX IF NOT EXISTS fotos_por_chave ON fotos (chave)`,
      // Um relato por pessoa em cada memória
      `CREATE TABLE IF NOT EXISTS relatos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memoria_id TEXT NOT NULL REFERENCES memorias(id) ON DELETE CASCADE,
        por TEXT NOT NULL REFERENCES integrantes(id),
        registrado_por TEXT NOT NULL REFERENCES integrantes(id),
        texto TEXT NOT NULL,
        situacao TEXT NOT NULL DEFAULT 'publicada' CHECK (situacao IN ('rascunho', 'publicada')),
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (memoria_id, por)
      )`,
      // Histórico: a versão anterior de tudo o que é alterado
      `CREATE TABLE IF NOT EXISTS versoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        item_id TEXT NOT NULL,
        dados TEXT NOT NULL,
        autor TEXT NOT NULL,
        criada_em TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS versoes_do_item ON versoes (tipo, item_id)`,
    ],
  },
  {
    id: '002-familia-inicial',
    sql: [
      `INSERT OR IGNORE INTO nucleos (id, nome, ordem) VALUES
        ('bayara-nascimento', 'Bayara Nascimento', 1),
        ('bayara-bracarense', 'Bayara Bracarense', 2),
        ('bracarense', 'Bracarense', 3)`,
      `INSERT OR IGNORE INTO integrantes (id, nome, tipo, especie, admin, ordem) VALUES
        ('gui', 'Gui', 'pessoa', NULL, 1, 1),
        ('giovanna', 'Giovanna', 'pessoa', NULL, 1, 2),
        ('elizete', 'Elizete', 'pessoa', NULL, 0, 3),
        ('lucas-magno', 'Lucas Magno', 'pessoa', NULL, 0, 4),
        ('aguilar', 'Aguilar', 'pessoa', NULL, 0, 10),
        ('vo-bela', 'Vó Bela', 'pessoa', NULL, 0, 11),
        ('vo-vivica', 'Vó Vivica', 'pessoa', NULL, 0, 12),
        ('lucio', 'Lúcio', 'pessoa', NULL, 0, 20),
        ('ana-candida', 'Ana Candida', 'pessoa', NULL, 0, 21),
        ('regina', 'Regina', 'pessoa', NULL, 0, 22),
        ('chico', 'Chico', 'bicho', 'cachorro', 0, 30)`,
      `INSERT OR IGNORE INTO nucleo_membros (nucleo_id, integrante_id) VALUES
        ('bayara-nascimento', 'gui'), ('bayara-nascimento', 'giovanna'), ('bayara-nascimento', 'elizete'),
        ('bayara-nascimento', 'aguilar'), ('bayara-nascimento', 'vo-bela'), ('bayara-nascimento', 'vo-vivica'),
        ('bayara-bracarense', 'giovanna'), ('bayara-bracarense', 'lucas-magno'), ('bayara-bracarense', 'chico'),
        ('bracarense', 'lucas-magno'), ('bracarense', 'lucio'), ('bracarense', 'ana-candida'), ('bracarense', 'regina')`,
    ],
  },
];

let pronto: Promise<void> | undefined;

/** Garante que o banco está na estrutura atual. Barato depois da primeira vez. */
export function prepararBanco(): Promise<void> {
  pronto ??= migrar().catch((erro) => {
    pronto = undefined;
    throw erro;
  });
  return pronto;
}

async function migrar(): Promise<void> {
  const db = env.DB;
  await db
    .prepare(`CREATE TABLE IF NOT EXISTS _migracoes (id TEXT PRIMARY KEY, aplicada_em TEXT NOT NULL DEFAULT (datetime('now')))`)
    .run();
  const { results } = await db.prepare('SELECT id FROM _migracoes').all<{ id: string }>();
  const aplicadas = new Set(results.map((r) => r.id));

  for (const migracao of MIGRACOES) {
    if (aplicadas.has(migracao.id)) continue;
    // batch = uma transação: ou a migração entra inteira, ou não entra
    await db.batch([
      ...migracao.sql.map((sql) => db.prepare(sql)),
      db.prepare('INSERT OR IGNORE INTO _migracoes (id) VALUES (?)').bind(migracao.id),
    ]);
  }

  // Memórias de exemplo só existem fora da produção
  if (env.AMBIENTE !== 'producao') await semearExemplos(db);
}
