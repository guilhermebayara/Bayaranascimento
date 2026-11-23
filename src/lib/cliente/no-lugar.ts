// Interação sem recarregar a página ("Interação sem recarregar a página", em docs/visual.md; premissa do Gui
// de 18/11/2026). Um formulário marcado com data-no-lugar (os nomes das regiões, separados por espaço) é enviado pelo script; a rota
// responde como sempre (volta para a página, com o recado no endereço), o script lê a página que voltou e
// troca só as regiões nomeadas (os elementos com data-regiao), sem recarregar e sem perder a rolagem.
//
// Sem script, o mesmo formulário é um formulário comum, que recarrega: é a reserva. Se o pedido falhar, o
// formulário segue como comum. Depois de trocar, as regiões novas são ligadas de novo (reações, menus e
// os próprios formulários no lugar), e o recado é dito ao leitor de tela.
import { ligarMenus } from './menus';
import { ligarReacoes } from './reacoes';

let anuncio: HTMLElement | null = null;
function anunciar(texto: string): void {
  if (!anuncio) {
    anuncio = Object.assign(document.createElement('p'), { className: 'so-leitor' });
    anuncio.setAttribute('aria-live', 'polite');
    document.body.append(anuncio);
  }
  anuncio.textContent = '';
  // Um respiro, para o leitor de tela perceber a mudança mesmo com o mesmo texto
  window.setTimeout(() => (anuncio!.textContent = texto), 50);
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

function ligar(form: HTMLFormElement): void {
  // Ligado uma vez só: a página da pessoa chama ligarNoLugar de novo, e com dois ouvintes cada toque mandava
  // o pedido duas vezes e dizia o recado duas vezes (a marca vazia contava como "não ligado"; revisão Z2)
  if (form.dataset.noLugarLigado !== undefined) return;
  form.dataset.noLugarLigado = '';
  form.addEventListener('submit', async (evento) => {
    if (form.dataset.reserva) return;
    evento.preventDefault();
    const botao = (evento as SubmitEvent).submitter as HTMLButtonElement | null;
    const dados = new FormData(form);
    if (botao?.name) dados.set(botao.name, botao.value);
    // Enquanto envia: os botões travados e o texto do que acontece, como em todo formulário (enviando.ts)
    const botoes = [...form.querySelectorAll<HTMLButtonElement>('button')];
    for (const b of botoes) b.disabled = true;
    form.setAttribute('aria-busy', 'true');
    try {
      const resposta = await fetch(form.action, { method: 'POST', body: dados, headers: { Accept: 'text/html' } });
      if (!resposta.ok) throw new Error(String(resposta.status));
      const endereco = new URL(resposta.url);
      const erro = endereco.searchParams.get('erro');
      const ok = endereco.searchParams.get('ok');
      const nova = new DOMParser().parseFromString(await resposta.text(), 'text/html');
      // O foco volta para a região que mudou: o botão tocado pode ter saído da tela
      const regiaoDoForm = form.closest('[data-regiao]')?.getAttribute('data-regiao');
      const trocadas = trocar((form.dataset.noLugar ?? '').split(/\s+/).filter(Boolean), nova);
      for (const regiao of trocadas) {
        ligarNoLugar(regiao);
        ligarReacoes(regiao);
        ligarMenus(regiao);
      }
      if (regiaoDoForm && !document.contains(form)) {
        const regiao = document.querySelector<HTMLElement>(`[data-regiao="${regiaoDoForm}"]`);
        // A região sem caixa (.regiao, display: contents) não recebe foco: ele vai para o que ela embrulha
        const alvo = regiao && getComputedStyle(regiao).display === 'contents' ? regiao.querySelector<HTMLElement>(':scope > *') : regiao;
        if (alvo) {
          alvo.tabIndex = -1;
          alvo.focus({ preventScroll: true });
        }
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
    } catch {
      // A reserva: o formulário comum, que recarrega
      form.dataset.reserva = '';
      if (botao?.name) form.append(Object.assign(document.createElement('input'), { type: 'hidden', name: botao.name, value: botao.value }));
      form.submit();
      return;
    } finally {
      for (const b of botoes) b.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}

export function ligarNoLugar(raiz: ParentNode = document): void {
  if (raiz instanceof HTMLFormElement && raiz.matches('form[data-no-lugar]')) ligar(raiz);
  for (const form of raiz.querySelectorAll<HTMLFormElement>('form[data-no-lugar]')) ligar(form);
}
