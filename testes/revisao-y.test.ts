// Revisão da sessão Y (22/11/2026) do PR #160: os testes que falham hoje. Pelas rotas de verdade, sobre o
// banco SQLite em memória (testes/apoio/d1.ts), como testes/ampliar-relatos.test.ts.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('revisão Y: o que falha no PR #160', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  await (await import('../src/lib/servidor/banco')).prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const rotas = { memorias: await import('../src/pages/api/memorias'), relatos: await import('../src/pages/api/relatos'), avisos: await import('../src/pages/api/avisos'), lixeira: await import('../src/pages/api/lixeira') };
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const tipos = await repo.listarTipos();
  const linhas = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).all(...valores) as T[];
  const usuarioDe = (pessoa: string): Usuario => ({
    pessoa,
    nome: pessoa,
    admin: Boolean(linhas<{ admin: number }>('SELECT admin FROM integrantes WHERE id = ?', pessoa)[0].admin),
    nucleos: linhas<{ n: string }>(`SELECT nucleo_id AS n FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((l) => l.n),
  });
  // Gui e Elizete: Bayara Nascimento. Giovanna: Bayara Nascimento e Bayara Bracarense. Magno e Lúcio: fora da Bayara Nascimento
  const [gui, giovanna, elizete, magno, lucio] = ['gui', 'giovanna', 'elizete', 'lucas-magno', 'lucio'].map(usuarioDe);
  const BN = 'bayara-nascimento';

  const pedir = async (rota: keyof typeof rotas, quem: Usuario, corpo: Record<string, unknown>, comoFormulario = false) => {
    const dados = new FormData();
    if (comoFormulario) for (const [k, v] of Object.entries(corpo)) dados.set(k, String(v));
    const request = new Request(`http://localhost/api/${rota}`, {
      method: 'POST',
      headers: comoFormulario ? { Origin: 'http://localhost' } : { 'Content-Type': 'application/json', Origin: 'http://localhost' },
      body: comoFormulario ? dados : JSON.stringify(corpo),
    });
    const resposta = await rotas[rota].POST({ request, locals: { usuario: quem, tipos } } as never);
    return { status: resposta.status, corpo: comoFormulario ? {} : ((await resposta.json()) as Record<string, unknown>) };
  };
  const relatosDa = (memoria: string) => linhas<{ por: string; so: string | null; conhecido: string | null }>('SELECT por, so_para_nucleos AS so, publico_conhecido AS conhecido FROM relatos WHERE memoria_id = ? ORDER BY id', memoria);
  const pedidosAbertos = (memoria: string) => linhas<{ para: string }>(`SELECT para FROM avisos WHERE tipo = 'liberar-relato' AND memoria_id = ? AND resolvido_em IS NULL ORDER BY id`, memoria).map((p) => p.para);
  const textosQueVe = async (quem: Usuario, memoria: string) => (await repo.listarRelatos(quem, memoria)).map((r) => r.texto);

  /** Uma memória só da Bayara Nascimento, com um relato de `autor`, que quem criou abre para todos: o relato espera */
  async function memoriaQueEspera(criadora: Usuario, pessoas: string[], autor: Usuario, texto: string) {
    const base = { titulo: `Espera de ${autor.pessoa}`, ano: 2014, tipo: 'causo', pessoas, visibilidade: 'nucleos', nucleos: [BN] };
    const id = (await pedir('memorias', criadora, base)).corpo.id as string;
    await pedir('relatos', autor, { memoria: id, por: autor.pessoa, texto });
    expect((await pedir('memorias', criadora, { ...base, id, visibilidade: 'todos' })).corpo.esperam).toEqual([autor.pessoa]);
    return { id, aberta: { ...base, id, visibilidade: 'todos' } };
  }

  it('P3: quem respondeu "Manter como estava" corrige o lugar da memória, e o relato continua esperando', async () => {
    const texto = 'A Elizete contou só para a família.';
    const { id, aberta } = await memoriaQueEspera(giovanna, ['giovanna', 'elizete'], elizete, texto);
    const relato = linhas<{ id: number }>('SELECT id FROM relatos WHERE memoria_id = ?', id)[0].id;
    await pedir('avisos', elizete, { relato: relato, resposta: 'manter' }, true);
    expect(await textosQueVe(magno, id)).toEqual([]);
    // A Elizete está em "Quem estava" e corrige só o lugar. Quem vê continua igual
    expect((await pedir('memorias', elizete, { ...aberta, lugar: 'Ouro Preto' })).status).toBe(200);
    expect(relatosDa(id)[0].so).toBe(JSON.stringify([BN]));
    expect(await textosQueVe(magno, id)).toEqual([]);
  });

  it('P3, item 10: quem é citada e tem um relato que espera marca uma família na memória aberta a todos, e o pedido continua na lista', async () => {
    const { id, aberta } = await memoriaQueEspera(giovanna, ['giovanna', 'elizete'], elizete, 'A Elizete ainda não respondeu.');
    // A Giovanna, que criou, tira a marca da família (a memória continua aberta a todos); a Elizete marca de novo
    expect((await pedir('memorias', giovanna, { ...aberta, nucleos: [] })).status).toBe(200);
    expect(pedidosAbertos(id)).toEqual(['elizete']);
    expect((await pedir('memorias', elizete, { ...aberta, nucleos: [BN] })).status).toBe(200);
    expect(pedidosAbertos(id)).toEqual(['elizete']);
    expect(await textosQueVe(lucio, id)).toEqual([]);
  });

  it('P3: a administradora que corrige só os dados não libera os relatos que ela registrou', async () => {
    // A memória é do Gui; a Giovanna vê, não está nela, e registrou o próprio relato e o da Vó Bela
    const base = { titulo: 'Espera da Giovanna', ano: 2015, tipo: 'causo', pessoas: ['gui'], visibilidade: 'nucleos', nucleos: [BN] };
    const id = (await pedir('memorias', gui, base)).corpo.id as string;
    await pedir('relatos', giovanna, { memoria: id, por: 'giovanna', texto: 'A Giovanna contou só para a família.' });
    await pedir('relatos', giovanna, { memoria: id, por: 'vo-bela', texto: 'A Vó Bela, pela Giovanna.' });
    await pedir('memorias', gui, { ...base, id, visibilidade: 'todos' });
    expect(pedidosAbertos(id)).toEqual(['giovanna', 'giovanna']);
    expect((await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos', ano: 2016 })).status).toBe(200);
    expect(pedidosAbertos(id)).toEqual(['giovanna', 'giovanna']);
    expect(await textosQueVe(lucio, id)).toEqual([]);
  });

  it('P3, item 10: uma correção que não muda quem vê não grava nada nos relatos', async () => {
    const { id, aberta } = await memoriaQueEspera(gui, ['gui', 'giovanna'], elizete, 'Da Elizete.');
    await pedir('relatos', magno, { memoria: id, por: 'lucas-magno', texto: 'Do Magno, com a memória já aberta.' });
    const antes = JSON.stringify(relatosDa(id));
    // A Giovanna, citada, marca a família Bayara Bracarense numa memória aberta a todos
    expect((await pedir('memorias', giovanna, { ...aberta, nucleos: [BN, 'bayara-bracarense'] })).status).toBe(200);
    expect(JSON.stringify(relatosDa(id))).toBe(antes);
  });

  it('P4, itens 18 e 19: o rascunho de relato que está na lixeira não ganha pedido para liberar', async () => {
    // Memória da Giovanna, só da Bayara Nascimento. O Gui começa o relato do Aguilar, a Elizete publica o dela, o Gui descarta o rascunho
    const base = { titulo: 'Rascunho na lixeira', ano: 2016, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: [BN] };
    const id = (await pedir('memorias', giovanna, base)).corpo.id as string;
    await pedir('relatos', gui, { memoria: id, por: 'aguilar', texto: 'Rascunho do Gui.', situacao: 'rascunho' });
    await pedir('relatos', elizete, { memoria: id, por: 'aguilar', texto: 'Publicado pela Elizete.' });
    await pedir('lixeira', gui, { acao: 'descartar-relato', memoria: id, por: 'aguilar' }, true);
    expect((await repo.listarRascunhosDeRelatoDescartados(gui)).length).toBe(1);
    // A Giovanna abre a memória para todos
    await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' });
    expect((await repo.listarAvisos(gui)).filter((a) => a.memoriaId === id && a.tipo === 'liberar-relato')).toEqual([]);
    expect(pedidosAbertos(id)).toEqual(['elizete']);
  });
});
