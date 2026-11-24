// O esquema que a cópia sustenta (D1f4, 24/11/2026; testes/apoio/esquema-sustentado.ts). No esquema de verdade,
// depois de todas as migrações e dos exemplos das prévias: nenhuma coluna gerada, nenhum índice único por
// expressão e nenhuma collation diferente da BINARY numa coluna de chave. Se aparecer, o teste falha com o
// recado para ajustar a cópia junto.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import { RECADO_DO_ESQUEMA, esquemaQueACopiaNaoSustenta } from './apoio/esquema-sustentado';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('o esquema que a cópia sustenta', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const { TABELA_DA_MARCA, TABELAS_FORA_DA_COPIA } = await import('../src/lib/servidor/marca-da-copia');

  it('o esquema de verdade não tem coluna gerada, índice único por expressão nem collation diferente da BINARY em chave', () => {
    expect(esquemaQueACopiaNaoSustenta(banco.sqlite, [TABELA_DA_MARCA, ...Object.keys(TABELAS_FORA_DA_COPIA)]), RECADO_DO_ESQUEMA).toEqual([]);
  });

  it('um esquema de exemplo com os três é pego, um a um', async () => {
    const exemplo = await criarD1();
    exemplo.sqlite.exec(`CREATE TABLE pessoas (id TEXT PRIMARY KEY COLLATE NOCASE, nome TEXT)`);
    exemplo.sqlite.exec(`CREATE TABLE fotos (id INTEGER PRIMARY KEY, dona TEXT REFERENCES pessoas(id), chave TEXT, grande INTEGER GENERATED ALWAYS AS (length(chave) > 10) VIRTUAL)`);
    exemplo.sqlite.exec(`CREATE UNIQUE INDEX fotos_chave_sem_caixa ON fotos (lower(chave))`);
    exemplo.sqlite.exec(`CREATE TABLE apelidos (id INTEGER PRIMARY KEY, apelido TEXT UNIQUE COLLATE NOCASE)`);
    // Um índice único com condição continua aceito: está nas tabelas do acervo, que a marca cobre
    exemplo.sqlite.exec(`CREATE TABLE pedidos (id INTEGER PRIMARY KEY, relato INTEGER, aberto INTEGER)`);
    exemplo.sqlite.exec(`CREATE UNIQUE INDEX pedidos_um_aberto ON pedidos (relato) WHERE aberto = 1`);
    const problemas = esquemaQueACopiaNaoSustenta(exemplo.sqlite);
    expect(problemas.some((p) => p.startsWith('fotos.grande: coluna gerada'))).toBe(true);
    expect(problemas.some((p) => p.includes('fotos_chave_sem_caixa é por expressão'))).toBe(true);
    expect(problemas.some((p) => p.startsWith('pessoas.id: a chave usa a collation NOCASE'))).toBe(true);
    expect(problemas.some((p) => p.startsWith('apelidos.apelido: a chave usa a collation NOCASE'))).toBe(true);
    expect(problemas.some((p) => p.startsWith('fotos → pessoas.id: a chave estrangeira usa a collation NOCASE'))).toBe(true);
    expect(problemas.some((p) => p.includes('pedidos'))).toBe(false);
  });
});
