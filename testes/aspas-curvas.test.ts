// Aspas curvas em todo texto que o site mostra (resposta do Gui à P8 do QA de 23/11/2026,
// docs/historico/qa/2026-11-23-perguntas.md): os recados de excluir, criar tipo e tipo repetido usavam
// aspas retas ("Teste" foi para a lixeira), e o resto do site usa as curvas (“Festa”). O teste varre as
// páginas, os componentes e o código, fora os comentários, e falha com aspas retas em volta de palavras
// num texto. Atributos, seletores e SQL ficam de fora: neles a aspa reta é código.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(astro|ts)$/.test(nome) ? [caminho] : [];
  });
}

// Os dados de exemplo são conteúdo, como a família escreveria; o monograma é gerado por um script
const FORA = ['src/lib/servidor/semente.ts', 'src/visual/monograma.ts'];

/** Aspas retas em volta de uma palavra ou frase, num texto: "Outro", "Quem estava", "${titulo}" */
const ASPAS_RETAS = /(?<=^|[\s(>“'`])"((?:[A-ZÀ-Úa-zà-ú]|\$\{)[^"\n]{0,80}?)"(?=[\s.,:;!?)<'`]|$)/g;
/** Linhas de código, em que a aspa reta é da linguagem */
const CODIGO = /SELECT |INSERT |UPDATE |DELETE |CREATE |JSON\.|^\s*import |new RegExp/;
/** O que é código dentro de uma linha de texto: atributos (class="dica") e seletores ([name="tipo"]) */
const ATRIBUTOS = /[\w-]+=("[^"]*"|\{[^}]*\})|\[[^\]\n]*\]/g;

export function aspasRetasEm(texto: string): string[] {
  const achados: string[] = [];
  let emComentario = false;
  for (const linha of texto.split('\n')) {
    const limpa = linha.trim();
    if (emComentario) {
      if (limpa.includes('*/')) emComentario = false;
      continue;
    }
    if (/^(\/\*|\{\/\*)/.test(limpa) && !limpa.includes('*/')) {
      emComentario = true;
      continue;
    }
    if (/^(\/\/|\*|\/\*|\{\/\*|<!--|--)/.test(limpa)) continue;
    const semComentarioNoFim = linha.replace(/\s(\/\/|--) .*$/, '').replace(/\{\/\*.*?\*\/\}/g, '');
    if (CODIGO.test(semComentarioNoFim)) continue;
    for (const m of semComentarioNoFim.replace(ATRIBUTOS, ' ').matchAll(ASPAS_RETAS)) achados.push(m[0]);
  }
  return achados;
}

describe('aspas curvas no texto do site', () => {
  it('o detector pega os recados de antes e deixa o código em paz', () => {
    expect(aspasRetasEm("return voltar(request, '/lixeira', { ok: `\"${excluida.titulo}\" foi apagada de vez.` });")).toEqual(['"${excluida.titulo}"']);
    expect(aspasRetasEm("return `Já existe um tipo chamado \"${rotulo}\".`;")).toEqual(['"${rotulo}"']);
    expect(aspasRetasEm('    <h2>O que a família escreveu em "Outro"</h2>')).toEqual(['"Outro"']);
    expect(aspasRetasEm("const x = form.querySelector('input[name=\"tipo\"]:checked');")).toEqual([]);
    expect(aspasRetasEm('<a class="acao" href="/conta">Voltar</a>')).toEqual([]);
    expect(aspasRetasEm('      <p class="dica">Serve para o site escrever "sua tia" ou "seu tio" na árvore.</p>')).toEqual(['"sua tia"', '"seu tio"']);
    expect(aspasRetasEm('// Um comentário pode citar "Outro" com aspas retas')).toEqual([]);
    expect(aspasRetasEm("{ ok: `“${atual.titulo}” foi para a lixeira.` }")).toEqual([]);
  });

  it('nenhum texto do site usa aspas retas em volta de palavras', () => {
    const achados = arquivos('src')
      .filter((f) => !FORA.includes(f))
      .flatMap((f) => aspasRetasEm(readFileSync(f, 'utf8')).map((a) => `${f}: ${a}`));
    expect(achados).toEqual([]);
  });
});
