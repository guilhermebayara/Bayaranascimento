// Um banco D1 de mentira, sobre o SQLite do próprio Node (node:sqlite), para os testes rodarem as
// consultas de verdade de src/lib/servidor/repositorio.ts sem o Cloudflare. Faz só o que o site usa:
// prepare, bind, all, first, run e batch. Os parâmetros numerados (?1, ?2) são do próprio SQLite.

// O pedaço do node:sqlite que o banco de teste usa. Declarado aqui porque o projeto não tem os tipos do
// Node (o tsc acusaria o import, como já acusa node:fs nos outros testes).
interface StatementSync {
  all(...valores: Valor[]): unknown[];
  get(...valores: Valor[]): unknown;
  run(...valores: Valor[]): { changes: number | bigint; lastInsertRowid: number | bigint };
}
export interface DatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): StatementSync;
}
const SQLITE = 'node:sqlite';
const abrirSqlite = async () => (await import(/* @vite-ignore */ SQLITE)) as { DatabaseSync: new (arquivo: string) => DatabaseSync };

type Valor = string | number | bigint | null | Uint8Array;
const paraSqlite = (v: unknown): Valor => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : (v as Valor));
const devolveLinhas = (sql: string) => /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);

export interface D1DeTeste {
  prepare(sql: string): ComandoDeTeste;
  batch(comandos: ComandoDeTeste[]): Promise<unknown[]>;
  exec(sql: string): Promise<void>;
  /** o SQLite por baixo, para os testes acrescentarem linhas direto */
  sqlite: DatabaseSync;
}

export class ComandoDeTeste {
  constructor(
    private readonly banco: DatabaseSync,
    readonly sql: string,
    private readonly valores: Valor[] = [],
  ) {}
  bind(...valores: unknown[]) {
    return new ComandoDeTeste(this.banco, this.sql, valores.map(paraSqlite));
  }
  private comando(): StatementSync {
    return this.banco.prepare(this.sql);
  }
  executar() {
    if (devolveLinhas(this.sql)) return { results: this.comando().all(...this.valores), success: true, meta: {} };
    const r = this.comando().run(...this.valores);
    return { results: [], success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid), size_after: 0 } };
  }
  async all() {
    return this.executar();
  }
  async run() {
    return this.executar();
  }
  async first(coluna?: string) {
    const linha = (this.comando().get(...this.valores) as Record<string, unknown> | undefined) ?? null;
    return linha && coluna ? (linha[coluna] ?? null) : linha;
  }
}

export async function criarD1(): Promise<D1DeTeste> {
  const { DatabaseSync } = await abrirSqlite();
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  return {
    sqlite,
    prepare: (sql) => new ComandoDeTeste(sqlite, sql),
    async batch(comandos) {
      // Como no D1: o lote é uma transação, ou entra inteiro, ou não entra. Um ponto de salvamento,
      // e não BEGIN, para funcionar também dentro do ponto que os testes usam para voltar o banco.
      sqlite.exec('SAVEPOINT lote');
      try {
        const resultados = comandos.map((c) => c.executar());
        sqlite.exec('RELEASE lote');
        return resultados;
      } catch (erro) {
        sqlite.exec('ROLLBACK TO lote');
        sqlite.exec('RELEASE lote');
        throw erro;
      }
    },
    async exec(sql) {
      sqlite.exec(sql);
    },
  };
}

/** O node:sqlite existe neste Node? (a partir do 22.13 sem opção nenhuma) */
export async function temSqlite(): Promise<boolean> {
  try {
    await abrirSqlite();
    return true;
  } catch {
    return false;
  }
}
