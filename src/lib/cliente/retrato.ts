// Roda no navegador. A foto de retrato da ficha: a pessoa escolhe uma foto, enquadra o rosto num
// quadrado (arrastar e "Aproximar") e confere como vai ficar. O navegador recorta e reduz para
// LADO_DO_RETRATO antes de enviar, como já faz com as fotos de memória. O arquivo recortado vai junto
// com a ficha, quando ela é salva; até lá nada é enviado.
import {
  LADO_DO_RETRATO,
  QUALIDADE_DO_RETRATO,
  ZOOM_MAXIMO,
  ajustarEnquadramento,
  aproximar,
  quadroDoRetrato,
  enquadramentoInicial,
  escalaDoEnquadramento,
  recorteDaFoto,
  type Enquadramento,
} from '../retratos';

const PASSO_DAS_SETAS = 12;

export function ligarRetrato(raiz: HTMLElement): void {
  const escolher = raiz.querySelector<HTMLInputElement>('[data-escolher-retrato]')!;
  const rotuloEscolher = raiz.querySelector<HTMLElement>('[data-escolher-retrato-texto]')!;
  const tirar = raiz.querySelector<HTMLButtonElement>('[data-tirar-retrato]')!;
  const arquivo = raiz.querySelector<HTMLInputElement>('[data-retrato-arquivo]')!;
  const campoTirar = raiz.querySelector<HTMLInputElement>('[data-tirar-retrato-campo]')!;
  const atual = raiz.querySelector<HTMLElement>('[data-retrato-atual]')!;
  const recado = raiz.querySelector<HTMLElement>('[data-retrato-recado]')!;
  const recorte = raiz.querySelector<HTMLElement>('[data-recorte]')!;
  const quadro = raiz.querySelector<HTMLCanvasElement>('[data-recorte-quadro]')!;
  const zoom = raiz.querySelector<HTMLInputElement>('[data-recorte-zoom]')!;
  const usar = raiz.querySelector<HTMLButtonElement>('[data-recorte-usar]')!;
  const cancelar = raiz.querySelector<HTMLButtonElement>('[data-recorte-cancelar]')!;

  const tinhaRetrato = Boolean(atual.querySelector('img'));
  const iniciais = atual.dataset.iniciais ?? '';
  const recadoInicial = recado.textContent ?? '';
  zoom.max = String(ZOOM_MAXIMO);

  let foto: ImageBitmap | null = null;
  let enquadramento: Enquadramento = { zoom: 1, x: 0, y: 0 };
  let lado = 0;

  const mostrar = (conteudo: { src: string } | null) => {
    if (conteudo) atual.replaceChildren(Object.assign(new Image(), { src: conteudo.src, alt: '' }));
    else atual.replaceChildren(Object.assign(document.createElement('span'), { textContent: iniciais }));
    atual.firstElementChild!.setAttribute('aria-hidden', 'true');
    const temFoto = Boolean(conteudo);
    rotuloEscolher.textContent = temFoto ? 'Trocar foto' : 'Escolher foto';
    tirar.hidden = !temFoto;
  };

  const desenhar = () => {
    if (!foto) return;
    const contexto = quadro.getContext('2d')!;
    const densidade = quadro.width / lado;
    contexto.setTransform(densidade, 0, 0, densidade, 0, 0);
    contexto.clearRect(0, 0, lado, lado);
    const escala = escalaDoEnquadramento(foto.width, foto.height, lado, enquadramento.zoom);
    contexto.drawImage(foto, enquadramento.x, enquadramento.y, foto.width * escala, foto.height * escala);
    // Por cima, o retângulo em que o retrato aparece no site: o que fica de fora sai mais apagado
    const q = quadroDoRetrato(lado);
    const estilo = getComputedStyle(quadro);
    const contorno = new Path2D();
    contorno.rect(q.x, q.y, q.largura, q.altura);
    const fora = new Path2D();
    fora.rect(0, 0, lado, lado);
    fora.addPath(contorno);
    contexto.save();
    contexto.globalAlpha = 0.72;
    contexto.fillStyle = estilo.getPropertyValue('--papel').trim() || estilo.backgroundColor;
    contexto.fill(fora, 'evenodd');
    contexto.restore();
    // As cantoneiras do álbum, nos quatro cantos, como no site
    contexto.fillStyle = estilo.getPropertyValue('--tinta').trim() || estilo.color;
    const c = q.cantoneira;
    for (const [x, y, dx, dy] of [
      [q.x, q.y, 1, 1],
      [q.x + q.largura, q.y, -1, 1],
      [q.x, q.y + q.altura, 1, -1],
      [q.x + q.largura, q.y + q.altura, -1, -1],
    ] as const) {
      contexto.beginPath();
      contexto.moveTo(x, y);
      contexto.lineTo(x + dx * c, y);
      contexto.lineTo(x, y + dy * c);
      contexto.closePath();
      contexto.fill();
    }
  };

  const mover = (dx: number, dy: number) => {
    if (!foto) return;
    enquadramento = ajustarEnquadramento(foto.width, foto.height, lado, { ...enquadramento, x: enquadramento.x + dx, y: enquadramento.y + dy });
    desenhar();
  };

  const mudarZoom = (valor: number) => {
    if (!foto) return;
    enquadramento = aproximar(foto.width, foto.height, lado, enquadramento, valor);
    zoom.value = String(enquadramento.zoom);
    desenhar();
  };

  const fecharRecorte = () => {
    recorte.hidden = true;
    foto?.close();
    foto = null;
  };

  escolher.addEventListener('change', async () => {
    const escolhido = escolher.files?.[0];
    escolher.value = '';
    if (!escolhido) return;
    try {
      // "from-image" respeita a rotação gravada pela câmera
      foto = await createImageBitmap(escolhido, { imageOrientation: 'from-image' });
    } catch {
      recado.textContent = 'Não foi possível abrir essa foto. Tente outra, em JPG ou PNG.';
      return;
    }
    recorte.hidden = false;
    lado = quadro.clientWidth || 280;
    quadro.width = quadro.height = Math.round(lado * (window.devicePixelRatio || 1));
    enquadramento = enquadramentoInicial(foto.width, foto.height, lado);
    zoom.value = '1';
    desenhar();
    quadro.focus();
  });

  // Arrastar com o dedo ou o mouse. Com dois dedos, aproxima.
  const toques = new Map<number, { x: number; y: number }>();
  let distanciaInicial = 0;
  let zoomInicial = 1;
  const distancia = () => {
    const [a, b] = [...toques.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  quadro.addEventListener('pointerdown', (evento) => {
    quadro.setPointerCapture(evento.pointerId);
    toques.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
    if (toques.size === 2) {
      distanciaInicial = distancia();
      zoomInicial = enquadramento.zoom;
    }
  });
  quadro.addEventListener('pointermove', (evento) => {
    const antes = toques.get(evento.pointerId);
    if (!antes) return;
    toques.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
    if (toques.size === 2 && distanciaInicial > 0) mudarZoom((zoomInicial * distancia()) / distanciaInicial);
    else if (toques.size === 1) mover(evento.clientX - antes.x, evento.clientY - antes.y);
  });
  const soltar = (evento: PointerEvent) => {
    toques.delete(evento.pointerId);
    distanciaInicial = 0;
  };
  quadro.addEventListener('pointerup', soltar);
  quadro.addEventListener('pointercancel', soltar);

  // Teclado: as setas movem a foto; + e − aproximam e afastam
  quadro.addEventListener('keydown', (evento) => {
    const setas: Record<string, [number, number]> = {
      ArrowLeft: [PASSO_DAS_SETAS, 0],
      ArrowRight: [-PASSO_DAS_SETAS, 0],
      ArrowUp: [0, PASSO_DAS_SETAS],
      ArrowDown: [0, -PASSO_DAS_SETAS],
    };
    const seta = setas[evento.key];
    if (seta) mover(...seta);
    else if (evento.key === '+' || evento.key === '=') mudarZoom(enquadramento.zoom + 0.1);
    else if (evento.key === '-') mudarZoom(enquadramento.zoom - 0.1);
    else return;
    evento.preventDefault();
  });

  zoom.addEventListener('input', () => mudarZoom(Number(zoom.value)));

  cancelar.addEventListener('click', () => {
    fecharRecorte();
    escolher.focus();
  });

  usar.addEventListener('click', async () => {
    if (!foto) return;
    const pedaco = recorteDaFoto(foto.width, foto.height, lado, enquadramento);
    const saida = Math.min(LADO_DO_RETRATO, Math.round(pedaco.lado));
    const tela = document.createElement('canvas');
    tela.width = tela.height = saida;
    tela.getContext('2d')!.drawImage(foto, pedaco.x, pedaco.y, pedaco.lado, pedaco.lado, 0, 0, saida, saida);
    const pronto = await new Promise<Blob | null>((resolver) => tela.toBlob(resolver, 'image/jpeg', QUALIDADE_DO_RETRATO));
    try {
      if (!pronto) throw new Error();
      const transferencia = new DataTransfer();
      transferencia.items.add(new File([pronto], 'retrato.jpg', { type: 'image/jpeg' }));
      arquivo.files = transferencia.files;
    } catch {
      recado.textContent = 'Este navegador não conseguiu preparar a foto. Tente em outro navegador.';
      return;
    }
    campoTirar.value = '';
    mostrar({ src: URL.createObjectURL(pronto) });
    recado.textContent = 'Assim vai ficar. A foto entra quando você salvar a página.';
    fecharRecorte();
    escolher.focus();
  });

  // "Remover foto" deixa a pessoa sem foto ao salvar: a que já estava sai (o arquivo continua guardado),
  // e a que ainda não foi salva é esquecida
  tirar.addEventListener('click', () => {
    arquivo.value = '';
    campoTirar.value = tinhaRetrato ? '1' : '';
    mostrar(null);
    recado.textContent = tinhaRetrato ? 'A foto sai quando você salvar a página.' : recadoInicial;
    escolher.focus();
  });
}
