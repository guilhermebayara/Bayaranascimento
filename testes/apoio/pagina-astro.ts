// Executa a página Astro real, com todos os componentes e consultas. Só substitui o binding Cloudflare.
// O compilador e o renderizador são os mesmos instalados no projeto; não procura texto do código.
import { mkdtemp, readFile, realpath, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { build } from 'esbuild';
import { transform } from '@astrojs/compiler-rs';
import { experimental_AstroContainer } from 'astro/container';
export async function paginaAstro(arquivo: string, env: unknown, raiz = process.cwd()) {
  raiz = await realpath(raiz);
  const pasta = await mkdtemp(join(tmpdir(), 'mem7-pagina-'));
  await symlink(resolve('node_modules'), join(pasta, 'node_modules'));
  await build({ entryPoints: [resolve(raiz, arquivo)], outfile: join(pasta, 'pagina.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external',
    define: { 'import.meta.env.DEV': 'true', 'import.meta.env.PROD': 'false' }, loader: { '.css': 'empty' }, logLevel: 'silent',
    plugins: [{ name: 'astro-real', setup(b) {
      b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({path:'bindings',namespace:'mem7'}));
      b.onLoad({ filter: /.*/, namespace:'mem7' }, () => ({contents:'export const env = globalThis.__mem7Env;',loader:'js'}));
      b.onLoad({ filter: /\.astro$/ }, async ({path}) => {
        const r = await transform(await readFile(path, 'utf8'), { filename:path.slice(raiz.length), normalizedFilename:path.slice(raiz.length), internalURL:'@astrojs/runtime/compiler-runtime', resultScopedSlot:true, resolvePath:(p)=>p.replace(raiz,'') });
        return { contents:r.code, loader:'ts', resolveDir:resolve(path,'..') };
      });
    }}] });
  (globalThis as Record<string, unknown>).__mem7Env = env;
  const modulo = await import(/* @vite-ignore */ `${join(pasta, 'pagina.mjs')}?t=${Date.now()}`);
  const container = await experimental_AstroContainer.create();
  return {
    render: (opcoes: Record<string,unknown>) => container.renderToString(modulo.default, opcoes),
    response: (opcoes: Record<string,unknown>) => container.renderToResponse(modulo.default, opcoes),
  };
}
