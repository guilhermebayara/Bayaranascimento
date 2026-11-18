// Desenha a memória como imagem, no navegador (src/lib/compartilhar.ts): a foto revelada no alto, o título,
// a data e o trecho do relato, com o monograma como marca d'água leve, atrás, de enfeite (observação do
// Gui, 18/11/2026: a assinatura com o nome do site saiu, e o nome de quem contou não passa mais por cima
// de nada). As cores e as fontes vêm do próprio site (as
// variáveis do CSS e as fontes já carregadas), para a imagem ter a cara do acervo. Depois, "Compartilhar"
// usa o compartilhamento do aparelho; onde ele não existe, "Baixar a imagem".
import { TAMANHO_DA_IMAGEM, autorNaImagem, escolhaDoNome, nomeDoArquivo, type CoresDaImagem, type RelatoDaImagem } from '../compartilhar';

/** O que a página manda: a memória, as fotos e os relatos que quem compartilha pode pôr na imagem. */
export interface DadosDaImagem {
  titulo: string;
  data: string;
  lugar: string | null;
  /** as fotos da memória, a principal primeiro */
  fotos: string[];
  /** os relatos publicados que a pessoa vê, o dela primeiro */
  relatos: RelatoDaImagem[];
  /** o M da serifa em uso (src/visual/monograma.ts), numa caixa de altura 100 */
  monograma: { d: string; largura: number; altura: number };
}

/** A imagem de agora, com as escolhas do espaço de personalizar já resolvidas. */
export interface QuadroDaImagem {
  titulo: string;
  data: string;
  lugar: string | null;
  foto: string | null;
  trecho: string | null;
  autorDoTrecho: string | null;
  /** o retrato de quem contou, ao lado do nome: em cor, a não ser que a pessoa peça "em memória" */
  retrato: string | null;
  emMemoria: boolean;
  /** o esquema de cores escolhido; sem ele, as cores da página */
  cores: { papel: string; vivo: string; suave: string } | null;
  monograma: DadosDaImagem['monograma'];
}

/** Quantas linhas do trecho cabem entre `y` e o limite, guardando o lugar do nome de quem contou. */
export function linhasQueCabem(y: number, limite: number, alturaDaLinha: number, espacoDoNome: number, maximo = 4): number {
  return Math.max(0, Math.min(maximo, Math.floor((limite - espacoDoNome - y) / alturaDaLinha) + 1));
}

const cor = (nome: string, reserva: string) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || reserva;
/** A família de fonte de um papel do site (--serifa, --grotesca, --mao), já carregada para o desenho. */
const fonte = async (papel: string, reserva: string) => {
  const familia = getComputedStyle(document.documentElement).getPropertyValue(papel).trim() || reserva;
  try {
    await document.fonts.load(`40px ${familia}`, 'Memórias');
  } catch {
    // sem a fonte, vale a reserva do próprio navegador
  }
  return familia;
};

/** Quebra o texto em linhas que cabem na largura, até `maximo` linhas (a última com reticências). */
function linhas(ctx: CanvasRenderingContext2D, texto: string, largura: number, maximo: number): string[] {
  const palavras = texto.split(' ');
  const saida: string[] = [];
  let atual = '';
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(tentativa).width <= largura) atual = tentativa;
    else {
      if (atual) saida.push(atual);
      atual = p;
    }
  }
  if (atual) saida.push(atual);
  if (saida.length > maximo) {
    const cortadas = saida.slice(0, maximo);
    cortadas[maximo - 1] = `${cortadas[maximo - 1]!.replace(/[,;:.]?$/, '')}…`;
    return cortadas;
  }
  return saida;
}

const carregar = (src: string) =>
  new Promise<HTMLImageElement | null>((resolver) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => resolver(null);
    img.src = src;
  });

