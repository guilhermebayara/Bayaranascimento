// Ampliar quem vê uma memória com relatos (docs/decisoes.md; decisão do Gui de 17/11/2026). Ao ampliar,
// cada relato que já existia continua só para o público antigo até quem o registrou concordar. O teste
// passa pelas rotas de verdade (api/memorias e api/avisos) e confere, consulta por consulta, que nada do
// relato que espera chega a quem passou a ver: nem o texto, nem a contagem, nem os áudios, nem as fotos
// que vieram com ele, nem as novidades. Restringir não pede nada.
import { describe, expect, it, vi } from 'vitest';
import { fraseDosRelatosQueEsperam } from '../src/lib/avisos';
import { estaNoPublicoDoRelato, publicoAmpliado, publicoDentroDe, veORelato } from '../src/lib/servidor/permissoes';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe('regras de ampliar quem vê', () => {
  const nucleos = (...n: string[]) => ({ visibilidade: 'nucleos' as const, nucleos: n });
  const todos = { visibilidade: 'todos' as const, nucleos: [] };

  it('ampliar é dar a memória a alguém que não via; restringir não é', () => {
    expect(publicoAmpliado(nucleos('a'), todos)).toBe(true);
    expect(publicoAmpliado(nucleos('a'), nucleos('a', 'b'))).toBe(true);
    expect(publicoAmpliado(nucleos('a', 'b'), nucleos('a'))).toBe(false);
    expect(publicoAmpliado(todos, nucleos('a'))).toBe(false);
    expect(publicoAmpliado(nucleos('a'), nucleos('a'))).toBe(false);
  });

  it('a espera perde o sentido quando o público volta a caber no antigo', () => {
    expect(publicoDentroDe(nucleos('a'), ['a', 'b'])).toBe(true);
    expect(publicoDentroDe(nucleos('a', 'c'), ['a', 'b'])).toBe(false);
    expect(publicoDentroDe(todos, ['a'])).toBe(false);
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
});
