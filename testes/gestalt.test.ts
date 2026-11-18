// A regra da proximidade da conferência automática (scripts/gestalt.mjs), com caixas já medidas.
// O navegador mede em scripts/confere-gestalt.mjs (npm run gestalt); aqui fica só o julgamento.
import { describe, expect, it } from 'vitest';
import { conferir, julgar } from '../scripts/gestalt.mjs';

const caixa = (top: number, bottom: number, left = 0, right = 300) => ({ top, bottom, left, right });

describe('Gestalt: o espaço acima de um título é pelo menos o dobro do de baixo', () => {
  it('passa com o dobro exato e com mais que o dobro', () => {
    expect(julgar({ anterior: caixa(0, 100), titulo: caixa(132, 150), proximo: caixa(166, 300) })).toMatchObject({ situacao: 'ok', acima: 32, abaixo: 16 });
    expect(julgar({ anterior: caixa(0, 100), titulo: caixa(164, 180), proximo: caixa(188, 300) })).toMatchObject({ situacao: 'ok' });
  });

  it('falha com quase o mesmo espaço antes e depois', () => {
    expect(julgar({ anterior: caixa(0, 100), titulo: caixa(124, 140), proximo: caixa(156, 300) })).toMatchObject({ situacao: 'falha', acima: 24, abaixo: 16 });
  });

  it('falha quando o título fica mais perto do grupo anterior que do próprio conteúdo', () => {
    expect(julgar({ anterior: caixa(0, 100), titulo: caixa(108, 120), proximo: caixa(152, 300) }).situacao).toBe('falha');
  });

  it('aceita a diferença de arredondamento do navegador', () => {
    expect(julgar({ anterior: caixa(0, 100), titulo: caixa(131.4, 150), proximo: caixa(166, 300) }).situacao).toBe('ok');
  });

  it('ignora o título que abre o contêiner e o que não tem nada abaixo', () => {
    expect(julgar({ anterior: null, titulo: caixa(0, 20), proximo: caixa(28, 100) })).toMatchObject({ situacao: 'ignorado', motivo: 'primeiro do contêiner' });
    expect(julgar({ anterior: caixa(0, 100), titulo: caixa(110, 130), proximo: null })).toMatchObject({ situacao: 'ignorado', motivo: 'sem conteúdo abaixo' });
  });

  it('ignora vizinhos lado a lado, que não estão em cima nem embaixo do título', () => {
    expect(julgar({ anterior: caixa(0, 100, 400, 700), titulo: caixa(110, 130), proximo: caixa(140, 200) }).situacao).toBe('ignorado');
  });

  it('ignora a pilha de títulos, o sobretítulo e o título depois de um fio', () => {
    const base = { titulo: caixa(104, 120), proximo: caixa(152, 300) };
    expect(julgar({ ...base, anterior: { ...caixa(0, 100), titulo: true } })).toMatchObject({ motivo: 'logo depois de outro título' });
    expect(julgar({ ...base, anterior: { ...caixa(0, 100), sobretitulo: true } })).toMatchObject({ motivo: 'sobretítulo' });
    expect(julgar({ ...base, anterior: { ...caixa(0, 100), fio: true } })).toMatchObject({ motivo: 'separado por um fio' });
    expect(julgar({ ...base, anterior: caixa(0, 100) }).situacao).toBe('falha');
  });

  it('separa as falhas das exceções de propósito e conta só os títulos julgados', () => {
    const falha = { anterior: caixa(0, 100), titulo: caixa(110, 130), proximo: caixa(140, 200) };
    const medidas = [
      { ...falha, tela: 'memoria', largura: 390, seletor: 'header > h1.t-1', texto: 'Natal' },
      { ...falha, tela: 'painel', largura: 390, seletor: 'header > h1.t-1', texto: 'Oi' },
      { anterior: caixa(0, 100), titulo: caixa(132, 150), proximo: caixa(166, 300), tela: 'painel', largura: 390, seletor: 'section > h2', texto: 'ok' },
      { anterior: null, titulo: caixa(0, 20), proximo: caixa(28, 100), tela: 'painel', largura: 390, seletor: 'div > h2', texto: 'primeiro' },
    ];
    const excecao = { tela: 'memoria', seletor: /h1\.t-1$/, motivo: 'de propósito' };
    // Com o vizinho de cima na exceção, ela só vale quando ele bate
    expect(conferir(medidas, [{ ...excecao, anterior: /^ul/ }]).falhas).toHaveLength(2);
    const r = conferir(medidas, [excecao]);
    expect(r.conferidos).toBe(3);
    expect(r.usadas).toEqual([excecao]);
    expect(r.falhas.map((f) => f.tela)).toEqual(['painel']);
  });
});
