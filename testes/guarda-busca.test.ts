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

  it('SQL de quem vê o quê escrito à mão na consulta da busca é recusado; ler a coluna para o código decidir, não', () => {
    const ancora = 'WHERE ${sqlVeMemoria({ so: ';
    expect(deVerdade['src/lib/servidor/busca.ts']).toContain(ancora);
    const comFiltro = (sql: string) => (t: string) => t.replace(ancora, `WHERE ${sql} ${ancora.slice(6)}`);
    for (const sql of ["m.situacao = 'publicada' AND", "m.visibilidade = 'todos' AND", 'm.excluida_em IS NULL AND', "r.so_para_nucleos <> '[]' AND", 'EXISTS (SELECT 1 FROM memoria_nucleos mn WHERE mn.memoria_id = m.id) AND']) {
      expect(problemas({ 'src/lib/servidor/busca.ts': comFiltro(sql) }).join(), sql).toContain('SQL de quem vê o quê');
    }
    expect(problemas({ 'src/lib/servidor/busca.ts': (t) => t.replace(/WHERE memoria_id \$\{dentro\} ORDER BY principal/, 'WHERE removida_em IS NULL AND memoria_id ${dentro} ORDER BY principal') }).join()).toContain('SQL de quem vê o quê');
    expect(problemas({ 'src/lib/servidor/busca.ts': (t) => `${t}\nconst x = \`SELECT * FROM memorias m WHERE \${FILTRO_VISIVEL}\`;` }).join()).toContain('SQL de quem vê o quê');
    // A consulta do índice lê a situação do relato e a remoção no SELECT, para o código conferir: passa
    expect(deVerdade['src/lib/servidor/busca.ts']).toMatch(/r\.situacao AS situacao_do_relato/);
  });

  it('a regra entra no SQL só pelos fragmentos importados de quem-ve.ts', () => {
    const importacao = "import { lerEspera, sqlVeMemoria, veORelato } from './quem-ve';";
    expect(deVerdade['src/lib/servidor/busca.ts']).toContain(importacao);
    // Um fragmento escrito no próprio arquivo, com o nome de um de lá ou não, é recusado
    const local = (t: string) => t.replace(importacao, "import { lerEspera, veORelato } from './quem-ve';\nconst sqlVeMemoria = (..._: unknown[]) => '1';");
    expect(problemas({ 'src/lib/servidor/busca.ts': local }).join()).toContain('o fragmento sqlVeMemoria não vem de quem-ve.ts');
    expect(problemas({ 'src/lib/servidor/busca.ts': (t) => t.replace('${sqlVeMemoria({', '${sqlMinhaRegra({') }).join()).toContain('o fragmento sqlMinhaRegra não vem de quem-ve.ts');
    // Sem a regra da memória no SQL, também
    expect(problemas({ 'src/lib/servidor/busca.ts': (t) => t.replace(/ WHERE \$\{sqlVeMemoria\(\{ so: 'publicada', pessoa: '\?2' \}\)\}/, '') }).join()).toContain('passa pela regra de quem-ve.ts (sqlVeMemoria)');
  });

  it('o relato passa por veORelato de quem-ve.ts, e a espera só por lerEspera (o defeito 1 da MEM-3)', () => {
    expect(problemas({ 'src/lib/servidor/busca.ts': (t) => t.replaceAll('veORelato(', 'outraRegra(') }).join()).toContain('o relato que a busca lê passa pela regra de quem-ve.ts');
    // A leitura própria da espera, a que tratava '[]' como sem espera, é recusada
    const propria = (t: string) => t.replaceAll('lerEspera(l.so_para_nucleos)', 'nucleosDoRelato(l.so_para_nucleos)').replaceAll('lerEspera(x.so_para_nucleos)', 'nucleosDoRelato(x.so_para_nucleos)');
    expect(problemas({ 'src/lib/servidor/busca.ts': propria }).join()).toContain('a espera do relato é lida por lerEspera');
    expect(problemas({ 'src/lib/servidor/busca.ts': (t) => `${t}\nconst e = (l: Record<string, unknown>) => JSON.parse(l.so_para_nucleos as string);` }).join()).toContain('não é lida à mão');
  });
});
