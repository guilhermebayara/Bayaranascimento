// Compara bancos vazios preparados pelo código de f7b2f53 e pelo checkout atual, só no SQLite em memória.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const raiz = fileURLToPath(new URL('../..', import.meta.url));
const base = mkdtempSync(join(tmpdir(), 'mem8-semente-'));
const tar = join(base, 'referencia.tar');
execFileSync('git', ['archive', '--output', tar, 'f7b2f53'], { cwd: raiz });
execFileSync('tar', ['-xf', tar, '-C', base]);
symlinkSync(join(raiz, 'node_modules'), join(base, 'node_modules'));

async function bancoSemeado(pasta) {
  const { outputFiles } = await build({
    stdin: {
      contents: `
        import { env } from 'cloudflare:workers';
        import { DatabaseSync } from 'node:sqlite';
        import { criarD1 } from './testes/apoio/d1';
        import { prepararBanco } from './src/lib/servidor/banco';

        env.DB = await criarD1();
        const relogio = new DatabaseSync(':memory:');
        env.DB.sqlite.function('datetime', { varargs: true }, (...arg) => {
          const valores = arg.map(v => v === 'now' ? '2026-11-27 10:00:00' : v);
          return relogio.prepare('SELECT datetime(' + valores.map(() => '?').join(',') + ') AS hora').get(...valores).hora;
        });
        await prepararBanco();
        export const linhas = env.DB.sqlite.prepare(\`
          SELECT r.memoria_id, r.por, r.registrado_por, r.situacao, m.ordem, m.tipo, m.texto, m.audio_id, m.foto_id, m.enviada_em
          FROM relato_mensagens m JOIN relatos r ON r.id = m.relato_id
          ORDER BY r.memoria_id, r.por, r.registrado_por, r.situacao, m.ordem
        \`).all();
        export const relatos = env.DB.sqlite.prepare('SELECT count(*) AS n FROM relatos').get().n;
      `,
      loader: 'ts',
      resolveDir: pasta,
    },
    bundle: true, platform: 'node', format: 'esm', write: false,
    define: { 'import.meta.env.DEV': 'false' },
    plugins: [{
      name: 'd1-local',
      setup(plugin) {
        plugin.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: 'local', namespace: 'banco-de-exemplo' }));
        plugin.onLoad({ filter: /^local$/, namespace: 'banco-de-exemplo' }, () => ({
          contents: "export const env = { AMBIENTE: 'previa', FOTOS: { list: async () => ({ objects: [], truncated: false }) } };",
        }));
      },
    }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
}
const antes = await bancoSemeado(base);
const depois = await bancoSemeado(raiz);
assert.equal(depois.relatos, antes.relatos);
assert.ok(depois.relatos > 0);
assert.deepEqual(depois.linhas, antes.linhas);
const porTipo = Object.groupBy(depois.linhas, (m) => m.tipo);
console.log(JSON.stringify({
  relatos: depois.relatos,
  mensagens: depois.linhas.length,
  tipos: Object.fromEntries(Object.entries(porTipo).map(([tipo, linhas]) => [tipo, linhas.length])),
  sha256: createHash('sha256').update(JSON.stringify(depois.linhas)).digest('hex'),
}, null, 2));
