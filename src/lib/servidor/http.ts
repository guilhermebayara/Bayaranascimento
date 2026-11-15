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

/**
 * Resposta de um formulário comum (sem JavaScript): volta para a página de
 * origem com um recado, que o layout mostra no topo.
 */
export function voltar(request: Request, destino: string, recado: { ok?: string; erro?: string } = {}): Response {
  const url = new URL(destino, request.url);
  // Só caminhos do próprio site
  const alvo = url.origin === new URL(request.url).origin ? url : new URL('/', request.url);
  if (recado.ok) alvo.searchParams.set('ok', recado.ok);
  if (recado.erro) alvo.searchParams.set('erro', recado.erro);
  return new Response(null, { status: 303, headers: { Location: alvo.pathname + alvo.search + alvo.hash, 'Cache-Control': 'no-store' } });
}

/** Lê um campo de texto de um formulário, já sem espaços nas pontas. */
export function campo(dados: FormData, nome: string, maximo = 200): string {
  const valor = dados.get(nome);
  return typeof valor === 'string' ? valor.trim().slice(0, maximo) : '';
}

/** Campo numérico opcional: vazio vira undefined, e o que não for inteiro vira NaN para a validação pegar. */
export function campoNumero(dados: FormData, nome: string): number | undefined {
  const texto = campo(dados, nome, 12);
  if (!texto) return undefined;
  return /^\d+$/.test(texto) ? Number(texto) : Number.NaN;
}
