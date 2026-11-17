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
  combinacaoValida,
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
const SERIFAS = ['a', 'b', 'c'] as const;

describe('a fonte do site', () => {
  it('é escolhida numa linha só, entre as três combinações, para cada papel do tipo', () => {
    const fonte = texto('src/lib/visual.ts');
    expect(fonte.match(/^export const FONTES_DO_SITE: FontesDoSite = .+;$/gm)).toHaveLength(1);
    for (const papel of PAPEIS_DAS_FONTES) expect(COMBINACOES_DE_FONTES.map((c) => c.id)).toContain(FONTES_DO_SITE[papel]);
  });

  it('uma combinação inteira leva os quatro papéis, e dá para misturar', () => {
    expect(combinacao('b')).toEqual({ serifa: 'b', grotesca: 'b', mono: 'b', mao: 'b' });
    expect(combinacaoDe(combinacao('c'))).toBe('c');
    const mistura = { ...combinacao('a'), mao: 'b' as const };
    expect(combinacaoDe(mistura)).toBeNull();
    expect(atributosDasFontes(mistura)).toEqual({ 'data-serifa': 'a', 'data-grotesca': 'a', 'data-mono': 'a', 'data-mao': 'b' });
    expect(nomesDasFontes(mistura)).toBe('Fraunces, Geist, Geist Mono e Reenie Beanie');
  });

  it('a faixa de teste só aceita as três combinações', () => {
    expect(combinacaoValida('b')).toBe('b');
    expect(combinacaoValida('z')).toBeNull();
    expect(combinacaoValida(undefined)).toBeNull();
  });

  it('fora das prévias de teste, o cookie da faixa não troca a fonte', () => {
    const conceito = texto('src/lib/servidor/conceito.ts');
    expect(conceito).toMatch(/export function fontesDoPedido[\s\S]*if \(!conceitoDisponivel\(\)\) return FONTES_DO_SITE;/);
  });

  it('cada papel tem as três opções em fontes.css, com as mesmas variáveis', () => {
    const fontes = css('fontes.css');
    for (const papel of PAPEIS_DAS_FONTES) {
      const variaveis = SERIFAS.map((id) => {
        const bloco = new RegExp(`\\[data-${papel}='${id}'\\]\\s*\\{([^}]*)\\}`).exec(fontes);
        expect(bloco, `${papel} ${id}`).not.toBeNull();
        return [...bloco![1]!.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]).sort();
      });
      expect(variaveis[1], papel).toEqual(variaveis[0]);
      expect(variaveis[2], papel).toEqual(variaveis[0]);
      expect(variaveis[0]).toContain(`--${papel}`);
    }
  });

  it('o esqueleto leva as fontes e o ícone da serifa em uso, sem nome de fonte escrito', () => {
    const esqueleto = texto('src/layouts/Visual.astro');
    expect(esqueleto).toContain('{...atributosDasFontes(fontes)}');
    expect(esqueleto).toContain('const icones = `/icones/${fontes.serifa}`;');
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

  it('a tabela de larguras cobre as letras dos sobrenomes de hoje, nas três serifas', () => {
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
  it('existe para as três serifas, nos dois cortes, numa caixa de altura 100 e num caminho só', () => {
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
      // O corte pequeno é mais firme que o de título: na Fraunces pelo desenho, nas outras pelo contorno
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
    // Cada serifa acende o monograma dela
    const fontes = css('fontes.css');
    for (const serifa of SERIFAS) expect(fontes).toMatch(new RegExp(`\\[data-serifa='${serifa}'\\]\\s*\\{[^}]*--m-${serifa}: block;`));
  });
});

describe('tokens e peças', () => {
  const fontesDasTelas = import.meta.glob<string>(['../src/layouts/Visual.astro', '../src/components/visual/*.astro', '../src/pages/conceito/**/*.astro', '../src/pages/sistema.astro', '../src/pages/explorar.astro', '../src/pages/memorias/[[]id].astro', '../src/pages/index.astro', '../src/pages/carta.astro', '../src/pages/conta.astro', '../src/pages/pessoas/[[]id]/index.astro', '../src/components/Carta.astro', '../src/components/explorar/*.astro', '../src/lib/visual.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  const tudo = [...arquivosCss.map(css), ...Object.values(fontesDasTelas)].join('\n');

  it('toda variável usada no visual novo é definida em algum lugar', () => {
    const definidas = new Set([...tudo.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    // As que o script da linha do tempo põe na página e as que a assinatura põe em si mesma
    const postasPorScript = ['--alt', '--barra-alt', '--encolhe-a', '--encolhe-b', '--encolhe-c'];
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
    for (const peca of ['Assinatura', 'Monograma', 'Polaroid', 'Carimbo', 'Etiqueta', 'Pilula', 'Ficha', 'Dado', 'Retrato', 'Gente', 'Bilhete', 'Audio', 'Sanfona', 'SinalDoCapitulo', 'Recado', 'Vazio', 'IconeDoTipo', 'Rabisco', 'Trilhos']) {
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
