// Os lados das famílias valem de qualquer ponto de partida (achado da QA, 18/11/2026): Bayara à esquerda e
// Bracarense à direita também quando a árvore parte de alguém ("Partir de", `centro=` no endereço), com
// qualquer combinação de laços do coração abertos, com ou sem bichinhos, ex e amigos. As trocas dentro de
// um casal da mesma família podem ficar; o que não pode é alguém de uma família passar para o lado da outra.
// O ex que virou amigo continua colado do lado de fora do casal, entre os irmãos (Gui, Thiago, Giovanna,
// Lucas Magno). Conferido com os dados da prévia.
// Dividido em um arquivo por centro, para rodarem em paralelo (testes/apoio/arvore-lados.ts): este, o de lucas-magno.
import { describe } from 'vitest';
import { testarOsLadosPartindoDe } from './apoio/arvore-lados';

describe('os lados das famílias, partindo de qualquer pessoa', () => {
  testarOsLadosPartindoDe('lucas-magno');
});
