// A peça de feedback de estado (exploração E4, docs/briefs/feedback-de-estado.md). Uma peça só para o site
// inteiro dizer do mesmo jeito que o toque foi ouvido, que algo está acontecendo, quanto falta, que deu certo,
// que falhou e por quê, e que a rede caiu. No lugar dos avisos espalhados de enviando.ts, no-lugar.ts, do
// envio de fotos e do relato.
//
// Os oito estados (M1, seção 5): tocado, esperando (curto: nada aparece), demorando (o esperando longo),
// enviando (com quanto falta), feito, falhou (dá para tentar de novo), recusado (não dá) e sem rede.
//
// A marcação é a mesma nas duas propostas: uma linha `.estado` com o sinal, o texto, o fio do progresso e o
// "Tentar de novo". Quem desenha é o CSS (src/visual/estado.css): na proposta A, o texto na voz do álbum;
// na B, o sinal próprio (o anel). O que muda de comportamento entre as duas é uma regra só: na A, uma falha
// devolve o controle ao estado de antes e nada é tentado sem a pessoa; na B, a escolha fica de pé, marcada
// com o sinal, e o que é leve vai sozinho quando a rede volta, como o modo TV.

export type Estado = 'tocado' | 'esperando' | 'demorando' | 'enviando' | 'feito' | 'falhou' | 'recusado' | 'sem-rede';
export type Proposta = 'a' | 'b';

/** A partir de quanto tempo a espera aparece (M1, seção 5). Abaixo disso, basta o tocado. */
export const ESPERA_CURTA_MS = 400;
/** Quanto tempo a frase de "deu certo" fica na linha antes de sair. */
const FEITO_MS = 4000;

/** As frases de cada caso. A recusa do servidor traz a própria frase, da rota. */
export const FRASES = {
  semRede: 'Sem conexão.',
  semRedeTente: 'Sem conexão. Confira a internet e tente de novo.',
  semRedeEspera: 'Sem conexão. Vai sozinho quando a internet voltar.',
  servidor: 'O site não respondeu agora. Tente de novo daqui a pouco.',
  recusa: 'Não deu para fazer isso.',
  caiuNoMeio: 'A conexão caiu no meio do envio.',
  tentar: 'Tentar de novo',
  voltou: 'A conexão voltou.',
  guardado: 'O que você escreveu continua aqui.',
  naoPrecisa: 'Ainda salvando. Não precisa tocar de novo.',
  paginaSemRedeA: 'Sem conexão. Você continua nesta página. Quando a internet voltar, toque de novo no que quiser fazer.',
  paginaSemRedeB: 'Sem conexão. Você continua nesta página, e o que você fizer agora vai quando a internet voltar.',
} as const;

export function proposta(): Proposta {
  return document.documentElement.dataset.proposta === 'b' ? 'b' : 'a';
}

// --- A falha, em português -----------------------------------------------------------------------

export type TipoDeFalha = 'sem-rede' | 'servidor' | 'recusa';

/** Uma falha já traduzida: o tipo e a frase que a pessoa lê. Nenhum recado técnico passa daqui. */
export class Falha extends Error {
  constructor(
    readonly tipo: TipoDeFalha,
    readonly frase: string,
  ) {
    super(frase);
  }
}

const semRedeAgora = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** Qualquer erro vira uma Falha. Sem rede, o fetch rejeita com TypeError ("Failed to fetch", "Load failed"). */
export function paraFalha(erro: unknown): Falha {
  if (erro instanceof Falha) return erro;
  if (semRedeAgora() || erro instanceof TypeError) return new Falha('sem-rede', FRASES.semRede);
  return new Falha('servidor', FRASES.servidor);
}

/** A frase de uma resposta recusada: a da rota, quando ela manda uma em JSON; senão, a geral. */
async function falhaDaResposta(resposta: Response): Promise<Falha> {
  if (resposta.status >= 500 || resposta.status === 0) return new Falha('servidor', FRASES.servidor);
  try {
    const corpo = (await resposta.clone().json()) as { erro?: unknown };
    if (typeof corpo.erro === 'string' && corpo.erro.trim()) return new Falha('recusa', corpo.erro);
  } catch {
    // Uma página de erro em HTML: o servidor está com problema, não é uma recusa da rota
    return new Falha('servidor', FRASES.servidor);
  }
  return new Falha('recusa', FRASES.recusa);
}

