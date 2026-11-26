import { describe, expect, it } from 'vitest';
import { anosDeVida, dataNaFrase, datasDeVida } from '../src/lib/datas';

describe('falecimento como opção', () => {
  it('quem faleceu aparece só com o ano de nascimento nas listas e na árvore, e sem data por extenso', () => {
    // O falecimento fica oculto em todo lugar, e o ano também (decisão do Gui, 17/11/2026)
    expect(anosDeVida({ nascimentoAno: 1930, falecimentoAno: null, falecido: true })).toBe('1930');
    expect(anosDeVida({ nascimentoAno: 1942, falecimentoAno: 2019 })).toBe('1942');
    expect(anosDeVida({ nascimentoAno: null, falecimentoAno: 2019 })).toBe('');
    expect(datasDeVida({ nascimentoAno: 1930, falecimentoAno: null, falecido: true })).toContain('Falecimento: data desconhecida');
  });

  it('quem está vivo continua só com o ano de nascimento', () => {
    expect(anosDeVida({ nascimentoAno: 1990, falecimentoAno: null })).toBe('1990');
  });
});


// A frase da Nova memória (docs/regras/formularios.md, "A frase é a trilha", em "Nova memória")
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
