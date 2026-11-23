# A memória como lugar de ler e contar (exploração E3)

Situação: escrito no chat e aprovado pelo Gui em 22/11/2026. Vira a sessão de exploração E3: duas propostas numa prévia `tst-memoria-vozes`, e a sessão para até o Gui escolher. Prazo: antes de 10/12/2026.

## De onde vem

As críticas de design C1 e C2 de 22/11/2026 e as respostas do Gui no item "Críticas de design C1 e C2 dos fluxos de quem recebe o presente", em `docs/decisoes.md`, "Decidido, a construir", e a ideia do Gui em "Em aberto", "Escrever o relato na própria página da memória". Esta exploração junta as duas coisas e resolve as duas de uma vez. Os relatórios estão em `docs/critica/`. Ler antes de começar:

- C2, fluxo 2, "A página da memória" ("Quem estava" pesa mais que os relatos; as vozes como bolhas de mensagem).
- C2, fluxo 3, inteiro, e C1, fluxo 3, inteiro.
- O esboço `relato-com-a-memoria.html` da C2 (em `docs/critica/esbocos/`): o quadro A (a memória à vista ao escrever) e o quadro B (a linha do rascunho que se diz).
- `docs/decisoes.md`, "Relato como conversa", "Reações", "Botão de menu nas memórias" e "Ampliar quem vê uma memória com relatos"; `docs/visual.md`, "Página da memória".

## O problema

**Para ler, a memória mistura dois vocabulários.** A abertura é de revista (a foto e o verso), a parede é a caixa de fotos na mesa, e o meio virou um aplicativo de mensagens: cada relato é uma bolha branca de cantos redondos num cartão recuado, com o coração e os três pontos embaixo, e cada foto da parede ganhou a mesma fileira de símbolos. Contra a direção visual ("parecer revista, nunca scrapbook", "o álbum de família editado"), a parte mais única da memória, a voz de cada um, parece outro produto. O padrão da conversa veio de uma premissa boa do Gui ("padrões que as pessoas já conhecem") e funciona para escrever.

**Para contar, a pessoa sai da memória.** A página de escrever (`/memorias/<id>/relato`) não mostra a foto, que é o que traz a lembrança. Enviar guarda um rascunho que só a pessoa vê, e no padrão emprestado enviar é entregar: quem sai sem tocar em "Publicar relato" deixa o relato parado sem saber. Depois de publicar, a voz só aparece na memória com mais um toque. A ideia do Gui em "Em aberto" já aponta a saída: escrever na própria página da memória, onde o rascunho aparece no lugar em que vai ficar.

## Os objetivos

**De uso.** Ler cada voz de uma memória de cima para baixo, sem entender nada antes. Contar a própria parte com a foto e quem estava à vista, por escrito ou pela voz com o mesmo peso, e saber sem dúvida o que os outros já veem e o que ainda é só seu.

**Visual.** A memória inteira fala a língua do álbum: a voz de cada pessoa com a tipografia do álbum (o nome à mão, o texto como bilhete), guardando o que a conversa trouxe de bom: cada um uma voz, a ordem das mensagens, o áudio no meio do texto, "Citar". A parede volta a ter a calma da caixa aberta na mesa.

## O que já está decidido e não se reabre

