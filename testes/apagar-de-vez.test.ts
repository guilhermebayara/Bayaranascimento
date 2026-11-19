// Apagar de vez o que está na lixeira (decisão do Gui, 17/11/2026, onda 2): só os administradores, item
// a item, com confirmação, e só o que eles veem na lixeira. Nada some sozinho. Testado com a rota de
// verdade (src/pages/api/lixeira.ts) sobre o banco SQLite em memória.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { podeApagarDeVez } from '../src/lib/servidor/permissoes';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe('quem apaga de vez', () => {
  it('só os administradores, e só o que está na lixeira', () => {
    const u = (admin: boolean) => ({ pessoa: 'x', nome: 'x', admin, nucleos: [] });
    expect(podeApagarDeVez(u(true), { naLixeira: true }).ok).toBe(true);
    expect(podeApagarDeVez(u(false), { naLixeira: true }).ok).toBe(false);
    expect(podeApagarDeVez(u(true), { naLixeira: false }).ok).toBe(false);
  });
  it('a lixeira pede confirmação antes, e só os administradores veem o botão', () => {
    const pagina = readFileSync('src/pages/lixeira.astro', 'utf-8');
    expect(pagina).toMatch(/usuario\.admin && \([\s\S]*?<ConfirmarRemocao[\s\S]*?acao="apagar-de-vez"/);
    expect(pagina).toContain('acao="apagar-capitulo-de-vez"');
  });
  it('nada apaga sozinho: só a rota da lixeira chama o apagar de vez', () => {
    for (const arquivo of ['src/lib/servidor/banco.ts', 'src/lib/servidor/semente.ts', 'src/middleware.ts']) {
      expect(readFileSync(arquivo, 'utf-8')).not.toMatch(/apagar(Memoria|Capitulo)DeVez/);
    }
  });
});

