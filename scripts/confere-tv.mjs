// A conferência do modo TV a partir de 62rem: a barra (proposta A da sessão X, escolhida pelo Gui em
// 22/11/2026, com os símbolos de TV e o ocultar). Abre todas as memórias que o modo TV mostra, mais
// as que vierem em TV_MAIS (a de estresse, criada só no banco local), em cinco janelas e nas três
// deitadas do celular (aplicação da E1), com "Ajustes"
// fechado e aberto, com "Só as fotos" e com os controles ocultos. Em cada estado confere:
//
//   1. a página não rola;
//   2. todo controle está dentro da janela e é alcançado pelo teclado (Tab), com o foco à vista;
//   3. todo botão de símbolo tem nome acessível, e o nome escrito aparece no foco, dentro da janela,
//      sem cobrir a memória nem outro controle;
//   4. nenhum texto fica cortado sem um caminho para ler ("Abrir esta memória");
//   5. nenhum elemento cobre outro: nada por cima de um texto ou de um controle, e os textos não
//      se sobrepõem. A folha de "Ajustes", que flutua de propósito, não conta como defeito;
//   6. ocultar e reexibir: o botão tira a barra e o alto da tela e do teclado e põe o foco no botão
//      do canto, que diz o nome; a seta passa para a memória seguinte, que chega com eles ocultos; o
//      Enter no botão do canto os traz de volta, com o foco no botão de ocultar;
//   7. as setas: com o foco na barra, andam pelos botões e não trocam de memória; o Esc fecha
//      "Ajustes" e devolve o foco ao botão que a abriu.
//
// Mede só depois de as fontes carregarem (no QA de 23/11/2026 a fonte de reserva distorceu as
// medidas) e falha se a fonte do título não for a do site.
//
//   npm run dev -- --port 4400     (e npm run fotos-de-exemplo, uma vez por banco local)
//   npm run tv -- http://localhost:4400
//
// TV_MAIS=id1,id2 soma memórias; TV_JANELAS=1280x720 limita as janelas; TV_SO=id1,id2 limita as memórias.
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

const base = (process.argv[2] ?? 'http://localhost:4400').replace(/\/$/, '');
// As janelas deitadas abaixo de 62rem (o celular espelhado na TV) entram na conferência
const JANELAS = (process.env.TV_JANELAS ?? '1280x720,1280x800,1366x768,1440x900,1920x1080,844x390,932x430,667x375').split(',').map((j) => j.split('x').map(Number));
const MAIS = (process.env.TV_MAIS ?? '').split(',').filter(Boolean);
const SO = (process.env.TV_SO ?? '').split(',').filter(Boolean);

/** Os ids das memórias, na ordem do modo TV: segue "Próxima" a partir da primeira */
async function memoriasDaTv() {
  const ids = [];
  let endereco = `${base}/explorar?ver=tv`;
  while (endereco && ids.length < 500) {
    const html = await (await fetch(endereco)).text();
    const daVez = /href="\/memorias\/([^"/?#]+)"/.exec(html)?.[1];
    if (!daVez || ids.includes(daVez)) break;
    ids.push(daVez);
    const proxima = /<a\b[^>]*data-palco-depois[^>]*>/.exec(html)?.[0];
    const href = proxima && /href="([^"]+)"/.exec(proxima)?.[1];
    endereco = href ? new URL(href.replaceAll('&amp;', '&'), base).href : '';
  }
  return ids;
}

