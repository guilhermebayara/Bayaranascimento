// Roda antes de toda página e de toda rota: prepara o banco e descobre quem está pedindo.
// Sem pessoa identificada, nada do acervo é entregue.
import { defineMiddleware } from 'astro:middleware';
import { usuarioDoPedido } from './lib/servidor/acesso';
import { prepararBanco } from './lib/servidor/banco';

const RECADO = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bayara Nascimento</title><body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 15vh auto; padding: 0 1.5rem; line-height: 1.5">
<h1>Não consegui identificar você</h1>
<p>O acervo é privado. Seu login foi aceito, mas seu e-mail ainda não está ligado a ninguém da família no site.</p>
<p>Avise o Gui ou a Giovanna para liberarem seu acesso.</p></body></html>`;

export const onRequest = defineMiddleware(async (contexto, proximo) => {
  // Páginas geradas na publicação (como a 404) não têm pedido de verdade
  if (contexto.isPrerendered) return proximo();

  await prepararBanco();
  const usuario = await usuarioDoPedido(contexto.request);
  if (!usuario) {
    const querJson = contexto.url.pathname.startsWith('/api/');
    return new Response(querJson ? JSON.stringify({ erro: 'Não foi possível identificar quem está pedindo.' }) : RECADO, {
      status: 401,
      headers: { 'Content-Type': querJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  contexto.locals.usuario = usuario;
  const resposta = await proximo();
  // Nada do acervo deve ficar guardado em servidores intermediários
  if (!resposta.headers.has('Cache-Control')) resposta.headers.set('Cache-Control', 'private, no-store');
  return resposta;
});
