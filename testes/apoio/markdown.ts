// A conta das âncoras dos títulos de um Markdown, como o GitHub faz, para os testes dos documentos.

/** A âncora de um título, como o GitHub monta: minúsculas, sem pontuação, espaços viram hífens. */
export function ancora(titulo: string): string {
  return titulo
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/** As âncoras de todos os títulos de um arquivo Markdown, com o sufixo -1, -2 dos repetidos. */
export function ancorasDe(texto: string): Set<string> {
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