/** fetch que só devolve resposta boa. Toda falha sai como Falha, com a frase certa. */
export async function pedir(endereco: string | URL, init?: RequestInit): Promise<Response> {
  let resposta: Response;
  try {
    resposta = await fetch(endereco, init);
  } catch (erro) {
    throw paraFalha(erro);
  }
  if (!resposta.ok) throw await falhaDaResposta(resposta);
  return resposta;
}

/** pedir, e o JSON da resposta. Uma resposta boa que não é JSON é problema do servidor. */
export async function pedirJson<T>(endereco: string | URL, init?: RequestInit): Promise<T> {
  const resposta = await pedir(endereco, init);
  try {
    return (await resposta.json()) as T;
  } catch {
    throw new Falha('servidor', FRASES.servidor);
  }
}

/**
 * Envia um arquivo e conta quanto já subiu (o fetch não conta: por isso o XMLHttpRequest). aoAndar recebe
 * de 0 a 1. Devolve o JSON da rota; a falha sai como Falha.
 */
export function enviarArquivo<T>(endereco: string, corpo: FormData, aoAndar: (fracao: number) => void): Promise<T> {
  return new Promise((resolver, rejeitar) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endereco);
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && e.total) aoAndar(Math.min(1, e.loaded / e.total));
    });
    xhr.addEventListener('error', () => rejeitar(new Falha('sem-rede', semRedeAgora() ? FRASES.semRede : FRASES.caiuNoMeio)));
    xhr.addEventListener('timeout', () => rejeitar(new Falha('sem-rede', FRASES.caiuNoMeio)));
    xhr.addEventListener('load', () => {
      let dados: { erro?: unknown } | null = null;
      try {
        dados = JSON.parse(xhr.responseText);
      } catch {
        dados = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && dados) return resolver(dados as T);
      if (xhr.status >= 500 || !dados) return rejeitar(new Falha('servidor', FRASES.servidor));
      rejeitar(new Falha('recusa', typeof dados.erro === 'string' && dados.erro ? dados.erro : FRASES.recusa));
    });
    xhr.send(corpo);
  });
}

// --- A voz: a região viva da página, uma só --------------------------------------------------------

/**
 * Diz ao leitor de tela. A região já existe na página antes de qualquer mudança (Visual.astro, data-voz):
 * uma região viva que entra pronta costuma não ser lida.
 */
export function dizer(texto: string): void {
  // A região vem no esqueleto (Visual.astro). O modo TV tem a dele (o aviso do palco)
  const voz = document.querySelector<HTMLElement>('[data-voz]');
  if (!voz) return;
  const alvo = voz;
  alvo.textContent = '';
  // Um respiro, para o leitor de tela perceber a mudança mesmo com o mesmo texto
  setTimeout(() => (alvo.textContent = texto), 60);
}

// --- A linha de estado ---------------------------------------------------------------------------

const SINAIS: Partial<Record<Estado, string>> = {
  feito: '<path d="M7 12.5l3.2 3.2L17 9" />',
  falhou: '<path d="M16.5 8.5A6 6 0 1 0 18 13" /><path d="M17 5v4h-4" />',
  recusado: '<path d="M12 7.5v5.5" /><path d="M12 16.5v.01" />',
};

export interface OpcoesDaLinha {
  /** de 0 a 1, no enviando */
  andou?: number;
  /** o "Tentar de novo" da falha */
  tentar?: () => void;
  /** dizer ao leitor de tela (padrão: só o que não é esperando nem enviando) */
  dizer?: boolean;
}

export interface Linha {
  readonly el: HTMLElement;
  mostrar(estado: Estado, texto?: string, opcoes?: OpcoesDaLinha): void;
  limpar(): void;
  readonly estado: Estado | null;
}

/**
 * Faz de um elemento a linha de estado de uma ação. O elemento pode já ter conteúdo (a conta do Explorar):
 * o conteúdo de antes volta quando a linha é limpa.
 */
const ORIGINAL = new WeakMap<HTMLElement, { html: string; classe: boolean }>();
const RELOGIOS = new WeakMap<HTMLElement, number>();

