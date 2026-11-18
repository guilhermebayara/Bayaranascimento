// Reações (onda 2, decisão do Gui de 17/11/2026; refeitas no padrão das redes em 18/11/2026; src/lib/reacoes.ts).
// Na memória, em cada relato e em cada foto. Só reage quem vê o item; quem não vê recebe o mesmo que para um
// item que não existe. O script da página pede JSON e redesenha as reações no lugar, sem recarregar; sem
// script, o formulário comum volta para o mesmo ponto da página. "Entrar em Quem estava", depois de "eu
// estava lá", põe a própria pessoa na memória, com a versão de antes no histórico.
import type { APIRoute } from 'astro';
import { ehAlvo, ehSimbolo, ofereceEntrar, resumoDasReacoes } from '../../lib/reacoes';
import { campo, mesmaOrigem, responder } from '../../lib/servidor/http';
import { alternarReacao, atualizarMemoria, disseQueEstava, fichaComoEsta, listarIntegrantes, listarIntegrantesQueVe, listarReacoes, listarRelatos, obterMemoria } from '../../lib/servidor/repositorio';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario } = locals;
  const dados = await request.formData();
  const memoria = await obterMemoria(usuario, campo(dados, 'memoria', 120));
  if (!memoria || memoria.situacao !== 'publicada') return responder(request, '/', { erro: 'Memória não encontrada.' });
  const pagina = `/memorias/${memoria.id}`;
  const volta = campo(dados, 'volta', 200).startsWith(pagina) ? campo(dados, 'volta', 200) : pagina;
  const acao = campo(dados, 'acao', 20);
  const temPagina = async () => (await listarIntegrantesQueVe(usuario)).some((i) => i.id === usuario.pessoa);

  if (acao === 'entrar') {
    // Só a própria pessoa, só quem tem página no acervo e só depois de dizer "eu estava lá"
    if (!(await temPagina()) || memoria.integrantes.includes(usuario.pessoa) || !(await disseQueEstava(memoria.id, usuario))) return responder(request, volta, { erro: 'Não foi possível entrar em Quem estava.' });
    await atualizarMemoria(memoria, { ...fichaComoEsta(memoria), integrantes: [...memoria.integrantes, usuario.pessoa] }, usuario, []);
    return responder(request, volta, { ok: 'Você entrou em Quem estava.' });
  }

  if (acao !== 'reagir') return responder(request, pagina, { erro: 'Ação desconhecida.' });
  const simbolo = campo(dados, 'simbolo', 10);
  const alvo = campo(dados, 'alvo', 10);
  // A memória inteira é o alvo 0
  const alvoId = alvo === 'memoria' ? 0 : Number(campo(dados, 'alvoId', 12));
  if (!ehSimbolo(simbolo) || !ehAlvo(alvo)) return responder(request, volta, { erro: 'Reação desconhecida.' });
  // A memória já foi conferida; o relato precisa ser um que a pessoa vê, publicado; a foto, uma da memória (as que ela vê)
  const existe =
    alvo === 'memoria' || (alvo === 'relato' ? (await listarRelatos(usuario, memoria.id)).some((r) => r.id === alvoId && r.situacao === 'publicada') : memoria.fotos.some((f) => f.id === alvoId));
  if (!existe) return responder(request, pagina, { erro: alvo === 'relato' ? 'Relato não encontrado.' : 'Foto não encontrada.' });
  const marcou = await alternarReacao(memoria.id, alvo, alvoId, simbolo, usuario);

  // Para o script: o resumo novo do item, para redesenhar no lugar, e se a oferta de entrar em Quem estava aparece
  const chave = `${alvo}:${alvoId}`;
  const [reacoes, todos] = await Promise.all([listarReacoes(memoria.id, usuario, new Set([chave])), listarIntegrantes()]);
  const nome = (id: string) => todos.find((i) => i.id === id)?.apelido ?? todos.find((i) => i.id === id)?.nome ?? 'alguém';
  const entrar = simbolo === 'estava' && (await temPagina()) && ofereceEntrar(await disseQueEstava(memoria.id, usuario), memoria.integrantes.includes(usuario.pessoa));
  return responder(request, volta, {}, { marcou, resumo: resumoDasReacoes(reacoes.get(chave), usuario.pessoa, nome), ofereceEntrar: entrar });
};
