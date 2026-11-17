// As migrações 019 a 021 (de quem é o capítulo, painel, cor e ícone dos tipos) sobre um banco que já
// existia, como o banco de teste das prévias e o da produção, e o espelho da produção gravando com as
// tabelas novas. Roda as migrações e o espelho de verdade, num SQLite em memória (testes/apoio/d1.ts).
// QA de código de 17/11/2026.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
// Como na produção: só as migrações, sem o acervo de exemplo, sobre o banco que já existia
const env = vi.hoisted(() => ({ AMBIENTE: 'producao' as string, DB: undefined as unknown, FOTOS: undefined as unknown, DB_HOMOLOGA: undefined as unknown, FOTOS_HOMOLOGA: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('migrações novas sobre um banco que já existia', async () => {
  // No pacote publicado, DEV é falso: é o que faz o ambiente ser o do wrangler.jsonc, e não o do computador
  vi.stubEnv('DEV', false);
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { MIGRACOES: migracoes, prepararBanco } = await import('../src/lib/servidor/banco');
  const ate018 = migracoes.slice(0, migracoes.findIndex((m) => m.id.startsWith('019')));

  it('o banco de antes: as migrações até a 018, com um tipo criado pelos administradores e conteúdo publicado', () => {
    expect(ate018.at(-1)!.id).toBe('018-sobrenomes-dos-nucleos');
    banco.sqlite.exec(`CREATE TABLE _migracoes (id TEXT PRIMARY KEY, aplicada_em TEXT NOT NULL DEFAULT (datetime('now')))`);
    for (const m of ate018) {
      for (const comando of m.sql) banco.sqlite.exec(comando);
      banco.sqlite.prepare('INSERT INTO _migracoes (id) VALUES (?)').run(m.id);
    }
    const s = (sql: string, ...v: string[]) => banco.sqlite.prepare(sql).run(...v);
    s(`INSERT INTO tipos (id, rotulo, cor, ordem) VALUES ('mudanca', 'Mudança', '#123456', 99)`);
    s(`INSERT INTO memorias (id, titulo, ano, tipo, criada_por, criada_em) VALUES ('antiga', 'Antiga', 1990, 'festa', 'gui', '2026-11-01 10:00:00')`);
    s(`INSERT INTO memorias (id, titulo, ano, tipo, situacao, criada_por, criada_em) VALUES ('rascunho-antigo', 'Rascunho', 1990, 'festa', 'rascunho', 'gui', '2026-11-02 10:00:00')`);
    s(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, criado_em) VALUES ('antiga', 'gui', 'gui', 'Lembro', '2026-11-03 10:00:00')`);
    s(`INSERT INTO capitulos (id, titulo, modo, inicio_ano, criado_por) VALUES ('epoca-antiga', 'Anos 90', 'epoca', 1990, 'gui')`);
  });

  it('a 019, a 020 e a 021 entram sem erro e não mudam o que já existia', async () => {
    await prepararBanco();
    const um = (sql: string) => banco.sqlite.prepare(sql).get() as Record<string, unknown>;
    const aplicadas = (banco.sqlite.prepare('SELECT id FROM _migracoes ORDER BY id').all() as { id: string }[]).map((m) => m.id);
    expect(aplicadas).toEqual(migracoes.map((m) => m.id).sort());
    // 019: o capítulo por período que já existia continua sendo uma época, de todos
    expect(um(`SELECT COUNT(*) AS n FROM capitulo_pessoas WHERE capitulo_id = 'epoca-antiga'`).n).toBe(0);
    expect(um(`SELECT COUNT(*) AS n FROM capitulo_familias WHERE capitulo_id = 'epoca-antiga'`).n).toBe(0);
    // 020: o que já estava publicado ganha a data de criação; o rascunho fica sem
    expect(um(`SELECT publicada_em FROM memorias WHERE id = 'antiga'`).publicada_em).toBe('2026-11-01 10:00:00');
    expect(um(`SELECT publicada_em FROM memorias WHERE id = 'rascunho-antigo'`).publicada_em).toBeNull();
    expect(um(`SELECT publicado_em FROM relatos WHERE memoria_id = 'antiga'`).publicado_em).toBe('2026-11-03 10:00:00');
    // 021: os tipos de sempre ganham a cor e o rabisco de antes; o criado pelos administradores fica sem escolha
    expect(um(`SELECT cor_da_paleta, icone FROM tipos WHERE id = 'festa'`)).toEqual({ cor_da_paleta: 'coral', icone: 'festa' });
    expect(um(`SELECT cor_da_paleta, icone, cor FROM tipos WHERE id = 'mudanca'`)).toEqual({ cor_da_paleta: null, icone: null, cor: '#123456' });
  });

  it('rodar de novo não faz nada', async () => {
    const antes = banco.sqlite.prepare('SELECT COUNT(*) AS n FROM memorias').get();
    await prepararBanco();
    expect(banco.sqlite.prepare('SELECT COUNT(*) AS n FROM memorias').get()).toEqual(antes);
  });

  it('o espelho da produção grava com as tabelas novas, e o site lê o banco espelhado', async () => {
    // Um capítulo por período de alguém, para a tabela nova ter linha a apagar
    banco.sqlite.prepare(`INSERT INTO capitulo_pessoas (capitulo_id, integrante_id) VALUES ('epoca-antiga', 'gui')`).run();
    banco.sqlite.prepare(`INSERT INTO capitulo_familias (capitulo_id, nucleo_id) VALUES ('epoca-antiga', 'bayara-nascimento')`).run();
    const { montarCopia } = await import('../src/lib/servidor/copia');
    const { gravarEspelho } = await import('../src/lib/servidor/espelho');
    const { noPedido } = await import('../src/lib/servidor/ambiente');
    const copia = await montarCopia();
    expect(copia.tabelas.capitulo_pessoas!.length).toBeGreaterThan(0);
    // Fora da homologação, o espelho é recusado
    await expect(gravarEspelho(copia as never)).rejects.toThrow('só pode ser gravado na homologação');
    // Na homologação, o banco dela é este mesmo, para o teste ler o resultado
    env.DB_HOMOLOGA = banco;
    env.FOTOS_HOMOLOGA = env.FOTOS;
    const resumo = await noPedido(new Request('https://homologa.memorias.bayara.com.br/admin/espelho'), () => gravarEspelho(copia as never));
    expect(resumo.memorias).toBeGreaterThan(0);
    const conta = (tabela: string) => (banco.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get() as { n: number }).n;
    // O espelho apaga capítulos e quem é de cada um, e não leva áudio nenhum
    expect([conta('capitulos'), conta('capitulo_pessoas'), conta('capitulo_familias'), conta('audios')]).toEqual([0, 0, 0, 0]);
    // As chaves estrangeiras continuam de pé
    expect(banco.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    const repo = await import('../src/lib/servidor/repositorio');
    const { montarConta } = await import('../src/lib/servidor/conta');
    const gui = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };
    expect((await repo.listarMemorias(gui)).length).toBeGreaterThan(0);
    expect(await repo.listarCapitulos(gui)).toEqual([]);
    expect((await montarConta(gui)).dados?.id).toBe('gui');
  });
});