export function linhaDe(el: HTMLElement): Linha {
  // O conteúdo de antes é guardado uma vez por elemento: várias linhas do mesmo elemento voltam ao mesmo
  if (!ORIGINAL.has(el)) ORIGINAL.set(el, { html: el.innerHTML, classe: el.classList.contains('estado') });
  const { html: antes, classe: tinhaLinha } = ORIGINAL.get(el)!;
  const linha: Linha = {
    el,
    get estado() {
      return (el.dataset.estado as Estado | undefined) ?? null;
    },
    mostrar(estado, texto = '', opcoes = {}) {
      clearTimeout(RELOGIOS.get(el));
      // Esperando curto: nada além do tocado. A linha volta ao que era (a conta do Explorar continua lá)
      if (estado === 'esperando' && !texto) {
        linha.limpar();
        el.dataset.estado = 'esperando';
        return;
      }
      el.classList.add('estado');
      el.dataset.estado = estado;
      el.hidden = false;
      el.style.setProperty('--andou', `${Math.round((opcoes.andou ?? 0) * 100)}%`);
      const sinal = SINAIS[estado] ?? '';
      el.innerHTML = `<span class="estado__sinal" aria-hidden="true">${sinal ? `<svg viewBox="0 0 24 24">${sinal}</svg>` : ''}</span><span class="estado__texto"></span>${estado === 'enviando' ? '<span class="estado__fio" aria-hidden="true"></span>' : ''}`;
      el.querySelector('.estado__texto')!.textContent = texto;
      if (opcoes.tentar) {
        const botao = Object.assign(document.createElement('button'), { type: 'button', className: 'estado__tentar acao', textContent: FRASES.tentar });
        botao.addEventListener('click', () => opcoes.tentar!());
        el.append(botao);
      }
      const falar = opcoes.dizer ?? !['esperando', 'enviando', 'tocado'].includes(estado);
      if (falar && texto) dizer(texto);
      if (estado === 'feito') RELOGIOS.set(el, setTimeout(() => linha.limpar(), FEITO_MS));
    },
    limpar() {
      clearTimeout(RELOGIOS.get(el));
      delete el.dataset.estado;
      el.style.removeProperty('--andou');
      el.innerHTML = antes;
      if (!tinhaLinha) el.classList.remove('estado');
      if (!antes.trim()) el.hidden = true;
    },
  };
  return linha;
}

/** Uma linha nova, logo depois de um elemento (o botão, o grupo de controles). */
export function linhaDepois(de: Element, chave = 'estado'): Linha {
  const vizinho = de.nextElementSibling;
  if (vizinho instanceof HTMLElement && vizinho.dataset.linhaDeEstado === chave) return linhaDe(vizinho);
  const el = document.createElement('p');
  el.dataset.linhaDeEstado = chave;
  el.hidden = true;
  de.after(el);
  return linhaDe(el);
}

// --- A rede, para a página inteira ------------------------------------------------------------------

type AoVoltar = () => void;
const aoVoltar = new Set<AoVoltar>();
let foraDoAr = false;
let relogioDaRede = 0;

function faixaDaRede(): Linha | null {
  const el = document.querySelector<HTMLElement>('[data-rede]');
  return el ? linhaDe(el) : null;
}

/** A página entra no estado sem rede: o aviso num lugar só, no alto, e quem quer tentar quando voltar espera. */
export function semRede(): void {
  if (foraDoAr) return;
  foraDoAr = true;
  clearTimeout(relogioDaRede);
  document.documentElement.dataset.semRede = '';
  // Na A, o bilhete escrito, com a frase inteira; na B, o sinal e duas palavras. A voz diz a frase inteira
  const frase = proposta() === 'b' ? FRASES.paginaSemRedeB : FRASES.paginaSemRedeA;
  faixaDaRede()?.mostrar('sem-rede', proposta() === 'b' ? FRASES.semRede.replace('.', '') : frase, { dizer: false });
  dizer(frase);
}

/** A rede voltou: o aviso diz e sai, e o que esperava vai. */
export function redeVoltou(): void {
  if (!foraDoAr) return;
  foraDoAr = false;
  delete document.documentElement.dataset.semRede;
  const faixa = faixaDaRede();
  faixa?.mostrar('feito', FRASES.voltou);
  const esperando = [...aoVoltar];
  aoVoltar.clear();
  for (const fazer of esperando) fazer();
}

/** Guarda o que fazer quando a rede voltar. Devolve como desistir. */
export function quandoVoltar(fazer: AoVoltar): () => void {
  aoVoltar.add(fazer);
  return () => aoVoltar.delete(fazer);
}

export const estaSemRede = () => foraDoAr || semRedeAgora();
/** O aparelho diz que está fora do ar (modo avião, Wi-Fi e dados desligados). É o único sinal seguro antes
 * de um envio comum: a falha de um pedido pode ser só daquele pedido. */
