// O sistema visual (docs/visual.md, "Sistema"): a fonte do site numa linha só, a assinatura que
// acompanha a tela, o monograma e as regras que mantêm tokens e peças num lugar só.
import { describe, expect, it } from 'vitest';
import { lerListaDeSobrenomes } from '../src/lib/sobrenomes';
import {
  COMBINACOES_DE_FONTES,
  CORES,
  FONTES_DO_SITE,
  PAPEIS_DAS_FONTES,
  SOBRENOMES_DE_REFERENCIA,
  assinaturaDaTela,
  atributosDasFontes,
  combinacao,
  combinacaoDe,
  corDaPessoa,
  corDoNucleo,
  encolheDaAssinatura,
  larguraNaSerifa,
  nomesDasFontes,
} from '../src/lib/visual';
import { LARGURAS_DAS_LETRAS } from '../src/visual/medidas-das-serifas';
import { MONOGRAMAS } from '../src/visual/monograma';

const fs = 'node:fs';
const { readFileSync, readdirSync, existsSync } = (await import(/* @vite-ignore */ fs)) as {
  readFileSync: (caminho: URL, codificacao: string) => string;
  readdirSync: (caminho: URL) => string[];
  existsSync: (caminho: URL) => boolean;
};
const raiz = new URL('../', import.meta.url);
const texto = (caminho: string) => readFileSync(new URL(caminho, raiz), 'utf8');
const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const pastaDoCss = new URL('src/visual/', raiz);
const arquivosCss = [...readdirSync(pastaDoCss).filter((a) => a.endsWith('.css')), ...readdirSync(new URL('telas/', pastaDoCss)).map((a) => `telas/${a}`)];
const css = (nome: string) => semComentarios(texto(`src/visual/${nome}`));
const SERIFAS = ['c'] as const;

describe('a fonte do site', () => {
  it('é escolhida numa linha só, entre as combinações do pacote, para cada papel do tipo', () => {
    const fonte = texto('src/lib/visual.ts');
    expect(fonte.match(/^export const FONTES_DO_SITE: FontesDoSite = .+;$/gm)).toHaveLength(1);
    for (const papel of PAPEIS_DAS_FONTES) expect(COMBINACOES_DE_FONTES.map((c) => c.id)).toContain(FONTES_DO_SITE[papel]);
  });

  it('é a combinação C, De cartaz (decisão do Gui, 17/11/2026), a única do pacote: A e B saíram em 26/11/2026', () => {
    expect(FONTES_DO_SITE).toEqual(combinacao('c'));
    expect(nomesDasFontes(FONTES_DO_SITE)).toBe('DM Serif Display, DM Sans, DM Mono e Nothing You Could Do');
    expect(COMBINACOES_DE_FONTES.map((c) => c.id)).toEqual(['c']);
    expect(existsSync(new URL('public/icones/c/favicon.svg', raiz))).toBe(true);
    for (const id of ['a', 'b']) expect(existsSync(new URL(`public/icones/${id}`, raiz)), id).toBe(false);
  });

  it('a página do sistema mostra só as fontes do site, sem seletor e sem pedido pelo endereço', () => {
    const pagina = texto('src/pages/sistema.astro');
    expect(pagina).toContain('<div class="sis__exemplos" {...atributosDasFontes(FONTES_DO_SITE)}>');
    expect(pagina).not.toMatch(/sis__fontes|\?fontes=|searchParams\.get\('fontes'\)/);
    // O texto corrido dos exemplos também leva a fonte, e não só os títulos
    expect(css('telas/sistema.css')).toMatch(/\.sis__exemplos\s*\{\s*font-family:\s*var\(--grotesca\);/);
  });

  it('uma combinação inteira leva os quatro papéis', () => {
    expect(combinacao('c')).toEqual({ serifa: 'c', grotesca: 'c', mono: 'c', mao: 'c' });
    expect(combinacaoDe(combinacao('c'))).toBe('c');
    expect(atributosDasFontes(combinacao('c'))).toEqual({ 'data-serifa': 'c', 'data-grotesca': 'c', 'data-mono': 'c', 'data-mao': 'c' });
  });

  it('nada troca a fonte por pedido: sem rota do conceito, sem cookie, sem faixa de fontes', () => {
    expect(existsSync(new URL('src/pages/conceito', raiz))).toBe(false);
    expect(existsSync(new URL('src/lib/servidor/conceito.ts', raiz))).toBe(false);
    expect(texto('src/layouts/Visual.astro')).not.toMatch(/fontesDoPedido|Cookie|searchParams\.get\('fontes'\)/);
  });

  it('cada papel tem a opção C em fontes.css, com a variável do papel', () => {
    const fontes = css('fontes.css');
    for (const papel of PAPEIS_DAS_FONTES) {
      const bloco = new RegExp(`\\[data-${papel}='c'\\]\\s*\\{([^}]*)\\}`).exec(fontes);
      expect(bloco, papel).not.toBeNull();
      expect([...bloco![1]!.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1])).toContain(`--${papel}`);
      for (const outra of ['a', 'b']) expect(fontes, `${papel} ${outra}`).not.toContain(`[data-${papel}='${outra}']`);
    }
  });

  it('o esqueleto leva as fontes e o ícone da serifa do site, sem nome de fonte escrito', () => {
    const esqueleto = texto('src/layouts/Visual.astro');
    expect(esqueleto).toContain('{...atributosDasFontes(FONTES_DO_SITE)}');
    expect(esqueleto).toContain('const icones = `/icones/${FONTES_DO_SITE.serifa}`;');
    expect(esqueleto).toMatch(/^import '\.\.\/visual\/sistema';$/m);
    expect(esqueleto).not.toMatch(/@fontsource|data-fontes/);
  });
});

