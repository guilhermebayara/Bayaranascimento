// Tipos de momento: só admins criam, renomeiam e promovem um texto de "Outro" a tipo oficial.
import type { APIRoute } from 'astro';
import { criarSlug, slugUnico } from '../../lib/servidor/conteudo';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { atualizarTipo, criarTipo, promoverTextoDeOutro } from '../../lib/servidor/repositorio';
import { TIPO_OUTRO } from '../../lib/tipos';

const PAGINA = '/admin/tipos';
const COR = /^#[0-9a-fA-F]{6}$/;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario, tipos } = locals;
  if (!usuario.admin) return voltar(request, '/', { erro: 'Só o Gui e a Giovanna cuidam da lista de tipos.' });

  const dados = await request.formData();
  const acao = campo(dados, 'acao', 20);
  const rotulo = campo(dados, 'rotulo', 40);
  const cor = campo(dados, 'cor', 7);

  const validarNovo = (): string | undefined => {
    if (!rotulo) return 'Dê um nome ao tipo.';
    if (!COR.test(cor)) return 'Escolha uma cor.';
    if (tipos.some((t) => t.rotulo.toLowerCase() === rotulo.toLowerCase())) return `Já existe um tipo chamado "${rotulo}".`;
    return undefined;
  };
  const criar = async (): Promise<string> => {
    const id = slugUnico(criarSlug(rotulo), new Set(tipos.map((t) => t.id)));
    await criarTipo(id, rotulo, cor, usuario);
    return id;
  };

  if (acao === 'criar') {
    const problema = validarNovo();
    if (problema) return voltar(request, PAGINA, { erro: problema });
    await criar();
    return voltar(request, PAGINA, { ok: `Tipo "${rotulo}" criado.` });
  }

  if (acao === 'editar') {
    const id = campo(dados, 'id', 60);
    const atual = tipos.find((t) => t.id === id);
    if (!atual) return voltar(request, PAGINA, { erro: 'Tipo não encontrado.' });
    if (!rotulo) return voltar(request, PAGINA, { erro: 'Dê um nome ao tipo.' });
    if (!COR.test(cor)) return voltar(request, PAGINA, { erro: 'Escolha uma cor.' });
    if (tipos.some((t) => t.id !== id && t.rotulo.toLowerCase() === rotulo.toLowerCase())) {
      return voltar(request, PAGINA, { erro: `Já existe um tipo chamado "${rotulo}".` });
    }
    // "Outro" é a saída de quem não achou o tipo: muda de cor, mas não de nome
    await atualizarTipo(id, id === TIPO_OUTRO ? atual.rotulo : rotulo, cor);
    return voltar(request, PAGINA, { ok: 'Tipo atualizado.' });
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
      destino = await criar();
    }
    const quantas = await promoverTextoDeOutro(texto, destino);
    return voltar(request, PAGINA, { ok: `${quantas} ${quantas === 1 ? 'memória passou' : 'memórias passaram'} para o tipo escolhido.` });
  }

  return voltar(request, PAGINA, { erro: 'Ação desconhecida.' });
};
