// Fotos de exemplo: o Chico e a Karol (decisão do Gui, 16/11/2026). O sorteio fixo, as 11 fotos, a
// limpeza do bucket de teste e que nada disso roda na produção ou na homologação.
import { describe, expect, it } from 'vitest';
import {
  DIAS_ATE_A_LIMPEZA,
  FOTOS_DE_EXEMPLO,
  ehChaveDeExemplo,
  fotoDeMemoriaDeExemplo,
  paraLimpar,
  quantasFotosNoEspelho,
  retratoDeExemplo,
} from '../src/lib/fotos-de-exemplo';

const fontes: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../src/**/*.{astro,ts}', { query: '?raw', import: 'default', eager: true })).map(([k, v]) => [k.replace('../', ''), v]),
);
// O nome do módulo fica numa variável porque o projeto não tem os tipos do Node
const fs = 'node:fs';
const cripto = 'node:crypto';
const { readFileSync, readdirSync } = (await import(/* @vite-ignore */ fs)) as {
  readFileSync: (caminho: URL) => Uint8Array;
  readdirSync: (caminho: URL) => string[];
};
const { createHash } = (await import(/* @vite-ignore */ cripto)) as { createHash: (a: string) => { update: (b: Uint8Array) => { digest: (f: string) => string } } };

const DIA = 24 * 60 * 60 * 1000;
const agora = new Date('2026-11-16T12:00:00Z');
const ha = (dias: number) => new Date(agora.getTime() - dias * DIA);

describe('as 11 fotos', () => {
  it('são as de exemplos/fotos/, com o SHA-256 conferido', () => {
    const pasta = new URL('../exemplos/fotos/', import.meta.url);
    const arquivos = readdirSync(pasta).filter((n) => n.endsWith('.jpg')).sort();
    expect(arquivos).toEqual(FOTOS_DE_EXEMPLO.map((f) => f.nome).sort());
    for (const f of FOTOS_DE_EXEMPLO) expect(createHash('sha256').update(readFileSync(new URL(f.nome, pasta))).digest('hex'), f.nome).toBe(f.sha256);
  });

  it('só as 11 chaves passam como exemplo', () => {
    expect(ehChaveDeExemplo('exemplos/chico-1.jpg')).toBe(true);
    expect(ehChaveDeExemplo('exemplos/karol-6.jpg')).toBe(true);
    expect(ehChaveDeExemplo('exemplos/karol-7.jpg')).toBe(false);
    expect(ehChaveDeExemplo('exemplos/../2026/x.jpg')).toBe(false);
    expect(ehChaveDeExemplo('chico-1.jpg')).toBe(false);
  });
});

describe('sorteio fixo', () => {
  it('a mesma pessoa e a mesma memória sempre mostram a mesma foto', () => {
    expect(retratoDeExemplo('vo-bela', 'ela')).toBe(retratoDeExemplo('vo-bela', 'ela'));
    expect(fotoDeMemoriaDeExemplo('2026-pao-de-queijo', 0)).toBe(fotoDeMemoriaDeExemplo('2026-pao-de-queijo', 0));
    expect(quantasFotosNoEspelho('m-1')).toBe(quantasFotosNoEspelho('m-1'));
  });

  it('"ela" ganha a Karol, "ele" o Chico, bichos e "Não informar" um dos dois', () => {
    const ids = Array.from({ length: 60 }, (_, i) => `pessoa-${i}`);
    for (const id of ids) {
      expect(retratoDeExemplo(id, 'ela')).toMatch(/^exemplos\/karol-[1-6]\.jpg$/);
      expect(retratoDeExemplo(id, 'ele')).toMatch(/^exemplos\/chico-[1-5]\.jpg$/);
    }
    const livres = new Set(ids.flatMap((id) => [retratoDeExemplo(id, null), retratoDeExemplo(id, 'ela', true)]).map((c) => c.replace(/-\d\.jpg$/, '')));
    expect(livres).toEqual(new Set(['exemplos/chico', 'exemplos/karol']));
  });

  it('as fotos das memórias se espalham pelas 11', () => {
    const usadas = new Set(Array.from({ length: 200 }, (_, i) => fotoDeMemoriaDeExemplo(`memoria-${i}`, i % 3)));
    expect(usadas.size).toBe(11);
    for (const chave of usadas) expect(ehChaveDeExemplo(chave)).toBe(true);
  });
});

