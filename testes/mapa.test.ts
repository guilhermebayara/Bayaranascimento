// O quadro do mapa (docs/regras/arvore.md, "A página como mapa", em "Árvore"): proposta A, escolhida pelo Gui em
// 17/11/2026. O mapa na janela inteira, o painel flutuante, o enquadramento pela altura e a busca
// por nome. O arranjo e as linhas da árvore continuam em testes/arvore-*.test.ts.
import { describe, expect, it } from 'vitest';

const fs = 'node:fs';
const { readFileSync, existsSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string; existsSync: (caminho: URL) => boolean };
const url = (caminho: string) => new URL(`../${caminho}`, import.meta.url);
const ler = (caminho: string) => readFileSync(url(caminho), 'utf8');
const semComentario = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const pagina = ler('src/pages/arvore.astro');
const cliente = ler('src/lib/cliente/arvore.ts');
const modulo = ler('src/lib/cliente/mapa-que-anda.ts');
const quadro = semComentario(ler('src/visual/telas/mapa.css'));
const arvore = semComentario(ler('src/visual/telas/arvore.css'));

describe('a árvore como mapa', () => {
  it('ocupa a janela inteira abaixo do menu: sem título fora do mapa e sem linha no pé', () => {
    expect(pagina).toMatch(/<Visual titulo="Árvore" secao="arvore" mapa>/);
    expect(pagina).not.toMatch(/arvore__topo|arvore__rodape/);
    expect(quadro).toMatch(/\.quadro \{\s*display: grid;\s*grid-template-rows: minmax\(0, 1fr\);/);
    // A altura não é mais uma conta com a janela
    expect(arvore).not.toMatch(/100svh/);
  });

  it('um painel só reúne o título, a ficha, a busca, os ajustes, a legenda e "Cadastrar pessoa"', () => {
    const painel = pagina.slice(pagina.indexOf('<aside class="pm"'), pagina.indexOf('</aside>'));
    const ordem = ['<h1 class="serifa">Árvore</h1>', 'data-ficha-do-foco', 'Procurar na árvore', '<summary>Ajustar a árvore</summary>', '<summary>Legenda</summary>', 'Cadastrar pessoa'].map((trecho) => painel.indexOf(trecho));
    expect(ordem.every((i) => i > -1)).toBe(true);
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem);
    // O painel não deixa o arrasto do mapa começar nele
    expect(pagina).toMatch(/<aside class="pm" data-sobre-o-mapa data-quadro/);
  });

  it('o painel flutua no alto, à esquerda, e no celular é um cartão recolhido numa linha', () => {
    const celular = quadro.slice(0, quadro.indexOf('@media (min-width: 40rem)'));
    expect(celular).toMatch(/\.pm \{\s*top: var\(--e-3\);\s*left: var\(--margem\);\s*right: var\(--margem\);/);
    expect(celular).toMatch(/\.pm__corpo \{\s*display: none;/);
    expect(celular).toMatch(/\.pm\[data-aberto\] \.pm__corpo \{\s*display: block;/);
    const grande = quadro.slice(quadro.indexOf('@media (min-width: 40rem)'));
    expect(grande).toMatch(/\.pm \{\s*top: var\(--e-4\);\s*right: auto;\s*width: 20rem;/);
    expect(grande).toMatch(/\.pm__abre \{\s*display: none;/);
    // Nada preso à rolagem: o painel é absoluto dentro do mapa
    expect(quadro).not.toMatch(/position:\s*(fixed|sticky)/);
  });

  it('o botão do painel e as seções têm 44 px de toque e foco visível', () => {
    expect(quadro).toMatch(/\.pm__abre,\s*\.pm__secao summary \{[^}]*min-height: var\(--toque\);/);
    expect(quadro).toMatch(/\.pm__abre:focus-visible,\s*\.pm__secao summary:focus-visible \{\s*outline: var\(--traco\) solid var\(--tinta\);/);
    expect(pagina).toMatch(/data-abrir-painel aria-expanded="false" aria-controls="corpo-do-painel"/);
  });

  it('a altura da tela guia o enquadramento da chegada, no que sobra ao lado do painel e acima da barra', () => {
    expect(cliente).toMatch(/const quadro = raiz\.querySelector<HTMLElement>\('\[data-quadro\]'\);/);
    expect(cliente).toMatch(/vista\.zoom = Math\.max\(0\.6, Math\.min\(1\.1, \(livre\.h - folga \* 2\) \/ desenho\.altura\)\);/);
    expect(cliente).toMatch(/enquadrarPelaAltura\(\);\s*\/\/ As caixas só passam a deslizar/);
    // A barra de baixo sai da conta, para a árvore inteira ficar acima dela
    expect(cliente).toContain('const areaLivre = () => areaLivreDoMapa(mapa, quadro, barraDeBaixo);');
    expect(modulo).toMatch(/if \(b && b\.height\) livre\.h = Math\.min\(livre\.h, b\.top - m\.top\);/);
    // A vista continua mudando só por aplicarVista, que passa pelo módulo e mantém a nitidez
    expect(cliente).toContain('const aplicarVista = (animado = false) => anda.aplicar(animado);');
    expect(cliente).not.toMatch(/style\.transform = `translate\(\$\{vista\.x\}px/);
    expect(modulo.match(/c\.style\.transform = `translate\(\$\{vista\.x\}px/g)).toHaveLength(1);
  });

  it('a busca por nome mantém a linha direta: abre o cartão do ramo e leva o mapa até a pessoa, com a ficha', () => {
    const ir = cliente.slice(cliente.indexOf('irPara(id) {'));
    expect(ir).toMatch(/ramo = ramosDeAgora\.find\(\(r\) => r\.membros\.includes\(id\)\);/);
    expect(ir).toMatch(/if \(ramo\) estado\.ramos\.add\(ramo\.chave\);/);
    expect(ir).toMatch(/focar\(id\);\s*if \(ramo\) mostrarCartao\(ramo\.chave\);/);
    // E a pessoa procurada fica à vista, fora do painel e da barra de baixo
    expect(ir).toMatch(/if \(cartao\) trazerParaAVista\(cartao\);/);
    // O ponto de partida só muda para quem não tem lugar na árvore de agora
    expect(ir.indexOf('estado.centro = id;')).toBeGreaterThan(ir.indexOf('estado.ramos.add(ramo.chave)'));
    expect(ir).toMatch(/if \(!naTela\(id\) && partivel\.has\(id\)\) \{\s*estado\.centro = id;/);
    // focar abre a ficha
    expect(cliente).toMatch(/const focar = \(id: string\) => \{\s*estado\.foco = id;\s*fichaAberta = true;/);
    expect(pagina).toMatch(/arvore\.irPara\(quem\.value\);/);
  });

  it('a busca só oferece quem a pessoa vê, e não muda quem aparece na árvore', () => {
    expect(pagina).toMatch(/<select name="quem">\s*<option value="">Escreva o nome<\/option>\s*\{ordenados\.map\(/);
    // Quem é ex discreto ou fora para quem olha também sai da busca (src/lib/ex-casal.ts)
    expect(pagina).toMatch(/const ordenados = integrantes\.filter\(\(i\) => !modosDosExes\.has\(i\.id\)\)\.sort/);
    expect(pagina).toContain('const integrantes = todos.filter((i) => !naoVe.has(i.id));');
  });

  it('na legenda, os grupos ficam mais longe uns dos outros do que o título dos próprios itens (proximidade)', () => {
    // Pedido do Gui (18/11/2026): com quase o mesmo espaço antes e depois, o título ficava solto
    // entre duas listas. Os tokens de espaço crescem com o número: --e-6 é quatro vezes --e-2.
    const passo = (regra: RegExp) => Number(regra.exec(arvore)![1]);
    const entreGrupos = passo(/\.legenda \{[^}]*gap: var\(--e-(\d)\)/);
    const doTitulo = passo(/\.legenda h2 \{\s*margin: 0 0 var\(--e-(\d)\);/);
    const entreItens = passo(/\.legenda ul \{[^}]*gap: var\(--e-(\d)\);/);
    expect(entreGrupos).toBeGreaterThanOrEqual(doTitulo + 3);
    expect(entreGrupos).toBeGreaterThanOrEqual(entreItens + 3);
    expect(doTitulo).toBeLessThanOrEqual(entreItens);
  });

  it('a rota de conceito saiu quando a construção substituiu a página', () => {
    expect(existsSync(url('src/pages/conceito/mapa'))).toBe(false);
    expect(existsSync(url('src/visual/telas/mapa-conceito.css'))).toBe(false);
    expect(existsSync(url('src/components/conceito'))).toBe(false);
  });
});

describe('o código de andar e aproximar, num módulo só (resposta do Gui aos PRs #53 a #62)', () => {
  const circulo = ler('src/lib/cliente/circulo.ts');
  it('a árvore e o círculo usam src/lib/cliente/mapa-que-anda.ts, sem cópia própria dos gestos', () => {
    for (const arquivo of [cliente, circulo]) {
      expect(arquivo).toMatch(/import \{ areaLivreDoMapa, mapaQueAnda \} from '\.\/mapa-que-anda';/);
      expect(arquivo).toMatch(/= mapaQueAnda\(\{/);
      // O círculo tem o próprio pointerdown, que arrasta uma pessoa; a roda e o arrasto do mapa são do módulo
      expect(arquivo).not.toMatch(/mapa\.addEventListener\(\s*'(wheel|dragstart|scroll)'/);
      expect(arquivo).not.toMatch(/const (dedos|pinca|emGesto) =|let (pinca|fimDoGesto)\b/);
    }
  });
  it('sem mudar o comportamento: na árvore o teclado anda com o foco num cartão; no círculo, só com o foco no mapa', () => {
    expect(cliente).toMatch(/tecladoAnda: \(alvo\) => !alvo\.closest\('\[data-sobre-o-mapa\]'\),/);
    expect(cliente).toMatch(/foraDoGesto: \(alvo\) => Boolean\(alvo\.closest\('\[data-sobre-o-mapa\]'\)\),/);
    expect(circulo).not.toMatch(/tecladoAnda/);
    expect(modulo).toMatch(/tecladoAnda = \(alvo\) => alvo === mapa/);
    expect(modulo).toMatch(/if \(!ativo\(\) \|\| !tecladoAnda\(e\.target as HTMLElement\)\) return;/);
  });
});
