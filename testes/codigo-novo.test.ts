// O mesmo cuidado do D2 da sessão Z nas outras rotas que geram código para gravar (sessão AA): se outro pedido
// usou o código no meio tempo, o site tenta de novo sozinho, com os códigos do banco de agora, e no fim volta
// com o recado, sem 500 e sem nada gravado. Rotas conferidas: pessoa pelo cadastro (/api/integrantes), pessoa
// nova pelo laço (/api/lacos), capítulo com tema novo (/api/capitulos) e tipo de momento (/api/tipos). A
// memória, a pessoa nova e o tema novo pela memória já tinham o caminho (testes/z-correcoes.test.ts).
import { describe, expect, it, vi } from 'vitest';
import { ComandoDeTeste, temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('código novo quando outro pedido usou o mesmo', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  await (await import('../src/lib/servidor/banco')).prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const rotas = {
    integrantes: await import('../src/pages/api/integrantes'),
    lacos: await import('../src/pages/api/lacos'),
    capitulos: await import('../src/pages/api/capitulos'),
    tipos: await import('../src/pages/api/tipos'),
  };
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const sql = banco.sqlite;
  const linhas = <T>(texto: string, ...valores: (string | number | null)[]) => sql.prepare(texto).all(...valores) as T[];
  const usuarioDe = (pessoa: string): Usuario => ({
    pessoa,
    nome: pessoa,
    admin: Boolean(linhas<{ admin: number }>('SELECT admin FROM integrantes WHERE id = ?', pessoa)[0].admin),
    nucleos: linhas<{ n: string }>(`SELECT nucleo_id AS n FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((l) => l.n),
  });
  const gui = usuarioDe('gui');
  const tipos = await repo.listarTipos();
  const impressao = () => {
    const tabelas = linhas<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> 'marca_da_copia' ORDER BY name`).map((t) => t.name);
    return JSON.stringify(tabelas.map((t) => [t, sql.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all()]));
  };
  /** O formulário comum, como o navegador manda: para onde a rota mandou voltar, e o recado */
  const formulario = async (rota: keyof typeof rotas, campos: Record<string, string | string[]>) => {
    const dados = new FormData();
    for (const [k, v] of Object.entries(campos)) for (const valor of [v].flat()) dados.append(k, valor);
    const request = new Request(`http://localhost/api/${rota}`, { method: 'POST', headers: { Origin: 'http://localhost' }, body: dados });
    const resposta = await rotas[rota].POST({ request, locals: { usuario: gui, tipos } } as never);
    const destino = new URL(resposta.headers.get('Location') ?? '/', 'http://localhost');
    return { status: resposta.status, caminho: destino.pathname, ok: destino.searchParams.get('ok'), erro: destino.searchParams.get('erro') };
  };
  /**
   * O código que o pedido escolheu já foi usado por outro pedido, nas `vezes` primeiras gravações que casam com
   * `comando`: o banco responde como o D1, com a recusa do UNIQUE, e nada é gravado naquela vez.
   */
  async function comCodigoUsado<T>(comando: RegExp, tabela: string, vezes: number, fazer: () => Promise<T>): Promise<{ resultado: T; tentativas: number }> {
    let tentativas = 0;
    const recusar = (sqls: string[]) => {
      if (!sqls.some((s) => comando.test(s))) return;
      tentativas++;
      if (tentativas <= vezes) throw new Error(`D1_ERROR: UNIQUE constraint failed: ${tabela}.id: SQLITE_CONSTRAINT`);
    };
    const lote = banco.batch.bind(banco);
    const run = ComandoDeTeste.prototype.run;
    banco.batch = async (comandos) => {
      recusar(comandos.map((c) => c.sql));
      return lote(comandos);
    };
    ComandoDeTeste.prototype.run = async function (this: ComandoDeTeste) {
      recusar([this.sql]);
      return run.call(this);
    };
    try {
      return { resultado: await fazer(), tentativas };
    } finally {
      banco.batch = lote;
      ComandoDeTeste.prototype.run = run;
    }
  }

  describe('/api/integrantes: a pessoa pelo cadastro', () => {
    it('o endereço usado no meio tempo: o site tenta de novo sozinho e cadastra', async () => {
      const { resultado, tentativas } = await comCodigoUsado(/INSERT INTO integrantes/, 'integrantes', 1, () => formulario('integrantes', { nome: 'Pessoa do Código Novo', tipo: 'pessoa' }));
      expect(tentativas).toBe(2);
      expect(resultado.ok).toBe('Pessoa do Código Novo entrou no acervo. Agora, os laços.');
      expect(linhas('SELECT id FROM integrantes WHERE nome = ?', 'Pessoa do Código Novo')).toHaveLength(1);
    });
    it('nas três tentativas: volta para o formulário com o recado, sem 500 e sem nada gravado', async () => {
      const antes = impressao();
      const { resultado, tentativas } = await comCodigoUsado(/INSERT INTO integrantes/, 'integrantes', 3, () => formulario('integrantes', { nome: 'Pessoa Sem Sorte', tipo: 'pessoa' }));
      expect(tentativas).toBe(3);
      expect([resultado.status, resultado.caminho, resultado.erro]).toEqual([303, '/pessoas/nova', 'Não consegui salvar.']);
      expect(impressao()).toBe(antes);
    });
  });

  describe('/api/lacos: a pessoa nova pelo laço', () => {
    it('o endereço usado no meio tempo: o site tenta de novo sozinho, cadastra a pessoa e grava o laço com ela', async () => {
      const { resultado, tentativas } = await comCodigoUsado(/INSERT INTO integrantes/, 'integrantes', 1, () =>
        formulario('lacos', { acao: 'adicionar', laco: 'pai-de', sujeito: 'gui', nomeNovo: 'Filho do Código', qualidade: 'consideracao', volta: '/pessoas/gui/editar' }),
      );
      expect(tentativas).toBe(2);
      expect(resultado.erro).toBeNull();
      const [nova] = linhas<{ id: string }>('SELECT id FROM integrantes WHERE nome = ?', 'Filho do Código');
      expect(nova).toBeTruthy();
      expect(linhas('SELECT * FROM filiacoes WHERE filho_id = ? AND responsavel_id = ?', nova!.id, 'gui')).toHaveLength(1);
    });
    it('nas três tentativas: volta com o recado, sem 500 e sem nada gravado', async () => {
      const antes = impressao();
      const { resultado } = await comCodigoUsado(/INSERT INTO integrantes/, 'integrantes', 3, () =>
        formulario('lacos', { acao: 'adicionar', laco: 'pai-de', sujeito: 'gui', nomeNovo: 'Filho Sem Sorte', qualidade: 'consideracao', volta: '/pessoas/gui/editar' }),
      );
      expect([resultado.status, resultado.caminho, resultado.erro]).toEqual([303, '/pessoas/gui/editar', 'Não consegui salvar.']);
      expect(impressao()).toBe(antes);
    });
  });

  describe('/api/capitulos: o capítulo e o tema novo', () => {
    it('o código usado no meio tempo: o site tenta de novo sozinho e grava o capítulo com o tema novo', async () => {
      const { resultado, tentativas } = await comCodigoUsado(/INSERT INTO capitulos/, 'capitulos', 1, () => formulario('capitulos', { titulo: 'Capítulo do Código Novo', modo: 'reunido', temas: 'Tema do Capítulo Novo' }));
      expect(tentativas).toBe(2);
      expect(resultado.ok).toBe('Capítulo criado. Agora é só colocar as memórias nele.');
      expect(linhas('SELECT id FROM capitulos WHERE titulo = ?', 'Capítulo do Código Novo')).toHaveLength(1);
      expect(linhas('SELECT id FROM temas WHERE nome = ?', 'Tema do Capítulo Novo')).toHaveLength(1);
    });
    it('o tema novo usado no meio tempo também volta o lote inteiro e tenta de novo', async () => {
      const { resultado, tentativas } = await comCodigoUsado(/INSERT INTO temas/, 'temas', 1, () => formulario('capitulos', { titulo: 'Capítulo do Tema Disputado', modo: 'reunido', temas: 'Tema Disputado' }));
      expect(tentativas).toBe(2);
      expect(resultado.erro).toBeNull();
      expect(linhas('SELECT id FROM temas WHERE nome = ?', 'Tema Disputado')).toHaveLength(1);
    });
    it('nas três tentativas: volta com o recado, sem 500 e sem nada gravado, nem o tema', async () => {
      const antes = impressao();
      const { resultado } = await comCodigoUsado(/INSERT INTO capitulos/, 'capitulos', 3, () => formulario('capitulos', { titulo: 'Capítulo Sem Sorte', modo: 'reunido', temas: 'Tema Sem Sorte' }));
      expect([resultado.status, resultado.caminho, resultado.erro]).toEqual([303, '/capitulos/novo', 'Não consegui salvar.']);
      expect(impressao()).toBe(antes);
    });
  });

  describe('/api/tipos: o tipo de momento pela Administração', () => {
    it('o código usado no meio tempo: o site tenta de novo sozinho e cria o tipo', async () => {
      const { resultado, tentativas } = await comCodigoUsado(/INSERT INTO tipos/, 'tipos', 1, () => formulario('tipos', { acao: 'criar', rotulo: 'Tipo do Código', cor: 'verde', icone: 'viagem' }));
      expect(tentativas).toBe(2);
      expect(resultado.ok).toBe('Tipo “Tipo do Código” criado.');
      expect(linhas('SELECT id FROM tipos WHERE rotulo = ?', 'Tipo do Código')).toHaveLength(1);
    });
    it('nas três tentativas: volta com o recado, sem 500 e sem nada gravado', async () => {
      const antes = impressao();
      const { resultado } = await comCodigoUsado(/INSERT INTO tipos/, 'tipos', 3, () => formulario('tipos', { acao: 'criar', rotulo: 'Tipo Sem Sorte', cor: 'verde', icone: 'viagem' }));
      expect([resultado.status, resultado.erro]).toEqual([303, 'Não consegui salvar.']);
      expect(impressao()).toBe(antes);
    });
  });
});
