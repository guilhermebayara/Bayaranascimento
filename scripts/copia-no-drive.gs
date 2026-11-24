// Cópia mensal do acervo no Google Drive.
//
// ===== O que mudou em 24/11/2026, na D1f3, e o que fazer (cole depois de a mudança chegar à main) =====
// - Antes de gravar no Drive, o script confere o arquivo montado contra o esquema do banco, que vem no índice:
//   nenhuma chave repetida e nenhuma linha apontando para outra que não está no arquivo. Se a conferência
//   falhar, a cópia inteira é refeita, dentro das mesmas 4 tentativas; nas 4, nada é gravado e o Google manda
//   o e-mail.
// - Depois de gravar o arquivo, o script confirma ao site (um pedido a /api/copia?confirmar=..., com o mesmo
//   token), e só então a cópia do mês é anotada. Antes, o site anotava ao entregar a última parte, mesmo
//   numa tentativa que depois era descartada. Se a confirmação falhar, o arquivo fica no Drive e o e-mail diz.
// - O script de antes, com o site novo, continua gravando, mas não confirma: a cópia não é anotada e, depois
//   de 35 dias, aparece a pendência "cópia mensal atrasada" na Administração. É o sinal para colar este.
// - Para atualizar: abra o projeto "Cópia do acervo" em script.google.com, troque todo o conteúdo de
//   Código.gs por este arquivo, salve e rode fazerCopia uma vez para conferir.
//
// ===== 24/11/2026 (sessão D1f) =====
// A cópia agora confere se o acervo mudou no meio dela. O índice e cada parte trazem a "marca", um número que
// sobe a cada gravação no acervo (as de registro, como a visita ao abrir o Início, não contam). Se a marca de
// uma parte for diferente da do índice, alguém gravou algo enquanto a cópia era feita, e o arquivo juntado
// poderia não restaurar (um relato sem a memória dele, por exemplo). Então o script recomeça a cópia inteira,
// até 4 vezes, com uma espera entre elas. Se o acervo mudar em todas, nada é gravado e o script falha com o
// e-mail do Google, como numa parte que não veio.
// - Nada muda no token, nas propriedades (CLIENT_ID e CLIENT_SECRET), no agendamento, na pasta, no nome nem
//   no formato do arquivo.
//
// ===== 23/11/2026 (sessão D1e) =====
// A cópia veio em partes: o script pede o índice em memorias.bayara.com.br/api/copia, depois cada tabela em
// páginas (/api/copia?tabela=...&depois=...), junta tudo e grava UM arquivo no Drive, como antes: a mesma
// pasta, o mesmo nome (acervo-AAAA-MM-DD.json) e o mesmo formato, agora sem recuo (fica menor). Cada pedido
// fica abaixo do limite de CPU do plano gratuito da Cloudflare. Uma parte que falha é pedida de novo, até 3
// vezes. Se ainda falhar, nada é gravado (nem pela metade) e o script falha, o que faz o Google mandar o e-mail.
// ================================================================
//
// Roda dentro do Google Apps Script, na conta do Gui. O passo a passo para instalar está em
// docs/copia-no-drive.md.
//
// O Client ID e o Client Secret do token de serviço do Cloudflare Access ficam
// nas propriedades do script (Configurações do projeto > Propriedades do
// script), com os nomes CLIENT_ID e CLIENT_SECRET. Nunca cole o segredo aqui.

const ENDERECO = 'https://memorias.bayara.com.br/api/copia';
const PASTA = 'Acervo Bayara Nascimento, cópias';
const TENTATIVAS = 3;
// Quantas vezes a cópia inteira é refeita quando o acervo muda no meio dela
const PASSADAS = 4;

// Pede um endereço da cópia e devolve o texto, tentando de novo quando falha
function pedirParte(endereco, cabecalhos) {
  let ultima = '';
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      const resposta = UrlFetchApp.fetch(endereco, { headers: cabecalhos, followRedirects: false, muteHttpExceptions: true });
      const texto = resposta.getContentText();
      if (resposta.getResponseCode() === 200 && /"acervo":\s*"Bayara Nascimento"/.test(texto)) return texto;
      ultima = 'Resposta ' + resposta.getResponseCode() + ': ' + texto.slice(0, 200);
    } catch (erro) {
      ultima = String(erro);
    }
    if (tentativa < TENTATIVAS) Utilities.sleep(2000 * tentativa);
  }
  // Erro aqui faz o Google mandar um e-mail avisando que a cópia falhou
  throw new Error('A cópia não veio (' + endereco + '). ' + ultima);
}

