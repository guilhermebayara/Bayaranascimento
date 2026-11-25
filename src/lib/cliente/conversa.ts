// A janela de escrever do relato como conversa (src/components/conversa/Janela.astro; regras em
// src/lib/conversa.ts). Cada envio vira uma mensagem na lista: o texto da caixa, o áudio gravado ali, um
// áudio do celular ou uma foto. Os áudios e as fotos sobem na hora (/api/audios, /api/fotos), soltos, e
// entram no relato quando a lista é gravada.
//
// "ao-vivo": cada mudança grava a lista inteira em /api/relatos, uma gravação por vez (a última espera a
// anterior). O relato é rascunho até "Publicar relato"; publicado, cada mensagem nova entra na hora.
// "formulario": nada é gravado aqui; a página pega a lista em mensagens() e manda junto com a memória.
import { BITS_POR_SEGUNDO, duracaoEmTexto, LIMITE_POR_ARQUIVO, MINUTOS_POR_GRAVACAO } from '../audios';
import { resumoDaMensagem, type TipoDeMensagem } from '../conversa';
import { enviarFotoComProgresso } from './fotos';
import { FRASES, dizer, enviarArquivo, linhaDe, paraFalha, pedirJson, proposta, quandoVoltar, semRede, type Falha } from './estado';
import { ligarMenus } from './menus';

/** O que vai para /api/relatos (e, na memória nova, para /api/memorias) */
export interface MensagemParaEnviar {
  id?: number;
  tipo: TipoDeMensagem;
  texto?: string;
  audioId?: number;
  fotoId?: number;
  citaId?: number | null;
  transcricao?: string;
  legenda?: string;
}

export interface ControleDaConversa {
  mensagens(): MensagemParaEnviar[];
  /** gravando, enviando um arquivo ou gravando a lista */
  ocupado(): boolean;
  /** manda o que ficou escrito na caixa, para não se perder num envio da página */
  enviarOQueFicou(): void;
  /** publica o relato (só no modo ao vivo); devolve o endereço da memória */
  publicar(): Promise<string | undefined>;
}

const FORMATOS = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];
const relogio = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const PONTOS = `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/></svg>`;

/** Liga um áudio de mensagem (na janela ou na memória): o botão toca e pausa, a onda anda, um toca por vez. */
export function ligarAudioDaMensagem(caixa: HTMLElement): void {
  if (caixa.dataset.ligado) return;
  caixa.dataset.ligado = '1';
  const nativo = caixa.querySelector('audio');
  const audio = nativo ?? document.createElement('audio');
  audio.removeAttribute('controls');
  audio.preload = 'none';
  if (!audio.src && caixa.dataset.src) audio.src = caixa.dataset.src;
  caixa.classList.add('msg__audio--com-script');
  const tocar = caixa.querySelector<HTMLButtonElement>('[data-tocar]')!;
  const andou = caixa.querySelector<HTMLElement>('[data-andou]');
  const tempo = caixa.querySelector<HTMLElement>('[data-tempo]');
  const duracao = Number(caixa.dataset.duracao) || null;
  tocar.addEventListener('click', () => {
    for (const outro of document.querySelectorAll('audio')) if (outro !== audio && !outro.paused) outro.pause();
    if (audio.paused) void audio.play();
    else audio.pause();
  });
  audio.addEventListener('play', () => caixa.classList.add('msg__audio--tocando'));
  audio.addEventListener('pause', () => caixa.classList.remove('msg__audio--tocando'));
  audio.addEventListener('ended', () => {
    if (andou) andou.style.width = '0%';
    if (tempo) tempo.textContent = duracaoEmTexto(duracao);
  });
  audio.addEventListener('timeupdate', () => {
    const total = Number.isFinite(audio.duration) ? audio.duration : (duracao ?? 0);
    if (andou && total) andou.style.width = `${Math.min(100, (audio.currentTime / total) * 100)}%`;
    if (tempo && !audio.paused) tempo.textContent = relogio(audio.currentTime);
  });
}

