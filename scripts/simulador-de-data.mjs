// A regra 14 da guarda da produção (scripts/confere-producao.mjs): o simulador de data ("?hoje=AAAA-MM-DD")
// nunca vale na produção. Separada num módulo para o teste (testes/sala.test.ts) conferir cada recusa.
//
// - diaSimulado, em src/lib/sala.ts, começa recusando a produção: `if (ambiente === 'producao') return undefined;`
//   é a primeira linha da função, antes de ler o valor.
// - Só src/lib/servidor/dia-do-pedido.ts lê o "hoje" do endereço (searchParams.get('hoje')), e passa a
//   diaSimulado o ambiente do pedido (ambiente(), de src/lib/servidor/ambiente.ts), nunca um valor fixo.
//
// Desde a correção 8 da revisão R-AB, o resto do código é lido como árvore (scripts/codigo-lido.mjs, como as
// regras da D1f), e não pelo texto: qualquer leitura de "hoje" do endereço fora de dia-do-pedido.ts é recusada,
// em todas as formas que a revisão achou e nas vizinhas:
// - `.get('hoje')`, `.getAll('hoje')` e `.has('hoje')`, de qualquer objeto, com o nome escrito direto, numa
//   constante ou montado com `+`;
// - `.hoje` e `['hoje']` de algo que veio do endereço (`searchParams`, `new URLSearchParams`, `Object.fromEntries`
//   e `Object.entries` dele, `Array.from` e `[...]` dele, por variável), e `{ hoje }` desestruturado dele;
// - a comparação com "hoje" (`=== 'hoje'`, `case 'hoje'`), o jeito de achar o valor percorrendo os parâmetros;
// - importar diaSimulado (com qualquer nome local, ou por `import * as`) fora de dia-do-pedido.ts.
// O que não deu para ler como árvore (a marcação dos .astro) é lido como texto, com a regra de antes.
import { partes } from './codigo-lido.mjs';

const SO_CODIGO = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
export const ARQUIVO_DA_REGRA = 'src/lib/sala.ts';
export const ARQUIVO_DO_PEDIDO = 'src/lib/servidor/dia-do-pedido.ts';
const NOME = 'hoje';

// --- A árvore ---

const ehNo = (v) => v && typeof v === 'object' && typeof v.type === 'string';
function* percorrer(raiz) {
  const pilha = [raiz];
  while (pilha.length) {
    const no = pilha.pop();
    yield no;
    for (const chave of Object.keys(no)) {
      const v = no[chave];
      if (Array.isArray(v)) for (const x of v) ehNo(x) && pilha.push(x);
      else if (ehNo(v)) pilha.push(v);
    }
  }
}
const desembrulhar = (no) => {
  while (no && ['ParenthesizedExpression', 'TSAsExpression', 'TSNonNullExpression', 'TSSatisfiesExpression', 'TSTypeAssertion', 'ChainExpression', 'AwaitExpression'].includes(no.type)) no = no.expression ?? no.argument;
  return no;
};
const nomeDaPropriedade = (m) => (m.computed ? undefined : m.property?.name);

/** O que um arquivo lido sabe: as constantes de texto e o valor inicial de cada variável. */
function contexto(ast) {
  const iniciais = new Map();
  for (const no of percorrer(ast)) if (no.type === 'VariableDeclarator' && no.id?.type === 'Identifier' && no.init) iniciais.set(no.id.name, no.init);
  const texto = (no, vistos = new Set()) => {
    no = desembrulhar(no);
    if (!no) return undefined;
    if (no.type === 'Literal' && typeof no.value === 'string') return no.value;
    if (no.type === 'TemplateLiteral') return no.expressions.length === 0 ? no.quasis[0].value.cooked : undefined;
    if (no.type === 'BinaryExpression' && no.operator === '+') {
      const a = texto(no.left, vistos);
      const b = texto(no.right, vistos);
      return a !== undefined && b !== undefined ? a + b : undefined;
    }
    if (no.type === 'Identifier' && iniciais.has(no.name) && !vistos.has(no.name)) return texto(iniciais.get(no.name), new Set([...vistos, no.name]));
    return undefined;
  };
  /** A expressão vem dos parâmetros do endereço */
  const doEndereco = (no, vistos = new Set()) => {
    no = desembrulhar(no);
    if (!no) return false;
    if (no.type === 'MemberExpression') return nomeDaPropriedade(no) === 'searchParams' || doEndereco(no.object, vistos);
    if (no.type === 'NewExpression') return no.callee?.type === 'Identifier' && no.callee.name === 'URLSearchParams';
    if (no.type === 'CallExpression') return no.arguments.some((a) => doEndereco(a.type === 'SpreadElement' ? a.argument : a, vistos)) || (no.callee.type === 'MemberExpression' && doEndereco(no.callee.object, vistos));
    if (no.type === 'ArrayExpression') return no.elements.some((e) => e && doEndereco(e.type === 'SpreadElement' ? e.argument : e, vistos));
    if (no.type === 'Identifier') return iniciais.has(no.name) && !vistos.has(no.name) && doEndereco(iniciais.get(no.name), new Set([...vistos, no.name]));
    return false;
  };
  return { texto, doEndereco };
}

