// Compartilhar uma memória como imagem (onda 2, decisão do Gui de 17/11/2026): só gera quem vê a memória
// publicada; memória só de algumas famílias pede um aviso antes, e a imagem só é montada depois do sim.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TAMANHO_DA_IMAGEM, avisoAntesDeCompartilhar, escolhaDoNome, escolhaDoNomeAparece, nomeDoArquivo, nomeNaImagem, trechoDoRelato } from '../src/lib/compartilhar';

describe('compartilhar como imagem', () => {
  it('é vertical, na proporção dos stories', () => {
    expect(TAMANHO_DA_IMAGEM.altura / TAMANHO_DA_IMAGEM.largura).toBeCloseTo(16 / 9);
  });
  it('o aviso vem só para memória restrita a famílias', () => {
    expect(avisoAntesDeCompartilhar('nucleos', ['Bracarense'])).toBe('Esta memória é só da família Bracarense. Quem receber a imagem vai ver.');
    expect(avisoAntesDeCompartilhar('nucleos', ['Bayara', 'Bracarense'])).toBe('Esta memória é só das famílias Bayara e Bracarense. Quem receber a imagem vai ver.');
    expect(avisoAntesDeCompartilhar('todos', ['Bracarense'])).toBeNull();
  });
  it('o trecho é curto e corta numa palavra', () => {
    const longo = 'A gente chegou cedo e a mesa já estava posta, com o pão de queijo da Vó Bela ainda quente. '.repeat(5);
    const t = trechoDoRelato(longo, 80);
    expect(t.length).toBeLessThanOrEqual(81);
    expect(t.endsWith('…')).toBe(true);
    expect(trechoDoRelato('Curto.')).toBe('Curto.');
  });
  it('o arquivo tem o nome da memória, sem acento', () => {
    expect(nomeDoArquivo('Natal de 2025, na casa da Vó')).toBe('memoria-natal-de-2025-na-casa-da-vo.png');
  });
  it('a página só monta a imagem de quem vê a memória publicada, e só depois do sim quando é restrita', () => {
    const pagina = readFileSync('src/pages/memorias/[id]/compartilhar.astro', 'utf-8');
    expect(pagina).toContain('const memoria = await obterMemoria(usuario,');
    expect(pagina).toMatch(/memoria\.situacao !== 'publicada'\) return new Response\('Memória não encontrada', \{ status: 404 \}\)/);
    expect(pagina).toMatch(/const confirmado = !aviso \|\| Astro\.url\.searchParams\.get\('confirmado'\) === '1';/);
    // Antes do sim, nenhum dado da imagem vai para a página
    expect(pagina).toMatch(/const dados: DadosDaImagem \| null = confirmado/);
    // O trecho só vem de relato que a pessoa vê
    expect(pagina).toContain('listarRelatos(usuario, memoria.id)');
  });
});

// Observação do Gui (18/11/2026): o nome de quem contou passava por cima da assinatura. A assinatura sai, o
// monograma entra como marca d'água leve, e o trecho perde linhas antes de chegar à margem de baixo.
describe('a imagem depois da observação do Gui', async () => {
  const { linhasQueCabem } = await import('../src/lib/cliente/compartilhar');
  const desenho = readFileSync('src/lib/cliente/compartilhar.ts', 'utf-8');
  it('sem a assinatura com o nome do site, e com o monograma leve, atrás', () => {
    expect(desenho).not.toContain('d.assinatura');
    expect(desenho).toContain('ctx.globalAlpha = 0.07;');
    expect(desenho.indexOf('new Path2D(m.d)')).toBeLessThan(desenho.indexOf('A foto revelada'));
    expect(readFileSync('src/pages/memorias/[id]/compartilhar.astro', 'utf-8')).toContain('monograma: MONOGRAMAS[FONTES_DO_SITE.serifa].normal');
  });
  it('o trecho e o nome de quem contou nunca passam da margem de baixo', () => {
    const [A, margem, linha, nome] = [1920, 96, 54, 90];
    for (let y = 1300; y <= 1820; y += 10) {
      const n = linhasQueCabem(y, A - margem, linha, nome);
      expect(n).toBeLessThanOrEqual(4);
      if (n > 0) expect(y + n * linha + 16).toBeLessThanOrEqual(A - margem);
    }
    expect(linhasQueCabem(1300, 1824, 54, 90)).toBe(4);
  });
});

