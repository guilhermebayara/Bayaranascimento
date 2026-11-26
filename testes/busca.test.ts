// A busca (docs/regras/explorar.md, "A busca"): a regra pura, em src/lib/busca.ts, e o tirar acento, em src/lib/texto.ts.
import { describe, expect, it } from 'vitest';
import { acha, acharNaMemoria, buscar, buscarNomes, buscarPessoas, consultaDoIndice, lerBusca, normalizar, termos, textoDoMotivo, trechoEmVolta, type DocumentoDaBusca } from '../src/lib/busca';
import { normalizar as normalizarDoSite } from '../src/lib/texto';

const natalNaVo: DocumentoDaBusca = {
  id: '1994-natal-na-vo-vivica',
  titulo: 'Primeiro Natal na casa da Vó Vivica',
  ano: 1994,
  lugar: 'Sabará',
  tipo: 'Festa',
  capitulos: ['Natais', 'Natais na Vó Vivica'],
  temas: ['Natal'],
  pessoas: [
    { id: 'vo-vivica', nome: 'Vó Vivica', outrosNomes: ['Vivica'], parentesco: 'sua mãe' },
    { id: 'gui', nome: 'Gui', outrosNomes: ['Guilherme'], parentesco: 'seu filho' },
  ],
  textos: [{ campo: 'relato', por: 'Gui', texto: 'Não lembro de nada, mas a foto dos primos embaixo da mesa diz muito sobre a noite.' }],
};
const semLuz: DocumentoDaBusca = {
  id: '2006-natal-sem-luz',
  titulo: 'O Natal em que faltou luz',
  ano: 2006,
  lugar: 'Sabará',
  tipo: 'Causo',
  capitulos: ['Natais'],
  temas: ['Natal'],
  pessoas: [{ id: 'giovanna', nome: 'Giovanna', outrosNomes: [], parentesco: 'sua filha' }],
  textos: [
    { campo: 'relato', por: 'Giovanna', texto: 'A ceia foi à luz de vela e o peru ficou meio cru. Melhor Natal, segundo todo mundo.' },
    { campo: 'audio', por: 'Giovanna', texto: 'Áudio de exemplo. As velas acabaram antes da meia-noite.' },
  ],
};
const praia: DocumentoDaBusca = { id: 'praia', titulo: 'Férias em Guarapari', ano: 1996, lugar: 'Guarapari', tipo: 'Viagem', capitulos: [], temas: [], pessoas: [], textos: [] };

describe('normalizar e termos', () => {
  it('tira acento e maiúscula, letra por letra, com o mesmo tamanho', () => {
    expect(normalizar('Sabará')).toBe('sabara');
    expect(normalizar('VÓ Vivica')).toBe('vo vivica');
    expect(normalizar('Ação').length).toBe('Ação'.length);
  });
  it('fica com as palavras que contam: "aquele Natal na casa da vó" é natal, casa e vó', () => {
    expect(termos('aquele Natal na casa da vó')).toEqual(['natal', 'casa', 'vo']);
    expect(termos('minha mãe')).toEqual(['mae']);
    expect(termos('   ')).toEqual([]);
  });
  it('lê a busca do endereço aparada, com no máximo 80 letras', () => {
    expect(lerBusca(new URLSearchParams('q=%20%20natal%20%20na%20vo%20'))).toBe('natal na vo');
    expect(lerBusca(new URLSearchParams(`q=${'a'.repeat(200)}`)).length).toBe(80);
    expect(lerBusca(new URLSearchParams(''))).toBe('');
  });
  it('palavra curta precisa ser inteira; a partir de três letras, vale o começo', () => {
    expect(acha('vo', 'vo')).toBe(true);
    expect(acha('vo', 'voltou')).toBe(false);
    expect(acha('sab', 'sabara')).toBe(true);
    expect(acha('1994', '19945')).toBe(false);
  });
});