/** As leituras de "hoje" do endereço e as importações de diaSimulado num trecho lido como árvore. */
function leiturasNaArvore(ast) {
  const { texto, doEndereco } = contexto(ast);
  const achados = [];
  const modulosDaRegra = (fonte) => typeof fonte === 'string' && /(^|\/)sala(\.ts)?$/.test(fonte);
  const todosDaRegra = new Set();
  for (const no of percorrer(ast)) {
    if (no.type === 'CallExpression') {
      const quem = desembrulhar(no.callee);
      if (quem?.type === 'MemberExpression' && ['get', 'getAll', 'has'].includes(nomeDaPropriedade(quem)) && texto(no.arguments[0]) === NOME) achados.push(`.${nomeDaPropriedade(quem)}('hoje')`);
    } else if (no.type === 'MemberExpression') {
      const nome = no.computed ? texto(no.property) : nomeDaPropriedade(no);
      if (nome === NOME && doEndereco(no.object)) achados.push('o "hoje" de algo que veio do endereço');
      if (nomeDaPropriedade(no) === 'diaSimulado' && no.object?.type === 'Identifier' && todosDaRegra.has(no.object.name)) achados.push('diaSimulado');
    } else if (no.type === 'VariableDeclarator' && no.id?.type === 'ObjectPattern' && doEndereco(no.init)) {
      if (no.id.properties.some((p) => p.type === 'Property' && (p.computed ? texto(p.key) : (p.key?.name ?? p.key?.value)) === NOME)) achados.push('{ hoje } do endereço');
    } else if (no.type === 'BinaryExpression' && ['===', '==', '!==', '!='].includes(no.operator) && (texto(no.left) === NOME || texto(no.right) === NOME)) {
      achados.push("a comparação com 'hoje'");
    } else if (no.type === 'SwitchCase' && no.test && texto(no.test) === NOME) {
      achados.push("case 'hoje'");
    } else if (no.type === 'ImportDeclaration' && modulosDaRegra(no.source?.value)) {
      for (const s of no.specifiers) {
        if (s.type === 'ImportSpecifier' && (s.imported?.name ?? s.imported?.value) === 'diaSimulado') achados.push('diaSimulado');
        if (s.type === 'ImportNamespaceSpecifier') todosDaRegra.add(s.local.name);
      }
    } else if (no.type === 'ImportExpression' && modulosDaRegra(no.source?.value)) {
      achados.push('diaSimulado');
    }
  }
  // `import * as regra` percorrido antes do uso: confere de novo os usos do nome
  if (todosDaRegra.size)
    for (const no of percorrer(ast)) if (no.type === 'MemberExpression' && nomeDaPropriedade(no) === 'diaSimulado' && no.object?.type === 'Identifier' && todosDaRegra.has(no.object.name)) achados.push('diaSimulado');
  return achados;
}

/** O que quebra a regra, em frases para a guarda. `ler` lê um arquivo do repositório; `arquivos`, os versionados. */
export function problemasDoSimuladorDeData(ler, arquivos) {
  const problemas = [];
  const regra = SO_CODIGO(ler(ARQUIVO_DA_REGRA));
  if (!/export function diaSimulado\([^)]*\)[^{]*\{\s*if \(ambiente === 'producao'\) return undefined;/.test(regra)) {
    problemas.push(`${ARQUIVO_DA_REGRA}: diaSimulado começa recusando a produção (if (ambiente === 'producao') return undefined;).`);
  }
  const pedido = SO_CODIGO(ler(ARQUIVO_DO_PEDIDO));
  if (!/diaSimulado\(url\.searchParams\.get\('hoje'\), ambiente\(\)\)/.test(pedido) || !/import \{ ambiente \} from '\.\/ambiente';/.test(pedido)) {
    problemas.push(`${ARQUIVO_DO_PEDIDO}: o simulador de data recebe o ambiente do pedido (diaSimulado(url.searchParams.get('hoje'), ambiente())).`);
  }
  for (const arquivo of arquivos.filter((a) => /^src\/.*\.(ts|astro|mjs|js)$/.test(a) && a !== ARQUIVO_DO_PEDIDO)) {
    const { lidas, naoLidas } = partes(arquivo, ler(arquivo));
    const achados = new Set(lidas.flatMap(({ ast }) => leiturasNaArvore(ast)));
    // A marcação e o que não deu para ler: pelo texto
    for (const resto of naoLidas.map(SO_CODIGO)) {
      if (/\.(get|getAll|has)\(\s*['"`]hoje['"`]\s*\)|\[\s*['"`]hoje['"`]\s*\]/.test(resto)) achados.add("o 'hoje' do endereço");
      if (/\bdiaSimulado\(/.test(resto)) achados.add('diaSimulado');
    }
    for (const achado of achados) {
      problemas.push(
        achado === 'diaSimulado'
          ? `${arquivo}: só ${ARQUIVO_DO_PEDIDO} usa diaSimulado, com o ambiente do pedido.`
          : `${arquivo}: só ${ARQUIVO_DO_PEDIDO} lê o "hoje" do endereço (o simulador de data); aqui: ${achado}.`,
      );
    }
  }
  return problemas;
}
