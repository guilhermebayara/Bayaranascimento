import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarD1, temSqlite } from './apoio/d1';
import { baixarCopiaEmPartes, MARCA_DO_ACERVO } from '../src/lib/copia-em-partes';
import { COLUNAS_PARA_O_ESPELHO, CONTEUDO_PARA_O_ESPELHO } from '../src/lib/copia-para-o-espelho';
const env = vi.hoisted(() => ({ AMBIENTE: 'previa', DB: undefined as unknown, DB_HOMOLOGA: undefined as unknown, FOTOS: { list: async () => ({ objects: [], truncated: false }), delete: async () => {}, get: async () => null, head: async () => null } }));
vi.mock('cloudflare:workers', () => ({ env }));
describe.skipIf(!(await temSqlite()))('MEM-7: a marca só atesta mensagens concluídas', async () => {
  const d1 = await criarD1(); env.DB = env.DB_HOMOLOGA = d1;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  const repo = await import('../src/lib/servidor/repositorio');
  const { noPedido } = await import('../src/lib/servidor/ambiente');
  const { darMensagensAosRelatosDeAntes: consertar, MARCA_DAS_MENSAGENS_DE_ANTES: marca } = await import('../src/lib/servidor/mensagens-de-antes');
  const gui = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };
  beforeEach(async () => {
    await prepararBanco();
    d1.sqlite.exec('SAVEPOINT caso');
  });
  afterEach(() => { vi.restoreAllMocks(); d1.sqlite.exec('ROLLBACK TO caso; RELEASE caso'); });
  const marcar = () => d1.sqlite.prepare('INSERT OR REPLACE INTO ajustes (chave, valor) VALUES (?, ?)').run(marca, '{"versao":2,"relatos":27}');
  const novo = (texto: string) => {
    d1.sqlite.prepare("INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES ('1992-chegada-do-gui', 'gui', 'gui', ?, 'rascunho')").run(texto);
    return (d1.sqlite.prepare('SELECT MAX(id) AS id FROM relatos').get() as {id:number}).id;
  };
  const familia = () => ({ acervo: MARCA_DO_ACERVO, conteudo: CONTEUDO_PARA_O_ESPELHO, gerada_em: '2026-11-26', tabelas: Object.fromEntries(Object.entries(COLUNAS_PARA_O_ESPELHO).map(([t, cs]) => [t, d1.sqlite.prepare(`SELECT ${cs.join(',')} FROM ${t}`).all()])) });

  it('falha ao apagar a marca no espelho reverte a troca dos relatos', async () => {
    marcar();
    const antes = d1.sqlite.prepare('SELECT * FROM relatos').all();
    const executar = d1.prepare.bind(d1);
    vi.spyOn(d1, 'prepare').mockImplementation((sql) => executar(sql.startsWith('DELETE FROM ajustes') ? 'SELECT coluna_inexistente FROM ajustes' : sql));
    const { gravarEspelho } = await import('../src/lib/servidor/espelho');
    await expect(noPedido(new Request('http://homologa.memorias.bayara.com.br'), () => gravarEspelho(familia() as never))).rejects.toThrow();
    expect(d1.sqlite.prepare('SELECT * FROM relatos').all()).toEqual(antes);
  });

  it('a rota responde erro quando o conserto do espelho falha', async () => {
    marcar();
    const executar = d1.prepare.bind(d1);
    vi.spyOn(d1, 'prepare').mockImplementation((sql) => {
      const c = executar(sql);
      if (sql.startsWith('INSERT INTO relato_mensagens')) { const bind = c.bind.bind(c); vi.spyOn(c, 'bind').mockImplementation((...vs) => { const b = bind(...vs); vi.spyOn(b, 'run').mockRejectedValue(new Error('Falha no conserto.')); return b; }); }
      return c;
    });
    const { POST } = await import('../src/pages/api/espelho');
    const corpo = new FormData(); corpo.set('copia', new File([JSON.stringify(familia())], 'familia.json'));
    const request = new Request('http://homologa.memorias.bayara.com.br/api/espelho', { method: 'POST', body: corpo, headers: { Origin: 'http://homologa.memorias.bayara.com.br' } });
    const r = await noPedido(request, () => POST({ request, locals: { usuario: gui } } as never));
    expect(r.headers.get('location')).toContain('erro=');
    expect(r.headers.get('location')).not.toContain('ok=');
    expect(d1.sqlite.prepare('SELECT 1 FROM ajustes WHERE chave = ?').get(marca)).toBeUndefined();
  });

  it('81 parágrafos: a falha não deixa 80 mensagens e a retomada completa as 81', async () => {
    const texto = Array.from({length:81}, (_,i) => `Parágrafo ${i}.`).join('\n\n');
    const id = novo(texto);
    const executar = d1.prepare.bind(d1);
    const erro = new Error('Falha no segundo lote.');
    // O código antigo falha no segundo lote de 80; o novo falha no único INSERT atômico.
    const lote = d1.batch.bind(d1); let insercoes = 0;
    vi.spyOn(d1, 'batch').mockImplementation(async (cs) => {
      if (cs.some(c => c.sql.startsWith('INSERT INTO relato_mensagens')) && ++insercoes === 2) throw erro;
      return lote(cs);
    });
    vi.spyOn(d1, 'prepare').mockImplementation(sql => {
      const c = executar(sql);
      if (sql.startsWith('INSERT INTO relato_mensagens') && sql.includes('json_each')) { const bind = c.bind.bind(c); vi.spyOn(c, 'bind').mockImplementation((...vs) => { const b=bind(...vs); vi.spyOn(b, 'run').mockRejectedValueOnce(erro); return b; }); }
      return c;
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await consertar(d1 as never, { refazer: true });
    expect(d1.sqlite.prepare('SELECT 1 FROM ajustes WHERE chave = ?').get(marca)).toBeUndefined();
    vi.restoreAllMocks();
    await consertar(d1 as never);
    expect(d1.sqlite.prepare('SELECT COUNT(*) AS n FROM relato_mensagens WHERE relato_id = ?').get(id)).toEqual({n:81});
  });

  it('retoma as 80 mensagens antigas sem trocar os ids já citados', async () => {
    const texto = Array.from({length:81}, (_,i) => `Parágrafo ${i}.`).join('\n\n');
    const id = novo(texto);
    for (let n=0;n<80;n++) d1.sqlite.prepare("INSERT INTO relato_mensagens (relato_id, ordem, tipo, texto) VALUES (?, ?, 'texto', ?)").run(id,n,`Parágrafo ${n}.`);
    const antes = d1.sqlite.prepare('SELECT id FROM relato_mensagens WHERE relato_id = ? ORDER BY ordem').all(id);
    await consertar(d1 as never, { refazer: true });
    expect(d1.sqlite.prepare('SELECT COUNT(*) AS n FROM relato_mensagens WHERE relato_id = ?').get(id)).toEqual({n:81});
    expect(d1.sqlite.prepare('SELECT id FROM relato_mensagens WHERE relato_id = ? ORDER BY ordem LIMIT 80').all(id)).toEqual(antes);
  });

  it('a cópia oficial entre o relato e as mensagens restaura sem atestar o relato incompleto', async () => {
    marcar();
    const { GET } = await import('../src/pages/api/copia');
    const { POST } = await import('../src/pages/api/relatos');
    let copia: Awaited<ReturnType<typeof baixarCopiaEmPartes>> | undefined;
    const lote = d1.batch.bind(d1);
    vi.spyOn(d1, 'batch').mockImplementation(async cs => {
      const resultado = await lote(cs);
      if (cs.some(c => c.sql.includes('INSERT INTO relatos'))) {
        copia = await baixarCopiaEmPartes(async caminho => {
          const url = new URL(caminho, 'http://localhost'); const request = new Request(url);
          const r = await noPedido(request, () => GET({ request, url, locals: { usuario: gui } } as never));
          expect(r.status).toBe(200); return r.json();
        }, undefined, async () => {});
      }
      return resultado;
    });
    // Um POST real sem a lista de mensagens: o arquivo é tirado após o lote do relato e antes do das mensagens.
    d1.sqlite.prepare("DELETE FROM relatos WHERE memoria_id = '1992-chegada-do-gui' AND por = 'gui'").run();
    const request = new Request('http://localhost/api/relatos', { method: 'POST', headers: { Origin: 'http://localhost', 'Content-Type': 'application/json' }, body: JSON.stringify({ memoria: '1992-chegada-do-gui', por: 'gui', texto: 'Entre os dois commits.', situacao: 'rascunho' }) });
    const resposta = await noPedido(request, () => POST({request, locals: {usuario:gui}} as never));
    expect(resposta.status).toBe(201);
    expect(copia).toBeDefined();
    // Restauração num banco vazio, com as tabelas na ordem do arquivo oficial.
    const restaurado = await criarD1();
    const estrutura = d1.sqlite.prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND type = 'table' AND name NOT LIKE 'sqlite_%'").all() as {sql:string}[];
    for (const {sql} of estrutura) if (!/^CREATE TABLE ['"`]?busca_indice_/.test(sql)) restaurado.sqlite.exec(sql);
    restaurado.sqlite.exec('BEGIN; PRAGMA defer_foreign_keys = ON');
    for (const [t, linhas] of Object.entries(copia!.tabelas)) for (const l of linhas) {
      const cs=Object.keys(l); restaurado.sqlite.prepare(`INSERT INTO "${t}" (${cs.map(c=>`"${c}"`).join(',')}) VALUES (${cs.map(()=>'?').join(',')})`).run(...cs.map(c=>l[c] as never));
    }
    restaurado.sqlite.exec('COMMIT');
    expect(restaurado.sqlite.prepare('SELECT 1 FROM ajustes WHERE chave = ?').get(marca)).toBeUndefined();
    // Também aceita uma marca antiga trazida por um arquivo de 40c7e33.
    restaurado.sqlite.prepare('INSERT OR REPLACE INTO ajustes (chave, valor) VALUES (?, ?)').run(marca, '{"relatos":27}');
    await consertar(restaurado as never);
    expect(restaurado.sqlite.prepare("SELECT COUNT(*) AS n FROM relato_mensagens WHERE texto = 'Entre os dois commits.'").get()).toEqual({n:1});
  });
});