export function ligarConversa(raiz: HTMLElement, aoMudar?: () => void): ControleDaConversa {
  const aoVivo = raiz.dataset.modoDaJanela === 'ao-vivo';
  const memoria = raiz.dataset.memoria ?? '';
  // Quem via a memória quando a página abriu: vai com cada gravação (Y3 do PR #160)
  const publico = raiz.dataset.publico || undefined;
  const por = raiz.dataset.por ?? '';
  let publicado = raiz.dataset.publicado === 'true';
  const lista = raiz.querySelector<HTMLOListElement>('[data-mensagens]')!;
  const vazio = raiz.querySelector<HTMLElement>('[data-vazio]')!;
  const campo = raiz.querySelector<HTMLTextAreaElement>('[data-campo]')!;
  const escrever = raiz.querySelector<HTMLElement>('[data-escrever]')!;
  const botao = raiz.querySelector<HTMLButtonElement>('[data-botao]')!;
  const cancelar = raiz.querySelector<HTMLButtonElement>('[data-cancelar]')!;
  const gravando = raiz.querySelector<HTMLElement>('[data-gravando]')!;
  const relogioEl = raiz.querySelector<HTMLElement>('[data-relogio]')!;
  const situacao = raiz.querySelector<HTMLElement>('[data-situacao]')!;
  const dica = raiz.querySelector<HTMLElement>('[data-dica]')!;
  const citando = raiz.querySelector<HTMLElement>('[data-citando]')!;
  for (const el of raiz.querySelectorAll<HTMLElement>('[data-so-com-script]')) el.hidden = false;
  raiz.querySelector('[data-cita-sem-script]')?.remove();
  // Com script, o botão redondo não envia o formulário: ele grava ou manda a mensagem
  botao.type = 'button';
  botao.removeAttribute('name');
  ligarMenus(raiz);

  // A linha de avisos da janela é a linha de estado do relato (peça de estado, E4); a voz da página diz
  const linha = linhaDe(situacao);
  const avisar = (texto: string, tipo: 'normal' | 'erro' = 'normal') => {
    linha.limpar();
    situacao.textContent = texto;
    situacao.dataset.tipo = tipo;
    if (texto) dizer(texto);
  };
  /**
   * A falha de um envio do relato: sem rede, na B, espera e vai sozinho; na A, e com o servidor fora, a
   * frase e "Tentar de novo". A recusa traz a frase da rota.
   */
  const falhou = (falha: Falha, deNovo: () => void, oQue = '') => {
    delete situacao.dataset.tipo;
    if (falha.tipo === 'recusa') return linha.mostrar('recusado', falha.frase);
    if (falha.tipo === 'sem-rede') semRede();
    if (falha.tipo === 'sem-rede' && proposta() === 'b') {
      const desistir = quandoVoltar(deNovo);
      return linha.mostrar('sem-rede', `${oQue}${FRASES.semRedeEspera}`, { tentar: () => (desistir(), deNovo()) });
    }
    linha.mostrar('falhou', `${oQue}${falha.tipo === 'sem-rede' ? FRASES.semRedeTente : falha.frase}`, { tentar: deNovo });
  };

  // O que ficou escrito na caixa é guardado na aba a cada letra, e o que não foi salvo também: se a página
  // for aberta de novo nesta aba, volta para a caixa, com o aviso (peça de estado, E4)
  const GUARDA = `relato-nao-salvo:${memoria}:${por}`;
  const guardarNaAba = (texto: string) => {
    try {
      if (texto.trim()) sessionStorage.setItem(GUARDA, texto);
      else sessionStorage.removeItem(GUARDA);
    } catch {
      // sem armazenamento, o texto fica só na tela
    }
  };
  try {
    const guardado = sessionStorage.getItem(GUARDA);
    if (guardado && !campo.value.trim()) {
      campo.value = guardado;
      queueMicrotask(() => linha.mostrar('falhou', 'Isto não foi salvo da outra vez. Confira e envie.', { dizer: false }));
    }
  } catch {
    // sem armazenamento, segue vazio
  }
  campo.addEventListener('input', () => guardarNaAba(campo.value));

  // --- A citação: a mensagem nova de texto cita a mensagem escolhida ---
  let citaId: number | null = Number(new URLSearchParams(location.search).get('cita')) || null;
  if (citando.hidden) citaId = null;
  const citar = (id: number, quem: string, resumo: string) => {
    citaId = id;
    citando.querySelector('[data-citando-quem]')!.textContent = quem;
    citando.querySelector('[data-citando-texto]')!.textContent = resumo;
    citando.hidden = false;
    campo.focus();
  };
  citando.querySelector('[data-tirar-citacao]')!.addEventListener('click', () => {
    citaId = null;
    citando.hidden = true;
    campo.focus();
  });
  // "Citar" nas mensagens dos outros, ao lado (na memória, no computador)
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-citar]')) {
    b.addEventListener('click', () => {
      const msg = b.closest<HTMLElement>('[data-msg]')!;
      const texto = msg.querySelector('[data-texto]')?.textContent ?? '';
      citar(Number(b.dataset.citar), b.dataset.quem ?? '', resumoDaMensagem({ tipo: (msg.dataset.tipo as TipoDeMensagem) ?? 'texto', texto }));
    });
  }

  // --- A lista ---
  const mensagensDaLista = () => [...lista.querySelectorAll<HTMLElement>('[data-msg]')];
  const atualizarVazio = () => {
    vazio.hidden = mensagensDaLista().length > 0;
    for (const dia of lista.querySelectorAll('.msg-dia')) if (!(dia.nextElementSibling as HTMLElement | null)?.matches('[data-msg]')) dia.remove();
  };

  const lerMensagem = (li: HTMLElement): MensagemParaEnviar => {
    const tipo = li.dataset.tipo as TipoDeMensagem;
    const id = Number(li.dataset.id) || undefined;
    if (tipo === 'audio') {
      const audio = li.querySelector<HTMLElement>('[data-audio]')!;
      const transcricao = li.querySelector<HTMLTextAreaElement>('[data-transcricao-campo]')?.value ?? li.dataset.transcricao ?? '';
      return { ...(id ? { id } : {}), tipo, audioId: Number(audio.dataset.audioId), ...(transcricao.trim() ? { transcricao } : {}) };
    }
    if (tipo === 'foto') {
      const foto = li.querySelector<HTMLElement>('[data-foto]')!;
      return { ...(id ? { id } : {}), tipo, fotoId: Number(foto.dataset.fotoId), ...(foto.dataset.legenda ? { legenda: foto.dataset.legenda } : {}) };
    }
    return { ...(id ? { id } : {}), tipo: 'texto', texto: li.querySelector('[data-texto]')?.textContent ?? '', citaId: Number(li.dataset.citaId) || null };
  };
  const mensagens = () => mensagensDaLista().map(lerMensagem);

  // --- Gravar a lista (ao vivo), uma gravação por vez ---
  let gravandoLista = false;
  let deNovo = false;
  let situacaoPedida: 'rascunho' | 'publicada' = publicado ? 'publicada' : 'rascunho';
  // Para onde publicar leva: a memória, no relato de quem escreve (o servidor diz o endereço)
  let destino = `/memorias/${memoria}`;
  const gravarLista = async (): Promise<boolean> => {
    if (!aoVivo) return true;
    if (gravandoLista) {
      deNovo = true;
      return true;
    }
    const lidas = mensagens();
    if (!lidas.length) {
      avisar(publicado ? 'Um relato publicado precisa de pelo menos uma mensagem. A última não foi apagada.' : 'Nenhuma mensagem ainda.', publicado ? 'erro' : 'normal');
      return false;
    }
    gravandoLista = true;
    delete situacao.dataset.tipo;
    linha.mostrar('tocado', 'Salvando…');
    try {
      const resultado = await pedirJson<{ erro?: string; situacao?: string; url?: string; mensagens?: { id: number; tipo: TipoDeMensagem; audioId?: number; fotoId?: number }[] }>('/api/relatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ memoria, por, publico, situacao: situacaoPedida, mensagens: lidas }),
      });
      // Os ids das mensagens novas, na ordem: cada mensagem da tela fica com o id da gravada do mesmo tipo
      const gravadas = [...(resultado.mensagens ?? [])];
      for (const li of mensagensDaLista()) {
        const i = gravadas.findIndex((g) => g.tipo === li.dataset.tipo);
        if (i < 0) continue;
        li.dataset.id = String(gravadas[i].id);
        li.id = `mensagem-${gravadas[i].id}`;
        delete li.dataset.naoSalva;
        gravadas.splice(0, i + 1);
      }
      publicado = resultado.situacao === 'publicada';
      if (resultado.url) destino = resultado.url;
      raiz.dataset.publicado = String(publicado);
      dica.firstChild!.textContent = publicado ? 'Seu relato já está na memória. Cada mensagem nova entra na hora.' : 'Só você vê até publicar.';
      linha.mostrar('feito', publicado ? 'Salvo na memória.' : 'Rascunho salvo. Só você vê.');
      guardarNaAba(campo.value);
      return true;
    } catch (e) {
      const falha = paraFalha(e);
      // A mensagem continua na conversa, marcada como não salva, e o texto dela fica guardado na aba
      for (const li of mensagensDaLista()) if (!li.dataset.id) li.dataset.naoSalva = '';
      const naoSalvas = mensagensDaLista()
        .filter((li) => li.dataset.naoSalva !== undefined && li.dataset.tipo === 'texto')
        .map((li) => li.querySelector('[data-texto]')?.textContent ?? '');
      guardarNaAba([...naoSalvas, campo.value].filter((t) => t.trim()).join('\n\n'));
      falhou(falha, () => void gravarLista(), falha.tipo === 'recusa' ? '' : 'A mensagem não foi salva. ');
      return false;
    } finally {
      gravandoLista = false;
      if (deNovo) {
        deNovo = false;
        void gravarLista();
      }
    }
  };
  const mudou = () => {
    atualizarVazio();
    aoMudar?.();
    void gravarLista();
  };

  // --- O menu de cada mensagem minha: editar, transcrição, subir, descer, apagar ---
  const comMenu = (li: HTMLElement) => {
    if (li.querySelector('.msg__menu')) return;
    const tipo = li.dataset.tipo;
    const menu = document.createElement('details');
    menu.className = 'menu-acoes msg__menu';
    menu.dataset.menuAcoes = '';
    const itens = [
      tipo === 'texto' ? '<button type="button" class="menu-acoes__item" data-editar>Editar</button>' : '',
      tipo === 'audio' ? '<button type="button" class="menu-acoes__item" data-transcrever>Transcrição</button>' : '',
      '<button type="button" class="menu-acoes__item" data-mover="-1">Subir</button>',
      '<button type="button" class="menu-acoes__item" data-mover="1">Descer</button>',
      '<button type="button" class="menu-acoes__item" data-apagar>Apagar</button>',
    ].join('');
    menu.innerHTML = `<summary class="menu-acoes__botao" aria-label="Mais ações da mensagem" title="Mais ações">${PONTOS}</summary><div class="menu-acoes__lista">${itens}</div>`;
    const fechar = () => (menu.open = false);
    menu.querySelector('[data-apagar]')!.addEventListener('click', () => {
      fechar();
      if (aoVivo && publicado && mensagensDaLista().length === 1) return avisar('Um relato publicado precisa de pelo menos uma mensagem.', 'erro');
      li.querySelector('audio')?.pause();
      li.remove();
      mudou();
      campo.focus();
    });
    for (const mover of menu.querySelectorAll<HTMLButtonElement>('[data-mover]')) {
      mover.addEventListener('click', () => {
        fechar();
        const irmas = mensagensDaLista();
        const i = irmas.indexOf(li);
        const alvo = irmas[i + Number(mover.dataset.mover)];
        if (!alvo) return;
        if (mover.dataset.mover === '-1') alvo.before(li);
        else alvo.after(li);
        mudou();
        li.querySelector<HTMLElement>('summary')?.focus();
      });
    }
    menu.querySelector('[data-editar]')?.addEventListener('click', () => {
      fechar();
      editar(li);
    });
    menu.querySelector('[data-transcrever]')?.addEventListener('click', () => {
      fechar();
      abrirTranscricao(li);
    });
    li.append(menu);
    ligarMenus(li);
  };

  // Editar uma mensagem de texto: a caixa abre no lugar do balão, com "Salvar" e "Cancelar"
  const editar = (li: HTMLElement) => {
    const texto = li.querySelector<HTMLElement>('[data-texto]')!;
    if (li.querySelector('[data-edicao]')) return;
    const caixa = document.createElement('div');
    caixa.className = 'msg__edicao';
    caixa.dataset.edicao = '';
    caixa.innerHTML = `<label class="so-leitor" for="edicao-${li.dataset.id ?? 'nova'}">Mensagem</label><textarea id="edicao-${li.dataset.id ?? 'nova'}" class="janela__campo msg__campo" rows="2" maxlength="20000"></textarea><p class="msg__edicao-acoes"><button type="button" class="acao" data-salvar-edicao>Salvar</button><button type="button" class="acao acao--quieta" data-cancelar-edicao>Cancelar</button></p>`;
    const area = caixa.querySelector('textarea')!;
    area.value = texto.textContent ?? '';
    texto.hidden = true;
    texto.after(caixa);
    area.focus();
    const fechar = () => {
      caixa.remove();
      texto.hidden = false;
      li.querySelector<HTMLElement>('summary')?.focus();
    };
    caixa.querySelector('[data-cancelar-edicao]')!.addEventListener('click', fechar);
    area.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') fechar();
    });
    caixa.querySelector('[data-salvar-edicao]')!.addEventListener('click', () => {
      const novo = area.value.trim();
      if (!novo) return avisar('A mensagem ficou vazia. Para tirar, use “Apagar”.', 'erro');
      texto.textContent = novo;
      fechar();
      mudou();
    });
  };

  // A transcrição de um áudio: a caixa abre embaixo do balão; com a automática ligada, o botão dela
  const abrirTranscricao = (li: HTMLElement) => {
    let painel = li.querySelector<HTMLElement>('[data-transcricao-painel]');
    if (painel) {
      painel.hidden = !painel.hidden;
      if (!painel.hidden) painel.querySelector('textarea')?.focus();
      return;
    }
    li.querySelector('[data-transcricao-lida]')?.remove();
    painel = document.createElement('div');
    painel.className = 'msg__transcricao-painel';
    painel.dataset.transcricaoPainel = '';
    painel.innerHTML = `<label class="campo"><span>Transcrição <small>(opcional)</small></span><textarea rows="4" maxlength="20000" data-transcricao-campo placeholder="O que é dito no áudio, para quem preferir ler."></textarea></label>`;
    const area = painel.querySelector('textarea')!;
    area.value = li.dataset.transcricao ?? '';
    area.addEventListener('change', () => {
      li.dataset.transcricao = area.value;
      mudou();
    });
    if (raiz.dataset.transcricaoAutomatica === 'ligada') {
      const auto = Object.assign(document.createElement('button'), { type: 'button', className: 'acao', textContent: 'Transcrever automaticamente' });
      const nota = Object.assign(document.createElement('p'), { className: 'dica' });
      nota.setAttribute('aria-live', 'polite');
      auto.addEventListener('click', async () => {
        auto.disabled = true;
        nota.textContent = 'Transcrevendo… pode levar um minuto.';
        try {
          const audioId = Number(li.querySelector<HTMLElement>('[data-audio]')!.dataset.audioId);
          const resposta = await fetch('/api/transcricao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: audioId }) });
          const r = (await resposta.json()) as { texto?: string; erro?: string };
          if (!resposta.ok || !r.texto) throw new Error(r.erro ?? 'Não consegui transcrever agora.');
          area.value = area.value.trim() ? `${area.value.trim()}\n\n${r.texto}` : r.texto;
          li.dataset.transcricao = area.value;
          nota.textContent = 'Transcrição automática: confira e corrija. Ela é salva quando você sai da caixa.';
          area.focus();
        } catch (e) {
          // Nenhum recado técnico na tela (peça de estado, E4): sem rede e resposta quebrada viram frase
          nota.textContent = e instanceof TypeError ? FRASES.semRedeTente : e instanceof SyntaxError ? FRASES.servidor : e instanceof Error ? e.message : 'Não consegui transcrever agora.';
        } finally {
          auto.disabled = false;
        }
      });
      painel.append(auto, nota);
    }
    li.querySelector('.msg__corpo')!.append(painel);
    area.focus();
  };

  // As mensagens que já estavam: a transcrição de cada áudio no data-*, o tocador e o menu
  for (const li of mensagensDaLista()) {
    const lida = li.querySelector<HTMLElement>('[data-transcricao-texto]');
    if (lida) li.dataset.transcricao = [...lida.querySelectorAll('p')].map((p) => p.textContent).join('\n\n');
    const audio = li.querySelector<HTMLElement>('[data-audio]');
    if (audio) ligarAudioDaMensagem(audio);
    comMenu(li);
  }
  for (const audio of document.querySelectorAll<HTMLElement>('[data-audio]')) ligarAudioDaMensagem(audio);

  // --- Mandar uma mensagem nova ---
  const nova = (tipo: TipoDeMensagem, corpo: Node, extra: Record<string, string> = {}) => {
    const li = document.createElement('li');
    li.className = 'msg msg--minha msg--nova';
    li.dataset.msg = '';
    li.dataset.tipo = tipo;
    Object.assign(li.dataset, extra);
    const caixa = document.createElement('div');
    caixa.className = 'msg__corpo';
    caixa.append(corpo);
    li.append(caixa);
    comMenu(li);
    lista.append(li);
    li.scrollIntoView({ block: 'nearest' });
    return li;
  };
  const enviarTexto = () => {
    const texto = campo.value.trim();
    if (!texto) return;
    const p = Object.assign(document.createElement('p'), { textContent: texto });
    p.dataset.texto = '';
    const corpo = document.createElement('div');
    corpo.className = 'msg__texto';
    const extra: Record<string, string> = {};
    if (citaId && !citando.hidden) {
      const cita = document.createElement('blockquote');
      cita.className = 'msg__cita';
      cita.innerHTML = '<span class="ficha"></span><span></span>';
      cita.children[0].textContent = citando.querySelector('[data-citando-quem]')!.textContent;
      cita.children[1].textContent = citando.querySelector('[data-citando-texto]')!.textContent;
      corpo.append(cita);
      extra.citaId = String(citaId);
      citaId = null;
      citando.hidden = true;
    }
    corpo.append(p);
    nova('texto', corpo, extra);
    campo.value = '';
    guardarNaAba('');
    atualizarBotao();
    mudou();
  };
  const novoAudio = (id: number, src: string, duracao: number | null) => {
    const caixa = document.createElement('div');
    caixa.className = 'msg__audio';
    caixa.dataset.audio = '';
    caixa.dataset.audioId = String(id);
    caixa.dataset.src = src;
    if (duracao) caixa.dataset.duracao = String(Math.round(duracao));
    caixa.innerHTML = `<button type="button" class="msg__tocar" data-tocar aria-label="Ouvir o áudio"><svg class="msg__play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg><svg class="msg__pausa" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg></button><span class="msg__onda" aria-hidden="true"><span class="msg__andou" data-andou></span></span><span class="msg__tempo ficha" data-tempo>${duracaoEmTexto(duracao)}</span>`;
    ligarAudioDaMensagem(caixa);
    nova('audio', caixa);
    mudou();
  };
  const novaFoto = (id: number, src: string) => {
    const figura = document.createElement('figure');
    figura.className = 'msg__foto';
    figura.dataset.foto = '';
    figura.dataset.fotoId = String(id);
    figura.append(Object.assign(document.createElement('img'), { src, alt: '' }));
    nova('foto', figura);
    mudou();
  };

  // --- O botão da ponta: com texto, envia; sem texto, grava ---
  let gravador: MediaRecorder | undefined;
  let enviando = 0;
  const podeGravar = 'MediaRecorder' in window && Boolean(navigator.mediaDevices?.getUserMedia);
  const atualizarBotao = () => {
    const modo = gravador?.state === 'recording' ? 'gravando' : campo.value.trim() || !podeGravar ? 'texto' : 'voz';
    escrever.dataset.modo = modo;
    botao.setAttribute('aria-label', modo === 'texto' ? 'Enviar' : modo === 'gravando' ? 'Parar e enviar o áudio' : 'Gravar áudio');
    if (!CSS.supports('field-sizing', 'content')) {
      campo.style.height = 'auto';
      campo.style.height = `${campo.scrollHeight}px`;
    }
  };
  campo.addEventListener('input', atualizarBotao);
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      enviarTexto();
    }
  });

  const subirAudio = async (arquivo: Blob, duracao: number | null, nome = 'gravacao'): Promise<void> => {
    if (arquivo.size > LIMITE_POR_ARQUIVO) return avisar('Esse áudio passa de 25 MB. Envie um trecho menor.', 'erro');
    enviando++;
    delete situacao.dataset.tipo;
    linha.mostrar('enviando', 'Enviando o áudio', { andou: 0 });
    try {
      const dados = new FormData();
      dados.append('audio', arquivo, nome);
      if (memoria) dados.append('memoria', memoria);
      if (duracao) dados.append('duracao', String(duracao));
      const r = await enviarArquivo<{ id: number; src: string; duracao?: number }>('/api/audios', dados, (fracao) =>
        linha.mostrar('enviando', `Enviando o áudio · ${Math.round(fracao * 100)}%`, { andou: fracao }),
      );
      linha.limpar();
      novoAudio(r.id, r.src, r.duracao ?? duracao);
      if (!aoVivo) avisar('Áudio guardado. Ele entra no relato quando você salvar a memória.');
    } catch (e) {
      // O áudio continua no aparelho: tentar de novo manda o mesmo, sem gravar outra vez
      falhou(paraFalha(e), () => void subirAudio(arquivo, duracao, nome), 'O áudio não foi enviado. ');
    } finally {
      enviando--;
    }
  };
  const subirFoto = async (arquivo: File): Promise<void> => {
    enviando++;
    delete situacao.dataset.tipo;
    linha.mostrar('enviando', 'Enviando a foto', { andou: 0 });
    try {
      const r = await enviarFotoComProgresso(arquivo, (fracao) => linha.mostrar('enviando', `Enviando a foto · ${Math.round(fracao * 100)}%`, { andou: fracao }));
      linha.limpar();
      novaFoto(r.id, r.src);
    } catch (e) {
      falhou(paraFalha(e), () => void subirFoto(arquivo), 'A foto não foi enviada. ');
    } finally {
      enviando--;
    }
  };

  let cancelada = false;
  let inicio = 0;
  let cronometro: number | undefined;
  let limite: number | undefined;
  botao.addEventListener('click', async () => {
    if (escrever.dataset.modo === 'texto') return enviarTexto();
    if (gravador?.state === 'recording') return gravador.stop();
    let microfone: MediaStream;
    try {
      microfone = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return avisar('O navegador não deixou usar o microfone. Confira a permissão nas configurações do navegador.', 'erro');
    }
    const formato = FORMATOS.find((f) => MediaRecorder.isTypeSupported(f));
    gravador = new MediaRecorder(microfone, { ...(formato ? { mimeType: formato } : {}), audioBitsPerSecond: BITS_POR_SEGUNDO });
    const pedacos: Blob[] = [];
    cancelada = false;
    gravador.addEventListener('dataavailable', (e) => e.data.size && pedacos.push(e.data));
    gravador.addEventListener('stop', async () => {
      for (const t of microfone.getTracks()) t.stop();
      clearInterval(cronometro);
      clearTimeout(limite);
      gravando.hidden = true;
      cancelar.hidden = true;
      atualizarBotao();
      botao.focus();
      if (cancelada) return avisar('Gravação cancelada. Nada foi guardado.');
      const duracao = (Date.now() - inicio) / 1000;
      const blob = new Blob(pedacos, { type: gravador?.mimeType || 'audio/webm' });
      if (duracao < 1 || !blob.size) return avisar('A gravação ficou vazia. Tente de novo.', 'erro');
      await subirAudio(blob, duracao);
    });
    gravador.start(1000);
    inicio = Date.now();
    gravando.hidden = false;
    cancelar.hidden = false;
    relogioEl.textContent = '0:00';
    cronometro = window.setInterval(() => (relogioEl.textContent = relogio((Date.now() - inicio) / 1000)), 500);
    limite = window.setTimeout(() => gravador?.state === 'recording' && gravador.stop(), MINUTOS_POR_GRAVACAO * 60 * 1000);
    avisar('Gravando. Toque no quadrado para enviar o áudio.');
    atualizarBotao();
  });
  cancelar.addEventListener('click', () => {
    cancelada = true;
    gravador?.stop();
  });

  // O "+": foto ou áudio do celular, cada arquivo uma mensagem
  for (const opcao of raiz.querySelectorAll<HTMLButtonElement>('[data-anexar]')) {
    opcao.addEventListener('click', () => {
      opcao.closest('details')!.open = false;
      raiz.querySelector<HTMLInputElement>(`[data-arquivo="${opcao.dataset.anexar}"]`)!.click();
    });
  }
  for (const entrada of raiz.querySelectorAll<HTMLInputElement>('[data-arquivo]')) {
    entrada.addEventListener('change', async () => {
      for (const arquivo of [...(entrada.files ?? [])]) {
        if (entrada.dataset.arquivo === 'foto') await subirFoto(arquivo);
        else await subirAudio(arquivo, await duracaoDoArquivo(arquivo), arquivo.name);
      }
      entrada.value = '';
    });
  }
  atualizarBotao();
  atualizarVazio();

  return {
    mensagens,
    ocupado: () => enviando > 0 || gravador?.state === 'recording' || gravandoLista,
    enviarOQueFicou: () => {
      if (campo.value.trim()) enviarTexto();
    },
    publicar: async () => {
      if (campo.value.trim()) enviarTexto();
      while (gravandoLista) await new Promise((r) => setTimeout(r, 150));
      situacaoPedida = 'publicada';
      const ok = await gravarLista();
      if (!ok) situacaoPedida = publicado ? 'publicada' : 'rascunho';
      return ok ? destino : undefined;
    },
  };
}

/** A duração de um arquivo de áudio, lida pelo próprio navegador (se ele souber abrir o formato) */
function duracaoDoArquivo(arquivo: File): Promise<number | null> {
  return new Promise((resolver) => {
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
}
