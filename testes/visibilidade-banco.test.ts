// Visibilidade nas consultas de verdade (src/lib/servidor/repositorio.ts), sobre um banco SQLite em
// memória com o acervo de exemplo semeado pelas próprias migrações (testes/apoio/d1.ts).
//
// QA de código de 17/11/2026. O teste repete, sem servidor, a varredura feita na sessão: para cada
// pessoa do "Ver como", guarda o que cada consulta nova devolve (painel, novidades, aniversários, conta,
// Explorar com cada filtro e ordem, sorteio, contagens, capítulos, temas, áudios, lixeira), acrescenta
// ao banco só o que ela não pode ver (memória restrita a uma família de que ela não é membro, rascunho
// de outra pessoa, memória na lixeira que ela não via, capítulo restrito e capítulo na lixeira, relato
// em rascunho de outra pessoa, pessoa que só existe num laço privado de outra pessoa, casal privado de
// outras pessoas) e confere que nada muda, nem um número.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import * as apoio from './apoio/casos-escondidos';

const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));

// Um bucket vazio: a limpeza do bucket de teste lista e não acha nada
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

const PESSOAS = ['gui', 'giovanna', 'elizete', 'lucas-magno'] as const;
type Quem = (typeof PESSOAS)[number];

describe.skipIf(!comSqlite)('visibilidade nas consultas do banco', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  const repo = await import('../src/lib/servidor/repositorio');
  const { contextoDoExplorar } = await import('../src/lib/servidor/explorar');
  const { montarConta } = await import('../src/lib/servidor/conta');
  const { explorar, lerFiltros, ORDENS } = await import('../src/lib/explorar');
  const { aniversarios, novidades, memoriaParaContar } = await import('../src/lib/painel');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;

  const sql = (texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...valores);
  const usuarioDe = (pessoa: string): Usuario => {
    const i = banco.sqlite.prepare('SELECT nome, admin FROM integrantes WHERE id = ?').get(pessoa) as { nome: string; admin: number };
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const hoje = { ano: 2026, mes: 11, dia: 17 };

  /** Tudo o que as telas novas leem do banco, como a pessoa vê. Sem nada do que ela não pode ver. */
  async function oQueVe(quem: Quem) {
    const usuario = usuarioDe(quem);
    const publicadas = await repo.listarMemorias(usuario);
    const rascunhos = await repo.listarMemorias(usuario, { rascunhos: true });
    const contexto = await contextoDoExplorar(usuario, publicadas);
    const naoVe = await repo.pessoasQueONaoVe(usuario);
    // A lista de Pessoas e os seletores de pessoa (C1, decisão do Gui de 17/11/2026)
    const integrantes = await repo.listarIntegrantesQueVe(usuario);
    const relatosNovos = await repo.listarRelatosPublicadosDesde(usuario, '2000-01-01 00:00:00');
    const conta = await montarConta(usuario);
    const capitulos = await repo.listarCapitulos(usuario);
    const temas = await repo.listarTemasVisiveis(usuario);
    // O Explorar com cada filtro e cada ordem
    const enderecos = [
      '',
      ...ORDENS.map((o) => `ordem=${o}`),
      'audio=1',
      'foto=1',
      'contou=1',
      'falta=1',
      'decada=1990',
      'de=1990&ate=2000',
      'tipo=outro',
      ...capitulos.map((c) => `capitulo=${c.id}`),
      ...temas.map((t) => `tema=${t.id}`),
      ...['bayara-nascimento', 'bayara-bracarense', 'bracarense'].map((n) => `nucleo=${n}`),
      ...PESSOAS.map((p) => `pessoa=${p}`),
    ];
    const explorado = Object.fromEntries(enderecos.map((e) => [e, explorar(publicadas, lerFiltros(new URLSearchParams(e)), contexto).memorias.map((m) => m.id)]));
    return {
      publicadas: publicadas.map((m) => [m.id, m.titulo, m.capitulos, m.temas, m.fotos.length, m.relatos]),
      rascunhos: rascunhos.map((m) => m.id),
      explorado,
      comAudio: [...contexto.comAudio].sort(),
      contaram: [...contexto.contaram].map(([id, quem]) => [id, [...quem].sort()]).sort(),
      novidades: novidades(publicadas, relatosNovos, '2000-01-01 00:00:00', quem),
      paraContar: memoriaParaContar(publicadas, await repo.memoriasComRelatoDe(quem), quem, new Set())?.id,
      aniversarios: aniversarios(await repo.listarIntegrantes(), hoje, naoVe, quem).map((a) => a.pessoa.id),
      pessoas: integrantes.map((i) => i.id),
      conta: {
        rascunhos: [conta.rascunhos.memorias.map((m) => m.id), conta.rascunhos.relatos.map((r) => r.id)],
        lixeira: conta.lixeira.map((m) => m.id),
        criou: [conta.criou.memorias.map((m) => m.id), conta.criou.relatos.map((r) => r.id), conta.criou.fotos.map((f) => f.foto.id), conta.criou.capitulos.map((c) => c.id)],
        lacos: conta.lacos.map((l) => l.id),
        titulos: [...conta.titulos.keys()].sort(),
      },
      capitulos: capitulos.map((c) => [c.id, c.titulo, c.pessoas, c.familias]),
      temas: temas.map((t) => t.id),
      lixeira: (await repo.listarExcluidas(usuario)).map((m) => m.id),
      capitulosNaLixeira: (await repo.listarCapitulosExcluidos(usuario)).map((c) => c.id),
      textosDeOutro: await repo.listarTextosDeOutro(usuario),
      lacos: (await repo.listarLacosDoCoracao(usuario)).map((l) => l.id),
      casais: (await repo.listarCasais(usuario)).map((c) => c.id),
      audios: await Promise.all(PESSOAS.map(async (p) => (await repo.listarAudiosDe(usuario, p)).map((a) => a.id))),
      // "A voz de Fulano" de quem só existe num laço privado de outra pessoa
      vozDaEscondida: (await repo.listarAudiosDe(usuario, 'zz-pessoa')).map((a) => a.id),
      // Os relatos de cada memória, como a página da memória lê
      relatos: await Promise.all(publicadas.map(async (m) => [m.id, (await repo.listarRelatos(usuario, m.id)).map((r) => r.id)])),
      rascunhosDeRelato: (await repo.listarRascunhosDeRelato(usuario)).map((r) => r.id),
    };
  }

  // Os casos escondidos moram em testes/apoio/casos-escondidos.ts (o teste de equivalência usa os mesmos)
  const relatoDaEscondida = (registrador: string) => apoio.relatoDaEscondida(banco.sqlite, registrador);
  const acrescentarEscondido = (quem: Quem) => apoio.acrescentarEscondido(banco.sqlite, quem);

  beforeAll(async () => {
    await prepararBanco();
    // Mais um áudio, além dos de exemplo, num relato aberto a todos, para o filtro "com áudio" ter o que mostrar
    const relato = banco.sqlite.prepare(`SELECT r.id, r.memoria_id, r.por FROM relatos r JOIN memorias m ON m.id = r.memoria_id WHERE r.situacao = 'publicada' AND m.visibilidade = 'todos' LIMIT 1`).get() as { id: number; memoria_id: string; por: string };
    sql(`INSERT INTO audios (relato_id, memoria_id, chave, tipo, tamanho, enviado_por) VALUES (?, ?, 'visivel.webm', 'audio/webm', 10, ?)`, relato.id, relato.memoria_id, relato.por);
    // O banco do começo, para cada pessoa partir do mesmo acervo de exemplo
    banco.sqlite.exec('SAVEPOINT acervo_de_exemplo');
  });

  for (const quem of PESSOAS) {
    it(`${quem}: nada do que não pode ver aparece, nem como número`, async () => {
      const antes = await oQueVe(quem);
      acrescentarEscondido(quem);
      try {
        const depois = await oQueVe(quem);
        // A pessoa só de laço privado some das listas; o resto fica idêntico
        expect(depois).toEqual(antes);
        const usuario = usuarioDe(quem);
        for (const id of ['zz-restrita', 'zz-rascunho', 'zz-lixeira']) expect(await repo.obterMemoria(usuario, id)).toBeUndefined();
        for (const id of ['zz-restrita', 'zz-rascunho', 'zz-lixeira']) {
          expect(await repo.podeOuvirAudio(usuario, `zz-${id}.webm`)).toBe(false);
          // A foto foi enviada pela própria pessoa, mas está numa memória que ela não vê
          expect(await repo.podeVerFoto(usuario, `2026/zz-${id}.jpg`)).toBe(false);
        }
        expect(await repo.podeVerRetratoDaChave(usuario, 'retratos/zz.jpg')).toBe(false);
        expect(await repo.podeOuvirAudio(usuario, 'zz-voz.webm')).toBe(false);
        expect((await repo.pessoasQueONaoVe(usuario)).has('zz-pessoa')).toBe(true);
        // C1: some da lista de Pessoas, dos seletores e da própria página, só para quem não é dono do laço
        expect((await repo.listarIntegrantesQueVe(usuario)).some((i) => i.id === 'zz-pessoa')).toBe(false);
        const dono = usuarioDe(quem === 'gui' ? 'giovanna' : 'gui');
        expect((await repo.listarIntegrantesQueVe(dono)).some((i) => i.id === 'zz-pessoa')).toBe(true);
      } finally {
        banco.sqlite.exec('ROLLBACK TO acervo_de_exemplo');
      }
    });
  }

  it('a linha do tempo de quem escreveu leva os rascunhos dela, e só os dela', async () => {
    // QA de 18/11/2026: o Explorar e a página da pessoa pediam só as publicadas, e o rascunho não aparecia
    for (const quem of PESSOAS) {
      const usuario = usuarioDe(quem);
      const meus = (await repo.listarMemorias(usuario, { rascunhos: true })).map((m) => m.id).sort();
      const linha = await repo.listarMemorias(usuario, { comRascunhos: true });
      const publicadas = (await repo.listarMemorias(usuario)).map((m) => m.id);
      expect(linha.filter((m) => m.situacao === 'rascunho').map((m) => m.id).sort(), quem).toEqual(meus);
      expect(linha.filter((m) => m.situacao !== 'rascunho').map((m) => m.id), quem).toEqual(publicadas);
    }
    expect((await repo.listarMemorias(usuarioDe('gui'), { rascunhos: true })).length).toBeGreaterThan(0);
  });

  it('o banco de exemplo tem os casos difíceis que o teste confere', async () => {
    // Sem isso, o teste passaria com um banco vazio
    const gui = await oQueVe('gui');
    expect(gui.publicadas.length).toBeGreaterThan(30);
    expect(gui.rascunhos.length).toBeGreaterThan(0);
    expect(gui.comAudio.length).toBeGreaterThan(0);
    expect(gui.aniversarios.length).toBeGreaterThan(0);
    expect(gui.capitulos.length).toBeGreaterThan(3);
  });

  it('o relato em nome de quem só existe num laço privado: quem registrou e o dono do laço continuam vendo', async () => {
    // A Giovanna tem o laço privado; o Gui registrou o relato; a Elizete não vê a pessoa
    sql(`INSERT INTO integrantes (id, nome, tipo, tratamento) VALUES ('zz-pessoa', 'Pessoa Escondida', 'pessoa', 'ela')`);
    sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('giovanna', 'zz-pessoa', 'Laço escondido', 1)`);
    try {
      const { memoria, relato } = relatoDaEscondida('gui');
      const contagem = async (quem: string) => (await repo.obterMemoria(usuarioDe(quem), memoria))!.relatos;
      const base = await contagem('elizete');
      for (const quem of ['gui', 'giovanna']) {
        const usuario = usuarioDe(quem);
        expect((await repo.listarRelatos(usuario, memoria)).some((r) => r.id === relato), quem).toBe(true);
        expect(await repo.podeOuvirAudio(usuario, 'zz-voz.webm'), quem).toBe(true);
        expect(await repo.podeVerFoto(usuario, '2026/zz-foto-do-relato.jpg'), quem).toBe(true);
        expect(await contagem(quem), quem).toBe(base + 1);
        expect((await repo.memoriasComAudio(usuario)).has(memoria), quem).toBe(true);
        expect((await repo.quemContouEmCadaMemoria(usuario)).get(memoria)?.has('zz-pessoa'), quem).toBe(true);
      }
      // A dona do laço vê "A voz de" da pessoa
      expect((await repo.listarAudiosDe(usuarioDe('giovanna'), 'zz-pessoa')).length).toBe(1);
      const elizete = usuarioDe('elizete');
      expect((await repo.listarRelatos(elizete, memoria)).some((r) => r.id === relato)).toBe(false);
      expect(await repo.podeOuvirAudio(elizete, 'zz-voz.webm')).toBe(false);
      expect(await repo.podeVerFoto(elizete, '2026/zz-foto-do-relato.jpg')).toBe(false);
      expect((await repo.listarAudiosDe(elizete, 'zz-pessoa')).length).toBe(0);
      expect((await repo.quemContouEmCadaMemoria(elizete)).get(memoria)?.has('zz-pessoa') ?? false).toBe(false);
      expect((await repo.listarRelatosPublicadosDesde(elizete, '2000-01-01 00:00:00')).some((r) => r.id === relato)).toBe(false);
      // A memória em si não muda
      expect(await repo.obterMemoria(elizete, memoria)).toBeDefined();
    } finally {
      banco.sqlite.exec('ROLLBACK TO acervo_de_exemplo');
    }
  });

  it('quem só existe num laço privado de outra pessoa continua se vendo', async () => {
    // A pessoa da conta pode não ter laço nenhum além do privado de outra pessoa
    sql(`INSERT INTO integrantes (id, nome, tipo, tratamento) VALUES ('zz-sozinha', 'Pessoa Sozinha', 'pessoa', 'ela')`);
    sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('gui', 'zz-sozinha', 'Laço escondido', 1)`);
    try {
      const sozinha: Usuario = { pessoa: 'zz-sozinha', nome: 'Pessoa Sozinha', admin: false, nucleos: [] };
      expect((await repo.pessoasQueONaoVe(sozinha)).has('zz-sozinha')).toBe(false);
      expect((await repo.listarIntegrantesQueVe(sozinha)).some((i) => i.id === 'zz-sozinha')).toBe(true);
      expect((await repo.listarIntegrantesQueVe(usuarioDe('giovanna'))).some((i) => i.id === 'zz-sozinha')).toBe(false);
    } finally {
      banco.sqlite.exec('ROLLBACK TO acervo_de_exemplo');
    }
  });
});

