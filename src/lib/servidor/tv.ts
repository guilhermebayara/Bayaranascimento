// O modo TV no servidor (aplicação da E1 e causa 6 da medição M1). Um lugar só decide o que vai à TV:
// - a ordem das memórias (ordemDoModoTv), que a página do Explorar manda uma vez, só com os ids, já com os
//   filtros, quem vê o quê e a regra da sala;
// - o palco de uma memória (palcoDaTv), que a página e a rota de uma memória (src/pages/explorar/palco.astro)
//   montam igual, conferindo tudo de novo a cada pedido.
//
// A regra da sala (resposta do Gui, 22/11/2026, confirmada em 24/11/2026): na sala, só o que é aberto a toda
// a família, seja qual for o login. O servidor lê a sala como um visitante sem família nenhuma
// (VISITANTE_DA_SALA): as mesmas regras de quem vê o quê de todo o site, para alguém que não é membro de
// núcleo nenhum, não escreveu nada e não tem laço privado. O que ele vê é sempre parte do que quem está
// logado vê. E, por cima, cada memória da sala ainda passa por entraNaSala e cada relato por relatoNaTv.
import { ancoraDaMemoria, enderecoDoExplorar, explorar, lerFiltros, lerMovimento, lerPassar, MOVIMENTOS, movimentoNoEndereco, passarNoEndereco, SEM_FILTRO, soFiltrosConhecidos, temFiltro, TEMPOS_DE_PASSAR, type Filtros, type Passar } from '../explorar';
import { naListaDeQuemOlha } from '../ex-casal';
import { entraNaSala, ID_DO_VISITANTE_DA_SALA, idValido, parteDaLeitura, partesDaLeitura, type TrechoDaLeitura, linhaDoAlto, naSala, nomeDeNatal, ordemDaTv, SAUDACAO_DA_SALA, paragrafosDaCarta, passoDaCarta, quemAssina, relatoDaVez, relatoNaTv, segundosDoParagrafo } from '../sala';
import { carimboDaData, legendaLugarAno, trechoDoRelato } from '../visual';
import { contextoDoExplorar } from './explorar';
import type { Usuario } from './permissoes';
import { comoOsExesAparecem, memoriasComAudioNaTv, relatosQueVaoATv, listarAudiosDosRelatos, listarCapitulos, listarIntegrantesQueVe, listarMemorias, listarNucleos, listarRelatos, listarTemasVisiveis, obterCarta, obterMemoria, type Integrante, type Memoria } from './repositorio';
import type { Tipo } from '../tipos';

/**
 * Quem olha na sala: ninguém em particular. Não é membro de núcleo nenhum (só vê o que é aberto a todos),
 * não criou nada (nenhum rascunho), não registrou relato (nenhum relato que espera passa por ele) e não tem
 * laço privado (só vê as pessoas que todo mundo vê). O id não pode ser de ninguém: nenhum id de pessoa tem
 * dois-pontos (criarSlug, em src/lib/servidor/conteudo.ts).
 */
export const VISITANTE_DA_SALA: Readonly<Usuario> = Object.freeze({ pessoa: ID_DO_VISITANTE_DA_SALA, nome: '', admin: false, nucleos: [] as string[] });

/** Quem o servidor usa para ler o que vai à TV: o visitante, na sala; quem está logado, fora dela. */
export const quemOlhaNaTv = (usuario: Usuario, sala: boolean): Usuario => (sala ? (VISITANTE_DA_SALA as Usuario) : usuario);

/** O nome de cada pessoa na TV. Na sala, o apelido da família (a tela é de todos); fora, o de quem olha. */
const nomeNaTv = (integrantes: readonly Integrante[], sala: boolean) => (id: string) => {
  const i = integrantes.find((x) => x.id === id);
  return i ? ((sala ? i.apelidoDaFamilia : i.apelido) ?? i.nome) : undefined;
};

/**
 * "Com…" segue a regra de "Quem estava" na página da memória (correção 6 da revisão R-AB; docs/decisoes.md,
 * "Ex-casal"): quem quem olha deixou "Fora" sai. O "Discreto", que em "Quem estava" fica com o nome borrado,
 * também sai daqui: "Com…" é uma linha de nomes, sem lugar para a tarja. Na sala, o visitante não tem ex, e
 * a regra não tira ninguém.
 */
