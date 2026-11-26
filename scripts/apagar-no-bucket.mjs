// Regras 10 e 10c da guarda da produção (scripts/confere-producao.mjs), à parte para os testes poderem dar a
// elas um código errado e ver a recusa (testes/guarda-apagar.test.ts).
//
// Nada se apaga do bucket das fotos de verdade: excluir nunca apaga na hora (docs/regras/site.md, "Estrutura e princípios").
// Só apagam a limpeza de 7 dias, e só no bucket de teste, por bucketDeTesteParaGravar(), que recusa a produção
// e a homologação; e a foto sem memória há mais de 30 dias, que um administrador apaga em
// src/pages/api/fotos-soltas.ts. Nessa rota saem, no mesmo pedido, a original e as cópias dela (sessão D1c,
// 23/11/2026), e só elas: os nomes vêm de chavesDasCopias, que só monta os nomes das cópias da foto.

//
// Desde a revisão D1f (item 3, 24/11/2026), a regra também lê a árvore do código (scripts/codigo-lido.mjs): o
// bucket é seguido até a origem (bucketDeFotos e os outros de ambiente.ts, ou um `.FOTOS` do env), com qualquer
// nome no meio, numa variável, desestruturado, devolvido por uma função do projeto ou passado a ela. Antes, o
// nome de quem chamava .delete precisava conter "bucket". As recusas pelo texto, de antes, continuam somadas.
import { lerProjeto } from './codigo-lido.mjs';

export const ROTA_DAS_FOTOS_SOLTAS = 'src/pages/api/fotos-soltas.ts';

/** O único jeito de apagar aceito na rota das fotos soltas: a original e as cópias dela, num pedido só. */
export const APAGAR_A_FOTO_SOLTA = 'await bucketDeFotos().delete([foto.chave, ...chavesDasCopias(foto.chave)]);';

const naOrdem = (texto, ...trechos) => trechos.every((t, i) => texto.indexOf(t) >= 0 && (i === 0 || texto.indexOf(t) > texto.indexOf(trechos[i - 1])));

/** O que este arquivo apaga sem poder, lido sozinho. Lista vazia: nada de errado. */
export function apagamentosProibidos(arquivo, texto) {
  return apagamentosProibidosNoProjeto({ [arquivo]: texto });
}

