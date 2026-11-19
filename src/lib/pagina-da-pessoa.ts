// As regras da página da pessoa (proposta A do conceito da sessão L, "o verbete", escolhida pelo Gui
// em 18/11/2026): a frase de abertura, a vida em memórias agrupada pela idade e as formas de ver.
// Sem tela e sem banco, para os testes (testes/pagina-da-pessoa.test.ts).

import { MESES } from './datas';

/** As formas de ver as memórias da pessoa: pela idade (o padrão), a linha do tempo e o mural. */
export const FORMAS_DA_VIDA = ['idade', 'linha', 'mural'] as const;
export type FormaDaVida = (typeof FORMAS_DA_VIDA)[number];
export const FORMA_DA_VIDA_PADRAO: FormaDaVida = 'idade';

export function lerFormaDaVida(p: URLSearchParams): FormaDaVida {
  const ver = p.get('ver');
  return FORMAS_DA_VIDA.find((f) => f === ver) ?? FORMA_DA_VIDA_PADRAO;
}

/** O endereço da página da pessoa em cada forma de ver. A forma padrão não vai no endereço. */
export function enderecoDaVida(id: string, forma: FormaDaVida = FORMA_DA_VIDA_PADRAO, mais: Record<string, string | undefined> = {}): string {
  const p = new URLSearchParams();
  if (forma !== FORMA_DA_VIDA_PADRAO) p.set('ver', forma);
  for (const [nome, valor] of Object.entries(mais)) if (valor) p.set(nome, valor);
  return `/pessoas/${id}${p.size > 0 ? `?${p}` : ''}`;
}

/** O nome de cada forma. Sem o ano de nascimento, a primeira agrupa por década. */
export function nomeDaFormaDaVida(forma: FormaDaVida, comIdade: boolean): string {
  return forma === 'idade' ? (comIdade ? 'Pela idade' : 'Por década') : forma === 'linha' ? 'Linha do tempo' : 'Mural de fotos';
}

/** O rascunho de quem escreveu aparece pela idade e na linha do tempo; o mural é só do que foi publicado. */
export const mostraRascunhoNaVida = (forma: FormaDaVida) => forma !== 'mural';

/**
 * Uma data de "Dados", em duas partes: a grande e a pequena. O aniversário vem em destaque (pedido do
 * Gui, 18/11/2026): com o dia e o mês, "24 de julho" é o grande e o ano fica pequeno. Sem o dia, o ano
 * continua sendo o grande, com o mês, quando há, pequeno ao lado. Vale igual para o falecimento, que
 * fica ao lado e segue a mesma forma.
 */
export function partesDaData(d: { ano: number; mes?: number | null; dia?: number | null }): { grande: string; pequena: string | null } {
  const mes = d.mes && d.mes >= 1 && d.mes <= 12 ? MESES[d.mes - 1] : null;
  if (mes && d.dia) return { grande: `${d.dia} de ${mes}`, pequena: String(d.ano) };
  return { grande: String(d.ano), pequena: mes };
}

/** A idade num ano, quando o nascimento é conhecido e o ano não é anterior a ele. */
export function idadeNoAno(nascimentoAno: number | null | undefined, ano: number): number | null {
  return nascimentoAno && ano >= nascimentoAno ? ano - nascimentoAno : null;
}

/** "aos 34 anos", "com 1 ano", "no ano em que nasceu". */
export function textoDaIdade(idade: number): string {
  if (idade === 0) return 'no ano em que nasceu';
  if (idade === 1) return 'com 1 ano';
  return `aos ${idade} anos`;
}

export interface FaseDaVida<M> {
  chave: string;
  /** "Dos 30 aos 39 anos", "Até os 9 anos" ou, sem nascimento, "Anos 1990" */
  titulo: string;
  /** os anos da fase: "1988 a 1997" */
  quando: string;
  memorias: M[];
}

/**
 * As memórias agrupadas pela idade da pessoa, de dez em dez anos ("Dos 30 aos 39 anos"), na ordem em
 * que chegam (a da linha do tempo, das mais recentes para as mais antigas). Sem o ano de nascimento,
 * ou numa memória anterior a ele, vale a década do calendário.
 */
