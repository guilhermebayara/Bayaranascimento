// Apelidos na ficha (decisão do Gui, 18/11/2026, depois da sessão H; regras em src/lib/apelidos.ts).
// O campo do apelido deixa de ficar sempre aberto: quem já tem apelido aparece com ele, com "Mudar" e
// "Tirar", e o que falta entra por "Adicionar apelido", que pergunta de quem é (da família ou só seu).
// Os campos são os de sempre (`apelido` e `meuApelido`), que vão com a ficha: o script só mostra e
// esconde. Sem script, os campos aparecem todos, cada um com quem vê.

type DeQuem = 'familia' | 'meu';

export function ligarApelidos(raiz: ParentNode): void {
  const caixa = raiz.querySelector<HTMLElement>('[data-apelidos]');
  if (!caixa) return;
  const campos = new Map<DeQuem, { rotulo: HTMLElement; entrada: HTMLInputElement; original: string; linha: HTMLElement | null }>();
  for (const rotulo of caixa.querySelectorAll<HTMLElement>('[data-apelido-campo]')) {
    const t = rotulo.dataset.apelidoCampo as DeQuem;
    const entrada = rotulo.querySelector<HTMLInputElement>('input')!;
    campos.set(t, { rotulo, entrada, original: entrada.dataset.original ?? '', linha: caixa.querySelector<HTMLElement>(`[data-apelido-linha="${t}"]`) });
  }
  const faltam = [...campos].filter(([, c]) => !c.original).map(([t]) => t);
  const adicionar = caixa.querySelector<HTMLButtonElement>('[data-apelido-adicionar]');
  const novo = caixa.querySelector<HTMLElement>('[data-apelido-novo]');
  const cancelar = caixa.querySelector<HTMLButtonElement>('[data-apelido-cancelar]');
  const escolhas = [...caixa.querySelectorAll<HTMLInputElement>('input[name="apelidoDeQuem"]')];
  // Os campos à vista: os que estão sendo mudados e o que está sendo acrescentado
  const abertos = new Set<DeQuem>();
  let acrescentando: DeQuem | null = null;

  const escolhido = (): DeQuem => (escolhas.find((r) => r.checked)?.value as DeQuem | undefined) ?? faltam[0] ?? 'familia';

  const mostrar = () => {
    for (const [t, c] of campos) {
      c.rotulo.hidden = !abertos.has(t);
      if (!c.linha) continue;
      c.linha.hidden = abertos.has(t);
      // "Tirar" esvazia o campo, que vai vazio com a ficha: a linha fica riscada até salvar ou desfazer
      const tirado = !abertos.has(t) && c.entrada.value.trim() === '';
      c.linha.classList.toggle('apelidos__um--tirado', tirado);
      c.linha.querySelector<HTMLElement>('[data-apelido-sai]')!.hidden = !tirado;
      c.linha.querySelector<HTMLElement>('[data-apelido-descricao]')!.hidden = tirado;
      c.linha.querySelector<HTMLElement>('[data-apelido-mudar]')!.hidden = tirado;
      c.linha.querySelector<HTMLElement>('[data-apelido-tirar]')!.hidden = tirado;
      c.linha.querySelector<HTMLElement>('[data-apelido-desfazer]')!.hidden = !tirado;
    }
    if (adicionar) adicionar.hidden = acrescentando !== null;
    if (novo) novo.hidden = acrescentando === null;
    for (const frase of caixa.querySelectorAll<HTMLElement>('[data-frase-do-apelido]')) frase.hidden = frase.dataset.fraseDoApelido !== (acrescentando ?? escolhido());
    if (cancelar) cancelar.hidden = abertos.size === 0;
    caixa.classList.toggle('apelidos--acrescentando', acrescentando !== null);
  };

  const focar = (t: DeQuem) => campos.get(t)?.entrada.focus();

  adicionar?.addEventListener('click', () => {
    acrescentando = escolhido();
    abertos.add(acrescentando);
    mostrar();
    // Com a pergunta, o foco vai para a escolha, que vem antes do campo; sem ela, direto para o campo
    if (escolhas.length > 0) escolhas.find((r) => r.checked)?.focus();
    else focar(acrescentando);
  });
  for (const r of escolhas) {
    r.addEventListener('change', () => {
      if (!acrescentando) return;
      const antes = acrescentando;
      acrescentando = escolhido();
      if (antes === acrescentando) return;
      // O que foi escrito vai junto para o tipo escolhido: é o mesmo apelido, só muda quem vê
      const escrito = campos.get(antes)!.entrada.value;
      campos.get(antes)!.entrada.value = '';
      abertos.delete(antes);
      campos.get(acrescentando)!.entrada.value = escrito;
      abertos.add(acrescentando);
      mostrar();
    });
  }
  for (const [t, c] of campos) {
    c.linha?.querySelector('[data-apelido-mudar]')?.addEventListener('click', () => {
      abertos.add(t);
      mostrar();
      focar(t);
    });
    c.linha?.querySelector('[data-apelido-tirar]')?.addEventListener('click', () => {
      c.entrada.value = '';
      mostrar();
      c.linha!.querySelector<HTMLElement>('[data-apelido-desfazer]')!.focus();
    });
    c.linha?.querySelector('[data-apelido-desfazer]')?.addEventListener('click', () => {
      c.entrada.value = c.original;
      mostrar();
      c.linha!.querySelector<HTMLElement>('[data-apelido-mudar]')!.focus();
    });
    // A ficha guardada nesta aba (a recusa do servidor, ou um laço salvo antes da ficha) devolve o que
    // foi escrito com um evento de "input": um campo escondido que mudou volta à vista
    c.entrada.addEventListener('input', () => {
      if (!c.rotulo.hidden) return;
      const valor = c.entrada.value.trim();
      if (valor && valor !== c.original) {
        abertos.add(t);
        if (!c.original) {
          acrescentando = t;
          const r = escolhas.find((x) => x.value === t);
          if (r) r.checked = true;
        }
      }
      mostrar();
    });
  }
  cancelar?.addEventListener('click', () => {
    for (const t of abertos) campos.get(t)!.entrada.value = campos.get(t)!.original;
    const voltaPara = acrescentando ? adicionar : [...abertos].map((t) => campos.get(t)!.linha?.querySelector<HTMLElement>('[data-apelido-mudar]')).find(Boolean);
    abertos.clear();
    acrescentando = null;
    mostrar();
    voltaPara?.focus();
  });
  mostrar();
}