describe('limpeza do bucket de teste', () => {
  const objetos = [
    { key: 'exemplos/chico-1.jpg', uploaded: ha(400) },
    { key: 'audios/0f3c2a1e-1234-4abc-8def-0123456789ab.m4a', uploaded: ha(30) },
    { key: '2026/0f3c2a1e-1234-4abc-8def-0123456789ab.jpg', uploaded: ha(8) },
    { key: '2026/aaaaaaaa-1234-4abc-8def-0123456789ab.jpg', uploaded: ha(6) },
    { key: 'retratos/bbbbbbbb-1234-4abc-8def-0123456789ab.jpg', uploaded: ha(DIAS_ATE_A_LIMPEZA + 1) },
    { key: 'retratos/cccccccc-1234-4abc-8def-0123456789ab.jpg', uploaded: ha(1) },
    { key: 'qualquer-outra-coisa.txt', uploaded: ha(90) },
  ];

  it('apaga fotos e retratos enviados há mais de 7 dias, e só eles', () => {
    expect(paraLimpar(objetos, agora)).toEqual(['2026/0f3c2a1e-1234-4abc-8def-0123456789ab.jpg', 'retratos/bbbbbbbb-1234-4abc-8def-0123456789ab.jpg']);
  });

  it('nunca apaga nada de exemplos/ nem os áudios, por mais antigos que sejam', () => {
    const tudoVelho = objetos.map((o) => ({ ...o, uploaded: ha(9999) }));
    const apagar = paraLimpar(tudoVelho, agora);
    expect(apagar.some((k) => k.startsWith('exemplos/'))).toBe(false);
    expect(apagar.some((k) => k.startsWith('audios/'))).toBe(false);
  });

  it('o registro apagado passa a apontar para uma foto de exemplo, pelo mesmo sorteio', () => {
    const limpeza = fontes['src/lib/servidor/fotos-de-exemplo.ts'];
    expect(limpeza).toContain("db.prepare('UPDATE fotos SET chave = ? WHERE id = ?').bind(fotoDeMemoriaDeExemplo(f.memoria_id ?? String(f.id), f.ordem), f.id)");
    expect(limpeza).toContain("db.prepare('UPDATE integrantes SET retrato = ? WHERE id = ?').bind(retratoDeExemplo(p.id, p.tratamento, p.tipo === 'bicho'), p.id)");
  });

  it('roda no máximo uma vez por dia, e nunca na produção nem na homologação', () => {
    const limpeza = fontes['src/lib/servidor/fotos-de-exemplo.ts'];
    expect(limpeza).toContain('const soNoTeste = () => AMBIENTES_COM_EXEMPLOS.includes(ambiente()) && !ehHomologacao();');
    const corpo = limpeza.slice(limpeza.indexOf('export async function limparBucketDeTeste'));
    expect(corpo.indexOf('if (!soNoTeste()) return;')).toBeLessThan(corpo.indexOf('bucketDeTesteParaGravar()'));
    expect(corpo).toContain("INSERT OR IGNORE INTO limpezas_do_teste (dia) VALUES (?)");
    expect(corpo).toContain('if (!marca.meta.changes) return;');
    // E a chamada fica dentro da proteção das memórias de exemplo
    const banco = fontes['src/lib/servidor/banco.ts'];
    const protecao = banco.indexOf('if (AMBIENTES_COM_EXEMPLOS.includes(ambiente())) {');
    expect(banco.indexOf('await limparBucketDeTeste(db);')).toBeGreaterThan(protecao);
    expect(banco.indexOf('await semearFotosDeExemplo(db);')).toBeGreaterThan(protecao);
  });

  it('gravar no bucket de teste recusa a produção e a homologação', () => {
    const ambiente = fontes['src/lib/servidor/ambiente.ts'];
    expect(ambiente).toContain("return ambiente() === 'producao' ? null : env.FOTOS;");
    expect(ambiente).toContain('if (!AMBIENTES_COM_EXEMPLOS.includes(ambiente()) || ehHomologacao()) throw');
  });
});

describe('leitura das fotos de exemplo', () => {
  it('as rotas de fotos e de retratos leem as 11 do bucket de teste, só para ler', () => {
    for (const rota of ['src/pages/fotos/[...chave].ts', 'src/pages/retratos/[...chave].ts']) {
      expect(fontes[rota]).toContain('const exemplo = ehChaveDeExemplo(chave);');
      // A rota das fotos lê também as cópias de exemplo (sessão D1b), pela mesma leitura
      expect(fontes[rota]).toMatch(/bucketDosExemplos\(\)\?\.get\((chave|k), \{ onlyIf: request\.headers \}\)/);
    }
  });

  it('o envio só aceita os 11 arquivos, conferidos pelo SHA-256, e só nas prévias de teste', () => {
    const rota = fontes['src/pages/api/fotos-de-exemplo.ts'];
    expect(rota).toContain("if (!soNoTeste()) return erro(404, 'Não encontrado.');");
    expect(rota).toMatch(/hex\(await crypto\.subtle\.digest\('SHA-256', bytes\)\) !== esperada\.sha256/);
    expect(rota).toContain('bucketDeTesteParaGravar().put(chaveDeExemplo(esperada.nome)');
  });
});
