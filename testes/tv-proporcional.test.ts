// O modo TV proporcional, conceito da sessão X (22/11/2026): as duas propostas na mesma marcação,
// a unidade que sai da janela, os degraus do texto da proposta A e o contraste do vidro. Quando o
// Gui escolher, a sessão que constrói a vencedora leva o que valer para testes/explorar-controles.test.ts.
// A conferência com o navegador é a de scripts/confere-tv.mjs.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contraste, neutroDosTokens } from '../src/lib/contraste';
import { CONCEITOS_DA_TV, degrauDoTitulo, degrauDoTrecho, lerConceitoDaTv } from '../src/lib/explorar';

const ler = (caminho: string) => readFileSync(caminho, 'utf8');
const css = ler('src/visual/telas/tv.css');
const tokens = ler('src/visual/tokens.css');
const palco = ler('src/components/explorar/Palco.astro');

describe('as duas propostas, pelo endereço', () => {
  it('conceito=a, b ou hoje; sem o parâmetro ou com um valor estranho, vale a A', () => {
    expect(CONCEITOS_DA_TV.map((c) => c.id)).toEqual(['a', 'b', 'hoje']);
    expect(lerConceitoDaTv(new URLSearchParams('conceito=b'))).toBe('b');
    expect(lerConceitoDaTv(new URLSearchParams('conceito=hoje'))).toBe('hoje');
    expect(lerConceitoDaTv(new URLSearchParams(''))).toBe('a');
    expect(lerConceitoDaTv(new URLSearchParams('conceito=z'))).toBe('a');
  });

  it('o conceito segue de uma memória para a outra e há uma forma visível de alternar', () => {
    const pagina = ler('src/pages/explorar.astro');
    expect(pagina).toMatch(/enderecoDoExplorar\(filtros, 'tv', \{ m: id, [^}]*conceito: qual \}\)/);
    expect(palco).toMatch(/<nav class="palco__conceitos ficha" aria-label="Proposta em teste">/);
  });
});

