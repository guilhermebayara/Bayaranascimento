// Medição M2 (23/11/2026; relatório em docs/desempenho/2026-11-23-m2-cpu.md): a CPU e a memória de cada
// pedido no workerd local, com o acervo cheio, contra os 10 ms de CPU e os 128 MB do plano gratuito.
//
// O método é o do medidor do BFO (scripts/desempenho/medir-cpu.mjs no repositório guilhermebayara/bfo,
// branch homologacao, Sessão AY): sobe o build de publicação (dist/server/entry.mjs) no `wrangler dev`, liga
// no inspetor do workerd pelo protocolo do DevTools e grava um perfil de CPU de cada pedido, com uma amostra
// a cada 0,1 ms. A CPU do pedido é o tempo amostrado menos o "(idle)". A espera pelo D1 e pelo R2 cai no
// "(idle)"; a conversão do resultado do D1 em objetos (o d1-api, que roda dentro do Worker também na
// produção) e o desenho do HTML contam como CPU. A janela vai do pedido até o fim do corpo da resposta,
// porque o Astro manda a página em partes e a CPU do fim da página também é do pedido.
//
// Memória: numa rodada à parte de cada pedido (a amostragem pesa na CPU), a pilha do V8 antes, o maior uso
// lido durante o pedido (o inspetor só responde entre um passo e outro, quando o pedido espera o banco) e o
// total alocado no pedido pela amostragem de alocações do V8, contando o que a coleta de lixo já levou. O
// pico de verdade fica entre o maior uso lido e "antes + alocado". Os ArrayBuffers (corpos de pedido e de
// arquivo) ficam fora da pilha e aparecem em "fora da pilha".
//
// Só local: o servidor sobe aqui, em 127.0.0.1, com as configurações só locais desta pasta
// (wrangler-cpu*.jsonc), e o estado local da carga (carga-local.mjs). Antes, uma vez:
//
//   npx astro build
//   node node_modules/wrangler/bin/wrangler.js dev -c scripts/desempenho/wrangler-cpu.jsonc --persist-to ESTADO --ip 127.0.0.1 --port 4321
//   node scripts/enviar-fotos-de-exemplo.mjs http://127.0.0.1:4321 && node scripts/desempenho/carga-local.mjs
//   (pare o servidor)
//
// E então:
//
//   node scripts/desempenho/medir-cpu.mjs --estado ESTADO --saida PASTA [--fase paginas,pesadas,gravacoes,espelho,copias,comeco] [--repeticoes 5]
//
// A fase "copias" (sessão D1e) mede a cópia em partes (o índice e cada parte, como administrador e com o
// token de serviço) e a cópia para o espelho; a fase "espelho-familia", depois dela, o espelho recebendo essa
// cópia e recusando a inteira. As fases "pesadas" e "espelho" são as
// da M2, de antes da cópia em partes: no código de depois, "pesadas" baixa o índice, e "espelho" recusa o
// arquivo.
//
// A fase "comeco" pede, no meio, a preparação do banco (preparar-comeco.mjs) e deixa os relatos da carga
// sem mensagens até o servidor refazê-las; rode por último.
import { execFileSync, spawn } from 'node:child_process';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'http://127.0.0.1:4321';
if (/^(memorias|homologa\.memorias)\.bayara\.com\.br$/.test(new URL(BASE).hostname)) {
  throw new Error('A medição de CPU só roda no servidor local.');
}
const raiz = fileURLToPath(new URL('../..', import.meta.url));
const wrangler = join(raiz, 'node_modules/wrangler/bin/wrangler.js');
const arg = (nome, padrao = null) => (process.argv.includes(nome) ? process.argv[process.argv.indexOf(nome) + 1] : padrao);
const estado = arg('--estado');
if (!estado || !existsSync(estado)) {
  console.error('Informe --estado, a pasta do estado local com a carga (ver o alto deste arquivo).');
  process.exit(1);
}
const saida = resolve(arg('--saida', join(estado, '..', 'cpu')));
const dentro = relative(raiz, saida);
if (!dentro.startsWith('..') && !isAbsolute(dentro)) {
  console.error('O resultado fica fora do repositório. Escolha outra --saida.');
  process.exit(1);
}
mkdirSync(saida, { recursive: true });
const repeticoes = Number(arg('--repeticoes', 5));
const fases = arg('--fase', 'paginas,pesadas,gravacoes,espelho,comeco').split(',');
const PORTA_DO_INSPETOR = 9231;
const PESSOAS = arg('--pessoas', 'gui,giovanna,lucas-magno,elizete').split(',');
const MEMORIA_CHEIA = arg('--memoria', 'carga-0478');
// --so "Modo TV": só as telas cujo nome passa na expressão (sessão AB, para medir uma tela só)
const SO = arg('--so') ? new RegExp(arg('--so')) : null;

// --- O servidor e o inspetor ---