// Um valor como chave: número e texto iguais valem o mesmo, como na comparação das chaves no SQLite
function comoChave(valores) {
  return JSON.stringify(valores.map(function (v) {
    return typeof v === 'number' ? String(v) : v;
  }));
}

// A rede no fim (D1f3): o arquivo montado restaura? Nenhuma chave primária ou única repetida e nenhuma chave
// estrangeira sem o alvo, pela régua que veio do banco no índice. Devolve o primeiro problema, ou null. É a
// mesma conta de conferirCopia, em src/lib/copia-em-partes.ts, escrita à mão porque o Apps Script não importa.
function conferirArquivo(tabelas, esquema) {
  const conjuntos = {};
  function chavesDe(tabela, colunas) {
    const id = tabela + '|' + colunas.join('|');
    if (!conjuntos[id]) {
      const conjunto = {};
      (tabelas[tabela] || []).forEach(function (linha) {
        const valores = colunas.map(function (c) { return linha[c]; });
        if (valores.every(function (v) { return v !== null && v !== undefined; })) conjunto[comoChave(valores)] = true;
      });
      conjuntos[id] = conjunto;
    }
    return conjuntos[id];
  }
  const nomes = Object.keys(esquema);
  for (let t = 0; t < nomes.length; t++) {
    const tabela = nomes[t];
    const regua = esquema[tabela];
    const linhas = tabelas[tabela];
    if (!linhas) continue;
    for (let u = 0; u < regua.unicas.length; u++) {
      const colunas = regua.unicas[u];
      const vistas = {};
      for (let l = 0; l < linhas.length; l++) {
        const valores = colunas.map(function (c) { return linhas[l][c]; });
        if (valores.some(function (v) { return v === null || v === undefined; })) continue;
        const chave = comoChave(valores);
        if (vistas[chave]) return tabela + ': a chave (' + colunas.join(', ') + ') = ' + chave + ' aparece duas vezes.';
        vistas[chave] = true;
      }
    }
    for (let e = 0; e < regua.estrangeiras.length; e++) {
      const fk = regua.estrangeiras[e];
      if (!tabelas[fk.tabela]) return tabela + ': aponta para ' + fk.tabela + ', que não está no arquivo.';
      const alvos = chavesDe(fk.tabela, fk.referencias);
      for (let l = 0; l < linhas.length; l++) {
        const valores = fk.colunas.map(function (c) { return linhas[l][c]; });
        if (valores.some(function (v) { return v === null || v === undefined; })) continue;
        if (!alvos[comoChave(valores)]) return tabela + ': (' + fk.colunas.join(', ') + ') = ' + comoChave(valores) + ' aponta para ' + fk.tabela + ', que não tem essa linha.';
      }
    }
  }
  return null;
}

// Uma passada: o índice e todas as partes, juntos no arquivo de sempre: { acervo, gerada_em, banco, tabelas }.
// Devolve null quando a marca de uma parte não é a do índice (algo foi gravado no meio da cópia).
function umaPassada(cabecalhos) {
  const primeiro = pedirParte(ENDERECO, cabecalhos);
  const indice = JSON.parse(primeiro);
  // O site de antes da D1e manda a cópia inteira de uma vez: guarda como veio
  if (indice.tabelas) return { texto: primeiro, banco: indice.banco };
  if (!Array.isArray(indice.indice)) throw new Error('A cópia não veio: o índice está diferente do esperado. ' + primeiro.slice(0, 200));
  // O site de antes da D1f não manda a marca: junta sem conferir
  const comMarca = typeof indice.marca === 'number';

  const tabelas = {};
  for (let t = 0; t < indice.indice.length; t++) {
    const item = indice.indice[t];
    const linhas = [];
    let depois = null;
    for (;;) {
      const endereco = ENDERECO + '?tabela=' + encodeURIComponent(item.tabela) + (depois === null ? '' : '&depois=' + depois);
      const parte = JSON.parse(pedirParte(endereco, cabecalhos));
      if (parte.tabela !== item.tabela || !Array.isArray(parte.linhas) || !Array.isArray(parte.colunas)) {
        throw new Error('A cópia não veio: a parte da tabela ' + item.tabela + ' está diferente do esperado.');
      }
      if (comMarca && parte.marca !== indice.marca) {
        ultimoProblema = 'a marca mudou no meio.';
        return null;
      }
      parte.linhas.forEach(function (valores) {
        const linha = {};
        parte.colunas.forEach(function (coluna, i) {
          linha[coluna] = valores[i];
        });
        linhas.push(linha);
      });
      if (parte.proxima === null) break;
      depois = parte.proxima;
    }
    tabelas[item.tabela] = linhas;
  }
  // A rede: o arquivo montado é conferido contra o esquema antes de ser gravado (o site de antes da D1f3 não
  // manda o esquema: junta sem conferir)
  if (indice.esquema && typeof indice.esquema === 'object') {
    const problema = conferirArquivo(tabelas, indice.esquema);
    if (problema) {
      ultimoProblema = problema;
      return null;
    }
  }
  const copia = { acervo: indice.acervo, gerada_em: indice.gerada_em, banco: indice.banco, tabelas: tabelas };
  return { texto: JSON.stringify(copia), banco: indice.banco, geradaEm: indice.gerada_em, confirma: Boolean(indice.esquema) };
}

