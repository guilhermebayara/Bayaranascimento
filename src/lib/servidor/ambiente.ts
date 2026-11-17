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
  if (ehHomologacao()) return 'homologa';
  // No computador (npm run dev) é sempre desenvolvimento, com o acervo de exemplo, mesmo sem o .dev.vars.
  // Sem isso, o wrangler.jsonc dizia "producao" e o site abria vazio. No build, DEV é sempre falso.
  if (import.meta.env.DEV) return 'desenvolvimento';
  return env.AMBIENTE;
}

export function banco(): D1Database {
  return ehHomologacao() ? env.DB_HOMOLOGA! : env.DB;
}

export function bucketDeFotos(): R2Bucket {
  return ehHomologacao() ? env.FOTOS_HOMOLOGA! : env.FOTOS;
}

/** Os únicos ambientes que recebem o acervo de exemplo. Produção e homologação nunca. */
export const AMBIENTES_COM_EXEMPLOS: Ambiente[] = ['previa', 'desenvolvimento'];

/** As prévias de teste e o computador: onde o acervo de exemplo existe. */
export function temAcervoDeExemplo(): boolean {
  return AMBIENTES_COM_EXEMPLOS.includes(ambiente()) && !ehHomologacao();
}

/**
 * Onde as 11 fotos de exemplo (o Chico e a Karol) são lidas: debaixo de "exemplos/" no bucket de teste.
 * Nas prévias e na homologação, FOTOS é o bucket de teste (bloco "previews" do wrangler.jsonc); a
 * homologação só lê dele, e o bucket dela continua sendo FOTOS_HOMOLOGA. Na produção não existe.
 */
export function bucketDosExemplos(): R2Bucket | null {
  return ambiente() === 'producao' ? null : env.FOTOS;
}

/**
 * O bucket de teste, para gravar ou apagar: o envio das fotos de exemplo e a limpeza de 7 dias. Só nas
 * prévias e no computador. Na produção e na homologação, recusa.
 */
export function bucketDeTesteParaGravar(): R2Bucket {
  if (!AMBIENTES_COM_EXEMPLOS.includes(ambiente()) || ehHomologacao()) throw new Error('Só as prévias de teste gravam no bucket de teste.');
  return env.FOTOS;
}
