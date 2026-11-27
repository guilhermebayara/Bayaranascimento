// Regras que nasceram das respostas do Gui ao QA de design de 17/11/2026, nos capítulos e nos temas
// (docs/historico/qa/2026-11-17-perguntas.md, P60 a P83).
import { describe, expect, it } from 'vitest';
import {
  FORMAS_DO_CAPITULO,
  NOMES_DAS_FORMAS_DO_CAPITULO,
  achaNaBusca,
  detalheDoCruzamento,
  enderecoDoCapitulo,
  lerFormaDoCapitulo,
  ordemDeMarcar,
  resumoDoCapitulo,
  tituloDasMemorias,
  type Capitulo,
} from '../src/lib/capitulos';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url), 'utf8');

const css = ler('src/visual/telas/capitulo.css');
const comMouse = css.slice(css.indexOf('@media (min-width: 62rem) and (hover: hover) and (pointer: fine)'), css.indexOf('@media (min-width: 100rem)'));
const telaGrande = css.slice(css.indexOf('@media (min-width: 100rem)'));
const capitulo = (c: Partial<Capitulo>): Capitulo =>
  ({ id: 'c', titulo: 'C', modo: 'reunido', inicio: null, fim: null, dentroDe: null, temas: [], pessoas: [], familias: [], nucleos: [], visibilidade: 'todos', abertura: '', ...c }) as Capitulo;

