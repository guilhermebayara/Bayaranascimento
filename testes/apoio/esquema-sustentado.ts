// O esquema que a cópia sustenta (D1f4, 24/11/2026; regra em docs/copia-no-drive.md, "A rede no fim da cópia").
//
// A rede no fim da cópia (conferirCopia, em src/lib/copia-em-partes.ts, e conferirArquivo, em
// scripts/copia-no-drive.gs) compara as chaves valor a valor, sem collation, e só pelas colunas; e o arquivo
// guarda cada coluna como veio. Três coisas no esquema escapariam dela:
// - uma coluna gerada (a restauração falha com "cannot INSERT into generated column");
// - um índice único por expressão (fica fora da régua);
// - uma collation diferente da BINARY numa coluna de chave (a régua compara sem ela: "A" e "a" seriam diferentes
//   para a régua e iguais para o banco, ou o contrário, e as quatro passadas seriam descartadas).
// Esta função acha cada uma, nas tabelas da cópia. Lista vazia: a cópia sustenta o esquema.
import type { DatabaseSync } from './d1';

export function esquemaQueACopiaNaoSustenta(banco: DatabaseSync, fora: readonly string[] = []): string[] {
  const problemas: string[] = [];
  const tabelas = (banco.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'`).all() as { name: string }[])
    .map((t) => t.name)
    .filter((t) => !fora.includes(t));
  for (const t of tabelas) {
    for (const c of banco.prepare(`SELECT name, hidden FROM pragma_table_xinfo(?) WHERE hidden IN (2, 3)`).all(t) as { name: string }[]) {
      problemas.push(`${t}.${c.name}: coluna gerada; a restauração não aceita gravar nela.`);
    }
    for (const indice of banco.prepare(`SELECT name, origin, partial FROM pragma_index_list(?) WHERE "unique" = 1`).all(t) as { name: string; origin: string; partial: number }[]) {
      const chaves = banco.prepare(`SELECT cid, name, coll FROM pragma_index_xinfo(?) WHERE key = 1`).all(indice.name) as { cid: number; name: string | null; coll: string }[];
      if (chaves.some((k) => k.cid === -2)) problemas.push(`${t}: o índice único ${indice.name} é por expressão; a régua da cópia não o confere.`);
      for (const k of chaves) if (k.coll && k.coll.toUpperCase() !== 'BINARY') problemas.push(`${t}.${k.name}: a chave usa a collation ${k.coll}; a régua da cópia compara sem ela.`);
    }
    // A chave estrangeira compara pela collation da coluna de lá
    for (const fk of banco.prepare(`SELECT "table" AS para, "to" AS ate FROM pragma_foreign_key_list(?)`).all(t) as { para: string; ate: string | null }[]) {
      if (!fk.ate) continue;
      const sql = (banco.prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`).get(fk.para) as { sql: string } | undefined)?.sql ?? '';
      const coluna = new RegExp(`["\`]?${fk.ate}["\`]?\\s+[^,]*\\bCOLLATE\\s+(\\w+)`, 'i').exec(sql);
      if (coluna && coluna[1]!.toUpperCase() !== 'BINARY') problemas.push(`${t} → ${fk.para}.${fk.ate}: a chave estrangeira usa a collation ${coluna[1]}; a régua da cópia compara sem ela.`);
    }
  }
  return problemas;
}

/** O recado do teste: o que fazer quando o esquema muda assim. */
export const RECADO_DO_ESQUEMA =
  'O esquema passou a ter algo que a cópia não sustenta. Ajuste a cópia junto: a régua (montarEsquema, em src/lib/servidor/copia.ts), a conferência (conferirCopia, em src/lib/copia-em-partes.ts, e conferirArquivo, em scripts/copia-no-drive.gs) e a restauração; ou troque o esquema. Regra em docs/copia-no-drive.md, "A rede no fim da cópia".';
