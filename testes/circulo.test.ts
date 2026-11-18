// O círculo (docs/decisoes.md, "Círculo", decisões do Gui de 17 e 18/11/2026): as contas da
// proximidade contínua, a faixa de quem não declarou nada, o desenho em anéis, e as regras que não
// podem falhar: só o dono lê e grava o círculo dele, e só de quem ele vê.
import { describe, expect, it } from 'vitest';
import { FAIXAS, FORA_DO_CIRCULO, diametroDoAnel, distribuir, faixaDoValor, lerAngulo, lerProximidade, nivelDoValor, nomeDaProximidade, pontoDe, proximidadePadrao, raioDe, valorDoNivel, valorDoRaio } from '../src/lib/circulo';
import { Familia, type Casal, type Filiacao } from '../src/lib/parentesco';
import { TABELAS_APAGADAS } from '../src/lib/espelho';

const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('a proximidade contínua', () => {
  it('três faixas cobrem de 0 a 99, sem buraco, e 100 é fora do círculo', () => {
    expect(FAIXAS.map((f) => f.nome)).toEqual(['Muito próximo', 'Próximo', 'Conhecido']);
    for (let v = 0; v < FORA_DO_CIRCULO; v++) expect(faixaDoValor(v), String(v)).not.toBeNull();
    expect(faixaDoValor(0)!.id).toBe(1);
    expect(faixaDoValor(32)!.id).toBe(1);
    expect(faixaDoValor(33)!.id).toBe(2);
    expect(faixaDoValor(66)!.id).toBe(3);
    expect(faixaDoValor(99)!.id).toBe(3);
    expect(faixaDoValor(100)).toBeNull();
    expect(nomeDaProximidade(100)).toBe('Fora do círculo');
  });

  it('a posição é livre dentro da faixa: a mãe pode estar mais perto que o pai', () => {
    expect(faixaDoValor(8)!.id).toBe(faixaDoValor(24)!.id);
    expect(raioDe(8)).toBeLessThan(raioDe(24));
  });

  it('os três níveis antigos do laço do coração vão para o meio de cada faixa, e voltam', () => {
    expect([1, 2, 3].map(valorDoNivel)).toEqual([16, 50, 83]);
    for (const nivel of [1, 2, 3]) expect(nivelDoValor(valorDoNivel(nivel)!)).toBe(nivel);
    expect(valorDoNivel(4)).toBeNull();
    expect(nivelDoValor(100)).toBeNull();
  });

  it('só aceita inteiro de 0 a 100 e ângulo de -180 a 360', () => {
    expect(lerProximidade(0)).toBe(0);
    expect(lerProximidade('100')).toBe(100);
    for (const ruim of [101, -1, 1.5, 'abc', '', null, undefined, {}, '1e2']) expect(lerProximidade(ruim), String(ruim)).toBeNull();
    expect(lerAngulo(-33.74)).toBe(-33.7);
    expect(lerAngulo('270')).toBe(270);
    for (const ruim of [9999, -181, 'x', null, Number.NaN]) expect(lerAngulo(ruim), String(ruim)).toBeNull();
  });
});

