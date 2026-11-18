// Nomes parecidos (onda 2, decisão do Gui de 17/11/2026): a sugestão ao digitar um nome novo, que vale
// para todos, e a lista de possíveis cadastros duplicados, que só os administradores veem. Funções puras,
// testadas em testes/duplicados.test.ts. A lista dos administradores usa só comparações baratas (o mesmo
// nome, o mesmo primeiro e último nome, o apelido de um igual ao nome do outro), porque ela é contada a
// cada página que um administrador abre; a sugestão ao digitar, que roda no navegador, aceita também uma
// ou duas letras de diferença.

/** Sem acento, sem maiúscula, sem espaço sobrando. */
export const simples = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const palavras = (texto: string) => simples(texto).split(' ').filter(Boolean);

/** "maria|bayara": o primeiro e o último nome, para "Maria Bayara" e "Maria Aparecida Bayara". */
export function pontas(nome: string): string | null {
  const p = palavras(nome);
  return p.length >= 2 ? `${p[0]}|${p[p.length - 1]}` : null;
}

/** Quantas letras separam dois textos (distância de edição), parando cedo acima do limite. */
export function distancia(a: string, b: string, limite = 2): number {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(anterior[j]! + 1, atual[j - 1]! + 1, anterior[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      menor = Math.min(menor, atual[j]!);
    }
    if (menor > limite) return limite + 1;
    anterior = atual;
  }
  return anterior[b.length]!;
}

export interface PessoaComNome {
  id: string;
  nome: string;
  apelido?: string | null;
}

/** Dois cadastros que podem ser a mesma pessoa, pelas comparações baratas. */
export function podemSerAMesma(a: PessoaComNome, b: PessoaComNome): boolean {
  if (a.id === b.id) return false;
  const [na, nb] = [simples(a.nome), simples(b.nome)];
  if (na && na === nb) return true;
  const [pa, pb] = [pontas(a.nome), pontas(b.nome)];
  if (pa && pa === pb) return true;
  if (a.apelido && simples(a.apelido) === nb) return true;
  if (b.apelido && simples(b.apelido) === na) return true;
  return false;
}

/** A chave de um par, sempre na mesma ordem: "a|b". */
export const chaveDoPar = (x: string, y: string): string => (x < y ? `${x}|${y}` : `${y}|${x}`);

/**
 * Os possíveis cadastros duplicados: os pares que podem ser a mesma pessoa, menos os que um
 * administrador já disse que não são. Agrupa pelas chaves baratas, sem comparar todo mundo com todo mundo.
 */
export function possiveisDuplicados<T extends PessoaComNome>(pessoas: readonly T[], naoSao: ReadonlySet<string> = new Set()): [T, T][] {
  const grupos = new Map<string, T[]>();
  const juntar = (chave: string | null, p: T) => {
    if (!chave) return;
    const lista = grupos.get(chave) ?? [];
    if (!lista.includes(p)) lista.push(p);
    grupos.set(chave, lista);
  };
  for (const p of pessoas) {
    juntar(`n:${simples(p.nome)}`, p);
    juntar(pontas(p.nome) && `p:${pontas(p.nome)}`, p);
    if (p.apelido) juntar(`n:${simples(p.apelido)}`, p);
  }
  const pares = new Map<string, [T, T]>();
  for (const lista of grupos.values()) {
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const [a, b] = [lista[i]!, lista[j]!];
        const chave = chaveDoPar(a.id, b.id);
        if (a.id === b.id || naoSao.has(chave) || !podemSerAMesma(a, b)) continue;
        pares.set(chave, a.id < b.id ? [a, b] : [b, a]);
      }
    }
  }
  return [...pares.values()].sort((x, y) => x[0].nome.localeCompare(y[0].nome, 'pt-BR'));
}

/**
 * Ao digitar um nome novo: quem já está no acervo com o nome parecido. Além das comparações baratas,
 * aceita uma letra de diferença em nomes curtos e duas nos longos ("Lourdes" e "Lurdes").
 */
export function nomesParecidos<T extends PessoaComNome>(nome: string, existentes: readonly T[], maximo = 3): T[] {
  const n = simples(nome);
  if (n.length < 3) return [];
  const novo = { id: '', nome, apelido: null };
  const limite = n.length >= 8 ? 2 : 1;
  return existentes
    .filter((e) => {
      if (podemSerAMesma(novo, e)) return true;
      return [e.nome, e.apelido].some((t) => t && distancia(n, simples(t), limite) <= limite);
    })
    .slice(0, maximo);
}
