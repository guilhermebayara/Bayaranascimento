// Desenha a memória como imagem, no navegador (src/lib/compartilhar.ts): a foto revelada no alto, o título,
// a data e o trecho do relato, com o monograma como marca d'água leve, atrás, de enfeite (observação do
// Gui, 18/11/2026: a assinatura com o nome do site saiu, e o nome de quem contou não passa mais por cima
// de nada). As cores e as fontes vêm do próprio site (as
// variáveis do CSS e as fontes já carregadas), para a imagem ter a cara do acervo. Depois, "Compartilhar"
// usa o compartilhamento do aparelho; onde ele não existe, "Baixar a imagem".
import { TAMANHO_DA_IMAGEM, nomeDoArquivo } from '../compartilhar';

export interface DadosDaImagem {
  titulo: string;
  data: string;
  lugar: string | null;
  foto: string | null;
  trecho: string | null;
  autorDoTrecho: string | null;
  /**
   * Os nomes com o apelido de quem compartilha ("O seu apelido"), quando a escolha muda algo. O padrão é
   * o da família, que já está nos campos de cima (decisão do Gui, 18/11/2026; src/lib/compartilhar.ts).
   */
  comOSeuApelido?: { autorDoTrecho: string | null } | null;
  /** o M da serifa em uso (src/visual/monograma.ts), numa caixa de altura 100 */
  monograma: { d: string; largura: number; altura: number };
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

export async function desenharImagem(canvas: HTMLCanvasElement, d: DadosDaImagem): Promise<void> {
  const { largura: L, altura: A } = TAMANHO_DA_IMAGEM;
  canvas.width = L;
  canvas.height = A;
  const ctx = canvas.getContext('2d')!;
  await document.fonts.ready;
  const [papel, tinta, suave, branco, vivo] = [cor('--papel', '#f8f1e7'), cor('--tinta', '#2a211b'), cor('--tinta-suave', '#6b5f55'), cor('--branco', '#fffdf8'), cor('--vivo', '#d98b2b')];
  const [serifa, grotesca, mao] = await Promise.all([fonte('--serifa', 'serif'), fonte('--grotesca', 'sans-serif'), fonte('--mao', 'cursive')]);
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
    // O trecho e o nome de quem contou cabem até a margem de baixo: o trecho perde linhas, nunca sobrepõe
    const limite = A - margem;
    const espacoDoNome = d.autorDoTrecho ? 90 : 0;
    const cabem = linhasQueCabem(y, limite, 54, espacoDoNome);
    ctx.fillStyle = tinta;
    ctx.font = `40px ${grotesca}`;
    for (const l of cabem ? linhas(ctx, `“${d.trecho}”`, L - margem * 2, cabem) : []) {
      ctx.fillText(l, margem, y);
      y += 54;
    }
    if (d.autorDoTrecho) {
      ctx.fillStyle = suave;
      ctx.font = `64px ${mao}`;
      ctx.fillText(d.autorDoTrecho, margem, Math.min(y + 16, limite));
    }
  }
}

/** Liga a página: desenha, mostra a prévia e oferece compartilhar ou baixar. */
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
  // Monta a imagem com os dados de agora. A escolha do nome monta de novo, no lugar; numa troca rápida,
  // só a última montagem vale
  const montar = async (dados: DadosDaImagem): Promise<boolean> => {
    const minha = ++vez;
    await desenharImagem(canvas, dados);
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
    baixar.download = nomeDoArquivo(dados.titulo);
    baixar.hidden = false;
    estado.textContent = '';
    atual.arquivo = new File([blob], nomeDoArquivo(dados.titulo), { type: 'image/png' });
    return true;
  };
  const escolhas = [...raiz.querySelectorAll<HTMLInputElement>('input[name="nomeNaImagem"]')];
  // O nome escolhido: o da família, a não ser que a pessoa tenha escolhido o seu apelido
  const comAEscolha = (): DadosDaImagem => (escolhas.find((e) => e.checked)?.value === 'meu' && d.comOSeuApelido ? { ...d, ...d.comOSeuApelido } : d);
  const mostrarFrase = () => {
    const valor = escolhas.find((e) => e.checked)?.value ?? 'familia';
    for (const frase of raiz.querySelectorAll<HTMLElement>('[data-frase-do-nome]')) frase.hidden = frase.dataset.fraseDoNome !== valor;
  };
  mostrarFrase();
  // Qual nome usar: o da família (o padrão) ou o seu apelido. Trocar monta a imagem de novo, no lugar
  for (const escolha of escolhas) {
    escolha.addEventListener('change', () => {
      mostrarFrase();
      void montar(comAEscolha());
    });
  }
  if (!(await montar(comAEscolha()))) return;
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