let servidor;
async function subir(config, extras = [], env = {}) {
  await descer();
  const args = ['dev', '-c', config, '--persist-to', estado, '--ip', '127.0.0.1', '--port', '4321', '--inspector-port', String(PORTA_DO_INSPETOR), ...extras];
  if (args.some((a) => /remote/.test(a))) throw new Error('A medição nunca fala com o Cloudflare de verdade.');
  servidor = spawn(process.execPath, [wrangler, ...args], {
    cwd: raiz,
    // Sem os rastros locais do Wrangler: eles somam trabalho a cada consulta que a produção sem Workers Logs não faz
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', X_LOCAL_OBSERVABILITY: 'false', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  servidor.stdout.on('data', (d) => (log += d));
  servidor.stderr.on('data', (d) => (log += d));
  for (let i = 0; !/Ready on/.test(log); i++) {
    if (i > 240 || servidor.exitCode !== null) throw new Error(`O wrangler dev não subiu:\n${log.slice(-2000)}`);
    await espera(500);
  }
  return inspetor();
}
async function descer() {
  if (!servidor) return;
  insp?.ws.close();
  const s = servidor;
  servidor = undefined;
  s.kill('SIGINT');
  for (let i = 0; i < 40 && s.exitCode === null; i++) await espera(250);
  if (s.exitCode === null) s.kill('SIGKILL');
  await espera(1000);
}
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

let insp;
async function inspetor() {
  const [alvo] = await (await fetch(`http://127.0.0.1:${PORTA_DO_INSPETOR}/json`)).json();
  const ws = new WebSocket(alvo.webSocketDebuggerUrl, { headers: { Origin: 'http://127.0.0.1' } });
  let id = 0;
  const pendentes = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pendentes.has(d.id)) {
      pendentes.get(d.id)(d);
      pendentes.delete(d.id);
    }
  };
  await new Promise((ok, falha) => {
    ws.onopen = ok;
    ws.onerror = () => falha(new Error('Inspetor do workerd indisponível.'));
  });
  const envia = (method, params = {}) =>
    new Promise((ok) => {
      const i = ++id;
      pendentes.set(i, ok);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  await envia('Profiler.enable');
  await envia('Profiler.setSamplingInterval', { interval: 100 });
  insp = { ws, envia };
  return insp;
}

// No computador, o D1 roda no mesmo processo do Worker: a leitura da resposta do banco (a função nativa
// "text" chamada pelo d1-api) junta o trabalho do SQLite local, que na produção roda em outra máquina.
// Essas amostras e o "(program)" (trabalho do motor fora de uma função JS) ficam separados, para a conta
// dar a CPU bruta e a CPU sem o banco local.
function tempoAtivo(profile) {
  const nos = new Map(profile.nodes.map((n) => [n.id, n]));
  const pai = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) pai.set(c, n.id);
  const veioDoD1 = (id) => {
    for (let p = pai.get(id); p !== undefined; p = pai.get(p)) if ((nos.get(p)?.callFrame.url ?? '').includes('d1-api')) return true;
    return false;
  };
  let lendoOBanco = 0;
  let programa = 0;
  let amostrado = 0;
  let ocioso = 0;
  let coleta = 0;
  const porFuncao = new Map();
  const porArquivo = new Map();
  profile.samples.forEach((s, i) => {
    const delta = profile.timeDeltas[i] ?? 0;
    amostrado += delta;
    const f = nos.get(s)?.callFrame;
    const nome = f?.functionName;
    if (nome === '(idle)') {
      ocioso += delta;
      return;
    }
    if (nome === '(garbage collector)') coleta += delta;
    if (nome === '(program)') programa += delta;
    if (nome === 'text' && !f?.url && veioDoD1(s)) lendoOBanco += delta;
    const arquivo = (f?.url ?? '').split('/').at(-1) || '(motor)';
    const chave = `${nome || '(anônima)'} ${arquivo}:${f?.lineNumber ?? ''}`;
    porFuncao.set(chave, (porFuncao.get(chave) ?? 0) + delta);
    porArquivo.set(arquivo, (porArquivo.get(arquivo) ?? 0) + delta);
  });
  const top = (mapa, n) =>
    [...mapa]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([nome, us]) => [nome, Math.round(us / 100) / 10]);
  return {
    cpu_ms: (amostrado - ocioso) / 1000,
    cpu_sem_banco_local_ms: (amostrado - ocioso - lendoOBanco - programa) / 1000,
    lendo_o_banco_ms: lendoOBanco / 1000,
    programa_ms: programa / 1000,
    coleta_de_lixo_ms: coleta / 1000,
    funcoes: top(porFuncao, 8),
    arquivos: top(porArquivo, 6),
    janela_ms: (profile.endTime - profile.startTime) / 1000,
  };
}

