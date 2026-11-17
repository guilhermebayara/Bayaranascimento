// Explorar (docs/decisoes.md): cada filtro e cada ordem, as combinações, o sorteio só entre as
// visíveis e a regra de quando os trilhos aparecem. Regras em src/lib/explorar.ts.
import { describe, expect, it } from 'vitest';
import { explorar, lerFiltros, mostraTrilhos, ordenar, paraEndereco, SEM_FILTRO, sortear, temFiltro, type Contexto, type Filtros, SEGUNDOS_DOS_CONTROLES, reacaoEmSoFotos } from '../src/lib/explorar';

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
    expect(FORMAS).toEqual(['linha', 'mural', 'lista', 'tv', 'acaso']);
    expect(lerForma(new URLSearchParams('ver=lista'))).toBe('lista');
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

  it('com mais de uma família marcada, entram as memórias de qualquer uma delas, só entre as que a pessoa vê', async () => {
    // Decisão do Gui, 16/11/2026. Quem chama entrega só o que a pessoa vê: o filtro nunca acrescenta
    const { alternarFamilia, explorar, passa } = await import('../src/lib/explorar');
    const m = (id: string, nucleos: string[]) => ({ id, ano: 2000, mes: null, dia: null, tipo: 'festa', integrantes: [], nucleos, temas: [], fotos: [], relatos: 0, criadaEm: id });
    const ctx = { eu: 'gui', doCapitulo: () => false, comAudio: new Set<string>(), contaram: new Map<string, Set<string>>() };
    const vistas = [m('a', ['bayara']), m('b', ['bracarense']), m('c', ['bayara-bracarense']), m('d', ['bayara', 'bracarense']), m('e', [])];
    const ids = (familias: string[]) => explorar(vistas, { ...SEM_FILTRO, familias }, ctx).memorias.map((x) => x.id).sort();
    expect(ids(['bayara'])).toEqual(['a', 'd']);
    expect(ids(['bayara', 'bracarense'])).toEqual(['a', 'b', 'd']);
    expect(ids(['bayara', 'bracarense', 'bayara-bracarense'])).toEqual(['a', 'b', 'c', 'd']);
    // Nada além do que foi entregue: a memória que a pessoa não vê não está na lista e não aparece
    expect(passa(m('z', ['bracarense']), { ...SEM_FILTRO, familias: ['bayara', 'bracarense'] }, ctx)).toBe(true);
    expect(ids(['bayara', 'bracarense'])).not.toContain('z');
    // E os outros filtros continuam valendo com "e"
    expect(explorar(vistas, { ...SEM_FILTRO, familias: ['bayara', 'bracarense'], tipos: ['viagem'] }, ctx).memorias).toEqual([]);

    // Cada toque liga ou desliga só aquela família, na ordem das famílias do site
    const todas = ['bayara', 'bayara-bracarense', 'bracarense'];
    expect(alternarFamilia([], 'bracarense', todas)).toEqual(['bracarense']);
    expect(alternarFamilia(['bracarense'], 'bayara', todas)).toEqual(['bayara', 'bracarense']);
    expect(alternarFamilia(['bayara', 'bracarense'], 'bayara', todas)).toEqual(['bracarense']);
    expect(alternarFamilia(['bracarense'], 'bracarense', todas)).toEqual([]);
    expect(alternarFamilia([], 'desconhecida', todas)).toEqual([]);
    // Marcar todas é a família completa: o filtro desliga sozinho (decisão do Gui, 17/11/2026)
    expect(alternarFamilia(['bayara', 'bracarense'], 'bayara-bracarense', todas)).toEqual([]);
    expect(alternarFamilia(['bayara'], 'bracarense', ['bayara', 'bracarense'])).toEqual([]);
    // No endereço, as duas
    expect(enderecoDoExplorar({ ...SEM_FILTRO, familias: ['bayara', 'bracarense'] })).toBe('/explorar?nucleo=bayara&nucleo=bracarense');
  });

  it('depois de uma troca, a rolagem volta ao ano mais próximo quando o da pessoa saiu', async () => {
    const { anoMaisProximo } = await import('../src/lib/explorar');
    expect(anoMaisProximo([2026, 2019, 1994], 2019)).toBe(2019);
    expect(anoMaisProximo([2026, 2021, 1994], 2019)).toBe(2021);
    expect(anoMaisProximo([2026, 1994], 2000)).toBe(1994);
    // No empate, o mais antigo: na ordem de sempre, é o que vem logo abaixo
    expect(anoMaisProximo([2021, 2017], 2019)).toBe(2017);
    expect(anoMaisProximo([2017, 2021], 2019)).toBe(2017);
    expect(anoMaisProximo([], 2019)).toBeUndefined();
  });

  it('o movimento do modo TV tem três versões, e fora delas vale a primeira', async () => {
    const { MOVIMENTOS, lerMovimento, movimentoNoEndereco } = await import('../src/lib/explorar');
    expect(MOVIMENTOS.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(lerMovimento(new URLSearchParams(''))).toBe('a');
    expect(lerMovimento(new URLSearchParams('mov=c'))).toBe('c');
    expect(lerMovimento(new URLSearchParams('mov=z'))).toBe('a');
    expect(enderecoDoExplorar(SEM_FILTRO, 'tv', movimentoNoEndereco('a'))).toBe('/explorar?ver=tv');
    expect(enderecoDoExplorar(SEM_FILTRO, 'tv', movimentoNoEndereco('b'))).toBe('/explorar?ver=tv&mov=b');
  });

  it('o tamanho das fotos do mural fica no endereço, e o médio é o padrão', async () => {
    // Decisão do Gui, 17/11/2026
    const { TAMANHOS, lerTamanho, tamanhoNoEndereco } = await import('../src/lib/explorar');
    expect(TAMANHOS).toEqual(['pequenas', 'medias', 'grandes']);
    expect(lerTamanho(new URLSearchParams(''))).toBe('medias');
    expect(lerTamanho(new URLSearchParams('tamanho=enormes'))).toBe('medias');
    expect(enderecoDoExplorar(SEM_FILTRO, 'mural', tamanhoNoEndereco('medias'))).toBe('/explorar?ver=mural');
    for (const t of TAMANHOS) {
      const endereco = enderecoDoExplorar(SEM_FILTRO, 'mural', tamanhoNoEndereco(t));
      expect(lerTamanho(new URLSearchParams(endereco.split('?')[1]))).toBe(t);
    }
  });

  it('no modo TV, a de antes e a de depois saem da lista filtrada, na ordem dela', () => {
    const lista = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(vizinhasNaLista(lista, 'b')).toEqual({ posicao: 1, antes: { id: 'a' }, depois: { id: 'c' } });
    expect(vizinhasNaLista(lista, 'a').antes).toBeUndefined();
    expect(vizinhasNaLista(lista, 'c').depois).toBeUndefined();
    expect(vizinhasNaLista(lista, 'fora').posicao).toBe(-1);
  });
});

