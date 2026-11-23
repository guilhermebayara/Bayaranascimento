// A reserva e o escopo das rotas das cópias (itens 13a, 13b e 13c da revisão R-D1, sessão D1d;
// src/pages/api/copias-das-fotos.ts e copias-dos-retratos.ts). Regras que não podem falhar:
// - dois envios ao mesmo tempo para a mesma foto (ou o mesmo retrato), com o bucket demorando: o bucket
//   recebe as cópias de um pedido só, e o outro recebe 409 sem gravar nada, nem num formato diferente;
// - a rota só aceita o que o ajuste lista: a foto solta antiga e a foto removida, que acessoAFoto libera ao
//   administrador, são recusadas sem gravar nada;
// - a reserva de um pedido que morreu no meio vence sozinha, e a de um pedido que falhou sai da tabela.
// Testado com as rotas de verdade sobre o banco SQLite em memória (testes/apoio/d1.ts).
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import { medidaDaCopia } from '../src/lib/copias-das-fotos';

// Imagens de mentira: só o cabeçalho, que é o que a conferência lê
const png = (l: number, a: number) => {
  const b = new Uint8Array(40);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  b.set([(l >> 24) & 0xff, (l >> 16) & 0xff, (l >> 8) & 0xff, l & 0xff, (a >> 24) & 0xff, (a >> 16) & 0xff, (a >> 8) & 0xff, a & 0xff], 16);
  return b;
};
const webp = (l: number, a: number) => {
  const b = new Uint8Array(40);
  b.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
  b.set([...'WEBPVP8X'].map((c) => c.charCodeAt(0)), 8);
  b.set([(l - 1) & 0xff, ((l - 1) >> 8) & 0xff, ((l - 1) >> 16) & 0xff, (a - 1) & 0xff, ((a - 1) >> 8) & 0xff, ((a - 1) >> 16) & 0xff], 24);
  return b;
};
const jpeg = (l: number, a: number) => {
  const b = new Uint8Array(40);
  b.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, (a >> 8) & 0xff, a & 0xff, (l >> 8) & 0xff, l & 0xff]);
  return b;
};
const ORIGINAL: [number, number] = [4000, 3000];
const daFoto = (fazer: typeof webp, t: 'pequena' | 'media') => fazer(...medidaDaCopia(ORIGINAL[0], ORIGINAL[1], t));

const comSqlite = await temSqlite();
const gravadas: string[] = [];
let demora = 0;
let falharAoGravar = false;
const esperar = () => new Promise((r) => setTimeout(r, demora));
/** Um bucket de mentira que demora: cada leitura e cada gravação esperam, e cada gravação fica anotada */
const bucket = {
  list: async () => ({ objects: [], truncated: false }),
  delete: async () => undefined,
  head: async () => null,
  put: async (chave: string) => {
    await esperar();
    if (falharAoGravar) throw new Error('o bucket caiu');
    gravadas.push(chave);
  },
  get: async (chave: string) => {
    await esperar();
    return { arrayBuffer: async () => (chave.startsWith('retratos/') ? png(800, 800) : png(...ORIGINAL)).buffer };
  },
};
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = bucket;

