import { describe, expect, it } from 'vitest';
import { MEDIDAS, desenharArvore, type CasalNoDesenho, type FiliacaoNoDesenho, type PessoaNoDesenho } from '../src/lib/arvore-desenho';

const p = (id: string, geracao: number): PessoaNoDesenho => ({ id, geracao });
const filho = (f: string, ...pais: string[]): FiliacaoNoDesenho[] => pais.map((responsavel) => ({ filho: f, responsavel, consideracao: false }));
const casal = (a: string, b: string, ex = false): CasalNoDesenho => ({ a, b, ex });

// Duas famílias que se encontram num casamento, com tios, primos, ex-casal e meio-irmão
const pessoas = [
  p('vo-vivica', 0), p('vo-bela', 0), p('regina', 0),
  p('elizete', 1), p('aguilar', 1), p('marta', 1), p('tia-ana', 1), p('tio-beto', 1), p('lucio', 1), p('ana-candida', 1),
  p('gui', 2), p('giovanna', 2), p('lucas-magno', 2), p('caio', 2), p('primo-leo', 2), p('prima-bia', 2), p('irma-do-magno', 2),
  p('chico', 3),
];
const casais = [casal('elizete', 'aguilar', true), casal('aguilar', 'marta'), casal('tia-ana', 'tio-beto'), casal('lucio', 'ana-candida'), casal('giovanna', 'lucas-magno')];
const filiacoes = [
  ...filho('elizete', 'vo-vivica'), ...filho('tia-ana', 'vo-vivica'), ...filho('aguilar', 'vo-bela'), ...filho('ana-candida', 'regina'),
  ...filho('gui', 'elizete', 'aguilar'), ...filho('giovanna', 'elizete', 'aguilar'), ...filho('caio', 'aguilar', 'marta'),
  ...filho('primo-leo', 'tia-ana', 'tio-beto'), ...filho('prima-bia', 'tia-ana', 'tio-beto'),
  ...filho('lucas-magno', 'lucio', 'ana-candida'), ...filho('irma-do-magno', 'lucio', 'ana-candida'),
  ...filho('chico', 'giovanna', 'lucas-magno'),
  { filho: 'chico', responsavel: 'gui', consideracao: true },
];
const desenho = desenharArvore(pessoas, casais, filiacoes, [{ dono: 'gui', pessoa: 'ed' }]);
const em = new Map(desenho.pessoas.map((x) => [x.id, x]));
const passo = MEDIDAS.largura + MEDIDAS.vaoX;
const vizinhos = (a: string, b: string) => em.get(a)!.y === em.get(b)!.y && Math.abs(em.get(a)!.x - em.get(b)!.x) <= passo + 1;

