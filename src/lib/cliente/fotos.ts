// Roda no navegador. Reduz a foto antes de enviar: fotos de celular chegam
// com vários megabytes, e o site não precisa de mais que isso para exibir bem.
// Os originais continuam onde estavam (iCloud, celular).
//
// No envio, o navegador também faz as duas cópias menores (sessão D1b, src/lib/copias-das-fotos.ts): a
// pequena e a média, em WebP onde o navegador sabe gerar e em JPEG onde não sabe (o Safari do iPhone).
// Elas sobem junto com a foto. Se algo der errado com as cópias, a foto sobe sozinha e a tela usa a original.
import { QUALIDADE_DA_COPIA, TAMANHOS, medidaDaCopia, type FormatoDaCopia, type Tamanho } from '../copias-das-fotos';

const LADO_MAXIMO = 2400;
const QUALIDADE = 0.85;

type Fonte = ImageBitmap | HTMLCanvasElement;

/** Desenha a fonte numa tela nova de largura × altura, com a redução de melhor qualidade do navegador. */
function desenhar(fonte: Fonte, largura: number, altura: number): HTMLCanvasElement {
  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  const contexto = tela.getContext('2d')!;
  contexto.imageSmoothingQuality = 'high';
  contexto.drawImage(fonte, 0, 0, largura, altura);
  return tela;
}

const paraBlob = (tela: HTMLCanvasElement, tipo: string, qualidade: number) => new Promise<Blob | null>((resolver) => tela.toBlob(resolver, tipo, qualidade));

/**
 * As duas cópias, a partir da foto já reduzida. WebP quando o navegador gera WebP de verdade (o Safari
 * devolve PNG quando não sabe: aí vai JPEG). A pequena sai da média, que fica mais nítida que reduzir de
 * uma vez só.
 */
export async function fazerCopias(fonte: Fonte): Promise<{ formato: FormatoDaCopia; pequena: Blob; media: Blob } | null> {
  try {
    const telas = {} as Record<Tamanho, HTMLCanvasElement>;
    let anterior: Fonte = fonte;
    for (const tamanho of [...TAMANHOS].reverse()) {
      const [largura, altura] = medidaDaCopia(fonte.width, fonte.height, tamanho);
      telas[tamanho] = desenhar(anterior, largura, altura);
      anterior = telas[tamanho];
    }
    let formato: FormatoDaCopia = 'webp';
    let media = await paraBlob(telas.media, 'image/webp', QUALIDADE_DA_COPIA.webp);
    if (media?.type !== 'image/webp') {
      formato = 'jpg';
      media = await paraBlob(telas.media, 'image/jpeg', QUALIDADE_DA_COPIA.jpg);
    }
    const pequena = await paraBlob(telas.pequena, formato === 'webp' ? 'image/webp' : 'image/jpeg', QUALIDADE_DA_COPIA[formato]);
    return media && pequena ? { formato, pequena, media } : null;
  } catch {
    return null;
  }
}

/** A foto reduzida para guardar e, quando deu, as duas cópias. */
export async function prepararFotoComCopias(arquivo: Blob): Promise<{ foto: Blob; copias: Awaited<ReturnType<typeof fazerCopias>> }> {
  try {
    // "from-image" respeita a rotação gravada pela câmera
    const imagem = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
    const tela = desenhar(imagem, Math.round(imagem.width * escala), Math.round(imagem.height * escala));
    imagem.close();
    const reduzida = await paraBlob(tela, 'image/jpeg', QUALIDADE);
    if (reduzida) return { foto: reduzida, copias: await fazerCopias(tela) };
  } catch {
    // Navegador não conseguiu abrir a imagem: tenta enviar como está
  }
  return { foto: arquivo, copias: null };
}

/**
 * Reduz a foto, faz as cópias e manda tudo para /api/fotos. Usada por todo lugar que envia foto: a nova
 * memória, "Acrescentar fotos" e a foto no relato. Devolve o que o site respondeu e a foto reduzida, para a
 * tela mostrar sem baixar de novo.
 */
export async function enviarFoto(arquivo: File, recadoDaFalha = 'Falha no envio'): Promise<{ id: number; src: string; pronta: Blob }> {
  const { foto, copias } = await prepararFotoComCopias(arquivo);
  const corpo = new FormData();
  corpo.set('foto', foto, 'foto');
  if (copias) {
    corpo.set('pequena', copias.pequena, `pequena.${copias.formato}`);
    corpo.set('media', copias.media, `media.${copias.formato}`);
  }
  const resposta = await fetch('/api/fotos', { method: 'POST', body: corpo });
  const dados = (await resposta.json()) as { id: number; src: string; erro?: string };
  if (!resposta.ok) throw new Error(dados.erro ?? recadoDaFalha);
  return { id: dados.id, src: dados.src, pronta: foto };
}

