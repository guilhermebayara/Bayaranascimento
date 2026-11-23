// Confere que nenhuma página passa de 50 consultas ao D1 por pedido (sessão D1a, 23/11/2026; o limite do
// plano gratuito do Cloudflare, ver docs/desempenho/). Roda à mão, no computador, fora do build: o build do
// Cloudflare não tem servidor. Não muda nada no site nem no banco.
//
//   npm run build && npx astro preview --host 127.0.0.1 --port 4321     # com dist/server/.dev.vars (AMBIENTE=previa)
//   node scripts/desempenho/carga-local.mjs                              # o acervo cheio
//   node scripts/desempenho/conferir-consultas.mjs                       # falha (saída 1) se alguma página passar de 50
//
// Pede cada página da tabela 2.2 da medição M1 como o Gui (administra) e como a Elizete (não administra) e
// conta, de cada pedido:
// - pelo cabeçalho Server-Timing (src/lib/servidor/ambiente.ts): as consultas (cada comando, também os de
//   um lote) e as idas ao banco até a página começar a ser entregue;
// - pelos rastros que o servidor local guarda (Local Explorer, como medir-servidor.mjs): todas as idas,
//   também as que o esqueleto fizer depois do cabeçalho, e as linhas lidas.
// O que foi ao banco depois do cabeçalho entra na conta das consultas pelo texto do rastro (cada comando de
// um lote começa numa linha com SELECT, INSERT, UPDATE, DELETE ou WITH).
const BASE = 'http://127.0.0.1:4321';
const API = `${BASE}/cdn-cgi/local/explorer/api`;
const LIMITE = 50;
const PESSOAS = (process.env.COMO ?? 'gui,elizete').split(',');

export const TELAS = [
  ['Início', '/'],
  ['Explorar, linha do tempo', '/explorar'],
  ['Explorar, mural', '/explorar?ver=mural'],
  ['Explorar, mural, todas as fotos', '/explorar?ver=mural&fotos=todas'],
  ['Explorar, lista', '/explorar?ver=lista'],
  ['Explorar, filtro de família', '/explorar?nucleo=bracarense'],
  ['Modo TV (uma memória)', '/explorar?ver=tv'],
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

/** consultas=12 idas=5, do Server-Timing */
function lerServerTiming(cabecalho) {
  const m = /consultas=(\d+) idas=(\d+)/.exec(cabecalho ?? '');
  const dur = /servidor;dur=(\d+)/.exec(cabecalho ?? '');
  return m ? { consultas: Number(m[1]), idas: Number(m[2]), servidor: dur ? Number(dur[1]) : null } : null;
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
    await resposta.arrayBuffer();
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
      servidor: st?.servidor ?? null,
      semServerTiming: !st,
    };
    linhas.push(linha);
    const passou = consultas > LIMITE || !st;
    if (passou) falhou = true;
    console.log(
      `${passou ? 'FALHA' : 'ok   '} ${como.padEnd(8)} ${nome.padEnd(32)} ${String(linha.status).padEnd(4)} ${String(consultas).padStart(3)} consultas  ${String(linha.idas).padStart(3)} idas${linha.depoisDoCabecalho ? ` (${linha.depoisDoCabecalho} depois do cabeçalho)` : ''}  ${String(linha.linhasLidas).padStart(7)} linhas${st ? '' : '  sem Server-Timing'}`,
    );
  }
}
if (process.argv.includes('--json')) console.log(JSON.stringify(linhas, null, 2));
if (falhou) {
  console.error(`\nAlguma página passou de ${LIMITE} consultas ao D1 (ou respondeu sem Server-Timing).`);
  process.exit(1);
}
console.log(`\nNenhuma página passou de ${LIMITE} consultas ao D1.`);
