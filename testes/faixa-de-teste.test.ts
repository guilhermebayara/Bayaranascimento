// A faixa de teste das prévias (src/layouts/Visual.astro) sem a linha das fontes (decisão do Gui, 23/11/2026,
// sessão D1c) e sem a linha das telas nem o recado de outra combinação (sessão AC1, 26/11/2026): a fonte do
// site está escolhida, e as combinações A e B saíram do pacote.
import { describe, expect, it } from 'vitest';

const fontes = import.meta.glob<string>(['../src/layouts/Visual.astro'], { query: '?raw', import: 'default', eager: true });
const layout = fontes['../src/layouts/Visual.astro']!;
const faixa = layout.slice(layout.indexOf('<details class:list={[\'teste\''), layout.indexOf('</details>'));

describe('a faixa de teste', () => {
  it('não troca mais as fontes', () => {
    expect(faixa.length).toBeGreaterThan(100);
    expect(faixa).not.toContain('<span>Fontes:</span>');
    expect(faixa).not.toContain('COMBINACOES_DE_FONTES');
    expect(faixa).not.toMatch(/Fontes \{combinacaoEmUso/);
  });
  it('não leva à rota do conceito, que saiu, nem lista telas', () => {
    expect(faixa).not.toContain('/conceito');
    expect(faixa).not.toContain('<span>Telas:</span>');
    expect(faixa).not.toContain('fontesDiferentes');
  });
  it('continua com o "Ver como" e a volta ao início', () => {
    expect(faixa).toContain('<span>Ver como:</span>');
    expect(faixa).toContain('<a href="/">Início do site</a>');
  });
});
