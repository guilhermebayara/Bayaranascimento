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
// As telas do visual novo saem também em 1920 px.
// As da fase 3 saem por grupo: CAPTURAS_SO=^explorar npm run capturas -- tirar <pasta>
// As da fase 3 saem por grupo também: CAPTURAS_SO=^pessoal
// A página do sistema (/sistema) sai com CAPTURAS_SO=sistema.
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
// Abre o editor do primeiro laço e a pergunta de remover, para a zona de perigo aparecer
const abrirLaco = async (pagina) => {
  await pagina.locator('details.editar > summary').first().click();
  await pagina.locator('details.editar[open] details.confirmar > summary').first().click();
};
// /admin/tipos: abre a cor e o desenho de um tipo, com as duas grades à vista
const abrirTipo = async (pagina) => {
  await pagina.locator('details.tipo-da-lista:has(input[name="id"][value="viagem"]) > summary').click();
};
const abrirFiltros = async (pagina) => {
  await pagina.locator('.filtros > summary').click();
};

// O painel depende das visitas de cada pessoa. Para a captura sair sempre igual, o banco local é
// arrumado antes: "primeira" apaga as visitas da pessoa (a carta aparece no alto) e "seguinte" põe a
// visita anterior um minuto atrás e publica agora duas memórias e um relato de exemplo, para o
// painel ter o que mostrar em "o que entrou de novo". Só mexe no banco local (.wrangler).
const NOVAS_DE_EXEMPLO = ['2026-pao-de-queijo-da-vo-bela', '2025-festa-junina'];
const RELATO_NOVO_DE_EXEMPLO = { memoria: '2023-chico-chega', por: 'lucas-magno' };
async function prepararVisita(pessoa, qual, comNovidades = false) {
  const { DatabaseSync } = await import('node:sqlite');
  const pasta = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
  const arquivo = readdirSync(pasta).find((a) => a.endsWith('.sqlite') && a !== 'metadata.sqlite');
  const banco = new DatabaseSync(join(pasta, arquivo));
  const texto = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
  const agora = new Date();
  banco.prepare('DELETE FROM visitas WHERE pessoa = ?').run(pessoa);
  if (qual === 'seguinte') {
    const antes = texto(new Date(agora.getTime() - 60000));
    banco
      .prepare('INSERT INTO visitas (pessoa, primeira_em, visita_em, ultima_em, anterior_em, carta_em) VALUES (?, ?, ?, ?, ?, ?)')
      .run(pessoa, '2026-01-01 12:00:00', texto(agora), texto(agora), antes, '2026-01-01 12:00:00');
    banco.prepare(`UPDATE memorias SET publicada_em = criada_em WHERE situacao = 'publicada'`).run();
    banco.prepare(`UPDATE relatos SET publicado_em = criado_em WHERE situacao = 'publicada'`).run();
    if (comNovidades) for (const id of NOVAS_DE_EXEMPLO) banco.prepare('UPDATE memorias SET publicada_em = ? WHERE id = ?').run(texto(agora), id);
    if (comNovidades) banco.prepare('UPDATE relatos SET publicado_em = ? WHERE memoria_id = ? AND por = ?').run(texto(agora), RELATO_NOVO_DE_EXEMPLO.memoria, RELATO_NOVO_DE_EXEMPLO.por);
  }
  banco.close();
}

