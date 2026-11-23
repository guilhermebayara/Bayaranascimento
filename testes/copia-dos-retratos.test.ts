// A cópia pequena dos retratos (sessão D1c, decisão do Gui de 23/11/2026; src/lib/retratos.ts). Quem vê a
// cópia é exatamente quem vê o retrato: a cópia passa pela rota da original (src/pages/retratos/[...chave].ts),
// com a conferência da original. Para cada pessoa do acervo de exemplo e cada retrato do banco (inclusive o
// de quem está na lixeira, o de quem só existe num laço privado e o retrato antigo, já trocado), as duas
// respostas saem iguais. E o envio: a cópia que não passa na conferência fica de fora, sem perder o retrato.
// Testado com as rotas de verdade sobre o banco SQLite em memória (testes/apoio/d1.ts).
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import {
  LADO_DA_COPIA_DO_RETRATO,
  chaveDaCopiaDoRetrato,
  conferirCopiaDoRetrato,
  enderecoDoRetrato,
  fontesDoRetrato,
  gravarCopiaDoRetrato,
  ladoDaCopiaDoRetrato,
  lerCaminhoDoRetrato,
  lerCopiaDoRetrato,
} from '../src/lib/retratos';

// Imagens de mentira: só o cabeçalho, que é o que a conferência lê
const png = (l: number, a: number) => {
  const b = new Uint8Array(40);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  b.set([(l >> 24) & 0xff, (l >> 16) & 0xff, (l >> 8) & 0xff, l & 0xff, (a >> 24) & 0xff, (a >> 16) & 0xff, (a >> 8) & 0xff, a & 0xff], 16);
  return b;
};
const webp = (l: number, a: number) => {
  const b = new Uint8Array(40);
  b.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
  b.set([...'WEBPVP8X'].map((c) => c.charCodeAt(0)), 8);
  b.set([(l - 1) & 0xff, ((l - 1) >> 8) & 0xff, ((l - 1) >> 16) & 0xff, (a - 1) & 0xff, ((a - 1) >> 8) & 0xff, ((a - 1) >> 16) & 0xff], 24);
  return b;
};
const jpeg = (l: number, a: number) => {
  const b = new Uint8Array(40);
  b.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, (a >> 8) & 0xff, a & 0xff, (l >> 8) & 0xff, l & 0xff]);
  return b;
};

