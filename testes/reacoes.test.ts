// Reações (onda 2, decisão do Gui de 17/11/2026): em relato e em foto, quatro símbolos dos rabiscos do
// site. Só reage quem vê o item; "Quem marcou" só mostra quem a pessoa vê, e a conta também. Rota de
// verdade (api/reacoes.ts) sobre o banco SQLite em memória.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { SIMBOLOS_DAS_REACOES, nomesDeQuemMarcou, ofereceEntrar, resumoDasReacoes } from '../src/lib/reacoes';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe('os símbolos', () => {
  it('são quatro, desenhados como rabiscos, nunca emoji', () => {
    expect(SIMBOLOS_DAS_REACOES.map((s) => s.id)).toEqual(['coracao', 'riso', 'saudade', 'estava']);
    for (const s of SIMBOLOS_DAS_REACOES) {
      expect(s.desenho).toMatch(/^<(path|circle)/);
      expect(s.desenho).not.toMatch(/\p{Extended_Pictographic}/u);
    }
    expect(SIMBOLOS_DAS_REACOES.filter((s) => s.provisorio).map((s) => s.id)).toEqual(['riso']);
    expect(readFileSync('src/components/visual/Reacoes.astro', 'utf-8')).not.toMatch(/\p{Extended_Pictographic}/u);
  });
  it('os nomes de quem marcou e a oferta de entrar em Quem estava', () => {
    expect(nomesDeQuemMarcou(['Gui', 'Elizete'])).toBe('Gui e Elizete');
    expect(nomesDeQuemMarcou(['a', 'b', 'c', 'd', 'e', 'f'])).toBe('a, b, c, d e mais 2');
    expect(ofereceEntrar(true, false)).toBe(true);
    expect(ofereceEntrar(true, true)).toBe(false);
  });
  it('o resumo: o total, as minhas e quem marcou cada uma, com "você" primeiro', () => {
    const r = resumoDasReacoes(new Map([['coracao', ['elizete', 'gui']], ['estava', ['elizete']]]), 'gui', (id) => ({ elizete: 'Elizete' })[id] ?? id);
    expect(r.total).toBe(3);
    expect(r.minhas).toEqual(['coracao']);
    expect(r.recebidas).toEqual([
      { simbolo: 'coracao', nome: 'Coração', conta: 2, quem: 'você e Elizete' },
      { simbolo: 'estava', nome: 'Eu estava lá', conta: 1, quem: 'Elizete' },
    ]);
    expect(resumoDasReacoes(undefined, 'gui', String)).toEqual({ total: 0, minhas: [], recebidas: [] });
  });
});

// Observação do Gui (18/11/2026): no padrão das redes. O coração à vista, os quatro ao segurar ou passar o
// mouse, e o número que abre quem marcou, sem o link "Quem marcou". Na memória, em cada relato e em cada foto.
describe('a peça no padrão das redes', () => {
  const peca = readFileSync('src/components/visual/Reacoes.astro', 'utf-8');
  const pagina = readFileSync('src/pages/memorias/[id].astro', 'utf-8');
  const cliente = readFileSync('src/lib/cliente/reacoes.ts', 'utf-8');
  it('o coração à vista, os quatro com o nome numa paleta e o número que abre quem marcou', () => {
    expect(peca).toContain('data-reacao-principal');
    expect(peca).toContain('<span class="reacao__nome">{s.nome}</span>');
    expect(peca).toContain('data-reacoes-numero');
    expect(peca).not.toContain('Quem marcou</summary>');
  });
  it('na memória, em cada relato e em cada foto', () => {
    expect(pagina).toContain('alvo="memoria"');
    expect(pagina).toContain('alvo="relato"');
    expect(pagina).toContain('alvo="foto"');
  });
  it('o script marca no lugar, segura no toque, abre com o mouse e, se falhar, volta ao formulário comum', () => {
    expect(cliente).toContain("headers: { Accept: 'application/json' }");
    expect(cliente).toContain("e.pointerType !== 'touch'");
    expect(cliente).toContain("e.pointerType !== 'mouse'");
    expect(cliente).toContain('form.submit();');
    expect(pagina).toContain('ligarReacoes();');
  });
  it('com movimento reduzido, o toque não anima', () => {
    const css = readFileSync('src/visual/pecas.css', 'utf-8');
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\s*\.reacao--pulsa \.icone/);
  });
});

