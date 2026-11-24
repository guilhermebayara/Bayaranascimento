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

/**
 * A linha do rascunho no Início (crítica C1, resposta do Gui de 22/11/2026): com um rascunho de relato só,
 * ela diz de qual memória ele é e que ninguém viu ainda, para o relato que a pessoa acha que contou não
 * ficar parado sem ela saber. Com outro rascunho ou mais de um, a linha conta quantos são, como antes.
 * `nome` é o nome de quem conta, quando a pessoa registra o relato de outra.
 */
export function fraseDoRascunho(rascunhos: { memorias: unknown[]; relatos: { por: string; titulo: string }[] }, eu: string, nome: (id: string) => string): string {
  const quantos = rascunhos.memorias.length + rascunhos.relatos.length;
  const [relato] = rascunhos.relatos;
  if (quantos === 1 && relato) {
    const de = relato.por === eu ? 'Seu relato' : `O relato de ${nome(relato.por)}`;
    return `${de} em “${relato.titulo}” é um rascunho: ninguém viu ainda.`;
  }
  return quantos === 1 ? 'Você tem um rascunho.' : `Você tem ${quantos} rascunhos.`;
}

/** "Lixeira": o que a pessoa mesma mandou para a lixeira, para recuperar. Quem restaura o quê não muda. */
export function suaLixeira<E extends { excluidaPor: string | null }>(eu: string, excluidas: E[]): E[] {
  return excluidas.filter((m) => m.excluidaPor === eu);
}

/** Quantos itens a lista aberta de "O que você criou" mostra (resposta do Gui à P151, 17/11/2026). */
export const LIMITE_DA_LISTA = 10;

/**
 * A lista aberta de "O que você criou" mostra só o começo, que quem chama entrega já com o mais
 * recente primeiro. `total` diz quantos existem, para a tela avisar que há mais.
 */
export function oComeco<T>(lista: T[], limite = LIMITE_DA_LISTA): { mostra: T[]; total: number; haMais: boolean } {
  return { mostra: lista.slice(0, limite), total: lista.length, haMais: lista.length > limite };
}

/**
 * A frase da lixeira na conta (resposta do Gui à P152, 17/11/2026). Quem administra lê a conta do
 * que a lixeira mostra; os demais, a do que mandaram para lá, que é o que a lixeira deles mostra.
 */
export function fraseDaLixeira(admin: boolean, quantas: number): string {
  if (admin) return quantas === 0 ? 'Nada na lixeira.' : quantas === 1 ? 'Uma coisa na lixeira.' : `${quantas} coisas na lixeira.`;
  return quantas === 0 ? 'Nada seu na lixeira.' : quantas === 1 ? 'Uma coisa sua na lixeira.' : `${quantas} coisas suas na lixeira.`;
}

export interface ItemDeAdministracao {
  rotulo: string;
  href: string;
  /** link de baixar arquivo */
  baixar?: boolean;
  /** o arquivo é montado no aparelho, das partes que o navegador pede (a cópia do acervo, sessão D1e) */
  emPartes?: boolean;
  /** a situação do item, em mono, embaixo do nome ("14 tipos", "escrita em 2026") */
  situacao?: string;
  /** o item pede uma ação de quem administra: ganha o ponto na cor de alerta */
  pendencia?: boolean;
  /** o grupo do atalho no cartão (os links de baixar ficam no pé, sem grupo) */
  tema?: TemaDaAdministracao;
}

/**
 * O que a administração sabe do acervo, para a situação de cada item e as pendências. `fotosSoltas` e
 * `duplicados` dependem das listas da onda 2: enquanto elas não existem, ficam `null` (indisponível).
 */
