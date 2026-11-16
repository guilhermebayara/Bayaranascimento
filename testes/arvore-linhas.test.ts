// Linhas dos laços do coração que contornam as caixas e entram por cima (correção do Gui no FigJam,
// 16/11/2026, seção "correção árvore"). O caso veio do espelho: um tio de consideração com par dos dois
// lados e uma filha, e uma vó de consideração bem acima dele.
import { describe, expect, it } from 'vitest';
import { MEDIDAS, type Linha } from '../src/lib/arvore-desenho';
import { montarDesenho, type DadosDaArvore, type Estado } from '../src/lib/arvore-montagem';
import previa from './dados/arvore-previa.json';

const base = previa as DadosDaArvore;
const pessoa = (id: string, nome: string) => ({ id, nome, rotulo: '', nucleos: [], bicho: false, anos: '' });
// Os dados da prévia com o caso do espelho
const comTio: DadosDaArvore = {
  ...base,
  pessoas: [...base.pessoas, pessoa('x-tio', 'Tio'), pessoa('x-par-1', 'Par 1'), pessoa('x-par-2', 'Par 2'), pessoa('x-filha', 'Filha'), pessoa('x-vo', 'Vó')],
  casais: [...base.casais, { a: 'x-par-1', b: 'x-tio', ex: false }, { a: 'x-par-2', b: 'x-tio', ex: false }],
  filiacoes: [...base.filiacoes, { filho: 'x-filha', responsavel: 'x-tio', consideracao: false }],
  coracao: [...base.coracao, { dono: 'gui', pessoa: 'x-tio', papel: 'tio', rotulo: 'seu tio' }, { dono: 'gui', pessoa: 'x-vo', papel: 'avo', rotulo: 'sua vó' }],
};

