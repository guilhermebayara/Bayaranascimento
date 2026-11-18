// Interação sem recarregar a página (premissa do Gui de 18/11/2026, docs/visual.md): os formulários do dia
// a dia trocam só o que mudou, no lugar, e sem script continuam formulários comuns, que recarregam.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const arquivos = (pasta: string): string[] =>
  readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : /\.(astro|ts)$/.test(nome) ? [caminho] : [];
  });
const fontes = arquivos('src').map((caminho) => ({ caminho, texto: readFileSync(caminho, 'utf-8') }));
const cliente = readFileSync('src/lib/cliente/no-lugar.ts', 'utf-8');

describe('formulários no lugar', () => {
  // As regiões com nome fixo; os nomes montados com o id (liberar-12, avisos-conta) são conferidos à parte
  const pedidas = fontes.flatMap(({ caminho, texto }) =>
    [...texto.matchAll(/data-no-lugar="([^"]+)"/g)].flatMap((m) => m[1]!.split(/\s+/).map((regiao) => ({ caminho, regiao }))),
  );
  const existentes = new Set(fontes.flatMap(({ texto }) => [...texto.matchAll(/data-regiao="([^"]+)"/g)].map((m) => m[1]!)));

  it('as interações do dia a dia passam pelo script', () => {
    const usos = fontes.filter(({ texto }) => texto.includes('data-no-lugar')).map(({ caminho }) => caminho.replace(/\\/g, '/'));
    for (const esperado of ['src/components/Avisos.astro', 'src/pages/memorias/[id].astro', 'src/pages/memorias/[id]/sugestoes.astro', 'src/pages/admin/duplicados/index.astro']) {
      expect(usos).toContain(esperado);
    }
  });
  it('toda região com nome fixo pedida por um formulário existe numa página', () => {
    expect(pedidas.length).toBeGreaterThan(2);
    for (const { caminho, regiao } of pedidas) expect(existentes.has(regiao), `${caminho}: ${regiao}`).toBe(true);
  });
  it('o número do retrato acompanha: o summary do menu da conta é uma região', () => {
    expect(readFileSync('src/layouts/Visual.astro', 'utf-8')).toContain('data-regiao="retrato"');
  });
  it('o esqueleto liga os formulários no lugar em toda página', () => {
    expect(readFileSync('src/layouts/Visual.astro', 'utf-8')).toContain('ligarNoLugar();');
  });
  it('sem script é o formulário comum; com o script falhando, também', () => {
    expect(cliente).toContain('evento.preventDefault();');
    expect(cliente).toContain('form.submit();');
    // Depois de trocar, as regiões novas são ligadas de novo e o recado é dito ao leitor de tela
    expect(cliente).toContain('ligarReacoes(regiao);');
    expect(cliente).toContain("anunciar(erro ?? ok ?? 'Pronto.');");
  });
  it('a região não muda o desenho', () => {
    expect(readFileSync('src/visual/base.css', 'utf-8')).toMatch(/\.regiao \{\s*display: contents;/);
  });
});
