// A busca (docs/regras/explorar.md, "A busca"): quem vê o quê, sobre o acervo de exemplo, num banco SQLite em
// memória (testes/apoio/d1.ts), com a consulta de verdade (src/lib/servidor/busca.ts) e o índice da migração 116.
//
// Os casos do relatório da exploração E2 (docs/historico/briefs/busca-no-explorar.md): o relato que espera em
// "Casamento da Prima Carol", um rascunho de relato, uma memória restrita a uma família, o rascunho de memória,
// o ex deixado discreto e a pessoa que só existe num laço privado de outra pessoa. E os da aplicação: a legenda
// da foto que a pessoa não vê e a transcrição do áudio removido. O que a pessoa não vê não acha nada, não vira
// trecho, sugestão nem contagem. Cada caso vale pelos dois caminhos: o da folha (as memórias lidas pelo id) e o
// do Explorar (as memórias que a página já leu).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('busca: quem vê o quê', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  const repo = await import('../src/lib/servidor/repositorio');
  const { buscarNoAcervo, folhaDaBusca } = await import('../src/lib/servidor/busca');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;

  const usuarioDe = (pessoa: string): Usuario => {
    const i = banco.sqlite.prepare('SELECT nome, admin FROM integrantes WHERE id = ?').get(pessoa) as { nome: string; admin: number };
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const sql = (texto: string, ...valores: unknown[]) => banco.sqlite.prepare(texto).run(...(valores as never[]));
  /** A busca pelo caminho da folha e pelo do Explorar: os dois precisam dar o mesmo */
  const busca = async (quem: string, texto: string) => {
    const u = usuarioDe(quem);
    const tipos = await repo.listarTipos();
    const pelaFolha = await buscarNoAcervo(u, tipos, texto);
    const peloExplorar = await buscarNoAcervo(u, tipos, texto, await repo.listarMemorias(u));
    const resumo = (r: typeof pelaFolha) => ({ achados: r.achados, pessoas: r.pessoas.map(({ integrante: _, ...p }) => p), capitulos: r.capitulos, temas: r.temas });
    expect(resumo(peloExplorar), `${quem} procura “${texto}”`).toEqual(resumo(pelaFolha));
    return pelaFolha;
  };
  const achados = async (quem: string, texto: string) => (await busca(quem, texto)).achados.map((a) => a.id);
  const pessoasAchadas = async (quem: string, texto: string) => (await busca(quem, texto)).pessoas;
  /** Todo texto que a busca de alguém pode mostrar: títulos, nomes, trechos, contagens */
  const tudoQueMostra = async (quem: string, texto: string) => {
    const r = await busca(quem, texto);
    return JSON.stringify({ ...r, memorias: [...r.memorias.values()], pessoas: r.pessoas.map(({ integrante: _, ...p }) => p) });
  };

  beforeAll(async () => {
    await prepararBanco();
  });

  it('a Elizete acha "aquele Natal na casa da vó" em primeiro lugar, e a mãe dela por "minha mãe"', async () => {
    expect((await achados('elizete', 'aquele Natal na casa da vó'))[0]).toBe('1994-natal-na-vo-vivica');
    const pessoas = await pessoasAchadas('elizete', 'minha mãe');
    expect(pessoas.map((p) => p.id)).toContain('vo-vivica');
    expect(pessoas.find((p) => p.id === 'vo-vivica')?.parentesco).toBe('sua mãe');
    expect(await achados('elizete', 'sabara')).toContain('1994-natal-na-vo-vivica');
  });

  it('acha no texto dos relatos publicados e nas transcrições dos áudios', async () => {
    expect(await achados('gui', 'faltou luz vela')).toEqual(['2006-natal-sem-luz']);
    // "panela" só existe na transcrição do áudio da Vó Bela em "A chegada do Gui"
    const [achado] = (await busca('gui', 'panela')).achados;
    expect(achado?.id).toBe('1992-chegada-do-gui');
    expect(achado?.motivos[0]).toMatchObject({ campo: 'audio' });
  });

  it('o relato que espera em "Casamento da Prima Carol" só é achado por quem já pode lê-lo', async () => {
    const espera = banco.sqlite.prepare(`SELECT texto FROM relatos WHERE so_para_nucleos IS NOT NULL AND memoria_id = '2012-casamento-carol-davi'`).get() as { texto: string } | undefined;
    expect(espera?.texto).toContain('buquê');
    // O Magno não é da família Bayara Nascimento: o relato espera o sim da Giovanna para ele
    expect(await achados('lucas-magno', 'buquê treze anos')).toEqual([]);
    expect(await tudoQueMostra('lucas-magno', 'buquê')).not.toContain('Peguei o buquê');
    expect(await achados('gui', 'buquê treze anos')).toEqual(['2012-casamento-carol-davi']);
    expect(await achados('giovanna', 'buquê treze anos')).toEqual(['2012-casamento-carol-davi']);
  });

  it('rascunho de relato nunca é achado, nem por quem escreveu', async () => {
    const rascunhos = banco.sqlite.prepare(`SELECT texto FROM relatos WHERE situacao = 'rascunho'`).all() as { texto: string }[];
    expect(rascunhos.length).toBeGreaterThan(0);
    for (const quem of ['gui', 'giovanna', 'elizete', 'lucas-magno']) {
      for (const r of rascunhos) {
        const palavras = r.texto.split(/\s+/).filter((p) => p.length > 4).slice(0, 3).join(' ');
        expect(await tudoQueMostra(quem, palavras)).not.toContain(r.texto.slice(0, 40));
      }
    }
    expect(await achados('elizete', 'rascunho exemplo dentro publicar')).toEqual([]);
  });

  it('rascunho de memória nunca é achado, nem por quem escreveu', async () => {
    expect(await achados('giovanna', 'lista convidados')).toEqual([]);
  });

  it('a memória restrita a uma família só é achada por quem é dela', async () => {
    expect(await achados('gui', 'serra cipó')).toEqual([]);
    expect(await achados('elizete', 'serra cipó')).toEqual([]);
    expect(await achados('lucas-magno', 'serra cipó')).toEqual(['2022-serra-dos-bracarense']);
    // Nem a pessoa da memória restrita vira sugestão para quem não a vê por outro caminho
    expect((await pessoasAchadas('elizete', 'Dudu')).every((p) => p.memorias > 0)).toBe(true);
    expect(await achados('elizete', 'primeira noite casa nova')).toEqual([]);
  });

  it('as contagens das pessoas só somam memórias que quem procura vê', async () => {
    const vistas = new Set((await repo.listarMemorias(usuarioDe('elizete'))).map((m) => m.id));
    for (const p of await pessoasAchadas('elizete', 'Giovanna')) {
      const conta = [...vistas].filter((id) => (banco.sqlite.prepare('SELECT 1 FROM memoria_integrantes WHERE memoria_id = ? AND integrante_id = ?').get(id, p.id) as unknown) !== undefined).length;
      expect(p.memorias).toBe(conta);
    }
  });

  it('o ex que a pessoa deixou discreto não é achado pelo nome', async () => {
    expect((await pessoasAchadas('elizete', 'Aguilar')).map((p) => p.id)).toContain('aguilar');
    banco.sqlite.prepare(`INSERT INTO ex_para_mim (dono_id, pessoa_id, modo) VALUES ('elizete', 'aguilar', 'discreto')`).run();
    try {
      expect((await pessoasAchadas('elizete', 'Aguilar'))).toEqual([]);
      // Para os outros, nada muda
      expect((await pessoasAchadas('gui', 'Aguilar')).map((p) => p.id)).toContain('aguilar');
    } finally {
      banco.sqlite.prepare(`DELETE FROM ex_para_mim WHERE dono_id = 'elizete' AND pessoa_id = 'aguilar'`).run();
    }
  });

  it('quem só existe num laço privado de outra pessoa não é achado por mais ninguém', async () => {
    banco.sqlite.prepare(`INSERT INTO integrantes (id, nome, tipo, criado_por) VALUES ('so-do-gui', 'Zuleica Secreta', 'pessoa', 'gui')`).run();
    banco.sqlite.prepare(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('gui', 'so-do-gui', 'amiga', 1)`).run();
    banco.sqlite.prepare(`INSERT INTO memoria_integrantes (memoria_id, integrante_id) VALUES ('2006-natal-sem-luz', 'so-do-gui')`).run();
    try {
      expect((await pessoasAchadas('gui', 'Zuleica')).map((p) => p.id)).toEqual(['so-do-gui']);
      for (const quem of ['giovanna', 'elizete', 'lucas-magno']) {
        expect((await pessoasAchadas(quem, 'Zuleica'))).toEqual([]);
        expect(await achados(quem, 'Zuleica')).toEqual([]);
        expect(await tudoQueMostra(quem, 'natal luz')).not.toContain('Zuleica');
      }
    } finally {
      banco.sqlite.prepare(`DELETE FROM memoria_integrantes WHERE integrante_id = 'so-do-gui'`).run();
      banco.sqlite.prepare(`DELETE FROM lacos_coracao WHERE pessoa_id = 'so-do-gui'`).run();
      banco.sqlite.prepare(`DELETE FROM integrantes WHERE id = 'so-do-gui'`).run();
    }
  });

  it('acha pela legenda da foto, com o trecho, só da foto que a pessoa vê', async () => {
    // "A Giovanna pegando o buquê" só está na legenda de uma foto do casamento
    const [achado] = (await busca('elizete', 'pegando')).achados;
    expect(achado?.id).toBe('2012-casamento-carol-davi');
    expect(achado?.motivos[0]).toMatchObject({ campo: 'legenda', trecho: { achado: 'pegando' } });
    // A foto removida deixa de achar
    const foto = banco.sqlite.prepare(`SELECT id FROM fotos WHERE legenda = 'A Giovanna pegando o buquê'`).get() as { id: number };
    sql(`UPDATE fotos SET removida_em = datetime('now') WHERE id = ?`, foto.id);
    try {
      expect(await achados('elizete', 'pegando')).toEqual([]);
    } finally {
      sql(`UPDATE fotos SET removida_em = NULL WHERE id = ?`, foto.id);
    }
    expect(await achados('elizete', 'pegando')).toEqual(['2012-casamento-carol-davi']);
  });

  it('a legenda de uma foto restrita não é achada por quem não a vê', async () => {
    // Na memória restrita à família Bracarense
    sql(`INSERT INTO fotos (memoria_id, chave, legenda, principal, ordem, enviada_por) VALUES ('2022-serra-dos-bracarense', '', 'Cachoeira do Tabuleiro ao fundo', 0, 9, 'lucas-magno')`);
    // E na foto que veio com o relato que espera, no casamento que todos veem
    const espera = banco.sqlite.prepare(`SELECT id, registrado_por FROM relatos WHERE so_para_nucleos IS NOT NULL AND memoria_id = '2012-casamento-carol-davi'`).get() as { id: number; registrado_por: string };
    sql(`INSERT INTO fotos (memoria_id, chave, legenda, principal, ordem, enviada_por, relato_id) VALUES ('2012-casamento-carol-davi', '', 'Bolo de três andares derretendo', 0, 9, ?, ?)`, espera.registrado_por, espera.id);
    try {
      expect(await achados('lucas-magno', 'tabuleiro')).toEqual(['2022-serra-dos-bracarense']);
      for (const quem of ['gui', 'elizete']) {
        expect(await achados(quem, 'tabuleiro')).toEqual([]);
        expect(await tudoQueMostra(quem, 'cachoeira tabuleiro')).not.toContain('Tabuleiro');
      }
      // Quem já lê o relato acha pela foto dele; o Magno, que ainda espera, não
      expect(await achados('gui', 'bolo derretendo')).toEqual(['2012-casamento-carol-davi']);
      expect(await achados('lucas-magno', 'bolo derretendo')).toEqual([]);
      expect(await tudoQueMostra('lucas-magno', 'bolo derretendo')).not.toContain('derretendo');
    } finally {
      sql(`DELETE FROM fotos WHERE legenda IN ('Cachoeira do Tabuleiro ao fundo', 'Bolo de três andares derretendo')`);
    }
  });

  it('a transcrição de um áudio removido não é achada', async () => {
    expect(await achados('gui', 'panela')).toEqual(['1992-chegada-do-gui']);
    const audio = banco.sqlite.prepare(`SELECT id FROM audios WHERE transcricao LIKE '%panela%'`).get() as { id: number };
    sql(`UPDATE audios SET removido_em = datetime('now') WHERE id = ?`, audio.id);
    try {
      expect(await achados('gui', 'panela')).toEqual([]);
      expect(await tudoQueMostra('gui', 'canja hospital')).not.toContain('panela');
    } finally {
      sql(`UPDATE audios SET removido_em = NULL WHERE id = ?`, audio.id);
    }
    expect(await achados('gui', 'panela')).toEqual(['1992-chegada-do-gui']);
  });

  it('o resultado vazio é igual para o que não existe e para o que a pessoa não vê', async () => {
    const vazio = async (quem: string, texto: string) => {
      const r = await busca(quem, texto);
      return { achados: r.achados.length, pessoas: r.pessoas.length, capitulos: r.capitulos.length, temas: r.temas.length, memorias: r.memorias.size };
    };
    const nada = { achados: 0, pessoas: 0, capitulos: 0, temas: 0, memorias: 0 };
    expect(await vazio('elizete', 'serra cipó')).toEqual(nada);
    expect(await vazio('elizete', 'bicicleta vermelha')).toEqual(nada);
    expect(await vazio('lucas-magno', 'buquê treze anos')).toEqual(nada);
  });

  describe('o índice acompanha cada gravação (migração 116)', () => {
    const linhasDoIndice = (memoria: string) => banco.sqlite.prepare(`SELECT campo, texto FROM busca_textos WHERE memoria_id = ? ORDER BY id`).all(memoria);

    it('o índice começa com o que já existia e só com relato publicado', () => {
      const rascunho = banco.sqlite.prepare(`SELECT count(*) AS n FROM busca_textos t JOIN relatos r ON r.id = t.ref AND t.campo = 'relato' WHERE r.situacao <> 'publicada'`).get() as { n: number };
      expect(rascunho.n).toBe(0);
      const titulos = banco.sqlite.prepare(`SELECT count(*) AS n FROM busca_textos WHERE campo = 'titulo'`).get() as { n: number };
      const memorias = banco.sqlite.prepare(`SELECT count(*) AS n FROM memorias`).get() as { n: number };
      expect(titulos.n).toBe(memorias.n);
      // O FTS5 tem uma linha por texto, e confere com o conteúdo
      expect(() => banco.sqlite.prepare(`INSERT INTO busca_indice (busca_indice, rank) VALUES ('integrity-check', 1)`).run()).not.toThrow();
    });

    it('o título e o lugar mudados acham pelo novo, e não pelo velho', async () => {
      sql(`UPDATE memorias SET titulo = 'Ceia à luz de lampião', lugar = 'Caeté' WHERE id = '2006-natal-sem-luz'`);
      try {
        expect(await achados('gui', 'lampião caeté')).toEqual(['2006-natal-sem-luz']);
        expect(await achados('gui', 'faltou')).toEqual([]);
      } finally {
        sql(`UPDATE memorias SET titulo = 'O Natal em que faltou luz', lugar = 'Sabará' WHERE id = '2006-natal-sem-luz'`);
      }
      expect(linhasDoIndice('2006-natal-sem-luz')).toContainEqual({ campo: 'titulo', texto: 'O Natal em que faltou luz' });
    });

    it('a memória na lixeira não é achada; restaurada, volta', async () => {
      sql(`UPDATE memorias SET excluida_em = datetime('now') WHERE id = '2006-natal-sem-luz'`);
      try {
        expect(await achados('gui', 'faltou luz')).toEqual([]);
      } finally {
        sql(`UPDATE memorias SET excluida_em = NULL WHERE id = '2006-natal-sem-luz'`);
      }
      expect(await achados('gui', 'faltou luz')).toEqual(['2006-natal-sem-luz']);
    });

    it('o relato entra no índice quando é publicado, e sai quando é apagado', async () => {
      const rascunho = banco.sqlite.prepare(`SELECT r.id, r.memoria_id, r.registrado_por FROM relatos r JOIN memorias m ON m.id = r.memoria_id WHERE r.situacao = 'rascunho' AND m.situacao = 'publicada' AND m.visibilidade = 'todos' AND r.so_para_nucleos IS NULL LIMIT 1`).get() as { id: number; memoria_id: string; registrado_por: string };
      const texto = (banco.sqlite.prepare(`SELECT texto FROM relatos WHERE id = ?`).get(rascunho.id) as { texto: string }).texto;
      sql(`UPDATE relatos SET texto = 'Xilofone desafinado na sala', situacao = 'publicada' WHERE id = ?`, rascunho.id);
      try {
        expect(await achados(rascunho.registrado_por, 'xilofone')).toEqual([rascunho.memoria_id]);
      } finally {
        sql(`UPDATE relatos SET texto = ?, situacao = 'rascunho' WHERE id = ?`, texto, rascunho.id);
      }
      expect(await achados(rascunho.registrado_por, 'xilofone')).toEqual([]);
      expect(banco.sqlite.prepare(`SELECT count(*) AS n FROM busca_textos WHERE campo = 'relato' AND ref = ?`).get(rascunho.id)).toEqual({ n: 0 });
    });

    it('a memória apagada de vez leva junto as linhas dela', () => {
      sql(`INSERT INTO memorias (id, titulo, ano, tipo, lugar, criada_por) VALUES ('busca-de-vez', 'Quermesse de junho', 1999, 'festa', 'Rio Acima', 'gui')`);
      expect(linhasDoIndice('busca-de-vez').length).toBe(2);
      sql(`DELETE FROM memorias WHERE id = 'busca-de-vez'`);
      expect(linhasDoIndice('busca-de-vez')).toEqual([]);
    });
  });

  it('o índice nunca acha menos que a regra: toda palavra que acha aceita, o FTS5 devolve', async () => {
    const { acha, consultaDoIndice, normalizar, termos } = await import('../src/lib/busca');
    const palavras = ['Natal', 'Natais', 'natalino', 'Sabará', 'vó', 'Vovó', 'voltou', 'casamento', 'casamentos', 'pães', 'pão', 'papéis', 'papel', 'anéis', 'trens', 'trem', 'luzes', 'luz', 'flores', 'Ação', 'ações', '1994', '19945', 'mãe', 'Mamãe', 'São João', 'cão', 'cães', 'jornal', 'jornais', 'sol', 'sóis', 'azul', 'azuis', 'ceia', 'Tabuleiro'];
    banco.sqlite.exec(`CREATE VIRTUAL TABLE prova_do_indice USING fts5(texto, tokenize='unicode61 remove_diacritics 2')`);
    try {
      for (const p of palavras) banco.sqlite.prepare(`INSERT INTO prova_do_indice (texto) VALUES (?)`).run(p);
      const procuras = ['natal', 'natais', 'nata', 'sabara', 'sab', 'vo', 'vovo', 'casamento', 'casamentos', 'pao', 'paes', 'papel', 'papeis', 'anel', 'trem', 'trens', 'luz', 'luzes', 'flor', 'acao', 'acoes', '1994', 'mae', 'sao', 'cao', 'caes', 'jornal', 'sol', 'azul', 'ceias', 'tabuleiros'];
      for (const procura of procuras) {
        const [termo] = termos(procura);
        const doIndice = new Set((banco.sqlite.prepare(`SELECT texto FROM prova_do_indice WHERE prova_do_indice MATCH ?`).all(consultaDoIndice(termo!)) as { texto: string }[]).map((l) => l.texto));
        for (const p of palavras) {
          const pelaRegra = normalizar(p).split(/[^\p{L}\p{N}]+/u).some((w) => w && acha(termo!, w));
          if (pelaRegra) expect(doIndice.has(p), `“${procura}” acha “${p}”`).toBe(true);
        }
      }
    } finally {
      banco.sqlite.exec(`DROP TABLE prova_do_indice`);
    }
  });

  describe('o relato que espera com a lista vazia (MEM-3, defeito 1; docs/regras/permissoes.md)', () => {
    // O relato da Vó Bela em "A chegada do Gui", com o áudio da "panela", e uma foto que veio com ele
    const relato = () => banco.sqlite.prepare(`SELECT r.id, r.texto, r.registrado_por, r.so_para_nucleos FROM relatos r JOIN audios a ON a.relato_id = r.id WHERE a.transcricao LIKE '%panela%'`).get() as { id: number; texto: string; registrado_por: string; so_para_nucleos: string | null };
    /** As três rotas: a folha e /busca (folhaDaBusca, as duas) e o Explorar com q (busca compara a folha com ele) */
    const tudo = async (quem: string, texto: string) => {
      const r = await busca(quem, texto);
      const folha = await folhaDaBusca(usuarioDe(quem), await repo.listarTipos(), texto);
      return { ids: r.achados.map((a) => a.id), naFolha: folha.memorias.map((m) => m.id), total: folha.total, mostra: JSON.stringify({ ...folha, busca: '' }) + JSON.stringify(r.achados) };
    };
    const comEspera = async (valor: string | null, conferir: () => Promise<void>) => {
      const antes = relato();
      sql(`UPDATE relatos SET texto = ?, so_para_nucleos = ? WHERE id = ?`, `${antes.texto} Zabumbeiro de festa junina.`, valor, antes.id);
      sql(`INSERT INTO fotos (memoria_id, chave, legenda, principal, ordem, enviada_por, relato_id) VALUES ('1992-chegada-do-gui', '', 'Caldeirão de alumínio areado', 0, 9, ?, ?)`, antes.registrado_por, antes.id);
      try {
        await conferir();
      } finally {
        sql(`DELETE FROM fotos WHERE legenda = 'Caldeirão de alumínio areado'`);
        sql(`UPDATE relatos SET texto = ?, so_para_nucleos = ? WHERE id = ?`, antes.texto, antes.so_para_nucleos, antes.id);
      }
    };
    const PALAVRAS = { texto: 'zabumbeiro', transcricao: 'panela', legenda: 'caldeirão areado' };

    it("com '[]', só quem registrou acha pelo texto, pela transcrição e pela legenda; os outros não acham nada, nem trecho", async () => {
      const quem = relato().registrado_por;
      const outros = ['gui', 'giovanna', 'elizete', 'lucas-magno'].filter((p) => p !== quem);
      expect(outros.length).toBeGreaterThan(0);
      await comEspera('[]', async () => {
        for (const [campo, palavra] of Object.entries(PALAVRAS)) {
          expect((await tudo(quem, palavra)).ids, `${quem}, ${campo}`).toEqual(['1992-chegada-do-gui']);
          for (const outro of outros) {
            const r = await tudo(outro, palavra);
            expect(r.ids, `${outro}, ${campo}`).toEqual([]);
            expect(r.naFolha, `${outro}, ${campo}, na folha`).toEqual([]);
            expect(r.total).toBe(0);
            expect(r.mostra, `${outro}, ${campo}`).not.toMatch(/Zabumbeiro|panela|Caldeirão/);
          }
        }
      });
    });

    it("com '' (sem espera), o relato segue a memória: todo mundo que vê a memória acha pelos três", async () => {
      await comEspera('', async () => {
        for (const quem of ['gui', 'giovanna', 'elizete', 'lucas-magno']) {
          for (const [campo, palavra] of Object.entries(PALAVRAS)) expect((await tudo(quem, palavra)).ids, `${quem}, ${campo}`).toEqual(['1992-chegada-do-gui']);
        }
      });
    });
  });
});
