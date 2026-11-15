// Capítulos: criar, editar e mandar para a lixeira.
import type { APIRoute } from 'astro';
import { lerTemas, podeEditarCapitulo, validarAninhamento } from '../../lib/capitulos';
import { arrumarTexto, criarSlug, slugUnico } from '../../lib/servidor/conteudo';
import { campo, campoNumero, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { podeEditarMemoria, validarVisibilidade } from '../../lib/servidor/permissoes';
import {
  autoresDasMemoriasDoCapitulo,
  excluirCapitulo,
  listarMemorias,
  mudarMemoriasDoCapitulo,
  garantirTemas,
  idsDeCapitulos,
  listarCapitulos,
  listarCapitulosExcluidos,
  listarNucleos,
  restaurarCapitulo,
  salvarCapitulo,
  type DadosDoCapitulo,
} from '../../lib/servidor/repositorio';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario } = locals;
  const dados = await request.formData();
  const acao = campo(dados, 'acao', 20);
  const id = campo(dados, 'id', 120);

  if (acao === 'restaurar') {
    if (!usuario.admin) return voltar(request, '/lixeira', { erro: 'Só os administradores recuperam capítulos.' });
    const excluido = (await listarCapitulosExcluidos(usuario)).find((c) => c.id === id);
    if (!excluido) return voltar(request, '/lixeira', { erro: 'Capítulo não encontrado na lixeira.' });
    await restaurarCapitulo(id);
    return voltar(request, `/capitulos/${id}`, { ok: 'Capítulo recuperado.' });
  }

  const capitulos = await listarCapitulos(usuario);
  const atual = id ? capitulos.find((c) => c.id === id) : undefined;
  if (id && !atual) return voltar(request, '/capitulos', { erro: 'Capítulo não encontrado.' });

  if (acao === 'excluir') {
    if (!usuario.admin) return voltar(request, `/capitulos/${id}`, { erro: 'Só os administradores excluem capítulos.' });
    await excluirCapitulo(id, usuario);
    return voltar(request, '/capitulos', { ok: `"${atual!.titulo}" foi para a lixeira. As memórias dele continuam no acervo.` });
  }

  if (acao === 'memorias') {
    // Cada pessoa coloca e tira do capítulo as memórias que ela mesma pode corrigir
    if (!atual || atual.modo !== 'reunido') return voltar(request, '/capitulos', { erro: 'Só capítulos reunidos recebem memórias à mão.' });
    const marcadas = new Set(dados.getAll('memorias').map(String));
    const minhas = (await listarMemorias(usuario)).filter((m) => podeEditarMemoria(usuario, m).ok);
    const colocar = minhas.filter((m) => marcadas.has(m.id) && !m.capitulos.includes(atual.id)).map((m) => m.id);
    const tirar = minhas.filter((m) => !marcadas.has(m.id) && m.capitulos.includes(atual.id)).map((m) => m.id);
    await mudarMemoriasDoCapitulo(atual.id, colocar, tirar);
    return voltar(request, `/capitulos/${atual.id}`, { ok: 'Memórias do capítulo atualizadas.' });
  }

  const origem = atual ? `/capitulos/${atual.id}/editar` : '/capitulos/novo';
  const falhar = (erro: string) => voltar(request, origem, { erro });
  if (atual && !podeEditarCapitulo(usuario, atual, await autoresDasMemoriasDoCapitulo(atual.id))) {
    return voltar(request, `/capitulos/${atual.id}`, { erro: 'Só quem criou o capítulo e quem tem memórias nele pode alterá-lo.' });
  }

  const titulo = campo(dados, 'titulo', 120);
  if (!titulo) return falhar('Dê um título ao capítulo.');
  const modo = campo(dados, 'modo', 10) === 'epoca' ? 'epoca' : 'reunido';

  // Época: início obrigatório, fim opcional
  const anoAtual = new Date().getUTCFullYear();
  const lerData = (prefixo: string): { ano: number; mes?: number } | undefined | 'invalida' => {
    const ano = campoNumero(dados, `${prefixo}Ano`);
    const mes = campoNumero(dados, `${prefixo}Mes`);
    if (ano === undefined) return mes ? 'invalida' : undefined;
    if (!Number.isInteger(ano) || ano < 1800 || ano > anoAtual) return 'invalida';
    if (mes !== undefined && (!Number.isInteger(mes) || mes < 1 || mes > 12)) return 'invalida';
    return { ano, mes };
  };
  const inicio = lerData('inicio');
  const fim = lerData('fim');
  if (modo === 'epoca') {
    if (inicio === 'invalida' || fim === 'invalida') return falhar(`Confira as datas. Os anos precisam estar entre 1800 e ${anoAtual}.`);
    if (!inicio) return falhar('Um capítulo de época precisa de um ano de início.');
    if (fim && (fim.ano < inicio.ano || (fim.ano === inicio.ano && fim.mes && inicio.mes && fim.mes < inicio.mes))) {
      return falhar('A época não pode terminar antes de começar.');
    }
  }

  // Dentro de outro capítulo: no máximo dois níveis
  const dentroDe = campo(dados, 'dentroDe', 120) || undefined;
  const pai = dentroDe ? capitulos.find((c) => c.id === dentroDe) : undefined;
  if (dentroDe && !pai) return falhar('O capítulo maior não foi encontrado.');
  const problema = validarAninhamento({ id: atual?.id, temFilhos: Boolean(atual) && capitulos.some((c) => c.dentroDe === atual!.id) }, pai);
  if (problema) return falhar(problema);

  // Visibilidade, com as mesmas regras de uma memória
  const nucleosExistentes = new Set((await listarNucleos()).map((n) => n.id));
  const permitidos = new Set([...usuario.nucleos, ...(atual?.nucleos ?? [])]);
  const nucleos = [...new Set(dados.getAll('nucleos').map(String))];
  if (nucleos.some((n) => !nucleosExistentes.has(n) || !permitidos.has(n))) return falhar('Você só pode marcar núcleos de que faz parte.');
  const visibilidade = campo(dados, 'visibilidade', 10) === 'nucleos' ? 'nucleos' : 'todos';
  const visivel = validarVisibilidade(usuario, visibilidade, nucleos);
  if (!visivel.ok) return falhar(visivel.motivo);

  const ficha: DadosDoCapitulo = {
    titulo,
    abertura: arrumarTexto(campo(dados, 'abertura', 5000)) || undefined,
    modo,
    inicio: modo === 'epoca' ? (inicio as { ano: number; mes?: number }) : undefined,
    fim: modo === 'epoca' ? (fim as { ano: number; mes?: number } | undefined) : undefined,
    dentroDe,
    visibilidade,
    nucleos: visibilidade === 'nucleos' ? nucleos : [],
    temas: await garantirTemas(lerTemas(campo(dados, 'temas', 500)), usuario),
  };

  // "novo" e "editar" são endereços, então não podem ser id de capítulo
  const idFinal = atual?.id ?? slugUnico(criarSlug(titulo) || 'capitulo', new Set([...(await idsDeCapitulos()), 'novo']));
  await salvarCapitulo(idFinal, ficha, usuario, !atual);
  return voltar(request, `/capitulos/${idFinal}`, { ok: atual ? 'Capítulo atualizado.' : 'Capítulo criado. Agora é só colocar as memórias nele.' });
};
