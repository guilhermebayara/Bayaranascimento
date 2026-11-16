// Estado "enviando" dos formulários comuns (QA de UX, 16/11/2026): ao enviar, o botão
// fica travado e diz o que está acontecendo, e um segundo toque não manda de novo.
// Formulários que enviam por script (memória, relato) cuidam disso sozinhos e
// cancelam o envio comum, então ficam de fora.
//
// O botão não recebe "disabled": um botão desabilitado sai dos dados do formulário,
// e vários formulários usam o name e o value do botão para saber a ação.

const VERBOS: [RegExp, string][] = [
  [/^salvar/i, 'Salvando…'],
  [/^adicionar/i, 'Adicionando…'],
  [/^remover/i, 'Removendo…'],
  [/^apagar/i, 'Apagando…'],
  [/^excluir/i, 'Excluindo…'],
  [/^descartar/i, 'Descartando…'],
  [/^restaurar/i, 'Restaurando…'],
  [/^criar/i, 'Criando…'],
  [/^cadastrar/i, 'Cadastrando…'],
  [/^publicar/i, 'Publicando…'],
  [/^juntar/i, 'Juntando…'],
  [/^trocar/i, 'Trocando…'],
  [/^refazer/i, 'Refazendo…'],
];

export function textoEnviando(rotulo: string): string {
  const achado = VERBOS.find(([verbo]) => verbo.test(rotulo.trim()));
  return achado ? achado[1] : 'Enviando…';
}

export function marcarEnvios(): void {
  addEventListener('submit', (evento) => {
    const form = evento.target as HTMLFormElement;
    if (evento.defaultPrevented || form.method.toLowerCase() !== 'post') return;
    if (form.dataset.enviando !== undefined) {
      evento.preventDefault();
      return;
    }
    form.dataset.enviando = '';
    const botao = (evento as SubmitEvent).submitter as HTMLButtonElement | null;
    if (botao && botao.matches('.botao')) {
      botao.dataset.rotulo = botao.textContent ?? '';
      botao.textContent = botao.dataset.enviando ?? textoEnviando(botao.textContent ?? '');
      botao.setAttribute('aria-disabled', 'true');
    }
  });
  // Voltando pelo histórico do navegador, a página pode vir da memória ainda "enviando"
  addEventListener('pageshow', () => {
    for (const form of document.querySelectorAll<HTMLFormElement>('form[data-enviando]')) delete form.dataset.enviando;
    for (const botao of document.querySelectorAll<HTMLButtonElement>('.botao[aria-disabled="true"][data-rotulo]')) {
      botao.textContent = botao.dataset.rotulo ?? botao.textContent;
      botao.removeAttribute('aria-disabled');
    }
  });
}
