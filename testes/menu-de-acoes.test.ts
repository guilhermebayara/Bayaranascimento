// O botão de menu, os três pontos (observação do Gui, 18/11/2026; "Padrões que as pessoas já conhecem", em
// docs/visual.md): reagir fica à vista, e compartilhar, sugerir correção e o recado ao autor do relato
// moram no menu da memória, do relato e da foto.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const peca = readFileSync('src/components/visual/MenuDeAcoes.astro', 'utf-8');
const cliente = readFileSync('src/lib/cliente/menus.ts', 'utf-8');
const pagina = readFileSync('src/pages/memorias/[id].astro', 'utf-8');
const sugerir = readFileSync('src/pages/memorias/[id]/sugerir.astro', 'utf-8');

describe('o botão de menu', () => {
  it('funciona sem script (details) e tem nome para o leitor de tela', () => {
    expect(peca).toContain('<details class="menu-acoes" data-menu-acoes>');
    expect(peca).toContain('<summary class="menu-acoes__botao" aria-label={rotulo}');
  });
  it('com script: Esc fecha e devolve o foco, as setas andam, tocar fora fecha e um menu fecha os outros', () => {
    expect(cliente).toContain("e.key === 'Escape'");
    expect(cliente).toContain('botao.focus()');
    expect(cliente).toContain("e.key === 'ArrowDown'");
    expect(cliente).toContain('!menu.contains(e.target as Node)');
    expect(cliente).toContain('if (outro !== menu) outro.open = false');
  });
});

describe('a memória, o relato e a foto', () => {
  it('cada um tem o seu menu, ao lado das reações', () => {
    expect(pagina).toContain('<MenuDeAcoes rotulo="Mais ações da memória">');
    expect(pagina).toContain('<MenuDeAcoes rotulo={`Mais ações do relato de ${nome(relato.por)}`}>');
    expect(pagina).toContain('<MenuDeAcoes rotulo={`Mais ações da foto ${n + 1}`}>');
    expect(pagina).toContain('ligarMenus();');
  });
  it('compartilhar e sugerir saíram do pé da página e moram no menu da memória', () => {
    const pe = pagina.slice(pagina.indexOf('<p class="servico miolo">'));
    expect(pe).not.toContain('/compartilhar`}');
    expect(pe).not.toContain('/sugerir`}');
    const menu = pagina.slice(pagina.indexOf('<MenuDeAcoes rotulo="Mais ações da memória">'), pagina.indexOf('</MenuDeAcoes>'));
    expect(menu).toContain('Compartilhar como imagem');
    expect(menu).toContain('Sugerir uma correção');
  });
  it('o recado ao autor do relato sai do menu do relato e chega ao formulário com o relato escolhido', () => {
    expect(pagina).toContain('/sugerir?relato=${relato.id}#recado');
    expect(sugerir).toContain('<section class="painel" id="recado">');
    expect(sugerir).toContain("Astro.url.searchParams.get('relato')");
  });
});
