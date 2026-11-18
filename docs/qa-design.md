# QA de design

Sessão do Claude Code aberta quando o Gui pedir, depois de uma rodada grande de telas. A primeira foi pedida em 17/11/2026, com o visual novo inteiro na `homologa`; as perguntas e as respostas dela estão em `docs/historico/qa/`. O QA de UX anterior (`docs/qa-ux.md`) olhou fluxos e padrões com o visual ainda provisório; este olha tudo, agora com o visual de verdade.

## Para que serve

Questionar o design inteiro, como um designer sênior revisando o trabalho de outro: o que está bom fica, o que pode ser melhor vira pergunta, o que está quebrado é corrigido. Pode e deve questionar decisões já tomadas quando houver motivo, inclusive as que o Gui aprovou: o que já foi decidido entra como pergunta, nunca como mudança direta.

## O que olhar, em cada tela

- **Padrão de interação:** o controle certo para cada escolha (botão, link, opção, alternância, menu), o que acontece ao tocar, retorno de cada ação, estados (vazio, carregando, erro, sucesso, desabilitado, foco).
- **Caminhos:** caminho que falta (beco sem saída, estado sem volta, ação sem desfazer), caminho desnecessário (passo a mais, confirmação que não protege nada, duas formas de fazer a mesma coisa sem motivo), e se cada tela tem por onde ir depois.
- **Fluxos:** a ordem dos passos, o que é pedido cedo demais ou tarde demais, onde a pessoa hesita.
- **Organização e ordem:** o que vem primeiro na página, o que está junto e devia estar separado (e o contrário), onde cada informação mora.
- **Hierarquia:** uma ideia forte por tela (`docs/visual.md`), um só botão principal, títulos que não competem, o que grita e não devia.
- **Tipo de botão e de ação:** cheio, contorno ou texto, conforme a regra das ações tipográficas, e se a regra serve em cada caso.
- **Menu e navegação:** o que está no menu, a ordem, os nomes, onde a pessoa está, como volta.
- **Escolha de componente:** a peça do sistema certa para cada papel, peça que falta no sistema, duas peças fazendo o mesmo papel.
- **Alinhamento e espaçamento:** o grid rígido à esquerda, alinhamento óptico, respiro, coisas encostando em borda ou em curva, ritmo vertical.
- **Estilo:** tipo, cor com função, contraste, a foto como objeto, coerência entre telas.
- **Textos de interface:** o botão diz o que acontece, a mesma ação com o mesmo nome no site todo, as regras de escrita do `CLAUDE.md`.
- **As três larguras:** 390, 1280 e 1920 px, cada uma com composição própria, e não a mesma esticada. Teclado e movimento reduzido.

## A árvore

Como a árvore se desenha e se comporta é travado (ver "Árvore" no `CLAUDE.md`). A página em volta é livre e entra no QA como qualquer tela: o título e a descrição, a legenda (formato, lugar, se é preciso), os controles de camadas e de centro, a ficha da pessoa (o cartão com nome e "Ver página": conteúdo, ações, lugar na tela). O Gui pediu atenção especial a esses pontos.

## O que a sessão faz com cada achado

- **Defeito** (quebrado, inacessível, diferente do combinado em `docs/visual.md` e `docs/decisoes.md`, texto fora das regras de escrita): corrige, com teste quando couber.
- **Decisão** (todo o resto, inclusive "eu faria diferente"): não muda nada. Escreve como pergunta em `docs/qa/AAAA-MM-DD-perguntas.md`, com a data da rodada.

## O arquivo de perguntas

Um arquivo só, `docs/qa/AAAA-MM-DD-perguntas.md`, feito para o Gui decidir rápido. Fechada a rodada, com as respostas do Gui já nos documentos enxutos, o arquivo vai para `docs/historico/qa/`, e os comentários do código e dos testes que o citam passam a apontar para lá.

- Agrupado por tela, na ordem do menu, e dentro de cada tela da mais importante para a menos.
- Cada pergunta tem um número único (P1, P2...), uma marca de peso (**muda a experiência**, **ajuste**, **detalhe**), uma ou duas linhas de contexto, o que a sessão observou, e de duas a quatro opções, com a recomendada primeiro e a frase "manter como está" quando fizer sentido.
- Quando ajuda, o nome da captura que mostra o ponto (em `docs/visual/qa-AAAA-MM-DD/`).
- No começo do arquivo, um resumo: quantas perguntas por peso e por tela, e as cinco que mais mudam a experiência.
- As perguntas que ficaram abertas nos PRs #39 (dez) e #40 (sete) entram no mesmo arquivo, cada uma na sua tela, para o Gui responder tudo de uma vez.

## Fim da sessão

Relatório curto, como o do QA de código: o que foi conferido, o que foi corrigido (commit e branch), o caminho do arquivo de perguntas com o resumo, e o que não deu para conferir (Safari do iPhone, TV de verdade, prévia publicada).