/** Roda na página: mede um estado e devolve os defeitos, cada um com o que e onde */
function medir(estado) {
  const palco = document.querySelector('[data-palco]');
  const falhas = [];
  const dentro = (r) => r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
  const visivel = (e) => {
    if (!e || !e.isConnected) return false;
    const estilo = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return estilo.visibility !== 'hidden' && estilo.display !== 'none' && r.width > 0 && r.height > 0 && !e.closest('[hidden]') && !e.closest('details:not([open]) > :not(summary)');
  };
  const nome = (e) => e.getAttribute('aria-label') ?? ((e.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 28) || e.className);
  // O que está por cima de um ponto do elemento: ele mesmo, um filho ou um ancestral não contam
  const coberto = (e) => {
    const r = e.getBoundingClientRect();
    const culpados = new Set();
    for (const fx of [0.12, 0.5, 0.88])
      for (const fy of [0.25, 0.5, 0.75]) {
        const x = r.left + r.width * fx;
        const y = r.top + r.height * fy;
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
        const topo = document.elementFromPoint(x, y);
        if (topo && !e.contains(topo) && !topo.contains(e)) culpados.add(topo.closest('.palco__extra, .palco__principal, .palco__partes, .palco__controles, .palco__topo > *, .palco__texto > *') ?? topo);
      }
    return [...culpados];
  };

  // 1. A página não rola
  const raiz = document.documentElement;
  scrollTo(0, 200);
  if (raiz.scrollHeight > innerHeight + 1 || raiz.scrollWidth > innerWidth + 1 || scrollY !== 0) falhas.push(`rola ${raiz.scrollHeight - innerHeight} px`);
  scrollTo(0, 0);

  const ajustesAbertos = palco.querySelector('[data-palco-ajustes][open]');
  const ocultos = palco.hasAttribute('data-oculto');

  // 2. Os controles: dentro da janela, sem nada por cima
  const controles = [...palco.querySelectorAll('a[href], button, summary')].filter((e) => visivel(e) && !e.closest('.palco__principal') && !e.classList.contains('palco__principal'));
  for (const e of palco.querySelectorAll('[data-confere]')) e.removeAttribute('data-confere');
  controles.forEach((c, n) => c.setAttribute('data-confere', String(n)));
  const aVistaOcultos = controles.filter((c) => !c.hasAttribute('data-palco-reexibir'));
  if (ocultos && aVistaOcultos.length) falhas.push(`ocultos, mas à vista: ${aVistaOcultos.map(nome).join(' | ')}`);
  if (ocultos && aVistaOcultos.length === controles.length) falhas.push('ocultos, sem o botão do canto que os traz de volta');
  for (const c of controles) {
    if (ajustesAbertos && c.closest('.palco__texto')) continue;
    if (!dentro(c.getBoundingClientRect())) falhas.push(`fora da janela: ${nome(c)}`);
    const por = coberto(c);
    if (por.length) falhas.push(`coberto: ${nome(c)} por ${por.map((p) => p.className || p.tagName).join(', ')}`);
  }
  // 3. Todo botão de símbolo tem nome acessível e o nome escrito igual
  for (const b of palco.querySelectorAll('.botao-simbolo')) {
    const acessivel = b.getAttribute('aria-label')?.trim();
    const escrito = b.querySelector('.botao-simbolo__nome')?.textContent?.trim();
    if (!acessivel || acessivel !== escrito) falhas.push(`símbolo sem nome: ${b.outerHTML.slice(0, 60)}`);
  }

  // 4. Texto cortado, e o caminho para ler
  const textos = estado === 'sofotos' || ocultos ? [] : [...palco.querySelectorAll('.palco__texto .carimbo > span, .palco__titulo, .palco__trecho > p, .palco__texto > .ficha, .palco__principal .polaroid__legenda')].filter(visivel);
  // Cortado é faltar pelo menos meia linha: a perna de uma letra passa da caixa sem ser corte
  const cortado = (e) => {
    const estilo = getComputedStyle(e);
    const linha = parseFloat(estilo.lineHeight) || parseFloat(estilo.fontSize) * 1.2;
    return e.scrollHeight - e.clientHeight > linha / 2 || e.scrollWidth > e.clientWidth + 2;
  };
  const cortados = textos.filter(cortado);
  if (cortados.length) {
    const caminhos = [...palco.querySelectorAll('.palco__texto > p > a[href^="/memorias/"]')].filter(visivel);
    if (!ajustesAbertos && !caminhos.some((c) => dentro(c.getBoundingClientRect()) && coberto(c).length === 0)) falhas.push(`cortado sem caminho: ${cortados.map(nome).join(' | ')}`);
  }

  // 5. Nada por cima dos textos, e os textos não se sobrepõem
  if (!ajustesAbertos) {
    const blocos = [...palco.querySelectorAll('.palco__texto > *, .palco__topo > *')].filter(visivel);
    for (const b of blocos) {
      if (!dentro(b.getBoundingClientRect()) && !b.matches('p:has(.carimbo)')) falhas.push(`fora da janela: ${nome(b)}`);
      const por = coberto(b);
      if (por.length) falhas.push(`coberto: ${nome(b)} por ${por.map((p) => p.className || p.tagName).join(', ')}`);
    }
    // O carimbo é girado: a caixa dele passa um pouco da linha. Entre os outros, nenhuma sobra.
    const retos = blocos.filter((b) => !b.querySelector('.carimbo'));
    for (let i = 0; i < retos.length; i++)
      for (let j = i + 1; j < retos.length; j++) {
        const a = retos[i].getBoundingClientRect();
        const b = retos[j].getBoundingClientRect();
        const sobra = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
        // a folga do título, que guarda os acentos, encosta de propósito no vizinho
        if (sobra && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 8) falhas.push(`um sobre o outro: ${nome(retos[i])} e ${nome(retos[j])}`);
      }
  }
  if (ajustesAbertos) {
    const folha = ajustesAbertos.querySelector('.palco__partes');
    if (!dentro(folha.getBoundingClientRect())) falhas.push('a folha de "Ajustes" sai da janela');
  }
  return {
    falhas,
    controles: controles.map(nome),
    cortados: cortados.map((e) => e.className.split(' ')[0]),
    foto: Math.round(palco.querySelector('.palco__principal')?.getBoundingClientRect().width ?? 0),
  };
}