/** Um perfil de CPU em volta da ação, ou, com memoria, a leitura da pilha e das alocações. */
async function perfil(acao, { memoria = false } = {}) {
  if (memoria) {
    const antes = (await insp.envia('Runtime.getHeapUsage')).result;
    await insp.envia('HeapProfiler.startSampling', { samplingInterval: 8192, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    let parar = false;
    let maior = antes.usedSize;
    let maiorFora = antes.backingStorageSize ?? 0;
    const vigia = (async () => {
      while (!parar) {
        const r = (await insp.envia('Runtime.getHeapUsage')).result;
        maior = Math.max(maior, r?.usedSize ?? 0);
        maiorFora = Math.max(maiorFora, r?.backingStorageSize ?? 0);
        await espera(5);
      }
    })();
    const resposta = await acao();
    parar = true;
    await vigia;
    const amostras = (await insp.envia('HeapProfiler.stopSampling')).result?.profile;
    let alocado = 0;
    const anda = (n) => {
      alocado += n.selfSize;
      n.children.forEach(anda);
    };
    if (amostras) anda(amostras.head);
    const depois = (await insp.envia('Runtime.getHeapUsage')).result;
    const mb = (b) => Math.round(b / 1e5) / 10;
    return {
      pilha_antes_mb: mb(antes.usedSize),
      pilha_maior_lida_mb: mb(maior),
      pilha_depois_mb: mb(depois.usedSize),
      alocado_no_pedido_mb: mb(alocado),
      teto_estimado_mb: mb(antes.usedSize + alocado),
      fora_da_pilha_maior_mb: mb(maiorFora),
      ...resposta,
    };
  }
  await insp.envia('Profiler.start');
  const t0 = performance.now();
  const resposta = await acao();
  const relogio = performance.now() - t0;
  const { result } = await insp.envia('Profiler.stop');
  return { ...tempoAtivo(result.profile), relogio_ms: relogio, ...resposta };
}

const mediana = (v) => {
  const o = [...v].sort((a, b) => a - b);
  return o.length % 2 ? o[(o.length - 1) / 2] : (o[o.length / 2 - 1] + o[o.length / 2]) / 2;
};
const r1 = (n) => Math.round(n * 10) / 10;

/** A primeira vez (fria), as repetições quentes e uma rodada de memória. */
async function mede(nome, acao, { vezes = repeticoes, memoria = true, fria = true } = {}) {
  const medidas = [];
  const primeira = fria ? await perfil(() => acao(-1)) : null;
  for (let k = 0; k < vezes; k++) medidas.push(await perfil(() => acao(k)));
  const mem = memoria ? await perfil(() => acao(vezes), { memoria: true }) : null;
  const cpu = medidas.map((m) => m.cpu_ms);
  const pior = medidas.reduce((a, b) => (b.cpu_ms > a.cpu_ms ? b : a));
  const r = {
    nome,
    cpu_primeira_ms: primeira ? r1(primeira.cpu_ms) : null,
    cpu_mediana_ms: r1(mediana(cpu)),
    cpu_min_ms: r1(Math.min(...cpu)),
    cpu_pior_ms: r1(Math.max(...cpu)),
    sem_banco_local_mediana_ms: r1(mediana(medidas.map((m) => m.cpu_sem_banco_local_ms))),
    sem_banco_local_pior_ms: r1(Math.max(...medidas.map((m) => m.cpu_sem_banco_local_ms))),
    lendo_o_banco_mediana_ms: r1(mediana(medidas.map((m) => m.lendo_o_banco_ms))),
    programa_mediana_ms: r1(mediana(medidas.map((m) => m.programa_ms))),
    coleta_mediana_ms: r1(mediana(medidas.map((m) => m.coleta_de_lixo_ms))),
    relogio_mediana_ms: r1(mediana(medidas.map((m) => m.relogio_ms))),
    status: pior.status,
    bytes: pior.bytes,
    onde_vai_o_tempo: pior.funcoes,
    por_arquivo: pior.arquivos,
    memoria: mem,
    medidas: medidas.map((m) => r1(m.cpu_ms)),
  };
  console.log(
    `${nome.padEnd(58)} CPU ${String(r.cpu_mediana_ms).padStart(6)} ms (de ${r.cpu_min_ms} a ${r.cpu_pior_ms}; primeira ${r.cpu_primeira_ms ?? '-'}; sem o banco local ${r.sem_banco_local_mediana_ms}, pior ${r.sem_banco_local_pior_ms})${mem ? `  pilha ${mem.pilha_antes_mb}→${mem.pilha_maior_lida_mb} MB, alocado ${mem.alocado_no_pedido_mb} MB` : ''}  ${r.status} ${r.bytes ?? ''}`,
  );
  return r;
}

async function pedir(caminho, { como = 'gui', metodo = 'GET', corpo, cabecalhos = {} } = {}) {
  const resposta = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    body: corpo,
    redirect: 'manual',
    headers: { cookie: `como=${como}`, Origin: BASE, ...cabecalhos },
  });
  const buffer = Buffer.from(await resposta.arrayBuffer());
  return { status: resposta.status, bytes: buffer.length, buffer, cabecalhos: resposta.headers };
}
const so = (r) => ({ status: r.status, bytes: r.bytes });

const resultado = existsSync(join(saida, 'cpu.json')) ? JSON.parse(readFileSync(join(saida, 'cpu.json'), 'utf8')) : {};
const guarda = () => writeFileSync(join(saida, 'cpu.json'), `${JSON.stringify({ ...resultado, quando: new Date().toISOString(), repeticoes }, null, 1)}\n`);

// --- As fases ---

const TELAS = [
  ['Início', '/'],
  ['Explorar, linha do tempo', '/explorar'],
  ['Explorar, mural', '/explorar?ver=mural'],
  ['Explorar, mural, todas as fotos', '/explorar?ver=mural&fotos=todas'],
  ['Explorar, lista', '/explorar?ver=lista'],
  ['Explorar, filtro de família', '/explorar?nucleo=bracarense'],
  ['Explorar, filtro de tipo', '/explorar?tipo=festa'],
  ['Me mostre uma memória', `/explorar?ver=acaso&m=${MEMORIA_CHEIA}`],
  ['Modo TV, uma passagem', `/explorar?ver=tv&m=${MEMORIA_CHEIA}`],
  // Desde a aplicação da E1 (causa 6), a primeira página do modo TV leva a ordem, e cada passagem pede só a
  // rota de uma memória, com as vizinhas e a posição da ordem
  ['Modo TV, a rota de uma memória', `/explorar/palco?ver=tv&m=${MEMORIA_CHEIA}&antes=1992-chegada-do-gui&depois=1994-natal-na-vo-vivica`],
  ['Modo TV da sala, a rota de uma memória', `/explorar/palco?ver=tv&sala=1&m=1994-natal-na-vo-vivica&antes=1958-casamento-vivica-tonho&depois=1998-natal-com-os-primos`],
  ['Memória cheia (10 fotos, 6 relatos, 2 áudios)', `/memorias/${MEMORIA_CHEIA}`],
  ['Pessoa (Gui)', '/pessoas/gui'],
  ['Pessoa, linha do tempo', '/pessoas/gui?ver=linha'],
  ['Pessoas', '/pessoas'],
  ['Árvore', '/arvore'],
  ['Capítulo reunido (Natais)', '/capitulos/natais'],
  ['Capítulo época (Anos 90)', '/capitulos/os-anos-90'],
  ['Capítulos', '/capitulos'],
  ['Carta', '/carta'],
  ['Nova memória', '/nova'],
  ['Sua conta', '/conta'],
];

async function fasePaginas() {
  await subir('scripts/desempenho/wrangler-cpu.jsonc');
  // O primeiro pedido do servidor prepara o banco (migrações e exemplos): fica fora das páginas
  const comeco = await perfil(async () => so(await pedir('/')));
  console.log(`Primeiro pedido do servidor (prévia, banco já preparado antes): ${r1(comeco.cpu_ms)} ms`);
  const paginas = [];
  for (const pessoa of PESSOAS) {
    for (const [nome, caminho] of TELAS.filter(([nome]) => !SO || SO.test(nome))) paginas.push({ pessoa, caminho, ...(await mede(`${pessoa}: ${nome}`, async () => so(await pedir(caminho, { como: pessoa })))) });
  }
  // Os arquivos: cada foto e cada retrato que a tela mostra também é um pedido ao Worker
  const memoria = (await pedir(`/memorias/${MEMORIA_CHEIA}`)).buffer.toString();
  const foto = memoria.match(/\/fotos\/(\d{4}\/[0-9a-f-]{36}\.jpg)/)?.[1] ?? 'exemplos/chico-1.jpg';
  const arquivos = [
    ['Foto original da carga (2400 px, 800 KB)', `/fotos/${foto}`],
    ['Foto de exemplo, cópia pequena', '/fotos/pequena/exemplos/chico-1.jpg'],
    ['Retrato de exemplo, cópia pequena', '/retratos/pequeno/exemplos/chico-1.jpg'],
    ['Áudio de exemplo', '/audios/exemplos/vo-bela-canja.m4a'],
  ];
  for (const pessoa of PESSOAS.filter((p) => ['gui', 'elizete'].includes(p))) for (const [nome, caminho] of arquivos) paginas.push({ pessoa, caminho, ...(await mede(`${pessoa}: ${nome}`, async () => so(await pedir(caminho, { como: pessoa })))) });
  resultado.primeiro_pedido_do_servidor_previa_ms = r1(comeco.cpu_ms);
  resultado.paginas = paginas;
  guarda();
}

