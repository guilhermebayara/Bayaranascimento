// A guarda da produção só deixa apagar arquivo do bucket das fotos na rota das fotos sem memória, e ali só a
// original com as cópias dela (sessão D1c, 23/11/2026: antes, as cópias ficavam no bucket sem uso). Cada
// violação nova é dada à regra (scripts/apagar-no-bucket.mjs) e precisa ser recusada.
import { describe, expect, it } from 'vitest';
import { APAGAR_A_FOTO_SOLTA, ROTA_DAS_FOTOS_SOLTAS, apagamentosProibidos, copiasApagadasErradas } from '../scripts/apagar-no-bucket.mjs';
import { chaveDaCopia, chavesDasCopias, TAMANHOS } from '../src/lib/copias-das-fotos';

const fontes: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>(['../src/pages/api/fotos-soltas.ts', '../src/lib/copias-das-fotos.ts', '../src/lib/servidor/fotos-de-exemplo.ts'], { query: '?raw', import: 'default', eager: true })).map(([k, v]) => [k.replace('../', ''), v]),
);
const rota = fontes[ROTA_DAS_FOTOS_SOLTAS]!;
const copias = fontes['src/lib/copias-das-fotos.ts']!;
const recusa = (arquivo: string, texto: string) => (apagamentosProibidos(arquivo, texto) as string[]).length > 0;

describe('a regra de apagar da guarda', () => {
  it('a rota de hoje e a limpeza do bucket de teste passam', () => {
    expect(apagamentosProibidos(ROTA_DAS_FOTOS_SOLTAS, rota)).toEqual([]);
    expect(rota).toContain(APAGAR_A_FOTO_SOLTA);
    const limpeza = fontes['src/lib/servidor/fotos-de-exemplo.ts']!;
    expect(apagamentosProibidos('src/lib/servidor/fotos-de-exemplo.ts', limpeza)).toEqual([]);
    expect(copiasApagadasErradas(copias)).toEqual([]);
  });

  it('apagar a cópia sozinha, sem a original, é recusado', () => {
    expect(recusa(ROTA_DAS_FOTOS_SOLTAS, rota.replace(APAGAR_A_FOTO_SOLTA, 'await bucketDeFotos().delete(chavesDasCopias(foto.chave));'))).toBe(true);
  });

  it('apagar a original e outra coisa junto é recusado', () => {
    expect(recusa(ROTA_DAS_FOTOS_SOLTAS, rota.replace(APAGAR_A_FOTO_SOLTA, "await bucketDeFotos().delete([foto.chave, ...chavesDasCopias(foto.chave), 'retratos/x.jpg']);"))).toBe(true);
    expect(recusa(ROTA_DAS_FOTOS_SOLTAS, rota.replace(APAGAR_A_FOTO_SOLTA, 'await bucketDeFotos().delete([foto.chave, ...chavesDasCopias(outra)]);'))).toBe(true);
  });

  it('apagar a cópia num segundo pedido é recusado', () => {
    const doisPedidos = rota.replace(APAGAR_A_FOTO_SOLTA, 'await bucketDeFotos().delete(foto.chave);\n  await bucketDeFotos().delete(chavesDasCopias(foto.chave));');
    expect(recusa(ROTA_DAS_FOTOS_SOLTAS, doisPedidos)).toBe(true);
  });

  it('apagar antes de conferir a foto de novo no banco, ou antes da permissão, é recusado', () => {
    const semConferir = rota.replace(APAGAR_A_FOTO_SOLTA, '').replace('  const foto = await obterFotoSolta(', `  ${APAGAR_A_FOTO_SOLTA}\n  const foto = await obterFotoSolta(`);
    expect(recusa(ROTA_DAS_FOTOS_SOLTAS, semConferir)).toBe(true);
    expect(recusa(ROTA_DAS_FOTOS_SOLTAS, rota.replace('const decisao = podeApagarFotoSolta(locals.usuario);', 'const decisao = { ok: true };'))).toBe(true);
  });

  it('chavesDasCopias de outro lugar, que poderia devolver qualquer nome, é recusado', () => {
    expect(recusa(ROTA_DAS_FOTOS_SOLTAS, rota.replace("import { chavesDasCopias } from '../../lib/copias-das-fotos';", "import { chavesDasCopias } from './outro';"))).toBe(true);
  });

  it('o mesmo apagar em outro arquivo é recusado, com a cópia ou sem ela', () => {
    expect(recusa('src/pages/api/fotos.ts', rota)).toBe(true);
    expect(recusa('src/pages/api/copias-das-fotos.ts', 'await bucketDeFotos().delete(chaveDaCopia(chave, "pequena", "webp"));')).toBe(true);
    expect(recusa('src/pages/api/integrantes.ts', 'await bucketDeFotos().delete(`retratos/${chaveDaCopiaDoRetrato(chave, "webp")}`);')).toBe(true);
  });

  it('mudar chavesDasCopias, os tamanhos ou o nome da cópia é recusado', () => {
    const corpo = "return TAMANHOS.flatMap((tamanho) => (['webp', 'jpg'] as const).map((formato) => chaveDaCopia(chave, tamanho, formato)));";
    expect(copiasApagadasErradas(copias.replace(corpo, 'return [chave.replace(/\\.\\w+$/, ""), corpo];'))).not.toEqual([]);
    expect(copiasApagadasErradas(copias.replace(corpo, `return [...TAMANHOS.map((t) => chaveDaCopia(chave, t, 'webp')), '2026/outra.jpg'];`))).not.toEqual([]);
    expect(copiasApagadasErradas(copias.replace("['pequena', 'media'];", "['pequena', 'media', 'grande'];"))).not.toEqual([]);
    expect(copiasApagadasErradas(copias.replace('return `${base}.${tamanho}.${formato}`;', 'return `${base}.${formato}`;'))).not.toEqual([]);
  });

  it('chavesDasCopias devolve só as cópias daquela foto, nunca uma original', () => {
    const chave = '2025/aaaaaaaa-0000-0000-0000-000000000001.jpg';
    const nomes = chavesDasCopias(chave);
    expect(nomes).toHaveLength(TAMANHOS.length * 2);
    for (const nome of nomes) {
      expect(nome.startsWith('2025/aaaaaaaa-0000-0000-0000-000000000001.')).toBe(true);
      expect(nome).not.toMatch(/^\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp)$/);
    }
    expect(nomes).toContain(chaveDaCopia(chave, 'pequena', 'webp'));
    // Uma chave que não é de foto não vira nome de nada
    expect(() => chavesDasCopias('retratos/aaaaaaaa-0000-0000-0000-000000000001.jpg')).toThrow();
    expect(() => chavesDasCopias('')).toThrow();
  });
});
