import { describe, expect, it } from 'vitest';
import { arrumarTexto, criarSlug, outrosAdmins, slugUnico, validarData } from '../src/lib/servidor/conteudo';
import { agruparPorAno, formatarData, formatarDiaMes, problemaNaData } from '../src/lib/datas';

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

describe('textos para quem está logado', () => {
  // Decisão do Gui (16/11/2026): personalizar. Antes, a Giovanna lia "você ou a Giovanna podem recuperar".
  const admins = [
    { id: 'gui', nome: 'Gui', tratamento: 'ele' as const, admin: true },
    { id: 'giovanna', nome: 'Giovanna', tratamento: 'ela' as const, admin: true },
    { id: 'elizete', nome: 'Elizete', tratamento: 'ela' as const, admin: false },
  ];
  it('nomeia os outros administradores, e não quem está lendo', () => {
    expect(outrosAdmins('gui', admins)).toBe('a Giovanna');
    expect(outrosAdmins('giovanna', admins)).toBe('o Gui');
    expect(outrosAdmins('elizete', admins)).toBe('o Gui e a Giovanna');
  });
});

describe('data impossível avisada na hora', () => {
  // Pedido do Gui (16/11/2026): acusar 31 de fevereiro na seleção, e não só ao salvar
  it('acusa dia que não existe no mês', () => {
    expect(problemaNaData(2023, 2, 29)).toBe('Fevereiro de 2023 tem 28 dias.');
    expect(problemaNaData(2024, 2, 29)).toBeUndefined();
    expect(problemaNaData(undefined, 2, 29)).toBeUndefined();
    expect(problemaNaData(undefined, 4, 31)).toBe('Abril tem 30 dias.');
    expect(problemaNaData(2001, 1, 31)).toBeUndefined();
  });
  it('acusa dia sem mês', () => {
    expect(problemaNaData(2001, undefined, 3)).toBe('Para informar o dia, escolha também o mês.');
  });
  it('não reclama de data só com ano ou só com mês', () => {
    expect(problemaNaData(2001)).toBeUndefined();
    expect(problemaNaData(2001, 5)).toBeUndefined();
  });
});
