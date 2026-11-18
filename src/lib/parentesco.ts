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
  /** Só nos laços adotivos, e só se alguém informou */
  adocao?: DataDaAdocao | null;
}

export interface DataDaAdocao {
  ano: number;
  mes: number | null;
  dia: number | null;
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
  /**
   * Quem vê: todos; só os dois (e quem cadastrou); ou, num casal desfeito, os dois, quem cadastrou e os
   * membros das famílias escolhidas (`nucleos`), como numa memória (decisão do Gui, 18/11/2026).
   */
  visibilidade: 'todos' | 'privado' | 'nucleos';
  /** as famílias que veem o casal, com visibilidade 'nucleos' */
  nucleos?: string[];
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

export const FASES_JUNTOS: TipoDeFase[] = ['namoro', 'noivado', 'casamento', 'uniao'];

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

/**
 * Quem pode ver um casal: todos; as duas pessoas e quem cadastrou, sempre; e, com famílias escolhidas,
 * quem é membro de uma delas (parente não conta, como na memória). `nucleosDeQuemOlha` são os núcleos de
 * que a pessoa é membro.
 */
export function podeVerCasal(pessoa: string, casal: Casal, nucleosDeQuemOlha: readonly string[] = []): boolean {
  if (casal.visibilidade === 'todos' || casal.a === pessoa || casal.b === pessoa || casal.criadoPor === pessoa) return true;
  return casal.visibilidade === 'nucleos' && (casal.nucleos ?? []).some((n) => nucleosDeQuemOlha.includes(n));
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
  /** as duas formas, quando a pessoa não tem "como se referir" informado */
  formas?: { ela: string; ele: string };
  /**
   * O caminho na árvore, passo a passo: U sobe a um dos pais, D desce a um filho, C passa por um
   * casal e X por um ex-casal. "U" é mãe ou pai, "UD" é irmã ou irmão, "UUD" é tia ou tio.
   * Serve ao círculo, que tira daí a faixa de quem não tem proximidade declarada.
   */
  caminho: string;
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
    let formas: Formas | undefined;
    let prefixo = '';
    let sufixo = consideracao ? ' de consideração' : '';
    if (passos.length === 1 && (passos[0].tipo === 'C' || passos[0].tipo === 'X')) {
      const { casal } = passos[0];
      const atual = faseAtual(casal)!;
      sufixo = '';
      if (passos[0].tipo === 'C') formas = PARES[atual.tipo];
      // O ex que virou amigo aparece como amigo
      else if (atual.tipo === 'amizade') formas = PARES.amizade;
      else {
        formas = PARES[auge(casal)];
        prefixo = 'ex-';
      }
    } else {
      formas = NOMES[passos.map((p) => p.tipo).join('')];
    }
    if (!formas) return undefined;
    const montar = (base: string) => prefixo + base + sufixo;
    const ehConsideracao = consideracao && sufixo !== '';
    const caminho = passos.map((p) => p.tipo).join('');
    if (tratamento) return { texto: montar(forma(formas, tratamento)), consideracao: ehConsideracao, caminho };
    const [ela, ele] = formas;
    return { texto: `${montar(ele)} ou ${montar(ela)}`, consideracao: ehConsideracao, formas: { ela: montar(ela), ele: montar(ele) }, caminho };
  }
}

function empilhar<T>(mapa: Map<string, T[]>, chave: string, valor: T): void {
  const lista = mapa.get(chave);
  if (lista) lista.push(valor);
  else mapa.set(chave, [valor]);
}

/** "sua mãe", "seu tio de consideração". Sem tratamento informado, as duas formas: "seu tio ou sua tia". */
export function possessivo(relacao: Relacao, tratamento: Tratamento): string {
  if (!tratamento && relacao.formas) return `seu ${relacao.formas.ele} ou sua ${relacao.formas.ela}`;
  return `${tratamento === 'ela' ? 'sua' : 'seu'} ${relacao.texto}`;
}

/** Período de uma fase em texto: "2015 a 2019", "desde 2020", ou vazio sem datas. */
export function periodoDaFase(fase: Fase): string {
  if (fase.inicioAno && fase.fimAno) return fase.inicioAno === fase.fimAno ? String(fase.inicioAno) : `${fase.inicioAno} a ${fase.fimAno}`;
  if (fase.inicioAno) return `desde ${fase.inicioAno}`;
  if (fase.fimAno) return `até ${fase.fimAno}`;
  return '';
}

/**
 * O período de cada fase de um casal, lido na sequência: uma fase sem fim informado acaba quando a
 * seguinte começa (o namoro acaba quando o noivado começa). Só a última, a de hoje, fica "desde".
 * A separação é um momento: "em 2019". Nada disso é gravado; o banco guarda o que foi informado.
 */
