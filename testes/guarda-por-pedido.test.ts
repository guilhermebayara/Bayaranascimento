// A guarda por pedido (sessão D1a, 23/11/2026; src/lib/servidor/ambiente.ts): o que um pedido lê do banco
// fica guardado só durante ele, com a pessoa do pedido na chave. Testado com o banco SQLite em memória
// (testes/apoio/d1.ts), contando quantos comandos chegam de verdade ao banco.
//
// Regras que não podem falhar:
// - dois pedidos seguidos, como pessoas diferentes: o segundo nunca recebe o que foi lido para o primeiro;
// - o "Ver como" troca a pessoa e troca o que é lido;
// - nada passa de um pedido para outro, nem com a mesma pessoa (o Worker reaproveita o processo);
// - depois de uma gravação no mesmo pedido, o que ela pode ter mudado é lido de novo.
import { describe, expect, it, vi } from 'vitest';
import { ComandoDeTeste, temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('guarda por pedido', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const ambiente = await import('../src/lib/servidor/ambiente');
  const repositorio = await import('../src/lib/servidor/repositorio');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;

  // Quantos comandos chegaram ao banco de verdade
  let noBanco = 0;
  const executar = ComandoDeTeste.prototype.executar;
  const primeiro = ComandoDeTeste.prototype.first;
  ComandoDeTeste.prototype.executar = function (this: ComandoDeTeste) {
    noBanco++;
    return executar.call(this);
  };
  ComandoDeTeste.prototype.first = function (this: ComandoDeTeste, coluna?: string) {
    noBanco++;
    return primeiro.call(this, coluna);
  };
  const contar = async (fazer: () => Promise<unknown>) => {
    const antes = noBanco;
    await fazer();
    return noBanco - antes;
  };

  const linha = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...valores) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  /** Um pedido, como o middleware abre, já com a pessoa */
  const pedido = <T>(pessoa: string | undefined, fazer: () => Promise<T>): Promise<T> =>
    ambiente.noPedido(new Request('http://localhost/'), async () => {
      ambiente.definirPessoaDoPedido(pessoa);
      return fazer();
    });

  it('dentro de um pedido, a mesma leitura vai ao banco uma vez só', async () => {
    await pedido('gui', async () => {
      expect(await contar(() => repositorio.listarTipos())).toBe(1);
      expect(await contar(() => repositorio.listarTipos())).toBe(0);
      expect(await contar(() => repositorio.listarIntegrantes())).toBe(2);
      expect(await contar(() => repositorio.listarIntegrantes())).toBe(0);
    });
  });

  it('a lista guardada é uma cópia: quem mexe nela não muda o que o próximo recebe', async () => {
    await pedido('gui', async () => {
      const tipos = await repositorio.listarTipos();
      const quantos = tipos.length;
      tipos.splice(0, tipos.length);
      expect((await repositorio.listarTipos()).length).toBe(quantos);
    });
  });

  it('nada passa de um pedido para outro, nem com a mesma pessoa', async () => {
    await pedido('gui', () => repositorio.listarTipos());
    expect(await pedido('gui', () => contar(() => repositorio.listarTipos()))).toBe(1);
    // Fora de um pedido (scripts, testes antigos), não há guarda nenhuma
    expect(await contar(() => repositorio.listarTipos())).toBe(1);
    expect(await contar(() => repositorio.listarTipos())).toBe(1);
  });

  it('dois pedidos seguidos, como pessoas diferentes: o segundo nunca recebe o que foi lido para o primeiro', async () => {
    banco.sqlite.prepare('DELETE FROM apelidos_meus WHERE dono_id IN (?, ?)').run('gui', 'elizete');
    banco.sqlite.prepare('INSERT INTO apelidos_meus (dono_id, pessoa_id, apelido) VALUES (?, ?, ?)').run('gui', 'elizete', 'Apelido que só o Gui deu');
    const doGui = await pedido('gui', () => repositorio.listarMeusApelidos('gui'));
    const daElizete = await pedido('elizete', () => repositorio.listarMeusApelidos('elizete'));
    expect(doGui.get('elizete')).toBe('Apelido que só o Gui deu');
    expect(daElizete.size).toBe(0);
    // As pessoas em laços privados de outros: cada um tem a sua conta
    const gui = usuarioDe('gui');
    const elizete = usuarioDe('elizete');
    const paraOGui = await pedido('gui', () => repositorio.pessoasEmLacosPrivadosDeOutros(gui));
    const paraAElizete = await pedido('elizete', () => repositorio.pessoasEmLacosPrivadosDeOutros(elizete));
    const direto = (dono: string) => new Set((banco.sqlite.prepare('SELECT DISTINCT pessoa_id FROM lacos_coracao WHERE privado = 1 AND dono_id <> ?').all(dono) as { pessoa_id: string }[]).map((r) => r.pessoa_id));
    expect([...paraOGui].sort()).toEqual([...direto('gui')].sort());
    expect([...paraAElizete].sort()).toEqual([...direto('elizete')].sort());
    banco.sqlite.prepare('DELETE FROM apelidos_meus WHERE dono_id = ?').run('gui');
  });

  it('o "Ver como" troca a pessoa no meio do pedido e troca o que é lido', async () => {
    await pedido('gui', async () => {
      expect(await contar(() => repositorio.listarTipos())).toBe(1);
      ambiente.definirPessoaDoPedido('elizete');
      // A mesma leitura, por outra pessoa, vai ao banco de novo
      expect(await contar(() => repositorio.listarTipos())).toBe(1);
      expect(await contar(() => repositorio.listarTipos())).toBe(0);
      ambiente.definirPessoaDoPedido('gui');
      expect(await contar(() => repositorio.listarTipos())).toBe(0);
    });
  });

  it('o lote do começo do pedido deixa guardado o que as páginas leem', async () => {
    await pedido('gui', async () => {
      await repositorio.aquecerOPedido('gui', 'pagina', { apelidos: true });
      const gui = usuarioDe('gui');
      const leituras = await contar(() =>
        Promise.all([
          repositorio.listarIntegrantes(),
          repositorio.listarNucleos(),
          repositorio.listarTipos(),
          repositorio.listarFiliacoes(),
          repositorio.listarCasais(gui),
          repositorio.listarLacosDoCoracao(gui),
          repositorio.pessoasQueONaoVe(gui),
          repositorio.nomesDasPessoasExcluidas(),
          repositorio.listarMeusApelidos('gui'),
          repositorio.comoOsExesAparecem(gui),
          repositorio.contarAvisosPendentes(gui),
        ]),
      );
      expect(leituras).toBe(0);
    });
  });

  it('as rotas de arquivo leem só o que a conferência de quem vê usa: nem tipos nem apelidos', async () => {
    await pedido('gui', async () => {
      const lidos = await contar(() => repositorio.aquecerOPedido('gui', 'arquivo', { apelidos: false }));
      expect(lidos).toBe(4);
      expect(await contar(() => repositorio.listarIntegrantes())).toBe(0);
      expect(await contar(() => repositorio.listarTipos())).toBe(1);
    });
    const { comecoDoPedido, usaApelidosDeQuemOlha } = await import('../src/lib/servidor/comeco-do-pedido');
    for (const caminho of ['/fotos/2026/x.jpg', '/audios/2026/x.m4a', '/retratos/x.jpg']) {
      expect(comecoDoPedido(caminho)).toBe('arquivo');
      expect(usaApelidosDeQuemOlha(caminho)).toBe(false);
    }
    expect(comecoDoPedido('/api/memorias')).toBe('rota');
    expect(comecoDoPedido('/memorias/1992-chegada-do-gui')).toBe('pagina');
    expect(usaApelidosDeQuemOlha('/admin/tipos')).toBe(false);
    expect(usaApelidosDeQuemOlha('/pessoas/gui')).toBe(true);
  });

  it('depois de gravar, o que a gravação pode ter mudado é lido de novo; o resto continua guardado', async () => {
    const tipo = linha<{ id: string; rotulo: string; cor: string; icone: string }>('SELECT id, rotulo, cor, icone FROM tipos ORDER BY id LIMIT 1');
    await pedido('gui', async () => {
      await repositorio.listarTipos();
      await repositorio.listarNucleos();
      await repositorio.atualizarTipo(tipo.id, 'Rótulo trocado no teste', tipo.cor, tipo.icone);
      // A tabela gravada é lida de novo, e já com o rótulo novo
      let tipos: Awaited<ReturnType<typeof repositorio.listarTipos>> = [];
      expect(await contar(async () => (tipos = await repositorio.listarTipos()))).toBe(1);
      expect(tipos.find((t) => t.id === tipo.id)?.rotulo).toBe('Rótulo trocado no teste');
      // Outra tabela continua guardada
      expect(await contar(() => repositorio.listarNucleos())).toBe(0);
      // Um DELETE pode apagar em cascata: tudo é lido de novo
      await ambiente.banco().prepare('DELETE FROM apelidos_meus WHERE dono_id = ?').bind('ninguem').run();
      expect(await contar(() => repositorio.listarNucleos())).toBe(1);
      await repositorio.atualizarTipo(tipo.id, tipo.rotulo, tipo.cor, tipo.icone);
    });
  });

  it('um lote com gravação vai inteiro e faz ler de novo a tabela gravada', async () => {
    await pedido('gui', async () => {
      await repositorio.listarTipos();
      const db = ambiente.banco();
      await db.batch([db.prepare('SELECT 1'), db.prepare("UPDATE tipos SET ordem = ordem WHERE id = 'nenhum'")]);
      expect(await contar(() => repositorio.listarTipos())).toBe(1);
    });
  });

  it('o Server-Timing conta cada comando e cada ida ao banco', async () => {
    await pedido('gui', async () => {
      await repositorio.listarIntegrantes();
      await repositorio.listarIntegrantes();
      await repositorio.listarTipos();
      const medida = ambiente.medidaDoPedido()!;
      expect(medida.consultas).toBe(3);
      expect(medida.idas).toBe(2);
      expect(ambiente.servidorTiming()).toMatch(/^servidor;dur=\d+, d1;dur=\d+;desc="consultas=3 idas=2"$/);
    });
    expect(ambiente.servidorTiming()).toBeUndefined();
  });

  it('uma leitura que falhou não fica guardada', async () => {
    await pedido('gui', async () => {
      const db = ambiente.banco();
      await expect(db.prepare('SELECT * FROM tabela_que_nao_existe').all()).rejects.toThrow();
      await expect(db.prepare('SELECT * FROM tabela_que_nao_existe').all()).rejects.toThrow();
    });
  });

  it('o sorteio nunca é guardado', async () => {
    await pedido('gui', async () => {
      const db = ambiente.banco();
      expect(await contar(() => db.prepare('SELECT RANDOM() % 100 AS n').all())).toBe(1);
      expect(await contar(() => db.prepare('SELECT RANDOM() % 100 AS n').all())).toBe(1);
    });
  });

  // A anterior e a seguinte da memória (vizinhasDaMemoria): a mesma ordem da linha do tempo
  it('são as vizinhas da linha do tempo, para cada pessoa e cada memória que ela vê', async () => {
    // Memórias no mesmo dia e na mesma hora de entrada, sem mês e sem dia, para a ordem precisar de todo o desempate
    banco.sqlite.prepare(`UPDATE memorias SET criada_em = '2020-01-01 00:00:00' WHERE id IN (SELECT id FROM memorias ORDER BY id LIMIT 8)`).run();
    for (const pessoa of ['gui', 'elizete', 'giovanna', 'lucas-magno']) {
      const usuario = usuarioDe(pessoa);
      const linha = await repositorio.listarMemorias(usuario);
      expect(linha.length).toBeGreaterThan(10);
      for (const [n, memoria] of linha.entries()) {
        const { antes, depois } = await repositorio.vizinhasDaMemoria(usuario, memoria);
        expect([antes?.id, depois?.id]).toEqual([linha[n - 1]?.id, linha[n + 1]?.id]);
      }
    }
  });
});