describe('a tela não rola e é proporcional à janela', () => {
  const bloco = css.slice(css.indexOf('@media (min-width: 62rem) {'));

  it('só vale a partir de 62rem: abaixo disso, o modo TV é o de hoje', () => {
    const fora = css.slice(0, css.indexOf('@media (min-width: 62rem) {')).replace(/\/\*[\s\S]*?\*\//g, '');
    // Fora da regra de mídia só fica o que esconde o verso e a troca de proposta
    expect(fora.trim()).toMatch(/^\.palco__verso,\s*\.palco__conceitos \{\s*display: none;\s*\}$/);
    expect(css.match(/@media/g)).toHaveLength(1);
  });

  it('1rem é um pedaço da janela: 1/80 da largura ou 1/45 da altura, o que for menor', () => {
    expect(bloco).toMatch(/html:has\(\.palco--prop\) \{\s*font-size: min\(100vw \/ 80, 100svh \/ 45\);/);
    // Nenhum degrau por faixa de altura
    expect(css).not.toMatch(/\((min|max)-height/);
  });

  it('o palco tem a altura exata da janela e nada é preso por fixed nem sticky', () => {
    expect(bloco).toMatch(/\.palco--tv\.palco--prop\[data-conceito\] \{[^}]*height: 100svh;[^}]*overflow: clip;/);
    expect(css).not.toMatch(/position\s*:\s*(fixed|sticky)/);
    expect(bloco).toMatch(/\.palco--tv\.palco--prop\[data-conceito\] \.palco__controles \{[^}]*position: absolute;/);
  });

  it('a foto sai da altura que sobra na janela', () => {
    expect(bloco).toMatch(/--foto: min\(var\(--tv-foto-max\), \(100svh - var\(--tv-topo\) - var\(--tv-pe\) - var\(--tv-respiro\)\) \/ var\(--tv-razao\)\);/);
  });
});

describe('proposta A: o texto desce na escala', () => {
  it('o título tem três degraus pelo tamanho', () => {
    expect(degrauDoTitulo('Casamento da Prima Carol')).toBe(1);
    expect(degrauDoTitulo('a'.repeat(40))).toBe(1);
    expect(degrauDoTitulo('a'.repeat(41))).toBe(2);
    expect(degrauDoTitulo('a'.repeat(90))).toBe(2);
    expect(degrauDoTitulo('a'.repeat(120))).toBe(3);
    // Conta letras, e não bytes
    expect(degrauDoTitulo('ã'.repeat(40))).toBe(1);
  });

  it('o trecho tem dois', () => {
    expect(degrauDoTrecho('a'.repeat(150))).toBe(1);
    expect(degrauDoTrecho('a'.repeat(220))).toBe(2);
  });

  it('cada degrau tem o tamanho dele, saído dos tokens', () => {
    for (const [degrau, fator] of [['2', '0.46'], ['3', '0.36']] as const) expect(css).toMatch(new RegExp(`\\[data-conceito='a'\\] \\.palco__titulo\\[data-degrau='${degrau}'\\] \\{[^}]*font-size: calc\\(var\\(--t-titulo-1\\) \\* ${fator}\\);`));
    expect(palco).toContain("data-degrau={conceito === 'a' ? degrauDoTitulo(memoria.titulo) : undefined}");
  });
});

describe('proposta B: o verso', () => {
  it('abre sem script, antes de "Abrir esta memória", e traz todos os nomes', () => {
    expect(palco).toMatch(/\{conceito === 'b' && \(\s*<details class="palco__verso" data-palco-verso>/);
    expect(palco).toContain('<p class="ficha">{listaCurta(nomes, nomes.length)}</p>');
    expect(palco.indexOf('data-palco-verso>')).toBeLessThan(palco.lastIndexOf('Abrir esta memória'));
  });

  it('com o verso aberto, o "Passar sozinho" espera, e o Esc fecha antes de sair do modo TV', () => {
    expect(palco).toMatch(/if \(palco\(\)\?\.querySelector\('\[data-palco-verso\]\[open\]'\)\) return;/);
    expect(palco).toMatch(/if \(evento\.key === 'Escape' && fecharAbertos\(\)\) return evento\.preventDefault\(\);/);
  });

  it('o trilho é do material do site: o branco do que está pousado, sem vidro', () => {
    const regra = /\[data-conceito='b'\] \.palco__controles::before,[^{]*\{([^}]*)\}/.exec(css)![1]!;
    expect(regra).toContain('background: var(--branco);');
    expect(regra).not.toContain('backdrop-filter');
  });
});

describe('o vidro', () => {
  // A cor que se vê é o vidro por cima do que está atrás. O pior caso de cada lado: a foto toda
  // preta e a foto toda branca, sem contar com o desfoque.
  const canais = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const hex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  const mistura = (a: string, b: string, parte: number) => hex(canais(a).map((v, i) => v * parte + canais(b)[i]! * (1 - parte)));
  const parte = (nome: string) => Number(new RegExp(`--${nome}: color-mix\\(in srgb, var\\(--[a-z]+\\) (\\d+)%`).exec(tokens)![1]) / 100;
  const branco = neutroDosTokens(tokens, 'branco');
  const tinta = neutroDosTokens(tokens, 'tinta');
  const suave = mistura(tinta, branco, parte('vidro-suave'));

  it('o texto e o texto de apoio passam de 4,5 para um sobre foto escura e sobre foto clara', () => {
    for (const foto of ['#000000', '#ffffff']) {
      const fundo = mistura(branco, foto, parte('vidro'));
      expect(contraste(tinta, fundo), `tinta sobre o vidro, foto ${foto}`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(suave, fundo), `apoio sobre o vidro, foto ${foto}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('os controles usam o texto de apoio do vidro, e não o do papel', () => {
    expect(css).toMatch(/\.palco__controles \{\s*(\/\*[^*]*\*\/\s*)?--tinta-suave: var\(--vidro-suave\);/);
    expect(css).toMatch(/-webkit-backdrop-filter: var\(--vidro-desfoque\);\s*backdrop-filter: var\(--vidro-desfoque\);/);
  });
});