/** As condições da rota das fotos soltas, lidas no texto (iguais às de antes da revisão D1f). */
const condicoesDaFotoSolta = (arquivo, texto) =>
  arquivo === ROTA_DAS_FOTOS_SOLTAS &&
  (texto.match(/\.delete\(/g) ?? []).length === 1 &&
  texto.includes("import { chavesDasCopias } from '../../lib/copias-das-fotos';") &&
  naOrdem(texto, 'const decisao = podeApagarFotoSolta(locals.usuario);', 'if (!decisao.ok) return', 'const foto = await obterFotoSolta(', 'if (!foto) return', APAGAR_A_FOTO_SOLTA);

/** O que os arquivos dados ({ caminho: texto }) apagam sem poder, com o bucket seguido até a origem. */
export function apagamentosProibidosNoProjeto(fontes) {
  const falhas = [];
  for (const [arquivo, texto] of Object.entries(fontes)) falhas.push(...apagamentosPeloTexto(arquivo, texto));
  falhas.push(...apagamentosPelaArvore(fontes));
  return [...new Set(falhas)];
}

const MENSAGEM = (arquivo, quem) =>
  `${arquivo}: ${quem}.delete(...) apagaria arquivos. Só a limpeza do bucket de teste apaga, por bucketDeTesteParaGravar(), e a foto sem memória com as cópias dela, por ${ROTA_DAS_FOTOS_SOLTAS}.`;

/** Pela árvore: todo .delete de um bucket, chamado ou guardado para chamar depois, seguido até a origem. */
function apagamentosPelaArvore(fontes) {
  const falhas = [];
  const projeto = lerProjeto(fontes);
  for (const [arquivo, info] of projeto.arquivos) {
    const texto = fontes[arquivo];
    const usos = [];
    const chamados = new Set();
    for (const { parte, no } of info.chamadas) {
      chamados.add(projeto.desembrulhar(no.callee));
      const quais = projeto.avaliar(info, parte, no.callee).filter((v) => v.tipo === 'apagarDoBucket').map((v) => v.qual);
      if (quais.length) usos.push({ parte, no, quais, chamada: true });
    }
    for (const { parte, no } of info.membros) {
      if (chamados.has(no)) continue;
      const quais = projeto.avaliar(info, parte, no).filter((v) => v.tipo === 'apagarDoBucket').map((v) => v.qual);
      if (quais.length) usos.push({ parte, no, quais, chamada: false });
    }
    for (const uso of usos) {
      // A limpeza do bucket de teste: só ele, por bucketDeTesteParaGravar()
      if (uso.quais.every((q) => q === 'bucketDeTesteParaGravar')) continue;
      // A foto sem memória: a única chamada do arquivo, exatamente a combinada, no bucket das fotos
      const fotoSolta =
        uso.chamada &&
        usos.length === 1 &&
        uso.quais.every((q) => q === 'bucketDeFotos') &&
        `await ${projeto.trecho(uso.parte, uso.no)};` === APAGAR_A_FOTO_SOLTA &&
        condicoesDaFotoSolta(arquivo, texto);
      if (fotoSolta) continue;
      const callee = uso.chamada ? projeto.desembrulhar(uso.no.callee) : uso.no;
      const quem = callee?.type === 'MemberExpression' ? projeto.trecho(uso.parte, callee.object) : projeto.trecho(uso.parte, callee);
      falhas.push(MENSAGEM(arquivo, quem));
    }
    // O que não deu para ler como código (a marcação de um .astro, um arquivo que não abre): pelo texto
    for (const resto of info.naoLidas) {
      if (/\.delete\s*\(/.test(resto) && !arquivo.endsWith('.astro')) falhas.push(`${arquivo}: não consegui ler o código, e ele chama .delete(...); a guarda recusa o que não consegue conferir.`);
    }
  }
  return falhas;
}

/** Pelo texto, como antes da revisão D1f: o .delete de quem tem "bucket" no nome. */
function apagamentosPeloTexto(arquivo, texto) {
  const falhas = [];
  for (const uso of texto.matchAll(/([\w.]*bucket\w*(?:\(\))?)\??\.delete\(/gi)) {
    const quem = uso[1];
    const doTeste = quem === 'bucketDeTesteParaGravar()' || (quem === 'bucket' && /const bucket = bucketDeTesteParaGravar\(\);/.test(texto) && !/\bbucket = (?!bucketDeTesteParaGravar)/.test(texto));
    // A única exceção (onda 2): a foto sem memória há mais de 30 dias, que um administrador apaga em
    // Administração. Só nesta rota, uma vez, só a chave conferida de novo no banco por obterFotoSolta, depois
    // da permissão, e só ela com as cópias dela.
    const fotoSolta = uso[0] === 'bucketDeFotos().delete(' && condicoesDaFotoSolta(arquivo, texto);
    if (!doTeste && !fotoSolta) falhar(MENSAGEM(arquivo, quem));
  }
  return falhas;
  function falhar(mensagem) {
    falhas.push(mensagem);
  }
}

/** O corpo de chavesDasCopias aceito: os dois tamanhos nos dois formatos, pelo nome da cópia, e nada mais. */
export const CORPO_DAS_CHAVES_DAS_COPIAS =
  "export function chavesDasCopias(chave: string): string[] {\n  return TAMANHOS.flatMap((tamanho) => (['webp', 'jpg'] as const).map((formato) => chaveDaCopia(chave, tamanho, formato)));\n}";

/**
 * Confere src/lib/copias-das-fotos.ts: chavesDasCopias só monta os nomes das cópias, TAMANHOS são só a
 * pequena e a média, e o nome da cópia é o da original com o tamanho no meio (nunca o de uma original nem
 * o de outro arquivo). Lista vazia: nada de errado.
 */
export function copiasApagadasErradas(texto) {
  const falhas = [];
  if (!texto.includes(CORPO_DAS_CHAVES_DAS_COPIAS)) falhas.push('src/lib/copias-das-fotos.ts: chavesDasCopias só devolve os nomes das cópias da foto (os dois tamanhos, nos dois formatos).');
  if (!texto.includes("export const TAMANHOS: readonly Tamanho[] = ['pequena', 'media'];")) falhas.push('src/lib/copias-das-fotos.ts: os tamanhos das cópias são só a pequena e a média.');
  if (!texto.includes('return `${base}.${tamanho}.${formato}`;') || !texto.includes('if (!base) throw new Error(`Chave de foto inválida: ${chave}`);')) {
    falhas.push('src/lib/copias-das-fotos.ts: o nome da cópia é o da original com o tamanho no meio, e uma chave que não é de foto é recusada.');
  }
  return falhas;
}
