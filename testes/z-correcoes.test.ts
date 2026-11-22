// Sessão Z (22/11/2026): os defeitos achados nas revisões Y a Y4 do PR #160 que não o bloquearam. Pelas
// rotas de verdade, sobre o SQLite em memória (testes/apoio/d1.ts), como testes/y3-falhas.test.ts.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type ComandoDeTeste, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('Z: defeitos das revisões do PR #160', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  await (await import('../src/lib/servidor/banco')).prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const rotas = { memorias: await import('../src/pages/api/memorias'), relatos: await import('../src/pages/api/relatos') };
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const tipos = await repo.listarTipos();
  const linhas = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).all(...valores) as T[];
  const usuarioDe = (pessoa: string): Usuario => ({
    pessoa,
    nome: pessoa,
    admin: Boolean(linhas<{ admin: number }>('SELECT admin FROM integrantes WHERE id = ?', pessoa)[0].admin),
    nucleos: linhas<{ n: string }>(`SELECT nucleo_id AS n FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((l) => l.n),
  });
  const [giovanna, elizete] = ['giovanna', 'elizete'].map(usuarioDe);
  const pedir = async (rota: keyof typeof rotas, quem: Usuario, corpo: Record<string, unknown>) => {
    const request = new Request(`http://localhost/api/${rota}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(corpo) });
    const resposta = await rotas[rota].POST({ request, locals: { usuario: quem, tipos } } as never);
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };
  /** A impressão do banco inteiro: todas as linhas de todas as tabelas, em ordem */
  const impressao = () => {
    const tabelas = linhas<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).map((t) => t.name);
    return JSON.stringify(tabelas.map((t) => [t, banco.sqlite.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all()]));
  };
  const lote = banco.batch.bind(banco);
  /** O próximo lote que tiver um comando assim falha, como o D1 falharia */
  async function falhandoNoLote<T>(comando: RegExp, fazer: () => Promise<T>): Promise<T | Error> {
    banco.batch = async (comandos: ComandoDeTeste[]) => {
      if (comandos.some((c) => comando.test(c.sql))) {
        banco.batch = lote;
        throw new Error('D1_ERROR: falha de teste');
      }
      return lote(comandos);
    };
    try {
      return await fazer();
    } catch (erro) {
      return erro as Error;
    } finally {
      banco.batch = lote;
    }
  }

  describe('D1: a memória, o relato, os áudios e as mensagens num lote só', () => {
    it('a falha do banco no lote não deixa nada; a nova tentativa cria uma memória só, com o áudio preso a ela', async () => {
      const audio = await repo.registrarAudio({ chave: 'teste/z-d1.m4a', tipo: 'audio/mp4', tamanho: 10, duracao: 3, memoriaId: null }, elizete);
      const ficha = {
        titulo: 'Z: D1 com áudio',
        ano: 2021,
        tipo: 'causo',
        pessoas: ['elizete'],
        relato: { por: 'elizete', texto: 'Contado com a voz.', audios: [{ id: audio }], mensagens: [{ tipo: 'texto', texto: 'Contado com a voz.' }, { tipo: 'audio', audioId: audio }] },
      };
      const antes = impressao();
      const falhou = await falhandoNoLote(/^\s*UPDATE audios SET relato_id/, () => pedir('memorias', elizete, ficha));
      expect(falhou).toBeInstanceOf(Error);
      expect(impressao()).toBe(antes);
      // O áudio continua solto, à espera da nova tentativa
      expect(linhas<{ relato_id: number | null; memoria_id: string | null }>('SELECT relato_id, memoria_id FROM audios WHERE id = ?', audio)[0]).toEqual({ relato_id: null, memoria_id: null });

      const r = await pedir('memorias', elizete, ficha);
      expect(r.status).toBe(201);
      expect(linhas(`SELECT id FROM memorias WHERE titulo = 'Z: D1 com áudio'`)).toHaveLength(1);
      const relato = linhas<{ id: number }>('SELECT id FROM relatos WHERE memoria_id = ? AND por = ?', r.corpo.id as string, 'elizete')[0].id;
      expect(linhas<{ relato_id: number; memoria_id: string }>('SELECT relato_id, memoria_id FROM audios WHERE id = ?', audio)[0]).toEqual({ relato_id: relato, memoria_id: r.corpo.id });
      expect(linhas<{ tipo: string; audio_id: number | null }>('SELECT tipo, audio_id FROM relato_mensagens WHERE relato_id = ? ORDER BY ordem', relato)).toEqual([
        { tipo: 'texto', audio_id: null },
        { tipo: 'audio', audio_id: audio },
      ]);
    });

    it('a rota grava a ficha, o relato, os áudios e as mensagens numa chamada só ao banco', async () => {
      const audio = await repo.registrarAudio({ chave: 'teste/z-d1-um-lote.m4a', tipo: 'audio/mp4', tamanho: 10, duracao: 3, memoriaId: null }, giovanna);
      const lotes: string[][] = [];
      banco.batch = async (comandos: ComandoDeTeste[]) => {
        // Só os lotes que gravam: os de leitura não contam
        if (comandos.some((c) => /^\s*(INSERT|UPDATE|DELETE)/.test(c.sql))) lotes.push(comandos.map((c) => c.sql.trim().split(/\s+/).slice(0, 3).join(' ')));
        return lote(comandos);
      };
      try {
        const r = await pedir('memorias', giovanna, {
          titulo: 'Z: D1 num lote',
          ano: 2021,
          tipo: 'causo',
          pessoas: ['giovanna'],
          relato: { por: 'giovanna', texto: 'Um texto.', audios: [{ id: audio }], mensagens: [{ tipo: 'texto', texto: 'Um texto.' }, { tipo: 'audio', audioId: audio }] },
        });
        expect(r.status).toBe(201);
      } finally {
        banco.batch = lote;
      }
      expect(lotes).toHaveLength(1);
      expect(lotes[0]).toEqual(expect.arrayContaining(['INSERT INTO memorias', 'INSERT INTO relatos', 'UPDATE audios SET', 'INSERT INTO relato_mensagens']));
    });

    it('ligarAudios e a rota da memória conferem os áudios do mesmo jeito', () => {
      const repositorio = readFileSync('src/lib/servidor/repositorio.ts', 'utf-8');
      expect(repositorio.slice(repositorio.indexOf('export async function ligarAudios'))).toContain('await audiosQueEntram(relatoId, memoriaId, itens, usuario)');
      expect(readFileSync('src/pages/api/memorias.ts', 'utf-8')).toContain('await audiosQueEntram(relatoId, id, audiosDoRelato, usuario)');
    });
  });
});
