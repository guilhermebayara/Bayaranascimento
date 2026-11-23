// Um pedido recusado não deixa nada gravado pela metade (QA de 23/11/2026, sessão U, docs/historico/qa/2026-11-23-relatorio.md). Cada rota que grava
// confere tudo antes de escrever no banco: a pessoa nova de "Quem estava", o tema novo e a memória com um
// relato que não pode ser escrito só são gravados quando o pedido inteiro passa. Testado com as rotas de
// verdade sobre o banco SQLite em memória (testes/apoio/d1.ts).
//
// Regra do CLAUDE.md ("Conferências"): toda rota que grava ganha um caso aqui quando alguém mexer nela, com
// a impressão do banco inteiro (todas as tabelas) antes e depois do pedido recusado, que precisa sair igual.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('pedido recusado não grava pela metade', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const memorias = await import('../src/pages/api/memorias');
  const avisos = await import('../src/pages/api/avisos');
  const lixeira = await import('../src/pages/api/lixeira');
  const reacoes = await import('../src/pages/api/reacoes');
  const sugestoes = await import('../src/pages/api/sugestoes');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;

  const linha = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...valores) as T;
  const conta = (texto: string, ...valores: (string | number | null)[]) => linha<{ n: number }>(texto, ...valores).n;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const elizete = usuarioDe('elizete');
  const tipos = (banco.sqlite.prepare('SELECT id FROM tipos').all() as { id: string }[]).map((t) => ({ id: t.id }));
  const tipo = tipos[0].id;

  const salvar = async (quem: Usuario, corpo: Record<string, unknown>) => {
    const request = new Request('http://localhost/api/memorias', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(corpo) });
    const resposta = await memorias.POST({ request, locals: { usuario: quem, tipos } } as unknown as Parameters<typeof memorias.POST>[0]);
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };
  const pessoasChamadas = (nome: string) => conta('SELECT COUNT(*) AS n FROM integrantes WHERE nome = ?', nome);
  const temasChamados = (nome: string) => conta('SELECT COUNT(*) AS n FROM temas WHERE nome = ?', nome);
  const memoriasChamadas = (titulo: string) => conta('SELECT COUNT(*) AS n FROM memorias WHERE titulo = ?', titulo);

  /** A impressão do banco inteiro: todas as linhas de todas as tabelas, em ordem */
  const impressao = () => {
    const tabelas = (banco.sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all() as { name: string }[]).map((t) => t.name);
    return JSON.stringify(tabelas.map((t) => [t, banco.sqlite.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all()]));
  };
  /** Um formulário comum para uma rota, como o navegador manda */
  const formulario = async (rota: { POST: (contexto: never) => Promise<Response> | Response }, caminho: string, quem: Usuario, campos: Record<string, string>) => {
    const dados = new FormData();
    for (const [k, v] of Object.entries(campos)) dados.set(k, v);
    const request = new Request(`http://localhost${caminho}`, { method: 'POST', headers: { Origin: 'http://localhost' }, body: dados });
    const resposta = await rota.POST({ request, locals: { usuario: quem, tipos } } as never);
    return { status: resposta.status, erro: new URL(resposta.headers.get('Location') ?? '/', 'http://localhost').searchParams.get('erro') };
  };

  it('marcar alguém que não existe recusa sem cadastrar a pessoa nova nem o tema', async () => {
    const r = await salvar(elizete, { titulo: 'Recusada 1', ano: 2020, tipo, pessoas: ['nova:0', 'ninguem-com-este-id'], novasPessoas: [{ nome: 'Pessoa Recusada Um' }], temas: 'Tema Recusado Um' });
    expect(r.status).toBe(400);
    expect(pessoasChamadas('Pessoa Recusada Um')).toBe(0);
    expect(temasChamados('Tema Recusado Um')).toBe(0);
    expect(memoriasChamadas('Recusada 1')).toBe(0);
  });

  it('uma foto que não existe recusa sem cadastrar a pessoa nova', async () => {
    const r = await salvar(elizete, { titulo: 'Recusada 2', ano: 2020, tipo, pessoas: ['nova:0'], novasPessoas: [{ nome: 'Pessoa Recusada Dois' }], fotos: [{ id: 987654 }] });
    expect(r.status).toBe(400);
    expect(pessoasChamadas('Pessoa Recusada Dois')).toBe(0);
  });

  it('o relato em nome de quem acessa o site é recusado antes de a memória ser salva', async () => {
    const r = await salvar(elizete, { titulo: 'Recusada 3', ano: 2020, tipo, pessoas: ['nova:0'], novasPessoas: [{ nome: 'Pessoa Recusada Três' }], temas: 'Tema Recusado Três', relato: { por: 'gui', texto: 'Escrito pela Elizete no lugar do Gui.' } });
    expect(r.status).toBe(403);
    expect(memoriasChamadas('Recusada 3')).toBe(0);
    expect(pessoasChamadas('Pessoa Recusada Três')).toBe(0);
    expect(temasChamados('Tema Recusado Três')).toBe(0);
  });

  it('/api/memorias: com áudio no relato, o pedido recusado não prende o áudio nem grava a memória (D1 da sessão Z)', async () => {
    const repo = await import('../src/lib/servidor/repositorio');
    const audio = await repo.registrarAudio({ chave: 'teste/recusado-com-audio.m4a', tipo: 'audio/mp4', tamanho: 10, duracao: 2, memoriaId: null }, elizete);
    const antes = impressao();
    const r = await salvar(elizete, { titulo: 'Recusada com áudio', ano: 2020, tipo, pessoas: ['elizete'], relato: { por: 'gui', texto: 'No lugar do Gui.', audios: [{ id: audio }] } });
    expect(r.status).toBe(403);
    expect(impressao()).toBe(antes);
  });

  it('/api/memorias: o código que repete nas três tentativas recusa sem gravar nada (D2 da sessão Z)', async () => {
    const lote = banco.batch.bind(banco);
    banco.batch = async (comandos) => {
      if (comandos.some((c) => /^\s*INSERT INTO memorias/.test(c.sql))) throw new Error('D1_ERROR: UNIQUE constraint failed: memorias.id: SQLITE_CONSTRAINT');
      return lote(comandos);
    };
    try {
      const antes = impressao();
      const r = await salvar(elizete, { titulo: 'Recusada pelo código', ano: 2020, tipo, pessoas: ['nova:0'], novasPessoas: [{ nome: 'Pessoa do Código' }], temas: 'Tema do Código' });
      expect(r.status).toBe(503);
      expect(impressao()).toBe(antes);
    } finally {
      banco.batch = lote;
    }
  });

  it('/api/relatos: o envio sem script recusado não guarda o código de envio nem nada mais (D3 da sessão Z)', async () => {
    const relatos = await import('../src/pages/api/relatos');
    const antes = impressao();
    const r = await formulario(relatos, '/api/relatos', elizete, { memoria: 'ninguem-tem-esta', por: 'elizete', acrescentar: '1', texto: 'Nada.', situacao: 'publicada', envio: 'codigo-de-envio-recusado' });
    expect(r.erro).toBe('Memória não encontrada.');
    expect(impressao()).toBe(antes);
  });

  it('/api/relatos: o público que a tela não oferece é recusado sem mudar nada (D5 da sessão Z)', async () => {
    const relatos = await import('../src/pages/api/relatos');
    const antes = impressao();
    const r = await formulario(relatos, '/api/relatos', elizete, { memoria: 'recusas', por: 'aguilar', acrescentar: '1', texto: 'Forjado.', situacao: 'publicada', publico: 'nucleos:bracarense' });
    expect(r.erro).toBe('Envio inválido.');
    expect(impressao()).toBe(antes);
  });

  it('/api/memorias: o relato numa memória publicada, que a tela não oferece, é recusado sem mudar nada (D6 da sessão Z)', async () => {
    const antes = impressao();
    // O Gui criou a memória e pode corrigi-la: a recusa é pelo relato, que a tela não oferece na memória publicada
    const r = await salvar(gui, { id: 'recusas', titulo: 'Pedidos recusados', ano: 1991, tipo, pessoas: [], relato: { por: 'gui', texto: 'Pela ficha.' } });
    expect(r.status).toBe(400);
    expect(r.corpo.erro).toBe('Envio inválido.');
    expect(impressao()).toBe(antes);
  });

  it('o mesmo pedido, sem o que era recusado, grava tudo, e a mesma pessoa nova repetida vira uma só', async () => {
    const r = await salvar(elizete, { titulo: 'Aceita', ano: 2020, tipo, pessoas: ['nova:0', 'nova:1'], novasPessoas: [{ nome: 'Pessoa Aceita' }, { nome: 'Pessoa Aceita' }], temas: 'Tema Aceito', relato: { por: 'elizete', texto: 'O meu relato.' } });
    expect(r.status).toBe(201);
    expect(pessoasChamadas('Pessoa Aceita')).toBe(1);
    expect(temasChamados('Tema Aceito')).toBe(1);
    const id = r.corpo.id as string;
    expect(conta('SELECT COUNT(*) AS n FROM memoria_integrantes WHERE memoria_id = ?', id)).toBe(1);
    expect(conta('SELECT COUNT(*) AS n FROM relatos WHERE memoria_id = ? AND por = ?', id, 'elizete')).toBe(1);
  });

  // Uma memória do Gui com um relato da Elizete que espera o sim dela (ampliar quem vê), e o rascunho que o
  // Gui escreveu pelo Aguilar depois de a Elizete publicar o relato dele
  const gui = usuarioDe('gui');
  const giovanna = usuarioDe('giovanna');
  banco.sqlite.prepare(`INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por) VALUES ('recusas', 'Pedidos recusados', 1991, ?, 'todos', 'publicada', 'gui')`).run(tipo);
  banco.sqlite.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, so_para_nucleos) VALUES ('recusas', 'elizete', 'elizete', 'Da Elizete, esperando.', 'publicada', '["bayara-nascimento"]')`).run();
  const daElizete = linha<{ id: number }>(`SELECT id FROM relatos WHERE memoria_id = 'recusas' AND por = 'elizete'`).id;
  banco.sqlite.prepare(`INSERT INTO avisos (para, tipo, memoria_id, relato_id, de) VALUES ('elizete', 'liberar-relato', 'recusas', ?, 'gui')`).run(daElizete);
  const pedido = linha<{ id: number }>(`SELECT id FROM avisos WHERE relato_id = ? AND tipo = 'liberar-relato'`, daElizete).id;
  banco.sqlite.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES ('recusas', 'aguilar', 'elizete', 'O Aguilar, pela Elizete.', 'publicada')`).run();
  banco.sqlite.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES ('recusas', 'aguilar', 'gui', 'O Aguilar, pelo Gui.', 'rascunho')`).run();
  const doGui = linha<{ id: number }>(`SELECT id FROM relatos WHERE memoria_id = 'recusas' AND registrado_por = 'gui'`).id;

  it('/api/memorias: quem é citada e tenta mudar quem vê é recusada sem mudar nada, nem os relatos que esperam', async () => {
    banco.sqlite.prepare(`INSERT INTO memoria_integrantes (memoria_id, integrante_id) VALUES ('recusas', 'elizete')`).run();
    const antes = impressao();
    const ficha = { id: 'recusas', titulo: 'Pedidos recusados', ano: 1991, tipo, pessoas: ['elizete'] };
    expect((await salvar(elizete, { ...ficha, visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] })).status).toBe(403);
    expect(impressao()).toBe(antes);
  });

  it('/api/avisos: liberar o relato de outra pessoa é recusado sem mudar nada', async () => {
    const antes = impressao();
    expect((await formulario(avisos, '/api/avisos', gui, { relato: String(daElizete), resposta: 'liberar' })).status).toBe(404);
    expect((await formulario(avisos, '/api/avisos', gui, { aviso: String(pedido), resposta: 'liberar' })).status).toBe(404);
    expect((await formulario(avisos, '/api/avisos', elizete, { relato: String(daElizete), resposta: 'talvez' })).status).toBe(400);
    expect(impressao()).toBe(antes);
  });

  it('/api/lixeira: descartar ou restaurar o rascunho de outra pessoa é recusado sem mudar nada', async () => {
    const antes = impressao();
    expect((await formulario(lixeira, '/api/lixeira', giovanna, { acao: 'descartar-relato', memoria: 'recusas', por: 'aguilar' })).erro).toBe('Rascunho não encontrado.');
    expect((await formulario(lixeira, '/api/lixeira', elizete, { acao: 'descartar-relato', memoria: 'recusas', por: 'aguilar' })).erro).toBe('Rascunho não encontrado.');
    expect((await formulario(lixeira, '/api/lixeira', gui, { acao: 'restaurar-rascunho-de-relato', memoria: 'recusas', relato: String(doGui) })).erro).toBe('Rascunho não encontrado na lixeira.');
    expect(impressao()).toBe(antes);
    // Descartado pelo Gui, só ele restaura
    await formulario(lixeira, '/api/lixeira', gui, { acao: 'descartar-relato', memoria: 'recusas', por: 'aguilar' });
    const descartado = impressao();
    expect(descartado).not.toBe(antes);
    expect((await formulario(lixeira, '/api/lixeira', elizete, { acao: 'restaurar-rascunho-de-relato', memoria: 'recusas', relato: String(doGui) })).erro).toBe('Rascunho não encontrado na lixeira.');
    expect(impressao()).toBe(descartado);
  });

  it('/api/reacoes e /api/sugestoes: entrar sem ter dito "eu estava lá" e aceitar a sugestão de outra pessoa são recusados sem mudar nada', async () => {
    const lucio = usuarioDe('lucio');
    await formulario(sugestoes, '/api/sugestoes', giovanna, { memoria: 'recusas', acao: 'sugerir-dados', lugar: 'Caeté' });
    const sugestao = linha<{ id: number }>(`SELECT id FROM sugestoes WHERE memoria_id = 'recusas'`).id;
    const antes = impressao();
    expect((await formulario(reacoes, '/api/reacoes', lucio, { memoria: 'recusas', acao: 'entrar' })).erro).toBe('Não foi possível entrar em Quem estava.');
    expect((await formulario(sugestoes, '/api/sugestoes', lucio, { memoria: 'recusas', acao: 'aceitar', sugestao: String(sugestao) })).erro).not.toBeNull();
    expect(impressao()).toBe(antes);
  });

  it('/api/avisos: responder com o público de antes de a memória mudar é recusado sem mudar nada', async () => {
    // O pedido da Elizete na memória "recusas" foi lido com a memória só da Bayara Nascimento; hoje ela está aberta a todos
    const antes = impressao();
    const r = await formulario(avisos, '/api/avisos', elizete, { aviso: String(pedido), resposta: 'liberar', publico: 'nucleos:bayara-nascimento' });
    expect(r.erro).toBe('A memória mudou, e o pedido também. Confira e responda de novo.');
    expect(impressao()).toBe(antes);
  });

  it('/api/avisos: o pedido do rascunho de relato que está na lixeira não aceita resposta, nem pelo aviso nem pelo relato', async () => {
    // Memória da Giovanna, só da Bayara Nascimento: o Gui escreve o relato do Aguilar em rascunho, a Elizete
    // publica o dela, a Giovanna abre para todos (os dois esperam) e o Gui descarta o rascunho
    const base = { titulo: 'Pedido na lixeira', ano: 2016, tipo, pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] };
    const id = (await salvar(giovanna, base)).corpo.id as string;
    banco.sqlite.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, 'aguilar', 'gui', 'Rascunho do Gui.', 'rascunho')`).run(id);
    banco.sqlite.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, 'aguilar', 'elizete', 'Da Elizete.', 'publicada')`).run(id);
    await salvar(giovanna, { ...base, id, visibilidade: 'todos' });
    const rascunho = linha<{ id: number }>(`SELECT id FROM relatos WHERE memoria_id = ? AND registrado_por = 'gui'`, id).id;
    const doRascunho = linha<{ id: number }>(`SELECT id FROM avisos WHERE relato_id = ? AND tipo = 'liberar-relato'`, rascunho).id;
    await formulario(lixeira, '/api/lixeira', gui, { acao: 'descartar-relato', memoria: id, por: 'aguilar' });
    const antes = impressao();
    const pedidos: Record<string, string>[] = [{ aviso: String(doRascunho) }, { relato: String(rascunho) }];
    for (const campos of pedidos) {
      for (const resposta of ['liberar', 'manter']) {
        expect((await formulario(avisos, '/api/avisos', gui, { ...campos, resposta, publico: 'todos' })).status).toBe(404);
      }
    }
    expect(impressao()).toBe(antes);
  });
});
