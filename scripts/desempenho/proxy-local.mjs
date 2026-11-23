// Um Cloudflare de mentira na frente do servidor local, para as medições no navegador (sessão M1,
// 22/11/2026): HTTP/2 com TLS e compressão Brotli dos textos, como a borda do Cloudflare entrega. Sem
// isso, o navegador mediria o servidor local em HTTP/1.1 e sem compressão, o que dá outro carregamento.
// Só escuta em 127.0.0.1 e só repassa para o servidor local.
//
//   node scripts/desempenho/proxy-local.mjs [porta=4443] [destino=http://127.0.0.1:4321]
//
// O certificado é gerado na hora, numa pasta temporária, e não fica no repositório.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createSecureServer } from 'node:http2';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';

const porta = Number(process.argv[2] ?? 4443);
const destino = new URL(process.argv[3] ?? 'http://127.0.0.1:4321');
if (!['127.0.0.1', 'localhost'].includes(destino.hostname)) throw new Error('O proxy só repassa para o servidor local.');

const pasta = mkdtempSync(join(tmpdir(), 'proxy-local-'));
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=127.0.0.1', '-keyout', join(pasta, 'chave.pem'), '-out', join(pasta, 'cert.pem')], { stdio: 'ignore' });

const COMPRIME = /^(text\/|application\/(javascript|json|xml)|image\/svg)/;
const SEM_REPASSE = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'host', 'content-length', 'content-encoding', 'http2-settings']);

const servidor = createSecureServer({ key: readFileSync(join(pasta, 'chave.pem')), cert: readFileSync(join(pasta, 'cert.pem')), allowHTTP1: true }, async (pedido, resposta) => {
  try {
    const cabecalhos = {};
    for (const [nome, valor] of Object.entries(pedido.headers)) if (!nome.startsWith(':') && !SEM_REPASSE.has(nome) && nome !== 'accept-encoding') cabecalhos[nome] = valor;
    // O site confere a origem de quem grava (mesmaOrigem): para ele, o pedido vem dele mesmo
    if (cabecalhos.origin) cabecalhos.origin = destino.origin;
    if (cabecalhos.referer) cabecalhos.referer = String(cabecalhos.referer).replace(/^https:\/\/127\.0\.0\.1:\d+/, destino.origin);
    const corpo = ['GET', 'HEAD'].includes(pedido.method) ? undefined : await new Promise((ok) => {
      const partes = [];
      pedido.on('data', (p) => partes.push(p));
      pedido.on('end', () => ok(Buffer.concat(partes)));
    });
    const origem = new URL(pedido.url, destino);
    const r = await fetch(origem, { method: pedido.method, headers: { ...cabecalhos, host: destino.host }, body: corpo, redirect: 'manual' });
    const saida = {};
    r.headers.forEach((valor, nome) => {
      if (!SEM_REPASSE.has(nome) && nome !== 'set-cookie') saida[nome] = nome === 'location' ? valor.replace(destino.origin, '') : valor;
    });
    const cookies = r.headers.getSetCookie?.() ?? [];
    if (cookies.length) saida['set-cookie'] = cookies;
    let dados = Buffer.from(await r.arrayBuffer());
    const tipo = r.headers.get('content-type') ?? '';
    if (dados.length > 512 && COMPRIME.test(tipo) && /\bbr\b/.test(pedido.headers['accept-encoding'] ?? '')) {
      dados = brotliCompressSync(dados, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } });
      saida['content-encoding'] = 'br';
    }
    saida['content-length'] = String(dados.length);
    resposta.writeHead(r.status, saida);
    resposta.end(pedido.method === 'HEAD' ? undefined : dados);
  } catch (erro) {
    resposta.writeHead(502, { 'content-type': 'text/plain' });
    resposta.end(String(erro));
  }
});
servidor.listen(porta, '127.0.0.1', () => console.log(`Proxy local em https://127.0.0.1:${porta} → ${destino.origin}`));
