// "Quem pode ver?" da nova memória com o seletor segmentado (decisão do Gui, 17 e 18/11/2026,
// conceito da sessão D): "Toda a família" e "Famílias escolhidas", a explicação colada no seletor e
// as famílias num grupo à parte. O seletor só existe ali.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(caminho, 'utf8');
const arquivos = (pasta: string): string[] =>
  readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });

describe('Quem pode ver, com o seletor segmentado', () => {
  const segmentado = ler('src/components/visual/Segmentado.astro');
  const nova = ler('src/pages/nova.astro');
  const css = ler('src/visual/telas/formulario.css');

  it('o seletor é um grupo de rádios: vai junto com o envio e funciona sem script', () => {
    expect(segmentado).toContain('role="radiogroup"');
    expect(segmentado).toMatch(/<input type="radio" name=\{nome\} value=\{o\.valor\} checked=\{o\.atual\} disabled=\{travado\} \/>/);
    expect(segmentado).not.toContain('<a ');
  });

  it('na nova memória, as duas opções têm os nomes combinados e a explicação colada', () => {
    expect(nova).toContain("{ valor: 'todos', texto: 'Toda a família', atual: !soFamilias }");
    expect(nova).toContain("{ valor: 'nucleos', texto: 'Famílias escolhidas', atual: soFamilias }");
    expect(nova).toMatch(/explicacao="quem-ve-explica"[\s\S]*?<\/div>/);
    expect(nova).toMatch(/<\/Segmentado>|\/>\s*<p class="dica" id="quem-ve-explica"/);
    // Os dois rádios de antes saíram
    expect(nova).not.toContain('Só quem é das famílias marcadas abaixo</span>');
  });

  it('quem não criou a memória vê a escolha travada, e o valor vai num campo escondido', () => {
    expect(nova).toContain('travado={travaQuemVe}');
    expect(nova).toContain('{travaQuemVe && <input type="hidden" name="visibilidade" value={memoria!.visibilidade} />}');
  });

  it('as famílias ficam bem mais longe da escolha do que a explicação (proximidade)', () => {
    const regra = (seletor: string) => css.slice(css.indexOf(`${seletor} {`), css.indexOf('}', css.indexOf(`${seletor} {`)));
    expect(regra('.pagina-de-formulario .quem-pode-ver')).toContain('gap: var(--e-7)');
    expect(regra('.pagina-de-formulario .quem-pode-ver__escolha')).toContain('gap: var(--e-2)');
    expect(regra('.pagina-de-formulario .quem-pode-ver__familias')).toContain('gap: var(--e-2)');
  });

  // Na sessão H, também em "Quem reconhece este laço?", no laço do coração (a troca entre "Só eu" e "A família
  // toda" mostra outro conteúdo embaixo, o padrão do controle segmentado; uso a confirmar pelo Gui)
  it('o seletor segmentado só aparece em Quem pode ver, em Quem reconhece este laço (e na página do sistema)', () => {
    const usam = arquivos('src')
      .filter((f) => f.endsWith('.astro'))
      .filter((f) => /<Segmentado\b/.test(ler(f)))
      .map((f) => f.replace(/\\/g, '/'));
    expect(usam.sort()).toEqual(['src/pages/nova.astro', 'src/pages/pessoas/[id]/editar.astro', 'src/pages/sistema.astro']);
  });
});
