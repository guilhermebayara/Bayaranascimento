// Desenho da árvore genealógica: onde cada pessoa fica e por onde passam as
// linhas. Função pura, usada no navegador (para a árvore reagir aos filtros na
// hora) e nos testes.
//
// A árvore é desenhada em linhas por geração. Em cada linha, casais ficam lado
// a lado e os filhos ficam, na medida do possível, embaixo dos pais.

export interface PessoaNoDesenho {
  id: string;
  /** geração, de cima para baixo. Pode ser negativa. */
  geracao: number;
  /**
   * Para que lado a pessoa puxa, de 0 (esquerda) a 1 (direita). Vem dos núcleos:
   * um núcleo à esquerda, outro à direita, e quem une os dois no meio.
   */
  lado?: number;
}

export interface CasalNoDesenho {
  a: string;
  b: string;
  /** casal que não está mais junto */
  ex: boolean;
}

export interface FiliacaoNoDesenho {
  filho: string;
  responsavel: string;
  consideracao: boolean;
}

export interface CoracaoNoDesenho {
  dono: string;
  pessoa: string;
}

export interface Medidas {
  largura: number;
  altura: number;
  /** espaço entre duas pessoas na mesma linha */
  vaoX: number;
  /** espaço entre duas gerações */
  vaoY: number;
}

export const MEDIDAS: Medidas = { largura: 150, altura: 76, vaoX: 44, vaoY: 136 };

export interface Linha {
  /** caminho SVG */
  d: string;
  /** ponto: a bolinha no meio do casal, de onde saem as linhas dos filhos */
  tipo: 'casal' | 'ex' | 'filhos' | 'consideracao' | 'coracao' | 'ponto';
  /** pessoas que a linha liga, para destacar ou apagar junto com elas */
  de: string[];
}

export interface Desenho {
  pessoas: { id: string; x: number; y: number }[];
  linhas: Linha[];
  /** de onde desce a linha dos filhos de cada grupo de pais, e a altura em que ela se abre */
  descidas: { pais: string[]; x: number; y: number; barra: number }[];
  largura: number;
  altura: number;
}

/**
 * Por quem um laço do coração passa antes de chegar ao dono: um pai ou mãe do dono que também tem
 * laço do coração com a pessoa escolhida. Sem ninguém no meio, o laço se liga direto ao dono.
 */
export function passaPor(
  laco: Pick<CoracaoNoDesenho, 'dono' | 'pessoa'>,
  coracao: Pick<CoracaoNoDesenho, 'dono' | 'pessoa'>[],
  filiacoes: Pick<FiliacaoNoDesenho, 'filho' | 'responsavel'>[],
): string | undefined {
  const pais = filiacoes.filter((f) => f.filho === laco.dono).map((f) => f.responsavel);
  return pais.find((pai) => coracao.some((l) => (l.dono === pai && l.pessoa === laco.pessoa) || (l.dono === laco.pessoa && l.pessoa === pai)));
}

