// Sessão Z (22/11/2026): os defeitos achados nas revisões Y a Y4 do PR #160 que não o bloquearam. Pelas
// rotas de verdade, sobre o SQLite em memória (testes/apoio/d1.ts), como testes/y3-falhas.test.ts.
import { readFileSync } from 'node:fs';
import { foraDoIndiceDaBusca } from './apoio/indice-da-busca';
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type ComandoDeTeste, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('Z: defeitos das revisões do PR #160', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  await (await import('../src/lib/servidor/banco')).prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const rotas = { memorias: await import('../src/pages/api/memorias'), relatos: await import('../src/pages/api/relatos') };
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const tipos = await repo.listarTipos();
  const linhas = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).all(...valores) as T[];
  const usuarioDe = (pessoa: string): Usuario => ({
    pessoa,
    nome: pessoa,
    admin: Boolean(linhas<{ admin: number }>('SELECT admin FROM integrantes WHERE id = ?', pessoa)[0].admin),
    nucleos: linhas<{ n: string }>(`SELECT nucleo_id AS n FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((l) => l.n),
  });
  const [giovanna, elizete] = ['giovanna', 'elizete'].map(usuarioDe);
  const pedir = async (rota: keyof typeof rotas, quem: Usuario, corpo: Record<string, unknown>) => {
    const request = new Request(`http://localhost/api/${rota}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(corpo) });
    const resposta = await rotas[rota].POST({ request, locals: { usuario: quem, tipos } } as never);
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };
  /** A impressão do banco inteiro: todas as linhas de todas as tabelas, em ordem */
  const impressao = () => {
    const tabelas = linhas<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> 'marca_da_copia' ORDER BY name`).map((t) => t.name).filter(foraDoIndiceDaBusca);
    return JSON.stringify(tabelas.map((t) => [t, banco.sqlite.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all()]));
  };
  const lote = banco.batch.bind(banco);
  /** O próximo lote que tiver um comando assim falha, como o D1 falharia */
  async function falhandoNoLote<T>(comando: RegExp, fazer: () => Promise<T>): Promise<T | Error> {
    banco.batch = async (comandos: ComandoDeTeste[]) => {
      if (comandos.some((c) => comando.test(c.sql))) {
        banco.batch = lote;
        throw new Error('D1_ERROR: falha de teste');
      }
      return lote(comandos);
    };
    try {
      return await fazer();
    } catch (erro) {
      return erro as Error;
    } finally {
      banco.batch = lote;
    }
  }

  describe('D1: a memória, o relato, os áudios e as mensagens num lote só', () => {
    it('a falha do banco no lote não deixa nada; a nova tentativa cria uma memória só, com o áudio preso a ela', async () => {
      const audio = await repo.registrarAudio({ chave: 'teste/z-d1.m4a', tipo: 'audio/mp4', tamanho: 10, duracao: 3, memoriaId: null }, elizete);
      const ficha = {
        titulo: 'Z: D1 com áudio',
        ano: 2021,
        tipo: 'causo',
        pessoas: ['elizete'],
        relato: { por: 'elizete', texto: 'Contado com a voz.', audios: [{ id: audio }], mensagens: [{ tipo: 'texto', texto: 'Contado com a voz.' }, { tipo: 'audio', audioId: audio }] },
      };
      const antes = impressao();
      const falhou = await falhandoNoLote(/^\s*UPDATE audios SET relato_id/, () => pedir('memorias', elizete, ficha));
      expect(falhou).toBeInstanceOf(Error);
      expect(impressao()).toBe(antes);
      // O áudio continua solto, à espera da nova tentativa
      expect(linhas<{ relato_id: number | null; memoria_id: string | null }>('SELECT relato_id, memoria_id FROM audios WHERE id = ?', audio)[0]).toEqual({ relato_id: null, memoria_id: null });

      const r = await pedir('memorias', elizete, ficha);
      expect(r.status).toBe(201);
      expect(linhas(`SELECT id FROM memorias WHERE titulo = 'Z: D1 com áudio'`)).toHaveLength(1);
      const relato = linhas<{ id: number }>('SELECT id FROM relatos WHERE memoria_id = ? AND por = ?', r.corpo.id as string, 'elizete')[0].id;
      expect(linhas<{ relato_id: number; memoria_id: string }>('SELECT relato_id, memoria_id FROM audios WHERE id = ?', audio)[0]).toEqual({ relato_id: relato, memoria_id: r.corpo.id });
      expect(linhas<{ tipo: string; audio_id: number | null }>('SELECT tipo, audio_id FROM relato_mensagens WHERE relato_id = ? ORDER BY ordem', relato)).toEqual([
        { tipo: 'texto', audio_id: null },
        { tipo: 'audio', audio_id: audio },
      ]);
    });

    it('a rota grava a ficha, o relato, os áudios e as mensagens numa chamada só ao banco', async () => {
      const audio = await repo.registrarAudio({ chave: 'teste/z-d1-um-lote.m4a', tipo: 'audio/mp4', tamanho: 10, duracao: 3, memoriaId: null }, giovanna);
      const lotes: string[][] = [];
      banco.batch = async (comandos: ComandoDeTeste[]) => {
        // Só os lotes que gravam: os de leitura não contam
        if (comandos.some((c) => /^\s*(INSERT|UPDATE|DELETE)/.test(c.sql))) lotes.push(comandos.map((c) => c.sql.trim().split(/\s+/).slice(0, 3).join(' ')));
        return lote(comandos);
      };
      try {
        const r = await pedir('memorias', giovanna, {
          titulo: 'Z: D1 num lote',
          ano: 2021,
          tipo: 'causo',
          pessoas: ['giovanna'],
          relato: { por: 'giovanna', texto: 'Um texto.', audios: [{ id: audio }], mensagens: [{ tipo: 'texto', texto: 'Um texto.' }, { tipo: 'audio', audioId: audio }] },
        });
        expect(r.status).toBe(201);
      } finally {
        banco.batch = lote;
      }
      expect(lotes).toHaveLength(1);
      expect(lotes[0]).toEqual(expect.arrayContaining(['INSERT INTO memorias', 'INSERT INTO relatos', 'UPDATE audios SET', 'INSERT INTO relato_mensagens']));
    });

    it('ligarAudios e a rota da memória conferem os áudios do mesmo jeito', () => {
      const repositorio = readFileSync('src/lib/servidor/repositorio.ts', 'utf-8');
      expect(repositorio.slice(repositorio.indexOf('export async function ligarAudios'))).toContain('await audiosQueEntram(relatoId, memoriaId, itens, usuario)');
      expect(readFileSync('src/pages/api/memorias.ts', 'utf-8')).toContain('await audiosQueEntram(relatoId, id, audiosDoRelato, usuario)');
    });
  });

  describe('D2: o código repetido entre a leitura e o lote', () => {
    /** Na porta do primeiro lote que grava a memória, outro pedido usa os códigos que este leu */
    async function comOutroPedidoNaPorta<T>(antesDoLote: () => void, fazer: () => Promise<T>): Promise<T> {
      let naPorta = true;
      banco.batch = async (comandos: ComandoDeTeste[]) => {
        if (naPorta && comandos.some((c) => /^\s*INSERT INTO memorias/.test(c.sql))) {
          naPorta = false;
          antesDoLote();
        }
        return lote(comandos);
      };
      try {
        return await fazer();
      } finally {
        banco.batch = lote;
      }
    }

    it('a pessoa nova e o tema novo com o código que outro pedido acabou de usar: o site tenta de novo sozinho e grava', async () => {
      const r = await comOutroPedidoNaPorta(
        () => {
          // Outro pedido cadastrou alguém com o mesmo código (outro nome, que esta pessoa não vê) e um tema
          banco.sqlite.prepare(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('fulana-zeta', 'Outra Fulana', 'gui')`).run();
          banco.sqlite.prepare(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('gui', 'fulana-zeta', 'amiga', 1)`).run();
          banco.sqlite.prepare(`INSERT INTO temas (id, nome, criado_por) VALUES ('tema-zeta', 'tema-zeta', 'gui')`).run();
        },
        () => pedir('memorias', giovanna, { titulo: 'Z: D2 com pessoa e tema', ano: 2021, tipo: 'causo', pessoas: ['giovanna', 'nova:0'], novasPessoas: [{ nome: 'Fulana Zeta' }], temas: 'tema-zeta' }),
      );
      expect(r.status).toBe(201);
      expect(linhas(`SELECT id FROM memorias WHERE titulo = 'Z: D2 com pessoa e tema'`)).toHaveLength(1);
      // A pessoa nova ganhou outro código; o tema com o mesmo nome é o mesmo tema
      expect(linhas<{ id: string }>(`SELECT id FROM integrantes WHERE nome = 'Fulana Zeta'`)).toEqual([{ id: 'fulana-zeta-2' }]);
      expect(linhas<{ n: number }>(`SELECT COUNT(*) AS n FROM tema_memorias WHERE tema_id = 'tema-zeta' AND memoria_id = ?`, r.corpo.id as string)[0].n).toBe(1);
    });

    it('o código da memória que outro pedido acabou de usar: a memória nasce com outro código', async () => {
      let usado = '';
      banco.batch = async (comandos: ComandoDeTeste[]) => {
        const insere = comandos.find((c) => /^\s*INSERT INTO memorias/.test(c.sql));
        if (insere && !usado) {
          // O código que este pedido sorteou: o primeiro valor do INSERT
          usado = (insere as unknown as { valores: string[] }).valores[0]!;
          banco.sqlite.prepare(`INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por) VALUES (?, 'Do outro pedido', 2000, 'causo', 'todos', 'publicada', 'gui')`).run(usado);
        }
        return lote(comandos);
      };
      let r: Awaited<ReturnType<typeof pedir>>;
      try {
        r = await pedir('memorias', giovanna, { titulo: 'Z: D2 com o código', ano: 2021, tipo: 'causo', pessoas: ['giovanna'] });
      } finally {
        banco.batch = lote;
      }
      expect(r.status).toBe(201);
      expect(usado).not.toBe('');
      expect(r.corpo.id).not.toBe(usado);
      expect(linhas<{ titulo: string }>('SELECT titulo FROM memorias WHERE id = ?', usado)).toEqual([{ titulo: 'Do outro pedido' }]);
    });

    it('se o código repete toda vez, nada fica, e a pessoa volta para a página com o recado e o que digitou', async () => {
      banco.batch = async (comandos: ComandoDeTeste[]) => {
        if (comandos.some((c) => /^\s*INSERT INTO memorias/.test(c.sql))) throw new Error('D1_ERROR: UNIQUE constraint failed: memorias.id: SQLITE_CONSTRAINT');
        return lote(comandos);
      };
      try {
        const antes = impressao();
        const r = await pedir('memorias', giovanna, { titulo: 'Z: D2 sem sorte', ano: 2021, tipo: 'causo', pessoas: ['giovanna', 'nova:0'], novasPessoas: [{ nome: 'Beltrana Zeta' }], temas: 'tema-sem-sorte' });
        expect(r.status).toBe(503);
        expect(r.corpo.erro).toBe('Não consegui salvar.');
        expect(impressao()).toBe(antes);
        // Sem script: volta para a página do formulário, com o recado (o que foi digitado volta pela guarda do formulário)
        const dados = new FormData();
        for (const [k, v] of Object.entries({ titulo: 'Z: D2 sem sorte', ano: '2021', tipo: 'causo', pessoas: 'giovanna' })) dados.append(k, v);
        const request = new Request('http://localhost/api/memorias', { method: 'POST', headers: { Origin: 'http://localhost' }, body: dados });
        const resposta = await rotas.memorias.POST({ request, locals: { usuario: giovanna, tipos } } as never);
        const destino = new URL(resposta.headers.get('Location') ?? '/', 'http://localhost');
        expect(destino.pathname).toBe('/nova');
        expect(destino.searchParams.get('erro')).toBe('Não consegui salvar.');
        expect(impressao()).toBe(antes);
      } finally {
        banco.batch = lote;
      }
    });

    it('só o código repetido tenta de novo: outra falha do banco continua sendo erro', () => {
      expect(repo.codigoRepetido(new Error('D1_ERROR: UNIQUE constraint failed: integrantes.id: SQLITE_CONSTRAINT'))).toBe(true);
      expect(repo.codigoRepetido(new Error('UNIQUE constraint failed: temas.id'))).toBe(true);
      expect(repo.codigoRepetido(new Error('UNIQUE constraint failed: memoria_nucleos.memoria_id'))).toBe(false);
      expect(repo.codigoRepetido(new Error('D1_ERROR: falha de teste'))).toBe(false);
    });
  });

  describe('D3: o toque duplo sem script em "Publicar relato"', () => {
    /** A janela sem script, como o navegador manda: o código de envio vem da página */
    const janela = async (quem: Usuario, campos: Record<string, string>) => {
      const dados = new FormData();
      for (const [k, v] of Object.entries(campos)) dados.append(k, v);
      const request = new Request('http://localhost/api/relatos', { method: 'POST', headers: { Origin: 'http://localhost' }, body: dados });
      const resposta = await rotas.relatos.POST({ request, locals: { usuario: quem, tipos } } as never);
      return new URL(resposta.headers.get('Location') ?? '/', 'http://localhost');
    };
    const mensagensDe = (memoria: string, por: string) =>
      linhas<{ texto: string }>('SELECT m.texto FROM relato_mensagens m JOIN relatos r ON r.id = m.relato_id WHERE r.memoria_id = ? AND r.por = ? ORDER BY m.ordem', memoria, por).map((m) => m.texto);

    it('o segundo envio igual, com o mesmo código, não grava a mensagem de novo e responde como o primeiro', async () => {
      const id = (await pedir('memorias', giovanna, { titulo: 'Z: D3 toque duplo', ano: 2021, tipo: 'causo', pessoas: ['giovanna'] })).corpo.id as string;
      const envio = { memoria: id, por: 'elizete', acrescentar: '1', texto: 'Uma lembrança só.', situacao: 'publicada', envio: 'codigo-do-toque-duplo' };
      const primeiro = await janela(elizete, envio);
      const depoisDoPrimeiro = impressao();
      const segundo = await janela(elizete, envio);
      expect(mensagensDe(id, 'elizete')).toEqual(['Uma lembrança só.']);
      expect(linhas<{ texto: string }>('SELECT texto FROM relatos WHERE memoria_id = ? AND por = ?', id, 'elizete')[0].texto).toBe('Uma lembrança só.');
      expect(impressao()).toBe(depoisDoPrimeiro);
      expect(segundo.pathname).toBe(primeiro.pathname);
      expect(segundo.searchParams.get('ok')).toBe(primeiro.searchParams.get('ok'));
      // Outra página, outro código: a mensagem nova entra
      await janela(elizete, { ...envio, texto: 'E mais uma.', envio: 'outro-codigo' });
      expect(mensagensDe(id, 'elizete')).toEqual(['Uma lembrança só.', 'E mais uma.']);
    });

    it('o pedido recusado não gasta o código: o mesmo envio, corrigido, grava', async () => {
      const id = (await pedir('memorias', giovanna, { titulo: 'Z: D3 recusado', ano: 2021, tipo: 'causo', pessoas: ['giovanna'] })).corpo.id as string;
      const antes = impressao();
      const recusado = await janela(elizete, { memoria: id, por: 'ninguem-com-este-id', acrescentar: '1', texto: 'Por ninguém.', situacao: 'publicada', envio: 'codigo-recusado' });
      expect(recusado.searchParams.get('erro')).not.toBeNull();
      expect(impressao()).toBe(antes);
      await janela(elizete, { memoria: id, por: 'elizete', acrescentar: '1', texto: 'Agora sim.', situacao: 'publicada', envio: 'codigo-recusado' });
      expect(mensagensDe(id, 'elizete')).toEqual(['Agora sim.']);
    });

    it('a janela sem script leva um código novo a cada página', () => {
      expect(readFileSync('src/components/conversa/Janela.astro', 'utf-8')).toContain('<input type="hidden" name="envio" value={crypto.randomUUID()} />');
    });
  });

  /** Uma memória da Giovanna com fotos, na ordem, a primeira principal; devolve o id e os ids das fotos */
  async function memoriaComFotos(titulo: string, quantas: number, extra: Record<string, unknown> = {}) {
    const id = (await pedir('memorias', giovanna, { titulo, ano: 2021, tipo: 'causo', pessoas: ['giovanna'], ...extra })).corpo.id as string;
    const fotos: number[] = [];
    for (let n = 0; n < quantas; n++) {
      banco.sqlite.prepare(`INSERT INTO fotos (memoria_id, chave, principal, ordem, enviada_por) VALUES (?, ?, ?, ?, 'giovanna')`).run(id, `teste/${id}-${n}.jpg`, n === 0 ? 1 : 0, n);
      fotos.push(linhas<{ id: number }>('SELECT MAX(id) AS id FROM fotos')[0].id);
    }
    return { id, fotos, ficha: { id, titulo, ano: 2021, tipo: 'causo', pessoas: ['giovanna'], ...extra } };
  }
  const fotosDa = (memoria: string) =>
    linhas<{ id: number; principal: number; removida: number }>('SELECT id, principal, removida_em IS NOT NULL AS removida FROM fotos WHERE memoria_id = ? ORDER BY ordem, id', memoria);
  /** Uma foto que outra pessoa acrescentou à memória, no fim e sem ser a principal */
  const acrescentada = (memoria: string) => {
    banco.sqlite.prepare(`INSERT INTO fotos (memoria_id, chave, principal, ordem, enviada_por) VALUES (?, ?, 0, 9, 'elizete')`).run(memoria, `teste/${memoria}-da-elizete.jpg`);
    return linhas<{ id: number }>('SELECT MAX(id) AS id FROM fotos')[0].id;
  };

  describe('D8: memória com foto sempre tem principal', () => {
    it('tirar a única foto vista, com outra acrescentada depois de a página abrir: a que ficou vira a principal', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z: D8 a única vista', 1);
      const daElizete = acrescentada(id);
      const r = await pedir('memorias', giovanna, { ...ficha, fotos: [], fotosMostradas: fotos });
      expect(r.status).toBe(200);
      expect(fotosDa(id)).toEqual([
        { id: fotos[0], principal: 1, removida: 1 },
        { id: daElizete, principal: 1, removida: 0 },
      ]);
    });

    it('a foto que outra pessoa acrescenta entre a leitura e o lote também vira a principal', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z: D8 na porta do lote', 1);
      let daElizete = 0;
      banco.batch = async (comandos: ComandoDeTeste[]) => {
        if (!daElizete && comandos.some((c) => /^\s*UPDATE memorias SET titulo/.test(c.sql))) daElizete = acrescentada(id);
        return lote(comandos);
      };
      try {
        expect((await pedir('memorias', giovanna, { ...ficha, fotos: [], fotosMostradas: fotos })).status).toBe(200);
      } finally {
        banco.batch = lote;
      }
      expect(fotosDa(id).filter((f) => !f.removida)).toEqual([{ id: daElizete, principal: 1, removida: 0 }]);
    });
  });

  describe('D4: o administrador que só corrige os dados não mexe na principal nem na ordem', () => {
    const gui = usuarioDe('gui');
    it('o Gui é administrador e, nesta memória, só corrige os dados', () => {
      expect(gui.admin).toBe(true);
    });

    it('mandando só uma parte das fotos, com outra principal: a principal e a ordem ficam como estão', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z: D4 uma parte', 3);
      const antes = fotosDa(id);
      for (const corpo of [
        { fotos: [{ id: fotos[1], principal: true }], fotosMostradas: [fotos[1]] },
        { fotos: [{ id: fotos[2] }], fotosMostradas: [fotos[2]] },
        { fotos: [{ id: fotos[2], principal: true }], fotosMostradas: [fotos[2]] },
      ]) {
        const r = await pedir('memorias', gui, { ...ficha, lugar: 'Caeté', ...corpo });
        expect(r.status).toBe(200);
        expect(fotosDa(id)).toEqual(antes);
      }
    });

    it('trocar a ordem das fotos que a página mostra continua recusado', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z: D4 a ordem', 3);
      const antes = impressao();
      const r = await pedir('memorias', gui, { ...ficha, fotos: [{ id: fotos[2] }, { id: fotos[1] }], fotosMostradas: [fotos[2], fotos[1]] });
      expect(r.status).toBe(403);
      expect(impressao()).toBe(antes);
      expect(fotosDa(id).map((f) => f.id)).toEqual(fotos);
    });

    it('tirar a principal continua valendo: a seguinte toma o lugar dela, na mesma ordem', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z: D4 tirar a principal', 3);
      const r = await pedir('memorias', gui, { ...ficha, fotos: [{ id: fotos[1] }, { id: fotos[2] }], fotosMostradas: fotos });
      expect(r.status).toBe(200);
      expect(fotosDa(id)).toEqual([
        { id: fotos[0], principal: 1, removida: 1 },
        { id: fotos[1], principal: 1, removida: 0 },
        { id: fotos[2], principal: 0, removida: 0 },
      ]);
    });
  });

  describe('D7: a página aberta antes da publicação, sem fotosMostradas', () => {
    it('não mexe nas fotos que a memória tem, e só as novas entram, no fim', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z: D7 página de antes', 2);
      banco.sqlite.prepare(`INSERT INTO fotos (memoria_id, chave, principal, ordem, enviada_por) VALUES (NULL, 'teste/z-d7-nova.jpg', 0, 0, 'giovanna')`).run();
      const nova = linhas<{ id: number }>('SELECT MAX(id) AS id FROM fotos')[0].id;
      const antes = fotosDa(id);
      // A página de antes tirou a primeira foto, pôs legenda e principal na segunda e mandou uma nova
      const r = await pedir('memorias', giovanna, { ...ficha, lugar: 'Sabará', fotos: [{ id: fotos[1], legenda: 'Legenda da página de antes', principal: true }, { id: nova }] });
      expect(r.status).toBe(200);
      expect(fotosDa(id)).toEqual([...antes, { id: nova, principal: 0, removida: 0 }]);
      expect(linhas<{ legenda: string | null }>('SELECT legenda FROM fotos WHERE id = ?', fotos[1])[0].legenda).toBeNull();
      // O resto da correção vale
      expect(linhas<{ lugar: string }>('SELECT lugar FROM memorias WHERE id = ?', id)[0].lugar).toBe('Sabará');
    });

    it('a página de hoje, que manda fotosMostradas, continua tirando e reordenando', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z: D7 página de hoje', 2);
      const r = await pedir('memorias', giovanna, { ...ficha, fotos: [{ id: fotos[1], principal: true }], fotosMostradas: fotos });
      expect(r.status).toBe(200);
      expect(fotosDa(id).filter((f) => !f.removida)).toEqual([{ id: fotos[1], principal: 1, removida: 0 }]);
    });
  });

  describe('D5: o público do relato que a tela não oferece', () => {
    /** Uma memória da Giovanna só da Bayara Nascimento, aberta depois para todos: o relato novo da página de antes espera */
    async function aberta(titulo: string) {
      const ficha = { titulo, ano: 2021, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] };
      const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
      expect((await pedir('memorias', giovanna, { ...ficha, id, visibilidade: 'todos' })).status).toBe(200);
      return id;
    }

    it('a família que não é da memória nem de quem escreve é recusada, sem gravar nada', async () => {
      const id = await aberta('Z: D5 família de fora');
      expect(elizete.nucleos).not.toContain('bracarense');
      const antes = impressao();
      for (const publico of ['nucleos:bracarense', 'nucleos:bayara-nascimento,bracarense', 'nucleos:', 'qualquer-coisa']) {
        const r = await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Forjado.', publico });
        expect(r.status, publico).toBe(400);
        expect(r.corpo.erro).toBe('Envio inválido.');
      }
      expect(impressao()).toBe(antes);
    });

    it('o público que a página mostrava continua valendo: o relato nasce só para ele e espera', async () => {
      const id = await aberta('Z: D5 página de antes');
      const r = await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Da página de antes.', publico: 'nucleos:bayara-nascimento' });
      expect(r.status).toBe(201);
      expect(linhas<{ so: string }>('SELECT so_para_nucleos AS so FROM relatos WHERE memoria_id = ? AND por = ?', id, 'elizete')[0].so).toBe('["bayara-nascimento"]');
    });

    it('um público que a memória já teve, com uma família que não é de quem escreve, também vale', async () => {
      // A memória era da Bayara Nascimento e da Bracarense; a Elizete, da Bayara Nascimento, abriu a página então
      const ficha = { titulo: 'Z: D5 duas famílias', ano: 2021, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: ['bayara-nascimento', 'bracarense'] };
      const gio = { ...giovanna, nucleos: [...giovanna.nucleos, 'bracarense'] };
      const id = (await pedir('memorias', gio, ficha)).corpo.id as string;
      expect((await pedir('memorias', gio, { ...ficha, id, visibilidade: 'todos', nucleos: [] })).status).toBe(200);
      const r = await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Da página com as duas famílias.', publico: 'nucleos:bayara-nascimento,bracarense' });
      expect(r.status).toBe(201);
    });
  });

  describe('D6: o relato por /api/memorias numa memória publicada', () => {
    it('quem não criou, sem o público, é recusado sem gravar nada; pela tela de relato, o mesmo relato entra', async () => {
      const ficha = { titulo: 'Z: D6 relato pela memória', ano: 2021, tipo: 'causo', pessoas: ['giovanna', 'elizete'] };
      const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
      const antes = impressao();
      const r = await pedir('memorias', elizete, { ...ficha, id, relato: { por: 'elizete', texto: 'Pela ficha da memória.' } });
      expect(r.status).toBe(400);
      expect(r.corpo.erro).toBe('Envio inválido.');
      expect(impressao()).toBe(antes);
      // Também com áudio ou mensagens, e também para quem criou: a tela não oferece o relato na memória publicada
      expect((await pedir('memorias', elizete, { ...ficha, id, relato: { por: 'elizete', texto: '', mensagens: [{ tipo: 'texto', texto: 'Só mensagem.' }] } })).status).toBe(400);
      expect((await pedir('memorias', giovanna, { ...ficha, id, relato: { por: 'giovanna', texto: 'Da criadora.' } })).status).toBe(400);
      expect(impressao()).toBe(antes);
      // A correção da ficha sem relato continua
      expect((await pedir('memorias', elizete, { ...ficha, id, lugar: 'Ouro Preto' })).status).toBe(200);
      // E o relato pela tela de relato entra, com as regras dela
      expect((await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Pela tela de relato.', publico: 'todos' })).status).toBe(201);
    });

    it('na memória nova e no rascunho de quem cria, o relato continua indo junto', async () => {
      const ficha = { titulo: 'Z: D6 rascunho', ano: 2021, tipo: 'causo', pessoas: ['giovanna'], situacao: 'rascunho' };
      const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
      const r = await pedir('memorias', giovanna, { ...ficha, id, situacao: 'publicada', relato: { por: 'giovanna', texto: 'Junto da publicação.' } });
      expect(r.status).toBe(200);
      expect(linhas('SELECT id FROM relatos WHERE memoria_id = ? AND por = ?', id, 'giovanna')).toHaveLength(1);
    });
  });
});

