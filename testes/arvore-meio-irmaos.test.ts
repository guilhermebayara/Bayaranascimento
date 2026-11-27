// O pai ou a mãe dos meio-irmãos fica do lado deles (defeito do QA de 18/11/2026, corrigido por ordem do
// Gui): partindo da Giovanna, a Mel e o Totó, bichinhos só da Elizete, ficavam à esquerda, com a Elizete à
// direita do Aguilar, e a linha dela passava por baixo do Aguilar e cruzava a do casal. Conferido com os
// dados da prévia, de cada ponto de partida e com cada combinação de laços do coração abertos.
import { describe, expect, it } from 'vitest';
import { montarDesenho, type DadosDaArvore } from '../src/lib/arvore-montagem';
import previa from './dados/arvore-previa.json';

const dados = previa as DadosDaArvore;
const DONOS = ['gui', 'giovanna', 'lucas-magno', 'elizete'];
const CENTROS = ['', 'gui', 'giovanna', 'lucas-magno', 'elizete'];
const subconjuntos = Array.from({ length: 1 << DONOS.length }, (_, m) => DONOS.filter((_, i) => m & (1 << i)));

function arranjo(centro: string, abertos: string[], bichos = true) {
  const { desenho } = montarDesenho(dados, {
    foco: 'gui', centro, ramos: new Set(), nucleo: '', consideracao: true, ex: true, bichos, outros: true, amigos: true, abertos: new Set(abertos),
  });
  return new Map(desenho.pessoas.map((p) => [p.id, p.x]));
}

describe('o pai ou a mãe dos meio-irmãos fica do lado deles', () => {
  it('partindo da Giovanna, a Elizete fica à esquerda do Aguilar, do lado da Mel e do Totó', () => {
    const x = arranjo('giovanna', ['giovanna']);
    expect(x.get('elizete')!).toBeLessThan(x.get('aguilar')!);
    expect(x.get('ex-mel')!).toBeLessThan(x.get('elizete')!);
    expect(x.get('ex-toto')!).toBeLessThan(x.get('elizete')!);
  });
  it.each(CENTROS.map((centro) => [centro || 'padrão', centro] as const))('partindo de %s, os bichinhos da Elizete não ficam do lado do Aguilar com nenhum conjunto de laços abertos', (_nome, centro) => {
    const achados: string[] = [];
    for (const abertos of subconjuntos) {
      const x = arranjo(centro, abertos);
      if (!x.has('elizete') || !x.has('aguilar')) continue;
      const ladoDoAguilar = Math.sign(x.get('aguilar')! - x.get('elizete')!);
      for (const bicho of ['ex-mel', 'ex-toto']) {
        if (x.has(bicho) && Math.sign(x.get(bicho)! - x.get('elizete')!) === ladoDoAguilar) achados.push(`${bicho}, partindo de ${centro || 'gui'}, com ${abertos.join(',') || 'nada'} aberto`);
      }
    }
    expect(achados).toEqual([]);
  });
});
