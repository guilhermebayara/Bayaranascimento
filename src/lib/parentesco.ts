// A árvore da família, calculada a partir de dois laços guardados no banco:
// filiação (de quem alguém é filho) e casal (com suas fases). Todo o resto,
// de avó a cunhado, sai daqui. Funções puras, sem banco, para serem testadas.

export type Qualidade = 'biologica' | 'adotiva' | 'consideracao';
export type TipoDeFase = 'namoro' | 'noivado' | 'casamento' | 'uniao' | 'separacao' | 'amizade';
export type Tratamento = 'ela' | 'ele' | null;

export interface Filiacao {
  filho: string;
  responsavel: string;
  qualidade: Qualidade;
}

export interface Fase {
  tipo: TipoDeFase;
  inicioAno: number | null;
  fimAno: number | null;
}

export interface Casal {
  id: number;
  a: string;
  b: string;
  /** na ordem em que aconteceram: a última é a fase atual */
  fases: Fase[];
  visibilidade: 'todos' | 'privado';
  criadoPor: string | null;
}

export const QUALIDADES: Record<Qualidade, string> = {
  biologica: 'Biológica',
  adotiva: 'Adotiva',
  consideracao: 'De consideração',
};

export const FASES: Record<TipoDeFase, string> = {
  namoro: 'Namoro',
  noivado: 'Noivado',
  casamento: 'Casamento',
  uniao: 'União',
  separacao: 'Separação',
  amizade: 'Amizade',
};

const FASES_JUNTOS: TipoDeFase[] = ['namoro', 'noivado', 'casamento', 'uniao'];

export function faseAtual(casal: Casal): Fase | undefined {
  return casal.fases[casal.fases.length - 1];
}

/** O casal está junto hoje? */
export function estaoJuntos(casal: Casal): boolean {
  const fase = faseAtual(casal);
  return Boolean(fase) && FASES_JUNTOS.includes(fase!.tipo);
}

/** A fase mais adiantada que o casal viveu, para dizer "ex-marido" e não "ex-namorado" de quem foi casado. */
function auge(casal: Casal): TipoDeFase {
  const ordem: TipoDeFase[] = ['casamento', 'uniao', 'noivado', 'namoro'];
  return ordem.find((t) => casal.fases.some((f) => f.tipo === t)) ?? 'namoro';
}

/** Quem pode ver um casal: todos, ou só as duas pessoas e quem cadastrou quando é privado. */
export function podeVerCasal(pessoa: string, casal: Casal): boolean {
  return casal.visibilidade === 'todos' || casal.a === pessoa || casal.b === pessoa || casal.criadoPor === pessoa;
}

export interface Camadas {
  /** laços de consideração */
  consideracao: boolean;
  /** casais que não estão mais juntos */
  ex: boolean;
}

type Passo = { tipo: 'U' | 'D'; consideracao: boolean } | { tipo: 'C' | 'X'; casal: Casal };

export interface Relacao {
  /** ex.: "mãe", "tio de consideração", "ex-marido" */
  texto: string;
  consideracao: boolean;
}

// [ela, ele, sem tratamento informado]
type Formas = [string, string, string];
const f = (ela: string, ele: string): Formas => [ela, ele, `${ele} ou ${ela}`];

const NOMES: Record<string, Formas> = {
  U: f('mãe', 'pai'),
  UU: f('avó', 'avô'),
  UUU: f('bisavó', 'bisavô'),
  UUUU: f('trisavó', 'trisavô'),
  D: f('filha', 'filho'),
  DD: f('neta', 'neto'),
  DDD: f('bisneta', 'bisneto'),
  UD: f('irmã', 'irmão'),
  UUD: f('tia', 'tio'),
  UUUD: f('tia-avó', 'tio-avô'),
  UDD: f('sobrinha', 'sobrinho'),
  UDDD: f('sobrinha-neta', 'sobrinho-neto'),
  UUDD: f('prima', 'primo'),
  UUUDD: f('prima', 'primo'),
  UUDDD: f('prima', 'primo'),
  UUUDDD: f('prima', 'primo'),
  // pelo casamento de alguém da família
  UC: f('madrasta', 'padrasto'),
  UUC: f('avó torta', 'avô torto'),
  DC: f('nora', 'genro'),
  UDC: f('cunhada', 'cunhado'),
  UUDC: f('tia', 'tio'),
  // pela família de quem está com a pessoa
  CU: f('sogra', 'sogro'),
  CD: f('enteada', 'enteado'),
  CUD: f('cunhada', 'cunhado'),
  CUDD: f('sobrinha', 'sobrinho'),
};

