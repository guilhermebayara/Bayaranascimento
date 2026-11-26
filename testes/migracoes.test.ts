// A regra das migrações que apagam tabela com dependentes em cascata (scripts/migracoes.mjs), proposta no
// QA de 15/11/2026 e aprovada pelo Gui em 16/11, e, desde a sessão AC1 (26/11/2026), com dependentes que a
// exclusão anula (ON DELETE SET NULL) e com a chave posta por ALTER TABLE. A guarda da produção roda a mesma
// função antes de todo build.
import { describe, expect, it } from 'vitest';
import { cascatasPerigosas, lerMigracoes } from '../scripts/migracoes.mjs';

const banco = Object.values(import.meta.glob<string>('../src/lib/servidor/banco.ts', { query: '?raw', import: 'default', eager: true }))[0];

const com = (...migracoes: [string, string[]][]) =>
  `const MIGRACOES: Migracao[] = [\n${migracoes.map(([id, sql]) => `  {\n    id: '${id}',\n    sql: [\n${sql.map((s) => `      \`${s}\`,`).join('\n')}\n    ],\n  },`).join('\n')}\n];\n`;
const base: [string, string[]] = [
  '001',
  [
    'CREATE TABLE IF NOT EXISTS casais (id INTEGER PRIMARY KEY, a_id TEXT)',
    'CREATE TABLE IF NOT EXISTS casal_fases (id INTEGER PRIMARY KEY, casal_id INTEGER NOT NULL REFERENCES casais(id) ON DELETE CASCADE)',
  ],
];

