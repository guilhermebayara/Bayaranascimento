// A cópia para o espelho (decisão do Gui, 23/11/2026, nas respostas à medição M2; sessão D1e).
//
// O espelho da homologação (src/lib/espelho.ts) só lê da cópia as tabelas da família. Em vez de mandar a
// cópia inteira do acervo (7,5 MB com o acervo cheio, de 74 a 107 ms de CPU e uns 55 MB de memória no envio),
// a produção entrega, em "Baixar cópia para o espelho", só essas tabelas e só as colunas que o espelho usa:
// alguns KB. Nada que alguém escreveu ou fotografou sai da produção por aqui: nem memória, relato, mensagem,
// "Sobre", foto, retrato, áudio, capítulo ou carta, nem as escolhas que só o dono vê (o círculo, "Como você
// chama" e como o ex aparece).
//
// A lista abaixo é a única fonte das tabelas e das colunas lidas: a guarda (scripts/confere-producao.mjs,
// regra 11) confere que ela só tem tabelas da família e nenhuma coluna de texto escrito ou de arquivo, e
// testes/copia-para-o-espelho.test.ts confere que o espelho feito dela é o mesmo feito da cópia inteira.
import { MARCA_DO_ACERVO } from './copia-em-partes';

/** As tabelas e as colunas que a cópia para o espelho leva: exatamente o que src/lib/espelho.ts lê. */
export const COLUNAS_PARA_O_ESPELHO = {
  integrantes: [
    'id',
    'nome',
    'apelido',
    'tipo',
    'especie',
    'tratamento',
    'nascimento_ano',
    'nascimento_mes',
    'nascimento_dia',
    'falecimento_ano',
    'falecimento_mes',
    'falecimento_dia',
    'falecido',
    'admin',
    'ordem',
    'criado_por',
    'excluida_em',
    'excluida_por',
  ],
  nucleo_membros: ['nucleo_id', 'integrante_id', 'papel'],
  filiacoes: ['filho_id', 'responsavel_id', 'qualidade', 'criado_por', 'adocao_ano', 'adocao_mes', 'adocao_dia'],
  casais: ['id', 'a_id', 'b_id', 'visibilidade', 'criado_por', 'ja_da_familia'],
  casal_nucleos: ['casal_id', 'nucleo_id'],
  casal_fases: ['casal_id', 'tipo', 'inicio_ano', 'inicio_mes', 'inicio_dia', 'fim_ano', 'fim_mes', 'fim_dia', 'ordem'],
  lacos_coracao: ['dono_id', 'pessoa_id', 'nome', 'papel', 'proximidade', 'privado'],
  lacos_resumidos: ['a_id', 'b_id', 'papel', 'criado_por'],
} as const satisfies Record<string, readonly string[]>;

export type TabelaParaOEspelho = keyof typeof COLUNAS_PARA_O_ESPELHO;
export const TABELAS_PARA_O_ESPELHO = Object.keys(COLUNAS_PARA_O_ESPELHO) as TabelaParaOEspelho[];

/** O que diz, dentro do arquivo, que ele é a cópia para o espelho, e não a cópia inteira. */
export const CONTEUDO_PARA_O_ESPELHO = 'familia-para-o-espelho';

export interface CopiaParaOEspelho {
  acervo: typeof MARCA_DO_ACERVO;
  conteudo: typeof CONTEUDO_PARA_O_ESPELHO;
  gerada_em: string;
  tabelas: Record<TabelaParaOEspelho, Record<string, unknown>[]>;
}

/**
 * O maior arquivo que o espelho aceita. A cópia para o espelho da família de hoje tem poucos KB, e uma família
 * dez vezes maior ainda caberia com folga; a cópia inteira do acervo (7,5 MB com o acervo cheio) passa longe.
 */
export const LIMITE_DA_COPIA_PARA_O_ESPELHO = 1024 * 1024;

/** "acervo-familia-2026-12-01.json", com o dia de São Paulo. */
export function nomeDoArquivoParaOEspelho(geradaEm: string): string {
  const dia = new Date(new Date(geradaEm).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return `acervo-familia-${dia}.json`;
}

export const RECADO_DA_COPIA_INTEIRA =
  'Este arquivo é a cópia inteira do acervo. Para o espelho, use “Baixar cópia para o espelho”, na Administração do site de verdade, e envie o arquivo que ele baixar.';
export const RECADO_DE_OUTRO_ARQUIVO = 'Este arquivo não é a cópia para o espelho. Use “Baixar cópia para o espelho”, na Administração do site de verdade.';

/**
 * Confere que o arquivo é a cópia para o espelho: a marca do acervo, a marca de conteúdo e só as tabelas da
 * família. Devolve o recado da recusa, ou nada quando o arquivo serve.
 */
export function recusaDaCopiaParaOEspelho(copia: unknown): string | null {
  const c = copia as Partial<CopiaParaOEspelho> & { tabelas?: Record<string, unknown> } | null;
  if (!c || typeof c !== 'object' || c.acervo !== MARCA_DO_ACERVO || !c.tabelas || typeof c.tabelas !== 'object') return RECADO_DE_OUTRO_ARQUIVO;
  const nomes = Object.keys(c.tabelas);
  // Com a marca do acervo e sem a de conteúdo, é a cópia inteira (a do Drive ou a de "Baixar cópia do acervo")
  if (c.conteudo === undefined) return RECADO_DA_COPIA_INTEIRA;
  if (c.conteudo !== CONTEUDO_PARA_O_ESPELHO) return RECADO_DE_OUTRO_ARQUIVO;
  if (nomes.some((n) => !(n in COLUNAS_PARA_O_ESPELHO)) || !Array.isArray(c.tabelas.integrantes)) return RECADO_DE_OUTRO_ARQUIVO;
  for (const [nome, linhas] of Object.entries(c.tabelas)) {
    if (!Array.isArray(linhas)) return RECADO_DE_OUTRO_ARQUIVO;
    const pode = new Set<string>(COLUNAS_PARA_O_ESPELHO[nome as TabelaParaOEspelho]);
    if (linhas.some((l) => !l || typeof l !== 'object' || Object.keys(l).some((coluna) => !pode.has(coluna)))) return RECADO_DE_OUTRO_ARQUIVO;
  }
  return null;
}
