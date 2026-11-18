// A nova memória em frase, proposta B do conceito da sessão D (decisão do Gui, 18/11/2026): a frase é
// a trilha, a data é por toque, o resumo ao lado saiu e o "Confira" mostra a frase completa. A frase
// em si está em testes/frase-da-memoria.test.ts.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { enterAvanca } from '../src/lib/cliente/etapas';

const ler = (caminho: string) => readFileSync(caminho, 'utf8');
const nova = ler('src/pages/nova.astro');
const css = ler('src/visual/telas/formulario.css');
const pagina = ler('src/components/formularios/Pagina.astro');
const etapas = ler('src/lib/cliente/etapas.ts');

describe('a frase é a trilha', () => {
  it('as sete etapas e a ordem continuam', () => {
    const nomes = [...nova.matchAll(/data-etapa="([^"]+)"/g)].map((m) => m[1]);
    expect(nomes).toEqual(['O que aconteceu', 'Quando e onde', 'Quem estava', 'Fotos', 'Relato', 'Capítulo e temas', 'Quem vê']);
  });

  it('sem a trilha numerada: o alto da página faz o papel dela', () => {
    expect(etapas).toContain('if (!opcoes.semTrilha) form.prepend(trilha, contagem);');
    expect(nova).toContain('{ semTrilha: alto },');
    expect(nova).toContain('<Pagina titulo={titulo} nucleos={memoria?.nucleos} secao="nova" semAbertura>');
  });

  it('cada parte da frase é um botão que leva à etapa dela, pelo toque e pelo teclado', () => {
    expect(nova).toMatch(/<span class="em-frase__parte" role="button" tabindex="0" data-parte=\{parte\} \/>/);
    expect(nova).toMatch(/if \(evento\.key !== 'Enter' && evento\.key !== ' '\) return;\s*evento\.preventDefault\(\);\s*vai\(\);/);
    // Para ir adiante, o obrigatório continua valendo: o caminho é o mesmo de "Continuar"
    expect(nova).toMatch(/function irPara\(parte: ParteDaFrase\) \{[\s\S]*?etapas\.ir\(destino\);/);
  });

  it('a etapa é marcada na frase e o fio diz quanto do caminho já foi andado', () => {
    expect(css).toMatch(/\.em-frase__parte\[data-atual\] \{\s*background: var\(--pastel\);/);
    expect(nova).toContain("passo?.style.setProperty('--feito', String((indice + 1) / secoes.length));");
  });

  it('o resumo ao lado saiu: a frase é o resumo, e nada fica preso na tela', () => {
    expect(nova).not.toMatch(/ao-lado|data-frase-abertura|frase--abertura/);
    const regras = css.slice(css.indexOf('/* --- A nova memória em frase'), css.indexOf('/* --- A data flexível'));
    expect(regras).not.toMatch(/position:\s*(sticky|fixed)/);
  });

  it('o "Confira antes de publicar" mostra a frase completa e leva ao que faltou', () => {
    expect(nova).toMatch(/<div class="resumo em-frase__confira" data-resumo hidden>/);
    expect(nova).toContain('escrever(fraseDoConfira, frase, -1, ultima);');
    expect(nova).toContain('const faltas = oQueFicouSem(frase, ETAPA_DE);');
    expect(nova).toContain('Toque em qualquer parte da frase para mudar.');
  });

  it('Enter num campo continua avançando, como em todo formulário com etapas', () => {
    expect(enterAvanca({ key: 'Enter', defaultPrevented: false, target: { tagName: 'INPUT', type: 'text' } }, 0, 7)).toBe(true);
  });
});

describe('a data por toque', () => {
  it('a década, o ano e só depois o mês e o dia; os campos de sempre vão no envio', () => {
    expect(nova).toMatch(/<div class="grade-data" data-grade-data hidden>/);
    expect(nova).toMatch(/<div class="grade-data__nivel" data-nivel-mes hidden>/);
    expect(nova).toMatch(/<div class="grade-data__nivel" data-nivel-dia hidden>/);
    expect(nova).toMatch(/<div class="campos-da-data" data-data-sem-script>\s*<CampoData /);
    expect(nova).toContain("grade.querySelector<HTMLElement>('[data-nivel-mes]')!.hidden = !ano;");
    expect(nova).toContain("grade.querySelector<HTMLElement>('[data-nivel-dia]')!.hidden = !ano || !mes;");
  });

  it('sem teclado e sem o seletor do aparelho: nada de calendário', () => {
    expect(nova).not.toMatch(/type="date"|data-calendario/);
  });

  it('o dia que o mês não tem não chega a ser escolhido', () => {
    expect(nova).toContain('const diasNoMes = ano && mes ? new Date(ano, mes, 0).getDate() : 31;');
    expect(nova).toContain("if (ano && dia && dia > new Date(ano, i + 1, 0).getDate()) por('dia', '');");
  });

  it('as décadas até 1900 ficam à vista, e as de antes só com "Antes de 1900"', () => {
    expect(nova).toContain('const CORTE_DAS_DECADAS = 1900;');
    expect(nova).toContain("botao('Antes de 1900'");
  });

  it('sem ano, o aviso aparece junto da grade, e não no balão de um campo escondido', () => {
    expect(nova).toMatch(/semScript\.addEventListener\(\s*'invalid',/);
    expect(nova).toMatch(/<p class="campo__erro grade-data__erro" data-erro-da-data role="alert" hidden><\/p>/);
  });
});

describe('sem JavaScript', () => {
  it('a frase e o fio não aparecem, e a data volta a ser os campos de sempre', () => {
    expect(pagina).toMatch(/<noscript>[\s\S]*\[data-so-com-script\], \[data-hoje\] \{ display: none !important; \}/);
    expect(nova).toMatch(/data-frase-da-memoria aria-label="A memória até aqui" data-so-com-script hidden/);
    expect(nova).toMatch(/data-passo-feito aria-hidden="true" data-so-com-script hidden/);
    // A grade nasce escondida e só o script a mostra; os campos nascem à vista
    expect(nova).toContain('grade.hidden = false;');
    expect(nova).toContain('semScript.hidden = true;');
  });

  it('o cartão do alto só existe com a frase', () => {
    expect(css).toMatch(/\.em-frase__alto:has\(> \[data-frase-da-memoria\]:not\(\[hidden\]\)\) \{\s*padding: var\(--e-4\);/);
  });
});
