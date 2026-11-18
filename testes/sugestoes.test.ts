// Sugestão de correção (onda 2, decisão do Gui de 17/11/2026): de dados da memória, para quem criou, ou um
// recado a quem registrou um relato. Quem recebe aceita, recusa ou responde. Só quem mandou e quem recebeu
// veem a sugestão, e ela nunca revela uma pessoa que só quem sugere vê. Rota de verdade (api/sugestoes.ts).
import { describe, expect, it, vi } from 'vitest';
import { aplicarProposta, frasesDaProposta, limparProposta } from '../src/lib/sugestoes';
import { fraseDoAviso, saiAoAbrir } from '../src/lib/avisos';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe('as regras da sugestão', () => {
  const atual = { ano: 1999, mes: null, dia: null, lugar: 'Contagem', integrantes: ['gui', 'elizete'] };
  it('só fica o que muda, e só quem pode ser citado', () => {
    const p = limparProposta({ ano: 1998, lugar: 'Contagem', entram: ['aguilar', 'secreta', 'gui'], saem: ['elizete', 'ninguem'] }, atual, (id) => id !== 'secreta');
    expect(p).toEqual({ ano: 1998, mes: null, dia: null, entram: ['aguilar'], saem: ['elizete'] });
    expect(limparProposta({ ano: 1999, lugar: ' Contagem ' }, atual, () => true)).toEqual({});
  });
  it('a proposta em frases e aplicada', () => {
    const p = { ano: 1998, mes: null, dia: null, entram: ['aguilar'], saem: ['elizete'] };
    expect(frasesDaProposta(p, atual, (id) => id.toUpperCase())).toEqual(['Data: 1998 (hoje: 1999)', 'Também estava: AGUILAR', 'Não estava: ELIZETE']);
    expect(aplicarProposta(p, atual)).toMatchObject({ ano: 1998, lugar: 'Contagem', integrantes: ['gui', 'aguilar'] });
  });
  it('o aviso da sugestão só sai com a resposta, e diz o que é', () => {
    expect(saiAoAbrir('sugestao')).toBe(false);
    expect(saiAoAbrir('sugestao-resposta')).toBe(true);
    const nome = (id: string) => id;
    expect(fraseDoAviso({ tipo: 'sugestao', de: 'Elizete', titulo: 'Natal', para: 'gui', dados: {} }, nome)).toBe('Elizete sugeriu uma correção em “Natal”.');
    expect(fraseDoAviso({ tipo: 'sugestao', de: 'Elizete', titulo: 'Natal', para: 'gui', dados: { recado: true } }, nome)).toBe('Elizete deixou um recado sobre o seu relato em “Natal”.');
    expect(fraseDoAviso({ tipo: 'sugestao-resposta', de: 'Gui', titulo: 'Natal', para: 'elizete', dados: { situacao: 'aceita' } }, nome)).toBe('Gui aceitou a sua sugestão em “Natal”.');
  });
});

