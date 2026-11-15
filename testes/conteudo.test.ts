import { describe, expect, it } from 'vitest';
import { arrumarTexto, criarSlug, slugUnico, validarData } from '../src/lib/servidor/conteudo';
import { agruparPorAno, formatarData, formatarDiaMes } from '../src/lib/datas';

describe('slugs', () => {
  it('tira acentos e símbolos', () => {
    expect(criarSlug('Vó Bela')).toBe('vo-bela');
    expect(criarSlug('  Casamento da Giovanna & do Magno!  ')).toBe('casamento-da-giovanna-do-magno');
  });
  it('não repete ids', () => {
    expect(slugUnico('a', new Set(['a', 'a-2']))).toBe('a-3');
    expect(slugUnico('', new Set())).toBe('sem-titulo');
  });
});

describe('datas', () => {
  it('aceita só o ano', () => expect(validarData(1994)).toBeUndefined());
  it('recusa dia sem mês', () => expect(validarData(1994, undefined, 3)).toBeTruthy());
  it('recusa 30 de fevereiro', () => expect(validarData(1994, 2, 30)).toBeTruthy());
  it('recusa ano no futuro', () => expect(validarData(3000)).toBeTruthy());
  it('escreve a data no nível de detalhe que existe', () => {
    expect(formatarData({ ano: 1994, mes: 8, dia: 14, aproximada: false })).toBe('14 de agosto de 1994');
    expect(formatarData({ ano: 1994, mes: 8, dia: null, aproximada: false })).toBe('agosto de 1994');
    expect(formatarData({ ano: 1968, mes: null, dia: null, aproximada: true })).toBe('por volta de 1968');
    expect(formatarDiaMes({ ano: 1968, mes: null, dia: null, aproximada: true })).toBe('data aproximada');
  });
  it('agrupa por ano mantendo a ordem', () => {
    expect(agruparPorAno([{ ano: 1990 }, { ano: 1990 }, { ano: 2001 }]).map((g) => [g.ano, g.itens.length])).toEqual([[1990, 2], [2001, 1]]);
  });
});

describe('texto', () => {
  it('normaliza quebras de linha', () => {
    expect(arrumarTexto('  a\r\n\r\n\r\n\r\nb  ')).toBe('a\n\nb');
  });
});
