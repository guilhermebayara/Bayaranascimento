// A paleta do sistema (src/visual/tokens.css): as onze cores aprovadas pelo Gui em 16/11/2026, as
// doze da paleta ampliada (resposta dele à pergunta 11 do PR #38, 17/11/2026) e mais onze (decisão
// dele de 18/11/2026), entre as quais os administradores escolhem a cor de cada tipo de momento. O contraste é calculado de verdade, pela
// conta da WCAG, sobre os valores escritos em tokens.css.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TONS, contraste, coresDosTokens, distancia, neutroDosTokens } from '../src/lib/contraste';
import { CORES, CORES_MAIS_NOVAS, CORES_NOVAS, NOMES_DAS_CORES, PALETA } from '../src/lib/visual';

const tokens = readFileSync(new URL('../src/visual/tokens.css', import.meta.url), 'utf8');
const cores = coresDosTokens(tokens);
const papel = neutroDosTokens(tokens, 'creme');
const branco = neutroDosTokens(tokens, 'branco');
const tinta = neutroDosTokens(tokens, 'tinta');
const pares = (nomes: readonly string[]) => nomes.flatMap((a, i) => nomes.slice(i + 1).map((b) => [a, b] as const));

// Quatro das onze cores aprovadas tinham a tinta abaixo de 4,5 para um sobre o próprio pastel
// (pêssego, coral, rosa e manteiga). O Gui mandou escurecer só a tinta delas até 4,5 (P160 do QA de
// design, 17/11/2026): o pastel e o vivo não mudaram, e hoje a regra vale para as 34, sem exceção.

describe('a paleta do sistema', () => {
  it('é bem maior que as onze cores: as onze aprovadas, mais doze e mais onze', () => {
    expect(CORES).toHaveLength(11);
    expect(CORES_NOVAS).toHaveLength(12);
    expect(CORES_MAIS_NOVAS).toHaveLength(11);
    expect(PALETA).toHaveLength(34);
    expect(new Set(PALETA).size).toBe(PALETA.length);
  });

  it('toda cor da paleta existe em tokens.css, nos quatro tons, e tem nome para a pessoa ler', () => {
    for (const cor of PALETA) {
      for (const tom of TONS) expect(cores[cor]?.[tom], `--${cor}-${tom}`).toMatch(/^#[0-9a-f]{6}$/);
      expect(NOMES_DAS_CORES[cor], cor).toBeTruthy();
    }
    // E tokens.css não tem cor em quatro tons que a paleta não conheça
    expect(Object.keys(cores).sort()).toEqual([...PALETA].sort());
  });

  it('as onze cores aprovadas não mudaram de valor', () => {
    expect(cores.verde).toEqual({ pastel: '#cfe6c0', meio: '#a9d190', vivo: '#3f9d52', tinta: '#2a6f3b' });
    expect(cores.orquidea).toEqual({ pastel: '#ecc9ee', meio: '#dba3df', vivo: '#b84cc4', tinta: '#8a2f96' });
    expect(cores.manteiga).toEqual({ pastel: '#f8dc98', meio: '#f1c964', vivo: '#eda800', tinta: '#885700' });
    // Nas quatro que tiveram a tinta escurecida (P160), o pastel, o meio e o vivo são os de antes
    expect(cores.pessego).toEqual({ pastel: '#fbd3b8', meio: '#f6b48a', vivo: '#ec6a2c', tinta: '#a04314' });
    expect(cores.coral).toEqual({ pastel: '#fbc4bb', meio: '#f59a8c', vivo: '#e8483a', tinta: '#a8281e' });
    expect(cores.rosa).toEqual({ pastel: '#f9c8d6', meio: '#f29db8', vivo: '#e7477f', tinta: '#aa2557' });
  });

  it('a tinta de cada cor se lê sobre o papel e sobre a moldura branca (4,5 para um)', () => {
    for (const cor of PALETA) {
      expect(contraste(cores[cor]!.tinta, papel), `${cor} no papel`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(cores[cor]!.tinta, branco), `${cor} no branco`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('o texto do site se lê sobre o pastel de cada cor (4,5 para um)', () => {
    for (const cor of PALETA) expect(contraste(tinta, cores[cor]!.pastel), cor).toBeGreaterThanOrEqual(4.5);
  });

  it('a tinta de cada cor se lê sobre o pastel dela: 4,5 para um nas 34', () => {
    for (const cor of PALETA) expect(contraste(cores[cor]!.tinta, cores[cor]!.pastel), cor).toBeGreaterThanOrEqual(4.5);
  });

  it('o vivo se distingue do pastel da mesma cor', () => {
    // O ponto de destaque sobre o bloco. A menor distância entre as onze aprovadas é a da manteiga
    // (0,145 no OKLab); nenhuma cor nova fica abaixo disso.
    const menorDasAprovadas = Math.min(...CORES.map((c) => distancia(cores[c]!.vivo, cores[c]!.pastel)));
    expect(menorDasAprovadas).toBeGreaterThan(0.14);
    for (const cor of [...CORES_NOVAS, ...CORES_MAIS_NOVAS]) expect(distancia(cores[cor]!.vivo, cores[cor]!.pastel), cor).toBeGreaterThanOrEqual(menorDasAprovadas);
  });

  it('nenhuma cor fica mais perto de outra do que as duas mais próximas entre as onze aprovadas', () => {
    // Entre as aprovadas, os pastéis mais próximos são ardósia e azul, e os vivos, coral e pêssego.
    // A paleta ampliada não aperta mais do que isso: dá para dizer qual é qual na grade e na tela.
    for (const tom of ['pastel', 'vivo'] as const) {
      const menorDasAprovadas = Math.min(...pares(CORES).map(([a, b]) => distancia(cores[a]![tom], cores[b]![tom])));
      for (const [a, b] of pares(PALETA)) expect(distancia(cores[a]![tom], cores[b]![tom]), `${a} e ${b}, ${tom}`).toBeGreaterThanOrEqual(menorDasAprovadas);
    }
  });

  it('as onze de 18/11/2026 entram com folga: pelo menos 1,2 vez a menor distância entre as aprovadas', () => {
    // A regra de distância não foi afrouxada para elas caberem: cada uma fica ainda mais longe das outras
    for (const tom of ['pastel', 'vivo'] as const) {
      const menorDasAprovadas = Math.min(...pares(CORES).map(([a, b]) => distancia(cores[a]![tom], cores[b]![tom])));
      for (const nova of CORES_MAIS_NOVAS) for (const outra of PALETA) if (outra !== nova) expect(distancia(cores[nova]![tom], cores[outra]![tom]), `${nova} e ${outra}, ${tom}`).toBeGreaterThanOrEqual(menorDasAprovadas * 1.2);
    }
  });

  it('a conta do contraste é a da WCAG', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contraste('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(contraste('#abcdef', '#abcdef')).toBe(1);
  });
});
