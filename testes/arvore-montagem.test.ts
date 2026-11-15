import { describe, expect, it } from 'vitest';
import { montarDesenho, type DadosDaArvore, type Estado } from '../src/lib/arvore-montagem';
import previa from './dados/arvore-previa.json';

// Os dados da prévia, como chegam ao navegador do Gui
const dados = previa as DadosDaArvore;
const estado = (abertos: string[]): Estado => ({
  foco: 'gui', centro: '', ramos: new Set(), nucleo: '', consideracao: true, ex: true, bichos: true, outros: true, abertos: new Set(abertos),
});
const nome = new Map(dados.pessoas.map((p) => [p.id, p.nome]));
const fileiras = (abertos: string[]) => {
  const { desenho } = montarDesenho(dados, estado(abertos));
  const porY = new Map<number, typeof desenho.pessoas>();
  for (const p of desenho.pessoas) porY.set(p.y, [...(porY.get(p.y) ?? []), p]);
  return [...porY].sort((a, b) => a[0] - b[0]).map(([, ps]) => ps.sort((a, b) => a.x - b.x).map((p) => nome.get(p.id)!));
};

describe('árvore com os dados da prévia', () => {
  for (const abertos of [['gui'], ['giovanna'], ['gui', 'giovanna'], ['gui', 'giovanna', 'lucas-magno']]) {
    it(`Bayara fica à esquerda e Bracarense à direita, com os laços de ${abertos.join(' e ')} abertos`, () => {
      const f = fileiras(abertos);
      const texto = f.map((l) => l.join(' | ')).join('\n');
      const linhaDoGui = f.find((l) => l.includes('Gui'))!;
      expect(linhaDoGui.indexOf('Gui'), texto).toBeLessThan(linhaDoGui.indexOf('Giovanna'));
      expect(linhaDoGui.indexOf('Giovanna'), texto).toBeLessThan(linhaDoGui.indexOf('Lucas Magno'));
      const avos = f.find((l) => l.includes('Vó Vivica'))!;
      expect(avos.indexOf('Vó Vivica'), texto).toBeLessThan(avos.indexOf('Regina'));
    });
  }
});

describe('laços do coração em tronco', () => {
  it('os laços do Gui do lado esquerdo saem juntos e entram pela lateral dele', () => {
    const { desenho } = montarDesenho(dados, estado(['gui']));
    const gui = desenho.pessoas.find((p) => p.id === 'gui')!;
    const doGui = desenho.linhas.filter((l) => l.tipo === 'coracao' && l.de.includes('gui'));
    const esquerda = doGui.filter((l) => ['renan', 'natalia-boaventura', 'ex-dona-deia'].some((id) => l.de.includes(id)));
    expect(esquerda).toHaveLength(3);
    // Todos terminam no mesmo ponto, no meio da lateral esquerda do Gui
    for (const l of esquerda) expect(l.d.trim().endsWith(`${gui.x} ${gui.y + 38}`), l.d).toBe(true);
    // E correm na mesma faixa: a altura do trecho horizontal é a mesma para os três
    const faixas = esquerda.map((l) => [...l.d.matchAll(/Q (-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[2])).filter((y) => y < gui.y)[0]);
    expect(new Set(faixas).size, faixas.join(' ')).toBe(1);
  });
});
