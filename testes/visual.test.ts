// O visual novo (docs/visual.md): as funções puras das telas do conceito e as regras do CSS novo.
import { readFileSync } from 'node:fs';
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
  nomeDaDecada,
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
    // A década, no cartão do mural: como se fala
    expect(nomeDaDecada(1990)).toEqual({ rotulo: 'Anos', numero: '90' });
    expect(nomeDaDecada(1900)).toEqual({ rotulo: 'Anos', numero: '00' });
    expect(nomeDaDecada(2010)).toEqual({ rotulo: 'Anos', numero: '2010' });
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
  const telas = import.meta.glob<string>(['../src/pages/explorar.astro', '../src/pages/memorias/[[]id].astro', '../src/pages/index.astro', '../src/pages/carta.astro', '../src/pages/conta.astro', '../src/pages/pessoas/[[]id]/index.astro', '../src/pages/capitulos/index.astro', '../src/pages/capitulos/[[]id]/index.astro', '../src/pages/temas/[[]id].astro', '../src/pages/pessoas/index.astro', '../src/pages/arvore.astro', '../src/pages/nova.astro', '../src/pages/memorias/[[]id]/relato.astro', '../src/pages/capitulos/novo.astro', '../src/pages/capitulos/[[]id]/editar.astro', '../src/pages/pessoas/nova.astro', '../src/pages/pessoas/[[]id]/editar.astro', '../src/pages/memorias/[[]id]/historico.astro', '../src/pages/memorias/[[]id]/excluir.astro', '../src/pages/capitulos/[[]id]/excluir.astro', '../src/pages/lixeira.astro', '../src/pages/admin/*.astro', '../src/components/FichaDoIntegrante.astro', '../src/components/CampoRetrato.astro', '../src/components/ConfirmarRemocao.astro', '../src/components/ComoSeReferir.astro', '../src/components/formularios/*.astro', '../src/components/FichaDoCapitulo.astro', '../src/components/capitulos/*.astro', '../src/components/Carta.astro', '../src/components/explorar/*.astro'], {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  const tela = (fim: string) => Object.entries(telas).find(([caminho]) => caminho.endsWith(fim))![1];

  it('toda rota do conceito responde 404 onde não há acervo de exemplo', () => {
    const rotas = Object.entries(paginas);
    // Do conceito ficou a página das fontes, com a rota que troca a combinação, até a escolha
    expect(rotas.length).toBeGreaterThanOrEqual(2);
    for (const [caminho, fonte] of rotas) expect(fonte, caminho).toMatch(/if \(!conceitoDisponivel\(\)[^\n]*return naoEncontrado\(\);/);
  });

  it('o Explorar deixa filtrar por qualquer família, sem mudar quem vê o quê', () => {
    // Decisão do Gui, 16/11/2026. Tudo sai de listarMemorias, que só devolve o que a pessoa pode ver:
    // a página não busca memória por outro caminho nem confere a família de quem olha.
    const pagina = tela('pages/explorar.astro');
    // O rascunho de quem escreveu entra na linha do tempo e na lista (QA de 18/11/2026)
    expect(pagina).toContain('listarMemorias(usuario, { comRascunhos: true })');
    expect(pagina).toMatch(/const contexto = await contextoDoExplorar\(usuario, todas\);\s*const resultado = explorar\(todas, filtros, contexto\);/);
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
    expect(foto).toContain('<IconeDoTipo tipo={tipo} rabisco={rabisco} />');
    for (const forma of ['explorar/Linha.astro', 'explorar/Mural.astro']) expect(tela(forma)).toMatch(/<Polaroid id=\{m\.id\}[^>]*tipo=\{m\.tipo\}/);
    expect(tela('explorar/Linha.astro')).not.toContain('entrada--so-texto');
    expect(tela('pages/index.astro')).toMatch(/outro-ano__foto">\s*<Polaroid[^>]*tipo=\{m\.tipo\}/);
  });

  it('o topo leva à conta pelo retrato de quem está logado, e "Rascunhos" não está no menu', () => {
    // Decisão do Gui, 16/11/2026 ("Sua conta", em docs/decisoes.md)
    const topo = Object.values(import.meta.glob<string>('../src/layouts/Visual.astro', { query: '?raw', import: 'default', eager: true }))[0]!;
    // O retrato abre o menu da conta, que leva a "Sua conta" (decisão do Gui, 17/11/2026)
    expect(topo.slice(topo.indexOf('<details class="conta-menu">'))).toMatch(/<a href="\/conta"[^>]*>\s*Sua conta/);
    expect(topo.slice(topo.indexOf('const menu = ['), topo.indexOf('const telas = ['))).not.toContain('rascunhos');
    // A administração e a lixeira saem do rodapé: passam a morar na conta
    expect(topo.slice(topo.indexOf('<footer'))).not.toMatch(/lixeira|admin\/tipos|api\/copia/);
  });

  it('o painel é só de quem olha: lê as regras de src/lib/painel.ts e só memória publicada', () => {
    // docs/decisoes.md, "Início (painel pessoal)". A tela não refaz as regras.
    const painel = tela('pages/index.astro');
    for (const regra of ['chegarAoPainel', 'novidades', 'aniversarios', 'memoriaParaContar', 'emOutrosAnos']) expect(painel).toContain(`${regra}(`);
    expect(painel).toContain('listarMemorias(usuario, { comRascunhos: true })');
    expect(painel).toMatch(/const memorias = comRascunhos\.filter\(\(m\) => m\.situacao === 'publicada'\)/);
    expect(painel).toMatch(/<Visual titulo="Início" secao="painel" familia=\{corDoPainel\} intimo>/);
    // O dia trocado pelo endereço só vale fora da produção
    expect(painel).toMatch(/const m = semLogin\(\) \? /);
    // A carta no alto e a de /carta são a mesma peça, com o texto do banco
    expect(painel).toContain('<Carta para=');
    expect(tela('pages/carta.astro')).toContain('<Carta para=');
    expect(tela('components/Carta.astro')).toContain('saudacao(para)');
  });

  it('a conta é montada por montarConta, e para quem administra só tem o atalho para a Administração', () => {
    const conta = tela('pages/conta.astro');
    expect(conta).toContain('await montarConta(usuario)');
    expect(conta).toContain('const admin = conta.administra;');
    expect(conta).toMatch(/\{admin && \(\s*<span class="conta__administra">\s*<a class="acao" href=\{ENDERECO_DA_ADMINISTRACAO\}>/);
    expect(conta).not.toContain('conta__admin"');
    expect(conta).not.toMatch(/usuario\.admin/);
    expect(conta).toMatch(/<Visual titulo="Sua conta" secao="conta" familia=\{cor\} intimo>/);
  });

  it('a página da pessoa só mostra retrato de quem a pessoa vê', () => {
    const pessoa = tela('pessoas/[id]/index.astro') + readFileSync('src/lib/servidor/pagina-da-pessoa.ts', 'utf-8');
    expect(pessoa).toMatch(/retratoDe = \(id: string\) => \(achar\(id\)\?\.retrato && !naoVe\.has\(id\)/);
    expect(pessoa).toContain('listarMemorias(usuario, { integrante: pessoa.id, comRascunhos: true })');
  });

  it('o menu declara "Início", no computador e no celular', () => {
    // Pedido do Gui, 16/11/2026: "Memórias" leva ao início, mas quem tem menos familiaridade não precisa adivinhar
    const topo = Object.values(import.meta.glob<string>('../src/layouts/Visual.astro', { query: '?raw', import: 'default', eager: true }))[0]!;
    const menu = topo.slice(topo.indexOf('const menu = ['), topo.indexOf('const telas = ['));
    expect(menu).toMatch(/\{ href: '\/', texto: 'Início'/);
    // "Tudo" virou "Explorar" (decisão do Gui, 16/11/2026), e o menu já não aponta para o conceito
    expect(menu).toMatch(/\{ href: '\/explorar', texto: 'Explorar'/);
    expect(menu).not.toContain('/conceito');
    // As três navegações, a do topo, a da sanfona do celular e a do rodapé (resposta do Gui à P3 do QA de design, 17/11/2026), saem da mesma lista
    expect(topo.match(/menu\.map\(/g)).toHaveLength(3);
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
    for (const nome of ['Forma de ver', 'Famílias']) expect(controles).toMatch(new RegExp(`class="so-leitor"[^>]*>\\s*${nome}\\s*<`));
    expect(controles).toMatch(/<span>Filtros<\/span>/);
    expect(controles).toMatch(/<span class="rotulo suave" id="controle-ordem">Ordem<\/span>/);
    expect(tela('explorar/Linha.astro')).toMatch(/rotulo[^>]*>\s*Ir para a década\s*</);
    // "Tudo" passou a se chamar "Família completa" (do Gui, 16/11/2026)
    // O texto fica dentro da peça que reserva a largura do negrito (P37, resposta do Gui de 17/11/2026)
    expect(controles).toMatch(/aria-current=\{filtros\.familias\.length === 0 \? 'page' : undefined\}>\s*<span[^>]*>Família completa<\/span>\s*</);
    // A faixa de décadas leva a cor da família, diluída no papel: o pastel cheio pesou
    expect(css).toMatch(/\.decadas\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--pastel\) \d+%, var\(--papel\)\)/);
    // Os filtros são um formulário comum e as outras escolhas, a ordem inclusive, são links: tudo
    // funciona sem script e fica no endereço
    expect(controles).toMatch(/<form class="filtros__cartao" method="get" action="\/explorar"/);
    expect(controles).toMatch(/<a href=\{para\(\{ \.\.\.filtros, ordem: o \}\)\}/);
    expect(controles).not.toMatch(/<select/);
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

  it('o mural é uma superfície só: a década é um cartão entre as fotos e o ano, uma aba na primeira foto', () => {
    // Decisões do Gui, 17/11/2026 (segunda rodada): com o ano como cabeçalho, o mural tinha virado
    // uma segunda linha do tempo. Fora da ordem do tempo, saem os cartões e as abas.
    const mural = tela('explorar/Mural.astro');
    expect(mural).toMatch(/const peloTempo = ordem === 'recentes' \|\| ordem === 'antigas';/);
    expect(mural.match(/<ul class="mural miolo"/g)).toHaveLength(1);
    expect(mural).not.toMatch(/<h2|<section|<header/);
    expect(mural).toMatch(/abreAno: peloTempo && anterior\?\.ano !== m\.ano/);
    expect(mural).toMatch(/abreDecada: peloTempo && /);
    expect(mural).toMatch(/\{abreDecada !== null && \(\s*<li class="mural__decada"/);
    expect(mural).toMatch(/\{abreAno && \(\s*<span class="mural__aba"/);
    // Na margem, só o título da memória, à mão
    expect(mural).toMatch(/<Polaroid id=\{m\.id\}[^>]*legenda=\{m\.titulo\}/);
    const css = ler('telas/explorar.css');
    expect(css).toMatch(/\.mural \.polaroid \.polaroid__legenda\s*\{[^}]*font-family:\s*var\(--mao\)[^}]*text-transform:\s*none/);
    // Nada preso novo
    expect(css).not.toMatch(/position\s*:\s*(sticky|fixed)/);
  });

  it('no mural, o verso abre em leque por trás da foto, só com o mouse ou com o foco, e a foto não vira', () => {
    // Decisões do Gui, 17/11/2026: como duas fotos seguradas pelo canto de baixo, sem carimbo. É um
    // agrado: no canto que aparece vai só a data
    const mural = tela('explorar/Mural.astro');
    expect(mural).toContain('<span class="mural__verso">');
    expect(mural).not.toContain('Carimbo');
    const css = ler('telas/explorar.css');
    expect(css).toMatch(/\.mural__verso\s*\{[^}]*inset:\s*0;[^}]*opacity:\s*0;[^}]*transform-origin:\s*\d+% 100%;[^}]*pointer-events:\s*none/);
    const comMouse = css.slice(css.indexOf('@media (hover: hover) and (pointer: fine)'));
    expect(comMouse).toMatch(/\.mural a:hover \.mural__verso\s*\{[^}]*opacity:\s*1;[^}]*rotate:\s*var\(--leque\)/);
    expect(css.slice(0, css.indexOf('@media (hover: hover) and (pointer: fine)'))).not.toMatch(/:hover \.mural__verso/);
    expect(css).toMatch(/\.mural a:focus-visible \.mural__verso\s*\{[^}]*opacity:\s*1/);
    expect(css).not.toMatch(/rotate[XY]|backface-visibility|perspective/);
  });

  it('as escolhas do Explorar trocam o conteúdo sem recarregar, com cada item indo ao lugar novo', () => {
    // docs/visual.md, "Movimento que mostra o que mudou" (decisão do Gui, 16/11/2026): um esmaecer
    // da tela inteira não serve, e a rolagem fica presa ao que a pessoa estava olhando
    const pagina = tela('pages/explorar.astro');
    expect(pagina).toMatch(/<div data-explorar>/);
    expect(pagina).toMatch(/import \{ ligarTroca \} from '\.\.\/lib\/cliente\/explorar-troca';\s*ligarTroca\(\);/);
    const troca = Object.values(import.meta.glob<string>('../src/lib/cliente/explorar-troca.ts', { query: '?raw', import: 'default', eager: true }))[0]!;
    // Cada item tem identidade própria, no mural e na linha do tempo. No mural, a capa é a memória
    // (`m:`) e as outras fotos de "todas as fotos" têm a delas (`f:`)
    expect(tela('explorar/Mural.astro')).toMatch(/class="mural__foto"[^>]*data-chave=\{n === 0 \? `m:\$\{m\.id\}` : `f:\$\{m\.id\}:\$\{n\}`\} data-ano=\{m\.ano\}/);
    expect(tela('explorar/Mural.astro')).toMatch(/class="mural__decada"[^>]*data-chave=\{`d:\$\{abreDecada\}`\}/);
    const linha = tela('explorar/Linha.astro');
    expect(linha).toMatch(/data-chave=\{`m:\$\{m\.id\}`\}\s*data-ano=\{m\.ano\}/);
    expect(linha).toMatch(/class="ano__cabeca" data-chave=\{`a:\$\{ano\}`\}/);
    // Sem esmaecer a tela inteira: quem move é a animação de cada item
    expect(troca).not.toContain('startViewTransition');
    expect(troca).toMatch(/no\.animate\(/);
    // A rolagem é medida antes e devolvida depois, e ao voltar no navegador a troca é a mesma
    expect(troca).toMatch(/acharAncora\(regiao\)[\s\S]*regiao\.replaceWith\(nova\);[\s\S]*devolverRolagem\(nova, ancora\);/);
    expect(troca).toMatch(/history\.scrollRestoration = 'manual';\s*if \(empurrar\) history\.pushState/);
    expect(troca).toMatch(/addEventListener\('popstate', \(\) => \{[\s\S]*?trocar\(endereco, \{ empurrar: false \}\)/);
    // Com movimento reduzido, a troca é direta: nada é medido para animar
    expect(troca).toMatch(/const antes = calmo\(\) \? new Map<string, Medida>\(\) : medir\(regiao\);/);
    expect(troca).toMatch(/if \(!calmo\(\)\) animar\(antes, nova\);/);
    // Exploração E4: a falha fica na página, pela peça de estado, e a escolha antiga não vale mais quando uma
    // mais nova já saiu (testes/explorar-troca.test.ts)
    expect(troca).toMatch(/vale: \(\) => meu === pedido,/);
    // Mudar um filtro nunca muda a rolagem (correção do Gui, 17/11/2026): o controle usado fica no
    // mesmo ponto da tela, os filtros continuam abertos e cada escolha vale na hora
    expect(troca).toMatch(/scrollBy\(\{ top: controleNovo\.getBoundingClientRect\(\)\.top - controleEm, behavior: 'instant' \}\)/);
    expect(troca).toMatch(/if \(abertos\[i\] !== undefined\) d\.open = abertos\[i\]!;/);
    expect(troca).toMatch(/document\.addEventListener\('change', /);
    // A linha do tempo começa de novo a cada troca, desligando o que escutava a janela
    expect(linha).toMatch(/document\.addEventListener\('explorar:trocou', iniciar\)/);
    expect(linha).toMatch(/desligar\.abort\(\);/);
    expect(linha).not.toMatch(/\{ passive: true \}/);
    expect(linha.match(/\{ passive: true, signal \}/g)?.length).toBe(3);
    // Sem script: links e formulário comuns
    expect(tela('explorar/Controles.astro')).not.toContain('<script');
  });

  it('o filtro de família aceita mais de uma: cada toque liga ou desliga só aquela', () => {
    // Decisão do Gui, 16/11/2026. A regra está em src/lib/explorar.ts (alternarFamilia e passa)
    const controles = tela('explorar/Controles.astro');
    expect(controles).toMatch(/familias: alternarFamilia\(filtros\.familias, n\.id, ordemDasFamilias\)/);
    expect(controles).toMatch(/aria-current=\{filtros\.familias\.includes\(n\.id\) \? 'true' : undefined\}/);
    // Cada família é uma etiqueta que acende na cor dela (decisão do Gui, 17/11/2026)
    expect(controles).toMatch(/class="linha__opcoes linha__opcoes--etiquetas"/);
    expect(controles).toMatch(/data-familia=\{corDoNucleo\(n\.id, ordemDasFamilias\)\}/);
    expect(ler('telas/linha.css')).toMatch(/\.linha__opcoes--etiquetas a\[aria-current\]\s*\{[^}]*background:\s*var\(--pastel\)/);
    // A assinatura do topo e a cor saem das famílias marcadas
    const pagina = tela('pages/explorar.astro');
    expect(pagina).toMatch(/assinaturaDaTela\(filtros\.familias, nucleos\)/);
    expect(pagina).toMatch(/<Visual[^>]*nucleos=\{filtros\.familias\}/);
  });

  it('o movimento do modo TV tem três versões, e as setas nunca esperam uma animação', () => {
    // docs/visual.md, "O modo TV é o lugar de experimentar"
    const palco = tela('explorar/Palco.astro');
    expect(palco).toMatch(/data-movimento=\{modo === 'tv' \? movimento : undefined\}/);
    // Passar é sair para a página da outra memória: nada espera o fim de um movimento
    // Nenhuma espera por animação antes de trocar: as fotos que saem no Álbum saem depois da troca,
    // por cima, sem segurar a memória que chega (decisão do Gui, 17/11/2026: todas vêm da lateral e
    // saem pela lateral, como fotos sendo empurradas)
    expect(palco).not.toMatch(/animationend|transitionend|await [^;\n]*\.finished/);
    expect(palco.indexOf('atual.replaceWith(novo);')).toBeLessThan(palco.indexOf("saem.classList.add('palco__fotos--saindo');"));
    expect(ler('telas/explorar.css')).toMatch(/\.palco\[data-movimento='a'\]\[data-pronta\] \.palco__extra\s*\{\s*animation:\s*palco-chega/);
    expect(palco).toMatch(/case 'proxima':\s*evento\.preventDefault\(\);\s*return void passar\(link\('depois'\)\);/);
    // O modo TV passa sem recarregar (correção do Gui, 17/11/2026): a página seguinte é buscada de
    // antemão e o palco só troca com a foto pronta, que é quando o movimento começa
    expect(palco).toMatch(/await fotoPronta\([\s\S]*?atual\.replaceWith\(novo\);/);
    expect(palco).toMatch(/if \(meu !== pedido\) return;/);
    // Passar de memória não enche o histórico, e qualquer problema cai na navegação comum
    expect(palco).toMatch(/history\.replaceState\(history\.state, '', semPreferencias\(href\)\);/);
    // No endereço fica só o que traz de volta ao mesmo lugar (decisão do Gui, 17/11/2026): a
    // animação, o tempo e "Só as fotos" são preferências guardadas no aparelho
    expect(palco).toMatch(/for \(const nome of \['passar', 'pausa', 'mov'\]\) url\.searchParams\.delete\(nome\);/);
    for (const nome of ['tv-animacao', 'tv-tempo', 'tv-so-fotos']) expect(palco).toContain(`'${nome}'`);
    // "Só as fotos" e a tela cheia, para deixar passando na sala; a tela cheia só onde o navegador tem
    expect(palco).toMatch(/cheia\.hidden = !document\.fullscreenEnabled;/);
    expect(ler('telas/explorar.css')).toMatch(/\.palco\[data-so-fotos\] \.palco__texto\s*\{\s*display:\s*none/);
    // "Só as fotos" tem caminho de volta (defeito achado pelo Gui, 17/11/2026). O botão "Mostrar o
    // texto" existe na linha dos passos, e o script o mostra e põe o foco nele
    expect(palco).toMatch(/<button type="button" class="botao palco__volta" data-palco-mostrar-texto hidden>\s*Mostrar o texto/);
    expect(palco).toMatch(/volta\.hidden = !soFotos;/);
    expect(palco).toMatch(/if \(focar\) atual\.querySelector<HTMLElement>\('\[data-palco-mostrar-texto\]'\)\?\.focus/);
    // As teclas passam por teclaNaTv, e o toque e o mouse, por reacaoEmSoFotos (testadas em explorar.test.ts)
    expect(palco).toMatch(/const reacao = teclaNaTv\(evento\.key, \{/);
    expect(palco).toMatch(/reacaoEmSoFotos\(\{ tipo: 'toque' \}, controles\)/);
    expect(palco).toMatch(/addEventListener\('mousemove'/);
    expect(palco).toMatch(/case 'voltar-ao-texto':\s*evento\.preventDefault\(\);\s*return trocarSoFotos\(false\);/);
    // Os controles somem sozinhos, e o foco do teclado nunca fica num controle escondido: escondidos,
    // eles saem da ordem do teclado (visibility) e quem tinha o foco o perde
    expect(palco).toMatch(/setTimeout\(esconderControles, SEGUNDOS_DOS_CONTROLES \* 1000\)/);
    expect(palco).toMatch(/atual\.contains\(ativo\)\) ativo\.blur\(\);/);
    expect(palco).toMatch(/if \(!escondidos\(\)\) \(noMesmoAjuste/);
    expect(ler('telas/explorar.css')).toMatch(/\.palco\[data-so-fotos\]:not\(\[data-controles\]\) :is\(\.palco__topo, \.palco__controles\)\s*\{\s*visibility:\s*hidden;/);
    // A tela de "Só as fotos" não rola: os controles voltam dentro dela, e não abaixo da dobra
    expect(ler('telas/explorar.css')).toMatch(/\.palco\[data-so-fotos\]\s*\{\s*height:\s*100svh;/);
    // No Álbum, as fotos que saem não repetem a chegada (achado do Gui: pareciam fotos que nunca paravam)
    expect(ler('telas/explorar.css')).toMatch(/\.palco \.palco__fotos--saindo :is\(\.palco__principal, \.palco__extra\)\s*\{\s*animation:\s*none !important/);
    // Erro cai na navegação comum, menos quando uma passagem mais nova já saiu (QA de código de 17/11/2026)
    // Sem rede a passagem espera (C3, resposta do Gui de 17/11/2026: testes/qa-respostas-explorar.test.ts)
    expect(palco).toMatch(/catch \(erro\) \{\s*(?:\/\/[^\n]*\n\s*)*if \(meu !== pedido\) return;\s*(?:\/\/[^\n]*\n\s*)*if \(falhaDeRede\(erro, navigator\.onLine\)\) return esperarARede\(a, deTras\);\s*location\.assign\(href\);/);
    const css = ler('telas/explorar.css');
    for (const v of ['a', 'b', 'c']) expect(css).toContain(`.palco[data-movimento='${v}']`);
    // Toda animação do palco fica dentro de "sem pedido de menos movimento"; fora, só as definições
    const antes = css.slice(0, css.indexOf('@media (prefers-reduced-motion: no-preference)'));
    expect(antes).not.toMatch(/animation(-delay)?:/);
    // A escolha da animação fica com quem está vendo, em "Ajustes", em qualquer ambiente (decisão
    // do Gui, 17/11/2026), e trocar a animação mostra de novo a chegada
    expect(tela('pages/explorar.astro')).toMatch(/movimentos=\{forma === 'tv' && daVez \? MOVIMENTOS\.map/);
    expect(palco).toMatch(/<details class="palco__ajustes" data-palco-ajustes>/);
    expect(palco).toMatch(/aria-current=\{m\.id === movimento \? 'true' : undefined\} data-palco-movimento/);
    // A animação só começa com as fotos prontas, na chegada pela página e em cada passagem
    expect(css).toMatch(/\.palco\[data-espera\] \.palco__fotos\s*\{\s*visibility:\s*hidden/);
    for (const regra of css.matchAll(/([^{}]*)\{[^{}]*animation:\s*palco-[^{}]*\}/g)) expect(regra[1], regra[1]).toContain('[data-pronta]');
    expect(palco).toMatch(/primeiro\.setAttribute\('data-pronta', ''\);\s*primeiro\.removeAttribute\('data-espera'\);/);
    // A foto é uma foto revelada, e as outras fotos da memória ficam em volta dela
    expect(palco).toMatch(/<a class="palco__principal"[^>]*>\s*<Polaroid id=\{memoria\.id\}/);
    expect(palco).toMatch(/emVolta\.map\(\(foto, n\) => \(\s*<div class="palco__extra"/);
  });

  it('no mural, quem está vendo escolhe o tamanho das fotos, e a escolha fica no endereço', () => {
    // Decisão do Gui, 17/11/2026
    const controles = tela('explorar/Controles.astro');
    expect(controles).toMatch(/forma === 'mural' && \(\s*<div class="controles__tamanho">\s*<div class="controle controle--tamanho">\s*<p class="rotulo suave" id="controle-tamanho">\s*Fotos\s*</);
    // o tamanho leva junto a escolha de quais fotos, para o link sem script não a perder
    expect(controles).toMatch(/enderecoDoExplorar\(filtros, forma, \{ \.\.\.tamanhoNoEndereco\(t\), \.\.\.fotosDoMuralNoEndereco\(fotos\) \}\)/);
    // O tamanho acompanha a troca de família e o formulário dos filtros
    expect(controles).toMatch(/<input type="hidden" name="tamanho"/);
    // Com script, o tamanho é preferência guardada no aparelho e não vai para o endereço
    const troca = Object.values(import.meta.glob<string>('../src/lib/cliente/explorar-troca.ts', { query: '?raw', import: 'default', eager: true }))[0]!;
    expect(troca).toMatch(/localStorage\.setItem\(GUARDA_DO_TAMANHO, tamanho\)/);
    expect(troca).toMatch(/endereco\.searchParams\.delete\('tamanho'\);/);
    expect(tela('explorar/Mural.astro')).toMatch(/localStorage\.getItem\('mural-tamanho'\)/);
    expect(tela('explorar/Mural.astro')).toMatch(/data-tamanho=\{tamanho\}/);
    const css = ler('telas/explorar.css');
    for (const t of ['pequenas', 'grandes']) expect(css).toContain(`.mural[data-tamanho='${t}']`);
  });

  it('o modo TV passa as memórias por links, e só passa sozinho quando a pessoa liga', () => {
    // docs/decisoes.md, "Explorar". Sem script, "Anterior" e "Próxima" continuam funcionando
    const palco = tela('explorar/Palco.astro');
    for (const nome of ['Anterior', 'Próxima', 'Passar sozinho', 'Parar de passar sozinho', 'Pausar', 'Retomar', 'Sair do modo TV', 'Me mostre outra']) expect(palco).toContain(nome);
    expect(palco).toMatch(/<BotaoDeSimbolo elemento="a" simbolo="proxima" nome="Próxima" cheio class="botao palco__proxima" href=\{depois\}[^>]*rel="next"/);
    // Decisão do Gui, 17/11/2026: quem está vendo escolhe o tempo e pode pausar e retomar. O grupo só
    // aparece com script, o relógio só arma com um tempo escolhido e sem pausa, e a pausa vai no endereço
    expect(palco).toMatch(/data-palco-passar hidden>/);
    expect(palco).toMatch(/passar\.tempos\.map\(\(t\) => \(\s*<a href=\{t\.href\}/);
    expect(palco).toMatch(/if \(segundos > 0 && !pausado && !document\.hidden\) relogio = window\.setTimeout\(\(\) => passar\(link\('depois'\)\), segundos \* 1000\)/);
    expect(palco).toMatch(/url\.searchParams\.set\('pausa', '1'\)/);
    // Com movimento reduzido, a troca é sem animação
    const css = ler('telas/explorar.css');
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\s*@view-transition/);
    expect(css.match(/@view-transition/g)).toHaveLength(1);
    expect(css.indexOf('@view-transition')).toBeGreaterThan(css.indexOf('@media (prefers-reduced-motion: no-preference)'));
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
    for (const link of pagina.matchAll(/<a class="monte"[^>]*>/g)) expect(link[0]).toMatch(/href=\{enderecoDaFoto\(foto\.chave\)\} data-galeria=\{n\}/);
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

// Fase 3, grupo "familia": capítulo, tema, pessoas e árvore
describe('grupo familia', () => {
  const fontes = import.meta.glob<string>(['../src/pages/capitulos/index.astro', '../src/pages/capitulos/[[]id]/index.astro', '../src/pages/temas/[[]id].astro', '../src/pages/pessoas/index.astro', '../src/pages/arvore.astro', '../src/lib/cliente/arvore.ts', '../src/layouts/Visual.astro'], {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  const fonte = (fim: string) => Object.entries(fontes).find(([caminho]) => caminho.endsWith(fim))![1];

  it('cada tela acende a sua seção no menu', () => {
    expect(fonte('capitulos/index.astro')).toContain('secao="capitulos"');
    expect(fonte('capitulos/[id]/index.astro')).toContain('secao="capitulos"');
    expect(fonte('temas/[id].astro')).toContain('secao="capitulos"');
    expect(fonte('pessoas/index.astro')).toContain('secao="pessoas"');
    expect(fonte('arvore.astro')).toContain('secao="arvore"');
    const topo = fonte('Visual.astro');
    expect(topo).toMatch(/href: '\/capitulos', texto: 'Capítulos', atual: secao === 'capitulos'/);
    expect(topo).toMatch(/href: '\/arvore', texto: 'Árvore', atual: secao === 'arvore'/);
  });

  it('o capítulo: marcos numerados na ordem de toda linha do tempo, e a capa só fica parada com mouse', () => {
    const pagina = fonte('capitulos/[id]/index.astro');
    expect(pagina).toMatch(/const marcos = maisRecentesPrimeiro\(memorias\)\.map\(\(m, i, lista\) => \(\{ m, numero: lista\.length - i \}\)\);/);
    expect(pagina).toContain('nomeDoModo(capitulo)');
    // A cor do capítulo é a do trilho dele na linha do tempo
    expect(pagina).toMatch(/style=\{cor === undefined \? undefined : estiloDoCapitulo\(cor\)\}/);
    const css = ler('telas/capitulo.css');
    expect(css).toMatch(/@media \(min-width: 62rem\) and \(hover: hover\) and \(pointer: fine\) \{[^@]*?\.capitulo \.capitulo__capa \{\s*position: sticky;/);
    // A capa do capítulo, o alto do sumário (resposta do Gui à P62 do QA de design de 17/11/2026) e a
    // coluna da página do tema (19/11/2026)
    expect(css.match(/position:\s*sticky/g)).toHaveLength(3);
  });

  it('na tela é "família", e não "núcleo"', () => {
    for (const fim of ['capitulos/index.astro', 'capitulos/[id]/index.astro', 'temas/[id].astro', 'pessoas/index.astro', 'arvore.astro']) {
      // Só o que aparece na tela: sem o cabeçalho de código nem os comentários
      const marcacao = fonte(fim).split('\n---\n').slice(1).join('').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
      expect(marcacao, fim).not.toMatch(/[Nn]úcleo/);
    }
    expect(fonte('arvore.astro')).toContain('<span>Outras famílias</span>');
    expect(fonte('arvore.astro')).toContain('Família {n.nome}');
    expect(fonte('cliente/arvore.ts')).toContain('que é de outra família');
    expect(fonte('pessoas/index.astro')).toContain('Quem aparece nas memórias da família, por família.');
  });

  it('a árvore muda só de aparência: o estilo é do visual novo e as cores são as das famílias', () => {
    const pagina = fonte('arvore.astro');
    expect(pagina).toMatch(/^import '\.\.\/visual\/telas\/arvore\.css';/m);
    const cliente = fonte('cliente/arvore.ts');
    expect(cliente).not.toMatch(/--nucleo-|--cor-/);
    expect(cliente).toContain('`var(--arvore-familia-${i % 4})`');
    const css = ler('telas/arvore.css');
    // As quatro cores das famílias, na ordem dos tokens ([data-familia] em tokens.css)
    expect(css).toMatch(/--arvore-familia-0: var\(--verde-pastel\);\s*--arvore-familia-1: var\(--orquidea-pastel\);\s*--arvore-familia-2: var\(--azul-pastel\);\s*--arvore-familia-3: var\(--pessego-pastel\);/);
    // O cartão do ramo aberto fica por cima da árvore e abaixo do painel do mapa
    expect(css).toMatch(/\.mapa__camada--ramos \{\s*z-index: 2;/);
    expect(ler('telas/mapa.css')).toMatch(/\.pm \{\s*position: absolute;\s*z-index: 3;/);
    // Toque mínimo: o botão do coração e a marca do ramo têm a área de toque maior que o desenho
    expect(css).toMatch(/\.no__coracao::after,\s*\.no__ramo::after \{\s*content: '';\s*position: absolute;\s*inset: -0\.5rem;/);
  });
});

// Fase 3, grupo "formularios", primeira metade: a base, a Nova memória, o relato e o capítulo
describe('grupo formularios', () => {
  const fontes = import.meta.glob<string>(['../src/pages/nova.astro', '../src/pages/memorias/[[]id]/relato.astro', '../src/pages/capitulos/novo.astro', '../src/pages/capitulos/[[]id]/editar.astro', '../src/pages/pessoas/nova.astro', '../src/pages/pessoas/[[]id]/editar.astro', '../src/pages/memorias/[[]id]/historico.astro', '../src/pages/memorias/[[]id]/excluir.astro', '../src/pages/capitulos/[[]id]/excluir.astro', '../src/pages/lixeira.astro', '../src/pages/admin/*.astro', '../src/components/FichaDoIntegrante.astro', '../src/components/CampoRetrato.astro', '../src/components/ConfirmarRemocao.astro', '../src/components/ComoSeReferir.astro', '../src/components/formularios/Pagina.astro', '../src/components/FichaDoCapitulo.astro', '../src/components/QuemEstava.astro'], {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  const fonte = (fim: string) => {
    const achado = Object.entries(fontes).find(([caminho]) => caminho.endsWith(fim));
    if (!achado) throw new Error(`não achei ${fim}`);
    return achado[1];
  };
  const telas = ['pages/nova.astro', 'relato.astro', 'capitulos/novo.astro', 'capitulos/[id]/editar.astro', 'pessoas/nova.astro', 'pessoas/[id]/editar.astro', 'historico.astro', 'memorias/[id]/excluir.astro', 'capitulos/[id]/excluir.astro', 'lixeira.astro', 'admin/tipos.astro', 'admin/familias.astro', 'admin/carta.astro', 'admin/espelho.astro'];

  it('as telas usam a página de formulário do visual novo, e não o esqueleto antigo', () => {
    for (const fim of telas) {
      expect(fonte(fim), fim).toContain("components/formularios/Pagina.astro'");
      expect(fonte(fim), fim).not.toMatch(/layouts\/Base\.astro|components\/Abertura\.astro|styles\/global\.css/);
    }
    const pagina = fonte('Pagina.astro');
    expect(pagina).toContain("import '../../visual/telas/formulario.css';");
    expect(pagina).toContain("import Visual from '../../layouts/Visual.astro';");
  });

  it('a página de formulário guarda o que todo formulário precisa: sem JavaScript, o digitado de volta e o envio marcado', () => {
    const pagina = fonte('Pagina.astro');
    expect(pagina).toMatch(/<noscript>[\s\S]*\[data-etapa-continuar\][\s\S]*display: none[\s\S]*\[data-para\]\[hidden\], \[data-so-epoca\]\[hidden\], \[data-so-periodo\]\[hidden\], \[data-depende\]\[hidden\] \{ display: block/);
    expect(pagina).toContain("import { guardarFormularios } from '../../lib/cliente/guardar-formulario';");
    expect(pagina).toContain('marcarEnvios()');
    // O recado que volta do servidor é a peça do sistema
    expect(pagina).toContain('{recadoErro && <Recado erro data-recados>{recadoErro}</Recado>}');
  });


  it('o que o script esconde fica escondido, e o foco tirado de um campo ganha outro sinal', () => {
    const css = readFileSync(new URL('../src/visual/telas/formulario.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.pagina-de-formulario \[hidden\]\s*\{\s*display:\s*none !important;/);
    expect(css).toMatch(/:focus-visible\s*\{\s*outline:\s*0;\s*background-color:\s*var\(--papel-recuo\);\s*box-shadow:\s*0 3px 0 var\(--tinta\);/);
    // Voltar à esquerda; o rascunho e a principal à direita
    expect(css).toMatch(/\.acoes--etapas \[data-etapa-voltar\]\s*\{\s*margin-right:\s*auto;/);
  });

  it('na tela é "família", e não "núcleo" (decisão do Gui, 16/11/2026)', () => {
    for (const fim of [...telas, 'FichaDoCapitulo.astro', 'QuemEstava.astro']) {
      // Só o que aparece na tela: fora dos comentários, do código e dos nomes de campo
      const texto = fonte(fim)
        .replace(/^---[\s\S]*?^---/m, '')
        .replace(/<script[\s\S]*?<\/script>/g, '')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
      const naTela = [...texto.matchAll(/>([^<>{}]*)</g)].map((m) => m[1]).join(' ');
      expect(naTela, fim).not.toMatch(/n[úu]cleo/i);
    }
    expect(fonte('pages/nova.astro')).toContain('Só quem é das famílias escolhidas abaixo');
    expect(fonte('pages/nova.astro')).toContain('De quais famílias é esta memória?');
    expect(fonte('FichaDoCapitulo.astro')).toContain('Só quem é das famílias marcadas abaixo');
    // A segunda metade do grupo: a ficha da pessoa, o histórico e o espelho
    for (const fim of ['FichaDoIntegrante.astro', 'CampoRetrato.astro']) expect(fonte(fim).replace(/^---[\s\S]*?^---/m, '').replace(/<script[\s\S]*?<\/script>/g, ''), fim).not.toMatch(/n[úu]cleo/i);
    expect(fonte('pessoas/[id]/editar.astro')).toContain('por quem é da mesma família que');
    expect(fonte('historico.astro')).toContain('Mudou fotos, famílias ou quem pode ver.');
    expect(fonte('admin/espelho.astro')).toContain('quem é de cada família,');
  });

  it('o estilo antigo saiu: nada usa o esqueleto, a abertura, o arquivo nem as variáveis dele', () => {
    const tudo = import.meta.glob<string>(['../src/**/*.{astro,ts,css}'], { query: '?raw', import: 'default', eager: true });
    const caminhos = Object.keys(tudo);
    expect(caminhos.some((c) => c.includes('/styles/') || c.endsWith('layouts/Base.astro') || c.endsWith('components/Abertura.astro'))).toBe(false);
    // O CSS chega vazio por este caminho: os arquivos de estilo são lidos do disco
    const css = readdirSync(new URL('../src/visual', import.meta.url), { recursive: true })
      .map(String)
      .filter((a) => a.endsWith('.css'))
      .map((a) => readFileSync(new URL(`../src/visual/${a}`, import.meta.url), 'utf8'));
    for (const texto of [...Object.entries(tudo).filter(([c]) => !c.endsWith('.css')).map(([, t]) => t), ...css]) {
      expect(texto).not.toMatch(/import [^;]*(layouts\/Base\.astro|components\/Abertura\.astro|styles\/global\.css)/);
      expect(texto).not.toMatch(/var\(--(cor|tamanho|espaco|nucleo)-/);
    }
    // Toda página do site usa o esqueleto novo, direto ou pela página de formulário
    const paginas = Object.entries(import.meta.glob<string>('../src/pages/**/*.astro', { query: '?raw', import: 'default', eager: true }));
    expect(paginas.length).toBeGreaterThan(20);
    for (const [caminho, texto] of paginas) expect(texto, caminho).toMatch(/layouts\/Visual\.astro'|components\/formularios\/Pagina\.astro'|Astro\.redirect\(/);
  });

  it('as telas utilitárias e de pessoa usam as peças do sistema para o estado vazio', () => {
    for (const fim of ['lixeira.astro', 'historico.astro', 'admin/tipos.astro']) {
      expect(fonte(fim), fim).toContain("components/visual/Vazio.astro'");
      expect(fonte(fim), fim).not.toMatch(/class="vazio"/);
    }
    // A confirmação de remover continua no próprio lugar, com o botão do alerta
    expect(fonte('ConfirmarRemocao.astro')).toMatch(/<button class="botao botao--perigo" type="submit" name="acao"/);
    const css = readFileSync(new URL('../src/visual/telas/formulario.css', import.meta.url), 'utf8');
    for (const nome of ['etapas--fluxo', 'escolhas', 'lacos', 'editar__caixa', 'fases', 'linhas', 'alerta', 'retrato-campo', 'recorte__quadro', 'pagina-de-formulario--larga']) expect(css, nome).toContain(`.${nome}`);
  });
});

// Ajustes depois da fase 3 (pedidos do Gui, 17/11/2026)
describe('ajustes: lista, formas de ver da pessoa, quem aparece e o link do título', () => {
  const fonte = (caminho: string) => readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8');

  it('o link do título de cada memória tem 44 px de toque e o contorno do foco nele mesmo', () => {
    // Defeito apontado pelo Gui: o link media 30 px quando o título cabia numa linha, e o contorno
    // ficava em volta da memória inteira, mais alta que a tela do celular
    const css = ler('telas/linha.css');
    expect(css).toMatch(/\.entrada__titulo a\s*\{[^}]*display:\s*inline-flex;[^}]*min-height:\s*var\(--toque\);/);
    expect(css).toMatch(/\.entrada__titulo a:focus-visible\s*\{\s*outline:\s*2px solid var\(--tinta\);/);
    expect(css).not.toMatch(/\.entrada__titulo a:focus-visible\s*\{\s*outline:\s*none/);
  });

  it('na lista, a linha inteira é o link, com 44 px de toque e foco visível', () => {
    const css = ler('telas/lista.css');
    const lista = fonte('components/explorar/Lista.astro');
    expect(lista).toMatch(/<li class="lista__item" data-chave=\{`m:\$\{m\.id\}`\} data-ano=\{m\.ano\}/);
    expect(lista).toMatch(/<header class="lista__cabeca" data-chave=\{`a:\$\{ano\}`\} data-ano=\{ano\}>/);
    expect(lista).toMatch(/<a class="lista__linha" href=/);
    expect(css).toMatch(/\.lista__linha\s*\{[^}]*min-height:\s*var\(--toque\);/);
    expect(css).toMatch(/\.lista__linha:focus-visible\s*\{\s*outline:\s*2px solid var\(--tinta\);/);
  });

  it('na lista do computador, a coluna dos sinais cabe o ícone de áudio e os relatos', () => {
    // Com 5,5rem, "2 relatos" ao lado do ícone de áudio era cortado no fim da palavra (QA de 20/11/2026, docs/historico/qa/2026-11-20-relatorio.md)
    const css = ler('telas/lista.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/grid-template-columns:\s*var\(--coluna-da-data\) 1\.5rem minmax\(0, 2\.2fr\) minmax\(0, 1\.5fr\) 7rem\s*minmax\(0, 1\.3fr\)/);
  });

  it('na lista, a foto-chave só existe onde há mouse: no celular ela não é desenhada', () => {
    const css = ler('telas/lista.css');
    // Fora da regra de mouse, a foto não existe
    expect(css).toMatch(/\.lista__foto\s*\{\s*display:\s*none;\s*\}/);
    const comMouse = css.slice(css.indexOf('@media (min-width: 62rem) and (hover: hover) and (pointer: fine)'));
    expect(comMouse).toMatch(/\.lista__foto\s*\{[^}]*display:\s*block;/);
    expect(comMouse).toMatch(/\.lista__linha:hover \.lista__foto,\s*\.lista__linha:focus-visible \.lista__foto\s*\{/);
    // O arquivo da foto só é pedido onde a mesma regra vale: no celular o navegador nem o baixa
    const lista = fonte('components/explorar/Lista.astro');
    expect(lista).toContain("const COM_MOUSE = '(min-width: 62rem) and (hover: hover) and (pointer: fine)';");
    expect(lista).toMatch(/<Polaroid [^>]*soOnde=\{COM_MOUSE\}[^>]*\/>/);
    // E só quando a linha é apontada (sessão D1b): as fontes ficam em data-* até o mouse ou o foco chegar
    expect(fonte('components/visual/Polaroid.astro')).toMatch(/<img src=\{VAZIA\} data-so-onde=\{soOnde\} data-src=/);
    expect(fonte('lib/cliente/foto-ao-passar.ts')).toContain('if (!matchMedia(img.dataset.soOnde!).matches) continue;');
    // Só essa regra a mostra, e nada na lista fica preso à tela
    expect([...css.matchAll(/\.lista__foto\s*\{[^}]*display:\s*block/g)]).toHaveLength(1);
    expect(css).not.toMatch(/position\s*:\s*(fixed|sticky)/);
  });

  it('a lista entra na troca sem recarregar, no Explorar e na página da pessoa', () => {
    const troca = fonte('lib/cliente/explorar-troca.ts');
    expect(troca).toMatch(/\['linha', 'mural', 'lista', null\]\.includes\(endereco\.searchParams\.get\('ver'\)\)/);
    expect(troca).toMatch(/endereco\.pathname === location\.pathname/);
    expect(troca).toMatch(/no\.classList\.contains\('lista__item'\) \? 'lista'/);
    // Um link de âncora na mesma página não é uma troca
    expect(troca).toMatch(/if \(endereco\.pathname \+ endereco\.search === ondeEstava\) return;/);
    const pessoa = fonte('pages/pessoas/[id]/index.astro');
    // A página da pessoa (sessão L): a região da vida em memórias troca no lugar, pela idade, na linha do tempo e no mural
    expect(pessoa).toMatch(/<section class:list=\{\['verbete__vida', `verbete__vida--\$\{forma\}`\]\} aria-labelledby="memorias-com" data-explorar>/);
    expect(pessoa).toMatch(/FORMAS_DA_VIDA\.map\(\(f\) => \(\s*<a href=\{`\$\{enderecoDaVida\(pessoa\.id, f\)\}#memorias-com`\} data-opcao=\{f\}/);
    expect(pessoa).toMatch(/import \{ ligarTroca \} from '\.\.\/\.\.\/\.\.\/lib\/cliente\/explorar-troca';\s*ligarTroca\(\);/);
  });

  it('no capítulo, quem aparece é uma linha de nomes no celular e a lista com retratos na tela grande', () => {
    const pagina = fonte('pages/capitulos/[id]/index.astro');
    expect(pagina).toMatch(/<p class="capitulo__nomes ficha">/);
    expect(pagina).toMatch(/\{nomeDe\(id\)\} \(\{n\}\)/);
    const css = ler('telas/capitulo.css');
    expect(css).toMatch(/\.capitulo__gente ul\s*\{\s*display:\s*none;/);
    const grande = css.slice(css.indexOf('@media (min-width: 62rem)'));
    expect(grande).toMatch(/\.capitulo__nomes\s*\{\s*display:\s*none;/);
    expect(grande).toMatch(/\.capitulo__gente ul\s*\{\s*display:\s*block;/);
  });
});

describe('ajustes: a zona de perigo', () => {
  const fonte = (caminho: string) => readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8');
  const nova = fonte('pages/nova.astro');
  const css = ler('telas/formulario.css');





  it('a zona de perigo fica no fim das telas de editar, fora do formulário que salva, e só para quem pode', () => {
    // Memória: depois do fim do formulário, e só com a permissão de excluir de sempre
    expect(nova.indexOf('<ZonaDePerigo>')).toBeGreaterThan(nova.indexOf('</form>'));
    expect(nova).toMatch(/const podeExcluir = Boolean\(memoria\) && podeExcluirMemoria\(usuario, memoria!\)\.ok;/);
    expect(nova).toMatch(/memoria && podeExcluir && \(/);
    // Capítulo: no fim da página, só para os administradores, como antes
    const capitulo = fonte('pages/capitulos/[id]/editar.astro');
    expect(capitulo).toMatch(/usuario\.admin && \(\s*<ZonaDePerigo>/);
    expect(capitulo.indexOf('<ZonaDePerigo>')).toBeGreaterThan(capitulo.lastIndexOf('<FichaDoCapitulo'));
    // Laço e casal: toda remoção com confirmação está dentro de uma zona, depois do formulário que salva
    const pessoa = fonte('pages/pessoas/[id]/editar.astro');
    const remocoes = pessoa.match(/<ConfirmarRemocao/g) ?? [];
    // A frase do que acontece abre a zona (resposta do Gui à 47-N2, 17/11/2026)
    const zonas = pessoa.match(/<ZonaDePerigo menor nivel=\{4\}>\s*<p>\{FRASE_DO_(LACO|CASAL)\}<\/p>\s*<form method="post" action="\/api\/lacos" class="editar__remover">/g) ?? [];
    expect(remocoes.length).toBeGreaterThan(0);
    expect(zonas.length).toBe(remocoes.length);
    // Nenhuma tela de editar leva direto ao apagar: a zona tem o caminho da confirmação
    for (const tela of [nova, capitulo]) expect(tela.slice(tela.indexOf('<ZonaDePerigo>'), tela.indexOf('</ZonaDePerigo>'))).toMatch(/href=\{`\/(memorias|capitulos)\/\$\{\w+\.id\}\/excluir`\}/);
  });

  it('a zona de perigo é marcada na cor de alerta, e o botão que confirma continua cheio nessa cor', () => {
    const pecas = ler('pecas.css');
    // Quieta: só o fio em cima, sem fundo (resposta do Gui à P131 do QA de design, 17/11/2026)
    expect(pecas).toMatch(/\.perigo\s*\{[^}]*border-top:\s*var\(--traco\) solid var\(--alerta\);/);
    expect(pecas).toMatch(/\.perigo__titulo\s*\{\s*color:\s*var\(--alerta-tinta\);/);
    expect(css).toMatch(/\.botao\.botao--perigo\s*\{\s*background:\s*var\(--alerta-tinta\);/);
    expect(fonte('components/ConfirmarRemocao.astro')).toMatch(/class="botao botao--perigo" type="submit"/);
  });
});

describe('ajustes: a árvore nítida no zoom, o cartão de bicho e a foto da lista', () => {
  const fonte = (caminho: string) => readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8');
  const semComentario = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
  const regra = (css: string, seletor: string) => {
    const inicio = css.indexOf(`${seletor} {`);
    return inicio < 0 ? '' : css.slice(inicio, css.indexOf('}', inicio));
  };

  it('a camada do mapa só é promovida enquanto o gesto dura (defeito achado pelo Gui, 17/11/2026)', () => {
    // Com will-change sempre ligado, o navegador desenhava a árvore a 100% e esticava o desenho ao
    // aproximar: texto, cartões e linhas ficavam borrados. A promoção fica numa classe só, que o
    // script põe no gesto e tira quando ele acaba, para o desenho ser refeito na escala nova.
    const css = semComentario(fonte('visual/telas/arvore.css'));
    const comPromocao = [...css.matchAll(/([^{}]+)\{[^{}]*will-change[^{}]*\}/g)].map((m) => m[1].trim());
    expect(comPromocao).toEqual(['.mapa__camada--em-gesto']);
    expect(css).not.toMatch(/translate3d|translateZ|backface-visibility/);
    // O código de andar e aproximar mora num módulo só, o da árvore e do círculo (src/lib/cliente/mapa-que-anda.ts)
    const cliente = fonte('lib/cliente/mapa-que-anda.ts');
    expect(cliente).toMatch(/classList\.add\('mapa__camada--em-gesto'\)/);
    expect(cliente).toMatch(/for \(const c of camadas\) c\.classList\.remove\('mapa__camada--em-gesto'\);/);
    // Toda mudança da vista passa por aplicar, que é quem marca o gesto
    expect(cliente).toMatch(/const aplicar = \(animado = false\) => \{\s*if \(!ativo\(\)\) return;\s*emGesto\(animado\);/);
    expect(cliente.match(/c\.style\.transform = `translate\(\$\{vista\.x\}px/g)).toHaveLength(1);
    for (const arquivo of ['lib/cliente/arvore.ts', 'lib/cliente/circulo.ts', 'lib/cliente/mapa-que-anda.ts']) expect(fonte(arquivo)).not.toMatch(/willChange|translate3d/);
  });

  it('arrastar o mapa começando num cartão não vira o arrasto de link do navegador', () => {
    expect(fonte('lib/cliente/mapa-que-anda.ts')).toMatch(/mapa\.addEventListener\('dragstart', \(e\) => e\.preventDefault\(\)\);/);
  });

  it('no cartão de bicho, o respiro acompanha o arredondado (achado do Gui, 17/11/2026)', () => {
    const css = semComentario(fonte('visual/telas/arvore.css'));
    const rem = (bloco: string, propriedade: string) => Number(new RegExp(`${propriedade}:\\s*([\\d.]+)rem`).exec(bloco)?.[1]);
    const bicho = regra(css, '.no--bicho');
    const especie = regra(css, '.no__bicho');
    const raio = rem(bicho, 'border-radius') * 16;
    const margem = rem(bicho, 'padding-inline') * 16;
    const alto = rem(especie, 'top') * 16;
    // A caixa tem 76 px de altura: abaixo de meia altura, a forma continua de cápsula sem a curva
    // tomar o canto do texto
    expect(raio).toBeGreaterThanOrEqual(24);
    expect(raio).toBeLessThan(38);
    // Onde a curva está na altura da primeira linha (a espécie): a folga até o texto não fica menor
    // que a margem do cartão de pessoa (0.7rem)
    const curva = raio - Math.sqrt(raio ** 2 - (raio - alto) ** 2);
    expect(margem - curva).toBeGreaterThanOrEqual(0.7 * 16);
    // A espécie começa na mesma margem do nome
    expect(rem(especie, 'left')).toBe(rem(bicho, 'padding-inline'));
    expect(rem(especie, 'right')).toBe(rem(bicho, 'padding-inline'));
  });

  it('na lista, a conta do cabeçalho do ano fica fora da margem da foto', () => {
    const css = semComentario(fonte('visual/telas/lista.css'));
    expect(css).toMatch(/\.lista__cabeca \{\s*padding-right: 11\.5rem;/);
    expect(css).toMatch(/\.lista__linha,\s*\.lista__cabeca \{\s*padding-right: 15rem;/);
  });
});

describe('página de tema: a coluna da esquerda fica parada e a lista rola por dentro', () => {
  const css = ler('telas/capitulo.css');
  const pagina = readFileSync(new URL('../src/pages/temas/[id].astro', import.meta.url), 'utf8');
  // O bloco de duas colunas (teto da lista, para o toque) e o bloco só de mouse (coluna parada)
  const duasColunas = css.slice(css.indexOf('@media (min-width: 62rem) {', css.indexOf('.tema__memorias {')));
  const bloco = duasColunas.slice(0, duasColunas.indexOf('@media (min-width: 62rem) and (hover'));
  const marca = '@media (min-width: 62rem) and (hover: hover) and (pointer: fine) {';
  const mouse = css.slice(css.indexOf(marca), css.indexOf('@media (min-width: 100rem)'));

  it('no toque largo a lista tem teto e rola; no celular ela corre inteira', () => {
    expect(bloco).toMatch(/\.tema__rolagem \{\s*max-height: 60svh;\s*overflow-y: auto;/);
    const fora = css.replace(bloco, '');
    expect(fora).not.toMatch(/\.tema__rolagem \{[^}]*(max-height: 60svh|overflow)/);
  });

  it('a coluna parada só vale com mouse: nada preso no toque, por causa da banda do Safari', () => {
    const regras = css.match(/\.tema[^{}]*\{[^}]*\}/g) ?? [];
    const presas = regras.filter((r) => /position:\s*(sticky|fixed)/.test(r));
    expect(presas.length).toBeGreaterThan(0);
    for (const r of presas) expect(mouse).toContain(r);
    expect(mouse).toMatch(/\.tema > \.tema__capa \{[^}]*position: sticky;[^}]*top:/);
    expect(css.replace(mouse, '')).not.toMatch(/\.tema[^{}]*\{[^}]*position:\s*(sticky|fixed)/);
  });

  it('com mouse a coluna inteira acompanha a janela e a lista ocupa o resto, sem o teto fixo', () => {
    expect(mouse).toMatch(/\.tema__capa \{[^}]*display: flex;[^}]*flex-direction: column;[^}]*max-height: calc\(100svh \+ var\(--sobe\)\);/);
    expect(mouse).toMatch(/\.tema__capitulos \{[^}]*display: flex;[^}]*min-height: 0;/);
    expect(mouse).toMatch(/\.tema__rolagem \{[^}]*max-height: none;/);
    expect(mouse).not.toMatch(/\.tema__rolagem \{[^}]*60svh/);
  });

  it('a coluna parada vale nas três formas de ver, inclusive na lista', () => {
    expect(mouse).toMatch(/\.tema > \.tema__capa \{[^}]*position: sticky;/);
    expect(mouse).not.toContain(':has(');
  });

  it('a lista fica abaixo do cabeçalho do tema, e o cabeçalho fora da área que rola', () => {
    const rolagem = pagina.indexOf('data-rolagem');
    expect(pagina.indexOf('id="capitulos-do-tema"')).toBeLessThan(rolagem);
    expect(pagina.indexOf('class="tema__abre')).toBeLessThan(rolagem);
  });

  it('a lista só vira ponto de parada do teclado quando de fato rola', () => {
    expect(pagina).toMatch(/scrollHeight > rolagem\.clientHeight \+ 1\) rolagem\.tabIndex = 0;\s*else rolagem\.removeAttribute\('tabindex'\)/);
  });
});

describe('página do capítulo: a coluna da capa fica parada e o que vem abaixo da data rola por dentro', () => {
  const css = ler('telas/capitulo.css');
  const pagina = readFileSync(new URL('../src/pages/capitulos/[id]/index.astro', import.meta.url), 'utf8');
  const marca = '@media (min-width: 62rem) and (hover: hover) and (pointer: fine) {';
  const mouse = css.slice(css.indexOf(marca), css.indexOf('@media (min-width: 100rem)'));
  const semComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '');

  it('a capa inteira fica parada com mouse e nunca passa da altura da janela', () => {
    expect(mouse).toMatch(/\.capitulo \.capitulo__capa \{[^}]*position: sticky;[^}]*top: var\(--e-6\);[^}]*align-self: start;[^}]*display: flex;[^}]*flex-direction: column;[^}]*max-height: calc\(100svh/);
  });
  it('o alto (selo, título, data, conta e ações) não encolhe, e o resto ocupa a altura que sobra e rola', () => {
    expect(mouse).toMatch(/\.capitulo \.capitulo__parado \{\s*flex: none;/);
    expect(mouse).toMatch(/\.capitulo \.capitulo__rolagem \{[^}]*flex: 1 1 auto;[^}]*min-height: 0;[^}]*overflow-y: auto;/);
  });
  it('sticky e rolagem própria só com mouse: no toque nada fica preso, no celular a capa corre inteira', () => {
    const fora = semComentarios(css.replace(mouse, ''));
    expect(fora).not.toMatch(/\.capitulo[^{}]*\{[^}]*(position:\s*(sticky|fixed)|overflow-y)/);
    expect(fora).toMatch(/\.capitulo__parado,\s*\.capitulo__rolagem \{\s*display: contents;/);
  });
  it('a área que rola vem depois do bloco do alto e leva a abertura, as notas e "Quem aparece"', () => {
    const capa = pagina.slice(pagina.indexOf('<header class="capitulo__capa">'), pagina.indexOf('</header>'));
    const rolagem = capa.indexOf('class="capitulo__rolagem" data-rolagem');
    expect(rolagem).toBeGreaterThan(capa.indexOf('class="capitulo__parado"'));
    for (const peca of ['capitulo__abertura', 'capitulo__notas', 'capitulo__gente']) expect(capa.indexOf(peca), peca).toBeGreaterThan(rolagem);
    for (const peca of ['capitulo__titulo', 'capitulo__periodo', 'capitulo__acoes']) expect(capa.indexOf(peca), peca).toBeLessThan(rolagem);
  });
  it('a capa sempre cabe, então o script que media e a classe --solta saíram', () => {
    expect(css).not.toContain('--solta');
    expect(pagina).not.toMatch(/--solta|offsetHeight|innerHeight/);
  });
  it('a área só vira ponto de parada do teclado quando de fato rola', () => {
    expect(pagina).toMatch(/scrollHeight > rolagem\.clientHeight \+ 1\) rolagem\.tabIndex = 0;\s*else rolagem\.removeAttribute\('tabindex'\)/);
  });
});

// Decisão do Gui, 19/11/2026: "largura inteira" é a largura inteira disponível. Trocar a forma de ver
// (linha do tempo, mural, lista) nunca muda o lugar de nada: elemento saltando na página é o que ele
// mais quer evitar. As colunas do tema e do capítulo são as mesmas nos três modos.
describe('trocar a forma de ver não muda o arranjo das colunas, no tema e no capítulo', () => {
  const css = ler('telas/capitulo.css');
  const lista = ler('telas/lista.css');
  const tema = readFileSync(new URL('../src/pages/temas/[id].astro', import.meta.url), 'utf8');
  const capitulo = readFileSync(new URL('../src/pages/capitulos/[id]/index.astro', import.meta.url), 'utf8');
  const semComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '');

  it('nenhuma regra de coluna depende da forma de ver (nada de :has com a lista ou o mural)', () => {
    const regras = semComentarios(css);
    expect(regras).not.toMatch(/:has\([^)]*(linha--|capitulo__larga|capitulo__explorar|mural|lista)/);
    expect(regras).not.toContain('capitulo__larga');
    expect(regras).not.toContain('tema__larga');
  });

  it('as colunas do capítulo são as mesmas com marcos, mural e lista', () => {
    const regras = semComentarios(css);
    // A posição da capa e a do corpo só mudam com a largura da tela: o seletor é sempre o simples
    const seletores = [...regras.matchAll(/([^{}]+)\{[^{}]*grid-column[^{}]*\}/g)]
      .flatMap((m) => m[1].split(','))
      .map((x) => x.trim())
      .filter((x) => /capitulo__(capa|corpo)/.test(x));
    expect(seletores.length).toBeGreaterThan(0);
    for (const x of seletores) expect(x).toMatch(/^\.capitulo \.capitulo__(capa|corpo)$/);
    // O mural e a lista moram dentro do corpo, junto com os marcos
    const corpo = capitulo.slice(capitulo.indexOf('<div class="capitulo__corpo">'));
    for (const marca of ['class="marcos"', 'linha--mural', 'linha--lista']) expect(corpo, marca).toContain(marca);
    expect(capitulo.slice(0, capitulo.indexOf('<div class="capitulo__corpo">'))).not.toMatch(/linha--(mural|lista)/);
  });

  it('as colunas do tema são as mesmas com linha do tempo, mural e lista', () => {
    const regras = semComentarios(css);
    expect(regras.match(/\.tema > \.tema__memorias \{[^}]*grid-column:[^;]*;/g)).toHaveLength(1);
    expect(regras.match(/\.tema > \.tema__capa \{[^}]*grid-column:[^;]*;/g)).toHaveLength(1);
    const memorias = tema.slice(tema.indexOf('<section class="tema__memorias"'));
    for (const marca of ['<Linha ', 'linha--mural', 'linha--lista']) expect(memorias, marca).toContain(marca);
    expect(tema.slice(0, tema.indexOf('<section class="tema__memorias"'))).not.toMatch(/linha--(mural|lista)/);
  });

  it('o mural e a lista na coluna: menos fotos por linha e a linha da lista em dois andares', () => {
    const regras = semComentarios(css);
    expect(regras).toMatch(/\.capitulo__explorar \.mural\[data-tamanho\] \{\s*--colunas: 3;/);
    expect(regras).toMatch(/\.capitulo__explorar \.mural\[data-tamanho\] \{\s*--colunas: 4;/);
    expect(tema).toContain('linha--lista linha--coluna');
    expect(capitulo).toContain('linha--lista linha--coluna');
    expect(semComentarios(lista)).toMatch(/\.linha--coluna \.lista__linha \{\s*grid-template-columns: var\(--coluna-da-data\) 1\.5rem minmax\(0, 1fr\);/);
  });

  it('a capa do capítulo não depende da forma de ver: ela é parada e rola por dentro nos três modos', () => {
    expect(semComentarios(css)).not.toMatch(/\.capitulo__(capa|parado|rolagem)[^{}]*:has\(/);
    expect(capitulo.slice(0, capitulo.indexOf('<div class="capitulo__corpo">'))).toContain('capitulo__rolagem');
  });
});
