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
    const r = emOutrosAnos(memorias, { ano: 2026, mes: 12, dia: 24 });
    expect(r?.proximidade).toBe('dia');
    expect(ids(r)).toEqual(['natal-2025', 'natal-2016', 'natal-1994']);
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

  it('sem nada no mês, não aparece; e o tamanho tem limite', () => {
    expect(emOutrosAnos(memorias, { ano: 2026, mes: 5, dia: 10 })).toBeUndefined();
    expect(emOutrosAnos(memorias, { ano: 2026, mes: 12, dia: 24 }, 2)?.itens).toHaveLength(2);
  });
});