// C1 (decisão do Gui, 17/11/2026): as telas e as APIs que listam, mostram ou marcam pessoas leem a lista
// de quem a pessoa vê. O teste acima confere a lista; este, que cada lugar usa a lista e não a inteira.
describe('C1: quem só existe num laço privado de outra pessoa some em todo lugar', () => {
  const fontes = import.meta.glob<string>(['../src/pages/**/*.astro', '../src/pages/api/*.ts', '../src/components/*.astro'], { query: '?raw', import: 'default', eager: true });
  const fonte = (caminho: string) => fontes[`../${caminho}`] ?? '';
  const LUGARES = [
    // A lista de Pessoas e a página da pessoa (404)
    'src/pages/pessoas/index.astro',
    'src/pages/pessoas/[id]/index.astro',
    'src/pages/pessoas/[id]/editar.astro',
    // Os seletores de pessoa
    'src/pages/nova.astro',
    'src/components/FichaDoCapitulo.astro',
    'src/components/FichaDoIntegrante.astro',
    'src/pages/memorias/[id]/relato.astro',
    // As APIs: não dá para marcar, escrever em nome de nem ligar quem a pessoa não vê
    'src/pages/api/memorias.ts',
    'src/pages/api/capitulos.ts',
    'src/pages/api/relatos.ts',
    'src/pages/api/lacos.ts',
    'src/pages/api/integrantes.ts',
    // Os nomes nas linhas do tempo e nos capítulos
    'src/pages/explorar.astro',
    'src/pages/temas/[id].astro',
    'src/pages/capitulos/[id]/index.astro',
  ];
  // A página da pessoa monta os dados em src/lib/servidor/pagina-da-pessoa.ts (sessão L)
  const servidorDaPessoa = readFileSync('src/lib/servidor/pagina-da-pessoa.ts', 'utf-8');
  const comServidor = (lugar: string) => (lugar === 'src/pages/pessoas/[id]/index.astro' ? fonte(lugar) + servidorDaPessoa : fonte(lugar));
  for (const lugar of LUGARES) {
    it(lugar, () => {
      expect(comServidor(lugar), lugar).toContain('listarIntegrantesQueVe(');
    });
  }
  it('a página da pessoa responde 404 a quem não está na lista de quem vê', () => {
    expect(servidorDaPessoa).toMatch(/const integrantes = await listarIntegrantesQueVe\(usuario\);\s*const pessoa = integrantes\.find\(/);
    expect(servidorDaPessoa).toMatch(/if \(!pessoa\) return null;/);
    expect(fonte('src/pages/pessoas/[id]/index.astro')).toMatch(/if \(!p\) return new Response\([^)]*status: 404/);
  });
  it('numa edição, a marca que a pessoa não vê continua', () => {
    expect(fonte('src/pages/api/memorias.ts')).toContain('for (const id of anterior?.integrantes ?? []) if (!marcaveis.has(id)');
    expect(fonte('src/pages/api/capitulos.ts')).toContain('(atual?.pessoas ?? []).filter((p) => !marcaveis.has(p)');
  });
  it('a memória e o histórico não mostram o nome', () => {
    expect(fonte('src/pages/memorias/[id].astro')).toContain("const quemEstava = memoria.integrantes.filter((id) => !naoVe.has(id) && naListaDeQuemOlha(modosDosExes.get(id)) !== 'fora');");
    expect(fonte('src/pages/memorias/[id]/historico.astro')).toContain('.filter((id) => !naoVe.has(id))');
  });
});
