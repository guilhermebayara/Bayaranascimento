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
