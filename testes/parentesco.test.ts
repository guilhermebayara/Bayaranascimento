import { describe, expect, it } from 'vitest';
import { Familia, estaoJuntos, podeVerCasal, possessivo, type Casal, type Filiacao, type Tratamento } from '../src/lib/parentesco';

// A família do site, mais alguns parentes inventados para cobrir tios e primos
const bio = (filho: string, ...pais: string[]): Filiacao[] => pais.map((responsavel) => ({ filho, responsavel, qualidade: 'biologica' }));
const filiacoes: Filiacao[] = [
  ...bio('gui', 'elizete', 'aguilar'),
  ...bio('giovanna', 'elizete', 'aguilar'),
  ...bio('aguilar', 'vo-bela'),
  ...bio('elizete', 'vo-vivica'),
  ...bio('tia-ana', 'vo-vivica'),
  ...bio('primo-leo', 'tia-ana'),
  ...bio('lucas-magno', 'lucio', 'ana-candida'),
  ...bio('ana-candida', 'regina'),
  { filho: 'chico', responsavel: 'giovanna', qualidade: 'adotiva' },
  { filho: 'chico', responsavel: 'lucas-magno', qualidade: 'adotiva' },
  { filho: 'chico', responsavel: 'gui', qualidade: 'consideracao' },
];
const casal = (id: number, a: string, b: string, ...tipos: Casal['fases'][number]['tipo'][]): Casal => ({
  id,
  a,
  b,
  visibilidade: 'todos',
  criadoPor: null,
  fases: tipos.map((tipo) => ({ tipo, inicioAno: null, fimAno: null })),
});
const casais: Casal[] = [
  casal(1, 'aguilar', 'elizete', 'casamento', 'separacao'),
  casal(2, 'giovanna', 'lucas-magno', 'namoro', 'noivado', 'casamento'),
  casal(3, 'aguilar', 'marta', 'uniao'),
  casal(4, 'tia-ana', 'tio-beto', 'casamento'),
  casal(5, 'gui', 'rafa', 'namoro', 'amizade'),
  casal(6, 'gui', 'dani', 'namoro', 'separacao'),
];
const tratamentos = new Map<string, Tratamento>([
  ['gui', 'ele'], ['giovanna', 'ela'], ['elizete', 'ela'], ['aguilar', 'ele'], ['vo-bela', 'ela'], ['vo-vivica', 'ela'],
  ['tia-ana', 'ela'], ['tio-beto', 'ele'], ['primo-leo', 'ele'], ['lucas-magno', 'ele'], ['lucio', 'ele'],
  ['ana-candida', 'ela'], ['regina', 'ela'], ['chico', 'ele'], ['marta', 'ela'], ['rafa', 'ele'],
]);
const familia = new Familia(filiacoes, casais, tratamentos);
const r = (de: string, para: string) => familia.relacao(de, para)?.texto;

