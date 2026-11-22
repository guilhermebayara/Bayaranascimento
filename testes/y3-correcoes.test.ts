// Y3 do PR #160 (22/11/2026): as correções da W4, além do gabarito em testes/y3-falhas.test.ts.
// Pelas rotas de verdade, sobre o SQLite em memória.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type ComandoDeTeste, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('Y3: as correções', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  await (await import('../src/lib/servidor/banco')).prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const rotas = { memorias: await import('../src/pages/api/memorias'), relatos: await import('../src/pages/api/relatos') };
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const tipos = await repo.listarTipos();
  const linhas = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).all(...valores) as T[];
  const usuarioDe = (pessoa: string): Usuario => ({
    pessoa,
    nome: pessoa,
    admin: Boolean(linhas<{ admin: number }>('SELECT admin FROM integrantes WHERE id = ?', pessoa)[0].admin),
    nucleos: linhas<{ n: string }>(`SELECT nucleo_id AS n FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((l) => l.n),
  });
  // Gui, Giovanna e Elizete: Bayara Nascimento. Lúcio: fora dela
  const [gui, giovanna, elizete, lucio] = ['gui', 'giovanna', 'elizete', 'lucio'].map(usuarioDe);
  const BN = 'bayara-nascimento';
  const pedir = async (rota: keyof typeof rotas, quem: Usuario, corpo: Record<string, unknown>) => {
    const request = new Request(`http://localhost/api/${rota}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(corpo) });
    const resposta = await rotas[rota].POST({ request, locals: { usuario: quem, tipos } } as never);
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  };
  const lote = banco.batch.bind(banco);
  const base = (titulo: string) => ({ titulo, ano: 2021, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: [BN] });

  describe('item 1: nada gravado pela metade em /api/memorias', () => {
    it('uma perda e depois o acerto: a pessoa nova e o tema novo entram uma vez só, citados pela memória', async () => {
      const ficha = base('Y3: uma perda, depois o acerto');
      const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
      let perder = true;
      banco.batch = async (comandos: ComandoDeTeste[]) => {
        if (perder && comandos.some((c) => /^\s*UPDATE memorias SET versao = \?/.test(c.sql))) {
          perder = false;
          banco.sqlite.prepare('UPDATE memorias SET versao = versao + 1 WHERE id = ?').run(id);
        }
        return lote(comandos);
      };
      try {
        const r = await pedir('memorias', giovanna, { ...ficha, id, visibilidade: 'todos', pessoas: ['giovanna', 'nova:0'], novasPessoas: [{ nome: 'Sicrana Ypsilon' }], temas: 'tema-y3-acerto' });
        expect(r.status).toBe(200);
      } finally {
        banco.batch = lote;
      }
      const pessoas = linhas<{ id: string }>(`SELECT id FROM integrantes WHERE nome = 'Sicrana Ypsilon'`);
      expect(pessoas).toHaveLength(1);
      const temas = linhas<{ id: string }>(`SELECT id FROM temas WHERE nome = 'tema-y3-acerto'`);
      expect(temas).toHaveLength(1);
      expect(linhas(`SELECT 1 FROM memoria_integrantes WHERE memoria_id = ? AND integrante_id = ?`, id, pessoas[0].id)).toHaveLength(1);
      expect(linhas(`SELECT 1 FROM tema_memorias WHERE memoria_id = ? AND tema_id = ?`, id, temas[0].id)).toHaveLength(1);
    });

    it('a memória nova cujo lote falha na primeira tentativa não deixa pessoa, tema, laço aberto, relato nem aviso', async () => {
      banco.sqlite.prepare(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('t-y3-guardada', 'Dona Guardada', 'giovanna')`).run();
      banco.sqlite.prepare(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, privado) VALUES ('giovanna', 't-y3-guardada', 'vizinha', 1)`).run();
      const contar = () => ({
        integrantes: linhas('SELECT id FROM integrantes').length,
        temas: linhas('SELECT id FROM temas').length,
        memorias: linhas('SELECT id FROM memorias').length,
        relatos: linhas('SELECT id FROM relatos').length,
        avisos: linhas('SELECT id FROM avisos').length,
      });
      const antes = contar();
      // O lote da memória nova falha (o banco recusa): nada do que ele levava fica
      banco.batch = async (comandos: ComandoDeTeste[]) => {
        if (comandos.some((c) => /^\s*INSERT INTO memorias/.test(c.sql))) {
          banco.batch = lote;
          return lote([...comandos, banco.prepare('SELECT RAISE(ABORT, "falha de propósito")')]);
        }
        return lote(comandos);
      };
      await expect(
        pedir('memorias', giovanna, {
          ...base('Y3: memória nova que falha'),
          visibilidade: 'todos',
          pessoas: ['giovanna', 'gui', 't-y3-guardada', 'nova:0'],
          novasPessoas: [{ nome: 'Beltrana Ypsilon' }],
          temas: 'tema-y3-falha',
          pessoasPrivadas: 'abrir',
          relato: { por: 'giovanna', texto: 'O relato que vinha junto.' },
        }),
      ).rejects.toThrow('falha de propósito');
      banco.batch = lote;
      expect(contar()).toEqual(antes);
      expect(linhas<{ privado: number }>(`SELECT privado FROM lacos_coracao WHERE pessoa_id = 't-y3-guardada'`)[0].privado).toBe(1);
    });

    it('a memória nova que dá certo grava a ficha, a pessoa nova e o relato', async () => {
      const r = await pedir('memorias', giovanna, {
        ...base('Y3: memória nova inteira'),
        visibilidade: 'todos',
        pessoas: ['giovanna', 'elizete', 'nova:0'],
        novasPessoas: [{ nome: 'Fulustreca Ypsilon' }],
        relato: { por: 'giovanna', texto: 'O relato que veio junto.' },
      });
      expect(r.status).toBe(201);
      const id = r.corpo.id as string;
      expect(linhas(`SELECT id FROM integrantes WHERE nome = 'Fulustreca Ypsilon'`)).toHaveLength(1);
      expect((await repo.listarRelatos(elizete, id)).map((x) => x.texto)).toEqual(['O relato que veio junto.']);
    });
  });

  describe('item 2: só sai da memória a foto que a pessoa viu e tirou', () => {
    const fotoNa = (memoria: string, chave: string, enviadaPor: string, principal = 0, ordem = 0) => {
      banco.sqlite.prepare('INSERT INTO fotos (memoria_id, chave, principal, ordem, enviada_por) VALUES (?, ?, ?, ?, ?)').run(memoria, chave, principal, ordem, enviadaPor);
      return linhas<{ id: number }>('SELECT id FROM fotos WHERE chave = ?', chave)[0].id;
    };
    const removida = (chave: string) => linhas<{ removida_em: string | null }>('SELECT removida_em FROM fotos WHERE chave = ?', chave)[0].removida_em;
    const fotosDa = async (memoria: string) => (await repo.obterMemoria(giovanna, memoria))!.fotos.map((f) => ({ id: f.id, principal: f.principal }));

    it('com script, um administrador corrige o lugar depois de outra pessoa acrescentar uma foto: a foto nova fica', async () => {
      const id = (await pedir('memorias', giovanna, base('Y3: administrador e a foto nova'))).corpo.id as string;
      const a = fotoNa(id, 'teste/y3-adm-a.jpg', 'giovanna', 1, 0);
      // A página do Gui abre com a foto A; depois, a Elizete acrescenta a B
      const mostradas = [a];
      const b = fotoNa(id, 'teste/y3-adm-b.jpg', 'elizete', 0, 1);
      const r = await pedir('memorias', gui, { ...base('Y3: administrador e a foto nova'), id, lugar: 'Ouro Preto', fotos: [{ id: a, principal: true }], fotosMostradas: mostradas });
      expect(r.status).toBe(200);
      expect(removida('teste/y3-adm-b.jpg')).toBeNull();
      expect(await fotosDa(id)).toEqual([
        { id: a, principal: true },
        { id: b, principal: false },
      ]);
    });

    it('com script, o administrador tira a foto que viu, e a que entrou depois fica', async () => {
      const id = (await pedir('memorias', giovanna, base('Y3: administrador tira a que viu'))).corpo.id as string;
      const a = fotoNa(id, 'teste/y3-adm2-a.jpg', 'giovanna', 1, 0);
      const c = fotoNa(id, 'teste/y3-adm2-c.jpg', 'giovanna', 0, 1);
      const b = fotoNa(id, 'teste/y3-adm2-b.jpg', 'elizete', 0, 2);
      const r = await pedir('memorias', gui, { ...base('Y3: administrador tira a que viu'), id, fotos: [{ id: c, principal: false }], fotosMostradas: [a, c] });
      expect(r.status).toBe(200);
      expect(removida('teste/y3-adm2-a.jpg')).not.toBeNull();
      expect(removida('teste/y3-adm2-b.jpg')).toBeNull();
      // Sem a principal, a que ficou toma o lugar dela
      expect(await fotosDa(id)).toEqual([
        { id: c, principal: true },
        { id: b, principal: false },
      ]);
    });

    it('quem criou tira a foto que viu; a que entrou depois, sem a principal na lista, continua a da linha do tempo', async () => {
      const id = (await pedir('memorias', giovanna, base('Y3: a dona tira a que viu'))).corpo.id as string;
      const a = fotoNa(id, 'teste/y3-dona-a.jpg', 'giovanna', 0, 0);
      // Com a memória sem foto principal, a que a Elizete trouxe pelo relato virou a da linha do tempo
      const b = fotoNa(id, 'teste/y3-dona-b.jpg', 'elizete', 1, 1);
      const r = await pedir('memorias', giovanna, { ...base('Y3: a dona tira a que viu'), id, fotos: [], fotosMostradas: [a] });
      expect(r.status).toBe(200);
      expect(removida('teste/y3-dona-a.jpg')).not.toBeNull();
      expect(await fotosDa(id)).toEqual([{ id: b, principal: true }]);
    });

    it('a página de antes, que não diz o que mostrava, não tira foto nenhuma', async () => {
      const id = (await pedir('memorias', giovanna, base('Y3: página de antes'))).corpo.id as string;
      fotoNa(id, 'teste/y3-antes-a.jpg', 'giovanna', 1, 0);
      const r = await pedir('memorias', giovanna, { ...base('Y3: página de antes'), id, fotos: [] });
      expect(r.status).toBe(200);
      expect(removida('teste/y3-antes-a.jpg')).toBeNull();
    });

    it('sem script, o formulário diz as fotos que mostrava, e a foto que entrou depois fica', async () => {
      const id = (await pedir('memorias', giovanna, base('Y3: sem script com as mostradas'))).corpo.id as string;
      const a = fotoNa(id, 'teste/y3-form-a.jpg', 'giovanna', 1, 0);
      fotoNa(id, 'teste/y3-form-b.jpg', 'elizete', 0, 1);
      const dados = new FormData();
      for (const [k, v] of Object.entries({ id, titulo: 'Y3: sem script com as mostradas', ano: '2021', tipo: 'causo', pessoas: 'giovanna', visibilidade: 'nucleos', nucleos: BN, lugar: 'Mariana', fotosMostradas: String(a) })) dados.append(k, v);
      const request = new Request('http://localhost/api/memorias', { method: 'POST', headers: { Origin: 'http://localhost' }, body: dados });
      const resposta = await rotas.memorias.POST({ request, locals: { usuario: giovanna, tipos } } as never);
      expect(decodeURIComponent(resposta.headers.get('Location') ?? '')).toContain('ok=Memória+atualizada');
      expect(removida('teste/y3-form-a.jpg')).toBeNull();
      expect(removida('teste/y3-form-b.jpg')).toBeNull();
    });
  });

  describe('item 3: o relato nasce esperando quando a memória abriu depois de a página ser lida', () => {
    const SO_BN = `nucleos:${BN}`;
    const textosQueVe = async (quem: Usuario, memoria: string) => (await repo.listarRelatos(quem, memoria)).map((r) => r.texto);
    const pedidoAberto = (memoria: string, para: string) =>
      linhas<{ de: string; paraQuem: string }>(
        `SELECT de, json_extract(dados, '$.paraQuem') AS paraQuem FROM avisos WHERE tipo = 'liberar-relato' AND memoria_id = ? AND para = ? AND resolvido_em IS NULL`,
        memoria,
        para,
      );
    /** Uma memória da Giovanna só da Bayara Nascimento, aberta para todos depois */
    const abertaDepois = async (titulo: string) => {
      const id = (await pedir('memorias', giovanna, base(titulo))).corpo.id as string;
      expect((await pedir('memorias', giovanna, { ...base(titulo), id, visibilidade: 'todos' })).status).toBe(200);
      return id;
    };

    it('a página mostrava só a família: o relato nasce só para ela, espera, e quem escreveu recebe o pedido de quem criou', async () => {
      const id = await abertaDepois('Y3: página lida antes de abrir');
      const r = await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Escrito com a página de antes.', publico: SO_BN });
      expect(r.status).toBe(201);
      expect(await textosQueVe(lucio, id)).toEqual([]);
      expect(await textosQueVe(gui, id)).toEqual(['Escrito com a página de antes.']);
      expect(pedidoAberto(id, 'elizete')).toEqual([{ de: 'giovanna', paraQuem: 'toda a família' }]);
      // O pedido é o de sempre: liberar mostra o relato a quem passou a ver
      const relato = (await repo.obterRelato(id, 'elizete', elizete))!;
      expect(relato.soParaNucleos).toEqual([BN]);
      await repo.responderPedidoDoRelato(relato, 'liberar', (await repo.obterMemoria(elizete, id))!);
      expect(await textosQueVe(lucio, id)).toEqual(['Escrito com a página de antes.']);
    });

    it('a página mostrava o público de agora: o relato acompanha a memória, sem pedido', async () => {
      const id = await abertaDepois('Y3: página lida depois de abrir');
      expect((await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Escrito com a página certa.', publico: 'todos' })).status).toBe(201);
      expect(await textosQueVe(lucio, id)).toEqual(['Escrito com a página certa.']);
      expect(pedidoAberto(id, 'elizete')).toEqual([]);
    });

    it('a memória foi restringida depois de a página abrir: o relato acompanha a memória, sem pedido', async () => {
      const ficha = { ...base('Y3: restringida depois'), visibilidade: 'todos' };
      const id = (await pedir('memorias', giovanna, ficha)).corpo.id as string;
      expect((await pedir('memorias', giovanna, { ...ficha, id, visibilidade: 'nucleos' })).status).toBe(200);
      expect((await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Escrito com a página aberta.', publico: 'todos' })).status).toBe(201);
      expect((await repo.obterRelato(id, 'elizete', elizete))!.soParaNucleos).toBeNull();
      expect(pedidoAberto(id, 'elizete')).toEqual([]);
    });

    it('quem criou a memória escreve com a página de antes: o relato dela nunca espera', async () => {
      const id = await abertaDepois('Y3: quem criou escreve depois');
      expect((await pedir('relatos', giovanna, { memoria: id, por: 'giovanna', texto: 'Da Giovanna, com a página de antes.', publico: SO_BN })).status).toBe(201);
      expect(await textosQueVe(lucio, id)).toEqual(['Da Giovanna, com a página de antes.']);
    });

    it('a página de antes, sem o campo, numa memória que nunca mudou de público: o relato acompanha a memória', async () => {
      const id = (await pedir('memorias', giovanna, { ...base('Y3: sempre aberta'), visibilidade: 'todos' })).corpo.id as string;
      // Corrigir o lugar não muda quem vê: o público continua o mesmo de sempre
      expect((await pedir('memorias', giovanna, { ...base('Y3: sempre aberta'), id, visibilidade: 'todos', lugar: 'Sabará' })).status).toBe(200);
      expect((await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Sem o campo, memória de sempre.' })).status).toBe(201);
      expect(await textosQueVe(lucio, id)).toEqual(['Sem o campo, memória de sempre.']);
    });

    it('a página de antes, sem o campo, numa memória que já mudou de público: conta como só a família de quem escreve', async () => {
      const id = await abertaDepois('Y3: sem o campo, memória que mudou');
      expect((await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Sem o campo, memória que mudou.' })).status).toBe(201);
      expect(await textosQueVe(lucio, id)).toEqual([]);
      expect((await repo.obterRelato(id, 'elizete', elizete))!.soParaNucleos).toEqual(elizete.nucleos.slice().sort());
      expect(pedidoAberto(id, 'elizete')).toHaveLength(1);
    });

    it('sem script, a janela manda o público que a página mostrava', async () => {
      const id = await abertaDepois('Y3: sem script, página de antes');
      const dados = new FormData();
      for (const [k, v] of Object.entries({ memoria: id, por: 'elizete', texto: 'Sem script, com a página de antes.', acrescentar: '1', situacao: 'publicada', publico: SO_BN })) dados.append(k, v);
      const request = new Request('http://localhost/api/relatos', { method: 'POST', headers: { Origin: 'http://localhost' }, body: dados });
      const resposta = await rotas.relatos.POST({ request, locals: { usuario: elizete, tipos } } as never);
      expect(resposta.status).toBe(303);
      expect(await textosQueVe(lucio, id)).toEqual([]);
      expect(pedidoAberto(id, 'elizete')).toHaveLength(1);
    });

    it('a gravação do relato perde a corrida três vezes: recebe o recado, e nada é gravado', async () => {
      const id = (await pedir('memorias', giovanna, base('Y3: relato que perde sempre'))).corpo.id as string;
      banco.batch = async (comandos: ComandoDeTeste[]) => {
        if (comandos.some((c) => /^\s*UPDATE memorias SET versao = \?/.test(c.sql))) banco.sqlite.prepare('UPDATE memorias SET versao = versao + 1 WHERE id = ?').run(id);
        return lote(comandos);
      };
      try {
        const r = await pedir('relatos', elizete, { memoria: id, por: 'elizete', texto: 'Nunca gravado.', publico: SO_BN });
        expect(r.status).toBe(409);
        expect(r.corpo.erro).toBe(repo.RECADO_MEMORIA_MUDOU);
      } finally {
        banco.batch = lote;
      }
      expect(linhas(`SELECT id FROM relatos WHERE memoria_id = ?`, id)).toEqual([]);
    });
  });
});
