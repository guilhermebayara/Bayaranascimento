# Conceito da sessão H: administração, "Você no acervo" e gravar áudio

Sessão H, 18/11/2026. Branch `tst-conceitos-h`, nascida da `homologa`, sem merge: as rotas de conceito saíram depois da construção, e esta pasta fica como registro da escolha.

**O que o Gui escolheu:** administração na A, com o cartão mais estreito e à direita (PR #102); "Você no acervo" na B (PR #103); gravar áudio na B, com o estado "gravando" melhorado: o cancelar estava colado na borda (PR #104). As regras estão em `docs/decisoes.md` e `docs/visual.md`.

O texto abaixo é o da época do conceito. Os endereços de "Onde ver" não existem mais.

## Onde ver

Na prévia: https://tst-conceitos-h.memorias.bayara.com.br/conceito/h. Cada tela tem uma barra no alto que troca entre A e B e entre os estados.

| Tela | A | B |
| --- | --- | --- |
| Sua conta, administração (ver como Gui) | `/conceito/h/conta?conceito=a` | `/conceito/h/conta?conceito=b` |
| Início, "Você no acervo" (no fim do Início) | `/conceito/h/inicio?conceito=a` | `/conceito/h/inicio?conceito=b` |
| Relato, gravar áudio | `/conceito/h/relato/2025-natal?conceito=a` | `/conceito/h/relato/2025-natal?conceito=b` |

`&pendencias=1` na conta força três pendências de exemplo. `&estado=gravando` e `&estado=depois` no relato mostram os outros dois estados da gravação: o desenho é parado, sem gravar de verdade.

As capturas estão nesta pasta, em 390, 1280 e 1920 px.

## 1. Sua conta, administração

**O defeito de hoje:** os três grupos lado a lado, cada atalho com a situação embaixo, mais as duas medidas e a cópia: tudo aberto ao mesmo tempo, o cartão fica tão alto quanto o nome e pesa.

**A. Seções que abrem e fecham** (`administracao-a-*.jpg`). A ideia do Gui, como no painel da árvore. Cada grupo é uma linha com o nome em serifa e um resumo à direita ("4 atalhos", ou "1 pendência" na cor de alerta); um abre por vez, e o primeiro vem aberto quando não há pendência. O espaço do banco e das fotos e a cópia viram o quarto grupo, "Espaço e cópias". No alto, "Tudo em dia", ou o sinal "3 pendências", que ao ser tocado abre por cima a lista delas: cada uma diz em que grupo mora ("em Para arrumar") e leva a ela. A que não tem página própria (a cópia, o banco) abre o grupo dela. Fechado, o cartão tem quatro linhas.

**B. O que pede você, primeiro** (`administracao-b-*.jpg`). O alto do cartão vira uma frase: "Tudo em dia." ou "Três coisas pedem você.", com a lista das pendências logo embaixo, cada uma um link para onde se resolve. Os atalhos viram um índice quieto: o nome do grupo e os links em linha, sem a situação de cada um (a situação só importa quando pede ação, e aí ela já está no alto). O espaço vira uma linha ("banco 2% · fotos e áudios 2%") que abre as medidas.

**A diferença:** a A esconde tudo até alguém abrir, e as pendências ficam atrás do sinal. A B mostra os atalhos sempre, mais leves, e põe as pendências na frente de tudo. Na A, as situações ("14 tipos") continuam; na B, saem.

## 2. Início, "Você no acervo"

**O defeito de hoje:** o retrato e o número ficam lado a lado com alturas diferentes e sem uma linha em comum, e o texto embaixo do número disputa com o retrato.

**A. Alinhar** (`voce-a-*.jpg`). O retrato encolhe para a altura das letras do número e assenta na mesma linha de base; o texto desce para a largura toda. Os dois passam a ser lidos juntos, como "você, 37".

**B. Um desenho novo** (`voce-b-*.jpg`). O retrato vira a assinatura do cartão, pequeno e redondo, ao lado de "Você no acervo". O corpo é uma frase: "Você aparece em 37 memórias, de 1992 a 2026.", com o número grande no meio. Embaixo, as fotos das quatro memórias mais recentes em que a pessoa aparece, pequenas, como fotos soltas da caixa, cada uma levando à memória.

## 3. Gravar áudio

**O defeito de hoje:** "Gravar áudio" e "Enviar arquivo de áudio" têm o mesmo peso, lado a lado; depois de gravar, a ordem fica confusa (o tocador, a transcrição, "Subir", "Descer", "Remover", de novo os dois botões e a mensagem).

**O que vale nas duas:** gravar é a ação principal; enviar um arquivo fica como uma linha discreta embaixo; a mensagem de situação mora junto do áudio, e não solta no fim.

**A. O gravador no lugar** (`audio-a-*.jpg`). Antes: o botão cheio "Gravar áudio", com o microfone, e embaixo "ou envie um áudio que já está no celular". Gravando: o mesmo lugar vira um quadro com o ponto vermelho, o tempo grande e "Parar gravação". Depois: o áudio é um item com o nome e a duração, o tocador, a "Transcrição" que abre, a nota "Guardado. Entra no relato quando você publicar." e o menu de três pontos (subir, descer, remover), no padrão das memórias. A ação seguinte é "Gravar mais um trecho".

**B. Como mensagem de voz** (`audio-b-*.jpg`). O padrão do WhatsApp, que a família usa todo dia. Antes: uma barra "Toque no microfone para gravar" com o microfone redondo à direita, e "Anexar um áudio do celular" embaixo. Gravando: a barra fica com o contorno vermelho, "Gravando 0:42", "Cancelar" à esquerda e o quadrado de parar no lugar do microfone. Depois: cada áudio é um balão com o tocar e a duração, e "Escrever a transcrição" e "Remover" logo embaixo dele; a barra volta, para gravar mais. O balão pede um tocador próprio, que hoje está na fase 4 ("Tocador de áudio próprio", em `docs/visual.md`): escolher a B adianta essa peça.

**A diferença:** a A continua com cara de formulário, com o tocador do aparelho. A B copia um gesto que todo mundo já sabe, e pede o tocador próprio.
