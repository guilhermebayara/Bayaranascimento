// A TV da sala no navegador (correções da revisão R-AB): o que só se vê com o script do palco rodando.
// - 1: o pedaço do palco buscado de antemão vale por pouco tempo (VALIDADE_DO_PEDACO). Vencido, ele é pedido de
//   novo à rota de uma memória antes de ir à tela, e a voz dele também; se a rota recusa (a memória foi
//   restringida entre a busca e a exibição), nada dela aparece nem toca. Dentro da janela, a passagem continua
//   sem pedir nada (o ganho da causa 6).
// - 2: na sala, "Limpar filtros" continua na sala.
// - 4: a porta da sala sem "m" abre no primeiro parágrafo da carta, e o "m" vai para o endereço.
// - 5: o ano inicial do filtro ("de") passa de memória em memória, e o "3 de 48" sai da ordem do servidor.
//
// Precisa do servidor local no ar, com o acervo de exemplo, e do Playwright instalado na máquina:
//   npm run dev -- --port 4400
//   SALA_SERVIDOR=http://localhost:4400 NODE_PATH=$(npm root -g) npx vitest run testes/sala-navegador.test.ts
// Sem SALA_SERVIDOR, o arquivo inteiro é pulado (o build do Cloudflare não tem servidor nem navegador). O relógio
// da página é o do Playwright (page.clock), para a janela vencer sem esperar 30 segundos. Nada grava no banco:
// a recusa da rota é simulada no navegador (page.route), como a rota responde a uma memória que não entra.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { VALIDADE_DO_PEDACO } from '../src/lib/sala';

const NODE_MODULE = 'node:module';
const B = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.SALA_SERVIDOR;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Pagina = any;

