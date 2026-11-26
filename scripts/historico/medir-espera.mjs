// O inventário da espera (sessão M1, 22/11/2026, com o adendo do Gui; relatório em docs/desempenho/):
// para cada ação em que a pessoa espera, o tempo entre o toque e a primeira mudança na tela, o tempo até
// o resultado completo, a interação como o navegador a mede (INP), o que foi buscado no servidor, o que
// a tela mostra (esperando, deu certo, falhou) e o que chega ao leitor de tela (regiões aria-live).
//
//   node scripts/historico/proxy-local.mjs &
//   node scripts/historico/medir-espera.mjs exemplo [https://127.0.0.1:4443]
//
// Perfil: celular, 390 × 844, processador 4× mais lento, 4G lento (PERFIL=celular-3g ou tv-1920 muda).
// Falhas: FALHA=1 refaz as ações da segunda família sem rede e com o servidor respondendo erro.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

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
const PERFIL = process.env.PERFIL ?? 'celular-4g';
const FOTO_GRANDE = process.env.FOTO_GRANDE; // uma foto de celular, para o envio
const MEMORIA = process.env.MEMORIA ?? '/memorias/1992-chegada-do-gui';
const REDES = { '4g-lento': { latencia: 150, desce: 1.6e6, sobe: 750e3 }, '3g': { latencia: 300, desce: 750e3, sobe: 250e3 }, wifi: { latencia: 40, desce: 20e6, sobe: 5e6 } };
const PERFIS = {
  'celular-4g': { largura: 390, altura: 844, escala: 3, celular: true, rede: '4g-lento', cpu: 4 },
  'celular-3g': { largura: 390, altura: 844, escala: 3, celular: true, rede: '3g', cpu: 4 },
  'tv-1920': { largura: 1920, altura: 1080, escala: 1, celular: false, rede: 'wifi', cpu: 1 },
  // Para as falhas, que não dependem da velocidade: a tela do celular, com a rede rápida
  'celular-wifi': { largura: 390, altura: 844, escala: 3, celular: true, rede: 'wifi', cpu: 4 },
};

// O que a página anota: o toque, a primeira mudança que se vê, o fim, as buscas, as tarefas longas,
// a interação (Event Timing) e o que as regiões aria-live disseram
const ANOTAR = () => {
  const a = (window.__espera = { t0: null, primeira: null, oQue: null, fim: null, buscas: [], longas: [], eventos: [], falas: [] });
  const agora = () => performance.now();
  for (const tipo of ['pointerdown', 'keydown']) addEventListener(tipo, () => (a.t0 ??= agora()), { capture: true });
  // Mudanças que não se veem: só atributos que nenhum estilo lê
  const INVISIVEIS = new Set(['aria-busy', 'data-no-lugar-ligado', 'data-enviando', 'data-rotulo', 'tabindex']);
  new MutationObserver((lista) => {
    if (a.t0 === null || a.primeira !== null) return;
    for (const m of lista) {
      if (m.type === 'attributes' && INVISIVEIS.has(m.attributeName)) continue;
      if (m.type === 'childList' && !m.addedNodes.length && !m.removedNodes.length) continue;
      a.primeira = agora();
      const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      a.oQue = `${m.type}${m.attributeName ? ' ' + m.attributeName : ''} em ${el?.tagName?.toLowerCase()}${el?.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}`;
      break;
    }
  }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  // As falas: texto que entra numa região aria-live, role=status ou role=alert que já estava na página
  new MutationObserver((lista) => {
    if (a.t0 === null) return;
    for (const m of lista) {
      const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      const viva = el?.closest?.('[aria-live], [role="status"], [role="alert"]');
      if (!viva || !viva.isConnected) continue;
      const texto = (viva.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
      if (texto && a.falas.at(-1)?.texto !== texto) a.falas.push({ quando: Math.round(agora() - a.t0), texto });
    }
  }).observe(document, { subtree: true, childList: true, characterData: true });
  document.addEventListener('explorar:trocou', () => (a.fim ??= agora()));
  // As buscas da página (fetch), com o começo e o fim
  const buscar = window.fetch;
  window.fetch = function (...args) {
    const registro = { url: String(args[0]?.url ?? args[0]).replace(location.origin, ''), inicio: agora(), fim: null, status: null };
    a.buscas.push(registro);
    return buscar.apply(this, args).then(
      (r) => {
        registro.status = r.status;
        r.clone().arrayBuffer().then(() => (registro.fim = agora()), () => (registro.fim = agora()));
        return r;
      },
      (e) => {
        registro.fim = agora();
        registro.status = 'falhou';
        throw e;
      },
    );
  };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) a.longas.push({ inicio: e.startTime, duracao: e.duration });
  }).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (e.interactionId) a.eventos.push({ nome: e.name, inicio: e.startTime, duracao: e.duration, id: e.interactionId });
  }).observe({ type: 'event', durationThreshold: 16, buffered: true });
};