export function desenharArvore(
  pessoas: PessoaNoDesenho[],
  casais: CasalNoDesenho[],
  filiacoes: FiliacaoNoDesenho[],
  coracao: CoracaoNoDesenho[] = [],
  m: Medidas = MEDIDAS,
): Desenho {
  const existe = new Set(pessoas.map((p) => p.id));
  const geracaoDe = new Map(pessoas.map((p) => [p.id, p.geracao]));
  casais = casais.filter((c) => existe.has(c.a) && existe.has(c.b));
  filiacoes = filiacoes.filter((f) => existe.has(f.filho) && existe.has(f.responsavel));
  coracao = coracao.filter((l) => existe.has(l.dono) && existe.has(l.pessoa));
  if (pessoas.length === 0) return { pessoas: [], linhas: [], descidas: [], largura: 0, altura: 0 };

  const passo = m.largura + m.vaoX;
  const paisDe = new Map<string, string[]>();
  const filhosDe = new Map<string, string[]>();
  // Para a posição, valem os pais de sangue ou adotivos. Os de consideração só contam para quem não tem outros.
  const temPaisDeFato = new Set(filiacoes.filter((f) => !f.consideracao).map((f) => f.filho));
  for (const f of filiacoes) {
    if (f.consideracao && temPaisDeFato.has(f.filho)) continue;
    empilhar(paisDe, f.filho, f.responsavel);
    empilhar(filhosDe, f.responsavel, f.filho);
  }
  const paresDe = new Map<string, string[]>();
  for (const c of casais) {
    // Só conta como "lado a lado" o casal que está na mesma geração
    if (geracaoDe.get(c.a) !== geracaoDe.get(c.b)) continue;
    empilhar(paresDe, c.a, c.b);
    empilhar(paresDe, c.b, c.a);
  }

  const niveis = [...new Set(pessoas.map((p) => p.geracao))].sort((a, b) => a - b);
  const x = new Map<string, number>();
  const linhasDePessoas: string[][] = [];
  // Em cada linha, os blocos: uma pessoa, ou um grupo de casais que anda junto sem se separar
  const blocosDaLinha = new Map<string[], string[][]>();

  // Famílias ligadas à principal só por um laço do coração (a de uma amiga, por exemplo)
  // ficam perto de quem as escolheu. Para isso é preciso saber a que grupo cada pessoa pertence.
  const grupoDe = new Map(pessoas.map((p) => [p.id, p.id]));
  const raizDe = (id: string): string => (grupoDe.get(id) === id ? id : raizDe(grupoDe.get(id)!));
  for (const f of filiacoes) grupoDe.set(raizDe(f.filho), raizDe(f.responsavel));
  for (const c of casais) grupoDe.set(raizDe(c.a), raizDe(c.b));
  // Escadinha: um laço "como se fosse" que já passa por um pai ou mãe de quem escolheu não ganha
  // linha nem lugar próprios. A tia de consideração do Gui é amiga-irmã da Elizete, e a vó de
  // consideração é mãe de consideração dela: as duas chegam ao Gui pela mãe dele.
  const pelaEscada = new Set(coracao.filter((l) => passaPor(l, coracao, filiacoes) !== undefined));
  const diretos = coracao.filter((l) => !pelaEscada.has(l));
  const escolhidoPor = new Map<string, string>();
  for (const l of coracao) if (raizDe(l.dono) !== raizDe(l.pessoa) && !escolhidoPor.has(raizDe(l.pessoa))) escolhidoPor.set(raizDe(l.pessoa), l.dono);

  // --- 1. Ordem dentro de cada geração ---
  // Roda duas vezes: na segunda, já se sabe onde ficou quem escolheu cada família de fora.
  let dica = new Map<string, number>();
  for (let passada = 0; passada < 2; passada++) {
  x.clear();
  linhasDePessoas.length = 0;
  blocosDaLinha.clear();
  for (const nivel of niveis) {
    const daLinha = pessoas.filter((p) => p.geracao === nivel).map((p) => p.id);
    const naLinha = new Set(daLinha);
    // Onde a pessoa "quer" ficar: embaixo dos pais já posicionados
    const chave = new Map<string, number>();
    for (const id of daLinha) {
      const pais = (paisDe.get(id) ?? []).filter((p) => x.has(p));
      if (pais.length) chave.set(id, media(pais.map((p) => x.get(p)!)));
    }
    // Blocos: grupos ligados por casal, que andam juntos
    const visto = new Set<string>();
    const blocos: { ids: string[]; chave: number; ordem: number; une?: boolean }[] = [];
    daLinha.forEach((id, ordem) => {
      if (visto.has(id)) return;
      const grupo: string[] = [];
      const fila = [id];
      while (fila.length) {
        const atual = fila.shift()!;
        if (visto.has(atual)) continue;
        visto.add(atual);
        grupo.push(atual);
        for (const par of paresDe.get(atual) ?? []) if (naLinha.has(par) && !visto.has(par)) fila.push(par);
      }
      const ids = emFila(grupo, paresDe, chave);
      const chaves = ids.filter((i) => chave.has(i)).map((i) => chave.get(i)!);
      // O bloco fica junto da família mais à esquerda entre as que ele une. Assim os irmãos
      // não se separam, e quem casou com alguém de outra família vai para a ponta do grupo.
      blocos.push({ ids, chave: chaves.length ? Math.min(...chaves) : Number.NaN, ordem, une: chaves.length > 1 });
    });
    // Quem não tem pais na árvore fica perto de quem o escolheu (laço do coração), ou no fim
    for (const bloco of blocos) {
      if (!Number.isNaN(bloco.chave)) continue;
      const donos = coracao.filter((l) => bloco.ids.includes(l.pessoa)).map((l) => l.dono);
      const dono = donos.find((d) => chave.has(d));
      const daFamilia = bloco.ids.map((id) => dica.get(raizDe(id))).find((v) => v !== undefined);
      bloco.chave = dono ? chave.get(dono)! + 0.5 : (daFamilia ?? Number.POSITIVE_INFINITY);
    }
    blocos.sort((p, q) => p.chave - q.chave || Number(Boolean(p.une)) - Number(Boolean(q.une)) || p.ordem - q.ordem);
    const ordenada = blocos.flatMap((b) => b.ids);
    ordenada.forEach((id, i) => x.set(id, i * passo));
    linhasDePessoas.push(ordenada);
    blocosDaLinha.set(ordenada, blocos.map((b) => b.ids));
  }
  dica = new Map([...escolhidoPor].map(([grupo, dono]) => [grupo, (x.get(dono) ?? 0) + 0.5]));
  if (dica.size === 0) break;
  }

  // --- 1b. Melhora a ordem: menos cruzamentos, ligações mais curtas, cada núcleo do seu lado ---
  const ladoDe = new Map(pessoas.filter((p) => p.lado !== undefined).map((p) => [p.id, p.lado!]));
  const linhasDeBlocos = linhasDePessoas.map((linha) => blocosDaLinha.get(linha)!.map((b) => [...b]));
  otimizarOrdem(linhasDeBlocos, [...paisDe].flatMap(([filho, pais]) => pais.map((pai) => [pai, filho] as [string, string])), diretos.map((l) => [l.dono, l.pessoa] as [string, string]), ladoDe, raizDe);
  linhasDePessoas.length = 0;
  blocosDaLinha.clear();
  for (const blocos of linhasDeBlocos) {
    const linha = blocos.flat();
    linha.forEach((id, i) => x.set(id, i * passo));
    linhasDePessoas.push(linha);
    blocosDaLinha.set(linha, blocos);
  }

  // --- 2. Posição horizontal: filhos embaixo dos pais, pais em cima dos filhos ---
  const assentar = (linha: string[], desejado: Map<string, number>) => {
    const blocos = blocosDaLinha.get(linha) ?? [];
    if (blocos.length === 0) return;
    // O bloco se move inteiro. Ele vai para onde, em média, seus membros querem ir.
    const pedido = blocos.map((ids) => {
      const pedidos = ids.map((id, i) => (desejado.has(id) ? desejado.get(id)! - i * passo : undefined)).filter((v) => v !== undefined);
      return pedidos.length ? media(pedidos) : undefined;
    });
    // Quem não tem para onde ir (nem pais, nem filhos, nem par) acompanha o vizinho mais próximo
    const alvo = blocos.map((ids, b) => {
      if (pedido[b] !== undefined) return pedido[b]!;
      for (let d = 1; d < blocos.length; d++) {
        const dir = b + d;
        if (dir < blocos.length && pedido[dir] !== undefined) return pedido[dir]! - blocos.slice(b, dir).reduce((s, x) => s + x.length, 0) * passo;
        const esq = b - d;
        if (esq >= 0 && pedido[esq] !== undefined) return pedido[esq]! + blocos.slice(esq, b).reduce((s, x) => s + x.length, 0) * passo;
      }
      return x.get(ids[0])!;
    });
    // Duas varreduras que respeitam o espaço de cada bloco, e a média das duas (que também respeita)
    const esq = [...alvo];
    for (let i = 1; i < esq.length; i++) esq[i] = Math.max(esq[i], esq[i - 1] + blocos[i - 1].length * passo);
    const dir = [...alvo];
    for (let i = dir.length - 2; i >= 0; i--) dir[i] = Math.min(dir[i], dir[i + 1] - blocos[i].length * passo);
    blocos.forEach((ids, b) => ids.forEach((id, i) => x.set(id, (esq[b] + dir[b]) / 2 + i * passo)));
  };

  for (let volta = 0; volta < 12; volta++) {
    // Descendo: cada grupo de irmãos se centraliza sob os pais
    for (const linha of linhasDePessoas) {
      const desejado = new Map<string, number>();
      const porPais = new Map<string, string[]>();
      for (const id of linha) {
        const pais = (paisDe.get(id) ?? []).filter((p) => (geracaoDe.get(p) ?? 0) < (geracaoDe.get(id) ?? 0));
        if (pais.length) empilhar(porPais, [...pais].sort().join('+'), id);
      }
      for (const [chavePais, irmaos] of porPais) {
        const centro = media(chavePais.split('+').map((p) => x.get(p)!));
        irmaos.forEach((id, i) => desejado.set(id, centro + (i - (irmaos.length - 1) / 2) * passo));
      }
      // Quem casou e não tem pais na árvore acompanha o par
      for (const id of linha) {
        if (desejado.has(id)) continue;
        const i = linha.indexOf(id);
        const vizinho = (paresDe.get(id) ?? []).find((p) => desejado.has(p));
        if (vizinho) desejado.set(id, desejado.get(vizinho)! + (linha.indexOf(vizinho) < i ? passo : -passo));
      }
      assentar(linha, desejado);
    }
    // Subindo: os pais se centralizam sobre os filhos
    for (let n = linhasDePessoas.length - 1; n >= 0; n--) {
      const linha = linhasDePessoas[n];
      const desejado = new Map<string, number>();
      for (const id of linha) {
        const filhos = (filhosDe.get(id) ?? []).filter((f) => (geracaoDe.get(f) ?? 0) > (geracaoDe.get(id) ?? 0));
        if (!filhos.length) continue;
        const centro = media(filhos.map((f) => x.get(f)!));
        // Num casal com filhos em comum, cada um fica de um lado do centro
        const par = (paresDe.get(id) ?? []).find((p) => (filhosDe.get(p) ?? []).some((f) => filhos.includes(f)));
        if (par && Math.abs(linha.indexOf(par) - linha.indexOf(id)) === 1) {
          desejado.set(id, centro + (linha.indexOf(id) < linha.indexOf(par) ? -passo / 2 : passo / 2));
        } else desejado.set(id, centro);
      }
      assentar(linha, desejado);
    }
  }

  const menorX = Math.min(...x.values());
  const y = (id: string) => niveis.indexOf(geracaoDe.get(id)!) * (m.altura + m.vaoY);
  const posicoes = pessoas.map((p) => ({ id: p.id, x: Math.round(x.get(p.id)! - menorX), y: y(p.id) }));
  const em = new Map(posicoes.map((p) => [p.id, p]));
  const meioX = (id: string) => em.get(id)!.x + m.largura / 2;
  const meioY = (id: string) => em.get(id)!.y + m.altura / 2;

  // --- 3. Linhas ---
  // Todas as linhas andam na horizontal e na vertical, com os cantos arredondados: a curva mostra
  // para que lado a linha vai. Acima de cada geração há duas faixas: mais no alto, a das linhas que
  // descem dos pais; mais perto das caixas, a dos laços do coração.
  const linhas: Linha[] = [];
  const ehCasal = (a: string, b: string) => casais.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));
  const pontoDoCasal = new Map<string, { x: number; y: number }>();

  for (const c of casais) {
    const [esq, dir] = em.get(c.a)!.x <= em.get(c.b)!.x ? [c.a, c.b] : [c.b, c.a];
    const mesmaLinha = em.get(esq)!.y === em.get(dir)!.y;
    const d = mesmaLinha
      ? `M ${em.get(esq)!.x + m.largura} ${meioY(esq)} H ${em.get(dir)!.x}`
      : `M ${meioX(esq)} ${meioY(esq)} L ${meioX(dir)} ${meioY(dir)}`;
    linhas.push({ d, tipo: c.ex ? 'ex' : 'casal', de: [c.a, c.b] });
    if (mesmaLinha) pontoDoCasal.set([c.a, c.b].sort().join('+'), { x: (em.get(esq)!.x + m.largura + em.get(dir)!.x) / 2, y: meioY(esq) });
  }

  // Filhos de sangue ou adotivos: cada filho tem a sua linha, saindo do ponto do casal (ou de baixo
  // de quem cria sozinho) e descendo até ele. Linhas de irmãos se sobrepõem e parecem uma só.
  const grupos = new Map<string, string[]>();
  for (const f of filiacoes) {
    if (f.consideracao) continue;
    const pais = filiacoes.filter((o) => o.filho === f.filho && !o.consideracao).map((o) => o.responsavel).sort();
    const chave = pais.join('+');
    if (!(grupos.get(chave) ?? []).includes(f.filho)) empilhar(grupos, chave, f.filho);
  }
  let degrau = 0;
  const descidas: Desenho['descidas'] = [];
  for (const [chave, filhos] of grupos) {
    const pais = chave.split('+');
    const baixo = Math.max(...pais.map((p) => em.get(p)!.y)) + m.altura;
    const ponto = pais.length === 2 && ehCasal(pais[0], pais[1]) ? pontoDoCasal.get(chave) : undefined;
    // Cada família usa uma altura um pouco diferente, para as linhas não se confundirem
    const barra = baixo + m.vaoY * 0.36 + ((degrau++ % 3) - 1) * 7;
    const origens = ponto ? [{ x: ponto.x, y: ponto.y }] : pais.map((p) => ({ x: meioX(p), y: baixo }));
    descidas.push({ pais, x: origens[0].x, y: origens[0].y, barra });
    let d = '';
    for (const filho of filhos) {
      for (const o of origens) d += ' ' + arredondado([[o.x, o.y], [o.x, barra], [meioX(filho), barra], [meioX(filho), em.get(filho)!.y]]);
    }
    linhas.push({ d: d.trim(), tipo: 'filhos', de: [...pais, ...filhos] });
    if (ponto) linhas.push({ d: circulo(ponto.x, ponto.y, 5), tipo: 'ponto', de: pais });
  }

  // Consideração e coração: tracejadas, com o mesmo desenho das outras.
  // Vizinhos se ligam por uma reta curta no meio da caixa. Quem está mais longe recebe uma linha
  // que sai do lado da pessoa, sobe para a faixa do coração e desce no alto de quem foi escolhido.
  const faixas = new Map<number, number>();
  const faixa = (topo: number) => {
    const k = faixas.get(topo) ?? 0;
    faixas.set(topo, k + 1);
    return topo - 26 - (k % 4) * 8;
  };
  const tracejada = (a: string, b: string) => {
    const pa = em.get(a)!;
    const pb = em.get(b)!;
    if (pa.y === pb.y) {
      const paraDireita = pb.x > pa.x;
      const [esq, dir] = paraDireita ? [pa, pb] : [pb, pa];
      const entre = posicoes.some((o) => o.y === pa.y && o.x > esq.x && o.x < dir.x);
      if (!entre) return `M ${esq.x + m.largura} ${pa.y + m.altura / 2} H ${dir.x}`;
      const saida = paraDireita ? pa.x + m.largura : pa.x;
      const recuo = saida + (paraDireita ? 14 : -14);
      const alto = faixa(pa.y);
      return arredondado([[saida, pa.y + m.altura / 2], [recuo, pa.y + m.altura / 2], [recuo, alto], [meioX(b), alto], [meioX(b), pb.y]]);
    }
    // Gerações diferentes: desce de quem está em cima até a faixa de quem está embaixo
    const [cima, baixo] = pa.y < pb.y ? [a, b] : [b, a];
    const alto = faixa(em.get(baixo)!.y);
    const saida = meioX(cima) + (meioX(baixo) >= meioX(cima) ? 20 : -20);
    return arredondado([[saida, em.get(cima)!.y + m.altura], [saida, alto], [meioX(baixo), alto], [meioX(baixo), em.get(baixo)!.y]]);
  };
  for (const f of filiacoes) if (f.consideracao) linhas.push({ d: tracejada(f.responsavel, f.filho), tipo: 'consideracao', de: [f.responsavel, f.filho] });
  // O filho de um amigo já se liga a quem escolheu pelo pai ou mãe: não precisa de linha própria
  const escolhidosPor = new Map<string, Set<string>>();
  for (const l of coracao) (escolhidosPor.get(l.dono) ?? escolhidosPor.set(l.dono, new Set()).get(l.dono)!).add(l.pessoa);
  // Os laços de uma pessoa saem juntos, como no FigJam: um tronco só, que entra pela lateral dela
  // e se divide em curvas para cada escolhido. Cada pessoa e lado tem a sua faixa, logo acima da
  // fileira, e o tronco desce no vão ao lado dela. O tronco e cada galho são desenhados uma vez só,
  // sem sobreposição, para o tracejado continuar visível.
  const R = 20;
  const troncos = new Map<string, { centro: string; lado: -1 | 1; outros: string[]; de: Set<string> }>();
  for (const l of diretos) {
    const viaPais = (paisDe.get(l.pessoa) ?? []).some((p) => escolhidosPor.get(l.dono)!.has(p));
    if (viaPais) continue;
    const [pd, pp] = [em.get(l.dono)!, em.get(l.pessoa)!];
    if (pd.y === pp.y) {
      const [esq, dir] = pd.x < pp.x ? [pd, pp] : [pp, pd];
      const entre = posicoes.some((o) => o.y === pd.y && o.x > esq.x && o.x < dir.x);
      // Vizinhos: uma linha reta
      if (!entre) {
        linhas.push({ d: `M ${esq.x + m.largura} ${pd.y + m.altura / 2} H ${dir.x}`, tipo: 'coracao', de: [l.dono, l.pessoa] });
        continue;
      }
    }
    // O tronco é de quem escolheu, ou de quem está embaixo quando são de gerações diferentes
    const [centro, outro] = pd.y === pp.y || pd.y > pp.y ? [l.dono, l.pessoa] : [l.pessoa, l.dono];
    const lado: -1 | 1 = meioX(outro) < meioX(centro) ? -1 : 1;
    const chave = `${centro}|${lado}`;
    const t = troncos.get(chave) ?? troncos.set(chave, { centro, lado, outros: [], de: new Set([centro]) }).get(chave)!;
    t.outros.push(outro);
    t.de.add(outro);
  }
  for (const { centro, lado, outros, de } of troncos.values()) {
    const pc = em.get(centro)!;
    const alto = faixa(pc.y);
    const meio = pc.y + m.altura / 2;
    const vao = lado < 0 ? pc.x - m.vaoX / 2 : pc.x + m.largura + m.vaoX / 2;
    const entrada = lado < 0 ? pc.x : pc.x + m.largura;
    // Ponta de cada galho: o pé de quem está em cima, ou o topo de quem está na mesma fileira
    const ponta = (id: string) => (em.get(id)!.y === pc.y ? em.get(id)!.y : em.get(id)!.y + m.altura);
    const ordem = [...outros].sort((a, b) => Math.abs(meioX(b) - vao) - Math.abs(meioX(a) - vao));
    const [maisLonge, ...resto] = ordem;
    let d = arredondado([[entrada, meio], [vao, meio], [vao, alto], [meioX(maisLonge), alto], [meioX(maisLonge), ponta(maisLonge)]], R);
    for (const id of resto) {
      // O galho nasce na faixa, um pouco antes, e faz a curva até a pessoa
      const x = meioX(id);
      const y = ponta(id);
      const r = Math.min(R, Math.abs(y - alto) / 2);
      const sentido = y > alto ? 1 : -1;
      d += ` M ${x - lado * r} ${alto} Q ${x} ${alto} ${x} ${alto + sentido * r} L ${x} ${y}`;
    }
    linhas.push({ d, tipo: 'coracao', de: [...de] });
  }

  return {
    pessoas: posicoes,
    linhas,
    descidas,
    largura: Math.max(...posicoes.map((p) => p.x)) + m.largura,
    altura: Math.max(...posicoes.map((p) => p.y)) + m.altura,
  };
}

