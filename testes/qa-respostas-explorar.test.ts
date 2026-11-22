// Regras que nasceram das respostas do Gui ao QA de design e ao QA de código de 17/11/2026, nas telas
// do Explorar (docs/historico/qa/2026-11-17-perguntas.md, P32 a P50, e o C3 do modo TV sem rede).
import { describe, expect, it } from 'vitest';
import {
  AVISO_SEM_REDE,
  FORMAS,
  FORMAS_NO_LUGAR,
  FORMAS_QUE_SAEM,
  SEM_FILTRO,
  acaoDeVerOResultado,
  ancoraDaMemoria,
  contaDoExplorar,
  falhaDeRede,
  nomeCurto,
  terminaNoComecoDoAcervo,
} from '../src/lib/explorar';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

const controles = ler('src/components/explorar/Controles.astro');
const pagina = ler('src/pages/explorar.astro');
const linha = ler('src/components/explorar/Linha.astro');
const palco = ler('src/components/explorar/Palco.astro');
const cssDaLinha = ler('src/visual/telas/linha.css');
const cssDoExplorar = ler('src/visual/telas/explorar.css');
const cssDaLista = ler('src/visual/telas/lista.css');

const memoria = (id: string, ano: number) => ({ id, ano, mes: null, dia: null, tipo: 'dia-a-dia', integrantes: [], nucleos: [], temas: [], fotos: [], relatos: 0, criadaEm: `2026-01-01T00:00:${id}` });

describe('o alto do Explorar (P32, P34, P35, P37)', () => {
  it('"Forma de ver" tem as três formas que trocam no lugar, e as outras duas são saídas', () => {
    expect([...FORMAS_NO_LUGAR, ...FORMAS_QUE_SAEM]).toEqual(FORMAS);
    expect(FORMAS_QUE_SAEM).toEqual(['tv', 'acaso']);
    expect(controles).toMatch(/FORMAS_NO_LUGAR\.map/);
    expect(controles).toMatch(/FORMAS_QUE_SAEM\.map[\s\S]*?class="acao acao--quieta saida"/);
    // A saída nunca fica marcada como a forma em uso, e leva a seta
    expect(controles.match(/class="acao acao--quieta saida"[^>]*>/)![0]).not.toMatch(/aria-current/);
    expect(cssDaLinha).toMatch(/\.saida::after\s*\{\s*content: '→'/);
  });
  it('no celular, as opções de um controle ficam numa linha que rola para o lado', () => {
    expect(cssDaLinha).toMatch(/\n\.controle__linha \{[^}]*overflow-x: auto/);
    expect(controles.match(/class="controle__linha"/g)).toHaveLength(2);
  });
  it('no computador, a assinatura do Explorar tem dois terços do tamanho, e só ela', () => {
    expect(cssDaLinha).toMatch(/\.linha__capa--explorar \.assinatura \{\s*width: 66\.667%/);
    expect(pagina.match(/linha__capa linha__capa--explorar/g)).toHaveLength(3);
  });
  it('toda opção reserva a largura do negrito', () => {
    expect(controles.match(/class="opcao__texto" data-texto=/g)!.length).toBeGreaterThanOrEqual(4);
    expect(cssDaLinha).toMatch(/\.opcao__texto::after \{[^}]*content: attr\(data-texto\)[^}]*height: 0[^}]*visibility: hidden[^}]*font-weight: 600/);
  });
  it('a faixa se chama "Ir para a década" e o filtro só tem "Do ano" e "Até o ano"', () => {
    expect(linha).toMatch(/class="decadas__nome rotulo"[^>]*>\s*Ir para a década\s*</);
    expect(controles).not.toMatch(/name="decada"/);
    expect(controles).toMatch(/name="de"/);
    expect(controles).toMatch(/name="ate"/);
    // O endereço antigo, com a década, aparece nos dois campos
    expect(controles).toMatch(/filtros\.de \?\? filtros\.decada/);
  });
});

