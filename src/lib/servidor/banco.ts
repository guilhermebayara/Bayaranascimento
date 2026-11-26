// Estrutura do banco de dados (D1) e sua evolução.
//
// O próprio site aplica as migrações na primeira visita depois de publicado.
// Cada migração roda uma única vez, dentro de uma transação, e fica anotada
// na tabela _migracoes. Para mudar a estrutura, acrescente um item no fim da
// lista: nunca edite uma migração que já foi publicada.
import { AMBIENTES_COM_EXEMPLOS, ambiente, banco, cobrirGatilhosQueGravam, cobrirGravacaoEmTodaTabela } from './ambiente';
import { TABELA_DA_MARCA, garantirGatilhosDaMarca } from './marca-da-copia';
import { NUCLEO_INICIAL } from '../familias';
import { semearAcervoDeExemplo, semearAniversariosDeExemplo, semearAvisosDeExemplo, semearPedidoDeExemplo, semearRascunhoQueFicouDeExemplo, semearAudiosDeExemplo, semearCartaDeExemplo, semearCasaisDoCoracaoDeExemplo, semearConsideracoesDeExemplo, semearDeQuemDeExemplo, semearDiaDosCapitulosDeExemplo, semearExemplos, semearNascimentoDaElizeteDeExemplo, semearParentesDeExemplo, semearTiposDeExemplo, semearCeiaRestritaDeExemplo } from './semente';
import { limparBucketDeTeste, semearFotosDeExemplo } from './fotos-de-exemplo';
import { consertarRetratosDaHomologacao } from './retratos-da-homologacao';
import { darMensagensAosRelatosDeAntes } from './mensagens-de-antes';

interface Migracao {
  id: string;
  sql: string[];
}

