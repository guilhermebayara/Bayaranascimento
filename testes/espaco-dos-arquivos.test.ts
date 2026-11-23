// Espaço das fotos e áudios na administração (decisão do Gui, 18/11/2026). O plano gratuito do R2 vai até
// 10 GB; o site conta sozinho, pela soma do tamanho que cada arquivo guardou ao entrar (migração 070), e
// avisa a partir de 7 GB, como pendência da administração. Os arquivos de exemplo não contam.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { AVISO_DO_R2, emGigabytes, fraseDoEspaco, LIMITE_DO_R2, notaDosSemMedida, situacaoDoEspaco } from '../src/lib/espaco-dos-arquivos';
import { pendenciasDaAdministracao } from '../src/lib/conta';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe('a conta do espaço', () => {
  it('fala em MB abaixo de 1 GB e em GB acima', () => {
    expect(emGigabytes(350_000_000)).toBe('350 MB');
    expect(emGigabytes(0)).toBe('0 MB');
    expect(emGigabytes(4_200_000)).toBe('4,2 MB');
    expect(emGigabytes(1_230_000_000)).toBe('1,2 GB');
    expect(emGigabytes(LIMITE_DO_R2)).toBe('10 GB');
  });
  it('avisa a partir de 7 GB, de 10 GB', () => {
    expect(AVISO_DO_R2).toBe(7_000_000_000);
    expect(situacaoDoEspaco(6_999_999_999)!.passouDoAviso).toBe(false);
    expect(situacaoDoEspaco(7_000_000_000)!.passouDoAviso).toBe(true);
    expect(fraseDoEspaco(situacaoDoEspaco(1_500_000_000)!)).toBe('1,5 GB de 10 GB');
    expect(situacaoDoEspaco(0)!.porcento).toBe(2);
    expect(situacaoDoEspaco(LIMITE_DO_R2 * 2)!.porcento).toBe(100);
    expect(situacaoDoEspaco(null)).toBeUndefined();
  });
  it('diz quantos arquivos de antes ainda faltam medir', () => {
    expect(notaDosSemMedida(0)).toBeNull();
    expect(notaDosSemMedida(1)).toContain('Falta medir 1 arquivo');
    expect(notaDosSemMedida(12)).toContain('Faltam medir 12 arquivos');
  });
  it('perto do limite vira pendência da administração', () => {
    const base = { carta: { escritaEm: '2026-11-01' }, copiaMensal: { conferida: false, ultima: null } };
    expect(pendenciasDaAdministracao({ ...base, espaco: { bytes: 1, passouDoAviso: false } }, new Date())).toEqual([]);
    const [p] = pendenciasDaAdministracao({ ...base, espaco: { bytes: AVISO_DO_R2, passouDoAviso: true } }, new Date());
    expect(p).toMatchObject({ tipo: 'espaco', texto: 'As fotos e os áudios estão perto do limite do plano gratuito.' });
  });
  it('a Administração mostra a medida ao lado do banco e a foto e o retrato guardam o tamanho ao entrar', () => {
    const pagina = readFileSync('src/pages/admin/index.astro', 'utf-8');
    expect(pagina).toContain('<strong>Fotos e áudios</strong>');
    expect(readFileSync('src/pages/api/fotos.ts', 'utf-8')).toContain('registrarFoto(chave, locals.usuario, dados.byteLength, copias)');
    expect(readFileSync('src/pages/api/integrantes.ts', 'utf-8')).toContain('registrarRetratoEnviado(ficha.retrato, retrato.bytes.byteLength, usuario)');
  });
});

describe.skipIf(!comSqlite)('a soma no banco', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const gui = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };
  const sql = (texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...v);

  it('soma fotos, retratos e áudios, sem os de exemplo, contando os removidos', async () => {
    const antes = await repo.espacoDosArquivos();
    await repo.registrarFoto('2026/a.jpg', gui, 1_000);
    const id = await repo.registrarFoto('2026/b.jpg', gui, 2_000);
    sql(`UPDATE fotos SET removida_em = datetime('now') WHERE id = ?`, id);
    await repo.registrarRetratoEnviado('r1.jpg', 300, gui);
    await repo.registrarAudio({ chave: 'audios/x.m4a', tipo: 'audio/mp4', tamanho: 40, duracao: 1, memoriaId: null }, gui);
    sql(`INSERT INTO fotos (chave, enviada_por, tamanho) VALUES ('exemplos/chico-1.jpg', 'gui', 999999)`);
    const depois = await repo.espacoDosArquivos();
    expect(depois.bytes - antes.bytes).toBe(3_340);
  });

  it('mede aos poucos as fotos e os retratos de antes, só lendo o tamanho', async () => {
    sql(`INSERT INTO fotos (chave, enviada_por) VALUES ('2025/antiga.jpg', 'gui')`);
    sql(`UPDATE integrantes SET retrato = 'antigo.jpg' WHERE id = 'aguilar'`);
    const { semMedida } = await repo.espacoDosArquivos();
    expect(semMedida).toBeGreaterThanOrEqual(2);
    const pedidos: string[] = [];
    await repo.medirArquivosDeAntes(async (chave) => (pedidos.push(chave), chave.endsWith('antiga.jpg') ? 5_000 : 700), 100);
    expect(pedidos).toContain('2025/antiga.jpg');
    expect(pedidos).toContain('retratos/antigo.jpg');
    expect(pedidos.some((c) => c.startsWith('exemplos/') || c.startsWith('retratos/exemplos/'))).toBe(false);
    expect((await repo.espacoDosArquivos()).semMedida).toBe(0);
    // Medido uma vez, não é lido de novo
    pedidos.length = 0;
    await repo.medirArquivosDeAntes(async (chave) => (pedidos.push(chave), 1));
    expect(pedidos).toEqual([]);
  });
});
