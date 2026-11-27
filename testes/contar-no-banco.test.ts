import { beforeAll, describe, expect, it, vi } from 'vitest';
import { temSqlite } from './apoio/d1';
import { acrescentarEscondido } from './apoio/casos-escondidos';
import { memoriaDoCapitulo, resumoDoCapitulo, sqlMemoriaDoCapitulo, type Capitulo } from '../src/lib/capitulos';
import { emOutrosAnos, memoriaParaContar, novidades, voceNoAcervo } from '../src/lib/painel';

const env = vi.hoisted(() => ({ AMBIENTE: 'previa', DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => {}, put: async () => {}, get: async () => null, head: async () => null };

describe.skipIf(!(await temSqlite()))('MEM-6: contar e escolher preserva a regra em TS', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const d1 = await criarD1();
  env.DB = d1;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  const repo = await import('../src/lib/servidor/repositorio');
  const { VISITANTE_DA_SALA } = await import('../src/lib/servidor/tv');
  const leitores: import('../src/lib/servidor/permissoes').Usuario[] = [];
  beforeAll(async () => {
    await prepararBanco();
    acrescentarEscondido(d1.sqlite, 'gui');
    const sql = d1.sqlite;
    for (const [id, ano, mes, dia] of [['sem-data', 0, null, null], ['ano', 1994, null, null], ['dia', 1994, 12, 25]] as const) {
      sql.prepare(`INSERT INTO memorias (id, titulo, ano, mes, dia, tipo, criada_por) VALUES (?, ?, ?, ?, ?, 'outro', 'gui')`).run(`mem6-${id}`, id, ano, mes, dia);
    }
    sql.prepare(`INSERT INTO capitulo_memorias (capitulo_id, memoria_id) VALUES ('natais-na-vo-vivica', 'mem6-ano')`).run();
    for (const pessoa of ['gui', 'elizete', 'lucas-magno']) {
      const i = (await repo.listarIntegrantes()).find((i) => i.id === pessoa)!;
      leitores.push({ pessoa, nome: i.nome, admin: i.admin, nucleos: i.nucleos });
    }
    leitores.push(VISITANTE_DA_SALA as typeof leitores[number]);
  });

  it('capítulo: SQL e TS nos dois sentidos, inclusive sem data, só ano, sem fim e com filhos', async () => {
    const capitulos = await repo.listarCapitulos(leitores[0]);
    const c = capitulos[0];
    const casos: Capitulo[] = [...capitulos,
      { ...c, id: 'sem-fim', modo: 'epoca', inicio: { ano: 1994, mes: 12, dia: 24 }, fim: null, pessoas: [], familias: [] },
      { ...c, id: 'periodo-com-dia', modo: 'epoca', inicio: { ano: 1994, mes: 12, dia: 24 }, fim: { ano: 1994, mes: 12, dia: 26 }, pessoas: [], familias: [] },
      { ...c, id: 'sem-inicio', modo: 'epoca', inicio: null, fim: null, pessoas: [], familias: [] },
    ];
    const linhas = d1.sqlite.prepare('SELECT id, ano, mes, dia FROM memorias').all() as { id: string; ano: number; mes: number | null; dia: number | null }[];
    const campo = (t: string, coluna: string, id: string) => (d1.sqlite.prepare(`SELECT ${coluna} AS id FROM ${t} WHERE memoria_id = ?`).all(id) as { id: string }[]).map((r) => r.id);
    const memorias = linhas.map((m) => ({ ...m, integrantes: campo('memoria_integrantes', 'integrante_id', m.id), nucleos: campo('memoria_nucleos', 'nucleo_id', m.id),
      capitulos: (d1.sqlite.prepare('SELECT cm.capitulo_id AS id FROM capitulo_memorias cm JOIN capitulos c ON c.id = cm.capitulo_id WHERE cm.memoria_id = ? AND c.excluido_em IS NULL').all(m.id) as { id: string }[]).map((r) => r.id) }));
    for (const capitulo of casos) for (const comFilhos of [false, true]) {
      const filhos = comFilhos ? capitulos.filter((c) => c.dentroDe === capitulo.id).map((c) => c.id) : [];
      const sql = (d1.sqlite.prepare(`SELECT m.id FROM memorias m WHERE ${sqlMemoriaDoCapitulo('m', '?1', '?2')}`).all(JSON.stringify(capitulo), JSON.stringify(filhos)) as { id: string }[]).map((r) => r.id).sort();
      const ts = memorias.filter((m) => memoriaDoCapitulo(m, capitulo, filhos)).map((m) => m.id).sort();
      expect(sql, `${capitulo.id}, filhos=${comFilhos}`).toEqual(ts);
    }
    const reunido = capitulos.find((c) => c.id === 'natais')!;
    const semData = memorias.find((m) => m.id === 'mem6-sem-data')!;
    expect(memoriaDoCapitulo(semData, casos.find((c) => c.id === 'sem-fim')!)).toBe(false);
    const soAno = memorias.find((m) => m.id === 'mem6-ano')!;
    expect(memoriaDoCapitulo(soAno, reunido)).toBe(false);
    expect(memoriaDoCapitulo(soAno, reunido, ['natais-na-vo-vivica'])).toBe(true);
    expect(memoriaDoCapitulo(soAno, casos.find((c) => c.id === 'periodo-com-dia')!)).toBe(true);
  });

  it('GROUP BY de pessoas e tipos, cartas, resumos e memórias dos capítulos equivalem à lista anterior', async () => {
    for (const u of leitores) {
      const memorias = await repo.listarMemorias(u);
      const pessoas = new Map<string, number>(), tipos = new Map<string, number>();
      for (const m of memorias) {
        tipos.set(m.tipo, (tipos.get(m.tipo) ?? 0) + 1);
        for (const id of m.integrantes) pessoas.set(id, (pessoas.get(id) ?? 0) + 1);
      }
      expect(await repo.contarMemoriasPorPessoa(u), u.pessoa).toEqual(pessoas);
      expect(await repo.contarMemoriasPorTipo(u), u.pessoa).toEqual(tipos);
      expect(await repo.fotosDaCarta(u), u.pessoa).toEqual(memorias.filter((m) => m.integrantes.includes(u.pessoa) && m.fotos.length).reverse().slice(0, 3));
      const capitulos = await repo.listarCapitulos(u), resumos = await repo.resumosDosCapitulos(u, capitulos);
      for (const c of capitulos) {
        const { datas, ...resumo } = resumos.get(c.id)!;
        expect(resumo, `${u.pessoa} ${c.id}`).toEqual(resumoDoCapitulo(c, capitulos, memorias));
        for (const comFilhos of [false, true]) {
          const filhos = comFilhos ? capitulos.filter((x) => x.dentroDe === c.id).map((x) => x.id) : [];
          expect(await repo.memoriasDoCapitulo(u, c, capitulos, comFilhos)).toEqual(memorias.filter((m) => memoriaDoCapitulo(m, c, filhos)));
        }
      }
    }
  });

  it('os cartões e as contas do Início equivalem ao painel anterior em diferentes dias e visitas', async () => {
    for (const u of leitores) {
      const memorias = await repo.listarMemorias(u), comRascunhos = await repo.listarMemorias(u, { comRascunhos: true });
      for (const hoje of [{ ano: 2026, mes: 12, dia: 25 }, { ano: 2026, mes: 1, dia: 1 }, { ano: 2026, mes: 11, dia: 26 }]) for (const desde of [null, '2026-11-20 12:00:00', '2099-01-01 00:00:00']) {
        const dados = await repo.memoriasDoInicio(u, desde, hoje);
        const minhas = [...memorias].reverse().filter((m) => m.integrantes.includes(u.pessoa));
        const novo = novidades(memorias, [], desde, u.pessoa);
        expect(dados.total).toBe(memorias.length);
        expect(dados.minhas).toBe(minhas.length);
        expect(dados.fotos).toEqual(voceNoAcervo(minhas).comFoto);
        expect(dados.novas).toBe(novo.memorias.length);
        expect(dados.naMesa).toEqual(novo.memorias.slice(0, 2));
        expect(dados.rascunhos.total).toBe(comRascunhos.filter((m) => m.situacao === 'rascunho').length);
        expect(dados.paraContar).toEqual(memoriaParaContar(memorias, await repo.memoriasComRelatoDe(u.pessoa), u.pessoa, new Set(novo.memorias.map((m) => m.id))));
        expect(dados.outrosAnos).toEqual(emOutrosAnos(memorias, hoje));
      }
    }
  });
});
