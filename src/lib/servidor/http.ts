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
