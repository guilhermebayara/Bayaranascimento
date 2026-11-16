# Padrões propostos (QA de UX, 16/11/2026)

A lista de tokens e de componentes para a troca de visual. A troca deve mexer nos valores dos tokens em `src/styles/global.css` (`:root`) e no desenho de cada componente, sem procurar valores espalhados pelas páginas.

**Já existe** marca o que está no código desde a branch `qa-ux-tokens`. **Proposto** é o que ainda falta e muda a tela, então depende de decisão.

## Tokens

### Cores (já existem)

| Token | Papel | Valor de hoje | Era |
| --- | --- | --- | --- |
| `--cor-fundo` | fundo da página | `#edf2ee` | `--papel` |
| `--cor-fundo-recuo` | fundo de área secundária, botão leve sob o cursor, desabilitado | `#dfe8e2` | `--papel-fundo` |
| `--cor-superficie` | cartões, campos, painéis | `#ffffff` | `--branco` |
| `--cor-texto` | texto, bordas fortes, foco, opção marcada | `#16302b` | `--tinta` |
| `--cor-texto-suave` | texto secundário, dicas, bordas leves | `#4c635d` | `--tinta-suave` |
| `--cor-linha` | fios e separadores | `#c3d1c9` | `--linha` |
| `--cor-destaque` | botão principal, item atual do menu, sublinhado sob o cursor | `#f4b81c` | `--amarelo` |
| `--cor-destaque-realce` | botão principal sob o cursor | `#ffcf4a` | solto |
| `--cor-texto-exemplo` | texto de exemplo nos campos | `#7a8c86` | solto |
| `--cor-perigo` | botão de perigo, borda do alerta e do recado de erro | `#b3261e` | solto |
| `--cor-perigo-forte` | texto do recado de erro, perigo sob o cursor | `#8c1d18` | solto |
| `--cor-sobre-perigo` | texto do botão de perigo | `#fff` | solto |
| `--cor-erro-texto` | situação de erro do envio | `#a3212f` | solto |
| `--nucleo-0` a `--nucleo-3` | lados da família na árvore | sem mudança | |

**Proposto:** juntar `--cor-erro-texto` e `--cor-perigo-forte`, que fazem o mesmo papel com dois vermelhos. Criar `--cor-sucesso` quando o recado de sucesso ganhar cor própria. O `theme-color` em `Base.astro` acompanha `--cor-fundo` à mão.

### Texto (já existem)

| Token | Papel | Valor |
| --- | --- | --- |
| `--fonte-titulo` | títulos, rótulos, botões, menu | Bricolage Grotesque |
| `--fonte-texto` | corpo, relatos, campos | Literata |
| `--tamanho-1` | legenda miúda, selos | 0,8125 rem |
| `--tamanho-2` | | 0,875 rem |
| `--tamanho-3` | rótulos e texto de interface (o mais usado, 22 vezes) | 0,9375 rem |
| `--tamanho-4` | botão leve, menu, dica | 1 rem |
| `--tamanho-5` | | 1,0625 rem |
| `--tamanho-6` | corpo do site, botão principal | 1,125 rem |
| `--tamanho-7` | | 1,1875 rem |
| `--tamanho-8` | título de bloco pequeno, estado vazio | 1,25 rem |
| `--tamanho-9` | título de seção do formulário | 1,5 rem |
| `--peso-normal`, `--peso-medio`, `--peso-forte`, `--peso-extra` | | 400, 600, 700, 800 |

**Proposto:** nove tamanhos para um site deste porte é muito. Quando o visual chegar, reduzir a seis e dar nome de papel: `--tamanho-miudo`, `--tamanho-interface`, `--tamanho-corpo`, `--tamanho-subtitulo`, `--tamanho-secao`, e os títulos grandes (`--titulo-pagina`, `--titulo-ano`), hoje em `clamp()` no próprio lugar. `--tamanho-2`, `--tamanho-5` e `--tamanho-7` têm dois usos cada e são os candidatos a sumir.

### Espaço (já existem)