/** Roda na página, com o foco num botão de símbolo: o nome escrito aparece, na janela, sem cobrir nada */
function medirONome() {
  const botao = document.activeElement;
  if (!botao?.classList.contains('botao-simbolo')) return null;
  const etiqueta = botao.querySelector('.botao-simbolo__nome');
  const estilo = getComputedStyle(etiqueta);
  const r = etiqueta.getBoundingClientRect();
  const falhas = [];
  const qual = botao.getAttribute('aria-label');
  if (estilo.visibility !== 'visible' || Number(estilo.opacity) < 0.99) falhas.push(`o nome não aparece no foco: ${qual}`);
  if (!botao.matches(':focus-visible')) falhas.push(`foco sem marca à vista: ${qual}`);
  if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) falhas.push(`o nome sai da janela: ${qual}`);
  // Embaixo da etiqueta só pode haver o fundo: o palco, a cena, a barra e o próprio botão
  const palco = document.querySelector('[data-palco]');
  const fundo = (e) => e === etiqueta || e.contains(etiqueta) || [palco, palco.querySelector('.palco__cena'), document.body, document.documentElement].includes(e);
  const embaixo = new Set();
  for (const fx of [0.05, 0.5, 0.95])
    for (const fy of [0.15, 0.5, 0.85])
      for (const e of document.elementsFromPoint(r.left + r.width * fx, r.top + r.height * fy)) {
        if (fundo(e)) continue;
        embaixo.add(e.closest('.palco__extra, .palco__principal, .palco__partes, .botao-simbolo, .palco__topo > *, .palco__texto > *, a, button') ?? e);
      }
  if (embaixo.size) falhas.push(`o nome de ${qual} cobre ${[...embaixo].map((e) => e.getAttribute('aria-label') || (typeof e.className === 'string' && e.className) || e.tagName).join(', ')}`);
  return { qual, falhas };
}

