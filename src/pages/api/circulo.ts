// O círculo: guarda a proximidade de alguém para quem está logado. Só o dono escreve as linhas dele,
// e só de quem está no círculo dele (a mesma lista da página). Ninguém lê o círculo de outra pessoa:
// não existe rota de leitura. O slider e o arrasto da página mandam para cá.
import type { APIRoute } from 'astro';
import { lerAngulo, lerProximidade, nivelDoValor } from '../../lib/circulo';
import { montarCirculo } from '../../lib/servidor/circulo';
import { erro, json, mesmaOrigem } from '../../lib/servidor/http';
import { listarLacosDoCoracao, removerProximidade, salvarProximidade } from '../../lib/servidor/repositorio';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  const { usuario } = locals;
  let pedido: { pessoa?: unknown; valor?: unknown; angulo?: unknown };
  try {
    pedido = await request.json();
  } catch {
    return erro(400, 'Pedido incompleto.');
  }
  const circulo = await montarCirculo(usuario);
  const pessoa = typeof pedido.pessoa === 'string' ? pedido.pessoa : '';
  // Quem a pessoa não vê, ou não é do círculo dela, recebe a mesma resposta de quem não existe
  if (!circulo || ![...circulo.dentro, ...circulo.fora].some((p) => p.id === pessoa)) return erro(404, 'Essa pessoa não está no seu círculo.');

  // Sem valor: a proximidade declarada sai, e a pessoa volta para a faixa do parentesco ou do laço
  if (pedido.valor === null || pedido.valor === undefined || pedido.valor === '') {
    await removerProximidade(usuario.pessoa, pessoa);
    return json({ ok: true });
  }
  const valor = lerProximidade(pedido.valor);
  if (valor === null) return erro(400, 'A proximidade vai de 0 a 100.');
  const angulo = pedido.angulo === null || pedido.angulo === undefined ? null : lerAngulo(pedido.angulo);
  if (pedido.angulo !== null && pedido.angulo !== undefined && angulo === null) return erro(400, 'Lugar desconhecido.');
  // O laço do coração dos dois, se existe, acompanha a faixa
  const temLaco = (await listarLacosDoCoracao(usuario)).some((l) => l.dono === usuario.pessoa && l.pessoa === pessoa);
  await salvarProximidade(usuario.pessoa, pessoa, valor, angulo, temLaco ? nivelDoValor(valor) : null);
  return json({ ok: true });
};
