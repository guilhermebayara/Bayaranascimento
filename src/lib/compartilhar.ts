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

// --- Qual nome vai na imagem (decisão do Gui, 18/11/2026, depois da sessão H) ----------------------
// Na hora de gerar, a pessoa escolhe qual nome usar para quem aparece na imagem: o da família (o apelido
// da família, senão o nome) ou o seu apelido ("Como você chama"). O padrão é o da família: o apelido
// próprio é privado, e a imagem sai do acervo. A escolha só aparece quando muda alguma coisa.

/** Qual nome usar: o da família (o padrão) ou o seu apelido. */
export type NomeNaImagem = 'familia' | 'meu';

/** Os nomes de uma pessoa que aparece na imagem, vistos por quem compartilha. */
export interface NomesDeQuemAparece {
  nome: string;
  /** o "como é chamado na família", que todos veem */
  apelidoDaFamilia: string | null;
  /** o apelido que quem compartilha deu ("Como você chama"), que só ele vê */
  meuApelido: string | null;
}

/** A escolha pedida: só "meu" escolhe o seu apelido; qualquer outra coisa é o padrão, o da família. */
export function escolhaDoNome(valor: string | null | undefined): NomeNaImagem {
  return valor === 'meu' ? 'meu' : 'familia';
}

/** O nome que sai na imagem. O da família nunca usa o apelido próprio. */
export function nomeNaImagem(p: NomesDeQuemAparece, escolha: NomeNaImagem): string {
  const daFamilia = p.apelidoDaFamilia?.trim() || p.nome;
  if (escolha === 'meu') return p.meuApelido?.trim() || daFamilia;
  return daFamilia;
}

/** A escolha só aparece quando muda algo: quem compartilha deu um apelido próprio a alguém da imagem. */
export function escolhaDoNomeAparece(pessoas: NomesDeQuemAparece[]): boolean {
  return pessoas.some((p) => nomeNaImagem(p, 'meu') !== nomeNaImagem(p, 'familia'));
}
