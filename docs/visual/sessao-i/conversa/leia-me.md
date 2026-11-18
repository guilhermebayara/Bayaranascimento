# Conceito da sessão I: o relato como conversa

Sessão I, 18/11/2026. Branch `tst-relato-conversa`, nascida da `tst-relato` (o relato num campo só, como mensagem). Ideia do Gui ao escolher a proposta A: tratar o relato como uma conversa de verdade. A pessoa escreve um texto e envia, grava um áudio, manda uma foto, escreve outro texto, e essa fica a ordem das coisas, aqui e na página da memória, como num aplicativo de mensagem, sem copiar nenhum.

## Onde ver

A branch `tst-relato-conversa` foi apagada depois da escolha, e a prévia saiu do ar. Este leia-me foi trazido para a `homologa` em 18/11/2026, depois do QA, a partir do commit `51d0587` do protótipo, que continua no GitHub com a página `/conceito/conversa` e as capturas desta pasta. O relato como conversa construído está em "Relato como conversa", em `docs/decisoes.md`, com as capturas em `docs/visual/sessao-k/conversa/`. O texto abaixo é o de então.

Na prévia, `https://tst-relato-conversa.memorias.bayara.com.br/conceito/conversa/<id da memória>`, por exemplo `/conceito/conversa/1992-chegada-do-gui` (tem os relatos da Elizete e da Vó Bela). É um protótipo: gravar, mandar texto, foto e áudio do celular funcionam, mas nada é gravado no acervo; recarregar a página volta ao começo.

- À esquerda, a janela de escrever. O relato que a pessoa já tem vira as primeiras mensagens (os áudios e depois cada parágrafo, a ordem de hoje). No pé, o "+" (foto, áudio do celular), a caixa de texto que cresce e o botão redondo: sem texto ele grava, com texto ele envia, como no WhatsApp. Enter envia; Shift e Enter muda de linha. Cada mensagem tem os três pontos, com "Subir", "Descer" e "Apagar".
- À direita, no computador, a página da memória como ficaria: cada pessoa é uma voz, com o retrato e o nome à mão no começo das mensagens dela; as dos outros à esquerda, em branco, e as de quem olha à direita, no pastel da família. No celular, as duas partes viram as abas "Escrever" e "Na memória".

Capturas em 390, 1280 e 1920 px: `1-vazio`, `2-gravando`, `3-conversa` (um texto, um áudio gravado, uma foto, outro texto e um áudio do celular) e, no celular, `4-na-memoria`.

## O que muda no banco

Hoje um relato é um texto, uma lista de áudios em ordem e as fotos que vieram com ele, e a página mostra os áudios antes do texto. Na conversa, o relato vira uma lista de mensagens, cada uma de um tipo (texto, áudio, foto), numa ordem só. É uma migração: uma tabela de mensagens do relato, com o tipo, a ordem e o conteúdo (o texto, ou o áudio e a foto que já existem). Os relatos de hoje passam sem perda: os áudios e depois cada parágrafo, como no protótipo. O histórico, a transcrição, as reações, a imagem de compartilhar e o espelho acompanham.

## O que precisa de decisão

- **Enviar é publicar?** No protótipo, nada sai de "Seu relato" até "Publicar relato". A outra leitura é cada mensagem entrar na memória ao ser enviada, como numa conversa, com o rascunho só para o que ainda está na caixa.
- **Mudar uma mensagem enviada:** só apagar e reenviar, ou também editar o texto (com a versão anterior no histórico, como hoje).
- **A página da memória:** a conversa (como no protótipo) ou o bilhete de hoje com as mensagens dentro, na ordem da conversa. A conversa combina com o jeito de escrever; o bilhete combina com a caixa de fotografias do resto do site.
- **A ordem das vozes:** por quem contou primeiro, como hoje, ou misturadas pela hora de cada mensagem, como um grupo. Misturar parece uma conversa entre as pessoas, que ela não é: cada um conta o seu.

## Possibilidades que a ideia abre

- **Voltar e contar mais:** dias depois, a pessoa abre a memória e manda mais uma mensagem ("lembrei de outra coisa"), sem reescrever nada. A data de cada mensagem pode aparecer, pequena.
- **Responder citando:** no relato próprio, citar uma mensagem de outra pessoa ("A mãe disse que foi de madrugada; eu lembro que era de manhã"). A citação fica no relato de quem cita, e ninguém mexe no relato do outro.
- **Reagir a uma mensagem:** as reações de hoje são do relato inteiro; podiam ser de uma frase, de um áudio, de uma foto.
- **Transcrição por mensagem:** cada áudio com a sua, ao lado dele.
- **Compartilhar uma mensagem:** a imagem de compartilhar sai de uma mensagem escolhida (uma frase, uma foto) no lugar do trecho automático.
- **Modo TV:** as mensagens de uma memória chegando uma a uma, com os áudios tocando na vez deles.
- **Perguntas da família:** uma mensagem que pergunta ("Quem lembra o nome do hospital?") e aparece para quem estava na memória, como convite a contar.

As duas últimas mexem em quem vê e em avisos, que são decisões do Gui; as outras cabem no que já existe.
