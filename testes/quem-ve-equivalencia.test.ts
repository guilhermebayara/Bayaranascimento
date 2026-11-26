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
 * As divergências que o teste espera achar: nenhuma. Antes do ponto único (src/lib/servidor/quem-ve.ts), o
 * teste rodado contra o código de então (commit 77d8928) achava três, todas corrigidas aqui:
 * - V-1: pessoasQueSoVoceVe contava o laço aberto com quem está na lixeira;
 * - V-2: a lista vazia ('[]') ia à TV (relatoNaTv) e esperava o sim (estaNoPublicoDoRelato) ao mesmo tempo;
 * - V-2 com '': a consulta das fotos lia '' como espera e quebrava no json_each(''), e o TS lia como sem espera.
 */
const DIVERGENCIAS_CONHECIDAS: string[] = [];

describe.skipIf(!comSqlite)('quem vê o quê: o SQL e o TS dizem o mesmo', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  const repo = await import('../src/lib/servidor/repositorio');
  const permissoes = await import('../src/lib/servidor/permissoes');
  const { relatoNaTv } = await import('../src/lib/sala');
  const { VISITANTE_DA_SALA } = await import('../src/lib/servidor/tv');
  const qv = await import('../src/lib/servidor/quem-ve');
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

    // --- Revisão MEM-2 ---
    const audio = (relato: number, chave: string, enviadoPor: string) =>
      sql(`INSERT INTO audios (relato_id, memoria_id, chave, tipo, tamanho, enviado_por) VALUES (?, ?, ?, 'audio/webm', 10, ?)`, relato, aberta, chave, enviadoPor);
    const ultimo = () => (sqlite().prepare('SELECT MAX(id) AS id FROM relatos').get() as { id: number }).id;
    // Datas vazias: '' é data, como no SQL (IS NULL). A memória com excluida_em = '' está na lixeira
    sql(`INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por, publicada_em, excluida_em) VALUES ('zz-lixeira-vazia', 'Lixeira vazia', 1990, 'outro', 'todos', 'publicada', 'gui', datetime('now'), '')`);
    // O rascunho do Gui com descartado_em = '': descartado, com áudio
    pessoa('zz-descartado-vazio');
    sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, descartado_em) VALUES (?, 'zz-descartado-vazio', 'gui', 'Descartado vazio', 'rascunho', '')`, aberta);
    audio(ultimo(), 'zz-descartado-vazio.webm', 'gui');
    // O áudio do rascunho que o Gui descartou: ele ainda ouve (V-3, na fila)
    const descartado = (sqlite().prepare(`SELECT id FROM relatos WHERE por = 'zz-descartado'`).get() as { id: number }).id;
    audio(descartado, 'zz-descartado.webm', 'gui');
    // Publicado e descartado, com data e com '': nenhum dos dois vai à TV
    for (const [por, quando] of [['zz-publicado-descartado', '2026-11-20 10:00:00'], ['zz-publicado-descartado-vazio', '']] as const) {
      pessoa(por);
      sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, publicado_em, descartado_em) VALUES (?, ?, 'giovanna', 'Publicado e descartado', 'publicada', datetime('now'), ?)`, aberta, por, quando);
      audio(ultimo(), `${por}.webm`, 'giovanna');
    }
    // O Gui registrou o relato em nome de quem ele não vê (zz-pessoa, do laço "só eu vejo" da Giovanna): ele
    // continua vendo o que registrou
    sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, publicado_em) VALUES (?, 'zz-pessoa', 'gui', 'Registrado pelo Gui', 'publicada', datetime('now'))`, aberta);
    const doGui = ultimo();
    audio(doGui, 'zz-registrado-pelo-gui.webm', 'gui');
    sql(`INSERT INTO fotos (memoria_id, relato_id, chave, principal, enviada_por) VALUES (?, ?, '2026/zz-registrado-pelo-gui.jpg', 0, 'gui')`, aberta, doGui);
    // A lista de espera com um núcleo que não existe: ninguém é membro dele
    pessoa('zz-so-inexistente');
    sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, publicado_em, so_para_nucleos) VALUES (?, 'zz-so-inexistente', 'giovanna', 'Núcleo que não existe', 'publicada', datetime('now'), '["nao-existe"]')`, aberta);
    const inexistente = ultimo();
    audio(inexistente, 'zz-so-inexistente.webm', 'giovanna');
    sql(`INSERT INTO fotos (memoria_id, relato_id, chave, principal, enviada_por) VALUES (?, ?, '2026/zz-so-inexistente.jpg', 0, 'giovanna')`, aberta, inexistente);
    // O casal restrito a famílias não é aberto: X, num laço "só eu vejo" do Gui, tem só esse casal
    pessoa('zz-casal-nucleos');
    sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('gui', 'zz-casal-nucleos', 'Só eu vejo', 1)`);
    sql(`INSERT INTO casais (a_id, b_id, visibilidade, criado_por) VALUES ('lucio', 'zz-casal-nucleos', 'nucleos', 'lucio')`);
    const casal = (sqlite().prepare(`SELECT id FROM casais WHERE b_id = 'zz-casal-nucleos'`).get() as { id: number }).id;
    sql(`INSERT INTO casal_nucleos (casal_id, nucleo_id) VALUES (?, 'bracarense')`, casal);
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
    // As datas vazias (revisão MEM-2): '' é data, como no SQL
    expect(memorias().some((m) => m.excluida_em === '')).toBe(true);
    expect(relatos().filter((r) => r.descartado_em === '').map((r) => r.situacao).sort()).toEqual(['publicada', 'rascunho']);
    expect(relatos().some((r) => r.situacao === 'publicada' && r.descartado_em !== null && r.descartado_em !== '')).toBe(true);
    expect(relatos().some((r) => r.so_para_nucleos === '["nao-existe"]')).toBe(true);
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
      // O SQL antes do filtro em TS (revisão MEM-2): a espera do relato já sai do banco, foto por foto. O filtro
      // em TS que vem depois (veORelato) esconderia a falta dela
      const fotoPorId = new Map(todas<LinhaDeFoto & { id: number }>(`SELECT id, chave, memoria_id, relato_id, enviada_por, removida_em, removida_por, 0 AS solta FROM fotos`).map((f) => [f.id, f]));
      const soltas = new Set(todas<{ id: number }>(`SELECT id FROM fotos WHERE memoria_id IS NULL AND relato_id IS NULL AND chave <> '' AND chave NOT LIKE 'exemplos/%' AND enviada_em < datetime('now', '-30 days')`).map((f) => f.id));
      const sqlAntes: string[] = [];
      for (const chave of chaves) {
        for (const linha of todas<{ foto: number; guardar: number }>(repo.sqlDoAcessoAFoto(), u.pessoa, chave, u.admin ? 1 : 0)) sqlAntes.push(`${linha.foto} guardar=${Boolean(linha.guardar)}`);
      }
      const tsAntes = [...fotoPorId.values()].flatMap((f) => {
        if (f.memoria_id === null) return (f.enviada_por === u.pessoa && f.removida_em === null) || (u.admin && soltas.has(f.id)) ? [`${f.id} guardar=false`] : [];
        const m = porId.get(f.memoria_id)!;
        if (!(f.removida_em === null || f.enviada_por === u.pessoa || f.removida_por === u.pessoa) || !tsVisivel(u, m)) return [];
        const r = f.relato_id === null ? undefined : relatoPorId.get(f.relato_id);
        if (r && !qv.estaNoPublicoDoRelato(doRelato(r), u)) return [];
        return [`${f.id} guardar=${f.removida_em === null && (!r || r.situacao === 'publicada') && m.situacao === 'publicada' && m.excluida_em === null}`];
      });
      achados.push(...diferencas(`foto antes do TS (${u.pessoa})`, sqlAntes, tsAntes));
    }
    expect(achados).toEqual(DIVERGENCIAS_CONHECIDAS.filter((d) => d.startsWith('foto')));
  });

  it('a voz que vai à TV, áudio por áudio, nos dois sentidos, para cada leitor', async () => {
    type LinhaDeAudio = { id: number; relato_id: number };
    const audios = todas<LinhaDeAudio>('SELECT id, relato_id FROM audios WHERE removido_em IS NULL AND relato_id IS NOT NULL');
    const relatoPorId = new Map(relatos().map((r) => [r.id, r]));
    const naTv = (r: LinhaDeRelato) => relatoNaTv({ situacao: r.situacao, soParaNucleos: lerSo(r.so_para_nucleos), descartadoEm: r.descartado_em });
    const achados: string[] = [];
    // O SQL antes do filtro em TS (revisão MEM-2): a regra da TV já sai do banco, áudio por áudio. Comparar pela
    // memória esconderia uma voz que não pode tocar atrás de outra da mesma memória
    const sqlAntes = todas<{ audio: number; memoria_id: string; por: string; registrado_por: string; so_para_nucleos: string | null }>(repo.SQL_DAS_VOZES_NA_TV);
    achados.push(...diferencas('voz na TV antes do TS', sqlAntes.map((a) => String(a.audio)), audios.filter((a) => naTv(relatoPorId.get(a.relato_id)!)).map((a) => String(a.id))));
    for (const u of leitores) {
      const naoVe = await repo.pessoasQueONaoVe(u);
      const tsDiz = audios.filter((a) => {
        const r = relatoPorId.get(a.relato_id)!;
        return naTv(r) && permissoes.veORelato(doRelato(r), u, naoVe);
      });
      // O que a função faz com o que o SQL devolve, áudio por áudio
      const depoisDoTs = sqlAntes.filter((a) => permissoes.veORelato({ por: a.por, registradoPor: a.registrado_por, soParaNucleos: lerSo(a.so_para_nucleos) }, u, naoVe));
      achados.push(...diferencas(`voz na TV (${u.pessoa})`, depoisDoTs.map((a) => String(a.audio)), tsDiz.map((a) => String(a.id))));
      achados.push(...diferencas(`memória com voz na TV (${u.pessoa})`, await repo.memoriasComAudioNaTv(u), tsDiz.map((a) => relatoPorId.get(a.relato_id)!.memoria_id)));
    }
    expect(achados).toEqual(DIVERGENCIAS_CONHECIDAS.filter((d) => d.startsWith('voz na TV') || d.startsWith('memória com voz')));
  });

  it('os áudios, nos dois sentidos, para cada leitor', async () => {
    type LinhaDeAudio = { chave: string; relato_id: number | null; enviado_por: string; removido_em: string | null };
    const audios = todas<LinhaDeAudio>('SELECT chave, relato_id, enviado_por, removido_em FROM audios');
    const relatoPorId = new Map(relatos().map((r) => [r.id, r]));
    const porId = new Map(memorias().map((m) => [m.id, m]));
    const achados: string[] = [];
    for (const u of leitores) {
      const naoVe = await repo.pessoasQueONaoVe(u);
      const sqlDiz: string[] = [];
      const tsDiz: string[] = [];
      for (const chave of [...new Set(audios.map((a) => a.chave))]) {
        const acesso = await repo.acessoAoAudio(u, chave);
        if (acesso) sqlDiz.push(`${chave} guardar=${acesso.guardar}`);
        // A regra, linha por linha: o áudio solto é de quem enviou; o do relato, de quem vê o relato à vista (com
        // a exceção do rascunho descartado, V-3) numa memória que vê
        const linhas = audios.filter((a) => a.chave === chave).flatMap((a): { r: LinhaDeRelato | undefined; guardar: boolean }[] => {
          if (a.relato_id === null) return a.enviado_por === u.pessoa ? [{ r: undefined, guardar: false }] : [];
          const r = relatoPorId.get(a.relato_id);
          if (!r || !(a.removido_em === null || a.enviado_por === u.pessoa)) return [];
          const m = porId.get(r.memoria_id)!;
          if (!qv.relatoAberto({ situacao: r.situacao, registradoPor: r.registrado_por, descartadoEm: r.descartado_em }, u, { descartadoTambem: true }) || !tsVisivel(u, m)) return [];
          return [{ r, guardar: a.removido_em === null && r.situacao === 'publicada' && m.situacao === 'publicada' && m.excluida_em === null }];
        });
        const vistas = linhas.some((l) => !l.r) ? linhas : linhas.filter((l) => permissoes.veORelato(doRelato(l.r!), u, naoVe));
        if (vistas.length) tsDiz.push(`${chave} guardar=${vistas.some((l) => l.guardar)}`);
      }
      achados.push(...diferencas(`áudio (${u.pessoa})`, sqlDiz, tsDiz));
    }
    expect(achados).toEqual([]);
    // O Gui ainda ouve o áudio do rascunho que descartou (V-3, na fila); a Giovanna não
    expect(await repo.acessoAoAudio(leitores.find((l) => l.pessoa === 'gui')!, 'zz-descartado.webm')).not.toBeNull();
    expect(await repo.acessoAoAudio(leitores.find((l) => l.pessoa === 'giovanna')!, 'zz-descartado.webm')).toBeNull();
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

  // --- Os pares de src/lib/servidor/quem-ve.ts, direto: cada fragmento SQL contra o predicado em TS ---

  const ids = (texto: string, ...valores: (string | number | null)[]) => todas<{ id: string | number }>(texto, ...valores).map((r) => String(r.id));
  const memoriaParaVer = (m: LinhaDeMemoria) => ({ situacao: m.situacao, visibilidade: m.visibilidade, criadaPor: m.criada_por, nucleos: nucleosDa(m.id), excluidaEm: m.excluida_em });

  it('quem-ve: sqlVeMemoria e veMemoria, com cada opção', () => {
    const achados: string[] = [];
    const opcoes = [{}, { lixeira: 'qualquer' as const }, { so: 'publicada' as const }, { lixeira: 'qualquer' as const, so: 'publicada' as const }];
    for (const u of leitores) {
      for (const o of opcoes) {
        const sqlDiz = ids(`SELECT m.id FROM memorias m WHERE ${qv.sqlVeMemoria(o)}`, u.pessoa);
        const tsDiz = memorias().filter((m) => qv.veMemoria(u, memoriaParaVer(m), o)).map((m) => m.id);
        achados.push(...diferencas(`veMemoria ${JSON.stringify(o)} (${u.pessoa})`, sqlDiz, tsDiz));
      }
      // O apelido da tabela e o parâmetro de quem olha mudam de lugar sem mudar a regra
      const comOutroNome = ids(`SELECT x.id FROM memorias x WHERE ${qv.sqlVeMemoria({ m: 'x', pessoa: '?2' })}`, 'ninguem', u.pessoa);
      achados.push(...diferencas(`veMemoria com outro apelido (${u.pessoa})`, comOutroNome, memorias().filter((m) => qv.veMemoria(u, memoriaParaVer(m))).map((m) => m.id)));
      // podeVerMemoria, de permissoes.ts, é a mesma regra sem olhar a lixeira
      for (const m of memorias()) if (permissoes.podeVerMemoria(u, { ...memoriaParaVer(m), integrantes: [] }) !== qv.veMemoria(u, memoriaParaVer(m), { lixeira: 'qualquer' })) achados.push(`podeVerMemoria (${u.pessoa}) ${m.id}`);
    }
    expect(achados).toEqual([]);
  });

  it('quem-ve: o relato que espera, o público do relato, ver o relato e o relato à vista', async () => {
    const achados: string[] = [];
    const linhas = relatos();
    // A espera não depende de quem olha
    achados.push(...diferencas('relatoEspera', ids(`SELECT r.id FROM relatos r WHERE ${qv.sqlRelatoEspera('r')}`), linhas.filter((r) => qv.relatoEspera(qv.lerEspera(r.so_para_nucleos))).map((r) => String(r.id))));
    achados.push(...diferencas('relato sem espera', ids(`SELECT r.id FROM relatos r WHERE ${qv.sqlRelatoNaoEspera('r')}`), linhas.filter((r) => !qv.relatoEspera(qv.lerEspera(r.so_para_nucleos))).map((r) => String(r.id))));
    achados.push(...diferencas('relatoNaTv', ids(`SELECT r.id FROM relatos r WHERE ${qv.sqlRelatoNaTv('r')}`), linhas.filter((r) => qv.relatoNaTv({ situacao: r.situacao, soParaNucleos: qv.lerEspera(r.so_para_nucleos), descartadoEm: r.descartado_em })).map((r) => String(r.id))));
    for (const u of leitores) {
      const naoVe = await repo.pessoasQueONaoVe(u);
      const { naoVe: listaNaoVe, excluidas } = qv.naoVeParaSql(naoVe);
      achados.push(...diferencas(`estaNoPublicoDoRelato (${u.pessoa})`, ids(`SELECT r.id FROM relatos r WHERE ${qv.sqlEstaNoPublicoDoRelato('r', '?1')}`, u.pessoa), linhas.filter((r) => qv.estaNoPublicoDoRelato(doRelato(r), u)).map((r) => String(r.id))));
      achados.push(...diferencas(`veORelato (${u.pessoa})`, ids(`SELECT r.id FROM relatos r WHERE ${qv.sqlVeORelato('r', '?1', '?2', '?3')}`, u.pessoa, listaNaoVe, excluidas), linhas.filter((r) => qv.veORelato(doRelato(r), u, naoVe)).map((r) => String(r.id))));
      for (const descartadoTambem of [false, true]) {
        const tsDiz = linhas.filter((r) => qv.relatoAberto({ situacao: r.situacao, registradoPor: r.registrado_por, descartadoEm: r.descartado_em }, u, { descartadoTambem })).map((r) => String(r.id));
        achados.push(...diferencas(`relatoAberto ${descartadoTambem} (${u.pessoa})`, ids(`SELECT r.id FROM relatos r WHERE ${qv.sqlRelatoAberto('r', '?1', { descartadoTambem })}`, u.pessoa), tsDiz));
        achados.push(...diferencas(`relatoAberto sem apelido ${descartadoTambem} (${u.pessoa})`, ids(`SELECT id FROM relatos WHERE ${qv.sqlRelatoAberto('', '?', { descartadoTambem })}`, u.pessoa), tsDiz));
      }
    }
    expect(achados).toEqual([]);
  });

  it('quem-ve: a sala e os casais abertos', () => {
    const achados = [
      ...diferencas('entraNaSala', ids(`SELECT m.id FROM memorias m WHERE ${qv.sqlEntraNaSala('m')}`), memorias().filter((m) => qv.entraNaSala(m)).map((m) => m.id)),
      ...diferencas('casalAberto', ids(`SELECT id FROM casais WHERE ${qv.sqlCasalAberto()}`), todas<{ id: number; visibilidade: 'todos' | 'nucleos' | 'privado' }>('SELECT id, visibilidade FROM casais').filter(qv.casalAberto).map((c) => String(c.id))),
    ];
    expect(achados).toEqual([]);
    // A sala, pela regra das duas portas: o visitante da sala só vê o que entra nela
    const sala = VISITANTE_DA_SALA as Usuario;
    const publicadasDaSala = memorias().filter((m) => qv.veMemoria(sala, memoriaParaVer(m), { so: 'publicada' }));
    expect(publicadasDaSala.length).toBeGreaterThan(0);
    expect(publicadasDaSala.every((m) => qv.entraNaSala(m))).toBe(true);
  });

  it('quem-ve: o casal restrito a famílias não é aberto', async () => {
    const casal = (sqlite().prepare(`SELECT id FROM casais WHERE b_id = 'zz-casal-nucleos'`).get() as { id: number }).id;
    expect(qv.casalAberto({ visibilidade: 'nucleos' })).toBe(false);
    expect(qv.casalAberto({ visibilidade: 'privado' })).toBe(false);
    expect(ids(`SELECT id FROM casais WHERE ${qv.sqlCasalAberto()}`)).not.toContain(String(casal));
    // Para o Gui, X continua só dele: o casal restrito não é um laço que a família toda vê
    const gui = leitores.find((l) => l.pessoa === 'gui')!;
    expect((await repo.pessoasQueSoVoceVe(gui)).has('zz-casal-nucleos')).toBe(true);
    // Quem não é das famílias do casal não o vê; quem é, vê
    expect((await repo.listarCasais(leitores.find((l) => l.pessoa === 'giovanna')!)).some((c) => c.id === casal)).toBe(false);
    expect((await repo.listarCasais(leitores.find((l) => l.pessoa === 'lucas-magno')!)).some((c) => c.id === casal)).toBe(true);
  });

  it('quem-ve: quem registrou em nome de quem não vê continua vendo, e o núcleo que não existe não abre nada', async () => {
    const gui = leitores.find((l) => l.pessoa === 'gui')!;
    const doGui = (sqlite().prepare(`SELECT id FROM relatos WHERE por = 'zz-pessoa' AND registrado_por = 'gui'`).get() as { id: number }).id;
    expect((await repo.pessoasQueONaoVe(gui)).has('zz-pessoa')).toBe(true);
    const { naoVe, excluidas } = qv.naoVeParaSql(await repo.pessoasQueONaoVe(gui));
    expect(ids(`SELECT r.id FROM relatos r WHERE ${qv.sqlVeORelato('r', '?1', '?2', '?3')}`, 'gui', naoVe, excluidas)).toContain(String(doGui));
    expect(await repo.podeVerFoto(gui, '2026/zz-registrado-pelo-gui.jpg')).toBe(true);
    // Só a Giovanna, que registrou, lê o relato que espera por um núcleo que não existe
    const inexistente = (sqlite().prepare(`SELECT id FROM relatos WHERE por = 'zz-so-inexistente'`).get() as { id: number }).id;
    for (const u of leitores) {
      const ve = u.pessoa === 'giovanna';
      expect(ids(`SELECT r.id FROM relatos r WHERE ${qv.sqlEstaNoPublicoDoRelato('r', '?1')}`, u.pessoa).includes(String(inexistente)), u.pessoa).toBe(ve);
      expect(todas(repo.sqlDoAcessoAFoto(), u.pessoa, '2026/zz-so-inexistente.jpg', u.admin ? 1 : 0).length > 0, u.pessoa).toBe(ve);
    }
  });

  it('quem-ve: quemNaoVe é a conta de pessoasQueONaoVe, mais a lixeira', async () => {
    for (const u of leitores) {
      const emPrivados = await repo.pessoasEmLacosPrivadosDeOutros(u);
      const conta = qv.quemNaoVe(emPrivados, { filiacoes: await repo.listarFiliacoes(), casais: await repo.listarCasais(u), lacosDoCoracao: await repo.listarLacosDoCoracao(u) }, u.pessoa);
      const excluidas = new Set(todas<{ id: string }>('SELECT id FROM integrantes WHERE excluida_em IS NOT NULL').map((i) => i.id));
      expect([...(await repo.pessoasQueONaoVe(u))].sort(), u.pessoa).toEqual([...new Set([...conta, ...excluidas])].sort());
    }
  });
});

// --- Guarda contra a terceira cópia ---------------------------------------------------------------------
//
// As formas conhecidas da regra em SQL só podem aparecer em src/lib/servidor/quem-ve.ts. Em repositorio.ts
// (e na busca da E2, src/lib/servidor/busca.ts, quando existir) ficam só as gravações desta lista, cada uma
// com o motivo.
describe('quem vê o quê: nenhuma terceira cópia da regra', () => {
  const FORMAS = [/memoria_nucleos mn\b/, /nucleo_membros nm\b/, /so_para_nucleos IS\b/, /visibilidade = 'todos'/];
  const GRAVACOES: { trecho: string; motivo: string }[] = [
    { trecho: "const AINDA_ABERTA = `EXISTS (SELECT 1 FROM memorias WHERE id = ?1 AND visibilidade = 'todos')`;", motivo: 'gravação: as marcas de família só entram se a memória continua aberta na hora do lote' },
  ];
  const fontes = import.meta.glob<string>(['../src/lib/servidor/repositorio.ts', '../src/lib/servidor/busca.ts'], { query: '?raw', import: 'default', eager: true });
  for (const [caminho, texto] of Object.entries(fontes)) {
    it(caminho.replace('../', ''), () => {
      const linhas = texto.split('\n');
      const achadas = linhas.flatMap((linha, i) => (FORMAS.some((f) => f.test(linha)) && !GRAVACOES.some((g) => linha.includes(g.trecho)) ? [`${i + 1}: ${linha.trim()}`] : []));
      expect(achadas, 'Use os fragmentos de src/lib/servidor/quem-ve.ts no lugar de escrever a regra de novo').toEqual([]);
    });
  }
  it('cada gravação da lista ainda existe', () => {
    for (const g of GRAVACOES) expect(fontes['../src/lib/servidor/repositorio.ts'], g.motivo).toContain(g.trecho);
  });
});
