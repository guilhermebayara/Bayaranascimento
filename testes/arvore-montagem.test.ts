import { describe, expect, it } from 'vitest';
import { comLacoDeArvore, montarDesenho, type DadosDaArvore, type Estado } from '../src/lib/arvore-montagem';
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
    // O Renan é amigo sem "como se fosse": só entra com "Amigos" ligado
    const { desenho } = montarDesenho(dados, { ...estado(['gui']), amigos: true });
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

  it('só dá para partir de quem tem filiação ou casal', () => {
    // Decisão do Gui (16/11/2026): de quem só tem laço do coração, a árvore seria só a pessoa
    const partiveis = comLacoDeArvore(dados);
    for (const id of ['ex-caio-amigo', 'ex-dona-deia', 'ex-dona-fatima', 'ex-dona-lourdes']) expect(partiveis.has(id), id).toBe(false);
    for (const id of ['gui', 'vo-vivica', 'chico', 'ex-toto']) expect(partiveis.has(id), id).toBe(true);
  });

  it('um endereço que parte de quem não tem laço de árvore abre a árvore padrão', () => {
    for (const id of ['ex-caio-amigo', 'ex-dona-deia']) expect(nomes(id)).toEqual(expect.arrayContaining(['gui', 'giovanna', 'lucas-magno']));
  });

  it('com o centro escondido por um filtro, volta para os centros padrão', () => {
    expect(nomes('ex-toto', { bichos: false })).toContain('gui');
    expect(nomes('gui', { nucleo: 'bracarense', outros: false })).toContain('lucas-magno');
  });
});

describe('laço do coração sem "como se fosse"', () => {
  // Decisão do Gui (16/11/2026): amigos sem lugar na família não aparecem por padrão. Haverá muito mais
  // amigos cadastrados do que gente como da família. A opção "Amigos sem lugar na família" mostra.
  const comAmigo: DadosDaArvore = {
    ...dados,
    pessoas: [...dados.pessoas, { id: 'x-amigo', nome: 'Amigo', rotulo: '', nucleos: [], bicho: false, anos: '' }],
    coracao: [...dados.coracao, { dono: 'gui', pessoa: 'x-amigo', papel: null, rotulo: 'seu amigo' }],
  };

  it('não aparece por padrão, nem conta no botão ♥', () => {
    const m = montarDesenho(comAmigo, estado(['gui']));
    expect(m.desenho.pessoas.some((p) => p.id === 'x-amigo')).toBe(false);
    // O Renan continua na árvore como pai do Otto ("como se fosse sobrinho"), mas sem linha própria até o Gui
    expect(m.desenho.pessoas.some((p) => p.id === 'renan')).toBe(true);
    expect(m.coracao.some((l) => l.pessoa === 'renan')).toBe(false);
    expect(m.lacosDe.get('gui')).toBe(dados.coracao.filter((l) => l.dono === 'gui' && l.papel).length);
  });

  it('com "Amigos" ligado, quem não tem família no acervo aparece na geração de quem escolheu', () => {
    const { desenho } = montarDesenho(comAmigo, { ...estado(['gui']), amigos: true });
    const amigo = desenho.pessoas.find((p) => p.id === 'x-amigo');
    expect(amigo).toBeDefined();
    expect(amigo!.y).toBe(desenho.pessoas.find((p) => p.id === 'gui')!.y);
    expect(desenho.linhas.some((l) => l.tipo === 'coracao' && l.de.includes('x-amigo'))).toBe(true);
  });
});

