// Um pedido recusado não deixa nada gravado pela metade (QA de 23/11/2026, sessão U, docs/historico/qa/2026-11-23-relatorio.md). Cada rota que grava
// confere tudo antes de escrever no banco: a pessoa nova de "Quem estava", o tema novo e a memória com um
// relato que não pode ser escrito só são gravados quando o pedido inteiro passa. Testado com as rotas de
// verdade sobre o banco SQLite em memória (testes/apoio/d1.ts).
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('pedido recusado não grava pela metade', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const memorias = await import('../src/pages/api/memorias');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;

  const linha = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...valores) as T;
  const conta = (texto: string, ...valores: (string | number | null)[]) => linha<{ n: number }>(texto, ...valores).n;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const elizete = usuarioDe('elizete');
  const tipos = (banco.sqlite.prepare('SELECT id FROM tipos').all() as { id: string }[]).map((t) => ({ id: t.id }));
  const tipo = tipos[0].id;

  const salvar = async (quem: Usuario, corpo: Record<string, unknown>) => {
    const request = new Request('http://localhost/api/memorias', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(corpo) });
    const resposta = await memorias.POST({ request, locals: { usuario: quem, tipos } } as unknown as Parameters<typeof memorias.POST>[0]);
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };
  const pessoasChamadas = (nome: string) => conta('SELECT COUNT(*) AS n FROM integrantes WHERE nome = ?', nome);
  const temasChamados = (nome: string) => conta('SELECT COUNT(*) AS n FROM temas WHERE nome = ?', nome);
  const memoriasChamadas = (titulo: string) => conta('SELECT COUNT(*) AS n FROM memorias WHERE titulo = ?', titulo);

  it('marcar alguém que não existe recusa sem cadastrar a pessoa nova nem o tema', async () => {
    const r = await salvar(elizete, { titulo: 'Recusada 1', ano: 2020, tipo, pessoas: ['nova:0', 'ninguem-com-este-id'], novasPessoas: [{ nome: 'Pessoa Recusada Um' }], temas: 'Tema Recusado Um' });
    expect(r.status).toBe(400);
    expect(pessoasChamadas('Pessoa Recusada Um')).toBe(0);
    expect(temasChamados('Tema Recusado Um')).toBe(0);
    expect(memoriasChamadas('Recusada 1')).toBe(0);
  });

  it('uma foto que não existe recusa sem cadastrar a pessoa nova', async () => {
    const r = await salvar(elizete, { titulo: 'Recusada 2', ano: 2020, tipo, pessoas: ['nova:0'], novasPessoas: [{ nome: 'Pessoa Recusada Dois' }], fotos: [{ id: 987654 }] });
    expect(r.status).toBe(400);
    expect(pessoasChamadas('Pessoa Recusada Dois')).toBe(0);
  });

  it('o relato em nome de quem acessa o site é recusado antes de a memória ser salva', async () => {
    const r = await salvar(elizete, { titulo: 'Recusada 3', ano: 2020, tipo, pessoas: ['nova:0'], novasPessoas: [{ nome: 'Pessoa Recusada Três' }], temas: 'Tema Recusado Três', relato: { por: 'gui', texto: 'Escrito pela Elizete no lugar do Gui.' } });
    expect(r.status).toBe(403);
    expect(memoriasChamadas('Recusada 3')).toBe(0);
    expect(pessoasChamadas('Pessoa Recusada Três')).toBe(0);
    expect(temasChamados('Tema Recusado Três')).toBe(0);
  });

  it('o mesmo pedido, sem o que era recusado, grava tudo, e a mesma pessoa nova repetida vira uma só', async () => {
    const r = await salvar(elizete, { titulo: 'Aceita', ano: 2020, tipo, pessoas: ['nova:0', 'nova:1'], novasPessoas: [{ nome: 'Pessoa Aceita' }, { nome: 'Pessoa Aceita' }], temas: 'Tema Aceito', relato: { por: 'elizete', texto: 'O meu relato.' } });
    expect(r.status).toBe(201);
    expect(pessoasChamadas('Pessoa Aceita')).toBe(1);
    expect(temasChamados('Tema Aceito')).toBe(1);
    const id = r.corpo.id as string;
    expect(conta('SELECT COUNT(*) AS n FROM memoria_integrantes WHERE memoria_id = ?', id)).toBe(1);
    expect(conta('SELECT COUNT(*) AS n FROM relatos WHERE memoria_id = ? AND por = ?', id, 'elizete')).toBe(1);
  });
});
