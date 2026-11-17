// Regras que nasceram das respostas do Gui ao QA de design de 17/11/2026 (docs/qa/2026-11-17-perguntas.md),
// nas telas da conta, da lixeira, da administração, do sistema visual e da página não encontrada.
import { describe, expect, it } from 'vitest';
import { LIMITE_DA_LISTA, administracao, fraseDaLixeira, oComeco } from '../src/lib/conta';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync, existsSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string; existsSync: (caminho: URL) => boolean };
const endereco = (caminho: string) => new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url);
const ler = (caminho: string) => readFileSync(endereco(caminho), 'utf8');

describe('sua conta', () => {
  const conta = ler('src/pages/conta.astro');

  it('P148: os números de "O que você criou" têm o tamanho de título de parte', () => {
    const css = ler('src/visual/telas/conta.css');
    const numero = css.slice(css.indexOf('.criado__numero {'), css.indexOf('}', css.indexOf('.criado__numero {')));
    expect(numero).toContain('font-size: var(--t-titulo-2)');
  });

  it('P149: o cartão "Seus dados" saiu, e nada na conta diz "Não informado"', () => {
    expect(conta).not.toContain('Seus dados');
    expect(conta).not.toContain('Não informado');
    expect(conta).toContain('conta__dados');
  });

  it('P150: a página Rascunhos saiu, e nada no site leva a ela', () => {
    expect(existsSync(endereco('src/pages/rascunhos.astro'))).toBe(false);
    for (const arquivo of ['src/pages/lixeira.astro', 'src/pages/api/lixeira.ts', 'src/pages/conta.astro', 'src/layouts/Visual.astro']) expect(ler(arquivo), arquivo).not.toContain('/rascunhos');
    expect(ler('src/pages/api/lixeira.ts')).toMatch(/rascunho \? '\/conta' : '\/'/);
  });

  it('P151: a lista aberta mostra as dez primeiras e diz quantas existem', () => {
    expect(LIMITE_DA_LISTA).toBe(10);
    const muitas = Array.from({ length: 24 }, (_, i) => i);
    expect(oComeco(muitas)).toEqual({ mostra: muitas.slice(0, 10), total: 24, haMais: true });
    expect(oComeco([1, 2, 3])).toEqual({ mostra: [1, 2, 3], total: 3, haMais: false });
    expect(oComeco(muitas.slice(0, 10)).haMais).toBe(false);
    // A tela não lista mais nada direto de `criou`
    expect(conta).not.toMatch(/criou\.(memorias|relatos|fotos|capitulos)\.map\(/);
  });

  it('P152: quem administra lê a conta do que a lixeira mostra; os demais, a do que é deles', () => {
    expect(fraseDaLixeira(true, 0)).toBe('Nada na lixeira.');
    expect(fraseDaLixeira(true, 1)).toBe('Uma coisa na lixeira.');
    expect(fraseDaLixeira(true, 3)).toBe('3 coisas na lixeira.');
    expect(fraseDaLixeira(false, 0)).toBe('Nada seu na lixeira.');
    expect(fraseDaLixeira(false, 1)).toBe('Uma coisa sua na lixeira.');
    expect(fraseDaLixeira(false, 2)).toBe('2 coisas suas na lixeira.');
  });

  it('P153: o link é "Famílias", e a cópia do acervo fica à parte dos links que abrem página', () => {
    const itens = administracao({ admin: true }, { podeEspelhar: true });
    expect(itens.map((i) => i.rotulo)).toContain('Famílias');
    expect(itens.filter((i) => i.baixar).map((i) => i.rotulo)).toEqual(['Baixar cópia do acervo']);
    expect(conta).toContain('conta.administracao.filter((item) => !item.baixar)');
    expect(conta).toMatch(/class="conta__copia"[\s\S]*?download[\s\S]*?Banco: \{conta\.banco\}/);
  });
});
