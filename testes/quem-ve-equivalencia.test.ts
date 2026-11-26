// Quem vê o quê, em SQL e em TS, dizem o mesmo (sessão AC3, 26/11/2026; auditoria AC, seção 3.4).
//
// As regras de quem vê o quê existem em duas línguas: o predicado em TS, que as rotas e as telas usam, e o
// fragmento SQL, que as consultas de repositorio.ts usam para não ler o acervo inteiro. Este teste monta o
// banco de verdade (testes/apoio/d1.ts) com o acervo de exemplo, os casos escondidos de
// testes/apoio/casos-escondidos.ts e os casos de borda abaixo, e, para cada leitor, compara nos dois
// sentidos o que o SQL devolve com o que o TS aceita, sobre todas as linhas de memorias, relatos e fotos.
// Uma divergência é uma linha que um lado aceita e o outro não. A lista DIVERGENCIAS_CONHECIDAS diz quais se
// espera ver; vazia, nenhuma.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import { acrescentarEscondido } from './apoio/casos-escondidos';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

/**
 * As divergências que o teste espera achar. Antes do ponto único (src/lib/servidor/quem-ve.ts), eram V-1 e
 * V-2 da auditoria; depois dele, nenhuma.
 */
const DIVERGENCIAS_CONHECIDAS: string[] = [
  // V-2, com '': a consulta das fotos lê '' como espera (IS NOT NULL) e quebra no json_each(''); o TS lê como sem espera
  'foto (gui): só o SQL aceita 2026/zz-so-vazio.jpg (a consulta falhou)',
  'foto (gui): só o TS aceita 2026/zz-so-vazio.jpg guardar=true',
  'foto (elizete): só o SQL aceita 2026/zz-so-vazio.jpg (a consulta falhou)',
  'foto (elizete): só o TS aceita 2026/zz-so-vazio.jpg guardar=true',
  'foto (lucas-magno): só o SQL aceita 2026/zz-so-vazio.jpg (a consulta falhou)',
  'foto (lucas-magno): só o TS aceita 2026/zz-so-vazio.jpg guardar=true',
  'foto (lucio): só o SQL aceita 2026/zz-so-vazio.jpg (a consulta falhou)',
  'foto (lucio): só o TS aceita 2026/zz-so-vazio.jpg guardar=true',
  'foto (zz-sem-familia): só o SQL aceita 2026/zz-so-vazio.jpg (a consulta falhou)',
  'foto (zz-sem-familia): só o TS aceita 2026/zz-so-vazio.jpg guardar=true',
  'foto (zz-parente): só o SQL aceita 2026/zz-so-vazio.jpg (a consulta falhou)',
  'foto (zz-parente): só o TS aceita 2026/zz-so-vazio.jpg guardar=true',
  'foto (:sala): só o SQL aceita 2026/zz-so-vazio.jpg (a consulta falhou)',
  'foto (:sala): só o TS aceita 2026/zz-so-vazio.jpg guardar=true',
  // V-2: a lista vazia vai à TV (relatoNaTv) e espera o sim (estaNoPublicoDoRelato)
  'espera: relato com so_para_nucleos "[]" vai à TV e espera o sim ao mesmo tempo',
  // V-1: pessoasQueSoVoceVe conta o laço aberto com quem está na lixeira
  'só você vê (gui): só o TS aceita zz-v1-casal',
  'só você vê (gui): só o TS aceita zz-v1-laco',
];