describe('laço resumido na montagem', () => {
  const comEd: DadosDaArvore = {
    ...dados,
    pessoas: [
      ...dados.pessoas,
      { id: 'ed', nome: 'Ed', rotulo: '', nucleos: [], bicho: false, anos: '' },
      { id: 'caio-do-ed', nome: 'Caio', rotulo: '', nucleos: [], bicho: false, anos: '' },
    ],
    coracao: [...dados.coracao, { dono: 'gui', pessoa: 'ed', papel: 'irmao', rotulo: 'seu amigo-irmão' }],
    resumidos: [{ a: 'ed', b: 'caio-do-ed', papel: 'sobrinho', rotulo: 'sobrinho de Ed' }],
  };

  it('o sobrinho do Ed entra na árvore junto com o Ed, uma geração abaixo', () => {
    const { geracoes, principal } = montarDesenho(comEd, estado(['gui']));
    expect(principal.has('caio-do-ed')).toBe(true);
    expect(geracoes.get('caio-do-ed')).toBe(geracoes.get('ed')! + 1);
  });

  it('sem o laço do Gui aberto, nem o Ed nem o sobrinho aparecem', () => {
    const { principal } = montarDesenho(comEd, estado([]));
    expect(principal.has('ed')).toBe(false);
    expect(principal.has('caio-do-ed')).toBe(false);
  });

  it('o laço resumido não depende da camada de consideração do sobrinho para o tio', () => {
    // O tio entra pela geração do sobrinho, quando é o sobrinho que já está na árvore
    const inverso: DadosDaArvore = { ...comEd, coracao: [...dados.coracao, { dono: 'gui', pessoa: 'caio-do-ed', papel: 'sobrinho', rotulo: 'seu sobrinho' }] };
    const { geracoes, principal } = montarDesenho(inverso, estado(['gui']));
    expect(principal.has('ed')).toBe(true);
    expect(geracoes.get('ed')).toBe(geracoes.get('caio-do-ed')! - 1);
  });
});

describe('laço resumido dito ao contrário (achado do Gui na homologação, 15/11/2026)', () => {
  // "Ed é tio do Caio", cadastrado na página do Caio: o laço do Gui com o Caio passa pelo Ed do mesmo jeito,
  // e o Ed continua do lado dos outros amigos-irmãos
  const base: DadosDaArvore = {
    eu: 'eu', centros: ['eu'], nucleos: [{ id: 'n', nome: 'N' }],
    pessoas: ['eu', 'mae', 'pai', 'irma', 'cunhado', 'ivan', 'joao', 'ed', 'caio'].map((id) => ({ id, nome: id, rotulo: '', nucleos: ['eu', 'mae', 'pai', 'irma'].includes(id) ? ['n'] : [], bicho: false, anos: '' })),
    filiacoes: [
      { filho: 'eu', responsavel: 'mae', consideracao: false }, { filho: 'eu', responsavel: 'pai', consideracao: false },
      { filho: 'irma', responsavel: 'mae', consideracao: false }, { filho: 'irma', responsavel: 'pai', consideracao: false },
    ],
    casais: [{ a: 'mae', b: 'pai', ex: true }, { a: 'irma', b: 'cunhado', ex: false }, { a: 'ivan', b: 'joao', ex: false }],
    coracao: [
      { dono: 'eu', pessoa: 'ed', papel: 'irmao', rotulo: '' },
      { dono: 'eu', pessoa: 'ivan', papel: 'irmao', rotulo: '' },
      { dono: 'eu', pessoa: 'joao', papel: 'irmao', rotulo: '' },
      { dono: 'eu', pessoa: 'caio', papel: 'sobrinho', rotulo: '' },
    ],
    resumidos: [{ a: 'caio', b: 'ed', papel: 'tio', rotulo: 'tio de Caio' }],
  };
  const e: Estado = { foco: 'eu', centro: '', ramos: new Set(), nucleo: '', consideracao: true, ex: true, bichos: true, outros: true, abertos: new Set(['eu']) };

  it('não há linha direta do Gui até o Caio: ela passa pelo Ed', () => {
    const { desenho } = montarDesenho(base, e);
    const ligam = (a: string, b: string) => desenho.linhas.filter((l) => l.de.includes(a) && l.de.includes(b) && l.tipo !== 'ponto').map((l) => l.tipo);
    expect(ligam('eu', 'caio')).toEqual([]);
    expect(ligam('ed', 'caio')).toEqual(['resumido']);
  });

  it('o laço com o Ed não passa pelo Caio', () => {
    const { desenho } = montarDesenho(base, e);
    expect(desenho.linhas.some((l) => l.tipo === 'coracao' && l.de.includes('eu') && l.de.includes('ed'))).toBe(true);
  });
});
