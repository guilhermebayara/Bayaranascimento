// Painel pessoal: a carta de Natal, escrita pelos administradores, e a volta à primeira visita,
// que só existe na homologação e nas prévias, para conferir a carta.
import type { APIRoute } from 'astro';
import { semLogin } from '../../lib/servidor/acesso';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { esquecerVisitas, salvarCarta } from '../../lib/servidor/repositorio';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario } = locals;
  const dados = await request.formData();
  const acao = campo(dados, 'acao', 20);

  if (acao === 'primeira-visita') {
    if (!semLogin()) return new Response('Não encontrado', { status: 404 });
    await esquecerVisitas(usuario.pessoa);
    return voltar(request, '/', { ok: 'Pronto: esta é de novo a primeira visita.' });
  }

  if (acao === 'carta') {
    if (!usuario.admin) return voltar(request, '/', { erro: 'Só os administradores escrevem a carta.' });
    // O texto fica como foi escrito: só as pontas e as quebras de linha do Windows são arrumadas
    const texto = String(dados.get('texto') ?? '').replace(/\r\n/g, '\n').trim().slice(0, 10000);
    const assinatura = campo(dados, 'assinatura', 200);
    if (!texto) return voltar(request, '/admin/carta', { erro: 'Escreva o texto da carta.' });
    if (!assinatura) return voltar(request, '/admin/carta', { erro: 'Diga quem assina a carta.' });
    await salvarCarta(texto, assinatura, usuario);
    return voltar(request, '/admin/carta', { ok: 'Carta salva. A versão anterior fica guardada.' });
  }

  return new Response('Pedido recusado.', { status: 400 });
};