describe.skipIf(!comSqlite)('a sugestão pela rota', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const rota = await import('../src/pages/api/sugestoes');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const sql = (texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...v);
  const linha = <T>(texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...v) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const [gui, elizete, giovanna] = ['gui', 'elizete', 'giovanna'].map(usuarioDe);
  const pedir = async (quem: Usuario, campos: [string, string][]) => {
    const f = new FormData();
    for (const [k, v] of campos) f.append(k, v);
    const request = new Request('http://localhost/api/sugestoes', { method: 'POST', headers: { Origin: 'http://localhost' }, body: f });
    const r = await rota.POST({ request, locals: { usuario: quem } } as never);
    return decodeURIComponent((r.headers.get('Location') ?? '').replace(/\+/g, ' '));
  };
  sql(`INSERT INTO memorias (id, titulo, ano, tipo, lugar, situacao, criada_por, publicada_em) VALUES ('t-sug', 'Pescaria', 1999, 'causo', 'Contagem', 'publicada', 'gui', datetime('now'))`);
  sql(`INSERT INTO memoria_integrantes VALUES ('t-sug', 'gui'), ('t-sug', 'elizete')`);
  sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, publicado_em) VALUES ('t-sug', 'gui', 'gui', 'Pegamos um peixe', datetime('now'))`);
  // Uma pessoa que só a Elizete vê: num laço "só eu vejo" dela, sem outro laço
  sql(`INSERT INTO integrantes (id, nome) VALUES ('t-secreta', 'Secreta')`);
  sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('elizete', 't-secreta', 'amiga', 1)`);

  it('a Elizete sugere a data e quem estava; a pessoa que só ela vê não entra na sugestão', async () => {
    expect(await pedir(elizete, [['acao', 'sugerir-dados'], ['memoria', 't-sug'], ['ano', '1998'], ['entram', 't-secreta'], ['entram', 'aguilar'], ['texto', 'acho que foi em 1998']])).toContain('Sugestão enviada');
    const s = linha<{ para: string; proposta: string }>(`SELECT para, proposta FROM sugestoes WHERE memoria_id = 't-sug'`);
    expect(s.para).toBe('gui');
    expect(JSON.parse(s.proposta)).toEqual({ ano: 1998, mes: null, dia: null, entram: ['aguilar'] });
    expect(linha(`SELECT tipo FROM avisos WHERE para = 'gui' AND tipo = 'sugestao'`)).toBeDefined();
  });

  it('só quem mandou e quem recebeu veem a sugestão', async () => {
    expect(await repo.listarSugestoes('t-sug', gui)).toHaveLength(1);
    expect(await repo.listarSugestoes('t-sug', elizete)).toHaveLength(1);
    expect(await repo.listarSugestoes('t-sug', giovanna)).toHaveLength(0);
  });

  it('quem mandou não aceita a própria sugestão', async () => {
    const id = linha<{ id: number }>(`SELECT id FROM sugestoes WHERE memoria_id = 't-sug'`).id;
    expect(await pedir(elizete, [['acao', 'aceitar'], ['memoria', 't-sug'], ['sugestao', String(id)]])).toContain('Sugestão não encontrada');
    expect(await pedir(giovanna, [['acao', 'aceitar'], ['memoria', 't-sug'], ['sugestao', String(id)]])).toContain('Sugestão não encontrada');
    expect(linha<{ ano: number }>(`SELECT ano FROM memorias WHERE id = 't-sug'`).ano).toBe(1999);
  });

  it('o Gui aceita: a memória muda, a versão de antes fica e a Elizete recebe a resposta', async () => {
    const id = linha<{ id: number }>(`SELECT id FROM sugestoes WHERE memoria_id = 't-sug'`).id;
    expect(await pedir(gui, [['acao', 'aceitar'], ['memoria', 't-sug'], ['sugestao', String(id)], ['texto', 'Verdade!']])).toContain('Sugestão aceita');
    expect(linha<{ ano: number }>(`SELECT ano FROM memorias WHERE id = 't-sug'`).ano).toBe(1998);
    expect(linha(`SELECT integrante_id FROM memoria_integrantes WHERE memoria_id = 't-sug' AND integrante_id = 'aguilar'`)).toBeDefined();
    expect(linha(`SELECT id FROM versoes WHERE tipo = 'memoria' AND item_id = 't-sug'`)).toBeDefined();
    expect(linha(`SELECT situacao, resposta FROM sugestoes WHERE id = ?`, id)).toEqual({ situacao: 'aceita', resposta: 'Verdade!' });
    expect(linha(`SELECT resolvido_em FROM avisos WHERE para = 'gui' AND tipo = 'sugestao'`)).not.toEqual({ resolvido_em: null });
    expect(linha(`SELECT de FROM avisos WHERE para = 'elizete' AND tipo = 'sugestao-resposta'`)).toEqual({ de: 'gui' });
    // Respondida, não se responde de novo
    expect(await pedir(gui, [['acao', 'recusar'], ['memoria', 't-sug'], ['sugestao', String(id)]])).toContain('já foi respondida');
  });

  it('o recado vai para quem registrou o relato, e quem registrou não manda recado a si mesmo', async () => {
    const relato = linha<{ id: number }>(`SELECT id FROM relatos WHERE memoria_id = 't-sug'`).id;
    expect(await pedir(elizete, [['acao', 'recado'], ['memoria', 't-sug'], ['relato', String(relato)], ['texto', 'O peixe era maior!']])).toContain('Recado enviado');
    expect(linha(`SELECT para, tipo FROM sugestoes WHERE relato_id = ?`, relato)).toEqual({ para: 'gui', tipo: 'recado' });
    expect(await pedir(gui, [['acao', 'recado'], ['memoria', 't-sug'], ['relato', String(relato)], ['texto', 'oi']])).toContain('O relato é seu');
  });

  it('quem criou não sugere à própria memória, e quem não vê a memória recebe o mesmo que para uma que não existe', async () => {
    expect(await pedir(gui, [['acao', 'sugerir-dados'], ['memoria', 't-sug'], ['ano', '2000']])).toContain('Você criou esta memória');
    sql(`INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por) VALUES ('t-sug-bayara', 'Só Bracarense', 1999, 'causo', 'nucleos', 'publicada', 'lucas-magno')`);
    sql(`INSERT INTO memoria_nucleos VALUES ('t-sug-bayara', 'bracarense')`);
    expect(await pedir(elizete, [['acao', 'sugerir-dados'], ['memoria', 't-sug-bayara'], ['ano', '2000']])).toContain('Memória não encontrada');
  });

  it('o espelho e o apagar de vez levam as sugestões junto', async () => {
    const { TABELAS_APAGADAS } = await import('../src/lib/espelho');
    expect(TABELAS_APAGADAS.indexOf('sugestoes')).toBeLessThan(TABELAS_APAGADAS.indexOf('memorias'));
  });
});
