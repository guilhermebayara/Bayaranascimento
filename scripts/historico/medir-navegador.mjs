// Mede o carregamento de cada tela no navegador (sessão M1, 22/11/2026; relatório em docs/desempenho/):
// LCP, CLS, FCP, o peso por tipo (HTML, CSS, JS, fontes, fotos), o que chega antes da primeira tela e,
// para cada foto, o tamanho servido contra o tamanho mostrado. Usa o Chromium do Playwright, com a rede
// e o processador do celular simulados pelo próprio Chrome (DevTools Protocol).
//
//   node scripts/historico/proxy-local.mjs &                 # HTTP/2 e Brotli na frente do servidor local
//   node scripts/historico/medir-navegador.mjs exemplo [https://127.0.0.1:4443]
//
// Contra uma prévia de teste: passe o endereço dela (sem login). Escreve docs/desempenho/dados/navegador-<rotulo>.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

// O Playwright vem instalado globalmente nas sessões (CLAUDE.md)
const require = createRequire(import.meta.url);
function playwright() {
  try {
    return require('playwright');
  } catch {
    return require(join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
}
const { chromium } = playwright();

const rotulo = process.argv[2] ?? 'exemplo';
const BASE = process.argv[3] ?? 'https://127.0.0.1:4443';
// Nunca na produção nem na homologação: só o computador e as prévias de teste
if (/^(memorias|homologa\.memorias)\.bayara\.com\.br$/.test(new URL(BASE).hostname)) {
  console.error('A medição roda no computador ou numa prévia de teste. Produção e homologação nunca.');
  process.exit(1);
}
const SO = process.env.SO ? new RegExp(process.env.SO) : null;
const PERFIS_PEDIDOS = process.env.PERFIS?.split(',');

// As redes: as do Lighthouse e do WebPageTest, por pedido (o Chrome soma a latência a cada pedido)
export const REDES = {
  '4g-lento': { latencia: 150, desce: 1.6e6, sobe: 750e3 },
  '3g': { latencia: 300, desce: 750e3, sobe: 250e3 },
  'wifi': { latencia: 40, desce: 20e6, sobe: 5e6 },
};
export const PERFIS = {
  'celular-4g': { largura: 390, altura: 844, escala: 3, celular: true, rede: '4g-lento', cpu: 4 },
  'celular-3g': { largura: 390, altura: 844, escala: 3, celular: true, rede: '3g', cpu: 4 },
  'tv-1920': { largura: 1920, altura: 1080, escala: 1, celular: false, rede: 'wifi', cpu: 1 },
};
const MEMORIA_CHEIA = process.env.MEMORIA_CHEIA ?? '/memorias/1992-chegada-do-gui';
export const TELAS = [
  ['Início', '/'],
  ['Explorar, linha do tempo', '/explorar'],
  ['Explorar, mural', '/explorar?ver=mural'],
  ['Explorar, lista', '/explorar?ver=lista'],
  ['Memória', MEMORIA_CHEIA],
  ['Pessoa', '/pessoas/gui'],
  ['Pessoas', '/pessoas'],
  ['Árvore', '/arvore'],
  ['Modo TV', '/explorar?ver=tv'],
  ['Capítulo', '/capitulos/natais'],
];

const OBSERVADORES = () => {
  const m = (window.__medidas = { lcp: null, lcpEl: null, cls: 0, longas: [], fcp: null });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      m.lcp = e.startTime;
      m.lcpEl = e.element ? `${e.element.tagName.toLowerCase()}${e.element.className ? '.' + String(e.element.className).split(' ')[0] : ''} ${e.url ? e.url.replace(location.origin, '') : (e.element.textContent ?? '').trim().slice(0, 40)}` : e.url;
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) m.cls += e.value;
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') m.fcp = e.startTime;
  }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) m.longas.push({ inicio: e.startTime, duracao: e.duration });
  }).observe({ type: 'longtask', buffered: true });
};

