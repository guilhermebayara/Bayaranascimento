// A conferência do modo TV proporcional (conceito da sessão X, 22/11/2026). Abre todas as memórias
// que o modo TV mostra, mais as que vierem em TV_MAIS (a de estresse, criada só no banco local),
// em cinco janelas, nas duas propostas, com "Ajustes" fechado e aberto, com "Só as fotos" e, na B,
// com o verso aberto. Em cada estado confere:
//
//   1. a página não rola;
//   2. todo controle está dentro da janela e é alcançado pelo teclado (Tab), com o foco à vista;
//   3. nenhum texto fica cortado sem um caminho para ler ("Abrir esta memória" ou o verso);
//   4. nenhum elemento cobre outro: nada por cima de um texto ou de um controle, e os textos não
//      se sobrepõem. O que flutua de propósito ("Ajustes" aberto, o verso) não conta como defeito.
//
// Mede só depois de as fontes carregarem (no QA de 23/11/2026 a fonte de reserva distorceu as
// medidas) e falha se a fonte do título não for a do site.
//
//   npm run dev -- --port 4400     (e npm run fotos-de-exemplo, uma vez por banco local)
//   node scripts/confere-tv.mjs http://localhost:4400
//
// TV_MAIS=id1,id2 soma memórias; TV_SO=a ou b limita a proposta; TV_JANELAS=1280x720 limita as janelas.
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
const JANELAS = (process.env.TV_JANELAS ?? '1280x720,1280x800,1366x768,1440x900,1920x1080').split(',').map((j) => j.split('x').map(Number));
const PROPOSTAS = (process.env.TV_SO ?? 'a,b').split(',');
const MAIS = (process.env.TV_MAIS ?? '').split(',').filter(Boolean);

