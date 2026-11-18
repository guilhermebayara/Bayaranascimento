// A resposta ao pedido para liberar um relato (docs/decisoes.md, "Ampliar quem vê uma memória com
// relatos"). Chega pelo aviso, com "Liberar para quem passou a ver" ou "Manter como estava", ou depois,
// pela linha discreta no próprio relato ("Visível só para quem via antes. Liberar"). É um formulário
// comum, que funciona sem script, e volta para a página de onde veio com o recado.
import type { APIRoute } from 'astro';
import { campo, erro, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { podeLiberarRelato } from '../../lib/servidor/permissoes';
import { obterAviso, obterMemoria, obterRelatoPorId, responderPedidoDoRelato } from '../../lib/servidor/repositorio';

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
  const relato = relatoId ? await obterRelatoPorId(relatoId) : undefined;
  // Quem não vê a memória recebe o mesmo que para um relato que não existe
  const memoria = relato ? await obterMemoria(usuario, relato.memoriaId) : undefined;
  if (!relato || !memoria) return erro(404, 'Relato não encontrado.');
  const volta = campo(dados, 'volta', 300) || `/memorias/${memoria.id}`;
  const decisao = podeLiberarRelato(usuario, relato);
  if (!decisao.ok) {
    // O relato já acompanha a memória (liberado antes, ou a memória foi restringida): o pedido só sai da lista
    if (relato.registradoPor === usuario.pessoa) {
      await responderPedidoDoRelato(relato.id, resposta);
      return voltar(request, volta, { ok: 'Este relato já aparece para todos que veem a memória.' });
    }
    return voltar(request, volta, { erro: decisao.motivo });
  }
  await responderPedidoDoRelato(relato.id, resposta);
  return voltar(request, volta, { ok: RECADOS[resposta] });
};
