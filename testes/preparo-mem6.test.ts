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
  const { darMensagensAosRelatosDeAntes, MARCA_DAS_MENSAGENS_DE_ANTES } = await import('../src/lib/servidor/mensagens-de-antes');

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

  it('com a marca pronta só consulta a marca; o espelho pode refazer todos os lotes', async () => {
    const leitura = vi.spyOn(d1, 'prepare');
    expect(await darMensagensAosRelatosDeAntes(d1 as never)).toBe(0);
    expect(leitura.mock.calls.map(([sql]) => sql)).toEqual(["SELECT 1 FROM ajustes WHERE chave = ? AND json_extract(valor, '$.versao') = 2"]);
    leitura.mockRestore();
    // Mais de um lote, e relatos vazios: não podem prender o conserto nos primeiros 500 para sempre.
    for (let n = 0; n < 502; n++) {
      d1.sqlite.prepare(`INSERT INTO memorias (id, titulo, ano, tipo, criada_por) VALUES (?, 'Teste do preparo', 2026, 'outro', 'gui')`).run(`mem6-preparo-${n}`);
      d1.sqlite.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, 'gui', 'gui', ?, 'rascunho')`).run(`mem6-preparo-${n}`, n === 501 ? 'O último lote.' : '');
    }
    const ultimo = (d1.sqlite.prepare('SELECT MAX(id) AS id FROM relatos').get() as { id: number }).id;
    expect(await darMensagensAosRelatosDeAntes(d1 as never, { refazer: true })).toBe(1);
    expect(d1.sqlite.prepare('SELECT texto FROM relato_mensagens WHERE relato_id = ?').get(ultimo)).toEqual({ texto: 'O último lote.' });
    expect(await darMensagensAosRelatosDeAntes(d1 as never)).toBe(0);
  });

  it('uma falha não deixa a marca de conserto concluído', async () => {
    d1.sqlite.prepare(`INSERT INTO memorias (id, titulo, ano, tipo, criada_por) VALUES ('mem6-falha', 'Teste da falha', 2026, 'outro', 'gui')`).run();
    d1.sqlite.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES ('mem6-falha', 'gui', 'gui', 'Tente novamente.', 'rascunho')`).run();
    const lote = vi.spyOn(d1, 'batch').mockRejectedValueOnce(new Error('Falha simulada.'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await darMensagensAosRelatosDeAntes(d1 as never, { refazer: true })).toBe(0);
    expect(d1.sqlite.prepare('SELECT 1 FROM ajustes WHERE chave = ?').get(MARCA_DAS_MENSAGENS_DE_ANTES)).toBeUndefined();
    lote.mockRestore(); log.mockRestore();
    expect(await darMensagensAosRelatosDeAntes(d1 as never)).toBeGreaterThan(0);
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