/** Passa por todos os controles com o Tab e devolve os que receberam o foco e o que o nome de cada símbolo cobre */
async function peloTeclado(pagina) {
  await pagina.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  const vistos = [];
  const fora = [];
  const intrusos = [];
  const nomes = [];
  for (let n = 0; n < 60; n++) {
    await pagina.keyboard.press('Tab');
    const foco = await pagina.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body || !e.closest('[data-palco]')) return null;
      const r = e.getBoundingClientRect();
      return { n: e.getAttribute('data-confere'), nome: e.getAttribute('aria-label') ?? (e.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 28), dentro: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && getComputedStyle(e).visibility !== 'hidden' };
    });
    // Depois do último controle, o foco sai da página e volta ao começo: a volta inteira conta
    if (!foco) continue;
    // Foco num elemento que a medida não contou como controle à vista: está escondido ou coberto
    if (foco.n === null) {
      if (!intrusos.includes(foco.nome)) intrusos.push(foco.nome);
      else break;
      continue;
    }
    if (vistos.includes(Number(foco.n))) break;
    vistos.push(Number(foco.n));
    if (!foco.dentro) fora.push(foco.nome);
    const doNome = await pagina.evaluate(medirONome);
    if (doNome) nomes.push(doNome);
  }
  return { vistos, fora, intrusos, nomes };
}

/** Roda na página: o estado das teclas, para as conferências de ocultar, das setas e do Esc */
function estadoDaTv() {
  const palco = document.querySelector('[data-palco]');
  const ativo = document.activeElement;
  return {
    m: new URL(location.href).searchParams.get('m'),
    oculto: palco.hasAttribute('data-oculto'),
    barraVisivel: getComputedStyle(palco.querySelector('.palco__controles')).visibility === 'visible',
    foco: ativo?.getAttribute('aria-label') ?? ativo?.textContent?.trim() ?? '',
    ajustes: Boolean(palco.querySelector('[data-palco-ajustes][open]')),
  };
}

const { chromium } = playwright();
const navegador = await chromium.launch();
const ids = SO.length ? SO : [...(await memoriasDaTv()), ...MAIS];
console.log(`${ids.length} memórias (${MAIS.length} a mais: ${MAIS.join(', ') || 'nenhuma'})`);

