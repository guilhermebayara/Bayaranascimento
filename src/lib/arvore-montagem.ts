// A montagem da árvore, sem tela: quem aparece, em que geração, e o desenho. Fica separada do
// código do navegador para poder ser testada com os dados de verdade.
import { desenharArvore, passaPor, type Desenho } from './arvore-desenho';
import { DESLOCAMENTO_DO_PAPEL, alinharPeloCoracao, calcularGeracoes, type Papel } from './parentesco';
import { linhaDireta, ramosRecolhidos, type Ramo } from './linha-direta';

export interface DadosDaArvore {
  eu: string;
  /** de quem é a linha direta mostrada por padrão */
  centros: string[];
  /** na ordem em que ficam na árvore, da esquerda para a direita */
  nucleos: { id: string; nome: string }[];
  /** nucleos: as famílias da pessoa, como membro ou parente (na árvore as duas aparecem iguais) */
  pessoas: {
    id: string;
    nome: string;
    rotulo: string;
    nucleos: string[];
    bicho: boolean;
    especie?: string | null;
    anos: string;
    /** endereço da foto de retrato, só para a ficha que abre ao tocar (os cartões continuam sem foto) */
    retrato?: string | null;
    iniciais?: string;
    /**
     * Um ex que quem olha marcou como discreto (src/lib/ex-casal.ts): o cartão ganha a tarja sobre o nome
     * e não abre nada, mas continua no lugar, para o caminho até os parentes dele não se perder.
     */
    discreto?: boolean;
  }[];
  filiacoes: { filho: string; responsavel: string; consideracao: boolean }[];
  casais: { a: string; b: string; ex: boolean }[];
  coracao: { dono: string; pessoa: string; papel: Papel | null; rotulo: string }[];
  /** laços resumidos: b é <papel> de a, para parentes de quem é de fora das famílias */
  resumidos?: { a: string; b: string; papel: Papel; rotulo: string }[];
  /**
   * Os casais que aparecem como laço do coração (separarAmizades, em ex-casal.ts). O namoro fica sempre à
   * vista, colado ao lado de quem namora. O ex que virou amigo (decisão do Gui depois da sessão I,
   * 18/11/2026) só aparece com os laços do coração da pessoa abertos, ao lado dela, com a ligação lateral
   * de casal; com o coração fechado, fica oculto. A história do namoro continua na página do laço.
   */
  amizades?: { a: string; b: string; rotulo?: string; namoro?: boolean }[];
  /** quem tem laço que não aparece na árvore (o namoro que acabou): não entra em "Ainda sem laços" */
  foraDeProposito?: string[];
}

type LacoNaMontagem = { dono: string; pessoa: string; papel: Papel | null; rotulo: string; sangue?: boolean; colado?: boolean };

export interface Estado {
  /** a pessoa selecionada, com a ficha aberta */
  foco: string;
  /** de quem é a linha direta. Vazio: a dos centros padrão. */
  centro: string;
  /** ramos laterais abertos por cima da árvore */
  ramos: Set<string>;
  nucleo: string;
  consideracao: boolean;
  ex: boolean;
  bichos: boolean;
  outros: boolean;
  /** laços do coração sem "como se fosse" (amigos sem lugar na família). Desligado por padrão. */
  amigos?: boolean;
  /** de quem são os laços do coração abertos na árvore. Por padrão, só os de quem está olhando. */
  abertos: Set<string>;
}

/**
 * Como os exes aparecem para quem olha (decisões do Gui, 18/11/2026; src/lib/ex-casal.ts). Quem está
 * "fora" sai dos dados com todos os laços dele: quem só se ligava por ele vem por outro caminho ou não
 * aparece. Quem está "discreto" fica, com a marca, o nome coberto e sem retrato nem anos, que a ficha
 * mostraria. Não sai de linha direta: a árvore padrão continua a mesma. Vale só para quem escolheu: os
 * modos chegam já filtrados pela pessoa logada.
 */