describe.skipIf(!comSqlite)('reações pela rota', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const rota = await import('../src/pages/api/reacoes');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const sql = (texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...v);
  const linha = <T>(texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...v) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const [gui, elizete, magno] = ['gui', 'elizete', 'lucas-magno'].map(usuarioDe);
  const pedir = async (quem: Usuario, campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    const request = new Request('http://localhost/api/reacoes', { method: 'POST', headers: { Origin: 'http://localhost' }, body: f });
    const r = await rota.POST({ request, locals: { usuario: quem } } as never);
    return decodeURIComponent((r.headers.get('Location') ?? '').replace(/\+/g, ' '));
  };
  // O script da página pede JSON e redesenha no lugar
  const pedirJson = async (quem: Usuario, campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    const request = new Request('http://localhost/api/reacoes', { method: 'POST', headers: { Origin: 'http://localhost', Accept: 'application/json' }, body: f });
    const r = await rota.POST({ request, locals: { usuario: quem } } as never);
    return { status: r.status, json: (await r.json()) as Record<string, unknown> };
  };
  // Uma memória só da família Bayara, com um relato e uma foto; e uma pessoa que só a Elizete vê
  sql(`INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por, publicada_em) VALUES ('t-rea', 'Almoço', 2001, 'causo', 'nucleos', 'publicada', 'gui', datetime('now'))`);
  sql(`INSERT INTO memoria_nucleos VALUES ('t-rea', 'bayara-nascimento')`);
  sql(`INSERT INTO memoria_integrantes VALUES ('t-rea', 'gui')`);
  sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, publicado_em) VALUES ('t-rea', 'gui', 'gui', 'Comemos muito', datetime('now'))`);
  sql(`INSERT INTO fotos (memoria_id, chave, enviada_por) VALUES ('t-rea', '2026/aaaaaaaa-0000-0000-0000-0000000000f1.jpg', 'gui')`);
  const relato = linha<{ id: number }>(`SELECT id FROM relatos WHERE memoria_id = 't-rea'`).id;
  const foto = linha<{ id: number }>(`SELECT id FROM fotos WHERE memoria_id = 't-rea'`).id;
  const alvos = new Set([`relato:${relato}`, `foto:${foto}`]);

  it('quem vê reage, e o segundo toque desmarca', async () => {
    await pedir(elizete, { acao: 'reagir', memoria: 't-rea', alvo: 'relato', alvoId: String(relato), simbolo: 'coracao' });
    expect((await repo.listarReacoes('t-rea', gui, alvos)).get(`relato:${relato}`)?.get('coracao')).toEqual(['elizete']);
    await pedir(elizete, { acao: 'reagir', memoria: 't-rea', alvo: 'relato', alvoId: String(relato), simbolo: 'coracao' });
    expect((await repo.listarReacoes('t-rea', gui, alvos)).size).toBe(0);
  });

  it('quem não vê a memória não reage: o mesmo que para uma que não existe', async () => {
    expect(await pedir(magno, { acao: 'reagir', memoria: 't-rea', alvo: 'foto', alvoId: String(foto), simbolo: 'riso' })).toContain('Memória não encontrada');
    expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM reacoes WHERE pessoa = 'lucas-magno'`).n).toBe(0);
  });

  it('a reação de quem a pessoa não vê não entra nos nomes nem na conta', async () => {
    sql(`INSERT INTO integrantes (id, nome) VALUES ('t-oculta', 'Oculta')`);
    sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('elizete', 't-oculta', 'amiga', 1)`);
    sql(`INSERT INTO reacoes (memoria_id, alvo, alvo_id, pessoa, simbolo) VALUES ('t-rea', 'foto', ?, 't-oculta', 'saudade')`, foto);
    expect((await repo.listarReacoes('t-rea', gui, alvos)).get(`foto:${foto}`)).toBeUndefined();
    expect((await repo.listarReacoes('t-rea', elizete, alvos)).get(`foto:${foto}`)?.get('saudade')).toEqual(['t-oculta']);
  });

  it('item que não é desta memória ou que a pessoa não vê é recusado', async () => {
    expect(await pedir(elizete, { acao: 'reagir', memoria: 't-rea', alvo: 'foto', alvoId: '999999', simbolo: 'riso' })).toContain('Foto não encontrada');
    expect(await pedir(elizete, { acao: 'reagir', memoria: 't-rea', alvo: 'relato', alvoId: String(relato), simbolo: 'emoji' })).toContain('Reação desconhecida');
  });

  it('"eu estava lá" oferece entrar em Quem estava, e só depois dele dá para entrar', async () => {
    expect(await pedir(elizete, { acao: 'entrar', memoria: 't-rea' })).toContain('Não foi possível');
    await pedir(elizete, { acao: 'reagir', memoria: 't-rea', alvo: 'foto', alvoId: String(foto), simbolo: 'estava' });
    expect(await repo.disseQueEstava('t-rea', elizete)).toBe(true);
    expect(await pedir(elizete, { acao: 'entrar', memoria: 't-rea' })).toContain('Você entrou em Quem estava');
    expect(linha(`SELECT integrante_id FROM memoria_integrantes WHERE memoria_id = 't-rea' AND integrante_id = 'elizete'`)).toBeDefined();
    expect(linha(`SELECT id FROM versoes WHERE tipo = 'memoria' AND item_id = 't-rea'`)).toBeDefined();
  });

  it('a memória inteira recebe reação, e o script recebe o resumo novo, sem recarregar', async () => {
    const { status, json } = await pedirJson(gui, { acao: 'reagir', memoria: 't-rea', alvo: 'memoria', simbolo: 'coracao' });
    expect(status).toBe(200);
    expect(json).toMatchObject({ marcou: true, resumo: { total: 1, minhas: ['coracao'] } });
    expect(linha(`SELECT alvo, alvo_id FROM reacoes WHERE memoria_id = 't-rea' AND alvo = 'memoria'`)).toEqual({ alvo: 'memoria', alvo_id: 0 });
    // O alvo 0 de outra memória não colide (a chave única conta a memória)
    sql(`INSERT INTO memorias (id, titulo, ano, tipo, situacao, criada_por, publicada_em) VALUES ('t-rea-2', 'Outra', 2002, 'causo', 'publicada', 'gui', datetime('now'))`);
    expect((await pedirJson(gui, { acao: 'reagir', memoria: 't-rea-2', alvo: 'memoria', simbolo: 'coracao' })).json).toMatchObject({ marcou: true });
    expect((await pedirJson(gui, { acao: 'reagir', memoria: 't-rea', alvo: 'memoria', simbolo: 'coracao' })).json).toMatchObject({ marcou: false, resumo: { total: 0 } });
  });

  it('o erro também chega ao script, em JSON', async () => {
    const { status, json } = await pedirJson(magno, { acao: 'reagir', memoria: 't-rea', alvo: 'memoria', simbolo: 'coracao' });
    expect(status).toBe(400);
    expect(json.erro).toBe('Memória não encontrada.');
  });

  it('o espelho apaga as reações antes das memórias', async () => {
    const { TABELAS_APAGADAS } = await import('../src/lib/espelho');
    expect(TABELAS_APAGADAS.indexOf('reacoes')).toBeLessThan(TABELAS_APAGADAS.indexOf('memorias'));
  });
});

// A paleta encostava no texto em volta (observação do Gui, 18/11/2026)
describe('a paleta de reações', () => {
  const pecas = readFileSync('src/visual/pecas.css', 'utf-8');
  const paleta = pecas.slice(pecas.indexOf('.reacoes__paleta {'), pecas.indexOf('}', pecas.indexOf('.reacoes__paleta {')));
  it('abre com respiro: longe do botão e com folga por dentro e entre os símbolos', () => {
    expect(paleta).toContain('bottom: calc(100% + var(--e-3));');
    expect(paleta).toContain('gap: var(--e-2);');
    expect(paleta).toContain('padding: var(--e-2) var(--e-3);');
  });
  it('a ponte embaixo cobre o vão, para o mouse chegar à paleta sem ela fechar', () => {
    expect(pecas).toMatch(/\.reacoes__paleta::after \{[^}]*inset: 100% 0 auto;[^}]*height: var\(--e-3\);/);
  });
});
