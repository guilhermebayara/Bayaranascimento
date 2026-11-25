// Confere que nenhuma página passa de 50 consultas ao D1 por pedido (sessão D1a, 23/11/2026; o limite do
// plano gratuito do Cloudflare, ver docs/desempenho/). Roda à mão, no computador, fora do build: o build do
// Cloudflare não tem servidor. Não muda nada no site nem no banco.
//
//   npm run build && npx astro preview --host 127.0.0.1 --port 4321     # com dist/server/.dev.vars (AMBIENTE=previa)
//   node scripts/desempenho/carga-local.mjs                              # o acervo cheio
//   node scripts/desempenho/conferir-consultas.mjs                       # falha (saída 1) se alguma página passar de 50 ou de um teto
//   node scripts/desempenho/conferir-consultas.mjs --tetos               # também escreve os números desta rodada como tetos, para colar em TETOS
//
// Pede cada página da tabela 2.2 da medição M1 como o Gui (administra) e como a Elizete (não administra) e
// conta, de cada pedido:
// - pelo cabeçalho Server-Timing (src/lib/servidor/ambiente.ts): as consultas (cada comando, também os de
//   um lote) e as idas ao banco até a página começar a ser entregue;
// - pelos rastros que o servidor local guarda (Local Explorer, como medir-servidor.mjs): todas as idas,
//   também as que o esqueleto fizer depois do cabeçalho, e as linhas lidas.
// O que foi ao banco depois do cabeçalho entra na conta das consultas pelo texto do rastro (cada comando de
// um lote começa numa linha com SELECT, INSERT, UPDATE, DELETE ou WITH).
//
// Desde a sessão D1e (seção 8 da M2, itens 2 e 3), dois números que não dependem da máquina, contra os tetos de
// cada tela (TETOS, abaixo): as linhas que o banco devolveu até a página começar a ser entregue (o "linhas=" do
// Server-Timing: as que o Worker converte em objetos, a maior parte da CPU das páginas que leem o acervo
// inteiro) e o tamanho da resposta (o HTML, nas páginas). Eles pegam a volta de uma causa sem o ruído da CPU.
// O item 1 da seção 8 (medir-cpu.mjs --conferir) não entrou: o teto local de CPU depende da razão entre este
// computador e a produção, que só a pergunta 1 da M2 dá.
const BASE = 'http://127.0.0.1:4321';
const API = `${BASE}/cdn-cgi/local/explorer/api`;
const LIMITE = 50;
const PESSOAS = (process.env.COMO ?? 'gui,elizete').split(',');

/**
 * Os tetos de hoje, com o acervo cheio (carga-local.mjs), anotados na sessão D1e (23/11/2026): o maior número
 * entre o Gui e a Elizete, com uns 10% de folga, arredondado. Linhas devolvidas pelo banco até o cabeçalho e KB
 * da resposta. Não são metas: só impedem que uma página piore sem ninguém ver. A D2 (a lista leve do Explorar)
 * e a D3 (contar e escolher no banco) baixam os tetos das páginas que mexerem para os números delas; a M2
 * sugeria uns 300 KB e 2.000 linhas para o Explorar depois da D2.
 */
export const TETOS = {
  'Início': { linhas: 10040, kb: 30 },
  'Explorar, linha do tempo': { linhas: 11730, kb: 1750 },
  'Explorar, mural': { linhas: 11730, kb: 470 },
  'Explorar, mural, todas as fotos': { linhas: 11730, kb: 2070 },
  'Explorar, lista': { linhas: 11730, kb: 1150 },
  'Explorar, filtro de família': { linhas: 11730, kb: 815 },
  // A primeira página do modo TV leva a ordem (só os ids, uns 8 KB no acervo cheio) desde a aplicação da E1;
  // as passagens seguintes pedem só a rota de uma memória (causa 6)
  'Modo TV (uma memória)': { linhas: 11730, kb: 20 },
  'Modo TV da sala, com a carta': { linhas: 11200, kb: 15 },
  'Modo TV, uma passagem': { linhas: 210, kb: 12 },
  'Modo TV da sala, uma passagem': { linhas: 215, kb: 12 },
  'Me mostre uma memória': { linhas: 11730, kb: 15 },
  'Memória': { linhas: 250, kb: 55 },
  'Pessoa (Gui)': { linhas: 1960, kb: 175 },
  'Pessoas': { linhas: 9650, kb: 30 },
  'Árvore': { linhas: 200, kb: 30 },
  'Capítulo reunido': { linhas: 9680, kb: 70 },
  'Capítulos': { linhas: 9690, kb: 15 },
  'Nova memória': { linhas: 9690, kb: 45 },
  'Sua conta': { linhas: 10020, kb: 30 },
  'Uma foto': { linhas: 100, kb: 20 },
  'Um retrato': { linhas: 180, kb: 35 },
};

