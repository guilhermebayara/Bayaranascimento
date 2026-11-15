import { describe, expect, it } from 'vitest';
import { linhaDireta, ramosRecolhidos } from '../src/lib/linha-direta';

const de = (filho: string, ...pais: string[]) => pais.map((responsavel) => ({ filho, responsavel, consideracao: false }));

// Um pedaço da família de teste
const pessoas = [
  'vo-vivica', 'vo-tonho', 'vo-bela', 'regina', 'vo-zeca',
  'elizete', 'aguilar', 'tia-lourdes', 'tio-jorge', 'tio-paulo', 'tia-cida', 'ana-candida', 'lucio',
  'gui', 'giovanna', 'mel', 'magno', 'luisa', 'bruno', 'prima-carol', 'primo-rafa', 'prima-julia',
  'chico', 'dudu', 'lia', 'davi', 'otto',
];
const filiacoes = [
  ...de('elizete', 'vo-vivica', 'vo-tonho'),
  ...de('tia-lourdes', 'vo-vivica', 'vo-tonho'),
  ...de('aguilar', 'vo-bela'),
  ...de('tio-paulo', 'vo-bela'),
  ...de('ana-candida', 'regina', 'vo-zeca'),
  ...de('gui', 'elizete', 'aguilar'),
  ...de('giovanna', 'elizete', 'aguilar'),
  ...de('mel', 'elizete'),
  ...de('magno', 'ana-candida', 'lucio'),
  ...de('luisa', 'ana-candida', 'lucio'),
  ...de('prima-carol', 'tia-lourdes', 'tio-jorge'),
  ...de('primo-rafa', 'tia-lourdes', 'tio-jorge'),
  ...de('prima-julia', 'tio-paulo', 'tia-cida'),
  ...de('chico', 'giovanna', 'magno'),
  ...de('dudu', 'luisa', 'bruno'),
  ...de('lia', 'prima-carol', 'davi'),
  { filho: 'chico', responsavel: 'gui', consideracao: true },
];
const casais = [
  { a: 'vo-vivica', b: 'vo-tonho' },
  { a: 'regina', b: 'vo-zeca' },
  { a: 'elizete', b: 'aguilar' },
  { a: 'tia-lourdes', b: 'tio-jorge' },
  { a: 'tio-paulo', b: 'tia-cida' },
  { a: 'ana-candida', b: 'lucio' },
  { a: 'giovanna', b: 'magno' },
  { a: 'luisa', b: 'bruno' },
  { a: 'prima-carol', b: 'davi' },
];

describe('linha direta', () => {
  const linha = linhaDireta(['gui', 'giovanna', 'magno'], pessoas, filiacoes, casais);

  it('tem os centros, os ancestrais, os irmãos, os descendentes e os casais', () => {
    for (const id of ['gui', 'giovanna', 'magno', 'elizete', 'aguilar', 'vo-vivica', 'vo-tonho', 'vo-bela', 'ana-candida', 'lucio', 'regina', 'vo-zeca', 'mel', 'luisa', 'bruno', 'chico']) {
      expect(linha.has(id), id).toBe(true);
    }
  });
  it('deixa de fora tios, primos e sobrinhos', () => {
    for (const id of ['tia-lourdes', 'tio-jorge', 'tio-paulo', 'tia-cida', 'prima-carol', 'primo-rafa', 'prima-julia', 'dudu', 'lia', 'davi']) {
      expect(linha.has(id), id).toBe(false);
    }
  });
  it('troca de centro e a linha muda junto', () => {
    const daLourdes = linhaDireta(['tia-lourdes'], pessoas, filiacoes, casais);
    expect(daLourdes.has('prima-carol')).toBe(true);
    expect(daLourdes.has('elizete')).toBe(true);
    expect(daLourdes.has('gui')).toBe(false);
  });
});

describe('ramos recolhidos', () => {
  const linha = linhaDireta(['gui', 'giovanna', 'magno'], pessoas, filiacoes, casais);
  const ramos = ramosRecolhidos(linha, pessoas, filiacoes, casais);
  const ramo = (chave: string) => ramos.find((r) => r.chave === chave);

  it('cada ramo nasce dos pais que estão na árvore', () => {
    expect(ramo('vo-tonho+vo-vivica')?.filhos).toEqual(['tia-lourdes']);
    expect(ramo('vo-bela')?.filhos).toEqual(['tio-paulo']);
    expect(ramo('bruno+luisa')?.filhos).toEqual(['dudu']);
  });
  it('o ramo traz quem casou com os filhos e os descendentes', () => {
    expect(ramo('vo-tonho+vo-vivica')?.membros.sort()).toEqual(['davi', 'lia', 'prima-carol', 'primo-rafa', 'tia-lourdes', 'tio-jorge']);
    expect(ramo('vo-bela')?.membros.sort()).toEqual(['prima-julia', 'tia-cida', 'tio-paulo']);
  });
  it('quem está na linha direta não entra em ramo nenhum', () => {
    for (const r of ramos) for (const m of r.membros) expect(linha.has(m), m).toBe(false);
  });
});
