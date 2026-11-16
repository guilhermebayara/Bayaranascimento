// Capítulos na linha do tempo: a montagem dos trilhos, sem tela (docs/decisoes.md).
import { describe, expect, it } from 'vitest';
import { CABEM, capitulosNosTrilhos, comoAparece, montarTrilhos, trilhosNaEpoca, trilhosNaMarca, type CapituloDaLinha, type MemoriaDaLinha } from '../src/lib/linha-capitulos';

// A linha do tempo, das mais recentes para as mais antigas, como na tela
const m = (id: string, ano: number, mes: number | null, capitulos: string[] = []): MemoriaDaLinha => ({ id, ano, mes, capitulos });
const memorias = [
  m('casamento', 2026, 11, ['casal']),
  m('pao-de-queijo', 2026, 3),
  m('natal-25', 2025, 12, ['natais']),
  m('noivado', 2024, 6, ['casal', 'viagens']),
  m('chico', 2023, 3, ['casal', 'so-nos']),
  m('formatura', 2021, 12),
  m('dudu', 2021, 6),
  m('natal-20', 2020, 12, ['natais']),
  m('video', 2020, 4),
  m('almoco', 2019, 3, ['casal']),
  m('natal-06', 2006, 12, ['natais', 'natais-vivica']),
  m('ouro-preto', 2004, 2, ['viagens']),
  m('natal-94', 1994, 12, ['natais', 'natais-vivica']),
];
const cap = (id: string, titulo: string, modo: 'reunido' | 'epoca', extra: Partial<CapituloDaLinha> = {}): CapituloDaLinha => ({ id, titulo, modo, inicio: null, fim: null, dentroDe: null, ...extra });
const capitulos = [
  cap('pandemia', 'Os anos de casa', 'epoca', { inicio: { ano: 2020, mes: 3 }, fim: { ano: 2021, mes: 12 } }),
  cap('natais', 'Natais', 'reunido'),
  cap('natais-vivica', 'Natais na Vó Vivica', 'reunido', { dentroDe: 'natais' }),
  cap('viagens', 'Viagens de família', 'reunido'),
  cap('casal', 'Giovanna e Magno', 'reunido'),
  cap('so-nos', 'Só nós três', 'reunido', { dentroDe: 'casal' }),
];
const montagem = montarTrilhos(memorias, capitulos);
const de = (id: string) => montagem.capitulos.find((c) => c.id === id)!;
const linha = (id: string) => montagem.linhas.find((l) => l.id === id)!;