export function aplicarComoOsExesAparecem(dados: DadosDaArvore, modos: ReadonlyMap<string, 'discreto' | 'fora'>): DadosDaArvore {
  if (modos.size === 0) return dados;
  const fora = new Set([...modos].filter(([id, modo]) => modo === 'fora' && id !== dados.eu).map(([id]) => id));
  const discretos = new Set([...modos].filter(([id, modo]) => modo === 'discreto' && id !== dados.eu).map(([id]) => id));
  const fica = (id: string) => !fora.has(id);
  return {
    ...dados,
    centros: dados.centros.filter(fica),
    pessoas: dados.pessoas
      .filter((p) => fica(p.id))
      .map((p) => (discretos.has(p.id) ? { ...p, discreto: true, rotulo: '', anos: '', retrato: null, iniciais: '' } : p)),
    filiacoes: dados.filiacoes.filter((f) => fica(f.filho) && fica(f.responsavel)),
    casais: dados.casais.filter((c) => fica(c.a) && fica(c.b)),
    coracao: dados.coracao.filter((l) => fica(l.dono) && fica(l.pessoa)),
    resumidos: dados.resumidos?.filter((r) => fica(r.a) && fica(r.b)),
    amizades: dados.amizades?.filter((a) => fica(a.a) && fica(a.b)),
  };
}

/** Quem tem laço de árvore (filiação ou casal) com alguém. Só dá para partir dessas pessoas. */
export function comLacoDeArvore(dados: Pick<DadosDaArvore, 'filiacoes' | 'casais'>): Set<string> {
  return new Set([...dados.filiacoes.flatMap((f) => [f.filho, f.responsavel]), ...dados.casais.flatMap((c) => [c.a, c.b])]);
}

/** Para que lado cada pessoa puxa: o primeiro núcleo à esquerda, o último à direita, e quem é de dois fica entre eles. */
export function ladosDasPessoas(dados: DadosDaArvore): Map<string, number> {
  const ids = dados.nucleos.map((n) => n.id);
  const lado = new Map<string, number>();
  for (const p of dados.pessoas) {
    const indices = p.nucleos.map((n) => ids.indexOf(n)).filter((i) => i >= 0);
    if (indices.length && ids.length > 1) lado.set(p.id, indices.reduce((s, i) => s + i, 0) / indices.length / (ids.length - 1));
  }
  return lado;
}