- **Primeiro publicar.** O relato nasce rascunho, cada envio é guardado na hora só para quem escreve, e tudo entra na memória com "Publicar relato". Depois de publicado, cada mensagem nova entra na hora.
- As regras de "Relato como conversa": uma mensagem por envio (texto, áudio ou foto), editar com versão, a ordem, "Contou mais em…", citar só mensagem publicada de outra pessoa que quem escreve vê, "registrado por" e os rascunhos paralelos de quem registra por quem não acessa o site.
- As regras das reações (os quatro símbolos, um toque no coração, segurar para os outros) e do botão de menu. A exploração pode mudar onde e como eles aparecem, sem mudar o que fazem.
- A ordem da página da memória (fundação "Organização", em `docs/visual.md`): abertura, ficha, quem estava, relatos, parede, convite, antes e depois.
- Da sessão AA, que vem antes: "Quem estava" com retratos menores; "Contar como foi" no lugar de "Escrever meu relato"; publicar leva à memória, no relato da pessoa; a linha do rascunho no Início diz de qual memória ele é e que ninguém viu ainda. A foto no alto da página de escrever ficou esperando esta exploração.
- O relato que nasce depois de a memória abrir espera (`relatoQueNasce`): a janela manda o público que a página mostrava (`chaveDoPublico`). Escrever na página da memória manda o mesmo, com e sem script.
- A janela de escrever da memória nova (etapa do relato) continua existindo; se a janela mudar, ela acompanha.
- Nada preso na borda da tela fora do modelo `pino-novo`: uma janela de escrever presa no pé do celular cai na banda do Safari.

## O que a exploração decide

1. **A voz de cada um, para ler.** Como fica um relato com a tipografia do álbum: texto, áudio, foto e citação no meio; a voz de quem tem só áudio; a de quem já faleceu; a separação entre uma voz e a outra.
2. **As reações e o menu** sem enfileirar símbolos sob cada voz e cada foto da parede.
3. **Onde se escreve.** A janela no pé da conversa, na memória, ou o bilhete em branco que já fecha a página virando o lugar de escrever, e se a janela continua com cara de mensagem (lá o padrão ajuda).
4. **O rascunho no lugar.** Como ele aparece na memória, marcado "só você vê", com "Publicar relato" ao lado, e o que muda na página quando ele é publicado.
5. **O que acontece com `/memorias/<id>/relato`:** sai, ou fica só para "Estou escrevendo por outra pessoa". E onde fica "Citar", que hoje mora numa coluna ao lado da janela no computador.
6. **O teclado do celular:** escrever no pé de uma página longa, com o teclado aberto, em 390 × 844, sem peça presa.
7. **A parede de fotos** com a calma da caixa na mesa.

## As duas propostas

Sugestão de partida; a sessão pode trocar por duas mais distintas, explicando o porquê:

- **A. O bilhete.** Cada voz é um bilhete assinado à mão, e escrever acontece num bilhete em branco no fim das vozes, o mesmo que hoje convida a contar.
- **B. A conversa editada.** A estrutura da conversa fica (cada um uma voz, as mensagens em ordem), sem bolhas, com a tipografia do álbum, e a janela de escrever no pé da conversa, com o rascunho aparecendo ali mesmo.

## Limites da sessão

- Só a prévia `tst-memoria-vozes`, nascida da `homologa` depois da sessão AA, com o acervo de exemplo. Sem PR para a `homologa`.
- Sem migração nova. A lógica de rascunho, publicar, versões, citação e quem vê o quê fica como está; o que muda é o lugar e a cara.
- Conferir com relatos longos, curtos, só de áudio, com fotos, com citação, registrados por outra pessoa e com relato que espera (o de quem olha e o de outra pessoa).
- A aplicação que sair daqui mexe em onde o rascunho aparece numa página que outras pessoas veem, então tem revisão contra lista fechada, de outro modelo.

## O que a sessão entrega

- As duas propostas na prévia, com as capturas em 390 × 844 (também com o teclado aberto), 1280 × 720 e 1920 × 1080, por teclado e com movimento reduzido.
- Para cada uma, o caminho do Lucas Magno do cartão "Você estava lá e ainda não contou" até o relato publicado, com e sem sair no meio, como na C2.
- O que custa aplicar: telas, rotas e testes que mudam, e o que acontece com a memória nova.
- As perguntas que sobrarem, poucas por vez, e a tabela "O quê | Onde ver" com os endereços na prévia.
- E para. A escolha vira sessão de aplicação, com a revisão de outro modelo, e pode passar antes por uma crítica, se for grande.
