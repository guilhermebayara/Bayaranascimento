// Regras que nasceram das respostas do Gui ao QA de design de 17/11/2026, na lista de Pessoas e na
// página da pessoa (P98 a P108 de docs/qa/2026-11-17-perguntas.md).
import { describe, expect, it } from 'vitest';
import { ordemPedida, ordenarPessoas, type PessoaDaLista } from '../src/lib/ordem-das-pessoas';
import { calcularGeracoes } from '../src/lib/parentesco';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url), 'utf8');
const semComentario = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('a ordem da lista de Pessoas (P98)', () => {
  const gente = (id: string, nascimentoAno: number | null = null, tipo = 'pessoa'): PessoaDaLista => ({ id, nome: id, tipo, nascimentoAno });
  // Avó, mãe e tia, a filha e o genro, a neta; um amigo sem laço de árvore e dois bichos
  const pessoas = [gente('neta', 2020), gente('filha', 1990), gente('genro'), gente('tia', 1958), gente('mae', 1960), gente('avo', 1930), gente('amigo', 1950), gente('gato', 2015, 'bicho'), gente('cao', 2010, 'bicho')];
  const filiacoes = [
    { filho: 'mae', responsavel: 'avo' },
    { filho: 'tia', responsavel: 'avo' },
    { filho: 'filha', responsavel: 'mae' },
    { filho: 'neta', responsavel: 'filha' },
    { filho: 'neta', responsavel: 'genro' },
    { filho: 'gato', responsavel: 'mae' },
  ];
  const geracoes = calcularGeracoes(
    pessoas.map((p) => p.id),
    filiacoes,
    [{ a: 'filha', b: 'genro' }],
  );
  const ids = (ordem: 'geracao' | 'nome') => ordenarPessoas(pessoas, geracoes, ordem).map((p) => p.id);

  it('por geração: dos mais velhos aos mais novos, com os bichos no fim', () => {
    expect(ids('geracao')).toEqual(['avo', 'tia', 'mae', 'filha', 'genro', 'neta', 'amigo', 'cao', 'gato']);
  });
  it('dentro da geração vale o ano de nascimento, e quem não tem o ano fica depois', () => {
    const ordem = ids('geracao');
    expect(ordem.indexOf('tia')).toBeLessThan(ordem.indexOf('mae'));
    expect(ordem.indexOf('filha')).toBeLessThan(ordem.indexOf('genro'));
  });
  it('quem não tem laço de árvore fica depois das gerações e antes dos bichos', () => {
    const ordem = ids('geracao');
    expect(ordem.indexOf('amigo')).toBeGreaterThan(ordem.indexOf('neta'));
    expect(ordem.indexOf('amigo')).toBeLessThan(ordem.indexOf('cao'));
  });
  it('de A a Z: todos pelo nome, sem olhar acento nem maiúscula', () => {
    expect(ids('nome')).toEqual(['amigo', 'avo', 'cao', 'filha', 'gato', 'genro', 'mae', 'neta', 'tia']);
    const nomes = [gente('Ú'), gente('abel'), gente('Érica'), gente('Bia')];
    expect(ordenarPessoas(nomes, new Map(), 'nome').map((p) => p.id)).toEqual(['abel', 'Bia', 'Érica', 'Ú']);
  });
  it('a ordem não depende de quando cada um foi cadastrado', () => {
    const aoContrario = ordenarPessoas([...pessoas].reverse(), geracoes, 'geracao').map((p) => p.id);
    expect(aoContrario).toEqual(ids('geracao'));
  });
  it('só "nome" troca a ordem; qualquer outro valor do endereço é a ordem por geração', () => {
    expect(ordemPedida('nome')).toBe('nome');
    for (const valor of [null, undefined, '', 'geracao', 'outra']) expect(ordemPedida(valor)).toBe('geracao');
  });
});

describe('a lista de Pessoas', () => {
  const pagina = ler('src/pages/pessoas/index.astro');
  const css = semComentario(ler('src/visual/telas/pessoas.css'));
  it('tem "Procurar pelo nome", que funciona sem script (P98)', () => {
    expect(pagina).toMatch(/<form class="pessoas-pagina__busca" method="get" action="\/pessoas" data-procurar>/);
    expect(pagina).toMatch(/for="procurar-pessoa">Procurar pelo nome<\/label>/);
    expect(pagina).toMatch(/<select id="procurar-pessoa" name="ir" required>/);
    // Sem script, a lista suspensa manda `?ir=`, e a página leva até a pessoa, se ela existe
    expect(pagina).toMatch(/if \(ir && integrantes\.some\(\(i\) => i\.id === ir\)\) return Astro\.redirect\(`\/pessoas\/\$\{ir\}`\);/);
    expect(pagina).toContain('buscaDePessoa(lista);');
  });
  it('a troca de ordem é um link, no endereço, e diz qual está valendo (P98)', () => {
    expect(pagina).toMatch(/\{ id: 'geracao', texto: 'Por geração', href: '\/pessoas' \}/);
    expect(pagina).toMatch(/\{ id: 'nome', texto: 'De A a Z', href: '\/pessoas\?ordem=nome' \}/);
    expect(pagina).toMatch(/aria-current=\{o\.id === ordem \? 'true' : undefined\}/);
    expect(pagina).toMatch(/const ordem = ordemPedida\(Astro\.url\.searchParams\.get\('ordem'\)\);/);
  });
  it('a conta de cada família vem por extenso, e quem é de duas continua nas duas (P99)', () => {
    expect(pagina).toMatch(/<p class="rotulo suave">\{contaDe\(grupo\.membros\)\}<\/p>/);
    expect(pagina).toMatch(/integrantes\.filter\(\(i\) => familiasDe\(i\)\.includes\(n\.id\)\)/);
  });
  it('os retratos nascem na margem do nome da família (P100)', () => {
    const recuo = (seletor: string) => new RegExp(`\\${seletor} \\{[^}]*padding(?:-inline)?: (?:var\\(--e-\\d\\) )?(var\\(--e-\\d\\));`).exec(css)?.[1];
    expect(recuo('.familia-de-gente__nome')).toBe('var(--e-5)');
    expect(recuo('.familia-de-gente__lista')).toBe(recuo('.familia-de-gente__nome'));
  });
  it('sem memória nenhuma, a linha da conta não aparece (P101)', () => {
    expect(pagina).toMatch(/n > 0 \? plural\(n, 'memória', 'memórias'\) : null/);
  });
});
