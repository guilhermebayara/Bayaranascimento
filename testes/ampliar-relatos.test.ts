// Ampliar quem vê uma memória com relatos (docs/decisoes.md; decisão do Gui de 17/11/2026). Ao ampliar,
// cada relato que já existia continua só para quem já o viu até quem o registrou concordar; o relato que
// já teve o público novo não espera (resposta do Gui à P3 do QA de 23/11/2026,
// docs/historico/qa/2026-11-23-perguntas.md). O teste passa pelas rotas de verdade (api/memorias e
// api/avisos) e confere, consulta por consulta, que nada do relato que espera chega a quem nunca o viu:
// nem o texto, nem a contagem, nem os áudios, nem as fotos que vieram com ele, nem as novidades.
// Restringir não pede nada.
import { describe, expect, it, vi } from 'vitest';
import { fraseDosRelatosQueEsperam } from '../src/lib/avisos';
import { paraQuemPassouAVer } from '../src/lib/servidor/avisos';
import { cabeNoConhecido, estaNoPublicoDoRelato, juntarPublicos, publicoConhecidoAntes, publicoMudou, relatoDepoisDaMudanca, veORelato } from '../src/lib/servidor/permissoes';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe('regras de ampliar quem vê', () => {
  const nucleos = (...n: string[]) => ({ visibilidade: 'nucleos' as const, nucleos: n });
  const todos = { visibilidade: 'todos' as const, nucleos: [] };

  it('o público conhecido soma quem já viu; o público da memória cabe nele ou não', () => {
    expect(juntarPublicos(['a'], ['b', 'a'])).toEqual(['a', 'b']);
    expect(juntarPublicos(['a'], 'todos')).toBe('todos');
    expect(cabeNoConhecido(nucleos('a'), ['a', 'b'])).toBe(true);
    expect(cabeNoConhecido(nucleos('a', 'c'), ['a', 'b'])).toBe(false);
    expect(cabeNoConhecido(todos, ['a'])).toBe(false);
    expect(cabeNoConhecido(todos, 'todos')).toBe(true);
  });

  it('só a mudança de público conta: famílias marcadas numa memória aberta a todos não mudam quem vê (revisão Y)', () => {
    expect(publicoMudou(todos, { visibilidade: 'todos', nucleos: ['a'] })).toBe(false);
    expect(publicoMudou({ visibilidade: 'todos', nucleos: ['a'] }, todos)).toBe(false);
    expect(publicoMudou(nucleos('a', 'b'), nucleos('b', 'a'))).toBe(false);
    expect(publicoMudou(nucleos('a'), nucleos('a', 'b'))).toBe(true);
    expect(publicoMudou(nucleos('a', 'b'), nucleos('a'))).toBe(true);
    expect(publicoMudou(nucleos('a'), todos)).toBe(true);
    expect(publicoMudou(todos, nucleos('a'))).toBe(true);
  });

  it('sem registro, o público conhecido é o de hoje, sem supor passado', () => {
    // Acompanha a memória: quem a via antes da mudança
    expect(publicoConhecidoAntes({ soParaNucleos: null }, nucleos('a'))).toEqual(['a']);
    expect(publicoConhecidoAntes({ soParaNucleos: null }, todos)).toBe('todos');
    // Espera: o público antigo dele
    expect(publicoConhecidoAntes({ soParaNucleos: ['a'] }, todos)).toEqual(['a']);
    // Com registro, soma o que a memória mostrava
    expect(publicoConhecidoAntes({ soParaNucleos: null, publicoConhecido: 'todos' }, nucleos('a'))).toBe('todos');
  });

  it('ao mudar quem vê, o relato espera só por quem nunca o viu', () => {
    const relato = (publicoConhecido: string[] | 'todos' | null, soParaNucleos: string[] | null = null) => ({ registradoPor: 'elizete', soParaNucleos, publicoConhecido });
    // Escrito com a memória aberta a todos, restringida e reaberta: não espera
    expect(relatoDepoisDaMudanca(relato(null), todos, nucleos('a'), 'gui')).toEqual({ soParaNucleos: null, publicoConhecido: 'todos' });
    expect(relatoDepoisDaMudanca(relato('todos'), nucleos('a'), todos, 'gui')).toEqual({ soParaNucleos: null, publicoConhecido: 'todos' });
    // Escrito com a memória restrita: ao abrir, espera
    expect(relatoDepoisDaMudanca(relato(null), nucleos('a'), todos, 'gui')).toEqual({ soParaNucleos: ['a'], publicoConhecido: ['a'] });
    // Em parte novo: fica para quem já via, espera só pelo que é novo
    expect(relatoDepoisDaMudanca(relato(['a', 'b']), nucleos('a'), nucleos('a', 'b', 'c'), 'gui')).toEqual({ soParaNucleos: ['a', 'b'], publicoConhecido: ['a', 'b'] });
    // Restringir para dentro do que ele já teve desfaz a espera
    expect(relatoDepoisDaMudanca(relato(['a'], ['a']), todos, nucleos('a'), 'gui')).toEqual({ soParaNucleos: null, publicoConhecido: ['a'] });
    // O relato de quem mudou não espera
    expect(relatoDepoisDaMudanca({ ...relato(null), registradoPor: 'gui' }, nucleos('a'), todos, 'gui')).toEqual({ soParaNucleos: null, publicoConhecido: 'todos' });
  });

  it('o relato que espera fica com o público antigo; quem registrou sempre vê', () => {
    const relato = { por: 'vo-bela', registradoPor: 'giovanna', soParaNucleos: ['a'] };
    expect(estaNoPublicoDoRelato(relato, { pessoa: 'magno', nucleos: ['b'] })).toBe(false);
    expect(estaNoPublicoDoRelato(relato, { pessoa: 'elizete', nucleos: ['a'] })).toBe(true);
    expect(estaNoPublicoDoRelato(relato, { pessoa: 'giovanna', nucleos: [] })).toBe(true);
    expect(veORelato(relato, { pessoa: 'magno', nucleos: ['b'] }, new Set())).toBe(false);
    expect(veORelato({ ...relato, soParaNucleos: null }, { pessoa: 'magno', nucleos: ['b'] }, new Set())).toBe(true);
  });

  it('a frase de quem ampliou diz de quem são os relatos que esperam', () => {
    expect(fraseDosRelatosQueEsperam([{ nome: 'Elizete', tratamento: 'ela' }, { nome: 'Lucas', tratamento: 'ele' }])).toBe(
      'Os relatos da Elizete e do Lucas aparecem para quem passou a ver quando eles concordarem.',
    );
    expect(fraseDosRelatosQueEsperam([{ nome: 'Elizete', tratamento: 'ela' }])).toBe('O relato da Elizete aparece para quem passou a ver quando ela concordar.');
    expect(fraseDosRelatosQueEsperam([])).toBe('');
  });
});