export const comNaTv = (integrantesDaMemoria: readonly string[], nome: (id: string) => string | undefined, modosDosExes: ReadonlyMap<string, string>): string[] =>
  integrantesDaMemoria
    .filter((id) => naListaDeQuemOlha(modosDosExes.get(id) as Parameters<typeof naListaDeQuemOlha>[0]) === 'normal')
    .map(nome)
    .filter((n): n is string => Boolean(n));

/**
 * As saídas do modo TV: "Sair do modo TV" e "Limpar filtros". Na sala, sair volta ao Início e limpar continua
 * na sala, com o marcador (correção 2 da revisão R-AB): todo link que o modo TV monta mantém o marcador, menos
 * o de sair. Fora da sala, sair volta ao Explorar com os filtros e limpar abre o modo TV sem eles.
 */
export function saidasDoModoTv(filtros: Filtros, sala: boolean): { sair: string; limpar: string } {
  if (sala) return { sair: '/', limpar: enderecoDoExplorar({ ...SEM_FILTRO, ordem: filtros.ordem }, 'tv', { sala: '1' }) };
  const sair = enderecoDoExplorar(filtros);
  return { sair, limpar: temFiltro(filtros) ? enderecoDoExplorar({ ...SEM_FILTRO, ordem: filtros.ordem }, 'tv') : sair };
}

// --- A ordem ------------------------------------------------------------------------------------

export interface OrdemDoModoTv {
  filtros: Filtros;
  /** as memórias que entram, na ordem dos filtros: as publicadas que quem olha vê e, na sala, as abertas a todos */
  memorias: Memoria[];
  /** os passos: a carta na frente (na porta "A carta e os Natais") e os ids das memórias */
  ordem: string[];
  /** os parágrafos da carta, quando ela vem na frente */
  paragrafos: string[];
}

/** O tema de Natal, pelo nome, entre os que todo mundo vê: o da porta "A carta e os Natais". */
export async function temaDeNatal(): Promise<string | undefined> {
  return (await listarTemasVisiveis(VISITANTE_DA_SALA as Usuario)).find((t) => nomeDeNatal(t.nome))?.id;
}

/**
 * A ordem do modo TV a partir do endereço: as memórias que quem olha vê (na sala, o visitante), com os
 * filtros conhecidos, sem rascunho, e só o que entra na sala quando o marcador está no endereço. Lê o
 * acervo uma vez, na primeira página do modo TV; as passagens seguintes não leem a lista de novo.
 */
export async function ordemDoModoTv(usuario: Usuario, parametros: URLSearchParams, tipos: readonly Tipo[]): Promise<OrdemDoModoTv> {
  const sala = naSala(parametros);
  const quem = quemOlhaNaTv(usuario, sala);
  const [nucleos, todas, integrantes, capitulos, temas, carta] = await Promise.all([
    listarNucleos(),
    listarMemorias(quem),
    listarIntegrantesQueVe(quem),
    listarCapitulos(quem),
    listarTemasVisiveis(quem),
    sala && parametros.get('carta') === '1' ? obterCarta() : Promise.resolve(undefined),
  ]);
  const filtros = soFiltrosConhecidos(lerFiltros(parametros), {
    tipos: new Set(tipos.map((t) => t.id)),
    pessoas: new Set(integrantes.map((i) => i.id)),
    familias: new Set(nucleos.map((n) => n.id)),
    capitulos: new Set(capitulos.map((c) => c.id)),
    temas: new Set(temas.map((t) => t.id)),
  });
  // No modo TV, os filtros "com foto" e "com áudio" contam só o que vai à TV (correção 4 da revisão R-AB2): a foto
  // e a voz de um relato que espera, de um rascunho ou de um descartado não fazem a memória entrar na ordem
  const contexto = await contextoDoExplorar(quem, todas);
  const fotosDeRelato = filtros.comFoto ? [...new Set(todas.flatMap((m) => m.fotos.map((f) => f.relatoId).filter((r): r is number => r !== null)))] : [];
  const [vaoATv, comVozNaTv] = await Promise.all([relatosQueVaoATv(fotosDeRelato), filtros.comAudio ? memoriasComAudioNaTv(quem) : Promise.resolve(undefined)]);
  const paraOsFiltros = filtros.comFoto ? todas.map((m) => ({ ...m, fotos: m.fotos.filter((f) => f.relatoId === null || vaoATv.has(f.relatoId)) })) : todas;
  const resultado = explorar(paraOsFiltros, filtros, comVozNaTv ? { ...contexto, comAudio: new Set([...contexto.comAudio].filter((id) => comVozNaTv.has(id))) } : contexto);
  const memorias = resultado.memorias.filter((m) => m.situacao === 'publicada' && (!sala || entraNaSala(m)));
  const paragrafos = carta ? paragrafosDaCarta(carta.texto) : [];
  return { filtros, memorias, ordem: ordemDaTv(memorias.map((m) => m.id), paragrafos.length), paragrafos };
}

