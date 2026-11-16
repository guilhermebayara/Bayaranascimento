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
  pessoas: { id: string; nome: string; rotulo: string; nucleos: string[]; bicho: boolean; anos: string }[];
  filiacoes: { filho: string; responsavel: string; consideracao: boolean }[];
  casais: { a: string; b: string; ex: boolean }[];
  coracao: { dono: string; pessoa: string; papel: Papel | null; rotulo: string }[];
}

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
    const todosDoCoracao = estado.consideracao ? dados.coracao.filter((l) => dentro(l.dono, l.pessoa) && (l.papel || estado.amigos)) : [];

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
    for (let mudou = true; mudou; ) {
      mudou = false;
      for (const l of todosDoCoracao) {
        if (!estado.abertos.has(l.dono) || !principal.has(l.dono) || principal.has(l.pessoa)) continue;
        if (daFamilia.has(raiz(l.pessoa))) principal.add(l.pessoa);
        else for (const id of visiveis) if (raiz(id) === raiz(l.pessoa)) principal.add(id);
        mudou = true;
      }
    }
    const coracao = todosDoCoracao.filter((l) => estado.abertos.has(l.dono) && principal.has(l.dono) && principal.has(l.pessoa));
    // Escadinha: um laço que passa pela mãe de quem olha traz junto o laço dela, mesmo recolhido,
    // porque é por ele que a pessoa se liga à árvore
    for (const l of [...coracao]) {
      const meio = passaPor(l, todosDoCoracao, filiacoes);
      if (!meio || !principal.has(meio)) continue;
      const doMeio = todosDoCoracao.find((x) => (x.dono === meio && x.pessoa === l.pessoa) || (x.dono === l.pessoa && x.pessoa === meio));
      if (doMeio && !coracao.includes(doMeio)) coracao.push(doMeio);
    }
    const lacosDe = new Map<string, number>();
    for (const l of todosDoCoracao) if (principal.has(l.dono)) lacosDe.set(l.dono, (lacosDe.get(l.dono) ?? 0) + 1);

    // 1d. Os ramos recolhidos, e quais deles estão abertos
    const ramos = ramosRecolhidos(principal, [...visiveis], filiacoes, casais);
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
    // Todo laço do coração aberto entra no desenho, com ou sem "como se fosse"
    const ligados = coracao.filter((l) => geracoes.has(l.dono) && geracoes.has(l.pessoa));

    // Na ordem da lista (que vem ordenada do servidor), para o desenho ser estável
    const naArvore = dados.pessoas.filter((p) => principal.has(p.id) && geracoes.has(p.id)).map((p) => ({ id: p.id, geracao: geracoes.get(p.id)!, lado: ladoDe.get(p.id) }));
    const desenho: Desenho = desenharArvore(
      naArvore,
      casaisVisiveis.filter((c) => naPrincipal(c.a, c.b)),
      filiacoesVisiveis.filter((f) => naPrincipal(f.filho, f.responsavel)),
      ligados,
    );

  return { desenho, principal, coracao, lacosDe, ramos, abertos, filiacoesVisiveis, casaisVisiveis, geracoes, agregados, noNucleo, visiveis };
}

export type Montagem = ReturnType<typeof montarDesenho>;
export type { Ramo };
