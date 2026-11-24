// A cópia do acervo em partes (sessão D1e, decisão do Gui de 23/11/2026; src/lib/copia-em-partes.ts e
// src/lib/servidor/copia.ts). Regras que não podem falhar:
// - juntar as partes dá exatamente a cópia de antes: as mesmas tabelas, com as mesmas linhas, de todas as tabelas;
// - cada parte é pequena (no máximo linhasPorParte linhas) e sai sem recuo;
// - o índice só diz as tabelas e quantas linhas cada uma tem, e não tem a chave "tabelas" (o script antigo do
//   Drive guardaria o índice como se fosse a cópia);
// - quem não pode pedir a cópia é recusado no índice e em cada parte, e o nome da tabela só vale se ela existe;
// - o script do Drive (scripts/copia-no-drive.gs), rodando de verdade numa caixa de areia, pede as partes pelo
//   middleware com o token de serviço, junta e grava um arquivo só; uma parte que falha é pedida de novo, e se
//   ainda falhar nada é gravado; a anotação da cópia mensal só acontece na última parte.
// Roda as rotas e o middleware de verdade, num SQLite em memória (testes/apoio/d1.ts).
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import { baixarCopiaEmPartes, juntarPartes, linhasPorParte, nomeDoArquivoDaCopia, partesPrevistas, type IndiceDaCopia, type ParteDaCopia } from '../src/lib/copia-em-partes';

