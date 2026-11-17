// Regras que nasceram das respostas do Gui ao QA de design de 17/11/2026, na página da memória e na
// confirmação de excluir (docs/qa/2026-11-17-perguntas.md, P51 a P59).
import { describe, expect, it } from 'vitest';
import { RETRATOS_NO_CELULAR, recolheQuemEstava, relatoJaEstaNaAbertura } from '../src/lib/memoria';
import { voceOuOsOutrosAdmins } from '../src/lib/servidor/conteudo';
import { trechoDoRelato } from '../src/lib/visual';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url), 'utf8');

const pagina = ler('src/pages/memorias/[id].astro');
const css = ler('src/visual/telas/memoria.css');

describe('P51: "Quem estava" no celular', () => {
  it('só recolhe quando há mais gente do que cabe à vista', () => {
    expect(RETRATOS_NO_CELULAR).toBe(6);
    expect(recolheQuemEstava(6)).toBe(false);
    expect(recolheQuemEstava(7)).toBe(true);
  });
  it('a lista vem inteira do servidor, e é o script que recolhe', () => {
    // Sem script, ninguém fica escondido atrás de um botão que não funciona
    expect(pagina).toMatch(/<button type="button" class="acao" data-quem-todos hidden>\s*Ver todos os \{memoria\.integrantes\.length\}/);
    expect(pagina).toMatch(/quem\.classList\.add\('quem--recolhida'\);\s*verTodos\.hidden = false;/);
    expect(pagina).not.toMatch(/class:list=\{\[[^\]]*'quem--recolhida'/);
  });
  it('o corte no CSS é o mesmo da regra, e só vale abaixo de 40rem', () => {
    expect(css).toContain(`.quem--recolhida li:nth-child(n + ${RETRATOS_NO_CELULAR + 1}) {\n  display: none;`);
    const tablet = css.slice(css.indexOf('@media (min-width: 40rem)'), css.indexOf('@media (min-width: 62rem)'));
    expect(tablet).toMatch(/\.quem--recolhida li:nth-child\(n \+ 7\) \{\s*display: block;/);
    expect(tablet).toMatch(/\.quem__todos \{\s*display: none;/);
  });
  it('ao abrir, o foco vai para a primeira pessoa que apareceu', () => {
    expect(pagina).toMatch(/quem\.children\[aVista\]\?\.querySelector\('a'\)\?\.focus\(\)/);
  });
});

describe('P52: o relato que já está inteiro na abertura', () => {
  const relato = { id: 'r1', por: 'gui', registradoPor: 'gui', situacao: 'publicada', texto: 'A casa cheia, a mesa posta e todo mundo falando ao mesmo tempo.' };
  const semAudio = () => 0;
  it('não repete o bilhete quando é o único, sem áudio, e coube inteiro', () => {
    expect(relatoJaEstaNaAbertura([relato], trechoDoRelato(relato.texto), semAudio)).toBe(true);
    expect(pagina).toContain('relatos.length > 0 && !relatoSoNaAbertura && (');
  });
  it('continua quando o trecho cortou o texto', () => {
    const longo = { ...relato, texto: `${'Uma frase comprida que não acaba nunca mais. '.repeat(6)}\n\nE um segundo parágrafo.` };
    expect(relatoJaEstaNaAbertura([longo], trechoDoRelato(longo.texto), semAudio)).toBe(false);
    const doisParagrafos = { ...relato, texto: 'Primeiro.\n\nSegundo.' };
    expect(relatoJaEstaNaAbertura([doisParagrafos], trechoDoRelato(doisParagrafos.texto), semAudio)).toBe(false);
  });
  it('continua quando o bilhete traz algo que a abertura não traz', () => {
    const trecho = trechoDoRelato(relato.texto);
    // Áudio
    expect(relatoJaEstaNaAbertura([relato], trecho, () => 1)).toBe(false);
    // Outro relato, mesmo que seja um rascunho só de quem olha
    expect(relatoJaEstaNaAbertura([relato, { ...relato, id: 'r2', por: 'giovanna', registradoPor: 'giovanna', situacao: 'rascunho' }], trecho, semAudio)).toBe(false);
    // Registrado por outra pessoa: o bilhete diz quem registrou
    expect(relatoJaEstaNaAbertura([{ ...relato, por: 'vo-bela' }], trecho, semAudio)).toBe(false);
    // Só um rascunho, sem trecho na abertura
    expect(relatoJaEstaNaAbertura([{ ...relato, situacao: 'rascunho' }], undefined, semAudio)).toBe(false);
    expect(relatoJaEstaNaAbertura([], undefined, semAudio)).toBe(false);
  });
});

describe('P53: memória sem foto', () => {
  it('leva o cartão do tipo de momento no lugar da foto, só onde a abertura tem dois lados', () => {
    expect(pagina).toMatch(/memoria\.fotos\.length === 0 && \(\s*<div class="abre__foto abre__foto--tipo">\s*<Polaroid id=\{memoria\.id\} fotos=\{\[\]\}[^>]*tipo=\{memoria\.tipo\}/);
    expect(css).toMatch(/\n\.abre__foto--tipo \{\s*display: none;/);
    const computador = css.slice(css.indexOf('@media (min-width: 62rem)'));
    expect(computador).toMatch(/\.abre > \.abre__foto--tipo \{\s*display: block;/);
    // O título não passa mais por cima do lugar do cartão
    expect(css).not.toContain('abre--sem-foto');
  });
});

describe('P54: quem já contou', () => {
  it('vê uma linha quieta, sem botão cheio, e o convite fica para quem ainda não contou', () => {
    const linha = pagina.slice(pagina.indexOf('class="contou miolo"'), pagina.indexOf('!temMeuRelato && ('));
    expect(linha).toContain('Você já contou esse dia.');
    // O texto do link é o da ação do alto: "Editar meu relato", ou "Continuar meu relato" no rascunho (45-N8)
    expect(linha).toMatch(/<a class="acao" href=\{`\/memorias\/\$\{memoria\.id\}\/relato`\}>\s*\{textoDaAcao\}/);
    expect(pagina).toContain(": temMeuRelato ? 'Editar meu relato' : 'Escrever meu relato';");
    expect(linha).not.toContain('class="botao"');
    expect(pagina).toMatch(/!temMeuRelato && \(\s*<section class="convite miolo"/);
    // Um só botão cheio na página, e ele é o de escrever
    expect(pagina.match(/class="botao"/g)).toHaveLength(1);
    expect(pagina).toMatch(/<a class="botao" href=\{`\/memorias\/\$\{memoria\.id\}\/relato`\}>\s*Escrever meu relato/);
  });
});

describe('P55: a galeria', () => {
  it('fecha ao tocar no fundo, e não ao tocar na foto, na legenda ou num controle', () => {
    expect(pagina).toMatch(/caixa\.addEventListener\('click', \(evento\) => \{\s*if \(evento\.target instanceof Element && !evento\.target\.closest\('img, figcaption, button, \[data-galeria-conta\]'\)\) caixa\.close\(\);/);
  });
});

describe('P57 a P59: excluir memória', () => {
  const excluir = ler('src/pages/memorias/[id]/excluir.astro');
  it('"Nada é apagado de vez" aparece uma vez só em cada caso', () => {
    expect(excluir).toContain(`{rascunho ? 'Confira antes de confirmar. Nada é apagado de vez.' : 'Confira antes de confirmar.'}`);
    // No cartão, a frase só existe no caso da memória publicada
    expect(excluir.match(/Nada é apagado de vez/g)).toHaveLength(3);
    expect(excluir.match(/<p>Nada é apagado de vez:/g)).toHaveLength(1);
  });
  it('o botão de perigo não leva seta, em nenhuma confirmação', () => {
    expect(ler('src/visual/telas/formulario.css')).toMatch(/\.pagina-de-formulario \.botao\.botao--perigo::after \{\s*content: none;/);
  });
  it('quem pode restaurar se lê de uma vez', () => {
    const admins = [
      { id: 'gui', nome: 'Gui', tratamento: 'ele' as const, admin: true },
      { id: 'giovanna', nome: 'Giovanna', tratamento: 'ela' as const, admin: true },
      { id: 'lucas-magno', nome: 'Lucas Magno', tratamento: 'ele' as const, admin: true },
      { id: 'elizete', nome: 'Elizete', tratamento: 'ela' as const, admin: false },
    ];
    expect(voceOuOsOutrosAdmins('gui', admins)).toBe('você, a Giovanna ou o Lucas Magno');
    expect(voceOuOsOutrosAdmins('gui', admins.slice(0, 2))).toBe('você ou a Giovanna');
    expect(voceOuOsOutrosAdmins('gui', admins.slice(0, 1))).toBe('você');
    expect(excluir).toContain(`{quemRestaura} {quemRestaura === 'você' ? 'pode' : 'podem'} restaurar tudo como estava.`);
  });
});
