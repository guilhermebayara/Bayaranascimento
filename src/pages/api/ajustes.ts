// Ajustes do acervo, escolhidos pelos administradores (migração 073). Hoje: os centros da árvore.
import type { APIRoute } from 'astro';
import { comLacoDeArvore } from '../../lib/arvore-montagem';
import { AJUSTE_DOS_CENTROS, centrosValidos } from '../../lib/centros-da-arvore';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { modeloDeTranscricao } from '../../lib/servidor/ambiente';
import { AJUSTE_DA_TRANSCRICAO } from '../../lib/transcricao';
import { podeMudarAjustes } from '../../lib/servidor/permissoes';
import { listarCasais, listarFiliacoes, listarIntegrantesQueVe, salvarAjuste } from '../../lib/servidor/repositorio';

const PAGINA = '/admin/arvore';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario } = locals;
  const decisao = podeMudarAjustes(usuario);
  if (!decisao.ok) return voltar(request, '/conta', { erro: decisao.motivo });
  const dados = await request.formData();
  const acao = campo(dados, 'acao', 30);

  // A transcrição automática (onda 2): só liga onde o Workers AI está ligado no Cloudflare
  if (acao === 'transcricao-ligar' || acao === 'transcricao-desligar') {
    const ligar = acao === 'transcricao-ligar';
    if (ligar && !modeloDeTranscricao()) return voltar(request, '/admin/transcricao', { erro: 'Falta ligar o Workers AI no Cloudflare.' });
    await salvarAjuste(AJUSTE_DA_TRANSCRICAO, ligar, usuario);
    return voltar(request, '/admin/transcricao', { ok: ligar ? 'Transcrição automática ligada.' : 'Transcrição automática desligada.' });
  }

  if (acao === 'centros-padrao') {
    await salvarAjuste(AJUSTE_DOS_CENTROS, null, usuario);
    return voltar(request, PAGINA, { ok: 'A árvore volta a abrir no padrão.' });
  }
  if (acao === 'centros') {
    // Só serve quem o administrador vê e tem laço de árvore: quem ele não vê responde como quem não existe
    const integrantes = new Set((await listarIntegrantesQueVe(usuario)).map((i) => i.id));
    const comLaco = comLacoDeArvore({ filiacoes: (await listarFiliacoes()).map((f) => ({ filho: f.filho, responsavel: f.responsavel, consideracao: f.qualidade === 'consideracao' })), casais: (await listarCasais(usuario)).filter((c) => c.fases.length > 0).map((c) => ({ a: c.a, b: c.b, ex: false })) });
    const centros = centrosValidos(dados.getAll('centro').map(String), (id) => integrantes.has(id) && comLaco.has(id));
    if (centros.length === 0) return voltar(request, PAGINA, { erro: 'Escolha pelo menos uma pessoa com pais, filhos ou casal no acervo.' });
    await salvarAjuste(AJUSTE_DOS_CENTROS, centros, usuario);
    return voltar(request, PAGINA, { ok: 'Centros da árvore salvos.' });
  }
  return voltar(request, PAGINA, { erro: 'Ação desconhecida.' });
};