// Defeito achado pelo Gui em 17/11/2026: depois de "Só as fotos", no modo TV, não dava para voltar
// ao texto nem chegar aos ajustes. A regra do que cada gesto faz está em reacaoEmSoFotos, e o
// script do palco só obedece (testes/visual.test.ts confere a ligação).
describe('"Só as fotos", no modo TV: sempre existe caminho de volta', () => {
  const tecla = (t: string) => ({ tipo: 'tecla', tecla: t }) as const;

  it('pelo teclado: o Esc volta ao modo com texto, com os controles à vista ou escondidos', () => {
    expect(reacaoEmSoFotos(tecla('Escape'), false)).toBe('voltar-ao-texto');
    expect(reacaoEmSoFotos(tecla('Escape'), true)).toBe('voltar-ao-texto');
  });

  it('pelo teclado e pelo controle da TV: qualquer outra tecla traz os controles de volta', () => {
    for (const t of ['Enter', 'ArrowUp', 'ArrowDown', ' ', 'Tab', 'MediaPlayPause', 'ContextMenu', 'a']) expect(reacaoEmSoFotos(tecla(t), false), t).toBe('mostrar-controles');
  });

  it('pelo toque, pelo clique e pelo mouse: os controles voltam', () => {
    expect(reacaoEmSoFotos({ tipo: 'toque' }, false)).toBe('mostrar-controles');
    expect(reacaoEmSoFotos({ tipo: 'mouse' }, false)).toBe('mostrar-controles');
  });

  it('as setas para os lados continuam trocando de memória, sem mostrar os controles', () => {
    for (const visiveis of [false, true]) {
      expect(reacaoEmSoFotos(tecla('ArrowRight'), visiveis)).toBe('passar');
      expect(reacaoEmSoFotos(tecla('ArrowLeft'), visiveis)).toBe('passar');
    }
  });

  it('com os controles à vista, o gesto faz o que sempre fez (o Enter aciona "Mostrar o texto")', () => {
    expect(reacaoEmSoFotos(tecla('Enter'), true)).toBe('seguir');
    expect(reacaoEmSoFotos({ tipo: 'toque' }, true)).toBe('seguir');
  });

  it('nenhum gesto fica sem saída: de qualquer estado, em no máximo dois passos se volta ao texto', () => {
    // Teclado: Enter mostra os controles com o foco em "Mostrar o texto", e o segundo Enter o aciona.
    // Toque: o primeiro traz os controles, o segundo cai em "Mostrar o texto".
    for (const gesto of [tecla('Enter'), { tipo: 'toque' } as const]) {
      const primeiro = reacaoEmSoFotos(gesto, false);
      expect(primeiro).toBe('mostrar-controles');
      expect(reacaoEmSoFotos(gesto, true)).toBe('seguir');
    }
    expect(SEGUNDOS_DOS_CONTROLES).toBeGreaterThanOrEqual(4);
  });
});

