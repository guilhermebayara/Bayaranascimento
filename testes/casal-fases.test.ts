// Namoro, ex e amizade: a fase decide, num registro só; as datas das fases com mês e dia; o aniversário de
// casamento no Início; e "Adicionar o que aconteceu depois" (decisões do Gui, 18/11/2026).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { proximidadePadrao } from '../src/lib/circulo';
import { exDoAmigo, rotuloDoCasalDoCoracao, separarAmizades, situacaoDoCasal } from '../src/lib/ex-casal';
import { lerFasesDoFormulario, lerJaDaFamilia } from '../src/lib/fases-do-formulario';
import { aniversariosDeCasamento, anosDeCasados } from '../src/lib/painel';
import { Familia, apareceComoCasal, apareceComoCoracao, comoOCasalAparece, periodosDasFases, type Casal, type Fase } from '../src/lib/parentesco';

const ler = (c: string) => readFileSync(c, 'utf8');
const fase = (tipo: Fase['tipo'], inicioAno: number | null = null, extra: Partial<Fase> = {}): Fase => ({ tipo, inicioAno, fimAno: null, ...extra });
let proximoId = 1;
const casal = (a: string, b: string, fases: Fase[], extra: Partial<Casal> = {}): Casal => ({ id: proximoId++, a, b, fases, visibilidade: 'todos', nucleos: [], criadoPor: a, ...extra });

const thiago = casal('giovanna', 'thiago', [fase('namoro', 2014), fase('separacao', 2016), fase('amizade', 2018)]);
const jean = casal('giovanna', 'jean', [fase('namoro', 2010), fase('separacao', 2012)]);
const bia = casal('bia', 'gui', [fase('namoro', 2024)]);
const renata = casal('gui', 'renata', [fase('namoro', 2017)], { jaDaFamilia: true });
const exMarido = casal('aguilar', 'elizete', [fase('casamento', 1985), fase('separacao', 2005)]);
const amigoDepoisDoCasamento = casal('davi', 'lia', [fase('casamento', 2000), fase('amizade')]);
const casados = casal('giovanna', 'lucas-magno', [fase('namoro', 2015), fase('casamento', 2020, { inicioMes: 12, inicioDia: 5 })]);

describe('a fase decide como o casal aparece', () => {
  it('noivado, casamento e união são família; namoro só com "já é da família"', () => {
    expect(comoOCasalAparece(casados)).toBe('casal');
    expect(comoOCasalAparece(casal('a', 'b', [fase('noivado')]))).toBe('casal');
    expect(comoOCasalAparece(casal('a', 'b', [fase('uniao')]))).toBe('casal');
    expect(comoOCasalAparece(bia)).toBe('namoro');
    expect(comoOCasalAparece(renata)).toBe('casal');
  });
  it('o ex que virou amigo é amizade, mesmo sem separação no meio ou sem ano', () => {
    expect(comoOCasalAparece(thiago)).toBe('amizade');
    expect(comoOCasalAparece(amigoDepoisDoCasamento)).toBe('amizade');
  });
  it('ex só quem foi da família; quem só namorou e terminou não é ex-casal', () => {
    expect(comoOCasalAparece(exMarido)).toBe('ex');
    expect(comoOCasalAparece(jean)).toBe('namoro-que-acabou');
    // O namoro longo marcado "já é da família" que terminou continua ex de verdade
    expect(comoOCasalAparece({ ...renata, fases: [fase('namoro', 2017), fase('separacao', 2025)] })).toBe('ex');
    expect(apareceComoCasal(jean)).toBe(false);
    expect(apareceComoCoracao(jean)).toBe(false);
    expect(apareceComoCoracao(bia)).toBe(true);
  });
  it('na árvore: casais e exes da família ficam; namoro e amizade viram laço do coração; o namoro que acabou sai', () => {
    const { casais, amizades } = separarAmizades([thiago, jean, bia, renata, exMarido, casados]);
    expect(casais.map((c) => c.b).sort()).toEqual(['elizete', 'lucas-magno', 'renata']);
    expect(amizades).toEqual([
      { a: 'giovanna', b: 'thiago', tipo: 'amizade' },
      { a: 'bia', b: 'gui', tipo: 'namoro' },
    ]);
  });
  it('a página da árvore usa o rótulo do laço de casal na ficha de quem não tem outro laço com quem olha', () => {
    const pagina = ler('src/pages/arvore.astro');
    expect(pagina).toContain("return casaisDoCoracao.find((c) => c.b === id)?.rotulo ?? '';");
    expect(pagina).toContain('rotuloDoCasalDoCoracao(tipo, achar(pessoa)?.tratamento ?? null, chamar(dono))');
    expect(rotuloDoCasalDoCoracao('namoro', 'ela', 'Gui')).toBe('namorada de Gui');
    expect(rotuloDoCasalDoCoracao('amizade', 'ele', 'Giovanna')).toBe('amigo de Giovanna');
    expect(rotuloDoCasalDoCoracao('amizade', null, 'Giovanna')).toBe('amigo ou amiga de Giovanna');
  });
});

