// Regras que nasceram das respostas do Gui ao QA de design de 17/11/2026, na árvore (P84 a P97 de
// docs/qa/2026-11-17-perguntas.md). Só o que fica em volta do desenho: a ficha, a legenda, os
// ajustes, a barra de baixo e o teclado. O arranjo e as linhas continuam em testes/arvore-*.test.ts.
import { describe, expect, it } from 'vitest';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const semComentario = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const pagina = ler('src/pages/arvore.astro');
const cliente = ler('src/lib/cliente/arvore.ts');
const css = semComentario(ler('src/visual/telas/arvore.css'));
/** O CSS que vale no celular: o que vem antes da primeira regra de largura. */
const celular = css.slice(0, css.indexOf('@media (min-width: 40rem)'));

describe('a ficha da árvore', () => {
  const ficha = cliente.slice(cliente.indexOf('let fichaAberta'), cliente.indexOf('const marcaDeBicho'));
  it('a árvore abre sem ficha, e ela aparece ao tocar em alguém (P84)', () => {
    expect(ficha).toMatch(/let fichaAberta = false;/);
    expect(ficha).toMatch(/if \(!fichaAberta\) return ficha\.replaceChildren\(\);/);
    expect(cliente).toMatch(/const focar = \(id: string\) => \{\s*estado\.foco = id;\s*fichaAberta = true;/);
    expect(css).toMatch(/\.mapa__foco:empty \{\s*display: none;/);
  });
  it('fecha no "×", no Esc e no toque no vazio (P84)', () => {
    expect(cliente).toMatch(/closest\('\[data-fechar-ficha\]'\)\) return fecharFicha\(\);/);
    expect(cliente).toMatch(/e\.key !== 'Escape' \|\| e\.defaultPrevented \|\| !fichaAberta\) return;\s*e\.preventDefault\(\);\s*fecharFicha\(\);/);
    expect(cliente).toMatch(/closest\('a\.no, button, \.ramo, \[data-sobre-o-mapa\]'\)\) return;\s*fecharFicha\(\);/);
  });
  it('o toque que encerra um arrasto não fecha a ficha', () => {
    expect(cliente).toMatch(/mapa\.addEventListener\('click', \(evento\) => \{\s*if \(Date\.now\(\) - fimDoArrasto < 300\) return;/);
  });
  it('tem "Ver a página" e "Ver a árvore de Fulano", e não tem mais "Laços" (P91)', () => {
    expect(ficha).toContain("textContent: 'Ver a página'");
    expect(ficha).toContain('textContent: `Ver a árvore de ${p.nome}`');
    expect(cliente).not.toMatch(/Partir desta pessoa|textContent: 'Laços'/);
    expect(ficha).not.toContain('/editar#lacos');
  });
  it('o parentesco e os anos são duas informações, com o ponto do carimbo entre elas (P97)', () => {
    expect(ficha).toMatch(/\[p\.rotulo, p\.anos\]\.filter\(Boolean\)\.map\(/);
    expect(ficha).not.toMatch(/join\(', '\)/);
    expect(css).toMatch(/\.mapa__foco-quem span \+ span::before \{\s*content: ' · ';/);
    expect(css).toMatch(/\.mapa__foco-quem \{[^}]*text-transform: uppercase;/);
  });
  it('no celular é uma linha, com a outra ação depois de "Mais", e sai com um ramo aberto (P86)', () => {
    expect(celular).toMatch(/\.mapa__foco \[data-partir\] \{[^}]*display: none;/);
    expect(celular).toMatch(/\.mapa__foco\[data-mais\] \[data-partir\] \{\s*display: inline-flex;/);
    expect(ficha).toMatch(/mais\.setAttribute\('aria-expanded', 'false'\)/);
    expect(celular).toMatch(/\.mapa:has\(\.ramo\) \.mapa__foco \{\s*display: none;/);
  });
  it('no computador fica embaixo, no centro, com largura fixa (P85)', () => {
    const computador = css.slice(css.indexOf('@media (min-width: 40rem)'), css.indexOf('@media (min-width: 62rem)'));
    expect(computador).toMatch(/\.mapa__foco \{\s*left: 50%;[^}]*bottom: [^}]*width: 22rem;[^}]*translate: -50% 0;/);
    expect(computador).not.toMatch(/\.mapa__foco \{[^}]*top:/);
  });
});

describe('a barra de baixo da árvore', () => {
  it('diz para quem a árvore volta e chama a vista inteira pelo nome (P95)', () => {
    expect(pagina).toContain('<button type="button" data-ir-ao-foco>Voltar para {chamar(usuario.pessoa)}</button>');
    expect(pagina).toContain('<button type="button" data-ver-tudo>Ver a árvore inteira</button>');
    expect(cliente).toContain('irAoFoco.textContent = `Voltar para ${p.nome}`;');
    expect(pagina).not.toMatch(/Ir ao foco|>Ver tudo</);
  });
  it('o zoom continua indo até 400% (P94)', () => {
    expect(cliente).toMatch(/const ZOOM_MAX = 4;/);
    expect(cliente).not.toContain('PROVISÓRIO');
  });
});

describe('a legenda da árvore', () => {
  it('no celular abre pelo botão "Legenda" da barra de baixo, por cima do mapa (P87)', () => {
    expect(pagina).toMatch(/<button type="button" class="mapa__abre-legenda" data-abrir-legenda aria-controls="legenda-da-arvore">Legenda<\/button>/);
    expect(celular).toMatch(/\.mapa__legenda \{\s*display: none;/);
    expect(celular).toMatch(/\.mapa__legenda\[open\] \{\s*display: block;/);
    expect(pagina).toMatch(/abreLegenda\?\.addEventListener\('click', \(\) => \{\s*legenda\.open = true;/);
  });
  it('nasce fechada no HTML; no computador abre na primeira visita e lembra se foi fechada (P89)', () => {
    expect(pagina).toMatch(/<details class="mapa__legenda" id="legenda-da-arvore" data-sobre-o-mapa data-legenda>/);
    expect(pagina).toMatch(/if \(largo\.matches && guardado\(\) !== 'fechada'\) legenda\.open = true;/);
    expect(pagina).toMatch(/localStorage\.setItem\(CHAVE, legenda\.open \? 'aberta' : 'fechada'\)/);
  });
  it('tem três grupos com título e tudo o que a árvore mostra (P90)', () => {
    const legenda = pagina.slice(pagina.indexOf('<div class="legenda">'), pagina.indexOf('</details>', pagina.indexOf('<div class="legenda">')));
    expect([...legenda.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => m[1])).toEqual(['Famílias', 'Linhas', 'Botões e marcas']);
    for (const item of ['de duas famílias', 'amigos e de fora', 'casal', 'não estão mais juntos', 'pais e filhos', 'consideração ou coração', '+ 1', '♥ 2', 'você', 'quem você tocou', 'bicho da família']) {
      expect(legenda, item).toContain(item);
    }
    // O bicho é mostrado pela forma do cartão, e não por uma linha
    expect(legenda).toContain('amostra-cor--bicho');
    expect(pagina).not.toContain('amostra--bicho');
  });
});

describe('o alto e o pé da página da árvore', () => {
  it('o texto do alto é uma frase só (P93)', () => {
    expect(pagina).toMatch(/<p>Toque em alguém para ver quem é\.<\/p>/);
    expect(pagina).not.toMatch(/Arraste para andar pela família\. Toque/);
  });
  it('"Cadastrar pessoa" tem o mesmo nome aqui e em Pessoas (P96)', () => {
    expect(pagina).toMatch(/href="\/pessoas\/nova">Cadastrar pessoa<\/a>/);
    expect(ler('src/pages/pessoas/index.astro')).toMatch(/href="\/pessoas\/nova">Cadastrar pessoa<\/a>/);
  });
});

describe('"Ajustar a árvore"', () => {
  it('o valor de agora de "Partir de" aparece como valor, com "Voltar ao começo" quando muda (P92)', () => {
    expect(css).toMatch(/\.mapa \.busca__campo::placeholder \{\s*color: var\(--tinta\);/);
    expect(pagina).toMatch(/<button type="button" class="arvore__voltar" data-voltar-ao-comeco hidden>Voltar ao começo<\/button>/);
    expect(pagina).toMatch(/const refletir = \(\) => \(voltar\.hidden = !centro\.value\);/);
    // A volta segue o caminho de quem apaga o campo: o "change" da lista, que o mapa já escuta
    expect(pagina).toMatch(/centro\.value = '';\s*centro\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\);/);
  });
  it('"Outras famílias" só aparece com uma família em destaque (P92)', () => {
    expect(css).toMatch(/\.mapa__painel form:has\(select\[name='nucleo'\] option\[value=''\]:checked\) \.marcar:has\(input\[name='outros'\]\) \{\s*display: none;/);
  });
  it('no celular abre no pé do mapa, com as caixas em duas colunas, e a árvore é enquadrada acima (P92)', () => {
    expect(celular).toMatch(/\.mapa__painel\[open\] \{[^}]*top: auto;\s*bottom: var\(--e-4\);/);
    expect(celular).toMatch(/\.mapa__painel\[open\] \.arvore__camadas \{\s*grid-template-columns: 1fr 1fr;/);
    expect(cliente).toMatch(/const altura = alturaLivre\(\);/);
  });
  it('Esc fecha os ajustes e a legenda, depois da lista de sugestões da busca (P92)', () => {
    expect(pagina).toMatch(/for \(const caixa of \[painel, legenda\]\) \{\s*caixa\?\.addEventListener\('keydown', \(e\) => \{\s*if \(e\.key !== 'Escape' \|\| e\.defaultPrevented \|\| !caixa\.open\) return;/);
  });
});

describe('a árvore pelo teclado (P88)', () => {
  it('a caixa do mapa nunca rola', () => {
    expect(cliente).toMatch(/const semRolagem = \(\) => \{\s*if \(mapa\.scrollLeft\) mapa\.scrollLeft = 0;\s*if \(mapa\.scrollTop\) mapa\.scrollTop = 0;/);
    expect(cliente).toContain("mapa.addEventListener('scroll', semRolagem);");
  });
  it('o mapa anda até o que recebeu o foco do teclado, e só o do teclado', () => {
    expect(cliente).toMatch(/c\.addEventListener\('focusin', \(e\) => \{[\s\S]*?if \(alvo\.matches\(':focus-visible'\)\) trazerParaAVista\(alvo\);/);
    // A vista muda pelo caminho de sempre, que marca o gesto e mantém a nitidez
    const trazer = cliente.slice(cliente.indexOf('const trazerParaAVista'), cliente.indexOf('const devolverFoco'));
    expect(trazer).toMatch(/vista\.x \+= dx;\s*vista\.y \+= dy;\s*aplicarVista\(true\);/);
    expect(trazer).not.toMatch(/vista\.zoom =|style\.transform =/);
  });
  it('abrir ou recolher um ramo pelo teclado devolve o foco para a marca do ramo', () => {
    expect(cliente).toMatch(/desenhar\(\);\s*if \(tinhaFoco\) devolverFoco\(`button\.no__ramo\[data-ramo="\$\{CSS\.escape\(chave\)\}"\]`\);/);
    expect(cliente).toMatch(/el\.focus\(\{ preventScroll: true \}\)/);
  });
});