// --- O palco de uma memória ---------------------------------------------------------------------

export interface PedidoDoPalco {
  usuario: Usuario;
  parametros: URLSearchParams;
  /** a memória já lida pela página (da lista da ordem); a rota de uma memória lê de novo */
  memoria?: Memoria;
  /** o passo que a página escolheu na ordem (sem "m" no endereço, o primeiro); a rota lê o "m" do endereço */
  id?: string;
  /** as vizinhas na ordem, que a página tira da ordem e a rota recebe do navegador (só viram links) */
  antes?: string | null;
  depois?: string | null;
  /**
   * "3 de 48": só a página, da ordem que o servidor montou. A rota não recebe a posição do navegador (correção 5
   * da revisão R-AB): quem escreve o "3 de 48" depois de uma passagem é o palco, da ordem que a página mandou.
   */
  posicao?: { posicao: number; de: number };
  /** os filtros já conferidos pela página; a rota lê do endereço (só para os links) */
  filtros?: Filtros;
}

export interface CartaNoPalco {
  saudacao: string;
  ano: string;
  paragrafo: string;
  /** 1 é o primeiro */
  numero: number;
  de: number;
  /** quem assina, só no último parágrafo */
  assinam: string[];
  /** as fotos do primeiro parágrafo: três memórias abertas a todos, com foto */
  fotos: { id: string; fotos: Memoria['fotos']; legenda: string }[];
}

export interface PalcoDaTv {
  /** o passo da ordem: o id da memória ou "carta-2" */
  passo: string;
  /** na sala: para o palco escrever o "3 de 48" com o que entra */
  sala: boolean;
  memoria?: Memoria;
  carta?: CartaNoPalco;
  trecho?: { texto: string; por: string };
  voz?: { por: string; audios: { src: string; duracao: number | null }[] };
  nomes: string[];
  linha?: string;
  antes?: string;
  depois?: string;
  sair: string;
  limpar: string;
  movimento: string;
  movimentos: { id: string; nome: string; href: string }[];
  passar?: Passar & { tempos: { segundos: number; href: string }[]; parar: string };
  tempoMinimo?: number;
  tituloDaPagina: string;
  /** na sala, "Ler tudo": o endereço da primeira parte, quando a memória tem texto */
  ler?: string;
  /** "Ler tudo" aberto: a parte da vez, no lugar da memória */
  leitura?: LeituraNoPalco;
}

export interface LeituraNoPalco {
  titulo: string;
  carimbo: string[];
  trechos: TrechoDaLeitura[];
  /** 1 é a primeira */
  numero: number;
  de: number;
  /** a memória, de volta, sem "Ler tudo" */
  voltar: string;
}

const TITULO_DA_PAGINA = 'Modo TV | Memórias Bayara e Bracarense';

/**
 * O palco do modo TV para um passo da ordem (uma memória ou um parágrafo da carta), ou nada quando ele não
 * entra: a memória que não existe, que quem olha não vê, o rascunho, a que está na lixeira e, na sala, a que
 * não é aberta a todos respondem igual, sem dizer se existem.
 */
