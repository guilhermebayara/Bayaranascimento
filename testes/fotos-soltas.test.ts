// Fotos sem memória há mais de 30 dias (onda 2, decisão do Gui de 17/11/2026): nada se apaga sozinho. O
// administrador confere a lista em Administração, com quem enviou, e apaga uma por vez. É a única rota
// que apaga um arquivo do bucket das fotos de verdade, e a guarda da produção só abre esta. Testado com a
// rota de verdade (src/pages/api/fotos-soltas.ts) sobre o banco SQLite em memória.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const apagados: string[] = [];
const env = vi.hoisted(() => ({ AMBIENTE: 'producao' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async (chave: string) => void apagados.push(chave), put: async () => undefined, get: async () => null, head: async () => null };

describe('a guarda da produção abre só a rota das fotos soltas', () => {
  const guarda = readFileSync('scripts/confere-producao.mjs', 'utf-8');
  it('a exceção é um arquivo só, com a foto conferida de novo e só para administradores', () => {
    expect(guarda).toContain("const ROTA_DAS_FOTOS_SOLTAS = 'src/pages/api/fotos-soltas.ts';");
    expect(guarda).toContain("uso[0] === 'bucketDeFotos().delete('");
    expect(guarda).toMatch(/podeApagarFotoSolta/);
    const rota = readFileSync('src/pages/api/fotos-soltas.ts', 'utf-8');
    expect(rota.match(/\.delete\(/g)).toHaveLength(1);
  });
  it('a regra da foto solta deixa de fora as de exemplo e espera 30 dias', () => {
    const repo = readFileSync('src/lib/servidor/repositorio.ts', 'utf-8');
    const regra = /const FOTO_SOLTA = `([\s\S]*?)`;/.exec(repo)![1];
    expect(regra).toContain("NOT LIKE 'exemplos/%'");
    expect(repo).toContain('export const DIAS_DA_FOTO_SOLTA = 30;');
  });
});

describe.skipIf(!comSqlite)('fotos sem memória no banco e na rota', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const rota = await import('../src/pages/api/fotos-soltas');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const sql = (texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...v);
  const linha = <T>(texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...v) as T;
  const gui: Usuario = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };
  const elizete: Usuario = { pessoa: 'elizete', nome: 'Elizete', admin: false, nucleos: ['bayara-nascimento'] };
  const pedir = async (quem: Usuario, foto: number) => {
    const f = new FormData();
    f.set('acao', 'apagar');
    f.set('foto', String(foto));
    const request = new Request('http://localhost/api/fotos-soltas', { method: 'POST', headers: { Origin: 'http://localhost' }, body: f });
    const r = await rota.POST({ request, locals: { usuario: quem } } as never);
    return decodeURIComponent((r.headers.get('Location') ?? '').replace(/\+/g, ' '));
  };
  const foto = (chave: string, dias: number, memoria: string | null = null) => {
    sql(`INSERT INTO fotos (memoria_id, chave, enviada_por, enviada_em) VALUES (?, ?, 'elizete', datetime('now', ?))`, memoria, chave, `-${dias} days`);
    return linha<{ id: number }>('SELECT id FROM fotos WHERE chave = ?', chave).id;
  };
  sql(`INSERT INTO memorias (id, titulo, ano, tipo, situacao, criada_por) VALUES ('t-m', 'Uma', 2000, 'festa', 'publicada', 'gui')`);
  const velha = foto('2025/aaaaaaaa-0000-0000-0000-000000000001.jpg', 40);
  const nova = foto('2026/aaaaaaaa-0000-0000-0000-000000000002.jpg', 5);
  const presa = foto('2025/aaaaaaaa-0000-0000-0000-000000000003.jpg', 40, 't-m');
  const exemplo = foto('exemplos/chico-1.jpg', 400);

  it('só entram as fotos sem memória e sem relato há mais de 30 dias, fora as de exemplo', async () => {
    expect((await repo.listarFotosSoltas()).map((f) => f.id)).toEqual([velha]);
    expect(await repo.contarFotosSoltas()).toBe(1);
  });

  it('o administrador vê a foto solta para conferir; quem não administra, não', async () => {
    expect(await repo.podeVerFoto(gui, '2025/aaaaaaaa-0000-0000-0000-000000000001.jpg')).toBe(true);
    expect(await repo.podeVerFoto({ ...elizete, pessoa: 'giovanna' }, '2025/aaaaaaaa-0000-0000-0000-000000000001.jpg')).toBe(false);
    // A foto solta recente continua só de quem enviou
    expect(await repo.podeVerFoto(gui, '2026/aaaaaaaa-0000-0000-0000-000000000002.jpg')).toBe(false);
  });

  it('quem não administra não apaga', async () => {
    expect(await pedir(elizete, velha)).toContain('Só os administradores');
    expect(apagados).toEqual([]);
  });

  it('a foto recente, a presa a uma memória e a de exemplo não são apagadas', async () => {
    for (const id of [nova, presa, exemplo]) expect(await pedir(gui, id)).toContain('Foto não encontrada');
    expect(apagados).toEqual([]);
    expect(linha<{ n: number }>('SELECT COUNT(*) AS n FROM fotos').n).toBeGreaterThanOrEqual(4);
  });

  it('o administrador apaga a foto solta: o arquivo sai do bucket e o registro some', async () => {
    expect(await pedir(gui, velha)).toContain('Foto apagada.');
    expect(apagados).toEqual(['2025/aaaaaaaa-0000-0000-0000-000000000001.jpg']);
    expect(linha('SELECT id FROM fotos WHERE id = ?', velha)).toBeUndefined();
  });
});
