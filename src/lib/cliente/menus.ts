// O botão de menu (os três pontos, src/components/visual/MenuDeAcoes.astro). Sem script ele já abre e
// fecha, porque é um details. Aqui: Esc fecha e devolve o foco ao botão, tocar fora fecha, e abrir um
// menu fecha os outros. As setas andam entre as ações, como num menu do aparelho.
export function ligarMenus(raiz: ParentNode = document): void {
  const menus = [...raiz.querySelectorAll<HTMLDetailsElement>('[data-menu-acoes]')];
  if (menus.length === 0) return;
  for (const menu of menus) {
    // O summary já diz ao leitor de tela se está aberto ou fechado
    const botao = menu.querySelector<HTMLElement>('summary')!;
    menu.addEventListener('toggle', () => {
      if (menu.open) for (const outro of menus) if (outro !== menu) outro.open = false;
    });
    menu.addEventListener('keydown', (e) => {
      const itens = [...menu.querySelectorAll<HTMLElement>('.menu-acoes__item')];
      const atual = itens.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'Escape' && menu.open) {
        e.preventDefault();
        menu.open = false;
        botao.focus();
      } else if (menu.open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const passo = e.key === 'ArrowDown' ? 1 : -1;
        itens[(atual + passo + itens.length) % itens.length]?.focus();
      }
    });
  }
  document.addEventListener('click', (e) => {
    for (const menu of menus) if (menu.open && !menu.contains(e.target as Node)) menu.open = false;
  });
}
