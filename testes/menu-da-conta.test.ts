// O menu da conta (decisão do Gui de 17/11/2026, "Revisão de estrutura das telas"): o retrato e o nome no
// topo abrem um menu com Sua página, Seu círculo, Sua conta, Administração (só admins) e Sair, e o número de avisos fica
// no retrato. Confere o esqueleto (src/layouts/Visual.astro) e o estilo (src/visual/estrutura.css).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const topo = Object.values(import.meta.glob<string>('../src/layouts/Visual.astro', { query: '?raw', import: 'default', eager: true }))[0]!;
const css = readFileSync(new URL('../src/visual/estrutura.css', import.meta.url), 'utf8');
const menu = topo.slice(topo.indexOf('<details class="conta-menu">'), topo.indexOf('</details>', topo.indexOf('<details class="conta-menu">')));

describe('menu da conta', () => {
  it('o retrato e o nome são o botão do menu, com o número de avisos no retrato', () => {
    const botao = menu.slice(menu.indexOf('<summary'), menu.indexOf('</summary>'));
    expect(botao).toContain('<Retrato');
    expect(botao).toContain('topo__conta-nome');
    expect(botao).toContain('topo__avisos');
    expect(botao).toContain('rotuloDoRetrato(usuario.nome, avisosPendentes)');
  });

  it('as opções, nesta ordem: Sua página, Seu círculo, Sua conta, Administração e Sair', () => {
    const lista = menu.slice(menu.indexOf('<nav'));
    const ordem = ['Sua página', 'Seu círculo', 'Sua conta', 'Administração', 'Sair'].map((t) => lista.indexOf(`${t}\n`) >= 0 ? lista.indexOf(`${t}\n`) : lista.indexOf(`${t}</a>`));
    expect(ordem.every((n) => n > 0)).toBe(true);
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem);
  });

  it('Administração só para os administradores, Sair só onde há login e Sua página só para quem tem página', () => {
    expect(menu).toMatch(/\{usuario\.admin && <a href="\/conta#administracao">Administração<\/a>\}/);
    expect(menu).toMatch(/\{saida && <a href=\{saida\}>Sair<\/a>\}/);
    expect(menu).toMatch(/\{temPagina && <a href=\{`\/pessoas\/\$\{usuario\.pessoa\}`\}>Sua página<\/a>\}/);
  });

  it('fecha com Esc e com o toque fora, como o menu do celular, e abrir um fecha o outro', () => {
    expect(topo).toContain("document.querySelectorAll<HTMLDetailsElement>('details.menu, details.conta-menu')");
    expect(topo).toMatch(/outro\.open = false/);
  });

  it('a lista abre por cima da página, embaixo do retrato, e cada opção tem a altura de toque', () => {
    expect(css).toMatch(/\.conta-menu__lista \{[^}]*position: absolute/);
    expect(css).toMatch(/\.conta-menu__lista a \{[^}]*min-height: var\(--toque\)/);
  });
});
