// A troca sem recarregar do Explorar (src/lib/cliente/explorar-troca.ts) diante de erros de rede.
// Achado do QA de código de 17/11/2026: quando o pedido de uma escolha antiga falhava depois de a pessoa
// já ter feito outra escolha, a página ia para o endereço antigo e desfazia a escolha nova.
// Exploração E4 (peça de estado): a falha não leva mais a pessoa para fora da página. Ela fica onde está,
// com a marca de volta (proposta A) e a frase da falha na linha da conta.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { trocar } from '../src/lib/cliente/explorar-troca';

function pedidoPendente() {
  let falhar!: (erro: Error) => void;
  const promessa = new Promise<Response>((_, rejeitar) => (falhar = rejeitar));
  return { promessa, falhar };
}

function prepararNavegador(pedidos: Promise<Response>[]) {
  const regiao = { setAttribute: vi.fn(), removeAttribute: vi.fn(), querySelector: () => null };
  const assign = vi.fn();
  vi.stubGlobal('document', { querySelector: (seletor: string) => (seletor === '[data-explorar]' ? regiao : null), documentElement: { dataset: {} } });
  vi.stubGlobal('location', { assign });
  vi.stubGlobal('fetch', vi.fn(() => pedidos.shift()!));
  return { assign };
}

const esperar = () => new Promise((r) => setTimeout(r, 0));

describe('troca sem recarregar com erro de rede', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('erro de uma escolha antiga não mexe em nada nem leva a pessoa embora', async () => {
    const antigo = pedidoPendente();
    const novo = pedidoPendente();
    const { assign } = prepararNavegador([antigo.promessa, novo.promessa]);
    const desfazerAntigo = vi.fn();
    const desfazerNovo = vi.fn();
    const a = trocar(new URL('http://site/explorar?tipo=festa'), { empurrar: true, desfazer: desfazerAntigo });
    const b = trocar(new URL('http://site/explorar?tipo=viagem'), { empurrar: true, desfazer: desfazerNovo });
    antigo.falhar(new TypeError('Failed to fetch'));
    await a;
    await esperar();
    expect(assign).not.toHaveBeenCalled();
    expect(desfazerAntigo).not.toHaveBeenCalled();
    // O erro da escolha mais nova também fica na página: a marca volta ao que estava na tela
    novo.falhar(new TypeError('Failed to fetch'));
    await b;
    expect(assign).not.toHaveBeenCalled();
    expect(desfazerNovo).toHaveBeenCalledTimes(1);
  });

  it('erro na única escolha fica na página', async () => {
    const unico = pedidoPendente();
    const { assign } = prepararNavegador([unico.promessa]);
    const a = trocar(new URL('http://site/explorar?ver=mural'), { empurrar: true });
    unico.falhar(new Error('500'));
    await a;
    expect(assign).not.toHaveBeenCalled();
  });
});
