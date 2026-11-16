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
