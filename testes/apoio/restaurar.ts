// A restauração de uma cópia do acervo, como docs/copia-no-drive.md descreve: um banco vazio com a estrutura
// do de verdade (as tabelas, os índices e os gatilhos), e as linhas de cada tabela do arquivo inseridas com as
// chaves estrangeiras ligadas e conferidas no fim da transação. Devolve o erro da restauração, ou nada.
import type { DatabaseSync } from './d1';

const SQLITE = 'node:sqlite';

/** Restaura `copia` num banco novo com a estrutura de `origem`. Devolve o erro, ou null se entrou tudo. */
export async function restaurarCopia(
  origem: DatabaseSync,
  copia: { tabelas: Record<string, Record<string, unknown>[]> },
  conferir?: (banco: DatabaseSync) => void,
): Promise<string | null> {
  const { DatabaseSync } = (await import(/* @vite-ignore */ SQLITE)) as { DatabaseSync: new (arquivo: string) => DatabaseSync };
  const novo = new DatabaseSync(':memory:');
  novo.exec('PRAGMA foreign_keys = ON');
  const estrutura = origem
    .prepare(`SELECT type, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, rowid`)
    .all() as { type: string; sql: string }[];
  // As tabelas de sombra de um FTS5 (o índice da busca, busca_indice_*) nascem com a tabela virtual: criar as duas
  // daria "já existe"
  const virtuais = estrutura.filter((e) => /^CREATE VIRTUAL TABLE/i.test(e.sql)).map((e) => /^CREATE VIRTUAL TABLE\s+(?:IF NOT EXISTS\s+)?["'`]?(\w+)/i.exec(e.sql)?.[1]);
  const ehSombra = (sql: string) => virtuais.some((v) => v && new RegExp(`^CREATE TABLE\\s+["'\`]?${v}_(data|idx|content|docsize|config)\\b`, 'i').test(sql));
  for (const { sql } of estrutura) if (!ehSombra(sql)) novo.exec(sql);
  try {
    novo.exec('BEGIN');
    // A ordem das tabelas não importa: as chaves estrangeiras são conferidas no fim
    novo.exec('PRAGMA defer_foreign_keys = ON');
    for (const [tabela, linhas] of Object.entries(copia.tabelas)) {
      for (const linha of linhas) {
        const colunas = Object.keys(linha);
        if (colunas.length === 0) continue;
        novo
          .prepare(`INSERT INTO "${tabela}" (${colunas.map((c) => `"${c}"`).join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})`)
          .run(...colunas.map((c) => linha[c] as never));
      }
    }
    novo.exec('COMMIT');
  } catch (erro) {
    try {
      novo.exec('ROLLBACK');
    } catch {
      // A transação já voltou sozinha
    }
    return String(erro);
  }
  conferir?.(novo);
  return null;
}