export async function desenharImagem(canvas: HTMLCanvasElement, d: QuadroDaImagem): Promise<void> {
  const { largura: L, altura: A } = TAMANHO_DA_IMAGEM;
  canvas.width = L;
  canvas.height = A;
  const ctx = canvas.getContext('2d')!;
  await document.fonts.ready;
  const [tinta, branco] = [cor('--tinta', '#2a211b'), cor('--branco', '#fffdf8')];
  const papel = d.cores?.papel || cor('--papel', '#f8f1e7');
  const suave = d.cores?.suave || cor('--tinta-suave', '#6b5f55');
  const vivo = d.cores?.vivo || cor('--vivo', '#d98b2b');
  const [serifa, grotesca, mao, mono] = await Promise.all([fonte('--serifa', 'serif'), fonte('--grotesca', 'sans-serif'), fonte('--mao', 'cursive'), fonte('--mono', 'monospace')]);
  const margem = 96;

  ctx.fillStyle = papel;
  ctx.fillRect(0, 0, L, A);

  // O monograma, atrás de tudo, grande e leve, saindo pelo canto de baixo: enfeite, não assinatura
  const m = d.monograma;
  const escala = (A * 0.42) / m.altura;
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = vivo;
  ctx.translate(L - m.largura * escala * 0.78, A - m.altura * escala * 0.82);
  ctx.scale(escala, escala);
  ctx.fill(new Path2D(m.d));
  ctx.restore();

  // A foto revelada: a moldura branca, levemente torta, com a foto quadrada dentro
  const lado = L - margem * 2 - 40;
  const foto = d.foto ? await carregar(d.foto) : null;
  ctx.save();
  ctx.translate(L / 2, margem + 40 + (lado + 160) / 2);
  ctx.rotate((-1.6 * Math.PI) / 180);
  ctx.shadowColor = 'rgba(40, 30, 20, 0.18)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = branco;
  ctx.fillRect(-(lado + 60) / 2, -(lado + 160) / 2, lado + 60, lado + 160);
  ctx.shadowColor = 'transparent';
  if (foto) {
    const s = Math.min(foto.naturalWidth, foto.naturalHeight);
    ctx.drawImage(foto, (foto.naturalWidth - s) / 2, (foto.naturalHeight - s) / 2, s, s, -lado / 2, -(lado + 160) / 2 + 30, lado, lado);
  } else {
    ctx.fillStyle = cor('--pastel', '#f3e3c3');
    ctx.fillRect(-lado / 2, -(lado + 160) / 2 + 30, lado, lado);
  }
  // A legenda da foto, à mão, como no verso
  ctx.fillStyle = suave;
  ctx.font = `54px ${mao}`;
  ctx.textAlign = 'center';
  ctx.fillText([d.lugar, d.data.match(/\d{4}/)?.[0]].filter(Boolean).join(', '), 0, (lado + 160) / 2 - 50);
  ctx.restore();

  // O título, a data e o trecho
  let y = margem + 40 + lado + 160 + 170;
  ctx.textAlign = 'left';
  ctx.fillStyle = tinta;
  ctx.font = `84px ${serifa}`;
  for (const l of linhas(ctx, d.titulo, L - margem * 2, 2)) {
    ctx.fillText(l, margem, y);
    y += 92;
  }
  ctx.fillStyle = suave;
  ctx.font = `36px ${grotesca}`;
  ctx.fillText(d.data, margem, y - 20);
  y += 50;
  if (d.trecho) {
    // O trecho e o nome de quem contou cabem até a margem de baixo: o trecho perde linhas, nunca sobrepõe.
    // Com o retrato de quem contou, o pé da imagem é mais alto
    const limite = A - margem;
    const retrato = d.autorDoTrecho && d.retrato ? await carregar(d.retrato) : null;
    const espacoDoNome = !d.autorDoTrecho ? 0 : retrato ? RETRATO.altura + 40 : 90;
    const cabem = linhasQueCabem(y, limite, 54, espacoDoNome);
    ctx.fillStyle = tinta;
    ctx.font = `40px ${grotesca}`;
    for (const l of cabem ? linhas(ctx, `“${d.trecho}”`, L - margem * 2, cabem) : []) {
      ctx.fillText(l, margem, y);
      y += 54;
    }
    if (d.autorDoTrecho && retrato) {
      // O retrato de foto de álbum de quem contou, com o nome à mão ao lado
      const topo = Math.min(y, limite - RETRATO.altura);
      desenharRetrato(ctx, retrato, margem, topo, d.emMemoria, tinta);
      const x = margem + RETRATO.largura + 36;
      ctx.fillStyle = suave;
      ctx.font = `64px ${mao}`;
      ctx.fillText(d.autorDoTrecho, x, topo + RETRATO.altura / 2 + (d.emMemoria ? 4 : 22));
      if (d.emMemoria) {
        ctx.font = `24px ${mono}`;
        ctx.fillText('EM MEMÓRIA'.split('').join(' '), x, topo + RETRATO.altura / 2 + 52);
      }
    } else if (d.autorDoTrecho) {
      ctx.fillStyle = suave;
      ctx.font = `64px ${mao}`;
      ctx.fillText(d.autorDoTrecho, margem, Math.min(y + 16, limite));
    }
  }
}

