// Um mapa que anda e aproxima: arrastar o vazio move, dois dedos ou Ctrl com a roda aproximam, as
// setas e + e − fazem o mesmo pelo teclado. É o comportamento do mapa da árvore
// (src/lib/cliente/arvore.ts), separado para o círculo usar. A árvore ainda tem a cópia dela: juntar
// as duas é trabalho à parte, porque os gestos da árvore são travados e têm teste próprio.
//
// A nitidez no zoom segue a regra da árvore: a camada só é promovida (will-change, na classe
// mapa__camada--em-gesto) enquanto o gesto dura, e é desenhada de novo quando ele acaba.

export interface Vista {
  x: number;
  y: number;
  zoom: number;
}

export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapaQueAnda {
  vista: Vista;
  /** Vai para uma vista inteira de uma vez */
  ir(vista: Vista, animado?: boolean): void;
  mover(dx: number, dy: number, animado?: boolean): void;
  /** Aproxima ou afasta mantendo parado o ponto (px, py) do mapa */
  zoomEm(novo: number, px: number, py: number, animado?: boolean): void;
  /** O clique que vem logo depois de um arrasto não deve escolher ninguém */
  acabouDeArrastar(): boolean;
}

interface Opcoes {
  mapa: HTMLElement;
  camadas: HTMLElement[];
  zoomMin: number;
  zoomMax: number;
  /** Desligado, o mapa não anda nem aproxima (o círculo no celular, que é uma lista) */
  ativo?: () => boolean;
  /** Onde o gesto não começa: o painel, a barra de baixo, uma pessoa que se arrasta */
  foraDoGesto: (alvo: HTMLElement) => boolean;
  aoMudar?: (vista: Vista) => void;
}

const TEMPO_DO_GESTO = 180;

