// Sugestão de correção (onda 2, decisão do Gui de 17/11/2026): de dados da memória (data, lugar, quem
// estava), para quem criou, ou um recado livre a quem registrou um relato ("acho que foi em 1998"). Quem
// recebe aceita, recusa ou responde, e quem sugeriu recebe o aviso da resposta. Regras puras, testadas em
// testes/sugestoes.test.ts.
import { formatarData } from './datas';

export type TipoDeSugestao = 'dados' | 'recado';
export type SituacaoDaSugestao = 'aberta' | 'aceita' | 'recusada' | 'respondida';

/** O que uma sugestão de dados propõe. Só entra o que mudou. */
export interface Proposta {
  ano?: number;
  mes?: number | null;
  dia?: number | null;
  lugar?: string;
  /** quem estava e não está marcado */
  entram?: string[];
  /** quem está marcado e não estava */
  saem?: string[];
}

export interface Sugestao {
  id: number;
  memoriaId: string;
  relatoId: number | null;
  de: string;
  para: string;
  tipo: TipoDeSugestao;
  proposta: Proposta | null;
  texto: string | null;
  situacao: SituacaoDaSugestao;
  resposta: string | null;
  criadaEm: string;
  respondidaEm: string | null;
  /** quem respondeu (migração 080); nas antigas, quem recebeu */
  respondidaPor: string | null;
}

/**
 * Quem recebe a sugestão (resposta do Gui à sessão F, 18/11/2026). A de dados vai para todos que podem
 * corrigir a ficha: quem criou a memória e quem está nela, hoje, menos quem sugeriu. O recado vai só
 * para quem registrou o relato. O primeiro que responder resolve, e o aviso sai da lista dos outros.
 */
export function destinatarios(
  s: Pick<Sugestao, 'tipo' | 'para' | 'de'>,
  memoria: { criadaPor: string; integrantes: readonly string[] },
  comAcesso?: ReadonlySet<string>,
): string[] {
  if (s.tipo === 'recado') return [s.para];
  // Só quem entra no site corrige a ficha: quem está na memória sem acesso (a Vó Bela, o Chico) não
  // recebe a sugestão nem o aviso (QA de 23/11/2026, docs/historico/qa/2026-11-23-relatorio.md). Quem criou sempre entra.
  return [...new Set([memoria.criadaPor, ...memoria.integrantes])].filter((p) => p !== s.de && (!comAcesso || p === memoria.criadaPor || comAcesso.has(p)));
}

interface DadosAtuais {
  ano: number;
  mes: number | null;
  dia: number | null;
  lugar: string | null;
  integrantes: readonly string[];
}

/**
 * A proposta limpa: só o que é diferente do que a memória diz hoje, e só pessoas que quem sugere pode
 * citar (`pode`): quem ela vê e que não existe só para ela. Vazia, não há sugestão de dados.
 */
export function limparProposta(pedida: Proposta, atual: DadosAtuais, pode: (id: string) => boolean): Proposta {
  const p: Proposta = {};
  if (pedida.ano && Number.isInteger(pedida.ano)) {
    const mes = pedida.mes ?? null;
    const dia = mes ? (pedida.dia ?? null) : null;
    if (pedida.ano !== atual.ano || mes !== atual.mes || dia !== atual.dia) Object.assign(p, { ano: pedida.ano, mes, dia });
  }
  const lugar = pedida.lugar?.trim();
  if (lugar && lugar !== (atual.lugar ?? '')) p.lugar = lugar.slice(0, 120);
  const entram = [...new Set(pedida.entram ?? [])].filter((id) => pode(id) && !atual.integrantes.includes(id));
  const saem = [...new Set(pedida.saem ?? [])].filter((id) => atual.integrantes.includes(id));
  if (entram.length) p.entram = entram;
  if (saem.length) p.saem = saem;
  return p;
}

export const propostaVazia = (p: Proposta | null | undefined): boolean => !p || Object.keys(p).length === 0;

/**
 * A proposta em frases, para quem recebe: "Data: 1998 (hoje: 1999)". `nome` dá o nome de cada pessoa.
 * Respondida, a sugestão mostra só o que foi pedido, sem "(hoje: …)": depois de aceita, o "hoje" já é o
 * que foi sugerido (resposta do Gui à P6 do QA de 23/11/2026, docs/historico/qa/2026-11-23-perguntas.md).
 */
export function frasesDaProposta(p: Proposta, atual: DadosAtuais, nome: (id: string) => string, respondida = false): string[] {
  const frases: string[] = [];
  const data = (ano: number, mes: number | null, dia: number | null) => formatarData({ ano, mes, dia, aproximada: false });
  const hoje = (texto: string) => (respondida ? '' : ` (hoje: ${texto})`);
  if (p.ano) frases.push(`Data: ${data(p.ano, p.mes ?? null, p.dia ?? null)}${hoje(data(atual.ano, atual.mes, atual.dia))}`);
  if (p.lugar) frases.push(`Lugar: ${p.lugar}${atual.lugar ? hoje(atual.lugar) : ''}`);
  if (p.entram?.length) frases.push(`Também estava: ${p.entram.map(nome).join(', ')}`);
  if (p.saem?.length) frases.push(`Não estava: ${p.saem.map(nome).join(', ')}`);
  return frases;
}

/** A memória com a proposta aplicada: o que vai para o formulário de salvar, ao aceitar. */
export function aplicarProposta(p: Proposta, atual: DadosAtuais): DadosAtuais {
  return {
    ano: p.ano ?? atual.ano,
    mes: p.ano ? (p.mes ?? null) : atual.mes,
    dia: p.ano ? (p.dia ?? null) : atual.dia,
    lugar: p.lugar ?? atual.lugar,
    integrantes: [...atual.integrantes.filter((id) => !(p.saem ?? []).includes(id)), ...(p.entram ?? [])],
  };
}
