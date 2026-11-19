// As reações no lugar, sem recarregar (src/components/visual/Reacoes.astro; observação do Gui, 18/11/2026).
// - O toque marca na hora (a tela muda antes da resposta) e a resposta da rota acerta a conta e os nomes.
// - Segurar o coração (no toque) ou parar o mouse em cima abre os quatro símbolos. Esc fecha.
// - Se o pedido falhar, o formulário segue como formulário comum, que recarrega: é a reserva de sempre.
import type { ResumoDasReacoes } from '../reacoes';

const SEGURAR = 450;
const MOUSE_ABRE = 350;
const MOUSE_FECHA = 300;

interface Resposta {
  marcou?: boolean;
  resumo?: ResumoDasReacoes;
  ofereceEntrar?: boolean;
  erro?: string;
}

const calmo = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const conta = (n: number) => (n === 1 ? '1 reação' : `${n} reações`);

function ligar(caixa: HTMLElement): void {
  const form = caixa.querySelector<HTMLFormElement>('[data-reacoes-form]')!;
  const principal = form.querySelector<HTMLButtonElement>('[data-reacao-principal]')!;
  const mais = form.querySelector<HTMLDetailsElement>('[data-reacoes-mais]')!;
  const recebidas = caixa.querySelector<HTMLDetailsElement>('[data-reacoes-recebidas]')!;
  const anuncio = caixa.querySelector<HTMLElement>('[data-reacoes-anuncio]')!;
  const botoes = (simbolo: string) => [...form.querySelectorAll<HTMLButtonElement>(`[data-reacao="${simbolo}"]`)];
  const desenho = (simbolo: string) => form.querySelector(`.reacao--paleta[data-reacao="${simbolo}"] svg`)?.innerHTML ?? '';
  const nomeDe = (simbolo: string) => form.querySelector(`.reacao--paleta[data-reacao="${simbolo}"] .reacao__nome`)?.textContent ?? simbolo;

  const marcar = (simbolo: string, marcado: boolean) => {
    for (const b of botoes(simbolo)) {
      b.setAttribute('aria-pressed', marcado ? 'true' : 'false');
      if (marcado && !calmo()) {
        b.classList.remove('reacao--pulsa');
        void b.offsetWidth;
        b.classList.add('reacao--pulsa');
      }
    }
  };

  const desenhar = (r: ResumoDasReacoes) => {
    for (const b of form.querySelectorAll<HTMLButtonElement>('[data-reacao]')) b.setAttribute('aria-pressed', r.minhas.includes(b.dataset.reacao as never) ? 'true' : 'false');
    recebidas.hidden = r.total === 0;
    if (r.total === 0) recebidas.open = false;
    recebidas.querySelector('[data-reacoes-numero]')!.textContent = String(r.total);
    recebidas.querySelector('[data-reacoes-conta]')!.setAttribute('aria-label', `${conta(r.total)}. Ver quem marcou`);
    const icones = recebidas.querySelector('[data-reacoes-icones]')!;
    icones.replaceChildren(
      ...r.recebidas.slice(0, 3).map((x) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        for (const [k, v] of Object.entries({ class: 'icone', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) svg.setAttribute(k, v);
        svg.innerHTML = desenho(x.simbolo);
        return svg;
      }),
    );
    const lista = recebidas.querySelector('[data-reacoes-quem]')!;
    lista.replaceChildren(
      ...r.recebidas.map((x) => {
        const li = document.createElement('li');
        li.innerHTML = `<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${desenho(x.simbolo)}</svg>`;
        li.append(Object.assign(document.createElement('span'), { className: 'so-leitor', textContent: `${x.nome}:` }), ` ${x.quem}`);
        return li;
      }),
    );
  };

  const fecharMais = (devolverFoco = false) => {
    if (!mais.open) return;
    mais.open = false;
    if (devolverFoco) principal.focus();
  };

  // O envio: a tela muda na hora, e a resposta acerta o resto
  let segurou = false;
  form.addEventListener('submit', async (evento) => {
    const botao = (evento as SubmitEvent).submitter as HTMLButtonElement | null;
    if (!botao?.dataset.reacao) return;
    evento.preventDefault();
    // O soltar do toque longo não marca o coração: ele só abriu os quatro
    if (segurou && botao === principal) return void (segurou = false);
    segurou = false;
    const simbolo = botao.dataset.reacao;
    const estava = botao.getAttribute('aria-pressed') === 'true';
    marcar(simbolo, !estava);
    fecharMais(botao !== principal);
    const dados = new FormData(form);
    dados.set('simbolo', simbolo);
    try {
      const r = await fetch(form.action, { method: 'POST', body: dados, headers: { Accept: 'application/json' } });
      const json = (await r.json()) as Resposta;
      if (!r.ok || !json.resumo) throw new Error(json.erro ?? 'falhou');
      desenhar(json.resumo);
      anuncio.textContent = `${json.marcou ? 'Você marcou' : 'Você desmarcou'} ${nomeDe(simbolo)}.`;
      // Depois de "eu estava lá": a oferta de entrar em Quem estava aparece no lugar
      if (json.ofereceEntrar) document.querySelector<HTMLElement>('[data-entrar-em-quem-estava]')?.removeAttribute('hidden');
    } catch {
      // A reserva: o formulário comum, que recarrega e volta para o mesmo ponto da página
      marcar(simbolo, estava);
      const escondido = Object.assign(document.createElement('input'), { type: 'hidden', name: 'simbolo', value: simbolo });
      form.append(escondido);
      form.submit();
    }
  });

  // Segurar o coração, no toque, abre os quatro (e o toque não marca)
  let timer = 0;
  principal.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    segurou = false;
    timer = window.setTimeout(() => {
      segurou = true;
      mais.open = true;
      mais.querySelector<HTMLButtonElement>('.reacao--paleta')?.focus({ preventScroll: true });
    }, SEGURAR);
  });
  for (const tipo of ['pointerup', 'pointercancel', 'pointerleave']) principal.addEventListener(tipo, () => clearTimeout(timer));
  // O menu do aparelho ao segurar (copiar, salvar imagem) não aparece em cima do coração
  principal.addEventListener('contextmenu', (e) => e.preventDefault());

  // Passar o mouse abre os quatro; sair fecha, com um respiro
  let mouse = 0;
  form.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(mouse);
    mouse = window.setTimeout(() => (mais.open = true), MOUSE_ABRE);
  });
  form.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(mouse);
    mouse = window.setTimeout(() => fecharMais(), MOUSE_FECHA);
  });

  // A paleta não sai da tela: perto da borda (as fotos da coluna da direita, no celular), ela anda para dentro
  mais.addEventListener('toggle', () => {
    const paleta = mais.querySelector<HTMLElement>('.reacoes__paleta');
    if (!paleta) return;
    paleta.style.removeProperty('--paleta-desvio');
    if (!mais.open) return;
    const caixaDaPaleta = paleta.getBoundingClientRect();
    const margem = 8;
    const largura = document.documentElement.clientWidth;
    const passou = caixaDaPaleta.right - (largura - margem);
    const faltou = margem - caixaDaPaleta.left;
    const desvio = passou > 0 ? -Math.min(passou, caixaDaPaleta.left - margem) : faltou > 0 ? faltou : 0;
    if (desvio) paleta.style.setProperty('--paleta-desvio', `${Math.round(desvio)}px`);
  });

  // Esc fecha e devolve o foco ao coração (ou à conta, no balão de quem marcou); tocar fora também fecha
  caixa.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mais.open) {
      e.preventDefault();
      fecharMais(true);
    } else if (e.key === 'Escape' && recebidas.open) {
      e.preventDefault();
      recebidas.open = false;
      recebidas.querySelector<HTMLElement>('[data-reacoes-conta]')?.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (mais.open && !form.contains(e.target as Node)) fecharMais();
    if (recebidas.open && !recebidas.contains(e.target as Node)) recebidas.open = false;
  });
}

export function ligarReacoes(raiz: ParentNode = document): void {
  for (const caixa of raiz.querySelectorAll<HTMLElement>('[data-reacoes]')) ligar(caixa);
}
