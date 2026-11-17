// Busca de pessoa: troca uma lista suspensa longa por um campo com sugestões
// (decisão do Gui, 16/11/2026). A lista original continua no formulário, escondida:
// é ela que vai para o servidor e que avisa a página com "change". Sem JavaScript,
// a lista aparece como antes.
//
// Com `nomeNovo`, a última sugestão é "Cadastrar «nome»", que preenche o campo de
// pessoa nova (também escondido) e deixa a lista vazia.
//
// Quem muda o valor da lista por código avisa com o evento "busca:atualizar" nela.

const simples = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const MAXIMO = 8;
let contador = 0;

interface Sugestao {
  valor: string;
  texto: string;
  novo?: boolean;
}

export function buscaDePessoa(lista: HTMLSelectElement, opcoes: { nomeNovo?: HTMLInputElement; dica?: string } = {}): void {
  if (lista.dataset.busca !== undefined) return;
  lista.dataset.busca = '';
  const { nomeNovo } = opcoes;
  const id = `busca-${++contador}`;

  const caixa = document.createElement('div');
  caixa.className = 'busca';
  const campo = document.createElement('input');
  campo.type = 'text';
  campo.className = 'busca__campo';
  campo.autocomplete = 'off';
  campo.setAttribute('role', 'combobox');
  campo.setAttribute('aria-autocomplete', 'list');
  campo.setAttribute('aria-expanded', 'false');
  campo.setAttribute('aria-controls', `${id}-lista`);
  const vazia = [...lista.options].find((o) => o.value === '');
  campo.placeholder = opcoes.dica ?? (nomeNovo ? 'Escreva o nome' : (vazia?.text ?? 'Escreva o nome'));
  const sugestoes = document.createElement('ul');
  sugestoes.className = 'busca__lista';
  sugestoes.id = `${id}-lista`;
  sugestoes.setAttribute('role', 'listbox');
  // A lista rola, e o navegador dá foco a caixa que rola: o Tab parava nela e o foco sumia
  sugestoes.tabIndex = -1;
  sugestoes.hidden = true;
  caixa.append(campo, sugestoes);

  // O rótulo da lista passa a ser do campo
  if (lista.id) {
    document.querySelector(`label[for="${lista.id}"]`)?.setAttribute('for', `${id}-campo`);
  }
  campo.id = `${id}-campo`;
  const rotulo = lista.closest('label');
  if (!rotulo && lista.getAttribute('aria-label')) campo.setAttribute('aria-label', lista.getAttribute('aria-label')!);

  lista.after(caixa);
  lista.hidden = true;
  lista.tabIndex = -1;
  if (nomeNovo) {
    // O campo de nome novo some: a sugestão "Cadastrar" faz o papel dele
    const rotuloNovo = nomeNovo.closest('label');
    (rotuloNovo ?? nomeNovo).hidden = true;
  }

  let atuais: Sugestao[] = [];
  let ativa = -1;

  const textoDaLista = () => {
    if (nomeNovo?.value.trim()) return nomeNovo.value.trim();
    const escolhida = lista.selectedOptions[0];
    return escolhida && escolhida.value ? escolhida.text : '';
  };
  const sincronizar = () => {
    campo.value = textoDaLista();
  };

  const fechar = () => {
    sugestoes.hidden = true;
    campo.setAttribute('aria-expanded', 'false');
    campo.removeAttribute('aria-activedescendant');
    ativa = -1;
  };

  const marcarAtiva = (indice: number) => {
    ativa = indice;
    [...sugestoes.children].forEach((item, i) => item.setAttribute('aria-selected', String(i === indice)));
    if (indice >= 0) {
      campo.setAttribute('aria-activedescendant', `${id}-op-${indice}`);
      sugestoes.children[indice]?.scrollIntoView({ block: 'nearest' });
    } else campo.removeAttribute('aria-activedescendant');
  };

  const mostrar = (termo: string) => {
    const t = simples(termo);
    const todas = [...lista.options].filter((o) => o.value !== '' && !o.disabled).map((o) => ({ valor: o.value, texto: o.text }));
    atuais = (t ? todas.filter((o) => simples(o.texto).includes(t)) : todas).slice(0, t ? MAXIMO : todas.length);
    if (nomeNovo && termo.trim() && !todas.some((o) => simples(o.texto) === t)) {
      atuais.push({ valor: '', texto: termo.trim(), novo: true });
    }
    sugestoes.replaceChildren(
      ...atuais.map((s, i) => {
        const item = document.createElement('li');
        item.id = `${id}-op-${i}`;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', 'false');
        if (s.novo) {
          item.className = 'busca__novo';
          item.textContent = `Cadastrar ${s.texto}`;
        } else item.textContent = s.texto;
        // mousedown, para escolher antes de o campo perder o foco
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          escolher(s);
        });
        return item;
      }),
    );
    if (atuais.length === 0) {
      const item = document.createElement('li');
      item.className = 'busca__vazio';
      item.textContent = 'Ninguém com esse nome';
      sugestoes.append(item);
    }
    sugestoes.hidden = false;
    campo.setAttribute('aria-expanded', 'true');
    marcarAtiva(-1);
  };

  const avisar = () => lista.dispatchEvent(new Event('change', { bubbles: true }));

  function escolher(s: Sugestao) {
    if (s.novo && nomeNovo) {
      lista.value = '';
      nomeNovo.value = s.texto;
    } else {
      lista.value = s.valor;
      if (nomeNovo) nomeNovo.value = '';
    }
    campo.value = s.texto;
    fechar();
    avisar();
    // Quem depende do nome novo (o "Como se referir") fica sabendo
    nomeNovo?.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Ao sair do campo sem escolher: o nome igual a alguém da lista vale como escolha;
  // com pessoa nova permitida, o texto vira o nome novo; sem ela, volta o que estava.
  const resolver = () => {
    const t = simples(campo.value);
    if (!t) {
      if (lista.value || nomeNovo?.value) {
        lista.value = [...lista.options].some((o) => o.value === '') ? '' : lista.value;
        if (nomeNovo) nomeNovo.value = '';
        avisar();
      }
      sincronizar();
      return;
    }
    if (t === simples(textoDaLista())) return;
    const igual = [...lista.options].find((o) => o.value !== '' && !o.disabled && simples(o.text) === t);
    if (igual) escolher({ valor: igual.value, texto: igual.text });
    else if (nomeNovo) escolher({ valor: '', texto: campo.value.trim(), novo: true });
    else sincronizar();
  };

  campo.addEventListener('focus', () => mostrar(campo.value === textoDaLista() ? '' : campo.value));
  campo.addEventListener('input', () => mostrar(campo.value));
  campo.addEventListener('blur', () => {
    resolver();
    fechar();
  });
  // O "change" do campo não é da página: quem escuta é a lista
  campo.addEventListener('change', (e) => e.stopPropagation());
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (sugestoes.hidden) mostrar(campo.value);
      if (!atuais.length) return;
      const passo = e.key === 'ArrowDown' ? 1 : -1;
      marcarAtiva((ativa + passo + atuais.length) % atuais.length);
    } else if (e.key === 'Enter') {
      // Enter na busca nunca envia o formulário, em todo o site (resposta do Gui à 47-N6, 17/11/2026):
      // ele escolhe a sugestão marcada, ou a única, ou resolve o que foi escrito, e o formulário fica
      e.preventDefault();
      if (!sugestoes.hidden && ativa >= 0) escolher(atuais[ativa]);
      else if (!sugestoes.hidden && atuais.length === 1) escolher(atuais[0]);
      else {
        resolver();
        fechar();
      }
    } else if (e.key === 'Escape') {
      if (!sugestoes.hidden) {
        e.preventDefault();
        fechar();
      }
    }
  });
  lista.addEventListener('busca:atualizar', sincronizar);
  nomeNovo?.addEventListener('input', () => {
    if (document.activeElement !== campo) sincronizar();
  });
  // A lista também muda por código ou ao recarregar o formulário guardado
  lista.addEventListener('change', () => {
    if (document.activeElement !== campo) sincronizar();
  });
  lista.form?.addEventListener('submit', resolver, { capture: true });
  lista.form?.addEventListener('reset', () => setTimeout(sincronizar));
  sincronizar();
}
