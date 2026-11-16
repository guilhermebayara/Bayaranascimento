import { describe, expect, it } from 'vitest';
import { anosDeVida, datasDeVida } from '../src/lib/datas';

describe('falecimento como opção', () => {
  it('quem faleceu sem data conhecida aparece com interrogação nos anos e sem data por extenso', () => {
    expect(anosDeVida({ nascimentoAno: 1930, falecimentoAno: null, falecido: true })).toBe('1930 a ?');
    expect(datasDeVida({ nascimentoAno: 1930, falecimentoAno: null, falecido: true })).toContain('Falecimento: data desconhecida');
  });

  it('quem está vivo continua só com o ano de nascimento', () => {
    expect(anosDeVida({ nascimentoAno: 1990, falecimentoAno: null })).toBe('1990');
  });
});
