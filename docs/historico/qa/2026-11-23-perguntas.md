# Perguntas do QA de 23/11/2026

Sessão U, branch `qa-2026-11-23`, nascida da `homologa` em `677f3d5` (com os PRs #156 e #158, sem o #157). O que está aqui é decisão. Nada disto foi mudado. O relatório da rodada está em [`2026-11-23-relatorio.md`](2026-11-23-relatorio.md), e as capturas em `docs/visual/qa-2026-11-23/`.

**Respostas do Gui (22/11/2026, registradas na branch `tst-respostas-qa-2311`):** P3 A, P4 A, P5 A, P6 A, P7 A e P8 A, construídas na mesma branch, com as regras nas seções do assunto em `docs/decisoes.md`. P1 e P2 não receberam letra: o Gui pediu para repensar o modo TV, sem rolagem em nenhuma janela e com a composição proporcional à tela, e isso virou o item "Modo TV sem rolagem, proporcional à tela, com controles flutuantes", em "Decidido, a construir" (sessão X). O PR #157 foi fechado sem juntar.

**Como responder.** Cada pergunta tem um número e opções com letra. A primeira opção é a recomendada. Basta responder "P1 A". O que ficar sem resposta continua como está.

## Resumo

São 8 perguntas: 3 que mudam a experiência, 3 de ajuste e 2 de detalhe.

| Tela | Perguntas | Muda a experiência | Ajuste | Detalhe |
| --- | --- | --- | --- | --- |
| Explorar, modo TV | P1 e P2 | 1 | 1 | 0 |
| Memória e quem vê | P3 | 1 | 0 | 0 |
| Relato | P4 e P5 | 1 | 1 | 0 |
| Sugestão de correção | P6 | 0 | 0 | 1 |
| Compartilhar como imagem | P7 | 0 | 1 | 0 |
| Recados do site | P8 | 0 | 0 | 1 |

As que mais mudam a experiência: P1 (o que fazer quando uma memória não cabe na TV), P3 (o relato que volta a esperar depois de restringir e reabrir a memória) e P4 (o rascunho paralelo que fica preso quando outra pessoa publica o relato de quem não acessa o site).

## Explorar, modo TV

### P1. Quando a memória não cabe na janela da TV, a página rola? **Muda a experiência**

O PR #157 tira a rolagem do modo TV em 1280 × 720: o palco ganha a altura da janela e `overflow: clip`. Com o acervo de exemplo, as 48 memórias cabem. Com uma memória de título longo (120 letras), lugar longo, o trecho máximo do relato (220 letras), onze pessoas e cinco fotos, o carimbo da data sai pelo alto, o título passa por cima de "Sair do modo TV" e "Anterior", "Próxima", "Passar sozinho" e "Ajustes" ficam fora da janela, sem jeito de chegar (`tv/pr157-estresse-1280x720-fechado.png`). Sem o PR, a mesma memória faz a página rolar 458 px, e tudo continua ao alcance (`tv/homologa-estresse-1280x720-fechado.png`). Em 1440 × 900 e 1920 × 1080, o PR não vale, e essa memória rola nos dois casos.

- **A. A página rola só quando a memória não cabe.** O palco fica com a altura da janela como mínimo (`min-height`), sem `height`, `max-height` nem `overflow: clip`. As memórias comuns continuam sem rolar; a muito longa rola, como hoje, e nada some.
- **B. O título encolhe pelo tamanho,** além de A: título longo ganha um passo menor da escala, para caber mais vezes sem rolar.
- **C. O trecho do relato perde linhas** quando falta altura, além de A.

**Resposta do Gui:** nenhuma das opções. O modo TV não rola em nenhuma janela, e a composição acompanha o tamanho da tela; os controles podem flutuar e expandir, fora do fluxo da página. Virou o item "Modo TV sem rolagem, proporcional à tela, com controles flutuantes", em "Decidido, a construir", com conceito e parada na sessão X.

### P2. A foto do modo TV encolhe também em 1280 × 800? **Ajuste**

O #157 encolhe a foto principal em toda janela de até 50rem (800 px) de altura: de 365 para 294 px em 1280 × 720 (19%) e de 387 para 309 px em 1280 × 800 (20%), com o respiro menor (`tv/comparar-carol-1280x720-fechado.png`, `tv/comparar-natal-1280x800-fechado.png`). Em 1280 × 800, sem o PR, nenhuma das 48 memórias de exemplo rolava, com ou sem "Ajustes". A faixa de 50rem é a mesma da regra de "Ajustes" aberto, de 17/11/2026.

- **A. A foto encolhe só abaixo de 46rem de altura** (736 px): em 1280 × 720 ela encolhe; em 1280 × 800 a composição fica como antes. A regra de "Ajustes" continua em 50rem.
- **B. Manter como no #157,** com a foto menor em 1280 × 800 também.

**Resposta do Gui:** entra na mesma revisão do modo TV da P1. O PR #157 foi fechado sem juntar.

## Memória e quem vê

### P3. O relato escrito para todos volta a esperar depois de restringir e reabrir a memória? **Muda a experiência**

A Giovanna criou uma memória aberta a todos; a Elizete e o Gui escreveram relatos. A Giovanna restringiu a memória à família Bayara Bracarense e depois abriu de novo para todos. Pela regra de "Ampliar quem vê", o público antigo de cada relato passa a ser quem via no momento de ampliar (a família Bayara Bracarense), então os relatos da Elizete e do Gui ficaram esperando o sim deles, e um deixou de ver o relato do outro, embora os dois tenham escrito para todos. Cada um recebeu o pedido "Giovanna abriu … para toda a família. Por enquanto, o seu relato continua só para quem via antes."

- **A. O relato não espera para voltar ao público que ele já teve.** Ao ampliar, o relato só espera pelo que é novo para ele: quem nunca o viu. Quem já via o relato antes de a memória ser restringida volta a ver sem pedido.
- **B. Manter como está.** A regra vale como escrita: ampliar sempre pergunta a quem escreveu.

**Resposta do Gui:** A. Construída na branch `tst-respostas-qa-2311`.

## Relato

### P4. O que acontece com o rascunho de quem não publicou primeiro o relato de quem não acessa o site? **Muda a experiência**

Cada pessoa pode ter o seu rascunho do relato de quem não acessa o site, e publicado fica um só. A Elizete e o Gui começaram um rascunho do Aguilar na mesma memória; a Elizete publicou. O rascunho do Gui continua no banco e em "Sua conta" ("Relato de Aguilar, em andamento"), mas a página dele diz "Esse relato já foi registrado por Elizete, e só quem registrou pode alterar.", sem mostrar o texto que o Gui escreveu e sem como descartar. O relato publicado do Aguilar também some da coluna "Na memória" dessa página. Para o Gui, é um caminho sem volta.

- **A. A página mostra o rascunho e a saída.** Embaixo do recado, o texto do rascunho do Gui, para ele copiar, com "Descartar este rascunho" (vai para a lixeira, como os outros rascunhos), e o relato publicado do Aguilar continua na coluna "Na memória".
- **B. Ao publicar, os outros rascunhos vão para a lixeira** de quem os escreveu, com um aviso.
- **C. Manter como está.**

**Resposta do Gui:** A. Construída na branch `tst-respostas-qa-2311`.

### P5. A página de escrever pelo Aguilar continua com o título "Meu relato"? **Ajuste**

Em `/memorias/<id>/relato?por=aguilar`, o título grande é "Meu relato", e o rótulo da janela diz "O relato de Aguilar".

- **A. O título diz de quem é:** "Relato de Aguilar", e "Meu relato" fica para o próprio relato.
- **B. Manter como está.**

**Resposta do Gui:** A. Construída na branch `tst-respostas-qa-2311`.

## Sugestão de correção

### P6. A sugestão já respondida continua com "(hoje: …)"? **Detalhe**

Depois de aceita, a sugestão mostra "Data: 2023 (hoje: 2023)" e "Lugar: Ouro Preto (hoje: Ouro Preto)": o "hoje" passou a ser o que foi sugerido.

- **A. Respondida, a sugestão mostra só o que foi pedido,** sem "(hoje: …)".
- **B. Manter como está.**

**Resposta do Gui:** A. Construída na branch `tst-respostas-qa-2311`.

## Compartilhar como imagem

### P7. "O seu apelido" aparece quando não há apelido seu? **Ajuste**

A aba "Nome" aparece quando quem contou já faleceu, por causa de "Mostrar “em memória”". Nesse caso, "O seu apelido" aparece desabilitada, com o mesmo nome da família ("Vô Tonho" nas duas opções), mesmo sem apelido próprio (`compartilhar/gui-1280-em-memoria.png`).

- **A. Sem apelido próprio, só "O da família" e "em memória"** aparecem na aba.
- **B. Manter como está.**

**Resposta do Gui:** A. Construída na branch `tst-respostas-qa-2311`.

## Recados do site

### P8. Aspas retas nos recados de excluir e criar? **Detalhe**

Alguns recados usam aspas retas: `"Teste" foi para a lixeira. Dá para restaurar pela lixeira, em Sua conta.`, `"Capítulo" foi para a lixeira.`, `Tipo "Viagem" criado.` e `Já existe um tipo chamado "viagem".` O resto do site usa as curvas (“Festa”).

- **A. Trocar por aspas curvas** em todos os recados.
- **B. Manter como está.**

**Resposta do Gui:** A. Construída na branch `tst-respostas-qa-2311`.
