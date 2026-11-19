// O que a página da pessoa mostra (proposta A do conceito da sessão L, "o verbete", escolha do Gui de
// 18/11/2026; docs/visual/conceito-pessoa-do-zero/leia-me.md): quem vê o quê, o parentesco de quem
// olha, a família de perto, os laços, os relatos e os áudios que a pessoa contou, o lugar dela no
// círculo de quem olha (só ele vê) e as memórias com ela. As regras sem banco estão em
// src/lib/pagina-da-pessoa.ts.
import { duracaoEmTexto } from '../audios';
import { nomeDaProximidade } from '../circulo';
import { formatarData, jaFaleceu, vidaSemRotulo } from '../datas';
import { apareceComoCasal, apareceComoCoracao, exDoAmigo, viraramAmigos } from '../ex-casal';
import { enderecoDoLaco } from '../pagina-do-laco';
import { FASES, Familia, estaoJuntos, lacoParaODono, nomeDoPapel, periodosDasFases, possessivo, type Tratamento } from '../parentesco';
import { enderecoDoRetrato } from '../retratos';
import { apelidoAoLado } from '../ordem-das-pessoas';
import { idadeNoAno, partesDaData } from '../pagina-da-pessoa';
import { corDoNucleo, trechoDoRelato } from '../visual';
import { coresDasPessoas } from '../familias';
import { pessoasComAcesso } from './acesso';
import { conversaDosRelatos } from './conversa';
import { proximidadesDoCirculo } from './circulo';
import { podeEditarIntegrante, podeMexerEmLaco, type Usuario } from './permissoes';
import {
  comoOsExesAparecem,
  familiasDe,
  listarAudiosDe,
  listarCasais,
  listarFiliacoes,
  listarIntegrantesQueVe,
  listarLacosDoCoracao,
  listarLacosResumidos,
  listarMemorias,
  listarNucleos,
  listarRelatosDe,
  listarMeusApelidos,
  pessoasQueONaoVe,
  type Memoria,
} from './repositorio';

const minuscula = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);

/** Uma pessoa ligada a esta, pronta para a tela. */
export interface Ligada {
  id: string;
  nome: string;
  foto: string | null;
  familia: string;
  laco?: string | null;
  detalhe?: string | null;
  falecido: boolean;
  /** "como se referir", para o nome do grupo ("Mãe", "Irmã") */
  tratamento: 'ela' | 'ele' | null;
  /** a página do laço entre esta pessoa e a ligada */
  enderecoDoLaco: string;
}

