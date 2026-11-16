// Capítulos na linha do tempo: a montagem dos trilhos, sem tela (docs/decisoes.md).
import { describe, expect, it } from 'vitest';
import { CABEM, capitulosNosTrilhos, chaoDaEpoca, comoAparece, montarTrilhos, trilhosNaEpoca, trilhosNaMarca, type CapituloDaLinha, type MemoriaDaLinha } from '../src/lib/linha-capitulos';

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
describe('época de todos e capítulo com período e pessoas', () => {
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

describe('épocas que se sobrepõem', () => {
  // Pedido do Gui, 16/11/2026: como fica se parte de uma época coincidir com outra? O chão fica um
  // tom mais fundo onde as duas valem, e cada uma tem a sua aba no alto e no fim.
  const epoca = (id: string, titulo: string, inicio: [number, number], fim: [number, number]) =>
    cap(id, titulo, 'epoca', { inicio: { ano: inicio[0], mes: inicio[1] }, fim: { ano: fim[0], mes: fim[1] }, deTodos: true });
  const covid = epoca('covid', 'Pandemia de COVID-19', [2020, 3], [2023, 5]);
  const casa = epoca('casa', 'Os anos de casa', [2020, 3], [2021, 12]);
  const r = montarTrilhos(memorias, [covid, casa]);
  const l = (id: string) => r.linhas.find((x) => x.id === id)!;
  const posicao = (id: string) => r.linhas.findIndex((x) => x.id === id);

  it('cada memória sabe em quantas épocas está', () => {
    expect(l('noivado').epocas).toBe(0);
    expect(l('chico').epocas).toBe(1);
    expect(l('formatura').epocas).toBe(2);
    expect(l('video').epocas).toBe(2);
    expect(l('almoco').epocas).toBe(0);
  });

  it('entre um ano e outro, o chão é o das épocas que vêm de cima e continuam', () => {
    expect(l('chico').epocasDeCima).toBe(0);
    // Em 2021 a pandemia já vinha de 2023; os anos de casa começam ali
    expect(l('formatura').epocasDeCima).toBe(1);
    expect(l('natal-20').epocasDeCima).toBe(2);
    expect(l('almoco').epocasDeCima).toBe(0);
  });

  it('a aba do alto sai do chão de fora, e a de dentro abre sobre a de fora', () => {
    expect(l('chico').epocaAbre).toEqual(['covid']);
    expect(chaoDaEpoca(r, posicao('chico'), 'covid', 'abre')).toEqual({ fora: 0, dentro: 1 });
    expect(chaoDaEpoca(r, posicao('formatura'), 'casa', 'abre')).toEqual({ fora: 1, dentro: 2 });
  });

  it('duas épocas que acabam juntas fecham da de dentro para a de fora', () => {
    expect(l('video').epocaFecha).toEqual(['casa', 'covid']);
    expect(chaoDaEpoca(r, posicao('video'), 'casa', 'fecha')).toEqual({ fora: 1, dentro: 2 });
    expect(chaoDaEpoca(r, posicao('video'), 'covid', 'fecha')).toEqual({ fora: 0, dentro: 1 });
  });

  it('duas épocas que abrem juntas: a que vai mais longe abre primeiro', () => {
    const juntas = montarTrilhos(memorias, [epoca('curta', 'Curta', [2021, 1], [2023, 5]), epoca('longa', 'Longa', [2019, 1], [2023, 5])]);
    const chico = juntas.linhas.findIndex((x) => x.id === 'chico');
    expect(juntas.linhas[chico]!.epocaAbre).toEqual(['longa', 'curta']);
    expect(chaoDaEpoca(juntas, chico, 'longa', 'abre')).toEqual({ fora: 0, dentro: 1 });
    expect(chaoDaEpoca(juntas, chico, 'curta', 'abre')).toEqual({ fora: 1, dentro: 2 });
  });

  it('uma época que acaba no meio da outra: o chão volta um tom, e não a zero', () => {
    // Na tela, de cima para baixo: entra a de 2021 a 2026, depois a de 2019 a 2023; a primeira acaba em 2021
    const cruzadas = montarTrilhos(memorias, [epoca('nova', 'Nova', [2021, 1], [2026, 12]), epoca('velha', 'Velha', [2019, 1], [2023, 5])]);
    const em = (id: string) => cruzadas.linhas.find((x) => x.id === id)!;
    expect([em('noivado').epocas, em('chico').epocas, em('dudu').epocas, em('natal-20').epocas, em('almoco').epocas]).toEqual([1, 2, 2, 1, 1]);
    const dudu = cruzadas.linhas.findIndex((x) => x.id === 'dudu');
    expect(chaoDaEpoca(cruzadas, dudu, 'nova', 'fecha')).toEqual({ fora: 1, dentro: 2 });
  });
});

describe('capítulo com período, de uma família', () => {
  // Decisão do Gui, 16/11/2026: o capítulo por período pode ser de pessoas ou de uma família
  const comFamilia: MemoriaDaLinha[] = [
    { ...m('a', 2022, 5), integrantes: ['x'], nucleos: ['bayara'] },
    { ...m('b', 2021, 5), integrantes: ['y'], nucleos: ['bracarense'] },
    { ...m('c', 2020, 5), integrantes: ['giovanna'], nucleos: [] },
    { ...m('d', 2019, 5), integrantes: ['x'], nucleos: ['bayara', 'bracarense'] },
  ];
  const periodo = { inicio: { ano: 2019, mes: 1 }, fim: { ano: 2022, mes: 12 } };

  it('entram as memórias do período que são da família; as outras ficam de fora, com o trilho tracejado', () => {
    const r = montarTrilhos(comFamilia, [cap('obra', 'A obra da casa', 'epoca', { ...periodo, familias: ['bayara'] })]);
    expect(r.linhas.map((x) => x.trilhos[0])).toEqual(['preso', 'fora', 'fora', 'preso']);
  });

  it('pode ser de pessoas e de uma família ao mesmo tempo', () => {
    const r = montarTrilhos(comFamilia, [cap('obra', 'A obra da casa', 'epoca', { ...periodo, familias: ['bayara'], pessoas: ['giovanna'] })]);
    expect(r.linhas.map((x) => x.trilhos[0])).toEqual(['preso', 'fora', 'preso', 'preso']);
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
