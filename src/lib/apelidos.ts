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