/** Põe um grupo de casais em fila: quem tem dois pares fica no meio, e quem tem pais na árvore fica do lado deles. */
function emFila(grupo: string[], paresDe: Map<string, string[]>, chave: Map<string, number>): string[] {
  if (grupo.length <= 1) return grupo;
  const dentro = new Set(grupo);
  const pares = (id: string) => (paresDe.get(id) ?? []).filter((p) => dentro.has(p));
  // Começa por uma ponta (quem tem um par só), de preferência a que quer ficar mais à esquerda
  const pontas = grupo.filter((id) => pares(id).length <= 1);
  const inicio = [...(pontas.length ? pontas : grupo)].sort((a, b) => (chave.get(a) ?? Infinity) - (chave.get(b) ?? Infinity))[0];
  const fila: string[] = [];
  const visto = new Set<string>();
  const andar = (id: string) => {
    visto.add(id);
    fila.push(id);
    for (const par of pares(id)) if (!visto.has(par)) andar(par);
  };
  andar(inicio);
  for (const id of grupo) if (!visto.has(id)) andar(id);
  return fila;
}

/** Caminho que passa pelos pontos, com os cantos arredondados */
export function arredondado(pontos: [number, number][], raio = 20): string {
  const p = pontos.filter((q, i) => i === 0 || q[0] !== pontos[i - 1][0] || q[1] !== pontos[i - 1][1]);
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) {
    const [a, b, c] = [p[i - 1], p[i], p[i + 1]];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const r = Math.min(raio, l1 / 2, l2 / 2);
    const antes = [b[0] - ((b[0] - a[0]) / l1) * r, b[1] - ((b[1] - a[1]) / l1) * r];
    const depois = [b[0] + ((c[0] - b[0]) / l2) * r, b[1] + ((c[1] - b[1]) / l2) * r];
    d += ` L ${antes[0]} ${antes[1]} Q ${b[0]} ${b[1]} ${depois[0]} ${depois[1]}`;
  }
  const fim = p[p.length - 1];
  return p.length > 1 ? `${d} L ${fim[0]} ${fim[1]}` : d;
}

