// A página da pessoa, proposta A do conceito da sessão L ("o verbete", escolha do Gui de 18/11/2026).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FORMAS_DA_VIDA, contaDaFamiliaDePerto, enderecoDaVida, fasesDaVida, nomeDoGrupoDePerto, fraseDoAcervo, idadeNoAno, lerFormaDaVida, mostraRascunhoNaVida, nomeDaFormaDaVida, partesDaData, textoDaIdade } from '../src/lib/pagina-da-pessoa';


describe('as formas de ver da página da pessoa', () => {
  it('pela idade é o padrão, e a linha do tempo e o mural continuam como opção (pedido do Gui)', () => {
    expect([...FORMAS_DA_VIDA]).toEqual(['idade', 'linha', 'mural']);
    expect(lerFormaDaVida(new URLSearchParams(''))).toBe('idade');
    expect(lerFormaDaVida(new URLSearchParams('ver=linha'))).toBe('linha');
    expect(lerFormaDaVida(new URLSearchParams('ver=tv'))).toBe('idade');
    expect(enderecoDaVida('gui')).toBe('/pessoas/gui');
    expect(enderecoDaVida('gui', 'mural')).toBe('/pessoas/gui?ver=mural');
  });
  it('sem o ano de nascimento, a primeira forma agrupa por década', () => {
    expect(nomeDaFormaDaVida('idade', true)).toBe('Pela idade');
    expect(nomeDaFormaDaVida('idade', false)).toBe('Por década');
  });
  it('o rascunho fica fora só do mural', () => {
    expect(mostraRascunhoNaVida('idade')).toBe(true);
    expect(mostraRascunhoNaVida('linha')).toBe(true);
    expect(mostraRascunhoNaVida('mural')).toBe(false);
  });
});

describe('a vida em memórias, pela idade', () => {
  it('agrupa de dez em dez anos, na ordem em que as memórias chegam', () => {
    const fases = fasesDaVida([{ ano: 2026 }, { ano: 2021 }, { ano: 1999 }, { ano: 1992 }], 1992);
    expect(fases.map((f) => [f.titulo, f.quando, f.memorias.length])).toEqual([
      ['Dos 30 aos 39 anos', '2022 a 2031', 1],
      ['Dos 20 aos 29 anos', '2012 a 2021', 1],
      ['Até os 9 anos', '1992 a 2001', 2],
    ]);
  });
  it('sem o nascimento, ou antes dele, vale a década do calendário', () => {
    expect(fasesDaVida([{ ano: 1995 }, { ano: 1968 }], null).map((f) => f.titulo)).toEqual(['Anos 1990', 'Anos 1960']);
    expect(fasesDaVida([{ ano: 1980 }], 1992).map((f) => f.titulo)).toEqual(['Anos 1980']);
  });
  it('a idade escrita do jeito que se fala', () => {
    expect(idadeNoAno(1992, 2026)).toBe(34);
    expect(idadeNoAno(null, 2026)).toBeNull();
    expect(idadeNoAno(1992, 1990)).toBeNull();
    expect(textoDaIdade(0)).toBe('no ano em que nasceu');
    expect(textoDaIdade(1)).toBe('com 1 ano');
    expect(textoDaIdade(34)).toBe('aos 34 anos');
  });
});

describe('a frase de abertura sem "Sobre"', () => {
  it('diz o que o acervo sabe', () => {
    expect(fraseDoAcervo({ nome: 'Elizete', memorias: 34, de: 1968, ate: 2026, relatos: 10, eu: false })).toBe('Elizete aparece em 34 memórias do acervo, de 1968 a 2026, e contou 10 delas.');
    expect(fraseDoAcervo({ nome: 'Lourdes', memorias: 0, relatos: 0, eu: false })).toBe('Lourdes ainda não aparece em nenhuma memória do acervo.');
    expect(fraseDoAcervo({ nome: 'Gui', memorias: 1, de: 2010, ate: 2010, relatos: 0, eu: true })).toBe('Você aparece em 1 memória do acervo, em 2010.');
    expect(fraseDoAcervo({ nome: 'Bela', memorias: 3, de: 1990, ate: 2000, relatos: 1, eu: false })).toBe('Bela aparece em 3 memórias do acervo, de 1990 a 2000, e contou uma delas.');
  });
});