describe('a cópia do retrato', () => {
  it('o tamanho cobre o maior retrato de lista em densidade 3', () => {
    // "Quem estava" na memória, no celular: 106 × 132 px, e o quadrado cobre o retângulo pela altura
    expect(LADO_DA_COPIA_DO_RETRATO).toBeGreaterThanOrEqual(132 * 3);
    expect(ladoDaCopiaDoRetrato(800)).toBe(400);
    expect(ladoDaCopiaDoRetrato(300)).toBe(300);
  });

  it('o nome da cópia nunca é o de uma original, e chave que não é de retrato não vira nome', () => {
    const chave = 'aaaaaaaa-d1c0-4000-8000-000000000001.jpg';
    expect(chaveDaCopiaDoRetrato(chave, 'webp')).toBe('aaaaaaaa-d1c0-4000-8000-000000000001.pequeno.webp');
    expect(chaveDaCopiaDoRetrato(chave, 'jpg')).not.toMatch(/^[0-9a-f-]{36}\.(jpg|png|webp)$/);
    expect(() => chaveDaCopiaDoRetrato('exemplos/chico-1.jpg', 'webp')).toThrow();
    expect(() => chaveDaCopiaDoRetrato('../x.jpg', 'webp')).toThrow();
  });

  it('o caminho da rota: "pequeno/" na frente é a cópia', () => {
    expect(lerCaminhoDoRetrato('pequeno/abc.jpg')).toEqual({ chave: 'abc.jpg', pequeno: true });
    expect(lerCaminhoDoRetrato('abc.jpg')).toEqual({ chave: 'abc.jpg', pequeno: false });
    expect(enderecoDoRetrato('exemplos/chico-1.jpg')).toBe('/retratos/pequeno/exemplos/chico-1.jpg');
  });

  it('as telas: o retrato de lista leva só a cópia; o grande leva também a original', () => {
    expect(fontesDoRetrato('/retratos/pequeno/x.jpg')).toEqual({ src: '/retratos/pequeno/x.jpg' });
    expect(fontesDoRetrato('/retratos/pequeno/x.jpg', true)).toEqual({ src: '/retratos/pequeno/x.jpg', srcset: '/retratos/pequeno/x.jpg 400w, /retratos/x.jpg 800w', sizes: '300px' });
    // A prévia do recorte (um blob) fica como está
    expect(fontesDoRetrato('blob:http://localhost/1', true)).toEqual({ src: 'blob:http://localhost/1' });
  });

  it('a conferência: WebP ou JPEG, quadrada, do lado certo', () => {
    expect(conferirCopiaDoRetrato(png(800, 800), webp(400, 400))).toEqual({ copia: { formato: 'webp', lado: 400, bytes: 40 } });
    expect(conferirCopiaDoRetrato(png(800, 800), jpeg(401, 399))).toEqual({ copia: { formato: 'jpg', lado: 401, bytes: 40 } });
    // Um retrato pequeno: a cópia tem o tamanho dele
    expect(conferirCopiaDoRetrato(png(300, 300), webp(300, 300))).toMatchObject({ copia: { lado: 300 } });
    expect(conferirCopiaDoRetrato(png(800, 800), webp(800, 800))).toHaveProperty('erro');
    expect(conferirCopiaDoRetrato(png(800, 800), webp(400, 300))).toHaveProperty('erro');
    expect(conferirCopiaDoRetrato(png(800, 800), png(400, 400))).toHaveProperty('erro');
    const grande = new Uint8Array(301 * 1024);
    grande.set(webp(400, 400));
    expect(conferirCopiaDoRetrato(png(800, 800), grande)).toHaveProperty('erro');
  });

  it('o que o banco guarda volta igual, e o que não está no formato vale como sem cópia', () => {
    expect(lerCopiaDoRetrato(gravarCopiaDoRetrato({ formato: 'jpg', lado: 400, bytes: 123 }))).toEqual({ formato: 'jpg', lado: 400, bytes: 123 });
    for (const ruim of [null, '', '{', '{"formato":"png","lado":400}', '{"formato":"webp","lado":0}']) expect(lerCopiaDoRetrato(ruim)).toBeNull();
  });
});

const comSqlite = await temSqlite();
const lidas: string[] = [];
const gravadas: string[] = [];
/** Um bucket de mentira: todo arquivo existe, e cada leitura e cada gravação ficam anotadas */
const bucket = {
  list: async () => ({ objects: [], truncated: false }),
  delete: async () => undefined,
  put: async (chave: string) => void gravadas.push(chave),
  head: async () => null,
  get: async (chave: string) => {
    lidas.push(chave);
    return {
      httpEtag: `"${chave}"`,
      body: new Uint8Array([1, 2, 3]),
      arrayBuffer: async () => png(800, 800).buffer,
      writeHttpMetadata: (h: Headers) => h.set('Content-Type', chave.endsWith('.webp') ? 'image/webp' : 'image/jpeg'),
    };
  },
};
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = bucket;

