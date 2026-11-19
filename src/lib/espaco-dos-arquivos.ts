// Espaço das fotos e áudios (decisão do Gui, 18/11/2026). O plano gratuito do R2 dá 10 GB para a conta
// inteira, e o site avisa a partir de 7 GB, para sobrar tempo de decidir. A conta é do próprio site:
// cada foto, retrato e áudio guarda o tamanho ao entrar (migração 070), e o espaço é a soma, sem
// consultar o bucket. Os arquivos de exemplo (debaixo de "exemplos/") moram no bucket de teste e não
// contam. Funções puras, testadas em testes/espaco-dos-arquivos.test.ts.

/** Limite do R2 no plano gratuito, para a conta inteira */
export const LIMITE_DO_R2 = 10_000_000_000;
/** A partir daqui, o aviso aparece e vira pendência da administração */
export const AVISO_DO_R2 = 7_000_000_000;

export interface SituacaoDoEspaco {
  bytes: number;
  /** "1,2 GB", "350 MB" */
  texto: string;
  /** de 2 a 100, para a medida */
  porcento: number;
  passouDoAviso: boolean;
  /** arquivos de antes da contagem que ainda não foram medidos */
  semMedida: number;
}

/** "350 MB" abaixo de 1 GB; "1,2 GB" acima. */
export function emGigabytes(bytes: number): string {
  if (bytes < 50_000) return '0 MB';
  if (bytes < 1_000_000_000) {
    const mb = bytes / 1_000_000;
    return `${mb < 10 ? mb.toFixed(1).replace('.', ',') : Math.round(mb)} MB`;
  }
  const gb = bytes / 1_000_000_000;
  return `${gb.toFixed(1).replace('.', ',').replace(',0', '')} GB`;
}

export function situacaoDoEspaco(bytes: number | null | undefined, semMedida = 0): SituacaoDoEspaco | undefined {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return undefined;
  return {
    bytes,
    texto: emGigabytes(bytes),
    porcento: Math.max(2, Math.min(100, Math.round((bytes / LIMITE_DO_R2) * 100))),
    passouDoAviso: bytes >= AVISO_DO_R2,
    semMedida: Math.max(0, Math.floor(semMedida)),
  };
}

/** A linha da medida: "1,2 GB de 10 GB" */
export const fraseDoEspaco = (s: SituacaoDoEspaco): string => `${s.texto} de ${emGigabytes(LIMITE_DO_R2)}`;

/** A nota de quando ainda há arquivos de antes sem medida: "Faltam medir 12 fotos de antes da contagem." */
export function notaDosSemMedida(n: number): string | null {
  if (n <= 0) return null;
  return n === 1 ? 'Falta medir 1 arquivo de antes da contagem. Ele entra na soma da próxima vez que esta página abrir.' : `Faltam medir ${n} arquivos de antes da contagem. Eles entram na soma aos poucos, cada vez que esta página abre.`;
}
