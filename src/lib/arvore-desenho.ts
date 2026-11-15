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

export const MEDIDAS: Medidas = { largura: 150, altura: 76, vaoX: 26, vaoY: 64 };

export interface Linha {
  /** caminho SVG */
  d: string;
  tipo: 'casal' | 'ex' | 'filhos' | 'consideracao' | 'coracao';
  /** pessoas que a linha liga, para destacar ou apagar junto com elas */
  de: string[];
}

export interface Desenho {
  pessoas: { id: string; x: number; y: number }[];
  linhas: Linha[];
  largura: number;
  altura: number;
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
  if (pessoas.length === 0) return { pessoas: [], linhas: [], largura: 0, altura: 0 };

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
  otimizarOrdem(linhasDeBlocos, [...paisDe].flatMap(([filho, pais]) => pais.map((pai) => [pai, filho] as [string, string])), coracao.map((l) => [l.dono, l.pessoa] as [string, string]), ladoDe);
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
    const alvo = blocos.map((ids) => {
      const pedidos = ids.map((id, i) => (desejado.has(id) ? desejado.get(id)! - i * passo : undefined)).filter((v) => v !== undefined);
      return pedidos.length ? media(pedidos) : x.get(ids[0])!;
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
  const linhas: Linha[] = [];
  const ehCasal = (a: string, b: string) => casais.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));

  for (const c of casais) {
    const [esq, dir] = em.get(c.a)!.x <= em.get(c.b)!.x ? [c.a, c.b] : [c.b, c.a];
    const mesmaLinha = em.get(esq)!.y === em.get(dir)!.y;
    const d = mesmaLinha
      ? `M ${em.get(esq)!.x + m.largura} ${meioY(esq)} H ${em.get(dir)!.x}`
      : `M ${meioX(esq)} ${meioY(esq)} L ${meioX(dir)} ${meioY(dir)}`;
    linhas.push({ d, tipo: c.ex ? 'ex' : 'casal', de: [c.a, c.b] });
  }

  // Filhos de sangue ou adotivos: uma linha desce dos pais e se abre para os irmãos
  const grupos = new Map<string, string[]>();
  for (const f of filiacoes) {
    if (f.consideracao) continue;
    const pais = filiacoes.filter((o) => o.filho === f.filho && !o.consideracao).map((o) => o.responsavel).sort();
    const chave = pais.join('+');
    if (!(grupos.get(chave) ?? []).includes(f.filho)) empilhar(grupos, chave, f.filho);
  }
  let degrau = 0;
  for (const [chave, filhos] of grupos) {
    const pais = chave.split('+');
    const baixo = Math.max(...pais.map((p) => em.get(p)!.y)) + m.altura;
    // A linha nasce do meio do casal, ou de baixo de quem cria sozinho
    const doCasal = pais.length === 2 && ehCasal(pais[0], pais[1]) && em.get(pais[0])!.y === em.get(pais[1])!.y;
    const origemX = media(pais.map(meioX));
    const origemY = doCasal ? meioY(pais[0]) : baixo;
    // Cada família usa uma altura um pouco diferente, para as linhas não se confundirem
    const barra = baixo + m.vaoY / 2 + ((degrau++ % 3) - 1) * 8;
    const xs = filhos.map(meioX);
    let d = `M ${origemX} ${origemY} V ${barra} M ${Math.min(origemX, ...xs)} ${barra} H ${Math.max(origemX, ...xs)}`;
    for (const filho of filhos) d += ` M ${meioX(filho)} ${barra} V ${em.get(filho)!.y}`;
    if (pais.length === 2 && !doCasal) d = `M ${meioX(pais[0])} ${baixo} V ${baixo + 10} H ${meioX(pais[1])} V ${baixo} ` + d.replace(`M ${origemX} ${origemY}`, `M ${origemX} ${baixo + 10}`);
    linhas.push({ d, tipo: 'filhos', de: [...pais, ...filhos] });
  }

  // Consideração e coração usam o mesmo desenho reto das outras ligações, só que tracejado.
  // Saem um pouco ao lado do centro da pessoa, para não se confundirem com a linha dos filhos.
  let desvio = 0;
  const tracejada = (a: string, b: string) => {
    const pa = em.get(a)!;
    const pb = em.get(b)!;
    const fuga = 14 + (desvio++ % 3) * 7;
    if (pa.y === pb.y) {
      // Mesma geração: lado a lado, uma linha curta; longe, passa por baixo das duas pessoas
      const [esq, dir] = pa.x <= pb.x ? [pa, pb] : [pb, pa];
      if (dir.x - esq.x <= passo + 1) return `M ${esq.x + m.largura} ${esq.y + m.altura / 2} H ${dir.x}`;
      const baixo = pa.y + m.altura + fuga;
      return `M ${meioX(a) + 18} ${pa.y + m.altura} V ${baixo} H ${meioX(b) - 18} V ${pb.y + m.altura}`;
    }
    const [cima, embaixo] = pa.y < pb.y ? [a, b] : [b, a];
    const barra = em.get(embaixo)!.y - fuga;
    const saida = meioX(cima) + (meioX(embaixo) >= meioX(cima) ? 18 : -18);
    return `M ${saida} ${em.get(cima)!.y + m.altura} V ${barra} H ${meioX(embaixo)} V ${em.get(embaixo)!.y}`;
  };
  for (const f of filiacoes) if (f.consideracao) linhas.push({ d: tracejada(f.responsavel, f.filho), tipo: 'consideracao', de: [f.responsavel, f.filho] });
  for (const l of coracao) linhas.push({ d: tracejada(l.dono, l.pessoa), tipo: 'coracao', de: [l.dono, l.pessoa] });

  return {
    pessoas: posicoes,
    linhas,
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

function media(valores: number[]): number {
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

function empilhar<T>(mapa: Map<string, T[]>, chave: string, valor: T): void {
  const lista = mapa.get(chave);
  if (lista) lista.push(valor);
  else mapa.set(chave, [valor]);
}

/**
 * Procura uma ordem melhor para os blocos de cada geração. O custo junta três coisas:
 * linhas de pais e filhos que se cruzam, o comprimento das ligações, e a distância de
 * cada pessoa do lado para onde o núcleo dela puxa. A busca move um bloco por vez, ou
 * inverte um casal, reorganiza as gerações de baixo de acordo, e fica com a mudança
 * sempre que o custo cai.
 */
function otimizarOrdem(linhas: string[][][], filiacoes: [string, string][], coracao: [string, string][], lado: Map<string, number>): void {
  const maiorLinha = Math.max(...linhas.map((l) => l.flat().length), 1);
  const paisDe = new Map<string, string[]>();
  for (const [pai, filho] of filiacoes) empilhar(paisDe, filho, pai);

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
    for (const [a, b] of coracao) if (pos.has(a) && pos.has(b)) total += 0.6 * Math.abs(pos.get(a)! - pos.get(b)!);
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

  const copiar = (estado: string[][][]) => estado.map((l) => l.map((b) => [...b]));
  let melhor = copiar(linhas);
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
  linhas.splice(0, linhas.length, ...melhor);
}
