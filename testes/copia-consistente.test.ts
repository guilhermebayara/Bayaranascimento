// A cópia do acervo sempre restaura, mesmo com gravações no meio das partes (item 1 da revisão D1f, 24/11/2026;
// src/lib/servidor/copia.ts, src/lib/copia-em-partes.ts e scripts/copia-no-drive.gs).
//
// O caso da revisão: uma memória e o relato dela gravados entre a última parte de `memorias` e a primeira de
// `relatos`. O arquivo juntado levava o relato sem a memória, e a restauração falhava na chave estrangeira.
// Regras que não podem falhar:
// - o arquivo gravado no Drive e o baixado pelo botão da Administração restauram, com gravação no meio;
// - com gravação em todas as tentativas, nada é gravado nem devolvido, e o script falha com o aviso de sempre;
// - o que lê o arquivo (a restauração e o espelho) aceita o resultado.
// Roda as rotas e o middleware de verdade, num SQLite em memória (testes/apoio/d1.ts).
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import { restaurarCopia } from './apoio/restaurar';
import { baixarCopiaEmPartes, type IndiceDaCopia, type ParteDaCopia } from '../src/lib/copia-em-partes';
import { espelhar } from '../src/lib/espelho';

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

describe.skipIf(!comSqlite)('a cópia do acervo restaura mesmo com gravações no meio das partes', async () => {
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
  let gravadas = 0;
  /** Uma memória nova e o relato dela, num lote só, como o site grava */
  const gravarMemoriaComRelato = () => {
    gravadas++;
    const id = `d1f-no-meio-${gravadas}`;
    banco.sqlite.exec('BEGIN');
    banco.sqlite.prepare(`INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por) VALUES (?, 'Gravada no meio da cópia', 1999, ?, 'todos', 'publicada', 'gui')`).run(id, tipo);
    banco.sqlite.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, publicado_em) VALUES (?, 'gui', 'gui', 'O relato dela.', 'publicada', datetime('now'))`).run(id);
    banco.sqlite.exec('COMMIT');
    return id;
  };
  /** A memória e o relato estão os dois no arquivo, ou nenhum dos dois */
  const juntosOuNenhum = (tabelas: Record<string, Record<string, unknown>[]>, id: string) => {
    const memoria = tabelas.memorias!.some((m) => m.id === id);
    const relato = tabelas.relatos!.some((r) => r.memoria_id === id);
    expect(relato, `${id}: o relato só entra com a memória`).toBe(memoria);
    return memoria;
  };

  // O momento do caso da revisão: depois da última parte de memorias, antes da primeira de relatos
  const ehAPrimeiraDeRelatos = (endereco: string) => /[?&]tabela=relatos(&|$)/.test(endereco) && !/[?&]depois=/.test(endereco);

  describe('a marca de mudança (src/lib/servidor/marca-da-copia.ts)', () => {
    const tabelasDaCopia = () => (banco.sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> 'marca_da_copia'`).all() as { name: string }[]).map((t) => t.name);
    const gatilhosDe = (tabela: string) => (banco.sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = ? AND name LIKE 'marca\\_da\\_copia\\_%' ESCAPE '\\'`).all(tabela) as { name: string }[]).length;
    const marca = () => (banco.sqlite.prepare('SELECT valor FROM marca_da_copia WHERE id = 1').get() as { valor: number }).valor;
    const pedirIndice = async () => {
      const url = new URL('/api/copia', 'http://localhost');
      const r = await noPedido(new Request(url), () => rota.GET({ locals: { usuario: gui }, url, request: new Request(url) } as never));
      return { status: r.status, corpo: (await r.json()) as IndiceDaCopia & { erro?: string } };
    };

    it('toda tabela da cópia tem os três gatilhos, inclusive a das prévias criada fora das migrações', () => {
      expect(tabelasDaCopia()).toContain('limpezas_do_teste');
      for (const tabela of tabelasDaCopia()) expect(gatilhosDe(tabela), tabela).toBe(3);
    });

    it('gravar, mudar ou apagar em qualquer tabela sobe a marca; uma leitura não', () => {
      const antes = marca();
      banco.sqlite.prepare(`INSERT INTO envios (codigo) VALUES ('d1f-marca')`).run();
      expect(marca()).toBe(antes + 1);
      banco.sqlite.prepare(`UPDATE envios SET em = datetime('now') WHERE codigo = 'd1f-marca'`).run();
      expect(marca()).toBe(antes + 2);
      banco.sqlite.prepare(`DELETE FROM envios WHERE codigo = 'd1f-marca'`).run();
      expect(marca()).toBe(antes + 3);
      banco.sqlite.prepare('SELECT * FROM envios').all();
      expect(marca()).toBe(antes + 3);
    });

    it('uma tabela nova, ou refeita sem os gatilhos, ganha os dela no índice, antes de a marca ser lida', async () => {
      banco.sqlite.exec('CREATE TABLE d1f_tabela_nova (id TEXT PRIMARY KEY)');
      expect(gatilhosDe('d1f_tabela_nova')).toBe(0);
      const { status, corpo } = await pedirIndice();
      expect(status).toBe(200);
      expect(gatilhosDe('d1f_tabela_nova')).toBe(3);
      expect(corpo.indice.map((t) => t.tabela)).toContain('d1f_tabela_nova');
      expect(corpo.indice.map((t) => t.tabela)).not.toContain('marca_da_copia');
      const antes = marca();
      banco.sqlite.prepare(`INSERT INTO d1f_tabela_nova (id) VALUES ('a')`).run();
      expect(marca()).toBe(antes + 1);
      banco.sqlite.exec('DROP TABLE d1f_tabela_nova');
    });

    it('sem a linha da marca, o índice e as partes recusam, em vez de entregar uma cópia que não confere', async () => {
      const valor = marca();
      banco.sqlite.prepare('DELETE FROM marca_da_copia').run();
      try {
        const indice = await pedirIndice();
        expect(indice.status).toBe(500);
        expect(indice.corpo).not.toHaveProperty('indice');
        const url = new URL('/api/copia?tabela=integrantes', 'http://localhost');
        const parte = await noPedido(new Request(url), () => rota.GET({ locals: { usuario: gui }, url, request: new Request(url) } as never));
        expect(parte.status).toBe(500);
        expect(await parte.text()).not.toContain('colunas');
      } finally {
        banco.sqlite.prepare('INSERT INTO marca_da_copia (id, valor) VALUES (1, ?)').run(valor);
      }
    });
  });

  describe('no botão da Administração (baixarCopiaEmPartes)', () => {
    const pedir = async (endereco: string) => {
      const url = new URL(endereco, 'http://localhost');
      const resposta = await noPedido(new Request(url), () => rota.GET({ locals: { usuario: gui }, url, request: new Request(url) } as never));
      if (resposta.status !== 200) throw new Error(`Resposta ${resposta.status}`);
      return JSON.parse(await resposta.text());
    };

    it('uma memória e o relato gravados entre memorias e relatos: o arquivo restaura e leva os dois', async () => {
      let id = '';
      const juntada = await baixarCopiaEmPartes(
        async (endereco) => {
          if (!id && ehAPrimeiraDeRelatos(endereco)) id = gravarMemoriaComRelato();
          return pedir(endereco);
        },
        undefined,
        async () => undefined,
      );
      expect(id).not.toBe('');
      expect(await restaurarCopia(banco.sqlite, juntada)).toBeNull();
      // A sequência foi refeita depois da gravação: os dois entram
      expect(juntosOuNenhum(juntada.tabelas, id)).toBe(true);
      // E o espelho lê o mesmo formato
      expect(() => espelhar(juntada as never)).not.toThrow();
    });

    it('com gravação em todas as tentativas, nada é devolvido pela metade', async () => {
      let tentativas = 0;
      await expect(
        baixarCopiaEmPartes(
          async (endereco) => {
            if (ehAPrimeiraDeRelatos(endereco)) {
              tentativas++;
              gravarMemoriaComRelato();
            }
            return pedir(endereco);
          },
          undefined,
          async () => undefined,
        ),
      ).rejects.toThrow(/mudou durante a cópia/);
      expect(tentativas).toBeGreaterThan(1);
    });
  });

  describe('no script do Drive (scripts/copia-no-drive.gs), rodando de verdade', () => {
    const CABECALHOS = { 'CF-Access-Client-Id': 'servico-de-teste', 'CF-Access-Client-Secret': 'segredo-de-teste' };
    const ENDERECO = 'https://memorias.bayara.com.br/api/copia';
    const peloMiddleware = async (endereco: string) => {
      const request = new Request(endereco, { headers: CABECALHOS });
      const contexto = { request, url: new URL(request.url), isPrerendered: false, locals: {} as Record<string, unknown>, rewrite: () => new Response('') };
      const resposta = await (onRequest as unknown as (c: typeof contexto, p: () => Promise<Response>) => Promise<Response>)(contexto, async () => new Response('a página', { status: 200 }));
      return { status: resposta.status, texto: await resposta.text() };
    };

    /**
     * As respostas de uma passada inteira, na ordem em que o script pede (o Apps Script pede de forma síncrona,
     * então elas são pedidas antes). `noMeio` roda entre a última parte de memorias e a primeira de relatos.
     */
    const umaPassada = async (noMeio?: () => void) => {
      const respostas = new Map<string, { status: number; texto: string }>();
      const indice = await peloMiddleware(ENDERECO);
      respostas.set(ENDERECO, indice);
      for (const { tabela } of (JSON.parse(indice.texto) as IndiceDaCopia).indice) {
        let depois: number | null = null;
        for (;;) {
          const endereco = `${ENDERECO}?tabela=${encodeURIComponent(tabela)}${depois === null ? '' : `&depois=${depois}`}`;
          if (noMeio && ehAPrimeiraDeRelatos(endereco)) noMeio();
          const r = await peloMiddleware(endereco);
          respostas.set(endereco, r);
          const parte = JSON.parse(r.texto) as ParteDaCopia;
          if (parte.proxima === null) break;
          depois = parte.proxima;
        }
      }
      return respostas;
    };

    /** Roda o script; cada pedido do índice começa a passada seguinte da lista */
    const rodarScript = (passadas: Map<string, { status: number; texto: string }>[]) => {
      const arquivos: { nome: string; texto: string }[] = [];
      let passada = -1;
      const caixa = {
        PropertiesService: { getScriptProperties: () => ({ getProperty: (nome: string) => ({ CLIENT_ID: 'servico-de-teste', CLIENT_SECRET: 'segredo-de-teste' })[nome] ?? null }) },
        UrlFetchApp: {
          fetch: (endereco: string) => {
            if (endereco === ENDERECO) passada++;
            const r = passadas[passada]?.get(endereco) ?? { status: 404, texto: '' };
            return { getResponseCode: () => r.status, getContentText: () => r.texto };
          },
        },
        DriveApp: { getFoldersByName: () => ({ hasNext: () => true, next: () => ({ createFile: (nome: string, texto: string) => arquivos.push({ nome, texto }) }) }), createFolder: () => null },
        Utilities: { sleep: () => undefined, formatDate: () => '2026-12-01' },
        ScriptApp: {},
      };
      let erro: unknown = null;
      try {
        vm.runInNewContext(`${readFileSync('scripts/copia-no-drive.gs', 'utf8')}\nfazerCopia();`, caixa);
      } catch (e) {
        erro = e;
      }
      return { arquivos, erro, passadas: passada + 1 };
    };

    it('uma memória e o relato gravados entre memorias e relatos: o arquivo gravado restaura e leva os dois', async () => {
      let id = '';
      const primeira = await umaPassada(() => {
        id = gravarMemoriaComRelato();
      });
      const segunda = await umaPassada();
      const { arquivos, erro } = rodarScript([primeira, segunda]);
      expect(erro).toBeNull();
      expect(arquivos).toHaveLength(1);
      const gravada = JSON.parse(arquivos[0]!.texto) as { tabelas: Record<string, Record<string, unknown>[]> };
      expect(await restaurarCopia(banco.sqlite, gravada)).toBeNull();
      expect(juntosOuNenhum(gravada.tabelas, id)).toBe(true);
      expect(() => espelhar(gravada as never)).not.toThrow();
    });

    it('com gravação em todas as tentativas, nada é gravado e o script falha com o aviso de sempre', async () => {
      const passadas = [];
      for (let i = 0; i < 8; i++) passadas.push(await umaPassada(gravarMemoriaComRelato));
      const { arquivos, erro, passadas: feitas } = rodarScript(passadas);
      expect(arquivos).toEqual([]);
      expect(String(erro)).toContain('A cópia não veio');
      expect(feitas).toBeGreaterThan(1);
      expect(feitas).toBeLessThan(8);
    });
  });
});
