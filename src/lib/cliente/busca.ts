// A busca do site, no navegador (docs/regras/explorar.md, "A busca"). Sem script, a lupa do topo é um link para
// /busca, e a caixa é um formulário comum que recarrega a página com a busca no endereço.
//
// Com script, a lupa abre a busca por cima da página (a folha, um <dialog>), e o resultado agrupado vem da rota
// /busca/resultado enquanto se digita. O voltar do aparelho com a folha aberta fecha a folha e fica na página:
// abrir a folha soma uma entrada no histórico, e fechar por "Fechar", pelo Esc ou pelo toque fora tira essa
// entrada. A página /busca usa a mesma caixa e o mesmo resultado, com o endereço acompanhando a busca.

// --- O estado da busca, no jeito da peça de feedback de estado (E4) ---------------------------------------
//
// A peça de feedback de estado (docs/briefs/feedback-de-estado.md) entra depois desta aplicação, em
// src/lib/cliente/estado.ts. Até lá, este bloco faz o mínimo com os mesmos nomes e o mesmo jeito (pedir, Falha,
// os estados esperando, feito, falhou e sem-rede, a linha .estado com o sinal e o texto, "Tentar de novo"):
// a aplicação da E4 troca este bloco pelo import do módulo, num lugar só.

type Estado = 'esperando' | 'feito' | 'falhou' | 'sem-rede';
/** A partir de quanto tempo a espera aparece (M1, seção 5). Abaixo disso, a tela não muda. */
const ESPERA_CURTA_MS = 400;
const FRASES = {
  procurando: 'Procurando…',
  semRede: 'Sem conexão. Vai sozinho quando a internet voltar.',
  servidor: 'O site não respondeu agora. Tente de novo daqui a pouco.',
  tentar: 'Tentar de novo',
} as const;

/** Uma falha já traduzida: o tipo e a frase que a pessoa lê. Nenhum recado técnico passa daqui. */
class Falha extends Error {
  constructor(
    readonly tipo: 'sem-rede' | 'servidor',
    readonly frase: string,
  ) {
    super(frase);
  }
}

/** fetch que só devolve resposta boa. Sem rede, o fetch rejeita com TypeError; resposta ruim é do servidor. */
async function pedir(endereco: string | URL, init?: RequestInit): Promise<Response> {
  let resposta: Response;
  try {
    resposta = await fetch(endereco, init);
  } catch {
    throw new Falha('sem-rede', FRASES.semRede);
  }
  if (!resposta.ok) throw new Falha('servidor', FRASES.servidor);
  return resposta;
}

/** A linha de estado da busca: o sinal, o texto e, na falha, "Tentar de novo". Fica fora da região que troca. */
function linhaDe(el: HTMLElement, voz: HTMLElement | null) {
  let relogio: ReturnType<typeof setTimeout> | undefined;
  const dizer = (texto: string) => {
    if (!voz) return;
    voz.textContent = '';
    // Um respiro, para o leitor de tela perceber a mudança mesmo com o mesmo texto
    setTimeout(() => (voz.textContent = texto), 60);
  };
  return {
    mostrar(estado: Estado, texto = '', tentar?: () => void) {
      clearTimeout(relogio);
      el.classList.add('estado');
      el.dataset.estado = estado;
      // A espera curta não aparece; só a partir de ESPERA_CURTA_MS
      if (estado === 'esperando') {
        el.hidden = true;
        relogio = setTimeout(() => {
          el.hidden = false;
          el.innerHTML = '<span class="estado__sinal" aria-hidden="true"></span><span class="estado__texto"></span>';
          el.querySelector('.estado__texto')!.textContent = FRASES.procurando;
        }, ESPERA_CURTA_MS);
        return;
      }
      if (estado === 'feito') {
        el.hidden = true;
        el.textContent = '';
        if (texto) dizer(texto);
        return;
      }
      el.hidden = false;
      el.innerHTML = '<span class="estado__sinal" aria-hidden="true"></span><span class="estado__texto"></span>';
      el.querySelector('.estado__texto')!.textContent = texto;
      if (tentar) {
        const botao = Object.assign(document.createElement('button'), { type: 'button', className: 'estado__tentar acao acao--quieta', textContent: FRASES.tentar });
        botao.addEventListener('click', tentar);
        el.append(botao);
      }
      dizer(texto);
    },
    limpar() {
      clearTimeout(relogio);
      delete el.dataset.estado;
      el.hidden = true;
      el.textContent = '';
    },
  };
}

