// MEM-6: uma importação real pela API, só na homologação SIMULADA local.
// Use uma cópia isolada do estado do acervo cheio (654 memórias), nunca a referência do gabarito.
// A configuração é a wrangler-cpu-homologa com DB_HOMOLOGA apontando à cópia LOCAL do DB cheio,
// --local-upstream homologa.memorias.bayara.com.br, porta 4337. A origem abaixo só passa pela guarda HTTP;
// todas as conexões deste script são com loopback. Não muda gatilho nem código do espelho.
import { writeFileSync } from 'node:fs';
const ENDERECOS_LOCAIS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const endereco = new URL('http://127.0.0.1:4337');
if (endereco.protocol !== 'http:' || !ENDERECOS_LOCAIS.has(endereco.hostname)) {
  process.exit(1);
}
const API = new URL('/cdn-cgi/local/explorer/api', endereco).href;
const chamar = async (caminho, dados) => {
  const r = await fetch(`${API}${caminho}`, dados && { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(dados) });
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(JSON.stringify(d));
  return d.result;
};
// Aquecer antes, para contar somente a importação, sem migrações/preparo do processo.
await (await fetch(new URL('/', endereco), { headers: { cookie: 'como=gui' } })).arrayBuffer();
const bancos = await chamar('/d1/database');
const banco = bancos.find((b) => b.name === 'DB_HOMOLOGA');
if (!banco) throw new Error('Esperava DB_HOMOLOGA na simulação.');
const sql = async (sql) => (await chamar(`/d1/database/${banco.uuid}/raw`, { sql }))[0];
const exemplos = (await sql("SELECT id FROM integrantes WHERE id LIKE 'ex-%' LIMIT 1")).results.rows.length;
if (!exemplos) {
  process.exit(1);
}
const memorias = (await sql('SELECT COUNT(*) FROM memorias')).results.rows[0][0];
if (memorias < 600) throw new Error('Esperava acervo cheio, em uma cópia descartável.');
const copia = await fetch(new URL('/api/copia-para-o-espelho', endereco), { headers: { cookie: 'como=gui' } });
if (copia.status !== 200) throw new Error(`Cópia: ${copia.status}`);
const arquivo = await copia.arrayBuffer();
const observacao = async (sql, params = []) => {
  const d = await chamar('/local/observability/query', { sql, params });
  return d.rows.map((l) => Object.fromEntries(d.columns.map((c, i) => [c, l[i]])));
};
const ultimos = () => observacao(`SELECT trace_id FROM spans WHERE parent_id IS NULL AND json_extract(attributes, '$."url.full"') LIKE '%/api/espelho' AND duration_ms IS NOT NULL ORDER BY start_ms DESC LIMIT 1`);
const [antes] = await ultimos();
const corpo = new FormData();
corpo.append('copia', new Blob([arquivo], { type: 'application/json' }), 'familia-de-exemplo.json');
const r = await fetch(new URL('/api/espelho', endereco), { method: 'POST', body: corpo, redirect: 'manual', headers: { cookie: 'como=gui', Origin: 'http://homologa.memorias.bayara.com.br' } });
await r.arrayBuffer();
const local = decodeURIComponent(r.headers.get('location') ?? '');
if (!/ok=/.test(local)) throw new Error(`Importação: ${r.status} ${local}`);
let medida;
for (let i = 0; i < 80; i++) {
  const [raiz] = await ultimos();
  if (raiz && raiz.trace_id !== antes?.trace_id) {
    const [soma] = await observacao(`SELECT COUNT(*) AS comandos, SUM(json_extract(attributes, '$."cloudflare.d1.response.rows_written"')) AS rows_written, SUM(json_extract(attributes, '$."cloudflare.d1.response.rows_read"')) AS rows_read FROM spans WHERE trace_id = ? AND kind = 'd1'`, [raiz.trace_id]);
    if (soma.rows_written > 0) { medida = soma; break; }
  }
  await new Promise((ok) => setTimeout(ok, 150));
}
if (!medida) throw new Error('Sem rastro completo da importação.');
const resultado = { memoriasAntes: memorias, bytes: arquivo.byteLength, status: r.status, local, ...medida, percentualDoPlano: medida.rows_written / 1000, passouDe50Mil: medida.rows_written > 50000 };
writeFileSync('/tmp/mem6-gravacoes-espelho.json', JSON.stringify(resultado, null, 2));
console.log(JSON.stringify(resultado, null, 2));
if (resultado.passouDe50Mil) {
  console.error('Parada pedida pelo Gui: mais de 50.000 gravações numa importação. Registrar a pergunta no relatório, sem mexer nos gatilhos.');
  process.exitCode = 2;
}
