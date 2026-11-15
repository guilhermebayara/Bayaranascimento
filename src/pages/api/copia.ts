// Download da cópia do banco. Pessoas: só admins. A cópia automática do mês
// é atendida antes, no middleware, porque não é uma pessoa da família.
import type { APIRoute } from 'astro';
import { respostaDaCopia } from '../../lib/servidor/copia';
import { erro } from '../../lib/servidor/http';

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.usuario.admin) return erro(403, 'Só o Gui e a Giovanna podem baixar a cópia do acervo.');
  return respostaDaCopia();
};
