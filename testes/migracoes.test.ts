// A regra das migrações que apagam tabela com dependentes em cascata (scripts/migracoes.mjs), proposta no
// QA de 15/11/2026 e aprovada pelo Gui em 16/11. A guarda da produção roda a mesma função antes de todo build.
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
});
