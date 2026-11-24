// A leitura do código pelas guardas (itens 3 a 5 da revisão D1f, 24/11/2026).
//
// As guardas das cópias e de apagar procuravam texto: o nome de quem chama .delete precisava conter "bucket",
// chaveDaCopia precisava aparecer com esse nome, e a importação precisava ter aspas simples. Com outro nome
// local, tudo passava. Aqui o código é lido como árvore (o analisador do rolldown, que já vem com o Astro), e
// cada valor é seguido até a origem:
// - uma importação, com qualquer nome local, aspas simples ou duplas, `import * as`, reexportação de outro
//   arquivo do projeto ou `await import(...)`, leva ao arquivo e ao nome de onde veio;
// - uma variável, a desestruturação, a atribuição depois, a função local e o que ela devolve, o parâmetro (pelo
//   tipo R2Bucket ou pelo que cada chamada passa a ele, inclusive de outro arquivo) levam ao valor de verdade;
// - um bucket é o que vem de bucketDeFotos, bucketDosExemplos ou bucketDeTesteParaGravar (de ambiente.ts) ou de
//   um `.FOTOS...` do env; um nome de cópia é o que vem de chaveDaCopia, chaveDaCopiaDoRetrato ou chavesDasCopias.
// Nos .astro, são lidos o cabeçalho (entre os ---) e cada <script>; o resto é marcação, devolvida à parte para
// as guardas lerem como texto.
//
// O que fica de fora (e quem cobre): um bucket guardado dentro de um objeto ou de uma lista e lido de volta
// por propriedade (`o.b.delete`), e o valor que passa por uma função de fora do projeto. As guardas recusam o
// `.delete` e o `.put` cujo dono não conseguem seguir apenas quando o arquivo também monta nome de cópia; fora
// disso, a regra do env (só ambiente.ts lê env.DB e env.FOTOS) e a revisão de código cobrem.
import { parseAst } from 'rolldown/parseAst';

export const AMBIENTE = 'src/lib/servidor/ambiente.ts';
/** As funções que devolvem um bucket, pela origem */
export const FUNCOES_DE_BUCKET = {
  [`${AMBIENTE}#bucketDeFotos`]: 'bucketDeFotos',
  [`${AMBIENTE}#bucketDosExemplos`]: 'bucketDosExemplos',
  [`${AMBIENTE}#bucketDeTesteParaGravar`]: 'bucketDeTesteParaGravar',
};
/** As funções que montam o nome de uma cópia, pela origem */
export const FUNCOES_DE_NOME_DE_COPIA = {
  'src/lib/copias-das-fotos.ts#chaveDaCopia': 'foto',
  'src/lib/copias-das-fotos.ts#chavesDasCopias': 'fotos',
  'src/lib/retratos.ts#chaveDaCopiaDoRetrato': 'retrato',
};

/** Um nome solto, sem declaração nem importação: o das funções conhecidas, e o env */
const SOLTOS = Object.fromEntries([
  ...Object.keys(FUNCOES_DE_BUCKET).map((o) => [o.split('#')[1], [{ tipo: 'funcao', origem: o }]]),
  ...Object.keys(FUNCOES_DE_NOME_DE_COPIA).map((o) => [o.split('#')[1], [{ tipo: 'funcao', origem: o }]]),
  ['env', [{ tipo: 'env' }]],
]);

// --- As partes de código de cada arquivo ---

const cacheDeLeitura = new Map();
const cacheDePreparo = new Map();

/** Lê um trecho de código; nada se não der para ler. */
function ler(codigo) {
  if (cacheDeLeitura.has(codigo)) return cacheDeLeitura.get(codigo);
  let ast = null;
  try {
    ast = parseAst(codigo, { lang: 'ts', sourceType: 'module' });
  } catch {
    ast = null;
  }
  cacheDeLeitura.set(codigo, ast);
  return ast;
}

/**
 * O cabeçalho de um .astro pode ter `return` fora de função (Astro.redirect). Para ler, as importações ficam no
 * alto e o resto vai para dentro de uma função, sem os `export`, com o mesmo tamanho para as posições baterem.
 */
