// O simulador de rede da exploração E4 (docs/briefs/feedback-de-estado.md, "Simular a rede"). Vive só na
// branch tst-feedback, para o Gui ver cada estado no próprio celular sem desligar o Wi-Fi, e não vai para a
// aplicação. Liga só em tst-feedback.memorias.bayara.com.br e no computador.
//
// Ele troca, no navegador, o fetch, o XMLHttpRequest e o navigator.onLine, e não muda nada no servidor:
// - lenta: cada pedido espera uns segundos antes de sair; o envio de arquivo sobe devagar, contando;
// - sem rede: o pedido falha como falha sem rede (TypeError), o navegador diz que está fora do ar e o envio
//   cai no meio; voltar ao normal avisa que a rede voltou;
// - servidor fora: o servidor responde com a página de erro (502);
// - recusa: o que grava é recusado, com a frase da rota;
// - instável: lenta, e um de cada três envios cai no meio.
// Na falta de rede, o link comum também é segurado: é como ficaria com a saída que o Gui escolher (service
// worker ou a guarda dos links), só para ver. Essa saída não está na prévia.
import { dizer, linhaDepois, proposta, quandoVoltar, redeVoltou, semRede } from './estado';

export type Modo = 'normal' | 'lenta' | 'sem-rede' | 'servidor-fora' | 'recusa' | 'instavel';
const MODOS: Modo[] = ['normal', 'lenta', 'sem-rede', 'servidor-fora', 'recusa', 'instavel'];
const NOMES: Record<Modo, string> = { normal: 'normal', lenta: 'lenta', 'sem-rede': 'sem rede', 'servidor-fora': 'servidor fora', recusa: 'recusa', instavel: 'instável' };

export const simuladorLigado = () => /^tst-feedback\./.test(location.hostname) || ['localhost', '127.0.0.1'].includes(location.hostname);

const ler = (chave: string) => {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
};
const gravar = (chave: string, valor: string) => {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // sem armazenamento, vale só nesta página
  }
};

let modo: Modo = 'normal';
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LENTA_MS = 2600;
const SUBIDA_MS = 6000;
let contaDeEnvios = 0;

const FRASE_DA_RECUSA = 'Você não pode mudar isso. Só quem criou pode.';
const FRASE_DA_RECUSA_DO_ARQUIVO = 'Esse arquivo não é uma foto que o site saiba abrir.';

function ehGravacao(metodo: string | undefined) {
  return Boolean(metodo && metodo.toUpperCase() !== 'GET' && metodo.toUpperCase() !== 'HEAD');
}

function trocarFetch() {
  const original = window.fetch.bind(window);
  window.fetch = async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const metodo = init?.method ?? (entrada instanceof Request ? entrada.method : 'GET');
    switch (modo) {
      case 'lenta':
        await esperar(LENTA_MS);
        return original(entrada, init);
      case 'instavel':
        await esperar(LENTA_MS / 2);
        if (ehGravacao(metodo) && ++contaDeEnvios % 3 === 0) throw new TypeError('Load failed');
        return original(entrada, init);
      case 'sem-rede':
        await esperar(150);
        throw new TypeError('Failed to fetch');
      case 'servidor-fora':
        await esperar(700);
        return new Response('<!doctype html><title>502 Bad Gateway</title><h1>Error 502</h1>', { status: 502, headers: { 'Content-Type': 'text/html' } });
      case 'recusa': {
        if (!ehGravacao(metodo)) return original(entrada, init);
        await esperar(500);
        const aceita = new Headers(init?.headers).get('Accept') ?? '';
        if (aceita.includes('text/html')) {
          // O formulário no lugar: a rota volta para a página, com o recado no endereço
          const pagina = await original(location.href, { headers: { Accept: 'text/html' } });
          const endereco = new URL(location.href);
          endereco.searchParams.set('erro', FRASE_DA_RECUSA);
          Object.defineProperty(pagina, 'url', { value: endereco.href });
          return pagina;
        }
        return new Response(JSON.stringify({ erro: FRASE_DA_RECUSA }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
      default:
        return original(entrada, init);
    }
  };
}

/** O envio de arquivo: a subida é contada aos poucos, e a falha cai no meio, como na rede de verdade. */
function trocarXhr() {
  const enviar = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, corpo?: Document | XMLHttpRequestBodyInit | null) {
    if (modo === 'normal') return enviar.call(this, corpo);
    const xhr = this;
    const total = corpo instanceof FormData ? [...corpo.values()].reduce((s, v) => s + (v instanceof Blob ? v.size : String(v).length), 0) : 1000;
    const andar = (fracao: number) => xhr.upload.dispatchEvent(new ProgressEvent('progress', { lengthComputable: true, loaded: Math.round(total * fracao), total }));
    const fingir = (status: number, texto: string) => {
      Object.defineProperty(xhr, 'status', { value: status, configurable: true });
      Object.defineProperty(xhr, 'responseText', { value: texto, configurable: true });
      xhr.dispatchEvent(new ProgressEvent('load'));
    };
    void (async () => {
      const instavel = modo === 'instavel';
      const cai = modo === 'sem-rede' || (instavel && ++contaDeEnvios % 3 === 0);
      const duracao = modo === 'lenta' || instavel ? SUBIDA_MS : 1500;
      const passos = 12;
      for (let i = 1; i <= passos; i++) {
        await esperar(duracao / passos);
        // A rede caiu agora (o Gui tocou "Sem rede" no meio do envio), ou este é o envio que cai
        if (modo === 'sem-rede' || (cai && i >= passos * 0.4)) return xhr.dispatchEvent(new ProgressEvent('error'));
        andar(i / passos);
      }
      if (modo === 'servidor-fora') return fingir(502, '<!doctype html><h1>Error 502</h1>');
      if (modo === 'recusa') return fingir(400, JSON.stringify({ erro: FRASE_DA_RECUSA_DO_ARQUIVO }));
      enviar.call(xhr, corpo);
    })();
  };
}

function trocarOnLine() {
  const real = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine')?.get;
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => (modo === 'sem-rede' ? false : (real?.call(navigator) ?? true)) });
}

