// Regras que nasceram das respostas do Gui ao QA de design de 17/11/2026, no Início e na carta de
// Natal (docs/historico/qa/2026-11-17-perguntas.md, P1, P6 e P13 a P31).
import { describe, expect, it } from 'vitest';
import { anoDaUltimaVisita, chegarAoPainel, composicaoDoInicio, nomeParaQuemOlha } from '../src/lib/painel';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

const nada = { memoriasNovas: 0, relatosNovos: 0, outrosAnos: 0, contar: false, aniversarios: false, voce: false };

describe('a carta na primeira visita (P14, P15)', () => {
  it('aparece uma vez: a ação da carta leva ao Início, que já vem com o painel', () => {
    const natal = new Date('2026-12-24T21:00:00Z');
    const primeira = chegarAoPainel(undefined, natal, true);
    expect(primeira.cartaNoAlto).toBe(true);
    expect(chegarAoPainel(primeira.registro, new Date(natal.getTime() + 60 * 1000), true).cartaNoAlto).toBe(false);
    const inicio = ler('src/pages/index.astro');
    expect(inicio).toMatch(/cartaNoAlto && <Carta .*acao=\{\{ href: '\/', texto: 'Abrir o acervo' \}\}/);
    // Com a carta na tela, o painel não vem embaixo
    expect(inicio.match(/!cartaNoAlto && \(/g)?.length).toBe(3);
  });
});

describe('a composição do Início (P13, P16 a P19)', () => {
  it('com novidade, a mesa é das novidades e o envelope aparece', () => {
    const c = composicaoDoInicio({ ...nada, memoriasNovas: 1, relatosNovos: 1, contar: true, voce: true });
    expect(c.mesa).toBe('novidades');
    expect(c.envelope).toBe(true);
  });

  it('sem novidade, a mesa recebe "Neste dia" e o envelope some', () => {
    const c = composicaoDoInicio({ ...nada, outrosAnos: 1, contar: true, aniversarios: true, voce: true });
    expect(c.mesa).toBe('outros-anos');
    expect(c.envelope).toBe(false);
    // "Neste dia" já está na mesa: a fileira do computador fica com os outros três
    expect(c.naFileira).toBe(3);
    expect(c.outrosAnosEmFaixa).toBe(false);
  });

  it('sem novidade e sem "Neste dia", a mesa recebe a memória para contar', () => {
    const c = composicaoDoInicio({ ...nada, contar: true, aniversarios: true, voce: true });
    expect(c.mesa).toBe('contar');
    expect(c.naFileira).toBe(2);
    expect(composicaoDoInicio({ ...nada, aniversarios: true }).mesa).toBe('vazia');
  });

  it('"Você no acervo" vem primeiro (crítica C1), e contar vem antes de "Neste dia", que vem antes dos aniversários', () => {
    const c = composicaoDoInicio({ memoriasNovas: 2, relatosNovos: 0, outrosAnos: 2, contar: true, aniversarios: true, voce: true });
    expect(c.cartoes).toEqual(['voce', 'contar', 'outros-anos', 'aniversarios']);
  });

  it('"Neste dia" com uma ou duas memórias é um cartão da fileira; com três ou quatro, uma faixa', () => {
    const pouco = composicaoDoInicio({ ...nada, memoriasNovas: 1, outrosAnos: 2, contar: true, voce: true });
    expect(pouco.outrosAnosEmFaixa).toBe(false);
    expect(pouco.naFileira).toBe(3);
    const muito = composicaoDoInicio({ ...nada, memoriasNovas: 1, outrosAnos: 3, contar: true, aniversarios: true, voce: true });
    expect(muito.outrosAnosEmFaixa).toBe(true);
    // A faixa divide a linha com a memória para contar; aniversários e "Você no acervo" ficam na de baixo
    expect(muito.naFileira).toBe(2);
  });

  it('o relato e "E mais N" só descem para a fileira de largura inteira quando há "E mais N"', () => {
    expect(composicaoDoInicio({ ...nada, memoriasNovas: 1, relatosNovos: 1 }).filaInteira).toBe(false);
    expect(composicaoDoInicio({ ...nada, memoriasNovas: 2, relatosNovos: 1 }).filaInteira).toBe(false);
    expect(composicaoDoInicio({ ...nada, memoriasNovas: 3, relatosNovos: 1 }).filaInteira).toBe(true);
    expect(composicaoDoInicio({ ...nada, memoriasNovas: 2, relatosNovos: 2 }).filaInteira).toBe(true);
    // Só relatos novos: ficam na mesa, no lugar das fotos
    expect(composicaoDoInicio({ ...nada, relatosNovos: 3 }).filaInteira).toBe(false);
  });

  it('o relato tem a fileira dele na mesa, e a regra não perde para a da segunda foto (P17)', () => {
    const css = ler('src/visual/telas/painel.css');
    expect(css).toMatch(/\.novo__fila > \.novidade--relato \{\s*grid-column: 2 \/ span 7;/);
    // O relato e as fotos moram em listas diferentes: nth-child(2) nunca mais alcança o relato
    expect(ler('src/pages/index.astro')).not.toContain('novidade--relato');
    expect(ler('src/components/painel/Fila.astro')).toContain('novidade--relato');
  });
});

describe('o nome para quem olha (P22)', () => {
  it('o apelido com o parentesco de outra pessoa vira o nome, com o parentesco de quem olha', () => {
    expect(nomeParaQuemOlha('Tia Lourdes', 'sua irmã')).toEqual({ nome: 'Lourdes', parentesco: 'sua irmã' });
    expect(nomeParaQuemOlha('Prima Júlia', 'sua sobrinha')).toEqual({ nome: 'Júlia', parentesco: 'sua sobrinha' });
    expect(nomeParaQuemOlha('Vó Bela', 'sua mãe')).toEqual({ nome: 'Bela', parentesco: 'sua mãe' });
  });

  it('quando o parentesco do apelido é o de quem olha, o apelido fica', () => {
    expect(nomeParaQuemOlha('Tia Cida', 'sua tia')).toEqual({ nome: 'Tia Cida', parentesco: undefined });
    expect(nomeParaQuemOlha('Vó Bela', 'sua avó')).toEqual({ nome: 'Vó Bela', parentesco: 'sua avó' });
    expect(nomeParaQuemOlha('Vó Bela', 'sua bisavó').nome).toBe('Vó Bela');
    expect(nomeParaQuemOlha('Tio Zeca', 'seu tio de consideração').nome).toBe('Tio Zeca');
  });

  it('sem parentesco com quem olha, ou sem parentesco no apelido, nada muda', () => {
    expect(nomeParaQuemOlha('Tia Lourdes', undefined)).toEqual({ nome: 'Tia Lourdes', parentesco: undefined });
    expect(nomeParaQuemOlha('Elizete', 'sua mãe')).toEqual({ nome: 'Elizete', parentesco: 'sua mãe' });
    expect(nomeParaQuemOlha('Tia', 'sua irmã').nome).toBe('Tia');
  });
});

describe('os textos do Início (P1, P6, P20, P23 a P28)', () => {
  const inicio = ler('src/pages/index.astro');

  it('o convite usa a palavra do menu e não é do tamanho da saudação', () => {
    expect(inicio).toContain('Explorar todas as memórias');
    expect(inicio).not.toContain('Ver a linha do tempo inteira');
    expect(inicio).toMatch(/<h2 class="caminho__titulo t-2"/);
    expect(inicio.match(/class="t-1"/g)?.length).toBe(1);
  });

  it('as décadas se dizem como no filtro do Explorar', () => {
    expect(inicio).toMatch(/nomeDaDecada\(d\)\.rotulo/);
  });

  it('a abertura avisa do rascunho e não mostra a data de hoje', () => {
    expect(inicio).toContain('Você tem um rascunho.');
    expect(inicio).toContain('Continuar o rascunho');
    expect(inicio).toContain('seusRascunhos(usuario.pessoa');
    expect(inicio).not.toMatch(/diaMesCurto\(hoje\)/);
  });

  it('a última visita leva o ano quando não é o ano corrente', () => {
    expect(anoDaUltimaVisita({ ano: 2026, mes: 11, dia: 17 }, { ano: 2026, mes: 12, dia: 24 })).toBe('');
    expect(anoDaUltimaVisita({ ano: 2020, mes: 1, dia: 1 }, { ano: 2026, mes: 12, dia: 24 })).toBe(' de 2020');
  });

  it('o rótulo do relato novo diz só "Relato novo", com o título numa linha própria', () => {
    const fila = ler('src/components/painel/Fila.astro');
    expect(fila).not.toMatch(/Relato novo ·/);
    expect(fila).toMatch(/Relato novo\s*<\/span>\s*<strong class="novidade__titulo serifa t-3">/);
  });

  it('os aniversários têm o título curto, e o botão de teste vem com o rótulo "Teste"', () => {
    expect(inicio).toContain('Próximos aniversários');
    expect(inicio).not.toContain('Aniversários dos próximos 30 dias');
    expect(inicio).toMatch(/<span class="rotulo suave">Teste<\/span>/);
  });

  it('a foto do cartão de contar leva à memória, sem repetir o link para o teclado (P26)', () => {
    expect(ler('src/components/painel/Contar.astro')).toMatch(/<a class="contar__foto" href=\{`\/memorias\/\$\{memoria\.id\}`\} tabindex="-1" aria-hidden="true">/);
  });
});

describe('a carta de Natal (P29 a P31)', () => {
  const peca = ler('src/components/Carta.astro');
  const pagina = ler('src/pages/carta.astro');

  it('cada foto leva à memória dela, com nome para o leitor de tela, e a da frente vem primeiro', () => {
    expect(peca).toMatch(/<a class=\{`carta__foto carta__foto--\$\{lugar\}`\} href=\{`\/memorias\/\$\{m\.id\}`\} aria-label=/);
    expect(peca).not.toMatch(/carta__fotos" aria-hidden/);
    expect(peca).toMatch(/naOrdemDoFoco = \[\.\.\.comLugar\.filter\(\(f\) => f\.lugar === 'frente'\)/);
  });

  it('em /carta, a volta ao início é uma ação sublinhada, e o link dos administradores diz o que há para fazer', () => {
    expect(pagina).toMatch(/texto: 'Voltar ao início', quieta: true/);
    expect(peca).toMatch(/class=\{acao\.quieta \? 'acao' : 'botao'\}/);
    expect(pagina).toContain('Editar a carta');
    expect(pagina.match(/Escrever a carta/g)?.length).toBe(1);
  });
});
