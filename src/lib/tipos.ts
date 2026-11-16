// Tipos de momento. A lista vive no banco e é cuidada pelos admins.
// "Outro" é o tipo de escape: a pessoa escreve o que foi, e a memória é salva assim.

export interface Tipo {
  id: string;
  rotulo: string;
  cor: string;
}

export const TIPO_OUTRO = 'outro';
export const TIPO_PADRAO = 'cotidiano';

/** Como o tipo de uma memória aparece: o texto livre vale como rótulo quando o tipo é "Outro". */
export function tipoDaMemoria(tipos: Tipo[], memoria: { tipo: string; tipoOutro?: string | null }): Tipo {
  // Rascunho salvo antes de escolher o tipo
  if (!memoria.tipo) return { id: '', rotulo: 'Sem tipo', cor: 'var(--cor-texto-suave)' };
  const tipo = tipos.find((t) => t.id === memoria.tipo) ?? { id: memoria.tipo, rotulo: memoria.tipo, cor: 'var(--cor-texto)' };
  if (tipo.id === TIPO_OUTRO && memoria.tipoOutro?.trim()) return { ...tipo, rotulo: memoria.tipoOutro.trim() };
  return tipo;
}
