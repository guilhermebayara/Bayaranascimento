// Capítulos: criar, editar e mandar para a lixeira.
import type { APIRoute } from 'astro';
import { lerDeQuem, lerModoDoFormulario, lerPeriodoDoCapitulo, lerTemas, validarAninhamento } from '../../lib/capitulos';
import { arrumarTexto, codigoNovo } from '../../lib/servidor/conteudo';
import { campo, campoNumero, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { podeEditarCapitulo, podeEditarMemoria, podeMudarQuemVe, podeSalvarCapitulo, validarVisibilidade } from '../../lib/servidor/permissoes';
import {
  excluirCapitulo,
  listarMemorias,
  mudarMemoriasDoCapitulo,
  garantirTemas,
  idsDeCapitulos,
  listarCapitulos,
  listarCapitulosExcluidos,
  listarIntegrantesQueVe,
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
    if (!usuario.admin) return voltar(request, '/lixeira', { erro: 'Só os administradores restauram capítulos.' });
    const excluido = (await listarCapitulosExcluidos(usuario)).find((c) => c.id === id);
    if (!excluido) return voltar(request, '/lixeira', { erro: 'Capítulo não encontrado na lixeira.' });
    await restaurarCapitulo(id);
    // Como na memória: restaurar fica na lixeira, com o caminho para o capítulo (resposta do Gui à P154, 17/11/2026)
    return voltar(request, `/lixeira?restaurado=${encodeURIComponent(id)}`, { ok: 'Capítulo restaurado.' });
  }

  const capitulos = await listarCapitulos(usuario);
  const atual = id ? capitulos.find((c) => c.id === id) : undefined;
  if (id && !atual) return voltar(request, '/capitulos', { erro: 'Capítulo não encontrado.' });

  if (acao === 'excluir') {
    if (!atual) return voltar(request, '/capitulos', { erro: 'Capítulo não encontrado.' });
    if (!usuario.admin) return voltar(request, `/capitulos/${id}`, { erro: 'Só os administradores excluem capítulos.' });
    await excluirCapitulo(id, usuario);
    return voltar(request, '/capitulos', { ok: `“${atual.titulo}” foi para a lixeira. As memórias dele continuam no acervo.` });
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
  if (atual) {
    const editar = podeEditarCapitulo(usuario, atual);
    if (!editar.ok) return voltar(request, `/capitulos/${atual.id}`, { erro: editar.motivo });
  }

  // Época e capítulo por período ficam no mesmo modo do banco; a época é o que não tem ninguém marcado
  const escolha = lerModoDoFormulario(campo(dados, 'modo', 10));
  const modo = escolha === 'reunido' ? 'reunido' : 'epoca';
  const salvar = podeSalvarCapitulo(usuario, atual, escolha);
  if (!salvar.ok) return falhar(salvar.motivo);

  const titulo = campo(dados, 'titulo', 120);
  if (!titulo) return falhar('Dê um título ao capítulo.');

  // Por período e época: início obrigatório, fim opcional, com mês e dia opcionais (lerPeriodoDoCapitulo)
  const nomes = ['inicioAno', 'inicioMes', 'inicioDia', 'fimAno', 'fimMes', 'fimDia'] as const;
  const periodo =
    modo === 'epoca'
      ? lerPeriodoDoCapitulo(Object.fromEntries(nomes.map((n) => [n, campoNumero(dados, n)])) as Record<(typeof nomes)[number], number | undefined>, new Date().getUTCFullYear(), escolha === 'epoca')
      : undefined;
  if (periodo && 'erro' in periodo) return falhar(periodo.erro);

  // De quem é o capítulo por período: pessoas, famílias ou os dois. Ninguém marcado quer dizer época, de todos.
  const nucleosDoAcervo = await listarNucleos();
  // Só se marca quem a pessoa vê (C1, 17/11/2026). Numa edição, quem já estava e ela não vê continua.
  const marcaveis = new Set((await listarIntegrantesQueVe(usuario)).map((i) => i.id));
  const lido =
    escolha === 'periodo'
      ? lerDeQuem(
          { pessoas: dados.getAll('pessoas').map(String), familias: dados.getAll('familias').map(String) },
          { pessoas: marcaveis, familias: new Set(nucleosDoAcervo.map((n) => n.id)) },
        )
      : { pessoas: [], familias: [] };
  if ('erro' in lido) return falhar(lido.erro);
  const escondidos = escolha === 'periodo' ? (atual?.pessoas ?? []).filter((p) => !marcaveis.has(p) && !lido.pessoas.includes(p)) : [];
  const deQuem = { ...lido, pessoas: [...lido.pessoas, ...escondidos] };
  if (escolha === 'periodo' && lido.pessoas.length + lido.familias.length === 0) {
    return falhar('Marque de quem é este período. Se ele vale para a família inteira, escolha “Época”.');
  }

  // Dentro de outro capítulo: no máximo dois níveis
  const dentroDe = campo(dados, 'dentroDe', 120) || undefined;
  const pai = dentroDe ? capitulos.find((c) => c.id === dentroDe) : undefined;
  if (dentroDe && !pai) return falhar('O capítulo maior não foi encontrado.');
  const problema = validarAninhamento({ id: atual?.id, temFilhos: Boolean(atual) && capitulos.some((c) => c.dentroDe === atual!.id) }, pai);
  if (problema) return falhar(problema);

  // Visibilidade, com as mesmas regras de uma memória
  const nucleosExistentes = new Set(nucleosDoAcervo.map((n) => n.id));
  const permitidos = new Set([...usuario.nucleos, ...(atual?.nucleos ?? [])]);
  const nucleos = [...new Set(dados.getAll('nucleos').map(String))];
  if (nucleos.some((n) => !nucleosExistentes.has(n) || !permitidos.has(n))) return falhar('Você só pode marcar famílias de que faz parte.');
  const visibilidade = campo(dados, 'visibilidade', 10) === 'nucleos' ? 'nucleos' : 'todos';
  if (atual) {
    const quemVe = podeMudarQuemVe(usuario, { ...atual, criadaPor: atual.criadoPor }, visibilidade, visibilidade === 'nucleos' ? nucleos : []);
    if (!quemVe.ok) return falhar(quemVe.motivo);
  }
  const visivel = validarVisibilidade(usuario, visibilidade, nucleos, 'capitulo');
  if (!visivel.ok) return falhar(visivel.motivo);

  const ficha: DadosDoCapitulo = {
    titulo,
    abertura: arrumarTexto(campo(dados, 'abertura', 5000)) || undefined,
    modo,
    inicio: periodo?.inicio,
    fim: periodo?.fim,
    dentroDe,
    visibilidade,
    nucleos: visibilidade === 'nucleos' ? nucleos : [],
    temas: await garantirTemas(lerTemas(campo(dados, 'temas', 500)), usuario),
    pessoas: deQuem.pessoas,
    familias: deQuem.familias,
  };

  // "novo" e "editar" são endereços, então não podem ser id de capítulo
  // Um código no endereço, e não o título: ver codigoNovo
  const idFinal = atual?.id ?? codigoNovo(new Set([...(await idsDeCapitulos()), 'novo']));
  await salvarCapitulo(idFinal, ficha, usuario, !atual);
  return voltar(request, `/capitulos/${idFinal}`, { ok: atual ? 'Capítulo atualizado.' : escolha === 'epoca' ? 'Época criada. Tudo o que aconteceu no período entra sozinho.' : escolha === 'periodo' ? 'Capítulo criado. As memórias do período entram sozinhas.' : 'Capítulo criado. Agora é só colocar as memórias nele.' });
};