describe('desenho da árvore', () => {
  it('ninguém fica em cima de ninguém', () => {
    for (const a of desenho.pessoas) {
      for (const b of desenho.pessoas) {
        if (a.id >= b.id || a.y !== b.y) continue;
        expect(Math.abs(a.x - b.x), `${a.id} e ${b.id}`).toBeGreaterThanOrEqual(passo - 1);
      }
    }
  });
  it('cada geração fica numa linha, de cima para baixo', () => {
    expect(em.get('vo-vivica')!.y).toBeLessThan(em.get('elizete')!.y);
    expect(em.get('elizete')!.y).toBeLessThan(em.get('gui')!.y);
    expect(em.get('gui')!.y).toBeLessThan(em.get('chico')!.y);
    expect(em.get('gui')!.y).toBe(em.get('lucas-magno')!.y);
  });
  it('casais ficam lado a lado, inclusive o ex e o atual da mesma pessoa', () => {
    expect(vizinhos('giovanna', 'lucas-magno')).toBe(true);
    expect(vizinhos('tia-ana', 'tio-beto')).toBe(true);
    expect(vizinhos('lucio', 'ana-candida')).toBe(true);
    expect(vizinhos('elizete', 'aguilar')).toBe(true);
    expect(vizinhos('aguilar', 'marta')).toBe(true);
  });
  it('o casal que une as duas famílias fica entre elas', () => {
    expect(em.get('gui')!.x).toBeLessThan(em.get('giovanna')!.x);
    expect(em.get('giovanna')!.x).toBeLessThan(em.get('lucas-magno')!.x);
    expect(em.get('lucas-magno')!.x).toBeLessThan(em.get('irma-do-magno')!.x);
  });
  it('filhos ficam perto dos pais', () => {
    const meio = (...ids: string[]) => ids.reduce((s, id) => s + em.get(id)!.x, 0) / ids.length;
    expect(Math.abs(em.get('chico')!.x - meio('giovanna', 'lucas-magno'))).toBeLessThanOrEqual(passo);
    expect(Math.abs(meio('primo-leo', 'prima-bia') - meio('tia-ana', 'tio-beto'))).toBeLessThanOrEqual(passo * 1.5);
  });
  it('cada tipo de laço tem a sua linha', () => {
    const tipos = desenho.linhas.map((l) => l.tipo);
    expect(tipos.filter((t) => t === 'casal')).toHaveLength(4);
    expect(tipos.filter((t) => t === 'ex')).toHaveLength(1);
    expect(tipos.filter((t) => t === 'consideracao')).toHaveLength(1);
    // um grupo de filhos por conjunto de pais
    expect(tipos.filter((t) => t === 'filhos')).toHaveLength(8);
  });
  it('irmãos dividem a mesma linha de filhos', () => {
    const dosPais = desenho.linhas.find((l) => l.tipo === 'filhos' && l.de.includes('gui'))!;
    expect(dosPais.de.sort()).toEqual(['aguilar', 'elizete', 'giovanna', 'gui']);
  });
  it('ignora laços com quem não está no desenho, e aguenta árvore vazia', () => {
    expect(desenho.linhas.some((l) => l.de.includes('ed'))).toBe(false);
    expect(desenharArvore([], [], [])).toEqual({ pessoas: [], linhas: [], largura: 0, altura: 0 });
  });
  it('tudo cabe dentro da área informada', () => {
    for (const x of desenho.pessoas) {
      expect(x.x).toBeGreaterThanOrEqual(0);
      expect(x.x + MEDIDAS.largura).toBeLessThanOrEqual(desenho.largura);
    }
  });
});