export function mapaQueAnda({ mapa, camadas, zoomMin, zoomMax, ativo = () => true, foraDoGesto, aoMudar }: Opcoes): MapaQueAnda {
  const vista: Vista = { x: 0, y: 0, zoom: 1 };
  let fimDoGesto = 0;
  const emGesto = (animado: boolean) => {
    for (const c of camadas) c.classList.add('mapa__camada--em-gesto');
    clearTimeout(fimDoGesto);
    fimDoGesto = window.setTimeout(
      () => {
        for (const c of camadas) c.classList.remove('mapa__camada--em-gesto');
      },
      animado ? 600 : TEMPO_DO_GESTO,
    );
  };
  const aplicar = (animado = false) => {
    if (!ativo()) return;
    emGesto(animado);
    for (const c of camadas) {
      c.classList.toggle('mapa__camada--animada', animado);
      c.style.transform = `translate(${vista.x}px, ${vista.y}px) scale(${vista.zoom})`;
    }
    aoMudar?.(vista);
  };
  const zoomEm = (novo: number, px: number, py: number, animado = false) => {
    const zoom = Math.max(zoomMin, Math.min(zoomMax, novo));
    vista.x = px - ((px - vista.x) / vista.zoom) * zoom;
    vista.y = py - ((py - vista.y) / vista.zoom) * zoom;
    vista.zoom = zoom;
    aplicar(animado);
  };
  const mover = (dx: number, dy: number, animado = false) => {
    vista.x += dx;
    vista.y += dy;
    aplicar(animado);
  };

  const dedos = new Map<number, { x: number; y: number }>();
  let arrasto: { x: number; y: number; vx: number; vy: number; andou: boolean } | undefined;
  let pinca: { distancia: number; zoom: number } | undefined;
  let fimDoArrasto = 0;
  const ponto = (e: { clientX: number; clientY: number }) => {
    const caixa = mapa.getBoundingClientRect();
    return { x: e.clientX - caixa.left, y: e.clientY - caixa.top };
  };
  mapa.addEventListener('pointerdown', (e) => {
    if (!ativo() || foraDoGesto(e.target as HTMLElement)) return;
    dedos.set(e.pointerId, ponto(e));
    if (dedos.size === 1) arrasto = { ...ponto(e), vx: vista.x, vy: vista.y, andou: false };
    if (dedos.size === 2) {
      const [a, b] = [...dedos.values()] as [{ x: number; y: number }, { x: number; y: number }];
      pinca = { distancia: Math.hypot(a.x - b.x, a.y - b.y), zoom: vista.zoom };
      arrasto = undefined;
    }
  });
  window.addEventListener('pointermove', (e) => {
    if (!dedos.has(e.pointerId)) return;
    dedos.set(e.pointerId, ponto(e));
    if (pinca && dedos.size === 2) {
      const [a, b] = [...dedos.values()] as [{ x: number; y: number }, { x: number; y: number }];
      zoomEm((pinca.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinca.distancia, (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    if (!arrasto) return;
    const p = ponto(e);
    if (Math.abs(p.x - arrasto.x) + Math.abs(p.y - arrasto.y) > 5) arrasto.andou = true;
    if (!arrasto.andou) return;
    mapa.classList.add('mapa--arrastando');
    vista.x = arrasto.vx + p.x - arrasto.x;
    vista.y = arrasto.vy + p.y - arrasto.y;
    aplicar();
  });
  const soltar = (e: PointerEvent) => {
    if (!dedos.delete(e.pointerId)) return;
    if (arrasto?.andou || pinca) fimDoArrasto = Date.now();
    if (dedos.size < 2) pinca = undefined;
    if (dedos.size === 0) arrasto = undefined;
    mapa.classList.remove('mapa--arrastando');
  };
  mapa.addEventListener('dragstart', (e) => e.preventDefault());
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);

  // Rolar move o mapa. Com Ctrl (ou a pinça do trackpad), aproxima e afasta.
  mapa.addEventListener(
    'wheel',
    (e) => {
      if (!ativo() || (e.target as HTMLElement).closest('[data-sobre-o-mapa]')) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const p = ponto(e);
        zoomEm(vista.zoom * Math.exp(-e.deltaY * 0.01), p.x, p.y);
      } else mover(-e.deltaX, -e.deltaY);
    },
    { passive: false },
  );

  // Teclado, com o foco no próprio mapa: setas movem, + e − aproximam
  mapa.addEventListener('keydown', (e) => {
    if (!ativo() || e.target !== mapa) return;
    const passo = 80;
    const movimentos: Record<string, [number, number]> = { ArrowLeft: [passo, 0], ArrowRight: [-passo, 0], ArrowUp: [0, passo], ArrowDown: [0, -passo] };
    const movimento = movimentos[e.key];
    if (movimento) {
      e.preventDefault();
      mover(movimento[0], movimento[1], true);
    } else if (e.key === '+' || e.key === '=') zoomEm(vista.zoom * 1.2, mapa.clientWidth / 2, mapa.clientHeight / 2, true);
    else if (e.key === '-') zoomEm(vista.zoom / 1.2, mapa.clientWidth / 2, mapa.clientHeight / 2, true);
  });
  // A caixa do mapa nunca rola: quem anda é a vista
  mapa.addEventListener('scroll', () => {
    if (!ativo()) return;
    if (mapa.scrollLeft) mapa.scrollLeft = 0;
    if (mapa.scrollTop) mapa.scrollTop = 0;
  });

  return {
    vista,
    ir(nova, animado = false) {
      Object.assign(vista, nova);
      aplicar(animado);
    },
    mover,
    zoomEm,
    acabouDeArrastar: () => Date.now() - fimDoArrasto < 300,
  };
}

/**
 * O que sobra do mapa para o desenho: ao lado do painel (tela grande) ou abaixo dele (celular), e
 * acima da barra de baixo. A mesma conta do mapa da árvore.
 */
export function areaLivreDoMapa(mapa: HTMLElement, painel: HTMLElement | null, barra: HTMLElement | null): Area {
  const livre: Area = { x: 0, y: 0, w: mapa.clientWidth, h: mapa.clientHeight };
  const m = mapa.getBoundingClientRect();
  const b = barra?.getBoundingClientRect();
  if (b && b.height) livre.h = Math.min(livre.h, b.top - m.top);
  if (!painel) return livre;
  const q = painel.getBoundingClientRect();
  if (q.width < m.width * 0.6) {
    livre.x = q.right - m.left;
    livre.w = m.width - livre.x;
  } else if (q.top - m.top < m.height / 2) {
    const pe = q.bottom - m.top;
    if (livre.h - pe > m.height * 0.4) {
      livre.y = pe;
      livre.h -= pe;
    }
  }
  return livre;
}
