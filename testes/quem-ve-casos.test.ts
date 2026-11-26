// Os casos da AC3 (26/11/2026; auditoria AC, seção 3.3), com as rotas de verdade sobre o banco SQLite em
// memória (testes/apoio/d1.ts): V-1, o sentido da lista vazia (V-2, resposta do Gui à pergunta 2), o "Ver
// como" recusado na produção e paraOLeitor, que a D2 vai usar. As regras moram em src/lib/servidor/quem-ve.ts.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import { paraOLeitor } from '../src/lib/servidor/quem-ve';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown, ACESSOS: '{}' as string }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe('paraOLeitor: a memória como pode sair do servidor (para a D2)', () => {
  const memoria = { id: 'm', titulo: 'Festa', integrantes: ['gui', 'escondida', 'na-lixeira', 'giovanna'], capitulos: ['natais', 'restrito', 'na-lixeira'] };
  it('tira as pessoas que quem olha não vê e os capítulos que ela não vê, e deixa o resto como está', () => {
    const saida = paraOLeitor(memoria, new Set(['escondida', 'na-lixeira']), new Set(['natais']));
    expect(saida).toEqual({ id: 'm', titulo: 'Festa', integrantes: ['gui', 'giovanna'], capitulos: ['natais'] });
  });
  it('não muda a memória que recebeu', () => {
    paraOLeitor(memoria, new Set(['gui']), new Set());
    expect(memoria.integrantes).toHaveLength(4);
    expect(memoria.capitulos).toHaveLength(3);
  });
  it('sem nada escondido, sai igual', () => {
    expect(paraOLeitor(memoria, new Set(), new Set(memoria.capitulos))).toEqual(memoria);
  });
});

