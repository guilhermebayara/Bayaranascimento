// O marcador do "Ver como" nos endereços das fotos, das cópias e dos retratos (item 16 da revisão R-D1,
// sessão D1d; src/lib/marcador-do-ver-como.ts). Regras que não podem falhar:
// - onde existe o "Ver como" (prévias, homologação, computador), todo endereço de foto, cópia e retrato que a
//   página desenha leva "?v=<pessoa vista>", e trocar de pessoa troca o endereço;
// - na produção, nenhum endereço muda;
// - o marcador nunca muda quem vê o quê: a rota das fotos confere pela pessoa do pedido, com ou sem ele;
// - nenhum endereço de foto ou retrato é montado à mão fora das peças que põem o marcador.
// O middleware de verdade (src/middleware.ts) roda sobre o banco SQLite em memória (testes/apoio/d1.ts).
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import { comMarcador, lerMarcadorDe } from '../src/lib/marcador-do-ver-como';
import { enderecoDaFoto, fontesDaFoto } from '../src/lib/copias-das-fotos';
import { enderecoDoRetrato, enderecoDoRetratoInteiro, fontesDoRetrato } from '../src/lib/retratos';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
vi.mock('astro:middleware', () => ({ defineMiddleware: <T>(f: T) => f }));
// Na produção, quem entra é conferido pelo Cloudflare Access; aqui, o Gui, como se tivesse entrado
vi.mock('../src/lib/servidor/acesso', async (original) => {
  const real = await original<typeof import('../src/lib/servidor/acesso')>();
  return {
    ...real,
    usuarioDoPedido: async (request: Request) => (env.AMBIENTE === 'producao' ? { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: [] } : real.usuarioDoPedido(request)),
    // O middleware da D1a pergunta primeiro quem pede e depois lê a pessoa no banco
    pessoaQuePede: async (request: Request) => (env.AMBIENTE === 'producao' ? 'gui' : real.pessoaQuePede(request)),
  };
});
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

const COPIAS = { formato: 'webp' as const, pequena: [480, 360] as [number, number], media: [1600, 1200] as [number, number], original: [4000, 3000] as [number, number], bytes: 10 };

describe.skipIf(!comSqlite)('o marcador pelo middleware, onde há "Ver como" e na produção', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const { onRequest } = await import('../src/middleware');
  const fotos = await import('../src/pages/fotos/[...chave]');

  /** Um pedido pelo middleware de verdade: a página "desenha" os endereços de uma foto e de um retrato. */
  const pagina = async (como?: string) => {
    const request = new Request('http://localhost/memorias/1992-chegada-do-gui', { headers: como ? { Cookie: `como=${como}` } : {} });
    const contexto = { request, url: new URL(request.url), isPrerendered: false, locals: {} as Record<string, unknown>, rewrite: () => new Response('') };
    const resposta = await (onRequest as unknown as (c: typeof contexto, p: () => Promise<Response>) => Promise<Response>)(contexto, async () =>
      new Response(JSON.stringify({ foto: enderecoDaFoto('exemplos/karol-6.jpg', 'pequena'), retrato: enderecoDoRetrato('exemplos/chico-1.jpg'), pessoa: (contexto.locals.usuario as { pessoa: string }).pessoa })),
    );
    return (await resposta.json()) as { foto: string; retrato: string; pessoa: string };
  };

  it('nas prévias, o endereço leva a pessoa vista, e o "Ver como" troca o endereço', async () => {
    env.AMBIENTE = 'previa';
    expect(await pagina('elizete')).toEqual({ foto: '/fotos/pequena/exemplos/karol-6.jpg?v=elizete', retrato: '/retratos/pequeno/exemplos/chico-1.jpg?v=elizete', pessoa: 'elizete' });
    expect(await pagina('giovanna')).toMatchObject({ foto: '/fotos/pequena/exemplos/karol-6.jpg?v=giovanna', pessoa: 'giovanna' });
    // Sem escolha, o Gui
    expect((await pagina()).foto).toBe('/fotos/pequena/exemplos/karol-6.jpg?v=gui');
    // Fora de um pedido, nada fica do pedido anterior
    expect(enderecoDaFoto('2026/x.jpg')).toBe('/fotos/2026/x.jpg');
  });

  it('na produção, nenhum endereço recebe o marcador', async () => {
    vi.stubEnv('DEV', false);
    env.AMBIENTE = 'producao';
    try {
      expect(await pagina('elizete')).toEqual({ foto: '/fotos/pequena/exemplos/karol-6.jpg', retrato: '/retratos/pequeno/exemplos/chico-1.jpg', pessoa: 'gui' });
    } finally {
      env.AMBIENTE = 'previa';
      vi.unstubAllEnvs();
    }
  });

  it('o marcador nunca muda quem vê: a rota das fotos confere pela pessoa do pedido e ignora o "?v="', async () => {
    env.AMBIENTE = 'previa';
    const usuarioDe = (pessoa: string) => {
      const i = banco.sqlite.prepare('SELECT nome, admin FROM integrantes WHERE id = ?').get(pessoa) as { nome: string; admin: number };
      const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
      return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
    };
    // Um rascunho da Giovanna: a Elizete não vê a foto, nem com o marcador da Giovanna
    const tipo = (banco.sqlite.prepare('SELECT id FROM tipos LIMIT 1').get() as { id: string }).id;
    const chave = '2026/d1d0cccc-0000-4000-8000-000000000001.jpg';
    banco.sqlite.prepare(`INSERT INTO memorias (id, titulo, ano, tipo, situacao, criada_por) VALUES ('d1d-rascunho-da-giovanna', 'Rascunho', 2001, ?, 'rascunho', 'giovanna')`).run(tipo);
    banco.sqlite.prepare(`INSERT INTO fotos (memoria_id, chave, enviada_por) VALUES ('d1d-rascunho-da-giovanna', ?, 'giovanna')`).run(chave);
    const pedir = async (quem: string, endereco: string) => {
      const request = new Request(`http://localhost${endereco}`);
      const caminho = new URL(request.url).pathname.slice('/fotos/'.length);
      return (await fotos.GET({ params: { chave: caminho }, request, locals: { usuario: usuarioDe(quem) } } as never)).status;
    };
    expect(await pedir('elizete', `/fotos/${chave}?v=giovanna`)).toBe(404);
    expect(await pedir('elizete', `/fotos/${chave}`)).toBe(404);
  });
});

