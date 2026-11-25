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
import { ancoraDaMemoria, enderecoDoExplorar, explorar, lerFiltros, lerMovimento, lerPassar, MOVIMENTOS, movimentoNoEndereco, passarNoEndereco, soFiltrosConhecidos, TEMPOS_DE_PASSAR, type Filtros, type Passar } from '../explorar';
import { entraNaSala, idValido, linhaDoAlto, naSala, nomeDeNatal, ordemDaTv, SAUDACAO_DA_SALA, paragrafosDaCarta, passoDaCarta, quemAssina, relatoDaVez, relatoNaTv, segundosDoParagrafo } from '../sala';
import { legendaLugarAno, trechoDoRelato } from '../visual';
import { contextoDoExplorar } from './explorar';
import type { Usuario } from './permissoes';
import { listarAudiosDosRelatos, listarCapitulos, listarIntegrantesQueVe, listarMemorias, listarNucleos, listarRelatos, listarTemasVisiveis, obterCarta, obterMemoria, type Integrante, type Memoria } from './repositorio';
import type { Tipo } from '../tipos';

/**
 * Quem olha na sala: ninguém em particular. Não é membro de núcleo nenhum (só vê o que é aberto a todos),
 * não criou nada (nenhum rascunho), não registrou relato (nenhum relato que espera passa por ele) e não tem
 * laço privado (só vê as pessoas que todo mundo vê). O id não pode ser de ninguém: nenhum id de pessoa tem
 * dois-pontos (criarSlug, em src/lib/servidor/conteudo.ts).
 */
export const VISITANTE_DA_SALA: Readonly<Usuario> = Object.freeze({ pessoa: ':sala', nome: '', admin: false, nucleos: [] as string[] });

/** Quem o servidor usa para ler o que vai à TV: o visitante, na sala; quem está logado, fora dela. */
export const quemOlhaNaTv = (usuario: Usuario, sala: boolean): Usuario => (sala ? (VISITANTE_DA_SALA as Usuario) : usuario);

/** O nome de cada pessoa na TV. Na sala, o apelido da família (a tela é de todos); fora, o de quem olha. */
const nomeNaTv = (integrantes: readonly Integrante[], sala: boolean) => (id: string) => {
  const i = integrantes.find((x) => x.id === id);
  return i ? ((sala ? i.apelidoDaFamilia : i.apelido) ?? i.nome) : undefined;
};

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
  const resultado = explorar(todas, filtros, await contextoDoExplorar(quem, todas));
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
  /** as vizinhas na ordem e a posição, que a página tira da ordem e a rota recebe do navegador */
  antes?: string | null;
  depois?: string | null;
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
  const naTv = (id: string | null | undefined, estado: Passar = passar, mov = movimento) =>
    idValido(id) ? enderecoDoExplorar(filtros, 'tv', { m: id, ...passarNoEndereco(estado), ...movimentoNoEndereco(mov), ...marcas }) : undefined;
  const id = pedido.memoria?.id ?? parametros.get('m');
  if (!idValido(id)) return undefined;
  const voltar = enderecoDoExplorar(filtros);
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
    limpar: voltar,
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
    // As fotos, só no primeiro parágrafo: os Natais abertos a todos, do mais novo para o mais antigo
    const tema = filtros.temas[0];
    const natais = numero === 1 && tema ? await listarMemorias(VISITANTE_DA_SALA as Usuario, { tema }) : [];
    const fotos = natais
      .filter((m) => entraNaSala(m) && m.fotos.length > 0)
      .reverse()
      .slice(0, 3)
      .map((m) => ({ id: m.id, fotos: m.fotos.slice(0, 1), legenda: legendaLugarAno(m.lugar, m.ano) }));
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
      sair: '/',
      tempoMinimo: segundosDoParagrafo(paragrafo),
    };
  }

  // A memória: a que a página já leu, ou lida de novo, para quem olha
  const memoria = pedido.memoria ?? (await obterMemoria(quem, id));
  if (!memoria || memoria.situacao !== 'publicada' || (sala && !entraNaSala(memoria))) return undefined;
  const [relatos, integrantes] = await Promise.all([listarRelatos(quem, memoria.id), listarIntegrantesQueVe(quem)]);
  const naTela = relatos.filter(relatoNaTv);
  const audios = await listarAudiosDosRelatos(naTela.map((r) => r.id));
  const comVoz = new Set([...audios].filter(([, lista]) => lista.length > 0).map(([relatoId]) => relatoId));
  const relato = relatoDaVez(naTela, comVoz);
  const nome = nomeNaTv(integrantes, sala);
  const daVoz = relato ? (audios.get(relato.id) ?? []) : [];
  const texto = relato ? relato.texto.trim() || daVoz[0]?.transcricao?.trim() || '' : '';
  const por = relato ? (nome(relato.por) ?? '') : '';
  return {
    ...base,
    memoria,
    trecho: texto ? { texto: trechoDoRelato(texto, 220), por } : undefined,
    voz: daVoz.length > 0 ? { por, audios: daVoz.map((a) => ({ src: `/audios/${a.chave}`, duracao: a.duracao })) } : undefined,
    nomes: memoria.integrantes.map(nome).filter((n): n is string => Boolean(n)),
    linha: linhaDoAlto({ sala, posicao: pedido.posicao?.posicao, de: pedido.posicao?.de }) || undefined,
    sair: sala ? '/' : `${voltar}#${ancoraDaMemoria(memoria.id)}`,
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
