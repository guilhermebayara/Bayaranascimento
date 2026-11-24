# Cópia do acervo no Google Drive

Todo dia 1º, de madrugada, um script na conta Google do Gui busca a cópia do banco, em partes, e salva um arquivo `acervo-AAAA-MM-DD.json` na pasta **Acervo Bayara Nascimento, cópias** do Drive. Cada arquivo tem todas as tabelas: memórias (inclusive rascunhos e restritas a núcleos), relatos, pessoas, núcleos, histórico de versões e a lista de fotos. As fotos em si ficam no R2 e não entram na cópia.

Para uma cópia na hora (depois de cadastrar muita coisa, por exemplo), um administrador toca em **Baixar cópia do acervo** (na página "Administração", do menu do retrato, em "Espaço e cópias"), espera o andamento ("Baixando 3 de 14") chegar ao fim e guarda o arquivo onde quiser. O arquivo é o mesmo que o script grava no Drive.

## Em partes (desde 23/11/2026, sessão D1e)

No plano gratuito da Cloudflare, cada pedido ao site tem 10 ms de processador. A cópia inteira num pedido só gastava de 6 a 12 vezes isso com o acervo cheio. Por isso a cópia vem em partes: o script (e o navegador, no "Baixar cópia do acervo") pede primeiro o índice, em `/api/copia`, com as tabelas e quantas linhas cada uma tem, e depois cada tabela em páginas, em `/api/copia?tabela=<nome>`, seguindo `&depois=<n>` enquanto a parte disser `proxima`. Quem pede junta tudo e grava um arquivo só, no formato de sempre, sem recuo.

- Uma parte que falha é pedida de novo, até 3 vezes. Se ainda falhar, nada é gravado e o script falha, e o Google manda o e-mail.
- O script novo funciona também com o site de antes, que mandava a cópia inteira de uma vez. O script de antes, com o site novo, falha (o índice não é a cópia) e manda o e-mail.
- O token, as propriedades e o agendamento não mudam.

## De um instante só (desde 24/11/2026, sessão D1f)

O índice e cada parte trazem a `marca`, um número que sobe a cada gravação no acervo. As gravações de registro, que anotam o uso do site (a visita ao abrir o Início, o primeiro acesso, a anotação da cópia mensal), não sobem a marca: num dia de uso, a cópia não recomeça por causa delas. Se a marca de uma parte for diferente da do índice, algo foi gravado no meio da cópia, e o arquivo juntado poderia não restaurar (um relato sem a memória dele, por exemplo). Então quem junta recomeça a cópia inteira, até 4 vezes, com uma espera entre elas. Se o acervo mudar nas 4, nada é gravado: o script falha e o Google manda o e-mail ("o acervo mudou durante a cópia"); o botão da Administração diz para tentar de novo daqui a pouco. Basta rodar `fazerCopia` de novo mais tarde.

- O arquivo continua o mesmo: as mesmas tabelas, o mesmo nome e o mesmo formato. A tabela da marca não entra nele.
- O script novo funciona com o site de antes (sem a marca), juntando sem conferir. A conferência só vale com os dois atualizados.

O Cloudflare também guarda o histórico do banco por conta própria (Time Travel do D1), o que permite voltar o banco a um momento dos últimos dias em caso de erro grave. A cópia no Drive cobre o resto: um lugar fora do Cloudflare, com um arquivo por mês.

## Como funciona

O site é fechado pelo Cloudflare Access, então o script entra com um **token de serviço**: um par Client ID e Client Secret criado no Zero Trust. O Access deixa esse token passar só pela política "Cópia mensal", e o site só aceita esse token no endereço `/api/copia`. Com ele não dá para ver páginas nem gravar nada.

- No site, a variável `COPIA_CLIENT_ID` guarda o Client ID (que não é segredo).
- No Apps Script, as propriedades `CLIENT_ID` e `CLIENT_SECRET` guardam o par.

O token pode ser revogado a qualquer momento no Zero Trust, e a cópia para na hora.

Cada vez que o script baixa a cópia, o site anota a data (tabela `copias_mensais`), quando ele pede a última parte. Em "Sua conta", os administradores veem a data da última cópia mensal, e ela vira pendência quando passa de 35 dias ou nunca foi feita. O script não precisou mudar para isso.

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

### Aviso de tamanho do banco

A cópia traz o tamanho do banco (`banco.tamanho_em_bytes`). Quando ele passa de 300 MB, o script salva a cópia normalmente e depois falha de propósito, com a mensagem do tamanho: é assim que o Google manda o e-mail de aviso. O limite do plano gratuito é 500 MB por banco; a saída combinada é o plano Workers Paid (10 GB por banco).

**Ao atualizar o script:** o arquivo `scripts/copia-no-drive.gs` do repositório não chega sozinho ao Google. Sempre que ele mudar, abra o projeto `Cópia do acervo` no script.google.com, troque o conteúdo de `Código.gs` pelo novo e salve. As propriedades e o agendamento continuam como estavam. Depois, escolha `fazerCopia` e clique em **Executar** uma vez, para conferir que o arquivo do dia aparece no Drive. O que mudou em cada versão fica escrito no alto do próprio arquivo.

## Restaurar

O arquivo é um JSON com `tabelas`, cada uma com suas linhas, como objetos. Os arquivos de antes de 23/11/2026 têm recuo; os de depois, não, e as linhas de cada tabela vêm em ordem de rowid. Os dois se leem do mesmo jeito. Para restaurar, gere os comandos `INSERT` a partir dele e aplique num banco D1 vazio com `wrangler d1 execute`. Quando precisar, peça ajuda ao Claude com o arquivo em mãos.

Os arquivos de 24/11/2026 em diante são o banco de um instante só (ver "De um instante só", acima): nada gravado no meio da cópia entra pela metade. Nos de antes, o que alguém gravou enquanto a cópia era feita pode ter entrado ou não; se a restauração de um desses falhar numa chave estrangeira, apague a linha que aponta para o que falta.

## Para o espelho da homologação

O espelho não usa esta cópia. Ele usa a **Baixar cópia para o espelho**, também em "Espaço e cópias" no site de verdade, que leva só as pessoas, as famílias e os laços (alguns KB). O espelho recusa a cópia inteira, com recado.
