import { env } from 'cloudflare:workers';
import { GitHub } from './github';

export function json(dados: unknown, status = 200): Response {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export const erro = (status: number, mensagem: string) => json({ erro: mensagem }, status);

/** Recusa pedidos de escrita que não partiram do próprio site. */
export function mesmaOrigem(request: Request): boolean {
  const origem = request.headers.get('Origin');
  return Boolean(origem) && origem === new URL(request.url).origin;
}

export function github(): GitHub {
  return new GitHub({
    repo: env.GITHUB_REPO,
    branch: env.GITHUB_BRANCH,
    token: env.GITHUB_TOKEN,
    apiUrl: import.meta.env.DEV ? env.GITHUB_API_URL : undefined,
  });
}

/** O site está pronto para gravar? Sem o token e os acessos, os formulários avisam em vez de falhar. */
export function configuracaoFaltando(): string[] {
  const faltando: string[] = [];
  if (!env.GITHUB_TOKEN) faltando.push('GITHUB_TOKEN');
  if (!env.ACESSOS) faltando.push('ACESSOS');
  return faltando;
}
