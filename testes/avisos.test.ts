// Avisos dentro do site (docs/decisoes.md, "Avisos"; regras em src/lib/avisos.ts). Testado com as rotas de
// verdade (src/pages/api/memorias.ts e src/pages/api/relatos.ts) e as consultas do repositório, sobre o
// banco SQLite em memória com o acervo de exemplo (testes/apoio/d1.ts). O que importa aqui é que nenhum
// aviso conte a alguém o que ela não vê: nem a memória, nem o relato, nem quem fez.
import { describe, expect, it, vi } from 'vitest';
import { fraseDoAviso, numeroDoRetrato, quemRecebeQuemEstava, quemRecebeRelatoNovo, rotuloDoRetrato, saiAoAbrir } from '../src/lib/avisos';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe('regras dos avisos', () => {
  const todos = { comAcesso: new Set(['gui', 'giovanna', 'elizete', 'lucas-magno']), jaEntraram: new Set(['gui', 'giovanna', 'lucas-magno']), autor: 'giovanna' };

  it('relato novo avisa quem criou e quem estava, menos quem contou, quem registrou, quem nunca entrou e quem não acessa', () => {
    const memoria = { criadaPor: 'gui', integrantes: ['giovanna', 'elizete', 'lucas-magno', 'vo-bela'] };
    expect(quemRecebeRelatoNovo(memoria, { por: 'giovanna', registradoPor: 'giovanna' }, todos).sort()).toEqual(['gui', 'lucas-magno']);
    // Relato registrado em nome de quem não acessa: quem registrou não é avisado do que fez
    expect(quemRecebeRelatoNovo(memoria, { por: 'vo-bela', registradoPor: 'giovanna' }, todos).sort()).toEqual(['gui', 'lucas-magno']);
  });

  it('"Quem estava" avisa só quem entrou agora, nunca quem marcou', () => {
    expect(quemRecebeQuemEstava([], ['gui', 'giovanna', 'lucas-magno'], todos).sort()).toEqual(['gui', 'lucas-magno']);
    expect(quemRecebeQuemEstava(['gui'], ['gui', 'lucas-magno'], todos)).toEqual(['lucas-magno']);
    // A Elizete ainda não entrou no site: o que já existe chega a ela como acervo, não como aviso
    expect(quemRecebeQuemEstava([], ['elizete'], todos)).toEqual([]);
  });

  it('o pedido para liberar só sai com a resposta; os outros, ao abrir', () => {
    expect(saiAoAbrir('liberar-relato')).toBe(false);
    expect(saiAoAbrir('relato-novo')).toBe(true);
    expect(saiAoAbrir('quem-estava')).toBe(true);
  });

  it('as frases dizem quem fez e o quê, do ponto de vista de quem recebe', () => {
    const nome = (id: string) => ({ gui: 'Gui', giovanna: 'Giovanna', 'vo-bela': 'Vó Bela' })[id] ?? id;
    expect(fraseDoAviso({ tipo: 'quem-estava', de: 'gui', titulo: 'Natal', para: 'giovanna' }, nome)).toBe('Gui marcou você em “Natal”.');
    expect(fraseDoAviso({ tipo: 'relato-novo', de: 'gui', titulo: 'Natal', relato: { por: 'gui', registradoPor: 'gui' }, para: 'giovanna' }, nome)).toBe('Gui contou sobre “Natal”.');
    expect(fraseDoAviso({ tipo: 'relato-novo', de: 'gui', titulo: 'Natal', relato: { por: 'vo-bela', registradoPor: 'gui' }, para: 'giovanna' }, nome)).toBe('Gui registrou o relato de Vó Bela em “Natal”.');
  });

  it('o número do retrato é discreto e para em 9+', () => {
    expect(numeroDoRetrato(0)).toBeNull();
    expect(numeroDoRetrato(3)).toBe('3');
    expect(numeroDoRetrato(12)).toBe('9+');
    expect(rotuloDoRetrato('Gui', 0)).toBe('Sua conta, Gui');
    expect(rotuloDoRetrato('Gui', 1)).toBe('Sua conta, Gui, 1 aviso');
  });
});

