// Cópia mensal do acervo no Google Drive.
//
// ===== O que mudou em 24/11/2026 (sessão D1f) e o que fazer =====
// A cópia agora confere se o acervo mudou no meio dela. O índice e cada parte trazem a "marca", um número que
// sobe a cada gravação no banco. Se a marca de uma parte for diferente da do índice, alguém gravou algo
// enquanto a cópia era feita, e o arquivo juntado poderia não restaurar (um relato sem a memória dele, por
// exemplo). Então o script recomeça a cópia inteira, até 4 vezes, com uma espera entre elas. Se o acervo mudar
// em todas, nada é gravado e o script falha com o e-mail do Google, como numa parte que não veio.
// - Nada muda no token, nas propriedades (CLIENT_ID e CLIENT_SECRET), no agendamento, na pasta, no nome nem
//   no formato do arquivo.
// - Para atualizar: abra o projeto "Cópia do acervo" em script.google.com, troque todo o conteúdo de
//   Código.gs por este arquivo, salve e rode fazerCopia uma vez para conferir. Este script funciona também
//   com o site de antes (sem a marca): nesse caso, junta as partes como antes, sem conferir. Pode colar antes
//   ou depois de a mudança chegar ao site de verdade; a conferência só vale com os dois atualizados.
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
      if (comMarca && parte.marca !== indice.marca) return null;
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
  const copia = { acervo: indice.acervo, gerada_em: indice.gerada_em, banco: indice.banco, tabelas: tabelas };
  return { texto: JSON.stringify(copia), banco: indice.banco };
}

// Refaz a passada inteira enquanto o acervo mudar no meio dela, até PASSADAS vezes
function juntarCopia(cabecalhos) {
  for (let passada = 1; passada <= PASSADAS; passada++) {
    const copia = umaPassada(cabecalhos);
    if (copia) return copia;
    if (passada < PASSADAS) Utilities.sleep(5000 * passada);
  }
  // Erro aqui faz o Google mandar um e-mail avisando que a cópia falhou
  throw new Error('A cópia não veio: o acervo mudou durante a cópia nas ' + PASSADAS + ' tentativas. Rode fazerCopia de novo mais tarde.');
}

function fazerCopia() {
  const propriedades = PropertiesService.getScriptProperties();
  const id = propriedades.getProperty('CLIENT_ID');
  const segredo = propriedades.getProperty('CLIENT_SECRET');
  if (!id || !segredo) throw new Error('Faltam CLIENT_ID e CLIENT_SECRET nas propriedades do script.');

  // Só grava no Drive depois de todas as partes chegarem, com a marca igual do começo ao fim: a cópia do mês
  // nunca fica pela metade nem com uma gravação no meio
  const copia = juntarCopia({ 'CF-Access-Client-Id': id, 'CF-Access-Client-Secret': segredo });

  const pastas = DriveApp.getFoldersByName(PASTA);
  const pasta = pastas.hasNext() ? pastas.next() : DriveApp.createFolder(PASTA);
  const dia = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  pasta.createFile('acervo-' + dia + '.json', copia.texto, 'application/json');

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
