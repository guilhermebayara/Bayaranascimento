// Estima as linhas lidas do D1 no dia 25 de dezembro, com o acervo cheio, e falha se passar de 3 milhões
// (sessão D1a, 23/11/2026; o limite do plano gratuito é 5 milhões por dia, e a folga combinada com o Gui
// é ficar abaixo de 3 milhões, ver docs/briefs/desempenho.md). Roda à mão, no computador, fora do build.
//
//   npm run build && npx astro preview --host 127.0.0.1 --port 4321     # com dist/server/.dev.vars (AMBIENTE=previa)
//   node scripts/desempenho/carga-local.mjs                              # o acervo cheio
//   node scripts/desempenho/estimar-natal.mjs                            # falha (saída 1) acima de 3 milhões
//
// Como a estimativa é montada:
// - As linhas de cada página são medidas agora, no servidor local, pelos rastros que ele guarda de cada
//   pedido (Local Explorer, como medir-servidor.mjs), como o Gui (administra) e como a Elizete (não).
// - 7 pessoas no dia: 3 que administram (contadas como o Gui) e 4 que não (como a Elizete).
// - Cada pessoa abre 20 páginas no dia, nesta mistura (PAGINAS_POR_PESSOA): Início 3, Explorar na linha do
//   tempo 3, no mural 2, na lista 1, filtrado por família 2, "Me mostre uma memória" 2, memória 4, pessoa 1,
//   Pessoas 1 e árvore 1. É a mesma conta da medição M1 (umas 20 páginas por pessoa).
// - Cada pessoa vê 150 fotos e 20 retratos diferentes no dia, cada um uma vez: as fotos ficam guardadas
//   no aparelho por 7 dias (decisão do Gui de 23/11, da sessão D1b). Sem essa guarda, cada foto vista de
//   novo voltaria ao servidor.
// - Uma hora de modo TV na sala, passando sozinho a cada 10 segundos: 360 memórias, como quem liga a TV, que é
//   uma das 7. Desde a aplicação da E1 (causa 6), a TV da sala abre uma vez a página do modo TV com a ordem
//   (`sala=1`) e cada passagem pede só a rota de uma memória (/explorar/palco, a busca de antemão pede a
//   seguinte, que é a próxima a passar), mais as fotos dela (uma por passagem, em média, já que as outras
//   ficam guardadas na TV) e, numa de cada três passagens, a voz de quem contou (VOZES_POR_PASSAGEM).
// - O que não entra: o começo de cada processo do servidor (migrações e exemplos, causa 9), gravações (as
//   linhas lidas por quem grava memória, relato ou reação no dia) e o "Ver como" das prévias.
const BASE = 'http://127.0.0.1:4321';
const API = `${BASE}/cdn-cgi/local/explorer/api`;
const LIMITE = 3_000_000;
const PESSOAS = [
  { como: 'gui', quantas: 3, quem: 'quem administra (como o Gui)' },
  { como: 'elizete', quantas: 4, quem: 'quem não administra (como a Elizete)' },
];
const PAGINAS_POR_PESSOA = [
  ['Início', '/', 3],
  ['Explorar, linha do tempo', '/explorar', 3],
  ['Explorar, mural', '/explorar?ver=mural', 2],
  ['Explorar, lista', '/explorar?ver=lista', 1],
  ['Explorar, filtro de família', '/explorar?nucleo=bracarense', 2],
  ['Me mostre uma memória', '/explorar?ver=acaso&m=1992-chegada-do-gui', 2],
  ['Memória', '/memorias/1992-chegada-do-gui', 4],
  ['Pessoa', '/pessoas/gui', 1],
  ['Pessoas', '/pessoas', 1],
  ['Árvore', '/arvore', 1],
];
const FOTOS_POR_PESSOA = 150;
const RETRATOS_POR_PESSOA = 20;
const PASSAGENS_DO_MODO_TV = 360;
const MODO_TV = '/explorar?ver=tv&sala=1';
const VOZES_POR_PASSAGEM = 1 / 3;

async function consultar(sql, params) {
  const r = await fetch(`${API}/local/observability/query`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql, params }) });
  const d = await r.json();
  return d.result.rows.map((linha) => Object.fromEntries(d.result.columns.map((c, i) => [c, linha[i]])));
}

/** As linhas lidas por um pedido a este endereço, pelo rastro dele (a mediana de 3 pedidos). */
async function linhasDe(caminho, como) {
  const url = `${BASE}${caminho}`;
  await (await fetch(url, { headers: { cookie: `como=${como}` } })).arrayBuffer();
  const medidas = [];
  for (let vez = 0; vez < 3; vez++) {
    await (await fetch(url, { headers: { cookie: `como=${como}` }, redirect: 'manual' })).arrayBuffer();
    let linhas = null;
    for (let tentativa = 0; tentativa < 30 && linhas === null; tentativa++) {
      const [raiz] = await consultar(`SELECT trace_id FROM spans WHERE parent_id IS NULL AND json_extract(attributes, '$."url.full"') = ? AND duration_ms IS NOT NULL ORDER BY start_ms DESC LIMIT 1`, [url]);
      if (raiz) {
        const [soma] = await consultar(`SELECT COALESCE(SUM(json_extract(attributes, '$."cloudflare.d1.response.rows_read"')), 0) AS linhas FROM spans WHERE trace_id = ? AND kind = 'd1'`, [raiz.trace_id]);
        linhas = soma.linhas;
      } else await new Promise((ok) => setTimeout(ok, 150));
    }
    medidas.push(linhas ?? 0);
  }
  return medidas.sort((a, b) => a - b)[1];
}

