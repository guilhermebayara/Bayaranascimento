// Editar pessoa e laços, proposta A do conceito da sessão E (escolha do Gui, 18/11/2026; docs/decisoes.md,
// "Formulários de pessoa e laço"): uma página só, com o índice, a ficha num resumo que abre no lugar e
// cada grupo de laços num cartão com o seu próprio "Adicionar", já no tipo certo.
import { describe, expect, it } from 'vitest';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url), 'utf8');

const editar = ler('src/pages/pessoas/[id]/editar.astro');
const ficha = ler('src/components/FichaDoIntegrante.astro');
const css = ler('src/visual/telas/formulario.css');

describe('o índice', () => {
  it('fica na abertura, com a ficha e cada grupo com a conta', () => {
    const abertura = editar.slice(editar.indexOf('<Fragment slot="abertura">'), editar.indexOf('</Fragment>'));
    expect(abertura).toContain('<nav class="indice-lacos" aria-label="Nesta página">');
    expect(abertura).toContain('href="#ficha"');
    expect(abertura).toContain("{g.quantos > 0 ? g.quantos : 'ninguém'}");
  });

  it('acompanha a rolagem só no computador, onde há mouse (banda do Safari no iPhone)', () => {
    const presos = [...css.matchAll(/position: sticky;/g)].map((m) => {
      const antes = css.slice(0, m.index);
      return antes.slice(antes.lastIndexOf('@media'));
    });
    const doIndice = presos.filter((trecho) => trecho.includes('.indice-lacos'));
    expect(doIndice).toHaveLength(1);
    expect(doIndice[0]).toMatch(/^@media \(min-width: 62rem\) and \(hover: hover\) and \(pointer: fine\) \{\s*\.pagina-de-formulario \.indice-lacos \{\s*$/);
  });
});

describe('os grupos de laço', () => {
  it('vêm na ordem Pais, Casal, Filhos, coração, parentes de fora e os de outras pessoas', () => {
    const ids = ["id: 'pais'", "id: 'casal'", "id: 'filhos'", "id: 'coracao'", "id: 'parentes'", "id: 'outros'"].map((id) => editar.indexOf(id));
    for (const i of ids) expect(i).toBeGreaterThan(-1);
    expect([...ids].sort((a, b) => a - b)).toEqual(ids);
  });

  it('cada "Adicionar" já vem no tipo do grupo, e as abas de tipo saíram', () => {
    expect(editar).toContain("laco: 'filho-de' as const, rotulo: 'Adicionar pai ou mãe'");
    expect(editar).toContain("laco: 'casal' as const, rotulo: 'Adicionar casal'");
    expect(editar).toContain("laco: 'pai-de' as const, rotulo: 'Adicionar filho ou filha'");
    expect(editar).toContain("laco: 'coracao' as const, rotulo: 'Adicionar laço do coração'");
    expect(editar).toContain("laco: 'resumido' as const, rotulo: 'Adicionar parente'");
    expect(editar).toContain('<input type="hidden" name="laco" value={g.novo.laco} />');
    expect(editar).not.toContain('data-tipo-de-laco');
    // O parente de amigo só se adiciona na página de quem é de fora das famílias
    expect(editar).toContain("novo: deFora ? { laco: 'resumido' as const");
  });

  it('o laço que a família toda reconhece mora em "Adicionar laço do coração"', () => {
    const doCoracao = editar.slice(editar.indexOf("{g.novo.laco === 'coracao' && podeLacos && ("));
    expect(doCoracao).toMatch(/^[^]*?name="reconhece" value="familia"/);
  });

  it('o grupo vazio é uma linha só, com "nenhum ainda." e "Adicionar"', () => {
    expect(editar).toContain('nenhum ainda.');
    expect(editar).toContain('{g.quantos === 0 ? <>Adicionar<span class="so-leitor"> {g.novo.resto}</span></> : g.novo.rotulo}');
    expect(css).toMatch(/\.grupo-de-lacos--vazio > \.adicionar > summary \{\s*position: absolute;/);
  });

  it('um "Adicionar" aberto conta como um laço em edição, e "Cancelar" serve aos dois', () => {
    expect(editar).toContain("document.querySelectorAll<HTMLDetailsElement>('[data-editar], [data-adicionar]')");
    expect(editar).toContain("cancelar.closest<HTMLDetailsElement>('[data-editar], [data-adicionar]')");
  });
});

describe('a ficha num resumo', () => {
  it('chega fechada e abre no lugar, sem script também', () => {
    expect(editar).toMatch(/<details class="cartao-da-ficha" data-ficha-cartao>\s*<summary>/);
    expect(editar).toMatch(/<div class="cartao-da-ficha__campos">\s*<FichaDoIntegrante integrante=\{pessoa\} \/>/);
  });

  it('abre sozinha para quem chega por #ficha: a recusa do servidor e o aviso de ficha não salva', () => {
    expect(editar).toContain("if (location.hash === '#ficha') cartaoDaFicha.open = true;");
    expect(editar).toContain("addEventListener('hashchange', abrirFicha);");
    expect(editar).toContain("document.querySelectorAll<HTMLAnchorElement>('a[href=\"#ficha\"]')");
    expect(ler('src/pages/api/integrantes.ts')).toContain("const origem = id ? `/pessoas/${id}/editar#ficha` : '/pessoas/nova';");
  });

  it('segue a ordem do Gui: quem é, as datas juntas, o retrato, "Sobre" e a família', () => {
    const ordem = ['name="nome"', 'name="apelido"', 'name="tipo"', 'name="especie"', 'name="tratamento"', '<legend>Datas</legend>', 'prefixo="nascimento"', 'name="falecido"', 'prefixo="falecimento"', '<CampoRetrato integrante={i} />', 'name="sobre"', '<legend>Família</legend>'].map((trecho) => ficha.indexOf(trecho));
    for (const i of ordem) expect(i).toBeGreaterThan(-1);
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem);
  });

  it('no cadastro, o retrato e "Sobre" ficam recolhidos, e as datas à vista', () => {
    const recolhido = ficha.slice(ficha.indexOf('<details class="mais">'), ficha.indexOf('</details>'));
    expect(recolhido).toContain('<CampoRetrato />');
    expect(recolhido).toContain('name="sobre"');
    expect(recolhido).not.toContain('nascimento');
    expect(ficha.indexOf('prefixo="nascimento"')).toBeLessThan(ficha.indexOf('<details class="mais">'));
  });
});

// Observação do Gui na homologação (18/11/2026): o cartão da ficha não alinhava com os cartões dos laços
describe('a ficha alinha com os laços', () => {
  it('o retrato da ficha e o dos laços têm a mesma largura, e o nome cai na mesma linha', () => {
    expect(css).toMatch(/:is\(\.cartao-da-ficha > summary, \.cartao-da-ficha__linha\) \{\s*display: grid;\s*grid-template-columns: var\(--retrato-da-lista\) minmax\(0, 1fr\);/);
    expect(css).toMatch(/\.laco__quem \{\s*display: grid;\s*grid-template-columns: var\(--retrato-da-lista\) minmax\(0, 1fr\);/);
  });
  it('na tela grande, a ficha tem a largura dos grupos de laços', () => {
    expect(css).not.toMatch(/\.ficha-da-pessoa \{\s*max-width/);
  });
});
