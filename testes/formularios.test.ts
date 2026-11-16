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
      expect(lacos, salvar).toMatch(new RegExp(`await cadastrarPendente\\(\\);\\s*await ${salvar.replace('(', '\\(')}`));
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

  it('o filtro de pessoas ignora acentos', () => {
    expect(fonte('src/pages/nova.astro')).toMatch(/normalize\('NFD'\)/);
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
    expect(fonte('src/pages/pessoas/[id]/index.astro')).toMatch(/\{temLacoDeArvore && <a [^>]*href=\{`\/arvore\?centro=/);
  });

  it('o cartão do ramo aberto fica por cima da legenda', () => {
    expect(cliente).toContain('camadaDosRamos.append(cartao)');
    // A camada dos ramos vem logo depois da árvore e antes dos painéis. O z-index (2, contra 1 da legenda)
    // está em src/styles/global.css; o vitest não lê CSS, então ele não é conferido aqui.
    expect(pagina.indexOf('data-camada-ramos')).toBeGreaterThan(pagina.indexOf('data-camada>'));
    expect(pagina.indexOf('data-camada-ramos')).toBeLessThan(pagina.indexOf('mapa__painel'));
  });
});
