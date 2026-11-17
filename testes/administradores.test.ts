// Administradores podem mais (docs/decisoes.md, decisões do Gui de 16/11/2026): um teste para cada linha
// de "Quem pode o quê" que mudou, as regras de src/lib/servidor/permissoes.ts e, sobre o banco SQLite em
// memória (testes/apoio/d1.ts), as rotas de verdade e o histórico com o nome de quem fez.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import {
  alcanceDaCorrecao,
  mudancaDeConteudo,
  podeEditarIntegrante,
  podeEditarMemoria,
  podeEscreverRelato,
  podeMexerEmLaco,
  podeMudarLacoDoCoracao,
  podeMudarQuemVe,
  podeRemoverFoto,
  type AcessoDaMemoria,
  type Usuario,
} from '../src/lib/servidor/permissoes';

const gui: Usuario = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };
const giovanna: Usuario = { pessoa: 'giovanna', nome: 'Giovanna', admin: true, nucleos: ['bayara-nascimento', 'bayara-bracarense'] };
const elizete: Usuario = { pessoa: 'elizete', nome: 'Elizete', admin: false, nucleos: ['bayara-nascimento'] };
const comAcesso = new Set(['gui', 'giovanna', 'elizete', 'lucas-magno']);

// Uma memória da Elizete, aberta a todos, em que o Gui não está
const daElizete = (extra: Partial<AcessoDaMemoria> = {}): AcessoDaMemoria => ({
  situacao: 'publicada',
  visibilidade: 'todos',
  criadaPor: 'elizete',
  nucleos: ['bayara-nascimento'],
  integrantes: ['elizete'],
  ...extra,
});

