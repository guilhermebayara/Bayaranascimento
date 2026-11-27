import { describe, expect, it, vi } from 'vitest';
import { COLUNAS_PARA_O_ESPELHO, CONTEUDO_PARA_O_ESPELHO } from '../src/lib/copia-para-o-espelho';
import { MARCA_DO_ACERVO } from '../src/lib/copia-em-partes';
import { mensagensDerivadas } from '../src/lib/conversa';
import { abrirBancoDeExemplo } from './apoio/banco-de-exemplo';
import { temSqlite } from './apoio/d1';

const env = vi.hoisted(() => ({
  AMBIENTE: 'previa', DB: undefined as unknown, FOTOS: undefined as unknown,
  DB_HOMOLOGA: undefined as unknown, FOTOS_HOMOLOGA: undefined as unknown,
}));
vi.mock('cloudflare:workers', () => ({ env }));

describe.skipIf(!(await temSqlite()))('Mensagens na origem e na leitura', async () => {
  const { banco, sql, linha } = await abrirBancoDeExemplo(env);
  const linhas = <T>(consulta: string) => banco.sqlite.prepare(consulta).all() as T[];

  it('semeia a conversa com a hora de cada relato e não duplica no processo seguinte', async () => {
    const mensagens = () => linhas<{ relato_id: number; enviada_em: string; criado_em: string }>(`SELECT m.*, r.criado_em
      FROM relato_mensagens m JOIN relatos r ON r.id = m.relato_id ORDER BY m.id`);
    const antes = mensagens();
    expect(antes.length).toBeGreaterThan(53);
    expect(antes.every((m) => m.enviada_em === m.criado_em)).toBe(true);
    expect(linhas(`SELECT m.tipo FROM relato_mensagens m JOIN relatos r ON r.id = m.relato_id
      WHERE r.memoria_id = '1992-chegada-do-gui' AND r.por = 'vo-bela' ORDER BY m.ordem`)).toEqual([{ tipo: 'audio' }, { tipo: 'texto' }]);
    expect(linhas(`SELECT id FROM relatos r WHERE NOT EXISTS (SELECT 1 FROM relato_mensagens m WHERE m.relato_id = r.id)`)).toEqual([]);
    vi.resetModules();
    const { prepararBanco } = await import('../src/lib/servidor/banco');
    await prepararBanco();
    expect(mensagens()).toEqual(antes);
  });

  it('uma cópia antiga sem mensagens continua legível sem gravação no começo', async () => {
    const id = Number(sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao)
      VALUES ('1992-chegada-do-gui', 'gui', 'gui', 'Relato sem mensagens.\\n\\nMais um parágrafo.', 'rascunho')`).lastInsertRowid);
    // A fixture representa o conteúdo restaurado. A produção simulada roda o preparo sem as sementes.
    env.AMBIENTE = 'producao';
    vi.stubEnv('DEV', false);
    const consultas = vi.spyOn(banco, 'prepare');
    try {
      vi.resetModules();
      const { noPedido, medidaDoPedido } = await import('../src/lib/servidor/ambiente');
      const { prepararBanco } = await import('../src/lib/servidor/banco');
      const { listarMensagensDosRelatos } = await import('../src/lib/servidor/repositorio');
      const preparar = () => noPedido(new Request('http://localhost/'), async () => {
        await prepararBanco();
        return medidaDoPedido();
      });
      expect((await preparar())?.idas).toBe(1);
      expect(consultas.mock.calls.some(([sql]) => /\b(?:FROM|JOIN)\s+(?:relatos|relato_mensagens)\b/i.test(sql))).toBe(false);
      expect(linha('SELECT COUNT(*) AS n FROM relato_mensagens WHERE relato_id = ?', id)).toEqual({ n: 0 });
      const texto = linha<{ texto: string }>('SELECT texto FROM relatos WHERE id = ?', id).texto;
      const lidas = await listarMensagensDosRelatos([{ id, texto }]);
      expect(lidas.get(id)).toEqual(mensagensDerivadas(texto, [], []));
      expect(linha('SELECT COUNT(*) AS n FROM relato_mensagens WHERE relato_id = ?', id)).toEqual({ n: 0 });
    } finally {
      env.AMBIENTE = 'previa';
      consultas.mockRestore();
      vi.unstubAllEnvs();
    }
  });

  it('a importação grava as mensagens derivadas e repetir o arquivo conserva todas as linhas', async () => {
    const copia = {
      acervo: MARCA_DO_ACERVO, conteudo: CONTEUDO_PARA_O_ESPELHO, gerada_em: '2026-11-27T10:00:00Z',
      tabelas: Object.fromEntries(Object.entries(COLUNAS_PARA_O_ESPELHO).map(([t, cs]) => [t, linhas(`SELECT ${cs.join(',')} FROM ${t}`)])),
    };
    env.DB_HOMOLOGA = banco;
    env.FOTOS_HOMOLOGA = env.FOTOS;
    const { gravarEspelho } = await import('../src/lib/servidor/espelho');
    const { noPedido } = await import('../src/lib/servidor/ambiente');
    const importar = () => noPedido(new Request('http://homologa.memorias.bayara.com.br/'), () => gravarEspelho(copia));
    const resumo = await importar();
    const relatos = linhas<{ id: number; texto: string; criado_em: string }>('SELECT id, texto, criado_em FROM relatos');
    expect(relatos.length).toBeGreaterThan(0);
    const mensagens = banco.sqlite.prepare(`SELECT tipo, texto, audio_id, foto_id, enviada_em FROM relato_mensagens WHERE relato_id = ? ORDER BY ordem`);
    for (const r of relatos) {
      expect(mensagens.all(r.id)).toEqual(mensagensDerivadas(r.texto, [], []).map((m) => ({
        tipo: m.tipo, texto: m.texto, audio_id: null, foto_id: null, enviada_em: r.criado_em,
      })));
    }

    const estado = () => linhas<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .map(({ name }) => [name, linhas(`SELECT * FROM "${name}"`)]);
    const primeira = estado();
    vi.resetModules();
    const outro = await import('../src/lib/servidor/espelho');
    const outroPedido = (await import('../src/lib/servidor/ambiente')).noPedido;
    expect(await outroPedido(new Request('http://homologa.memorias.bayara.com.br/'), () => outro.gravarEspelho(copia))).toEqual(resumo);
    expect(estado()).toEqual(primeira);
  });
});
