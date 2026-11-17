import { describe, expect, it } from 'vitest';
import { anosDeVida, dataNaFrase, datasDeVida } from '../src/lib/datas';

describe('falecimento como opção', () => {
  it('quem faleceu sem data conhecida aparece com interrogação nos anos e sem data por extenso', () => {
    expect(anosDeVida({ nascimentoAno: 1930, falecimentoAno: null, falecido: true })).toBe('1930 a ?');
    expect(datasDeVida({ nascimentoAno: 1930, falecimentoAno: null, falecido: true })).toContain('Falecimento: data desconhecida');
  });

  it('quem está vivo continua só com o ano de nascimento', () => {
    expect(anosDeVida({ nascimentoAno: 1990, falecimentoAno: null })).toBe('1990');
  });
});


// O formulário em frase da Nova memória (docs/visual.md, "A data no formulário em frase")
describe('a data na frase "Isso aconteceu ___"', () => {
  it('escreve a data como o site já escreve, com a preposição que a frase pede', () => {
    expect(dataNaFrase({ ano: 2025, mes: 12, dia: 24 })).toBe('em 24 de dezembro de 2025');
    expect(dataNaFrase({ ano: 2025, mes: 12 })).toBe('em dezembro de 2025');
    expect(dataNaFrase({ ano: 2025 })).toBe('em 2025');
    expect(dataNaFrase({ ano: 1994, aproximada: true })).toBe('por volta de 1994');
  });

  it('dia sem mês não entra, e sem ano a lacuna faz a pergunta', () => {
    expect(dataNaFrase({ ano: 2025, dia: 24 })).toBe('em 2025');
    expect(dataNaFrase({})).toBe('em que data?');
  });
});
