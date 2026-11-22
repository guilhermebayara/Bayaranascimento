// Y3 do PR #160 (22/11/2026): as correções da W4, além do gabarito em testes/y3-falhas.test.ts.
// Pelas rotas de verdade, sobre o SQLite em memória.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type ComandoDeTeste, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('Y3: as correções', async () => {
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
  // Gui, Giovanna e Elizete: Bayara Nascimento. Lúcio: fora dela
  const [giovanna, elizete] = ['giovanna', 'elizete'].map(usuarioDe);
  const BN = 'bayara-nascimento';
  const pedir = async (rota: keyof typeof rotas, quem: Usuario, corpo: Record<string, unknown>) => {
    const request = new Request(`http://localhost/api/${rota}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(corpo) });
    const resposta = await rotas[rota].POST({ request, locals: { usuario: quem, tipos } } as never);
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };
  const lote = banco.batch.bind(banco);
  const base = (titulo: string) => ({ titulo, ano: 2021, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: [BN] });

  describe('item 1: nada gravado pela metade em /api/memorias', () => {
    it('uma perda e depois o acerto: a pessoa nova e o tema novo entram uma vez só, citados pela memória', async () => {
      const ficha = base('Y3: uma perda, depois o acerto');
      const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
      let perder = true;
      banco.batch = async (comandos: ComandoDeTeste[]) => {
        if (perder && comandos.some((c) => /^\s*UPDATE memorias SET versao = \?/.test(c.sql))) {
          perder = false;
          banco.sqlite.prepare('UPDATE memorias SET versao = versao + 1 WHERE id = ?').run(id);
        }
        return lote(comandos);
      };
      try {
        const r = await pedir('memorias', giovanna, { ...ficha, id, visibilidade: 'todos', pessoas: ['giovanna', 'nova:0'], novasPessoas: [{ nome: 'Sicrana Ypsilon' }], temas: 'tema-y3-acerto' });
        expect(r.status).toBe(200);
      } finally {
        banco.batch = lote;
      }
      const pessoas = linhas<{ id: string }>(`SELECT id FROM integrantes WHERE nome = 'Sicrana Ypsilon'`);
      expect(pessoas).toHaveLength(1);
      const temas = linhas<{ id: string }>(`SELECT id FROM temas WHERE nome = 'tema-y3-acerto'`);
      expect(temas).toHaveLength(1);
      expect(linhas(`SELECT 1 FROM memoria_integrantes WHERE memoria_id = ? AND integrante_id = ?`, id, pessoas[0].id)).toHaveLength(1);
      expect(linhas(`SELECT 1 FROM tema_memorias WHERE memoria_id = ? AND tema_id = ?`, id, temas[0].id)).toHaveLength(1);
    });

    it('a memória nova cujo lote falha na primeira tentativa não deixa pessoa, tema, laço aberto, relato nem aviso', async () => {
      banco.sqlite.prepare(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('t-y3-guardada', 'Dona Guardada', 'giovanna')`).run();
      banco.sqlite.prepare(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('giovanna', 't-y3-guardada', 'vizinha', 1)`).run();
      const contar = () => ({
        integrantes: linhas('SELECT id FROM integrantes').length,
        temas: linhas('SELECT id FROM temas').length,
        memorias: linhas('SELECT id FROM memorias').length,
        relatos: linhas('SELECT id FROM relatos').length,
        avisos: linhas('SELECT id FROM avisos').length,
      });
      const antes = contar();
      // O lote da memória nova falha (o banco recusa): nada do que ele levava fica
      banco.batch = async (comandos: ComandoDeTeste[]) => {
        if (comandos.some((c) => /^\s*INSERT INTO memorias/.test(c.sql))) {
          banco.batch = lote;
          return lote([...comandos, banco.prepare('SELECT RAISE(ABORT, "falha de propósito")')]);
        }
        return lote(comandos);
      };
      await expect(
        pedir('memorias', giovanna, {
          ...base('Y3: memória nova que falha'),
          visibilidade: 'todos',
          pessoas: ['giovanna', 'gui', 't-y3-guardada', 'nova:0'],
          novasPessoas: [{ nome: 'Beltrana Ypsilon' }],
          temas: 'tema-y3-falha',
          pessoasPrivadas: 'abrir',
          relato: { por: 'giovanna', texto: 'O relato que vinha junto.' },
        }),
      ).rejects.toThrow('falha de propósito');
      banco.batch = lote;
      expect(contar()).toEqual(antes);
      expect(linhas<{ privado: number }>(`SELECT privado FROM lacos_coracao WHERE pessoa_id = 't-y3-guardada'`)[0].privado).toBe(1);
    });

    it('a memória nova que dá certo grava a ficha, a pessoa nova e o relato', async () => {
      const r = await pedir('memorias', giovanna, {
        ...base('Y3: memória nova inteira'),
        visibilidade: 'todos',
        pessoas: ['giovanna', 'elizete', 'nova:0'],
        novasPessoas: [{ nome: 'Fulustreca Ypsilon' }],
        relato: { por: 'giovanna', texto: 'O relato que veio junto.' },
      });
      expect(r.status).toBe(201);
      const id = r.corpo.id as string;
      expect(linhas(`SELECT id FROM integrantes WHERE nome = 'Fulustreca Ypsilon'`)).toHaveLength(1);
      expect((await repo.listarRelatos(elizete, id)).map((x) => x.texto)).toEqual(['O relato que veio junto.']);
    });
  });
});