const zerar = (pagina) => pagina.evaluate(() => Object.assign(window.__espera, { t0: null, primeira: null, oQue: null, fim: null, buscas: [], longas: [], eventos: [], falas: [] }));
const novoPalco = (pagina) => pagina.evaluate(() => {
  const atual = document.querySelector('[data-palco]');
  return new Promise((ok) => {
    const o = new MutationObserver(() => {
      const agora = document.querySelector('[data-palco]');
      if (agora && agora !== atual) {
        window.__espera.fim ??= performance.now();
        o.disconnect();
        ok(true);
      }
    });
    o.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => ok(false), 90_000);
  });
});
const fimDaBusca = (pagina, padrao) => pagina.waitForFunction((p) => window.__espera.buscas.some((b) => new RegExp(p).test(b.url) && b.fim !== null), padrao, { timeout: 90_000 }).then(() => pagina.evaluate((p) => { const b = window.__espera.buscas.find((x) => new RegExp(p).test(x.url)); window.__espera.fim ??= b.fim; }, padrao));

// As ações. familia 1: tem que responder na hora. familia 2: pode esperar, desde que diga.
const ACOES = [
  { familia: 1, nome: 'Explorar: tocar numa família', onde: '/explorar', fazer: (p) => p.locator('nav[aria-labelledby="controle-familia"] a[data-opcao="bracarense"]').click(), fim: 'trocou' },
  { familia: 1, nome: 'Explorar: linha do tempo para mural', onde: '/explorar', fazer: (p) => p.locator('nav.abas a[data-opcao="mural"]').click(), fim: 'trocou' },
  { familia: 1, nome: 'Explorar: mural para lista', onde: '/explorar?ver=mural', fazer: (p) => p.locator('nav.abas a[data-opcao="lista"]').click(), fim: 'trocou' },
  { familia: 1, nome: 'Explorar: ordem "Mais antigas"', onde: '/explorar', antes: (p) => p.locator('details.ordenar > summary').click(), fazer: (p) => p.locator('nav.ordenar__menu a[data-opcao="antigas"]').click(), fim: 'trocou' },
  { familia: 1, nome: 'Explorar: filtro "com foto"', onde: '/explorar', antes: (p) => p.locator('details.filtros > summary').click(), fazer: (p) => p.locator('label.ficha-de-filtro:has(input[name="foto"])').click(), fim: 'trocou' },
  { familia: 1, nome: 'Explorar: abrir "Filtros"', onde: '/explorar', fazer: (p) => p.locator('details.filtros > summary').click(), fim: 'primeira' },
  { familia: 1, nome: 'Explorar: tamanho das fotos', onde: '/explorar?ver=mural', fazer: (p) => p.locator('a[data-tamanho-das-fotos="grandes"]').click(), fim: 'primeira' },
  { familia: 1, nome: 'Explorar: voltar do navegador', onde: '/explorar', antes: async (p) => { await p.locator('nav.abas a[data-opcao="lista"]').click(); await p.waitForFunction(() => window.__espera.fim !== null, null, { timeout: 90_000 }); await p.waitForTimeout(1500); }, fazer: (p) => p.goBack({ waitUntil: 'commit' }).catch(() => undefined), fim: 'trocou', semToque: true },
  { familia: 1, nome: 'Me mostre outra', onde: `/explorar?ver=acaso&m=${MEMORIA.split('/').pop()}`, fazer: (p) => p.locator('[data-palco-depois]').first().click(), fim: 'navegacao' },
  { familia: 1, nome: 'Modo TV: próxima, depois da busca de antemão', onde: '/explorar?ver=tv', esperaAntes: 6000, fazer: (p) => p.locator('[data-palco-depois]').first().click(), fim: 'palco' },
  { familia: 1, nome: 'Modo TV: próxima logo em seguida', onde: '/explorar?ver=tv', esperaAntes: 6000, antes: async (p) => { const chegou = novoPalco(p); await p.locator('[data-palco-depois]').first().click(); await chegou; }, fazer: (p) => p.locator('[data-palco-depois]').first().click(), fim: 'palco' },
  { familia: 1, nome: 'Reagir (coração)', onde: MEMORIA, fazer: (p) => p.locator('[data-reacao-principal]').first().click(), fim: 'busca:/api/reacoes' },
  { familia: 1, nome: 'Pessoas: digitar na busca', onde: '/pessoas', fazer: async (p) => { const c = p.locator('input[role="combobox"]').first(); await c.click(); await c.pressSequentially('gio', { delay: 120 }); }, fim: 'primeira' },
  { familia: 1, nome: 'Pessoa: "Mostrar datas"', onde: '/pessoas/ex-vo-tonho', fazer: (p) => p.locator('[data-mostrar-datas]').click(), fim: 'primeira', seExistir: '[data-mostrar-datas]' },
  { familia: 1, nome: 'Pessoa: trocar a forma de ver', onde: '/pessoas/gui', fazer: (p) => p.locator('[data-explorar] .controles nav a[data-opcao]:not([aria-current])').first().click(), fim: 'trocou' },
  // A busca por digitação da exploração E2, só na prévia tst-busca: o tempo é contado da última letra
  { familia: 1, nome: 'Busca, proposta B: digitar "natal"', so: 'tst-busca', onde: '/explorar?proposta=b', fazer: async (p) => { await p.locator('[data-abrir-busca]').first().click(); const c = p.locator('dialog.folha-busca input[name="q"]'); await c.pressSequentially('nata', { delay: 150 }); await p.waitForTimeout(2500); await zerar(p); await c.press('l'); }, fim: 'busca:/busca\\?q=natal$' },
  { familia: 1, nome: 'Busca, proposta A: digitar "natal"', so: 'tst-busca', onde: '/explorar?proposta=a', fazer: async (p) => { const c = p.locator('form[data-caixa-busca="explorar"] input[name="q"]'); await c.click(); await c.pressSequentially('nata', { delay: 150 }); await p.waitForFunction(() => window.__espera.fim !== null, null, { timeout: 90_000 }); await p.waitForTimeout(1500); await zerar(p); await c.press('l'); }, fim: 'trocou' },
  { familia: 2, nome: 'Responder o pedido para liberar (Início)', como: 'giovanna', onde: '/', fazer: (p) => p.locator('form.aviso__resposta button[value="manter"]').first().click(), fim: 'busca:/api/avisos', seExistir: 'form.aviso__resposta', falha: true },
  { familia: 2, nome: 'Nova memória: salvar rascunho', onde: '/nova', antes: (p) => p.locator('input[name="titulo"]').fill('Medição de espera'), fazer: (p) => p.getByRole('button', { name: /Salvar rascunho/ }).first().click(), fim: process.env.FALHA ? 'busca:/api/memorias' : 'navegacao', falha: true },
  { familia: 2, nome: 'Nova memória: enviar uma foto', onde: '/nova', fazer: (p) => p.locator('[data-escolher-fotos]').setInputFiles(FOTO_GRANDE ?? 'exemplos/fotos/karol-1.jpg'), fim: 'busca:/api/fotos', falha: true, semToque: true },
  { familia: 2, nome: 'Relato: enviar uma mensagem', onde: `${MEMORIA}/relato`, antes: (p) => p.locator('[data-campo]').fill('Uma mensagem de teste da medição.'), fazer: (p) => p.locator('[data-botao]').click(), fim: 'busca:/api/relatos', falha: true },
  { familia: 2, nome: 'Pessoa: salvar "Como você chama"', onde: '/pessoas/vo-bela', antes: async (p) => { await p.locator('details.como-chama > summary').click(); await p.locator('form.como-chama__form input[name="apelido"]').fill('Vozinha'); }, fazer: (p) => p.locator('form.como-chama__form button[type="submit"]').first().click(), fim: 'busca:/api/apelidos', seExistir: 'details.como-chama', falha: true },
];

