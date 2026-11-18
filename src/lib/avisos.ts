// Avisos dentro do site (docs/decisoes.md, "Avisos"; decisões do Gui de 17/11/2026). Sem e-mail e sem
// notificação no celular: ficam no alto do Início, num número discreto no retrato do topo e, com o
// histórico, em "Sua conta". As regras ficam aqui, sem tela e sem banco; as consultas, em
// src/lib/servidor/repositorio.ts ("Avisos").
//
// - Tipos: o pedido para liberar um relato (quando quem criou a memória amplia quem vê), relato novo
//   numa memória que a pessoa criou ou em que aparece, e a pessoa marcada em "Quem estava". A sugestão
//   de correção entra na onda 2.
// - Cada pessoa só recebe avisos a partir do primeiro acesso dela: o que já existia chega como acervo.
//   O pedido para liberar vale sempre.
// - Ninguém recebe aviso do que ela mesma fez.
// - Quem não vê o item não recebe aviso dele, nem depois: a lista confere a visibilidade ao ler.
// - Um aviso sai da lista ao abrir o que ele aponta. O pedido para liberar só sai quando a pessoa responde.
//   Sem lembrete: o pedido fica no alto até ser respondido.

export const TIPOS_DE_AVISO = ['liberar-relato', 'relato-novo', 'quem-estava'] as const;
export type TipoDeAviso = (typeof TIPOS_DE_AVISO)[number];

/** O pedido para liberar só sai com a resposta; os outros saem ao abrir a memória. */
export const saiAoAbrir = (tipo: TipoDeAviso): boolean => tipo !== 'liberar-relato';

/** O pedido para liberar chega mesmo a quem ainda não entrou no site: é uma decisão que só a pessoa toma. */
export const valeAntesDoPrimeiroAcesso = (tipo: TipoDeAviso): boolean => tipo === 'liberar-relato';

export interface Destinatarios {
  /** quem tem login no site (pessoasComAcesso) */
  comAcesso: ReadonlySet<string>;
  /** quem já entrou no site alguma vez */
  jaEntraram: ReadonlySet<string>;
  /** quem fez a ação: não recebe aviso dela */
  autor: string;
}

const pode = (tipo: TipoDeAviso, pessoa: string, d: Destinatarios) =>
  pessoa !== d.autor && d.comAcesso.has(pessoa) && (valeAntesDoPrimeiroAcesso(tipo) || d.jaEntraram.has(pessoa));

/**
 * Relato novo: quem criou a memória e quem está em "Quem estava", menos quem contou e quem registrou.
 * Quem chama ainda confere que cada um vê a memória.
 */
export function quemRecebeRelatoNovo(memoria: { criadaPor: string; integrantes: string[] }, relato: { por: string; registradoPor: string }, d: Destinatarios): string[] {
  const candidatos = new Set([memoria.criadaPor, ...memoria.integrantes]);
  candidatos.delete(relato.por);
  candidatos.delete(relato.registradoPor);
  return [...candidatos].filter((p) => pode('relato-novo', p, d));
}

/**
 * Marcado em "Quem estava": quem entrou na lista agora, numa memória publicada. Numa memória que acabou de
 * sair do rascunho, todos os marcados são novos. Quem chama confere que cada um vê a memória.
 */
export function quemRecebeQuemEstava(antes: readonly string[], depois: readonly string[], d: Destinatarios): string[] {
  const ja = new Set(antes);
  return [...new Set(depois)].filter((p) => !ja.has(p) && pode('quem-estava', p, d));
}

export interface AvisoParaTexto {
  tipo: TipoDeAviso;
  /** quem fez a ação: quem contou, quem marcou, quem ampliou */
  de: string;
  titulo: string;
  /** no relato novo e no pedido para liberar: de quem é o relato e quem registrou */
  relato?: { por: string; registradoPor: string } | null;
  /** no pedido para liberar: para quem a memória passou a ser visível ("toda a família", "a família Bracarense") */
  paraQuem?: string | null;
  /** quem recebe o aviso */
  para: string;
}

/** A frase do aviso, do ponto de vista de quem recebe. `nome` dá o nome curto de cada pessoa. */
export function fraseDoAviso(a: AvisoParaTexto, nome: (id: string) => string): string {
  const titulo = `“${a.titulo}”`;
  if (a.tipo === 'quem-estava') return `${nome(a.de)} marcou você em ${titulo}.`;
  if (a.tipo === 'relato-novo') {
    const r = a.relato;
    if (r && r.registradoPor !== r.por) return `${nome(r.registradoPor)} registrou o relato de ${nome(r.por)} em ${titulo}.`;
    return `${nome(a.de)} contou sobre ${titulo}.`;
  }
  // Pedido para liberar: a memória, quem ampliou e para quem (documento de estrutura)
  const dequem = a.relato && a.relato.por !== a.para ? `o relato de ${nome(a.relato.por)}, que você registrou,` : 'o seu relato';
  const para = a.paraQuem ? ` para ${a.paraQuem}` : '';
  return `${nome(a.de)} abriu ${titulo}${para}. Por enquanto, ${dequem} continua só para quem via antes.`;
}

/** O número do retrato: discreto, e "9+" a partir de dez, para não crescer no topo. */
export const numeroDoRetrato = (pendentes: number): string | null => (pendentes <= 0 ? null : pendentes > 9 ? '9+' : String(pendentes));

/**
 * O número do retrato soma os avisos e, para quem administra, as pendências da administração
 * (escolha do Gui no conceito da sessão E, 17/11/2026; src/lib/conta.ts, pendenciasDaAdministracao).
 */
export const somaDoRetrato = (avisos: number, pendencias = 0): number => Math.max(0, avisos) + Math.max(0, pendencias);

/** O nome acessível do retrato, com os avisos e as pendências: "Sua conta, Gui, 2 avisos, 1 pendência da administração". */
export function rotuloDoRetrato(nome: string, pendentes: number, pendenciasDaAdministracao = 0): string {
  const partes = [`Sua conta, ${nome}`];
  if (pendentes > 0) partes.push(pendentes === 1 ? '1 aviso' : `${pendentes} avisos`);
  if (pendenciasDaAdministracao > 0) partes.push(pendenciasDaAdministracao === 1 ? '1 pendência da administração' : `${pendenciasDaAdministracao} pendências da administração`);
  return partes.join(', ');
}

/**
 * O que quem ampliou a memória vê, ao salvar e na própria memória (decisão do Gui, 17/11/2026): "Os relatos
 * da Elizete e do Lucas aparecem para quem passou a ver quando eles concordarem."
 */
export function fraseDosRelatosQueEsperam(pessoas: { nome: string; tratamento: 'ela' | 'ele' | null }[]): string {
  if (pessoas.length === 0) return '';
  const de = (p: { nome: string; tratamento: 'ela' | 'ele' | null }) => `${p.tratamento === 'ela' ? 'da' : p.tratamento === 'ele' ? 'do' : 'de'} ${p.nome}`;
  if (pessoas.length === 1) {
    const [p] = pessoas;
    const quem = p!.tratamento === 'ela' ? 'ela' : p!.tratamento === 'ele' ? 'ele' : 'a pessoa';
    return `O relato ${de(p!)} aparece para quem passou a ver quando ${quem} concordar.`;
  }
  const nomes = pessoas.map(de);
  const lista = `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`;
  const quem = pessoas.every((p) => p.tratamento === 'ela') ? 'elas' : 'eles';
  return `Os relatos ${lista} aparecem para quem passou a ver quando ${quem} concordarem.`;
}
