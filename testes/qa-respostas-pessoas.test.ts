// Regras que nasceram das respostas do Gui ao QA de design de 17/11/2026, na lista de Pessoas e na
// página da pessoa (P98 a P108 de docs/qa/2026-11-17-perguntas.md).
import { describe, expect, it } from 'vitest';
import { enderecoDePessoas, familiaPedida, gruposDaFamilia, ordemPedida, ordenarPessoas, type PessoaDaLista } from '../src/lib/ordem-das-pessoas';
import { calcularGeracoes } from '../src/lib/parentesco';
import { vidaSemRotulo } from '../src/lib/datas';

// A leitura de arquivos segue o jeito de testes/visual.test.ts, que não pede os tipos do Node
const fs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL, codificacao: string) => string };
const ler = (caminho: string) => readFileSync(new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url), 'utf8');
const semComentario = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('a ordem da lista de Pessoas (P98)', () => {
  const gente = (id: string, nascimentoAno: number | null = null, tipo = 'pessoa'): PessoaDaLista => ({ id, nome: id, tipo, nascimentoAno });
  // Avó, mãe e tia, a filha e o genro, a neta; um amigo sem laço de árvore e dois bichos
  const pessoas = [gente('neta', 2020), gente('filha', 1990), gente('genro'), gente('tia', 1958), gente('mae', 1960), gente('avo', 1930), gente('amigo', 1950), gente('gato', 2015, 'bicho'), gente('cao', 2010, 'bicho')];
  const filiacoes = [
    { filho: 'mae', responsavel: 'avo' },
    { filho: 'tia', responsavel: 'avo' },
    { filho: 'filha', responsavel: 'mae' },
    { filho: 'neta', responsavel: 'filha' },
    { filho: 'neta', responsavel: 'genro' },
    { filho: 'gato', responsavel: 'mae' },
  ];
  const geracoes = calcularGeracoes(
    pessoas.map((p) => p.id),
    filiacoes,
    [{ a: 'filha', b: 'genro' }],
  );
  const ids = (ordem: 'geracao' | 'nome') => ordenarPessoas(pessoas, geracoes, ordem).map((p) => p.id);

  it('por geração: dos mais velhos aos mais novos, com os bichos no fim', () => {
    expect(ids('geracao')).toEqual(['avo', 'tia', 'mae', 'filha', 'genro', 'neta', 'amigo', 'cao', 'gato']);
  });
  it('dentro da geração vale o ano de nascimento, e quem não tem o ano fica depois', () => {
    const ordem = ids('geracao');
    expect(ordem.indexOf('tia')).toBeLessThan(ordem.indexOf('mae'));
    expect(ordem.indexOf('filha')).toBeLessThan(ordem.indexOf('genro'));
  });
  it('quem não tem laço de árvore fica depois das gerações e antes dos bichos', () => {
    const ordem = ids('geracao');
    expect(ordem.indexOf('amigo')).toBeGreaterThan(ordem.indexOf('neta'));
    expect(ordem.indexOf('amigo')).toBeLessThan(ordem.indexOf('cao'));
  });
  it('de A a Z: todos pelo nome, sem olhar acento nem maiúscula', () => {
    expect(ids('nome')).toEqual(['amigo', 'avo', 'cao', 'filha', 'gato', 'genro', 'mae', 'neta', 'tia']);
    const nomes = [gente('Ú'), gente('abel'), gente('Érica'), gente('Bia')];
    expect(ordenarPessoas(nomes, new Map(), 'nome').map((p) => p.id)).toEqual(['abel', 'Bia', 'Érica', 'Ú']);
  });
  it('a ordem não depende de quando cada um foi cadastrado', () => {
    const aoContrario = ordenarPessoas([...pessoas].reverse(), geracoes, 'geracao').map((p) => p.id);
    expect(aoContrario).toEqual(ids('geracao'));
  });
  it('só "nome" troca a ordem; qualquer outro valor do endereço é a ordem por geração', () => {
    expect(ordemPedida('nome')).toBe('nome');
    for (const valor of [null, undefined, '', 'geracao', 'outra']) expect(ordemPedida(valor)).toBe('geracao');
  });
});

