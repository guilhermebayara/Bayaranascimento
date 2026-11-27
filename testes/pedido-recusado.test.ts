// Um pedido recusado não deixa nada gravado pela metade (QA de 23/11/2026, sessão U, docs/historico/qa/2026-11-23-relatorio.md). Cada rota que grava
// confere tudo antes de escrever no banco: a pessoa nova de "Quem estava", o tema novo e a memória com um
// relato que não pode ser escrito só são gravados quando o pedido inteiro passa. Testado com as rotas de
// verdade sobre o banco SQLite em memória (testes/apoio/d1.ts).
//
// Regra do CLAUDE.md ("Conferências"): toda rota que grava ganha um caso aqui quando alguém mexer nela, com
// a impressão do banco inteiro (todas as tabelas) antes e depois do pedido recusado, que precisa sair igual.
import { describe, expect, it, vi } from 'vitest';
import { foraDoIndiceDaBusca } from './apoio/indice-da-busca';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
// O nome do módulo fica numa variável porque o projeto não tem os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL) => Uint8Array };

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
vi.mock('astro:middleware', () => ({ defineMiddleware: <T>(f: T) => f }));
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
    const tabelas = (banco.sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> 'marca_da_copia' ORDER BY name`).all() as { name: string }[]).map((t) => t.name).filter(foraDoIndiceDaBusca);
    return JSON.stringify(tabelas.map((t) => [t, banco.sqlite.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all()]));
  };
  /** Um formulário comum para uma rota, como o navegador manda */
  const formulario = async (rota: { POST: (contexto: never) => Promise<Response> | Response }, caminho: string, quem: Usuario, campos: Record<string, string | File>) => {
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

  it('/api/memorias: o áudio que outro pedido levou recusa o lote inteiro, sem gravar nada; nas três tentativas, o recado (sessão AA)', async () => {
    const repo = await import('../src/lib/servidor/repositorio');
    const audio = await repo.registrarAudio({ chave: 'teste/levado-por-outro.m4a', tipo: 'audio/mp4', tamanho: 10, duracao: 2, memoriaId: null }, elizete);
    const lote = banco.batch.bind(banco);
    // A cada lote da memória, outro pedido leva o áudio para outra memória logo antes; depois do lote, ele
    // volta a ficar solto, para a tentativa seguinte ler e perder de novo
    let tentativas = 0;
    banco.batch = async (comandos) => {
      if (!comandos.some((c) => /^\s*INSERT INTO memorias/.test(c.sql))) return lote(comandos);
      tentativas++;
      banco.sqlite.prepare(`UPDATE audios SET memoria_id = '2025-natal' WHERE id = ?`).run(audio);
      try {
        return await lote(comandos);
      } finally {
        banco.sqlite.prepare('UPDATE audios SET memoria_id = NULL WHERE id = ?').run(audio);
      }
    };
    try {
      const antes = impressao();
      const r = await salvar(elizete, { titulo: 'Recusada pelo áudio levado', ano: 2020, tipo, pessoas: ['elizete'], relato: { por: 'elizete', texto: '', audios: [{ id: audio }], mensagens: [{ tipo: 'audio', audioId: audio }] } });
      expect(tentativas).toBe(3);
      expect(r.status).toBe(409);
      expect(impressao()).toBe(antes);
    } finally {
      banco.batch = lote;
    }
  });

  it('/api/memorias: o formulário sem script recusado não guarda o código de envio nem nada mais (sessão AA)', async () => {
    const giovanna = usuarioDe('giovanna');
    const r0 = await salvar(giovanna, { titulo: 'Rascunho para recusar', ano: 2020, tipo, pessoas: ['giovanna'], situacao: 'rascunho' });
    const id = r0.corpo.id as string;
    const antes = impressao();
    // O relato em nome de quem acessa o site é recusado: nem a memória muda, nem o código fica
    const r = await formulario(memorias, '/api/memorias', giovanna, { id, titulo: 'Rascunho para recusar', ano: '2020', tipo, pessoas: 'giovanna', situacao: 'publicada', relato: 'No lugar do Gui.', relatoPor: 'gui', envio: 'codigo-recusado-da-memoria', pagina: 'rascunho' });
    expect(r.erro).toBeTruthy();
    expect(impressao()).toBe(antes);
  });

  it('/api/duplicados: juntar duas fichas com relato na mesma memória é recusado sem mudar nada, com o recado só do que o administrador vê (sessão AA)', async () => {
    const duplicados = await import('../src/pages/api/duplicados');
    const magno = usuarioDe('lucas-magno');
    banco.sqlite.prepare(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('recusa-um', 'Recusa Dupla', 'gui'), ('recusa-dois', 'Recusa Dupla', 'gui')`).run();
    const id = (await salvar(elizete, { titulo: 'Recusa que o Magno não vê', ano: 2009, tipo, pessoas: ['elizete'], visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] })).corpo.id as string;
    banco.sqlite.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, 'recusa-um', 'elizete', 'Um.', 'publicada'), (?, 'recusa-dois', 'gui', 'Dois.', 'publicada')`).run(id, id);
    const antes = impressao();
    const r = await formulario(duplicados, '/api/duplicados', magno, { acao: 'juntar', fica: 'recusa-um', sai: 'recusa-dois' });
    expect(r.erro).toContain('memórias que você não vê');
    expect(r.erro).not.toContain('Recusa que o Magno não vê');
    expect(impressao()).toBe(antes);
  });

  it('/api/integrantes, /api/lacos, /api/capitulos e /api/tipos: o pedido recusado não grava nada, nem a pessoa nova, nem o tema novo (sessão AA, código novo)', async () => {
    const gui = usuarioDe('gui');
    const rota = async (nome: string) => (await import(`../src/pages/api/${nome}.ts`)) as { POST: (contexto: never) => Promise<Response> };
    const antes = impressao();
    // O cadastro sem nome
    expect((await formulario(await rota('integrantes'), '/api/integrantes', gui, { nome: '', tipo: 'pessoa' })).erro).toBe('Escreva o nome.');
    // A pessoa nova pelo laço, com o tipo de filiação que não existe: a pessoa não é cadastrada
    expect((await formulario(await rota('lacos'), '/api/lacos', gui, { acao: 'adicionar', laco: 'pai-de', sujeito: 'gui', nomeNovo: 'Filho Recusado', qualidade: 'nenhuma', volta: '/pessoas/gui/editar' })).erro).toBe('Escolha o tipo de filiação.');
    // O capítulo sem título, com tema novo: o tema não é cadastrado
    expect((await formulario(await rota('capitulos'), '/api/capitulos', gui, { titulo: '', modo: 'reunido', temas: 'Tema Recusado' })).erro).toBe('Dê um título ao capítulo.');
    // O tipo de quem não administra
    expect((await formulario(await rota('tipos'), '/api/tipos', elizete, { acao: 'criar', rotulo: 'Tipo Recusado', cor: 'verde', icone: 'viagem' })).erro).toBe('Só os administradores cuidam da lista de tipos.');
    expect(impressao()).toBe(antes);
  });

  it('/api/integrantes: o cadastro com retrato recusado não grava a pessoa nem a linha do retrato, nem na recusa comum nem quando o código novo não sai (revisão AA2)', async () => {
    const gui = usuarioDe('gui');
    const integrantes = (await import('../src/pages/api/integrantes')) as { POST: (contexto: never) => Promise<Response> };
    const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])], 'retrato.png', { type: 'image/png' });
    const antes = impressao();
    // A data que não existe
    expect((await formulario(integrantes, '/api/integrantes', gui, { nome: 'Retrato Recusado', tipo: 'pessoa', nascimentoAno: '2000', nascimentoMes: '13', retrato: png() })).erro).toBe('Confira o mês de nascimento.');
    expect(impressao()).toBe(antes);
    // As três tentativas de código novo esbarram em outro pedido: volta com o recado, sem a pessoa e sem retratos_enviados
    const { ComandoDeTeste } = await import('./apoio/d1');
    const runOriginal = ComandoDeTeste.prototype.run;
    ComandoDeTeste.prototype.run = async function (this: InstanceType<typeof ComandoDeTeste>) {
      if (/INSERT INTO integrantes/.test(this.sql)) throw new Error('UNIQUE constraint failed: integrantes.id');
      return runOriginal.call(this);
    };
    try {
      expect((await formulario(integrantes, '/api/integrantes', gui, { nome: 'Retrato Sem Código', tipo: 'pessoa', retrato: png() })).erro).toBe('Não consegui salvar.');
    } finally {
      ComandoDeTeste.prototype.run = runOriginal;
    }
    expect(impressao()).toBe(antes);
  });

  it('/api/integrantes, /api/lacos e /api/memorias: com alguém de mesmo nome na lixeira, o pedido recusado não cadastra a pessoa nova nem mexe na da lixeira (revisão AA2)', async () => {
    const gui = usuarioDe('gui');
    banco.sqlite.prepare(`INSERT INTO integrantes (id, nome, tipo, criado_por, excluida_em, excluida_por) VALUES ('na-lixeira-recusa', 'Na Lixeira Recusa', 'pessoa', 'gui', datetime('now'), 'gui')`).run();
    const integrantes = (await import('../src/pages/api/integrantes')) as { POST: (contexto: never) => Promise<Response> };
    const lacos = (await import('../src/pages/api/lacos')) as { POST: (contexto: never) => Promise<Response> };
    const antes = impressao();
    expect((await formulario(integrantes, '/api/integrantes', gui, { nome: 'Na Lixeira Recusa', tipo: 'pessoa', falecido: 'on', nascimentoAno: '2000', falecimentoAno: '1990' })).erro).toBe('O falecimento não pode ser antes do nascimento.');
    expect((await formulario(lacos, '/api/lacos', gui, { acao: 'adicionar', laco: 'pai-de', sujeito: 'gui', nomeNovo: 'Na Lixeira Recusa', qualidade: 'nenhuma', volta: '/pessoas/gui/editar' })).erro).toBe('Escolha o tipo de filiação.');
    const r = await salvar(gui, { titulo: 'Recusada lixeira', ano: 2020, tipo, pessoas: ['nova:0', 'ninguem-com-este-id'], novasPessoas: [{ nome: 'Na Lixeira Recusa' }] });
    expect(r.status).toBe(400);
    expect(impressao()).toBe(antes);
  });

  it('/api/relatos: o envio sem script recusado não guarda o código de envio nem nada mais (D3 da sessão Z)', async () => {
    const relatos = await import('../src/pages/api/relatos');
    const antes = impressao();
    const r = await formulario(relatos, '/api/relatos', elizete, { memoria: 'ninguem-tem-esta', por: 'elizete', acrescentar: '1', texto: 'Nada.', situacao: 'publicada', envio: 'codigo-de-envio-recusado' });
    expect(r.erro).toBe('Memória não encontrada.');
    expect(impressao()).toBe(antes);
  });

  it('/api/relatos: o envio sem script que falha ao gravar as mensagens não deixa o relato nem o código pela metade (sessão AA)', async () => {
    const relatos = await import('../src/pages/api/relatos');
    const lote = banco.batch.bind(banco);
    banco.batch = async (comandos) => {
      if (comandos.some((c) => /INSERT INTO relato_mensagens/.test(c.sql))) throw new Error('D1_ERROR: falha de teste');
      return lote(comandos);
    };
    try {
      const antes = impressao();
      const r = await formulario(relatos, '/api/relatos', elizete, { memoria: '2025-natal', por: 'elizete', acrescentar: '1', texto: 'Não entra.', situacao: 'rascunho', envio: 'codigo-que-falha-no-meio' }).catch((e: Error) => e);
      expect(r).toBeInstanceOf(Error);
      expect(impressao()).toBe(antes);
    } finally {
      banco.batch = lote;
    }
  });

  it('/api/relatos: a falha no meio do lote volta até a versão da memória e a nova tentativa grava o relato com as mídias', async () => {
    const relatos = await import('../src/pages/api/relatos');
    const id = 'mem8-falha-atomica';
    banco.sqlite.prepare("INSERT INTO memorias (id, titulo, ano, tipo, criada_por) VALUES (?, 'Teste do lote', 2001, ?, 'gui')").run(id, tipo);
    const audioId = Number(banco.sqlite.prepare("INSERT INTO audios (chave, tipo, tamanho, enviado_por) VALUES ('teste/mem8.m4a', 'audio/mp4', 10, 'elizete')").run().lastInsertRowid);
    const fotoId = Number(banco.sqlite.prepare("INSERT INTO fotos (chave, enviada_por) VALUES ('teste/mem8.jpg', 'elizete')").run().lastInsertRowid);
    const pedido = { memoria: id, por: 'elizete', mensagens: [{ tipo: 'texto', texto: 'Tente de novo.' }, { tipo: 'audio', audioId }, { tipo: 'foto', fotoId }] };
    const enviar = () => relatos.POST({
      request: new Request('http://localhost/api/relatos', { method: 'POST', headers: { Origin: 'http://localhost', 'Content-Type': 'application/json' }, body: JSON.stringify(pedido) }),
      locals: { usuario: elizete, tipos },
    } as never);
    banco.sqlite.exec(`CREATE TRIGGER mem8_teste BEFORE INSERT ON relato_mensagens WHEN NEW.foto_id = ${fotoId}
      BEGIN SELECT RAISE(ABORT, 'memoria-mudou'); END`);
    const antes = impressao();
    const tabelas = () => JSON.stringify(banco.sqlite.prepare('SELECT * FROM marca_da_copia').all());
    const marca = tabelas();
    const lote = banco.batch.bind(banco);
    let perdas = 0;
    banco.batch = async (comandos) => {
      try {
        return await lote(comandos);
      } catch (erro) {
        expect(String(erro)).toContain('memoria-mudou');
        expect(impressao()).toBe(antes);
        expect(tabelas()).toBe(marca);
        perdas++;
        banco.sqlite.exec('DROP TRIGGER mem8_teste');
        throw erro;
      }
    };
    try {
      expect((await enviar()).status).toBe(201);
      expect(perdas).toBe(1);
      const relato = linha<{ id: number }>('SELECT id FROM relatos WHERE memoria_id = ?', id);
      expect(conta('SELECT COUNT(*) AS n FROM relato_mensagens WHERE relato_id = ?', relato.id)).toBe(3);
      expect(conta('SELECT COUNT(*) AS n FROM audios WHERE relato_id = ? AND id = ?', relato.id, audioId)).toBe(1);
      expect(conta('SELECT COUNT(*) AS n FROM fotos WHERE relato_id = ? AND id = ?', relato.id, fotoId)).toBe(1);
    } finally {
      banco.batch = lote;
      banco.sqlite.exec('DROP TRIGGER IF EXISTS mem8_teste');
    }
  });

  it('/api/lixeira: a mensagem recusada também devolve o texto e o histórico da restauração', async () => {
    const id = 'mem8-restauracao-recusada';
    banco.sqlite.prepare("INSERT INTO memorias (id, titulo, ano, tipo, criada_por) VALUES (?, 'Teste de restauração', 2001, ?, 'gui')").run(id, tipo);
    const r = Number(banco.sqlite.prepare("INSERT INTO relatos (memoria_id, por, registrado_por, texto) VALUES (?, 'elizete', 'elizete', 'Hoje.')").run(id).lastInsertRowid);
    banco.sqlite.prepare("INSERT INTO relato_mensagens (relato_id, ordem, tipo, texto) VALUES (?, 0, 'texto', 'Hoje.')").run(r);
    const v = Number(banco.sqlite.prepare("INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('relato', ?, ?, 'elizete')").run(String(r), JSON.stringify({ texto: 'Antes.' })).lastInsertRowid);
    const pedido = { acao: 'restaurar-relato', memoria: id, por: 'elizete', versao: String(v) };
    banco.sqlite.exec(`CREATE TRIGGER mem8_restaurar BEFORE INSERT ON relato_mensagens WHEN NEW.relato_id = ${r}
      BEGIN SELECT RAISE(ABORT, 'falha de teste'); END`);
    const antes = impressao();
    const marca = linha('SELECT * FROM marca_da_copia');
    try {
      await expect(formulario(lixeira, '/api/lixeira', elizete, pedido)).rejects.toThrow('falha de teste');
      expect(impressao()).toBe(antes);
      expect(linha('SELECT * FROM marca_da_copia')).toEqual(marca);
    } finally {
      banco.sqlite.exec('DROP TRIGGER mem8_restaurar');
    }
    expect((await formulario(lixeira, '/api/lixeira', elizete, pedido)).erro).toBeNull();
    expect(linha("SELECT r.texto, m.texto AS mensagem FROM relatos r JOIN relato_mensagens m ON m.relato_id = r.id WHERE r.id = ?", r)).toEqual({ texto: 'Antes.', mensagem: 'Antes.' });
  });

  describe('MEM-10: quem perde a corrida pelo mesmo relato conserva a primeira gravação', () => {
    const todosOsDados = () => {
      const tabelas = banco.sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[];
      return JSON.stringify(tabelas.map(({ name }) => [
        name, banco.sqlite.prepare(`SELECT * FROM "${name}"`).all().map((r) => JSON.stringify(r)).sort(),
      ]));
    };

    it.each([
      ['relatos', 'memorias'],
      ['memorias', 'relatos'],
      ['lixeira', 'memorias'],
      ['memorias', 'lixeira'],
      ['relatos', 'relatos'],
      ['lixeira', 'memorias', 'formulário'],
    ] as const)('recusa %s depois de %s gravar', async (perde, ganha, modo?) => {
      const relatos = await import('../src/pages/api/relatos');
      const { noPedido } = await import('../src/lib/servidor/ambiente');
      const { RECADO_MEMORIA_MUDOU } = await import('../src/lib/servidor/repositorio');
      const id = `mem10-${perde}-${ganha}${modo ? '-formulario' : ''}`;
      const rewrite = vi.fn(async (_request: Request) => new Response('Página do formulário', { headers: { 'Content-Type': 'text/html' } }));
      banco.sqlite.prepare("INSERT INTO memorias (id, titulo, ano, tipo, criada_por, situacao) VALUES (?, 'Corrida pelo relato', 2001, ?, 'elizete', 'rascunho')").run(id, tipo);
      const r = Number(banco.sqlite.prepare("INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, 'elizete', 'elizete', 'Um.', 'rascunho')").run(id).lastInsertRowid);
      const base = Number(banco.sqlite.prepare("INSERT INTO relato_mensagens (relato_id, ordem, tipo, texto) VALUES (?, 0, 'texto', 'Um.')").run(r).lastInsertRowid);
      const v = Number(banco.sqlite.prepare("INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('relato', ?, ?, 'elizete')").run(String(r), JSON.stringify({ texto: 'Da restauração.' })).lastInsertRowid);
      const audioId = Number(banco.sqlite.prepare("INSERT INTO audios (chave, tipo, tamanho, enviado_por) VALUES ('teste/mem10.m4a', 'audio/mp4', 10, 'elizete')").run().lastInsertRowid);
      const fotoId = Number(banco.sqlite.prepare("INSERT INTO fotos (chave, enviada_por) VALUES ('teste/mem10.jpg', 'elizete')").run().lastInsertRowid);
      const rotas = { relatos, memorias, lixeira };
      const postar = (rota: keyof typeof rotas, primeira: boolean) => {
        const palavra = primeira ? 'Dois.' : 'Três.';
        const mensagens: { id?: number; tipo: string; texto?: string; audioId?: number; fotoId?: number }[] = [
          { id: base, tipo: 'texto', texto: 'Um.' }, { tipo: 'texto', texto: palavra },
        ];
        if (rota === 'relatos' && primeira && perde === 'relatos') mensagens.push({ tipo: 'audio', audioId }, { tipo: 'foto', fotoId });
        const parametros = { por: 'elizete', texto: `Um.\n\n${palavra}`, mensagens };
        const corpo = rota === 'lixeira' ? new URLSearchParams({ acao: 'restaurar-relato', memoria: id, por: 'elizete', versao: String(v) })
          : JSON.stringify(rota === 'memorias' ? { id, titulo: 'Corrida pelo relato', ano: 2001, tipo, situacao: 'rascunho', relato: parametros }
            : { memoria: id, situacao: 'rascunho', ...parametros });
        const request = new Request(`http://localhost/api/${rota}`, {
          method: 'POST', body: corpo, headers: {
            Origin: 'http://localhost', ...(typeof corpo === 'string' ? { 'Content-Type': 'application/json' } : { Accept: modo ? 'text/html' : 'application/json' }),
          },
        });
        return noPedido(request, () => rotas[rota].POST({ request, locals: { usuario: elizete, tipos }, ...(modo ? { rewrite } : {}) } as never));
      };
      const conferirTexto = (esperado: string) => {
        const textos = banco.sqlite.prepare("SELECT texto FROM relato_mensagens WHERE relato_id = ? AND tipo = 'texto' ORDER BY ordem, id").all(r) as { texto: string }[];
        expect(textos.map((m) => m.texto).join('\n\n')).toBe(esperado);
        expect(linha('SELECT texto FROM relatos WHERE id = ?', r)).toEqual({ texto: esperado });
      };
      const lote = banco.batch.bind(banco);
      let primeiraGravacao: string | undefined;
      let gravandoPrimeiro = false;
      let lotesDoPerdedor = 0;
      banco.batch = async (comandos) => {
        if (!gravandoPrimeiro && comandos.some((c) => /^UPDATE relatos SET texto\b/.test(c.sql))) {
          lotesDoPerdedor++;
          if (primeiraGravacao === undefined) {
            gravandoPrimeiro = true;
            try {
              expect((await postar(ganha, true)).status).toBe(ganha === 'lixeira' ? 303 : 200);
              conferirTexto(ganha === 'lixeira' ? 'Da restauração.' : 'Um.\n\nDois.');
              expect(linha('SELECT versao FROM memorias WHERE id = ?', id)).toEqual({ versao: 1 });
              primeiraGravacao = todosOsDados();
            } finally {
              gravandoPrimeiro = false;
            }
          }
        }
        return lote(comandos);
      };
      try {
        const resposta = await postar(perde, false);
        expect(resposta.status).toBe(409);
        if (modo) {
          expect(await resposta.text()).toBe('Página do formulário');
          expect(rewrite).toHaveBeenCalledTimes(1);
          const destino = new URL(rewrite.mock.calls[0]![0].url);
          expect(destino.pathname).toBe('/nova');
          expect(destino.searchParams.get('id')).toBe(id);
          expect(destino.searchParams.get('erro')).toBe(RECADO_MEMORIA_MUDOU);
        } else {
          expect(await resposta.json()).toEqual({ erro: RECADO_MEMORIA_MUDOU });
        }
        expect(lotesDoPerdedor).toBe(1);
        expect(todosOsDados()).toBe(primeiraGravacao);
        if (perde === 'relatos' && ganha === 'relatos') {
          expect(linha('SELECT relato_id, removido_em FROM audios WHERE id = ?', audioId)).toEqual({ relato_id: r, removido_em: null });
          expect(linha('SELECT relato_id, removida_em FROM fotos WHERE id = ?', fotoId)).toEqual({ relato_id: r, removida_em: null });
        }
      } finally {
        banco.batch = lote;
      }
    });
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

  // As cópias menores das fotos (sessão D1b): o envio da foto com as cópias e o ajuste da Administração
  it('/api/fotos: o envio recusado não grava a foto nem as cópias (sessão D1b)', async () => {
    const fotos = await import('../src/pages/api/fotos');
    const gravadas: string[] = [];
    const bucket = env.FOTOS as { put: (chave: string) => Promise<unknown> };
    const put = bucket.put;
    bucket.put = async (chave: string) => void gravadas.push(chave);
    try {
      const antes = impressao();
      const corpo = new FormData();
      corpo.set('foto', new Blob([new TextEncoder().encode('não é uma foto')]), 'foto');
      corpo.set('pequena', new Blob([new Uint8Array(40)]), 'pequena.webp');
      corpo.set('media', new Blob([new Uint8Array(40)]), 'media.webp');
      const request = new Request('http://localhost/api/fotos', { method: 'POST', headers: { Origin: 'http://localhost' }, body: corpo });
      const r = await fotos.POST({ request, locals: { usuario: elizete, tipos } } as never);
      expect(r.status).toBe(415);
      expect(impressao()).toBe(antes);
      expect(gravadas).toEqual([]);
    } finally {
      bucket.put = put;
    }
  });

  it('/api/copias-das-fotos: quem não administra, a foto que não se vê, a que já tem cópia e a cópia errada são recusados sem mudar nada (sessão D1b)', async () => {
    const copias = await import('../src/pages/api/copias-das-fotos');
    const gui = usuarioDe('gui');
    const leitura = (nome: string) => new Uint8Array(readFileSync(new URL(`../exemplos/fotos/${nome}`, import.meta.url)));
    const gravadas: string[] = [];
    const bucket = env.FOTOS as { put: (chave: string) => Promise<unknown>; get: (chave: string) => Promise<unknown> };
    const [put, get] = [bucket.put, bucket.get];
    bucket.put = async (chave: string) => void gravadas.push(chave);
    // A original guardada é a chico-3 de exemplo, para a proporção conferir
    bucket.get = async () => ({ arrayBuffer: async () => leitura('chico-3.jpg').buffer });
    const chaveDe = (n: number) => `2026/d1b0aaaa-0000-4000-8000-${String(n).padStart(12, '0')}.jpg`;
    banco.sqlite.prepare(`INSERT INTO memorias (id, titulo, ano, tipo, situacao, criada_por) VALUES ('d1b-rascunho-da-elizete', 'Rascunho', 2001, ?, 'rascunho', 'elizete')`).run(tipo);
    banco.sqlite.prepare(`INSERT INTO memorias (id, titulo, ano, tipo, criada_por) VALUES ('d1b-de-todos', 'De todos', 2001, ?, 'gui')`).run(tipo);
    banco.sqlite.prepare(`INSERT INTO fotos (memoria_id, chave, enviada_por) VALUES ('d1b-rascunho-da-elizete', ?, 'elizete')`).run(chaveDe(1));
    banco.sqlite.prepare(`INSERT INTO fotos (memoria_id, chave, enviada_por, copias) VALUES ('d1b-de-todos', ?, 'gui', '{"formato":"webp","pequena":[853,480],"media":[1600,900],"bytes":1}')`).run(chaveDe(2));
    banco.sqlite.prepare(`INSERT INTO fotos (memoria_id, chave, enviada_por) VALUES ('d1b-de-todos', ?, 'gui')`).run(chaveDe(3));
    const enviar = async (quem: Usuario, chave: string, pequena = 'copias/chico-3.pequena.webp', media = 'copias/chico-3.media.webp') => {
      const corpo = new FormData();
      corpo.set('chave', chave);
      corpo.set('pequena', new Blob([leitura(pequena)]), 'pequena.webp');
      corpo.set('media', new Blob([leitura(media)]), 'media.webp');
      const request = new Request('http://localhost/api/copias-das-fotos', { method: 'POST', headers: { Origin: 'http://localhost' }, body: corpo });
      return (await copias.POST({ request, locals: { usuario: quem, tipos } } as never)).status;
    };
    try {
      const antes = impressao();
      expect(elizete.admin).toBe(false);
      expect(await enviar(elizete, chaveDe(3))).toBe(403);
      // O rascunho da Elizete: o Gui não vê, e recebe o mesmo que para uma foto que não existe
      expect(await enviar(gui, chaveDe(1))).toBe(404);
      expect(await enviar(gui, chaveDe(99))).toBe(404);
      expect(await enviar(gui, 'exemplos/chico-3.jpg')).toBe(404);
      // Já tem cópia: nada é trocado
      expect(await enviar(gui, chaveDe(2))).toBe(409);
      // A cópia de outra foto, ou os tamanhos trocados
      expect(await enviar(gui, chaveDe(3), 'copias/karol-2.pequena.webp')).toBe(400);
      expect(await enviar(gui, chaveDe(3), 'copias/chico-3.media.webp', 'copias/chico-3.pequena.webp')).toBe(400);
      expect(impressao()).toBe(antes);
      expect(gravadas).toEqual([]);
      // O pedido certo grava as duas cópias, com nome próprio, e anota no banco
      expect(await enviar(gui, chaveDe(3))).toBe(201);
      expect(gravadas).toEqual([chaveDe(3).replace('.jpg', '.pequena.webp'), chaveDe(3).replace('.jpg', '.media.webp')]);
      expect(banco.sqlite.prepare('SELECT copias FROM fotos WHERE chave = ?').get(chaveDe(3))).toMatchObject({ copias: expect.stringContaining('"formato":"webp"') });
      expect(await enviar(gui, chaveDe(3))).toBe(409);
    } finally {
      bucket.put = put;
      bucket.get = get;
    }
  });
  it('/api/copias-das-fotos e /api/copias-dos-retratos: o que o ajuste não lista e a reserva de outro pedido são recusados sem mudar nada (sessão D1d)', async () => {
    const copias = await import('../src/pages/api/copias-das-fotos');
    const ajuste = await import('../src/pages/api/copias-dos-retratos');
    const gui = usuarioDe('gui');
    const leitura = (nome: string) => new Uint8Array(readFileSync(new URL(`../exemplos/fotos/${nome}`, import.meta.url)));
    const gravadas: string[] = [];
    const bucket = env.FOTOS as { put: (chave: string) => Promise<unknown>; get: (chave: string) => Promise<unknown> };
    const [put, get] = [bucket.put, bucket.get];
    bucket.put = async (chave: string) => void gravadas.push(chave);
    const png = new Uint8Array(40);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 3, 0x20, 0, 0, 3, 0x20]);
    bucket.get = async (chave: string) => ({ arrayBuffer: async () => (chave.startsWith('retratos/') ? png.buffer : leitura('chico-3.jpg').buffer) });
    const chaveDe = (n: number) => `2026/d1d0dddd-0000-4000-8000-${String(n).padStart(12, '0')}.jpg`;
    const retrato = 'd1d0dddd-0000-4000-8000-000000000009.jpg';
    banco.sqlite.prepare(`INSERT INTO memorias (id, titulo, ano, tipo, criada_por) VALUES ('d1d-recusas', 'Recusas', 2001, ?, 'gui')`).run(tipo);
    banco.sqlite.prepare(`INSERT INTO fotos (memoria_id, chave, enviada_por, removida_em, removida_por) VALUES ('d1d-recusas', ?, 'gui', datetime('now'), 'gui')`).run(chaveDe(1));
    banco.sqlite.prepare(`INSERT INTO fotos (chave, enviada_por, enviada_em) VALUES (?, 'elizete', datetime('now', '-40 days'))`).run(chaveDe(2));
    banco.sqlite.prepare(`INSERT INTO fotos (memoria_id, chave, enviada_por) VALUES ('d1d-recusas', ?, 'gui')`).run(chaveDe(3));
    banco.sqlite.prepare(`INSERT INTO integrantes (id, nome, tipo, retrato) VALUES ('d1d-recusas', 'Recusas', 'pessoa', ?)`).run(retrato);
    // Outro pedido está gravando a foto 3 e o retrato agora
    banco.sqlite.prepare(`INSERT INTO reservas_das_copias (alvo, codigo) VALUES (?, 'outro'), (?, 'outro')`).run(`foto:${chaveDe(3)}`, `retrato:${retrato}`);
    const enviar = async (chave: string) => {
      const corpo = new FormData();
      corpo.set('chave', chave);
      corpo.set('pequena', new Blob([leitura('copias/chico-3.pequena.webp')]), 'pequena.webp');
      corpo.set('media', new Blob([leitura('copias/chico-3.media.webp')]), 'media.webp');
      const request = new Request('http://localhost/api/copias-das-fotos', { method: 'POST', headers: { Origin: 'http://localhost' }, body: corpo });
      return (await copias.POST({ request, locals: { usuario: gui, tipos } } as never)).status;
    };
    const enviarRetrato = async (chave: string) => {
      const corpo = new FormData();
      corpo.set('chave', chave);
      const webp = new Uint8Array(40);
      webp.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
      webp.set([...'WEBPVP8X'].map((c) => c.charCodeAt(0)), 8);
      webp.set([0x8f, 0x01, 0, 0x8f, 0x01, 0], 24);
      corpo.set('pequeno', new Blob([webp]), 'pequeno.webp');
      const request = new Request('http://localhost/api/copias-dos-retratos', { method: 'POST', headers: { Origin: 'http://localhost' }, body: corpo });
      return (await ajuste.POST({ request, locals: { usuario: gui, tipos } } as never)).status;
    };
    try {
      const antes = impressao();
      // A foto removida e a solta antiga: o Gui as vê, mas o ajuste não as lista
      expect(await enviar(chaveDe(1))).toBe(404);
      expect(await enviar(chaveDe(2))).toBe(404);
      // A reserva de outro pedido: 409, sem gravar nada
      expect(await enviar(chaveDe(3))).toBe(409);
      expect(await enviarRetrato(retrato)).toBe(409);
      expect(impressao()).toBe(antes);
      expect(gravadas).toEqual([]);
    } finally {
      bucket.put = put;
      bucket.get = get;
    }
  });

  it('/api/copias-dos-retratos: quem não administra, o retrato que não existe, o de exemplo, o que já tem cópia e a cópia errada são recusados sem mudar nada (sessão D1c)', async () => {
    const ajuste = await import('../src/pages/api/copias-dos-retratos');
    const gui = usuarioDe('gui');
    const gravadas: string[] = [];
    const bucket = env.FOTOS as { put: (chave: string) => Promise<unknown>; get: (chave: string) => Promise<unknown> };
    const [put, get] = [bucket.put, bucket.get];
    bucket.put = async (chave: string) => void gravadas.push(chave);
    // A original guardada: um quadrado de 800 px (só o cabeçalho PNG, que é o que a conferência lê)
    const png = new Uint8Array(40);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 3, 0x20, 0, 0, 3, 0x20]);
    bucket.get = async () => ({ arrayBuffer: async () => png.buffer });
    const webp = (lado: number) => {
      const b = new Uint8Array(40);
      b.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
      b.set([...'WEBPVP8X'].map((c) => c.charCodeAt(0)), 8);
      b.set([(lado - 1) & 0xff, (lado - 1) >> 8, 0, (lado - 1) & 0xff, (lado - 1) >> 8, 0], 24);
      return b;
    };
    const chaveDe = (n: number) => `d1c0aaaa-0000-4000-8000-${String(n).padStart(12, '0')}.jpg`;
    banco.sqlite.prepare(`UPDATE integrantes SET retrato = ? WHERE id = 'elizete'`).run(chaveDe(1));
    banco.sqlite.prepare(`INSERT INTO integrantes (id, nome, tipo, retrato) VALUES ('d1c-com-copia', 'Com Cópia', 'pessoa', ?)`).run(chaveDe(2));
    banco.sqlite.prepare(`INSERT INTO retratos_enviados (chave, tamanho, copia) VALUES (?, 1000, '{"formato":"webp","lado":400,"bytes":1}')`).run(chaveDe(2));
    const enviar = async (quem: Usuario, chave: string, copia = webp(400)) => {
      const corpo = new FormData();
      corpo.set('chave', chave);
      corpo.set('pequeno', new Blob([copia]), 'pequeno.webp');
      const request = new Request('http://localhost/api/copias-dos-retratos', { method: 'POST', headers: { Origin: 'http://localhost' }, body: corpo });
      return (await ajuste.POST({ request, locals: { usuario: quem, tipos } } as never)).status;
    };
    try {
      const antes = impressao();
      expect(elizete.admin).toBe(false);
      expect(await enviar(elizete, chaveDe(1))).toBe(403);
      // O retrato que não é de ninguém recebe o mesmo que um que não existe
      expect(await enviar(gui, chaveDe(99))).toBe(404);
      expect(await enviar(gui, 'exemplos/chico-3.jpg')).toBe(404);
      expect(await enviar(gui, chaveDe(2))).toBe(409);
      // Do tamanho da original, ou que não é imagem
      expect(await enviar(gui, chaveDe(1), webp(800))).toBe(400);
      expect(await enviar(gui, chaveDe(1), new TextEncoder().encode('não é uma imagem, só um texto comprido o bastante'))).toBe(400);
      expect(impressao()).toBe(antes);
      expect(gravadas).toEqual([]);
      expect(await enviar(gui, chaveDe(1))).toBe(201);
      expect(gravadas).toEqual([`retratos/${chaveDe(1).replace('.jpg', '.pequeno.webp')}`]);
    } finally {
      bucket.put = put;
      bucket.get = get;
    }
  });

  it('/api/integrantes com retrato e cópia: a ficha recusada não grava o retrato, a cópia nem nada no banco (sessão D1c)', async () => {
    const integrantes = await import('../src/pages/api/integrantes');
    const gravadas: string[] = [];
    const bucket = env.FOTOS as { put: (chave: string) => Promise<unknown> };
    const put = bucket.put;
    bucket.put = async (chave: string) => void gravadas.push(chave);
    const jpeg = new Uint8Array(40);
    jpeg.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x03, 0x20, 0x03, 0x20]);
    const enviar = async (campos: Record<string, string>, retrato: Uint8Array = jpeg) => {
      const corpo = new FormData();
      for (const [k, v] of Object.entries(campos)) corpo.set(k, v);
      corpo.set('retrato', new File([retrato as BlobPart], 'retrato.jpg', { type: 'image/jpeg' }));
      corpo.set('retratoPequeno', new File([new Uint8Array(40)], 'pequeno.webp', { type: 'image/webp' }));
      const request = new Request('http://localhost/api/integrantes', { method: 'POST', headers: { Origin: 'http://localhost' }, body: corpo });
      const r = await integrantes.POST({ request, locals: { usuario: elizete, tipos } } as never);
      return new URL(r.headers.get('Location') ?? '/', 'http://localhost').searchParams.get('erro');
    };
    try {
      const antes = impressao();
      expect(await enviar({ nome: '' })).toBe('Escreva o nome.');
      expect(await enviar({ nome: 'Retrato Recusado' }, new TextEncoder().encode('não é uma foto, só um texto comprido o bastante'))).toContain('Formato de foto não aceito');
      expect(await enviar({ id: 'ninguem-com-este-id', nome: 'Retrato Recusado' })).toBe('Pessoa não encontrada.');
      expect(impressao()).toBe(antes);
      expect(gravadas).toEqual([]);
    } finally {
      bucket.put = put;
    }
  });

  it('/api/fotos-soltas: quem não administra e a foto que não é solta são recusados sem apagar nada (sessão D1c)', async () => {
    const soltas = await import('../src/pages/api/fotos-soltas');
    const apagadas: string[] = [];
    const bucket = env.FOTOS as { delete: (chave: string | string[]) => Promise<unknown> };
    const apagar = bucket.delete;
    bucket.delete = async (chave: string | string[]) => void apagadas.push(...[chave].flat());
    banco.sqlite.prepare(`INSERT INTO fotos (memoria_id, chave, enviada_por, enviada_em) VALUES (NULL, '2025/d1c0bbbb-0000-4000-8000-000000000001.jpg', 'elizete', datetime('now', '-40 days'))`).run();
    banco.sqlite.prepare(`INSERT INTO fotos (memoria_id, chave, enviada_por, enviada_em) VALUES (NULL, '2026/d1c0bbbb-0000-4000-8000-000000000002.jpg', 'elizete', datetime('now', '-2 days'))`).run();
    const id = (chave: string) => String(linha<{ id: number }>('SELECT id FROM fotos WHERE chave = ?', chave).id);
    try {
      const antes = impressao();
      expect((await formulario(soltas, '/api/fotos-soltas', elizete, { acao: 'apagar', foto: id('2025/d1c0bbbb-0000-4000-8000-000000000001.jpg') })).erro).toContain('Só os administradores');
      expect((await formulario(soltas, '/api/fotos-soltas', usuarioDe('gui'), { acao: 'apagar', foto: id('2026/d1c0bbbb-0000-4000-8000-000000000002.jpg') })).erro).toContain('Foto não encontrada');
      expect((await formulario(soltas, '/api/fotos-soltas', usuarioDe('gui'), { acao: 'outra', foto: id('2025/d1c0bbbb-0000-4000-8000-000000000001.jpg') })).erro).toBe('Ação desconhecida.');
      expect(impressao()).toBe(antes);
      expect(apagadas).toEqual([]);
    } finally {
      bucket.delete = apagar;
    }
  });

  it('/api/espelho: quem não administra, a cópia inteira do acervo, o arquivo grande demais e o que não é a cópia para o espelho são recusados sem mudar nada (sessão D1e)', async () => {
    const espelho = await import('../src/pages/api/espelho');
    const { montarCopia } = await import('../src/lib/servidor/copia');
    const { montarCopiaParaOEspelho } = await import('../src/lib/servidor/copia-para-o-espelho');
    const { RECADO_DA_COPIA_INTEIRA, LIMITE_DA_COPIA_PARA_O_ESPELHO } = await import('../src/lib/copia-para-o-espelho');
    const enviar = async (quem: Usuario, texto: string) => {
      const corpo = new FormData();
      corpo.set('copia', new File([texto], 'copia.json', { type: 'application/json' }));
      const request = new Request('http://localhost/api/espelho', { method: 'POST', headers: { Origin: 'http://localhost' }, body: corpo });
      const r = await espelho.POST({ request, locals: { usuario: quem, tipos } } as never);
      return new URL(r.headers.get('Location') ?? '/', 'http://localhost').searchParams.get('erro');
    };
    const inteira = JSON.stringify(await montarCopia());
    const familia = await montarCopiaParaOEspelho();
    const antes = impressao();
    expect(await enviar(elizete, JSON.stringify(familia))).toContain('Só os administradores');
    expect(await enviar(usuarioDe('gui'), inteira)).toBe(RECADO_DA_COPIA_INTEIRA);
    expect(await enviar(usuarioDe('gui'), ' '.repeat(LIMITE_DA_COPIA_PARA_O_ESPELHO + 1))).toBe(RECADO_DA_COPIA_INTEIRA);
    expect(await enviar(usuarioDe('gui'), '{ não é json')).toContain('Não consegui ler o arquivo');
    expect(await enviar(usuarioDe('gui'), JSON.stringify({ ...familia, tabelas: { ...familia.tabelas, relatos: [] } }))).toContain('não é a cópia para o espelho');
    expect(impressao()).toBe(antes);
  });

  // Item 6 da revisão D1f (decisão do chat, 24/11/2026): o pedido recusado atravessa o middleware de verdade,
  // como chega ao site. O middleware anota o primeiro acesso de quem entrou antes de a rota responder, e essa
  // linha fica mesmo quando a rota recusa: o registro é da pessoa que entrou (docs/regras/conta.md, "Avisos").
  // Fora ela, o banco inteiro sai igual, inclusive a marca da cópia (acessos é tabela de registro, D1f2).
  describe('pelo middleware: as rotas da cópia e do espelho, com o primeiro acesso de quem pede', async () => {
    const { onRequest } = await import('../src/middleware');
    const rotas: Record<string, Record<string, (contexto: never) => Promise<Response> | Response>> = {
      '/api/copia': (await import('../src/pages/api/copia')) as never,
      '/api/copia-para-o-espelho': (await import('../src/pages/api/copia-para-o-espelho')) as never,
      '/api/espelho': (await import('../src/pages/api/espelho')) as never,
    };
    /** Um pedido como o navegador manda, com "Ver como" pelo cookie, passando pelo middleware até a rota */
    const peloMiddleware = async (caminho: string, como: string, corpo?: FormData) => {
      const request = new Request(`http://localhost${caminho}`, { method: corpo ? 'POST' : 'GET', headers: { Origin: 'http://localhost', Cookie: `como=${como}` }, body: corpo });
      const url = new URL(request.url);
      const contexto = { request, url, isPrerendered: false, locals: {} as Record<string, unknown>, rewrite: () => new Response(''), params: {} };
      const rota = rotas[url.pathname]![request.method]!;
      const resposta = await (onRequest as unknown as (c: typeof contexto, p: () => Promise<Response>) => Promise<Response>)(contexto, async () => rota(contexto as never));
      return { status: resposta.status, local: new URL(resposta.headers.get('Location') ?? '/', 'http://localhost').searchParams.get('erro'), texto: await resposta.text() };
    };
    const marca = () => linha<{ valor: number }>('SELECT valor FROM marca_da_copia WHERE id = 1').valor;
    /** O banco inteiro, inclusive a marca, sem a linha de primeiro acesso de quem pede */
    const semOPrimeiroAcesso = (pessoa: string) => {
      const tabelas = (banco.sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all() as { name: string }[]).map((t) => t.name).filter(foraDoIndiceDaBusca);
      return JSON.stringify(
        tabelas.map((t) => {
          let linhas = banco.sqlite.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all() as Record<string, unknown>[];
          if (t === 'acessos') linhas = linhas.filter((l) => l.pessoa !== pessoa);
          return [t, linhas];
        }),
      );
    };
    const arquivo = (texto: string) => {
      const corpo = new FormData();
      corpo.set('copia', new File([texto], 'copia.json', { type: 'application/json' }));
      return corpo;
    };
    /** Roda os pedidos de `pessoa` como o primeiro acesso dela, e confere a exceção e o resto do banco */
    const comoPrimeiroAcesso = async (pessoa: string, pedidos: () => Promise<void>) => {
      banco.sqlite.prepare('DELETE FROM acessos WHERE pessoa = ?').run(pessoa);
      const antes = semOPrimeiroAcesso(pessoa);
      const marcaAntes = marca();
      await pedidos();
      expect(linha<{ n: number }>('SELECT COUNT(*) AS n FROM acessos WHERE pessoa = ?', pessoa).n, `o primeiro acesso de ${pessoa}`).toBe(1);
      expect(marca()).toBe(marcaAntes);
      expect(semOPrimeiroAcesso(pessoa)).toBe(antes);
    };

    it('quem não administra: /api/copia no índice e em cada parte, /api/copia-para-o-espelho e /api/espelho são recusados; só fica o primeiro acesso', async () => {
      const { montarCopiaParaOEspelho } = await import('../src/lib/servidor/copia-para-o-espelho');
      const familia = await montarCopiaParaOEspelho();
      await comoPrimeiroAcesso('elizete', async () => {
        const indice = await peloMiddleware('/api/copia', 'elizete');
        expect(indice.status).toBe(403);
        expect(indice.texto).not.toContain('"indice"');
        for (const caminho of ['/api/copia?tabela=integrantes', '/api/copia?tabela=relatos&depois=0', '/api/copia?tabela=nao_existe']) {
          const parte = await peloMiddleware(caminho, 'elizete');
          expect(parte.status, caminho).toBe(403);
          expect(parte.texto).not.toContain('"colunas"');
        }
        const espelho = await peloMiddleware('/api/copia-para-o-espelho', 'elizete');
        expect(espelho.status).toBe(403);
        expect(espelho.texto).not.toContain('"tabelas"');
        expect((await peloMiddleware('/api/espelho', 'elizete', arquivo(JSON.stringify(familia)))).local).toContain('Só os administradores');
      });
    });

    it('o administrador, no espelho: a cópia inteira, o arquivo grande demais, o que não é JSON e o que não é a cópia para o espelho; só fica o primeiro acesso', async () => {
      const { montarCopia } = await import('../src/lib/servidor/copia');
      const { montarCopiaParaOEspelho } = await import('../src/lib/servidor/copia-para-o-espelho');
      const { RECADO_DA_COPIA_INTEIRA, LIMITE_DA_COPIA_PARA_O_ESPELHO } = await import('../src/lib/copia-para-o-espelho');
      const inteira = JSON.stringify(await montarCopia());
      const familia = await montarCopiaParaOEspelho();
      expect(usuarioDe('giovanna').admin).toBe(true);
      await comoPrimeiroAcesso('giovanna', async () => {
        expect((await peloMiddleware('/api/espelho', 'giovanna', arquivo(inteira))).local).toBe(RECADO_DA_COPIA_INTEIRA);
        expect((await peloMiddleware('/api/espelho', 'giovanna', arquivo(' '.repeat(LIMITE_DA_COPIA_PARA_O_ESPELHO + 1)))).local).toBe(RECADO_DA_COPIA_INTEIRA);
        expect((await peloMiddleware('/api/espelho', 'giovanna', arquivo('{ não é json'))).local).toContain('Não consegui ler o arquivo');
        expect((await peloMiddleware('/api/espelho', 'giovanna', arquivo(JSON.stringify({ ...familia, tabelas: { ...familia.tabelas, relatos: [] } })))).local).toContain('não é a cópia para o espelho');
      });
    });
  });
});