/** Os ids das memórias, na ordem do modo TV: segue "Próxima" a partir da primeira */
async function memoriasDaTv() {
  const ids = [];
  let endereco = `${base}/explorar?ver=tv&conceito=a`;
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
  const nome = (e) => (e.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 28) || e.className;
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
        if (topo && !e.contains(topo) && !topo.contains(e)) culpados.add(topo.closest('.palco__extra, .palco__principal, .palco__partes, .palco__verso-cartao, .palco__controles, .palco__topo > *, .palco__texto > *') ?? topo);
      }
    return [...culpados];
  };

  // 1. A página não rola
  const raiz = document.documentElement;
  scrollTo(0, 200);
  if (raiz.scrollHeight > innerHeight + 1 || raiz.scrollWidth > innerWidth + 1 || scrollY !== 0) falhas.push(`rola ${raiz.scrollHeight - innerHeight} px`);
  scrollTo(0, 0);

  const versoAberto = palco.querySelector('[data-palco-verso][open]');
  const ajustesAbertos = palco.querySelector('[data-palco-ajustes][open]');
  const flutuando = versoAberto?.querySelector('.palco__verso-cartao') ?? null;

  // 2. Os controles: dentro da janela, sem nada por cima
  const controles = [...palco.querySelectorAll('a[href], button, summary')].filter((e) => visivel(e) && !e.closest('.palco__principal') && !e.classList.contains('palco__principal'));
  for (const e of palco.querySelectorAll('[data-confere]')) e.removeAttribute('data-confere');
  // Com o verso aberto, o que está embaixo do cartão está coberto de propósito: não é conferido
  // como controle, e por isso mesmo não pode receber o foco (o Tab acusa)
  const embaixo = (c) => Boolean(flutuando && !flutuando.contains(c) && !c.closest('.palco__controles, .palco__topo') && c !== versoAberto.querySelector('summary'));
  controles.forEach((c, n) => !embaixo(c) && c.setAttribute('data-confere', String(n)));
  for (const c of controles) {
    if (embaixo(c)) continue;
    if (ajustesAbertos && c.closest('.palco__texto')) continue;
    if (!dentro(c.getBoundingClientRect())) falhas.push(`fora da janela: ${nome(c)}`);
    const por = coberto(c);
    if (por.length) falhas.push(`coberto: ${nome(c)} por ${por.map((p) => p.className || p.tagName).join(', ')}`);
  }

  // 3. Texto cortado, e o caminho para ler
  const textos = estado === 'sofotos' ? [] : [...palco.querySelectorAll('.palco__texto .carimbo > span, .palco__titulo, .palco__trecho > p, .palco__texto > .ficha, .palco__verso-titulo, .palco__verso-nomes .ficha, .palco__principal .polaroid__legenda')].filter(visivel);
  // Cortado é faltar pelo menos meia linha: a perna de uma letra passa da caixa sem ser corte
  const cortado = (e) => {
    const estilo = getComputedStyle(e);
    const linha = parseFloat(estilo.lineHeight) || parseFloat(estilo.fontSize) * 1.2;
    return e.scrollHeight - e.clientHeight > linha / 2 || e.scrollWidth > e.clientWidth + 2;
  };
  const cortados = textos.filter(cortado);
  const noVerso = cortados.filter((e) => e.closest('.palco__verso-cartao'));
  const naColuna = cortados.filter((e) => !e.closest('.palco__verso-cartao'));
  if (cortados.length) {
    const caminhos = [...palco.querySelectorAll(flutuando ? '.palco__verso-cartao a[href^="/memorias/"]' : '.palco__texto > p > a[href^="/memorias/"], .palco__verso > summary')].filter(visivel);
    if (!ajustesAbertos && !caminhos.some((c) => dentro(c.getBoundingClientRect()) && coberto(c).length === 0)) falhas.push(`cortado sem caminho: ${cortados.map(nome).join(' | ')}`);
  }

  // 4. Nada por cima dos textos, e os textos não se sobrepõem
  if (!ajustesAbertos && !flutuando) {
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
  if (flutuando) {
    if (!dentro(flutuando.getBoundingClientRect())) falhas.push('o verso sai da janela');
    for (const e of flutuando.children) if (e.getBoundingClientRect().bottom > flutuando.getBoundingClientRect().bottom + 1 || e.getBoundingClientRect().top < flutuando.getBoundingClientRect().top - 1) falhas.push(`sai do verso: ${nome(e)}`);
  }
  if (ajustesAbertos) {
    const folha = ajustesAbertos.querySelector('.palco__partes');
    if (!dentro(folha.getBoundingClientRect())) falhas.push('a folha de "Ajustes" sai da janela');
  }
  return {
    falhas,
    controles: controles.map(nome),
    paraOFoco: controles.map((c, n) => (embaixo(c) ? -1 : n)).filter((n) => n >= 0),
    cortados: naColuna.map((e) => e.className.split(' ')[0]),
    cortadosNoVerso: noVerso.map(nome),
    foto: Math.round(palco.querySelector('.palco__principal')?.getBoundingClientRect().width ?? 0),
  };
}

/** Passa por todos os controles com o Tab e devolve os que receberam o foco, e se o foco ficou à vista */
async function peloTeclado(pagina) {
  await pagina.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  const vistos = [];
  const fora = [];
  const intrusos = [];
  for (let n = 0; n < 60; n++) {
    await pagina.keyboard.press('Tab');
    const foco = await pagina.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body || !e.closest('[data-palco]')) return null;
      const r = e.getBoundingClientRect();
      return { n: e.getAttribute('data-confere'), nome: (e.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 28), dentro: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && getComputedStyle(e).visibility !== 'hidden' };
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
  }
  return { vistos, fora, intrusos };
}

const { chromium } = playwright();
const navegador = await chromium.launch();
const ids = [...(await memoriasDaTv()), ...MAIS];
console.log(`${ids.length} memórias (${MAIS.length} a mais: ${MAIS.join(', ') || 'nenhuma'})`);

