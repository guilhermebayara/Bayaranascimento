// Divide um formulário longo em etapas, uma por vez, com um indicador no topo.
//
// O formulário marca cada etapa com data-etapa="Nome da etapa". Sem JavaScript
// as etapas simplesmente aparecem todas, uma abaixo da outra.
//
// Botões opcionais dentro do formulário:
//   [data-etapa-voltar], [data-etapa-continuar]  navegam entre etapas
//   [data-so-no-fim]                             só aparece na última etapa

export interface Etapas {
  ir(indice: number): void;
  atual(): number;
}

/** Enter num campo de uma linha, fora da última etapa, avança em vez de enviar o formulário. */
export function enterAvanca(
  evento: { key: string; defaultPrevented: boolean; isComposing?: boolean; target: unknown },
  atual: number,
  total: number,
): boolean {
  if (evento.key !== 'Enter' || evento.defaultPrevented || evento.isComposing) return false;
  const alvo = evento.target as { tagName?: string; type?: string } | null;
  if (alvo?.tagName !== 'INPUT') return false;
  if (['submit', 'button', 'file', 'image', 'reset'].includes(alvo.type ?? '')) return false;
  return atual < total - 1;
}

export interface OpcoesDasEtapas {
  /**
   * Quem faz o papel da trilha: sem a trilha numerada, o formulário mostra o caminho de outro jeito
   * (a nova memória, em que a frase é a trilha) e este elemento é o alto para onde a página rola a
   * cada etapa. A contagem ("Etapa 2 de 7") fica com quem usa, pelo `aoEntrar`.
   */
  semTrilha?: HTMLElement;
}