/** Sem rede, o link comum é segurado e abre quando a rede volta: só para ver como ficaria. */
function segurarLinks() {
  addEventListener('click', (evento) => {
    // Rede lenta: o link que espera ("Me mostre outra") demora a abrir a página nova, para ver a espera
    const queEspera = evento.target instanceof Element ? evento.target.closest<HTMLAnchorElement>('a[data-espera]') : null;
    if (queEspera && !evento.defaultPrevented && (modo === 'lenta' || modo === 'instavel')) {
      evento.preventDefault();
      setTimeout(() => location.assign(queEspera.href), LENTA_MS);
      return;
    }
    if (modo !== 'sem-rede' || evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey) return;
    const link = evento.target instanceof Element ? evento.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!link || link.target || link.hasAttribute('download') || link.closest('[data-simulador]')) return;
    const destino = new URL(link.href);
    if (destino.origin !== location.origin || (destino.pathname === location.pathname && destino.search === location.search && destino.hash)) return;
    evento.preventDefault();
    semRede();
    link.dataset.tocado = '';
    setTimeout(() => delete link.dataset.tocado, 300);
    const lugar = link.closest('.botao, .palco__acoes, p, li, nav') ?? link;
    const linha = linhaDepois(lugar, 'link');
    if (proposta() === 'b') {
      const desistir = quandoVoltar(() => location.assign(destino));
      linha.mostrar('sem-rede', 'Sem conexão. Abre sozinho quando a internet voltar.', { tentar: () => (desistir(), location.assign(destino)) });
    } else {
      linha.mostrar('falhou', 'Sem conexão. Toque de novo quando a internet voltar.');
    }
  });
}

function mudarModo(novo: Modo) {
  const antes = modo;
  modo = novo;
  gravar('sim-rede', novo);
  if (novo === 'sem-rede' && antes !== 'sem-rede') dispatchEvent(new Event('offline'));
  if (antes === 'sem-rede' && novo !== 'sem-rede') {
    dispatchEvent(new Event('online'));
    redeVoltou();
  }
  desenharPainel();
}

function desenharPainel() {
  const p = proposta();
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-sim-rede]')) b.setAttribute('aria-pressed', String(b.dataset.simRede === modo));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-sim-proposta]')) b.setAttribute('aria-pressed', String(b.dataset.simProposta === p));
  for (const r of document.querySelectorAll<HTMLElement>('[data-simulador-resumo]')) r.textContent = `Proposta ${p.toUpperCase()} · rede ${NOMES[modo]}`;
}

export function ligarSimulador(): void {
  if (!simuladorLigado()) return;
  // O endereço (?rede=lenta) já foi lido no esqueleto, antes de a página limpar o endereço
  const guardado = ler('sim-rede') as Modo | null;
  modo = guardado && MODOS.includes(guardado) ? guardado : 'normal';
  gravar('sim-rede', modo);
  trocarFetch();
  trocarXhr();
  trocarOnLine();
  segurarLinks();
  for (const el of document.querySelectorAll<HTMLElement>('[data-simulador]')) el.hidden = false;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-sim-rede]')) b.addEventListener('click', () => mudarModo(b.dataset.simRede as Modo));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-sim-proposta]')) {
    b.addEventListener('click', () => {
      gravar('proposta', b.dataset.simProposta!);
      document.documentElement.dataset.proposta = b.dataset.simProposta!;
      desenharPainel();
      dizer(`Proposta ${b.dataset.simProposta!.toUpperCase()}.`);
    });
  }
  desenharPainel();
  if (modo === 'sem-rede') queueMicrotask(() => dispatchEvent(new Event('offline')));
}
