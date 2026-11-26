// O painel do quadro do mapa (docs/regras/arvore.md, "A página como mapa", em "Árvore"): no celular ele fica
// recolhido numa linha, e o botão abre os ajustes e a legenda. Esc fecha e devolve o foco ao botão.
// O painel também diz ao mapa quanto ocupa, para o que mora embaixo dele saber onde começa.

export interface PainelDoMapa {
  /** Recolhe o painel no celular. Na tela grande ele não recolhe. */
  fechar(): void;
}

export function painelDoMapa(raiz: HTMLElement): PainelDoMapa {
  const painel = raiz.querySelector<HTMLElement>('[data-quadro]');
  const mapa = painel?.parentElement;
  const botao = painel?.querySelector<HTMLButtonElement>('[data-abrir-painel]');
  if (!painel || !mapa) return { fechar() {} };

  const abrir = (aberto: boolean) => {
    painel.toggleAttribute('data-aberto', aberto);
    botao?.setAttribute('aria-expanded', String(aberto));
  };
  botao?.addEventListener('click', () => abrir(!painel.hasAttribute('data-aberto')));
  painel.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    // Uma seção aberta fecha antes, e a lista de sugestões da busca fecha com o Esc dela
    const secao = (e.target as HTMLElement).closest<HTMLDetailsElement>('details[open]');
    if (secao && painel.contains(secao)) {
      e.preventDefault();
      secao.open = false;
      secao.querySelector<HTMLElement>('summary')?.focus();
      return;
    }
    if (!painel.hasAttribute('data-aberto')) return;
    e.preventDefault();
    abrir(false);
    botao?.focus();
  });

  // A altura do painel, para o que fica embaixo dele no celular
  const medir = () => mapa.style.setProperty('--pm-altura', `${painel.offsetHeight}px`);
  medir();
  new ResizeObserver(medir).observe(painel);

  return { fechar: () => abrir(false) };
}
