import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// O "+" da janela de escrever abre a lista para cima. A regra precisa vencer a de .menu-acoes__lista
// (pecas.css) em qualquer ordem de carga: na memória nova, pecas.css chegava depois e a lista ficava
// presa entre top e bottom, sem altura, por cima do texto de baixo (visto pelo Gui, 18/11/2026).
describe('menu do "+" na janela de escrever', () => {
  const css = readFileSync('src/visual/telas/conversa.css', 'utf8');
  it('abre para cima com um seletor mais forte que o da peça', () => {
    const regra = css.match(/\.janela__mais \.janela__mais-lista \{([^}]*)\}/);
    expect(regra).not.toBeNull();
    expect(regra![1]).toMatch(/top:\s*auto/);
    expect(regra![1]).toMatch(/bottom:/);
  });
});