describe('a lista de capítulos', () => {
  const lista = ler('src/pages/capitulos/index.astro');
  it('P60: continua do mais antigo para o mais recente, como um sumário', () => {
    expect(lista).toContain('.sort((a, b) => a.ordem - b.ordem)');
  });
  it('P61: o título de cada linha tem o tamanho de item de lista', () => {
    expect(css).toMatch(/\n\.entrada-de-capitulo__titulo \{\s*font-size: var\(--t-titulo-3\);/);
    expect(css).not.toMatch(/entrada-de-capitulo[^{]*\{[^}]*--t-titulo-2/);
  });
  it('P62: o alto do sumário fica parado só onde há mouse', () => {
    expect(comMouse).toMatch(/\.sumario \.sumario__abre \{\s*position: sticky;\s*top: var\(--e-6\);\s*align-self: start;/);
    expect(css.slice(0, css.indexOf('@media (min-width: 62rem) and (hover: hover) and (pointer: fine)'))).not.toMatch(/position:\s*sticky/);
  });
  it('P63: toda linha tem o ponto, e o da época é cinza, para os selos alinharem', () => {
    expect(css).toMatch(/\n\.entrada-de-capitulo__dados::before \{[^}]*border: 2px solid color-mix\(in srgb, var\(--tinta-suave\) 45%, transparent\);/);
    expect(css).toMatch(/\.entrada-de-capitulo\[data-com-cor\] \.entrada-de-capitulo__dados::before \{\s*border-color: var\(--trilho-ponto, var\(--vivo\)\);/);
  });
  it('P64: os temas continuam no fim, com um atalho no alto que desce até eles', () => {
    expect(lista).toMatch(/temas\.length > 0 && \(\s*<a class="acao acao--quieta" href="#temas">\s*Ver os temas/);
    // A âncora é da parte dos temas (o endereço /temas leva a ela)
    expect(lista).toContain('<section class="temas" id="temas"');
    expect(lista.indexOf('id="temas"')).toBeGreaterThan(lista.indexOf('class="indice"'));
  });
});

describe('a página do capítulo', () => {
  const pagina = ler('src/pages/capitulos/[id]/index.astro');
  const capa = pagina.slice(pagina.indexOf('<header class="capitulo__capa">'), pagina.indexOf('</header>'));
  const parado = capa.slice(capa.indexOf('<div class="capitulo__parado">'), capa.indexOf('capitulo__abertura'));

  it('P65: no celular, a frase de abertura vem antes das ações', () => {
    const celular = css.slice(0, css.indexOf('@media (min-width: 40rem)'));
    expect(celular).toMatch(/\.capitulo__parado,\s*\.capitulo__rolagem \{\s*display: contents;/);
    expect(celular).toMatch(/\.capitulo__abertura \{\s*order: 1;\s*\}\s*\.capitulo__acoes \{\s*order: 2;/);
    // No computador o bloco volta a existir, e a ordem é a da marcação
    expect(css).toMatch(/\.capitulo \.capitulo__parado,\s*\.capitulo \.capitulo__rolagem \{\s*display: block;/);
  });
  it('P66: no celular, cada nome de "Quem aparece" continua sendo um link', () => {
    expect(capa).toMatch(/<p class="capitulo__nomes ficha">[\s\S]*?<a href=\{`\/pessoas\/\$\{id\}`\}>/);
    expect(css).toMatch(/\.capitulo__gente \.capitulo__nomes \{[^}]*line-height: var\(--toque\);/);
  });
  it('P67: o botão cheio é o de contar, e editar é texto', () => {
    expect(capa.match(/class="botao"/g)).toHaveLength(1);
    expect(capa).toMatch(/capitulo\.modo === 'reunido' && \(\s*<a class="botao" href=\{`\/nova\?capitulo=\$\{capitulo\.id\}`\}>\s*Nova memória neste capítulo/);
    expect(capa).toMatch(/<a class="acao" href=\{`\/capitulos\/\$\{capitulo\.id\}\/editar`\}>\s*\{nomeDoEditar\}/);
    expect(pagina).not.toMatch(/class="botao" href=\{`\/capitulos\/\$\{capitulo\.id\}\/editar`\}/);
  });
  it('P68: ficam parados só o selo, o título, o período e as ações', () => {
    for (const peca of ['capitulo__selo', 'capitulo__titulo', 'capitulo__periodo', 'capitulo__acoes']) expect(parado, peca).toContain(peca);
    for (const peca of ['capitulo__notas', 'capitulo__gente']) expect(parado, peca).not.toContain(peca);
    // A capa inteira fica parada, e o bloco do alto não encolhe; o resto rola numa área própria
    expect(comMouse).toMatch(/\.capitulo \.capitulo__capa \{\s*position: sticky;[^}]*top: var\(--e-6\);/);
    expect(comMouse).toMatch(/\.capitulo \.capitulo__parado \{\s*flex: none;/);
  });
  it('P69: a forma de ver fica na própria página, com o atalho para o modo TV', () => {
    expect(FORMAS_DO_CAPITULO).toEqual(['marcos', 'mural', 'lista']);
    expect(NOMES_DAS_FORMAS_DO_CAPITULO.mural).toBe('Mural de fotos');
    // 46-N7: a primeira forma tem o nome da página da pessoa
    expect(NOMES_DAS_FORMAS_DO_CAPITULO.marcos).toBe('Linha do tempo');
    expect(lerFormaDoCapitulo(new URLSearchParams(''))).toBe('marcos');
    expect(lerFormaDoCapitulo(new URLSearchParams('ver=lista'))).toBe('lista');
    // O que não é forma de ver do capítulo cai nos marcos
    expect(lerFormaDoCapitulo(new URLSearchParams('ver=tv'))).toBe('marcos');
    expect(enderecoDoCapitulo('natais')).toBe('/capitulos/natais');
    expect(enderecoDoCapitulo('natais', 'mural')).toBe('/capitulos/natais?ver=mural');
    expect(pagina).not.toContain('Ver no Explorar');
    expect(pagina).toMatch(/href=\{`\/explorar\?capitulo=\$\{capitulo\.id\}&ver=tv`\}>\s*Passar no modo TV/);
    expect(pagina).toMatch(/data-explorar>/);
    expect(pagina).toMatch(/import \{ ligarTroca \} from '\.\.\/\.\.\/\.\.\/lib\/cliente\/explorar-troca';\s*ligarTroca\(\);/);
    // No mural e na lista o rascunho não entra, como no Explorar
    expect(pagina).toMatch(/<Mural memorias=\{publicadas\}/);
    expect(pagina).toMatch(/<Lista memorias=\{publicadas\}/);
  });
  it('P70: o capítulo de dentro diz de qual faz parte acima do título', () => {
    expect(parado).toMatch(/maior && \(\s*<a class="capitulo__maior rotulo" href=\{`\/capitulos\/\$\{maior\.id\}`\}>\s*Capítulo de “\{maior\.titulo\}”/);
    expect(parado.indexOf('capitulo__maior')).toBeLessThan(parado.indexOf('<h1'));
    expect(pagina).not.toContain('Parte de');
    expect(css).toMatch(/\.capitulo__maior \{[^}]*min-height: var\(--toque\);/);
  });
  it('P71: a época não chama as memórias de "do capítulo"', () => {
    expect(tituloDasMemorias(capitulo({ modo: 'epoca' }), 4)).toBe('Memórias da época');
    expect(tituloDasMemorias(capitulo({ modo: 'epoca', pessoas: ['giovanna'] }), 4)).toBe('Memórias do capítulo');
    expect(tituloDasMemorias(capitulo({}), 4)).toBe('Memórias do capítulo');
    expect(tituloDasMemorias(capitulo({}), 0)).toBe('Memórias');
  });
  it('P72: a foto do marco vai sem legenda, e o carimbo quebra antes do ponto', () => {
    expect(pagina).toMatch(/<Polaroid id=\{m\.id\} fotos=\{m\.fotos\} legenda="" tipo=\{m\.tipo\}/);
    expect(css).toMatch(/\.marco \.carimbo > :not\(:last-child\)::after \{\s*content: none;/);
    expect(css).toMatch(/\.marco \.carimbo > :not\(:first-child\)::before \{\s*content: '·';/);
  });
  it('P73 e 46-N9: "Aconteceu neste período" diz só a exceção, que é o "em parte"', () => {
    expect(detalheDoCruzamento('inteiro')).toBeUndefined();
    expect(detalheDoCruzamento('parte')).toBe('em parte neste período');
    expect(pagina).toContain('detalhe={detalheDoCruzamento(como)}');
  });
  it('P74: na tela grande, o corpo vai até a margem e a foto do marco cresce', () => {
    expect(telaGrande).toMatch(/\.capitulo \.capitulo__corpo,\s*\.sumario \.sumario__lista \{\s*grid-column: 6 \/ -1;/);
    expect(telaGrande).toMatch(/\.marco \{\s*grid-template-columns: 8rem minmax\(0, 1fr\) 14rem;/);
  });
});

describe('novo capítulo, editar e excluir', () => {
  const ficha = ler('src/components/FichaDoCapitulo.astro');
  const editar = ler('src/pages/capitulos/[id]/editar.astro');
  const formulario = ler('src/visual/telas/formulario.css');
  it('P75: as etapas são perguntas', () => {
    for (const pergunta of ['Que capítulo é esse?', 'Onde ele se encaixa?']) {
      expect(ficha).toContain(`data-etapa="${pergunta}"`);
      expect(ficha).toContain(`<legend>${pergunta}</legend>`);
    }
    expect(ficha).toContain('<legend>Quem pode ver?</legend>');
  });
  it('P76: o exemplo do título cabe no celular', () => {
    expect(ficha).toContain('placeholder="Ex.: Natais na casa da vó"');
  });
  it('P77: o mês do capítulo tem o rótulo e o "Não sei" da data da memória', () => {
    const data = ler('src/components/CampoData.astro');
    for (const fonte of [ficha, data]) {
      expect(fonte).toMatch(/<span>Mês, se souber<\/span>/);
      expect(fonte).toMatch(/<option value="">Não sei<\/option>/);
    }
    expect(ficha).not.toMatch(/<option value="">Mês, se souber<\/option>/);
  });
  it('P78: "Sobre o capítulo" vem antes das memórias, e a lista mostra as que já estão no capítulo', () => {
    expect(editar.indexOf('<h2>Sobre o capítulo</h2>')).toBeLessThan(editar.indexOf('<h2>Memórias do capítulo</h2>'));
    const memorias = [
      { id: 'a', capitulos: [] as string[] },
      { id: 'b', capitulos: ['natais'] },
      { id: 'c', capitulos: ['outro'] },
      { id: 'd', capitulos: ['natais', 'outro'] },
    ];
    expect(ordemDeMarcar(memorias, 'natais').map((m) => m.id)).toEqual(['b', 'd', 'a', 'c']);
    // A lista vem inteira do servidor: é o script que recolhe as que não estão marcadas
    expect(editar).toMatch(/<label class="campo" data-busca-de-memoria hidden>/);
    expect(editar).toMatch(/linha\.hidden = !fica && !acha;/);
    expect(editar).toMatch(/const fica = caixa\(linha\)\.checked \|\| mexidas\.has\(linha\);/);
  });
  it('P78: a busca acha por pedaço do título ou da data, sem ligar para acento', () => {
    const linha = 'Férias em Guarapari janeiro de 1996';
    expect(achaNaBusca(linha, 'ferias')).toBe(true);
    expect(achaNaBusca(linha, 'GUARAPARI 1996')).toBe(true);
    expect(achaNaBusca(linha, 'guarapari 1997')).toBe(false);
    expect(achaNaBusca(linha, '   ')).toBe(false);
  });
  it('P79: na edição, a trilha de "Sobre o capítulo" vai para a coluna da esquerda', () => {
    expect(editar).toContain('<section class="painel painel--com-trilha">');
    const computador = formulario.slice(formulario.indexOf('@media (min-width: 62rem)'));
    expect(computador).toMatch(/\.pagina-de-formulario > \.painel--com-trilha \{\s*grid-column: 1 \/ -1;\s*grid-template-columns: subgrid;/);
    expect(computador).toMatch(/\.pagina-de-formulario > \.painel--com-trilha > \.formulario\.com-etapas \{\s*grid-column: 1 \/ -1;/);
  });
  it('P80: a confirmação diz "Nada é apagado de vez" uma vez só, e a ação tem um nome só', () => {
    const excluir = ler('src/pages/capitulos/[id]/excluir.astro');
    expect(excluir).toContain('<p slot="abertura">Confira antes de confirmar.</p>');
    expect(excluir.match(/<p[^>]*>[^<]*Nada é apagado de vez/g)).toHaveLength(1);
    expect(excluir).toMatch(/<button class="botao botao--perigo" type="submit">Excluir capítulo<\/button>/);
    expect(excluir).toContain('titulo="Excluir capítulo"');
  });
});

describe('a página do tema', () => {
  const tema = ler('src/pages/temas/[id].astro');
  it('P81: no computador, o nome e os capítulos à esquerda e as memórias à direita', () => {
    const computador = css.slice(css.indexOf('@media (min-width: 62rem)'), css.indexOf('@media (min-width: 62rem) and (hover: hover) and (pointer: fine)'));
    expect(computador).toMatch(/\.tema > \.tema__capa \{\s*grid-column: 1 \/ span 4;/);
    expect(computador).toMatch(/\.tema > \.tema__memorias \{\s*grid-column: 6 \/ -1;/);
    expect(tema.indexOf('class="tema__capitulos')).toBeLessThan(tema.indexOf('class="tema__memorias"'));
  });
  it('P82: tem a mesma "Forma de ver" da página da pessoa', () => {
    expect(tema).toMatch(/FORMAS_DA_PESSOA\.map\(\(f\) => \(\s*<a href=\{`\$\{enderecoDoTema\(f\)\}#memorias-do-tema`\} data-opcao=\{f\}/);
    expect(tema).toMatch(/import \{ ligarTroca \} from '\.\.\/\.\.\/lib\/cliente\/explorar-troca';\s*ligarTroca\(\);/);
    for (const peca of ['<Linha ', '<Mural ', '<Lista ']) expect(tema).toContain(peca);
  });
  it('P83: a linha de cada capítulo é igual à do sumário, com o período e a conta', () => {
    expect(tema).toMatch(/<Entrada href=\{`\/capitulos\/\$\{c\.id\}`\} titulo=\{c\.titulo\} selo=\{nomeDoModo\(c\)\} periodo=\{r\.periodo\} detalhe=\{contar\(r\.memorias\)\}/);
    expect(ler('src/pages/capitulos/index.astro')).toContain('resumosDosCapitulos(usuario, capitulos)');
    const natais = capitulo({ id: 'natais' });
    const dentro = capitulo({ id: 'na-vo', dentroDe: 'natais' });
    const memorias = [
      { ano: 1994, mes: 12, capitulos: ['na-vo'] },
      { ano: 2025, mes: 12, capitulos: ['natais'] },
      { ano: 2000, mes: 1, capitulos: [] },
    ];
    // O reunido conta as memórias dele e as dos capítulos de dentro
    expect(resumoDoCapitulo(natais, [natais, dentro], memorias)).toEqual({ periodo: 'dez de 1994 a dez de 2025', ordem: 199412, memorias: 2 });
    const epoca = capitulo({ id: 'anos-90', modo: 'epoca', inicio: { ano: 1990 }, fim: { ano: 1999 } } as Partial<Capitulo>);
    expect(resumoDoCapitulo(epoca, [epoca], memorias).memorias).toBe(1);
  });
});