/** Uma foto na lista do formulário: o id dela no banco, a legenda e o endereço para mostrar. */
export interface FotoNoFormulario {
  id: number;
  src: string;
  legenda: string | null;
}

/**
 * O passo "Fotos" de um formulário que não é o da memória (hoje, o do relato: "Fotos pelo relato", em
 * docs/regras/relatos.md). Escolher, ver cada foto, escrever a legenda e remover antes de salvar. Cada foto é
 * reduzida no aparelho, com as cópias, e sobe na hora por /api/fotos, solta; quem prende à memória é quem salva.
 */
export function ligarFotos(caixa: HTMLElement, aoMudar: () => void = () => {}) {
  const lista = caixa.querySelector<HTMLUListElement>('[data-fotos]')!;
  const entrada = caixa.querySelector<HTMLInputElement>('[data-escolher-fotos]')!;
  const situacao = caixa.querySelector<HTMLElement>('[data-situacao-fotos]');

  const item = (legenda: string | null) => {
    const li = document.createElement('li');
    li.className = 'foto-enviada';
    li.innerHTML = `
      <div class="foto__papel"><div class="foto__reserva">Enviando…</div></div>
      <div class="foto-enviada__campos">
        <label class="campo"><span>Legenda</span><input type="text" data-legenda maxlength="200" /></label>
        <button type="button" class="botao botao--leve" data-remover>Remover foto</button>
      </div>`;
    li.querySelector<HTMLInputElement>('[data-legenda]')!.value = legenda ?? '';
    return li;
  };
  const mostrar = (li: HTMLElement, src: string) => {
    const imagem = new Image();
    imagem.alt = '';
    imagem.src = src;
    li.querySelector('.foto__reserva')?.replaceWith(imagem);
  };

  lista.addEventListener('click', (evento) => {
    const alvo = (evento.target as HTMLElement).closest('[data-remover]');
    if (!alvo) return;
    alvo.closest('.foto-enviada')?.remove();
    if (situacao) situacao.textContent = 'Foto removida. Ela sai da memória quando você salvar.';
    aoMudar();
  });

  entrada.addEventListener('change', async () => {
    const arquivos = [...(entrada.files ?? [])];
    entrada.value = '';
    for (const arquivo of arquivos) {
      const li = item(null);
      li.dataset.estado = 'enviando';
      lista.append(li);
      aoMudar();
      try {
        const { id, pronta } = await enviarFoto(arquivo);
        li.dataset.fotoId = String(id);
        li.dataset.estado = 'pronta';
        mostrar(li, URL.createObjectURL(pronta));
      } catch (e) {
        li.dataset.estado = 'erro';
        li.querySelector('.foto__reserva')!.textContent = `Não foi possível enviar. ${e instanceof Error ? e.message : ''}`;
      }
      aoMudar();
    }
  });

  return {
    /** Põe na lista as fotos que já vieram com o relato. */
    carregar(fotos: FotoNoFormulario[]) {
      lista.replaceChildren(
        ...fotos.map((f) => {
          const li = item(f.legenda);
          li.dataset.fotoId = String(f.id);
          li.dataset.estado = 'pronta';
          mostrar(li, f.src);
          return li;
        }),
      );
      if (situacao) situacao.textContent = '';
    },
    /** As fotos prontas, na ordem, com a legenda: o que vai para /api/relatos. */
    lista() {
      return [...lista.querySelectorAll<HTMLElement>('.foto-enviada[data-estado="pronta"]')].map((li) => ({
        id: Number(li.dataset.fotoId),
        legenda: li.querySelector<HTMLInputElement>('[data-legenda]')!.value.trim() || undefined,
      }));
    },
    /** Alguma foto ainda subindo. */
    ocupado() {
      return Boolean(lista.querySelector('.foto-enviada[data-estado="enviando"]'));
    },
    /** Para guardar no rascunho: as fotos com o endereço que a tela já mostra. */
    atuais(): FotoNoFormulario[] {
      return [...lista.querySelectorAll<HTMLElement>('.foto-enviada[data-estado="pronta"]')].map((li) => ({
        id: Number(li.dataset.fotoId),
        src: li.querySelector('img')?.getAttribute('src') ?? '',
        legenda: li.querySelector<HTMLInputElement>('[data-legenda]')!.value.trim() || null,
      }));
    },
  };
}
