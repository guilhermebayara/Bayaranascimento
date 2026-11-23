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
});
