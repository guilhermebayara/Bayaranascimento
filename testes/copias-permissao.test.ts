// Quem vê a cópia é exatamente quem vê a foto (sessão D1b, 23/11/2026). A cópia pequena e a média passam
// pela rota da original (src/pages/fotos/[...chave].ts), com a conferência da original: para cada pessoa do
// acervo de exemplo, as três respostas saem iguais (a mesma recusa para quem não vê), inclusive na memória
// restrita a famílias, no rascunho, na lixeira, na foto removida, na foto solta e na foto de um relato em
// rascunho. E o cabeçalho de 7 dias só onde o Gui decidiu (decisão 3, docs/briefs/desempenho.md): foto de
// memória publicada e retrato de quem não está na lixeira. Rascunho, lixeira e áudio continuam como antes.
// Testado com as rotas de verdade sobre o banco SQLite em memória (testes/apoio/d1.ts).
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import { gravarCopias, type Copias } from '../src/lib/copias-das-fotos';

const comSqlite = await temSqlite();
const lidas: string[] = [];
/** Um bucket de mentira: todo arquivo existe, e cada leitura fica anotada */
const bucket = {
  list: async () => ({ objects: [], truncated: false }),
  delete: async () => undefined,
  put: async () => undefined,
  head: async () => null,
  get: async (chave: string) => {
    lidas.push(chave);
    return {
      httpEtag: `"${chave}"`,
      body: new Uint8Array([1, 2, 3]),
      writeHttpMetadata: (h: Headers) => h.set('Content-Type', chave.endsWith('.webp') ? 'image/webp' : 'image/jpeg'),
    };
  },
};
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = bucket;

