// Ex-casal, depois da sessão F (observação e respostas do Gui, 18/11/2026):
// - o ex que virou amigo aparece na árvore com a linha tracejada do coração, e não como ex-casal;
// - ex "Fora" que é pai ou mãe de alguém que a pessoa vê vale como "Discreto";
// - ex discreto ou fora sai dos aniversários do Início de quem escolheu.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { montarDesenho, type DadosDaArvore, type Estado } from '../src/lib/arvore-montagem';
import { ehEx, exesDe, foraQueEPaiViraDiscreto, separarAmizades, viraramAmigos } from '../src/lib/ex-casal';
import { proximidadePadrao } from '../src/lib/circulo';
import { podeEscolherComoOExAparece } from '../src/lib/servidor/permissoes';
import { Familia, type Casal } from '../src/lib/parentesco';

const casal = (b: string, fases: Casal['fases']): Casal => ({ id: 1, a: 'giovanna', b, fases, visibilidade: 'todos', nucleos: [], criadoPor: 'giovanna' });
const amigos = casal('thiago', [
  { tipo: 'namoro', inicioAno: 2012, fimAno: 2015 },
  { tipo: 'amizade', inicioAno: 2016, fimAno: null },
]);
const separados = casal('jean', [
  { tipo: 'namoro', inicioAno: 2012, fimAno: null },
  { tipo: 'separacao', inicioAno: 2014, fimAno: null },
]);
const juntos = casal('lucas-magno', [{ tipo: 'casamento', inicioAno: 2020, fimAno: null }]);

