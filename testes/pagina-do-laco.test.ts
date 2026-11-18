// A página do laço (onda 2, decisão do Gui de 17/11/2026): a linha do tempo das duas pessoas com as fases
// do casal como faixas. Regras em src/lib/pagina-do-laco.ts; a página só mostra o que quem olha vê.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { enderecoDoLaco, faixasDasFases, marcasDosAnos, periodoDoLaco, posicao } from '../src/lib/pagina-do-laco';

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
  it('o período junta faixas e memórias, com folga, e a régua marca os anos', () => {
    const p = periodoDoLaco([], [2018, 2022], 2026)!;
    expect(p).toEqual({ de: 2017, ate: 2023 });
    expect(posicao(2017, p)).toBe(0);
    expect(posicao(2023, p)).toBe(100);
    expect(marcasDosAnos(p)).toEqual([2020]);
    expect(periodoDoLaco([], [], 2026)).toBeNull();
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
  it('chega-se pela ficha da árvore e pela edição do casal', () => {
    expect(readFileSync('src/lib/cliente/arvore.ts', 'utf-8')).toContain("textContent: 'Ver o laço'");
    expect(readFileSync('src/pages/pessoas/[id]/editar.astro', 'utf-8')).toContain('enderecoDoLaco(pessoa.id, c.outro)');
  });
});
