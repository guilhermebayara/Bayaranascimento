// Use um build local com AMBIENTE=producao e um --persist-to novo no Wrangler.
import assert from 'node:assert/strict';

const base = new URL(process.argv[2]);
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
const sql = (sql) => d1(`/d1/database/${banco.uuid}/raw`, { sql });
const [esquema] = await sql("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_cf_%'");
assert.deepEqual(esquema.results.rows, [], 'Use um banco local vazio e descartável.');

// O primeiro pedido tenta ler _migracoes.id antes de identificar quem está pedindo.
await sql('CREATE TABLE _migracoes (falha_interna_mem15 TEXT)');
try {
  for (const caminho of ['/capitulos', '/api/copia']) {
    const resposta = await fetch(new URL(caminho, base));
    assert.equal(resposta.status, 500, caminho);
    const corpo = await resposta.text();
    assert.doesNotMatch(corpo, /falha_interna_mem15|no such column|D1_ERROR|SQLITE_ERROR|banco\.ts|\bSELECT\s+id\s+FROM\s+_migracoes/i);
    console.log(`${caminho}: HTTP 500 sem detalhes do D1.`);
  }
} finally {
  await sql('DROP TABLE _migracoes');
}
