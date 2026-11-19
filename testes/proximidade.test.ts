// A proximidade em todo lugar (decisões do Gui, 18/11/2026; docs/decisoes.md, "Círculo" e "Formulários de
// pessoa e laço"): o slider vai do mais distante, à esquerda, ao mais próximo, à direita, no círculo, na
// ficha e nos formulários; o laço do coração usa o mesmo slider; e a edição dos laços ajusta a proximidade
// de todo laço de quem está logado, que só ele vê. As contas, o texto das telas e as rotas de verdade sobre
// o banco SQLite em memória.
import { describe, expect, it, vi } from 'vitest';
import { TRECHO_DE_FORA, faixasDoSlider, lugarNoSlider, minimoDoSlider, porcentagemNoSlider, posicaoDoLugar } from '../src/lib/circulo';
import { FAIXAS, FORA_DO_CIRCULO, faixaDoValor, nomeDaProximidade, pontasDoSlider, posicaoDoSlider, posicaoMinima, proximidadeDoFormulario, valorDaPosicao } from '../src/lib/circulo';
import { temSqlite, type D1DeTeste } from './apoio/d1';

const fs = 'node:fs';
const { readFileSync, readdirSync, statSync } = (await import(/* @vite-ignore */ fs)) as {
  readFileSync: (caminho: URL, codificacao: string) => string;
  readdirSync: (caminho: URL) => string[];
  statSync: (caminho: URL) => { isDirectory(): boolean };
};
const url = (caminho: string) => new URL(`../${caminho.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`, import.meta.url);
const ler = (caminho: string) => readFileSync(url(caminho), 'utf8');
const arquivos = (pasta: string): string[] =>
  readdirSync(url(pasta)).flatMap((nome) => (statSync(url(`${pasta}/${nome}`)).isDirectory() ? arquivos(`${pasta}/${nome}`) : [`${pasta}/${nome}`]));

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

describe('o slider vai do mais distante ao mais próximo', () => {
  it('a ponta esquerda é fora do círculo, e a direita, colada no centro', () => {
    expect(valorDaPosicao(0)).toBe(FORA_DO_CIRCULO);
    expect(valorDaPosicao(100)).toBe(0);
    expect(nomeDaProximidade(valorDaPosicao(0))).toBe('Fora do círculo');
    expect(nomeDaProximidade(valorDaPosicao(100))).toBe('Muito próximo');
    expect(nomeDaProximidade(valorDaPosicao(1))).toBe('Conhecido');
  });

  it('andar para a direita (seta para a direita ou para cima) sempre aproxima', () => {
    for (let p = 1; p <= 100; p++) expect(valorDaPosicao(p), String(p)).toBeLessThan(valorDaPosicao(p - 1));
    // E as faixas aparecem na ordem: fora, conhecido, próximo, muito próximo
    const ordem = [...new Set(Array.from({ length: 101 }, (_, p) => nomeDaProximidade(valorDaPosicao(p))))];
    expect(ordem).toEqual(['Fora do círculo', ...[...FAIXAS].reverse().map((f) => f.nome)]);
  });

  it('a posição e o valor guardado vão e voltam sem perder nada: o banco continua o mesmo', () => {
    for (let v = 0; v <= FORA_DO_CIRCULO; v++) expect(valorDaPosicao(posicaoDoSlider(v))).toBe(v);
    expect(faixaDoValor(valorDaPosicao(posicaoDoSlider(16)))!.nome).toBe('Muito próximo');
  });

  it('onde fora do círculo não é opção, o slider começa em Conhecido', () => {
    expect(posicaoMinima(true)).toBe(0);
    expect(posicaoMinima(false)).toBe(1);
    expect(pontasDoSlider(true)).toEqual(['Fora do círculo', 'Muito próximo']);
    expect(pontasDoSlider(false)).toEqual(['Conhecido', 'Muito próximo']);
  });

  it('não mexer é não dizer: o slider sempre tem um valor', () => {
    expect(proximidadeDoFormulario(null, null)).toEqual({ mexeu: false });
    expect(proximidadeDoFormulario('', '40')).toEqual({ mexeu: false });
    expect(proximidadeDoFormulario('50', '50')).toEqual({ mexeu: false });
    expect(proximidadeDoFormulario('90', '50')).toEqual({ mexeu: true, valor: 10 });
    // Sem a posição de antes (guardando sozinho, no lugar), toda posição vale
    expect(proximidadeDoFormulario('50', null)).toEqual({ mexeu: true, valor: 50 });
    expect(proximidadeDoFormulario('0', '50')).toEqual({ mexeu: true, valor: 100 });
    expect(proximidadeDoFormulario('0', '50', false)).toHaveProperty('erro');
    for (const ruim of ['101', '-14', 'abc', '1.5']) expect(proximidadeDoFormulario(ruim, '50'), ruim).toHaveProperty('erro');
    // O trecho de fora inteiro é a posição 0: qualquer lugar dele manda "Fora do círculo", e só onde é opção
    expect(proximidadeDoFormulario('-6', '50')).toEqual({ mexeu: true, valor: 100 });
    expect(proximidadeDoFormulario('-6', '-6')).toEqual({ mexeu: false });
    expect(proximidadeDoFormulario('-6', '50', false)).toHaveProperty('erro');
  });
});

