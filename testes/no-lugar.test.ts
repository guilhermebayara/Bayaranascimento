// Interação sem recarregar a página (premissa do Gui de 18/11/2026, docs/visual.md): os formulários do dia
// a dia trocam só o que mudou, no lugar, e sem script continuam formulários comuns, que recarregam.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const arquivos = (pasta: string): string[] =>
  readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : /\.(astro|ts)$/.test(nome) ? [caminho] : [];
  });
const fontes = arquivos('src').map((caminho) => ({ caminho, texto: readFileSync(caminho, 'utf-8') }));
const cliente = readFileSync('src/lib/cliente/no-lugar.ts', 'utf-8');

describe('formulários no lugar', () => {
  // As regiões com nome fixo; os nomes montados com o id (liberar-12, avisos-conta) são conferidos à parte
  const pedidas = fontes.flatMap(({ caminho, texto }) =>
    [...texto.matchAll(/data-no-lugar="([^"]+)"/g)].flatMap((m) => m[1]!.split(/\s+/).map((regiao) => ({ caminho, regiao }))),
  );
  const existentes = new Set(fontes.flatMap(({ texto }) => [...texto.matchAll(/data-regiao="([^"]+)"/g)].map((m) => m[1]!)));

  it('as interações do dia a dia passam pelo script', () => {
    const usos = fontes.filter(({ texto }) => texto.includes('data-no-lugar')).map(({ caminho }) => caminho.replace(/\\/g, '/'));
    for (const esperado of ['src/components/Avisos.astro', 'src/pages/memorias/[id].astro', 'src/pages/memorias/[id]/sugestoes.astro', 'src/pages/admin/duplicados/index.astro']) {
      expect(usos).toContain(esperado);
    }
  });
  it('toda região com nome fixo pedida por um formulário existe numa página', () => {
    expect(pedidas.length).toBeGreaterThan(2);
    for (const { caminho, regiao } of pedidas) expect(existentes.has(regiao), `${caminho}: ${regiao}`).toBe(true);
  });
  it('o número do retrato acompanha: o summary do menu da conta é uma região', () => {
    expect(readFileSync('src/layouts/Visual.astro', 'utf-8')).toContain('data-regiao="retrato"');
  });
  it('o esqueleto liga os formulários no lugar em toda página', () => {
    expect(readFileSync('src/layouts/Visual.astro', 'utf-8')).toContain('ligarNoLugar();');
  });
  it('sem script é o formulário comum; com o script falhando, também', () => {
    expect(cliente).toContain('evento.preventDefault();');
    expect(cliente).toContain('form.submit();');
    // Depois de trocar, as regiões novas são ligadas de novo e o recado é dito ao leitor de tela
    expect(cliente).toContain('ligarReacoes(regiao);');
    expect(cliente).toContain("anunciar(erro ?? ok ?? 'Pronto.');");
  });
  it('o recado de erro fica à vista também quando a troca leva o formulário embora (W3, revisão Y2 do PR #160)', () => {
    // A resposta recusada ao pedido para liberar volta com o pedido de agora: o recado vai para o mesmo formulário na página nova
    expect(cliente).toContain('form[data-chave="${CSS.escape(chave)}"]');
    expect(readFileSync('src/components/Avisos.astro', 'utf-8')).toContain('data-chave={`aviso-${a.id}`}');
    expect(readFileSync('src/pages/memorias/[id].astro', 'utf-8')).toContain('data-chave={`liberar-${relato.id}`}');
  });
  it('os dois formulários de resposta ao pedido mandam o público lido, e a linha do relato diz para quem libera (W3)', () => {
    const memoria = readFileSync('src/pages/memorias/[id].astro', 'utf-8');
    expect(readFileSync('src/components/Avisos.astro', 'utf-8')).toContain('name="publico" value={chaveDoPublico(a.publico)}');
    expect(memoria).toContain('name="publico" value={chaveDoPublico(memoria)}');
    expect(memoria).toMatch(/Liberar para \{paraQuemPassouAVer\(comoPublicoAntigo\(relato\.publicoConhecido \?\? relato\.soParaNucleos\), memoria, nucleos\)\}/);
  });
  it('a região não muda o desenho', () => {
    expect(readFileSync('src/visual/base.css', 'utf-8')).toMatch(/\.regiao \{\s*display: contents;/);
  });
});

// A região (.regiao) não tem caixa, mas continua na marcação: um seletor de filho (">") olha a marcação,
// e não as caixas. No cartão de avisos da conta, `.conta__grade > .avisos--conta` nunca valia, e o cartão
// ficava numa coluna só da grade (observação do Gui, 18/11/2026). A regra: nenhuma folha de estilo pega
// por ">" o primeiro elemento de dentro de uma região sem passar pela região.
describe('o que está dentro de uma região', () => {
  const css = [...readdirSync('src/visual/telas').map((n) => join('src/visual/telas', n)), 'src/visual/pecas.css', 'src/visual/estrutura.css'].map((c) => readFileSync(c, 'utf-8')).join('\n');
  // As classes do primeiro elemento de dentro de cada <div class="regiao">
  const deDentro = new Set(
    fontes.flatMap(({ texto }) =>
      [...texto.matchAll(/<div class="regiao"[^>]*>\s*(?:\{[^<]*)?<(\w+)\s[^>]*?class(?::list)?=\{?\[?['"`]?([\w-]+)/g)].map((m) => m[2]!),
    ),
  );
  it('acha as regiões que embrulham um elemento com classe', () => {
    expect(deDentro.has('avisos')).toBe(true);
  });
  it('nenhum seletor de filho pula a região', () => {
    for (const classe of deDentro) {
      const pulando = new RegExp(`(?<!\\.regiao\\s*)>\\s*(?::is\\([^)]*)?\\.${classe}(?:--[\\w-]+)?\\b`);
      expect(css, classe).not.toMatch(pulando);
    }
  });
});
