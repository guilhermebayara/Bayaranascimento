// Que tipo de pedido é, para o middleware saber o que ler no começo (aquecerOPedido, em repositorio.ts).
import type { ComecoDoPedido } from './repositorio';

/** As rotas que entregam um arquivo do bucket: só conferem quem vê (causa 3a da medição M1). */
export const ROTA_DE_ARQUIVO = /^\/(fotos|audios|retratos)\//;

/** Que começo o pedido lê num lote só. */
export function comecoDoPedido(caminho: string): ComecoDoPedido {
  if (ROTA_DE_ARQUIVO.test(caminho)) return 'arquivo';
  if (/^\/api(\/|$)/.test(caminho)) return 'rota';
  return 'pagina';
}

/** As páginas mostram os apelidos de quem olha; as rotas, os arquivos e a administração, os de sempre. */
export const usaApelidosDeQuemOlha = (caminho: string): boolean => !/^\/(api|admin)(\/|$)/.test(caminho) && !ROTA_DE_ARQUIVO.test(caminho);