function lerCabecalho(codigo) {
  const direto = ler(codigo);
  if (direto) return { ast: direto, codigo };
  const importacoes = [];
  const resto = codigo.replace(/^[ \t]*import\b(?:[^'"`;]|'[^']*'|"[^"]*")*?(?:from\s*)?(?:'[^']*'|"[^"]*")\s*;?/gm, (trecho) => {
    importacoes.push(trecho);
    return trecho.replace(/[^\n]/g, ' ');
  });
  const semExport = resto.replace(/^([ \t]*)export\s+(?=(const|let|var|function|async|class)\b)/gm, (t, recuo) => recuo + ' '.repeat(t.length - recuo.length));
  const embrulhado = `${importacoes.join('\n')}\nasync function __cabecalho_do_astro__() {\n${semExport}\n}`;
  const ast = ler(embrulhado);
  return ast ? { ast, codigo: embrulhado } : null;
}

/** As partes de código de um arquivo, já lidas, e o que não deu para ler (texto). */
export function partes(arquivo, texto) {
  if (!arquivo.endsWith('.astro')) {
    const ast = ler(texto);
    return ast ? { lidas: [{ ast, codigo: texto }], naoLidas: [] } : { lidas: [], naoLidas: [texto] };
  }
  const lidas = [];
  const naoLidas = [];
  let marcacao = texto;
  const cabecalho = /^\s*---\r?\n([\s\S]*?)\r?\n---/.exec(texto);
  if (cabecalho) {
    const lido = lerCabecalho(cabecalho[1]);
    if (lido) lidas.push(lido);
    else naoLidas.push(cabecalho[1]);
    marcacao = marcacao.replace(cabecalho[0], '');
  }
  marcacao = marcacao.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_, atributos, corpo) => {
    if (/type\s*=\s*["']application\/(ld\+)?json["']/i.test(atributos)) return '';
    const ast = ler(corpo);
    if (ast) lidas.push({ ast, codigo: corpo });
    else naoLidas.push(corpo);
    return '';
  });
  naoLidas.push(marcacao);
  return { lidas, naoLidas };
}

// --- Percorrer a árvore ---

const ehNo = (v) => v && typeof v === 'object' && typeof v.type === 'string';
function* filhos(no) {
  for (const chave of Object.keys(no)) {
    if (chave === 'typeAnnotation' || chave === 'returnType' || chave === 'typeArguments' || chave === 'typeParameters') continue;
    const v = no[chave];
    if (Array.isArray(v)) {
      for (const x of v) if (ehNo(x)) yield x;
    } else if (ehNo(v)) yield v;
  }
}
const FUNCOES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const desembrulhar = (no) => {
  while (no && ['ParenthesizedExpression', 'TSAsExpression', 'TSNonNullExpression', 'TSSatisfiesExpression', 'TSTypeAssertion', 'ChainExpression', 'AwaitExpression', 'TSInstantiationExpression'].includes(no.type)) no = no.expression ?? no.argument;
  return no;
};
/** O nome de uma propriedade: `a.b` e `a['b']` */
const nomeDaPropriedade = (membro) => (!membro.computed ? membro.property?.name : membro.property?.type === 'Literal' && typeof membro.property.value === 'string' ? membro.property.value : membro.property?.type === 'TemplateLiteral' && membro.property.expressions.length === 0 ? membro.property.quasis[0].value.cooked : undefined);
const nomeDaChave = (prop) => (prop.computed ? (prop.key?.type === 'Literal' ? String(prop.key.value) : undefined) : (prop.key?.name ?? (prop.key?.type === 'Literal' ? String(prop.key.value) : undefined)));

// --- O projeto ---

const juntarCaminho = (base, relativo) => {
  const partesDoCaminho = base.split('/').slice(0, -1);
  for (const p of relativo.split('/')) {
    if (p === '.' || p === '') continue;
    if (p === '..') partesDoCaminho.pop();
    else partesDoCaminho.push(p);
  }
  return partesDoCaminho.join('/');
};

/**
 * Lê o projeto ({ caminho: texto }) e devolve o que as guardas precisam: as chamadas de cada arquivo e o valor
 * de cada expressão, seguido até a origem.
 */
export function lerProjeto(fontes) {
  const arquivos = new Map();
  const resolver = (de, especificador) => {
    if (typeof especificador !== 'string') return null;
    if (!especificador.startsWith('.')) return `pacote:${especificador}`;
    const base = juntarCaminho(de, especificador);
    for (const c of [base, `${base}.ts`, `${base}.mjs`, `${base}.js`, `${base}.astro`, `${base}/index.ts`]) if (c in fontes) return c;
    return /\.\w+$/.test(base) ? base : `${base}.ts`;
  };

  // Escopos, declarações e chamadas de cada arquivo: a preparação só depende do próprio texto, e fica guardada
  for (const [arquivo, texto] of Object.entries(fontes)) {
    if (typeof texto !== 'string') continue;
    const chave = `${arquivo}\u0000${texto}`;
    let info = cacheDePreparo.get(chave);
    if (!info) {
      const { lidas, naoLidas } = partes(arquivo, texto);
      info = { arquivo, lidas, naoLidas, escopos: [], chamadas: [], membros: [], identificadores: [], exportacoes: new Map(), reexportaTudo: [], importacoes: [], funcoes: [], atribuicoes: [] };
      for (const parte of lidas) prepararParte(info, parte);
      cacheDePreparo.set(chave, info);
    }
    arquivos.set(arquivo, info);
  }

  // --- Os valores ---
  let memo = new WeakMap();
  const emAndamento = new Set();
  const chaveDoValor = (v) => `${v.tipo}|${v.qual ?? ''}|${v.origem ?? ''}|${v.modulo ?? ''}|${v.no ? `${v.arquivo}:${v.no.start}:${v.no.end}:${v.parte}` : ''}`;
  const unir = (listas) => {
    const vistos = new Map();
    for (const l of listas) for (const v of l) vistos.set(chaveDoValor(v), v);
    return [...vistos.values()];
  };

  /** O binding de um nome numa posição: o escopo mais de dentro que tem o nome */
  const binding = (info, parte, nome, pos) => {
    let escopo = parte.raiz;
    for (;;) {
      const dentro = escopo.filhos.find((f) => f.inicio <= pos && pos < f.fim);
      if (!dentro) break;
      escopo = dentro;
    }
    for (let e = escopo; e; e = e.pai) if (e.nomes.has(nome)) return e.nomes.get(nome);
    return null;
  };

  /** O que um arquivo exporta com este nome */
  const exportado = (modulo, nome, vistos = new Set()) => {
    const id = `${modulo}#${nome}`;
    const identidade = [{ tipo: 'funcao', origem: id }];
    if (FUNCOES_DE_BUCKET[id] || FUNCOES_DE_NOME_DE_COPIA[id]) return identidade;
    if (vistos.has(id)) return [];
    vistos.add(id);
    const info = arquivos.get(modulo);
    if (!info) return identidade;
    const exp = info.exportacoes.get(nome);
    if (exp) {
      if (exp.reexporta) return unir([identidade, exportado(resolver(modulo, exp.reexporta), exp.nome, vistos)]);
      return unir([identidade, avaliar(info, exp.parte, exp.no)]);
    }
    for (const outro of info.reexportaTudo.map((e) => resolver(modulo, e))) {
      const r = exportado(outro, nome, vistos);
      if (r.length > 1 || arquivos.get(outro)?.exportacoes.has(nome)) return unir([identidade, r]);
    }
    return identidade;
  };

  /** O valor de uma definição (import, variável, função, parâmetro, desestruturação) */
  const valorDaDefinicao = (info, parte, def) => {
    switch (def.tipo) {
      case 'import': {
        const modulo = resolver(info.arquivo, def.especificador);
        if (def.nome === '*') return [{ tipo: 'modulo', modulo }];
        if (modulo === 'pacote:cloudflare:workers' && def.nome === 'env') return [{ tipo: 'env' }];
        return exportado(modulo, def.nome);
      }
      case 'valor':
        return avaliar(info, parte, def.no);
      case 'funcao':
        return [{ tipo: 'funcaoLocal', arquivo: info.arquivo, parte: lidasIndex(info, parte), no: def.no }, ...(def.origem ? [{ tipo: 'funcao', origem: def.origem }] : [])];
      case 'parametro':
        return valorDoParametro(info, parte, def);
      case 'desestrutura':
        return propriedadeDe(avaliar(info, parte, def.fonte), def.chave, true);
      default:
        return [];
    }
  };
  const lidasIndex = (info, parte) => info.lidas.indexOf(parte);

  /** O que se lê de `valor.chave` */
  const propriedadeDe = (valores, chave, desestruturando = false) => {
    const r = [];
    if (chave !== undefined && /^FOTOS/.test(chave)) r.push({ tipo: 'bucket', qual: `env.${chave}` });
    for (const v of valores) {
      if (v.tipo === 'modulo' && chave !== undefined) r.push(...exportado(v.modulo, chave));
      if (v.tipo === 'env' && chave !== undefined && /^FOTOS/.test(chave)) r.push({ tipo: 'bucket', qual: `env.${chave}` });
      if (v.tipo === 'bucket' && (chave === 'delete' || chave === 'put')) r.push({ tipo: chave === 'delete' ? 'apagarDoBucket' : 'gravarNoBucket', qual: v.qual });
      if (v.tipo === 'bucket' && chave === undefined && desestruturando) r.push({ tipo: 'apagarDoBucket', qual: v.qual });
    }
    return unir([r]);
  };

  /** O que uma função (local ou de outro arquivo) devolve */
  // O que cada função devolve, uma vez por volta (a lembrança some com a de avaliar)
  let retornos = new WeakMap();
  const retornoDe = (alvo) => {
    const lembrado = retornos.get(alvo.no);
    if (lembrado?.has(alvo.arquivo)) return lembrado.get(alvo.arquivo);
    const r = retornoSemMemo(alvo);
    if (!lembrado) retornos.set(alvo.no, new Map([[alvo.arquivo, r]]));
    else lembrado.set(alvo.arquivo, r);
    return r;
  };
  const retornoSemMemo = (alvo) => {
    const info = arquivos.get(alvo.arquivo);
    const parte = info.lidas[alvo.parte];
    const no = alvo.no;
    if (no.type === 'ArrowFunctionExpression' && no.expression) return avaliar(info, parte, no.body);
    const retornos = [];
    const visitar = (n) => {
      if (n !== no && FUNCOES.has(n.type)) return;
      if (n.type === 'ReturnStatement' && n.argument) retornos.push(avaliar(info, parte, n.argument));
      for (const f of filhos(n)) visitar(f);
    };
    visitar(no.body ?? no);
    return unir(retornos);
  };

  /** Chamar algo: um bucket, um nome de cópia, o que a função devolve, ou o método do bucket */
  const chamar = (callee) => {
    const r = [];
    for (const v of callee) {
      if (v.tipo === 'funcao') {
        if (FUNCOES_DE_BUCKET[v.origem]) r.push({ tipo: 'bucket', qual: FUNCOES_DE_BUCKET[v.origem] });
        if (FUNCOES_DE_NOME_DE_COPIA[v.origem]) r.push({ tipo: 'nomeDeCopia', qual: FUNCOES_DE_NOME_DE_COPIA[v.origem] });
      }
      if (v.tipo === 'funcaoLocal') r.push(...retornoDe(v));
    }
    return unir([r]);
  };

  /** O valor de uma expressão, seguido até a origem */
  function avaliar(info, parte, no) {
    if (!no) return [];
    // O mesmo texto em dois arquivos divide a árvore: a lembrança é do nó em cada arquivo
    let doNo = memo.get(no);
    if (doNo?.has(info)) return doNo.get(info);
    if (emAndamento.has(no)) return [];
    emAndamento.add(no);
    const r = avaliarSemMemo(info, parte, no);
    emAndamento.delete(no);
    if (!doNo) memo.set(no, (doNo = new Map()));
    doNo.set(info, r);
    return r;
  }
  function avaliarSemMemo(info, parte, bruto) {
    const no = desembrulhar(bruto);
    if (!no) return [];
    switch (no.type) {
      case 'Identifier': {
        const b = binding(info, parte, no.name, no.start);
        // Sem declaração no arquivo (um trecho solto, nos testes): vale o nome das funções conhecidas
        if (!b) return Object.hasOwn(SOLTOS, no.name) ? SOLTOS[no.name] : [];
        return unir(b.defs.map((d) => valorDaDefinicao(info, parte, d)));
      }
      case 'MemberExpression':
        return propriedadeDe(avaliar(info, parte, no.object), nomeDaPropriedade(no));
      case 'CallExpression': {
        const callee = desembrulhar(no.callee);
        // `.bind(...)`, `.call(...)` e `.apply(...)` de um método do bucket ainda são o método
        if (callee?.type === 'MemberExpression' && ['bind'].includes(nomeDaPropriedade(callee))) {
          return avaliar(info, parte, callee.object).filter((v) => v.tipo === 'apagarDoBucket' || v.tipo === 'gravarNoBucket' || v.tipo === 'funcaoLocal' || v.tipo === 'funcao');
        }
        return chamar(avaliar(info, parte, no.callee));
      }
      case 'ImportExpression': {
        const fonte = desembrulhar(no.source);
        return fonte?.type === 'Literal' ? [{ tipo: 'modulo', modulo: resolver(info.arquivo, fonte.value) }] : [];
      }
      case 'ConditionalExpression':
        return unir([avaliar(info, parte, no.consequent), avaliar(info, parte, no.alternate)]);
      case 'LogicalExpression':
        return unir([avaliar(info, parte, no.left), avaliar(info, parte, no.right)]);
      case 'SequenceExpression':
        return avaliar(info, parte, no.expressions[no.expressions.length - 1]);
      case 'AssignmentExpression':
        return avaliar(info, parte, no.right);
      case 'TemplateLiteral':
        return unir(no.expressions.map((e) => avaliar(info, parte, e)).map((l) => l.filter((v) => v.tipo === 'nomeDeCopia')));
      case 'BinaryExpression':
        return unir([avaliar(info, parte, no.left), avaliar(info, parte, no.right)].map((l) => l.filter((v) => v.tipo === 'nomeDeCopia')));
      case 'ArrayExpression':
        return unir(no.elements.filter(Boolean).map((e) => avaliar(info, parte, e.type === 'SpreadElement' ? e.argument : e)));
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        return [{ tipo: 'funcaoLocal', arquivo: info.arquivo, parte: lidasIndex(info, parte), no }];
      default:
        return [];
    }
  }

  // --- Os parâmetros: pelo tipo, e pelo que cada chamada do projeto passa ---
  // O que as chamadas passam é juntado em voltas sobre todas as chamadas do projeto, até nada mudar: assim o
  // valor de um parâmetro nunca depende de uma leitura em andamento.
  const passadosAosParametros = new Map();
  const chaveDaFuncao = (v) => `${v.arquivo}:${v.parte}:${v.no.start}:${v.no.end}`;
  function valorDoParametro(info, parte, def) {
    const r = [];
    if (def.anotacao && /\bR2Bucket\b/.test(def.anotacao)) r.push({ tipo: 'bucket', qual: 'parametro' });
    const passados = passadosAosParametros.get(`${info.arquivo}:${lidasIndex(info, parte)}:${def.funcao.start}:${def.funcao.end}`)?.get(def.indice);
    if (passados) r.push(...passados.values());
    return unir([r]);
  }
  const INTERESSA = new Set(['bucket', 'apagarDoBucket', 'gravarNoBucket', 'nomeDeCopia', 'env', 'modulo']);
  const interessa = (v) => INTERESSA.has(v.tipo) || (v.tipo === 'funcao' && (FUNCOES_DE_BUCKET[v.origem] || FUNCOES_DE_NOME_DE_COPIA[v.origem]));
  const PERCORREM = new Set(['forEach', 'map', 'flatMap', 'filter', 'find', 'findLast', 'some', 'every', 'reduce']);
  /** Anota que o parâmetro `indice` da função recebe `v`; diz se é novo */
  const passar = (alvo, indice, v) => {
    const porIndice = passadosAosParametros.get(chaveDaFuncao(alvo)) ?? new Map();
    passadosAosParametros.set(chaveDaFuncao(alvo), porIndice);
    const lista = porIndice.get(indice) ?? new Map();
    porIndice.set(indice, lista);
    if (lista.has(chaveDoValor(v))) return false;
    lista.set(chaveDoValor(v), v);
    return true;
  };
  for (let volta = 0, mudou = true; mudou && volta < 6; volta++) {
    mudou = false;
    memo = new WeakMap();
    retornos = new WeakMap();
    for (const info of arquivos.values()) {
      for (const { parte, no } of info.chamadas) {
        // `lista.forEach((b) => ...)` e afins: o primeiro parâmetro da função recebe o que está na lista
        const callee = desembrulhar(no.callee);
        if (callee?.type === 'MemberExpression' && PERCORREM.has(nomeDaPropriedade(callee))) {
          const daLista = avaliar(info, parte, callee.object).filter(interessa);
          for (const argumento of no.arguments) {
            for (const alvo of avaliar(info, parte, argumento).filter((v) => v.tipo === 'funcaoLocal')) {
              for (const v of daLista) if (passar(alvo, 0, v)) mudou = true;
            }
          }
        }
        const alvos = avaliar(info, parte, no.callee).filter((v) => v.tipo === 'funcaoLocal');
        if (alvos.length === 0) continue;
        no.arguments.forEach((argumento, indice) => {
          const valores = avaliar(info, parte, argumento.type === 'SpreadElement' ? argumento.argument : argumento).filter(interessa);
          for (const alvo of alvos) for (const v of valores) if (passar(alvo, indice, v)) mudou = true;
        });
      }
    }
  }

  /** O trecho de código de um nó */
  const trecho = (parte, no) => parte.codigo.slice(no.start, no.end);

  return { arquivos, avaliar, trecho, nomeDaPropriedade, desembrulhar, resolver, exportado };
}

// --- Preparar uma parte: escopos, declarações, chamadas, membros e exportações ---

function prepararParte(info, parte) {
  const novoEscopo = (no, pai, ehFuncao) => {
    const e = { inicio: no.start, fim: no.end, pai, filhos: [], nomes: new Map(), ehFuncao };
    if (pai) pai.filhos.push(e);
    return e;
  };
  const raiz = novoEscopo({ start: 0, end: Infinity }, null, true);
  parte.raiz = raiz;
  const declarar = (escopo, nome, def) => {
    if (!escopo.nomes.has(nome)) escopo.nomes.set(nome, { defs: [] });
    escopo.nomes.get(nome).defs.push(def);
  };
  const daFuncao = (escopo) => {
    let e = escopo;
    while (!e.ehFuncao) e = e.pai;
    return e;
  };
  /** Declara os nomes de um padrão (variável, parâmetro), com o valor de onde vêm */
  const declararPadrao = (escopo, padrao, origem) => {
    if (!padrao) return;
    switch (padrao.type) {
      case 'Identifier':
        declarar(escopo, padrao.name, origem);
        break;
      case 'AssignmentPattern':
        declararPadrao(escopo, padrao.left, origem);
        if (origem.tipo === 'valor' || origem.tipo === 'desestrutura') declararPadrao(escopo, padrao.left, { tipo: 'valor', no: padrao.right });
        break;
      case 'ObjectPattern':
        for (const p of padrao.properties) {
          if (p.type === 'RestElement') declararPadrao(escopo, p.argument, { tipo: 'outro' });
          else {
            const fonte = origem.tipo === 'valor' ? origem.no : origem.tipo === 'desestrutura' ? null : null;
            const chave = nomeDaChave(p);
            declararPadrao(escopo, p.value, fonte ? { tipo: 'desestrutura', fonte, chave } : { tipo: 'outro' });
          }
        }
        break;
      case 'ArrayPattern':
        for (const e of padrao.elements) if (e) declararPadrao(escopo, e.type === 'RestElement' ? e.argument : e, origem.tipo === 'valor' ? { tipo: 'valor', no: origem.no } : { tipo: 'outro' });
        break;
      case 'RestElement':
        declararPadrao(escopo, padrao.argument, { tipo: 'outro' });
        break;
      default:
    }
  };
  const anotacaoDe = (p) => {
    const alvo = p.type === 'AssignmentPattern' ? p.left : p.type === 'TSParameterProperty' ? p.parameter : p;
    const t = alvo?.typeAnnotation;
    return t ? parte.codigo.slice(t.start, t.end) : '';
  };

  const visitar = (no, escopo, naFuncaoDoModulo) => {
    switch (no.type) {
      case 'ImportDeclaration': {
        info.importacoes.push({ fonte: no.source.value, no });
        for (const s of no.specifiers) {
          const nome = s.type === 'ImportNamespaceSpecifier' ? '*' : s.type === 'ImportDefaultSpecifier' ? 'default' : (s.imported.name ?? s.imported.value);
          declarar(raiz, s.local.name, { tipo: 'import', especificador: no.source.value, nome });
        }
        return;
      }
      case 'ExportNamedDeclaration': {
        if (no.source) {
          info.importacoes.push({ fonte: no.source.value, no });
          for (const s of no.specifiers) info.exportacoes.set(s.exported.name ?? s.exported.value, { reexporta: no.source.value, nome: s.local.name ?? s.local.value });
          return;
        }
        if (no.declaration) {
          const d = no.declaration;
          if (d.type === 'FunctionDeclaration' && d.id) info.exportacoes.set(d.id.name, { parte, no: d.id });
          if (d.type === 'VariableDeclaration') for (const v of d.declarations) if (v.id.type === 'Identifier') info.exportacoes.set(v.id.name, { parte, no: v.id });
          visitar(d, escopo, naFuncaoDoModulo);
        }
        for (const s of no.specifiers ?? []) info.exportacoes.set(s.exported.name ?? s.exported.value, { parte, no: s.local });
        return;
      }
      case 'ExportAllDeclaration':
        info.importacoes.push({ fonte: no.source.value, no });
        info.reexportaTudo.push(no.source.value);
        return;
      case 'ExportDefaultDeclaration':
        info.exportacoes.set('default', { parte, no: no.declaration.type === 'FunctionDeclaration' && no.declaration.id ? no.declaration.id : no.declaration });
        visitar(no.declaration, escopo, naFuncaoDoModulo);
        return;
      case 'VariableDeclaration': {
        const alvo = no.kind === 'var' ? daFuncao(escopo) : escopo;
        for (const d of no.declarations) {
          declararPadrao(alvo, d.id, d.init ? { tipo: 'valor', no: d.init } : { tipo: 'outro' });
          if (d.init) visitar(d.init, escopo, naFuncaoDoModulo);
        }
        return;
      }
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        if (no.type === 'FunctionDeclaration' && no.id) declarar(escopo, no.id.name, { tipo: 'funcao', no, origem: escopo === raiz ? `${info.arquivo}#${no.id.name}` : null });
        const proprio = novoEscopo(no, escopo, true);
        if (no.type === 'FunctionExpression' && no.id) declarar(proprio, no.id.name, { tipo: 'funcao', no });
        info.funcoes.push(no);
        no.params.forEach((p, indice) => {
          const def = { tipo: 'parametro', funcao: no, indice, anotacao: anotacaoDe(p), resto: p.type === 'RestElement' };
          declararPadrao(proprio, p.type === 'TSParameterProperty' ? p.parameter : p, def);
          if (p.type === 'AssignmentPattern') visitar(p.right, proprio, false);
        });
        if (no.body) visitar(no.body, proprio, false);
        return;
      }
      case 'BlockStatement':
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'SwitchStatement':
      case 'StaticBlock': {
        const bloco = novoEscopo(no, escopo, false);
        if (no.type === 'ForInStatement' || no.type === 'ForOfStatement') {
          if (no.left.type === 'VariableDeclaration') for (const d of no.left.declarations) declararPadrao(no.left.kind === 'var' ? daFuncao(escopo) : bloco, d.id, { tipo: 'outro' });
          visitar(no.right, bloco, naFuncaoDoModulo);
          visitar(no.body, bloco, naFuncaoDoModulo);
          return;
        }
        for (const f of filhos(no)) visitar(f, bloco, naFuncaoDoModulo);
        return;
      }
      case 'CatchClause': {
        const bloco = novoEscopo(no, escopo, false);
        if (no.param) declararPadrao(bloco, no.param, { tipo: 'outro' });
        visitar(no.body, bloco, naFuncaoDoModulo);
        return;
      }
      case 'ClassDeclaration':
        if (no.id) declarar(escopo, no.id.name, { tipo: 'outro' });
        break;
      case 'AssignmentExpression':
        if (no.left.type === 'Identifier') info.atribuicoes.push({ parte, nome: no.left.name, pos: no.start, no: no.right });
        else if (no.left.type === 'ObjectPattern' || no.left.type === 'ArrayPattern') info.atribuicoes.push({ parte, padrao: no.left, pos: no.start, no: no.right });
        break;
      case 'CallExpression':
        info.chamadas.push({ parte, no });
        break;
      case 'ImportExpression':
        info.importacoes.push({ fonte: no.source?.type === 'Literal' ? no.source.value : null, no, dinamica: true });
        break;
      case 'MemberExpression':
        info.membros.push({ parte, no });
        visitar(no.object, escopo, naFuncaoDoModulo);
        if (no.computed) visitar(no.property, escopo, naFuncaoDoModulo);
        return;
      case 'Property':
        if (no.computed) visitar(no.key, escopo, naFuncaoDoModulo);
        if (no.value && no.value !== no.key) visitar(no.value, escopo, naFuncaoDoModulo);
        else if (no.shorthand) visitar(no.value, escopo, naFuncaoDoModulo);
        return;
      case 'Identifier':
        info.identificadores.push({ parte, no });
        return;
      default:
    }
    for (const f of filhos(no)) visitar(f, escopo, naFuncaoDoModulo);
  };
  visitar(parte.ast, raiz, true);

  // As atribuições depois da declaração somam valores ao mesmo nome
  for (const a of info.atribuicoes.filter((x) => x.parte === parte)) {
    const escopoDe = (pos) => {
      let e = raiz;
      for (;;) {
        const dentro = e.filhos.find((f) => f.inicio <= pos && pos < f.fim);
        if (!dentro) return e;
        e = dentro;
      }
    };
    const declaraEm = (nome, def) => {
      for (let e = escopoDe(a.pos); e; e = e.pai) {
        if (e.nomes.has(nome)) {
          e.nomes.get(nome).defs.push(def);
          return;
        }
      }
      declarar(raiz, nome, def);
    };
    if (a.nome) declaraEm(a.nome, { tipo: 'valor', no: a.no });
    else {
      const nomes = [];
      const coletar = (p) => {
        if (!p) return;
        if (p.type === 'Identifier') nomes.push([p.name, null]);
        else if (p.type === 'ObjectPattern') for (const q of p.properties) q.type === 'RestElement' ? coletar(q.argument) : q.value.type === 'Identifier' ? nomes.push([q.value.name, nomeDaChave(q)]) : coletar(q.value);
        else if (p.type === 'ArrayPattern') p.elements.forEach(coletar);
        else if (p.type === 'AssignmentPattern') coletar(p.left);
        else if (p.type === 'RestElement') coletar(p.argument);
      };
      coletar(a.padrao);
      for (const [nome, chave] of nomes) declaraEm(nome, chave ? { tipo: 'desestrutura', fonte: a.no, chave } : { tipo: 'valor', no: a.no });
    }
  }
}

// --- O que as guardas perguntam ---

/** Todas as importações de um arquivo: estáticas, reexportações, dinâmicas e require. `fonte` nula: não dá para saber. */
export function importacoesDe(arquivo, texto) {
  const { lidas, naoLidas } = partes(arquivo, texto);
  const lista = [];
  const visitar = (no) => {
    if (no.type === 'ImportDeclaration' || no.type === 'ExportAllDeclaration' || (no.type === 'ExportNamedDeclaration' && no.source)) lista.push(no.source.value);
    if (no.type === 'ImportExpression') {
      const f = desembrulharFonte(no.source);
      lista.push(f);
    }
    if (no.type === 'CallExpression' && no.callee.type === 'Identifier' && no.callee.name === 'require') lista.push(desembrulharFonte(no.arguments[0]));
    for (const f of filhos(no)) visitar(f);
  };
  for (const p of lidas) visitar(p.ast);
  // Um .ts que não abre não foi lido; num .astro, a marcação fica de fora (não importa nada)
  return { importacoes: lista, lido: arquivo.endsWith('.astro') ? true : lidas.length > 0 };
}
const desembrulharFonte = (no) => {
  const n = desembrulhar(no);
  if (n?.type === 'Literal' && typeof n.value === 'string') return n.value;
  if (n?.type === 'TemplateLiteral' && n.expressions.length === 0) return n.quasis[0].value.cooked;
  return null;
};
