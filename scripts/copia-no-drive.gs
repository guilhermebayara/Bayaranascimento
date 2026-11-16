// Cópia mensal do acervo no Google Drive.
//
// Roda dentro do Google Apps Script, na conta do Gui. Busca a cópia do banco
// em memorias.bayara.com.br/api/copia e salva um arquivo por mês na pasta
// abaixo. O passo a passo para instalar está em docs/copia-no-drive.md.
//
// O Client ID e o Client Secret do token de serviço do Cloudflare Access ficam
// nas propriedades do script (Configurações do projeto > Propriedades do
// script), com os nomes CLIENT_ID e CLIENT_SECRET. Nunca cole o segredo aqui.

const ENDERECO = 'https://memorias.bayara.com.br/api/copia';
const PASTA = 'Acervo Bayara Nascimento, cópias';

function fazerCopia() {
  const propriedades = PropertiesService.getScriptProperties();
  const id = propriedades.getProperty('CLIENT_ID');
  const segredo = propriedades.getProperty('CLIENT_SECRET');
  if (!id || !segredo) throw new Error('Faltam CLIENT_ID e CLIENT_SECRET nas propriedades do script.');

  const resposta = UrlFetchApp.fetch(ENDERECO, {
    headers: { 'CF-Access-Client-Id': id, 'CF-Access-Client-Secret': segredo },
    followRedirects: false,
    muteHttpExceptions: true,
  });
  const texto = resposta.getContentText();
  if (resposta.getResponseCode() !== 200 || texto.indexOf('"tabelas"') === -1) {
    // Erro aqui faz o Google mandar um e-mail avisando que a cópia falhou
    throw new Error('A cópia não veio. Resposta ' + resposta.getResponseCode() + ': ' + texto.slice(0, 200));
  }

  const pastas = DriveApp.getFoldersByName(PASTA);
  const pasta = pastas.hasNext() ? pastas.next() : DriveApp.createFolder(PASTA);
  const dia = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  pasta.createFile('acervo-' + dia + '.json', texto, 'application/json');

  // Aviso de tamanho do banco: a cópia já foi salva; o erro aqui só serve para o Google mandar o e-mail.
  // O limite do plano gratuito é 500 MB por banco, e o aviso começa em 300 MB (docs/decisoes.md).
  const situacao = texto.match(/"passou_do_aviso":\s*true/) ? texto.match(/"tamanho_em_bytes":\s*(\d+)/) : null;
  if (situacao) {
    const mb = Math.round(Number(situacao[1]) / 1000000);
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
