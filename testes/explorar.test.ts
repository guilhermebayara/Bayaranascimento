// Explorar (docs/decisoes.md): cada filtro e cada ordem, as combinações, o sorteio só entre as
// visíveis e a regra de quando os trilhos aparecem. Regras em src/lib/explorar.ts.
import { describe, expect, it } from 'vitest';
import { explorar, lerFiltros, mostraTrilhos, ordenar, paraEndereco, SEM_FILTRO, sortear, temFiltro, type Contexto, type Filtros } from '../src/lib/explorar';

const m = (id: string, ano: number, o: Partial<{ mes: number; tipo: string; integrantes: string[]; nucleos: string[]; temas: string[]; fotos: number; relatos: number; criadaEm: string }> = {}) => ({
  id,
  ano,
  mes: o.mes ?? null,
  dia: null,
  tipo: o.tipo ?? 'festa',
  integrantes: o.integrantes ?? [],
  nucleos: o.nucleos ?? ['bayara-nascimento'],
  temas: o.temas ?? [],
  fotos: Array(o.fotos ?? 0).fill(0),
  relatos: o.relatos ?? 0,
  criadaEm: o.criadaEm ?? '2026-11-01 10:00:00',
});

// As memórias que a pessoa vê
const memorias = [
  m('natal-94', 1994, { mes: 12, tipo: 'natal', integrantes: ['gui', 'elizete'], temas: ['natal'], fotos: 2, relatos: 3, criadaEm: '2026-11-03 10:00:00' }),
  m('praia-98', 1998, { tipo: 'viagem', integrantes: ['gui', 'giovanna'], fotos: 1, relatos: 1, criadaEm: '2026-11-05 10:00:00' }),
  m('casa-nova', 2019, { tipo: 'casa', integrantes: ['giovanna', 'lucas-magno'], nucleos: ['bayara-bracarense'], relatos: 2, criadaEm: '2026-11-02 10:00:00' }),
  m('natal-20', 2020, { mes: 12, tipo: 'natal', integrantes: ['gui', 'elizete', 'giovanna'], temas: ['natal'], fotos: 1, criadaEm: '2026-11-04 10:00:00' }),
  m('casamento', 2026, { mes: 5, tipo: 'casamento', integrantes: ['giovanna', 'lucas-magno'], nucleos: ['bayara-bracarense', 'bracarense'], fotos: 4, relatos: 2, criadaEm: '2026-11-01 10:00:00' }),
];
const ctx: Contexto = {
  doCapitulo: (memoria, capitulo) => capitulo === 'natais' && memoria.startsWith('natal'),
  comAudio: new Set(['natal-94', 'casamento']),
  contaram: new Map([
    ['natal-94', new Set(['gui', 'elizete'])],
    ['praia-98', new Set(['giovanna'])],
    ['casamento', new Set(['giovanna'])],
  ]),
};
const ids = (f: Partial<Filtros>) => explorar(memorias, { ...SEM_FILTRO, ...f }, ctx).memorias.map((x) => x.id);

describe('cada filtro', () => {
  it('tipo de momento, um ou outro', () => {
    expect(ids({ tipos: ['natal'] })).toEqual(['natal-20', 'natal-94']);
    expect(ids({ tipos: ['natal', 'casa'] })).toEqual(['natal-20', 'casa-nova', 'natal-94']);
  });
  it('pessoas juntas: a memória tem todas', () => {
    expect(ids({ pessoas: ['gui', 'giovanna'] })).toEqual(['natal-20', 'praia-98']);
  });
  it('família', () => {
    expect(ids({ familias: ['bracarense'] })).toEqual(['casamento']);
    expect(ids({ familias: ['bayara-bracarense'] })).toEqual(['casamento', 'casa-nova']);
  });
  it('capítulo e tema', () => {
    expect(ids({ capitulos: ['natais'] })).toEqual(['natal-20', 'natal-94']);
    expect(ids({ temas: ['natal'] })).toEqual(['natal-20', 'natal-94']);
    expect(ids({ capitulos: ['de-ninguem'] })).toEqual([]);
  });
  it('período, de um ano a outro, e década', () => {
    expect(ids({ de: 1995, ate: 2020 })).toEqual(['natal-20', 'casa-nova', 'praia-98']);
    expect(ids({ de: 2020 })).toEqual(['casamento', 'natal-20']);
    expect(ids({ decada: 1990 })).toEqual(['praia-98', 'natal-94']);
  });
  it('com áudio e com foto', () => {
    expect(ids({ comAudio: true })).toEqual(['casamento', 'natal-94']);
    expect(ids({ comFoto: true })).toEqual(['casamento', 'natal-20', 'praia-98', 'natal-94']);
  });
  it('os relatos da pessoa: onde já contou, e onde estava e ainda não contou', () => {
    expect(ids({ contou: 'giovanna' })).toEqual(['casamento', 'praia-98']);
    expect(ids({ falta: 'giovanna' })).toEqual(['natal-20', 'casa-nova']);
  });
});

