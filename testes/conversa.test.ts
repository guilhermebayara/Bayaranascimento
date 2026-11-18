// O relato como conversa (escolha do Gui depois da sessão I, 18/11/2026; respostas às perguntas da
// construção no mesmo dia). As regras em src/lib/conversa.ts e a rota do relato sobre o banco SQLite em
// memória (testes/apoio/d1.ts): cada envio é uma mensagem, numa ordem só; primeiro publicar, depois cada
// mensagem nova entra na hora; editar guarda versão, só acrescentar não; a citação só de uma mensagem
// publicada de outra pessoa da mesma memória; os relatos de antes passam sem perda.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import { diaDe, fraseDoDia, mensagensDerivadas, mensagensDoRelato, paragrafos, quebrasDeDia, soAcrescentou, textoDasMensagens, trechoDaCitacao } from '../src/lib/conversa';

describe('as regras da conversa', () => {
  it('o relato de antes vira os áudios, cada parágrafo e as fotos, nessa ordem', () => {
    expect(mensagensDerivadas('Um.\n\nDois.\n\n\nTrês.', [7, 8], [3])).toEqual([
      { tipo: 'audio', audioId: 7 },
      { tipo: 'audio', audioId: 8 },
      { tipo: 'texto', texto: 'Um.' },
      { tipo: 'texto', texto: 'Dois.' },
      { tipo: 'texto', texto: 'Três.' },
      { tipo: 'foto', fotoId: 3 },
    ]);
  });
  it('as gravadas valem; o áudio que saiu some, e o que chegou por fora entra no fim', () => {
    const gravadas = [
      { id: 1, tipo: 'texto' as const, texto: 'Oi' },
      { id: 2, tipo: 'audio' as const, audioId: 9 },
      { id: 3, tipo: 'audio' as const, audioId: 10 },
    ];
    expect(mensagensDoRelato(gravadas, 'ignorado', [10, 11], []).map((m) => m.audioId ?? m.texto)).toEqual(['Oi', 10, 11]);
    expect(mensagensDoRelato([], 'Texto', [5], []).map((m) => m.tipo)).toEqual(['audio', 'texto']);
  });
  it('o texto do relato, que o resto do site lê, sai das mensagens de texto', () => {
    expect(textoDasMensagens([{ tipo: 'texto', texto: ' A ' }, { tipo: 'audio', audioId: 1 }, { tipo: 'texto', texto: 'B' }])).toBe('A\n\nB');
  });
  it('só acrescentar no fim não guarda versão; editar, mover e apagar guardam', () => {
    const antes = [
      { id: 1, tipo: 'texto' as const, texto: 'A' },
      { id: 2, tipo: 'audio' as const, audioId: 4 },
    ];
    expect(soAcrescentou(antes, [...antes, { tipo: 'texto', texto: 'C' }])).toBe(true);
    expect(soAcrescentou(antes, [{ ...antes[0], texto: 'A, corrigido' }, antes[1]])).toBe(false);
    expect(soAcrescentou(antes, [antes[1], antes[0]])).toBe(false);
    expect(soAcrescentou(antes, [antes[0]])).toBe(false);
    // O relato de antes, sem ids, comparado pelo conteúdo
    expect(soAcrescentou([{ tipo: 'texto', texto: 'A' }], [{ id: 5, tipo: 'texto', texto: 'A' }, { tipo: 'texto', texto: 'B' }])).toBe(true);
  });
  it('"Contou mais em" só quando muda o dia, no fuso de São Paulo', () => {
    expect(diaDe('2026-12-04 01:00:00')).toBe('2026-12-03');
    expect(quebrasDeDia([{ enviadaEm: '2026-11-18 12:00:00' }, { enviadaEm: '2026-11-18 20:00:00' }]).size).toBe(0);
    const quebras = quebrasDeDia([{ enviadaEm: '2026-11-18 12:00:00' }, { enviadaEm: '2026-11-18 13:00:00' }, { enviadaEm: '2026-12-04 15:00:00' }, { enviadaEm: '2026-12-04 16:00:00' }]);
    expect([...quebras]).toEqual([[2, '2026-12-04']]);
    expect(fraseDoDia('2026-12-03')).toBe('Contou mais em 3 de dezembro de 2026');
  });
  it('a citação mostra o começo, numa linha', () => {
    expect(trechoDaCitacao('um dois três', 2)).toBe('um dois…');
  });
});

