// Compartilhar uma memória como imagem (onda 2, decisão do Gui de 17/11/2026): só gera quem vê a memória
// publicada; memória só de algumas famílias pede um aviso antes, e a imagem só é montada depois do sim.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TAMANHO_DA_IMAGEM, avisoAntesDeCompartilhar, escolhaDoNome, escolhaDoNomeAparece, nomeDoArquivo, nomeNaImagem, trechoDoRelato } from '../src/lib/compartilhar';

describe('compartilhar como imagem', () => {
  it('é vertical, na proporção dos stories', () => {
    expect(TAMANHO_DA_IMAGEM.altura / TAMANHO_DA_IMAGEM.largura).toBeCloseTo(16 / 9);
  });
  it('o aviso vem só para memória restrita a famílias', () => {
    expect(avisoAntesDeCompartilhar('nucleos', ['Bracarense'])).toBe('Esta memória é só da família Bracarense. Quem receber a imagem vai ver.');
    expect(avisoAntesDeCompartilhar('nucleos', ['Bayara', 'Bracarense'])).toBe('Esta memória é só das famílias Bayara e Bracarense. Quem receber a imagem vai ver.');
    expect(avisoAntesDeCompartilhar('todos', ['Bracarense'])).toBeNull();
  });
  it('o trecho é curto e corta numa palavra', () => {
    const longo = 'A gente chegou cedo e a mesa já estava posta, com o pão de queijo da Vó Bela ainda quente. '.repeat(5);
    const t = trechoDoRelato(longo, 80);
    expect(t.length).toBeLessThanOrEqual(81);
    expect(t.endsWith('…')).toBe(true);
    expect(trechoDoRelato('Curto.')).toBe('Curto.');
  });
  it('o arquivo tem o nome da memória, sem acento', () => {
    expect(nomeDoArquivo('Natal de 2025, na casa da Vó')).toBe('memoria-natal-de-2025-na-casa-da-vo.png');
  });
  it('a página só monta a imagem de quem vê a memória publicada, e só depois do sim quando é restrita', () => {
    const pagina = readFileSync('src/pages/memorias/[id]/compartilhar.astro', 'utf-8');
    expect(pagina).toContain('const memoria = await obterMemoria(usuario,');
    expect(pagina).toMatch(/memoria\.situacao !== 'publicada'\) return new Response\('Memória não encontrada', \{ status: 404 \}\)/);
    expect(pagina).toMatch(/const confirmado = !aviso \|\| Astro\.url\.searchParams\.get\('confirmado'\) === '1';/);
    // Antes do sim, nenhum dado da imagem vai para a página
    expect(pagina).toMatch(/const dados: DadosDaImagem \| null = confirmado/);
    // O trecho só vem de relato que a pessoa vê, e o retrato de quem contou, só de quem ela vê
    expect(pagina).toContain('listarRelatos(usuario, memoria.id)');
    expect(pagina).toContain('retrato: quem?.retrato && !naoVe.has(r.por) ? enderecoDoRetrato(quem.retrato) : null,');
  });
});

// Observação do Gui (18/11/2026): o nome de quem contou passava por cima da assinatura. A assinatura sai, o
// monograma entra como marca d'água leve, e o trecho perde linhas antes de chegar à margem de baixo.
describe('a imagem depois da observação do Gui', async () => {
  const { linhasQueCabem } = await import('../src/lib/cliente/compartilhar');
  const desenho = readFileSync('src/lib/cliente/compartilhar.ts', 'utf-8');
  it('sem a assinatura com o nome do site, e com o monograma leve, atrás', () => {
    expect(desenho).not.toContain('d.assinatura');
    expect(desenho).toContain('ctx.globalAlpha = 0.07;');
    expect(desenho.indexOf('new Path2D(m.d)')).toBeLessThan(desenho.indexOf('A foto revelada'));
    expect(readFileSync('src/pages/memorias/[id]/compartilhar.astro', 'utf-8')).toContain('monograma: MONOGRAMAS[FONTES_DO_SITE.serifa].normal');
  });
  it('o trecho e o nome de quem contou nunca passam da margem de baixo', () => {
    const [A, margem, linha, nome] = [1920, 96, 54, 90];
    for (let y = 1300; y <= 1820; y += 10) {
      const n = linhasQueCabem(y, A - margem, linha, nome);
      expect(n).toBeLessThanOrEqual(4);
      if (n > 0) expect(y + n * linha + 16).toBeLessThanOrEqual(A - margem);
    }
    expect(linhasQueCabem(1300, 1824, 54, 90)).toBe(4);
  });
});

