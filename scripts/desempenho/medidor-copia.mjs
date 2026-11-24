// Envoltório só local da medição M2 (23/11/2026): simula o token de serviço da cópia mensal no Drive.
// Usado por scripts/desempenho/medir-cpu.mjs, fase "pesadas", com wrangler-cpu-copia.jsonc.
//
// O site de verdade confere o token do Access buscando as chaves públicas em
// https://<ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs. No computador não há Access: este envoltório
// responde a esse endereço (e só a ele) com a chave pública que o medidor gerou para a rodada, passada
// na variável MEDICAO_JWKS. O medidor assina um token com a chave privada, com common_name igual ao
// COPIA_CLIENT_ID fictício da rodada, e o pedido segue pelo mesmo caminho da cópia mensal (o middleware,
// ehServicoDeCopia e respostaDaCopia). O resto vai ao build de publicação sem mudança.
//
// Nenhum segredo de verdade passa por aqui: a chave, o token e o Client ID nascem e morrem na rodada.
import { env } from 'cloudflare:workers';
import site from '../../dist/server/entry.mjs';

const buscarDeVerdade = globalThis.fetch;
globalThis.fetch = (entrada, opcoes) => {
  const endereco = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
  if (env.MEDICAO_JWKS && endereco === `https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`) {
    return Promise.resolve(new Response(env.MEDICAO_JWKS, { headers: { 'Content-Type': 'application/json' } }));
  }
  return buscarDeVerdade(entrada, opcoes);
};

export default {
  fetch: (pedido, ambiente, contexto) => site.fetch.call(site, pedido, ambiente, contexto),
};
