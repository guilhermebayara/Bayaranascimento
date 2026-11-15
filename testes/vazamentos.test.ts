// Conferências no código das páginas, para vazamentos achados no QA não voltarem.
import { describe, expect, it } from 'vitest';

const fontes = import.meta.glob<string>(['../src/pages/**/*.{astro,ts}', '../src/components/**/*.astro'], { query: '?raw', import: 'default', eager: true });
const paginas = Object.entries(fontes).map(([caminho, texto]) => ({ caminho, texto }));

describe('vazamentos já corrigidos', () => {
  it('listas de temas só trazem temas que a pessoa vê', () => {
    // Achado do QA de 15/11/2026: o nome de um tema usado só numa memória restrita aparecia para todos.
    // listarTemas() sem filtro só pode servir para dar nome aos temas de algo que a pessoa já está vendo.
    for (const { caminho, texto } of paginas) {
      for (const uso of texto.matchAll(/await listarTemas\(\)\)?(.{0,60})/g)) {
        expect(uso[1], `${caminho}: use listarTemasVisiveis(usuario)`).toMatch(/^\.filter\(\(t\) => \w+\.temas\.includes\(t\.id\)\)/);
      }
    }
  });

  it('histórico e restauração de versões passam por podeVerVersao', () => {
    // Achado do QA de 15/11/2026: o histórico mostrava a ficha de quando a memória era rascunho
    let usos = 0;
    for (const { caminho, texto } of paginas) {
      for (const uso of texto.matchAll(/listarVersoes<Memoria>\((.{0,200})/gs)) {
        usos++;
        expect(uso[1], `${caminho}: filtre as versões com podeVerVersao`).toContain('podeVerVersao');
      }
    }
    expect(usos).toBeGreaterThanOrEqual(2);
  });
});
