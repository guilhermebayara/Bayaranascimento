// Regras que nasceram das respostas do Gui às perguntas novas da rodada de 17/11/2026
// (docs/qa/2026-11-17-perguntas-novas.md, tabela "Respostas do Gui"), e o Esc da P131.
import { describe, expect, it } from 'vitest';
import { NOMES_DAS_FORMAS_DO_CAPITULO, detalheDoCruzamento } from '../src/lib/capitulos';
import { veORelato } from '../src/lib/servidor/permissoes';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url), 'utf8');

describe('Início e carta', () => {
  it('44-N7: a carta saúda com o mesmo nome do painel', () => {
    const inicio = ler('src/pages/index.astro');
    expect(inicio).toContain('<Carta para={usuario.nome}');
    expect(ler('src/pages/carta.astro')).toContain('<Carta para={usuario.nome}');
    // O painel diz "Oi, {usuario.nome}."
    expect(inicio).toMatch(/Oi,\{' '\}\s*<span class="sublinhado">\s*\{usuario\.nome\}/);
    for (const arquivo of ['src/pages/index.astro', 'src/pages/carta.astro']) expect(ler(arquivo), arquivo).not.toContain('<Carta para={eu.apelido');
  });
});

describe('memória', () => {
  const memoria = ler('src/pages/memorias/[id].astro');
  it('45-N8: com o relato em rascunho, a linha avisa e o botão continua o relato', () => {
    expect(memoria).toContain("const meuRelatoEmRascunho = meuRelato?.situacao === 'rascunho';");
    expect(memoria).toContain("meuRelatoEmRascunho ? 'Continuar meu relato'");
    expect(memoria).toContain("{meuRelatoEmRascunho ? 'Seu relato está em rascunho.' : 'Você já contou esse dia.'}");
  });
});

describe('capítulos', () => {
  it('46-N7: a primeira forma de ver se chama "Linha do tempo", como na página da pessoa', () => {
    expect(NOMES_DAS_FORMAS_DO_CAPITULO.marcos).toBe('Linha do tempo');
  });
  it('46-N9: em "Aconteceu neste período", a marca vai em "em parte"', () => {
    expect(detalheDoCruzamento('parte')).toBe('em parte neste período');
    expect(detalheDoCruzamento('inteiro')).toBeUndefined();
  });
  it('46-N11: excluir capítulo diz quem restaura na forma da memória', () => {
    const excluir = ler('src/pages/capitulos/[id]/excluir.astro');
    expect(excluir).toContain('voceOuOsOutrosAdmins(usuario.pessoa');
    expect(excluir).not.toContain('outrosAdmins(usuario.pessoa');
    expect(excluir).toContain("{quemRestaura} {quemRestaura === 'você' ? 'pode' : 'podem'} restaurar como estava.");
  });
});

describe('laços', () => {
  const editar = ler('src/pages/pessoas/[id]/editar.astro');
  const css = ler('src/visual/telas/formulario.css');
  it('47-N2: a zona de perigo de cada laço diz o que acontece, e a do casal fala do casal', () => {
    expect(editar).toContain("const FRASE_DO_LACO = 'O laço some da árvore e das páginas das duas pessoas. Não vai para a lixeira.';");
    expect(editar).toContain("const FRASE_DO_CASAL = 'O casal some da árvore e das páginas das duas pessoas. Não vai para a lixeira.';");
    // Toda zona de laço começa pela frase
    const zonas = editar.split('<ZonaDePerigo menor nivel={4}>').slice(1);
    expect(zonas.length).toBe(6);
    for (const zona of zonas) {
      const dentro = zona.slice(0, zona.indexOf('</ZonaDePerigo>'));
      const frase = dentro.includes('casal-remover') ? '{FRASE_DO_CASAL}' : '{FRASE_DO_LACO}';
      expect(dentro.trimStart().startsWith(`<p>${frase}</p>`)).toBe(true);
    }
  });
  // Revisto pelo Gui em 18/11/2026: a primeira fase do cadastro é PrimeiraFase.astro, no seletor segmentado
  it('47-N3: "Como estão hoje?" no "Adicionar laço" completo só oferece as fases de estar junto', () => {
    expect(editar.match(/<PrimeiraFase id="(guia|novo)" \/>/g)?.length).toBe(2);
    const primeira = ler('src/components/formularios/PrimeiraFase.astro');
    expect(primeira).toContain("{ valor: 'namoro', texto: 'Namoro' },");
    expect(primeira).not.toMatch(/valor: '(separacao|amizade)'/);
  });
  // A decisão seguinte ("Adicionar outro laço" como ação) ficou resolvida pela proposta A da sessão E:
  // o adicionar mora em cada grupo, como ação de texto, e não há mais um título "Adicionar outro laço"
  it('47-N11 e a decisão seguinte: adicionar é uma ação de texto dentro de cada grupo, sem parecer título', () => {
    expect(editar).not.toContain('Adicionar outro laço\' : \'Adicionar laço\'');
    expect(editar).toContain('<details class="adicionar" data-adicionar>');
    expect(editar).toMatch(/<summary class="acao">\{g\.quantos === 0 \?/);
  });
  it('P131: Esc fecha a confirmação de remover, como "Cancelar", sem fechar o editor do laço', () => {
    const confirmar = ler('src/components/ConfirmarRemocao.astro');
    expect(confirmar).toMatch(/if \(evento\.key !== 'Escape' \|\| !caixa\.open\) return;\s*evento\.preventDefault\(\);\s*evento\.stopPropagation\(\);\s*fechar\(\);/);
    expect(confirmar).toMatch(/const fechar = \(\) => \{\s*caixa\.open = false;\s*caixa\.querySelector\('summary'\)\?\.focus\(\);/);
  });
});

describe('formulários', () => {
  it('47-N6: Enter na busca de pessoa nunca envia o formulário', () => {
    const busca = ler('src/lib/cliente/busca-pessoa.ts');
    expect(busca).toMatch(/\} else if \(e\.key === 'Enter'\) \{\s*(\/\/[^\n]*\n\s*)*e\.preventDefault\(\);/);
  });
});

describe('relato em nome de quem só existe num laço privado', () => {
  // O teste com o banco está em testes/visibilidade-banco.test.ts
  const naoVe = new Set(['amiga-secreta']);
  it('some para quem não vê a pessoa', () => {
    expect(veORelato({ por: 'amiga-secreta', registradoPor: 'gui' }, { pessoa: 'elizete' }, naoVe)).toBe(false);
  });
  it('quem registrou continua vendo', () => {
    expect(veORelato({ por: 'amiga-secreta', registradoPor: 'elizete' }, { pessoa: 'elizete' }, naoVe)).toBe(true);
  });
  it('o relato de quem a pessoa vê não muda', () => {
    expect(veORelato({ por: 'gui', registradoPor: 'gui' }, { pessoa: 'elizete' }, naoVe)).toBe(true);
  });
  it('as consultas que mostram ou contam relatos passam pela regra', () => {
    const repositorio = ler('src/lib/servidor/repositorio.ts');
    for (const consulta of ['completar', 'memoriasComAudio', 'quemContouEmCadaMemoria', 'listarRelatos', 'podeOuvirAudio', 'listarAudiosDe', 'listarRelatosPublicadosDesde']) {
      const inicio = repositorio.search(new RegExp(`(export )?async function ${consulta}\\(`));
      expect(inicio, consulta).toBeGreaterThan(-1);
      const corpo = repositorio.slice(inicio, repositorio.indexOf('\n}\n', inicio));
      expect(corpo, consulta).toContain('veORelato(');
    }
  });
});
