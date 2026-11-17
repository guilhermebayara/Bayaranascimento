// A troca sem recarregar do Explorar (src/lib/cliente/explorar-troca.ts) diante de erros de rede.
// Achado do QA de código de 17/11/2026: quando o pedido de uma escolha antiga falhava depois de a pessoa
// já ter feito outra escolha, a página ia para o endereço antigo e desfazia a escolha nova.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { trocar } from '../src/lib/cliente/explorar-troca';

function pedidoPendente() {
  let falhar!: (erro: Error) => void;
  const promessa = new Promise<Response>((_, rejeitar) => (falhar = rejeitar));
  return { promessa, falhar };
}

function prepararNavegador(pedidos: Promise<Response>[]) {
  const regiao = { setAttribute: vi.fn() };
  const assign = vi.fn();
  vi.stubGlobal('document', { querySelector: () => regiao });
  vi.stubGlobal('location', { assign });
  vi.stubGlobal('fetch', vi.fn(() => pedidos.shift()!));
  return { assign };
}

const esperar = () => new Promise((r) => setTimeout(r, 0));

describe('troca sem recarregar com erro de rede', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('erro de uma escolha antiga não leva de volta ao endereço antigo', async () => {
    const antigo = pedidoPendente();
    const novo = pedidoPendente();
    const { assign } = prepararNavegador([antigo.promessa, novo.promessa]);
    const a = trocar(new URL('http://site/explorar?tipo=festa'), { empurrar: true });
    const b = trocar(new URL('http://site/explorar?tipo=viagem'), { empurrar: true });
    antigo.falhar(new Error('rede'));
    await a;
    await esperar();
    expect(assign).not.toHaveBeenCalled();
    // O erro da escolha mais nova cai na navegação comum, como antes
    novo.falhar(new Error('rede'));
    await b;
    expect(assign).toHaveBeenCalledTimes(1);
    expect(String(assign.mock.calls[0]![0])).toBe('http://site/explorar?tipo=viagem');
  });

  it('erro na única escolha cai na navegação comum', async () => {
    const unico = pedidoPendente();
    const { assign } = prepararNavegador([unico.promessa]);
    const a = trocar(new URL('http://site/explorar?ver=mural'), { empurrar: true });
    unico.falhar(new Error('rede'));
    await a;
    expect(String(assign.mock.calls[0]![0])).toBe('http://site/explorar?ver=mural');
  });
});
