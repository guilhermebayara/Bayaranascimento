// Tipos de momento: só admins criam, renomeiam e promovem um texto de "Outro" a tipo oficial.
import type { APIRoute } from 'astro';
import { criarSlug, slugUnico } from '../../lib/servidor/conteudo';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { SEM_CODIGO, atualizarTipo, comCodigoNovo, criarTipo, listarTipos, promoverTextoDeOutro } from '../../lib/servidor/repositorio';
import { TIPO_OUTRO } from '../../lib/tipos';
import { ehCorDaPaleta } from '../../lib/visual';
import { RABISCO_PADRAO, ehRabisco } from '../../visual/rabiscos';

const PAGINA = '/admin/tipos';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario, tipos } = locals;
  if (!usuario.admin) return voltar(request, '/', { erro: 'Só os administradores cuidam da lista de tipos.' });

  const dados = await request.formData();
  const acao = campo(dados, 'acao', 20);
  const rotulo = campo(dados, 'rotulo', 40);
  // A cor é o nome de uma cor da paleta e o ícone, o de um rabisco: fora das listas, o pedido é recusado.
  // Sem ícone no pedido (juntar um texto de "Outro" a um tipo novo, por exemplo), vale o brilho.
  const cor = campo(dados, 'cor', 20);
  const icone = campo(dados, 'icone', 20) || RABISCO_PADRAO;

  const validarNovo = (): string | undefined => {
    if (!rotulo) return 'Dê um nome ao tipo.';
    if (!ehCorDaPaleta(cor)) return 'Escolha uma cor da lista.';
    if (!ehRabisco(icone)) return 'Escolha um desenho da lista.';
    if (tipos.some((t) => t.rotulo.toLowerCase() === rotulo.toLowerCase())) return `Já existe um tipo chamado “${rotulo}”.`;
    return undefined;
  };
  // O código que outro pedido usou no meio tempo: o site tenta de novo sozinho, com a lista de agora, e no fim
  // volta com o recado, sem 500 (o D2 da sessão Z, estendido na sessão AA)
  const criar = async (): Promise<string | { erro: string }> => {
    const feito = await comCodigoNovo(async (vez) => {
      const lista = vez === 1 ? tipos : await listarTipos();
      if (vez > 1 && lista.some((t) => t.rotulo.toLowerCase() === rotulo.toLowerCase())) return { erro: `Já existe um tipo chamado “${rotulo}”.` };
      const id = slugUnico(criarSlug(rotulo), new Set(lista.map((t) => t.id)));
      await criarTipo(id, rotulo, cor, icone, usuario);
      return id;
    });
    return feito === SEM_CODIGO ? { erro: 'Não consegui salvar.' } : feito;
  };

  if (acao === 'criar') {
    const problema = validarNovo();
    if (problema) return voltar(request, PAGINA, { erro: problema });
    const criado = await criar();
    if (typeof criado !== 'string') return voltar(request, PAGINA, criado);
    return voltar(request, PAGINA, { ok: `Tipo “${rotulo}” criado.` });
  }

  if (acao === 'editar') {
    const id = campo(dados, 'id', 60);
    const atual = tipos.find((t) => t.id === id);
    if (!atual) return voltar(request, PAGINA, { erro: 'Tipo não encontrado.' });
    if (!rotulo) return voltar(request, PAGINA, { erro: 'Dê um nome ao tipo.' });
    if (!ehCorDaPaleta(cor)) return voltar(request, PAGINA, { erro: 'Escolha uma cor da lista.' });
    if (!ehRabisco(icone)) return voltar(request, PAGINA, { erro: 'Escolha um desenho da lista.' });
    if (tipos.some((t) => t.id !== id && t.rotulo.toLowerCase() === rotulo.toLowerCase())) {
      return voltar(request, PAGINA, { erro: `Já existe um tipo chamado “${rotulo}”.` });
    }
    // "Outro" é a saída de quem não achou o tipo: muda de cor, mas não de nome
    await atualizarTipo(id, id === TIPO_OUTRO ? atual.rotulo : rotulo, cor, icone);
    // A página volta para a linha do tipo, e o recado ("Viagem atualizado.") aparece ali (resposta do Gui à P161, 17/11/2026)
    return voltar(request, `${PAGINA}?salvo=${encodeURIComponent(id)}#tipo-${encodeURIComponent(id)}`);
  }

  if (acao === 'promover') {
    const texto = campo(dados, 'texto', 40);
    if (!texto) return voltar(request, PAGINA, { erro: 'Faltou o texto a promover.' });
    // Para um tipo que já existe, ou para um novo
    let destino = campo(dados, 'destino', 60);
    if (destino) {
      if (destino === TIPO_OUTRO || !tipos.some((t) => t.id === destino)) return voltar(request, PAGINA, { erro: 'Tipo de destino não encontrado.' });
    } else {
      const problema = validarNovo();
      if (problema) return voltar(request, PAGINA, { erro: problema });
      const criado = await criar();
      if (typeof criado !== 'string') return voltar(request, PAGINA, criado);
      destino = criado;
    }
    await promoverTextoDeOutro(texto, destino, usuario);
    // Sem número: contar as memórias que o admin não vê entregaria que elas existem (decisão do Gui, 16/11/2026)
    const nomeDoTipo = tipos.find((t) => t.id === destino)?.rotulo ?? rotulo;
    return voltar(request, PAGINA, { ok: `As memórias com “${texto}” passaram para ${nomeDoTipo}.` });
  }

  return voltar(request, PAGINA, { erro: 'Ação desconhecida.' });
};
