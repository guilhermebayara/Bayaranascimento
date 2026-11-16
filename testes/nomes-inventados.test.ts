import { describe, expect, it } from 'vitest';
import { NOMES_INVENTADOS, comNomesInventados } from '../src/lib/servidor/semente';
import semente from '../src/lib/servidor/semente.ts?raw';
import previa from './dados/arvore-previa.json';

describe('nomes inventados no banco de teste', () => {
  it('troca só palavras inteiras e mantém a primeira letra', () => {
    expect(comNomesInventados('O Gui e a Giovanna na casa da Vó Bela')).toBe('O Gustavo e a Glória na casa da Vó Benta');
    expect(comNomesInventados('Guia de viagem do Lucas Magno')).toBe('Guia de viagem do Lauro Mateus');
    for (const [real, inventado] of NOMES_INVENTADOS) expect(inventado[0]).toBe(real[0]);
  });

  it('não muda nada na segunda vez', () => {
    const uma = comNomesInventados('Gui, Elizete, Chico e Dona Déia');
    expect(comNomesInventados(uma)).toBe(uma);
  });

  it('os exemplos e a cópia da prévia não guardam nomes reais', () => {
    const exemplos = semente.slice(0, semente.indexOf('// --- Nomes inventados no lugar dos nomes reais ---'));
    const textos = [...exemplos.matchAll(/'(?:[^'\\\n]|\\.)*'/g)].map((m) => m[0]).join('\n');
    const nomes = previa.pessoas.map((p) => `${p.nome} ${p.rotulo}`).join('\n');
    for (const texto of [textos, nomes]) expect(comNomesInventados(texto)).toBe(texto);
  });
});
