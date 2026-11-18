// Download da cópia do banco. Pessoas: só admins. A cópia automática do mês
// é atendida antes, no middleware, porque não é uma pessoa da família.
import type { APIRoute } from 'astro';
import { respostaDaCopia } from '../../lib/servidor/copia';
import { erro } from '../../lib/servidor/http';

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.usuario.admin) return erro(403, 'Só os administradores baixam a cópia do acervo.');
  // ?retratos=1: a cópia para o espelho da homologação, com a foto de cada retrato atual
  return respostaDaCopia({ retratos: url.searchParams.get('retratos') === '1' });
};