export async function palcoDaTv(pedido: PedidoDoPalco): Promise<PalcoDaTv | undefined> {
  const { usuario, parametros } = pedido;
  const sala = naSala(parametros);
  const quem = quemOlhaNaTv(usuario, sala);
  const filtros = pedido.filtros ?? lerFiltros(parametros);
  const passar = lerPassar(parametros);
  const movimento = lerMovimento(parametros);
  const cartaNaFrente = sala && parametros.get('carta') === '1';
  const marcas = { sala: sala ? '1' : undefined, carta: cartaNaFrente ? '1' : undefined };
  const naTv = (id: string | null | undefined, estado: Passar = passar, mov = movimento, mais: Record<string, string> = {}) =>
    idValido(id) ? enderecoDoExplorar(filtros, 'tv', { m: id, ...passarNoEndereco(estado), ...movimentoNoEndereco(mov), ...marcas, ...mais }) : undefined;
  const id = pedido.memoria?.id ?? pedido.id ?? parametros.get('m');
  if (!idValido(id)) return undefined;
  const { sair, limpar } = saidasDoModoTv(filtros, sala);
  const comVizinhas = Boolean(idValido(pedido.antes) || idValido(pedido.depois));
  const base = {
    antes: naTv(pedido.antes),
    depois: naTv(pedido.depois),
    movimento,
    movimentos: MOVIMENTOS.map((m) => ({ ...m, href: naTv(id, passar, m.id)! })),
    passar: comVizinhas
      ? {
          ...passar,
          tempos: TEMPOS_DE_PASSAR.map((segundos) => ({ segundos, href: naTv(id, { tempo: segundos, pausado: false })! })),
          parar: naTv(id, { tempo: null, pausado: false })!,
        }
      : undefined,
    limpar,
    passo: id,
    sala,
    tituloDaPagina: TITULO_DA_PAGINA,
  };

  // A carta, um parágrafo por vez: só na porta da sala que a traz na frente
  const numero = passoDaCarta(id);
  if (numero) {
    if (!cartaNaFrente) return undefined;
    const carta = await obterCarta();
    const paragrafos = carta ? paragrafosDaCarta(carta.texto) : [];
    const paragrafo = paragrafos[numero - 1];
    if (!carta || !paragrafo) return undefined;
    // As fotos, só no primeiro parágrafo: os Natais abertos a todos, do mais novo para o mais antigo. O tema é
    // sempre o de Natal, seja qual for o tema do endereço (correção 4 da revisão R-AB)
    const tema = numero === 1 ? await temaDeNatal() : undefined;
    const natais = tema ? await listarMemorias(VISITANTE_DA_SALA as Usuario, { tema }) : [];
    // Só foto da memória, sem as que vieram com um relato; a escolha é entre as memórias que têm uma, até
    // completar três ou acabar (correção 3 da revisão R-AB2)
    const fotos = natais
      .filter(entraNaSala)
      .map((m) => ({ id: m.id, fotos: m.fotos.filter((f) => f.relatoId === null).slice(0, 1), legenda: legendaLugarAno(m.lugar, m.ano) }))
      .filter((m) => m.fotos.length > 0)
      .reverse()
      .slice(0, 3);
    return {
      ...base,
      carta: {
        saudacao: SAUDACAO_DA_SALA,
        ano: carta.escritaEm.slice(0, 4),
        paragrafo,
        numero,
        de: paragrafos.length,
        assinam: numero === paragrafos.length ? quemAssina(carta.assinatura) : [],
        fotos,
      },
      nomes: [],
      linha: linhaDoAlto({ sala, carta: true }),
      sair,
      tempoMinimo: segundosDoParagrafo(paragrafo),
    };
  }

  // A memória: a que a página já leu, ou lida de novo, para quem olha
  const lida = pedido.memoria ?? (await obterMemoria(quem, id));
  if (!lida || lida.situacao !== 'publicada' || (sala && !entraNaSala(lida))) return undefined;
  const [relatos, integrantes, modosDosExes] = await Promise.all([
    listarRelatos(quem, lida.id),
    listarIntegrantesQueVe(quem),
    // Como os exes aparecem é escolha de quem olha; o visitante da sala não tem ex
    !sala && lida.integrantes.length > 0 ? comoOsExesAparecem(quem) : new Map<string, 'discreto' | 'fora'>(),
  ]);
  const naTela = relatos.filter(relatoNaTv);
  // A foto que veio com um relato só vai à TV com ele (correção 3 da revisão R-AB): a do relato que espera, a
  // do rascunho e a do descartado ficam de fora, pela mesma regra do trecho e da voz (relatoNaTv)
  const relatosNaTela = new Set(naTela.map((r) => r.id));
  const memoria = { ...lida, fotos: lida.fotos.filter((f) => f.relatoId === null || relatosNaTela.has(f.relatoId)) };
  const audios = await listarAudiosDosRelatos(naTela.map((r) => r.id));
  const comVoz = new Set([...audios].filter(([, lista]) => lista.length > 0).map(([relatoId]) => relatoId));
  const relato = relatoDaVez(naTela, comVoz);
  const nome = nomeNaTv(integrantes, sala);
  const daVoz = relato ? (audios.get(relato.id) ?? []) : [];
  const texto = relato ? relato.texto.trim() || daVoz[0]?.transcricao?.trim() || '' : '';
  const por = relato ? (nome(relato.por) ?? '') : '';

  // "Ler tudo", só na sala (decisão do Gui, 25/11/2026): o texto inteiro dos relatos que passam em relatoNaTv,
  // em partes, no próprio modo TV. Fora da sala, "Abrir esta memória" continua levando à página da memória.
  const textoDe = (r: (typeof naTela)[number]) => r.texto.trim() || (audios.get(r.id) ?? [])[0]?.transcricao?.trim() || '';
  // "Ler tudo" é o caminho para todo texto que a memória corta na tela: o título inteiro (à esquerda) e, na primeira
  // parte, "Com…" com todos os nomes, antes dos relatos. Toda memória da sala tem "Ler tudo", mesmo sem relato
  const nomesNaTv = comNaTv(memoria.integrantes, nome, modosDosExes);
  const com = nomesNaTv.length > 1 ? `Com ${nomesNaTv.slice(0, -1).join(', ')} e ${nomesNaTv.at(-1)}.` : nomesNaTv.length ? `Com ${nomesNaTv[0]}.` : '';
  const partes = sala ? partesDaLeitura([...(com ? [{ por: '', texto: com }] : []), ...naTela.filter((r) => textoDe(r)).map((r) => ({ por: nome(r.por) ?? '', texto: textoDe(r) }))]) : [];
  if (sala && partes.length === 0) partes.push([]);
  const ler = partes.length > 0 ? naTv(id, passar, movimento, { ler: '1' }) : undefined;
  // Todo "ler" que não seja uma parte que existe responde como o que não existe (correção 2 da revisão R-AB3)
  const pedeLeitura = parametros.has('ler');
  const parte = sala && pedeLeitura ? parteDaLeitura(parametros.get('ler')) : undefined;
  if (sala && pedeLeitura && !parte) return undefined;
  const vozDaMemoria = daVoz.length > 0 ? { por, audios: daVoz.map((a) => ({ src: `/audios/${a.chave}`, duracao: a.duracao })) } : undefined;
  if (parte) {
    const trechos = partes[parte - 1];
    if (!trechos) return undefined;
    const naParte = (n: number) => naTv(id, passar, movimento, { ler: String(n) });
    return {
      ...base,
      // Com "Ler tudo" aberto, "Passar sozinho" espera: a parte não tem o relógio nem os Ajustes
      passar: undefined,
      // A lista das vozes da memória vai junto (sem a linha "A voz de …"): o portão da voz, no navegador, confere
      // nela o que está pausado (correção 1 da revisão R-AB3)
      voz: vozDaMemoria,
      movimentos: [],
      antes: parte > 1 ? naParte(parte - 1) : undefined,
      depois: parte < partes.length ? naParte(parte + 1) : undefined,
      leitura: {
        titulo: memoria.titulo,
        carimbo: [carimboDaData(memoria), memoria.lugar].filter((x): x is string => Boolean(x)),
        trechos,
        numero: parte,
        de: partes.length,
        voltar: naTv(id)!,
      },
      nomes: [],
      linha: linhaDoAlto({ sala, posicao: pedido.posicao?.posicao, de: pedido.posicao?.de }) || undefined,
      sair,
    };
  }
  return {
    ...base,
    memoria,
    trecho: texto ? { texto: trechoDoRelato(texto, 220), por } : undefined,
    voz: vozDaMemoria,
    nomes: nomesNaTv,
    linha: linhaDoAlto({ sala, posicao: pedido.posicao?.posicao, de: pedido.posicao?.de }) || undefined,
    sair: sala ? sair : `${sair}#${ancoraDaMemoria(memoria.id)}`,
    ler,
  };
}

// --- As portas da sala --------------------------------------------------------------------------

/**
 * Os endereços das duas entradas do cartão "Na TV da sala" (e do "Ver na TV" da carta), com o marcador da
 * sala: "A carta e os Natais" (a carta, depois o tema Natal, das mais antigas para as mais novas) e "Todas as
 * memórias" (as abertas a todos). Sem carta, a primeira começa pelos Natais; sem tema de Natal, pelas
 * memórias abertas a todos, das mais antigas para as mais novas.
 */
export async function enderecosDaSala(): Promise<{ natais: string; todas: string }> {
  const [tema, carta] = await Promise.all([temaDeNatal(), obterCarta()]);
  const natais = new URLSearchParams({ ver: 'tv', sala: '1' });
  if (tema) natais.set('tema', tema);
  natais.set('ordem', 'antigas');
  if (carta) {
    natais.set('carta', '1');
    natais.set('m', 'carta-1');
  }
  return { natais: `/explorar?${natais}`, todas: '/explorar?ver=tv&sala=1' };
}
