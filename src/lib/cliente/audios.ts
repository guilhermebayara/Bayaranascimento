// Áudios no relato: gravar no navegador, enviar arquivo, pôr em ordem, transcrever e remover.
// Cada áudio sobe na hora para /api/audios e volta com um id; a lista (ids, ordem e transcrições)
// vai junto quando o relato é salvo. Sem JavaScript, a parte dos áudios não aparece.
import { BITS_POR_SEGUNDO, duracaoEmTexto, LIMITE_POR_ARQUIVO, MINUTOS_POR_GRAVACAO } from '../audios';

export interface AudioNoFormulario {
  id: number;
  src: string;
  duracao: number | null;
  transcricao: string | null;
}

export interface ControleDeAudios {
  lista(): { id: number; transcricao?: string }[];
  carregar(audios: AudioNoFormulario[]): void;
  ocupado(): boolean;
}

// Formatos que o gravador do navegador costuma oferecer, do melhor para voz ao mais aceito
const FORMATOS = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];

const relogio = (segundos: number) => `${Math.floor(segundos / 60)}:${String(Math.floor(segundos % 60)).padStart(2, '0')}`;

export function ligarAudios(raiz: HTMLElement, memoria: string, aoMudar?: () => void): ControleDeAudios | undefined {
  const lista = raiz.querySelector<HTMLOListElement>('[data-lista-audios]');
  const gravar = raiz.querySelector<HTMLButtonElement>('[data-gravar]');
  const enviar = raiz.querySelector<HTMLInputElement>('[data-enviar-audio]');
  const situacao = raiz.querySelector<HTMLElement>('[data-situacao-audio]');
  if (!lista || !gravar || !enviar || !situacao) return undefined;
  raiz.hidden = false;
  let enviando = 0;

  const avisar = (texto: string, tipo: 'normal' | 'erro' = 'normal') => {
    situacao.textContent = texto;
    situacao.dataset.tipo = tipo;
  };

  const numerar = () => {
    [...lista.children].forEach((item, i) => {
      item.querySelector<HTMLElement>('[data-numero]')!.textContent = `Áudio ${i + 1}`;
      item.querySelector<HTMLButtonElement>('[data-subir]')!.hidden = i === 0;
      item.querySelector<HTMLButtonElement>('[data-descer]')!.hidden = i === lista.children.length - 1;
    });
    aoMudar?.();
  };

  const acrescentar = (audio: AudioNoFormulario) => {
    const item = document.createElement('li');
    item.className = 'audio';
    item.dataset.audioId = String(audio.id);
    item.innerHTML = `
      <p class="audio__titulo"><strong data-numero></strong> <span data-duracao></span></p>
      <audio controls preload="metadata"></audio>
      <details class="audio__transcricao">
        <summary>Transcrição <small>(opcional)</small></summary>
        <label class="campo"><span class="oculto-visualmente">Transcrição</span><textarea rows="4" maxlength="20000" data-transcricao placeholder="O que é dito no áudio, para quem preferir ler."></textarea></label>
      </details>
      <p class="acoes">
        <button type="button" class="botao botao--leve" data-subir>Subir</button>
        <button type="button" class="botao botao--leve" data-descer>Descer</button>
        <button type="button" class="botao botao--leve" data-remover-audio>Remover</button>
      </p>`;
    item.querySelector('audio')!.src = audio.src;
    item.querySelector<HTMLElement>('[data-duracao]')!.textContent = duracaoEmTexto(audio.duracao);
    const transcricao = item.querySelector<HTMLTextAreaElement>('[data-transcricao]')!;
    transcricao.value = audio.transcricao ?? '';
    if (audio.transcricao) item.querySelector('details')!.open = true;
    item.querySelector('[data-subir]')!.addEventListener('click', () => {
      item.previousElementSibling?.before(item);
      numerar();
    });
    item.querySelector('[data-descer]')!.addEventListener('click', () => {
      item.nextElementSibling?.after(item);
      numerar();
    });
    // Remover só vale quando o relato for salvo; até lá, o arquivo continua guardado
    item.querySelector('[data-remover-audio]')!.addEventListener('click', () => {
      item.remove();
      numerar();
      avisar('Áudio tirado da lista. Ele sai do relato quando você salvar.');
    });
    lista.append(item);
    numerar();
  };

  const subir = async (arquivo: Blob, duracao: number | null, nome = 'gravacao') => {
    if (arquivo.size > LIMITE_POR_ARQUIVO) {
      avisar('Esse áudio passa de 25 MB. Envie um trecho menor.', 'erro');
      return;
    }
    enviando++;
    avisar('Enviando o áudio…');
    try {
      const dados = new FormData();
      dados.append('audio', arquivo, nome);
      if (memoria) dados.append('memoria', memoria);
      if (duracao) dados.append('duracao', String(duracao));
      const resposta = await fetch('/api/audios', { method: 'POST', body: dados });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro ?? 'Não consegui enviar o áudio.');
      acrescentar({ id: resultado.id, src: resultado.src, duracao: resultado.duracao ?? duracao, transcricao: null });
      avisar('Áudio guardado. Ele entra no relato quando você salvar.');
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não consegui enviar o áudio.', 'erro');
    } finally {
      enviando--;
    }
  };

  // Duração de um arquivo enviado, lida pelo próprio navegador (se ele souber abrir o formato)
  const duracaoDoArquivo = (arquivo: File) =>
    new Promise<number | null>((resolver) => {
      const tocador = document.createElement('audio');
      const endereco = URL.createObjectURL(arquivo);
      const fim = (valor: number | null) => {
        URL.revokeObjectURL(endereco);
        resolver(valor);
      };
      tocador.preload = 'metadata';
      tocador.onloadedmetadata = () => fim(Number.isFinite(tocador.duration) ? tocador.duration : null);
      tocador.onerror = () => fim(null);
      setTimeout(() => fim(null), 4000);
      tocador.src = endereco;
    });

  enviar.addEventListener('change', async () => {
    for (const arquivo of [...(enviar.files ?? [])]) await subir(arquivo, await duracaoDoArquivo(arquivo), arquivo.name);
    enviar.value = '';
  });

  // Gravação no navegador
  if (!('MediaRecorder' in window) || !navigator.mediaDevices?.getUserMedia) {
    gravar.hidden = true;
  } else {
    const rotulo = gravar.textContent ?? 'Gravar áudio';
    let gravador: MediaRecorder | undefined;
    let inicio = 0;
    let cronometro: number | undefined;
    let limite: number | undefined;
    const parar = () => gravador?.state === 'recording' && gravador.stop();
    gravar.addEventListener('click', async () => {
      if (gravador?.state === 'recording') return parar();
      let microfone: MediaStream;
      try {
        microfone = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        avisar('O navegador não deixou usar o microfone. Confira a permissão nas configurações do navegador.', 'erro');
        return;
      }
      const formato = FORMATOS.find((f) => MediaRecorder.isTypeSupported(f));
      gravador = new MediaRecorder(microfone, { ...(formato ? { mimeType: formato } : {}), audioBitsPerSecond: BITS_POR_SEGUNDO });
      const pedacos: Blob[] = [];
      gravador.addEventListener('dataavailable', (e) => e.data.size && pedacos.push(e.data));
      gravador.addEventListener('stop', async () => {
        clearInterval(cronometro);
        clearTimeout(limite);
        for (const trilha of microfone.getTracks()) trilha.stop();
        gravar.textContent = rotulo;
        gravar.classList.remove('gravando');
        raiz.dataset.gravando = 'false';
        const duracao = (Date.now() - inicio) / 1000;
        const blob = new Blob(pedacos, { type: gravador?.mimeType || 'audio/webm' });
        if (duracao < 1 || !blob.size) return avisar('A gravação ficou vazia. Tente de novo.', 'erro');
        await subir(blob, duracao);
      });
      gravador.start(1000);
      inicio = Date.now();
      raiz.dataset.gravando = 'true';
      gravar.classList.add('gravando');
      const atualizar = () => {
        const passou = (Date.now() - inicio) / 1000;
        gravar.textContent = `Parar gravação (${relogio(passou)})`;
      };
      atualizar();
      cronometro = window.setInterval(atualizar, 500);
      // A gravação para sozinha no limite, para o arquivo não passar do tamanho combinado
      limite = window.setTimeout(parar, MINUTOS_POR_GRAVACAO * 60 * 1000);
      avisar(`Gravando. Fale perto do celular. A gravação para sozinha em ${MINUTOS_POR_GRAVACAO} minutos.`);
    });
  }

  return {
    lista: () =>
      [...lista.children].map((item) => ({
        id: Number((item as HTMLElement).dataset.audioId),
        transcricao: item.querySelector<HTMLTextAreaElement>('[data-transcricao]')?.value.trim() || undefined,
      })),
    carregar: (audios) => {
      lista.replaceChildren();
      for (const a of audios) acrescentar(a);
      avisar('');
    },
    ocupado: () => enviando > 0 || raiz.dataset.gravando === 'true',
  };
}
