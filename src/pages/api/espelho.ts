// Refaz o espelho da produção na homologação, a partir da cópia para o espelho enviada por um admin
// ("Baixar cópia para o espelho", na Administração do site de verdade; src/lib/copia-para-o-espelho.ts).
import type { APIRoute } from 'astro';
import type { CopiaDoAcervo } from '../../lib/espelho';
import { LIMITE_DA_COPIA_PARA_O_ESPELHO, RECADO_DA_COPIA_INTEIRA, recusaDaCopiaParaOEspelho } from '../../lib/copia-para-o-espelho';
import { gravarEspelho, podeEspelhar } from '../../lib/servidor/espelho';
import { mesmaOrigem, voltar } from '../../lib/servidor/http';

const PAGINA = '/admin/espelho';
// O formulário leva o arquivo e pouco mais
const FOLGA_DO_FORMULARIO = 64 * 1024;
// O pedido recusado por tamanho é lido até o fim só até aqui (a cópia inteira do acervo cheio tem uns 7 MB): a
// leitura ocupa memória fora do JavaScript, e um arquivo maior que isto nem é lido
const LEITURA_MAXIMA_DA_RECUSA = 32 * 1024 * 1024;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  if (!podeEspelhar()) return new Response('Página não encontrada', { status: 404 });
  if (!locals.usuario.admin) return voltar(request, '/', { erro: 'Só os administradores refazem o espelho.' });

  // A cópia inteira do acervo passa do limite: o recado diz qual arquivo usar. O pedido é lido até o fim, de uma
  // vez e sem formData (a leitura é do próprio Workers, fora do JavaScript), para o navegador receber o recado
  // em vez de um erro de conexão
  const declarado = Number(request.headers.get('Content-Length') ?? 0);
  if (declarado > LIMITE_DA_COPIA_PARA_O_ESPELHO + FOLGA_DO_FORMULARIO) {
    if (declarado <= LEITURA_MAXIMA_DA_RECUSA) await request.arrayBuffer().catch(() => undefined);
    return voltar(request, PAGINA, { erro: RECADO_DA_COPIA_INTEIRA });
  }
  const arquivo = (await request.formData()).get('copia');
  if (!(arquivo instanceof File) || arquivo.size === 0) return voltar(request, PAGINA, { erro: 'Escolha o arquivo da cópia para o espelho.' });
  if (arquivo.size > LIMITE_DA_COPIA_PARA_O_ESPELHO) return voltar(request, PAGINA, { erro: RECADO_DA_COPIA_INTEIRA });

  let copia: CopiaDoAcervo;
  try {
    copia = JSON.parse(await arquivo.text());
  } catch {
    return voltar(request, PAGINA, { erro: 'Não consegui ler o arquivo. Ele precisa ser a cópia para o espelho, em JSON.' });
  }
  const recusa = recusaDaCopiaParaOEspelho(copia);
  if (recusa) return voltar(request, PAGINA, { erro: recusa });
  try {
    const r = await gravarEspelho(copia);
    return voltar(request, PAGINA, {
      ok: `Espelho refeito: ${r.pessoas} pessoas, ${r.filiacoes} filiações, ${r.casais} casais, ${r.lacos} laços do coração e ${r.memorias} memórias de exemplo.`,
    });
  } catch (erro) {
    return voltar(request, PAGINA, { erro: erro instanceof Error ? erro.message : 'Não consegui gravar o espelho.' });
  }
};