async function rodar(navegador, acao, falha = null) {
  const perfil = PERFIS[PERFIL];
  const contexto = await navegador.newContext({ viewport: { width: perfil.largura, height: perfil.altura }, deviceScaleFactor: perfil.escala, isMobile: perfil.celular, hasTouch: perfil.celular, ignoreHTTPSErrors: true, locale: 'pt-BR' });
  const url = new URL(acao.onde, BASE);
  await contexto.addCookies([{ name: 'como', value: acao.como ?? 'gui', url: url.origin }]);
  await contexto.addInitScript(ANOTAR);
  const pagina = await contexto.newPage();
  const cdp = await contexto.newCDPSession(pagina);
  const rede = REDES[perfil.rede];
  await cdp.send('Network.enable');
  const limitar = () => cdp.send('Network.emulateNetworkConditions', { offline: false, latency: rede.latencia, downloadThroughput: rede.desce / 8, uploadThroughput: rede.sobe / 8 });
  await limitar();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: perfil.cpu });
  const r = { familia: acao.familia, nome: acao.nome, onde: acao.onde, falha };
  try {
    await pagina.goto(url.href, { waitUntil: 'load', timeout: 180_000 });
    if (acao.seExistir && !(await pagina.locator(acao.seExistir).count())) {
      await contexto.close();
      return { ...r, pulada: 'não há o que tocar nesta página' };
    }
    await pagina.waitForTimeout(acao.esperaAntes ?? 2500);
    if (acao.antes) await acao.antes(pagina);
    await pagina.waitForTimeout(400);
    await zerar(pagina);
    if (falha === 'sem rede') await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    if (falha === 'erro no servidor') await pagina.route((u) => /\/api\//.test(u.pathname) || (acao.fim === 'busca:.' && u.pathname === new URL(acao.onde, BASE).pathname), (rota) => (rota.request().method() === 'POST' ? rota.fulfill({ status: 500, contentType: 'text/plain', body: 'Erro' }) : rota.continue()));
    const relogio = Date.now();
    const navegou = acao.fim === 'navegacao' ? pagina.waitForEvent('load', { timeout: 120_000 }) : null;
    const palco = acao.fim === 'palco' ? novoPalco(pagina) : null;
    if (acao.semToque) await pagina.evaluate(() => (window.__espera.t0 = performance.now()));
    await acao.fazer(pagina);
    if (navegou) {
      await navegou;
      const n = await pagina.evaluate(() => ({ fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null, origem: performance.timeOrigin }));
      r.primeira = n.fcp !== null ? Math.round(n.origem + n.fcp - relogio) : null;
      r.fim = Math.round(Date.now() - relogio);
      r.oQue = 'a página nova inteira (navegação)';
    } else {
      if (palco) await palco;
      else if (acao.fim === 'trocou') await pagina.waitForFunction(() => window.__espera.fim !== null, null, { timeout: 90_000 });
      else if (acao.fim.startsWith('busca:')) await fimDaBusca(pagina, acao.fim.slice(6));
      await pagina.waitForTimeout(falha ? 4000 : 1200);
      const a = await pagina.evaluate(() => window.__espera);
      const t0 = a.t0;
      r.primeira = a.primeira !== null && t0 !== null ? Math.round(a.primeira - t0) : null;
      r.oQue = a.oQue;
      r.fim = acao.fim === 'primeira' ? r.primeira : a.fim !== null && t0 !== null ? Math.round(a.fim - t0) : null;
      r.buscas = a.buscas.map((b) => ({ url: b.url.slice(0, 90), ms: b.fim !== null ? Math.round(b.fim - b.inicio) : null, status: b.status }));
      r.inp = Math.round(Math.max(0, ...a.eventos.filter((e) => e.inicio >= t0 - 5).map((e) => e.duracao)));
      r.tarefasLongas = a.longas.filter((l) => l.inicio >= t0).map((l) => Math.round(l.duracao));
      r.falas = a.falas;
    }
    // O que ficou na tela no fim
    r.urlFinal = pagina.url().replace(BASE, '');
    r.textoDeErro = await pagina.evaluate(() => [...document.querySelectorAll('.campo__erro, .recado-no-lugar, [data-situacao], .foto__reserva, .palco__aviso, [role="alert"]')].map((e) => e.textContent.trim()).filter(Boolean).join(' | ').slice(0, 200));
    r.paginaDeErroDoNavegador = await pagina.evaluate(() => location.protocol === 'chrome-error:' || document.title === '' && !document.querySelector('header'));
  } catch (e) {
    r.erro = String(e).split('\n')[0].slice(0, 200);
  }
  await contexto.close();
  return r;
}

