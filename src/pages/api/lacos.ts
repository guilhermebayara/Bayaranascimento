// Laços de árvore: filiação (de quem alguém é filho) e casal, com suas fases.
import type { APIRoute } from 'astro';
import { FASES, FASES_JUNTOS, Familia, PAPEIS, nomeDoPapel, PROXIMIDADES, QUALIDADES, type Fase, type Papel, type Qualidade, type TipoDeFase } from '../../lib/parentesco';
import { criarSlug, slugUnico, validarData } from '../../lib/servidor/conteudo';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { podeMexerEmLaco, podeMudarLacoDoCoracao } from '../../lib/servidor/permissoes';
import { sugerirFamilias, type LacoNovo } from '../../lib/familias';
import {
  criarIntegrante,
  definirParentes,
  familiasDe,
  listarCasais,
  listarFiliacoes,
  listarLacosResumidos,
  removerLacoResumido,
  salvarLacoResumido,
  listarIntegrantes,
  listarIntegrantesQueVe,
  removerLacoDoCoracao,
  listarLacosDoCoracao,
  mudarLacoDoCoracaoDeOutro,
  salvarLacoDoCoracao,
  obterCasal,
  removerCasal,
  removerFiliacao,
  salvarCasal,
  salvarFiliacao,
  listarNucleos,
} from '../../lib/servidor/repositorio';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario } = locals;
  const dados = await request.formData();
  let acao = campo(dados, 'acao', 30);
  const volta = campo(dados, 'volta', 200) || '/pessoas';
  const falhar = (erro: string) => voltar(request, volta, { erro });

  // Quem só existe num laço privado de outra pessoa não pode ser escolhido nem achado pelo nome (C1, 17/11/2026).
  // O dono do laço continua vendo a pessoa. Os ids de todos só servem para o endereço novo não repetir.
  let integrantes = await listarIntegrantesQueVe(usuario);
  const todosOsIds = new Set([...(await listarIntegrantes()).map((i) => i.id), 'nova']);
  let pendente: { id: string; nome: string; tratamento: 'ela' | 'ele' | null } | undefined;
  const cadastrarPendente = async () => {
    if (pendente) await criarIntegrante(pendente.id, pendente.nome, usuario.pessoa, pendente.tratamento);
    pendente = undefined;
  };
  const achar = (id: string) => integrantes.find((i) => i.id === id);
  const nome = (id: string) => achar(id)?.apelido ?? achar(id)?.nome ?? id;

  /** Depois de um laço de árvore novo: algum laço resumido ficou com o caminho completo? Então avisa onde trocar. */
  const atalhosQueSobraram = async (): Promise<string> => {
    const familia = new Familia(await listarFiliacoes(), await listarCasais(usuario));
    const sobra = (await listarLacosResumidos()).find((l) => {
      const r = familia.relacao(l.a, l.b);
      return r && !r.consideracao;
    });
    return sobra ? ` Agora ${nome(sobra.b)} se liga a ${nome(sobra.a)} pelo caminho completo: na página de ${nome(sobra.a)}, dá para trocar o laço resumido por ele.` : '';
  };

  /**
   * Quem entrou por um laço de árvore e ainda não tem família sai marcado como parente da família de quem
   * está do outro lado (ver lib/familias.ts). Devolve a frase que conta isso, para quem cadastrou conferir.
   */
  const sugerirFamilia = async (novo: string, laco: LacoNovo): Promise<string> => {
    const pessoa = achar(novo);
    if (!pessoa || familiasDe(pessoa).length) return '';
    const [filiacoes, casais] = [await listarFiliacoes(), await listarCasais(usuario)];
    const familias = new Map(integrantes.map((i) => [i.id, familiasDe(i)]));
    const sugeridas = sugerirFamilias({ familias, casais, filiacoes }, novo, laco);
    if (!sugeridas.length) return '';
    await definirParentes(novo, sugeridas);
    const nomes = (await listarNucleos()).filter((n) => sugeridas.includes(n.id)).map((n) => n.nome);
    const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0];
    return ` ${nome(novo)} entrou na família ${lista}. Para trocar, edite a página ${pessoa.tratamento === 'ela' ? 'dela' : pessoa.tratamento === 'ele' ? 'dele' : 'da pessoa'}.`;
  };

  // Formulário "Adicionar laço": um seletor escolhe o tipo, e a outra pessoa pode
  // ser alguém da lista ou um nome novo, cadastrado na hora.
  if (acao === 'adicionar') {
    const tipoDeLaco = campo(dados, 'laco', 20);
    const sujeito = campo(dados, 'sujeito', 80);
    // Na página de outra pessoa, o laço do coração é com ela: não há "com quem" a escolher
    // "A família toda reconhece" é um laço da família, entre a pessoa da página e outra
    const daFamilia = tipoDeLaco === 'coracao' && campo(dados, 'reconhece', 10) === 'familia';
    const comASujeita = tipoDeLaco === 'coracao' && !daFamilia && sujeito !== usuario.pessoa;
    let outra = comASujeita ? sujeito : campo(dados, 'pessoa', 80);
    const nomeNovo = campo(dados, 'nomeNovo', 80);
    if (!outra && nomeNovo) {
      const base = criarSlug(nomeNovo);
      const existente = integrantes.find((i) => criarSlug(i.nome) === base || (i.apelido && criarSlug(i.apelido) === base));
      if (existente) return falhar(`Já existe ${existente.nome} no acervo. Escolha na lista em vez de escrever o nome.`);
      outra = slugUnico(base, todosOsIds);
      // A pessoa nova só é gravada quando o laço passa nas validações e na permissão (ver cadastrarPendente).
      // Antes, um laço recusado deixava a pessoa cadastrada, e a nova tentativa dizia que ela já existia.
      // "Como se referir" de quem entra pelo nome novo: Ela, Ele ou Não informar (pedido do Gui, 16/11/2026)
      const tratamentoNovo = campo(dados, 'tratamentoNovo', 3);
      const tratamento = tratamentoNovo === 'ela' || tratamentoNovo === 'ele' ? tratamentoNovo : null;
      pendente = { id: outra, nome: nomeNovo, tratamento };
      integrantes = [
        ...integrantes,
        { id: outra, nome: nomeNovo, apelido: null, tipo: 'pessoa', especie: null, tratamento, nascimentoAno: null, nascimentoMes: null, nascimentoDia: null, falecimentoAno: null, falecimentoMes: null, falecimentoDia: null, falecido: false, sobre: null, retrato: null, admin: false, criadoPor: usuario.pessoa, nucleos: [], parenteDe: [] },
      ];
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
    } else if (tipoDeLaco === 'coracao' && daFamilia) {
      dados.set('acao', 'coracao-familia');
      dados.set('pessoa', outra);
    } else if (tipoDeLaco === 'resumido') {
      dados.set('acao', 'resumido-salvar');
      dados.set('pessoa', outra);
    } else if (tipoDeLaco === 'coracao') {
      dados.set('acao', 'coracao-salvar');
      // O laço do coração é sempre de quem está logado
      dados.set('pessoa', outra);
    } else {
      return falhar('Escolha o tipo de laço.');
    }
    acao = campo(dados, 'acao', 30);
  }

  // Um administrador muda o laço do coração de outra pessoa, se o vê ("Administradores podem mais",
  // 16/11/2026): o nome do laço e o lugar na árvore. O laço "só eu vejo" de outra pessoa nem chega aqui.
  const dono = campo(dados, 'dono', 80);
  if (acao === 'coracao-salvar' && dono && dono !== usuario.pessoa) {
    const laco = (await listarLacosDoCoracao(usuario)).find((l) => l.dono === dono && l.pessoa === campo(dados, 'pessoa', 80));
    if (!laco || !achar(laco.dono) || !achar(laco.pessoa)) return falhar('Laço não encontrado.');
    const decisao = podeMudarLacoDoCoracao(usuario, laco);
    if (!decisao.ok) return falhar(decisao.motivo);
    const nomeDoLaco = campo(dados, 'nomeDoLaco', 40);
    if (!nomeDoLaco) return falhar('Dê um nome ao laço, como "amigo-irmão" ou "afilhada".');
    const papelBruto = campo(dados, 'papel', 12);
    if (papelBruto && !(papelBruto in PAPEIS)) return falhar('Papel desconhecido.');
    await mudarLacoDoCoracaoDeOutro(laco, { nome: nomeDoLaco, papel: (papelBruto as Papel) || null }, usuario);
    return voltar(request, volta, { ok: `Laço de ${nome(laco.dono)} com ${nome(laco.pessoa)} salvo.` });
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
    await cadastrarPendente();
    await salvarLacoDoCoracao(usuario, pessoa.id, {
      nome: nomeDoLaco,
      papel: (papelBruto as Papel) || null,
      proximidade,
      privado: dados.get('privado') === 'on',
    });
    return voltar(request, volta, { ok: `Laço com ${nome(pessoa.id)} salvo.` });
  }

  // Laço do coração que a família toda reconhece: vira filiação de consideração e vale para os parentes também.
  // Filho e pai são uma filiação só; irmão é filho de consideração dos pais de quem escolheu. Tio, avô, primo
  // e sobrinho passam pela pessoa do meio, então são cadastrados na página dela (a escadinha).
  if (acao === 'coracao-familia') {
    const sujeito = achar(campo(dados, 'sujeito', 80));
    const outra = achar(campo(dados, 'pessoa', 80));
    if (!sujeito || !outra) return falhar('Escolha a pessoa.');
    if (sujeito.id === outra.id) return falhar('O laço é entre duas pessoas diferentes.');
    const papel = campo(dados, 'papel', 12);
    const filiacoes = await listarFiliacoes();
    let pares: [string, string][];
    if (papel === 'filho') pares = [[outra.id, sujeito.id]];
    else if (papel === 'pai') pares = [[sujeito.id, outra.id]];
    else if (papel === 'irmao') {
      const pais = filiacoes.filter((f) => f.filho === sujeito.id && f.qualidade !== 'consideracao').map((f) => f.responsavel);
      if (!pais.length) return falhar(`Para ${nome(outra.id)} ser irmão de consideração de ${nome(sujeito.id)}, cadastre antes o pai ou a mãe de ${nome(sujeito.id)}. Ou escolha "Só eu".`);
      pares = pais.map((p) => [outra.id, p]);
    } else if (papel) {
      return falhar('Para a família toda reconhecer um tio, avô, primo ou sobrinho, cadastre o laço pela pessoa do meio. Um tio de consideração é irmão de consideração do seu pai ou da sua mãe: abra a página dele ou dela e adicione o laço lá.');
    } else {
      return falhar('Escolha o lugar na árvore: filho, pai ou mãe, ou irmão.');
    }
    const envolvidos = [...new Set(pares.flat())].map(achar).filter((i) => i !== undefined);
    const decisao = podeMexerEmLaco(usuario, envolvidos);
    if (!decisao.ok) return falhar(decisao.motivo);
    const familia = new Familia(filiacoes, []);
    for (const [filho, responsavel] of pares) {
      if (familia.ehAntepassado(filho, responsavel)) return falhar(`${nome(filho)} já está acima de ${nome(responsavel)} na árvore.`);
    }
    await cadastrarPendente();
    for (const [filho, responsavel] of pares) await salvarFiliacao(filho, responsavel, 'consideracao', usuario);
    const [filho, responsavel] = pares[0];
    const aviso = filho === outra.id ? await sugerirFamilia(filho, { tipo: 'filho-de', com: responsavel }) : await sugerirFamilia(responsavel, { tipo: 'pai-de', com: filho });
    return voltar(request, volta, { ok: `Laço salvo. A família toda vê ${nome(outra.id)} como ${nomeDoPapel(papel as Papel, outra.tratamento)} de consideração de ${nome(sujeito.id)}.${aviso}` });
  }

  // Laço resumido: o parente de alguém de fora das famílias, sem cadastrar quem fica no meio ("Caio é sobrinho
  // do Ed"). Dentro das famílias o caminho é obrigatório, para a árvore de sangue não ficar com buracos.
  if (acao === 'resumido-salvar') {
    const a = achar(campo(dados, 'sujeito', 80));
    const b = achar(campo(dados, 'pessoa', 80));
    if (!a || !b) return falhar('Escolha a pessoa.');
    if (a.id === b.id) return falhar('O laço é entre duas pessoas diferentes.');
    const papel = campo(dados, 'papelResumido', 12);
    if (!(papel in PAPEIS)) return falhar('Escolha o parentesco.');
    const naFamilia = [a, b].find((i) => familiasDe(i).length);
    if (naFamilia) {
      return falhar(`${nome(naFamilia.id)} é da família, e dentro das famílias o caminho é cadastrado inteiro: o pai ou a mãe, e depois o filho. Este atalho é só para parentes de quem é de fora.`);
    }
    await cadastrarPendente();
    await salvarLacoResumido(a.id, b.id, papel as Papel, usuario);
    return voltar(request, volta, { ok: `Laço salvo: ${nome(b.id)} é ${nomeDoPapel(papel as Papel, b.tratamento)} de ${nome(a.id)}.` });
  }

  if (acao === 'resumido-remover') {
    const laco = (await listarLacosResumidos()).find((l) => l.id === Number(campo(dados, 'id', 12)));
    if (!laco) return falhar('Laço não encontrado.');
    // Com o caminho completo cadastrado, o atalho sobra: quem mexe nos laços de árvore dos dois pode trocá-lo
    const familia = new Familia(await listarFiliacoes(), await listarCasais(usuario));
    const relacao = familia.relacao(laco.a, laco.b);
    const completo = Boolean(relacao && !relacao.consideracao);
    const envolvidos = [achar(laco.a), achar(laco.b)].filter((i) => i !== undefined);
    const pode = usuario.admin || laco.criadoPor === usuario.pessoa || (completo && podeMexerEmLaco(usuario, envolvidos).ok);
    if (!pode) return falhar('Só quem cadastrou este laço ou os administradores podem removê-lo.');
    await removerLacoResumido(laco.id, usuario);
    return voltar(request, volta, { ok: completo ? `Pronto: ${nome(laco.b)} e ${nome(laco.a)} agora se ligam pelo caminho completo.` : 'Laço removido.' });
  }

  if (acao === 'coracao-remover') {
    // O dono remove o próprio laço; um administrador, o de outra pessoa que ele vê
    const laco = (await listarLacosDoCoracao(usuario)).find((l) => l.id === Number(campo(dados, 'id', 12)));
    if (!laco) return falhar('Laço não encontrado.');
    const decisao = podeMudarLacoDoCoracao(usuario, laco);
    if (!decisao.ok) return falhar(decisao.motivo);
    const removido = await removerLacoDoCoracao(laco, usuario);
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
    // Data da adoção: opcional, só no laço adotivo, flexível como as outras (só o ano já basta)
    let adocao: { ano: number; mes: number | null; dia: number | null } | null = null;
    if (qualidade === 'adotiva') {
      const numero = (nome: string) => (campo(dados, nome, 4) ? Number(campo(dados, nome, 4)) : null);
      const [ano, mes, dia] = [numero('adocaoAno'), numero('adocaoMes'), numero('adocaoDia')];
      if (ano !== null) {
        const problema = validarData(ano, mes ?? undefined, dia ?? undefined);
        if (problema) return falhar(`Data da adoção: ${problema.charAt(0).toLowerCase()}${problema.slice(1)}`);
        adocao = { ano, mes, dia: mes ? dia : null };
      } else if (mes || dia) {
        return falhar('Data da adoção: informe pelo menos o ano.');
      }
    }
    await cadastrarPendente();
    await salvarFiliacao(filho.id, responsavel.id, qualidade, usuario, adocao);
    const aviso = (await sugerirFamilia(filho.id, { tipo: 'filho-de', com: responsavel.id })) || (await sugerirFamilia(responsavel.id, { tipo: 'pai-de', com: filho.id }));
    return voltar(request, volta, { ok: `Laço salvo.${aviso}${await atalhosQueSobraram()}` });
  }

  if (acao === 'casal-salvar') {
    const a = achar(campo(dados, 'a', 80));
    const b = achar(campo(dados, 'b', 80));
    if (!a || !b) return falhar('Escolha a pessoa.');
    if (a.id === b.id) return falhar('Um casal precisa de duas pessoas diferentes.');
    const decisao = podeMexerEmLaco(usuario, [a, b]);
    if (!decisao.ok) return falhar(decisao.motivo);

    // Um casal privado de outras pessoas não conta: quem não o vê cadastra o par como um registro à parte,
    // e nada na resposta denuncia o privado (ver salvarCasal)
    // As fases chegam numeradas (fase-0-tipo, fase-0-inicio, fase-0-fim, fase-0-remover), da edição do casal,
    // ou em linhas paralelas (faseTipo, faseInicio, faseFim), do cadastro. Linhas sem tipo são ignoradas.
    const numeradas = [...new Set([...dados.keys()].map((k) => /^fase-(\d+)-tipo$/.exec(k)?.[1]).filter((n) => n !== undefined))].map(Number).sort((x, y) => x - y);
    const tipos = numeradas.length ? numeradas.map((n) => (dados.get(`fase-${n}-remover`) === 'on' ? '' : String(dados.get(`fase-${n}-tipo`) ?? ''))) : dados.getAll('faseTipo').map(String);
    const inicios = numeradas.length ? numeradas.map((n) => String(dados.get(`fase-${n}-inicio`) ?? '')) : dados.getAll('faseInicio').map(String);
    const fins = numeradas.length ? numeradas.map((n) => String(dados.get(`fase-${n}-fim`) ?? '')) : dados.getAll('faseFim').map(String);
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
    // "Já terminou", no cadastro do casal: a relação acabou, então entra a separação depois da fase de hoje
    if (dados.get('terminou') === 'on') {
      const ultima = fases[fases.length - 1];
      if (FASES_JUNTOS.includes(ultima.tipo)) fases.push({ tipo: 'separacao', inicioAno: ultima.fimAno, fimAno: null });
    }
    if (fases.length > 12) return falhar('São fases demais para um casal só.');
    const visibilidade = campo(dados, 'visibilidade', 10) === 'privado' ? 'privado' : 'todos';
    await cadastrarPendente();
    try {
      await salvarCasal(a.id, b.id, fases, visibilidade, usuario);
    } catch {
      // Só acontece se uma terceira pessoa marcar como privado um par que já tem um casal privado de outros
      return falhar('Não foi possível salvar esse casal.');
    }
    const aviso = (await sugerirFamilia(b.id, { tipo: 'casal', com: a.id })) || (await sugerirFamilia(a.id, { tipo: 'casal', com: b.id }));
    return voltar(request, volta, { ok: `Casal salvo.${aviso}` });
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
