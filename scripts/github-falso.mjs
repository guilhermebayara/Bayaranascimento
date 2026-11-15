// GitHub de mentira para desenvolvimento. Imita só as chamadas que o site usa
// e grava os arquivos direto nesta pasta, para a memória nova aparecer no
// `npm run dev` sem tocar no repositório de verdade.
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve } from 'node:path';

const PORTA = Number(process.env.PORTA ?? 4400);
const DESTINO = resolve(process.env.DESTINO ?? '.');
const arvores = new Map();
const commits = new Map();
let cabeca = 'c0';
let contador = 0;

const responder = (res, status, corpo) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(corpo));
};

const lerCorpo = async (req) => {
  let texto = '';
  for await (const pedaco of req) texto += pedaco;
  return texto ? JSON.parse(texto) : {};
};

function caminhoSeguro(relativo) {
  const completo = normalize(join(DESTINO, relativo));
  if (!completo.startsWith(DESTINO)) throw new Error('caminho fora da pasta');
  return completo;
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const rota = url.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, '');

    if (req.method === 'GET' && rota.startsWith('/contents/')) {
      try {
        const dados = await readFile(caminhoSeguro(decodeURIComponent(rota.slice('/contents/'.length))));
        return responder(res, 200, { encoding: 'base64', content: dados.toString('base64') });
      } catch {
        return responder(res, 404, { message: 'Not Found' });
      }
    }
    if (req.method === 'GET' && rota.startsWith('/git/ref/')) return responder(res, 200, { object: { sha: cabeca } });
    if (req.method === 'GET' && rota.startsWith('/git/commits/')) return responder(res, 200, { tree: { sha: 't0' } });
    if (req.method === 'POST' && rota === '/git/trees') {
      const sha = `t${++contador}`;
      arvores.set(sha, (await lerCorpo(req)).tree);
      return responder(res, 201, { sha });
    }
    if (req.method === 'POST' && rota === '/git/commits') {
      const corpo = await lerCorpo(req);
      const sha = `c${++contador}`;
      commits.set(sha, corpo);
      return responder(res, 201, { sha });
    }
    if (req.method === 'PATCH' && rota.startsWith('/git/refs/')) {
      const { sha } = await lerCorpo(req);
      const commit = commits.get(sha);
      for (const arquivo of arvores.get(commit.tree) ?? []) {
        const destino = caminhoSeguro(arquivo.path);
        await mkdir(dirname(destino), { recursive: true });
        await writeFile(destino, arquivo.content);
        console.log(`  gravou ${arquivo.path}`);
      }
      cabeca = sha;
      console.log(`commit: ${commit.message} (${commit.author.name})`);
      return responder(res, 200, { object: { sha } });
    }
    responder(res, 404, { message: `rota não imitada: ${req.method} ${rota}` });
  } catch (erro) {
    responder(res, 500, { message: String(erro) });
  }
}).listen(PORTA, () => console.log(`GitHub de mentira em http://localhost:${PORTA}, gravando em ${DESTINO}`));
