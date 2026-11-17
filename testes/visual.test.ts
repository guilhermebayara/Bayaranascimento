// O visual novo (docs/visual.md): as funções puras das telas do conceito e as regras do CSS novo.
import { describe, expect, it } from 'vitest';
import {
  CORES,
  GIROS,
  carimboDaData,
  corDoTipo,
  diaMesCurto,
  estiloDoTipo,
  formaDoId,
  giroDoId,
  legendaLugarAno,
  listaCurta,
  trechoDoRelato,
} from '../src/lib/visual';

describe('foto revelada', () => {
  it('a inclinação sai do id e é sempre a mesma, entre poucos valores', () => {
    expect(giroDoId('2025-natal')).toBe(giroDoId('2025-natal'));
    for (const id of ['2025-natal', '1994-festa-de-aniversario', 'a', 'b', 'c', 'd', 'e', 'f']) expect(GIROS).toContain(giroDoId(id));
    expect(new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map(giroDoId)).size).toBeGreaterThan(1);
  });

  it('a forma de cor atrás da foto também sai do id: círculo, arco ou cápsula', () => {
    expect(formaDoId('2025-natal')).toBe(formaDoId('2025-natal'));
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) expect([0, 1, 2]).toContain(formaDoId(id));
  });

  it('a legenda diz lugar e ano; sem lugar, só o ano', () => {
    expect(legendaLugarAno('Belo Horizonte', 2025)).toBe('Belo Horizonte (2025)');
    expect(legendaLugarAno(null, 1994)).toBe('1994');
    expect(legendaLugarAno('  ', 1994)).toBe('1994');
  });
});

describe('carimbo', () => {
  it('escreve a data com o que se sabe dela', () => {
    expect(carimboDaData({ ano: 2025, mes: 12, dia: 24, aproximada: false })).toBe('24 dez 2025');
    expect(carimboDaData({ ano: 2025, mes: 12, dia: null, aproximada: false })).toBe('dez 2025');
    expect(carimboDaData({ ano: 1992, mes: null, dia: null, aproximada: false })).toBe('1992');
    expect(carimboDaData({ ano: 1994, mes: null, dia: null, aproximada: true })).toBe('por volta de 1994');
    expect(diaMesCurto({ mes: 3, dia: 12 })).toBe('12 mar');
    expect(diaMesCurto({ mes: null, dia: null })).toBe('');
  });
});

describe('ficha em uma linha', () => {
  it('a lista de nomes cabe numa linha', () => {
    expect(listaCurta([])).toBe('');
    expect(listaCurta(['Gui'])).toBe('Gui');
    expect(listaCurta(['Gui', 'Giovanna'])).toBe('Gui e Giovanna');
    expect(listaCurta(['Gui', 'Giovanna', 'Elizete'])).toBe('Gui, Giovanna e Elizete');
    expect(listaCurta(['Gui', 'Giovanna', 'Elizete', 'Aguilar', 'Chico'])).toBe('Gui, Giovanna, Elizete e mais 2');
  });

  it('o trecho do relato fecha numa frase inteira', () => {
    expect(trechoDoRelato('Eu só lembro dos balões.')).toBe('Eu só lembro dos balões.');
    expect(trechoDoRelato('Primeira parte.\n\nSegunda parte.')).toBe('Primeira parte.');
    const longo = `${'Uma frase de tamanho médio para o teste. '.repeat(8)}`;
    const trecho = trechoDoRelato(longo, 100);
    expect(trecho.length).toBeLessThanOrEqual(100);
    expect(trecho.endsWith('.')).toBe(true);
  });
});

// A assinatura do nome, a cor da tela e as fontes viraram sistema na fase 2: os testes delas estão
// em testes/sistema.test.ts.

describe('cor do tipo de momento', () => {
  it('cada tipo de hoje tem a sua cor, sem repetir, e tipo novo ganha uma pelo id', () => {
    const deHoje = ['nascimento', 'aniversario', 'casamento', 'conquista', 'viagem', 'casa', 'festa', 'causo', 'cotidiano', 'despedida', 'outro'];
    expect(new Set(deHoje.map(corDoTipo)).size).toBe(deHoje.length);
    expect(corDoTipo('casamento')).toBe('roxo');
    expect(corDoTipo('aniversario')).toBe('rosa');
    expect(CORES).toContain(corDoTipo('tipo-criado-depois'));
    expect(corDoTipo('tipo-criado-depois')).toBe(corDoTipo('tipo-criado-depois'));
  });

  it('o estilo leva os quatro tons da cor: pastel, meio, vivo e tinta', () => {
    expect(estiloDoTipo('viagem')).toBe('--tipo-pastel: var(--azul-pastel); --tipo-meio: var(--azul-meio); --tipo-cor: var(--azul-vivo); --tipo-tinta: var(--azul-tinta)');
  });
});

