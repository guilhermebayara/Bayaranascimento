// "Quem estava?" na memória: marcados no alto, busca pelo nome e sugestões tiradas dos laços.
// As caixas de verdade ficam na lista inteira (src/components/QuemEstava.astro); as pílulas
// daqui são atalhos ligados a elas, então o formulário envia sempre a mesma coisa.

interface Dados {
  eu: string;
  proximos: Record<string, string[]>;
  nomes: Record<string, string>;
  busca: Record<string, string>;
}

const simples = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const MAXIMO_SUGESTOES = 12;
const MAXIMO_RESULTADOS = 12;

/** As sugestões: sem ninguém marcado, quem escreve e a família dela; depois, a família de quem foi marcado. */
export function sugerir(dados: Pick<Dados, 'eu' | 'proximos' | 'nomes'>, marcados: string[]): { titulo: string; ids: string[] } {
  const ordenar = (ids: string[], peso: Map<string, number>) =>
    ids.sort((a, b) => (peso.get(b) ?? 0) - (peso.get(a) ?? 0) || (dados.nomes[a] ?? a).localeCompare(dados.nomes[b] ?? b, 'pt-BR'));
  if (marcados.length === 0) {
    const ids = [dados.eu, ...(dados.proximos[dados.eu] ?? [])].filter((id, i, todos) => dados.nomes[id] && todos.indexOf(id) === i);
    return { titulo: 'Você e sua família', ids: ids.slice(0, MAXIMO_SUGESTOES) };
  }
  // Quanto mais pessoas marcadas têm laço com alguém, mais ele sobe na lista
  const peso = new Map<string, number>();
  for (const m of marcados) {
    for (const p of dados.proximos[m] ?? []) {
      if (!marcados.includes(p) && dados.nomes[p]) peso.set(p, (peso.get(p) ?? 0) + 1);
    }
  }
  if (!marcados.includes(dados.eu) && dados.nomes[dados.eu]) peso.set(dados.eu, Math.max(peso.get(dados.eu) ?? 0, 0.5));
  return { titulo: 'Família de quem você marcou', ids: ordenar([...peso.keys()], peso).slice(0, MAXIMO_SUGESTOES) };
}

/** Sem `cadastrar`, a busca não oferece "Cadastrar Fulano" (é o caso do capítulo). */
export function ligarQuemEstava(raiz: HTMLElement, cadastrar?: (nome: string) => void): void {
  const bruto = raiz.querySelector('[data-dados-pessoas]')?.textContent;
  if (!bruto) return;
  const dados = JSON.parse(bruto) as Dados;
  const caixas = new Map([...raiz.querySelectorAll<HTMLInputElement>('input[name="pessoas"]')].map((c) => [c.value, c]));
  const marcadosEl = raiz.querySelector<HTMLElement>('[data-marcados]')!;
  const listaMarcados = raiz.querySelector<HTMLElement>('[data-lista-marcados]')!;
  const sugestoesEl = raiz.querySelector<HTMLElement>('[data-sugestoes]')!;
  const listaSugestoes = raiz.querySelector<HTMLElement>('[data-lista-sugestoes]')!;
  const tituloSugestoes = raiz.querySelector<HTMLElement>('[data-titulo-sugestoes]')!;
  const resultados = raiz.querySelector<HTMLElement>('[data-resultados]')!;
  const busca = raiz.querySelector<HTMLInputElement>('[data-buscar-pessoas]')!;
  const todos = raiz.querySelector<HTMLDetailsElement>('[data-todos]')!;

  // Com script, a lista inteira começa recolhida e a busca aparece
  todos.open = false;
  for (const el of raiz.querySelectorAll<HTMLElement>('[data-so-com-script]')) el.hidden = false;

  const marcados = () => [...caixas.values()].filter((c) => c.checked).map((c) => c.value);

  // Uma pílula que é atalho para a caixa de verdade
  const atalho = (id: string) => {
    const rotulo = document.createElement('label');
    rotulo.className = 'opcao';
    const caixa = document.createElement('input');
    caixa.type = 'checkbox';
    caixa.dataset.atalho = id;
    caixa.checked = caixas.get(id)?.checked ?? false;
    caixa.addEventListener('change', () => {
      const real = caixas.get(id);
      if (!real) return;
      real.checked = caixa.checked;
      real.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const nome = document.createElement('span');
    nome.textContent = dados.nomes[id] ?? id;
    rotulo.append(caixa, nome);
    return rotulo;
  };

  const desenharResultados = () => {
    const termo = simples(busca.value);
    if (!termo) {
      resultados.hidden = true;
      resultados.replaceChildren();
      return;
    }
    const achados = [...caixas.keys()].filter((id) => simples(dados.busca[id] ?? '').includes(termo)).slice(0, MAXIMO_RESULTADOS);
    const itens: HTMLElement[] = achados.map(atalho);
    const exato = achados.some((id) => simples(dados.nomes[id] ?? '') === termo);
    if (cadastrar && !exato && busca.value.trim().length >= 2) {
      const novo = document.createElement('button');
      novo.type = 'button';
      novo.className = 'botao botao--leve';
      novo.textContent = `Cadastrar ${busca.value.trim()}`;
      novo.addEventListener('click', () => {
        cadastrar(busca.value.trim());
        busca.value = '';
        desenharResultados();
      });
      itens.push(novo);
    }
    if (achados.length === 0) {
      const vazio = document.createElement('p');
      vazio.className = 'dica';
      vazio.textContent = 'Ninguém com esse nome no acervo.';
      itens.unshift(vazio);
    }
    resultados.replaceChildren(...itens);
    resultados.hidden = false;
  };

  const desenhar = () => {
    // Redesenhar troca as pílulas: quem estava com o foco numa delas continua na mesma pessoa
    const foco = document.activeElement instanceof HTMLInputElement && raiz.contains(document.activeElement) ? document.activeElement.dataset.atalho : undefined;
    const ondeFoco = foco ? document.activeElement!.closest('[data-lista-marcados], [data-lista-sugestoes], [data-resultados]') : null;
    const ids = marcados();
    marcadosEl.hidden = ids.length === 0;
    listaMarcados.replaceChildren(...ids.map(atalho));
    const sugestao = sugerir(dados, ids);
    tituloSugestoes.textContent = sugestao.titulo;
    sugestoesEl.hidden = sugestao.ids.length === 0;
    listaSugestoes.replaceChildren(...sugestao.ids.map(atalho));
    desenharResultados();
    if (foco) {
      const mesmo = (ondeFoco?.isConnected ? ondeFoco : raiz).querySelector<HTMLInputElement>(`[data-atalho="${CSS.escape(foco)}"]`) ?? raiz.querySelector<HTMLInputElement>(`[data-atalho="${CSS.escape(foco)}"]`);
      mesmo?.focus();
    }
  };

  busca.addEventListener('input', desenharResultados);
  // Enter na busca não envia o formulário: marca o único nome achado
  busca.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const unico = resultados.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    if (unico.length === 1 && !unico[0].checked) unico[0].click();
  });
  for (const caixa of caixas.values()) caixa.addEventListener('change', desenhar);
  desenhar();
}
