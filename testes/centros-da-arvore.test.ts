// Os centros da árvore na administração (onda 2, decisão do Gui de 17/11/2026): os administradores
// escolhem de quem é a linha direta quando a árvore abre; "Partir de" continua para todos. Só serve
// quem tem laço de árvore e quem o administrador vê. Testado com a rota de verdade (api/ajustes.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { CENTROS_PADRAO, centrosDaArvore, centrosValidos } from '../src/lib/centros-da-arvore';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe('as regras dos centros', () => {
  const todos = () => true;
  it('sem escolha, o padrão: Gui, Giovanna e Lucas Magno', () => {
    expect(centrosDaArvore(undefined, todos)).toEqual(CENTROS_PADRAO);
    expect(centrosDaArvore(null, todos)).toEqual(CENTROS_PADRAO);
  });
  it('a escolha vale sem repetir, até quatro, só quem serve', () => {
    expect(centrosValidos(['a', 'a', 'b', '', 'c', 'd', 'e'], todos)).toEqual(['a', 'b', 'c', 'd']);
    expect(centrosDaArvore(['elizete', 'sumiu'], (id) => id !== 'sumiu')).toEqual(['elizete']);
  });
  it('quando nenhum escolhido serve mais, volta o padrão', () => {
    expect(centrosDaArvore(['sumiu'], (id) => id !== 'sumiu')).toEqual(CENTROS_PADRAO);
  });
  it('a árvore lê a escolha, e "Partir de" continua', () => {
    const arvore = readFileSync('src/pages/arvore.astro', 'utf-8');
    expect(arvore).toContain('centrosDaArvore(await lerAjuste(AJUSTE_DOS_CENTROS)');
    expect(arvore).toContain('<span>Partir de</span>');
  });
});

describe.skipIf(!comSqlite)('a rota dos ajustes', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const rota = await import('../src/pages/api/ajustes');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const sql = (texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...v);
  const gui: Usuario = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };
  const elizete: Usuario = { pessoa: 'elizete', nome: 'Elizete', admin: false, nucleos: ['bayara-nascimento'] };
  const pedir = async (quem: Usuario, campos: [string, string][]) => {
    const f = new FormData();
    for (const [k, v] of campos) f.append(k, v);
    const request = new Request('http://localhost/api/ajustes', { method: 'POST', headers: { Origin: 'http://localhost' }, body: f });
    const r = await rota.POST({ request, locals: { usuario: quem } } as never);
    return decodeURIComponent((r.headers.get('Location') ?? '').replace(/\+/g, ' '));
  };
  // Uma pessoa que só existe num laço "só eu vejo" da Giovanna, com um filho: o Gui não a vê
  sql(`INSERT INTO integrantes (id, nome) VALUES ('t-secreta', 'Secreta'), ('t-filho', 'Filho')`);
  sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('giovanna', 't-secreta', 'amiga', 1)`);

  it('quem não administra não muda', async () => {
    expect(await pedir(elizete, [['acao', 'centros'], ['centro', 'elizete']])).toContain('Só os administradores');
    expect(await repo.lerAjuste('centros-da-arvore')).toBeUndefined();
  });

  it('o administrador escolhe, e fica só quem tem laço de árvore e quem ele vê', async () => {
    expect(await pedir(gui, [['acao', 'centros'], ['centro', 'elizete'], ['centro', 't-secreta'], ['centro', 'elizete']])).toContain('Centros da árvore salvos.');
    expect(await repo.lerAjuste('centros-da-arvore')).toEqual(['elizete']);
  });

  it('sem ninguém que sirva, recusa e guarda o que estava', async () => {
    expect(await pedir(gui, [['acao', 'centros'], ['centro', 't-secreta']])).toContain('Escolha pelo menos uma pessoa');
    expect(await repo.lerAjuste('centros-da-arvore')).toEqual(['elizete']);
  });

  it('voltar ao padrão guarda a escolha anterior no histórico', async () => {
    await pedir(gui, [['acao', 'centros-padrao']]);
    expect(await repo.lerAjuste('centros-da-arvore')).toBeNull();
    const versoes = banco.sqlite.prepare(`SELECT dados, autor FROM versoes WHERE tipo = 'ajuste'`).all() as { dados: string; autor: string }[];
    expect(versoes.at(-1)).toEqual({ dados: '["elizete"]', autor: 'gui' });
  });
});