describe.skipIf(!comSqlite)('apagar de vez no banco', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const lixeira = await import('../src/pages/api/lixeira');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const sql = (texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...v);
  const linha = <T>(texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...v) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const [gui, elizete, magno] = ['gui', 'elizete', 'lucas-magno'].map(usuarioDe);
  const tipos = await repo.listarTipos();
  const pedir = async (quem: Usuario, campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    const request = new Request('http://localhost/api/lixeira', { method: 'POST', headers: { Origin: 'http://localhost' }, body: f });
    const r = await lixeira.POST({ request, locals: { usuario: quem, tipos } } as never);
    return decodeURIComponent((r.headers.get('Location') ?? '').replace(/\+/g, ' '));
  };

  // Uma memória na lixeira, aberta a todos, com relato, foto, áudio, versão e aviso; e outra só da família Bayara
  sql(`INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por, excluida_em, excluida_por) VALUES ('t-lixo', 'Festa velha', 1999, 'festa', 'todos', 'publicada', 'elizete', datetime('now'), 'gui')`);
  sql(`INSERT INTO memoria_integrantes VALUES ('t-lixo', 'elizete')`);
  sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto) VALUES ('t-lixo', 'elizete', 'elizete', 'Lembro de tudo')`);
  const relato = linha<{ id: number }>(`SELECT id FROM relatos WHERE memoria_id = 't-lixo'`).id;
  sql(`INSERT INTO fotos (memoria_id, relato_id, chave, legenda, enviada_por) VALUES ('t-lixo', ?, '2026/lixo.jpg', 'a mesa', 'elizete')`, relato);
  sql(`INSERT INTO audios (relato_id, memoria_id, chave, tipo, tamanho, transcricao, enviado_por) VALUES (?, 't-lixo', 'audios/lixo.m4a', 'audio/mp4', 10, 'oi', 'elizete')`, relato);
  sql(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('memoria', 't-lixo', '{"titulo":"Festa"}', 'elizete'), ('relato', ?, '{"texto":"x"}', 'elizete')`, String(relato));
  sql(`INSERT INTO avisos (para, tipo, memoria_id, de) VALUES ('gui', 'quem-estava', 't-lixo', 'elizete')`);
  sql(`INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por, excluida_em) VALUES ('t-lixo-bayara', 'Só Bayara', 1999, 'festa', 'nucleos', 'publicada', 'elizete', datetime('now'))`);
  sql(`INSERT INTO memoria_nucleos VALUES ('t-lixo-bayara', 'bayara-nascimento')`);

  it('quem não administra não apaga, e nada muda', async () => {
    expect(await pedir(elizete, { acao: 'apagar-de-vez', memoria: 't-lixo' })).toContain('Só os administradores');
    expect(linha(`SELECT id FROM memorias WHERE id = 't-lixo'`)).toBeDefined();
  });

  it('o administrador que não vê a memória recebe o mesmo que para uma que não existe', async () => {
    expect(await pedir(magno, { acao: 'apagar-de-vez', memoria: 't-lixo-bayara' })).toContain('Memória não encontrada na lixeira.');
    expect(await pedir(magno, { acao: 'apagar-de-vez', memoria: 'nao-existe' })).toContain('Memória não encontrada na lixeira.');
    expect(linha(`SELECT id FROM memorias WHERE id = 't-lixo-bayara'`)).toBeDefined();
  });

  it('uma memória fora da lixeira não é apagada de vez', async () => {
    sql(`INSERT INTO memorias (id, titulo, ano, tipo, situacao, criada_por) VALUES ('t-viva', 'Viva', 2000, 'festa', 'publicada', 'gui')`);
    expect(await pedir(gui, { acao: 'apagar-de-vez', memoria: 't-viva' })).toContain('não encontrada');
    expect(linha(`SELECT id FROM memorias WHERE id = 't-viva'`)).toBeDefined();
  });

  it('o administrador apaga de vez: some a ficha, o relato, o histórico e o aviso; foto e áudio ficam soltos, sem texto', async () => {
    expect(await pedir(gui, { acao: 'apagar-de-vez', memoria: 't-lixo' })).toContain('foi apagada de vez');
    expect(linha(`SELECT id FROM memorias WHERE id = 't-lixo'`)).toBeUndefined();
    expect(linha(`SELECT id FROM relatos WHERE memoria_id = 't-lixo'`)).toBeUndefined();
    expect(linha(`SELECT id FROM versoes WHERE item_id IN ('t-lixo', ?)`, String(relato))).toBeUndefined();
    expect(linha(`SELECT id FROM avisos WHERE memoria_id = 't-lixo'`)).toBeUndefined();
    expect(linha(`SELECT memoria_id, relato_id, legenda FROM fotos WHERE chave = '2026/lixo.jpg'`)).toEqual({ memoria_id: null, relato_id: null, legenda: null });
    expect(linha(`SELECT transcricao, relato_id FROM audios WHERE chave = 'audios/lixo.m4a'`)).toEqual({ transcricao: null, relato_id: null });
    expect(linha(`SELECT tipo, item_id, por FROM apagados_de_vez`)).toEqual({ tipo: 'memoria', item_id: 't-lixo', por: 'gui' });
  });

  it('o capítulo na lixeira é apagado de vez, e os de dentro ficam soltos', async () => {
    sql(`INSERT INTO capitulos (id, titulo, criado_por, excluido_em) VALUES ('t-cap', 'Velho', 'gui', datetime('now'))`);
    sql(`INSERT INTO capitulos (id, titulo, criado_por, pai_id) VALUES ('t-cap-filho', 'Filho', 'gui', 't-cap')`);
    expect(await pedir(elizete, { acao: 'apagar-capitulo-de-vez', capitulo: 't-cap' })).toContain('Só os administradores');
    expect(await pedir(gui, { acao: 'apagar-capitulo-de-vez', capitulo: 't-cap' })).toContain('apagado de vez');
    expect(linha(`SELECT id FROM capitulos WHERE id = 't-cap'`)).toBeUndefined();
    expect(linha<{ pai_id: string | null }>(`SELECT pai_id FROM capitulos WHERE id = 't-cap-filho'`).pai_id).toBeNull();
  });
});
