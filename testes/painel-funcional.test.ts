// Início, o painel pessoal (docs/regras/inicio.md, "Início (painel pessoal)"): a carta, as visitas, o que entrou de novo,
// os aniversários e a memória para contar. As regras ficam em src/lib/painel.ts.
import { describe, expect, it } from 'vitest';
import { aniversarios, chegarAoPainel, comParentesco, hojeNoBrasil, memoriaParaContar, novidades, PAUSA_ENTRE_VISITAS, saudacao, voceNoAcervo } from '../src/lib/painel';

const em = (iso: string) => new Date(`${iso}Z`);
const depois = (d: Date, ms: number) => new Date(d.getTime() + ms);

describe('a carta e as visitas', () => {
  const natal = em('2026-12-24T21:00:00');

  // Resposta do Gui às perguntas P14 e P15 do QA de design de 17/11/2026: a carta aparece uma vez.
  // Antes, ela ficava no alto enquanto a primeira visita durava.
  it('a carta aparece no alto uma vez só: na volta ao Início, mesmo na mesma visita, vem o painel', () => {
    const primeira = chegarAoPainel(undefined, natal, true);
    expect(primeira.cartaNoAlto).toBe(true);
    expect(primeira.novidadesDesde).toBeNull();
    expect(primeira.registro.carta).toBe('2026-12-24 21:00:00');
    const recarregou = chegarAoPainel(primeira.registro, depois(natal, 10 * 60 * 1000), true);
    expect(recarregou.cartaNoAlto).toBe(false);
    // Ainda é a primeira visita: sem visita anterior, não há "o que entrou de novo"
    expect(recarregou.novidadesDesde).toBeNull();
    expect(recarregou.registro.carta).toBe('2026-12-24 21:00:00');
    const outroDia = chegarAoPainel(recarregou.registro, depois(natal, 24 * 60 * 60 * 1000), true);
    expect(outroDia.cartaNoAlto).toBe(false);
    expect(chegarAoPainel(outroDia.registro, depois(natal, 3 * 24 * 60 * 60 * 1000), true).cartaNoAlto).toBe(false);
  });

  it('quem entrou antes de a carta existir vê a carta no alto na primeira visita depois de escrita', () => {
    const antes = chegarAoPainel(undefined, em('2026-11-20T10:00:00'), false);
    expect(antes.cartaNoAlto).toBe(false);
    const escrita = chegarAoPainel(antes.registro, em('2026-12-01T10:00:00'), true);
    expect(escrita.cartaNoAlto).toBe(true);
    expect(chegarAoPainel(escrita.registro, em('2026-12-01T10:05:00'), true).cartaNoAlto).toBe(false);
    expect(chegarAoPainel(escrita.registro, em('2026-12-05T10:00:00'), true).cartaNoAlto).toBe(false);
  });

  it('o que entrou de novo conta do fim da visita anterior, e não some ao recarregar', () => {
    const primeira = chegarAoPainel(undefined, em('2026-12-24T21:00:00'), true);
    const fim = chegarAoPainel(primeira.registro, em('2026-12-24T21:40:00'), true);
    const volta = chegarAoPainel(fim.registro, em('2026-12-26T09:00:00'), true);
    expect(volta.novidadesDesde).toBe('2026-12-24 21:40:00');
    const recarregou = chegarAoPainel(volta.registro, depois(em('2026-12-26T09:00:00'), PAUSA_ENTRE_VISITAS - 1000), true);
    expect(recarregou.novidadesDesde).toBe('2026-12-24 21:40:00');
    expect(recarregou.registro.primeira).toBe('2026-12-24 21:00:00');
  });

  it('a saudação leva o nome de quem abre', () => {
    expect(saudacao('Elizete')).toBe('Oi, Elizete,');
    expect(saudacao('Aguilar')).toBe('Oi, Aguilar,');
  });
});

describe('o que entrou de novo', () => {
  const desde = '2026-12-20 00:00:00';
  // Quem chama entrega só as memórias que a pessoa vê: "restrita" não está na lista dela
  const vistas = [
    { id: 'antiga', criadaPor: 'gui', publicadaEm: '2026-12-01 10:00:00' },
    { id: 'nova', criadaPor: 'giovanna', publicadaEm: '2026-12-21 10:00:00' },
    { id: 'minha', criadaPor: 'elizete', publicadaEm: '2026-12-22 10:00:00' },
  ];
  const relato = (id: number, memoriaId: string, por: string, publicadoEm: string, registradoPor = por) => ({ id, memoriaId, por, registradoPor, publicadoEm });
  const relatos = [
    relato(1, 'antiga', 'lucas-magno', '2026-12-23 10:00:00'),
    relato(2, 'restrita', 'gui', '2026-12-23 11:00:00'),
    relato(3, 'nova', 'giovanna', '2026-12-21 10:00:00'),
    relato(4, 'antiga', 'elizete', '2026-12-23 12:00:00'),
    relato(5, 'antiga', 'vo-bela', '2026-12-23 13:00:00', 'elizete'),
    relato(6, 'antiga', 'gui', '2026-12-10 10:00:00'),
  ];

  it('só o que a pessoa vê, publicado por outras pessoas depois da última visita', () => {
    const r = novidades(vistas, relatos, desde, 'elizete');
    expect(r.memorias.map((m) => m.id)).toEqual(['nova']);
    // O relato da memória restrita fica de fora; o da memória nova também, porque a memória já aparece
    expect(r.relatos.map((x) => x.id)).toEqual([1]);
  });

  it('na primeira visita não há novidade: a carta abre o painel', () => {
    expect(novidades(vistas, relatos, null, 'elizete')).toEqual({ memorias: [], relatos: [] });
  });
});