function tipoDe(r) {
  const u = r.name;
  if (r.initiatorType === 'navigation') return 'html';
  if (/\.css(\?|$)/.test(u)) return 'css';
  if (/\.m?js(\?|$)/.test(u)) return 'js';
  if (/\.(woff2?|ttf|otf)(\?|$)/.test(u)) return 'fontes';
  if (/\/retratos\//.test(u)) return 'retratos';
  if (/\/fotos\/|\.(jpe?g|png|webp|avif)(\?|$)/.test(u)) return 'fotos';
  if (/\/audios\//.test(u)) return 'audios';
  if (/\.svg(\?|$)/.test(u)) return 'svg';
  if (r.initiatorType === 'fetch' || r.initiatorType === 'xmlhttprequest') return 'busca';
  return 'outros';
}

async function medir(navegador, perfil, caminho) {
  const p = PERFIS[perfil];
  const contexto = await navegador.newContext({ viewport: { width: p.largura, height: p.altura }, deviceScaleFactor: p.escala, isMobile: p.celular, hasTouch: p.celular, ignoreHTTPSErrors: true, locale: 'pt-BR' });
  const url = new URL(caminho, BASE);
  await contexto.addCookies([{ name: 'como', value: 'gui', url: url.origin }]);
  await contexto.addInitScript(OBSERVADORES);
  const pagina = await contexto.newPage();
  const cdp = await contexto.newCDPSession(pagina);
  const rede = REDES[p.rede];
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: rede.latencia, downloadThroughput: rede.desce / 8, uploadThroughput: rede.sobe / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
  const inicio = Date.now();
  let erro = null;
  try {
    await pagina.goto(url.href, { waitUntil: 'load', timeout: 180_000 });
  } catch (e) {
    erro = String(e).slice(0, 200);
  }
  const carregou = Date.now() - inicio;
  // Um respiro para as fotos preguiçosas do alto e o LCP final
  await pagina.waitForTimeout(2500);
  const dados = await pagina.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const recursos = [nav, ...performance.getEntriesByType('resource')].map((r) => ({ name: r.name, initiatorType: r.entryType === 'navigation' ? 'navigation' : r.initiatorType, transferSize: r.transferSize, encodedBodySize: r.encodedBodySize, decodedBodySize: r.decodedBodySize, fim: r.responseEnd, inicio: r.startTime }));
    const dpr = devicePixelRatio;
    const imgs = [...document.images].map((img) => {
      const caixa = img.getBoundingClientRect();
      return {
        src: (img.currentSrc || img.src).replace(location.origin, ''),
        natural: [img.naturalWidth, img.naturalHeight],
        mostrada: [Math.round(caixa.width * dpr), Math.round(caixa.height * dpr)],
        loading: img.getAttribute('loading'),
        completa: img.complete && img.naturalWidth > 0,
        naPrimeiraTela: caixa.top < innerHeight && caixa.bottom > 0 && caixa.width > 0,
      };
    });
    return { m: window.__medidas, ttfb: nav.responseStart, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, recursos, imgs, altura: document.documentElement.scrollHeight, nos: document.getElementsByTagName('*').length };
  });
  await contexto.close();
  const porTipo = {};
  const antesDaPrimeiraTela = {};
  const antesDoLcp = {};
  for (const r of dados.recursos) {
    const t = tipoDe(r);
    const bytes = r.transferSize || r.encodedBodySize || 0;
    porTipo[t] ??= { pedidos: 0, bytes: 0 };
    porTipo[t].pedidos++;
    porTipo[t].bytes += bytes;
    if (dados.m.fcp && r.fim <= dados.m.fcp) antesDaPrimeiraTela[t] = (antesDaPrimeiraTela[t] ?? 0) + bytes;
    if (dados.m.lcp && r.fim <= dados.m.lcp) antesDoLcp[t] = (antesDoLcp[t] ?? 0) + bytes;
  }
  const bytesDe = (src) => dados.recursos.find((r) => r.name.endsWith(src))?.encodedBodySize ?? null;
  const fotos = dados.imgs
    .filter((i) => /\/fotos\//.test(i.src))
    .map((i) => ({ ...i, bytes: bytesDe(i.src), excesso: i.completa && i.mostrada[0] ? +((i.natural[0] * i.natural[1]) / Math.max(1, i.mostrada[0] * i.mostrada[1])).toFixed(1) : null }));
  return {
    erro,
    carregou,
    ttfb: Math.round(dados.ttfb),
    fcp: dados.m.fcp && Math.round(dados.m.fcp),
    lcp: dados.m.lcp && Math.round(dados.m.lcp),
    lcpEl: dados.m.lcpEl,
    cls: +dados.m.cls.toFixed(3),
    dcl: Math.round(dados.dcl),
    load: Math.round(dados.load),
    tarefasLongas: dados.m.longas.length,
    maiorTarefa: Math.round(Math.max(0, ...dados.m.longas.map((l) => l.duracao))),
    bloqueio: Math.round(dados.m.longas.reduce((s, l) => s + Math.max(0, l.duracao - 50), 0)),
    porTipo,
    antesDaPrimeiraTela,
    antesDoLcp,
    totalBytes: Object.values(porTipo).reduce((s, t) => s + t.bytes, 0),
    pedidos: dados.recursos.length,
    imgs: dados.imgs.length,
    fotos: { total: fotos.length, carregadas: fotos.filter((f) => f.completa).length, preguicosas: fotos.filter((f) => f.loading === 'lazy').length, naPrimeiraTela: fotos.filter((f) => f.naPrimeiraTela).length, excessoMediano: (() => { const e = fotos.map((f) => f.excesso).filter(Boolean).sort((a, b) => a - b); return e[Math.floor(e.length / 2)] ?? null; })(), exemplos: fotos.filter((f) => f.completa).slice(0, 3) },
    alturaDaPagina: dados.altura,
    nos: dados.nos,
  };
}

const navegador = await chromium.launch();
const saida = [];
for (const perfil of PERFIS_PEDIDOS ?? Object.keys(PERFIS)) {
  for (const [nome, caminho] of TELAS) {
    if (SO && !SO.test(nome)) continue;
    const r = await medir(navegador, perfil, caminho);
    saida.push({ perfil, nome, caminho, ...r });
    const kb = (b) => `${Math.round((b ?? 0) / 1024)}`;
    console.log(
      `${perfil.padEnd(11)} ${nome.padEnd(26)} TTFB ${String(r.ttfb).padStart(5)}  FCP ${String(r.fcp).padStart(5)}  LCP ${String(r.lcp).padStart(6)}  CLS ${r.cls}  total ${kb(r.totalBytes)} KB (html ${kb(r.porTipo.html?.bytes)}, css ${kb(r.porTipo.css?.bytes)}, js ${kb(r.porTipo.js?.bytes)}, fontes ${kb(r.porTipo.fontes?.bytes)}, fotos ${kb(r.porTipo.fotos?.bytes)} em ${r.porTipo.fotos?.pedidos ?? 0})  longas ${r.tarefasLongas}/${r.maiorTarefa} ms${r.erro ? '  ERRO ' + r.erro : ''}`,
    );
  }
}
await navegador.close();
mkdirSync('docs/desempenho/dados', { recursive: true });
writeFileSync(`docs/desempenho/dados/navegador-${rotulo}.json`, JSON.stringify({ rotulo, base: BASE, quando: new Date().toISOString(), redes: REDES, perfis: PERFIS, resultados: saida }, null, 2));
