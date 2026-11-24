// W3 (22/11/2026): as correções do que sobrou da revisão Y2 no PR #160. Pelas rotas de verdade, sobre o
// banco SQLite em memória (testes/apoio/d1.ts), com a mesma porta de testes/y2-item4.test.ts para cruzar
// dois pedidos: o primeiro lê tudo e para na porta do lote que grava a ficha; o outro passa inteiro.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type ComandoDeTeste, type D1DeTeste } from './apoio/d1';
import { comPublicoDaPagina } from './apoio/pedido';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('W3: o que sobrou da revisão Y2', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  await (await import('../src/lib/servidor/banco')).prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const rotas = {
    memorias: await import('../src/pages/api/memorias'),
    relatos: await import('../src/pages/api/relatos'),
    reacoes: await import('../src/pages/api/reacoes'),
    sugestoes: await import('../src/pages/api/sugestoes'),
    lixeira: await import('../src/pages/api/lixeira'),
    avisos: await import('../src/pages/api/avisos'),
  };
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const tipos = await repo.listarTipos();
  const linhas = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).all(...valores) as T[];
  const usuarioDe = (pessoa: string): Usuario => ({
    pessoa,
    nome: pessoa,
    admin: Boolean(linhas<{ admin: number }>('SELECT admin FROM integrantes WHERE id = ?', pessoa)[0].admin),
    nucleos: linhas<{ n: string }>(`SELECT nucleo_id AS n FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((l) => l.n),
  });
  // Gui, Giovanna e Elizete: Bayara Nascimento. Giovanna também na Bayara Bracarense. Lúcio: fora da Bayara Nascimento
  const [gui, giovanna, elizete, lucio] = ['gui', 'giovanna', 'elizete', 'lucio'].map(usuarioDe);
  const BN = 'bayara-nascimento';
  const BB = 'bayara-bracarense';

  /** Um pedido à rota: em JSON, ou como o formulário comum (sem script), que volta com o recado no endereço */
  const pedir = async (rota: keyof typeof rotas, quem: Usuario, corpo: Record<string, unknown>, comoFormulario = false) => {
    const dados = new FormData();
    if (comoFormulario) for (const [k, v] of Object.entries(rota === 'avisos' ? comPublicoDaPagina(banco.sqlite, corpo) : corpo)) for (const um of Array.isArray(v) ? v : [v]) dados.append(k, String(um));
    const request = new Request(`http://localhost/api/${rota}`, {
      method: 'POST',
      headers: comoFormulario ? { Origin: 'http://localhost' } : { 'Content-Type': 'application/json', Origin: 'http://localhost' },
      body: comoFormulario ? dados : JSON.stringify(corpo),
    });
    const resposta = await rotas[rota].POST({ request, locals: { usuario: quem, tipos } } as never);
    if (comoFormulario) {
      const destino = new URL(resposta.headers.get('Location') ?? '/', 'http://localhost');
      return { status: resposta.status, corpo: {} as Record<string, unknown>, destino: destino.pathname + destino.hash, erro: destino.searchParams.get('erro'), ok: destino.searchParams.get('ok') };
    }
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown>, destino: '', erro: null, ok: null };
  };
  const textosQueVe = async (quem: Usuario, memoria: string) => (await repo.listarRelatos(quem, memoria)).map((r) => r.texto);
  const visibilidadeDa = (memoria: string) => linhas<{ v: string }>('SELECT visibilidade AS v FROM memorias WHERE id = ?', memoria)[0].v;
  const familiasDa = (memoria: string) => linhas<{ n: string }>('SELECT nucleo_id AS n FROM memoria_nucleos WHERE memoria_id = ? ORDER BY nucleo_id', memoria).map((l) => l.n);
  const pedidosAbertos = (memoria: string) => linhas<{ para: string }>(`SELECT para FROM avisos WHERE tipo = 'liberar-relato' AND memoria_id = ? AND resolvido_em IS NULL ORDER BY id`, memoria).map((p) => p.para);
  const relatoDe = (memoria: string, por: string) => linhas<{ id: number; so: string | null }>('SELECT id, so_para_nucleos AS so FROM relatos WHERE memoria_id = ? AND por = ?', memoria, por)[0];
  /** A impressão do banco inteiro: todas as linhas de todas as tabelas, em ordem */
  const impressao = () => {
    const tabelas = linhas<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> 'marca_da_copia' ORDER BY name`).map((t) => t.name);
    return JSON.stringify(tabelas.map((t) => [t, banco.sqlite.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all()]));
  };

  const loteOriginal = banco.batch.bind(banco);
  let porta: { chegou: () => void; soltar: Promise<void>; sql: RegExp } | null = null;
  banco.batch = async (comandos: ComandoDeTeste[]) => {
    if (porta && comandos.some((c) => porta!.sql.test(c.sql))) {
      const p = porta;
      porta = null;
      p.chegou();
      await p.soltar;
    }
    return loteOriginal(comandos);
  };
  /** Dois pedidos que se cruzam: o primeiro para na porta do lote (o da ficha, ou outro `sql`), o outro passa inteiro */
  async function cruzar<T>(gravaPorUltimo: () => Promise<T>, passaInteiro: () => Promise<unknown>, sql = /^\s*UPDATE memorias SET titulo/): Promise<T> {
    let soltar!: () => void;
    let chegou!: () => void;
    const naPorta = new Promise<void>((r) => (chegou = r));
    porta = { chegou, soltar: new Promise<void>((r) => (soltar = r)), sql };
    const pendente = gravaPorUltimo();
    await naPorta;
    await passaInteiro();
    soltar();
    return pendente;
  }

  /** Uma memória da Giovanna, só da Bayara Nascimento, com um relato da Elizete, que ela abre para todos: o relato espera */
  async function memoriaQueEspera(titulo: string, pessoas = ['giovanna']) {
    const base = { titulo, ano: 2019, tipo: 'causo', pessoas, visibilidade: 'nucleos', nucleos: [BN] };
    const id = (await pedir('memorias', giovanna, base)).corpo.id as string;
    await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: `Da Elizete, em ${titulo}.` });
    expect((await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' })).corpo.esperam).toEqual(['elizete']);
    return { id, base, aberta: { ...base, id, visibilidade: 'todos' } };
  }

  describe('1: quem não criou a memória nunca grava o público dela', () => {
    it('entrar em "Quem estava" (reações) enquanto quem criou restringe: a memória fica restrita', async () => {
      const { id, base } = await memoriaQueEspera('Entrar e restringir');
      await pedir('reacoes', gui, { memoria: id, acao: 'reagir', alvo: 'memoria', simbolo: 'estava' }, true);
      const entrou = await cruzar(
        () => pedir('reacoes', gui, { memoria: id, acao: 'entrar' }, true),
        () => pedir('memorias', giovanna, { ...base, id }),
      );
      expect(entrou.ok).toBe('Você entrou em Quem estava.');
      expect(visibilidadeDa(id)).toBe('nucleos');
      expect(familiasDa(id)).toEqual([BN]);
      expect(linhas('SELECT 1 FROM memoria_integrantes WHERE memoria_id = ? AND integrante_id = ?', id, 'gui').length).toBe(1);
      expect(await textosQueVe(lucio, id)).toEqual([]);
    });

    it('aceitar uma sugestão enquanto a memória é restringida: a memória fica restrita', async () => {
      const { id, base } = await memoriaQueEspera('Aceitar e restringir');
      await pedir('sugestoes', gui, { memoria: id, acao: 'sugerir-dados', lugar: 'Mariana' }, true);
      const sugestao = linhas<{ id: number }>('SELECT id FROM sugestoes WHERE memoria_id = ?', id)[0].id;
      const aceita = await cruzar(
        () => pedir('sugestoes', giovanna, { memoria: id, acao: 'aceitar', sugestao }, true),
        () => pedir('memorias', giovanna, { ...base, id }),
      );
      expect(aceita.erro).toBeNull();
      expect(linhas<{ lugar: string }>('SELECT lugar FROM memorias WHERE id = ?', id)[0].lugar).toBe('Mariana');
      expect(visibilidadeDa(id)).toBe('nucleos');
      expect(await textosQueVe(lucio, id)).toEqual([]);
    });

    it('restaurar uma versão enquanto a memória é restringida: a memória fica restrita', async () => {
      const { id, base, aberta } = await memoriaQueEspera('Restaurar e restringir', ['giovanna', 'gui']);
      await pedir('memorias', gui, { ...aberta, pessoas: ['giovanna', 'gui'], lugar: 'Sabará' });
      const versao = linhas<{ id: number }>(`SELECT id FROM versoes WHERE tipo = 'memoria' AND item_id = ? ORDER BY id DESC`, id)[0].id;
      const restaurou = await cruzar(
        () => pedir('lixeira', gui, { acao: 'restaurar-versao', memoria: id, versao }, true),
        () => pedir('memorias', giovanna, { ...base, id, pessoas: ['giovanna', 'gui'] }),
      );
      expect(restaurou.erro).toBeNull();
      expect(visibilidadeDa(id)).toBe('nucleos');
      expect(familiasDa(id)).toEqual([BN]);
      expect(await textosQueVe(lucio, id)).toEqual([]);
    });

    it('a citada marca uma família na memória aberta enquanto quem criou restringe: as marcas não mudam o público restrito', async () => {
      // Memória do Gui, só da Bayara Nascimento, aberta a todos; a Giovanna, citada, também é da Bayara Bracarense
      const base = { titulo: 'Marcar e restringir', ano: 2019, tipo: 'causo', pessoas: ['gui', 'giovanna'], visibilidade: 'nucleos', nucleos: [BN] };
      const id = (await pedir('memorias', gui, base)).corpo.id as string;
      const aberta = { ...base, id, visibilidade: 'todos' };
      await pedir('memorias', gui, aberta);
      // A Giovanna marca a Bayara Bracarense; antes de ela gravar, o Gui restringe à Bayara Nascimento
      const marcou = await cruzar(
        () => pedir('memorias', giovanna, { ...aberta, nucleos: [BN, BB] }),
        () => pedir('memorias', gui, { ...base, id }),
      );
      expect(marcou.status).toBe(200);
      expect(visibilidadeDa(id)).toBe('nucleos');
      expect(familiasDa(id)).toEqual([BN]);
      // Sem corrida, as marcas da citada numa memória aberta continuam sendo gravadas
      await pedir('memorias', gui, aberta);
      expect((await pedir('memorias', giovanna, { ...aberta, nucleos: [BN, BB] })).status).toBe(200);
      expect(familiasDa(id)).toEqual([BB, BN]);
      expect(visibilidadeDa(id)).toBe('todos');
    });

  });
  describe('2: mudar quem vê conta com todo relato que existe na hora do lote', () => {
    it('a autora libera o relato enquanto quem criou amplia ainda mais: a ampliação refaz a conta e pede de novo só pelo que é novo', async () => {
      const base = { titulo: 'Liberar no meio', ano: 2020, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: [BN] };
      const id = (await pedir('memorias', giovanna, base)).corpo.id as string;
      await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Da Elizete, liberado no meio.' });
      await pedir('memorias', giovanna, { ...base, id, nucleos: [BN, BB] });
      const { id: relato } = relatoDe(id, 'elizete');
      // A Giovanna abre para todos; depois de ela ler os relatos, a Elizete libera para a Bayara Bracarense
      const ampliou = await cruzar(
        () => pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' }),
        () => pedir('avisos', elizete, { relato, resposta: 'liberar' }, true),
      );
      expect(ampliou.status).toBe(200);
      expect(ampliou.corpo.esperam).toEqual(['elizete']);
      // O relato já foi visto pelas duas famílias, espera só pelo resto, e o pedido está na lista
      expect(relatoDe(id, 'elizete').so).toBe(JSON.stringify([BB, BN]));
      expect(pedidosAbertos(id)).toEqual(['elizete']);
      expect(await textosQueVe(lucio, id)).toEqual([]);
    });

    it('o rascunho descartado no meio da ampliação não ganha pedido', async () => {
      const base = { titulo: 'Descartar no meio', ano: 2020, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: [BN] };
      const id = (await pedir('memorias', giovanna, base)).corpo.id as string;
      await pedir('relatos', gui, { memoria: id, por: 'aguilar', texto: 'Rascunho do Gui.', situacao: 'rascunho' });
      await pedir('relatos', elizete, { memoria: id, por: 'aguilar', texto: 'Publicado pela Elizete.' });
      await cruzar(
        () => pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' }),
        () => pedir('lixeira', gui, { acao: 'descartar-relato', memoria: id, por: 'aguilar' }, true),
      );
      expect(visibilidadeDa(id)).toBe('todos');
      expect((await repo.listarRascunhosDeRelatoDescartados(gui)).filter((r) => r.memoriaId === id).length).toBe(1);
      expect(linhas(`SELECT 1 FROM avisos WHERE tipo = 'liberar-relato' AND memoria_id = ? AND para = 'gui'`, id)).toEqual([]);
      expect(pedidosAbertos(id)).toEqual(['elizete']);
    });

    it('quem perde a corrida três vezes seguidas recebe o recado, com e sem script, e nada é gravado', async () => {
      const base = { titulo: 'Sempre mudando', ano: 2020, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: [BN] };
      const id = (await pedir('memorias', giovanna, base)).corpo.id as string;
      await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Da Elizete.' });
      // Antes de cada lote que muda quem vê, um relato novo sobe a versão da memória
      const lote = banco.batch;
      banco.batch = async (comandos: ComandoDeTeste[]) => {
        if (comandos.some((c) => /^\s*UPDATE memorias SET versao = \?/.test(c.sql))) banco.sqlite.prepare('UPDATE memorias SET versao = versao + 1 WHERE id = ?').run(id);
        return lote(comandos);
      };
      try {
        const antes = impressao();
        const comScript = await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' });
        expect(comScript.status).toBe(409);
        expect(comScript.corpo.erro).toBe('Esta memória mudou enquanto você editava. Abra de novo para ver como ficou.');
        const semScript = await pedir('memorias', giovanna, { id, titulo: base.titulo, ano: base.ano, tipo: base.tipo, pessoas: base.pessoas, visibilidade: 'todos', nucleos: [BN] }, true);
        expect(semScript.erro).toBe('Esta memória mudou enquanto você editava. Abra de novo para ver como ficou.');
        // A impressão muda só na versão, que o teste subiu
        const semVersao = (t: string) => t.replace(/"versao":\d+/g, '');
        expect(semVersao(impressao())).toBe(semVersao(antes));
        expect(visibilidadeDa(id)).toBe('nucleos');
      } finally {
        banco.batch = lote;
      }
    });
  });
  describe('3: um relato tem no máximo um pedido aberto', () => {
    it('o toque duplo sem script de quem criou, ao abrir a memória, deixa um pedido só', async () => {
      const base = { titulo: 'Toque duplo', ano: 2021, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: [BN] };
      const id = (await pedir('memorias', giovanna, base)).corpo.id as string;
      await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Da Elizete, no toque duplo.' });
      const formulario = { id, titulo: base.titulo, ano: base.ano, tipo: base.tipo, pessoas: base.pessoas, visibilidade: 'todos', nucleos: [BN] };
      let segundo: Awaited<ReturnType<typeof pedir>> | undefined;
      const primeiro = await cruzar(
        () => pedir('memorias', giovanna, formulario, true),
        async () => (segundo = await pedir('memorias', giovanna, formulario, true)),
      );
      expect(primeiro.erro).toBeNull();
      expect(segundo?.erro).toBeNull();
      expect(visibilidadeDa(id)).toBe('todos');
      expect(pedidosAbertos(id)).toEqual(['elizete']);
    });

    it('o banco recusa um segundo pedido aberto para o mesmo relato', async () => {
      const { id } = await memoriaQueEspera('Dois pedidos no banco');
      const { id: relato } = relatoDe(id, 'elizete');
      const inserir = () => banco.sqlite.prepare(`INSERT INTO avisos (para, tipo, memoria_id, relato_id, de) VALUES ('elizete', 'liberar-relato', ?, ?, 'giovanna')`).run(id, relato);
      expect(inserir).toThrow(/UNIQUE/);
      // Respondido, o pedido sai da lista, e um novo pode entrar
      banco.sqlite.prepare(`UPDATE avisos SET resolvido_em = datetime('now') WHERE relato_id = ?`).run(relato);
      expect(inserir).not.toThrow();
      expect(pedidosAbertos(id)).toEqual(['elizete']);
    });
  });
  describe('4: a resposta ao pedido diz e faz a mesma coisa', () => {
    const RECADO = 'A memória mudou, e o pedido também. Confira e responda de novo.';
    /** Memória da Giovanna, aberta à Bayara Bracarense: o relato da Elizete espera por ela */
    async function abertaABracarense(titulo: string) {
      const base = { titulo, ano: 2022, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: [BN] };
      const id = (await pedir('memorias', giovanna, base)).corpo.id as string;
      await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: `Da Elizete, em ${titulo}.` });
      expect((await pedir('memorias', giovanna, { ...base, id, nucleos: [BN, BB] })).corpo.esperam).toEqual(['elizete']);
      const aviso = (await repo.listarAvisos(elizete)).find((a) => a.memoriaId === id && a.tipo === 'liberar-relato')!;
      expect(aviso.dados.paraQuem).toBe('a família Bayara Bracarense');
      return { id, base, aviso, relato: relatoDe(id, 'elizete').id, lido: `nucleos:${[BB, BN].join(',')}` };
    }

    it('pelo aviso: a memória foi aberta a todos depois de a Elizete ler o pedido; "Liberar" não libera nada e volta ao pedido de agora', async () => {
      const { id, base, aviso, lido } = await abertaABracarense('Liberar o que leu');
      await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' });
      const antes = impressao();
      const r = await pedir('avisos', elizete, { aviso: aviso.id, resposta: 'liberar', publico: lido, volta: '/conta#avisos' }, true);
      expect(r.erro).toBe(RECADO);
      expect(r.destino).toBe('/conta#avisos');
      expect(impressao()).toBe(antes);
      expect(await textosQueVe(lucio, id)).toEqual([]);
      // O pedido de agora diz toda a família, e a resposta com o público que ele diz vale
      expect((await repo.listarAvisos(elizete)).find((a) => a.id === aviso.id)?.dados.paraQuem).toBe('toda a família');
      expect((await pedir('avisos', elizete, { aviso: aviso.id, resposta: 'liberar', publico: 'todos' }, true)).ok).toBe('Relato liberado para quem passou a ver a memória.');
      expect(await textosQueVe(lucio, id)).toEqual(['Da Elizete, em Liberar o que leu.']);
    });

    it('"Manter como estava" também não vale para um público que a pessoa não leu', async () => {
      const { id, base, aviso, lido } = await abertaABracarense('Manter o que leu');
      await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' });
      const antes = impressao();
      expect((await pedir('avisos', elizete, { aviso: aviso.id, resposta: 'manter', publico: lido }, true)).erro).toBe(RECADO);
      expect(impressao()).toBe(antes);
      expect(pedidosAbertos(id)).toEqual(['elizete']);
    });

    it('pela linha do relato: liberar com o público que a linha mostrou antes de a memória mudar não libera', async () => {
      const { id, base, relato, lido } = await abertaABracarense('Linha do relato');
      await pedir('avisos', elizete, { relato, resposta: 'manter' }, true);
      await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' });
      const antes = impressao();
      const r = await pedir('avisos', elizete, { relato, resposta: 'liberar', publico: lido, volta: `/memorias/${id}#relato-${relato}` }, true);
      expect(r.erro).toBe(RECADO);
      expect(r.destino).toBe(`/memorias/${id}#relato-${relato}`);
      expect(impressao()).toBe(antes);
      expect(await textosQueVe(lucio, id)).toEqual([]);
    });

    it('a memória muda entre a leitura da rota e o lote da resposta: nada é liberado', async () => {
      const { id, base, aviso, lido } = await abertaABracarense('Corrida da resposta');
      const r = await cruzar(
        () => pedir('avisos', elizete, { aviso: aviso.id, resposta: 'liberar', publico: lido }, true),
        () => pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' }),
        /resposta = \?/,
      );
      expect(r.erro).toBe(RECADO);
      // Continua só para a família que já o via
      expect(relatoDe(id, 'elizete').so).toBe(JSON.stringify([BN]));
      expect(pedidosAbertos(id)).toEqual(['elizete']);
      expect(await textosQueVe(lucio, id)).toEqual([]);
    });

    it('a página de antes, que não manda o público, também volta ao pedido de agora', async () => {
      const { aviso } = await abertaABracarense('Página de antes');
      const antes = impressao();
      const dados = new FormData();
      dados.set('aviso', String(aviso.id));
      dados.set('resposta', 'liberar');
      const request = new Request('http://localhost/api/avisos', { method: 'POST', headers: { Origin: 'http://localhost' }, body: dados });
      const resposta = await rotas.avisos.POST({ request, locals: { usuario: elizete, tipos } } as never);
      expect(new URL(resposta.headers.get('Location') ?? '/', 'http://localhost').searchParams.get('erro')).toBe(RECADO);
      expect(impressao()).toBe(antes);
    });

    it('a linha do relato diz para quem libera (os formulários, em testes/no-lugar.test.ts)', async () => {
      const { paraQuemPassouAVer, comoPublicoAntigo } = await import('../src/lib/servidor/avisos');
      const nomes = [{ id: BN, nome: 'Bayara Nascimento' }, { id: BB, nome: 'Bayara Bracarense' }];
      expect(paraQuemPassouAVer(comoPublicoAntigo([BN]), { visibilidade: 'todos', nucleos: [] }, nomes)).toBe('toda a família');
      expect(paraQuemPassouAVer(comoPublicoAntigo([BN]), { visibilidade: 'nucleos', nucleos: [BN, BB] }, nomes)).toBe('a família Bayara Bracarense');
    });
  });
  describe('5: "Manter como estava" vale para o público que foi perguntado', () => {
    it('depois de manter para a Bayara Bracarense, abrir a memória para todos pede de novo', async () => {
      const base = { titulo: 'Manter e ampliar mais', ano: 2023, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: [BN] };
      const id = (await pedir('memorias', giovanna, base)).corpo.id as string;
      await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Da Elizete, mantido.' });
      await pedir('memorias', giovanna, { ...base, id, nucleos: [BN, BB] });
      expect((await pedir('avisos', elizete, { relato: relatoDe(id, 'elizete').id, resposta: 'manter' }, true)).ok).toContain('continua só para quem via antes');
      expect(pedidosAbertos(id)).toEqual([]);
      // Um público maior é outra pergunta
      expect((await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' })).status).toBe(200);
      expect(pedidosAbertos(id)).toEqual(['elizete']);
      const pedido = (await repo.listarAvisos(elizete)).find((a) => a.memoriaId === id && a.tipo === 'liberar-relato');
      expect(pedido?.dados.paraQuem).toBe('toda a família');
      expect(await textosQueVe(lucio, id)).toEqual([]);
    });

    it('depois de manter, restringir e abrir de novo para o mesmo público não pede', async () => {
      const { id, base } = await memoriaQueEspera('Manter e reabrir');
      await pedir('avisos', elizete, { relato: relatoDe(id, 'elizete').id, resposta: 'manter' }, true);
      // Restringir: o relato volta a acompanhar a memória
      await pedir('memorias', giovanna, { ...base, id });
      expect(relatoDe(id, 'elizete').so).toBeNull();
      // Reabrir para todos, o público já recusado: o relato espera, sem pedido
      expect((await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' })).corpo.esperam).toEqual(['elizete']);
      expect(relatoDe(id, 'elizete').so).toBe(JSON.stringify([BN]));
      expect(pedidosAbertos(id)).toEqual([]);
      expect(await textosQueVe(lucio, id)).toEqual([]);
      // A linha do relato continua deixando liberar
      expect((await pedir('avisos', elizete, { relato: relatoDe(id, 'elizete').id, resposta: 'liberar' }, true)).ok).toBe('Relato liberado para quem passou a ver a memória.');
      expect(await textosQueVe(lucio, id)).toEqual(['Da Elizete, em Manter e reabrir.']);
    });

    it('a resposta guarda o público que o pedido mostrava', async () => {
      const { id } = await memoriaQueEspera('Resposta com público');
      await pedir('avisos', elizete, { relato: relatoDe(id, 'elizete').id, resposta: 'manter' }, true);
      const guardado = linhas<{ d: string }>(`SELECT dados AS d FROM avisos WHERE tipo = 'liberar-relato' AND memoria_id = ? AND resposta = 'manter'`, id)[0].d;
      expect(JSON.parse(guardado).publico).toEqual({ visibilidade: 'todos', nucleos: [BN] });
    });
  });
  describe('7: a frase da lixeira de quem administra conta o que a página da lixeira mostra', () => {
    it('a pessoa excluída entra na conta, e a frase diz o mesmo número que a lixeira', async () => {
      const { montarConta, itensDaLixeira } = await import('../src/lib/servidor/conta');
      const quantasNaFrase = async () => {
        const frase = (await montarConta(gui)).fraseDaLixeira;
        return frase === 'Nada na lixeira.' ? 0 : frase === 'Uma coisa na lixeira.' ? 1 : Number(/^(\d+) coisas na lixeira\.$/.exec(frase)?.[1]);
      };
      const naPagina = async () => {
        const { memorias, capitulos, pessoas, relatos } = await itensDaLixeira(gui);
        return memorias.length + capitulos.length + pessoas.length + relatos.length;
      };
      const antes = await quantasNaFrase();
      expect(antes).toBe(await naPagina());
      // Uma pessoa de exemplo, que não acessa o site, vai para a lixeira
      const alguem = linhas<{ id: string }>(`SELECT id FROM integrantes WHERE id LIKE 'ex-%' AND excluida_em IS NULL ORDER BY id LIMIT 1`)[0].id;
      expect(await repo.excluirPessoa(alguem, gui)).toBe(true);
      expect(await quantasNaFrase()).toBe(antes + 1);
      expect(await quantasNaFrase()).toBe(await naPagina());
      // Para quem não administra, nada muda: a pessoa excluída não está na lixeira dela, e a frase conta só o que é dela
      expect((await itensDaLixeira(elizete)).pessoas).toEqual([]);
      expect((await montarConta(elizete)).fraseDaLixeira).toMatch(/seu|suas/);
    });
  });
});