/** `inicial` abre o formulário numa etapa que não a primeira: a volta depois de "Salvar rascunho". */
export function montarEtapas(form: HTMLElement, aoEntrar?: (indice: number, secao: HTMLElement) => void, inicial = 0, opcoes: OpcoesDasEtapas = {}): Etapas | undefined {
  const secoes = [...form.querySelectorAll<HTMLElement>('[data-etapa]')];
  if (secoes.length < 2) return undefined;
  let atual = Math.max(0, Math.min(secoes.length - 1, Math.trunc(inicial) || 0));

  const trilha = document.createElement('ol');
  trilha.className = 'etapas';
  trilha.setAttribute('aria-label', 'Etapas');
  const botoes = secoes.map((secao, i) => {
    const item = document.createElement('li');
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.innerHTML = `<b>${i + 1}</b><span></span>`;
    botao.querySelector('span')!.textContent = secao.dataset.etapa ?? '';
    botao.addEventListener('click', () => ir(i));
    item.append(botao);
    trilha.append(item);
    return botao;
  });
  const contagem = document.createElement('p');
  contagem.className = 'etapas__contagem';
  if (!opcoes.semTrilha) form.prepend(trilha, contagem);
  const limparErro = (evento: Event) => {
    const el = evento.target as HTMLInputElement;
    if (!el.name) return;
    for (const irmao of form.querySelectorAll<HTMLInputElement>(`[name="${CSS.escape(el.name)}"][aria-invalid]`)) {
      if (irmao.checkValidity()) irmao.removeAttribute('aria-invalid');
    }
  };
  form.addEventListener('input', limparErro);
  form.addEventListener('change', limparErro);
  form.classList.add('com-etapas');

  const voltar = form.querySelector<HTMLButtonElement>('[data-etapa-voltar]');
  const continuar = form.querySelector<HTMLButtonElement>('[data-etapa-continuar]');
  const soNoFim = [...form.querySelectorAll<HTMLElement>('[data-so-no-fim]')];
  const textoContinuar = continuar?.textContent ?? 'Continuar';

  // Etapa opcional ([data-opcional]) ainda vazia: o botão diz "Pular esta etapa", para ficar
  // claro que dá para seguir sem preencher (QA de UX, 16/11/2026)
  const vazia = (secao: HTMLElement): boolean => {
    if (secao.querySelector('.foto-enviada, [data-nova-pessoa], .audio')) return false;
    return ![...secao.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')].some((el) => {
      if (!el.name || el.disabled || el.type === 'hidden' || el.type === 'search' || el.type === 'file') return false;
      if (el.type === 'checkbox' || el.type === 'radio') return (el as HTMLInputElement).checked;
      return el.value.trim() !== '';
    });
  };
  const atualizarContinuar = () => {
    if (!continuar) return;
    const secao = secoes[atual];
    continuar.textContent = secao.dataset.opcional !== undefined && vazia(secao) ? 'Pular esta etapa' : textoContinuar;
  };
  form.addEventListener('input', atualizarContinuar);
  form.addEventListener('change', atualizarContinuar);

  // Enter num campo não envia o formulário no meio do caminho: faz o mesmo que "Continuar".
  // Sem isto, o navegador usava o primeiro botão de envio, mesmo escondido: o capítulo era criado
  // sem passar por "Quem vê", e a memória era salva como rascunho (QA de design, 17/11/2026).
  // Na última etapa o Enter continua enviando, e quem já tratou a tecla (a busca de pessoa) fica como está.
  form.addEventListener('keydown', (evento) => {
    if (!enterAvanca(evento, atual, secoes.length)) return;
    evento.preventDefault();
    ir(atual + 1);
  });

  // Para avançar, o que é obrigatório na etapa atual precisa estar preenchido
  const valida = (secao: HTMLElement): boolean => {
    for (const el of secao.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')) {
      if (!el.disabled && !el.checkValidity()) {
        // O erro fica marcado no campo, além do balão do navegador, até ser corrigido
        el.setAttribute('aria-invalid', 'true');
        el.reportValidity();
        return false;
      }
    }
    return true;
  };

  const mostrar = (foco: boolean) => {
    secoes.forEach((secao, i) => {
      secao.hidden = i !== atual;
    });
    botoes.forEach((botao, i) => {
      if (i === atual) botao.setAttribute('aria-current', 'step');
      else botao.removeAttribute('aria-current');
      botao.dataset.feita = String(i < atual);
    });
    contagem.textContent = `Etapa ${atual + 1} de ${secoes.length}: ${secoes[atual].dataset.etapa}`;
    if (voltar) voltar.hidden = atual === 0;
    if (continuar) continuar.hidden = atual === secoes.length - 1;
    for (const el of soNoFim) el.hidden = atual !== secoes.length - 1;
    atualizarContinuar();
    aoEntrar?.(atual, secoes[atual]);
    if (foco) {
      // Com movimento reduzido, a página vai direto para a trilha, sem rolar animada
      const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
      (opcoes.semTrilha ?? trilha).scrollIntoView({ block: 'start', behavior: reduzido ? 'auto' : 'smooth' });
      const titulo = secoes[atual].querySelector<HTMLElement>('legend, h2');
      titulo?.setAttribute('tabindex', '-1');
      titulo?.focus({ preventScroll: true });
    }
  };

  function ir(indice: number) {
    const destino = Math.max(0, Math.min(secoes.length - 1, indice));
    // Voltar é livre. Para ir adiante, cada etapa no caminho precisa estar válida.
    for (let i = atual; i < destino; i++) {
      if (!valida(secoes[i])) {
        atual = i;
        mostrar(false);
        return;
      }
    }
    atual = destino;
    mostrar(true);
  }

  voltar?.addEventListener('click', () => ir(atual - 1));
  continuar?.addEventListener('click', () => ir(atual + 1));
  mostrar(false);
  return { ir, atual: () => atual };
}

/** Campo de ano com botões de menos e mais: [data-ano] envolve o input e os botões [data-passo="-10"] etc. */
export function ligarCamposDeAno(raiz: ParentNode): void {
  for (const grupo of raiz.querySelectorAll<HTMLElement>('[data-ano]')) {
    const entrada = grupo.querySelector<HTMLInputElement>('input[type="number"]');
    if (!entrada) continue;
    const minimo = Number(entrada.min) || 1800;
    const maximo = Number(entrada.max) || new Date().getFullYear();
    for (const botao of grupo.querySelectorAll<HTMLButtonElement>('[data-passo]')) {
      botao.addEventListener('click', () => {
        const base = Number(entrada.value) || maximo;
        entrada.value = String(Math.max(minimo, Math.min(maximo, base + Number(botao.dataset.passo))));
        entrada.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  }
}