describe('o ex que virou amigo', () => {
  it('a fase de hoje decide: amizade sai dos casais e vira amizade; separação continua ex-casal', () => {
    expect(viraramAmigos(amigos)).toBe(true);
    expect(viraramAmigos(separados)).toBe(false);
    const { casais, amizades } = separarAmizades([amigos, separados, juntos]);
    expect(casais.map((c) => c.b)).toEqual(['jean', 'lucas-magno']);
    expect(amizades).toEqual([{ a: 'giovanna', b: 'thiago' }]);
  });

  const pessoa = (id: string) => ({ id, nome: id, rotulo: '', nucleos: ['bayara'], bicho: false, anos: '' });
  const dados: DadosDaArvore = {
    eu: 'gui',
    centros: ['gui'],
    nucleos: [{ id: 'bayara', nome: 'Bayara' }],
    pessoas: ['elizete', 'aguilar', 'gui', 'giovanna', 'thiago'].map(pessoa),
    filiacoes: ['gui', 'giovanna'].flatMap((filho) => ['elizete', 'aguilar'].map((responsavel) => ({ filho, responsavel, consideracao: false }))),
    casais: [{ a: 'aguilar', b: 'elizete', ex: false }],
    coracao: [],
    amizades: [{ a: 'giovanna', b: 'thiago' }],
  };
  const estado = (mudar: Partial<Estado> = {}): Estado => ({ foco: 'gui', centro: '', ramos: new Set(), nucleo: '', consideracao: true, ex: true, bichos: true, outros: true, abertos: new Set(['gui']), ...mudar });

  it('na árvore, entra com a linha do coração, na geração de quem foi o par, sem abrir os laços de ninguém', () => {
    const m = montarDesenho(dados, estado());
    expect(m.principal.has('thiago')).toBe(true);
    expect(m.casaisVisiveis.some((c) => c.b === 'thiago' || c.a === 'thiago')).toBe(false);
    const laco = m.coracao.find((l) => l.pessoa === 'thiago')!;
    expect(laco).toMatchObject({ dono: 'giovanna', papel: 'irmao' });
    expect(laco.sangue).toBeFalsy();
    expect(m.geracoes.get('thiago')).toBe(m.geracoes.get('giovanna'));
  });
  it('desligar a camada de consideração e coração tira a amizade, como tira os outros laços do coração', () => {
    const m = montarDesenho(dados, estado({ consideracao: false }));
    expect(m.coracao.some((l) => l.pessoa === 'thiago')).toBe(false);
    // E a pessoa sai junto: nem na árvore, nem nas gerações, nem no desenho (observação do Gui, 18/11/2026)
    expect(m.principal.has('thiago')).toBe(false);
    expect(m.geracoes.has('thiago')).toBe(false);
    expect(m.desenho.pessoas.some((p) => p.id === 'thiago')).toBe(false);
  });
  it('com a camada desligada, a ficha de quem saiu da árvore fecha e o foco volta para quem está na tela', () => {
    const cliente = readFileSync('src/lib/cliente/arvore.ts', 'utf8');
    const fim = cliente.slice(cliente.indexOf('const estaNaTela = '), cliente.indexOf('mostrarFicha();', cliente.indexOf('const estaNaTela = ')));
    expect(fim).toMatch(/if \(!estaNaTela\(estado\.foco\)\) \{\s*fichaAberta = false;/);
    expect(fim).toContain('guardarNoEndereco();');
  });
  it('a página da árvore manda os casais já separados das amizades', () => {
    const pagina = readFileSync('src/pages/arvore.astro', 'utf8');
    expect(pagina).toContain('casais: separarAmizades(casais).casais.map(');
    expect(pagina).toContain('amizades: separarAmizades(casais).amizades.map(');
  });
});

describe('ex "Fora" que é pai ou mãe vale como "Discreto"', () => {
  const filiacoes = [
    { filho: 'chico', responsavel: 'aguilar' },
    { filho: 'aguilar', responsavel: 'vo-bela' },
  ];
  it('com um filho que a pessoa vê, a tarja fica e o caminho até o filho continua', () => {
    const modos = new Map([['aguilar', 'fora' as const]]);
    expect(foraQueEPaiViraDiscreto(modos, filiacoes, () => true).get('aguilar')).toBe('discreto');
  });
  it('sem filho, ou com um filho que a pessoa não vê, continua fora', () => {
    expect(foraQueEPaiViraDiscreto(new Map([['jean', 'fora' as const]]), filiacoes, () => true).get('jean')).toBe('fora');
    expect(foraQueEPaiViraDiscreto(new Map([['aguilar', 'fora' as const]]), filiacoes, (id) => id !== 'chico').get('aguilar')).toBe('fora');
  });
  it('quem já era discreto continua discreto', () => {
    expect(foraQueEPaiViraDiscreto(new Map([['aguilar', 'discreto' as const]]), filiacoes, () => false).get('aguilar')).toBe('discreto');
  });
  it('vale em todo lugar: a regra entra em comoOsExesAparecem', () => {
    const repo = readFileSync('src/lib/servidor/repositorio.ts', 'utf8');
    const funcao = repo.slice(repo.indexOf('export async function comoOsExesAparecem'), repo.indexOf('export async function salvarComoOExAparece'));
    expect(funcao).toContain('foraQueEPaiViraDiscreto(valem, await listarFiliacoes()');
  });
});

describe('ex discreto ou fora sai dos aniversários', () => {
  it('o Início passa os exes de quem olha como quem não entra nos aniversários', () => {
    const inicio = readFileSync('src/pages/index.astro', 'utf8');
    expect(inicio).toContain('const exesQueSaem = await comoOsExesAparecem(usuario);');
    expect(inicio).toContain('aniversarios(integrantes, hoje, new Set([...naoVe, ...exesQueSaem.keys()]), usuario.pessoa)');
  });
});

// O caso do Gui (18/11/2026): Namoro 2025, Separação 2025 e Amizade desde 2025, sem família. A fase de hoje
// "amizade" se comporta como laço do coração em todo lugar onde o casal aparece.
describe('o ex que virou amigo não é ex em lugar nenhum', () => {
  const comoOGui = casal('thiago', [
    { tipo: 'namoro', inicioAno: 2025, fimAno: 2025 },
    { tipo: 'separacao', inicioAno: 2025, fimAno: null },
    { tipo: 'amizade', inicioAno: 2025, fimAno: null },
  ]);
  const ler = (c: string) => readFileSync(c, 'utf8');
  it('não é ex: fora das escolhas de como o ex aparece e da lista de exes', () => {
    expect(ehEx(comoOGui)).toBe(false);
    expect(ehEx(separados)).toBe(true);
    expect([...exesDe('giovanna', [comoOGui, separados])]).toEqual(['jean']);
    expect(podeEscolherComoOExAparece({ pessoa: 'giovanna' } as never, comoOGui).ok).toBe(false);
  });
  it('o parentesco é "amigo", e no círculo ele entra como laço do coração (Próximo)', () => {
    const familia = new Familia([], [comoOGui, separados], new Map([['thiago', 'ele'], ['jean', 'ele']]));
    const r = familia.relacao('giovanna', 'thiago')!;
    expect(r.texto).toBe('amigo');
    expect(r.caminho).toBe('A');
    expect(proximidadePadrao({ caminho: r.caminho })).toBe(proximidadePadrao({ doCoracao: true }));
    expect(familia.relacao('giovanna', 'jean')!.texto).toMatch(/^ex-/);
  });
  it('na árvore, com a camada desligada, ele sai; e só pela amizade ninguém vira centro', () => {
    const pessoa = (id: string) => ({ id, nome: id, rotulo: '', nucleos: ['bayara'], bicho: false, anos: '' });
    const dados: DadosDaArvore = {
      eu: 'gui',
      centros: ['gui'],
      nucleos: [{ id: 'bayara', nome: 'Bayara' }],
      pessoas: ['elizete', 'aguilar', 'gui', 'giovanna', 'thiago'].map(pessoa),
      filiacoes: ['gui', 'giovanna'].flatMap((filho) => ['elizete', 'aguilar'].map((responsavel) => ({ filho, responsavel, consideracao: false }))),
      casais: [{ a: 'aguilar', b: 'elizete', ex: false }],
      coracao: [],
    };
    const estado = (mudar: Partial<Estado> = {}): Estado => ({ foco: 'gui', centro: '', ramos: new Set(), nucleo: '', consideracao: true, ex: true, bichos: true, outros: true, abertos: new Set(['gui']), ...mudar });
    const m = montarDesenho({ ...dados, amizades: [{ a: 'giovanna', b: 'thiago', rotulo: 'amigo de Giovanna' }] }, estado({ consideracao: false }));
    expect(m.principal.has('thiago')).toBe(false);
    const comRotulo = montarDesenho({ ...dados, amizades: [{ a: 'giovanna', b: 'thiago', rotulo: 'amigo de Giovanna' }] }, estado());
    expect(comRotulo.coracao.find((l) => l.pessoa === 'thiago')!.rotulo).toBe('amigo de Giovanna');
    for (const arquivo of ['src/pages/arvore.astro', 'src/pages/admin/arvore.astro', 'src/pages/api/ajustes.ts']) {
      expect(ler(arquivo), arquivo).toMatch(/comLacoDeArvore\(\{[^\n]*separarAmizades\(/);
    }
  });
  it('na página da pessoa, sai de "Casal" e entra em "Laços do coração"; editar e o laço dizem "hoje, amigos"', () => {
    const pagina = ler('src/pages/pessoas/[id]/index.astro');
    expect(pagina).toContain('linhas: casais.filter((c) => !viraramAmigos(c.casal)).map(');
    expect(pagina).toMatch(/\.filter\(\(c\) => viraramAmigos\(c\.casal\) && !escolhidos\.some/);
    expect(ler('src/pages/pessoas/[id]/editar.astro')).toContain("viraramAmigos(c.casal) ? 'hoje, amigos'");
    expect(ler('src/pages/pessoas/[id]/editar.astro')).toContain('{ehEx(c.casal) && [c.casal.a, c.casal.b].includes(usuario.pessoa)');
    expect(ler('src/pages/lacos/[a]/[b].astro')).toContain("viraramAmigos(casal) ? 'Hoje, amigos'");
  });
});