function chavesDoToken() {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'medicao-local', alg: 'RS256', use: 'sig' };
  return { jwks: JSON.stringify({ keys: [jwk] }), privateKey };
}
function token(privateKey, clientId) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const agora = Math.floor(Date.now() / 1000);
  const corpo = `${b64({ alg: 'RS256', kid: 'medicao-local', typ: 'JWT' })}.${b64({ iss: 'https://medicao-local.invalid', aud: ['medicao-local'], common_name: clientId, exp: agora + 3600, nbf: agora - 60, iat: agora })}`;
  return `${corpo}.${createSign('RSA-SHA256').update(corpo).sign(privateKey).toString('base64url')}`;
}

async function fasePesadas() {
  const pesadas = [];
  await subir('scripts/desempenho/wrangler-cpu.jsonc');
  await pedir('/');
  let copia;
  pesadas.push(
    await mede('Baixar cópia do acervo (GET /api/copia, Gui)', async () => {
      const r = await pedir('/api/copia');
      copia = r.buffer;
      return so(r);
    }, { vezes: 3 }),
  );
  writeFileSync(join(saida, 'copia-do-acervo.json'), copia);
  // A cópia mensal, com o token de serviço simulado (medidor-copia.mjs)
  const { jwks, privateKey } = chavesDoToken();
  const clientId = 'medicao-local.access';
  await subir('scripts/desempenho/wrangler-cpu-copia.jsonc', ['--var', `MEDICAO_JWKS:${jwks}`, '--var', `COPIA_CLIENT_ID:${clientId}`]);
  await pedir('/');
  pesadas.push(
    await mede('Cópia mensal (GET /api/copia, token de serviço)', async () => {
      const r = await fetch(`${BASE}/api/copia`, { headers: { 'Cf-Access-Jwt-Assertion': token(privateKey, clientId) } });
      const b = Buffer.from(await r.arrayBuffer());
      if (r.status !== 200 || !b.toString('utf8', 0, 200).includes('"acervo"')) throw new Error(`A cópia mensal simulada não veio: ${r.status} ${b.toString('utf8', 0, 200)}`);
      return { status: r.status, bytes: b.length };
    }, { vezes: 3 }),
  );
  resultado.pesadas = pesadas;
  guarda();
}

async function faseEspelho() {
  const arquivo = join(saida, 'copia-do-acervo.json');
  if (!existsSync(arquivo)) throw new Error('Rode antes a fase "pesadas", que baixa a cópia do acervo.');
  const copia = readFileSync(arquivo);
  await subir('scripts/desempenho/wrangler-cpu-homologa.jsonc', ['--local-upstream', 'homologa.memorias.bayara.com.br']);
  const origem = 'http://homologa.memorias.bayara.com.br';
  const pedirNaHomologacao = async (caminho, opcoes = {}) => {
    const r = await fetch(`${BASE}${caminho}`, { redirect: 'manual', ...opcoes, headers: { cookie: 'como=gui', Origin: origem, ...(opcoes.headers ?? {}) } });
    return { status: r.status, bytes: (await r.arrayBuffer()).byteLength, local: r.headers.get('location') };
  };
  const primeiro = await perfil(() => pedirNaHomologacao('/'));
  console.log(`Primeiro pedido da homologação simulada (banco novo, migrações): ${r1(primeiro.cpu_ms)} ms`);
  const envio = async () => {
    const corpo = new FormData();
    corpo.append('copia', new Blob([copia], { type: 'application/json' }), 'acervo.json');
    const r = await pedirNaHomologacao('/api/espelho', { method: 'POST', body: corpo });
    if (!/ok=/.test(decodeURIComponent(r.local ?? ''))) throw new Error(`O espelho não foi gravado: ${r.status} ${decodeURIComponent(r.local ?? '')}`);
    return { status: r.status, bytes: copia.length };
  };
  resultado.espelho = { primeiro_pedido_da_homologacao_ms: r1(primeiro.cpu_ms), envio: await mede(`Espelho da produção (POST /api/espelho, arquivo de ${Math.round(copia.length / 1e5) / 10} MB)`, envio, { vezes: 3 }) };
  resultado.espelho.depois = [];
  for (const [nome, caminho] of [['Início na homologação', '/'], ['Pessoas na homologação', '/pessoas'], ['Árvore na homologação', '/arvore']]) {
    resultado.espelho.depois.push(await mede(nome, () => pedirNaHomologacao(caminho), { memoria: false }));
  }
  guarda();
}

