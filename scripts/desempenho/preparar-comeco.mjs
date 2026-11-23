// Prepara o banco LOCAL para medir o primeiro pedido depois das migrações (sessão M2, 23/11/2026; relatório
// em docs/desempenho/2026-11-23-m2-cpu.md). Tira as mensagens dos relatos da carga (carga-local.mjs), para
// eles ficarem como os relatos gravados antes da conversa (migração 103). No próximo começo do servidor,
// darMensagensAosRelatosDeAntes (src/lib/servidor/mensagens-de-antes.ts) refaz as mensagens, até 500 relatos
// por começo, e medir-cpu.mjs mede quanto isso custa de CPU.
//
// Só roda no computador, contra o servidor local, pela Local Explorer do Wrangler, e só num banco com o
// acervo de exemplo, como a carga. Nunca toca prévia, homologação ou produção (regra 12 da guarda).
//
//   node scripts/desempenho/preparar-comeco.mjs               # tira as mensagens dos relatos da carga
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
await consultar(`DELETE FROM relato_mensagens WHERE relato_id >= ${PRIMEIRO_ID}`);
const [{ sem }] = await consultar(`SELECT count(*) AS sem FROM relatos r WHERE NOT EXISTS (SELECT 1 FROM relato_mensagens m WHERE m.relato_id = r.id)`);
console.log(`Relatos sem mensagens agora: ${sem} (de ${relatos} da carga). O próximo começo do servidor refaz até 500.`);
