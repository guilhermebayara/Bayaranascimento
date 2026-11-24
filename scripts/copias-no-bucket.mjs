// Regra 13 da guarda da produção (scripts/confere-producao.mjs), à parte para os testes poderem dar a ela um
// código errado e ver a recusa (testes/guarda-copias.test.ts). Fortalecida na sessão D1d (item 14 da revisão
// R-D1, 23/11/2026).
//
// As cópias menores das fotos (sessão D1b) e a cópia pequena dos retratos (sessão D1c):
// - são gravadas só pelas rotas do site: o envio da foto (src/pages/api/fotos.ts), o envio do retrato
//   (src/pages/api/integrantes.ts) e os dois ajustes da Administração (copias-das-fotos.ts e
//   copias-dos-retratos.ts), sempre no bucket das fotos deste ambiente, por bucketDeFotos();
// - o nome da cópia vem só de chaveDaCopia e chaveDaCopiaDoRetrato: um nome montado à mão (".pequena.",
//   ".media.", ".pequeno.") ou a chave numa variável fora dessas rotas é recusado;
// - guardarCopias e guardarCopiaDoRetrato só são chamadas pelo ajuste de cada uma;
// - os ajustes só gravam depois de conferir, nesta ordem: administrador, quem vê a original, se já tem cópia,
//   se está no que o ajuste lista e a reserva (item 13 da revisão);
// - toda rota que lê uma cópia só monta o nome dela depois da conferência da original;
// - apagar uma cópia só junto da original, na rota das fotos soltas (sessão D1c; a forma exata está em
//   scripts/apagar-no-bucket.mjs): um .delete( em qualquer arquivo que monta nome de cópia, fora dali, é
//   recusado, também com o bucket numa variável.
// Os comentários não contam: o código é lido sem eles (soCodigo), com os textos entre aspas no lugar.

import { APAGAR_A_FOTO_SOLTA, ROTA_DAS_FOTOS_SOLTAS } from './apagar-no-bucket.mjs';

export const ROTAS_DAS_COPIAS_DAS_FOTOS = ['src/pages/api/fotos.ts', 'src/pages/api/copias-das-fotos.ts'];
export const ROTAS_DAS_COPIAS_DOS_RETRATOS = ['src/pages/api/integrantes.ts', 'src/pages/api/copias-dos-retratos.ts'];
export const AJUSTE_DAS_FOTOS = 'src/pages/api/copias-das-fotos.ts';
export const AJUSTE_DOS_RETRATOS = 'src/pages/api/copias-dos-retratos.ts';
/** As peças que definem os nomes das cópias: podem montá-los, nunca gravar. */
export const NOMES_DAS_COPIAS = ['src/lib/copias-das-fotos.ts', 'src/lib/retratos.ts'];
/** A chave da original, como as rotas de envio a gravam: o que não é isso, nas rotas, é cópia */
const ORIGINAIS = ['chave', '`${PASTA_DOS_RETRATOS}${chave}`'];
/** As rotas que leem uma cópia, e o que vem antes do nome dela */
export const LEITORES = {
  'src/pages/fotos/[...chave].ts': ['const acesso = await acessoAFoto(locals.usuario, chave);', 'if (!acesso) return naoEncontrada();'],
  'src/pages/retratos/[...chave].ts': ['const acesso = await acessoAoRetrato(locals.usuario, chave);', 'if (!acesso) return naoEncontrado();'],
};

/**
 * O texto sem os comentários. Os textos entre aspas ficam no lugar (um "//" dentro de um endereço não é
 * comentário), e cada comentário vira espaço, com as quebras de linha. Em `literais`, o conteúdo de cada
 * texto entre aspas e das partes fixas de cada template.
 */
