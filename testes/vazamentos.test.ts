// Conferências no código das páginas, para vazamentos achados no QA não voltarem.
import { describe, expect, it } from 'vitest';

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
    expect(repositorio).toContain("AND (situacao = 'publicada' OR registrado_por = ?)");
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
