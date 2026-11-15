// Linha direta e ramos laterais da árvore.
//
// A árvore mostra por padrão só a linha direta de algumas pessoas (os "centros"): elas, os
// ancestrais, os irmãos, os descendentes e os casais de todos esses. O resto da família fica
// em ramos recolhidos. Cada ramo nasce de pais que estão na árvore principal e reúne os filhos
// deles que não estão na linha direta, com quem casou com eles e os descendentes. Abrir um ramo
// mostra essa parte da família por cima da árvore, sem mexer na linha direta.
//
// Funções puras, usadas no navegador e nos testes.

export interface FiliacaoDaLinha {
  filho: string;
  responsavel: string;
  consideracao: boolean;
}

export interface CasalDaLinha {
  a: string;
  b: string;
}

export interface Ramo {
  /** os pais de onde o ramo nasce, em ordem alfabética, unidos por "+" */
  chave: string;
  pais: string[];
  /** filhos desses pais que não estão na linha direta */
  filhos: string[];
  /** todos que aparecem no ramo: os filhos, quem casou com eles e os descendentes */
  membros: string[];
}

function mapaDe(pares: [string, string][]): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  for (const [de, para] of pares) {
    const lista = mapa.get(de);
    if (lista) {
      if (!lista.includes(para)) lista.push(para);
    } else mapa.set(de, [para]);
  }
  return mapa;
}

/** Quem está na linha direta de cada um dos centros. */
export function linhaDireta(centros: string[], pessoas: string[], filiacoes: FiliacaoDaLinha[], casais: CasalDaLinha[]): Set<string> {
  const existe = new Set(pessoas);
  const deFato = filiacoes.filter((f) => !f.consideracao && existe.has(f.filho) && existe.has(f.responsavel));
  const paisDe = mapaDe(deFato.map((f) => [f.filho, f.responsavel]));
  const filhosDe = mapaDe(deFato.map((f) => [f.responsavel, f.filho]));
  // Filhos de consideração de um centro também são da linha dele
  const consideracaoDe = mapaDe(filiacoes.filter((f) => f.consideracao && existe.has(f.filho) && existe.has(f.responsavel)).map((f) => [f.responsavel, f.filho]));
  const paresDe = mapaDe(casais.filter((c) => existe.has(c.a) && existe.has(c.b)).flatMap((c) => [[c.a, c.b] as [string, string], [c.b, c.a] as [string, string]]));

  const linha = new Set<string>();
  const subir = (id: string) => {
    for (const p of paisDe.get(id) ?? []) {
      if (linha.has(p)) continue;
      linha.add(p);
      subir(p);
    }
  };
  const descer = (id: string) => {
    for (const f of filhosDe.get(id) ?? []) {
      if (linha.has(f)) continue;
      linha.add(f);
      descer(f);
    }
  };
  for (const c of centros.filter((id) => existe.has(id))) {
    linha.add(c);
    subir(c);
    descer(c);
    for (const f of consideracaoDe.get(c) ?? []) {
      linha.add(f);
      descer(f);
    }
    // Irmãos: os outros filhos dos pais
    for (const p of paisDe.get(c) ?? []) for (const irmao of filhosDe.get(p) ?? []) linha.add(irmao);
  }
  // Quem é casal de alguém da linha também aparece
  for (const id of [...linha]) for (const par of paresDe.get(id) ?? []) linha.add(par);
  return linha;
}

/** Os ramos recolhidos: para cada grupo de pais na árvore principal, os filhos que ficaram de fora. */
export function ramosRecolhidos(principal: Set<string>, pessoas: string[], filiacoes: FiliacaoDaLinha[], casais: CasalDaLinha[]): Ramo[] {
  const existe = new Set(pessoas);
  const deFato = filiacoes.filter((f) => !f.consideracao && existe.has(f.filho) && existe.has(f.responsavel));
  const paisDe = mapaDe(deFato.map((f) => [f.filho, f.responsavel]));
  const filhosDe = mapaDe(deFato.map((f) => [f.responsavel, f.filho]));
  const paresDe = mapaDe(casais.filter((c) => existe.has(c.a) && existe.has(c.b)).flatMap((c) => [[c.a, c.b] as [string, string], [c.b, c.a] as [string, string]]));

  const porPais = new Map<string, string[]>();
  for (const [filho, pais] of paisDe) {
    if (principal.has(filho)) continue;
    const naArvore = pais.filter((p) => principal.has(p));
    // O ramo nasce só de pais que estão todos na árvore principal
    if (naArvore.length === 0 || naArvore.length !== pais.length) continue;
    const chave = [...naArvore].sort().join('+');
    const lista = porPais.get(chave) ?? [];
    lista.push(filho);
    porPais.set(chave, lista);
  }

  const usados = new Set<string>();
  const ramos: Ramo[] = [];
  for (const [chave, filhos] of porPais) {
    const membros = new Set<string>();
    const fila = [...filhos];
    while (fila.length) {
      const id = fila.shift()!;
      if (membros.has(id) || principal.has(id) || usados.has(id)) continue;
      membros.add(id);
      fila.push(...(paresDe.get(id) ?? []), ...(filhosDe.get(id) ?? []));
    }
    for (const id of membros) usados.add(id);
    ramos.push({ chave, pais: chave.split('+'), filhos: filhos.filter((f) => membros.has(f)), membros: [...membros] });
  }
  return ramos.filter((r) => r.filhos.length > 0);
}