export function periodosDasFases(fases: Fase[]): string[] {
  return fases.map((fase, i) => {
    const ultima = i === fases.length - 1;
    const fim = fase.fimAno ?? (ultima ? null : (fases.slice(i + 1).find((f) => f.inicioAno)?.inicioAno ?? null));
    if (fase.tipo === 'separacao' && !fase.fimAno) return fase.inicioAno ? `em ${fase.inicioAno}` : '';
    if (fase.inicioAno && fim) return fase.inicioAno === fim ? String(fase.inicioAno) : `${fase.inicioAno} a ${fim}`;
    if (fase.inicioAno) return ultima ? `desde ${fase.inicioAno}` : `a partir de ${fase.inicioAno}`;
    if (fim) return `até ${fim}`;
    return '';
  });
}

// --- Laços do coração ---

export type Papel = 'avo' | 'pai' | 'tio' | 'irmao' | 'primo' | 'filho' | 'sobrinho';

export interface LacoDoCoracao {
  id: number;
  /** quem escolheu o laço: ele vale para essa pessoa */
  dono: string;
  pessoa: string;
  /** nome livre: "amigo-irmão", "afilhada", "vó de coração" */
  nome: string;
  /** "como se fosse": dá um lugar na árvore do dono */
  papel: Papel | null;
  /** só chega preenchida para o dono */
  proximidade: number | null;
  privado: boolean;
}

export const PAPEIS: Record<Papel, string> = {
  irmao: 'irmão ou irmã',
  tio: 'tio ou tia',
  pai: 'pai ou mãe',
  avo: 'avô ou avó',
  primo: 'primo ou prima',
  sobrinho: 'sobrinho ou sobrinha',
  filho: 'filho ou filha',
};

/** O papel no masculino ou no feminino: "sobrinho" ou "sobrinha". Sem tratamento, os dois ("sobrinho ou sobrinha"). */
export function nomeDoPapel(papel: Papel, tratamento: Tratamento): string {
  const [dele, dela] = PAPEIS[papel].split(' ou ');
  return tratamento === 'ela' ? dela : tratamento === 'ele' ? dele : PAPEIS[papel];
}

export const PROXIMIDADES: Record<number, string> = { 1: 'Muito próximo', 2: 'Próximo', 3: 'Conhecido' };

/** Em que linha da árvore centrada o papel coloca a pessoa. */
export const LINHA_DO_PAPEL: Record<Papel, 'avos' | 'pais' | 'centro' | 'filhos'> = {
  avo: 'avos',
  pai: 'pais',
  tio: 'pais',
  irmao: 'centro',
  primo: 'centro',
  filho: 'filhos',
  sobrinho: 'filhos',
};

/** Laço privado: só o dono vê. */
export function podeVerLacoDoCoracao(pessoa: string, laco: Pick<LacoDoCoracao, 'dono' | 'privado'>): boolean {
  return !laco.privado || laco.dono === pessoa;
}

const FEMININOS = new Set(['vó', 'avó', 'mãe', 'irmã', 'mamãe']);

/**
 * "seu amigo-irmão", "sua afilhada": o laço do coração dito para o dono dele.
 * Usa o tratamento da pessoa quando existe. Sem ele, olha a primeira palavra
 * do nome que o dono deu ao laço ("amiga", "vó de coração").
 */
export function lacoParaODono(nomeDoLaco: string, tratamento: Tratamento): string {
  const nome = nomeDoLaco.trim();
  const primeira = nome.split(/[\s-]/)[0].toLowerCase();
  const feminino = tratamento ? tratamento === 'ela' : FEMININOS.has(primeira) || /[aã]$/.test(primeira);
  // No meio da frase, o nome do laço começa em minúscula mesmo que tenha sido digitado "Amiga"
  return `${feminino ? 'sua' : 'seu'} ${nome.charAt(0).toLowerCase()}${nome.slice(1)}`;
}

// --- Visão geral: a família inteira em gerações ---

/**
 * Em que geração cada pessoa fica, contando de cima para baixo a partir de 0.
 * Filho fica uma geração abaixo do pai mais novo, e casais ficam na mesma linha,
 * o que alinha as duas famílias de um casamento. Quem não tem laço nenhum fica de fora.
 */
export function calcularGeracoes(
  pessoas: string[],
  filiacoes: Pick<Filiacao, 'filho' | 'responsavel'>[],
  casais: Pick<Casal, 'a' | 'b'>[],
): Map<string, number> {
  const dentro = new Set(pessoas);
  const pais = filiacoes.filter((f) => dentro.has(f.filho) && dentro.has(f.responsavel));
  const pares = casais.filter((c) => dentro.has(c.a) && dentro.has(c.b));
  const geracao = new Map<string, number>();
  for (const f of pais) {
    geracao.set(f.filho, 0);
    geracao.set(f.responsavel, 0);
  }
  for (const c of pares) {
    geracao.set(c.a, 0);
    geracao.set(c.b, 0);
  }
  // Repete até assentar. O limite protege contra dados em círculo.
  for (let volta = 0; volta < pessoas.length + 2; volta++) {
    let mudou = false;
    const subir = (id: string, valor: number) => {
      if ((geracao.get(id) ?? 0) < valor) {
        geracao.set(id, valor);
        mudou = true;
      }
    };
    for (const f of pais) subir(f.filho, (geracao.get(f.responsavel) ?? 0) + 1);
    for (const c of pares) {
      const maior = Math.max(geracao.get(c.a) ?? 0, geracao.get(c.b) ?? 0);
      subir(c.a, maior);
      subir(c.b, maior);
    }
    // Um pai sem pais cadastrados sobe para ficar logo acima dos filhos, e não solto no topo
    for (const f of pais) {
      const temPais = pais.some((x) => x.filho === f.responsavel);
      const temPar = pares.some((c) => c.a === f.responsavel || c.b === f.responsavel);
      if (!temPais && !temPar) {
        const maisVelhoDosFilhos = Math.min(...pais.filter((x) => x.responsavel === f.responsavel).map((x) => geracao.get(x.filho) ?? 0));
        subir(f.responsavel, maisVelhoDosFilhos - 1);
      }
    }
    if (!mudou) break;
  }
  return geracao;
}