describe.skipIf(!B)('a TV da sala no navegador (revisão R-AB)', () => {
  let navegador: any;
  const abertos: any[] = [];

  beforeAll(async () => {
    const { createRequire } = (await import(/* @vite-ignore */ NODE_MODULE)) as { createRequire(de: string): (modulo: string) => any };
    const { chromium } = createRequire(import.meta.url)('playwright');
    navegador = await chromium.launch();
  }, 60_000);
  afterAll(async () => {
    for (const c of abertos) await c.close().catch(() => undefined);
    await navegador?.close();
  });

  /** Uma página como uma pessoa do "Ver como", com o relógio do Playwright e os pedidos anotados */
  async function abrir(pessoa: string, caminho: string, { som = false, largura = 1280, palco = true } = {}): Promise<Pagina> {
    const ctx = await navegador.newContext({ viewport: { width: largura, height: 720 } });
    abertos.push(ctx);
    await ctx.addCookies([{ name: 'como', value: pessoa, url: B }]);
    if (som) await ctx.addInitScript(() => localStorage.setItem('tv-som', '1'));
    const pagina = await ctx.newPage();
    await pagina.clock.install();
    pagina.pedidos = [] as string[];
    pagina.on('request', (pedido: any) => pagina.pedidos.push(pedido.url()));
    await pagina.goto(B + caminho);
    if (palco) await pagina.waitForSelector('[data-palco]');
    return pagina;
  }
  const ordemDe = async (pagina: Pagina): Promise<string[]> => JSON.parse(await pagina.locator('[data-ordem-da-tv]').textContent());
  const pedidosDoPedaco = (pagina: Pagina, id: string) => pagina.pedidos.filter((u: string) => u.includes('/explorar/palco') && new URL(u).searchParams.get('m') === id);
  const titulo = (pagina: Pagina) => pagina.locator('[data-palco] .palco__titulo').textContent();
  /** Simula a rota recusando a memória (como ela responde a uma memória restringida): o pedaço e a página inteira */
  async function recusar(pagina: Pagina, id: string) {
    await pagina.route(
      (url: URL) => url.pathname.startsWith('/explorar') && url.searchParams.get('m') === id,
      (rota: any) => (rota.request().url().includes('/explorar/palco') ? rota.fulfill({ status: 404, body: 'Não encontrada.' }) : rota.fulfill({ status: 200, contentType: 'text/html', body: '<p id="recusada">recusada</p>' })),
    );
  }
  async function esperarPedaco(pagina: Pagina, id: string) {
    await expect.poll(() => pedidosDoPedaco(pagina, id).length, { timeout: 15_000 }).toBeGreaterThan(0);
    await pagina.waitForLoadState('networkidle');
  }

  it('1: dentro da janela, a próxima entra sem pedir nada de novo (o ganho da busca de antemão continua)', async () => {
    const pagina = await abrir('elizete', '/explorar?ver=tv&ordem=antigas');
    const [, segunda] = await ordemDe(pagina);
    await esperarPedaco(pagina, segunda!);
    const antes = pedidosDoPedaco(pagina, segunda!).length;
    const esperado = await pagina.evaluate(async (m: string) => {
      const r = await fetch(`/explorar?ver=tv&ordem=antigas&m=${m}`);
      return new DOMParser().parseFromString(await r.text(), 'text/html').querySelector('.palco__titulo')?.textContent;
    }, segunda);
    await pagina.locator('[data-palco-depois]').first().click();
    await expect.poll(() => titulo(pagina)).toBe(esperado);
    expect(pedidosDoPedaco(pagina, segunda!).length).toBe(antes);
  }, 60_000);

  it('1: vencida a janela, a memória restringida entre a busca e a exibição não aparece', async () => {
    const pagina = await abrir('elizete', '/explorar?ver=tv&ordem=antigas');
    const [, segunda] = await ordemDe(pagina);
    await esperarPedaco(pagina, segunda!);
    const doPedaco = await pagina.evaluate(async (m: string) => {
      const r = await fetch(`/explorar?ver=tv&ordem=antigas&m=${m}`);
      return new DOMParser().parseFromString(await r.text(), 'text/html').querySelector('.palco__titulo')?.textContent;
    }, segunda);
    const antes = pedidosDoPedaco(pagina, segunda!).length;
    await recusar(pagina, segunda!);
    await pagina.clock.fastForward(VALIDADE_DO_PEDACO + 1000);
    await pagina.locator('[data-palco-depois]').first().click();
    // O pedaço foi pedido de novo, a rota recusou, e a memória não chegou à tela
    await expect.poll(() => pedidosDoPedaco(pagina, segunda!).length).toBeGreaterThan(antes);
    await pagina.waitForTimeout(1500);
    expect(await pagina.content()).not.toContain(`>${doPedaco}<`);
  }, 60_000);

  it('1: a voz de um pedaço vencido não toca sem a rota confirmar, e com a recusa não toca nunca', async () => {
    const MEMORIA = '1958-casamento-vivica-tonho';
    for (const recusada of [false, true]) {
      const pagina = await abrir('elizete', `/explorar?ver=tv&m=${MEMORIA}`, { som: true });
      expect(await pagina.locator('[data-palco][data-voz]').count()).toBe(1);
      await pagina.waitForLoadState('networkidle');
      // O som ligado de antes ainda pede um gesto: a primeira tentativa, sem gesto, não toca. Depois, a página
      // fica parada além da janela
      await pagina.clock.runFor(2500);
      await pagina.clock.fastForward(VALIDADE_DO_PEDACO + 1000);
      if (recusada) await recusar(pagina, MEMORIA);
      const marca = pagina.pedidos.length;
      // Desligar e ligar o som: o segundo toque é o gesto, e a voz do pedaço vencido só toca depois da rota
      await pagina.locator('[data-palco-som]').click();
      await pagina.locator('[data-palco-som]').click();
      await expect.poll(() => pagina.pedidos.slice(marca).some((u: string) => u.includes('/explorar/palco') && new URL(u).searchParams.get('m') === MEMORIA)).toBe(true);
      // O palco marca data-ouvindo enquanto a voz toca
      const ouviu = await pagina
        .waitForSelector('[data-palco][data-ouvindo]', { timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      if (recusada) {
        expect(ouviu, 'a voz da memória recusada não toca').toBe(false);
        expect(pagina.pedidos.slice(marca).filter((u: string) => u.includes('/audios/'))).toEqual([]);
        expect(await pagina.locator('[data-palco][data-voz]').count()).toBe(0);
        expect(await pagina.locator('[data-palco-voz]').count()).toBe(0);
      } else expect(ouviu, 'com a rota confirmando, a voz toca').toBe(true);
    }
  }, 90_000);

  it('R-AB2 1: o segundo áudio da fila só toca depois de a rota confirmar o pedaço vencido, e nunca com a recusa', async () => {
    const MEMORIA = '1958-casamento-vivica-tonho';
    const SEGUNDO = '/audios/exemplos/vo-vivica-chuva.m4a?segundo=1';
    for (const recusada of [false, true]) {
      const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
      abertos.push(ctx);
      await ctx.addCookies([{ name: 'como', value: 'elizete', url: B }]);
      await ctx.addInitScript(() => localStorage.setItem('tv-som', '1'));
      const pagina: Pagina = await ctx.newPage();
      await pagina.clock.install();
      pagina.pedidos = [] as string[];
      pagina.on('request', (pedido: any) => pagina.pedidos.push(pedido.url()));
      let recusar = false;
      // Um relato com dois áudios: o palco (a página e a rota de uma memória) passa a listar um segundo áudio
      await pagina.route(
        (url: URL) => url.pathname.startsWith('/explorar') && url.searchParams.get('m') === MEMORIA,
        async (rota: any) => {
          if (recusar && rota.request().url().includes('/explorar/palco')) return rota.fulfill({ status: 404, body: 'Não encontrada.' });
          const resposta = await rota.fetch();
          const html = (await resposta.text()).replace(/data-voz="([^"]*)"/, (_: string, valor: string) => {
            const audios = JSON.parse(valor.replaceAll('&quot;', '"'));
            return `data-voz="${JSON.stringify([...audios, { src: SEGUNDO, duracao: 11 }]).replaceAll('"', '&quot;')}"`;
          });
          return rota.fulfill({ response: resposta, body: html });
        },
      );
      await pagina.goto(`${B}/explorar?ver=tv&m=${MEMORIA}`);
      await pagina.waitForSelector('[data-palco][data-voz]');
      // O gesto liga o som: o primeiro áudio começa
      await pagina.locator('[data-palco-som]').click();
      await pagina.locator('[data-palco-som]').click();
      await pagina.waitForSelector('[data-palco][data-ouvindo]', { timeout: 8000 });
      // Enquanto ele toca, a janela vence e a memória é restringida
      await pagina.clock.fastForward(VALIDADE_DO_PEDACO + 1000);
      recusar = recusada;
      const marca = pagina.pedidos.length;
      // O primeiro áudio termina (uns 11 segundos de verdade)
      await pagina.waitForFunction(() => !document.querySelector('[data-palco][data-ouvindo]') || false, null, { timeout: 20_000 }).catch(() => undefined);
      await pagina.waitForTimeout(1500);
      const depois = pagina.pedidos.slice(marca);
      expect(depois.some((u: string) => u.includes('/explorar/palco') && new URL(u).searchParams.get('m') === MEMORIA), 'o pedaço foi pedido de novo antes do segundo áudio').toBe(true);
      const segundo = pagina.pedidos.some((u: string) => u.endsWith(SEGUNDO));
      if (recusada) {
        expect(segundo, 'com a recusa, o segundo áudio não toca').toBe(false);
        expect(await pagina.locator('[data-palco][data-ouvindo]').count()).toBe(0);
        expect(await pagina.locator('[data-palco][data-voz]').count()).toBe(0);
      } else expect(segundo, 'com a rota confirmando, o segundo áudio toca').toBe(true);
    }
  }, 120_000);

  it('R-AB2 2: com "Ler tudo" aberto, "Passar sozinho" espera, e o Esc volta à memória com o foco em "Ler tudo"', async () => {
    const pagina = await abrir('giovanna', '/explorar?ver=tv&sala=1&m=1999-chegada-da-giovanna&passar=8');
    expect(await pagina.locator('.palco__texto a[href^="/memorias/"]').count()).toBe(0);
    await pagina.locator('[data-palco-ler]').click();
    await pagina.waitForSelector('[data-palco][data-lendo]');
    await pagina.clock.fastForward(20_000);
    await pagina.waitForTimeout(500);
    expect(await pagina.locator('[data-palco][data-lendo]').count(), 'lendo, a memória não passa sozinha').toBe(1);
    expect(new URL(pagina.url()).searchParams.get('m')).toBe('1999-chegada-da-giovanna');
    await pagina.keyboard.press('Escape');
    await pagina.waitForFunction(() => !document.querySelector('[data-palco][data-lendo]'));
    expect(await pagina.evaluate(() => document.activeElement?.textContent?.trim())).toBe('Ler tudo');
    // De volta à memória, "Passar sozinho" volta a passar
    await pagina.clock.fastForward(9000);
    await expect.poll(() => new URL(pagina.url()).searchParams.get('m'), { timeout: 10_000 }).not.toBe('1999-chegada-da-giovanna');
  }, 60_000);

  // --- O portão da voz (correção 1 da revisão R-AB3) ------------------------------------------------
  const CASAMENTO = '1958-casamento-vivica-tonho';
  const SEGUNDO = '/audios/exemplos/vo-vivica-chuva.m4a?segundo=1';
  /**
   * Uma página com o som ligado de antes, o relógio do Playwright e cada .play() anotado (a fonte e de onde ele
   * começa). `rota` decide, a cada pedido da memória, o que a rota responde: 'real', 'sem-voz' (200 sem a lista de
   * vozes, como depois de o relato passar a esperar), 'recusa' (404) ou 'so-o-segundo'; `duas` põe um segundo áudio.
   */
  async function comVoz(pessoa: string, caminho: string, { duas = false } = {}) {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
    abertos.push(ctx);
    await ctx.addCookies([{ name: 'como', value: pessoa, url: B }]);
    await ctx.addInitScript(() => {
      localStorage.setItem('tv-som', '1');
      const w = window as unknown as { __tocou: { src: string; t: number }[] };
      w.__tocou = [];
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        w.__tocou.push({ src: this.src, t: this.currentTime });
        return original.call(this);
      };
    });
    const pagina: Pagina = await ctx.newPage();
    await pagina.clock.install();
    pagina.pedidos = [] as string[];
    pagina.on('request', (pedido: any) => pagina.pedidos.push(pedido.url()));
    const estado = { rota: 'real' as 'real' | 'sem-voz' | 'recusa' | 'so-o-segundo', atraso: 0 };
    await pagina.route(
      (url: URL) => url.pathname.startsWith('/explorar') && url.searchParams.get('m') === CASAMENTO,
      async (rota: any) => {
        const peca = rota.request().url().includes('/explorar/palco');
        if (peca && estado.atraso) await new Promise((ok) => setTimeout(ok, estado.atraso));
        if (peca && estado.rota === 'recusa') return rota.fulfill({ status: 404, body: 'Não encontrada.' });
        const resposta = await rota.fetch();
        let html = await resposta.text();
        if (duas || estado.rota === 'so-o-segundo')
          html = html.replace(/data-voz="([^"]*)"/, (_: string, valor: string) => {
            const audios = JSON.parse(valor.replaceAll('&quot;', '"'));
            const lista = peca && estado.rota === 'so-o-segundo' ? [{ src: SEGUNDO, duracao: 11 }] : [...audios, { src: SEGUNDO, duracao: 11 }];
            return `data-voz="${JSON.stringify(lista).replaceAll('"', '&quot;')}"`;
          });
        if (peca && estado.rota === 'sem-voz') html = html.replace(/ data-voz="[^"]*"/, '').replace(/<p class="palco__voz"[\s\S]*?<\/p>/, '');
        return rota.fulfill({ response: resposta, body: html });
      },
    );
    await pagina.goto(B + caminho);
    await pagina.waitForSelector('[data-palco]');
    const tocou = async (): Promise<{ src: string; t: number }[]> => pagina.evaluate(() => (window as unknown as { __tocou: { src: string; t: number }[] }).__tocou);
    const marcar = async () => (await tocou()).length;
    const vozes = async (desde: number) => (await tocou()).slice(desde).filter((x) => !x.src.startsWith('data:'));
    /** O gesto que liga o som: desligar e ligar no símbolo */
    const ligarOSom = async () => {
      await pagina.locator('[data-palco-som]').click();
      await pagina.locator('[data-palco-som]').click();
    };
    return { pagina, estado, marcar, vozes, ligarOSom };
  }
  const tocando = (pagina: Pagina, ms = 4000) =>
    pagina
      .waitForSelector('[data-palco][data-ouvindo]', { timeout: ms })
      .then(() => true)
      .catch(() => false);

  it('R-AB3 1: fechar "Ler tudo" depois de o relato passar a esperar não retoma a voz pausada', async () => {
    for (const restringido of [false, true]) {
      const { pagina, estado, marcar, vozes, ligarOSom } = await comVoz('giovanna', `/explorar?ver=tv&sala=1&m=${CASAMENTO}`);
      await ligarOSom();
      expect(await tocando(pagina), 'a voz começa').toBe(true);
      await pagina.locator('[data-palco-ler]').click();
      await pagina.waitForSelector('[data-palco][data-lendo]');
      expect(await pagina.locator('[data-palco][data-ouvindo]').count(), 'lendo, a voz pausa').toBe(0);
      if (restringido) estado.rota = 'sem-voz';
      await pagina.clock.fastForward(VALIDADE_DO_PEDACO + 1000);
      const marca = await marcar();
      await pagina.locator('[data-palco-voltar-da-leitura]').click();
      await pagina.waitForFunction(() => !document.querySelector('[data-palco][data-lendo]'));
      const ouviu = await tocando(pagina, 3000);
      if (restringido) {
        expect(ouviu, 'a voz do relato que passou a esperar não retoma').toBe(false);
        expect(await vozes(marca)).toEqual([]);
        expect(await pagina.locator('[data-palco-voz]').count(), 'a linha "A voz de …" sai').toBe(0);
      } else {
        expect(ouviu, 'com a voz ainda na lista, ela retoma').toBe(true);
        expect((await vozes(marca))[0]?.t, 'retoma de onde parou').toBeGreaterThan(0);
      }
    }
  }, 120_000);

  it('R-AB3 1: pausar enquanto a fila renova não faz o primeiro áudio recomeçar ao retomar', async () => {
    const { pagina, estado, marcar, vozes, ligarOSom } = await comVoz('elizete', `/explorar?ver=tv&m=${CASAMENTO}&passar=15`, { duas: true });
    await ligarOSom();
    expect(await tocando(pagina)).toBe(true);
    const primeiro = (await vozes(0))[0]!.src;
    // A janela vence durante o primeiro; a resposta pedida quando ele termina demora e lista só o segundo
    await pagina.clock.fastForward(VALIDADE_DO_PEDACO + 1000);
    estado.rota = 'so-o-segundo';
    estado.atraso = 4000;
    const pedidosAntes = pedidosDoPedaco(pagina, CASAMENTO).length;
    // O primeiro termina (uns 11 segundos de verdade), e a renovação sai
    await expect.poll(() => pedidosDoPedaco(pagina, CASAMENTO).length, { timeout: 20_000 }).toBeGreaterThan(pedidosAntes);
    // "Pausar" no meio da espera
    await pagina.locator('[data-palco-pausa]').click();
    await pagina.waitForTimeout(5000);
    const marca = await marcar();
    await pagina.locator('[data-palco-pausa]').click();
    await pagina.waitForTimeout(2000);
    const depois = await vozes(marca);
    expect(depois.some((x) => x.src === primeiro), 'o primeiro não recomeça').toBe(false);
    expect(depois.some((x) => x.src.endsWith(SEGUNDO)), 'o segundo, que continua na lista, toca').toBe(true);
  }, 120_000);

  it('R-AB3 1: ligar o som com uma voz que saiu da lista não toca nada, e a linha sai', async () => {
    const { pagina, estado, marcar, vozes, ligarOSom } = await comVoz('elizete', `/explorar?ver=tv&m=${CASAMENTO}`);
    // Sem gesto, a primeira tentativa não toca; a página fica parada além da janela, e o relato passa a esperar
    await pagina.clock.runFor(2500);
    await pagina.clock.fastForward(VALIDADE_DO_PEDACO + 1000);
    estado.rota = 'sem-voz';
    const marca = await marcar();
    await ligarOSom();
    await pagina.waitForTimeout(2500);
    expect(await vozes(marca), 'nenhuma voz toca').toEqual([]);
    expect(await pagina.locator('[data-palco-voz]').count()).toBe(0);
    expect(await pagina.locator('[data-palco][data-voz]').count()).toBe(0);
  }, 60_000);

  it('R-AB3 1: retomar depois de vencer passa pela rota: com a voz na lista, continua de onde parou; fora dela, não toca', async () => {
    for (const restringido of [false, true]) {
      const { pagina, estado, marcar, vozes, ligarOSom } = await comVoz('elizete', `/explorar?ver=tv&m=${CASAMENTO}&passar=15`);
      await ligarOSom();
      expect(await tocando(pagina)).toBe(true);
      await pagina.waitForTimeout(1500);
      await pagina.locator('[data-palco-pausa]').click();
      await pagina.clock.fastForward(VALIDADE_DO_PEDACO + 1000);
      if (restringido) estado.rota = 'sem-voz';
      const pedidosAntes = pedidosDoPedaco(pagina, CASAMENTO).length;
      const marca = await marcar();
      await pagina.locator('[data-palco-pausa]').click();
      await pagina.waitForTimeout(2500);
      expect(pedidosDoPedaco(pagina, CASAMENTO).length, 'a rota confirma antes de retomar').toBeGreaterThan(pedidosAntes);
      const depois = await vozes(marca);
      if (restringido) {
        expect(depois, 'fora da lista, nada toca').toEqual([]);
        expect(await pagina.locator('[data-palco-voz]').count()).toBe(0);
      } else {
        expect(depois.length).toBeGreaterThan(0);
        expect(depois[0]!.t, 'continua de onde parou').toBeGreaterThan(0.5);
      }
    }
  }, 120_000);

  it('R-AB3 2: a parte de "Ler tudo" buscada de antemão e vencida é pedida de novo, e a recusa não mostra a parte', async () => {
    const MEMORIA = '1999-chegada-da-giovanna';
    const pagina = await abrir('giovanna', `/explorar?ver=tv&sala=1&m=${MEMORIA}&ler=1`);
    await pagina.waitForSelector('.cena-da-leitura[data-parte="1"]');
    // A parte 2 foi buscada de antemão
    await expect.poll(() => pagina.pedidos.filter((u: string) => u.includes('/explorar/palco') && new URL(u).searchParams.get('ler') === '2').length, { timeout: 15_000 }).toBeGreaterThan(0);
    await pagina.waitForLoadState('networkidle');
    const antes = pagina.pedidos.filter((u: string) => new URL(u).searchParams.get('ler') === '2').length;
    await recusar(pagina, MEMORIA);
    await pagina.clock.fastForward(VALIDADE_DO_PEDACO + 1000);
    await pagina.locator('[data-palco-depois]').first().click();
    await expect.poll(() => pagina.pedidos.filter((u: string) => new URL(u).searchParams.get('ler') === '2').length).toBeGreaterThan(antes);
    await pagina.waitForTimeout(1500);
    expect(await pagina.locator('.cena-da-leitura[data-parte="2"]').count(), 'a parte 2 da memória restringida não aparece').toBe(0);
  }, 60_000);

  it('R-AB3 2: com "Ler tudo" aberto, o Esc volta à memória mesmo com "Só as fotos" guardado', async () => {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
    abertos.push(ctx);
    await ctx.addCookies([{ name: 'como', value: 'giovanna', url: B }]);
    await ctx.addInitScript(() => localStorage.setItem('tv-so-fotos', '1'));
    const pagina = await ctx.newPage();
    await pagina.goto(`${B}/explorar?ver=tv&sala=1&m=1999-chegada-da-giovanna&ler=1`);
    await pagina.waitForSelector('[data-palco][data-lendo]');
    expect(await pagina.locator('[data-palco][data-so-fotos]').count(), 'lendo, "Só as fotos" não vale').toBe(0);
    await pagina.keyboard.press('Escape');
    await pagina.waitForFunction(() => !document.querySelector('[data-palco][data-lendo]'), null, { timeout: 5000 });
    expect(new URL(pagina.url()).searchParams.get('ler')).toBeNull();
    expect(new URL(pagina.url()).searchParams.get('m')).toBe('1999-chegada-da-giovanna');
  }, 60_000);

  it('2: na sala, "Limpar filtros" continua na sala', async () => {
    const pagina = await abrir('giovanna', '/explorar?ver=tv&sala=1&de=1800&ate=1800', { palco: false });
    const limpar = pagina.getByRole('link', { name: 'Limpar filtros' });
    const href = new URL(await limpar.getAttribute('href'), B);
    expect(href.searchParams.get('sala')).toBe('1');
    await limpar.click();
    await pagina.waitForSelector('[data-palco] .palco__titulo');
    expect(new URL(pagina.url()).searchParams.get('sala')).toBe('1');
    expect(await pagina.locator('.palco__topo .rotulo').textContent()).toContain('só o que é aberto a toda a família');
  }, 60_000);

  it('4: a porta da sala sem "m" abre no primeiro parágrafo da carta, com o "m" no endereço', async () => {
    const pagina = await abrir('giovanna', '/explorar?ver=tv&sala=1&tema=natal&ordem=antigas&carta=1');
    await expect.poll(() => pagina.locator('.cena-da-carta__saudacao').textContent()).toBe('Oi, família,');
    expect(new URL(pagina.url()).searchParams.get('m')).toBe('carta-1');
  }, 60_000);

  it('5: o ano inicial do filtro passa de memória em memória, e o "3 de N" sai da ordem do servidor', async () => {
    const pagina = await abrir('elizete', '/explorar?ver=tv&de=1990&ordem=antigas');
    const ordem = await ordemDe(pagina);
    for (let n = 0; n < 2; n++) {
      const depois = await pagina.locator('[data-palco-depois]').first().getAttribute('href');
      await pagina.locator('[data-palco-depois]').first().click();
      await expect.poll(() => new URL(pagina.url()).searchParams.get('m')).toBe(new URL(depois, B).searchParams.get('m'));
    }
    expect(new URL(pagina.url()).searchParams.get('de')).toBe('1990');
    await expect.poll(() => pagina.locator('[data-palco-linha]').textContent()).toBe(` · 3 de ${ordem.length}`);
    // Os pedidos à rota não levam posição nem total
    for (const u of pagina.pedidos.filter((x: string) => x.includes('/explorar/palco'))) {
      const busca = new URL(u).searchParams;
      expect(busca.has('pos')).toBe(false);
      expect(busca.getAll('de')).toEqual(['1990']);
    }
  }, 60_000);
});