describe.skipIf(!comSqlite)('avisos no banco e nas rotas', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const memorias = await import('../src/pages/api/memorias');
  const relatos = await import('../src/pages/api/relatos');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const tipos = await repo.listarTipos();

  const sql = (texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...valores);
  const linha = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...valores) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const [gui, giovanna, elizete, magno] = ['gui', 'giovanna', 'elizete', 'lucas-magno'].map(usuarioDe);
  // Só quem já entrou no site recebe avisos (a Elizete entra mais tarde)
  sql('DELETE FROM avisos');
  sql('DELETE FROM acessos');
  for (const p of ['gui', 'giovanna', 'lucas-magno']) await repo.registrarAcesso(p);

  const chamar = async (rota: { POST: unknown }, url: string, quem: Usuario, corpo: Record<string, unknown>) => {
    const request = new Request(`http://localhost${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(corpo) });
    const POST = rota.POST as (c: unknown) => Promise<Response>;
    const resposta = await POST({ request, locals: { usuario: quem, tipos } });
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };
  const novaMemoria = (quem: Usuario, extra: Record<string, unknown>) => chamar(memorias, '/api/memorias', quem, { titulo: 'Almoço de teste', ano: 2003, tipo: 'festa', ...extra });
  const relato = (quem: Usuario, memoria: string, extra: Record<string, unknown> = {}) => chamar(relatos, '/api/relatos', quem, { memoria, por: quem.pessoa, texto: 'Lembro desse dia.', ...extra });
  const tipos_ = async (quem: Usuario, historico = false) => (await repo.listarAvisos(quem, { historico })).map((a) => [a.tipo, a.memoriaId, a.de]);

  it('publicar uma memória avisa quem entrou em "Quem estava" e já entrou no site; o rascunho não avisa ninguém', async () => {
    const rascunho = await novaMemoria(gui, { pessoas: ['giovanna', 'elizete', 'gui'], situacao: 'rascunho' });
    const id = rascunho.corpo.id as string;
    expect(await repo.contarAvisosPendentes(giovanna)).toBe(0);
    await novaMemoria(gui, { id, pessoas: ['giovanna', 'elizete', 'gui'], situacao: 'publicada' });
    expect(await tipos_(giovanna)).toEqual([['quem-estava', id, 'gui']]);
    // Quem marcou não é avisado, e a Elizete ainda não tinha entrado no site
    expect(await tipos_(gui)).toEqual([]);
    expect(await tipos_(elizete)).toEqual([]);
    // Corrigir sem marcar ninguém novo não repete o aviso; marcar o Magno avisa só ele
    await novaMemoria(gui, { id, pessoas: ['giovanna', 'elizete', 'gui', 'lucas-magno'] });
    expect(await repo.contarAvisosPendentes(giovanna)).toBe(1);
    expect(await tipos_(magno)).toEqual([['quem-estava', id, 'gui']]);
  });

  it('abrir a memória tira o aviso da lista, e ele fica no histórico', async () => {
    const [aviso] = await repo.listarAvisos(magno);
    await repo.abrirAvisosDaMemoria(magno, aviso!.memoriaId);
    expect(await repo.contarAvisosPendentes(magno)).toBe(0);
    expect((await repo.listarAvisos(magno, { historico: true })).map((a) => [a.memoriaId, Boolean(a.resolvidoEm)])).toEqual([[aviso!.memoriaId, true]]);
  });

  it('ninguém é avisado de uma memória que não vê: ser citado não dá acesso', async () => {
    // Uma memória só da família Bracarense, com a Elizete marcada: ela não é membro e não vê
    await repo.registrarAcesso('elizete');
    const { corpo } = await novaMemoria(magno, { pessoas: ['elizete', 'giovanna'], visibilidade: 'nucleos', nucleos: ['bracarense'] });
    expect(await tipos_(elizete)).toEqual([]);
    expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM avisos WHERE para = 'elizete' AND memoria_id = ?`, corpo.id as string).n).toBe(0);
  });

  it('relato novo avisa quem criou e quem estava; editar o relato não avisa de novo', async () => {
    const { corpo } = await novaMemoria(giovanna, { pessoas: ['gui', 'lucas-magno'] });
    const id = corpo.id as string;
    await repo.abrirAvisosDaMemoria(gui, id);
    await repo.abrirAvisosDaMemoria(magno, id);
    await relato(magno, id);
    expect((await tipos_(gui)).filter(([, m]) => m === id)).toEqual([['relato-novo', id, 'lucas-magno']]);
    expect((await tipos_(giovanna)).filter(([, m]) => m === id)).toEqual([['relato-novo', id, 'lucas-magno']]);
    expect((await tipos_(magno)).filter(([, m]) => m === id)).toEqual([]);
    await relato(magno, id, { texto: 'Lembro melhor agora.' });
    expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM avisos WHERE tipo = 'relato-novo' AND memoria_id = ?`, id).n).toBe(2);
    // O relato em rascunho não avisa; ao publicar, avisa
    await relato(gui, id, { situacao: 'rascunho' });
    expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM avisos WHERE tipo = 'relato-novo' AND memoria_id = ? AND de = 'gui'`, id).n).toBe(0);
    await relato(gui, id, { situacao: 'publicada' });
    expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM avisos WHERE tipo = 'relato-novo' AND memoria_id = ? AND de = 'gui'`, id).n).toBe(2);
  });

  it('quem deixa de ver a memória deixa de ver o aviso, e o número do retrato acompanha', async () => {
    const { corpo } = await novaMemoria(magno, { pessoas: ['elizete'] });
    const id = corpo.id as string;
    expect((await tipos_(elizete)).filter(([, m]) => m === id)).toEqual([['quem-estava', id, 'lucas-magno']]);
    const antes = await repo.contarAvisosPendentes(elizete);
    // A memória passa a ser só da família Bracarense, de que a Elizete não é membro
    sql(`UPDATE memorias SET visibilidade = 'nucleos' WHERE id = ?`, id);
    sql(`INSERT INTO memoria_nucleos VALUES (?, 'bracarense')`, id);
    expect((await tipos_(elizete)).filter(([, m]) => m === id)).toEqual([]);
    expect((await tipos_(elizete, true)).filter(([, m]) => m === id)).toEqual([]);
    expect(await repo.contarAvisosPendentes(elizete)).toBe(antes - 1);
    // E a memória na lixeira também leva o aviso embora
    const outra = (await novaMemoria(magno, { pessoas: ['elizete'] })).corpo.id as string;
    sql(`UPDATE memorias SET excluida_em = datetime('now') WHERE id = ?`, outra);
    expect((await tipos_(elizete, true)).filter(([, m]) => m === outra)).toEqual([]);
  });

  it('o relato de quem só existe num laço privado de outra pessoa não chega como aviso a quem não a vê', async () => {
    // A Dona Secreta só existe num laço do coração "só eu vejo" do Gui
    sql(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('t-secreta', 'Dona Secreta', 'gui')`);
    sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('gui', 't-secreta', 'amiga', 1)`);
    const { corpo } = await novaMemoria(giovanna, { pessoas: ['gui'] });
    const id = corpo.id as string;
    await relato(gui, id, { por: 't-secreta' });
    // O relato foi registrado, mas a Giovanna, que criou a memória, não vê a Dona Secreta
    expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM avisos WHERE para = 'giovanna' AND memoria_id = ? AND tipo = 'relato-novo'`, id).n).toBe(1);
    expect((await tipos_(giovanna, true)).filter(([, m]) => m === id)).toEqual([]);
    const contagem = await repo.contarAvisosPendentes(giovanna);
    expect(contagem).toBe((await repo.listarAvisos(giovanna)).length);
  });
});
