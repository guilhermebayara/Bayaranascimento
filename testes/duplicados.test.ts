// Juntar cadastros duplicados (onda 2, decisão do Gui de 17/11/2026): só os administradores, escolhendo o
// que fica de cada ficha, com tudo passando para a que fica e o histórico. A sugestão de nomes parecidos
// ao digitar vale para todos. Testado com a rota de verdade (api/duplicados.ts).
import { describe, expect, it, vi } from 'vitest';
import { chaveDoPar, distancia, nomesParecidos, possiveisDuplicados } from '../src/lib/nomes-parecidos';
import { podeJuntarCadastros } from '../src/lib/servidor/permissoes';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe('nomes parecidos', () => {
  const gente = [
    { id: 'a', nome: 'Maria Bayara', apelido: null },
    { id: 'b', nome: 'Maria Aparecida Bayara', apelido: null },
    { id: 'c', nome: 'Lourdes', apelido: 'Tia Lourdes' },
    { id: 'd', nome: 'Tia Lourdes', apelido: null },
    { id: 'e', nome: 'José', apelido: null },
    { id: 'f', nome: 'Jose', apelido: null },
    { id: 'g', nome: 'Ana', apelido: null },
  ];
  it('os pares baratos: o mesmo nome sem acento, o mesmo primeiro e último nome, o apelido de um no nome do outro', () => {
    expect(possiveisDuplicados(gente).map(([x, y]) => `${x.id}${y.id}`).sort()).toEqual(['ab', 'cd', 'ef']);
  });
  it('o par que um administrador disse que não é sai da lista', () => {
    expect(possiveisDuplicados(gente, new Set([chaveDoPar('b', 'a')])).map(([x, y]) => `${x.id}${y.id}`).sort()).toEqual(['cd', 'ef']);
  });
  it('ao digitar, aceita uma ou duas letras de diferença', () => {
    expect(distancia('lourdes', 'lurdes')).toBe(1);
    expect(nomesParecidos('Lurdes', gente).map((x) => x.id)).toContain('c');
    expect(nomesParecidos('Ma', gente)).toEqual([]);
    expect(nomesParecidos('Beatriz', gente)).toEqual([]);
  });
  it('só os administradores juntam, e a ficha de quem acessa o site é a que fica', () => {
    const adm = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: [] };
    const acesso = new Set(['elizete']);
    expect(podeJuntarCadastros({ ...adm, admin: false }, 'a', 'b', acesso).ok).toBe(false);
    expect(podeJuntarCadastros(adm, 'a', 'elizete', acesso).ok).toBe(false);
    expect(podeJuntarCadastros(adm, 'elizete', 'a', acesso).ok).toBe(true);
    expect(podeJuntarCadastros(adm, 'a', 'a', acesso).ok).toBe(false);
  });
});

