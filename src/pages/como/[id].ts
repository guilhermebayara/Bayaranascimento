// Fora da produção: troca a pessoa de teste, para conferir o que cada uma vê.
import type { APIRoute } from 'astro';
import { PESSOAS_DE_TESTE, semLogin } from '../../lib/servidor/acesso';

export const GET: APIRoute = ({ params, url }) => {
  if (!semLogin() || !PESSOAS_DE_TESTE.includes(params.id ?? '')) return new Response('Não encontrado', { status: 404 });
  const volta = url.searchParams.get('volta') ?? '/';
  return new Response(null, {
    status: 303,
    headers: {
      // Só aceita voltar para dentro do próprio site
      Location: volta.startsWith('/') && !volta.startsWith('//') ? volta : '/',
      'Set-Cookie': `como=${params.id}; Path=/; SameSite=Lax; HttpOnly`,
    },
  });
};
