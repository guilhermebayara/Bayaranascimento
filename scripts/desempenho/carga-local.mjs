// Acervo cheio para medir o desempenho (sessão M1, 22/11/2026; relatório em docs/desempenho/).
//
// Acrescenta ao banco LOCAL do computador o tamanho que o acervo deve ter depois do Natal: 600 memórias,
// 3.000 fotos, 1.500 relatos com texto e 200 áudios, espalhados por 70 anos e pelas três famílias, com
// visibilidades variadas. Usa as pessoas, os tipos, os capítulos e os temas do acervo de exemplo.
//
// Só roda no computador, contra o servidor local (npm run dev), pela Local Explorer do Wrangler
// (/cdn-cgi/local/explorer), que só existe no servidor local. Recusa qualquer endereço que não seja
// 127.0.0.1 ou localhost, e recusa um banco sem as memórias de exemplo: nunca toca prévia, homologação
// ou produção. A guarda (scripts/confere-producao.mjs, regra 12) confere isso.
//
//   npm run dev                                                # o servidor local no ar
//   node scripts/enviar-fotos-de-exemplo.mjs http://127.0.0.1:4321
//   node scripts/desempenho/carga-local.mjs                    # acrescenta a carga
//   node scripts/desempenho/carga-local.mjs --fotos=exemplo    # usa as 11 fotos de exemplo como estão (1600 px)
//   node scripts/desempenho/carga-local.mjs --desfazer         # tira a carga e volta ao acervo de exemplo
//
// Por padrão, as fotos da carga são as 11 de exemplo aumentadas para 2400 px, com grão, em JPEG 85: o
// tamanho que o site grava hoje (LADO_MAXIMO e QUALIDADE em src/lib/cliente/fotos.ts). Os áudios são os
// três de exemplo, reaproveitados. Tudo da carga tem id próprio (memórias "carga-", e fotos, relatos e
// áudios a partir de 900000), para o --desfazer achar.
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ENDERECOS_LOCAIS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const PRIMEIRO_ID = 900000;
const ARGS = process.argv.slice(2);
const endereco = new URL(ARGS.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:4321');
if (endereco.protocol !== 'http:' || !ENDERECOS_LOCAIS.has(endereco.hostname)) {
  console.error('A carga só roda no servidor local do computador (http://127.0.0.1:4321). Prévia, homologação e produção nunca.');
  process.exit(1);
}
const API = new URL('/cdn-cgi/local/explorer/api', endereco).href;
const desfazer = ARGS.includes('--desfazer');
const fotosDeExemplo = ARGS.includes('--fotos=exemplo');

async function chamar(caminho, opcoes = {}) {
  const resposta = await fetch(`${API}${caminho}`, opcoes);
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok || dados.success === false) throw new Error(`${caminho}: ${resposta.status} ${JSON.stringify(dados.errors ?? dados).slice(0, 400)}`);
  return dados.result;
}

// O banco local: o único que a Local Explorer mostra, ligado como DB
const bancos = await chamar('/d1/database');
if (bancos.length !== 1 || bancos[0].name !== 'DB') {
  console.error('Esperava um banco local só, o DB do npm run dev.');
  process.exit(1);
}
const BANCO = bancos[0].uuid;
async function consultar(sql, params = []) {
  const [r] = await chamar(`/d1/database/${BANCO}/raw`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql, params }) });
  return r.results.rows.map((linha) => Object.fromEntries(r.results.columns.map((c, i) => [c, linha[i]])));
}
async function executar(comandos) {
  for (let i = 0; i < comandos.length; i += 400) {
    await chamar(`/d1/database/${BANCO}/raw`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ batch: comandos.slice(i, i + 400) }) });
  }
}

// Só o acervo de exemplo recebe a carga: um banco sem as memórias de exemplo não é o do computador
const [{ exemplos }] = await consultar(`SELECT count(*) AS exemplos FROM integrantes WHERE id LIKE 'ex-%'`);
if (!exemplos) {
  console.error('Este banco não tem o acervo de exemplo. A carga só entra no banco local do computador.');
  process.exit(1);
}

const DESFAZ = [
  `DELETE FROM relato_mensagens WHERE relato_id >= ${PRIMEIRO_ID}`,
  `DELETE FROM audios WHERE id >= ${PRIMEIRO_ID}`,
  `DELETE FROM reacoes WHERE memoria_id LIKE 'carga-%'`,
  `DELETE FROM fotos WHERE id >= ${PRIMEIRO_ID}`,
  `DELETE FROM relatos WHERE id >= ${PRIMEIRO_ID}`,
  `DELETE FROM capitulo_memorias WHERE memoria_id LIKE 'carga-%'`,
  `DELETE FROM tema_memorias WHERE memoria_id LIKE 'carga-%'`,
  `DELETE FROM memoria_integrantes WHERE memoria_id LIKE 'carga-%'`,
  `DELETE FROM memoria_nucleos WHERE memoria_id LIKE 'carga-%'`,
  `DELETE FROM avisos WHERE memoria_id LIKE 'carga-%'`,
  `DELETE FROM memorias WHERE id LIKE 'carga-%'`,
].map((sql) => ({ sql }));
await executar(DESFAZ);
if (desfazer) {
  console.log('Carga tirada: o banco local voltou ao acervo de exemplo.');
  process.exit(0);
}

