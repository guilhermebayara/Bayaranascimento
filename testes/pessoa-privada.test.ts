// Publicar memória com alguém que só você vê (documento de estrutura e docs/decisoes.md; decisão do Gui
// de 17/11/2026). Uma pessoa que só existe num laço "só eu vejo" de quem escreve deixa a memória em
// rascunho: ao publicar, o site recusa e oferece abrir a pessoa para todos, publicar sem citá-la ou
// continuar em rascunho. Nunca publica revelando por tabela uma pessoa privada. Testado com a rota de
// verdade (src/pages/api/memorias.ts) sobre o banco SQLite em memória (testes/apoio/d1.ts).
import { describe, expect, it, vi } from 'vitest';
import { mensagemDaPessoaPrivada } from '../src/lib/memoria';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe('o aviso de quem publica com alguém que só ela vê', () => {
  it('diz quem, por quê e o caminho sem script', () => {
    expect(mensagemDaPessoaPrivada(['Dona Secreta'], false)).toBe(
      'Dona Secreta só aparece para você: o laço de vocês está marcado como “só eu vejo”, e a memória mostraria isso a todos. Enquanto for assim, a memória fica em rascunho. Para publicar, abra o laço para todos ou tire essa pessoa de “Quem estava”.',
    );
    expect(mensagemDaPessoaPrivada(['Ana', 'Bia'], true)).toContain('Ana e Bia só aparecem para você');
    expect(mensagemDaPessoaPrivada(['Ana'], true)).toContain('Para salvar, abra o laço');
  });
});

