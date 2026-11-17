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
| Pessoa numa linha de lista | `Gente.astro` | Nova, do grupo 2 da fase 3. O Gui ainda não viu |
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
| Zona de perigo | `ZonaDePerigo.astro` (classe `perigo`) | Nova, pedida pelo Gui em 17/11/2026: as ações de apagar juntas no fim das telas de editar, marcadas na cor de alerta |

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
| Uma pessoa numa lista de laços | `Gente.astro` | `href`, `nome`, `foto`, `familia`, `laco` ("sua avó") e `detalhe`, em mono |
| Um relato | `Bilhete.astro` | `por`, `registradoPor` (só quando não foi a própria pessoa) e o conteúdo dentro: `Audio`, depois `<div class="bilhete__texto">`. Com `href`, o bilhete inteiro vira link |
| Um áudio | `Audio.astro` | `rotulo`, `src`, `transcricao` |
| O capítulo de uma memória | `SinalDoCapitulo.astro` | `id`, `titulo` e `cor` (a posição dada pela montagem, `src/lib/linha-capitulos.ts`) |
| Fases de um casal ou marcos que abrem | `Sanfona.astro` | `ano`, `titulo`, `quando`, o conteúdo dentro. O mesmo `grupo` em todas faz só uma ficar aberta |
| Recado de "salvou" ou de erro | `Recado.astro` | `<Recado>` ou `<Recado erro>` |
| Tela sem nada para mostrar | `Vazio.astro` | `<Vazio frase="…">` com a ação dentro |
| As ações de apagar de uma tela de editar | `ZonaDePerigo.astro` | `<ZonaDePerigo>` no fim da página, fora do formulário que salva, com uma frase e o link para a confirmação. `menor nivel={4}` dentro de um cartão, como o editor de um laço. Quem usa decide se ela aparece, pela permissão de sempre |
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
| Cores dos tipos de momento | Aprovadas pelo Gui em 16/11/2026, com espaço para mais cores: o conceito tem onze, uma para cada tipo de hoje (`corDoTipo`, em `src/lib/visual.ts`). A abertura da memória num bloco inteiro na cor do tipo também foi aprovada Desde 17/11/2026, a cor de cada tipo é escolhida pelos administradores numa paleta de 23 cores, as onze e mais doze, e o ícone, entre 30 rabiscos (ver "Tipos: paleta e ícones") |
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

Respostas do Gui ao QA de design de 17/11/2026 (regras em `src/lib/memoria.ts`, com teste em `testes/qa-respostas-memoria.test.ts`):

- **Quem estava, no celular:** até seis retratos e "Ver todos os 9", que abre o resto no lugar. A partir de 40rem, todos à vista. Sem script, a lista vem inteira.
- **Relato que já está inteiro na abertura:** com um só relato, sem áudio, contado pela própria pessoa e que coube inteiro no trecho, a seção "Relato" não repete o bilhete.
- **Memória sem foto:** a partir de 62rem, o cartão do tipo de momento fica à direita, no lugar da foto. No celular a abertura continua só com o texto.
- **Quem já contou:** no lugar do convite, uma linha quieta, "Você já contou esse dia." e "Editar meu relato" como ação de texto. O convite com o botão cheio é só de quem ainda não contou.
- **Galeria:** tocar ou clicar no fundo também fecha.

## Linha do tempo, capítulo e laço

- **Linha do tempo:** lista vertical, a barra de décadas parada no alto como já está, um trilho fino com um ponto marcando a memória em leitura (Folira). Cada memória com a polaroid da foto-chave e a legenda "lugar (ano)".
- **Capítulo e laço:** título, período e pessoas parados à esquerda no computador; à direita, os marcos numerados, com data e lugar em mono (Union, "Our story"). As fases do casal em sanfona (Union, "The journey").
- **Data aproximada e período:** em pílula, como no Folira ("2018-2020", "por volta de 1994").

## Todas as telas (fase 3), em andamento

Cada grupo de telas vai num PR para a `homologa`, numa branch `tst-visual-<grupo>`. **As branches são empilhadas** (decisão do Gui, 17/11/2026, para os grupos 2 a 4 andarem sem esperar a aprovação do anterior): `tst-visual-pessoal` nasce da `tst-visual-explorar`, `tst-visual-familia` nasce da `tst-visual-pessoal`, e assim por diante. Cada PR diz no alto de qual depende, e o merge segue a ordem dos grupos. Quando um PR de baixo muda, as branches de cima trazem a mudança com um merge, sem refazer a história.