describe('migrações e exclusão em cascata', () => {
  it('as migrações de verdade passam', () => {
    expect(lerMigracoes(banco).length).toBeGreaterThanOrEqual(12);
    expect(cascatasPerigosas(banco)).toEqual([]);
  });

  it('acusa apagar uma tabela com outra ainda dependendo dela', () => {
    const errada = com(base, ['002', ['CREATE TABLE casais_novo (id INTEGER PRIMARY KEY, a_id TEXT)', 'DROP TABLE casais', 'ALTER TABLE casais_novo RENAME TO casais']]);
    expect(cascatasPerigosas(errada)).toEqual([expect.stringContaining('002: DROP TABLE casais apagaria em cascata as linhas de casal_fases')]);
  });

  it('aceita refazer a tabela que depende antes, como na 012', () => {
    const certa = com(base, [
      '002',
      [
        'CREATE TABLE casais_novo (id INTEGER PRIMARY KEY, a_id TEXT)',
        'CREATE TABLE casal_fases_novo (id INTEGER PRIMARY KEY, casal_id INTEGER NOT NULL REFERENCES casais_novo(id) ON DELETE CASCADE)',
        'DROP TABLE casal_fases',
        'DROP TABLE casais',
        'ALTER TABLE casais_novo RENAME TO casais',
        'ALTER TABLE casal_fases_novo RENAME TO casal_fases',
      ],
    ]);
    expect(cascatasPerigosas(certa)).toEqual([]);
    // E a referência renomeada continua valendo para a próxima migração
    const depois = certa.replace('\n];', `\n  {\n    id: '003',\n    sql: [\n      \`DROP TABLE casais\`,\n    ],\n  },\n];`);
    expect(cascatasPerigosas(depois)).toEqual([expect.stringContaining('003: DROP TABLE casais')]);
  });

  const comFotos = (declaracao: string, refazer: string[]) =>
    com(
      ['001', ['CREATE TABLE IF NOT EXISTS memorias (id TEXT PRIMARY KEY)', `CREATE TABLE IF NOT EXISTS fotos (id INTEGER PRIMARY KEY, ${declaracao})`]],
      ['002', refazer],
    );
  const refazerMemorias = ['CREATE TABLE memorias_novo (id TEXT PRIMARY KEY)', 'DROP TABLE memorias', 'ALTER TABLE memorias_novo RENAME TO memorias'];

  it('acusa apagar uma tabela de que outra depende com ON DELETE SET NULL', () => {
    const errada = comFotos('memoria_id TEXT REFERENCES memorias(id) ON DELETE SET NULL', refazerMemorias);
    expect(cascatasPerigosas(errada)).toEqual([expect.stringContaining('002: DROP TABLE memorias anularia (ON DELETE SET NULL) as chaves de fotos')]);
  });

  it('acusa também a chave posta por ALTER TABLE ADD COLUMN, como fotos.relato_id da migração 022', () => {
    const base = com(['001', ['CREATE TABLE IF NOT EXISTS relatos (id INTEGER PRIMARY KEY)', 'CREATE TABLE IF NOT EXISTS fotos (id INTEGER PRIMARY KEY)']]);
    const acrescentada = (sql: string, refazer: string[]) => base.replace('\n];', `\n  {\n    id: '022',\n    sql: [\n      \`${sql}\`,\n    ],\n  },\n  {\n    id: '023',\n    sql: [\n${refazer.map((r) => `      \`${r}\`,`).join('\n')}\n    ],\n  },\n];`);
    const refazerRelatos = ['CREATE TABLE relatos_novo (id INTEGER PRIMARY KEY)', 'DROP TABLE relatos', 'ALTER TABLE relatos_novo RENAME TO relatos'];
    expect(cascatasPerigosas(acrescentada('ALTER TABLE fotos ADD COLUMN relato_id INTEGER REFERENCES relatos(id) ON DELETE SET NULL', refazerRelatos))).toEqual([expect.stringContaining('023: DROP TABLE relatos anularia (ON DELETE SET NULL) as chaves de fotos')]);
    expect(cascatasPerigosas(acrescentada('ALTER TABLE fotos ADD relato_id INTEGER REFERENCES relatos(id) ON DELETE CASCADE', refazerRelatos))).toEqual([expect.stringContaining('023: DROP TABLE relatos apagaria em cascata as linhas de fotos')]);
    // Uma coluna acrescentada sem chave não muda nada
    expect(cascatasPerigosas(acrescentada('ALTER TABLE fotos ADD COLUMN legenda TEXT', refazerRelatos))).toEqual([]);
  });

  it('acusa ON DELETE SET DEFAULT, e a chave com ON UPDATE antes do ON DELETE', () => {
    expect(cascatasPerigosas(comFotos('memoria_id TEXT DEFAULT "x" REFERENCES memorias(id) ON DELETE SET DEFAULT', refazerMemorias))).toEqual([expect.stringContaining('trocaria pelo padrão (ON DELETE SET DEFAULT) as chaves de fotos')]);
    expect(cascatasPerigosas(comFotos('memoria_id TEXT REFERENCES memorias(id) ON UPDATE CASCADE ON DELETE SET NULL', refazerMemorias))).toEqual([expect.stringContaining('anularia (ON DELETE SET NULL) as chaves de fotos')]);
  });

  it('acusa as duas ações quando a mesma tabela aponta duas vezes para o pai', () => {
    const errada = comFotos('memoria_id TEXT REFERENCES memorias(id) ON DELETE SET NULL, outra_id TEXT REFERENCES memorias(id) ON DELETE CASCADE', refazerMemorias);
    expect(cascatasPerigosas(errada)).toHaveLength(2);
  });

  it('aceita refazer antes a tabela que tem a chave que anula, e a chave sem ação de exclusão não conta', () => {
    const certa = comFotos('memoria_id TEXT REFERENCES memorias(id) ON DELETE SET NULL', [
      'CREATE TABLE memorias_novo (id TEXT PRIMARY KEY)',
      'CREATE TABLE fotos_novo (id INTEGER PRIMARY KEY, memoria_id TEXT REFERENCES memorias_novo(id) ON DELETE SET NULL)',
      'DROP TABLE fotos',
      'DROP TABLE memorias',
      'ALTER TABLE memorias_novo RENAME TO memorias',
      'ALTER TABLE fotos_novo RENAME TO fotos',
    ]);
    expect(cascatasPerigosas(certa)).toEqual([]);
    expect(cascatasPerigosas(comFotos('memoria_id TEXT REFERENCES memorias(id)', refazerMemorias))).toEqual([]);
  });
});