// --- O resultado enquanto se digita ---------------------------------------------------------------

/** A pausa na digitação antes de pedir o resultado. */
const ESPERA_DA_DIGITACAO = 280;

/** A busca como vai no endereço: aparada, com um espaço só entre as palavras. */
const limpa = (texto: string) => texto.trim().replace(/\s+/g, ' ');

/**
 * Liga a caixa ao resultado: enquanto se digita, pede /busca/resultado e troca a região do resultado. O
 * Enter (o "Buscar" do teclado) pede na hora e fecha o teclado. `naPagina`: o endereço acompanha a busca.
 */
function ligarResultado(onde: HTMLElement, { naPagina }: { naPagina: boolean }) {
  const formulario = onde.querySelector<HTMLFormElement>('form[data-caixa-busca]')!;
  const campo = formulario.querySelector<HTMLInputElement>('input[name="q"]')!;
  const limpar = formulario.querySelector<HTMLAnchorElement>('[data-limpar-busca]')!;
  const linha = linhaDe(onde.querySelector<HTMLElement>('[data-estado-da-busca]')!, onde.querySelector<HTMLElement>('[data-voz-da-busca]'));
  const regiao = () => onde.querySelector<HTMLElement>('[data-busca-resultado]');
  let espera: ReturnType<typeof setTimeout> | undefined;
  let pedido = 0;
  let ultima = limpa(campo.value);
  let aoVoltarARede: (() => void) | undefined;

  const atualizar = async (forcar = false) => {
    clearTimeout(espera);
    const busca = limpa(campo.value);
    if (busca === ultima && !forcar) return;
    ultima = busca;
    const endereco = new URL('/busca/resultado', location.origin);
    if (busca) endereco.searchParams.set('q', busca);
    const meu = ++pedido;
    if (aoVoltarARede) removeEventListener('online', aoVoltarARede);
    aoVoltarARede = undefined;
    regiao()?.setAttribute('aria-busy', 'true');
    linha.mostrar('esperando');
    try {
      const resposta = await pedir(endereco, { headers: { Accept: 'text/html' } });
      const html = await resposta.text();
      if (meu !== pedido) return;
      const modelo = document.createElement('template');
      modelo.innerHTML = html;
      const nova = modelo.content.querySelector<HTMLElement>('[data-busca-resultado]');
      if (!nova) throw new Falha('servidor', FRASES.servidor);
      regiao()?.replaceWith(nova);
      linha.mostrar('feito', busca ? (nova.dataset.resumo ?? '') : '');
      if (naPagina) {
        const daPagina = new URL('/busca', location.origin);
        if (busca) daPagina.searchParams.set('q', busca);
        const volta = new URL(location.href).searchParams.get('volta');
        if (volta) daPagina.searchParams.set('volta', volta);
        history.replaceState(history.state, '', daPagina);
        document.title = busca ? `“${busca}” · Procurar | Memórias Bayara e Bracarense` : 'Procurar | Memórias Bayara e Bracarense';
      }
    } catch (erro) {
      if (meu !== pedido) return;
      regiao()?.removeAttribute('aria-busy');
      const falha = erro instanceof Falha ? erro : new Falha('servidor', FRASES.servidor);
      const deNovo = () => void atualizar(true);
      linha.mostrar(falha.tipo === 'sem-rede' ? 'sem-rede' : 'falhou', falha.frase, deNovo);
      // A busca é leve: sem rede, ela vai sozinha quando a internet voltar (a regra da falha da E4)
      if (falha.tipo === 'sem-rede') {
        aoVoltarARede = deNovo;
        addEventListener('online', aoVoltarARede, { once: true });
      }
    }
  };
  campo.addEventListener('input', () => {
    limpar.hidden = !campo.value;
    clearTimeout(espera);
    espera = setTimeout(() => void atualizar(), ESPERA_DA_DIGITACAO);
  });
  // O Enter pede na hora, mesmo com a busca igual, e fecha o teclado do celular com o resultado à vista
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    void atualizar(true);
    campo.blur();
  });
  limpar.addEventListener('click', (evento) => {
    evento.preventDefault();
    campo.value = '';
    limpar.hidden = true;
    void atualizar();
    campo.focus();
  });
  // Os exemplos de antes de digitar escrevem na caixa, em vez de sair da folha
  onde.addEventListener('click', (evento) => {
    const exemplo = evento.target instanceof Element ? evento.target.closest<HTMLAnchorElement>('[data-exemplo]') : null;
    if (!exemplo) return;
    evento.preventDefault();
    campo.value = exemplo.dataset.exemplo ?? '';
    limpar.hidden = !campo.value;
    void atualizar();
    campo.focus();
  });
  return { campo, linha };
}