describe('Quem pode o quê: o que muda para os administradores', () => {
  it('Editar a página de quem acessa o site: a própria pessoa e os administradores', () => {
    expect(podeEditarIntegrante(gui, { id: 'elizete', nucleos: ['bayara-nascimento'] }, comAcesso).ok).toBe(true);
    expect(podeEditarIntegrante(elizete, { id: 'giovanna', nucleos: ['bayara-nascimento'] }, comAcesso).ok).toBe(false);
  });

  it('Remover foto: quem enviou e os administradores', () => {
    expect(podeRemoverFoto(gui, 'elizete').ok).toBe(true);
    expect(podeRemoverFoto(elizete, 'gui').ok).toBe(false);
  });

  it('Corrigir a ficha: o administrador corrige só os dados de uma memória em que não está', () => {
    expect(alcanceDaCorrecao(elizete, daElizete())).toBe('tudo');
    expect(alcanceDaCorrecao(gui, daElizete())).toBe('dados');
    expect(alcanceDaCorrecao(gui, daElizete({ integrantes: ['elizete', 'gui'] }))).toBe('tudo');
    expect(podeEditarMemoria(gui, daElizete()).ok).toBe(true);
    // Quem não é administrador continua de fora
    expect(alcanceDaCorrecao({ ...giovanna, admin: false }, daElizete())).toBeNull();
  });

  it('o administrador nunca corrige o que não vê: nem a memória restrita, nem o rascunho de outra pessoa', () => {
    const restrita = daElizete({ visibilidade: 'nucleos', nucleos: ['bracarense'] });
    expect(alcanceDaCorrecao(gui, restrita)).toBeNull();
    expect(podeEditarMemoria(gui, restrita).ok).toBe(false);
    expect(alcanceDaCorrecao(gui, daElizete({ situacao: 'rascunho' }))).toBeNull();
  });

  it('só os dados: o título, as famílias, as legendas, a ordem e a principal ficam; tirar foto pode', () => {
    const antes = {
      titulo: 'Almoço de domingo',
      nucleos: ['bayara-nascimento'],
      fotos: [
        { id: 1, legenda: 'A mesa', principal: true },
        { id: 2, legenda: null, principal: false },
        { id: 3, legenda: 'O bolo', principal: false },
      ],
    };
    expect(mudancaDeConteudo(antes, antes).ok).toBe(true);
    expect(mudancaDeConteudo(antes, { ...antes, titulo: 'Almoço de sábado' }).ok).toBe(false);
    expect(mudancaDeConteudo(antes, { ...antes, nucleos: ['bayara-nascimento', 'bracarense'] }).ok).toBe(false);
    expect(mudancaDeConteudo(antes, { ...antes, fotos: [...antes.fotos, { id: 9, legenda: null, principal: false }] }).ok).toBe(false);
    expect(mudancaDeConteudo(antes, { ...antes, fotos: antes.fotos.map((f) => (f.id === 3 ? { ...f, legenda: 'A torta' } : f)) }).ok).toBe(false);
    expect(mudancaDeConteudo(antes, { ...antes, fotos: [antes.fotos[1]!, antes.fotos[0]!, antes.fotos[2]!] }).ok).toBe(false);
    expect(mudancaDeConteudo(antes, { ...antes, fotos: antes.fotos.map((f) => ({ ...f, principal: f.id === 2 })) }).ok).toBe(false);
    // Tirar uma foto, inclusive a principal: outra toma o lugar dela
    expect(mudancaDeConteudo(antes, { ...antes, fotos: [antes.fotos[0]!, antes.fotos[2]!] }).ok).toBe(true);
    expect(mudancaDeConteudo(antes, { ...antes, fotos: [{ ...antes.fotos[1]!, principal: true }, antes.fotos[2]!] }).ok).toBe(true);
  });

  it('Mudar quem pode ver: continua só de quem criou, também para os administradores', () => {
    expect(podeMudarQuemVe(gui, daElizete(), 'nucleos', ['bayara-nascimento']).ok).toBe(false);
  });

  it('Criar ou mudar um laço do coração: o dono e, nos laços que veem, os administradores', () => {
    expect(podeMudarLacoDoCoracao(elizete, { dono: 'elizete', privado: true }).ok).toBe(true);
    expect(podeMudarLacoDoCoracao(gui, { dono: 'elizete', privado: false }).ok).toBe(true);
    // O "só eu vejo" de outra pessoa continua só do dono
    expect(podeMudarLacoDoCoracao(gui, { dono: 'elizete', privado: true }).ok).toBe(false);
    expect(podeMudarLacoDoCoracao(elizete, { dono: 'gui', privado: false }).ok).toBe(false);
  });

  it('laços de árvore: os administradores já podiam, e continuam', () => {
    expect(podeMexerEmLaco(gui, [{ id: 'tio-de-alguem', nucleos: ['bracarense'] }]).ok).toBe(true);
  });

  it('o que nunca podem: editar o relato que outra pessoa escreveu', () => {
    expect(podeEscreverRelato(gui, 'elizete', { por: 'elizete' }, comAcesso).ok).toBe(false);
    expect(podeEscreverRelato(gui, 'vo-bela', { por: 'vo-bela', registradoPor: 'elizete' }, comAcesso).ok).toBe(false);
  });
});

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('administradores, nas rotas e no banco', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const memorias = await import('../src/pages/api/memorias');
  const lacos = await import('../src/pages/api/lacos');

  const sql = (texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...valores);
  const linha = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...valores) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const admin = usuarioDe('giovanna');
  const dona = usuarioDe('elizete');
  const tipos = await repo.listarTipos();

  // Uma memória da Elizete, aberta a todos, sem a Giovanna, com duas fotos dela
  sql(`INSERT INTO memorias (id, titulo, ano, tipo, lugar, visibilidade, situacao, criada_por, publicada_em) VALUES ('t-adm', 'Almoço de domingo', 1998, 'cotidiano', 'Contagem', 'todos', 'publicada', 'elizete', datetime('now'))`);
  sql(`INSERT INTO memoria_integrantes VALUES ('t-adm', 'elizete')`);
  sql(`INSERT INTO fotos (memoria_id, chave, legenda, principal, ordem, enviada_por) VALUES ('t-adm', 'teste/adm-1.jpg', 'A mesa', 1, 0, 'elizete')`);
  sql(`INSERT INTO fotos (memoria_id, chave, legenda, principal, ordem, enviada_por) VALUES ('t-adm', 'teste/adm-2.jpg', NULL, 0, 1, 'elizete')`);
  const [foto1, foto2] = (banco.sqlite.prepare(`SELECT id FROM fotos WHERE memoria_id = 't-adm' ORDER BY ordem`).all() as { id: number }[]).map((f) => f.id);

  const pedir = async (rota: { POST: (contexto: never) => Promise<Response> | Response }, quem: Usuario, corpo: Record<string, unknown> | FormData) => {
    const json = !(corpo instanceof FormData);
    const request = new Request('http://localhost/api', {
      method: 'POST',
      headers: { Origin: 'http://localhost', ...(json ? { 'Content-Type': 'application/json' } : {}) },
      body: json ? JSON.stringify(corpo) : corpo,
    });
    return rota.POST({ request, locals: { usuario: quem, tipos } } as never);
  };
  const ficha = async (mudar: Record<string, unknown> = {}) => {
    const m = (await repo.obterMemoria(admin, 't-adm'))!;
    return {
      id: m.id,
      titulo: m.titulo,
      ano: m.ano,
      tipo: m.tipo,
      lugar: m.lugar,
      pessoas: m.integrantes,
      nucleos: m.nucleos,
      visibilidade: m.visibilidade,
      situacao: 'publicada',
      fotos: m.fotos.map((f) => ({ id: f.id, legenda: f.legenda ?? undefined, principal: f.principal })),
      ...mudar,
    };
  };

  it('o administrador corrige a data e o lugar, e a versão de antes fica com o nome dele', async () => {
    const resposta = await pedir(memorias, admin, await ficha({ ano: 1997, lugar: 'Belo Horizonte' }));
    expect(resposta.status).toBeLessThan(300);
    const m = (await repo.obterMemoria(admin, 't-adm'))!;
    expect([m.ano, m.lugar, m.titulo]).toEqual([1997, 'Belo Horizonte', 'Almoço de domingo']);
    const [versao] = await repo.listarVersoes<{ ano: number }>('memoria', 't-adm');
    expect(versao).toMatchObject({ autor: 'giovanna', dados: { ano: 1998 } });
  });

  it('o administrador não muda o título nem as legendas de uma memória em que não está', async () => {
    expect((await pedir(memorias, admin, await ficha({ titulo: 'Outro título' }))).status).toBe(403);
    const fotos = (await ficha()).fotos.map((f) => ({ ...f, legenda: 'Nova legenda' }));
    expect((await pedir(memorias, admin, await ficha({ fotos }))).status).toBe(403);
    expect((await repo.obterMemoria(admin, 't-adm'))!.titulo).toBe('Almoço de domingo');
  });

  it('o administrador tira a foto de outra pessoa, e a foto removida guarda o nome dele', async () => {
    const fotos = (await ficha()).fotos.filter((f) => f.id !== foto1);
    expect((await pedir(memorias, admin, await ficha({ fotos }))).status).toBeLessThan(300);
    const removida = (await repo.listarFotosRemovidas('t-adm')).find((f) => f.id === foto1)!;
    expect(removida).toMatchObject({ enviadaPor: 'elizete', removidaPor: 'giovanna' });
    // Sem a principal, a que ficou toma o lugar dela
    expect((await repo.obterMemoria(dona, 't-adm'))!.fotos).toMatchObject([{ id: foto2, principal: true }]);
  });

  it('o administrador muda o nome e o lugar na árvore do laço do coração de outra pessoa, e a versão fica com o nome dele', async () => {
    sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, papel, proximidade, privado) VALUES ('elizete', 'lucio', 'amigo', NULL, 1, 0)`);
    const formulario = new FormData();
    for (const [k, v] of Object.entries({ acao: 'coracao-salvar', dono: 'elizete', pessoa: 'lucio', nomeDoLaco: 'compadre', papel: 'irmao', volta: '/pessoas/lucio/editar' })) formulario.set(k, v);
    await pedir(lacos, admin, formulario);
    const laco = linha<{ id: number; nome: string; papel: string; proximidade: number; privado: number }>(`SELECT * FROM lacos_coracao WHERE dono_id = 'elizete' AND pessoa_id = 'lucio'`);
    // A proximidade e o "só eu vejo" continuam os da dona
    expect(laco).toMatchObject({ nome: 'compadre', papel: 'irmao', proximidade: 1, privado: 0 });
    const [versao] = await repo.listarVersoes<{ nome: string }>('laco-coracao', String(laco.id));
    expect(versao).toMatchObject({ autor: 'giovanna', dados: { nome: 'amigo', dono: 'elizete' } });
  });

  it('o laço "só eu vejo" de outra pessoa o administrador nem acha', async () => {
    sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, papel, proximidade, privado) VALUES ('elizete', 'regina', 'amiga', NULL, NULL, 1)`);
    const id = linha<{ id: number }>(`SELECT id FROM lacos_coracao WHERE dono_id = 'elizete' AND pessoa_id = 'regina'`).id;
    const salvar = new FormData();
    for (const [k, v] of Object.entries({ acao: 'coracao-salvar', dono: 'elizete', pessoa: 'regina', nomeDoLaco: 'irmã', volta: '/pessoas' })) salvar.set(k, v);
    await pedir(lacos, admin, salvar);
    const remover = new FormData();
    for (const [k, v] of Object.entries({ acao: 'coracao-remover', id: String(id), volta: '/pessoas' })) remover.set(k, v);
    await pedir(lacos, admin, remover);
    expect(linha<{ nome: string }>(`SELECT nome FROM lacos_coracao WHERE id = ?`, id).nome).toBe('amiga');
  });

  it('o administrador remove o laço do coração de outra pessoa que vê, e a versão de antes fica', async () => {
    const id = linha<{ id: number }>(`SELECT id FROM lacos_coracao WHERE dono_id = 'elizete' AND pessoa_id = 'lucio'`).id;
    const remover = new FormData();
    for (const [k, v] of Object.entries({ acao: 'coracao-remover', id: String(id), volta: '/pessoas' })) remover.set(k, v);
    await pedir(lacos, admin, remover);
    expect(linha(`SELECT id FROM lacos_coracao WHERE id = ?`, id)).toBeUndefined();
    const versoes = await repo.listarVersoes<{ nome: string }>('laco-coracao', String(id));
    expect(versoes[0]).toMatchObject({ autor: 'giovanna', dados: { nome: 'compadre' } });
  });
});
