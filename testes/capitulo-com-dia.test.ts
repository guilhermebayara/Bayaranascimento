// Capítulo de período e época com dia opcional (pedido do Gui, 18/11/2026). A regra das datas do
// formulário e da escrita fica em src/lib/capitulos.ts; a migração 104 e a gravação rodam de verdade
// num SQLite em memória (testes/apoio/d1.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { dentroDoPeriodo, formatarPeriodo, lerPeriodoDoCapitulo, resumoDoCapitulo, type Capitulo } from '../src/lib/capitulos';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const vazio = { inicioAno: undefined, inicioMes: undefined, inicioDia: undefined, fimAno: undefined, fimMes: undefined, fimDia: undefined };
const ler = (campos: Partial<typeof vazio>, epoca = true) => lerPeriodoDoCapitulo({ ...vazio, ...campos }, 2026, epoca);

describe('as datas do capítulo por período, com o dia opcional', () => {
  it('aceita o ano só, o ano e o mês, e o ano, o mês e o dia', () => {
    expect(ler({ inicioAno: 2020 })).toEqual({ inicio: { ano: 2020, mes: null, dia: null }, fim: undefined });
    expect(ler({ inicioAno: 2020, inicioMes: 3, inicioDia: 16, fimAno: 2021, fimMes: 12 })).toEqual({
      inicio: { ano: 2020, mes: 3, dia: 16 },
      fim: { ano: 2021, mes: 12, dia: null },
    });
  });
  it('o dia sem mês e o dia que não existe são recusados, com a frase das outras datas', () => {
    expect(ler({ inicioAno: 2020, inicioDia: 5 })).toEqual({ erro: 'Para informar o dia, escolha também o mês.' });
    expect(ler({ inicioAno: 2021, inicioMes: 2, inicioDia: 29 })).toEqual({ erro: 'Fevereiro de 2021 tem 28 dias.' });
  });
  it('o início continua obrigatório, e o fim não pode vir antes dele, agora também pelo dia', () => {
    expect(ler({}, true)).toEqual({ erro: 'Uma época precisa de um ano de início.' });
    expect(ler({}, false)).toEqual({ erro: 'Um capítulo por período precisa de um ano de início.' });
    expect(ler({ inicioAno: 2020, inicioMes: 3, inicioDia: 16, fimAno: 2020, fimMes: 3, fimDia: 10 })).toEqual({ erro: 'O período não pode terminar antes de começar.' });
    // Só compara o que as duas sabem: "mar de 2020" e "2020" não se contradizem
    expect('erro' in ler({ inicioAno: 2020, inicioMes: 3, inicioDia: 16, fimAno: 2020 })).toBe(false);
    expect('erro' in ler({ inicioAno: 2020, inicioMes: 3, inicioDia: 16, fimAno: 2020, fimMes: 3 })).toBe(false);
  });
  it('ano fora do intervalo continua recusado', () => {
    expect(ler({ inicioAno: 1700 })).toEqual({ erro: 'Confira as datas. Os anos precisam estar entre 1800 e 2026.' });
  });
  it('o período escrito mostra o dia só quando pedido, e o capítulo reunido fica sem ele', () => {
    expect(formatarPeriodo({ ano: 2020, mes: 3, dia: 16 }, { ano: 2021, mes: 12 }, true, true)).toBe('16 de mar de 2020 a dez de 2021');
    expect(formatarPeriodo({ ano: 2020, mes: 3, dia: 16 }, null, true, true)).toBe('16 de mar de 2020 em diante');
    expect(formatarPeriodo({ ano: 2020, mes: 3, dia: 16 }, { ano: 2021, mes: 12, dia: 2 })).toBe('mar de 2020 a dez de 2021');
    const base = { titulo: 'X', abertura: null, dentroDe: null, visibilidade: 'todos', nucleos: [], criadoPor: 'gui', temas: [], pessoas: [], familias: [] } as const;
    const periodo: Capitulo = { ...base, id: 'p', modo: 'epoca', inicio: { ano: 2020, mes: 3, dia: 16 }, fim: null };
    const reunido: Capitulo = { ...base, id: 'r', modo: 'reunido', inicio: null, fim: null };
    const memorias = [{ ano: 2020, mes: 4, dia: 2, capitulos: ['r'] }];
    expect(resumoDoCapitulo(periodo, [], memorias).periodo).toBe('16 de mar de 2020 em diante');
    expect(resumoDoCapitulo(reunido, [], memorias).periodo).toBe('abr de 2020');
  });
  it('com o dia, a memória da véspera fica de fora e a do dia entra', () => {
    const inicio = { ano: 2020, mes: 3, dia: 16 };
    expect(dentroDoPeriodo({ ano: 2020, mes: 3, dia: 15 }, inicio, null)).toBe(false);
    expect(dentroDoPeriodo({ ano: 2020, mes: 3, dia: 16 }, inicio, null)).toBe(true);
    // A memória que só sabe o mês continua entrando, porque o mês toca o período
    expect(dentroDoPeriodo({ ano: 2020, mes: 3 }, inicio, null)).toBe(true);
  });
  it('o formulário pede o dia do começo e do fim, e avisa na hora o dia que não existe', () => {
    const ficha = readFileSync('src/components/FichaDoCapitulo.astro', 'utf8');
    expect(ficha).toContain('name={`${d.prefixo}Dia`}');
    expect(ficha).toContain("{ ano: 'inicioAno', mes: 'inicioMes', dia: 'inicioDia' }");
    expect(ficha).toContain("{ ano: 'fimAno', mes: 'fimMes', dia: 'fimDia' }");
  });
});

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'producao' as string, DB: undefined as unknown, FOTOS: undefined as unknown, DB_HOMOLOGA: undefined as unknown, FOTOS_HOMOLOGA: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('a migração 104 e a gravação do dia', async () => {
  vi.stubEnv('DEV', false);
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { MIGRACOES: migracoes, prepararBanco } = await import('../src/lib/servidor/banco');
  const repo = await import('../src/lib/servidor/repositorio');
  const antes = migracoes.slice(0, migracoes.findIndex((m) => m.id === '104-dia-dos-capitulos'));
  const gui = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };

  it('os capítulos de hoje passam pela migração sem perda, sem dia', async () => {
    // A 104 existe; as migrações que vieram depois dela rodam junto, em prepararBanco
    expect(antes.length).toBeGreaterThan(0);
    expect(antes.length).toBeLessThan(migracoes.length);
    banco.sqlite.exec(`CREATE TABLE _migracoes (id TEXT PRIMARY KEY, aplicada_em TEXT NOT NULL DEFAULT (datetime('now')))`);
    for (const m of antes) {
      for (const comando of m.sql) banco.sqlite.exec(comando);
      banco.sqlite.prepare('INSERT INTO _migracoes (id) VALUES (?)').run(m.id);
    }
    banco.sqlite.exec(`INSERT INTO capitulos (id, titulo, modo, inicio_ano, inicio_mes, fim_ano, fim_mes, criado_por) VALUES ('casa', 'Os anos de casa', 'epoca', 2020, 3, 2021, 12, 'gui')`);
    await prepararBanco();
    const linha = banco.sqlite.prepare(`SELECT titulo, inicio_ano, inicio_mes, inicio_dia, fim_ano, fim_mes, fim_dia FROM capitulos WHERE id = 'casa'`).get();
    expect(linha).toEqual({ titulo: 'Os anos de casa', inicio_ano: 2020, inicio_mes: 3, inicio_dia: null, fim_ano: 2021, fim_mes: 12, fim_dia: null });
  });

  it('o dia é gravado e lido de volta, e some quando o mês sai', async () => {
    const dados = { titulo: 'Os anos de casa', modo: 'epoca' as const, visibilidade: 'todos' as const, nucleos: [], temas: [], pessoas: [], familias: [] };
    await repo.salvarCapitulo('casa', { ...dados, inicio: { ano: 2020, mes: 3, dia: 16 }, fim: { ano: 2021, mes: 12, dia: 31 } }, gui, false);
    let capitulo = (await repo.listarCapitulos(gui)).find((c) => c.id === 'casa')!;
    expect(capitulo.inicio).toEqual({ ano: 2020, mes: 3, dia: 16 });
    expect(capitulo.fim).toEqual({ ano: 2021, mes: 12, dia: 31 });
    await repo.salvarCapitulo('casa', { ...dados, inicio: { ano: 2020, mes: null, dia: 16 } }, gui, false);
    capitulo = (await repo.listarCapitulos(gui)).find((c) => c.id === 'casa')!;
    expect(capitulo.inicio).toEqual({ ano: 2020, mes: null, dia: null });
    expect(capitulo.fim).toBeNull();
  });
});