describe('os filtros (P33, P36, P38)', () => {
  it('o fim do formulário diz quantas memórias passam', () => {
    expect(acaoDeVerOResultado(3)).toBe('Ver as 3 memórias');
    expect(acaoDeVerOResultado(1)).toBe('Ver a memória');
    expect(acaoDeVerOResultado(0)).toBeNull();
    expect(controles).toMatch(/<button class="botao so-com-troca" type="button" data-ver-resultado>/);
  });
  it('a ação só aparece com script, no lugar de "Mostrar memórias"', () => {
    expect(cssDoExplorar).toMatch(/\.com-troca \.filtros__acoes \.sem-troca,\s*html:not\(\.com-troca\) \.filtros__acoes \.so-com-troca \{\s*display: none/);
    expect(ler('src/lib/cliente/explorar-troca.ts')).toMatch(/painel\.open = false;\s*resultado\.scrollIntoView/);
  });
  it('cada forma de ver diz onde o resultado começa', () => {
    for (const peca of ['Linha', 'Lista', 'Mural']) expect(ler(`src/components/explorar/${peca}.astro`), peca).toMatch(/data-resultado/);
  });
  it('no celular, as caixas de marcar ficam em duas colunas fixas', () => {
    expect(cssDoExplorar).toMatch(/\.filtros__lista \{\s*display: grid;\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  });
  it('sem resultado, a conta diz "Nenhuma memória"', () => {
    expect(contaDoExplorar([])).toBe('Nenhuma memória');
    expect(contaDoExplorar([2019])).toBe('1 memória · em 2019');
    expect(contaDoExplorar([2026, 1958, 1990])).toBe('3 memórias · de 1958 a 2026');
    expect(pagina).toMatch(/contaDoExplorar\(/);
  });
});

describe('a volta do modo TV e do "ao acaso" (P39)', () => {
  it('leva à linha do tempo, na memória que estava na tela', () => {
    expect(ancoraDaMemoria('2025-natal')).toBe('memoria-2025-natal');
    expect(pagina).toMatch(/sair=\{daVez \? `\$\{voltar\}#\$\{ancoraDaMemoria\(daVez\.id\)\}` : voltar\}/);
    expect(linha).toMatch(/id=\{ancoraDaMemoria\(m\.id\)\}/);
    expect(cssDaLinha).toMatch(/\.entrada\[id\] \{\s*scroll-margin-top:/);
  });
});

describe('o fecho da linha do tempo (P41)', () => {
  const todas = [memoria('a', 1958), memoria('b', 1990), memoria('c', 2026)];
  it('"Aqui começa o acervo." só quando a última memória da tela é a mais antiga de todas', () => {
    expect(terminaNoComecoDoAcervo([todas[2]!, todas[1]!, todas[0]!], todas, 'recentes')).toBe(true);
    // Um filtro tirou a mais antiga
    expect(terminaNoComecoDoAcervo([todas[2]!, todas[1]!], todas, 'recentes')).toBe(false);
    // Em "Mais antigas primeiro", a página acaba no presente
    expect(terminaNoComecoDoAcervo(todas, todas, 'antigas')).toBe(false);
    expect(terminaNoComecoDoAcervo([], todas, 'recentes')).toBe(false);
  });
  it('tem a frase e as duas ações', () => {
    expect(linha).toMatch(/Aqui começa o acervo\./);
    expect(linha).toMatch(/href="\/nova">\s*Nova memória/);
    expect(linha).toMatch(/href="#conteudo">\s*Voltar ao começo/);
  });
});

describe('a lista (P44, P46)', () => {
  it('no computador, o ano tem tamanho de título de página', () => {
    expect(cssDaLista).toMatch(/@media \(min-width: 62rem\) \{[\s\S]*?\.lista__ano \{\s*font-size: var\(--t-titulo-1\)/);
  });
  it('o nome de família com duas palavras entra inteiro', () => {
    expect(nomeCurto({ nome: 'Prima Carol' })).toBe('Prima Carol');
    expect(nomeCurto({ nome: 'Vô Tonho', apelido: null })).toBe('Vô Tonho');
    expect(nomeCurto({ nome: 'Dona Fátima Souza' })).toBe('Dona Fátima');
    expect(nomeCurto({ nome: 'Isabel Nascimento', apelido: 'Vó Bela' })).toBe('Vó Bela');
    expect(nomeCurto({ nome: 'Lucas Magno Bracarense' })).toBe('Lucas');
    expect(nomeCurto({ nome: 'Tia' })).toBe('Tia');
  });
});

describe('a legenda da foto (P40)', () => {
  it('tem piso de 11 px', () => {
    expect(ler('src/visual/pecas.css')).toMatch(/\n\.polaroid__legenda \{[^}]*font-size: clamp\(0\.6875rem, 4\.1cqi, 1rem\)/);
  });
});

describe('o modo TV (P48, P49, P50)', () => {
  it('na tela grande, o que se lê tem 24 px e os controles, 22 px', () => {
    // Desde a barra (22/11/2026), o modo TV é proporcional: 1rem é 1/80 da largura ou 1/45 da
    // altura, o que for menor, e em 1920 × 1080 isso dá 24 px
    const tv = ler('src/visual/telas/tv.css');
    expect(tv).toMatch(/html:has\(\.palco--tv\) \{\s*font-size: min\(100vw \/ 80, 100svh \/ 45\);/);
    expect(Math.min(1920 / 80, 1080 / 45)).toBe(24);
    expect(tv).toMatch(/--tv-leitura: 1rem;/);
    expect(Math.round(24 * Number(/--tv-controle: ([\d.]+)rem;/.exec(tv)![1]))).toBe(22);
    expect(tv).toMatch(/\.palco__texto > p:first-child \.carimbo \{\s*font-size: var\(--tv-leitura\)/);
    expect(tv).toMatch(/\.palco__opcoes :is\(a, button\) \{\s*font-size: var\(--tv-controle\)/);
  });
  it('no celular, o carimbo e o título vêm antes das fotos, e o trecho depois dos controles', () => {
    expect(cssDoExplorar).toMatch(/grid-template-areas:\s*'carimbo'\s*'titulo'\s*'fotos'\s*'passos'\s*'ajustes'\s*'trecho'/);
    expect(cssDoExplorar).toMatch(/@media \(max-width: 61\.99rem\) \{\s*\.palco__cena > \.palco__texto \{\s*display: contents/);
  });
  it('as partes de "Ajustes" ficam num grupo, lado a lado quando há largura', () => {
    expect(palco).toMatch(/<div class="palco__partes">/);
    expect(ler('src/visual/telas/tv.css')).toMatch(/\.palco__ajustes\[open\] \.palco__partes \{[^}]*display: grid;\s*grid-auto-flow: column;/);
    // Fora do fluxo, sem position: fixed nem sticky
    expect(cssDoExplorar).not.toMatch(/position\s*:\s*(fixed|sticky)/);
  });
});

describe('o modo TV sem rede (C3)', () => {
  it('o aviso é o texto combinado', () => {
    expect(AVISO_SEM_REDE).toBe('Sem conexão. Tentando de novo…');
  });
  it('falta de rede é o fetch que não saiu ou o navegador fora do ar', () => {
    expect(falhaDeRede(new TypeError('Failed to fetch'), true)).toBe(true);
    expect(falhaDeRede(new Error('500'), false)).toBe(true);
    // Erro do servidor, com rede, continua caindo na navegação comum
    expect(falhaDeRede(new Error('500'), true)).toBe(false);
    expect(falhaDeRede(new Error('sem o palco'), true)).toBe(false);
  });
  it('sem rede a passagem espera, em vez de ir para o endereço, e volta com a rede', () => {
    expect(palco).toMatch(/role="status" data-palco-aviso/);
    expect(palco).toMatch(/if \(falhaDeRede\(erro, navigator\.onLine\)\) return esperarARede\(a, deTras\);\s*location\.assign\(href\);/);
    expect(palco).toMatch(/addEventListener\('online', tentarDeNovo\)/);
    expect(palco).toMatch(/aviso\.textContent = AVISO_SEM_REDE/);
  });
});

describe('o endereço do Explorar continua o mesmo', () => {
  it('a década no endereço ainda filtra', async () => {
    const { lerFiltros, passa } = await import('../src/lib/explorar');
    const f = lerFiltros(new URLSearchParams('decada=1990'));
    expect(f.decada).toBe(1990);
    const ctx = { eu: 'x', doCapitulo: () => false, comAudio: new Set<string>(), contaram: new Map<string, Set<string>>() };
    expect(passa(memoria('a', 1994), { ...SEM_FILTRO, decada: 1990 }, ctx)).toBe(true);
    expect(passa(memoria('b', 2001), { ...SEM_FILTRO, decada: 1990 }, ctx)).toBe(false);
  });
});
