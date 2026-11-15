// Descobre quem está logado a partir do Cloudflare Access.
// O Access coloca um token assinado em cada pedido. Conferimos a assinatura
// em vez de confiar no cabeçalho, para o caso de o site ser alcançado por
// algum caminho que não passe pelo login.
import { env } from 'cloudflare:workers';
import { listarPessoas } from '../memorias';
import type { Usuario } from './permissoes';

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

/** Confere o token do Access e devolve o e-mail, ou undefined se o token não valer. */
export async function emailDoToken(token: string | null | undefined): Promise<string | undefined> {
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
    return typeof dados.email === 'string' ? dados.email.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

/** Mapa e-mail → pessoa, vindo do segredo ACESSOS. */
export function lerAcessos(): Map<string, string> {
  try {
    const bruto = JSON.parse(env.ACESSOS || '{}') as Record<string, string>;
    return new Map(Object.entries(bruto).map(([email, pessoa]) => [email.toLowerCase(), pessoa]));
  } catch {
    return new Map();
  }
}

/** Pessoas que têm login no site. */
export function pessoasComAcesso(): Set<string> {
  return new Set(lerAcessos().values());
}

function tokenDoPedido(request: Request): string | null {
  const cabecalho = request.headers.get('Cf-Access-Jwt-Assertion');
  if (cabecalho) return cabecalho;
  const cookie = request.headers.get('Cookie') ?? '';
  return /(?:^|;\s*)CF_Authorization=([^;]+)/.exec(cookie)?.[1] ?? null;
}

/** O pedido vem de alguém que passou pelo login? Não exige que o e-mail esteja ligado a uma pessoa. */
export async function temLoginValido(request: Request): Promise<boolean> {
  if (import.meta.env.DEV) return true;
  return (await emailDoToken(tokenDoPedido(request))) !== undefined;
}

/** Quem está fazendo o pedido. undefined quando não há login válido ou o e-mail não está ligado a ninguém. */
export async function usuarioDoPedido(request: Request): Promise<Usuario | undefined> {
  let pessoaId: string | undefined;

  if (import.meta.env.DEV && env.DEV_PESSOA) {
    // Em desenvolvimento não existe Access. Esta linha some do site publicado.
    pessoaId = env.DEV_PESSOA;
  } else {
    const email = await emailDoToken(tokenDoPedido(request));
    if (email) pessoaId = lerAcessos().get(email);
  }
  if (!pessoaId) return undefined;

  const pessoa = (await listarPessoas()).find((p) => p.id === pessoaId);
  if (!pessoa) return undefined;
  return {
    pessoa: pessoa.id,
    nome: pessoa.data.apelido ?? pessoa.data.nome,
    nucleo: pessoa.data.nucleo,
    admin: pessoa.id === env.ADMIN,
  };
}
