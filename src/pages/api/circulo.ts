// O círculo: guarda a proximidade de alguém para quem está logado. Só o dono escreve as linhas dele,
// e só de quem está no círculo dele (a mesma lista da página). Ninguém lê o círculo de outra pessoa:
// não existe rota de leitura. O slider e o arrasto da página do círculo mandam para cá em JSON; a
// proximidade de cada laço, na edição dos laços, manda um formulário (no lugar, pelo script; sem
// script, o formulário comum, que volta para a página).
import type { APIRoute } from 'astro';
import { lerAngulo, lerProximidade, nivelDoValor, nomeDaProximidade, proximidadeDoFormulario } from '../../lib/circulo';
import { montarCirculo } from '../../lib/servidor/circulo';
import { campo, erro, json, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { listarLacosDoCoracao, removerProximidade, salvarProximidade } from '../../lib/servidor/repositorio';

const NAO_ESTA = 'Essa pessoa não está no seu círculo.';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  const { usuario } = locals;
  const ehFormulario = !(request.headers.get('Content-Type') ?? '').includes('application/json');
  let pedido: { pessoa?: unknown; valor?: unknown; angulo?: unknown };
  let volta = '/circulo';
  try {
    if (ehFormulario) {
      // O formulário manda a posição do slider (do mais distante ao mais próximo) e a de quando a página abriu
      const dados = await request.formData();
      volta = campo(dados, 'volta', 300) || volta;
      const pedida = proximidadeDoFormulario(dados.get('posicao'), dados.get('posicaoAntes'));
      if ('erro' in pedida) return voltar(request, volta, { erro: pedida.erro });
      if (!pedida.mexeu) return voltar(request, volta);
      pedido = { pessoa: campo(dados, 'pessoa', 80), valor: pedida.valor };
    } else {
      pedido = await request.json();
    }
  } catch {
    return erro(400, 'Pedido incompleto.');
  }
  const falhar = (status: number, mensagem: string) => (ehFormulario ? voltar(request, volta, { erro: mensagem }) : erro(status, mensagem));
  const circulo = await montarCirculo(usuario);
  const pessoa = typeof pedido.pessoa === 'string' ? pedido.pessoa : '';
  // Quem a pessoa não vê, ou não é do círculo dela, recebe a mesma resposta de quem não existe
  const noCirculo = circulo ? [...circulo.dentro, ...circulo.fora].find((p) => p.id === pessoa) : undefined;
  if (!circulo || !noCirculo) return falhar(404, NAO_ESTA);

  // Sem valor: a proximidade declarada sai, e a pessoa volta para a faixa do parentesco ou do laço
  if (pedido.valor === null || pedido.valor === undefined || pedido.valor === '') {
    await removerProximidade(usuario.pessoa, pessoa);
    return json({ ok: true });
  }
  const valor = lerProximidade(pedido.valor);
  if (valor === null) return falhar(400, 'A proximidade vai de 0 a 100.');
  const angulo = pedido.angulo === null || pedido.angulo === undefined ? null : lerAngulo(pedido.angulo);
  if (pedido.angulo !== null && pedido.angulo !== undefined && angulo === null) return falhar(400, 'Lugar desconhecido.');
  // O laço do coração dos dois, se existe, acompanha a faixa
  const temLaco = (await listarLacosDoCoracao(usuario)).some((l) => l.dono === usuario.pessoa && l.pessoa === pessoa);
  await salvarProximidade(usuario.pessoa, pessoa, valor, angulo, temLaco ? nivelDoValor(valor) : null);
  if (ehFormulario) return voltar(request, volta, { ok: `Proximidade de ${noCirculo.nome} guardada: ${nomeDaProximidade(valor).toLowerCase()}.` });
  return json({ ok: true });
};
