// Os áudios guardados no aparelho por 7 dias (sessão D1c, decisão do Gui de 23/11/2026), com a mesma regra das
// fotos: só o áudio de relato publicado numa memória publicada, fora da lixeira, e não tirado do relato.
// Solto, de relato em rascunho, de memória em rascunho e removido continuam conferidos a cada uso. O cabeçalho
// sai igual na resposta inteira, no trecho (Range, que o Safari do iPhone usa para tocar) e no 304, e nenhuma
// recusa leva prazo de cache. Testado com a rota de verdade sobre o banco SQLite em memória (testes/apoio/d1.ts).
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const TAMANHO = 1000;
/** Um bucket de mentira: todo áudio tem 1000 bytes, e o trecho pedido volta com a medida dele */
const bucket = {
  list: async () => ({ objects: [], truncated: false }),
  delete: async () => undefined,
  put: async () => undefined,
  head: async () => null,
  get: async (chave: string, opcoes: { range?: Headers; onlyIf?: Headers } = {}) => {
    const base = { httpEtag: `"${chave}"`, size: TAMANHO, writeHttpMetadata: (h: Headers) => h.set('Content-Type', 'audio/mp4') };
    if (opcoes.onlyIf?.get('If-None-Match') === base.httpEtag) return base;
    const pedido = opcoes.range?.get('Range');
    if (pedido) {
      const sufixo = /^bytes=-(\d+)$/.exec(pedido);
      const trecho = /^bytes=(\d+)-(\d*)$/.exec(pedido);
      const range = sufixo ? { suffix: Number(sufixo[1]) } : { offset: Number(trecho![1]), length: trecho![2] ? Number(trecho![2]) - Number(trecho![1]) + 1 : undefined };
      return { ...base, range, body: new Uint8Array(2) };
    }
    return { ...base, body: new Uint8Array(TAMANHO) };
  },
};
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = bucket;

const SETE = 'private, max-age=604800';
const ANTES = 'private, no-cache';