describe('a lista de Pessoas', () => {
  const pagina = ler('src/pages/pessoas/index.astro');
  const css = semComentario(ler('src/visual/telas/pessoas.css'));
  it('tem "Procurar pelo nome", que funciona sem script (P98)', () => {
    expect(pagina).toMatch(/<form class="pessoas-pagina__busca" method="get" action="\/pessoas" data-procurar>/);
    expect(pagina).toMatch(/for="procurar-pessoa">Procurar pelo nome<\/label>/);
    expect(pagina).toMatch(/<select id="procurar-pessoa" name="ir" required>/);
    // Sem script, a lista suspensa manda `?ir=`, e a página leva até a pessoa, se ela existe
    expect(pagina).toMatch(/if \(ir && integrantes\.some\(\(i\) => i\.id === ir\)\) return Astro\.redirect\(`\/pessoas\/\$\{ir\}`\);/);
    expect(pagina).toContain('buscaDePessoa(lista);');
  });
  it('a troca de ordem é um link, no endereço, e diz qual está valendo (P98)', () => {
    // A troca de ordem guarda a família filtrada (proposta B, 17/11/2026)
    expect(pagina).toMatch(/\{ id: 'geracao', texto: 'Por geração', href: enderecoDePessoas\(familiaEmUso, 'geracao'\) \}/);
    expect(pagina).toMatch(/\{ id: 'nome', texto: 'De A a Z', href: enderecoDePessoas\(familiaEmUso, 'nome'\) \}/);
    expect(pagina).toMatch(/aria-current=\{o\.id === ordem \? 'true' : undefined\}/);
    expect(pagina).toMatch(/const ordem = ordemPedida\(Astro\.url\.searchParams\.get\('ordem'\)\);/);
  });
  it('a conta de cada família vem por extenso, e quem é de duas continua nas duas (P99)', () => {
    expect(pagina).toMatch(/<span class="rotulo suave">\{contaDe\(grupo\.membros\)\}<\/span>/);
    expect(pagina).toMatch(/integrantes\.filter\(\(i\) => familiasDe\(i\)\.includes\(n\.id\)\)/);
  });
  it('os retratos nascem na margem do nome da família (P100)', () => {
    const recuo = (seletor: string) => new RegExp(`\\${seletor} \\{[^}]*padding(?:-inline)?: (?:var\\(--e-\\d\\) )?(var\\(--e-\\d\\));`).exec(css)?.[1];
    expect(recuo('.familia-de-gente__nome')).toBe('var(--e-5)');
    expect(recuo('.familia-de-gente__lista')).toBe(recuo('.familia-de-gente__nome'));
  });
  it('sem memória nenhuma, a linha da conta não aparece (P101)', () => {
    expect(pagina).toMatch(/n > 0 \? plural\(n, 'memória', 'memórias'\) : null/);
  });
});

