// A conversa na página da memória (observação do Gui depois da sessão K, construída na sessão L,
// 18/11/2026): o título colado nas vozes, as vozes num container de conversa e a coluna estreita na TV.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (c: string) => readFileSync(c, 'utf-8');

describe('os relatos na página da memória', () => {
  const pagina = ler('src/pages/memorias/[id].astro');
  const css = ler('src/visual/telas/memoria.css');
  it('a seção dos relatos é a conversa, e o título fica colado nas vozes', () => {
    expect(pagina).toMatch(/<section class="parte parte--conversa" aria-labelledby="relatos">/);
    expect(css).toMatch(/\.parte--conversa > \.parte__titulo \{\s*margin-bottom: var\(--e-3\);/);
  });
  it('a parte depois de "Quem estava" ganha o espaço entre partes, mesmo com a região sem caixa no meio', () => {
    expect(css).toMatch(/\.parte \+ \.parte,[^{]*\.regiao \+ \.parte,\s*\* \+ \.regiao > \.parte:first-child \{\s*margin-top: var\(--e-8\);/);
  });
  it('as vozes ficam num container de conversa, com a largura de uma conversa também na TV', () => {
    expect(css).toMatch(/\.parte--conversa \.voz-fio \{[^}]*max-width: 44rem;[^}]*background: var\(--papel-recuo\);/);
    expect(css).toMatch(/\.parte--conversa \.voz__mensagens \{\s*gap: var\(--e-1\);/);
  });
});
