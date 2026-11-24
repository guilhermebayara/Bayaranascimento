// "Baixar cópia para o espelho", na Administração: só os administradores. Só as tabelas da família que o
// espelho da homologação lê (src/lib/copia-para-o-espelho.ts). Não grava nada.
import type { APIRoute } from 'astro';
import { respostaDaCopiaParaOEspelho } from '../../lib/servidor/copia-para-o-espelho';
import { erro } from '../../lib/servidor/http';

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.usuario.admin) return erro(403, 'Só os administradores baixam a cópia para o espelho.');
  return respostaDaCopiaParaOEspelho();
};
