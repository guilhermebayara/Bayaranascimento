// Os documentos enxutos (docs/decisoes.md e docs/visual.md) terminam cada seção com um link para o
// trecho do histórico de onde a regra veio. Esta conferência garante que todo link para
// docs/historico/ aponta para um arquivo que existe e, quando leva um título (#...), para um título
// que existe nele, com a mesma conta de âncora que o GitHub usa.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(__dirname, '..');
const ENXUTOS = ['docs/decisoes.md', 'docs/visual.md', 'CLAUDE.md'];

/** A âncora de um título, como o GitHub monta: minúsculas, sem pontuação, espaços viram hífens. */
export function ancora(titulo: string): string {
  return titulo
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/** As âncoras de todos os títulos de um arquivo Markdown, com o sufixo -1, -2 dos repetidos. */
function ancorasDe(texto: string): Set<string> {
  const vistas = new Map<string, number>();
  const todas = new Set<string>();
  let emCodigo = false;
  for (const linha of texto.split('\n')) {
    if (linha.startsWith('```')) emCodigo = !emCodigo;
    if (emCodigo) continue;
    const titulo = linha.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (!titulo) continue;
    const base = ancora(titulo[1]);
    const n = vistas.get(base) ?? 0;
    vistas.set(base, n + 1);
    todas.add(n === 0 ? base : `${base}-${n}`);
  }
  return todas;
}

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

describe('links dos documentos enxutos para o histórico', () => {
  it('a conta da âncora é a do GitHub', () => {
    expect(ancora('Círculo (decisões do Gui, 17 e 18/11/2026, migração `030`)')).toBe(
      'círculo-decisões-do-gui-17-e-18112026-migração-030',
    );
    expect(ancora('Quem pode o quê')).toBe('quem-pode-o-quê');
    expect(ancorasDe('# A\n## A\n```\n# B\n```\n')).toEqual(new Set(['a', 'a-1']));
  });

  it('os dois documentos enxutos linkam o histórico em toda seção', () => {
    for (const arquivo of ['docs/decisoes.md', 'docs/visual.md']) {
      const texto = readFileSync(join(RAIZ, arquivo), 'utf8');
      const secoes = texto.split(/\n(?=## )/).slice(1);
      for (const secao of secoes) {
        const titulo = secao.split('\n')[0];
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
