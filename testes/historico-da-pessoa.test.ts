// O histórico de pessoas e laços (onda 2, decisão do Gui de 17/11/2026): quem pode editar vê as versões e
// restaura uma. Cada versão de laço segue a regra de quem vê o laço de hoje: nada de casal restrito para
// quem não o veria, de laço "só eu vejo" de outra pessoa nem da proximidade do dono. Rota de verdade
// (api/historico-pessoa.ts) sobre o banco SQLite em memória.
import { describe, expect, it, vi } from 'vitest';
import { fichaParaComparar, oQueMudou, semOQueEDoDono, veAVersaoDoLaco, type VersaoDeLaco } from '../src/lib/historico-da-pessoa';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe('as regras do histórico', () => {
  it('diz o que mudou na ficha', () => {
    const antes = fichaParaComparar({ nome: 'Ana', apelido: 'Aninha', tipo: 'pessoa', nascimentoAno: 1950 });
    const depois = fichaParaComparar({ nome: 'Ana Maria', apelido: 'Aninha', tipo: 'pessoa', nascimentoAno: 1951 });
    expect(oQueMudou(antes, depois)).toEqual(['nome', 'nascimento']);
  });
  const eu = { pessoa: 'giovanna', nucleos: ['bayara-nascimento'] };
  it('o casal restrito só para quem veria o casal', () => {
    const casal: VersaoDeLaco = { tipo: 'casal', dados: { id: 1, a: 'gui', b: 'jean', fases: [], visibilidade: 'nucleos', nucleos: ['bracarense'], criadoPor: 'gui' } };
    expect(veAVersaoDoLaco(casal, eu, new Set())).toBe(false);
    expect(veAVersaoDoLaco(casal, { pessoa: 'x', nucleos: ['bracarense'] }, new Set())).toBe(true);
    expect(veAVersaoDoLaco({ ...casal, dados: { ...casal.dados, visibilidade: 'privado' } } as VersaoDeLaco, { pessoa: 'x', nucleos: ['bracarense'] }, new Set())).toBe(false);
  });
  it('o laço "só eu vejo" só para o dono, e nada de quem a pessoa não vê', () => {
    const laco: VersaoDeLaco = { tipo: 'laco-coracao', dados: { dono: 'gui', pessoa: 'ana', nome: 'amiga', papel: null, proximidade: 16, privado: 1 } };
    expect(veAVersaoDoLaco(laco, eu, new Set())).toBe(false);
    expect(veAVersaoDoLaco(laco, { pessoa: 'gui', nucleos: [] }, new Set())).toBe(true);
    const filiacao: VersaoDeLaco = { tipo: 'filiacao', dados: { filho: 'ana', responsavel: 'secreta', qualidade: 'biologica' } };
    expect(veAVersaoDoLaco(filiacao, eu, new Set(['secreta']))).toBe(false);
  });
  it('a proximidade é só do dono', () => {
    const laco: VersaoDeLaco = { tipo: 'laco-coracao', dados: { dono: 'gui', pessoa: 'ana', nome: 'amiga', papel: null, proximidade: 16, privado: 0 } };
    expect((semOQueEDoDono(laco, 'giovanna').dados as { proximidade: number | null }).proximidade).toBeNull();
    expect((semOQueEDoDono(laco, 'gui').dados as { proximidade: number | null }).proximidade).toBe(16);
  });
});

