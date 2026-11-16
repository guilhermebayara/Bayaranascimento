# QA de UX: padrões para a troca de visual

Sessão do Claude Code aberta de propósito, quando o Gui pedir. Não é recorrente como o QA de código.

## Para que serve

A direção visual ainda não existe. Quando ela chegar, a interface atual vai trocar de pele: cores, tipografia, tamanhos, cantos, espaçamentos. Essa troca é barata se o site já repete poucos padrões bem nomeados, e cara se cada página resolve o mesmo problema do seu jeito.

O objetivo da sessão é deixar a interface atual organizada em padrões, para que a troca de visual seja feita mexendo em poucos lugares. Ela não julga a aparência. Cor, fonte, raio e tamanho de hoje são provisórios e não entram como defeito.

O que interessa:

- **Componentes:** o mesmo papel resolvido sempre pelo mesmo componente. Botão principal, botão leve, link de ação, campo, grupo de opções, aviso, recado de sucesso e de erro, cartão, lista, ficha, estado vazio.
- **Tokens:** todo valor de cor, espaço, tamanho de texto, raio, sombra, altura de toque e tempo de animação vem de uma variável com nome de papel (`--espaco-2`, `--toque-minimo`), nunca escrito solto no CSS. A troca de visual passa a ser trocar os valores das variáveis.
- **Tamanhos que dependem do visual:** área de toque, altura de campo, largura de leitura, tamanho mínimo de texto. Eles viram tokens com o valor de hoje, para o visual final ajustar num lugar só. A área de toque nunca fica abaixo de 44 px, em qualquer visual.
- **Estados:** cada componente tem os estados combinados: normal, foco visível pelo teclado, pressionado, desabilitado, carregando, com erro. Um estado que falta é achado.
- **Estrutura da página:** a mesma ordem e hierarquia para páginas do mesmo tipo (lista, página de pessoa, página de memória, formulário em etapas, edição). Título, ação principal, conteúdo, ações secundárias.
- **Textos de interface:** a mesma ação com o mesmo nome no site inteiro, o botão dizendo o que acontece, o recado usando o mesmo verbo do botão ("Publicar" → "Publicada"). As regras de escrita do `CLAUDE.md` continuam valendo.
- **Marcação:** HTML semântico (botão é `button`, link é `a`, grupos com `fieldset` e `legend`), classes com nome de papel e não de aparência (`.botao--principal`, não `.botao--verde`).

## Como a sessão trabalha

1. **Ponto de partida.** Nasce da `homologa` numa branch `qa-ux-AAAA-MM-DD`. Roda `npm test` e `npm run build` e anota o estado.
2. **Inventário.** Percorre todas as páginas com o acervo de exemplo (`npm run dev` e o "Ver como" do topo), em largura de celular (390 px) e de desktop (1280 px), com teclado e com movimento reduzido. Tira capturas de cada página nas duas larguras, com o Playwright, e guarda em `docs/ux/capturas/` para servir de referência (só acervo de exemplo, nunca dado real).
3. **Mapa dos padrões.** Escreve `docs/ux/inventario.md`:
   - cada tipo de elemento, as variações que existem de fato, quantas vezes e em quais páginas;
   - cada valor solto no CSS e nos componentes (cor, espaço, tamanho, raio) e o token que ele deveria usar;
   - cada ação e o nome que ela recebe em cada página;
   - cada estado que falta.
4. **Proposta.** Escreve `docs/ux/padroes.md`: a lista de tokens com nome de papel e o valor de hoje, e a lista de componentes, cada um com papel, variações, estados e onde é usado. Nomes em português, como o resto do código.
5. **Arrumação sem mudança visual.** O que só reorganiza, sem mudar nada na tela, a sessão já faz, numa branch `qa-ux-tokens` separada:
   - trocar valor solto por token com o mesmo valor;
   - extrair para um componente em `src/components/` o que hoje é repetido à mão, mantendo o resultado igual.

   Antes de abrir o PR, compara as capturas de antes e depois de cada página nas duas larguras, pixel a pixel. Se alguma mudou, desfaz até ficar igual ou leva para a lista de decisões. Essa comparação vira um script em `scripts/` e um comando em `package.json`, para as próximas mudanças de padrão usarem também.
6. **O que muda a tela vai para o Gui.** Juntar duas variações de botão numa só, trocar a ordem dos elementos de uma página, renomear uma ação, mudar um texto. A sessão relata e espera a decisão.

## O que a sessão não faz

- Não escolhe cor, fonte, raio nem tamanho visual. Isso é a direção visual do Gui.
- Não mexe no arranjo nem nas linhas da árvore, que são decisões do Gui com regras e testes próprios. Os elementos de interface em volta dela (ficha, legenda, botões, cartão do ramo) entram no inventário.
- Não muda regras de privacidade, de permissão nem os dados de exemplo.
- Nunca faz push nem merge na `main` nem na `homologa`. Abre PR para a `homologa` e não faz o merge.

## Relatório no fim

Na ordem:

1. O que foi percorrido (páginas, larguras, teclado, movimento reduzido).
2. O padrão proposto, em resumo: quantos tokens e quantos componentes, com o link para `docs/ux/padroes.md`.
3. O que foi arrumado sem mudança visual, com o commit, a branch e o resultado da comparação de capturas.
4. As decisões para o Gui, em lista curta, cada uma com a opção recomendada e o que muda na tela.
5. O que fica para quando o visual for definido (por exemplo, o tamanho do botão principal no celular).
6. O que não deu para conferir e por quê.

## Prompt para abrir a sessão

> Sessão de QA de UX do site de memórias. Leia o `CLAUDE.md` e o `docs/qa-ux.md` e siga o `docs/qa-ux.md`. A direção visual ainda não foi definida: não julgue aparência. O foco é deixar a interface atual em padrões (tokens, componentes, estados, estrutura de página e textos de interface) para que a troca para o visual final seja feita em poucos lugares. Trabalhe com o acervo de exemplo, a partir da `homologa`. Termine com o relatório no formato do `docs/qa-ux.md`.
