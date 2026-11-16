// O visual novo (docs/visual.md): as funções puras das telas do conceito e as regras do CSS novo.
import { describe, expect, it } from 'vitest';
import {
  CORES,
  GIROS,
  carimboDaData,
  corDoTipo,
  diaMesCurto,
  estiloDoTipo,
  familiaDaTela,
  fontesValidas,
  formaDoId,
  giroDoId,
  legendaLugarAno,
  listaCurta,
  sobrenomesDaAssinatura,
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

describe('assinatura do nome', () => {
  it('junta os sobrenomes sem repetir, na ordem dos núcleos, com & antes do último', () => {
    expect(sobrenomesDaAssinatura(['Bayara', 'Bayara Bracarense', 'Bracarense'])).toBe('Bayara & Bracarense');
    expect(sobrenomesDaAssinatura(['Bayara'])).toBe('Bayara');
    expect(sobrenomesDaAssinatura(['Bracarense'])).toBe('Bracarense');
    expect(sobrenomesDaAssinatura(['Bayara Bracarense'])).toBe('Bayara & Bracarense');
    // Uma terceira família, por um casamento
    expect(sobrenomesDaAssinatura(['Bayara', 'Bayara Bracarense', 'Bracarense', 'Bracarense Silva'])).toBe('Bayara, Bracarense & Silva');
  });
});

describe('cor da tela', () => {
  const ordem = ['bayara-nascimento', 'bayara-bracarense', 'bracarense'];
  it('um núcleo só dá a cor dele; nenhum ou vários, as famílias juntas', () => {
    expect(familiaDaTela(['bayara-nascimento'], ordem)).toBe('0');
    expect(familiaDaTela(['bracarense'], ordem)).toBe('2');
    expect(familiaDaTela([], ordem)).toBe('tudo');
    expect(familiaDaTela(['bayara-nascimento', 'bracarense'], ordem)).toBe('tudo');
    expect(familiaDaTela(['outro'], ordem)).toBe('tudo');
  });
});

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

describe('combinações de fontes', () => {
  it('só aceita as três do conceito', () => {
    expect(fontesValidas('b')).toBe('b');
    expect(fontesValidas('z')).toBe('a');
    expect(fontesValidas(undefined)).toBe('a');
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
        const combinado = regra.includes('.decadas') || regra.includes('.ano__cabeca');
        expect(combinado || (comCursor && dentroDaMidia), `${arquivo}: ${regra.trim().slice(0, 60)}`).toBe(true);
      }
    }
  });
});

describe('conceito', () => {
  const paginas = import.meta.glob<string>('../src/pages/conceito/**/*.{astro,ts}', { query: '?raw', import: 'default', eager: true });

  it('toda rota do conceito responde 404 onde não há acervo de exemplo', () => {
    const rotas = Object.entries(paginas);
    expect(rotas.length).toBeGreaterThanOrEqual(5);
    for (const [caminho, fonte] of rotas) expect(fonte, caminho).toMatch(/if \(!conceitoDisponivel\(\)[^\n]*return naoEncontrado\(\);/);
  });

  it('a linha do tempo deixa filtrar por qualquer família, sem mudar quem vê o quê', () => {
    // Decisão do Gui, 16/11/2026. O filtro passa pelo listarMemorias, que só devolve o que a pessoa pode ver.
    const linha = Object.entries(paginas).find(([caminho]) => caminho.endsWith('conceito/tudo.astro'))![1];
    expect(linha).toContain('const nucleo = nucleos.find((n) => n.id === pedido);');
    expect(linha).toContain('await listarMemorias(usuario, { nucleo: nucleo?.id })');
    expect(linha).not.toMatch(/usuario\.nucleos\.includes/);
  });

  it('memória sem foto ganha o cartão com o ícone do tipo, na linha do tempo e no painel', () => {
    // Pedido do Gui, 16/11/2026: nenhuma memória fica com um buraco onde as outras têm foto
    const componentes = import.meta.glob<string>('../src/components/visual/Polaroid.astro', { query: '?raw', import: 'default', eager: true });
    const foto = Object.values(componentes)[0]!;
    expect(foto).toContain('polaroid--sem-foto');
    expect(foto).toContain('<IconeDoTipo tipo={tipo} />');
    const pagina = (fim: string) => Object.entries(paginas).find(([caminho]) => caminho.endsWith(fim))![1];
    expect(pagina('conceito/tudo.astro')).toMatch(/<Polaroid id=\{m\.id\}[^>]*tipo=\{m\.tipo\}/);
    expect(pagina('conceito/tudo.astro')).not.toContain('entrada--so-texto');
    expect(pagina('conceito/index.astro')).toMatch(/outro-ano__foto">\s*<Polaroid[^>]*tipo=\{m\.tipo\}/);
  });

  it('o topo leva à conta pelo retrato de quem está logado, e "Rascunhos" não está no menu', () => {
    // Decisão do Gui, 16/11/2026 ("Sua conta", em docs/decisoes.md)
    const topo = Object.values(import.meta.glob<string>('../src/layouts/Visual.astro', { query: '?raw', import: 'default', eager: true }))[0]!;
    expect(topo).toMatch(/<a class="topo__conta" href="\/conceito\/conta"/);
    expect(topo.slice(topo.indexOf('const menu = ['), topo.indexOf('const telas = ['))).not.toContain('rascunhos');
    // A administração e a lixeira saem do rodapé: passam a morar na conta
    expect(topo.slice(topo.indexOf('<footer'))).not.toMatch(/lixeira|admin\/tipos|api\/copia/);
  });

  it('o menu declara "Início", no computador e no celular', () => {
    // Pedido do Gui, 16/11/2026: "Memórias" leva ao início, mas quem tem menos familiaridade não precisa adivinhar
    const topo = Object.values(import.meta.glob<string>('../src/layouts/Visual.astro', { query: '?raw', import: 'default', eager: true }))[0]!;
    const menu = topo.slice(topo.indexOf('const menu = ['), topo.indexOf('const telas = ['));
    expect(menu).toMatch(/\{ href: '\/conceito', texto: 'Início'/);
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

  it('as telas novas não levam o CSS antigo', () => {
    const fontes = import.meta.glob<string>(['../src/layouts/Visual.astro', '../src/components/visual/*.astro', '../src/pages/conceito/**/*.astro'], {
      query: '?raw',
      import: 'default',
      eager: true,
    });
    for (const [caminho, fonte] of Object.entries(fontes)) expect(fonte, caminho).not.toMatch(/^import[^;\n]*(styles\/global\.css|layouts\/Base\.astro)/m);
  });
});
