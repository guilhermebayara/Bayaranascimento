# A cópia do acervo e o espelho

Todo dia 1º, de madrugada, um script na conta Google do Gui busca a cópia do banco, em partes, e salva um arquivo `acervo-AAAA-MM-DD.json` na pasta **Acervo Bayara Nascimento, cópias** do Drive. Cada arquivo tem todas as tabelas: memórias (inclusive rascunhos e restritas a núcleos), relatos, pessoas, núcleos, histórico de versões e a lista de fotos. As fotos em si ficam no R2 e não entram na cópia.

Para uma cópia na hora (depois de cadastrar muita coisa, por exemplo), um administrador toca em **Baixar cópia do acervo** (na página "Administração", do menu do retrato, em "Espaço e cópias"), espera o andamento ("Baixando 3 de 14") chegar ao fim e guarda o arquivo onde quiser. O arquivo é o mesmo que o script grava no Drive.

## Como a cópia é feita

A cópia vem em partes, porque cada pedido ao site tem 10 ms de processador no plano gratuito: o índice em `/api/copia`, com as tabelas e quantas linhas cada uma tem, e depois cada tabela em páginas. Quem pede (o script, ou o navegador no "Baixar cópia do acervo") junta tudo num arquivo só, no formato de sempre, sem recuo. Uma parte que falha é pedida de novo, até 3 vezes; se ainda falhar, nada é gravado, o script falha e o Google manda o e-mail.

Quem junta confere que nada foi gravado no acervo no meio da cópia (a marca) e que o arquivo montado restaura (a rede no fim), e recomeça a cópia inteira, até 4 vezes, com uma espera entre elas. As gravações de registro, como a visita ao abrir o Início, não fazem a cópia recomeçar. Se o acervo mudar nas 4, nada é gravado: o script falha e o Google manda o e-mail ("o acervo mudou durante a cópia"); o botão da Administração diz para tentar de novo daqui a pouco. Basta rodar `fazerCopia` de novo mais tarde. As regras, uma a uma, estão em "Por dentro", no fim.

O Cloudflare também guarda o histórico do banco por conta própria (Time Travel do D1), o que permite voltar o banco a um momento dos últimos dias em caso de erro grave. A cópia no Drive cobre o resto: um lugar fora do Cloudflare, com um arquivo por mês.

## Como funciona

O site é fechado pelo Cloudflare Access, então o script entra com um **token de serviço**: um par Client ID e Client Secret criado no Zero Trust. O Access deixa esse token passar só pela política "Cópia mensal", e o site só aceita esse token no endereço `/api/copia`. Com ele não dá para ver páginas nem gravar nada.

- No site, a variável `COPIA_CLIENT_ID` guarda o Client ID (que não é segredo).
- No Apps Script, as propriedades `CLIENT_ID` e `CLIENT_SECRET` guardam o par.

O token pode ser revogado a qualquer momento no Zero Trust, e a cópia para na hora.

Cada vez que o script grava a cópia no Drive, ele confirma ao site (`/api/copia?confirmar=...`, com o mesmo token), e só então o site anota a data (tabela `copias_mensais`). Uma tentativa descartada não anota nada. Em "Sua conta", os administradores veem a data da última cópia mensal, e ela vira pendência quando passa de 35 dias ou nunca foi feita.

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

Os arquivos de 24/11/2026 em diante são o banco de um instante só (ver "A cópia é de um instante só", em "Por dentro"): nada gravado no meio da cópia entra pela metade. Nos de antes, o que alguém gravou enquanto a cópia era feita pode ter entrado ou não; se a restauração de um desses falhar numa chave estrangeira, apague a linha que aponta para o que falta.

## O espelho da produção

A homologação usa a família de verdade (Gui, 18/11): **nomes, datas e laços passam; memórias, relatos, textos, retratos e fotos nunca passam.** O que passa, coluna por coluna, está em "Espelho da produção", abaixo.

