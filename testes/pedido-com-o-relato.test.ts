// O pedido para liberar um relato com o relato à vista (crítica C2, esboço pedido-com-o-relato.html; resposta
// do Gui de 22/11/2026): o começo do relato, quem passa a ler em nomes, a ação com um nome só e a frase de que
// liberar não tem volta. Os nomes seguem a visibilidade de quem olha: quem está em pessoasQueONaoVe não
// aparece nem no nome nem na conta. Roda sobre o acervo de exemplo, no SQLite do Node.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

// O projeto não tem os tipos do Node: o módulo entra assim para o tsc não acusar o import (como em apoio/d1.ts)
const NODE_FS = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ NODE_FS)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url), 'utf8');

describe.skipIf(!comSqlite)('o pedido para liberar, com o relato à vista', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  await (await import('../src/lib/servidor/banco')).prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const { pedidosDosRelatos, quemPassaALer } = await import('../src/lib/servidor/pedido-do-relato');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const linhas = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).all(...valores) as T[];
  const usuarioDe = (pessoa: string): Usuario => ({
    pessoa,
    nome: pessoa,
    admin: Boolean(linhas<{ admin: number }>('SELECT admin FROM integrantes WHERE id = ?', pessoa)[0].admin),
    nucleos: linhas<{ n: string }>(`SELECT nucleo_id AS n FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((l) => l.n),
  });
  const giovanna = usuarioDe('giovanna');
  // O relato de exemplo da Giovanna em "Casamento da Prima Carol", que espera o sim dela
  const [relato] = linhas<{ id: number }>(`SELECT id FROM relatos WHERE memoria_id = '2012-casamento-carol-davi' AND por = 'giovanna'`);
  const memoria = (await repo.obterMemoria(giovanna, '2012-casamento-carol-davi'))!;

  it('a Giovanna lê o começo do relato, para quem libera e quem passa a ler', async () => {
    const pedido = (await pedidosDosRelatos(giovanna, [{ relatoId: relato!.id, publico: memoria }])).get(relato!.id)!;
    expect(pedido.comeco).toBe('Peguei o buquê com treze anos e virei piada da família por uma década.');
    expect(pedido.paraQuem).toBe('toda a família');
    expect(pedido.acao).toBe('Liberar para toda a família');
    // Só membros das famílias que passam a ver a memória e ainda não liam o relato, vivos
    const ids = await quemPassaALer((await repo.obterRelatoPorId(relato!.id))!, memoria, giovanna);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const quem = usuarioDe(id);
      expect(quem.nucleos.includes('bayara-nascimento'), id).toBe(false);
      expect(linhas<{ f: number }>('SELECT falecido AS f FROM integrantes WHERE id = ?', id)[0].f, id).toBe(0);
    }
    expect(pedido.leitores).toMatch(/^[^,]+(, [^,]+)*( e mais \d+| e [^,]+)?$/);
  });

  it('só quem registrou o relato recebe o pedido', async () => {
    expect((await pedidosDosRelatos(usuarioDe('gui'), [{ relatoId: relato!.id, publico: memoria }])).size).toBe(0);
  });

  it('quem olha nunca lê o nome de quem não vê, nem na conta "e mais N"', async () => {
    const relatoInteiro = (await repo.obterRelatoPorId(relato!.id))!;
    const elizete = usuarioDe('elizete');
    // A pessoa do laço "só eu vejo" da Giovanna vira membro de uma família que passa a ver a memória
    banco.sqlite.prepare(`INSERT INTO nucleo_membros (nucleo_id, integrante_id, papel) VALUES ('bracarense', 'ex-marina', 'membro')`).run();
    try {
      expect((await repo.pessoasQueONaoVe(elizete)).has('ex-marina')).toBe(true);
      const paraElizete = await quemPassaALer(relatoInteiro, memoria, elizete);
      expect(paraElizete).not.toContain('ex-marina');
      // A Giovanna, que vê, conta com ela; a conta da Elizete tem uma pessoa a menos
      const paraGiovanna = await quemPassaALer(relatoInteiro, memoria, giovanna);
      expect(paraGiovanna).toContain('ex-marina');
      expect(paraElizete.length).toBe(paraGiovanna.filter((id) => id !== 'elizete').length - 1);
    } finally {
      banco.sqlite.prepare(`DELETE FROM nucleo_membros WHERE integrante_id = 'ex-marina' AND nucleo_id = 'bracarense'`).run();
    }
  });

  it('a tela: o começo do relato, os nomes, a ação com o mesmo nome nos dois lugares, as duas respostas com o mesmo peso e "não tem volta"', () => {
    const avisos = ler('src/components/Avisos.astro');
    expect(avisos).toContain('<blockquote class="aviso__relato">');
    expect(avisos).toContain('Se liberar, passam a ler: <strong>');
    expect(avisos).toMatch(/<button type="submit" class="acao" name="resposta" value="liberar">\s*\{pedidos\.get\(a\.relato\.id\)\?\.acao/);
    expect(avisos).toMatch(/<button type="submit" class="acao" name="resposta" value="manter">\s*Manter como estava/);
    expect(avisos).not.toContain('acao--quieta" name="resposta"');
    expect(avisos).toContain('Liberar não tem volta.');
    const pagina = ler('src/pages/memorias/[id].astro');
    expect(pagina).toContain('{pedidosDaPagina.get(relato.id)?.acao ??');
    expect(pagina).toContain('Liberar não tem volta.');
  });
});
