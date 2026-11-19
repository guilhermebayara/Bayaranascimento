// Descobre quem está logado a partir do Cloudflare Access.
// O Access coloca um token assinado em cada pedido. Conferimos a assinatura
// em vez de confiar no cabeçalho, para o caso de o site ser alcançado por
// algum caminho que não passe pelo login.
import { env } from 'cloudflare:workers';
import { ambiente } from './ambiente';
import type { Usuario } from './permissoes';
import { listarIntegrantes } from './repositorio';

interface Chave extends JsonWebKey {
  kid: string;
}

let chavesEmCache: { chaves: Chave[]; ate: number } | undefined;

async function buscarChaves(): Promise<Chave[]> {
  if (chavesEmCache && chavesEmCache.ate > Date.now()) return chavesEmCache.chaves;
  const resposta = await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`);
  if (!resposta.ok) throw new Error('Não foi possível buscar as chaves do Access');
  const { keys } = (await resposta.json()) as { keys: Chave[] };
  chavesEmCache = { chaves: keys, ate: Date.now() + 60 * 60 * 1000 };
  return keys;
}

function decodificar(parte: string): Uint8Array {
  const base64 = parte.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

function lerJson(parte: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(decodificar(parte)));
}

/** Confere o token do Access e devolve o que ele diz, ou undefined se o token não valer. */
async function dadosDoToken(token: string | null | undefined): Promise<Record<string, unknown> | undefined> {
  if (!token) return undefined;
  const partes = token.split('.');
  if (partes.length !== 3) return undefined;
  try {
    const cabecalho = lerJson(partes[0]);
    const dados = lerJson(partes[1]);
    if (cabecalho.alg !== 'RS256') return undefined;

    const agora = Math.floor(Date.now() / 1000);
    if (typeof dados.exp !== 'number' || dados.exp < agora) return undefined;
    if (typeof dados.nbf === 'number' && dados.nbf > agora + 60) return undefined;
    if (dados.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return undefined;
    const aud = Array.isArray(dados.aud) ? dados.aud : [dados.aud];
    if (!aud.includes(env.ACCESS_AUD)) return undefined;

    const jwk = (await buscarChaves()).find((c) => c.kid === cabecalho.kid);
    if (!jwk) return undefined;
    const chave = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, [
      'verify',
    ]);
    const valido = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      chave,
      decodificar(partes[2]),
      new TextEncoder().encode(`${partes[0]}.${partes[1]}`),
    );
    if (!valido) return undefined;
    return dados;
  } catch {
    return undefined;
  }
}

/** Confere o token do Access e devolve o e-mail, ou undefined se o token não valer. */
export async function emailDoToken(token: string | null | undefined): Promise<string | undefined> {
  const dados = await dadosDoToken(token);
  return typeof dados?.email === 'string' ? dados.email.toLowerCase() : undefined;
}

/**
 * Pedido feito pela cópia automática, e não por uma pessoa. A cópia entra no
 * Access com um token de serviço; o token assinado traz o Client ID dele em
 * common_name, que precisa ser o mesmo cadastrado em COPIA_CLIENT_ID.
 */
export async function ehServicoDeCopia(request: Request): Promise<boolean> {
  if (!env.COPIA_CLIENT_ID) return false;
  const dados = await dadosDoToken(tokenDoPedido(request));
  return dados?.common_name === env.COPIA_CLIENT_ID;
}

/** Mapa e-mail → integrante, vindo do segredo ACESSOS. */
export function lerAcessos(): Map<string, string> {
  try {
    const bruto = JSON.parse(env.ACESSOS || '{}') as Record<string, string>;
    return new Map(Object.entries(bruto).map(([email, pessoa]) => [email.toLowerCase(), pessoa]));
  } catch {
    return new Map();
  }
}

/** Fora da produção não há login: dá para navegar como qualquer pessoa, para testar o que cada uma vê. */
export function semLogin(): boolean {
  // A homologação também: ela fica atrás do login do Cloudflare Access, e os dados são inventados.
  return import.meta.env.DEV || ambiente() === 'previa' || ambiente() === 'homologa';
}

/**
 * Onde existe o login do Cloudflare Access, e portanto de onde dá para sair: a produção e a
 * homologação. Nas prévias de teste e no computador não há login.
 */
export function temLogin(): boolean {
  return ambiente() === 'producao' || ambiente() === 'homologa';
}

/**
 * A saída do Cloudflare Access, no domínio da equipe: encerra a sessão da pessoa neste aparelho, em
 * todo o Access, para ela poder entrar de novo com outro e-mail. A saída pelo endereço do próprio site
 * (/cdn-cgi/access/logout) caía em "Unable to find your Access organization" depois que o Gui trocou o
 * domínio da equipe (19/11/2026).
 */
export function enderecoDeSaida(): string {
  return `https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/logout`;
}

/**
 * Integrantes que têm login no site. Fora da produção, quem tem núcleo conta
 * como tendo acesso, para os testes se parecerem com o uso real.
 */
export async function pessoasComAcesso(): Promise<Set<string>> {
  if (!semLogin()) return new Set(lerAcessos().values());
  const integrantes = await listarIntegrantes();
  return new Set(integrantes.filter((i) => PESSOAS_DE_TESTE.includes(i.id)).map((i) => i.id));
}

export const PESSOAS_DE_TESTE = ['gui', 'giovanna', 'elizete', 'lucas-magno'];

function tokenDoPedido(request: Request): string | null {
  const cabecalho = request.headers.get('Cf-Access-Jwt-Assertion');
  if (cabecalho) return cabecalho;
  return lerCookie(request, 'CF_Authorization');
}

function lerCookie(request: Request, nome: string): string | null {
  const cookie = request.headers.get('Cookie') ?? '';
  return new RegExp(`(?:^|;\\s*)${nome}=([^;]+)`).exec(cookie)?.[1] ?? null;
}

/** Quem está fazendo o pedido. undefined quando não há login válido ou o e-mail não está ligado a ninguém. */
export async function usuarioDoPedido(request: Request): Promise<Usuario | undefined> {
  let pessoaId: string | undefined;

  if (semLogin()) {
    const escolhida = lerCookie(request, 'como');
    pessoaId = escolhida && PESSOAS_DE_TESTE.includes(escolhida) ? escolhida : 'gui';
  } else {
    const email = await emailDoToken(tokenDoPedido(request));
    if (email) pessoaId = lerAcessos().get(email);
  }
  if (!pessoaId) return undefined;

  const integrante = (await listarIntegrantes()).find((i) => i.id === pessoaId);
  if (!integrante) return undefined;
  return {
    pessoa: integrante.id,
    nome: integrante.apelido ?? integrante.nome,
    admin: integrante.admin,
    nucleos: integrante.nucleos,
  };
}
