// Regras que nasceram das respostas do Gui ao QA de design de 17/11/2026, nas telas "Nova memória"
// (P126 a P146) e "Meu relato" (P147). As perguntas estão em docs/historico/qa/2026-11-17-perguntas.md.
import { describe, expect, it } from 'vitest';
import { SEM_ANO, SEM_DATA, dataNaFrase, formatarData, problemaNoAno } from '../src/lib/datas';
import { carimboDaData } from '../src/lib/visual';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url), 'utf8');

const nova = ler('src/pages/nova.astro');
const relato = ler('src/pages/memorias/[id]/relato.astro');
const css = ler('src/visual/telas/formulario.css');
const pecas = ler('src/visual/pecas.css');
const api = ler('src/pages/api/memorias.ts');

describe('P132: o rascunho pode ser salvo só com o título', () => {
  it('o rascunho sem ano escreve "sem data", e nunca o número guardado', () => {
    const semAno = { ano: SEM_ANO, mes: null, dia: null, aproximada: false };
    expect(formatarData(semAno)).toBe(SEM_DATA);
    expect(carimboDaData(semAno)).toBe(SEM_DATA);
    expect(formatarData({ ...semAno, mes: 3, dia: 12, aproximada: true })).toBe(SEM_DATA);
    expect(dataNaFrase({ ano: SEM_ANO })).toBe('em que data?');
    // Com ano, tudo como sempre
    expect(formatarData({ ano: 1994, mes: 3, dia: 12, aproximada: false })).toBe('12 de março de 1994');
  });
  it('o servidor só aceita a falta do ano no rascunho, e confere o ano que vier', () => {
    expect(api).toMatch(/ano: z\.number\(\)\.int\(\)\.nullable\(\)\.optional\(\)/);
    expect(api).toMatch(/if \(ano === undefined && situacao === 'publicada'\) return erro\(400, 'Informe o ano, mesmo que seja aproximado\.'\);/);
    expect(api).toMatch(/const erroData = ano === undefined \? undefined : validarData\(ano, pedido\.mes, pedido\.dia\);/);
    expect(api).toMatch(/ano: ano \?\? SEM_ANO,/);
    // A situação que vale é a calculada: memória publicada não volta a rascunho para fugir do ano
    expect(api.indexOf("const situacao = anterior?.situacao === 'publicada'")).toBeLessThan(api.indexOf("if (ano === undefined && situacao === 'publicada')"));
  });
  it('o formulário só pede o ano para publicar, e não mostra o ano guardado de um rascunho sem data', () => {
    expect(nova).toMatch(/if \(ano === undefined \? situacao === 'publicada' : !Number\.isInteger\(ano\)\) \{/);
    expect(nova).toMatch(/<CampoData ano=\{\(devolvida \? devolvida\.ano : memoria\?\.ano\) \|\| undefined\}/);
  });
});

describe('P143: o ano fora do intervalo ganha aviso ao lado', () => {
  it('o texto é o aprovado, com os limites do campo', () => {
    expect(problemaNoAno(1700, 1800, 2026)).toBe('O ano vai de 1800 a 2026.');
    expect(problemaNoAno(2090, 1800, 2026)).toBe('O ano vai de 1800 a 2026.');
    expect(problemaNoAno(1994.5, 1800, 2026)).toBe('O ano vai de 1800 a 2026.');
  });
  it('ano dentro do intervalo ou ainda vazio não avisa', () => {
    for (const ano of [1800, 1994, 2026, undefined]) expect(problemaNoAno(ano, 1800, 2026)).toBeUndefined();
  });
  it('o aviso mora junto do da data que não existe, e a frase não escreve o ano inválido', () => {
    const datas = ler('src/lib/cliente/datas.ts');
    expect(datas).toMatch(/problemaNoAno\(numero\(ano\), Number\(limites\.min\), Number\(limites\.max\)\)/);
    expect(datas).toMatch(/ano\.setCustomValidity\(doAno\);/);
    expect(nova).toContain('ano: anoInformado(),');
  });
});

describe('Nova memória: as etapas', () => {
  it('P127: depois de salvar o rascunho, a página volta na etapa em que a pessoa estava', () => {
    expect(nova).toMatch(/sessionStorage\.setItem\('rascunho-salvo', String\(etapas\?\.atual\(\) \?\? 0\)\);/);
    expect(nova).toMatch(/etapaInicial = Number\(guardada\) \|\| 0;/);
    expect(ler('src/lib/cliente/etapas.ts')).toMatch(/let atual = Math\.max\(0, Math\.min\(secoes\.length - 1, Math\.trunc\(inicial\) \|\| 0\)\);/);
  });
  it('P141 e P142: "Fotos" é pergunta, e a etapa do capítulo não abre outra aba', () => {
    expect(nova).toMatch(/<section data-etapa="Fotos" data-opcional>[\s\S]{0,300}<legend>Tem fotos desse dia\?<\/legend>/);
    expect(nova).not.toMatch(/target="_blank"/);
    expect(nova).toContain('Dá para criar o capítulo depois e colocar esta memória nele.');
  });
  it('P135: na correção, "Salvar alterações" vem antes de "Continuar", e fica em contorno nas duas ordens', () => {
    const acoes = nova.slice(nova.indexOf('<div class="acoes acoes--etapas">'), nova.indexOf('<aside class="ao-lado"'));
    expect(acoes.indexOf('Salvar alterações')).toBeGreaterThan(-1);
    expect(acoes.indexOf('Salvar alterações')).toBeLessThan(acoes.indexOf('data-etapa-continuar'));
    expect(acoes.indexOf('Publicar memória')).toBeGreaterThan(acoes.indexOf('data-etapa-continuar'));
    expect(css).toMatch(/\.acoes--etapas:has\(\[data-etapa-continuar\]:not\(\[hidden\]\)\) \.botao\[type='submit'\]:not\(\.botao--leve\) \{\s*background: transparent;/);
  });
});

describe('a zona de perigo quieta', () => {
  it('P131: sem fundo e sem caixa, só o fio em cima e o título na cor de alerta', () => {
    const regra = pecas.slice(pecas.indexOf('\n.perigo {'), pecas.indexOf('}', pecas.indexOf('\n.perigo {')));
    expect(regra).toMatch(/border-top: var\(--traco\) solid var\(--alerta\);/);
    expect(regra).not.toMatch(/background|border-radius|border:/);
    expect(regra).toMatch(/width: fit-content;/);
    expect(css).toMatch(/\.botao\.botao--perigo::after \{\s*content: none;/);
  });
  it('P136: na memória, com script, só aparece na última etapa; sem script, fica no fim', () => {
    expect(nova).toMatch(/if \(zonaDePerigo\) zonaDePerigo\.hidden = indice !== ultima;/);
    // Nasce visível: quem a esconde é o script
    expect(nova).toMatch(/<div data-zona-de-perigo>/);
  });
  it('P145: o sublinhado da ação de perigo não troca de cor ao passar o mouse', () => {
    expect(pecas).toMatch(/\.perigo \.acao:hover \{\s*text-decoration-color: currentColor;/);
    expect(css).toMatch(/\.perigo \.botao\.botao--leve:hover \{\s*text-decoration-color: currentColor;/);
  });
});

describe('P137 e P147: o relato', () => {
  it('"Quem está contando" fica numa linha recolhida, depois do texto, na memória nova e no relato', () => {
    // O relato como conversa: a linha vem depois da janela de escrever
    for (const tela of [nova, relato]) {
      const linha = tela.indexOf('<summary>Estou escrevendo por outra pessoa</summary>');
      expect(linha).toBeGreaterThan(tela.indexOf('<Janela modo='));
      expect(tela.slice(linha, linha + 400)).toMatch(/<span>Quem está contando<\/span>\s*<select name="(relatoPor|por)"/);
    }
  });
  it('fechar a linha volta para quem está escrevendo', () => {
    expect(nova).toMatch(/relatoPor\.selectedIndex = 0;\s*relatoPor\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\);/);
    // No relato, trocar quem conta abre o relato daquela pessoa; fechar a linha volta para quem escreve
    expect(relato).toMatch(/if \(!linha\.open && select\.selectedIndex !== 0\) \{\s*select\.selectedIndex = 0;\s*quemConta\.requestSubmit\(\);/);
  });
  it('o relato tem o caminho de volta sem salvar, ao lado do botão', () => {
    const acoes = relato.slice(relato.indexOf('<p class="relato-conversa__acoes">'), relato.indexOf('</Janela>'));
    expect(acoes).toContain('Voltar para a memória');
  });
});

describe('a grade dos formulários no computador', () => {
  const computador = css.slice(css.indexOf('@media (min-width: 62rem)'));
  it('P130: todo formulário com etapas começa a pergunta na mesma coluna', () => {
    expect(computador).toMatch(/\.pagina-de-formulario > \.formulario\.com-etapas > \* \{\s*grid-column: 4 \/ -1;/);
    expect(computador).toMatch(/\.pagina-de-formulario > \.formulario\.com-etapas > ol\.etapas \{\s*grid-column: 1 \/ 4;/);
  });
  it('P138 e P139: a abertura usa a largura do miolo, e as ações param na largura dos campos', () => {
    expect(computador).toMatch(/:has\(\.com-etapas\) \.pagina-de-formulario__abre \{\s*grid-column: 1 \/ -1;/);
    expect(computador).toMatch(/\.formulario\.com-etapas > :is\(\.situacao, \.acoes\) \{\s*max-width: min\(var\(--coluna\), var\(--medida\)\);/);
  });
  it('a zona de perigo do fim da página fecha com a coluna da pergunta: o vão do formulário é o da página', () => {
    expect(computador).toMatch(/\.formulario\.com-etapas \{[^}]*grid-template-columns: subgrid;[^}]*column-gap: var\(--calha\);/);
  });
});
