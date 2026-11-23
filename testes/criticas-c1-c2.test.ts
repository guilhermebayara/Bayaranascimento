// Os pontos pequenos das críticas de design C1 e C2 (respostas do Gui de 22/11/2026, sessão AA). As regras
// puras têm teste próprio (o "Neste dia" no Natal em testes/painel.test.ts, a ordem do Início em
// testes/qa-respostas-inicio.test.ts); aqui ficam as que moram nas telas.
import { describe, expect, it } from 'vitest';

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
    expect(pagina).toContain('const parentescos = await parentescosDeQuemOlha(usuario, naLista);');
    expect(pagina).toMatch(/parentesco: parentescos\.get\(i\.id\)/);
    expect(tela('components/explorar/Controles.astro')).toMatch(/<small class="escolha__parentesco suave">\{o\.parentesco\}<\/small>/);
  });
});
