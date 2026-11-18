// Ex-casal: quem vê e como aparece para mim (decisões do Gui, 18/11/2026). Dois controles em todo casal
// desfeito, de cada uma das duas pessoas: quem vê o laço (todos, famílias escolhidas ou só os dois) e
// como o ex aparece só para quem escolheu (presente, discreto ou fora). Os testes mostram que nada vaza:
// quem não vê o laço não recebe o casal em nenhuma lista, e a escolha de uma pessoa não muda o que as
// outras veem. Regras em src/lib/ex-casal.ts, permissoes.ts e arvore-montagem.ts; a rota de verdade,
// src/pages/api/lacos.ts, sobre o banco SQLite em memória.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { aplicarComoOsExesAparecem, type DadosDaArvore } from '../src/lib/arvore-montagem';
import { casalDesfeito, exesDe, modosQueValem, naListaDeQuemOlha } from '../src/lib/ex-casal';
import { Familia, podeVerCasal, type Casal } from '../src/lib/parentesco';
import { podeEscolherComoOExAparece, podeMudarQuemVeOCasal } from '../src/lib/servidor/permissoes';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

const separados = (visibilidade: Casal['visibilidade'] = 'todos', nucleos: string[] = []): Casal => ({
  id: 1,
  a: 'gui',
  b: 'jean',
  fases: [{ tipo: 'namoro', inicioAno: 2010, fimAno: null }, { tipo: 'separacao', inicioAno: 2014, fimAno: null }],
  visibilidade,
  nucleos,
  criadoPor: 'gui',
});
const usuario = (pessoa: string, nucleos: string[] = []) => ({ pessoa, nome: pessoa, admin: false, nucleos });

describe('quem vê o laço de um casal desfeito', () => {
  it('com famílias escolhidas, só as duas pessoas, quem cadastrou e os membros dessas famílias', () => {
    const c = separados('nucleos', ['bracarense']);
    expect(podeVerCasal('gui', c)).toBe(true);
    expect(podeVerCasal('jean', c)).toBe(true);
    expect(podeVerCasal('lucas-magno', c, ['bracarense'])).toBe(true);
    expect(podeVerCasal('giovanna', c, ['bayara-nascimento', 'bayara-bracarense'])).toBe(false);
    expect(podeVerCasal('giovanna', c)).toBe(false);
  });
  it('só os dois, como o privado de sempre', () => {
    expect(podeVerCasal('giovanna', separados('privado'), ['bracarense'])).toBe(false);
    expect(podeVerCasal('jean', separados('privado'))).toBe(true);
  });
  it('quem não vê o casal não ganha parentesco nenhum por ele', () => {
    const outros = [separados('nucleos', ['bracarense'])].filter((c) => podeVerCasal('giovanna', c, ['bayara-nascimento']));
    const familia = new Familia([], outros);
    expect(familia.relacao('giovanna', 'jean')).toBeUndefined();
    expect(familia.casais('gui')).toEqual([]);
  });
  it('mudam quem vê as duas pessoas do casal; com ninguém do casal no site, vale a regra dos laços', () => {
    const comAcesso = new Set(['gui', 'giovanna']);
    expect(podeMudarQuemVeOCasal(usuario('gui'), separados(), comAcesso).ok).toBe(true);
    expect(podeMudarQuemVeOCasal(usuario('giovanna'), separados(), comAcesso).ok).toBe(false);
    expect(podeMudarQuemVeOCasal(usuario('giovanna'), { ...separados(), a: 'avo', b: 'vo-ex' }, comAcesso).ok).toBe(true);
    // Num casal junto, quem vê continua com a regra dos laços
    expect(podeMudarQuemVeOCasal(usuario('giovanna'), { ...separados(), fases: [{ tipo: 'casamento', inicioAno: null, fimAno: null }] }, comAcesso).ok).toBe(true);
  });
});

