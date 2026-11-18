// "Como você chama", só seu (decisão do Gui, 18/11/2026). Cada pessoa pode dar o próprio apelido a
// alguém, na página dela ou pela ficha da árvore. Só quem deu vê, e no site inteiro, para ele, a pessoa
// aparece com esse apelido. Sem apelido próprio, vale o "como é chamado na família" e, depois, o nome.
// A escolha é privada, como a proximidade do círculo, e não passa pelo espelho. Migração 090.

/** O tamanho máximo, o mesmo do "como é chamado na família" */
export const LIMITE_DO_APELIDO = 40;

/** Lê o apelido de um pedido: o texto aparado, ou nada (que apaga o apelido). Longo demais é recusado. */
export function lerApelido(bruto: unknown): { ok: true; apelido: string | null } | { ok: false; motivo: string } {
  const texto = typeof bruto === 'string' ? bruto.replace(/\s+/g, ' ').trim() : '';
  if (!texto) return { ok: true, apelido: null };
  if (texto.length > LIMITE_DO_APELIDO) return { ok: false, motivo: `O apelido tem no máximo ${LIMITE_DO_APELIDO} letras.` };
  return { ok: true, apelido: texto };
}

/** Quem pode dar apelido: a quem vê, e a ninguém além dos outros (o próprio nome é da ficha). */
export function podeDarApelido(dono: string, pessoa: string, ve: boolean): boolean {
  return dono !== pessoa && ve;
}

// --- Apelidos na ficha (decisão do Gui, 18/11/2026, depois da sessão H) ---------------------------
// Na ficha de editar a pessoa e no cadastro, o apelido deixa de ser um campo sempre aberto. Quem já tem
// apelido aparece com ele, com "Mudar" e "Tirar"; no lugar do campo vazio, "Adicionar apelido", que
// pergunta de quem é: da família (o "como é chamado na família", que todos veem) ou só seu (o "Como você
// chama", que só quem deu vê). Na própria ficha não há apelido só seu: ninguém dá apelido a si mesmo.

/** De quem é o apelido: da família, que todos veem, ou o seu, que só você vê. */
export type DeQuemEOApelido = 'familia' | 'meu';

/** Os dois na ordem da ficha: o da família primeiro, porque é o que todo mundo vê. */
export const DE_QUEM_E_O_APELIDO: readonly DeQuemEOApelido[] = ['familia', 'meu'];

/** O que a ficha mostra e oferece: os apelidos que já existem e os que "Adicionar apelido" oferece. */
export function apelidosDaFicha(a: { familia: string | null | undefined; meu: string | null | undefined; propria: boolean }): {
  /** os tipos que cabem nesta ficha: na própria, só o da família */
  tipos: DeQuemEOApelido[];
  /** os que já têm apelido, mostrados como texto, com "Mudar" e "Tirar" */
  existentes: { deQuem: DeQuemEOApelido; apelido: string }[];
  /** os que ainda não têm: é o que "Adicionar apelido" oferece */
  faltam: DeQuemEOApelido[];
  /** "Adicionar apelido" pergunta de quem é só quando sobra mais de um */
  pergunta: boolean;
} {
  const tipos = DE_QUEM_E_O_APELIDO.filter((t) => t === 'familia' || !a.propria);
  const valor = (t: DeQuemEOApelido) => (t === 'familia' ? a.familia : a.meu)?.trim() || '';
  const existentes = tipos.filter((t) => valor(t)).map((deQuem) => ({ deQuem, apelido: valor(deQuem) }));
  const faltam = tipos.filter((t) => !valor(t));
  return { tipos, existentes, faltam, pergunta: faltam.length > 1 };
}

/** A frase curta, colada na escolha, que diz quem vê o apelido. Sem nome (no cadastro), "a pessoa". */
export function quemVeOApelido(deQuem: DeQuemEOApelido, nome?: string | null): string {
  if (deQuem === 'familia') return 'Um apelido que a família toda vê.';
  return `Só você vê. No site inteiro, para você, ${nome || 'a pessoa'} aparece assim.`;
}

/** Como o apelido que já existe é descrito na linha dele, em mono. */
export const DESCRICAO_DO_APELIDO: Record<DeQuemEOApelido, string> = {
  familia: 'Da família, todos veem',
  meu: 'Seu, só você vê',
};

/**
 * O apelido só seu que a ficha manda junto (o campo `meuApelido`). Fica de fora quando o campo não veio
 * ou quando a ficha é da própria pessoa: o envio nunca grava apelido de alguém para si mesmo.
 */
export function apelidoSoSeuDaFicha(bruto: unknown, dono: string, pessoa: string): { ok: true; guardar: boolean; apelido: string | null } | { ok: false; motivo: string } {
  if (bruto === null || bruto === undefined || !podeDarApelido(dono, pessoa, true)) return { ok: true, guardar: false, apelido: null };
  const lido = lerApelido(bruto);
  return lido.ok ? { ok: true, guardar: true, apelido: lido.apelido } : lido;
}