describe.skipIf(!comSqlite)('memória com alguém que só você vê', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const memorias = await import('../src/pages/api/memorias');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const tipos = await repo.listarTipos();

  const sql = (texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...valores);
  const linha = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...valores) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const [gui, giovanna] = ['gui', 'giovanna'].map(usuarioDe);

  // A Dona Secreta e a Dona Discreta só existem em laços "só eu vejo" do Gui. O Seu Aberto também está
  // num laço privado do Gui, mas tem um laço que todos veem (filho da Elizete): não é só do Gui.
  sql(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('t-secreta', 'Dona Secreta', 'gui'), ('t-discreta', 'Dona Discreta', 'gui'), ('t-aberto', 'Seu Aberto', 'gui')`);
  sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('gui', 't-secreta', 'amiga', 1), ('gui', 't-discreta', 'amiga', 1), ('gui', 't-aberto', 'amigo', 1)`);
  sql(`INSERT INTO filiacoes (filho_id, responsavel_id) VALUES ('t-aberto', 'elizete')`);

  const salvar = async (quem: Usuario, corpo: Record<string, unknown>) => {
    const request = new Request('http://localhost/api/memorias', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(corpo) });
    const resposta = await memorias.POST({ request, locals: { usuario: quem, tipos } } as unknown as Parameters<typeof memorias.POST>[0]);
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };
  const ficha = { titulo: 'Tarde com a amiga', ano: 2010, tipo: 'causo' };
  const quantas = () => linha<{ n: number }>('SELECT COUNT(*) AS n FROM memorias').n;
  const privado = (pessoa: string) => linha<{ privado: number }>(`SELECT privado FROM lacos_coracao WHERE dono_id = 'gui' AND pessoa_id = ?`, pessoa).privado;

  it('só são do Gui as pessoas que não têm nenhum laço que a família toda vê', async () => {
    expect([...(await repo.pessoasQueSoVoceVe(gui))].sort()).toEqual(['t-discreta', 't-secreta']);
    // As do Gui não são da Giovanna (ela tem as dela, nos laços privados do acervo de exemplo)
    expect([...(await repo.pessoasQueSoVoceVe(giovanna))].filter((p) => p.startsWith('t-'))).toEqual([]);
  });

  it('publicar com ela é recusado sem salvar nada, com o nome dela e as escolhas', async () => {
    const antes = quantas();
    const { status, corpo } = await salvar(gui, { ...ficha, pessoas: ['gui', 't-secreta', 't-aberto'] });
    expect(status).toBe(409);
    expect(corpo.codigo).toBe('pessoa-privada');
    expect(corpo.pessoas).toEqual([{ id: 't-secreta', nome: 'Dona Secreta' }]);
    expect(corpo.erro).toContain('Dona Secreta só aparece para você');
    expect(quantas()).toBe(antes);
    expect(privado('t-secreta')).toBe(1);
  });

  it('em rascunho, a memória com ela fica guardada, só para quem escreve', async () => {
    const { status, corpo } = await salvar(gui, { ...ficha, pessoas: ['gui', 't-secreta'], situacao: 'rascunho' });
    expect(status).toBe(201);
    const id = corpo.id as string;
    expect((await repo.obterMemoria(gui, id))?.integrantes).toContain('t-secreta');
    expect(await repo.obterMemoria(giovanna, id)).toBeUndefined();
    // Publicar o rascunho continua recusado enquanto ela for só do Gui
    expect((await salvar(gui, { ...ficha, id, pessoas: ['gui', 't-secreta'] })).status).toBe(409);
    expect(linha<{ situacao: string }>('SELECT situacao FROM memorias WHERE id = ?', id).situacao).toBe('rascunho');
  });

  it('"Publicar sem citar" publica sem ela, e nada dela chega à memória', async () => {
    const { status, corpo } = await salvar(gui, { ...ficha, pessoas: ['gui', 't-secreta'], pessoasPrivadas: 'sem-citar' });
    expect(status).toBe(201);
    const id = corpo.id as string;
    expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM memoria_integrantes WHERE memoria_id = ? AND integrante_id = 't-secreta'`, id).n).toBe(0);
    expect((await repo.obterMemoria(giovanna, id))?.integrantes).toEqual(['gui']);
    expect(privado('t-secreta')).toBe(1);
  });

  it('"Abrir para todos" abre o laço do Gui, com a versão de antes no histórico, e publica com ela', async () => {
    const { status, corpo } = await salvar(gui, { ...ficha, pessoas: ['gui', 't-discreta'], pessoasPrivadas: 'abrir' });
    expect(status).toBe(201);
    expect(privado('t-discreta')).toBe(0);
    // Só o laço da pessoa citada: a Dona Secreta continua só do Gui
    expect(privado('t-secreta')).toBe(1);
    expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM versoes WHERE tipo = 'laco-coracao' AND dados LIKE '%t-discreta%'`).n).toBe(1);
    expect((await repo.obterMemoria(giovanna, corpo.id as string))?.integrantes.sort()).toEqual(['gui', 't-discreta']);
    expect((await repo.listarIntegrantesQueVe(giovanna)).some((i) => i.id === 't-discreta')).toBe(true);
  });

  it('corrigir uma memória publicada para citar alguém só seu também é recusado, sem mexer nela', async () => {
    const { corpo } = await salvar(gui, { ...ficha, pessoas: ['gui'] });
    const id = corpo.id as string;
    const recusa = await salvar(gui, { ...ficha, id, titulo: 'Outro título', pessoas: ['gui', 't-secreta'] });
    expect(recusa.status).toBe(409);
    expect(recusa.corpo.erro).toContain('Para salvar');
    expect(linha<{ titulo: string }>('SELECT titulo FROM memorias WHERE id = ?', id).titulo).toBe(ficha.titulo);
    expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM memoria_integrantes WHERE memoria_id = ? AND integrante_id = 't-secreta'`, id).n).toBe(0);
  });

  it('quem não é dono do laço nem consegue citar a pessoa: para ela, a pessoa não existe', async () => {
    const { status } = await salvar(giovanna, { ...ficha, pessoas: ['giovanna', 't-secreta'] });
    expect(status).toBe(400);
  });
});
