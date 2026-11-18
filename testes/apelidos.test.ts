// "Como você chama", só seu (decisão do Gui, 18/11/2026; src/lib/apelidos.ts, migração 090): cada pessoa
// dá o próprio apelido a alguém, e só ela vê, no site inteiro. Sem apelido próprio, vale o da família.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LIMITE_DO_APELIDO, lerApelido, podeDarApelido } from '../src/lib/apelidos';
import { TABELAS_APAGADAS } from '../src/lib/espelho';

const ler = (c: string) => readFileSync(c, 'utf8');

describe('como você chama, só seu', () => {
  it('o apelido é aparado; vazio apaga; longo demais é recusado', () => {
    expect(lerApelido('  Tia   Lu ')).toEqual({ ok: true, apelido: 'Tia Lu' });
    expect(lerApelido('')).toEqual({ ok: true, apelido: null });
    expect(lerApelido(undefined)).toEqual({ ok: true, apelido: null });
    expect(lerApelido('x'.repeat(LIMITE_DO_APELIDO + 1)).ok).toBe(false);
  });
  it('só se dá apelido a quem se vê, e nunca a si mesmo', () => {
    expect(podeDarApelido('giovanna', 'elizete', true)).toBe(true);
    expect(podeDarApelido('giovanna', 'elizete', false)).toBe(false);
    expect(podeDarApelido('giovanna', 'giovanna', true)).toBe(false);
  });
  it('só o dono lê os dele, e a tabela tem o limite de 40 letras', () => {
    const repo = ler('src/lib/servidor/repositorio.ts');
    expect(repo).toContain("SELECT pessoa_id, apelido FROM apelidos_meus WHERE dono_id = ?");
    expect(repo.match(/SELECT [^'`]*FROM apelidos_meus/g)?.length).toBe(1);
    expect(ler('src/lib/servidor/banco.ts')).toMatch(/id: '090-como-voce-chama'[\s\S]*apelido TEXT NOT NULL CHECK \(length\(apelido\) BETWEEN 1 AND 40\)/);
  });
  it('nas páginas, a pessoa aparece com o apelido de quem olha; a ficha de edição continua com o da família', () => {
    const repo = ler('src/lib/servidor/repositorio.ts');
    expect(repo).toContain('apelido: meus?.get(i.id as string) ?? (i.apelido as string | null),');
    expect(repo).toContain('apelidoDaFamilia: i.apelido as string | null,');
    expect(ler('src/components/FichaDoIntegrante.astro')).toContain('i.apelidoDaFamilia !== undefined ? i.apelidoDaFamilia : i?.apelido');
  });
  it('as rotas de /api e a administração leem os de sempre: nenhum apelido privado vira o da família', () => {
    expect(ler('src/middleware.ts')).toContain("if (!/^\\/(api|admin)(\\/|$)/.test(contexto.url.pathname)) guardarApelidosDoPedido(await listarMeusApelidos(usuario.pessoa));");
  });
  it('não passa pelo espelho, e juntar duplicados leva os apelidos para a ficha que fica', () => {
    expect(TABELAS_APAGADAS).toContain('apelidos_meus');
    expect(ler('src/lib/servidor/repositorio.ts')).toContain("['apelidos_meus', 'dono_id', 'pessoa_id'],");
  });
  it('dá para dar o apelido na página da pessoa e chegar lá pela ficha da árvore', () => {
    const pagina = ler('src/pages/pessoas/[id]/index.astro');
    expect(pagina).toContain('<details class="como-chama" id="como-voce-chama">');
    expect(pagina).toContain('action="/api/apelidos"');
    expect(ler('src/lib/cliente/arvore.ts')).toContain('href: `/pessoas/${p.id}#como-voce-chama`');
    const rota = ler('src/pages/api/apelidos.ts');
    expect(rota).toContain('if (!mesmaOrigem(request))');
    expect(rota).toContain('if (!podeDarApelido(usuario.pessoa, pessoa, ve))');
  });
});