export const aparelhoSemRede = semRedeAgora;

let redeLigada = false;
/** Liga o estado de rede da página aos avisos do navegador. Uma vez por página. */
export function ligarRede(): void {
  if (redeLigada) return;
  redeLigada = true;
  addEventListener('offline', semRede);
  addEventListener('online', redeVoltou);
  if (semRedeAgora()) semRede();
}

// --- A ação -------------------------------------------------------------------------------------------

export interface Acao<T> {
  /** onde o estado aparece; sem linha, só a voz */
  linha?: Linha | null;
  /** o tocado: marca o controle na hora e devolve como desfazer */
  marcar?: () => (() => void) | void;
  fazer: () => Promise<T>;
  /**
   * o controle tocado: na espera longa ele ganha o sinal ao lado (data-demorando), sem linha nova e sem
   * empurrar nada na página
   */
  controle?: HTMLElement | null;
  /** a frase do tocado, quando o controle não muda sozinho (o botão de salvar): aparece na hora */
  tocado?: string;
  /** a frase da espera longa ("Buscando as memórias…") */
  demorando?: string;
  /** a frase curta de "deu certo", quando a mudança não se vê onde a pessoa está; null, só a voz */
  feito?: string | ((resultado: T) => string | null) | null;
  /** o que a voz diz quando deu certo e não há frase na linha */
  dizerFeito?: string | ((resultado: T) => string | null);
  /** leve o bastante para ir sozinho quando a rede volta (na proposta B) */
  leve?: boolean;
  /** a ação ainda vale? (uma escolha mais nova já saiu) */
  vale?: () => boolean;
  /** depois da falha, além da linha (pôr o recado no formulário, guardar o texto) */
  aoFalhar?: (falha: Falha) => void;
}

/**
 * Faz uma ação com os estados: tocado na hora, demorando depois de ESPERA_CURTA_MS, feito ou a falha certa.
 * Devolve o resultado, ou undefined quando falhou.
 */
export async function agir<T>(acao: Acao<T>, jaMarcado?: () => void): Promise<T | undefined> {
  const desfazer = jaMarcado ?? acao.marcar?.() ?? undefined;
  const linha = acao.linha ?? null;
  const vale = acao.vale ?? (() => true);
  let demorou = false;
  const relogio = setTimeout(() => {
    if (!vale()) return;
    demorou = true;
    acao.controle?.setAttribute('data-demorando', '');
    const frase = acao.demorando ?? acao.tocado;
    if (frase) {
      linha?.mostrar('demorando', frase, { dizer: false });
      dizer(frase);
    }
  }, ESPERA_CURTA_MS);
  if (acao.tocado) linha?.mostrar('tocado', acao.tocado);
  else linha?.mostrar('esperando');
  try {
    const resultado = await acao.fazer();
    clearTimeout(relogio);
    acao.controle?.removeAttribute('data-demorando');
    // Um pedido que deu certo é a melhor prova de que a rede voltou
    if (foraDoAr) redeVoltou();
    if (!vale()) return resultado;
    const feito = typeof acao.feito === 'function' ? acao.feito(resultado) : acao.feito;
    if (feito) linha?.mostrar('feito', feito);
    else linha?.limpar();
    const voz = typeof acao.dizerFeito === 'function' ? acao.dizerFeito(resultado) : acao.dizerFeito;
    if (!feito && voz) dizer(voz);
    else if (!feito && demorou) dizer('Pronto.');
    return resultado;
  } catch (erro) {
    clearTimeout(relogio);
    acao.controle?.removeAttribute('data-demorando');
    if (!vale()) return undefined;
    const falha = paraFalha(erro);
    mostrarFalha(acao, falha, desfazer);
    acao.aoFalhar?.(falha);
    return undefined;
  }
}