| Grupo | Telas | Situação |
| --- | --- | --- |
| 1. `explorar` | Explorar (linha do tempo, mural, modo TV, ao acaso) e a página da memória | Construído em 17/11/2026, na `tst-visual-explorar` (PR #35, aberto). O Gui viu várias rodadas e ainda quer ajustar: ver "Estado do grupo 1", logo abaixo |
| 2. `pessoal` | Painel, carta de Natal, sua conta, a página da pessoa e `/sistema` | Construído em 17/11/2026, na `tst-visual-pessoal`, em cima do grupo 1. PR aberto, sem merge, com perguntas para o Gui: ver "Grupo 2: pessoal" |
| 3. `familia` | Capítulos, capítulo, tema, pessoas e árvore (a árvore muda só de aparência) | Construído em 17/11/2026, na `tst-visual-familia`, em cima do grupo 2. PR aberto, sem merge, com perguntas para o Gui: ver "Grupo 3: familia" |
| 4. `formularios` | Nova memória, relato, capítulo, nova pessoa, cadastro guiado, laços, histórico, excluir, rascunhos, lixeira e administração. Por fim, a saída de `src/styles/global.css` | Construído em 17/11/2026, na `tst-visual-formularios`, em cima do grupo 3, em duas metades. PR #38 aberto, sem merge, com perguntas para o Gui. O estilo antigo saiu: ver "Grupo 4", abaixo |

### Estado do grupo 1, para a próxima sessão seguir sem a conversa

Escrito em 17/11/2026, no fim da sessão que construiu o grupo. A branch é a `tst-visual-explorar`, o PR é o #35 para a `homologa`, **aberto e sem merge**: o Gui respondeu que ainda quer ajustar o grupo 1. A próxima sessão continua na mesma branch (trazendo a `homologa` antes) e não abre o grupo 2 enquanto ele não disser. O detalhe de cada decisão está em "Grupo 1", abaixo; aqui fica o resumo e o que não está escrito em outro lugar.

**O que está pronto e o Gui já viu funcionando**

- Explorar em `/explorar`, com as quatro formas de ver, e a página da memória no visual novo.
- Os controles: "Forma de ver", "Família" (etiquetas na cor de cada família, mais de uma escolha, marcar todas volta à família completa), "Filtros" (cada escolha vale na hora) e, no mural, "Fotos" (pequenas, médias, grandes).
- A troca sem recarregar com o movimento por item, a rolagem presa e o voltar do navegador.
- O mural: superfície contínua, cartão da década, aba do ano, título à mão na margem e o verso em leque no computador.
- O modo TV sem recarregar, com a foto revelada e as outras fotos em volta, "Passar sozinho", "Ajustes", as três animações, "Só as fotos" e "Tela cheia".

**O que mudou desde que o PR foi aberto** (cada linha foi um pedido do Gui ao ver a prévia)

| Assunto | Como era no primeiro push | Como está |
| --- | --- | --- |
| Mural | Só as fotos, sem texto | Superfície contínua com cartão de década, aba de ano, título à mão, verso em leque e tamanho das fotos. Passou por cinco rodadas |
| Troca de filtro, família, ordem e forma de ver | Recarregava a página | Troca só a região do Explorar, com cada item indo ao lugar novo (FLIP), sem mexer na rolagem |
| Filtros | Formulário com o botão "Mostrar memórias" | Cada escolha vale na hora e o painel continua aberto. O botão ficou só para quem está sem script |
| Família | Uma só, em links | Mais de uma, em etiquetas na cor de cada família |
| Modo TV | Uma página por memória, uma foto sem corte, um fade entre páginas | Sem recarregar, foto revelada com até quatro outras em volta, três animações, controles numa linha e o resto em "Ajustes" |
| "Passar sozinho" | 10 segundos fixos | 8, 10 ou 15 segundos, com pausa |
| Endereço | Tudo no endereço | Só o que traz de volta ao mesmo lugar; preferências no aparelho |

**O que o Gui ainda tem para escolher ou conferir**

- **A animação do modo TV.** As três ficam para as pessoas escolherem em "Ajustes" (ele decidiu não fechar numa só). O que ele ainda não disse: qual é a de quem nunca escolheu (hoje a Álbum, `MOVIMENTO_PADRAO`) e se os nomes "Álbum", "Revelação" e "Mesa" ficam. Na Álbum ele aprovou a direção e pediu que todas as fotos venham e saiam pela lateral; a correção das fotos que saíam repetindo a chegada ele ainda não viu.
- **"Só as fotos" e "Tela cheia"**: ele viu e achou o defeito do caminho de volta, corrigido em 17/11/2026. Falta conferir a correção numa TV com controle e no iPhone.
- **As etiquetas da família**: ele escolheu o formato, mas não viu o resultado.
- **A aba do ano no mural** precisa ser vista por alguém mais velho. Se passar batida, a saída combinada é o ano na margem de toda foto.
- **No celular, o mural pequeno fica sem o título** na margem (não cabe). Ele não comentou.
- **Em 1280 × 720, "Ajustes" fica no pé da tela** e, aberto, pede rolagem.
- **No iPhone de verdade, nada deste grupo foi conferido**: a troca com movimento, a rolagem devolvida, o voltar pelo gesto, o modo TV e a linha do tempo depois de uma troca (a faixa de décadas e o ano parados).
- **Numa TV de verdade, com controle**, também não.

**O que ficou por fazer**

- **As capturas estáticas** de `docs/visual/fase-3/explorar/` estão desatualizadas para o modo TV, a família e o mural. Refazer com `CAPTURAS_SO=^explorar npm run capturas -- tirar <pasta>` e converter para JPEG (as PNG do grupo inteiro somam 36 MB; em JPEG, 8 MB). As capturas com o mouse em cima de uma foto e no meio de uma animação não saem do script: foram tiradas à parte, com o Playwright.
- **A lista de `scripts/capturas.mjs`** ainda não tem "Só as fotos", as três animações nem a família com duas marcadas.
- **O item "Explorar" e o "Capítulos na linha do tempo"** continuam em "Decidido, a construir", em `docs/decisoes.md`, com o andamento. Saem de lá quando o Gui aprovar o grupo.
- **A página do sistema** muda para `/sistema` no grupo 2 (ver "O que falta, para a sessão seguinte").
- **`testes/visual.test.ts`** ainda tem o `describe('conceito')` guardando os testes das telas novas. Vale separar quando o conceito sair.

**Como está montada a troca sem recarregar**

- **Onde:** `src/lib/cliente/explorar-troca.ts`, ligado por `ligarTroca()` no script de `src/pages/explorar.astro`. A região que troca é o `<div data-explorar>`, que envolve a linha do tempo ou o mural, com os controles dentro.
- **O caminho de uma troca** (`trocar`): busca a página do endereço novo, tira dela o `[data-explorar]`, mede o que está perto da tela, troca o nó inteiro, devolve a rolagem, avisa (`explorar:trocou`) e anima a diferença. Qualquer erro cai em `location.assign`, a navegação comum.
- **Identidade:** `data-chave` em cada item (`m:<id>`, `a:<ano>`, `d:<década>`) e `data-ano`, que serve para achar o ano mais próximo. Item novo que precise se mover leva os dois.
- **Rolagem, duas regras.** Quem usou um controle fica com ele no mesmo ponto da tela (o seletor `foco`, que precisa valer na região antiga e na nova: por isso cada opção tem `data-opcao`). Sem controle, que é o voltar e o avançar, vale a primeira memória abaixo de 110 px do alto.
- **O que continua aberto:** os `<details>` dos controles são copiados por posição da região antiga para a nova. Mudar a ordem deles entre uma página e outra quebra isso.
- **Quem sai** é o próprio nó antigo, posto de volta dentro de `.mural` ou `.linha` com `position: absolute`, no fim da lista, para não mexer no `nth-child` dos outros.
- **A foto já carregada** é levada do item antigo para o novo (`manterFotos`), para não piscar.
- **Histórico:** `pushState` a cada troca e `scrollRestoration = 'manual'` antes e depois dele, senão o navegador devolve a rolagem por conta própria ao voltar e briga com a nossa. Ao sair da página (`pagehide`) volta a `'auto'`.
- **Scripts depois da troca.** O HTML que chega pelo `DOMParser` não roda `<script>`. O script da linha do tempo virou uma função `iniciar`, chamada de novo em `explorar:trocou`, com um `AbortController` que desliga o que escutava a janela. O do mural escuta o documento. Script novo dentro da região segue um dos dois modelos.
- **O tamanho das fotos** não busca nada: troca o `data-tamanho` do mural no lugar, com o mesmo medir e animar, e guarda no aparelho.
- **O modo TV tem a troca dele**, no script de `src/components/explorar/Palco.astro`: busca de antemão a página da memória de antes e a de depois, troca o `[data-palco]` inteiro com as fotos já abertas e usa `replaceState`, para o voltar sair do modo TV de uma vez. O estado de "passando sozinho" e da pausa viaja nos endereços dos links da página buscada, e não no endereço da barra.

**Cuidados que custaram tempo neste grupo**

- **A animação começava antes da foto.** Animação em CSS começa quando o elemento entra na página, e a foto ainda não tinha chegado: o Gui via um quadrado pequeno crescendo e nenhum movimento. No modo TV a animação só roda com `data-pronta`, que o script põe depois de abrir todas as fotos (`decode()`), e cada `<img>` que chega é trocado pela `Image` já aberta. Qualquer animação nova de chegada segue isso.
- **Nó reaproveitado repete a animação de chegada.** Pôr um nó antigo de volta na página reinicia as animações em CSS dele. Foi o que fez "voar fotos que nunca paravam" na Álbum. O que sai leva `animation: none !important`.
- **O painel dos filtros fechando mudava a rolagem.** A página buscada vem com o painel fechado; sem copiar o estado dos `<details>`, tudo o que estava abaixo subia.
- **O mesmo endereço em dois controles.** Com o foco achado só pelo `href`, clicar numa família punha o foco em "Linha do tempo", que tinha o mesmo endereço. O foco é achado pelo controle (`aria-labelledby`) e pela opção (`data-opcao`).
- **A guarda da produção lê os arquivos versionados.** Depois de apagar ou mover arquivo, `npm run build` falha com `ENOENT` até um `git add -A`.
- **As fotos de exemplo no servidor local** precisam ser enviadas uma vez por banco local: `NO_PROXY=localhost node scripts/enviar-fotos-de-exemplo.mjs http://localhost:4321`. Sem isso, todas as fotos saem quebradas nas capturas.
- **Regex de teste com `[^>]*`** para em qualquer `>` de dentro de uma expressão, como `m.fotos.length > 0`. Nos componentes, evite `>` dentro dos atributos que um teste lê.
- **`@view-transition`** só pode aparecer uma vez, dentro de `prefers-reduced-motion: no-preference`: tem teste. Ele hoje só serve para entrar e sair do modo TV.
- **O `.miolo` é só `padding-inline`.** Uma regra de tela que zere o `padding-inline` de um elemento com `miolo` tira a margem da página.
- **`tsc --noEmit` e `astro check` travam** nas sessões (passaram de cinco minutos e derrubaram o servidor local). Não deu para anotar a contagem de erros de tipo.
- **Vídeo das trocas:** o Playwright grava com `recordVideo` no contexto. As capturas do script rodam com movimento reduzido, então animação só se confere em contexto sem `reducedMotion`. Os vídeos não entram no repositório.
- **O servidor local cai** depois de um `npm run build` longo ou entre uma conversa e outra: confira com um `curl` antes de cada rodada de capturas.

### Grupo 1: Explorar e a página da memória

**Endereços.** "Tudo" virou "Explorar", em `/explorar`. `/tudo` e os endereços antigos (`/?nucleo=...`) levam para lá com os mesmos filtros. As telas `/conceito/tudo` e `/conceito/memorias/<id>` saíram: viraram `/explorar` e `/memorias/<id>`, com os dados de verdade. O menu e a marca do topo de `Visual.astro` apontam para os endereços de verdade ("Início" em `/`, "Explorar" em `/explorar`), e o menu do visual antigo (`Base.astro`) também diz "Explorar".

**Onde está.** A página é `src/pages/explorar.astro`; as partes, em `src/components/explorar/`: `Controles.astro`, `Linha.astro` (a linha do tempo do conceito, com o script dela), `Mural.astro` e `Palco.astro` (modo TV e ao acaso). O CSS da linha do tempo continua em `telas/linha.css`; o do formulário dos filtros, do mural e do palco, em `telas/explorar.css`. As regras continuam em `src/lib/explorar.ts`, que ganhou as formas de ver (`lerForma`), o endereço (`enderecoDoExplorar`) e o resumo dos filtros (`resumoDosFiltros`), com teste.

**Os controles**, um embaixo do outro, cada um com nome e lugar fixo: **Forma de ver** (Linha do tempo, Mural de fotos, Modo TV, Me mostre uma memória), **Família** (como no conceito) e **Filtros**, que fechado diz o que está ligado e a ordem ("Viagem · com foto · Mais contadas") e aberto mostra, no mesmo lugar, um formulário só: ordem, tipo de momento, o que a memória tem (foto, áudio), seus relatos, período (década, ou de um ano a outro) e, recolhidos, quem estava junto, capítulo e tema. O botão é "Mostrar memórias". Tudo é link ou formulário comum: funciona sem script e fica no endereço. O filtro por tipo do conceito, que trocava a lista no navegador, saiu: o tipo agora é um dos filtros do formulário.

**Sem recarregar, com o movimento que mostra o que mudou** (regra em "Movimento que mostra o que mudou", acima). A primeira versão trocava a região inteira com um esmaecer, e a rolagem mudava de lugar; o Gui pediu para refazer. Como ficou, em `src/lib/cliente/explorar-troca.ts`:

- **Cada item tem identidade** (`data-chave`): `m:<id>` para a memória, no mural e na linha do tempo; `a:<ano>` para o ano da linha do tempo; `d:<década>` para o cartão do mural.
- **A técnica é FLIP**, com a Web Animations API: mede antes, troca, mede depois e anima a diferença. Foi a escolha no lugar das View Transitions com um nome por memória porque funciona em todo Safari do iPhone, anima só o que está perto da tela e deixa cada item seguir o próprio caminho.
- **Quem continua** vai do lugar antigo ao novo (460 ms). Quando o tamanho das fotos muda, vai também ao tamanho novo. Quando a forma de ver muda entre mural e linha do tempo, quem viaja é a foto de cada memória, e o resto do item aparece em volta dela.
- **Quem entra** aparece no lugar dele (260 ms). **Quem sai** some onde estava (200 ms): o item antigo é posto de volta por um instante, por cima, no mesmo ponto da tela.
- **A foto já carregada continua a mesma** na página nova, para não piscar durante o movimento.
- **A rolagem nunca muda por causa de um filtro** (correção do Gui, 17/11/2026). Quem usou um controle fica com ele no mesmo ponto da tela depois da troca, e os filtros continuam abertos. Cada escolha do formulário vale na hora, sem botão: com script, "Mostrar memórias" some (ele é de quem está sem script). Sem controle, que é o caso do voltar e do avançar do navegador, a rolagem fica presa à primeira memória abaixo do que está parado no alto: ela volta ao mesmo ponto da tela e, se saiu, vale a do ano mais próximo (`anoMaisProximo`, em `src/lib/explorar.ts`; no empate, o ano mais antigo).
- **O endereço** muda com `history`, e voltar e avançar no navegador desfazem e refazem a troca com o mesmo movimento e a mesma rolagem. Para isso a rolagem dessas entradas do histórico é do site (`scrollRestoration`), e volta a ser do navegador ao sair para outra página.
- **Com movimento reduzido**, a troca é direta: nada se desloca, e só a rolagem é devolvida. **Sem script**, ou se a busca falhar, cada escolha continua sendo um link ou um formulário comum, com o recarregamento de sempre.
- A cor da tela e a assinatura do rodapé trocam junto com a família. O foco fica na opção escolhida ou, depois de "Mostrar memórias", no controle dos filtros, e a conta das memórias é anunciada ao leitor de tela. A linha do tempo começa de novo a cada troca (`explorar:trocou`), desligando antes o que escutava a janela.
- O modo TV também passa sem recarregar, com a troca dele (abaixo). Entrar e sair do modo TV e o "ao acaso" continuam sendo navegação comum.
- **Um limite para o Gui saber:** no meio da página os controles ficam lá em cima, fora da tela, porque nada fica preso no alto além da faixa de décadas e do ano. Ali, a troca que acontece na prática é a do voltar e do avançar. Trazer os controles para perto (um botão "Filtros" parado no alto, por exemplo) é uma peça presa nova, que pede decisão e conferência no iPhone.

**Família com mais de uma escolha** (decisão do Gui, 16/11/2026). No controle "Família", cada opção é uma etiqueta com o ponto na cor da família, que acende inteira no pastel dela quando está marcada (escolha do Gui em 17/11/2026, entre caixas de marcar, etiquetas e levar a família para dentro de "Filtros": com a escolha múltipla, os links sublinhados deixaram de servir). Cada toque liga ou desliga só aquela família (`alternarFamilia`), "Família completa" desliga todas, e marcar todas volta sozinho à família completa. Com duas marcadas entram as memórias de qualquer uma delas, sempre só o que a pessoa vê, e a assinatura do topo e do rodapé junta os sobrenomes ("Bayara & Bracarense").

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

**O palco do modo TV** (decisões do Gui, 17/11/2026, depois de ver a primeira versão, com uma foto só e sem corte: a TV é superfície grande).

- **A foto é uma foto revelada**, como no resto do site, grande, com o lugar e o ano na margem.
- **As outras fotos da memória** ficam em volta da principal, até quatro, menores e um pouco tortas, cada uma com a legenda dela. No celular elas ficam atrás, aparecendo pelas bordas. A primeira versão mostrava só a foto-chave por escolha de desenho, uma memória e uma foto por tela, e não por desempenho.
- **Os controles numa linha só:** "Anterior", "Próxima" e "Passar sozinho", que depois de ligado vira "Pausar" e "Retomar" no mesmo lugar. O tempo (8, 10 ou 15 segundos), "Parar de passar sozinho" e a animação moram em "Ajustes", que abre no lugar. A versão anterior punha tudo isso escrito na tela.

**A animação do modo TV, três para quem está vendo escolher** (regra em "O modo TV é o lugar de experimentar", acima; decisão do Gui, 17/11/2026: a escolha fica com as pessoas, em "Ajustes", sem fechar numa só). No endereço, `mov=a`, `mov=b` ou `mov=c`; sem ele, vale a primeira. As regras estão em `telas/explorar.css` e a lista em `MOVIMENTOS`, em `src/lib/explorar.ts`.

| | Passagem | As outras fotos | Título e trecho |
| --- | --- | --- | --- |
| Álbum | A foto vem da lateral, girando um pouco, e as que estavam na tela saem pelo outro lado, como fotos sendo empurradas; ao voltar, o sentido inverte | Fazem o mesmo movimento da principal, logo atrás dela (decisão do Gui, 17/11/2026) | Sobem linha a linha |
| Revelação | A foto aparece clara e sem cor e vai se revelando, em três segundos e meio | Revelam-se depois, uma a uma | Surgem depois das fotos, sem deslocamento |
| Mesa | A foto é jogada na mesa, de perto e torta, e assenta | Caem em volta, uma a uma | Entram juntos, logo depois |

Nas três, o fundo passa de uma cor à outra e as fotos se aproximam devagar enquanto a memória está na tela. **A animação só começa com as fotos prontas** (`data-pronta`): na primeira versão ela começava ao carregar a página e acabava antes de a foto chegar, e a foto aparecia como um quadrado pequeno que crescia. Agora cada foto do palco que chega é trocada pela foto já aberta, do tamanho certo desde o primeiro desenho. Trocar de animação em "Ajustes" mostra a chegada de novo, para a pessoa ver o que escolheu. Com movimento reduzido, nada disso roda.

**O que fica no endereço** (decisão do Gui, 17/11/2026: seremos poucos e ninguém vai mandar link de mural ou de linha do tempo; no endereço fica só o que traz a pessoa de volta ao mesmo lugar depois de abrir uma memória e voltar).

| O quê | Onde fica |
| --- | --- |
| Forma de ver, família, filtros e ordem | No endereço |
| A memória da vez no modo TV (`m`) | No endereço |
| Tamanho das fotos do mural | No aparelho (`mural-tamanho`) |
| Animação do modo TV e o tempo do "Passar sozinho" | No aparelho (`tv-animacao`, `tv-tempo`) |
| "Só as fotos", no modo TV | No aparelho (`tv-so-fotos`) |
| Se está passando sozinho, a pausa e a tela cheia | Só enquanto o modo TV está aberto |

Sem script, os links continuam levando tudo no endereço (`tamanho`, `passar`, `mov`), e o servidor continua aceitando.

**Só as fotos e tela cheia** (pedido do Gui, 17/11/2026). Em "Ajustes", "Só as fotos" esconde o título, o trecho e os dados e deixa as fotos no meio da tela, maiores; "Mostrar o texto" desfaz (ver "O caminho de volta de Só as fotos", abaixo). "Tela cheia" usa a do navegador e continua valendo de uma memória para a outra, porque a página não recarrega; onde o navegador não tem tela cheia, como no iPhone, o botão não aparece.

**O caminho de volta de "Só as fotos"** (defeito achado pelo Gui, 17/11/2026: depois de "Só as fotos" não havia como voltar o texto nem chegar aos ajustes; em 1280 × 720, "Ajustes" voltava fechado e abaixo da dobra). Como ficou:

- **A tela não rola.** Em "Só as fotos" o palco tem a altura exata da tela, e os controles ("Sair do modo TV" no alto; "Mostrar o texto", "Anterior", "Próxima", "Passar sozinho" e "Ajustes" numa barra no pé) ficam por cima das fotos.
- **Os controles somem sozinhos** depois de 5 segundos sem gesto (`SEGUNDOS_DOS_CONTROLES`, em `src/lib/explorar.ts`), e o cursor do mouse some com eles.
- **Qualquer gesto os traz de volta**, com "Mostrar o texto" em destaque e com o foco: toque, clique, movimento do mouse e qualquer tecla (Enter, seta para cima, os botões do controle da TV). O primeiro toque ou clique só mostra os controles, sem trocar de memória. O Tab mostra os controles e segue para o primeiro deles.
- **Esc sempre volta ao modo com texto.** Já no modo com texto, o Esc continua saindo do modo TV.
- **As setas para os lados** continuam trocando de memória, sem mostrar os controles.
- **O foco do teclado nunca fica num controle escondido:** escondidos, eles saem da ordem do teclado (`visibility: hidden`), quem tinha o foco o perde, e a troca de memória não devolve o foco a eles.
- **Com movimento reduzido**, os controles aparecem e somem sem animação.
- Quem entra no modo TV com "Só as fotos" guardado no aparelho vê os controles nos primeiros segundos. Sair da tela cheia pelo Esc do navegador, que não chega à página como tecla, também os mostra.
- O botão de "Ajustes" passou a dizer "Mostrar o texto", como o da barra (era "Mostrar os textos").
- **Onde está:** a regra do que cada gesto faz é `reacaoEmSoFotos`, em `src/lib/explorar.ts`, com teste em `testes/explorar.test.ts` (existe caminho de volta pelo teclado e pelo toque); o script de `Palco.astro` obedece a ela, e `testes/visual.test.ts` confere a ligação. Os controles ficam no grupo `.palco__controles`, que fora de "Só as fotos" não existe para a grade (`display: contents`).
- **Para o Gui conferir:** numa TV com controle de verdade e no iPhone. Os 5 segundos são um ponto de partida.

**As fotos que saem, no Álbum** (achado do Gui, 17/11/2026: pareciam fotos voando que nunca paravam na tela). As fotos antigas, postas de volta por um instante para sair pela lateral, repetiam a animação de chegada enquanto saíam. Agora elas só vão embora.

**Passar sozinho** (decisão do Gui, 17/11/2026). Quem está vendo escolhe o tempo de cada memória, entre 8, 10 e 15 segundos (`TEMPOS_DE_PASSAR`, em `src/lib/explorar.ts`), e pode pausar e retomar a qualquer momento.

- "Passar sozinho" fica na linha de "Anterior" e "Próxima": um toque liga em 10 segundos, e no mesmo lugar ficam "Pausar" e "Retomar". Os três tempos e "Parar de passar sozinho" estão em "Ajustes".
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

### Grupo 2: pessoal

Construído em 17/11/2026, numa sessão em que o Gui não estava: o que era decisão dele seguiu com a opção recomendada, está marcado no código com `PROVISÓRIO (pergunta N do PR do grupo "pessoal")` e virou pergunta no fim do PR. As fundações não mudaram: as regras continuam em `src/lib/painel.ts` e `src/lib/conta.ts`.

**Painel (`/`).** O desenho do conceito com os dados de verdade (`src/pages/index.astro`, `telas/painel.css`). Na primeira visita, a carta no alto; depois, "Oi, Fulano.", o resumo do que entrou, a mesa com as novidades, "Neste dia, em outros anos", os cartões (aniversários, você no acervo, a memória para contar) e o caminho para a linha do tempo. O painel só mostra memória publicada.

**Composição depois do QA de design de 17/11/2026** (respostas do Gui, P1, P6 e P13 a P28). Vale no lugar do parágrafo acima onde os dois discordam. Quem decide onde cada parte fica é `composicaoDoInicio()`, em `src/lib/painel.ts`; os cartões de contar e do relato novo são `src/components/painel/Contar.astro` e `Fila.astro`.

- **Primeira visita:** só a carta na tela. "Abrir o acervo" leva ao Início normal, e a carta não volta ao alto.
- **A abertura** tem "Só você vê esta página" (sem a data de hoje), a saudação, o resumo, a linha do rascunho quando há um, a última visita (com o ano, quando não é o corrente) e o link da carta. O envelope só aparece quando chegou algo.
- **A mesa, no computador,** fica à direita da abertura. Com novidade: até duas fotos novas e, embaixo delas, o relato, sempre na fileira dele. Quando há "E mais N", o relato e essa linha descem para uma fileira de largura inteira, embaixo da abertura e das fotos. Sem novidade: "Neste dia, em outros anos", com até duas fotos grandes e as outras numa linha menor; sem ele, a memória para contar.
- **Os cartões,** nesta ordem: contar, "Neste dia", aniversários ("Próximos aniversários"), você no acervo. No computador eles dividem a linha por quantos são: um ou dois, metade cada; três, um terço; quatro, dois a dois (lado a lado a partir de 100rem). "Neste dia" com três ou quatro memórias é uma faixa de oito colunas ao lado de contar, e os outros ficam na linha de baixo.
- **O cartão de contar** muda de arranjo pela largura que ele mesmo tem (`@container`): estreito, o botão ocupa a largura do cartão, embaixo da foto e do título. A foto leva à memória.
- **O relato novo** diz "Relato novo" no rótulo e traz o título da memória numa linha própria, em serifa.
- **O convite do fim** é "Explorar todas as memórias", em `t-2`, e as décadas se dizem como no filtro do Explorar ("Anos 2020", "Anos 90"). O botão de teste vem depois de um fio, com o rótulo "Teste".

- **A mesa das novidades** mostra duas memórias e um relato, como no conceito. O que passa disso vira uma linha, "E mais N: ver o que entrou por último", que leva a `/explorar?ordem=entraram`. Aprovado pelo Gui em 17/11/2026.
- **Sem visita anterior e sem carta**, a frase é "Que bom que você chegou.". Aprovado pelo Gui em 17/11/2026.
- **O parentesco nos aniversários** não se repete quando o apelido já traz ("Tia Cida" fica sem "sua tia" embaixo). Quando o apelido traz o parentesco de outra pessoa, aparece o nome com o parentesco de quem olha (`nomeParaQuemOlha`).
- **`?hoje=AAAA-MM-DD`** mostra o painel como num outro dia. Só vale onde não há login (prévias, homologação e computador), para conferir os aniversários e o "Neste dia" e para as capturas saírem iguais.
- "Voltar Fulano à primeira visita" continua no fim da página, só fora da produção.

**Carta de Natal.** A peça é `src/components/Carta.astro`, usada no alto do painel e em `/carta`: a saudação "Oi, Elizete," grande, o primeiro parágrafo como abertura em serifa, o resto como texto de leitura, e a linha de quem assina partida em nomes, cada um à mão ("Gui, Giovanna e Magno" vira três assinaturas). O carimbo diz "Natal de <ano em que a carta foi escrita>" (aprovado pelo Gui em 17/11/2026, sem o lugar; o conceito dizia também "Belo Horizonte"). No painel a ação é o botão "Abrir o acervo", que leva ao Início normal; em `/carta`, "Voltar ao início" é uma ação sublinhada, sem seta, e os administradores têm ao lado "Editar a carta" (respostas do Gui às perguntas P14, P30 e P31 do QA de design de 17/11/2026). As fotos ao lado são as três memórias mais recentes em que a pessoa aparece; cada uma leva à memória dela, e a da frente é a primeira na ordem do teclado (P29). O banco de teste ganhou a carta de exemplo do conceito (`semearCartaDeExemplo`), só onde não há carta nenhuma.

**Sua conta (`/conta`).** Página íntima, na cor da família da pessoa, com o cartão do painel (`telas/conta.css`, mais `telas/painel.css` pelo cartão). No alto, o retrato em arco, o nome, "Editar seus dados" e "Ver sua página". Depois, quatro cartões: **Seus dados** (ficha em mono; o e-mail de acesso só aparece na produção), **Rascunhos e lixeira** (os rascunhos de memória e de relato, a conta do que é seu na lixeira e "Abrir a lixeira"), **O que você criou** (o número grande de memórias, relatos, fotos e capítulos; cada lista abre no lugar, uma por vez, sem script) e **Seus laços do coração** (com a proximidade, que só a pessoa vê). No fim, **Administração**, só para quem administra: os itens de `administracao()`, que ganhou "Carta de Natal" e "Sistema visual", e o tamanho do banco, que vira recado quando passa do aviso.

- **Editar os dados no lugar não foi feito**: "Editar seus dados" leva a `/pessoas/<id>/editar`, que é do grupo 4. Pergunta no PR.
- As telas de rascunhos, lixeira e administração continuam no visual antigo, até o grupo 4.

**Página da pessoa (`/pessoas/<id>`).** O retrato e a voz (`telas/pessoa.css`). A abertura é um bloco na cor da família da pessoa, com o retrato em arco, o carimbo (espécie e famílias), o parentesco de quem olha como a linha maior ("sua avó", "seu amigo-irmão") e o nome logo abaixo. Na própria página e na de quem não tem laço com quem olha, o nome é a linha grande. Seguem "Sobre Fulano" e "A voz de Fulano" (cada áudio com o título da memória e o bloco de áudio), "Família e laços", quieta, em colunas, e "Memórias com Fulano", na mesma linha do tempo do Explorar (`explorar/Linha.astro`, sem trilhos nem faixa de décadas). As ações e os textos são os de antes.

**Peça nova: Gente** (`Gente.astro`, classe `gente`, em `pecas.css`). Uma pessoa numa linha de lista: o retrato pequeno, o nome, o laço e um detalhe em mono. Usada nos laços da página da pessoa e da conta, e mostrada em `/sistema`. O Gui ainda não viu.

**A página do sistema mudou para `/sistema`** (seção "A página do sistema fica"). Nas prévias de teste e no computador abre para todos; na produção e na homologação, só para os administradores, pelo link da conta. Fora das prévias ela não lê o acervo: a foto revelada aparece como o cartão sem foto, desenhado. A trava está em `temAcervoDeExemplo()` (`src/lib/servidor/ambiente.ts`), conferida em `testes/sistema.test.ts` e na guarda da produção (item 9). O mesmo teste recusa peça de `src/components/visual/` que não apareça na página.

**O que saiu.** O painel e a carta do conceito (`/conceito`), com os dados fixos. Do conceito ficou só `/conceito/sobre`, as fontes, até a escolha. A faixa de teste do alto aponta para as telas de verdade.

**Capturas.** `CAPTURAS_SO=^pessoal npm run capturas -- tirar <pasta>`. O painel depende das visitas: o script arruma o banco local antes (apaga as visitas da pessoa para a carta, ou põe a visita anterior um minuto atrás e publica agora duas memórias e um relato de exemplo). As deste grupo estão em `docs/visual/fase-3/pessoal/`, em JPEG. A espera das fotos nas capturas ganhou limite de três segundos por foto: foto dentro de uma lista recolhida nunca carregava e a captura não terminava.

**Conferido.** 390, 1280 e 1920 px, com movimento reduzido (as capturas rodam assim; estas telas não têm animação própria). Por teclado: a ordem do foco segue a da tela e todo foco das telas novas é visível. Nove capturas do Explorar e da memória, antes e depois: iguais, fora uma diferença que muda de captura a cada rodada com o mesmo código (foto que ainda não tinha chegado).

**O que não foi conferido:** nada no iPhone de verdade, nem na prévia publicada com as fotos do bucket de teste.

**Achado do grupo 1, sem correção aqui:** na linha do tempo, o link do título de cada memória tem 30 px de altura e o foco do teclado nele não mostra contorno na conferência automática. Vale olhar no PR #35.

### Grupo 3: familia

Construído em 17/11/2026, numa sessão em que o Gui não estava: o que era decisão dele seguiu com a opção recomendada, está marcado no código com `PROVISÓRIO (pergunta N do PR do grupo "familia")` e virou pergunta no fim do PR. As fundações não mudaram: as regras dos capítulos continuam em `src/lib/capitulos.ts`, e a árvore mudou só de aparência.

**Lista de capítulos (`/capitulos`).** Um sumário de livro (`telas/capitulo.css`): à esquerda, "Capítulos", a frase de sempre e "Novo capítulo"; à direita, cada capítulo numa linha, com o título em serifa e, em mono, o que ele é ("Época", "Capítulo por período", "Capítulo"), o período em pílula e a conta das memórias. Os capítulos de dentro ficam recuados sob o maior, presos por um fio. Os temas vêm no fim, como ações quietas. A linha é a peça de tela `src/components/capitulos/Entrada.astro`, usada também na página do capítulo e na do tema.

**A cor do capítulo fora da linha do tempo.** `coresDosCapitulos`, em `src/lib/linha-capitulos.ts`, dá a cada capítulo a mesma cor do trilho dele na linha do tempo inteira, para ele ser reconhecido pela cor nos dois lugares. Capítulo sem memória visível ganha uma cor fixa pela posição. Época não tem cor: ela é o chão. Teste em `testes/linha-capitulos.test.ts`.

**Página do capítulo (`/capitulos/<id>`).** Abertura de capítulo de livro. À esquerda, a capa: o carimbo com o que ele é (e "Só Bayara", quando é restrito), o título grande, o período em pílula com a conta, "Entram as memórias do período com…", as ações de sempre mais "Ver no Explorar", a abertura em serifa, as ligações ("Parte de", "Aconteceu durante", "Temas") e "Quem aparece". No computador com mouse a capa fica parada enquanto os marcos rolam (`sticky` só dentro de `(hover: hover) and (pointer: fine)`); no toque, nada fica preso. À direita, "Capítulos dentro deste", "Aconteceu neste período" e os marcos.

- **Os marcos numerados.** Cada memória do capítulo é um marco: o número grande em serifa, com um traço na cor do capítulo, o carimbo com a data e o lugar, o título, quem estava e a foto revelada pequena. A ordem é a de toda linha do tempo do site, das mais recentes para as mais antigas, e o número é a posição do marco na história contada do começo (o mais recente leva o número mais alto). Aprovado pelo Gui em 17/11/2026; a outra opção era a ordem do livro, do 01 em diante.
- **Quem aparece.** As seis pessoas que mais estão nas memórias do capítulo, com a conta de cada uma (a peça Gente), e "e mais N pessoas". Fica na tela grande (resposta do Gui, 17/11/2026); no celular vira uma linha de nomes corrida, sem fotos, feita na `tst-visual-ajustes`.
- **A cor da tela** vem das famílias do capítulo (as de "quem vê" e as de "de quem é"); sem nenhuma, a da família completa.
- A marcação da memória de um capítulo de dentro leva o sinal desse capítulo.

**Tema (`/temas/<id>`).** "Tema", o nome grande, "Todos os capítulos e temas", os capítulos que usam o tema (a mesma linha do sumário) e as memórias, na linha do tempo do Explorar (`explorar/Linha.astro`, sem trilhos), como na página da pessoa.

**Capítulos e temas depois das respostas do Gui ao QA de design (17/11/2026, P60 a P83).** Vale por cima do que está escrito acima; os testes estão em `testes/qa-respostas-capitulos.test.ts`.

- **Sumário:** continua do mais antigo para o mais recente. O título de cada linha tem o tamanho de item de lista (`--t-titulo-3`). Toda linha tem o ponto antes do selo, e o da época é vazado em cinza, para os selos alinharem. Com mouse, o alto ("Capítulos", a frase e "Novo capítulo") fica parado. "Ver os temas", no alto, desce até os temas, que continuam no fim (`#temas`).
- **Capa do capítulo:** no celular a ordem é selo, título, período, frase de abertura e só então as ações. No computador com mouse ficam parados só o selo, o título, o período e as ações; a abertura, as notas e "Quem aparece" rolam e passam por trás desse bloco. O botão cheio é "Nova memória neste capítulo" (só no reunido); editar é ação de texto. O capítulo de dentro diz, acima do título, "Capítulo de “Natais”", com o link.
- **Forma de ver, no capítulo:** os marcos (o padrão), o mural e a lista do Explorar, na própria página, com a escolha no endereço (`ver`), e "Passar no modo TV", que abre o Explorar com o capítulo. "Ver no Explorar" saiu. No mural e na lista as memórias usam a largura inteira, embaixo da capa.
- **Marcos:** a foto vai sem legenda, e o carimbo quebra antes do ponto. Na época, o título é "Memórias da época". "Aconteceu neste período" só marca o que coube inteiro ("inteiro neste período"). A partir de 100rem o corpo vai até a margem e a foto do marco cresce.
- **Formulário do capítulo:** as etapas são "Que capítulo é esse?", "Onde ele se encaixa?" e "Quem vê". O mês tem o rótulo "Mês, se souber" e a opção "Não sei", como na memória. Na edição, "Sobre o capítulo" vem primeiro, com a trilha na coluna da esquerda no computador; "Memórias do capítulo" mostra as que já estão marcadas, e as outras entram por uma busca (sem script, a lista vem inteira).
- **Tema:** a partir de 62rem, o nome e os capítulos à esquerda e as memórias à direita, com a "Forma de ver" da página da pessoa. A lista usa a largura inteira. A linha de cada capítulo é a do sumário, com o período e a conta.

**Pessoas (`/pessoas`).** Cada família é uma parte da página com a cor dela (`telas/pessoas.css`): o nome da família num bloco pastel, com a conta, e as pessoas embaixo com a peça Gente, em uma, duas, três ou quatro colunas. Cada pessoa mostra o retrato, o nome, o que ela é para quem olha ("sua avó", "você") e a conta das memórias, com a espécie quando é bicho. No alto, a conta de pessoas e bichos, "Cadastrar pessoa", "Ver a árvore" e os atalhos para cada família. O parentesco na lista foi aprovado pelo Gui em 17/11/2026. Depois das respostas ao QA de design (17/11/2026): "Procurar pelo nome" e a troca de ordem ("Por geração", "De A a Z") no alto, a conta de cada bloco por extenso, e os retratos na margem do nome da família.

**Árvore (`/arvore`).** Mudou só a aparência (`telas/arvore.css`); `arvore-montagem.ts` e `arvore-desenho.ts` não foram tocados, e os testes `testes/arvore-*.test.ts` passam sem mudança. Conferido com o Playwright, antes e depois, com a árvore como abre, alguém em foco, os laços do coração abertos, um ramo aberto, cada camada desligada e uma família em destaque: a posição de todos os cartões, o caminho de todas as linhas, os cartões dos ramos e a ficha saíram idênticos.

- **O cartão é uma etiqueta:** a cor da família no fundo (quem é de duas leva as duas, na diagonal, como antes), um canto reto como a etiqueta-balão, o nome em serifa e o parentesco em mono. As medidas continuam 150 por 76, as do desenho. Quem olha tem uma faixa de tinta no alto; quem está em foco, um anel de tinta; bicho é cápsula com a espécie em mono; quem é de fora das famílias fica em branco, com um fio.
- **As cores das famílias** são as dos tokens, na ordem delas (`--arvore-familia-0` a `-3`, definidas em `.mapa`). No código do navegador mudaram só os nomes das variáveis de cor (`fundoDe`, em `src/lib/cliente/arvore.ts`).
- **Camadas e controles quietos:** "Ajustar a árvore", a ficha, o zoom e a legenda são cartões brancos pousados no mapa, sem contorno. A ficha traz o retrato em arco, o nome em serifa e as três ações numa linha. No celular, com os ajustes abertos, a ficha sai da frente.
- **A busca de "Partir de"** (`busca-pessoa.ts`) ganhou o estilo novo só dentro do mapa (`.mapa .busca…`). O estilo da busca nos formulários é do grupo 4.
- A marca do ramo recolhido ganhou área de toque de 44 px (tinha 42).
- **Depois das respostas do Gui ao QA de design (17/11/2026):** a ficha só aparece ao tocar em alguém e fica embaixo, no centro; a barra de baixo diz "Voltar para Fulano" e "Ver a árvore inteira"; a legenda tem três grupos, abre pelo botão "Legenda" no celular e lembra se foi fechada no computador; no celular os ajustes abrem no pé do mapa. As regras estão em `docs/decisoes.md`, em "O que fica em volta do mapa", e as capturas em `docs/visual/qa-respostas/arvore/`.

**"Família" no lugar de "núcleo"** nestas telas: "Quem aparece nas memórias da família, por família." (era "por núcleo"), na lista de pessoas; na árvore, "Família Bayara" em "Destacar" (era "Núcleo Bayara"), "Outras famílias" em "Mostrar" (era "Outros núcleos") e a dica "A árvore parte de Fulano, que é de outra família" (era "de outro núcleo"). Tem teste: nenhuma destas telas escreve "núcleo".

**O menu** acende "Capítulos" na lista, no capítulo e no tema, "Pessoas" na lista e "Árvore" na árvore (`secao`, em `Visual.astro`).

**O que saiu.** `LinhaDoTempo.astro`, `Cartao.astro` e `Foto.astro`, que só serviam às telas antigas de capítulo e tema.

**O achado do grupo 1 sobre o título na linha do tempo não é defeito.** O link do título tem 30 px de altura, mas a área de toque dele é a memória inteira (`.entrada__titulo a::after`), e o foco do teclado aparece como contorno em volta da memória inteira (`.entrada:has(…:focus-visible)`). A conferência automática media só o link.

**Capturas.** `CAPTURAS_SO=^familia npm run capturas -- tirar <pasta>`. As deste grupo estão em `docs/visual/fase-3/familia/`, em JPEG: a lista, o capítulo reunido, o por período, a época e o de dentro, o tema, as pessoas e a árvore (como abre, com foco, com um ramo aberto e com os ajustes).

**Conferido.** 390, 1280 e 1920 px, com movimento reduzido (as capturas rodam assim). Por teclado, em 390 e 1280: a ordem do foco segue a da tela, todo foco é visível e todo alvo tem 44 px. Na árvore, com mouse e com toque: arrastar, aproximar, "Ver tudo", tocar numa pessoa, a ficha, os laços do coração, abrir e fechar um ramo, as cinco camadas e o destaque de uma família.

**O que não foi conferido:** nada no iPhone de verdade (o gesto de dois dedos na árvore, em especial), nem na prévia publicada. A capa parada do capítulo só existe com mouse, então não pede conferência no iPhone. Das 33 capturas, foram olhadas 20, pelo menos uma de cada tela; as de 1920 px olhadas foram a do capítulo reunido, a das pessoas e a da árvore com foco.

### Grupo 4: formularios

Construído em 17/11/2026, numa sessão em que o Gui não estava: o que era decisão dele seguiu com a opção recomendada, está marcado no código com `PROVISÓRIO (pergunta N do PR do grupo "formularios")` e as perguntas estão no fim do PR do grupo. As fundações não mudaram: as etapas, o que é obrigatório, os nomes dos campos, o que os scripts de `src/lib/cliente/` procuram e o funcionamento sem JavaScript.

**A base, para todas as telas de formulário.**

- **A página:** `src/components/formularios/Pagina.astro`. Uma tela de formulário usa `<Pagina titulo="…" rotulo="…" nucleos={…} secao="…">`, com a frase de abertura em `slot="abertura"` e o formulário dentro. Ela traz o esqueleto novo, a abertura quieta, os recados que voltam do servidor (`?ok=` e `?erro=`, na peça Recado) e o que antes morava no `Base.astro`: o `<noscript>` que esconde o que depende de script e mostra os blocos que ele mostraria, `guardarFormularios` (o digitado volta quando o servidor recusa) e `marcarEnvios` ("Salvando…").
- **O estilo:** `src/visual/telas/formulario.css`, um arquivo só, valendo dentro de `.pagina-de-formulario`. A marcação dos formulários e a que os scripts criam continuam com os nomes de sempre (`campo`, `opcoes`, `opcao`, `marcar`, `dica`, `acoes`, `acoes--etapas`, `botao--leve`, `botao--arquivo`, `situacao`, `resumo`, `confirmacao`, `etapas`, `busca…`, `audio…`, `quem-estava…`, `foto-enviada`, `nova-pessoa`, `abas`, `painel`, `lista-de-marcar`, `passo-ano`, `campos-data`, `confirmar…`); o arquivo é o desenho novo desses nomes, escrito do zero com os tokens. Foi a escolha no lugar de trocar cada classe pelas do sistema (`campo__rotulo`, `campo__entrada`, `escolha`): os scripts criam boa parte dessa marcação, e as telas da segunda metade usam os mesmos componentes ainda no esqueleto antigo. O desenho é o do sistema: rótulo em mono, resposta numa linha para escrever em cima, foco que engrossa a linha e acende o fundo.
- **A pergunta** é a legenda de cada parte (`legend`), grande, em serifa. Dentro de outra parte, um degrau abaixo.
- **A trilha das etapas** (`ol.etapas`, criada por `etapas.ts`): no celular, uma fila de números com 44 px de toque e a linha "Etapa 2 de 7: Quando e onde"; no computador, uma coluna à esquerda com o nome de cada etapa, e a abertura sobe para o alto da página. Sem etapas (o relato), a abertura fica à esquerda e o formulário à direita.
- **Ações:** o botão cheio é a ação principal; `botao--leve` virou texto sublinhado. Nas ações de etapa, "Voltar" à esquerda e o resto à direita. Quando "Continuar" e um envio convivem (correção de memória publicada, edição do capítulo), o envio fica em contorno até a última etapa.
- **Estados:** pressionado (a opção e os passos do ano encolhem um pouco), enviando (o `aria-disabled` do botão, de `enviando.ts`), erro (`aria-invalid` pinta a linha do campo no alerta; num grupo de opções, uma barra ao lado), desabilitado (linha tracejada e texto suave) e o recado do envio (`.situacao`, com a barra do alerta quando é erro).
- **O que o script esconde fica escondido:** `.pagina-de-formulario [hidden] { display: none !important }`. Sem isso, qualquer `display` dado por este arquivo mostrava o que estava escondido (apareceu com "O que foi?", do tipo "Outro"). O `<noscript>` da página vence essa regra por vir depois.
- **A busca de pessoa** ganhou o estilo geral (`.pagina-de-formulario .busca…`); o da árvore continua em `arvore.css`.

**Nova memória (`/nova`).** As sete etapas, na mesma ordem, cada uma com a pergunta grande. Vale para memória nova, rascunho e correção de memória publicada.

- **O formulário em frase**, na etapa "Quando e onde": "Isso aconteceu *em 24 de dezembro de 2025*, em *Belo Horizonte*." A lacuna da data não é campo de digitar: mostra a data como o site escreve (`dataNaFrase`, em `src/lib/datas.ts`, com teste) e, ao toque, ao Enter ou à barra de espaço, abre logo abaixo o controle de data flexível de sempre (`CampoData`, o calendário, "Foi hoje" e "Não tenho certeza da data"), empurrando o conteúdo. Numa memória nova o controle começa aberto, com a lacuna perguntando "em que data?"; com a data já informada, começa fechado. Um erro dentro do controle fechado (31 de fevereiro, ano vazio) o abre, para o aviso aparecer. Sem script, a lacuna some, a frase diz "na data abaixo" e o controle fica aberto. A lacuna do lugar é texto livre (o campo `lugar` de sempre). "Com quem" continua na etapa seguinte, com o "Quem estava?" de hoje.
- **A lacuna da data é um trecho da frase com papel de botão** (`<span role="button" tabindex="0">`), e não um `<button>`: o botão não quebra de linha no meio, e a data longa precisa quebrar no celular.
- **Tipos de momento:** a opção marcada acende na cor do tipo (`estiloDoTipo`), e não mais na cor guardada no cadastro do tipo.
- **Fotos:** cada foto como uma foto revelada pequena, com a legenda, "Usar na linha do tempo" e "Remover foto" ao lado.
- **O resumo** da última etapa e a confirmação ("Memória publicada") são cartões brancos pousados no papel.

**Relato (`/memorias/<id>/relato`).** A abertura à esquerda, "Como foi?" à direita, com "Quem está contando" (a busca de pessoa), os áudios (cada um num cartão, com o tocador do aparelho, a transcrição recolhida e "Subir", "Descer" e "Remover") e o texto.

**Capítulo (`/capitulos/novo` e `/capitulos/<id>/editar`).** A ficha em três etapas, com "Como as memórias entram?" em cartões que se explicam (Reunido, Por período, Época). Na edição, "Memórias do capítulo" e "Sobre o capítulo" são partes separadas por um fio.

**"Família" no lugar de "núcleo"** nestas telas: a tabela das trocas está no PR do grupo, e tem teste (nenhuma destas telas escreve "núcleo" no que aparece).

**Testes.** `describe('grupo formularios')`, em `testes/visual.test.ts`; a data na frase, em `testes/datas.test.ts`. As quatro telas, a página de formulário e a ficha do capítulo entraram nas listas de telas de `testes/visual.test.ts` e `testes/sistema.test.ts`. Nenhum teste antigo precisou mudar.

**Capturas.** `CAPTURAS_SO=^formularios npm run capturas -- tirar <pasta>`. Estão em `docs/visual/fase-3/formularios/`, em JPEG: a Nova memória (a primeira etapa, o erro, a frase vazia, e a correção e o rascunho etapa a etapa), o relato e o capítulo (novo, por período, em edição e a época).

**Conferido.** 390, 1280 e 1920 px, com movimento reduzido. Com o Playwright, no celular e no computador, só pelo teclado: a Nova memória inteira até salvar um rascunho e até publicar, com o que segura o "Continuar" (título, tipo, ano, 31 de fevereiro), a frase, "Pular esta etapa" e o resumo; em cada etapa, todo alvo com 44 px e o foco visível. Sem JavaScript: as sete etapas em sequência, o controle da data aberto, os botões que dependem de script escondidos, o rascunho salvo por formulário comum, e o relato e o capítulo abrindo com o botão de envio.

**O que não foi conferido:** nada no iPhone de verdade nem na prévia publicada. O envio de fotos e a gravação de áudio não foram exercitados (o estilo das fotos foi visto com as que a memória já tem; o do áudio gravado, não). A edição de um capítulo por período com pessoas marcadas foi vista só no capítulo novo.

**Segunda metade** (17/11/2026, na mesma branch). As telas que ainda estavam no esqueleto antigo passaram para `formularios/Pagina.astro`, com os mesmos nomes de classe, ids e atributos que os scripts e os testes procuram, e `formulario.css` ganhou o desenho novo desses nomes.

- **Nova pessoa (`/pessoas/nova`) e a ficha (`FichaDoIntegrante.astro`).** A trilha de duas etapas ("Quem é", "Laços") é a mesma trilha quieta, em versão de fluxo entre páginas (`etapas--fluxo`): no celular só a etapa em que a pessoa está leva o nome. "Foto, nascimento e história" continua recolhido.
- **O retrato no formulário (`CampoRetrato.astro`).** O retrato de agora aparece recortado em arco, como no resto do site, sobre a cor da família (`data-familia`, de `corDaPessoa`). Saiu `corDaFamilia`, que devolvia uma variável do estilo antigo. O quadro de enquadrar fica num cartão branco, com "Aproximar", "Usar esta foto" e "Cancelar".
- **O cadastro guiado (`/pessoas/<id>/editar?novo=1`).** Uma pergunta por tela, grande, em serifa. Os dois caminhos ("Da família", "Do coração") são dois cartões inteiros para tocar, lado a lado a partir de 40rem. Em cada pergunta, "Adicionar" é o botão cheio até alguém ser adicionado; "Voltar" fica à esquerda e "Pular esta pergunta" ou "Próxima pergunta" à direita, como nas etapas da Nova memória.
- **Editar página e laços (`/pessoas/<id>/editar`).** A ficha, depois os laços por tipo, cada um numa linha com "Editar", que abre no lugar num cartão branco. O casal mostra as fases como uma linha do tempo com um fio ao lado; em edição, cada fase é uma linha que abre com "Mudar". Remover continua com a confirmação no próprio lugar (`ConfirmarRemocao.astro`), com o botão na cor do alerta. "Adicionar laço" usa as abas que já tinham desenho.
- **Utilitárias, silenciosas:** o histórico da memória, as duas confirmações de excluir (um cartão com a marca do alerta), os rascunhos e a lixeira. As listas usam `linhas`: um fio entre os itens, o nome em destaque, a data em mono e a ação em texto sublinhado. O estado vazio é a peça Vazio.
- **Administração:** tipos de momento, famílias, carta de Natal e espelho da produção, com "Administração" acima do título e "Voltar para a sua conta". O tamanho do banco e "Baixar cópia do acervo" já estavam na conta desde o grupo 2; o teste do aviso passou a conferir a conta.
- **Página larga:** `<Pagina larga>` alarga a coluna (`pagina-de-formulario--larga`) para listas e tabelas.
- **Defeitos corrigidos no caminho:** o texto do espelho mandava procurar "Baixar cópia do acervo" no rodapé, que não existe mais (agora diz "abra a sua conta e, em Administração"); faltava um espaço entre duas frases em `/admin/familias`; "Ver como fica", na carta, não tinha a aparência de ação.
- **"Família" no lugar de "núcleo"** nestas telas e em dois recados do servidor ("Você só pode marcar famílias de que faz parte."). A tabela das trocas está no PR.

**O estilo antigo saiu.** Foram apagados `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Abertura.astro` e `testes/tokens.test.ts`, que só conferia os tokens do arquivo apagado. Toda página usa `Visual.astro`, direto ou por `formularios/Pagina.astro`. As conferências que liam o esqueleto antigo mudaram de lugar sem perder regra: o digitado que volta e o `<noscript>` (`testes/formularios.test.ts`) e o `marcarEnvios()` (`testes/ux-decisoes.test.ts`) agora leem `Pagina.astro`; o aviso do tamanho do banco (`testes/tamanho-do-banco.test.ts`) lê a conta. Um teste novo, no `describe('grupo formularios')`, recusa a volta do esqueleto, da abertura, da pasta `src/styles` e das variáveis antigas (`--cor-`, `--tamanho-`, `--espaco-`, `--nucleo-`), e confere que toda página usa o esqueleto novo.

**Camadas do CSS (`@layer`), reavaliadas e não adotadas.** Com o `global.css` fora, a razão que sobra para as camadas é a tela sempre vencer a peça. Elas mudariam quem vence em todas as telas dos quatro grupos de uma vez, e a fase 2 já viu alturas mudarem por isso. Não foi tentado nesta sessão, porque pedia comparar todas as capturas dos quatro grupos com o Gui ausente e os grupos 1 a 3 ainda em aprovação. A regra continua a de "Cuidados que custaram tempo": para a tela ajustar uma peça, um seletor mais específico. Vale tentar depois dos quatro PRs entrarem, numa branch só para isso, com `npm run capturas -- comparar`.

**Conferido na segunda metade.** 390, 1280 e 1920 px, com movimento reduzido. Com o Playwright, no celular e no computador, só pelo teclado: cadastrar uma pessoa, percorrer o cadastro guiado até o fim adicionando a mãe pela busca, editar o laço (a filiação adotiva mostra a data da adoção), remover com a confirmação e restaurar um item da lixeira; em cada tela, todo alvo com 44 px, o foco visível e nenhuma rolagem lateral. Sem JavaScript: nova pessoa cadastra por formulário comum, o botão de escolher foto some, a pergunta do guiado mostra a lista suspensa no lugar da busca e, em "Adicionar laço", os campos de todos os tipos aparecem. Depois de apagar o estilo antigo, uma tela de cada grupo anterior foi capturada antes e depois: a conta, o capítulo e o capítulo novo saíram iguais pixel a pixel; a memória difere só dentro das fotos, de uma rodada para outra (instabilidade já conhecida do grupo 2); a árvore mudou porque a conferência cadastrou pessoas de teste no banco local.

**O que não foi conferido na segunda metade:** nada no iPhone de verdade nem na prévia publicada. O recorte do retrato não foi exercitado com uma foto (o quadro de enquadrar não foi visto aberto). O histórico só foi visto vazio: a memória de exemplo das capturas nunca foi alterada, então as listas de alterações, de textos anteriores e de fotos removidas não foram vistas na tela. O espelho não foi enviado. Das capturas em 1920 px, foram olhadas só a pergunta dos pais e o espelho.

**Capturas.** `CAPTURAS_SO=^formularios npm run capturas -- tirar <pasta>`. As da segunda metade são `formularios-4` (nova pessoa e o guiado), `formularios-5` (editar, um laço e um casal em edição), `formularios-6` (utilitárias) e `formularios-7` (administração). As entradas antigas sem prefixo saíram da lista.

### O que falta

**Da fase 3**

- **A aprovação do Gui**, grupo a grupo, e o merge na ordem: #35, #36, #37 e #38. As perguntas de cada grupo estão no fim do PR dele.
- **As fontes:** `/conceito/sobre` fica até a escolha, que espera a Giovanna e o Magno. Depois dela, saem as duas combinações que sobrarem ("Como a fonte é trocada").
- **Limpeza que ficou para depois dos merges:** tirar de "Decidido, a construir" os itens que os grupos fecharam (Explorar, capítulos na linha do tempo, painel, sua conta, "família" no lugar de "núcleo", revisão visual) e levar o resumo para as seções de regra; `docs/ux/revisao-visual.md`, `docs/ux/padroes.md` e `docs/ux/capturas/` saem de cena, como `docs/decisoes.md` já previa; separar os testes dos grupos 1 e 2 do `describe('conceito')`, em `testes/visual.test.ts`; tentar as camadas do CSS.
- **O campo "Cor" de `/admin/tipos`** não muda mais nada na tela: o visual novo pinta cada tipo com a cor fixa de `corDoTipo`. Resposta do Gui (17/11/2026): mudou na `tst-visual-tipos`, e a cor escolhida em `/admin/tipos` voltou a valer na tela (ver "Tipos: paleta e ícones").
- **O que nenhum grupo viu na tela:** o envio de foto nova, a gravação de áudio, o recorte do retrato com uma foto e o histórico com alterações.

**Da fase 4 (movimento e detalhes)**

- A frase que acende palavra por palavra, a foto que amplia no lugar e o tocador de áudio próprio ("O que ficou de fora do sistema, de propósito").

**Da fase 5 (QA visual no aparelho)**

- **No iPhone de verdade**, nada dos quatro grupos foi conferido: a troca com movimento do Explorar, o modo TV com "Só as fotos", a galeria da memória, a linha do tempo na página da pessoa e do tema, o gesto de dois dedos na árvore, os formulários (teclado do aparelho, a lacuna da data, a gravação de áudio) e o recorte do retrato.
- **Numa TV de verdade, com controle:** o modo TV.
- **Na homologação, com o espelho da produção:** a árvore, as páginas de pessoa e a lista de pessoas com o formato real da família.

## A página do sistema fica (decisão do Gui, 16/11/2026)

`/sistema` (até o grupo 2 da fase 3, `/conceito/sistema`) é a referência do projeto para o Gui e continua existindo depois da revisão visual, em todos os ambientes, inclusive no site de verdade, para estar sempre à mão.

- Mudou para `/sistema` no grupo 2 da fase 3, quando o painel do conceito saiu.
- Na produção e na homologação, só os administradores abrem (para os outros, 404), com um link na seção "Administração" da conta. Nas prévias e no computador, abre para todos, como hoje.
- Ela mostra o sistema com conteúdo fixo da própria página, nunca com dados do acervo. Na produção, nada de fotos de exemplo: a guarda já recusa que elas cheguem ao pacote ou ao bucket da produção. Onde a peça pede foto, a página usa um quadro desenhado (cor e textura da própria página) e, nas prévias, pode continuar usando o Chico e a Karol.
- Ela acompanha o sistema: toda peça, token ou regra nova entra nela no mesmo PR, e `testes/sistema.test.ts` falha se uma peça do sistema não aparecer na página.

## Respostas do Gui às perguntas da fase 3 (17/11/2026)

As perguntas estão no fim dos PRs #35 a #38. "Aprovada" quer dizer a opção recomendada, como a sessão fez: a marca PROVISÓRIO sai e a decisão vira regra. O que muda está descrito na resposta e é feito na `tst-visual-ajustes` (ou na `tst-visual-tipos`, quando dito).

**O que virou regra** (as opções aprovadas, sem marca PROVISÓRIO no código desde 17/11/2026; o detalhe de cada uma está na seção do grupo):

| Onde | Regra |
| --- | --- |
| Explorar | O endereço é `/explorar`, o controle se chama "Forma de ver", e os textos do formulário, do palco e do pé do trilho ficam como estão |
| Modo TV | "Álbum" é a animação de quem nunca escolheu. Os nomes "Álbum", "Revelação" e "Mesa" ficam |
| Carta | O carimbo diz "Natal de" e o ano em que a carta foi escrita, sem lugar |
| Prévias | O banco de teste tem uma carta de exemplo, a do conceito, só onde não há carta nenhuma |
| Painel | Na mesa das novidades ficam as duas memórias e o relato mais novos; o resto vira "E mais N", que leva ao Explorar em "Entraram por último" |
| Painel | Quem chega sem visita anterior e sem carta lê "Que bom que você chegou." |
| Conta | "Editar seus dados" leva à tela de editar a página da pessoa. Os textos novos da conta, da pessoa e da administração ficam |
| Página da pessoa | O parentesco de quem olha é a linha maior, e o nome vem logo abaixo |
| Peça Gente | Faz parte do sistema: retrato, nome e uma linha de apoio, para listas de pessoas e de laços |
| Capítulo | Os marcos vão dos mais recentes aos mais antigos, com a numeração decrescente: o número é a posição na história, contada do começo |
| Capítulo | "Quem aparece" fica. Na tela grande, as seis pessoas com retrato e conta; no celular, uma linha de nomes corrida |
| Pessoas | A lista mostra o parentesco de quem olha ("sua avó") |
| Árvore | O cartão é uma etiqueta com um canto reto, e quem olha leva a faixa de tinta |
| Formulários | Quando "Continuar" e o envio convivem, "Continuar" é o botão cheio e o envio fica em contorno; na última etapa, o envio volta a ser cheio |
| Formulários | A trilha das etapas é quieta: numerada, numa coluna à esquerda no computador |
| Formulários | Toda ação que não é a principal é texto sublinhado, inclusive "Escolher fotos" e "Gravar áudio" |
| Formulários | A opção marcada fica no pastel da tela (o do tipo de momento, quando há), com a borda na cor do texto |
| Formulários | A página de formulário pode levar uma linha pequena acima do título ("Rascunho", "Memória publicada") |
| Formulários | Os rótulos e os textos das telas utilitárias e da administração ficam ("Sua conta", "Administração", "Voltar para a sua conta", "Ver os rascunhos", "Confira antes de confirmar. Nada é apagado de vez.") |
| Cadastro guiado | Os dois caminhos são cartões inteiros para tocar, e o fluxo de nova pessoa e laços tem a trilha numerada |
| Laços | O laço em edição abre num cartão branco, no lugar, e as fases do casal levam um fio ao lado |
| Excluir | O botão que confirma é cheio, na cor de alerta |

O que mudou em vez de ser aprovado (a página da pessoa com "Forma de ver", "Quem aparece" no celular, a frase na abertura da Nova memória, o resumo à direita nos formulários, a zona de perigo e a cor e o ícone dos tipos) está nas respostas abaixo e é registrado na seção dos ajustes quando for construído.

**#35 (Explorar e memória):** `/explorar`, "Forma de ver" e os textos do formulário, do palco e do pé do trilho, aprovados. Modo TV: "Álbum" é a animação de quem nunca escolheu, e os nomes "Álbum", "Revelação" e "Mesa" ficam.

**#36 (pessoal):**
1. Carimbo da carta: aprovada ("Natal de" e o ano em que a carta foi escrita, sem lugar).
2. Carta de exemplo nas prévias: aprovada.
3. Novidades na mesa: aprovada (as duas memórias e o relato mais novos, e "E mais N").
4. "Que bom que você chegou.": aprovada.
5. Editar os dados na conta: aprovada (o link para a tela de editar a página).
6. Parentesco como linha maior da página da pessoa: aprovada.
7. Textos novos da conta, da pessoa e da administração: aprovada.
8. Memórias na página da pessoa: **muda**. A página ganha "Forma de ver", como o Explorar: linha do tempo (o padrão), mural e lista.
9. A peça Gente: aprovada.

**#37 (família):**
1. Marcos do capítulo, mais recentes primeiro e numeração decrescente: aprovada.
2. "Quem aparece": fica. **Muda no celular**: vira uma linha de nomes corrida, sem fotos, no formato "Gui (10), Giovanna (8)", no alto, sem empurrar as memórias. Na tela grande, como está.
4. A ordem da página do capítulo no celular: resolvida pela 2 (a capa fica no alto, com a linha corrida).
3, 5 e 6. Parentesco na lista de pessoas, textos novos e o cartão da árvore: aprovadas. Além disso, dois defeitos na árvore: a nitidez no zoom e o respiro do cartão de bicho (itens 8 e 9 do prompt).

**#38 (formulários):**
1. A frase de lacunas: **muda**. A frase entra também na abertura da Nova memória, com "com ___" levando ao "Quem estava?".
2. Os dois botões na correção e na edição do capítulo: aprovada.
3. A trilha das etapas: aprovada.
4. Ações secundárias como texto sublinhado: aprovada, inclusive "Escolher fotos" e "Gravar áudio".
5. A cor da opção marcada: aprovada.
6. A linha pequena acima do título: aprovada.
7. Formulários na tela grande: **muda**. À direita, a foto-chave e um resumo da memória que acompanha o preenchimento, em 1280 e 1920 px.
8. Rótulos e textos da segunda metade: aprovada.
9. O cadastro guiado: aprovada.
10. O laço em edição: aprovada.
11. O campo "Cor" dos tipos: **muda**, na `tst-visual-tipos`. Escolha numa paleta ampliada do sistema (bem mais que onze cores, todas com contraste garantido) e seletor de ícone entre os rabiscos de `IconeDoTipo.astro`, com rabiscos novos no mesmo traço.
12. O botão de excluir: aprovada (cheio na cor de alerta) e **mais**: a zona de perigo, com as ações de apagar juntas no fim das telas de editar, num bloco separado e marcado na cor de alerta, longe do salvar.

Novidade que vale para o Explorar e a página da pessoa: a forma de ver "Lista", no modelo do "Já rolou" da agenda da @bsurda (descrita no prompt da `tst-visual-ajustes`).

## Ajustes depois da fase 3

Branch `tst-visual-ajustes`, nascida da `homologa` em 17/11/2026, com o que o Gui pediu ao responder as perguntas dos PRs #35 a #38. Um PR só para a `homologa`. Esta seção registra o que cada parte fez; as perguntas novas vão no fim do PR.

### Parte 1: a lista, as formas de ver da pessoa, "Quem aparece" e o link do título

**A forma de ver "Lista"** (pedido do Gui, 17/11/2026, no modelo do "Já rolou" da agenda da @bsurda). Vale no Explorar (`/explorar?ver=lista`) e na página da pessoa.

- **Onde está:** `src/components/explorar/Lista.astro` e `src/visual/telas/lista.css`. As partes da linha que têm regra estão em `src/lib/explorar.ts` (`dataNaLista`, `quemNaLista`, `nomeCurto`, `mostraRascunho`), com teste em `testes/explorar.test.ts`.
- **O ano grande abre cada bloco**, com a conta das memórias do ano. Fora da ordem do tempo ("Entraram por último", "Mais contadas") não há blocos, e a data vai inteira na linha.
- **Cada memória é uma linha**, e a linha inteira é o link: o sinal na cor do tipo de momento (o rabisco do tipo), o título, a data, o lugar, quem estava (até três nomes e "+N"), o sinal de áudio, a conta dos relatos e o capítulo, com a parada na cor dele. O rascunho aparece para quem escreveu, levando ao formulário, como na linha do tempo.
- **A data:** dentro do bloco, o dia e o mês ("24 dez", "dez"); a aproximada diz "por volta de", com o mês quando é conhecido; quem só tem o ano fica em branco.
- **No celular**, dois andares: o título e a data em cima, o resto embaixo, menor.
- **No computador**, uma linha em colunas. Em 1280 px o lugar fica embaixo do título; em 1920 px ganha a coluna dele.
- **A foto-chave** aparece numa margem à direita quando o mouse ou o foco do teclado passa pela linha, só em `(min-width: 62rem) and (hover: hover) and (pointer: fine)`. No celular ela não é desenhada nem baixada: a foto revelada ganhou `soOnde`, que põe o arquivo num `<source>` com essa mesma regra. Só `display: none` não bastava, porque o navegador baixava as fotos do mesmo jeito.
- **Segue os filtros, a ordem e a troca sem recarregar.** Os itens levam `data-chave` (`m:<id>` e `a:<ano>`) e `data-ano`, e a troca conhece dois tipos novos de item (`lista` e `ano-da-lista`). Da lista para o mural ou para a linha do tempo, os itens aparecem no lugar: a foto não viaja, porque na lista ela está escondida.

**A página da pessoa com "Forma de ver"** (resposta do Gui à pergunta 8 do PR #36): linha do tempo, que é o padrão, mural e lista. A escolha fica no endereço (`/pessoas/<id>?ver=mural`), funciona sem script (o link volta a `#memorias-com`) e, com script, troca sem recarregar, com o controle parado no mesmo ponto da tela. Para isso a troca passou a valer na página em que se está, e não só em `/explorar`, e o voltar do navegador deixou de buscar a página quando só a âncora muda. O mural da pessoa usa o tamanho de fotos guardado no aparelho e não tem o controle "Fotos". O controle só aparece para quem tem mais de uma memória.

**"Quem aparece", no capítulo** (resposta do Gui às perguntas 2 e 4 do PR #37). No celular é uma linha de nomes corrida, sem fotos, "Gui (6), Elizete (5)", na capa, sem empurrar as memórias. A partir de 62rem, a lista com retratos, como estava.

**O link do título na linha do tempo** (defeito apontado pelo Gui). Medido com o Playwright: o link tinha 30 px de altura quando o título cabia numa linha, e o contorno do foco ficava em volta da memória inteira, mais alta que a tela do celular, de modo que só as laterais apareciam. Agora o link tem 44 px nele mesmo e o contorno fica no próprio título. A memória inteira continua levando à página dela. O título de uma linha ficou 14 px mais alto, e as capturas da linha do tempo mudam nessa medida. Teste em `testes/visual.test.ts` (`describe('ajustes…')`).

**Conferido:** no navegador, em 1280 px com mouse e com movimento reduzido, e em 390 px com toque: a foto no mouse e no foco, sem cobrir o texto da linha; nenhuma foto pedida no celular; a troca entrando e saindo da lista, com a família, e o voltar; a página da pessoa nas três formas; sem script; alvos de 44 px; a linha de nomes do capítulo.

**Capturas:** `CAPTURAS_SO=^ajustes npm run capturas -- tirar <pasta>`, em `docs/visual/fase-3/ajustes/`. O script ganhou `depois`, para o que precisa valer na hora da captura (o mouse em cima de uma linha, o foco do teclado).

### Parte 2: a frase na abertura, o resumo ao lado e a zona de perigo

**A frase também na abertura da Nova memória** (resposta do Gui à pergunta 1 do PR #38). "Isso aconteceu *em 24 de dezembro de 2025*, *em Belo Horizonte*, *com Aguilar, Elizete, Giovanna e mais 6*." fica no alto da página, abaixo da frase de boas-vindas, na memória nova, no rascunho e na correção.

- **Cada lacuna diz o que já foi preenchido e leva à etapa em que aquilo se preenche:** a data e o lugar, a "Quando e onde" (a da data abre o controle e põe o foco no ano; a do lugar, no campo do lugar); "com ___", a "Quem estava?". Vazias, perguntam: "em que data?", "em que lugar?", "com quem?".
- **As sete etapas, a ordem e o obrigatório não mudam.** A lacuna usa o mesmo caminho da trilha: para ir adiante, o obrigatório das etapas do caminho precisa estar preenchido, e quem ainda não deu o título fica na primeira, com o aviso.
- **Na etapa "Quando e onde" a frase da abertura sai**, porque a frase com a data e o lugar já é a própria pergunta. Volta nas outras.
- **As lacunas são trechos da frase com papel de botão** (`role="button"`, como a da data na etapa), com 44 px de toque, foco visível, Enter e barra de espaço.
- **Sem script, a frase não aparece:** as etapas já vêm todas em sequência, e a frase não teria o que fazer.
- **Onde está:** a marcação em `src/pages/nova.astro` (`data-frase-abertura`, no `slot="frase"` que `formularios/Pagina.astro` ganhou), o script na mesma página (`escreverAbertura`), o estilo em `formulario.css` (`.frase--abertura`).

**O resumo ao lado, no computador** (resposta do Gui à pergunta 7 do PR #38). A partir de 62rem, o formulário da memória tem três colunas: a trilha, a pergunta e, à direita, "A memória até aqui".

- **O que mostra:** a foto-chave como foto revelada (a marcada em "Usar na linha do tempo" ou, sem marca, a primeira; a foto recém-enviada entra na hora) ou, sem foto ainda, o cartão do tipo de momento escolhido, como a memória sem foto; o título em serifa; e a ficha com Tipo, Quando, Onde, Quem estava, Fotos, Capítulo e Quem vê. O que ainda não foi preenchido aparece em itálico suave ("a informar", "ninguém marcado").
- **Acompanha o preenchimento:** cada tecla e cada escolha. O mesmo leitor do formulário (`lerPreenchido`) serve ao resumo da última etapa, à frase da abertura e a este resumo.
- **No celular não existe**, e a foto não é pedida: a regra geral esconde, o script só o preenche em 62rem ou mais, e a foto revelada usa `soOnde`.
- **Parado à vista só onde há mouse** (`(hover: hover) and (pointer: fine)`), com `sticky`; sem `fixed`.
- **É apoio para quem vê a tela:** não recebe foco e não tem `aria-live`, para o leitor de tela não ouvir cada tecla duas vezes. O resumo da última etapa ("Confira antes de publicar") continua sendo o que se confere.
- **Sem script, não aparece.**
- **A grade:** o resumo ocupa sessenta linhas da grade do formulário (`grid-row: 1 / span 60`), de propósito: assim a altura dele se espalha por linhas vazias no fim, e não abre vão entre a pergunta e as ações. No esqueleto da página, que tem espaço entre as linhas, a mesma conta abria três mil pixels de vazio: ali o resumo do relato ocupa três linhas.
- **No relato**, à direita, a foto-chave e a ficha da memória de que o relato fala (`ao-lado--fixo`), sem mudar enquanto se escreve. **No capítulo, na pessoa e nas telas utilitárias, nada à direita** (pergunta para o Gui).

**A zona de perigo** (pedido do Gui, 17/11/2026, junto da resposta à pergunta 12 do PR #38). Peça nova do sistema: `ZonaDePerigo.astro`, classe `perigo`, mostrada em `/sistema`.

- **O que é:** um bloco no fim da tela de editar, fora do formulário que salva, com a borda e o título na cor de alerta, uma frase dizendo o que acontece e o caminho para a confirmação. Nada é apagado ao primeiro toque, e o botão que confirma continua cheio na cor de alerta.
- **Memória (`/nova?id=`):** "Excluir esta memória", para os administradores, ou "Descartar este rascunho", para quem escreveu. Tomou o lugar do link pequeno "Descartar este rascunho" de baixo do formulário, e a correção de memória publicada ganhou o caminho de excluir, que antes só existia na página da memória.
- **Capítulo (`/capitulos/<id>/editar`):** "Excluir capítulo", para os administradores.
- **Laço e casal (`/pessoas/<id>/editar`):** dentro do editor de cada laço, "Remover este laço" e "Apagar, foi cadastrado por engano" ficam numa zona menor, depois do "Salvar", com a confirmação no lugar de sempre (`ConfirmarRemocao`).
- **As permissões não mudaram:** o bloco só aparece para quem já podia apagar (`podeExcluirMemoria`, administradores no capítulo, quem mexe nos laços) e some quando não há nada.
- **O que ficou onde estava:** "Remover foto", em cada foto da memória, e "Tirar foto", no retrato. Só valem quando a pessoa salva, e as páginas de leitura continuam com "Excluir" por último.

**Testes:** `describe('ajustes: a frase na abertura, o resumo ao lado e a zona de perigo')`, em `testes/visual.test.ts`: as três lacunas e a etapa de cada uma, as sete etapas na ordem, o que some sem script, os 44 px, o resumo fora do celular e sem `aria-live`, e a zona fora do formulário, só para quem pode, em toda remoção de laço.

**Conferido:** com o Playwright, em 1280 e 390 px, com e sem movimento reduzido, só pelo teclado: da abertura vazia até salvar um rascunho, passando pelas três lacunas, com o resumo acompanhando título, tipo, data, lugar e pessoas; a zona de perigo levando à confirmação e o rascunho de teste descartado por ela; sem JavaScript, a correção sem a frase e sem o resumo, com a zona e as etapas em sequência. As capturas (`ajustes-4-…`, `ajustes-5-…` e `ajustes-6-…`) foram olhadas nas três larguras.

**O que não foi conferido:** o envio de uma foto nova chegando ao resumo ao lado (a troca da foto-chave foi vista só com as fotos que a memória já tem), o iPhone de verdade e a prévia publicada.

### Parte 3: a árvore nítida no zoom, o cartão de bicho e a conferência final

**A árvore nítida em qualquer zoom** (defeito apontado pelo Gui, 17/11/2026: ao aproximar, texto, cartões e linhas perdiam nitidez, como imagem ampliada).

- **A causa provável.** As duas camadas do mapa (`.mapa__camada`) tinham `will-change: transform` sempre ligado, e o zoom é um `transform: scale`. Com a camada promovida o tempo todo, o navegador pode desenhá-la uma vez, a 100%, e só esticar esse desenho ao aproximar.
- **Não foi reproduzido nesta sessão.** O único navegador disponível aqui é o Chromium, que redesenha a camada na escala nova mesmo com `will-change`: as capturas de antes e depois saíram iguais, nítidas nas duas. O comportamento descrito pelo Gui é o conhecido do Safari (iPhone e Mac), que não pôde ser aberto aqui. **A correção precisa ser conferida pelo Gui no iPhone e no Safari do computador.**
- **A correção.** A camada só é promovida enquanto o gesto dura: `aplicarVista`, em `src/lib/cliente/arvore.ts`, põe a classe `mapa__camada--em-gesto` (a única regra com `will-change`, em `telas/arvore.css`) e a tira 180 ms depois do último movimento, ou depois da transição quando o zoom é pelos botões. Sem a promoção, o navegador desenha de novo na escala nova. O gesto continua solto, porque durante ele a camada segue promovida.
- **O que não mudou:** `arvore-montagem.ts`, `arvore-desenho.ts` e os testes `testes/arvore-*.test.ts`; arrastar, a pinça com dois dedos, a rolagem com Ctrl e o ponto sob o cursor parado durante o zoom (conferido: desvio menor que 1 px).
- **O zoom vai até 400%** (era 200%). Provisório, pergunta 10 do PR: é até onde o Gui pediu para conferir.
- **Se o Safari continuar borrado depois disto**, a saída seguinte é ampliar pelo tamanho real (a propriedade `zoom` do CSS na camada, no lugar do `scale`), que pede conferência no aparelho porque muda como as medidas da camada são lidas.
- **Defeito achado no caminho e corrigido:** com o mouse, arrastar o mapa começando em cima de um cartão virava o arrasto de link do navegador, e o mapa parava no primeiro passo. O mapa agora recusa esse arrasto (`dragstart`).
- **Teste:** `describe('ajustes: a árvore nítida no zoom, o cartão de bicho e a foto da lista')`, em `testes/visual.test.ts`: nenhuma regra de `arvore.css` liga `will-change` além da classe do gesto, sem `translate3d`, e toda mudança da vista passa por `aplicarVista`.

**O cartão de bicho** (achado do Gui, 17/11/2026: a espécie, o nome e o parentesco encostavam na curva das pontas). A cápsula tinha o raio de meia altura (38 px), e a espécie começava a 17,6 px da borda, onde a curva ainda estava a 19,5 px: o texto ficava em cima dela. Agora o raio é 28 px (`1.75rem`), a margem de dentro é 21,6 px (`1.35rem`) e a espécie desce para 8 px do alto. A folga entre o texto e a curva fica em 13 px, perto dos 11 px do cartão de pessoa. A caixa continua 150 por 76, então o desenho e as linhas não mudam, e a forma segue reconhecível: o cartão de pessoa tem um canto reto, e o de bicho é todo arredondado. Nome longo corta com reticências antes do selo "♥ N". O teste confere a conta da folga.

**A foto da lista e a conta do ano** (defeito da parte 1). Na primeira e na última linha de um bloco, a foto do mouse passava por cima da conta "N memórias" do cabeçalho do ano. A conta saiu da margem da foto: o cabeçalho tem o mesmo recuo à direita das linhas, e a conta fica alinhada com o fim do texto delas. Medido em 1280 e 1920 px, no Explorar e na página da pessoa: nenhuma foto encosta em cabeçalho.

**Conferido nesta parte**

- A árvore em 100%, 200% e 400%, num monitor de alta densidade (1280 px, densidade 2) e num celular emulado (390 px, densidade 3, com toque), com capturas do mesmo cartão e da linha tracejada: `ajustes-8-arvore-zoom-<zoom>--<monitor ou celular>.jpg`. Só Chromium.
- Os gestos, com e sem movimento reduzido: rolagem com Ctrl com o ponto parado, botões, o máximo de 400%, arrastar a partir do vazio e a partir de um cartão, e a pinça com dois dedos (pelos eventos de ponteiro).
- O cartão de bicho com nome longo e o selo "♥ 12": `ajustes-9-arvore-bicho-nome-longo-e-selo.jpg`.
- A "Forma de ver" da página da pessoa só pelo teclado, em 390 e 1280 px: cada opção alcançada pelo Tab, com 44 px e contorno, a troca sem recarregar, o foco na opção e ela parada no lugar.
- As capturas que as partes 1 e 2 não tinham olhado: a lista em 1920 px (por tempo, filtrada e mais contadas), a lista mais contadas e a pessoa em lista no celular, a pessoa na linha do tempo no celular e em 1280 px, o mural da pessoa em 1280 e 1920 px, a pessoa em lista em 1920 px, o capítulo em 1280 e 1920 px, e três telas de formulário em 1280 px depois do último acerto. E, para garantir que a mudança na foto revelada e no título da linha do tempo não quebrou nada, a linha do tempo, o painel e o capítulo em 390 px, e a linha do tempo, a memória e a árvore em 1280 px.

**O que não foi conferido**

- **Safari, no iPhone e no computador:** a nitidez da árvore, que é o motivo do item. E a pinça com dois dedos de verdade.
- A árvore em 1920 px depois da mudança do cartão de bicho, e as capturas de `docs/visual/fase-3/familia/`, que ainda mostram o cartão de bicho antigo.
- As telas de formulário em 390 e 1920 px depois do último acerto da parte 2, o capítulo e a pessoa em edição com a zona de perigo, e a lista filtrada em 1280 px.
- A prévia publicada e a contagem de erros do `tsc`.
- Na pinça, o ponto entre os dedos desvia alguns pixels quando os dois dedos não se movem juntos. Já era assim antes desta mudança: o zoom é feito em torno do meio dos dedos a cada movimento, sem acompanhar o deslocamento do meio.

**PR dos ajustes:** #39, para a `homologa`, aberto em 17/11/2026, sem merge. As dez perguntas para o Gui estão no fim dele (as nove das partes 1 e 2 e a do zoom máximo da árvore).

**O que falta depois dos ajustes**

- **`tst-visual-tipos`**: construída em 17/11/2026, no PR #40, que depende do #39 (ver "Tipos: paleta e ícones", no fim deste arquivo). A marca "A MUDAR" da pergunta 11 do #38 saiu ali.
- **No iPhone e no Safari do computador:** a nitidez da árvore no zoom, a lista, a frase da abertura e a zona de perigo.
- **Numa TV de verdade:** o modo TV com o controle, e os formulários em 1920 px com o resumo ao lado.
- **Refazer as capturas da árvore** em `docs/visual/fase-3/familia/`.

## Tipos: paleta e ícones

Construído em 17/11/2026 na branch `tst-visual-tipos`, nascida da `tst-visual-ajustes`. O PR é o #40, para a `homologa`, aberto e sem merge; depende do #39. As sete perguntas para o Gui estão no fim dele. É a resposta do Gui à pergunta 11 do PR #38: em `/admin/tipos`, a cor vira uma escolha numa paleta ampliada do sistema e entra um seletor de ícone entre os rabiscos.

**A paleta.** São 23 cores: as onze aprovadas em 16/11/2026, que não mudaram de valor, e doze novas (limão, oliva, menta, musgo, céu, petróleo, anil, uva, ameixa, cereja, terracota e cacau), cada uma nos quatro tons de sempre (pastel, meio, vivo e tinta), em `src/visual/tokens.css`. A lista e os nomes estão em `src/lib/visual.ts` (`CORES`, `CORES_NOVAS`, `PALETA`, `NOMES_DAS_CORES`). As onze continuam sendo as das famílias e dos capítulos; as doze novas só entram pela escolha do tipo.

**O contraste é conferido por teste** (`testes/paleta.test.ts`), com a conta da WCAG feita sobre os valores de `tokens.css` (`src/lib/contraste.ts`):

| Regra | Vale para |
| --- | --- |
| A tinta da cor sobre o papel e sobre a moldura branca: 4,5 para um | As 23 |
| O texto do site sobre o pastel da cor: 4,5 para um | As 23 |
| A tinta da cor sobre o pastel dela: 4,5 para um | As doze novas e sete das onze |
| O vivo longe do pastel da mesma cor, pelo menos como na manteiga | As doze novas |
| Nenhuma cor mais perto de outra do que as duas mais próximas entre as onze (ardósia e azul no pastel, coral e pêssego no vivo) | Todos os pares |

**Quatro das onze aprovadas ficam abaixo de 4,5 com a tinta sobre o próprio pastel:** pêssego (3,9), coral (4,2), rosa (4,2) e manteiga (4,4). Não foram mexidas, porque são cores que o Gui aprovou; o teste guarda o valor de hoje como piso e a página do sistema marca as quatro. É a pergunta 4 do PR.

**O vivo sobre o pastel não chega a 3 para um em quase nenhuma cor**, nem nas onze aprovadas (a manteiga tem 1,5): o vivo é ponto de destaque, nunca texto. Por isso a regra do vivo é de distância entre as duas cores, e não de contraste de leitura.

**Os rabiscos.** São 30: os onze de sempre e dezenove novos, no mesmo traço (caixa de 24 por 24, traço de 1,6 com pontas redondas, sem preenchimento): capelo, mamadeira, sol e mar, pinheiro, garfo e faca, nota musical, bola, patinha, livro aberto, carro, presente, câmera, coração, sol, caixa de mudança, taça, barraca, montanha e peixe. Os desenhos e os nomes estão em `src/visual/rabiscos.ts`; `IconeDoTipo.astro` só desenha. Um chocalho foi desenhado e trocado pela mamadeira: parecia uma lupa.

**Como a escolha chega à tela.**

- A tabela `tipos` ganhou `cor_da_paleta` e `icone` (migração `021-cor-e-icone-dos-tipos`). Os onze tipos de sempre receberam a cor e o rabisco que já mostravam, então nada muda de aparência; tipo criado antes pelos administradores fica sem escolha e continua com a cor de reserva e o brilho. A coluna antiga `cor` fica como está e não é mais lida.
- `corDoTipo`, `estiloDoTipo` e `iconeDoTipo` (`src/lib/visual.ts`) leem a escolha; sem escolha, ou com um nome que não existe, vale a reserva (`corDeReserva` e o rabisco com o id do tipo). Nenhuma tela precisou mudar: todas já pintavam por `estiloDoTipo` e pelo `IconeDoTipo`.
- A lista de tipos do pedido fica guardada junto do pedido (`guardarTiposDoPedido`, em `src/lib/servidor/ambiente.ts`), e não numa variável do módulo, porque o mesmo servidor atende a homologação e as prévias, cada uma com o banco dela.
- `/api/tipos` só aceita nome de cor da paleta e nome de rabisco da lista, e só de administrador.
- O espelho da produção não mexe na tabela `tipos`, e a cópia do acervo leva as colunas novas sozinha.

**A tela (`/admin/tipos`).** Cada tipo é uma linha com a etiqueta dele, que abre no lugar (um por vez): o nome, a grade de cores, a grade de desenhos e, ao lado, a prévia com a etiqueta e o cartão da memória sem foto. As duas grades são rádios de formulário comum: funcionam sem script e pelo teclado, e a escolhida leva o tique e o negrito, além da cor. A amostra de cor diz quem já usa ("em Viagem"); repetir cor continua podendo, como sempre pôde, e o tipo novo já vem com uma cor que ninguém usa. Com script, a prévia acompanha a cor, o desenho e o nome na hora. No "Outro", o tipo criado a partir de um texto escolhe a cor numa lista e nasce com o brilho; o desenho se escolhe depois. O estilo está em `src/visual/telas/tipos.css` e a peça da escolha, em `src/components/formularios/EscolhaDoTipo.astro`.

**A página do sistema** mostra as doze cores novas, a tabela do contraste das 23 e todos os rabiscos com o nome.

**Conferido:** trocar a cor e o desenho de um tipo só pelo teclado, em 390 e 1280 px, e ver a troca chegar à memória e à linha do tempo; criar um tipo; sem JavaScript; alvos de 44 px e foco visível; a API recusando cor e desenho fora das listas e quem não é administrador; a migração num banco local novo. As telas do Explorar, da memória e do painel foram capturadas com a escolha valendo e sem ela, e saíram iguais pixel a pixel (a única diferença foi um retrato que não tinha carregado numa das rodadas).

**Capturas.** `CAPTURAS_SO='^tipos' npm run capturas -- tirar <pasta>`. Estão em `docs/visual/fase-3/tipos/`; as duas com o tipo trocado (`tipos-3-…`) foram tiradas à parte, com "Viagem" em cereja e com a montanha, e o tipo voltou ao azul depois.

**O que falta:** a resposta do Gui às perguntas do PR (as cores novas, os rabiscos, os textos e as quatro cores abaixo de 4,5); conferir no iPhone; e, se ele quiser, exemplos de tipos novos no acervo de exemplo.