function circulo(x: number, y: number, r: number): string {
  return `M ${x - r} ${y} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
}

function media(valores: number[]): number {
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

function empilhar<T>(mapa: Map<string, T[]>, chave: string, valor: T): void {
  const lista = mapa.get(chave);
  if (lista) lista.push(valor);
  else mapa.set(chave, [valor]);
}

/**
 * Procura uma ordem melhor para os blocos de cada geração. O custo junta: linhas de pais
 * e filhos que se cruzam, o comprimento das ligações, irmãos lado a lado, laços do coração
 * perto e do lado de fora, e a distância de cada pessoa do lado para onde o núcleo dela puxa. A busca move um bloco por vez, ou
 * inverte um casal, reorganiza as gerações de baixo de acordo, e fica com a mudança
 * sempre que o custo cai.
 */
function otimizarOrdem(linhas: string[][][], filiacoes: [string, string][], coracao: [string, string][], lado: Map<string, number>, familiaDe: (id: string) => string = (id) => id): void {
  const maiorLinha = Math.max(...linhas.map((l) => l.flat().length), 1);
  const paisDe = new Map<string, string[]>();
  const filhosDe = new Map<string, string[]>();
  for (const [pai, filho] of filiacoes) {
    empilhar(paisDe, filho, pai);
    empilhar(filhosDe, pai, filho);
  }

  // Irmãos de pai e mãe: mesmos responsáveis
  const porPais = new Map<string, string[]>();
  for (const [filho, pais] of paisDe) empilhar(porPais, [...pais].sort().join('+'), filho);
  const gruposDeIrmaos = [...porPais.values()].filter((g) => g.length > 1);
  const irmaosDe = new Map<string, string[]>();
  for (const grupo of gruposDeIrmaos) for (const id of grupo) irmaosDe.set(id, grupo.filter((i) => i !== id));

  const posicoes = (estado: string[][][]) => {
    const pos = new Map<string, number>();
    const nivel = new Map<string, number>();
    estado.forEach((blocos, n) => {
      const ids = blocos.flat();
      // Linhas centralizadas: a posição conta a partir do meio
      ids.forEach((id, i) => {
        pos.set(id, i - (ids.length - 1) / 2);
        nivel.set(id, n);
      });
    });
    return { pos, nivel };
  };

  const custo = (estado: string[][][]): number => {
    const { pos, nivel } = posicoes(estado);
    // Uma ligação por filho: do meio dos pais até ele, como a linha é desenhada
    const ligacoes: { de: number; para: number; nivelDe: number; nivelPara: number }[] = [];
    for (const [filho, pais] of paisDe) {
      const visiveis = pais.filter((p) => pos.has(p));
      if (!pos.has(filho) || visiveis.length === 0) continue;
      ligacoes.push({ de: media(visiveis.map((p) => pos.get(p)!)), para: pos.get(filho)!, nivelDe: Math.max(...visiveis.map((p) => nivel.get(p)!)), nivelPara: nivel.get(filho)! });
    }
    let total = 0;
    for (const l of ligacoes) total += Math.abs(l.de - l.para);
    // Laços do coração: quem foi escolhido fica perto de quem escolheu, e do lado de fora,
    // isto é, do lado oposto ao dos irmãos. Assim irmãos continuam lado a lado.
    for (const [a, b] of coracao) {
      if (!pos.has(a) || !pos.has(b)) continue;
      const distancia = pos.get(b)! - pos.get(a)!;
      total += 2.5 * Math.abs(distancia);
      const ladoDoDono = lado.get(a);
      if (ladoDoDono !== undefined && Math.abs(ladoDoDono - 0.5) > 1e-6) {
        // O laço vai para o lado do núcleo de origem de quem escolheu
        if (distancia * (ladoDoDono - 0.5) < 0) total += 6;
      } else {
        const irmaos = (irmaosDe.get(a) ?? []).filter((i) => pos.has(i) && nivel.get(i) === nivel.get(a));
        if (irmaos.length && distancia * (media(irmaos.map((i) => pos.get(i)!)) - pos.get(a)!) > 0) total += 6;
      }
    }
    // Irmãos de pai e mãe ficam lado a lado: cada pessoa de fora entre dois deles pesa
    for (const grupo of gruposDeIrmaos) {
      const presentes = grupo.filter((i) => pos.has(i)).sort((x, y) => pos.get(x)! - pos.get(y)!);
      for (let i = 1; i < presentes.length; i++) {
        if (nivel.get(presentes[i]) !== nivel.get(presentes[i - 1])) continue;
        const entre = estado[nivel.get(presentes[i])!].filter((bloco) => {
          const p0 = pos.get(bloco[0])!;
          return p0 > pos.get(presentes[i - 1])! && p0 < pos.get(presentes[i])! && !bloco.some((id) => grupo.includes(id));
        });
        total += 3 * entre.reduce((soma, bloco) => soma + bloco.length, 0);
      }
    }
    for (let i = 0; i < ligacoes.length; i++) {
      for (let j = i + 1; j < ligacoes.length; j++) {
        const [a, b] = [ligacoes[i], ligacoes[j]];
        if (a.nivelDe !== b.nivelDe || a.nivelPara !== b.nivelPara) continue;
        // Um cruzamento pesa muito mais que uma ligação comprida: árvore limpa vem primeiro
        if ((a.de - b.de) * (a.para - b.para) < 0) total += 20;
      }
    }
    for (const [id, alvo] of lado) if (pos.has(id)) total += 0.75 * Math.abs(pos.get(id)! - (alvo * 2 - 1) * (maiorLinha / 2));
    return total;
  };

  // Depois de mexer numa geração, as de baixo se reorganizam: cada bloco vai para baixo dos pais
  const reorganizarAbaixo = (estado: string[][][], aPartirDe: number) => {
    for (let n = aPartirDe + 1; n < estado.length; n++) {
      const { pos } = posicoes(estado);
      const chave = (bloco: string[], indice: number) => {
        const pais = bloco.flatMap((id) => (paisDe.get(id) ?? []).filter((p) => pos.has(p) && !estado[n].flat().includes(p)));
        return pais.length ? media(pais.map((p) => pos.get(p)!)) : (pos.get(bloco[0]) ?? indice);
      };
      estado[n] = estado[n]
        .map((bloco, i) => ({ bloco, chave: chave(bloco, i), i }))
        .sort((a, b) => a.chave - b.chave || a.i - b.i)
        .map((x) => x.bloco);
    }
  };

  // Blocos já posicionados pelas regras de acabamento (irmãos, laços do coração, meio-irmãos)
  const posicionados = new Set<string[]>();
  // Quando um bloco muda de lugar, os pais que só têm filhos nele vão junto: cada bloco de pais
  // é recolocado onde o custo fica menor. É o que deixa a família de um amigo andar inteira.
  const puxarPais = (estado: string[][][], n: number, ids: string[]) => {
    if (n === 0) return;
    const pais = new Set(ids.flatMap((id) => paisDe.get(id) ?? []));
    const blocosDePais = estado[n - 1].filter((bloco) => bloco.some((id) => pais.has(id)));
    for (const bloco of blocosDePais) {
      // Quem já foi posicionado por uma das regras de acabamento fica onde está
      if (posicionados.has(bloco)) continue;
      // Só quem não tem filhos em outro bloco: pais com mais filhos seguram o lugar
      const outrosFilhos = bloco.flatMap((id) => filhosDe.get(id) ?? []).some((f) => !ids.includes(f));
      if (outrosFilhos) continue;
      const linha = estado[n - 1];
      linha.splice(linha.indexOf(bloco), 1);
      let melhorLugar = 0;
      let menor = Infinity;
      for (let j = 0; j <= linha.length; j++) {
        linha.splice(j, 0, bloco);
        const c = custo(estado);
        if (c < menor) [menor, melhorLugar] = [c, j];
        linha.splice(j, 1);
      }
      linha.splice(melhorLugar, 0, bloco);
      puxarPais(estado, n - 1, bloco);
    }
  };

  const copiar = (estado: string[][][]) => estado.map((l) => l.map((b) => [...b]));
  // A busca anda um bloco por vez e pode parar numa árvore espelhada (Bracarense à esquerda), que é
  // um mínimo local quando há muitos laços do coração. Por isso ela parte de três arranjos: o que
  // veio, o espelho dele e um com cada fileira ordenada pelo lado dos núcleos. Fica o melhor.
  const ladoDoBloco = (bloco: string[], i: number, total: number) => {
    const lados = bloco.map((id) => lado.get(id)).filter((v): v is number => v !== undefined);
    return lados.length ? media(lados) : i / Math.max(total - 1, 1);
  };
  const partidas = [
    copiar(linhas),
    copiar(linhas).map((l) => l.reverse().map((b) => b.reverse())),
    copiar(linhas).map((l) => l.map((b, i) => ({ b, k: ladoDoBloco(b, i, l.length), i })).sort((x, y) => x.k - y.k || x.i - y.i).map((x) => x.b)),
  ];
  let melhor = partidas[0];
  let melhorCusto = Infinity;
  // Só troca de partida quando a diferença é clara. Diferenças pequenas mantêm o arranjo que veio,
  // para a árvore não pular de um lado para o outro a cada laço aberto.
  partidas.forEach((partida, i) => {
    const achado = buscar(partida);
    const folga = i === 0 ? 0 : Math.max(4, melhorCusto * 0.05);
    if (achado.custo < melhorCusto - folga) [melhor, melhorCusto] = [achado.estado, achado.custo];
  });

  function buscar(inicio: string[][][]): { estado: string[][][]; custo: number } {
  let melhor = inicio;
  let melhorCusto = custo(melhor);
  for (let rodada = 0; rodada < 10; rodada++) {
    let melhorou = false;
    for (let n = 0; n < melhor.length; n++) {
      for (let i = 0; i < melhor[n].length; i++) {
        const candidatos: string[][][][] = [];
        const tentar = (mudar: (estado: string[][][]) => void) => {
          for (const reorganiza of [false, true]) {
            const estado = copiar(melhor);
            mudar(estado);
            if (reorganiza) reorganizarAbaixo(estado, n);
            candidatos.push(estado);
          }
          // Terceira tentativa: os pais acompanham
          const ids = melhor[n][i];
          if (n > 0 && ids.some((id) => paisDe.has(id))) {
            const estado = copiar(melhor);
            mudar(estado);
            puxarPais(estado, n, ids);
            candidatos.push(estado);
          }
        };
        // Inverter o bloco (trocar o casal de lado)
        if (melhor[n][i].length > 1) tentar((e) => e[n][i].reverse());
        // Mover o bloco para outra posição da linha, do jeito que está e invertido
        for (let j = 0; j < melhor[n].length; j++) {
          if (j === i) continue;
          tentar((e) => e[n].splice(j, 0, e[n].splice(i, 1)[0]));
          if (melhor[n][i].length > 1) tentar((e) => e[n].splice(j, 0, e[n].splice(i, 1)[0].reverse()));
        }
        for (const estado of candidatos) {
          const c = custo(estado);
          if (c < melhorCusto - 1e-9) {
            melhor = estado;
            melhorCusto = c;
            melhorou = true;
          }
        }
      }
    }
    if (!melhorou) break;
  }
  return { estado: melhor, custo: melhorCusto };
  }

  // Por fim, os acabamentos que deixam cada família legível:
  // 1. Quem veio de outra família por um laço do coração fica encostado em quem o escolheu, do lado
  //    do núcleo de origem dessa pessoa (Bayara à esquerda, Bracarense à direita). Quem não tem
  //    descendentes fica mais perto, para a linha dele não cruzar a dos filhos dos outros.
  // 0. (no começo de cada fileira) Irmãos de sangue do lado de fora de cada cônjuge.
  // 2. Filhos de um só dos pais (meio-irmãos) vão para fora do grupo de irmãos, do lado desse pai
  //    ou mãe, depois também dos laços do coração do grupo.
  const direcaoDe = (dono: string, linha: string[][]): -1 | 1 => {
    const l = lado.get(dono);
    if (l !== undefined && Math.abs(l - 0.5) > 1e-6) return l < 0.5 ? -1 : 1;
    // Sem núcleo que diga o lado: para o lado oposto ao dos irmãos
    const ordem = linha.flat();
    const irmaos = (irmaosDe.get(dono) ?? []).filter((i) => ordem.includes(i));
    if (irmaos.length) return media(irmaos.map((i) => ordem.indexOf(i))) > ordem.indexOf(dono) ? -1 : 1;
    return -1;
  };
  const descendentes = (ids: string[]) => {
    const vistos = new Set<string>();
    const fila = [...ids];
    while (fila.length) for (const f of filhosDe.get(fila.shift()!) ?? []) if (!vistos.has(f)) (vistos.add(f), fila.push(f));
    return vistos.size;
  };
  for (let n = 0; n < melhor.length; n++) {
    // 0. Irmãos de sangue ficam do lado de fora de cada cônjuge: os de quem está à esquerda no
    //    casal vão para a esquerda, os de quem está à direita, para a direita. Ninguém é pulado:
    //    os irmãos encostam no casal e empurram os outros para fora.
    {
      const linha = melhor[n];
      const acima = new Set(n > 0 ? melhor[n - 1].flat() : []);
      const paisAcima = (id: string) => (paisDe.get(id) ?? []).filter((p) => acima.has(p));
      let mexeu = false;
      // Primeiro os casais que unem duas famílias (os dois têm pais acima). Quem já foi
      // posicionado ao lado de um casal fica firme e não puxa nem é puxado de novo.
      const une = (b: string[]) => b.length > 1 && paisAcima(b[0]).length > 0 && paisAcima(b[b.length - 1]).length > 0;
      const casaisDaLinha = linha.filter((b) => b.length > 1).sort((a, b) => Number(une(b)) - Number(une(a)));
      const firmes = new Set<string[]>();
      for (const bloco of casaisDaLinha) {
        if (firmes.has(bloco)) continue;
        firmes.add(bloco);
        for (const [conjuge, esquerda] of [[bloco[0], true], [bloco[bloco.length - 1], false]] as [string, boolean][]) {
          const ps = paisAcima(conjuge);
          if (ps.length === 0) continue;
          const irmaos = linha.filter((b) => b !== bloco && !firmes.has(b) && b.some((id) => paisAcima(id).some((p) => ps.includes(p))));
          for (const b of irmaos) {
            firmes.add(b);
            posicionados.add(b);
          }
          if (irmaos.length === 0) continue;
          for (const b of irmaos) {
            linha.splice(linha.indexOf(b), 1);
            // O irmão fica na ponta do próprio bloco que encosta no casal
            const irmao = b.find((id) => paisAcima(id).some((p) => ps.includes(p)))!;
            const ponta = esquerda ? b.length - 1 : 0;
            if (b.length > 1 && b.indexOf(irmao) !== ponta) b.reverse();
          }
          const i = linha.indexOf(bloco);
          linha.splice(esquerda ? i : i + 1, 0, ...irmaos);
          mexeu = true;
        }
      }
      if (mexeu) reorganizarAbaixo(melhor, n);
    }

    const original = melhor[n].flat();
    const naLinha = new Set(original);
    // Cada bloco escolhido acompanha o primeiro laço que o trouxe. Se quem escolheu está em outra
    // geração (uma tia de consideração, por exemplo), o escolhido encosta no pai ou mãe dessa pessoa
    // que está nesta fileira, do lado do núcleo de origem de quem escolheu.
    const donoDoBloco = new Map<string[], string>();
    const ancoraDoBloco = new Map<string[], string>();
    for (const [dono, escolhido] of coracao) {
      if (!naLinha.has(escolhido) || familiaDe(dono) === familiaDe(escolhido)) continue;
      let ancora: string | undefined = naLinha.has(dono) ? dono : undefined;
      if (!ancora) {
        const ordem = melhor[n].flat();
        let parentes = [...(paisDe.get(dono) ?? []), ...(filhosDe.get(dono) ?? [])].filter((id) => naLinha.has(id));
        // Duas gerações ou mais de distância (uma vó de consideração): sobe pelos ancestrais
        for (let acima = paisDe.get(dono) ?? []; parentes.length === 0 && acima.length; ) {
          acima = acima.flatMap((id) => paisDe.get(id) ?? []);
          parentes = acima.filter((id) => naLinha.has(id));
        }
        // Sem pai, mãe ou filho na fileira, encosta num sobrinho (filho de um irmão de quem escolheu)
        if (parentes.length === 0) {
          const irmaos = (irmaosDe.get(dono) ?? []);
          parentes = [...naLinha].filter((id) => (paisDe.get(id) ?? []).some((p) => irmaos.includes(p)));
        }
        if (parentes.length === 0) continue;
        const l = lado.get(dono);
        const paraEsquerda = l === undefined || l <= 0.5;
        ancora = parentes.sort((a, b) => (ordem.indexOf(a) - ordem.indexOf(b)) * (paraEsquerda ? 1 : -1))[0];
      }
      const bloco = melhor[n].find((b) => b.includes(escolhido))!;
      if (!bloco.includes(ancora) && !donoDoBloco.has(bloco)) {
        donoDoBloco.set(bloco, dono);
        ancoraDoBloco.set(bloco, ancora);
      }
    }
    const retirados = [...donoDoBloco.keys()];
    for (const b of retirados) posicionados.add(b);
    melhor[n] = melhor[n].filter((b) => !donoDoBloco.has(b));

    // 1. Laços do coração, em rodadas: primeiro os de quem já está na linha, depois os escolhidos por eles
    let pendentes = retirados;
    while (pendentes.length) {
      const linha = melhor[n];
      const prontos = pendentes.filter((b) => linha.some((x) => x.includes(ancoraDoBloco.get(b)!)));
      if (prontos.length === 0) {
        linha.push(...pendentes);
        break;
      }
      const porAncora = new Map<string, string[][]>();
      for (const b of prontos) empilhar(porAncora, `${ancoraDoBloco.get(b)!}|${donoDoBloco.get(b)!}`, b);
      // Na mesma âncora, quem chega por um laço mais perto dela fica mais perto: a mãe de
      // consideração da Elizete encosta na Vó Vivica antes da vó de consideração do Gui
      const distancia = (ancora: string, dono: string) =>
        ancora === dono ? 0 : (paisDe.get(dono) ?? []).includes(ancora) || (filhosDe.get(dono) ?? []).includes(ancora) ? 1 : 2;
      const entradas = [...porAncora].sort(([a], [b]) => distancia(...(b.split('|') as [string, string])) - distancia(...(a.split('|') as [string, string])));
      for (const [chave, blocos] of entradas) {
        const [ancora, dono] = chave.split('|');
        const direcao = ancora === dono ? direcaoDe(dono, linha) : (lado.get(dono) ?? 0) > 0.5 ? 1 : -1;
        const perto = [...blocos].sort((a, b) => descendentes(a) - descendentes(b) || original.indexOf(a[0]) - original.indexOf(b[0]));
        for (const bloco of perto) {
          // O escolhido fica na ponta do bloco virada para quem o escolheu
          // Com mais de um escolhido no bloco (um casal de amigos), vale a ordem dos laços, para o
          // casal não trocar de lado conforme outros laços abrem
          const escolhido = coracao.find(([d, e]) => d === dono && bloco.includes(e))![1];
          const ponta = direcao < 0 ? bloco.length - 1 : 0;
          if (bloco.length > 1 && bloco.indexOf(escolhido) !== ponta) bloco.reverse();
        }
        const doDono = linha.findIndex((b) => b.includes(ancora));
        if (direcao < 0) linha.splice(doDono, 0, ...[...perto].reverse());
        else linha.splice(doDono + 1, 0, ...perto);
      }
      pendentes = pendentes.filter((b) => !prontos.includes(b));
    }

    // 2. Meio-irmãos para fora do grupo
    const linha = melhor[n];
    const anterior = n > 0 ? melhor[n - 1].flat() : [];
    const paisDoCasal = new Map<string, string[]>();
    for (const id of linha.flat()) {
      const ps = (paisDe.get(id) ?? []).filter((p) => anterior.includes(p));
      if (ps.length === 2) empilhar(paisDoCasal, [...ps].sort().join('+'), id);
    }
    for (const [chave, irmaos] of paisDoCasal) {
      const [a, b] = chave.split('+');
      for (const meio of linha.flat()) {
        const ps = (paisDe.get(meio) ?? []).filter((p) => anterior.includes(p));
        if (ps.length !== 1 || (ps[0] !== a && ps[0] !== b)) continue;
        const paraEsquerda = anterior.indexOf(ps[0]) < anterior.indexOf(ps[0] === a ? b : a);
        // O grupo: os irmãos de pai e mãe e os laços do coração deles
        const doGrupo = (bloco: string[]) =>
          bloco.some((id) => irmaos.includes(id) || coracao.some(([d, e]) => e === id && irmaos.includes(d) && donoDoBloco.get(bloco) === d));
        const blocoDoMeio = linha.find((x) => x.includes(meio))!;
        if (doGrupo(blocoDoMeio)) continue;
        linha.splice(linha.indexOf(blocoDoMeio), 1);
        const indices = linha.map((x, k) => (doGrupo(x) ? k : -1)).filter((k) => k >= 0);
        if (!indices.length) {
          linha.push(blocoDoMeio);
          continue;
        }
        linha.splice(paraEsquerda ? Math.min(...indices) : Math.max(...indices) + 1, 0, blocoDoMeio);
      }
    }

    // A família de quem foi escolhido acompanha: pais em cima, filhos embaixo
    for (const bloco of retirados) puxarPais(melhor, n, bloco);
    if (retirados.some((b) => b.some((id) => filhosDe.has(id)))) reorganizarAbaixo(melhor, n);
  }
  linhas.splice(0, linhas.length, ...melhor);
}
