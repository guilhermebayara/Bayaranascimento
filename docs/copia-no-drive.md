# Cópia do acervo no Google Drive

Todo dia 1º, de madrugada, um script na conta Google do Gui busca a cópia do banco e salva um arquivo `acervo-AAAA-MM-DD.json` na pasta **Acervo Bayara Nascimento, cópias** do Drive. Cada arquivo tem todas as tabelas: memórias (inclusive rascunhos e restritas a núcleos), relatos, pessoas, núcleos, histórico de versões e a lista de fotos. As fotos em si ficam no R2 e não entram na cópia.

Para uma cópia na hora (depois de cadastrar muita coisa, por exemplo), o Gui ou a Giovanna clicam em **Baixar cópia do acervo**, no rodapé do site, e guardam o arquivo onde quiserem.

O Cloudflare também guarda o histórico do banco por conta própria (Time Travel do D1), o que permite voltar o banco a um momento dos últimos dias em caso de erro grave. A cópia no Drive cobre o resto: um lugar fora do Cloudflare, com um arquivo por mês.

## Como funciona

O site é fechado pelo Cloudflare Access, então o script entra com um **token de serviço**: um par Client ID e Client Secret criado no Zero Trust. O Access deixa esse token passar só pela política "Cópia mensal", e o site só aceita esse token no endereço `/api/copia`. Com ele não dá para ver páginas nem gravar nada.

- No site, a variável `COPIA_CLIENT_ID` guarda o Client ID (que não é segredo).
- No Apps Script, as propriedades `CLIENT_ID` e `CLIENT_SECRET` guardam o par.

O token pode ser revogado a qualquer momento no Zero Trust, e a cópia para na hora.

## Instalação

### 1. Token de serviço (Zero Trust)

1. Zero Trust > Access controls > Service credentials > **Create Service Token**.
2. Nome: `copia-mensal-drive`. Duração: **Non-expiring**.
3. Copie o **Client ID** e o **Client Secret**. O segredo só aparece uma vez.

### 2. Liberar o token (Zero Trust e Worker)

1. Na aplicação do Access de `memorias.bayara.com.br`, adicione uma política nova: nome `Cópia mensal`, Action **Service Auth**, regra Include > Service Token > `copia-mensal-drive`.
2. No Worker `bayaranascimento`, em Settings > Runtime variables and secrets (aba Production), crie a variável `COPIA_CLIENT_ID` com o Client ID.

### 3. Script no Google

1. Abra [script.google.com](https://script.google.com) com a conta onde as cópias devem ficar e crie um projeto chamado `Cópia do acervo`.
2. Apague o conteúdo do arquivo `Código.gs` e cole o de `scripts/copia-no-drive.gs`.
3. Em Configurações do projeto (engrenagem) > Propriedades do script, crie `CLIENT_ID` e `CLIENT_SECRET` com os valores do token.
4. De volta ao editor, escolha a função `fazerCopia` e clique em **Executar**. O Google pede autorização para acessar o Drive e sites externos: aceite. A pasta e o primeiro arquivo aparecem no Drive.
5. Escolha a função `agendarTodoMes` e execute uma vez. Pronto: a partir daí roda sozinho todo dia 1º.

Se uma cópia falhar, o Google manda um e-mail avisando.

## Restaurar

O arquivo é um JSON com `tabelas`, cada uma com suas linhas. Para restaurar, gere os comandos `INSERT` a partir dele e aplique num banco D1 vazio com `wrangler d1 execute`. Quando precisar, peça ajuda ao Claude com o arquivo em mãos.
