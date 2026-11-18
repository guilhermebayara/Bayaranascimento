// Compartilhar uma memória como imagem (onda 2, decisão do Gui de 17/11/2026): vertical, para stories e
// WhatsApp, com a foto revelada no alto, o título, a data, um trecho curto do relato e a assinatura do
// acervo embaixo. A imagem é desenhada no navegador de quem compartilha (src/lib/cliente/compartilhar.ts),
// sem passar pelo servidor. Só gera quem vê a memória; memória só de algumas famílias pede um aviso antes.
// Regras puras, testadas em testes/compartilhar.test.ts.

/** O tamanho da imagem: vertical, na proporção dos stories (9 por 16). */
export const TAMANHO_DA_IMAGEM = { largura: 1080, altura: 1920 } as const;

/** "a família Bracarense", "as famílias Bayara e Bracarense" */
function familias(nomes: string[]): string {
  const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : (nomes[0] ?? '');
  return nomes.length > 1 ? `das famílias ${lista}` : `da família ${lista}`;
}

/**
 * O aviso antes de gerar: só quando a memória é visível só para uma ou mais famílias. Memória aberta a
 * todos, mesmo marcada com uma família, não tem aviso.
 */
export function avisoAntesDeCompartilhar(visibilidade: 'todos' | 'nucleos', nomesDasFamilias: string[]): string | null {
  if (visibilidade !== 'nucleos' || nomesDasFamilias.length === 0) return null;
  return `Esta memória é só ${familias(nomesDasFamilias)}. Quem receber a imagem vai ver.`;
}

/** Um trecho curto do relato: até `maximo` letras, cortado numa palavra, com reticências. */
export function trechoDoRelato(texto: string, maximo = 220): string {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (limpo.length <= maximo) return limpo;
  const corte = limpo.slice(0, maximo);
  const ultimoEspaco = corte.lastIndexOf(' ');
  return `${corte.slice(0, ultimoEspaco > maximo * 0.6 ? ultimoEspaco : maximo).replace(/[,;:.\s]+$/, '')}…`;
}

/** O nome do arquivo baixado: "memoria-natal-de-2025.png" */
export function nomeDoArquivo(titulo: string): string {
  const base = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `memoria-${base || 'do-acervo'}.png`;
}