export async function montarPaginaDaPessoa(usuario: Usuario, pessoaId: string, mostrarDatas: boolean) {
  const integrantes = await listarIntegrantesQueVe(usuario);
  const pessoa = integrantes.find((i) => i.id === pessoaId);
  if (!pessoa) return null;

  const nucleos = await listarNucleos();
  const ordemDosNucleos = nucleos.map((n) => n.id);
  const todasComEla: Memoria[] = (await listarMemorias(usuario, { integrante: pessoa.id, comRascunhos: true })).reverse();
  const publicadas = todasComEla.filter((m) => m.situacao !== 'rascunho');
  const familiasDaPessoa = familiasDe(pessoa)
    .map((nid) => nucleos.find((n) => n.id === nid))
    .filter((n): n is NonNullable<typeof n> => Boolean(n))
    .map((n) => ({ id: n.id, nome: n.nome, cor: corDoNucleo(n.id, ordemDosNucleos) }));
  const especie = pessoa.tipo === 'bicho' ? (pessoa.especie ?? 'bichinho') : null;

  const tratamentos = new Map<string, Tratamento>(integrantes.map((i) => [i.id, i.tratamento]));
  const filiacoes = await listarFiliacoes();
  const casaisQueVe = await listarCasais(usuario);
  const familia = new Familia(filiacoes, casaisQueVe, tratamentos);
  const adocaoCom = (id: string) => {
    const f = filiacoes.find((x) => x.qualidade === 'adotiva' && ((x.filho === pessoa.id && x.responsavel === id) || (x.responsavel === pessoa.id && x.filho === id)));
    return f?.adocao ? `adoção em ${formatarData({ ano: f.adocao.ano, mes: f.adocao.mes, dia: f.adocao.dia, aproximada: false })}` : undefined;
  };
  const achar = (id: string) => integrantes.find((i) => i.id === id);
  const nome = (id: string) => achar(id)?.apelido ?? achar(id)?.nome ?? id;
  const chamar = pessoa.apelido ?? pessoa.nome;
  const naoVe = await pessoasQueONaoVe(usuario);
  const retratoDe = (id: string) => (achar(id)?.retrato && !naoVe.has(id) ? enderecoDoRetrato(achar(id)!.retrato!) : null);
  // A cor de quem é de duas famílias é a do núcleo que formou (coresDasPessoas, pedido do Gui, 18/11/2026)
  const familiaDe = coresDasPessoas(integrantes, casaisQueVe, ordemDosNucleos);
  const faleceu = (id: string) => Boolean(achar(id) && jaFaleceu(achar(id)!));
  const ehMinha = pessoa.id === usuario.pessoa;
  const papel = (id: string) => {
    const relacao = familia.relacao(pessoa.id, id);
    if (!relacao) return undefined;
    return ehMinha ? possessivo(relacao, achar(id)?.tratamento ?? null) : relacao.texto;
  };
  const paraVoce = ehMinha ? undefined : familia.relacao(usuario.pessoa, pessoa.id);

  const pais = familia.pais(pessoa.id).map((p) => p.responsavel);
  const irmaos = familia.irmaos(pessoa.id).map((i) => i.id);
  const filhos = familia.filhos(pessoa.id).map((f) => f.filho);
  const avos = [...new Set(pais.flatMap((p) => familia.pais(p).map((a) => a.responsavel)))];
  const casais = familia.casais(pessoa.id);
  const lacos = await listarLacosDoCoracao(usuario);
  const escolhidos = lacos.filter((l) => l.dono === pessoa.id);
  const escolhidaPor = lacos.filter((l) => l.pessoa === pessoa.id);
  const meuLaco = paraVoce || ehMinha ? undefined : escolhidaPor.find((l) => l.dono === usuario.pessoa);
  const temLacoDeArvore = pais.length > 0 || filhos.length > 0 || casais.some((c) => apareceComoCasal(c.casal));
  const resumidos = (await listarLacosResumidos()).filter((l) => l.a === pessoa.id || l.b === pessoa.id);
  const audios = (await listarAudiosDe(usuario, pessoa.id)).map((a) => ({ ...a, duracaoEmTexto: duracaoEmTexto(a.duracao) }));
  // Os relatos que a pessoa contou, como mensagens (o modelo da conversa da página da memória; pedido do
  // Gui, 18/11/2026). Os que têm áudio vêm primeiro, para a voz dela aparecer logo; depois, do mais
  // recente ao mais antigo. As fotos das mensagens são as das memórias que quem olha vê
  const relatosDela = await listarRelatosDe(usuario, pessoa.id);
  const fotosDasMemorias = publicadas.flatMap((m) => m.fotos);
  const conversa = await conversaDosRelatos(relatosDela, fotosDasMemorias, (id) => integrantes.find((i) => i.id === id)?.apelido ?? integrantes.find((i) => i.id === id)?.nome ?? id);
  const comAudio = (id: number) => (conversa.get(id) ?? []).some((m) => m.tipo === 'audio');
  const relatos = relatosDela
    .map((r) => ({ ...r, trecho: trechoDoRelato(r.texto, 180), mensagens: conversa.get(r.id) ?? [] }))
    .filter((r) => r.mensagens.length > 0)
    .sort((a, b) => Number(comAudio(b.id)) - Number(comAudio(a.id)));
  const podeEditar = podeEditarIntegrante(usuario, pessoa, await pessoasComAcesso()).ok || podeMexerEmLaco(usuario, [pessoa]).ok;
  const parentesco = paraVoce ? possessivo(paraVoce, pessoa.tratamento) : meuLaco ? lacoParaODono(meuLaco.nome, pessoa.tratamento) : null;
  const temDataOculta = Boolean(pessoa.falecimentoAno);
  const vida = vidaSemRotulo(pessoa, mostrarDatas);
  // As datas em partes, para o quadro: o aniversário grande e o ano pequeno (partesDaData). O falecimento vai na página
  // sempre, escondido, e "Mostrar datas" o mostra no lugar, sem recarregar (pedido do Gui, 18/11/2026)
  const nascimento = pessoa.nascimentoAno
    ? partesDaData({ ano: pessoa.nascimentoAno, mes: pessoa.nascimentoMes, dia: pessoa.nascimentoDia })
    : null;
  const falecimento = pessoa.falecimentoAno
    ? partesDaData({ ano: pessoa.falecimentoAno, mes: pessoa.falecimentoMes, dia: pessoa.falecimentoDia })
    : null;
  const historiaDoCasal = (casal: (typeof casais)[number]['casal']) =>
    casal.fases.map((fase, n) => [FASES[fase.tipo].toLowerCase(), periodosDasFases(casal.fases)[n]].filter(Boolean).join(' ')).join(', depois ') +
    (casal.visibilidade === 'privado' ? ' (só os dois veem)' : casal.visibilidade === 'nucleos' ? ' (só as famílias escolhidas veem)' : '');
  const modosDosExes = ehMinha ? await comoOsExesAparecem(usuario) : new Map<string, 'discreto' | 'fora'>();

  const ligada = (id: string, laco?: string | null, detalhe?: string | null): Ligada => ({
    id,
    nome: nome(id),
    foto: retratoDe(id),
    familia: familiaDe(id),
    laco,
    detalhe,
    falecido: faleceu(id),
    tratamento: achar(id)?.tratamento ?? null,
    enderecoDoLaco: enderecoDoLaco(pessoa.id, id),
  });

  const grupos: { chave: string; titulo: string; linhas: Ligada[] }[] = [
    { chave: 'pais', titulo: 'Pais', linhas: pais.map((x) => ligada(x, papel(x), adocaoCom(x))) },
    {
      chave: 'casal',
      titulo: 'Casal',
      linhas: casais.filter((c) => apareceComoCasal(c.casal)).map((c) => ligada(c.outro, papel(c.outro) ?? (estaoJuntos(c.casal) ? null : 'ex'), historiaDoCasal(c.casal))),
    },
    { chave: 'filhos', titulo: 'Filhos', linhas: filhos.map((x) => ligada(x, papel(x), adocaoCom(x))) },
    { chave: 'irmaos', titulo: 'Irmãos', linhas: irmaos.map((x) => ligada(x, papel(x))) },
    { chave: 'avos', titulo: 'Avós', linhas: avos.map((x) => ligada(x, papel(x))) },
    {
      chave: 'parentes',
      titulo: 'Parentes',
      linhas: resumidos.map((l) => {
        const outro = l.a === pessoa.id ? l.b : l.a;
        return ligada(outro, l.a === pessoa.id ? nomeDoPapel(l.papel, achar(outro)?.tratamento ?? null) : `${chamar} é ${nomeDoPapel(l.papel, pessoa.tratamento)}`);
      }),
    },
    {
      chave: 'coracao',
      titulo: 'Laços do coração',
      linhas: [
        ...escolhidos.map((l) => ligada(l.pessoa, l.dono === usuario.pessoa ? lacoParaODono(l.nome, achar(l.pessoa)?.tratamento ?? null) : minuscula(l.nome), l.privado ? 'só você vê' : null)),
        ...casais
          .filter((c) => apareceComoCoracao(c.casal) && !escolhidos.some((l) => l.pessoa === c.outro))
          .map((c) =>
            ligada(
              c.outro,
              papel(c.outro) ?? (viraramAmigos(c.casal) ? (achar(c.outro)?.tratamento === 'ela' ? 'amiga' : 'amigo') : achar(c.outro)?.tratamento === 'ela' ? 'namorada' : 'namorado'),
              viraramAmigos(c.casal) ? exDoAmigo(c.casal, achar(c.outro)?.tratamento ?? null) : historiaDoCasal(c.casal),
            ),
          ),
      ],
    },
    {
      chave: 'no-coracao',
      titulo: 'No coração de',
      linhas: escolhidaPor.map((l) =>
        ligada(l.dono, l.dono === usuario.pessoa ? `${lacoParaODono(l.nome, pessoa.tratamento)} (você)` : `chama de ${minuscula(l.nome)}`, l.privado ? 'só você vê' : null),
      ),
    },
  ]
    .map((g) => (ehMinha && modosDosExes.size > 0 ? { ...g, linhas: g.linhas.filter((l) => !modosDosExes.has(l.id)) } : g))
    .filter((g) => g.linhas.length > 0);
  const genteNosLacos = new Set(grupos.flatMap((g) => g.linhas.map((l) => l.id))).size;

  // O lugar da pessoa no círculo de quem olha: só ele vê, como o círculo inteiro
  const noCirculo = ehMinha ? null : ((await proximidadesDoCirculo(usuario)).get(pessoa.id) ?? null);
  const circulo = noCirculo ? { faixa: nomeDaProximidade(noCirculo.valor), valor: noCirculo.valor } : null;

  // A idade da pessoa em cada memória, quando o ano de nascimento é conhecido
  const idadeEm = (ano: number) => idadeNoAno(pessoa.nascimentoAno, ano);
  const anos = publicadas.map((m) => m.ano);
  const periodo = anos.length ? { de: Math.min(...anos), ate: Math.max(...anos) } : null;

  return {
    pessoa,
    integrantes,
    nucleos,
    chamar,
    apelidoNoTitulo: apelidoAoLado(pessoa.nome, pessoa.apelido),
    // "Como você chama" (src/lib/apelidos.ts): o apelido que quem olha deu, que só ele vê. "Voltar a"
    // usa o nome de sempre da família
    meuApelido: (await listarMeusApelidos(usuario.pessoa)).get(pessoa.id),
    nomeDaFamilia: (pessoa.apelidoDaFamilia !== undefined ? pessoa.apelidoDaFamilia : null) ?? pessoa.nome,
    ehMinha,
    comQuem: ehMinha ? 'você' : chamar,
    especie,
    familiasDaPessoa,
    familiaDaPessoa: familiaDe(pessoa.id),
    retrato: retratoDe(pessoa.id),
    falecida: jaFaleceu(pessoa),
    parentesco,
    vida,
    nascimento,
    falecimento,
    temDataOculta,
    mostrarDatas,
    podeEditar,
    temLacoDeArvore,
    grupos,
    genteNosLacos,
    audios,
    relatos,
    todasComEla,
    publicadas,
    periodo,
    idadeEm,
    circulo,
    /** a página do laço entre quem olha e esta pessoa */
    lacoComVoce: ehMinha || !(paraVoce || meuLaco) ? null : enderecoDoLaco(usuario.pessoa, pessoa.id),
    nomeDeQuemOlha: nome(usuario.pessoa),
  };
}

export type PaginaDaPessoa = NonNullable<Awaited<ReturnType<typeof montarPaginaDaPessoa>>>;