describe('parentesco calculado', () => {
  it('linha direta, para cima e para baixo', () => {
    expect(r('gui', 'elizete')).toBe('mãe');
    expect(r('gui', 'aguilar')).toBe('pai');
    expect(r('gui', 'vo-bela')).toBe('avó');
    expect(r('elizete', 'gui')).toBe('filho');
    expect(r('vo-vivica', 'giovanna')).toBe('neta');
    expect(r('regina', 'chico')).toBe('bisneto');
  });
  it('irmãos, tios, sobrinhos e primos', () => {
    expect(r('gui', 'giovanna')).toBe('irmã');
    expect(r('gui', 'tia-ana')).toBe('tia');
    expect(r('tia-ana', 'gui')).toBe('sobrinho');
    expect(r('gui', 'primo-leo')).toBe('primo');
    expect(r('elizete', 'tia-ana')).toBe('irmã');
  });
  it('casal segue a fase atual', () => {
    expect(r('giovanna', 'lucas-magno')).toBe('marido');
    expect(r('lucas-magno', 'giovanna')).toBe('esposa');
    expect(r('aguilar', 'marta')).toBe('companheira');
  });
  it('casal desfeito vira ex, e o ex que virou amigo aparece como amigo', () => {
    expect(r('elizete', 'aguilar')).toBe('ex-marido');
    expect(r('aguilar', 'elizete')).toBe('ex-esposa');
    expect(r('gui', 'rafa')).toBe('amigo');
    expect(r('gui', 'dani')).toBe('ex-namorado ou ex-namorada');
    expect(possessivo(familia.relacao('gui', 'dani')!, null)).toBe('seu ex-namorado ou sua ex-namorada');
  });
  it('parentes pelo casamento', () => {
    expect(r('lucas-magno', 'elizete')).toBe('sogra');
    expect(r('elizete', 'lucas-magno')).toBe('genro');
    expect(r('gui', 'lucas-magno')).toBe('cunhado');
    expect(r('lucas-magno', 'gui')).toBe('cunhado');
    expect(r('gui', 'tio-beto')).toBe('tio');
    expect(r('gui', 'marta')).toBe('madrasta');
    expect(r('marta', 'gui')).toBe('enteado');
  });
  it('quem já é parente direto não vira parente por casamento', () => {
    // A Elizete é mãe, mesmo tendo sido casada com o pai
    expect(r('gui', 'elizete')).toBe('mãe');
  });
  it('laço de consideração é dito com todas as letras', () => {
    expect(r('gui', 'chico')).toBe('filho de consideração');
    expect(r('chico', 'gui')).toBe('pai de consideração');
    expect(familia.relacao('gui', 'chico')?.consideracao).toBe(true);
  });
  it('adoção não ganha adjetivo: filho é filho', () => {
    expect(r('giovanna', 'chico')).toBe('filho');
    expect(r('elizete', 'chico')).toBe('neto');
  });
  it('sem tratamento informado, mostra as duas formas', () => {
    const semTratamento = new Familia(filiacoes, casais);
    expect(semTratamento.relacao('gui', 'elizete')?.texto).toBe('pai ou mãe');
    expect(possessivo(semTratamento.relacao('gui', 'tia-ana')!, null)).toBe('seu tio ou sua tia');
    expect(possessivo(semTratamento.relacao('gui', 'chico')!, null)).toBe('seu filho de consideração ou sua filha de consideração');
  });
  it('quem não tem ligação não ganha parentesco inventado', () => {
    expect(r('gui', 'regina')).toBeUndefined();
    expect(r('gui', 'gui')).toBeUndefined();
    expect(r('gui', 'ninguem')).toBeUndefined();
  });
  it('frase do ponto de vista de quem olha', () => {
    expect(possessivo(familia.relacao('gui', 'elizete')!, 'ela')).toBe('sua mãe');
    expect(possessivo(familia.relacao('gui', 'aguilar')!, 'ele')).toBe('seu pai');
  });
});

describe('camadas da árvore', () => {
  it('sem consideração, o Gui deixa de aparecer como pai do Chico', () => {
    const formal = new Familia(filiacoes, casais, tratamentos, { consideracao: false, ex: true });
    expect(formal.pais('chico').map((p) => p.responsavel)).toEqual(['giovanna', 'lucas-magno']);
    expect(formal.relacao('gui', 'chico')?.texto).toBe('sobrinho');
  });
  it('sem ex-casais, só ficam os casais de hoje', () => {
    const atuais = new Familia(filiacoes, casais, tratamentos, { consideracao: true, ex: false });
    expect(atuais.casais('aguilar').map((c) => c.outro)).toEqual(['marta']);
    expect(atuais.casais('gui')).toEqual([]);
  });
  it('casais atuais vêm antes dos desfeitos', () => {
    expect(familia.casais('aguilar').map((c) => c.outro)).toEqual(['marta', 'elizete']);
  });
});

describe('estrutura', () => {
  it('irmãos são quem divide pelo menos um dos pais', () => {
    expect(familia.irmaos('gui').map((i) => i.id)).toEqual(['giovanna']);
    expect(familia.irmaos('chico')).toEqual([]);
  });
  it('reconhece antepassados, para ninguém virar o próprio avô', () => {
    expect(familia.ehAntepassado('vo-vivica', 'gui')).toBe(true);
    expect(familia.ehAntepassado('gui', 'vo-vivica')).toBe(false);
    expect(familia.ehAntepassado('gui', 'gui')).toBe(false);
  });
  it('sabe quando um casal está junto', () => {
    expect(estaoJuntos(casais[0])).toBe(false);
    expect(estaoJuntos(casais[1])).toBe(true);
  });
  it('casal privado só aparece para os dois e para quem cadastrou', () => {
    const privado: Casal = { ...casais[5], visibilidade: 'privado', criadoPor: 'giovanna' };
    expect(podeVerCasal('gui', privado)).toBe(true);
    expect(podeVerCasal('dani', privado)).toBe(true);
    expect(podeVerCasal('giovanna', privado)).toBe(true);
    expect(podeVerCasal('elizete', privado)).toBe(false);
    expect(podeVerCasal('elizete', casais[5])).toBe(true);
  });
});

