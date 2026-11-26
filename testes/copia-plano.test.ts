// MEM-4: a linha da marca não pode percorrer a tabela de novo a cada página.
import { describe, expect, it, vi } from 'vitest';
import { ComandoDeTeste, temSqlite } from './apoio/d1';
import { linhasPorParte } from '../src/lib/copia-em-partes';

const env = vi.hoisted(() => ({ AMBIENTE: 'previa', DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));

describe.skipIf(!(await temSqlite()))('o plano da parte da cópia', async () => {
  const { abrirBancoDeExemplo } = await import('./apoio/banco-de-exemplo');
  const { banco, sql } = await abrirBancoDeExemplo(env);
  const { montarParte, montarCopia } = await import('../src/lib/servidor/copia');
  const preparar = banco.prepare.bind(banco);
  // Mais de uma página e um buraco entre rowids, além das tabelas vazias do exemplo.
  for (let i = 0; i < linhasPorParte('envios') + 3; i++) sql('INSERT INTO envios (codigo) VALUES (?)', `plano-${i}`);
  sql("DELETE FROM envios WHERE codigo = 'plano-10'");

  type Passo = { id: number; parent: number; detail: string };
  type Instrucao = { addr: number; opcode: string; p1: number; p2: number };

  it.each([null, 10])('não percorre a tabela fora da página (depois = %s)', async (depois) => {
    let consulta = '';
    const espia = vi.spyOn(banco, 'prepare').mockImplementation((texto) => {
      consulta = texto;
      return preparar(texto);
    });
    try {
      await montarParte('envios', depois, ['envios']);
    } finally {
      espia.mockRestore();
    }
    const valores = depois === null ? [] : [depois];
    const plano = banco.sqlite.prepare(`EXPLAIN QUERY PLAN ${consulta}`).all(...valores) as Passo[];
    const porId = new Map(plano.map((p) => [p.id, p]));
    const ancestrais = (passo: Passo) => {
      const pais: Passo[] = [];
      for (let pai = porId.get(passo.parent); pai; pai = porId.get(pai.parent)) pais.push(pai);
      return pais;
    };
    const scans = plano.filter((p) => /^SCAN (envios|x)\b/.test(p.detail));
    expect(scans.length).toBeGreaterThan(0);
    for (const passo of scans) {
      const pais = ancestrais(passo);
      if (pais.some((p) => p.detail === 'LEFT-MOST SUBQUERY')) continue; // a página, limitada
      // Um SCAN x direto, como o LEFT JOIN envios x ON 0 antigo, lê a tabela inteira.
      // Com LIMIT 0, x é uma tabela temporária vazia. O plano ainda imprime SCAN envios
      // dentro de MATERIALIZE x; o bytecode abaixo prova que esse trecho nunca é executado.
      expect(plano.some((p) => p.detail === 'MATERIALIZE x'), passo.detail).toBe(true);
      expect(passo.detail === 'SCAN x LEFT-JOIN' || pais.some((p) => p.detail === 'MATERIALIZE x'), passo.detail).toBe(true);
    }
    const programa = banco.sqlite.prepare(`EXPLAIN ${consulta}`).all(...valores) as Instrucao[];
    const { rootpage } = banco.sqlite.prepare("SELECT rootpage FROM sqlite_master WHERE name = 'envios'").get() as { rootpage: number };
    const leituras = programa.filter((p) => p.opcode === 'OpenRead' && p.p2 === rootpage);
    const alcancaveis = leituras.filter((p) => !programa.some((salto, i) =>
      salto.opcode === 'Goto' && salto.addr < p.addr && salto.p2 > p.addr &&
      programa[i - 1]?.opcode === 'Integer' && programa[i - 1]?.p1 === 0 &&
      programa.find((fim) => fim.addr === salto.p2)?.opcode === 'Return',
    ));
    expect(alcancaveis, 'só a página pode abrir a tabela; LIMIT 0 pula a outra abertura').toHaveLength(1);
  });

  it('a cópia inteira e cada resultado raw são iguais byte a byte aos do LEFT JOIN antigo', async () => {
    const resultados: string[][] = [[], []];
    let rodada = 0;
    let antigas = 0;
    const espia = vi.spyOn(banco, 'prepare').mockImplementation((texto) => {
      // Reproduz apenas o JOIN da base bfcd3a9, mantendo o banco e todo o resto da montagem.
      const consulta = rodada === 0 ? texto.replace(/LEFT JOIN \(SELECT \* FROM ("(?:[^"]|"")+") LIMIT 0\) x ON 0/, (_, tabela) => {
        antigas++;
        return `LEFT JOIN ${tabela} x ON 0`;
      }) : texto;
      return preparar(consulta);
    });
    const raw = ComandoDeTeste.prototype.raw;
    const espiaRaw = vi.spyOn(ComandoDeTeste.prototype, 'raw').mockImplementation(async function (opcoes) {
      const r = await raw.call(this, opcoes);
      resultados[rodada]!.push(JSON.stringify(r));
      return r;
    });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-26T12:00:00.000Z'));
    try {
      const antes = JSON.stringify(await montarCopia());
      rodada = 1;
      const depois = JSON.stringify(await montarCopia());
      expect(antigas).toBeGreaterThan(0);
      expect(resultados[0]).toHaveLength(antigas);
      expect(depois).toBe(antes);
      expect(resultados[1]).toEqual(resultados[0]);
    } finally {
      vi.useRealTimers();
      espiaRaw.mockRestore();
      espia.mockRestore();
    }
  });
});