describe('os parágrafos que viram mensagens', () => {
  it('sem script, o navegador manda "\\r\\n", e cada parágrafo continua uma mensagem (QA de 18/11/2026)', () => {
    expect(paragrafos('A\r\n\r\nB')).toEqual(['A', 'B']);
    expect(paragrafos('A\n\nB\n\n\nC')).toEqual(['A', 'B', 'C']);
    expect(paragrafos('A\n \nB')).toEqual(['A', 'B']);
    expect(paragrafos('Linha um\r\nlinha dois')).toEqual(['Linha um\nlinha dois']);
  });
});

describe('as telas da conversa', () => {
  const ler = (c: string) => readFileSync(c, 'utf8');
  it('a memória mostra cada pessoa como uma voz, com as reações do relato inteiro no fim', () => {
    const pagina = ler('src/pages/memorias/[id].astro');
    expect(pagina).toContain('<Voz');
    expect(pagina).toMatch(/<div slot="pe" class="acoes-do-item">\s*<Reacoes memoria=\{memoria\.id\} alvo="relato"/);
    expect(pagina).toContain('`/memorias/${memoria.id}/relato?cita=`');
  });
  it('a janela: Enter envia, Shift e Enter muda de linha, e cada mensagem tem editar, subir, descer e apagar', () => {
    const cliente = ler('src/lib/cliente/conversa.ts');
    expect(cliente).toContain("if (e.key === 'Enter' && !e.shiftKey && !e.isComposing)");
    for (const acao of ['data-editar', 'data-mover="-1"', 'data-mover="1"', 'data-apagar']) expect(cliente).toContain(acao);
  });
});

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('a conversa no banco', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const { POST } = await import('../src/pages/api/relatos');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const linha = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...valores) as T;
  const todas = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).all(...valores) as T[];
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = todas<{ nucleo_id: string }>(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const gui = usuarioDe('gui');
  const MEMORIA = '1992-chegada-do-gui';
  const enviar = async (quem: Usuario, corpo: Record<string, unknown>) => {
    const request = new Request('http://localhost/api/relatos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
      body: JSON.stringify({ memoria: MEMORIA, por: quem.pessoa, ...corpo }),
    });
    const resposta = await POST({ request, locals: { usuario: quem } } as unknown as Parameters<typeof POST>[0]);
    return { status: resposta.status, corpo: (await resposta.json()) as { mensagens?: { id: number; texto?: string; citaId?: number | null }[]; situacao?: string; erro?: string } };
  };
  const versoes = (relato: number) => linha<{ n: number }>(`SELECT COUNT(*) AS n FROM versoes WHERE tipo = 'relato' AND item_id = ?`, String(relato)).n;

  it('os relatos de antes ganharam as mensagens deles, sem perda', () => {
    const semMensagem = linha<{ n: number }>('SELECT COUNT(*) AS n FROM relatos r WHERE NOT EXISTS (SELECT 1 FROM relato_mensagens m WHERE m.relato_id = r.id)').n;
    expect(semMensagem).toBe(0);
    const daVoBela = todas<{ tipo: string }>(`SELECT m.tipo FROM relato_mensagens m JOIN relatos r ON r.id = m.relato_id WHERE r.memoria_id = ? AND r.por = 'vo-bela' ORDER BY m.ordem`, MEMORIA);
    expect(daVoBela.map((m) => m.tipo)).toEqual(['audio', 'texto']);
  });

  it('apagar o único áudio de um relato tira o áudio (QA de 18/11/2026: "NOT IN (NULL)" nunca tirava)', async () => {
    const r = linha<{ id: number; memoria_id: string; registrado_por: string }>(
      `SELECT r.id, r.memoria_id, r.registrado_por FROM relatos r WHERE (SELECT COUNT(*) FROM audios a WHERE a.relato_id = r.id AND a.removido_em IS NULL) = 1 LIMIT 1`,
    );
    expect(r).toBeDefined();
    await repo.ligarAudios(r.id, r.memoria_id, [], usuarioDe(r.registrado_por));
    expect(linha<{ n: number }>('SELECT COUNT(*) AS n FROM audios WHERE relato_id = ? AND removido_em IS NULL', r.id).n).toBe(0);
    banco.sqlite.prepare('UPDATE audios SET removido_em = NULL WHERE relato_id = ?').run(r.id);
  });

  it('primeiro publicar: o relato nasce rascunho, e depois cada mensagem nova entra na hora, sem versão', async () => {
    const primeira = await enviar(gui, { situacao: 'rascunho', mensagens: [{ tipo: 'texto', texto: 'Cheguei quietinho.' }] });
    expect(primeira.status).toBe(201);
    expect(primeira.corpo.situacao).toBe('rascunho');
    const id = primeira.corpo.mensagens![0].id;
    const publicado = await enviar(gui, { situacao: 'publicada', mensagens: [{ id, tipo: 'texto', texto: 'Cheguei quietinho.' }] });
    expect(publicado.corpo.situacao).toBe('publicada');
    const relato = linha<{ id: number; texto: string }>(`SELECT id, texto FROM relatos WHERE memoria_id = ? AND por = 'gui'`, MEMORIA);
    const antes = versoes(relato.id);
    // Voltar e contar mais: acrescentar no fim não guarda versão, e o rascunho não volta
    const mais = await enviar(gui, { situacao: 'rascunho', mensagens: [{ id, tipo: 'texto', texto: 'Cheguei quietinho.' }, { tipo: 'texto', texto: 'E com fome.' }] });
    expect(mais.corpo.situacao).toBe('publicada');
    expect(versoes(relato.id)).toBe(antes);
    expect(linha<{ texto: string }>('SELECT texto FROM relatos WHERE id = ?', relato.id).texto).toBe('Cheguei quietinho.\n\nE com fome.');
    // Editar guarda a versão de antes, com as mensagens
    const [a, b] = mais.corpo.mensagens!;
    await enviar(gui, { mensagens: [{ id: a.id, tipo: 'texto', texto: 'Cheguei bem quietinho.' }, { id: b.id, tipo: 'texto', texto: 'E com fome.' }] });
    expect(versoes(relato.id)).toBe(antes + 1);
    const versao = JSON.parse(linha<{ dados: string }>(`SELECT dados FROM versoes WHERE tipo = 'relato' AND item_id = ? ORDER BY id DESC LIMIT 1`, String(relato.id)).dados);
    expect(versao.mensagens.map((m: { texto: string }) => m.texto)).toEqual(['Cheguei quietinho.', 'E com fome.']);
    // O id da mensagem se mantém ao editar, para quem a cita
    expect(todas<{ id: number }>('SELECT id FROM relato_mensagens WHERE relato_id = ? ORDER BY ordem', relato.id).map((m) => m.id)).toEqual([a.id, b.id]);
  });

  it('a citação: só de uma mensagem publicada de outra pessoa, nesta memória', async () => {
    const daElizete = linha<{ id: number }>(`SELECT m.id FROM relato_mensagens m JOIN relatos r ON r.id = m.relato_id WHERE r.memoria_id = ? AND r.por = 'elizete' AND r.situacao = 'publicada' LIMIT 1`, MEMORIA).id;
    const minha = linha<{ id: number }>(`SELECT m.id FROM relato_mensagens m JOIN relatos r ON r.id = m.relato_id WHERE r.memoria_id = ? AND r.por = 'gui' LIMIT 1`, MEMORIA).id;
    const deOutraMemoria = linha<{ id: number }>(`SELECT m.id FROM relato_mensagens m JOIN relatos r ON r.id = m.relato_id WHERE r.memoria_id <> ? AND r.situacao = 'publicada' LIMIT 1`, MEMORIA).id;
    const atuais = todas<{ id: number; texto: string }>(`SELECT m.id, m.texto FROM relato_mensagens m JOIN relatos r ON r.id = m.relato_id WHERE r.memoria_id = ? AND r.por = 'gui' ORDER BY m.ordem`, MEMORIA);
    const r = await enviar(gui, {
      mensagens: [
        ...atuais.map((m) => ({ id: m.id, tipo: 'texto', texto: m.texto })),
        { tipo: 'texto', texto: 'Era de manhã.', citaId: daElizete },
        { tipo: 'texto', texto: 'Cito a mim mesmo.', citaId: minha },
        { tipo: 'texto', texto: 'Cito outra memória.', citaId: deOutraMemoria },
      ],
    });
    expect(r.corpo.mensagens!.slice(-3).map((m) => m.citaId)).toEqual([daElizete, null, null]);
  });

  it('a lista vazia é recusada: um relato precisa de pelo menos uma mensagem', async () => {
    const r = await enviar(gui, { mensagens: [] });
    expect(r.status).toBe(400);
  });
});
