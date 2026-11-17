// Pequenas transformações do que vem dos formulários. Funções puras.

/** "Vó Bela" → "vo-bela" */
export function criarSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

/** Garante um id que ainda não existe, acrescentando -2, -3... */
export function slugUnico(base: string, existentes: ReadonlySet<string>): string {
  const inicial = base || 'sem-titulo';
  if (!existentes.has(inicial)) return inicial;
  for (let n = 2; ; n++) {
    const candidato = `${inicial}-${n}`;
    if (!existentes.has(candidato)) return candidato;
  }
}

function dataValida(ano: number, mes?: number, dia?: number): boolean {
  if (!mes || !dia) return true;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

export function validarData(ano: number, mes?: number, dia?: number): string | undefined {
  const anoAtual = new Date().getUTCFullYear();
  if (!Number.isInteger(ano) || ano < 1800 || ano > anoAtual) return `O ano precisa estar entre 1800 e ${anoAtual}.`;
  if (dia && !mes) return 'Para informar o dia, informe também o mês.';
  if (!dataValida(ano, mes, dia)) return 'Essa data não existe no calendário.';
  return undefined;
}

/** Texto digitado pela pessoa: normaliza quebras de linha e espaços nas pontas. */
export function arrumarTexto(bruto: string): string {
  return bruto.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** "a Giovanna", "o Gui"; sem "como se referir", só o nome. */
export function comArtigo(pessoa: { nome: string; apelido?: string | null; tratamento: 'ela' | 'ele' | null }): string {
  const nome = pessoa.apelido ?? pessoa.nome;
  return pessoa.tratamento === 'ela' ? `a ${nome}` : pessoa.tratamento === 'ele' ? `o ${nome}` : nome;
}

/** "a Giovanna", "a Giovanna e o Gui", "a Ana, o Bia e a Cora" */
export function juntarNomes(nomes: string[]): string {
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : (nomes[0] ?? '');
}

/** Os outros administradores, do ponto de vista de quem está logado: "a Giovanna" para o Gui, "o Gui" para a Giovanna. */
export function outrosAdmins(eu: string, integrantes: { id: string; nome: string; apelido?: string | null; tratamento: 'ela' | 'ele' | null; admin: boolean }[]): string {
  return juntarNomes(integrantes.filter((i) => i.admin && i.id !== eu).map(comArtigo));
}

/**
 * Quem pode desfazer, do ponto de vista de quem está logado, para uma frase com "ou": "você",
 * "você ou a Giovanna", "você, a Giovanna ou o Lucas Magno" (P59 do QA de design de 17/11/2026:
 * "você ou a Giovanna e o Lucas Magno" pedia uma segunda leitura).
 */
export function voceOuOsOutrosAdmins(eu: string, integrantes: Parameters<typeof outrosAdmins>[1]): string {
  const nomes = ['você', ...integrantes.filter((i) => i.admin && i.id !== eu).map(comArtigo)];
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} ou ${nomes[nomes.length - 1]}` : 'você';
}

const LETRAS_DO_CODIGO = 'abcdefghjkmnpqrstuvwxyz23456789';

/**
 * Código aleatório para o endereço de uma memória ou de um capítulo novo. O endereço não leva o título:
 * um rascunho guardava no endereço o título de antes da publicação, e um título repetido ganhava "-2",
 * o que denunciava uma memória que a pessoa não vê.
 */
export function codigoNovo(existentes: ReadonlySet<string>, tamanho = 8): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(tamanho));
    const codigo = [...bytes].map((b) => LETRAS_DO_CODIGO[b % LETRAS_DO_CODIGO.length]).join('');
    if (!existentes.has(codigo)) return codigo;
  }
}
