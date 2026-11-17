// Quando o servidor recusa um formulário, a página volta com ?erro= e o formulário viria vazio. Achado do
// QA de 15/11/2026, corrigido a pedido do Gui: o que foi digitado é guardado na sessão desta aba ao enviar,
// e volta para os campos se a página chegar com erro. Com sucesso, é apagado.
// Fica só neste navegador e nesta aba (sessionStorage), e some quando a aba fecha.

export type Guardado = { quando: number; campos: { nome: string; valor?: string; marcado?: boolean; valores?: string[] }[] };

const PREFIXO = 'formulario:';
const VALIDADE = 30 * 60 * 1000;

const chaveDo = (form: HTMLFormElement, indice: number) => `${PREFIXO}${location.pathname}:${form.getAttribute('action') ?? ''}:${indice}`;

/** O que está nos campos de um formulário agora, no formato em que é guardado. */
export function camposDo(form: HTMLFormElement): Guardado['campos'] {
  const campos: Guardado['campos'] = [];
  for (const el of form.elements) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) continue;
    if (!el.name || el.disabled) continue;
    if (el instanceof HTMLInputElement) {
      if (['file', 'hidden', 'password', 'submit', 'button'].includes(el.type)) continue;
      if (el.type === 'checkbox' || el.type === 'radio') campos.push({ nome: `${el.name}=${el.value}`, marcado: el.checked });
      else campos.push({ nome: el.name, valor: el.value });
    } else if (el instanceof HTMLSelectElement && el.multiple) {
      campos.push({ nome: el.name, valores: [...el.selectedOptions].map((o) => o.value) });
    } else campos.push({ nome: el.name, valor: el.value });
  }
  return campos;
}

function guardar(form: HTMLFormElement, chave: string): void {
  const campos = camposDo(form);
  try {
    sessionStorage.setItem(chave, JSON.stringify({ quando: Date.now(), campos } satisfies Guardado));
  } catch {
    // Sem sessionStorage (navegação privada em alguns aparelhos), o formulário só não é refeito
  }
}

export function devolver(form: HTMLFormElement, guardado: Guardado): void {
  const mudados = new Set<Element>();
  for (const campo of guardado.campos) {
    if (campo.marcado !== undefined) {
      const [nome, valor] = [campo.nome.slice(0, campo.nome.indexOf('=')), campo.nome.slice(campo.nome.indexOf('=') + 1)];
      const el = [...form.querySelectorAll<HTMLInputElement>(`input[name="${CSS.escape(nome)}"]`)].find((i) => i.value === valor);
      if (el && el.checked !== campo.marcado) {
        el.checked = campo.marcado;
        mudados.add(el);
      }
      continue;
    }
    const el = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${CSS.escape(campo.nome)}"]`);
    if (!el) continue;
    if (campo.valores && el instanceof HTMLSelectElement) for (const o of el.options) o.selected = campo.valores.includes(o.value);
    else if (campo.valor !== undefined) el.value = campo.valor;
    mudados.add(el);
  }
  // O que depende dos campos (abas do laço, datas da época, aviso de data) se acerta com os eventos de sempre
  for (const el of mudados) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

export function guardarFormularios(): void {
  const comErro = new URL(location.href).searchParams.has('erro');
  const formularios = [...document.querySelectorAll<HTMLFormElement>('form')].filter((f) => (f.getAttribute('method') ?? '').toLowerCase() === 'post');
  formularios.forEach((form, indice) => {
    const chave = chaveDo(form, indice);
    let guardado: Guardado | undefined;
    try {
      const bruto = sessionStorage.getItem(chave);
      guardado = bruto ? (JSON.parse(bruto) as Guardado) : undefined;
      sessionStorage.removeItem(chave);
    } catch {
      guardado = undefined;
    }
    if (comErro && guardado && Date.now() - guardado.quando < VALIDADE) devolver(form, guardado);
    form.addEventListener('submit', () => guardar(form, chave));
  });
}
