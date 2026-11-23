// A regra 11 da guarda da produção, na parte da cópia para o espelho (sessão D1e; scripts/copia-para-o-espelho.mjs):
// a cópia que sai da produção para a homologação só lê as tabelas da família, coluna por coluna, sem texto
// escrito nem arquivo, só os administradores a baixam, e o espelho só aceita ela. Cada violação é dada à regra e
// precisa ser recusada.
import { describe, expect, it } from 'vitest';
import { GRAVAR_O_ESPELHO, LISTA, MONTAGEM, ROTA, ROTA_DO_ESPELHO, TABELAS_DA_FAMILIA, copiaParaOEspelhoErrada } from '../scripts/copia-para-o-espelho.mjs';
import { TABELAS_PARA_O_ESPELHO } from '../src/lib/copia-para-o-espelho';

// O nome do módulo fica numa variável porque o projeto não tem os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: string, codificacao: string) => string };
const fontes: Record<string, string> = Object.fromEntries([LISTA, MONTAGEM, ROTA, ROTA_DO_ESPELHO, GRAVAR_O_ESPELHO].map((a) => [a, readFileSync(a, 'utf8')]));
const trocar = (arquivo: string, de: string, para: string) => {
  const texto = fontes[arquivo]!;
  expect(texto, `${arquivo} precisa ter: ${de}`).toContain(de);
  return { ...fontes, [arquivo]: texto.replace(de, para) };
};
const recusa = (f: Record<string, string>) => (copiaParaOEspelhoErrada(f) as string[]).length > 0;

describe('a regra 11 da guarda: a cópia para o espelho', () => {
  it('o código de hoje passa, e a lista do site é a da guarda', () => {
    expect(copiaParaOEspelhoErrada(fontes)).toEqual([]);
    expect([...TABELAS_PARA_O_ESPELHO].sort()).toEqual([...TABELAS_DA_FAMILIA].sort());
  });

  it('recusa uma tabela que não é da família na lista', () => {
    expect(recusa(trocar(LISTA, "  lacos_resumidos: ['a_id', 'b_id', 'papel', 'criado_por'],", "  lacos_resumidos: ['a_id', 'b_id', 'papel', 'criado_por'],\n  memorias: ['id', 'ano'],"))).toBe(true);
    expect(recusa(trocar(LISTA, "  casal_nucleos: ['casal_id', 'nucleo_id'],", "  casal_nucleos: ['casal_id', 'nucleo_id'],\n  proximidades: ['dono_id'],"))).toBe(true);
  });

  it('recusa uma coluna de texto escrito ou de arquivo', () => {
    for (const coluna of ['sobre', 'retrato', 'texto', 'legenda', 'chave', 'titulo']) {
      expect(recusa(trocar(LISTA, "    'nome',\n", `    'nome',\n    '${coluna}',\n`)), coluna).toBe(true);
    }
  });

  it('recusa a lista escrita de um jeito que a guarda não lê', () => {
    expect(recusa(trocar(LISTA, "  nucleo_membros: ['nucleo_id', 'integrante_id', 'papel'],", '  nucleo_membros: COLUNAS_EXTRAS,'))).toBe(true);
    expect(recusa(trocar(LISTA, 'export const COLUNAS_PARA_O_ESPELHO = {', 'export const COLUNAS_PARA_O_ESPELHO = { ...OUTRAS,'))).toBe(true);
  });

  it('recusa a montagem que lê fora da lista', () => {
    expect(recusa(trocar(MONTAGEM, "`SELECT ${COLUNAS_PARA_O_ESPELHO[tabela].join(', ')} FROM ${tabela} ORDER BY rowid`", '`SELECT * FROM ${tabela} ORDER BY rowid`'))).toBe(true);
    expect(recusa(trocar(MONTAGEM, 'const resultados = await db.batch(leituras);', "const resultados = await db.batch([...leituras, db.prepare('SELECT texto FROM relatos')]);"))).toBe(true);
    expect(recusa(trocar(MONTAGEM, 'const resultados = await db.batch(leituras);', "const resultados = await db.batch([...leituras, db.prepare(`SELECT ${'id'} FROM ${'memorias'}`)]);"))).toBe(true);
    expect(recusa(trocar(MONTAGEM, "import { banco } from './ambiente';", "import { banco } from './ambiente';\nimport { listarMemorias } from './repositorio';"))).toBe(true);
    expect(recusa(trocar(MONTAGEM, 'const db = banco();', 'const db = banco();\n  await bucketDeFotos().get(\'x\');'))).toBe(true);
    expect(recusa(trocar(MONTAGEM, 'TABELAS_PARA_O_ESPELHO.map((tabela) =>', "[...TABELAS_PARA_O_ESPELHO, 'fotos'].map((tabela) =>"))).toBe(true);
  });

  it('um comentário não engana a guarda', () => {
    const lista = fontes[LISTA]!;
    // A mesma lista, com uma tabela proibida escondida num comentário: passa, porque comentário não conta
    expect(recusa({ ...fontes, [LISTA]: lista.replace("  casal_nucleos: ['casal_id', 'nucleo_id'],", "  // memorias: ['titulo'],\n  casal_nucleos: ['casal_id', 'nucleo_id'],") })).toBe(false);
    // E a forma combinada só num comentário, com a leitura de verdade diferente: recusa
    const montagem = fontes[MONTAGEM]!;
    const certa = "db.prepare(`SELECT ${COLUNAS_PARA_O_ESPELHO[tabela].join(', ')} FROM ${tabela} ORDER BY rowid`)";
    expect(recusa({ ...fontes, [MONTAGEM]: `// ${certa}\n${montagem.replace(certa, 'db.prepare(`SELECT * FROM ${tabela}`)')}` })).toBe(true);
  });

  it('recusa a rota aberta a quem não administra, ou que grava', () => {
    expect(recusa(trocar(ROTA, "  if (!locals.usuario.admin) return erro(403, 'Só os administradores baixam a cópia para o espelho.');\n", ''))).toBe(true);
    expect(recusa(trocar(ROTA, 'export const GET: APIRoute', 'export const POST: APIRoute = async () => new Response();\nexport const GET: APIRoute'))).toBe(true);
  });

  it('recusa o espelho que grava sem conferir que o arquivo é a cópia para o espelho', () => {
    expect(recusa(trocar(ROTA_DO_ESPELHO, '  if (recusa) return voltar(request, PAGINA, { erro: recusa });\n', ''))).toBe(true);
    expect(recusa(trocar(ROTA_DO_ESPELHO, 'if (arquivo.size > LIMITE_DA_COPIA_PARA_O_ESPELHO)', 'if (arquivo.size > 20 * 1024 * 1024)'))).toBe(true);
    expect(recusa(trocar(GRAVAR_O_ESPELHO, '  if (recusa) throw new Error(recusa);\n', ''))).toBe(true);
    expect(recusa(trocar(GRAVAR_O_ESPELHO, '  const recusa = recusaDaCopiaParaOEspelho(copia);\n  if (recusa) throw new Error(recusa);\n  const espelho = espelhar(copia);', '  const espelho = espelhar(copia);\n  const recusa = recusaDaCopiaParaOEspelho(copia);\n  if (recusa) throw new Error(recusa);'))).toBe(true);
  });

  it('recusa quando um arquivo some', () => {
    const { [MONTAGEM]: _, ...sem } = fontes;
    expect(recusa(sem)).toBe(true);
  });
});
