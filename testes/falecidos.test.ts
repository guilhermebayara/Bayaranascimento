// Quem já faleceu, no site todo (decisão do Gui, 17/11/2026): uma marca discreta no retrato, sem
// sinal religioso; a data do falecimento oculta em todo lugar, e o ano também, até a pessoa pedir em
// "Mostrar datas" na página da pessoa; e o painel sem lembrar aniversário de quem já faleceu.
import { describe, expect, it } from 'vitest';
import { anosDeVida, jaFaleceu, vidaSemRotulo } from '../src/lib/datas';
import { aniversarios } from '../src/lib/painel';

const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url), 'utf8');

describe('quem já faleceu', () => {
  it('é quem está marcado assim ou tem data de falecimento', () => {
    expect(jaFaleceu({ falecido: true, falecimentoAno: null })).toBe(true);
    expect(jaFaleceu({ falecido: false, falecimentoAno: 2019 })).toBe(true);
    expect(jaFaleceu({ falecido: false, falecimentoAno: null })).toBe(false);
  });

  it('a marca é um anel em volta do retrato, sem símbolo, e a foto continua em cor', () => {
    const peca = ler('src/components/visual/Retrato.astro');
    expect(peca).toMatch(/'retrato--falecido': falecido/);
    const css = ler('src/visual/pecas.css');
    const regra = css.slice(css.indexOf('.retrato--falecido {'), css.indexOf('}', css.indexOf('.retrato--falecido {')));
    expect(regra).toMatch(/outline: var\(--traco\) solid var\(--tinta-suave\);/);
    expect(regra).not.toMatch(/content|filter|background/);
    // Nenhum sinal religioso nem de luto escrito em lugar nenhum do visual
    for (const arquivo of ['src/visual/pecas.css', 'src/visual/telas/arvore.css', 'src/components/visual/Retrato.astro', 'src/components/visual/Gente.astro']) {
      expect(ler(arquivo), arquivo).not.toMatch(/[✝✞✟†☦✡☪🕊]|in memoriam|luto/i);
    }
  });

  it('a marca aparece em Pessoas, nos laços, em "Quem estava", no capítulo, na conta e na árvore', () => {
    expect(ler('src/components/visual/Gente.astro')).toMatch(/<Retrato nome=\{nome\} foto=\{foto\} familia=\{familia\} falecido=\{falecido\} \/>/);
    expect(ler('src/pages/pessoas/index.astro')).toMatch(/falecido=\{jaFaleceu\(p\)\}/);
    expect(ler('src/pages/pessoas/[id]/index.astro')).toMatch(/falecido=\{jaFaleceu\(pessoa\)\} cedo/);
    expect(ler('src/pages/pessoas/[id]/index.astro')).toMatch(/falecido=\{faleceu\(l\.id\)\}/);
    expect(ler('src/pages/memorias/[id].astro')).toMatch(/falecido=\{faleceu\(id\)\}/);
    expect(ler('src/pages/capitulos/[id]/index.astro')).toMatch(/falecido=\{Boolean\(achar\(id\) && jaFaleceu\(achar\(id\)!\)\)\}/);
    expect(ler('src/pages/conta.astro')).toMatch(/falecido=\{Boolean\(achar\(l\.pessoa\) && jaFaleceu/);
    const cliente = ler('src/lib/cliente/arvore.ts');
    expect(cliente.match(/marcarFalecido\(no, p\.id\);/g)).toHaveLength(2);
    expect(cliente).toMatch(/falecidos\.has\(p\.id\) \? 'retrato retrato--falecido' : 'retrato'/);
    expect(ler('src/visual/telas/arvore.css')).toMatch(/\.no--falecido span::before,\s*\.amostra-anel \{/);
  });

  it('quem usa leitor de tela ouve "já faleceu" onde a marca aparece', () => {
    expect(ler('src/components/visual/Gente.astro')).toMatch(/\{falecido && <span class="so-leitor">já faleceu<\/span>\}/);
    expect(ler('src/pages/memorias/[id].astro')).toMatch(/\{faleceu\(id\) && <span class="so-leitor">já faleceu<\/span>\}/);
    expect(ler('src/pages/pessoas/[id]/index.astro')).toMatch(/\{jaFaleceu\(pessoa\) && <p class="so-leitor">Já faleceu\.<\/p>\}/);
    expect(ler('src/lib/cliente/arvore.ts')).toMatch(/className: 'so-leitor', textContent: 'já faleceu'/);
  });

  it('a data do falecimento fica oculta em todo lugar, e o ano também', () => {
    expect(anosDeVida({ nascimentoAno: 1942, falecimentoAno: 2019 })).toBe('1942');
    expect(vidaSemRotulo({ nascimentoAno: 1942, falecimentoAno: 2019, falecimentoMes: 3, falecimentoDia: 9 })).toBe('1942');
    // Fora do formulário de editar a pessoa, nenhuma tela lê a data do falecimento por conta própria
    const telas = ['src/pages/pessoas/index.astro', 'src/pages/memorias/[id].astro', 'src/pages/capitulos/[id]/index.astro', 'src/pages/conta.astro', 'src/pages/arvore.astro', 'src/pages/index.astro', 'src/lib/cliente/arvore.ts'];
    for (const tela of telas) expect(ler(tela), tela).not.toMatch(/falecimento(Ano|Mes|Dia)|datasDeVida/);
  });

  it('só aparece para quem pede em "Mostrar datas", na página da pessoa', () => {
    const pagina = ler('src/pages/pessoas/[id]/index.astro');
    expect(pagina).toMatch(/const mostrarDatas = Astro\.url\.searchParams\.get\('datas'\) === '1';/);
    expect(pagina).toMatch(/const vida = vidaSemRotulo\(pessoa, mostrarDatas\);/);
    expect(pagina).toMatch(/\{mostrarDatas \? 'Esconder datas' : 'Mostrar datas'\}/);
    // O link só existe quando há uma data guardada para mostrar
    expect(pagina).toMatch(/const temDataOculta = Boolean\(pessoa\.falecimentoAno\);/);
    expect(vidaSemRotulo({ nascimentoAno: 1942, falecimentoAno: 2019 }, true)).toBe('1942 a 2019');
  });

  it('o painel não lembra o aniversário de quem já faleceu, e não tem lembrete de falecimento', () => {
    const pessoa = (id: string, falecido: boolean) => ({ id, nome: id, nascimentoAno: 1940, nascimentoMes: 11, nascimentoDia: 20, falecido });
    const lista = aniversarios([pessoa('viva', false), pessoa('saudosa', true)], { ano: 2026, mes: 11, dia: 17 }, new Set(), 'gui');
    expect(lista.map((a) => a.pessoa.id)).toEqual(['viva']);
    expect(ler('src/lib/painel.ts')).not.toMatch(/falecimento/);
  });
});
