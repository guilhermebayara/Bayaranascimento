// Excluir pessoa (decisão do Gui depois da sessão I, 18/11/2026; migração 102-excluir-pessoa). Os
// administradores excluem; os outros pedem, e um administrador aprova ou recusa. A pessoa vai para a
// lixeira, com volta: some do site na hora, as memórias ficam, ela sai de "Quem estava" e dos laços, e os
// relatos que ela contou continuam, com o nome. Restaurar devolve tudo. Sobre um banco SQLite em memória
// com o acervo de exemplo (testes/apoio/d1.ts), pelas consultas de verdade.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import { comExcluidas, excluidasDe, podeCuidarDaExclusao, podeExcluirPessoa, podePedirExclusao, veORelato, type Usuario } from '../src/lib/servidor/permissoes';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

const gui: Usuario = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };
const elizete: Usuario = { pessoa: 'elizete', nome: 'Elizete', admin: false, nucleos: ['bayara-nascimento'] };

describe('quem exclui, quem pede', () => {
  const voBela = { id: 'vo-bela', acessa: false };
  it('administrador exclui; quem não administra pede', () => {
    expect(podeExcluirPessoa(gui, voBela).ok).toBe(true);
    expect(podePedirExclusao(gui, voBela).ok).toBe(false);
    expect(podeExcluirPessoa(elizete, voBela).ok).toBe(false);
    expect(podePedirExclusao(elizete, voBela).ok).toBe(true);
  });
  it('ninguém exclui a si mesmo nem quem entra no site, nem pede', () => {
    for (const u of [gui, elizete]) {
      expect(podeExcluirPessoa(u, { id: u.pessoa, acessa: true }).ok).toBe(false);
      expect(podePedirExclusao(u, { id: u.pessoa, acessa: true }).ok).toBe(false);
      expect(podeExcluirPessoa(u, { id: 'giovanna', acessa: true }).ok).toBe(false);
      expect(podePedirExclusao(u, { id: 'giovanna', acessa: true }).ok).toBe(false);
    }
  });
  it('só os administradores restauram e cuidam dos pedidos', () => {
    expect(podeCuidarDaExclusao(gui).ok).toBe(true);
    expect(podeCuidarDaExclusao(elizete).ok).toBe(false);
  });
  it('o relato de quem está na lixeira fica; o de quem só existe num laço privado de outro, não', () => {
    const relato = { por: 'vo-bela', registradoPor: 'elizete' };
    expect(veORelato(relato, { pessoa: 'gui' }, new Set(['vo-bela']))).toBe(false);
    expect(veORelato(relato, { pessoa: 'gui' }, comExcluidas(new Set(['vo-bela']), new Set(['vo-bela'])))).toBe(true);
  });
});

