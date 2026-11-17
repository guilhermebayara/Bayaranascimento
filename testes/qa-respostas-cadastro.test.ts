// Regras que nasceram das respostas do Gui ao QA de design de 17/11/2026 (docs/qa/2026-11-17-perguntas.md),
// nas telas "Nova pessoa e cadastro guiado" (P109 a P113) e "Editar página e laços" (P114 a P125).
import { describe, expect, it } from 'vitest';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url), 'utf8');

const editar = ler('src/pages/pessoas/[id]/editar.astro');
const ficha = ler('src/components/FichaDoIntegrante.astro');
const css = ler('src/visual/telas/formulario.css');

describe('cadastro guiado', () => {
  it('P109: "Como estão hoje?" só oferece o que é estar junto, e o fim fica com "Já terminou"', () => {
    expect(editar).toContain("const FASES_DE_QUEM_ESTA_JUNTO: readonly TipoDeFase[] = ['namoro', 'noivado', 'casamento', 'uniao'];");
    const guiado = editar.slice(editar.indexOf("passo === 'casal' ? ("), editar.indexOf('<Opcoes nome="qualidade" rotulo="Filiação" opcoes={opcoesDeFiliacao()} valor="biologica" id="rotulo-qualidade-guia"'));
    expect(guiado).toContain('<Opcoes nome="faseTipo" rotulo="Como estão hoje?" opcoes={fasesDeHoje} valor="casamento" />');
    expect(guiado).toContain('name="terminou" data-revela="terminou-guia"');
  });
  it('P110: o título acima do formulário só aparece depois de alguém ser adicionado', () => {
    expect(editar).toContain('{jaNoPasso(passo).length > 0 && <h3 class="casal__titulo">Adicionar mais alguém</h3>}');
    expect(editar).not.toContain("'Adicionar mais alguém' : 'Adicionar'");
  });
  it('P112: na tela final, o link do modo completo diz que adiciona um laço', () => {
    const fim = editar.slice(editar.indexOf("guiado && passo === 'fim'"), editar.indexOf('{!guiado && ('));
    expect(fim).toContain("{temLacos ? 'Adicionar outro laço' : 'Adicionar um laço'}");
    expect(fim).not.toContain('Ver todos os tipos de laço');
  });
});

describe('nova pessoa', () => {
  it('P113: no recolhido, só o nome é sublinhado, e na edição a frase de apoio sai', () => {
    expect(ficha).toContain("<summary><span class=\"mais__nome\">{i ? 'Nascimento e história' : 'Foto, nascimento e história'}</span>{!i && <small>(opcional, dá para preencher depois)</small>}</summary>");
    const resumo = css.slice(css.indexOf('\n.pagina-de-formulario .mais > summary {'), css.indexOf('\n.pagina-de-formulario .mais__nome {'));
    expect(resumo).not.toContain('text-decoration');
    expect(css).toMatch(/\.pagina-de-formulario \.mais__nome \{\s*text-decoration: underline;/);
  });
});
