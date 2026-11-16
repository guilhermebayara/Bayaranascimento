# QA de UX: padrões para a troca de visual

Sessão do Claude Code aberta de propósito, quando o Gui pedir. Não é recorrente como o QA de código.

## Para que serve

A direção visual ainda não existe. Quando ela chegar, a interface atual vai trocar de pele: cores, tipografia, tamanhos, cantos, espaçamentos. Essa troca é barata se o site já repete poucos padrões bem nomeados, e cara se cada página resolve o mesmo problema do seu jeito.

O objetivo da sessão é deixar a interface atual organizada em padrões, para que a troca de visual seja feita mexendo em poucos lugares. Ela não julga a aparência. Cor, fonte, raio e tamanho de hoje são provisórios e não entram como defeito.

A sessão olha duas camadas, e as duas valem para qualquer visual que vier:

- **Padrões de interface:** como cada peça é construída.
- **Fluxos:** a ordem em que a pessoa faz as coisas, o tipo de controle de cada escolha e onde cada informação mora.

### Padrões de interface

- **Componentes:** o mesmo papel resolvido sempre pelo mesmo componente. Botão principal, botão leve, link de ação, campo, grupo de opções, aviso, recado de sucesso e de erro, cartão, lista, ficha, estado vazio.
- **Tokens:** todo valor de cor, espaço, tamanho de texto, raio, sombra, altura de toque e tempo de animação vem de uma variável com nome de papel (`--espaco-2`, `--toque-minimo`), nunca escrito solto no CSS. A troca de visual passa a ser trocar os valores das variáveis.
- **Tamanhos que dependem do visual:** área de toque, altura de campo, largura de leitura, tamanho mínimo de texto. Eles viram tokens com o valor de hoje, para o visual final ajustar num lugar só. A área de toque nunca fica abaixo de 44 px, em qualquer visual.
- **Estados:** cada componente tem os estados combinados: normal, foco visível pelo teclado, pressionado, desabilitado, carregando, com erro. Um estado que falta é achado.
- **Estrutura da página:** a mesma ordem e hierarquia para páginas do mesmo tipo (lista, página de pessoa, página de memória, formulário em etapas, edição). Título, ação principal, conteúdo, ações secundárias.
- **Textos de interface:** a mesma ação com o mesmo nome no site inteiro, o botão dizendo o que acontece, o recado usando o mesmo verbo do botão ("Publicar" → "Publicada"). As regras de escrita do `CLAUDE.md` continuam valendo.
- **Marcação:** HTML semântico (botão é `button`, link é `a`, grupos com `fieldset` e `legend`), classes com nome de papel e não de aparência (`.botao--principal`, não `.botao--verde`).

### Fluxos

Para cada fluxo, a sessão escreve os passos como são hoje, onde a pessoa hesita ou volta, e uma recomendação com a alternativa descartada. Os fluxos que entram sempre:

- **Cadastrar pessoa e adicionar laços:** a ordem dos campos, o que é pedido logo e o que pode esperar, como a família e o falecimento aparecem, e como a pessoa nova chega à árvore.
- **Registrar memória:** a ordem das etapas do formulário, o que é obrigatório, onde entram fotos, relato, capítulo e quem vê, e o resumo antes de publicar.
- **Corrigir e desfazer:** onde fica o histórico de memória, relato e cadastro, como uma versão anterior aparece e é restaurada, e como a lixeira e os rascunhos se encontram.
- **Percorrer o acervo:** a ordem da linha do tempo (antigo para novo ou o contrário, agrupamento por ano, filtros), o caminho entre linha do tempo, pessoa, memória, capítulo e árvore, e o menu.
- **Primeira visita:** o que alguém da família vê ao entrar pela primeira vez no Natal.

E as escolhas que atravessam os fluxos:

- **O controle certo para cada escolha.** Opções exclusivas e poucas, até umas cinco, ficam todas visíveis (botões de opção). Uma lista longa de opções fixas vai num seletor. Escolher uma pessoa entre muitas pede busca com sugestão, com a opção de cadastrar um nome novo ali mesmo. Mais de uma escolha usa caixas de marcar. Liga e desliga usa uma caixa só. A sessão lista onde o site foge disso e propõe a troca.
- **Datas:** o mesmo jeito de informar data flexível (só ano, mês e ano, completa, aproximada) em todos os formulários.
- **Ação principal:** uma por tela, sempre no mesmo lugar, com as secundárias e as destrutivas separadas dela.
- **Volta e confirmação:** depois de salvar, para onde a pessoa vai e qual recado vê. Excluir sempre com confirmação e com a lixeira dita no recado.