// Sorteio com semente: a mesma carga a cada vez, para as medições se compararem
let semente = 20261225;
const acaso = () => {
  semente = (semente + 0x6d2b79f5) | 0;
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const um = (lista) => lista[Math.floor(acaso() * lista.length)];
const entre = (a, b) => a + Math.floor(acaso() * (b - a + 1));
const alguns = (lista, n) => {
  const copia = [...lista];
  const saida = [];
  while (saida.length < n && copia.length) saida.push(copia.splice(Math.floor(acaso() * copia.length), 1)[0]);
  return saida;
};
const uuid = (texto) => {
  const h = createHash('sha256').update(texto).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// O que o acervo de exemplo já tem
const pessoas = (await consultar(`SELECT id, tipo FROM integrantes WHERE excluida_em IS NULL`)).map((p) => p);
const humanos = pessoas.filter((p) => p.tipo === 'pessoa').map((p) => p.id);
const todos = pessoas.map((p) => p.id);
const membros = (await consultar(`SELECT DISTINCT integrante_id FROM nucleo_membros WHERE papel = 'membro'`)).map((m) => m.integrante_id);
const nucleos = (await consultar(`SELECT id FROM nucleos`)).map((n) => n.id);
const tipos = (await consultar(`SELECT id FROM tipos`)).map((t) => t.id).filter((t) => t !== 'outro');
const reunidos = (await consultar(`SELECT id FROM capitulos WHERE modo = 'reunido' AND visibilidade = 'todos' AND excluido_em IS NULL`)).map((c) => c.id);
const temas = (await consultar(`SELECT id FROM temas`)).map((t) => t.id);

// As fotos: as 11 de exemplo, ou cópias delas no tamanho que o site grava
let chavesDeFoto = readdirSync('exemplos/fotos')
  .filter((n) => n.endsWith('.jpg'))
  .sort()
  .map((n) => `exemplos/${n}`);
if (!fotosDeExemplo) {
  const { default: sharp } = await import('sharp');
  const [bucket] = (await chamar('/r2/buckets')).buckets.map((b) => b.name);
  chavesDeFoto = [];
  for (const nome of readdirSync('exemplos/fotos').filter((n) => n.endsWith('.jpg')).sort()) {
    const entrada = readFileSync(`exemplos/fotos/${nome}`);
    const { width, height } = await sharp(entrada).metadata();
    const escala = 2400 / Math.max(width, height);
    const w = Math.round(width * escala);
    const h = Math.round(height * escala);
    const grao = Buffer.alloc(w * h * 3);
    for (let i = 0; i < grao.length; i++) grao[i] = 128 + Math.round((acaso() + acaso() + acaso() - 1.5) * 24);
    const base = await sharp(entrada).resize(w, h, { kernel: 'lanczos3' }).toBuffer();
    const foto = await sharp(base).composite([{ input: grao, raw: { width: w, height: h, channels: 3 }, blend: 'overlay' }]).jpeg({ quality: 85 }).toBuffer();
    const chave = `2026/${uuid(`carga-${nome}`)}.jpg`;
    await chamar(`/r2/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(chave)}`, { method: 'PUT', headers: { 'content-type': 'image/jpeg' }, body: foto });
    chavesDeFoto.push(chave);
    console.log(`Foto de carga ${nome}: ${w} × ${h}, ${Math.round(foto.length / 1024)} KB`);
  }
}
const audiosDeExemplo = [
  { chave: 'exemplos/vo-bela-canja.m4a', tamanho: 50101, duracao: 11.7 },
  { chave: 'exemplos/vo-bela-pao-de-queijo.m4a', tamanho: 57547, duracao: 13.5 },
  { chave: 'exemplos/vo-vivica-chuva.m4a', tamanho: 46401, duracao: 10.9 },
];

// Textos inventados, para os relatos terem o tamanho de verdade
const FRASES = [
  'Lembro como se fosse hoje, a casa cheia e o cheiro de café passando.',
  'A gente chegou atrasado, como sempre, e ainda assim fomos os primeiros a sentar.',
  'Ninguém sabia direito o caminho, e o carro ferveu duas vezes na serra.',
  'A Vó ficou na cozinha a tarde inteira, e ninguém tinha coragem de pedir para ajudar.',
  'Choveu tanto que a festa foi parar na garagem, e ficou melhor assim.',
  'Tinha um bolo de fubá enorme em cima da mesa, e um prato de pão de queijo que não acabava nunca.',
  'Foi a primeira vez que eu vi o mar, e eu não queria sair da água por nada.',
  'O pai contou a mesma piada três vezes, e todo mundo riu nas três.',
  'Depois do almoço, os primos sumiram no quintal e só voltaram com o sol se pondo.',
  'Eu guardo até hoje a foto desse dia na carteira, meio amassada.',
  'A música era alta demais, e a vizinha veio reclamar, mas acabou ficando para dançar.',
  'Ficamos acordados até tarde conversando na varanda, ouvindo os grilos.',
  'Teve briga por causa do último pedaço de pudim, como em todo ano.',
  'A estrada era de terra, e a poeira entrava pela janela do ônibus.',
  'No fim do dia, todo mundo estava cansado e feliz, e ninguém queria ir embora.',
];
const paragrafo = () => Array.from({ length: entre(2, 6) }, () => um(FRASES)).join(' ');
const texto = () => Array.from({ length: entre(1, 5) }, paragrafo).join('\n\n');
const LUGARES = ['Belo Horizonte', 'Ouro Preto', 'Ipatinga', 'Guarapari', 'São Paulo', 'Rio de Janeiro', 'Sete Lagoas', 'Itabira', 'Porto Seguro', 'Lisboa', null, null];
const TITULOS = ['Almoço de domingo', 'Natal na casa da Vó', 'Viagem para a praia', 'Aniversário surpresa', 'Primeiro dia de aula', 'Casamento na roça', 'Festa junina', 'Mudança de casa', 'Formatura', 'Churrasco no quintal', 'Pescaria', 'Réveillon', 'Batizado', 'Passeio no parque', 'Feira de domingo'];

// Os anos: 70 anos, mais memórias perto de hoje (como as fotos de celular)
const anoDaMemoria = () => {
  const x = acaso();
  return Math.min(2026, 1956 + Math.floor(70 * Math.sqrt(x)));
};
const dataDeCadastro = () => `2026-${String(entre(11, 12)).padStart(2, '0')}-${String(entre(1, 28)).padStart(2, '0')} ${String(entre(8, 23)).padStart(2, '0')}:${String(entre(0, 59)).padStart(2, '0')}:00`;

const MEMORIAS = 600;
const FOTOS = 3000;
const RELATOS = 1500;
const AUDIOS = 200;

// A Local Explorer só aceita parâmetros em texto: os valores vão escritos na consulta, com as aspas escapadas
const literal = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const comandos = [];
const ins = (tabela, linha) => {
  const colunas = Object.keys(linha);
  comandos.push({ sql: `INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES (${Object.values(linha).map(literal).join(', ')})` });
};

// Quantas fotos e relatos cada memória tem: 1 em 10 sem foto, as outras de 1 a 14
const fotosPorMemoria = Array.from({ length: MEMORIAS }, () => (acaso() < 0.1 ? 0 : entre(1, 9)));
const relatosPorMemoria = Array.from({ length: MEMORIAS }, () => (acaso() < 0.15 ? 0 : entre(1, 4)));
const ajustar = (lista, total, teto) => {
  let soma = lista.reduce((a, b) => a + b, 0);
  while (soma < total) {
    const i = Math.floor(acaso() * lista.length);
    if (lista[i] > 0 && lista[i] < teto) (lista[i]++, soma++);
  }
  while (soma > total) {
    const i = Math.floor(acaso() * lista.length);
    if (lista[i] > 1) (lista[i]--, soma--);
  }
};
ajustar(fotosPorMemoria, FOTOS, 14);
ajustar(relatosPorMemoria, RELATOS, 6);

let fotoId = PRIMEIRO_ID;
let relatoId = PRIMEIRO_ID;
const relatosPublicados = [];
for (let n = 0; n < MEMORIAS; n++) {
  const id = `carga-${String(n + 1).padStart(4, '0')}`;
  const ano = anoDaMemoria();
  const temMes = acaso() < 0.7;
  const rascunho = acaso() < 0.03;
  const restrita = acaso() < 0.15;
  const criadaPor = rascunho ? 'gui' : um(membros);
  const criadaEm = dataDeCadastro();
  ins('memorias', {
    id,
    titulo: `${um(TITULOS)} ${ano}`,
    ano,
    mes: temMes ? entre(1, 12) : null,
    dia: temMes && acaso() < 0.7 ? entre(1, 28) : null,
    aproximada: acaso() < 0.1 ? 1 : 0,
    tipo: um(tipos),
    lugar: um(LUGARES),
    visibilidade: restrita ? 'nucleos' : 'todos',
    situacao: rascunho ? 'rascunho' : 'publicada',
    exemplo: 0,
    criada_por: criadaPor,
    criada_em: criadaEm,
    atualizada_em: criadaEm,
    publicada_em: rascunho ? null : criadaEm,
  });
  for (const nucleo of alguns(nucleos, entre(1, 2))) ins('memoria_nucleos', { memoria_id: id, nucleo_id: nucleo });
  for (const pessoa of alguns(todos, entre(1, 8))) ins('memoria_integrantes', { memoria_id: id, integrante_id: pessoa });
  if (reunidos.length && acaso() < 0.15) ins('capitulo_memorias', { capitulo_id: um(reunidos), memoria_id: id });
  if (temas.length && acaso() < 0.3) for (const tema of alguns(temas, entre(1, 2))) ins('tema_memorias', { tema_id: tema, memoria_id: id });
  for (let f = 0; f < fotosPorMemoria[n]; f++) {
    ins('fotos', { id: fotoId++, memoria_id: id, chave: um(chavesDeFoto), legenda: acaso() < 0.3 ? um(LUGARES.filter(Boolean)) : null, principal: f === 0 ? 1 : 0, ordem: f, enviada_por: criadaPor, enviada_em: criadaEm });
  }
  for (const por of alguns(humanos, relatosPorMemoria[n])) {
    const publicado = rascunho ? false : acaso() < 0.95;
    const t = texto();
    ins('relatos', { id: relatoId, memoria_id: id, por, registrado_por: acaso() < 0.85 ? por : um(membros), texto: t, situacao: publicado ? 'publicada' : 'rascunho', criado_em: criadaEm, atualizado_em: criadaEm, publicado_em: publicado ? criadaEm : null });
    if (publicado) relatosPublicados.push({ id: relatoId, memoria: id, por, texto: t });
    else t.split('\n\n').forEach((p, ordem) => ins('relato_mensagens', { relato_id: relatoId, ordem, tipo: 'texto', texto: p, enviada_em: criadaEm }));
    relatoId++;
  }
}
// Os áudios, cada um num relato publicado diferente, antes do texto (como as mensagens derivadas)
const comAudio = new Map(alguns(relatosPublicados, AUDIOS).map((r, i) => [r.id, PRIMEIRO_ID + i]));
for (const r of relatosPublicados) {
  let ordem = 0;
  const audioId = comAudio.get(r.id);
  if (audioId) {
    const a = um(audiosDeExemplo);
    ins('audios', { id: audioId, relato_id: r.id, memoria_id: r.memoria, chave: a.chave, tipo: 'audio/mp4', tamanho: a.tamanho, duracao: a.duracao, transcricao: um(FRASES), ordem: 0, enviado_por: r.por });
    ins('relato_mensagens', { relato_id: r.id, ordem: ordem++, tipo: 'audio', audio_id: audioId });
  }
  for (const p of r.texto.split('\n\n')) ins('relato_mensagens', { relato_id: r.id, ordem: ordem++, tipo: 'texto', texto: p });
}
// Reações: umas 2.500, nas memórias publicadas
const SIMBOLOS = ['coracao', 'riso', 'saudade', 'estava'];
const vistas = new Set();
for (let i = 0; i < 2500; i++) {
  const memoria = `carga-${String(entre(1, MEMORIAS)).padStart(4, '0')}`;
  const pessoa = um(membros);
  const simbolo = um(SIMBOLOS);
  const chave = `${memoria}|${pessoa}|${simbolo}`;
  if (vistas.has(chave)) continue;
  vistas.add(chave);
  comandos.push({ sql: `INSERT INTO reacoes (memoria_id, alvo, alvo_id, pessoa, simbolo) SELECT ${literal(memoria)}, 'memoria', 0, ${literal(pessoa)}, ${literal(simbolo)} WHERE EXISTS (SELECT 1 FROM memorias WHERE id = ${literal(memoria)} AND situacao = 'publicada')` });
}

console.log(`Gravando ${comandos.length} linhas no banco local…`);
await executar(comandos);
const [c] = await consultar(`SELECT (SELECT count(*) FROM memorias) AS memorias, (SELECT count(*) FROM fotos WHERE removida_em IS NULL) AS fotos, (SELECT count(*) FROM relatos) AS relatos, (SELECT count(*) FROM audios) AS audios, (SELECT count(*) FROM reacoes) AS reacoes`);
console.log(`Acervo local agora: ${c.memorias} memórias, ${c.fotos} fotos, ${c.relatos} relatos, ${c.audios} áudios, ${c.reacoes} reações.`);