export function fasesDaVida<M extends { ano: number }>(memorias: M[], nascimentoAno: number | null | undefined): FaseDaVida<M>[] {
  const fases: FaseDaVida<M>[] = [];
  for (const m of memorias) {
    const idade = idadeNoAno(nascimentoAno, m.ano);
    const chave = idade !== null ? `i${Math.floor(idade / 10)}` : `d${Math.floor(m.ano / 10)}`;
    let fase = fases.find((f) => f.chave === chave);
    if (!fase) {
      if (idade !== null) {
        const de = Math.floor(idade / 10) * 10;
        fase = { chave, titulo: de === 0 ? 'Até os 9 anos' : `Dos ${de} aos ${de + 9} anos`, quando: `${nascimentoAno! + de} a ${nascimentoAno! + de + 9}`, memorias: [] };
      } else {
        const d = Math.floor(m.ano / 10) * 10;
        fase = { chave, titulo: `Anos ${d}`, quando: `${d} a ${d + 9}`, memorias: [] };
      }
      fases.push(fase);
    }
    fase.memorias.push(m);
  }
  return fases;
}

/**
 * A frase de abertura, quando ninguém escreveu "Sobre": o que o acervo sabe da pessoa.
 * "Elizete aparece em 34 memórias do acervo, de 1968 a 2026, e contou 10 delas."
 */
export function fraseDoAcervo(o: { nome: string; memorias: number; de?: number | null; ate?: number | null; relatos: number; eu: boolean }): string {
  const quem = o.eu ? 'Você' : o.nome;
  if (o.memorias === 0) return `${quem} ainda não aparece em nenhuma memória do acervo.`;
  const conta = `${o.memorias} ${o.memorias === 1 ? 'memória' : 'memórias'}`;
  const periodo = o.de && o.ate ? (o.de === o.ate ? `, em ${o.de}` : `, de ${o.de} a ${o.ate}`) : '';
  const contou = o.relatos === 0 ? '' : o.memorias === 1 ? ', e contou essa história' : o.relatos === 1 ? ', e contou uma delas' : o.relatos >= o.memorias ? ', e contou todas' : `, e contou ${o.relatos} delas`;
  return `${quem} aparece em ${conta} do acervo${periodo}${contou}.`;
}

type ComTratamento = { tratamento: 'ela' | 'ele' | null };

/**
 * O nome de um grupo da família de perto, seguindo "como se referir" de quem está nele (QA de 18/11/2026:
 * "1 pai ou mãe" no bichinho e "Irmão ou irmã" de quem tem o tratamento informado). Todas "ela", a forma
 * feminina; todos "ele", a masculina; uma pessoa só sem tratamento, as duas formas; mais de uma, mista ou
 * sem tratamento, o plural de sempre.
 */
export function nomeDoGrupoDePerto(grupo: 'pais' | 'filhos' | 'irmaos', pessoas: ComTratamento[]): string {
  const [ela, ele, elas, eles] = { pais: ['mãe', 'pai', 'mães', 'pais'], filhos: ['filha', 'filho', 'filhas', 'filhos'], irmaos: ['irmã', 'irmão', 'irmãs', 'irmãos'] }[grupo];
  const todas = pessoas.length > 0 && pessoas.every((p) => p.tratamento === 'ela');
  const todos = pessoas.length > 0 && pessoas.every((p) => p.tratamento === 'ele');
  if (pessoas.length === 1) return todas ? ela : todos ? ele : grupo === 'pais' ? 'pai ou mãe' : `${ele} ou ${ela}`;
  return todas ? elas : eles;
}

/** A conta do quadro "Na árvore", fechado: "1 mãe, casal, 2 filhas e 1 irmão". */
export function contaDaFamiliaDePerto(o: { pais: ComTratamento[]; casais: number; filhos: ComTratamento[]; irmaos: ComTratamento[] }): string {
  const conta = (g: 'pais' | 'filhos' | 'irmaos', pessoas: ComTratamento[]) => pessoas.length > 0 && `${pessoas.length} ${nomeDoGrupoDePerto(g, pessoas)}`;
  const partes = [
    conta('pais', o.pais),
    o.casais > 0 && (o.casais === 1 ? 'casal' : `${o.casais} casais`),
    conta('filhos', o.filhos),
    conta('irmaos', o.irmaos),
  ].filter(Boolean) as string[];
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}` : (partes[0] ?? '');
}
