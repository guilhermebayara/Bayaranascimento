// Interação sem recarregar a página ("Interação sem recarregar a página", em docs/visual.md; premissa do Gui
// de 18/11/2026). Um formulário marcado com data-no-lugar (os nomes das regiões, separados por espaço) é enviado pelo script; a rota
// responde como sempre (volta para a página, com o recado no endereço), o script lê a página que voltou e
// troca só as regiões nomeadas (os elementos com data-regiao), sem recarregar e sem perder a rolagem.
//
// Sem script, o mesmo formulário é um formulário comum, que recarrega: é a reserva. Depois de trocar, as
// regiões novas são ligadas de novo (reações, menus e os próprios formulários no lugar), e o recado é dito ao
// leitor de tela.
//
// Exploração E4 (peça de estado): se o pedido falhar, a pessoa fica na página, com o que escreveu e a frase da
// falha no próprio formulário. O que foi escrito e não foi salvo fica guardado na aba e volta ao campo se a
// página for aberta de novo.
import { camposDo, devolver } from './guardar-formulario';
import { agir, dizer as anunciar, linhaDe, pedir, type Linha } from './estado';
import { textoEnviando } from './enviando';
import { ligarMenus } from './menus';
import { ligarReacoes } from './reacoes';

const NAO_SALVO = 'nao-salvo:';
const chaveDoNaoSalvo = (form: HTMLFormElement) => `${NAO_SALVO}${location.pathname}:${form.dataset.chave ?? form.getAttribute('action') ?? ''}`;

/** A linha de estado do formulário: no fim dele, perto do botão. */
function linhaDoFormulario(form: HTMLFormElement): Linha {
  let el = form.querySelector<HTMLElement>(':scope > [data-linha-de-estado]');
  if (!el) {
    el = Object.assign(document.createElement('p'), { hidden: true });
    el.dataset.linhaDeEstado = 'formulario';
    form.append(el);
  }
  return linhaDe(el);
}

/** O que a pessoa escreveu e não foi salvo, de uma visita anterior nesta aba, volta ao campo. */
function devolverNaoSalvo(form: HTMLFormElement): void {
  let guardado: string | null = null;
  try {
    guardado = sessionStorage.getItem(chaveDoNaoSalvo(form));
  } catch {
    return;
  }
  if (!guardado) return;
  devolver(form, JSON.parse(guardado));
  const bloco = form.closest('details');
  if (bloco) bloco.open = true;
  linhaDoFormulario(form).mostrar('falhou', 'Isto não foi salvo da outra vez. Confira e salve.', { dizer: false });
}

/** Troca cada região nomeada pela da página nova. A que sumiu da página nova sai; a que é nova não entra. */
function trocar(nomes: string[], nova: Document): Element[] {
  const trocadas: Element[] = [];
  for (const nome of nomes) {
    const atuais = [...document.querySelectorAll(`[data-regiao="${nome}"]`)];
    const novas = [...nova.querySelectorAll(`[data-regiao="${nome}"]`)];
    atuais.forEach((atual, i) => {
      const nova = novas[i];
      if (!nova) return atual.remove();
      const adotada = document.importNode(nova, true);
      atual.replaceWith(adotada);
      trocadas.push(adotada);
    });
  }
  return trocadas;
}

/**
 * A faixa de recados do alto (data-recados): o recado que a página nova mostra no alto toma o lugar da faixa
 * de agora. Toda página com formulário no lugar tem a faixa, vazia e escondida quando não há recado. O
 * leitor de tela já ouve o recado por anunciar: a faixa nova entra sem o papel de região viva, para não ser
 * dita duas vezes.
 */
function trocarRecados(nova: Document): void {
  const atuais = [...document.querySelectorAll('[data-recados]')];
  const novas = [...nova.querySelectorAll('[data-recados]')].map((r) => document.importNode(r, true));
  if (!atuais.length || !novas.length) return;
  for (const recado of novas) for (const comPapel of [recado, ...recado.querySelectorAll('[role]')]) comPapel.removeAttribute('role');
  atuais[0]!.replaceWith(...novas);
  for (const sobra of atuais.slice(1)) sobra.remove();
}

/** Põe o foco num elemento que não é de foco, sem rolar a página. */
function focar(alvo: HTMLElement): void {
  if (!alvo.matches('a[href], button, input, select, textarea, [tabindex]')) alvo.tabIndex = -1;
  alvo.focus({ preventScroll: true });
}

/**
 * O título da seção onde um elemento está: o primeiro título (h1 a h6) que é filho direto, ou filho do
 * cabeçalho, do contêiner mais próximo que tem um, subindo a partir do pai do elemento. No bilhete do relato,
 * o nome de quem contou; fora dele, o título da parte da página ("Relatos").
 */
function tituloDaSecao(de: Element): HTMLElement | null {
  for (let pai = de.parentElement; pai; pai = pai.parentElement) {
    const titulo = pai.querySelector<HTMLElement>(':scope > :is(h1, h2, h3, h4, h5, h6), :scope > header :is(h1, h2, h3, h4, h5, h6)');
    if (titulo && !de.contains(titulo)) return titulo;
  }
  return null;
}

