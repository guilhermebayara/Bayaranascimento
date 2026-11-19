// Os rabiscos por assunto (decisão do Gui, 18/11/2026): sem biblioteca, todos no mesmo traço, cada um
// com nome e assunto, e o seletor de /admin/tipos arrumado em grupos que respeitam a proximidade
// (docs/visual.md, "Gestalt em toda tela"). O traço de cada desenho também é conferido em
// testes/tipos.test.ts.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSUNTOS, RABISCOS, rabiscosPorAssunto } from '../src/visual/rabiscos';

const ler = (caminho: string) => readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8');
const tokens = ler('visual/tokens.css');
/** O valor de um espaço fixo de tokens.css, em rem */
const espaco = (nome: string) => Number(new RegExp(`--${nome}:\\s*([\\d.]+)rem;`).exec(tokens)![1]);

describe('os rabiscos por assunto', () => {
  it('são pelo menos 80, e nenhum repete id, nome ou desenho', () => {
    expect(RABISCOS.length).toBeGreaterThanOrEqual(80);
    for (const campo of ['id', 'nome', 'desenho'] as const) expect(new Set(RABISCOS.map((r) => r[campo])).size, campo).toBe(RABISCOS.length);
  });

  it('todo rabisco tem nome em português e um assunto da lista', () => {
    const assuntos = ASSUNTOS.map((a) => a.id) as readonly string[];
    for (const r of RABISCOS) {
      expect(r.nome.trim(), r.id).toBe(r.nome);
      expect(r.nome, r.id).toMatch(/^\p{Lu}[\p{L} ]+$/u);
      expect(assuntos, r.id).toContain(r.assunto);
    }
  });

  it('os assuntos pedidos estão todos lá, cada um com pelo menos quatro desenhos, e nenhum rabisco fica de fora', () => {
    const nomes = ASSUNTOS.map((a) => a.nome);
    for (const pedido of ['Família', 'Casa', 'Trabalho', 'Escola', 'Saúde', 'Bichinhos', 'Viagens', 'Comida', 'Música', 'Esporte', 'Fé', 'Festas']) expect(nomes).toContain(pedido);
    expect(new Set(nomes).size).toBe(nomes.length);
    const grupos = rabiscosPorAssunto();
    for (const g of grupos) expect(g.rabiscos.length, g.nome).toBeGreaterThanOrEqual(4);
    expect(grupos.flatMap((g) => g.rabiscos.map((r) => r.id)).sort()).toEqual(RABISCOS.map((r) => r.id).sort());
  });

  it('todos no mesmo traço: só linhas e formas abertas, dentro da caixa de 24 por 24, sem transformação', () => {
    for (const r of RABISCOS) {
      expect(r.desenho, r.id).toMatch(/^(<(path|circle|ellipse) [^>]+\/>)+$/);
      expect(r.desenho, r.id).not.toMatch(/fill=|stroke=|style=|class=|transform=/);
      // A única espessura própria é a dos pontos
      for (const [, espessura] of r.desenho.matchAll(/stroke-width="([^"]+)"/g)) expect(espessura, r.id).toBe('2.2');
      // Todo traço começa dentro da caixa, com folga para a ponta redonda
      for (const [, x, y] of r.desenho.matchAll(/M([\d.]+) ([\d.]+)/g)) {
        for (const n of [Number(x), Number(y)]) {
          expect(n, r.id).toBeGreaterThanOrEqual(2.5);
          expect(n, r.id).toBeLessThanOrEqual(21.5);
        }
      }
    }
  });

  it('em fé os símbolos são neutros, e nada remete a cemitério', () => {
    const fe = RABISCOS.filter((r) => r.assunto === 'fe').map((r) => r.nome);
    expect(fe).toEqual(expect.arrayContaining(['Vela', 'Mãos unidas', 'Pomba', 'Livro com fita']));
    for (const nome of fe) expect(nome).not.toMatch(/cruz|crucifixo|terço|igreja|templo|bíblia|menorá|crescente/i);
    for (const r of RABISCOS) expect(r.nome, r.id).not.toMatch(/cemit|túmulo|lápide|caixão|cova|jazigo/i);
  });
});

describe('o seletor de desenhos, em /admin/tipos', () => {
  const css = ler('visual/telas/tipos.css');
  const regra = (seletor: string) => new RegExp(`\\.pagina-de-formulario ${seletor.replace(/[.]/g, '\\.')} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  const vao = (seletor: string) => espaco(/gap: var\(--(e-\d)\)/.exec(regra(seletor))![1]!);

  it('proximidade: entre os assuntos, pelo menos o dobro do espaço de dentro de um assunto', () => {
    const entreAssuntos = vao('.rabiscos__assuntos');
    // Do rótulo para a grade que ele nomeia, e de um quadrado para o outro
    expect(entreAssuntos).toBeGreaterThanOrEqual(2 * vao('.rabiscos__assunto'));
    expect(entreAssuntos).toBeGreaterThanOrEqual(2 * vao('.rabiscos__grade'));
    // O rótulo fica mais perto da grade dele do que os quadrados entre si: é ele que nomeia
    expect(vao('.rabiscos__assunto')).toBeLessThanOrEqual(vao('.rabiscos__grade'));
  });

  it('o rótulo do assunto é em mono, e cada quadrado tem o tamanho do toque', () => {
    expect(regra('.rabiscos__rotulo')).toMatch(/font-family: var\(--mono\)/);
    expect(regra('.rabiscos__grade')).toMatch(/minmax\(var\(--toque\), 1fr\)/);
    expect(regra('.rabisco-a-escolher')).toMatch(/min-height: var\(--toque\)/);
    expect(espaco('toque')).toBeGreaterThanOrEqual(2.75);
  });
});
