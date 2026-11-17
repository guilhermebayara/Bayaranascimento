// Conferências no código dos formulários, para defeitos achados no QA de 15/11/2026 não voltarem.
import { describe, expect, it } from 'vitest';

const fontes: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../src/**/*.{astro,ts}', { query: '?raw', import: 'default', eager: true })).map(([k, v]) => [k.replace('../', ''), v]),
);

const fonte = (caminho: string) => fontes[caminho] ?? '';

describe('formulários', () => {
  it('"Adicionar laço" só cadastra a pessoa nova depois que o laço passa nas validações', () => {
    // Antes, um laço recusado deixava a pessoa cadastrada, e a nova tentativa dizia que ela já existia
    const lacos = fonte('src/pages/api/lacos.ts');
    expect(lacos.match(/criarIntegrante\(/g)).toHaveLength(1);
    expect(lacos).toMatch(/const cadastrarPendente = async \(\) => \{\s*if \(pendente\) await criarIntegrante\(/);
    for (const salvar of ['salvarLacoDoCoracao(', 'salvarFiliacao(', 'salvarCasal(']) {
      expect(lacos, salvar).toMatch(new RegExp(`await cadastrarPendente\\(\\);\\s*(try \\{\\s*)?await ${salvar.replace('(', '\\(')}`));
    }
  });

  it('o rascunho volta com o relato registrado para outra pessoa', () => {
    // Antes, só voltava o relato da própria pessoa, e o da Vó Bela ficava em rascunho depois de publicar
    const nova = fonte('src/pages/nova.astro');
    expect(nova).toMatch(/filter\(\(r\) => r\.registradoPor === usuario\.pessoa\)/);
    expect(nova).toMatch(/selected=\{meuRelato\?\.por === p\.id\}/);
  });

  it('nenhuma rolagem animada ignora o movimento reduzido', () => {
    for (const [caminho, texto] of Object.entries(fontes)) {
      if (!texto.includes("'smooth'")) continue;
      expect(texto, caminho).toContain('prefers-reduced-motion: reduce');
    }
  });

  it('a busca de pessoas ignora acentos', () => {
    // O filtro da memória virou a busca de "Quem estava?" (QA de UX, 16/11/2026)
    expect(fonte('src/lib/cliente/quem-estava.ts')).toMatch(/normalize\('NFD'\)/);
    expect(fonte('src/lib/cliente/busca-pessoa.ts')).toMatch(/normalize\('NFD'\)/);
  });
});

describe('árvore na tela', () => {
  // Decisões do Gui (16/11/2026)
  const cliente = fonte('src/lib/cliente/arvore.ts');
  const pagina = fonte('src/pages/arvore.astro');

  it('nenhum filtro esconde de quem a árvore parte', () => {
    expect(cliente).toMatch(/const protegerCentro = \(\) => \{[\s\S]*?estado\.bichos = true;[\s\S]*?estado\.outros = true;/);
    expect(cliente.match(/protegerCentro\(\);/g)!.length).toBeGreaterThanOrEqual(3);
  });

  it('"Partir de" só oferece quem tem laço de árvore', () => {
    expect(pagina).toMatch(/ordenados\.filter\(\(i\) => comLaco\.has\(i\.id\)\)/);
    expect(cliente).toContain('partir.hidden = estado.centro === p.id || !partivel.has(p.id)');
    expect(fonte('src/pages/pessoas/[id]/index.astro')).toMatch(/\{temLacoDeArvore && \(\s*<a [^>]*href=\{`\/arvore\?centro=/);
  });

  it('o cartão do ramo aberto fica por cima da legenda', () => {
    expect(cliente).toContain('camadaDosRamos.append(cartao)');
    // A camada dos ramos vem logo depois da árvore e antes dos painéis. O z-index (2, contra 1 da legenda)
    // está em src/styles/global.css; o vitest não lê CSS, então ele não é conferido aqui.
    expect(pagina.indexOf('data-camada-ramos')).toBeGreaterThan(pagina.indexOf('data-camada>'));
    expect(pagina.indexOf('data-camada-ramos')).toBeLessThan(pagina.indexOf('mapa__painel'));
  });
});

describe('formulários sem JavaScript e depois de um erro', () => {
  // Achados do QA de 15/11/2026, corrigidos a pedido do Gui (16/11)
  it('o que foi digitado volta quando o servidor recusa', () => {
    const base = fonte('src/layouts/Base.astro');
    expect(base).toContain("import { guardarFormularios } from '../lib/cliente/guardar-formulario';");
    const guardar = fonte('src/lib/cliente/guardar-formulario.ts');
    expect(guardar).toContain("searchParams.has('erro')");
    expect(guardar).toContain('sessionStorage');
  });

  it('sem JavaScript, somem os botões que dependem dele e aparecem os blocos que ele mostraria', () => {
    const base = fonte('src/layouts/Base.astro');
    expect(base).toMatch(/<noscript>[\s\S]*\[data-etapa-continuar\][\s\S]*display: none[\s\S]*\[data-para\]\[hidden\], \[data-so-epoca\]\[hidden\], \[data-so-periodo\]\[hidden\], \[data-depende\]\[hidden\] \{ display: block/);
  });

  it('nova memória e relato enviam como formulário comum, e as APIs aceitam', () => {
    expect(fonte('src/pages/nova.astro')).toMatch(/<form class="formulario" method="post" action="\/api\/memorias"/);
    expect(fonte('src/pages/memorias/[id]/relato.astro')).toMatch(/<form class="formulario" method="post" action="\/api\/relatos"/);
    for (const api of ['src/pages/api/memorias.ts', 'src/pages/api/relatos.ts']) {
      expect(fonte(api), api).toMatch(/if \(!\(request\.headers\.get\('Content-Type'\) \?\? ''\)\.includes\('application\/json'\)\) \{\s*const dados = await request\.formData\(\);/);
    }
    // Sem JavaScript não há envio de fotos: as que a memória já tem ficam
    expect(fonte('src/pages/api/memorias.ts')).toContain('fotos: (anterior?.fotos ?? []).map(');
  });
});