describe.skipIf(!comSqlite)('a cópia responde igual à original, para cada pessoa', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const fotos = await import('../src/pages/fotos/[...chave]');
  const retratos = await import('../src/pages/retratos/[...chave]');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;

  const sql = (texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...v);
  const linha = <T>(texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...v) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  // Todas as pessoas do acervo de exemplo, com e sem família, administradores ou não
  const pessoas = (banco.sqlite.prepare(`SELECT id FROM integrantes WHERE excluida_em IS NULL ORDER BY id`).all() as { id: string }[]).map((p) => usuarioDe(p.id));
  const nucleo = linha<{ nucleo_id: string }>(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = 'giovanna' AND papel = 'membro'`).nucleo_id;

  // Os casos, cada um numa memória própria, com fotos de chave própria e as cópias anotadas
  const copias: Copias = { formato: 'webp', pequena: [480, 640], media: [1200, 1600], original: [1800, 2400], bytes: 1000 };
  const chave = (n: number) => `2026/d1b00000-0000-4000-8000-${String(n).padStart(12, '0')}.jpg`;
  const memoria = (id: string, campos: { situacao?: string; visibilidade?: string; criadaPor?: string; lixeira?: boolean }) =>
    sql(
      `INSERT INTO memorias (id, titulo, ano, tipo, situacao, visibilidade, criada_por, excluida_em) VALUES (?, ?, 2001, 'festa', ?, ?, ?, ?)`,
      id,
      `Caso ${id}`,
      campos.situacao ?? 'publicada',
      campos.visibilidade ?? 'todos',
      campos.criadaPor ?? 'gui',
      campos.lixeira ? '2026-11-20 10:00:00' : null,
    );
  const foto = (n: number, memoriaId: string | null, campos: { por?: string; removida?: boolean; relato?: number; dias?: number } = {}) =>
    sql(
      `INSERT INTO fotos (memoria_id, chave, enviada_por, relato_id, removida_em, removida_por, copias, enviada_em) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`,
      memoriaId,
      chave(n),
      campos.por ?? 'giovanna',
      campos.relato ?? null,
      campos.removida ? '2026-11-21 10:00:00' : null,
      campos.removida ? 'giovanna' : null,
      gravarCopias(copias),
      `-${campos.dias ?? 1} days`,
    );

  memoria('d1b-publica', {});
  foto(1, 'd1b-publica');
  memoria('d1b-restrita', { visibilidade: 'nucleos' });
  sql('INSERT INTO memoria_nucleos (memoria_id, nucleo_id) VALUES (?, ?)', 'd1b-restrita', nucleo);
  foto(2, 'd1b-restrita');
  memoria('d1b-rascunho', { situacao: 'rascunho', criadaPor: 'giovanna' });
  foto(3, 'd1b-rascunho');
  memoria('d1b-lixeira', { lixeira: true });
  foto(4, 'd1b-lixeira');
  foto(5, 'd1b-publica', { removida: true });
  foto(6, null, { por: 'elizete' });
  foto(7, null, { por: 'elizete', dias: 40 });
  sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES ('d1b-publica', 'elizete', 'elizete', 'Ainda escrevendo', 'rascunho')`);
  const rascunhoDeRelato = linha<{ id: number }>(`SELECT id FROM relatos WHERE memoria_id = 'd1b-publica' AND por = 'elizete'`).id;
  foto(8, null, { por: 'elizete', relato: rascunhoDeRelato });
  sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, so_para_nucleos) VALUES ('d1b-publica', 'vo-bela', 'giovanna', 'Só para a família', 'publicada', ?)`, JSON.stringify([nucleo]));
  const relatoRestrito = linha<{ id: number }>(`SELECT id FROM relatos WHERE memoria_id = 'd1b-publica' AND por = 'vo-bela'`)?.id;
  if (relatoRestrito) foto(9, 'd1b-publica', { relato: relatoRestrito });
  const CASOS = relatoRestrito ? 9 : 8;

  const pedir = async (quem: Usuario, caminho: string) => {
    const request = new Request(`http://localhost/fotos/${caminho}`);
    const r = await fotos.GET({ params: { chave: caminho }, request, locals: { usuario: quem } } as never);
    return { status: r.status, cache: r.headers.get('Cache-Control') };
  };

  it('para cada pessoa e cada caso, a pequena e a média respondem como a original', async () => {
    let vistas = 0;
    let recusadas = 0;
    for (const quem of pessoas) {
      for (let n = 1; n <= CASOS; n++) {
        const original = await pedir(quem, chave(n));
        expect(await pedir(quem, `pequena/${chave(n)}`), `${quem.pessoa}, caso ${n}, pequena`).toEqual(original);
        expect(await pedir(quem, `media/${chave(n)}`), `${quem.pessoa}, caso ${n}, média`).toEqual(original);
        if (original.status === 200) vistas++;
        else recusadas++;
      }
    }
    // O teste só vale se houver dos dois: fotos vistas e fotos recusadas
    expect(vistas).toBeGreaterThan(pessoas.length);
    expect(recusadas).toBeGreaterThan(pessoas.length);
  });

  it('quem não vê recebe a mesma recusa de uma foto que não existe, sem nada lido do bucket', async () => {
    const elizete = usuarioDe('elizete');
    lidas.length = 0;
    // O rascunho da Giovanna: a Elizete não vê a original nem as cópias
    for (const caminho of [chave(3), `pequena/${chave(3)}`, `media/${chave(3)}`, chave(99), `pequena/${chave(99)}`]) expect((await pedir(elizete, caminho)).status, caminho).toBe(404);
    expect(lidas).toEqual([]);
  });

  it('a cópia é lida no lugar dela, e a original nunca é pedida com o nome da cópia', async () => {
    const gui = usuarioDe('gui');
    lidas.length = 0;
    await pedir(gui, `pequena/${chave(1)}`);
    await pedir(gui, `media/${chave(1)}`);
    await pedir(gui, chave(1));
    expect(lidas).toEqual([chave(1).replace('.jpg', '.pequena.webp'), chave(1).replace('.jpg', '.media.webp'), chave(1)]);
    // Um caminho com o nome da cópia não passa como original
    expect((await pedir(gui, chave(1).replace('.jpg', '.pequena.webp'))).status).toBe(404);
  });

  it('o cabeçalho de 7 dias só na foto de memória publicada; rascunho, lixeira, removida, solta e relato em rascunho como antes', async () => {
    const SETE = 'private, max-age=604800';
    const ANTES = 'private, no-cache';
    const esperado: Record<number, [string, string]> = {
      1: ['gui', SETE],
      2: ['giovanna', SETE],
      3: ['giovanna', ANTES],
      5: ['giovanna', ANTES],
      6: ['elizete', ANTES],
      7: ['gui', ANTES],
      8: ['elizete', ANTES],
    };
    for (const [n, [pessoa, cache]] of Object.entries(esperado)) {
      for (const tamanho of ['', 'pequena/', 'media/']) {
        const r = await pedir(usuarioDe(pessoa), `${tamanho}${chave(Number(n))}`);
        expect(r, `caso ${n}, ${pessoa}, ${tamanho || 'original'}`).toEqual({ status: 200, cache });
      }
    }
    // A lixeira: ninguém vê pela rota, como antes
    for (const quem of pessoas) expect((await pedir(quem, chave(4))).status).toBe(404);
  });

  it('o retrato fica 7 dias no aparelho; o de quem está na lixeira continua conferido a cada uso', async () => {
    const r1 = 'aaaaaaaa-d1b0-4000-8000-000000000001.jpg';
    const r2 = 'aaaaaaaa-d1b0-4000-8000-000000000002.jpg';
    sql(`UPDATE integrantes SET retrato = ? WHERE id = 'elizete'`, r1);
    sql(`INSERT INTO integrantes (id, nome, tipo, retrato, excluida_em) VALUES ('d1b-na-lixeira', 'Na Lixeira', 'pessoa', ?, '2026-11-20 10:00:00')`, r2);
    const pedirRetrato = async (caminho: string) => {
      const request = new Request(`http://localhost/retratos/${caminho}`);
      const r = await retratos.GET({ params: { chave: caminho }, request, locals: { usuario: usuarioDe('gui') } } as never);
      return { status: r.status, cache: r.headers.get('Cache-Control'), vary: r.headers.get('Vary') };
    };
    expect(await pedirRetrato(r1)).toEqual({ status: 200, cache: 'private, max-age=604800', vary: 'Cookie' });
    // Quem está na lixeira: ou o retrato nem é entregue, ou é conferido a cada uso; nunca guardado
    const naLixeira = await pedirRetrato(r2);
    if (naLixeira.status === 200) expect(naLixeira.cache).toBe('private, no-cache');
    else expect(naLixeira.status).toBe(404);
  });
});

describe('os áudios ficam como estão', () => {
  const fontes: Record<string, string> = Object.fromEntries(
    Object.entries(import.meta.glob<string>('../src/pages/**/*.ts', { query: '?raw', import: 'default', eager: true })).map(([k, v]) => [k.replace('../', ''), v]),
  );
  it('a rota dos áudios continua conferindo a cada uso, até o Gui decidir', () => {
    const rota = fontes['src/pages/audios/[...chave].ts']!;
    expect(rota).toContain("headers.set('Cache-Control', 'private, no-cache');");
    expect(rota).not.toContain('max-age');
    expect(rota).not.toContain('cabecalhoDeGuardar');
  });
  it('só as rotas de fotos e de retratos guardam por 7 dias', () => {
    const quem = Object.entries(fontes)
      .filter(([, texto]) => texto.includes('cabecalhoDeGuardar(') || texto.includes('max-age'))
      .map(([caminho]) => caminho)
      .sort();
    expect(quem).toEqual(['src/pages/fotos/[...chave].ts', 'src/pages/retratos/[...chave].ts']);
  });
});
