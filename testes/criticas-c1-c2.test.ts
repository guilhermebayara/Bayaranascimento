// Os pontos pequenos das críticas de design C1 e C2 (respostas do Gui de 22/11/2026, sessão AA). As regras
// puras têm teste próprio (o "Neste dia" no Natal em testes/painel.test.ts, a ordem do Início em
// testes/qa-respostas-inicio.test.ts); aqui ficam as que moram nas telas.
import { describe, expect, it } from 'vitest';
import { fraseDoRascunho } from '../src/lib/conta';

// O projeto não tem os tipos do Node: o módulo entra assim para o tsc não acusar o import (como em apoio/d1.ts)
const NODE_FS = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ NODE_FS)) as { readFileSync: (caminho: URL, codificacao: string) => string };
/** O arquivo de src/, lido do disco (o CSS que o Vite importa chega vazio) */
const tela = (caminho: string): string => readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8');

describe('críticas C1 e C2: os pontos pequenos', () => {
  it('a carta: a legenda de cada foto traz o título da memória, além do lugar e do ano', () => {
    expect(tela('components/Carta.astro')).toMatch(/<Polaroid id=\{m\.id\}[^>]*titulo=\{m\.titulo\}[^>]*legenda=\{legendaLugarAno\(m\.lugar, m\.ano\)\}/);
    const polaroid = tela('components/visual/Polaroid.astro');
    // As duas formas da polaroid (com e sem foto) escrevem o título acima de lugar e ano
    expect(polaroid.match(/\{titulo && <span class="polaroid__titulo">\{titulo\}<\/span>\}\s*\{legenda\}/g)).toHaveLength(2);
    expect(tela('visual/pecas.css')).toMatch(/\.polaroid__titulo\s*\{[^}]*text-transform:\s*none/);
  });

  it('Explorar no celular: as saídas ficam à vista numa linha própria, fora da fila das abas que rola', () => {
    const css = tela('visual/telas/explorar.css');
    const celular = css.slice(css.indexOf('@media (max-width: 61.99rem) {\n  .controles__formas {'));
    const bloco = celular.slice(0, celular.indexOf('\n}\n'));
    // O fio fica embaixo das abas, e só as abas rolam; as saídas ocupam a linha delas, uma linha só
    expect(bloco).toMatch(/\.controles__formas \.controle__linha \{[^}]*flex-wrap: wrap[^}]*overflow: visible/);
    expect(bloco).toMatch(/\.controles__formas \.abas \{[^}]*flex: 1 0 100%[^}]*border-bottom[^}]*overflow-x: auto/);
    expect(bloco).toMatch(/\.controles__formas \.controle__saidas \{[^}]*flex: 1 0 100%/);
    // Sem a segunda linha do esboço (escolha do Gui na E2): as saídas continuam só com o nome
    expect(tela('components/explorar/Controles.astro')).toMatch(/<a class="acao acao--quieta saida" href=\{enderecoDoExplorar\(filtros, f\)\}>\s*\{NOMES_DAS_FORMAS\[f\]\}\s*<\/a>/);
  });

  it('Explorar: no filtro "Quem estava junto", cada nome traz o parentesco de quem olha', () => {
    const pagina = tela('pages/explorar.astro');
    // O modo TV não mostra os filtros: ali, nada é lido
    expect(pagina).toMatch(/const parentescos = (modoTv \? new Map<string, string>\(\) : )?await parentescosDeQuemOlha\(usuario, naLista\);/);
    expect(pagina).toMatch(/parentesco: parentescos\.get\(i\.id\)/);
    expect(tela('components/explorar/Controles.astro')).toMatch(/<small class="escolha__parentesco suave">\{o\.parentesco\}<\/small>/);
  });

  it('Memória: "Quem estava" com retratos menores, para os relatos começarem mais perto do alto', () => {
    const css = tela('visual/telas/memoria.css');
    expect(css).toMatch(/\.quem \.retrato \{\s*width: min\(100%, 4\.75rem\);/);
    expect(css).toMatch(/\.quem \{\s*grid-template-columns: repeat\(auto-fill, minmax\(clamp\(6\.5rem, 6\.5vw, 8rem\), 1fr\)\);/);
    expect(css).toMatch(/\.quem \.retrato \{\s*width: min\(100%, 6\.5rem\);/);
  });

  it('Início: a linha do rascunho de relato diz de qual memória ele é e que ninguém viu ainda', () => {
    const nome = (id: string) => ({ 'vo-bela': 'Vó Bela' })[id] ?? id;
    expect(fraseDoRascunho({ memorias: [], relatos: [{ por: 'lucas-magno', titulo: 'Jantar de casamento' }] }, 'lucas-magno', nome)).toBe('Seu relato em “Jantar de casamento” é um rascunho: ninguém viu ainda.');
    expect(fraseDoRascunho({ memorias: [], relatos: [{ por: 'vo-bela', titulo: 'A canja' }] }, 'gui', nome)).toBe('O relato de Vó Bela em “A canja” é um rascunho: ninguém viu ainda.');
    // Uma memória em rascunho, ou mais de um rascunho: a linha conta, como antes
    expect(fraseDoRascunho({ memorias: [{}], relatos: [] }, 'gui', nome)).toBe('Você tem um rascunho.');
    expect(fraseDoRascunho({ memorias: [{}], relatos: [{ por: 'gui', titulo: 'X' }] }, 'gui', nome)).toBe('Você tem 2 rascunhos.');
  });

  it('Relato: publicar leva à memória, no relato de quem publicou, com e sem script', () => {
    const rota = readFileSync(new URL('../src/pages/api/relatos.ts', import.meta.url), 'utf8');
    expect(rota).toContain("const noRelato = (memoriaId: string, relatoId: number | undefined) => `/memorias/${memoriaId}${relatoId ? `#relato-${relatoId}` : ''}`;");
    expect(rota).toMatch(/if \(texto\('publicar'\) === '1'\) return voltar\(request, corpo\.url!/);
    const pagina = tela('pages/memorias/[id]/relato.astro');
    expect(pagina).toContain('name="publicar" value="1" data-publicar');
    expect(pagina).toMatch(/ir\.searchParams\.set\('ok', 'Relato publicado\.'\);\s*location\.assign\(ir\);/);
    expect(pagina).not.toContain('data-confirmacao');
  });

  it('o botão de contar diz "Contar como foi" em todo lugar: "Escrever meu relato" não aparece mais no site', () => {
    const fontes = import.meta.glob<string>('../src/**/*.{astro,ts}', { query: '?raw', import: 'default', eager: true });
    for (const [arquivo, texto] of Object.entries(fontes)) expect(texto, arquivo).not.toContain('Escrever meu relato');
    expect(tela('components/painel/Contar.astro')).toMatch(/<a class="botao" href=\{`\/memorias\/\$\{memoria\.id\}\/relato`\}>\s*Contar como foi/);
    expect(tela('pages/memorias/[id].astro')).toContain(": temMeuRelato ? 'Editar meu relato' : 'Contar como foi';");
  });
});
