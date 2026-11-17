// Regras que nasceram dos defeitos do QA de design de 17/11/2026 (docs/qa/2026-11-17-perguntas.md).
import { describe, expect, it } from 'vitest';
import { ehNaoEncontradaSemPagina } from '../src/lib/servidor/http';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url), 'utf8');
/** O corpo da primeira regra do CSS com exatamente este seletor. */
const regra = (css: string, seletor: string) => {
  const inicio = css.indexOf(`\n${seletor} {`);
  expect(inicio, seletor).toBeGreaterThan(-1);
  return css.slice(inicio, css.indexOf('}', inicio));
};

describe('página não encontrada', () => {
  const resposta = (status: number, tipo: string | null) => ({ status, headers: { get: () => tipo } });
  it('existe, com o esqueleto do site e a volta ao início', () => {
    const pagina = ler('src/pages/404.astro');
    expect(pagina).toMatch(/layouts\/Visual\.astro/);
    expect(pagina).toMatch(/href="\/"/);
    expect(pagina).toMatch(/status = 404/);
  });
  it('toma o lugar do "não encontrada" em texto puro das páginas', () => {
    expect(ehNaoEncontradaSemPagina('/memorias/nao-existe', resposta(404, 'text/plain;charset=UTF-8'))).toBe(true);
    expect(ehNaoEncontradaSemPagina('/pessoas/x/editar', resposta(404, 'text/plain'))).toBe(true);
  });
  it('não mexe em rota de dados, foto, áudio ou retrato, nem em outra resposta', () => {
    for (const caminho of ['/api/memorias', '/fotos/a.jpg', '/audios/a.m4a', '/retratos/a.jpg']) {
      expect(ehNaoEncontradaSemPagina(caminho, resposta(404, 'text/plain'))).toBe(false);
    }
    expect(ehNaoEncontradaSemPagina('/memorias/x', resposta(200, 'text/plain'))).toBe(false);
    expect(ehNaoEncontradaSemPagina('/memorias/x', resposta(404, 'text/html'))).toBe(false);
    expect(ehNaoEncontradaSemPagina('/404', resposta(404, 'text/plain'))).toBe(false);
  });
});

describe('o topo no celular', () => {
  const css = ler('src/visual/estrutura.css');
  it('a marca e o retrato têm a largura mínima de toque', () => {
    expect(regra(css, '.topo__marca')).toMatch(/min-width: var\(--toque\)/);
    expect(regra(css, '.topo__conta')).toMatch(/min-width: var\(--toque\)/);
  });
  it('só a palavra "Menu" abre o menu, e não a barra inteira', () => {
    expect(regra(css, '.menu summary')).toMatch(/width: max-content/);
  });
  it('"Nova memória" continua sublinhada dentro do menu', () => {
    expect(regra(css, '.menu__lista .menu__acao')).toMatch(/text-decoration-line: underline/);
  });
});

describe('pular para o conteúdo', () => {
  it('é o primeiro link da página e leva ao conteúdo', () => {
    const esqueleto = ler('src/layouts/Visual.astro');
    expect(esqueleto).toMatch(/<body>\s*<a class="pular" href="#conteudo">/);
    expect(esqueleto).toMatch(/<main id="conteudo"/);
  });
});

describe('ação dentro de um bloco que tira o sublinhado dos links', () => {
  it('"E mais N", no Início, continua com cara de link', () => {
    expect(regra(ler('src/visual/telas/painel.css'), '.novidade--resto .acao')).toMatch(/text-decoration-line: underline/);
  });
});