export interface SituacaoDaAdministracao {
  tipos: number;
  familias: number;
  /** a transcrição automática dos áudios (src/lib/transcricao.ts) */
  transcricao?: 'sem-binding' | 'desligada' | 'ligada';
  /** quantas pessoas os administradores escolheram como centros da árvore; vazio no padrão */
  centros?: number | null;
  /** a carta de Natal mais recente, ou null se ninguém escreveu */
  carta: { escritaEm: string } | null;
  banco?: { bytes: number; passouDoAviso: boolean };
  /** o espaço das fotos e áudios no R2, pela soma do que cada arquivo guardou (src/lib/espaco-dos-arquivos.ts) */
  espaco?: { bytes: number; passouDoAviso: boolean };
  /**
   * A cópia mensal do Drive. Só a produção recebe a cópia do script: nas prévias, na homologação e no
   * computador, `conferida` é false, e ela nunca vira pendência.
   */
  copiaMensal: { conferida: boolean; ultima: string | null };
  /** fotos sem memória há mais de 30 dias (onda 2) */
  fotosSoltas?: number | null;
  /** possíveis cadastros duplicados (onda 2) */
  duplicados?: number | null;
  /** pedidos para excluir pessoa à espera de um administrador (decisão do Gui depois da sessão I) */
  exclusoes?: number | null;
}

export type TipoDePendencia = 'carta' | 'banco' | 'espaco' | 'copia' | 'fotos-soltas' | 'duplicados' | 'exclusoes';

export interface Pendencia {
  tipo: TipoDePendencia;
  /** a frase curta, em "Sua conta" */
  texto: string;
  /** onde se resolve; vazio quando se resolve fora do site (o banco e a cópia) */
  href?: string;
  /** quantos itens ela junta, para as listas (fotos soltas, duplicados) */
  quantas?: number;
}

/**
 * O prazo da cópia mensal: o script roda todo dia 1º, e passa a contar como atrasada quando a última
 * cópia tem mais de 35 dias (um mês e uns dias de folga para o dia 1º que cai num fim de semana ou
 * uma falha de um dia). Escolha da sessão de construção, para o Gui conferir.
 */
export const PRAZO_DA_COPIA_MENSAL = 35;

const UM_DIA = 24 * 60 * 60 * 1000;

/** "AAAA-MM-DD HH:MM:SS" do SQLite, em UTC, ou ISO: vira data. */
const lerData = (texto: string): Date => new Date(/T/.test(texto) ? texto : `${texto.replace(' ', 'T')}Z`);