describe('o mesmo slider em todo lugar', () => {
  const cliente = ler('src/lib/cliente/circulo.ts');
  const campo = ler('src/components/formularios/CampoProximidade.astro');

  it('a régua com os nomes (proposta A, escolha do Gui de 18/11/2026): livre, com marcas onde a faixa muda', () => {
    // Com fora: um trecho à parte, e o botão assenta no meio dele
    expect(minimoDoSlider(true)).toBe(-TRECHO_DE_FORA);
    expect(minimoDoSlider(false)).toBe(1);
    expect(lugarNoSlider(100, true)).toBe(-6);
    expect(lugarNoSlider(100, false)).toBe(1);
    expect(lugarNoSlider(50, true)).toBe(50);
    for (let lugar = -TRECHO_DE_FORA; lugar <= 0; lugar++) expect(posicaoDoLugar(lugar)).toBe(0);
    // Os nomes, da esquerda para a direita, e cada marca no fim da faixa dela
    const comFora = faixasDoSlider(true);
    expect(comFora.map((f) => f.curto)).toEqual(['Fora', 'Conhecido', 'Próximo', 'Muito próximo']);
    expect(faixasDoSlider(false).map((f) => f.nome)).toEqual(['Conhecido', 'Próximo', 'Muito próximo']);
    for (const fora of [true, false]) {
      const faixas = faixasDoSlider(fora);
      // Em cada trecho, o lugar do meio dele tem o nome que está escrito embaixo
      let de = minimoDoSlider(fora);
      for (const f of faixas) {
        const ate = de + f.largura;
        const meio = Math.round((de + ate) / 2);
        expect(nomeDaProximidade(valorDaPosicao(posicaoDoLugar(meio))), `${f.nome} ${meio}`).toBe(f.nome);
        expect(f.ate).toBeCloseTo(porcentagemNoSlider(ate, fora), 0);
        de = ate;
      }
      expect(faixas.at(-1)!.ate).toBe(100);
    }
  });

  it('no círculo e nos formulários é a mesma peça, com um range de verdade por baixo', () => {
    const peca = ler('src/components/visual/Proximidade.astro');
    expect(peca).toMatch(/<input type="range" id=\{id\} name=\{nome\} min=\{minimoDoSlider\(comFora\)\} max="100" step="1" value=\{lugar\} aria-valuetext=\{faixa\}/);
    // As pontas não têm mais texto: o nome de cada faixa fica embaixo do trecho dela
    expect(peca).not.toMatch(/pontasDoSlider/);
    expect(peca).toMatch(/<span data-faixa=\{f\.nome\} data-atual=/);
    expect(campo).toMatch(/<Proximidade id=\{id\} valor=\{valor\} comFora=\{comFora\} rotulo=\{rotulo\} nome="posicao"/);
    expect(campo).toMatch(/<input type="hidden" name="posicaoAntes" value=\{lugarNoSlider\(valor, comFora\)\} \/>/);
    expect(cliente).toMatch(/criarProximidade\('proximidade-da-ficha', Number\(botao\.dataset\.valor\)\)/);
    expect(cliente).toMatch(/por\(botao, valorDaPosicao\(posicaoDoLugar\(Number\(slider\.value\)\)\)\);/);
    expect(cliente).not.toMatch(/'Perto'|pontasDoSlider/);
    const script = ler('src/lib/cliente/proximidade.ts');
    expect(script).toMatch(/slider\.setAttribute\('aria-valuetext', nome\);/);
    // O preenchimento sai do preto: a cor viva da família da tela
    const css = ler('src/visual/pecas.css');
    expect(css).toMatch(/\.prox__cheio \{[^}]*background: var\(--vivo\);/);
    expect(css).not.toMatch(/\.prox[^{]*\{[^}]*accent-color/);
    expect(css).toMatch(/\.prox:has\(input:focus-visible\) \{\s*outline: 2px solid var\(--tinta\);/);
  });

  it('nenhum outro slider de proximidade no site: todo range passa pelas mesmas contas', () => {
    const comRange = arquivos('src').filter((a) => /\.(astro|ts)$/.test(a) && /type[=:]\s*["']range["']/.test(ler(a)));
    for (const a of comRange) expect(['src/lib/cliente/proximidade.ts', 'src/components/visual/Proximidade.astro', 'src/components/CampoRetrato.astro'], a).toContain(a);
  });

  it('o laço do coração troca a escolha de faixa pelo slider, no cadastro guiado e no "Adicionar"', () => {
    const editar = ler('src/pages/pessoas/[id]/editar.astro');
    expect(editar).not.toMatch(/nome="proximidade"/);
    expect(editar.match(/<CampoProximidade /g)).toHaveLength(2);
    for (const m of editar.matchAll(/<CampoProximidade [^>]*\/>/g)) expect(m[0]).toContain('comFora={false}');
  });

  it('"Com quem?" saiu do laço do coração: a pergunta diz o que fazer', () => {
    const editar = ler('src/pages/pessoas/[id]/editar.astro');
    expect(editar).not.toMatch(/<span>Com quem\?<\/span>/);
    expect(editar).toContain('<span data-rotulo-para="eu">Quem é do seu coração?</span>');
    expect(editar).toContain('Procure pelo nome. Quem ainda não está no acervo é cadastrado na hora.');
  });
});

describe('a proximidade em todo laço meu, só de quem está logado', () => {
  const editar = ler('src/pages/pessoas/[id]/editar.astro');
  const bloco = ler('src/components/formularios/ProximidadeDoLaco.astro');

  it('os valores vêm do círculo de quem está logado, e de mais ninguém', () => {
    expect(editar).toMatch(/const proximidades = await proximidadesDoCirculo\(usuario\);/);
    expect(ler('src/lib/servidor/circulo.ts')).toMatch(/export async function proximidadesDoCirculo\(usuario: Usuario\)[^]*?const circulo = await montarCirculo\(usuario\);/);
    expect(editar).not.toMatch(/FROM proximidades|listarProximidades/);
  });

  it('na própria página, em todo grupo; na de outra pessoa, só o laço com ela', () => {
    expect(editar).toContain("const minhaProximidade = (id: string, grupo: string) => (grupo === 'coracao' || ehMinha || id === pessoa.id ? proximidades.get(id) : undefined);");
    for (const grupo of ['pais', 'casal', 'filhos', 'coracao', 'parentes']) expect(editar).toContain(`id={\`proximidade-${grupo}-$`);
    // Os laços do coração de outras pessoas (o que os administradores mudam) não mostram proximidade nenhuma
    const outros = editar.slice(editar.indexOf("{g.id === 'outros' && lacosDeOutros.map("), editar.indexOf('{/* Adicionar mora no grupo'));
    expect(outros).not.toMatch(/Proximidade|proximidade/);
    // Na página de outra pessoa sem laço do coração com ela, um cartão só para a proximidade com ela
    expect(editar).toMatch(/\{!ehMinha && !meusLacos\.some\(\(l\) => l\.pessoa === pessoa\.id\) && minhaProximidade\(pessoa\.id, 'pessoa'\) && \(/);
  });

  it('guarda no lugar, sem recarregar, pela rota do círculo; sem script, é o formulário comum', () => {
    expect(bloco).toMatch(/<form method="post" action="\/api\/circulo" class="proximidade-do-laco" data-proximidade-no-lugar data-no-lugar=\{regiao\}>/);
    expect(bloco).not.toMatch(/name="dono"/);
    expect(bloco).toMatch(/<div class="acoes" data-salvar-proximidade><button class="botao botao--leve" type="submit">Salvar a proximidade<\/button><\/div>/);
    const script = ler('src/lib/cliente/proximidade.ts');
    expect(script).toMatch(/form\.requestSubmit\(\);/);
    expect(script).toMatch(/form\.querySelector\('input\[name="posicaoAntes"\]'\)\?\.remove\(\);/);
    // A linha do laço é uma região: a faixa nova aparece nela sem recarregar
    expect(editar.match(/data-regiao=\{`proximidade-\$\{/g)!.length).toBeGreaterThanOrEqual(4);
    // O que guarda no lugar não leva a ficha não salva para a próxima página
    expect(editar).toContain("if (outro === ficha || outro.hasAttribute('data-no-lugar')) continue;");
  });
});

describe.skipIf(!comSqlite)('pelas rotas, sobre o banco', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const circulo = await import('../src/pages/api/circulo');
  const lacos = await import('../src/pages/api/lacos');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const sql = (texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...v);
  const linha = <T>(texto: string, ...v: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...v) as T;
  const eu: Usuario = { pessoa: 'p-eu', nome: 'Eu', admin: false, nucleos: ['bayara-nascimento'] };
  const outra: Usuario = { pessoa: 'p-outra', nome: 'Outra', admin: false, nucleos: ['bayara-nascimento'] };
  sql(`INSERT INTO integrantes (id, nome, criado_por) VALUES ('p-eu', 'Eu', 'gui'), ('p-mae', 'Mãe', 'gui'), ('p-outra', 'Outra', 'gui'), ('p-amiga', 'Amiga', 'gui'), ('p-segredo', 'Segredo', 'gui'), ('p-solta', 'Solta', 'gui')`);
  sql(`INSERT INTO nucleo_membros (nucleo_id, integrante_id, papel) VALUES ('bayara-nascimento', 'p-eu', 'membro'), ('bayara-nascimento', 'p-mae', 'membro'), ('bayara-nascimento', 'p-outra', 'membro')`);
  sql(`INSERT INTO filiacoes (filho_id, responsavel_id, qualidade) VALUES ('p-eu', 'p-mae', 'biologica')`);
  // A Amiga é do coração da pessoa logada; o Segredo só existe num laço "só eu vejo" da Outra
  sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, papel, proximidade, privado) VALUES ('p-eu', 'p-amiga', 'amiga', NULL, 2, 0)`);
  sql(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, papel, proximidade, privado) VALUES ('p-outra', 'p-segredo', 'amigo', NULL, NULL, 1)`);

  const enviar = async (rota: typeof circulo, caminho: string, quem: Usuario, campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    const request = new Request(`http://localhost${caminho}`, { method: 'POST', headers: { Origin: 'http://localhost' }, body: f });
    const r = await rota.POST({ request, locals: { usuario: quem } } as never);
    return decodeURIComponent((r.headers.get('Location') ?? '').replace(/\+/g, ' '));
  };
  const proximidade = (dono: string, pessoa: string) => linha<{ valor: number } | undefined>(`SELECT valor FROM proximidades WHERE dono_id = ? AND pessoa_id = ?`, dono, pessoa)?.valor;

  it('a proximidade da mãe, pela edição dos laços, vai para o círculo de quem está logado', async () => {
    const volta = await enviar(circulo, '/api/circulo', eu, { pessoa: 'p-mae', posicao: '95', volta: '/pessoas/p-eu/editar#lacos' });
    expect(volta).toMatch(/^\/pessoas\/p-eu\/editar\?ok=Proximidade de Mãe guardada: muito próximo\.#lacos$/);
    expect(proximidade('p-eu', 'p-mae')).toBe(5);
    // De mais ninguém: a Outra não ganhou proximidade nenhuma
    expect(proximidade('p-outra', 'p-mae')).toBeUndefined();
  });

  it('o pedido não escolhe de quem é o círculo', async () => {
    await enviar(circulo, '/api/circulo', eu, { pessoa: 'p-mae', posicao: '70', dono: 'p-outra', volta: '/pessoas/p-eu/editar' });
    expect(proximidade('p-eu', 'p-mae')).toBe(30);
    expect(proximidade('p-outra', 'p-mae')).toBeUndefined();
  });

  it('sem mexer no slider, nada muda', async () => {
    await enviar(circulo, '/api/circulo', eu, { pessoa: 'p-mae', posicao: '20', posicaoAntes: '20', volta: '/pessoas/p-eu/editar' });
    expect(proximidade('p-eu', 'p-mae')).toBe(30);
  });

  it('quem não está no círculo, quem não existe e quem só existe no laço privado de outra pessoa têm a mesma resposta', async () => {
    const respostas = await Promise.all(['p-solta', 'p-nao-existe', 'p-segredo'].map((pessoa) => enviar(circulo, '/api/circulo', eu, { pessoa, posicao: '50', volta: '/pessoas' })));
    expect(new Set(respostas)).toEqual(new Set(['/pessoas?erro=Essa pessoa não está no seu círculo.']));
    expect(linha<{ n: number }>(`SELECT COUNT(*) AS n FROM proximidades WHERE pessoa_id IN ('p-solta', 'p-nao-existe', 'p-segredo')`).n).toBe(0);
  });

  it('a proximidade de um laço do coração leva junto a faixa antiga do laço', async () => {
    await enviar(circulo, '/api/circulo', eu, { pessoa: 'p-amiga', posicao: '80', volta: '/pessoas/p-eu/editar' });
    expect(proximidade('p-eu', 'p-amiga')).toBe(20);
    expect(linha<{ proximidade: number }>(`SELECT proximidade FROM lacos_coracao WHERE dono_id = 'p-eu' AND pessoa_id = 'p-amiga'`).proximidade).toBe(1);
  });

  it('salvar o laço do coração sem o slider (a edição) não mexe na faixa nem no círculo', async () => {
    const volta = await enviar(lacos, '/api/lacos', eu, { acao: 'coracao-salvar', pessoa: 'p-amiga', nomeDoLaco: 'amiga de infância', volta: '/pessoas/p-eu/editar' });
    expect(volta).toContain('ok=');
    expect(linha(`SELECT nome, proximidade FROM lacos_coracao WHERE dono_id = 'p-eu' AND pessoa_id = 'p-amiga'`)).toEqual({ nome: 'amiga de infância', proximidade: 1 });
    expect(proximidade('p-eu', 'p-amiga')).toBe(20);
  });

  it('o laço do coração novo, com o slider mexido, grava o mesmo valor do círculo e a faixa', async () => {
    await enviar(lacos, '/api/lacos', outra, { acao: 'adicionar', laco: 'coracao', reconhece: 'eu', sujeito: 'p-outra', pessoa: 'p-mae', nomeDoLaco: 'comadre', posicao: '40', posicaoAntes: '50', volta: '/pessoas/p-outra/editar' });
    expect(proximidade('p-outra', 'p-mae')).toBe(60);
    expect(linha<{ proximidade: number }>(`SELECT proximidade FROM lacos_coracao WHERE dono_id = 'p-outra' AND pessoa_id = 'p-mae'`).proximidade).toBe(2);
    // A da pessoa logada com a mesma mãe continua a dela
    expect(proximidade('p-eu', 'p-mae')).toBe(30);
  });

  it('sem mexer no slider, o laço novo não declara proximidade', async () => {
    await enviar(lacos, '/api/lacos', outra, { acao: 'adicionar', laco: 'coracao', reconhece: 'eu', sujeito: 'p-outra', pessoa: 'p-eu', nomeDoLaco: 'afilhado', posicao: '50', posicaoAntes: '50', volta: '/pessoas/p-outra/editar' });
    expect(linha<{ proximidade: number | null }>(`SELECT proximidade FROM lacos_coracao WHERE dono_id = 'p-outra' AND pessoa_id = 'p-eu'`).proximidade).toBeNull();
    expect(proximidade('p-outra', 'p-eu')).toBeUndefined();
  });

  it('o laço novo não começa fora do círculo', async () => {
    const volta = await enviar(lacos, '/api/lacos', outra, { acao: 'adicionar', laco: 'coracao', reconhece: 'eu', sujeito: 'p-outra', pessoa: 'p-amiga', nomeDoLaco: 'conhecida', posicao: '0', posicaoAntes: '50', volta: '/pessoas/p-outra/editar' });
    expect(volta).toContain('erro=A proximidade vai de Conhecido a Muito próximo.');
    expect(linha(`SELECT 1 AS sim FROM lacos_coracao WHERE dono_id = 'p-outra' AND pessoa_id = 'p-amiga'`)).toBeUndefined();
  });
});
