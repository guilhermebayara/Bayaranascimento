// O conceito da revisão visual (docs/decisoes.md, "Revisão visual do zero", fase 1).
// As telas de /conceito usam o acervo de exemplo e, no painel, dados fixos de exemplo.
// Por isso só existem onde o acervo de exemplo existe: nas prévias de teste e no computador.
// Na produção e na homologação, respondem 404. A guarda da produção confere esta trava.
import { AMBIENTES_COM_EXEMPLOS, ambiente, ehHomologacao } from './ambiente';
import { FONTES_DO_SITE, combinacao, combinacaoValida, type FontesDoSite } from '../visual';

export function conceitoDisponivel(): boolean {
  return AMBIENTES_COM_EXEMPLOS.includes(ambiente()) && !ehHomologacao();
}

export const naoEncontrado = () => new Response('Não encontrado', { status: 404 });

/**
 * As fontes da página. Valem as do site (FONTES_DO_SITE, em src/lib/visual.ts). Só onde o conceito
 * existe, nas prévias de teste e no computador, a faixa de teste pode trocar a combinação para
 * comparar as três, e a escolha fica num cookie. Na produção e na homologação o cookie não vale.
 */
export function fontesDoPedido(request: Request): FontesDoSite {
  if (!conceitoDisponivel()) return FONTES_DO_SITE;
  const cookie = request.headers.get('Cookie') ?? '';
  const pedida = combinacaoValida(/(?:^|;\s*)fontes=([^;]+)/.exec(cookie)?.[1]);
  return pedida ? combinacao(pedida) : FONTES_DO_SITE;
}
