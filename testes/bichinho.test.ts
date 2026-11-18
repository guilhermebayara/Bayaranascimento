// "Bichinho" no lugar de "bicho" (decisão do Gui, 18/11/2026: "bicho" soa frio). Em todo texto que chega
// à tela: o cadastro, a contagem de Pessoas, a camada da árvore, a legenda e os textos de ajuda. No
// código, os nomes internos (tipo = 'bicho' no banco, as variáveis, as classes do CSS e os nomes dos
// campos) ficam como estão, sem migração. Este teste lê as páginas, os componentes e o código do
// navegador e procura "bicho" solto no texto, tirando antes o que é nome interno.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const arquivos = (pasta: string): string[] =>
  readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });

// O que leva à tela: páginas, componentes, o código do navegador e as montagens do servidor que
// escrevem rótulos. A semente e o espelho são dados de exemplo, que a família poderia escrever igual.
const ALVOS = [
  ...arquivos('src/pages'),
  ...arquivos('src/components'),
  ...arquivos('src/layouts'),
  ...arquivos('src/lib/cliente'),
  'src/lib/servidor/circulo.ts',
  'src/lib/servidor/conta.ts',
  'src/lib/parentesco.ts',
  'src/lib/conta.ts',
  'src/lib/painel.ts',
  'src/lib/familias.ts',
].filter((f) => /\.(astro|ts)$/.test(f));

/**
 * Devolve os textos com "bicho" solto. Olha só o que pode virar texto: o que está entre aspas e o que
 * está entre as marcas do HTML. O valor exato 'bicho' ou 'bichos' é o nome interno (o tipo no banco, o
 * nome do campo, a camada da árvore) e passa, a não ser quando vira texto por uma reserva
 * (?? 'bicho', || 'bicho') ou pelo plural. As classes do CSS (no--bicho, no__bicho) também passam.
 */
export function bichoSolto(fonte: string): string[] {
  const semComentarios = fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    .replace(/[-_]{2}bichos?\b/g, '');
  const achados: string[] = [];
  const solto = /\bbichos?\b/i;
  for (const [, texto] of semComentarios.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g).map((m) => [m[0], m[1] ?? m[2] ?? m[3]])) {
    if (!solto.test(texto)) continue;
    if (/^bichos?$/.test(texto)) continue;
    achados.push(texto);
  }
  for (const m of semComentarios.matchAll(/(\?\?|\|\||plural\([^,]+,)\s*'(bichos?)'/g)) achados.push(m[0]);
  for (const m of semComentarios.matchAll(/>([^<>{}]+)</g)) if (solto.test(m[1]) && !/['"=;]/.test(m[1])) achados.push(m[1].trim());
  return achados;
}

describe('"bichinho" no lugar de "bicho" no texto da tela', () => {
  it('o filtro reconhece um texto solto e deixa passar o nome interno', () => {
    expect(bichoSolto(`<span>É pessoa ou bicho?</span>`)).toHaveLength(1);
    expect(bichoSolto(`const b = p.tipo === 'bicho' ? 1 : 2;`)).toEqual([]);
    expect(bichoSolto(`<input name="bichos" value="bicho" />`)).toEqual([]);
    expect(bichoSolto(`<span>Bichinhos</span>`)).toEqual([]);
    expect(bichoSolto(`plural(n, 'bicho', 'bichos')`)).toHaveLength(1);
  });

  for (const arquivo of ALVOS) {
    it(`${arquivo} não diz "bicho"`, () => {
      expect(bichoSolto(readFileSync(arquivo, 'utf-8'))).toEqual([]);
    });
  }
});