describe('sem valor declarado, a família vem pela distância na árvore', () => {
  const filho = (f: string, ...pais: string[]): Filiacao[] => pais.map((responsavel) => ({ filho: f, responsavel, qualidade: 'biologica' }) as Filiacao);
  const casal = (a: string, b: string): Casal => ({ a, b, fases: [{ tipo: 'casamento', inicioAno: 1990 }] }) as unknown as Casal;
  const familia = new Familia(
    [...filho('mae', 'avo'), ...filho('tia', 'avo'), ...filho('eu', 'mae', 'pai'), ...filho('irma', 'mae', 'pai'), ...filho('prima', 'tia'), ...filho('sobrinho', 'irma', 'cunhado'), ...filho('filha', 'eu', 'par'), ...filho('neto', 'filha'), ...filho('bisavo-filho', 'bisavo'), ...filho('avo', 'bisavo')],
    [casal('eu', 'par'), casal('irma', 'cunhado'), casal('mae', 'pai')],
  );
  const padrao = (id: string) => proximidadePadrao({ caminho: familia.relacao('eu', id)?.caminho });

  it('pais, irmãos, filhos e casal em Muito próximo', () => {
    for (const id of ['mae', 'pai', 'irma', 'filha', 'par']) expect(faixaDoValor(padrao(id))!.nome, id).toBe('Muito próximo');
  });
  it('avós, netos, tios, sobrinhos e cunhados em Próximo', () => {
    for (const id of ['avo', 'neto', 'tia', 'sobrinho', 'cunhado']) expect(faixaDoValor(padrao(id))!.nome, id).toBe('Próximo');
  });
  it('o resto da família em Conhecido', () => {
    for (const id of ['prima', 'bisavo']) expect(faixaDoValor(padrao(id))!.nome, id).toBe('Conhecido');
    expect(faixaDoValor(proximidadePadrao({}))!.nome).toBe('Conhecido');
  });
  it('laço do coração sem proximidade entra em Próximo', () => {
    expect(faixaDoValor(proximidadePadrao({ doCoracao: true }))!.nome).toBe('Próximo');
    // Quem também é da família segue a árvore
    expect(faixaDoValor(proximidadePadrao({ caminho: 'U', doCoracao: true }))!.nome).toBe('Muito próximo');
  });
  it('cada um entra no meio da faixa', () => {
    expect(padrao('mae')).toBe(16);
    expect(padrao('avo')).toBe(50);
    expect(padrao('prima')).toBe(83);
  });
});

describe('o desenho em anéis', () => {
  it('quanto maior a proximidade, mais longe do centro, sempre dentro do círculo', () => {
    for (let v = 1; v < FORA_DO_CIRCULO; v++) expect(raioDe(v)).toBeGreaterThan(raioDe(v - 1));
    expect(raioDe(0)).toBeGreaterThan(8);
    expect(raioDe(99)).toBeLessThan(50);
  });
  it('cada anel vai até onde a faixa acaba, e o de fora é o círculo inteiro', () => {
    expect(diametroDoAnel(FAIXAS[0]!)).toBeCloseTo(raioDe(33) * 2);
    expect(diametroDoAnel(FAIXAS[1]!)).toBeCloseTo(raioDe(66) * 2);
    expect(diametroDoAnel(FAIXAS[2]!)).toBe(100);
  });
  it('arrastar devolve o mesmo valor que o slider poria ali, e além da borda é fora do círculo', () => {
    for (const v of [0, 16, 33, 50, 83, 99]) expect(valorDoRaio(raioDe(v))).toBe(v);
    expect(valorDoRaio(0)).toBe(0);
    expect(valorDoRaio(50)).toBe(99);
    expect(valorDoRaio(56)).toBe(FORA_DO_CIRCULO);
  });
  it('o ponto de alguém sai do valor e do ângulo', () => {
    expect(pontoDe(50, 0)).toEqual({ x: raioDe(50), y: 0 });
    expect(pontoDe(50, 90).x).toBeCloseTo(0);
    expect(pontoDe(50, 90).y).toBeCloseTo(raioDe(50));
  });
  it('quem não escolheu lugar se espalha pela volta, sem ninguém no alto, onde fica o nome da faixa', () => {
    const gente = Array.from({ length: 14 }, (_, i) => ({ id: `p${i}`, valor: 70 + i, angulo: null }));
    const postos = distribuir(gente);
    expect(postos).toHaveLength(14);
    expect(new Set(postos.map((p) => p.angulo)).size).toBe(14);
    for (const p of postos) expect(Math.abs(((p.angulo + 90 + 540) % 360) - 180), p.id).toBeGreaterThan(15);
    // Sempre o mesmo resultado para a mesma lista
    expect(distribuir(gente)).toEqual(postos);
  });
  it('quem foi arrastado fica onde pôs', () => {
    const postos = distribuir([{ id: 'a', valor: 20, angulo: 123.4 }, { id: 'b', valor: 21, angulo: null }]);
    expect(postos.find((p) => p.id === 'a')!.angulo).toBe(123.4);
  });
  it('quem está fora do círculo não entra no desenho', () => {
    expect(distribuir([{ id: 'a', valor: 100, angulo: null }])).toEqual([]);
  });
});

