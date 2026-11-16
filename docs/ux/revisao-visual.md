# Para a revisão visual

O que o QA de UX de 16/11/2026 deixou de propósito para quando a direção visual for definida. Consulte esta lista ao começar a revisão visual: cada item depende de decisões de aparência (tamanhos, cores, espaçamento) e mexer agora seria refazer depois.

O mapa completo da interface está em `docs/ux/inventario.md`, e a proposta de tokens e componentes em `docs/ux/padroes.md`. Para conferir que uma troca de tokens não mexeu na tela sem querer, use `npm run capturas` (ver `docs/ux/inventario.md`).

## Tokens e valores

- **Espaços fora da escala:** 78 usos em `src/styles/global.css` ainda escritos à mão (0,15, 0,2, 0,3, 0,35, 0,4, 0,45, 0,6, 0,7, 0,85, 0,9, 1,1, 1,4 e 1,75 rem, e os `clamp()` das aberturas e da linha do tempo). Levar cada um ao token mais próximo da escala `--espaco-*` muda a tela em um ou dois pixels por lugar. Os `clamp()` que se repetem viram tokens de ritmo de página (`--respiro-pagina`, `--respiro-bloco`).
- **Tamanhos de texto:** reduzir os nove `--tamanho-*` para uns seis, com nome de papel (`--tamanho-miudo`, `--tamanho-interface`, `--tamanho-corpo`, `--tamanho-subtitulo`, `--tamanho-secao`), e criar tokens para os títulos grandes (`--titulo-pagina`, `--titulo-ano`), hoje em `clamp()` no próprio lugar. `--tamanho-2`, `--tamanho-5` e `--tamanho-7` têm dois usos cada e são os candidatos a sumir.
- **Vermelhos:** juntar `--cor-erro-texto` e `--cor-perigo-forte`, que fazem o mesmo papel. Criar `--cor-sucesso` se o recado de sucesso ganhar cor.
- **Raios:** dar papel aos `--raio-*` (`--raio-selo`, `--raio-campo`, `--raio-cartao`) quando o visual definir quantos são. Sobram à mão 2 px (foco), 9 px e 28 px (árvore).
- **Bordas:** além de `--borda` (1,5 px), há seis espessuras únicas (1, 2, 2,5, 3, 4 e 6 px). Definir por papel: fio, separador, destaque.
- **Durações:** as seis durações da árvore (0,2 a 0,5 s) viram duas, `--tempo-curto` e `--tempo-medio`.
- **Larguras de leitura:** 40 rem é o token `--largura-formulario`; ainda convivem 44 rem, 38 rem, 34 ch, 44 ch e 16 ch. Escolher uma ou duas (`--largura-leitura`).
- **Altura de campo:** criar `--altura-campo`; hoje os campos têm a altura que o padding dá.
- **Altura do botão principal no celular:** `--altura-botao` (52 px) vale para todas as larguras.
- **`theme-color`** em `src/layouts/Base.astro` repete `--cor-fundo` à mão, porque a meta não aceita variável.
- **Cores dos tipos de momento:** vêm do banco (tabela `tipos`, `banco.ts` e `admin/tipos.astro`). O visual final pode pedir uma paleta nova, aplicada em `/admin/tipos`.

## Áreas de toque (adiadas pelo Gui em 16/11/2026)

A regra continua: nada tocável abaixo de 44 px (`--toque-minimo`). Os lugares abaixo ficam para a revisão visual, porque ela vai mudar bastante o tamanho de cada peça. Medidos em 390 px:

| Onde | Hoje |
| --- | --- |
| Trilha de etapas no celular (as barras são botões) | 18 px de altura |
| Itens do menu | 37 px de altura |
| Links soltos de ação ("Excluir memória", "Descartar este rascunho", "Excluir capítulo") | 25 px |
| Caixas `.marcar` ("Não tenho certeza da data", "Já faleceu", memórias do capítulo) | 28 px |
| Etiquetas de tema (`.etiqueta`) e camadas da árvore | 40 px (`min-height: 2.5rem`) |
| Botões ♥ e + da árvore | cerca de 37 por 49 px, já com a área estendida |
| Links da ficha na árvore ("Ver a página", "Laços", "Partir desta pessoa") | 18 a 25 px |
| Nomes na lista "Família e laços" da página de pessoa | 30 px |

O link "Histórico de alterações" da memória já ganhou 44 px ao virar `.link-acao`. Os links soltos da lista acima podem usar a mesma classe.

## Aparência dos estados

Os estados que faltavam passaram a existir em 16/11/2026 (ver `docs/decisoes.md`, "Interação dos formulários"). A aparência de cada um é provisória:

- pressionado: desce 1 px e escurece um pouco;
- enviando: o botão fica mais claro, com o cursor de espera e o texto do que está acontecendo;
- erro no campo: borda vermelha;
- opção desabilitada: borda tracejada e mais clara;
- caixa de marcar em pílula: uma caixa com tique antes do nome;
- confirmação no lugar: caixa branca com borda vermelha, abaixo do botão.

## O que mais esperar do visual

- A trilha de etapas da nova pessoa (`.etapas--fluxo`, escrita à mão) e a montada pelo script têm desenhos diferentes. Juntar numa peça (`Etapas.astro`) quando a trilha ganhar o desenho final.
- Os botões do mapa da árvore (zoom, "Ir ao foco", "Ver tudo", "Partir desta pessoa") não usam o componente de botão. Entram como uma variação do botão, com `--toque-minimo`.
- As três listas de trabalho (lixeira, rascunhos, laços) usam três desenhos de item. Proposta de `Item.astro` em `docs/ux/padroes.md`.

## Baixa prioridade

- **Leitor de tela:** não é necessário para quem usa o acervo hoje (decisão do Gui, 16/11/2026). A marcação semântica (`fieldset`, `legend`, `role`, rótulos) continua sendo feita porque também serve ao teclado e aos testes, mas não há conferência com leitor de tela.