function mostrarFalha<T>(acao: Acao<T>, falha: Falha, desfazer: (() => void) | undefined): void {
  const linha = acao.linha ?? null;
  const deNovo = () => void agir(acao, desfazer && proposta() === 'b' ? desfazer : undefined);
  if (falha.tipo === 'recusa') {
    desfazer?.();
    if (linha) linha.mostrar('recusado', falha.frase);
    else dizer(falha.frase);
    return;
  }
  if (falha.tipo === 'sem-rede') semRede();
  // Na proposta B, o que é leve fica de pé e vai sozinho quando a rede volta
  if (falha.tipo === 'sem-rede' && acao.leve && proposta() === 'b') {
    const desistir = quandoVoltar(() => void agir(acao, desfazer));
    if (linha) linha.mostrar('sem-rede', FRASES.semRedeEspera, { tentar: () => (desistir(), deNovo()) });
    else dizer(FRASES.semRedeEspera);
    return;
  }
  // Na A, a marca volta ao estado de antes: o que está marcado é sempre o que está na tela
  if (proposta() === 'a') desfazer?.();
  const frase = falha.tipo === 'sem-rede' ? (falha.frase === FRASES.semRede ? FRASES.semRedeTente : `${falha.frase} ${FRASES.semRedeTente.replace(FRASES.semRede + ' ', '')}`) : falha.frase;
  if (linha) linha.mostrar('falhou', frase, { tentar: deNovo });
  else dizer(frase);
}

// --- A fila dos envios (fotos e áudios) ----------------------------------------------------------------

export interface Envio {
  /** a linha do item (a foto na lista) */
  linha: Linha;
  enviar(aoAndar: (fracao: number) => void): Promise<void>;
}

export interface Fila {
  por(envio: Envio): void;
  ocupada(): boolean;
  /** "Enviando a foto 3 de 10", para quem saiu da etapa */
  resumo(): string;
}

/**
 * Os envios sobem um por vez, e a linha do resumo conta quanto falta ("Enviando a foto 3 de 10"). Uma
 * falha no meio não segura as outras: o item fica com "Tentar de novo", e a fila segue. Sem rede, a fila
 * para; na B, volta sozinha quando a rede volta.
 */
export function criarFila(resumoEl: Linha | null, nome: { um: string; artigo: string; plural: string }, aoMudar: () => void = () => {}): Fila {
  const fila: Envio[] = [];
  const falharam = new Set<Envio>();
  const jaVoltou = new WeakSet<Envio>();
  let atual: Envio | null = null;
  let total = 0;
  let prontas = 0;
  let parada = false;

  const contar = (fracao = 0) => {
    const n = Math.min(total, prontas + falharam.size + 1);
    const texto = `Enviando ${nome.artigo} ${nome.um} ${n} de ${total}`;
    resumoEl?.mostrar('enviando', texto, { andou: total ? (prontas + falharam.size + fracao) / total : 0 });
  };

  const terminar = () => {
    if (falharam.size) {
      const frase = falharam.size === 1 ? `${prontas} de ${total} enviad${nome.artigo === 'a' ? 'as' : 'os'}. Um${nome.artigo === 'a' ? 'a' : ''} não foi.` : `${prontas} de ${total} enviad${nome.artigo === 'a' ? 'as' : 'os'}. ${falharam.size} não foram.`;
      resumoEl?.mostrar('falhou', frase, { tentar: tentarTodas });
    } else if (total) {
      resumoEl?.mostrar('feito', total === 1 ? `${nome.um[0]!.toUpperCase()}${nome.um.slice(1)} enviad${nome.artigo}.` : `${total} ${nome.plural} enviad${nome.artigo === 'a' ? 'as' : 'os'}.`);
    }
    total = 0;
    prontas = 0;
    aoMudar();
  };

  const tentarTodas = () => {
    const todas = [...falharam];
    falharam.clear();
    parada = false;
    for (const envio of todas) recolocar(envio);
  };

  const recolocar = (envio: Envio) => {
    falharam.delete(envio);
    fila.push(envio);
    envio.linha.mostrar('esperando', 'Na fila');
    if (!atual) void proximo();
  };

  const proximo = async (): Promise<void> => {
    if (parada) return;
    const envio = fila.shift();
    if (!envio) {
      atual = null;
      return terminar();
    }
    atual = envio;
    contar();
    envio.linha.mostrar('enviando', 'Enviando', { andou: 0 });
    try {
      await envio.enviar((fracao) => {
        envio.linha.mostrar('enviando', `Enviando · ${Math.round(fracao * 100)}%`, { andou: fracao });
        contar(fracao);
      });
      prontas++;
      envio.linha.limpar();
    } catch (erro) {
      const falha = paraFalha(erro);
      falharam.add(envio);
      if (falha.tipo === 'recusa') {
        envio.linha.mostrar('recusado', falha.frase);
      } else if (falha.tipo === 'sem-rede' && !aparelhoSemRede() && proposta() === 'b' && !jaVoltou.has(envio)) {
        // A conexão caiu no meio, mas o aparelho segue com rede: na B, a foto volta sozinha para o fim da fila
        falharam.delete(envio);
        jaVoltou.add(envio);
        fila.push(envio);
        envio.linha.mostrar('esperando', 'A conexão caiu. Vai de novo no fim da fila.');
      } else if (falha.tipo === 'sem-rede' && !aparelhoSemRede()) {
        // Uma foto só: as outras seguem, e esta fica com "Tentar de novo"
        envio.linha.mostrar('falhou', falha.frase, { tentar: () => recolocar(envio) });
      } else if (falha.tipo === 'sem-rede') {
        semRede();
        // Sem rede, as que estavam na fila param junto: nenhuma vai falhar uma por uma
        parada = true;
        for (const resto of fila.splice(0)) {
          falharam.add(resto);
          resto.linha.mostrar('sem-rede', proposta() === 'b' ? 'Espera a internet' : FRASES.semRede);
        }
        if (proposta() === 'b') {
          envio.linha.mostrar('sem-rede', 'Espera a internet');
          resumoEl?.mostrar('sem-rede', FRASES.semRedeEspera, { tentar: tentarTodas });
          quandoVoltar(tentarTodas);
        } else {
          envio.linha.mostrar('falhou', falha.frase, { tentar: () => recolocar(envio) });
          resumoEl?.mostrar('falhou', `${FRASES.semRede} ${prontas} de ${total} enviad${nome.artigo === 'a' ? 'as' : 'os'}.`, { tentar: tentarTodas });
        }
        atual = null;
        aoMudar();
        return;
      } else {
        envio.linha.mostrar('falhou', falha.frase === FRASES.caiuNoMeio ? falha.frase : 'Não foi.', { tentar: () => recolocar(envio) });
      }
    }
    aoMudar();
    return proximo();
  };

  return {
    por(envio) {
      // Foto nova com a fila parada e a rede de volta: as que esperavam vão junto
      if (parada && !estaSemRede()) tentarTodas();
      if (!atual && !fila.length && !falharam.size) {
        total = 0;
        prontas = 0;
      }
      total++;
      fila.push(envio);
      envio.linha.mostrar('esperando', 'Na fila');
      if (!atual && !parada) void proximo();
      else contar();
      aoMudar();
    },
    ocupada: () => Boolean(atual || fila.length),
    resumo: () => (atual || fila.length ? `Enviando ${nome.artigo} ${nome.um} ${Math.min(total, prontas + falharam.size + 1)} de ${total}.` : ''),
  };
}

