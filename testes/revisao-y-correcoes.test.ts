// As correções da revisão Y do PR #160 (22/11/2026) além do gabarito (testes/revisao-y.test.ts): o rascunho
// de relato na lixeira fica parado e volta com o público que a regra dá a ele, o pedido diz o público de
// agora, "Sua conta" conta o rascunho de relato descartado e mudar quem vê grava tudo de uma vez. Pelas
// rotas de verdade, sobre o banco SQLite em memória (testes/apoio/d1.ts).
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import { comPublicoDaPagina } from './apoio/pedido';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('revisão Y: as correções', async () => {
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
  const [gui, giovanna, elizete] = ['gui', 'giovanna', 'elizete'].map(usuarioDe);
  const BN = 'bayara-nascimento';

  const pedir = async (rota: keyof typeof rotas, quem: Usuario, corpo: Record<string, unknown>, comoFormulario = false) => {
    const dados = new FormData();
    if (comoFormulario) for (const [k, v] of Object.entries(rota === 'avisos' ? comPublicoDaPagina(banco.sqlite, corpo) : corpo)) dados.set(k, String(v));
    const request = new Request(`http://localhost/api/${rota}`, {
      method: 'POST',
      headers: comoFormulario ? { Origin: 'http://localhost' } : { 'Content-Type': 'application/json', Origin: 'http://localhost' },
      body: comoFormulario ? dados : JSON.stringify(corpo),
    });
    const resposta = await rotas[rota].POST({ request, locals: { usuario: quem, tipos } } as never);
    return { status: resposta.status, corpo: comoFormulario ? {} : ((await resposta.json()) as Record<string, unknown>) };
  };
  const pedidosAbertos = (memoria: string) => linhas<{ para: string; dados: string | null }>(`SELECT para, dados FROM avisos WHERE tipo = 'liberar-relato' AND memoria_id = ? AND resolvido_em IS NULL ORDER BY id`, memoria);
  const pedidosQueVe = async (quem: Usuario, memoria: string) => (await repo.listarAvisos(quem)).filter((a) => a.memoriaId === memoria && a.tipo === 'liberar-relato');
  const rascunhoDoGui = (memoria: string) => linhas<{ id: number; so: string | null }>(`SELECT id, so_para_nucleos AS so FROM relatos WHERE memoria_id = ? AND registrado_por = 'gui' AND situacao = 'rascunho'`, memoria)[0];

  /** Memória da Giovanna, só da Bayara Nascimento, com o rascunho do Gui pelo Aguilar e o relato do Aguilar publicado pela Elizete */
  async function comRascunhoQueFicou(titulo: string) {
    const base = { titulo, ano: 2016, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: [BN] };
    const id = (await pedir('memorias', giovanna, base)).corpo.id as string;
    await pedir('relatos', gui, { memoria: id, por: 'aguilar', texto: 'Rascunho do Gui.', situacao: 'rascunho' });
    await pedir('relatos', elizete, { memoria: id, por: 'aguilar', texto: 'Publicado pela Elizete.' });
    return { id, base };
  }
  const descartar = (id: string) => pedir('lixeira', gui, { acao: 'descartar-relato', memoria: id, por: 'aguilar' }, true);
  const restaurar = (id: string) => pedir('lixeira', gui, { acao: 'restaurar-rascunho-de-relato', memoria: id, relato: rascunhoDoGui(id).id }, true);

  it('o pedido diz o público de agora: ampliada para uma família, sem resposta, depois para todos, e liberar libera o que o texto diz', async () => {
    const base = { titulo: 'Pedido de agora', ano: 2013, tipo: 'causo', pessoas: ['giovanna', 'elizete'], visibilidade: 'nucleos', nucleos: [BN] };
    const id = (await pedir('memorias', giovanna, base)).corpo.id as string;
    await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Da Elizete, para a família.' });
    await pedir('memorias', giovanna, { ...base, id, nucleos: [BN, 'bayara-bracarense'] });
    expect((await pedidosQueVe(elizete, id))[0].dados.paraQuem).toBe('a família Bayara Bracarense');
    await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' });
    const pedidos = await pedidosQueVe(elizete, id);
    expect(pedidos.length).toBe(1);
    expect(pedidos[0].dados.paraQuem).toBe('toda a família');
    // Liberar: quem passou a ver, toda a família, lê o relato
    await pedir('avisos', elizete, { aviso: pedidos[0].id, resposta: 'liberar' }, true);
    const lucio = usuarioDe('lucio');
    expect((await repo.listarRelatos(lucio, id)).map((r) => r.texto)).toEqual(['Da Elizete, para a família.']);
  });

  it('"Sua conta" conta o rascunho de relato descartado na frase da lixeira', async () => {
    const { montarConta } = await import('../src/lib/servidor/conta');
    expect((await montarConta(elizete)).fraseDaLixeira).toBe('Nada seu na lixeira.');
    // Memória da Giovanna: a Elizete começa o relato do Aguilar, o Gui publica o dele, a Elizete descarta o rascunho
    const base = { titulo: 'Lixeira da conta', ano: 2012, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: [BN] };
    const id = (await pedir('memorias', giovanna, base)).corpo.id as string;
    await pedir('relatos', elizete, { memoria: id, por: 'aguilar', texto: 'Rascunho da Elizete.', situacao: 'rascunho' });
    await pedir('relatos', gui, { memoria: id, por: 'aguilar', texto: 'Publicado pelo Gui.' });
    await pedir('lixeira', elizete, { acao: 'descartar-relato', memoria: id, por: 'aguilar' }, true);
    expect((await repo.listarRascunhosDeRelatoDescartados(elizete)).length).toBe(1);
    expect((await montarConta(elizete)).fraseDaLixeira).toBe('Uma coisa sua na lixeira.');
  });

  it('mudar quem vê grava a memória e os relatos de uma vez: com a gravação dos relatos falhando, a memória fica com o público de antes', async () => {
    const base = { titulo: 'Tudo ou nada', ano: 2011, tipo: 'causo', pessoas: ['giovanna', 'elizete'], visibilidade: 'nucleos', nucleos: [BN] };
    const id = (await pedir('memorias', giovanna, base)).corpo.id as string;
    await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Da Elizete, só para a família.' });
    const memoria = () => linhas<{ visibilidade: string }>('SELECT visibilidade FROM memorias WHERE id = ?', id)[0].visibilidade;
    const nucleosDela = () => linhas<{ n: string }>('SELECT nucleo_id AS n FROM memoria_nucleos WHERE memoria_id = ?', id).map((l) => l.n);
    banco.sqlite.exec(`CREATE TRIGGER falha_de_proposito BEFORE UPDATE ON relatos WHEN OLD.memoria_id = '${id}' BEGIN SELECT RAISE(ABORT, 'falha de propósito'); END`);
    try {
      await expect(pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' })).rejects.toThrow('falha de propósito');
    } finally {
      banco.sqlite.exec('DROP TRIGGER falha_de_proposito');
    }
    expect(memoria()).toBe('nucleos');
    expect(nucleosDela()).toEqual([BN]);
    expect(pedidosAbertos(id)).toEqual([]);
    const relatoDela = () => linhas<{ so: string | null; conhecido: string | null }>('SELECT so_para_nucleos AS so, publico_conhecido AS conhecido FROM relatos WHERE memoria_id = ?', id)[0];
    expect(relatoDela()).toEqual({ so: null, conhecido: null });
    // Sem a falha, a mesma mudança grava tudo: a memória aberta, o relato esperando e o pedido
    await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' });
    expect(memoria()).toBe('todos');
    expect(pedidosAbertos(id).map((p) => p.para)).toEqual(['elizete']);
    expect(relatoDela().so).toBe(JSON.stringify([BN]));
    expect(await repo.listarRelatos(usuarioDe('lucio'), id)).toEqual([]);
  });

  describe('o rascunho de relato na lixeira fica parado e volta com o que a regra dá a ele', () => {
    it('a memória foi aberta a todos enquanto ele estava na lixeira: ao restaurar, ele espera e o Gui recebe o pedido', async () => {
      const { id, base } = await comRascunhoQueFicou('Lixeira e ampliar');
      await descartar(id);
      await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' });
      expect(pedidosAbertos(id).map((p) => p.para)).toEqual(['elizete']);
      await restaurar(id);
      expect(rascunhoDoGui(id).so).toBe(JSON.stringify([BN]));
      const pedidos = await pedidosQueVe(gui, id);
      expect(pedidos.length).toBe(1);
      expect(pedidos[0].de).toBe('giovanna');
      expect(pedidos[0].dados.paraQuem).toBe('toda a família');
    });

    it('esperava ao ir para a lixeira, e a memória foi restringida: o pedido some e, ao restaurar, ele acompanha a memória', async () => {
      const { id, base } = await comRascunhoQueFicou('Lixeira e restringir');
      await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' });
      expect((await pedidosQueVe(gui, id)).length).toBe(1);
      await descartar(id);
      expect(await pedidosQueVe(gui, id)).toEqual([]);
      await pedir('memorias', giovanna, { ...base, id });
      await restaurar(id);
      expect(rascunhoDoGui(id).so).toBeNull();
      expect(pedidosAbertos(id).filter((p) => p.para === 'gui')).toEqual([]);
    });

    it('nada mudou enquanto ele estava na lixeira: volta como estava, com o mesmo pedido, sem outro', async () => {
      const { id, base } = await comRascunhoQueFicou('Lixeira parada');
      await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' });
      await descartar(id);
      await restaurar(id);
      expect(rascunhoDoGui(id).so).toBe(JSON.stringify([BN]));
      expect(pedidosAbertos(id).filter((p) => p.para === 'gui').length).toBe(1);
      expect((await pedidosQueVe(gui, id)).length).toBe(1);
    });
  });
});
