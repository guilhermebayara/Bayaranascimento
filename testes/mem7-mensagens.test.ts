// A rodada 2 retirou a otimização dos relatos. O preparo e o espelho preservam a base aprovada.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { criarD1, temSqlite } from './apoio/d1';
import { COLUNAS_PARA_O_ESPELHO, CONTEUDO_PARA_O_ESPELHO } from '../src/lib/copia-para-o-espelho';
import { MARCA_DO_ACERVO } from '../src/lib/copia-em-partes';
const env = vi.hoisted(() => ({ AMBIENTE: 'previa', DB: undefined as unknown, DB_HOMOLOGA: undefined as unknown, FOTOS_HOMOLOGA: undefined as unknown, FOTOS: { list: async () => ({ objects: [], truncated: false }), delete: async () => {}, get: async () => null, head: async () => null } }));
vi.mock('cloudflare:workers', () => ({ env }));

describe.skipIf(!(await temSqlite()))('MEM-7 rodada 2: relatos como em e2b478e', () => {
  it('o preparo deriva as mesmas mensagens e o espelho só troca os relatos, como na base', async () => {
    const caminho = 'src/lib/servidor/mensagens-de-antes.ts';
    // SHA-256 dos bytes de e2b478e, para funcionar também no checkout raso do build.
    const original = readFileSync(caminho);
    expect(createHash('sha256').update(original).digest('hex')).toBe('aee46ac9770aaeb1c441ac667f3a41b52cc91e96c72f0a48c84f0d942805e35f');
    const espelho = 'src/lib/servidor/espelho.ts';
    expect(createHash('sha256').update(readFileSync(espelho)).digest('hex')).toBe('b6ca34d7d21c02969d3f581261dd3cd776e23d957a5555b180442bc68ec86a0e');
    // Executa o conserto de referência contra a mesma fixture, sem duplicar a regra no teste.
    const compilado = await build({ stdin: { contents: original.toString(), loader: 'ts', resolveDir: resolve('src/lib/servidor') }, bundle: true, format: 'esm', platform: 'node', write: false });
    const referencia = await import(/* @vite-ignore */ `data:text/javascript;base64,${Buffer.from(compilado.outputFiles[0].text).toString('base64')}`);
    const d1 = await criarD1(); env.DB = env.DB_HOMOLOGA = d1; env.FOTOS_HOMOLOGA = env.FOTOS;
    let { prepararBanco } = await import('../src/lib/servidor/banco');
    await prepararBanco();
    const memoria = '1992-chegada-do-gui';
    for (const [texto, por] of [['Primeiro parágrafo.\n\nSegundo parágrafo.', 'gui'], ['', 'elizete']] as const) {
      d1.sqlite.prepare(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, criado_em) VALUES (?, ?, 'gui', ?, 'rascunho', '2026-11-20 12:00:00')`).run(memoria, por, texto);
    }
    const ids = (d1.sqlite.prepare('SELECT id FROM relatos ORDER BY id DESC LIMIT 2').all() as {id:number}[]).map(r=>r.id);
    d1.sqlite.prepare(`INSERT INTO audios (relato_id, memoria_id, chave, tipo, tamanho, enviado_por) VALUES (?, ?, 'exemplos/voz.m4a', 'audio/mp4', 10, 'gui')`).run(ids[1], memoria);
    d1.sqlite.prepare(`INSERT INTO fotos (relato_id, memoria_id, chave, enviada_por) VALUES (?, ?, 'exemplos/chico-1.jpg', 'gui')`).run(ids[1], memoria);
    const linhas = () => d1.sqlite.prepare('SELECT * FROM relato_mensagens ORDER BY id').all();
    const esperado = async () => {
      d1.sqlite.exec('SAVEPOINT referencia');
      await referencia.darMensagensAosRelatosDeAntes(d1);
      const resultado = linhas();
      d1.sqlite.exec('ROLLBACK TO referencia; RELEASE referencia');
      return resultado;
    };
    const antesDoPreparo = await esperado();
    // Um módulo novo representa o próximo processo; o módulo atual já preparou este banco.
    vi.resetModules();
    ({ prepararBanco } = await import('../src/lib/servidor/banco'));
    await prepararBanco();
    expect(linhas()).toEqual(antesDoPreparo);
    expect(d1.sqlite.prepare('SELECT tipo FROM relato_mensagens WHERE relato_id = ? ORDER BY ordem').all(ids[1])).toEqual([{tipo:'audio'},{tipo:'texto'},{tipo:'texto'},{tipo:'foto'}]);

    const copia = { acervo: MARCA_DO_ACERVO, conteudo: CONTEUDO_PARA_O_ESPELHO, gerada_em: '2026-11-26', tabelas: Object.fromEntries(Object.entries(COLUNAS_PARA_O_ESPELHO).map(([t, cs]) => [t, d1.sqlite.prepare(`SELECT ${cs.join(',')} FROM ${t}`).all()])) };
    const { gravarEspelho } = await import('../src/lib/servidor/espelho');
    const { noPedido } = await import('../src/lib/servidor/ambiente');
    const request = new Request('http://homologa.memorias.bayara.com.br/');
    await noPedido(request, () => gravarEspelho(copia as never));
    expect((d1.sqlite.prepare('SELECT COUNT(*) AS n FROM relatos').get() as {n:number}).n).toBeGreaterThan(0);
    // A base não derivava mensagens durante a importação: isso fica para o próximo preparo.
    expect(linhas()).toEqual([]);
    const depoisDoEspelho = await esperado();
    vi.resetModules();
    const proximo = await import('../src/lib/servidor/banco');
    const ambienteDoProximo = await import('../src/lib/servidor/ambiente');
    await ambienteDoProximo.noPedido(request, () => proximo.prepararBanco());
    expect(linhas()).toEqual(depoisDoEspelho);
  });
});
