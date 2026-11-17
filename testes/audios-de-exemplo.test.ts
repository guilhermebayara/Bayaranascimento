// Áudios de exemplo (decisão do Gui, 17/11/2026, P102): voz sintetizada nos relatos da Vó Bela e da Vó
// Vivica, com as mesmas regras das fotos de exemplo. Os arquivos, a semente no banco de teste, quem ouve
// e que nada disso chega à produção nem à homologação.
import { describe, expect, it, vi } from 'vitest';
import { AUDIOS_DE_EXEMPLO, chaveDeAudioDeExemplo, ehChaveDeAudioDeExemplo } from '../src/lib/audios-de-exemplo';
import { formatoDoAudio } from '../src/lib/audios';
import { temSqlite } from './apoio/d1';

const fontes: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>(['../src/**/*.{astro,ts}', '../scripts/*.mjs'], { query: '?raw', import: 'default', eager: true })).map(([k, v]) => [k.replace('../', ''), v]),
);
// O nome do módulo fica numa variável porque o projeto não tem os tipos do Node
const fs = 'node:fs';
const cripto = 'node:crypto';
const { readFileSync, readdirSync } = (await import(/* @vite-ignore */ fs)) as {
  readFileSync: (caminho: URL) => Uint8Array;
  readdirSync: (caminho: URL) => string[];
};
const { createHash } = (await import(/* @vite-ignore */ cripto)) as { createHash: (a: string) => { update: (b: Uint8Array) => { digest: (f: string) => string } } };

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown, DB_HOMOLOGA: undefined as unknown, FOTOS_HOMOLOGA: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
const bucketVazio = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };
env.FOTOS = bucketVazio;

describe('os arquivos', () => {
  const pasta = new URL('../exemplos/audios/', import.meta.url);

  it('são os de exemplos/audios/, com o SHA-256 e o tamanho conferidos, em M4A', () => {
    expect(readdirSync(pasta).sort()).toEqual(AUDIOS_DE_EXEMPLO.map((a) => a.nome).sort());
    for (const a of AUDIOS_DE_EXEMPLO) {
      const bytes = readFileSync(new URL(a.nome, pasta));
      expect(createHash('sha256').update(bytes).digest('hex'), a.nome).toBe(a.sha256);
      expect(bytes.length, a.nome).toBe(a.tamanho);
      expect(formatoDoAudio(bytes)?.extensao, a.nome).toBe('m4a');
    }
  });

  it('são curtos e se anunciam como voz sintetizada', () => {
    expect(AUDIOS_DE_EXEMPLO.length).toBeGreaterThanOrEqual(2);
    expect(AUDIOS_DE_EXEMPLO.length).toBeLessThanOrEqual(3);
    for (const a of AUDIOS_DE_EXEMPLO) {
      expect(a.duracao).toBeLessThan(30);
      expect(a.transcricao.startsWith('Áudio de exemplo, com voz sintetizada.')).toBe(true);
    }
  });

  it('dois ou mais são da Vó Bela, e um de outra pessoa', () => {
    expect(AUDIOS_DE_EXEMPLO.filter((a) => a.por === 'vo-bela').length).toBeGreaterThanOrEqual(2);
    expect(AUDIOS_DE_EXEMPLO.some((a) => a.por !== 'vo-bela')).toBe(true);
  });

  it('só as chaves deles passam como exemplo', () => {
    for (const a of AUDIOS_DE_EXEMPLO) expect(ehChaveDeAudioDeExemplo(chaveDeAudioDeExemplo(a.nome))).toBe(true);
    expect(ehChaveDeAudioDeExemplo('exemplos/outro.m4a')).toBe(false);
    expect(ehChaveDeAudioDeExemplo('exemplos/../2026/x.m4a')).toBe(false);
    expect(ehChaveDeAudioDeExemplo('vo-bela-canja.m4a')).toBe(false);
  });
});