// Qual nome vai na imagem (decisão do Gui, 18/11/2026, depois da sessão H): o da família é o padrão,
// porque o apelido próprio é privado e a imagem sai do acervo
describe('o nome na imagem de compartilhar', () => {
  const elizete = { nome: 'Elizete', apelidoDaFamilia: 'Zete', meuApelido: 'Mãezinha' };
  const semApelidoDaFamilia = { nome: 'Aguilar', apelidoDaFamilia: null, meuApelido: 'Pai' };
  const semOMeu = { nome: 'Vó Bela', apelidoDaFamilia: null, meuApelido: null };
  it('o da família: o apelido da família, senão o nome; o seu: o seu apelido, senão o da família', () => {
    expect(nomeNaImagem(elizete, 'familia')).toBe('Zete');
    expect(nomeNaImagem(elizete, 'meu')).toBe('Mãezinha');
    expect(nomeNaImagem(semApelidoDaFamilia, 'familia')).toBe('Aguilar');
    expect(nomeNaImagem(semApelidoDaFamilia, 'meu')).toBe('Pai');
    expect(nomeNaImagem(semOMeu, 'meu')).toBe('Vó Bela');
  });
  it('o padrão nunca vaza o apelido próprio', () => {
    for (const p of [elizete, semApelidoDaFamilia, semOMeu]) expect(nomeNaImagem(p, escolhaDoNome(undefined))).not.toBe(p.meuApelido);
    expect(escolhaDoNome(null)).toBe('familia');
    expect(escolhaDoNome('qualquer')).toBe('familia');
    expect(escolhaDoNome('meu')).toBe('meu');
  });
  it('a escolha só aparece quando muda algo', () => {
    expect(escolhaDoNomeAparece([elizete])).toBe(true);
    expect(escolhaDoNomeAparece([semOMeu])).toBe(false);
    expect(escolhaDoNomeAparece([])).toBe(false);
    // O apelido próprio igual ao da família não muda nada
    expect(escolhaDoNomeAparece([{ nome: 'Elizete', apelidoDaFamilia: 'Zete', meuApelido: 'Zete' }])).toBe(false);
  });
  it('a página monta a imagem com o nome da família e só leva o seu apelido quando ele muda algo', () => {
    const pagina = readFileSync('src/pages/memorias/[id]/compartilhar.astro', 'utf-8');
    expect(pagina).toContain("const daFamilia = nomeNaImagem(nomesDe(r.por), 'familia');");
    expect(pagina).toContain('comOSeuApelido: meu !== daFamilia ? meu : null,');
    // `apelido` viria trocado pelo de quem olha: os dois nomes vêm de fontes separadas
    expect(pagina).toContain('apelidoDaFamilia: i?.apelidoDaFamilia ?? null, meuApelido: meusApelidos.get(id) ?? null');
    expect(pagina).not.toMatch(/\.apelido \?\?/);
    expect(pagina).toContain('<input type="radio" name="nomeNaImagem" value="familia" checked />');
  });
});

