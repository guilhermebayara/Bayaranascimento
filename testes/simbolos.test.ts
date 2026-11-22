// Os símbolos dos controles (src/visual/simbolos.ts, decisão do Gui de 22/11/2026): os sinais do
// controle da TV e do tocador, no traço dos rabiscos, que entram no sistema como peça para a
// navegação usar depois. O nome de cada botão do modo TV é conferido em testes/explorar-controles.test.ts.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SIMBOLOS } from '../src/visual/simbolos';

const ler = (caminho: string) => readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8');

describe('os símbolos', () => {
  it('estão os do tocador e da TV, sem repetir id, nome ou desenho', () => {
    expect(SIMBOLOS.map((s) => s.id)).toEqual(['anterior', 'proxima', 'tocar', 'pausar', 'tela-cheia', 'sair-da-tela-cheia', 'ajustes', 'ocultar']);
    for (const campo of ['id', 'nome', 'desenho'] as const) expect(new Set(SIMBOLOS.map((s) => s[campo])).size, campo).toBe(SIMBOLOS.length);
  });

  it('no traço dos rabiscos: só linhas e formas abertas, dentro da caixa de 24 por 24, sem transformação', () => {
    for (const s of SIMBOLOS) {
      expect(s.desenho, s.id).toMatch(/^(<(path|circle) [^>]+\/>)+$/);
      expect(s.desenho, s.id).not.toMatch(/fill=|stroke=|stroke-width=|style=|class=|transform=/);
      // Todo traço começa dentro da caixa, com folga para a ponta redonda
      for (const [, x, y] of s.desenho.matchAll(/M([\d.]+) ([\d.]+)/g)) {
        for (const n of [Number(x), Number(y)]) {
          expect(n, s.id).toBeGreaterThanOrEqual(2.5);
          expect(n, s.id).toBeLessThanOrEqual(21.5);
        }
      }
    }
    // A espessura, as pontas e os cantos são os do IconeDoTipo
    const traco = /stroke-width="1\.6" stroke-linecap="round" stroke-linejoin="round"/;
    expect(ler('components/visual/IconeDoTipo.astro')).toMatch(traco);
    expect(ler('components/visual/Simbolo.astro')).toMatch(traco);
  });

  it('a peça e a página do sistema mostram todos, e o botão de símbolo com o nome', () => {
    const pagina = ler('pages/sistema.astro');
    expect(pagina).toMatch(/SIMBOLOS\.map\(\(s\) => \(\s*<li>\s*<Simbolo id=\{s\.id\} \/>/);
    expect(pagina).toContain('<BotaoDeSimbolo simbolo="proxima" nome="Próxima" cheio />');
  });
});