describe.skipIf(!comSqlite)('ampliar quem vê, no banco e nas rotas', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const { contextoDoExplorar } = await import('../src/lib/servidor/explorar');
  const memorias = await import('../src/pages/api/memorias');
  const avisos = await import('../src/pages/api/avisos');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const tipos = await repo.listarTipos();

  const sql = (texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...valores);
  const linha = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...valores) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const [gui, giovanna, elizete, magno] = ['gui', 'giovanna', 'elizete', 'lucas-magno'].map(usuarioDe);
  // O Magno não é da família Bayara Nascimento: a memória restrita a ela, ele não via
  expect(magno.nucleos).not.toContain('bayara-nascimento');

  const salvarMemoria = async (quem: Usuario, corpo: Record<string, unknown>) => {
    const request = new Request('http://localhost/api/memorias', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(corpo) });
    const resposta = await memorias.POST({ request, locals: { usuario: quem, tipos } } as unknown as Parameters<typeof memorias.POST>[0]);
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };
  const responder = async (quem: Usuario, campos: Record<string, string>) => {
    const dados = new FormData();
    for (const [k, v] of Object.entries(campos)) dados.set(k, v);
    const request = new Request('http://localhost/api/avisos', { method: 'POST', headers: { Origin: 'http://localhost' }, body: dados });
    const resposta = await avisos.POST({ request, locals: { usuario: quem, tipos } } as unknown as Parameters<typeof avisos.POST>[0]);
    return { status: resposta.status, local: resposta.headers.get('Location') ?? '' };
  };

  // A memória do Gui, só da família Bayara Nascimento, com o relato dele, o da Elizete (com áudio e uma
  // foto que veio com o relato) e o da Vó Bela, que não acessa o site, registrado pela Giovanna
  const ficha: Record<string, unknown> = { titulo: 'Segredo de família', ano: 1999, tipo: 'causo', pessoas: ['gui', 'elizete'], visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] };
  const { corpo: criada } = await salvarMemoria(gui, ficha);
  const id = criada.id as string;
  const relato = (por: string, registradoPor: string, texto: string) => {
    sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, publicado_em) VALUES (?, ?, ?, ?, 'publicada', datetime('now'))`, id, por, registradoPor, texto);
    return linha<{ id: number }>('SELECT id FROM relatos WHERE memoria_id = ? AND por = ?', id, por).id;
  };
  const doGui = relato('gui', 'gui', 'O Gui conta.');
  const daElizete = relato('elizete', 'elizete', 'A Elizete contou só para a família.');
  const daVo = relato('vo-bela', 'giovanna', 'A Vó Bela contou, e a Giovanna registrou.');
  sql(`INSERT INTO audios (relato_id, memoria_id, chave, tipo, tamanho, enviado_por) VALUES (?, ?, 'audios/teste-elizete.m4a', 'audio/mp4', 10, 'elizete')`, daElizete, id);
  sql(`INSERT INTO fotos (memoria_id, relato_id, chave, principal, ordem, enviada_por) VALUES (?, ?, 'teste/foto-da-elizete.jpg', 1, 0, 'elizete')`, id, daElizete);
  // Quem criou continua mandando a foto no formulário: as fotos que saem da lista vão para a lixeira
  ficha.fotos = [{ id: linha<{ id: number }>(`SELECT id FROM fotos WHERE chave = 'teste/foto-da-elizete.jpg'`).id, principal: true }];

  /** Tudo o que as telas leem do relato, para uma pessoa */
  async function oQueVe(quem: Usuario) {
    const memoria = await repo.obterMemoria(quem, id);
    const publicadas = await repo.listarMemorias(quem);
    const contexto = await contextoDoExplorar(quem, publicadas);
    return {
      relatos: memoria ? (await repo.listarRelatos(quem, id)).map((r) => r.texto) : null,
      contagem: memoria?.relatos ?? null,
      fotos: memoria?.fotos.map((f) => f.chave) ?? null,
      podeVerFoto: await repo.podeVerFoto(quem, 'teste/foto-da-elizete.jpg'),
      ouve: await repo.podeOuvirAudio(quem, 'audios/teste-elizete.m4a'),
      comAudio: contexto.comAudio.has(id),
      contaram: [...(contexto.contaram.get(id) ?? [])].sort(),
      vozDaElizete: (await repo.listarAudiosDe(quem, 'elizete')).filter((a) => a.memoriaId === id).length,
      novidades: (await repo.listarRelatosPublicadosDesde(quem, '2000-01-01 00:00:00')).filter((r) => r.memoriaId === id).map((r) => r.por).sort(),
    };
  }

  it('antes de ampliar, o Magno não vê nada da memória', async () => {
    expect((await oQueVe(magno)).relatos).toBeNull();
    expect((await oQueVe(magno)).podeVerFoto).toBe(false);
  });

  it('ao ampliar, quem ampliou sabe de quem são os relatos que esperam, e cada autor recebe o pedido', async () => {
    const { status, corpo } = await salvarMemoria(gui, { ...ficha, id, visibilidade: 'todos' });
    expect(status).toBe(200);
    expect((corpo.esperam as string[]).sort()).toEqual(['elizete', 'vo-bela']);
    // O relato de quem ampliou não espera: foi ele mesmo que abriu
    expect(linha<{ so: string | null }>('SELECT so_para_nucleos AS so FROM relatos WHERE id = ?', doGui).so).toBeNull();
    const pedidos = (quem: Usuario) => repo.listarAvisos(quem).then((l) => l.filter((a) => a.tipo === 'liberar-relato' && a.memoriaId === id).map((a) => a.relato?.id));
    expect(await pedidos(elizete)).toEqual([daElizete]);
    // Relato de quem não acessa o site: quem registrou responde
    expect(await pedidos(giovanna)).toEqual([daVo]);
    expect(await pedidos(gui)).toEqual([]);
    expect(await pedidos(magno)).toEqual([]);
  });

  it('nada dos relatos que esperam chega a quem passou a ver, antes do sim', async () => {
    const magnoVe = await oQueVe(magno);
    expect(magnoVe).toEqual({
      relatos: ['O Gui conta.'],
      contagem: 1,
      fotos: [],
      podeVerFoto: false,
      ouve: false,
      comAudio: false,
      contaram: ['gui'],
      vozDaElizete: 0,
      novidades: ['gui'],
    });
    // O público antigo continua vendo tudo
    const elizeteVe = await oQueVe(elizete);
    expect(elizeteVe.contagem).toBe(3);
    expect(elizeteVe.fotos).toEqual(['teste/foto-da-elizete.jpg']);
    expect(elizeteVe.ouve).toBe(true);
    // E os avisos do Magno não falam desses relatos
    expect((await repo.listarAvisos(magno, { historico: true })).filter((a) => a.relato && [daElizete, daVo].includes(a.relato.id))).toEqual([]);
  });

  it('só quem registrou responde; os outros recebem o mesmo que um aviso que não existe', async () => {
    const [aviso] = (await repo.listarAvisos(elizete)).filter((a) => a.tipo === 'liberar-relato');
    expect((await responder(magno, { aviso: String(aviso!.id), resposta: 'liberar' })).status).toBe(404);
    // Pelo relato, a resposta é a mesma de um relato que não existe, para quem vê e para quem não vê o
    // relato (QA de 18/11/2026: o recado de recusa denunciava o relato escondido)
    const inexistente = await responder(magno, { relato: '999999', resposta: 'liberar' });
    expect(inexistente.status).toBe(404);
    expect((await responder(giovanna, { relato: String(daElizete), resposta: 'liberar' })).status).toBe(404);
    expect((await responder(magno, { relato: String(daVo), resposta: 'manter' })).status).toBe(404);
    expect((await responder(magno, { relato: String(daElizete), resposta: 'manter' })).status).toBe(404);
    expect((await oQueVe(magno)).contagem).toBe(1);
  });

  it('"Manter como estava" tira o pedido da lista e o relato continua escondido; a linha do relato libera depois', async () => {
    const [aviso] = (await repo.listarAvisos(elizete)).filter((a) => a.tipo === 'liberar-relato');
    const { local } = await responder(elizete, { aviso: String(aviso!.id), resposta: 'manter' });
    expect(local).toContain('ok=');
    expect((await repo.listarAvisos(elizete)).filter((a) => a.tipo === 'liberar-relato')).toEqual([]);
    expect((await repo.listarAvisos(elizete, { historico: true })).find((a) => a.id === aviso!.id)?.resposta).toBe('manter');
    expect((await oQueVe(magno)).contagem).toBe(1);
    // Mudou de ideia: a linha discreta no relato
    await responder(elizete, { relato: String(daElizete), resposta: 'liberar' });
    const magnoVe = await oQueVe(magno);
    expect(magnoVe.relatos).toContain('A Elizete contou só para a família.');
    expect(magnoVe.fotos).toEqual(['teste/foto-da-elizete.jpg']);
    expect(magnoVe.ouve).toBe(true);
    expect(magnoVe.vozDaElizete).toBe(1);
  });

  it('restringir não pede nada, e a espera que perdeu o sentido se desfaz', async () => {
    await salvarMemoria(gui, { ...ficha, id, visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] });
    expect(linha<{ so: string | null }>('SELECT so_para_nucleos AS so FROM relatos WHERE id = ?', daVo).so).toBeNull();
    expect((await repo.listarAvisos(giovanna)).filter((a) => a.tipo === 'liberar-relato' && a.memoriaId === id)).toEqual([]);
    expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM avisos WHERE tipo = 'liberar-relato' AND memoria_id = ? AND resolvido_em IS NULL`, id).n).toBe(0);
  });

  it('ampliar só para mais uma família também pede, e o relato fica com a família de antes', async () => {
    // A Giovanna é da família Bayara Nascimento e da Bayara Bracarense, que é a do Magno
    const base = { titulo: 'Só da família', ano: 2001, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] };
    const outra = (await salvarMemoria(giovanna, base)).corpo.id as string;
    sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, 'elizete', 'elizete', 'Da Elizete, para a família.', 'publicada')`, outra);
    const { status } = await salvarMemoria(giovanna, { ...base, id: outra, nucleos: ['bayara-nascimento', 'bayara-bracarense'] });
    expect(status).toBe(200);
    const pedido = (await repo.listarAvisos(elizete)).find((a) => a.tipo === 'liberar-relato' && a.memoriaId === outra);
    expect(pedido?.dados.paraQuem).toBe('a família Bayara Bracarense');
    // O Magno passou a ver a memória, mas não o relato da Elizete
    expect(await repo.obterMemoria(magno, outra)).toBeDefined();
    expect((await repo.listarRelatos(magno, outra)).length).toBe(0);
    expect((await repo.obterMemoria(magno, outra))!.relatos).toBe(0);
    expect((await repo.listarRelatos(gui, outra)).map((r) => r.texto)).toEqual(['Da Elizete, para a família.']);
  });
  // Restringir e ampliar de novo (resposta do Gui à P3 do QA de 23/11/2026): o relato só espera por quem
  // nunca o viu. Cada caso cria a própria memória, com relatos gravados direto no banco, e passa pelas rotas.
  const [lucio] = ['lucio'].map(usuarioDe);
  expect(lucio.nucleos).toEqual(['bracarense']);
  const pedidosAbertos = (memoria: string) =>
    (banco.sqlite.prepare(`SELECT para, relato_id AS relato FROM avisos WHERE tipo = 'liberar-relato' AND memoria_id = ? AND resolvido_em IS NULL ORDER BY para`).all(memoria) as { para: string; relato: number }[]);
  const novaMemoria = async (quem: Usuario, base: Record<string, unknown>) => {
    const { status, corpo } = await salvarMemoria(quem, base);
    expect(status).toBe(201);
    return corpo.id as string;
  };
  const relatoEm = (memoria: string, por: string, texto: string) => {
    sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, publicado_em) VALUES (?, ?, ?, ?, 'publicada', datetime('now'))`, memoria, por, por, texto);
    return linha<{ id: number }>('SELECT id FROM relatos WHERE memoria_id = ? AND por = ?', memoria, por).id;
  };
  const mudar = async (quem: Usuario, base: Record<string, unknown>, memoria: string, publico: Record<string, unknown>) => {
    const { status, corpo } = await salvarMemoria(quem, { ...base, ...publico, id: memoria });
    expect(status).toBe(200);
    return ((corpo.esperam as string[] | undefined) ?? []).sort();
  };
  /** Tudo o que as telas leem de um relato, para quem nunca o viu */
  async function oQueChegaDoRelato(quem: Usuario, memoria: string, autor: string, texto: string, chaves: { foto?: string; audio?: string } = {}) {
    const vista = await repo.obterMemoria(quem, memoria);
    const contexto = await contextoDoExplorar(quem, await repo.listarMemorias(quem));
    return {
      texto: vista ? (await repo.listarRelatos(quem, memoria)).some((r) => r.texto === texto) : false,
      contado: [...(contexto.contaram.get(memoria) ?? [])].includes(autor),
      foto: vista?.fotos.some((f) => f.chave === chaves.foto) ?? false,
      podeVerFoto: chaves.foto ? await repo.podeVerFoto(quem, chaves.foto) : false,
      ouve: chaves.audio ? await repo.podeOuvirAudio(quem, chaves.audio) : false,
      comAudio: chaves.audio ? contexto.comAudio.has(memoria) : false,
      voz: (await repo.listarAudiosDe(quem, autor)).some((a) => a.memoriaId === memoria),
      novidade: (await repo.listarRelatosPublicadosDesde(quem, '2000-01-01 00:00:00')).some((r) => r.memoriaId === memoria && r.por === autor),
      aviso: (await repo.listarAvisos(quem, { historico: true })).some((a) => a.memoriaId === memoria && a.relato?.por === autor),
    };
  }
  const nadaChega = { texto: false, contado: false, foto: false, podeVerFoto: false, ouve: false, comAudio: false, voz: false, novidade: false, aviso: false };

  it('relato escrito com a memória aberta a todos: restringir e reabrir não pede nada, e um autor volta a ver o do outro', async () => {
    const base = { titulo: 'Aberta, fechada e aberta', ano: 2002, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'todos', nucleos: [] };
    const memoria = await novaMemoria(giovanna, base);
    relatoEm(memoria, 'elizete', 'A Elizete escreveu para todos.');
    relatoEm(memoria, 'gui', 'O Gui escreveu para todos.');
    expect(await mudar(giovanna, base, memoria, { visibilidade: 'nucleos', nucleos: ['bayara-bracarense'] })).toEqual([]);
    expect(await repo.obterMemoria(elizete, memoria)).toBeUndefined();
    expect(await mudar(giovanna, base, memoria, { visibilidade: 'todos', nucleos: [] })).toEqual([]);
    expect(pedidosAbertos(memoria)).toEqual([]);
    expect(linha<{ n: number }>('SELECT COUNT(*) AS n FROM relatos WHERE memoria_id = ? AND so_para_nucleos IS NOT NULL', memoria).n).toBe(0);
    expect((await repo.listarRelatos(elizete, memoria)).map((r) => r.texto)).toContain('O Gui escreveu para todos.');
    expect((await repo.listarRelatos(gui, memoria)).map((r) => r.texto)).toContain('A Elizete escreveu para todos.');
    expect((await repo.listarRelatos(lucio, memoria)).length).toBe(2);
  });

  it('relato que o autor já liberou para um público: restringir e ampliar de novo para ele não pede nada', async () => {
    // A Giovanna é da Bayara Nascimento e da Bayara Bracarense; a Elizete, só da primeira
    const base = { titulo: 'Liberado antes', ano: 2003, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] };
    const memoria = await novaMemoria(giovanna, base);
    const daElizete = relatoEm(memoria, 'elizete', 'A Elizete liberou.');
    expect(await mudar(giovanna, base, memoria, { nucleos: ['bayara-nascimento', 'bayara-bracarense'] })).toEqual(['elizete']);
    await responder(elizete, { relato: String(daElizete), resposta: 'liberar' });
    expect(await mudar(giovanna, base, memoria, { nucleos: ['bayara-nascimento'] })).toEqual([]);
    expect(await mudar(giovanna, base, memoria, { nucleos: ['bayara-nascimento', 'bayara-bracarense'] })).toEqual([]);
    expect(pedidosAbertos(memoria)).toEqual([]);
    expect((await repo.listarRelatos(magno, memoria)).map((r) => r.texto)).toEqual(['A Elizete liberou.']);
    // Para quem nunca viu (a família Bracarense), abrir a todos ainda pede
    expect(await mudar(giovanna, base, memoria, { visibilidade: 'todos', nucleos: [] })).toEqual(['elizete']);
    expect(await oQueChegaDoRelato(lucio, memoria, 'elizete', 'A Elizete liberou.')).toEqual(nadaChega);
    expect((await repo.listarRelatos(magno, memoria)).map((r) => r.texto)).toEqual(['A Elizete liberou.']);
  });

  it('relato escrito com a memória restrita: ampliar, restringir e ampliar de novo sem resposta, e o pedido continua valendo', async () => {
    const base = { titulo: 'Só da Bayara Bracarense', ano: 2004, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: ['bayara-bracarense'] };
    const memoria = await novaMemoria(giovanna, base);
    const doMagno = relatoEm(memoria, 'lucas-magno', 'O Magno contou para a família dele.');
    sql(`INSERT INTO audios (relato_id, memoria_id, chave, tipo, tamanho, enviado_por) VALUES (?, ?, 'audios/teste-magno.m4a', 'audio/mp4', 10, 'lucas-magno')`, doMagno, memoria);
    sql(`INSERT INTO fotos (memoria_id, relato_id, chave, principal, ordem, enviada_por) VALUES (?, ?, 'teste/foto-do-magno.jpg', 1, 0, 'lucas-magno')`, memoria, doMagno);
    const comFoto = { ...base, fotos: [{ id: linha<{ id: number }>(`SELECT id FROM fotos WHERE chave = 'teste/foto-do-magno.jpg'`).id, principal: true }] };
    const chaves = { foto: 'teste/foto-do-magno.jpg', audio: 'audios/teste-magno.m4a' };
    expect(await mudar(giovanna, comFoto, memoria, { visibilidade: 'todos', nucleos: [] })).toEqual(['lucas-magno']);
    expect(pedidosAbertos(memoria)).toEqual([{ para: 'lucas-magno', relato: doMagno }]);
    // O Magno não respondeu; restringir tira o pedido da lista
    expect(await mudar(giovanna, comFoto, memoria, { visibilidade: 'nucleos', nucleos: ['bayara-bracarense'] })).toEqual([]);
    expect(pedidosAbertos(memoria)).toEqual([]);
    // Ampliar de novo: o público novo nunca viu, e o pedido volta a valer, um só
    expect(await mudar(giovanna, comFoto, memoria, { visibilidade: 'todos', nucleos: [] })).toEqual(['lucas-magno']);
    expect(pedidosAbertos(memoria)).toEqual([{ para: 'lucas-magno', relato: doMagno }]);
    expect((await repo.listarAvisos(magno)).find((a) => a.tipo === 'liberar-relato' && a.memoriaId === memoria)?.dados.paraQuem).toBe('toda a família');
    expect(await oQueChegaDoRelato(gui, memoria, 'lucas-magno', 'O Magno contou para a família dele.', chaves)).toEqual(nadaChega);
    expect(await oQueChegaDoRelato(lucio, memoria, 'lucas-magno', 'O Magno contou para a família dele.', chaves)).toEqual(nadaChega);
    // Quem já via continua vendo tudo
    const giovannaVe = await oQueChegaDoRelato(giovanna, memoria, 'lucas-magno', 'O Magno contou para a família dele.', chaves);
    expect([giovannaVe.texto, giovannaVe.foto, giovannaVe.ouve]).toEqual([true, true, true]);
  });

  it('relato escrito durante o período restrito: ao reabrir, espera', async () => {
    const base = { titulo: 'Escrito no meio', ano: 2005, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'todos', nucleos: [] };
    const memoria = await novaMemoria(giovanna, base);
    expect(await mudar(giovanna, base, memoria, { visibilidade: 'nucleos', nucleos: ['bayara-bracarense'] })).toEqual([]);
    const doMagno = relatoEm(memoria, 'lucas-magno', 'O Magno escreveu enquanto era só da família.');
    expect(await mudar(giovanna, base, memoria, { visibilidade: 'todos', nucleos: [] })).toEqual(['lucas-magno']);
    expect(pedidosAbertos(memoria)).toEqual([{ para: 'lucas-magno', relato: doMagno }]);
    expect(await oQueChegaDoRelato(gui, memoria, 'lucas-magno', 'O Magno escreveu enquanto era só da família.')).toEqual(nadaChega);
  });

  it('ampliar para um público em parte novo: o relato fica para quem já via e espera só pelo que é novo', async () => {
    // O Magno é da Bayara Bracarense e da Bracarense; o Lúcio, só da Bracarense; a Giovanna, da Bayara
    // Bracarense e da Bayara Nascimento; o Gui, só da Bayara Nascimento
    const base = { titulo: 'Duas famílias', ano: 2006, tipo: 'causo', pessoas: ['lucas-magno'], visibilidade: 'nucleos', nucleos: ['bayara-bracarense', 'bracarense'] };
    const memoria = await novaMemoria(magno, base);
    const doLucio = relatoEm(memoria, 'lucio', 'O Lúcio escreveu para as duas famílias.');
    expect(await mudar(magno, base, memoria, { nucleos: ['bracarense'] })).toEqual([]);
    expect(await repo.obterMemoria(giovanna, memoria)).toBeUndefined();
    expect(await mudar(magno, base, memoria, { visibilidade: 'todos', nucleos: [] })).toEqual(['lucio']);
    expect(pedidosAbertos(memoria)).toEqual([{ para: 'lucio', relato: doLucio }]);
    expect(linha<{ so: string }>('SELECT so_para_nucleos AS so FROM relatos WHERE id = ?', doLucio).so).toBe('["bayara-bracarense","bracarense"]');
    // A Giovanna já via e volta a ver; o Gui nunca viu
    expect((await repo.listarRelatos(giovanna, memoria)).map((r) => r.texto)).toEqual(['O Lúcio escreveu para as duas famílias.']);
    expect(await oQueChegaDoRelato(gui, memoria, 'lucio', 'O Lúcio escreveu para as duas famílias.')).toEqual(nadaChega);
    // Depois do sim, o Gui vê
    await responder(lucio, { relato: String(doLucio), resposta: 'liberar' });
    expect((await repo.listarRelatos(gui, memoria)).map((r) => r.texto)).toEqual(['O Lúcio escreveu para as duas famílias.']);
  });

  it('o pedido diz para quem a memória é nova do ponto de vista do relato', () => {
    const familias = [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }, { id: 'c', nome: 'C' }];
    expect(paraQuemPassouAVer({ visibilidade: 'nucleos', nucleos: ['a', 'b'] }, { visibilidade: 'nucleos', nucleos: ['a', 'b', 'c'] }, familias)).toBe('a família C');
  });
});