/** Quantas gerações o papel desloca a pessoa em relação a quem a escolheu. */
export const DESLOCAMENTO_DO_PAPEL: Record<Papel, number> = { avo: -2, pai: -1, tio: -1, irmao: 0, primo: 0, filho: 1, sobrinho: 1 };

/** Nome de uma geração vista por alguém: 0 é a da própria pessoa, negativo é acima. */
export function nomeDaGeracao(diferenca: number): string {
  const nomes: Record<string, string> = {
    '-3': 'Bisavós',
    '-2': 'Avós',
    '-1': 'Pais, tios e sogros',
    '0': 'Sua geração',
    '1': 'Filhos e sobrinhos',
    '2': 'Netos',
    '3': 'Bisnetos',
  };
  return nomes[String(diferenca)] ?? (diferenca < 0 ? `${-diferenca} gerações acima` : `${diferenca} gerações abaixo`);
}

/**
 * Famílias sem ligação de sangue ou casamento com a de quem olha (a de uma amiga,
 * por exemplo) são calculadas à parte e ficariam soltas no topo. Aqui elas são
 * encaixadas pelos laços do coração: se o Otto é "como se fosse sobrinho" do Gui,
 * a família inteira do Otto desce até ele ficar uma geração abaixo do Gui.
 */
export function alinharPeloCoracao(
  geracoes: Map<string, number>,
  filiacoes: Pick<Filiacao, 'filho' | 'responsavel'>[],
  casais: Pick<Casal, 'a' | 'b'>[],
  lacos: Pick<LacoDoCoracao, 'dono' | 'pessoa' | 'papel'>[],
  ancora: string | undefined,
): Map<string, number> {
  // Grupos de pessoas ligadas entre si por filiação ou casal
  const grupoDe = new Map<string, string>();
  const raiz = (id: string): string => {
    let atual = id;
    while (grupoDe.get(atual) !== atual) atual = grupoDe.get(atual)!;
    return atual;
  };
  for (const id of geracoes.keys()) grupoDe.set(id, id);
  const unir = (a: string, b: string) => {
    if (grupoDe.has(a) && grupoDe.has(b)) grupoDe.set(raiz(a), raiz(b));
  };
  for (const f of filiacoes) unir(f.filho, f.responsavel);
  for (const c of casais) unir(c.a, c.b);

  // O grupo de quem olha fica parado. Sem essa pessoa na árvore, vale o maior grupo.
  const tamanhos = new Map<string, number>();
  for (const id of geracoes.keys()) tamanhos.set(raiz(id), (tamanhos.get(raiz(id)) ?? 0) + 1);
  const principal = ancora && geracoes.has(ancora) ? raiz(ancora) : [...tamanhos].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!principal) return geracoes;

  const resultado = new Map(geracoes);
  const firmes = new Set([principal]);
  // Laços com papel dizem a geração exata; sem papel, a pessoa é tratada como da mesma geração
  const ordenados = [...lacos].sort((a, b) => Number(Boolean(b.papel)) - Number(Boolean(a.papel)));
  for (let volta = 0; volta < tamanhos.size; volta++) {
    let mudou = false;
    for (const laco of ordenados) {
      if (!resultado.has(laco.dono) || !resultado.has(laco.pessoa)) continue;
      const [fixo, solto, sinal] =
        firmes.has(raiz(laco.dono)) && !firmes.has(raiz(laco.pessoa))
          ? [laco.dono, laco.pessoa, 1]
          : firmes.has(raiz(laco.pessoa)) && !firmes.has(raiz(laco.dono))
            ? [laco.pessoa, laco.dono, -1]
            : [undefined, undefined, 0];
      if (!fixo || !solto) continue;
      const desloca = laco.papel ? DESLOCAMENTO_DO_PAPEL[laco.papel] : 0;
      const ajuste = resultado.get(fixo)! + sinal * desloca - resultado.get(solto)!;
      const grupo = raiz(solto);
      for (const id of resultado.keys()) if (raiz(id) === grupo) resultado.set(id, resultado.get(id)! + ajuste);
      firmes.add(grupo);
      mudou = true;
    }
    if (!mudou) break;
  }
  return resultado;
}
