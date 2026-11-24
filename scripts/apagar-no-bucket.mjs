// Regras 10 e 10c da guarda da produção (scripts/confere-producao.mjs), à parte para os testes poderem dar a
// elas um código errado e ver a recusa (testes/guarda-apagar.test.ts).
//
// Nada se apaga do bucket das fotos de verdade: excluir nunca apaga na hora (docs/decisoes.md, "Princípios").
// Só apagam a limpeza de 7 dias, e só no bucket de teste, por bucketDeTesteParaGravar(), que recusa a produção
// e a homologação; e a foto sem memória há mais de 30 dias, que um administrador apaga em
// src/pages/api/fotos-soltas.ts. Nessa rota saem, no mesmo pedido, a original e as cópias dela (sessão D1c,
// 23/11/2026), e só elas: os nomes vêm de chavesDasCopias, que só monta os nomes das cópias da foto.

export const ROTA_DAS_FOTOS_SOLTAS = 'src/pages/api/fotos-soltas.ts';

/** O único jeito de apagar aceito na rota das fotos soltas: a original e as cópias dela, num pedido só. */
export const APAGAR_A_FOTO_SOLTA = 'await bucketDeFotos().delete([foto.chave, ...chavesDasCopias(foto.chave)]);';

const naOrdem = (texto, ...trechos) => trechos.every((t, i) => texto.indexOf(t) >= 0 && (i === 0 || texto.indexOf(t) > texto.indexOf(trechos[i - 1])));

/** O que este arquivo apaga sem poder. Lista vazia: nada de errado. */
export function apagamentosProibidos(arquivo, texto) {
  const falhas = [];
  for (const uso of texto.matchAll(/([\w.]*bucket\w*(?:\(\))?)\??\.delete\(/gi)) {
    const quem = uso[1];
    const doTeste = quem === 'bucketDeTesteParaGravar()' || (quem === 'bucket' && /const bucket = bucketDeTesteParaGravar\(\);/.test(texto) && !/\bbucket = (?!bucketDeTesteParaGravar)/.test(texto));
    // A única exceção (onda 2): a foto sem memória há mais de 30 dias, que um administrador apaga em
    // Administração. Só nesta rota, uma vez, só a chave conferida de novo no banco por obterFotoSolta, depois
    // da permissão, e só ela com as cópias dela.
    const fotoSolta =
      arquivo === ROTA_DAS_FOTOS_SOLTAS &&
      uso[0] === 'bucketDeFotos().delete(' &&
      (texto.match(/\.delete\(/g) ?? []).length === 1 &&
      texto.includes("import { chavesDasCopias } from '../../lib/copias-das-fotos';") &&
      naOrdem(texto, 'const decisao = podeApagarFotoSolta(locals.usuario);', 'if (!decisao.ok) return', 'const foto = await obterFotoSolta(', 'if (!foto) return', APAGAR_A_FOTO_SOLTA);
    if (!doTeste && !fotoSolta) falhar(`${arquivo}: ${quem}.delete(...) apagaria arquivos. Só a limpeza do bucket de teste apaga, por bucketDeTesteParaGravar(), e a foto sem memória com as cópias dela, por ${ROTA_DAS_FOTOS_SOLTAS}.`);
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
