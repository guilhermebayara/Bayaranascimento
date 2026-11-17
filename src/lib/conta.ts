// "Sua conta" (docs/decisoes.md, "Sua conta"): as listas de cada seção, sem tela. A tela é desenhada
// na revisão visual (fase 3); estas regras ficam prontas e testadas antes.
//
// Quem chama entrega o que a pessoa vê (as memórias de listarMemorias, os capítulos de
// listarCapitulos, os laços de listarLacosDoCoracao). As funções ainda conferem, por segurança, que
// cada item é da pessoa e que a memória dele está entre as que ela vê: nada de fora entra na conta.

export interface MemoriaDaConta {
  id: string;
  criadaPor: string;
  situacao: 'rascunho' | 'publicada';
  fotos: { id: number; enviadaPor: string }[];
}

export interface RelatoDaConta {
  id: number;
  memoriaId: string;
  por: string;
  registradoPor: string;
  situacao: 'rascunho' | 'publicada';
}

export interface CapituloDaConta {
  id: string;
  criadoPor: string;
}

export interface LacoDaConta {
  id: number;
  dono: string;
  pessoa: string;
  privado: boolean;
  proximidade: number | null;
}

export interface OQueVoceCriou<M extends MemoriaDaConta, R, C> {
  memorias: M[];
  /** os relatos que a pessoa escreveu; `emNomeDe` diz de quem é o relato que ela registrou por outra pessoa */
  relatos: (R & { emNomeDe: string | null })[];
  fotos: { memoria: M; foto: M['fotos'][number] }[];
  capitulos: C[];
}

/**
 * "O que você criou": as memórias que criou, os relatos que escreveu (inclusive os registrados em
 * nome de outra pessoa, marcados assim), as fotos que enviou e os capítulos que criou. Só o que já
 * foi publicado e que a pessoa ainda pode ver; o que está em rascunho fica em "Rascunhos".
 */
export function oQueVoceCriou<M extends MemoriaDaConta, R extends RelatoDaConta, C extends CapituloDaConta>(
  eu: string,
  vistas: { memorias: M[]; relatos: R[]; capitulos: C[] },
): OQueVoceCriou<M, R, C> {
  const publicadas = vistas.memorias.filter((m) => m.situacao === 'publicada');
  const porId = new Map(publicadas.map((m) => [m.id, m]));
  return {
    memorias: publicadas.filter((m) => m.criadaPor === eu),
    relatos: vistas.relatos
      .filter((r) => r.registradoPor === eu && r.situacao === 'publicada' && porId.has(r.memoriaId))
      .map((r) => ({ ...r, emNomeDe: r.por === eu ? null : r.por })),
    fotos: publicadas.flatMap((m) => m.fotos.filter((f) => f.enviadaPor === eu).map((foto) => ({ memoria: m, foto }))),
    capitulos: vistas.capitulos.filter((c) => c.criadoPor === eu),
  };
}

/** "Seus laços do coração": os que a pessoa definiu, inclusive os "só eu", com a proximidade, que só ela vê. */
export function seusLacos<L extends LacoDaConta>(eu: string, lacos: L[]): L[] {
  return lacos.filter((l) => l.dono === eu).sort((a, b) => (a.proximidade ?? 9) - (b.proximidade ?? 9));
}

/** "Rascunhos": as memórias e os relatos que a pessoa começou e não publicou. */
export function seusRascunhos<M extends MemoriaDaConta, R extends RelatoDaConta>(eu: string, memorias: M[], relatos: R[]): { memorias: M[]; relatos: R[] } {
  const minhas = memorias.filter((m) => m.situacao === 'rascunho' && m.criadaPor === eu);
  // O relato de uma memória que ainda é rascunho é uma etapa do próprio rascunho: não vira outra linha
  const emRascunho = new Set(minhas.map((m) => m.id));
  return {
    memorias: minhas,
    relatos: relatos.filter((r) => r.situacao === 'rascunho' && r.registradoPor === eu && !emRascunho.has(r.memoriaId)),
  };
}

/** "Lixeira": o que a pessoa mesma mandou para a lixeira, para recuperar. Quem restaura o quê não muda. */
export function suaLixeira<E extends { excluidaPor: string | null }>(eu: string, excluidas: E[]): E[] {
  return excluidas.filter((m) => m.excluidaPor === eu);
}

export interface ItemDeAdministracao {
  rotulo: string;
  href: string;
  /** link de baixar arquivo */
  baixar?: boolean;
}

/**
 * "Administração", só para os administradores, numa seção à parte no fim: tipos de momento,
 * famílias e membros, a carta de Natal, a página do sistema visual, "Baixar cópia do acervo" e, onde o espelho existe (na homologação e no
 * computador), o espelho da produção. O tamanho do banco entra como texto, à parte. Para quem não é
 * administrador, nada.
 */
export function administracao(usuario: { admin: boolean }, onde: { podeEspelhar: boolean }): ItemDeAdministracao[] {
  if (!usuario.admin) return [];
  return [
    { rotulo: 'Tipos de momento', href: '/admin/tipos' },
    { rotulo: 'Famílias e membros', href: '/admin/familias' },
    { rotulo: 'Carta de Natal', href: '/admin/carta' },
    { rotulo: 'Sistema visual', href: '/sistema' },
    { rotulo: 'Baixar cópia do acervo', href: '/api/copia', baixar: true },
    ...(onde.podeEspelhar ? [{ rotulo: 'Espelho da produção', href: '/admin/espelho' }] : []),
  ];
}
