# MEM-14 · QA funcional e de permissões da homologa

27/11/2026 · Base `892d46917318c179397adb8529acb097ce05f507` (`homologa`, MEM-8) · Branch `tst-qa-homologa`. Execução no Astro, D1 e R2 locais, com o acervo de exemplo e dados sintéticos da rodada. O gabarito foi `docs/regras/`, com a fila e os casos já conhecidos em `docs/decisoes.md` e a sessão U em [23/11](2026-11-23-relatorio.md).

## Achados

As abreviações na última coluna correspondem a comandos completos em [Reprodução](#reprodução).

| Onde | Pessoa ou entrada | O que deveria acontecer | O que acontece no local | Gravidade | Reprodução |
| --- | --- | --- | --- | --- | --- |
| `/capitulos`, `/capitulos/natais` · agregados em `src/lib/servidor/repositorio.ts` | Gui, Elizete, Giovanna e Lucas Magno, com o acervo de exemplo limpo | Abrir Capítulos com contagens, cores e períodos calculados para quem olha. | HTTP 500 no índice e nos detalhes visíveis, em 34 respostas da matriz no D1 local. O erro do motor é `VIEWs and/or subqueries nested too deep`. O corpo da resposta em desenvolvimento exibe o erro interno. A mesma leitura em SQLite do Node passou. | erro | **L1** |
| `/api/memorias` · formulário de correção sem JavaScript | Gui salva uma ficha aberta antes de a memória ir para a lixeira. | Tratar o envio como edição da memória original, recusar com “Memória não encontrada” e preservar a lixeira. | A rota descarta o ID quando `obterMemoria` não devolve a ficha. O formulário recebe 303 com “Memória publicada” e um ID novo. A original continua na lixeira. O mesmo ID pela rota JSON recebe 404. | erro | **E1** |
| `/api/relatos` · formulário sem JavaScript | Repetir o mesmo envio que completou as 200 mensagens, com o mesmo código da página. | Repetir o sucesso do primeiro toque e guardar uma única mensagem, como em [Relatos](../../regras/relatos.md#relato-como-conversa). | O primeiro 303 confirma a gravação. O segundo 303 leva a “Um relato pode ter até 200 mensagens.” A contagem permanece em 200. A conferência do teto ocorre antes da verificação do envio repetido. | erro | **E2** |
| `/api/relatos` · alterações com JavaScript | Gui envia duas mensagens quase ao mesmo tempo de duas abas do mesmo relato. | A solicitação da MEM-14 pede que o uso pela mesma pessoa não resulte em 409 nem descarte o texto. | Nas cinco rodadas paralelas, um envio foi aceito e o outro recebeu 409 com “Esta memória mudou enquanto você editava. Abra de novo para ver como ficou.” O banco reteve o vencedor. No formulário comum, dois acréscimos em paralelo receberam 303 de sucesso e ambos ficaram. O 409 no JSON segue a regra geral atual da MEM-8 para edição simultânea da mesma conversa. | erro | **E3** |
| `/memorias/<id>/relato` · formulário sem JavaScript | Elizete tenta enviar uma 201ª mensagem de texto. | Recusar a nova mensagem, manter os 200 envios já salvos e devolver a caixa de texto preenchida, conforme [Formulários](../../regras/formularios.md#interação-dos-formulários). | O Chromium mostrou o recado do limite e voltou com a caixa vazia. O texto da mensagem recusada saiu do formulário. | perde dado | **N1** |
| `/api/memorias` e `/api/relatos` · validação | Gui envia título de 121 caracteres, lista de 61 pessoas ou texto de relato de 20.001 caracteres. | HTTP 400 com recado em português que identifique o campo e diga seu limite. | HTTP 400, com texto padrão da biblioteca em inglês. Exemplos “Too big: expected string to have <=120 characters” e “Too big: expected array to have <=60 items”. | erro | **E4** |

O 409 entre abas do mesmo usuário é a diferença entre o critério desta rodada e a [regra de gravação atual](../../regras/relatos.md#relato-como-conversa). A possibilidade de uma aba antiga sobrescrever o que leu antes de enviar, a corrida das legendas e o tamanho acumulado de 200 mensagens grandes já estão na fila de [decisões em aberto](../../decisoes.md#em-aberto).

## O que foi confirmado e como

- **Permissões de leitura e equivalência.** Comparei as saídas reais de `listarMemorias` e `obterMemoria` para os 39 perfis do acervo limpo e o visitante da sala, nas 54 memórias do banco, sem divergência de ficha ou listagem no SQLite do Node. Só os quatro perfis de teste entram pelo “Ver como”; as outras fichas foram verificadas pelo repositório, percorrendo a mesma consulta. Comparei também as contagens de Pessoas e a contagem e o período dos capítulos em SQLite local. As suítes `quem-ve-equivalencia`, `visibilidade-banco`, `quem-ve-casos`, `busca-banco` e `mem7-capitulos`, executadas no build, cobrem casos ocultos, cores de trilho, capas, épocas, vínculos, foto e áudio de relato, e a versão do público que espera o sim. As suítes `copias-permissao` e `copia-dos-retratos` também confirmaram que as cópias menores de fotos e retratos seguem a permissão das originais. A falha de Capítulos só apareceu no D1 do servidor.
- **Portas do site.** No servidor local, o “Ver como” troca entre Gui, Elizete, Giovanna e Lucas Magno. O perfil que pode ver um rascunho entra na sua ficha; os demais recebem a resposta de memória ausente. As ordens da TV e da sala e o palco consultam só as publicadas elegíveis. A matriz percorre o Explorar, Busca, Capítulos, Pessoas, temas e as rotas individuais. No build local com o ambiente de produção, um visitante sem pessoa recebeu 401 e o recado de acesso. Um cookie antigo de “Ver como” não concedeu acesso. A resposta 404 do handler de “Ver como” em produção para quem já tem pessoa está coberta em `testes/quem-ve-casos.test.ts`.
  Foram estas as contagens da matriz no acervo limpo. “Detalhes” inclui os próprios rascunhos, que redirecionam para a ficha.

  | Perfil | Detalhes acessíveis | Publicadas | TV da sala |
  | --- | ---: | ---: | ---: |
  | Gui | 49 | 48 | 48 |
  | Elizete | 48 | 48 | 48 |
  | Giovanna | 51 | 50 | 48 |
  | Lucas Magno | 51 | 51 | 48 |

- **Escrita no D1 local.** Criei memória com relato, acrescentei foto, enviei áudio, troquei legenda e salvei o relato em sequência, com o áudio ligado ao relato certo. Restringi a memória, confirmei 404 para Lucas Magno, gravei relato como Elizete, reabri a memória e confirmei que voltou para ele enquanto o relato ficou à espera do sim. Removi e restaurei a foto, conferi a lixeira e restaurei a memória original. A rota recusou foto solta de outra pessoa, lista vazia, pessoa inexistente e escrever no lugar de quem tem acesso. O JSON gravou 200 mensagens e recusou 201. Pelo formulário comum, salvei o rascunho, publiquei com dois envios iguais, restringi e reabri e publiquei um relato de 200 mensagens. O upload de áudio e as alterações de foto pela ficha exigem JavaScript segundo as regras. A restauração usa um formulário comum.
- **Navegador e formulários.** No Chromium sem JavaScript, publiquei a memória com o relato inicial, enviei 200 mensagens, publiquei até a âncora `#relato-<id>`, mandei a memória para a lixeira e restaurei. Com JavaScript, usei “Acrescentar fotos” e enviei um arquivo de áudio na janela do relato. O upload e o vínculo passaram em ambos. A suíte de navegador da Z2 passou os 21 casos.
- **Cópia do acervo.** As rotas de índice, partes e exportação para o espelho recusaram Elizete. Durante a leitura em partes, gravei uma memória com relato. O cliente reiniciou após a mudança de marca, entregou a memória e o relato juntos, e o arquivo restaurou em um SQLite vazio com o esquema do acervo. `PRAGMA foreign_key_check` devolveu zero problemas e o índice da busca refez duas entradas para a memória. Entre as 42 tabelas exportadas ficaram fora a marca, as reservas das cópias, a faxina do ambiente de teste e o índice derivado da busca.
- **Espelho.** O arquivo continha oito tabelas da família e somente as colunas previstas. A importação recusou a cópia integral, uma tabela extra e a coluna `sobre` acrescentada. Ao importar o arquivo aceito, o D1 local trocou as memórias por exemplos, a memória sintética usada como controle sumiu e o campo “Sobre” ficou vazio em todas as pessoas. As suítes `espelho` e `copia-para-o-espelho` cobriram também a substituição dos retratos e dos arquivos.
- **Natal.** No Início, fora da primeira visita à carta, o cartão “Na TV da sala” aparece de 24 a 26/12 e some nos dias 23 e 27. As regras de primeira visita, aniversários e memórias de Natais anteriores também passaram nas suítes de Início. O visitante da sala vê o subconjunto aberto a todos, com rascunhos, memórias na lixeira e relatos ainda em espera de liberação fora do palco.
- **Modo TV no Chromium.** Três memórias de exemplo nas oito janelas, dentro e fora da sala, passaram na medição de rolagem, navegação por teclado, ocultar e reexibir controles e partes de “Ler tudo”. Na suíte de 20 casos do Playwright, 18 passaram depois de carregar as mídias. Os dois restantes passaram ao repetir isoladamente com a semente limpa. A primeira execução concorrente mostrou sobreposição de erro do Vite enquanto o servidor também atendia à matriz de rotas, e os controles passaram na rodada isolada.
- **Partida e build.** A guarda passou. Na primeira execução paralela, o teste da árvore de meio-irmãos de `testes/arvore-meio-irmaos.test.ts` atingiu o limite de 5 s. Com `VITEST_MAX_WORKERS=2 npm run build`, passaram 2.515 testes, com 41 verificações de navegador omitidas por configuração nesse comando, e o build terminou. A medição de partida de `tsc --noEmit` com TypeScript 7.0.2 contou 227 diagnósticos na base.

## Possível decisão de interface

- Em “Acrescentar fotos”, o envio exige JavaScript. Vale decidir se, junto do recado para ligar JavaScript, a ação “Acrescentar fotos” deve continuar visível. A regra funcional de envio e as verificações de permissão independem dessa escolha.

## Limites da execução

A rodada usou o acervo de exemplo, as mídias do repositório e arquivos sintéticos. A execução de navegador foi no Chromium. O login do Cloudflare Access, a transcrição com o modelo remoto, o microfone, o Safari no iPhone e o televisor físico ficaram fora da execução local.

## Reprodução

A partir da raiz da worktree, com Node 24, abra um servidor local e use apenas o acervo de exemplo. As rodadas de escrita criam dados sintéticos. Rode o espelho por último, pois a importação substitui o banco local.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 43815
```

Use outro terminal para a execução.

```sh
curl -s http://127.0.0.1:43815/ -o /dev/null
node scripts/enviar-fotos-de-exemplo.mjs http://127.0.0.1:43815
node scripts/qa-homologa-2026-11-27.mjs http://127.0.0.1:43815 repositorio
node scripts/qa-homologa-2026-11-27.mjs http://127.0.0.1:43815 leitura
node scripts/qa-homologa-2026-11-27.mjs http://127.0.0.1:43815 escrita
node scripts/qa-homologa-2026-11-27.mjs http://127.0.0.1:43815 copia
node scripts/qa-homologa-2026-11-27.mjs http://127.0.0.1:43815 espelho
```

- **L1** — `curl -i -b como=gui http://127.0.0.1:43815/capitulos` e o mesmo comando com `/capitulos/natais`.
- **E1 a E4** — o comando `escrita` acima. Procure, respectivamente, “lixeira e envio tardio da ficha aberta antes de excluir”, “formulário no limite”, “duas abas da mesma pessoa” e “entradas ruins JSON”.
- **N1** — no comando de navegador abaixo, veja “formulário real no limite e texto após a recusa”.
- **Visitante sem pessoa.** depois do build, `npm run preview -- --host 127.0.0.1 --port 43816`. Consulte `/`, `/explorar`, `/capitulos`, `/pessoas`, `/busca/resultado?q=natal`, `/explorar/palco?m=2025-natal`, `/api/copia`, `/api/copia-para-o-espelho` e `/como/giovanna` em `http://127.0.0.1:43816`, com ou sem `-b como=gui`. O build local usa as variáveis de produção e os recursos locais.
- **Navegador.** com Playwright e Chromium instalados, ponha o diretório que contém o pacote `playwright` em `NODE_PATH`.

```sh
SALA_SERVIDOR=http://127.0.0.1:43815 Z2_SERVIDOR=http://127.0.0.1:43815 npx vitest run testes/sala-navegador.test.ts testes/revisao-z2-navegador.test.ts --maxWorkers=1
TV_SO=1999-chegada-da-giovanna,2025-natal,2012-casamento-carol-davi npm run tv -- http://127.0.0.1:43815
node scripts/qa-homologa-navegador-2026-11-27.mjs http://127.0.0.1:43815
```
