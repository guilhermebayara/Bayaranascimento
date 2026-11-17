// Refaz o espelho da produção na homologação, a partir de uma cópia do acervo enviada por um admin.
import type { APIRoute } from 'astro';
import type { CopiaDoAcervo } from '../../lib/espelho';
import { gravarEspelho, podeEspelhar } from '../../lib/servidor/espelho';
import { mesmaOrigem, voltar } from '../../lib/servidor/http';

const PAGINA = '/admin/espelho';
const LIMITE = 20 * 1024 * 1024;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  if (!podeEspelhar()) return new Response('Página não encontrada', { status: 404 });
  if (!locals.usuario.admin) return voltar(request, '/', { erro: 'Só os administradores refazem o espelho.' });

  const arquivo = (await request.formData()).get('copia');
  if (!(arquivo instanceof File) || arquivo.size === 0) return voltar(request, PAGINA, { erro: 'Escolha o arquivo da cópia do acervo.' });
  if (arquivo.size > LIMITE) return voltar(request, PAGINA, { erro: 'O arquivo é grande demais para uma cópia do acervo.' });

  let copia: CopiaDoAcervo;
  try {
    copia = JSON.parse(await arquivo.text());
  } catch {
    return voltar(request, PAGINA, { erro: 'Não consegui ler o arquivo. Ele precisa ser a cópia baixada do acervo, em JSON.' });
  }
  try {
    const r = await gravarEspelho(copia);
    return voltar(request, PAGINA, {
      ok: `Espelho refeito: ${r.pessoas} pessoas, ${r.filiacoes} filiações, ${r.casais} casais, ${r.lacos} laços do coração e ${r.memorias} memórias de exemplo. Os anos andaram ${r.deslocamentoDeAnos} para a frente.`,
    });
  } catch (erro) {
    return voltar(request, PAGINA, { erro: erro instanceof Error ? erro.message : 'Não consegui gravar o espelho.' });
  }
};