Escala em quartos de rem: `--espaco-1` (0,25) `-2` (0,5) `-3` (0,75) `-4` (1) `-5` (1,25) `-6` (1,5) `-8` (2) `-10` (2,5) `-12` (3) `-16` (4). Mais `--margem` (lateral da página) e `--largura` (largura máxima).

**Proposto:** 78 usos ainda fora da escala (lista no inventário). Levar cada um ao token mais próximo muda a tela em um ou dois pixels por lugar; dá para fazer de uma vez quando o visual for trocado. E tokens de ritmo de página para os `clamp()` que se repetem: `--respiro-pagina` (abertura e fim de seção) e `--respiro-bloco`.

### Forma, foco e sombra (já existem)

| Token | Papel | Valor |
| --- | --- | --- |
| `--raio-1` a `--raio-5` | cantos, do selo ao cartão flutuante | 4, 6, 8, 12, 16 px |
| `--raio-pilula` | botões, opções, filtros | 999 px |
| `--borda` | espessura padrão de borda | 1,5 px |
| `--foco` | contorno do foco pelo teclado | 3 px sólido na cor do texto |
| `--foco-afastamento` | distância do contorno | 3 px |
| `--sombra-foto` | a cópia impressa | duas camadas |
| `--sombra-flutuante` | cartão do ramo na árvore | uma camada |
| `--curva-saida` | movimento da árvore | `cubic-bezier(0.22, 1, 0.36, 1)` |

**Proposto:** dar papel aos raios (`--raio-selo`, `--raio-campo`, `--raio-cartao`) quando o visual definir quantos são. Durações: `--tempo-curto` (0,25 s) e `--tempo-medio` (0,45 s) no lugar das seis de hoje.

### Tamanhos que dependem do visual (já existem)

| Token | Papel | Valor |
| --- | --- | --- |
| `--toque-minimo` | altura mínima de qualquer coisa tocável. Nunca abaixo de 44 px | 2,75 rem (44 px) |
| `--altura-botao` | botão principal | 3,25 rem (52 px) |
| `--largura-formulario` | largura de formulário, recado e trilha | 40 rem |

`testes/tokens.test.ts` confere que `--toque-minimo` continua em 44 px e que nenhuma cor ou fonte entra solta fora do `:root`.

**Proposto:** `--altura-campo` (hoje os campos têm a altura do padding) e `--largura-leitura` para o texto corrido dos relatos e das aberturas (hoje 34 ch, 38 rem, 44 rem e 44 ch convivem).

## Componentes

Para cada um: papel, variações, estados e onde é usado. "Componente Astro" indica que já existe em `src/components/`.

### Botão

- **Papel:** a ação que acontece ao tocar.
- **Variações:** `principal` (uma por tela), `leve` (secundária), `perigo` (excluir). Mais `arquivo`, que é um rótulo com cara de botão para escolher fotos.
- **Estados:** normal, sob o cursor, foco, desabilitado. **Faltam:** pressionado e enviando (com o botão travado e o texto do que está acontecendo, como "Publicando…").
- **Onde:** todo formulário e página com ação.
- **Proposta de componente:** `Botao.astro` com `variacao`, `href` (vira `a`) ou `tipo` (vira `button`). Hoje são 51 botões escritos à mão.

### Link de ação

- **Papel:** ação discreta, que não compete com o botão (histórico, voltar, descartar).
- **Hoje:** `<a>` solto, com o tamanho do texto ao redor. Seis usos, com 25 px de altura.
- **Proposta:** classe `.link-acao` com `--toque-minimo`, para os seis lugares.

### Campo

- **Papel:** rótulo, campo e dica.
- **Variações:** texto, número, área de texto, lista suspensa, data. Montado como `label.campo` (39) ou `.em-linha label` (10).
- **Estados:** normal, foco. **Faltam:** erro (borda e mensagem ao lado, hoje só o balão do navegador), desabilitado com aparência própria.
- **Proposta de componente:** `Campo.astro` com `rotulo`, `dica`, `opcional` e o campo no slot. Junta as duas montagens.

### Data

- **Papel:** data flexível (só ano, mês e ano, completa, aproximada).
- **Hoje:** quatro montagens (ver `docs/ux/fluxos.md`, "Datas"). `CampoAno.astro` (componente Astro) é o ano com passos, usado na memória e no capítulo.
- **Proposta:** `CampoData.astro`, ano, mês e dia nessa ordem, com partes ligáveis.