describe('parentesco pela fase', () => {
  const tratamentos = new Map([['bia', 'ela'], ['renata', 'ela'], ['thiago', 'ele'], ['jean', 'ele'], ['elizete', 'ela'], ['aguilar', 'ele']] as const);
  const filiacoes = [{ filho: 'gui', responsavel: 'elizete', qualidade: 'biologica' as const }];
  const familia = new Familia(filiacoes, [thiago, jean, bia, renata, exMarido], new Map(tratamentos));
  it('o namoro é só entre os dois, como laço do coração: "namorada", sem virar nora de ninguém', () => {
    const r = familia.relacao('gui', 'bia')!;
    expect(r.texto).toBe('namorada');
    expect(r.caminho).toBe('A');
    expect(proximidadePadrao({ caminho: r.caminho })).toBe(proximidadePadrao({ doCoracao: true }));
    expect(familia.relacao('elizete', 'bia')).toBeUndefined();
  });
  it('o namoro "já é da família" passa adiante, como um casal', () => {
    expect(familia.relacao('gui', 'renata')!.caminho).toBe('C');
    expect(familia.relacao('elizete', 'renata')!.texto).toBe('nora');
  });
  it('o namoro que acabou sem ser da família não é parentesco; o ex da família continua ex', () => {
    expect(familia.relacao('giovanna', 'jean')).toBeUndefined();
    expect(familia.relacao('elizete', 'aguilar')!.texto).toBe('ex-marido');
    expect(familia.relacao('giovanna', 'thiago')!.texto).toBe('amigo');
  });
  it('na página, o amigo leva embaixo só o que foi no casal, pela fase mais adiantada e por como se referir', () => {
    expect(exDoAmigo(thiago, 'ele')).toBe('ex-namorado');
    expect(exDoAmigo(thiago, 'ela')).toBe('ex-namorada');
    expect(exDoAmigo(amigoDepoisDoCasamento, 'ele')).toBe('ex-marido');
    expect(exDoAmigo(amigoDepoisDoCasamento, null)).toBe('ex-marido ou ex-esposa');
    const pagina = (ler('src/pages/pessoas/[id]/index.astro') + ler('src/lib/servidor/pagina-da-pessoa.ts'));
    expect(pagina).toContain('viraramAmigos(c.casal) ? exDoAmigo(c.casal, achar(c.outro)?.tratamento ?? null) : historiaDoCasal(c.casal),');
  });
  it('a situação em editar e na página do laço', () => {
    expect(situacaoDoCasal(casados)).toBe('juntos');
    expect(situacaoDoCasal(bia)).toBe('namorando');
    expect(situacaoDoCasal(thiago)).toBe('hoje, amigos');
    expect(situacaoDoCasal(exMarido)).toBe('não estão mais juntos');
    expect(situacaoDoCasal(jean)).toBe('namoraram, não estão mais juntos');
  });
  it('o namoro e o ex que virou amigo não sugerem família a ninguém', () => {
    const api = ler('src/pages/api/lacos.ts');
    expect(api).toContain('const daFamilia = apareceComoCasal({ fases, jaDaFamilia });');
    expect(api).not.toContain("dados.get('terminou')");
  });
});