// O CSS novo é lido do disco, como em tokens.test.ts
const fs = 'node:fs';
const { readFileSync, readdirSync } = (await import(/* @vite-ignore */ fs)) as {
  readFileSync: (caminho: URL, codificacao: string) => string;
  readdirSync: (caminho: URL) => string[];
};
const pasta = new URL('../src/visual/', import.meta.url);
const ler = (nome: string) => readFileSync(new URL(nome, pasta), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const arquivos = [...readdirSync(pasta).filter((a) => a.endsWith('.css')), ...readdirSync(new URL('telas/', pasta)).map((a) => `telas/${a}`)];

describe('CSS do visual novo', () => {
  it('foi lido', () => {
    expect(arquivos).toContain('tokens.css');
    expect(arquivos.length).toBeGreaterThan(5);
  });

  it('cor só nos tokens: nenhuma cor escrita solta nos outros arquivos', () => {
    for (const arquivo of arquivos.filter((a) => a !== 'tokens.css')) {
      const cores = ler(arquivo).match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g) ?? [];
      expect(cores, arquivo).toEqual([]);
    }
  });

  it('fonte só em fontes.css: o resto usa --serifa, --grotesca, --mono e --mao', () => {
    for (const arquivo of arquivos.filter((a) => a !== 'fontes.css')) {
      const css = ler(arquivo);
      const familias = [...css.matchAll(/font-family\s*:\s*([^;]+);/g)].map((m) => m[1]!.trim()).filter((v) => !v.startsWith('var(') && v !== 'inherit');
      expect(familias, arquivo).toEqual([]);
      // A abreviação "font:" também precisa terminar numa das quatro famílias
      for (const m of css.matchAll(/[\s;{]font\s*:\s*([^;]+);/g)) expect(m[1], arquivo).toMatch(/var\(--(serifa|grotesca|mono|mao)\)$|^inherit$/);
    }
  });

  it('nada do CSS antigo entra no novo', () => {
    for (const arquivo of arquivos) expect(ler(arquivo), arquivo).not.toMatch(/global\.css|--cor-|--tamanho-|--espaco-|--nucleo-/);
  });

  it('a área de toque mínima continua em 44 px', () => {
    expect(ler('tokens.css')).toMatch(/--toque:\s*2\.75rem;/);
  });

  it('nada fica preso à rolagem no toque além do combinado', () => {
    // Ficam parados no alto, em qualquer aparelho, a barra de décadas (já era assim) e o ano da
    // linha do tempo (decisão do Gui, 16/11/2026, pensando nos mais velhos). Todo outro sticky
    // precisa estar dentro de (hover: hover) and (pointer: fine), e fixed não entra.
    for (const arquivo of arquivos) {
      const css = ler(arquivo);
      expect(css, arquivo).not.toMatch(/position\s*:\s*fixed/);
      const presos = [...css.matchAll(/position\s*:\s*sticky/g)].map((m) => m.index!);
      for (const posicao of presos) {
        const antes = css.slice(0, posicao);
        const regra = antes.slice(antes.lastIndexOf('}') + 1);
        const midia = antes.slice(antes.lastIndexOf('@media'));
        const comCursor = /\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/.test(midia.slice(0, midia.indexOf('{')));
        // dentro da media, o bloco ainda não fechou: mais aberturas do que fechamentos
        const dentroDaMidia = (midia.match(/\{/g) ?? []).length > (midia.match(/\}/g) ?? []).length;
        const combinado = regra.includes('.parada') || regra.includes('.ano__cabeca');
        expect(combinado || (comCursor && dentroDaMidia), `${arquivo}: ${regra.trim().slice(0, 60)}`).toBe(true);
      }
    }
  });
});

describe('conceito', () => {
  const paginas = import.meta.glob<string>('../src/pages/conceito/**/*.{astro,ts}', { query: '?raw', import: 'default', eager: true });

  // As telas que já passaram para o visual novo (fase 3), com os componentes de cada uma
  const telas = import.meta.glob<string>(['../src/pages/explorar.astro', '../src/pages/memorias/[[]id].astro', '../src/pages/conta.astro', '../src/components/explorar/*.astro'], {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  const tela = (fim: string) => Object.entries(telas).find(([caminho]) => caminho.endsWith(fim))![1];

  it('toda rota do conceito responde 404 onde não há acervo de exemplo', () => {
    const rotas = Object.entries(paginas);
    expect(rotas.length).toBeGreaterThanOrEqual(4);
    for (const [caminho, fonte] of rotas) expect(fonte, caminho).toMatch(/if \(!conceitoDisponivel\(\)[^\n]*return naoEncontrado\(\);/);
  });

  it('o Explorar deixa filtrar por qualquer família, sem mudar quem vê o quê', () => {
    // Decisão do Gui, 16/11/2026. Tudo sai de listarMemorias, que só devolve o que a pessoa pode ver:
    // a página não busca memória por outro caminho nem confere a família de quem olha.
    const pagina = tela('pages/explorar.astro');
    expect(pagina).toContain('listarMemorias(usuario)');
    expect(pagina).toMatch(/explorar\(todas, filtros, await contextoDoExplorar\(usuario, todas\)\)/);
    expect(pagina).not.toMatch(/usuario\.nucleos\.includes|obterMemoria/);
    // O mural, o modo TV e o sorteio usam o mesmo resultado, sem os rascunhos
    expect(pagina).toMatch(/const publicadas = resultado\.memorias\.filter/);
    expect(pagina).toMatch(/sortear\(publicadas,/);
  });

  it('memória sem foto ganha o cartão com o ícone do tipo, na linha do tempo e no painel', () => {
    // Pedido do Gui, 16/11/2026: nenhuma memória fica com um buraco onde as outras têm foto
    const componentes = import.meta.glob<string>('../src/components/visual/Polaroid.astro', { query: '?raw', import: 'default', eager: true });
    const foto = Object.values(componentes)[0]!;
    expect(foto).toContain('polaroid--sem-foto');
    expect(foto).toContain('<IconeDoTipo tipo={tipo} />');
    const pagina = (fim: string) => Object.entries(paginas).find(([caminho]) => caminho.endsWith(fim))![1];
    for (const forma of ['explorar/Linha.astro', 'explorar/Mural.astro']) expect(tela(forma)).toMatch(/<Polaroid id=\{m\.id\}[^>]*tipo=\{m\.tipo\}/);
    expect(tela('explorar/Linha.astro')).not.toContain('entrada--so-texto');
    expect(pagina('conceito/index.astro')).toMatch(/outro-ano__foto">\s*<Polaroid[^>]*tipo=\{m\.tipo\}/);
  });

  it('o topo leva à conta pelo retrato de quem está logado, e "Rascunhos" não está no menu', () => {
    // Decisão do Gui, 16/11/2026 ("Sua conta", em docs/decisoes.md)
    const topo = Object.values(import.meta.glob<string>('../src/layouts/Visual.astro', { query: '?raw', import: 'default', eager: true }))[0]!;
    expect(topo).toMatch(/<a class="topo__conta" href="\/conta"/);
    expect(topo.slice(topo.indexOf('const menu = ['), topo.indexOf('const telas = ['))).not.toContain('rascunhos');
    // A administração e a lixeira saem do rodapé: passam a morar na conta
    expect(topo.slice(topo.indexOf('<footer'))).not.toMatch(/lixeira|admin\/tipos|api\/copia/);
  });

  it('o menu declara "Início", no computador e no celular', () => {
    // Pedido do Gui, 16/11/2026: "Memórias" leva ao início, mas quem tem menos familiaridade não precisa adivinhar
    const topo = Object.values(import.meta.glob<string>('../src/layouts/Visual.astro', { query: '?raw', import: 'default', eager: true }))[0]!;
    const menu = topo.slice(topo.indexOf('const menu = ['), topo.indexOf('const telas = ['));
    expect(menu).toMatch(/\{ href: '\/', texto: 'Início'/);
    // "Tudo" virou "Explorar" (decisão do Gui, 16/11/2026), e o menu já não aponta para o conceito
    expect(menu).toMatch(/\{ href: '\/explorar', texto: 'Explorar'/);
    expect(menu).not.toContain('/conceito');
    // As duas navegações, a do topo e a da sanfona do celular, saem da mesma lista
    expect(topo.match(/menu\.map\(/g)).toHaveLength(2);
  });

  it('a aba da época e o chão não deixam vão: a linha da aba não tem margem', () => {
    // Achado do Gui, 16/11/2026: com margem, o chão e os trilhos paravam entre uma aba e a seguinte
    const css = ler('telas/linha.css');
    for (const regra of css.matchAll(/\.epoca(?:--abre|--fecha)?(?::has\([^)]*\))?\s*\{([^}]*)\}/g)) expect(regra[1], regra[0].slice(0, 40)).not.toMatch(/margin/);
  });

  it('o destaque do capítulo ao passar o mouse só existe onde há mouse', () => {
    const css = ler('telas/linha.css');
    const comMouse = css.slice(css.indexOf('@media (hover: hover) and (pointer: fine)'));
    expect(comMouse).toContain('.trilho[data-vivo]');
    expect(css.slice(0, css.indexOf('@media (hover: hover) and (pointer: fine)'))).not.toContain('[data-vivo]');
  });

  it('os controles do Explorar têm nome e lugar fixo: forma de ver, família, filtros e década', () => {
    // Achado do Gui, 16/11/2026: a década passava batida, o filtro mudava de lugar ao abrir e as
    // famílias quebravam a linha
    const controles = tela('explorar/Controles.astro');
    const css = ler('telas/linha.css');
    for (const nome of ['Forma de ver', 'Família', 'Filtros']) expect(controles).toMatch(new RegExp(`rotulo[^>]*>\\s*${nome}\\s*<`));
    expect(tela('explorar/Linha.astro')).toMatch(/rotulo[^>]*>\s*Década\s*</);
    // "Tudo" passou a se chamar "Família completa" (do Gui, 16/11/2026)
    expect(controles).toMatch(/aria-current=\{filtros\.familias\.length === 0 \? 'page' : undefined\}>\s*Família completa\s*</);
    // O formulário abre dentro do próprio controle: nenhuma regra muda o lugar dele quando abre
    expect(css).not.toMatch(/\.filtros\[open\]\s*\{[^}]*grid-(column|row|area)/);
    // A faixa de décadas leva a cor da família, diluída no papel: o pastel cheio pesou
    expect(css).toMatch(/\.decadas\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--pastel\) \d+%, var\(--papel\)\)/);
    // Fechado, o controle dos filtros diz o que está ligado e a ordem
    expect(controles).toContain('data-filtro-atual');
    // Os filtros e a ordem são um formulário comum e as outras escolhas são links: tudo funciona
    // sem script e fica no endereço
    expect(controles).toMatch(/<form class="filtros__form" method="get" action="\/explorar"/);
    expect(controles).not.toMatch(/<button type="button"/);
  });

  it('os trilhos, as épocas e a faixa de décadas só aparecem quando a regra do Explorar deixa', () => {
    // docs/decisoes.md, "Explorar": fora disso, o capítulo vem escrito em cada memória
    const linha = tela('explorar/Linha.astro');
    expect(linha).toMatch(/data-filtrando=\{trilhos \? undefined : ''\}/);
    expect(linha).toMatch(/trilhos && decadas\.length > 1 &&/);
    expect(tela('pages/explorar.astro')).toMatch(/trilhos=\{resultado\.trilhos\}/);
    // Em "Mais antigas primeiro", o trilho acaba, embaixo, no fim do capítulo, e não no começo
    expect(linha).toMatch(/pontaDeBaixo = paraOPresente \? 'Fim' : 'Começo'/);
  });

  it('o modo TV passa as memórias por links, e só passa sozinho quando a pessoa liga', () => {
    // docs/decisoes.md, "Explorar". Sem script, "Anterior" e "Próxima" continuam funcionando
    const palco = tela('explorar/Palco.astro');
    for (const nome of ['Anterior', 'Próxima', 'Passar sozinho', 'Sair do modo TV', 'Me mostre outra']) expect(palco).toContain(nome);
    expect(palco).toMatch(/<a class="botao" href=\{depois\}[^>]*rel="next"/);
    expect(palco).toMatch(/if \(palco\.hasAttribute\('data-passar'\)\)/);
    // Com movimento reduzido, a troca é sem animação
    const css = ler('telas/explorar.css');
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\s*@view-transition/);
    expect(css.replace(/@media \(prefers-reduced-motion: no-preference\) \{\s*@view-transition[^}]*\}\s*\}/, '')).not.toContain('@view-transition');
  });

  it('no toque, o que fica parado no alto não usa sticky: anda por animação ligada à rolagem', () => {
    // Achado do Gui no iPhone, 16/11/2026: com a faixa de décadas presa por sticky, o Safari (iOS 26)
    // desenhava uma banda atrás do relógio. A saída é a do site da @bsurda ("pino-novo").
    const topo = Object.values(import.meta.glob<string>('../src/layouts/Visual.astro', { query: '?raw', import: 'default', eager: true }))[0]!;
    expect(topo).toMatch(/\(hover: none\) and \(pointer: coarse\)[\s\S]*animation-timeline: view\(\)[\s\S]*classList\.add\('pino-novo'\)/);
    const css = ler('telas/linha.css');
    for (const peca of ['.parada', '.ano > .ano__cabeca']) {
      const regra = css.match(new RegExp(`html\\.pino-novo ${peca.replace(/[.>]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
      expect(regra?.[1], peca).toMatch(/position:\s*relative/);
    }
    // A linha do tempo da animação fica numa regra à parte da animação, depois dela: juntas, o
    // compactador funde as duas e o navegador descarta a declaração
    for (const regra of css.matchAll(/\{([^}]*)\}/g)) {
      if (/animation-timeline/.test(regra[1]!)) expect(regra[1]).not.toMatch(/animation:\s/);
    }
    // E a regra de movimento reduzido não desliga o que está parado por animação
    expect(ler('base.css')).toMatch(/:not\(\[data-preso\]\)[\s\S]*animation: none !important/);
    // Só uma peça anda com a rolagem: a que leva a faixa de décadas e a gaveta do ano. Uma animação
    // por ano fazia a faixa e o ano darem um pulinho na troca de ano, no iPhone.
    const pagina = tela('explorar/Linha.astro');
    expect(pagina.match(/ data-preso/g)?.length).toBe(1);
    expect(pagina).toMatch(/<div class="parada" data-barra data-preso>/);
    expect(css.match(/animation:\s*[a-z-]+ linear both/g)?.length).toBe(2);
    expect(css).not.toContain('data-perto');
  });

  it('cada foto da memória abre a galeria, e sem script continua levando à imagem', () => {
    // Pedido do Gui, 16/11/2026: tocar na foto abria a imagem solta, fora da página
    const pagina = tela('memorias/[id].astro');
    expect(pagina).toContain('<dialog class="galeria"');
    for (const link of pagina.matchAll(/<a class="monte"[^>]*>/g)) expect(link[0]).toMatch(/href=\{`\/fotos\/\$\{foto\.chave\}`\} data-galeria=\{n\}/);
    // O voltar do aparelho fecha a galeria em vez de sair da página
    expect(pagina).toMatch(/history\.pushState[\s\S]*popstate/);
    // Passar de foto é a rolagem do próprio aparelho, com encaixe: a foto acompanha o dedo (pedido do
    // Gui, 16/11/2026: o padrão que quem não é nativo digital associa a passar fotos)
    const css = ler('telas/memoria.css');
    expect(css).toMatch(/\.galeria__fila\s*\{[^}]*overflow-x:\s*auto[^}]*scroll-snap-type:\s*x mandatory/);
    expect(css).toMatch(/\.galeria__quadro\s*\{[^}]*scroll-snap-stop:\s*always/);
    expect(pagina).not.toMatch(/touchstart|touchmove|touchend/);
    // Os controles têm nome escrito
    for (const nome of ['Fechar', 'Anterior', 'Próxima']) expect(pagina).toContain(nome);
  });

  it('as telas novas não levam o CSS antigo', () => {
    const fontes = import.meta.glob<string>(['../src/layouts/Visual.astro', '../src/components/visual/*.astro', '../src/pages/conceito/**/*.astro', '../src/visual/*.ts'], {
      query: '?raw',
      import: 'default',
      eager: true,
    });
    for (const [caminho, fonte] of [...Object.entries(fontes), ...Object.entries(telas)]) expect(fonte, caminho).not.toMatch(/^import[^;\n]*(styles\/global\.css|layouts\/Base\.astro)/m);
    // E nenhuma tela de verdade leva dado fixo de exemplo nem depende do conceito
    for (const [caminho, fonte] of Object.entries(telas)) expect(fonte, caminho).not.toMatch(/FIXO|servidor\/conceito/);
  });
});
