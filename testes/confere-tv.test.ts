// A conferência do modo TV (scripts/confere-tv.mjs) abre todas as memórias como outra pessoa pelo "Ver como":
// como os outros scripts de navegador, recusa a produção e a homologação (auditoria AC, G-2, sessão AC1).
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const rodar = (endereco: string) => spawnSync(process.execPath, ['scripts/confere-tv.mjs', endereco], { encoding: 'utf8', timeout: 20_000 });

describe('a conferência da TV recusa a produção e a homologação', () => {
  it.each(['https://memorias.bayara.com.br', 'https://homologa.memorias.bayara.com.br/', 'https://memorias.bayara.com.br:443'])('%s', (endereco) => {
    const r = rodar(endereco);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('Produção e homologação nunca.');
  });
});