export const TELAS = [
  ['Início', '/'],
  ['Explorar, linha do tempo', '/explorar'],
  ['Explorar, mural', '/explorar?ver=mural'],
  ['Explorar, mural, todas as fotos', '/explorar?ver=mural&fotos=todas'],
  ['Explorar, lista', '/explorar?ver=lista'],
  ['Explorar, filtro de família', '/explorar?nucleo=bracarense'],
  ['Modo TV (uma memória)', '/explorar?ver=tv'],
  // A aplicação da E1 (causa 6): a TV da sala, com a ordem, e a rota de uma memória, que cada passagem pede
  ['Modo TV da sala, com a carta', '/explorar?ver=tv&sala=1&tema=natal&ordem=antigas&carta=1&m=carta-1'],
  ['Modo TV, uma passagem', '/explorar/palco?ver=tv&m=1992-chegada-do-gui&antes=1958-casamento-vivica-tonho&depois=1994-natal-na-vo-vivica'],
  ['Modo TV da sala, uma passagem', '/explorar/palco?ver=tv&sala=1&m=1994-natal-na-vo-vivica&antes=1958-casamento-vivica-tonho&depois=1998-natal-com-os-primos'],
  ['Me mostre uma memória', '/explorar?ver=acaso&m=1992-chegada-do-gui'],
  ['Memória', '/memorias/1992-chegada-do-gui'],
  ['Pessoa (Gui)', '/pessoas/gui'],
  ['Pessoas', '/pessoas'],
  ['Árvore', '/arvore'],
  ['Capítulo reunido', '/capitulos/natais'],
  ['Capítulos', '/capitulos'],
  ['Nova memória', '/nova'],
  ['Sua conta', '/conta'],
  ['Uma foto', null],
  ['Um retrato', null],
];

async function consultar(sql, params) {
  const r = await fetch(`${API}/local/observability/query`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql, params }) });
  const d = await r.json();
  return d.result.rows.map((linha) => Object.fromEntries(d.result.columns.map((c, i) => [c, linha[i]])));
}

/** O rastro do último pedido a este endereço: as idas ao D1, com o texto e as linhas lidas. */
async function rastro(url) {
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const [raiz] = await consultar(`SELECT trace_id FROM spans WHERE parent_id IS NULL AND json_extract(attributes, '$."url.full"') = ? AND duration_ms IS NOT NULL ORDER BY start_ms DESC LIMIT 1`, [url]);
    if (raiz) {
      return consultar(
        `SELECT start_ms, json_extract(attributes, '$."db.query.text"') AS sql, json_extract(attributes, '$."cloudflare.d1.response.rows_read"') AS linhas FROM spans WHERE trace_id = ? AND kind = 'd1' ORDER BY start_ms`,
        [raiz.trace_id],
      );
    }
    await new Promise((ok) => setTimeout(ok, 150));
  }
  return null;
}

/** consultas=12 idas=5 linhas=340, do Server-Timing */
function lerServerTiming(cabecalho) {
  const m = /consultas=(\d+) idas=(\d+)/.exec(cabecalho ?? '');
  const linhas = /linhas=(\d+)/.exec(cabecalho ?? '');
  const dur = /servidor;dur=(\d+)/.exec(cabecalho ?? '');
  return m ? { consultas: Number(m[1]), idas: Number(m[2]), linhas: linhas ? Number(linhas[1]) : null, servidor: dur ? Number(dur[1]) : null } : null;
}

const comandosNoTexto = (sql) => Math.max(1, String(sql ?? '').split('\n').filter((l) => /^(SELECT|INSERT|UPDATE|DELETE|WITH)\b/i.test(l)).length);

