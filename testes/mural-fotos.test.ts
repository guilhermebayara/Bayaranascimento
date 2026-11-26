// Mural de fotos: só as capas ou todas as fotos (pedido do Gui, 18/11/2026, docs/regras/explorar.md, "Explorar").
// A regra está em src/lib/explorar.ts; o desenho, em src/components/explorar/Mural.astro.
import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { enderecoDoExplorar, FOTOS_DO_MURAL, fotosDoMuralNoEndereco, itensDoMural, lerFotosDoMural, SEM_FILTRO, tamanhoNoEndereco } from '../src/lib/explorar';
import { enderecoDaVida } from '../src/lib/pagina-da-pessoa';
import { enderecoDoCapitulo } from '../src/lib/capitulos';

const foto = (chave: string) => ({ chave, legenda: null });
const memorias = [
  { id: 'a', fotos: [foto('a1'), foto('a2'), foto('a3')] },
  { id: 'sem-foto', fotos: [] },
  { id: 'b', fotos: [foto('b1')] },
];

describe('quais fotos o mural mostra', () => {
  it('as capas são o padrão, e qualquer outro valor volta a elas', () => {
    expect(FOTOS_DO_MURAL).toEqual(['capas', 'todas']);
    expect(lerFotosDoMural(new URLSearchParams(''))).toBe('capas');
    expect(lerFotosDoMural(new URLSearchParams('fotos=tudo'))).toBe('capas');
    expect(lerFotosDoMural(new URLSearchParams('fotos=todas'))).toBe('todas');
  });

  it('a escolha vai no endereço, menos o padrão, e convive com o tamanho', () => {
    expect(enderecoDoExplorar(SEM_FILTRO, 'mural', fotosDoMuralNoEndereco('capas'))).toBe('/explorar?ver=mural');
    expect(enderecoDoExplorar(SEM_FILTRO, 'mural', fotosDoMuralNoEndereco('todas'))).toBe('/explorar?ver=mural&fotos=todas');
    const junto = enderecoDoExplorar(SEM_FILTRO, 'mural', { ...tamanhoNoEndereco('grandes'), ...fotosDoMuralNoEndereco('todas') });
    expect(lerFotosDoMural(new URLSearchParams(junto.split('?')[1]))).toBe('todas');
  });

  it('as páginas da pessoa e do capítulo levam a escolha no endereço', () => {
    expect(enderecoDaVida('gui', 'mural')).toBe('/pessoas/gui?ver=mural');
    expect(enderecoDaVida('gui', 'mural', fotosDoMuralNoEndereco('todas'))).toBe('/pessoas/gui?ver=mural&fotos=todas');
    expect(enderecoDaVida('gui')).toBe('/pessoas/gui');
    expect(enderecoDoCapitulo('natais', 'mural', fotosDoMuralNoEndereco('todas'))).toBe('/capitulos/natais?ver=mural&fotos=todas');
    expect(enderecoDoCapitulo('natais')).toBe('/capitulos/natais');
  });

  it('só as capas: um item por memória, e a sem foto entra como cartão', () => {
    const itens = itensDoMural(memorias, 'capas');
    expect(itens.map((i) => [i.m.id, i.foto?.chave, i.n])).toEqual([
      ['a', 'a1', 0],
      ['sem-foto', undefined, 0],
      ['b', 'b1', 0],
    ]);
  });

  it('todas as fotos: as outras vêm logo depois da capa, na ordem da memória', () => {
    const itens = itensDoMural(memorias, 'todas');
    expect(itens.map((i) => [i.m.id, i.foto?.chave, i.n])).toEqual([
      ['a', 'a1', 0],
      ['a', 'a2', 1],
      ['a', 'a3', 2],
      ['sem-foto', undefined, 0],
      ['b', 'b1', 0],
    ]);
  });

  it('em todas as fotos, as capas são as mesmas de só as capas', () => {
    const capas = itensDoMural(memorias, 'capas').map((i) => i.foto?.chave);
    const capasDeTodas = itensDoMural(memorias, 'todas').filter((i) => i.n === 0).map((i) => i.foto?.chave);
    expect(capasDeTodas).toEqual(capas);
  });
});

describe('todo mural do site tem a escolha', () => {
  const ler = (caminho: string) => readFileSync(caminho, 'utf8');
  const paginas = ['src/pages/explorar.astro', 'src/pages/pessoas/[id]/index.astro', 'src/pages/capitulos/[id]/index.astro', 'src/pages/temas/[id].astro'];

  it.each(paginas)('%s passa a escolha ao mural', (pagina) => {
    const fonte = ler(pagina);
    expect(fonte).toMatch(/<Mural [^>]*fotos=\{fotosDoMural\}/);
    expect(fonte).toContain('lerFotosDoMural');
  });

  it.each(paginas.slice(1))('%s mostra o seletor das fotos só no mural', (pagina) => {
    expect(ler(pagina)).toMatch(/forma === 'mural' && <QuaisFotos/);
  });

  it('no Explorar, o seletor fica nos controles do mural, e os filtros levam a escolha junto', () => {
    const controles = ler('src/components/explorar/Controles.astro');
    expect(controles).toContain('<QuaisFotos');
    expect(controles).toContain('name="fotos"');
  });

  it('uma página nova com mural não passa sem a escolha', () => {
    // Qualquer arquivo que desenha o <Mural> precisa passar `fotos`, para o seletor valer lá também
    const arquivos = globSync('src/**/*.astro').filter((a: string) => /<Mural\s/.test(ler(a)));
    expect(arquivos.length).toBeGreaterThanOrEqual(4);
    for (const a of arquivos) expect(ler(a), a).toMatch(/<Mural [^>]*fotos=/);
  });

  it('as fotos a mais ficam fora da âncora da troca e sem aba de ano', () => {
    const mural = ler('src/components/explorar/Mural.astro');
    expect(mural).toContain("`f:${m.id}:${n}`");
    expect(mural).toMatch(/abreAno: n === 0/);
    expect(mural).toMatch(/abreDecada: n === 0/);
  });
});
