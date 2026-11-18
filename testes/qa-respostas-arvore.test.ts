// Regras que nasceram das respostas do Gui ao QA de design de 17/11/2026, na árvore (P84 a P97 de
// docs/qa/2026-11-17-perguntas.md). Só o que fica em volta do desenho: a ficha, a legenda, os
// ajustes, a barra de baixo e o teclado. O arranjo e as linhas continuam em testes/arvore-*.test.ts.
//
// Com a página da árvore como mapa (proposta A, escolhida pelo Gui em 17/11/2026), a ficha, os
// ajustes e a legenda passaram para o painel flutuante. O que mudou de lugar está marcado em cada
// teste, e o quadro tem os testes dele em testes/mapa.test.ts.
import { describe, expect, it } from 'vitest';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const semComentario = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const pagina = ler('src/pages/arvore.astro');
const cliente = ler('src/lib/cliente/arvore.ts');
const css = semComentario(ler('src/visual/telas/arvore.css'));
const quadro = semComentario(ler('src/visual/telas/mapa.css'));
const painel = ler('src/lib/cliente/painel-do-mapa.ts');
/** O CSS que vale no celular: o que vem antes da primeira regra de largura. */
const celular = css.slice(0, css.indexOf('@media (min-width: 40rem)'));

describe('a ficha da árvore', () => {
  const ficha = cliente.slice(cliente.indexOf('let fichaAberta'), cliente.indexOf('const marcaDeBicho'));
  it('a árvore abre sem ficha, e ela aparece ao tocar em alguém (P84)', () => {
    expect(ficha).toMatch(/let fichaAberta = false;/);
    expect(ficha).toMatch(/if \(!fichaAberta\) return ficha\.replaceChildren\(\);/);
    expect(cliente).toMatch(/const focar = \(id: string\) => \{\s*estado\.foco = id;\s*fichaAberta = true;/);
    expect(quadro).toMatch(/\.pm__ficha:empty \{\s*display: none;/);
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
  it('as duas ações ficam à vista no celular e na tela grande, sem "Mais" (P86, revisto com o painel)', () => {
    expect(ficha).not.toMatch(/Mais|data-mais/);
    expect(quadro).toMatch(/\.pm__ficha a,\s*\.pm__ficha \[data-partir\] \{\s*grid-row: 3;/);
    expect(quadro).toMatch(/\.pm__ficha button\[hidden\] \{\s*display: none;/);
  });
  it('fica dentro do painel, logo abaixo do título (P85, revisto com o painel)', () => {
    const alto = pagina.indexOf('<header class="pm__alto">');
    const lugar = pagina.indexOf('<div class="pm__ficha" data-ficha-do-foco aria-live="polite"></div>');
    expect(alto).toBeGreaterThan(-1);
    expect(lugar).toBeGreaterThan(alto);
    expect(lugar).toBeLessThan(pagina.indexOf('<div class="pm__corpo"'));
    expect(css).not.toMatch(/\.mapa__foco \{/);
  });
});

describe('a barra de baixo da árvore', () => {
  it('diz para quem a árvore volta e chama a vista inteira pelo nome (P95)', () => {
    expect(pagina).toContain('<button type="button" data-ir-ao-foco>Voltar para {chamar(usuario.pessoa)}</button>');
    expect(cliente).toContain('irAoFoco.textContent = `Voltar para ${p.nome}`;');
    expect(pagina).not.toMatch(/Ir ao foco/);
    // No celular o nome vem encurtado, para a barra caber numa linha (resposta do Gui, 17/11/2026).
    // O nome por extenso continua valendo para o leitor de tela e na tela grande.
    expect(pagina).toContain('<button type="button" data-ver-tudo aria-label="Ver a árvore inteira"><span class="longo">Ver a árvore inteira</span><span class="curto">Ver tudo</span></button>');
  });
  it('no celular cabe numa linha: o nome encurtado e o zoom sem a escala', () => {
    expect(celular).not.toMatch(/\.mapa__zoom \{[^}]*flex-wrap/);
    expect(celular).toMatch(/\.mapa__vista \.longo,\s*\.mapa__escala span \{\s*display: none;/);
    const computador = css.slice(css.indexOf('@media (min-width: 40rem)'));
    expect(computador).toMatch(/\.mapa__vista \.curto \{\s*display: none;/);
    expect(computador).toMatch(/\.mapa__vista \.longo \{\s*display: inline;/);
  });
  it('o zoom continua indo até 400% (P94)', () => {
    expect(cliente).toMatch(/const ZOOM_MAX = 4;/);
    expect(cliente).not.toContain('PROVISÓRIO');
  });
});

describe('a legenda da árvore', () => {
  it('é uma seção do painel, no celular e na tela grande (P87, revisto com o painel)', () => {
    expect(pagina).toMatch(/<details class="pm__secao" name="painel-do-mapa" data-legenda>\s*<summary>Legenda<\/summary>/);
    expect(pagina).not.toMatch(/mapa__abre-legenda|data-abrir-legenda/);
  });
  it('nasce fechada, e abrir uma seção do painel fecha a outra (P89, revisto com o painel)', () => {
    expect(pagina).not.toMatch(/<details[^>]*\sopen/);
    expect([...pagina.matchAll(/<details class="pm__secao" name="painel-do-mapa"/g)]).toHaveLength(2);
    expect(pagina).not.toMatch(/localStorage/);
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
  it('o alto é só o título: a frase saiu (resposta do Gui, 17/11/2026, depois da P93)', () => {
    expect(pagina).not.toMatch(/Toque em alguém para ver quem é/);
    expect(pagina).toMatch(/<header class="pm__alto">\s*<h1 class="serifa">Árvore<\/h1>/);
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
    expect(quadro).toMatch(/\.pm__secao form:has\(select\[name='nucleo'\] option\[value=''\]:checked\) \.marcar:has\(input\[name='outros'\]\) \{\s*display: none;/);
  });
  it('no celular as caixas ficam em duas colunas, e a árvore é enquadrada no que sobra do painel (P92, revisto)', () => {
    expect(quadro).toMatch(/\.pm \.arvore__camadas \{\s*grid-template-columns: 1fr 1fr;/);
    expect(cliente).toMatch(/const verTudo = \(animado = true\) => \{\s*if \(!desenho\) return;\s*const livre = areaLivre\(\);/);
  });
  it('Esc fecha a seção aberta do painel, depois da lista de sugestões da busca (P92)', () => {
    expect(painel).toMatch(/if \(e\.key !== 'Escape' \|\| e\.defaultPrevented\) return;/);
    expect(painel).toMatch(/secao\.open = false;\s*secao\.querySelector<HTMLElement>\('summary'\)\?\.focus\(\);/);
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
