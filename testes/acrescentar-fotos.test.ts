// "Acrescentar fotos" na página da memória (resposta do Gui ao PR #51, 17/11/2026): quem vê a memória
// manda fotos sem escrever relato. A foto entra no fim da ordem, sem trocar a principal, e só entram
// fotos soltas que a própria pessoa enviou. Testado com a rota de verdade (src/pages/api/acrescentar-fotos.ts)
// sobre o banco SQLite em memória (testes/apoio/d1.ts).
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('acrescentar fotos', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const rota = await import('../src/pages/api/acrescentar-fotos');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;

  const sql = (texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...valores);
  const linha = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...valores) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const [giovanna, elizete] = ['giovanna', 'elizete'].map(usuarioDe);

  const memoria = (id: string, visibilidade: 'todos' | 'nucleos', situacao = 'publicada') => {
    sql(`INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por) VALUES (?, ?, 2001, 'outro', ?, ?, 'giovanna')`, id, `Teste ${id}`, visibilidade, situacao);
    if (visibilidade === 'nucleos') sql('INSERT INTO memoria_nucleos VALUES (?, ?)', id, 'bracarense');
  };
  memoria('t-com-foto', 'todos');
  memoria('t-sem-foto', 'todos');
  memoria('t-restrita', 'nucleos');
  memoria('t-rascunho', 'todos', 'rascunho');
  sql(`INSERT INTO fotos (memoria_id, chave, principal, ordem, enviada_por) VALUES ('t-com-foto', 'teste/principal.jpg', 1, 0, 'giovanna')`);
  const principal = linha<{ id: number }>(`SELECT id FROM fotos WHERE chave = 'teste/principal.jpg'`).id;

  let numero = 0;
  const solta = (quem: Usuario) => repo.registrarFoto(`teste/${quem.pessoa}-${numero++}.jpg`, quem);
  const foto = (id: number) => linha<{ memoria_id: string | null; relato_id: number | null; principal: number; ordem: number; legenda: string | null }>('SELECT * FROM fotos WHERE id = ?', id);
  const acrescentar = async (quem: Usuario, memoriaId: string, fotos: { id: number; legenda?: string }[]) => {
    const request = new Request('http://localhost/api/acrescentar-fotos', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify({ memoria: memoriaId, fotos }) });
    const resposta = await rota.POST({ request, locals: { usuario: quem } } as unknown as Parameters<typeof rota.POST>[0]);
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };

  it('quem vê a memória acrescenta fotos no fim da ordem, sem trocar a principal e sem relato', async () => {
    const [a, b] = [await solta(elizete), await solta(elizete)];
    const { status, corpo } = await acrescentar(elizete, 't-com-foto', [{ id: a, legenda: 'A mesa' }, { id: b }]);
    expect(status).toBe(200);
    expect(corpo.quantas).toBe(2);
    expect(foto(a)).toMatchObject({ memoria_id: 't-com-foto', relato_id: null, principal: 0, ordem: 1, legenda: 'A mesa' });
    expect(foto(b)).toMatchObject({ memoria_id: 't-com-foto', principal: 0, ordem: 2 });
    expect(foto(principal).principal).toBe(1);
    // Não cria versão no histórico da memória
    expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM versoes WHERE tipo = 'memoria' AND item_id = 't-com-foto'`).n).toBe(0);
  });

  it('numa memória sem foto, a primeira vira a principal', async () => {
    const a = await solta(elizete);
    await acrescentar(elizete, 't-sem-foto', [{ id: a }]);
    expect(foto(a)).toMatchObject({ memoria_id: 't-sem-foto', principal: 1, ordem: 0 });
  });

  it('só entram fotos soltas que a própria pessoa enviou', async () => {
    const daGiovanna = await solta(giovanna);
    expect((await acrescentar(elizete, 't-sem-foto', [{ id: daGiovanna }])).status).toBe(400);
    expect(foto(daGiovanna).memoria_id).toBeNull();
    // Nem foto que já é de outra memória
    expect((await acrescentar(giovanna, 't-sem-foto', [{ id: principal }])).status).toBe(400);
    expect(foto(principal).memoria_id).toBe('t-com-foto');
  });

  it('quem não vê a memória recebe o mesmo que para uma que não existe; rascunho fica com o formulário dele', async () => {
    const a = await solta(elizete);
    expect((await acrescentar(elizete, 't-restrita', [{ id: a }])).status).toBe(404);
    expect((await acrescentar(elizete, 'nao-existe', [{ id: a }])).status).toBe(404);
    expect((await acrescentar(giovanna, 't-rascunho', [{ id: await solta(giovanna) }])).status).toBe(404);
    expect(foto(a).memoria_id).toBeNull();
  });
});