// A cópia em partes, a cópia para o espelho e o espelho recebendo ela (sessão D1e, 23/11/2026; relatório em
// docs/desempenho/2026-11-23-d1e.md). Cada parte é um pedido; a tabela traz a pior delas.
const resumoDaMedida = (r) => ({
  nome: r.nome,
  cpu_primeira_ms: r.cpu_primeira_ms,
  cpu_mediana_ms: r.cpu_mediana_ms,
  cpu_min_ms: r.cpu_min_ms,
  cpu_pior_ms: r.cpu_pior_ms,
  sem_banco_local_mediana_ms: r.sem_banco_local_mediana_ms,
  sem_banco_local_pior_ms: r.sem_banco_local_pior_ms,
  bytes: r.bytes,
  alocado_mb: r.memoria?.alocado_no_pedido_mb ?? null,
  pilha_maior_lida_mb: r.memoria?.pilha_maior_lida_mb ?? null,
  fora_da_pilha_maior_mb: r.memoria?.fora_da_pilha_maior_mb ?? null,
  onde_vai_o_tempo: r.onde_vai_o_tempo,
});
async function faseCopias() {
  const copias = { partes: [], mensal: [] };
  await subir('scripts/desempenho/wrangler-cpu.jsonc');
  await pedir('/');
  copias.indice = resumoDaMedida(await mede('Cópia em partes: o índice (GET /api/copia, Gui)', async () => so(await pedir('/api/copia')), { vezes: 5 }));
  const indice = JSON.parse((await pedir('/api/copia')).buffer.toString());
  const enderecos = [];
  for (const { tabela } of indice.indice) {
    let depois = null;
    for (;;) {
      const caminho = `/api/copia?tabela=${encodeURIComponent(tabela)}${depois === null ? '' : `&depois=${depois}`}`;
      enderecos.push(caminho);
      let ultima;
      const r = await mede(`Cópia em partes: ${tabela}${depois === null ? '' : ` depois de ${depois}`}`, async () => {
        ultima = await pedir(caminho);
        if (ultima.status !== 200) throw new Error(`${caminho}: ${ultima.status}`);
        return so(ultima);
      }, { vezes: 5 });
      copias.partes.push({ tabela, depois, ...resumoDaMedida(r) });
      const parte = JSON.parse(ultima.buffer.toString());
      if (parte.proxima === null) break;
      depois = parte.proxima;
    }
  }
  let familia;
  copias.familia = resumoDaMedida(
    await mede('Baixar cópia para o espelho (GET /api/copia-para-o-espelho, Gui)', async () => {
      const r = await pedir('/api/copia-para-o-espelho');
      familia = r.buffer;
      return so(r);
    }),
  );
  writeFileSync(join(saida, 'copia-para-o-espelho.json'), familia);
  resultado.copias = copias;
  guarda();
  // A cópia mensal, com o token de serviço simulado (medidor-copia.mjs): o índice e cada parte, uma vez cada
  const { jwks, privateKey } = chavesDoToken();
  const clientId = 'medicao-local.access';
  await subir('scripts/desempenho/wrangler-cpu-copia.jsonc', ['--var', `MEDICAO_JWKS:${jwks}`, '--var', `COPIA_CLIENT_ID:${clientId}`]);
  await pedir('/');
  for (const caminho of ['/api/copia', ...enderecos]) {
    const r = await mede(`Cópia mensal, token de serviço: ${caminho}`, async () => {
      const resposta = await fetch(`${BASE}${caminho}`, { headers: { 'Cf-Access-Jwt-Assertion': token(privateKey, clientId) } });
      const b = Buffer.from(await resposta.arrayBuffer());
      if (resposta.status !== 200 || !b.toString('utf8', 0, 60).includes('"acervo"')) throw new Error(`A parte da cópia mensal simulada não veio: ${resposta.status} ${b.toString('utf8', 0, 200)}`);
      return { status: resposta.status, bytes: b.length };
    }, { vezes: 1, fria: false });
    copias.mensal.push({ caminho, ...resumoDaMedida(r) });
  }
  const pior = (lista) => lista.reduce((a, b) => (b.cpu_pior_ms > a.cpu_pior_ms ? b : a));
  copias.resumo = {
    partes: copias.partes.length,
    parte_mais_pesada: pior(copias.partes),
    parte_mais_pesada_sem_banco_local: copias.partes.reduce((a, b) => (b.sem_banco_local_pior_ms > a.sem_banco_local_pior_ms ? b : a)),
    bytes_somados: copias.partes.reduce((s, p) => s + (p.bytes ?? 0), 0),
    mensal_pior: pior(copias.mensal),
  };
  resultado.copias = copias;
  guarda();
}

// O espelho na homologação simulada, recebendo a cópia para o espelho que a fase "copias" baixou, e recusando a
// cópia inteira que a fase "pesadas" do código de antes baixou (se estiver na pasta)
async function faseEspelhoDaFamilia() {
  const familia = readFileSync(join(saida, 'copia-para-o-espelho.json'));
  const copias = resultado.copias ?? {};
  await subir('scripts/desempenho/wrangler-cpu-homologa.jsonc', ['--local-upstream', 'homologa.memorias.bayara.com.br']);
  const origem = 'http://homologa.memorias.bayara.com.br';
  const pedirNaHomologacao = async (caminho, opcoes = {}) => {
    const r = await fetch(`${BASE}${caminho}`, { redirect: 'manual', ...opcoes, headers: { cookie: 'como=gui', Origin: origem, ...(opcoes.headers ?? {}) } });
    return { status: r.status, bytes: (await r.arrayBuffer()).byteLength, local: r.headers.get('location') };
  };
  await pedirNaHomologacao('/');
  copias.espelho = resumoDaMedida(
    await mede(`Espelho da produção (POST /api/espelho, cópia para o espelho de ${Math.round(familia.length / 100) / 10} KB)`, async () => {
      const corpo = new FormData();
      corpo.append('copia', new Blob([familia], { type: 'application/json' }), 'acervo-familia.json');
      const r = await pedirNaHomologacao('/api/espelho', { method: 'POST', body: corpo });
      if (!/ok=/.test(decodeURIComponent(r.local ?? ''))) throw new Error(`O espelho não foi gravado: ${r.status} ${decodeURIComponent(r.local ?? '')}`);
      return { status: r.status, bytes: familia.length };
    }, { vezes: 3 }),
  );
  // A cópia inteira (a de antes, montada das partes) é recusada pelo espelho, sem ler o arquivo
  const inteira = existsSync(join(saida, 'copia-do-acervo.json')) ? readFileSync(join(saida, 'copia-do-acervo.json')) : null;
  if (inteira) {
    copias.espelho_recusa_a_inteira = resumoDaMedida(
      await mede(`Espelho recusando a cópia inteira (${Math.round(inteira.length / 1e5) / 10} MB)`, async () => {
        const corpo = new FormData();
        corpo.append('copia', new Blob([inteira], { type: 'application/json' }), 'acervo.json');
        const r = await pedirNaHomologacao('/api/espelho', { method: 'POST', body: corpo });
        if (!/erro=/.test(r.local ?? '')) throw new Error(`O espelho não recusou a cópia inteira: ${r.status} ${r.local}`);
        return { status: r.status, bytes: inteira.length };
      }, { vezes: 3 }),
    );
  }
  resultado.copias = copias;
  guarda();
}