describe('combinações', () => {
  it('filtros diferentes se somam', () => {
    expect(ids({ tipos: ['natal'], pessoas: ['giovanna'] })).toEqual(['natal-20']);
    expect(ids({ familias: ['bayara-bracarense'], comAudio: true })).toEqual(['casamento']);
    expect(ids({ decada: 1990, falta: 'gui' })).toEqual(['praia-98']);
    expect(ids({ comFoto: true, contou: 'gui', capitulos: ['natais'] })).toEqual(['natal-94']);
  });
});

describe('cada ordem', () => {
  it('mais recentes primeiro (o padrão), mais antigas, entraram por último e mais contadas', () => {
    expect(ordenar(memorias, 'recentes').map((x) => x.id)).toEqual(['casamento', 'natal-20', 'casa-nova', 'praia-98', 'natal-94']);
    expect(ordenar(memorias, 'antigas').map((x) => x.id)).toEqual(['natal-94', 'praia-98', 'casa-nova', 'natal-20', 'casamento']);
    expect(ordenar(memorias, 'entraram').map((x) => x.id)).toEqual(['praia-98', 'natal-20', 'natal-94', 'casa-nova', 'casamento']);
    // Empate em relatos: a mais recente primeiro
    expect(ordenar(memorias, 'contadas').map((x) => x.id)).toEqual(['natal-94', 'casamento', 'casa-nova', 'praia-98', 'natal-20']);
  });
  it('ordem e filtro juntos', () => {
    expect(ids({ tipos: ['natal'], ordem: 'antigas' })).toEqual(['natal-94', 'natal-20']);
  });
});

describe('o endereço', () => {
  it('guarda os filtros e a ordem, para mandar o link', () => {
    const f: Filtros = { ...SEM_FILTRO, tipos: ['natal'], pessoas: ['gui', 'elizete'], familias: ['bayara-nascimento'], capitulos: ['natais'], temas: ['natal'], de: 1990, ate: 2000, decada: null, comAudio: true, comFoto: true, contou: 'gui', falta: null, ordem: 'contadas' };
    expect(lerFiltros(paraEndereco(f))).toEqual(f);
    expect(paraEndereco(SEM_FILTRO).toString()).toBe('');
  });
  it('os atalhos das famílias ("?nucleo=") ligam o filtro de família', () => {
    expect(lerFiltros(new URLSearchParams('nucleo=bracarense')).familias).toEqual(['bracarense']);
  });
  it('o que não faz sentido é ignorado', () => {
    const f = lerFiltros(new URLSearchParams('ordem=sorteio&de=abc&decada=1995&ate=99999&audio=sim'));
    expect(f).toEqual(SEM_FILTRO);
    expect(temFiltro(f)).toBe(false);
    expect(temFiltro({ ...SEM_FILTRO, ordem: 'antigas' })).toBe(false);
    expect(temFiltro({ ...SEM_FILTRO, comFoto: true })).toBe(true);
  });
});

describe('ao acaso', () => {
  it('sorteia só entre as memórias que passam nos filtros, que já são só as que a pessoa vê', () => {
    const vistas = explorar(memorias, { ...SEM_FILTRO, tipos: ['natal'] }, ctx).memorias;
    for (const sorte of [0, 0.3, 0.6, 0.99]) expect(['natal-20', 'natal-94']).toContain(sortear(vistas, null, () => sorte)!.id);
  });
  it('não repete a anterior quando há mais de uma', () => {
    for (const sorte of [0, 0.5, 0.99]) expect(sortear(memorias, 'casamento', () => sorte)!.id).not.toBe('casamento');
    expect(sortear([memorias[0]!], 'natal-94')!.id).toBe('natal-94');
    expect(sortear([], null)).toBeUndefined();
  });
  it('o contexto não acrescenta memória que a pessoa não vê', () => {
    const comOutra: Contexto = { ...ctx, comAudio: new Set([...ctx.comAudio, 'restrita']), contaram: new Map([...ctx.contaram, ['restrita', new Set(['gui'])]]) };
    const r = explorar(memorias, { ...SEM_FILTRO, comAudio: true }, comOutra);
    expect(r.memorias.map((x) => x.id)).not.toContain('restrita');
    expect(r.total).toBe(2);
  });
});

describe('quando os trilhos aparecem', () => {
  it('só na ordem por data e sem filtro que quebre a continuidade', () => {
    expect(mostraTrilhos(SEM_FILTRO)).toBe(true);
    expect(mostraTrilhos({ ...SEM_FILTRO, ordem: 'antigas' })).toBe(true);
    expect(mostraTrilhos({ ...SEM_FILTRO, familias: ['bracarense'], capitulos: ['natais'], temas: ['natal'], decada: 1990 })).toBe(true);
    expect(mostraTrilhos({ ...SEM_FILTRO, ordem: 'entraram' })).toBe(false);
    expect(mostraTrilhos({ ...SEM_FILTRO, ordem: 'contadas' })).toBe(false);
    for (const quebra of [{ tipos: ['natal'] }, { comAudio: true }, { comFoto: true }, { contou: 'gui' }, { falta: 'gui' }]) {
      expect(mostraTrilhos({ ...SEM_FILTRO, ...quebra })).toBe(false);
    }
  });
});