describe('assinatura do nome', () => {
  const nucleos = [
    { id: 'bayara-nascimento', nome: 'Bayara', sobrenomes: ['Bayara'] },
    { id: 'bayara-bracarense', nome: 'Bayara Bracarense', sobrenomes: ['Bayara', 'Bracarense'] },
    { id: 'bracarense', nome: 'Bracarense', sobrenomes: ['Bracarense'] },
  ];

  it('na família completa, junta os sobrenomes sem repetir, com & antes do último', () => {
    expect(assinaturaDaTela([], nucleos)).toEqual({ sobrenomes: 'Bayara & Bracarense', porExtenso: 'Memórias Bayara e Bracarense', familia: 'tudo' });
  });

  it('numa família só, o nome dela como é, sem &, e a cor dela', () => {
    expect(assinaturaDaTela(['bayara-nascimento'], nucleos)).toMatchObject({ sobrenomes: 'Bayara', familia: '0' });
    expect(assinaturaDaTela(['bayara-bracarense'], nucleos)).toMatchObject({ sobrenomes: 'Bayara Bracarense', porExtenso: 'Memórias Bayara Bracarense', familia: '1' });
    expect(assinaturaDaTela(['bracarense'], nucleos)).toMatchObject({ sobrenomes: 'Bracarense', familia: '2' });
  });

  it('com mais de uma família na tela, os sobrenomes delas, na ordem dos lados da árvore', () => {
    expect(assinaturaDaTela(['bracarense', 'bayara-nascimento'], nucleos)).toMatchObject({ sobrenomes: 'Bayara & Bracarense', familia: 'tudo' });
    expect(assinaturaDaTela(['bayara-nascimento', 'bayara-bracarense'], nucleos).sobrenomes).toBe('Bayara & Bracarense');
  });

  it('núcleo desconhecido não muda nada: vale a família completa', () => {
    expect(assinaturaDaTela(['outro'], nucleos)).toMatchObject({ sobrenomes: 'Bayara & Bracarense', familia: 'tudo' });
  });

  it('uma terceira família, por um casamento, entra sozinha, com vírgula e &', () => {
    const comSilva = [...nucleos, { id: 'bracarense-silva', nome: 'Bracarense Silva', sobrenomes: ['Bracarense', 'Silva'] }];
    expect(assinaturaDaTela([], comSilva).sobrenomes).toBe('Bayara, Bracarense & Silva');
    expect(assinaturaDaTela(['bracarense-silva'], comSilva)).toMatchObject({ sobrenomes: 'Bracarense Silva', familia: '3' });
    expect(assinaturaDaTela(['bracarense', 'bracarense-silva'], comSilva).sobrenomes).toBe('Bracarense & Silva');
  });

  it('núcleo sem sobrenomes cadastrados usa as palavras do nome', () => {
    expect(assinaturaDaTela([], [{ id: 'a', nome: 'Bayara' }, { id: 'b', nome: 'Bayara Bracarense', sobrenomes: [] }]).sobrenomes).toBe('Bayara & Bracarense');
  });

  it('a linha de referência e as mais curtas não encolhem; a mais longa encolhe para caber', () => {
    for (const serifa of SERIFAS) {
      expect(encolheDaAssinatura(SOBRENOMES_DE_REFERENCIA)[serifa]).toBe(1);
      expect(encolheDaAssinatura('Bayara')[serifa]).toBe(1);
      const longa = encolheDaAssinatura('Bayara, Bracarense & Silva')[serifa];
      expect(longa).toBeLessThan(1);
      expect(longa).toBeGreaterThan(0.6);
      // Encolhida, a linha longa mede o mesmo que a de referência
      expect(larguraNaSerifa('Bayara, Bracarense & Silva', serifa) * longa).toBeCloseTo(larguraNaSerifa(SOBRENOMES_DE_REFERENCIA, serifa), 1);
    }
  });

  it('a tabela de larguras cobre as letras dos sobrenomes de hoje', () => {
    for (const serifa of SERIFAS) for (const letra of 'Bayara, Bracarense & Silva-ÁÉÍÓÚÃÕÇáéíóúãõç') expect(LARGURAS_DAS_LETRAS[serifa][letra], `${serifa} ${letra}`).toBeGreaterThan(0);
  });

  it('a migração dá os sobrenomes aos três núcleos, e o repositório lê a lista', () => {
    const banco = texto('src/lib/servidor/banco.ts');
    const migracao = banco.slice(banco.indexOf("id: '018-sobrenomes-dos-nucleos'"));
    expect(migracao).toContain('ALTER TABLE nucleos ADD COLUMN sobrenomes TEXT');
    for (const id of ['bayara-nascimento', 'bayara-bracarense', 'bracarense']) expect(migracao).toMatch(new RegExp(`UPDATE nucleos SET sobrenomes = '\\[[^\\]]+\\]' WHERE id = '${id}'`));
    expect(texto('src/lib/servidor/repositorio.ts')).toContain("'SELECT id, nome, sobrenomes FROM nucleos ORDER BY ordem, nome'");
  });

  it('só os administradores mudam os sobrenomes de uma família', () => {
    const rota = texto('src/pages/api/nucleos.ts');
    expect(rota).toMatch(/if \(!mesmaOrigem\(request\)\) return new Response\('Pedido recusado\.', \{ status: 403 \}\);/);
    expect(rota.indexOf('if (!usuario.admin) return')).toBeGreaterThan(0);
    expect(rota.indexOf('if (!usuario.admin) return')).toBeLessThan(rota.indexOf('atualizarSobrenomesDoNucleo(id'));
    expect(texto('src/pages/admin/familias.astro')).toContain("if (!usuario.admin) return new Response('Página não encontrada', { status: 404 });");
  });

  it('a lista de sobrenomes escrita pelo administrador é lida sem repetir e recusa o que não é nome', () => {
    expect(lerListaDeSobrenomes('Bayara, Bracarense')).toEqual({ sobrenomes: ['Bayara', 'Bracarense'] });
    expect(lerListaDeSobrenomes(' Bayara ,, bayara ,  D’Ávila ')).toEqual({ sobrenomes: ['Bayara', 'D’Ávila'] });
    expect(lerListaDeSobrenomes('')).toHaveProperty('erro');
    expect(lerListaDeSobrenomes('Bayara, <b>')).toHaveProperty('erro');
    expect(lerListaDeSobrenomes('A, B, C, D, E')).toHaveProperty('erro');
  });
});