// As fotos e os áudios das gravações: a foto da carga (2400 px), as duas cópias que o celular faria, e os
// áudios de exemplo
async function arquivosDeGravacao() {
  const { default: sharp } = await import('sharp');
  const nomes = readdirSync(join(raiz, 'exemplos/fotos')).filter((n) => n.endsWith('.jpg')).sort();
  const fotos = [];
  for (const nome of nomes.slice(0, 10)) {
    const entrada = readFileSync(join(raiz, 'exemplos/fotos', nome));
    const { width, height } = await sharp(entrada).metadata();
    const e = 2400 / Math.max(width, height);
    const [w, h] = [Math.round(width * e), Math.round(height * e)];
    const original = await sharp(entrada).resize(w, h).jpeg({ quality: 85 }).toBuffer();
    const copia = async (menor, maior) => {
      const esc = Math.min(1, menor / Math.min(w, h), maior / Math.max(w, h));
      return sharp(original).resize(Math.max(1, Math.round(w * esc)), Math.max(1, Math.round(h * esc))).webp({ quality: 80 }).toBuffer();
    };
    fotos.push({ nome, original, pequena: await copia(480, 960), media: await copia(1200, 2400) });
  }
  const audios = readdirSync(join(raiz, 'exemplos/audios')).filter((n) => n.endsWith('.m4a')).sort().map((n) => ({ nome: n, bytes: readFileSync(join(raiz, 'exemplos/audios', n)) }));
  const retrato = await sharp(readFileSync(join(raiz, 'exemplos/fotos', nomes[0]))).resize(800, 800).jpeg({ quality: 85 }).toBuffer();
  const retratoPequeno = await sharp(retrato).resize(400, 400).webp({ quality: 82 }).toBuffer();
  return { sharp, fotos, audios, retrato, retratoPequeno };
}