/** O retrato de quem contou na imagem: 4 por 5, como no site */
const RETRATO = { largura: 132, altura: 165, cantoneira: 22, passa: 4 } as const;

/**
 * O retrato de foto de álbum, desenhado na imagem: a foto reta, com as cantoneiras nos quatro cantos.
 * Vai em cor; "em memória" (opção de quem compartilha) deixa a foto em tom suave, como no site. O tom é
 * feito ponto a ponto, porque o filtro do canvas não existe em todo navegador.
 */
function desenharRetrato(ctx: CanvasRenderingContext2D, foto: HTMLImageElement, x: number, y: number, suave: boolean, tinta: string): void {
  const { largura, altura, cantoneira: c, passa } = RETRATO;
  // O recorte do site: a largura ou a altura toda, com o rosto um pouco acima do meio
  const escala = Math.max(largura / foto.naturalWidth, altura / foto.naturalHeight);
  const [lf, af] = [largura / escala, altura / escala];
  const apoio = document.createElement('canvas');
  apoio.width = largura;
  apoio.height = altura;
  const a = apoio.getContext('2d')!;
  a.drawImage(foto, (foto.naturalWidth - lf) / 2, (foto.naturalHeight - af) * 0.3, lf, af, 0, 0, largura, altura);
  if (suave) {
    const pontos = a.getImageData(0, 0, largura, altura);
    const p = pontos.data;
    for (let i = 0; i < p.length; i += 4) {
      const cinza = 0.2126 * p[i]! + 0.7152 * p[i + 1]! + 0.0722 * p[i + 2]!;
      for (let k = 0; k < 3; k++) p[i + k] = Math.min(255, ((cinza + (p[i + k]! - cinza) * 0.22 - 128) * 0.86 + 128) * 1.1);
    }
    a.putImageData(pontos, 0, 0);
  }
  ctx.drawImage(apoio, x, y);
  ctx.fillStyle = tinta;
  for (const [cx, cy, dx, dy] of [
    [x - passa, y - passa, 1, 1],
    [x + largura + passa, y - passa, -1, 1],
    [x - passa, y + altura + passa, 1, -1],
    [x + largura + passa, y + altura + passa, -1, -1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx * c, cy);
    ctx.lineTo(cx, cy + dy * c);
    ctx.closePath();
    ctx.fill();
  }
}

/** As escolhas do espaço de personalizar, lidas dos rádios da bandeja. */
export interface EscolhasDaImagem {
  nome: 'familia' | 'meu';
  cores: CoresDaImagem;
  foto: number;
  relato: number;
  emMemoria: boolean;
}

/** A imagem de agora: os dados da memória com as escolhas. O padrão é a foto principal, o primeiro relato e o nome da família. */
export function quadroDaImagem(d: DadosDaImagem, e: EscolhasDaImagem, cores: QuadroDaImagem['cores']): QuadroDaImagem {
  const relato = d.relatos[e.relato] ?? d.relatos[0] ?? null;
  return {
    titulo: d.titulo,
    data: d.data,
    lugar: d.lugar,
    foto: d.fotos[e.foto] ?? d.fotos[0] ?? null,
    trecho: relato?.trecho ?? null,
    autorDoTrecho: relato ? autorNaImagem(relato, e.nome) : null,
    retrato: relato?.retrato ?? null,
    emMemoria: Boolean(relato?.faleceu && e.emMemoria),
    cores,
    monograma: d.monograma,
  };
}

/** Liga a página: desenha, mostra a prévia, acompanha as escolhas e oferece compartilhar ou baixar. */
export async function ligarCompartilhar(raiz: HTMLElement, d: DadosDaImagem): Promise<void> {
  const canvas = raiz.querySelector<HTMLCanvasElement>('canvas')!;
  const previa = raiz.querySelector<HTMLImageElement>('[data-previa]')!;
  const compartilhar = raiz.querySelector<HTMLButtonElement>('[data-compartilhar]')!;
  const baixar = raiz.querySelector<HTMLAnchorElement>('[data-baixar]')!;
  const estado = raiz.querySelector<HTMLElement>('[data-estado]')!;
  // O arquivo da imagem de agora, trocado a cada montagem
  const atual: { arquivo: File | null } = { arquivo: null };
  let endereco: string | null = null;
  let vez = 0;
  const marcado = (nome: string) => raiz.querySelector<HTMLInputElement>(`input[name="${nome}"]:checked`)?.value;
  const escolhas = (): EscolhasDaImagem => ({
    nome: escolhaDoNome(marcado('nomeNaImagem')),
    cores: (marcado('coresDaImagem') as CoresDaImagem | undefined) ?? 'papel',
    foto: Number(marcado('fotoDaImagem') ?? 0),
    relato: Number(marcado('relatoDaImagem') ?? 0),
    emMemoria: Boolean(raiz.querySelector<HTMLInputElement>('input[name="emMemoria"]')?.checked),
  });
  // As cores de um esquema vêm da amostra dele na bandeja, que já está pintada com os tokens do site
  const coresDe = (esquema: CoresDaImagem): QuadroDaImagem['cores'] => {
    const amostra = esquema === 'papel' ? null : raiz.querySelector<HTMLElement>(`[data-esquema="${esquema}"]`);
    if (!amostra) return null;
    const estilo = getComputedStyle(amostra);
    return { papel: estilo.getPropertyValue('--amostra-papel').trim(), vivo: estilo.getPropertyValue('--amostra-vivo').trim(), suave: cor('--tinta', '#2a211b') };
  };
  // A aba do nome acompanha o relato escolhido: os dois nomes de quem contou, e "em memória" só para quem faleceu
  const refletirNome = () => {
    const e = escolhas();
    const relato = d.relatos[e.relato] ?? d.relatos[0];
    if (!relato) return;
    for (const lugar of raiz.querySelectorAll<HTMLElement>('[data-nome-da-familia]')) lugar.textContent = relato.autor;
    for (const lugar of raiz.querySelectorAll<HTMLElement>('[data-nome-meu]')) lugar.textContent = relato.comOSeuApelido ?? relato.autor;
    const meu = raiz.querySelector<HTMLInputElement>('input[name="nomeNaImagem"][value="meu"]');
    if (meu) {
      meu.disabled = !relato.comOSeuApelido;
      if (meu.disabled && meu.checked) raiz.querySelector<HTMLInputElement>('input[name="nomeNaImagem"][value="familia"]')!.checked = true;
    }
    const memoria = raiz.querySelector<HTMLElement>('[data-em-memoria]');
    if (memoria) memoria.hidden = !(relato.faleceu && relato.retrato);
  };
  // Monta a imagem com as escolhas de agora, no lugar; numa troca rápida, só a última montagem vale
  const montar = async (): Promise<boolean> => {
    const minha = ++vez;
    refletirNome();
    const e = escolhas();
    await desenharImagem(canvas, quadroDaImagem(d, e, coresDe(e.cores)));
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (minha !== vez) return true;
    if (!blob) {
      estado.textContent = 'Não deu para montar a imagem neste aparelho.';
      return false;
    }
    if (endereco) URL.revokeObjectURL(endereco);
    endereco = URL.createObjectURL(blob);
    previa.src = endereco;
    previa.hidden = false;
    baixar.href = endereco;
    baixar.download = nomeDoArquivo(d.titulo);
    baixar.hidden = false;
    estado.textContent = '';
    atual.arquivo = new File([blob], nomeDoArquivo(d.titulo), { type: 'image/png' });
    return true;
  };
  // As abas trocam o painel, que tem a altura fixa: escolher não muda o tamanho de nada
  const abas = [...raiz.querySelectorAll<HTMLInputElement>('input[name="abaDaImagem"]')];
  const mostrarAba = () => {
    // Com uma aba só, não há abas: o único painel fica à vista
    const aberta = abas.find((a) => a.checked)?.value ?? raiz.querySelector<HTMLElement>('[data-painel]')?.dataset.painel;
    for (const painel of raiz.querySelectorAll<HTMLElement>('[data-painel]')) painel.hidden = painel.dataset.painel !== aberta;
  };
  mostrarAba();
  raiz.addEventListener('change', (e) => {
    if ((e.target as HTMLInputElement).name === 'abaDaImagem') return mostrarAba();
    void montar();
  });
  if (!(await montar())) return;
  const primeiro = atual.arquivo;
  if (primeiro && navigator.canShare?.({ files: [primeiro] })) {
    compartilhar.hidden = false;
    compartilhar.addEventListener('click', async () => {
      if (!atual.arquivo) return;
      try {
        await navigator.share({ files: [atual.arquivo], title: d.titulo });
      } catch {
        // quem desiste do compartilhamento não precisa de recado
      }
    });
  }
}
