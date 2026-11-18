// A frase da Nova memória (docs/decisoes.md, "Nova memória em frase", pedido do Gui de 17/11/2026):
// uma frase só, que cresce em todas as etapas. "[Título] foi em [data], em [lugar], com [pessoas].
// Tem [fotos] e [o seu relato]. Faz parte de [capítulo]. [Toda a família vê]."
//
// Cada parte pertence a uma etapa. Uma parte só entra na frase depois que a pessoa chega à etapa
// dela: a frase nunca pergunta, lá na primeira etapa, o que ainda não é a hora de responder. Na
// etapa em uso, a parte vazia diz o que está sendo perguntado; depois de passar por ela sem
// preencher, a parte some e a frase segue sem ela.
//
// Função pura, sem tela: quem desenha a frase (a página) só escreve o que sai daqui.
import { dataNaFrase } from './datas';
import { listaCurta } from './visual';

export const PARTES_DA_FRASE = ['titulo', 'data', 'lugar', 'pessoas', 'fotos', 'relato', 'capitulo', 'quemve'] as const;
export type ParteDaFrase = (typeof PARTES_DA_FRASE)[number];

export interface PreenchidoDaMemoria {
  titulo: string;
  ano?: number;
  mes?: number;
  dia?: number;
  aproximada?: boolean;
  lugar: string;
  pessoas: string[];
  /** quantas fotos */
  fotos: number;
  /** se há relato escrito ou gravado */
  relato: boolean;
  capitulos: string[];
  /** 'todos' ou os nomes das famílias que veem */
  soFamilias: string[] | null;
}

export interface TrechoDaFrase {
  parte: ParteDaFrase;
  /** o texto que vem antes da parte: a vírgula, o ponto, "foi", "Tem" */
  antes: string;
  texto: string;
  /** vazia: a parte da etapa em uso que ainda não foi preenchida, dita como pergunta */
  vazia: boolean;
  /** a parte é a da etapa em uso */
  atual: boolean;
}

export interface FraseDaMemoria {
  trechos: TrechoDaFrase[];
  /** o que fecha a frase: as reticências enquanto ela cresce, o ponto quando está completa */
  fim: string;
}

/**
 * `etapaDe` diz em que etapa cada parte se preenche (o relato não tem etapa na correção de uma
 * memória publicada: fica de fora). `atual` é a etapa em uso e `ate`, a mais adiantada a que a
 * pessoa já chegou.
 */
export function fraseDaMemoria(p: PreenchidoDaMemoria, etapaDe: Partial<Record<ParteDaFrase, number>>, atual: number, ate: number, ultima: number): FraseDaMemoria {
  const trechos: TrechoDaFrase[] = [];
  const chegou = (parte: ParteDaFrase) => etapaDe[parte] !== undefined && etapaDe[parte]! <= ate;
  const emUso = (parte: ParteDaFrase) => etapaDe[parte] === atual;
  // A parte entra se foi preenchida ou se é a da etapa em uso (aí, como pergunta)
  const por = (parte: ParteDaFrase, antes: string, texto: string | null, pergunta: string, antesDaPergunta = antes) => {
    if (!chegou(parte)) return false;
    if (texto) trechos.push({ parte, antes, texto, vazia: false, atual: emUso(parte) });
    else if (emUso(parte)) trechos.push({ parte, antes: antesDaPergunta, texto: pergunta, vazia: true, atual: true });
    return Boolean(texto);
  };

  por('titulo', '', p.titulo.trim() || null, 'Esta memória');
  if (!trechos.length) trechos.push({ parte: 'titulo', antes: '', texto: 'Esta memória', vazia: true, atual: false });
  const temData = por('data', ' foi ', p.ano ? dataNaFrase(p) : null, 'em que data?');
  por('lugar', temData || trechos.length > 1 ? ', ' : ' foi ', p.lugar.trim() ? `em ${p.lugar.trim()}` : null, 'em que lugar?');
  por('pessoas', trechos.length > 1 ? ', ' : ' foi ', p.pessoas.length ? `com ${listaCurta(p.pessoas, 3)}` : null, 'com quem?');

  const temFotos = por('fotos', '. Tem ', p.fotos > 0 ? (p.fotos === 1 ? '1 foto' : `${p.fotos} fotos`) : null, 'Ainda sem fotos', '. ');
  por('relato', temFotos ? ' e ' : '. Tem ', p.relato ? 'o seu relato' : null, 'Ainda sem relato', '. ');
  por('capitulo', '. Faz parte de ', p.capitulos.length ? listaCurta(p.capitulos, 2) : null, 'Sem capítulo', '. ');
  const quemVe = p.soFamilias === null ? 'Toda a família vê' : p.soFamilias.length ? `Só ${listaCurta(p.soFamilias, 3)} ${p.soFamilias.length > 1 ? 'veem' : 'vê'}` : 'Só as famílias marcadas veem';
  por('quemve', '. ', quemVe, quemVe);

  // Depois de uma parte vazia, que é uma pergunta, a frase segue sem vírgula
  trechos.forEach((t, i) => {
    if (i > 0 && trechos[i - 1].vazia && trechos[i - 1].texto.endsWith('?') && t.antes === ', ') t.antes = ' ';
  });
  const ultimo = trechos[trechos.length - 1];
  // Na primeira etapa a frase já mostra para onde vai: "Natal de 2025 foi…"
  const fim = ate >= ultima ? '.' : trechos.length === 1 ? ' foi…' : ultimo.vazia && ultimo.texto.endsWith('?') ? '' : '…';
  return { trechos, fim };
}

/** O que ficou sem preencher, para o "Confira antes de publicar" oferecer a ida direta à etapa. */
export function oQueFicouSem(p: PreenchidoDaMemoria, etapaDe: Partial<Record<ParteDaFrase, number>>): { parte: ParteDaFrase; texto: string }[] {
  const faltas: [ParteDaFrase, boolean, string][] = [
    ['lugar', !p.lugar.trim(), 'lugar'],
    ['pessoas', p.pessoas.length === 0, 'quem estava'],
    ['fotos', p.fotos === 0, 'fotos'],
    ['relato', !p.relato, 'relato'],
    ['capitulo', p.capitulos.length === 0, 'capítulo'],
  ];
  return faltas.filter(([parte, falta]) => falta && etapaDe[parte] !== undefined).map(([parte, , texto]) => ({ parte, texto }));
}
