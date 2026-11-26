// Tirar acento e maiúscula, numa função só (K-2 da auditoria, seção 4.1). A busca (src/lib/busca.ts) usa
// esta, e a D2 vai usar a mesma no navegador. As outras versões espalhadas pelo site ficam como estão até
// alguém mexer nelas: quem mexer passa a usar esta.

/**
 * Sem acento e em minúscula, letra por letra: "Sabará" vira "sabara", "Ção" vira "cao", com o mesmo
 * tamanho do texto de entrada, para a posição de uma palavra achada valer no texto original (o trecho
 * em volta da palavra, na busca). Uma letra que viraria duas (ligaduras raras) fica só em minúscula.
 */
export function normalizar(texto: string): string {
  let saida = '';
  for (const letra of texto) {
    const sem = letra.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    saida += sem.length === letra.length ? sem : letra.toLowerCase();
  }
  return saida;
}

/** As palavras de um texto já normalizado, com a posição de cada uma: letras e números, juntos. */
export function palavras(normal: string): { palavra: string; inicio: number }[] {
  return [...normal.matchAll(/[\p{L}\p{N}]+/gu)].map((m) => ({ palavra: m[0], inicio: m.index ?? 0 }));
}
