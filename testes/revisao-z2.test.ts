// Revisão Z2 (23/11/2026): a Sessão Z (PR #163) contra a lista fechada do Gui. Um caso próprio para cada
// ponto da lista, sem reaproveitar os de testes/z-correcoes.test.ts. Pelas rotas de verdade, sobre o SQLite
// em memória (testes/apoio/d1.ts). Os pontos que só se veem no navegador (o recado no alto, o foco) estão
// em testes/revisao-z2-navegador.test.ts, que precisa do servidor local.
//
// Os casos com o nome começando por "fila:" guardam um defeito que não bloqueia (regra de parada do Gui,
// 22/11/2026): o teste descreve o que acontece hoje. Quem corrigir o defeito troca o que o teste espera.
import { describe, expect, it, vi } from 'vitest';
import { ComandoDeTeste, temSqlite, type D1DeTeste } from './apoio/d1';

// O projeto não tem os tipos do Node: o módulo entra assim para o tsc não acusar o import (como em apoio/d1.ts)
const NODE_FS = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ NODE_FS)) as { readFileSync(caminho: string, codificacao: 'utf-8'): string };

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('Z2: a Sessão Z contra a lista fechada', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  await (await import('../src/lib/servidor/banco')).prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const permissoes = await import('../src/lib/servidor/permissoes');
  const rotas = {
    memorias: await import('../src/pages/api/memorias'),
    relatos: await import('../src/pages/api/relatos'),
    'acrescentar-fotos': await import('../src/pages/api/acrescentar-fotos'),
    duplicados: await import('../src/pages/api/duplicados'),
    apelidos: await import('../src/pages/api/apelidos'),
  };
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  type Rota = keyof typeof rotas;
  const tipos = await repo.listarTipos();
  const sql = banco.sqlite;
  const linhas = <T>(texto: string, ...valores: (string | number | null)[]) => sql.prepare(texto).all(...valores) as T[];
  const uma = <T>(texto: string, ...valores: (string | number | null)[]) => sql.prepare(texto).get(...valores) as T;
  const usuarioDe = (pessoa: string): Usuario => ({
    pessoa,
    nome: pessoa,
    admin: Boolean(uma<{ admin: number }>('SELECT admin FROM integrantes WHERE id = ?', pessoa).admin),
    nucleos: linhas<{ n: string }>(`SELECT nucleo_id AS n FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((l) => l.n),
  });
  // Quem é quem no acervo de exemplo: Gui, Giovanna e Elizete na Bayara Nascimento; Magno na Bracarense e,
  // com a Giovanna, na Bayara Bracarense. Gui, Giovanna e Magno administram
  const [gui, giovanna, elizete, magno] = ['gui', 'giovanna', 'elizete', 'lucas-magno'].map(usuarioDe);
  // Só recebe aviso quem já entrou no site
  for (const p of [gui, giovanna, elizete, magno]) await repo.registrarAcesso(p.pessoa);

  const pedir = async (rota: Rota, quem: Usuario, corpo: Record<string, unknown>) => {
    const request = new Request(`http://localhost/api/${rota}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(corpo) });
    const resposta = await rotas[rota].POST({ request, locals: { usuario: quem, tipos } } as never);
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };
  /** O formulário comum, sem script, como o navegador manda: devolve para onde a rota mandou voltar */
  const semScript = async (rota: Rota, quem: Usuario, campos: Record<string, string | string[]>) => {
    const dados = new FormData();
    for (const [k, v] of Object.entries(campos)) for (const valor of [v].flat()) dados.append(k, valor);
    const request = new Request(`http://localhost/api/${rota}`, { method: 'POST', headers: { Origin: 'http://localhost' }, body: dados });
    const resposta = await rotas[rota].POST({ request, locals: { usuario: quem, tipos } } as never);
    const destino = new URL(resposta.headers.get('Location') ?? '/', 'http://localhost');
    return { status: resposta.status, caminho: destino.pathname, ok: destino.searchParams.get('ok'), erro: destino.searchParams.get('erro'), destino };
  };
  /** A impressão do banco inteiro: todas as linhas de todas as tabelas, em ordem */
  const impressao = () => {
    const tabelas = linhas<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).map((t) => t.name);
    return JSON.stringify(tabelas.map((t) => [t, sql.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all()]));
  };
  const grava = (comandos: ComandoDeTeste[]) => comandos.some((c) => /^\s*(INSERT|UPDATE|DELETE)/.test(c.sql));
  const lote = banco.batch.bind(banco);
  /** Roda com outro banco.batch e devolve o de sempre no fim, aconteça o que acontecer */
  async function comLote<T>(novo: (comandos: ComandoDeTeste[]) => Promise<unknown[]>, fazer: () => Promise<T>): Promise<T> {
    banco.batch = novo;
    try {
      return await fazer();
    } finally {
      banco.batch = lote;
    }
  }
  /**
   * O primeiro lote que grava falha no comando de número `k`: os de antes rodam e o lote volta inteiro, como
   * no D1. Devolve quantos comandos o lote tinha, ou 0 se nenhum lote gravou.
   */
  async function falhandoNoComando(k: number, fazer: () => Promise<unknown>): Promise<{ comandos: number; falhou: boolean; erro?: unknown }> {
    let comandos = 0;
    let falhou = false;
    let erro: unknown;
    await comLote(
      async (lista) => {
        if (comandos || !grava(lista)) return lote(lista);
        comandos = lista.length;
        if (k >= lista.length) return lote(lista);
        falhou = true;
        return lote([...lista.slice(0, k), banco.prepare('INSERT INTO tabela_que_nao_existe DEFAULT VALUES'), ...lista.slice(k)]);
      },
      async () => {
        try {
          await fazer();
        } catch (e) {
          erro = e;
        }
      },
    );
    return { comandos, falhou, erro };
  }
  /** Na porta do primeiro lote que tem um comando assim, outra coisa acontece no banco (outro pedido) */
  async function comOutroPedidoNaPorta<T>(comando: RegExp, outro: (lista: ComandoDeTeste[]) => void | Promise<void>, fazer: () => Promise<T>): Promise<T> {
    let naPorta = true;
    return comLote(async (lista) => {
      if (naPorta && lista.some((c) => comando.test(c.sql))) {
        naPorta = false;
        await outro(lista);
      }
      return lote(lista);
    }, fazer);
  }
  const valoresDe = (c: ComandoDeTeste) => (c as unknown as { valores: unknown[] }).valores;

  let serie = 0;
  const audioSolto = (quem: Usuario, memoriaId: string | null = null) => repo.registrarAudio({ chave: `z2/audio-${++serie}.m4a`, tipo: 'audio/mp4', tamanho: 10, duracao: 3, memoriaId }, quem);
  const fotoSolta = (quem: Usuario) => {
    sql.prepare(`INSERT INTO fotos (memoria_id, chave, principal, ordem, enviada_por) VALUES (NULL, ?, 0, 0, ?)`).run(`z2/foto-${++serie}.jpg`, quem.pessoa);
    return uma<{ id: number }>('SELECT MAX(id) AS id FROM fotos').id;
  };
  const audioDe = (id: number) => uma<{ relato_id: number | null; memoria_id: string | null; removido_em: string | null }>('SELECT relato_id, memoria_id, removido_em FROM audios WHERE id = ?', id);
  const relatosDa = (memoria: string) => linhas<{ id: number; por: string; registrado_por: string; texto: string; situacao: string; so: string | null }>('SELECT id, por, registrado_por, texto, situacao, so_para_nucleos AS so FROM relatos WHERE memoria_id = ? ORDER BY id', memoria);
  const mensagensDo = (relato: number) => linhas<{ tipo: string; texto: string | null; audio_id: number | null }>('SELECT tipo, texto, audio_id FROM relato_mensagens WHERE relato_id = ? ORDER BY ordem', relato);
  const memoriasChamadas = (titulo: string) => linhas<{ id: string }>('SELECT id FROM memorias WHERE titulo = ?', titulo).map((m) => m.id);

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 5 (D1): a memória, o relato, os áudios e as mensagens num lote só', () => {
    it('a falha em qualquer comando do lote não deixa nada gravado, nem pela metade; depois, uma memória só, com os áudios presos a ela', async () => {
      const [a1, a2] = [await audioSolto(elizete), await audioSolto(elizete)];
      const [f1, f2] = [fotoSolta(elizete), fotoSolta(elizete)];
      const ficha = {
        titulo: 'Z2: lote único',
        ano: 2018,
        tipo: 'causo',
        pessoas: ['elizete', 'gui', 'nova:0'],
        novasPessoas: [{ nome: 'Pessoa do Lote Único' }],
        temas: 'tema do lote único, outro tema do lote',
        visibilidade: 'nucleos',
        nucleos: ['bayara-nascimento'],
        fotos: [{ id: f1, legenda: 'A primeira' }, { id: f2, principal: true }],
        relato: {
          por: 'elizete',
          texto: 'Antes do áudio.\n\nDepois do áudio.',
          audios: [{ id: a1, transcricao: 'A primeira fala.' }, { id: a2 }],
          mensagens: [{ tipo: 'texto', texto: 'Antes do áudio.' }, { tipo: 'audio', audioId: a1 }, { tipo: 'texto', texto: 'Depois do áudio.' }, { tipo: 'audio', audioId: a2 }],
        },
      };
      const antes = impressao();
      // Quantos comandos o lote tem: uma tentativa em que a falha vem depois do último (não falha), desfeita
      sql.exec('SAVEPOINT conta');
      const { comandos } = await falhandoNoComando(9999, () => pedir('memorias', elizete, ficha));
      sql.exec('ROLLBACK TO conta');
      sql.exec('RELEASE conta');
      expect(impressao()).toBe(antes);
      expect(comandos).toBeGreaterThan(20);
      // A falha em cada posição do lote, do primeiro comando ao último
      for (let k = 0; k < comandos; k++) {
        const r = await falhandoNoComando(k, () => pedir('memorias', elizete, ficha));
        expect(r.falhou, `comando ${k}`).toBe(true);
        expect(r.erro, `comando ${k}`).toBeInstanceOf(Error);
        expect(impressao() === antes, `o banco mudou com a falha no comando ${k} de ${comandos}`).toBe(true);
      }
      // A nova tentativa: uma memória só, o relato dela, os dois áudios presos a ele, as quatro mensagens
      const r = await pedir('memorias', elizete, ficha);
      expect(r.status).toBe(201);
      expect(memoriasChamadas('Z2: lote único')).toEqual([r.corpo.id]);
      const relatos = relatosDa(r.corpo.id as string);
      expect(relatos).toHaveLength(1);
      expect(audioDe(a1)).toEqual({ relato_id: relatos[0].id, memoria_id: r.corpo.id, removido_em: null });
      expect(audioDe(a2)).toEqual({ relato_id: relatos[0].id, memoria_id: r.corpo.id, removido_em: null });
      expect(mensagensDo(relatos[0].id)).toEqual([
        { tipo: 'texto', texto: 'Antes do áudio.', audio_id: null },
        { tipo: 'audio', texto: null, audio_id: a1 },
        { tipo: 'texto', texto: 'Depois do áudio.', audio_id: null },
        { tipo: 'audio', texto: null, audio_id: a2 },
      ]);
      expect(linhas('SELECT id FROM integrantes WHERE nome = ?', 'Pessoa do Lote Único')).toHaveLength(1);
      expect(linhas<{ id: number }>('SELECT id FROM fotos WHERE memoria_id = ? ORDER BY ordem', r.corpo.id as string).map((f) => f.id)).toEqual([f1, f2]);
    });

    it('a rota inteira grava num lote só: nenhuma outra gravação antes nem depois dele', async () => {
      const audio = await audioSolto(giovanna);
      const gravacoes: string[] = [];
      // Toda gravação fora de lote passa por run(): conta as duas
      const run = ComandoDeTeste.prototype.run;
      ComandoDeTeste.prototype.run = async function (this: ComandoDeTeste) {
        if (/^\s*(INSERT|UPDATE|DELETE)/.test(this.sql)) gravacoes.push(`run: ${this.sql.trim().slice(0, 40)}`);
        return run.call(this);
      };
      try {
        const r = await comLote(
          async (lista) => {
            if (grava(lista)) gravacoes.push(`lote de ${lista.length}`);
            return lote(lista);
          },
          () => pedir('memorias', giovanna, { titulo: 'Z2: um lote', ano: 2019, tipo: 'causo', pessoas: ['giovanna', 'nova:0'], novasPessoas: [{ nome: 'Pessoa de Um Lote' }], temas: 'tema de um lote', relato: { por: 'giovanna', texto: 'Fala.', audios: [{ id: audio }], mensagens: [{ tipo: 'audio', audioId: audio }] } }),
        );
        expect(r.status).toBe(201);
      } finally {
        ComandoDeTeste.prototype.run = run;
      }
      expect(gravacoes).toHaveLength(1);
      expect(gravacoes[0]).toMatch(/^lote de \d+$/);
    });

    it('nenhum áudio de uma memória vai parar em outra: o que já é de outro relato, de outra memória ou de outra pessoa não entra', async () => {
      // O áudio que já está no relato da primeira memória
      const preso = await audioSolto(elizete);
      const primeira = (await pedir('memorias', elizete, { titulo: 'Z2: dona do áudio', ano: 2018, tipo: 'causo', pessoas: ['elizete'], relato: { por: 'elizete', texto: 'Com voz.', audios: [{ id: preso }], mensagens: [{ tipo: 'audio', audioId: preso }] } })).corpo.id as string;
      const daPrimeira = relatosDa(primeira)[0].id;
      expect(audioDe(preso)).toEqual({ relato_id: daPrimeira, memoria_id: primeira, removido_em: null });
      // O áudio enviado para a página do relato de outra memória, ainda sem relato
      const deOutraMemoria = await audioSolto(elizete, primeira);
      // O áudio solto de outra pessoa
      const daGiovanna = await audioSolto(giovanna);
      const segunda = await pedir('memorias', elizete, {
        titulo: 'Z2: quer o áudio das outras',
        ano: 2018,
        tipo: 'causo',
        pessoas: ['elizete'],
        relato: { por: 'elizete', texto: 'Texto.', audios: [{ id: preso }, { id: deOutraMemoria }, { id: daGiovanna }], mensagens: [{ tipo: 'texto', texto: 'Texto.' }, { tipo: 'audio', audioId: preso }, { tipo: 'audio', audioId: deOutraMemoria }, { tipo: 'audio', audioId: daGiovanna }] },
      });
      expect(segunda.status).toBe(201);
      // Os três áudios ficaram onde estavam
      expect(audioDe(preso)).toEqual({ relato_id: daPrimeira, memoria_id: primeira, removido_em: null });
      expect(audioDe(deOutraMemoria)).toEqual({ relato_id: null, memoria_id: primeira, removido_em: null });
      expect(audioDe(daGiovanna)).toEqual({ relato_id: null, memoria_id: null, removido_em: null });
      // E a segunda memória não mostra mensagem de áudio nenhuma
      expect(mensagensDo(relatosDa(segunda.corpo.id as string)[0].id)).toEqual([{ tipo: 'texto', texto: 'Texto.', audio_id: null }]);
      expect(mensagensDo(daPrimeira)).toEqual([{ tipo: 'audio', texto: null, audio_id: preso }]);
    });

    it('no rascunho com relato, salvar de novo mantém os áudios no mesmo relato, e tirar um áudio da lista só o marca como removido', async () => {
      const [a1, a2] = [await audioSolto(giovanna), await audioSolto(giovanna)];
      const ficha = { titulo: 'Z2: rascunho com voz', ano: 2020, tipo: 'causo', pessoas: ['giovanna'], situacao: 'rascunho' };
      const id = (await pedir('memorias', giovanna, { ...ficha, relato: { por: 'giovanna', texto: '', audios: [{ id: a1 }, { id: a2 }], mensagens: [{ tipo: 'audio', audioId: a1 }, { tipo: 'audio', audioId: a2 }] } })).corpo.id as string;
      const relato = relatosDa(id)[0].id;
      const gravadas = linhas<{ id: number; audio_id: number }>('SELECT id, audio_id FROM relato_mensagens WHERE relato_id = ? ORDER BY ordem', relato);
      const r = await pedir('memorias', giovanna, { ...ficha, id, fotosMostradas: [], relato: { por: 'giovanna', texto: '', audios: [{ id: a2 }], mensagens: [{ id: gravadas[1].id, tipo: 'audio', audioId: a2 }, { tipo: 'texto', texto: 'E um texto.' }] } });
      expect(r.status).toBe(200);
      expect(relatosDa(id)).toHaveLength(1);
      expect(audioDe(a2)).toMatchObject({ relato_id: relato, memoria_id: id, removido_em: null });
      expect(audioDe(a1).relato_id).toBe(relato);
      expect(audioDe(a1).removido_em).not.toBeNull();
      expect(mensagensDo(relato)).toEqual([
        { tipo: 'audio', texto: null, audio_id: a2 },
        { tipo: 'texto', texto: 'E um texto.', audio_id: null },
      ]);
    });

    it('na corrida entre dois pedidos iguais com o mesmo áudio solto, o áudio fica preso a uma memória só, e a outra não fica com mensagem apontando para ele (sessão AA)', async () => {
      // Era um defeito da fila: o lote não conferia de novo se o áudio ainda estava solto, e o áudio saía da
      // memória do outro pedido. Agora a conferência vai no lote (comandosDosAudios): quem perde a corrida
      // volta inteiro e é tratado de novo, já sem o áudio
      const audio = await audioSolto(elizete);
      const ficha = { titulo: 'Z2: dois toques com áudio', ano: 2018, tipo: 'causo', pessoas: ['elizete'], relato: { por: 'elizete', texto: '', audios: [{ id: audio }], mensagens: [{ tipo: 'audio', audioId: audio }] } };
      let doOutro = '';
      const r = await comOutroPedidoNaPorta(
        /^\s*INSERT INTO memorias/,
        async () => {
          // O outro pedido, igual, passa inteiro enquanto este espera na porta do lote
          banco.batch = lote;
          doOutro = (await pedir('memorias', elizete, ficha)).corpo.id as string;
        },
        () => pedir('memorias', elizete, ficha),
      );
      expect(r.status).toBe(201);
      expect(memoriasChamadas('Z2: dois toques com áudio')).toHaveLength(2);
      // O áudio ficou com a memória do outro pedido, no relato dele, com a mensagem dele
      const doOutroRelato = relatosDa(doOutro)[0].id;
      expect(audioDe(audio)).toEqual({ relato_id: doOutroRelato, memoria_id: doOutro, removido_em: null });
      expect(mensagensDo(doOutroRelato)).toEqual([{ tipo: 'audio', texto: null, audio_id: audio }]);
      // A memória deste pedido não tem relato vazio nem mensagem nenhuma apontando para o áudio
      expect(r.corpo.id).not.toBe(doOutro);
      expect(relatosDa(r.corpo.id as string)).toEqual([]);
      expect(linhas('SELECT id FROM relato_mensagens WHERE audio_id = ? AND relato_id <> ?', audio, doOutroRelato)).toEqual([]);
    });

    it('sessão AA: na corrida com o mesmo áudio e um texto, a memória que perde fica com o texto e sem o áudio', async () => {
      const audio = await audioSolto(elizete);
      const ficha = { titulo: 'Z2: dois toques com áudio e texto', ano: 2018, tipo: 'causo', pessoas: ['elizete'], relato: { por: 'elizete', texto: '', audios: [{ id: audio }], mensagens: [{ tipo: 'audio', audioId: audio }, { tipo: 'texto', texto: 'E um texto.' }] } };
      let doOutro = '';
      const r = await comOutroPedidoNaPorta(
        /^\s*INSERT INTO memorias/,
        async () => {
          banco.batch = lote;
          doOutro = (await pedir('memorias', elizete, ficha)).corpo.id as string;
        },
        () => pedir('memorias', elizete, ficha),
      );
      expect(r.status).toBe(201);
      expect(audioDe(audio).memoria_id).toBe(doOutro);
      const [relato] = relatosDa(r.corpo.id as string);
      expect(mensagensDo(relato!.id)).toEqual([{ tipo: 'texto', texto: 'E um texto.', audio_id: null }]);
    });

    it('o lote único de uma memória no limite dos campos fica dentro dos limites do D1 por comando, e a rota faz poucas chamadas ao banco', async () => {
      // O máximo que o pedido aceita: 30 fotos, 20 áudios, 200 mensagens, 20 pessoas novas, 60 marcadas
      const { AUDIOS_POR_RELATO } = await import('../src/lib/audios');
      const { MENSAGENS_POR_RELATO } = await import('../src/lib/conversa');
      const fotos = Array.from({ length: 30 }, () => fotoSolta(giovanna));
      const audios: number[] = [];
      for (let n = 0; n < AUDIOS_POR_RELATO; n++) audios.push(await audioSolto(giovanna));
      const existentes = linhas<{ id: string }>(`SELECT i.id FROM integrantes i WHERE i.id NOT IN (SELECT pessoa_id FROM lacos_coracao WHERE privado = 1) ORDER BY i.id LIMIT 40`).map((i) => i.id);
      const todas = (await repo.listarIntegrantesQueVe(giovanna)).map((i) => i.id);
      const marcadas = existentes.filter((id) => todas.includes(id)).slice(0, 40);
      const mensagens = [
        ...audios.map((id) => ({ tipo: 'audio', audioId: id })),
        ...Array.from({ length: MENSAGENS_POR_RELATO - audios.length }, (_, n) => ({ tipo: 'texto', texto: `Mensagem ${n} do relato mais comprido que a tela aceita.` })),
      ];
      const ficha = {
        titulo: 'Z2: a maior memória',
        ano: 2015,
        mes: 12,
        dia: 25,
        tipo: 'causo',
        lugar: 'Belo Horizonte',
        pessoas: [...marcadas, ...Array.from({ length: 20 }, (_, n) => `nova:${n}`)],
        novasPessoas: Array.from({ length: 20 }, (_, n) => ({ nome: `Pessoa Grande ${n}` })),
        temas: Array.from({ length: 40 }, (_, n) => `tema grande ${n}`).join(', ').slice(0, 500),
        nucleos: giovanna.nucleos,
        visibilidade: 'nucleos',
        fotos: fotos.map((id, n) => ({ id, legenda: `Legenda ${n}`, principal: n === 3 })),
        relato: { por: 'giovanna', texto: 'x', audios: audios.map((id) => ({ id, transcricao: 'Transcrição.' })), mensagens },
      };
      const lotes: { comandos: number; maiorTexto: number; maisValores: number }[] = [];
      let chamadas = 0;
      const originais = { all: ComandoDeTeste.prototype.all, run: ComandoDeTeste.prototype.run, first: ComandoDeTeste.prototype.first };
      for (const nome of ['all', 'run', 'first'] as const) {
        ComandoDeTeste.prototype[nome] = async function (this: ComandoDeTeste, ...resto: never[]) {
          chamadas++;
          expect(valoresDe(this).length, this.sql).toBeLessThanOrEqual(100);
          return (originais[nome] as (...a: never[]) => Promise<unknown>).apply(this, resto);
        } as never;
      }
      let r: Awaited<ReturnType<typeof pedir>>;
      try {
        r = await comLote(
          async (lista) => {
            chamadas++;
            if (grava(lista)) lotes.push({ comandos: lista.length, maiorTexto: Math.max(...lista.map((c) => new TextEncoder().encode(c.sql).length)), maisValores: Math.max(...lista.map((c) => valoresDe(c).length)) });
            return lote(lista);
          },
          () => pedir('memorias', giovanna, ficha),
        );
      } finally {
        Object.assign(ComandoDeTeste.prototype, originais);
      }
      expect(r.status).toBe(201);
      expect(lotes).toHaveLength(1);
      // Os limites do D1 que valem para um lote (developers.cloudflare.com/d1/platform/limits, lido em
      // 23/11/2026): 100 valores por comando e 100 KB por comando. Não há limite documentado de comandos por lote
      expect(lotes[0].maisValores).toBeLessThanOrEqual(100);
      expect(lotes[0].maiorTexto).toBeLessThan(100_000);
      // O tamanho do maior lote possível, para ficar à vista de quem mexer: passa de 300 comandos
      expect(lotes[0].comandos).toBeGreaterThan(300);
      expect(lotes[0].comandos).toBeLessThan(500);
      // As chamadas ao banco da rota (cada consulta e cada lote conta uma): o plano gratuito dá 50 por pedido,
      // contando as do começo de todo pedido (a preparação, quem pede, os tipos, os apelidos)
      expect(chamadas).toBeLessThanOrEqual(30);
      // E tudo entrou
      const id = r.corpo.id as string;
      const relato = relatosDa(id)[0].id;
      expect(mensagensDo(relato)).toHaveLength(MENSAGENS_POR_RELATO);
      expect(linhas('SELECT id FROM audios WHERE relato_id = ? AND memoria_id = ? AND removido_em IS NULL', relato, id)).toHaveLength(AUDIOS_POR_RELATO);
      expect(linhas('SELECT id FROM fotos WHERE memoria_id = ?', id)).toHaveLength(30);
      expect(linhas('SELECT integrante_id FROM memoria_integrantes WHERE memoria_id = ?', id)).toHaveLength(marcadas.length + 20);
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 6 (D2): o código repetido de pessoa, de tema e de memória', () => {
    /** Os lotes que gravam durante o pedido: quantos foram tentados */
    async function contandoLotes<T>(outro: (lista: ComandoDeTeste[], vez: number) => void, fazer: () => Promise<T>): Promise<{ r: T; tentativas: number }> {
      let tentativas = 0;
      const r = await comLote(async (lista) => {
        if (grava(lista)) outro(lista, ++tentativas);
        return lote(lista);
      }, fazer);
      return { r, tentativas };
    }

    it('a pessoa nova que outro pedido acabou de cadastrar, à vista de todos: a nova tentativa usa a mesma ficha, sem cadastrar em dobro', async () => {
      const { r, tentativas } = await contandoLotes(
        (_, vez) => {
          if (vez === 1) sql.prepare(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('beltrana-da-z2', 'Beltrana da Z2', 'gui')`).run();
        },
        () => pedir('memorias', giovanna, { titulo: 'Z2: pessoa repetida à vista', ano: 2011, tipo: 'causo', pessoas: ['giovanna', 'nova:0'], novasPessoas: [{ nome: 'Beltrana da Z2' }] }),
      );
      expect(r.status).toBe(201);
      expect(tentativas).toBe(2);
      expect(memoriasChamadas('Z2: pessoa repetida à vista')).toEqual([r.corpo.id]);
      expect(linhas<{ id: string }>(`SELECT id FROM integrantes WHERE nome = 'Beltrana da Z2'`)).toEqual([{ id: 'beltrana-da-z2' }]);
      expect(linhas<{ i: string }>('SELECT integrante_id AS i FROM memoria_integrantes WHERE memoria_id = ? ORDER BY i', r.corpo.id as string).map((l) => l.i)).toEqual(['beltrana-da-z2', 'giovanna']);
    });

    it('a pessoa nova com o código de alguém que só outra pessoa vê: ganha outro código, e a resposta não cita quem é privado', async () => {
      const { r, tentativas } = await contandoLotes(
        (_, vez) => {
          if (vez !== 1) return;
          // O outro pedido é do Gui: cadastrou alguém com o mesmo código, num laço "só eu vejo"
          sql.prepare(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('sicrana-da-z2', 'Segredo do Gui', 'gui')`).run();
          sql.prepare(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('gui', 'sicrana-da-z2', 'amiga', 1)`).run();
        },
        () => pedir('memorias', elizete, { titulo: 'Z2: pessoa repetida e privada', ano: 2011, tipo: 'causo', pessoas: ['elizete', 'nova:0'], novasPessoas: [{ nome: 'Sicrana da Z2' }] }),
      );
      expect(r.status).toBe(201);
      expect(tentativas).toBe(2);
      expect(JSON.stringify(r.corpo)).not.toContain('Segredo');
      expect(linhas<{ id: string; nome: string }>(`SELECT id, nome FROM integrantes WHERE id LIKE 'sicrana-da-z2%' ORDER BY id`)).toEqual([
        { id: 'sicrana-da-z2', nome: 'Segredo do Gui' },
        { id: 'sicrana-da-z2-2', nome: 'Sicrana da Z2' },
      ]);
      expect(linhas<{ i: string }>('SELECT integrante_id AS i FROM memoria_integrantes WHERE memoria_id = ? ORDER BY i', r.corpo.id as string).map((l) => l.i)).toEqual(['elizete', 'sicrana-da-z2-2']);
      // A memória da Elizete não revela a pessoa do Gui a ninguém
      expect((await repo.listarIntegrantesQueVe(elizete)).some((i) => i.id === 'sicrana-da-z2')).toBe(false);
    });

    it('o tema novo com o código que outro pedido acabou de usar: a memória fica no tema que já existe, sem tema em dobro', async () => {
      const { r, tentativas } = await contandoLotes(
        (_, vez) => {
          if (vez === 1) sql.prepare(`INSERT INTO temas (id, nome, criado_por) VALUES ('festas-da-z2', 'Festas da Z2', 'gui')`).run();
        },
        () => pedir('memorias', giovanna, { titulo: 'Z2: tema repetido', ano: 2011, tipo: 'causo', pessoas: ['giovanna'], temas: 'festas da z2, outro tema da z2' }),
      );
      expect(r.status).toBe(201);
      expect(tentativas).toBe(2);
      expect(linhas(`SELECT id FROM temas WHERE id LIKE 'festas-da-z2%'`)).toHaveLength(1);
      expect(linhas(`SELECT id FROM temas WHERE id LIKE 'outro-tema-da-z2%'`)).toHaveLength(1);
      expect(linhas<{ t: string }>('SELECT tema_id AS t FROM tema_memorias WHERE memoria_id = ? ORDER BY t', r.corpo.id as string).map((l) => l.t)).toEqual(['festas-da-z2', 'outro-tema-da-z2']);
    });

    it('os três códigos repetidos de uma vez, com relato, áudio e foto: uma memória, um relato, um áudio preso, nada em dobro', async () => {
      const audio = await audioSolto(giovanna);
      const foto = fotoSolta(giovanna);
      let usado = '';
      const { r, tentativas } = await contandoLotes(
        (lista, vez) => {
          if (vez !== 1) return;
          usado = String(valoresDe(lista.find((c) => /^\s*INSERT INTO memorias/.test(c.sql))!)[0]);
          sql.prepare(`INSERT INTO memorias (id, titulo, ano, tipo, visibilidade, situacao, criada_por) VALUES (?, 'Do outro pedido da Z2', 2000, 'causo', 'todos', 'publicada', 'gui')`).run(usado);
          sql.prepare(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('tres-codigos-da-z2', 'Três Códigos da Z2', 'gui')`).run();
          sql.prepare(`INSERT INTO temas (id, nome, criado_por) VALUES ('tres-da-z2', 'tres da z2', 'gui')`).run();
        },
        () =>
          pedir('memorias', giovanna, {
            titulo: 'Z2: três códigos',
            ano: 2011,
            tipo: 'causo',
            pessoas: ['giovanna', 'nova:0'],
            novasPessoas: [{ nome: 'Três Códigos da Z2' }],
            temas: 'tres da z2',
            fotos: [{ id: foto }],
            relato: { por: 'giovanna', texto: 'Um texto.', audios: [{ id: audio }], mensagens: [{ tipo: 'texto', texto: 'Um texto.' }, { tipo: 'audio', audioId: audio }] },
          }),
      );
      expect(r.status).toBe(201);
      expect(tentativas).toBe(2);
      expect(r.corpo.id).not.toBe(usado);
      expect(uma<{ titulo: string }>('SELECT titulo FROM memorias WHERE id = ?', usado).titulo).toBe('Do outro pedido da Z2');
      expect(memoriasChamadas('Z2: três códigos')).toEqual([r.corpo.id]);
      const relatos = relatosDa(r.corpo.id as string);
      expect(relatos).toHaveLength(1);
      expect(linhas(`SELECT id FROM relatos WHERE memoria_id = ?`, usado)).toHaveLength(0);
      expect(audioDe(audio)).toEqual({ relato_id: relatos[0].id, memoria_id: r.corpo.id, removido_em: null });
      expect(mensagensDo(relatos[0].id)).toHaveLength(2);
      expect(linhas(`SELECT id FROM integrantes WHERE nome = 'Três Códigos da Z2'`)).toHaveLength(1);
      expect(linhas(`SELECT id FROM temas WHERE id LIKE 'tres-da-z2%'`)).toHaveLength(1);
      expect(uma<{ memoria_id: string; principal: number }>('SELECT memoria_id, principal FROM fotos WHERE id = ?', foto)).toEqual({ memoria_id: r.corpo.id, principal: 1 });
    });

    it('na correção de uma memória publicada, a pessoa nova com código repetido tenta de novo e guarda uma versão só no histórico', async () => {
      const ficha = { titulo: 'Z2: correção com código repetido', ano: 2011, tipo: 'causo', pessoas: ['giovanna'] };
      const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
      const versoes = () => uma<{ n: number }>(`SELECT COUNT(*) AS n FROM versoes WHERE tipo = 'memoria' AND item_id = ?`, id).n;
      const antes = versoes();
      const { r, tentativas } = await contandoLotes(
        (_, vez) => {
          if (vez === 1) sql.prepare(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('chegou-depois-da-z2', 'Chegou Depois da Z2', 'gui')`).run();
        },
        () => pedir('memorias', giovanna, { ...ficha, id, lugar: 'Sabará', fotosMostradas: [], pessoas: ['giovanna', 'nova:0'], novasPessoas: [{ nome: 'Chegou Depois da Z2' }] }),
      );
      expect(r.status).toBe(200);
      expect(tentativas).toBe(2);
      expect(versoes()).toBe(antes + 1);
      expect(linhas(`SELECT id FROM integrantes WHERE nome = 'Chegou Depois da Z2'`)).toHaveLength(1);
      expect(uma<{ lugar: string }>('SELECT lugar FROM memorias WHERE id = ?', id).lugar).toBe('Sabará');
    });

    for (const tabela of ['memorias', 'integrantes', 'temas']) {
      it(`o código de ${tabela} que repete toda vez: três tentativas, resposta 503 com recado, nunca erro sem tratar, e o banco igual`, async () => {
        const audio = await audioSolto(giovanna);
        const ficha = { titulo: `Z2: sem sorte em ${tabela}`, ano: 2011, tipo: 'causo', pessoas: ['giovanna', 'nova:0'], novasPessoas: [{ nome: `Sem Sorte ${tabela}` }], temas: `sem sorte ${tabela}`, relato: { por: 'giovanna', texto: 'Texto.', audios: [{ id: audio }] } };
        const antes = impressao();
        let tentativas = 0;
        const falha = async (lista: ComandoDeTeste[]) => {
          if (!grava(lista)) return lote(lista);
          tentativas++;
          throw new Error(`D1_ERROR: UNIQUE constraint failed: ${tabela}.id: SQLITE_CONSTRAINT`);
        };
        const r = await comLote(falha, () => pedir('memorias', giovanna, ficha));
        expect(r.status).toBe(503);
        expect(r.corpo).toEqual({ erro: 'Não consegui salvar.' });
        expect(tentativas).toBe(3);
        expect(impressao()).toBe(antes);
        // Sem script: volta para o formulário, com o recado
        tentativas = 0;
        const volta = await comLote(falha, () => semScript('memorias', giovanna, { titulo: ficha.titulo, ano: '2011', tipo: 'causo', pessoas: 'giovanna', relato: 'Texto.', relatoPor: 'giovanna', situacao: 'publicada' }));
        expect(volta).toMatchObject({ status: 303, caminho: '/nova', erro: 'Não consegui salvar.', ok: null });
        expect(tentativas).toBe(3);
        expect(impressao()).toBe(antes);
      });
    }

    it('sem script, a correção que falha volta para o formulário da própria memória', async () => {
      const id = (await pedir('memorias', giovanna, { titulo: 'Z2: correção sem sorte', ano: 2011, tipo: 'causo', pessoas: ['giovanna'] })).corpo.id as string;
      const antes = impressao();
      const volta = await comLote(
        async (lista) => {
          if (!grava(lista)) return lote(lista);
          throw new Error('D1_ERROR: UNIQUE constraint failed: integrantes.id: SQLITE_CONSTRAINT');
        },
        () => semScript('memorias', giovanna, { id, titulo: 'Z2: correção sem sorte', ano: '2011', tipo: 'causo', pessoas: 'giovanna', lugar: 'Caeté' }),
      );
      expect(volta.caminho + volta.destino.search.replace(/&erro=.*/, '')).toBe(`/nova?id=${id}`);
      expect(volta.erro).toBe('Não consegui salvar.');
      expect(impressao()).toBe(antes);
    });

    it('outra falha do banco não é tentada de novo nem vira recado de código: continua sendo erro, com o banco igual', async () => {
      const antes = impressao();
      let tentativas = 0;
      const resultado = await comLote(
        async (lista) => {
          if (!grava(lista)) return lote(lista);
          tentativas++;
          throw new Error('D1_ERROR: UNIQUE constraint failed: relatos.memoria_id, relatos.por, relatos.registrado_por: SQLITE_CONSTRAINT');
        },
        () => pedir('memorias', giovanna, { titulo: 'Z2: outra falha', ano: 2011, tipo: 'causo', pessoas: ['giovanna'] }).catch((e: Error) => e),
      );
      expect(resultado).toBeInstanceOf(Error);
      expect(tentativas).toBe(1);
      expect(impressao()).toBe(antes);
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 7 (D3): o toque duplo sem script na janela do relato', () => {
    /** A janela sem script: o que o navegador manda ao tocar no botão */
    const janela = (quem: Usuario, campos: Record<string, string>) => semScript('relatos', quem, { por: quem.pessoa, acrescentar: '1', situacao: 'publicada', ...campos });
    const novaMemoria = async (titulo: string, quem = giovanna) => (await pedir('memorias', quem, { titulo, ano: 2012, tipo: 'causo', pessoas: [quem.pessoa] })).corpo.id as string;
    const textos = (memoria: string, por: string) => linhas<{ texto: string }>('SELECT m.texto FROM relato_mensagens m JOIN relatos r ON r.id = m.relato_id WHERE r.memoria_id = ? AND r.por = ? ORDER BY m.ordem', memoria, por).map((m) => m.texto);
    const avisosDa = (memoria: string) => uma<{ n: number }>('SELECT COUNT(*) AS n FROM avisos WHERE memoria_id = ?', memoria).n;

    it('dois envios iguais do relato que nasce: um relato, uma mensagem, um aviso, e a mesma resposta', async () => {
      const id = await novaMemoria('Z2: toque duplo no relato novo');
      const envio = { memoria: id, texto: 'Eu lembro desse dia.', envio: 'z2-toque-duplo-novo' };
      const primeiro = await janela(elizete, envio);
      expect(primeiro.ok).toBe('Mensagem enviada. Ela já está na memória.');
      const depois = impressao();
      const avisos = avisosDa(id);
      expect(avisos).toBeGreaterThan(0);
      const segundo = await janela(elizete, envio);
      expect(impressao()).toBe(depois);
      expect(relatosDa(id)).toHaveLength(1);
      expect(textos(id, 'elizete')).toEqual(['Eu lembro desse dia.']);
      expect(avisosDa(id)).toBe(avisos);
      expect([segundo.status, segundo.caminho, segundo.ok, segundo.erro]).toEqual([primeiro.status, primeiro.caminho, primeiro.ok, primeiro.erro]);
    });

    it('dois toques em "Publicar relato" no rascunho: publica uma vez, com um aviso só', async () => {
      const id = await novaMemoria('Z2: toque duplo em publicar');
      await janela(elizete, { memoria: id, texto: 'Primeiro em rascunho.', situacao: 'rascunho', envio: 'z2-publicar-a' });
      expect(relatosDa(id)[0].situacao).toBe('rascunho');
      const semAviso = avisosDa(id);
      const publicar = { memoria: id, texto: '', situacao: 'publicada', envio: 'z2-publicar-b' };
      const primeiro = await janela(elizete, publicar);
      expect(primeiro.ok).toBe('Relato publicado.');
      const depois = impressao();
      expect(avisosDa(id)).toBeGreaterThan(semAviso);
      const segundo = await janela(elizete, publicar);
      expect(impressao()).toBe(depois);
      expect(relatosDa(id).map((r) => r.situacao)).toEqual(['publicada']);
      expect(textos(id, 'elizete')).toEqual(['Primeiro em rascunho.']);
      expect(segundo.ok).toBe('Relato publicado.');
    });

    it('sessão AA: "Publicar relato" sem script, com o texto que ficou na caixa, leva à memória, no relato, também no toque duplo', async () => {
      const id = await novaMemoria('AA: publicar com o texto na caixa');
      await janela(elizete, { memoria: id, texto: 'Em rascunho, antes.', situacao: 'rascunho', envio: 'aa-publicar-a' });
      // O botão "Publicar relato" manda publicar=1, sem a situação
      const publicar = { memoria: id, texto: 'E o que ficou na caixa.', situacao: '', publicar: '1', envio: 'aa-publicar-b' };
      const primeiro = await janela(elizete, publicar);
      const relato = relatosDa(id)[0];
      expect(relato.situacao).toBe('publicada');
      expect([primeiro.caminho, primeiro.ok, primeiro.destino.hash]).toEqual([`/memorias/${id}`, 'Relato publicado.', `#relato-${relato.id}`]);
      expect(textos(id, 'elizete')).toEqual(['Em rascunho, antes.', 'E o que ficou na caixa.']);
      const segundo = await janela(elizete, publicar);
      expect([segundo.status, segundo.caminho, segundo.ok, segundo.destino.hash]).toEqual([primeiro.status, primeiro.caminho, primeiro.ok, primeiro.destino.hash]);
      expect(textos(id, 'elizete')).toEqual(['Em rascunho, antes.', 'E o que ficou na caixa.']);
    });

    it('dois envios diferentes e legítimos seguidos, cada um da sua página: os dois gravam, na ordem', async () => {
      const id = await novaMemoria('Z2: dois envios legítimos');
      await janela(elizete, { memoria: id, texto: 'A primeira mensagem.', envio: 'z2-legitimo-1' });
      await janela(elizete, { memoria: id, texto: 'A segunda mensagem.', envio: 'z2-legitimo-2' });
      await janela(elizete, { memoria: id, texto: 'A primeira mensagem.', envio: 'z2-legitimo-3' });
      expect(textos(id, 'elizete')).toEqual(['A primeira mensagem.', 'A segunda mensagem.', 'A primeira mensagem.']);
    });

    it('a página de antes, sem o código, continua gravando cada envio', async () => {
      const id = await novaMemoria('Z2: página sem código');
      await janela(elizete, { memoria: id, texto: 'Sem código, a primeira.' });
      await janela(elizete, { memoria: id, texto: 'Sem código, a segunda.' });
      expect(textos(id, 'elizete')).toEqual(['Sem código, a primeira.', 'Sem código, a segunda.']);
      expect(linhas('SELECT codigo FROM envios WHERE codigo IS NULL')).toHaveLength(0);
    });

    it('o pedido que perde a corrida três vezes não gasta o código: o mesmo envio grava depois', async () => {
      const id = await novaMemoria('Z2: código depois da corrida');
      const antes = impressao();
      const guardados = () => uma<{ n: number }>('SELECT COUNT(*) AS n FROM envios').n;
      const antesDoEnvio = guardados();
      // A memória muda na porta de cada lote do relato: MemoriaMudou nas três tentativas
      let tentativas = 0;
      const recusado = await comLote(
        async (lista) => {
          if (lista.some((c) => /INSERT INTO envios/.test(c.sql))) {
            tentativas++;
            sql.prepare('UPDATE memorias SET versao = versao + 1 WHERE id = ?').run(id);
          }
          return lote(lista);
        },
        () => janela(elizete, { memoria: id, texto: 'Depois da corrida.', envio: 'z2-corrida' }),
      );
      expect(recusado.erro).toBe(repo.RECADO_MEMORIA_MUDOU);
      expect(tentativas).toBe(3);
      // Nada ficou além da versão que o outro pedido subiu: nem o código, nem o relato
      expect(impressao().replace(/"versao":\d+/g, '"versao":0')).toBe(antes.replace(/"versao":\d+/g, '"versao":0'));
      expect(guardados()).toBe(antesDoEnvio);
      expect((await janela(elizete, { memoria: id, texto: 'Depois da corrida.', envio: 'z2-corrida' })).ok).toBe('Mensagem enviada. Ela já está na memória.');
      expect(textos(id, 'elizete')).toEqual(['Depois da corrida.']);
    });

    it('o mesmo código com outro texto (a mesma página enviada de novo) grava a mensagem nova; com o mesmo texto, não repete', async () => {
      // Antes da Z2 o código só guardava que a página já tinha enviado: o segundo envio, com outro texto, não
      // entrava, e o recado era o de sucesso. Agora o código vale junto com o texto
      const id = await novaMemoria('Z2: mesmo código, outro texto');
      await janela(elizete, { memoria: id, texto: 'A que entrou.', envio: 'z2-mesma-pagina' });
      const segundo = await janela(elizete, { memoria: id, texto: 'A que eu escrevi depois, na mesma página.', envio: 'z2-mesma-pagina' });
      expect(segundo.ok).toBe('Mensagem enviada. Ela já está na memória.');
      expect(textos(id, 'elizete')).toEqual(['A que entrou.', 'A que eu escrevi depois, na mesma página.']);
      // O toque duplo em cada uma continua sem repetir
      const depois = impressao();
      await janela(elizete, { memoria: id, texto: 'A que entrou.', envio: 'z2-mesma-pagina' });
      await janela(elizete, { memoria: id, texto: 'A que eu escrevi depois, na mesma página.', envio: 'z2-mesma-pagina' });
      expect(impressao()).toBe(depois);
      // "Publicar relato" (sem texto) na mesma página de uma mensagem: é outro envio, e não acrescenta nada
      const rascunho = await novaMemoria('Z2: enviar e publicar na mesma página');
      await janela(elizete, { memoria: rascunho, texto: 'Em rascunho.', situacao: 'rascunho', envio: 'z2-enviar-e-publicar' });
      expect((await janela(elizete, { memoria: rascunho, texto: '', situacao: 'publicada', envio: 'z2-enviar-e-publicar' })).ok).toBe('Relato publicado.');
      expect(relatosDa(rascunho).map((r) => r.situacao)).toEqual(['publicada']);
      expect(textos(rascunho, 'elizete')).toEqual(['Em rascunho.']);
    });

    it('o código de envio de uma pessoa não serve para outra pessoa nem para outro relato: cada envio grava o seu', async () => {
      const id = await novaMemoria('Z2: código de outra pessoa');
      const outra = await novaMemoria('Z2: código em outro relato');
      const texto = 'O mesmo texto, com o mesmo código.';
      await janela(elizete, { memoria: id, texto, envio: 'z2-codigo-da-elizete' });
      // Outra pessoa, na mesma memória, com o código e o texto da Elizete: o envio dela grava, no relato dela
      expect((await janela(giovanna, { memoria: id, texto, envio: 'z2-codigo-da-elizete' })).ok).toBe('Mensagem enviada. Ela já está na memória.');
      // A mesma pessoa, em outra memória (outro relato): grava
      expect((await janela(elizete, { memoria: outra, texto, envio: 'z2-codigo-da-elizete' })).ok).toBe('Mensagem enviada. Ela já está na memória.');
      // A mesma pessoa, na mesma memória, em nome de quem não acessa o site (outro relato): grava
      expect((await janela(elizete, { memoria: id, por: 'aguilar', texto, envio: 'z2-codigo-da-elizete' })).ok).toBe('Mensagem enviada. Ela já está na memória.');
      expect(relatosDa(id).map((r) => [r.por, r.registrado_por, r.texto])).toEqual([
        ['elizete', 'elizete', texto],
        ['giovanna', 'giovanna', texto],
        ['aguilar', 'elizete', texto],
      ]);
      expect(relatosDa(outra).map((r) => [r.por, r.texto])).toEqual([['elizete', texto]]);
      // E o toque duplo de cada um continua sem repetir
      const depois = impressao();
      await janela(giovanna, { memoria: id, texto, envio: 'z2-codigo-da-elizete' });
      await janela(elizete, { memoria: outra, texto, envio: 'z2-codigo-da-elizete' });
      await janela(elizete, { memoria: id, por: 'aguilar', texto, envio: 'z2-codigo-da-elizete' });
      expect(impressao()).toBe(depois);
    });

    it('se o banco falha ao gravar as mensagens do envio sem script, nada fica pela metade, e a nova tentativa com o mesmo código grava a mensagem (sessão AA)', async () => {
      // Era um defeito da fila: as mensagens iam num lote depois do relato e do código, e a nova tentativa era
      // tratada como toque duplo, com a mensagem só no texto do relato. Agora vão no mesmo lote
      const id = await novaMemoria('Z2: falha depois do lote');
      await janela(elizete, { memoria: id, texto: 'A primeira, inteira.', envio: 'z2-falha-0' });
      const antes = impressao();
      const envio = { memoria: id, texto: 'A segunda, que falhou no meio.', envio: 'z2-falha-1' };
      const falhou = await comLote(
        async (lista) => {
          if (lista.some((c) => /INSERT INTO relato_mensagens/.test(c.sql))) throw new Error('D1_ERROR: falha de teste');
          return lote(lista);
        },
        () => janela(elizete, envio).catch((e: Error) => e),
      );
      expect(falhou).toBeInstanceOf(Error);
      // Nada ficou: nem o texto do relato, nem o código do envio
      expect(impressao()).toBe(antes);
      const deNovo = await janela(elizete, envio);
      expect(deNovo.ok).toBe('Mensagem enviada. Ela já está na memória.');
      expect(relatosDa(id)[0].texto).toContain('A segunda, que falhou no meio.');
      expect(textos(id, 'elizete')).toEqual(['A primeira, inteira.', 'A segunda, que falhou no meio.']);
      // E o toque duplo depois disso continua sem repetir
      const depois = impressao();
      await janela(elizete, envio);
      expect(impressao()).toBe(depois);
    });

    it('sessão AA: o envio sem script com citação grava a citação no mesmo lote, e o relato novo nasce com a mensagem', async () => {
      const id = await novaMemoria('AA: citação no lote', giovanna);
      await janela(giovanna, { memoria: id, texto: 'O que a Giovanna contou.', envio: 'aa-cita-0' });
      const citada = uma<{ id: number }>(`SELECT m.id FROM relato_mensagens m JOIN relatos r ON r.id = m.relato_id WHERE r.memoria_id = ? AND r.por = 'giovanna'`, id).id;
      await janela(elizete, { memoria: id, texto: 'Respondendo a ela.', cita: String(citada), envio: 'aa-cita-1' });
      expect(linhas<{ texto: string; cita: number | null }>(`SELECT m.texto, m.cita_id AS cita FROM relato_mensagens m JOIN relatos r ON r.id = m.relato_id WHERE r.memoria_id = ? AND r.por = 'elizete'`, id)).toEqual([{ texto: 'Respondendo a ela.', cita: citada }]);
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 8 (D3): a migração 109-envios-unicos', async () => {
    const { MIGRACOES } = await import('../src/lib/servidor/banco');
    const espelho = await import('../src/lib/espelho');
    const copia = await import('../src/lib/servidor/copia');

    it('a tabela nova tem só o código e a hora, e nenhum texto do relato chega a ela', async () => {
      expect(linhas<{ name: string }>(`PRAGMA table_info(envios)`).map((c) => c.name)).toEqual(['codigo', 'em']);
      const migracao = MIGRACOES.at(-1)!;
      expect(migracao.id).toBe('109-envios-unicos');
      expect(migracao.sql).toHaveLength(1);
      const id = (await pedir('memorias', giovanna, { titulo: 'Z2: o que o envio guarda', ano: 2013, tipo: 'causo', pessoas: ['giovanna'] })).corpo.id as string;
      const texto = 'Um texto que só pode estar no relato: abacaxi-roxo-da-z2.';
      const antes = new Set(linhas<{ codigo: string }>('SELECT codigo FROM envios').map((l) => l.codigo));
      await semScript('relatos', elizete, { memoria: id, por: 'elizete', acrescentar: '1', situacao: 'publicada', texto, envio: 'z2-so-o-codigo' });
      const guardado = linhas<{ codigo: string; em: string }>('SELECT * FROM envios').filter((l) => !antes.has(l.codigo));
      expect(guardado).toHaveLength(1);
      expect(guardado[0].em).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      // A linha tem só um resumo (o do código com a pessoa, o relato e o texto) e a hora: nem o código que a
      // página mandou, nem o texto, nem quem escreveu, nem a memória
      expect(Object.keys(guardado[0]).sort()).toEqual(['codigo', 'em']);
      expect(guardado[0].codigo).toMatch(/^[0-9a-f]{64}$/);
      const tudo = JSON.stringify(linhas('SELECT * FROM envios'));
      for (const proibido of ['abacaxi', 'z2-so-o-codigo', 'elizete', id]) expect(tudo).not.toContain(proibido);
      for (const { codigo } of linhas<{ codigo: string }>('SELECT codigo FROM envios')) expect(codigo).toMatch(/^[0-9a-f]{64}$/);
    });

    it('os códigos de mais de dois dias saem no envio seguinte, e os recentes ficam', async () => {
      const id = (await pedir('memorias', giovanna, { titulo: 'Z2: a limpeza dos códigos', ano: 2013, tipo: 'causo', pessoas: ['giovanna'] })).corpo.id as string;
      sql.prepare(`INSERT INTO envios (codigo, em) VALUES ('z2-de-tres-dias', datetime('now', '-3 days')), ('z2-de-ontem', datetime('now', '-1 days'))`).run();
      const antes = uma<{ n: number }>('SELECT COUNT(*) AS n FROM envios').n;
      await semScript('relatos', elizete, { memoria: id, por: 'elizete', acrescentar: '1', situacao: 'publicada', texto: 'Limpa.', envio: 'z2-de-agora' });
      // Saiu o de três dias, ficou o de ontem e entrou o de agora
      expect(linhas<{ codigo: string }>(`SELECT codigo FROM envios WHERE codigo LIKE 'z2-de-%'`).map((l) => l.codigo)).toEqual(['z2-de-ontem']);
      expect(uma<{ n: number }>('SELECT COUNT(*) AS n FROM envios').n).toBe(antes);
      sql.prepare(`DELETE FROM envios WHERE codigo = 'z2-de-ontem'`).run();
    });

    it('"Baixar cópia do acervo" e a cópia mensal continuam funcionando com a tabela nova, que vai na cópia só com código e hora', async () => {
      const montada = await copia.montarCopia();
      expect(Object.keys(montada.tabelas)).toContain('envios');
      expect(Object.keys(montada.tabelas.envios[0]!).sort()).toEqual(['codigo', 'em']);
      // A cópia leva todas as tabelas do banco, como antes
      const tabelas = linhas<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name`).map((t) => t.name);
      expect(Object.keys(montada.tabelas).sort()).toEqual(tabelas);
      // O que o script do Drive confere (scripts/copia-no-drive.gs): resposta 200 com "tabelas" no texto
      const resposta = await copia.respostaDaCopia();
      const corpo = await resposta.text();
      expect(resposta.status).toBe(200);
      expect(corpo.indexOf('"tabelas"')).not.toBe(-1);
      expect(readFileSync('scripts/copia-no-drive.gs', 'utf-8')).toContain(`texto.indexOf('"tabelas"') === -1`);
      expect((JSON.parse(corpo) as typeof montada).tabelas.envios.length).toBeGreaterThan(0);
    });

    it('a tabela fica fora do espelho da produção: ele não a lê, não a leva e continua gravando com ela no banco', async () => {
      const fonte = readFileSync('src/lib/espelho.ts', 'utf-8');
      expect(fonte).not.toContain('envios');
      // A cópia de um acervo com códigos de envio, um deles com texto (que a tabela nem guarda): nada passa
      const montada = await copia.montarCopia();
      montada.tabelas.envios.push({ codigo: 'veneno-da-z2-que-nao-pode-passar', em: '2026-11-22 10:00:00' });
      const feito = espelho.espelhar(montada as never, { semente: 7, agora: new Date('2026-11-23T12:00:00Z') });
      expect(feito.tabelas.map(([nome]) => nome)).not.toContain('envios');
      const texto = JSON.stringify(feito);
      expect(texto).not.toContain('veneno-da-z2');
      for (const { codigo } of linhas<{ codigo: string }>('SELECT codigo FROM envios')) expect(texto).not.toContain(codigo);
      // Gravar o espelho com a tabela no banco: o lote passa, e os códigos da homologação ficam como estavam
      const comandos = espelho.comandosDoEspelho(feito);
      const codigosAntes = JSON.stringify(linhas('SELECT * FROM envios ORDER BY codigo'));
      sql.exec('SAVEPOINT espelho');
      try {
        for (const c of comandos) sql.prepare(c.sql).run(...(c.valores as (string | number | null)[]));
        expect(uma<{ n: number }>('SELECT COUNT(*) AS n FROM integrantes').n).toBe(feito.resumo.pessoas);
        expect(JSON.stringify(linhas('SELECT * FROM envios ORDER BY codigo'))).toBe(codigosAntes);
        expect(linhas('PRAGMA foreign_key_check')).toEqual([]);
      } finally {
        sql.exec('ROLLBACK TO espelho');
        sql.exec('RELEASE espelho');
      }
    });
  });

  // ---------------------------------------------------------------------------------------------------
  /** Uma memória publicada com fotos, na ordem, a primeira principal, cada uma com legenda */
  async function memoriaComFotos(titulo: string, dona: Usuario, quantas: number, extra: Record<string, unknown> = {}) {
    const ficha = { titulo, ano: 2014, tipo: 'causo', pessoas: [dona.pessoa], ...extra };
    const fotos = Array.from({ length: quantas }, () => fotoSolta(dona));
    const r = await pedir('memorias', dona, { ...ficha, fotos: fotos.map((id, n) => ({ id, legenda: `Legenda ${n}`, principal: n === 0 })) });
    expect(r.status).toBe(201);
    return { id: r.corpo.id as string, fotos, ficha: { ...ficha, id: r.corpo.id as string } };
  }
  const fotosDa = (memoria: string) =>
    linhas<{ id: number; principal: number; ordem: number; legenda: string | null; removida: number }>('SELECT id, principal, ordem, legenda, removida_em IS NOT NULL AS removida FROM fotos WHERE memoria_id = ? ORDER BY ordem, id', memoria);
  /** Uma foto que outra pessoa acrescenta à memória por fora do pedido em curso */
  const acrescentadaPor = (quem: Usuario, memoria: string) => {
    const ordem = uma<{ o: number | null }>('SELECT MAX(ordem) AS o FROM fotos WHERE memoria_id = ?', memoria).o ?? -1;
    sql.prepare(`INSERT INTO fotos (memoria_id, chave, principal, ordem, enviada_por) VALUES (?, ?, 0, ?, ?)`).run(memoria, `z2/acrescentada-${++serie}.jpg`, ordem + 1, quem.pessoa);
    return uma<{ id: number }>('SELECT MAX(id) AS id FROM fotos').id;
  };

  describe('ponto 9 (D4): o administrador que só corrige os dados e as fotos', () => {
    it('com "fotosMostradas" forjado, sem tirar foto nenhuma: a principal, a ordem, as legendas e o conjunto ficam como estão', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z2: D4 forjado', elizete, 4);
      const outra = await memoriaComFotos('Z2: D4 a outra memória', elizete, 2);
      const memoria = (await repo.obterMemoria(gui, id))!;
      expect(permissoes.alcanceDaCorrecao(gui, memoria)).toBe('dados');
      const [f0, f1, f2, f3] = fotos;
      const todas = fotos.map((f, n) => ({ id: f, legenda: `Legenda ${n}`, principal: n === 0 }));
      const minha = fotoSolta(gui);
      const antes = fotosDa(id);
      const antesDaOutra = fotosDa(outra.id);
      const forjados: [string, Record<string, unknown>][] = [
        ['uma parte, com outra principal', { fotosMostradas: [f2], fotos: [{ id: f2, legenda: 'Legenda 2', principal: true }] }],
        ['uma parte, em outra ordem', { fotosMostradas: [f1, f3], fotos: [{ id: f3, legenda: 'Legenda 3' }, { id: f1, legenda: 'Legenda 1' }] }],
        ['uma parte, com outra legenda', { fotosMostradas: [f1], fotos: [{ id: f1, legenda: 'Legenda trocada' }] }],
        ['vazio, sem fotos', { fotosMostradas: [], fotos: [] }],
        ['vazio, com as fotos em outra ordem e outra principal', { fotosMostradas: [], fotos: [{ id: f3, legenda: 'Legenda 3', principal: true }, { id: f0, legenda: 'Legenda 0' }] }],
        ['sem o campo, com outra principal', { fotos: [{ id: f3, legenda: 'Legenda 3', principal: true }] }],
        ['sem o campo e sem fotos', { fotos: [] }],
        ['com foto de outra memória entre as mostradas', { fotosMostradas: [...fotos, ...outra.fotos], fotos: todas }],
        ['só com fotos de outra memória entre as mostradas', { fotosMostradas: outra.fotos, fotos: [] }],
        ['com foto que não existe entre as mostradas', { fotosMostradas: [...fotos, 987654321], fotos: todas }],
        ['só com foto que não existe', { fotosMostradas: [987654321], fotos: [] }],
        ['todas, com outra principal', { fotosMostradas: fotos, fotos: todas.map((f, n) => ({ ...f, principal: n === 2 })) }],
        ['todas, em outra ordem', { fotosMostradas: fotos, fotos: [...todas].reverse() }],
        ['com foto de outra memória na lista', { fotosMostradas: fotos, fotos: [...todas, { id: outra.fotos[0] }] }],
        ['com uma foto nova dele na lista', { fotosMostradas: fotos, fotos: [...todas, { id: minha }] }],
        ['com uma foto nova dele e nenhuma mostrada', { fotosMostradas: [], fotos: [{ id: minha, principal: true }] }],
        ['sem o campo, com uma foto nova dele', { fotos: [{ id: minha, principal: true }] }],
      ];
      for (const [caso, corpo] of forjados) {
        const r = await pedir('memorias', gui, { ...ficha, lugar: 'Caeté', ...corpo });
        expect([200, 400, 403], caso).toContain(r.status);
        expect(fotosDa(id), caso).toEqual(antes);
        expect(fotosDa(outra.id), caso).toEqual(antesDaOutra);
        expect(uma<{ m: string | null }>('SELECT memoria_id AS m FROM fotos WHERE id = ?', minha).m, caso).toBeNull();
      }
      // A correção dos dados, essa sim, valeu num dos pedidos aceitos
      expect(uma<{ lugar: string }>('SELECT lugar FROM memorias WHERE id = ?', id).lugar).toBe('Caeté');
    });

    it('tirar uma foto continua sendo dele (podeRemoverFoto), e só sai a que ele viu e tirou: as outras ficam na mesma ordem', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z2: D4 tirar', elizete, 4);
      const [f0, f1, f2, f3] = fotos;
      // Viu só a principal e a tirou: a seguinte vira a principal; as que ele não viu nem saem nem mudam de lugar
      expect((await pedir('memorias', gui, { ...ficha, fotosMostradas: [f0], fotos: [] })).status).toBe(200);
      expect(fotosDa(id).filter((f) => !f.removida).map((f) => [f.id, f.principal, f.legenda])).toEqual([
        [f1, 1, 'Legenda 1'],
        [f2, 0, 'Legenda 2'],
        [f3, 0, 'Legenda 3'],
      ]);
      expect(uma<{ por: string }>('SELECT removida_por AS por FROM fotos WHERE id = ?', f0).por).toBe('gui');
    });

    it('quem pode mexer nas fotos continua podendo: quem criou e quem está na memória trocam a principal, a ordem e a legenda, tiram e acrescentam', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z2: D4 quem pode', elizete, 3, { pessoas: ['elizete', 'giovanna'] });
      const [f0, f1, f2] = fotos;
      // Quem criou: outra ordem, outra principal, outra legenda
      expect((await pedir('memorias', elizete, { ...ficha, fotosMostradas: fotos, fotos: [{ id: f2, legenda: 'Nova legenda', principal: true }, { id: f0 }, { id: f1 }] })).status).toBe(200);
      expect(fotosDa(id).map((f) => [f.id, f.principal, f.legenda])).toEqual([
        [f2, 1, 'Nova legenda'],
        [f0, 0, null],
        [f1, 0, null],
      ]);
      // Quem está na memória (a Giovanna): acrescenta uma foto dela e troca a principal; tirar a foto da Elizete é dela também, como administradora
      const nova = fotoSolta(giovanna);
      const memoria = (await repo.obterMemoria(giovanna, id))!;
      expect(permissoes.alcanceDaCorrecao(giovanna, memoria)).toBe('tudo');
      expect((await pedir('memorias', giovanna, { ...ficha, fotosMostradas: [f2, f0, f1], fotos: [{ id: f0, principal: true }, { id: nova, legenda: 'Da Giovanna' }, { id: f2 }] })).status).toBe(200);
      expect(fotosDa(id).filter((f) => !f.removida).map((f) => [f.id, f.principal, f.legenda])).toEqual([
        [f0, 1, null],
        [nova, 0, 'Da Giovanna'],
        [f2, 0, null],
      ]);
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 10 (D5): o público que a página do relato manda', () => {
    const lucio = usuarioDe('lucio');
    const todos = [gui, giovanna, elizete, magno, lucio, usuarioDe('regina')];
    /** Quem, das pessoas de teste e da Bracarense, vê a memória e vê o relato */
    async function quemVe(memoria: string, relato: number) {
      const veMemoria: string[] = [];
      const veRelato: string[] = [];
      for (const u of todos) {
        if (await repo.obterMemoria(u, memoria)) veMemoria.push(u.pessoa);
        if ((await repo.listarRelatos(u, memoria)).some((r) => r.id === relato)) veRelato.push(u.pessoa);
      }
      return { veMemoria, veRelato };
    }
    /** Uma memória da Giovanna que já teve estes públicos, em ordem; o último é o de agora */
    async function comHistoria(titulo: string, publicos: ({ visibilidade: 'todos' } | { visibilidade: 'nucleos'; nucleos: string[] })[]) {
      const ficha = { titulo, ano: 2016, tipo: 'causo', pessoas: ['giovanna'] };
      const id = (await pedir('memorias', giovanna, { ...ficha, ...publicos[0] })).corpo.id as string;
      for (const publico of publicos.slice(1)) expect((await pedir('memorias', giovanna, { ...ficha, id, fotosMostradas: [], nucleos: [], ...publico })).status).toBe(200);
      return id;
    }
    const escrever = (quem: Usuario, memoria: string, publico: string | undefined, texto = 'O meu relato.') => pedir('relatos', quem, { memoria, por: quem.pessoa, texto, ...(publico === undefined ? {} : { publico }) });

    it('a família que não é da memória nem de quem escreve, e o que não é público nenhum, são recusados com o banco igual', async () => {
      const id = await comHistoria('Z2: D5 recusas', [{ visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] }, { visibilidade: 'todos' }]);
      expect(elizete.nucleos).toEqual(['bayara-nascimento']);
      const antes = impressao();
      for (const publico of ['nucleos:bracarense', 'nucleos:bayara-bracarense', 'nucleos:bayara-nascimento,bracarense', 'nucleos:bayara-bracarense,bayara-nascimento', 'nucleos:familia-que-nao-existe', 'nucleos:', 'nucleos', 'TODOS', 'todos ', 'todos,nucleos:bracarense', 'nucleos:bayara-nascimento;bracarense', '']) {
        const r = await escrever(elizete, id, publico);
        expect([r.status, r.corpo.erro], publico).toEqual([400, 'Envio inválido.']);
        expect(impressao() === antes, publico).toBe(true);
      }
      // Sem script também: volta para a página do relato com o recado, sem gravar
      const volta = await semScript('relatos', elizete, { memoria: id, por: 'elizete', acrescentar: '1', situacao: 'publicada', texto: 'Forjado.', publico: 'nucleos:bracarense', envio: 'z2-d5-recusado' });
      expect([volta.caminho, volta.erro]).toEqual([`/memorias/${id}/relato`, 'Envio inválido.']);
      expect(impressao()).toBe(antes);
    });

    it('o público aceito nunca mostra o relato a quem não vê a memória, nem a mais gente do que o relato que acompanha a memória', async () => {
      // Para cada história de públicos e cada público aceito: quem vê o relato cabe em quem vê a memória hoje
      const BN = 'bayara-nascimento';
      const BB = 'bayara-bracarense';
      const casos: { titulo: string; publicos: Parameters<typeof comHistoria>[1]; publico: string; so: string | null }[] = [
        // A página de antes da abertura: nasce só para quem via, esperando
        { titulo: 'Z2: D5 a', publicos: [{ visibilidade: 'nucleos', nucleos: [BN] }, { visibilidade: 'todos' }], publico: `nucleos:${BN}`, so: `["${BN}"]` },
        // O público que a memória já teve, com uma família que não é da Elizete
        { titulo: 'Z2: D5 b', publicos: [{ visibilidade: 'nucleos', nucleos: [BN, BB] }, { visibilidade: 'todos' }], publico: `nucleos:${BB},${BN}`, so: `["${BB}","${BN}"]` },
        // O público que a memória já teve era maior que o de hoje: o relato acompanha a memória de hoje, sem abrir nada
        { titulo: 'Z2: D5 c', publicos: [{ visibilidade: 'todos' }, { visibilidade: 'nucleos', nucleos: [BN] }], publico: 'todos', so: null },
        { titulo: 'Z2: D5 d', publicos: [{ visibilidade: 'nucleos', nucleos: [BN, BB] }, { visibilidade: 'nucleos', nucleos: [BN] }], publico: `nucleos:${BB},${BN}`, so: null },
        // Forjado, mas aceito: uma família da memória que não é da Elizete. O relato fica só para ela, dentro de quem vê a memória
        { titulo: 'Z2: D5 e', publicos: [{ visibilidade: 'nucleos', nucleos: [BN] }, { visibilidade: 'nucleos', nucleos: [BN, BB] }], publico: `nucleos:${BB}`, so: `["${BB}"]` },
        // Forjado, mas aceito: "todos" numa memória que abriu depois. É o que "Liberar" faria: o relato acompanha a memória
        { titulo: 'Z2: D5 f', publicos: [{ visibilidade: 'nucleos', nucleos: [BN] }, { visibilidade: 'todos' }], publico: 'todos', so: null },
        // A página certa
        { titulo: 'Z2: D5 g', publicos: [{ visibilidade: 'nucleos', nucleos: [BN] }], publico: `nucleos:${BN}`, so: null },
      ];
      for (const caso of casos) {
        const id = await comHistoria(caso.titulo, caso.publicos);
        const r = await escrever(elizete, id, caso.publico);
        expect(r.status, caso.titulo).toBe(201);
        const relato = relatosDa(id)[0];
        expect(relato.so, caso.titulo).toBe(caso.so);
        const { veMemoria, veRelato } = await quemVe(id, relato.id);
        expect(veRelato, caso.titulo).toContain('elizete');
        for (const pessoa of veRelato) expect(veMemoria, `${caso.titulo}: ${pessoa}`).toContain(pessoa);
        // Quem não é das famílias do relato que espera não o vê (fora quem escreveu)
        if (caso.so) for (const u of todos) if (u.pessoa !== 'elizete' && !u.nucleos.some((n) => (JSON.parse(caso.so!) as string[]).includes(n))) expect(veRelato, `${caso.titulo}: ${u.pessoa}`).not.toContain(u.pessoa);
        // O pedido para liberar, quando nasce, é só para quem escreveu
        expect(linhas<{ para: string }>(`SELECT para FROM avisos WHERE relato_id = ? AND tipo = 'liberar-relato'`, relato.id).map((a) => a.para), caso.titulo).toEqual(caso.so ? ['elizete'] : []);
      }
    });

    it('o público que a memória já teve só vale para a memória que o teve', async () => {
      const comAsDuas = await comHistoria('Z2: D5 teve as duas', [{ visibilidade: 'nucleos', nucleos: ['bayara-nascimento', 'bayara-bracarense'] }, { visibilidade: 'todos' }]);
      const soUma = await comHistoria('Z2: D5 teve uma', [{ visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] }, { visibilidade: 'todos' }]);
      const publico = 'nucleos:bayara-bracarense,bayara-nascimento';
      const antes = impressao();
      expect((await escrever(elizete, soUma, publico)).status).toBe(400);
      expect(impressao()).toBe(antes);
      expect((await escrever(elizete, comAsDuas, publico)).status).toBe(201);
    });

    it('quem não vê a memória não descobre nada pelo público: a resposta é a de memória que não existe', async () => {
      const id = await comHistoria('Z2: D5 fechada', [{ visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] }]);
      const antes = impressao();
      for (const publico of ['nucleos:bayara-nascimento', 'nucleos:bracarense', 'todos', 'lixo']) {
        const r = await escrever(lucio, id, publico);
        expect([r.status, r.corpo.erro], publico).toEqual([404, 'Memória não encontrada.']);
      }
      expect(impressao()).toBe(antes);
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 11 (D6): o relato pela rota da memória numa memória publicada', () => {
    it('corrigir a memória publicada como a tela manda (sem relato) continua valendo para quem criou, para quem está nela e para o administrador', async () => {
      const ficha = { titulo: 'Z2: D6 corrigir', ano: 2017, tipo: 'causo', pessoas: ['giovanna', 'elizete'] };
      const id = (await pedir('memorias', giovanna, { ...ficha, relato: { por: 'giovanna', texto: 'O relato de quem criou.' } })).corpo.id as string;
      const doRelato = () => JSON.stringify([relatosDa(id), linhas('SELECT * FROM relato_mensagens WHERE relato_id IN (SELECT id FROM relatos WHERE memoria_id = ?)', id)]);
      const antes = doRelato();
      // A tela de "Corrigir memória" não tem a etapa do relato: o campo "relato" nem vai (undefined some no JSON)
      expect((await pedir('memorias', giovanna, { ...ficha, id, lugar: 'Sabará', fotosMostradas: [], fotos: [], relato: undefined })).status).toBe(200);
      expect((await pedir('memorias', elizete, { ...ficha, id, lugar: 'Caeté', fotosMostradas: [], fotos: [] })).status).toBe(200);
      expect((await pedir('memorias', magno, { ...ficha, id, lugar: 'Raposos', fotosMostradas: [], fotos: [] })).status).toBe(200);
      // O relato vazio (nenhum texto, áudio ou mensagem) não é relato: não recusa
      expect((await pedir('memorias', giovanna, { ...ficha, id, lugar: 'Nova Lima', fotosMostradas: [], relato: { por: 'giovanna', texto: '   ', audios: [], mensagens: [] } })).status).toBe(200);
      expect(uma<{ lugar: string }>('SELECT lugar FROM memorias WHERE id = ?', id).lugar).toBe('Nova Lima');
      // Sem script: o formulário da memória publicada não tem o campo do relato
      const volta = await semScript('memorias', giovanna, { id, titulo: ficha.titulo, ano: '2017', tipo: 'causo', pessoas: ['giovanna', 'elizete'], lugar: 'Rio Acima' });
      expect([volta.caminho, volta.ok, volta.erro]).toEqual([`/memorias/${id}`, 'Memória atualizada. A versão anterior está no histórico.', null]);
      // E o relato que já existia não foi tocado por nenhuma dessas correções
      expect(doRelato()).toBe(antes);
    });

    it('a tela só mostra a etapa do relato enquanto a memória não foi publicada', () => {
      const nova = readFileSync('src/pages/nova.astro', 'utf-8');
      expect(nova).toMatch(/!publicada && \(\s*<section data-etapa="Relato" data-opcional>/);
      // E o script só manda o relato quando o seletor "quem conta" existe, que mora nessa etapa
      expect(nova).toContain(`const relatoPor = form.querySelector<HTMLSelectElement>('[data-relato-por]');`);
      expect(nova).toMatch(/relato:\s*relatoPor && \(relato\.trim\(\) \|\| mensagensDoRelato\.length\)/);
      // "Acrescentar fotos" tem rota própria, que não passa pela da memória
      expect(readFileSync('src/pages/memorias/[id]/fotos.astro', 'utf-8')).toContain(`fetch('/api/acrescentar-fotos'`);
    });

    it('o relato forjado numa memória publicada é recusado para todo mundo, com o banco igual, com e sem script', async () => {
      const ficha = { titulo: 'Z2: D6 recusa', ano: 2017, tipo: 'causo', pessoas: ['giovanna', 'elizete'] };
      const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
      const audio = await audioSolto(elizete);
      const antes = impressao();
      const relatos: [Usuario, Record<string, unknown>][] = [
        [giovanna, { por: 'giovanna', texto: 'Da criadora.' }],
        [elizete, { por: 'elizete', texto: 'De quem estava.' }],
        [elizete, { por: 'elizete', texto: '', audios: [{ id: audio }] }],
        [elizete, { por: 'elizete', texto: '', mensagens: [{ tipo: 'audio', audioId: audio }] }],
        [magno, { por: 'lucas-magno', texto: 'Do administrador.' }],
        [giovanna, { por: 'aguilar', texto: 'Em nome de quem não acessa.' }],
      ];
      for (const [quem, relato] of relatos) {
        const r = await pedir('memorias', quem, { ...ficha, id, fotosMostradas: [], relato });
        expect([r.status, r.corpo.erro], JSON.stringify(relato)).toEqual([400, 'Envio inválido.']);
      }
      const volta = await semScript('memorias', elizete, { id, titulo: ficha.titulo, ano: '2017', tipo: 'causo', pessoas: ['giovanna', 'elizete'], relato: 'Pelo formulário comum.', relatoPor: 'elizete' });
      expect([volta.caminho, volta.erro]).toEqual(['/nova', 'Envio inválido.']);
      expect(impressao()).toBe(antes);
      expect(audioDe(audio)).toEqual({ relato_id: null, memoria_id: null, removido_em: null });
    });

    it('na memória nova e no rascunho, o relato continua indo junto: nasce, é corrigido e é publicado com a memória', async () => {
      // Memória nova, publicada de uma vez, com o relato de quem não acessa o site
      const direta = await pedir('memorias', giovanna, { titulo: 'Z2: D6 nova', ano: 2017, tipo: 'causo', pessoas: ['giovanna', 'aguilar'], relato: { por: 'aguilar', texto: 'O Aguilar, pela Giovanna.' } });
      expect(direta.status).toBe(201);
      expect(relatosDa(direta.corpo.id as string).map((r) => [r.por, r.registrado_por, r.situacao])).toEqual([['aguilar', 'giovanna', 'publicada']]);
      // Rascunho com relato, corrigido no rascunho e publicado depois
      const ficha = { titulo: 'Z2: D6 rascunho', ano: 2017, tipo: 'causo', pessoas: ['giovanna'], situacao: 'rascunho' };
      const id = (await pedir('memorias', giovanna, { ...ficha, relato: { por: 'giovanna', texto: 'Primeira versão.' } })).corpo.id as string;
      expect(relatosDa(id).map((r) => [r.texto, r.situacao])).toEqual([['Primeira versão.', 'rascunho']]);
      const mensagem = uma<{ id: number }>('SELECT id FROM relato_mensagens WHERE relato_id = ?', relatosDa(id)[0].id).id;
      expect((await pedir('memorias', giovanna, { ...ficha, id, fotosMostradas: [], relato: { por: 'giovanna', texto: 'Segunda versão.', mensagens: [{ id: mensagem, tipo: 'texto', texto: 'Segunda versão.' }] } })).status).toBe(200);
      expect(relatosDa(id).map((r) => [r.texto, r.situacao])).toEqual([['Segunda versão.', 'rascunho']]);
      const publicada = await pedir('memorias', giovanna, { ...ficha, id, fotosMostradas: [], situacao: 'publicada', relato: { por: 'giovanna', texto: 'Segunda versão.', mensagens: [{ id: mensagem, tipo: 'texto', texto: 'Segunda versão.' }, { tipo: 'texto', texto: 'E o fim.' }] } });
      expect(publicada.status).toBe(200);
      expect(relatosDa(id).map((r) => [r.texto, r.situacao])).toEqual([['Segunda versão.\n\nE o fim.', 'publicada']]);
      expect(mensagensDo(relatosDa(id)[0].id).map((m) => m.texto)).toEqual(['Segunda versão.', 'E o fim.']);
      // Sem script: o rascunho com o campo do relato publica com ele
      const semScriptId = (await pedir('memorias', giovanna, { ...ficha, titulo: 'Z2: D6 rascunho sem script' })).corpo.id as string;
      const volta = await semScript('memorias', giovanna, { id: semScriptId, titulo: 'Z2: D6 rascunho sem script', ano: '2017', tipo: 'causo', pessoas: 'giovanna', situacao: 'publicada', relato: 'Pelo formulário comum.', relatoPor: 'giovanna' });
      expect([volta.caminho, volta.ok]).toEqual([`/memorias/${semScriptId}`, 'Memória publicada.']);
      expect(relatosDa(semScriptId).map((r) => [r.texto, r.situacao])).toEqual([['Pelo formulário comum.', 'publicada']]);
    });

    it('sem script, o toque duplo em "Publicar memória" num rascunho com relato publica uma vez só, e a segunda resposta é a mesma da primeira (sessão AA)', async () => {
      // Era um defeito da fila: o segundo toque chegava com a memória já publicada e o relato no formulário, e
      // a resposta era a página com "Envio inválido.". Agora a página manda um código de envio, como a janela
      // do relato, e o segundo toque igual responde como o primeiro, sem gravar
      const id = (await pedir('memorias', giovanna, { titulo: 'Z2: D6 toque duplo', ano: 2017, tipo: 'causo', pessoas: ['giovanna'], situacao: 'rascunho' })).corpo.id as string;
      const campos = { id, titulo: 'Z2: D6 toque duplo', ano: '2017', tipo: 'causo', pessoas: 'giovanna', situacao: 'publicada', relato: 'Uma vez só.', relatoPor: 'giovanna', envio: 'aa-toque-duplo', pagina: 'rascunho' };
      const primeiro = await semScript('memorias', giovanna, campos);
      expect([primeiro.caminho, primeiro.ok]).toEqual([`/memorias/${id}`, 'Memória publicada.']);
      const depois = impressao();
      const segundo = await semScript('memorias', giovanna, campos);
      expect(impressao()).toBe(depois);
      expect(relatosDa(id).map((r) => r.texto)).toEqual(['Uma vez só.']);
      expect([segundo.status, segundo.caminho, segundo.ok, segundo.erro]).toEqual([primeiro.status, primeiro.caminho, primeiro.ok, primeiro.erro]);
    });

    it('sessão AA: os dois toques juntos, antes de qualquer um gravar, também gravam uma vez e respondem igual', async () => {
      const id = (await pedir('memorias', giovanna, { titulo: 'AA: toques juntos', ano: 2017, tipo: 'causo', pessoas: ['giovanna'], situacao: 'rascunho' })).corpo.id as string;
      const campos = { id, titulo: 'AA: toques juntos', ano: '2017', tipo: 'causo', pessoas: 'giovanna', situacao: 'publicada', relato: 'Juntos.', relatoPor: 'giovanna', envio: 'aa-toques-juntos', pagina: 'rascunho' };
      let segundo: Awaited<ReturnType<typeof semScript>> | undefined;
      // O segundo toque passa pela conferência enquanto o primeiro espera na porta do lote, e grava antes dele
      const primeiro = await comOutroPedidoNaPorta(
        /INSERT INTO envios/,
        async () => {
          banco.batch = lote;
          segundo = await semScript('memorias', giovanna, campos);
        },
        () => semScript('memorias', giovanna, campos),
      );
      expect(relatosDa(id).map((r) => r.texto)).toEqual(['Juntos.']);
      expect([primeiro.caminho, primeiro.ok]).toEqual([`/memorias/${id}`, 'Memória publicada.']);
      expect([segundo!.caminho, segundo!.ok]).toEqual([primeiro.caminho, primeiro.ok]);
    });

    it('sessão AA: sem script, a recusa responde com a própria página do formulário, preenchida com o que chegou', async () => {
      const dados = new FormData();
      for (const [k, v] of Object.entries({ titulo: 'AA: recusada sem script', ano: '1700', tipo: 'causo', pessoas: 'giovanna', lugar: 'Sabará', temas: 'Quintal', relato: 'O que não pode sumir.', relatoPor: 'giovanna', situacao: 'publicada' })) dados.append(k, v);
      const request = new Request('http://localhost/api/memorias', { method: 'POST', headers: { Origin: 'http://localhost' }, body: dados });
      const locals = { usuario: giovanna, tipos } as Record<string, unknown>;
      let pedida: Request | undefined;
      const resposta = await rotas.memorias.POST({ request, locals, rewrite: async (r: Request) => ((pedida = r), new Response('a página')) } as never);
      expect(await resposta.text()).toBe('a página');
      // A página do formulário, com o recado, pedida com GET, e nada gravado
      expect(pedida!.method).toBe('GET');
      expect(new URL(pedida!.url).pathname).toBe('/nova');
      expect(new URL(pedida!.url).searchParams.get('erro')).toBeTruthy();
      expect(memoriasChamadas('AA: recusada sem script')).toEqual([]);
      expect(locals.memoriaDevolvida).toMatchObject({ titulo: 'AA: recusada sem script', ano: 1700, lugar: 'Sabará', pessoas: ['giovanna'], temas: 'Quintal', relato: 'O que não pode sumir.', relatoPor: 'giovanna' });
      // E a página usa o que voltou em cada campo
      const nova = readFileSync('src/pages/nova.astro', 'utf-8');
      for (const campo of ['titulo', 'tipoOutro', 'lugar', 'temas']) expect(nova, campo).toContain(`devolvida?.${campo}`);
      expect(nova).toContain('valor={devolvida?.relato}');
      expect(nova).toContain('devolvida?.nucleos ?? memoria?.nucleos');
    });

    it('sessão AA: a mesma página enviada de novo com outra coisa digitada não é toque duplo', async () => {
      const id = (await pedir('memorias', giovanna, { titulo: 'AA: mesma página', ano: 2017, tipo: 'causo', pessoas: ['giovanna'], situacao: 'rascunho' })).corpo.id as string;
      const campos = { id, titulo: 'AA: mesma página', ano: '2017', tipo: 'causo', pessoas: 'giovanna', situacao: 'rascunho', envio: 'aa-mesma-pagina', pagina: 'rascunho' };
      expect((await semScript('memorias', giovanna, campos)).ok).toBe('Rascunho salvo.');
      expect((await semScript('memorias', giovanna, { ...campos, lugar: 'Sabará' })).ok).toBe('Rascunho salvo.');
      expect(uma<{ lugar: string }>('SELECT lugar FROM memorias WHERE id = ?', id).lugar).toBe('Sabará');
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 12 (D7): a página antiga, que não manda "fotosMostradas"', () => {
    it('não tira, não reordena, não troca a principal nem a legenda; a foto nova entra no fim, sem ser a principal', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z2: D7 página antiga', giovanna, 3);
      const antes = fotosDa(id);
      const [f0, f1, f2] = fotos;
      for (const lista of [[], [{ id: f2, principal: true }], [{ id: f2, legenda: 'Trocada', principal: true }, { id: f0 }, { id: f1 }], [{ id: f1 }, { id: f0, legenda: 'Outra' }]]) {
        expect((await pedir('memorias', giovanna, { ...ficha, fotos: lista })).status).toBe(200);
        expect(fotosDa(id), JSON.stringify(lista)).toEqual(antes);
      }
      const [n1, n2] = [fotoSolta(giovanna), fotoSolta(giovanna)];
      expect((await pedir('memorias', giovanna, { ...ficha, lugar: 'Sabará', fotos: [{ id: n2, legenda: 'Nova dois', principal: true }, { id: f1 }, { id: n1 }] })).status).toBe(200);
      expect(fotosDa(id).map((f) => [f.id, f.principal, f.legenda, f.removida])).toEqual([
        [f0, 1, 'Legenda 0', 0],
        [f1, 0, 'Legenda 1', 0],
        [f2, 0, 'Legenda 2', 0],
        [n2, 0, 'Nova dois', 0],
        [n1, 0, null, 0],
      ]);
      expect(uma<{ lugar: string }>('SELECT lugar FROM memorias WHERE id = ?', id).lugar).toBe('Sabará');
    });

    it('numa memória sem foto, a primeira foto nova da página antiga vira a principal; no rascunho vale o mesmo', async () => {
      const ficha = { titulo: 'Z2: D7 sem foto', ano: 2014, tipo: 'causo', pessoas: ['giovanna'] };
      const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
      const [n1, n2] = [fotoSolta(giovanna), fotoSolta(giovanna)];
      expect((await pedir('memorias', giovanna, { ...ficha, id, fotos: [{ id: n1 }, { id: n2, principal: true }] })).status).toBe(200);
      expect(fotosDa(id).map((f) => [f.id, f.principal])).toEqual([
        [n1, 1],
        [n2, 0],
      ]);
      const rascunho = { titulo: 'Z2: D7 rascunho', ano: 2014, tipo: 'causo', pessoas: ['giovanna'], situacao: 'rascunho' };
      const [r1, r2] = [fotoSolta(giovanna), fotoSolta(giovanna)];
      const idDoRascunho = (await pedir('memorias', giovanna, { ...rascunho, fotos: [{ id: r1, principal: true }, { id: r2 }] })).corpo.id as string;
      expect((await pedir('memorias', giovanna, { ...rascunho, id: idDoRascunho, fotos: [{ id: r2, principal: true }] })).status).toBe(200);
      expect(fotosDa(idDoRascunho).map((f) => [f.id, f.principal, f.removida])).toEqual([
        [r1, 1, 0],
        [r2, 0, 0],
      ]);
    });

    it('a foto que entrou depois de a página antiga abrir fica onde está', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z2: D7 com foto acrescentada', giovanna, 2);
      const daElizete = acrescentadaPor(elizete, id);
      const antes = fotosDa(id);
      expect((await pedir('memorias', giovanna, { ...ficha, fotos: [{ id: fotos[1], principal: true }] })).status).toBe(200);
      expect(fotosDa(id)).toEqual(antes);
      expect(antes.map((f) => f.id)).toEqual([...fotos, daElizete]);
    });

    it('a página de hoje continua tirando e reordenando; sem script, as fotos ficam como estão', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z2: D7 página de hoje', giovanna, 3);
      const [f0, f1, f2] = fotos;
      const antes = fotosDa(id);
      const volta = await semScript('memorias', giovanna, { id, titulo: ficha.titulo, ano: '2014', tipo: 'causo', pessoas: 'giovanna', fotosMostradas: fotos.map(String) });
      expect(volta.ok).toBe('Memória atualizada. A versão anterior está no histórico.');
      expect(fotosDa(id)).toEqual(antes);
      // Sem script e sem os campos escondidos (pedido forjado): também não mexe
      expect((await semScript('memorias', giovanna, { id, titulo: ficha.titulo, ano: '2014', tipo: 'causo', pessoas: 'giovanna' })).erro).toBeNull();
      expect(fotosDa(id)).toEqual(antes);
      // A página de hoje: tira a primeira e inverte as outras
      expect((await pedir('memorias', giovanna, { ...ficha, fotosMostradas: fotos, fotos: [{ id: f2, principal: true }, { id: f1 }] })).status).toBe(200);
      expect(fotosDa(id).filter((f) => !f.removida).map((f) => [f.id, f.principal])).toEqual([
        [f2, 1],
        [f1, 0],
      ]);
      expect(fotosDa(id).find((f) => f.id === f0)!.removida).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 13 (D8): memória com foto sempre tem principal', () => {
    /** As fotos que estão na memória e quantas delas são a principal */
    const principais = (memoria: string) => {
      const ficaram = fotosDa(memoria).filter((f) => !f.removida);
      return { fotos: ficaram.map((f) => f.id), principais: ficaram.filter((f) => f.principal).map((f) => f.id) };
    };

    it('tirar a única foto vista enquanto outras são acrescentadas na porta do lote: a primeira que ficou é a principal, e só ela', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z2: D8 na porta', giovanna, 1);
      const novas: number[] = [];
      const r = await comOutroPedidoNaPorta(
        /^\s*UPDATE memorias SET titulo/,
        () => {
          novas.push(acrescentadaPor(elizete, id), acrescentadaPor(gui, id));
        },
        () => pedir('memorias', giovanna, { ...ficha, fotosMostradas: fotos, fotos: [] }),
      );
      expect(r.status).toBe(200);
      expect(principais(id)).toEqual({ fotos: novas, principais: [novas[0]] });
    });

    it('tirar a principal entre várias, com outra acrescentada na porta do lote: uma principal só, a que a página escolheu', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z2: D8 várias', giovanna, 3);
      let nova = 0;
      const r = await comOutroPedidoNaPorta(
        /^\s*UPDATE memorias SET titulo/,
        () => {
          nova = acrescentadaPor(elizete, id);
        },
        () => pedir('memorias', giovanna, { ...ficha, fotosMostradas: fotos, fotos: [{ id: fotos[2] }, { id: fotos[1] }] }),
      );
      expect(r.status).toBe(200);
      const depois = principais(id);
      expect(depois.principais).toEqual([fotos[2]]);
      expect([...depois.fotos].sort()).toEqual([fotos[1], fotos[2], nova].sort());
    });

    it('a foto que a página manteve como principal é tirada por outro pedido na porta do lote: outra que ficou vira a principal', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z2: D8 a principal sai por fora', giovanna, 3);
      const r = await comOutroPedidoNaPorta(
        /^\s*UPDATE memorias SET titulo/,
        () => {
          sql.prepare(`UPDATE fotos SET removida_em = datetime('now'), removida_por = 'gui' WHERE id = ?`).run(fotos[0]);
        },
        () => pedir('memorias', giovanna, { ...ficha, fotosMostradas: fotos, fotos: fotos.map((f, n) => ({ id: f, principal: n === 0 })) }),
      );
      expect(r.status).toBe(200);
      expect(principais(id)).toEqual({ fotos: [fotos[1], fotos[2]], principais: [fotos[1]] });
    });

    it('tirar todas as fotos deixa a memória sem foto e sem principal; a foto acrescentada depois vira a principal', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z2: D8 em sequência', giovanna, 2);
      expect((await pedir('memorias', giovanna, { ...ficha, fotosMostradas: fotos, fotos: [] })).status).toBe(200);
      expect(principais(id)).toEqual({ fotos: [], principais: [] });
      const nova = fotoSolta(elizete);
      expect((await pedir('acrescentar-fotos', elizete, { memoria: id, fotos: [{ id: nova }] })).status).toBe(200);
      expect(principais(id)).toEqual({ fotos: [nova], principais: [nova] });
    });

    it('a corrida pelo outro lado: "Acrescentar fotos" lê a memória, a única foto é tirada, e só então ele grava: a foto nova é a principal', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z2: D8 pelo acrescentar', giovanna, 1);
      const nova = fotoSolta(elizete);
      const r = await comOutroPedidoNaPorta(
        /^\s*UPDATE fotos SET memoria_id = \?, legenda = \?, ordem = \?, principal = \?/,
        async () => {
          // Enquanto "Acrescentar fotos" espera na porta do lote, a Giovanna tira a única foto que via
          banco.batch = lote;
          expect((await pedir('memorias', giovanna, { ...ficha, fotosMostradas: fotos, fotos: [] })).status).toBe(200);
        },
        () => pedir('acrescentar-fotos', elizete, { memoria: id, fotos: [{ id: nova }] }),
      );
      expect(r.status).toBe(200);
      expect(principais(id)).toEqual({ fotos: [nova], principais: [nova] });
    });

    it('a mesma corrida pela foto que chega com um relato: a foto nova é a principal', async () => {
      const { id, fotos, ficha } = await memoriaComFotos('Z2: D8 pelo relato', giovanna, 1);
      const nova = fotoSolta(elizete);
      const r = await comOutroPedidoNaPorta(
        /^\s*UPDATE fotos SET relato_id = \?, memoria_id = \?/,
        async () => {
          banco.batch = lote;
          expect((await pedir('memorias', giovanna, { ...ficha, fotosMostradas: fotos, fotos: [] })).status).toBe(200);
        },
        () => pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Com foto.', publico: 'todos', fotos: [{ id: nova }] }),
      );
      expect(r.status).toBe(201);
      expect(principais(id)).toEqual({ fotos: [nova], principais: [nova] });
    });
  });


  // ---------------------------------------------------------------------------------------------------
  describe('ponto 13 (D8), fora da corrida: a foto do relato que era a principal', () => {
    it('quem tira do próprio relato a foto que era a principal da memória deixa outra como principal', async () => {
      const ficha = { titulo: 'Z2: D8 a principal veio do relato', ano: 2014, tipo: 'causo', pessoas: ['giovanna'] };
      const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
      const [doRelato, outra] = [fotoSolta(elizete), fotoSolta(elizete)];
      // A primeira foto da memória chega pelo relato da Elizete e vira a principal; a segunda, por "Acrescentar fotos"
      expect((await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Com foto.', publico: 'todos', fotos: [{ id: doRelato }] })).status).toBe(201);
      expect((await pedir('acrescentar-fotos', elizete, { memoria: id, fotos: [{ id: outra }] })).status).toBe(200);
      expect(fotosDa(id).map((f) => [f.id, f.principal])).toEqual([
        [doRelato, 1],
        [outra, 0],
      ]);
      // A Elizete tira a foto do relato dela
      expect((await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Sem a foto.', fotos: [] })).status).toBe(200);
      expect(fotosDa(id).filter((f) => !f.removida).map((f) => [f.id, f.principal])).toEqual([[outra, 1]]);
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 2: o recado nunca cita o que quem olha não vê (pelas rotas dos formulários no lugar)', () => {
    // No acervo de exemplo, a Marina (ex-marina) só existe no laço "só eu vejo" da Giovanna
    it('a Marina é privada da Giovanna: os outros não a veem, nem os administradores', async () => {
      expect(uma<{ privado: number; dono_id: string }>(`SELECT privado, dono_id FROM lacos_coracao WHERE pessoa_id = 'ex-marina'`)).toEqual({ privado: 1, dono_id: 'giovanna' });
      for (const quem of [gui, elizete, magno]) expect((await repo.listarIntegrantesQueVe(quem)).some((i) => i.id === 'ex-marina'), quem.pessoa).toBe(false);
      expect((await repo.listarIntegrantesQueVe(giovanna)).some((i) => i.id === 'ex-marina')).toBe(true);
    });

    it('"Como você chama" e "Não são a mesma pessoa" com a pessoa privada de outro dono: o recado é o de quem não existe, sem o nome, e nada é gravado', async () => {
      const antes = impressao();
      const apelido = await semScript('apelidos', elizete, { pessoa: 'ex-marina', apelido: 'Mari' });
      expect([apelido.caminho, apelido.erro, apelido.ok]).toEqual(['/pessoas', 'Pessoa não encontrada.', null]);
      for (const quem of [gui, magno]) {
        const par = await semScript('duplicados', quem, { acao: 'nao-sao', a: 'ex-marina', b: 'elizete' });
        expect([par.caminho, par.erro, par.ok], quem.pessoa).toEqual(['/admin/duplicados', 'Pessoa não encontrada.', null]);
        expect(par.destino.href).not.toMatch(/Marina/i);
      }
      expect(apelido.destino.href).not.toMatch(/Marina/i);
      expect(impressao()).toBe(antes);
      // Para a dona do laço, que vê a Marina, o recado cita o nome
      const daDona = await semScript('duplicados', giovanna, { acao: 'nao-sao', a: 'ex-marina', b: 'ex-dona-fatima' });
      expect(daDona.ok).toMatch(/^Marina e .+ saíram da lista\.$/);
    });

    it('responder ao pedido de um relato numa memória que a pessoa não vê: a resposta é a de relato que não existe, sem título', async () => {
      // Memória da Elizete só da Bayara Nascimento, com o relato dela esperando; o Magno, da Bracarense, não vê
      const avisos = await import('../src/pages/api/avisos');
      const id = (await pedir('memorias', elizete, { titulo: 'Segredo da Bayara Nascimento na Z2', ano: 2009, tipo: 'causo', pessoas: ['elizete'], visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] })).corpo.id as string;
      expect(await repo.obterMemoria(magno, id)).toBeUndefined();
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, so_para_nucleos) VALUES (?, 'gui', 'gui', 'Do Gui, esperando.', 'publicada', '["bayara-nascimento"]')`).run(id);
      const relato = uma<{ id: number }>(`SELECT id FROM relatos WHERE memoria_id = ? AND por = 'gui'`, id).id;
      const antes = impressao();
      const dados = new FormData();
      for (const [k, v] of Object.entries({ relato: String(relato), resposta: 'liberar', publico: 'nucleos:bayara-nascimento' })) dados.set(k, v);
      const resposta = await avisos.POST({ request: new Request('http://localhost/api/avisos', { method: 'POST', headers: { Origin: 'http://localhost' }, body: dados }), locals: { usuario: magno, tipos } } as never);
      expect(resposta.status).toBe(404);
      const corpo = await resposta.text();
      expect(corpo).toBe('{"erro":"Relato não encontrado."}');
      expect(impressao()).toBe(antes);
    });

    it('nas rotas dos formulários no lugar, os únicos recados com nome ou texto variável são os conferidos acima', () => {
      // Recado montado com um valor (crase com ${...}) numa das rotas que respondem a formulário no lugar
      const variaveis = ['avisos', 'sugestoes', 'duplicados', 'reacoes', 'apelidos', 'circulo'].flatMap((rota) =>
        [...readFileSync(`src/pages/api/${rota}.ts`, 'utf-8').matchAll(/\{ (ok|erro): (?:[^`}\n]*\? )?`([^`]*\$\{[^`]*)`/g)].map((m) => `${rota}: ${m[2]}`),
      );
      expect(variaveis).toEqual([
        // O ano de hoje
        'sugestoes: O ano vai de 1800 a ${anoAtual}.',
        // a e b vêm de listarIntegrantesQueVe: quem o administrador não vê responde "Pessoa não encontrada."
        'duplicados: ${a.nome} e ${b.nome} saíram da lista.',
        // O recado dos conflitos ao juntar saiu daqui para recadoDosConflitos (src/lib/juntar.ts), que só cita
        // os títulos que o administrador vê (sessão AA): ver o caso "o recado de Juntar", abaixo
        'duplicados: Fichas juntadas. Tudo o que era de ${sai.nome} passou para ${ficha.nome}, e as duas fichas de antes ficaram no histórico.',
        // O apelido que a própria pessoa acabou de escrever
        'apelidos: Pronto. Para você, aparece como ${lido.apelido} no site inteiro.',
        // Alguém do círculo da própria pessoa (montarCirculo)
        'circulo: Proximidade de ${noCirculo.nome} guardada: ${nomeDaProximidade(valor).toLowerCase()}.',
      ]);
    });

    it('o recado de "Juntar" cita só os títulos que o administrador vê, e "memórias que você não vê" para as outras (decisão do Gui, 23/11/2026)', async () => {
      // Era um achado fora da Z: conflitosAoJuntar lia o título sem conferir quem vê. A recusa continua igual
      sql.prepare(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('duplo-um-da-z2', 'Duplo da Z2', 'gui'), ('duplo-dois-da-z2', 'Duplo da Z2', 'gui')`).run();
      const id = (await pedir('memorias', elizete, { titulo: 'Título que o Magno não vê', ano: 2009, tipo: 'causo', pessoas: ['elizete'], visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] })).corpo.id as string;
      expect(await repo.obterMemoria(magno, id)).toBeUndefined();
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, 'duplo-um-da-z2', 'elizete', 'Um.', 'publicada'), (?, 'duplo-dois-da-z2', 'gui', 'Dois.', 'publicada')`).run(id, id);
      const antes = impressao();
      const volta = await semScript('duplicados', magno, { acao: 'juntar', fica: 'duplo-um-da-z2', sai: 'duplo-dois-da-z2' });
      expect(impressao()).toBe(antes);
      expect(volta.erro).not.toContain('Título que o Magno não vê');
      expect(volta.erro).toBe('As duas fichas têm relato em memórias que você não vê. Cada pessoa tem um relato por memória: deixe um só antes de juntar.');
      // Com uma memória que ele vê, o título dela aparece, e a outra continua sem título nem número
      const vista = (await pedir('memorias', magno, { titulo: 'Título que o Magno vê', ano: 2010, tipo: 'causo', pessoas: ['lucas-magno'] })).corpo.id as string;
      sql.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, 'duplo-um-da-z2', 'lucas-magno', 'Um.', 'publicada'), (?, 'duplo-dois-da-z2', 'gui', 'Dois.', 'publicada')`).run(vista, vista);
      const depois = impressao();
      const deNovo = await semScript('duplicados', magno, { acao: 'juntar', fica: 'duplo-um-da-z2', sai: 'duplo-dois-da-z2' });
      expect(impressao()).toBe(depois);
      expect(deNovo.erro).toBe('As duas fichas têm relato em “Título que o Magno vê” e memórias que você não vê. Cada pessoa tem um relato por memória: deixe um só antes de juntar.');
      // Quem vê as duas lê os dois títulos
      const doGui = await semScript('duplicados', gui, { acao: 'juntar', fica: 'duplo-um-da-z2', sai: 'duplo-dois-da-z2' });
      expect(doGui.erro).toContain('“Título que o Magno não vê”');
      expect(doGui.erro).toContain('“Título que o Magno vê”');
      expect(doGui.erro).not.toContain('memórias que você não vê');
    });
  });

  // ---------------------------------------------------------------------------------------------------
  describe('ponto 14: toda rota que grava tocada pela Z tem o caso em pedido-recusado, com a impressão do banco inteiro', () => {
    const recusado = readFileSync('testes/pedido-recusado.test.ts', 'utf-8');
    const casos = recusado.split(/\n  it\(/).slice(1).map((bloco) => ({ nome: bloco.slice(0, bloco.indexOf('\n')), corpo: bloco }));
    const daImpressao = casos.filter((c) => /const antes = impressao\(\);/.test(c.corpo) && /expect\(impressao\(\)\)\.toBe\(antes\);/.test(c.corpo));

    it('a impressão é do banco inteiro: todas as tabelas, todas as linhas', () => {
      expect(recusado).toContain(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`);
      expect(recusado).toMatch(/SELECT \* FROM "\$\{t\}" ORDER BY rowid/);
    });

    for (const [item, rota] of [
      ['D1', '/api/memorias'],
      ['D2', '/api/memorias'],
      ['D3', '/api/relatos'],
      ['D5', '/api/relatos'],
      ['D6', '/api/memorias'],
    ]) {
      it(`${rota}: o caso do ${item} da sessão Z compara a impressão antes e depois`, () => {
        const caso = daImpressao.filter((c) => c.nome.includes(rota) && c.nome.includes(`${item} da sessão Z`));
        expect(caso, `${item} em ${rota}`).toHaveLength(1);
      });
    }

    it('as rotas que a Z mudou são só /api/memorias e /api/relatos, e as que só mudaram por dentro (lixeira) já tinham o caso', () => {
      // ligarAudios e gravarMensagens, refeitos pela Z, também servem /api/lixeira
      expect(daImpressao.some((c) => c.nome.includes('/api/lixeira'))).toBe(true);
      // D4, D7 e D8 mudam o que a rota grava num pedido aceito; a recusa do D4 (trocar a ordem) é conferida aqui
      expect(readFileSync('testes/z-correcoes.test.ts', 'utf-8')).toMatch(/trocar a ordem das fotos que a página mostra continua recusado[\s\S]{0,400}expect\(impressao\(\)\)\.toBe\(antes\);/);
    });
  });


  // ---------------------------------------------------------------------------------------------------
  describe('pontos 1, 4 e 6: as correções pequenas da Z2 no script das páginas', () => {
    // O comportamento é conferido no navegador (testes/revisao-z2-navegador.test.ts). Aqui fica a guarda que
    // roda em todo build, sem servidor
    const noLugar = readFileSync('src/lib/cliente/no-lugar.ts', 'utf-8');
    const nova = readFileSync('src/pages/nova.astro', 'utf-8');

    it('cada formulário no lugar é ligado uma vez só, mesmo com ligarNoLugar chamado duas vezes na página', () => {
      // A marca é um atributo vazio: "if (form.dataset.noLugarLigado)" nunca valia, e a página da pessoa, que
      // chama ligarNoLugar de novo, mandava cada pedido duas vezes
      expect(noLugar).toContain('if (form.dataset.noLugarLigado !== undefined) return;');
      expect(noLugar).not.toContain('if (form.dataset.noLugarLigado) return;');
      expect(readFileSync('src/pages/pessoas/[id]/index.astro', 'utf-8')).toMatch(/ligarNoLugar\(\);/);
      expect(readFileSync('src/layouts/Visual.astro', 'utf-8')).toMatch(/ligarNoLugar\(\);/);
    });

    it('o recado de erro que vai para um formulário dentro de um bloco fechado abre o bloco', () => {
      expect(noLugar).toMatch(/onde\.prepend\([^\n]+\n(?:\s*\/\/[^\n]*\n)*\s*const bloco = onde\.closest\('details'\);\n\s*if \(bloco\) bloco\.open = true;/);
      expect(readFileSync('src/pages/pessoas/[id]/index.astro', 'utf-8')).toMatch(/<details class="como-chama" id="como-voce-chama">\s*<summary[^\n]+\n\s*<form class="como-chama__form"[^>]+data-chave="como-chama">/);
    });

    it('os avisos do formulário da memória vão para a linha do próprio formulário, e não para a da janela do relato', () => {
      // A janela do relato tem a linha dela, e vem antes na página, dentro da etapa "Relato"
      expect(readFileSync('src/components/conversa/Janela.astro', 'utf-8')).toContain('<p class="situacao" data-situacao role="status" aria-live="polite"></p>');
      expect(nova.indexOf('<Janela modo="formulario"')).toBeLessThan(nova.indexOf('<p class="situacao" data-situacao role="status" aria-live="polite"></p>'));
      // A do formulário é filha direta dele, logo depois da última etapa
      expect(nova).toMatch(/\n    <\/section>\n\n    <p class="situacao" data-situacao role="status" aria-live="polite"><\/p>/);
      expect(nova).toContain(`const situacaoEl = form.querySelector<HTMLElement>(':scope > [data-situacao]')!;`);
      expect(nova).not.toContain(`form.querySelector<HTMLElement>('[data-situacao]')`);
    });
  });

});