const PARES: Record<TipoDeFase, Formas> = {
  casamento: f('esposa', 'marido'),
  uniao: f('companheira', 'companheiro'),
  noivado: f('noiva', 'noivo'),
  namoro: f('namorada', 'namorado'),
  separacao: f('ex', 'ex'),
  amizade: f('amiga', 'amigo'),
};

function forma(formas: Formas, tratamento: Tratamento): string {
  return tratamento === 'ela' ? formas[0] : tratamento === 'ele' ? formas[1] : formas[2];
}

export class Familia {
  private paisDe = new Map<string, Filiacao[]>();
  private filhosDe = new Map<string, Filiacao[]>();
  private casaisDe = new Map<string, Casal[]>();

  constructor(
    filiacoes: Filiacao[],
    casais: Casal[],
    private tratamentos: Map<string, Tratamento> = new Map(),
    camadas: Camadas = { consideracao: true, ex: true },
  ) {
    for (const fi of filiacoes) {
      if (!camadas.consideracao && fi.qualidade === 'consideracao') continue;
      empilhar(this.paisDe, fi.filho, fi);
      empilhar(this.filhosDe, fi.responsavel, fi);
    }
    for (const c of casais) {
      if (c.fases.length === 0) continue;
      if (!camadas.ex && !estaoJuntos(c)) continue;
      empilhar(this.casaisDe, c.a, c);
      empilhar(this.casaisDe, c.b, c);
    }
  }

  pais(id: string): Filiacao[] {
    return this.paisDe.get(id) ?? [];
  }

  filhos(id: string): Filiacao[] {
    return this.filhosDe.get(id) ?? [];
  }

  /** Quem divide pelo menos um dos pais com a pessoa. */
  irmaos(id: string): { id: string; consideracao: boolean }[] {
    const achados = new Map<string, boolean>();
    for (const meu of this.pais(id)) {
      for (const dele of this.filhos(meu.responsavel)) {
        if (dele.filho === id) continue;
        const consideracao = meu.qualidade === 'consideracao' || dele.qualidade === 'consideracao';
        // Basta um caminho sem consideração para ser irmão de fato
        achados.set(dele.filho, (achados.get(dele.filho) ?? true) && consideracao);
      }
    }
    return [...achados].map(([irmao, consideracao]) => ({ id: irmao, consideracao }));
  }

  /** Casais da pessoa, atuais primeiro. */
  casais(id: string): { outro: string; casal: Casal; juntos: boolean }[] {
    return (this.casaisDe.get(id) ?? [])
      .map((casal) => ({ outro: casal.a === id ? casal.b : casal.a, casal, juntos: estaoJuntos(casal) }))
      .sort((x, y) => Number(y.juntos) - Number(x.juntos));
  }

  /** `ancestral` está acima de `pessoa` na árvore? Serve para impedir que alguém vire o próprio antepassado. */
  ehAntepassado(ancestral: string, pessoa: string): boolean {
    const vistos = new Set<string>();
    const fila = [pessoa];
    while (fila.length) {
      const atual = fila.pop()!;
      for (const p of this.pais(atual)) {
        if (p.responsavel === ancestral) return true;
        if (!vistos.has(p.responsavel)) {
          vistos.add(p.responsavel);
          fila.push(p.responsavel);
        }
      }
    }
    return false;
  }

