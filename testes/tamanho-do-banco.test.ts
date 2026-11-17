// Aviso de tamanho do banco (decisão do Gui, 16/11/2026): o D1 gratuito vai até 500 MB por banco,
// e o aviso começa em 300 MB, no site para os admins e na cópia mensal do Drive.
import { describe, expect, it } from 'vitest';
import { AVISO_A_PARTIR_DE, emMegabytes, LIMITE_DO_PLANO, situacaoDoBanco } from '../src/lib/tamanho-do-banco';

const fontes: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../{src/**/*.{astro,ts},scripts/*.gs}', { query: '?raw', import: 'default', eager: true })).map(([k, v]) => [k.replace('../', ''), v]),
);

describe('limites', () => {
  it('500 MB de limite e aviso a partir de 300 MB', () => {
    expect(LIMITE_DO_PLANO).toBe(500_000_000);
    expect(AVISO_A_PARTIR_DE).toBe(300_000_000);
  });

  it('o aviso liga a partir de 300 MB', () => {
    expect(situacaoDoBanco(299_999_999)?.passouDoAviso).toBe(false);
    expect(situacaoDoBanco(300_000_000)?.passouDoAviso).toBe(true);
    expect(situacaoDoBanco(null)).toBeUndefined();
  });

  it('o tamanho em texto curto', () => {
    expect(emMegabytes(1_234_567)).toBe('1,2 MB');
    expect(emMegabytes(310_400_000)).toBe('310 MB');
  });
});

describe('onde o aviso aparece', () => {
  it('na seção "Administração" da conta, só para os admins', () => {
    // Saiu do rodapé com o esqueleto antigo (fase 3 da revisão visual, grupo 4)
    expect(fontes['src/lib/servidor/conta.ts']).toContain('const banco = usuario.admin ? situacaoDoBanco(await tamanhoDoBanco()) : undefined;');
    const conta = fontes['src/pages/conta.astro'];
    expect(conta).toMatch(/\{conta\.bancoEmAviso && \(/);
    expect(conta).toContain('Banco: {conta.banco}');
  });

  it('na cópia, com o tamanho, e o script do Drive falha depois de salvar o arquivo', () => {
    expect(fontes['src/lib/servidor/copia.ts']).toContain('passou_do_aviso: situacao?.passouDoAviso ?? false');
    const script = fontes['scripts/copia-no-drive.gs'];
    expect(script).toBeDefined();
    expect(script.indexOf('pasta.createFile(')).toBeLessThan(script.indexOf('passou_do_aviso'));
    expect(script).toMatch(/throw new Error\(\s*'Cópia salva, mas o banco do acervo está com/);
  });
});
