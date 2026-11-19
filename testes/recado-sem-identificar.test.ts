import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Quem entrou com um e-mail que não está ligado a ninguém precisa poder sair e entrar com outro
// (pedido do Gui, 19/11/2026): sem o botão, o login do Access ficava preso no e-mail errado.
describe('tela de quem não foi identificado', () => {
  const codigo = readFileSync('src/middleware.ts', 'utf8');
  it('tem o botão de sair do Access', () => {
    expect(codigo).toMatch(/Não consegui identificar você[\s\S]*href="\$\{ENDERECO_DE_SAIDA\}"[\s\S]*>Sair</);
  });
});