describe('Pessoas na proposta B (escolha do Gui no conceito da sessão E, 17/11/2026)', () => {
  const pagina = ler('src/pages/pessoas/index.astro');
  const css = semComentario(ler('src/visual/telas/pessoas.css'));
  const pecas = semComentario(ler('src/visual/pecas.css'));
  const celular = css.slice(0, css.indexOf('@media (min-width: 40rem)'));
  const comMouse = '@media (min-width: 62rem) and (hover: hover) and (pointer: fine)';

  it('a família pedida no endereço só vale se estiver na lista; outra coisa é "Todas"', () => {
    const familias = ['bayara', 'bracarense', 'outras'];
    expect(familiaPedida('bracarense', familias)).toBe('bracarense');
    expect(familiaPedida('outras', familias)).toBe('outras');
    for (const valor of [null, undefined, '', 'nao-existe', 'BAYARA']) expect(familiaPedida(valor, familias)).toBeNull();
    // A família que a pessoa não vê, ou vazia, não entra na lista, e por isso não filtra
    expect(familiaPedida('bayara', ['outras'])).toBeNull();
  });
  it('a pílula filtra uma família por vez, e "Todas" mostra todas', () => {
    const grupos = [{ id: 'bayara' }, { id: 'bracarense' }, { id: 'outras' }];
    expect(gruposDaFamilia(grupos, 'bracarense')).toEqual([{ id: 'bracarense' }]);
    expect(gruposDaFamilia(grupos, null)).toEqual(grupos);
  });
  it('a família e a ordem ficam juntas no endereço: trocar uma não desfaz a outra', () => {
    expect(enderecoDePessoas(null, 'geracao')).toBe('/pessoas');
    expect(enderecoDePessoas(null, 'nome')).toBe('/pessoas?ordem=nome');
    expect(enderecoDePessoas('bracarense', 'geracao')).toBe('/pessoas?familia=bracarense');
    expect(enderecoDePessoas('bracarense', 'nome')).toBe('/pessoas?familia=bracarense&ordem=nome');
    expect(pagina).toMatch(/const familiaEmUso = familiaPedida\(Astro\.url\.searchParams\.get\('familia'\), todosOsGrupos\.map\(\(g\) => g\.id\)\);/);
    expect(pagina).toMatch(/const grupos = gruposDaFamilia\(todosOsGrupos, familiaEmUso\);/);
    // As pílulas guardam a ordem; a de cada família e "Todas"
    expect(pagina).toMatch(/<PilulaDeFamilia href=\{enderecoDePessoas\(null, ordem\)\} familia="tudo" atual=\{familiaEmUso === null\}>\s*Todas/);
    expect(pagina).toMatch(/<PilulaDeFamilia href=\{enderecoDePessoas\(g\.id, ordem\)\} familia=\{g\.cor\} atual=\{familiaEmUso === g\.id\}/);
  });
  it('família é sempre pill: a peça do sistema, com o ponto na cor viva e, marcada, o pastel', () => {
    const peca = ler('src/components/visual/PilulaDeFamilia.astro');
    expect(peca).toMatch(/<a class="pilula-de-familia" href=\{href\} data-familia=\{familia\} aria-current=\{atual \? 'true' : undefined\}>/);
    expect(pecas).toMatch(/\.pilula-de-familia::before \{[^}]*background: var\(--vivo\);/);
    expect(pecas).toMatch(/\.pilula-de-familia\[aria-current\] \{[^}]*background: var\(--pastel\);/);
    expect(pecas).toMatch(/\.pilula-de-familia \{[^}]*min-height: var\(--toque\);/);
    expect(ler('src/pages/sistema.astro')).toContain('<PilulaDeFamilia');
  });
  it('cada família é uma faixa que abre e fecha sem script, e nasce aberta', () => {
    expect(pagina).toMatch(/<details class="familia-de-gente" data-familia=\{grupo\.cor\} open>\s*(\{\/\*[\s\S]*?\*\/\}\s*)?<summary class="familia-de-gente__nome">/);
    expect(css).toMatch(/\.familia-de-gente__nome::-webkit-details-marker \{\s*display: none;/);
    expect(css).toMatch(/\.familia-de-gente\[open\] > \.familia-de-gente__nome::after \{\s*rotate: 45deg;/);
    expect(css).toMatch(/\.familia-de-gente__nome:focus-visible \{\s*outline:/);
  });
  it('no celular só a busca fica à vista; "Famílias e ordem" abre o resto, e sem script tudo fica à vista', () => {
    expect(pagina).toMatch(/<button class="pessoas-pagina__abre-controles" type="button" aria-expanded="false" aria-controls="familias-e-ordem" hidden>/);
    expect(pagina).toMatch(/controles\.setAttribute\('data-recolhe', ''\);/);
    expect(celular).toMatch(/\.pessoas-pagina__controles\[data-recolhe\]:not\(\[data-aberta\]\) \.pessoas-pagina__escolhas \{\s*display: none;/);
    // Sem o atributo que o script põe, nada some
    expect(celular).not.toMatch(/\n\.pessoas-pagina__escolhas \{[^}]*display: none/);
    // No computador, as escolhas ficam sempre à vista e o controle não aparece
    const computador = css.slice(css.indexOf('@media (min-width: 62rem)'), css.indexOf(comMouse));
    expect(computador).toMatch(/\.pessoas-pagina__controles\[data-recolhe\]:not\(\[data-aberta\]\) \.pessoas-pagina__escolhas \{\s*display: grid;/);
    expect(computador).toMatch(/\.pessoas-pagina__controles \.pessoas-pagina__abre-controles \{\s*display: none;/);
  });
  it('o índice só fica preso onde há mouse; no toque, nada preso (banda do Safari no iPhone)', () => {
    expect(css.match(/position:\s*sticky/g)).toHaveLength(1);
    const preso = css.slice(css.indexOf(comMouse));
    expect(preso).toMatch(/^@media \(min-width: 62rem\) and \(hover: hover\) and \(pointer: fine\)[^{]*\{\s*\.pessoas-pagina__indice \{\s*position: sticky;/);
    expect(css.slice(0, css.indexOf(comMouse))).not.toMatch(/position:\s*(sticky|fixed)/);
  });
  it('na B não há botão cheio: "Cadastrar pessoa" é ação de texto, e "Ver seu círculo" continua', () => {
    expect(pagina).not.toMatch(/class="botao"/);
    expect(pagina).toMatch(/<a class="acao" href="\/pessoas\/nova">Cadastrar pessoa<\/a>/);
    expect(pagina).toMatch(/\{temPagina && <a class="acao acao--quieta" href="\/circulo">Ver seu círculo<\/a>\}/);
  });
});

describe('a página da pessoa', () => {
  const pagina = ler('src/pages/pessoas/[id]/index.astro');
  const css = semComentario(ler('src/visual/telas/pessoa.css'));
  const celular = css.slice(0, css.indexOf('@media (min-width: 40rem)'));
  const alto = pagina.slice(pagina.indexOf('<header class="quem-e bloco">'), pagina.indexOf('</header>', pagina.indexOf('<header class="quem-e bloco">')));

  it('o atalho da voz só aparece, e só conta, com os áudios que quem olha pode ouvir (P102)', () => {
    // A conta e a lista de baixo saem da mesma consulta, que já filtra pelo que a pessoa vê
    expect(pagina).toMatch(/const audiosDaPessoa = await listarAudiosDe\(usuario, pessoa\.id\);/);
    expect(alto).toMatch(/\{audiosDaPessoa\.length > 0 && \(\s*<p class="quem-e__voz">\s*<a class="acao" href="#audios">\s*Ouvir a voz de \{chamar\} · \{plural\(audiosDaPessoa\.length, 'áudio', 'áudios'\)\}/);
    expect(pagina).toMatch(/<section class="voz__audios" id="audios"/);
    const consulta = ler('src/lib/servidor/repositorio.ts');
    const audios = consulta.slice(consulta.indexOf('export async function listarAudiosDe'), consulta.indexOf('// --- Tamanho do banco'));
    expect(audios).toMatch(/a\.removido_em IS NULL AND r\.por = \?2 AND r\.situacao = 'publicada' AND m\.situacao = 'publicada' AND \$\{FILTRO_VISIVEL\}/);
  });
  it('no celular os laços ficam fechados numa linha, que abre no lugar; sem script, ficam abertos (P103)', () => {
    expect(pagina).toMatch(/<button class="lacos__abre" type="button" aria-expanded="false" aria-controls="lista-de-lacos" hidden>\s*Família e laços · \{plural\(genteNosLacos, 'pessoa', 'pessoas'\)\}/);
    expect(pagina).toMatch(/lacos\.setAttribute\('data-recolhe', ''\);/);
    expect(celular).toMatch(/\.lacos\[data-recolhe\]:not\(\[data-aberta\]\) \.lacos__grupos \{\s*display: none;/);
    // Sem o atributo que o script põe, nada some
    expect(celular).not.toMatch(/\n\.lacos__grupos \{[^}]*display: none/);
    // Fora do celular, a lista fica sempre à vista e o botão não aparece
    const computador = css.slice(css.indexOf('@media (min-width: 40rem)'), css.indexOf('@media (min-width: 62rem)'));
    expect(computador).toMatch(/\.lacos\[data-recolhe\]:not\(\[data-aberta\]\) \.lacos__grupos \{\s*display: grid;/);
    expect(computador).toMatch(/\.lacos \.lacos__abre \{\s*display: none;/);
  });
  it('o botão cheio é a memória nova; editar e a árvore são texto (P104)', () => {
    const acoes = alto.slice(alto.indexOf('<p class="quem-e__acoes">'));
    expect(acoes.match(/class="botao"/g)).toHaveLength(1);
    expect(acoes).toMatch(/<a class="botao" href=\{`\/nova\?com=\$\{pessoa\.id\}`\}>\s*Nova memória com \{comQuem\}/);
    expect(acoes).toMatch(/<a class="acao" href=\{`\/pessoas\/\$\{pessoa\.id\}\/editar`\}>/);
    expect(acoes.indexOf('class="botao"')).toBeLessThan(acoes.indexOf('/editar'));
  });
  it('o retrato ocupa três colunas no celular e fica na margem da página em toda largura (P105 e P106)', () => {
    expect(celular).toMatch(/\.quem-e \.quem-e__retrato \{\s*grid-column: 1 \/ span 3;/);
    const colunas = [...css.matchAll(/\.quem-e \.quem-e__retrato \{\s*grid-column: (\d+) \//g)].map((m) => m[1]);
    expect(colunas.length).toBeGreaterThanOrEqual(2);
    expect(new Set(colunas)).toEqual(new Set(['1']));
  });
  it('a própria página diz "você", tem "Nova memória com você" e leva a "Sua conta" (P107)', () => {
    expect(alto).toMatch(/<Carimbo itens=\{\[ehMinha && 'Você', especie, dosNucleos\.join\(' e '\), vida\]\} \/>/);
    expect(pagina).toMatch(/const comQuem = ehMinha \? 'você' : chamar;/);
    expect(alto).toMatch(/\{ehMinha && \(\s*<a class="acao acao--quieta" href="\/conta">\s*Sua conta/);
  });
  it('o nascimento entra no carimbo, sem rótulo (P108)', () => {
    expect(pagina).not.toMatch(/datasDeVida|quem-e__vida/);
    const vida = (v: Partial<Parameters<typeof vidaSemRotulo>[0]>) => vidaSemRotulo({ nascimentoAno: null, falecimentoAno: null, ...v });
    expect(vida({ nascimentoAno: 1999 })).toBe('1999');
    // O falecimento só entra para quem pediu em "Mostrar datas" (decisão do Gui, 17/11/2026)
    expect(vida({ nascimentoAno: 1942, falecimentoAno: 2019 })).toBe('1942');
    expect(vidaSemRotulo({ nascimentoAno: 1942, falecimentoAno: 2019 }, true)).toBe('1942 a 2019');
    expect(vida({ nascimentoAno: 1942, nascimentoMes: 5, nascimentoDia: 4 })).toBe('4 de maio de 1942');
    expect(vida({ nascimentoAno: 1930, falecido: true })).toBe('1930');
    expect(vidaSemRotulo({ nascimentoAno: 1930, falecimentoAno: null, falecido: true }, true)).toBe('1930 a ?');
    expect(vida({ falecimentoAno: 2010 })).toBe('');
    expect(vidaSemRotulo({ nascimentoAno: null, falecimentoAno: 2010 }, true)).toBe('até 2010');
    expect(vida({})).toBe('');
    expect(vida({ nascimentoAno: 1942 })).not.toMatch(/Nascimento|:/);
  });
});