describe.skipIf(!comSqlite)('a reserva e o escopo das rotas das cópias', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const copiasDasFotos = await import('../src/pages/api/copias-das-fotos');
  const copiasDosRetratos = await import('../src/pages/api/copias-dos-retratos');
  const repo = await import('../src/lib/servidor/repositorio');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;

  const sql = (texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...v);
  const linha = <T>(texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...v) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const gui = usuarioDe('gui');
  const tipo = linha<{ id: string }>('SELECT id FROM tipos LIMIT 1').id;
  const reservas = () => linha<{ n: number }>('SELECT COUNT(*) AS n FROM reservas_das_copias').n;

  const chaveDe = (n: number) => `2026/d1d0aaaa-0000-4000-8000-${String(n).padStart(12, '0')}.jpg`;
  const retratoDe = (n: number) => `d1d0bbbb-0000-4000-8000-${String(n).padStart(12, '0')}.jpg`;
  sql(`INSERT INTO memorias (id, titulo, ano, tipo, criada_por) VALUES ('d1d-de-todos', 'De todos', 2001, ?, 'gui')`, tipo);
  for (const n of [1, 2, 3, 4]) sql(`INSERT INTO fotos (memoria_id, chave, enviada_por) VALUES ('d1d-de-todos', ?, 'gui')`, chaveDe(n));
  // A foto removida da memória: o Gui enviou, e ainda a vê para poder devolvê-la
  sql(`INSERT INTO fotos (memoria_id, chave, enviada_por, removida_em, removida_por) VALUES ('d1d-de-todos', ?, 'gui', datetime('now'), 'gui')`, chaveDe(5));
  // A foto solta antiga, enviada por outra pessoa: os administradores a veem para conferir antes de apagar
  sql(`INSERT INTO fotos (chave, enviada_por, enviada_em) VALUES (?, 'elizete', datetime('now', '-40 days'))`, chaveDe(6));
  for (const n of [1, 2]) sql(`INSERT INTO integrantes (id, nome, tipo, retrato) VALUES (?, 'Retrato D1d', 'pessoa', ?)`, `d1d-retrato-${n}`, retratoDe(n));

  const enviarFoto = async (chave: string, formato: typeof webp = webp) => {
    const corpo = new FormData();
    corpo.set('chave', chave);
    corpo.set('pequena', new File([daFoto(formato, 'pequena') as BlobPart], 'pequena'));
    corpo.set('media', new File([daFoto(formato, 'media') as BlobPart], 'media'));
    const request = new Request('http://localhost/api/copias-das-fotos', { method: 'POST', headers: { Origin: 'http://localhost' }, body: corpo });
    return (await copiasDasFotos.POST({ request, locals: { usuario: gui } } as never)).status;
  };
  const enviarRetrato = async (chave: string) => {
    const corpo = new FormData();
    corpo.set('chave', chave);
    corpo.set('pequeno', new File([webp(400, 400) as BlobPart], 'pequeno.webp'));
    const request = new Request('http://localhost/api/copias-dos-retratos', { method: 'POST', headers: { Origin: 'http://localhost' }, body: corpo });
    return (await copiasDosRetratos.POST({ request, locals: { usuario: gui } } as never)).status;
  };

  it('dois envios da mesma foto ao mesmo tempo: o bucket recebe as cópias de um só', async () => {
    gravadas.length = 0;
    demora = 20;
    const status = await Promise.all([enviarFoto(chaveDe(1)), enviarFoto(chaveDe(1))]);
    demora = 0;
    expect(status.sort()).toEqual([201, 409]);
    expect(gravadas.sort()).toEqual([chaveDe(1).replace('.jpg', '.media.webp'), chaveDe(1).replace('.jpg', '.pequena.webp')]);
    expect(reservas()).toBe(0);
  });

  it('um em WebP e outro em JPEG: só um formato chega ao bucket, sem arquivo órfão', async () => {
    gravadas.length = 0;
    demora = 20;
    const status = await Promise.all([enviarFoto(chaveDe(2), webp), enviarFoto(chaveDe(2), jpeg), enviarFoto(chaveDe(2), webp)]);
    demora = 0;
    expect(status.filter((s) => s === 201)).toHaveLength(1);
    expect(status.filter((s) => s === 409)).toHaveLength(2);
    expect(gravadas).toHaveLength(2);
    const formato = linha<{ copias: string }>('SELECT copias FROM fotos WHERE chave = ?', chaveDe(2)).copias.includes('"webp"') ? 'webp' : 'jpg';
    expect(gravadas.every((g) => g.endsWith(`.${formato}`))).toBe(true);
  });

  it('dois envios do mesmo retrato ao mesmo tempo: o bucket recebe uma gravação só', async () => {
    gravadas.length = 0;
    demora = 20;
    const status = await Promise.all([enviarRetrato(retratoDe(1)), enviarRetrato(retratoDe(1))]);
    demora = 0;
    expect(status.sort()).toEqual([201, 409]);
    expect(gravadas).toEqual([`retratos/${retratoDe(1).replace('.jpg', '.pequeno.webp')}`]);
    expect(reservas()).toBe(0);
  });

  it('a foto removida e a foto solta antiga, que o administrador vê, não passam pela rota das cópias', async () => {
    // acessoAFoto libera as duas ao administrador (para devolver e para conferir antes de apagar)
    expect(await repo.acessoAFoto(gui, chaveDe(5))).not.toBeNull();
    expect(await repo.acessoAFoto(gui, chaveDe(6))).not.toBeNull();
    // O ajuste não as lista, e a rota recusa como uma foto que não existe
    const lista = await repo.listarFotosSemCopia(gui);
    expect(lista).not.toContain(chaveDe(5));
    expect(lista).not.toContain(chaveDe(6));
    gravadas.length = 0;
    expect(await enviarFoto(chaveDe(5))).toBe(404);
    expect(await enviarFoto(chaveDe(6))).toBe(404);
    expect(gravadas).toEqual([]);
    expect(linha<{ n: number }>('SELECT COUNT(*) AS n FROM fotos WHERE chave IN (?, ?) AND copias IS NOT NULL', chaveDe(5), chaveDe(6)).n).toBe(0);
    expect(reservas()).toBe(0);
  });

  it('a reserva de um pedido que morreu vence sozinha; a que ainda vale segura o outro pedido', async () => {
    sql(`INSERT INTO reservas_das_copias (alvo, codigo, em) VALUES (?, 'de-outro-pedido', datetime('now', '-1 minutes'))`, repo.alvoDaFoto(chaveDe(3)));
    gravadas.length = 0;
    expect(await enviarFoto(chaveDe(3))).toBe(409);
    expect(gravadas).toEqual([]);
    sql(`UPDATE reservas_das_copias SET em = datetime('now', '-${repo.MINUTOS_DA_RESERVA_DAS_COPIAS + 1} minutes') WHERE alvo = ?`, repo.alvoDaFoto(chaveDe(3)));
    expect(await enviarFoto(chaveDe(3))).toBe(201);
    expect(gravadas).toHaveLength(2);
    expect(reservas()).toBe(0);
  });

  it('um pedido que falha no meio solta a reserva, e o próximo consegue', async () => {
    falharAoGravar = true;
    await expect(enviarFoto(chaveDe(4))).rejects.toThrow('o bucket caiu');
    falharAoGravar = false;
    expect(reservas()).toBe(0);
    expect(linha<{ copias: string | null }>('SELECT copias FROM fotos WHERE chave = ?', chaveDe(4)).copias).toBeNull();
    gravadas.length = 0;
    expect(await enviarFoto(chaveDe(4))).toBe(201);
    expect(gravadas).toHaveLength(2);
  });

  it('o retrato que já não é de ninguém e o de outro: só o que o ajuste lista passa', async () => {
    expect(await repo.retratoEstaNoAjuste(gui, retratoDe(2))).toBe(true);
    expect(await repo.retratoEstaNoAjuste(gui, retratoDe(99))).toBe(false);
    expect(await repo.retratoEstaNoAjuste(gui, retratoDe(1))).toBe(false); // já tem cópia
    expect(await enviarRetrato(retratoDe(99))).toBe(404);
  });
});
