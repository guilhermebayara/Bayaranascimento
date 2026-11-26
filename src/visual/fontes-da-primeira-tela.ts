// As fontes que a primeira tela espera, pedidas logo no começo da página com <link rel="preload"> (causa 7
// da medição M1, docs/desempenho/2026-11-22-medicao.md): a serifa da assinatura ("MEMÓRIAS", o maior
// elemento da primeira tela do Explorar) e a grotesca do texto. São os mesmos arquivos que o CSS das
// fontes usa (o subconjunto latino, que tem os acentos do português), pelo mesmo endereço.
import serifa from '@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2?url';
import grotesca from '@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2?url';

/** Os arquivos a pedir antes: os da combinação do site. */
export function fontesParaPedirAntes(): string[] {
  return [serifa, grotesca];
}