/** A lupa do topo abre a folha da busca por cima da página. */
export function ligarFolhaDeBusca() {
  const folha = document.querySelector<HTMLDialogElement>('dialog.folha-busca');
  if (!folha || typeof folha.showModal !== 'function') return;
  document.documentElement.classList.add('com-busca');
  const { campo } = ligarResultado(folha, { naPagina: false });
  let quemAbriu: HTMLElement | null = null;
  // A entrada do histórico que a folha soma: o voltar do aparelho fecha a folha, sem sair da página
  const MARCA = 'folha-da-busca';
  const temAEntrada = () => (history.state as { [MARCA]?: boolean } | null)?.[MARCA] === true;

  const abrir = (lupa: HTMLElement) => {
    quemAbriu = lupa;
    if (!folha.open) folha.showModal();
    if (!temAEntrada()) history.pushState({ ...(history.state ?? {}), [MARCA]: true }, '');
    campo.focus();
    campo.select();
  };
  for (const lupa of document.querySelectorAll<HTMLAnchorElement>('[data-abrir-busca]')) {
    lupa.addEventListener('click', (evento) => {
      if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
      evento.preventDefault();
      abrir(lupa);
    });
  }
  folha.querySelector('[data-fechar-busca]')?.addEventListener('click', (evento) => {
    evento.preventDefault();
    folha.close();
  });
  // O toque fora do cartão (no fundo da folha) fecha, como o Esc
  folha.addEventListener('click', (evento) => {
    if (evento.target === folha) folha.close();
  });
  // Fechar por dentro (Fechar, Esc, o toque fora) tira a entrada que a folha somou; o foco volta à lupa
  folha.addEventListener('close', () => {
    if (temAEntrada()) history.back();
    quemAbriu?.focus();
  });
  // O voltar do aparelho, com a folha aberta, fecha a folha e fica na página
  addEventListener('popstate', () => {
    if (folha.open && !temAEntrada()) folha.close();
  });
  // Um link do resultado leva a outra página no lugar da entrada da folha: voltar de lá volta a esta página,
  // com a folha fechada, num toque só
  folha.addEventListener('click', (evento) => {
    const link = evento.target instanceof Element ? evento.target.closest<HTMLAnchorElement>('a[href]:not([data-exemplo]):not([data-limpar-busca])') : null;
    if (!link || evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    if (!temAEntrada()) return;
    evento.preventDefault();
    location.replace(link.href);
  });
}

/** A página /busca (quem chega pelo endereço, ou sem script e depois com): o resultado troca no lugar. */
export function ligarPaginaDeBusca() {
  const pagina = document.querySelector<HTMLElement>('main [data-pagina-de-busca]');
  if (!pagina) return;
  document.documentElement.classList.add('com-busca');
  ligarResultado(pagina, { naPagina: true });
}
