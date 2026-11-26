// A regra 15 da guarda da produção (scripts/busca.mjs): onde a busca não existe, o `q` não vale e a lupa e a folha
// não aparecem; toda tela que lê os filtros diz se a busca existe ali; e a consulta da busca não escreve SQL de
// quem vê o quê. Cada recusa é conferida aqui, com o arquivo de verdade mudado de propósito.
import { describe, expect, it } from 'vitest';
import { problemasDaBusca } from '../scripts/busca.mjs';

const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: string, codificacao: string) => string };
const ARQUIVOS = ['src/layouts/Visual.astro', 'src/lib/servidor/tv.ts', 'src/lib/servidor/busca.ts', 'src/pages/explorar.astro', 'src/lib/explorar.ts'];
const deVerdade = Object.fromEntries(ARQUIVOS.map((a) => [a, readFileSync(a, 'utf8')]));
const problemas = (troca: Record<string, (texto: string) => string> = {}) =>
  problemasDaBusca((caminho: string) => (troca[caminho] ? troca[caminho]!(deVerdade[caminho]!) : deVerdade[caminho]!), ARQUIVOS) as string[];

describe('a guarda da busca (regra 15)', () => {
  it('o site de hoje passa', () => {
    expect(problemas()).toEqual([]);
  });

  it('a lupa e a folha no modo TV são recusadas', () => {
    expect(problemas({ 'src/layouts/Visual.astro': (t) => t.replace('const comBusca = !palco;', 'const comBusca = true;') }).join()).toContain('fora do modo TV');
    expect(problemas({ 'src/layouts/Visual.astro': (t) => t.replace(/comBusca && \(\s*<a class="topo__procurar"/, '(\n<a class="topo__procurar"') }).join()).toContain('a lupa do topo');
    expect(problemas({ 'src/layouts/Visual.astro': (t) => t.replace(/comBusca && caminho !== '\/busca' && \(\s*<dialog/, "caminho !== '/busca' && (\n<dialog") }).join()).toContain('a folha da busca');
  });

  it('o `q` na TV da sala é recusado', () => {
    expect(problemas({ 'src/lib/servidor/tv.ts': (t) => t.replace('busca: !sala', 'busca: true') }).join()).toContain('TV da sala');
  });

  it('uma tela que lê os filtros sem dizer se a busca existe ali é recusada', () => {
    expect(problemas({ 'src/pages/explorar.astro': (t) => t.replace(/\n\s*\/\/ A busca \(`q`[^\n]*\n\s*busca: true,/, '') }).join()).toContain('src/pages/explorar.astro: soFiltrosConhecidos sem dizer');
  });

  it('SQL de quem vê o quê na consulta da busca é recusado; ler a coluna para o código decidir, não', () => {
    const comFiltro = (sql: string) => (t: string) => t.replace('FROM memorias WHERE id ${dentro}`', `FROM memorias WHERE id \${dentro} AND ${sql}\``);
    for (const sql of ["situacao = 'publicada'", "visibilidade = 'todos'", 'excluida_em IS NULL']) {
      expect(problemas({ 'src/lib/servidor/busca.ts': comFiltro(sql) }).join(), sql).toContain('SQL de quem vê o quê');
    }
    expect(problemas({ 'src/lib/servidor/busca.ts': (t) => t.replace(/WHERE memoria_id \$\{dentro\} ORDER BY principal/, 'WHERE removida_em IS NULL AND memoria_id ${dentro} ORDER BY principal') }).join()).toContain('SQL de quem vê o quê');
    expect(problemas({ 'src/lib/servidor/busca.ts': (t) => `${t}\nconst x = \`SELECT * FROM memorias m WHERE \${FILTRO_VISIVEL}\`;` }).join()).toContain('SQL de quem vê o quê');
    // A consulta de hoje lê situacao e visibilidade no SELECT, para podeVerMemoria decidir: passa (o primeiro caso)
    expect(deVerdade['src/lib/servidor/busca.ts']).toMatch(/SELECT id, titulo, [^`]*situacao, visibilidade/);
  });

  it('a busca sem podeVerMemoria ou sem veORelato é recusada', () => {
    expect(problemas({ 'src/lib/servidor/busca.ts': (t) => t.replaceAll('podeVerMemoria', 'algumaOutra') }).join()).toContain('podeVerMemoria e veORelato');
  });
});
