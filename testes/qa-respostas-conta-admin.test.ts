// Regras que nasceram das respostas do Gui ao QA de design de 17/11/2026 (docs/qa/2026-11-17-perguntas.md),
// nas telas da conta, da lixeira, da administração, do sistema visual e da página não encontrada.
import { describe, expect, it } from 'vitest';
import { LIMITE_DA_LISTA, administracao, fraseDaLixeira, oComeco } from '../src/lib/conta';
import { TIPOS_DE_EXEMPLO } from '../src/lib/servidor/semente';
import { CORES_NOVAS, ehCorDaPaleta } from '../src/lib/visual';
import { ehRabisco } from '../src/visual/rabiscos';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync, existsSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string; existsSync: (caminho: URL) => boolean };
const endereco = (caminho: string) => new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url);
const ler = (caminho: string) => readFileSync(endereco(caminho), 'utf8');

describe('sua conta', () => {
  const conta = ler('src/pages/conta.astro');

  it('P148: os números de "O que você criou" têm o tamanho de título de parte', () => {
    const css = ler('src/visual/telas/conta.css');
    const numero = css.slice(css.indexOf('.criado__numero {'), css.indexOf('}', css.indexOf('.criado__numero {')));
    expect(numero).toContain('font-size: var(--t-titulo-2)');
  });

  it('P149: o cartão "Seus dados" saiu, e nada na conta diz "Não informado"', () => {
    expect(conta).not.toContain('Seus dados');
    expect(conta).not.toContain('Não informado');
    expect(conta).toContain('conta__dados');
  });

  it('P150: a página Rascunhos saiu, e nada no site leva a ela', () => {
    expect(existsSync(endereco('src/pages/rascunhos.astro'))).toBe(false);
    for (const arquivo of ['src/pages/lixeira.astro', 'src/pages/api/lixeira.ts', 'src/pages/conta.astro', 'src/layouts/Visual.astro']) expect(ler(arquivo), arquivo).not.toContain('/rascunhos');
    expect(ler('src/pages/api/lixeira.ts')).toMatch(/rascunho \? '\/conta' : '\/'/);
  });

  it('P151: a lista aberta mostra as dez primeiras e diz quantas existem', () => {
    expect(LIMITE_DA_LISTA).toBe(10);
    const muitas = Array.from({ length: 24 }, (_, i) => i);
    expect(oComeco(muitas)).toEqual({ mostra: muitas.slice(0, 10), total: 24, haMais: true });
    expect(oComeco([1, 2, 3])).toEqual({ mostra: [1, 2, 3], total: 3, haMais: false });
    expect(oComeco(muitas.slice(0, 10)).haMais).toBe(false);
    // A tela não lista mais nada direto de `criou`
    expect(conta).not.toMatch(/criou\.(memorias|relatos|fotos|capitulos)\.map\(/);
  });

  it('P152: quem administra lê a conta do que a lixeira mostra; os demais, a do que é deles', () => {
    expect(fraseDaLixeira(true, 0)).toBe('Nada na lixeira.');
    expect(fraseDaLixeira(true, 1)).toBe('Uma coisa na lixeira.');
    expect(fraseDaLixeira(true, 3)).toBe('3 coisas na lixeira.');
    expect(fraseDaLixeira(false, 0)).toBe('Nada seu na lixeira.');
    expect(fraseDaLixeira(false, 1)).toBe('Uma coisa sua na lixeira.');
    expect(fraseDaLixeira(false, 2)).toBe('2 coisas suas na lixeira.');
  });

  it('P153: o link é "Famílias", e a cópia do acervo fica à parte dos links que abrem página', () => {
    const itens = administracao({ admin: true }, { podeEspelhar: true });
    expect(itens.map((i) => i.rotulo)).toContain('Famílias');
    expect(itens.filter((i) => i.baixar).map((i) => i.rotulo)).toEqual(['Baixar cópia do acervo']);
    expect(conta).toContain('conta.administracao.filter((item) => !item.baixar)');
    expect(conta).toMatch(/class="conta__copia"[\s\S]*?download[\s\S]*?Banco: \{conta\.banco\}/);
  });
});

describe('lixeira', () => {
  const pagina = ler('src/pages/lixeira.astro');

  it('P154: restaurar fica na lixeira, com o recado certo e o caminho para o que voltou', () => {
    const memorias = ler('src/pages/api/lixeira.ts');
    expect(memorias).toMatch(/voltar\(request, `\/lixeira\?restaurada=\$\{encodeURIComponent\(id\)\}`/);
    expect(memorias).toContain("'Rascunho restaurado.'");
    expect(memorias).toContain("'Memória restaurada.'");
    expect(ler('src/pages/api/capitulos.ts')).toMatch(/voltar\(request, `\/lixeira\?restaurado=\$\{encodeURIComponent\(id\)\}`, \{ ok: 'Capítulo restaurado.' \}/);
    expect(pagina).toContain('Continuar o rascunho');
    expect(pagina).toContain('Ver a memória');
    // O caminho só aparece para o que a pessoa pode ver: a busca passa pelas regras de sempre
    expect(pagina).toContain('await obterMemoria(usuario, restaurada)');
    expect(pagina).toContain('(await listarCapitulos(usuario)).find(');
  });

  it('P155: a lixeira tem "Voltar para a sua conta"', () => {
    expect(pagina).toMatch(/<a class="acao" href="\/conta">Voltar para a sua conta<\/a>/);
  });

  it('P156: na tela grande, "Restaurar" fica à direita, na linha do título', () => {
    expect(pagina).toContain('class="linhas linhas--com-acao"');
    const css = ler('src/visual/telas/formulario.css');
    const inicio = css.indexOf('.pagina-de-formulario .linhas--com-acao > li {');
    expect(inicio).toBeGreaterThan(-1);
    expect(css.lastIndexOf('@media (min-width: 62rem)', inicio)).toBeGreaterThan(css.lastIndexOf('\n}\n', inicio) - 1);
    expect(css.slice(inicio, css.indexOf('}', inicio))).toContain('grid-template-columns: minmax(0, 1fr) auto');
  });
});

describe('tipos de momento', () => {
  const pagina = ler('src/pages/admin/tipos.astro');
  const css = ler('src/visual/telas/tipos.css');
  const escolha = ler('src/components/formularios/EscolhaDoTipo.astro');

  it('P157: onde há mouse a prévia fica parada ao lado; no toque, uma etiqueta acompanha a escolha junto do "Salvar"', () => {
    expect(css).toMatch(/@media \(min-width: 62rem\) and \(hover: hover\) and \(pointer: fine\) \{\s*\.pagina-de-formulario \.escolha-do-tipo__previa \{\s*position: sticky;/);
    expect(css.match(/position:\s*sticky/g)).toHaveLength(1);
    expect(pagina.match(/data-escolha-amostra/g)!.length).toBeGreaterThanOrEqual(2);
    // A etiqueta do resumo do tipo também acompanha
    expect(pagina).toContain("form.closest('details')?.querySelectorAll<HTMLElement>('summary .etiqueta')");
  });

  it('P161: salvar volta para a linha do tipo, com o nome no recado', () => {
    expect(ler('src/pages/api/tipos.ts')).toContain('`${PAGINA}?salvo=${encodeURIComponent(id)}#tipo-${encodeURIComponent(id)}`');
    expect(pagina).toContain('<li id={`tipo-${t.id}`}>');
    expect(pagina).toContain('{salvo === t.id && <Recado>{t.rotulo} atualizado.</Recado>}');
  });

  it('P162: "Tipos da lista" vem primeiro, "Novo tipo" depois, e "Outro" por último, com a conta no alto', () => {
    const [lista, novo, outro] = ['<h2>Tipos da lista</h2>', '<h2>Novo tipo</h2>', '<h2>O que a família escreveu em "Outro"</h2>'].map((t) => pagina.indexOf(t));
    expect(lista).toBeGreaterThan(-1);
    expect(novo).toBeGreaterThan(lista);
    expect(outro).toBeGreaterThan(novo);
    expect(pagina).toContain('<a class="acao" href="#outro">');
    expect(pagina).toContain('<section class="painel" id="outro">');
  });

  it('P166: o acervo de exemplo tem tipos com cores e rabiscos da paleta ampliada, semeados dentro da proteção da produção', () => {
    expect(TIPOS_DE_EXEMPLO.length).toBeGreaterThanOrEqual(2);
    for (const t of TIPOS_DE_EXEMPLO) {
      expect(ehCorDaPaleta(t.cor), t.cor).toBe(true);
      expect((CORES_NOVAS as readonly string[]).includes(t.cor), t.cor).toBe(true);
      expect(ehRabisco(t.icone), t.icone).toBe(true);
    }
    const semente = ler('src/lib/servidor/semente.ts');
    for (const t of TIPOS_DE_EXEMPLO) expect(semente, t.id).toContain(`tipo: '${t.id}'`);
    const banco = ler('src/lib/servidor/banco.ts');
    expect(banco.indexOf('await semearTiposDeExemplo(db);')).toBeGreaterThan(banco.indexOf('if (AMBIENTES_COM_EXEMPLOS.includes(ambiente())) {'));
  });

  it('P167: "Cor" e "Desenho" são rótulos em mono, como "Nome"', () => {
    const inicio = css.indexOf('.pagina-de-formulario .painel .escolha-do-tipo fieldset legend {');
    expect(inicio).toBeGreaterThan(-1);
    const regra = css.slice(inicio, css.indexOf('}', inicio));
    expect(regra).toContain('font-family: var(--mono)');
    expect(regra).toContain('font-size: var(--t-ficha)');
  });

  it('P168: o nome do desenho marcado fica escrito embaixo da grade', () => {
    expect(escolha).toMatch(/Desenho: <span data-escolha-nome-do-desenho>\{rabisco\(icone\)\.nome\}<\/span>/);
    expect(escolha).toContain('data-nome={r.nome}');
    expect(pagina).toContain("nomeDoDesenho.textContent = marcado.dataset.nome ?? ''");
  });
});

describe('famílias, carta de Natal e espelho da produção', () => {
  it('P169: refazer o espelho pede confirmação no lugar, antes de enviar', () => {
    const espelho = ler('src/pages/admin/espelho.astro');
    expect(espelho).toMatch(/<ConfirmarRemocao rotulo="Refazer o espelho" pergunta="Trocar tudo o que está na homologação\?"[^>]*cheio \/>/);
    // O único botão que envia é o da confirmação
    expect(espelho).not.toMatch(/<button[^>]*type="submit"/);
    expect(ler('src/components/ConfirmarRemocao.astro')).toMatch(/<button class="botao botao--perigo" type="submit" name="acao"/);
  });

  it('P170: o link da carta diz que mostra a carta salva', () => {
    const carta = ler('src/pages/admin/carta.astro');
    expect(carta).toContain('Ver a carta salva');
    expect(carta).not.toContain('Ver como fica');
  });

  it('P171: as famílias são um formulário só, com um "Salvar famílias", e um erro não grava nenhuma', () => {
    const familias = ler('src/pages/admin/familias.astro');
    expect(familias.match(/<form /g)).toHaveLength(1);
    expect(familias).toMatch(/<button class="botao" type="submit">Salvar famílias<\/button>/);
    expect(familias).toContain('name={`sobrenomes-${n.id}`}');
    const rota = ler('src/pages/api/nucleos.ts');
    // Primeiro confere todas, depois grava
    expect(rota.indexOf("if ('erro' in lido) return")).toBeGreaterThan(-1);
    expect(rota.indexOf("if ('erro' in lido) return")).toBeLessThan(rota.indexOf('await atualizarSobrenomesDoNucleo('));
    expect(rota.match(/await atualizarSobrenomesDoNucleo\(/g)).toHaveLength(1);
  });
});