function ligar(form: HTMLFormElement): void {
  // Ligado uma vez só: a página da pessoa chama ligarNoLugar de novo, e com dois ouvintes cada toque mandava
  // o pedido duas vezes e dizia o recado duas vezes (a marca vazia contava como "não ligado"; revisão Z2)
  if (form.dataset.noLugarLigado !== undefined) return;
  form.dataset.noLugarLigado = '';
  devolverNaoSalvo(form);
  form.addEventListener('submit', async (evento) => {
    if (form.dataset.reserva) return;
    evento.preventDefault();
    const botao = (evento as SubmitEvent).submitter as HTMLButtonElement | null;
    const dados = new FormData(form);
    if (botao?.name) dados.set(botao.name, botao.value);
    // O tocado: o botão diz o que está acontecendo ("Salvando…"), e um segundo toque não manda de novo
    const botoes = [...form.querySelectorAll<HTMLButtonElement>('button')];
    if (form.getAttribute('aria-busy') === 'true') return;
    const rotulo = botao?.textContent ?? '';
    const marcar = () => {
      for (const b of botoes) b.disabled = true;
      if (botao && rotulo.trim()) botao.textContent = textoEnviando(rotulo);
      form.setAttribute('aria-busy', 'true');
      return () => {
        for (const b of botoes) b.disabled = false;
        if (botao) botao.textContent = rotulo;
        form.removeAttribute('aria-busy');
      };
    };
    const desfazer = marcar();
    await agir(
      {
        linha: linhaDoFormulario(form),
        // O botão já diz o que acontece ("Salvando…"); quando demora, o sinal aparece ao lado dele, e a voz diz
        controle: botao,
        leve: true,
        fazer: async () => {
          const resposta = await pedir(form.action, { method: 'POST', body: dados, headers: { Accept: 'text/html' } });
          const texto = await resposta.text();
          try {
            sessionStorage.removeItem(chaveDoNaoSalvo(form));
          } catch {
            // sem armazenamento, nada a limpar
          }
          desfazer();
          mostrarResposta(form, resposta.url, texto);
        },
        aoFalhar: (falha) => {
          if (falha.tipo === 'recusa') return;
          // O que foi escrito fica na tela e, se a página for aberta de novo, volta ao campo
          try {
            sessionStorage.setItem(chaveDoNaoSalvo(form), JSON.stringify({ quando: Date.now(), campos: camposDo(form) }));
          } catch {
            // sem armazenamento, o texto continua só na tela
          }
        },
      },
      () => {
        desfazer();
      },
    );
  });
}

/** A página que a rota devolveu: troca as regiões, põe o recado e cuida do foco. */
function mostrarResposta(form: HTMLFormElement, url: string, texto: string): void {
  const endereco = new URL(url);
  const erro = endereco.searchParams.get('erro');
  const ok = endereco.searchParams.get('ok');
  const nova = new DOMParser().parseFromString(texto, 'text/html');
  // O foco volta para a região que mudou: o botão tocado pode ter saído da tela
  const regiaoDoForm = form.closest('[data-regiao]');
  const nomeDaRegiao = regiaoDoForm?.getAttribute('data-regiao');
  // O título da seção onde a região estava, guardado antes da troca: se a região inteira sair, o foco vai
  // para ele (ou para o recado no alto, abaixo)
  const titulo = tituloDaSecao(regiaoDoForm ?? form);
  const trocadas = trocar((form.dataset.noLugar ?? '').split(/\s+/).filter(Boolean), nova);
  for (const regiao of trocadas) {
    ligarNoLugar(regiao);
    ligarReacoes(regiao);
    ligarMenus(regiao);
  }
  let regiaoSumiu = false;
  if (nomeDaRegiao && !document.contains(form)) {
    const regiao = document.querySelector<HTMLElement>(`[data-regiao="${nomeDaRegiao}"]`);
    // A região sem caixa (.regiao, display: contents) não recebe foco: ele vai para o que ela embrulha
    const alvo = regiao && getComputedStyle(regiao).display === 'contents' ? regiao.querySelector<HTMLElement>(':scope > *') : regiao;
    if (alvo) focar(alvo);
    else regiaoSumiu = true;
  }
  anunciar(erro ?? ok ?? 'Pronto.');
  // O recado de erro fica à vista no formulário. Se a troca levou o formulário embora (a resposta ao
  // pedido para liberar, que volta com o pedido de agora), vai para o mesmo formulário na página nova,
  // achado pela chave dele (data-chave)
  const chave = form.dataset.chave;
  const onde = document.contains(form) ? form : chave ? document.querySelector<HTMLFormElement>(`form[data-chave="${CSS.escape(chave)}"]`) : null;
  if (erro && onde) {
    onde.querySelector('.recado-no-lugar')?.remove();
    onde.prepend(Object.assign(document.createElement('p'), { className: 'recado-no-lugar campo__erro', textContent: erro }));
    // O formulário que mora num bloco que abre e fecha ("Como você chama") volta fechado na página nova:
    // o bloco abre, para o recado ficar à vista (revisão Z2)
    const bloco = onde.closest('details');
    if (bloco) bloco.open = true;
  }
  // Sem formulário onde mostrar (o pedido respondido saiu da lista, a sugestão aceita sumiu), o recado vai
  // para a faixa de recados do alto, o mesmo lugar onde a página o mostra depois de recarregar (decisão do
  // Gui, 22/11/2026)
  if ((erro || ok) && !onde) trocarRecados(nova);
  // A troca levou embora a região inteira em que estava o botão tocado (o "Liberar" no bilhete): o foco não
  // fica perdido no corpo da página. Vai para o recado no alto, quando há recado; senão, para o título da
  // seção onde a região estava ("Sem recarregar", em docs/decisoes.md; sessão AA)
  if (regiaoSumiu) {
    const recado = [...document.querySelectorAll<HTMLElement>('[data-recados]')].find((r) => !r.hidden && r.textContent?.trim());
    const alvo = recado ?? (titulo && document.contains(titulo) ? titulo : null);
    if (alvo) focar(alvo);
  }
}

export function ligarNoLugar(raiz: ParentNode = document): void {
  if (raiz instanceof HTMLFormElement && raiz.matches('form[data-no-lugar]')) ligar(raiz);
  for (const form of raiz.querySelectorAll<HTMLFormElement>('form[data-no-lugar]')) ligar(form);
}
