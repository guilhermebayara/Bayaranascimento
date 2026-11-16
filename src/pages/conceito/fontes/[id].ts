// Conceito da revisão visual: troca a combinação de fontes, para comparar as três em todas as telas.
import type { APIRoute } from 'astro';
import { conceitoDisponivel, naoEncontrado } from '../../../lib/servidor/conceito';
import { COMBINACOES_DE_FONTES } from '../../../lib/visual';

export const GET: APIRoute = ({ params, url }) => {
  if (!conceitoDisponivel() || !COMBINACOES_DE_FONTES.some((c) => c.id === params.id)) return naoEncontrado();
  const volta = url.searchParams.get('volta') ?? '/conceito';
  return new Response(null, {
    status: 303,
    headers: {
      // Só aceita voltar para dentro do próprio site
      Location: volta.startsWith('/') && !volta.startsWith('//') ? volta : '/conceito',
      'Set-Cookie': `fontes=${params.id}; Path=/; SameSite=Lax; HttpOnly`,
    },
  });
};