const comSqlite = await temSqlite();
// O nome do módulo fica numa variável porque o projeto não tem os tipos do Node
const fs = 'node:fs';
const vmNome = 'node:vm';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: string, codificacao: string) => string };
const vm = (await import(/* @vite-ignore */ vmNome)) as { runInNewContext: (codigo: string, caixa: Record<string, unknown>) => unknown };

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
vi.mock('astro:middleware', () => ({ defineMiddleware: <T>(f: T) => f }));
// O token de serviço da cópia mensal: na produção, o Cloudflare Access confere o par e o site confere o token
// assinado (ehServicoDeCopia). Aqui, o pedido com o Client ID de teste vale como o serviço.
vi.mock('../src/lib/servidor/acesso', async (original) => {
  const real = await original<typeof import('../src/lib/servidor/acesso')>();
  return { ...real, ehServicoDeCopia: async (request: Request) => request.headers.get('CF-Access-Client-Id') === 'servico-de-teste' };
});
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('a cópia do acervo em partes', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const copia = await import('../src/lib/servidor/copia');
  const rota = await import('../src/pages/api/copia');
  const { onRequest } = await import('../src/middleware');
  const { noPedido } = await import('../src/lib/servidor/ambiente');

  // Linhas a mais em duas tabelas, para elas virem em várias páginas: uma de linhas curtas e uma com texto
  const curtas = linhasPorParte('envios') * 2 + 7;
  const inserirEnvio = banco.sqlite.prepare(`INSERT INTO envios (codigo, em) VALUES (?, datetime('now'))`);
  for (let i = 0; i < curtas; i++) inserirEnvio.run(`parte-${String(i).padStart(5, '0')}`);
  const comTexto = linhasPorParte('versoes') + 3;
  const inserirVersao = banco.sqlite.prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('memoria', 'parte', ?, 'gui')`);
  for (let i = 0; i < comTexto; i++) inserirVersao.run(JSON.stringify({ titulo: `Versão ${i} com "aspas", acentuação e\nquebra de linha` }));
  // Uma linha apagada no meio: a página seguinte continua depois do buraco
  banco.sqlite.prepare(`DELETE FROM envios WHERE codigo = 'parte-01000'`).run();

  const gui = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };
  const elizete = { pessoa: 'elizete', nome: 'Elizete', admin: false, nucleos: [] };
  /** A rota de verdade, como um administrador ou não */
  const pedir = async (endereco: string, usuario = gui) => {
    const url = new URL(endereco, 'http://localhost');
    const resposta = await noPedido(new Request(url), () => rota.GET({ locals: { usuario }, url, request: new Request(url) } as never));
    return { status: resposta.status, texto: await resposta.text() };
  };
  const buscarComo = (usuario = gui) => async (endereco: string) => {
    const r = await pedir(endereco, usuario);
    if (r.status !== 200) throw new Error(`Resposta ${r.status}`);
    return JSON.parse(r.texto);
  };

  /** A cópia de antes: SELECT * de cada tabela, do jeito que montarCopia fazia num lote só */
  const copiaDeAntes = () => {
    // A marca da cópia (item 1 da revisão D1f) não faz parte do acervo, nem a reserva das cópias e a faxina das
    // prévias (D1f3): ficam fora, e o arquivo tem as outras tabelas de antes
    const nomes = (banco.sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT IN ('marca_da_copia', 'reservas_das_copias', 'limpezas_do_teste') ORDER BY name`).all() as { name: string }[]).map((t) => t.name);
    return Object.fromEntries(nomes.map((t) => [t, banco.sqlite.prepare(`SELECT * FROM "${t}"`).all() as Record<string, unknown>[]]));
  };
  /** As linhas de uma tabela, em ordem fixa, para comparar sem depender da ordem de leitura */
  const emOrdem = (linhas: Record<string, unknown>[]) => linhas.map((l) => JSON.stringify(l)).sort();

  it('juntar as partes dá exatamente a cópia de antes, com as mesmas linhas de todas as tabelas', async () => {
    const antes = copiaDeAntes();
    const juntada = await baixarCopiaEmPartes(buscarComo());
    expect(Object.keys(juntada.tabelas)).toEqual(Object.keys(antes));
    for (const [tabela, linhas] of Object.entries(antes)) expect(emOrdem(juntada.tabelas[tabela]!), tabela).toEqual(emOrdem(linhas));
    // As colunas de cada linha, na ordem do banco, como antes
    expect(Object.keys(juntada.tabelas.integrantes![0]!)).toEqual(Object.keys(antes.integrantes![0]!));
    expect(juntada.tabelas.envios!.length).toBe(curtas - 1);
    // O mesmo formato de sempre: a marca, a data, o banco e as tabelas
    expect(Object.keys(juntada)).toEqual(['acervo', 'gerada_em', 'banco', 'tabelas']);
    expect(juntada.acervo).toBe('Bayara Nascimento');
    expect(Object.keys(juntada.banco).sort()).toEqual(['aviso_a_partir_de', 'limite_do_plano', 'passou_do_aviso', 'tamanho_em_bytes']);
    // E é o que o servidor monta para os testes e o espelho
    const noServidor = await noPedido(new Request('http://localhost/'), () => copia.montarCopia());
    for (const [tabela, linhas] of Object.entries(antes)) expect(emOrdem(noServidor.tabelas[tabela]!), tabela).toEqual(emOrdem(linhas));
  });

  it('cada parte tem no máximo linhasPorParte linhas, sai sem recuo e diz onde continuar', async () => {
    const indice = (await buscarComo()('/api/copia')) as IndiceDaCopia;
    let pedidos = 0;
    for (const { tabela, linhas } of indice.indice) {
      let depois: number | null = null;
      let somadas = 0;
      for (;;) {
        const r = await pedir(`/api/copia?tabela=${encodeURIComponent(tabela)}${depois === null ? '' : `&depois=${depois}`}`);
        pedidos++;
        expect(r.status).toBe(200);
        expect(r.texto).not.toMatch(/\n/);
        const parte = JSON.parse(r.texto) as ParteDaCopia;
        expect(parte.linhas.length).toBeLessThanOrEqual(linhasPorParte(tabela));
        expect(parte.colunas).not.toContain('__linha_da_copia');
        somadas += parte.linhas.length;
        if (parte.proxima === null) break;
        depois = parte.proxima;
      }
      expect(somadas, tabela).toBe(linhas);
    }
    // As tabelas grandes vêm em várias páginas, e o índice prevê quantas
    expect(pedidos).toBe(partesPrevistas(indice, linhasPorParte));
    expect(pedidos).toBe(indice.indice.length + 3);
  });

  it('o índice só diz as tabelas e quantas linhas cada uma tem, sem a chave "tabelas"', async () => {
    const r = await pedir('/api/copia');
    expect(r.status).toBe(200);
    expect(r.texto).not.toContain('"tabelas"');
    const indice = JSON.parse(r.texto) as IndiceDaCopia;
    expect(Object.keys(indice)).toEqual(['acervo', 'gerada_em', 'marca', 'banco', 'indice', 'esquema']);
    expect(typeof indice.marca).toBe('number');
    for (const item of indice.indice) expect(Object.keys(item)).toEqual(['tabela', 'linhas']);
    expect(indice.indice.map((t) => t.tabela)).toEqual(Object.keys(copiaDeAntes()));
  });

  it('quem não administra é recusado no índice e em cada parte, e não lê nada', async () => {
    const indice = (await buscarComo()('/api/copia')) as IndiceDaCopia;
    expect((await pedir('/api/copia', elizete)).status).toBe(403);
    for (const { tabela } of indice.indice) {
      const r = await pedir(`/api/copia?tabela=${encodeURIComponent(tabela)}`, elizete);
      expect(r.status, tabela).toBe(403);
      expect(r.texto).not.toContain('colunas');
    }
    expect((await pedir('/api/copia?tabela=envios&depois=10', elizete)).status).toBe(403);
    await expect(baixarCopiaEmPartes(buscarComo(elizete), undefined, async () => undefined)).rejects.toThrow('403');
  });

  it('só vale o nome de uma tabela do índice, e o "depois" só aceita número', async () => {
    expect((await pedir('/api/copia?tabela=nao_existe')).status).toBe(404);
    expect((await pedir(`/api/copia?tabela=${encodeURIComponent('integrantes" --')}`)).status).toBe(404);
    expect((await pedir(`/api/copia?tabela=${encodeURIComponent('integrantes; DELETE FROM integrantes')}`)).status).toBe(404);
    expect((await pedir('/api/copia?tabela=sqlite_master')).status).toBe(404);
    expect((await pedir('/api/copia?tabela=envios&depois=1 OR 1=1')).status).toBe(400);
    expect((await pedir('/api/copia?tabela=envios&depois=')).status).toBe(400);
    expect(banco.sqlite.prepare('SELECT COUNT(*) AS n FROM integrantes').get()).not.toEqual({ n: 0 });
  });

  it('no navegador: o andamento conta as partes, e uma parte que falha é pedida de novo', async () => {
    const real = buscarComo();
    let falhou = false;
    const andamento: [number, number][] = [];
    const juntada = await baixarCopiaEmPartes(
      async (endereco) => {
        if (endereco.includes('tabela=envios&depois') && !falhou) {
          falhou = true;
          throw new Error('Resposta 503');
        }
        return real(endereco);
      },
      (feitas, total) => andamento.push([feitas, total]),
      async () => undefined,
    );
    expect(falhou).toBe(true);
    expect(juntada.tabelas.envios!.length).toBe(curtas - 1);
    expect(andamento[0]![0]).toBe(0);
    expect(andamento.at(-1)![0]).toBe(andamento.at(-1)![1]);
    expect(andamento.every(([feitas, total]) => feitas <= total)).toBe(true);
    // Três falhas seguidas na mesma parte: nada é devolvido pela metade
    await expect(
      baixarCopiaEmPartes(
        async (endereco) => {
          if (endereco.includes('tabela=versoes')) throw new Error('Resposta 503');
          return real(endereco);
        },
        undefined,
        async () => undefined,
      ),
    ).rejects.toThrow('503');
  });

  it('o nome do arquivo é o de sempre, com o dia de São Paulo', () => {
    expect(nomeDoArquivoDaCopia('2026-12-01T05:00:00.000Z')).toBe('acervo-2026-12-01.json');
    expect(nomeDoArquivoDaCopia('2026-12-01T02:00:00.000Z')).toBe('acervo-2026-11-30.json');
    expect(() => juntarPartes({ acervo: 'Bayara Nascimento', gerada_em: '', banco: {} as never, indice: [] }, [{ acervo: 'Bayara Nascimento', tabela: 'x', colunas: [], linhas: [], proxima: null }])).toThrow('não está no índice');
  });

  describe('o script do Drive (scripts/copia-no-drive.gs), rodando de verdade', () => {
    const CABECALHOS = { 'CF-Access-Client-Id': 'servico-de-teste', 'CF-Access-Client-Secret': 'segredo-de-teste' };
    /** Um pedido pelo middleware de verdade, como o Access entrega o do script */
    const peloMiddleware = async (endereco: string, cabecalhos: Record<string, string> = CABECALHOS) => {
      const request = new Request(endereco, { headers: cabecalhos });
      const contexto = { request, url: new URL(request.url), isPrerendered: false, locals: {} as Record<string, unknown>, rewrite: () => new Response('') };
      const resposta = await (onRequest as unknown as (c: typeof contexto, p: () => Promise<Response>) => Promise<Response>)(contexto, async () => new Response('a página', { status: 200 }));
      return { status: resposta.status, texto: await resposta.text() };
    };
    const anotacoes = () => (banco.sqlite.prepare('SELECT COUNT(*) AS n FROM copias_mensais').get() as { n: number }).n;
    const ENDERECO = 'https://memorias.bayara.com.br/api/copia';

    /**
     * O Apps Script pede de forma síncrona; o middleware responde de forma assíncrona. Então as respostas são
     * pedidas antes, na ordem em que o script vai pedir, e o script roda depois, lendo delas.
     */
    const respostasDoServidor = async () => {
      const respostas = new Map<string, { status: number; texto: string }>();
      const indice = await peloMiddleware(ENDERECO);
      respostas.set(ENDERECO, indice);
      for (const { tabela } of (JSON.parse(indice.texto) as IndiceDaCopia).indice) {
        let depois: number | null = null;
        for (;;) {
          const endereco = `${ENDERECO}?tabela=${encodeURIComponent(tabela)}${depois === null ? '' : `&depois=${depois}`}`;
          const r = await peloMiddleware(endereco);
          respostas.set(endereco, r);
          const parte = JSON.parse(r.texto) as ParteDaCopia;
          if (parte.proxima === null) break;
          depois = parte.proxima;
        }
      }
      return respostas;
    };

    /** Roda o script numa caixa de areia com o Google de mentira. `responder` decide cada resposta. */
    const rodarScript = (responder: (endereco: string, cabecalhos: Record<string, string>) => { status: number; texto: string }) => {
      const confirmacoes: string[] = [];
      const arquivos: { nome: string; texto: string; tipo: string }[] = [];
      const pedidos: string[] = [];
      const esperas: number[] = [];
      const caixa = {
        PropertiesService: { getScriptProperties: () => ({ getProperty: (nome: string) => ({ CLIENT_ID: 'servico-de-teste', CLIENT_SECRET: 'segredo-de-teste' })[nome] ?? null }) },
        UrlFetchApp: {
          fetch: (endereco: string, opcoes: { headers: Record<string, string>; followRedirects: boolean; muteHttpExceptions: boolean }) => {
            expect(opcoes.followRedirects).toBe(false);
            pedidos.push(endereco);
            // A confirmação depois de gravar (D1f3): anotada pelo middleware de verdade depois que o script termina
            if (endereco.includes('?confirmar=')) {
              confirmacoes.push(endereco);
              return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ acervo: 'Bayara Nascimento', anotada: true }) };
            }
            const r = responder(endereco, opcoes.headers);
            return { getResponseCode: () => r.status, getContentText: () => r.texto };
          },
        },
        DriveApp: {
          getFoldersByName: (nome: string) => {
            expect(nome).toBe('Acervo Bayara Nascimento, cópias');
            return { hasNext: () => true, next: () => ({ createFile: (nomeDoArquivo: string, texto: string, tipo: string) => arquivos.push({ nome: nomeDoArquivo, texto, tipo }) }) };
          },
          createFolder: () => {
            throw new Error('a pasta já existe');
          },
        },
        Utilities: { sleep: (ms: number) => esperas.push(ms), formatDate: () => '2026-12-01' },
        ScriptApp: {},
      };
      let erro: unknown = null;
      try {
        vm.runInNewContext(`${readFileSync('scripts/copia-no-drive.gs', 'utf8')}\nfazerCopia();`, caixa);
      } catch (e) {
        erro = e;
      }
      return { arquivos, pedidos, esperas, erro, confirmacoes };
    };

    it('pede o índice e as partes com o token de serviço, junta e grava um arquivo só, igual à cópia de antes; anota só na confirmação depois de gravar', async () => {
      const antes = anotacoes();
      // O índice e as partes, até a última, não anotam (D1f3): só a confirmação que o script manda depois de gravar
      const respostas = await respostasDoServidor();
      expect(anotacoes()).toBe(antes);
      const { arquivos, pedidos, erro, confirmacoes } = rodarScript((endereco, cabecalhos) => {
        expect(cabecalhos).toEqual(CABECALHOS);
        return respostas.get(endereco) ?? { status: 404, texto: '' };
      });
      expect(erro).toBeNull();
      // Depois de todas as partes, o arquivo gravado e, por último, a confirmação, que é quem anota
      expect(pedidos).toEqual([...respostas.keys(), ...confirmacoes]);
      expect(confirmacoes).toHaveLength(1);
      expect(confirmacoes[0]).toContain(encodeURIComponent(JSON.parse(respostas.get(ENDERECO)!.texto).gerada_em));
      expect((await peloMiddleware(confirmacoes[0]!)).status).toBe(200);
      expect(anotacoes()).toBe(antes + 1);
      expect(arquivos).toHaveLength(1);
      expect(arquivos[0]!.nome).toBe('acervo-2026-12-01.json');
      expect(arquivos[0]!.tipo).toBe('application/json');
      const gravada = JSON.parse(arquivos[0]!.texto) as { acervo: string; banco: unknown; tabelas: Record<string, Record<string, unknown>[]> };
      expect(Object.keys(gravada)).toEqual(['acervo', 'gerada_em', 'banco', 'tabelas']);
      const deAntes = copiaDeAntes();
      expect(Object.keys(gravada.tabelas)).toEqual(Object.keys(deAntes));
      for (const [tabela, linhas] of Object.entries(deAntes)) {
        // A anotação desta rodada entrou depois das respostas: a tabela dela fica de fora da comparação
        if (tabela === 'copias_mensais') continue;
        expect(emOrdem(gravada.tabelas[tabela]!), tabela).toEqual(emOrdem(linhas));
      }
      // Sem recuo: um arquivo menor
      expect(arquivos[0]!.texto).not.toMatch(/\n {2}"/);
    });

    it('sem o token, o middleware não entrega nada da cópia ao script', async () => {
      const semToken = await peloMiddleware(ENDERECO, {});
      expect(semToken.texto).not.toContain('"indice"');
      const parte = await peloMiddleware(`${ENDERECO}?tabela=integrantes`, { 'CF-Access-Client-Id': 'outro' });
      expect(parte.texto).not.toContain('"colunas"');
    });

    it('uma parte que falha é pedida de novo; se falhar três vezes, nada é gravado e o script falha', async () => {
      const respostas = await respostasDoServidor();
      const umaParte = [...respostas.keys()].find((e) => e.includes('tabela=envios&depois='))!;
      let falhas = 0;
      const comUmaFalha = rodarScript((endereco) => {
        if (endereco === umaParte && falhas < 2) {
          falhas++;
          return { status: 503, texto: 'error code: 1102' };
        }
        return respostas.get(endereco)!;
      });
      expect(comUmaFalha.erro).toBeNull();
      expect(comUmaFalha.arquivos).toHaveLength(1);
      expect(comUmaFalha.esperas).toEqual([2000, 4000]);
      expect(JSON.parse(comUmaFalha.arquivos[0]!.texto).tabelas.envios).toHaveLength(curtas - 1);

      const semAParte = rodarScript((endereco) => (endereco === umaParte ? { status: 503, texto: 'error code: 1102' } : respostas.get(endereco)!));
      expect(semAParte.arquivos).toEqual([]);
      expect(String(semAParte.erro)).toContain('A cópia não veio');
      expect(semAParte.pedidos.filter((e) => e === umaParte)).toHaveLength(3);

      // Uma parte que não é da cópia (a página de login, por exemplo) também não é gravada
      const login = rodarScript((endereco) => (endereco.includes('tabela=versoes') ? { status: 200, texto: '<html>Entrar</html>' } : respostas.get(endereco)!));
      expect(login.arquivos).toEqual([]);
      expect(String(login.erro)).toContain('A cópia não veio');
    });

    it('com o site de antes, que manda a cópia inteira de uma vez, guarda como veio; o aviso do banco continua depois de gravar', async () => {
      const inteira = { acervo: 'Bayara Nascimento', gerada_em: '2026-11-30T06:00:00.000Z', banco: { tamanho_em_bytes: 310_000_000, aviso_a_partir_de: 300_000_000, limite_do_plano: 500_000_000, passou_do_aviso: true }, tabelas: { integrantes: [{ id: 'gui' }] } };
      const texto = JSON.stringify(inteira, null, 2);
      const { arquivos, pedidos, erro } = rodarScript(() => ({ status: 200, texto }));
      expect(pedidos).toEqual([ENDERECO]);
      expect(arquivos).toHaveLength(1);
      expect(arquivos[0]!.texto).toBe(texto);
      expect(String(erro)).toContain('310 MB');
    });
  });
});
