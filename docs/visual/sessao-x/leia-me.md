# Sessão X: modo TV sem rolagem, proporcional, com controles que flutuam (22/11/2026)

Conceito com parada. Duas propostas na prévia `tst-tv-proporcional`, trocadas por `conceito` no endereço, com a troca à vista no alto da tela ("Teste: A, a barra · B, o trilho · Como é hoje"). Nada foi para a `homologa`. O Gui escolhe olhando, e uma sessão constrói a vencedora.

- A: https://tst-tv-proporcional.memorias.bayara.com.br/explorar?ver=tv&conceito=a
- B: https://tst-tv-proporcional.memorias.bayara.com.br/explorar?ver=tv&conceito=b
- Como é hoje, para comparar: https://tst-tv-proporcional.memorias.bayara.com.br/explorar?ver=tv&conceito=hoje

As capturas desta pasta têm o nome `<proposta>-<caso>-<janela>.jpg`: `comum` (Casamento da Prima Carol), `estresse` (a memória longa), `ajustes` ("Ajustes" aberto), `so-fotos` e, na B, `verso`.

## O que as duas têm em comum

- **A tela não rola.** O palco tem a altura exata da janela e nada passa dela. Os controles são absolutos dentro do palco: sem `fixed` nem `sticky`.
- **Tudo é proporcional à janela.** No modo TV, `1rem` passa a ser um pedaço da janela: 1/80 da largura ou 1/45 da altura, o que for menor (`html:has(.palco--prop)`, em `src/visual/telas/tv.css`). Dá 16 px em 1280 × 720 e 24 px em 1920 × 1080. Como os tokens e as peças do sistema já medem em `rem`, a foto revelada, o carimbo, o botão e os espaços crescem juntos, sem regra por faixa de altura. A tela é desenhada para caber em 80 × 45 rem, então cabe em qualquer janela; a que é mais alta que 16:9 (1280 × 800, 1440 × 900) ganha respiro e uma foto um pouco maior.
- **Os tamanhos da decisão de 17/11 continuam em 1920 × 1080:** o que se lê tem 24 px e os controles, 22 px. Em 1280 × 720 isso dá 16 e 14,7 px.
- **O que os controles fazem não mudou:** sair, "Abrir esta memória", anterior e próxima, "Passar sozinho" com os três tempos e a pausa, "Só as fotos", tela cheia, as três animações, a memória da vez no endereço e as preferências no aparelho. Os controles continuam sumindo depois de 5 segundos só em "Só as fotos".
- **O que entrou de comportamento:** com "Ajustes" aberto, o Esc e o toque fora fecham a folha antes de qualquer outra coisa, e o foco volta para "Ajustes". O segundo Esc sai do modo TV, como hoje.
- **Sem script,** "Anterior", "Próxima", "Ajustes" (só com a animação) e o verso da B funcionam. **Com movimento reduzido,** nada se mexe. A ordem do Tab começa em "Próxima" e segue: "Passar sozinho", "Ajustes", "Sair do modo TV", "Abrir esta memória", "Anterior".
- **O carimbo** põe a data e o lugar cada um na sua linha quando não cabem juntos, e o lugar longo termina em reticências. **A legenda da foto principal** fica numa linha só.

## Proposta A: a barra

Os controles moram numa barra de vidro que flutua no pé da tela, centrada: "Anterior", "Próxima", "Passar sozinho" e "Ajustes". "Ajustes" abre uma folha do mesmo vidro que sobe da barra, com os três ajustes lado a lado. "Sair do modo TV" e a conta ("Modo TV · 25 de 49") continuam no alto.

