// A cópia para o espelho (sessão D1e, decisão do Gui de 23/11/2026; src/lib/copia-para-o-espelho.ts).
// Regras que não podem falhar:
// - ela só leva as tabelas da família, e nelas só as colunas da lista: nada de memória, relato, mensagem,
//   "Sobre", retrato, foto, áudio, capítulo, carta, círculo, "Como você chama" ou como o ex aparece;
// - o espelho feito dela é igual ao feito da cópia inteira, e o espelho não lê da cópia nenhuma coluna fora da
//   lista;
// - só os administradores a baixam;
// - o espelho da homologação recusa a cópia inteira do acervo, com recado claro, e o arquivo maior que o limite.
// Roda as rotas de verdade, num SQLite em memória (testes/apoio/d1.ts).
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import {
  COLUNAS_PARA_O_ESPELHO,
  LIMITE_DA_COPIA_PARA_O_ESPELHO,
  RECADO_DA_COPIA_INTEIRA,
  RECADO_DE_OUTRO_ARQUIVO,
  TABELAS_PARA_O_ESPELHO,
  nomeDoArquivoParaOEspelho,
  recusaDaCopiaParaOEspelho,
} from '../src/lib/copia-para-o-espelho';
import { espelhar } from '../src/lib/espelho';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown, DB_HOMOLOGA: undefined as unknown, FOTOS_HOMOLOGA: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe.skipIf(!comSqlite)('a cópia para o espelho', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const { montarCopia } = await import('../src/lib/servidor/copia');
  const { montarCopiaParaOEspelho } = await import('../src/lib/servidor/copia-para-o-espelho');
  const rota = await import('../src/pages/api/copia-para-o-espelho');
  const rotaDoEspelho = await import('../src/pages/api/espelho');
  const { noPedido } = await import('../src/lib/servidor/ambiente');
  const noSite = <T>(f: () => Promise<T>) => noPedido(new Request('http://localhost/'), f);

  // O que alguém escreveu ou fotografou, para conferir que não sai: o "Sobre", o retrato, um apelido privado,
  // a proximidade do círculo e um relato
  const VENENO = 'veneno-da-d1e-que-nao-pode-sair';
  banco.sqlite.prepare(`UPDATE integrantes SET sobre = ?, retrato = ? WHERE id = 'gui'`).run(`${VENENO}-sobre`, `retratos/${VENENO}.jpg`);
  banco.sqlite.prepare(`INSERT INTO apelidos_meus (dono_id, pessoa_id, apelido) VALUES ('gui', 'giovanna', ?)`).run(`${VENENO}-apelido`);
  const memoria = (banco.sqlite.prepare(`SELECT id FROM memorias LIMIT 1`).get() as { id: string }).id;
  banco.sqlite.prepare(`UPDATE memorias SET titulo = ? WHERE id = ?`).run(`${VENENO}-titulo`, memoria);
  banco.sqlite.prepare(`UPDATE relatos SET texto = ? WHERE rowid = (SELECT MIN(rowid) FROM relatos)`).run(`${VENENO}-relato`);

  const gui = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };
  const elizete = { pessoa: 'elizete', nome: 'Elizete', admin: false, nucleos: [] };

  it('leva só as tabelas da família, coluna por coluna, e nada que alguém escreveu ou fotografou', async () => {
    const copia = await noSite(() => montarCopiaParaOEspelho());
    expect(Object.keys(copia.tabelas)).toEqual(TABELAS_PARA_O_ESPELHO);
    expect(copia.acervo).toBe('Bayara Nascimento');
    expect(copia.conteudo).toBe('familia-para-o-espelho');
    for (const tabela of TABELAS_PARA_O_ESPELHO) {
      for (const linha of copia.tabelas[tabela]) expect(Object.keys(linha)).toEqual([...COLUNAS_PARA_O_ESPELHO[tabela]]);
    }
    expect(copia.tabelas.integrantes.length).toBe((banco.sqlite.prepare('SELECT COUNT(*) AS n FROM integrantes').get() as { n: number }).n);
    const texto = JSON.stringify(copia);
    expect(texto).not.toContain(VENENO);
    for (const proibida of ['sobre', 'retrato', 'texto', 'titulo', 'legenda', 'chave']) expect(texto).not.toContain(`"${proibida}"`);
    // Nenhuma tabela de memória, relato, foto, áudio, capítulo, carta, círculo, apelido ou ex
    for (const tabela of ['memorias', 'relatos', 'relato_mensagens', 'fotos', 'audios', 'capitulos', 'cartas', 'proximidades', 'apelidos_meus', 'ex_para_mim', 'versoes', 'retratos_enviados']) {
      expect(TABELAS_PARA_O_ESPELHO as string[]).not.toContain(tabela);
    }
    // E é pequena: a família de exemplo cabe em poucos KB, muito abaixo do limite do espelho
    expect(texto.length).toBeLessThan(LIMITE_DA_COPIA_PARA_O_ESPELHO / 20);
  });

  it('o espelho feito dela é igual ao feito da cópia inteira', async () => {
    const inteira = await noSite(() => montarCopia());
    const familia = await noSite(() => montarCopiaParaOEspelho());
    const opcoes = { semente: 23, agora: new Date('2026-11-23T12:00:00Z') };
    expect(espelhar(familia, opcoes)).toEqual(espelhar(inteira, opcoes));
  });

  it('o espelho não lê da cópia nenhuma tabela nem coluna fora da lista', async () => {
    const inteira = await noSite(() => montarCopia());
    const lidas = new Map<string, Set<string>>();
    // Cada linha da cópia inteira anota as colunas que o espelho lê dela
    const vigiada = {
      acervo: inteira.acervo,
      tabelas: new Proxy(inteira.tabelas, {
        get(alvo, tabela: string) {
          const linhas = alvo[tabela];
          if (!Array.isArray(linhas)) return linhas;
          if (!lidas.has(tabela)) lidas.set(tabela, new Set());
          return linhas.map((linha) => new Proxy(linha, { get: (l, coluna: string) => (lidas.get(tabela)!.add(coluna), l[coluna]) }));
        },
      }),
    };
    espelhar(vigiada, { semente: 5, agora: new Date('2026-11-23T12:00:00Z') });
    expect([...lidas.keys()].sort()).toEqual([...TABELAS_PARA_O_ESPELHO].sort());
    for (const [tabela, colunas] of lidas) {
      const pode = new Set<string>(COLUNAS_PARA_O_ESPELHO[tabela as keyof typeof COLUNAS_PARA_O_ESPELHO]);
      for (const coluna of colunas) expect(pode.has(coluna), `${tabela}.${coluna}`).toBe(true);
    }
  });

  it('só os administradores baixam, com o nome do arquivo da família', async () => {
    const pedir = (usuario: typeof gui) => noSite(() => Promise.resolve(rota.GET({ locals: { usuario } } as never)));
    const recusada = await pedir(elizete);
    expect(recusada.status).toBe(403);
    expect(await recusada.text()).not.toContain('integrantes');
    const resposta = await pedir(gui);
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('Content-Disposition')).toMatch(/^attachment; filename="acervo-familia-\d{4}-\d{2}-\d{2}\.json"$/);
    expect(resposta.headers.get('Cache-Control')).toBe('private, no-store');
    expect(recusaDaCopiaParaOEspelho(JSON.parse(await resposta.text()))).toBeNull();
    expect(nomeDoArquivoParaOEspelho('2026-12-01T05:00:00.000Z')).toBe('acervo-familia-2026-12-01.json');
  });

  it('a conferência do arquivo: a cópia inteira e o que não é a cópia para o espelho são recusados', async () => {
    const familia = await noSite(() => montarCopiaParaOEspelho());
    const inteira = await noSite(() => montarCopia());
    expect(recusaDaCopiaParaOEspelho(familia)).toBeNull();
    expect(recusaDaCopiaParaOEspelho(inteira)).toBe(RECADO_DA_COPIA_INTEIRA);
    // A cópia inteira com a marca de conteúdo trocada por alguém, ou a da família com uma tabela ou coluna a mais
    expect(recusaDaCopiaParaOEspelho({ ...inteira, conteudo: 'familia-para-o-espelho' })).toBe(RECADO_DE_OUTRO_ARQUIVO);
    expect(recusaDaCopiaParaOEspelho({ ...familia, tabelas: { ...familia.tabelas, memorias: [] } })).toBe(RECADO_DE_OUTRO_ARQUIVO);
    expect(recusaDaCopiaParaOEspelho({ ...familia, tabelas: { ...familia.tabelas, integrantes: [{ id: 'gui', sobre: 'texto' }] } })).toBe(RECADO_DE_OUTRO_ARQUIVO);
    for (const outro of [null, 'texto', [], { acervo: 'Outro', tabelas: {} }, { acervo: 'Bayara Nascimento' }, { acervo: 'Bayara Nascimento', conteudo: 'familia-para-o-espelho', tabelas: {} }]) {
      expect(recusaDaCopiaParaOEspelho(outro)).toBe(RECADO_DE_OUTRO_ARQUIVO);
    }
  });

  describe('o espelho na homologação', () => {
    env.DB_HOMOLOGA = banco;
    env.FOTOS_HOMOLOGA = env.FOTOS;
    const enviar = async (corpo: string | Blob, comprimento?: number) => {
      const dados = new FormData();
      dados.set('copia', corpo instanceof Blob ? corpo : new Blob([corpo], { type: 'application/json' }), 'copia.json');
      const url = 'https://homologa.memorias.bayara.com.br/api/espelho';
      const request = new Request(url, { method: 'POST', headers: { Origin: 'https://homologa.memorias.bayara.com.br', ...(comprimento ? { 'Content-Length': String(comprimento) } : {}) }, body: dados });
      const resposta = await noPedido(request, () => rotaDoEspelho.POST({ request, locals: { usuario: gui } } as never));
      const local = new URL(resposta.headers.get('Location') ?? '/', url);
      return { status: resposta.status, ok: local.searchParams.get('ok'), erro: local.searchParams.get('erro') };
    };
    const impressao = () => {
      const tabelas = (banco.sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> 'marca_da_copia' ORDER BY name`).all() as { name: string }[]).map((t) => t.name);
      return JSON.stringify(tabelas.map((t) => [t, banco.sqlite.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all()]));
    };

    it('recusa a cópia inteira do acervo com o recado de qual arquivo usar, sem mudar nada', async () => {
      const inteira = await noSite(() => montarCopia());
      const antes = impressao();
      const r = await enviar(JSON.stringify(inteira));
      expect(r.erro).toBe(RECADO_DA_COPIA_INTEIRA);
      expect(r.ok).toBeNull();
      expect(impressao()).toBe(antes);
    });

    it('recusa o arquivo maior que o limite, pelo tamanho declarado ou pelo do arquivo, sem mudar nada', async () => {
      const antes = impressao();
      const grande = ' '.repeat(LIMITE_DA_COPIA_PARA_O_ESPELHO + 1);
      expect((await enviar(grande)).erro).toBe(RECADO_DA_COPIA_INTEIRA);
      expect((await enviar('{}', LIMITE_DA_COPIA_PARA_O_ESPELHO * 4)).erro).toBe(RECADO_DA_COPIA_INTEIRA);
      expect((await enviar('isto não é json')).erro).toContain('Não consegui ler o arquivo');
      expect((await enviar(JSON.stringify({ acervo: 'Bayara Nascimento', tabelas: { integrantes: [] } }))).erro).toBe(RECADO_DA_COPIA_INTEIRA);
      expect(impressao()).toBe(antes);
    });

    it('aceita a cópia para o espelho e refaz o espelho', async () => {
      const familia = await noSite(() => montarCopiaParaOEspelho());
      const r = await enviar(JSON.stringify(familia));
      expect(r.erro).toBeNull();
      expect(r.ok).toMatch(/^Espelho refeito: \d+ pessoas/);
      // O "Sobre" e o retrato de verdade não chegaram
      const gui = banco.sqlite.prepare(`SELECT sobre, retrato FROM integrantes WHERE id = 'gui'`).get() as { sobre: string | null; retrato: string };
      expect(gui.sobre).toBeNull();
      expect(gui.retrato).not.toContain(VENENO);
      expect(banco.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    });
  });
});
