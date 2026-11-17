// Roda no navegador. Reduz a foto antes de enviar: fotos de celular chegam
// com vários megabytes, e o site não precisa de mais que isso para exibir bem.
// Os originais continuam onde estavam (iCloud, celular).

const LADO_MAXIMO = 2400;
const QUALIDADE = 0.85;

export async function prepararFoto(arquivo: File): Promise<Blob> {
  try {
    // "from-image" respeita a rotação gravada pela câmera
    const imagem = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
    const largura = Math.round(imagem.width * escala);
    const altura = Math.round(imagem.height * escala);

    const tela = document.createElement('canvas');
    tela.width = largura;
    tela.height = altura;
    tela.getContext('2d')!.drawImage(imagem, 0, 0, largura, altura);
    imagem.close();

    const reduzida = await new Promise<Blob | null>((resolver) => tela.toBlob(resolver, 'image/jpeg', QUALIDADE));
    if (reduzida) return reduzida;
  } catch {
    // Navegador não conseguiu abrir a imagem: tenta enviar como está
  }
  return arquivo;
}

/** Uma foto na lista do formulário: o id dela no banco, a legenda e o endereço para mostrar. */
export interface FotoNoFormulario {
  id: number;
  src: string;
  legenda: string | null;
}

/**
 * O passo "Fotos" de um formulário que não é o da memória (hoje, o do relato: "Fotos pelo relato", em
 * docs/decisoes.md). Escolher, ver cada foto, escrever a legenda e remover antes de salvar. Cada foto é
 * reduzida no aparelho e sobe na hora por /api/fotos, solta; quem prende à memória é quem salva.
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
        const pronta = await prepararFoto(arquivo);
        const corpo = new FormData();
        corpo.set('foto', pronta, 'foto');
        const resposta = await fetch('/api/fotos', { method: 'POST', body: corpo });
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro ?? 'Falha no envio');
        li.dataset.fotoId = String(dados.id);
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