// --- O link que leva a outra página e demora ("Me mostre outra") ----------------------------------------

/**
 * O link marcado com data-espera muda o texto na hora ("Sorteando…") e, se a página nova demorar, a linha
 * diz que ainda está buscando. Um segundo toque não pede de novo. Sem rede no aparelho, o link segue o
 * caminho da falta de rede (a pergunta do service worker, no relatório da E4).
 */
export function ligarLinksQueEsperam(): void {
  document.addEventListener('click', (evento) => {
    const a = evento.target instanceof Element ? evento.target.closest<HTMLAnchorElement>('a[data-espera]') : null;
    if (!a || evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    if (a.dataset.esperando !== undefined) return evento.preventDefault();
    if (aparelhoSemRede()) return;
    a.dataset.esperando = a.textContent ?? '';
    a.textContent = a.dataset.espera!;
    a.dataset.tocado = '';
    // A espera longa: o sinal ao lado do próprio botão, sem linha nova (nada salta), e a voz diz
    setTimeout(() => {
      if (a.dataset.esperando === undefined) return;
      a.setAttribute('data-demorando', '');
      dizer(a.dataset.esperaLonga ?? 'Ainda buscando…');
    }, ESPERA_CURTA_MS);
  });
  // Voltando pelo histórico, a página pode vir da memória ainda esperando
  addEventListener('pageshow', () => {
    for (const a of document.querySelectorAll<HTMLAnchorElement>('a[data-espera][data-esperando]')) {
      a.textContent = a.dataset.esperando ?? a.textContent;
      delete a.dataset.esperando;
      delete a.dataset.tocado;
      a.removeAttribute('data-demorando');
    }
    for (const el of document.querySelectorAll<HTMLElement>('[data-linha-de-estado="link"]')) linhaDe(el).limpar();
  });
}