// A lista (pedido do Gui, 17/11/2026): uma memória por linha. As partes da linha que têm regra.
describe('a lista: as partes de cada linha', async () => {
  const { FORMAS_DA_PESSOA, dataNaLista, enderecoDaPessoa, enderecoDoExplorar, lerFormaDaPessoa, mostraRascunho, nomeCurto, quemNaLista, SEM_FILTRO } = await import('../src/lib/explorar');
  const data = (ano: number, mes: number | null = null, dia: number | null = null, aproximada = false) => ({ ano, mes, dia, aproximada });

  it('dentro do bloco do ano, a data é só o dia e o mês', () => {
    expect(dataNaLista(data(2025, 12, 24), true)).toBe('24 dez');
    expect(dataNaLista(data(2025, 12), true)).toBe('dez');
    // quem só tem o ano fica sem nada: o ano já está no alto do bloco
    expect(dataNaLista(data(2025), true)).toBe('');
  });

  it('a data aproximada diz "por volta de", com o mês quando ele é conhecido e sem o dia', () => {
    expect(dataNaLista(data(1994, null, null, true), true)).toBe('por volta de');
    expect(dataNaLista(data(1994, 8, null, true), true)).toBe('por volta de ago');
    expect(dataNaLista(data(1994, 8, 14, true), true)).toBe('por volta de ago');
  });

  it('fora da ordem do tempo não há bloco de ano: a data vai inteira', () => {
    expect(dataNaLista(data(2025, 12, 24), false)).toBe('24 dez 2025');
    expect(dataNaLista(data(2025), false)).toBe('2025');
    expect(dataNaLista(data(1994, null, null, true), false)).toBe('por volta de 1994');
  });

  it('quem estava: até três nomes, na ordem da memória, e "+N" para o resto', () => {
    expect(quemNaLista([])).toEqual({ nomes: [], mais: 0, texto: '' });
    expect(quemNaLista(['Gui']).texto).toBe('Gui');
    expect(quemNaLista(['Gui', 'Giovanna', 'Magno']).texto).toBe('Gui, Giovanna, Magno');
    expect(quemNaLista(['Gui', 'Giovanna', 'Magno', 'Elizete', 'Chico'])).toEqual({ nomes: ['Gui', 'Giovanna', 'Magno'], mais: 2, texto: 'Gui, Giovanna, Magno +2' });
  });

  it('o nome na linha: como a pessoa é chamada na família ou, sem apelido, o primeiro nome', () => {
    expect(nomeCurto({ nome: 'Isabel Nascimento', apelido: 'Vó Bela' })).toBe('Vó Bela');
    expect(nomeCurto({ nome: 'Lucas Magno Bracarense', apelido: null })).toBe('Lucas');
    expect(nomeCurto({ nome: 'Chico' })).toBe('Chico');
  });

  it('a lista vai no endereço e segue os filtros e a ordem do Explorar', () => {
    expect(enderecoDoExplorar({ ...SEM_FILTRO, tipos: ['viagem'], ordem: 'contadas' }, 'lista')).toBe('/explorar?tipo=viagem&ordem=contadas&ver=lista');
  });

  it('o rascunho aparece na lista como na linha do tempo, e não no mural nem no modo TV', () => {
    expect(mostraRascunho('linha')).toBe(true);
    expect(mostraRascunho('lista')).toBe(true);
    for (const forma of ['mural', 'tv', 'acaso'] as const) expect(mostraRascunho(forma)).toBe(false);
  });

  it('a página da pessoa tem três formas de ver, e a linha do tempo é o padrão', () => {
    expect([...FORMAS_DA_PESSOA]).toEqual(['linha', 'mural', 'lista']);
    expect(lerFormaDaPessoa(new URLSearchParams(''))).toBe('linha');
    expect(lerFormaDaPessoa(new URLSearchParams('ver=lista'))).toBe('lista');
    // o modo TV e o sorteio são do Explorar
    expect(lerFormaDaPessoa(new URLSearchParams('ver=tv'))).toBe('linha');
    expect(enderecoDaPessoa('gui')).toBe('/pessoas/gui');
    expect(enderecoDaPessoa('gui', 'mural')).toBe('/pessoas/gui?ver=mural');
  });
});