describe('as regras das fotos de exemplo', () => {
  it('a rota /audios/ só serve a chave de um exemplo onde há acervo de exemplo', () => {
    const rota = fontes['src/pages/audios/[...chave].ts'];
    expect(rota).toContain('const deExemplo = temAcervoDeExemplo() && ehChaveDeAudioDeExemplo(chave);');
    expect(rota).toContain('if (!CHAVE_DE_AUDIO.test(chave) && !deExemplo) return naoEncontrado();');
    // E continua conferindo quem pode ouvir, como para qualquer áudio
    expect(rota.indexOf('podeOuvirAudio(')).toBeGreaterThan(rota.indexOf('const deExemplo'));
  });

  it('o envio só aceita os arquivos de exemplos/audios/, pelo SHA-256, e só nas prévias de teste', () => {
    const rota = fontes['src/pages/api/fotos-de-exemplo.ts'];
    expect(rota).toContain("if (!soNoTeste()) return erro(404, 'Não encontrado.');");
    expect(rota).toMatch(/hex\(await crypto\.subtle\.digest\('SHA-256', bytes\)\) !== esperado\.sha256/);
    expect(fontes['scripts/enviar-fotos-de-exemplo.mjs']).toContain("readdirSync('exemplos/audios')");
  });

  it('a semente fica dentro da proteção da produção e confere o ambiente de novo', () => {
    const banco = fontes['src/lib/servidor/banco.ts'];
    const protecao = banco.indexOf('if (AMBIENTES_COM_EXEMPLOS.includes(ambiente())) {');
    expect(banco.indexOf('await semearAudiosDeExemplo(db);')).toBeGreaterThan(protecao);
    const semente = fontes['src/lib/servidor/semente.ts'];
    const corpo = semente.slice(semente.indexOf('export async function semearAudiosDeExemplo'));
    expect(corpo).toMatch(/^export async function semearAudiosDeExemplo\(db: D1Database\): Promise<void> \{\n {2}if \(!AMBIENTES_COM_EXEMPLOS\.includes\(ambiente\(\)\) \|\| ehHomologacao\(\)\) return;/);
  });

  it('o espelho da homologação não leva nenhum', () => {
    expect(fontes['src/lib/espelho.ts']).not.toMatch(/audios-de-exemplo|AUDIOS_DE_EXEMPLO/);
  });
});

describe.skipIf(!(await temSqlite()))('no banco de teste', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  const { semearAudiosDeExemplo } = await import('../src/lib/servidor/semente');
  const repo = await import('../src/lib/servidor/repositorio');
  const { noPedido } = await import('../src/lib/servidor/ambiente');
  await prepararBanco();
  const usuarioDe = (pessoa: string) => {
    const i = banco.sqlite.prepare('SELECT nome, admin FROM integrantes WHERE id = ?').get(pessoa) as { nome: string; admin: number };
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const exemplos = () => banco.sqlite.prepare(`SELECT chave, memoria_id, relato_id FROM audios WHERE chave LIKE 'exemplos/%' ORDER BY chave`).all() as { chave: string; memoria_id: string; relato_id: number }[];

  it('cada áudio entra no relato publicado de quem conta', () => {
    const linhas = exemplos();
    expect(linhas.map((l) => l.chave)).toEqual(AUDIOS_DE_EXEMPLO.map((a) => chaveDeAudioDeExemplo(a.nome)).sort());
    for (const a of AUDIOS_DE_EXEMPLO) {
      const linha = linhas.find((l) => l.chave === chaveDeAudioDeExemplo(a.nome))!;
      const relato = banco.sqlite.prepare('SELECT por, situacao FROM relatos WHERE id = ?').get(linha.relato_id) as { por: string; situacao: string };
      expect([linha.memoria_id, relato.por, relato.situacao]).toEqual([a.memoria, a.por, 'publicada']);
    }
  });

  it('"A voz de Vó Bela" tem o que mostrar, e quem vê a memória ouve', async () => {
    const gui = usuarioDe('gui');
    expect((await repo.listarAudiosDe(gui, 'vo-bela')).length).toBe(AUDIOS_DE_EXEMPLO.filter((a) => a.por === 'vo-bela').length);
    for (const a of AUDIOS_DE_EXEMPLO) expect(await repo.podeOuvirAudio(gui, chaveDeAudioDeExemplo(a.nome)), a.nome).toBe(true);
  });

  it('entram uma vez só: quem remove um ao testar não o vê voltar', async () => {
    banco.sqlite.exec('SAVEPOINT antes');
    try {
      banco.sqlite.prepare(`UPDATE audios SET removido_em = datetime('now') WHERE chave = ?`).run(chaveDeAudioDeExemplo(AUDIOS_DE_EXEMPLO[0]!.nome));
      await prepararBanco();
      expect(exemplos().length).toBe(AUDIOS_DE_EXEMPLO.length);
      expect((banco.sqlite.prepare(`SELECT COUNT(*) AS n FROM audios WHERE chave LIKE 'exemplos/%' AND removido_em IS NULL`).get() as { n: number }).n).toBe(AUDIOS_DE_EXEMPLO.length - 1);
    } finally {
      banco.sqlite.exec('ROLLBACK TO antes');
      banco.sqlite.exec('RELEASE antes');
    }
  });

  it('na homologação, a semente não grava nada', async () => {
    banco.sqlite.exec('SAVEPOINT antes');
    env.DB_HOMOLOGA = banco;
    env.FOTOS_HOMOLOGA = bucketVazio;
    try {
      banco.sqlite.exec(`DELETE FROM audios WHERE chave LIKE 'exemplos/%'`);
      await noPedido(new Request('https://homologa.memorias.bayara.com.br/'), () => semearAudiosDeExemplo(banco as unknown as D1Database));
      expect(exemplos()).toEqual([]);
    } finally {
      env.DB_HOMOLOGA = undefined;
      env.FOTOS_HOMOLOGA = undefined;
      banco.sqlite.exec('ROLLBACK TO antes');
      banco.sqlite.exec('RELEASE antes');
    }
  });
});
