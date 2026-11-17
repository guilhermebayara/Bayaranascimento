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
  eu: 'giovanna',
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
  it('os relatos de quem está olhando: onde já contou, e onde estava e ainda não contou', () => {
    expect(ids({ contou: true })).toEqual(['casamento', 'praia-98']);
    expect(ids({ falta: true })).toEqual(['natal-20', 'casa-nova']);
  });
  it('valem só para quem está olhando: o endereço com outra pessoa dá o da própria', () => {
    const f = lerFiltros(new URLSearchParams('contou=gui&falta=elizete'));
    expect([f.contou, f.falta]).toEqual([true, true]);
    expect(paraEndereco(f).toString()).toBe('contou=1&falta=1');
    // Giovanna olhando com "contou=gui" vê onde ela contou, e não onde o Gui contou
    expect(explorar(memorias, lerFiltros(new URLSearchParams('contou=gui')), ctx).memorias.map((x) => x.id)).toEqual(['casamento', 'praia-98']);
    expect(explorar(memorias, lerFiltros(new URLSearchParams('contou=gui')), { ...ctx, eu: 'gui' }).memorias.map((x) => x.id)).toEqual(['natal-94']);
  });
});

describe('combinações', () => {
  it('filtros diferentes se somam', () => {
    expect(ids({ tipos: ['natal'], pessoas: ['giovanna'] })).toEqual(['natal-20']);
    expect(ids({ familias: ['bayara-bracarense'], comAudio: true })).toEqual(['casamento']);
    expect(ids({ de: 2020, falta: true })).toEqual(['natal-20']);
    expect(ids({ comFoto: true, contou: true, pessoas: ['giovanna'] })).toEqual(['casamento', 'praia-98']);
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
    const f: Filtros = { ...SEM_FILTRO, tipos: ['natal'], pessoas: ['gui', 'elizete'], familias: ['bayara-nascimento'], capitulos: ['natais'], temas: ['natal'], de: 1990, ate: 2000, decada: null, comAudio: true, comFoto: true, contou: true, falta: false, ordem: 'contadas' };
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
    // Pessoas juntas mantém os trilhos, como família (decisão do Gui, 16/11/2026)
    expect(mostraTrilhos({ ...SEM_FILTRO, pessoas: ['gui', 'giovanna'] })).toBe(true);
    for (const quebra of [{ tipos: ['natal'] }, { comAudio: true }, { comFoto: true }, { contou: true }, { falta: true }]) {
      expect(mostraTrilhos({ ...SEM_FILTRO, ...quebra })).toBe(false);
    }
  });
});

