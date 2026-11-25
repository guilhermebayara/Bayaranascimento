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
      // O som ligado de antes ainda pede um gesto: até lá, a página fica parada além da janela
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
