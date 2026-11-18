// Fotos sem memória há mais de 30 dias (onda 2, decisão do Gui de 17/11/2026): nada se apaga sozinho.
// Em Administração, o administrador confere a lista e apaga uma por vez. É a única rota que apaga um
// arquivo do bucket das fotos de verdade, e a guarda da produção (scripts/confere-producao.mjs) só
// abre esta: a foto é conferida de novo no banco (sem memória, sem relato, há mais de 30 dias, fora
// dos exemplos) antes de o arquivo sair. Teste em testes/fotos-soltas.test.ts.
import type { APIRoute } from 'astro';
import { bucketDeFotos } from '../../lib/servidor/ambiente';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { podeApagarFotoSolta } from '../../lib/servidor/permissoes';
import { esquecerFotoSolta, obterFotoSolta } from '../../lib/servidor/repositorio';

const VOLTA = '/admin/fotos-soltas';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const decisao = podeApagarFotoSolta(locals.usuario);
  if (!decisao.ok) return voltar(request, '/conta', { erro: decisao.motivo });
  const dados = await request.formData();
  if (campo(dados, 'acao', 20) !== 'apagar') return voltar(request, VOLTA, { erro: 'Ação desconhecida.' });
  const foto = await obterFotoSolta(Number(campo(dados, 'foto', 12)));
  if (!foto) return voltar(request, VOLTA, { erro: 'Foto não encontrada entre as fotos sem memória.' });
  await bucketDeFotos().delete(foto.chave);
  await esquecerFotoSolta(foto.id);
  return voltar(request, VOLTA, { ok: 'Foto apagada.' });
};