- **A memória longa desce na escala.** O título tem três degraus pelo número de letras (até 40, até 90, daí em diante) e o trecho do relato tem dois (até 150 letras e até 220). A regra é `degrauDoTitulo` e `degrauDoTrecho`, em `src/lib/explorar.ts`, e funciona sem script. O limite de linhas é a rede de proteção: quando corta, "Abrir esta memória" está logo embaixo.
- **O vidro** é token novo: `--vidro` (o branco da moldura a 78%), `--vidro-fio`, `--vidro-suave` (o texto de apoio sobre o vidro), `--vidro-toque` e `--vidro-desfoque`. O contraste foi calculado no pior caso, sem contar com o desfoque: o texto fica em 9,1 para um sobre foto toda preta e 15,5 sobre foto toda branca; o texto de apoio, em 5,2 e 8,8. Teste em `testes/tv-proporcional.test.ts`.
- **Custa:** a barra reserva 6,5 rem do pé da tela, e a foto principal fica com 364 px em 1280 × 720 (hoje são 365; o PR #157 levava a 294). Em "Só as fotos" a barra passa por cima da margem de baixo da foto enquanto está à vista. A folha de "Ajustes" cobre o fim do texto enquanto está aberta. O título muda de tamanho de uma memória para a outra.

## Proposta B: o trilho

Os controles moram num cartão branco pousado na lateral direita, no meio da altura: "Anterior", "Próxima", "Passar sozinho" e "Ajustes", um embaixo do outro. O material é o do próprio site (o branco do bilhete e do verso da foto, com a sombra do bilhete), sem vidro. "Sair do modo TV" fica no canto de cima do trilho e a conta, no de baixo. "Ajustes" abre uma folha que desce do trilho e cresce para a esquerda.

- **A memória longa abre o verso.** O texto da coluna tem um tamanho só, com limite de linhas (título em 4, trecho em 5, nomes em 2). "Ver o verso" abre no lugar um cartão branco com tudo por inteiro: a data e o lugar, o título, o trecho, todos os nomes de "Quem estava" e "Abrir esta memória". É a ideia central do site (a foto e o verso) usada no modo TV, e ninguém precisa sair dele para ler. O verso é um `<details>`: abre sem script. Com ele aberto, o "Passar sozinho" espera; o Esc e o toque fora fecham.
- **A altura fica toda para a foto.** Sem outras fotos em volta, a principal chega a 432 px em 1280 × 720. Com outras fotos, fica em 368 px, porque o trilho tira largura e o monte precisa caber entre a borda e o texto.
- **Custa:** a coluna do texto fica mais estreita (385 px em 1280 × 720, contra 478 na A), então um título ou um trecho longo é cortado mais cedo que na A, e o que resolve é o verso, com um toque a mais. O trilho está sempre na tela e deixa a composição assimétrica. "Ver o verso" é um controle novo e um nome novo, que o Gui precisa aprovar. O título tem sempre o mesmo tamanho.

O material e o lugar são escolhas separadas: a barra da A pode ser de cartão branco e o trilho da B pode ser de vidro, trocando duas regras de `tv.css`.

## O resultado do script

`scripts/confere-tv.mjs` abre as 48 memórias de exemplo e a de estresse (criada só no banco local, `estresse-da-tv`: título de 119 letras, lugar de 121, o trecho máximo, onze pessoas e cinco fotos) em 1280 × 720, 1280 × 800, 1366 × 768, 1440 × 900 e 1920 × 1080, com "Ajustes" fechado e aberto, com "Só as fotos" e, na B, com o verso aberto. Espera as fontes e falha se a do título não for a do site. Confere que a página não rola, que todo controle está na janela e recebe o foco pelo Tab, que nenhum texto fica cortado sem caminho e que nada cobre um texto ou um controle.

| | A, a barra | B, o trilho |
| --- | --- | --- |
| A página rola | nenhuma memória, em nenhuma janela | nenhuma memória, em nenhuma janela |
| Controle fora da janela ou sem foco pelo Tab | nenhum | nenhum |
| Texto cortado sem caminho | nenhum | nenhum |
| Algo por cima de um texto ou de um controle | nada | nada |
| Memórias de exemplo com texto cortado na coluna | nenhuma das 48 | nenhuma das 48 |
| A memória de estresse | o título inteiro, no menor degrau; o trecho corta na quinta linha e o lugar termina em reticências, com "Abrir esta memória" embaixo | título, trecho e lugar cortados na coluna; no verso, tudo inteiro |
| Foto principal em 1280 × 720 | 364 px | 368 px com outras fotos em volta, 432 px sozinha |
| Foto principal em 1920 × 1080 | 547 px | 552 px com outras fotos, 648 px sozinha |

São 49 memórias, 5 janelas e 3 estados em cada proposta (4 na B, com o verso): 735 estados conferidos na A e 980 na B, todos sem defeito. Para comparar, o modo TV de hoje rola em 21 das 48 memórias de exemplo em 1280 × 720 (QA de 23/11/2026).

Dois defeitos da B foram corrigidos antes das capturas. O script achou o primeiro: com o verso aberto, o "Abrir esta memória" da coluna, coberto pelo cartão, ainda recebia o foco do teclado. O segundo apareceu olhando as capturas: a folha de "Ajustes" abria por cima do título, e passou a descer do trilho.

Com movimento (sem o movimento reduzido), a passagem de uma memória para a outra foi medida seis vezes durante a animação "Álbum" e não rolou. A gestalt (`npm run gestalt`) passou com o acervo de exemplo: 665 títulos. Com a memória de estresse no banco local ela acusa dois títulos na página do laço, o mesmo que o QA de 23/11 já tinha anotado; a memória de estresse não entra no repositório.

## Abaixo de 62rem

As duas propostas só valem a partir de 62rem de largura. Abaixo disso, o modo TV é o de hoje, sem mudança: a composição do celular, com a rolagem do aparelho e os controles no fluxo. Um aparelho de toque com 62rem ou mais (um tablet deitado) recebe a proposta: os controles são absolutos num palco que não rola, sem `fixed` nem `sticky`, e ficam a 24 px da borda. Não deu para conferir num iPad.

## O que fica para a sessão que constrói

- Tirar a proposta que não foi escolhida, a troca "Teste" do alto e `conceito` do endereço.
- Levar para `explorar.css` o que valer de `tv.css` e apagar de lá as regras que as propostas contornam: a faixa de `max-height: 50rem`, `--tv-faixa`, os tamanhos de 100rem (`--tv-leitura`, `--tv-controle`) e o arranjo antigo de `.palco__passos` e `.palco__ajustes` a partir de 62rem.
- Atualizar `testes/explorar-controles.test.ts` (o teste "modo TV em 1280 × 720" descreve a regra antiga), `docs/visual.md` ("O modo TV") e `docs/decisoes.md` ("Explorar"), e pôr os tokens do vidro na página `/sistema`, se a A ficar.
- Pôr o modo TV na lista `TELAS` da gestalt e decidir se `scripts/confere-tv.mjs` vira `npm run tv`.

## Para o brief de Navegação

- **A barra que flutua sem `fixed`.** No modo TV ela é absoluta porque a página não rola. No celular a página rola, então a barra de baixo precisa do modelo `pino-novo` (animação ligada à rolagem) e de conferência no iPhone. O desenho da barra serve; a técnica de prender, não.
- **Uma ação cheia por barra.** Na barra da A só "Próxima" é botão cheio, e os outros itens são o nome escrito, sem traço embaixo, com o toque inteiro de 44 px e um fundo leve no foco. Em "Só as fotos", o cheio passa para "Mostrar o texto". Vale para a barra de baixo do celular: "Nova memória" cheia e o resto quieto.
- **A folha que sobe da barra** (o "Ajustes" da A) é o mesmo gesto das folhas que sobem num aplicativo: abre colada em quem abriu, fecha com o Esc e com o toque fora, e o foco volta para quem abriu.
- **O vidro pede o texto de apoio mais escuro** (`--vidro-suave`): o `--tinta-suave` do papel não chega a 4,5 para um sobre o vidro com foto escura atrás.
- **O cartão branco pousado** (o trilho da B) é a alternativa ao vidro que já é do site, e não depende de `backdrop-filter`.