// Um FormData de mentira, com a mesma forma do que o navegador manda
const formulario = (pares: [string, string][]) => {
  const dados = new FormData();
  for (const [k, v] of pares) dados.append(k, v);
  return dados;
};

describe('as fases como chegam do formulário', () => {
  it('no cadastro, em linhas paralelas, com mês e dia opcionais; linha sem tipo é ignorada', () => {
    const lidas = lerFasesDoFormulario(
      formulario([
        ['faseTipo', 'casamento'], ['faseInicioAno', '1995'], ['faseInicioMes', '5'], ['faseInicioDia', '30'],
        ['faseTipo', 'separacao'], ['faseInicioAno', '2010'], ['faseInicioMes', ''], ['faseInicioDia', ''],
        ['faseTipo', ''], ['faseInicioAno', ''], ['faseInicioMes', ''], ['faseInicioDia', ''],
      ]),
    );
    expect(lidas).toEqual({
      fases: [
        { tipo: 'casamento', inicioAno: 1995, inicioMes: 5, inicioDia: 30, fimAno: null, fimMes: null, fimDia: null },
        { tipo: 'separacao', inicioAno: 2010, inicioMes: null, inicioDia: null, fimAno: null, fimMes: null, fimDia: null },
      ],
    });
  });
  it('na edição, numeradas, com "Remover esta fase" e os nomes antigos do ano ainda valendo', () => {
    const lidas = lerFasesDoFormulario(
      formulario([
        ['fase-0-tipo', 'namoro'], ['fase-0-inicio', '2010'],
        ['fase-1-tipo', 'noivado'], ['fase-1-inicioAno', '2012'], ['fase-1-remover', 'on'],
        ['fase-2-tipo', 'casamento'], ['fase-2-inicioAno', '2013'], ['fase-2-inicioMes', '2'], ['fase-2-inicioDia', '14'], ['fase-2-fimAno', '2020'],
      ]),
    );
    expect('fases' in lidas && lidas.fases.map((f) => [f.tipo, f.inicioAno, f.inicioMes, f.inicioDia, f.fimAno])).toEqual([
      ['namoro', 2010, null, null, null],
      ['casamento', 2013, 2, 14, 2020],
    ]);
  });
  it('recusa a data que não existe, o mês sem ano e o fim antes do começo', () => {
    expect(lerFasesDoFormulario(formulario([['faseTipo', 'casamento'], ['faseInicioAno', '2001'], ['faseInicioMes', '2'], ['faseInicioDia', '30']]))).toEqual({ erro: 'Casamento: essa data não existe no calendário.' });
    expect(lerFasesDoFormulario(formulario([['faseTipo', 'casamento'], ['faseInicioAno', ''], ['faseInicioMes', '2'], ['faseInicioDia', '']]))).toEqual({ erro: 'Casamento: informe pelo menos o ano.' });
    expect(lerFasesDoFormulario(formulario([['fase-0-tipo', 'casamento'], ['fase-0-inicioAno', '2001'], ['fase-0-inicioMes', '6'], ['fase-0-fimAno', '2001'], ['fase-0-fimMes', '3']]))).toEqual({ erro: 'Uma fase não pode terminar antes de começar.' });
    expect(lerFasesDoFormulario(formulario([['faseTipo', '']]))).toEqual({ erro: 'Informe pelo menos uma fase, como namoro ou casamento.' });
  });
  it('o dia sem mês não é guardado', () => {
    const lidas = lerFasesDoFormulario(formulario([['fase-0-tipo', 'namoro'], ['fase-0-inicioAno', '2001'], ['fase-0-inicioMes', ''], ['fase-0-inicioDia', '']]));
    expect('fases' in lidas && lidas.fases[0]).toMatchObject({ inicioMes: null, inicioDia: null });
  });
  it('"Já é da família" vale quando o formulário perguntou; sem a pergunta, fica como estava', () => {
    expect(lerJaDaFamilia(formulario([['jaDaFamiliaPergunta', '1'], ['jaDaFamilia', 'on']]), false)).toBe(true);
    expect(lerJaDaFamilia(formulario([['jaDaFamiliaPergunta', '1']]), true)).toBe(false);
    expect(lerJaDaFamilia(formulario([]), true)).toBe(true);
    expect(lerJaDaFamilia(formulario([]), undefined)).toBe(false);
  });
  it('a página do laço mostra as datas inteiras; o resto continua só com o ano', () => {
    expect(periodosDasFases(casados.fases, { completas: true })).toEqual(['2015 a 5 de dezembro de 2020', 'desde 5 de dezembro de 2020']);
    expect(periodosDasFases(casados.fases)).toEqual(['2015 a 2020', 'desde 2020']);
  });
});

