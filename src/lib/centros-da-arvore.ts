// Os centros da árvore (onda 2, decisão do Gui de 17/11/2026): de quem é a linha direta quando a árvore
// abre. Os administradores escolhem em Administração; "Partir de" continua para todos. Sem escolha, ou
// quando nenhum dos escolhidos serve mais, valem os três que unem os núcleos. Testado em
// testes/centros-da-arvore.test.ts.

/** Sem escolha dos administradores: Gui, Giovanna e Lucas Magno. */
export const CENTROS_PADRAO = ['gui', 'giovanna', 'lucas-magno'];
/** A chave do ajuste no banco */
export const AJUSTE_DOS_CENTROS = 'centros-da-arvore';
/** Mais que isso, a linha direta vira a árvore inteira */
export const MAXIMO_DE_CENTROS = 4;

/**
 * Os centros que valem, da lista pedida: sem repetir, só quem tem laço de árvore (filiação ou casal) e
 * só quem quem olha vê. Vazio quando nenhum serve.
 */
export function centrosValidos(pedidos: readonly string[], servem: (id: string) => boolean): string[] {
  return [...new Set(pedidos.filter((id) => typeof id === 'string' && id.trim()))].filter(servem).slice(0, MAXIMO_DE_CENTROS);
}

/** Os centros da árvore para quem olha: os escolhidos que servem, ou o padrão. */
export function centrosDaArvore(guardado: unknown, servem: (id: string) => boolean): string[] {
  const escolhidos = Array.isArray(guardado) ? centrosValidos(guardado as string[], servem) : [];
  return escolhidos.length > 0 ? escolhidos : CENTROS_PADRAO.filter(servem);
}
