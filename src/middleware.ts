// Roda antes de toda página e de toda rota: prepara o banco e descobre quem está pedindo.
// Sem pessoa identificada, nada do acervo é entregue.
import { defineMiddleware } from 'astro:middleware';
import { ehServicoDeCopia, usuarioDoPedido } from './lib/servidor/acesso';
import { ambiente, guardarApelidosDoPedido, guardarTiposDoPedido, noPedido, tiposDoPedido } from './lib/servidor/ambiente';
import { ehNaoEncontradaSemPagina } from './lib/servidor/http';
import { prepararBanco } from './lib/servidor/banco';
import { respostaDaCopia } from './lib/servidor/copia';
import { anotarCopiaMensal, listarMeusApelidos, listarTipos, registrarAcesso } from './lib/servidor/repositorio';
import { lerEscolhasDe } from './lib/visual';

// A cor e o rabisco de cada tipo, escolhidos em /admin/tipos, valem em toda tela do pedido
lerEscolhasDe(tiposDoPedido);

const RECADO = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Memórias Bayara e Bracarense</title><body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 15vh auto; padding: 0 1.5rem; line-height: 1.5">
<h1>Não consegui identificar você</h1>
<p>O acervo é privado. Seu login foi aceito, mas seu e-mail ainda não está ligado a ninguém da família no site.</p>
<p>Avise o Gui, a Giovanna ou o Magno para liberarem seu acesso.</p></body></html>`;

// O primeiro acesso de cada pessoa, para os avisos (src/lib/avisos.ts): anotado uma vez por banco e
// por processo, e no banco só na primeira vez de todas (INSERT OR IGNORE)
const acessosAnotados = new Set<string>();

// Cada pedido roda sabendo se é da homologação, que tem banco e fotos próprios
export const onRequest = defineMiddleware((contexto, proximo) => noPedido(contexto.request, () => tratar(contexto, proximo)));

const tratar: Parameters<typeof defineMiddleware>[0] = async (contexto, proximo) => {
  // Páginas geradas na publicação (como a 404) não têm pedido de verdade
  if (contexto.isPrerendered) return proximo();

  await prepararBanco();

  // A cópia mensal no Google Drive entra com um token de serviço, sem pessoa
  if (contexto.url.pathname === '/api/copia' && contexto.request.method === 'GET' && (await ehServicoDeCopia(contexto.request))) {
    const resposta = await respostaDaCopia();
    // A data da última cópia mensal, para a pendência "cópia mensal atrasada" em "Sua conta".
    // Anotar não pode impedir a cópia de chegar ao Drive.
    await anotarCopiaMensal().catch(() => undefined);
    return resposta;
  }

  const usuario = await usuarioDoPedido(contexto.request);
  if (!usuario) {
    const querJson = contexto.url.pathname.startsWith('/api/');
    return new Response(querJson ? JSON.stringify({ erro: 'Não foi possível identificar quem está pedindo.' }) : RECADO, {
      status: 401,
      headers: { 'Content-Type': querJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  contexto.locals.usuario = usuario;
  const acesso = `${ambiente()}:${usuario.pessoa}`;
  if (!acessosAnotados.has(acesso)) {
    await registrarAcesso(usuario.pessoa);
    acessosAnotados.add(acesso);
  }
  contexto.locals.tipos = await listarTipos();
  guardarTiposDoPedido(contexto.locals.tipos);
  // "Como você chama": nas páginas, as pessoas aparecem com os apelidos que quem olha deu. As rotas de
  // /api e a administração ficam com os de sempre, para nenhum apelido privado ser gravado como da família
  if (!/^\/(api|admin)(\/|$)/.test(contexto.url.pathname)) guardarApelidosDoPedido(await listarMeusApelidos(usuario.pessoa));
  const resposta = await proximo();
  // Uma página que responde "não encontrada" em texto puro vira a página de erro do site, com menu e volta
  if (ehNaoEncontradaSemPagina(contexto.url.pathname, resposta)) return contexto.rewrite('/404');
  // Nada do acervo deve ficar guardado em servidores intermediários
  if (!resposta.headers.has('Cache-Control')) resposta.headers.set('Cache-Control', 'private, no-store');
  return resposta;
};