describe('ordem pensada para uma árvore limpa', () => {
  // Bayara à esquerda, Bracarense à direita, e o casal que une as duas no meio
  const lado: Record<string, number> = {
    'vo-vivica': 0, 'vo-bela': 0, elizete: 0, aguilar: 0, marta: 0, 'tia-ana': 0, 'tio-beto': 0, gui: 0, caio: 0, 'primo-leo': 0, 'prima-bia': 0,
    giovanna: 0.25, chico: 0.5, 'lucas-magno': 0.75,
    regina: 1, lucio: 1, 'ana-candida': 1, 'irma-do-magno': 1,
  };
  const comLados = desenharArvore(pessoas.map((x) => ({ ...x, lado: lado[x.id] })), casais, filiacoes);
  const onde = new Map(comLados.pessoas.map((x) => [x.id, x]));
  const xDe = (id: string) => onde.get(id)!.x;

  it('cada núcleo fica do seu lado, e o casal que une fica entre eles', () => {
    for (const bayara of ['gui', 'caio', 'primo-leo', 'prima-bia']) expect(xDe(bayara), bayara).toBeLessThan(xDe('giovanna'));
    expect(xDe('giovanna')).toBeLessThan(xDe('lucas-magno'));
    expect(xDe('lucas-magno')).toBeLessThan(xDe('irma-do-magno'));
    for (const bayara of ['vo-vivica', 'vo-bela']) expect(xDe(bayara)).toBeLessThan(xDe('regina'));
    for (const bayara of ['elizete', 'aguilar', 'tia-ana']) expect(xDe(bayara)).toBeLessThan(xDe('lucio'));
  });
  it('quase nenhuma linha de pais e filhos se cruza', () => {
    // Com um ex-casal entre dois grupos de irmãos e um meio-irmão, um cruzamento é inevitável
    // Uma ligação por filho: do meio dos pais até ele, como a linha é desenhada
    const filhos = [...new Set(filiacoes.filter((f) => !f.consideracao).map((f) => f.filho))];
    const ligacoes = filhos.map((f) => {
      const pais = filiacoes.filter((x) => x.filho === f && !x.consideracao).map((x) => x.responsavel);
      return { de: pais.reduce((soma, p) => soma + xDe(p), 0) / pais.length, para: xDe(f), y: onde.get(f)!.y, f };
    });
    const cruzadas: string[] = [];
    for (let i = 0; i < ligacoes.length; i++) {
      for (let j = i + 1; j < ligacoes.length; j++) {
        const [a, b] = [ligacoes[i], ligacoes[j]];
        if (a.y === b.y && (a.de - b.de) * (a.para - b.para) < 0) cruzadas.push(`${a.f} x ${b.f}`);
      }
    }
    expect(cruzadas.length, cruzadas.join(', ')).toBeLessThanOrEqual(1);
  });
  it('irmãos ficam lado a lado, e os laços do coração vão para o lado de fora', () => {
    const geracaoDoGui = pessoas.find((x) => x.id === 'gui')!.geracao;
    const comAmigos = desenharArvore(
      [
        ...pessoas.filter((x) => !['caio', 'marta'].includes(x.id)).map((x) => ({ ...x, lado: lado[x.id] })),
        { id: 'mae-do-amigo', geracao: geracaoDoGui - 1 },
        { id: 'amigo', geracao: geracaoDoGui },
        { id: 'par-do-amigo', geracao: geracaoDoGui },
      ],
      [...casais, { a: 'amigo', b: 'par-do-amigo', ex: false }],
      [...filiacoes, { filho: 'amigo', responsavel: 'mae-do-amigo', consideracao: false }],
      [{ dono: 'gui', pessoa: 'amigo' }],
    );
    // A ordem da geração do Gui, da esquerda para a direita
    const yDoGui = comAmigos.pessoas.find((x) => x.id === 'gui')!.y;
    const fila = comAmigos.pessoas.filter((x) => x.y === yDoGui).sort((x, z) => x.x - z.x).map((x) => x.id);
    expect(fila.indexOf('giovanna') - fila.indexOf('gui'), fila.join(' ')).toBe(1);
    expect(fila.indexOf('gui') - fila.indexOf('amigo'), fila.join(' ')).toBe(1);
  });
  it('sem o meio-irmão, nenhuma linha se cruza', () => {
    const semCaio = desenharArvore(
      pessoas.filter((x) => !['caio', 'marta'].includes(x.id)).map((x) => ({ ...x, lado: lado[x.id] })),
      casais,
      filiacoes,
    );
    const lugar = new Map(semCaio.pessoas.map((x) => [x.id, x]));
    const filhos = [...new Set(filiacoes.filter((f) => !f.consideracao && lugar.has(f.filho)).map((f) => f.filho))];
    const ligacoes = filhos.map((f) => {
      const pais = filiacoes.filter((x) => x.filho === f && !x.consideracao && lugar.has(x.responsavel)).map((x) => x.responsavel);
      return { de: pais.reduce((soma, p) => soma + lugar.get(p)!.x, 0) / pais.length, para: lugar.get(f)!.x, y: lugar.get(f)!.y, f };
    });
    const cruzadas: string[] = [];
    for (let i = 0; i < ligacoes.length; i++) {
      for (let j = i + 1; j < ligacoes.length; j++) {
        const [a, b] = [ligacoes[i], ligacoes[j]];
        if (a.y === b.y && (a.de - b.de) * (a.para - b.para) < 0) cruzadas.push(`${a.f} x ${b.f}`);
      }
    }
    expect(cruzadas).toEqual([]);
  });
  it('casais continuam lado a lado depois da otimização', () => {
    const colados = (a: string, b: string) => Math.abs(xDe(a) - xDe(b)) <= passo + 1;
    expect(colados('giovanna', 'lucas-magno')).toBe(true);
    expect(colados('elizete', 'aguilar')).toBe(true);
    expect(colados('aguilar', 'marta')).toBe(true);
  });
});
