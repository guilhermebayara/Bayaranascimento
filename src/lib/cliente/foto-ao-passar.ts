// A foto que só aparece quando o mouse ou o foco passa pela linha (a lista do Explorar no computador;
// Polaroid com `soOnde`). Ela chega com uma imagem vazia e as fontes em data-*: aqui elas vão para o <img>
// na primeira vez que a linha é apontada, e só onde a media query da foto vale. Assim a lista não baixa,
// de uma vez, as fotos de todas as linhas (sessão D1b; 6,5 MB na TV com o acervo cheio, antes).
//
// O ouvinte fica no documento: a lista é trocada no lugar pelo Explorar (explorar-troca.ts) e continua
// valendo sem ligar de novo.

let ligado = false;

/** Passa as fontes guardadas em data-* para as fotos de dentro de `raiz`, onde a media query delas vale. */
export function mostrarFotosDe(raiz: Element): void {
  for (const img of raiz.querySelectorAll<HTMLImageElement>('img[data-so-onde][data-src]')) {
    if (!matchMedia(img.dataset.soOnde!).matches) continue;
    if (img.dataset.sizes) img.sizes = img.dataset.sizes;
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src!;
    delete img.dataset.src;
  }
}

export function ligarFotoAoPassar(seletorDaLinha = '.lista__linha'): void {
  if (ligado) return;
  ligado = true;
  const aoApontar = (evento: Event) => {
    const linha = (evento.target as Element | null)?.closest?.(seletorDaLinha);
    if (linha) mostrarFotosDe(linha);
  };
  document.addEventListener('pointerover', aoApontar, { passive: true });
  document.addEventListener('focusin', aoApontar);
}
