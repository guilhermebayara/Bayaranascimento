import { describe, expect, it } from 'vitest';
import { dentroDoPeriodo, formatarPeriodo, lerTemas, periodoDasMemorias, podeEditarCapitulo, podeVerCapitulo, sobreposicao, validarAninhamento } from '../src/lib/capitulos';

const pandemia = { inicio: { ano: 2020, mes: 3 }, fim: { ano: 2022, mes: 4 } };

describe('capítulo de época', () => {
  it('a memória entra sozinha quando a data cai no período', () => {
    expect(dentroDoPeriodo({ ano: 2021, mes: 6, dia: 10 }, pandemia.inicio, pandemia.fim)).toBe(true);
    expect(dentroDoPeriodo({ ano: 2020, mes: 2 }, pandemia.inicio, pandemia.fim)).toBe(false);
    expect(dentroDoPeriodo({ ano: 2022, mes: 5 }, pandemia.inicio, pandemia.fim)).toBe(false);
  });
  it('quem só sabe o ano entra se o ano tocar o período', () => {
    expect(dentroDoPeriodo({ ano: 2020 }, pandemia.inicio, pandemia.fim)).toBe(true);
    expect(dentroDoPeriodo({ ano: 2019 }, pandemia.inicio, pandemia.fim)).toBe(false);
  });
  it('sem data de fim, o período continua aberto', () => {
    expect(dentroDoPeriodo({ ano: 2030 }, pandemia.inicio, null)).toBe(true);
  });
});

describe('capítulo reunido', () => {
  it('o período vai da primeira à última memória', () => {
    const periodo = periodoDasMemorias([{ ano: 2026, mes: 11 }, { ano: 2025, mes: 3 }, { ano: 2026, mes: 5 }]);
    expect(periodo).toEqual({ inicio: { ano: 2025, mes: 3 }, fim: { ano: 2026, mes: 11 } });
    expect(periodoDasMemorias([])).toBeNull();
  });
  it('período por extenso', () => {
    expect(formatarPeriodo({ ano: 2025, mes: 3 }, { ano: 2026, mes: 11 })).toBe('mar de 2025 a nov de 2026');
    expect(formatarPeriodo({ ano: 2026 }, { ano: 2026 })).toBe('2026');
    expect(formatarPeriodo({ ano: 2020, mes: 3 }, null, true)).toBe('mar de 2020 em diante');
  });
});

describe('capítulos que se cruzam', () => {
  it('inteiro, em parte ou nada', () => {
    expect(sobreposicao({ inicio: { ano: 2021 }, fim: { ano: 2021 } }, pandemia)).toBe('inteiro');
    expect(sobreposicao({ inicio: { ano: 2019 }, fim: { ano: 2020, mes: 6 } }, pandemia)).toBe('parte');
    expect(sobreposicao({ inicio: { ano: 2015 }, fim: { ano: 2016 } }, pandemia)).toBe('nada');
  });
});

describe('quem vê e quem edita', () => {
  const pessoa = (pessoa: string, nucleos: string[]) => ({ pessoa, admin: false, nucleos });
  const giovanna = pessoa('giovanna', ['bayara-nascimento', 'bayara-bracarense']);
  const elizete = pessoa('elizete', ['bayara-nascimento']);
  const doCasal = { visibilidade: 'nucleos' as const, nucleos: ['bayara-bracarense'], criadoPor: 'giovanna' };
  it('capítulo restrito só aparece para o núcleo', () => {
    expect(podeVerCapitulo(giovanna, doCasal)).toBe(true);
    expect(podeVerCapitulo(elizete, doCasal)).toBe(false);
  });
  it('edita quem criou e quem tem memórias nele', () => {
    const aberto = { visibilidade: 'todos' as const, nucleos: [], criadoPor: 'giovanna' };
    expect(podeEditarCapitulo(giovanna, aberto, [])).toBe(true);
    expect(podeEditarCapitulo(elizete, aberto, [])).toBe(false);
    expect(podeEditarCapitulo(elizete, aberto, ['elizete'])).toBe(true);
    expect(podeEditarCapitulo(elizete, doCasal, ['elizete'])).toBe(false);
  });
});

describe('capítulo dentro de capítulo', () => {
  const solto = { id: 'casamento', dentroDe: null };
  const jaDentro = { id: 'cha', dentroDe: 'casamento' };
  it('aceita um nível de aninhamento', () => {
    expect(validarAninhamento({ id: 'jantar', temFilhos: false }, solto)).toBeUndefined();
    expect(validarAninhamento({ id: 'jantar', temFilhos: false }, undefined)).toBeUndefined();
  });
  it('recusa o terceiro nível, nos dois sentidos', () => {
    expect(validarAninhamento({ id: 'jantar', temFilhos: false }, jaDentro)).toMatch(/dois níveis/);
    expect(validarAninhamento({ id: 'grande', temFilhos: true }, solto)).toMatch(/capítulos dentro/);
    expect(validarAninhamento({ id: 'casamento', temFilhos: false }, solto)).toMatch(/dele mesmo/);
  });
});

describe('temas', () => {
  it('lê nomes separados por vírgula, sem repetir', () => {
    expect(lerTemas('Viagens,  casas onde moramos ; viagens')).toEqual(['Viagens', 'casas onde moramos']);
    expect(lerTemas('')).toEqual([]);
  });
});