describe.skipIf(!comSqlite)('restaurar pela rota', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const rota = await import('../src/pages/api/historico-pessoa');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const sql = (texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...v);
  const linha = <T>(texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...v) as T;
  const gui: Usuario = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };
  const magno: Usuario = { pessoa: 'lucas-magno', nome: 'Lucas Magno', admin: true, nucleos: ['bayara-bracarense', 'bracarense'] };
  const pedir = async (quem: Usuario, pessoa: string, versao: number) => {
    const f = new FormData();
    f.set('pessoa', pessoa);
    f.set('versao', String(versao));
    const request = new Request('http://localhost/api/historico-pessoa', { method: 'POST', headers: { Origin: 'http://localhost' }, body: f });
    const r = await rota.POST({ request, locals: { usuario: quem } } as never);
    return decodeURIComponent((r.headers.get('Location') ?? '').replace(/\+/g, ' '));
  };
  sql(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('t-ana', 'Ana', 'gui'), ('t-bia', 'Bia', 'gui')`);
  sql(`INSERT INTO nucleo_membros (nucleo_id, integrante_id, papel) VALUES ('bayara-nascimento', 't-ana', 'parente'), ('bayara-nascimento', 't-bia', 'parente')`);

  it('restaura a ficha, e a de hoje vai para o histórico', async () => {
    const ana = (await repo.listarIntegrantes()).find((i) => i.id === 't-ana')!;
    await repo.atualizarIntegrante(ana, { nome: 'Ana Maria', tipo: 'pessoa', tratamento: 'ela' }, gui);
    const [versao] = await repo.listarVersoesDaFicha('t-ana');
    expect(await pedir(gui, 't-ana', versao!.id)).toContain('Versão restaurada');
    expect(linha<{ nome: string }>(`SELECT nome FROM integrantes WHERE id = 't-ana'`).nome).toBe('Ana');
    expect((await repo.listarVersoesDaFicha('t-ana'))[0]!.dados.nome).toBe('Ana Maria');
  });

  it('a filiação removida volta', async () => {
    await repo.salvarFiliacao('t-bia', 't-ana', 'adotiva', gui, { ano: 2001, mes: null, dia: null });
    await repo.removerFiliacao('t-bia', 't-ana', gui);
    const versao = (await repo.listarVersoesDosLacos('t-ana')).find((v) => v.tipo === 'filiacao')!;
    expect(await pedir(gui, 't-ana', versao.id)).toContain('Laço restaurado');
    expect(linha(`SELECT qualidade, adocao_ano FROM filiacoes WHERE filho_id = 't-bia'`)).toEqual({ qualidade: 'adotiva', adocao_ano: 2001 });
  });

  it('o casal restrito às famílias que o Magno não vê responde como versão que não existe', async () => {
    await repo.salvarCasal('t-ana', 't-bia', [{ tipo: 'namoro', inicioAno: null, fimAno: null }, { tipo: 'separacao', inicioAno: null, fimAno: null }], 'nucleos', gui, ['bayara-nascimento']);
    const casal = (await repo.listarCasais(gui)).find((c) => c.a === 't-ana')!;
    await repo.removerCasal(casal, gui);
    const versao = (await repo.listarVersoesDosLacos('t-ana')).find((v) => v.tipo === 'casal')!;
    expect(await pedir(magno, 't-ana', versao.id)).toContain('Versão não encontrada');
    expect(await pedir(gui, 't-ana', versao.id)).toContain('Casal restaurado');
    expect(linha<{ visibilidade: string }>(`SELECT visibilidade FROM casais WHERE a_id = 't-ana'`).visibilidade).toBe('nucleos');
  });

  it('o laço "só eu vejo" do Gui não é restaurado por outro administrador', async () => {
    sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado, proximidade) VALUES ('gui', 't-ana', 'amiga', 1, 1)`);
    const laco = linha<{ id: number }>(`SELECT id FROM lacos_coracao WHERE dono_id = 'gui' AND pessoa_id = 't-ana'`);
    await repo.removerLacoDoCoracao({ id: laco.id, dono: 'gui', pessoa: 't-ana', nome: 'amiga', papel: null, proximidade: 1, privado: true }, gui);
    const versao = (await repo.listarVersoesDosLacos('t-ana')).find((v) => v.tipo === 'laco-coracao')!;
    expect(await pedir(magno, 't-ana', versao.id)).toContain('Versão não encontrada');
    expect(await pedir(gui, 't-ana', versao.id)).toContain('Laço do coração restaurado');
    expect(linha(`SELECT privado, proximidade FROM lacos_coracao WHERE dono_id = 'gui' AND pessoa_id = 't-ana'`)).toEqual({ privado: 1, proximidade: 1 });
  });

  it('uma versão de outra pessoa não serve pela página desta', async () => {
    const [versao] = await repo.listarVersoesDaFicha('t-ana');
    expect(await pedir(gui, 't-bia', versao!.id)).toContain('Versão não encontrada');
  });
});