async function faseGravacoes() {
  const g = [];
  const { sharp, fotos, audios, retrato, retratoPequeno } = await arquivosDeGravacao();
  await subir('scripts/desempenho/wrangler-cpu.jsonc');
  await pedir('/');
  const json = async (caminho, dados, como = 'gui') => {
    const r = await pedir(caminho, { metodo: 'POST', como, corpo: JSON.stringify(dados), cabecalhos: { 'Content-Type': 'application/json' } });
    const texto = r.buffer.toString();
    if (r.status >= 300) throw new Error(`${caminho}: ${r.status} ${texto.slice(0, 300)}`);
    return { ...so(r), dados: JSON.parse(texto) };
  };
  // Uma foto com as duas cópias, como o celular manda (POST /api/fotos), dez vezes
  const idsDasFotos = [];
  g.push(
    await mede('Enviar uma foto com as cópias (POST /api/fotos)', async (k) => {
      const f = fotos[(k + 1) % fotos.length];
      const corpo = new FormData();
      corpo.append('foto', new Blob([f.original], { type: 'image/jpeg' }), f.nome);
      corpo.append('pequena', new Blob([f.pequena], { type: 'image/webp' }), 'pequena.webp');
      corpo.append('media', new Blob([f.media], { type: 'image/webp' }), 'media.webp');
      const r = await pedir('/api/fotos', { metodo: 'POST', corpo });
      if (r.status !== 201) throw new Error(`/api/fotos: ${r.status} ${r.buffer.toString().slice(0, 200)}`);
      idsDasFotos.push(JSON.parse(r.buffer.toString()).id);
      return so(r);
    }, { vezes: 10 }),
  );
  const idsDosAudios = [];
  g.push(
    await mede('Enviar um áudio (POST /api/audios)', async (k) => {
      const a = audios[(k + 1) % audios.length];
      const corpo = new FormData();
      corpo.append('audio', new Blob([a.bytes], { type: 'audio/mp4' }), a.nome);
      corpo.append('duracao', '42');
      const r = await pedir('/api/audios', { metodo: 'POST', corpo });
      if (r.status !== 201) throw new Error(`/api/audios: ${r.status} ${r.buffer.toString().slice(0, 200)}`);
      idsDosAudios.push(JSON.parse(r.buffer.toString()).id);
      return so(r);
    }, { vezes: 6 }),
  );
  // Salvar uma memória nova com muitas fotos, áudios e mensagens. Cada rodada usa fotos e áudios ainda soltos
  const pessoas = ['gui', 'giovanna', 'lucas-magno', 'elizete', 'ex-vo-tonho', 'ex-tia-lourdes'];
  const paragrafo = 'A casa cheia, o cheiro de café, as crianças correndo pelo quintal e a vó contando de novo a história de quando chegou à cidade, com a mala de papelão e o endereço anotado num guardanapo. ';
  let rodada = 0;
  const memorias = [];
  async function prepararRodada() {
    const f = [];
    for (let i = 0; i < 10; i++) {
      const x = fotos[i % fotos.length];
      const corpo = new FormData();
      corpo.append('foto', new Blob([x.original], { type: 'image/jpeg' }), x.nome);
      corpo.append('pequena', new Blob([x.pequena], { type: 'image/webp' }), 'p.webp');
      corpo.append('media', new Blob([x.media], { type: 'image/webp' }), 'm.webp');
      f.push(JSON.parse((await pedir('/api/fotos', { metodo: 'POST', corpo })).buffer.toString()).id);
    }
    const a = [];
    for (let i = 0; i < 3; i++) {
      const corpo = new FormData();
      corpo.append('audio', new Blob([audios[i % audios.length].bytes], { type: 'audio/mp4' }), audios[i % audios.length].nome);
      corpo.append('duracao', '40');
      a.push(JSON.parse((await pedir('/api/audios', { metodo: 'POST', corpo })).buffer.toString()).id);
    }
    return { f, a };
  }
  const memoriaNova = (f, a) => {
    rodada++;
    const mensagens = [];
    for (let i = 0; i < 9; i++) mensagens.push({ tipo: 'texto', texto: paragrafo.repeat(1 + (i % 3)) });
    for (const id of a) mensagens.splice(2 * mensagens.length / 3, 0, { tipo: 'audio', audioId: id });
    return {
      titulo: `Almoço de domingo na casa da vó (medição ${rodada})`,
      ano: 1994,
      mes: 7,
      dia: 10,
      tipo: 'festa',
      pessoas,
      lugar: 'Casa da vó',
      nucleos: [],
      visibilidade: 'todos',
      situacao: 'publicada',
      fotos: f.map((id, i) => ({ id, legenda: `Foto ${i + 1} do almoço`, principal: i === 0 })),
      capitulos: ['natais'],
      temas: 'comida, casa da vó, domingo',
      relato: { por: 'gui', texto: '', audios: a.map((id) => ({ id })), mensagens },
    };
  };
  const preparadas = [];
  for (let k = 0; k < repeticoes + 2; k++) preparadas.push(await prepararRodada());
  let i = 0;
  g.push(
    await mede('Salvar memória nova: 10 fotos, 3 áudios, 12 mensagens (POST /api/memorias)', async () => {
      const { f, a } = preparadas[i++];
      const r = await json('/api/memorias', memoriaNova(f, a));
      memorias.push(r.dados.url?.split('/').pop() ?? r.dados.id);
      return so(r);
    }),
  );
  // Editar a mesma memória: tirar uma foto e mudar o título
  const editada = memorias[0];
  g.push(
    await mede('Editar memória (POST /api/memorias com id)', async (k) => {
      const atual = preparadas[0];
      const pedido = memoriaNova(atual.f.slice(0, 8 - k), []);
      delete pedido.relato;
      return so(await json('/api/memorias', { ...pedido, id: editada, titulo: `Almoço de domingo (editada ${k})`, fotosMostradas: atual.f }));
    }, { memoria: true }),
  );
  // Publicar um relato numa memória que existe: mensagens de texto e uma foto pelo relato. A foto vai antes,
  // num pedido próprio, fora do perfil, como o celular faz
  const comQuem = ['giovanna', 'lucas-magno', 'elizete'];
  const outras = memorias.slice(1);
  const relatos = [];
  for (let n = 0; n < repeticoes + 2; n++) {
    const como = comQuem[Math.floor(n / outras.length) % comQuem.length];
    const x = fotos[n % fotos.length];
    const corpo = new FormData();
    corpo.append('foto', new Blob([x.original], { type: 'image/jpeg' }), x.nome);
    corpo.append('pequena', new Blob([x.pequena], { type: 'image/webp' }), 'p.webp');
    corpo.append('media', new Blob([x.media], { type: 'image/webp' }), 'm.webp');
    const foto = JSON.parse((await pedir('/api/fotos', { metodo: 'POST', corpo, como })).buffer.toString()).id;
    relatos.push({ memoria: outras[n % outras.length], como, foto });
  }
  let j = 0;
  g.push(
    await mede('Publicar relato com 8 mensagens e 1 foto (POST /api/relatos)', async () => {
      const { memoria, como, foto } = relatos[j++];
      const mensagens = [];
      for (let m = 0; m < 7; m++) mensagens.push({ tipo: 'texto', texto: paragrafo.repeat(1 + (m % 2)) });
      mensagens.push({ tipo: 'foto', fotoId: foto, legenda: 'A mesa posta' });
      return so(await json('/api/relatos', { memoria, por: como, situacao: 'publicada', mensagens }, como));
    }),
  );
  // O ajuste "Cópias menores das fotos", uma foto por pedido (o administrador manda as cópias que o aparelho fez)
  const lista = JSON.parse((await pedir('/api/copias-das-fotos')).buffer.toString()).chaves.filter((c) => /^\d{4}\//.test(c));
  // O aparelho baixa a original e faz as cópias antes: fora do perfil
  const copiasProntas = [];
  for (const chave of lista.slice(0, 10)) {
    const original = (await pedir(`/fotos/${chave}`)).buffer;
    const { width: w, height: h } = await sharp(original).metadata();
    const copia = (menor, maior) => {
      const esc = Math.min(1, menor / Math.min(w, h), maior / Math.max(w, h));
      return sharp(original).resize(Math.max(1, Math.round(w * esc)), Math.max(1, Math.round(h * esc))).webp({ quality: 80 }).toBuffer();
    };
    copiasProntas.push({ chave, pequena: await copia(480, 960), media: await copia(1200, 2400) });
  }
  let c = 0;
  g.push(
    await mede('Cópias menores de uma foto antiga (POST /api/copias-das-fotos)', async () => {
      const { chave, pequena, media } = copiasProntas[c++];
      const corpo = new FormData();
      corpo.append('chave', chave);
      corpo.append('pequena', new Blob([pequena], { type: 'image/webp' }), 'p.webp');
      corpo.append('media', new Blob([media], { type: 'image/webp' }), 'm.webp');
      const r = await pedir('/api/copias-das-fotos', { metodo: 'POST', corpo });
      if (r.status !== 201) throw new Error(`/api/copias-das-fotos: ${r.status} ${r.buffer.toString().slice(0, 200)}`);
      return so(r);
    }, { vezes: 8 }),
  );
  // O retrato: uma pessoa nova com retrato sem cópia (a ficha de antes da D1c), e então a cópia pelo ajuste
  const retratos = [];
  g.push(
    await mede('Cadastrar pessoa com retrato (POST /api/integrantes)', async (k) => {
      const corpo = new FormData();
      corpo.append('nome', `Pessoa da medição ${k + 2}`);
      corpo.append('tipo', 'pessoa');
      corpo.append('retrato', new Blob([retrato], { type: 'image/jpeg' }), 'retrato.jpg');
      const r = await pedir('/api/integrantes', { metodo: 'POST', corpo });
      const destino = decodeURIComponent(r.cabecalhos.get('location') ?? '');
      if (r.status >= 400 || /erro=/.test(destino)) throw new Error(`/api/integrantes: ${r.status} ${destino} ${r.buffer.toString().slice(0, 200)}`);
      return so(r);
    }, { vezes: 5 }),
  );
  const listaDeRetratos = JSON.parse((await pedir('/api/copias-dos-retratos')).buffer.toString());
  retratos.push(...(listaDeRetratos.chaves ?? listaDeRetratos.retratos ?? []));
  let rr = 0;
  g.push(
    await mede('Cópia pequena de um retrato antigo (POST /api/copias-dos-retratos)', async () => {
      const corpo = new FormData();
      corpo.append('chave', retratos[rr++]);
      corpo.append('pequeno', new Blob([retratoPequeno], { type: 'image/webp' }), 'pequeno.webp');
      const r = await pedir('/api/copias-dos-retratos', { metodo: 'POST', corpo });
      if (r.status !== 201) throw new Error(`/api/copias-dos-retratos: ${r.status} ${r.buffer.toString().slice(0, 200)}`);
      return so(r);
    }, { vezes: Math.max(1, retratos.length - 2) }),
  );
  resultado.gravacoes = g;
  guarda();
}

async function faseComeco() {
  const comeco = [];
  // A produção: AMBIENTE producao, sem exemplos. O pedido sem login recebe 401, mas o middleware prepara o
  // banco antes de olhar o login: é o primeiro pedido de cada isolate novo
  const comoProducao = ['--var', 'AMBIENTE:producao'];
  for (const [nome, preparar] of [
    ['Começo do isolate na produção, banco em dia', null],
    ['Começo do isolate na produção, 1.500 relatos sem mensagens (o primeiro de três)', 'sem-mensagens'],
    ['Começo do isolate na produção, o segundo de três', 'continua'],
    ['Começo do isolate na produção, o terceiro de três', 'continua'],
    ['Começo do isolate na produção, depois', 'continua'],
  ]) {
    if (preparar === 'sem-mensagens') {
      await subir('scripts/desempenho/wrangler-cpu.jsonc');
      await pedir('/');
      execFileSync(process.execPath, [join(raiz, 'scripts/desempenho/preparar-comeco.mjs'), BASE], { cwd: raiz, stdio: 'inherit' });
    }
    await subir('scripts/desempenho/wrangler-cpu.jsonc', comoProducao);
    const primeiro = await perfil(async () => so(await pedir('/', { como: '' })));
    const segundo = await perfil(async () => so(await pedir('/', { como: '' })));
    const linha = { nome, cpu_primeiro_ms: r1(primeiro.cpu_ms), cpu_segundo_ms: r1(segundo.cpu_ms), relogio_primeiro_ms: r1(primeiro.relogio_ms), status: primeiro.status, onde_vai_o_tempo: primeiro.funcoes, por_arquivo: primeiro.arquivos };
    console.log(`${nome.padEnd(80)} primeiro ${linha.cpu_primeiro_ms} ms, segundo ${linha.cpu_segundo_ms} ms (${linha.status})`);
    comeco.push(linha);
  }
  // A prévia, com os exemplos: o primeiro pedido roda também as sementes (só prévias e computador)
  await subir('scripts/desempenho/wrangler-cpu.jsonc');
  const previa = await perfil(async () => so(await pedir('/')));
  comeco.push({ nome: 'Começo do isolate numa prévia (sementes dos exemplos) + Início do Gui', cpu_primeiro_ms: r1(previa.cpu_ms), onde_vai_o_tempo: previa.funcoes });
  console.log(`Começo numa prévia + Início: ${r1(previa.cpu_ms)} ms`);
  resultado.comeco = comeco;
  guarda();
}

// Calibração: o piso (o pedido sem login da produção, que só prepara o banco, já pronto, e responde 401), o
// peso do próprio perfilador (amostra a cada 0,1 ms contra 1 ms, na mesma página) e o relógio de cada pedido
async function faseCalibra() {
  const calibra = {};
  await subir('scripts/desempenho/wrangler-cpu.jsonc', ['--var', 'AMBIENTE:producao']);
  await pedir('/', { como: '' });
  calibra.piso_401 = await mede('Piso: pedido sem login na produção (401)', async () => so(await pedir('/', { como: '' })), { vezes: 15, memoria: false });
  await subir('scripts/desempenho/wrangler-cpu.jsonc');
  await pedir('/');
  calibra.amostragem = [];
  for (const intervalo of [100, 1000, 100]) {
    await insp.envia('Profiler.setSamplingInterval', { interval: intervalo });
    for (const [nome, caminho] of [['Árvore', '/arvore'], ['Memória cheia', `/memorias/${MEMORIA_CHEIA}`], ['Explorar, linha do tempo', '/explorar']]) {
      const r = await mede(`amostra a cada ${intervalo / 1000} ms: ${nome}`, async () => so(await pedir(caminho)), { vezes: 9, memoria: false, fria: false });
      calibra.amostragem.push({ intervalo_us: intervalo, nome, cpu_mediana_ms: r.cpu_mediana_ms, cpu_min_ms: r.cpu_min_ms, relogio_mediana_ms: r.relogio_mediana_ms });
    }
  }
  await insp.envia('Profiler.setSamplingInterval', { interval: 100 });
  resultado.calibra = calibra;
  guarda();
}

try {
  if (fases.includes('calibra')) await faseCalibra();
  if (fases.includes('paginas')) await fasePaginas();
  if (fases.includes('pesadas')) await fasePesadas();
  if (fases.includes('gravacoes')) await faseGravacoes();
  if (fases.includes('espelho')) await faseEspelho();
  if (fases.includes('copias')) await faseCopias();
  if (fases.includes('espelho-familia')) await faseEspelhoDaFamilia();
  if (fases.includes('comeco')) await faseComeco();
  console.log(`Resultado em ${join(saida, 'cpu.json')}`);
} finally {
  await descer();
}