const resumo = [];
const todas = [];
for (const proposta of PROPOSTAS) {
  for (const [largura, altura] of JANELAS) {
    const contexto = await navegador.newContext({ viewport: { width: largura, height: altura }, reducedMotion: 'reduce' });
    const pagina = await contexto.newPage();
    const erros = [];
    pagina.on('pageerror', (e) => erros.push(e.message));
    const linha = { proposta, janela: `${largura} × ${altura}`, fechado: 0, ajustes: 0, sofotos: 0, verso: 0, cortadas: 0, cortadasNoVerso: 0, foto: 0 };
    for (const id of ids) {
      await pagina.goto(`${base}/explorar?ver=tv&conceito=${proposta}&m=${encodeURIComponent(id)}`, { waitUntil: 'load' });
      await pagina.evaluate(() => {
        localStorage.removeItem('tv-so-fotos');
        return document.fonts.ready;
      });
      await pagina.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
      const fonte = await pagina.evaluate(() => {
        const titulo = document.querySelector('.palco__titulo');
        const estilo = getComputedStyle(titulo);
        return { familia: estilo.fontFamily.split(',')[0].trim(), carregada: document.fonts.check(`${estilo.fontWeight} 40px ${estilo.fontFamily.split(',')[0].trim()}`) };
      });
      const anotar = (estado, medida, teclado) => {
        const falhas = [...medida.falhas];
        if (!fonte.carregada) falhas.push(`a fonte do título não carregou: ${fonte.familia}`);
        if (teclado) {
          const semFoco = medida.paraOFoco.filter((n) => !teclado.vistos.includes(n)).map((n) => medida.controles[n]);
          if (semFoco.length) falhas.push(`sem alcance pelo teclado: ${semFoco.join(' | ')}`);
          if (teclado.intrusos.length) falhas.push(`foco em algo escondido ou coberto: ${teclado.intrusos.join(' | ')}`);
          if (teclado.fora.length) falhas.push(`foco fora da janela: ${teclado.fora.join(' | ')}`);
        }
        if (falhas.length) {
          linha[estado]++;
          todas.push({ proposta, janela: linha.janela, estado, id, falhas });
        }
      };
      // Fechado
      let medida = await pagina.evaluate(medir, 'fechado');
      anotar('fechado', medida, await peloTeclado(pagina));
      if (medida.cortados.length) linha.cortadas++;
      linha.foto = medida.foto;
      // O verso, na B
      if (proposta === 'b') {
        await pagina.evaluate(() => (document.querySelector('[data-palco-verso]').open = true));
        medida = await pagina.evaluate(medir, 'verso');
        anotar('verso', medida, await peloTeclado(pagina));
        if (medida.cortadosNoVerso.length) linha.cortadasNoVerso++;
        await pagina.evaluate(() => (document.querySelector('[data-palco-verso]').open = false));
      }
      // "Ajustes" aberto
      await pagina.evaluate(() => (document.querySelector('[data-palco-ajustes]').open = true));
      medida = await pagina.evaluate(medir, 'ajustes');
      anotar('ajustes', medida, await peloTeclado(pagina));
      // "Só as fotos", com os controles à vista (eles somem depois de 5 segundos sem gesto)
      await pagina.evaluate(() => document.querySelector('[data-palco-so-fotos]').click());
      await pagina.evaluate(() => (document.querySelector('[data-palco-ajustes]').open = false));
      await pagina.mouse.move(300 + Math.random() * 20, 300);
      medida = await pagina.evaluate(medir, 'sofotos');
      anotar('sofotos', medida, await peloTeclado(pagina));
      await pagina.evaluate(() => localStorage.removeItem('tv-so-fotos'));
    }
    if (erros.length) todas.push({ proposta, janela: linha.janela, estado: 'script', id: '', falhas: [...new Set(erros)] });
    resumo.push(linha);
    console.log(`${proposta.toUpperCase()} ${linha.janela}: fechado ${linha.fechado}, ajustes ${linha.ajustes}, só as fotos ${linha.sofotos}${proposta === 'b' ? `, verso ${linha.verso}` : ''} com defeito; ${linha.cortadas} com texto cortado na coluna${proposta === 'b' ? ` e ${linha.cortadasNoVerso} no verso` : ''}; foto de ${linha.foto} px`);
    await contexto.close();
  }
}
await navegador.close();

for (const f of todas.slice(0, 60)) console.log(`  ${f.proposta.toUpperCase()} ${f.janela} ${f.estado} ${f.id}: ${f.falhas.join('; ')}`);
if (todas.length > 60) console.log(`  … e mais ${todas.length - 60}`);
console.log(todas.length ? `\n${todas.length} estados com defeito.` : '\nNenhum defeito: nada rola, todo controle está na janela e no teclado, nenhum texto cortado sem caminho, nada cobre nada.');
process.exit(todas.length ? 1 : 0);
