// Mede o servidor local, tela por tela (sessão M1, 22/11/2026; relatório em docs/desempenho/): o tempo
// de cada página, o tamanho do HTML e as consultas ao D1 que ela fez, lidas dos rastros que o servidor
// local guarda de cada pedido (Local Explorer, /cdn-cgi/local/explorer/api/local/observability/query).
// Não muda nada no site nem no banco. Só roda contra o servidor local.
//
//   node scripts/desempenho/medir-servidor.mjs [rotulo] [vezes]      # ex.: exemplo 5
//
// Escreve docs/desempenho/dados/servidor-<rotulo>.json e mostra a tabela.
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BASE = 'http://127.0.0.1:4321';
const API = `${BASE}/cdn-cgi/local/explorer/api`;
const rotulo = process.argv[2] ?? 'exemplo';
const vezes = Number(process.argv[3] ?? 5);
const COMO = process.env.COMO ?? 'gui';

export const TELAS = [
  ['Início', '/'],
  ['Explorar, linha do tempo', '/explorar'],
  ['Explorar, mural', '/explorar?ver=mural'],
  ['Explorar, mural, todas as fotos', '/explorar?ver=mural&fotos=todas'],
  ['Explorar, lista', '/explorar?ver=lista'],
  ['Explorar, filtro de família', '/explorar?nucleo=bracarense'],
  ['Explorar, filtro de tipo', '/explorar?tipo=festa'],
  ['Modo TV', '/explorar?ver=tv'],
  ['Me mostre uma memória', '/explorar?ver=acaso&m=1992-chegada-do-gui'],
  ['Memória (exemplo)', '/memorias/1992-chegada-do-gui'],
  ['Memória (cheia)', process.env.MEMORIA_CHEIA ?? '/memorias/1992-chegada-do-gui'],
  ['Pessoa', '/pessoas/gui'],
  ['Pessoa, linha do tempo', '/pessoas/gui?ver=linha'],
  ['Pessoas', '/pessoas'],
  ['Árvore', '/arvore'],
  ['Capítulo reunido', '/capitulos/natais'],
  ['Capítulo época', '/capitulos/os-anos-90'],
  ['Capítulos', '/capitulos'],
  ['Nova memória', '/nova'],
  ['Sua conta', '/conta'],
];

async function rastro(url) {
  const consulta = async (sql, params) => {
    const r = await fetch(`${API}/local/observability/query`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql, params }) });
    const d = await r.json();
    return d.result.rows.map((linha) => Object.fromEntries(d.result.columns.map((c, i) => [c, linha[i]])));
  };
  // O rastro do último pedido a este endereço
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const [raiz] = await consulta(`SELECT trace_id, duration_ms FROM spans WHERE parent_id IS NULL AND json_extract(attributes, '$."url.full"') = ? AND duration_ms IS NOT NULL ORDER BY start_ms DESC LIMIT 1`, [url]);
    if (raiz) {
      const d1 = await consulta(
        `SELECT name, duration_ms, json_extract(attributes, '$."db.query.text"') AS sql, json_extract(attributes, '$."cloudflare.d1.response.rows_read"') AS linhas FROM spans WHERE trace_id = ? AND kind = 'd1' ORDER BY start_ms`,
        [raiz.trace_id],
      );
      const r2 = await consulta(`SELECT count(*) AS n FROM spans WHERE trace_id = ? AND kind = 'r2'`, [raiz.trace_id]);
      return { servidor: raiz.duration_ms, d1, r2: r2[0].n };
    }
    await new Promise((ok) => setTimeout(ok, 150));
  }
  return null;
}

const mediana = (lista) => {
  const o = [...lista].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)];
};

const resultados = [];
for (const [nome, caminho] of TELAS) {
  const url = `${BASE}${caminho}`;
  const medidas = [];
  let ultima;
  // Uma ida para aquecer (a primeira página depois de subir o servidor compila o código)
  await fetch(url, { headers: { cookie: `como=${COMO}` } });
  for (let i = 0; i < vezes; i++) {
    const inicio = performance.now();
    const resposta = await fetch(url, { headers: { cookie: `como=${COMO}` }, redirect: 'manual' });
    const html = await resposta.text();
    const total = performance.now() - inicio;
    const r = await rastro(url);
    medidas.push({ total, servidor: r?.servidor ?? null, d1: r?.d1.length ?? null, linhas: r?.d1.reduce((s, q) => s + (q.linhas ?? 0), 0) ?? null, msD1: r?.d1.reduce((s, q) => s + q.duration_ms, 0) ?? null });
    ultima = { status: resposta.status, html, r };
  }
  const fotos = [...ultima.html.matchAll(/(?:src|srcset)="(\/fotos\/[^"]+)"/g)].map((m) => m[1]);
  const retratos = [...ultima.html.matchAll(/src="(\/retratos\/[^"]+)"/g)].map((m) => m[1]);
  const caras = [...(ultima.r?.d1 ?? [])].sort((a, b) => (b.linhas ?? 0) - (a.linhas ?? 0)).slice(0, 4).map((q) => ({ linhas: q.linhas, ms: q.duration_ms, sql: String(q.sql).replace(/\s+/g, ' ').slice(0, 160) }));
  const linha = {
    nome,
    caminho,
    status: ultima.status,
    total: Math.round(mediana(medidas.map((m) => m.total))),
    servidor: mediana(medidas.map((m) => m.servidor ?? 0)),
    consultas: mediana(medidas.map((m) => m.d1 ?? 0)),
    linhasLidas: mediana(medidas.map((m) => m.linhas ?? 0)),
    msNoD1: mediana(medidas.map((m) => m.msD1 ?? 0)),
    r2: ultima.r?.r2 ?? 0,
    html: Buffer.byteLength(ultima.html),
    htmlGzip: gzipSync(ultima.html).length,
    imgs: (ultima.html.match(/<img\b/g) ?? []).length,
    fotos: fotos.length,
    fotosDistintas: new Set(fotos).size,
    retratos: retratos.length,
    memoriasNaPagina: new Set([...ultima.html.matchAll(/data-chave="m:([^"]+)"/g)].map((m) => m[1])).size,
    caras,
  };
  resultados.push(linha);
  console.log(`${nome.padEnd(34)} ${String(linha.status).padEnd(4)} ${String(linha.servidor).padStart(5)} ms  ${String(linha.consultas).padStart(3)} consultas  ${String(linha.linhasLidas).padStart(7)} linhas  HTML ${Math.round(linha.html / 1024)} KB (${Math.round(linha.htmlGzip / 1024)} KB gzip)  ${linha.fotos} fotos`);
}
mkdirSync('docs/desempenho/dados', { recursive: true });
writeFileSync(`docs/desempenho/dados/servidor-${rotulo}.json`, JSON.stringify({ rotulo, quando: new Date().toISOString(), vezes, como: COMO, resultados }, null, 2));
