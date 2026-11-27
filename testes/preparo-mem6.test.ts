import { describe, expect, it, vi } from 'vitest';
import { temSqlite } from './apoio/d1';
const env = vi.hoisted(() => ({ AMBIENTE: 'previa', DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => {}, put: async () => {}, get: async () => null, head: async () => null };

describe.skipIf(!(await temSqlite()))('MEM-6: preparo e leitura da ficha', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const d1 = await criarD1();
  env.DB = d1;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  const repo = await import('../src/lib/servidor/repositorio');

  it('as três primeiras idas estão num lote, inclusive no banco vazio', async () => {
    const lote = vi.spyOn(d1, 'batch');
    await prepararBanco();
    const comandos = lote.mock.calls[0][0] as unknown as { sql: string }[];
    expect(comandos.map((c) => c.sql)).toEqual([
      `CREATE TABLE IF NOT EXISTS _migracoes (id TEXT PRIMARY KEY, aplicada_em TEXT NOT NULL DEFAULT (datetime('now')))`,
      'SELECT id FROM _migracoes',
      `SELECT type, name FROM sqlite_master WHERE type IN ('table', 'trigger')`,
    ]);
    lote.mockRestore();
  });

  it('a lista comum não traz Sobre/foto; a ficha e a versão anterior preservam o texto', async () => {
    d1.sqlite.prepare(`UPDATE integrantes SET sobre = 'Uma história que precisa ficar.' WHERE id = 'gui'`).run();
    const leitura = vi.spyOn(d1, 'prepare');
    const gui = (await repo.listarIntegrantes()).find((i) => i.id === 'gui')!;
    const consulta = leitura.mock.calls.find(([s]) => s.includes('FROM integrantes WHERE excluida_em IS NULL'))![0];
    expect(consulta).not.toMatch(/SELECT \*|\bsobre\b|\bfoto\b/);
    expect(gui.sobre).toBeNull();
    await repo.lerSobreDaPessoa(gui);
    expect(gui.sobre).toBe('Uma história que precisa ficar.');
    await repo.atualizarIntegrante(gui, { nome: gui.nome, tipo: gui.tipo, tratamento: gui.tratamento, sobre: 'A nova história.' }, { pessoa: 'gui', nome: gui.nome, admin: true, nucleos: gui.nucleos });
    const versao = d1.sqlite.prepare(`SELECT dados FROM versoes WHERE tipo = 'integrante' AND item_id = 'gui' ORDER BY id DESC LIMIT 1`).get() as { dados: string };
    expect(JSON.parse(versao.dados).sobre).toBe('Uma história que precisa ficar.');
    leitura.mockRestore();
  });
});