describe.skipIf(!comSqlite)('a cópia do retrato responde igual ao retrato, para cada pessoa', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const retratos = await import('../src/pages/retratos/[...chave]');
  const ajuste = await import('../src/pages/api/copias-dos-retratos');
  const repo = await import('../src/lib/servidor/repositorio');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;

  const sql = (texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...v);
  const linha = <T>(texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...v) as T;
  const usuarioDe = (pessoa: string): Usuario => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const pessoas = (banco.sqlite.prepare(`SELECT id FROM integrantes WHERE excluida_em IS NULL ORDER BY id`).all() as { id: string }[]).map((p) => usuarioDe(p.id));

  // Os casos de verdade, com as cópias anotadas: um retrato comum, o de quem está na lixeira, um retrato
  // antigo (trocado: já não é de ninguém) e um sem cópia
  const r = (n: number) => `aaaaaaaa-d1c0-4000-8000-${String(n).padStart(12, '0')}.jpg`;
  const copia = gravarCopiaDoRetrato({ formato: 'webp', lado: 400, bytes: 30000 });
  sql(`UPDATE integrantes SET retrato = ? WHERE id = 'elizete'`, r(1));
  sql(`INSERT INTO retratos_enviados (chave, tamanho, copia) VALUES (?, 150000, ?)`, r(1), copia);
  sql(`INSERT INTO integrantes (id, nome, tipo, retrato, excluida_em) VALUES ('d1c-na-lixeira', 'Na Lixeira', 'pessoa', ?, '2026-11-20 10:00:00')`, r(2));
  sql(`INSERT INTO retratos_enviados (chave, tamanho, copia) VALUES (?, 150000, ?)`, r(2), copia);
  sql(`INSERT INTO retratos_enviados (chave, tamanho, copia) VALUES (?, 150000, ?)`, r(3), copia);
  sql(`UPDATE integrantes SET retrato = ? WHERE id = 'giovanna'`, r(4));
  // Todos os retratos do banco: os de exemplo de cada pessoa e os de verdade acima
  const chaves = [...new Set((banco.sqlite.prepare(`SELECT retrato FROM integrantes WHERE retrato IS NOT NULL`).all() as { retrato: string }[]).map((i) => i.retrato)), r(3), r(99)];

  const pedir = async (quem: Usuario, caminho: string) => {
    const request = new Request(`http://localhost/retratos/${caminho}`);
    const resposta = await retratos.GET({ params: { chave: caminho }, request, locals: { usuario: quem } } as never);
    return { status: resposta.status, cache: resposta.headers.get('Cache-Control'), vary: resposta.headers.get('Vary') };
  };

  it('para cada pessoa e cada retrato, a cópia responde como a original', async () => {
    let vistos = 0;
    let recusados = 0;
    for (const quem of pessoas) {
      for (const chave of chaves) {
        const original = await pedir(quem, chave);
        expect(await pedir(quem, `pequeno/${chave}`), `${quem.pessoa}, ${chave}`).toEqual(original);
        if (original.status === 200) vistos++;
        else recusados++;
      }
    }
    // O teste só vale se houver dos dois: retratos vistos e retratos recusados
    expect(vistos).toBeGreaterThan(pessoas.length);
    expect(recusados).toBeGreaterThanOrEqual(pessoas.length);
  });

  it('quem está na lixeira: a cópia, como a original, é conferida a cada uso; o retrato antigo não é entregue', async () => {
    for (const quem of pessoas) {
      const naLixeira = await pedir(quem, `pequeno/${r(2)}`);
      if (naLixeira.status === 200) expect(naLixeira.cache).toBe('private, no-cache');
      else expect(naLixeira.status).toBe(404);
      expect((await pedir(quem, `pequeno/${r(3)}`)).status).toBe(404);
      expect((await pedir(quem, `pequeno/${r(99)}`)).status).toBe(404);
    }
    expect(await pedir(usuarioDe('gui'), `pequeno/${r(1)}`)).toEqual({ status: 200, cache: 'private, max-age=604800', vary: 'Cookie' });
  });

  it('quem não vê recebe a recusa sem nada lido do bucket', async () => {
    lidas.length = 0;
    for (const quem of pessoas) for (const chave of [r(3), r(99), 'pequeno/' + r(3)]) await pedir(quem, chave);
    expect(lidas).toEqual([]);
  });

  it('a cópia é lida no lugar dela; sem cópia, vai a original; a de exemplo é a pequena da foto de exemplo', async () => {
    const gui = usuarioDe('gui');
    lidas.length = 0;
    await pedir(gui, `pequeno/${r(1)}`);
    await pedir(gui, r(1));
    await pedir(gui, `pequeno/${r(4)}`);
    expect(lidas).toEqual([`retratos/${r(1).replace('.jpg', '.pequeno.webp')}`, `retratos/${r(1)}`, `retratos/${r(4)}`]);
    const exemplo = linha<{ retrato: string }>(`SELECT retrato FROM integrantes WHERE id = 'gui'`).retrato;
    expect(exemplo.startsWith('exemplos/')).toBe(true);
    lidas.length = 0;
    await pedir(gui, `pequeno/${exemplo}`);
    expect(lidas).toEqual([exemplo.replace('.jpg', '.pequena.webp')]);
    // Um caminho com o nome da cópia não passa como original
    expect((await pedir(gui, r(1).replace('.jpg', '.pequeno.webp'))).status).toBe(404);
  });

  it('o ajuste lista só os retratos de agora sem cópia que o administrador vê, fora os de exemplo', async () => {
    const lista = await repo.listarRetratosSemCopia(usuarioDe('gui'));
    expect(lista).toEqual([r(4)]);
    expect(lista.some((c) => c.startsWith('exemplos/'))).toBe(false);
  });

  it('o ajuste grava a cópia de um retrato de antes uma vez só, e só para administradores', async () => {
    const enviar = async (quem: Usuario, chave: string, arquivo: Uint8Array) => {
      const f = new FormData();
      f.set('chave', chave);
      f.set('pequeno', new File([arquivo as BlobPart], 'pequeno.webp', { type: 'image/webp' }));
      const request = new Request('http://localhost/api/copias-dos-retratos', { method: 'POST', headers: { Origin: 'http://localhost' }, body: f });
      return (await ajuste.POST({ request, locals: { usuario: quem } } as never)).status;
    };
    gravadas.length = 0;
    expect(await enviar(usuarioDe('elizete'), r(4), webp(400, 400))).toBe(403);
    expect(await enviar(usuarioDe('gui'), r(99), webp(400, 400))).toBe(404);
    expect(await enviar(usuarioDe('gui'), r(4), webp(300, 300))).toBe(400);
    expect(gravadas).toEqual([]);
    expect(await enviar(usuarioDe('gui'), r(4), webp(400, 400))).toBe(201);
    expect(gravadas).toEqual([`retratos/${r(4).replace('.jpg', '.pequeno.webp')}`]);
    expect(await enviar(usuarioDe('gui'), r(4), webp(400, 400))).toBe(409);
    expect(gravadas).toHaveLength(1);
    expect(lerCopiaDoRetrato(linha<{ copia: string }>('SELECT copia FROM retratos_enviados WHERE chave = ?', r(4)).copia)).toEqual({ formato: 'webp', lado: 400, bytes: 40 });
    // A cópia entra na conta do espaço
    const { bytes } = await repo.espacoDosArquivos();
    expect(bytes).toBeGreaterThanOrEqual(3 * 30000 + 40);
  });
  it('o envio do retrato guarda a cópia que passa; a que não passa fica de fora, e o retrato entra assim mesmo', async () => {
    const integrantes = await import('../src/pages/api/integrantes');
    const enviar = async (copia: Uint8Array) => {
      const corpo = new FormData();
      corpo.set('id', 'vo-bela');
      corpo.set('nome', linha<{ nome: string }>(`SELECT nome FROM integrantes WHERE id = 'vo-bela'`).nome);
      corpo.set('retrato', new File([jpeg(800, 800)], 'retrato.jpg', { type: 'image/jpeg' }));
      corpo.set('retratoPequeno', new File([copia as BlobPart], 'pequeno.webp', { type: 'image/webp' }));
      const request = new Request('http://localhost/api/integrantes', { method: 'POST', headers: { Origin: 'http://localhost' }, body: corpo });
      await integrantes.POST({ request, locals: { usuario: usuarioDe('gui') } } as never);
      return linha<{ retrato: string }>(`SELECT retrato FROM integrantes WHERE id = 'vo-bela'`).retrato;
    };
    gravadas.length = 0;
    const certa = await enviar(webp(400, 400));
    expect(gravadas).toEqual([`retratos/${certa}`, `retratos/${certa.replace('.jpg', '.pequeno.webp')}`]);
    expect(lerCopiaDoRetrato(linha<{ copia: string }>('SELECT copia FROM retratos_enviados WHERE chave = ?', certa).copia)).toEqual({ formato: 'webp', lado: 400, bytes: 40 });
    gravadas.length = 0;
    const semCopia = await enviar(webp(800, 800));
    expect(semCopia).not.toBe(certa);
    expect(gravadas).toEqual([`retratos/${semCopia}`]);
    expect(linha<{ copia: string | null }>('SELECT copia FROM retratos_enviados WHERE chave = ?', semCopia).copia).toBeNull();
  });
});