describe('trilhos dos capítulos', () => {
  it('cada trilho vai da memória mais recente do capítulo à mais antiga', () => {
    expect([de('natais').primeira, de('natais').ultima]).toEqual([2, 12]);
    expect([de('casal').primeira, de('casal').ultima]).toEqual([0, 9]);
    // O de época vai do começo ao fim do período: aqui, as quatro memórias de 2020 e 2021
    expect([de('pandemia').primeira, de('pandemia').ultima]).toEqual([5, 8]);
  });

  it('o mais longo fica mais à esquerda, e o de dentro, logo à direita do de fora', () => {
    expect(de('natais').trilho).toBe(0);
    expect(de('natais-vivica').trilho).toBe(1);
    expect(de('natais-vivica').dentroDe).toBe('natais');
    // O casal começa antes dos Natais e convive com eles: vai para o lado
    expect(de('casal').trilho).toBe(1);
    expect(de('so-nos').trilho).toBeGreaterThan(de('casal').trilho);
    // Dois capítulos que nunca convivem dividem o mesmo trilho
    expect(de('natais-vivica').primeira).toBeGreaterThan(de('casal').ultima);
  });

  it('nenhum trilho é dividido por dois capítulos ao mesmo tempo', () => {
    for (const a of montagem.capitulos) {
      for (const b of montagem.capitulos) {
        if (a.id !== b.id && a.trilho === b.trilho) expect(a.ultima < b.primeira || b.ultima < a.primeira, `${a.id} e ${b.id}`).toBe(true);
      }
    }
  });

  it('a memória de fora fica no lugar dela, e o trilho segue tracejado nesse trecho', () => {
    // A ordem do tempo nunca é quebrada para agrupar um capítulo
    expect(montagem.linhas.map((l) => l.id)).toEqual(memorias.map((x) => x.id));
    const natais = de('natais').trilho;
    expect(linha('natal-25').trilhos[natais]).toBe('preso');
    expect(linha('noivado').trilhos[natais]).toBe('fora');
    expect(linha('natal-20').trilhos[natais]).toBe('preso');
    // Antes de o capítulo começar e depois de terminar, não há trilho
    expect(linha('casamento').trilhos[natais]).toBeNull();
    expect(linha('pao-de-queijo').trilhos[de('casal').trilho]).toBe('fora');
  });

  it('no capítulo de época, toda memória do período está presa: não há trecho tracejado', () => {
    const pandemia = de('pandemia').trilho;
    for (const id of ['formatura', 'dudu', 'natal-20', 'video']) expect(linha(id).trilhos[pandemia]).toBe('preso');
  });

  it('o capítulo maior leva as memórias dos capítulos de dentro', () => {
    // "chico" foi colocada no casal e no de dentro; "natal-06", nos Natais e nos da Vó Vivica
    expect(linha('natal-06').capitulos).toEqual(expect.arrayContaining(['natais', 'natais-vivica']));
    const soDentro = montarTrilhos([m('a', 2001, 1, ['dentro']), m('b', 2000, 1, ['fora'])], [cap('fora', 'Fora', 'reunido'), cap('dentro', 'Dentro', 'reunido', { dentroDe: 'fora' })]);
    expect(soDentro.linhas[0]!.trilhos).toEqual(['preso', 'preso']);
    expect(soDentro.linhas[1]!.trilhos).toEqual(['preso', null]);
  });

  it('o alto do trilho leva o título e o período; o fim, a marca do começo', () => {
    expect(linha('natal-25').abre).toEqual(['natais']);
    expect(linha('natal-94').fecha).toEqual(['natais-vivica', 'natais']);
    expect(de('natais').periodo).toBe('1994 a 2025');
    expect(de('pandemia').periodo).toBe('mar de 2020 a dez de 2021');
    // Entre um ano e outro, só segue o trilho que já vinha de cima
    expect(linha('natal-25').chega[de('natais').trilho]).toBeNull();
    expect(linha('noivado').chega[de('natais').trilho]).toBe('fora');
  });

  it('na marca de um capítulo, os outros trilhos continuam passando', () => {
    const naAbertura = trilhosNaMarca(montagem, 2, 'natais', 'abre');
    expect(naAbertura[de('natais').trilho]).toBe('ponta');
    expect(naAbertura[de('casal').trilho]).toBe('fora');
    const noFim = trilhosNaMarca(montagem, 12, 'natais-vivica', 'fecha');
    expect(noFim[de('natais-vivica').trilho]).toBe('ponta');
    expect(noFim[de('natais').trilho]).toBe('preso');
  });
});

describe('cor de cada capítulo', () => {
  it('capítulos que convivem nunca dividem a cor', () => {
    for (const a of montagem.capitulos) {
      for (const b of montagem.capitulos) {
        const convivem = a.primeira <= b.ultima && b.primeira <= a.ultima;
        if (a.id !== b.id && convivem) expect(a.cor, `${a.id} e ${b.id}`).not.toBe(b.cor);
      }
    }
  });

  it('a cor é sempre a mesma para a mesma linha do tempo, e cada trecho de trilho sabe de que capítulo é', () => {
    expect(montarTrilhos(memorias, capitulos).capitulos.map((c) => [c.id, c.cor])).toEqual(montagem.capitulos.map((c) => [c.id, c.cor]));
    // Dois capítulos dividem o mesmo trilho em trechos diferentes: a cor muda com o capítulo
    const noAlto = capitulosNosTrilhos(montagem, 0);
    const embaixo = capitulosNosTrilhos(montagem, 12);
    expect(noAlto[de('casal').trilho]?.id).toBe('casal');
    expect(embaixo[de('natais-vivica').trilho]?.id).toBe('natais-vivica');
    expect(noAlto[de('natais').trilho]).toBeNull();
  });
});

