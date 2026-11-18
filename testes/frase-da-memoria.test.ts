// A frase da Nova memória (docs/decisoes.md, "Nova memória em frase"): uma frase só, que cresce a
// cada etapa e nunca pergunta o que ainda não é a hora de responder.
import { describe, expect, it } from 'vitest';
import { fraseDaMemoria, oQueFicouSem, type PreenchidoDaMemoria } from '../src/lib/frase-da-memoria';

const ETAPAS = { titulo: 0, data: 1, lugar: 1, pessoas: 2, fotos: 3, relato: 4, capitulo: 5, quemve: 6 };
const vazia: PreenchidoDaMemoria = { titulo: '', lugar: '', pessoas: [], fotos: 0, relato: false, capitulos: [], soFamilias: null };
const natal: PreenchidoDaMemoria = {
  titulo: 'Natal de 2025',
  ano: 2025,
  mes: 12,
  dia: 24,
  lugar: 'Belo Horizonte',
  pessoas: ['Aguilar', 'Elizete', 'Giovanna', 'Gui', 'Mel'],
  fotos: 6,
  relato: true,
  capitulos: ['Natais'],
  soFamilias: null,
};
const escrita = (p: PreenchidoDaMemoria, atual: number, ate = atual) => {
  const f = fraseDaMemoria(p, ETAPAS, atual, ate, 6);
  return f.trechos.map((t) => t.antes + t.texto).join('') + f.fim;
};

describe('a frase da nova memória', () => {
  it('na primeira etapa só fala do título, sem perguntar data, lugar nem pessoas', () => {
    expect(escrita(vazia, 0)).toBe('Esta memória foi…');
    expect(escrita({ ...vazia, titulo: 'Natal de 2025' }, 0)).toBe('Natal de 2025 foi…');
  });

  it('cresce a cada etapa, e a parte da etapa em uso, vazia, é a pergunta', () => {
    const p = { ...vazia, titulo: 'Natal de 2025' };
    expect(escrita(p, 1)).toBe('Natal de 2025 foi em que data? em que lugar?');
    expect(escrita({ ...p, ano: 2025 }, 1)).toBe('Natal de 2025 foi em 2025, em que lugar?');
    expect(escrita({ ...p, ano: 2025, lugar: 'Belo Horizonte' }, 2)).toBe('Natal de 2025 foi em 2025, em Belo Horizonte, com quem?');
  });

  it('o que foi pulado some, e a frase segue sem ele', () => {
    const p = { ...vazia, titulo: 'Natal de 2025', ano: 2025 };
    expect(escrita(p, 2)).toBe('Natal de 2025 foi em 2025, com quem?');
    expect(escrita(p, 3)).toBe('Natal de 2025 foi em 2025. Ainda sem fotos…');
    expect(escrita({ ...p, relato: true }, 5)).toBe('Natal de 2025 foi em 2025. Tem o seu relato. Sem capítulo…');
  });

  it('completa, termina com ponto e diz quem vê', () => {
    expect(escrita(natal, 6)).toBe('Natal de 2025 foi em 24 de dezembro de 2025, em Belo Horizonte, com Aguilar, Elizete, Giovanna e mais 2. Tem 6 fotos e o seu relato. Faz parte de Natais. Toda a família vê.');
    expect(escrita({ ...natal, soFamilias: ['Bayara', 'Bracarense'] }, 6)).toMatch(/Só Bayara e Bracarense veem\.$/);
    expect(escrita({ ...natal, soFamilias: ['Bayara'] }, 6)).toMatch(/Só Bayara vê\.$/);
  });

  it('voltar a uma etapa não encolhe a frase: vale a etapa mais adiantada a que a pessoa chegou', () => {
    expect(escrita(natal, 1, 6)).toBe(escrita(natal, 6));
    const f = fraseDaMemoria(natal, ETAPAS, 1, 6, 6);
    expect(f.trechos.filter((t) => t.atual).map((t) => t.parte)).toEqual(['data', 'lugar']);
  });

  it('na correção de uma memória publicada não há etapa do relato, e ele fica fora da frase', () => {
    const semRelato = { titulo: 0, data: 1, lugar: 1, pessoas: 2, fotos: 3, capitulo: 4, quemve: 5 };
    const f = fraseDaMemoria(natal, semRelato, 5, 5, 5);
    expect(f.trechos.some((t) => t.parte === 'relato')).toBe(false);
    expect(f.fim).toBe('.');
  });

  it('o que ficou sem preencher vira a lista de idas diretas do "Confira"', () => {
    expect(oQueFicouSem(natal, ETAPAS)).toEqual([]);
    expect(oQueFicouSem({ ...vazia, titulo: 'x', ano: 2025 }, ETAPAS).map((f) => f.parte)).toEqual(['lugar', 'pessoas', 'fotos', 'relato', 'capitulo']);
  });
});
