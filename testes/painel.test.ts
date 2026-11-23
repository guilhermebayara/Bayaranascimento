// Regras puras do painel pessoal: "Neste dia, em outros anos".
import { describe, expect, it } from 'vitest';
import { emOutrosAnos } from '../src/lib/painel';

const m = (id: string, ano: number, mes: number | null = null, dia: number | null = null, aproximada = false) => ({ id, ano, mes, dia, aproximada });
const memorias = [
  m('natal-1994', 1994, 12, 24),
  m('natal-2016', 2016, 12, 24),
  m('natal-2025', 2025, 12, 24),
  m('virada-1999', 1999, 12, 31),
  m('formatura-2021', 2021, 12, 17),
  m('dezembro-2016', 2016, 12),
  m('toto-2009', 2009, 11),
  m('quintal-1994', 1994, 8, 14),
  m('ano-novo-2000', 2000, 1, 2),
  m('aproximada', 2001, 12, 24, true),
  m('este-ano', 2026, 12, 24),
  m('so-o-ano', 1992),
];
const ids = (r: ReturnType<typeof emOutrosAnos>) => r?.itens.map((i) => (i as { id: string }).id);

describe('neste dia, em outros anos', () => {
  it('no mesmo dia e mês, as mais recentes primeiro, sem as deste ano nem as de data aproximada', () => {
    const r = emOutrosAnos(memorias, { ano: 2026, mes: 12, dia: 17 });
    expect(r?.proximidade).toBe('dia');
    expect(ids(r)).toEqual(['formatura-2021']);
    // No dia 24, as mesmas memórias, pela regra do Natal (abaixo)
    expect(ids(emOutrosAnos(memorias, { ano: 2026, mes: 12, dia: 24 }))).toEqual(['natal-2025', 'natal-2016', 'natal-1994']);
  });

  it('sem nenhuma no dia, vale a semana: até três dias antes ou depois', () => {
    const r = emOutrosAnos(memorias, { ano: 2026, mes: 12, dia: 21 });
    expect(r?.proximidade).toBe('semana');
    expect(ids(r)).toEqual(['natal-2025', 'natal-2016', 'natal-1994']);
    expect(emOutrosAnos(memorias, { ano: 2026, mes: 12, dia: 20 })?.proximidade).toBe('semana'); // a formatura, dia 17
  });

  it('a semana atravessa a virada do ano', () => {
    const r = emOutrosAnos(memorias, { ano: 2026, mes: 1, dia: 1 });
    expect(r?.proximidade).toBe('semana');
    expect(ids(r)).toEqual(['ano-novo-2000', 'virada-1999']);
  });

  it('sem nenhuma na semana, vale o mês, e aí entram as que só têm mês e ano', () => {
    const r = emOutrosAnos(memorias, { ano: 2026, mes: 11, dia: 16 });
    expect(r?.proximidade).toBe('mes');
    expect(ids(r)).toEqual(['toto-2009']);
    expect(ids(emOutrosAnos(memorias, { ano: 2026, mes: 12, dia: 5 }))).toContain('dezembro-2016');
  });

  it('no Natal, de 24 a 26 de dezembro, vêm as memórias de 24 e de 25 de dezembro de outros anos', () => {
    const natal = [...memorias, m('natal-com-os-primos-1998', 1998, 12, 25), m('natal-de-hoje', 2026, 12, 25), m('aproximado', 2003, 12, 25, true)];
    // O dia 25 tem uma memória, e a de 24/12 entra junto: antes ficava de fora
    for (const dia of [24, 25, 26]) {
      const r = emOutrosAnos(natal, { ano: 2026, mes: 12, dia });
      expect(r?.proximidade, `dia ${dia}`).toBe('natal');
      expect(ids(r), `dia ${dia}`).toEqual(['natal-2025', 'natal-2016', 'natal-com-os-primos-1998', 'natal-1994']);
    }
    // Fora dos três dias, a regra de sempre: no dia 23, a semana
    expect(emOutrosAnos(natal, { ano: 2026, mes: 12, dia: 23 })?.proximidade).toBe('semana');
    expect(emOutrosAnos(natal, { ano: 2026, mes: 12, dia: 27 })?.proximidade).toBe('semana');
    // No Natal sem nenhuma memória de 24 ou 25 de dezembro, vale a regra de sempre
    expect(emOutrosAnos([m('virada-1999', 1999, 12, 31), m('so-dezembro', 2010, 12)], { ano: 2026, mes: 12, dia: 26 })?.proximidade).toBe('mes');
    expect(emOutrosAnos([m('dia-26', 2010, 12, 26)], { ano: 2026, mes: 12, dia: 26 })?.proximidade).toBe('dia');
  });

  it('sem nada no mês, não aparece; e o tamanho tem limite', () => {
    expect(emOutrosAnos(memorias, { ano: 2026, mes: 5, dia: 10 })).toBeUndefined();
    expect(emOutrosAnos(memorias, { ano: 2026, mes: 12, dia: 24 }, 2)?.itens).toHaveLength(2);
  });
});
