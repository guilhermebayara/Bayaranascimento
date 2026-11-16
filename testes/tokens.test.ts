// A troca para o visual final deve mexer só nos tokens do :root de global.css.
// Cor e fonte escritas soltas no resto do CSS escapariam dessa troca.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const inicioRaiz = css.indexOf(':root {');
const fimRaiz = css.indexOf('\n}', inicioRaiz);
const foraDaRaiz = (css.slice(0, inicioRaiz) + css.slice(fimRaiz + 2)).replace(/\/\*[\s\S]*?\*\//g, '');

describe('tokens do visual', () => {
  it('nenhuma cor escrita solta fora do :root', () => {
    const cores = foraDaRaiz.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g) ?? [];
    expect(cores).toEqual([]);
  });

  it('nenhuma fonte escrita solta fora do :root', () => {
    const familias = [...foraDaRaiz.matchAll(/font-family\s*:\s*([^;]+);/g)].map((m) => m[1].trim()).filter((v) => !v.startsWith('var(') && v !== 'inherit');
    expect(familias).toEqual([]);
  });

  it('a área de toque mínima continua em 44 px', () => {
    expect(css).toMatch(/--toque-minimo:\s*2\.75rem;/);
  });
});