describe.skipIf(!comSqlite)('excluir pessoa no banco', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  const repo = await import('../src/lib/servidor/repositorio');
  const { aniversarios } = await import('../src/lib/painel');

  beforeAll(async () => {
    await prepararBanco();
  });

  const comVoBela = () => banco.sqlite.prepare(`SELECT memoria_id FROM memoria_integrantes WHERE integrante_id = 'vo-bela'`).all().length;

  it('some do site na hora: das pessoas, dos laços e de "Quem estava"; os relatos ficam', async () => {
    const memoria = (banco.sqlite.prepare(`SELECT memoria_id FROM relatos WHERE por = 'vo-bela' AND situacao = 'publicada' LIMIT 1`).get() as { memoria_id: string }).memoria_id;
    const relatosAntes = (await repo.listarRelatos(gui, memoria)).map((r) => r.id);
    const marcadas = comVoBela();
    expect(marcadas).toBeGreaterThan(0);
    expect((await repo.listarFiliacoes()).some((f) => f.responsavel === 'vo-bela')).toBe(true);

    expect(await repo.excluirPessoa('vo-bela', gui)).toBe(true);
    expect(await repo.excluirPessoa('vo-bela', gui)).toBe(false);

    expect((await repo.listarIntegrantes()).some((i) => i.id === 'vo-bela')).toBe(false);
    for (const u of [gui, elizete]) {
      expect((await repo.listarIntegrantesQueVe(u)).some((i) => i.id === 'vo-bela')).toBe(false);
      const naoVe = await repo.pessoasQueONaoVe(u);
      expect(naoVe.has('vo-bela')).toBe(true);
      expect(excluidasDe(naoVe).has('vo-bela')).toBe(true);
      expect((await repo.listarCasais(u)).some((c) => c.a === 'vo-bela' || c.b === 'vo-bela')).toBe(false);
      expect((await repo.listarLacosDoCoracao(u)).some((l) => l.pessoa === 'vo-bela' || l.dono === 'vo-bela')).toBe(false);
      expect(aniversarios(await repo.listarIntegrantes(), { ano: 2026, mes: 11, dia: 17 }, naoVe, u.pessoa).some((a) => a.pessoa.id === 'vo-bela')).toBe(false);
    }
    expect((await repo.listarFiliacoes()).some((f) => f.responsavel === 'vo-bela' || f.filho === 'vo-bela')).toBe(false);
    expect((await repo.listarLacosResumidos()).some((r) => r.a === 'vo-bela' || r.b === 'vo-bela')).toBe(false);
    // Nada foi apagado: "Quem estava" continua no banco, e as telas tiram quem não se vê
    expect(comVoBela()).toBe(marcadas);
    // O relato que ela contou continua, com o nome
    expect((await repo.listarRelatos(gui, memoria)).map((r) => r.id)).toEqual(relatosAntes);
    expect((await repo.nomesDasPessoasExcluidas()).get('vo-bela')).toBe('Vó Bela');
    expect((await repo.listarPessoasExcluidas()).map((p) => [p.id, p.excluidaPor])).toEqual([['vo-bela', 'gui']]);
  });

  it('restaurar devolve tudo', async () => {
    expect(await repo.restaurarPessoa('vo-bela')).toBe(true);
    expect(await repo.restaurarPessoa('vo-bela')).toBe(false);
    expect((await repo.listarIntegrantes()).some((i) => i.id === 'vo-bela')).toBe(true);
    expect((await repo.listarFiliacoes()).some((f) => f.responsavel === 'vo-bela')).toBe(true);
    expect((await repo.pessoasQueONaoVe(gui)).has('vo-bela')).toBe(false);
    expect(await repo.listarPessoasExcluidas()).toEqual([]);
  });

  it('o pedido: um aberto por pessoa, recusar deixa no acervo, excluir resolve o pedido', async () => {
    expect(await repo.pedirExclusao('ex-tia-cida', 'Cadastrada duas vezes', elizete)).toBe(true);
    expect(await repo.pedirExclusao('ex-tia-cida', 'De novo', gui)).toBe(false);
    const [pedido] = await repo.listarPedidosDeExclusao();
    expect(pedido).toMatchObject({ pessoa: 'ex-tia-cida', pedidoPor: 'elizete', motivo: 'Cadastrada duas vezes' });
    expect((await repo.pedidoAbertoDeExclusao('ex-tia-cida'))?.id).toBe(pedido.id);
    expect(await repo.recusarPedidoDeExclusao(pedido.id, gui)).toBe(true);
    expect(await repo.listarPedidosDeExclusao()).toEqual([]);
    expect((await repo.listarIntegrantes()).some((i) => i.id === 'ex-tia-cida')).toBe(true);

    expect(await repo.pedirExclusao('ex-tia-cida', null, elizete)).toBe(true);
    await repo.excluirPessoa('ex-tia-cida', gui);
    expect(await repo.listarPedidosDeExclusao()).toEqual([]);
    const resposta = banco.sqlite.prepare(`SELECT resposta, resolvido_por FROM pedidos_de_exclusao WHERE pessoa_id = 'ex-tia-cida' ORDER BY id DESC LIMIT 1`).get();
    expect(resposta).toEqual({ resposta: 'excluida', resolvido_por: 'gui' });
    await repo.restaurarPessoa('ex-tia-cida');
  });

  it('restaurar pela lixeira leva à página da pessoa, e ela sai da lixeira (QA de 18/11/2026)', async () => {
    const rota = await import('../src/pages/api/pessoas-excluidas');
    const pedir = async (campos: Record<string, string>) => {
      const f = new FormData();
      for (const [k, v] of Object.entries(campos)) f.set(k, v);
      const request = new Request('http://localhost/api/pessoas-excluidas', { method: 'POST', headers: { Origin: 'http://localhost' }, body: f });
      const r = await rota.POST({ request, locals: { usuario: gui } } as never);
      return decodeURIComponent((r.headers.get('Location') ?? '').replace(/\+/g, ' '));
    };
    expect(await pedir({ acao: 'excluir', pessoa: 'ex-tia-cida' })).toMatch(/^\/pessoas\?ok=/);
    expect((await repo.listarPessoasExcluidas()).map((p) => p.id)).toContain('ex-tia-cida');
    const destino = await pedir({ acao: 'restaurar', pessoa: 'ex-tia-cida' });
    expect(destino).toMatch(/^\/pessoas\/ex-tia-cida\?ok=/);
    expect(destino).not.toContain('/lixeira');
    expect((await repo.listarPessoasExcluidas()).map((p) => p.id)).not.toContain('ex-tia-cida');
  });
});

describe('as telas de excluir pessoa', () => {
  const ler = (c: string) => readFileSync(c, 'utf8');
  it('a edição da pessoa tem a zona de perigo, com excluir ou pedir', () => {
    const editar = ler('src/pages/pessoas/[id]/editar.astro');
    expect(editar).toContain("{podeExcluir ? 'Excluir esta pessoa' : 'Pedir para excluir esta pessoa'}");
    expect(editar).toContain('href={`/pessoas/${pessoa.id}/excluir`}');
  });
  it('a lixeira mostra as pessoas para os administradores, com "Restaurar"', () => {
    const lixeira = ler('src/pages/lixeira.astro');
    expect(lixeira).toContain('const pessoas = usuario.admin ? await listarPessoasExcluidas() : [];');
    expect(lixeira).toContain('<input type="hidden" name="acao" value="restaurar" />');
  });
  it('o relato de quem está na lixeira continua assinado, nas telas que mostram quem contou', () => {
    for (const arquivo of ['src/pages/memorias/[id].astro', 'src/pages/index.astro', 'src/pages/conta.astro', 'src/pages/memorias/[id]/historico.astro', 'src/pages/memorias/[id]/compartilhar.astro']) {
      expect(ler(arquivo), arquivo).toContain('nomesNaLixeira.get(id)');
    }
  });
});

describe('o espelho e excluir pessoa', () => {
  it('quem está na lixeira continua na lixeira, e os pedidos (com o motivo escrito) não passam', async () => {
    const { TABELAS_APAGADAS } = await import('../src/lib/espelho');
    expect(TABELAS_APAGADAS).toContain('pedidos_de_exclusao');
    const fonte = readFileSync('src/lib/espelho.ts', 'utf8');
    expect(fonte).toContain('excluida_em: texto(p.excluida_em),');
  });
});