  /**
   * O que `para` é de `de`. relacao('gui', 'elizete') devolve "mãe".
   * Procura o caminho mais curto na árvore: sobe pelos pais, desce pelos filhos
   * e pode passar por um casal no começo ou no fim do caminho.
   */
  relacao(de: string, para: string): Relacao | undefined {
    if (de === para) return undefined;
    interface Estado {
      no: string;
      // 0 início, 1 depois de um casal no começo, 2 subindo, 3 descendo
      etapa: 0 | 1 | 2 | 3;
      usouCasal: boolean;
      passos: Passo[];
    }
    const vistos = new Set<string>([`${de}|0|false`]);
    let fila: Estado[] = [{ no: de, etapa: 0, usouCasal: false, passos: [] }];
    const LIMITE = 6;

    for (let nivel = 0; nivel < LIMITE && fila.length; nivel++) {
      const proxima: Estado[] = [];
      const finais: Passo[][] = [];
      const visitar = (no: string, etapa: Estado['etapa'], usouCasal: boolean, passos: Passo[]) => {
        if (no === de) return;
        if (no === para) {
          finais.push(passos);
          return;
        }
        const chave = `${no}|${etapa}|${usouCasal}`;
        if (vistos.has(chave)) return;
        vistos.add(chave);
        proxima.push({ no, etapa, usouCasal, passos });
      };

      for (const e of fila) {
        // Subir: só enquanto ainda não começou a descer
        if (e.etapa !== 3) {
          for (const p of this.pais(e.no)) {
            visitar(p.responsavel, 2, e.usouCasal, [...e.passos, { tipo: 'U', consideracao: p.qualidade === 'consideracao' }]);
          }
        }
        // Descer
        for (const fi of this.filhos(e.no)) {
          visitar(fi.filho, 3, e.usouCasal, [...e.passos, { tipo: 'D', consideracao: fi.qualidade === 'consideracao' }]);
        }
        // Casal: no começo do caminho, ou fechando o caminho (uma vez só)
        if (!e.usouCasal) {
          for (const c of this.casais(e.no)) {
            if (c.outro !== para && e.etapa !== 0) continue; // no meio, o casal só serve para chegar ao destino
            if (c.juntos) {
              if (c.outro === para) finais.push([...e.passos, { tipo: 'C', casal: c.casal }]);
              else if (e.etapa === 0) visitar(c.outro, 1, true, [...e.passos, { tipo: 'C', casal: c.casal }]);
            } else if (e.etapa === 0 && c.outro === para) {
              finais.push([...e.passos, { tipo: 'X', casal: c.casal }]);
            }
          }
        }
      }

      if (finais.length) {
        // Entre caminhos do mesmo tamanho, vence o de sangue, depois o sem consideração
        const peso = (ps: Passo[]) =>
          ps.filter((p) => p.tipo === 'C' || p.tipo === 'X').length * 10 + ps.filter((p) => (p.tipo === 'U' || p.tipo === 'D') && p.consideracao).length;
        finais.sort((x, y) => peso(x) - peso(y));
        for (const passos of finais) {
          const relacao = this.nomear(passos, this.tratamentos.get(para) ?? null);
          if (relacao) return relacao;
        }
        return undefined;
      }
      fila = proxima;
    }
    return undefined;
  }

  private nomear(passos: Passo[], tratamento: Tratamento): Relacao | undefined {
    const consideracao = passos.some((p) => (p.tipo === 'U' || p.tipo === 'D') && p.consideracao);
    const sufixo = consideracao ? ' de consideração' : '';
    if (passos.length === 1 && (passos[0].tipo === 'C' || passos[0].tipo === 'X')) {
      const { casal } = passos[0];
      const atual = faseAtual(casal)!;
      if (passos[0].tipo === 'C') return { texto: forma(PARES[atual.tipo], tratamento), consideracao: false };
      // O ex que virou amigo aparece como amigo
      if (atual.tipo === 'amizade') return { texto: forma(PARES.amizade, tratamento), consideracao: false };
      return { texto: `ex-${forma(PARES[auge(casal)], tratamento)}`, consideracao: false };
    }
    const assinatura = passos.map((p) => p.tipo).join('');
    const formas = NOMES[assinatura];
    if (!formas) return undefined;
    return { texto: forma(formas, tratamento) + sufixo, consideracao };
  }
}

function empilhar<T>(mapa: Map<string, T[]>, chave: string, valor: T): void {
  const lista = mapa.get(chave);
  if (lista) lista.push(valor);
  else mapa.set(chave, [valor]);
}

/** "sua mãe", "seu tio de consideração". Quem não tem tratamento informado recebe "seu/sua". */
export function possessivo(relacao: Relacao, tratamento: Tratamento): string {
  const seu = tratamento === 'ela' ? 'sua' : tratamento === 'ele' ? 'seu' : 'seu ou sua';
  return `${seu} ${relacao.texto}`;
}

/** Período de uma fase em texto: "2015 a 2019", "desde 2020", ou vazio sem datas. */
export function periodoDaFase(fase: Fase): string {
  if (fase.inicioAno && fase.fimAno) return fase.inicioAno === fase.fimAno ? String(fase.inicioAno) : `${fase.inicioAno} a ${fase.fimAno}`;
  if (fase.inicioAno) return `desde ${fase.inicioAno}`;
  if (fase.fimAno) return `até ${fase.fimAno}`;
  return '';
}