const todas = [];
const nomesVistos = new Set();
for (const [largura, altura] of JANELAS) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: altura }, reducedMotion: 'reduce' });
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  if (process.env.TV_DEPURA) pagina.on('framenavigated', (f) => f === pagina.mainFrame() && console.log('navegou', f.url()));
  const linha = { janela: `${largura} × ${altura}`, fechado: 0, ajustes: 0, sofotos: 0, ocultos: 0, cortadas: 0, foto: 0 };
  for (const id of ids) {
    await pagina.goto(`${base}/explorar?ver=tv&m=${encodeURIComponent(id)}`, { waitUntil: 'load' });
    await pagina.evaluate(() => {
      localStorage.removeItem('tv-so-fotos');
      localStorage.removeItem('tv-animacao');
      return document.fonts.ready;
    });
    await pagina.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
    const fonte = await pagina.evaluate(() => {
      const titulo = document.querySelector('.palco__titulo');
      const estilo = getComputedStyle(titulo);
      return { familia: estilo.fontFamily.split(',')[0].trim(), carregada: document.fonts.check(`${estilo.fontWeight} 40px ${estilo.fontFamily.split(',')[0].trim()}`) };
    });
    const anotar = (estado, medida, teclado, mais = []) => {
      const falhas = [...medida.falhas, ...mais];
      if (!fonte.carregada) falhas.push(`a fonte do título não carregou: ${fonte.familia}`);
      if (teclado) {
        const semFoco = medida.controles.map((_, n) => n).filter((n) => !teclado.vistos.includes(n)).map((n) => medida.controles[n]);
        if (semFoco.length) falhas.push(`sem alcance pelo teclado: ${semFoco.join(' | ')}`);
        if (teclado.intrusos.length) falhas.push(`foco em algo escondido ou coberto: ${teclado.intrusos.join(' | ')}`);
        if (teclado.fora.length) falhas.push(`foco fora da janela: ${teclado.fora.join(' | ')}`);
        for (const n of teclado.nomes) {
          nomesVistos.add(n.qual);
          falhas.push(...n.falhas);
        }
      }
      if (falhas.length) {
        linha[estado]++;
        todas.push({ janela: linha.janela, estado, id, falhas });
      }
    };
    const esperar = () => pagina.waitForTimeout(60);

    // Fechado
    let medida = await pagina.evaluate(medir, 'fechado');
    anotar('fechado', medida, await peloTeclado(pagina));
    if (medida.cortados.length) linha.cortadas++;
    linha.foto = medida.foto;

    // As setas na barra: do último botão para a esquerda, o foco anda e a memória fica; na ponta, o
    // foco para ali
    const mais = [];
    await pagina.focus('[data-palco-ocultar]');
    await pagina.keyboard.press('ArrowLeft');
    await esperar();
    let estado = await pagina.evaluate(estadoDaTv);
    if (estado.m !== id) mais.push('a seta na barra trocou de memória');
    if (estado.foco !== 'Ajustes') mais.push(`a seta na barra não andou do ocultar para "Ajustes" (foi para ${estado.foco})`);
    await pagina.focus('[data-palco-ocultar]');
    await pagina.keyboard.press('ArrowRight');
    await esperar();
    estado = await pagina.evaluate(estadoDaTv);
    if (estado.m !== id || estado.foco !== 'Ocultar os controles') mais.push('na ponta da barra, a seta não parou');

    // "Ajustes" aberto, pelo teclado: Enter abre, o Esc fecha e devolve o foco
    await pagina.focus('[data-palco-ajustes] > summary');
    await pagina.keyboard.press('Enter');
    await esperar();
    medida = await pagina.evaluate(medir, 'ajustes');
    anotar('ajustes', medida, await peloTeclado(pagina));
    await pagina.focus('[data-palco-ajustes] > summary');
    await pagina.keyboard.press('Escape');
    await esperar();
    estado = await pagina.evaluate(estadoDaTv);
    if (estado.ajustes || estado.foco !== 'Ajustes') mais.push(`o Esc não fechou "Ajustes" de volta ao botão (foco em ${estado.foco})`);

    // Ocultar os controles: o foco vai para o botão do canto, que diz o nome; a seta passa para a
    // memória seguinte sem trazer a barra; o Enter no botão do canto a traz, com o foco no ocultar.
    // Pelo teclado, como no controle remoto
    await pagina.focus('[data-palco-ocultar]');
    await pagina.keyboard.press('Enter');
    await esperar();
    medida = await pagina.evaluate(medir, 'ocultos');
    estado = await pagina.evaluate(estadoDaTv);
    if (!estado.oculto || estado.barraVisivel) mais.push('o botão não ocultou os controles');
    if (estado.foco !== 'Mostrar os controles') mais.push(`ao ocultar, o foco não foi para o botão do canto (foi para ${estado.foco})`);
    const doCanto = await pagina.evaluate(medirONome);
    if (doCanto) {
      nomesVistos.add(doCanto.qual);
      mais.push(...doCanto.falhas);
    }
    const temProxima = await pagina.evaluate(() => Boolean(document.querySelector('[data-palco-depois]')?.getAttribute('href')));
    if (temProxima) {
      await pagina.keyboard.press('ArrowRight');
      await pagina.waitForFunction((antes) => new URL(location.href).searchParams.get('m') !== antes, id, { timeout: 5000 }).catch(() => undefined);
      await esperar();
      estado = await pagina.evaluate(estadoDaTv);
      if (estado.m === id) mais.push('com os controles ocultos, a seta não passou para a memória seguinte');
      if (!estado.oculto || estado.barraVisivel) mais.push('com os controles ocultos, a memória seguinte chegou com a barra');
      if (estado.foco !== 'Mostrar os controles') mais.push(`na memória seguinte, o foco não ficou no botão do canto (foi para ${estado.foco})`);
    }
    await pagina.keyboard.press('Enter');
    await esperar();
    estado = await pagina.evaluate(estadoDaTv);
    if (estado.oculto || !estado.barraVisivel) mais.push('o botão do canto não trouxe os controles de volta');
    if (estado.foco !== 'Ocultar os controles') mais.push(`o foco não voltou para o ocultar (foi para ${estado.foco})`);
    anotar('ocultos', medida, null, mais);
    if (temProxima) {
      await pagina.goto(`${base}/explorar?ver=tv&m=${encodeURIComponent(id)}`, { waitUntil: 'load' });
      await pagina.evaluate(() => document.fonts.ready);
      await pagina.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
    }

    // "Só as fotos", com os controles à vista (eles somem depois de 5 segundos sem gesto)
    await pagina.evaluate(() => document.querySelector('[data-palco-so-fotos]').click());
    await pagina.mouse.move(300 + Math.random() * 20, 300);
    medida = await pagina.evaluate(medir, 'sofotos');
    anotar('sofotos', medida, await peloTeclado(pagina));
    await pagina.evaluate(() => localStorage.removeItem('tv-so-fotos'));
  }

  // Tocar e pausar no mesmo botão: o nome aparece no foco, o espaço pausa e a tecla de mídia retoma,
  // e o símbolo, o nome escrito e o nome acessível trocam juntos
  await pagina.goto(`${base}/explorar?ver=tv&m=${encodeURIComponent(ids[0])}&passar=15`, { waitUntil: 'load' });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  await pagina.focus('[data-palco-pausa]');
  await pagina.keyboard.press('Shift');
  const tocar = [];
  const doNome = await pagina.evaluate(medirONome);
  if (doNome) {
    nomesVistos.add(doNome.qual);
    tocar.push(...doNome.falhas);
  }
  const pausa = () => pagina.evaluate(() => {
    const b = document.querySelector('[data-palco-pausa]');
    return `${b.getAttribute('aria-label')}|${b.querySelector('.botao-simbolo__nome').textContent}|${b.querySelector('svg').dataset.simbolo}`;
  });
  if ((await pausa()) !== 'Pausar|Pausar|pausar') tocar.push(`passando sozinho, o botão diz ${await pausa()}`);
  await pagina.keyboard.press(' ');
  if ((await pausa()) !== 'Retomar|Retomar|tocar') tocar.push(`o espaço não pausou: ${await pausa()}`);
  nomesVistos.add('Retomar');
  await pagina.keyboard.press('MediaPlayPause');
  if ((await pausa()) !== 'Pausar|Pausar|pausar') tocar.push(`a tecla de mídia não retomou: ${await pausa()}`);
  if (tocar.length) todas.push({ janela: linha.janela, estado: 'tocar', id: ids[0], falhas: tocar });

  // Com os controles ocultos, "Passar sozinho" continua, e a memória seguinte chega com eles ocultos.
  // Só na primeira janela: o tempo mais curto é de 8 segundos.
  if (ids.length > 1 && largura === JANELAS[0][0] && altura === JANELAS[0][1]) {
    await pagina.goto(`${base}/explorar?ver=tv&m=${encodeURIComponent(ids[0])}&passar=8`, { waitUntil: 'load' });
    await pagina.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
    await pagina.click('[data-palco-ocultar]');
    await pagina.waitForTimeout(9500);
    const depois = await pagina.evaluate(estadoDaTv);
    if (depois.m === ids[0] || !depois.oculto || depois.barraVisivel) todas.push({ janela: linha.janela, estado: 'ocultos', id: ids[0], falhas: [`passando sozinho, a memória seguinte não chegou com os controles ocultos (${JSON.stringify(depois)})`] });
  }

  if (erros.length) todas.push({ janela: linha.janela, estado: 'script', id: '', falhas: [...new Set(erros)] });
  console.log(`${linha.janela}: fechado ${linha.fechado}, ajustes ${linha.ajustes}, ocultos ${linha.ocultos}, só as fotos ${linha.sofotos} com defeito; ${linha.cortadas} com texto cortado na coluna; foto de ${linha.foto} px`);
  await contexto.close();
}
await navegador.close();

console.log(`Nomes conferidos no foco: ${[...nomesVistos].join(', ')}`);
for (const f of todas.slice(0, 60)) console.log(`  ${f.janela} ${f.estado} ${f.id}: ${f.falhas.join('; ')}`);
if (todas.length > 60) console.log(`  … e mais ${todas.length - 60}`);
console.log(todas.length ? `\n${todas.length} estados com defeito.` : '\nNenhum defeito: nada rola, todo controle está na janela e no teclado, todo símbolo diz o nome sem cobrir nada, nenhum texto cortado sem caminho, nada cobre nada, e ocultar, reexibir, as setas e o Esc fazem o que devem.');
process.exit(todas.length ? 1 : 0);
