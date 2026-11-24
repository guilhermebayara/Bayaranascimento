// O relato como conversa (escolha do Gui depois da sessão I, 18/11/2026; respostas às perguntas da
// construção no mesmo dia). Cada envio vira uma mensagem: um texto, um áudio ou uma foto, numa ordem só,
// e a memória mostra cada pessoa como uma voz. Esta parte não tem tela nem banco, para ser testada.
//
// O que o Gui decidiu:
// - Primeiro publicar: o relato nasce rascunho e entra na memória com "Publicar relato". Depois de
//   publicado, cada mensagem nova entra na hora (voltar e contar mais).
// - Mudar uma mensagem de texto é editar, com a versão anterior do relato no histórico.
// - Na memória, a conversa, com quem contou primeiro antes; cada um conta o seu.
// - A data de uma mensagem só aparece quando muda o dia ("Contou mais em 3 de dezembro de 2026").
// - Responder citando: no relato próprio, citar uma mensagem de outra pessoa da mesma memória. A citação
//   fica no relato de quem cita, e ninguém mexe no relato do outro.
import { fontesDaFoto, type Copias } from './copias-das-fotos';

export type TipoDeMensagem = 'texto' | 'audio' | 'foto';

export interface Mensagem {
  /** o id no banco; vazio para a mensagem que ainda não foi gravada */
  id?: number;
  tipo: TipoDeMensagem;
  texto?: string;
  audioId?: number;
  fotoId?: number;
  /** a mensagem de outra pessoa que esta cita (só em mensagem de texto) */
  citaId?: number | null;
  /** quando foi enviada, "AAAA-MM-DD HH:MM:SS" em UTC, como o SQLite grava */
  enviadaEm?: string;
}

/** Um relato tem no máximo esse tanto de mensagens: folga para uma conversa longa, sem pesar a página. */
export const MENSAGENS_POR_RELATO = 200;

