// Y2 (22/11/2026), item 4 do PR #160: dois pedidos que se cruzam. Falham hoje, no 5cf0215.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type ComandoDeTeste, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('Y2, item 4: dois salvamentos quase ao mesmo tempo', async () => {
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
  const textosQueVe = async (quem: Usuario, memoria: string) => (await repo.listarRelatos(quem, memoria)).map((r) => r.texto);
  const visibilidadeDa = (memoria: string) => linhas<{ v: string }>('SELECT visibilidade AS v FROM memorias WHERE id = ?', memoria)[0].v;

  // Dois pedidos que se cruzam no D1: o primeiro lê tudo e para na porta do lote que grava a ficha
  // (atualizarMemoria); o outro passa inteiro; o primeiro grava por último, com o que tinha lido antes.
  const loteOriginal = banco.batch.bind(banco);
  let porta: { chegou: () => void; soltar: Promise<void> } | null = null;
  banco.batch = async (comandos: ComandoDeTeste[]) => {
    if (porta && comandos.some((c) => /^\s*UPDATE memorias SET titulo/.test(c.sql))) {
      const p = porta;
      porta = null;
      p.chegou();
      await p.soltar;
    }
    return loteOriginal(comandos);
  };
  async function cruzar<T>(gravaPorUltimo: () => Promise<T>, passaInteiro: () => Promise<unknown>): Promise<T> {
    let soltar!: () => void;
    let chegou!: () => void;
    const naPorta = new Promise<void>((r) => (chegou = r));
    porta = { chegou, soltar: new Promise<void>((r) => (soltar = r)) };
    const pendente = gravaPorUltimo();
    await naPorta;
    await passaInteiro();
    soltar();
    return pendente;
  }

  it('4a: quem criou restringe enquanto um citado corrige o lugar: a memória fica restrita e o relato que esperava não aparece para quem nunca o viu', async () => {
    const base = { titulo: 'Restringir e corrigir', ano: 2017, tipo: 'causo', pessoas: ['giovanna', 'gui'], visibilidade: 'nucleos', nucleos: [BN] };
    const id = (await pedir('memorias', giovanna, base)).corpo.id as string;
    await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Da Elizete, só para a família.' });
    // Aberta a todos: o relato da Elizete espera, e o Lúcio não o lê
    expect((await pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' })).corpo.esperam).toEqual(['elizete']);
    expect(await textosQueVe(lucio, id)).toEqual([]);
    // O Gui, citado, corrige o lugar com a memória ainda aberta; antes de ele gravar, a Giovanna restringe
    const doGui = await cruzar(
      () => pedir('memorias', gui, { ...base, id, visibilidade: 'todos', lugar: 'Ouro Preto' }),
      () => pedir('memorias', giovanna, { ...base, id }),
    );
    expect(doGui.status).toBe(200);
    // Só quem criou muda quem vê: a correção do Gui não pode desfazer a restrição da Giovanna
    expect(visibilidadeDa(id)).toBe('nucleos');
    expect(await textosQueVe(lucio, id)).toEqual([]);
  });

  it('4b: um relato publicado entre a leitura e a gravação da ampliação já existia: espera, e não aparece para quem passou a ver', async () => {
    const base = { titulo: 'Relato na janela', ano: 2018, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: [BN] };
    const id = (await pedir('memorias', giovanna, base)).corpo.id as string;
    // A Giovanna amplia; depois de ela ler os relatos e antes do lote, a Elizete publica na memória ainda restrita
    const ampliou = await cruzar(
      () => pedir('memorias', giovanna, { ...base, id, visibilidade: 'todos' }),
      () => pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Escrito com a memória só da família.' }),
    );
    expect(ampliou.status).toBe(200);
    expect(visibilidadeDa(id)).toBe('todos');
    expect(await textosQueVe(lucio, id)).toEqual([]);
    expect(linhas<{ so: string | null }>('SELECT so_para_nucleos AS so FROM relatos WHERE memoria_id = ?', id)[0].so).toBe(JSON.stringify([BN]));
  });
});