/** Um endereço de foto e um de retrato que a página do Gui mostra, para medir as rotas de arquivo. */
async function arquivosDaPagina(como) {
  const html = await (await fetch(`${BASE}/memorias/1992-chegada-do-gui`, { headers: { cookie: `como=${como}` } })).text();
  const foto = /(?:src|srcset)="(\/fotos\/[^"\s]+)"/.exec(html)?.[1];
  const pessoas = await (await fetch(`${BASE}/pessoas`, { headers: { cookie: `como=${como}` } })).text();
  const retrato = /src="(\/retratos\/[^"\s]+)"/.exec(pessoas)?.[1];
  return { 'Uma foto': foto, 'Um retrato': retrato };
}

let falhou = false;
const linhas = [];
for (const como of PESSOAS) {
  const arquivos = await arquivosDaPagina(como);
  for (const [nome, fixo] of TELAS) {
    const caminho = fixo ?? arquivos[nome];
    if (!caminho) continue;
    const url = `${BASE}${caminho}`;
    // Uma ida para aquecer: a primeira depois de subir o servidor prepara o banco
    await (await fetch(url, { headers: { cookie: `como=${como}` } })).arrayBuffer();
    const resposta = await fetch(url, { headers: { cookie: `como=${como}` }, redirect: 'manual' });
    const bytes = (await resposta.arrayBuffer()).byteLength;
    const st = lerServerTiming(resposta.headers.get('server-timing'));
    const idas = (await rastro(url)) ?? [];
    const depois = st ? idas.slice(st.idas) : [];
    const consultas = (st?.consultas ?? idas.reduce((s, q) => s + comandosNoTexto(q.sql), 0)) + depois.reduce((s, q) => s + comandosNoTexto(q.sql), 0);
    const linha = {
      como,
      nome,
      status: resposta.status,
      consultas,
      idas: idas.length,
      depoisDoCabecalho: depois.length,
      linhasLidas: idas.reduce((s, q) => s + (q.linhas ?? 0), 0),
      linhasDevolvidas: st?.linhas ?? null,
      kb: Math.round(bytes / 1024),
      servidor: st?.servidor ?? null,
      semServerTiming: !st,
    };
    linhas.push(linha);
    const teto = TETOS[nome];
    const motivos = [];
    if (consultas > LIMITE) motivos.push(`mais de ${LIMITE} consultas`);
    if (!st || st.linhas === null) motivos.push('sem Server-Timing com as linhas');
    if (teto && st?.linhas != null && st.linhas > teto.linhas) motivos.push(`${st.linhas} linhas devolvidas, teto ${teto.linhas}`);
    if (teto?.kb && linha.kb > teto.kb) motivos.push(`${linha.kb} KB, teto ${teto.kb}`);
    if (!teto) motivos.push('tela sem teto em TETOS');
    if (motivos.length) falhou = true;
    console.log(
      `${motivos.length ? 'FALHA' : 'ok   '} ${como.padEnd(8)} ${nome.padEnd(32)} ${String(linha.status).padEnd(4)} ${String(consultas).padStart(3)} consultas  ${String(linha.idas).padStart(3)} idas${linha.depoisDoCabecalho ? ` (${linha.depoisDoCabecalho} depois do cabeçalho)` : ''}  ${String(linha.linhasLidas).padStart(7)} linhas lidas  ${String(linha.linhasDevolvidas ?? '-').padStart(6)} devolvidas  ${String(linha.kb).padStart(5)} KB${motivos.length ? `  (${motivos.join('; ')})` : ''}`,
    );
  }
}
if (process.argv.includes('--json')) console.log(JSON.stringify(linhas, null, 2));
if (process.argv.includes('--tetos')) {
  // Os números desta rodada como tetos novos (o maior entre as pessoas, com 10% de folga), para colar em TETOS
  const porTela = new Map();
  for (const l of linhas) {
    const t = porTela.get(l.nome) ?? { linhas: 0, kb: 0 };
    porTela.set(l.nome, { linhas: Math.max(t.linhas, l.linhasDevolvidas ?? 0), kb: Math.max(t.kb, l.kb) });
  }
  const folga = (n, passo) => Math.ceil((n * 1.1) / passo) * passo || passo;
  for (const [nome, t] of porTela) console.log(`  '${nome}': { linhas: ${folga(t.linhas, 10)}, kb: ${folga(t.kb, 5)} },`);
}
if (falhou) {
  console.error(`\nAlguma página passou de ${LIMITE} consultas ao D1, de um teto de linhas devolvidas ou de tamanho, ou respondeu sem Server-Timing.`);
  process.exit(1);
}
console.log(`\nNenhuma página passou de ${LIMITE} consultas ao D1 nem dos tetos de linhas devolvidas e de tamanho.`);