// Depois do middleware: estes trocam o leitor do marcador
describe('o marcador nas peças que montam os endereços', () => {
  it('sem pessoa vista, o endereço fica como está', () => {
    lerMarcadorDe(() => undefined);
    expect(enderecoDaFoto('2026/x.jpg')).toBe('/fotos/2026/x.jpg');
    expect(enderecoDaFoto('2026/x.jpg', 'pequena')).toBe('/fotos/pequena/2026/x.jpg');
    expect(enderecoDoRetrato('r.jpg')).toBe('/retratos/pequeno/r.jpg');
    expect(fontesDaFoto({ chave: '2026/x.jpg', copias: COPIAS }, 'inteira')).toEqual({ src: '/fotos/media/2026/x.jpg', srcset: '/fotos/media/2026/x.jpg 1600w, /fotos/2026/x.jpg 4000w', sizes: '100vw' });
  });

  it('com pessoa vista, toda foto, cópia e retrato leva o marcador dela, e trocar de pessoa troca o endereço', () => {
    let pessoa = 'elizete';
    lerMarcadorDe(() => pessoa);
    expect(enderecoDaFoto('2026/x.jpg')).toBe('/fotos/2026/x.jpg?v=elizete');
    expect(enderecoDaFoto('exemplos/karol-6.jpg', 'media')).toBe('/fotos/media/exemplos/karol-6.jpg?v=elizete');
    expect(enderecoDoRetrato('r.jpg')).toBe('/retratos/pequeno/r.jpg?v=elizete');
    expect(enderecoDoRetratoInteiro('r.jpg')).toBe('/retratos/r.jpg?v=elizete');
    const fontes = fontesDaFoto({ chave: '2026/x.jpg', copias: COPIAS }, 'pequena', '160px');
    for (const endereco of [fontes.src, ...(fontes.srcset ?? '').split(', ').map((e) => e.split(' ')[0])]) expect(endereco).toMatch(/\?v=elizete$/);
    const grande = fontesDoRetrato(enderecoDoRetrato('r.jpg'), true);
    expect(grande).toEqual({ src: '/retratos/pequeno/r.jpg?v=elizete', srcset: '/retratos/pequeno/r.jpg?v=elizete 400w, /retratos/r.jpg?v=elizete 800w', sizes: '300px' });
    const antes = enderecoDaFoto('2026/x.jpg', 'pequena');
    pessoa = 'lucas-magno';
    expect(enderecoDaFoto('2026/x.jpg', 'pequena')).not.toBe(antes);
    expect(comMarcador('/fotos/x.jpg?download=1')).toBe('/fotos/x.jpg?download=1&v=lucas-magno');
  });

  it('nenhum endereço de foto ou retrato é montado à mão fora das peças que põem o marcador', () => {
    const fontes = import.meta.glob<string>(['../src/**/*.ts', '../src/**/*.astro'], { query: '?raw', import: 'default', eager: true });
    const PECAS = ['../src/lib/copias-das-fotos.ts', '../src/lib/retratos.ts'];
    const montados: string[] = [];
    for (const [arquivo, texto] of Object.entries(fontes)) {
      if (PECAS.includes(arquivo)) continue;
      // As rotas que entregam os arquivos leem o caminho; elas não desenham endereço
      if (/src\/pages\/(fotos|retratos)\//.test(arquivo)) continue;
      const codigo = texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const linha of codigo.split('\n')) if (/['"`]\/(fotos|retratos)\/|\/(fotos|retratos)\/\$\{/.test(linha)) montados.push(`${arquivo}: ${linha.trim()}`);
    }
    expect(montados).toEqual([]);
  });
});