// O motivo da última passada descartada, para o e-mail
let ultimoProblema = '';

// Refaz a passada inteira enquanto o acervo mudar no meio dela ou o arquivo não conferir, até PASSADAS vezes
function juntarCopia(cabecalhos) {
  for (let passada = 1; passada <= PASSADAS; passada++) {
    const copia = umaPassada(cabecalhos);
    if (copia) return copia;
    if (passada < PASSADAS) Utilities.sleep(5000 * passada);
  }
  // Erro aqui faz o Google mandar um e-mail avisando que a cópia falhou
  throw new Error('A cópia não veio: o acervo mudou durante a cópia nas ' + PASSADAS + ' tentativas (a última: ' + ultimoProblema + '). Rode fazerCopia de novo mais tarde.');
}

function fazerCopia() {
  const propriedades = PropertiesService.getScriptProperties();
  const id = propriedades.getProperty('CLIENT_ID');
  const segredo = propriedades.getProperty('CLIENT_SECRET');
  if (!id || !segredo) throw new Error('Faltam CLIENT_ID e CLIENT_SECRET nas propriedades do script.');

  // Só grava no Drive depois de todas as partes chegarem, com a marca igual do começo ao fim e o arquivo
  // conferido contra o esquema: a cópia do mês nunca fica pela metade nem com uma gravação no meio
  const cabecalhos = { 'CF-Access-Client-Id': id, 'CF-Access-Client-Secret': segredo };
  const copia = juntarCopia(cabecalhos);

  const pastas = DriveApp.getFoldersByName(PASTA);
  const pasta = pastas.hasNext() ? pastas.next() : DriveApp.createFolder(PASTA);
  const dia = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  pasta.createFile('acervo-' + dia + '.json', copia.texto, 'application/json');

  // A cópia do mês só conta quando o arquivo chegou ao Drive: o script confirma ao site, que anota a data
  if (copia.confirma) {
    try {
      pedirParte(ENDERECO + '?confirmar=' + encodeURIComponent(copia.geradaEm), cabecalhos);
    } catch (erro) {
      throw new Error('Cópia salva no Drive, mas o site não anotou a data dela: ' + String(erro).slice(0, 300));
    }
  }

  // Aviso de tamanho do banco: a cópia já foi salva; o erro aqui só serve para o Google mandar o e-mail.
  // O limite do plano gratuito é 500 MB por banco, e o aviso começa em 300 MB (docs/decisoes.md).
  const banco = copia.banco;
  if (banco && banco.passou_do_aviso === true && typeof banco.tamanho_em_bytes === 'number') {
    const mb = Math.round(banco.tamanho_em_bytes / 1000000);
    throw new Error(
      'Cópia salva, mas o banco do acervo está com ' + mb + ' MB, perto do limite de 500 MB do plano gratuito. ' +
      'A saída combinada é o plano Workers Paid (10 GB por banco). Veja "Custo" no documento de estrutura.'
    );
  }
}

// Rode uma vez para agendar: todo dia 1º, de madrugada
function agendarTodoMes() {
  ScriptApp.getProjectTriggers().forEach(function (gatilho) {
    ScriptApp.deleteTrigger(gatilho);
  });
  ScriptApp.newTrigger('fazerCopia').timeBased().onMonthDay(1).atHour(3).create();
}