// O espaço de personalizar (proposta A do conceito da sessão J, escolha do Gui de 18/11/2026): a imagem num
// palco de tamanho fixo e uma bandeja com abas. Escolher não muda o tamanho de nada.
describe('o espaço de personalizar a imagem', async () => {
  const { abasDoEstudio, autorNaImagem } = await import('../src/lib/compartilhar');
  const { quadroDaImagem } = await import('../src/lib/cliente/compartilhar');
  const relato = (r: Partial<import('../src/lib/compartilhar').RelatoDaImagem> = {}) => ({ autor: 'Vó Bela', comOSeuApelido: null, trecho: 'Era domingo.', retrato: null, faleceu: false, ...r });
  const monograma = { d: '', largura: 100, altura: 100 };
  const dados = { titulo: 'Natal', data: '2025', lugar: null, fotos: ['/fotos/a', '/fotos/b'], relatos: [relato({ comOSeuApelido: 'Belinha' }), relato({ autor: 'Vô Tonho', retrato: '/retratos/x', faleceu: true })], monograma };
  const padrao = { nome: 'familia', cores: 'papel', foto: 0, relato: 0, emMemoria: false } as const;

  it('só aparecem as abas que têm o que escolher, e as cores sempre', () => {
    expect(abasDoEstudio([relato()], 1)).toEqual(['cores']);
    expect(abasDoEstudio([relato(), relato()], 3)).toEqual(['cores', 'foto', 'relato']);
    expect(abasDoEstudio([relato({ comOSeuApelido: 'Belinha' })], 1)).toEqual(['nome', 'cores']);
    // Quem contou já faleceu e tem retrato: a aba do nome aparece, com a opção "em memória"
    expect(abasDoEstudio([relato({ faleceu: true, retrato: '/retratos/x' })], 1)).toEqual(['nome', 'cores']);
    expect(abasDoEstudio([relato({ faleceu: true })], 1)).toEqual(['cores']);
    expect(abasDoEstudio([], 0)).toEqual(['cores']);
  });

  it('o padrão é a foto principal, o primeiro relato, o nome da família e o retrato em cor', () => {
    const quadro = quadroDaImagem(dados, padrao, null);
    expect(quadro).toMatchObject({ foto: '/fotos/a', trecho: 'Era domingo.', autorDoTrecho: 'Vó Bela', emMemoria: false, cores: null });
    expect(autorNaImagem(dados.relatos[0]!, 'meu')).toBe('Belinha');
    expect(autorNaImagem(dados.relatos[1]!, 'meu')).toBe('Vô Tonho');
  });

  it('"em memória" é opção de quem compartilha, e só vale para quem já faleceu (resposta do Gui, 18/11/2026)', () => {
    expect(quadroDaImagem(dados, { ...padrao, relato: 1 }, null)).toMatchObject({ autorDoTrecho: 'Vô Tonho', retrato: '/retratos/x', emMemoria: false });
    expect(quadroDaImagem(dados, { ...padrao, relato: 1, emMemoria: true }, null).emMemoria).toBe(true);
    expect(quadroDaImagem(dados, { ...padrao, relato: 0, emMemoria: true }, null).emMemoria).toBe(false);
    const pagina = readFileSync('src/pages/memorias/[id]/compartilhar.astro', 'utf-8');
    expect(pagina).toMatch(/<label class="marcar-na-imagem" data-em-memoria hidden=\{!\(primeiro\?\.faleceu && primeiro\.retrato\)\}>\s*<input type="checkbox" name="emMemoria" \/>/);
  });

  it('as escolhas trocam a foto, o relato, o nome e as cores, e uma escolha fora da lista cai no padrão', () => {
    const cores = { papel: 'a', vivo: 'b', suave: 'c' };
    expect(quadroDaImagem(dados, { ...padrao, nome: 'meu', foto: 1 }, cores)).toMatchObject({ foto: '/fotos/b', autorDoTrecho: 'Belinha', cores });
    expect(quadroDaImagem(dados, { ...padrao, foto: 9, relato: 9 }, null)).toMatchObject({ foto: '/fotos/a', autorDoTrecho: 'Vó Bela' });
    expect(quadroDaImagem({ ...dados, fotos: [], relatos: [] }, padrao, null)).toMatchObject({ foto: null, trecho: null, autorDoTrecho: null, retrato: null });
  });

  it('a bandeja tem um painel de altura fixa por aba, e o palco guarda o lugar da imagem', () => {
    const css = readFileSync('src/visual/telas/formulario.css', 'utf-8');
    expect(css).toMatch(/\.pagina-de-formulario \.bandeja__painel \{\s*height: 13rem;\s*overflow: auto;/);
    expect(css).toMatch(/\.pagina-de-formulario \.estudio__palco \{[^}]*min-height: calc\(min\(46svh, 30rem\) \+ 2 \* var\(--e-4\)\);/);
    const pagina = readFileSync('src/pages/memorias/[id]/compartilhar.astro', 'utf-8');
    expect(pagina).toContain('nome="abaDaImagem"');
    for (const painel of ['nome', 'cores', 'foto', 'relato']) expect(pagina).toContain(`data-painel="${painel}"`);
    // A frase que mudava de tamanho com a escolha saiu
    expect(pagina).not.toContain('data-frase-do-nome');
  });

  it('na imagem, o retrato de quem contou é de foto de álbum, com as quatro cantoneiras', () => {
    const desenho = readFileSync('src/lib/cliente/compartilhar.ts', 'utf-8');
    expect(desenho).toMatch(/const RETRATO = \{ largura: 132, altura: 165,/);
    expect(desenho).toContain('desenharRetrato(ctx, retrato, margem, topo, d.emMemoria, tinta);');
    // O pé mais alto entra na conta das linhas do trecho: nada passa por cima de nada
    expect(desenho).toContain('const espacoDoNome = !d.autorDoTrecho ? 0 : retrato ? RETRATO.altura + 40 : 90;');
  });
});

describe('sem script (QA de 23/11/2026)', () => {
  it('"Montando a imagem…" e a bandeja somem, e fica a explicação de que precisa de JavaScript', () => {
    const pagina = readFileSync('src/pages/memorias/[id]/compartilhar.astro', 'utf8');
    expect(pagina).toMatch(/<p class="dica" data-estado data-so-com-script>\s*Montando a imagem…/);
    expect(pagina).toContain('<div class="bandeja" data-bandeja data-so-com-script>');
    expect(pagina).toMatch(/<noscript>\s*<p class="dica">Para montar a imagem, o navegador precisa estar com o JavaScript ligado\.<\/p>/);
    // A regra que esconde [data-so-com-script] sem script é a do esqueleto dos formulários
    expect(readFileSync('src/components/formularios/Pagina.astro', 'utf8')).toContain('[data-so-com-script]');
  });
});
