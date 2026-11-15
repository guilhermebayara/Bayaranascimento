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

export function montarEtapas(form: HTMLElement, aoEntrar?: (indice: number, secao: HTMLElement) => void): Etapas | undefined {
  const secoes = [...form.querySelectorAll<HTMLElement>('[data-etapa]')];
  if (secoes.length < 2) return undefined;
  let atual = 0;

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
  form.prepend(trilha, contagem);
  form.classList.add('com-etapas');

  const voltar = form.querySelector<HTMLButtonElement>('[data-etapa-voltar]');
  const continuar = form.querySelector<HTMLButtonElement>('[data-etapa-continuar]');
  const soNoFim = [...form.querySelectorAll<HTMLElement>('[data-so-no-fim]')];

  // Para avançar, o que é obrigatório na etapa atual precisa estar preenchido
  const valida = (secao: HTMLElement): boolean => {
    for (const el of secao.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')) {
      if (!el.disabled && !el.checkValidity()) {
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
    aoEntrar?.(atual, secoes[atual]);
    if (foco) {
      trilha.scrollIntoView({ block: 'start', behavior: 'smooth' });
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
