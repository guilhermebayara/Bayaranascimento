// Áudios no relato: gravar no navegador, enviar arquivo, pôr em ordem, transcrever e remover.
// Cada áudio sobe na hora para /api/audios e volta com um id; a lista (ids, ordem e transcrições)
// vai junto quando o relato é salvo. Sem JavaScript, a parte dos áudios não aparece.
// Como mensagem de voz (proposta B do conceito da sessão H, escolha do Gui de 18/11/2026): a barra com o
// microfone grava e para; gravando, ela mostra o tempo, "Cancelar" e o quadrado de parar. Cada áudio
// guardado é um balão com tocar, o andamento e a duração, e embaixo a transcrição, a ordem e "Remover".
// A marcação está em src/components/formularios/CaixaDoRelato.astro: o relato num campo só.
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
  const cancelar = raiz.querySelector<HTMLButtonElement>('[data-cancelar-gravacao]');
  const barra = raiz.querySelector<HTMLElement>('[data-gravador]');
  const textoDaBarra = raiz.querySelector<HTMLElement>('[data-gravador-texto]');
  const dicaDaBarra = raiz.querySelector<HTMLElement>('[data-gravador-dica]');
  const enviar = raiz.querySelector<HTMLInputElement>('[data-enviar-audio]');
  const situacao = raiz.querySelector<HTMLElement>('[data-situacao-audio]');
  if (!lista || !gravar || !cancelar || !barra || !textoDaBarra || !dicaDaBarra || !enviar || !situacao) return undefined;
  raiz.hidden = false;
  let enviando = 0;

  const avisar = (texto: string, tipo: 'normal' | 'erro' = 'normal') => {
    situacao.classList.remove('so-leitor');
    situacao.textContent = texto;
    situacao.dataset.tipo = tipo;
  };
  // A barra convida a gravar; depois do primeiro áudio, a gravar mais
  const convidar = () => {
    textoDaBarra.textContent = lista.children.length ? 'Toque no microfone para gravar mais' : 'Toque no microfone para gravar';
  };

  const numerar = () => {
    [...lista.children].forEach((item, i) => {
      item.querySelector<HTMLButtonElement>('[data-tocar]')!.setAttribute('aria-label', `Ouvir o áudio ${i + 1}`);
      item.querySelector<HTMLButtonElement>('[data-subir]')!.hidden = i === 0;
      item.querySelector<HTMLButtonElement>('[data-descer]')!.hidden = i === lista.children.length - 1;
    });
    convidar();
    aoMudar?.();
  };

  // Tocar um áudio para o que estiver tocando
  const pararOsOutros = (este: HTMLAudioElement) => {
    for (const outro of lista.querySelectorAll('audio')) if (outro !== este && !outro.paused) outro.pause();
  };

  const acrescentar = (audio: AudioNoFormulario) => {
    const item = document.createElement('li');
    item.className = 'audio';
    item.dataset.audioId = String(audio.id);
    item.innerHTML = `
      <div class="audio__balao">
        <button type="button" class="audio__tocar" data-tocar aria-label="Ouvir o áudio">
          <svg class="audio__play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>
          <svg class="audio__pausa" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
        </button>
        <span class="audio__onda" aria-hidden="true"><span class="audio__andou" data-andou></span></span>
        <span class="audio__tempo ficha" data-duracao></span>
        <audio preload="metadata"></audio>
      </div>
      <p class="audio__acoes">
        <button type="button" class="acao acao--quieta" data-abre-transcricao aria-expanded="false">Escrever a transcrição</button>
        <button type="button" class="acao acao--quieta" data-subir>Subir</button>
        <button type="button" class="acao acao--quieta" data-descer>Descer</button>
        <button type="button" class="acao acao--quieta" data-remover-audio>Remover</button>
      </p>
      <div class="audio__transcricao" data-painel-transcricao hidden>
        <label class="campo"><span>Transcrição <small>(opcional)</small></span><textarea rows="4" maxlength="20000" data-transcricao placeholder="O que é dito no áudio, para quem preferir ler."></textarea></label>
      </div>`;
    const tocador = item.querySelector('audio')!;
    tocador.src = audio.src;
    const tempo = item.querySelector<HTMLElement>('[data-duracao]')!;
    const duracao = audio.duracao;
    tempo.textContent = duracaoEmTexto(duracao);
    const tocar = item.querySelector<HTMLButtonElement>('[data-tocar]')!;
    const andou = item.querySelector<HTMLElement>('[data-andou]')!;
    tocar.addEventListener('click', () => {
      if (tocador.paused) {
        pararOsOutros(tocador);
        void tocador.play();
      } else tocador.pause();
    });
    tocador.addEventListener('play', () => item.classList.add('audio--tocando'));
    tocador.addEventListener('pause', () => item.classList.remove('audio--tocando'));
    tocador.addEventListener('ended', () => {
      andou.style.width = '0%';
      tempo.textContent = duracaoEmTexto(duracao);
    });
    tocador.addEventListener('timeupdate', () => {
      const total = Number.isFinite(tocador.duration) ? tocador.duration : (duracao ?? 0);
      if (total) andou.style.width = `${Math.min(100, (tocador.currentTime / total) * 100)}%`;
      if (!tocador.paused) tempo.textContent = relogio(tocador.currentTime);
    });

    // A transcrição abre embaixo do balão; com texto, já vem aberta
    const transcricao = item.querySelector<HTMLTextAreaElement>('[data-transcricao]')!;
    const painel = item.querySelector<HTMLElement>('[data-painel-transcricao]')!;
    const abre = item.querySelector<HTMLButtonElement>('[data-abre-transcricao]')!;
    const mostrarTranscricao = (aberta: boolean) => {
      painel.hidden = !aberta;
      abre.setAttribute('aria-expanded', String(aberta));
      abre.textContent = aberta ? 'Fechar a transcrição' : transcricao.value.trim() ? 'Ver a transcrição' : 'Escrever a transcrição';
    };
    transcricao.value = audio.transcricao ?? '';
    mostrarTranscricao(Boolean(audio.transcricao));
    abre.addEventListener('click', () => {
      mostrarTranscricao(painel.hidden === true);
      if (!painel.hidden) transcricao.focus();
    });
    // Transcrição automática (onda 2): só onde os administradores ligaram. O texto entra na caixa como
    // rascunho, e só vale quando a pessoa revisa e salva o relato.
    if (raiz.dataset.transcricaoAutomatica === 'ligada') {
      const botao = Object.assign(document.createElement('button'), { type: 'button', className: 'acao', textContent: 'Transcrever automaticamente' });
      const nota = Object.assign(document.createElement('p'), { className: 'dica' });
      nota.setAttribute('aria-live', 'polite');
      botao.addEventListener('click', async () => {
        botao.disabled = true;
        nota.textContent = 'Transcrevendo… pode levar um minuto.';
        try {
          const resposta = await fetch('/api/transcricao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: audio.id }) });
          const resultado = (await resposta.json()) as { texto?: string; erro?: string };
          if (!resposta.ok || !resultado.texto) throw new Error(resultado.erro ?? 'Não consegui transcrever agora.');
          transcricao.value = transcricao.value.trim() ? `${transcricao.value.trim()}\n\n${resultado.texto}` : resultado.texto;
          mostrarTranscricao(true);
          nota.textContent = 'Transcrição automática: confira e corrija antes de salvar.';
          aoMudar?.();
        } catch (e) {
          nota.textContent = e instanceof Error ? e.message : 'Não consegui transcrever agora.';
        } finally {
          botao.disabled = false;
        }
      });
      painel.append(botao, nota);
    }
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
      tocador.pause();
      item.remove();
      numerar();
      avisar('Áudio tirado da lista. Ele sai do relato quando você salvar.');
      gravar.focus();
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

  // Gravação no navegador. Sem gravador no navegador, a barra sai, e anexar um arquivo continua.
  if (!('MediaRecorder' in window) || !navigator.mediaDevices?.getUserMedia) {
    barra.hidden = true;
  } else {
    let gravador: MediaRecorder | undefined;
    let cancelada = false;
    let inicio = 0;
    let cronometro: number | undefined;
    let limite: number | undefined;
    const parar = () => gravador?.state === 'recording' && gravador.stop();
    const voltarAoComeco = () => {
      clearInterval(cronometro);
      clearTimeout(limite);
      raiz.dataset.gravando = 'false';
      barra.classList.remove('gravador--gravando');
      gravar.setAttribute('aria-label', 'Gravar áudio');
      cancelar.hidden = true;
      dicaDaBarra.hidden = true;
      convidar();
    };
    cancelar.addEventListener('click', () => {
      cancelada = true;
      parar();
    });
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
      cancelada = false;
      const pedacos: Blob[] = [];
      gravador.addEventListener('dataavailable', (e) => e.data.size && pedacos.push(e.data));
      gravador.addEventListener('stop', async () => {
        for (const trilha of microfone.getTracks()) trilha.stop();
        voltarAoComeco();
        gravar.focus();
        if (cancelada) return avisar('Gravação cancelada. Nada foi guardado.');
        const duracao = (Date.now() - inicio) / 1000;
        const blob = new Blob(pedacos, { type: gravador?.mimeType || 'audio/webm' });
        if (duracao < 1 || !blob.size) return avisar('A gravação ficou vazia. Tente de novo.', 'erro');
        await subir(blob, duracao);
      });
      gravador.start(1000);
      inicio = Date.now();
      raiz.dataset.gravando = 'true';
      barra.classList.add('gravador--gravando');
      gravar.setAttribute('aria-label', 'Parar e guardar o áudio');
      cancelar.hidden = false;
      dicaDaBarra.hidden = false;
      dicaDaBarra.textContent = `Fale perto do celular. Toque no quadrado para guardar. A gravação para sozinha em ${MINUTOS_POR_GRAVACAO} minutos.`;
      const atualizar = () => {
        textoDaBarra.textContent = `Gravando ${relogio((Date.now() - inicio) / 1000)}`;
      };
      atualizar();
      cronometro = window.setInterval(atualizar, 500);
      // A gravação para sozinha no limite, para o arquivo não passar do tamanho combinado
      limite = window.setTimeout(parar, MINUTOS_POR_GRAVACAO * 60 * 1000);
      // A barra já mostra o tempo; a linha de situação fica para o leitor de tela
      avisar('');
      situacao.textContent = 'Gravando.';
      situacao.classList.add('so-leitor');
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
      convidar();
      avisar('');
    },
    ocupado: () => enviando > 0 || raiz.dataset.gravando === 'true',
  };
}