// Qual nome vai na imagem (decisão do Gui, 18/11/2026, depois da sessão H): o da família é o padrão,
// porque o apelido próprio é privado e a imagem sai do acervo
describe('o nome na imagem de compartilhar', () => {
  const elizete = { nome: 'Elizete', apelidoDaFamilia: 'Zete', meuApelido: 'Mãezinha' };
  const semApelidoDaFamilia = { nome: 'Aguilar', apelidoDaFamilia: null, meuApelido: 'Pai' };
  const semOMeu = { nome: 'Vó Bela', apelidoDaFamilia: null, meuApelido: null };
  it('o da família: o apelido da família, senão o nome; o seu: o seu apelido, senão o da família', () => {
    expect(nomeNaImagem(elizete, 'familia')).toBe('Zete');
    expect(nomeNaImagem(elizete, 'meu')).toBe('Mãezinha');
    expect(nomeNaImagem(semApelidoDaFamilia, 'familia')).toBe('Aguilar');
    expect(nomeNaImagem(semApelidoDaFamilia, 'meu')).toBe('Pai');
    expect(nomeNaImagem(semOMeu, 'meu')).toBe('Vó Bela');
  });
  it('o padrão nunca vaza o apelido próprio', () => {
    for (const p of [elizete, semApelidoDaFamilia, semOMeu]) expect(nomeNaImagem(p, escolhaDoNome(undefined))).not.toBe(p.meuApelido);
    expect(escolhaDoNome(null)).toBe('familia');
    expect(escolhaDoNome('qualquer')).toBe('familia');
    expect(escolhaDoNome('meu')).toBe('meu');
  });
  it('a escolha só aparece quando muda algo', () => {
    expect(escolhaDoNomeAparece([elizete])).toBe(true);
    expect(escolhaDoNomeAparece([semOMeu])).toBe(false);
    expect(escolhaDoNomeAparece([])).toBe(false);
    // O apelido próprio igual ao da família não muda nada
    expect(escolhaDoNomeAparece([{ nome: 'Elizete', apelidoDaFamilia: 'Zete', meuApelido: 'Zete' }])).toBe(false);
  });
  it('a página monta a imagem com o nome da família e só leva o seu apelido quando a escolha aparece', () => {
    const pagina = readFileSync('src/pages/memorias/[id]/compartilhar.astro', 'utf-8');
    expect(pagina).toContain("autorDoTrecho: relato ? nomeNaImagem(nomesDe(relato.por), 'familia') : null,");
    expect(pagina).toContain("comOSeuApelido: escolheONome && relato ? { autorDoTrecho: nomeNaImagem(nomesDe(relato.por), 'meu') } : null,");
    // `apelido` viria trocado pelo de quem olha: os dois nomes vêm de fontes separadas
    expect(pagina).toContain('apelidoDaFamilia: i?.apelidoDaFamilia ?? null, meuApelido: meusApelidos.get(id) ?? null');
    expect(pagina).not.toMatch(/\.apelido \?\?/);
    expect(pagina).toContain('nome="nomeNaImagem"');
    expect(pagina).toContain("{ valor: 'familia', texto: 'O da família', atual: true }");
    const cliente = readFileSync('src/lib/cliente/compartilhar.ts', 'utf-8');
    expect(cliente).toContain("escolhas.find((e) => e.checked)?.value === 'meu' && d.comOSeuApelido ? { ...d, ...d.comOSeuApelido } : d");
  });
});
