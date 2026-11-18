// A página da pessoa, proposta A do conceito da sessão L ("o verbete", escolha do Gui de 18/11/2026).
import { describe, expect, it } from 'vitest';
import { FORMAS_DA_VIDA, enderecoDaVida, fasesDaVida, fraseDoAcervo, idadeNoAno, lerFormaDaVida, mostraRascunhoNaVida, nomeDaFormaDaVida, textoDaIdade } from '../src/lib/pagina-da-pessoa';


describe('as formas de ver da página da pessoa', () => {
  it('pela idade é o padrão, e a linha do tempo e o mural continuam como opção (pedido do Gui)', () => {
    expect([...FORMAS_DA_VIDA]).toEqual(['idade', 'linha', 'mural']);
    expect(lerFormaDaVida(new URLSearchParams(''))).toBe('idade');
    expect(lerFormaDaVida(new URLSearchParams('ver=linha'))).toBe('linha');
    expect(lerFormaDaVida(new URLSearchParams('ver=tv'))).toBe('idade');
    expect(enderecoDaVida('gui')).toBe('/pessoas/gui');
    expect(enderecoDaVida('gui', 'mural')).toBe('/pessoas/gui?ver=mural');
  });
  it('sem o ano de nascimento, a primeira forma agrupa por década', () => {
    expect(nomeDaFormaDaVida('idade', true)).toBe('Pela idade');
    expect(nomeDaFormaDaVida('idade', false)).toBe('Por década');
  });
  it('o rascunho fica fora só do mural', () => {
    expect(mostraRascunhoNaVida('idade')).toBe(true);
    expect(mostraRascunhoNaVida('linha')).toBe(true);
    expect(mostraRascunhoNaVida('mural')).toBe(false);
  });
});

describe('a vida em memórias, pela idade', () => {
  it('agrupa de dez em dez anos, na ordem em que as memórias chegam', () => {
    const fases = fasesDaVida([{ ano: 2026 }, { ano: 2021 }, { ano: 1999 }, { ano: 1992 }], 1992);
    expect(fases.map((f) => [f.titulo, f.quando, f.memorias.length])).toEqual([
      ['Dos 30 aos 39 anos', '2022 a 2031', 1],
      ['Dos 20 aos 29 anos', '2012 a 2021', 1],
      ['Até os 9 anos', '1992 a 2001', 2],
    ]);
  });
  it('sem o nascimento, ou antes dele, vale a década do calendário', () => {
    expect(fasesDaVida([{ ano: 1995 }, { ano: 1968 }], null).map((f) => f.titulo)).toEqual(['Anos 1990', 'Anos 1960']);
    expect(fasesDaVida([{ ano: 1980 }], 1992).map((f) => f.titulo)).toEqual(['Anos 1980']);
  });
  it('a idade escrita do jeito que se fala', () => {
    expect(idadeNoAno(1992, 2026)).toBe(34);
    expect(idadeNoAno(null, 2026)).toBeNull();
    expect(idadeNoAno(1992, 1990)).toBeNull();
    expect(textoDaIdade(0)).toBe('no ano em que nasceu');
    expect(textoDaIdade(1)).toBe('com 1 ano');
    expect(textoDaIdade(34)).toBe('aos 34 anos');
  });
});

describe('a frase de abertura sem "Sobre"', () => {
  it('diz o que o acervo sabe', () => {
    expect(fraseDoAcervo({ nome: 'Elizete', memorias: 34, de: 1968, ate: 2026, relatos: 10, eu: false })).toBe('Elizete aparece em 34 memórias do acervo, de 1968 a 2026, e contou 10 delas.');
    expect(fraseDoAcervo({ nome: 'Lourdes', memorias: 0, relatos: 0, eu: false })).toBe('Lourdes ainda não aparece em nenhuma memória do acervo.');
    expect(fraseDoAcervo({ nome: 'Gui', memorias: 1, de: 2010, ate: 2010, relatos: 0, eu: true })).toBe('Você aparece em 1 memória do acervo, em 2010.');
    expect(fraseDoAcervo({ nome: 'Bela', memorias: 3, de: 1990, ate: 2000, relatos: 1, eu: false })).toBe('Bela aparece em 3 memórias do acervo, de 1990 a 2000, e contou uma delas.');
  });
});