## Como a sessão trabalha

1. **Ponto de partida.** Nasce da `homologa` numa branch `qa-ux-AAAA-MM-DD`. Roda `npm test` e `npm run build` e anota o estado.
2. **Inventário.** Percorre todas as páginas com o acervo de exemplo (`npm run dev` e o "Ver como" do topo), em largura de celular (390 px) e de desktop (1280 px), com teclado e com movimento reduzido. Tira capturas de cada página nas duas larguras, com o Playwright, e guarda em `docs/ux/capturas/` para servir de referência (só acervo de exemplo, nunca dado real).
3. **Mapa dos padrões.** Escreve `docs/ux/inventario.md`:
   - cada tipo de elemento, as variações que existem de fato, quantas vezes e em quais páginas;
   - cada valor solto no CSS e nos componentes (cor, espaço, tamanho, raio) e o token que ele deveria usar;
   - cada ação e o nome que ela recebe em cada página;
   - cada estado que falta.
4. **Fluxos.** Escreve `docs/ux/fluxos.md`, um fluxo por seção: os passos de hoje, os pontos de atrito, a recomendação e a alternativa descartada, com as capturas das telas envolvidas.
5. **Proposta.** Escreve `docs/ux/padroes.md`: a lista de tokens com nome de papel e o valor de hoje, e a lista de componentes, cada um com papel, variações, estados e onde é usado. Nomes em português, como o resto do código.
6. **Arrumação sem mudança visual.** O que só reorganiza, sem mudar nada na tela, a sessão já faz, numa branch `qa-ux-tokens` separada:
   - trocar valor solto por token com o mesmo valor;
   - extrair para um componente em `src/components/` o que hoje é repetido à mão, mantendo o resultado igual.

   Antes de abrir o PR, compara as capturas de antes e depois de cada página nas duas larguras, pixel a pixel. Se alguma mudou, desfaz até ficar igual ou leva para a lista de decisões. Essa comparação vira um script em `scripts/` e um comando em `package.json`, para as próximas mudanças de padrão usarem também.
7. **O que muda a tela vai para o Gui.** Juntar duas variações de botão numa só, trocar a ordem dos elementos de uma página, mudar a ordem de um formulário ou da linha do tempo, trocar o tipo de um controle, renomear uma ação, mudar um texto. A sessão relata e espera a decisão. Quando a diferença só fica clara vendo, pode montar a alternativa numa branch `tst-ux-<assunto>` com prévia, para o Gui comparar, sem PR.

## O que a sessão não faz

- Não escolhe cor, fonte, raio nem tamanho visual. Isso é a direção visual do Gui.
- Não mexe no arranjo nem nas linhas da árvore, que são decisões do Gui com regras e testes próprios. Os elementos de interface em volta dela (ficha, legenda, botões, cartão do ramo) entram no inventário.
- Não muda regras de privacidade, de permissão nem os dados de exemplo.
- Nunca faz push nem merge na `main` nem na `homologa`. Abre PR para a `homologa` e não faz o merge.

## Relatório no fim

Na ordem:

1. O que foi percorrido (páginas, larguras, teclado, movimento reduzido).
2. Os fluxos, em resumo: o atrito principal de cada um e a recomendação, com o link para `docs/ux/fluxos.md`.
3. O padrão proposto, em resumo: quantos tokens e quantos componentes, com o link para `docs/ux/padroes.md`.
4. O que foi arrumado sem mudança visual, com o commit, a branch e o resultado da comparação de capturas.
5. As decisões para o Gui, em lista curta, cada uma com a opção recomendada e o que muda na tela.
6. O que fica para quando o visual for definido (por exemplo, o tamanho do botão principal no celular).
7. O que não deu para conferir e por quê.

## Prompt para abrir a sessão

> Sessão de QA de UX do site de memórias. Leia o `CLAUDE.md` e o `docs/qa-ux.md` e siga o `docs/qa-ux.md`. A direção visual ainda não foi definida: não julgue aparência. O foco é avaliar os fluxos (ordem dos formulários de pessoa e de memória, tipo de controle de cada escolha, onde fica o histórico, ordem da linha do tempo) e deixar a interface atual em padrões (tokens, componentes, estados, estrutura de página e textos de interface), para que a troca para o visual final seja feita em poucos lugares. Trabalhe com o acervo de exemplo, a partir da `homologa`. Termine com o relatório no formato do `docs/qa-ux.md`.
