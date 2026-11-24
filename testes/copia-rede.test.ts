// A rede no fim da cópia e a cópia mensal que só conta no Drive (D1f3, 24/11/2026; terceira rodada da revisão
// R-D1). Quem junta (o script do Drive e o botão da Administração) confere o arquivo montado contra o esquema do
// banco, que vem no índice, antes de gravar ou entregar: nenhuma chave primária ou única repetida e nenhuma chave
// estrangeira sem o alvo. Se não conferir, a sequência inteira é refeita. Regras que não podem falhar, cada uma
// nos dois fluxos:
// - (a) a reserva solta e retomada no meio da cópia não sai duas vezes no arquivo (a tabela das reservas nem vai);
// - (b) uma tabela criada entre a leitura dos gatilhos e a lista do índice, com pai e filho gravados depois da
//   parte dos pais, não deixa o filho sem o pai no arquivo;
// - (c) a cópia mensal só é anotada quando o script confirma que gravou no Drive; tentativa descartada não anota;
// - a rede sozinha, com a marca desligada: um arquivo inconsistente nunca é gravado nem baixado.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import { restaurarCopia } from './apoio/restaurar';
import { AcervoMudouNaCopia, baixarCopiaEmPartes, conferirCopia, type IndiceDaCopia, type ParteDaCopia } from '../src/lib/copia-em-partes';
import { TABELAS_DA_COPIA } from '../src/lib/servidor/marca-da-copia';

const comSqlite = await temSqlite();
const fs = 'node:fs';
const vmNome = 'node:vm';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: string, codificacao: string) => string };
const vm = (await import(/* @vite-ignore */ vmNome)) as { runInNewContext: (codigo: string, caixa: Record<string, unknown>) => unknown };

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
vi.mock('astro:middleware', () => ({ defineMiddleware: <T>(f: T) => f }));
vi.mock('../src/lib/servidor/acesso', async (original) => {
  const real = await original<typeof import('../src/lib/servidor/acesso')>();
  return { ...real, ehServicoDeCopia: async (request: Request) => request.headers.get('CF-Access-Client-Id') === 'servico-de-teste' };
});
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

type Tabelas = Record<string, Record<string, unknown>[]>;
type Antes = (endereco: string) => void | Promise<void>;