describe.skipIf(!comSqlite)('V-1, a lista vazia e o "Ver como" na produção', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const rotas = { memorias: await import('../src/pages/api/memorias'), relatos: await import('../src/pages/api/relatos') };
  const comoRota = await import('../src/pages/como/[id]');
  const { pessoaQuePede } = await import('../src/lib/servidor/acesso');
  const { relatoNaTv } = await import('../src/lib/sala');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const tipos = await repo.listarTipos();

  const sql = (texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...valores);
  const linha = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...valores) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const pedir = async (rota: keyof typeof rotas, quem: Usuario, corpo: Record<string, unknown>) => {
    const request = new Request(`http://localhost/api/${rota}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(corpo) });
    const resposta = await rotas[rota].POST({ request, locals: { usuario: quem, tipos } } as never);
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };
  const [gui, giovanna] = ['gui', 'giovanna'].map(usuarioDe);

  describe('V-1: o laço aberto com quem está na lixeira não conta', () => {
    // X está num laço "só eu vejo" do Gui, e o único laço aberto de X é com Y, que está na lixeira. Para a
    // família, Y sumiu, e o laço com ele também: X só existe para o Gui
    sql(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('t-v1-x', 'Dona Xis', 'gui'), ('t-v1-casal', 'Seu Casal', 'gui')`);
    sql(`INSERT INTO integrantes (id, nome, criado_por, excluida_em, excluida_por) VALUES ('t-v1-y', 'Seu Ipsilon', 'gui', '2026-11-20 10:00:00', 'gui')`);
    sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('gui', 't-v1-x', 'amiga', 1), ('gui', 't-v1-casal', 'amigo', 1)`);
    sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('t-v1-y', 't-v1-x', 'vizinha', 0)`);
    sql(`INSERT INTO casais (a_id, b_id, visibilidade, criado_por) VALUES ('t-v1-casal', 't-v1-y', 'todos', 'gui')`);

    it('as duas pessoas são só do Gui, e a Giovanna não vê nenhuma', async () => {
      const soDoGui = await repo.pessoasQueSoVoceVe(gui);
      expect(soDoGui.has('t-v1-x')).toBe(true);
      expect(soDoGui.has('t-v1-casal')).toBe(true);
      const naoVe = await repo.pessoasQueONaoVe(giovanna);
      expect(naoVe.has('t-v1-x')).toBe(true);
      expect(naoVe.has('t-v1-casal')).toBe(true);
    });

    it('publicar uma memória com ela recebe o aviso de “alguém que só você vê”, sem salvar nada', async () => {
      const antes = linha<{ n: number }>('SELECT COUNT(*) AS n FROM memorias').n;
      const { status, corpo } = await pedir('memorias', gui, { titulo: 'V-1: tarde com a vizinha', ano: 2010, tipo: 'causo', pessoas: ['gui', 't-v1-x'] });
      expect(status).toBe(409);
      expect(corpo.codigo).toBe('pessoa-privada');
      expect(corpo.pessoas).toEqual([{ id: 't-v1-x', nome: 'Dona Xis' }]);
      expect(corpo.erro).toContain('Dona Xis só aparece para você');
      expect(linha<{ n: number }>('SELECT COUNT(*) AS n FROM memorias').n).toBe(antes);
    });

    it('restaurar Y da lixeira devolve o laço aberto, e X deixa de ser só do Gui', async () => {
      sql(`UPDATE integrantes SET excluida_em = NULL, excluida_por = NULL WHERE id = 't-v1-y'`);
      try {
        const soDoGui = await repo.pessoasQueSoVoceVe(gui);
        expect(soDoGui.has('t-v1-x')).toBe(false);
        expect(soDoGui.has('t-v1-casal')).toBe(false);
      } finally {
        sql(`UPDATE integrantes SET excluida_em = '2026-11-20 10:00:00', excluida_por = 'gui' WHERE id = 't-v1-y'`);
      }
    });
  });

  describe('V-2: a lista de famílias vazia espera o sim (resposta do Gui, 26/11)', () => {
    // Quem escreve não é membro de família nenhuma, numa memória que já teve mais de um público, com a página
    // de antes (sem o campo do público): a página mostrava só as famílias de quem escreve, nenhuma
    sql(`INSERT INTO integrantes (id, nome) VALUES ('t-v2-sem-familia', 'Pessoa Sem Família')`);
    const semFamilia = usuarioDe('t-v2-sem-familia');
    const BN = 'bayara-nascimento';
    const abertaDepois = async (titulo: string) => {
      const ficha = { titulo, ano: 2021, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: [BN] };
      const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
      expect((await pedir('memorias', giovanna, { ...ficha, id, visibilidade: 'todos' })).status).toBe(200);
      return id;
    };

    it('o relato nasce com a lista vazia, fica só com quem escreveu e não vai à TV', async () => {
      expect(semFamilia.nucleos).toEqual([]);
      const id = await abertaDepois('V-2: sem família, memória que mudou');
      expect((await pedir('relatos', semFamilia, { memoria: id, por: 't-v2-sem-familia', texto: 'Escrito por quem não tem família.' })).status).toBe(201);
      const gravado = linha<{ id: number; so_para_nucleos: string | null }>(`SELECT id, so_para_nucleos FROM relatos WHERE memoria_id = ? AND por = 't-v2-sem-familia'`, id);
      expect(gravado.so_para_nucleos).toBe('[]');
      const relato = (await repo.obterRelato(id, 't-v2-sem-familia', semFamilia))!;
      expect(relato.soParaNucleos).toEqual([]);
      // Quem escreveu vê; quem vê a memória não vê o relato até o sim
      expect((await repo.listarRelatos(semFamilia, id)).map((r) => r.id)).toContain(gravado.id);
      for (const outro of [gui, giovanna]) expect((await repo.listarRelatos(outro, id)).map((r) => r.id), outro.pessoa).not.toContain(gravado.id);
      // Nem na TV, nem para quem escreveu: o lado mais fechado
      expect(relatoNaTv(relato)).toBe(false);
      expect(await repo.relatosQueVaoATv([gravado.id])).toEqual(new Set());
      // E o pedido para liberar chega a quem escreveu, como nos outros relatos que esperam
      expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM avisos WHERE relato_id = ? AND para = 't-v2-sem-familia' AND tipo = 'liberar-relato' AND resolvido_em IS NULL`, gravado.id).n).toBe(1);
    });

    it('sem espera, o site grava NULL, e o relato vai à TV', async () => {
      const id = (await pedir('memorias', giovanna, { titulo: 'V-2: sempre aberta', ano: 2021, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'todos' })).corpo.id as string;
      expect((await pedir('relatos', semFamilia, { memoria: id, por: 't-v2-sem-familia', texto: 'Na memória que nunca mudou.' })).status).toBe(201);
      const gravado = linha<{ id: number; so_para_nucleos: string | null }>(`SELECT id, so_para_nucleos FROM relatos WHERE memoria_id = ? AND por = 't-v2-sem-familia'`, id);
      expect(gravado.so_para_nucleos).toBeNull();
      expect(await repo.relatosQueVaoATv([gravado.id])).toEqual(new Set([gravado.id]));
    });

    it('os relatos que já existem com a lista vazia continuam esperando, sem migração', async () => {
      const id = (await pedir('memorias', giovanna, { titulo: 'V-2: lista vazia de antes', ano: 2021, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'todos' })).corpo.id as string;
      sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, so_para_nucleos) VALUES (?, 'giovanna', 'giovanna', 'De antes', 'publicada', '[]')`, id);
      const relato = linha<{ id: number }>(`SELECT id FROM relatos WHERE memoria_id = ? AND por = 'giovanna'`, id).id;
      expect((await repo.listarRelatos(gui, id)).map((r) => r.id)).not.toContain(relato);
      expect((await repo.listarRelatos(giovanna, id)).map((r) => r.id)).toContain(relato);
      expect(await repo.relatosQueVaoATv([relato])).toEqual(new Set());
    });
  });

  describe('o "Ver como" na produção', () => {
    const verComo = (id: string) => comoRota.GET({ params: { id }, url: new URL(`http://localhost/como/${id}?volta=/`) } as never) as Response;

    it('nas prévias, troca a pessoa vista', () => {
      env.AMBIENTE = 'previa';
      const resposta = verComo('elizete');
      expect(resposta.status).toBe(303);
      expect(resposta.headers.get('Set-Cookie')).toContain('como=elizete');
    });

    it('na produção, /como/<id> responde como um endereço que não existe, sem cookie, para qualquer pessoa', async () => {
      vi.stubEnv('DEV', false);
      env.AMBIENTE = 'producao';
      try {
        for (const id of ['gui', 'giovanna', 'elizete', 'lucas-magno']) {
          const resposta = verComo(id);
          expect(resposta.status, id).toBe(404);
          expect(resposta.headers.get('Set-Cookie'), id).toBeNull();
          expect(resposta.headers.get('Location'), id).toBeNull();
        }
        // E o cookie de antes não vale: sem o login do Access, ninguém é ninguém
        const comCookie = new Request('http://localhost/', { headers: { Cookie: 'como=elizete' } });
        expect(await pessoaQuePede(comCookie)).toBeUndefined();
      } finally {
        env.AMBIENTE = 'previa';
        vi.unstubAllEnvs();
      }
    });
  });
});
