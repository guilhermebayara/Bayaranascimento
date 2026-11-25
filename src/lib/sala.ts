// A TV da sala (aplicação da E1, "o modo TV como porta"; brief em docs/historico/briefs/ver-junto-no-natal.md).
// As regras sem tela: o que entra na sala, os dias da porta, a ordem do modo TV, a carta parágrafo a
// parágrafo e a voz de quem contou. Quem decide o que entra é sempre o servidor (src/lib/servidor/sala.ts):
// estas funções só dizem a regra, e o navegador nunca escolhe uma memória que o servidor não mandou.
//
// - Fora da sala, o modo TV segue os filtros de onde foi aberto e mostra o que a pessoa vê.
// - Na sala (as duas entradas do cartão "Na TV da sala" e o "Ver na TV" da carta), só o que é aberto a toda
//   a família, seja qual for o login (resposta do Gui, 22/11/2026, confirmada em 24/11/2026). O marcador da
//   sala no endereço (`sala=1`) só restringe: o servidor confere de novo a cada pedido.
import type { Dia } from './painel';

// --- A regra da sala ------------------------------------------------------------------------------

/** O marcador da sala no endereço do modo TV. Só restringe: tirar dele nunca mostra nada a mais que o login. */
export const MARCADOR_DA_SALA = 'sala';
export const naSala = (p: URLSearchParams): boolean => p.get(MARCADOR_DA_SALA) === '1';

/** A memória entra na sala: publicada e aberta a toda a família. */
export const entraNaSala = (m: { situacao: 'rascunho' | 'publicada'; visibilidade: 'todos' | 'nucleos' }): boolean => m.situacao === 'publicada' && m.visibilidade === 'todos';

/**
 * O relato vai à TV: publicado e sem esperar o sim de ninguém. O relato que espera (depois de a memória ser
 * ampliada, só para quem via antes) nunca vai à TV, nem o texto nem a voz, na sala ou fora dela: a TV é uma
 * tela que outras pessoas olham.
 */
export const relatoNaTv = (r: { situacao: 'rascunho' | 'publicada'; soParaNucleos: readonly string[] | null; descartadoEm?: string | null }): boolean =>
  r.situacao === 'publicada' && !(r.soParaNucleos && r.soParaNucleos.length > 0) && !r.descartadoEm;

// --- Os dias da porta ------------------------------------------------------------------------------

/** O cartão "Na TV da sala" aparece no Início de 24 a 26 de dezembro (o dia no fuso de São Paulo, hojeNoBrasil). */
export const ehDiaDaSala = (dia: Pick<Dia, 'mes' | 'dia'>): boolean => dia.mes === 12 && dia.dia >= 24 && dia.dia <= 26;

/** O mesmo, para um instante: o dia é o de São Paulo, e não o do servidor (que roda em UTC). */
export function ehDiaDaSalaEm(agora: Date): boolean {
  // O mesmo cálculo de hojeNoBrasil (src/lib/painel.ts), sem trazer o painel para o script do palco
  const [mes, dia] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', month: '2-digit', day: '2-digit' }).format(agora).split('-').map(Number);
  return ehDiaDaSala({ mes: mes!, dia: dia! });
}

/**
 * O simulador de data ("?hoje=AAAA-MM-DD"), para ver a porta e os aniversários antes do dia: só nas prévias,
 * no computador e na homologação. Na produção não responde nunca, com qualquer valor (a guarda confere:
 * scripts/confere-producao.mjs, regra 14). Quem chama passa o ambiente do pedido.
 */
export function diaSimulado(valor: string | null | undefined, ambiente: string): Dia | undefined {
  if (ambiente === 'producao') return undefined;
  if (!['previa', 'homologa', 'desenvolvimento'].includes(ambiente)) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor ?? '');
  if (!m) return undefined;
  const dia = { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
  return dia.mes >= 1 && dia.mes <= 12 && dia.dia >= 1 && dia.dia <= 31 ? dia : undefined;
}

// --- Natal ---------------------------------------------------------------------------------------

const semAcento = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** O tema de Natal, pelo nome: "Natal" ou "Natais". A porta "A carta e os Natais" filtra por ele. */
export const nomeDeNatal = (nome: string): boolean => /^nata(l|is)$/.test(semAcento(nome));

// --- A carta na TV -------------------------------------------------------------------------------

/** Os parágrafos da carta, como a carta do site os separa (src/components/Carta.astro). */
export const paragrafosDaCarta = (texto: string): string[] =>
  texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** Quem assina, um nome por mão: "Gui, Giovanna e Magno" vira três. */
export const quemAssina = (assinatura: string): string[] =>
  assinatura
    .split(/\s*,\s*|\s+e\s+|\s*&\s*/)
    .map((n) => n.trim())
    .filter(Boolean);

/** Na sala, a saudação é para todos (resposta do Gui à pergunta 2 da E1). */
export const SAUDACAO_DA_SALA = 'Oi, família,';

