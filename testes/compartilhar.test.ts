// Compartilhar uma memória como imagem (onda 2, decisão do Gui de 17/11/2026): só gera quem vê a memória
// publicada; memória só de algumas famílias pede um aviso antes, e a imagem só é montada depois do sim.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TAMANHO_DA_IMAGEM, avisoAntesDeCompartilhar, nomeDoArquivo, trechoDoRelato } from '../src/lib/compartilhar';

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