// A tela do Explorar: as formas de ver, o endereço de cada uma e o resumo dos filtros
describe('formas de ver e endereço', async () => {
  const { FORMAS, SEM_FILTRO, enderecoDoExplorar, lerFiltros, lerForma, resumoDosFiltros, vizinhasNaLista } = await import('../src/lib/explorar');

  it('sem "ver", ou com um valor que não existe, vale a linha do tempo', () => {
    expect(FORMAS).toEqual(['linha', 'mural', 'tv', 'acaso']);
    expect(lerForma(new URLSearchParams(''))).toBe('linha');
    expect(lerForma(new URLSearchParams('ver=mural'))).toBe('mural');
    expect(lerForma(new URLSearchParams('ver=carrossel'))).toBe('linha');
  });

  it('o endereço guarda os filtros, a ordem e a forma de ver, sem o que está no padrão', () => {
    expect(enderecoDoExplorar(SEM_FILTRO)).toBe('/explorar');
    const f = { ...SEM_FILTRO, tipos: ['viagem'], familias: ['bayara'], comFoto: true, ordem: 'antigas' as const };
    const endereco = enderecoDoExplorar(f, 'tv', { m: '2025-natal', passar: undefined });
    expect(endereco).toBe('/explorar?tipo=viagem&nucleo=bayara&foto=1&ordem=antigas&ver=tv&m=2025-natal');
    // Trocar de forma de ver não perde nenhum filtro
    const p = new URLSearchParams(endereco.split('?')[1]);
    expect(lerFiltros(p)).toEqual(f);
    expect(lerForma(p)).toBe('tv');
  });

  it('o resumo escreve o que está ligado, e cala o que o endereço pede e não existe', () => {
    const nomes = {
      tipo: (id: string) => ({ viagem: 'Viagem' })[id],
      pessoa: (id: string) => ({ gui: 'Gui', giovanna: 'Giovanna' })[id],
      capitulo: (id: string) => ({ natais: 'Natais' })[id],
      tema: () => undefined,
    };
    expect(resumoDosFiltros(SEM_FILTRO, nomes)).toEqual([]);
    // A família tem o controle dela: não entra no resumo
    expect(resumoDosFiltros({ ...SEM_FILTRO, familias: ['bayara'] }, nomes)).toEqual([]);
    const f = { ...SEM_FILTRO, tipos: ['viagem', 'apagado'], pessoas: ['gui', 'giovanna'], capitulos: ['natais', 'secreto'], temas: ['x'], decada: 1990, comFoto: true, falta: true };
    expect(resumoDosFiltros(f, nomes)).toEqual(['Viagem', 'com Gui e Giovanna juntos', 'Natais', 'anos 1990', 'com foto', 'você estava e ainda não contou']);
    expect(resumoDosFiltros({ ...SEM_FILTRO, de: 1990, ate: 1994 }, nomes)).toEqual(['de 1990 a 1994']);
    expect(resumoDosFiltros({ ...SEM_FILTRO, de: 1990 }, nomes)).toEqual(['de 1990 em diante']);
    expect(resumoDosFiltros({ ...SEM_FILTRO, ate: 1994 }, nomes)).toEqual(['até 1994']);
  });

  it('"Passar sozinho" guarda no endereço o tempo escolhido, entre 8, 10 e 15 segundos, e a pausa', async () => {
    // Decisão do Gui, 17/11/2026
    const { TEMPOS_DE_PASSAR, TEMPO_DE_PASSAR_PADRAO, lerPassar, passarNoEndereco } = await import('../src/lib/explorar');
    expect([...TEMPOS_DE_PASSAR]).toEqual([8, 10, 15]);
    expect(TEMPO_DE_PASSAR_PADRAO).toBe(10);
    const ler = (busca: string) => lerPassar(new URLSearchParams(busca));
    // Sem "passar", nada passa sozinho, e a pausa sozinha não liga nada
    expect(ler('')).toEqual({ tempo: null, pausado: false });
    expect(ler('pausa=1')).toEqual({ tempo: null, pausado: false });
    expect(ler('passar=8')).toEqual({ tempo: 8, pausado: false });
    expect(ler('passar=15&pausa=1')).toEqual({ tempo: 15, pausado: true });
    // Tempo fora da lista vale o padrão: ninguém põe 1 segundo pelo endereço
    for (const fora of ['1', '0', '3600', 'abc', '']) expect(ler(`passar=${fora}`).tempo).toBe(10);
    // Ida e volta pelo endereço
    for (const estado of [{ tempo: null, pausado: false }, { tempo: 8, pausado: false }, { tempo: 15, pausado: true }]) {
      const endereco = enderecoDoExplorar(SEM_FILTRO, 'tv', { m: 'a', ...passarNoEndereco(estado) });
      expect(lerPassar(new URLSearchParams(endereco.split('?')[1]))).toEqual(estado);
    }
    expect(enderecoDoExplorar(SEM_FILTRO, 'tv', { m: 'a', ...passarNoEndereco({ tempo: 15, pausado: true }) })).toBe('/explorar?ver=tv&m=a&passar=15&pausa=1');
  });

  it('no modo TV, a de antes e a de depois saem da lista filtrada, na ordem dela', () => {
    const lista = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(vizinhasNaLista(lista, 'b')).toEqual({ posicao: 1, antes: { id: 'a' }, depois: { id: 'c' } });
    expect(vizinhasNaLista(lista, 'a').antes).toBeUndefined();
    expect(vizinhasNaLista(lista, 'c').depois).toBeUndefined();
    expect(vizinhasNaLista(lista, 'fora').posicao).toBe(-1);
  });
});
