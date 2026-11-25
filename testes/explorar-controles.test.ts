// Os controles do Explorar, proposta A do conceito da sessão D, "cada coisa no seu lugar" (decisão
// do Gui, 18/11/2026), e os do modo TV a partir de 62rem: a barra (proposta A da sessão X, escolhida
// pelo Gui em 22/11/2026), com os símbolos de TV, o nome de cada um no foco e o ocultar. As fichas
// dos filtros ligados estão em testes/explorar.test.ts (filtrosLigados), e as teclas do modo TV, em
// teclaNaTv, no mesmo arquivo. A conferência com o navegador é a de scripts/confere-tv.mjs.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contraste, neutroDosTokens } from '../src/lib/contraste';
import { degrauDoTitulo, degrauDoTrecho } from '../src/lib/explorar';

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

describe('o modo TV a partir de 62rem: a barra', () => {
  const tv = ler('src/visual/telas/tv.css');
  const palco = ler('src/components/explorar/Palco.astro');
  const pagina = ler('src/pages/explorar.astro');
  // A barra vale também na janela deitada abaixo de 62rem, com a unidade dela no fim de tv.css
  const bloco = tv.slice(tv.indexOf('@media (min-width: 62rem), (orientation: landscape) {'));

  it('só vale a partir de 62rem: abaixo disso, o modo TV é o de antes', () => {
    const fora = tv.slice(0, tv.indexOf('@media (min-width: 62rem), (orientation: landscape) {')).replace(/\/\*[\s\S]*?\*\//g, '');
    expect(fora.trim()).toBe('');
    expect(tv.match(/@media/g)).toHaveLength(2);
    expect(tv).toMatch(/@media \(max-width: 61\.99rem\) and \(orientation: landscape\) \{\s*html:has\(\.palco--tv\) \{\s*font-size: min\(100vw \/ 52, 100svh \/ 24\);/);
    // O celular desfaz o desenho dos símbolos e continua com o nome escrito, na ordem de antes
    expect(css).toMatch(/@media \(max-width: 61\.99rem\) and \(orientation: portrait\) \{[\s\S]*?\.palco \.botao-simbolo \.simbolo,\s*\.palco \.palco__na-barra \{\s*display: none;/);
    expect(css).toMatch(/\.palco \.palco__sozinho \{\s*order: 1;/);
  });

  it('sem as propostas de teste: nem o conceito no endereço, nem o verso, nem o vidro', () => {
    expect(pagina).not.toMatch(/conceito/i);
    expect(palco).not.toMatch(/conceito|palco__verso|data-palco-verso/);
    expect(ler('src/lib/explorar.ts')).not.toMatch(/CONCEITOS_DA_TV|lerConceitoDaTv/);
    expect(ler('src/visual/tokens.css')).not.toMatch(/--vidro/);
    expect(tv).not.toMatch(/vidro|backdrop-filter|conceito/);
  });

  it('1rem é um pedaço da janela: 1/80 da largura ou 1/45 da altura, o que for menor', () => {
    expect(bloco).toMatch(/html:has\(\.palco--tv\) \{\s*font-size: min\(100vw \/ 80, 100svh \/ 45\);/);
    // Nenhum degrau por faixa de altura, aqui nem no CSS do Explorar
    expect(tv).not.toMatch(/\((min|max)-height/);
    expect(css).not.toMatch(/\((min|max)-height/);
  });

  it('o palco tem a altura exata da janela e nada é preso por fixed nem sticky', () => {
    expect(bloco).toMatch(/\.palco\.palco--tv\[data-palco\] \{[^}]*height: 100svh;[^}]*overflow: clip;/);
    expect(tv).not.toMatch(/position\s*:\s*(fixed|sticky)/);
    expect(bloco).toMatch(/\.palco\.palco--tv\[data-palco\] \.palco__controles \{[^}]*position: absolute;/);
  });

  it('a foto sai da altura que sobra na janela, e a barra guarda o lugar do nome embaixo dela', () => {
    expect(bloco).toMatch(/--foto: min\(var\(--tv-foto-max\), \(100svh - var\(--tv-topo\) - var\(--tv-pe\) - var\(--tv-respiro\)\) \/ var\(--tv-razao\)\);/);
    expect(bloco).toMatch(/--tv-pe: calc\(var\(--tv-barra-pe\) \+ var\(--tv-barra\) \+ var\(--e-2\)\);/);
    expect(bloco).toMatch(/\.palco__controles \{[^}]*inset: auto auto var\(--tv-barra-pe\) 50%;/);
    expect(bloco).toMatch(/\.palco__controles \.botao-simbolo__nome \{\s*top: calc\(100% \+ var\(--e-1\) \+ var\(--e-2\)\);/);
  });

  it('a memória longa desce na escala: o título em três degraus e o trecho em dois', () => {
    expect(degrauDoTitulo('Casamento da Prima Carol')).toBe(1);
    expect(degrauDoTitulo('a'.repeat(40))).toBe(1);
    expect(degrauDoTitulo('a'.repeat(41))).toBe(2);
    expect(degrauDoTitulo('a'.repeat(90))).toBe(2);
    expect(degrauDoTitulo('a'.repeat(120))).toBe(3);
    // Conta letras, e não bytes
    expect(degrauDoTitulo('ã'.repeat(40))).toBe(1);
    expect(degrauDoTrecho('a'.repeat(150))).toBe(1);
    expect(degrauDoTrecho('a'.repeat(220))).toBe(2);
    for (const [degrau, fator] of [['2', '0.46'], ['3', '0.36']] as const) expect(tv).toMatch(new RegExp(`\\.palco__titulo\\[data-degrau='${degrau}'\\] \\{[^}]*font-size: calc\\(var\\(--t-titulo-1\\) \\* ${fator}\\);`));
    expect(palco).toContain("data-degrau={tv ? degrauDoTitulo(memoria.titulo) : undefined}");
  });

  it('a barra é do material do site: o cartão branco, com a sombra do bilhete', () => {
    const regra = /\.palco__controles::before,[^{]*\{([^}]*)\}/.exec(tv)![1]!;
    expect(regra).toContain('background: var(--branco);');
    expect(regra).toContain('box-shadow: var(--sombra-bilhete);');
    expect(regra).toContain('border: 1px solid var(--fio);');
  });

  it('o texto e os símbolos do cartão passam de 4,5 para um, sobre foto clara ou escura', () => {
    // O cartão é opaco: o que está atrás (a foto clara ou escura de "Só as fotos") não muda o
    // contraste. O texto de apoio é a tinta sobre o branco, conferida aqui.
    const tokens = ler('src/visual/tokens.css');
    const branco = neutroDosTokens(tokens, 'branco');
    const tinta = neutroDosTokens(tokens, 'tinta');
    const parte = Number(/--tinta-suave: color-mix\(in srgb, var\(--tinta\) (\d+)%, var\(--branco\)\);/.exec(tv)![1]) / 100;
    const canais = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const suave = `#${canais(tinta).map((v, i) => Math.round(v * parte + canais(branco)[i]! * (1 - parte)).toString(16).padStart(2, '0')).join('')}`;
    expect(contraste(tinta, branco)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(suave, branco)).toBeGreaterThanOrEqual(4.5);
    // O símbolo cheio ("Próxima") é o branco sobre a tinta, e o nome que aparece no foco também
    expect(bloco).toMatch(/\.palco__controles \.botao-simbolo--cheio \{\s*background: var\(--tinta\);\s*color: var\(--branco\);/);
    expect(ler('src/visual/pecas.css')).toMatch(/\.botao-simbolo__nome \{[^}]*background: var\(--tinta\);\s*color: var\(--branco\);/);
  });

  it('o foco é grande o bastante para ver do sofá', () => {
    expect(bloco).toMatch(/\.palco\.palco--tv\[data-palco\] :focus-visible \{\s*outline: 0\.1875rem solid var\(--tinta\);/);
  });
});

describe('os símbolos do modo TV', () => {
  const palco = ler('src/components/explorar/Palco.astro');
  const botao = ler('src/components/visual/BotaoDeSimbolo.astro');

  it('os controles com símbolo conhecido de TV são símbolos; sair e abrir continuam escritos', () => {
    for (const [simbolo, nome] of [['anterior', 'Anterior'], ['proxima', 'Próxima'], ['tocar', 'Passar sozinho'], ['tela-cheia', 'Tela cheia'], ['ajustes', 'Ajustes'], ['ocultar', 'Ocultar os controles'], ['mostrar', 'Mostrar os controles']])
      expect(palco).toMatch(new RegExp(`<BotaoDeSimbolo[^>]*simbolo="${simbolo}" nome="${nome}"`));
    // Tocar e pausar trocam no mesmo botão: o símbolo e o nome, juntos
    expect(palco).toContain("<BotaoDeSimbolo simbolo={passar.pausado ? 'tocar' : 'pausar'} nome={passar.pausado ? 'Retomar' : 'Pausar'} class=\"acao\" data-palco-pausa />");
    expect(palco).toMatch(/trocarSimbolo\(botao, pausado \? 'tocar' : 'pausar', pausado \? 'Retomar' : 'Pausar'\);/);
    expect(palco).toMatch(/trocarSimbolo\(cheia, document\.fullscreenElement \? 'sair-da-tela-cheia' : 'tela-cheia', nome\);/);
    for (const escrito of ['Sair do modo TV', 'Abrir esta memória', 'Só as fotos', 'Mostrar o texto']) expect(palco).toContain(escrito);
  });

  it('nenhum botão de símbolo do modo TV fica sem nome acessível', () => {
    // Todo botão de símbolo do palco diz o nome, e a peça põe o nome no aria-label e escrito junto
    const botoes = [...palco.matchAll(/<BotaoDeSimbolo\b([^>]*)\/>/g)].map((m) => m[1]!);
    expect(botoes.length).toBeGreaterThanOrEqual(7);
    for (const atributos of botoes) expect(atributos, atributos).toMatch(/\bnome=("[^"\s][^"]*"|\{[^}]+\})/);
    expect(botao).toMatch(/aria-label=\{nome\}/);
    expect(botao).toMatch(/<span class="botao-simbolo__nome" aria-hidden="true">\{nome\}<\/span>/);
    // O símbolo é enfeite para o leitor de tela, e nenhum símbolo entra no palco sem a peça que dá o nome
    expect(ler('src/components/visual/Simbolo.astro')).toMatch(/aria-hidden="true"/);
    expect(palco).not.toMatch(/<Simbolo\b|<svg\b/);
    // Quem troca o símbolo pelo script troca o nome acessível e o escrito junto
    expect(palco).toMatch(/function trocarSimbolo\([^)]*\) \{[\s\S]*?botao\.setAttribute\('aria-label', nome\);[\s\S]*?escrito\.textContent = nome;/);
  });

  it('o nome aparece no foco e no ponteiro, e não ocupa lugar', () => {
    const pecas = ler('src/visual/pecas.css');
    expect(pecas).toMatch(/\.botao-simbolo__nome \{\s*position: absolute;/);
    expect(pecas).toMatch(/\.botao-simbolo:focus-visible \.botao-simbolo__nome \{\s*visibility: visible;\s*opacity: 1;/);
    expect(pecas).toMatch(/@media \(hover: hover\) \{\s*\.botao-simbolo:hover \.botao-simbolo__nome \{\s*visibility: visible;/);
  });
});

describe('ocultar e reexibir os controles', () => {
  const palco = ler('src/components/explorar/Palco.astro');
  const tv = ler('src/visual/telas/tv.css');

  it('só com script e a partir de 62rem: sem script, a barra fica sempre à vista', () => {
    expect(palco).toContain('<BotaoDeSimbolo simbolo="ocultar" nome="Ocultar os controles" class="palco__na-barra" data-palco-ocultar hidden />');
    expect(palco).toMatch(/querySelectorAll<HTMLElement>\('\[data-palco-passar\], \[data-palco-tela\], \[data-palco-ocultar\], \[data-palco-reexibir\]'\)\) parte\.hidden = false;/);
  });

  it('oculta a barra, o alto e "Abrir esta memória", e o foco vai para o botão do canto', () => {
    expect(tv).toMatch(/\.palco\.palco--tv\[data-palco\]:is\(\[data-oculto\], \[data-so-fotos\]:not\(\[data-controles\]\)\) :is\(\.palco__topo, \.palco__controles\) \{\s*visibility: hidden;/);
    expect(tv).toMatch(/\[data-oculto\] \.palco__texto > p:last-child \{\s*visibility: hidden;/);
    expect(palco).toMatch(/function ocultar\(\) \{[\s\S]*?atual\.setAttribute\('data-oculto', ''\);[\s\S]*?querySelector<HTMLElement>\('\[data-palco-reexibir\]'\)\?\.focus/);
  });

  it('o caminho de volta é um botão pequeno no canto, com nome, e não qualquer toque ou tecla', () => {
    // Pedido do Gui, 22/11/2026: as setas continuam passando as memórias com os controles ocultos
    expect(palco).toContain('<BotaoDeSimbolo simbolo="mostrar" nome="Mostrar os controles" nomeAcima class="palco__na-barra palco__reexibir" data-palco-reexibir hidden />');
    expect(tv).toMatch(/\[data-oculto\] \.palco__reexibir:not\(\[hidden\]\) \{\s*position: absolute;\s*right: var\(--margem\);\s*bottom: var\(--e-5\);/);
    expect(palco).toMatch(/if \(alvo\?\.closest\('\[data-palco\] \[data-palco-reexibir\]'\)\) return reexibir\(\);/);
    expect(palco).toMatch(/case 'reexibir':\s*evento\.preventDefault\(\);\s*return reexibir\(\);/);
    // O toque, o clique e o mouse não trazem a barra de volta
    expect(palco).toMatch(/if \(!soFotos\(\) \|\| ocultos\) return;/);
    expect(palco).toMatch(/if \(!atual \|\| !soFotos\(\) \|\| ocultos\) return;/);
    expect(palco).not.toMatch(/ocultosDesde|data-palco-dica/);
  });

  it('a barra volta com o foco no botão de ocultar', () => {
    expect(palco).toMatch(/function reexibir\(\) \{[\s\S]*?atual\.querySelector<HTMLElement>\('\[data-palco-ocultar\]'\)\?\.focus/);
  });

  it('"Passar sozinho" continua, a memória seguinte chega oculta, com o foco no botão do canto, e a escolha não fica no aparelho', () => {
    expect(palco).toMatch(/atual\.toggleAttribute\('data-oculto', ocultos\);/);
    expect(palco).toMatch(/if \(ocultos\) novo\.querySelector<HTMLElement>\('\[data-palco-reexibir\]'\)\?\.focus/);
    expect(palco).not.toMatch(/guardar\('tv-ocult/);
    // O relógio de "Passar sozinho" não olha para os controles
    expect(/function armar\(\) \{[\s\S]*?\n {2}\}/.exec(palco)![0]).not.toMatch(/ocult/);
  });

  it('o Esc fecha "Ajustes" antes de tudo, e o foco volta para quem abriu', () => {
    expect(palco).toMatch(/case 'fechar-ajustes':\s*evento\.preventDefault\(\);\s*return void fecharAbertos\(\);/);
    expect(palco).toMatch(/aberto\.open = false;\s*if \(!fora \|\| tinhaFoco\) aberto\.querySelector<HTMLElement>\('summary'\)\?\.focus/);
  });
});