describe('como o ex aparece para mim', () => {
  it('só uma das duas pessoas, e só depois que o casal terminou', () => {
    expect(casalDesfeito(separados())).toBe(true);
    expect(podeEscolherComoOExAparece(usuario('gui'), separados()).ok).toBe(true);
    expect(podeEscolherComoOExAparece(usuario('giovanna'), separados()).ok).toBe(false);
    expect(podeEscolherComoOExAparece(usuario('gui'), { ...separados(), fases: [{ tipo: 'casamento', inicioAno: null, fimAno: null }] }).ok).toBe(false);
  });
  it('a escolha só vale enquanto a pessoa for ex', () => {
    const exes = exesDe('gui', [separados()]);
    expect([...exes]).toEqual(['jean']);
    expect(modosQueValem(new Map([['jean', 'fora'], ['outra', 'discreto']]), exes)).toEqual(new Map([['jean', 'fora']]));
    expect(exesDe('gui', [separados(), { ...separados(), id: 2, visibilidade: 'privado', fases: [{ tipo: 'casamento', inicioAno: null, fimAno: null }] }]).size).toBe(0);
  });

  const dados: DadosDaArvore = {
    eu: 'gui',
    centros: ['gui'],
    nucleos: [{ id: 'bayara-nascimento', nome: 'Bayara' }],
    pessoas: [
      { id: 'gui', nome: 'Gui', rotulo: 'você', nucleos: ['bayara-nascimento'], bicho: false, anos: '1990' },
      { id: 'jean', nome: 'Jean', rotulo: 'seu ex', nucleos: [], bicho: false, anos: '1988', retrato: '/retratos/j.jpg', iniciais: 'J' },
      { id: 'mae-do-jean', nome: 'Dona Rosa', rotulo: 'sua ex-sogra', nucleos: [], bicho: false, anos: '1960' },
    ],
    filiacoes: [{ filho: 'jean', responsavel: 'mae-do-jean', consideracao: false }],
    casais: [{ a: 'gui', b: 'jean', ex: true }],
    coracao: [{ dono: 'gui', pessoa: 'mae-do-jean', papel: null, rotulo: 'amiga' }],
  };
  it('discreto: o cartão fica, com a marca, sem nome de laço, anos nem retrato, e o caminho continua', () => {
    const d = aplicarComoOsExesAparecem(dados, new Map([['jean', 'discreto']]));
    expect(d.pessoas.find((p) => p.id === 'jean')).toMatchObject({ discreto: true, rotulo: '', anos: '', retrato: null });
    expect(d.filiacoes).toEqual(dados.filiacoes);
    expect(d.casais).toEqual(dados.casais);
  });
  it('fora: sai da árvore com todos os laços dele, e quem tem outro caminho continua', () => {
    const d = aplicarComoOsExesAparecem(dados, new Map([['jean', 'fora']]));
    expect(d.pessoas.map((p) => p.id)).toEqual(['gui', 'mae-do-jean']);
    expect(d.filiacoes).toEqual([]);
    expect(d.casais).toEqual([]);
    expect(d.coracao).toHaveLength(1);
  });
  it('sem escolha, nada muda', () => {
    expect(aplicarComoOsExesAparecem(dados, new Map())).toBe(dados);
  });
  it('o cartão discreto não é link e tem a tarja; em "Quem estava" e em Pessoas, a tarja no lugar do nome', () => {
    const cliente = readFileSync('src/lib/cliente/arvore.ts', 'utf-8');
    expect(cliente).toContain("document.createElement('div')");
    expect(cliente).toContain('no__tarja');
    const memoria = readFileSync('src/pages/memorias/[id].astro', 'utf-8');
    expect(memoria).toMatch(/naListaDeQuemOlha\(modosDosExes\.get\(id\)\) === 'tarja' \? \([\s\S]*?<TarjaDoDiscreto \/>/);
    expect(memoria).toContain("naListaDeQuemOlha(modosDosExes.get(id)) !== 'fora'");
    const pessoas = readFileSync('src/pages/pessoas/index.astro', 'utf-8');
    expect(pessoas).toContain("filter((i) => comoAparece(i.id) !== 'fora')");
    expect(pessoas).toMatch(/comoAparece\(p\.id\) === 'tarja' \? \([\s\S]*?<TarjaDoDiscreto \/>/);
  });
  it('discreto fica com a tarja em Pessoas e em "Quem estava"; fora sai das duas (decisão do Gui, QA de 18/11/2026)', () => {
    expect(naListaDeQuemOlha('discreto')).toBe('tarja');
    expect(naListaDeQuemOlha('fora')).toBe('fora');
    expect(naListaDeQuemOlha('presente')).toBe('normal');
    expect(naListaDeQuemOlha(undefined)).toBe('normal');
  });
});

describe.skipIf(!comSqlite)('o ex-casal no banco e na rota', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const lacos = await import('../src/pages/api/lacos');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const sql = (texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...v);
  const linha = <T>(texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...v) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const [gui, giovanna, magno, elizete] = ['gui', 'giovanna', 'lucas-magno', 'elizete'].map(usuarioDe);
  const tipos = await repo.listarTipos();

  sql(`INSERT INTO integrantes (id, nome, tratamento, criado_por) VALUES ('t-jean', 'Jean', 'ele', 'gui'), ('t-rosa', 'Dona Rosa', 'ela', 'gui')`);
  sql(`INSERT INTO filiacoes (filho_id, responsavel_id) VALUES ('t-jean', 't-rosa')`);

  const salvarCasal = async (quem: Usuario, campos: Record<string, string | string[]>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ acao: 'casal-salvar', a: 'gui', b: 't-jean', volta: '/pessoas/gui/editar', 'fase-0-tipo': 'namoro', 'fase-0-inicio': '2010', 'fase-1-tipo': 'separacao', 'fase-1-inicio': '2014', ...campos })) {
      for (const valor of [v].flat()) f.append(k, valor);
    }
    const request = new Request('http://localhost/api/lacos', { method: 'POST', headers: { Origin: 'http://localhost' }, body: f });
    const r = await lacos.POST({ request, locals: { usuario: quem, tipos } } as never);
    return decodeURIComponent((r.headers.get('Location') ?? '').replace(/\+/g, ' '));
  };
  const vePar = async (quem: Usuario) => (await repo.listarCasais(quem)).some((c) => c.a === 'gui' && c.b === 't-jean');

  it('o Gui deixa o laço só para a família Bracarense: a Giovanna e a Elizete não recebem o casal, o Magno recebe', async () => {
    expect(await salvarCasal(gui, { visibilidade: 'nucleos', familiasDoCasal: ['bracarense'] })).toContain('Casal salvo');
    expect(linha<{ visibilidade: string }>(`SELECT visibilidade FROM casais WHERE a_id = 'gui' AND b_id = 't-jean'`).visibilidade).toBe('nucleos');
    expect(await vePar(gui)).toBe(true);
    expect(await vePar(magno)).toBe(true);
    expect(await vePar(giovanna)).toBe(false);
    expect(await vePar(elizete)).toBe(false);
    // O Jean continua no acervo para todos, como pessoa
    expect((await repo.listarIntegrantesQueVe(giovanna)).some((i) => i.id === 't-jean')).toBe(true);
  });

  it('famílias escolhidas pedem pelo menos uma família', async () => {
    expect(await salvarCasal(gui, { visibilidade: 'nucleos' })).toContain('Escolha pelo menos uma família');
  });

  it('o Magno vê o laço e salva as fases, mas quem vê continua como o Gui deixou', async () => {
    await salvarCasal(magno, { visibilidade: 'todos', 'fase-1-inicio': '2015' });
    expect(linha<{ visibilidade: string }>(`SELECT visibilidade FROM casais WHERE a_id = 'gui' AND b_id = 't-jean'`).visibilidade).toBe('nucleos');
    expect(await vePar(giovanna)).toBe(false);
  });

  it('como o Jean aparece é só do Gui: a Giovanna e o Magno não gravam nem leem a escolha', async () => {
    await salvarCasal(gui, { visibilidade: 'nucleos', familiasDoCasal: ['bracarense'], comoAparece: 'discreto' });
    expect(await repo.comoOsExesAparecem(gui)).toEqual(new Map([['t-jean', 'discreto']]));
    expect((await repo.comoOsExesAparecem(magno)).size).toBe(0);
    await salvarCasal(magno, { comoAparece: 'fora' });
    expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM ex_para_mim WHERE dono_id = 'lucas-magno'`).n).toBe(0);
    expect((await repo.comoOsExesAparecem(gui)).get('t-jean')).toBe('discreto');
  });

  it('"Presente" apaga a escolha, e voltar a ficar junto tira o efeito', async () => {
    await salvarCasal(gui, { visibilidade: 'nucleos', familiasDoCasal: ['bracarense'], comoAparece: 'presente' });
    expect((await repo.comoOsExesAparecem(gui)).size).toBe(0);
    sql(`INSERT INTO ex_para_mim (dono_id, pessoa_id, modo) VALUES ('gui', 't-jean', 'fora')`);
    expect((await repo.comoOsExesAparecem(gui)).get('t-jean')).toBe('fora');
    sql(`UPDATE casal_fases SET tipo = 'casamento' WHERE tipo = 'separacao' AND casal_id = (SELECT id FROM casais WHERE b_id = 't-jean')`);
    expect((await repo.comoOsExesAparecem(gui)).size).toBe(0);
    sql(`UPDATE casal_fases SET tipo = 'separacao' WHERE tipo = 'casamento' AND casal_id = (SELECT id FROM casais WHERE b_id = 't-jean')`);
  });

  it('não existe rota que leia a escolha de outra pessoa', () => {
    const rotas = ['api/lacos.ts', 'api/integrantes.ts', 'api/circulo.ts'].map((r) => readFileSync(`src/pages/${r}`, 'utf-8')).join('\n');
    expect(rotas).not.toMatch(/comoOsExesAparecem\(/);
  });

  it('o espelho apaga as escolhas e as famílias do casal antes dos casais', async () => {
    const { TABELAS_APAGADAS } = await import('../src/lib/espelho');
    expect(TABELAS_APAGADAS).toContain('ex_para_mim');
    expect(TABELAS_APAGADAS.indexOf('casal_nucleos')).toBeLessThan(TABELAS_APAGADAS.indexOf('casais'));
  });
});
