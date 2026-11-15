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
  it('os laços do Gui do lado esquerdo saem num tronco só, que entra pela lateral dele', () => {
    const { desenho } = montarDesenho(dados, estado(['gui']));
    const gui = desenho.pessoas.find((p) => p.id === 'gui')!;
    const troncos = desenho.linhas.filter((l) => l.tipo === 'coracao' && ['renan', 'natalia-boaventura', 'ex-dona-deia'].some((id) => l.de.includes(id)));
    expect(troncos).toHaveLength(1);
    const [tronco] = troncos;
    expect(tronco.de).toEqual(expect.arrayContaining(['gui', 'renan', 'natalia-boaventura', 'ex-dona-deia']));
    // Entra pelo meio da lateral esquerda do Gui. Como a reta até o Ed Luiz já sai dali, o tronco
    // nasce nela, no vão ao lado do Gui, sem repetir o trecho
    const [, x0, y0] = /^M (-?[\d.]+) (-?[\d.]+)/.exec(tronco.d)!.map(Number);
    expect(y0, tronco.d).toBe(gui.y + 38);
    expect(x0, tronco.d).toBeGreaterThan(gui.x - 22);
    expect(x0, tronco.d).toBeLessThanOrEqual(gui.x);
    const reta = desenho.linhas.find((l) => l.de.includes('gui') && l.de.includes('ed-luiz'))!;
    expect(reta.d.endsWith(`${gui.y + 38} H ${gui.x}`), reta.d).toBe(true);
    // Cada galho nasce na faixa do tronco: os trechos não se sobrepõem, e o tracejado aparece
    const inicios = [...tronco.d.matchAll(/M (-?[\d.]+) (-?[\d.]+)/g)].slice(1).map((m) => Number(m[2]));
    const faixa = [...tronco.d.matchAll(/Q (-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[2]))[1];
    expect(inicios.length).toBe(2);
    for (const y of inicios) expect(y).toBe(faixa);
  });
});

// Trechos retos (horizontais e verticais) de um caminho SVG, sem as curvas
const retas = (d: string) => {
  const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
  let x = 0;
  let y = 0;
  for (const [, cmd, args] of d.matchAll(/([MLHVQa])([^MLHVQa]*)/g)) {
    const n = args.trim().split(/\s+/).filter(Boolean).map(Number);
    if (cmd === 'M') [x, y] = n;
    else if (cmd === 'H') (out.push({ x1: x, y1: y, x2: n[0], y2: y }), (x = n[0]));
    else if (cmd === 'V') (out.push({ x1: x, y1: y, x2: x, y2: n[0] }), (y = n[0]));
    else if (cmd === 'L') (out.push({ x1: x, y1: y, x2: n[0], y2: n[1] }), ([x, y] = n));
    else if (cmd === 'Q') [x, y] = n.slice(2);
    else break;
  }
  return out;
};
const sobreposicao = (a: ReturnType<typeof retas>[number], b: ReturnType<typeof retas>[number]) => {
  if (a.y1 === a.y2 && b.y1 === b.y2 && a.y1 === b.y1) return Math.min(Math.max(a.x1, a.x2), Math.max(b.x1, b.x2)) - Math.max(Math.min(a.x1, a.x2), Math.min(b.x1, b.x2));
  if (a.x1 === a.x2 && b.x1 === b.x2 && a.x1 === b.x1) return Math.min(Math.max(a.y1, a.y2), Math.max(b.y1, b.y2)) - Math.max(Math.min(a.y1, a.y2), Math.min(b.y1, b.y2));
  return 0;
};

describe('tracejado nunca vira linha cheia', () => {
  // Achado do QA de 15/11/2026: o tronco repetia os primeiros 11px da reta até o vizinho (Elizete e Dona Fátima, Gui e Ed Luiz)
  const casos: [string, string[]][] = [['', ['gui']], ['', ['gui', 'elizete']], ['', ['gui', 'giovanna', 'lucas-magno']], ['lucas-magno', ['lucas-magno']], ['aguilar', ['elizete']]];
  for (const [centro, abertos] of casos) {
    it(`laços do coração não repetem trechos de retas que saem da mesma lateral (centro ${centro || 'padrão'}, laços de ${abertos.join(' e ')})`, () => {
      const { desenho } = montarDesenho(dados, { ...estado(abertos), centro });
      const tracejadas = desenho.linhas.filter((l) => l.tipo === 'coracao' || l.tipo === 'ex' || l.tipo === 'consideracao');
      const retasDaFileira = desenho.linhas.filter((l) => /^M \S+ \S+ H \S+$/.test(l.d));
      for (const t of tracejadas)
        for (const o of retasDaFileira) {
          if (o === t) continue;
          for (const a of retas(t.d)) for (const b of retas(o.d)) expect(sobreposicao(a, b), `${t.de.join('/')} sobre ${o.de.join('/')}`).toBeLessThanOrEqual(1);
        }
    });
  }
});

describe('o mapa nunca fica vazio', () => {
  const nomes = (centro: string, mudar: Partial<Estado> = {}) => montarDesenho(dados, { ...estado(['gui']), centro, ...mudar }).desenho.pessoas.map((p) => p.id);

  it('partir de quem só tem laço do coração mostra a pessoa', () => {
    for (const id of ['ex-caio-amigo', 'ex-dona-deia', 'ex-dona-fatima', 'ex-dona-lourdes', 'gisele', 'ed-luiz']) expect(nomes(id)).toContain(id);
  });

  it('com o centro escondido por um filtro, volta para os centros padrão', () => {
    expect(nomes('ex-toto', { bichos: false })).toContain('gui');
    expect(nomes('gui', { nucleo: 'bracarense', outros: false })).toContain('lucas-magno');
  });
});

describe('laço do coração sem "como se fosse"', () => {
  it('quem não tem família no acervo aparece na geração de quem escolheu', () => {
    const comAmigo: DadosDaArvore = {
      ...dados,
      pessoas: [...dados.pessoas, { id: 'x-amigo', nome: 'Amigo', rotulo: '', nucleos: [], bicho: false, anos: '' }],
      coracao: [...dados.coracao, { dono: 'gui', pessoa: 'x-amigo', papel: null, rotulo: 'seu amigo' }],
    };
    const { desenho } = montarDesenho(comAmigo, estado(['gui']));
    const amigo = desenho.pessoas.find((p) => p.id === 'x-amigo');
    expect(amigo).toBeDefined();
    expect(amigo!.y).toBe(desenho.pessoas.find((p) => p.id === 'gui')!.y);
    expect(desenho.linhas.some((l) => l.tipo === 'coracao' && l.de.includes('x-amigo'))).toBe(true);
  });
});
