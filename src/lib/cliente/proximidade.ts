// O slider de proximidade nos formulários (CampoProximidade.astro): a faixa acompanha o slider, para a
// tela e para o leitor de tela. Na edição dos laços (ProximidadeDoLaco.astro), o slider guarda sozinho,
// no lugar, um pouco depois de a pessoa soltar (ou parar nas setas): é o ajuste do dia a dia, como no
// círculo. O envio é o de no-lugar.ts, e sem script fica o botão "Salvar a proximidade".
import { faixasDoSlider, lugarNoSlider, minimoDoSlider, nomeDaProximidade, porcentagemNoSlider, posicaoDoLugar, valorDaPosicao } from '../circulo';

/** Quanto esperar depois do último movimento antes de guardar: as setas do teclado mudam a cada toque */
const ESPERA = 600;

/**
 * Acerta o desenho com o lugar do slider: a faixa de agora, no alto e embaixo do trecho dela, e o
 * preenchimento. Dentro do trecho de fora, o botão assenta no meio: é um lugar só.
 */
export function refletirProximidade(bloco: HTMLElement): void {
  const slider = bloco.querySelector<HTMLInputElement>('input[type="range"]');
  if (!slider) return;
  const comFora = bloco.dataset.comFora !== undefined;
  if (comFora && Number(slider.value) < 1) slider.value = String(lugarNoSlider(100, true));
  const nome = nomeDaProximidade(valorDaPosicao(posicaoDoLugar(Number(slider.value))));
  slider.setAttribute('aria-valuetext', nome);
  const saida = bloco.querySelector('output');
  if (saida) saida.textContent = nome;
  bloco.style.setProperty('--pos', String(porcentagemNoSlider(Number(slider.value), comFora)));
  for (const f of bloco.querySelectorAll<HTMLElement>('[data-faixa]')) f.toggleAttribute('data-atual', f.dataset.faixa === nome);
}

/** Pelo teclado, sair de fora leva direto ao começo de Conhecido, sem atravessar o trecho. */
function sairDeFora(bloco: HTMLElement, slider: HTMLInputElement): void {
  slider.addEventListener('keydown', (e) => {
    if (bloco.dataset.comFora === undefined || Number(slider.value) >= 1) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    slider.value = '1';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/**
 * A peça Proximidade montada no navegador, para a ficha do círculo: a mesma marcação de
 * src/components/visual/Proximidade.astro, com "Fora do círculo".
 */
export function criarProximidade(id: string, valor: number): { bloco: HTMLElement; slider: HTMLInputElement } {
  const faixas = faixasDoSlider(true);
  const lugar = lugarNoSlider(valor, true);
  const el = <K extends keyof HTMLElementTagNameMap>(marca: K, classe?: string) => Object.assign(document.createElement(marca), classe ? { className: classe } : {});
  const bloco = el('div', 'prox prox--com-fora');
  bloco.dataset.proximidade = '';
  bloco.dataset.comFora = '';
  bloco.style.setProperty('--fora', String(faixas[0]!.ate));
  bloco.style.setProperty('--colunas', faixas.map((f) => `${f.largura}fr`).join(' '));
  const alto = el('div', 'prox__alto');
  const rotulo = Object.assign(el('label'), { htmlFor: id, textContent: 'Proximidade' });
  const saida = Object.assign(el('output'), { htmlFor: id });
  alto.append(rotulo, saida);
  const barra = el('div', 'prox__barra');
  const marcas = el('span', 'prox__marcas');
  marcas.setAttribute('aria-hidden', 'true');
  for (const f of faixas.slice(0, -1)) {
    const marca = el('i');
    marca.style.setProperty('--em', String(f.ate));
    marcas.append(marca);
  }
  const slider = Object.assign(el('input'), { type: 'range', id, min: String(minimoDoSlider(true)), max: '100', step: '1', value: String(lugar) });
  barra.append(el('span', 'prox__fora'), el('span', 'prox__trilho'), el('span', 'prox__cheio'), marcas, slider);
  const nomes = el('div', 'prox__faixas');
  nomes.setAttribute('aria-hidden', 'true');
  for (const f of faixas) {
    const nome = Object.assign(el('span'), { textContent: f.curto });
    nome.dataset.faixa = f.nome;
    nomes.append(nome);
  }
  bloco.append(alto, barra, nomes);
  slider.addEventListener('input', () => refletirProximidade(bloco));
  sairDeFora(bloco, slider);
  refletirProximidade(bloco);
  return { bloco, slider };
}

export function ligarProximidades(raiz: ParentNode = document): void {
  for (const bloco of raiz.querySelectorAll<HTMLElement>('[data-proximidade]')) {
    if (bloco.dataset.proximidadeLigada !== undefined) continue;
    bloco.dataset.proximidadeLigada = '';
    const slider = bloco.querySelector<HTMLInputElement>('input[type="range"]');
    if (!slider) continue;
    slider.addEventListener('input', () => refletirProximidade(bloco));
    sairDeFora(bloco, slider);
    refletirProximidade(bloco);

    const form = slider.form;
    if (!form || !form.matches('[data-proximidade-no-lugar]')) continue;
    // Guardando sozinho, cada mudança é de propósito: a posição de quando a página abriu não serve mais
    form.querySelector('input[name="posicaoAntes"]')?.remove();
    const salvar = form.querySelector<HTMLElement>('[data-salvar-proximidade]');
    if (salvar) salvar.hidden = true;
    let espera = 0;
    const enviar = () => {
      // Um envio de cada vez: o seguinte espera o anterior voltar
      if (form.getAttribute('aria-busy') === 'true') {
        espera = window.setTimeout(enviar, 300);
        return;
      }
      form.requestSubmit();
    };
    slider.addEventListener('change', () => {
      clearTimeout(espera);
      espera = window.setTimeout(enviar, ESPERA);
    });
  }
}
