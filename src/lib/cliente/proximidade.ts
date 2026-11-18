// O slider de proximidade nos formulários (CampoProximidade.astro): a faixa acompanha o slider, para a
// tela e para o leitor de tela. Na edição dos laços (ProximidadeDoLaco.astro), o slider guarda sozinho,
// no lugar, um pouco depois de a pessoa soltar (ou parar nas setas): é o ajuste do dia a dia, como no
// círculo. O envio é o de no-lugar.ts, e sem script fica o botão "Salvar a proximidade".
import { nomeDaProximidade, valorDaPosicao } from '../circulo';

/** Quanto esperar depois do último movimento antes de guardar: as setas do teclado mudam a cada toque */
const ESPERA = 600;

export function ligarProximidades(raiz: ParentNode = document): void {
  for (const bloco of raiz.querySelectorAll<HTMLElement>('[data-proximidade]')) {
    if (bloco.dataset.proximidadeLigada !== undefined) continue;
    bloco.dataset.proximidadeLigada = '';
    const slider = bloco.querySelector<HTMLInputElement>('input[type="range"]');
    if (!slider) continue;
    const faixa = bloco.querySelector('output');
    const refletir = () => {
      const nome = nomeDaProximidade(valorDaPosicao(Number(slider.value)));
      slider.setAttribute('aria-valuetext', nome);
      if (faixa) faixa.textContent = nome;
    };
    slider.addEventListener('input', refletir);
    refletir();

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