describe.skipIf(!comSqlite)('quem vê o quê: o SQL e o TS dizem o mesmo', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  const repo = await import('../src/lib/servidor/repositorio');
  const permissoes = await import('../src/lib/servidor/permissoes');
  const { relatoNaTv } = await import('../src/lib/sala');
  const { VISITANTE_DA_SALA } = await import('../src/lib/servidor/tv');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;

  const sqlite = () => banco.sqlite;
  const sql = (texto: string, ...valores: (string | number | null)[]) => sqlite().prepare(texto).run(...valores);
  const todas = <T>(texto: string, ...valores: (string | number | null)[]) => sqlite().prepare(texto).all(...valores) as T[];
  const usuarioDe = (pessoa: string): Usuario => {
    const i = sqlite().prepare('SELECT nome, admin FROM integrantes WHERE id = ?').get(pessoa) as { nome: string; admin: number };
    const nucleos = todas<{ nucleo_id: string }>(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  /** O so_para_nucleos como o TS lê (a mesma leitura de repositorio.ts) */
  const lerSo = (valor: string | null): string[] | null => (typeof valor === 'string' && valor ? (JSON.parse(valor) as string[]) : null);

  /** Os casos de borda, além do acervo de exemplo e dos escondidos */
  function acrescentarBordas() {
    const aberta = (todas<{ id: string }>(`SELECT id FROM memorias WHERE situacao = 'publicada' AND visibilidade = 'todos' AND excluida_em IS NULL AND id NOT LIKE 'zz-%' ORDER BY id`))[1]!.id;
    // Quem não acessa o site, em nome de quem a Giovanna registra os relatos de borda
    const pessoa = (id: string, excluida: string | null = null) =>
      sql(`INSERT INTO integrantes (id, nome, tipo, tratamento, excluida_em, excluida_por) VALUES (?, ?, 'pessoa', 'ela', ?, ?)`, id, id, excluida, excluida ? 'gui' : null);
    // so_para_nucleos nulo, '', '[]' e com uma família
    const formas: [string, string | null][] = [
      ['zz-so-nulo', null],
      ['zz-so-vazio', ''],
      ['zz-so-lista-vazia', '[]'],
      ['zz-so-uma', '["bracarense"]'],
    ];
    for (const [por, so] of formas) {
      pessoa(por);
      sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, publicado_em, so_para_nucleos) VALUES (?, ?, 'giovanna', 'Borda', 'publicada', datetime('now'), ?)`, aberta, por, so);
      const relato = (sqlite().prepare('SELECT MAX(id) AS id FROM relatos').get() as { id: number }).id;
      sql(`INSERT INTO audios (relato_id, memoria_id, chave, tipo, tamanho, enviado_por) VALUES (?, ?, ?, 'audio/webm', 10, 'giovanna')`, relato, aberta, `${por}.webm`);
      sql(`INSERT INTO fotos (memoria_id, relato_id, chave, principal, enviada_por) VALUES (?, ?, ?, 0, 'giovanna')`, aberta, relato, `2026/${por}.jpg`);
    }
    // O relato de alguém que está na lixeira: fica, com o nome
    pessoa('zz-na-lixeira', '2026-11-10 10:00:00');
    sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, publicado_em) VALUES (?, 'zz-na-lixeira', 'giovanna', 'Da lixeira', 'publicada', datetime('now'))`, aberta);
    const daLixeira = (sqlite().prepare('SELECT MAX(id) AS id FROM relatos').get() as { id: number }).id;
    sql(`INSERT INTO fotos (memoria_id, relato_id, chave, principal, enviada_por) VALUES (?, ?, '2026/zz-na-lixeira.jpg', 0, 'giovanna')`, aberta, daLixeira);
    // O rascunho de relato que o Gui descartou
    pessoa('zz-descartado');
    sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, descartado_em) VALUES (?, 'zz-descartado', 'gui', 'Descartado', 'rascunho', '2026-11-20 10:00:00')`, aberta);
    // O leitor sem família e o parente que não é membro
    pessoa('zz-sem-familia');
    pessoa('zz-parente');
    sql(`INSERT INTO nucleo_membros (nucleo_id, integrante_id, papel) VALUES ('bracarense', 'zz-parente', 'parente')`);
    // A memória restrita sem família nenhuma, e o rascunho na lixeira
    sql(`INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por, publicada_em) VALUES ('zz-sem-familia-mem', 'Sem família', 1990, 'outro', 'nucleos', 'publicada', 'gui', datetime('now'))`);
    sql(`INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por, excluida_em, excluida_por) VALUES ('zz-rascunho-lixeira', 'Rascunho na lixeira', 1990, 'outro', 'todos', 'rascunho', 'gui', '2026-11-10 10:00:00', 'gui')`);
    sql(`INSERT INTO fotos (memoria_id, chave, principal, enviada_por) VALUES ('zz-sem-familia-mem', '2026/zz-sem-familia-mem.jpg', 1, 'gui')`);
    // V-1: X está num laço "só eu vejo" do Gui, e o único laço aberto de X é com Y, que está na lixeira
    pessoa('zz-v1-y', '2026-11-10 10:00:00');
    pessoa('zz-v1-laco');
    pessoa('zz-v1-casal');
    sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('gui', 'zz-v1-laco', 'Só eu vejo', 1), ('gui', 'zz-v1-casal', 'Só eu vejo', 1)`);
    sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('zz-v1-y', 'zz-v1-laco', 'Aberto', 0)`);
    sql(`INSERT INTO casais (a_id, b_id, visibilidade, criado_por) VALUES ('zz-v1-casal', 'zz-v1-y', 'todos', 'gui')`);
  }

  let leitores: Usuario[] = [];

  beforeAll(async () => {
    await prepararBanco();
    acrescentarEscondido(sqlite(), 'gui');
    acrescentarBordas();
    const comAcesso = ['gui', 'giovanna', 'elizete', 'lucas-magno', 'lucio'];
    leitores = [...comAcesso.map(usuarioDe), usuarioDe('zz-sem-familia'), usuarioDe('zz-parente'), VISITANTE_DA_SALA as Usuario];
  });

  // --- O que o TS diz, linha por linha ---

  type LinhaDeMemoria = { id: string; situacao: 'rascunho' | 'publicada'; visibilidade: 'todos' | 'nucleos'; criada_por: string; excluida_em: string | null };
  const memorias = () => todas<LinhaDeMemoria>('SELECT id, situacao, visibilidade, criada_por, excluida_em FROM memorias ORDER BY id');
  const nucleosDa = (id: string) => todas<{ nucleo_id: string }>('SELECT nucleo_id FROM memoria_nucleos WHERE memoria_id = ?', id).map((n) => n.nucleo_id);
  const tsVeMemoria = (u: Usuario, m: LinhaDeMemoria) =>
    permissoes.podeVerMemoria(u, { situacao: m.situacao, visibilidade: m.visibilidade, criadaPor: m.criada_por, nucleos: nucleosDa(m.id), integrantes: [] });
  const tsVisivel = (u: Usuario, m: LinhaDeMemoria) => m.excluida_em === null && tsVeMemoria(u, m);

  type LinhaDeRelato = { id: number; memoria_id: string; por: string; registrado_por: string; situacao: 'rascunho' | 'publicada'; so_para_nucleos: string | null; descartado_em: string | null };
  const relatos = () => todas<LinhaDeRelato>('SELECT id, memoria_id, por, registrado_por, situacao, so_para_nucleos, descartado_em FROM relatos ORDER BY id');
  const doRelato = (r: LinhaDeRelato) => ({ por: r.por, registradoPor: r.registrado_por, soParaNucleos: lerSo(r.so_para_nucleos) });

  /** Compara dois conjuntos nos dois sentidos e devolve o que só um deles tem */
  const diferencas = (nome: string, sqlDiz: Iterable<string>, tsDiz: Iterable<string>): string[] => {
    const a = new Set(sqlDiz);
    const b = new Set(tsDiz);
    return [...[...a].filter((x) => !b.has(x)).map((x) => `${nome}: só o SQL aceita ${x}`), ...[...b].filter((x) => !a.has(x)).map((x) => `${nome}: só o TS aceita ${x}`)];
  };

  it('o acervo tem os casos de borda que o teste confere', () => {
    expect(memorias().length).toBeGreaterThan(30);
    expect(relatos().some((r) => r.so_para_nucleos === '[]')).toBe(true);
    expect(leitores.some((l) => l.nucleos.length === 0)).toBe(true);
  });

  it('memórias, nos dois sentidos, para cada leitor', async () => {
    const achados: string[] = [];
    for (const u of leitores) {
      const linhas = memorias();
      // FILTRO_VISIVEL (a linha do tempo de quem escreve)
      achados.push(...diferencas(`memória visível (${u.pessoa})`, (await repo.listarMemorias(u, { comRascunhos: true })).map((m) => m.id), linhas.filter((m) => tsVisivel(u, m)).map((m) => m.id)));
      // FILTRO_VISIVEL e só a publicada
      achados.push(...diferencas(`memória publicada (${u.pessoa})`, (await repo.listarMemorias(u)).map((m) => m.id), linhas.filter((m) => tsVisivel(u, m) && m.situacao === 'publicada').map((m) => m.id)));
      // FILTRO_SEM_LIXEIRA (a lixeira de quem pede)
      achados.push(...diferencas(`memória na lixeira (${u.pessoa})`, (await repo.listarExcluidas(u)).map((m) => m.id), linhas.filter((m) => m.excluida_em !== null && tsVeMemoria(u, m)).map((m) => m.id)));
    }
    expect(achados).toEqual(DIVERGENCIAS_CONHECIDAS.filter((d) => d.startsWith('memória')));
  });

  it('relatos, nos dois sentidos, para cada leitor', async () => {
    const achados: string[] = [];
    const linhasDeMemoria = memorias();
    for (const u of leitores) {
      const naoVe = await repo.pessoasQueONaoVe(u);
      const sqlDiz: string[] = [];
      for (const m of linhasDeMemoria) sqlDiz.push(...(await repo.listarRelatos(u, m.id)).map((r) => String(r.id)));
      const visiveis = new Set(linhasDeMemoria.filter((m) => tsVisivel(u, m)).map((m) => m.id));
      const tsDiz = relatos()
        .filter((r) => visiveis.has(r.memoria_id) && (r.situacao === 'publicada' || (r.registrado_por === u.pessoa && r.descartado_em === null)) && permissoes.veORelato(doRelato(r), u, naoVe))
        .map((r) => String(r.id));
      achados.push(...diferencas(`relato (${u.pessoa})`, sqlDiz, tsDiz));
    }
    expect(achados).toEqual(DIVERGENCIAS_CONHECIDAS.filter((d) => d.startsWith('relato')));
  });

  it('fotos, nos dois sentidos, para cada leitor', async () => {
    type LinhaDeFoto = { chave: string; memoria_id: string | null; relato_id: number | null; enviada_por: string; removida_em: string | null; removida_por: string | null; solta: number };
    const fotos = todas<LinhaDeFoto>(
      `SELECT chave, memoria_id, relato_id, enviada_por, removida_em, removida_por,
         (memoria_id IS NULL AND relato_id IS NULL AND chave <> '' AND chave NOT LIKE 'exemplos/%' AND enviada_em < datetime('now', '-30 days')) AS solta
       FROM fotos`,
    );
    const porId = new Map(memorias().map((m) => [m.id, m]));
    const relatoPorId = new Map(relatos().map((r) => [r.id, r]));
    const achados: string[] = [];
    for (const u of leitores) {
      const naoVe = await repo.pessoasQueONaoVe(u);
      const tsAceita = (f: LinhaDeFoto): { guardar: boolean } | null => {
        if (f.memoria_id === null) return (f.enviada_por === u.pessoa && f.removida_em === null) || (u.admin && f.solta) ? { guardar: false } : null;
        const m = porId.get(f.memoria_id)!;
        if (!(f.removida_em === null || f.enviada_por === u.pessoa || f.removida_por === u.pessoa) || !tsVisivel(u, m)) return null;
        const r = f.relato_id === null ? undefined : relatoPorId.get(f.relato_id);
        // A foto que veio com um relato fica com quem vê o relato
        if (r && !permissoes.veORelato(doRelato(r), u, naoVe)) return null;
        return { guardar: f.removida_em === null && (!r || r.situacao === 'publicada') && m.situacao === 'publicada' && m.excluida_em === null };
      };
      const chaves = [...new Set(fotos.map((f) => f.chave))];
      const sqlDiz: string[] = [];
      const tsDiz: string[] = [];
      for (const chave of chaves) {
        let acesso: Awaited<ReturnType<typeof repo.acessoAFoto>> | 'erro';
        try {
          acesso = await repo.acessoAFoto(u, chave);
        } catch {
          acesso = 'erro';
        }
        if (acesso === 'erro') sqlDiz.push(`${chave} (a consulta falhou)`);
        else if (acesso) sqlDiz.push(`${chave} guardar=${acesso.guardar}`);
        const linhas = fotos.filter((f) => f.chave === chave).map(tsAceita).filter((a): a is { guardar: boolean } => a !== null);
        if (linhas.length) tsDiz.push(`${chave} guardar=${linhas.some((a) => a.guardar)}`);
      }
      achados.push(...diferencas(`foto (${u.pessoa})`, sqlDiz, tsDiz));
    }
    expect(achados).toEqual(DIVERGENCIAS_CONHECIDAS.filter((d) => d.startsWith('foto')));
  });

  it('a voz que vai à TV, nos dois sentidos, para cada leitor', async () => {
    const comAudio = new Set(todas<{ relato_id: number }>('SELECT DISTINCT relato_id FROM audios WHERE removido_em IS NULL AND relato_id IS NOT NULL').map((a) => a.relato_id));
    const achados: string[] = [];
    for (const u of leitores) {
      const naoVe = await repo.pessoasQueONaoVe(u);
      const tsDiz = relatos()
        .filter((r) => comAudio.has(r.id) && relatoNaTv({ situacao: r.situacao, soParaNucleos: lerSo(r.so_para_nucleos), descartadoEm: r.descartado_em }) && permissoes.veORelato(doRelato(r), u, naoVe))
        .map((r) => r.memoria_id);
      achados.push(...diferencas(`voz na TV (${u.pessoa})`, await repo.memoriasComAudioNaTv(u), tsDiz));
    }
    expect(achados).toEqual(DIVERGENCIAS_CONHECIDAS.filter((d) => d.startsWith('voz na TV')));
  });

  it('o relato que espera: a TV, o público do relato e a leitura do banco dizem o mesmo', async () => {
    // relatoNaTv diz "não espera" quando o relato vai à TV; estaNoPublicoDoRelato diz "espera" quando só o
    // público antigo lê. As duas leituras do mesmo valor não podem se contradizer.
    const achados: string[] = [];
    for (const r of relatos().filter((r) => r.situacao === 'publicada' && r.descartado_em === null)) {
      const so = lerSo(r.so_para_nucleos);
      const vaiATv = relatoNaTv({ situacao: r.situacao, soParaNucleos: so, descartadoEm: r.descartado_em });
      const espera = !permissoes.estaNoPublicoDoRelato({ registradoPor: r.registrado_por, soParaNucleos: so }, { pessoa: ':ninguem', nucleos: [] });
      if (vaiATv && espera) achados.push(`espera: relato com so_para_nucleos ${JSON.stringify(r.so_para_nucleos)} vai à TV e espera o sim ao mesmo tempo`);
    }
    expect([...new Set(achados)]).toEqual(DIVERGENCIAS_CONHECIDAS.filter((d) => d.startsWith('espera')));
  });

  it('as pessoas que só você vê: o laço aberto com quem está na lixeira não conta', async () => {
    const achados: string[] = [];
    for (const u of leitores) {
      const meus = todas<{ pessoa_id: string }>('SELECT pessoa_id FROM lacos_coracao WHERE dono_id = ? AND privado = 1', u.pessoa).map((l) => l.pessoa_id);
      // O TS, pela regra escrita: o laço aberto que conta é o que a família vê, entre duas pessoas fora da lixeira
      const excluidas = new Set(todas<{ id: string }>('SELECT id FROM integrantes WHERE excluida_em IS NOT NULL').map((i) => i.id));
      const ativos = (a: string, b: string) => !excluidas.has(a) && !excluidas.has(b);
      const aberto = new Set<string>([
        ...todas<{ filho_id: string; responsavel_id: string }>('SELECT filho_id, responsavel_id FROM filiacoes').filter((f) => ativos(f.filho_id, f.responsavel_id)).flatMap((f) => [f.filho_id, f.responsavel_id]),
        ...todas<{ a_id: string; b_id: string }>(`SELECT a_id, b_id FROM casais WHERE visibilidade = 'todos'`).filter((c) => ativos(c.a_id, c.b_id)).flatMap((c) => [c.a_id, c.b_id]),
        ...todas<{ dono_id: string; pessoa_id: string }>('SELECT dono_id, pessoa_id FROM lacos_coracao WHERE privado = 0').filter((l) => ativos(l.dono_id, l.pessoa_id)).flatMap((l) => [l.dono_id, l.pessoa_id]),
      ]);
      aberto.delete(u.pessoa);
      achados.push(...diferencas(`só você vê (${u.pessoa})`, await repo.pessoasQueSoVoceVe(u), meus.filter((p) => !aberto.has(p))));
    }
    expect(achados).toEqual(DIVERGENCIAS_CONHECIDAS.filter((d) => d.startsWith('só você vê')));
  });
});