// PROPOSTA em avaliação (16/11/2026), para o furo do capítulo de época: ver o alto de src/lib/linha-capitulos.ts
describe('proposta: época de todos e capítulo com período e pessoas', () => {
  const comQuem = [
    m('casamento', 2026, 11),
    m('formatura-da-gio', 2021, 12),
    m('dudu', 2021, 6),
    m('natal-20', 2020, 12),
    m('video', 2020, 4),
    m('almoco', 2019, 3),
  ].map((x, i) => ({ ...x, integrantes: [['giovanna', 'magno'], ['giovanna'], ['bruno', 'luisa'], ['giovanna', 'gui'], ['gui'], ['giovanna']][i]! }));
  const pandemia = cap('pandemia', 'Pandemia', 'epoca', { inicio: { ano: 2020, mes: 3 }, fim: { ano: 2021, mes: 12 } });

  it('sem dizer de quem é, o capítulo de época continua como hoje: toda memória do período é dele', () => {
    const r = montarTrilhos(comQuem, [pandemia]);
    expect(r.epocas).toEqual([]);
    expect(r.linhas.slice(1, 5).map((l) => l.trilhos[0])).toEqual(['preso', 'preso', 'preso', 'preso']);
  });

  it('a época de todos não vira trilho: vira uma marca no alto e outra no fim', () => {
    const r = montarTrilhos(comQuem, [{ ...pandemia, deTodos: true }]);
    expect(r.quantos).toBe(0);
    expect(r.epocas).toEqual([{ id: 'pandemia', titulo: 'Pandemia', periodo: 'mar de 2020 a dez de 2021', primeira: 1, ultima: 4 }]);
    expect(r.linhas[1]!.epocaAbre).toEqual(['pandemia']);
    expect(r.linhas[4]!.epocaFecha).toEqual(['pandemia']);
    expect(r.linhas[0]!.epocaAbre).toEqual([]);
  });

  it('no capítulo com período e pessoas, as memórias do período sem essas pessoas ficam de fora', () => {
    const r = montarTrilhos(comQuem, [{ ...pandemia, id: 'gio-em-casa', titulo: 'A Giovanna em casa', pessoas: ['giovanna'] }]);
    // O trilho vai do começo ao fim do período, e segue tracejado nas memórias em que ela não está
    expect([r.capitulos[0]!.primeira, r.capitulos[0]!.ultima]).toEqual([1, 4]);
    expect(r.linhas.map((l) => l.trilhos[0])).toEqual([null, 'preso', 'fora', 'preso', 'fora', null]);
    expect(r.linhas[2]!.capitulos).toEqual([]);
    expect(r.linhas[1]!.capitulos).toEqual(['gio-em-casa']);
  });

  it('os trilhos dos capítulos atravessam a marca de uma época', () => {
    const r = montarTrilhos(comQuem.map((x) => ({ ...x, capitulos: x.integrantes.includes('giovanna') ? ['gio'] : [] })), [{ ...pandemia, deTodos: true }, cap('gio', 'Giovanna', 'reunido')]);
    // O capítulo da Giovanna vem de cima (o casamento) e continua depois da época (o almoço)
    expect(trilhosNaEpoca(r, 1, 'abre')).toEqual(['preso']);
    expect(trilhosNaEpoca(r, 4, 'fecha')).toEqual(['preso']);
    // Antes de qualquer capítulo começar, nada passa
    expect(trilhosNaEpoca(r, 0, 'abre')).toEqual([null]);
  });
});

describe('quantos trilhos cabem', () => {
  it('no celular cabem dois; a partir do terceiro, o capítulo vira etiqueta na memória', () => {
    expect(CABEM.celular).toBe(2);
    expect(comoAparece(0, CABEM.celular)).toBe('trilho');
    expect(comoAparece(1, CABEM.celular)).toBe('trilho');
    expect(comoAparece(2, CABEM.celular)).toBe('etiqueta');
    expect(comoAparece(3, CABEM.computador)).toBe('trilho');
    expect(comoAparece(4, CABEM.computador)).toBe('etiqueta');
    expect(montagem.quantos).toBeGreaterThan(CABEM.celular);
  });
});

describe('visibilidade', () => {
  it('capítulo sem nenhuma memória nesta linha do tempo não aparece', () => {
    // Quem chama só entrega as memórias que a pessoa vê: sem a única memória do capítulo, ele some
    const semChico = montarTrilhos(memorias.filter((x) => x.id !== 'chico'), capitulos);
    expect(semChico.capitulos.map((c) => c.id)).not.toContain('so-nos');
    expect(semChico.linhas.every((l) => !l.capitulos.includes('so-nos'))).toBe(true);
  });

  it('o trilho só conta as memórias entregues', () => {
    const soAntigas = montarTrilhos(memorias.filter((x) => x.ano < 2010), capitulos);
    expect(soAntigas.capitulos.map((c) => c.id).sort()).toEqual(['natais', 'natais-vivica', 'viagens']);
    expect(soAntigas.capitulos.find((c) => c.id === 'natais')!.periodo).toBe('1994 a 2006');
  });

  it('capítulo de dentro cujo capítulo maior a pessoa não vê aparece solto', () => {
    const semOPai = montarTrilhos(memorias, capitulos.filter((c) => c.id !== 'casal'));
    expect(semOPai.capitulos.find((c) => c.id === 'so-nos')!.dentroDe).toBeNull();
  });

  it('sem capítulos, não há trilhos', () => {
    const vazio = montarTrilhos(memorias, []);
    expect(vazio.quantos).toBe(0);
    expect(vazio.linhas).toHaveLength(memorias.length);
  });
});
