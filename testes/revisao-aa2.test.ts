// Revisão AA2 (23/11/2026): conferência independente da Sessão AA (PR #169, branch tst-criticas-e-fila)
// contra a lista fechada de 11 pontos. Cada ponto tem os próprios casos sobre o SQLite em memória
// (testes/apoio/d1.ts) e as rotas de verdade.
//
// Os casos com o nome começando por "bloqueia:" ou "fila:" registram defeitos reproduzidos nesta revisão
// (o que acontece hoje), para provar o caso sem alterar o código da branch testada.
import { describe, expect, it, vi } from 'vitest';
import { foraDoIndiceDaBusca } from './apoio/indice-da-busca';
import { ComandoDeTeste, temSqlite, type D1DeTeste } from './apoio/d1';

const NODE_FS = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ NODE_FS)) as { readFileSync(caminho: string, codificacao: 'utf-8'): string };

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('AA2: revisão da Sessão AA contra a lista fechada', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  await (await import('../src/lib/servidor/banco')).prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const permissoes = await import('../src/lib/servidor/permissoes');
  const pedidoDoRelato = await import('../src/lib/servidor/pedido-do-relato');
  const parentescoDoFiltro = await import('../src/lib/servidor/parentesco-de-quem-olha');
  const painel = await import('../src/lib/painel');
  const conta = await import('../src/lib/conta');
  const juntar = await import('../src/lib/juntar');
  const formularioDevolvido = await import('../src/lib/formulario-devolvido');
  const rotas = {
    avisos: await import('../src/pages/api/avisos'),
    duplicados: await import('../src/pages/api/duplicados'),
    memorias: await import('../src/pages/api/memorias'),
    relatos: await import('../src/pages/api/relatos'),
    integrantes: await import('../src/pages/api/integrantes'),
    lacos: await import('../src/pages/api/lacos'),
    capitulos: await import('../src/pages/api/capitulos'),
    tipos: await import('../src/pages/api/tipos'),
  };
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  type Rota = keyof typeof rotas;

  const tipos = await repo.listarTipos();
  const sql = banco.sqlite;
  const linhas = <T>(texto: string, ...valores: (string | number | null)[]) => sql.prepare(texto).all(...valores) as T[];
  const uma = <T>(texto: string, ...valores: (string | number | null)[]) => sql.prepare(texto).get(...valores) as T;
  const usuarioDe = (pessoa: string): Usuario => ({
    pessoa,
    nome: pessoa,
    admin: Boolean(uma<{ admin: number }>('SELECT admin FROM integrantes WHERE id = ?', pessoa).admin),
    nucleos: linhas<{ n: string }>(`SELECT nucleo_id AS n FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((l) => l.n),
  });

  // No acervo de exemplo: Gui, Giovanna e Elizete são membros de bayara-nascimento;
  // Magno é membro de bracarense e bayara-bracarense; Giovanna também é de bayara-bracarense.
  // Gui, Giovanna e Magno administram.
  const [gui, giovanna, elizete, magno] = ['gui', 'giovanna', 'elizete', 'lucas-magno'].map(usuarioDe);
  for (const p of [gui, giovanna, elizete, magno]) await repo.registrarAcesso(p.pessoa);

  const pedirJson = async (rota: Rota, quem: Usuario, corpo: Record<string, unknown>, origem = 'http://localhost') => {
    const request = new Request(`http://localhost/api/${rota}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origem },
      body: JSON.stringify(corpo),
    });
    const resposta = await rotas[rota].POST({ request, locals: { usuario: quem, tipos } } as never);
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };

  const semScript = async (
    rota: Rota,
    quem: Usuario,
    campos: Record<string, string | string[] | File>,
    opcoes: { origem?: string; rewrite?: (req: Request) => Response | Promise<Response>; localsExtra?: Record<string, unknown> } = {},
  ) => {
    const dados = new FormData();
    for (const [k, v] of Object.entries(campos)) {
      if (Array.isArray(v)) for (const item of v) dados.append(k, item);
      else dados.append(k, v);
    }
    const request = new Request(`http://localhost/api/${rota}`, {
      method: 'POST',
      headers: { Origin: opcoes.origem ?? 'http://localhost' },
      body: dados,
    });
    const locals: Record<string, unknown> = { usuario: quem, tipos, ...(opcoes.localsExtra ?? {}) };
    const resposta = await rotas[rota].POST({ request, locals, ...(opcoes.rewrite ? { rewrite: opcoes.rewrite } : {}) } as never);
    const loc = resposta.headers.get('Location');
    const destino = loc ? new URL(loc, 'http://localhost') : undefined;
    return {
      status: resposta.status,
      resposta,
      locals,
      caminho: destino?.pathname,
      ok: destino?.searchParams.get('ok') ?? null,
      erro: destino?.searchParams.get('erro') ?? null,
      destino,
    };
  };

  const impressao = () => {
    const tabelas = linhas<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> 'marca_da_copia' ORDER BY name`).map((t) => t.name).filter(foraDoIndiceDaBusca);
    return JSON.stringify(tabelas.map((t) => [t, sql.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all()]));
  };

  const grava = (comandos: ComandoDeTeste[]) => comandos.some((c) => /^\s*(INSERT|UPDATE|DELETE)/.test(c.sql));
  const lote = banco.batch.bind(banco);
  async function comLote<T>(novo: (comandos: ComandoDeTeste[]) => Promise<unknown[]>, fazer: () => Promise<T>): Promise<T> {
    banco.batch = novo;
    try {
      return await fazer();
    } finally {
      banco.batch = lote;
    }
  }

  async function comOutroPedidoNaPorta<T>(comando: RegExp, outro: (lista: ComandoDeTeste[]) => void | Promise<void>, fazer: () => Promise<T>): Promise<T> {
    let naPorta = true;
    return comLote(async (lista) => {
      if (naPorta && lista.some((c) => comando.test(c.sql))) {
        naPorta = false;
        await outro(lista);
      }
      return lote(lista);
    }, fazer);
  }

  let seq = 0;
  const uid = (prefixo: string) => `${prefixo}-${++seq}`;
  const criarPessoaPrivada = (dono: string, id: string, nome: string, extra: { apelido?: string | null; nucleo?: string } = {}) => {
    sql.prepare(`INSERT INTO integrantes (id, nome, apelido, tipo, tratamento, criado_por) VALUES (?, ?, ?, 'pessoa', 'ela', ?)`).run(id, nome, extra.apelido ?? null, dono);
    sql.prepare(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES (?, ?, 'amiga secreta', 1)`).run(dono, id);
    if (extra.nucleo) sql.prepare(`INSERT INTO nucleo_membros (nucleo_id, integrante_id, papel) VALUES (?, ?, 'membro')`).run(extra.nucleo, id);
  };
  const criarPessoaMembro = (id: string, nome: string, nucleo: string, falecido = false) => {
    sql
      .prepare(`INSERT INTO integrantes (id, nome, tipo, tratamento, falecido, criado_por) VALUES (?, ?, 'pessoa', 'ele', ?, 'gui')`)
      .run(id, nome, falecido ? 1 : 0);
    sql.prepare(`INSERT INTO nucleo_membros (nucleo_id, integrante_id, papel) VALUES (?, ?, 'membro')`).run(nucleo, id);
  };
  const audioSolto = (quem: Usuario, memoriaId: string | null = null) =>
    repo.registrarAudio({ chave: `aa2/audio-${++seq}.m4a`, tipo: 'audio/mp4', tamanho: 12, duracao: 4, memoriaId }, quem);

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 1: pedido para liberar um relato', () => {
    it('o começo do relato aparece só para quem pode lê-lo hoje, e os nomes e a conta "e mais N" excluem pessoasQueNaoVe', async () => {
      // Cria memória restrita a bayara-nascimento, com relato da Elizete
      const mem = await pedirJson('memorias', gui, {
        titulo: 'AA2: memória para ampliar',
        ano: 2021,
        tipo: 'causo',
        visibilidade: 'nucleos',
        nucleos: ['bayara-nascimento'],
        situacao: 'publicada',
      });
      expect(mem.status).toBe(201);
      const memId = mem.corpo.id as string;

      const rel = await pedirJson('relatos', elizete, {
        memoria: memId,
        por: 'elizete',
        texto: 'Trecho confidencial do relato da Elizete que ninguém novo leu.',
        situacao: 'publicada',
      });
      expect(rel.status).toBe(201);
      const relato = uma<{ id: number }>('SELECT id FROM relatos WHERE memoria_id = ? AND por = ?', memId, 'elizete');

      // Novo núcleo só para testar nomes visíveis, invisíveis (pessoasQueNaoVe) e "e mais N"
      const nucTeste = uid('nuc-aa2');
      sql.prepare(`INSERT INTO nucleos (id, nome, sobrenomes) VALUES (?, 'Teste AA2', 'Teste')`).run(nucTeste);
      sql.prepare(`INSERT INTO nucleo_membros (nucleo_id, integrante_id, papel) VALUES (?, 'gui', 'membro')`).run(nucTeste);
      const guiComNovoNucleo = usuarioDe('gui');
      criarPessoaMembro(uid('vis-1'), 'Alice Visível', nucTeste);
      criarPessoaMembro(uid('vis-2'), 'Bruno Visível', nucTeste);
      criarPessoaMembro(uid('vis-3'), 'Carla Visível', nucTeste);
      criarPessoaMembro(uid('vis-4'), 'Daniel Visível', nucTeste);
      criarPessoaMembro(uid('fal-1'), 'Eduardo Falecido', nucTeste, true);
      // Dois membros do núcleo novo que só existem em laço privado do Gui: Elizete não os vê
      const priv1 = uid('priv-membro-1');
      const priv2 = uid('priv-membro-2');
      criarPessoaPrivada('gui', priv1, 'Ximena Invisível', { nucleo: nucTeste });
      criarPessoaPrivada('gui', priv2, 'Yara Invisível', { nucleo: nucTeste });

      // Amplia a memória para incluir o núcleo novo (além de bayara-nascimento)
      const amp = await pedirJson('memorias', guiComNovoNucleo, {
        id: memId,
        titulo: 'AA2: memória para ampliar',
        ano: 2021,
        tipo: 'causo',
        visibilidade: 'nucleos',
        nucleos: ['bayara-nascimento', nucTeste],
        situacao: 'publicada',
      });
      expect(amp.status).toBe(200);

      const publicoNovo = { visibilidade: 'nucleos' as const, nucleos: ['bayara-nascimento', nucTeste] };

      // 1a) Só quem registrou (Elizete) recebe o pedido com o começo do relato
      const paraElizete = await pedidoDoRelato.pedidosDosRelatos(elizete, [{ relatoId: relato.id, publico: publicoNovo }]);
      expect(paraElizete.has(relato.id)).toBe(true);
      const pElizete = paraElizete.get(relato.id)!;
      expect(pElizete.comeco).toContain('Trecho confidencial do relato da Elizete');
      expect(pElizete.acao).toBe('Liberar para a família Teste AA2');

      // 1b) Quem não registrou (criador admin, outro membro que já lia, e alguém fora do público) não recebe o começo
      for (const outro of [gui, giovanna, magno]) {
        const mapa = await pedidoDoRelato.pedidosDosRelatos(outro, [{ relatoId: relato.id, publico: publicoNovo }]);
        expect(mapa.size, outro.pessoa).toBe(0);
      }

      // 1c) Nomes de quem passa a ler: 4 visíveis vivos ("Alice, Bruno, Carla e mais 1"), nunca os 2 privados nem o falecido
      const idsElizete = await pedidoDoRelato.quemPassaALer(
        { registradoPor: 'elizete', soParaNucleos: ['bayara-nascimento'] },
        publicoNovo,
        elizete,
      );
      expect(idsElizete).toHaveLength(4);
      expect(idsElizete).not.toContain(priv1);
      expect(idsElizete).not.toContain(priv2);
      expect(pElizete.leitores).toBe('Alice Visível, Bruno Visível, Carla Visível e mais 1');
      expect(pElizete.leitores).not.toContain('Ximena');
      expect(pElizete.leitores).not.toContain('Yara');
      expect(pElizete.leitores).not.toContain('Eduardo');
      // Não virou "e mais 3" (o que denunciaria os 2 invisíveis)
      expect(pElizete.leitores).not.toContain('e mais 3');

      // Núcleo que só tem gente invisível para Elizete: lista vazia, nada denunciado
      const nucSoPriv = uid('nuc-so-priv');
      sql.prepare(`INSERT INTO nucleos (id, nome, sobrenomes) VALUES (?, 'Só Privado', 'Priv')`).run(nucSoPriv);
      criarPessoaPrivada('gui', uid('priv-solo'), 'Zuleica Oculta', { nucleo: nucSoPriv });
      const idsSoPriv = await pedidoDoRelato.quemPassaALer(
        { registradoPor: 'elizete', soParaNucleos: ['bayara-nascimento'] },
        { visibilidade: 'nucleos', nucleos: ['bayara-nascimento', nucSoPriv] },
        elizete,
      );
      expect(idsSoPriv).toEqual([]);
    });

    it('responder faz exatamente o que fazia antes (manter e liberar), e o pedido recusado deixa o banco igual', async () => {
      const mem = await pedirJson('memorias', gui, {
        titulo: 'AA2: responder pedido',
        ano: 2022,
        tipo: 'causo',
        visibilidade: 'nucleos',
        nucleos: ['bayara-nascimento'],
        situacao: 'publicada',
      });
      const memId = mem.corpo.id as string;
      await pedirJson('relatos', elizete, { memoria: memId, por: 'elizete', texto: 'Relato da Elizete.', situacao: 'publicada' });
      const relato = uma<{ id: number }>('SELECT id FROM relatos WHERE memoria_id = ? AND por = ?', memId, 'elizete');

      // Amplia para toda a família
      await pedirJson('memorias', gui, {
        id: memId,
        titulo: 'AA2: responder pedido',
        ano: 2022,
        tipo: 'causo',
        visibilidade: 'todos',
        nucleos: ['bayara-nascimento'],
        situacao: 'publicada',
      });
      const aviso = uma<{ id: number }>(`SELECT id FROM avisos WHERE relato_id = ? AND tipo = 'liberar-relato' AND resolvido_em IS NULL`, relato.id);
      expect(aviso).toBeTruthy();

      // Antes de liberar, Magno (bracarense) não vê o relato
      expect((await repo.listarRelatos(magno, memId)).map((r) => r.id)).not.toContain(relato.id);

      // Pedidos recusados deixam o banco idêntico
      const antesRecusas = impressao();
      // 1) Outra pessoa (mesmo admin/criador) tentando responder pelo aviso
      const r1 = await semScript('avisos', gui, { aviso: String(aviso.id), publico: 'todos', resposta: 'liberar', volta: '/' });
      expect(r1.status).toBe(404);
      expect(impressao()).toBe(antesRecusas);

      // 2) Outra pessoa tentando responder direto pelo relato
      const r2 = await semScript('avisos', gui, { relato: String(relato.id), publico: 'todos', resposta: 'liberar', volta: '/' });
      expect(r2.status).toBe(404);
      expect(impressao()).toBe(antesRecusas);

      // 3) Público desatualizado / diferente
      const r3 = await semScript('avisos', elizete, { aviso: String(aviso.id), publico: 'nucleos:bayara-nascimento', resposta: 'liberar', volta: '/' });
      expect(r3.status).toBe(303);
      expect(r3.erro).toBe(rotas.avisos.RECADO_PEDIDO_MUDOU);
      expect(impressao()).toBe(antesRecusas);

      // 4) Resposta inválida
      const r4 = await semScript('avisos', elizete, { aviso: String(aviso.id), publico: 'todos', resposta: 'apagar', volta: '/' });
      expect(r4.status).toBe(400);
      expect(impressao()).toBe(antesRecusas);

      // 5) Origem diferente
      const r5 = await semScript('avisos', elizete, { aviso: String(aviso.id), publico: 'todos', resposta: 'liberar' }, { origem: 'https://outro.exemplo' });
      expect(r5.status).toBe(403);
      expect(impressao()).toBe(antesRecusas);

      // Responder "manter": resolve aviso com resposta='manter', mantém so_para_nucleos, Magno segue sem ver
      const manter = await semScript('avisos', elizete, { aviso: String(aviso.id), publico: 'todos', resposta: 'manter', volta: '/' });
      expect(manter.status).toBe(303);
      expect(manter.ok).toContain('continua só para quem via antes');
      expect((await repo.listarRelatos(magno, memId)).map((r) => r.id)).not.toContain(relato.id);
      expect(uma<{ resposta: string; resolvido_em: string | null }>('SELECT resposta, resolvido_em FROM avisos WHERE id = ?', aviso.id).resposta).toBe('manter');

      // Depois, liberar pela linha do relato na memória: limpa so_para_nucleos e Magno passa a ver
      const liberar = await semScript('avisos', elizete, { relato: String(relato.id), publico: 'todos', resposta: 'liberar', volta: `/memorias/${memId}` });
      expect(liberar.status).toBe(303);
      expect(liberar.ok).toContain('Relato liberado');
      expect((await repo.listarRelatos(magno, memId)).map((r) => r.id)).toContain(relato.id);
      const rDepois = uma<{ so_para_nucleos: string | null; publico_conhecido: string | null }>('SELECT so_para_nucleos, publico_conhecido FROM relatos WHERE id = ?', relato.id);
      expect(rDepois.so_para_nucleos).toBeNull();
      expect(rDepois.publico_conhecido).toBe('todos');
    });

    it('pedidosDosRelatos chamado direto, sem listarAvisos, confere sozinha que quem registrou vê a memória e que o relato não foi descartado', async () => {
      // Na tela, Avisos.astro usa listarAvisos e [id].astro usa obterMemoria+listarRelatos, que já filtram.
      // A função confere o mesmo por conta própria.
      const mem = await pedirJson('memorias', gui, {
        titulo: 'AA2: memória que vai para lixeira',
        ano: 2020,
        tipo: 'causo',
        visibilidade: 'nucleos',
        nucleos: ['bayara-nascimento'],
        situacao: 'publicada',
      });
      const memId = mem.corpo.id as string;
      await pedirJson('relatos', elizete, { memoria: memId, por: 'elizete', texto: 'Texto que ficou na memória apagada.', situacao: 'publicada' });
      const relato = uma<{ id: number }>('SELECT id FROM relatos WHERE memoria_id = ? AND por = ?', memId, 'elizete');
      await pedirJson('memorias', gui, {
        id: memId,
        titulo: 'AA2: memória que vai para lixeira',
        ano: 2020,
        tipo: 'causo',
        visibilidade: 'todos',
        nucleos: ['bayara-nascimento'],
        situacao: 'publicada',
      });
      const pedir = () => pedidoDoRelato.pedidosDosRelatos(elizete, [{ relatoId: relato.id, publico: { visibilidade: 'todos', nucleos: [] } }]);
      // Controle: com a memória à vista e o relato de pé, o pedido aparece
      expect((await pedir()).has(relato.id)).toBe(true);

      // Relato descartado: o pedido some
      sql.prepare(`UPDATE relatos SET descartado_em = datetime('now') WHERE id = ?`).run(relato.id);
      expect((await pedir()).has(relato.id)).toBe(false);
      sql.prepare('UPDATE relatos SET descartado_em = NULL WHERE id = ?').run(relato.id);

      // Memória que quem registrou deixou de ver (só para uma família da qual a Elizete não é): o pedido some
      sql.prepare(`UPDATE memorias SET visibilidade = 'nucleos' WHERE id = ?`).run(memId);
      sql.prepare(`DELETE FROM memoria_nucleos WHERE memoria_id = ?`).run(memId);
      sql.prepare(`INSERT INTO memoria_nucleos (memoria_id, nucleo_id) VALUES (?, 'bracarense')`).run(memId);
      expect((await pedir()).has(relato.id)).toBe(false);
      sql.prepare(`UPDATE memorias SET visibilidade = 'todos' WHERE id = ?`).run(memId);
      expect((await pedir()).has(relato.id)).toBe(true);

      // Admin manda a memória para a lixeira: listarAvisos some com o aviso, e a chamada direta também
      await repo.excluirMemoria(memId, gui);
      const avisosElizete = await repo.listarAvisos(elizete);
      expect(avisosElizete.some((a) => a.memoriaId === memId)).toBe(false);
      expect((await pedir()).has(relato.id)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 2: recado de "Juntar"', () => {
    it('cita só os títulos que o administrador vê, acrescenta "e memórias que você não vê" sem título nem número só quando há alguma, e a recusa deixa o banco igual', async () => {
      const f1 = uid('dup-a');
      const f2 = uid('dup-b');
      sql.prepare(`INSERT INTO integrantes (id, nome, tipo, criado_por) VALUES (?, 'Tia Duplicada', 'pessoa', 'gui')`).run(f1);
      sql.prepare(`INSERT INTO integrantes (id, nome, tipo, criado_por) VALUES (?, 'Tia Duplicada B', 'pessoa', 'gui')`).run(f2);

      // Memória visível para o Gui (aberta a todos, sem dígitos no título para conferir ausência de contagem)
      const mVis = await pedirJson('memorias', gui, { titulo: 'Festa Aberta da Revisão', ano: 2019, tipo: 'festa', visibilidade: 'todos', situacao: 'publicada' });
      const idVis = mVis.corpo.id as string;
      // Duas memórias que o Gui NÃO vê (restritas à bracarense, criadas pelo Magno)
      const mPriv1 = await pedirJson('memorias', magno, { titulo: 'Segredo Bracarense Um', ano: 2020, tipo: 'causo', visibilidade: 'nucleos', nucleos: ['bracarense'], situacao: 'publicada' });
      const mPriv2 = await pedirJson('memorias', magno, { titulo: 'Segredo Bracarense Dois', ano: 2021, tipo: 'causo', visibilidade: 'nucleos', nucleos: ['bracarense'], situacao: 'publicada' });
      const idPriv1 = mPriv1.corpo.id as string;
      const idPriv2 = mPriv2.corpo.id as string;

      // Caso 1: só conflito em memória visível -> cita o título, SEM "memórias que você não vê"
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, 'gui', 'R1', 'publicada')`).run(idVis, f1);
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, 'gui', 'R2', 'publicada')`).run(idVis, f2);
      const antes1 = impressao();
      const r1 = await semScript('duplicados', gui, { acao: 'juntar', fica: f1, sai: f2 });
      expect(r1.status).toBe(303);
      expect(r1.erro).toContain('“Festa Aberta da Revisão”');
      expect(r1.erro).not.toContain('memórias que você não vê');
      expect(impressao()).toBe(antes1);

      // Caso 2: conflito na visível + duas invisíveis -> cita só a visível e "e memórias que você não vê", sem títulos nem número "2"
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, 'lucas-magno', 'P1', 'publicada')`).run(idPriv1, f1);
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, 'lucas-magno', 'P2', 'publicada')`).run(idPriv1, f2);
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, 'lucas-magno', 'P3', 'publicada')`).run(idPriv2, f1);
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, 'lucas-magno', 'P4', 'publicada')`).run(idPriv2, f2);

      const antes2 = impressao();
      const r2 = await semScript('duplicados', gui, { acao: 'juntar', fica: f1, sai: f2 });
      expect(r2.status).toBe(303);
      expect(r2.erro).toBe('As duas fichas têm relato em “Festa Aberta da Revisão” e memórias que você não vê. Cada pessoa tem um relato por memória: deixe um só antes de juntar.');
      expect(r2.erro).not.toContain('Segredo Bracarense');
      expect(r2.erro).not.toMatch(/\d/);
      expect(impressao()).toBe(antes2);

      // Para o Magno (que vê todas as 3), os três títulos aparecem e NÃO aparece "memórias que você não vê"
      const rMagno = await semScript('duplicados', magno, { acao: 'juntar', fica: f1, sai: f2 });
      expect(rMagno.erro).toContain('“Festa Aberta da Revisão”');
      expect(rMagno.erro).toContain('“Segredo Bracarense Um”');
      expect(rMagno.erro).toContain('“Segredo Bracarense Dois”');
      expect(rMagno.erro).not.toContain('memórias que você não vê');
      expect(impressao()).toBe(antes2);

      // Caso 3: só conflitos em memórias que o Gui não vê (inclui rascunho de outro e lixeira)
      sql.prepare('DELETE FROM relatos WHERE memoria_id = ?').run(idVis);
      const mRasc = await pedirJson('memorias', magno, { titulo: 'AA2: Rascunho Secreto do Magno', ano: 2022, tipo: 'causo', visibilidade: 'todos', situacao: 'rascunho' });
      const idRasc = mRasc.corpo.id as string;
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, 'lucas-magno', 'D1', 'rascunho')`).run(idRasc, f1);
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, 'lucas-magno', 'D2', 'rascunho')`).run(idRasc, f2);

      const antes3 = impressao();
      const r3 = await semScript('duplicados', gui, { acao: 'juntar', fica: f1, sai: f2 });
      expect(r3.status).toBe(303);
      expect(r3.erro).toBe('As duas fichas têm relato em memórias que você não vê. Cada pessoa tem um relato por memória: deixe um só antes de juntar.');
      expect(r3.erro).not.toContain('Segredo Bracarense');
      expect(r3.erro).not.toContain('Rascunho Secreto');
      expect(r3.erro).not.toMatch(/\d/);
      expect(impressao()).toBe(antes3);
      expect(juntar.recadoDosConflitos([{ titulos: [], outras: false }])).toBe('');
    });

    it('numa memória que o administrador vê, o título só aparece com os dois relatos publicados e liberados; rascunho de outra pessoa e relato que espera liberação entram em "memórias que você não vê"', async () => {
      const f1 = uid('dup-c');
      const f2 = uid('dup-d');
      sql.prepare(`INSERT INTO integrantes (id, nome, tipo, criado_por) VALUES (?, 'Tia Conflito', 'pessoa', 'gui')`).run(f1);
      sql.prepare(`INSERT INTO integrantes (id, nome, tipo, criado_por) VALUES (?, 'Tia Conflito B', 'pessoa', 'gui')`).run(f2);
      const recado = async () => (await semScript('duplicados', gui, { acao: 'juntar', fica: f1, sai: f2 })).erro;
      const SO_NAO_VE = 'As duas fichas têm relato em memórias que você não vê. Cada pessoa tem um relato por memória: deixe um só antes de juntar.';

      // 1) Rascunhos do Magno nas duas fichas, numa memória aberta a todos que o Gui vê
      const idRasc = (await pedirJson('memorias', magno, { titulo: 'Memória Aberta Com Rascunho', ano: 2018, tipo: 'causo', visibilidade: 'todos', situacao: 'publicada' })).corpo.id as string;
      expect(await repo.obterMemoria(gui, idRasc)).toBeDefined();
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, 'lucas-magno', 'Rascunho um', 'rascunho'), (?, ?, 'lucas-magno', 'Rascunho dois', 'rascunho')`).run(idRasc, f1, idRasc, f2);
      const antes1 = impressao();
      expect(await recado()).toBe(SO_NAO_VE);
      expect(impressao()).toBe(antes1);
      sql.prepare('DELETE FROM relatos WHERE memoria_id = ?').run(idRasc);

      // 2) Dois relatos publicados, um deles esperando liberação (só para a família de quem registrou)
      const idEspera = (await pedirJson('memorias', magno, { titulo: 'Memória Aberta Com Relato Esperando', ano: 2017, tipo: 'causo', visibilidade: 'todos', situacao: 'publicada' })).corpo.id as string;
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, so_para_nucleos) VALUES (?, ?, 'lucas-magno', 'Esperando', 'publicada', '["bracarense"]')`).run(idEspera, f1);
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, 'gui', 'Liberado', 'publicada')`).run(idEspera, f2);
      const antes2 = impressao();
      const r2 = await recado();
      expect(r2).toBe(SO_NAO_VE);
      expect(r2).not.toContain('Relato Esperando');
      expect(impressao()).toBe(antes2);

      // 3) Liberado o relato, o título aparece, sem "memórias que você não vê"
      sql.prepare('UPDATE relatos SET so_para_nucleos = NULL WHERE memoria_id = ?').run(idEspera);
      const r3 = await recado();
      expect(r3).toBe('As duas fichas têm relato em “Memória Aberta Com Relato Esperando”. Cada pessoa tem um relato por memória: deixe um só antes de juntar.');

      // 4) Com o rascunho de volta noutra memória, as duas aparecem: uma pelo título, a outra sem título
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, 'lucas-magno', 'Rascunho um', 'rascunho'), (?, ?, 'lucas-magno', 'Rascunho dois', 'rascunho')`).run(idRasc, f1, idRasc, f2);
      const r4 = await recado();
      expect(r4).toBe('As duas fichas têm relato em “Memória Aberta Com Relato Esperando” e memórias que você não vê. Cada pessoa tem um relato por memória: deixe um só antes de juntar.');
      expect(r4).not.toContain('Com Rascunho');
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 3: parentesco no filtro "Quem estava junto"', () => {
    it('só calcula para quem olha vê e só usa laços que quem olha vê; laço privado de outro dono não muda o parentesco', async () => {
      // Pessoa que só existe em laço privado da Giovanna
      const pPriv = uid('par-priv');
      criarPessoaPrivada('giovanna', pPriv, 'Inês Privada');

      // Pessoa visível (cadastrada sem laço privado exclusivo) com um casal PRIVADO com a Giovanna
      const pConjuge = uid('par-conj');
      sql.prepare(`INSERT INTO integrantes (id, nome, tipo, tratamento, criado_por) VALUES (?, 'Pedro Secreto', 'pessoa', 'ele', 'giovanna')`).run(pConjuge);
      // Filho de Pedro Secreto (visível pela filiação)
      const pEnteado = uid('par-enteado');
      sql.prepare(`INSERT INTO integrantes (id, nome, tipo, tratamento, criado_por) VALUES (?, 'Lucas Filho', 'pessoa', 'ele', 'giovanna')`).run(pEnteado);
      await repo.salvarFiliacao(pEnteado, pConjuge, 'biologica', giovanna);
      // Casal privado (só os dois + quem criou = Giovanna): Gui NÃO vê esse casal
      await repo.salvarCasal('giovanna', pConjuge, [{ tipo: 'casamento', inicioAno: 2020, fimAno: null }], 'privado', giovanna);
      // Também um laço do coração privado da Giovanna com alguém visível (ex.: pEnteado)
      await repo.salvarLacoDoCoracao(giovanna, pEnteado, { nome: 'afilhado secreto', papel: null, proximidade: 1, privado: true });

      // Casal desfeito restrito à bracarense (Gui não é membro de bracarense)
      const pExRestrito = uid('par-ex-brac');
      sql.prepare(`INSERT INTO integrantes (id, nome, tipo, tratamento, criado_por) VALUES (?, 'Raul Bracarense', 'pessoa', 'ele', 'lucas-magno')`).run(pExRestrito);
      await repo.salvarCasal('giovanna', pExRestrito, [{ tipo: 'casamento', inicioAno: 2015, fimAno: null }, { tipo: 'separacao', inicioAno: 2018, fimAno: null }], 'nucleos', giovanna, ['bracarense']);

      // Lista passada inclusive com pPriv (mesmo forçando a entrada, deve ser excluída)
      const lista = [
        { id: 'gui', nome: 'Guilherme Bayara', apelido: 'Gui', tratamento: 'ele' as const },
        { id: 'elizete', nome: 'Elizete', apelido: null, tratamento: 'ela' as const },
        { id: pPriv, nome: 'Inês Privada', apelido: null, tratamento: 'ela' as const },
        { id: pConjuge, nome: 'Pedro Secreto', apelido: null, tratamento: 'ele' as const },
        { id: pEnteado, nome: 'Lucas Filho', apelido: null, tratamento: 'ele' as const },
        { id: pExRestrito, nome: 'Raul Bracarense', apelido: null, tratamento: 'ele' as const },
      ];

      const paraGui = await parentescoDoFiltro.parentescosDeQuemOlha(gui, lista);
      expect(paraGui.get('gui')).toBe('você');
      expect(paraGui.get('elizete')).toBe('sua mãe');
      // Quem Gui não vê fica fora
      expect(paraGui.has(pPriv)).toBe(false);
      // Casal privado da Giovanna NÃO vira cunhado para o Gui nem cria parentesco com o filho dele
      expect(paraGui.has(pConjuge)).toBe(false);
      expect(paraGui.has(pEnteado)).toBe(false);
      // Ex-casal restrito à bracarense também NÃO gera parentesco para o Gui
      expect(paraGui.has(pExRestrito)).toBe(false);

      // Já para a Giovanna (dona dos laços), os parentescos dela aparecem normalmente
      const paraGiovanna = await parentescoDoFiltro.parentescosDeQuemOlha(giovanna, [
        ...lista,
        { id: 'giovanna', nome: 'Giovanna', apelido: null, tratamento: 'ela' as const },
      ]);
      expect(paraGiovanna.get(pPriv)).toBe('sua amiga secreta');
      expect(paraGiovanna.get(pConjuge)).toBe('seu marido');
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 4: "Neste dia" e "No Natal, em outros anos" de 24 a 26 de dezembro', () => {
    it('inclui só memórias publicadas que a pessoa vê; rascunho e lixeira nunca entram', async () => {
      // Memórias em 24 e 25 de dezembro em anos passados:
      const m24Vis = (await pedirJson('memorias', gui, { titulo: 'AA2: Ceia 2018', ano: 2018, mes: 12, dia: 24, tipo: 'festa', visibilidade: 'todos', situacao: 'publicada' })).corpo.id as string;
      const m25Vis = (await pedirJson('memorias', gui, { titulo: 'AA2: Almoço 2019', ano: 2019, mes: 12, dia: 25, tipo: 'festa', visibilidade: 'todos', situacao: 'publicada' })).corpo.id as string;
      // Restrita a bracarense (Gui não vê)
      const m25Restrita = (await pedirJson('memorias', magno, { titulo: 'AA2: Natal só Bracarense', ano: 2024, mes: 12, dia: 25, tipo: 'festa', visibilidade: 'nucleos', nucleos: ['bracarense'], situacao: 'publicada' })).corpo.id as string;
      // Rascunho do próprio Gui em 25/12
      const m25RascGui = (await pedirJson('memorias', gui, { titulo: 'AA2: Rascunho Natal Gui', ano: 2023, mes: 12, dia: 25, tipo: 'festa', visibilidade: 'todos', situacao: 'rascunho' })).corpo.id as string;
      // Rascunho da Giovanna em 24/12
      const m24RascGio = (await pedirJson('memorias', giovanna, { titulo: 'AA2: Rascunho Natal Gio', ano: 2023, mes: 12, dia: 24, tipo: 'festa', visibilidade: 'todos', situacao: 'rascunho' })).corpo.id as string;
      // Memória na lixeira em 25/12
      const m25Lixo = (await pedirJson('memorias', gui, { titulo: 'AA2: Natal na Lixeira', ano: 2022, mes: 12, dia: 25, tipo: 'festa', visibilidade: 'todos', situacao: 'publicada' })).corpo.id as string;
      await repo.excluirMemoria(m25Lixo, gui);

      // Mesmo caminho de src/pages/index.astro: listarMemorias(usuario) filtrado para publicadas
      const publicadasDoGui = (await repo.listarMemorias(gui)).filter((m) => m.situacao === 'publicada');
      const idsProibidos = [m25Restrita, m25RascGui, m24RascGio, m25Lixo];

      for (const dia of [24, 25, 26]) {
        const res = painel.emOutrosAnos(publicadasDoGui, { ano: 2026, mes: 12, dia }, 20);
        expect(res?.proximidade, `dia ${dia}`).toBe('natal');
        expect(painel.TITULO_DA_PROXIMIDADE[res!.proximidade]).toBe('No Natal, em outros anos');
        const ids = res!.itens.map((m) => m.id);
        expect(ids, `dia ${dia}`).toContain(m24Vis);
        expect(ids, `dia ${dia}`).toContain(m25Vis);
        for (const proibido of idsProibidos) expect(ids, `dia ${dia} vazou ${proibido}`).not.toContain(proibido);
      }

      // Fora de 24 a 26/12 (ex.: 23/12 e 27/12): não usa "natal" e continua sem proibidos
      for (const dia of [23, 27]) {
        const res = painel.emOutrosAnos(publicadasDoGui, { ano: 2026, mes: 12, dia }, 20);
        expect(res?.proximidade).not.toBe('natal');
        const ids = (res?.itens ?? []).map((m) => m.id);
        for (const proibido of idsProibidos) expect(ids).not.toContain(proibido);
      }

      // Para o Magno (que vê bracarense), m25Restrita aparece, mas rascunhos e lixeira continuam fora
      const publicadasDoMagno = (await repo.listarMemorias(magno)).filter((m) => m.situacao === 'publicada');
      const resMagno = painel.emOutrosAnos(publicadasDoMagno, { ano: 2026, mes: 12, dia: 25 }, 20);
      expect(resMagno?.itens.map((m) => m.id)).toContain(m25Restrita);
      expect(resMagno?.itens.map((m) => m.id)).not.toContain(m25RascGui);
      expect(resMagno?.itens.map((m) => m.id)).not.toContain(m24RascGio);
      expect(resMagno?.itens.map((m) => m.id)).not.toContain(m25Lixo);
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 5: legenda da carta com o título', () => {
    it('só entrega título e foto de memória publicada que a pessoa vê (nem restrita onde foi citada, nem rascunho, nem lixeira)', async () => {
      const criarComFoto = async (quem: Usuario, corpo: Record<string, unknown>) => {
        sql.prepare(`INSERT INTO fotos (memoria_id, chave, principal, ordem, enviada_por) VALUES (NULL, ?, 0, 0, ?)`).run(`aa2/carta-${++seq}.jpg`, quem.pessoa);
        const fotoId = uma<{ id: number }>('SELECT MAX(id) AS id FROM fotos').id;
        const r = await pedirJson('memorias', quem, { ...corpo, fotos: [{ id: fotoId, principal: true }] });
        expect(r.status).toBe(201);
        return r.corpo.id as string;
      };

      const mVis = await criarComFoto(gui, { titulo: 'AA2: Foto Carta Visível', ano: 2025, tipo: 'festa', pessoas: ['gui'], visibilidade: 'todos', situacao: 'publicada' });
      // Gui citado numa memória restrita à bracarense: ser citado NÃO dá acesso
      const mRestrita = await criarComFoto(magno, { titulo: 'AA2: Foto Carta Restrita', ano: 2025, tipo: 'festa', pessoas: ['gui', 'lucas-magno'], visibilidade: 'nucleos', nucleos: ['bracarense'], situacao: 'publicada' });
      const mRasc = await criarComFoto(gui, { titulo: 'AA2: Foto Carta Rascunho', ano: 2025, tipo: 'festa', pessoas: ['gui'], visibilidade: 'todos', situacao: 'rascunho' });
      const mLixo = await criarComFoto(gui, { titulo: 'AA2: Foto Carta Lixeira', ano: 2025, tipo: 'festa', pessoas: ['gui'], visibilidade: 'todos', situacao: 'publicada' });
      await repo.excluirMemoria(mLixo, gui);

      // Mesmo critério de src/pages/carta.astro e src/pages/index.astro
      const fotosDaCartaDoGui = (await repo.listarMemorias(gui)).filter((m) => m.situacao === 'publicada' && m.integrantes.includes(gui.pessoa) && m.fotos.length > 0);
      expect(await repo.fotosDaCarta(gui)).toEqual([...fotosDaCartaDoGui].reverse().slice(0, 3));
      const ids = fotosDaCartaDoGui.map((m) => m.id);
      expect(ids).toContain(mVis);
      expect(ids).not.toContain(mRestrita);
      expect(ids).not.toContain(mRasc);
      expect(ids).not.toContain(mLixo);

      // Conferência estrutural: Carta.astro passa titulo={m.titulo} ao Polaroid, e index.astro e carta.astro alimentam Carta a partir de listarMemorias(usuario) publicadas
      const cartaAstro = readFileSync('src/components/Carta.astro', 'utf-8');
      expect(cartaAstro).toContain('<Polaroid id={m.id} fotos={m.fotos} titulo={m.titulo}');
      const pagCarta = readFileSync('src/pages/carta.astro', 'utf-8');
      expect(pagCarta).toContain('await fotosDaCarta(usuario)');
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 6: linha do rascunho no Início', () => {
    it('aparece só para quem escreveu o rascunho (nem admin nem criador da memória veem rascunho de outro)', async () => {
      const mPub = (await pedirJson('memorias', gui, { titulo: 'AA2: Memória do Rascunho de Relato', ano: 2024, tipo: 'causo', visibilidade: 'todos', situacao: 'publicada' })).corpo.id as string;

      // Giovanna cria um rascunho de relato nessa memória do Gui
      const rRel = await pedirJson('relatos', giovanna, { memoria: mPub, por: 'giovanna', texto: 'Comecei a escrever meu relato.', situacao: 'rascunho' });
      expect(rRel.status).toBe(201);

      const rascunhosDe = async (u: Usuario) =>
        conta.seusRascunhos(u.pessoa, await repo.listarMemorias(u, { rascunhos: true }), await repo.listarRelatosRegistradosPor(u));

      // Giovanna vê o próprio rascunho de relato
      const deGio = await rascunhosDe(giovanna);
      expect(deGio.relatos.some((r) => r.memoriaId === mPub)).toBe(true);

      // Gui (admin e criador da memória), Elizete e Magno NÃO veem o rascunho de relato da Giovanna
      for (const outro of [gui, elizete, magno]) {
        const deles = await rascunhosDe(outro);
        expect(deles.relatos.some((r) => r.memoriaId === mPub), outro.pessoa).toBe(false);
      }

      // Frase com um único rascunho de relato (próprio e por outra pessoa)
      expect(conta.fraseDoRascunho({ memorias: [], relatos: [{ por: 'giovanna', titulo: 'Jantar de casamento' }] }, 'giovanna', (x) => x)).toBe(
        'Seu relato em “Jantar de casamento” é um rascunho: ninguém viu ainda.',
      );
      expect(conta.fraseDoRascunho({ memorias: [], relatos: [{ por: 'vo-bela', titulo: 'Jantar de casamento' }] }, 'giovanna', () => 'Vó Bela')).toBe(
        'O relato de Vó Bela em “Jantar de casamento” é um rascunho: ninguém viu ainda.',
      );

      // Se a Giovanna descarta o rascunho de relato, some do Início dela também
      const relatoGio = (await repo.obterRelatoRegistradoPor(mPub, 'giovanna', giovanna))!;
      const memPub = (await repo.obterMemoria(giovanna, mPub))!;
      await repo.descartarRascunhoDeRelato(relatoGio, memPub);
      expect((await rascunhosDe(giovanna)).relatos.some((r) => r.memoriaId === mPub)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 7: os quatro defeitos da fila da Z2', () => {
    it('7a: áudio solto na corrida fica preso a uma memória só, e a outra nasce sem relato vazio', async () => {
      const a = await audioSolto(elizete);
      const corpo = (titulo: string) => ({
        titulo,
        ano: 2021,
        tipo: 'causo',
        visibilidade: 'todos',
        situacao: 'publicada',
        relato: { por: 'elizete', texto: '', audios: [{ id: a }], mensagens: [{ tipo: 'audio', audioId: a }] },
      });

      let segunda: { status: number; corpo: Record<string, unknown> } | undefined;
      const primeira = await comOutroPedidoNaPorta(
        /INSERT INTO memorias/,
        async () => {
          segunda = await pedirJson('memorias', elizete, corpo('AA2: Corrida Áudio Vencedora'));
        },
        () => pedirJson('memorias', elizete, corpo('AA2: Corrida Áudio Perdedora')),
      );

      expect(segunda?.status).toBe(201);
      expect(primeira.status).toBe(201);
      const idVencedora = segunda!.corpo.id as string;
      const idPerdedora = primeira.corpo.id as string;
      expect(idVencedora).not.toBe(idPerdedora);

      // O áudio ficou preso só na vencedora
      const relatoVencedor = linhas<{ id: number }>('SELECT id FROM relatos WHERE memoria_id = ?', idVencedora);
      expect(relatoVencedor).toHaveLength(1);
      expect(uma<{ memoria_id: string; relato_id: number }>('SELECT memoria_id, relato_id FROM audios WHERE id = ?', a)).toEqual({
        memoria_id: idVencedora,
        relato_id: relatoVencedor[0].id,
      });

      // A perdedora não tem relato vazio nem mensagem apontando para o áudio
      expect(linhas('SELECT id FROM relatos WHERE memoria_id = ?', idPerdedora)).toHaveLength(0);
      expect(linhas('SELECT id FROM relato_mensagens WHERE audio_id = ?', a)).toHaveLength(1);

      // Mesmo caminho em ligarAudios (/api/relatos): se outro relato leva o áudio na porta do lote, o segundo tenta de novo e não rouba
      const a2 = await audioSolto(elizete);
      const mRel1 = (await pedirJson('memorias', elizete, { titulo: 'AA2: Relato Áudio 1', ano: 2021, tipo: 'causo', visibilidade: 'todos', situacao: 'publicada' })).corpo.id as string;
      const mRel2 = (await pedirJson('memorias', elizete, { titulo: 'AA2: Relato Áudio 2', ano: 2021, tipo: 'causo', visibilidade: 'todos', situacao: 'publicada' })).corpo.id as string;
      await pedirJson('relatos', elizete, { memoria: mRel1, por: 'elizete', texto: 'Um.', situacao: 'publicada' });
      await pedirJson('relatos', elizete, { memoria: mRel2, por: 'elizete', texto: 'Dois.', situacao: 'publicada' });
      const rel1 = uma<{ id: number }>('SELECT id FROM relatos WHERE memoria_id = ? AND por = ?', mRel1, 'elizete');
      const rel2 = uma<{ id: number }>('SELECT id FROM relatos WHERE memoria_id = ? AND por = ?', mRel2, 'elizete');
      const ligados = await comOutroPedidoNaPorta(
        /UPDATE audios SET relato_id/,
        async () => {
          await repo.ligarAudios(rel1.id, mRel1, [{ id: a2 }], elizete);
        },
        () => repo.ligarAudios(rel2.id, mRel2, [{ id: a2 }], elizete),
      );
      expect(ligados).toBe(0);
      expect(uma<{ memoria_id: string; relato_id: number }>('SELECT memoria_id, relato_id FROM audios WHERE id = ?', a2)).toEqual({
        memoria_id: mRel1,
        relato_id: rel1.id,
      });
    });

    it('7b: falha ao gravar as mensagens sem script não deixa nada pela metade, e a nova tentativa com o mesmo código grava tudo', async () => {
      const mId = (await pedirJson('memorias', gui, { titulo: 'AA2: Mensagem Depois da Falha', ano: 2020, tipo: 'causo', visibilidade: 'todos', situacao: 'publicada' })).corpo.id as string;
      const codigo = uid('env-falha');
      const campos = { memoria: mId, por: 'gui', texto: 'Lembrança que precisa entrar inteira.', situacao: 'publicada', acrescentar: '1', envio: codigo };
      const antes = impressao();

      // Injeta falha exatamente no comando que insere em relato_mensagens dentro do lote
      let falhou = false;
      await comLote(
        async (lista) => {
          const i = lista.findIndex((c) => /INSERT INTO relato_mensagens/.test(c.sql));
          if (!falhou && i >= 0) {
            falhou = true;
            return lote([...lista.slice(0, i), banco.prepare('INSERT INTO tabela_inexistente DEFAULT VALUES'), ...lista.slice(i)]);
          }
          return lote(lista);
        },
        async () => {
          await expect(semScript('relatos', gui, campos)).rejects.toThrow();
        },
      );
      expect(falhou).toBe(true);
      // Nada gravado pela metade: nem relato, nem mensagem, nem código em envios
      expect(impressao()).toBe(antes);

      // Nova tentativa com o MESMO código grava relato, mensagem e código
      const ok = await semScript('relatos', gui, campos);
      expect(ok.status).toBe(303);
      expect(ok.erro).toBeNull();
      const rel = uma<{ id: number; texto: string }>('SELECT id, texto FROM relatos WHERE memoria_id = ? AND por = ?', mId, 'gui');
      expect(rel.texto).toBe('Lembrança que precisa entrar inteira.');
      const msgs = linhas<{ texto: string }>('SELECT texto FROM relato_mensagens WHERE relato_id = ?', rel.id);
      expect(msgs).toEqual([{ texto: 'Lembrança que precisa entrar inteira.' }]);
    });

    it('7c: toque duplo em "Publicar memória" sem script (em sequência e em corrida) grava uma vez só e responde igual', async () => {
      const mRasc = await pedirJson('memorias', elizete, { titulo: 'AA2: Rascunho Toque Duplo', ano: 2022, tipo: 'festa', visibilidade: 'todos', situacao: 'rascunho' });
      const mId = mRasc.corpo.id as string;
      const campos = {
        id: mId,
        envio: uid('env-pub'),
        pagina: 'rascunho',
        titulo: 'AA2: Rascunho Toque Duplo',
        ano: '2022',
        tipo: 'festa',
        visibilidade: 'todos',
        situacao: 'publicada',
        relato: 'Relato escrito no rascunho.',
        relatoPor: 'elizete',
      };

      // Primeiro toque publica
      const t1 = await semScript('memorias', elizete, campos);
      expect(t1.status).toBe(303);
      expect(t1.caminho).toBe(`/memorias/${mId}`);
      expect(t1.ok).toBe('Memória publicada.');
      const depoisDoPrimeiro = impressao();

      // Segundo toque igual (sequencial): mesma resposta, banco igual
      const t2 = await semScript('memorias', elizete, campos);
      expect(t2.status).toBe(303);
      expect(t2.caminho).toBe(`/memorias/${mId}`);
      expect(t2.ok).toBe('Memória publicada.');
      expect(impressao()).toBe(depoisDoPrimeiro);

      // Corrida concorrente em outro rascunho: ambos passam pela leitura antes de o primeiro gravar
      const mRasc2 = await pedirJson('memorias', elizete, { titulo: 'AA2: Rascunho Corrida', ano: 2023, tipo: 'festa', visibilidade: 'todos', situacao: 'rascunho' });
      const mId2 = mRasc2.corpo.id as string;
      const campos2 = { ...campos, id: mId2, envio: uid('env-pub-corrida'), titulo: 'AA2: Rascunho Corrida' };
      let outro: Awaited<ReturnType<typeof semScript>> | undefined;
      const primeiro = await comOutroPedidoNaPorta(
        /INSERT INTO envios/,
        async () => {
          outro = await semScript('memorias', elizete, campos2);
        },
        () => semScript('memorias', elizete, campos2),
      );
      expect(outro?.status).toBe(303);
      expect(outro?.caminho).toBe(`/memorias/${mId2}`);
      expect(outro?.ok).toBe('Memória publicada.');
      expect(primeiro.status).toBe(303);
      expect(primeiro.caminho).toBe(`/memorias/${mId2}`);
      expect(primeiro.ok).toBe('Memória publicada.');
      expect(linhas('SELECT id FROM relatos WHERE memoria_id = ?', mId2)).toHaveLength(1);
    });

    it('7d: falha final sem script volta para /nova com só o que a própria pessoa digitou, sem gravar no banco nem no servidor', async () => {
      const antes = impressao();
      let reescritoPara: URL | undefined;
      let devolvidaNaResposta: ReturnType<typeof formularioDevolvido.memoriaDevolvida> | undefined;

      // Caso 1: recusa de validação (falta o ano para publicar)
      const campos = {
        titulo: 'AA2: Título Digitado Pela Pessoa',
        tipo: 'viagem',
        lugar: 'Ouro Preto',
        pessoas: ['gui', 'elizete'],
        temas: 'viagem, estrada',
        visibilidade: 'nucleos',
        nucleos: ['bayara-nascimento'],
        relato: 'O que eu escrevi no relato antes de recusar.',
        relatoPor: 'gui',
        situacao: 'publicada',
      };
      const r = await semScript('memorias', gui, campos, {
        rewrite: (req) => {
          reescritoPara = new URL(req.url);
          return new Response('ok', { status: 200 });
        },
      });
      expect(r.status).toBe(200);
      expect(reescritoPara?.pathname).toBe('/nova');
      expect(reescritoPara?.searchParams.get('erro')).toBeTruthy();
      devolvidaNaResposta = r.locals.memoriaDevolvida as ReturnType<typeof formularioDevolvido.memoriaDevolvida>;
      expect(devolvidaNaResposta).toEqual({
        titulo: 'AA2: Título Digitado Pela Pessoa',
        ano: null,
        mes: null,
        dia: null,
        aproximada: false,
        tipo: 'viagem',
        tipoOutro: '',
        lugar: 'Ouro Preto',
        pessoas: ['gui', 'elizete'],
        capitulos: [],
        temas: 'viagem, estrada',
        nucleos: ['bayara-nascimento'],
        visibilidade: 'nucleos',
        relato: 'O que eu escrevi no relato antes de recusar.',
        relatoPor: 'gui',
      });
      // Banco idêntico: nada guardado no servidor
      expect(impressao()).toBe(antes);

      // Caso 2: falha final depois de 3 colisões de código em /api/memorias sem script
      let reescritoColisao: URL | undefined;
      const rColisao = await comLote(
        async (lista) => {
          if (lista.some((c) => /INSERT INTO memorias/.test(c.sql))) throw new Error('UNIQUE constraint failed: memorias.id');
          return lote(lista);
        },
        () =>
          semScript(
            'memorias',
            gui,
            { ...campos, ano: '2024' },
            {
              rewrite: (req) => {
                reescritoColisao = new URL(req.url);
                return new Response('ok', { status: 200 });
              },
            },
          ),
      );
      expect(rColisao.status).toBe(200);
      expect(reescritoColisao?.pathname).toBe('/nova');
      expect(reescritoColisao?.searchParams.get('erro')).toBe('Não consegui salvar.');
      expect((rColisao.locals.memoriaDevolvida as ReturnType<typeof formularioDevolvido.memoriaDevolvida>).titulo).toBe('AA2: Título Digitado Pela Pessoa');
      expect((rColisao.locals.memoriaDevolvida as ReturnType<typeof formularioDevolvido.memoriaDevolvida>).ano).toBe(2024);
      expect(impressao()).toBe(antes);

      // Conferência: outro pedido tem locals limpo (nada vaza entre pedidos) e nova.astro filtra pessoas/capítulos por quem olha
      const novaAstro = readFileSync('src/pages/nova.astro', 'utf-8');
      expect(novaAstro).toContain('const devolvida = Astro.locals.memoriaDevolvida;');
      expect(novaAstro).toContain('(devolvida?.pessoas ?? memoria?.integrantes)?.filter((p) => integrantes.some((i) => i.id === p))');
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 8: código de envio (tabela envios, migração 109)', () => {
    it('não guarda código nem texto (nem no relato nem na memória); toque duplo não regrava; mesmo código com outra pessoa, relato, memória ou texto grava; recusa não gasta', async () => {
      const m1 = (await pedirJson('memorias', gui, { titulo: 'AA2: Envios M1', ano: 2020, tipo: 'causo', visibilidade: 'todos', situacao: 'publicada' })).corpo.id as string;
      const m2 = (await pedirJson('memorias', gui, { titulo: 'AA2: Envios M2', ano: 2021, tipo: 'causo', visibilidade: 'todos', situacao: 'publicada' })).corpo.id as string;
      const mRasc1 = (await pedirJson('memorias', gui, { titulo: 'AA2: Envios Rasc 1', ano: 2022, tipo: 'causo', visibilidade: 'todos', situacao: 'rascunho' })).corpo.id as string;
      const mRasc2 = (await pedirJson('memorias', gui, { titulo: 'AA2: Envios Rasc 2', ano: 2023, tipo: 'causo', visibilidade: 'todos', situacao: 'rascunho' })).corpo.id as string;

      const codRelato = 'COD-SECRETO-RELATO-AA2';
      const txtRelato = 'TEXTO-SECRETO-RELATO-AA2';
      const codMem = 'COD-SECRETO-MEMORIA-AA2';
      const txtMem = 'TITULO-SECRETO-MEMORIA-AA2';

      // 8a) Pedido recusado não gasta o código (relato com texto vazio -> recusado; depois válido com mesmo código -> grava)
      const recRel = await semScript('relatos', gui, { memoria: m1, por: 'gui', texto: '   ', situacao: 'publicada', acrescentar: '1', envio: codRelato });
      expect(recRel.erro).toBeTruthy();
      const okRel = await semScript('relatos', gui, { memoria: m1, por: 'gui', texto: txtRelato, situacao: 'publicada', acrescentar: '1', envio: codRelato });
      expect(okRel.erro).toBeNull();
      const depoisRel = impressao();

      // 8b) Toque duplo no relato não grava de novo
      const dupRel = await semScript('relatos', gui, { memoria: m1, por: 'gui', texto: txtRelato, situacao: 'publicada', acrescentar: '1', envio: codRelato });
      expect(dupRel.erro).toBeNull();
      expect(impressao()).toBe(depoisRel);

      // 8c) Mesmo código com OUTRA PESSOA (elizete) grava normalmente
      const outraPessoa = await semScript('relatos', elizete, { memoria: m1, por: 'elizete', texto: txtRelato, situacao: 'publicada', acrescentar: '1', envio: codRelato });
      expect(outraPessoa.erro).toBeNull();
      expect(linhas('SELECT id FROM relatos WHERE memoria_id = ? AND por = ?', m1, 'elizete')).toHaveLength(1);

      // 8d) Mesmo código com OUTRO RELATO (Gui registrando em nome de Vó Bela) grava normalmente
      const outroRelato = await semScript('relatos', gui, { memoria: m1, por: 'vo-bela', texto: txtRelato, situacao: 'publicada', acrescentar: '1', envio: codRelato });
      expect(outroRelato.erro).toBeNull();
      expect(linhas('SELECT id FROM relatos WHERE memoria_id = ? AND por = ?', m1, 'vo-bela')).toHaveLength(1);

      // 8e) Mesmo código com OUTRA MEMÓRIA (m2) grava normalmente
      const outraMem = await semScript('relatos', gui, { memoria: m2, por: 'gui', texto: txtRelato, situacao: 'publicada', acrescentar: '1', envio: codRelato });
      expect(outraMem.erro).toBeNull();
      expect(linhas('SELECT id FROM relatos WHERE memoria_id = ? AND por = ?', m2, 'gui')).toHaveLength(1);

      // 8f) Mesmo código com OUTRO TEXTO no mesmo relato grava normalmente
      const outroTexto = await semScript('relatos', gui, { memoria: m1, por: 'gui', texto: 'SEGUNDA-MENSAGEM-AA2', situacao: 'publicada', acrescentar: '1', envio: codRelato });
      expect(outroTexto.erro).toBeNull();
      const relGui = uma<{ id: number }>('SELECT id FROM relatos WHERE memoria_id = ? AND por = ?', m1, 'gui');
      expect(linhas('SELECT texto FROM relato_mensagens WHERE relato_id = ?', relGui.id)).toHaveLength(2);

      // 8g) Na memória: recusa (sem ano) não gasta o código; depois válido grava; toque duplo não regrava;
      // mesmo código em outra memória ou com outro texto grava normalmente
      const recMem = await semScript('memorias', gui, { id: mRasc1, envio: codMem, pagina: 'rascunho', titulo: txtMem, tipo: 'causo', visibilidade: 'todos', situacao: 'publicada' });
      expect(recMem.erro).toBeTruthy();

      const okMem = await semScript('memorias', gui, { id: mRasc1, envio: codMem, pagina: 'rascunho', titulo: txtMem, ano: '2022', tipo: 'causo', visibilidade: 'todos', situacao: 'publicada' });
      expect(okMem.ok).toBe('Memória publicada.');
      const depoisMem = impressao();

      const dupMem = await semScript('memorias', gui, { id: mRasc1, envio: codMem, pagina: 'rascunho', titulo: txtMem, ano: '2022', tipo: 'causo', visibilidade: 'todos', situacao: 'publicada' });
      expect(dupMem.ok).toBe('Memória publicada.');
      expect(impressao()).toBe(depoisMem);

      // Mesmo código em outra memória (mRasc2)
      const outraMemPub = await semScript('memorias', gui, { id: mRasc2, envio: codMem, pagina: 'rascunho', titulo: txtMem, ano: '2023', tipo: 'causo', visibilidade: 'todos', situacao: 'publicada' });
      expect(outraMemPub.ok).toBe('Memória publicada.');
      expect(uma<{ situacao: string }>('SELECT situacao FROM memorias WHERE id = ?', mRasc2).situacao).toBe('publicada');

      // Mesmo código na mesma memória com outro texto (outro título)
      const outroTxtMem = await semScript('memorias', gui, { id: mRasc1, envio: codMem, pagina: 'publicada', titulo: 'OUTRO-TITULO-AA2', ano: '2022', tipo: 'causo', visibilidade: 'todos', situacao: 'publicada' });
      expect(outroTxtMem.ok).toContain('Memória atualizada');
      expect(uma<{ titulo: string }>('SELECT titulo FROM memorias WHERE id = ?', mRasc1).titulo).toBe('OUTRO-TITULO-AA2');

      // 8h) Conferência da tabela envios: só hashes SHA-256 hex (64 chars), nenhum código nem texto em claro
      const todasEnvios = linhas<{ codigo: string; em: string }>('SELECT codigo, em FROM envios');
      expect(todasEnvios.length).toBeGreaterThanOrEqual(7);
      const tudoEnvios = JSON.stringify(todasEnvios);
      for (const linha of todasEnvios) expect(linha.codigo).toMatch(/^[0-9a-f]{64}$/);
      for (const sensivel of [codRelato, txtRelato, codMem, txtMem, 'SEGUNDA-MENSAGEM-AA2', 'OUTRO-TITULO-AA2']) {
        expect(tudoEnvios).not.toContain(sensivel);
      }
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 9: rotas com tratamento de colisão de código', () => {
    it('integrantes: colisão isolada recupera sem 500 e sem duplicar; falha final (3 colisões) volta sem 500 e banco igual', async () => {
      // Colisão isolada com outro nome diferente que ocupou o mesmo slug no meio tempo
      const nomePessoa = 'Tia Colisão AA2';
      let vez = 0;
      const runOriginal = ComandoDeTeste.prototype.run;
      ComandoDeTeste.prototype.run = async function (this: ComandoDeTeste) {
        if (/INSERT INTO integrantes/.test(this.sql) && vez++ === 0) {
          sql.prepare(`INSERT INTO integrantes (id, nome, tipo, criado_por) VALUES ('tia-colisao-aa2', 'Outra Pessoa Qualquer', 'pessoa', 'giovanna')`).run();
        }
        return runOriginal.call(this);
      };
      try {
        const r = await semScript('integrantes', gui, { nome: nomePessoa, tipo: 'pessoa', tratamento: 'ela' });
        expect(r.status).toBe(303);
        expect(r.erro).toBeNull();
        expect(r.caminho).toBe('/pessoas/tia-colisao-aa2-2/editar');
        expect(linhas('SELECT id FROM integrantes WHERE nome = ?', nomePessoa)).toHaveLength(1);
      } finally {
        ComandoDeTeste.prototype.run = runOriginal;
      }

      // Falha final (3 colisões seguidas): sem 500, volta para /pessoas/nova com erro, banco igual
      const antes = impressao();
      let tentativas = 0;
      ComandoDeTeste.prototype.run = async function (this: ComandoDeTeste) {
        if (/INSERT INTO integrantes/.test(this.sql)) {
          tentativas++;
          throw new Error('UNIQUE constraint failed: integrantes.id');
        }
        return runOriginal.call(this);
      };
      try {
        const r = await semScript('integrantes', gui, { nome: 'Sem Código AA2', tipo: 'pessoa', tratamento: 'ele' });
        expect(r.status).toBe(303);
        expect(r.caminho).toBe('/pessoas/nova');
        expect(r.erro).toBe('Não consegui salvar.');
        expect(tentativas).toBe(3);
        expect(impressao()).toBe(antes);
      } finally {
        ComandoDeTeste.prototype.run = runOriginal;
      }
    });

    it('integrantes: a nova tentativa após colisão cita só quem cadastra vê, e não o nome de pessoa em laço privado de outro dono', async () => {
      // Giovanna tem uma pessoa que SÓ existe no laço "só eu vejo" dela, com apelido "Tia Zuzu AA2" e nome real "Segredo Privado AA2"
      const privId = uid('segredo-privado-aa2');
      criarPessoaPrivada('giovanna', privId, 'Segredo Privado AA2', { apelido: 'Tia Zuzu AA2' });
      expect((await repo.pessoasQueONaoVe(gui)).has(privId)).toBe(true);

      // Gui tenta cadastrar "Tia Zuzu AA2" e sofre uma colisão de id na primeira tentativa
      let colidiu = false;
      const runOriginal = ComandoDeTeste.prototype.run;
      ComandoDeTeste.prototype.run = async function (this: ComandoDeTeste) {
        if (/INSERT INTO integrantes/.test(this.sql) && !colidiu) {
          colidiu = true;
          throw new Error('UNIQUE constraint failed: integrantes.id');
        }
        return runOriginal.call(this);
      };
      try {
        const r = await semScript('integrantes', gui, { nome: 'Tia Zuzu AA2', tipo: 'pessoa', tratamento: 'ela' });
        // A vez 2 usa a mesma regra da primeira (listarIntegrantesQueVe): a pessoa da Giovanna não existe para o Gui,
        // e o cadastro segue com um endereço novo, sem citar ninguém
        expect(colidiu).toBe(true);
        expect(r.status).toBe(303);
        expect(r.erro).toBeNull();
        expect(r.destino?.toString() ?? '').not.toContain('Segredo');
        expect(r.caminho).toBe('/pessoas/tia-zuzu-aa2/editar');
        expect(linhas('SELECT id FROM integrantes WHERE nome = ?', 'Tia Zuzu AA2')).toHaveLength(1);
      } finally {
        ComandoDeTeste.prototype.run = runOriginal;
      }

      // Quem vê a pessoa (a dona do laço) continua recebendo o aviso de sempre na nova tentativa
      colidiu = false;
      ComandoDeTeste.prototype.run = async function (this: ComandoDeTeste) {
        if (/INSERT INTO integrantes/.test(this.sql) && !colidiu) {
          colidiu = true;
          // Outro pedido cadastra, no meio tempo, alguém com o mesmo nome que a Giovanna vê
          sql.prepare(`INSERT INTO integrantes (id, nome, tipo, criado_por) VALUES ('prima-meio-tempo-aa2', 'Prima Meio Tempo AA2', 'pessoa', 'gui')`).run();
          throw new Error('UNIQUE constraint failed: integrantes.id');
        }
        return runOriginal.call(this);
      };
      try {
        const r = await semScript('integrantes', giovanna, { nome: 'Prima Meio Tempo AA2', tipo: 'pessoa', tratamento: 'ela' });
        expect(r.status).toBe(303);
        expect(r.erro).toContain('Já existe Prima Meio Tempo AA2 no acervo');
      } finally {
        ComandoDeTeste.prototype.run = runOriginal;
      }
    });

    it('integrantes: o retrato só entra em retratos_enviados depois que a pessoa entrou; na falha final, nada fica no banco', async () => {
      const antes = impressao();
      // PNG mínimo válido (cabeçalho de 8 bytes)
      const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])], 'retrato.png', { type: 'image/png' });
      const postos: string[] = [];
      const putOriginal = (env.FOTOS as { put: (chave: string) => Promise<unknown> }).put;
      (env.FOTOS as { put: (chave: string) => Promise<unknown> }).put = async (chave: string) => {
        postos.push(chave);
        return undefined;
      };
      const runOriginal = ComandoDeTeste.prototype.run;
      ComandoDeTeste.prototype.run = async function (this: ComandoDeTeste) {
        if (/INSERT INTO integrantes/.test(this.sql)) throw new Error('UNIQUE constraint failed: integrantes.id');
        return runOriginal.call(this);
      };
      try {
        const r = await semScript('integrantes', gui, { nome: 'Com Retrato Sem Código', tipo: 'pessoa', retrato: png() });
        expect(r.status).toBe(303);
        expect(r.erro).toBe('Não consegui salvar.');
        // Nada no banco: nem a pessoa, nem a linha do tamanho do retrato
        expect(impressao()).toBe(antes);
        // O arquivo foi posto uma vez só (não um por tentativa) e fica sem dono no bucket, como o retrato trocado
        expect(postos).toHaveLength(1);
      } finally {
        ComandoDeTeste.prototype.run = runOriginal;
      }

      // Com o cadastro dando certo, a linha do tamanho aparece com a chave que ficou na pessoa
      try {
        const r = await semScript('integrantes', gui, { nome: 'Com Retrato AA2', tipo: 'pessoa', retrato: png() });
        expect(r.erro).toBeNull();
        const pessoa = uma<{ retrato: string }>('SELECT retrato FROM integrantes WHERE nome = ?', 'Com Retrato AA2');
        expect(pessoa.retrato).toBeTruthy();
        expect(linhas('SELECT chave FROM retratos_enviados WHERE chave = ?', pessoa.retrato)).toHaveLength(1);
      } finally {
        (env.FOTOS as { put: (chave: string) => Promise<unknown> }).put = putOriginal;
      }
    });

    it('o código novo de pessoa confere também quem está na lixeira: cadastrar alguém com o mesmo nome dá certo pela ficha, pelo laço e pela memória', async () => {
      // Três pessoas na lixeira, cada uma com o nome que vai ser cadastrado de novo
      for (const [id, nome] of [
        ['lixeira-ficha-aa2', 'Lixeira Ficha AA2'],
        ['lixeira-laco-aa2', 'Lixeira Laço AA2'],
        ['lixeira-memoria-aa2', 'Lixeira Memória AA2'],
      ]) {
        sql.prepare(`INSERT INTO integrantes (id, nome, tipo, criado_por) VALUES (?, ?, 'pessoa', 'gui')`).run(id, nome);
        expect(await repo.excluirPessoa(id, gui)).toBe(true);
      }

      // Pela ficha: a pessoa nova ganha outro código, e a da lixeira continua lá, intacta
      const ficha = await semScript('integrantes', gui, { nome: 'Lixeira Ficha AA2', tipo: 'pessoa', tratamento: 'ela' });
      expect(ficha.erro).toBeNull();
      expect(ficha.caminho).toBe('/pessoas/lixeira-ficha-aa2-2/editar');
      expect(uma<{ excluida_em: string | null }>('SELECT excluida_em FROM integrantes WHERE id = ?', 'lixeira-ficha-aa2').excluida_em).not.toBeNull();

      // Pelo laço, com o nome novo
      const laco = await semScript('lacos', gui, {
        acao: 'adicionar',
        laco: 'coracao',
        sujeito: 'gui',
        nomeNovo: 'Lixeira Laço AA2',
        tratamentoNovo: 'ele',
        nomeDoLaco: 'amigo',
        volta: '/pessoas/gui/editar',
      });
      expect(laco.erro).toBeNull();
      expect(linhas(`SELECT 1 FROM lacos_coracao WHERE dono_id = 'gui' AND pessoa_id = 'lixeira-laco-aa2-2'`)).toHaveLength(1);

      // Pela memória, em "Quem estava"
      const mem = await pedirJson('memorias', gui, {
        titulo: 'AA2: memória com pessoa nova',
        ano: 2022,
        tipo: 'causo',
        visibilidade: 'todos',
        situacao: 'publicada',
        pessoas: ['nova:0'],
        novasPessoas: [{ nome: 'Lixeira Memória AA2' }],
      });
      expect(mem.status).toBe(201);
      expect(linhas('SELECT 1 FROM memoria_integrantes WHERE memoria_id = ? AND integrante_id = ?', mem.corpo.id as string, 'lixeira-memoria-aa2-2')).toHaveLength(1);
      expect(linhas('SELECT 1 FROM memoria_integrantes WHERE integrante_id = ?', 'lixeira-memoria-aa2')).toHaveLength(0);
    });

    it('laços: colisão na pessoa nova pelo nome recupera sem 500 e sem duplicar; falha final volta com banco igual', async () => {
      const runOriginal = ComandoDeTeste.prototype.run;
      // Colisão isolada: outro pedido usa o slug com outro nome -> retry cria pessoa-2 e salva o laço uma vez
      let vez = 0;
      ComandoDeTeste.prototype.run = async function (this: ComandoDeTeste) {
        if (/INSERT INTO integrantes/.test(this.sql) && vez++ === 0) {
          sql.prepare(`INSERT INTO integrantes (id, nome, tipo, criado_por) VALUES ('amigo-laco-aa2', 'Outro Nome Qualquer', 'pessoa', 'giovanna')`).run();
        }
        return runOriginal.call(this);
      };
      try {
        const r = await semScript('lacos', gui, {
          acao: 'adicionar',
          laco: 'coracao',
          sujeito: 'gui',
          nomeNovo: 'Amigo Laço AA2',
          tratamentoNovo: 'ele',
          nomeDoLaco: 'amigo',
          volta: '/pessoas/gui/editar',
        });
        expect(r.status).toBe(303);
        expect(r.erro).toBeNull();
        expect(r.ok).toContain('Laço com Amigo Laço AA2 salvo.');
        expect(linhas('SELECT id FROM integrantes WHERE nome = ?', 'Amigo Laço AA2')).toHaveLength(1);
        expect(linhas(`SELECT id FROM lacos_coracao WHERE dono_id = 'gui' AND pessoa_id = 'amigo-laco-aa2-2'`)).toHaveLength(1);
      } finally {
        ComandoDeTeste.prototype.run = runOriginal;
      }

      // Falha final (3 colisões): sem 500, volta para `volta` com erro, banco igual
      const antes = impressao();
      let tentativas = 0;
      ComandoDeTeste.prototype.run = async function (this: ComandoDeTeste) {
        if (/INSERT INTO integrantes/.test(this.sql)) {
          tentativas++;
          throw new Error('UNIQUE constraint failed: integrantes.id');
        }
        return runOriginal.call(this);
      };
      try {
        const r = await semScript('lacos', gui, {
          acao: 'adicionar',
          laco: 'coracao',
          sujeito: 'gui',
          nomeNovo: 'Amigo Sem Código AA2',
          nomeDoLaco: 'amigo',
          volta: '/pessoas/gui/editar',
        });
        expect(r.status).toBe(303);
        expect(r.caminho).toBe('/pessoas/gui/editar');
        expect(r.erro).toBe('Não consegui salvar.');
        expect(tentativas).toBe(3);
        expect(impressao()).toBe(antes);
      } finally {
        ComandoDeTeste.prototype.run = runOriginal;
      }
    });

    it('capítulos com temas novos: colisão no capítulo ou no tema recupera sem 500 e sem duplicar; falha final deixa banco igual (nenhum tema solto)', async () => {
      // 1) Colisão isolada em temas.id -> recupera na tentativa 2, cria capítulo e tema uma vez só
      let colidiuTema = false;
      const rTema = await comLote(
        async (lista) => {
          if (!colidiuTema && lista.some((c) => /INSERT INTO temas/.test(c.sql))) {
            colidiuTema = true;
            sql.prepare(`INSERT INTO temas (id, nome, criado_por) VALUES ('tema-col-aa2', 'Tema Col AA2', 'giovanna')`).run();
          }
          return lote(lista);
        },
        () => semScript('capitulos', gui, { modo: 'reunido', titulo: 'AA2: Capítulo Colisão Tema', temas: 'Tema Col AA2', visibilidade: 'todos' }),
      );
      expect(rTema.status).toBe(303);
      expect(rTema.erro).toBeNull();
      expect(rTema.caminho).toMatch(/^\/capitulos\/[a-z0-9-]+$/);
      expect(linhas('SELECT id FROM capitulos WHERE titulo = ?', 'AA2: Capítulo Colisão Tema')).toHaveLength(1);
      expect(linhas('SELECT id FROM temas WHERE id = ?', 'tema-col-aa2')).toHaveLength(1);

      // 2) Falha final em capitulos.id (3 vezes) com tema NOVO: sem 500, volta para /capitulos/novo com erro, banco igual (tema novo NÃO fica gravado)
      const antesCap = impressao();
      let tentativasCap = 0;
      const rCapFalha = await comLote(
        async (lista) => {
          if (lista.some((c) => /INSERT INTO capitulos/.test(c.sql))) {
            tentativasCap++;
            throw new Error('UNIQUE constraint failed: capitulos.id');
          }
          return lote(lista);
        },
        () => semScript('capitulos', gui, { modo: 'reunido', titulo: 'AA2: Capítulo Sem Código', temas: 'Tema Que Não Pode Sobrar', visibilidade: 'todos' }),
      );
      expect(rCapFalha.status).toBe(303);
      expect(rCapFalha.caminho).toBe('/capitulos/novo');
      expect(rCapFalha.erro).toBe('Não consegui salvar.');
      expect(tentativasCap).toBe(3);
      expect(impressao()).toBe(antesCap);
      expect(linhas('SELECT id FROM temas WHERE nome = ?', 'Tema Que Não Pode Sobrar')).toHaveLength(0);
    });

    it('tipos: colisão isolada recupera sem 500 e sem duplicar; falha final (criar e promover) volta com banco igual', async () => {
      const runOriginal = ComandoDeTeste.prototype.run;
      // 1) Colisão isolada com outro rótulo de mesmo slug -> recupera com slug -2
      let vez = 0;
      ComandoDeTeste.prototype.run = async function (this: ComandoDeTeste) {
        if (/INSERT INTO tipos/.test(this.sql) && vez++ === 0) {
          sql.prepare(`INSERT INTO tipos (id, rotulo, cor, cor_da_paleta, icone, ordem, criado_por) VALUES ('sarau-aa2', 'Sarau Outro', 'uva', 'uva', 'outro', 99, 'giovanna')`).run();
        }
        return runOriginal.call(this);
      };
      try {
        const r = await semScript('tipos', gui, { acao: 'criar', rotulo: 'Sarau AA2', cor: 'uva', icone: 'outro' });
        expect(r.status).toBe(303);
        expect(r.erro).toBeNull();
        expect(r.ok).toBe('Tipo “Sarau AA2” criado.');
        expect(linhas('SELECT id FROM tipos WHERE rotulo = ?', 'Sarau AA2')).toHaveLength(1);
      } finally {
        ComandoDeTeste.prototype.run = runOriginal;
      }

      // 2) Falha final em criar (3 colisões): sem 500, volta para /admin/tipos com erro, banco igual
      const antesCriar = impressao();
      let tentativas = 0;
      ComandoDeTeste.prototype.run = async function (this: ComandoDeTeste) {
        if (/INSERT INTO tipos/.test(this.sql)) {
          tentativas++;
          throw new Error('UNIQUE constraint failed: tipos.id');
        }
        return runOriginal.call(this);
      };
      try {
        const r = await semScript('tipos', gui, { acao: 'criar', rotulo: 'Tipo Sem Código AA2', cor: 'uva', icone: 'outro' });
        expect(r.status).toBe(303);
        expect(r.caminho).toBe('/admin/tipos');
        expect(r.erro).toBe('Não consegui salvar.');
        expect(tentativas).toBe(3);
        expect(impressao()).toBe(antesCriar);
      } finally {
        ComandoDeTeste.prototype.run = runOriginal;
      }

      // 3) Falha final em promover "Outro" para tipo novo: não promove memória nenhuma, banco igual
      const mOutro = (await pedirJson('memorias', gui, { titulo: 'AA2: Tipo Outro', ano: 2024, tipo: 'outro', tipoOutro: 'Churrasco AA2', visibilidade: 'todos', situacao: 'publicada' })).corpo.id as string;
      const antesProm = impressao();
      ComandoDeTeste.prototype.run = async function (this: ComandoDeTeste) {
        if (/INSERT INTO tipos/.test(this.sql)) throw new Error('UNIQUE constraint failed: tipos.id');
        return runOriginal.call(this);
      };
      try {
        const r = await semScript('tipos', gui, { acao: 'promover', texto: 'Churrasco AA2', rotulo: 'Churrasco AA2', cor: 'uva', icone: 'outro' });
        expect(r.status).toBe(303);
        expect(r.caminho).toBe('/admin/tipos');
        expect(r.erro).toBe('Não consegui salvar.');
        expect(impressao()).toBe(antesProm);
        expect(uma<{ tipo: string }>('SELECT tipo FROM memorias WHERE id = ?', mOutro).tipo).toBe('outro');
      } finally {
        ComandoDeTeste.prototype.run = runOriginal;
      }
    });
  });
});