describe('acharNaMemoria', () => {
  it('cada palavra precisa ser achada em algum lugar da memória', () => {
    expect(acharNaMemoria(natalNaVo, termos('natal casa vó'))).toBeDefined();
    expect(acharNaMemoria(natalNaVo, termos('natal praia'))).toBeUndefined();
  });
  it('sem diferença de acento e de maiúscula: "sabara" acha Sabará', () => {
    expect(acharNaMemoria(natalNaVo, termos('SABARA'))?.motivos).toEqual([{ campo: 'lugar', texto: 'Sabará' }]);
  });
  it('acha a pessoa pelo parentesco de quem procura, também pelas formas da família ("vó" é avó)', () => {
    expect(acharNaMemoria(natalNaVo, termos('minha mãe'))?.motivos).toEqual([{ campo: 'pessoa', nome: 'Vó Vivica', parentesco: 'sua mãe' }]);
    const avo: DocumentoDaBusca = { ...praia, pessoas: [{ id: 'vo-bela', nome: 'Bela', outrosNomes: [], parentesco: 'sua avó' }] };
    expect(acharNaMemoria(avo, termos('vó'))).toBeDefined();
    expect(acharNaMemoria(avo, termos('vovó'))).toBeDefined();
  });
  it('acha no relato e no áudio, com o trecho em volta da palavra', () => {
    const achado = acharNaMemoria(semLuz, termos('vela'));
    expect(achado?.motivos[0]).toMatchObject({ campo: 'relato', por: 'Giovanna' });
    const m = achado!.motivos[0] as { trecho: { antes: string; achado: string; depois: string } };
    expect(m.trecho.achado).toBe('vela');
    expect(acharNaMemoria(semLuz, termos('meia-noite'))?.motivos[0]).toMatchObject({ campo: 'audio' });
  });
  it('o título vale mais que o relato', () => {
    const r = buscar([semLuz, natalNaVo], 'natal');
    expect(r.map((a) => a.id)).toEqual(['2006-natal-sem-luz', '1994-natal-na-vo-vivica']);
    expect(buscar([natalNaVo, semLuz], 'vó')[0]!.id).toBe('1994-natal-na-vo-vivica');
  });
  it('o ano acha pelo número inteiro', () => {
    expect(buscar([natalNaVo, semLuz], '1994').map((a) => a.id)).toEqual(['1994-natal-na-vo-vivica']);
    expect(buscar([natalNaVo, semLuz], '199')).toEqual([]);
  });
  it('a busca vazia não acha nada', () => {
    expect(buscar([natalNaVo], 'da na')).toEqual([]);
  });
});

describe('pessoas, capítulos e temas', () => {
  it('acha a pessoa pelo nome ou pelo parentesco, com a conta das memórias dela', () => {
    expect(buscarPessoas([natalNaVo, semLuz], 'minha mãe')).toEqual([{ id: 'vo-vivica', nome: 'Vó Vivica', parentesco: 'sua mãe', memorias: 1 }]);
    expect(buscarPessoas([natalNaVo], 'vivi').map((p) => p.id)).toEqual(['vo-vivica']);
  });
  it('acha capítulo e tema pelo nome', () => {
    expect(buscarNomes([{ id: 'natais', nome: 'Natais' }, { id: 'viagens', nome: 'Viagens de família' }], 'natal').map((c) => c.id)).toEqual(['natais']);
    expect(buscarNomes([{ id: 'casamentos', nome: 'Casamentos' }], 'casamento').map((c) => c.id)).toEqual(['casamentos']);
    expect(buscarNomes([{ id: 'natais', nome: 'Natais' }], 'nata').map((c) => c.id)).toEqual(['natais']);
  });
});

describe('o que a tela diz', () => {
  it('o porquê, em texto corrido', () => {
    expect(textoDoMotivo({ campo: 'pessoa', nome: 'Vó Vivica', parentesco: 'sua mãe' })).toBe('com Vó Vivica, sua mãe');
    expect(textoDoMotivo({ campo: 'pessoa', nome: 'Gui', parentesco: 'você' })).toBe('com Gui');
    expect(textoDoMotivo({ campo: 'lugar', texto: 'Sabará' })).toBe('em Sabará');
  });
  it('o trecho corta em palavra inteira e marca onde cortou', () => {
    const texto = 'A ceia foi à luz de vela e o peru ficou meio cru. Melhor Natal, segundo todo mundo.';
    const t = trechoEmVolta(texto, texto.indexOf('peru'), texto.indexOf('peru') + 4, 12);
    expect(t.achado).toBe('peru');
    expect(t.antes.startsWith('…')).toBe(true);
    expect(t.depois.endsWith('…')).toBe(true);
  });
});

describe('a legenda e o índice', () => {
  it('a legenda acha, pesa mais que o relato e diz onde achou', () => {
    const comLegenda: DocumentoDaBusca = { ...praia, textos: [{ campo: 'relato', por: 'Gui', texto: 'O buquê voou longe.' }, { campo: 'legenda', por: '', texto: 'A Giovanna pegando o buquê' }] };
    const achado = acharNaMemoria(comLegenda, termos('buquê'));
    expect(achado?.motivos[0]).toMatchObject({ campo: 'legenda' });
    expect(textoDoMotivo(achado!.motivos[0]!)).toBe('na legenda de uma foto');
  });
  it('a busca tira acento com a função do site, a mesma que a D2 vai usar', () => {
    expect(normalizar).toBe(normalizarDoSite);
  });
  it('a consulta do índice leva o começo, o singular e o plural que muda o fim, e a palavra curta inteira', () => {
    expect(consultaDoIndice('vo')).toBe('"vo"');
    expect(consultaDoIndice('1994')).toBe('"1994"');
    expect(consultaDoIndice('natal')).toBe('"natal"* OR "natais"*');
    expect(consultaDoIndice('natais')).toBe('"natais"* OR "natal"*');
    expect(consultaDoIndice('pao')).toBe('"pao"* OR "poes"* OR "paes"*');
  });
});
