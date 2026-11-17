# Direção visual

Decisões do Gui de 16/11/2026, tiradas da análise das referências no documento "Direção visual: análise das referências" (Claude Docs: https://claude.ai/artifact/RtLSAGbAbnsRVpHsFXzcxw). Este arquivo é o que vale para construir; o documento guarda a análise de cada site.

A ideia em uma frase: um álbum de família editado. Papel claro, títulos em serifa macia, legendas pequenas em mono com lugar e ano, foto tratada como objeto (polaroid, monte de fotos, retrato recortado) e movimento discreto, que qualquer pessoa entende sem pensar.

## Para quem

A família inclui gente com pouca familiaridade com sites, usando sobretudo o celular. A Elizete teve dificuldade com a rolagem diferente da página Sobre da @bsurda. Toda escolha visual passa por essa pergunta: a pessoa entende sem pensar?

## Revisão do zero (decisão do Gui, 16/11/2026)

O visual é refeito do zero, e não adaptado sobre o que existe. Ficam as fundações e as paredes estruturais, que são a experiência combinada até aqui. Todo o resto vai abaixo: esqueleto de página, CSS, componentes, navegação visual, composição de cada tela. A régua de qualidade é o bayara.design e o site da @bsurda (repositórios `guilhermebayara/bayara` e `guilhermebayara/absurda`): alto nível, sem concessão.

### O que fica (fundações)

| Fundação | O que não muda |
| --- | --- |
| Dados e regras | Banco, migrações, permissões, visibilidade, rascunho, lixeira, histórico, núcleos e parentes, espelho |
| Árvore | O comportamento inteiro: arranjo, lados das famílias, linha direta, ramos recolhidos em cartão, laços do coração, regras das linhas (`testes/arvore-*.test.ts`), arrastar e aproximar. Muda só a aparência |
| Fluxos | Cadastro guiado por caminho, as sete etapas da Nova memória e o que é obrigatório, "Quem estava?" com sugestões, busca de pessoa, data flexível, relato com áudio, corrigir e restaurar (seção "Interação dos formulários" de `docs/decisoes.md`) |
| Organização | As páginas e o que cada uma contém, a ordem da linha do tempo e a ordem da página da memória (abaixo) |
| Textos de interface | O jeito de falar ("sua avó", o botão diz o que acontece) e os nomes das ações |
| Acessibilidade | Funciona sem JavaScript, por teclado, com movimento reduzido, toque mínimo de 44 px |
| Decisões visuais | As da tabela "Decisões", abaixo |

### O que se refaz

Tudo o que é aparência e composição: o grid, a escala de tipo, os espaços, cada componente, a barra do topo e o menu, a abertura de cada página, como a foto entra na tela, o cartão da árvore, os formulários por fora, os estados vazios. O CSS atual (`src/styles/global.css`) não é ponto de partida, nem os valores de `docs/ux/padroes.md`, que servem só como inventário do que existe. A marcação das páginas pode mudar à vontade, desde que os scripts de `src/lib/cliente/` e os testes continuem achando o que precisam.

### A ideia central: a caixa de fotografias da família

Toda casa tem uma, com fotos reveladas, um envelope do laboratório e, no verso de cada foto, alguém escreveu à mão quem estava e quando. O site usa esse vocabulário na composição e na tipografia, nunca em textura. Nada de papel envelhecido, fita adesiva ou moldura de álbum: o resultado parece revista, não scrapbook.

- **A foto e o verso.** A memória é uma foto com o seu verso. A frente é a imagem; o verso é a ficha em mono, como o carimbo do laboratório de revelação ("14 AGO 1994 · BELO HORIZONTE"), e os relatos, assinados à mão.
- **O ano como divisória.** Na linha do tempo, cada ano ou década abre com o número grande em serifa, como as abas de um fichário.
- **A cor de cada família.** Cada família tem sua cor pastel, como a capa do álbum de cada casa. A versão saturada marca o que importa naquela tela.

### Uma ideia forte por tela

| Tela | A ideia | O que fica quieto |
| --- | --- | --- |
| Painel (página inicial) | Na primeira visita, a carta de Natal assinada à mão pelo Gui, pela Giovanna e pelo Magno. Depois, o que entrou de novo, como quem abre a caixa e acha fotos que não estavam lá | Aniversários e atalhos, em segundo plano |
| Tudo e famílias | A assinatura ("MEMÓRIAS" e os sobrenomes) grande, e logo o ano mais recente abrindo a lista | Menu e filtros pequenos |
| Linha do tempo | O ano grande como divisória e as fotos-chave como polaroids | A ficha de cada memória em uma linha mono |
| Explorar, mural e modo TV | No mural, só as fotos, como a caixa aberta na mesa. No modo TV, uma memória por vez, grande, para ver junto | Filtros e ordem recolhidos numa linha |
| Memória | A foto e o verso: a imagem grande, a ficha como carimbo, os relatos como bilhetes assinados | Corrigir, histórico |
| Pessoa | O retrato e a voz: retrato recortado, parentesco grande ("sua avó"), os áudios dela | A lista de laços |
| Capítulo | Abertura de capítulo de livro: título, período, marcos numerados | Edição |
| Árvore | As famílias em cor, cartões como etiquetas com nome e parentesco | Camadas e controles |
| Formulários | Uma pergunta por tela, grande, em serifa, como quem conversa | A trilha das etapas |
| Sua conta | O retrato e o nome da pessoa no alto, e as coisas dela em ordem: dados, rascunhos, o que criou, laços | A administração, no fim, só para quem administra |
| Rascunhos, lixeira, administração | Utilitário e silencioso | Tudo |

### O nível de qualidade

O que o bayara.design e a @bsurda fazem e esta revisão precisa fazer:

- **Disciplina de tipo.** O bayara usa uma família só e tira a hierarquia de tamanho e espaço, com títulos grandes de espaçamento justo. Aqui são três famílias com papéis fixos (serifa nos títulos, grotesca no texto, mono nas fichas), e nenhuma aparece fora do seu papel.
- **Grid rígido e alinhado à esquerda.** Colunas fixas, tudo começa na mesma linha. Alinhamento óptico no tipo grande.
- **Cor com função.** No bayara, o azul marca o resultado e o terracota marca um custo. Aqui, o pastel marca a família e o saturado marca o que importa. Cor sem função não entra. Deleite visual também é função (decisão do Gui, 16/11/2026): a cor pode entrar para dar alegria e aconchego, como a forma colorida atrás de cada foto. O limite fica entre os dois sites de régua: mais cor que o bayara.design, que é quase mono, e sem chegar ao extremo da @bsurda.
- **Objeto com sentido.** O crachá da @bsurda imita uma coisa real do mundo da festa. Aqui, a polaroid e o carimbo do verso imitam o mundo da família.
- **Ações tipográficas.** Links e ações secundárias são texto sublinhado, sem pílula. Botão cheio só para a ação principal da tela.
- **Detalhe pequeno que se nota.** Como o nome do topo do bayara, que se preenche quando o nome grande sai da tela. Um ou dois no site, nunca em toda parte.
- **Celular primeiro, desktop de destaque.** A família vai usar quase só no celular, então cada tela nasce em 390 px. O desktop é o momento especial, a versão de ver juntos na TV: cada tela ganha composição própria em tela grande (de 1280 a 1920 px), com fotos grandes e tipo de capa, e nunca é o celular esticado.

## Conceito (fase 1), em aprovação

Construído em 16/11/2026 na branch `tst-visual`, em oito rodadas: a primeira versão e sete de ajustes que o Gui pediu ao ver cada uma. Aprovado pelo Gui em 16/11/2026, com exceção das fontes. A escolha das fontes continua em aberto: espera a opinião da Giovanna e do Magno, que vão ver as combinações em `/conceito/sobre`. O que ele já decidiu está na tabela "Decisões"; o resto daqui é proposta.

**Onde está.** As telas do conceito ficam em `/conceito`, ao lado do site atual, que continua inteiro:

| Tela | Endereço |
| --- | --- |
| Carta da primeira visita | `/conceito?visita=primeira` |
| Painel, numa visita seguinte | `/conceito` |
| Linha do tempo (Tudo e cada família) | `/conceito/tudo` (desde a fase 3, `/explorar`) |
| Memória | `/conceito/memorias/<id>` (desde a fase 3, `/memorias/<id>`) |
| Fontes, assinatura, cores e peças lado a lado | `/conceito/sobre` |

A faixa do alto (só nas prévias e no computador) troca de tela, de combinação de fontes e de pessoa. As rotas respondem 404 na produção e na homologação, porque o painel usa dados fixos de exemplo (`src/lib/servidor/conceito.ts`, conferido pela guarda da produção).

**Código.** O CSS novo está em `src/visual/` e não importa nada de `src/styles/global.css`: `tokens.css`, `fontes.css`, `base.css`, `pecas.css`, `estrutura.css` e um arquivo por tela em `telas/`. O esqueleto é `src/layouts/Visual.astro`, as peças com marcação própria ficam em `src/components/visual/` (a foto revelada, a assinatura, os ícones dos tipos e os rabiscos) e as funções puras em `src/lib/visual.ts`. Os testes estão em `testes/visual.test.ts`: cor só em `tokens.css`, fonte só em `fontes.css`, nenhum token antigo, toque de 44 px, e nada preso à rolagem além da barra de décadas e do ano.

**Combinações de fontes para escolher** (todas de licença livre, pelo Fontsource, com acentos e itálico conferidos em português). Ainda sem escolha:

| | Serifa | Grotesca | Mono | Manuscrita | Caráter |
| --- | --- | --- | --- | --- | --- |
| A, Macia | Fraunces | Geist | Geist Mono | Oooh Baby | A mais próxima de Recoleta. Corresponde ao desenho normal do rascunho da assinatura |
| B, Editorial | Instrument Serif | Instrument Sans | IBM Plex Mono | Reenie Beanie | Condensada, de revista. A grotesca é a mesma do bayara.design. Corresponde ao desenho condensado |
| C, De cartaz | DM Serif Display | DM Sans | DM Mono | Nothing You Could Do | Pesada, de cartaz. Corresponde ao desenho em negrito |

Dá para misturar: a manuscrita e a mono de uma combinação com a serifa de outra.

**O que o Gui já aprovou:** o menu (sanfona no celular, "Início", as famílias no alto da linha do tempo), os textos novos ("Oi, Gui.", "Entraram duas memórias e um relato desde a sua última visita.", "Você estava lá e ainda não contou", "Ver a linha do tempo inteira", "Abrir o acervo", "Cada pessoa conta o dia do jeito que lembra."), a foto revelada em toda foto-chave, as cores das famílias e as dos tipos de momento, a abertura da memória em bloco de cor, a lógica dos trilhos dos capítulos, com o tracejado, a separação entre época e capítulo e, conferidos no iPhone, a barra de décadas e o ano parados no alto.

**O que as últimas rodadas propõem e espera decisão:**

- **Ícones dos tipos.** Um rabisco de traço para cada um: broto (nascimento), bolo (aniversário), alianças (casamento), estrela (conquista), aviãozinho de papel (viagem), casinha (casa), balões (festa), balão de fala (causo), xícara (dia a dia), flor (despedida) e brilho (outro e tipos novos). Estão em `src/components/visual/IconeDoTipo.astro`.
- **Painel.** O papel tingido na cor da família de quem vê, os cartões, o nome sublinhado a caneta e o envelope do laboratório. Entrou o cartão "Neste dia, em outros anos" (`src/lib/painel.ts`): as memórias que a pessoa vê e que aconteceram no mesmo dia; sem nenhuma, as da mesma semana; sem nenhuma, as do mesmo mês. Ele fica logo depois das novidades.
- **O convite do fim da memória.** No lugar da faixa, um bilhete em branco com o retrato e o nome de quem está vendo, as linhas vazias e a assinatura dela ainda apagada. A frase continua "Cada pessoa conta o dia do jeito que lembra.".
- **Capítulos na linha do tempo**, pelo item de `docs/decisoes.md`. A montagem dos trilhos está em `src/lib/linha-capitulos.ts`, sem tela, com teste em `testes/linha-capitulos.test.ts`. A memória presa ao capítulo tem uma parada no trilho; a de fora deixa o trilho tracejado, solução que o Gui aprovou. No alto, o trilho faz a curva até o título e o período do capítulo, que levam à página dele; embaixo, até a marca "Começo do capítulo “Natais”" (texto do Gui). Cabem dois trilhos no celular, quatro a partir de 62rem e seis a partir de 100rem. Com o filtro por tipo ligado, os trilhos saem.
- **Cor de cada capítulo e sinal na memória** (ideia do Gui, 16/11/2026). Cada capítulo ganha uma cor: o trilho usa o tom do meio, para não disputar com as fotos, e a parada usa o tom vivo. Cada memória mostra, embaixo da ficha, o sinal dos capítulos dela: a mesma parada, na cor do capítulo, com o nome. É o que liga a memória ao trilho e, onde o trilho não cabe, o que diz de que capítulo ela é. A montagem garante que dois capítulos que convivem nunca dividem a cor (`CORES_DOS_CAPITULOS`, em `src/lib/visual.ts`).
- **Sua conta no topo** (pelo item de `docs/decisoes.md`). O retrato e o nome de quem está logado levam à conta; no celular, só o retrato, ao lado de "Menu". "Rascunhos" saiu do menu, e a lixeira e a administração saíram do rodapé. A tela da conta é da fase 3: no conceito, `/conceito/conta` é só uma página de passagem.
- **Controles da linha do tempo** (achado do Gui, 16/11/2026: a década passava batida, o filtro por tipo mudava de lugar ao abrir e as famílias quebravam a linha). Abaixo da assinatura, cada controle tem nome e lugar fixo, um embaixo do outro: **Família**, numa linha só no computador e em duas colunas no celular, onde não cabe (a primeira opção se chama "Família completa", e não mais "Tudo"); **Tipo**, que fechado diz o tipo escolhido ("Todos os tipos", "Viagem") e aberto mostra a lista logo abaixo, sem sair do lugar; e **Década**, uma faixa na cor da família bem diluída no papel (o pastel cheio ficou "amarelo demais", do Gui), de ponta a ponta, parada no alto, com a década em leitura numa ficha de papel. No computador os nomes ficam numa coluna à esquerda; no celular, em cima de cada controle. A conta das memórias fica sozinha, ao lado da assinatura.
- **No toque, nada preso por sticky** (achados do Gui no iPhone, 16/11/2026). Com a faixa de décadas presa no alto, o Safari do iOS 26 desenhava uma banda atrás do relógio. A saída é a do site da @bsurda: em aparelho de toque, o que fica parado no alto anda por uma animação ligada à rolagem (`pino-novo`, em `Visual.astro` e `telas/linha.css`), sem `sticky` nem `fixed`, com uma cobertura na cor do papel acima da faixa. Com mouse, o `sticky` continua. **Uma peça só anda com a rolagem:** a que leva a faixa de décadas e a gaveta do ano (`.parada`). O cabeçalho de cada ano rola com a página, e o ano parado é uma cópia dele dentro da gaveta, do mesmo tamanho e no mesmo lugar em que ele chega ao alto; a troca acontece quando o cabeçalho seguinte chega ali. A primeira versão tinha uma animação por ano, ligada só perto da tela, e a faixa e o ano davam um pulinho na troca de ano: nada mais liga nem desliga animação no meio do caminho. O Gui conferiu no iPhone em 16/11/2026: a banda sumiu e a troca de ano não pula mais.
- **Fotos na página da memória** (pedido do Gui, 16/11/2026).
    - **Leque na abertura.** Com mais de uma foto e espaço (computador e tela grande), as fotos de trás se abrem para os lados da principal. No celular continuam em monte.
    - **Parede de fotos.** A seção "Fotos" mostra todas como fotos reveladas, um pouco fora de fila, cada uma com a legenda dela.
    - **Galeria.** Tocar em qualquer foto (da abertura, da parede ou de um relato) abre a galeria na própria página: a foto inteira, sem corte, com margem branca de ampliação, a legenda, "Foto 2 de 6" e os controles com nome escrito ("Anterior", "Próxima", "Fechar"). As fotos ficam numa fila que rola para o lado com a rolagem do próprio aparelho e encaixa em cada foto: no celular a foto acompanha o dedo e a seguinte entra, como no álbum de fotos do celular (pedido do Gui, 16/11/2026: o padrão que quem não é nativo digital associa a passar fotos). Os botões e as setas do teclado fazem a mesma passagem, deslizando, e a galeria abre subindo um pouco; com movimento reduzido, tudo troca sem deslizar. Fecha pelo Esc e pelo voltar do aparelho, sem sair da página. Sem script, cada foto continua sendo um link para a imagem. É um `<dialog>` no papel da página. O Gui conferiu no iPhone em 16/11/2026: o gesto funciona.
    - **Foto que veio com um relato** (decisão do Gui, 16/11/2026: aparece nos dois). É a mesma foto: ela é da memória, entra na parede e na galeria com todas as outras, e aparece também pequena no bilhete do relato que a trouxe, abrindo a mesma galeria naquela foto. Na galeria, ela diz "Veio com o relato de …". No conceito isso é FIXO em duas memórias de exemplo (`FIXO_FOTOS_DOS_RELATOS`), porque o banco ainda não liga a foto ao relato.
- **"Início" no menu** (pedido do Gui, 16/11/2026). "Memórias", no alto, leva ao início, e o menu também diz "Início", no computador e no celular: quem tem menos familiaridade com sites não precisa adivinhar.
- **A carta** passa a ser assinada pelos três: Gui, Giovanna e Magno.
- **Monograma.** No celular, o "M" do topo era a letra da serifa, provisória. O desenho em SVG entrou na fase 2 (ver "Sistema" e "Monograma").

**Época e capítulo** (aprovado pelo Gui em 16/11/2026, a partir do furo que ele achou no capítulo de época). Pela regra antiga, toda memória que cai no período de um capítulo de época é dele, mesmo num capítulo que é só da vida da Giovanna e do Magno. A separação:

- **Época** é só o que vale para a família inteira, como a pandemia ou os anos 90.
- **Capítulo** é a história de alguém. Pode ser montado à mão, como hoje, ou por período, de pessoas ou de uma família (um capítulo da gravidez, do casal, por exemplo): entram sozinhas as memórias do período em que alguma dessas pessoas está ou que são dessa família. As outras memórias do período ficam de fora, e o trilho segue tracejado.
- "Capítulo de época" deixa de existir como nome: ou é uma época, de todos, ou é um capítulo, de alguém.

O banco guarda de quem é cada capítulo por período desde a migração `019` (regra em `docs/decisoes.md`, "Capítulos e temas"), e o conceito lê de lá: no acervo de exemplo, "A infância da Giovanna" é da Giovanna, e "Os anos 90" e "Os anos de casa" são épocas de todos.

**A época na linha do tempo** (terceira versão; o Gui disse que o chão funciona e pediu os ajustes desta). A época é o chão: enquanto se rola por dentro dela, o papel muda de tom de ponta a ponta da tela. Assim cada coisa tem a sua forma: a época é fundo, o capítulo é linha e a memória é figura.

- **O nome fica numa aba que sai do próprio chão**, como a de uma divisória de fichário: no alto, a aba sobe para fora do chão da época, com "Época", o nome e o período; no fim, desce, com "Começo da época “Os anos de casa”". Antes o nome ficava logo acima da primeira memória e parecia título dela.
- **Sem vão.** A linha da aba não tem margem, só espaço por dentro: o chão, o fio do tempo e os trilhos passam por ela inteiros (teste em `testes/visual.test.ts`).
- **Épocas que se sobrepõem.** Onde duas valem ao mesmo tempo, o chão fica um tom mais fundo (até três tons, `--chao-1` a `--chao-3`), e cada época tem a sua aba, na cor do chão dela: a de dentro abre sobre o chão da de fora. Quando acabam juntas, fecha primeiro a de dentro. A conta é da montagem (`epocas`, `epocasDeCima` e `chaoDaEpoca`), com teste para épocas uma dentro da outra, que abrem juntas e que se cruzam. O texto suave escurece junto com o chão, para continuar em 4,5:1.
- **No computador, o ano diz as épocas que passam por ele**, embaixo do número: no meio de uma época longa, a aba com o nome já ficou para trás. No celular, o ano parado no alto leva o tom do chão que está logo embaixo dele, para não virar uma faixa de outro tom quando uma época começa ou acaba no meio do ano.
- **Uma época que começa antes e acaba no meio da outra** (pergunta do Gui, 16/11/2026) cai na mesma regra, sem caso especial: entra a primeira (um tom), entra a segunda por cima (dois tons), a primeira acaba com a aba "Começo da época" dela descendo do chão de dois tons, e o chão volta a um tom, que agora é o da segunda, até o começo dela. O tom diz quantas épocas valem ali; quem diz quais são as abas e, no computador, a lista embaixo do ano.
- O acervo de exemplo só tem épocas que não se cruzam. Para ver a sobreposição, o Gui criou "Pandemia de COVID-19" no banco das prévias; no banco local, a mesma época foi criada à mão para as capturas.

**Destaque do capítulo com o mouse** (pedido do Gui, 16/11/2026: no computador, capítulo longo precisa ser fácil de identificar). Passar o mouse por um trilho acende o capítulo inteiro, do começo ao fim, na cor viva dele, recua os outros trilhos e mostra ao lado do cursor o nome e o período. O sinal desse capítulo em cada memória fica sublinhado. O foco do teclado no título do capítulo faz o mesmo. Só existe onde há mouse (`(hover: hover) and (pointer: fine)`); no celular, o sinal em cada memória já diz o capítulo.

**A hierarquia das linhas** (pedido do Gui, 16/11/2026: os trilhos dos capítulos apareciam mais que a linha do tempo). O fio do tempo é a linha principal: mais firme, contínuo do primeiro ao último ano, com um ponto em cada memória. Os trilhos dos capítulos ficam à esquerda dele, mais finos e mais claros, com a parada menor.

**Memória sem foto** (pedido do Gui, 16/11/2026). Ganha o mesmo cartão da foto revelada, com a cor e o ícone do tipo de momento no lugar da imagem. Vale na linha do tempo e em "Neste dia, em outros anos", para nenhuma memória ficar com um buraco nem parecer erro.

**O que é fixo de exemplo no painel**, porque a parte funcional ainda não existe: o texto da carta, o dia de hoje (a véspera de Natal de 2026) e o da última visita, quais memórias e qual relato contam como novos e as datas e idades dos aniversários. Memórias, fotos, relatos, retratos, parentesco e a contagem de "Você no acervo" são lidos do acervo de exemplo, com a visibilidade de quem olha.

**O que ficou de fora de propósito:** os efeitos da fase 4 (a frase que acende, a foto que amplia no lugar; hoje a foto abre o arquivo), o tocador de áudio próprio (o bloco usa o do aparelho) e as outras telas, que continuam com o visual antigo. Os links do conceito para capítulos, pessoas, árvore e formulários caem nelas.

**Capturas.** `CAPTURAS_SO=conceito npm run capturas -- tirar <pasta>` tira as quatro telas nas três combinações, em 390, 1280 e 1920 px, com movimento reduzido, e um trecho da linha do tempo com os capítulos de dentro. As da quinta rodada estão em `docs/visual/conceito/` (a linha do tempo, cortada em 9000 px de altura).

## Sistema (fase 2)

Construído em 16/11/2026 na branch `tst-visual-sistema`, a partir do conceito aprovado. Os tokens e as peças do conceito viraram sistema: as telas do conceito passaram a ser montadas com ele e continuam iguais (conferidas pixel a pixel antes e depois; a única diferença é o monograma no topo do celular, que era a letra da fonte e agora é o desenho). A página `/conceito/sistema`, nas prévias de teste e no computador, mostra tudo lado a lado.

**A fonte é uma linha.** `FONTES_DO_SITE`, em `src/lib/visual.ts`, diz de qual combinação vem a fonte de cada papel do tipo. Trocar a combinação inteira é `combinacao('b')`; misturar é `{ ...combinacao('a'), mao: 'b' }`. O esqueleto leva a escolha à página em quatro atributos (`data-serifa`, `data-grotesca`, `data-mono` e `data-mao`) e `src/visual/fontes.css` tem as três opções de cada papel, com os acertos de cada serifa. O monograma, o ícone do site e a largura da assinatura acompanham a serifa sozinhos. As três combinações continuam carregadas enquanto a escolha não sai (o navegador só baixa as que a página usa); depois da escolha, as outras duas saem de `src/visual/sistema.ts` e de `fontes.css`. Nas prévias, a faixa de teste continua trocando a combinação por um cookie, para comparar; na produção e na homologação o cookie não vale.

**Onde está cada coisa.**

| O quê | Onde |
| --- | --- |
| Entrada única do estilo | `src/visual/sistema.ts`: as fontes e, em ordem, `tokens.css`, `fontes.css`, `base.css`, `pecas.css` e `estrutura.css`. Todo esqueleto importa só este arquivo; cada tela soma o CSS dela, de `src/visual/telas/` |
| Tokens | `src/visual/tokens.css`, em camadas: valores (neutros e as onze cores em quatro tons), papéis (`--papel`, `--tinta`, `--pastel`, `--vivo`, `--alerta`), espaço e grade, escala de tipo, formas, sombras e movimento. Cor só é escrita ali |
| Larguras de tela | 62rem para o computador e 100rem para a tela grande (40rem só para ajuste de coluna). Media query não lê variável: o teste confere que nenhuma outra largura aparece |
| Peças | `src/visual/pecas.css` e um componente por peça em `src/components/visual/` |
| Esqueleto | `src/layouts/Visual.astro`. Recebe `nucleos`, os núcleos do que está sendo visto, e tira dali a assinatura e a cor da tela |
| Funções puras | `src/lib/visual.ts`: fontes, assinatura, cor da família, da pessoa, do tipo e do capítulo, carimbo, legenda |
| Testes | `testes/sistema.test.ts` (fonte numa linha, assinatura, monograma, tokens e peças) e `testes/visual.test.ts` (regras do CSS e das telas do conceito) |

**Peças e componentes.**

| Peça | Componente | Situação |
| --- | --- | --- |
| Assinatura | `Assinatura.astro` | Do conceito. Agora lê os sobrenomes do cadastro de cada família e encolhe a linha longa |
| Monograma | `Monograma.astro` | Novo: o desenho em SVG |
| Foto revelada e monte de fotos | `Polaroid.astro` | Do conceito |
| Carimbo | `Carimbo.astro` | Do conceito |
| Etiqueta-balão | `Etiqueta.astro` | Do conceito |
| Ficha em mono | `Ficha.astro` e `Dado.astro` (classe `verso`) | Do conceito |
| Retrato recortado | `Retrato.astro` | Do conceito |
| Bilhete e nome manuscrito | `Bilhete.astro` | Do conceito |
| Bloco de áudio | `Audio.astro` | Do conceito, com o tocador do aparelho |
| Sinal do capítulo e trilhos | `SinalDoCapitulo.astro`, `Trilhos.astro` | Do conceito |
| Ícones dos tipos e rabiscos | `IconeDoTipo.astro`, `Rabisco.astro` | Do conceito |
| Ações | classes `botao`, `acao` e `acao--quieta` | Do conceito. Entrou o botão sem poder agir |
| Pílula de período | `Pilula.astro` | Nova, aprovada pelo Gui em 16/11/2026 |
| Sanfona de fases | `Sanfona.astro` | Nova, aprovada pelo Gui em 16/11/2026. Sem script; com o mesmo `grupo`, só uma fica aberta |
| Formulário em frase | classes `frase` e `frase__lacuna` | Novo, aprovado pelo Gui em 16/11/2026. A ligação com a Nova memória é da fase 3, com a lacuna da data como descrito abaixo |
| Campo de formulário | classes `pergunta`, `campo` e `escolha` | Novo, aprovado pelo Gui em 16/11/2026 |
| Recado e estado vazio | `Recado.astro`, `Vazio.astro` | O recado já existia no CSS; o vazio é novo, aprovado pelo Gui em 16/11/2026 |

**A data no formulário em frase** (pergunta do Gui, 16/11/2026: só digitação, formato forçado ou seletor de data?). Aprovado pelo Gui em 16/11/2026, a construir na fase 3: a lacuna da data não é campo de digitar. Ela mostra a data como o site já escreve ("24 de dezembro de 2025", "dezembro de 2025", "2025", "por volta de 1994") e, ao toque, abre logo abaixo da frase o controle de data flexível que já existe (o ano com −10, −1, +1 e +10, depois mês e dia, os dois opcionais), empurrando o conteúdo. Sem formato para acertar e sem o seletor de data do aparelho, que obriga a escolher dia, mês e ano e não aceita "só o ano". Sem script, a frase aparece com o controle já aberto embaixo. As lacunas de lugar e de pessoas seguem a mesma ideia: a de lugar é texto livre, e a de pessoas abre o "Quem estava?" de hoje.

O cartão do painel (`.cartao`) continua em `telas/painel.css`: só existe ali, e como peça ele passaria por cima da cor do cartão "contar".

**Quem ajusta o quê.** A tela pode ajustar uma peça, e a ordem dos arquivos é a que o conceito já usava. Uma tentativa de pôr base e peças em camadas do CSS (`@layer`) mudou a altura de várias telas do conceito e foi desfeita: fica para ser reavaliada quando o CSS antigo sair, na fase 3.

**O que a fase 2 não fez:** nenhuma tela nova. As telas do site continuam com o visual antigo, e o ícone novo só aparece nas telas do visual novo. `/admin/familias`, onde os administradores editam os sobrenomes, foi feita com a aparência mínima do visual antigo e é redesenhada na fase 3, dentro de "Sua conta".

**Capturas.** `CAPTURAS_SO=sistema npm run capturas -- tirar <pasta>` tira a página do sistema nas três combinações, em 390, 1280 e 1920 px. As desta fase estão em `docs/visual/sistema/`.

## Sistema (fase 2): como usar

Para a sessão da fase 3 começar sem a conversa da fase 2. A seção acima diz o que o sistema é; esta diz como trabalhar com ele. O código do sistema está na `homologa` (a `main` só recebe o código quando a revisão visual ficar completa), então a branch da fase 3 nasce da `homologa`. Para ver tudo montado: `npm run dev` e `/conceito/sistema`.

### Onde fica cada peça

O CSS das peças está em `src/visual/pecas.css` (as ações estão em `base.css`, e o recado e a assinatura em `estrutura.css`). Os componentes estão em `src/components/visual/`.

| Preciso de | Uso | Como |
| --- | --- | --- |
| A marca no alto ou no fim da página | `Assinatura.astro` | `<Assinatura sobrenomes={...} />`; com `titulo`, vira o `h1` da página. O rodapé do esqueleto já traz uma |
| O M sozinho | `Monograma.astro` | `<Monograma />` mostra o da serifa em uso; `corte="pequeno"` abaixo de uns 32 px. O tamanho vem do `font-size` de quem envolve (a altura é `1em`) e a cor, do `color` |
| A foto-chave de uma memória | `Polaroid.astro` | `id`, `fotos`, `legenda` (de `legendaLugarAno`), `tipo`. `forma` põe a forma de cor atrás, `monte={false}` tira as fotos de trás, `cedo` para a foto do alto da página, `galeria` na página da memória. Em volta, um elemento com `style={estiloDoTipo(tipo)}`, que dá a cor |
| Data e lugar | `Carimbo.astro` | `<Carimbo itens={[carimboDaData(memoria), memoria.lugar]} />`. Item vazio não entra |
| O tipo de momento | `Etiqueta.astro` | `<Etiqueta tipo={id} rotulo={nome} />` |
| Um período ou uma data aproximada | `Pilula.astro` | `<Pilula>2018–2020</Pilula>` |
| A ficha (quando, onde, tipo, capítulos) | `Ficha.astro` e `Dado.astro` | `<Ficha><Dado rotulo="Quando">…</Dado></Ficha>` |
| A foto de uma pessoa | `Retrato.astro` | `nome`, `foto` (o endereço, de `enderecoDoRetrato`, ou nada), `familia` (de `corDaPessoa`). `redondo` só no topo |
| Uma pessoa com nome e parentesco | classes `pessoa` e `pessoa__nome` | Um link com o `Retrato`, o nome e o parentesco em `ficha suave` (ver "Quem estava" em `src/pages/memorias/[id].astro`) |
| Um relato | `Bilhete.astro` | `por`, `registradoPor` (só quando não foi a própria pessoa) e o conteúdo dentro: `Audio`, depois `<div class="bilhete__texto">`. Com `href`, o bilhete inteiro vira link |
| Um áudio | `Audio.astro` | `rotulo`, `src`, `transcricao` |
| O capítulo de uma memória | `SinalDoCapitulo.astro` | `id`, `titulo` e `cor` (a posição dada pela montagem, `src/lib/linha-capitulos.ts`) |
| Fases de um casal ou marcos que abrem | `Sanfona.astro` | `ano`, `titulo`, `quando`, o conteúdo dentro. O mesmo `grupo` em todas faz só uma ficar aberta |
| Recado de "salvou" ou de erro | `Recado.astro` | `<Recado>` ou `<Recado erro>` |
| Tela sem nada para mostrar | `Vazio.astro` | `<Vazio frase="…">` com a ação dentro |
| Ícone de tipo, rabisco de caneta | `IconeDoTipo.astro`, `Rabisco.astro` | São enfeite: o texto está sempre escrito ao lado |
| A ação principal da tela | classe `botao` | Uma por tela. `aria-disabled="true"` ou `disabled` para o estado sem poder agir |
| As outras ações | classes `acao` e `acao--quieta` | Texto sublinhado, em link ou em `<button>` |
| Pergunta e campo de formulário | classes `pergunta`, `campo`, `campo__rotulo`, `campo__entrada`, `campo__dica`, `campo__erro`, `campo--erro`, `escolha` | Só CSS, sem componente: na fase 3, os componentes de formulário que existem (`CampoData`, `CampoAno`, `QuemEstava`) ganham estas classes sem mudar os nomes e os atributos que os scripts de `src/lib/cliente/` procuram |
| A frase com lacunas | classes `frase` e `frase__lacuna` | Só CSS. `--cabe` na lacuna diz quantas letras cabem. O comportamento da data está em "A data no formulário em frase" |

Classes de texto, em `base.css`: `t-capa`, `t-1`, `t-2`, `t-3` e `t-abertura` para a serifa; `ficha` e `rotulo` para a mono; `mao` para a manuscrita; `suave` para o texto de apoio; `so-leitor` para o que só o leitor de tela lê; `miolo` para a margem da página e `grade` para as colunas.

### Como montar uma tela nova

1. **A página usa o esqueleto novo.** `import Visual from '../layouts/Visual.astro'` no lugar do `Base.astro`. O esqueleto já traz o sistema inteiro (`src/visual/sistema.ts`), o topo, o menu, o rodapé com a assinatura, as fontes e o ícone. A página nunca importa `src/styles/global.css` nem o `Base.astro`: tem teste para isso.
2. **Diga o que a tela mostra.** `<Visual titulo="…" nucleos={ids}>`: os núcleos da memória, do capítulo ou da pessoa, ou o núcleo filtrado. Dali saem os sobrenomes da assinatura e a cor da tela. Sem `nucleos`, vale a família completa. `familia` só quando a cor não é a dos núcleos (a memória aberta a todos passa `'tudo'`). `intimo` é para a página que só a pessoa vê, tingida na cor da família dela. `secao` acende o item do menu.
3. **O CSS da tela vai em `src/visual/telas/<tela>.css`**, importado pela própria página, antes do esqueleto. Ali fica só a composição: a grade, os espaços entre as partes, o que é próprio daquela tela. Use os tokens; cor, família de fonte, raio de cápsula e largura de tela escritos soltos não passam nos testes.
4. **A marcação usa os componentes.** Uma tela não escreve `class="carimbo"` ou `class="retrato"` na mão: `testes/sistema.test.ts` recusa. Se a peça que você precisa não existe, ela nasce em `pecas.css` com um componente, entra na página `/conceito/sistema` e na tabela acima, e é mostrada ao Gui.
5. **Celular primeiro.** A tela nasce em 390 px. A composição de computador entra em `@media (min-width: 62rem)` e a de tela grande em `@media (min-width: 100rem)`, cada uma pensada de novo, sem esticar o celular.
6. **Confira antes do push.** `npm run build`; a tela em 390, 1280 e 1920 px, por teclado e com movimento reduzido; e `npm run capturas`, com a tela nova acrescentada à lista de `scripts/capturas.mjs`. Para garantir que mexer numa peça não mudou as telas já aprovadas, tire as capturas antes e depois e rode `npm run capturas -- comparar <antes> <depois>`.

O que a fase 3 precisa trocar no esqueleto: o menu e a marca do topo de `Visual.astro` ainda apontam para `/conceito`, e os testes de `testes/visual.test.ts` conferem esses endereços. Quando a primeira tela de verdade passar para o visual novo, os endereços e os testes mudam juntos. A faixa de teste do alto (telas, fontes, "Ver como") só existe fora da produção.

### Os tokens e quando usar cada um

Todos em `src/visual/tokens.css`. A tabela diz a intenção; os valores estão no arquivo e na página do sistema.

| Token | Quando |
| --- | --- |
| `--papel`, `--papel-recuo` | O fundo da página e o fundo recuado (faixa de teste, campo em foco, pílula). Na página íntima eles já vêm tingidos |
| `--branco` | A moldura da foto, o bilhete, o cartão e o recado: o que é objeto pousado no papel |
| `--tinta`, `--tinta-suave` | O texto e o texto de apoio. A suave tem contraste de leitura sobre o papel; sobre um bloco de cor, use a classe `bloco`, que a escurece |
| `--fio` | Linha fina entre partes |
| `--pastel`, `--meio`, `--vivo`, `--vivo-tinta` | A cor da família da tela, posta por `data-familia`. Pastel em bloco sólido, meio em enfeite sobre o pastel, vivo em ponto de destaque, tinta quando a cor precisa ser lida (carimbo, rabisco, texto) |
| `--tipo-pastel`, `--tipo-meio`, `--tipo-cor`, `--tipo-tinta` | A cor do tipo de momento, posta por `estiloDoTipo(tipo)` no elemento em volta. Fora dele, as peças caem na cor da família |
| `--trilho-cor`, `--trilho-ponto` | A cor do capítulo, posta por `estiloDoCapitulo(cor)` |
| `--alerta`, `--alerta-tinta` | O que deu errado: a marca e o texto |
| `--chao-1` a `--chao-3` | O chão das épocas na linha do tempo. Não é fundo de uso geral |
| As onze cores (`--verde-pastel`, `--azul-vivo`…) | Só para definir papéis. Numa tela, use o papel (`--pastel`, `--tipo-cor`), e não o nome da cor |
| `--e-1` a `--e-4` | Espaço dentro de um grupo |
| `--e-5` a `--e-7` | Espaço entre grupos |
| `--e-8`, `--e-9` | Espaço entre partes da página |
| `--margem`, `--calha` | A margem lateral da página (classe `miolo`) e o vão entre colunas (classe `grade`: 4 colunas, 12 a partir de 62rem) |
| `--t-capa` | O ano da linha do tempo e número de capa |
| `--t-titulo-1`, `--t-titulo-2`, `--t-titulo-3` | Título da página, título de parte ou pergunta, título de item numa lista |
| `--t-abertura` | A frase de abertura em serifa |
| `--t-leitura` | O relato e o texto que se lê com calma |
| `--t-corpo`, `--t-pequeno` | O texto da interface e o apoio |
| `--t-ficha`, `--t-micro` | A mono: ficha, rótulo e carimbo; selo |
| `--t-menu` | Só o menu do topo e o nome de quem está logado |
| `--medida` | A largura máxima de um texto corrido |
| `--raio-foto`, `--raio-moldura`, `--raio-bloco`, `--raio-carimbo`, `--raio-pilula` | A foto, o bilhete e o recado, o cartão e o bloco de cor, o carimbo, e tudo o que é cápsula ou arco |
| `--traco` | A espessura do traço: sublinhado de ação, borda do carimbo, linha do campo |
| `--toque` | 44 px: a altura mínima de tudo o que se toca |
| `--sombra-foto`, `--sombra-bilhete` | A foto revelada; o bilhete e o recado. Não há outra sombra |
| `--curva`, `--tempo-curto`, `--tempo-medio` | Toda transição: uma curva e dois tempos |

As serifas trazem os próprios acertos (`--escala-serifa`, `--aperto-titulo`, `--serifa-ajustes`, `--serifa-peso`), já aplicados nas classes de título. Texto em serifa fora dessas classes precisa levar `font-family`, `font-variation-settings` e `font-weight` juntos, como em `.pergunta`.

### Como a fonte é trocada

- A fonte do site é `FONTES_DO_SITE`, em `src/lib/visual.ts`. A combinação inteira: `combinacao('a')`, `combinacao('b')` ou `combinacao('c')`. Misturada: `{ ...combinacao('a'), mao: 'b' }`. Os quatro papéis são `serifa`, `grotesca`, `mono` e `mao`.
- Nada mais muda junto: o esqueleto põe `data-serifa`, `data-grotesca`, `data-mono` e `data-mao` na página, `fontes.css` responde com as variáveis, o monograma certo acende e o ícone vem de `public/icones/<serifa>/`.
- Nas prévias de teste e no computador, a faixa do alto troca a combinação por um cookie, para comparar. Na produção e na homologação o cookie não vale.
- A escolha espera a Giovanna e o Magno. Quando sair: muda a linha, e as duas combinações que sobraram podem sair de `src/visual/sistema.ts` (os arquivos das fontes), de `fontes.css`, de `COMBINACOES_DE_FONTES`, de `scripts/monograma.mjs` e de `public/icones/`, com os testes de `testes/sistema.test.ts` que contam três.
- Fonte nova, fora das três: instalar pelo Fontsource, acrescentar a opção em cada papel de `fontes.css` (a serifa pede `--assinatura-em`, `--sobrenomes` e `--ano-em`, medidos na tela até "MEMÓRIAS" e "Bayara & Bracarense" fecharem na mesma largura), acrescentar em `scripts/monograma.mjs` e rodar `npm run monograma`.

### O que ficou de fora do sistema, de propósito

- **O cartão do painel** (`.cartao`) mora em `telas/painel.css`. Como peça, ele passava por cima da cor do cartão "contar", porque o CSS da tela é carregado antes do CSS das peças.
- **A galeria de fotos** (o `<dialog>` da página da memória) está em `telas/memoria.css` e no script da própria página. Vira peça quando uma segunda tela precisar ampliar foto.
- **A linha do tempo** (trilhos, épocas, faixa de décadas, o ano parado) é da tela, em `telas/linha.css`. Só o sinal do capítulo virou peça.
- **Camadas do CSS** (`@layer`). Foi tentado pôr base e peças em camadas, para a tela sempre vencer a peça. Mudou a altura de várias telas do conceito, porque elas dependem da ordem dos arquivos, e foi desfeito. Vale reavaliar quando o `global.css` sair.
- **Tocador de áudio próprio.** O bloco usa o do aparelho.
- **Os efeitos da fase 4:** a frase que acende e a foto que amplia no lugar.
- **O comportamento dos formulários.** O sistema tem a aparência do campo e da frase; a ligação com as etapas, com a data flexível e com o "Quem estava?" é da fase 3.
- **Modo escuro.** A decisão é claro, sem fundo escuro.
- **O ícone no site atual.** O `Base.astro` não aponta para o ícone novo: ele chega com cada tela que passa para o esqueleto novo.
- **`/admin/familias`** foi feita no visual antigo, com aparência mínima. É redesenhada dentro de "Sua conta".

### Cuidados que custaram tempo

- **A ordem do CSS.** O CSS da tela entra antes do sistema (a página importa o dela e depois o esqueleto). Entre duas regras de mesmo peso, vence a do sistema. Para a tela ajustar uma peça, a regra da tela precisa de um seletor mais específico (`.dados .verso`, `.contar .botao`). Mover uma regra de uma tela para `pecas.css` pode mudar quem vence: compare as capturas antes e depois.
- **Safari do iPhone e peças paradas.** No iOS 26, um elemento preso (`sticky` ou `fixed`) encostado na borda da tela faz o Safari desenhar uma banda sólida atrás das barras dele. No toque, o que fica parado no alto anda por animação ligada à rolagem: o esqueleto põe a classe `pino-novo` no `html` quando o aparelho é de toque e o navegador tem `animation-timeline`, e as regras estão em `telas/linha.css`. Com mouse, o `sticky` continua. Uma peça só anda (`.parada`), e nenhuma animação liga ou desliga durante a rolagem: com uma animação por ano, a faixa e o ano davam um pulinho na troca de ano. `position: fixed` não entra, e `sticky` novo só dentro de `(hover: hover) and (pointer: fine)`: o teste recusa o resto. Peça parada nova segue esse modelo e é conferida pelo Gui no iPhone.
- **`animation` e `animation-timeline` em regras separadas**, a segunda depois da primeira. Juntas, o compactador funde as duas e o navegador descarta a linha do tempo.
- **Movimento reduzido.** `base.css` desliga toda transição e toda animação, menos a de quem tem `data-preso`: o que está parado por animação ligada à rolagem é o lugar do elemento, e não enfeite. Peça parada nova leva `data-preso`. Efeito novo precisa aparecer pronto com movimento reduzido, e as capturas já rodam assim.
- **Campo sem contorno de foco.** O campo e a lacuna tiram o contorno padrão e põem uma linha grossa com fundo no lugar. Quem tirar um contorno põe outro sinal: tem teste.
- **A foto inclinada e a rolagem lateral.** O recorte fica em `main` e no rodapé, com `overflow-x: clip`. No `body`, o recorte passa para a janela e deixa de valer.
- **A assinatura depende de medidas.** A largura de "MEMÓRIAS" em cada serifa é um número medido (`--assinatura-em`). Mudar o peso, o espaçamento ou os ajustes da serifa de capa pede medir de novo.
- **Fotos de exemplo no computador.** No servidor local as fotos e os retratos de exemplo aparecem quebrados, porque os arquivos estão no bucket de teste. Não é defeito da tela: confira as fotos na prévia da branch.
- **O monograma e a biblioteca de fontes.** `scripts/monograma.mjs` usa o `fontkitten` e o `sharp`, que vêm com o Astro e não estão no `package.json`. O `fontkitten` não aplica os eixos de uma fonte variável lida de um arquivo woff2, e o script contorna isso para a Fraunces. Se uma atualização do Astro tirar uma das duas, o script para de rodar; o desenho e os ícones estão versionados, então o site não depende dele.
- **Variável definida por código.** O teste que procura variável usada e nunca definida tem uma lista do que é posto por script ou por estilo (`--alt`, `--barra-alt`, `--encolhe-a`…). Variável nova desse tipo entra na lista.

## Referências

| Ref | O que levar |
| --- | --- |
| [Feminist](https://feminist.framer.website) | Calor geral, serifa macia nos títulos, pastéis em blocos sólidos com pontos saturados, retrato recortado em forma (arco, cápsula), etiqueta em forma de balão |
| [Mira](https://mirastudio.framer.website) | Nome escrito à mão sobre o retrato; formulário em forma de frase |
| [Vertical](https://vertical.framer.media) | Legenda em mono "lugar (ano)"; bloco de áudio com título, onde e quando foi gravado e duração |
| [Lurais](https://lurais.framer.website) | Disciplina: poucos pesos, hierarquia pelo tamanho, a foto fazendo o trabalho da cor |
| [Gobo](https://gobo.framer.media) | Página de trabalho como modelo da memória: título, frase de abertura, ficha em mono, citação, anterior e próximo |
| [Folira](https://folira-lite.framer.website) | Polaroid; linha do tempo com trilho e ponto marcando o que está em leitura, período em pílula |
| [Union](https://the-union-template.webflow.io) | Página do casamento como modelo da memória (coluna parada, blocos numerados); "Our story" e "The journey" para capítulo e laço; monte de fotos |
| Home do [bayara.design](https://bayara.design) | A frase que acende palavra por palavra acompanhando a rolagem (`src/redesign/motion.js` do repositório `bayara`) |

## Decisões

| Assunto | Decisão |
| --- | --- |
| Claro ou escuro | Claro como padrão. Sem fundo escuro: quando uma seção precisa se destacar, o fundo é colorido, nas cores das famílias |
| Títulos | Serifa macia, na linha de Recoleta ou DM Serif Display |
| Texto | Grotesca neutra, na linha de Geist ou Mona Sans |
| Legendas e fichas | Mono pequena, na linha de Geist Mono |
| Manuscrita | Só no nome de quem conta cada relato |
| Cor | Pastéis como cores principais, em blocos sólidos, como no Feminist. Cada cor tem uma versão saturada para pontos de contraste e destaques, que também pode ser usada inteira como opção. Vale para as cores, não para os neutros |
| Neutros | Neutro quente e aconchegante (decisão do Gui, 16/11/2026, depois de ver o primeiro conceito, que estava frio): papel creme e tinta de café, sem chegar ao preto puro. No conceito, `#faf2e6` e `#2b211a` |
| Foto revelada | Confirmado pelo Gui em 16/11/2026: toda foto-chave da linha do tempo é uma foto revelada. O formato lembra a Fujifilm Instax, que a Giovanna e o Magno usam muito, sem ser literal: retrato, cantos arredondados, margem de baixo larga |
| Linha do tempo | Lista vertical com a rolagem normal, das mais recentes para as mais antigas, sem efeito de folhear nem carrossel |
| Página da memória | Ordem abaixo, com o convite para escrever o relato no fim |
| Marca | "MEMÓRIAS" é a palavra principal e fixa. Abaixo dela vêm os sobrenomes das famílias do que está sendo visto, que mudam conforme a tela (ver "Assinatura do nome"). O símbolo é um monograma com o M de Memórias |
| Cores das famílias | Aprovadas pelo Gui em 16/11/2026. Cada família tem uma cor só, com variação de tons: Bayara é verde, a cor da Elizete; Bayara Bracarense é orquídea, o meio-termo entre o rosa da Giovanna e o roxo do Magno, sem favorecer um dos dois; Bracarense é azul; "Tudo", as famílias juntas, é manteiga. Os valores estão em `src/visual/tokens.css` |
| Ícones e ilustrações | Cabem, com limpeza e elegância, para trazer leveza e alegria (do Gui, 16/11/2026). O site continua tipográfico. No conceito: um ícone de traço para cada tipo de momento, rabiscos de caneta (sublinhado, seta, coração) e o envelope do laboratório no painel |
| Painel | É a parte que só a pessoa vê, e precisa ter cara própria, de espaço íntimo (do Gui, 16/11/2026). No conceito: a página inteira tingida na cor da família da pessoa, o conteúdo em cartões e o aviso "Só você vê esta página". Quem está em mais de uma família vê a cor da mais recente: a Giovanna e o Magno, a da família que criaram juntos (`familiaMaisRecente`, em `src/lib/familias.ts`) |
| Cores dos tipos de momento | Aprovadas pelo Gui em 16/11/2026, com espaço para mais cores: o conceito tem onze, uma para cada tipo de hoje (`corDoTipo`, em `src/lib/visual.ts`). A abertura da memória num bloco inteiro na cor do tipo também foi aprovada |
| "Família", e não "núcleo" | O site deixa de mostrar o termo "núcleo", que fica só para a lógica (decisão do Gui, 16/11/2026). Na tela, é "família" |

## Movimento

Regra: a rolagem é sempre a do aparelho, e nenhum efeito quebra um padrão de navegação conhecido. Efeito é bem-vindo, sem excesso.

Entram:

- o cartão que aparece com um esmaecer curto;
- a sanfona que abre empurrando o conteúdo;
- a foto que amplia ao toque e fecha ao tocar fora;
- o item da barra de décadas que acende;
- uma frase de abertura que acende palavra por palavra como na home do bayara.design: acompanha a rolagem natural, não prende a página e aparece pronta com movimento reduzido.

**Movimento que mostra o que mudou** (decisão do Gui, 16/11/2026). No Explorar, trocar filtro, família, ordem ou forma de ver nunca recarrega a página nem tira a pessoa do lugar. Os itens que continuam na tela se movem até o lugar novo, como fotos rearranjadas na mesa; os que saem somem onde estão e os que entram aparecem no lugar deles. Um esmaecer da tela inteira não serve. A rolagem fica presa ao que a pessoa estava olhando: o mesmo ano ou o mesmo item continua no mesmo ponto da tela, ou no ano mais próximo quando o dele saiu. O endereço acompanha sem recarregar, para o link continuar servindo, e voltar no navegador desfaz a troca do mesmo jeito. Sem script, tudo continua funcionando com o recarregamento de hoje. Com movimento reduzido, a troca é direta, sem deslocamento.

**O modo TV é o lugar de experimentar** (decisão do Gui, 16/11/2026). É a tela em que o movimento pode ousar mais, porque é para ver junto, parado, na sala: passagem entre memórias com mais caráter, a foto que se aproxima devagar enquanto a memória está na tela, o título e o trecho do relato chegando aos poucos. As regras de sempre continuam: a página não se mexe sozinha fora do "Passar sozinho", as setas e o controle sempre respondem na hora e, com movimento reduzido, tudo isso desliga.

Ficam de fora: cartão que deita ao rolar, foto que cresce enquanto se rola, carrossel lateral, anel 3D, imagem distorcida, tela de carregamento com porcentagem, faixa que corre sozinha e qualquer trecho que segura a página. Com movimento reduzido, nem o esmaecer.

O Safari do iPhone já deu trabalho com efeitos presos à rolagem no site da @bsurda (ver o `CLAUDE.md` daquele repositório, "Banda do Safari no iPhone"): nada de `sticky` ou `fixed` novo sem conferir no aparelho. Decisão do Gui de 16/11/2026: na linha do tempo, a barra de décadas continua parada no alto e o ano grande também fica, em qualquer aparelho, para quem rola saber sempre em que ano está (pensando nas pessoas mais velhas). Os dois precisam ser conferidos no iPhone.

## Componentes novos

As medidas abaixo vêm das referências e são ponto de partida: o desenho final sai da revisão.


| Componente | Onde | Detalhe |
| --- | --- | --- |
| Foto revelada | Foto-chave na linha do tempo e na abertura da memória | Moldura branca no formato da Instax mini: foto em retrato de 46 por 62, cantos arredondados e margem de baixo bem mais larga, com a legenda. Sombra suave e quente. Inclinação entre poucos valores (−3°, −1,5°, 1°, 2,5°), escolhida pelo id da memória para ficar sempre igual. Atrás, uma forma de cor (círculo, arco ou cápsula, também pelo id) na cor do tipo de momento. O banco não guarda a orientação da foto: enquanto não guardar, toda foto-chave é recortada em retrato |
| Monte de fotos | Memória com mais de uma foto | As outras fotos aparecem atrás da principal, levemente giradas. O monte já diz que há mais fotos |
| Legenda "lugar (ano)" | Polaroid, cartão de memória, fotos | Em mono, pequena |
| Etiqueta-balão | Tipo de momento | Pílula com um canto reto, na cor do tipo |
| Ficha em mono | Topo da memória, do capítulo e da pessoa | Rótulo pequeno em caixa alta e valor: quando, onde, tipo, capítulos, temas, núcleos |
| Retrato recortado | "Quem estava", página da pessoa | Foto de retrato do cadastro em arco ou cápsula (o envio da foto já existe: "Foto de retrato" em `docs/decisoes.md`). Quem não tem foto aparece com as iniciais sobre a cor da família |
| Nome manuscrito | Relato | O nome de quem conta, escrito à mão, junto de "registrado por" quando for o caso |
| Bloco de áudio | Relato | Botão de tocar, título, onde e quando foi gravado, duração, "Ler a transcrição" |
| Sanfona de fases | Página do laço | Ano grande, nome da fase, data pequena; abre uma de cada vez |
| Formulário em frase | Abertura da Nova memória | "Isso aconteceu em ___, em ___, com ___", sem mudar a ordem das etapas nem o que é obrigatório |

## Assinatura do nome

Decisões do Gui de 16/11/2026. Rascunho dele em `docs/visual/assinatura-hierarquia.png`.

- "MEMÓRIAS" é a palavra principal e não muda: em caixa alta, grande, na serifa dos títulos.
- Logo abaixo vêm os sobrenomes das famílias, em caixa alta e baixa, bem menores (no rascunho, perto de metade da altura de "MEMÓRIAS"), alinhados à esquerda.
- **Os sobrenomes acompanham o que está sendo visto.** Na linha do tempo geral ("Família completa"): "Bayara & Bracarense". Numa família só, o nome dela, como é: "Bayara", "Bracarense" e "Bayara Bracarense", sem "&" (decisão do Gui, 16/11/2026: o "&" junta famílias, então só aparece na família completa ou quando a tela é de mais de uma). Assim a assinatura cresce com o acervo: se um dia entrar outra família, por um casamento, a combinação aparece sozinha nas telas em que ela estiver.
- Para isso cada núcleo diz de quais famílias ele é (Bayara Bracarense = Bayara e Bracarense): a migração `018-sobrenomes-dos-nucleos` guarda a lista, e os administradores editam em `/admin/familias`. A linha junta os sobrenomes sem repetir, na ordem dos lados da árvore (Bayara à esquerda), com "&" antes do último e vírgula entre os outros ("Bayara, Bracarense & Silva"). Quem monta é `assinaturaDaTela`, em `src/lib/visual.ts`.
- **Linha longa.** A medida dos sobrenomes foi tirada para "Bayara & Bracarense" fechar na largura de "MEMÓRIAS". Uma linha mais longa, como a de três famílias, encolhe na proporção para caber (`encolheDaAssinatura`, com a largura das letras de cada serifa em `src/visual/medidas-das-serifas.ts`).
- Telas que não são de um núcleo (pessoa, memória, capítulo) usam as famílias do que mostram: os núcleos da memória ou do capítulo, as famílias da pessoa. Na dúvida, a versão de "Tudo".
- No texto corrido e na aba do navegador, o nome por extenso continua "Memórias Bayara e Bracarense".
- O rascunho mostra três pesos e larguras (normal, condensada, negrito) da mesma família: comparar na prévia, junto com a escolha da fonte.

## Monograma

Decisão do Gui de 16/11/2026: o monograma é o M de Memórias, que não muda, enquanto os sobrenomes mudam com a tela. Substitui os dois Bs ("uma haste"), que só valiam para duas famílias.

- Sai da serifa dos títulos, desenhado em SVG para funcionar pequeno.
- **Como é feito (fase 2).** `npm run monograma` (`scripts/monograma.mjs`) lê o M direto dos arquivos das três serifas e grava o desenho em `src/visual/monograma.ts` e os ícones em `public/icones/<a, b ou c>/`. O resultado fica versionado; só se roda de novo se uma serifa mudar. São dois cortes: o normal, que é o desenho de título, e o pequeno, mais firme, para 16 px (na Fraunces, o desenho ótico de texto com um peso acima; nas outras, que não têm eixos, um contorno fino por fora).
- **Ícone do site.** `favicon.svg` é o M sozinho, na cor do texto, e troca para a cor do papel quando o navegador está no tema escuro, para não sumir na aba. `favicon-48.png` é a reserva para navegador que não lê ícone em SVG, e `apple-touch-icon.png` (180 px) é o da tela inicial do celular: os dois levam o papel por baixo, porque o celular pede fundo cheio. O esqueleto aponta para a pasta da serifa em uso.
- **Uso:** ícone do site (favicon e ícone de tela inicial do celular) e, no celular, no lugar da assinatura quando falta espaço.
- **Cor:** uma cor só, no tom do texto: é o padrão, e vale para o ícone do site e para o topo. A cor da família fica para usos decorativos e momentos específicos (decisão do Gui, 16/11/2026, depois de ver os dois lado a lado em `/conceito/sistema`). Cada uso desses é mostrado a ele na tela em que aparecer.
- **Tamanho mínimo:** conferir a 16 px (favicon). Na página do sistema ele aparece em 16, 24, 32, 64 e 112 px.

## Página da memória

1. Abertura: título grande, trecho de um relato e a foto-chave como polaroid, com o monte de fotos atrás.
2. Ficha: parada à esquerda no computador, no alto no celular. Data, lugar, tipo, capítulos.
3. Quem estava, com os retratos e o parentesco do ponto de vista de quem olha ("sua avó").
4. Relatos, um por pessoa, com o nome manuscrito e o áudio.
5. Fotos em grade, que ampliam ao toque.
6. Fim: "Escrever meu relato" em destaque, depois "Antes" e "Depois".

Hoje a ação principal fica no alto (decisão do QA de UX). Mantenha um atalho pequeno no alto para quem chega querendo contar, e o convite grande no fim.

## Linha do tempo, capítulo e laço

- **Linha do tempo:** lista vertical, a barra de décadas parada no alto como já está, um trilho fino com um ponto marcando a memória em leitura (Folira). Cada memória com a polaroid da foto-chave e a legenda "lugar (ano)".
- **Capítulo e laço:** título, período e pessoas parados à esquerda no computador; à direita, os marcos numerados, com data e lugar em mono (Union, "Our story"). As fases do casal em sanfona (Union, "The journey").
- **Data aproximada e período:** em pílula, como no Folira ("2018-2020", "por volta de 1994").

## Todas as telas (fase 3), em andamento

Cada grupo de telas vai num PR para a `homologa`, numa branch `tst-visual-<grupo>` nascida da `homologa` atualizada. O Gui confere as capturas e a prévia de cada um antes do seguinte.

| Grupo | Telas | Situação |
| --- | --- | --- |
| 1. `explorar` | Explorar (linha do tempo, mural, modo TV, ao acaso) e a página da memória | Construído em 17/11/2026, na `tst-visual-explorar` (PR #35). O Gui viu e pediu dois ajustes, no mural e no "Passar sozinho", que já entraram |
| 2. `pessoal` | Painel, carta de Natal, sua conta e a página da pessoa | A fazer |
| 3. `familia` | Capítulo, tema, pessoas e árvore (a árvore muda só de aparência) | A fazer |
| 4. `formularios` | Nova memória, relato, cadastro guiado, laços, capítulo, administração, rascunhos e lixeira. Por fim, apagar `src/styles/global.css` | A fazer |

### Grupo 1: Explorar e a página da memória

**Endereços.** "Tudo" virou "Explorar", em `/explorar`. `/tudo` e os endereços antigos (`/?nucleo=...`) levam para lá com os mesmos filtros. As telas `/conceito/tudo` e `/conceito/memorias/<id>` saíram: viraram `/explorar` e `/memorias/<id>`, com os dados de verdade. O menu e a marca do topo de `Visual.astro` apontam para os endereços de verdade ("Início" em `/`, "Explorar" em `/explorar`), e o menu do visual antigo (`Base.astro`) também diz "Explorar".

**Onde está.** A página é `src/pages/explorar.astro`; as partes, em `src/components/explorar/`: `Controles.astro`, `Linha.astro` (a linha do tempo do conceito, com o script dela), `Mural.astro` e `Palco.astro` (modo TV e ao acaso). O CSS da linha do tempo continua em `telas/linha.css`; o do formulário dos filtros, do mural e do palco, em `telas/explorar.css`. As regras continuam em `src/lib/explorar.ts`, que ganhou as formas de ver (`lerForma`), o endereço (`enderecoDoExplorar`) e o resumo dos filtros (`resumoDosFiltros`), com teste.

**Os controles**, um embaixo do outro, cada um com nome e lugar fixo: **Forma de ver** (Linha do tempo, Mural de fotos, Modo TV, Me mostre uma memória), **Família** (como no conceito) e **Filtros**, que fechado diz o que está ligado e a ordem ("Viagem · com foto · Mais contadas") e aberto mostra, no mesmo lugar, um formulário só: ordem, tipo de momento, o que a memória tem (foto, áudio), seus relatos, período (década, ou de um ano a outro) e, recolhidos, quem estava junto, capítulo e tema. O botão é "Mostrar memórias". Tudo é link ou formulário comum: funciona sem script e fica no endereço. O filtro por tipo do conceito, que trocava a lista no navegador, saiu: o tipo agora é um dos filtros do formulário.

**Sem recarregar** (decisão do Gui, 17/11/2026: seremos só sete pessoas, e a fluidez na página vale mais do que o endereço para compartilhar; cada escolha recarregava tudo). Trocar de forma de ver entre a linha do tempo e o mural, de família, de tamanho das fotos, de filtros ou de ordem busca a página nova e troca só a região do Explorar (`data-explorar`), sem recarregar. O script está em `src/pages/explorar.astro`.

- O endereço continua acompanhando cada escolha, e o voltar e o avançar do aparelho andam entre elas.
- A cor da tela e a assinatura do rodapé trocam junto com a família. O foco fica na opção escolhida ou, depois de "Mostrar memórias", no controle dos filtros, e a conta das memórias é anunciada ao leitor de tela.
- A troca esmaece pela transição do navegador, só para quem não pediu menos movimento.
- A linha do tempo começa de novo a cada troca (`explorar:trocou`): o que escutava a janela e observava a linha anterior é desligado antes.
- Sem script, ou se a busca falhar, cada escolha continua sendo um link ou um formulário comum.
- O modo TV e o "ao acaso" têm o palco deles e continuam navegando de página em página, com a transição entre páginas do navegador.

**Linha do tempo.** A do conceito, sem mudança de desenho. Os trilhos, as épocas e a faixa de décadas só aparecem quando `mostraTrilhos` deixa. Em "Mais antigas primeiro", a página leva ao presente e o trilho acaba, embaixo, em "Fim do capítulo “Natais”" e "Fim da época “…”" (texto novo, para o Gui confirmar). Em "Entraram por último" e "Mais contadas", a lista é corrida, sem a divisória dos anos, e cada memória traz a data inteira.

**Mural** (decisões do Gui, 17/11/2026, em cinco rodadas). A primeira versão era só as fotos, sem texto. Na segunda, a pedido dele, as fotos ficaram agrupadas por ano, com o ano grande como cabeçalho e o título na margem; ao ver, ele achou que o mural tinha virado uma segunda linha do tempo: o ano é para facilitar, e o mural precisa orientar sem perder a cara de mural. A terceira, que vale:

- **Uma superfície só.** As fotos-chave como fotos reveladas, de ponta a ponta, cada uma com a inclinação dela e um pouco fora de fila, sem cabeçalho nem seção. No tamanho médio, duas colunas no celular (com três, o título à mão ficava pequeno demais para ler), seis no computador e oito na tela grande.
- **A década é um cartão no meio das fotos.** Ocupa o lugar de uma foto, na cor da família, com "Anos" e o número grande em serifa ("90", "2010") e a conta das memórias da década. A fila de fotos continua na mesma linha depois dele. Um cartão por ano foi descartado: o acervo de exemplo tem 46 memórias em cerca de 30 anos, e seriam quase tantos cartões quanto fotos.
- **O ano é uma aba na primeira foto de cada ano**, como a de um fichário, saindo do alto da foto. Não ocupa lugar e não interrompe a fila.
- **O título na margem.** Só o título da memória, pequeno, na letra manuscrita, em até duas linhas. Vale também para a memória sem foto, que entra como cartão na cor do tipo. É o segundo uso da manuscrita, que até aqui só assinava os relatos.
- **O verso, no computador** (quinta rodada). É um agrado, e não o lugar da informação. Ao passar o mouse, a foto endireita e sobe um pouco e o verso dela abre em leque por trás, girando pelo canto de baixo, como duas fotos seguradas por ali: um cartão do mesmo tamanho da foto, de que aparece a quina de cima, com a data escrita em mono (o dia e o mês numa linha, o ano na outra). Sem carimbo, sem lugar e sem quem estava: no canto que aparece só cabe a data. Perto da borda direita da tela, o leque abre para a esquerda. O foco do teclado faz o mesmo, e com movimento reduzido o verso aparece sem girar. No toque ele não aparece: o título na margem basta. O que veio antes e não ficou: uma ficha pequena deslizando de trás da foto (não funcionou) e o verso inteiro ao lado, em dupla, com carimbo (ficou lado a lado demais). Virar a foto foi pensado e descartado: esconde a foto no momento em que a pessoa aponta para ela e faz várias virarem em sequência quando o mouse passa pela grade.
- **O tamanho das fotos** (decisão do Gui, 17/11/2026). No mural, o controle "Fotos" deixa escolher a densidade: Pequenas, Médias (o padrão) ou Grandes. Fica no endereço (`tamanho`), como os filtros, e acompanha a troca de família e o formulário. Colunas no celular, no computador e na tela grande: 3, 8 e 10 nas pequenas; 2, 6 e 8 nas médias; 1, 4 e 5 nas grandes. Nas pequenas do celular o título não cabe na margem e fica só a foto.
- **Fora da ordem do tempo** ("Entraram por último" e "Mais contadas"), saem os cartões de década e as abas de ano, como os trilhos na linha do tempo, e a data fica só no verso.

**Modo TV.** Uma memória por página, na tela inteira, sem o topo e o rodapé do site: a cor do tipo de momento no fundo, a foto inteira com margem de ampliação, o carimbo, o título, um trecho do relato assinado à mão e quem estava. "Anterior" e "Próxima" são links, com o foco já em "Próxima" (no controle da TV, o botão do meio passa); as setas do teclado passam, o Esc sai e tocar na foto passa para a seguinte. A troca esmaece pela transição entre páginas do navegador, só para quem não pediu menos movimento: com movimento reduzido, a troca é sem animação. A memória da vez vai no endereço (`m`).

**Passar sozinho** (decisão do Gui, 17/11/2026). Quem está vendo escolhe o tempo de cada memória, entre 8, 10 e 15 segundos (`TEMPOS_DE_PASSAR`, em `src/lib/explorar.ts`), e pode pausar e retomar a qualquer momento.

- O grupo "Passar sozinho" fica abaixo de "Anterior" e "Próxima", com os três tempos. Escolher um liga; o tempo em uso fica marcado. Ligado, aparecem "Pausar" (que vira "Retomar") e "Parar de passar sozinho".
- A escolha fica no endereço, como os filtros: `passar` leva os segundos e `pausa=1`, a pausa. Tempo fora da lista vale 10, o padrão. O estado segue de uma memória para a outra: quem pausou e passa à mão continua pausado.
- Pausar não recarrega a página; retomar conta o tempo de novo, inteiro. Com a aba escondida, espera. Ligado, a última memória volta à primeira.
- Só existe com script: sem ele, o grupo nem aparece, e "Anterior" e "Próxima" continuam funcionando.

**Ao acaso.** "Me mostre uma memória" sorteia entre as que passam nos filtros e leva ao endereço da sorteada, no mesmo palco, com o topo do site. "Me mostre outra" sorteia de novo, sem repetir a que estava na tela.

O mural, o modo TV e o sorteio não mostram rascunho: o rascunho só aparece na linha do tempo de quem escreveu.

**Página da memória.** A do conceito, com os dados de verdade. Saiu o que era fixo: as fotos "que vieram com o relato" só voltam quando "Fotos pelo relato" existir no banco (o desenho continua em `.bilhete__fotos`, em `telas/memoria.css`). Os links de histórico, relato, corrigir e excluir levam às telas antigas, que são do grupo 4.

**Sua conta, de passagem.** `/conta` é a página de passagem que estava em `/conceito/conta`, agora em todos os ambientes, para o retrato do topo ter aonde levar: sua página, editar seus dados, rascunhos, lixeira e, para os administradores, tipos de momento, famílias, carta de Natal, a cópia do acervo e, na homologação, o espelho. A tela de verdade é do grupo 2.

**Decidido pelo Gui em 17/11/2026, ao ver o PR #35:** ficam o endereço `/explorar`, o nome "Forma de ver" e os textos do formulário ("O que a memória tem", "Seus relatos", "Você já contou", "Você estava e ainda não contou", "Quem estava junto", "Mostrar memórias", "Limpar filtros", "Nenhuma memória passa nesses filtros."), do palco ("Sair do modo TV", "Passar sozinho", "Parar de passar sozinho", "Abrir esta memória", "Uma memória ao acaso", "Me mostre outra", "Voltar ao Explorar") e do pé do trilho ("Fim do capítulo" e "Fim da época", na ordem das mais antigas). Mudaram o mural e o "Passar sozinho", como descrito acima.

**Para o Gui ver na prévia:** os textos "8 segundos", "10 segundos" e "15 segundos", "Pausar" e "Retomar"; no mural, as duas colunas no celular, o cartão da década ("Anos 90", "Anos 2010"), a aba do ano, o verso em leque e o controle "Fotos" ("Pequenas", "Médias", "Grandes"), que ele já viu funcionando. A aba do ano precisa ser conferida com as pessoas mais velhas: se passar batida, a saída é o ano na margem de toda foto.

**Capturas.** `CAPTURAS_SO=^explorar npm run capturas -- tirar <pasta>`. As deste grupo estão em `docs/visual/fase-3/explorar/`.

### O que falta, para a sessão seguinte

- **Grupos 2, 3 e 4**, na ordem da tabela, cada um numa branch nova nascida da `homologa` depois do merge do anterior.
- **A página do sistema** (seção abaixo): muda para `/sistema` no grupo em que o painel do conceito sair, que é o 2, junto com a seção "Administração" da conta, com o teste em `testes/sistema.test.ts` (toda peça do sistema aparece na página) e a verificação em `scripts/confere-producao.mjs` (a página não usa fotos de exemplo fora das prévias). Neste grupo ela não foi tocada. As peças novas daqui (os controles, o mural e o palco) são das telas, e não do sistema.
- **O que ainda está em `/conceito`:** o painel e a carta (`/conceito`), as fontes (`/conceito/sobre`) e o sistema. O painel sai no grupo 2; as fontes ficam até a escolha.
- **"Família" no lugar de "núcleo":** feito na página da memória ("Famílias" na ficha). Falta nas telas dos grupos 3 e 4.
- **Camadas do CSS (`@layer`):** reavaliar no grupo 4, quando o `global.css` sair.
- **No iPhone:** o modo TV e o mural não têm nada parado no alto. A linha do tempo continua com o modelo já conferido.

## A página do sistema fica (decisão do Gui, 16/11/2026)

`/conceito/sistema` é a referência do projeto para o Gui e continua existindo depois da revisão visual, em todos os ambientes, inclusive no site de verdade, para estar sempre à mão.

- Quando a fase 3 apagar as telas do conceito, ela muda para `/sistema`.
- Na produção e na homologação, só os administradores abrem (para os outros, 404), com um link na seção "Administração" da conta. Nas prévias e no computador, abre para todos, como hoje.
- Ela mostra o sistema com conteúdo fixo da própria página, nunca com dados do acervo. Na produção, nada de fotos de exemplo: a guarda já recusa que elas cheguem ao pacote ou ao bucket da produção. Onde a peça pede foto, a página usa um quadro desenhado (cor e textura da própria página) e, nas prévias, pode continuar usando o Chico e a Karol.
- Ela acompanha o sistema: toda peça, token ou regra nova entra nela no mesmo PR, e `testes/sistema.test.ts` falha se uma peça do sistema não aparecer na página.
