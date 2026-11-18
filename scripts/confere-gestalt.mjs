// A gestalt que se confere sozinha: abre as telas do site em 390 e 1280 px e, para cada título e
// rótulo de grupo, mede o espaço acima (até o que vem antes) e o espaço abaixo (até o próprio
// conteúdo). Falha quando o de cima não for pelo menos o dobro do de baixo. O princípio está em
// "Gestalt em toda tela", em docs/visual.md; a regra, em "Visual", em docs/decisoes.md.
//
//   npm run gestalt                         confere o servidor local em http://localhost:4321
//   npm run gestalt -- http://localhost:4400   confere outro servidor local
//   GESTALT_SO=memoria npm run gestalt      só as telas cujo nome bate com a expressão
//   GESTALT_TUDO=1 npm run gestalt          imprime também os títulos que passaram e os ignorados
//
// Precisa do servidor local no ar (npm run dev), com o acervo de exemplo e as fotos de exemplo
// enviadas (npm run fotos-de-exemplo). Fica fora do build: o build do Cloudflare não tem servidor
// nem navegador. A medida e o julgamento ficam em scripts/gestalt.mjs, testados em testes/gestalt.test.ts.

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { conferir, julgar } from './gestalt.mjs';

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

const ENDERECO = (process.argv[2] ?? process.env.GESTALT_BASE ?? 'http://localhost:4321').replace(/\/$/, '');
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(ENDERECO)) {
  console.error('A conferência só roda no servidor local, com o acervo de exemplo.');
  process.exit(1);
}
// "localhost" é ambíguo: no computador o servidor do Astro escuta só no IPv4, e no GitHub só no IPv6.
// Vale o primeiro endereço que responder
async function enderecoQueResponde() {
  const candidatos = ENDERECO.includes('//localhost')
    ? [ENDERECO.replace('//localhost', '//127.0.0.1'), ENDERECO.replace('//localhost', '//[::1]')]
    : [ENDERECO];
  for (const candidato of candidatos) {
    try {
      await fetch(`${candidato}/`, { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
      return candidato;
    } catch {
      // tenta o próximo
    }
  }
  console.error(`Nenhum servidor respondeu em ${candidatos.join(' nem em ')}. Suba o servidor local antes (npm run dev).`);
  process.exit(1);
}
const BASE = await enderecoQueResponde();

const LARGURAS = [
  { nome: 390, width: 390, height: 844 },
  { nome: 1280, width: 1280, height: 900 },
];

// O que conta como título ou rótulo de grupo: os títulos, a legenda de um conjunto de campos, o
// rótulo mono do sistema (.rotulo) e as peças de título e de rótulo das telas (bloco__titulo).
const TITULOS = 'h1, h2, h3, h4, h5, h6, legend, .rotulo, [class*="__titulo"], [class*="__rotulo"]';
// Os mapas (árvore e círculo) têm composição própria: só o que fica fora deles é conferido.
// O painel que flutua sobre o mapa (.pm: título, legenda, busca) fica fora do desenho e é conferido.
// O topo e o rodapé do site, a faixa do "Ver como" e a barra do Astro também ficam de fora.
const FORA = '.mapa, astro-dev-toolbar, .topo, .rodape, details.teste';
const PAINEL_DO_MAPA = '.pm';

// Na Nova memória, a etapa n: pela trilha numerada, quando há (na correção), ou por "Continuar"
const etapa = (n) => async (pagina) => {
  if ((await pagina.locator('ol.etapas button').count()) > 0) return pagina.locator('ol.etapas button').nth(n).click();
  for (let i = 0; i < n; i++) await pagina.locator('[data-etapa-continuar]').click();
};
// No mapa (árvore e círculo), abre o painel no celular e uma das partes dele
const abrirNoMapa = (parte) => async (pagina) => {
  if (await pagina.locator('.pm__abre').isVisible()) await pagina.locator('.pm__abre').click();
  await pagina.locator(`.pm__secao${parte} > summary`).click();
};
const ateAFrase = async (pagina) => {
  await pagina.locator('[name="titulo"]').fill('Almoço de aniversário da Vó Bela');
  await pagina.locator('input[name="tipo"]').first().check({ force: true });
  await pagina.locator('[data-etapa-continuar]').click();
};

// As telas, com ids do acervo de exemplo. "como" é a pessoa do "Ver como" (padrão: gui).
const TELAS = [
  { nome: 'painel', url: '/' },
  { nome: 'carta', url: '/carta', como: 'giovanna' },
  { nome: 'explorar', url: '/explorar', como: 'giovanna' },
  { nome: 'explorar-mural', url: '/explorar?ver=mural', como: 'giovanna' },
  { nome: 'explorar-lista', url: '/explorar?ver=lista', como: 'giovanna' },
  { nome: 'explorar-filtros', url: '/explorar', como: 'giovanna', antes: (p) => p.locator('.filtros > summary').click() },
  { nome: 'explorar-sem-resultado', url: '/explorar?tipo=viagem&decada=1950', como: 'giovanna' },
  { nome: 'tudo', url: '/tudo' },
  { nome: 'pessoas', url: '/pessoas', como: 'giovanna' },
  { nome: 'pessoa-voce', url: '/pessoas/giovanna', como: 'giovanna' },
  { nome: 'pessoa-parente', url: '/pessoas/vo-bela', como: 'giovanna' },
  { nome: 'pessoa-bicho', url: '/pessoas/chico', como: 'giovanna' },
  { nome: 'pessoa-de-fora', url: '/pessoas/ex-caio-amigo' },
  { nome: 'pessoa-gui', url: '/pessoas/gui', como: 'giovanna' },
  { nome: 'pessoa-elizete', url: '/pessoas/elizete' },
  { nome: 'pessoa-falecida', url: '/pessoas/ex-vo-tonho' },
  { nome: 'pessoa-historico', url: '/pessoas/vo-bela/historico' },
  { nome: 'pessoa-excluir', url: '/pessoas/ex-caio-amigo/excluir' },
  { nome: 'memoria', url: '/memorias/2025-natal', como: 'giovanna' },
  { nome: 'memoria-com-fotos', url: '/memorias/1994-festa-de-aniversario', como: 'giovanna' },
  { nome: 'memoria-sem-foto', url: '/memorias/2026-primeira-noite-em-casa', como: 'giovanna' },
  { nome: 'memoria-relato', url: '/memorias/2025-natal/relato' },
  { nome: 'memoria-historico', url: '/memorias/2025-natal/historico' },
  { nome: 'memoria-excluir', url: '/memorias/2025-natal/excluir' },
  { nome: 'memoria-fotos', url: '/memorias/2025-natal/fotos' },
  { nome: 'memoria-sugerir', url: '/memorias/2025-natal/sugerir', como: 'giovanna' },
  { nome: 'memoria-sugestoes', url: '/memorias/2025-natal/sugestoes' },
  { nome: 'memoria-compartilhar', url: '/memorias/2025-natal/compartilhar' },
  { nome: 'capitulos', url: '/capitulos', como: 'giovanna' },
  { nome: 'capitulo-reunido', url: '/capitulos/natais', como: 'giovanna' },
  { nome: 'capitulo-por-periodo', url: '/capitulos/infancia-da-giovanna', como: 'giovanna' },
  { nome: 'capitulo-epoca', url: '/capitulos/os-anos-90', como: 'giovanna' },
  { nome: 'capitulo-novo', url: '/capitulos/novo' },
  { nome: 'capitulo-editar', url: '/capitulos/natais/editar' },
  { nome: 'capitulo-excluir', url: '/capitulos/natais/excluir' },
  { nome: 'tema', url: '/temas/natal', como: 'giovanna' },
  { nome: 'nova-1', url: '/nova' },
  { nome: 'nova-2', url: '/nova', antes: ateAFrase },
  // "Quem estava?" com a lista de todos aberta, por família
  { nome: 'correcao-3-todos', url: '/nova?id=2025-natal', antes: async (p) => (await etapa(2)(p), p.locator('details.quem-estava__todos > summary').click()) },
  ...[1, 2, 3, 4, 5].map((n) => ({ nome: `correcao-${n + 1}`, url: '/nova?id=2025-natal', antes: etapa(n) })),
  { nome: 'rascunho-7', url: '/nova?id=2024-almoco-de-domingo', antes: etapa(6) },
  { nome: 'conta', url: '/conta', como: 'giovanna' },
  { nome: 'conta-admin', url: '/conta' },
  { nome: 'lixeira', url: '/lixeira' },
  { nome: 'circulo', url: '/circulo', como: 'giovanna' },
  { nome: 'arvore', url: '/arvore' },
  // Os ajustes e a legenda da árvore ficam fechados: abre cada um
  { nome: 'arvore-ajustes', url: '/arvore', antes: abrirNoMapa('[data-painel]') },
  { nome: 'arvore-legenda', url: '/arvore', antes: abrirNoMapa('[data-legenda]') },
  { nome: 'circulo-fora', url: '/circulo', como: 'giovanna', antes: abrirNoMapa('[data-fora-do-circulo]') },
  { nome: 'circulo-legenda', url: '/circulo', como: 'giovanna', antes: abrirNoMapa('[data-legenda]') },
  { nome: 'laco-casal', url: '/lacos/ex-tia-cida/ex-tio-paulo' },
  { nome: 'laco-separado', url: '/lacos/aguilar/elizete' },
  { nome: 'laco-amigos', url: '/lacos/ex-thiago/giovanna', como: 'giovanna' },
  { nome: 'laco-do-coracao', url: '/lacos/elizete/ex-dona-fatima', como: 'elizete' },
  { nome: 'pessoa-nova', url: '/pessoas/nova' },
  { nome: 'pessoa-editar', url: '/pessoas/vo-bela/editar' },
  { nome: 'pessoa-editar-muitos-lacos', url: '/pessoas/elizete/editar' },
  { nome: 'guiado-inicio', url: '/pessoas/ex-caio-amigo/editar?novo=1' },
  { nome: 'guiado-pais', url: '/pessoas/ex-caio-amigo/editar?novo=1&passo=pais&ramo=familia' },
  { nome: 'guiado-casal', url: '/pessoas/ex-caio-amigo/editar?novo=1&passo=casal&ramo=familia' },
  { nome: 'guiado-coracao', url: '/pessoas/ex-caio-amigo/editar?novo=1&passo=coracao&ramo=coracao' },
  { nome: 'guiado-fim', url: '/pessoas/ex-caio-amigo/editar?novo=1&passo=fim&ramo=coracao' },
  { nome: 'admin-arvore', url: '/admin/arvore' },
  { nome: 'admin-carta', url: '/admin/carta' },
  { nome: 'admin-duplicados', url: '/admin/duplicados' },
  { nome: 'admin-espelho', url: '/admin/espelho' },
  { nome: 'admin-exclusoes', url: '/admin/exclusoes' },
  { nome: 'admin-familias', url: '/admin/familias' },
  { nome: 'admin-fotos-soltas', url: '/admin/fotos-soltas' },
  { nome: 'admin-tipos', url: '/admin/tipos' },
  { nome: 'admin-transcricao', url: '/admin/transcricao' },
];

// Exceções de propósito: { tela (opcional), seletor (texto exato ou expressão), motivo }.
// O seletor é o que a conferência imprime na falha.
export const EXCECOES = [
  {
    seletor: /> p\.entrada__quando\.rotulo$/,
    anterior: /> div\.(marca|epoca)\b/,
    motivo:
      'Na linha do tempo, a marca que abre ou fecha um capítulo e a aba da época fazem parte do desenho dos trilhos: a entrada seguinte encosta nelas de propósito, e a marca que abre nomeia as entradas abaixo dela.',
  },
  {
    seletor: /^div\.entrada__texto > h3\.entrada__titulo/,
    anterior: /> div\.entrada__foto$/,
    motivo:
      'Na linha do tempo, o título da memória fica embaixo da própria foto: a foto é do mesmo grupo (a entrada), e não um grupo anterior. Entre uma entrada e outra o espaço já é o dobro.',
  },
];

// Roda dentro da página: acha os títulos e mede cada um. Devolve só caixas e nomes.
function medir({ titulos, fora, painel }) {
  const visivel = (el) => {
    if (!(el instanceof HTMLElement) || el.getClientRects().length === 0) return false;
    // O que está dentro de um <details> fechado continua com caixa no Chromium, mas não aparece
    if (!el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return false;
    const estilo = getComputedStyle(el);
    if (estilo.visibility === 'hidden' || estilo.position === 'absolute' || estilo.position === 'fixed') return false;
    return true;
  };
  // Um envoltório sem limite visível (sem fundo, borda nem sombra) não separa nada: o espaço passa
  // por ele, e o recuo dele conta como espaço vazio
  const temLimite = (el, lado) => {
    const e = getComputedStyle(el);
    const fundo = !(e.backgroundColor === 'transparent' || /rgba\(.*,\s*0\)$/.test(e.backgroundColor)) || e.backgroundImage !== 'none';
    const borda = parseFloat(lado === 'cima' ? e.borderTopWidth : e.borderBottomWidth) > 0;
    return fundo || borda || e.boxShadow !== 'none' || /^(img|svg|video|canvas|input|select|textarea|button|iframe|hr|audio)$/i.test(el.tagName);
  };
  const temTexto = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  // Onde o que se vê de um bloco começa e termina: o recuo e as margens de dentro não contam
  const borda = (el, lado) => {
    const r = el.getBoundingClientRect();
    const e = getComputedStyle(el);
    if (temLimite(el, lado)) return lado === 'cima' ? r.top : r.bottom;
    // Com texto, vale a linha do texto: a área de toque em volta dele (altura mínima, margens
    // negativas, centralizado) é vazia para quem olha
    if (temTexto(el)) {
      const faixa = document.createRange();
      faixa.selectNodeContents(el);
      const t = faixa.getBoundingClientRect();
      return lado === 'cima' ? t.top : t.bottom;
    }
    const filhos = [...el.children].filter(visivel);
    if (filhos.length === 0) return lado === 'cima' ? r.top + parseFloat(e.paddingTop) : r.bottom - parseFloat(e.paddingBottom);
    const valores = filhos.map((f) => borda(f, lado));
    // O que passa da caixa de um bloco que corta (overflow) não aparece
    const corta = e.overflowY !== 'visible';
    return lado === 'cima' ? Math.max(Math.min(...valores), corta ? r.top : -Infinity) : Math.min(Math.max(...valores), corta ? r.bottom : Infinity);
  };
  const caixaVista = (el) => {
    const r = el.getBoundingClientRect();
    return { top: borda(el, 'cima') + scrollY, bottom: borda(el, 'baixo') + scrollY, left: r.left, right: r.right };
  };
  // Os irmãos como aparecem na tela: um envoltório com display: contents não tem caixa, e os filhos
  // dele contam como irmãos
  const irmaos = (el) => {
    const lista = [];
    const juntar = (x) => {
      if (x === el) return;
      if (getComputedStyle(x).display === 'contents') for (const f of x.children) juntar(f);
      else if (visivel(x)) lista.push(x);
    };
    for (const x of el.parentElement?.children ?? []) juntar(x);
    return lista;
  };
  // O irmão logo acima (ou logo abaixo) do título na tela, na mesma coluna. É a ordem da tela que
  // vale, e não a do código: no celular a grade muda a ordem das partes.
  const irmaoVisivel = (el, direcao, ref) => {
    let melhor = null;
    let melhorY = direcao === 'antes' ? -Infinity : Infinity;
    for (const x of irmaos(el)) {
      const r = x.getBoundingClientRect();
      if (Math.min(r.right, ref.right) - Math.max(r.left, ref.left) <= 0) continue;
      if (direcao === 'antes' && r.bottom <= ref.top + 1 && r.bottom > melhorY) [melhor, melhorY] = [x, r.bottom];
      if (direcao === 'depois' && r.top >= ref.bottom - 1 && r.top < melhorY) [melhor, melhorY] = [x, r.top];
    }
    return melhor;
  };
  const filhosVisiveis = (el) => [...el.children].filter(visivel);
  const PARADA = new Set(['BODY', 'MAIN', 'HTML']);
  // Um grupo com nome próprio: o título que é tudo o que há dentro dele não tem conteúdo abaixo
  const GRUPO = new Set(['SECTION', 'ARTICLE', 'FIELDSET', 'LI', 'ASIDE', 'NAV', 'FORM', 'DETAILS', 'DIALOG']);
  // O bloco do título: sobe enquanto o pai só tem o título dentro (um cabeçalho que embrulha o h2)
  const blocoDoTitulo = (el) => {
    let bloco = el;
    for (;;) {
      const pai = bloco.parentElement;
      if (!pai || PARADA.has(pai.tagName) || GRUPO.has(pai.tagName) || filhosVisiveis(pai).length !== 1) return bloco;
      bloco = pai;
    }
  };
  // O vizinho no fluxo: o irmão visível; se não há, sobe por envoltórios sem limite visível e tenta
  // de novo. Abaixo, não sai do grupo do título: o que vem depois do grupo não é o conteúdo dele.
  const vizinho = (bloco, direcao) => {
    const ref = bloco.getBoundingClientRect();
    let atual = bloco;
    for (;;) {
      const irmao = irmaoVisivel(atual, direcao, ref);
      if (irmao) return irmao;
      // Abaixo: se o título tem irmãos, mas nenhum embaixo, o conteúdo dele está ao lado (o rótulo
      // à esquerda das opções), e o que vem depois do grupo não conta
      if (direcao === 'depois' && irmaos(atual).length > 0) return null;
      const pai = atual.parentElement;
      if (!pai || PARADA.has(pai.tagName)) return null;
      if (direcao === 'depois' && GRUPO.has(pai.tagName)) return null;
      if (temLimite(pai, direcao === 'antes' ? 'cima' : 'baixo')) return null;
      atual = pai;
    }
  };
  // O sobretítulo: as linhas curtas que abrem o mesmo cabeçalho, logo acima do título (a data e o
  // grupo acima do nome da memória, o "Capítulo" acima do nome do capítulo, o parentesco acima do
  // nome da pessoa). Elas e o título são um bloco só. Curta: até 6rem de altura (o parentesco em letra de mão é alto), no máximo três.
  const sobretitulo = (anterior, bloco) => {
    if (anterior.parentElement !== bloco.parentElement) return false;
    const antes = filhosVisiveis(bloco.parentElement);
    const ate = antes.indexOf(bloco);
    if (ate < 1 || ate > 3) return false;
    const curta = parseFloat(getComputedStyle(document.documentElement).fontSize) * 6;
    return antes.slice(0, ate).every((el) => el.getBoundingClientRect().height <= curta && !el.matches(titulos));
  };
  // Um fio embaixo, sem fundo: a linha que separa um item do outro (região comum)
  const fio = (el) => {
    const e = getComputedStyle(el);
    return parseFloat(e.borderBottomWidth) > 0 && !temLimite(el, 'cima') && e.backgroundImage === 'none';
  };
  // O que vem antes é outro título, ou termina num (uma pilha de títulos: o da página e logo o de uma
  // seção, o resumo de um grupo que abre e o primeiro rótulo dentro dele)
  const ehTitulo = (el) => el.matches(titulos) || el.tagName === 'SUMMARY' || [...el.children].filter(visivel).at(-1)?.matches(titulos + ', summary');
  const nome = (el) => {
    const so = (x) => x.tagName.toLowerCase() + [...x.classList].filter((c) => !/^astro-/.test(c)).map((c) => `.${c}`).join('');
    const pai = el.parentElement;
    return pai ? `${so(pai)} > ${so(el)}` : so(el);
  };
  const medidas = [];
  const vistos = new Set();
  for (const el of document.querySelectorAll(titulos)) {
    if ((el.closest(fora) && !el.closest(painel)) || !visivel(el) || vistos.has(el)) continue;
    // Um título dentro de outro (o .rotulo dentro de um h2) conta uma vez só, pelo de fora
    if (el.parentElement?.closest(titulos)) continue;
    vistos.add(el);
    // Rótulo dentro de uma linha de texto (um span no meio do parágrafo) não é título de grupo
    if (getComputedStyle(el).display.startsWith('inline')) continue;
    const bloco = blocoDoTitulo(el);
    const anterior = vizinho(bloco, 'antes');
    const proximo = vizinho(bloco, 'depois');
    medidas.push({
      seletor: nome(el),
      texto: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 50),
      titulo: caixaVista(bloco),
      anterior: anterior
        ? { ...caixaVista(anterior), seletor: nome(anterior), titulo: !!ehTitulo(anterior), sobretitulo: sobretitulo(anterior, bloco), fio: fio(anterior) }
        : null,
      proximo: proximo ? { ...caixaVista(proximo), seletor: nome(proximo) } : null,
    });
  }
  return medidas;
}

async function rodar() {
  const { chromium } = carregarPlaywright();
  const navegador = await chromium.launch();
  const filtro = process.env.GESTALT_SO ? new RegExp(process.env.GESTALT_SO) : null;
  const medidas = [];
  for (const largura of LARGURAS) {
    const contexto = await navegador.newContext({
      viewport: { width: largura.width, height: largura.height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    });
    const pagina = await contexto.newPage();
    pagina.setDefaultTimeout(10000);
    for (const tela of TELAS) {
      if (filtro && !filtro.test(tela.nome)) continue;
      const endereco = `${BASE}/como/${tela.como ?? 'gui'}?volta=${encodeURIComponent(tela.url)}`;
      // A primeira visita a uma página no servidor local pode demorar enquanto ele compila
      const ir = () => pagina.goto(endereco, { waitUntil: 'networkidle', timeout: 60000 });
      const resposta = await ir().catch(ir);
      if (!resposta || resposta.status() >= 400) {
        console.error(`Não abriu: ${tela.nome} (${tela.url}), resposta ${resposta?.status()}`);
        process.exitCode = 2;
        continue;
      }
      try {
        if (tela.antes) await tela.antes(pagina);
      } catch (erro) {
        console.error(`Não preparou: ${tela.nome} (${erro.message.split('\n')[0]})`);
        process.exitCode = 2;
        continue;
      }
      await pagina.evaluate(() => document.fonts.ready);
      await pagina.waitForTimeout(150);
      const daTela = await pagina.evaluate(medir, { titulos: TITULOS, fora: FORA, painel: PAINEL_DO_MAPA });
      for (const m of daTela) medidas.push({ ...m, tela: tela.nome, largura: largura.nome });
    }
    await contexto.close();
  }
  await navegador.close();

  if (process.env.GESTALT_TUDO) {
    for (const m of medidas) {
      const r = julgar(m);
      console.log(`[${r.situacao}${r.motivo ? `: ${r.motivo}` : ''}] ${m.tela} @ ${m.largura}px  ${m.seletor}  "${m.texto}"  acima ${r.acima ?? "-"}, abaixo ${r.abaixo ?? "-"}  [antes: ${m.anterior?.seletor ?? "-"}; depois: ${m.proximo?.seletor ?? "-"}]`);
    }
  }
  const { falhas, usadas, conferidos } = conferir(medidas, EXCECOES);
  for (const f of falhas) {
    console.log(`${f.tela} @ ${f.largura}px  ${f.seletor}  "${f.texto}"  acima ${f.acima}px, abaixo ${f.abaixo}px`);
    console.log(`    antes: ${f.anterior}\n    depois: ${f.proximo}`);
  }
  const sobrando = EXCECOES.filter((e) => !usadas.includes(e));
  for (const e of sobrando) console.log(`Exceção que não foi usada (pode sair da lista?): ${e.tela ?? 'toda tela'} ${e.seletor}`);
  console.log(
    falhas.length
      ? `\n${falhas.length} título(s) com o espaço acima menor que o dobro do de baixo, de ${conferidos} conferidos.`
      : `\nOs ${conferidos} títulos conferidos têm acima pelo menos o dobro do espaço de baixo.`,
  );
  if (falhas.length) process.exitCode = 1;
}

await rodar();