describe('laços do coração', async () => {
  const { LINHA_DO_PAPEL, podeVerLacoDoCoracao } = await import('../src/lib/parentesco');
  it('laço privado só o dono vê', () => {
    expect(podeVerLacoDoCoracao('gui', { dono: 'gui', privado: true })).toBe(true);
    expect(podeVerLacoDoCoracao('giovanna', { dono: 'gui', privado: true })).toBe(false);
    expect(podeVerLacoDoCoracao('giovanna', { dono: 'gui', privado: false })).toBe(true);
  });
  it('o papel define a linha da árvore', () => {
    expect(LINHA_DO_PAPEL.irmao).toBe('centro');
    expect(LINHA_DO_PAPEL.avo).toBe('avos');
    expect(LINHA_DO_PAPEL.sobrinho).toBe('filhos');
  });
});

describe('laço do coração dito para o dono', async () => {
  const { lacoParaODono } = await import('../src/lib/parentesco');
  it('usa o tratamento da pessoa quando existe', () => {
    expect(lacoParaODono('amigo-irmão', 'ele')).toBe('seu amigo-irmão');
    expect(lacoParaODono('amiga', 'ela')).toBe('sua amiga');
    expect(lacoParaODono('sobrinho de consideração', 'ele')).toBe('seu sobrinho de consideração');
  });
  it('sem tratamento, lê a primeira palavra do nome do laço', () => {
    expect(lacoParaODono('amiga', null)).toBe('sua amiga');
    expect(lacoParaODono('amigo', null)).toBe('seu amigo');
    expect(lacoParaODono('afilhada', null)).toBe('sua afilhada');
    expect(lacoParaODono('vó de coração', null)).toBe('sua vó de coração');
    expect(lacoParaODono('sobrinho', null)).toBe('seu sobrinho');
  });
});

describe('visão geral em gerações', async () => {
  const { calcularGeracoes, nomeDaGeracao } = await import('../src/lib/parentesco');
  const todos = ['gui', 'giovanna', 'elizete', 'aguilar', 'vo-bela', 'vo-vivica', 'lucas-magno', 'lucio', 'ana-candida', 'regina', 'chico', 'ed'];
  const g = calcularGeracoes(todos, filiacoes, casais);
  it('avós em cima, pais no meio, filhos embaixo', () => {
    expect(g.get('vo-vivica')).toBe(0);
    expect(g.get('elizete')).toBe(1);
    expect(g.get('gui')).toBe(2);
    expect(g.get('chico')).toBe(3);
  });
  it('o casamento alinha as duas famílias na mesma linha', () => {
    expect(g.get('lucas-magno')).toBe(g.get('giovanna'));
    expect(g.get('ana-candida')).toBe(g.get('elizete'));
    expect(g.get('regina')).toBe(g.get('vo-vivica'));
  });
  it('ex-casal continua na mesma geração', () => {
    expect(g.get('aguilar')).toBe(g.get('elizete'));
    expect(g.get('vo-bela')).toBe(0);
  });
  it('pai sem pais cadastrados fica logo acima do filho', () => {
    expect(g.get('lucio')).toBe(1);
  });
  it('quem não tem laço de árvore fica de fora', () => {
    expect(g.has('ed')).toBe(false);
  });
  it('recorte por núcleo usa só as pessoas dele', () => {
    const bracarense = calcularGeracoes(['lucas-magno', 'lucio', 'ana-candida', 'regina'], filiacoes, casais);
    expect(bracarense.get('regina')).toBe(0);
    expect(bracarense.get('lucas-magno')).toBe(2);
    expect(bracarense.has('giovanna')).toBe(false);
  });
  it('gerações nomeadas a partir de quem olha', () => {
    expect(nomeDaGeracao(0)).toBe('Sua geração');
    expect(nomeDaGeracao(-2)).toBe('Avós');
    expect(nomeDaGeracao(1)).toBe('Filhos e sobrinhos');
  });
});