export function montarDesenho(dados: DadosDaArvore, estado: Estado, ladoDe = ladosDasPessoas(dados)) {
  const pessoa = new Map(dados.pessoas.map((p) => [p.id, p]));
    // 1. Quem e o que aparece, conforme os controles
    const noNucleo = (id: string) => !estado.nucleo || (pessoa.get(id)?.nucleos.includes(estado.nucleo) ?? false);
    const visiveis = new Set(dados.pessoas.filter((p) => (estado.bichos || !p.bicho) && (estado.outros || noNucleo(p.id))).map((p) => p.id));
    const dentro = (...ids: string[]) => ids.every((id) => visiveis.has(id));
    const filiacoes = dados.filiacoes.filter((f) => dentro(f.filho, f.responsavel) && (estado.consideracao || !f.consideracao));
    const casais = dados.casais.filter((c) => dentro(c.a, c.b) && (estado.ex || !c.ex));
    // Amigos sem "como se fosse" não entram por padrão: haverá muito mais amigos cadastrados do que gente como da família
    const todosDoCoracao: LacoNaMontagem[] = estado.consideracao ? dados.coracao.filter((l) => dentro(l.dono, l.pessoa) && (l.papel || estado.amigos)) : [];
    // Laços resumidos são parentesco de sangue: não dependem da camada de consideração nem de quem os abriu
    const resumidos: LacoNaMontagem[] = (dados.resumidos ?? [])
      .filter((r) => dentro(r.a, r.b))
      .map((r) => ({ dono: r.a, pessoa: r.b, papel: r.papel, rotulo: r.rotulo, sangue: true }));
    // O namoro e o ex que virou amigo: tracejado do coração, colado ao lado, na mesma geração, com a
    // camada de consideração e coração. O namoro aparece sempre; o ex que virou amigo, só com os laços do
    // coração de um dos dois abertos (decisão do Gui depois da sessão I, 18/11/2026)
    const doCasal = estado.consideracao ? (dados.amizades ?? []).filter((a) => dentro(a.a, a.b)) : [];
    const paraLaco = (a: (typeof doCasal)[number]): LacoNaMontagem & { amizade: boolean } => ({
      dono: a.a,
      pessoa: a.b,
      papel: 'irmao',
      rotulo: a.rotulo ?? 'amizade',
      colado: true,
      amizade: !a.namoro,
    });
    const casaisDoCoracao = doCasal.map(paraLaco);
    const amizadeAberta = (a: { dono: string; pessoa: string }) => estado.abertos.has(a.dono) || estado.abertos.has(a.pessoa);
    const amizades: LacoNaMontagem[] = casaisDoCoracao.filter((a) => !a.amizade || amizadeAberta(a));

    // 1b. A linha direta: os centros, os ancestrais, os irmãos, os descendentes e os casais.
    // O resto da família fica em ramos recolhidos, que abrem por cima da árvore.
    // O centro escolhido pode estar escondido pelos filtros (um bicho com "Bichos" desligado, alguém de
    // fora do núcleo destacado com "Outros núcleos" desligado). Aí vale o padrão, depois quem está
    // olhando, depois quem sobrou, para o mapa nunca ficar vazio.
    // Só dá para partir de quem tem laço de árvore (filiação ou casal) à vista. O centro escolhido também
    // pode estar escondido pelos filtros (a tela impede, mas o endereço pode vir assim): aí vale o padrão,
    // depois quem está olhando, depois quem sobrou, para o mapa nunca ficar vazio.
    const temLacoDeArvore = (id: string) => filiacoes.some((f) => f.filho === id || f.responsavel === id) || casais.some((c) => c.a === id || c.b === id);
    const centros =
      [estado.centro ? [estado.centro] : [], dados.centros, [dados.eu], [...visiveis]]
        .map((ids) => ids.filter((id) => visiveis.has(id) && temLacoDeArvore(id)))
        .find((ids) => ids.length) ?? [];
    const principal = linhaDireta(centros, [...visiveis], filiacoes, casais);

    // 1c. Laços do coração: só aparecem os de quem está com eles abertos. Quem foi escolhido entra
    // na árvore; se tem uma família que não é a nossa (a de uma amiga), ela vem junto.
    const grupoDe = new Map([...visiveis].map((id) => [id, id]));
    const raiz = (id: string): string => (grupoDe.get(id) === id ? id : raiz(grupoDe.get(id)!));
    const unir = (a: string, b: string) => grupoDe.set(raiz(a), raiz(b));
    for (const f of filiacoes) unir(f.filho, f.responsavel);
    for (const c of casais) unir(c.a, c.b);
    const daFamilia = new Set([...principal].map(raiz));
    const trazer = (id: string) => {
      if (daFamilia.has(raiz(id))) principal.add(id);
      else for (const x of visiveis) if (raiz(x) === raiz(id)) principal.add(x);
    };
    for (let mudou = true; mudou; ) {
      mudou = false;
      for (const l of todosDoCoracao) {
        if (!estado.abertos.has(l.dono) || !principal.has(l.dono) || principal.has(l.pessoa)) continue;
        trazer(l.pessoa);
        mudou = true;
      }
      // O parente de quem está na árvore vem junto, de um lado ou do outro do laço resumido, e o namoro
      // também. O ex que virou amigo vem só pelo lado de quem está com os laços abertos
      for (const r of [...resumidos, ...amizades]) {
        if (principal.has(r.dono) === principal.has(r.pessoa)) continue;
        const dentroDaArvore = principal.has(r.dono) ? r.dono : r.pessoa;
        if ((r as { amizade?: boolean }).amizade && !estado.abertos.has(dentroDaArvore)) continue;
        trazer(principal.has(r.dono) ? r.pessoa : r.dono);
        mudou = true;
      }
    }
    const coracao: LacoNaMontagem[] = [
      ...todosDoCoracao.filter((l) => estado.abertos.has(l.dono) && principal.has(l.dono) && principal.has(l.pessoa)),
      ...resumidos.filter((r) => principal.has(r.dono) && principal.has(r.pessoa)),
      ...amizades.filter((a) => principal.has(a.dono) && principal.has(a.pessoa)),
    ];
    // Escadinha: um laço que passa pela mãe de quem olha traz junto o laço dela, mesmo recolhido,
    // porque é por ele que a pessoa se liga à árvore
    for (const l of [...coracao]) {
      const meio = passaPor(l, [...todosDoCoracao, ...resumidos], filiacoes);
      if (!meio || !principal.has(meio)) continue;
      const doMeio = [...todosDoCoracao, ...resumidos].find((x) => (x.dono === meio && x.pessoa === l.pessoa) || (x.dono === l.pessoa && x.pessoa === meio));
      if (doMeio && !coracao.includes(doMeio)) coracao.push(doMeio);
    }
    const lacosDe = new Map<string, number>();
    for (const l of todosDoCoracao) if (principal.has(l.dono)) lacosDe.set(l.dono, (lacosDe.get(l.dono) ?? 0) + 1);
    // O ex que virou amigo conta no botão ♥ de quem está na árvore: é por ele que o amigo aparece
    for (const a of casaisDoCoracao.filter((x) => x.amizade)) {
      const de = principal.has(a.dono) ? a.dono : principal.has(a.pessoa) ? a.pessoa : null;
      if (de) lacosDe.set(de, (lacosDe.get(de) ?? 0) + 1);
    }

    // 1d. Os ramos recolhidos, e quais deles estão abertos
    // O namoro de quem está num ramo vai junto para o cartão do ramo (QA de 18/11/2026: a Bia, namorada
    // do Primo Téo, não aparecia no ramo dele), como o casal: colado ao lado, com o tracejado do coração
    const namoros = casaisDoCoracao.filter((a) => !a.amizade);
    const ramos = ramosRecolhidos(principal, [...visiveis], filiacoes, [...casais, ...namoros.map((a) => ({ a: a.dono, b: a.pessoa }))]);
    const abertos = ramos.filter((r) => estado.ramos.has(r.chave));
    const noRamo = new Set(abertos.flatMap((r) => r.membros));
    const entra = (id: string) => principal.has(id) || noRamo.has(id);
    const filiacoesVisiveis = filiacoes.filter((f) => entra(f.filho) && entra(f.responsavel));
    const casaisVisiveis = casais.filter((c) => entra(c.a) && entra(c.b));
    const naPrincipal = (...ids: string[]) => ids.every((id) => principal.has(id));

    // 2. Gerações, calculadas para a árvore e os ramos abertos juntos, para as fileiras baterem
    const geracoes = alinharPeloCoracao(
      calcularGeracoes([...visiveis].filter(entra), filiacoesVisiveis, casaisVisiveis),
      filiacoesVisiveis,
      casaisVisiveis,
      coracao,
      dados.eu,
    );
    // Quem só está na árvore por um laço do coração entra na geração que o "como se fosse" indica.
    // Sem "como se fosse" (com "Amigos" ligado), fica na geração de quem escolheu.
    const agregados = coracao.filter((l) => geracoes.has(l.dono) && !geracoes.has(l.pessoa));
    for (const l of agregados) if (!geracoes.has(l.pessoa)) geracoes.set(l.pessoa, geracoes.get(l.dono)! + (l.papel ? DESLOCAMENTO_DO_PAPEL[l.papel] : 0));
    // Laço resumido de trás para a frente: o tio entra pela geração do sobrinho que já está na árvore
    for (let mudou = true; mudou; ) {
      mudou = false;
      for (const r of coracao) {
        if (!r.sangue || !r.papel) continue;
        const [temA, temB] = [geracoes.has(r.dono), geracoes.has(r.pessoa)];
        if (temA && !temB) geracoes.set(r.pessoa, geracoes.get(r.dono)! + DESLOCAMENTO_DO_PAPEL[r.papel]);
        else if (temB && !temA) geracoes.set(r.dono, geracoes.get(r.pessoa)! - DESLOCAMENTO_DO_PAPEL[r.papel]);
        else continue;
        mudou = true;
      }
    }
    // O namoro de um ramo aberto entra na geração do par
    const coracaoDosRamos = namoros.filter((a) => noRamo.has(a.dono) && noRamo.has(a.pessoa) && !naPrincipal(a.dono, a.pessoa));
    for (const a of coracaoDosRamos) {
      if (geracoes.has(a.dono) && !geracoes.has(a.pessoa)) geracoes.set(a.pessoa, geracoes.get(a.dono)!);
      else if (geracoes.has(a.pessoa) && !geracoes.has(a.dono)) geracoes.set(a.dono, geracoes.get(a.pessoa)!);
    }
    // Todo laço do coração aberto entra no desenho, com ou sem "como se fosse"
    const ligados = coracao.filter((l) => geracoes.has(l.dono) && geracoes.has(l.pessoa));

    // Na ordem da lista (que vem ordenada do servidor), para o desenho ser estável
    const naArvore = dados.pessoas.filter((p) => principal.has(p.id) && geracoes.has(p.id)).map((p) => ({ id: p.id, geracao: geracoes.get(p.id)!, lado: ladoDe.get(p.id), bicho: p.bicho }));
    const desenho: Desenho = desenharArvore(
      naArvore,
      casaisVisiveis.filter((c) => naPrincipal(c.a, c.b)),
      filiacoesVisiveis.filter((f) => naPrincipal(f.filho, f.responsavel)),
      ligados,
    );

  return { desenho, principal, coracao, coracaoDosRamos, lacosDe, ramos, abertos, filiacoesVisiveis, casaisVisiveis, geracoes, agregados, noNucleo, visiveis };
}

export type Montagem = ReturnType<typeof montarDesenho>;
export type { Ramo };
