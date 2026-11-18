// A página do laço (onda 2, decisão do Gui de 17/11/2026): a história das duas pessoas, com as fases do
// casal em sanfona e as memórias dos dois como marcos. Regras em src/lib/pagina-do-laco.ts; a página só
// mostra o que quem olha vê.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { enderecoDoLaco, faixasDasFases, memoriasDasFases, periodoDoLaco } from '../src/lib/pagina-do-laco';

describe('as faixas das fases', () => {
  it('cada fase vai até a seguinte, a separação é um momento e o que está junto segue até hoje', () => {
    const f = faixasDasFases(
      [
        { tipo: 'namoro', inicioAno: 2010, fimAno: null },
        { tipo: 'casamento', inicioAno: 2014, fimAno: null },
        { tipo: 'separacao', inicioAno: 2020, fimAno: null },
      ],
      2026,
    );
    expect(f.map((x) => [x.tipo, x.de, x.ate, x.aberta])).toEqual([
      ['namoro', 2010, 2014, false],
      ['casamento', 2014, 2020, false],
      ['separacao', 2020, 2020, false],
    ]);
    expect(faixasDasFases([{ tipo: 'casamento', inicioAno: 2015, fimAno: null }], 2026)[0]).toMatchObject({ ate: 2026, aberta: true });
  });
  it('fase sem ano não vira faixa', () => {
    expect(faixasDasFases([{ tipo: 'namoro', inicioAno: null, fimAno: null }], 2026)).toEqual([]);
  });
  it('o período da capa vai do primeiro ano conhecido ao último, ou "a hoje" quando a fase de hoje segue', () => {
    expect(periodoDoLaco([], [2018, 2022])).toBe('2018 a 2022');
    expect(periodoDoLaco([], [2018, 0])).toBe('2018');
    expect(periodoDoLaco([], [])).toBeNull();
    const juntos = faixasDasFases([{ tipo: 'namoro', inicioAno: 1990, fimAno: null }, { tipo: 'casamento', inicioAno: 1994, fimAno: null }], 2026);
    expect(periodoDoLaco(juntos, [1996, 2024])).toBe('1990 a hoje');
    const separados = faixasDasFases([{ tipo: 'casamento', inicioAno: 2012, fimAno: 2017 }, { tipo: 'separacao', inicioAno: 2017, fimAno: null }], 2026);
    expect(periodoDoLaco(separados, [2012, 2014])).toBe('2012 a 2017');
    // Memória antes do namoro ou depois da separação alarga o período
    expect(periodoDoLaco(separados, [2009, 2020])).toBe('2009 a 2020');
  });
  it('cada memória é da fase que valia no ano dela; na virada, da fase que começa', () => {
    const fases = [
      { tipo: 'namoro' as const, inicioAno: 1990, fimAno: null },
      { tipo: 'casamento' as const, inicioAno: 1994, fimAno: null },
    ];
    expect(memoriasDasFases(fases, [2024, 1994, 1992, 1988, 0], 2026)).toEqual([[2], [0, 1]]);
  });
  it('a separação só fica com as memórias do ano dela, e fase sem ano não recebe memória', () => {
    const fases = [
      { tipo: 'namoro' as const, inicioAno: null, fimAno: null },
      { tipo: 'casamento' as const, inicioAno: 2012, fimAno: null },
      { tipo: 'separacao' as const, inicioAno: 2017, fimAno: null },
    ];
    expect(memoriasDasFases(fases, [2020, 2017, 2014], 2026)).toEqual([[], [2], [1]]);
    // Depois da separação veio a amizade, que segue até hoje
    expect(memoriasDasFases([...fases, { tipo: 'amizade' as const, inicioAno: 2019, fimAno: null }], [2020, 2018], 2026)).toEqual([[], [], [], [0]]);
  });
  it('o endereço é sempre o mesmo para o mesmo par', () => {
    expect(enderecoDoLaco('gui', 'elizete')).toBe('/lacos/elizete/gui');
    expect(enderecoDoLaco('elizete', 'gui')).toBe('/lacos/elizete/gui');
  });
  it('a página só usa o que quem olha vê, e some para quem deixou o ex discreto ou fora', () => {
    const pagina = readFileSync('src/pages/lacos/[a]/[b].astro', 'utf-8');
    expect(pagina).toContain('listarIntegrantesQueVe(usuario)');
    expect(pagina).toContain('obterCasalDoPar(a.id, b.id, usuario)');
    expect(pagina).toContain('listarMemorias(usuario)');
    expect(pagina).toMatch(/modos\.has\(b\.id\)[\s\S]*?status: 404/);
    expect(pagina).not.toMatch(/lerCasais|listarIntegrantes\(\)/);
  });
  it('o desenho: capa com os dois retratos, fases em sanfona (uma aberta por vez) e marcos numerados', () => {
    const pagina = readFileSync('src/pages/lacos/[a]/[b].astro', 'utf-8');
    // As peças do sistema, e não marcação solta
    for (const peca of ['Retrato', 'Pilula', 'Sanfona', 'Carimbo', 'Polaroid', 'Vazio']) expect(pagina, peca).toContain(`<${peca} `.trim());
    expect(pagina).toMatch(/<Sanfona [^>]*grupo="fases-do-laco"/);
    expect(pagina).toMatch(/<ol class="marcos" reversed>/);
    // Quem já faleceu é dito ao leitor de tela ao lado do nome
    expect(pagina).toMatch(/jaFaleceu\(i\) && <span class="so-leitor">já faleceu<\/span>/);
    // Os textos de situação continuam vindo da regra (ex-casal.ts), e não da página
    expect(pagina).toContain('situacaoDoCasal(casal)');
    for (const texto of ['Juntos', 'amigos', 'Namorando']) expect(pagina).not.toContain(`'${texto}`);
  });
  it('a capa só fica parada onde há mouse; no toque, nada preso', () => {
    const css = readFileSync('src/visual/telas/laco.css', 'utf-8');
    expect(css.match(/position:\s*sticky/g)).toHaveLength(1);
    expect(css).toMatch(/@media \(min-width: 62rem\) and \(min-height: 45rem\) and \(hover: hover\) and \(pointer: fine\) \{\s*\.laco-pagina \.laco-pagina__capa \{\s*position: sticky;/);
    expect(css).not.toMatch(/position:\s*fixed/);
    // A régua antiga pintava as fases com nomes de cor soltos: a tela usa só os papéis
    expect(css).not.toMatch(/--(rosa|coral|roxo|verde|ardosia)-/);
  });
  it('chega-se pela ficha da árvore e pela edição do casal', () => {
    expect(readFileSync('src/lib/cliente/arvore.ts', 'utf-8')).toContain("textContent: 'Ver o laço'");
    expect(readFileSync('src/pages/pessoas/[id]/editar.astro', 'utf-8')).toContain('enderecoDoLaco(pessoa.id, c.outro)');
  });
});
