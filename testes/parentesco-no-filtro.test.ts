// O parentesco de quem olha no filtro "Quem estava junto" do Explorar (respostas do Gui às críticas C1 e
// C2, 22/11/2026): cada nome com o que a pessoa é para quem olha, pela regra de Pessoas, só com os laços
// que quem olha vê. Roda sobre o acervo de exemplo, no SQLite do Node.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('o parentesco no filtro "Quem estava junto"', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  await (await import('../src/lib/servidor/banco')).prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const { parentescosDeQuemOlha } = await import('../src/lib/servidor/parentesco-de-quem-olha');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const linhas = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).all(...valores) as T[];
  const usuarioDe = (pessoa: string): Usuario => ({
    pessoa,
    nome: pessoa,
    admin: Boolean(linhas<{ admin: number }>('SELECT admin FROM integrantes WHERE id = ?', pessoa)[0].admin),
    nucleos: linhas<{ n: string }>(`SELECT nucleo_id AS n FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((l) => l.n),
  });

  it('a Elizete lê "sua mãe" na Vó Vivica e "você" em si mesma', async () => {
    const elizete = usuarioDe('elizete');
    const mapa = await parentescosDeQuemOlha(elizete, await repo.listarIntegrantesQueVe(elizete));
    expect(mapa.get('vo-vivica')).toBe('sua mãe');
    expect(mapa.get('elizete')).toBe('você');
    expect(mapa.get('giovanna')).toBe('sua filha');
  });

  it('o apelido que já diz o parentesco não o repete embaixo', async () => {
    const elizete = usuarioDe('elizete');
    const mapa = await parentescosDeQuemOlha(elizete, [{ id: 'vo-vivica', nome: 'Vivica', apelido: 'Mãe Vivica', tratamento: 'ela' }]);
    expect(mapa.has('vo-vivica')).toBe(false);
  });

  it('nunca diz nada de quem quem olha não vê, nem com a lista inteira de pessoas', async () => {
    const todos = await repo.listarIntegrantes();
    for (const pessoa of ['gui', 'giovanna', 'elizete', 'lucas-magno', 'lucio', 'regina', 'ana-candida']) {
      const u = usuarioDe(pessoa);
      const naoVe = await repo.pessoasQueONaoVe(u);
      const mapa = await parentescosDeQuemOlha(u, todos);
      for (const id of mapa.keys()) expect(naoVe.has(id), `${pessoa}: ${id}`).toBe(false);
      // A pessoa do laço "só eu vejo" da Giovanna só tem parentesco para ela
      if (pessoa !== 'giovanna') expect(mapa.has('ex-marina'), pessoa).toBe(false);
    }
  });
});
