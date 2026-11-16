// Aviso de tamanho do banco (decisão do Gui, 16/11/2026). No plano gratuito, cada banco D1 vai até
// 500 MB. O site avisa a partir de 300 MB, para sobrar tempo de decidir. Se o limite chegar, a saída
// combinada é o plano Workers Paid (10 GB por banco), e não dividir o acervo em dois bancos.
// Funções puras, testadas em testes/tamanho-do-banco.test.ts.

/** Limite de um banco D1 no plano gratuito */
export const LIMITE_DO_PLANO = 500_000_000;
/** A partir daqui, o aviso aparece */
export const AVISO_A_PARTIR_DE = 300_000_000;

export interface SituacaoDoBanco {
  bytes: number;
  /** "12 MB", "310 MB" */
  texto: string;
  passouDoAviso: boolean;
}

export function emMegabytes(bytes: number): string {
  const mb = bytes / 1_000_000;
  return `${mb < 10 ? mb.toFixed(1).replace('.', ',') : Math.round(mb)} MB`;
}

export function situacaoDoBanco(bytes: number | null | undefined): SituacaoDoBanco | undefined {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return undefined;
  return { bytes, texto: emMegabytes(bytes), passouDoAviso: bytes >= AVISO_A_PARTIR_DE };
}
