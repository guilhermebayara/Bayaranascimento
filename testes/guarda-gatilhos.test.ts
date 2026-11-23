// A guarda por pedido e os gatilhos que gravam (item 3 da revisão R-D1, sessão D1d; src/lib/servidor/ambiente.ts).
//
// Um gatilho que grava em outra tabela muda essa outra sem que a instrução diga. A guarda conhece os gatilhos
// pelo SQL das migrações, e gravar na tabela de origem esquece também as de destino. Regras que não podem falhar:
// - todo gatilho que grava no esquema de verdade está coberto pela guarda (o teste falha com um gatilho novo
//   criado por fora das migrações);
// - o caso da revisão: um gatilho AFTER UPDATE ON tipos que muda nucleos, e listarNucleos lido antes e depois
//   no mesmo pedido, devolve o núcleo já mudado.
// Arquivo próprio porque o gatilho de teste fica coberto até o fim do arquivo (a cobertura é do módulo).
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('a guarda por pedido e os gatilhos que gravam', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco, MIGRACOES } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const ambiente = await import('../src/lib/servidor/ambiente');
  const repositorio = await import('../src/lib/servidor/repositorio');

  const gatilhosDoEsquema = () => (banco.sqlite.prepare(`SELECT sql FROM sqlite_master WHERE type = 'trigger'`).all() as { sql: string }[]).map((g) => g.sql);
  const pedido = <T>(fazer: () => Promise<T>): Promise<T> =>
    ambiente.noPedido(new Request('http://localhost/'), async () => {
      ambiente.definirPessoaDoPedido('gui');
      return fazer();
    });

  it('lê os gatilhos que gravam e os destinos deles', () => {
    const mapa = ambiente.gatilhosQueGravam([
      // O de hoje não grava nada: só recusa
      `CREATE TRIGGER IF NOT EXISTS memorias_versao_confere BEFORE UPDATE OF versao ON memorias
       WHEN NEW.versao <> OLD.versao + 1
       BEGIN SELECT RAISE(ABORT, 'memoria-mudou'); END`,
      `CREATE TRIGGER a AFTER UPDATE ON tipos BEGIN UPDATE nucleos SET nome = nome; INSERT INTO avisos (tipo) VALUES ('x'); END`,
      `CREATE TRIGGER b AFTER INSERT ON relatos BEGIN DELETE FROM envios; END`,
      `CREATE TABLE nada (id TEXT)`,
    ]);
    expect([...mapa.keys()].sort()).toEqual(['relatos', 'tipos']);
    expect([...mapa.get('tipos')!].sort()).toEqual(['avisos', 'nucleos']);
    // Apagar pode levar outras tabelas em cascata: esquece tudo
    expect([...mapa.get('relatos')!]).toEqual(['*']);
  });

  it('todo gatilho que grava no esquema de verdade está coberto pela guarda', () => {
    expect(gatilhosDoEsquema().length).toBeGreaterThan(0);
    expect(ambiente.gatilhosSemCobertura(gatilhosDoEsquema())).toEqual([]);
    // E as migrações são a fonte: tudo o que elas criam está coberto
    expect(ambiente.gatilhosSemCobertura(MIGRACOES.flatMap((m) => m.sql))).toEqual([]);
  });

  it('um gatilho que grava, criado por fora das migrações, faz a conferência do esquema falhar', () => {
    banco.sqlite.exec(`CREATE TRIGGER teste_tipos_mudam_nucleos AFTER UPDATE ON tipos BEGIN UPDATE nucleos SET nome = nome || ' (mudou)' WHERE id = (SELECT id FROM nucleos ORDER BY id LIMIT 1); END`);
    expect(ambiente.gatilhosSemCobertura(gatilhosDoEsquema())).toEqual(['tipos -> nucleos']);
  });

  it('o caso da revisão: o gatilho em tipos muda nucleos, e listarNucleos depois da gravação vem do banco de agora', async () => {
    // O gatilho do teste anterior, agora coberto como uma migração cobriria
    const sql = gatilhosDoEsquema().find((g) => g.includes('teste_tipos_mudam_nucleos'))!;
    ambiente.cobrirGatilhosQueGravam([sql]);
    expect(ambiente.gatilhosSemCobertura(gatilhosDoEsquema())).toEqual([]);

    const tipo = banco.sqlite.prepare('SELECT id, rotulo, cor, icone FROM tipos ORDER BY id LIMIT 1').get() as { id: string; rotulo: string; cor: string; icone: string };
    const primeiro = (banco.sqlite.prepare('SELECT id, nome FROM nucleos ORDER BY id LIMIT 1').get() as { id: string; nome: string });
    await pedido(async () => {
      const antes = await repositorio.listarNucleos();
      expect(antes.find((n) => n.id === primeiro.id)?.nome).toBe(primeiro.nome);
      await repositorio.atualizarTipo(tipo.id, tipo.rotulo, tipo.cor, tipo.icone);
      const depois = await repositorio.listarNucleos();
      expect(depois.find((n) => n.id === primeiro.id)?.nome).toBe(`${primeiro.nome} (mudou)`);
    });
    banco.sqlite.exec('DROP TRIGGER teste_tipos_mudam_nucleos');
    banco.sqlite.prepare('UPDATE nucleos SET nome = ? WHERE id = ?').run(primeiro.nome, primeiro.id);
  });

  it('em cadeia: o gatilho do destino também conta, e um gatilho que apaga esquece tudo', async () => {
    ambiente.cobrirGatilhosQueGravam([
      `CREATE TRIGGER c AFTER UPDATE ON nucleos BEGIN UPDATE integrantes SET nome = nome WHERE 0; END`,
      `CREATE TRIGGER d AFTER UPDATE ON envios BEGIN DELETE FROM avisos WHERE 0; END`,
    ]);
    const tipo = banco.sqlite.prepare('SELECT id, rotulo, cor, icone FROM tipos ORDER BY id LIMIT 1').get() as { id: string; rotulo: string; cor: string; icone: string };
    await pedido(async () => {
      const db = ambiente.banco();
      await repositorio.listarIntegrantes();
      const pessoas = banco.sqlite.prepare('SELECT COUNT(*) AS n FROM integrantes').get() as { n: number };
      // tipos -> nucleos -> integrantes: gravar em tipos faz ler integrantes de novo
      banco.sqlite.prepare(`INSERT INTO integrantes (id, nome, tipo) VALUES ('teste-cadeia', 'Teste da cadeia', 'pessoa')`).run();
      await repositorio.atualizarTipo(tipo.id, tipo.rotulo, tipo.cor, tipo.icone);
      expect((await repositorio.listarIntegrantes()).length).toBe(pessoas.n + 1);
      // envios -> DELETE: uma gravação em envios esquece até o que nada tem a ver com ela
      await repositorio.listarTipos();
      banco.sqlite.prepare(`UPDATE tipos SET rotulo = 'Mudou por fora' WHERE id = ?`).run(tipo.id);
      await db.prepare(`UPDATE envios SET em = em WHERE codigo = 'nenhum'`).run();
      expect((await repositorio.listarTipos()).find((t) => t.id === tipo.id)?.rotulo).toBe('Mudou por fora');
    });
    banco.sqlite.prepare(`DELETE FROM integrantes WHERE id = 'teste-cadeia'`).run();
    banco.sqlite.prepare('UPDATE tipos SET rotulo = ? WHERE id = ?').run(tipo.rotulo, tipo.id);
  });
});
