// A ordem da lista de Pessoas (resposta do Gui ao QA de design, 17/11/2026, P98). Por padrão, por
// geração, dos mais velhos aos mais novos, com os bichos no fim. Quem preferir troca para a ordem
// alfabética. Sem tela, para ser testada.

export type OrdemDasPessoas = 'geracao' | 'nome';

export interface PessoaDaLista {
  id: string;
  nome: string;
  tipo: string;
  nascimentoAno: number | null;
}

/** A ordem pedida no endereço (`?ordem=nome`). Qualquer outro valor é a ordem por geração. */
export function ordemPedida(valor: string | null | undefined): OrdemDasPessoas {
  return valor === 'nome' ? 'nome' : 'geracao';
}

const porNome = (a: PessoaDaLista, b: PessoaDaLista) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });

/**
 * As pessoas de um bloco na ordem pedida. `geracoes` vem de `calcularGeracoes` (0 é a geração mais
 * antiga). Por geração: primeiro as pessoas com lugar na árvore, da geração mais antiga para a mais
 * nova; dentro da geração, por ano de nascimento, e quem não tem o ano fica depois; depois quem não
 * tem laço de árvore; os bichos por último, pelo nome. O nome desempata sempre, para a ordem não depender de
 * quando cada um foi cadastrado.
 */
export function ordenarPessoas<T extends PessoaDaLista>(pessoas: T[], geracoes: Map<string, number>, ordem: OrdemDasPessoas): T[] {
  if (ordem === 'nome') return [...pessoas].sort(porNome);
  const SEM = Number.MAX_SAFE_INTEGER;
  // Os bichos ficam juntos no fim, pelo nome
  const chave = (p: T) => (p.tipo === 'bicho' ? [1, SEM, SEM] : [0, geracoes.get(p.id) ?? SEM, p.nascimentoAno ?? SEM]);
  return [...pessoas].sort((a, b) => {
    const [ca, cb] = [chave(a), chave(b)];
    for (let i = 0; i < ca.length; i++) if (ca[i] !== cb[i]) return ca[i] - cb[i];
    return porNome(a, b);
  });
}

// --- O filtro por família (proposta B do conceito da sessão E, escolhida pelo Gui em 17/11/2026) ---
// A pílula de família filtra a lista, como no Explorar, mas aqui é uma família por vez; "Todas" volta
// a mostrar tudo. A família e a ordem ficam juntas no endereço: trocar uma não desfaz a outra.

/**
 * A família pedida no endereço (`?familia=<id>`), se ela está entre as que a lista mostra. Uma família
 * que não existe, que está vazia ou que a pessoa não vê é ignorada, como no Explorar: vale "Todas".
 */
export function familiaPedida(valor: string | null | undefined, familias: readonly string[]): string | null {
  return valor && familias.includes(valor) ? valor : null;
}

/** Os grupos que aparecem: só o da família pedida, ou todos quando não há família pedida. */
export function gruposDaFamilia<T extends { id: string }>(grupos: T[], familia: string | null): T[] {
  return familia === null ? grupos : grupos.filter((g) => g.id === familia);
}

/** O endereço da lista com a família e a ordem. Sem família e na ordem por geração, é só `/pessoas`. */
export function enderecoDePessoas(familia: string | null, ordem: OrdemDasPessoas): string {
  const q = new URLSearchParams();
  if (familia) q.set('familia', familia);
  if (ordem === 'nome') q.set('ordem', 'nome');
  const busca = q.toString();
  return busca ? `/pessoas?${busca}` : '/pessoas';
}

// --- "Nome (apelido)" (decisão do Gui, 18/11/2026, depois da sessão H) ------------------------------
// Na lista de Pessoas, cada pessoa aparece como "Alexsander (Lugh)", com o apelido que quem olha vê: o
// seu ("Como você chama"), senão o da família. Quem chega aqui já traz esse apelido em `apelido`
// (`listarIntegrantes` troca o da família pelo de quem está logado). A busca acha pelos dois.

/** O texto sem acento, sem caixa e sem espaço sobrando: o mesmo da busca de pessoa. */
export const textoSimples = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();

/** O apelido que acompanha o nome na lista, ou nada: sem apelido, ou com o apelido igual ao nome. */
export function apelidoAoLado(nome: string, apelido: string | null | undefined): string | null {
  const a = apelido?.trim();
  return a && textoSimples(a) !== textoSimples(nome) ? a : null;
}

/** "Alexsander (Lugh)", ou só o nome. */
export function nomeComApelido(nome: string, apelido: string | null | undefined): string {
  const a = apelidoAoLado(nome, apelido);
  return a ? `${nome} (${a})` : nome;
}

/**
 * A busca "Procurar pelo nome" acha pelo nome e pelo apelido, sem acento e sem caixa. A busca do
 * navegador (`src/lib/cliente/busca-pessoa.ts`) procura o termo no texto de cada opção, que é
 * `nomeComApelido`: esta é a mesma regra, para ser testada.
 */
export function buscaAcha(termo: string, nome: string, apelido: string | null | undefined): boolean {
  return textoSimples(nomeComApelido(nome, apelido)).includes(textoSimples(termo));
}