export function separar(texto) {
  let codigo = '';
  const literais = [];
  let i = 0;
  // A pilha dos templates abertos: cada ${ dentro de um template guarda a profundidade das chaves
  const templates = [];
  let chaves = 0;
  let ultimo = ''; // o último caractere de código que não é espaço, para separar divisão de regex
  const n = texto.length;
  const lerTemplate = () => {
    // Lê a parte fixa de um template, de i (logo depois da crase ou do }) até a crase ou o ${
    let parte = '';
    while (i < n) {
      const c = texto[i];
      if (c === '\\') {
        parte += texto.slice(i, i + 2);
        codigo += texto.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (c === '`') {
        codigo += c;
        i++;
        literais.push(parte);
        ultimo = '`';
        return;
      }
      if (c === '$' && texto[i + 1] === '{') {
        codigo += '${';
        i += 2;
        literais.push(parte);
        templates.push(chaves);
        chaves = 0;
        ultimo = '{';
        return;
      }
      parte += c;
      codigo += c;
      i++;
    }
    literais.push(parte);
  };
  while (i < n) {
    const c = texto[i];
    const d = texto[i + 1];
    if (c === '/' && d === '/') {
      while (i < n && texto[i] !== '\n') i++;
      codigo += ' ';
      continue;
    }
    if (c === '/' && d === '*') {
      const fim = texto.indexOf('*/', i + 2);
      const comentario = texto.slice(i, fim < 0 ? n : fim + 2);
      codigo += comentario.replace(/[^\n]/g, ' ');
      i += comentario.length;
      continue;
    }
    if (c === "'" || c === '"') {
      // Um texto entre aspas simples ou duplas termina na mesma linha
      let j = i + 1;
      let conteudo = '';
      while (j < n && texto[j] !== c && texto[j] !== '\n') {
        if (texto[j] === '\\') {
          conteudo += texto.slice(j, j + 2);
          j += 2;
          continue;
        }
        conteudo += texto[j];
        j++;
      }
      literais.push(conteudo);
      codigo += texto.slice(i, Math.min(j + 1, n));
      i = j + 1;
      ultimo = c;
      continue;
    }
    if (c === '`') {
      codigo += c;
      i++;
      lerTemplate();
      continue;
    }
    if (c === '{') chaves++;
    if (c === '}') {
      if (chaves === 0 && templates.length > 0) {
        chaves = templates.pop();
        codigo += c;
        i++;
        lerTemplate();
        continue;
      }
      chaves--;
    }
    if (c === '/' && (ultimo === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(ultimo) || /\b(return|typeof|case|in|of|void|throw|new|else|do|await|yield)\s*$/.test(codigo))) {
      // Um regex: pulado inteiro, para as aspas de dentro não abrirem texto. Fica no código.
      let j = i + 1;
      let classe = false;
      while (j < n && texto[j] !== '\n') {
        const r = texto[j];
        if (r === '\\') {
          j += 2;
          continue;
        }
        if (r === '[') classe = true;
        else if (r === ']') classe = false;
        else if (r === '/' && !classe) break;
        j++;
      }
      if (j < n && texto[j] === '/') {
        codigo += texto.slice(i, j + 1);
        i = j + 1;
        ultimo = '/';
        continue;
      }
    }
    codigo += c;
    if (!/\s/.test(c)) ultimo = c;
    i++;
  }
  return { codigo, literais };
}

export const soCodigo = (texto) => separar(texto).codigo;

/** Onde está o último trecho, procurando cada um depois do anterior; -1 se algum faltar. */
const naOrdem = (texto, ...trechos) => {
  let onde = -1;
  for (const t of trechos) {
    onde = texto.indexOf(t, onde + 1);
    if (onde < 0) return -1;
  }
  return onde;
};
/** Um nome de cópia montado à mão: ".pequena.", ".media." ou ".pequeno." num texto entre aspas */
const MONTADO_A_MAO = /\.(pequena|media|pequeno)(\.|$)/;
const NOME_DE_COPIA = /\bchaveDaCopia(DoRetrato)?\(|\bchavesDasCopias\(/;

/** Cada .put( do código: quem grava e o primeiro argumento. */
function gravacoes(codigo) {
  const lista = [];
  for (const uso of codigo.matchAll(/([\w$.]*(?:\(\))?)\s*\??\.put\(/g)) {
    let j = uso.index + uso[0].length;
    let profundidade = 0;
    let primeiro = '';
    for (; j < codigo.length; j++) {
      const c = codigo[j];
      if ('([{'.includes(c)) profundidade++;
      else if (')]}'.includes(c)) {
        if (profundidade === 0) break;
        profundidade--;
      } else if (c === ',' && profundidade === 0) break;
      primeiro += c;
    }
    lista.push({ quem: uso[1], chave: primeiro.trim(), onde: uso.index });
  }
  return lista;
}

/**
 * Tudo o que está errado com as cópias nos arquivos dados ({ caminho: texto }, todos os de src/). Lista vazia:
 * nada de errado.
 */
export function copiasErradas(fontes) {
  const falhas = [];
  const falhar = (m) => falhas.push(m);
  const ROTAS = [...ROTAS_DAS_COPIAS_DAS_FOTOS, ...ROTAS_DAS_COPIAS_DOS_RETRATOS];

  for (const [arquivo, texto] of Object.entries(fontes)) {
    if (!arquivo.startsWith('src/')) continue;
    const { codigo, literais } = separar(texto);
    const montaNome = NOME_DE_COPIA.test(codigo);

    // O nome da cópia vem só das peças que o definem
    if (!NOMES_DAS_COPIAS.includes(arquivo) && literais.some((l) => MONTADO_A_MAO.test(l))) {
      falhar(`${arquivo}: o nome de uma cópia (".pequena.", ".media.", ".pequeno.") só é montado por chaveDaCopia e chaveDaCopiaDoRetrato.`);
    }

    for (const g of gravacoes(codigo)) {
      // O bucket de teste tem as regras dele (7 e 10): as cópias de exemplo, só debaixo de exemplos/
      if (g.quem === 'bucketDeTesteParaGravar()') continue;
      const daFoto = /\bchaveDaCopia\(/.test(g.chave);
      const doRetrato = /\bchaveDaCopiaDoRetrato\(/.test(g.chave);
      if (MONTADO_A_MAO.test(g.chave)) falhar(`${arquivo}: a chave da cópia vem de chaveDaCopia ou chaveDaCopiaDoRetrato, nunca montada à mão.`);
      if (daFoto || doRetrato) {
        const rotas = daFoto ? ROTAS_DAS_COPIAS_DAS_FOTOS : ROTAS_DAS_COPIAS_DOS_RETRATOS;
        if (!rotas.includes(arquivo)) falhar(`${arquivo}: as cópias ${daFoto ? 'das fotos' : 'dos retratos'} só são gravadas por ${rotas.join(' e ')}.`);
        else if (g.quem !== 'bucketDeFotos()') falhar(`${arquivo}: a cópia é gravada no bucket das fotos deste ambiente, por bucketDeFotos(), e aqui por ${g.quem || 'outro'}.`);
        if (doRetrato && !/^`\$\{PASTA_DOS_RETRATOS\}\$\{chaveDaCopiaDoRetrato\(/.test(g.chave)) falhar(`${arquivo}: a cópia do retrato é gravada em PASTA_DOS_RETRATOS, com o nome de chaveDaCopiaDoRetrato.`);
      } else if (montaNome && !ROTAS.includes(arquivo)) {
        // Fora das rotas, quem monta nome de cópia não grava nada: a chave numa variável passaria
        falhar(`${arquivo}: este arquivo monta nome de cópia e grava no bucket (${g.quem}.put(${g.chave})); as cópias só são gravadas pelas rotas das cópias.`);
      } else if (ROTAS.includes(arquivo)) {
        // Nas rotas das cópias, o que não é cópia é a original, com a chave dela: nos ajustes, nem isso
        const original = ORIGINAIS.includes(g.chave) && ![AJUSTE_DAS_FOTOS, AJUSTE_DOS_RETRATOS].includes(arquivo);
        if (!original) falhar(`${arquivo}: a chave da cópia vai direto na gravação, com chaveDaCopia ou chaveDaCopiaDoRetrato (${g.quem}.put(${g.chave})).`);
        else if (new RegExp(`\\bchave\\s*=(?!=)[^;]*(${NOME_DE_COPIA.source}|\\.(pequena|media|pequeno)\\b)`).test(codigo)) {
          falhar(`${arquivo}: a chave da original não recebe o nome de uma cópia.`);
        }
      }
    }

    // Apagar uma cópia só junto da original, na rota das fotos soltas (sessão D1c)
    if (montaNome && /\.delete\(/.test(codigo)) {
      const unico = arquivo === ROTA_DAS_FOTOS_SOLTAS && (codigo.match(/\.delete\(/g) ?? []).length === 1 && codigo.includes(APAGAR_A_FOTO_SOLTA);
      if (!unico) falhar(`${arquivo}: uma cópia só é apagada junto da original, em ${ROTA_DAS_FOTOS_SOLTAS} (${APAGAR_A_FOTO_SOLTA}).`);
    }
    if (/\bchavesDasCopias\(/.test(codigo) && ![ROTA_DAS_FOTOS_SOLTAS, 'src/lib/copias-das-fotos.ts'].includes(arquivo)) {
      falhar(`${arquivo}: chavesDasCopias só serve para apagar a foto solta com as cópias dela, em ${ROTA_DAS_FOTOS_SOLTAS}.`);
    }

    // Só o ajuste de cada uma anota as cópias no banco
    for (const [funcao, rota] of [['guardarCopias', AJUSTE_DAS_FOTOS], ['guardarCopiaDoRetrato', AJUSTE_DOS_RETRATOS]]) {
      const chamadas = (codigo.match(new RegExp(`\\b${funcao}\\(`, 'g')) ?? []).length - (codigo.match(new RegExp(`\\bfunction ${funcao}\\(`, 'g')) ?? []).length;
      const definicao = arquivo === 'src/lib/servidor/repositorio.ts';
      if (chamadas > 0 && arquivo !== rota) falhar(`${arquivo}: ${funcao} só é chamada por ${rota}.`);
      if (!definicao && /\bfunction (guardarCopias|guardarCopiaDoRetrato)\(/.test(codigo)) falhar(`${arquivo}: ${funcao} mora em src/lib/servidor/repositorio.ts.`);
    }

    // Toda rota que lê uma cópia monta o nome dela só depois da conferência da original
    if (montaNome && !NOMES_DAS_COPIAS.includes(arquivo) && !ROTAS.includes(arquivo) && arquivo !== ROTA_DAS_FOTOS_SOLTAS) {
      const antes = LEITORES[arquivo];
      if (!antes) falhar(`${arquivo}: só as rotas das fotos e dos retratos leem cópias, depois de conferir a original (${Object.keys(LEITORES).join(' e ')}).`);
      else {
        const conferido = naOrdem(codigo, ...antes);
        const usos = [...codigo.matchAll(new RegExp(NOME_DE_COPIA.source, 'g'))].map((u) => u.index);
        if (conferido < 0 || usos.some((u) => u < conferido)) falhar(`${arquivo}: a cópia só é lida depois da conferência da original, com a chave da original.`);
      }
    }
  }

  // Os ajustes da Administração: só administradores, e nesta ordem antes de gravar
  const ajustes = [
    [AJUSTE_DAS_FOTOS, 'Foto não encontrada.', 'acessoAFoto', 'temCopias', 'fotoEstaNoAjuste', 'alvoDaFoto', 'guardarCopias(chave, conferidas.copias, reserva.codigo)', 'guardadas'],
    [AJUSTE_DOS_RETRATOS, 'Retrato não encontrado.', 'acessoAoRetrato', 'retratoTemCopia', 'retratoEstaNoAjuste', 'alvoDoRetrato', 'guardarCopiaDoRetrato(chave, bytesDaOriginal.byteLength, conferida.copia, reserva.codigo)', 'guardada'],
  ];
  for (const [arquivo, recusa, acesso, temCopia, noAjuste, alvo, guardar, guardou] of ajustes) {
    if (!(arquivo in fontes)) {
      falhar(`${arquivo}: o ajuste das cópias não foi achado.`);
      continue;
    }
    const codigo = soCodigo(fontes[arquivo]);
    const post = codigo.indexOf('export const POST');
    const primeiraGravacao = gravacoes(codigo).map((g) => g.onde).sort((a, b) => a - b)[0] ?? -1;
    const ordem = [
      'export const POST',
      'const decisao = podeFazerCopiasDasFotos(locals.usuario);',
      `if (!(await ${acesso}(locals.usuario, chave))) return erro(404, '${recusa}');`,
      `if (await ${temCopia}(chave)) return erro(409,`,
      `if (!(await ${noAjuste}(locals.usuario, chave))) return erro(404, '${recusa}');`,
      `const reserva = await reservarCopias(${alvo}(chave));`,
      "if ('recusa' in reserva) return erro(409,",
    ];
    const conferido = naOrdem(codigo, ...ordem);
    if (
      (codigo.match(/const decisao = podeFazerCopiasDasFotos\(locals\.usuario\);\n\s*if \(!decisao\.ok\) return erro\(403, decisao\.motivo\);/g) ?? []).length !== 2 ||
      post < 0 ||
      conferido < 0 ||
      primeiraGravacao < conferido ||
      codigo.indexOf(guardar, primeiraGravacao) < 0 ||
      !codigo.includes(`if (!${guardou}) await soltarReserva(${alvo}(chave), reserva.codigo);`)
    ) {
      falhar(`${arquivo}: o ajuste das cópias é só dos administradores, e confere quem vê a original, se ela já tem cópia, se está no que o ajuste lista e a reserva antes de gravar; e solta a reserva no fim.`);
    }
  }

  const permissoes = fontes['src/lib/servidor/permissoes.ts'] ?? '';
  if (!/export function podeFazerCopiasDasFotos\(usuario: Usuario\): Decisao \{\n\s*return usuario\.admin \? sim : nao\(/.test(permissoes)) falhar('src/lib/servidor/permissoes.ts: só os administradores fazem as cópias das fotos de antes.');
  const copias = fontes['src/lib/copias-das-fotos.ts'] ?? '';
  if (!copias.includes('return `${base}.${tamanho}.${formato}`;')) falhar('src/lib/copias-das-fotos.ts: o nome da cópia é o da original com o tamanho no meio, nunca o de uma original.');
  const retratos = fontes['src/lib/retratos.ts'] ?? '';
  if (!retratos.includes('return `${base}.pequeno.${formato}`;') || !retratos.includes('if (!base) throw new Error(`Chave de retrato inválida: ${chave}`);')) {
    falhar('src/lib/retratos.ts: o nome da cópia do retrato é o da original com "pequeno" no meio, nunca o de uma original.');
  }
  for (const [arquivo, antes] of Object.entries(LEITORES)) {
    if (!(arquivo in fontes) || !NOME_DE_COPIA.test(soCodigo(fontes[arquivo]))) falhar(`${arquivo}: a rota que entrega as cópias não foi achada.`);
    else if (naOrdem(soCodigo(fontes[arquivo]), ...antes) < 0) falhar(`${arquivo}: a cópia só é lida depois da conferência da original, com a chave da original.`);
  }
  return falhas;
}
