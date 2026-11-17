// Fotos pelo relato (docs/decisoes.md): quem escreve um relato pode acrescentar fotos à memória no mesmo
// formulário. Testado com as consultas de verdade (src/lib/servidor/repositorio.ts) e a rota do relato
// (src/pages/api/relatos.ts), sobre o banco SQLite em memória (testes/apoio/d1.ts).
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('fotos pelo relato', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const { POST } = await import('../src/pages/api/relatos');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;

  const sql = (texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...valores);
  const linha = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...valores) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const gui = usuarioDe('gui');
  const giovanna = usuarioDe('giovanna');
  const elizete = usuarioDe('elizete');

  // Uma memória aberta a todos, com uma foto principal da Giovanna; outra sem foto; e uma só da família
  // Bracarense, que a Elizete não vê
  const memoria = (id: string, visibilidade: 'todos' | 'nucleos') => {
    sql(
      `INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por, publicada_em) VALUES (?, ?, 2001, 'outro', ?, 'publicada', 'giovanna', datetime('now'))`,
      id,
      `Teste ${id}`,
      visibilidade,
    );
    if (visibilidade === 'nucleos') sql('INSERT INTO memoria_nucleos VALUES (?, ?)', id, 'bracarense');
  };
  memoria('t-aberta', 'todos');
  memoria('t-sem-foto', 'todos');
  memoria('t-restrita', 'nucleos');
  sql(`INSERT INTO fotos (memoria_id, chave, principal, ordem, enviada_por) VALUES ('t-aberta', 'teste/principal.jpg', 1, 0, 'giovanna')`);
  const principalDaAberta = Number(linha<{ id: number }>(`SELECT id FROM fotos WHERE chave = 'teste/principal.jpg'`).id);

  let numero = 0;
  const solta = async (quem: Usuario) => repo.registrarFoto(`teste/${quem.pessoa}-${numero++}.jpg`, quem);
  const foto = (id: number) => linha<{ memoria_id: string | null; relato_id: number | null; principal: number; ordem: number; legenda: string | null; removida_em: string | null }>('SELECT * FROM fotos WHERE id = ?', id);

  const salvar = async (quem: Usuario, corpo: Record<string, unknown>) => {
    const request = new Request('http://localhost/api/relatos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
      body: JSON.stringify({ por: quem.pessoa, texto: 'Lembro desse dia.', ...corpo }),
    });
    const resposta = await POST({ request, locals: { usuario: quem } } as unknown as Parameters<typeof POST>[0]);
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };
  const relatoDe = (quem: Usuario, memoriaId: string) => linha<{ id: number }>('SELECT id FROM relatos WHERE memoria_id = ? AND registrado_por = ?', memoriaId, quem.pessoa).id;

  it('quem vê a memória prende fotos pelo relato, no fim da ordem, sem mexer na principal', async () => {
    const [a, b] = [await solta(gui), await solta(gui)];
    const { status } = await salvar(gui, { memoria: 't-aberta', fotos: [{ id: a, legenda: 'A mesa' }, { id: b }] });
    expect(status).toBe(201);
    const relato = relatoDe(gui, 't-aberta');
    expect(foto(a)).toMatchObject({ memoria_id: 't-aberta', relato_id: relato, principal: 0, ordem: 1, legenda: 'A mesa' });
    expect(foto(b)).toMatchObject({ memoria_id: 't-aberta', relato_id: relato, principal: 0, ordem: 2 });
    expect(foto(principalDaAberta).principal).toBe(1);
    // Na memória, a foto guarda o relato com que veio, para aparecer pequena no bilhete dele
    const lida = (await repo.obterMemoria(elizete, 't-aberta'))!;
    expect(lida.fotos.map((f) => [f.id, f.relatoId])).toEqual([
      [principalDaAberta, null],
      [a, relato],
      [b, relato],
    ]);
  });

  it('numa memória sem foto, a primeira que chega pelo relato vira a principal', async () => {
    const [a, b] = [await solta(giovanna), await solta(giovanna)];
    await salvar(giovanna, { memoria: 't-sem-foto', fotos: [{ id: a }, { id: b }] });
    expect(foto(a)).toMatchObject({ memoria_id: 't-sem-foto', principal: 1, ordem: 0 });
    expect(foto(b)).toMatchObject({ memoria_id: 't-sem-foto', principal: 0, ordem: 1 });
  });

  it('quem não vê a memória não prende foto nela', async () => {
    const a = await solta(elizete);
    const { status } = await salvar(elizete, { memoria: 't-restrita', fotos: [{ id: a }] });
    expect(status).toBe(404);
    expect(foto(a)).toMatchObject({ memoria_id: null, relato_id: null });
  });

  it('ninguém prende foto enviada por outra pessoa, nem foto que já é de outra memória ou de outro relato', async () => {
    const daGiovanna = await solta(giovanna);
    const deOutraMemoria = Number(linha<{ id: number }>(`SELECT id FROM fotos WHERE memoria_id = 't-sem-foto' ORDER BY id LIMIT 1`).id);
    const doRelatoDoGui = Number(linha<{ id: number }>(`SELECT id FROM fotos WHERE memoria_id = 't-aberta' AND relato_id IS NOT NULL ORDER BY id LIMIT 1`).id);
    const minha = await solta(elizete);
    await salvar(elizete, { memoria: 't-aberta', fotos: [{ id: daGiovanna }, { id: deOutraMemoria }, { id: doRelatoDoGui }, { id: minha }] });
    const relato = relatoDe(elizete, 't-aberta');
    expect(foto(daGiovanna)).toMatchObject({ memoria_id: null, relato_id: null });
    expect(foto(deOutraMemoria).memoria_id).toBe('t-sem-foto');
    expect(foto(doRelatoDoGui).relato_id).toBe(relatoDe(gui, 't-aberta'));
    expect(foto(minha)).toMatchObject({ memoria_id: 't-aberta', relato_id: relato });
  });

  it('com o relato em rascunho, a foto espera presa a ele, e só quem enviou a vê; ao publicar, entra na memória', async () => {
    const lucas = usuarioDe('lucas-magno');
    const a = await solta(lucas);
    await salvar(lucas, { memoria: 't-sem-foto', situacao: 'rascunho', fotos: [{ id: a, legenda: 'Antes' }] });
    const relato = relatoDe(lucas, 't-sem-foto');
    expect(foto(a)).toMatchObject({ memoria_id: null, relato_id: relato, legenda: 'Antes' });
    expect(await repo.podeVerFoto(lucas, `teste/lucas-magno-${numero - 1}.jpg`)).toBe(true);
    expect(await repo.podeVerFoto(gui, `teste/lucas-magno-${numero - 1}.jpg`)).toBe(false);
    expect((await repo.obterMemoria(gui, 't-sem-foto'))!.fotos.some((f) => f.id === a)).toBe(false);
    // O formulário da memória não leva a foto que espera o relato
    expect((await repo.obterFotos([a]))[0]).toMatchObject({ memoriaId: null, relatoId: relato });
    // Publicar sem a lista (o formulário sem script) também leva as fotos que esperavam
    await salvar(lucas, { memoria: 't-sem-foto', situacao: 'publicada' });
    expect(foto(a)).toMatchObject({ memoria_id: 't-sem-foto', relato_id: relato, principal: 0, ordem: 2 });
    expect(await repo.podeVerFoto(gui, `teste/lucas-magno-${numero - 1}.jpg`)).toBe(true);
  });

  it('a foto que sai da lista do relato vai para a lixeira, e a principal da memória não muda', async () => {
    const relato = relatoDe(gui, 't-aberta');
    const [primeira, segunda] = (await repo.listarFotosDoRelato(relato)).map((f) => f.id);
    await salvar(gui, { memoria: 't-aberta', fotos: [{ id: primeira!, legenda: 'A mesa posta' }] });
    expect(foto(segunda!).removida_em).not.toBeNull();
    expect(foto(primeira!)).toMatchObject({ legenda: 'A mesa posta', ordem: 1, removida_em: null });
    expect(foto(principalDaAberta).principal).toBe(1);
    expect((await repo.listarFotosDoRelato(relato)).map((f) => f.id)).toEqual([primeira]);
  });

  it('sem a lista, as fotos do relato ficam como estão', async () => {
    const relato = relatoDe(gui, 't-aberta');
    const antes = (await repo.listarFotosDoRelato(relato)).map((f) => f.id);
    await salvar(gui, { memoria: 't-aberta', texto: 'Lembro melhor agora.' });
    expect((await repo.listarFotosDoRelato(relato)).map((f) => f.id)).toEqual(antes);
  });
});
