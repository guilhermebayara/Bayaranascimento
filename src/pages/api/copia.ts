// Download da cópia do banco, em partes (src/lib/servidor/copia.ts). Pessoas: só admins, no índice e em
// cada parte. A cópia automática do mês é atendida antes, no middleware, porque não é uma pessoa da família.
import type { APIRoute } from 'astro';
import { respostaDaCopia } from '../../lib/servidor/copia';
import { erro } from '../../lib/servidor/http';

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.usuario.admin) return erro(403, 'Só os administradores baixam a cópia do acervo.');
  return respostaDaCopia(url);
};
