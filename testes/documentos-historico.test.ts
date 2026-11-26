// Os documentos de regras (cada arquivo de docs/regras/ e docs/visual.md) terminam cada seção com um
// link para o trecho do histórico de onde a regra veio, e a fila de docs/decisoes.md também. Esta
// conferência garante que todo link para docs/historico/ aponta para um arquivo que existe e, quando leva
// um título (#...), para um título que existe nele, com a mesma conta de âncora que o GitHub usa.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ancora, ancorasDe } from './apoio/markdown';

const RAIZ = join(__dirname, '..');
const REGRAS = readdirSync(join(RAIZ, 'docs/regras'))
  .filter((nome) => nome.endsWith('.md'))
  .map((nome) => `docs/regras/${nome}`);
const COM_ORIGEM = [...REGRAS, 'docs/visual.md', 'docs/decisoes.md'];
const ENXUTOS = [...COM_ORIGEM, 'CLAUDE.md', 'docs/copia-no-drive.md', 'docs/qa.md'];
const SEM_ORIGEM = new Set(['docs/decisoes.md: ## Índice']);

/** Os links Markdown de um texto que levam a docs/historico/. */
function linksParaOHistorico(arquivo: string, texto: string) {
  const links: { destino: string; arquivo: string; titulo?: string }[] = [];
  for (const [, destino] of texto.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^[a-z]+:/i.test(destino)) continue;
    const [caminho, titulo] = destino.split('#');
    const absoluto = join(RAIZ, dirname(arquivo), caminho);
    const noRepositorio = relative(RAIZ, absoluto).split('\\').join('/');
    if (!noRepositorio.startsWith('docs/historico/')) continue;
    links.push({ destino, arquivo: noRepositorio, titulo: titulo ? decodeURIComponent(titulo) : undefined });
  }
  return links;
}

describe('links dos documentos de regras para o histórico', () => {
  it('a conta da âncora é a do GitHub', () => {
    expect(ancora('Círculo (decisões do Gui, 17 e 18/11/2026, migração `030`)')).toBe(
      'círculo-decisões-do-gui-17-e-18112026-migração-030',
    );
    expect(ancora('Quem pode o quê')).toBe('quem-pode-o-quê');
    expect(ancorasDe('# A\n## A\n```\n# B\n```\n')).toEqual(new Set(['a', 'a-1']));
  });

  it('as regras estão divididas por assunto, e o índice aponta para cada arquivo', () => {
    expect(REGRAS.length).toBeGreaterThan(10);
    const indice = readFileSync(join(RAIZ, 'docs/decisoes.md'), 'utf8');
    for (const arquivo of REGRAS) {
      const nome = arquivo.replace('docs/', '');
      expect(indice.includes(`](${nome})`), `${nome} fora do índice de docs/decisoes.md`).toBe(true);
    }
  });

  it('as regras, o visual e a fila linkam o histórico em toda seção', () => {
    for (const arquivo of COM_ORIGEM) {
      const texto = readFileSync(join(RAIZ, arquivo), 'utf8');
      const secoes = texto.split(/\n(?=## )/).slice(1);
      for (const secao of secoes) {
        const titulo = secao.split('\n')[0];
        if (SEM_ORIGEM.has(`${arquivo}: ${titulo}`)) continue;
        expect(linksParaOHistorico(arquivo, secao).length, `${arquivo}, ${titulo}: sem link para o histórico`).toBeGreaterThan(0);
      }
    }
  });

  for (const arquivo of ENXUTOS) {
    it(`todo link de ${arquivo} para docs/historico/ aponta para arquivo e título que existem`, () => {
      const texto = readFileSync(join(RAIZ, arquivo), 'utf8');
      for (const link of linksParaOHistorico(arquivo, texto)) {
        const caminho = join(RAIZ, link.arquivo);
        expect(existsSync(caminho), `${arquivo}: ${link.destino} (arquivo não existe)`).toBe(true);
        if (link.titulo === undefined) continue;
        const ancoras = ancorasDe(readFileSync(caminho, 'utf8'));
        expect(ancoras.has(link.titulo), `${arquivo}: ${link.destino} (título não existe)`).toBe(true);
      }
    });
  }
});
