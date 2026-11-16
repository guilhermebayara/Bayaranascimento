// "Sua conta" (docs/decisoes.md): as listas trazem só o que é da pessoa e o que ela vê, e a seção de
// administração não aparece para quem não é administrador. Regras em src/lib/conta.ts.
import { describe, expect, it } from 'vitest';
import { administracao, oQueVoceCriou, seusLacos, seusRascunhos, suaLixeira } from '../src/lib/conta';

const memoria = (id: string, criadaPor: string, fotos: [number, string][] = [], situacao: 'rascunho' | 'publicada' = 'publicada') => ({
  id,
  criadaPor,
  situacao,
  fotos: fotos.map(([fid, enviadaPor]) => ({ id: fid, enviadaPor })),
});
const relato = (id: number, memoriaId: string, por: string, registradoPor = por, situacao: 'rascunho' | 'publicada' = 'publicada') => ({ id, memoriaId, por, registradoPor, situacao });

describe('o que você criou', () => {
  // As memórias que a Elizete vê: "restrita", da Giovanna, não está na lista dela
  const vistas = {
    memorias: [memoria('natal', 'elizete', [[1, 'elizete'], [2, 'gui']]), memoria('praia', 'gui', [[3, 'elizete']]), memoria('rascunho', 'elizete', [[4, 'elizete']], 'rascunho')],
    relatos: [
      relato(1, 'natal', 'elizete'),
      relato(2, 'praia', 'vo-bela', 'elizete'),
      relato(3, 'restrita', 'elizete'),
      relato(4, 'praia', 'gui'),
      relato(5, 'natal', 'elizete', 'elizete', 'rascunho'),
    ],
    capitulos: [
      { id: 'natais', criadoPor: 'elizete' },
      { id: 'viagens', criadoPor: 'gui' },
    ],
  };
  const r = oQueVoceCriou('elizete', vistas);

  it('as memórias que criou, já publicadas', () => {
    expect(r.memorias.map((m) => m.id)).toEqual(['natal']);
  });

  it('os relatos que escreveu, inclusive os registrados por outra pessoa, marcados assim, e só em memórias que vê', () => {
    expect(r.relatos.map((x) => [x.id, x.emNomeDe])).toEqual([
      [1, null],
      [2, 'vo-bela'],
    ]);
  });

  it('as fotos que enviou, mesmo em memória de outra pessoa', () => {
    expect(r.fotos.map((f) => [f.memoria.id, f.foto.id])).toEqual([
      ['natal', 1],
      ['praia', 3],
    ]);
  });

  it('os capítulos que criou', () => {
    expect(r.capitulos.map((c) => c.id)).toEqual(['natais']);
  });

  it('o rascunho fica em "Rascunhos", e só o da própria pessoa', () => {
    const rascunhos = seusRascunhos('elizete', [...vistas.memorias, memoria('do-gui', 'gui', [], 'rascunho')], vistas.relatos);
    expect(rascunhos.memorias.map((m) => m.id)).toEqual(['rascunho']);
    expect(rascunhos.relatos.map((x) => x.id)).toEqual([5]);
  });
});

describe('seus laços do coração', () => {
  it('só os que a pessoa definiu, inclusive os "só eu", do mais próximo para o mais distante', () => {
    const lacos = [
      { id: 1, dono: 'gui', pessoa: 'caio', privado: false, proximidade: 3 },
      { id: 2, dono: 'gui', pessoa: 'deia', privado: true, proximidade: 1 },
      { id: 3, dono: 'giovanna', pessoa: 'marina', privado: false, proximidade: null },
    ];
    expect(seusLacos('gui', lacos).map((l) => l.id)).toEqual([2, 1]);
    expect(seusLacos('elizete', lacos)).toEqual([]);
  });
});

describe('lixeira', () => {
  it('só o que a pessoa mesma mandou para a lixeira', () => {
    const excluidas = [
      { id: 'a', excluidaPor: 'gui' },
      { id: 'b', excluidaPor: 'giovanna' },
      { id: 'c', excluidaPor: null },
    ];
    expect(suaLixeira('gui', excluidas).map((m) => m.id)).toEqual(['a']);
  });
});

describe('administração', () => {
  it('não aparece para quem não é administrador', () => {
    expect(administracao({ admin: false }, { podeEspelhar: true })).toEqual([]);
  });

  it('para os administradores, com o espelho só onde ele existe', () => {
    const naProducao = administracao({ admin: true }, { podeEspelhar: false }).map((i) => i.rotulo);
    expect(naProducao).toEqual(['Tipos de momento', 'Famílias e membros', 'Baixar cópia do acervo']);
    expect(administracao({ admin: true }, { podeEspelhar: true }).map((i) => i.rotulo)).toContain('Espelho da produção');
  });
});
