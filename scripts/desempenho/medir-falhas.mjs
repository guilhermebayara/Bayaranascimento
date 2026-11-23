// As falhas das ações que trocam no lugar ou navegam (sessão M1, 22/11/2026; relatório em docs/desempenho/):
// o Explorar, o "Me mostre outra", o modo TV, as reações e "Como você chama", com a rede cortada um instante
// antes do toque e com o servidor respondendo erro 500. Diz onde a pessoa termina e o que a tela mostra.
// As ações dos formulários com script (nova memória, relato, fotos) estão em medir-espera.mjs, com FALHA=1.
//
//   node scripts/desempenho/proxy-local.mjs &
//   node scripts/desempenho/medir-falhas.mjs [https://127.0.0.1:4443] > docs/desempenho/dados/falhas-exemplo.txt
import { execSync } from 'node:child_process';
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

const BASE = process.argv[2] ?? 'https://127.0.0.1:4443';
// Nunca na produção nem na homologação: só o computador e as prévias de teste
if (/^(memorias|homologa\.memorias)\.bayara\.com\.br$/.test(new URL(BASE).hostname)) {
  console.error('A medição roda no computador ou numa prévia de teste. Produção e homologação nunca.');
  process.exit(1);
}

const ACOES = [
  ['Como você chama', '/pessoas/vo-bela', async (p) => { await p.locator('details.como-chama > summary').click(); await p.locator('form.como-chama__form input[name="apelido"]').fill('Vozinha'); }, 'form.como-chama__form button[type="submit"]', '**/api/**'],
  ['Reagir', '/memorias/1992-chegada-do-gui', async () => {}, '[data-reacao-principal]', '**/api/**'],
  ['Explorar: família', '/explorar', async () => {}, 'nav[aria-labelledby="controle-familia"] a[data-opcao="bracarense"]', '**/explorar?**'],
  ['Me mostre outra', '/explorar?ver=acaso&m=1992-chegada-do-gui', async () => {}, '[data-palco-depois]', '**/explorar?**'],
  ['Modo TV: próxima', '/explorar?ver=tv', async () => {}, '[data-palco-depois]', '**/explorar?**'],
];

console.log(`# Falhas simuladas, ${BASE}, 390 x 844`);
console.log('# caso | ação | onde a pessoa termina | o que a tela mostra');
const navegador = await chromium.launch();
for (const caso of ['sem rede', 'erro no servidor']) {
  for (const [nome, onde, preparar, botao, rotas] of ACOES) {
    const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
    await contexto.addCookies([{ name: 'como', value: 'gui', url: BASE }]);
    const pagina = await contexto.newPage();
    await pagina.goto(new URL(onde, BASE).href, { waitUntil: 'load' });
    await pagina.waitForTimeout(500);
    await preparar(pagina);
    if (caso === 'sem rede') await contexto.setOffline(true);
    // Só o que grava (POST) ou a troca do Explorar respondem erro; o resto da página segue
    else await pagina.route(rotas, (r) => (rotas.includes('api') && r.request().method() !== 'POST' ? r.continue() : r.fulfill({ status: 500, contentType: 'text/plain', body: 'Erro' })));
    await pagina.locator(botao).first().click();
    await pagina.waitForTimeout(4000);
    const tela = await pagina.evaluate(() => (document.querySelector('.palco__aviso')?.textContent || document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 120)).catch(() => '');
    console.log(`${caso} | ${nome} | ${pagina.url().replace(BASE, '')} | ${tela}`);
    await contexto.close();
  }
}
await navegador.close();
