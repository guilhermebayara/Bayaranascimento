// "Baixar cópia para o espelho": só as tabelas e as colunas da família que o espelho lê (src/lib/copia-para-o-espelho.ts).
//
// As consultas saem só da lista COLUNAS_PARA_O_ESPELHO, coluna por coluna: nenhuma tabela ou coluna fora dela é
// lida aqui. A guarda da produção (regra 11) confere esta forma, e testes/copia-para-o-espelho.test.ts, o
// conteúdo. Um lote só, de oito leituras pequenas.
import { banco } from './ambiente';
import { MARCA_DO_ACERVO } from '../copia-em-partes';
import { COLUNAS_PARA_O_ESPELHO, CONTEUDO_PARA_O_ESPELHO, TABELAS_PARA_O_ESPELHO, nomeDoArquivoParaOEspelho, type CopiaParaOEspelho } from '../copia-para-o-espelho';

export async function montarCopiaParaOEspelho(): Promise<CopiaParaOEspelho> {
  const db = banco();
  const leituras = TABELAS_PARA_O_ESPELHO.map((tabela) => db.prepare(`SELECT ${COLUNAS_PARA_O_ESPELHO[tabela].join(', ')} FROM ${tabela} ORDER BY rowid`));
  const resultados = await db.batch(leituras);
  const tabelas = Object.fromEntries(TABELAS_PARA_O_ESPELHO.map((tabela, i) => [tabela, (resultados[i]?.results ?? []) as Record<string, unknown>[]])) as CopiaParaOEspelho['tabelas'];
  return { acervo: MARCA_DO_ACERVO, conteudo: CONTEUDO_PARA_O_ESPELHO, gerada_em: new Date().toISOString(), tabelas };
}

export async function respostaDaCopiaParaOEspelho(): Promise<Response> {
  const copia = await montarCopiaParaOEspelho();
  return new Response(JSON.stringify(copia), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomeDoArquivoParaOEspelho(copia.gerada_em)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
