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

/**
 * O pedido veio do script da página, que muda a tela no lugar, sem recarregar ("Interação sem recarregar
 * a página", em docs/visual.md). Sem script, o mesmo formulário chega como formulário comum.
 */
export const pedeJson = (request: Request): boolean => (request.headers.get('Accept') ?? '').includes('application/json');

/**
 * Responde a um formulário: ao script, em JSON, com o recado e o que ele precisa para redesenhar; sem
 * script, volta para a página, como sempre (a reserva).
 */
export function responder(request: Request, destino: string, recado: { ok?: string; erro?: string } = {}, dados: Record<string, unknown> = {}): Response {
  if (!pedeJson(request)) return voltar(request, destino, recado);
  return new Response(JSON.stringify({ ...dados, ...recado }), {
    status: recado.erro ? 400 : 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
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

/** A resposta 404 em texto puro de uma página (e não de uma rota de dados, de foto ou de áudio). */
export function ehNaoEncontradaSemPagina(caminho: string, resposta: { status: number; headers: { get(nome: string): string | null } }): boolean {
  if (resposta.status !== 404 || caminho === '/404') return false;
  if (/^\/(api|fotos|audios|retratos)\//.test(caminho)) return false;
  return (resposta.headers.get('Content-Type') ?? '').startsWith('text/plain');
}

/** Sete dias, em segundos: quanto uma foto ou um retrato fica guardado no aparelho. */
export const SETE_DIAS = 7 * 24 * 60 * 60;

/**
 * O cabeçalho de cache de uma foto ou de um retrato (decisão 3 do Gui, 23/11/2026, em
 * docs/briefs/desempenho.md). O que pode ser guardado fica no aparelho por 7 dias, sem o navegador
 * perguntar de novo; o resto (rascunho, lixeira, foto solta ou removida) continua como antes: o navegador
 * guarda, mas confere a permissão a cada uso. Sempre "private": nada fica num cache compartilhado.
 * Onde existe o "Ver como" (prévias, homologação e computador), a resposta depende do cookie: trocar de
 * pessoa não reaproveita a foto guardada para outra.
 */
export function cabecalhoDeGuardar(guardar: boolean, comVerComo: boolean): Record<string, string> {
  return {
    'Cache-Control': guardar ? `private, max-age=${SETE_DIAS}` : 'private, no-cache',
    ...(comVerComo ? { Vary: 'Cookie' } : {}),
  };
}
