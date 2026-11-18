// Defeito visto pelo Gui depois da sessão H (18/11/2026): na homologação, as pessoas apareciam sem
// retrato. Todo retrato da homologação é uma das fotos do Chico e da Karol, como o espelho faz.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ehChaveDeExemplo, retratoDeExemplo, retratosDeExemploParaHomologacao } from '../src/lib/fotos-de-exemplo';

const ler = (arquivo: string) => readFileSync(arquivo, 'utf8');

describe('retratos da homologação', () => {
  const integrantes = [
    { id: 'sem-retrato', retrato: null, tratamento: 'ela', tipo: 'pessoa' },
    { id: 'real', retrato: '0f8b6a2e-1c3d-4e5f-8a9b-0c1d2e3f4a5b.jpg', tratamento: 'ele', tipo: 'pessoa' },
    { id: 'ja-de-exemplo', retrato: 'exemplos/karol-3.jpg', tratamento: 'ela', tipo: 'pessoa' },
    { id: 'bichinho', retrato: null, tratamento: null, tipo: 'bicho' },
  ];
  const mudancas = retratosDeExemploParaHomologacao(integrantes);

  it('quem está sem retrato ou com um retrato de verdade ganha uma foto de exemplo; quem já tem fica', () => {
    expect(mudancas.map((m) => m.id)).toEqual(['sem-retrato', 'real', 'bichinho']);
    for (const m of mudancas) expect(ehChaveDeExemplo(m.retrato)).toBe(true);
  });
  it('o sorteio é o mesmo do espelho: o mesmo id dá sempre a mesma foto', () => {
    expect(mudancas.find((m) => m.id === 'sem-retrato')!.retrato).toBe(retratoDeExemplo('sem-retrato', 'ela', false));
    expect(mudancas.find((m) => m.id === 'real')!.retrato).toBe(retratoDeExemplo('real', 'ele', false));
    expect(mudancas.find((m) => m.id === 'bichinho')!.retrato).toBe(retratoDeExemplo('bichinho', null, true));
  });
  it('o conserto só roda na homologação, uma vez, sem derrubar o site e sem apagar arquivo', () => {
    const conserto = ler('src/lib/servidor/retratos-da-homologacao.ts');
    expect(conserto).toMatch(/if \(!ehHomologacao\(\)\) return;/);
    expect(conserto).toMatch(/SELECT 1 FROM ajustes WHERE chave = \?/);
    expect(conserto).toMatch(/catch \(erro\)/);
    expect(conserto).not.toMatch(/\.delete\(/);
    expect(ler('src/lib/servidor/banco.ts')).toContain('await consertarRetratosDaHomologacao(db);');
  });
});
