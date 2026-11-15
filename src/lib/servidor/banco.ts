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
  {
    // Os tipos de momento saem do código e passam a ser uma lista que os admins cuidam.
    // "Outro" recebe um texto livre; quando um texto se repete, vira tipo oficial.
    id: '003-tipos',
    sql: [
      `CREATE TABLE IF NOT EXISTS tipos (
        id TEXT PRIMARY KEY,
        rotulo TEXT NOT NULL,
        cor TEXT NOT NULL,
        ordem INTEGER NOT NULL DEFAULT 50,
        criado_por TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `INSERT OR IGNORE INTO tipos (id, rotulo, cor, ordem) VALUES
        ('nascimento', 'Nascimento', '#2F7D6B', 1),
        ('aniversario', 'Aniversário', '#D6455B', 2),
        ('casamento', 'Casamento', '#8A5BB5', 3),
        ('conquista', 'Conquista', '#C98A00', 4),
        ('viagem', 'Viagem', '#2B74B8', 5),
        ('casa', 'Casa', '#A8572E', 6),
        ('festa', 'Festa', '#D2478F', 7),
        ('causo', 'Causo', '#4E7F1E', 8),
        ('cotidiano', 'Dia a dia', '#5B6B7A', 9),
        ('despedida', 'Despedida', '#3D4A66', 10),
        ('outro', 'Outro', '#7A6F66', 999)`,
      `ALTER TABLE memorias ADD COLUMN tipo_outro TEXT`,
    ],
  },
  {
    // Árvore: o banco guarda só filiação e casal (com fases). Avós, tios, primos
    // e cunhados são calculados em lib/parentesco.ts.
    id: '004-arvore',
    sql: [
      // Como se referir à pessoa nos nomes de parentesco ("sua mãe", "seu tio")
      `ALTER TABLE integrantes ADD COLUMN tratamento TEXT CHECK (tratamento IN ('ela', 'ele'))`,
      `ALTER TABLE integrantes ADD COLUMN nascimento_mes INTEGER`,
      `ALTER TABLE integrantes ADD COLUMN nascimento_dia INTEGER`,
      `ALTER TABLE integrantes ADD COLUMN falecimento_mes INTEGER`,
      `ALTER TABLE integrantes ADD COLUMN falecimento_dia INTEGER`,
      `CREATE TABLE IF NOT EXISTS filiacoes (
        filho_id TEXT NOT NULL REFERENCES integrantes(id),
        responsavel_id TEXT NOT NULL REFERENCES integrantes(id),
        qualidade TEXT NOT NULL DEFAULT 'biologica' CHECK (qualidade IN ('biologica', 'adotiva', 'consideracao')),
        criado_por TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (filho_id, responsavel_id),
        CHECK (filho_id <> responsavel_id)
      )`,
      `CREATE INDEX IF NOT EXISTS filiacoes_do_responsavel ON filiacoes (responsavel_id)`,
      // Um registro por par de pessoas, com a_id < b_id para o par não se repetir invertido
      `CREATE TABLE IF NOT EXISTS casais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        a_id TEXT NOT NULL REFERENCES integrantes(id),
        b_id TEXT NOT NULL REFERENCES integrantes(id),
        visibilidade TEXT NOT NULL DEFAULT 'todos' CHECK (visibilidade IN ('todos', 'privado')),
        criado_por TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (a_id, b_id),
        CHECK (a_id < b_id)
      )`,
      // As fases contam a história do casal. A de maior ordem é a atual.
      `CREATE TABLE IF NOT EXISTS casal_fases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        casal_id INTEGER NOT NULL REFERENCES casais(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL CHECK (tipo IN ('namoro', 'noivado', 'casamento', 'uniao', 'separacao', 'amizade')),
        inicio_ano INTEGER,
        fim_ano INTEGER,
        ordem INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE INDEX IF NOT EXISTS fases_do_casal ON casal_fases (casal_id, ordem)`,
    ],
  },
  {
    // O que já se sabe da família, para a árvore não nascer vazia. Tudo pode ser corrigido no site.
    id: '005-arvore-inicial',
    sql: [
      `UPDATE integrantes SET tratamento = 'ela' WHERE id IN ('giovanna', 'elizete', 'vo-bela', 'vo-vivica', 'ana-candida', 'regina')`,
      `UPDATE integrantes SET tratamento = 'ele' WHERE id IN ('gui', 'lucas-magno', 'aguilar', 'lucio', 'chico')`,
      `INSERT OR IGNORE INTO filiacoes (filho_id, responsavel_id, qualidade) VALUES
        ('gui', 'elizete', 'biologica'), ('gui', 'aguilar', 'biologica'),
        ('giovanna', 'elizete', 'biologica'), ('giovanna', 'aguilar', 'biologica'),
        ('aguilar', 'vo-bela', 'biologica'),
        ('elizete', 'vo-vivica', 'biologica'),
        ('lucas-magno', 'lucio', 'biologica'), ('lucas-magno', 'ana-candida', 'biologica'),
        ('ana-candida', 'regina', 'biologica'),
        ('chico', 'giovanna', 'adotiva'), ('chico', 'lucas-magno', 'adotiva'),
        ('chico', 'gui', 'consideracao')`,
      `INSERT OR IGNORE INTO casais (a_id, b_id) VALUES ('aguilar', 'elizete'), ('giovanna', 'lucas-magno')`,
      `INSERT INTO casal_fases (casal_id, tipo, ordem)
        SELECT id, 'casamento', 0 FROM casais WHERE a_id = 'aguilar' AND b_id = 'elizete'
        UNION ALL SELECT id, 'separacao', 1 FROM casais WHERE a_id = 'aguilar' AND b_id = 'elizete'
        UNION ALL SELECT id, 'namoro', 0 FROM casais WHERE a_id = 'giovanna' AND b_id = 'lucas-magno'
        UNION ALL SELECT id, 'noivado', 1 FROM casais WHERE a_id = 'giovanna' AND b_id = 'lucas-magno'
        UNION ALL SELECT id, 'casamento', 2 FROM casais WHERE a_id = 'giovanna' AND b_id = 'lucas-magno'`,
    ],
  },
  {
    // Laços do coração: pessoais, cada um define os seus. O dono é quem escolheu.
    id: '006-lacos-do-coracao',
    sql: [
      `CREATE TABLE IF NOT EXISTS lacos_coracao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dono_id TEXT NOT NULL REFERENCES integrantes(id),
        pessoa_id TEXT NOT NULL REFERENCES integrantes(id),
        nome TEXT NOT NULL,
        -- "como se fosse": dá à pessoa um lugar na árvore do dono
        papel TEXT CHECK (papel IN ('avo', 'tio', 'irmao', 'primo', 'filho', 'sobrinho')),
        -- 1 muito próximo, 2 próximo, 3 conhecido. Só o dono vê.
        proximidade INTEGER CHECK (proximidade BETWEEN 1 AND 3),
        privado INTEGER NOT NULL DEFAULT 0,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (dono_id, pessoa_id),
        CHECK (dono_id <> pessoa_id)
      )`,
      `CREATE INDEX IF NOT EXISTS lacos_coracao_da_pessoa ON lacos_coracao (pessoa_id)`,
      `INSERT OR IGNORE INTO casais (a_id, b_id) VALUES ('ana-candida', 'lucio')`,
      `INSERT INTO casal_fases (casal_id, tipo, ordem)
        SELECT c.id, 'casamento', 0 FROM casais c
        WHERE c.a_id = 'ana-candida' AND c.b_id = 'lucio' AND NOT EXISTS (SELECT 1 FROM casal_fases f WHERE f.casal_id = c.id)`,
    ],
  },
  {
    // Lixeira: a memória excluída some do site, mas continua guardada e pode voltar
    id: '007-lixeira',
    sql: [`ALTER TABLE memorias ADD COLUMN excluida_em TEXT`, `ALTER TABLE memorias ADD COLUMN excluida_por TEXT`],
  },
  {
    // Capítulos reúnem memórias em um momento maior. Temas são etiquetas livres para memórias e capítulos.
    id: '008-capitulos-e-temas',
    sql: [
      `CREATE TABLE IF NOT EXISTS capitulos (
        id TEXT PRIMARY KEY,
        titulo TEXT NOT NULL,
        abertura TEXT,
        -- reunido: alguém adiciona as memórias. epoca: entram sozinhas pela data.
        modo TEXT NOT NULL DEFAULT 'reunido' CHECK (modo IN ('reunido', 'epoca')),
        inicio_ano INTEGER,
        inicio_mes INTEGER,
        fim_ano INTEGER,
        fim_mes INTEGER,
        pai_id TEXT REFERENCES capitulos(id),
        visibilidade TEXT NOT NULL DEFAULT 'todos' CHECK (visibilidade IN ('todos', 'nucleos')),
        criado_por TEXT NOT NULL REFERENCES integrantes(id),
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
        excluido_em TEXT,
        excluido_por TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS capitulo_nucleos (
        capitulo_id TEXT NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
        nucleo_id TEXT NOT NULL REFERENCES nucleos(id),
        PRIMARY KEY (capitulo_id, nucleo_id)
      )`,
      `CREATE TABLE IF NOT EXISTS capitulo_memorias (
        capitulo_id TEXT NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
        memoria_id TEXT NOT NULL REFERENCES memorias(id) ON DELETE CASCADE,
        PRIMARY KEY (capitulo_id, memoria_id)
      )`,
      `CREATE INDEX IF NOT EXISTS capitulos_da_memoria ON capitulo_memorias (memoria_id)`,
      `CREATE TABLE IF NOT EXISTS temas (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        criado_por TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS tema_memorias (
        tema_id TEXT NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
        memoria_id TEXT NOT NULL REFERENCES memorias(id) ON DELETE CASCADE,
        PRIMARY KEY (tema_id, memoria_id)
      )`,
      `CREATE INDEX IF NOT EXISTS temas_da_memoria ON tema_memorias (memoria_id)`,
      `CREATE TABLE IF NOT EXISTS tema_capitulos (
        tema_id TEXT NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
        capitulo_id TEXT NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
        PRIMARY KEY (tema_id, capitulo_id)
      )`,
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