describe('a página, depois das observações do Gui (18/11/2026)', () => {
  const ler = (c: string) => readFileSync(c, 'utf-8');
  const pagina = ler('src/pages/pessoas/[id]/index.astro');
  const css = ler('src/visual/telas/pessoa.css');

  it('o quadro é como o painel da árvore: partes em sanfona, uma aberta por vez, "Dados" aberta e "Na árvore" fechada com um resumo', () => {
    expect(pagina).toMatch(/<details class="quadro__secao" name="quadro-da-pessoa" open>\s*<summary>\s*<span class="quadro__nome">Dados<\/span>/);
    expect(pagina).toMatch(/<details class="quadro__secao" name="quadro-da-pessoa">\s*<summary>\s*<span class="quadro__nome">Na árvore<\/span>\s*<span class="quadro__resumo"/);
    expect(pagina).toContain('<span class="quadro__conta ficha suave">{resumoDaArvore}</span>');
  });
  it('com mouse, o quadro acompanha a rolagem e rola por dentro; no toque, nada fica preso', () => {
    const preso = css.slice(css.indexOf('@media (min-width: 62rem) and (hover: hover) and (pointer: fine)'));
    expect(preso).toMatch(/position: sticky;[^}]*max-height: calc\(100vh - 2 \* var\(--e-5\)\);/);
    // Rola por dentro só a parte aberta (QA de 18/11/2026, abaixo)
    expect(preso).toMatch(/\.quadro__secao\[open\] \{[^}]*overflow-y: auto;/);
    expect(css.slice(0, css.indexOf('@media (min-width: 62rem) and (hover: hover) and (pointer: fine)'))).not.toMatch(/position: sticky/);
  });
  it('"Mostrar datas" e "Como você chama" não recarregam a página (o mínimo de recarregamentos)', () => {
    expect(pagina).toMatch(/<div class="dados__data" data-falecimento hidden=\{!p\.mostrarDatas\}>/);
    expect(pagina).toMatch(/falecimento\.hidden = !falecimento\.hidden;/);
    expect(pagina).toMatch(/history\.replaceState\(history\.state, '', endereco\);/);
    expect(pagina).toMatch(/<form class="como-chama__form" method="post" action="\/api\/apelidos" data-no-lugar="abertura" data-chave="como-chama">/);
    expect(pagina).toMatch(/<div class="regiao" data-regiao="abertura">/);
  });
  it('as outras formas de ver são buscadas antes, para a troca ser imediata', () => {
    const troca = ler('src/lib/cliente/explorar-troca.ts');
    expect(troca).toMatch(/export function adiantar\(endereco: URL\): void/);
    expect(troca).toMatch(/const texto = await buscarPagina\(endereco\);/);
    expect(pagina).toMatch(/adiantar\(new URL\(link\.href\)\)/);
  });
  it('a linha do tempo e o mural cabem na coluna, ao lado do quadro', () => {
    expect(css).toMatch(/\.verbete__vida--linha \.ano__numero \{\s*font-size: var\(--t-titulo-1\);/);
    expect(css).toMatch(/\.verbete__vida \.mural,\s*\.verbete__vida \.mural\[data-tamanho\] \{\s*--colunas: 3;/);
    expect(css).not.toMatch(/verbete__vida--mural\s*\{\s*grid-column: 1 \/ -1/);
  });
  it('o histórico da página aparece para quem pode mudá-la', () => {
    expect(pagina).toMatch(/\{p\.podeEditar && \(\s*<a class="acao acao--quieta" href=\{`\/pessoas\/\$\{pessoa\.id\}\/historico`\}>/);
  });
});

describe('os nomes da família de perto seguem "como se referir" (QA de 18/11/2026)', () => {
  const ela = { tratamento: 'ela' as const };
  const ele = { tratamento: 'ele' as const };
  const sem = { tratamento: null };
  it('uma pessoa só, com o tratamento: mãe, pai, irmã, irmão, filha, filho', () => {
    expect(nomeDoGrupoDePerto('pais', [ela])).toBe('mãe');
    expect(nomeDoGrupoDePerto('pais', [ele])).toBe('pai');
    expect(nomeDoGrupoDePerto('irmaos', [ela])).toBe('irmã');
    expect(nomeDoGrupoDePerto('irmaos', [ele])).toBe('irmão');
    expect(nomeDoGrupoDePerto('filhos', [ela])).toBe('filha');
  });
  it('sem o tratamento, as duas formas; mais de um, o plural (feminino só quando são todas)', () => {
    expect(nomeDoGrupoDePerto('pais', [sem])).toBe('pai ou mãe');
    expect(nomeDoGrupoDePerto('irmaos', [sem])).toBe('irmão ou irmã');
    expect(nomeDoGrupoDePerto('pais', [ela, ele])).toBe('pais');
    expect(nomeDoGrupoDePerto('irmaos', [ela, ela])).toBe('irmãs');
    expect(nomeDoGrupoDePerto('filhos', [ela, sem])).toBe('filhos');
  });
  it('a conta do quadro fechado: o bichinho com a tutora não diz "1 pai ou mãe"', () => {
    expect(contaDaFamiliaDePerto({ pais: [ela], casais: 0, filhos: [], irmaos: [] })).toBe('1 mãe');
    expect(contaDaFamiliaDePerto({ pais: [ela, ele], casais: 1, filhos: [ela, ela], irmaos: [ele] })).toBe('2 pais, casal, 2 filhas e 1 irmão');
  });
  it('a página usa os nomes que seguem o tratamento, e não as duas formas fixas', () => {
    const pagina = readFileSync('src/pages/pessoas/[id]/index.astro', 'utf8');
    expect(pagina).not.toContain("'Irmão ou irmã'");
    expect(pagina).not.toContain("'pai ou mãe'");
    expect(pagina).toContain("nomeDoGrupoDePerto('irmaos', irmaos)");
  });
});

describe('o quadro em tela baixa (decisão do Gui depois do QA de 18/11/2026)', () => {
  const css = readFileSync('src/visual/telas/pessoa.css', 'utf8');
  it('o retrato e os títulos das partes fechadas ficam à vista, e só a parte aberta rola por dentro', () => {
    expect(css).toMatch(/\.verbete__alto\.grade > \.verbete__quadro \{\s*position: sticky;[^}]*display: flex;\s*flex-direction: column;\s*max-height: calc\(100vh - 2 \* var\(--e-5\)\);\s*\}/);
    expect(css).toMatch(/\.verbete__quadro > \* \{\s*flex: none;\s*\}/);
    expect(css).toMatch(/\.verbete__quadro > \.quadro__secao\[open\] \{\s*flex: 0 1 auto;\s*min-height: 0;\s*overflow-y: auto;/);
    expect(css).toMatch(/\.verbete__quadro > \.quadro__secao\[open\] > summary \{\s*position: sticky;\s*top: 0;/);
  });
});

describe('o nascimento em "Dados": o aniversário em destaque (pedido do Gui, 18/11/2026)', () => {
  it('com o dia e o mês, o aniversário é o grande e o ano fica pequeno', () => {
    expect(partesDaData({ ano: 1961, mes: 7, dia: 24 })).toEqual({ grande: '24 de julho', pequena: '1961' });
  });
  it('sem o dia, o ano continua grande, com o mês pequeno quando há', () => {
    expect(partesDaData({ ano: 1961, mes: 7, dia: null })).toEqual({ grande: '1961', pequena: 'julho' });
    expect(partesDaData({ ano: 1961 })).toEqual({ grande: '1961', pequena: null });
  });
  it('a página usa as duas partes, e não mais o ano fixo como o grande', () => {
    const pagina = readFileSync('src/pages/pessoas/[id]/index.astro', 'utf8');
    expect(pagina).toContain('{p.nascimento.grande}');
    expect(pagina).toContain('{p.nascimento.pequena}');
    expect(pagina).not.toContain('{p.nascimento.ano}');
  });
});
