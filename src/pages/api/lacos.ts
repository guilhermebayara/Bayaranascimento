// Laços de árvore: filiação (de quem alguém é filho) e casal, com suas fases.
import type { APIRoute } from 'astro';
import { FASES, Familia, PAPEIS, PROXIMIDADES, QUALIDADES, type Fase, type Papel, type Qualidade, type TipoDeFase } from '../../lib/parentesco';
import { criarSlug, slugUnico } from '../../lib/servidor/conteudo';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { podeMexerEmLaco } from '../../lib/servidor/permissoes';
import {
  criarIntegrante,
  listarFiliacoes,
  listarIntegrantes,
  removerLacoDoCoracao,
  salvarLacoDoCoracao,
  obterCasal,
  obterCasalDoPar,
  removerCasal,
  removerFiliacao,
  salvarCasal,
  salvarFiliacao,
} from '../../lib/servidor/repositorio';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario } = locals;
  const dados = await request.formData();
  let acao = campo(dados, 'acao', 30);
  const volta = campo(dados, 'volta', 200) || '/pessoas';
  const falhar = (erro: string) => voltar(request, volta, { erro });

  let integrantes = await listarIntegrantes();
  const achar = (id: string) => integrantes.find((i) => i.id === id);
  const nome = (id: string) => achar(id)?.apelido ?? achar(id)?.nome ?? id;

  // Formulário "Adicionar laço": um seletor escolhe o tipo, e a outra pessoa pode
  // ser alguém da lista ou um nome novo, cadastrado na hora.
  if (acao === 'adicionar') {
    const tipoDeLaco = campo(dados, 'laco', 20);
    const sujeito = campo(dados, 'sujeito', 80);
    // Na página de outra pessoa, o laço do coração é com ela: não há "com quem" a escolher
    const comASujeita = tipoDeLaco === 'coracao' && sujeito !== usuario.pessoa;
    let outra = comASujeita ? sujeito : campo(dados, 'pessoa', 80);
    const nomeNovo = campo(dados, 'nomeNovo', 80);
    if (!outra && nomeNovo) {
      const base = criarSlug(nomeNovo);
      const existente = integrantes.find((i) => criarSlug(i.nome) === base || (i.apelido && criarSlug(i.apelido) === base));
      if (existente) return falhar(`Já existe ${existente.nome} no acervo. Escolha na lista em vez de escrever o nome.`);
      outra = slugUnico(base, new Set([...integrantes.map((i) => i.id), 'nova']));
      await criarIntegrante(outra, nomeNovo, usuario.pessoa);
      integrantes = await listarIntegrantes();
    }
    if (!outra) return falhar('Escolha a pessoa na lista ou escreva o nome de quem ainda não está no acervo.');
    if (tipoDeLaco === 'filho-de') {
      dados.set('acao', 'filiacao-salvar');
      dados.set('filho', sujeito);
      dados.set('responsavel', outra);
    } else if (tipoDeLaco === 'pai-de') {
      dados.set('acao', 'filiacao-salvar');
      dados.set('filho', outra);
      dados.set('responsavel', sujeito);
    } else if (tipoDeLaco === 'casal') {
      dados.set('acao', 'casal-salvar');
      dados.set('a', sujeito);
      dados.set('b', outra);
    } else if (tipoDeLaco === 'coracao') {
      dados.set('acao', 'coracao-salvar');
      // O laço do coração é sempre de quem está logado
      dados.set('pessoa', outra);
    } else {
      return falhar('Escolha o tipo de laço.');
    }
    acao = campo(dados, 'acao', 30);
  }

  if (acao === 'coracao-salvar') {
    const pessoa = achar(campo(dados, 'pessoa', 80));
    if (!pessoa) return falhar('Escolha a pessoa.');
    if (pessoa.id === usuario.pessoa) return falhar('O laço do coração é entre você e outra pessoa.');
    const nomeDoLaco = campo(dados, 'nomeDoLaco', 40);
    if (!nomeDoLaco) return falhar('Dê um nome ao laço, como "amigo-irmão" ou "afilhada".');
    const papelBruto = campo(dados, 'papel', 12);
    if (papelBruto && !(papelBruto in PAPEIS)) return falhar('Papel desconhecido.');
    const proximidade = Number(campo(dados, 'proximidade', 2)) || null;
    if (proximidade !== null && !(proximidade in PROXIMIDADES)) return falhar('Proximidade desconhecida.');
    await salvarLacoDoCoracao(usuario, pessoa.id, {
      nome: nomeDoLaco,
      papel: (papelBruto as Papel) || null,
      proximidade,
      privado: dados.get('privado') === 'on',
    });
    return voltar(request, volta, { ok: `Laço com ${nome(pessoa.id)} salvo.` });
  }

  if (acao === 'coracao-remover') {
    const removido = await removerLacoDoCoracao(usuario, Number(campo(dados, 'id', 12)));
    return removido ? voltar(request, volta, { ok: 'Laço removido.' }) : falhar('Laço não encontrado.');
  }

  if (acao === 'filiacao-salvar' || acao === 'filiacao-remover') {
    const filho = achar(campo(dados, 'filho', 80));
    const responsavel = achar(campo(dados, 'responsavel', 80));
    if (!filho || !responsavel) return falhar('Escolha a pessoa.');
    const decisao = podeMexerEmLaco(usuario, [filho, responsavel]);
    if (!decisao.ok) return falhar(decisao.motivo);

    if (acao === 'filiacao-remover') {
      await removerFiliacao(filho.id, responsavel.id, usuario);
      return voltar(request, volta, { ok: 'Laço removido.' });
    }

    const qualidade = campo(dados, 'qualidade', 20) as Qualidade;
    if (!(qualidade in QUALIDADES)) return falhar('Escolha o tipo de filiação.');
    if (filho.id === responsavel.id) return falhar('Uma pessoa não pode ser filha dela mesma.');
    const filiacoes = await listarFiliacoes();
    const familia = new Familia(filiacoes, []);
    if (familia.ehAntepassado(filho.id, responsavel.id)) {
      return falhar(`${nome(filho.id)} já está acima de ${nome(responsavel.id)} na árvore, então não pode ser filho ou filha.`);
    }
    const outrosBiologicos = filiacoes.filter((f) => f.filho === filho.id && f.qualidade === 'biologica' && f.responsavel !== responsavel.id);
    if (qualidade === 'biologica' && outrosBiologicos.length >= 2) {
      return falhar(`${nome(filho.id)} já tem dois pais biológicos cadastrados. Para outros laços, use adotiva ou de consideração.`);
    }
    await salvarFiliacao(filho.id, responsavel.id, qualidade, usuario);
    return voltar(request, volta, { ok: 'Laço salvo.' });
  }

  if (acao === 'casal-salvar') {
    const a = achar(campo(dados, 'a', 80));
    const b = achar(campo(dados, 'b', 80));
    if (!a || !b) return falhar('Escolha a pessoa.');
    if (a.id === b.id) return falhar('Um casal precisa de duas pessoas diferentes.');
    const decisao = podeMexerEmLaco(usuario, [a, b]);
    if (!decisao.ok) return falhar(decisao.motivo);

    // Um casal privado só aparece para as duas pessoas e para quem cadastrou
    const existente = await obterCasalDoPar(a.id, b.id);
    const podeVer = !existente || existente.visibilidade === 'todos' || [existente.a, existente.b, existente.criadoPor].includes(usuario.pessoa);
    if (!podeVer) return falhar('Não foi possível salvar esse casal.');

    // As fases chegam em linhas paralelas; linhas sem tipo são ignoradas
    const tipos = dados.getAll('faseTipo').map(String);
    const inicios = dados.getAll('faseInicio').map(String);
    const fins = dados.getAll('faseFim').map(String);
    const anoAtual = new Date().getUTCFullYear();
    const fases: Fase[] = [];
    for (let i = 0; i < tipos.length; i++) {
      if (!tipos[i]) continue;
      if (!(tipos[i] in FASES)) return falhar('Fase desconhecida.');
      const ler = (texto: string | undefined) => (texto?.trim() ? Number(texto) : null);
      const inicioAno = ler(inicios[i]);
      const fimAno = ler(fins[i]);
      for (const ano of [inicioAno, fimAno]) {
        if (ano !== null && (!Number.isInteger(ano) || ano < 1800 || ano > anoAtual)) return falhar(`Os anos das fases precisam estar entre 1800 e ${anoAtual}.`);
      }
      if (inicioAno && fimAno && fimAno < inicioAno) return falhar('Uma fase não pode terminar antes de começar.');
      fases.push({ tipo: tipos[i] as TipoDeFase, inicioAno, fimAno });
    }
    if (fases.length === 0) return falhar('Informe pelo menos uma fase, como namoro ou casamento.');
    if (fases.length > 12) return falhar('São fases demais para um casal só.');
    const visibilidade = campo(dados, 'visibilidade', 10) === 'privado' ? 'privado' : 'todos';
    await salvarCasal(a.id, b.id, fases, visibilidade, usuario);
    return voltar(request, volta, { ok: 'Casal salvo.' });
  }

  if (acao === 'casal-remover') {
    const casal = await obterCasal(Number(campo(dados, 'id', 12)));
    const visivel = casal && (casal.visibilidade === 'todos' || [casal.a, casal.b, casal.criadoPor].includes(usuario.pessoa));
    if (!casal || !visivel) return falhar('Casal não encontrado.');
    const envolvidos = [achar(casal.a), achar(casal.b)].filter((i) => i !== undefined);
    const decisao = podeMexerEmLaco(usuario, envolvidos);
    if (!decisao.ok) return falhar(decisao.motivo);
    await removerCasal(casal, usuario);
    return voltar(request, volta, { ok: 'Casal removido. Para registrar uma separação, prefira acrescentar a fase em vez de remover.' });
  }

  return falhar('Ação desconhecida.');
};
