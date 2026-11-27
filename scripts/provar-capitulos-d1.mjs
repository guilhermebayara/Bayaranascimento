// Com Astro ou Wrangler em loopback. Rode antes e depois da carga-local.mjs --fotos=exemplo.
import assert from 'node:assert/strict';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:4321');
assert.equal(base.protocol, 'http:');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use um servidor local.');

async function d1(caminho, dados) {
  const resposta = await fetch(new URL(`/cdn-cgi/local/explorer/api${caminho}`, base), dados && {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(dados),
  });
  const { success, result } = await resposta.json();
  assert.ok(resposta.ok && success, `O Local Explorer do D1 falhou em ${caminho}.`);
  return result;
}

const [banco] = await d1('/d1/database');
assert.equal(banco.name, 'DB');
const [{ results }] = await d1(`/d1/database/${banco.uuid}/raw`, { sql: `SELECT
  (SELECT COUNT(*) FROM integrantes WHERE id LIKE 'ex-%'),
  (SELECT COUNT(*) FROM memorias WHERE id LIKE 'carga-%')` });
const [[exemplos, carga]] = results.rows;
assert.ok(exemplos > 0, 'Esperava o acervo de exemplo.');
assert.equal(carga > 0, process.argv.includes('--carga'), 'O estado do banco precisa corresponder a --carga.');

const resultados = [];
for (const pessoa of ['gui', 'elizete', 'giovanna', 'lucas-magno']) {
  for (const caminho of ['/capitulos', '/capitulos/natais']) {
    const inicio = performance.now();
    const resposta = await fetch(new URL(caminho, base), { headers: { cookie: `como=${pessoa}` }, redirect: 'manual' });
    const html = await resposta.text();
    const erro = html.includes('VIEWs and/or subqueries nested too deep') ? ' (subconsultas aninhadas)' : '';
    console.log(`${pessoa} ${caminho}: ${resposta.status}${erro}, ${Math.round(performance.now() - inicio)} ms`);
    resultados.push(resposta.status);
  }
}
assert.deepEqual(resultados, Array(8).fill(200));
