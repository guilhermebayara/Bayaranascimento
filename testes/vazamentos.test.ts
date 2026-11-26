// Conferências no código das páginas, para vazamentos achados no QA não voltarem.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite } from './apoio/d1';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));

const fontes = import.meta.glob<string>(['../src/pages/**/*.{astro,ts}', '../src/components/**/*.astro'], { query: '?raw', import: 'default', eager: true });
const paginas = Object.entries(fontes).map(([caminho, texto]) => ({ caminho, texto }));

describe('vazamentos já corrigidos', () => {
  it('listas de temas só trazem temas que a pessoa vê', () => {
    // Achado do QA de 15/11/2026: o nome de um tema usado só numa memória restrita aparecia para todos.
    // listarTemas() sem filtro só pode servir para dar nome aos temas de algo que a pessoa já está vendo.
    for (const { caminho, texto } of paginas) {
      for (const uso of texto.matchAll(/await listarTemas\(\)\)?(.{0,60})/g)) {
        expect(uso[1], `${caminho}: use listarTemasVisiveis(usuario)`).toMatch(/^\.filter\(\(t\) => \w+\.temas\.includes\(t\.id\)\)/);
      }
    }
  });

  it('histórico e restauração de versões passam por podeVerVersao', () => {
    // Achado do QA de 15/11/2026: o histórico mostrava a ficha de quando a memória era rascunho
    let usos = 0;
    for (const { caminho, texto } of paginas) {
      for (const uso of texto.matchAll(/listarVersoes<Memoria>\((.{0,200})/gs)) {
        usos++;
        expect(uso[1], `${caminho}: filtre as versões com podeVerVersao`).toContain('podeVerVersao');
      }
    }
    expect(usos).toBeGreaterThanOrEqual(2);
  });

  it('memória e capítulo novos não ganham endereço a partir do título', () => {
    const fonte = (fim: string) => paginas.find((p) => p.caminho.endsWith(fim))!.texto;
    expect(fonte('api/memorias.ts')).toMatch(/id = codigoNovo\(await idsDeMemorias\(\)\)/);
    expect(fonte('api/capitulos.ts')).toMatch(/atual\?\.id \?\? codigoNovo\(/);
  });

  // Os arquivos de servidor fora de pages também entram nestas conferências
  const servidor = import.meta.glob<string>('../src/lib/servidor/*.ts', { query: '?raw', import: 'default', eager: true });
  const doServidor = (nome: string) => Object.entries(servidor).find(([k]) => k.endsWith(nome))![1];

  it('rascunho de relato de outra pessoa não ocupa o lugar nem aparece', () => {
    // Achado do QA de 15/11/2026 e decisão do Gui (16/11): cada um tem o seu rascunho, e só um é publicado
    const repositorio = doServidor('repositorio.ts');
    expect(repositorio).toMatch(/export async function obterRelato\(memoriaId: string, por: string, usuario: Usuario\)/);
    // O rascunho descartado (resposta do Gui à P4 do QA de 23/11/2026) também não volta
    // O relato à vista mora em src/lib/servidor/quem-ve.ts (AC3): publicado, ou o rascunho não descartado de quem o registrou
    expect(repositorio).toContain("AND ${sqlRelatoAberto('', '?')}");
    const banco = doServidor('banco.ts');
    expect(banco).toContain('UNIQUE (memoria_id, por, registrado_por)');
    expect(banco).toContain("CREATE UNIQUE INDEX IF NOT EXISTS relatos_um_publicado ON relatos (memoria_id, por) WHERE situacao = 'publicada'");
  });

  it('cadastrar um par que tem casal privado de outros não denuncia o privado', () => {
    const lacos = paginas.find((p) => p.caminho.endsWith('api/lacos.ts'))!.texto;
    // A única recusa que sobrou é a do conflito raro, dentro do catch
    expect(lacos.match(/Não foi possível salvar esse casal/g)).toHaveLength(1);
    expect(lacos).toMatch(/catch \{[^}]*Não foi possível salvar esse casal/);
    const banco = doServidor('banco.ts');
    expect(banco).toContain('UNIQUE (a_id, b_id, visibilidade)');
    // As fases são apagadas antes dos casais: apagar casais primeiro levaria as fases junto, pela cascata
    expect(banco.indexOf('`DROP TABLE casal_fases`')).toBeLessThan(banco.indexOf('`DROP TABLE casais`'));
  });
});

describe('recados de permissão', () => {
  it('falam dos administradores, e não só do Gui e da Giovanna', () => {
    // Achado do QA de código de 17/11/2026: o Magno é administrador desde a migração 017, e três rotas
    // ainda diziam "Só o Gui e a Giovanna..." a quem não é administrador.
    for (const { caminho, texto } of paginas) {
      expect(texto, caminho).not.toMatch(/['"`]Só o Gui e a Giovanna/);
    }
  });
});

// O relato que vale para quem escreve, pela consulta de verdade (revisão MEM-2 da AC3): o publicado, ou o
// rascunho da própria pessoa que não foi descartado. O descartado e o rascunho de outra pessoa não voltam
describe.skipIf(!comSqlite)('obterRelato, pelo banco', async () => {
  const { abrirBancoDeExemplo } = await import('./apoio/banco-de-exemplo');
  const { repo, sql, usuarioDe, memoriaAberta } = await abrirBancoDeExemplo(env);
  const memoria = memoriaAberta();
  sql(`INSERT INTO integrantes (id, nome) VALUES ('t-descartado', 'Descartado'), ('t-rascunho', 'Rascunho')`);
  sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, descartado_em) VALUES (?, 't-descartado', 'gui', 'Descartado', 'rascunho', '2026-11-20 10:00:00')`, memoria);
  sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, 't-rascunho', 'gui', 'Rascunho', 'rascunho')`, memoria);
  const [gui, giovanna] = ['gui', 'giovanna'].map(usuarioDe);

  it('o rascunho descartado não volta, nem para quem o escreveu', async () => {
    expect(await repo.obterRelato(memoria, 't-descartado', gui)).toBeUndefined();
  });
  it('o rascunho que não foi descartado volta só para quem o escreveu', async () => {
    expect((await repo.obterRelato(memoria, 't-rascunho', gui))?.texto).toBe('Rascunho');
    expect(await repo.obterRelato(memoria, 't-rascunho', giovanna)).toBeUndefined();
  });
});