describe('aniversários', () => {
  const pessoa = (id: string, ano: number | null, mes: number | null, dia: number | null, falecido = false) => ({
    id,
    nascimentoAno: ano,
    nascimentoMes: mes,
    nascimentoDia: dia,
    falecido,
  });
  const hoje = { ano: 2026, mes: 12, dia: 24 };
  const pessoas = [
    pessoa('vo-bela', 1942, 12, 28),
    pessoa('vo-vivica', 1930, 12, 26, true),
    pessoa('magno', 1995, 1, 6),
    pessoa('so-ano', 1980, null, null),
    pessoa('sem-ano', null, 12, 24),
    pessoa('longe', 1990, 3, 1),
    pessoa('escondida', 1970, 12, 30),
    pessoa('elizete', 1965, 12, 25),
  ];

  it('os próximos 30 dias, de quem está vivo e de quem a pessoa vê, com a idade quando o ano é conhecido', () => {
    const r = aniversarios(pessoas, hoje, new Set(['escondida']), 'elizete');
    expect(r.map((a) => [a.pessoa.id, a.emDias, a.faz])).toEqual([
      ['sem-ano', 0, null],
      ['vo-bela', 4, 84],
      ['magno', 13, 32],
    ]);
  });

  it('quem faleceu não aparece', () => {
    expect(aniversarios(pessoas, hoje, new Set(), 'gui').some((a) => a.pessoa.id === 'vo-vivica')).toBe(false);
  });

  it('quem nasceu em 29 de fevereiro faz aniversário no dia 28 nos anos comuns', () => {
    const r = aniversarios([pessoa('bissexto', 2000, 2, 29)], { ano: 2027, mes: 2, dia: 20 }, new Set(), 'gui');
    expect(r.map((a) => [a.dia, a.emDias, a.faz])).toEqual([[28, 8, 27]]);
  });
});

describe('uma memória para contar', () => {
  it('a mais recente com foto em que a pessoa está e ainda não contou nada', () => {
    const m = (id: string, integrantes: string[], fotos: number) => ({ id, integrantes, fotos: Array(fotos).fill(0) });
    const memorias = [m('a', ['gui'], 1), m('b', ['gui'], 1), m('c', ['gui'], 0), m('d', ['giovanna'], 1), m('e', ['gui'], 1)];
    expect(memoriaParaContar(memorias, new Set(['e']), 'gui')?.id).toBe('b');
    expect(memoriaParaContar([m('c', ['gui'], 0)], new Set(), 'gui')?.id).toBe('c');
    expect(memoriaParaContar(memorias, new Set(['a', 'b', 'c', 'e']), 'gui')).toBeUndefined();
    // Nunca a mesma que já está entre as novidades
    expect(memoriaParaContar(memorias, new Set(['e']), 'gui', new Set(['b']))?.id).toBe('a');
  });
});

describe('o dia de hoje', () => {
  it('é o de Brasília, mesmo quando em UTC já virou o dia', () => {
    expect(hojeNoBrasil(em('2026-12-25T02:00:00'))).toEqual({ ano: 2026, mes: 12, dia: 24 });
  });
});

describe('o parentesco junto do nome', () => {
  it('sem repetir quando o apelido já traz o parentesco', () => {
    expect(comParentesco('sua avó', 'Bela')).toBe('sua avó Bela');
    expect(comParentesco('sua tia', 'Tia Cida')).toBe('sua Tia Cida');
    expect(comParentesco('seu tio-avô', 'Tio-avô Zeca')).toBe('seu Tio-avô Zeca');
    expect(comParentesco(undefined, 'Chico')).toBe('Chico');
  });
});

describe('"Você no acervo" (proposta B da sessão H)', () => {
  const m = (ano: number, fotos = 1) => ({ ano, fotos: Array(fotos).fill({}) });
  it('conta as memórias, diz de que ano a que ano e pega as fotos das quatro mais recentes', () => {
    const r = voceNoAcervo([m(2026), m(2020, 0), m(2015), m(2010), m(2001), m(1992)]);
    expect(r.quantas).toBe(6);
    expect([r.de, r.ate]).toEqual([1992, 2026]);
    expect(r.comFoto.map((x) => x.ano)).toEqual([2026, 2015, 2010, 2001]);
  });
  it('num ano só, sem "de a"', () => {
    const r = voceNoAcervo([m(2025), m(2025, 0)]);
    expect(r).toMatchObject({ quantas: 2 });
    expect(r.de).toBeUndefined();
  });
});
