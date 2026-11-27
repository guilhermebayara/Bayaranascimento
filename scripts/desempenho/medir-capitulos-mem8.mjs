// Mede o SQL agregado que o build realmente executa nas páginas, pelo rastro do D1.
import assert from 'node:assert/strict';

const ENDERECOS_LOCAIS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const args = process.argv.slice(2);
const endereco = new URL(args.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:4321');
if (endereco.protocol !== 'http:' || !ENDERECOS_LOCAIS.has(endereco.hostname)) {
  console.error('Só roda em loopback.');
  process.exit(1);
}
const API = new URL('/cdn-cgi/local/explorer/api', endereco).href;
async function chamar(caminho, dados) {
  const r = await fetch(API + caminho, dados && { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(dados) });
  const { success, result } = await r.json();
  if (!r.ok || !success) throw new Error(`O Wrangler local não respondeu a ${caminho}.`);
  return result;
}
const [banco] = await chamar('/d1/database');
if (banco.name !== 'DB') throw new Error('Esperava o banco da carga local.');
const [amostra] = await chamar(`/d1/database/${banco.uuid}/raw`, {
  sql: "SELECT 1 FROM integrantes WHERE id LIKE 'ex-%' LIMIT 1", params: [],
});
const exemplos = amostra.results.rows.length;
if (!exemplos) {
  console.error('Esperava o acervo de exemplo.');
  process.exit(1);
}
async function observar(sql, params) {
  const result = await chamar('/local/observability/query', { sql, params });
  return result.rows.map((linha) => Object.fromEntries(result.columns.map((c, i) => [c, linha[i]])));
}

async function medir(caminho, leitor) {
  const url = new URL(caminho, endereco);
  url.searchParams.set('medicao-capitulos', crypto.randomUUID());
  const r = await fetch(url, { headers: { cookie: `como=${leitor}` } });
  await r.arrayBuffer();
  assert.equal(r.status, 200);
  for (let i = 0; i < 100; i++) {
    const [rastro] = await observar(`SELECT trace_id FROM spans WHERE parent_id IS NULL AND
      json_extract(attributes, '$."url.full"') = ? AND duration_ms IS NOT NULL`, [url.href]);
    if (rastro) {
      const idas = await observar(`SELECT json_extract(attributes, '$."db.query.text"') AS sql,
        COALESCE(json_extract(attributes, '$."cloudflare.d1.response.rows_read"'), 0) AS lidas
        FROM spans WHERE trace_id = ? AND kind = 'd1'`, [rastro.trace_id]);
      const agregados = idas.filter((ida) => ida.sql?.includes('visiveis AS MATERIALIZED'));
      if (agregados.length) {
        const consultas = agregados.map(({ sql, lidas }) => ({
          linhas: lidas,
          referencias: (sql.match(/\bcapitulo_memorias\b/g) ?? []).length,
          bytes: Buffer.byteLength(sql),
        }));
        if (args.includes('--exigir-uma-leitura')) {
          for (const c of consultas) {
            assert.equal(c.referencias, 1, 'A consulta agregada lê os vínculos diretos mais de uma vez.');
            assert.ok(c.bytes <= 6738, 'A consulta agregada excedeu o tamanho da MEM-7.');
          }
        }
        return { leitor, caminho, linhasDaPagina: idas.reduce((soma, ida) => soma + ida.lidas, 0), consultas };
      }
    }
    await new Promise((ok) => setTimeout(ok, 150));
  }
  throw new Error('O rastro do agregado não chegou.');
}
const medidas = [];
for (const leitor of ['gui', 'elizete', 'lucas-magno']) {
  for (const caminho of ['/capitulos', '/capitulos/natais']) medidas.push(await medir(caminho, leitor));
}
console.log(JSON.stringify(medidas, null, 2));
