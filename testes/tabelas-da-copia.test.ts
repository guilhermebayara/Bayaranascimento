// A lista das tabelas da cópia (TABELAS_DA_COPIA, src/lib/servidor/marca-da-copia.ts). No LIKE do SQLite, o "_"
// vale qualquer letra; o ESCAPE faz "sqlite_%" e "_cf_%" valerem só para as tabelas do SQLite e da Cloudflare
// (auditoria AC, B-10, sessão AC1). Sem ele, uma tabela de verdade como "acfb_x" ficaria fora da cópia sem aviso.
import { describe, expect, it } from 'vitest';
import { temSqlite } from './apoio/d1';
import { TABELAS_DA_COPIA, tabelaDaCopia } from '../src/lib/servidor/marca-da-copia';

const comSqlite = await temSqlite();

describe.skipIf(!comSqlite)('as tabelas que a cópia leva, com o "_" do LIKE escapado', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const nomes = async (sql = TABELAS_DA_COPIA) => {
    const banco = await criarD1();
    // As do SQLite (sqlite_sequence, por causa do AUTOINCREMENT) e a da Cloudflare ficam de fora; as outras, mesmo com o
    // nome parecido, entram
    banco.sqlite.exec(`CREATE TABLE contas (id INTEGER PRIMARY KEY AUTOINCREMENT)`);
    banco.sqlite.exec(`CREATE TABLE _cf_KV (key TEXT PRIMARY KEY)`);
    banco.sqlite.exec(`CREATE TABLE acfb_x (id INTEGER PRIMARY KEY)`);
    banco.sqlite.exec(`CREATE TABLE xcf_y (id INTEGER PRIMARY KEY)`);
    banco.sqlite.exec(`CREATE TABLE sqlitezinho (id INTEGER PRIMARY KEY)`);
    banco.sqlite.exec(`CREATE TABLE sqliteXabc (id INTEGER PRIMARY KEY)`);
    return (banco.sqlite.prepare(sql).all() as { name: string }[]).map((t) => t.name);
  };

  it('leva "acfb_x" e "sqlitezinho", onde o "_" sem escape pegaria qualquer letra', async () => {
    expect(await nomes()).toEqual(['acfb_x', 'contas', 'sqliteXabc', 'sqlitezinho', 'xcf_y']);
  });

  it('o que o SQLite e a Cloudflare criam fica de fora', async () => {
    const lista = await nomes();
    expect(lista).not.toContain('sqlite_sequence');
    expect(lista).not.toContain('_cf_KV');
  });

  it('sem o ESCAPE, as duas primeiras ficariam de fora: é o que o teste prova', async () => {
    const semEscape = TABELAS_DA_COPIA.replace(/ ESCAPE '\\'/g, '').replace(/\\_/g, '_');
    expect(semEscape).not.toBe(TABELAS_DA_COPIA);
    const lista = await nomes(semEscape);
    expect(lista).not.toContain('acfb_x');
    expect(lista).not.toContain('sqlitezinho');
  });

  it('a regra em JavaScript (tabelaDaCopia) diz o mesmo da lista', async () => {
    for (const nome of ['acfb_x', 'xcf_y', 'sqlitezinho', 'sqliteXabc', 'contas']) expect(tabelaDaCopia(nome), nome).toBe(true);
    for (const nome of ['sqlite_sequence', '_cf_KV']) expect(tabelaDaCopia(nome), nome).toBe(false);
  });
});