describe('o círculo é só de quem está logado', () => {
  const rota = ler('src/pages/api/circulo.ts');
  const repositorio = ler('src/lib/servidor/repositorio.ts');
  const montagem = ler('src/lib/servidor/circulo.ts');

  it('a rota só escreve como o dono, e não existe rota de leitura', () => {
    expect(rota).not.toMatch(/export const GET/);
    expect(rota).toMatch(/if \(!mesmaOrigem\(request\)\) return erro\(403/);
    // O dono é sempre quem está logado: o pedido não diz de quem é o círculo
    expect(rota.match(/usuario\.pessoa/g)!.length).toBeGreaterThanOrEqual(3);
    expect(rota).not.toMatch(/pedido\.dono|dono_id|dados\.get\('dono'\)/);
    expect(rota).toMatch(/salvarProximidade\(usuario\.pessoa, pessoa,/);
    expect(rota).toMatch(/removerProximidade\(usuario\.pessoa, pessoa\)/);
  });

  it('só grava proximidade de quem está no círculo de quem pede, e responde igual para quem não existe', () => {
    expect(rota).toMatch(/const circulo = await montarCirculo\(usuario\);/);
    expect(rota).toMatch(/const noCirculo = circulo \? \[\.\.\.circulo\.dentro, \.\.\.circulo\.fora\]\.find\(\(p\) => p\.id === pessoa\) : undefined;/);
    expect(rota).toMatch(/if \(!circulo \|\| !noCirculo\) return falhar\(404, NAO_ESTA\);/);
    expect(rota.indexOf('return falhar(404')).toBeLessThan(rota.indexOf('salvarProximidade('));
    expect(rota.indexOf('return falhar(404')).toBeLessThan(rota.indexOf('removerProximidade('));
    // O formulário da edição dos laços recebe a mesma recusa, sem dizer se a pessoa existe
    expect(rota).toMatch(/ehFormulario \? voltar\(request, volta, \{ erro: mensagem \}\) : erro\(status, mensagem\)/);
  });

  it('quem aparece é quem a pessoa vê: a montagem parte da lista dela e esconde o retrato de quem não pode', () => {
    expect(montagem).toMatch(/listarIntegrantesQueVe\(usuario\)/);
    expect(montagem).not.toMatch(/listarIntegrantes\(\)/);
    expect(montagem).toMatch(/listarProximidades\(usuario\.pessoa\)/);
    expect(montagem).toMatch(/foto: i\.retrato && !naoVe\.has\(i\.id\) \? enderecoDoRetrato\(i\.retrato\) : null/);
    // Só os laços do coração do próprio dono contam
    expect(montagem).toMatch(/todosOsLacos\.filter\(\(l\) => l\.dono === usuario\.pessoa\)/);
  });

  it('as proximidades só são lidas pelo dono, em um lugar só', () => {
    expect(repositorio).toMatch(/SELECT pessoa_id, valor, angulo FROM proximidades WHERE dono_id = \?/);
    // Fora do repositório, ninguém toca na tabela
    for (const arquivo of ['src/pages/circulo.astro', 'src/pages/api/circulo.ts', 'src/lib/servidor/circulo.ts', 'src/pages/pessoas/index.astro', 'src/pages/pessoas/[id]/index.astro'.replace(/\[/g, '%5B').replace(/\]/g, '%5D'), 'src/pages/conta.astro', 'src/pages/arvore.astro']) {
      expect(ler(arquivo), arquivo).not.toMatch(/FROM proximidades|INTO proximidades/);
    }
    const leituras = [...repositorio.matchAll(/FROM proximidades WHERE ([^`'"\n]+)/g)].map((m) => m[1]);
    expect(leituras.length).toBeGreaterThanOrEqual(2);
    for (const onde of leituras) expect(onde).toMatch(/^dono_id = \?/);
    // A página monta o círculo de quem está logado, e de mais ninguém
    expect(ler('src/pages/circulo.astro')).toMatch(/const circulo = await montarCirculo\(usuario\);/);
    expect(ler('src/pages/circulo.astro')).not.toMatch(/Astro\.params|searchParams/);
  });

  it('a migração 030 cria a tabela e leva os três níveis antigos para o meio de cada faixa', () => {
    // Lida como texto: o arquivo do banco não carrega fora do Cloudflare
    const banco = ler('src/lib/servidor/banco.ts');
    const ids = [...banco.matchAll(/^    id: '(\d{3}-[^']+)',/gm)].map((m) => m[1]);
    expect(ids).toContain('030-proximidades');
    const inicio = banco.indexOf("id: '030-proximidades'");
    const fim = banco.indexOf("    id: '", inicio + 10);
    const sql = banco.slice(inicio, fim < 0 ? undefined : fim);
    expect(sql).toMatch(/CHECK \(valor BETWEEN 0 AND 100\)/);
    expect(sql).toMatch(/PRIMARY KEY \(dono_id, pessoa_id\)/);
    expect(sql).toMatch(/CASE proximidade WHEN 1 THEN 16 WHEN 2 THEN 50 ELSE 83 END/);
    // Sem cascata: nada amarra a refação futura de integrantes
    expect(sql).not.toMatch(/REFERENCES|CASCADE|DROP TABLE/);
  });

  it('o espelho da produção não leva a proximidade de ninguém, e apaga as que houver', () => {
    expect(TABELAS_APAGADAS).toContain('proximidades');
    expect(ler('src/lib/espelho.ts')).not.toMatch(/\['proximidades'/);
  });

  it('o laço do coração e o círculo usam a mesma escala', () => {
    const lacos = ler('src/pages/api/lacos.ts');
    // O slider do laço do coração grava o valor do círculo, e a faixa antiga do laço acompanha
    expect(lacos).toMatch(/const pedida = proximidadeDoFormulario\(dados\.get\('posicao'\), dados\.get\('posicaoAntes'\), false\);/);
    expect(lacos).toMatch(/const proximidade = pedida\.mexeu \? nivelDoValor\(pedida\.valor\) :/);
    expect(lacos).toMatch(/if \(pedida\.mexeu\) await salvarProximidade\(usuario\.pessoa, pessoa\.id, pedida\.valor, null, nivelDoValor\(pedida\.valor\)\);/);
    expect(rota).toMatch(/temLaco \? nivelDoValor\(valor\) : null/);
  });
});

describe('a tela do círculo', () => {
  const pagina = ler('src/pages/circulo.astro');
  const cliente = ler('src/lib/cliente/circulo.ts');
  const css = ler('src/visual/telas/circulo.css').replace(/\/\*[\s\S]*?\*\//g, '');

  it('usa o quadro do mapa, sem rodapé, tingida na cor de quem olha', () => {
    expect(pagina).toMatch(/<Visual titulo="Seu círculo" secao="circulo" familia=\{cor\} intimo mapa>/);
    expect(pagina).toMatch(/<aside class="pm" data-sobre-o-mapa data-quadro/);
    expect(pagina.indexOf('<aside class="pm"')).toBeLessThan(pagina.indexOf('data-camada'));
  });

  it('mora no menu da conta, sem seletor segmentado, com um link discreto em Pessoas e na Árvore', () => {
    // Decisão do Gui, 17/11/2026: "O círculo sai de Pessoas"
    const topo = ler('src/layouts/Visual.astro');
    expect(topo).toMatch(/\{temPagina && <a href="\/circulo" aria-current=\{secao === 'circulo' \? 'page' : undefined\}>Seu círculo<\/a>\}/);
    const pessoas = ler('src/pages/pessoas/index.astro');
    for (const arquivo of [pagina, pessoas]) expect(arquivo).not.toMatch(/Segmentado|Por família/);
    expect(pessoas).toMatch(/\{temPagina && <a class="acao acao--quieta" href="\/circulo">Ver seu círculo<\/a>\}/);
    expect(ler('src/pages/arvore.astro')).toMatch(/\{achar\(usuario\.pessoa\) && <a class="acao acao--quieta" href="\/circulo">Ver seu círculo<\/a>\}/);
  });

  it('no slider, o rótulo, a régua e os nomes das faixas são um grupo só, longe do que vem antes', () => {
    // "Gestalt em toda tela": a peça Proximidade é um bloco, e a ficha só dá a distância até "Ver a página"
    expect(css).toMatch(/\.pm__proximidade \{[^}]*margin-top: var\(--e-5\);[^}]*padding: var\(--e-2\)/);
    expect(ler('src/visual/pecas.css')).toMatch(/\.prox input\[type='range'\] \{[^}]*height: var\(--toque\);/);
  });

  it('no celular são faixas empilhadas com a rolagem do aparelho; na tela grande, anéis com zoom', () => {
    const celular = css.slice(0, css.indexOf('@media (min-width: 40rem)'));
    expect(celular).toMatch(/\.circulo-area \{[^}]*overflow-y: auto;/);
    expect(celular).toMatch(/\.mapa--circulo \.mapa__zoom \{\s*display: none;/);
    expect(celular).toMatch(/\.mapa--circulo \{[^}]*touch-action: auto;/);
    const grande = css.slice(css.indexOf('@media (min-width: 62rem)'));
    expect(grande).toMatch(/\.mapa--circulo \.mapa__zoom \{\s*display: flex;/);
    expect(grande).toMatch(/\.circulo__faixa li \{\s*position: absolute;\s*top: calc\(50% \+ var\(--y\) \* 1%\);\s*left: calc\(50% \+ var\(--x\) \* 1%\);/);
    expect(css).not.toMatch(/position:\s*(fixed|sticky)/);
    expect(cliente).toMatch(/ativo: \(\) => emAneis\.matches,/);
    for (const botao of ['data-ver-tudo', 'data-zoom-menos', 'data-zoom-mais']) expect(pagina).toContain(botao);
  });

  it('tocar abre a ficha com o slider, que é o caminho pelo teclado', () => {
    expect(ler('src/lib/cliente/proximidade.ts')).toMatch(/type: 'range', id, min: String\(minimoDoSlider\(true\)\), max: '100', step: '1'/);
    expect(cliente).toMatch(/refletirProximidade\(ficha\.querySelector<HTMLElement>\('\[data-proximidade\]'\)!\);/);
    expect(cliente).toMatch(/abrirFicha\(botao, botao\.matches\(':focus-visible'\)\);/);
    expect(cliente).toMatch(/if \(focoNoSlider\) slider\.focus\(/);
    // Esc fecha a ficha e devolve o foco à pessoa
    expect(cliente).toMatch(/e\.key !== 'Escape' \|\| e\.defaultPrevented \|\| !aberta\) return;/);
  });

  it('arrastar muda o mesmo valor: com o mouse na hora, com o dedo depois de um toque longo', () => {
    expect(cliente).toMatch(/arrasto\.valor = valorDoRaio\(Math\.hypot\(px, py\)\);/);
    expect(cliente).toMatch(/if \(e\.pointerType === 'touch' \|\| e\.button !== 0\) return;/);
    expect(cliente).toMatch(/const TOQUE_LONGO = 350;/);
    // Antes do toque longo o gesto é de rolar: o toque começa passivo, e só o arrasto segura a página
    expect(cliente).toMatch(/'touchstart',[\s\S]*?\{ passive: true \}/);
    expect(cliente).toMatch(/if \(!arrasto \|\| !dedo\) return clearTimeout\(espera\);\s*e\.preventDefault\(\);/);
    // O slider e o arrasto passam pelo mesmo lugar
    expect(cliente.match(/por\(botao, /g)!.length).toBeGreaterThanOrEqual(4);
  });

  it('a ponta do slider é "Fora do círculo": a pessoa sai do desenho e vai para a lista, de onde volta', () => {
    expect(css).toMatch(/\.circulo__faixa li\[data-fora\] \{\s*display: none;/);
    expect(cliente).toMatch(/item\.toggleAttribute\('data-fora', valor >= FORA_DO_CIRCULO\);/);
    expect(cliente).toMatch(/textContent: 'Trazer de volta'/);
    expect(cliente).toMatch(/por\(botao, Number\(botao\.dataset\.padrao\), Number\(botao\.dataset\.anguloPadrao\)\);\s*guardar\(botao, true\);/);
    expect(pagina).toMatch(/<summary>\s*<span>Fora do círculo/);
  });

  it('quem já faleceu aparece com a marca, e o leitor de tela ouve', () => {
    expect(pagina).toMatch(/<Retrato nome=\{p\.nome\} foto=\{p\.foto\} familia=\{p\.cor\} falecido=\{p\.falecido\} \/>/);
    expect(pagina).toMatch(/\{p\.falecido && <span class="so-leitor">já faleceu<\/span>\}/);
    expect(ler('src/lib/servidor/circulo.ts')).toMatch(/falecido: jaFaleceu\(i\),/);
  });

  it('quando não dá para guardar, a pessoa fica sabendo', () => {
    expect(pagina).toMatch(/<p class="pm__aviso" data-aviso role="alert" hidden><\/p>/);
    expect(cliente).toMatch(/if \(!resposta\.ok\) throw new Error/);
    expect(cliente).toMatch(/avisar\(`Não deu para guardar o lugar de \$\{botao\.dataset\.nome\}/);
  });
});