// Na Nova memória, o título e o tipo são obrigatórios para chegar à frase da etapa "Quando e onde"
const ateAFrase = async (pagina) => {
  await pagina.locator('[name="titulo"]').fill('Almoço de aniversário da Vó Bela');
  await pagina.locator('input[name="tipo"]').first().check({ force: true });
  await pagina.locator('[data-etapa-continuar]').click();
};
// Ajustes depois da fase 3: a foto-chave da lista ao passar o mouse (só onde há mouse) e o foco no título
const mouseNaLinha = async (pagina) => {
  if (!(await pagina.evaluate(() => matchMedia('(min-width: 62rem)').matches))) return;
  await pagina.locator('.lista__bloco:nth-child(2) .lista__item:nth-child(1) .lista__linha').hover();
  await pagina.waitForTimeout(300);
};
const focoNoTitulo = async (pagina) => {
  await pagina.locator('.entrada__titulo a').first().focus();
  await pagina.keyboard.press('Shift+Tab');
  await pagina.keyboard.press('Tab');
};
const PAGINAS = [
  // Conceito da revisão visual: as mesmas telas em cada combinação de fontes, nas três larguras.
  // A carta é vista como Elizete, que a recebe. O painel, a linha do tempo e a memória, como Giovanna,
  // que está em duas famílias, vê todos os capítulos e ainda não contou o Natal de 2025.
  // "corte" limita a altura da captura da linha do tempo, que é muito longa, e "desde" começa a
  // captura num ponto da página.
  // Fase 3, grupo "explorar": o Explorar nas quatro formas de ver e a página da memória, nas três
  // larguras, como Giovanna. Para tirar só elas: CAPTURAS_SO=^explorar npm run capturas -- tirar <pasta>
  { nome: 'explorar-1-linha-do-tempo', url: '/explorar', como: 'giovanna', larguras: TODAS, corte: 9000 },
  // O trecho com um capítulo dentro de outro (Natais na Vó Vivica, dentro de Natais) e as épocas
  { nome: 'explorar-1-linha-capitulos', url: '/explorar', como: 'giovanna', larguras: TODAS, desde: '#ano-2006', corte: 9000 },
  { nome: 'explorar-1-linha-familia', url: '/explorar?nucleo=bayara-nascimento', como: 'giovanna', larguras: TODAS, corte: 4000 },
  { nome: 'explorar-2-filtros-abertos', url: '/explorar', como: 'giovanna', larguras: TODAS, corte: 3200, antes: abrirFiltros },
  { nome: 'explorar-2-filtros-ligados', url: '/explorar?tipo=viagem&foto=1', como: 'giovanna', larguras: TODAS, corte: 1300 },
  { nome: 'explorar-2-ordem-aberta', url: '/explorar', como: 'giovanna', larguras: TODAS, corte: 1300, antes: (pagina) => pagina.locator('.ordenar > summary').click() },
  { nome: 'explorar-2-filtrado', url: '/explorar?tipo=viagem&foto=1&ordem=contadas', como: 'giovanna', larguras: TODAS },
  { nome: 'explorar-2-antigas', url: '/explorar?ordem=antigas&capitulo=natais', como: 'giovanna', larguras: TODAS, corte: 5000 },
  { nome: 'explorar-2-sem-resultado', url: '/explorar?tipo=viagem&decada=1950', como: 'giovanna', larguras: TODAS },
  { nome: 'explorar-3-mural', url: '/explorar?ver=mural', como: 'giovanna', larguras: TODAS, corte: 5000 },
  { nome: 'explorar-3-mural-pequenas', url: '/explorar?ver=mural&tamanho=pequenas', como: 'giovanna', larguras: TODAS, corte: 3000 },
  { nome: 'explorar-3-mural-grandes', url: '/explorar?ver=mural&tamanho=grandes', como: 'giovanna', larguras: TODAS, corte: 3000 },
  // Fora da ordem do tempo, o mural fica sem os cartões de década e as abas de ano
  { nome: 'explorar-3-mural-mais-contadas', url: '/explorar?ver=mural&ordem=contadas', como: 'giovanna', larguras: TODAS, corte: 3000 },
  { nome: 'explorar-4-modo-tv', url: '/explorar?ver=tv&m=2025-natal', como: 'giovanna', larguras: TODAS },
  // "Passar sozinho" ligado em 15 segundos e pausado, para a captura não trocar de memória
  { nome: 'explorar-4-modo-tv-passando', url: '/explorar?ver=tv&m=2025-natal&passar=15&pausa=1', como: 'giovanna', larguras: TODAS },
  { nome: 'explorar-4-modo-tv-sem-foto', url: '/explorar?ver=tv&m=2026-primeira-noite-em-casa', como: 'giovanna', larguras: TODAS },
  { nome: 'explorar-5-ao-acaso', url: '/explorar?ver=acaso&m=1994-festa-de-aniversario', como: 'giovanna', larguras: TODAS },
  { nome: 'explorar-6-memoria', url: '/memorias/2025-natal', como: 'giovanna', larguras: TODAS },
  { nome: 'explorar-6-memoria-com-fotos', url: '/memorias/1994-festa-de-aniversario', como: 'giovanna', larguras: TODAS },
  { nome: 'explorar-6-memoria-sem-foto', url: '/memorias/2026-primeira-noite-em-casa', como: 'giovanna', larguras: TODAS },
  // Fase 3, grupo "pessoal": o painel (a carta na primeira visita e uma visita seguinte, na véspera de
  // Natal), a carta, a conta, a página da pessoa e o sistema. CAPTURAS_SO=^pessoal npm run capturas -- tirar <pasta>
  { nome: 'pessoal-1-carta-no-painel', url: '/?hoje=2026-12-24', como: 'elizete', larguras: TODAS, visita: 'primeira' },
  { nome: 'pessoal-1-painel', url: '/?hoje=2026-12-24', como: 'giovanna', larguras: TODAS, visita: 'seguinte' },
  { nome: 'pessoal-1-painel-sem-novidade', url: '/?hoje=2026-08-14', como: 'gui', larguras: TODAS, visita: 'seguinte-sem-novidade' },
  { nome: 'pessoal-2-carta', url: '/carta', como: 'giovanna', larguras: TODAS },
  { nome: 'pessoal-3-conta', url: '/conta', como: 'giovanna', larguras: TODAS },
  { nome: 'pessoal-3-conta-admin', url: '/conta', como: 'gui', larguras: TODAS },
  { nome: 'pessoal-3-conta-elizete', url: '/conta', como: 'elizete', larguras: TODAS },
  { nome: 'pessoal-4-pessoa-voce', url: '/pessoas/giovanna', como: 'giovanna', larguras: TODAS },
  { nome: 'pessoal-4-pessoa-parente', url: '/pessoas/vo-bela', como: 'giovanna', larguras: TODAS },
  { nome: 'pessoal-4-pessoa-bicho', url: '/pessoas/chico', como: 'giovanna', larguras: TODAS },
  { nome: 'pessoal-4-pessoa-de-fora', url: '/pessoas/ex-caio-amigo', como: 'gui', larguras: TODAS },
  // Fase 3, grupo "familia": capítulos, tema, pessoas e árvore, nas três larguras.
  // Para tirar só elas: CAPTURAS_SO=^familia npm run capturas -- tirar <pasta>
  { nome: 'familia-1-capitulos', url: '/capitulos', como: 'giovanna', larguras: TODAS },
  { nome: 'familia-2-capitulo-reunido', url: '/capitulos/natais', como: 'giovanna', larguras: TODAS },
  { nome: 'familia-2-capitulo-por-periodo', url: '/capitulos/infancia-da-giovanna', como: 'giovanna', larguras: TODAS, corte: 5000 },
  { nome: 'familia-2-capitulo-epoca', url: '/capitulos/os-anos-90', como: 'giovanna', larguras: TODAS, corte: 5000 },
  { nome: 'familia-2-capitulo-de-dentro', url: '/capitulos/natais-na-vo-vivica', como: 'giovanna', larguras: TODAS },
  { nome: 'familia-3-tema', url: '/temas/natal', como: 'giovanna', larguras: TODAS, corte: 5000 },
  { nome: 'familia-4-pessoas', url: '/pessoas', como: 'giovanna', larguras: TODAS },
  // A árvore: como abre, com alguém em foco (a ficha), com um ramo aberto e com os ajustes abertos
  { nome: 'familia-5-arvore', url: '/arvore', larguras: TODAS },
  { nome: 'familia-5-arvore-foco', url: '/arvore', larguras: TODAS, antes: (pagina) => pagina.locator('.mapa a.no[data-id="elizete"]').dispatchEvent('click') },
  { nome: 'familia-5-arvore-ramo', url: '/arvore', larguras: TODAS, antes: (pagina) => pagina.locator('.no__ramo').first().dispatchEvent('click') },
  { nome: 'familia-5-arvore-ajustes', url: '/arvore', larguras: TODAS, antes: (pagina) => pagina.locator('.mapa__painel > summary').click() },
  // Ajustes depois da fase 3 (docs/visual.md, "Ajustes depois da fase 3"): a lista no Explorar e na
  // página da pessoa, as formas de ver da pessoa, "Quem aparece" no capítulo e o foco no título.
  // Para tirar só elas: CAPTURAS_SO=^ajustes npm run capturas -- tirar <pasta>
  { nome: 'ajustes-1-lista', url: '/explorar?ver=lista', como: 'giovanna', larguras: TODAS, corte: 4000 },
  { nome: 'ajustes-1-lista-com-a-foto', url: '/explorar?ver=lista', como: 'giovanna', larguras: TODAS, corte: 1700, depois: mouseNaLinha },
  { nome: 'ajustes-1-lista-filtrada', url: '/explorar?ver=lista&tipo=viagem&foto=1', como: 'giovanna', larguras: TODAS },
  { nome: 'ajustes-1-lista-mais-contadas', url: '/explorar?ver=lista&ordem=contadas', como: 'giovanna', larguras: TODAS, corte: 2400 },
  { nome: 'ajustes-2-pessoa-linha-do-tempo', url: '/pessoas/gui', como: 'giovanna', larguras: TODAS, desde: '#memorias-com', corte: 2400 },
  { nome: 'ajustes-2-pessoa-mural', url: '/pessoas/gui?ver=mural', como: 'giovanna', larguras: TODAS, desde: '#memorias-com', corte: 2400 },
  { nome: 'ajustes-2-pessoa-lista', url: '/pessoas/gui?ver=lista', como: 'giovanna', larguras: TODAS, desde: '#memorias-com', corte: 2400 },
  { nome: 'ajustes-3-capitulo-quem-aparece', url: '/capitulos/natais', como: 'giovanna', larguras: TODAS, corte: 1700 },
  // Parte 2: a frase na abertura da Nova memória, o resumo ao lado e a zona de perigo
  { nome: 'ajustes-4-nova-abertura-vazia', url: '/nova', larguras: TODAS },
  { nome: 'ajustes-4-correcao-abertura-e-zona', url: '/nova?id=2025-natal', larguras: TODAS },
  { nome: 'ajustes-5-rascunho-quem-estava', url: '/nova?id=2024-almoco-de-domingo', larguras: TODAS, antes: etapa(2) },
  { nome: 'ajustes-5-relato', url: '/memorias/2025-natal/relato', larguras: TODAS },
  { nome: 'ajustes-6-capitulo-editar-zona', url: '/capitulos/natais/editar', larguras: TODAS },
  { nome: 'ajustes-6-pessoa-editar-laco', url: '/pessoas/vo-bela/editar', larguras: TODAS, antes: abrirLaco },
  { nome: 'ajustes-7-titulo-em-foco', url: '/explorar', como: 'giovanna', larguras: TODAS, corte: 1300, depois: focoNoTitulo },
  { nome: 'conceito-fontes-e-pecas', url: '/conceito/sobre', larguras: TODAS },
  // O sistema (fase 2): a marca, as fontes, os tokens e as peças, em cada combinação de fontes
  ...['a', 'b', 'c'].map((fontes) => ({ nome: `sistema-${fontes}`, url: '/sistema', fontes, larguras: TODAS })),
  // Fase 3, grupo "formularios", primeira metade: a Nova memória etapa a etapa, o relato e o capítulo.
  // Para tirar só elas: CAPTURAS_SO=^formularios npm run capturas -- tirar <pasta>
  { nome: 'formularios-1-nova-1-o-que-aconteceu', url: '/nova', larguras: TODAS },
  { nome: 'formularios-1-nova-1-erro', url: '/nova', larguras: TODAS, antes: (pagina) => pagina.locator('[data-etapa-continuar]').click() },
  { nome: 'formularios-1-nova-2-frase-vazia', url: '/nova', larguras: TODAS, antes: ateAFrase },
  { nome: 'formularios-1-correcao-2-frase', url: '/nova?id=2025-natal', larguras: TODAS, antes: etapa(1) },
  { nome: 'formularios-1-correcao-2-data-aberta', url: '/nova?id=2025-natal', larguras: TODAS, antes: async (pagina) => (await etapa(1)(pagina), pagina.locator('[data-frase-data]').click()) },
  { nome: 'formularios-1-correcao-3-quem-estava', url: '/nova?id=2025-natal', larguras: TODAS, antes: etapa(2) },
  { nome: 'formularios-1-correcao-4-fotos', url: '/nova?id=2025-natal', larguras: TODAS, antes: etapa(3) },
  { nome: 'formularios-1-correcao-5-capitulo-e-temas', url: '/nova?id=2025-natal', larguras: TODAS, antes: etapa(4) },
  { nome: 'formularios-1-correcao-6-quem-ve', url: '/nova?id=2025-natal', larguras: TODAS, antes: etapa(5) },
  { nome: 'formularios-1-rascunho-5-relato', url: '/nova?id=2024-almoco-de-domingo', larguras: TODAS, antes: etapa(4) },
  { nome: 'formularios-1-rascunho-7-resumo', url: '/nova?id=2024-almoco-de-domingo', larguras: TODAS, antes: etapa(6) },
  { nome: 'formularios-2-relato', url: '/memorias/2025-natal/relato', larguras: TODAS },
  { nome: 'formularios-3-capitulo-novo', url: '/capitulos/novo', larguras: TODAS },
  { nome: 'formularios-3-capitulo-novo-por-periodo', url: '/capitulos/novo', larguras: TODAS, antes: (pagina) => pagina.locator('input[name="modo"][value="periodo"]').check({ force: true }) },
  { nome: 'formularios-3-capitulo-editar', url: '/capitulos/natais/editar', larguras: TODAS, corte: 2600 },
  { nome: 'formularios-3-capitulo-epoca-editar', url: '/capitulos/os-anos-90/editar', larguras: TODAS },
  // Fase 3, grupo "formularios", segunda metade: a pessoa e os laços, as utilitárias e a administração
  { nome: 'formularios-4-pessoa-nova', url: '/pessoas/nova', larguras: TODAS },
  { nome: 'formularios-4-pessoa-nova-como-magno', url: '/pessoas/nova', como: 'lucas-magno', larguras: TODAS },
  { nome: 'formularios-4-guiado-1-inicio', url: '/pessoas/ex-caio-amigo/editar?novo=1', larguras: TODAS },
  { nome: 'formularios-4-guiado-2-pais', url: '/pessoas/ex-caio-amigo/editar?novo=1&passo=pais&ramo=familia', larguras: TODAS },
  { nome: 'formularios-4-guiado-3-casal', url: '/pessoas/ex-caio-amigo/editar?novo=1&passo=casal&ramo=familia', larguras: TODAS },
  { nome: 'formularios-4-guiado-4-coracao', url: '/pessoas/ex-caio-amigo/editar?novo=1&passo=coracao&ramo=coracao', larguras: TODAS },
  { nome: 'formularios-4-guiado-5-fim', url: '/pessoas/ex-caio-amigo/editar?novo=1&passo=fim&ramo=coracao', larguras: TODAS },
  { nome: 'formularios-4-todos-os-lacos', url: '/pessoas/ex-caio-amigo/editar?novo=1&passo=outro', larguras: TODAS },
  { nome: 'formularios-5-pessoa-editar', url: '/pessoas/vo-bela/editar', larguras: TODAS },
  // Um laço em edição com a confirmação de remover aberta, e o casal com uma fase aberta
  {
    nome: 'formularios-5-laco-em-edicao',
    url: '/pessoas/vo-bela/editar',
    larguras: TODAS,
    desde: '#lacos',
    antes: (pagina) => pagina.evaluate(() => { for (const d of document.querySelectorAll('#lacos .laco:first-child :is([data-editar], [data-confirmar])')) d.open = true; }),
  },
  {
    nome: 'formularios-5-casal-em-edicao',
    url: '/pessoas/giovanna/editar',
    como: 'giovanna',
    larguras: TODAS,
    desde: '#lacos',
    antes: (pagina) => pagina.evaluate(() => { for (const d of document.querySelectorAll('.laco--casal [data-editar], .laco--casal .fase:first-of-type')) d.open = true; }),
  },
  { nome: 'formularios-6-historico', url: '/memorias/2025-natal/historico', larguras: TODAS },
  { nome: 'formularios-6-memoria-excluir', url: '/memorias/2025-natal/excluir', larguras: TODAS },
  { nome: 'formularios-6-capitulo-excluir', url: '/capitulos/natais/excluir', larguras: TODAS },
  { nome: 'formularios-6-lixeira', url: '/lixeira', larguras: TODAS, corte: 2400 },
  { nome: 'formularios-7-admin-tipos', url: '/admin/tipos', larguras: TODAS },
  // Tipos de momento: a cor numa paleta ampliada e o desenho à escolha (tst-visual-tipos).
  // Para tirar só elas: CAPTURAS_SO=^tipos npm run capturas -- tirar <pasta>
  { nome: 'tipos-1-admin', url: '/admin/tipos', larguras: TODAS },
  { nome: 'tipos-1-admin-editando', url: '/admin/tipos', larguras: TODAS, antes: abrirTipo, desde: 'details.tipo-da-lista[open]', corte: 1900 },
  { nome: 'tipos-2-sistema-paleta', url: '/sistema', larguras: TODAS, desde: '#paleta-ampliada', corte: 1900 },
  { nome: 'tipos-2-sistema-rabiscos', url: '/sistema', larguras: TODAS, desde: '#todos-os-rabiscos', corte: 900 },
  { nome: 'formularios-7-admin-familias', url: '/admin/familias', larguras: TODAS },
  { nome: 'formularios-7-admin-carta', url: '/admin/carta', larguras: TODAS },
  { nome: 'formularios-7-admin-espelho', url: '/admin/espelho', larguras: TODAS },
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
      await contexto.addCookies([{ name: 'fontes', value: p.fontes ?? 'c', url: BASE }]);
      if (p.visita) await prepararVisita(p.como ?? 'gui', p.visita === 'primeira' ? 'primeira' : 'seguinte', p.visita === 'seguinte');
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
      // Vale também para as de uma lista recolhida (<details>): cada espera tem um limite
      await pagina.evaluate(() =>
        Promise.all([...document.images].filter((i) => i.getClientRects().length > 0).map((i) => Promise.race([i.decode().catch(() => {}), new Promise((ok) => setTimeout(ok, 3000))]))),
      );
      await pagina.waitForTimeout(300);
      // "depois": o que precisa valer na hora da captura (o mouse em cima de algo, o foco do teclado)
      if (p.depois) await p.depois(pagina);
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