/** Uma foto e um retrato de verdade, que a pessoa vê */
async function arquivos(como) {
  const memoria = await (await fetch(`${BASE}/memorias/1992-chegada-do-gui`, { headers: { cookie: `como=${como}` } })).text();
  const pessoas = await (await fetch(`${BASE}/pessoas`, { headers: { cookie: `como=${como}` } })).text();
  return { foto: /(?:src|srcset)="(\/fotos\/[^"\s]+)"/.exec(memoria)?.[1], retrato: /src="(\/retratos\/[^"\s]+)"/.exec(pessoas)?.[1] };
}

const formatar = (n) => Math.round(n).toLocaleString('pt-BR');
const partes = [];
for (const { como, quantas, quem } of PESSOAS) {
  let paginas = 0;
  for (const [nome, caminho, vezes] of PAGINAS_POR_PESSOA) {
    const linhas = await linhasDe(caminho, como);
    paginas += linhas * vezes;
    console.log(`  ${como.padEnd(8)} ${nome.padEnd(30)} ${formatar(linhas).padStart(8)} linhas × ${vezes}`);
  }
  const { foto, retrato } = await arquivos(como);
  const porFoto = foto ? await linhasDe(foto, como) : 0;
  const porRetrato = retrato ? await linhasDe(retrato, como) : 0;
  console.log(`  ${como.padEnd(8)} ${'uma foto'.padEnd(30)} ${formatar(porFoto).padStart(8)} linhas × ${FOTOS_POR_PESSOA}`);
  console.log(`  ${como.padEnd(8)} ${'um retrato'.padEnd(30)} ${formatar(porRetrato).padStart(8)} linhas × ${RETRATOS_POR_PESSOA}`);
  partes.push({ parte: `Páginas de ${quantas} ${quem}`, linhas: paginas * quantas });
  partes.push({ parte: `Fotos e retratos de ${quantas} ${quem}`, linhas: (porFoto * FOTOS_POR_PESSOA + porRetrato * RETRATOS_POR_PESSOA) * quantas });
}
// A primeira página do modo TV da sala, com a ordem, e uma passagem do meio da ordem pela rota de uma memória
const primeira = await linhasDe(MODO_TV, 'gui');
const pagina = await (await fetch(`${BASE}${MODO_TV}`, { headers: { cookie: 'como=gui' } })).text();
const ordem = JSON.parse(/data-ordem-da-tv>([^<]*)</.exec(pagina)?.[1] ?? '[]');
const meio = Math.floor(ordem.length / 2);
const passagem = `/explorar/palco?ver=tv&sala=1&m=${ordem[meio]}&antes=${ordem[meio - 1]}&depois=${ordem[meio + 1]}`;
const porPassagem = ordem.length > 2 ? await linhasDe(passagem, 'gui') : primeira;
const { foto } = await arquivos('gui');
const fotoDaTv = foto ? await linhasDe(foto, 'gui') : 0;
const vozDaTv = await linhasDe('/audios/exemplos/vo-bela-canja.m4a', 'gui');
console.log(`  gui      ${'modo TV, a primeira página'.padEnd(30)} ${formatar(primeira).padStart(8)} linhas × 1`);
console.log(`  gui      ${'modo TV, uma passagem'.padEnd(30)} ${formatar(porPassagem).padStart(8)} linhas + uma foto (${formatar(fotoDaTv)}) + 1/3 de voz (${formatar(vozDaTv)}) × ${PASSAGENS_DO_MODO_TV}`);
partes.push({ parte: `Uma hora de modo TV (${PASSAGENS_DO_MODO_TV} passagens)`, linhas: primeira + (porPassagem + fotoDaTv + vozDaTv * VOZES_POR_PASSAGEM) * PASSAGENS_DO_MODO_TV });

const total = partes.reduce((s, p) => s + p.linhas, 0);
console.log('\nO dia 25, com o acervo cheio:');
for (const p of partes) console.log(`  ${p.parte.padEnd(58)} ${formatar(p.linhas).padStart(12)}`);
console.log(`  ${'Total'.padEnd(58)} ${formatar(total).padStart(12)}   (limite da conferência: ${formatar(LIMITE)}; do plano: 5.000.000)`);
if (process.argv.includes('--json')) console.log(JSON.stringify({ partes, total }, null, 2));
if (total > LIMITE) {
  console.error(`\nPassa de ${formatar(LIMITE)} linhas lidas: faltam ${formatar(total - LIMITE)}.`);
  process.exit(1);
}
console.log(`\nAbaixo de ${formatar(LIMITE)} linhas lidas.`);
