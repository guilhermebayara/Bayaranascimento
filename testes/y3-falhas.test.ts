// Y3 (22/11/2026): o que falha no PR #160 em 1ca755e. Pelas rotas de verdade, sobre o SQLite em memória.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type ComandoDeTeste, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('Y3: o que falha', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  await (await import('../src/lib/servidor/banco')).prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const rotas = { memorias: await import('../src/pages/api/memorias'), relatos: await import('../src/pages/api/relatos') };
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const tipos = await repo.listarTipos();
  const linhas = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).all(...valores) as T[];
  const usuarioDe = (pessoa: string): Usuario => ({
    pessoa,
    nome: pessoa,
    admin: Boolean(linhas<{ admin: number }>('SELECT admin FROM integrantes WHERE id = ?', pessoa)[0].admin),
    nucleos: linhas<{ n: string }>(`SELECT nucleo_id AS n FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((l) => l.n),
  });
  // Gui, Giovanna e Elizete: Bayara Nascimento. Lúcio: fora dela
  const [gui, giovanna, elizete, lucio] = ['gui', 'giovanna', 'elizete', 'lucio'].map(usuarioDe);
  const BN = 'bayara-nascimento';
  const pedir = async (rota: keyof typeof rotas, quem: Usuario, corpo: Record<string, unknown>) => {
    const request = new Request(`http://localhost/api/${rota}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(corpo) });
    const resposta = await rotas[rota].POST({ request, locals: { usuario: quem, tipos } } as never);
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };
  /** A impressão do banco inteiro, sem a versão da memória, que as provas sobem de propósito */
  const impressao = () => {
    const tabelas = linhas<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> 'marca_da_copia' ORDER BY name`).map((t) => t.name);
    return JSON.stringify(tabelas.map((t) => [t, banco.sqlite.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all()])).replace(/"versao":\d+/g, '');
  };
  const lote = banco.batch.bind(banco);
  /** Antes de cada lote que confere a versão, outro lote sobe a versão: quem confere perde as três tentativas */
  async function perdendoSempre<T>(memoria: string, fazer: () => Promise<T>): Promise<T> {
    banco.batch = async (comandos: ComandoDeTeste[]) => {
      if (comandos.some((c) => /^\s*UPDATE memorias SET versao = \?/.test(c.sql))) banco.sqlite.prepare('UPDATE memorias SET versao = versao + 1 WHERE id = ?').run(memoria);
      return lote(comandos);
    };
    try {
      return await fazer();
    } finally {
      banco.batch = lote;
    }
  }
  const base = (titulo: string) => ({ titulo, ano: 2020, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: [BN] });
  const RECADO = 'Esta memória mudou enquanto você editava. Abra de novo para ver como ficou.';

  it('item 2: na terceira perda, a pessoa nova e o tema novo do pedido recusado ficam gravados', async () => {
    const ficha = base('Y3: três perdas com pessoa e tema novos');
    const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
    const antes = impressao();
    const r = await perdendoSempre(id, () =>
      pedir('memorias', giovanna, { ...ficha, id, visibilidade: 'todos', pessoas: ['giovanna', 'nova:0'], novasPessoas: [{ nome: 'Fulana Ypsilon' }], temas: 'tema-ypsilon' }),
    );
    expect(r.status).toBe(409);
    expect(r.corpo.erro).toBe(RECADO);
    // "Nada é gravado" (docs/decisoes.md) e a regra do pedido recusado (CLAUDE.md, "Conferências")
    expect(linhas(`SELECT id FROM integrantes WHERE nome = 'Fulana Ypsilon'`)).toEqual([]);
    expect(linhas(`SELECT id FROM temas WHERE nome = 'tema-ypsilon'`)).toEqual([]);
    expect(impressao()).toBe(antes);
  });

  it('item 2: na terceira perda, o laço "só eu vejo" aberto para publicar continua aberto, e a pessoa aparece para todos', async () => {
    banco.sqlite.prepare(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('t-y3-reservada', 'Dona Reservada', 'giovanna')`).run();
    banco.sqlite.prepare(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('giovanna', 't-y3-reservada', 'amiga', 1)`).run();
    const ficha = base('Y3: três perdas com laço privado');
    const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
    const guiVe = async () => (await repo.listarIntegrantesQueVe(gui)).some((i) => i.id === 't-y3-reservada');
    expect(await guiVe()).toBe(false);
    const antes = impressao();
    const r = await perdendoSempre(id, () => pedir('memorias', giovanna, { ...ficha, id, visibilidade: 'todos', pessoas: ['giovanna', 't-y3-reservada'], pessoasPrivadas: 'abrir' }));
    expect(r.status).toBe(409);
    expect(linhas<{ privado: number }>(`SELECT privado FROM lacos_coracao WHERE pessoa_id = 't-y3-reservada'`)[0].privado).toBe(1);
    expect(await guiVe()).toBe(false);
    expect(impressao()).toBe(antes);
  });

  it('item 1: o espelho do 4b. O relato mandado com a memória só da família, gravado logo depois de a ampliação passar, aparece para quem passou a ver', async () => {
    const ficha = base('Y3: relato gravado depois da ampliação');
    const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
    // A rota do relato lê a memória (só da Bayara Nascimento) e para na porta do lote que grava o relato;
    // a Giovanna abre para todos, inteiro; a rota do relato grava por último
    let soltar!: () => void;
    let chegou!: () => void;
    const naPorta = new Promise<void>((r) => (chegou = r));
    const espera = new Promise<void>((r) => (soltar = r));
    banco.batch = async (comandos: ComandoDeTeste[]) => {
      if (comandos.some((c) => /^\s*INSERT INTO relatos/.test(c.sql))) {
        banco.batch = lote;
        chegou();
        await espera;
      }
      return lote(comandos);
    };
    const doRelato = pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Escrito com a memória só da família.' });
    await naPorta;
    expect((await pedir('memorias', giovanna, { ...ficha, id, visibilidade: 'todos' })).status).toBe(200);
    soltar();
    expect((await doRelato).status).toBe(201);
    // Como no 4b do gabarito: quem passou a ver não lê o relato antes do sim de quem escreveu
    expect((await repo.listarRelatos(lucio, id)).map((r) => r.texto)).toEqual([]);
  });

  it('item 2, sem script: a foto que outra pessoa acrescentou entre a primeira tentativa e a segunda não pode sair da memória', async () => {
    const ficha = base('Y3: foto na janela, sem script');
    const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
    // O formulário comum da Giovanna, que abre para todos. Na porta do lote da primeira tentativa, a Elizete
    // acrescenta uma foto e publica um relato (a versão sobe): a primeira tentativa perde e a rota refaz
    let naPorta = true;
    banco.batch = async (comandos: ComandoDeTeste[]) => {
      if (naPorta && comandos.some((c) => /^\s*UPDATE memorias SET titulo/.test(c.sql))) {
        naPorta = false;
        banco.batch = lote;
        banco.sqlite.prepare(`INSERT INTO fotos (memoria_id, chave, principal, ordem, enviada_por) VALUES (?, 'teste/y3-foto-da-elizete.jpg', 0, 0, 'elizete')`).run(id);
        await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Da Elizete, com foto.' });
      }
      return lote(comandos);
    };
    const dados = new FormData();
    for (const [k, v] of Object.entries({ id, titulo: ficha.titulo, ano: ficha.ano, tipo: ficha.tipo, pessoas: 'giovanna', visibilidade: 'todos', nucleos: BN })) dados.append(k, String(v));
    const request = new Request('http://localhost/api/memorias', { method: 'POST', headers: { Origin: 'http://localhost' }, body: dados });
    const resposta = await rotas.memorias.POST({ request, locals: { usuario: giovanna, tipos } } as never);
    expect(decodeURIComponent(resposta.headers.get('Location') ?? '')).toContain('ok=Memória+atualizada');
    expect(linhas<{ removida_em: string | null }>(`SELECT removida_em FROM fotos WHERE chave = 'teste/y3-foto-da-elizete.jpg'`)[0].removida_em).toBeNull();
  });
});