### Opção

- **Papel:** escolher entre opções visíveis.
- **Variações:** pílula (`.opcao`), pílula com explicação (`.abas`), nativa (`.marcar`).
- **Estados:** normal, marcada, foco. **Faltam:** desabilitada (núcleos travados) e pressionada.
- **Proposta:** a pílula para escolha única e a caixa visível para várias, para que "uma" e "várias" se distingam; `.marcar` fica para liga e desliga (uma caixa só). Componente `Opcoes.astro` com `tipo` (`unica` ou `varias`), `legenda` e a lista.

### Busca de pessoa

- **Papel:** escolher uma pessoa entre muitas, ou cadastrar um nome novo.
- **Hoje:** não existe. Lista suspensa mais campo de texto (laço), lista suspensa (relato, árvore), pílulas com filtro (memória).
- **Proposta:** `BuscaDePessoa.astro`, campo com sugestões e "Cadastrar Fulano" no fim. Sem JavaScript, vira a lista suspensa de hoje.

### Recado

- **Papel:** resultado de uma ação.
- **Variações:** sucesso (`.recado`), erro (`.recado--erro`), situação do envio (`.situacao`), alerta antes de algo destrutivo (`.alerta`), confirmação depois de salvar (`.confirmacao`).
- **Estados:** não se aplica.
- **Proposta:** juntar `.situacao` ao recado, com as mesmas cores; um componente `Recado.astro` com `tipo` (`sucesso`, `erro`, `alerta`).

### Cartão

- **Papel:** um item de lista com título, data e ações.
- **Variações:** cartão da linha do tempo (`Cartao.astro`, componente Astro), caixa branca (lixeira, laços, editar capítulo, tipos), linha com fio (rascunhos, pessoas).
- **Proposta:** `Item.astro` para as listas de trabalho (lixeira, rascunhos, laços), com título, linha de detalhe e o slot de ações. O cartão da linha do tempo continua à parte.

### Ficha

- **Papel:** pares de rótulo e valor.
- **Variações:** `.memoria__ficha` e `.resumo`, os dois em `dl`.
- **Proposta:** uma classe só, `.ficha`.

### Selo e etiqueta

- **Papel:** marcar o tipo ou a condição de algo.
- **Variações:** `.selo` (condição: exemplo, restrito, capítulo de época), `.tipo` (tipo de momento com ponto de cor), `.etiqueta` (tema, é link).
- **Estados:** a etiqueta precisa de `--toque-minimo` (hoje 40 px).

### Estado vazio

- **Papel:** dizer que não há nada e o que fazer.
- **Hoje:** `.vazio`, 8 usos, só com texto.
- **Proposta:** `Vazio.astro` com o texto e uma ação opcional ("Nova memória" numa linha do tempo vazia).

### Trilha de etapas

- **Papel:** onde a pessoa está num formulário longo.
- **Variações:** montada por `etapas.ts` e escrita à mão (`.etapas--fluxo`, nova pessoa).
- **Estados:** atual, feita, por fazer. Faltam alvos de 44 px no celular, onde os botões são as barras de 18 px.
- **Proposta:** `Etapas.astro` para a versão fixa, com a mesma aparência da montada pelo script.

### Abertura

- **Papel:** título da página e o que vem logo abaixo dele.
- **Hoje:** `Abertura.astro` (componente Astro) nas 15 páginas de trabalho. As três de leitura (início, pessoa, capítulo) ainda escrevem a abertura à mão, porque têm conteúdo próprio entre o título e a linha do tempo.
- **Proposta:** a abertura recebe `voltar` (link de volta, sempre no mesmo lugar, acima do título) e `acoes` (a ação principal, sempre logo abaixo do texto). Hoje cada página põe os dois onde cabe.

### Árvore

O arranjo e as linhas são do Gui. Em volta deles: o painel "Ajustar a árvore", a ficha do foco, o zoom, a legenda e o cartão do ramo usam botões sem classe de componente. Ao trocar o visual, os botões do mapa entram como uma variação `mapa` do Botão, com `--toque-minimo`.