export const MIGRACOES: Migracao[] = [
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
    // A coluna "cor" ficou com dois sentidos: hexadecimal nos tipos desta migração; nos criados depois da 021,
    // o nome de uma cor da paleta. O site não lê dela (a cor de um tipo vem da coluna que a 021 acrescenta) e
    // só a grava, por causa do NOT NULL (auditoria AC, 4.2 e 5).
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
  {
    // O núcleo de origem passa a se chamar só "Bayara". O id continua o mesmo.
    id: '009-nucleo-bayara',
    sql: [`UPDATE nucleos SET nome = 'Bayara' WHERE id = 'bayara-nascimento'`],
  },
  {
    // Laço do coração "como se fosse pai ou mãe": a mãe de consideração da Elizete, por exemplo.
    // O SQLite não muda um CHECK no lugar, então a tabela é refeita com os mesmos dados.
    id: '010-papel-pai',
    sql: [
      `CREATE TABLE lacos_coracao_novo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dono_id TEXT NOT NULL REFERENCES integrantes(id),
        pessoa_id TEXT NOT NULL REFERENCES integrantes(id),
        nome TEXT NOT NULL,
        papel TEXT CHECK (papel IN ('avo', 'pai', 'tio', 'irmao', 'primo', 'filho', 'sobrinho')),
        proximidade INTEGER CHECK (proximidade BETWEEN 1 AND 3),
        privado INTEGER NOT NULL DEFAULT 0,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (dono_id, pessoa_id),
        CHECK (dono_id <> pessoa_id)
      )`,
      `INSERT INTO lacos_coracao_novo (id, dono_id, pessoa_id, nome, papel, proximidade, privado, criado_em)
        SELECT id, dono_id, pessoa_id, nome, papel, proximidade, privado, criado_em FROM lacos_coracao`,
      `DROP TABLE lacos_coracao`,
      `ALTER TABLE lacos_coracao_novo RENAME TO lacos_coracao`,
      `CREATE INDEX IF NOT EXISTS lacos_coracao_da_pessoa ON lacos_coracao (pessoa_id)`,
    ],
  },
  {
    // Rascunhos paralelos do relato de quem não acessa o site (decisão do Gui, 16/11/2026): cada pessoa pode
    // ter o seu rascunho do relato da Vó Vivica, sem os outros saberem, e só um é publicado. Antes, um
    // rascunho guardado ocupava o lugar e denunciava a existência e quem estava escrevendo.
    id: '011-relatos-paralelos',
    sql: [
      `CREATE TABLE relatos_novo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memoria_id TEXT NOT NULL REFERENCES memorias(id) ON DELETE CASCADE,
        por TEXT NOT NULL REFERENCES integrantes(id),
        registrado_por TEXT NOT NULL REFERENCES integrantes(id),
        texto TEXT NOT NULL,
        situacao TEXT NOT NULL DEFAULT 'publicada' CHECK (situacao IN ('rascunho', 'publicada')),
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (memoria_id, por, registrado_por)
      )`,
      `INSERT INTO relatos_novo (id, memoria_id, por, registrado_por, texto, situacao, criado_em, atualizado_em)
        SELECT id, memoria_id, por, registrado_por, texto, situacao, criado_em, atualizado_em FROM relatos`,
      `DROP TABLE relatos`,
      `ALTER TABLE relatos_novo RENAME TO relatos`,
      // Publicado, continua um por pessoa em cada memória
      `CREATE UNIQUE INDEX IF NOT EXISTS relatos_um_publicado ON relatos (memoria_id, por) WHERE situacao = 'publicada'`,
    ],
  },
  {
    // Casal privado sem denúncia (decisão do Gui, 16/11/2026): quem não vê o casal privado consegue cadastrar o
    // mesmo par como um registro público à parte. Antes, a recusa mostrava que existia um casal escondido.
    // As fases são refeitas antes de apagar a tabela antiga: apagar casais com as fases apontando para ela
    // levaria as fases junto, pela exclusão em cascata.
    id: '012-casal-publico-a-parte',
    sql: [
      `CREATE TABLE casais_novo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        a_id TEXT NOT NULL REFERENCES integrantes(id),
        b_id TEXT NOT NULL REFERENCES integrantes(id),
        visibilidade TEXT NOT NULL DEFAULT 'todos' CHECK (visibilidade IN ('todos', 'privado')),
        criado_por TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (a_id, b_id, visibilidade),
        CHECK (a_id < b_id)
      )`,
      `INSERT INTO casais_novo (id, a_id, b_id, visibilidade, criado_por, criado_em)
        SELECT id, a_id, b_id, visibilidade, criado_por, criado_em FROM casais`,
      `CREATE TABLE casal_fases_novo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        casal_id INTEGER NOT NULL REFERENCES casais_novo(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL CHECK (tipo IN ('namoro', 'noivado', 'casamento', 'uniao', 'separacao', 'amizade')),
        inicio_ano INTEGER,
        fim_ano INTEGER,
        ordem INTEGER NOT NULL DEFAULT 0
      )`,
      `INSERT INTO casal_fases_novo (id, casal_id, tipo, inicio_ano, fim_ano, ordem)
        SELECT id, casal_id, tipo, inicio_ano, fim_ano, ordem FROM casal_fases`,
      `DROP TABLE casal_fases`,
      `DROP TABLE casais`,
      `ALTER TABLE casais_novo RENAME TO casais`,
      `ALTER TABLE casal_fases_novo RENAME TO casal_fases`,
      `CREATE INDEX IF NOT EXISTS fases_do_casal ON casal_fases (casal_id, ordem)`,
    ],
  },
  {
    // Núcleo e parentes (decisão do Gui, 15/11/2026). O núcleo são só as pessoas que acessam o site; o resto
    // da família é parente de um núcleo: leva a cor e o lado dele na árvore e é cuidado por quem é do núcleo,
    // mas não vê o que é restrito ao núcleo. Na tela os dois aparecem iguais.
    // Também: falecimento como opção (dá para saber que alguém faleceu sem saber quando) e o laço resumido,
    // o parente de alguém de fora das famílias sem o caminho inteiro ("Caio é sobrinho do Ed").
    id: '013-nucleo-e-parentes',
    sql: [
      `ALTER TABLE nucleo_membros ADD COLUMN papel TEXT NOT NULL DEFAULT 'membro' CHECK (papel IN ('membro', 'parente'))`,
      `UPDATE nucleo_membros SET papel = 'parente' WHERE integrante_id NOT IN (${NUCLEO_INICIAL.map((id) => `'${id}'`).join(', ')})`,
      `ALTER TABLE integrantes ADD COLUMN falecido INTEGER NOT NULL DEFAULT 0`,
      `UPDATE integrantes SET falecido = 1 WHERE falecimento_ano IS NOT NULL`,
      // b é <papel> de a: "Caio (b) é sobrinho do Ed (a)"
      `CREATE TABLE IF NOT EXISTS lacos_resumidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        a_id TEXT NOT NULL REFERENCES integrantes(id),
        b_id TEXT NOT NULL REFERENCES integrantes(id),
        papel TEXT NOT NULL CHECK (papel IN ('avo', 'pai', 'tio', 'irmao', 'primo', 'filho', 'sobrinho')),
        criado_por TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (a_id, b_id),
        CHECK (a_id <> b_id)
      )`,
      `CREATE INDEX IF NOT EXISTS lacos_resumidos_de_b ON lacos_resumidos (b_id)`,
    ],
  },
  {
    // Data da adoção nos laços adotivos (pedido do Gui, 16/11/2026). Flexível como as outras datas:
    // só o ano, mês e ano, ou completa. Fica vazia nos outros tipos de filiação.
    id: '014-data-da-adocao',
    sql: [
      `ALTER TABLE filiacoes ADD COLUMN adocao_ano INTEGER`,
      `ALTER TABLE filiacoes ADD COLUMN adocao_mes INTEGER`,
      `ALTER TABLE filiacoes ADD COLUMN adocao_dia INTEGER`,
    ],
  },
  {
    // Áudios nos relatos (Decidido, a construir; liberado pelo Gui em 16/11/2026). Vários por relato, em
    // ordem, cada um com a transcrição opcional. O áudio nasce solto (relato_id vazio) quando é gravado ou
    // enviado, e passa a pertencer ao relato quando ele é salvo. Remover não apaga: marca removido_em, e o
    // arquivo continua no bucket. Os arquivos ficam no bucket das fotos, debaixo de "audios/".
    id: '015-audios-nos-relatos',
    sql: [
      `CREATE TABLE IF NOT EXISTS audios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        relato_id INTEGER REFERENCES relatos(id) ON DELETE SET NULL,
        memoria_id TEXT REFERENCES memorias(id) ON DELETE SET NULL,
        chave TEXT NOT NULL,
        tipo TEXT NOT NULL,
        tamanho INTEGER NOT NULL,
        duracao REAL,
        transcricao TEXT,
        ordem INTEGER NOT NULL DEFAULT 0,
        enviado_por TEXT NOT NULL REFERENCES integrantes(id),
        enviado_em TEXT NOT NULL DEFAULT (datetime('now')),
        removido_em TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS audios_do_relato ON audios (relato_id, ordem)`,
      `CREATE INDEX IF NOT EXISTS audios_por_chave ON audios (chave)`,
    ],
  },
  {
    // Foto de retrato no cadastro da pessoa (decisão do Gui, 16/11/2026). Guarda só a chave do arquivo,
    // que fica no bucket das fotos, debaixo de "retratos/". Trocar ou tirar não apaga o arquivo antigo:
    // a chave anterior fica nas versões do cadastro. A coluna "foto" da 001 nunca foi usada e fica como está.
    id: '016-retrato',
    sql: [
      `ALTER TABLE integrantes ADD COLUMN retrato TEXT`,
      `CREATE INDEX IF NOT EXISTS integrantes_por_retrato ON integrantes (retrato)`,
    ],
  },
  {
    // O Magno entra com o Gui e a Giovanna como quem dá o presente e cuida do acervo
    // (decisão do Gui e da Giovanna, 16/11/2026): passa a ser administrador.
    id: '017-magno-administrador',
    sql: [`UPDATE integrantes SET admin = 1 WHERE id = 'lucas-magno'`],
  },
  {
    // Assinatura do nome (decisão do Gui, 16/11/2026): cada núcleo diz de quais famílias é feito, para a
    // linha de sobrenomes embaixo de "MEMÓRIAS" acompanhar o que está sendo visto. Os sobrenomes ficam
    // numa lista em JSON, na ordem em que aparecem, e os administradores editam em /admin/familias.
    // Núcleo sem lista usa as palavras do próprio nome.
    id: '018-sobrenomes-dos-nucleos',
    sql: [
      `ALTER TABLE nucleos ADD COLUMN sobrenomes TEXT`,
      `UPDATE nucleos SET sobrenomes = '["Bayara"]' WHERE id = 'bayara-nascimento'`,
      `UPDATE nucleos SET sobrenomes = '["Bayara","Bracarense"]' WHERE id = 'bayara-bracarense'`,
      `UPDATE nucleos SET sobrenomes = '["Bracarense"]' WHERE id = 'bracarense'`,
    ],
  },
  {
    // Época e capítulo (decisão do Gui, 16/11/2026): o capítulo por período (modo 'epoca') diz de quem
    // é, com pessoas, famílias ou os dois, e entram só as memórias do período em que alguma dessas
    // pessoas está ou que são de uma dessas famílias. Sem ninguém, é uma época, de todos, como sempre
    // foi: os capítulos que já existem continuam iguais.
    id: '019-de-quem-e-o-capitulo',
    sql: [
      `CREATE TABLE IF NOT EXISTS capitulo_pessoas (
        capitulo_id TEXT NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
        integrante_id TEXT NOT NULL REFERENCES integrantes(id),
        PRIMARY KEY (capitulo_id, integrante_id)
      )`,
      `CREATE INDEX IF NOT EXISTS capitulos_da_pessoa ON capitulo_pessoas (integrante_id)`,
      `CREATE TABLE IF NOT EXISTS capitulo_familias (
        capitulo_id TEXT NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
        nucleo_id TEXT NOT NULL REFERENCES nucleos(id),
        PRIMARY KEY (capitulo_id, nucleo_id)
      )`,
    ],
  },
  {
    // Painel pessoal como página inicial (decisões do Gui, 16/11/2026).
    // - cartas: a carta de Natal, escrita pelos administradores no próprio site. Cada versão salva é
    //   uma linha nova, e vale a mais recente: nada se apaga. O texto nunca vai para o repositório.
    // - visitas: para cada pessoa que abre o painel, a primeira e a última visita (ver chegarAoPainel,
    //   em src/lib/painel.ts). Sem chave para integrantes: o registro é de quem entra no site.
    // - publicada_em: quando a memória e o relato foram publicados, para "o que entrou de novo". Um
    //   rascunho publicado depois entra como novo no dia em que foi publicado. As que já existem
    //   ficam com a data de criação.
    // Numerada 020 porque a 019 é a de "Época e capítulo", em outro PR para a homologa.
    id: '020-painel',
    sql: [
      `CREATE TABLE IF NOT EXISTS cartas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        texto TEXT NOT NULL,
        assinatura TEXT NOT NULL,
        escrita_por TEXT NOT NULL,
        escrita_em TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS visitas (
        pessoa TEXT PRIMARY KEY,
        primeira_em TEXT NOT NULL,
        visita_em TEXT NOT NULL,
        ultima_em TEXT NOT NULL,
        anterior_em TEXT,
        carta_em TEXT
      )`,
      `ALTER TABLE memorias ADD COLUMN publicada_em TEXT`,
      `UPDATE memorias SET publicada_em = criada_em WHERE situacao = 'publicada'`,
      `ALTER TABLE relatos ADD COLUMN publicado_em TEXT`,
      `UPDATE relatos SET publicado_em = criado_em WHERE situacao = 'publicada'`,
    ],
  },
  {
    // Tipos de momento: a cor vira o nome de uma cor da paleta do sistema, e cada tipo ganha um
    // rabisco à escolha (resposta do Gui à pergunta 11 do PR #38, 17/11/2026). A coluna "cor", com
    // o valor de antes do visual novo, fica como está: o site não pinta mais por ela.
    // Os onze tipos de sempre recebem a cor e o rabisco que já mostram hoje (COR_DO_TIPO, em
    // src/lib/visual.ts, e o rabisco com o id do tipo), para nada mudar de aparência. Tipo criado
    // pelos administradores antes desta migração fica sem escolha e continua com a cor de reserva
    // e o brilho, como hoje. testes/tipos.test.ts confere que esta lista e COR_DO_TIPO dizem o mesmo.
    id: '021-cor-e-icone-dos-tipos',
    sql: [
      `ALTER TABLE tipos ADD COLUMN cor_da_paleta TEXT`,
      `ALTER TABLE tipos ADD COLUMN icone TEXT`,
      `UPDATE tipos SET cor_da_paleta = 'verde', icone = 'nascimento' WHERE id = 'nascimento'`,
      `UPDATE tipos SET cor_da_paleta = 'rosa', icone = 'aniversario' WHERE id = 'aniversario'`,
      `UPDATE tipos SET cor_da_paleta = 'roxo', icone = 'casamento' WHERE id = 'casamento'`,
      `UPDATE tipos SET cor_da_paleta = 'manteiga', icone = 'conquista' WHERE id = 'conquista'`,
      `UPDATE tipos SET cor_da_paleta = 'azul', icone = 'viagem' WHERE id = 'viagem'`,
      `UPDATE tipos SET cor_da_paleta = 'pessego', icone = 'casa' WHERE id = 'casa'`,
      `UPDATE tipos SET cor_da_paleta = 'coral', icone = 'festa' WHERE id = 'festa'`,
      `UPDATE tipos SET cor_da_paleta = 'turquesa', icone = 'causo' WHERE id = 'causo'`,
      `UPDATE tipos SET cor_da_paleta = 'areia', icone = 'cotidiano' WHERE id = 'cotidiano'`,
      `UPDATE tipos SET cor_da_paleta = 'ardosia', icone = 'despedida' WHERE id = 'despedida'`,
      `UPDATE tipos SET cor_da_paleta = 'orquidea', icone = 'outro' WHERE id = 'outro'`,
    ],
  },
  {
    // Fotos pelo relato (decisão do Gui, 16/11/2026): a foto guarda o relato com que veio, para
    // aparecer também pequena no bilhete dele. Ela continua sendo da memória: se o relato sumir, a
    // foto fica (SET NULL). Enquanto o relato está em rascunho, a foto fica presa a ele, sem memória,
    // e só quem enviou vê; ao publicar, entra na memória.
    id: '022-fotos-do-relato',
    sql: [`ALTER TABLE fotos ADD COLUMN relato_id INTEGER REFERENCES relatos(id) ON DELETE SET NULL`, `CREATE INDEX IF NOT EXISTS fotos_do_relato ON fotos (relato_id)`],
  },
  {
    // Administradores podem mais (decisão do Gui, 16/11/2026): toda mudança feita por um administrador
    // em foto de outra pessoa fica no histórico com o nome dele. Até aqui só quem enviou tirava a foto;
    // agora a foto removida guarda quem tirou. Vazio nas antigas: foi quem enviou.
    id: '023-quem-removeu-a-foto',
    sql: [`ALTER TABLE fotos ADD COLUMN removida_por TEXT REFERENCES integrantes(id)`],
  },
  {
    // Avisos dentro do site (decisões do Gui, 17/11/2026; regras em src/lib/avisos.ts).
    // - acessos: o primeiro acesso de cada pessoa, para ela só receber avisos a partir dele. Quem já
    //   abriu o painel entra com a primeira visita.
    // - avisos: um por pessoa e acontecimento. "resolvido_em" é quando saiu da lista: ao abrir a
    //   memória, ou, no pedido para liberar um relato, ao responder ("resposta"). Sem chave para as
    //   memórias e os relatos: a lista confere ao ler se a pessoa ainda vê o item, e uma cascata
    //   amarraria a refação futura dessas tabelas.
    id: '024-avisos',
    sql: [
      `CREATE TABLE IF NOT EXISTS acessos (
        pessoa TEXT PRIMARY KEY,
        primeiro_em TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `INSERT OR IGNORE INTO acessos (pessoa, primeiro_em) SELECT pessoa, primeira_em FROM visitas`,
      `CREATE TABLE IF NOT EXISTS avisos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        para TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('liberar-relato', 'relato-novo', 'quem-estava')),
        memoria_id TEXT NOT NULL,
        relato_id INTEGER,
        de TEXT NOT NULL,
        dados TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        resolvido_em TEXT,
        resposta TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS avisos_de_quem ON avisos (para, resolvido_em)`,
      `CREATE INDEX IF NOT EXISTS avisos_da_memoria ON avisos (memoria_id)`,
    ],
  },
  {
    // Ampliar quem vê uma memória com relatos (decisão do Gui, 17/11/2026; regras em permissoes.ts,
    // "estaNoPublicoDoRelato"). Ao ampliar, cada relato que já existia fica só para quem via antes até
    // quem o registrou concordar: os núcleos desse público antigo, numa lista em JSON. Vazio: o relato
    // acompanha a memória, como todos os que já existem.
    id: '025-relato-so-para-quem-via',
    sql: [`ALTER TABLE relatos ADD COLUMN so_para_nucleos TEXT`],
  },
  {
    // O círculo (decisão do Gui, 17/11/2026; contas em src/lib/circulo.ts). A proximidade passa a ser
    // contínua e por dono, para qualquer pessoa que ele vê, da família ou do coração: de 0 (colado no
    // centro) a 99 (a borda), e 100 é "Fora do círculo". O ângulo guarda o lugar de quem foi
    // arrastado; vazio, o site espalha pela volta. Só o dono lê e escreve as linhas dele.
    // - Os três níveis antigos do laço do coração (1, 2 e 3) entram no meio de cada faixa: 16, 50 e 83.
    //   A coluna antiga continua em lacos_coracao, dizendo a faixa, e as duas andam juntas.
    // - Sem chave estrangeira, como os avisos: uma cascata amarraria a refação futura de integrantes.
    //   Quem lê confere se a pessoa ainda existe e se o dono ainda a vê.
    id: '030-proximidades',
    sql: [
      `CREATE TABLE IF NOT EXISTS proximidades (
        dono_id TEXT NOT NULL,
        pessoa_id TEXT NOT NULL,
        valor INTEGER NOT NULL CHECK (valor BETWEEN 0 AND 100),
        angulo REAL,
        mudado_em TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (dono_id, pessoa_id)
      )`,
      `INSERT OR IGNORE INTO proximidades (dono_id, pessoa_id, valor)
        SELECT dono_id, pessoa_id, CASE proximidade WHEN 1 THEN 16 WHEN 2 THEN 50 ELSE 83 END
        FROM lacos_coracao WHERE proximidade IS NOT NULL`,
    ],
  },
  {
    // Cópia mensal atrasada, uma das pendências da administração em "Sua conta" (escolha do Gui no
    // conceito da sessão E, 17/11/2026). Cada vez que o script do Drive (scripts/copia-no-drive.gs)
    // baixa a cópia com o token de serviço, o site anota o momento. Só o site grava, no middleware;
    // ninguém edita. A conta lê a mais recente (src/lib/conta.ts, copiaAtrasada).
    // Desde a 114, "feita_em" quer dizer "confirmada em": a anotação só entra quando o script confirma que
    // gravou a cópia no Drive (anotarCopiaMensal), e não quando ele a baixou. O nome da coluna ficou o de antes.
    id: '060-copias-mensais',
    sql: [
      `CREATE TABLE IF NOT EXISTS copias_mensais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feita_em TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ],
  },
  {
    // Espaço das fotos e áudios na administração (decisão do Gui, 18/11/2026). O plano gratuito do R2 vai
    // até 10 GB, e o site conta sozinho, sem consultar o bucket: cada arquivo guarda o tamanho ao entrar,
    // e a conta é a soma (src/lib/espaco-dos-arquivos.ts). Os áudios já guardavam (migração 015). As
    // fotos ganham a coluna; os retratos, que só têm a chave em integrantes.retrato, ganham uma tabela
    // com cada arquivo enviado, para o retrato trocado continuar contando. Vazio nas fotos de antes: o
    // cartão da administração mede essas aos poucos, lendo só o tamanho de cada uma no bucket.
    // Sem chave estrangeira, como os avisos.
    id: '070-tamanho-dos-arquivos',
    sql: [
      `ALTER TABLE fotos ADD COLUMN tamanho INTEGER`,
      `CREATE TABLE IF NOT EXISTS retratos_enviados (
        chave TEXT PRIMARY KEY,
        tamanho INTEGER NOT NULL,
        enviado_por TEXT,
        enviado_em TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ],
  },
  {
    // Ex-casal: quem vê e como aparece para mim (decisões do Gui, 18/11/2026; regras em permissoes.ts e
    // em src/lib/ex-casal.ts).
    // - Quem vê um casal desfeito ganha "famílias escolhidas": visibilidade 'nucleos', com as famílias em
    //   casal_nucleos. O SQLite não muda um CHECK no lugar, então os casais são refeitos com os mesmos
    //   dados, e as fases antes, como na 012: apagar casais com as fases apontando para ela levaria as
    //   fases junto, pela exclusão em cascata. As famílias do casal são criadas depois, já apontando
    //   para a tabela nova.
    // - Como o ex aparece para cada uma das duas pessoas do casal: 'discreto' ou 'fora' (sem linha, como
    //   hoje: presente). Só o dono lê e escreve as linhas dele. Sem chave estrangeira, como as
    //   proximidades: quem lê confere se a pessoa ainda existe e se ainda é ex de quem escolheu.
    id: '071-ex-casal',
    sql: [
      `CREATE TABLE casais_novo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        a_id TEXT NOT NULL REFERENCES integrantes(id),
        b_id TEXT NOT NULL REFERENCES integrantes(id),
        visibilidade TEXT NOT NULL DEFAULT 'todos' CHECK (visibilidade IN ('todos', 'privado', 'nucleos')),
        criado_por TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (a_id, b_id, visibilidade),
        CHECK (a_id < b_id)
      )`,
      `INSERT INTO casais_novo (id, a_id, b_id, visibilidade, criado_por, criado_em)
        SELECT id, a_id, b_id, visibilidade, criado_por, criado_em FROM casais`,
      `CREATE TABLE casal_fases_novo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        casal_id INTEGER NOT NULL REFERENCES casais_novo(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL CHECK (tipo IN ('namoro', 'noivado', 'casamento', 'uniao', 'separacao', 'amizade')),
        inicio_ano INTEGER,
        fim_ano INTEGER,
        ordem INTEGER NOT NULL DEFAULT 0
      )`,
      `INSERT INTO casal_fases_novo (id, casal_id, tipo, inicio_ano, fim_ano, ordem)
        SELECT id, casal_id, tipo, inicio_ano, fim_ano, ordem FROM casal_fases`,
      `DROP TABLE casal_fases`,
      `DROP TABLE casais`,
      `ALTER TABLE casais_novo RENAME TO casais`,
      `ALTER TABLE casal_fases_novo RENAME TO casal_fases`,
      `CREATE INDEX IF NOT EXISTS fases_do_casal ON casal_fases (casal_id, ordem)`,
      `CREATE TABLE IF NOT EXISTS casal_nucleos (
        casal_id INTEGER NOT NULL REFERENCES casais(id) ON DELETE CASCADE,
        nucleo_id TEXT NOT NULL REFERENCES nucleos(id),
        PRIMARY KEY (casal_id, nucleo_id)
      )`,
      `CREATE TABLE IF NOT EXISTS ex_para_mim (
        dono_id TEXT NOT NULL,
        pessoa_id TEXT NOT NULL,
        modo TEXT NOT NULL CHECK (modo IN ('discreto', 'fora')),
        mudado_em TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (dono_id, pessoa_id)
      )`,
    ],
  },
  {
    // Apagar de vez o que está na lixeira (decisão do Gui, 17/11/2026, onda 2): só os administradores,
    // item a item, com confirmação. O que foi apagado não volta. Fica só a anotação de que algo foi
    // apagado, por quem e quando, sem título nem conteúdo nenhum.
    id: '072-apagados-de-vez',
    sql: [
      `CREATE TABLE IF NOT EXISTS apagados_de_vez (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL CHECK (tipo IN ('memoria', 'capitulo')),
        item_id TEXT NOT NULL,
        por TEXT NOT NULL,
        em TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ],
  },
  {
    // Ajustes do acervo que os administradores escolhem no site, um por chave, com o valor em JSON. O
    // primeiro: os centros da árvore (onda 2, decisão do Gui de 17/11/2026), de quem é a linha direta
    // quando a árvore abre. A versão de antes vai para o histórico (versoes, tipo 'ajuste').
    id: '073-ajustes-do-acervo',
    sql: [
      `CREATE TABLE IF NOT EXISTS ajustes (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL,
        mudado_por TEXT,
        mudado_em TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ],
  },
  {
    // Sugestão de correção (onda 2, decisão do Gui de 17/11/2026; regras em src/lib/sugestoes.ts): de
    // dados da memória (data, lugar, quem estava), para quem criou, ou um recado livre a quem registrou
    // um relato. Quem recebe aceita, recusa ou responde. Sem chave para memórias e relatos, como os
    // avisos: quem lê confere se a pessoa ainda vê o item.
    // Os avisos ganham dois tipos: a sugestão e a resposta a ela. O SQLite não muda um CHECK no lugar, e
    // a tabela é refeita com os mesmos dados (nenhuma outra aponta para ela).
    id: '074-sugestoes-de-correcao',
    sql: [
      `CREATE TABLE IF NOT EXISTS sugestoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memoria_id TEXT NOT NULL,
        relato_id INTEGER,
        de TEXT NOT NULL,
        para TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('dados', 'recado')),
        proposta TEXT,
        texto TEXT,
        situacao TEXT NOT NULL DEFAULT 'aberta' CHECK (situacao IN ('aberta', 'aceita', 'recusada', 'respondida')),
        resposta TEXT,
        criada_em TEXT NOT NULL DEFAULT (datetime('now')),
        respondida_em TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS sugestoes_da_memoria ON sugestoes (memoria_id)`,
      `CREATE INDEX IF NOT EXISTS sugestoes_para ON sugestoes (para, situacao)`,
      `CREATE TABLE avisos_novo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        para TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('liberar-relato', 'relato-novo', 'quem-estava', 'sugestao', 'sugestao-resposta')),
        memoria_id TEXT NOT NULL,
        relato_id INTEGER,
        de TEXT NOT NULL,
        dados TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        resolvido_em TEXT,
        resposta TEXT
      )`,
      `INSERT INTO avisos_novo (id, para, tipo, memoria_id, relato_id, de, dados, criado_em, resolvido_em, resposta)
        SELECT id, para, tipo, memoria_id, relato_id, de, dados, criado_em, resolvido_em, resposta FROM avisos`,
      `DROP TABLE avisos`,
      `ALTER TABLE avisos_novo RENAME TO avisos`,
      `CREATE INDEX IF NOT EXISTS avisos_de_quem ON avisos (para, resolvido_em)`,
      `CREATE INDEX IF NOT EXISTS avisos_da_memoria ON avisos (memoria_id)`,
    ],
  },
  {
    // Reações (onda 2, decisão do Gui de 17/11/2026; regras em src/lib/reacoes.ts): em relato e em foto,
    // quatro símbolos desenhados com os rabiscos do site (coração, riso, saudade e "eu estava lá"). Uma
    // linha por pessoa, símbolo e item. Sem chave para memórias, relatos e fotos, como os avisos: quem lê
    // confere se ainda vê o item e quem marcou.
    id: '075-reacoes',
    sql: [
      `CREATE TABLE IF NOT EXISTS reacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memoria_id TEXT NOT NULL,
        alvo TEXT NOT NULL CHECK (alvo IN ('relato', 'foto')),
        alvo_id INTEGER NOT NULL,
        pessoa TEXT NOT NULL,
        simbolo TEXT NOT NULL CHECK (simbolo IN ('coracao', 'riso', 'saudade', 'estava')),
        criada_em TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (alvo, alvo_id, pessoa, simbolo)
      )`,
      `CREATE INDEX IF NOT EXISTS reacoes_da_memoria ON reacoes (memoria_id)`,
    ],
  },
  {
    // Sugestão de correção para todos que podem corrigir (resposta do Gui à sessão F, 18/11/2026): a de
    // dados vai para quem criou e para quem está na memória, e o primeiro que responder resolve. Quem
    // respondeu passa a ser guardado, porque deixa de ser sempre o "para".
    id: '080-quem-respondeu-a-sugestao',
    sql: [`ALTER TABLE sugestoes ADD COLUMN respondida_por TEXT`],
  },
  {
    // Reações na memória também (observação do Gui, 18/11/2026: valem para a memória, para cada relato e
    // para cada foto). O alvo ganha 'memoria', com alvo_id 0, e a chave única passa a contar a memória,
    // para o alvo_id 0 de uma memória não colidir com o de outra. O SQLite não muda um CHECK no lugar:
    // a tabela é refeita com os mesmos dados. Nenhuma outra tabela aponta para ela.
    id: '081-reacoes-na-memoria',
    sql: [
      `CREATE TABLE reacoes_novo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memoria_id TEXT NOT NULL,
        alvo TEXT NOT NULL CHECK (alvo IN ('memoria', 'relato', 'foto')),
        alvo_id INTEGER NOT NULL,
        pessoa TEXT NOT NULL,
        simbolo TEXT NOT NULL CHECK (simbolo IN ('coracao', 'riso', 'saudade', 'estava')),
        criada_em TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (memoria_id, alvo, alvo_id, pessoa, simbolo)
      )`,
      `INSERT INTO reacoes_novo (id, memoria_id, alvo, alvo_id, pessoa, simbolo, criada_em) SELECT id, memoria_id, alvo, alvo_id, pessoa, simbolo, criada_em FROM reacoes`,
      `DROP TABLE reacoes`,
      `ALTER TABLE reacoes_novo RENAME TO reacoes`,
      `CREATE INDEX IF NOT EXISTS reacoes_da_memoria ON reacoes (memoria_id)`,
    ],
  },
  {
    // "Como você chama", só seu (decisão do Gui, 18/11/2026; src/lib/apelidos.ts). O apelido que cada pessoa
    // dá a outra, que só ela vê. Como as proximidades, sem chave estrangeira: quem lê confere se a pessoa
    // ainda existe, e juntar duplicados leva as linhas para a ficha que fica. O espelho apaga a tabela.
    id: '090-como-voce-chama',
    sql: [
      `CREATE TABLE IF NOT EXISTS apelidos_meus (
        dono_id TEXT NOT NULL,
        pessoa_id TEXT NOT NULL,
        apelido TEXT NOT NULL CHECK (length(apelido) BETWEEN 1 AND 40),
        mudado_em TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (dono_id, pessoa_id)
      )`,
    ],
  },
  {
    // "Já é da família" (decisão do Gui, 18/11/2026; comoOCasalAparece, em src/lib/parentesco.ts): o namoro
    // aparece como laço do coração, a não ser que se marque assim (namoro longo), e aí aparece como casal.
    // Coluna nova com valor padrão: não precisa refazer a tabela.
    id: '100-namoro-da-familia',
    sql: [`ALTER TABLE casais ADD COLUMN ja_da_familia INTEGER NOT NULL DEFAULT 0`],
  },
  {
    // As fases do casal com mês e dia opcionais, como as outras datas do site (decisão do Gui, 18/11/2026).
    // Com dia e mês, o casamento de hoje entra nos aniversários do Início.
    id: '101-datas-das-fases',
    sql: [
      `ALTER TABLE casal_fases ADD COLUMN inicio_mes INTEGER`,
      `ALTER TABLE casal_fases ADD COLUMN inicio_dia INTEGER`,
      `ALTER TABLE casal_fases ADD COLUMN fim_mes INTEGER`,
      `ALTER TABLE casal_fases ADD COLUMN fim_dia INTEGER`,
    ],
  },
  {
    // Excluir pessoa (decisão do Gui depois da sessão I, 18/11/2026; regras em permissoes.ts,
    // "podeExcluirPessoa"). A pessoa excluída vai para a lixeira: some do site na hora, e um administrador
    // restaura. Nada é apagado: as linhas dela (laços, "quem estava", relatos) ficam no banco, e as
    // consultas deixam de vê-la. Quem não administra pede; o pedido fica aberto até um administrador
    // excluir ou recusar. Um pedido aberto por pessoa.
    id: '102-excluir-pessoa',
    sql: [
      `ALTER TABLE integrantes ADD COLUMN excluida_em TEXT`,
      `ALTER TABLE integrantes ADD COLUMN excluida_por TEXT`,
      `CREATE TABLE IF NOT EXISTS pedidos_de_exclusao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pessoa_id TEXT NOT NULL,
        pedido_por TEXT NOT NULL,
        motivo TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        resolvido_em TEXT,
        resolvido_por TEXT,
        resposta TEXT CHECK (resposta IN ('excluida', 'recusado'))
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS pedidos_de_exclusao_um_aberto ON pedidos_de_exclusao (pessoa_id) WHERE resolvido_em IS NULL`,
    ],
  },  {
    // O relato como conversa (escolha do Gui depois da sessão I, 18/11/2026; regras em src/lib/conversa.ts).
    // Cada envio é uma mensagem: um texto, um áudio ou uma foto, numa ordem só. O áudio e a foto continuam
    // nas tabelas deles; a mensagem aponta para eles. O texto do relato (relatos.texto) continua gravado,
    // feito das mensagens de texto, para o resto do site. Os relatos de antes não mudam no banco: sem
    // mensagens gravadas, a conversa é derivada deles (os áudios, cada parágrafo e as fotos) e é gravada na
    // primeira vez que alguém mexe. cita_id: a mensagem de outra pessoa que esta cita, sem chave, para a
    // citação sumir quando a mensagem citada some.
    id: '103-mensagens-do-relato',
    sql: [
      `CREATE TABLE IF NOT EXISTS relato_mensagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        relato_id INTEGER NOT NULL REFERENCES relatos(id) ON DELETE CASCADE,
        ordem INTEGER NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'audio', 'foto')),
        texto TEXT,
        audio_id INTEGER,
        foto_id INTEGER,
        cita_id INTEGER,
        enviada_em TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS relato_mensagens_do_relato ON relato_mensagens (relato_id, ordem)`,
    ],
  },
  {
    // O capítulo por período e a época com dia opcional no começo e no fim (pedido do Gui, 18/11/2026).
    // Colunas novas, vazias nos capítulos de hoje: eles continuam como estão, sem perda.
    id: '104-dia-dos-capitulos',
    sql: [`ALTER TABLE capitulos ADD COLUMN inicio_dia INTEGER`, `ALTER TABLE capitulos ADD COLUMN fim_dia INTEGER`],
  },
  {
    // O público mais amplo que cada relato já teve (resposta do Gui à P3 do QA de 23/11/2026; regras em
    // permissoes.ts, "relatoDepoisDaMudanca"). Ao ampliar quem vê a memória, o relato só espera por quem
    // nunca o viu: restringir e reabrir não pede de novo. "todos" ou a lista de núcleos em JSON. Vazia nos
    // relatos de hoje: o público conhecido deles é o de hoje, sem supor passado, e é gravado na primeira
    // mudança de quem vê a memória.
    id: '105-publico-conhecido-do-relato',
    sql: [`ALTER TABLE relatos ADD COLUMN publico_conhecido TEXT`],
  },
  {
    // O rascunho que ficou para trás quando outra pessoa publicou o relato de quem não acessa o site
    // (resposta do Gui à P4 do QA de 23/11/2026): quem escreveu vê o texto, para copiar, e pode descartá-lo.
    // Descartado, ele vai para a lixeira de quem escreveu, como os rascunhos de memória: some das listas e
    // volta por "Restaurar". Nada é apagado.
    id: '106-rascunho-de-relato-descartado',
    sql: [`ALTER TABLE relatos ADD COLUMN descartado_em TEXT`],
  },
  {
    // A versão da memória (revisão Y2 do PR #160, item 4b): todo lote que conta com o que leu dos relatos da
    // memória (ampliar ou restringir, responder ao pedido, descartar ou restaurar o rascunho de relato) sobe a
    // versão a partir da que leu, e um relato novo sobe a versão de qualquer jeito. O gatilho recusa a subida
    // que não parte da versão de agora: o lote inteiro volta, e quem perdeu refaz a conta com o banco de agora
    // (refazerSeAMemoriaMudou, em repositorio.ts).
    id: '107-versao-da-memoria',
    sql: [
      `ALTER TABLE memorias ADD COLUMN versao INTEGER NOT NULL DEFAULT 0`,
      `CREATE TRIGGER IF NOT EXISTS memorias_versao_confere BEFORE UPDATE OF versao ON memorias
       WHEN NEW.versao <> OLD.versao + 1
       BEGIN SELECT RAISE(ABORT, 'memoria-mudou'); END`,
    ],
  },
  {
    // Um relato tem no máximo um pedido para liberar na lista (revisão Y2 do PR #160): dois salvamentos
    // iguais ao mesmo tempo não criam dois pedidos abertos. Se já houver mais de um, fica o mais novo, e os
    // outros saem da lista sem resposta, como sai o pedido que perdeu o sentido.
    id: '108-um-pedido-aberto-por-relato',
    sql: [
      `UPDATE avisos SET resolvido_em = datetime('now')
       WHERE tipo = 'liberar-relato' AND resolvido_em IS NULL
         AND id NOT IN (SELECT MAX(id) FROM avisos WHERE tipo = 'liberar-relato' AND resolvido_em IS NULL GROUP BY relato_id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS avisos_um_pedido_aberto ON avisos (relato_id) WHERE tipo = 'liberar-relato' AND resolvido_em IS NULL`,
    ],
  },
  {
    // O código de envio único do formulário sem script (D3 da sessão Z, 22/11/2026): a janela de escrever
    // o relato leva um código novo a cada página, gravado no mesmo lote do relato. O segundo envio com o
    // mesmo código (o toque duplo em "Publicar relato") faz o lote voltar inteiro, e nada é gravado de novo.
    // Só o código e a hora: os de mais de dois dias saem no próximo envio.
    id: '109-envios-unicos',
    sql: [`CREATE TABLE IF NOT EXISTS envios (codigo TEXT PRIMARY KEY, em TEXT NOT NULL DEFAULT (datetime('now')))`],
  },
  {
    // As duas cópias menores de cada foto (sessão D1b, decisão 4 do Gui em docs/briefs/desempenho.md): o
    // formato, a medida de cada uma e os bytes das duas, em JSON (src/lib/copias-das-fotos.ts, "Copias").
    // Vazia nas fotos de hoje: a tela usa a original até o ajuste da Administração fazer as cópias.
    id: '110-copias-das-fotos',
    sql: [`ALTER TABLE fotos ADD COLUMN copias TEXT`],
  },
  {
    // A cópia pequena de cada retrato (sessão D1c, decisão do Gui de 23/11/2026; src/lib/retratos.ts): o
    // formato, o lado e os bytes, para a rota achar a cópia e a conta do espaço somar. Sem cópia, a original.
    id: '111-copia-dos-retratos',
    sql: [`ALTER TABLE retratos_enviados ADD COLUMN copia TEXT`],
  },
  {
    // A reserva das cópias (item 13 da revisão R-D1, sessão D1d): antes de gravar as cópias de uma foto ou de
    // um retrato no bucket, o pedido reserva o alvo ("foto:<chave>" ou "retrato:<chave>"). Só um pedido grava;
    // o outro recebe 409 sem gravar nada. A reserva de um pedido que morreu no meio vence sozinha
    // (MINUTOS_DA_RESERVA_DAS_COPIAS, em repositorio.ts), e a que terminou sai da tabela.
    id: '112-reserva-das-copias',
    sql: [
      `CREATE TABLE IF NOT EXISTS reservas_das_copias (
        alvo TEXT PRIMARY KEY,
        codigo TEXT NOT NULL,
        em TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ],
  },
  {
    // A marca de mudança do acervo (item 1 da revisão D1f, 24/11/2026; src/lib/servidor/marca-da-copia.ts): um
    // número que sobe a cada gravação, para a cópia em partes saber se algo foi gravado no meio dela. Os
    // gatilhos de cada tabela são criados por garantirGatilhosDaMarca, ao fim de migrar, porque as tabelas de
    // cada banco não são as mesmas (as prévias têm limpezas_do_teste).
    id: '113-marca-da-copia',
    sql: [
      `CREATE TABLE IF NOT EXISTS ${TABELA_DA_MARCA} (id INTEGER PRIMARY KEY CHECK (id = 1), valor INTEGER NOT NULL)`,
      `INSERT OR IGNORE INTO ${TABELA_DA_MARCA} (id, valor) VALUES (1, 0)`,
    ],
  },
  {
    // A confirmação da cópia mensal é idempotente (D1f4, 24/11/2026): cada anotação guarda a gerada_em do índice
    // que ela confirma, e a mesma gerada_em anota uma vez só (anotarCopiaMensal). Sem chave única, para a tabela
    // continuar no critério das tabelas de registro (marca-da-copia.ts); a conferência é feita no próprio INSERT.
    id: '114-copia-mensal-confirmada',
    sql: [`ALTER TABLE copias_mensais ADD COLUMN gerada_em TEXT`],
  },
  {
    // Dois índices que nenhuma consulta usa (auditoria AC, B-1, sessão AC1, 26/11/2026): nenhuma consulta filtra
    // sugestoes por "para", e reacoes_da_memoria é o prefixo da chave única de reacoes desde a 081. Cada um custava
    // uma gravação a mais por sugestão e por reação.
    id: '115-sem-indices-sem-uso',
    sql: [`DROP INDEX IF EXISTS sugestoes_para`, `DROP INDEX IF EXISTS reacoes_da_memoria`],
  },
  {
    // O índice da busca (aplicação da E2, 26/11/2026; docs/regras/explorar.md, "A busca"). Os textos das memórias
    // que a busca procura, um por linha (busca_textos), e o FTS5 do D1 por cima deles (busca_indice), que tira
    // acento e maiúscula ao indexar. Derivado do acervo, sempre: os gatilhos de memorias, relatos, audios e fotos
    // mantêm as linhas a cada gravação, de qualquer caminho (o site, os exemplos, a carga de desempenho, a
    // restauração), e o fim desta migração preenche com o que já existe. Fica fora da cópia do acervo e do
    // espelho (TABELAS_FORA_DA_COPIA): refaz-se sozinho a partir das tabelas de verdade.
    //
    // O que entra: o título e o lugar de toda memória; o texto do relato publicado; a transcrição do áudio que não
    // foi removido, de relato publicado; a legenda da foto que não foi removida e já está na memória. O índice só
    // acha candidatos: quem vê o quê é decidido pelo código, sobre eles (src/lib/servidor/busca.ts).
    id: '116-indice-da-busca',
    sql: [
      `CREATE TABLE IF NOT EXISTS busca_textos (
        id INTEGER PRIMARY KEY,
        memoria_id TEXT NOT NULL,
        campo TEXT NOT NULL CHECK (campo IN ('titulo', 'lugar', 'relato', 'audio', 'legenda')),
        ref INTEGER,
        texto TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS busca_textos_da_memoria ON busca_textos (memoria_id, campo)`,
      `CREATE INDEX IF NOT EXISTS busca_textos_do_item ON busca_textos (campo, ref)`,
      `CREATE VIRTUAL TABLE IF NOT EXISTS busca_indice USING fts5(texto, content='busca_textos', content_rowid='id', tokenize='unicode61 remove_diacritics 2')`,
      `CREATE TRIGGER IF NOT EXISTS busca_textos_entra AFTER INSERT ON busca_textos BEGIN
        INSERT INTO busca_indice (rowid, texto) VALUES (new.id, new.texto);
      END`,
      `CREATE TRIGGER IF NOT EXISTS busca_textos_sai AFTER DELETE ON busca_textos BEGIN
        INSERT INTO busca_indice (busca_indice, rowid, texto) VALUES ('delete', old.id, old.texto);
      END`,
      // A memória: o título e o lugar
      `CREATE TRIGGER IF NOT EXISTS busca_memoria_entra AFTER INSERT ON memorias BEGIN
        INSERT INTO busca_textos (memoria_id, campo, texto) SELECT new.id, 'titulo', new.titulo WHERE TRIM(new.titulo) <> '';
        INSERT INTO busca_textos (memoria_id, campo, texto) SELECT new.id, 'lugar', new.lugar WHERE TRIM(COALESCE(new.lugar, '')) <> '';
      END`,
      `CREATE TRIGGER IF NOT EXISTS busca_memoria_muda AFTER UPDATE OF id, titulo, lugar ON memorias BEGIN
        DELETE FROM busca_textos WHERE memoria_id = old.id AND campo IN ('titulo', 'lugar');
        INSERT INTO busca_textos (memoria_id, campo, texto) SELECT new.id, 'titulo', new.titulo WHERE TRIM(new.titulo) <> '';
        INSERT INTO busca_textos (memoria_id, campo, texto) SELECT new.id, 'lugar', new.lugar WHERE TRIM(COALESCE(new.lugar, '')) <> '';
      END`,
      `CREATE TRIGGER IF NOT EXISTS busca_memoria_sai AFTER DELETE ON memorias BEGIN
        DELETE FROM busca_textos WHERE memoria_id = old.id;
      END`,
      // O relato: o texto, só publicado; com ele, as transcrições dos áudios dele
      `CREATE TRIGGER IF NOT EXISTS busca_relato_entra AFTER INSERT ON relatos BEGIN
        INSERT INTO busca_textos (memoria_id, campo, ref, texto) SELECT new.memoria_id, 'relato', new.id, new.texto WHERE new.situacao = 'publicada' AND TRIM(new.texto) <> '';
        INSERT INTO busca_textos (memoria_id, campo, ref, texto)
          SELECT new.memoria_id, 'audio', a.id, a.transcricao FROM audios a
          WHERE a.relato_id = new.id AND new.situacao = 'publicada' AND a.removido_em IS NULL AND TRIM(COALESCE(a.transcricao, '')) <> '';
      END`,
      `CREATE TRIGGER IF NOT EXISTS busca_relato_muda AFTER UPDATE OF id, memoria_id, texto, situacao ON relatos BEGIN
        DELETE FROM busca_textos WHERE campo = 'relato' AND ref = old.id;
        DELETE FROM busca_textos WHERE campo = 'audio' AND ref IN (SELECT id FROM audios WHERE relato_id IN (old.id, new.id));
        INSERT INTO busca_textos (memoria_id, campo, ref, texto) SELECT new.memoria_id, 'relato', new.id, new.texto WHERE new.situacao = 'publicada' AND TRIM(new.texto) <> '';
        INSERT INTO busca_textos (memoria_id, campo, ref, texto)
          SELECT new.memoria_id, 'audio', a.id, a.transcricao FROM audios a
          WHERE a.relato_id = new.id AND new.situacao = 'publicada' AND a.removido_em IS NULL AND TRIM(COALESCE(a.transcricao, '')) <> '';
      END`,
      `CREATE TRIGGER IF NOT EXISTS busca_relato_sai AFTER DELETE ON relatos BEGIN
        DELETE FROM busca_textos WHERE campo = 'relato' AND ref = old.id;
        DELETE FROM busca_textos WHERE campo = 'audio' AND ref IN (SELECT id FROM audios WHERE relato_id = old.id);
      END`,
      // O áudio: a transcrição, de relato publicado, enquanto não for removido
      `CREATE TRIGGER IF NOT EXISTS busca_audio_entra AFTER INSERT ON audios BEGIN
        INSERT INTO busca_textos (memoria_id, campo, ref, texto)
          SELECT r.memoria_id, 'audio', new.id, new.transcricao FROM relatos r
          WHERE r.id = new.relato_id AND r.situacao = 'publicada' AND new.removido_em IS NULL AND TRIM(COALESCE(new.transcricao, '')) <> '';
      END`,
      `CREATE TRIGGER IF NOT EXISTS busca_audio_muda AFTER UPDATE OF id, relato_id, transcricao, removido_em ON audios BEGIN
        DELETE FROM busca_textos WHERE campo = 'audio' AND ref = old.id;
        INSERT INTO busca_textos (memoria_id, campo, ref, texto)
          SELECT r.memoria_id, 'audio', new.id, new.transcricao FROM relatos r
          WHERE r.id = new.relato_id AND r.situacao = 'publicada' AND new.removido_em IS NULL AND TRIM(COALESCE(new.transcricao, '')) <> '';
      END`,
      `CREATE TRIGGER IF NOT EXISTS busca_audio_sai AFTER DELETE ON audios BEGIN
        DELETE FROM busca_textos WHERE campo = 'audio' AND ref = old.id;
      END`,
      // A foto: a legenda, enquanto estiver na memória e não for removida
      `CREATE TRIGGER IF NOT EXISTS busca_foto_entra AFTER INSERT ON fotos BEGIN
        INSERT INTO busca_textos (memoria_id, campo, ref, texto)
          SELECT new.memoria_id, 'legenda', new.id, new.legenda WHERE new.memoria_id IS NOT NULL AND new.removida_em IS NULL AND TRIM(COALESCE(new.legenda, '')) <> '';
      END`,
      `CREATE TRIGGER IF NOT EXISTS busca_foto_muda AFTER UPDATE OF id, memoria_id, legenda, removida_em ON fotos BEGIN
        DELETE FROM busca_textos WHERE campo = 'legenda' AND ref = old.id;
        INSERT INTO busca_textos (memoria_id, campo, ref, texto)
          SELECT new.memoria_id, 'legenda', new.id, new.legenda WHERE new.memoria_id IS NOT NULL AND new.removida_em IS NULL AND TRIM(COALESCE(new.legenda, '')) <> '';
      END`,
      `CREATE TRIGGER IF NOT EXISTS busca_foto_sai AFTER DELETE ON fotos BEGIN
        DELETE FROM busca_textos WHERE campo = 'legenda' AND ref = old.id;
      END`,
      // O que já existe
      `INSERT INTO busca_textos (memoria_id, campo, texto) SELECT id, 'titulo', titulo FROM memorias WHERE TRIM(titulo) <> ''`,
      `INSERT INTO busca_textos (memoria_id, campo, texto) SELECT id, 'lugar', lugar FROM memorias WHERE TRIM(COALESCE(lugar, '')) <> ''`,
      `INSERT INTO busca_textos (memoria_id, campo, ref, texto) SELECT memoria_id, 'relato', id, texto FROM relatos WHERE situacao = 'publicada' AND TRIM(texto) <> ''`,
      `INSERT INTO busca_textos (memoria_id, campo, ref, texto)
        SELECT r.memoria_id, 'audio', a.id, a.transcricao FROM audios a JOIN relatos r ON r.id = a.relato_id
        WHERE r.situacao = 'publicada' AND a.removido_em IS NULL AND TRIM(COALESCE(a.transcricao, '')) <> ''`,
      `INSERT INTO busca_textos (memoria_id, campo, ref, texto)
        SELECT memoria_id, 'legenda', id, legenda FROM fotos WHERE memoria_id IS NOT NULL AND removida_em IS NULL AND TRIM(COALESCE(legenda, '')) <> ''`,
    ],
  },
];

