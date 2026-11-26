// Os lados das famílias valem de qualquer ponto de partida (achado da QA, 18/11/2026): Bayara à esquerda e
// Bracarense à direita também quando a árvore parte de alguém ("Partir de", `centro=` no endereço), com
// qualquer combinação de laços do coração abertos, com ou sem bichinhos, ex e amigos. As trocas dentro de
// um casal da mesma família podem ficar; o que não pode é alguém de uma família passar para o lado da outra.
// O ex que virou amigo continua colado do lado de fora do casal, entre os irmãos (Gui, Thiago, Giovanna,
// Lucas Magno). Conferido com os dados da prévia.
// Dividido em um arquivo por centro, para rodarem em paralelo (testes/apoio/arvore-lados.ts): este, o do começo.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CENTROS, base, comAmigo, fileiraDe, testarOsLadosPartindoDe } from './apoio/arvore-lados';

describe('os lados das famílias, partindo de qualquer pessoa', () => {
  testarOsLadosPartindoDe('');

  it('cada centro tem o seu arquivo de teste', () => {
    for (const centro of CENTROS.filter(Boolean)) expect(existsSync(new URL(`./arvore-lados-${centro}.test.ts`, import.meta.url)), centro).toBe(true);
  });

  // Os quatro casos achados pela QA, com a fileira esperada
  it('partindo da Elizete, com os laços dela e da Giovanna abertos, o Gui fica à esquerda', () => {
    const f = fileiraDe(comAmigo, 'elizete', ['elizete', 'giovanna']);
    expect(f.indexOf('Gui'), f).toBeLessThan(f.indexOf('Thiago | Giovanna | Lucas Magno'));
  });
  it('partindo da Giovanna, os bichinhos irmãos dela ficam do lado do Bayara', () => {
    for (const abertos of [[], ['giovanna']]) {
      const f = fileiraDe(comAmigo, 'giovanna', abertos);
      expect(f, f).toMatch(/^(Mel|Totó) \| (Mel|Totó) \| Gui \| /);
      expect(f.endsWith('Giovanna | Lucas Magno'), f).toBe(true);
    }
  });
  it('partindo do Lucas Magno, com os laços dele abertos, a árvore não se espelha', () => {
    const f = fileiraDe(base, 'lucas-magno', ['lucas-magno']);
    expect(f.startsWith('Giovanna | Lucas Magno'), f).toBe(true);
  });
  it('partindo da Elizete, com os laços do Gui abertos e os bichinhos desligados, o Gui fica à esquerda da Giovanna', () => {
    const f = fileiraDe(base, 'elizete', ['gui'], false);
    expect(f.indexOf('Gui'), f).toBeLessThan(f.indexOf('Giovanna'));
    expect(f.endsWith('Giovanna | Lucas Magno'), f).toBe(true);
  });
});
