// Os controles do Explorar, proposta A do conceito da sessão D, "cada coisa no seu lugar" (decisão
// do Gui, 18/11/2026), e o modo TV que cabe em 1280 × 720. As fichas dos filtros ligados estão em
// testes/explorar.test.ts (filtrosLigados).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(caminho, 'utf8');
const controles = ler('src/components/explorar/Controles.astro');
const css = ler('src/visual/telas/explorar.css');
const troca = ler('src/lib/cliente/explorar-troca.ts');

describe('cada coisa no seu lugar', () => {
  it('as famílias em pílula, as formas de ver em abas e "Filtros" como uma ferramenta só, nessa ordem', () => {
    const familias = controles.indexOf('class="controles__familias"');
    const formas = controles.indexOf('class="controles__formas"');
    const ferramentas = controles.indexOf('class="controles__ferramentas"');
    expect(familias).toBeGreaterThan(0);
    expect(formas).toBeGreaterThan(familias);
    expect(ferramentas).toBeGreaterThan(formas);
    expect(controles).toContain('<nav class="linha__opcoes linha__opcoes--etiquetas" aria-labelledby="controle-familia">');
    expect(controles).toContain('<nav class="abas" aria-labelledby="controle-forma">');
    // Na tela, a ordem visual é a do conceito: família, abas, filtros, fichas ligadas, conta
    for (const [seletor, ordem] of [['.controles__familias', 1], ['.controles__formas', 2], ['.controles__ferramentas', 3], ['.controles__ligados', 4]] as const)
      expect(css).toMatch(new RegExp(`\\${seletor} \\{\\s*order: ${ordem};`));
  });

  it('as abas ficam coladas no conteúdo, longe das famílias (proximidade)', () => {
    expect(css).toMatch(/\.controles__formas \{\s*order: 2;\s*margin-top: var\(--e-7\);\s*border-bottom: var\(--traco\) solid var\(--tinta\);/);
    expect(css).toMatch(/\.controles__familias \{\s*order: 1;\s*margin-top: var\(--e-3\);/);
  });

  it('"Filtros" fechado diz quantos estão ligados, e cada ligado vira uma ficha que se desliga', () => {
    expect(controles).toMatch(/<b class="filtros__quantos"[^>]*>\{ligados\.length\}<\/b>/);
    expect(controles).toMatch(/<a class="ficha-ligada" href=\{para\(l\.sem\)\} aria-label=\{`Tirar o filtro “\$\{l\.texto\}”`\}>/);
    expect(ler('src/pages/explorar.astro')).toContain('const ligados = filtrosLigados(filtros, {');
  });

  it('aberto, é um cartão com os grupos em linhas que abrem no lugar', () => {
    expect(controles).toMatch(/<form class="filtros__cartao" method="get" action="\/explorar" data-filtros>/);
    expect(controles).toContain('<details class="filtros__grupo">');
    expect(css).toMatch(/\.filtros__cartao \{\s*display: grid;[^}]*background: var\(--branco\);/);
  });

  it('a ordem é um seletor do sistema, com links, e não o do navegador', () => {
    expect(controles).not.toMatch(/<select/);
    expect(controles).toMatch(/<details class="ordenar" data-menu>/);
    expect(controles).toMatch(/<nav class="ordenar__menu" aria-labelledby="controle-ordem">/);
    // O filtro não desfaz a ordem: ela vai junto no formulário
    expect(controles).toContain('{filtros.ordem !== ORDEM_PADRAO && <input type="hidden" name="ordem" value={filtros.ordem} />}');
    // Com script, a escolha fecha o seletor, o Esc fecha e devolve o foco, e o toque fora fecha
    expect(troca).toMatch(/if \(menu\) \{\s*menu\.open = false;/);
    expect(troca).toMatch(/aberto\.open = false;\s*aberto\.querySelector<HTMLElement>\('summary'\)\?\.focus\(\);/);
    expect(troca).toContain("document.addEventListener('pointerdown'");
    // Aberto, fica por cima da faixa de décadas, que é presa
    expect(css).toMatch(/\.linha__capa--explorar:has\(\.ordenar\[open\]\) \{\s*position: relative;\s*z-index: 7;/);
  });

  it('limpar tira os filtros e deixa a família e a ordem', () => {
    expect(controles).toContain('const semFiltros: Filtros = { ...SEM_FILTRO, familias: filtros.familias, ordem: filtros.ordem };');
  });
});

describe('modo TV em 1280 × 720', () => {
  it('numa janela baixa, com "Ajustes" aberto, o respiro encolhe e cada ajuste fica numa linha', () => {
    const bloco = css.slice(css.indexOf('@media (min-width: 62rem) and (max-height: 50rem) {'));
    expect(bloco).toMatch(/\.palco--tv:not\(\[data-so-fotos\]\):has\(\.palco__ajustes\[open\]\) \{\s*padding-bottom: var\(--e-3\);/);
    expect(bloco).toMatch(/\.palco__ajustes\[open\] \.palco__ajuste \{\s*grid-auto-flow: column;/);
  });
});
