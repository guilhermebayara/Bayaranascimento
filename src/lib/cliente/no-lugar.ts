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

function ligar(form: HTMLFormElement): void {
  if (form.dataset.noLugarLigado) return;
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
        const alvo = document.querySelector<HTMLElement>(`[data-regiao="${regiaoDoForm}"]`);
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
      }
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
