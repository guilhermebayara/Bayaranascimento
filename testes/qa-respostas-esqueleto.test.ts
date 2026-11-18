// Regras que nasceram das respostas do Gui ao QA de design de 17/11/2026, no esqueleto do site:
// topo, menu e rodapé (P2 a P12 de docs/historico/qa/2026-11-17-perguntas.md).
import { describe, expect, it } from 'vitest';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url), 'utf8');
/** O corpo da primeira regra do CSS com exatamente este seletor. */
const regra = (css: string, seletor: string) => {
  const inicio = css.indexOf(`\n${seletor} {`);
  expect(inicio, seletor).toBeGreaterThan(-1);
  return css.slice(inicio, css.indexOf('}', inicio));
};

const esqueleto = ler('src/layouts/Visual.astro');
const css = ler('src/visual/estrutura.css');
const topo = esqueleto.slice(esqueleto.indexOf('<header class="topo">'), esqueleto.indexOf('</header>'));
const rodape = esqueleto.slice(esqueleto.indexOf('<footer'), esqueleto.indexOf('</footer>'));

describe('"Nova memória" à vista na barra do celular (P2)', () => {
  it('está na barra, sublinhada, e saiu do fim do menu', () => {
    expect(topo).toMatch(/<a class="topo__nova" href="\/nova"/);
    expect(regra(css, '.topo__nova')).toMatch(/text-decoration-line: underline/);
    const menu = topo.slice(topo.indexOf('<details class="menu">'));
    expect(menu).not.toContain('/nova');
  });
  it('some no computador, onde o menu do topo já traz a ação', () => {
    const computador = css.slice(css.indexOf('@media (min-width: 62rem)'));
    expect(computador).toMatch(/\.topo__nova,\s*\.menu \{\s*display: none;/);
  });
});

describe('o rodapé repete o menu e volta ao alto (P3)', () => {
  it('traz os itens do menu como ações quietas', () => {
    expect(rodape).toMatch(/<nav class="rodape__links"[^>]*>\s*\{\s*menu\.map\(/);
    expect(rodape).toMatch(/class="acao acao--quieta" href=\{item\.href\}/);
  });
  it('"Voltar ao alto" leva ao começo da página e só aparece no celular', () => {
    expect(esqueleto).toMatch(/<html lang="pt-BR" id="alto"/);
    expect(rodape).toMatch(/<a class="rodape__alto[^"]*" href="#alto">\s*Voltar ao alto/);
    expect(css).toMatch(/@media \(min-width: 62rem\) \{[^}]*\.rodape__alto \{\s*display: none;/);
  });
});

describe('"Sair" só onde há login (P4)', () => {
  const acesso = ler('src/lib/servidor/acesso.ts');
  it('o login existe na produção e na homologação, e a saída é a do Cloudflare Access', () => {
    expect(acesso).toMatch(/export function temLogin\(\): boolean \{\s*return ambiente\(\) === 'producao' \|\| ambiente\(\) === 'homologa';/);
    expect(acesso).toMatch(/ENDERECO_DE_SAIDA = '\/cdn-cgi\/access\/logout'/);
  });
  it('"Sair" mora só no menu da conta, quando há login (resposta do Gui aos PRs #56 a #60, 17/11/2026)', () => {
    expect(esqueleto).toMatch(/const saida = temLogin\(\) \? ENDERECO_DE_SAIDA : undefined;/);
    const menu = esqueleto.slice(esqueleto.indexOf('<details class="conta-menu">'), esqueleto.indexOf('</details>', esqueleto.indexOf('<details class="conta-menu">')));
    expect(menu).toMatch(/\{saida && <a href=\{saida\}>Sair<\/a>\}/);
    // Uma vez só no esqueleto, e nenhuma no rodapé nem em Sua conta
    expect(esqueleto.match(/href=\{saida\}/g)).toHaveLength(1);
    expect(esqueleto.slice(esqueleto.indexOf('<footer'))).not.toMatch(/saida|>\s*Sair\s*</);
    const conta = ler('src/pages/conta.astro');
    expect(conta).not.toMatch(/ENDERECO_DE_SAIDA|conta__sair|>\s*Sair\s*</);
  });
});

describe('a carta mora também em "Sua conta" (P5)', () => {
  it('para todos, com o carimbo do Natal, quando a carta existe', () => {
    const conta = ler('src/pages/conta.astro');
    const trecho = conta.slice(conta.indexOf('carta && ('), conta.indexOf('admin && ('));
    expect(trecho).toMatch(/<Carimbo itens=\{\[`Natal de \$\{carta\.escritaEm\.slice\(0, 4\)\}`\]\} \/>/);
    expect(trecho).toMatch(/href="\/carta"/);
    expect(trecho).not.toContain('admin');
  });
});

describe('a assinatura do rodapé pela metade nos formulários e nas telas utilitárias (P7)', () => {
  it('o esqueleto decide num lugar só, e o padrão é a assinatura inteira', () => {
    expect(esqueleto).toMatch(/const rodape = Astro\.props\.rodape \?\? \(secao === 'conta' \? 'metade' : 'inteiro'\);/);
    expect(esqueleto).toMatch(/<footer class="rodape" data-assinatura=\{rodape === 'metade' \? 'metade' : undefined\}>/);
    expect(regra(css, ".rodape[data-assinatura='metade'] .assinatura")).toMatch(/width: 50%/);
  });
  it('os formulários e a página não encontrada pedem a metade, e a conta já nasce com ela', () => {
    expect(ler('src/pages/conta.astro')).toMatch(/<Visual [^>]*secao="conta"/);
    for (const tela of ['src/components/formularios/Pagina.astro', 'src/pages/404.astro']) expect(ler(tela), tela).toMatch(/<Visual [^>]*rodape="metade"/);
  });
  it('as telas de leitura ficam com a inteira', () => {
    for (const tela of ['src/pages/index.astro', 'src/pages/memorias/[id].astro', 'src/pages/pessoas/[id]/index.astro', 'src/pages/capitulos/[id]/index.astro']) {
      expect(ler(tela), tela).not.toMatch(/rodape="metade"/);
    }
  });
});

describe('quem avisar quando o acesso ou o espaço falha (P8)', () => {
  it('os dois recados citam os três administradores', () => {
    expect(ler('src/middleware.ts')).toContain('Avise o Gui, a Giovanna ou o Magno para liberarem seu acesso.');
    expect(ler('src/pages/api/audios.ts')).toContain('Avise o Gui, a Giovanna ou o Magno.');
  });
});

describe('o menu do celular fecha com Esc e com o toque fora (P9)', () => {
  it('o esqueleto traz o script, e o menu continua sendo uma sanfona sem script', () => {
    expect(esqueleto).toMatch(/evento\.key !== 'Escape'/);
    expect(esqueleto).toMatch(/!menu\.contains\(evento\.target\)\) menu\.open = false/);
    expect(topo).toMatch(/<details class="menu">\s*<summary>/);
  });
});

describe('o item aceso em "Nova memória" e no relato (P10)', () => {
  it('"Nova memória" acende em /nova, no topo do computador e na barra do celular', () => {
    expect(topo.match(/href="\/nova" aria-current=\{secao === 'nova' \? 'page' : undefined\}/g)).toHaveLength(2);
    expect(ler('src/pages/nova.astro')).toMatch(/<Pagina [^>]*secao="nova"/);
    expect(css).toMatch(/\.topo__nova\[aria-current\]::before,/);
  });
  it('o relato acende "Explorar", como a memória, e a carta segue em "Início"', () => {
    expect(ler('src/pages/memorias/[id]/relato.astro')).toMatch(/<Pagina [^>]*secao="explorar"/);
    expect(ler('src/pages/carta.astro')).toMatch(/<Visual [^>]*secao="painel"/);
  });
});

describe('/temas leva aos capítulos (P11)', () => {
  it('no ponto onde os temas começam', () => {
    expect(ler('src/pages/temas/index.ts')).toMatch(/redirect\('\/capitulos#temas', 302\)/);
    expect(ler('src/pages/capitulos/index.astro')).toMatch(/id="temas"/);
  });
});

describe('"Sua conta" na barra e no menu do celular (P12)', () => {
  it('os dois continuam', () => {
    // Desde o menu da conta (decisão do Gui, 17/11/2026), o retrato abre um menu que leva a "Sua conta"
    expect(topo.slice(topo.indexOf('<details class="conta-menu">'))).toMatch(/<a href="\/conta"[^>]*>\s*Sua conta/);
    expect(topo.slice(topo.indexOf('<details class="menu">'))).toMatch(/<a href="\/conta"[^>]*>Sua conta<\/a>/);
  });
});

// Decisão do Gui (17/11/2026), "Revisão de estrutura das telas": o rodapé some só nas telas de mapa
describe('o rodapé some nas telas de mapa', () => {
  it('o esqueleto só deixa de desenhar o rodapé quando a tela pede, e o padrão é desenhar', () => {
    expect(esqueleto).toMatch(/mapa\?: boolean;/);
    expect(esqueleto).toMatch(/palco = false, mapa = false \} = Astro\.props;/);
    expect(esqueleto).toMatch(/!palco && !mapa && \(\s*<footer class="rodape"/);
    expect(esqueleto).toMatch(/data-tela-de-mapa=\{mapa \? '' : undefined\}/);
  });
  it('o mapa ocupa a janela inteira abaixo do menu, sem prender nada à rolagem', () => {
    expect(css).toMatch(/\[data-tela-de-mapa\] body \{\s*display: flex;\s*flex-direction: column;\s*min-height: 100svh;/);
    expect(css).toMatch(/\[data-tela-de-mapa\] main \{\s*flex: 1;\s*display: grid;\s*min-height: 24rem;/);
    expect(css).not.toMatch(/position\s*:\s*(fixed|sticky)[^}]*\}\s*\[data-tela-de-mapa\]/);
  });
  it('só as telas de mapa pedem: a árvore pede, e as outras telas ficam com o rodapé', () => {
    expect(ler('src/pages/arvore.astro')).toMatch(/<Visual titulo="Árvore" secao="arvore" mapa>/);
    for (const tela of ['src/pages/index.astro', 'src/pages/explorar.astro', 'src/pages/pessoas/index.astro', 'src/pages/conta.astro', 'src/pages/capitulos/index.astro']) {
      expect(ler(tela), tela).not.toMatch(/<Visual[^>]*\smapa[\s>]/);
    }
  });
});
