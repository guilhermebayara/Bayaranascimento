// Regras que nasceram das respostas do Gui ao QA de design de 17/11/2026 (docs/qa/2026-11-17-perguntas.md),
// nas telas "Nova pessoa e cadastro guiado" (P109 a P113) e "Editar página e laços" (P114 a P125).
import { describe, expect, it } from 'vitest';
import { PROPORCAO_DO_RETRATO, quadroDoRetrato } from '../src/lib/retratos';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url), 'utf8');

const editar = ler('src/pages/pessoas/[id]/editar.astro');
const ficha = ler('src/components/FichaDoIntegrante.astro');
const css = ler('src/visual/telas/formulario.css');

describe('cadastro guiado', () => {
  // Revisto pelo Gui em 18/11/2026: sai "Já terminou"; o fim é "Adicionar o que aconteceu depois"
  it('P109: "Como estão hoje?" só oferece o que é estar junto, e o fim fica com "Adicionar o que aconteceu depois"', () => {
    const guiado = editar.slice(editar.indexOf("passo === 'casal' ? ("), editar.indexOf('<Opcoes nome="qualidade" rotulo="Filiação" opcoes={opcoesDeFiliacao()} valor="biologica" id="rotulo-qualidade-guia"'));
    expect(guiado).toContain('<PrimeiraFase id="guia" />');
    expect(guiado).toContain('<FasesDepois id="guia-fase-depois" rotuloDaPrimeira="rotulo-fase-guia" />');
    expect(editar).not.toContain('name="terminou"');
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
  // O recolhido só existe no cadastro: na edição, a ficha inteira fica fechada num resumo (proposta A da sessão E)
  it('P113: no recolhido, só o nome é sublinhado', () => {
    expect(ficha).toContain('<summary><span class="mais__nome">Foto e história</span><small>(opcional, dá para preencher depois)</small></summary>');
    const resumo = css.slice(css.indexOf('\n.pagina-de-formulario .mais > summary {'), css.indexOf('\n.pagina-de-formulario .mais__nome {'));
    expect(resumo).not.toContain('text-decoration');
    expect(css).toMatch(/\.pagina-de-formulario \.mais__nome \{\s*text-decoration: underline;/);
  });
});

describe('editar página e laços', () => {
  const regra = (seletor: string) => {
    const inicio = css.indexOf(`\n${seletor} {`);
    expect(inicio, seletor).toBeGreaterThan(-1);
    return css.slice(inicio, css.indexOf('}', inicio));
  };
  const retrato = ler('src/components/CampoRetrato.astro');
  const cliente = ler('src/lib/cliente/retrato.ts');

  it('P114: a ficha mexida e não salva é guardada ao salvar um laço e volta com um aviso', () => {
    expect(editar).toContain('<div data-ficha-pendente hidden>');
    expect(editar).toContain('<a href="#ficha">Voltar à ficha para salvar</a>');
    expect(editar).toContain("import { camposDo, devolver, type Guardado } from '../../../lib/cliente/guardar-formulario';");
    expect(editar).toContain('if (JSON.stringify(campos) === comoVeio && !foto) return;');
    // Salvar a ficha apaga o que estava guardado
    expect(editar).toMatch(/ficha\.addEventListener\('submit', \(\) => \{\s*try \{\s*sessionStorage\.removeItem\(CHAVE\);/);
  });
  it('P115: todo editor de laço tem "Cancelar" ao lado de "Salvar", que só aparece com script', () => {
    const editores = editar.match(/<div class="editar__caixa">/g)?.length ?? 0;
    // Seis editores: o sexto é o do laço do coração de outra pessoa, para os administradores
    expect(editores).toBe(6);
    // Mais um: o "Adicionar" de cada grupo, que também fecha e desfaz com "Cancelar"
    expect(editar.match(/data-editar-cancelar hidden>Cancelar<\/button>/g)?.length).toBe(editores + 1);
    expect(editar).toContain('formulario.reset();');
    expect(editar).toContain("edicao.querySelector('summary')?.focus();");
  });
  it('P116, revista na sessão H: a pergunta de dentro do cartão do casal é um título de seção pequeno, como "Quem vê"', () => {
    expect(regra('.pagina-de-formulario .fases-depois__linha > legend')).toContain('font-size: var(--t-ficha);');
    expect(regra('.pagina-de-formulario .fases-depois__linha > legend')).toContain('font-family: var(--mono);');
  });
  it('P117: dentro do cartão, a zona de perigo é uma linha, e só vira bloco com a pergunta aberta', () => {
    const quieta = regra('.pagina-de-formulario .perigo--menor');
    expect(quieta).toContain('border-top: var(--traco) solid var(--alerta);');
    expect(quieta).toContain('background: none;');
    expect(regra('.pagina-de-formulario .perigo--menor:has(.confirmar[open])')).toContain('border: var(--traco) solid var(--alerta);');
    expect(editar.match(/<ZonaDePerigo menor nivel=\{4\}>/g)?.length).toBe(6);
  });
  it('P118: no retrato, a ação se chama "Remover foto"', () => {
    expect(retrato).toContain('data-tirar-retrato hidden={!i?.retrato}>Remover foto</button>');
    expect(retrato).not.toContain('>Tirar foto<');
  });
  it('P119: o quadro de enquadrar mostra o retângulo do retrato, com as cantoneiras, na proporção em que ele aparece no site', () => {
    expect(PROPORCAO_DO_RETRATO).toBe(4 / 5);
    expect(ler('src/visual/pecas.css')).toMatch(/\.retrato \{[^}]*aspect-ratio: 4 \/ 5;/);
    expect(quadroDoRetrato(300)).toEqual({ x: 30, y: 0, largura: 240, altura: 300, cantoneira: 20.4 });
    expect(cliente).toContain('const q = quadroDoRetrato(lado);');
    expect(cliente).toContain("contexto.fill(fora, 'evenodd');");
  });
  it('P120: a fase marcada para sair aparece riscada, com "será removida ao salvar"', () => {
    expect(editar).toContain('<small class="fase__sai">será removida ao salvar</small>');
    expect(editar).toContain('name={`fase-${n}-remover`} data-remover-fase />');
    expect(regra('.pagina-de-formulario .fase:has([data-remover-fase]:checked) .fase__texto')).toContain('text-decoration: line-through;');
    expect(regra('.pagina-de-formulario .fase__sai')).toContain('display: none;');
  });
  it('P121: "Só os dois veem este casal" vem separada das fases, com o rótulo "Quem vê", antes do salvar', () => {
    const cartao = editar.slice(editar.indexOf('<FasesDepois id={`fase-depois-${c.casal.id}`}'), editar.indexOf('Salvar o casal'));
    expect(cartao).toContain('<div class="quem-ve" role="group"');
    expect(cartao).toContain('>Quem vê</p>');
    expect(cartao).toContain('<span>Só os dois veem este casal</span>');
    expect(regra('.pagina-de-formulario .quem-ve')).toContain('border-top: 1px solid var(--fio);');
  });
  // Na proposta A da sessão E, "Editar" fica na linha do nome em toda largura; "Editar o casal", mais
  // comprido, só no computador
  it('P122: "Editar o casal" só vai para a linha do nome no computador', () => {
    expect(regra('.pagina-de-formulario .grupo-de-lacos .laco:not(.laco--casal) > .editar:not([open]),\n.pagina-de-formulario .grupo-de-lacos .laco:not(.laco--casal) > .editar[open] > summary')).toContain('position: absolute;');
    const noComputador = css.slice(css.indexOf('/* A abertura ocupa a altura da página'));
    expect(noComputador).toMatch(/^[^@]*\.laco--casal > \.editar:not\(\[open\]\),[^}]*\{\s*position: absolute;/);
    expect(css.slice(css.lastIndexOf('@media', css.indexOf('/* A abertura ocupa a altura da página')))).toMatch(/^@media \(min-width: 62rem\)/);
  });
  it('P124: na tela grande o quadro de enquadrar cresce, com os controles ao lado', () => {
    const grande = css.slice(css.indexOf('/* Na tela grande, o quadro cresce'));
    expect(grande).toMatch(/^[^@]*@media \(min-width: 62rem\) \{\s*\.pagina-de-formulario \.recorte \{\s*grid-template-columns: minmax\(0, 26rem\)/);
  });
  it('P125: as famílias que não mudam viram texto, e só há caixa para o que dá para mexer', () => {
    expect(ficha).toContain('const familiasParaMarcar = i ? nucleos.filter((n) => !i.nucleos.includes(n.id)) : [];');
    expect(ficha).toContain('<p data-familias-fixas>');
    expect(ficha).not.toContain('disabled={i.nucleos.includes(n.id)}');
  });
});
