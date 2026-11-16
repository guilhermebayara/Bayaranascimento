// Os sobrenomes de uma família, como o administrador escreve em /admin/familias: separados por vírgula.
// Função pura, com teste em testes/sistema.test.ts.

export const MAXIMO_DE_SOBRENOMES = 4;
const SOBRENOME = /^[\p{L}][\p{L}'’ -]*$/u;

/** Lê "Bayara, Bracarense" e devolve a lista, sem repetir, ou o recado do que está errado. */
export function lerListaDeSobrenomes(texto: string): { sobrenomes: string[] } | { erro: string } {
  const sobrenomes: string[] = [];
  for (const parte of texto.split(/[,;\n]/)) {
    const sobrenome = parte.trim().replace(/\s+/g, ' ');
    if (!sobrenome) continue;
    if (sobrenome.length > 30 || !SOBRENOME.test(sobrenome)) return { erro: `"${sobrenome.slice(0, 30)}" não parece um sobrenome. Use só letras.` };
    if (!sobrenomes.some((s) => s.toLowerCase() === sobrenome.toLowerCase())) sobrenomes.push(sobrenome);
  }
  if (!sobrenomes.length) return { erro: 'Escreva pelo menos um sobrenome.' };
  if (sobrenomes.length > MAXIMO_DE_SOBRENOMES) return { erro: `Uma família leva até ${MAXIMO_DE_SOBRENOMES} sobrenomes.` };
  return { sobrenomes };
}
