// Capturas das páginas com o acervo de exemplo, para conferir mudanças de padrão.
//
//   npm run capturas -- tirar <pasta>          tira as capturas de todas as páginas
//   npm run capturas -- comparar <antes> <depois>   compara pixel a pixel
//
// "tirar" precisa do servidor local rodando (npm run dev) com o acervo de exemplo.
// Nunca aponte para a produção nem para a homologação: o endereço é sempre o local,
// e o script recusa outro. As capturas saem em largura de celular (390 px) e de
// desktop (1280 px), com movimento reduzido, como "Gui" no "Ver como".
//
// As telas do conceito da revisão visual (/conceito) saem também em 1920 px, uma vez para cada
// combinação de fontes. Para tirar só elas: CAPTURAS_SO=conceito npm run capturas -- tirar <pasta>
// A página do sistema (/conceito/sistema) sai com CAPTURAS_SO=sistema.
//
// "comparar" abre as duas capturas de cada página no navegador e compara os pixels.
// Termina com erro se alguma página mudou, e grava a diferença em <depois>/diferencas.

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
function carregarPlaywright() {
  try {
    return require('playwright');
  } catch {
    // Nas sessões do Claude Code o Playwright vem instalado globalmente
    const global = execSync('npm root -g').toString().trim();
    return require(join(global, 'playwright'));
  }
}

const BASE = process.env.CAPTURAS_BASE ?? 'http://localhost:4321';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error('As capturas só rodam no servidor local, com o acervo de exemplo.');
  process.exit(1);
}

const LARGURAS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'desktop', width: 1280, height: 900 },
  // A tela grande, de ver juntos na TV: só as páginas que pedem (larguras: TODAS)
  { nome: 'tv', width: 1920, height: 1080 },
];
const TODAS = LARGURAS.map((l) => l.nome);
const PADRAO = ['celular', 'desktop'];

// Cada página: nome do arquivo, endereço, quem está vendo e, se preciso, o que fazer antes da captura
const etapa = (n) => async (pagina) => {
  await pagina.locator('ol.etapas button').nth(n).click();
};
const PAGINAS = [
  { nome: 'inicio', url: '/' },
  { nome: 'inicio-nucleo', url: '/?nucleo=bayara-nascimento' },
  { nome: 'memoria', url: '/memorias/2025-natal' },
  { nome: 'memoria-com-fotos', url: '/memorias/2024-aniversario-vo-bela' },
  { nome: 'memoria-historico', url: '/memorias/2025-natal/historico' },
  { nome: 'memoria-relato', url: '/memorias/2025-natal/relato' },
  { nome: 'memoria-excluir', url: '/memorias/2025-natal/excluir' },
  { nome: 'nova-1', url: '/nova' },
  { nome: 'editar-memoria-2', url: '/nova?id=2025-natal', antes: etapa(1) },
  { nome: 'editar-memoria-3', url: '/nova?id=2025-natal', antes: etapa(2) },
  { nome: 'editar-memoria-4', url: '/nova?id=2025-natal', antes: etapa(3) },
  { nome: 'editar-memoria-5', url: '/nova?id=2025-natal', antes: etapa(4) },
  { nome: 'rascunho-6-resumo', url: '/nova?id=2024-almoco-de-domingo', antes: etapa(5) },
  { nome: 'pessoas', url: '/pessoas' },
  { nome: 'pessoa-quem-acessa', url: '/pessoas/gui' },
  { nome: 'pessoa-parente', url: '/pessoas/vo-bela' },
  { nome: 'pessoa-bicho', url: '/pessoas/chico' },
  { nome: 'pessoa-de-fora', url: '/pessoas/ex-caio-amigo' },
  { nome: 'pessoa-editar', url: '/pessoas/vo-bela/editar' },
  { nome: 'pessoa-nova', url: '/pessoas/nova' },
  { nome: 'capitulos', url: '/capitulos' },
  { nome: 'capitulo-reunido', url: '/capitulos/natais' },
  { nome: 'capitulo-epoca', url: '/capitulos/os-anos-90' },
  { nome: 'capitulo-editar', url: '/capitulos/natais/editar' },
  { nome: 'capitulo-epoca-editar', url: '/capitulos/os-anos-90/editar' },
  { nome: 'capitulo-novo', url: '/capitulos/novo' },
  { nome: 'tema', url: '/temas/natal' },
  { nome: 'rascunhos', url: '/rascunhos' },
  { nome: 'lixeira', url: '/lixeira' },
  { nome: 'arvore', url: '/arvore' },
  { nome: 'admin-tipos', url: '/admin/tipos' },
  { nome: 'admin-espelho', url: '/admin/espelho' },
  { nome: 'inicio-como-elizete', url: '/', como: 'elizete' },
  { nome: 'pessoa-nova-como-magno', url: '/pessoas/nova', como: 'lucas-magno' },
  // Conceito da revisão visual: as mesmas telas em cada combinação de fontes, nas três larguras.
  // A carta é vista como Elizete, que a recebe. O painel, a linha do tempo e a memória, como Giovanna,
  // que está em duas famílias, vê todos os capítulos e ainda não contou o Natal de 2025.
  // "corte" limita a altura da captura da linha do tempo, que é muito longa, e "desde" começa a
  // captura num ponto da página.
  ...['a', 'b', 'c'].flatMap((fontes) => [
    { nome: `conceito-${fontes}-1-carta`, url: '/conceito?visita=primeira', como: 'elizete', fontes, larguras: TODAS },
    { nome: `conceito-${fontes}-2-painel`, url: '/conceito', como: 'giovanna', fontes, larguras: TODAS },
    { nome: `conceito-${fontes}-3-linha-do-tempo`, url: '/conceito/tudo', como: 'giovanna', fontes, larguras: TODAS, corte: 9000 },
    { nome: `conceito-${fontes}-4-memoria`, url: '/conceito/memorias/2025-natal', como: 'giovanna', fontes, larguras: TODAS },
  ]),
  // Capítulos na linha do tempo: o trecho com um capítulo dentro de outro (Natais na Vó Vivica, dentro
  // de Natais) e, no computador, os capítulos de época. Começa em 2006 e vai até o fim da página.
  { nome: 'conceito-a-5-capitulos', url: '/conceito/tudo', como: 'giovanna', larguras: TODAS, desde: '#ano-2006', corte: 9000 },
  { nome: 'conceito-fontes-e-pecas', url: '/conceito/sobre', larguras: TODAS },
  // O sistema (fase 2): a marca, as fontes, os tokens e as peças, em cada combinação de fontes
  ...['a', 'b', 'c'].map((fontes) => ({ nome: `sistema-${fontes}`, url: '/conceito/sistema', fontes, larguras: TODAS })),
  { nome: 'admin-familias', url: '/admin/familias' },
];