/** A cópia mensal está atrasada: nunca foi feita, ou a última passou do prazo. */
export function copiaAtrasada(ultima: string | null, hoje: Date, prazo = PRAZO_DA_COPIA_MENSAL): boolean {
  if (!ultima) return true;
  const quando = lerData(ultima);
  if (Number.isNaN(quando.getTime())) return true;
  return hoje.getTime() - quando.getTime() > prazo * UM_DIA;
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** "2 set 2026", no fuso de São Paulo, como o script grava o nome do arquivo */
export function diaDaCopia(ultima: string): string {
  const d = new Date(lerData(ultima).getTime() - 3 * 60 * 60 * 1000);
  return `${d.getUTCDate()} ${MESES_CURTOS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * A frase ao lado de "Baixar cópia do acervo" (decisão do Gui depois do QA de 18/11/2026): a cópia leva
 * tudo, inclusive o que o administrador não vê no site, porque é ela que restaura o acervo inteiro.
 */
export const FRASE_DA_COPIA_DO_ACERVO = 'A cópia leva o acervo inteiro, inclusive o que você não vê no site, porque é ela que restaura tudo.';

/**
 * A frase ao lado de "Baixar cópia para o espelho" (sessão D1e): o que ela leva e para que serve. O botão só
 * aparece fora da homologação, porque é a produção que manda a família para lá.
 */
export const FRASE_DA_COPIA_PARA_O_ESPELHO = 'A cópia para o espelho leva só as pessoas, as famílias e os laços, para refazer o espelho na homologação.';

/** A frase da cópia mensal no cartão, ao lado do banco. */
export function fraseDaCopiaMensal(copia: SituacaoDaAdministracao['copiaMensal'], hoje: Date): string {
  if (!copia.conferida) return 'Cópia mensal: só na produção';
  if (!copia.ultima) return 'Cópia mensal ainda não feita';
  return copiaAtrasada(copia.ultima, hoje) ? `Cópia mensal atrasada: a última foi em ${diaDaCopia(copia.ultima)}` : `Última cópia mensal: ${diaDaCopia(copia.ultima)}`;
}

/** Quanto do plano gratuito o banco ocupa, de 2 a 100, para a medida. */
export function porcentoDoBanco(bytes: number, limite: number): number {
  return Math.max(2, Math.min(100, Math.round((bytes / limite) * 100)));
}

/**
 * As pendências da administração (escolha do Gui no conceito da sessão E, 17/11/2026): o que pede uma
 * ação de quem administra. Somam no número do retrato do topo e ganham a marca no cartão.
 */
export function pendenciasDaAdministracao(s: Pick<SituacaoDaAdministracao, 'carta' | 'banco' | 'espaco' | 'copiaMensal' | 'fotosSoltas' | 'duplicados' | 'exclusoes'>, hoje: Date): Pendencia[] {
  const lista: Pendencia[] = [];
  if (!s.carta) lista.push({ tipo: 'carta', texto: 'A carta de Natal ainda não foi escrita.', href: '/admin/carta' });
  if (s.banco?.passouDoAviso) lista.push({ tipo: 'banco', texto: 'O banco está perto do limite do plano gratuito.' });
  if (s.espaco?.passouDoAviso) lista.push({ tipo: 'espaco', texto: 'As fotos e os áudios estão perto do limite do plano gratuito.' });
  if (s.copiaMensal.conferida && copiaAtrasada(s.copiaMensal.ultima, hoje)) {
    lista.push({ tipo: 'copia', texto: s.copiaMensal.ultima ? `A cópia mensal está atrasada: a última foi em ${diaDaCopia(s.copiaMensal.ultima)}.` : 'A cópia mensal ainda não foi feita.' });
  }
  const n = s.fotosSoltas ?? 0;
  if (n > 0) lista.push({ tipo: 'fotos-soltas', texto: n === 1 ? 'Uma foto sem memória há mais de 30 dias.' : `${n} fotos sem memória há mais de 30 dias.`, href: '/admin/fotos-soltas', quantas: n });
  const d = s.duplicados ?? 0;
  if (d > 0) lista.push({ tipo: 'duplicados', texto: d === 1 ? 'Um possível cadastro duplicado.' : `${d} possíveis cadastros duplicados.`, href: '/admin/duplicados', quantas: d });
  const e = s.exclusoes ?? 0;
  if (e > 0) lista.push({ tipo: 'exclusoes', texto: e === 1 ? 'Um pedido para excluir uma pessoa.' : `${e} pedidos para excluir pessoas.`, href: '/admin/exclusoes', quantas: e });
  return lista;
}

/** "1 pendência", "2 pendências" */
export const contaDePendencias = (n: number): string => (n === 1 ? '1 pendência' : `${n} pendências`);

/**
 * Os atalhos da administração em grupos, por tema (observação do Gui, 18/11/2026: os quadros soltos
 * quebravam a página). "Do acervo" é o que define o acervo; "Para arrumar", o que pede faxina; e
 * "Ferramentas", o resto. Grupo vazio não aparece.
 */
export type TemaDaAdministracao = 'acervo' | 'arrumar' | 'ferramentas';
export const TEMAS_DA_ADMINISTRACAO: { tema: TemaDaAdministracao; titulo: string }[] = [
  { tema: 'acervo', titulo: 'Do acervo' },
  { tema: 'arrumar', titulo: 'Para arrumar' },
  { tema: 'ferramentas', titulo: 'Ferramentas' },
];
/** O quarto grupo do cartão: as medidas do banco e das fotos e as cópias (proposta A da sessão H). */
export const GRUPO_DO_ESPACO = 'Espaço e cópias';

/**
 * Em que grupo do cartão cada pendência mora, para o balão das pendências dizer onde ela está e o grupo
 * dela levar a marca (proposta A do conceito da sessão H, escolha do Gui de 18/11/2026).
 */
export function grupoDaPendencia(p: Pick<Pendencia, 'tipo'>): string {
  if (p.tipo === 'carta') return TEMAS_DA_ADMINISTRACAO.find((t) => t.tema === 'acervo')!.titulo;
  if (p.tipo === 'fotos-soltas' || p.tipo === 'duplicados' || p.tipo === 'exclusoes') return TEMAS_DA_ADMINISTRACAO.find((t) => t.tema === 'arrumar')!.titulo;
  return GRUPO_DO_ESPACO;
}

/** O resumo de um grupo fechado: as pendências dele, ou quantos atalhos ele tem. */
export function resumoDoGrupo(atalhos: number, pendencias: number): string {
  if (pendencias) return contaDePendencias(pendencias);
  return atalhos === 1 ? '1 atalho' : `${atalhos} atalhos`;
}

/** O id do grupo na página, para o balão e os links abrirem o grupo certo. */
export const idDoGrupo = (titulo: string): string =>
  `administracao-${titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}`;

/** A página da Administração (decisão do Gui, 18/11/2026: ela saiu de "Sua conta" e ganhou página própria). */
export const ENDERECO_DA_ADMINISTRACAO = '/admin';

/**
 * Para onde vai um endereço antigo da seção da administração em "Sua conta": "#administracao" e
 * "#administracao-cartao" levam à página nova, e o de um grupo ("#administracao-espaco-e-copias") leva ao
 * mesmo grupo nela. Qualquer outra âncora da conta ("#rascunhos") fica onde está.
 */
export function destinoDaAncoraAntiga(ancora: string): string | undefined {
  const id = decodeURIComponent(ancora.replace(/^#/, ''));
  if (id === 'administracao' || id === 'administracao-cartao') return ENDERECO_DA_ADMINISTRACAO;
  const grupos = [...TEMAS_DA_ADMINISTRACAO.map((t) => t.titulo), GRUPO_DO_ESPACO].map(idDoGrupo);
  return grupos.includes(id) ? `${ENDERECO_DA_ADMINISTRACAO}#${id}` : undefined;
}

export function gruposDaAdministracao(itens: ItemDeAdministracao[]): { titulo: string; itens: ItemDeAdministracao[] }[] {
  return TEMAS_DA_ADMINISTRACAO.map(({ tema, titulo }) => ({ titulo, itens: itens.filter((i) => i.tema === tema && !i.baixar) })).filter((g) => g.itens.length > 0);
}

/**
 * "Administração", só para os administradores: tipos de momento, famílias, a carta de Natal, a página
 * do sistema visual, "Baixar cópia do acervo", "Baixar cópia para o espelho" (fora da homologação) e, onde o
 * espelho existe (na homologação e no computador), o espelho da produção. Com a situação do acervo, cada item diz a dele, e a carta por
 * escrever ganha a marca de pendência. O banco e a cópia mensal ficam à parte, no pé do cartão. Para
 * quem não é administrador, nada.
 */
export function administracao(usuario: { admin: boolean }, onde: { podeEspelhar: boolean; copiaParaOEspelho?: boolean }, situacao?: SituacaoDaAdministracao): ItemDeAdministracao[] {
  if (!usuario.admin) return [];
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  return [
    { tema: 'acervo', rotulo: 'Tipos de momento', href: '/admin/tipos', situacao: situacao && plural(situacao.tipos, 'tipo', 'tipos') },
    { tema: 'acervo', rotulo: 'Famílias', href: '/admin/familias', situacao: situacao && plural(situacao.familias, 'família', 'famílias') },
    { tema: 'acervo', rotulo: 'Centros da árvore', href: '/admin/arvore', situacao: situacao && (situacao.centros ? plural(situacao.centros, 'pessoa escolhida', 'pessoas escolhidas') : 'o padrão') },
    {
      tema: 'acervo',
      rotulo: 'Carta de Natal',
      href: '/admin/carta',
      situacao: situacao && (situacao.carta ? `escrita em ${situacao.carta.escritaEm.slice(0, 4)}` : 'ainda não escrita'),
      pendencia: Boolean(situacao && !situacao.carta),
    },
    {
      tema: 'arrumar',
      rotulo: 'Fotos sem memória',
      href: '/admin/fotos-soltas',
      situacao: situacao && (situacao.fotosSoltas ? plural(situacao.fotosSoltas, 'foto', 'fotos') : 'nenhuma'),
      pendencia: Boolean(situacao?.fotosSoltas),
    },
    {
      tema: 'arrumar',
      rotulo: 'Cadastros duplicados',
      href: '/admin/duplicados',
      situacao: situacao && (situacao.duplicados ? plural(situacao.duplicados, 'possível', 'possíveis') : 'nenhum à vista'),
      pendencia: Boolean(situacao?.duplicados),
    },
    {
      tema: 'arrumar',
      rotulo: 'Pedidos para excluir',
      href: '/admin/exclusoes',
      situacao: situacao && (situacao.exclusoes ? plural(situacao.exclusoes, 'pedido', 'pedidos') : 'nenhum'),
      pendencia: Boolean(situacao?.exclusoes),
    },
    { tema: 'ferramentas', rotulo: 'Transcrição automática', href: '/admin/transcricao', situacao: situacao && (situacao.transcricao === 'ligada' ? 'ligada' : 'desligada') },
    { tema: 'ferramentas', rotulo: 'Cópias menores das fotos', href: '/admin/copias-das-fotos', situacao: situacao && 'para as fotos de antes' },
    { tema: 'ferramentas', rotulo: 'Sistema visual', href: '/sistema', situacao: situacao && 'tokens e peças' },
    { rotulo: 'Baixar cópia do acervo', href: '/api/copia', baixar: true, emPartes: true },
    ...(onde.copiaParaOEspelho ? [{ rotulo: 'Baixar cópia para o espelho', href: '/api/copia-para-o-espelho', baixar: true }] : []),
    ...(onde.podeEspelhar ? [{ tema: 'ferramentas', rotulo: 'Espelho da produção', href: '/admin/espelho', situacao: situacao && 'só na homologação' }] : []),
  ].map((item) => {
    const limpo: ItemDeAdministracao = { rotulo: item.rotulo, href: item.href };
    if ('tema' in item && item.tema) limpo.tema = item.tema as TemaDaAdministracao;
    if ('baixar' in item && item.baixar) limpo.baixar = true;
    if ('emPartes' in item && item.emPartes) limpo.emPartes = true;
    if (item.situacao) limpo.situacao = item.situacao;
    if ('pendencia' in item && item.pendencia) limpo.pendencia = true;
    return limpo;
  });
}

/**
 * O endereço de um rascunho de relato, em "Sua conta" e no atalho do Início. O relato escrito por outra
 * pessoa (quem não acessa o site) abre com ?por=, senão a janela abria o relato de quem está logado
 * (QA de 23/11/2026, docs/historico/qa/2026-11-23-relatorio.md).
 */
export function enderecoDoRascunhoDeRelato(relato: { memoriaId: string; por: string }, pessoa: string): string {
  const base = `/memorias/${encodeURIComponent(relato.memoriaId)}/relato`;
  return relato.por === pessoa ? base : `${base}?por=${encodeURIComponent(relato.por)}`;
}
