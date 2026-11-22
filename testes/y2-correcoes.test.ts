// W3 (22/11/2026): as correções do que sobrou da revisão Y2 no PR #160. Pelas rotas de verdade, sobre o
// banco SQLite em memória (testes/apoio/d1.ts), com a mesma porta de testes/y2-item4.test.ts para cruzar
// dois pedidos: o primeiro lê tudo e para na porta do lote que grava a ficha; o outro passa inteiro.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type ComandoDeTeste, type D1DeTeste } from './apoio/d1';

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
    if (comoFormulario) for (const [k, v] of Object.entries(corpo)) for (const um of Array.isArray(v) ? v : [v]) dados.append(k, String(um));
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
    const tabelas = linhas<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).map((t) => t.name);
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
});
