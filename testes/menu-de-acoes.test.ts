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
  it('o recado ao autor do relato sai do menu do relato e chega à página dele, com o relato escolhido', () => {
    const recado = readFileSync('src/pages/memorias/[id]/recado.astro', 'utf-8');
    expect(pagina).toContain('/recado?relato=${relato.id}');
    expect(recado).toContain("Astro.url.searchParams.get('relato')");
    expect(recado).toContain('<input type="hidden" name="relato" value={relato.id} />');
    // Sem um relato que a pessoa vê e não registrou, a página é a de um relato que não existe
    expect(recado).toMatch(/r\.situacao === 'publicada' && r\.registradoPor !== usuario\.pessoa && veORelato\(r, usuario, naoVe\)/);
    expect(recado).toContain("if (!relato) return new Response('Relato não encontrado', { status: 404 });");
  });
  it('a sugestão de correção é só dos dados da memória: o recado é outra ação, que parte do relato (observação do Gui, 18/11/2026)', () => {
    expect(sugerir).not.toContain('id="recado"');
    expect(sugerir).not.toContain('acao" value="recado"');
    expect(sugerir).not.toContain('listarRelatos');
    expect(pagina).not.toContain('/sugerir?relato=');
  });
});

// Sugestão do Gui (18/11/2026): no computador, o menu da memória ficava escondido na ponta da coluna
describe('o alto da memória no computador', () => {
  const css = readFileSync('src/visual/telas/memoria.css', 'utf-8');
  it('reagir, os dois atalhos e o menu numa linha só, com reagir primeiro', () => {
    expect(pagina).toMatch(/<div class="abre__acoes">\s*\{[^}]*\}\s*<p class="abre__atalho">/);
    const tela = css.slice(css.indexOf('.abre__acoes {'));
    expect(tela).toMatch(/\.abre__acoes \{[^}]*display: flex;/);
    expect(tela).toMatch(/\.abre__acoes > \.abre__atalho,\s*\.abre__acoes > \.abre__reagir \{\s*display: contents;/);
    expect(tela).toMatch(/\.abre__acoes \.reacoes \{\s*order: -1;/);
    // Só no computador: no celular, o menu continua à direita, embaixo dos atalhos
    const antes = css.slice(0, css.indexOf('.abre__acoes {'));
    expect(antes.lastIndexOf('@media (min-width: 62rem)')).toBeGreaterThan(antes.lastIndexOf('}\n}'));
  });
});