async function tirar(pasta) {
  const { chromium } = carregarPlaywright();
  mkdirSync(pasta, { recursive: true });
  const navegador = await chromium.launch();
  const filtro = process.env.CAPTURAS_SO ? new RegExp(process.env.CAPTURAS_SO) : null;
  for (const largura of LARGURAS) {
    const contexto = await navegador.newContext({
      viewport: { width: largura.width, height: largura.height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    });
    const pagina = await contexto.newPage();
    for (const p of PAGINAS) {
      if (filtro && !filtro.test(p.nome)) continue;
      if (!(p.larguras ?? PADRAO).includes(largura.nome)) continue;
      await contexto.addCookies([{ name: 'fontes', value: p.fontes ?? 'a', url: BASE }]);
      const endereco = `${BASE}/como/${p.como ?? 'gui'}?volta=${encodeURIComponent(p.url)}`;
      // A primeira visita a uma página no servidor local pode demorar enquanto ele compila
      await pagina.goto(endereco, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => pagina.goto(endereco, { waitUntil: 'networkidle', timeout: 60000 }));
      if (p.antes) await p.antes(pagina);
      await pagina.evaluate(() => document.fonts.ready);
      // Sem a barra de ferramentas do Astro, que só existe no servidor local
      await pagina.evaluate(() => document.querySelector('astro-dev-toolbar')?.remove());
      // Sem cursor piscando nem foco deixado pelo script
      await pagina.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
      // Passa pela página inteira, para as fotos de carregamento tardio entrarem na captura
      await pagina.evaluate(async () => {
        const altura = document.documentElement.scrollHeight;
        for (let y = 0; y < altura; y += 600) {
          scrollTo(0, y);
          await new Promise((ok) => setTimeout(ok, 40));
        }
        scrollTo(0, 0);
      });
      await pagina.waitForLoadState('networkidle');
      // Só as imagens que estão na página: as de dentro de uma caixa fechada (a galeria da memória)
      // só carregam quando ela abre, e esperar por elas não termina nunca
      await pagina.evaluate(() => Promise.all([...document.images].filter((i) => i.getClientRects().length > 0).map((i) => i.decode().catch(() => {}))));
      await pagina.waitForTimeout(300);
      const arquivo = join(pasta, `${p.nome}--${largura.nome}.png`);
      const altura = await pagina.evaluate(() => document.documentElement.scrollHeight);
      // "desde" é um ponto da página (um seletor): a captura começa um pouco acima dele
      const desde = p.desde ? await pagina.evaluate((seletor) => Math.max(0, Math.round((document.querySelector(seletor)?.getBoundingClientRect().top ?? 0) + scrollY - 160)), p.desde) : 0;
      const ate = Math.min(altura - desde, p.corte ?? altura);
      const corte = desde > 0 || ate < altura ? { clip: { x: 0, y: desde, width: largura.width, height: ate } } : {};
      await pagina.screenshot({ path: arquivo, fullPage: true, animations: 'disabled', caret: 'hide', ...corte });
      console.log(arquivo);
    }
    await contexto.close();
  }
  await navegador.close();
}

async function comparar(antes, depois) {
  const { chromium } = carregarPlaywright();
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  const arquivos = readdirSync(antes).filter((a) => a.endsWith('.png'));
  const pastaDiferencas = join(depois, 'diferencas');
  let mudaram = 0;
  for (const arquivo of arquivos) {
    const caminhoDepois = join(depois, arquivo);
    if (!existsSync(caminhoDepois)) {
      console.log(`falta   ${arquivo}`);
      mudaram++;
      continue;
    }
    const a = 'data:image/png;base64,' + readFileSync(join(antes, arquivo)).toString('base64');
    const b = 'data:image/png;base64,' + readFileSync(caminhoDepois).toString('base64');
    const resultado = await pagina.evaluate(
      async ([a, b]) => {
        const carregar = (src) =>
          new Promise((ok, falha) => {
            const img = new Image();
            img.onload = () => ok(img);
            img.onerror = falha;
            img.src = src;
          });
        const [ia, ib] = await Promise.all([carregar(a), carregar(b)]);
        if (ia.width !== ib.width || ia.height !== ib.height) {
          return { diferentes: -1, tamanho: `${ia.width}x${ia.height} → ${ib.width}x${ib.height}` };
        }
        const ler = (img) => {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          return ctx.getImageData(0, 0, img.width, img.height);
        };
        const da = ler(ia);
        const db = ler(ib);
        const saida = new ImageData(da.width, da.height);
        let diferentes = 0;
        for (let i = 0; i < da.data.length; i += 4) {
          const igual = da.data[i] === db.data[i] && da.data[i + 1] === db.data[i + 1] && da.data[i + 2] === db.data[i + 2] && da.data[i + 3] === db.data[i + 3];
          if (!igual) diferentes++;
          saida.data[i] = igual ? da.data[i] : 255;
          saida.data[i + 1] = igual ? da.data[i + 1] : 0;
          saida.data[i + 2] = igual ? da.data[i + 2] : 0;
          saida.data[i + 3] = igual ? 60 : 255;
        }
        if (!diferentes) return { diferentes };
        const c = document.createElement('canvas');
        c.width = da.width;
        c.height = da.height;
        c.getContext('2d').putImageData(saida, 0, 0);
        return { diferentes, imagem: c.toDataURL('image/png') };
      },
      [a, b],
    );
    if (resultado.diferentes === 0) {
      console.log(`igual   ${arquivo}`);
      continue;
    }
    mudaram++;
    if (resultado.diferentes < 0) {
      console.log(`mudou   ${arquivo} (tamanho ${resultado.tamanho})`);
    } else {
      console.log(`mudou   ${arquivo} (${resultado.diferentes} pixels)`);
      mkdirSync(pastaDiferencas, { recursive: true });
      writeFileSync(join(pastaDiferencas, arquivo), Buffer.from(resultado.imagem.split(',')[1], 'base64'));
    }
  }
  await navegador.close();
  console.log(mudaram ? `\n${mudaram} de ${arquivos.length} capturas mudaram.` : `\nAs ${arquivos.length} capturas estão iguais.`);
  process.exit(mudaram ? 1 : 0);
}

const [comando, ...args] = process.argv.slice(2);
if (comando === 'tirar' && args[0]) await tirar(args[0]);
else if (comando === 'comparar' && args[0] && args[1]) await comparar(args[0], args[1]);
else {
  console.error('Uso: npm run capturas -- tirar <pasta> | comparar <antes> <depois>');
  process.exit(1);
}
