// Transforma o que vem dos formulários nos arquivos do acervo.
// Funções puras, para serem fáceis de testar.

export interface FotoNova {
  src: string;
  legenda?: string;
  chave?: boolean;
  enviadaPor?: string;
}

export interface MemoriaNova {
  titulo: string;
  ano: number;
  mes?: number;
  dia?: number;
  aproximada?: boolean;
  tipo: string;
  pessoas: string[];
  lugar?: string;
  criadaPor: string;
  fotos: FotoNova[];
}

export interface PessoaNova {
  nome: string;
  parentesco?: string;
}

/** "Vó Bela" → "vo-bela" */
export function criarSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

// Texto entre aspas duplas no formato JSON também é YAML válido
const texto = (valor: string) => JSON.stringify(valor.trim());

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

export function arquivoDaMemoria(m: MemoriaNova): string {
  const linhas = ['---', `titulo: ${texto(m.titulo)}`, `ano: ${m.ano}`];
  if (m.mes) linhas.push(`mes: ${m.mes}`);
  if (m.mes && m.dia) linhas.push(`dia: ${m.dia}`);
  if (m.aproximada) linhas.push('aproximada: true');
  linhas.push(`tipo: ${m.tipo}`);
  linhas.push(`pessoas: [${m.pessoas.join(', ')}]`);
  if (m.lugar?.trim()) linhas.push(`lugar: ${texto(m.lugar)}`);
  linhas.push(`criadaPor: ${m.criadaPor}`);
  if (m.fotos.length > 0) {
    linhas.push('fotos:');
    for (const foto of m.fotos) {
      linhas.push(`  - src: ${texto(foto.src)}`);
      if (foto.legenda?.trim()) linhas.push(`    legenda: ${texto(foto.legenda)}`);
      if (foto.chave) linhas.push('    chave: true');
      if (foto.enviadaPor) linhas.push(`    enviadaPor: ${foto.enviadaPor}`);
    }
  }
  linhas.push('---', '');
  return linhas.join('\n');
}

/**
 * O relato é texto simples escrito pela pessoa. Como o site lê os arquivos
 * como Markdown, neutralizamos o que poderia virar HTML.
 */
export function limparTexto(bruto: string): string {
  return bruto
    .replace(/\r\n?/g, '\n')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function arquivoDoRelato(memoria: string, por: string, registradoPor: string | undefined, corpo: string): string {
  const linhas = ['---', `memoria: ${memoria}`, `por: ${por}`];
  if (registradoPor && registradoPor !== por) linhas.push(`registradoPor: ${registradoPor}`);
  linhas.push('---', '', limparTexto(corpo), '');
  return linhas.join('\n');
}

export function arquivoDaPessoa(p: PessoaNova): string {
  const linhas = ['---', `nome: ${texto(p.nome)}`];
  if (p.parentesco?.trim()) linhas.push(`parentesco: ${texto(p.parentesco)}`);
  linhas.push('ordem: 50', '---', '');
  return linhas.join('\n');
}

export const caminhos = {
  memoria: (id: string) => `src/content/memorias/${id}.md`,
  relato: (memoria: string, pessoa: string) => `src/content/relatos/${memoria}/${pessoa}.md`,
  pessoa: (id: string) => `src/content/pessoas/${id}.md`,
};

/** Lê "por" e "registradoPor" do cabeçalho de um relato já gravado. */
export function lerDonoDoArquivo(conteudo: string): { por: string; registradoPor?: string } | undefined {
  const cabecalho = /^---\n([\s\S]*?)\n---/.exec(conteudo.replace(/\r\n/g, '\n'))?.[1];
  const por = cabecalho && /^por:\s*(\S+)\s*$/m.exec(cabecalho)?.[1];
  if (!por) return undefined;
  return { por, registradoPor: /^registradoPor:\s*(\S+)\s*$/m.exec(cabecalho)?.[1] };
}