describe('formulários em etapas', () => {
  it('Enter num campo avança a etapa em vez de enviar o formulário', async () => {
    const { enterAvanca } = await import('../src/lib/cliente/etapas');
    const tecla = (extra: object = {}) => ({ key: 'Enter', defaultPrevented: false, target: { tagName: 'INPUT', type: 'text' }, ...extra });
    expect(enterAvanca(tecla(), 0, 3)).toBe(true);
    expect(enterAvanca(tecla({ target: { tagName: 'INPUT', type: 'number' } }), 1, 3)).toBe(true);
    // Na última etapa o Enter envia, como em qualquer formulário
    expect(enterAvanca(tecla(), 2, 3)).toBe(false);
    // No relato, Enter é quebra de linha; num botão, é o toque no botão
    expect(enterAvanca(tecla({ target: { tagName: 'TEXTAREA' } }), 0, 3)).toBe(false);
    expect(enterAvanca(tecla({ target: { tagName: 'BUTTON', type: 'button' } }), 0, 3)).toBe(false);
    // A busca de pessoa já tratou a tecla (escolheu a sugestão)
    expect(enterAvanca(tecla({ defaultPrevented: true }), 0, 3)).toBe(false);
    expect(enterAvanca(tecla({ key: 'a' }), 0, 3)).toBe(false);
    expect(ler('src/lib/cliente/etapas.ts')).toMatch(/addEventListener\('keydown'/);
  });
  it('sem script, "Remover foto" some com os outros botões que dependem dele', () => {
    expect(ler('src/components/formularios/Pagina.astro')).toMatch(/<noscript>[\s\S]*\[data-remover\][\s\S]*display: none/);
  });
  it('sem script, o relato já escrito vem no campo, com o botão certo', () => {
    const relato = ler('src/pages/memorias/[id]/relato.astro');
    expect(relato).toMatch(/<textarea name="texto"[^>]*>\{opcoes\[0\]\.texto\}<\/textarea>/);
    expect(relato).toMatch(/opcoes\[0\]\.publicado \? 'Salvar alterações' : 'Publicar relato'/);
    expect(relato).toMatch(/data-salvar="rascunho" hidden=\{opcoes\[0\]\.publicado\}/);
  });
  it('o recado de rascunho salvo fica no alto da página', () => {
    expect(ler('src/pages/nova.astro')).toMatch(/\.pagina-de-formulario__abre'\)\?\.before\(recado\)/);
  });
  it('o resumo ao lado só fica parado em janela alta o bastante', () => {
    const css = ler('src/visual/telas/formulario.css');
    const consultas = [...css.matchAll(/@media ([^{]+)\{\s*\.pagina-de-formulario \.formulario\.com-etapas > \.ao-lado:not\(\[hidden\]\),/g)].map((m) => m[1]);
    expect(consultas.length).toBe(1);
    expect(consultas[0]).toMatch(/min-height/);
  });
  it('a lista de sugestões da busca de pessoa não entra na ordem do Tab', () => {
    expect(ler('src/lib/cliente/busca-pessoa.ts')).toMatch(/sugestoes\.tabIndex = -1/);
  });
});

describe('capítulos, árvore e pessoas', () => {
  it('na página de outra pessoa, o nome do laço do coração entra em minúscula, como na árvore', () => {
    const pagina = ler('src/pages/pessoas/[id]/index.astro');
    expect(pagina).toMatch(/: minuscula\(l\.nome\),/);
    expect(pagina).toMatch(/chama de \$\{minuscula\(l\.nome\)\}/);
  });
  it('sem script, a árvore mostra o aviso no lugar do mapa vazio', () => {
    expect(ler('src/pages/arvore.astro')).toMatch(/<noscript>[\s\S]*\[data-mapa\][^}]*display: none[\s\S]*<\/noscript>/);
  });
  it('a capa do capítulo mais alta que a janela não fica parada', () => {
    expect(ler('src/visual/telas/capitulo.css')).toMatch(/\.capitulo__parado--solta \{\s*position: static;/);
    expect(ler('src/pages/capitulos/[id]/index.astro')).toMatch(/capitulo__parado--solta', capa\.offsetHeight > window\.innerHeight/);
  });
  it('o capítulo vazio manda usar o botão com o nome que ele tem para quem está vendo', () => {
    const pagina = ler('src/pages/capitulos/[id]/index.astro');
    expect(pagina).toMatch(/Use "\$\{podeEditar \? 'Escolher memórias e editar' : 'Escolher memórias'\}"/);
  });
});

describe('pessoa, laços e administração', () => {
  it('abrir um laço com outro aberto acima não joga a página para longe', () => {
    expect(ler('src/pages/pessoas/[id]/editar.astro')).toMatch(/const salto = edicao\.getBoundingClientRect\(\)\.top - antes;\s*if \(salto\) window\.scrollBy/);
  });
  it('link no meio da frase do guiado e das dicas tem a altura de toque', () => {
    const css = ler('src/visual/telas/formulario.css');
    expect(regra(css, '.pagina-de-formulario :is(.guia__completo, .dica) a')).toMatch(/line-height: var\(--toque\)/);
    expect(regra(css, '.pagina-de-formulario .escolhas > li')).toMatch(/display: grid/);
  });
  it('a marca de quem usa a cor não é cortada', () => {
    expect(regra(ler('src/visual/telas/tipos.css'), '.pagina-de-formulario .amostra__uso')).not.toMatch(/nowrap|ellipsis/);
  });
});

describe('Explorar', () => {
  const linha = ler('src/visual/telas/linha.css');
  it('o título do capítulo e o da época na linha do tempo têm 44 px de toque', () => {
    expect(regra(linha, ':is(.marca__titulo, .epoca__titulo)::after')).toMatch(/height: var\(--toque\)/);
  });
  it('sem memória nenhuma, a cobertura da faixa parada não acende', () => {
    expect(regra(linha, 'html.pino-novo [data-sem-memorias] > .parada::before')).toMatch(/content: none/);
    expect(ler('src/components/explorar/Linha.astro')).toMatch(/data-sem-memorias=\{anos\.length === 0/);
  });
  it('no modo TV, as fotos de volta da direita não passam de 30% para fora, para não cobrir o texto', () => {
    const css = ler('src/visual/telas/explorar.css');
    const saidas = [...css.matchAll(/\.palco__extra\[data-n='[24]'\] \{[^}]*right: -(\d+)%/g)].map((m) => Number(m[1]));
    expect(saidas.length).toBeGreaterThanOrEqual(2);
    for (const saida of saidas.slice(-2)) expect(saida).toBeLessThanOrEqual(30);
  });
});