describe('cor da família', () => {
  const ordem = ['bayara-nascimento', 'bayara-bracarense', 'bracarense'];
  it('a cor de um núcleo é a posição dele; desconhecido, as famílias juntas', () => {
    expect(corDoNucleo('bayara-nascimento', ordem)).toBe('0');
    expect(corDoNucleo('bracarense', ordem)).toBe('2');
    expect(corDoNucleo('outro', ordem)).toBe('tudo');
    expect(corDoNucleo(undefined, ordem)).toBe('tudo');
  });

  it('a cor de uma pessoa é a do primeiro núcleo dela, na ordem das famílias', () => {
    expect(corDaPessoa(['bracarense', 'bayara-bracarense'], ordem)).toBe('1');
    expect(corDaPessoa([], ordem)).toBe('tudo');
  });

  it('toda posição de família que as funções devolvem tem cor em tokens.css', () => {
    const tokens = css('tokens.css');
    for (const id of ['tudo', '0', '1', '2', '3']) expect(tokens).toMatch(new RegExp(`\\[data-familia='${id}'\\]\\s*\\{[^}]*--pastel:[^}]*--meio:[^}]*--vivo:[^}]*--vivo-tinta:`));
  });
});

describe('monograma', () => {
  it('existe para a serifa do site, nos dois cortes, numa caixa de altura 100 e num caminho só', () => {
    for (const serifa of SERIFAS) {
      for (const corte of ['normal', 'pequeno'] as const) {
        const m = MONOGRAMAS[serifa][corte];
        expect(m.d, `${serifa} ${corte}`).toMatch(/^M[\d. -]+[LQ]/);
        expect(m.d.endsWith('Z')).toBe(true);
        expect(m.altura).toBeGreaterThanOrEqual(100);
        expect(m.altura).toBeLessThan(108);
        expect(m.largura).toBeGreaterThan(70);
        expect(m.largura).toBeLessThan(140);
      }
      // O corte pequeno é mais firme que o de título: pelo contorno ou pelo desenho
      expect(MONOGRAMAS[serifa].pequeno.traco > 0 || MONOGRAMAS[serifa].pequeno.d !== MONOGRAMAS[serifa].normal.d).toBe(true);
    }
  });

  it('o ícone do site existe para cada serifa, e o SVG é o M numa cor só, que troca no tema escuro', () => {
    const tokens = texto('src/visual/tokens.css');
    const tinta = /--tinta:\s*(#[0-9a-f]{6});/.exec(tokens)![1]!;
    const papel = /--creme:\s*(#[0-9a-f]{6});/.exec(tokens)![1]!;
    for (const serifa of SERIFAS) {
      for (const arquivo of ['favicon.svg', 'favicon-48.png', 'apple-touch-icon.png']) expect(existsSync(new URL(`public/icones/${serifa}/${arquivo}`, raiz)), `${serifa}/${arquivo}`).toBe(true);
      const svg = texto(`public/icones/${serifa}/favicon.svg`);
      expect(svg.match(/<path /g)).toHaveLength(1);
      // As cores do ícone são as dos tokens: se a tinta ou o papel mudarem, "npm run monograma" refaz
      expect(svg).toContain(`fill:${tinta}`);
      expect(svg).toContain(`@media (prefers-color-scheme:dark){g{color:${papel};fill:${papel}}}`);
    }
  });

  it('no topo, o celular mostra o monograma desenhado, e não a letra da fonte', () => {
    const esqueleto = texto('src/layouts/Visual.astro');
    expect(esqueleto).toMatch(/<span class="topo__monograma" aria-hidden="true">\s*<Monograma \/>\s*<\/span>/);
    // Um M só, o da serifa do site: nada de três desenhos escondidos por CSS
    expect(texto('src/components/visual/Monograma.astro')).toContain('MONOGRAMAS[FONTES_DO_SITE.serifa][corte]');
    expect(Object.keys(MONOGRAMAS)).toEqual(['c']);
    expect(css('fontes.css') + css('pecas.css')).not.toMatch(/--m-[abc]|data-da-serifa/);
  });
});

describe('tokens e peças', () => {
  const fontesDasTelas = import.meta.glob<string>(['../src/layouts/Visual.astro', '../src/components/visual/*.astro', '../src/pages/sistema.astro', '../src/pages/explorar.astro', '../src/pages/memorias/[[]id].astro', '../src/pages/index.astro', '../src/pages/carta.astro', '../src/pages/conta.astro', '../src/pages/pessoas/[[]id]/index.astro', '../src/pages/capitulos/index.astro', '../src/pages/capitulos/[[]id]/index.astro', '../src/pages/temas/[[]id].astro', '../src/pages/pessoas/index.astro', '../src/pages/arvore.astro', '../src/pages/nova.astro', '../src/pages/memorias/[[]id]/relato.astro', '../src/pages/capitulos/novo.astro', '../src/pages/capitulos/[[]id]/editar.astro', '../src/pages/pessoas/nova.astro', '../src/pages/pessoas/[[]id]/editar.astro', '../src/pages/memorias/[[]id]/historico.astro', '../src/pages/memorias/[[]id]/excluir.astro', '../src/pages/capitulos/[[]id]/excluir.astro', '../src/pages/lixeira.astro', '../src/pages/admin/*.astro', '../src/components/FichaDoIntegrante.astro', '../src/components/CampoRetrato.astro', '../src/components/ConfirmarRemocao.astro', '../src/components/ComoSeReferir.astro', '../src/components/formularios/*.astro', '../src/components/FichaDoCapitulo.astro', '../src/components/capitulos/*.astro', '../src/components/Carta.astro', '../src/components/explorar/*.astro', '../src/lib/visual.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  const tudo = [...arquivosCss.map(css), ...Object.values(fontesDasTelas)].join('\n');

  it('toda variável usada no visual novo é definida em algum lugar', () => {
    const definidas = new Set([...tudo.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    // As que o script da linha do tempo põe na página, as que a assinatura põe em si mesma e o
    // progresso da frase da nova memória
    const postasPorScript = ['--alt', '--barra-alt', '--encolhe-c', '--retrato-cor', '--feito', '--letras'];
    const usadas = new Set([...tudo.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]!).filter((v) => !v.endsWith('-')));
    const soltas = [...usadas].filter((v) => !definidas.has(v) && !postasPorScript.includes(v));
    expect(soltas).toEqual([]);
  });

  it('as larguras de tela são as do sistema: 40rem, 62rem e 100rem', () => {
    for (const arquivo of arquivosCss) {
      for (const m of css(arquivo).matchAll(/@media[^{]*\((min|max)-width:\s*([^)]+)\)/g)) expect(['40rem', '62rem', '61.99rem', '100rem'], `${arquivo}: ${m[0]}`).toContain(m[2]!.trim());
    }
  });

  it('raio de cápsula e tamanho do menu vêm dos tokens', () => {
    for (const arquivo of arquivosCss.filter((a) => a !== 'tokens.css')) {
      expect(css(arquivo), arquivo).not.toMatch(/999px/);
      expect(css(arquivo), arquivo).not.toMatch(/font-size:\s*0\.9375rem/);
    }
  });

  it('cada peça de docs/visual.md tem o seu componente', () => {
    const componentes = readdirSync(new URL('src/components/visual/', raiz));
    for (const peca of ['Assinatura', 'Monograma', 'Polaroid', 'Carimbo', 'Etiqueta', 'Pilula', 'Ficha', 'Dado', 'Retrato', 'Gente', 'Bilhete', 'Sanfona', 'SinalDoCapitulo', 'Recado', 'Vazio', 'IconeDoTipo', 'Rabisco', 'Trilhos']) {
      expect(componentes, peca).toContain(`${peca}.astro`);
    }
  });

  it('toda peça do sistema aparece na página do sistema', () => {
    // docs/visual.md, "A página do sistema fica": ela acompanha o sistema. Os trilhos são da linha do tempo.
    const pagina = texto('src/pages/sistema.astro');
    const componentes = readdirSync(new URL('src/components/visual/', raiz)).map((a) => a.replace('.astro', ''));
    for (const peca of componentes.filter((c) => c !== 'Trilhos')) expect(pagina, peca).toContain(`<${peca}`);
  });

  it('a página do sistema: fora das prévias, só os administradores, e nada do acervo', () => {
    const pagina = texto('src/pages/sistema.astro');
    expect(pagina).toMatch(/const comExemplos = temAcervoDeExemplo\(\);\nif \(!comExemplos && !usuario\.admin\) return naoEncontrado\(\);/);
    // A única leitura do acervo é a memória de exemplo da foto revelada, e só onde há acervo de exemplo
    expect(pagina.match(/listar[A-Z]\w+\(/g)).toEqual(['listarNucleos(', 'listarMemorias(']);
    expect(pagina).toMatch(/const memorias = comExemplos \? \(await listarMemorias\(usuario\)\)/);
    expect(pagina).not.toMatch(/\/fotos\/|\/retratos\/|exemplos\//);
    expect(texto('src/lib/servidor/ambiente.ts')).toMatch(/export function temAcervoDeExemplo\(\): boolean \{\n  return AMBIENTES_COM_EXEMPLOS\.includes\(ambiente\(\)\) && !ehHomologacao\(\);/);
  });

  it('as telas usam as peças, sem reescrever a marcação delas', () => {
    const telas = Object.entries(fontesDasTelas).filter(([caminho]) => caminho.includes('/pages/') || caminho.includes('/components/explorar/') || caminho.includes('/layouts/'));
    expect(telas.length).toBeGreaterThanOrEqual(6);
    for (const [caminho, fonte] of telas) {
      expect(fonte, caminho).not.toMatch(/class="(carimbo|etiqueta|audio|bilhete|bilhete__assina|assinatura|sinal|verso)"/);
      expect(fonte, caminho).not.toMatch(/class="retrato[ "]/);
    }
  });

  it('a sanfona abre sem script e só uma por vez, e o tocável tem 44 px', () => {
    const sanfona = texto('src/components/visual/Sanfona.astro');
    expect(sanfona).toMatch(/<details class="sanfona" name=\{grupo\}/);
    const pecas = css('pecas.css');
    for (const peca of ['.sanfona summary', '.escolha', '.frase__lacuna input']) {
      const regra = new RegExp(`${peca.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`).exec(pecas);
      expect(regra?.[1], peca).toMatch(/min-height:\s*var\(--toque\)/);
    }
    expect(pecas).toMatch(/\.campo__entrada\s*\{[^}]*min-height:\s*3\.5rem/);
  });

  it('o campo que tira o contorno do foco põe outro sinal no lugar', () => {
    const pecas = css('pecas.css');
    for (const regra of pecas.matchAll(/([^{}]+):focus-visible\s*\{([^}]*)\}/g)) {
      if (/outline:\s*0/.test(regra[2]!)) expect(regra[2], regra[1]).toMatch(/box-shadow:\s*0 3px 0 var\(--tinta\)/);
    }
  });
});

describe('as fontes da primeira tela (causa 7 da medição M1, sessão D1a)', () => {
  it('o pacote carrega só a combinação C: as fontes de A e B saíram do código e do package.json', () => {
    const sistema = texto('src/visual/sistema.ts');
    expect(sistema).toMatch(/@fontsource\/dm-serif-display\/400\.css/);
    const fontesFora = /fraunces|geist|instrument|ibm-plex|oooh-baby|reenie-beanie|bricolage|literata/;
    expect(sistema).not.toMatch(fontesFora);
    expect(texto('package.json')).not.toMatch(fontesFora);
    expect(existsSync(new URL('src/visual/fontes-para-comparar.ts', raiz))).toBe(false);
    const todos = import.meta.glob<string>(['../src/**/*.astro', '../src/**/*.ts', '../src/**/*.css'], { query: '?raw', import: 'default', eager: true });
    for (const [caminho, fonte] of Object.entries(todos)) expect(fonte, caminho).not.toMatch(/@fontsource[^'"]*\/(fraunces|geist|instrument|ibm-plex|oooh-baby|reenie-beanie|bricolage|literata)/);
  });

  it('o esqueleto pede antes a serifa da assinatura e a grotesca do texto', () => {
    const esqueleto = texto('src/layouts/Visual.astro');
    expect(esqueleto).toMatch(/fontesParaPedirAntes\(\)\.map\(\(arquivo\) => <link rel="preload" href=\{arquivo\} as="font" type="font\/woff2" crossorigin \/>\)/);
    const primeira = texto('src/visual/fontes-da-primeira-tela.ts');
    expect(primeira).toContain("'@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2?url'");
    expect(primeira).toContain("'@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2?url'");
    // Os mesmos arquivos que o CSS das fontes usa: o preload não baixa uma fonte a mais
    expect(texto('node_modules/@fontsource/dm-serif-display/400.css')).toContain('dm-serif-display-latin-400-normal.woff2');
    expect(texto('node_modules/@fontsource-variable/dm-sans/wght.css')).toContain('dm-sans-latin-wght-normal.woff2');
  });
});
