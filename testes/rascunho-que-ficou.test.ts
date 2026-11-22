// O rascunho de quem não publicou primeiro o relato de quem não acessa o site (resposta do Gui à P4 do QA
// de 23/11/2026, docs/historico/qa/2026-11-23-perguntas.md). Cada pessoa pode ter o seu rascunho do relato
// do Aguilar; quando outra pessoa publica, a página de quem ficou para trás mostra, embaixo do recado, o
// texto do rascunho, para copiar, e "Descartar este rascunho", que o manda para a lixeira dela. O relato
// publicado continua em "Na memória". Só quem escreveu o rascunho vê o texto dele.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe('a página do relato', () => {
  const pagina = readFileSync('src/pages/memorias/[id]/relato.astro', 'utf8');

  it('mostra o rascunho que ficou e a saída, só para quem o escreveu', () => {
    // O rascunho vem de obterRascunhoQueFicou, que busca pelo registrado_por de quem olha
    expect(pagina).toContain('obterRascunhoQueFicou(memoria.id, por, usuario)');
    expect(pagina).toContain('Descartar este rascunho');
    expect(pagina).toMatch(/action="\/api\/lixeira"[\s\S]*?name="acao" value="descartar-relato"/);
  });

  it('o relato publicado por outra pessoa continua em "Na memória"', () => {
    expect(pagina).toContain("r.situacao === 'publicada' && (bloqueado || r.id !== existente?.id)");
  });
});

describe.skipIf(!comSqlite)('o rascunho que ficou, no banco e na rota', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const lixeira = await import('../src/pages/api/lixeira');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const tipos = await repo.listarTipos();

  const sql = (texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...valores);
  const linha = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...valores) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const [gui, elizete, giovanna] = ['gui', 'elizete', 'giovanna'].map(usuarioDe);
  const pedir = async (quem: Usuario, campos: Record<string, string>) => {
    const dados = new FormData();
    for (const [k, v] of Object.entries(campos)) dados.set(k, v);
    const request = new Request('http://localhost/api/lixeira', { method: 'POST', headers: { Origin: 'http://localhost' }, body: dados });
    const resposta = await lixeira.POST({ request, locals: { usuario: quem, tipos } } as unknown as Parameters<typeof lixeira.POST>[0]);
    const local = new URL(resposta.headers.get('Location') ?? '/', 'http://localhost');
    return { status: resposta.status, local: local.pathname + decodeURIComponent(local.search), erro: local.searchParams.get('erro'), ok: local.searchParams.get('ok') };
  };

  // Uma memória aberta a todos, com o Aguilar, que não acessa o site. A Elizete e o Gui começaram o
  // rascunho do relato dele; a Elizete publicou
  sql(`INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por) VALUES ('rq', 'Rascunhos do Aguilar', 1990, ?, 'todos', 'publicada', 'gui')`, tipos[0].id);
  sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, publicado_em) VALUES ('rq', 'aguilar', 'elizete', 'O Aguilar contou, pela Elizete.', 'publicada', datetime('now'))`);
  sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES ('rq', 'aguilar', 'gui', 'O que o Gui ouviu do Aguilar.\n\nE mais um pedaço.', 'rascunho')`);
  const doGui = linha<{ id: number }>(`SELECT id FROM relatos WHERE memoria_id = 'rq' AND registrado_por = 'gui'`).id;

  it('só quem escreveu o rascunho o recebe', async () => {
    expect((await repo.obterRascunhoQueFicou('rq', 'aguilar', gui))?.texto).toBe('O que o Gui ouviu do Aguilar.\n\nE mais um pedaço.');
    expect(await repo.obterRascunhoQueFicou('rq', 'aguilar', elizete)).toBeUndefined();
    expect(await repo.obterRascunhoQueFicou('rq', 'aguilar', giovanna)).toBeUndefined();
    // Para o Gui, o relato do Aguilar que vale é o publicado, e ele está entre os relatos da memória
    expect((await repo.obterRelato('rq', 'aguilar', gui))?.registradoPor).toBe('elizete');
    expect((await repo.listarRelatos(gui, 'rq')).filter((r) => r.situacao === 'publicada').map((r) => r.texto)).toEqual(['O Aguilar contou, pela Elizete.']);
  });

  it('quem não tem o rascunho não descarta nada', async () => {
    const r = await pedir(giovanna, { acao: 'descartar-relato', memoria: 'rq', por: 'aguilar' });
    expect(r.erro).toBe('Rascunho não encontrado.');
    expect(linha<{ d: string | null }>('SELECT descartado_em AS d FROM relatos WHERE id = ?', doGui).d).toBeNull();
    // A Elizete publicou: o relato dela não é um rascunho que ficou
    await pedir(elizete, { acao: 'descartar-relato', memoria: 'rq', por: 'aguilar' });
    expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM relatos WHERE memoria_id = 'rq' AND descartado_em IS NOT NULL`).n).toBe(0);
  });

  it('descartar manda o rascunho para a lixeira de quem o escreveu, e ele some das listas', async () => {
    expect((await repo.listarRascunhosDeRelato(gui)).map((r) => r.id)).toContain(doGui);
    const r = await pedir(gui, { acao: 'descartar-relato', memoria: 'rq', por: 'aguilar' });
    expect(r.local).toContain('/memorias/rq/relato?por=aguilar');
    expect(r.ok).toBe('Rascunho descartado. Ele fica na lixeira e pode ser restaurado.');
    expect(await repo.obterRascunhoQueFicou('rq', 'aguilar', gui)).toBeUndefined();
    expect((await repo.listarRascunhosDeRelato(gui)).map((r) => r.id)).not.toContain(doGui);
    expect((await repo.listarRelatosRegistradosPor(gui)).map((r) => r.id)).not.toContain(doGui);
    expect((await repo.listarRelatos(gui, 'rq')).map((r) => r.id)).not.toContain(doGui);
    expect((await repo.listarRascunhosDeRelatoDescartados(gui)).map((r) => r.id)).toEqual([doGui]);
    expect(await repo.listarRascunhosDeRelatoDescartados(elizete)).toEqual([]);
    // Nada é apagado: o texto continua no banco
    expect(linha<{ texto: string }>('SELECT texto FROM relatos WHERE id = ?', doGui).texto).toContain('O que o Gui ouviu');
  });

  it('só quem escreveu restaura, e o rascunho volta como estava', async () => {
    const recusado = await pedir(elizete, { acao: 'restaurar-rascunho-de-relato', memoria: 'rq', relato: String(doGui) });
    expect(recusado.erro).toBe('Rascunho não encontrado na lixeira.');
    expect(linha<{ d: string | null }>('SELECT descartado_em AS d FROM relatos WHERE id = ?', doGui).d).not.toBeNull();
    const r = await pedir(gui, { acao: 'restaurar-rascunho-de-relato', memoria: 'rq', relato: String(doGui) });
    expect(r.ok).toBe('Rascunho restaurado.');
    expect(r.local).toContain(`/lixeira?rascunho-de-relato=${doGui}&memoria=rq&por=aguilar`);
    expect((await repo.obterRascunhoQueFicou('rq', 'aguilar', gui))?.id).toBe(doGui);
    expect(await repo.listarRascunhosDeRelatoDescartados(gui)).toEqual([]);
  });
});
