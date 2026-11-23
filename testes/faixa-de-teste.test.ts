// A faixa de teste das prévias (src/layouts/Visual.astro) sem a linha das fontes (decisão do Gui, 23/11/2026,
// sessão D1c): a fonte do site está escolhida, e a comparação das combinações fica na página do sistema.
import { describe, expect, it } from 'vitest';

const fontes = import.meta.glob<string>(['../src/layouts/Visual.astro', '../src/pages/sistema.astro'], { query: '?raw', import: 'default', eager: true });
const layout = fontes['../src/layouts/Visual.astro']!;
const faixa = layout.slice(layout.indexOf('<details class:list={[\'teste\''), layout.indexOf('</details>'));

describe('a faixa de teste', () => {
  it('não troca mais as fontes', () => {
    expect(faixa.length).toBeGreaterThan(100);
    expect(faixa).not.toContain('<span>Fontes:</span>');
    expect(faixa).not.toContain('COMBINACOES_DE_FONTES');
    expect(faixa).not.toMatch(/Fontes \{combinacaoEmUso/);
  });
  it('quem ainda tem outra combinação guardada volta à do site', () => {
    expect(faixa).toContain('{fontesDiferentes && (');
    expect(faixa).toContain('href={`/conceito/fontes/${combinacaoDoSite}?volta=${volta}`}');
  });
  it('a comparação das combinações continua na página do sistema', () => {
    expect(fontes['../src/pages/sistema.astro']).toContain('href={`/sistema?fontes=${c.id}`}');
  });
});