describe.skipIf(!comSqlite)('juntar no banco', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const rota = await import('../src/pages/api/duplicados');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const sql = (texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...v);
  const linha = <T>(texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...v) as T;
  const todas = <T>(texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).all(...v) as T[];
  const gui: Usuario = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };
  const elizete: Usuario = { pessoa: 'elizete', nome: 'Elizete', admin: false, nucleos: ['bayara-nascimento'] };
  const pedir = async (quem: Usuario, campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    const request = new Request('http://localhost/api/duplicados', { method: 'POST', headers: { Origin: 'http://localhost' }, body: f });
    const r = await rota.POST({ request, locals: { usuario: quem } } as never);
    return decodeURIComponent((r.headers.get('Location') ?? '').replace(/\+/g, ' '));
  };

  // Duas fichas da Tia Lourdes: uma com nascimento e família, outra com memória, relato, casal e laço do coração
  sql(`INSERT INTO integrantes (id, nome, nascimento_ano, criado_por) VALUES ('t-lu1', 'Lourdes', 1940, 'gui'), ('t-lu2', 'Tia Lourdes', NULL, 'elizete'), ('t-ze', 'Zé', NULL, 'gui')`);
  sql(`UPDATE integrantes SET sobre = 'Fazia doce de leite' WHERE id = 't-lu2'`);
  sql(`INSERT INTO nucleo_membros (nucleo_id, integrante_id, papel) VALUES ('bayara-nascimento', 't-lu1', 'parente'), ('bracarense', 't-lu2', 'parente')`);
  sql(`INSERT INTO filiacoes (filho_id, responsavel_id) VALUES ('t-lu1', 'vo-bela'), ('t-lu2', 'vo-bela'), ('t-lu2', 't-lu1')`);
  sql(`INSERT INTO memorias (id, titulo, ano, tipo, situacao, criada_por) VALUES ('t-doce', 'O doce', 1970, 'causo', 'publicada', 'gui')`);
  sql(`INSERT INTO memoria_integrantes VALUES ('t-doce', 't-lu2')`);
  sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto) VALUES ('t-doce', 't-lu2', 'elizete', 'Ela contava assim')`);
  sql(`INSERT INTO casais (a_id, b_id) VALUES ('t-lu2', 't-ze')`);
  sql(`INSERT INTO casal_fases (casal_id, tipo) SELECT id, 'casamento' FROM casais WHERE b_id = 't-ze'`);
  sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome) VALUES ('elizete', 't-lu2', 'tia')`);

  it('quem não administra não junta', async () => {
    expect(await pedir(elizete, { acao: 'juntar', fica: 't-lu1', sai: 't-lu2' })).toContain('Só os administradores');
    expect(linha(`SELECT id FROM integrantes WHERE id = 't-lu2'`)).toBeDefined();
  });

  it('a ficha de quem acessa o site nunca sai', async () => {
    expect(await pedir(gui, { acao: 'juntar', fica: 't-lu1', sai: 'elizete' })).toContain('A ficha de quem acessa o site é a que fica.');
    expect(linha(`SELECT id FROM integrantes WHERE id = 'elizete'`)).toBeDefined();
  });

  it('dois relatos na mesma memória impedem juntar, sem mexer em nada', async () => {
    sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto) VALUES ('t-doce', 't-lu1', 'gui', 'Outro')`);
    expect(await pedir(gui, { acao: 'juntar', fica: 't-lu1', sai: 't-lu2' })).toContain('As duas fichas têm relato em “O doce”');
    expect(linha(`SELECT id FROM integrantes WHERE id = 't-lu2'`)).toBeDefined();
    sql(`DELETE FROM relatos WHERE por = 't-lu1'`);
  });

  it('junta: tudo passa para a que fica, os campos escolhidos entram, e as fichas de antes ficam no histórico', async () => {
    expect(await pedir(gui, { acao: 'juntar', fica: 't-lu1', sai: 't-lu2', 'campo-nome': 'fica', 'campo-sobre': 'sai' })).toContain('Fichas juntadas');
    expect(linha(`SELECT id FROM integrantes WHERE id = 't-lu2'`)).toBeUndefined();
    expect(linha(`SELECT nome, nascimento_ano, sobre FROM integrantes WHERE id = 't-lu1'`)).toEqual({ nome: 'Lourdes', nascimento_ano: 1940, sobre: 'Fazia doce de leite' });
    expect(todas(`SELECT integrante_id FROM memoria_integrantes WHERE memoria_id = 't-doce'`)).toEqual([{ integrante_id: 't-lu1' }]);
    expect(linha(`SELECT por, registrado_por FROM relatos WHERE memoria_id = 't-doce'`)).toEqual({ por: 't-lu1', registrado_por: 'elizete' });
    // A filiação das duas com a Vó Bela vira uma só, e a de uma com a outra some
    expect(todas(`SELECT filho_id, responsavel_id FROM filiacoes WHERE filho_id = 't-lu1' OR responsavel_id = 't-lu1'`)).toEqual([{ filho_id: 't-lu1', responsavel_id: 'vo-bela' }]);
    expect(linha(`SELECT a_id, b_id FROM casais WHERE b_id = 't-ze'`)).toEqual({ a_id: 't-lu1', b_id: 't-ze' });
    expect(linha(`SELECT pessoa_id FROM lacos_coracao WHERE dono_id = 'elizete' AND nome = 'tia'`)).toEqual({ pessoa_id: 't-lu1' });
    expect(todas(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = 't-lu1' ORDER BY nucleo_id`)).toEqual([{ nucleo_id: 'bayara-nascimento' }, { nucleo_id: 'bracarense' }]);
    const historico = todas<{ item_id: string; dados: string }>(`SELECT item_id, dados FROM versoes WHERE tipo IN ('integrante', 'juntar') AND item_id IN ('t-lu1', 't-lu2')`);
    expect(historico.some((v) => v.item_id === 't-lu2' && JSON.parse(v.dados).juntadaEm === 't-lu1')).toBe(true);
  });

  it('"não são a mesma pessoa" tira o par da lista', async () => {
    sql(`INSERT INTO integrantes (id, nome) VALUES ('t-jo1', 'João Silva'), ('t-jo2', 'João Pedro Silva')`);
    expect(await pedir(gui, { acao: 'nao-sao', a: 't-jo1', b: 't-jo2' })).toContain('saíram da lista');
    expect(JSON.parse(linha<{ valor: string }>(`SELECT valor FROM ajustes WHERE chave = 'nao-sao-duplicados'`).valor)).toContain('t-jo1|t-jo2');
  });
});
