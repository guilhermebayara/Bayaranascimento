// A resposta ao pedido para liberar um relato (docs/decisoes.md, "Ampliar quem vê uma memória com
// relatos"). Chega pelo aviso, com "Liberar para quem passou a ver" ou "Manter como estava", ou depois,
// pela linha discreta no próprio relato ("Visível só para quem via antes. Liberar para toda a família"). É
// um formulário comum, que funciona sem script, e volta para a página de onde veio com o recado. O
// formulário manda o público que a pessoa leu (chaveDoPublico): a resposta diz e faz a mesma coisa.
import type { APIRoute } from 'astro';
import { campo, erro, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { chaveDoPublico, podeLiberarRelato } from '../../lib/servidor/permissoes';
import { MemoriaMudou, RECADO_MEMORIA_MUDOU, obterAviso, obterMemoria, obterRelatoPorId, refazerSeAMemoriaMudou, responderPedidoDoRelato } from '../../lib/servidor/repositorio';

/** A memória mudou entre a leitura do pedido e a resposta: o pedido também mudou, e nada foi feito. */
export const RECADO_PEDIDO_MUDOU = 'A memória mudou, e o pedido também. Confira e responda de novo.';

const RECADOS = {
  liberar: 'Relato liberado para quem passou a ver a memória.',
  manter: 'Seu relato continua só para quem via antes. Dá para liberar depois, no próprio relato.',
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  const { usuario } = locals;
  const dados = await request.formData();
  const resposta = campo(dados, 'resposta', 20);
  if (resposta !== 'liberar' && resposta !== 'manter') return erro(400, 'Resposta inválida.');
  const avisoId = Number(campo(dados, 'aviso', 20)) || undefined;
  const aviso = avisoId ? await obterAviso(avisoId, usuario) : undefined;
  if (avisoId && (!aviso || aviso.tipo !== 'liberar-relato')) return erro(404, 'Aviso não encontrado.');
  const relatoId = aviso?.relatoId ?? (Number(campo(dados, 'relato', 20)) || undefined);
  // A resposta conta com o público que leu: se a memória mudou no meio tempo, lê de novo e refaz
  // (refazerSeAMemoriaMudou, revisão Y2 do PR #160)
  const feito = await refazerSeAMemoriaMudou(async () => {
    const relato = relatoId ? await obterRelatoPorId(relatoId) : undefined;
    // Quem não vê a memória recebe o mesmo que para um relato que não existe
    const memoria = relato ? await obterMemoria(usuario, relato.memoriaId) : undefined;
    // Só quem registrou responde; para os outros, o relato responde como se não existisse, para não
    // denunciar um relato que eles não veem (QA de 18/11/2026)
    if (!relato || !memoria || relato.registradoPor !== usuario.pessoa) return { recusa: true as const };
    const volta = campo(dados, 'volta', 300) || `/memorias/${memoria.id}`;
    // A resposta vale para o público que a pessoa leu no pedido. Se a memória mudou desde então (ou a página
    // é de antes de o formulário mandar o público), nada é liberado nem mantido: ela volta ao pedido de agora
    if (campo(dados, 'publico', 400) !== chaveDoPublico(memoria)) return { volta, erro: RECADO_PEDIDO_MUDOU };
    // O relato já acompanha a memória (liberado antes, ou a memória foi restringida): o pedido só sai da lista
    const jaAcompanha = !podeLiberarRelato(usuario, relato).ok;
    await responderPedidoDoRelato(relato, resposta, memoria);
    return { volta, ok: jaAcompanha ? 'Este relato já aparece para todos que veem a memória.' : RECADOS[resposta] };
  });
  if (feito instanceof MemoriaMudou) return voltar(request, campo(dados, 'volta', 300) || '/', { erro: RECADO_MEMORIA_MUDOU });
  if ('recusa' in feito) return erro(404, 'Relato não encontrado.');
  if ('erro' in feito) return voltar(request, feito.volta, { erro: feito.erro });
  return voltar(request, feito.volta, { ok: feito.ok });
};
