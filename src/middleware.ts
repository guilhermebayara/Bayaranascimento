// Roda antes de toda página e de toda rota: prepara o banco e descobre quem está pedindo.
// Sem pessoa identificada, nada do acervo é entregue.
import { defineMiddleware } from 'astro:middleware';
import { ehServicoDeCopia, enderecoDeSaida, pessoaQuePede, semLogin, usuarioDaPessoa } from './lib/servidor/acesso';
import { ambiente, definirPessoaDoPedido, guardarApelidosDoPedido, guardarTiposDoPedido, guardarVerComoDoPedido, noPedido, servidorTiming, tiposDoPedido, verComoDoPedido } from './lib/servidor/ambiente';
import { ehNaoEncontradaSemPagina } from './lib/servidor/http';
import { prepararBanco } from './lib/servidor/banco';
import { respostaDaConfirmacao, respostaDaCopia } from './lib/servidor/copia';
import { anotarCopiaMensal, aquecerOPedido, listarMeusApelidos, listarTipos, registrarAcesso } from './lib/servidor/repositorio';
import { comecoDoPedido, usaApelidosDeQuemOlha } from './lib/servidor/comeco-do-pedido';
import { lerEscolhasDe } from './lib/visual';
import { lerMarcadorDe } from './lib/marcador-do-ver-como';

// A tela de quem entrou mas não está ligado a ninguém tem "Sair", para entrar com outro e-mail (pedido do Gui, 19/11/2026)
// A cor e o rabisco de cada tipo, escolhidos em /admin/tipos, valem em toda tela do pedido
lerEscolhasDe(tiposDoPedido);
// Onde existe o "Ver como", os endereços das fotos e dos retratos levam a pessoa vista (src/lib/marcador-do-ver-como.ts)
lerMarcadorDe(verComoDoPedido);

const recado = () => `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Memórias Bayara e Bracarense</title><body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 15vh auto; padding: 0 1.5rem; line-height: 1.5">
<h1>Não consegui identificar você</h1>
<p>O acervo é privado. Seu login foi aceito, mas seu e-mail ainda não está ligado a ninguém da família no site.</p>
<p>Avise o Gui, a Giovanna ou o Magno para liberarem seu acesso.</p>
<p>Se você entrou com o e-mail errado, saia e entre de novo com outro.</p>
<p><a href="${enderecoDeSaida()}" style="display: inline-block; padding: 0.6rem 1.2rem; border-radius: 999px; background: #2b211a; color: #faf2e6; text-decoration: none">Sair</a></p></body></html>`;

// O primeiro acesso de cada pessoa, para os avisos (src/lib/avisos.ts): anotado uma vez por banco e
// por processo, e no banco só na primeira vez de todas (INSERT OR IGNORE)
const acessosAnotados = new Set<string>();

// Cada pedido roda sabendo se é da homologação, que tem banco e fotos próprios, e com a guarda por pedido
// vazia (src/lib/servidor/ambiente.ts)
export const onRequest = defineMiddleware((contexto, proximo) => noPedido(contexto.request, () => tratar(contexto, proximo)));

const tratar: Parameters<typeof defineMiddleware>[0] = async (contexto, proximo) => {
  // Páginas geradas na publicação (como a 404) não têm pedido de verdade
  if (contexto.isPrerendered) return proximo();

  await prepararBanco();

  // A cópia mensal no Google Drive entra com um token de serviço, sem pessoa, no índice e em cada parte
  if (contexto.url.pathname === '/api/copia' && contexto.request.method === 'GET' && (await ehServicoDeCopia(contexto.request))) {
    // A data da última cópia mensal, para a pendência "cópia mensal atrasada" em "Sua conta": anotada só quando
    // o script confirma que gravou o arquivo no Drive (D1f3), e nunca por uma passada descartada
    if (contexto.url.searchParams.has('confirmar')) return respostaDaConfirmacao(contexto.url, anotarCopiaMensal);
    return respostaDaCopia(contexto.url);
  }

  // Quem pede entra na chave da guarda por pedido, e o que quase todo pedido lê vem num lote só
  const caminho = contexto.url.pathname;
  const comeco = comecoDoPedido(caminho);
  const apelidos = usaApelidosDeQuemOlha(caminho);
  const quem = await pessoaQuePede(contexto.request);
  definirPessoaDoPedido(quem);
  if (quem) await aquecerOPedido(quem, comeco, { apelidos });
  const usuario = quem ? await usuarioDaPessoa(quem) : undefined;
  if (!usuario) {
    const querJson = contexto.url.pathname.startsWith('/api/');
    return new Response(querJson ? JSON.stringify({ erro: 'Não foi possível identificar quem está pedindo.' }) : recado(), {
      status: 401,
      headers: { 'Content-Type': querJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  contexto.locals.usuario = usuario;
  // Só onde existe o "Ver como": na produção, nenhum endereço muda
  if (semLogin()) guardarVerComoDoPedido(usuario.pessoa);
  const acesso = `${ambiente()}:${usuario.pessoa}`;
  if (!acessosAnotados.has(acesso)) {
    await registrarAcesso(usuario.pessoa);
    acessosAnotados.add(acesso);
  }
  // Os tipos e os apelidos são das páginas e das rotas: as rotas de arquivo não leem (causa 3a)
  if (comeco !== 'arquivo') {
    contexto.locals.tipos = await listarTipos();
    guardarTiposDoPedido(contexto.locals.tipos);
  }
  // "Como você chama": nas páginas, as pessoas aparecem com os apelidos que quem olha deu. As rotas de
  // /api e a administração ficam com os de sempre, para nenhum apelido privado ser gravado como da família
  if (apelidos) guardarApelidosDoPedido(await listarMeusApelidos(usuario.pessoa));
  const resposta = await proximo();
  // Uma página que responde "não encontrada" em texto puro vira a página de erro do site, com menu e volta
  if (ehNaoEncontradaSemPagina(contexto.url.pathname, resposta)) return contexto.rewrite('/404');
  // Nada do acervo deve ficar guardado em servidores intermediários
  if (!resposta.headers.has('Cache-Control')) resposta.headers.set('Cache-Control', 'private, no-store');
  // O tempo do servidor e as consultas ao D1, para medir a produção de verdade (causa 1e). O que o
  // esqueleto ainda ler depois deste ponto não entra: ele lê quase tudo do começo do pedido, já guardado.
  const tempo = servidorTiming();
  if (tempo) {
    try {
      resposta.headers.set('Server-Timing', tempo);
    } catch {
      // Uma resposta com cabeçalhos que não mudam segue sem a medida
    }
  }
  return resposta;
};