// A guarda por pedido conhece os gatilhos que gravam pelo SQL das migrações (ver ambiente.ts)
cobrirGatilhosQueGravam(MIGRACOES.flatMap((m) => m.sql));
// E sabe que os gatilhos da marca da cópia, criados fora das migrações, gravam nela a partir de toda tabela
cobrirGravacaoEmTodaTabela(TABELA_DA_MARCA);

// Uma preparação por banco: a homologação tem o dela
const prontos = new Map<string, Promise<void>>();

/** Garante que o banco do pedido está na estrutura atual. Barato depois da primeira vez. */
export function prepararBanco(): Promise<void> {
  const qual = ambiente();
  let pronto = prontos.get(qual);
  if (!pronto) {
    pronto = migrar(banco()).catch((erro) => {
      prontos.delete(qual);
      throw erro;
    });
    prontos.set(qual, pronto);
  }
  return pronto;
}

async function migrar(db: D1Database): Promise<void> {
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

  // A homologação volta às fotos de exemplo nos retratos, uma vez só (ver retratos-da-homologacao.ts)
  await consertarRetratosDaHomologacao(db);

  // Memórias de exemplo só existem nas prévias e no computador. Nunca na produção, e nunca na
  // homologação, que recebe a estrutura espelhada da produção (ver espelho.ts).
  if (AMBIENTES_COM_EXEMPLOS.includes(ambiente())) {
    await semearExemplos(db);
    await semearParentesDeExemplo(db);
    await semearAcervoDeExemplo(db);
    await semearConsideracoesDeExemplo(db);
    await semearCasaisDoCoracaoDeExemplo(db);
    await semearDeQuemDeExemplo(db);
    await semearAniversariosDeExemplo(db);
    await semearDiaDosCapitulosDeExemplo(db);
    await semearNascimentoDaElizeteDeExemplo(db);
    await semearCartaDeExemplo(db);
    await semearTiposDeExemplo(db);
    // A regra da sala (aplicação da E1): um Natal restrito a uma família, que a TV da sala nunca mostra
    await semearCeiaRestritaDeExemplo(db);
    // Os exemplos entram como membros (é o padrão da tabela), mas ninguém deles acessa o site: são parentes
    await db.prepare(`UPDATE nucleo_membros SET papel = 'parente' WHERE papel = 'membro' AND integrante_id LIKE 'ex-%'`).run();
    // Fotos e retratos de exemplo: o Chico e a Karol. E a limpeza do que as prévias enviaram há mais de 7 dias.
    await semearFotosDeExemplo(db);
    // Áudios de exemplo, de voz sintetizada, nos relatos da Vó Bela e da Vó Vivica
    await semearAudiosDeExemplo(db);
    // Avisos de exemplo, para o "Ver como" mostrar a lista, o número no retrato e a conta
    await semearAvisosDeExemplo(db);
    await semearPedidoDeExemplo(db);
    await semearRascunhoQueFicouDeExemplo(db);
    await limparBucketDeTeste(db);
  }

  // Os gatilhos da marca da cópia em toda tabela, inclusive as criadas agora pelos exemplos (marca-da-copia.ts)
  await garantirGatilhosDaMarca(db);

  // O relato como conversa: os relatos sem mensagens ganham as derivadas deles, sem perda (ver
  // mensagens-de-antes.ts). Depois das migrações e dos exemplos, para pegar também os semeados agora.
  await darMensagensAosRelatosDeAntes(db);
}