const navegador = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const saida = [];
for (const acao of ACOES) {
  if (SO && !SO.test(acao.nome)) continue;
  if (acao.so && !BASE.includes(acao.so) && !process.env.COM_BUSCA) continue;
  const casos = process.env.FALHA ? (acao.falha ? ['sem rede', 'erro no servidor'] : []) : [null];
  for (const falha of casos) {
    const r = await rodar(navegador, acao, falha);
    saida.push(r);
    console.log(`${String(r.familia)} ${r.nome.padEnd(46)} ${(falha ?? '').padEnd(16)} primeira ${String(r.primeira).padStart(6)} ms  fim ${String(r.fim).padStart(6)} ms  INP ${String(r.inp ?? '-').padStart(4)}  longas ${JSON.stringify(r.tarefasLongas ?? [])}  ${r.oQue ?? ''}${r.pulada ? '  PULADA: ' + r.pulada : ''}${r.erro ? '  ERRO ' + r.erro : ''}`);
    if (r.falas?.length) console.log(`    falas: ${r.falas.map((f) => `${f.quando} ms “${f.texto}”`).join(' / ')}`);
    if (falha) console.log(`    no fim: ${r.urlFinal} ${r.paginaDeErroDoNavegador ? '(PÁGINA DE ERRO DO NAVEGADOR)' : ''} ${r.textoDeErro}`);
  }
}
await navegador.close();
mkdirSync('docs/desempenho/dados', { recursive: true });
writeFileSync(`docs/desempenho/dados/espera-${rotulo}-${PERFIL}${process.env.FALHA ? '-falhas' : ''}.json`, JSON.stringify({ rotulo, base: BASE, perfil: PERFIL, quando: new Date().toISOString(), resultados: saida }, null, 2));
