// O posicionamento inteligente (sessão D1a, 23/11/2026; causa 1d da medição M1, docs/desempenho/): o
// Cloudflare roda o servidor perto do banco quando a página vai muitas vezes a ele. Vale na produção e nas
// prévias, para a prévia medir o que a produção vai ter. Fica num teste, e não na guarda, porque a guarda
// (scripts/confere-producao.mjs) é dividida com a sessão das fotos. O npm test roda antes de todo build.
import { describe, expect, it } from 'vitest';

const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: string, codificacao: string) => string };

const config = JSON.parse(
  readFileSync('wrangler.jsonc', 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,(\s*[}\]])/g, '$1'),
);

describe('posicionamento inteligente', () => {
  it('a produção e as prévias rodam o servidor perto do banco', () => {
    expect(config.placement).toEqual({ mode: 'smart' });
    expect(config.previews.placement).toEqual({ mode: 'smart' });
  });
});