describe('o formulário do casal', () => {
  const editar = ler('src/pages/pessoas/[id]/editar.astro');
  const depois = ler('src/components/formularios/FasesDepois.astro');
  const primeira = ler('src/components/formularios/PrimeiraFase.astro');
  it('"Adicionar o que aconteceu depois" é a ação no cadastro guiado, em "Adicionar casal" e em "Editar o casal"', () => {
    expect(editar).toContain('<FasesDepois id="guia-fase-depois" rotuloDaPrimeira="rotulo-fase-guia" />');
    expect(editar).toContain('<FasesDepois id={`fase-depois-${g.id}`} rotuloDaPrimeira="rotulo-fase-novo" />');
    expect(editar).toContain('<FasesDepois id={`fase-depois-${c.casal.id}`} numerada={c.casal.fases.length} />');
    expect(depois).toContain('data-mais-uma-fase hidden>Adicionar o que aconteceu depois</button>');
    expect(depois).toContain('data-tirar-fase hidden>Tirar esta linha</button>');
    // A data de cada linha é a de sempre, com mês e dia
    expect(depois).toContain('<CampoData prefixo={inicio(n)}');
    expect(editar).not.toMatch(/Já terminou|name="terminou"/);
  });
  it('"Como estão hoje?" só com o que é estar junto, e "Já é da família" só aparece com o namoro de hoje', () => {
    expect(primeira).toContain('<Opcoes nome="faseTipo" rotulo="Como estão hoje?" opcoes={DE_HOJE} valor="casamento" id={`rotulo-fase-${id}`} />');
    expect(primeira).toContain("marca.hidden = tipo !== 'namoro' || depois;");
    expect(primeira).toContain('<CampoData prefixo="faseInicio"');
    expect(editar).toContain("{faseAtual(c.casal)?.tipo === 'namoro' && <JaDaFamilia");
    expect(ler('src/components/formularios/JaDaFamilia.astro')).toContain('<input type="hidden" name="jaDaFamiliaPergunta" value="1" />');
  });
  it('na edição, a data de cada fase tem mês e dia, e o fim só fica onde já foi preenchido', () => {
    expect(editar).toContain('<CampoData prefixo={`fase-${n}-inicio`}');
    expect(editar).toMatch(/\{fase\.fimAno \? \(\s*<CampoData prefixo=\{`fase-\$\{n\}-fim`\}/);
  });
});

describe('as migrações e os exemplos', () => {
  const banco = ler('src/lib/servidor/banco.ts');
  it('a marca e as datas são colunas novas, nas migrações 100 e 101', () => {
    expect(banco).toContain("id: '100-namoro-da-familia',");
    expect(banco).toContain('ALTER TABLE casais ADD COLUMN ja_da_familia INTEGER NOT NULL DEFAULT 0');
    expect(banco).toContain("id: '101-datas-das-fases',");
    for (const coluna of ['inicio_mes', 'inicio_dia', 'fim_mes', 'fim_dia']) expect(banco).toContain(`ALTER TABLE casal_fases ADD COLUMN ${coluna} INTEGER`);
  });
  it('os casais de exemplo só entram fora da produção e da homologação', () => {
    const protecao = banco.indexOf('if (AMBIENTES_COM_EXEMPLOS.includes(ambiente())) {');
    expect(banco.indexOf('await semearCasaisDoCoracaoDeExemplo(db);')).toBeGreaterThan(protecao);
    expect(ler('src/lib/servidor/semente.ts')).toContain("const ja = await db.prepare(`SELECT 1 AS ok FROM integrantes WHERE id = 'ex-thiago'`).first();");
  });
});

describe('aniversário de casamento no Início', () => {
  const hoje = { ano: 2026, mes: 11, dia: 18 };
  const ninguem = () => false;
  const elizeteEAguilar = casal('aguilar', 'elizete', [fase('namoro', 1994), fase('casamento', 1996, { inicioMes: 12, inicioDia: 2 })]);
  it('só de casais com o casamento como fase de hoje, com dia e mês, e com os anos de casados', () => {
    const lista = aniversariosDeCasamento([elizeteEAguilar, casados, exMarido, bia], hoje, ninguem);
    expect(lista.map((l) => [l.casal.b, l.mes, l.dia, l.emDias, l.anos])).toEqual([
      ['elizete', 12, 2, 14, 30],
      ['lucas-magno', 12, 5, 17, 6],
    ]);
    expect(anosDeCasados(30)).toBe('30 anos de casados');
    expect(anosDeCasados(1)).toBe('1 ano de casados');
    expect(anosDeCasados(null)).toBe('aniversário de casamento');
  });
  it('sem dia e mês, separado, que virou amizade ou fora dos 30 dias, não entra', () => {
    const semDia = casal('a', 'b', [fase('casamento', 1990, { inicioMes: 12 })]);
    const longe = casal('a', 'c', [fase('casamento', 1990, { inicioMes: 3, inicioDia: 1 })]);
    expect(aniversariosDeCasamento([semDia, longe, exMarido, amigoDepoisDoCasamento], hoje, ninguem)).toEqual([]);
  });
  it('quem a pessoa não vê, o ex discreto ou fora e quem já faleceu tiram o casal', () => {
    expect(aniversariosDeCasamento([elizeteEAguilar], hoje, (id) => id === 'aguilar')).toEqual([]);
    const inicio = ler('src/pages/index.astro');
    expect(inicio).toContain('const sai = (id: string) => naoVe.has(id) || exesQueSaem.has(id) || !achar(id) || jaFaleceu(achar(id)!);');
    expect(inicio).toContain('const casamentos = aniversariosDeCasamento(casais, hoje, sai);');
    // Os casais chegam de listarCasais: só os que a pessoa vê
    expect(inicio).toContain('const casais = await listarCasais(usuario);');
  });
  it('sem o ano, entra sem a conta; o casamento que ainda vai acontecer não é aniversário', () => {
    const semAno = casal('a', 'b', [fase('casamento', null, { inicioMes: 12, inicioDia: 1 })]);
    expect(aniversariosDeCasamento([semAno], hoje, ninguem).map((l) => l.anos)).toEqual([null]);
    const esteAno = casal('a', 'b', [fase('casamento', 2026, { inicioMes: 12, inicioDia: 1 })]);
    expect(aniversariosDeCasamento([esteAno], hoje, ninguem)).toEqual([]);
    const ano29 = casal('a', 'b', [fase('casamento', 2000, { inicioMes: 2, inicioDia: 29 })]);
    expect(aniversariosDeCasamento([ano29], { ano: 2027, mes: 2, dia: 20 }, ninguem)[0]).toMatchObject({ dia: 28, anos: 27 });
  });
});