describe.skipIf(!comSqlite)('os áudios guardados por 7 dias', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const audios = await import('../src/pages/audios/[...chave]');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;

  const sql = (texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...v);
  const linha = <T>(texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...v) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const pessoas = (banco.sqlite.prepare(`SELECT id FROM integrantes WHERE excluida_em IS NULL ORDER BY id`).all() as { id: string }[]).map((p) => usuarioDe(p.id));

  // Os casos, cada um com um áudio de chave própria
  const chave = (n: number) => `2026/d1c0cccc-0000-4000-8000-${String(n).padStart(12, '0')}.m4a`;
  const memoria = (id: string, situacao = 'publicada', lixeira = false) =>
    sql(`INSERT INTO memorias (id, titulo, ano, tipo, situacao, criada_por, excluida_em) VALUES (?, ?, 2001, 'festa', ?, 'giovanna', ?)`, id, `Caso ${id}`, situacao, lixeira ? '2026-11-20 10:00:00' : null);
  const relato = (memoriaId: string, situacao = 'publicada') => {
    sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, 'giovanna', 'giovanna', 'Um relato', ?)`, memoriaId, situacao);
    return linha<{ id: number }>('SELECT MAX(id) AS id FROM relatos').id;
  };
  const audio = (n: number, relatoId: number | null, removido = false) =>
    sql(`INSERT INTO audios (relato_id, chave, tipo, tamanho, enviado_por, removido_em) VALUES (?, ?, 'audio/mp4', ?, 'giovanna', ?)`, relatoId, chave(n), TAMANHO, removido ? '2026-11-21 10:00:00' : null);

  // Um relato por memória: cada pessoa conta uma vez em cada memória
  memoria('d1c-publica');
  audio(1, relato('d1c-publica'));
  memoria('d1c-publica-2');
  audio(2, relato('d1c-publica-2', 'rascunho'));
  memoria('d1c-publica-3');
  audio(3, relato('d1c-publica-3'), true);
  audio(4, null);
  memoria('d1c-rascunho', 'rascunho');
  audio(5, relato('d1c-rascunho'));
  memoria('d1c-lixeira', 'publicada', true);
  audio(6, relato('d1c-lixeira'));

  const pedir = async (quem: Usuario, n: number, cabecalhos: Record<string, string> = {}) => {
    const request = new Request(`http://localhost/audios/${chave(n)}`, { headers: cabecalhos });
    const r = await audios.GET({ params: { chave: chave(n) }, request, locals: { usuario: quem } } as never);
    return { status: r.status, cache: r.headers.get('Cache-Control'), vary: r.headers.get('Vary'), trecho: r.headers.get('Content-Range'), tamanho: r.headers.get('Content-Length') };
  };
  const giovanna = usuarioDe('giovanna');

  it('7 dias só no áudio de relato publicado em memória publicada; os outros como antes', async () => {
    const esperado: Record<number, string> = { 1: SETE, 2: ANTES, 3: ANTES, 4: ANTES, 5: ANTES };
    for (const [n, cache] of Object.entries(esperado)) {
      expect(await pedir(giovanna, Number(n)), `caso ${n}`).toMatchObject({ status: 200, cache, vary: 'Cookie' });
    }
    // A lixeira: ninguém ouve pela rota, como antes
    for (const quem of pessoas) expect((await pedir(quem, 6)).status).toBe(404);
  });

  it('o trecho (Range) e o 304 saem com o mesmo cabeçalho da resposta inteira', async () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const inteira = await pedir(giovanna, n);
      const trecho = await pedir(giovanna, n, { Range: 'bytes=0-1' });
      expect(trecho, `caso ${n}`).toMatchObject({ status: 206, cache: inteira.cache, vary: inteira.vary, trecho: `bytes 0-1/${TAMANHO}`, tamanho: '2' });
      // O Safari pede "bytes=0-1" primeiro e depois o resto; também o fim, para achar a duração
      expect(await pedir(giovanna, n, { Range: 'bytes=2-' }), `caso ${n}, o resto`).toMatchObject({ status: 206, cache: inteira.cache, trecho: `bytes 2-${TAMANHO - 1}/${TAMANHO}` });
      expect(await pedir(giovanna, n, { Range: 'bytes=-10' }), `caso ${n}, o fim`).toMatchObject({ status: 206, cache: inteira.cache, trecho: `bytes ${TAMANHO - 10}-${TAMANHO - 1}/${TAMANHO}` });
      expect(await pedir(giovanna, n, { 'If-None-Match': `"audios/${chave(n)}"` }), `caso ${n}, 304`).toMatchObject({ status: 304, cache: inteira.cache });
    }
  });

  it('para cada pessoa: quem ouve recebe o cabeçalho da regra; nenhuma recusa leva prazo de cache', async () => {
    let ouvidos = 0;
    let recusados = 0;
    for (const quem of pessoas) {
      for (const n of [1, 2, 3, 4, 5, 6, 99]) {
        for (const cabecalhos of [{}, { Range: 'bytes=0-1' }]) {
          const r = await pedir(quem, n, cabecalhos);
          if (r.status === 404) {
            recusados++;
            expect(r.cache ?? '', `${quem.pessoa}, caso ${n}`).not.toMatch(/max-age/);
          } else {
            ouvidos++;
            expect(r.cache, `${quem.pessoa}, caso ${n}`).toBe(n === 1 ? SETE : ANTES);
          }
        }
      }
    }
    expect(ouvidos).toBeGreaterThan(pessoas.length);
    expect(recusados).toBeGreaterThan(pessoas.length);
  });

  it('só as rotas de fotos, de retratos e de áudios guardam por 7 dias, e todas pela mesma peça', () => {
    const fontes = import.meta.glob<string>('../src/pages/**/*.ts', { query: '?raw', import: 'default', eager: true });
    const quem = Object.entries(fontes)
      .filter(([, texto]) => texto.includes('cabecalhoDeGuardar(') || texto.includes('max-age'))
      .map(([caminho]) => caminho.replace('../', ''))
      .sort();
    expect(quem).toEqual(['src/pages/audios/[...chave].ts', 'src/pages/fotos/[...chave].ts', 'src/pages/retratos/[...chave].ts']);
    for (const caminho of quem) expect(fontes[`../${caminho}`]).not.toContain('max-age');
  });
});