describe.skipIf(!comSqlite)('a rede no fim da cópia e a cópia mensal que só conta no Drive', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const rota = await import('../src/pages/api/copia');
  const { onRequest } = await import('../src/middleware');
  const { noPedido } = await import('../src/lib/servidor/ambiente');

  const gui = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };
  const tipo = (banco.sqlite.prepare('SELECT id FROM tipos ORDER BY id LIMIT 1').get() as { id: string }).id;
  const anotacoes = () => (banco.sqlite.prepare('SELECT COUNT(*) AS n FROM copias_mensais').get() as { n: number }).n;
  const ehAPrimeira = (tabela: string, endereco: string) => new RegExp(`[?&]tabela=${tabela}(&|$)`).test(endereco) && !/[?&]depois=/.test(endereco);
  const ehASegunda = (tabela: string, endereco: string) => new RegExp(`[?&]tabela=${tabela}&depois=`).test(endereco);
  let gravadas = 0;
  const gravarMemoriaComRelato = () => {
    const id = `d1f3-${++gravadas}`;
    banco.sqlite.exec('BEGIN');
    banco.sqlite.prepare(`INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por) VALUES (?, 'Gravada no meio', 1999, ?, 'todos', 'publicada', 'gui')`).run(id, tipo);
    banco.sqlite.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, 'gui', 'gui', 'O relato dela.', 'publicada')`).run(id);
    banco.sqlite.exec('COMMIT');
  };

  // --- O banco por baixo das rotas, com ganchos para os casos ---
  const prepararDeVerdade = banco.prepare.bind(banco);
  let marcaDesligada = false;
  let depoisDosGatilhos: (() => void) | null = null;
  const GARANTIR = `SELECT type, name FROM sqlite_master WHERE type IN ('table', 'trigger')`;
  banco.prepare = ((sql: string) => {
    // A marca desligada: o índice e as partes leem sempre zero, e só a rede pode pegar o arquivo errado
    if (marcaDesligada) sql = sql.replace(`SELECT valor FROM marca_da_copia WHERE id = 1`, 'SELECT 0 AS valor').replace(`'marca:' || m.valor`, `'marca:' || 0`);
    const comando = prepararDeVerdade(sql);
    // O caso b: algo acontece logo depois de o índice ler o esquema, fora do lote: na leitura dos gatilhos
    // (garantirGatilhosDaMarca) ou na lista das tabelas, a que vier primeiro
    if ((sql === GARANTIR || sql === TABELAS_DA_COPIA) && depoisDosGatilhos) {
      const fazer = depoisDosGatilhos;
      depoisDosGatilhos = null;
      return Object.assign(Object.create(Object.getPrototypeOf(comando)), comando, {
        all: async () => {
          const r = await comando.all();
          fazer();
          return r;
        },
      });
    }
    return comando;
  }) as typeof banco.prepare;

  // --- O botão da Administração ---
  const pedir = async (endereco: string) => {
    const url = new URL(endereco, 'http://localhost');
    const resposta = await noPedido(new Request(url), () => rota.GET({ locals: { usuario: gui }, url, request: new Request(url) } as never));
    if (resposta.status !== 200) throw new Error(`Resposta ${resposta.status}`);
    return JSON.parse(await resposta.text());
  };
  const peloBotao = async (antes: Antes) => {
    let indices = 0;
    const copia = await baixarCopiaEmPartes(
      async (endereco) => {
        if (endereco === '/api/copia') indices++;
        await antes(endereco);
        return pedir(endereco);
      },
      undefined,
      async () => undefined,
    );
    return { copia, indices };
  };

  // --- O script do Drive, numa caixa de areia ---
  const CABECALHOS = { 'CF-Access-Client-Id': 'servico-de-teste', 'CF-Access-Client-Secret': 'segredo-de-teste' };
  const ENDERECO = 'https://memorias.bayara.com.br/api/copia';
  const peloMiddleware = async (endereco: string) => {
    const request = new Request(endereco, { headers: CABECALHOS });
    const contexto = { request, url: new URL(request.url), isPrerendered: false, locals: {} as Record<string, unknown>, rewrite: () => new Response('') };
    const resposta = await (onRequest as unknown as (c: typeof contexto, p: () => Promise<Response>) => Promise<Response>)(contexto, async () => new Response('a página', { status: 200 }));
    return { status: resposta.status, texto: await resposta.text() };
  };
  /** As respostas de uma passada, na ordem em que o script pede, com `antes` antes de cada pedido */
  const umaPassada = async (antes: Antes) => {
    const respostas = new Map<string, { status: number; texto: string }>();
    await antes(ENDERECO);
    const indice = await peloMiddleware(ENDERECO);
    if (indice.status !== 200) throw new Error(`O índice respondeu ${indice.status}: ${indice.texto.slice(0, 300)}`);
    respostas.set(ENDERECO, indice);
    for (const { tabela } of (JSON.parse(indice.texto) as IndiceDaCopia).indice) {
      let depois: number | null = null;
      for (;;) {
        const endereco = `${ENDERECO}?tabela=${encodeURIComponent(tabela)}${depois === null ? '' : `&depois=${depois}`}`;
        await antes(endereco.replace('https://memorias.bayara.com.br', ''));
        const r = await peloMiddleware(endereco);
        respostas.set(endereco, r);
        const parte = JSON.parse(r.texto) as ParteDaCopia;
        if (parte.proxima === null) break;
        depois = parte.proxima;
      }
    }
    return respostas;
  };
  const peloScript = async (antes: Antes, passadas = 4) => {
    const lista: Map<string, { status: number; texto: string }>[] = [];
    for (let i = 0; i < passadas; i++) lista.push(await umaPassada(antes));
    const arquivos: { texto: string }[] = [];
    const confirmacoes: string[] = [];
    let passada = -1;
    const caixa = {
      PropertiesService: { getScriptProperties: () => ({ getProperty: (nome: string) => ({ CLIENT_ID: 'servico-de-teste', CLIENT_SECRET: 'segredo-de-teste' })[nome] ?? null }) },
      UrlFetchApp: {
        fetch: (endereco: string) => {
          if (endereco.includes('?confirmar=')) {
            confirmacoes.push(endereco);
            return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ acervo: 'Bayara Nascimento', anotada: true }) };
          }
          if (endereco === ENDERECO) passada++;
          const r = lista[passada]?.get(endereco) ?? { status: 404, texto: '' };
          return { getResponseCode: () => r.status, getContentText: () => r.texto };
        },
      },
      DriveApp: { getFoldersByName: () => ({ hasNext: () => true, next: () => ({ createFile: (_: string, texto: string) => arquivos.push({ texto }) }) }), createFolder: () => null },
      Utilities: { sleep: () => undefined, formatDate: () => '2026-12-01' },
      ScriptApp: {},
    };
    let erro: unknown = null;
    try {
      vm.runInNewContext(`${readFileSync('scripts/copia-no-drive.gs', 'utf8')}\nfazerCopia();`, caixa);
    } catch (e) {
      erro = e;
    }
    // A confirmação vai ao middleware de verdade depois que o script termina, como chegaria ao site
    for (const c of confirmacoes) expect((await peloMiddleware(c)).status).toBe(200);
    return { arquivo: arquivos[0] ? (JSON.parse(arquivos[0].texto) as { tabelas: Tabelas }) : null, arquivos: arquivos.length, erro, indices: passada + 1, confirmacoes };
  };

  // --- (a) A reserva solta e retomada no meio da cópia ---
  describe('(a) a reserva solta e retomada no meio da cópia', () => {
    // Mais de uma parte de reservas: a primeira página vai até a milésima
    const inserir = banco.sqlite.prepare(`INSERT INTO reservas_das_copias (alvo, codigo) VALUES (?, 'x')`);
    for (let i = 0; i < 1005; i++) inserir.run(`foto:2026/d1f3-${String(i).padStart(5, '0')}.jpg`);
    /** Entre a primeira e a segunda parte das reservas: a primeira reserva é solta e retomada, e volta com outro rowid */
    const soltarERetomar: Antes = (endereco) => {
      if (!ehASegunda('reservas_das_copias', endereco)) return;
      const { alvo } = banco.sqlite.prepare('SELECT alvo FROM reservas_das_copias ORDER BY rowid LIMIT 1').get() as { alvo: string };
      banco.sqlite.prepare('DELETE FROM reservas_das_copias WHERE alvo = ?').run(alvo);
      banco.sqlite.prepare(`INSERT INTO reservas_das_copias (alvo, codigo) VALUES (?, 'outro')`).run(alvo);
    };
    for (const [fluxo, copiar] of [
      ['no botão', async () => (await peloBotao(soltarERetomar)).copia as { tabelas: Tabelas }],
      ['no script', async () => (await peloScript(soltarERetomar)).arquivo!],
    ] as const) {
      it(`${fluxo}: o arquivo não leva as reservas, e restaura`, async () => {
        const arquivo = await copiar();
        expect(arquivo).not.toBeNull();
        expect(await restaurarCopia(banco.sqlite, arquivo)).toBeNull();
        expect(Object.keys(arquivo.tabelas)).not.toContain('reservas_das_copias');
        expect(Object.keys(arquivo.tabelas)).not.toContain('limpezas_do_teste');
      });
    }
  });

  // --- (b) A tabela criada entre a leitura dos gatilhos e a lista do índice ---
  describe('(b) a tabela criada entre a leitura dos gatilhos e a lista do índice', () => {
    let n = 0;
    /** Arma o caso: no próximo índice, as tabelas nascem logo depois da leitura dos gatilhos; pai e filho são gravados depois da parte dos pais */
    const armar = () => {
      const pai = `aa_d1f3_pai_${++n}`;
      const filho = `ab_d1f3_filho_${n}`;
      depoisDosGatilhos = () => {
        banco.sqlite.exec(`CREATE TABLE ${pai} (id TEXT PRIMARY KEY)`);
        banco.sqlite.exec(`CREATE TABLE ${filho} (id TEXT PRIMARY KEY, pai TEXT NOT NULL REFERENCES ${pai}(id))`);
      };
      let feito = false;
      const antes: Antes = (endereco) => {
        if (!feito && ehAPrimeira(filho, endereco)) {
          feito = true;
          banco.sqlite.exec('BEGIN');
          banco.sqlite.prepare(`INSERT INTO ${pai} (id) VALUES ('p')`).run();
          banco.sqlite.prepare(`INSERT INTO ${filho} (id, pai) VALUES ('f', 'p')`).run();
          banco.sqlite.exec('COMMIT');
        }
      };
      return { pai, filho, antes };
    };
    const conferir = async (arquivo: { tabelas: Tabelas } | null, filho: string, pai: string) => {
      expect(arquivo).not.toBeNull();
      expect(await restaurarCopia(banco.sqlite, arquivo!)).toBeNull();
      // O filho só vai com o pai
      expect(arquivo!.tabelas[filho]!.length).toBe(arquivo!.tabelas[pai]!.length);
    };
    it('no botão: o índice garante os gatilhos da tabela nova, e o arquivo restaura', async () => {
      const { pai, filho, antes } = armar();
      const { copia } = await peloBotao(antes);
      await conferir(copia, filho, pai);
    });
    it('no script: o mesmo, e o arquivo gravado restaura', async () => {
      const { pai, filho, antes } = armar();
      const { arquivo, erro } = await peloScript(antes);
      expect(erro).toBeNull();
      await conferir(arquivo, filho, pai);
    });
  });

  // --- (c) A cópia mensal só conta quando o arquivo chegou ao Drive ---
  describe('(c) a cópia mensal só conta quando chega ao Drive', () => {
    it('quatro tentativas descartadas não anotam nada, e nada é gravado', async () => {
      const antes = anotacoes();
      const { arquivos, erro, confirmacoes, indices } = await peloScript((endereco) => {
        if (ehAPrimeira('relatos', endereco)) gravarMemoriaComRelato();
      });
      expect(indices).toBe(4);
      expect(arquivos).toBe(0);
      expect(String(erro)).toContain('A cópia não veio');
      expect(confirmacoes).toEqual([]);
      expect(anotacoes()).toBe(antes);
    });
    it('a passada que vale anota uma vez, só pela confirmação, depois de gravar', async () => {
      const antes = anotacoes();
      const { arquivos, erro, confirmacoes } = await peloScript(() => undefined, 1);
      expect(erro).toBeNull();
      expect(arquivos).toBe(1);
      expect(confirmacoes).toHaveLength(1);
      expect(anotacoes()).toBe(antes + 1);
    });
    it('o botão da Administração nunca anota, e a confirmação só vale com o token e com a data de uma cópia recente', async () => {
      const antes = anotacoes();
      await peloBotao(() => undefined);
      await expect(pedir(`/api/copia?confirmar=${encodeURIComponent(new Date().toISOString())}`)).rejects.toThrow('404');
      for (const errada of ['', 'ontem', '2020-01-01T00:00:00.000Z', new Date(Date.now() + 3_600_000).toISOString()]) {
        expect((await peloMiddleware(`${ENDERECO}?confirmar=${encodeURIComponent(errada)}`)).status, errada).toBe(400);
      }
      expect(anotacoes()).toBe(antes);
    });
  });

  // --- A rede sozinha, com a marca desligada ---
  describe('a rede sozinha, com a marca desligada', () => {
    const comAMarcaDesligada = async <T>(fazer: () => Promise<T>): Promise<T> => {
      marcaDesligada = true;
      try {
        return await fazer();
      } finally {
        marcaDesligada = false;
      }
    };
    it('a régua vem no índice, tirada das pragmas: as chaves únicas e as estrangeiras de cada tabela', async () => {
      const indice = (await pedir('/api/copia')) as IndiceDaCopia;
      expect(indice.esquema.relatos!.estrangeiras).toContainEqual({ colunas: ['memoria_id'], tabela: 'memorias', referencias: ['id'] });
      expect(indice.esquema.memorias!.unicas).toContainEqual(['id']);
      expect(indice.esquema.envios!.unicas).toEqual([['codigo']]);
      expect(Object.keys(indice.esquema).sort()).toEqual(indice.indice.map((t) => t.tabela).sort());
      // Um índice único com condição fica de fora (a marca cobre essas tabelas)
      expect(indice.esquema.relatos!.unicas.flat()).not.toContain('situacao');
    });
    it('conferirCopia acha a chave repetida e a estrangeira sem o alvo, e aceita o que restaura', () => {
      const esquema = { pai: { unicas: [['id']], estrangeiras: [] }, filho: { unicas: [['id'], ['a', 'b']], estrangeiras: [{ colunas: ['pai'], tabela: 'pai', referencias: ['id'] }] } };
      const ok = { tabelas: { pai: [{ id: 1 }], filho: [{ id: 'x', pai: '1', a: 1, b: null }, { id: 'y', pai: null, a: 1, b: null }] } };
      expect(conferirCopia(ok, esquema)).toBeNull();
      expect(conferirCopia({ tabelas: { ...ok.tabelas, pai: [{ id: 1 }, { id: '1' }] } }, esquema)).toContain('aparece duas vezes');
      expect(conferirCopia({ tabelas: { ...ok.tabelas, filho: [{ id: 'x', pai: 2, a: 1, b: 2 }] } }, esquema)).toContain('não tem essa linha');
      expect(conferirCopia({ tabelas: { ...ok.tabelas, filho: [{ id: 'x', a: 1, b: 2 }, { id: 'z', a: 1, b: 2 }] } }, esquema)).toContain('aparece duas vezes');
    });
    for (const fluxo of ['no botão', 'no script'] as const) {
      it(`${fluxo}: a memória e o relato gravados no meio, uma vez só: a rede descarta a passada, e a seguinte restaura`, async () => {
        let feito = false;
        const antes: Antes = (endereco) => {
          if (!feito && ehAPrimeira('relatos', endereco)) {
            feito = true;
            gravarMemoriaComRelato();
          }
        };
        const r = await comAMarcaDesligada(async () => (fluxo === 'no botão' ? { ...(await peloBotao(antes)), arquivo: null } : { ...(await peloScript(antes)), copia: null }));
        const arquivo = (r.copia ?? r.arquivo) as { tabelas: Tabelas };
        expect(r.indices).toBe(2);
        expect(await restaurarCopia(banco.sqlite, arquivo)).toBeNull();
      });
      it(`${fluxo}: com o arquivo errado em todas as passadas, nada é gravado nem baixado`, async () => {
        const antes: Antes = (endereco) => {
          if (ehAPrimeira('relatos', endereco)) gravarMemoriaComRelato();
        };
        if (fluxo === 'no botão') {
          await expect(comAMarcaDesligada(() => peloBotao(antes))).rejects.toThrow(AcervoMudouNaCopia);
          await expect(comAMarcaDesligada(() => peloBotao(antes))).rejects.toThrow(/não tem essa linha/);
        } else {
          const antesDasAnotacoes = anotacoes();
          const { arquivos, erro, confirmacoes } = await comAMarcaDesligada(() => peloScript(antes));
          expect(arquivos).toBe(0);
          expect(String(erro)).toContain('A cópia não veio');
          expect(String(erro)).toContain('não tem essa linha');
          expect(confirmacoes).toEqual([]);
          expect(anotacoes()).toBe(antesDasAnotacoes);
        }
      });
    }
    // Uma chave repetida que a marca não vê: envios é tabela de registro, e o mesmo código apagado e gravado de
    // novo entre duas partes dela voltaria com outro rowid
    for (const fluxo of ['no botão', 'no script'] as const) {
      it(`${fluxo}: o mesmo código de envio apagado e gravado de novo entre as partes: a rede refaz, e o arquivo restaura`, async () => {
        const inserir = banco.sqlite.prepare(`INSERT OR IGNORE INTO envios (codigo) VALUES (?)`);
        for (let i = 0; i < 1005; i++) inserir.run(`d1f3-envio-${String(i).padStart(5, '0')}`);
        let vezes = 0;
        // O código da primeira página: o de menor rowid agora
        const primeiro = (banco.sqlite.prepare('SELECT codigo FROM envios ORDER BY rowid LIMIT 1').get() as { codigo: string }).codigo;
        const antes: Antes = (endereco) => {
          if (vezes === 0 && ehASegunda('envios', endereco)) {
            vezes++;
            banco.sqlite.prepare(`DELETE FROM envios WHERE codigo = ?`).run(primeiro);
            banco.sqlite.prepare(`INSERT INTO envios (codigo) VALUES (?)`).run(primeiro);
          }
        };
        const r = fluxo === 'no botão' ? { ...(await peloBotao(antes)), arquivo: null } : { ...(await peloScript(antes)), copia: null };
        const arquivo = (r.copia ?? r.arquivo) as { tabelas: Tabelas };
        expect(vezes).toBe(1);
        expect(r.indices).toBe(2);
        expect(await restaurarCopia(banco.sqlite, arquivo)).toBeNull();
      });
    }
  });
});