/** Os parágrafos de um texto, como o relato de hoje separa: uma linha em branco entre eles. */
export const paragrafos = (texto: string): string[] =>
  texto
    // O formulário sem script manda as linhas com "\r\n"
    .replace(/\r\n?/g, '\n')
    .split(/\n[^\S\n]*\n\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

/**
 * As mensagens de um relato gravado antes da conversa, sem ninguém mexer: os áudios, depois cada
 * parágrafo e, no fim, as fotos que vieram com ele. É a ordem de hoje na página (os áudios antes do
 * texto) e o que o leia-me do protótipo combinou para a passagem sem perda.
 */
export function mensagensDerivadas(texto: string, audios: readonly number[], fotos: readonly number[]): Mensagem[] {
  return [
    ...audios.map((audioId) => ({ tipo: 'audio' as const, audioId })),
    ...paragrafos(texto).map((t) => ({ tipo: 'texto' as const, texto: t })),
    ...fotos.map((fotoId) => ({ tipo: 'foto' as const, fotoId })),
  ];
}

/**
 * As mensagens que valem para um relato: as gravadas, sem as que apontam para um áudio ou uma foto que
 * saiu do relato, e com os áudios e as fotos dele que ainda não têm mensagem no fim (um áudio ligado por
 * outro caminho não some). Sem nada gravado, as derivadas do relato de antes da conversa.
 */
export function mensagensDoRelato(gravadas: readonly Mensagem[], texto: string, audios: readonly number[], fotos: readonly number[]): Mensagem[] {
  if (gravadas.length === 0) return mensagensDerivadas(texto, audios, fotos);
  const temAudio = new Set(audios);
  const temFoto = new Set(fotos);
  const validas = gravadas.filter((m) => (m.tipo === 'audio' ? temAudio.has(m.audioId!) : m.tipo === 'foto' ? temFoto.has(m.fotoId!) : Boolean(m.texto?.trim())));
  const comAudio = new Set(validas.filter((m) => m.tipo === 'audio').map((m) => m.audioId));
  const comFoto = new Set(validas.filter((m) => m.tipo === 'foto').map((m) => m.fotoId));
  return [
    ...validas,
    ...audios.filter((a) => !comAudio.has(a)).map((audioId) => ({ tipo: 'audio' as const, audioId })),
    ...fotos.filter((f) => !comFoto.has(f)).map((fotoId) => ({ tipo: 'foto' as const, fotoId })),
  ];
}

/**
 * O texto do relato, que o resto do site continua lendo (o trecho da abertura, as novidades, a imagem de
 * compartilhar, o histórico): as mensagens de texto, na ordem, com uma linha em branco entre elas.
 */
export const textoDasMensagens = (mensagens: readonly Mensagem[]): string =>
  mensagens
    .filter((m) => m.tipo === 'texto' && m.texto?.trim())
    .map((m) => m.texto!.trim())
    .join('\n\n');

const mesma = (a: Mensagem, b: Mensagem) =>
  a.tipo === b.tipo && (a.id !== undefined && b.id !== undefined ? a.id === b.id : true) && (a.texto ?? '').trim() === (b.texto ?? '').trim() && a.audioId === b.audioId && a.fotoId === b.fotoId && (a.citaId ?? null) === (b.citaId ?? null);

/**
 * Só acrescentou mensagens no fim, sem mudar, mover nem apagar nenhuma: é o "voltar e contar mais", que
 * não guarda versão no histórico. Editar, mover ou apagar guarda (o relato de antes vai para o histórico).
 */
export function soAcrescentou(antes: readonly Mensagem[], depois: readonly Mensagem[]): boolean {
  if (depois.length < antes.length) return false;
  return antes.every((m, i) => mesma(m, depois[i]));
}

/** O dia de um momento do SQLite (UTC), no fuso de São Paulo: "2026-12-03". */
export function diaDe(momento: string): string {
  const data = new Date(`${momento.replace(' ', 'T')}${/Z|[+-]\d\d:?\d\d$/.test(momento) ? '' : 'Z'}`);
  if (Number.isNaN(data.getTime())) return momento.slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(data);
}

/**
 * Onde entra a linha "Contou mais em 3 de dezembro de 2026": antes da primeira mensagem de cada dia
 * depois do primeiro. Quem contou tudo de uma vez não vê data nenhuma. Devolve o índice e o dia.
 */
export function quebrasDeDia(mensagens: readonly Pick<Mensagem, 'enviadaEm'>[]): Map<number, string> {
  const quebras = new Map<number, string>();
  let anterior: string | undefined;
  mensagens.forEach((m, i) => {
    if (!m.enviadaEm) return;
    const dia = diaDe(m.enviadaEm);
    if (anterior !== undefined && dia !== anterior) quebras.set(i, dia);
    anterior = dia;
  });
  return quebras;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
/** "Contou mais em 3 de dezembro de 2026" */
export function fraseDoDia(dia: string): string {
  const [ano, mes, d] = dia.split('-').map(Number);
  return `Contou mais em ${d} de ${MESES[mes - 1]} de ${ano}`;
}

/** O começo de um texto citado, numa linha: até umas vinte palavras, com reticências quando corta. */
export function trechoDaCitacao(texto: string, palavras = 20): string {
  const todas = texto.trim().split(/\s+/);
  return todas.length <= palavras ? todas.join(' ') : `${todas.slice(0, palavras).join(' ')}…`;
}

/** O que a citação mostra de uma mensagem que não é texto. */
export const resumoDaMensagem = (m: Pick<Mensagem, 'tipo' | 'texto'>): string => (m.tipo === 'texto' ? trechoDaCitacao(m.texto ?? '') : m.tipo === 'audio' ? 'Um áudio' : 'Uma foto');

/**
 * A mensagem como a tela recebe: com o endereço do áudio e da foto, a transcrição, a legenda e a citação
 * já resolvida (quem disse e o começo), só quando quem olha vê a mensagem citada.
 */
export interface MensagemNaTela {
  id?: number;
  tipo: TipoDeMensagem;
  texto?: string;
  audio?: { id: number; src: string; duracao: number | null; transcricao: string | null };
  /** src abre a foto inteira; mostrar é o que aparece na conversa (a cópia pequena, quando existe) */
  foto?: { id: number; src: string; mostrar?: string; legenda: string | null; galeria?: number };
  citaId?: number | null;
  citacao?: { quem: string; resumo: string } | null;
  /** a linha "Contou mais em ..." antes desta mensagem */
  contouMais?: string | null;
}

/**
 * Monta as mensagens para a tela. `citada` resolve uma mensagem citada para quem olha (quem disse e o
 * começo), ou nada quando ela não existe mais ou quem olha não a vê: aí a citação some.
 */
export function mensagensNaTela(
  mensagens: readonly Mensagem[],
  audios: ReadonlyMap<number, { chave: string; duracao: number | null; transcricao: string | null }>,
  fotos: ReadonlyMap<number, { chave: string; legenda: string | null; galeria?: number; copias?: Copias | null }>,
  citada: (id: number) => { quem: string; resumo: string } | undefined,
): MensagemNaTela[] {
  const quebras = quebrasDeDia(mensagens);
  return mensagens.flatMap((m, i): MensagemNaTela[] => {
    const base = { ...(m.id ? { id: m.id } : {}), tipo: m.tipo, contouMais: quebras.has(i) ? fraseDoDia(quebras.get(i)!) : null };
    if (m.tipo === 'audio') {
      const a = audios.get(m.audioId!);
      return a ? [{ ...base, audio: { id: m.audioId!, src: `/audios/${a.chave}`, duracao: a.duracao, transcricao: a.transcricao } }] : [];
    }
    if (m.tipo === 'foto') {
      const f = fotos.get(m.fotoId!);
      if (!f) return [];
      const mostrar = fontesDaFoto(f, 'pequena').src;
      const src = `/fotos/${f.chave}`;
      return [{ ...base, foto: { id: m.fotoId!, src, ...(mostrar !== src ? { mostrar } : {}), legenda: f.legenda, ...(f.galeria !== undefined ? { galeria: f.galeria } : {}) } }];
    }
    const citacao = m.citaId ? (citada(m.citaId) ?? null) : null;
    return [{ ...base, texto: m.texto ?? '', citaId: citacao ? m.citaId : null, citacao }];
  });
}