/** O parágrafo da carta na TV fica o tempo de ler: 6 segundos e mais um a cada 18 letras, até 30. */
export const segundosDoParagrafo = (paragrafo: string): number => Math.min(30, 6 + Math.ceil(paragrafo.length / 18));

// --- A ordem do modo TV --------------------------------------------------------------------------
//
// O palco recebe de uma vez a ordem das memórias (só os ids), já com os filtros, quem vê o quê e a regra
// da sala aplicados no servidor (causa 6 da medição M1). Cada passagem busca só o pedaço do palco da
// memória da vez, por uma rota que lê uma memória só e confere tudo de novo (src/pages/explorar/palco.astro).
// Na porta "A carta e os Natais", a carta vem antes, um passo por parágrafo: "carta-1", "carta-2"...

const PASSO_DA_CARTA = /^carta-([1-9]\d?)$/;

/**
 * O parágrafo da carta de um passo ("carta-2" é o segundo), ou nada. Nenhuma memória tem esse id: as novas
 * ganham um código de oito letras sem hífen (codigoNovo, em src/lib/servidor/conteudo.ts), e as de exemplo
 * começam pelo ano.
 */
export function passoDaCarta(id: string | null | undefined): number | undefined {
  const m = PASSO_DA_CARTA.exec(id ?? '');
  return m ? Number(m[1]) : undefined;
}

/** Um id do jeito que os ids do acervo são (letras, números e hífens), para a rota não aceitar outra coisa. */
export const idValido = (id: string | null | undefined): id is string => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,99}$/.test(id);

/** A ordem do modo TV: os passos da carta, quando ela vem na frente, e depois as memórias. */
export function ordemDaTv(memorias: readonly string[], paragrafosDaCartaNaFrente = 0): string[] {
  return [...Array.from({ length: paragrafosDaCartaNaFrente }, (_, n) => `carta-${n + 1}`), ...memorias];
}

export interface VizinhasNaOrdem {
  /** a posição na ordem (0 é a primeira); -1 quando não está */
  indice: number;
  antes?: string;
  depois?: string;
}

/**
 * A anterior e a próxima de um passo na ordem. Com "Passar sozinho" ligado (`voltaAoComeco`), a última leva
 * de volta à primeira, como hoje.
 */
export function vizinhasNaOrdem(ordem: readonly string[], id: string, voltaAoComeco: boolean): VizinhasNaOrdem {
  const indice = ordem.indexOf(id);
  if (indice < 0) return { indice };
  const depois = ordem[indice + 1] ?? (voltaAoComeco && ordem.length > 1 ? ordem[0] : undefined);
  return { indice, antes: ordem[indice - 1], depois };
}

/** "3 de 48": a posição só entre as memórias (a carta não conta), ou nada para um passo da carta. */
export function posicaoNaOrdem(ordem: readonly string[], id: string): { posicao: number; de: number } | undefined {
  if (passoDaCarta(id)) return undefined;
  const memorias = ordem.filter((p) => !passoDaCarta(p));
  const n = memorias.indexOf(id);
  return n < 0 ? undefined : { posicao: n + 1, de: memorias.length };
}

/** A linha do alto do modo TV. Na sala, ela diz o que entra; fora, a de sempre. */
export function linhaDoAlto({ sala, carta, posicao, de }: { sala: boolean; carta?: boolean; posicao?: number; de?: number }): string {
  const partes = [carta ? 'A carta' : posicao && de ? `${posicao} de ${de}` : ''].filter(Boolean);
  if (sala) partes.push('só o que é aberto a toda a família');
  return partes.join(' · ');
}

// --- A voz de quem contou ------------------------------------------------------------------------

export interface RelatoComVoz {
  id: number;
  texto: string;
  situacao: 'rascunho' | 'publicada';
  soParaNucleos: string[] | null;
  descartadoEm?: string | null;
}

/**
 * O relato que vai à tela com a memória: o primeiro com voz, se houver; sem voz, o primeiro com texto. Só o
 * que vai à TV (relatoNaTv). Quem chama já passou pela regra de quem vê cada relato (e, na sala, pela da sala).
 */
export function relatoDaVez<R extends RelatoComVoz>(relatos: readonly R[], comVoz: ReadonlySet<number>): R | undefined {
  const validos = relatos.filter(relatoNaTv);
  return validos.find((r) => comVoz.has(r.id)) ?? validos.find((r) => r.texto.trim());
}

/** "Passar sozinho" enquanto alguém fala: a memória espera a voz acabar e mais três segundos. */
export const RESPIRO_DEPOIS_DA_VOZ = 3;
export function esperaDaMemoria(segundosEscolhidos: number, duracaoDaVoz: number | null): number {
  if (!duracaoDaVoz) return segundosEscolhidos;
  return Math.max(segundosEscolhidos, Math.ceil(duracaoDaVoz) + RESPIRO_DEPOIS_DA_VOZ);
}

/** "0:11", a duração da voz na tela. */
export function tempoDaVoz(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
