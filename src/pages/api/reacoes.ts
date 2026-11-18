// Reações (onda 2, decisão do Gui de 17/11/2026; src/lib/reacoes.ts). Só reage quem vê o relato ou a
// foto; quem não vê recebe o mesmo que para um item que não existe. "Entrar em Quem estava", depois de
// "eu estava lá", põe a própria pessoa na memória, com a versão de antes no histórico.
import type { APIRoute } from 'astro';
import { ehSimbolo } from '../../lib/reacoes';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { alternarReacao, atualizarMemoria, disseQueEstava, fichaComoEsta, listarIntegrantesQueVe, listarRelatos, obterMemoria } from '../../lib/servidor/repositorio';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario } = locals;
  const dados = await request.formData();
  const memoria = await obterMemoria(usuario, campo(dados, 'memoria', 120));
  if (!memoria || memoria.situacao !== 'publicada') return voltar(request, '/', { erro: 'Memória não encontrada.' });
  const pagina = `/memorias/${memoria.id}`;
  const volta = campo(dados, 'volta', 200).startsWith(pagina) ? campo(dados, 'volta', 200) : pagina;
  const acao = campo(dados, 'acao', 20);

  if (acao === 'entrar') {
    // Só a própria pessoa, só quem tem página no acervo e só depois de dizer "eu estava lá"
    const temPagina = (await listarIntegrantesQueVe(usuario)).some((i) => i.id === usuario.pessoa);
    if (!temPagina || memoria.integrantes.includes(usuario.pessoa) || !(await disseQueEstava(memoria.id, usuario))) return voltar(request, volta, { erro: 'Não foi possível entrar em Quem estava.' });
    await atualizarMemoria(memoria, { ...fichaComoEsta(memoria), integrantes: [...memoria.integrantes, usuario.pessoa] }, usuario, []);
    return voltar(request, volta, { ok: 'Você entrou em Quem estava.' });
  }

  if (acao !== 'reagir') return voltar(request, pagina, { erro: 'Ação desconhecida.' });
  const simbolo = campo(dados, 'simbolo', 10);
  const alvo = campo(dados, 'alvo', 10);
  const alvoId = Number(campo(dados, 'alvoId', 12));
  if (!ehSimbolo(simbolo) || (alvo !== 'relato' && alvo !== 'foto')) return voltar(request, volta, { erro: 'Reação desconhecida.' });
  // O relato precisa ser um que a pessoa vê, publicado; a foto, uma da memória (as que ela vê)
  const existe =
    alvo === 'relato' ? (await listarRelatos(usuario, memoria.id)).some((r) => r.id === alvoId && r.situacao === 'publicada') : memoria.fotos.some((f) => f.id === alvoId);
  if (!existe) return voltar(request, pagina, { erro: alvo === 'relato' ? 'Relato não encontrado.' : 'Foto não encontrada.' });
  await alternarReacao(memoria.id, alvo, alvoId, simbolo, usuario);
  return voltar(request, volta);
};
