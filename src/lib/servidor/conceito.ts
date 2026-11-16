// O conceito da revisão visual (docs/decisoes.md, "Revisão visual do zero", fase 1).
// As telas de /conceito usam o acervo de exemplo e, no painel, dados fixos de exemplo.
// Por isso só existem onde o acervo de exemplo existe: nas prévias de teste e no computador.
// Na produção e na homologação, respondem 404. A guarda da produção confere esta trava.
import { AMBIENTES_COM_EXEMPLOS, ambiente, ehHomologacao } from './ambiente';
import { fontesValidas, type Fontes } from '../visual';

export function conceitoDisponivel(): boolean {
  return AMBIENTES_COM_EXEMPLOS.includes(ambiente()) && !ehHomologacao();
}

export const naoEncontrado = () => new Response('Não encontrado', { status: 404 });

/** A combinação de fontes escolhida na faixa de teste, guardada num cookie. */
export function fontesDoPedido(request: Request): Fontes {
  const cookie = request.headers.get('Cookie') ?? '';
  return fontesValidas(/(?:^|;\s*)fontes=([^;]+)/.exec(cookie)?.[1]);
}