type Trecho = [number, number, number, number];
/** Trechos de um caminho SVG. As curvas viram oito trechos retos; o círculo do casal fica de fora. */
function trechos(d: string): { retos: Trecho[]; todos: Trecho[] } {
  const tk = d.match(/[MLHVQa]|-?[\d.]+(?:e-?\d+)?/g) ?? [];
  const retos: Trecho[] = [];
  const todos: Trecho[] = [];
  let [i, x, y, cmd] = [0, 0, 0, ''];
  const n = () => Number(tk[i++]);
  while (i < tk.length) {
    if (/[MLHVQa]/.test(tk[i])) cmd = tk[i++];
    if (cmd === 'a') break;
    if (cmd === 'M') [x, y] = [n(), n()];
    else if (cmd === 'Q') {
      const [cx, cy, ex, ey] = [n(), n(), n(), n()];
      let [px, py] = [x, y];
      for (let k = 1; k <= 8; k++) {
        const t = k / 8;
        const q: [number, number] = [(1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * ey];
        todos.push([px, py, q[0], q[1]]);
        [px, py] = q;
      }
      [x, y] = [ex, ey];
    } else {
      const [nx, ny] = cmd === 'L' ? [n(), n()] : cmd === 'H' ? [n(), y] : [x, n()];
      retos.push([x, y, nx, ny]);
      todos.push([x, y, nx, ny]);
      [x, y] = [nx, ny];
    }
  }
  return { retos, todos };
}

/** O trecho entra na caixa (encolhida 3px)? */
function atravessa([x1, y1, x2, y2]: Trecho, c: { x: number; y: number }): boolean {
  const [a, b, c2, d] = [c.x + 3, c.y + 3, c.x + MEDIDAS.largura - 3, c.y + MEDIDAS.altura - 3];
  let [t0, t1] = [0, 1];
  const [dx, dy] = [x2 - x1, y2 - y1];
  for (const [p, q] of [[-dx, x1 - a], [dx, c2 - x1], [-dy, y1 - b], [dy, d - y1]] as [number, number][]) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return t1 - t0 > 1e-6;
}

/** Quanto dois trechos retos, horizontais ou verticais, andam juntos. */
function juntos([a1, b1, a2, b2]: Trecho, [c1, d1, c2, d2]: Trecho): number {
  if (b1 === b2 && d1 === d2 && b1 === d1) return Math.min(Math.max(a1, a2), Math.max(c1, c2)) - Math.max(Math.min(a1, a2), Math.min(c1, c2));
  if (a1 === a2 && c1 === c2 && a1 === c1) return Math.min(Math.max(b1, b2), Math.max(d1, d2)) - Math.max(Math.min(b1, b2), Math.min(d1, d2));
  return 0;
}

const estado = (centro: string, abertos: string[], amigos = false): Estado => ({
  foco: 'gui', centro, ramos: new Set(), nucleo: '', consideracao: true, ex: true, bichos: true, outros: true, abertos: new Set(abertos), amigos,
});
const tracejada = (l: Linha) => l.tipo === 'coracao' || l.tipo === 'consideracao' || l.tipo === 'ex';
const casos: [string, DadosDaArvore, Estado][] = [];
for (const [nomeDosDados, dados] of [['prévia', base], ['prévia com o tio do espelho', comTio]] as const) {
  for (const centro of ['', 'gui', 'vo-vivica', 'aguilar', 'vo-bela']) {
    for (const abertos of [['gui'], ['gui', 'elizete'], ['gui', 'giovanna', 'lucas-magno', 'elizete']]) {
      for (const amigos of [false, true]) casos.push([`${nomeDosDados}, centro ${centro || 'padrão'}, laços de ${abertos.join(' e ')}${amigos ? ', com amigos' : ''}`, dados, estado(centro, abertos, amigos)]);
    }
  }
}

describe('linhas que contornam as caixas', () => {
  it.each(casos)('nenhuma linha de coração ou de consideração passa por cima de alguém (%s)', (_, dados, e) => {
    const { desenho } = montarDesenho(dados, e);
    for (const l of desenho.linhas.filter((x) => x.tipo === 'coracao' || x.tipo === 'consideracao' || x.tipo === 'resumido')) {
      for (const t of trechos(l.d).todos) for (const p of desenho.pessoas) expect(atravessa(t, p), `${l.de.join('/')} por cima de ${p.id}`).toBe(false);
    }
  });

  it.each(casos)('nenhum tracejado repete trecho de outra linha (%s)', (_, dados, e) => {
    const { desenho } = montarDesenho(dados, e);
    const todas = desenho.linhas.filter((l) => l.tipo !== 'ponto').map((l) => ({ l, retos: trechos(l.d).retos }));
    for (const [i, a] of todas.entries()) {
      if (!tracejada(a.l)) continue;
      for (const [j, b] of todas.entries()) {
        // A consideração pode se unir à linha dos filhos antes de chegar (o Gui e o Chico): é a regra das linhas que se unem
        // A linha até um bicho é a dos filhos com traço próprio, e vale a mesma regra
        if (a.l.tipo === 'consideracao' && (b.l.tipo === 'filhos' || b.l.tipo === 'bicho')) continue;
        for (const [p, ta] of a.retos.entries()) {
          for (const [q, tb] of b.retos.entries()) {
            if (i === j && q <= p) continue;
            expect(juntos(ta, tb), `${a.l.tipo} ${a.l.de.join('/')} com ${b.l.tipo} ${b.l.de.join('/')}`).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });
});

describe('um raio só para todas as curvas (achado do Gui, 16/11/2026)', () => {
  // Curva é bifurcação ou junção, ângulo reto é cruzamento: com raios diferentes, a diferença some
  it.each(casos)('toda curva tem o mesmo raio, bem visível (%s)', (_, dados, e) => {
    const { desenho } = montarDesenho(dados, e);
    for (const l of desenho.linhas.filter((x) => x.tipo !== 'ponto')) {
      for (const q of l.d.matchAll(/Q (\S+) (\S+) (\S+) (\S+)/g)) {
        const raio = Math.max(Math.abs(Number(q[1]) - Number(q[3])), Math.abs(Number(q[2]) - Number(q[4])));
        expect(raio, `${l.tipo} ${l.de.join('/')}: ${q[0]}`).toBeCloseTo(20, 6);
      }
    }
  });
});

describe('quem tem filhos embaixo recebe o laço por cima', () => {
  it('o tio de consideração com filha: o galho chega pelo alto dele, e o pé fica com a linha da filha', () => {
    const { desenho } = montarDesenho(comTio, estado('', ['gui']));
    const tio = desenho.pessoas.find((p) => p.id === 'x-tio')!;
    const gui = desenho.pessoas.find((p) => p.id === 'gui')!;
    expect(tio.y).toBeLessThan(gui.y);
    const tronco = desenho.linhas.find((l) => l.tipo === 'coracao' && l.de.includes('x-tio'))!;
    const chega = trechos(tronco.d).retos.some(([x1, y1, x2, y2]) => x1 === x2 && x1 === tio.x + MEDIDAS.largura / 2 && Math.max(y1, y2) === tio.y);
    expect(chega, tronco.d).toBe(true);
    const peDoTio = trechos(tronco.d).todos.some(([, y1, , y2]) => y1 === tio.y + MEDIDAS.altura || y2 === tio.y + MEDIDAS.altura);
    expect(peDoTio, tronco.d).toBe(false);
  });

  it('a vó de consideração, sem filhos desenhados, continua recebendo pelo pé', () => {
    const { desenho } = montarDesenho(comTio, estado('', ['gui']));
    const vo = desenho.pessoas.find((p) => p.id === 'x-vo')!;
    const tronco = desenho.linhas.find((l) => l.tipo === 'coracao' && l.de.includes('x-vo'))!;
    const chega = trechos(tronco.d).retos.some(([x1, y1, x2, y2]) => x1 === x2 && x1 === vo.x + MEDIDAS.largura / 2 && Math.min(y1, y2) === vo.y + MEDIDAS.altura);
    expect(chega, tronco.d).toBe(true);
  });

  it('os galhos de um tronco dividem a subida e se separam numa curva', () => {
    const { desenho } = montarDesenho(comTio, estado('', ['gui']));
    const tronco = desenho.linhas.find((l) => l.tipo === 'coracao' && l.de.includes('x-tio') && l.de.includes('x-vo'));
    expect(tronco, 'tio e vó no mesmo tronco').toBeDefined();
    // Cada galho nasce em cima de um trecho já desenhado: numa curva, ou seguindo reto de onde outro virou
    const partes = tronco!.d.split(/(?= M )/);
    for (const [k, galho] of partes.entries()) {
      if (k === 0) continue;
      const [sx, sy] = galho.trim().split(' ').slice(1, 3).map(Number);
      const antes = trechos(partes.slice(0, k).join(' ')).retos;
      const emCima = antes.some(([x1, y1, x2, y2]) => (x1 === x2 && x1 === sx && sy >= Math.min(y1, y2) && sy <= Math.max(y1, y2)) || (y1 === y2 && y1 === sy && sx >= Math.min(x1, x2) && sx <= Math.max(x1, x2)));
      expect(emCima, `${galho} em ${tronco!.d}`).toBe(true);
    }
  });
});
