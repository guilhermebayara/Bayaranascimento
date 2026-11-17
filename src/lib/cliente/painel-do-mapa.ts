// O painel do quadro do mapa (docs/decisoes.md, "Página da árvore como mapa"): no celular ele fica
// recolhido numa linha, e o botão abre os ajustes e a legenda. Esc fecha e devolve o foco ao botão.
// O painel também diz ao mapa quanto ocupa, para a barra de baixo ficar acima da gaveta.

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
    if (e.key !== 'Escape' || e.defaultPrevented || !painel.hasAttribute('data-aberto')) return;
    // Uma seção aberta fecha antes, e a lista de sugestões da busca fecha com o Esc dela
    const secao = (e.target as HTMLElement).closest<HTMLDetailsElement>('details[open]');
    e.preventDefault();
    if (secao && painel.contains(secao)) {
      secao.open = false;
      secao.querySelector<HTMLElement>('summary')?.focus();
      return;
    }
    abrir(false);
    botao?.focus();
  });

  // Na coluna da tela grande há lugar: a legenda já vem aberta
  const legenda = painel.querySelector<HTMLDetailsElement>('[data-legenda]');
  if (legenda && raiz.dataset.proposta === 'b' && matchMedia('(min-width: 62rem)').matches) legenda.open = true;

  // A altura do painel, para o que precisa ficar acima dele quando ele mora no pé do mapa
  const medir = () => mapa.style.setProperty('--pm-altura', `${painel.offsetHeight}px`);
  medir();
  new ResizeObserver(medir).observe(painel);

  return { fechar: () => abrir(false) };
}
