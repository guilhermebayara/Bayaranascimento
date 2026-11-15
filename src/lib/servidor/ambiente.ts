// Em que ambiente o pedido está, e com que banco e fotos ele trabalha.
//
// A homologação é a prévia da branch `homologa`, em homologa.memorias.bayara.com.br. Ela usa
// um banco e um bucket só dela, com a estrutura da família espelhada da produção e nomes e
// memórias inventados (ver espelho.ts). As outras prévias dividem o banco de teste, com o
// acervo de exemplo. A escolha é feita pelo endereço do pedido, porque o Cloudflare aplica a
// mesma configuração a todas as prévias.
import { AsyncLocalStorage } from 'node:async_hooks';
import { env } from 'cloudflare:workers';

export const ENDERECO_DA_HOMOLOGACAO = 'homologa.memorias.bayara.com.br';

const doPedido = new AsyncLocalStorage<{ homologa: boolean }>();

/** Roda o tratamento de um pedido sabendo se ele é da homologação. */
export function noPedido<T>(request: Request, tratar: () => T): T {
  const homologa = new URL(request.url).hostname === ENDERECO_DA_HOMOLOGACAO && Boolean(env.DB_HOMOLOGA && env.FOTOS_HOMOLOGA);
  return doPedido.run({ homologa }, tratar);
}

export function ehHomologacao(): boolean {
  return doPedido.getStore()?.homologa ?? false;
}

export type Ambiente = 'producao' | 'homologa' | 'previa' | 'desenvolvimento';

export function ambiente(): Ambiente {
  return ehHomologacao() ? 'homologa' : env.AMBIENTE;
}

export function banco(): D1Database {
  return ehHomologacao() ? env.DB_HOMOLOGA! : env.DB;
}

export function bucketDeFotos(): R2Bucket {
  return ehHomologacao() ? env.FOTOS_HOMOLOGA! : env.FOTOS;
}

/** Os únicos ambientes que recebem o acervo de exemplo. Produção e homologação nunca. */
export const AMBIENTES_COM_EXEMPLOS: Ambiente[] = ['previa', 'desenvolvimento'];