O espelho não usa a cópia do acervo. Para refazer: no site de verdade, "Baixar cópia para o espelho", em "Espaço e cópias" (só as tabelas da família, alguns KB); na homologação, "Espelho da produção" → enviar esse arquivo. A cópia inteira do acervo é recusada pelo espelho, com recado. Os dois ficam na conta (o retrato do topo), em "Administração". Refaça depois de cargas grandes na produção e antes de testar mudanças na árvore.

- A transformação está em `src/lib/espelho.ts`, testada em `testes/espelho.test.ts`: nada que alguém escreveu ou fotografou passa (memória, relato, "Sobre", foto, áudio, capítulo, carta), e as escolhas que só o dono vê (círculo, como o ex aparece) são apagadas. A guarda confere que o espelho só lê da cópia as tabelas da família e que o "Sobre" sai vazio.
- A cópia para o espelho está em `src/lib/copia-para-o-espelho.ts` (a lista das tabelas e colunas) e `src/lib/servidor/copia-para-o-espelho.ts` (a leitura), testada em `testes/copia-para-o-espelho.test.ts`. A guarda (`scripts/copia-para-o-espelho.mjs`) confere que ela só lê as tabelas da família, coluna por coluna, sem texto escrito nem arquivo, e que o espelho só aceita ela.
- O espelho é gravado direto no banco da homologação e nunca entra no repositório. Ele não grava em bucket nenhum, e a cópia para o espelho não lê o bucket. A produção nunca grava na homologação: ela só monta a cópia para o espelho, e quem grava é a homologação, ao receber o arquivo.
- A escolha do banco é feita pelo endereço do pedido (`src/lib/servidor/ambiente.ts`): o Cloudflare aplica a mesma configuração a todas as prévias, e só `homologa.memorias.bayara.com.br` usa `DB_HOMOLOGA` e `FOTOS_HOMOLOGA`.
- A homologação nunca recebe o acervo de exemplo. Só as 11 fotos de exemplo são compartilhadas, lidas do bucket de teste (ver ["Fotos de exemplo"](regras/exemplos.md#fotos-de-exemplo)). Na homologação e nas prévias, o "Ver como" do topo continua valendo.
- No computador, a página "Espelho da produção" também aparece, para testar o espelho. Ele troca todo o banco local; para voltar ao acervo de exemplo, apague a pasta `.wrangler`.

### Espelho da produção

(Gui, 18/11) No código: `src/lib/espelho.ts`, teste em `testes/espelho.test.ts`, guarda em `scripts/confere-producao.mjs`.

A homologação tem a família de verdade: nomes, datas e laços passam; memórias, relatos, textos, retratos e fotos nunca passam. Passam as pessoas (id, nome, apelido, tipo, espécie, como se referir, nascimento e falecimento completos, quem administra), quem é de cada família, as filiações com a data da adoção, os casais com as fases e as famílias que veem, os laços do coração com o nome, o papel, a proximidade e o privado, e os laços resumidos. O "Sobre" é texto e fica vazio. No lugar das memórias entram memórias de exemplo, com títulos feitos com os nomes de verdade e as fotos do Chico e da Karol. Nenhum arquivo da produção chega à homologação (Gui, 18/11): o espelho sai da "Baixar cópia para o espelho" (ver "Cópia para o espelho", abaixo), que leva só o banco, e cada retrato é uma das fotos de exemplo do Chico e da Karol, sorteada pelo id como nas prévias (`retratoDeExemplo`). O teste do espelho e a guarda conferem que a chave e o arquivo do retrato de verdade não passam, que o espelho não grava em bucket e que a cópia não lê o bucket. As colunas que passam são listadas uma a uma no espelho, e a guarda falha se ele ler da cópia uma tabela que não seja da família ou passar o "Sobre". A faixa do alto da homologação é listrada em manteiga, com "Homologação" e "A família de verdade, com memórias de exemplo. O que você faz aqui não vai para o site." (`.teste--homologa`).

### Cópia para o espelho

(Gui, 23/11) No código: `src/lib/copia-para-o-espelho.ts`, testes em `testes/copia-para-o-espelho.test.ts` e `testes/guarda-copia-para-o-espelho.test.ts`.

Na Administração, em "Espaço e cópias", "Baixar cópia para o espelho" (`/api/copia-para-o-espelho`, só os administradores) entrega só as tabelas que o espelho lê, e nelas só as colunas que ele usa (`COLUNAS_PARA_O_ESPELHO`): as pessoas sem o "Sobre" e sem o retrato, quem é de cada família, as filiações, os casais com as fases e as famílias que veem, os laços do coração e os laços resumidos. Nada de memória, relato, mensagem, foto, áudio, capítulo, carta, nem o círculo, "Como você chama" (`apelidos_meus`) ou como o ex aparece. O apelido público de cada pessoa (`integrantes.apelido`) vai, porque o espelho já leva. O arquivo é `acervo-familia-AAAA-MM-DD.json`, com a marca `conteudo: "familia-para-o-espelho"`, e tem poucos KB. O botão aparece fora da homologação, porque é a produção que manda a família para lá; a frase ao lado diz "A cópia para o espelho leva só as pessoas, as famílias e os laços, para refazer o espelho na homologação." O espelho da homologação só aceita esse arquivo (`recusaDaCopiaParaOEspelho`, na rota e em `gravarEspelho`): a cópia inteira do acervo é recusada com "Este arquivo é a cópia inteira do acervo. Para o espelho, use “Baixar cópia para o espelho”, na Administração do site de verdade, e envie o arquivo que ele baixar.", e um arquivo com tabela ou coluna fora da lista, com "Este arquivo não é a cópia para o espelho.". O limite do arquivo do espelho é 1 MB (`LIMITE_DA_COPIA_PARA_O_ESPELHO`), mais de 20 vezes a cópia da família de hoje; o pedido que declara mais que isso nem é lido. Guarda: regra 11 de `scripts/confere-producao.mjs`, que confere em `scripts/copia-para-o-espelho.mjs` que a lista só tem tabelas da família e nenhuma coluna de texto escrito ou arquivo, que a montagem só lê pela lista (sem `SELECT *`, sem outro SQL, sem bucket e sem outro módulo do servidor), que a rota é só dos administradores e que o espelho recusa o que não for a cópia para o espelho antes de gravar. O teste confere que o espelho feito dela é igual ao feito da cópia inteira e que o espelho não lê da cópia nenhuma coluna fora da lista. O espelho também recusa um arquivo com uma pessoa de id `:sala`, o id reservado de quem olha na TV da sala (`ID_DO_VISITANTE_DA_SALA`, em `src/lib/sala.ts`), com o recado "Este arquivo traz uma pessoa com o id “:sala”, que é reservado para a TV da sala. Nada foi gravado: confira o arquivo.": uma pessoa com esse id seria membro de família no lugar da sala.

- Na página "Espelho da produção", o primeiro toque em "Refazer o espelho" abre a pergunta "Trocar tudo o que está na homologação?", com "Trocar tudo" e "Cancelar"; só o segundo toque envia.

## Por dentro: as regras da cópia

### Cópia do acervo em partes

(Gui, 23/11) No código: `src/lib/copia-em-partes.ts` e `src/lib/servidor/copia.ts`, testes em `testes/copia-em-partes.test.ts`.

A cópia inteira num pedido só gastaria de 6 a 12 vezes os 10 ms de CPU por pedido do plano gratuito. `/api/copia` sem parâmetros devolve o índice (as tabelas, em ordem de nome, e quantas linhas cada uma tem, mais o tamanho do banco), e `/api/copia?tabela=<nome>&depois=<n>` devolve uma página de uma tabela, em ordem de rowid, a partir da linha seguinte a `depois` (o que a página anterior disse em `proxima`). Cada parte traz os nomes das colunas uma vez e as linhas como listas de valores, sem recuo; as tabelas com texto escrito (relatos, mensagens, versões, memórias, cartas, avisos, sugestões e capítulos) vão em páginas menores (`linhasPorParte`). Quem pode pedir é conferido igual no índice e em cada parte: o token de serviço da cópia mensal (no middleware) ou um administrador logado (na rota); a parte só aceita o nome de uma tabela do índice e um `depois` numérico. O índice não revela nada além do que a cópia inteira já revela (os nomes das tabelas e quantas linhas cada uma tem) e não tem a chave `tabelas`, para o script antigo do Drive falhar com o e-mail em vez de guardar o índice como cópia. Quem junta: o script do Drive e o navegador do administrador, num arquivo só, no formato de sempre (`acervo`, `gerada_em`, `banco`, `tabelas`, com as linhas como objetos), sem recuo e com as linhas de cada tabela em ordem de rowid; a restauração e o espelho leem esse formato. A cópia mensal é anotada (`copias_mensais`) só quando o script confirma que gravou o arquivo no Drive (ver "A cópia mensal só conta no Drive", abaixo).

### A cópia é de um instante só

No código: migração `113-marca-da-copia`, `src/lib/servidor/marca-da-copia.ts`, teste em `testes/copia-consistente.test.ts`.

Uma memória e o relato dela gravados entre a última parte de `memorias` e a primeira de `relatos` deixariam no arquivo o relato sem a memória, e a restauração falharia na chave estrangeira. Por isso o banco tem a marca de mudança, um número numa tabela de uma linha (`marca_da_copia`) que sobe a cada linha inserida, mudada ou apagada em qualquer tabela, por três gatilhos em cada tabela (`marca_da_copia_<tabela>_insert`, `_update` e `_delete`). Os gatilhos são criados por `garantirGatilhosDaMarca` ao preparar o banco e de novo no índice da cópia, para toda tabela que existir (uma tabela nova, ou refeita por uma migração, ganha os dela sem lembrar à mão). O índice traz `marca`, lida no mesmo lote das contagens, e cada parte também, lida na mesma consulta das linhas. Quem junta (o script do Drive, o botão "Baixar cópia do acervo" e `montarCopia`) só aceita a sequência em que a marca de toda parte é a do índice: nada foi gravado entre o índice e a última parte, e o arquivo é o banco de um instante só, que restaura com as chaves estrangeiras, as chaves únicas e as condições de cada tabela. Se a marca mudou, a sequência inteira recomeça, até 4 vezes (`TENTATIVAS_DA_COPIA`), com espera entre elas; nas 4, nada é gravado nem baixado: o script falha com o e-mail do Google ("A cópia não veio: o acervo mudou durante a cópia nas 4 tentativas.") e o botão diz "O acervo mudou enquanto a cópia era feita. Tente de novo daqui a pouco.". Sem a linha da marca, o índice e as partes respondem 500, em vez de entregar uma cópia que não confere. A tabela da marca fica fora da cópia: o arquivo tem as mesmas tabelas e o mesmo formato, e a restauração e o espelho o leem do mesmo jeito. O script novo também funciona com o site de antes (sem a marca), juntando sem conferir. A guarda por pedido sabe que gravar em qualquer tabela muda a marca (`cobrirGravacaoEmTodaTabela`, em `ambiente.ts`).

### As tabelas de registro não sobem a marca

No código: `TABELAS_DE_REGISTRO`, em `src/lib/servidor/marca-da-copia.ts`.

Elas anotam o uso do site, e não o acervo. Com elas subindo a marca, num dia de uso (o Natal, com 7 pessoas abrindo o site) o "Baixar cópia do acervo", com umas 74 partes em sequência, encontraria uma visita no meio em todas as passadas e falharia. São `visitas` (gravada a cada abertura do Início), `acessos` (o primeiro acesso), `copias_mensais` (a anotação da cópia mensal) e `envios` (o código de envio sem script). Elas continuam indo inteiras na cópia; só não fazem a sequência recomeçar. Uma tabela só entra na lista se cumprir o critério, conferido no esquema de verdade por `testes/copia-consistente.test.ts`: (1) nenhuma outra tabela aponta para ela por chave estrangeira; (2) as chaves estrangeiras dela, se houver, só apontam para tabelas que sobem a marca, de modo que um relato sem a memória continua impossível no arquivo; (3) uma linha dela não aparece duas vezes no arquivo: nenhuma chave única além da primária, nenhuma gravação com `REPLACE`, e a linha muda no lugar ou é nova (a única que apaga e volta a gravar a mesma chave é `visitas`, pelo "Voltar à primeira visita", com uma linha por pessoa, que vem numa parte só). Os gatilhos que existirem numa tabela de registro saem com `garantirGatilhosDaMarca`, ao preparar o banco e no índice da cópia, sem migração editada.

### A rede no fim da cópia

(chat, 24/11, reversível: uma rede no fim em vez de um ajuste na marca para cada canto) No código: `conferirCopia`, em `src/lib/copia-em-partes.ts`, e `conferirArquivo`, em `scripts/copia-no-drive.gs`; testes em `testes/copia-rede.test.ts`.

Antes de gravar no Drive e antes de entregar o arquivo no navegador, quem junta confere o arquivo montado contra o esquema do banco: nenhuma chave primária ou única repetida e nenhuma chave estrangeira sem o alvo. A régua vem no índice (`esquema`), tirada das pragmas (`pragma_table_info`, `pragma_index_list` com `pragma_index_info` e `pragma_foreign_key_list`) no mesmo lote da lista das tabelas, das contagens e da marca, e nunca de uma lista escrita à mão. Os índices únicos com condição (`WHERE`) ficam fora da régua, porque a conferência não avalia a condição; os três que existem estão em tabelas do acervo, que a marca cobre. Se a conferência falhar, a sequência inteira é refeita, dentro das mesmas 4 passadas; na última, nada é gravado nem baixado, com a mesma falha da marca. A marca continua como o atalho para recomeçar cedo. No mesmo lote, o índice lê os gatilhos da marca: uma tabela listada sem eles (criada ou refeita entre `garantirGatilhosDaMarca` e o lote) faz o índice garantir os gatilhos e ler tudo de novo, até 3 vezes, esquecendo a cada vez o que o pedido já tinha lido (`esquecerAsLeiturasDoPedido`, em `ambiente.ts`).

### A marca do esquema

No código: `MARCA_DO_ESQUEMA`, em `src/lib/servidor/copia.ts`.

O índice e cada parte trazem também `marca_do_esquema`, um resumo do `sqlite_master` (quantos objetos e somas sobre a `rootpage` e o tamanho do SQL), lido na mesma consulta das linhas. Uma tabela criada, mudada, apagada ou refeita no meio da cópia muda o resumo (refeita com o mesmo SQL, ela ganha outra `rootpage`), e a passada é descartada como quando a marca de mudança sobe. Fecha o caso de uma tabela refeita sem os gatilhos, com uma linha trocada que só um índice único com condição pegaria. O D1 não deixa ler `PRAGMA schema_version`, nem como tabela ("not authorized"); o resumo do `sqlite_master` é lido sem restrição. No caminho alternativo, sem a pragma como tabela, o índice lê a marca e a marca do esquema de novo depois das pragmas, e uma diferença faz a tentativa recomeçar.

### O esquema que a cópia sustenta

No código: `testes/esquema-da-copia.test.ts`, com a conta em `testes/apoio/esquema-sustentado.ts`.

A rede compara as chaves valor a valor, sem collation, e só pelas colunas. Por isso, nas tabelas da cópia, o esquema não tem coluna gerada (a restauração não grava nela), índice único por expressão (fora da régua) nem collation diferente da BINARY numa coluna de chave, inclusive a coluna de lá de uma chave estrangeira. Também não tem tabela `WITHOUT ROWID`: a cópia pagina cada tabela por rowid (`montarParte`, em `src/lib/servidor/copia.ts`), e sem ele não acha onde recomeçar a próxima parte. O teste confere isso no esquema de verdade, depois de todas as migrações e dos exemplos, e falha com o recado para ajustar a cópia junto (a régua, `conferirCopia`, `conferirArquivo` e a restauração) ou trocar o esquema. Índice único com condição continua aceito: a marca cobre as tabelas do acervo onde eles estão.

### Duas tabelas não vão na cópia

No código: `TABELAS_FORA_DA_COPIA`, em `marca-da-copia.ts`.

São `reservas_das_copias`, a trava de uns minutos enquanto um pedido grava as cópias de uma foto no bucket, e `limpezas_do_teste`, a faxina diária das prévias. Não são acervo, e uma reserva solta e retomada no meio da cópia saía duas vezes no arquivo. Restaurar sem elas só perde travas que venceriam sozinhas em 5 minutos e o dia da última faxina das prévias, que roda de novo no pedido seguinte sem estrago. Nenhuma tabela aponta para elas, e nada depende delas depois de uma restauração. Os gatilhos da marca que existirem nelas saem com `garantirGatilhosDaMarca`.

### A cópia mensal só conta no Drive

O middleware não anota a cópia ao entregar a última parte, o que contaria como feita uma passada que depois fosse descartada. O script, depois de gravar o arquivo, faz um pedido próprio, `GET /api/copia?confirmar=<gerada_em do índice>`, com o mesmo token e na mesma rota, sem abrir outra rota ao token; só esse pedido anota em `copias_mensais`. Vale só uma data de cópia das últimas 24 horas, e a confirmação é idempotente (migração `114-copia-mensal-confirmada`): cada anotação guarda a `gerada_em` que confirma, e a mesma `gerada_em` anota uma vez só, conferida no próprio `INSERT`, sem chave única, para a tabela continuar no critério das tabelas de registro. O administrador logado que pede `confirmar` recebe 404, e o botão da Administração nunca anota. **Risco aceito** (chat, 24/11): quem tem o token de serviço pode confirmar uma data inventada das últimas 24 horas e apagar o lembrete de cópia atrasada. Esse token já lê o acervo inteiro, e a confirmação só mexe nesse lembrete; ela não grava nada do acervo. Se a confirmação falhar, o arquivo fica no Drive e o e-mail do Google diz que a data não foi anotada. O script de antes, com o site novo, grava mas não confirma: depois de 35 dias aparece a pendência "cópia mensal atrasada", o sinal para colar o novo.

### Cópia mensal no Drive em partes

No código: `scripts/copia-no-drive.gs`.

O script pede o índice e as partes, junta e grava um arquivo só, na mesma pasta e com o mesmo nome. Uma parte que falha é pedida de novo, até 3 vezes, com 2 e 4 segundos de espera; se ainda falhar, nada é gravado e o script falha, e o Google manda o e-mail. Com o site de antes, que manda a cópia inteira de uma vez, o script guarda o que veio. Sem segredo novo e sem mudar o token. O teste roda o script de verdade numa caixa de areia, com o Google de mentira e o middleware de verdade.

### "Baixar cópia do acervo" em partes

Na Administração, o botão pede o índice e as partes pelo navegador, com o andamento ao lado ("Baixando 3 de 14"), e monta o arquivo no aparelho (`acervo-AAAA-MM-DD.json`, com o dia de São Paulo). Uma parte que falha é pedida de novo até 3 vezes; se ainda falhar, nada é baixado e aparece "Não consegui baixar a cópia. Confira a internet e tente de novo." Sem JavaScript, o botão não funciona, e uma nota diz isso.

Origem: as regras de "O espelho da produção" e de "Por dentro" vieram de `docs/decisoes.md`, "Infraestrutura", e do `CLAUDE.md`, "O espelho da produção"; o processo está no [histórico depois de 17/11](historico/decisoes-depois-de-2026-11-17.md#infraestrutura).
