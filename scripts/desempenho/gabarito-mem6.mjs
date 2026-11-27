// MEM-6: HTML bruto, sem normalização, e cinco pedidos quentes no build de publicação.
// Antes de mudar as páginas: carga-local.mjs --fotos=exemplo, depois este script --gravar.
// Depois: mesmo estado local/configuração e este script --comparar. REINICIE o Wrangler a cada build:
// no_bundle pode continuar servindo os módulos anteriores mesmo quando dist/ já contém o build novo.
// Para CPU, X_LOCAL_OBSERVABILITY=false no servidor, como na M2. Use --inspetor 9231 (padrão).
// Os HTMLs ficam fora do repositório. --saida /tmp/mem6-gabarito (padrão).
// O visitante só é aceito pela porta da sala; o cookie não permite assumir esse id nas outras páginas.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const arg = (nome, padrao) => process.argv.includes(nome) ? process.argv[process.argv.indexOf(nome) + 1] : padrao;
const ENDERECOS_LOCAIS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const endereco = new URL(arg('--base', 'http://127.0.0.1:4336'));
if (endereco.protocol !== 'http:' || !ENDERECOS_LOCAIS.has(endereco.hostname)) {
  process.exit(1);
}
const API = new URL('/cdn-cgi/local/explorer/api', endereco).href;
const saida = resolve(arg('--saida', '/tmp/mem6-gabarito'));
const comparar = process.argv.includes('--comparar');
const cpu = process.argv.includes('--cpu');
const leituras = process.argv.includes('--leituras');
mkdirSync(saida, { recursive: true });
const chamar = async (caminho, dados) => {
  const r = await fetch(`${API}${caminho}`, dados && { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(dados) });
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(JSON.stringify(d));
  return d.result;
};
const [banco] = await chamar('/d1/database');
if (banco.name !== 'DB') throw new Error('Esperava o DB local isolado.');
// A Local Explorer aceita só parâmetros de texto. Os valores nulos/números vão como literais escapados.
const literal = (v) => v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`;
const sql = async (texto, params = []) => {
  let n = 0;
  return (await chamar(`/d1/database/${banco.uuid}/raw`, { sql: texto.replace(/\?/g, () => literal(params[n++])) }))[0];
};
const exemplos = (await sql("SELECT id FROM integrantes WHERE id LIKE 'ex-%' LIMIT 1")).results.rows.length;
if (!exemplos) {
  process.exit(1);
}
const visitas = await sql('SELECT * FROM visitas');
const observar = async (sql, params = []) => {
  const r = await chamar('/local/observability/query', { sql, params });
  return r.rows.map((l) => Object.fromEntries(r.columns.map((c, i) => [c, l[i]])));
};
const ultimoRastro = async (url) => (await observar(`SELECT trace_id FROM spans WHERE parent_id IS NULL AND json_extract(attributes, '$."url.full"') = ? AND duration_ms IS NOT NULL ORDER BY start_ms DESC LIMIT 1`, [url]))[0]?.trace_id;
const medirRastro = async (url, anterior) => {
  for (let i = 0; i < 100; i++) {
    const trace = await ultimoRastro(url);
    if (trace && trace !== anterior) {
      const [r] = await observar(`SELECT SUM(json_extract(attributes, '$."cloudflare.d1.response.rows_read"')) AS rows_read, SUM(json_extract(attributes, '$."cloudflare.d1.response.rows_written"')) AS rows_written FROM spans WHERE trace_id = ? AND kind = 'd1'`, [trace]);
      if (r?.rows_read != null) return r;
    }
    await new Promise((ok) => setTimeout(ok, 150));
  }
  throw new Error(`Sem rastro novo: ${url}`);
};
let insp;
if (cpu) {
  const [alvo] = await (await fetch(`http://127.0.0.1:${Number(arg('--inspetor', 9231))}/json`)).json();
  const ws = new WebSocket(alvo.webSocketDebuggerUrl, { headers: { Origin: 'http://127.0.0.1' } });
  await new Promise((ok, falha) => { ws.onopen = ok; ws.onerror = falha; });
  let id = 0;
  const pendentes = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pendentes.has(d.id)) { pendentes.get(d.id)(d); pendentes.delete(d.id); } };
  const envia = (method, params = {}) => new Promise((ok) => { const i = ++id; pendentes.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
  await envia('Profiler.enable');
  await envia('Profiler.setSamplingInterval', { interval: 100 });
  insp = { ws, envia };
}
// Mesmo método da M2: CPU ativa, e separadamente a estimativa sem o SQLite local e (program).
function tempos(p) {
  const nos = new Map(p.nodes.map((n) => [n.id, n]));
  const pais = new Map(p.nodes.flatMap((n) => (n.children ?? []).map((c) => [c, n.id])));
  let ativa = 0, banco = 0, programa = 0;
  p.samples.forEach((s, i) => {
    const f = nos.get(s).callFrame;
    const dt = p.timeDeltas[i] ?? 0;
    if (f.functionName === '(idle)') return;
    ativa += dt;
    if (f.functionName === '(program)') programa += dt;
    if (f.functionName === 'text' && !f.url) {
      for (let pai = pais.get(s); pai !== undefined; pai = pais.get(pai)) {
        if (nos.get(pai).callFrame.url.includes('d1-api')) { banco += dt; break; }
      }
    }
  });
  return { cpu: ativa / 1000, semBanco: (ativa - banco - programa) / 1000 };
}
const telas = [
  ['inicio', '/?hoje=2026-12-25'], ['pessoas', '/pessoas'], ['capitulos', '/capitulos'],
  ['capitulo', '/capitulos/natais'], ['carta', '/carta'], ['nova', '/nova'], ['conta', '/conta'],
  ['acaso', '/explorar?ver=acaso&m=1992-chegada-do-gui'],
  ['epoca', '/capitulos/os-anos-90'], ['periodo', '/capitulos/infancia-da-giovanna'],
  ['filho', '/capitulos/natais-na-vo-vivica'], ['capitulo-lista', '/capitulos/natais?ver=lista'],
  ['capitulo-mural', '/capitulos/natais?ver=mural'],
  ['inicio-primeira', '/?hoje=2026-12-25'], ['inicio-sem-novo', '/?hoje=2026-11-26'],
];
const leitores = arg('--leitores', 'gui,elizete,lucas-magno').split(',');
const resultado = [];
try {
  for (const leitor of leitores) for (const [nome, caminho] of telas) {
    if (arg('--so', '') && !new RegExp(arg('--so', '')).test(nome)) continue;
    const preparar = async () => {
      if (!nome.startsWith('inicio')) return;
      // Os campos que aparecem na página são constantes; ultima_em impede a abertura de nova visita.
      await sql(`INSERT OR REPLACE INTO visitas (pessoa, primeira_em, visita_em, ultima_em, anterior_em, carta_em)
        VALUES (?, '2026-11-01 12:00:00', '2026-11-26 12:00:00', datetime('now'), ?, ?)`,
        [leitor, nome === 'inicio-sem-novo' ? '2099-01-01 12:00:00' : '2026-11-20 12:00:00', nome === 'inicio-primeira' ? null : '2026-11-01 12:00:00']);
    };
    const pedir = async () => {
      const r = await fetch(new URL(caminho, endereco), { redirect: 'manual', headers: { cookie: `como=${leitor}` } });
      const html = Buffer.from(await r.arrayBuffer());
      if (r.status !== 200) throw new Error(`${leitor} ${caminho}: ${r.status}`);
      return { html, timing: r.headers.get('server-timing') };
    };
    await preparar();
    const { html } = await pedir();
    const arquivo = `${saida}/${leitor}-${nome}.html`;
    if (comparar) {
      const antes = readFileSync(arquivo);
      if (!antes.equals(html)) {
        writeFileSync(`${arquivo}.depois`, html);
        throw new Error(`HTML diferente: ${arquivo} (${antes.length} → ${html.length} bytes)`);
      }
    } else writeFileSync(arquivo, html);
    const medidas = [];
    if ((cpu || leituras) && !['epoca', 'periodo', 'filho', 'capitulo-lista', 'capitulo-mural', 'inicio-primeira', 'inicio-sem-novo'].includes(nome)) {
      for (let i = 0; i < 5; i++) {
        await preparar();
        const url = new URL(caminho, endereco).href;
        const anterior = leituras ? await ultimoRastro(url) : undefined;
        if (cpu) await insp.envia('Profiler.start');
        const r = await pedir();
        const perfil = cpu ? (await insp.envia('Profiler.stop')).result.profile : undefined;
        if (perfil && process.argv.includes('--perfis')) writeFileSync(`${saida}/${comparar ? 'depois' : 'antes'}-${leitor}-${nome}-${i}.cpuprofile`, JSON.stringify(perfil));
        const tempo = perfil ? tempos(perfil) : {};
        const linhas = leituras ? await medirRastro(url, anterior) : {};
        medidas.push({ ...tempo, ...linhas, timing: r.timing });
      }
    }
    resultado.push({ leitor, nome, caminho, bytes: html.length, sha256: createHash('sha256').update(html).digest('hex'), medidas });
    console.log(`${comparar ? 'Igual' : 'Gravado'} ${leitor} ${nome}: ${html.length} bytes`);
  }
  // Na sala, quem olha é o visitante mesmo que a conexão tenha cookie do Gui.
  const r = await fetch(new URL('/explorar?ver=tv&sala=1', endereco), { headers: { cookie: 'como=gui' } });
  const html = Buffer.from(await r.arrayBuffer());
  const arquivo = `${saida}/visitante-sala.html`;
  if (r.status !== 200) throw new Error(`Sala: ${r.status}`);
  if (comparar && !readFileSync(arquivo).equals(html)) { writeFileSync(`${arquivo}.depois`, html); throw new Error('HTML diferente na sala.'); }
  if (!comparar) writeFileSync(arquivo, html);
  resultado.push({ leitor: 'visitante', nome: 'sala', bytes: html.length, sha256: createHash('sha256').update(html).digest('hex') });
  writeFileSync(`${saida}/${comparar ? 'depois' : 'antes'}${leituras ? '-leituras' : ''}.json`, JSON.stringify(resultado, null, 2));
} finally {
  insp?.ws.close();
  await sql('DELETE FROM visitas');
  for (const valores of visitas.results.rows) await sql(`INSERT INTO visitas (${visitas.results.columns.join(',')}) VALUES (${valores.map(() => '?').join(',')})`, valores);
}
// O inspetor do Wrangler pode manter o WebSocket em fechamento. Todas as gravações acima já terminaram.
process.exit(0);
