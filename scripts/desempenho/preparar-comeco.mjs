// Mede o preparo no primeiro pedido de um build local novo, com o acervo de exemplo cheio.
// Sem --medir, tira as mensagens dos relatos da carga para simular uma cópia antiga, como na M2.
//
// Só roda no computador, contra o servidor local, pela Local Explorer do Wrangler, e só num banco com o
// acervo de exemplo, como a carga. Nunca toca prévia, homologação ou produção (regra 12 da guarda).
//
//   node scripts/desempenho/preparar-comeco.mjs               # tira as mensagens dos relatos da carga
//   node scripts/desempenho/preparar-comeco.mjs --medir       # build recém-iniciado com AMBIENTE:producao
const ENDERECOS_LOCAIS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const PRIMEIRO_ID = 900000;
const ARGS = process.argv.slice(2);
const endereco = new URL(ARGS.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:4321');
if (endereco.protocol !== 'http:' || !ENDERECOS_LOCAIS.has(endereco.hostname)) {
  console.error('Só roda no servidor local do computador (http://127.0.0.1:4321). Prévia, homologação e produção nunca.');
  process.exit(1);
}
const API = new URL('/cdn-cgi/local/explorer/api', endereco).href;

async function chamar(caminho, opcoes = {}) {
  const resposta = await fetch(`${API}${caminho}`, opcoes);
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok || dados.success === false) throw new Error(`${caminho}: ${resposta.status} ${JSON.stringify(dados.errors ?? dados).slice(0, 400)}`);
  return dados.result;
}
const bancos = await chamar('/d1/database');
if (bancos.length !== 1 || bancos[0].name !== 'DB') {
  console.error('Esperava um banco local só, o DB do servidor de medição.');
  process.exit(1);
}
const BANCO = bancos[0].uuid;
async function consultar(sql, params = []) {
  const [r] = await chamar(`/d1/database/${BANCO}/raw`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql, params }) });
  return r.results.rows.map((linha) => Object.fromEntries(r.results.columns.map((c, i) => [c, linha[i]])));
}

// Só o acervo de exemplo com a carga
const [{ exemplos }] = await consultar(`SELECT count(*) AS exemplos FROM integrantes WHERE id LIKE 'ex-%'`);
if (!exemplos) {
  console.error('Este banco não tem o acervo de exemplo. A preparação só entra no banco local do computador.');
  process.exit(1);
}
const [{ relatos }] = await consultar(`SELECT count(*) AS relatos FROM relatos WHERE id >= ${PRIMEIRO_ID}`);
if (!relatos) {
  console.error('O banco não tem a carga. Rode antes scripts/desempenho/carga-local.mjs.');
  process.exit(1);
}
if (!ARGS.includes('--medir')) {
  await consultar(`DELETE FROM relato_mensagens WHERE relato_id >= ${PRIMEIRO_ID}`);
  const [{ sem }] = await consultar(`SELECT count(*) AS sem FROM relatos r WHERE NOT EXISTS (SELECT 1 FROM relato_mensagens m WHERE m.relato_id = r.id)`);
  console.log(`Relatos sem mensagens agora: ${sem} (de ${relatos} da carga).`);
} else {
  const [{ total }] = await consultar('SELECT count(*) AS total FROM relatos');
  const pedido = new URL(`/?medicao-comeco=${crypto.randomUUID()}`, endereco).href;
  const resposta = await fetch(pedido);
  await resposta.arrayBuffer();
  if (resposta.status !== 401) throw new Error('Esperava só o preparo, seguido da resposta 401 do servidor local sem login.');
  const observar = async (sql, params) => {
    const r = await chamar('/local/observability/query', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql, params }),
    });
    return r.rows.map((linha) => Object.fromEntries(r.columns.map((c, i) => [c, linha[i]])));
  };
  for (let i = 0; i < 100; i++) {
    const [rastro] = await observar(`SELECT trace_id FROM spans WHERE parent_id IS NULL AND
      json_extract(attributes, '$."url.full"') = ? AND duration_ms IS NOT NULL`, [pedido]);
    if (rastro) {
      const idas = await observar(`SELECT name AS tipo, json_extract(attributes, '$."db.query.text"') AS sql,
        json_extract(attributes, '$."cloudflare.d1.response.rows_read"') AS lidas,
        json_extract(attributes, '$."cloudflare.d1.response.rows_written"') AS escritas
        FROM spans WHERE trace_id = ? AND kind = 'd1' ORDER BY start_ms`, [rastro.trace_id]);
      if (idas.length) {
        const lerRelatos = idas.filter((ida) => /\b(?:FROM|JOIN)\s+(?:relatos|relato_mensagens)\b/i.test(ida.sql ?? ''));
        console.log(JSON.stringify({
          relatos: total,
          idas: idas.length,
          linhasLidas: idas.reduce((soma, ida) => soma + (ida.lidas ?? 0), 0),
          linhasEscritas: idas.reduce((soma, ida) => soma + (ida.escritas ?? 0), 0),
          idasQueLeemRelatos: lerRelatos.length,
          linhasDasIdasQueLeemRelatos: lerRelatos.reduce((soma, ida) => soma + (ida.lidas ?? 0), 0),
        }, null, 2));
        process.exit(0);
      }
    }
    await new Promise((ok) => setTimeout(ok, 150));
  }
  throw new Error('Não encontrei o rastro do preparo. Confira se o primeiro pedido foi neste processo e se os rastros locais estão ligados.');
}
