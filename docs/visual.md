# Direção visual

O que vale para construir: a direção, o nível de qualidade, o sistema e como usá-lo, e a regra de cada tela como ela é hoje. A análise das referências está no documento "Direção visual: análise das referências" (Claude Docs: https://claude.ai/artifact/RtLSAGbAbnsRVpHsFXzcxw). O relato das fases 1 a 3, dos grupos de telas e das partes de ajuste está em [`historico/visual-ate-2026-11-17.md`](historico/visual-ate-2026-11-17.md), linkado no fim de cada seção.

A ideia em uma frase: um álbum de família editado. Papel claro, títulos em serifa macia, legendas pequenas em mono com lugar e ano, foto tratada como objeto (polaroid, monte de fotos, retrato recortado) e movimento discreto, que qualquer pessoa entende sem pensar.

## Para quem

A família inclui gente com pouca familiaridade com sites, usando sobretudo o celular. A Elizete teve dificuldade com a rolagem diferente da página Sobre da @bsurda. Toda escolha visual passa por essa pergunta: a pessoa entende sem pensar?

Origem: [histórico, "Para quem"](historico/visual-ate-2026-11-17.md#para-quem).

## A direção

A régua de qualidade é o bayara.design e o site da @bsurda (repositórios `guilhermebayara/bayara` e `guilhermebayara/absurda`): alto nível, sem concessão.

### A ideia central: a caixa de fotografias da família

Toda casa tem uma, com fotos reveladas, um envelope do laboratório e, no verso de cada foto, alguém escreveu à mão quem estava e quando. O site usa esse vocabulário na composição e na tipografia, nunca em textura. Nada de papel envelhecido, fita adesiva ou moldura de álbum: o resultado parece revista, não scrapbook.

- **A foto e o verso.** A memória é uma foto com o seu verso. A frente é a imagem; o verso é a ficha em mono, como o carimbo do laboratório de revelação ("14 AGO 1994 · BELO HORIZONTE"), e os relatos, assinados à mão.
- **O ano como divisória.** Na linha do tempo, cada ano ou década abre com o número grande em serifa, como as abas de um fichário.
- **A cor de cada família.** Cada família tem sua cor pastel, como a capa do álbum de cada casa. A versão saturada marca o que importa naquela tela.

### Uma ideia forte por tela

| Tela | A ideia | O que fica quieto |
| --- | --- | --- |
| Painel (página inicial) | Na primeira visita, a carta de Natal assinada à mão pelo Gui, pela Giovanna e pelo Magno. Depois, o que entrou de novo, como quem abre a caixa e acha fotos que não estavam lá | Aniversários e atalhos, em segundo plano |
| Explorar na linha do tempo e famílias | A assinatura ("MEMÓRIAS" e os sobrenomes) grande, e logo o ano mais recente abrindo a lista | Menu e filtros pequenos |
| Linha do tempo | O ano grande como divisória e as fotos-chave como polaroids | A ficha de cada memória em uma linha mono |
| Explorar, mural e modo TV | No mural, só as fotos, como a caixa aberta na mesa. No modo TV, uma memória por vez, grande, para ver junto | Filtros e ordem recolhidos numa linha |
| Memória | A foto e o verso: a imagem grande, a ficha como carimbo, os relatos como bilhetes assinados | Corrigir, histórico |
| Pessoa | O retrato e a voz: retrato recortado, parentesco grande ("sua avó"), os áudios dela | A lista de laços |
| Capítulo | Abertura de capítulo de livro: título, período, marcos numerados | Edição |
| Árvore | As famílias em cor, cartões como etiquetas com nome e parentesco | Camadas e controles |
| Formulários | Uma pergunta por tela, grande, em serifa, como quem conversa | A trilha das etapas |
| Sua conta | O retrato e o nome da pessoa no alto, e as coisas dela em ordem: dados, o que criou, avisos, rascunhos, laços | A administração, ao lado do nome no desktop e no fim no celular, só para quem administra |
| Rascunhos, lixeira, administração | Utilitário e silencioso | Tudo |

### Decisões

| Assunto | Decisão |
| --- | --- |
| Claro ou escuro | Claro, sem modo escuro. Quando uma seção precisa se destacar, o fundo é colorido, nas cores das famílias |
| Títulos | Serifa macia |
| Texto | Grotesca neutra |
| Legendas e fichas | Mono pequena |
| Manuscrita | No nome de quem conta cada relato, nas assinaturas da carta e, no mural, no título da memória na margem |
| Fonte | A combinação C, De cartaz: DM Serif Display, DM Sans, DM Mono e Nothing You Could Do (ver "Como a fonte é trocada") |
| Cor | Pastéis como cores principais, em blocos sólidos. Cada cor tem uma versão saturada para pontos de contraste e destaques, que também pode ser usada inteira. Vale para as cores, não para os neutros |
| Neutros | Quente e aconchegante: papel creme e tinta de café, sem chegar ao preto puro |
| Cores das famílias | Cada família tem uma cor só, com variação de tons: Bayara é verde, a cor da Elizete; Bayara Bracarense é orquídea, o meio-termo entre o rosa da Giovanna e o roxo do Magno, sem favorecer um dos dois; Bracarense é azul; a família completa é manteiga. Os valores estão em `src/visual/tokens.css` |
| Cores dos tipos de momento | Escolhidas pelos administradores numa paleta de 23 cores, com um rabisco entre 30 (ver "Tipos: paleta e ícones"). A abertura da memória é um bloco inteiro na cor do tipo |
| Foto revelada | Toda foto-chave da linha do tempo é uma foto revelada. O formato lembra a Fujifilm Instax, que a Giovanna e o Magno usam muito, sem ser literal: retrato, cantos arredondados, margem de baixo larga |
| Linha do tempo | Lista vertical com a rolagem normal, das mais recentes para as mais antigas, sem efeito de folhear nem carrossel |
| Marca | "MEMÓRIAS" é a palavra principal e fixa. Abaixo dela vêm os sobrenomes das famílias do que está sendo visto (ver "Assinatura do nome"). O símbolo é um monograma com o M de Memórias |
| Ícones e ilustrações | Cabem, com limpeza e elegância, para trazer leveza e alegria. O site continua tipográfico: um ícone de traço para cada tipo de momento, rabiscos de caneta (sublinhado, seta, coração) e o envelope do laboratório no painel |
| Páginas íntimas | O que só a pessoa vê (o painel, a conta, o círculo) tem cara de espaço íntimo: a página inteira tingida na cor da família da pessoa e o conteúdo em cartões. O painel diz "Só você vê esta página". Quem está em mais de uma família vê a cor da mais recente: a Giovanna e o Magno, a da família que criaram juntos (`familiaMaisRecente`, em `src/lib/familias.ts`) |
| "Família", e não "núcleo" | O site não mostra o termo "núcleo", que fica só para a lógica. Na tela, é "família" |
| Menu | "Início" no menu, no computador e no celular, e "Memórias", no alto, leva ao início: quem tem menos familiaridade com sites não precisa adivinhar. No celular, o menu é uma sanfona |

### Referências

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

Origem: [histórico, "Revisão do zero"](historico/visual-ate-2026-11-17.md#revisão-do-zero-decisão-do-gui-16112026); ["Decisões"](historico/visual-ate-2026-11-17.md#decisões); ["Referências"](historico/visual-ate-2026-11-17.md#referências); ["Conceito"](historico/visual-ate-2026-11-17.md#conceito-fase-1-em-aprovação).

## O nível de qualidade

O que o bayara.design e a @bsurda fazem e este site precisa fazer:

- **Disciplina de tipo.** O bayara usa uma família só e tira a hierarquia de tamanho e espaço, com títulos grandes de espaçamento justo. Aqui são três famílias com papéis fixos (serifa nos títulos, grotesca no texto, mono nas fichas), e nenhuma aparece fora do seu papel.
- **Grid rígido e alinhado à esquerda.** Colunas fixas, tudo começa na mesma linha. Alinhamento óptico no tipo grande.
- **Cor com função.** No bayara, o azul marca o resultado e o terracota marca um custo. Aqui, o pastel marca a família e o saturado marca o que importa. Cor sem função não entra. Deleite visual também é função (decisão do Gui, 16/11/2026): a cor pode entrar para dar alegria e aconchego, como a forma colorida atrás de cada foto. O limite fica entre os dois sites de régua: mais cor que o bayara.design, que é quase mono, e sem chegar ao extremo da @bsurda.
- **Objeto com sentido.** O crachá da @bsurda imita uma coisa real do mundo da festa. Aqui, a polaroid e o carimbo do verso imitam o mundo da família.
- **Ações tipográficas.** Links e ações secundárias são texto sublinhado, sem pílula. Botão cheio só para a ação principal da tela.
- **Padrões que as pessoas já conhecem** (premissa do Gui, 18/11/2026). Não reinventar um padrão forte que já existe nas plataformas que a família usa: quem chega encontra o que já sabe usar. Ações secundárias de um item moram num botão de menu (os três pontos); reagir é como nas redes (um toque marca o coração, segurar abre as outras); compartilhar abre a folha do aparelho. Inventar um jeito novo só quando nenhum padrão serve, e com motivo escrito.
- **Interação sem recarregar a página** (premissa do Gui, 18/11/2026). Reagir, marcar, abrir e fechar, salvar um ajuste e responder um aviso acontecem no lugar, sem recarregar e sem perder a rolagem. Sem JavaScript, o formulário continua funcionando e recarrega, como reserva.
- **Gestalt em toda tela** (premissa do Gui, 17/11/2026). Quem olha precisa entender o que vai com o quê sem ler. Três princípios, sempre:
    - **Proximidade:** o espaço entre grupos é pelo menos o dobro do espaço dentro do grupo, no mesmo lugar. Um rótulo ou título fica bem mais perto do que ele nomeia do que do grupo anterior: espaço acima dele pelo menos o dobro do espaço abaixo. "Quase o mesmo antes e depois" é defeito (foi o caso das linhas na legenda da árvore).
    - **Semelhança:** o que tem a mesma função tem a mesma cara (as famílias são sempre pill; ações iguais têm o mesmo peso), e o que tem função diferente não se parece.
    - **Região comum:** quando a proximidade não basta, o grupo ganha um limite visível (cartão, fundo recuado, fio), nunca as duas coisas juntas sem motivo.
  Na prática: espaço dentro de um grupo usa `--e-1` a `--e-4`, entre grupos `--e-5` a `--e-7`, e o degrau entre os dois respeita o dobro (um rótulo com `--e-3` abaixo pede `--e-6` acima, não `--e-5`). Toda conferência visual, de sessão de construção ou de QA, olha os grupos de cada tela antes de olhar os detalhes.
  Exemplo em uso: na legenda da árvore, os grupos ficam a `--e-6` uns dos outros, e o título e os itens a `--e-2`. Antes de entregar uma tela, confira se algum título ficou com quase o mesmo espaço antes e depois. A conferência automática está em "Decidido, a construir", em `docs/decisoes.md`.
- **Detalhe pequeno que se nota.** Como o nome do topo do bayara, que se preenche quando o nome grande sai da tela. Um ou dois no site, nunca em toda parte.
- **Celular primeiro, desktop de destaque.** A família vai usar quase só no celular, então cada tela nasce em 390 px. O desktop é o momento especial, a versão de ver juntos na TV: cada tela ganha composição própria em tela grande (de 1280 a 1920 px), com fotos grandes e tipo de capa, e nunca é o celular esticado.

Origem: [histórico, "O nível de qualidade"](historico/visual-ate-2026-11-17.md#o-nível-de-qualidade); ["Quadro do mapa"](historico/visual-ate-2026-11-17.md#quadro-do-mapa-árvore-e-círculo).

## Fundações que não mudam

O visual pode mudar a aparência e a composição de tudo (grid, escala de tipo, espaços, componentes, a abertura de cada página, como a foto entra na tela). A marcação das páginas pode mudar à vontade, desde que os scripts de `src/lib/cliente/` e os testes continuem achando o que precisam. Isto não muda junto:

| Fundação | O que não muda |
| --- | --- |
| Dados e regras | Banco, migrações, permissões, visibilidade, rascunho, lixeira, histórico, núcleos e parentes, espelho |
| Árvore | O comportamento inteiro: arranjo, lados das famílias, linha direta, ramos recolhidos em cartão, laços do coração, regras das linhas (`testes/arvore-*.test.ts`), arrastar e aproximar. Muda só a aparência |
| Fluxos | Cadastro guiado por caminho, as sete etapas da Nova memória e o que é obrigatório, "Quem estava?" com sugestões, busca de pessoa, data flexível, relato com áudio, corrigir e restaurar ("Interação dos formulários", em `docs/decisoes.md`) |
| Organização | As páginas e o que cada uma contém, a ordem da linha do tempo e a ordem da página da memória |
| Textos de interface | O jeito de falar ("sua avó", o botão diz o que acontece) e os nomes das ações |
| Acessibilidade | Funciona sem JavaScript, por teclado, com movimento reduzido, toque mínimo de 44 px |

Origem: [histórico, "O que fica (fundações)"](historico/visual-ate-2026-11-17.md#o-que-fica-fundações); ["O que se refaz"](historico/visual-ate-2026-11-17.md#o-que-se-refaz).

## Movimento

Regra: a rolagem é sempre a do aparelho, e nenhum efeito quebra um padrão de navegação conhecido. Efeito é bem-vindo, sem excesso.

Entram:

- o cartão que aparece com um esmaecer curto;
- a sanfona que abre empurrando o conteúdo;
- a foto que amplia ao toque e fecha ao tocar fora;
- o item da barra de décadas que acende;
- uma frase de abertura que acende palavra por palavra como na home do bayara.design: acompanha a rolagem natural, não prende a página e aparece pronta com movimento reduzido.

Ficam de fora: cartão que deita ao rolar, foto que cresce enquanto se rola, carrossel lateral, anel 3D, imagem distorcida, tela de carregamento com porcentagem, faixa que corre sozinha e qualquer trecho que segura a página. Com movimento reduzido, nem o esmaecer.

**Movimento que mostra o que mudou.** No Explorar e na página da pessoa, trocar filtro, família, ordem ou forma de ver nunca recarrega a página nem tira a pessoa do lugar. Os itens que continuam na tela se movem até o lugar novo, como fotos rearranjadas na mesa; os que saem somem onde estão e os que entram aparecem no lugar deles. Um esmaecer da tela inteira não serve. A rolagem fica presa ao que a pessoa estava olhando: o mesmo ano ou o mesmo item continua no mesmo ponto da tela, ou no ano mais próximo quando o dele saiu. O endereço acompanha sem recarregar, para o link continuar servindo, e voltar no navegador desfaz a troca do mesmo jeito. Sem script, tudo continua funcionando com o recarregamento. Com movimento reduzido, a troca é direta, sem deslocamento.

**O modo TV é o lugar de experimentar.** É a tela em que o movimento pode ousar mais, porque é para ver junto, parado, na sala: passagem entre memórias com mais caráter, a foto que se aproxima devagar enquanto a memória está na tela, o título e o trecho do relato chegando aos poucos. As regras de sempre continuam: a página não se mexe sozinha fora do "Passar sozinho", as setas e o controle sempre respondem na hora e, com movimento reduzido, tudo isso desliga.

**Peças paradas no alto.** Na linha do tempo, a barra de décadas e o ano grande ficam parados no alto, em qualquer aparelho, para quem rola saber sempre em que ano está (pensando nas pessoas mais velhas). Fora disso, nada fica preso. No toque, nada é preso por `sticky` ou `fixed` (ver "Safari do iPhone e peças paradas", em "Cuidados que custaram tempo"); onde há mouse, a capa do capítulo, o alto da lista de capítulos e o resumo ao lado do relato ficam parados com `sticky`.

Origem: [histórico, "Movimento"](historico/visual-ate-2026-11-17.md#movimento).

## Sistema

O CSS está em `src/visual/` e os componentes em `src/components/visual/`. A página `/sistema` mostra tudo lado a lado.

### Onde fica cada coisa

| O quê | Onde |
| --- | --- |
| Entrada única do estilo | `src/visual/sistema.ts`: as fontes e, em ordem, `tokens.css`, `fontes.css`, `base.css`, `pecas.css` e `estrutura.css`. Todo esqueleto importa só este arquivo; cada tela soma o CSS dela, de `src/visual/telas/` |
| Tokens | `src/visual/tokens.css`, em camadas: valores (neutros e as cores em quatro tons), papéis (`--papel`, `--tinta`, `--pastel`, `--vivo`, `--alerta`), espaço e grade, escala de tipo, formas, sombras e movimento. Cor só é escrita ali |
| Larguras de tela | 62rem para o computador e 100rem para a tela grande (40rem só para ajuste de coluna). Media query não lê variável: o teste confere que nenhuma outra largura aparece |
| Peças | `src/visual/pecas.css` (as ações em `base.css`, o recado e a assinatura em `estrutura.css`) e um componente por peça em `src/components/visual/` |
| Esqueleto | `src/layouts/Visual.astro`. Recebe `nucleos`, os núcleos do que está sendo visto, e tira dali a assinatura e a cor da tela. Formulários e páginas de trabalho usam `src/components/formularios/Pagina.astro`, que monta o esqueleto |
| Funções puras | `src/lib/visual.ts`: fontes, assinatura, cor da família, da pessoa, do tipo e do capítulo, carimbo, legenda |
| Testes | `testes/sistema.test.ts` (fonte numa linha, assinatura, monograma, tokens e peças) e `testes/visual.test.ts` (regras do CSS e das telas) |

### As peças e como usar

| Preciso de | Uso | Como |
| --- | --- | --- |
| A marca no alto ou no fim da página | `Assinatura.astro` | `<Assinatura sobrenomes={...} />`; com `titulo`, vira o `h1` da página. O rodapé do esqueleto já traz uma. Lê os sobrenomes do cadastro de cada família e encolhe a linha longa |
| O M sozinho | `Monograma.astro` | `<Monograma />` mostra o da serifa em uso; `corte="pequeno"` abaixo de uns 32 px. O tamanho vem do `font-size` de quem envolve (a altura é `1em`) e a cor, do `color` |
| A foto-chave de uma memória | `Polaroid.astro` | `id`, `fotos`, `legenda` (de `legendaLugarAno`), `tipo`. `forma` põe a forma de cor atrás, `monte={false}` tira as fotos de trás, `cedo` para a foto do alto da página, `galeria` na página da memória, `soOnde` para só baixar a foto onde a regra de mídia vale. Em volta, um elemento com `style={estiloDoTipo(tipo)}`, que dá a cor |
| Data e lugar | `Carimbo.astro` | `<Carimbo itens={[carimboDaData(memoria), memoria.lugar]} />`. Item vazio não entra |
| O tipo de momento | `Etiqueta.astro` | `<Etiqueta tipo={id} rotulo={nome} />` |
| Um período ou uma data aproximada | `Pilula.astro` | `<Pilula>2018–2020</Pilula>` ("2018-2020", "por volta de 1994") |
| A ficha (quando, onde, tipo, capítulos) | `Ficha.astro` e `Dado.astro` (classe `verso`) | `<Ficha><Dado rotulo="Quando">…</Dado></Ficha>` |
| A foto de uma pessoa | `Retrato.astro` | `nome`, `foto` (o endereço, de `enderecoDoRetrato`, ou nada), `familia` (de `corDaPessoa`). `redondo` só no topo |
| Uma pessoa com nome e parentesco | classes `pessoa` e `pessoa__nome` | Um link com o `Retrato`, o nome e o parentesco em `ficha suave` (ver "Quem estava" em `src/pages/memorias/[id].astro`) |
| Uma pessoa numa lista de laços | `Gente.astro` | `href`, `nome`, `foto`, `familia`, `laco` ("sua avó") e `detalhe`, em mono. Para listas de pessoas e de laços |
| Um relato | `Bilhete.astro` | `por`, `registradoPor` (só quando não foi a própria pessoa) e o conteúdo dentro: `Audio`, depois `<div class="bilhete__texto">`. Com `href`, o bilhete inteiro vira link |
| Um áudio | `Audio.astro` | `rotulo`, `src`, `transcricao`. Usa o tocador do aparelho |
| O capítulo de uma memória | `SinalDoCapitulo.astro`, `Trilhos.astro` | `id`, `titulo` e `cor` (a posição dada pela montagem, `src/lib/linha-capitulos.ts`) |
| Reagir a uma memória, um relato ou uma foto | `Reacoes.astro` | `memoria`, `alvo` (`memoria`, `relato` ou `foto`), `alvoId`, `marcas`, `eu`, `nome`, `volta` e `sobre` ("o relato de Elizete", para o leitor de tela). O coração à vista, os quatro numa paleta que abre ao segurar ou passar o mouse, e o número que abre quem marcou. A página chama `ligarReacoes()`, de `src/lib/cliente/reacoes.ts`, para tudo acontecer no lugar |
| As ações secundárias de um item | `MenuDeAcoes.astro` | `rotulo` ("Mais ações do relato de Elizete") e as ações dentro, cada uma `<a class="menu-acoes__item">` ou `<button class="menu-acoes__item">`. Ao lado das reações, numa linha `acoes-do-item`. A página chama `ligarMenus()`, de `src/lib/cliente/menus.ts` |
| Fases de um casal ou marcos que abrem | `Sanfona.astro` | `ano`, `titulo`, `quando`, o conteúdo dentro. Sem script; o mesmo `grupo` em todas faz só uma ficar aberta |
| Recado de "salvou" ou de erro | `Recado.astro` | `<Recado>` ou `<Recado erro>` |
| Tela sem nada para mostrar | `Vazio.astro` | `<Vazio frase="…">` com a ação dentro |
| As ações de apagar de uma tela de editar | `ZonaDePerigo.astro` (classe `perigo`) | `<ZonaDePerigo>` no fim da página, fora do formulário que salva, com uma frase e o link para a confirmação. É quieta: um fio na cor de alerta em cima, sem fundo. `menor nivel={4}` dentro de um cartão, como o editor de um laço. Quem usa decide se ela aparece, pela permissão de sempre |
| Uma família que filtra ou que se escolhe | `PilulaDeFamilia.astro` | `href`, `familia` (a cor, de `corDoNucleo`, ou `tudo`), `atual` e `conta` (um número pequeno à direita, opcional), o nome dentro. Várias ficam num elemento com a classe `pilulas-de-familia`. Família é sempre pill: o ponto na cor viva e, marcada, a pílula inteira no pastel. Hoje em Pessoas; o Explorar ainda desenha as dele em `telas/linha.css` e pode passar a usar a peça |
| Uma escolha só entre poucas | `Segmentado.astro` | `rotulo`, `nome`, `opcoes` (`valor`, `texto`, `atual`), `travado` e `explicacao` (o id do texto colado embaixo). Cada opção é um rádio, que vai junto com o formulário e funciona sem script. Só em "Quem pode ver?" da nova memória; outro uso é decisão do Gui, porque em Pessoas ele confundia (dava a entender que mudava a forma de organizar) |
| Ícone de tipo, rabisco de caneta | `IconeDoTipo.astro`, `Rabisco.astro` | São enfeite: o texto está sempre escrito ao lado. Os desenhos estão em `src/visual/rabiscos.ts` |
| A ação principal da tela | classe `botao` | Uma por tela. `aria-disabled="true"` ou `disabled` para o estado sem poder agir |
| As outras ações | classes `acao` e `acao--quieta` | Texto sublinhado, em link ou em `<button>` |
| Pergunta e campo de formulário | classes `pergunta`, `campo`, `campo__rotulo`, `campo__entrada`, `campo__dica`, `campo__erro`, `campo--erro`, `escolha` | Só CSS. Os formulários do site usam o desenho de `telas/formulario.css` (ver "Formulários") |
| A frase com lacunas | classes `frase` e `frase__lacuna` | Só CSS. `--cabe` na lacuna diz quantas letras cabem. Hoje só na página do sistema: a nova memória escreve a frase dela com `.em-frase__frase` (ver "Formulários") |

Classes de texto, em `base.css`: `t-capa`, `t-1`, `t-2`, `t-3` e `t-abertura` para a serifa; `ficha` e `rotulo` para a mono; `mao` para a manuscrita; `suave` para o texto de apoio; `so-leitor` para o que só o leitor de tela lê; `miolo` para a margem da página e `grade` para as colunas.

**Medidas das peças.** A foto revelada tem a moldura branca no formato da Instax mini: foto em retrato de 46 por 62, cantos arredondados e margem de baixo bem mais larga, com a legenda "lugar (ano)" em mono. Sombra suave e quente. Inclinação entre poucos valores (−3°, −1,5°, 1°, 2,5°), escolhida pelo id da memória para ficar sempre igual. Atrás, uma forma de cor (círculo, arco ou cápsula, também pelo id) na cor do tipo de momento. O banco não guarda a orientação da foto: toda foto-chave é recortada em retrato. Com mais de uma foto, as outras aparecem atrás da principal, levemente giradas (o monte). A etiqueta-balão é uma pílula com um canto reto, na cor do tipo. O retrato é recortado em arco ou cápsula; quem não tem foto aparece com as iniciais sobre a cor da família.

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
| Os nomes das cores (`--verde-pastel`, `--azul-vivo`…) | Só para definir papéis. Numa tela, use o papel (`--pastel`, `--tipo-cor`), e não o nome da cor |
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

### Como montar uma tela nova

1. **A página usa o esqueleto novo.** `import Visual from '../layouts/Visual.astro'`, ou `formularios/Pagina.astro` para formulário e página de trabalho. O esqueleto já traz o sistema inteiro, o topo, o menu, o rodapé com a assinatura, as fontes e o ícone.
2. **Diga o que a tela mostra.** `<Visual titulo="…" nucleos={ids}>`: os núcleos da memória, do capítulo ou da pessoa, ou o núcleo filtrado. Dali saem os sobrenomes da assinatura e a cor da tela. Sem `nucleos`, vale a família completa. `familia` só quando a cor não é a dos núcleos (a memória aberta a todos passa `'tudo'`). `intimo` é para a página que só a pessoa vê, tingida na cor da família dela. `secao` acende o item do menu. `rodape` escolhe a assinatura inteira ou a metade; `mapa` pede a janela inteira, sem rodapé.
3. **O CSS da tela vai em `src/visual/telas/<tela>.css`**, importado pela própria página, antes do esqueleto. Ali fica só a composição: a grade, os espaços entre as partes, o que é próprio daquela tela. Use os tokens; cor, família de fonte, raio de cápsula e largura de tela escritos soltos não passam nos testes.
4. **A marcação usa os componentes.** Uma tela não escreve `class="carimbo"` ou `class="retrato"` na mão: `testes/sistema.test.ts` recusa. Se a peça que você precisa não existe, ela nasce em `pecas.css` com um componente, entra na página `/sistema` e na tabela acima, e é mostrada ao Gui.
5. **Celular primeiro.** A tela nasce em 390 px. A composição de computador entra em `@media (min-width: 62rem)` e a de tela grande em `@media (min-width: 100rem)`, cada uma pensada de novo, sem esticar o celular.
6. **Gestalt antes dos detalhes.** Confira os grupos de cada tela ("Gestalt em toda tela").
7. **Confira antes do push.** `npm run build`; a tela em 390, 1280 e 1920 px, por teclado e com movimento reduzido; e `npm run capturas`, com a tela nova na lista de `scripts/capturas.mjs`. Para garantir que mexer numa peça não mudou as telas já aprovadas, tire as capturas antes e depois e rode `npm run capturas -- comparar <antes> <depois>`. `CAPTURAS_SO=<expressão>` limita as telas; o script tem `depois`, para o que precisa valer na hora da captura (o mouse em cima, o foco do teclado).

### Como a fonte é trocada

- A fonte do site é `FONTES_DO_SITE`, em `src/lib/visual.ts`, hoje a combinação C. A combinação inteira: `combinacao('a')`, `combinacao('b')` ou `combinacao('c')`. Misturada: `{ ...combinacao('a'), mao: 'b' }`. Os quatro papéis são `serifa`, `grotesca`, `mono` e `mao`.
- Nada mais muda junto: o esqueleto põe `data-serifa`, `data-grotesca`, `data-mono` e `data-mao` na página, `fontes.css` responde com as variáveis, o monograma certo acende, a largura da assinatura acompanha e o ícone vem de `public/icones/<serifa>/`.
- As três combinações ficam no sistema, todas de licença livre, pelo Fontsource:

| | Serifa | Grotesca | Mono | Manuscrita | Caráter |
| --- | --- | --- | --- | --- | --- |
| A, Macia | Fraunces | Geist | Geist Mono | Oooh Baby | A mais próxima de Recoleta |
| B, Editorial | Instrument Serif | Instrument Sans | IBM Plex Mono | Reenie Beanie | Condensada, de revista. A grotesca é a mesma do bayara.design |
| C, De cartaz (a do site) | DM Serif Display | DM Sans | DM Mono | Nothing You Could Do | Pesada, de cartaz |

- A página `/sistema` tem o seletor "Fontes dos exemplos" (`?fontes=a`, `b` ou `c`), que põe os quatro atributos só no bloco dos exemplos (`.sis__exemplos`), para comparar se a decisão mudar. `/conceito/sobre` mostra as três lado a lado nas prévias.
- Nas prévias de teste e no computador, a faixa do alto troca a combinação por um cookie. Na produção e na homologação o cookie não vale. `npm run capturas` tira as capturas com a C.
- Fonte nova, fora das três: instalar pelo Fontsource, acrescentar a opção em cada papel de `fontes.css` (a serifa pede `--assinatura-em`, `--sobrenomes` e `--ano-em`, medidos na tela até "MEMÓRIAS" e "Bayara & Bracarense" fecharem na mesma largura), acrescentar em `scripts/monograma.mjs` e rodar `npm run monograma`.

### Assinatura do nome

O rascunho do Gui está em `docs/visual/assinatura-hierarquia.png`. A regra dos sobrenomes está em `docs/decisoes.md`, "Assinatura do nome".

- "MEMÓRIAS" é a palavra principal e não muda: em caixa alta, grande, na serifa dos títulos.
- Logo abaixo vêm os sobrenomes das famílias, em caixa alta e baixa, bem menores (perto de metade da altura de "MEMÓRIAS"), alinhados à esquerda.
- Quem monta a linha é `assinaturaDaTela`, em `src/lib/visual.ts`. A medida dos sobrenomes foi tirada para "Bayara & Bracarense" fechar na largura de "MEMÓRIAS"; uma linha mais longa encolhe na proporção (`encolheDaAssinatura`, com a largura das letras de cada serifa em `src/visual/medidas-das-serifas.ts`).
- Telas que não são de um núcleo (pessoa, memória, capítulo) usam as famílias do que mostram. Na dúvida, a da família completa.
- No texto corrido e na aba do navegador, o nome por extenso continua "Memórias Bayara e Bracarense".
- No Explorar, em 1280 e 1920 px, a assinatura tem dois terços do tamanho, para a primeira tela mostrar uma foto.

### Monograma

O monograma é o M de Memórias, que não muda, enquanto os sobrenomes mudam com a tela.

- Sai da serifa dos títulos, desenhado em SVG para funcionar pequeno. `npm run monograma` (`scripts/monograma.mjs`) lê o M direto dos arquivos das três serifas e grava o desenho em `src/visual/monograma.ts` e os ícones em `public/icones/<a, b ou c>/`. O resultado fica versionado; só se roda de novo se uma serifa mudar. São dois cortes: o normal, de título, e o pequeno, mais firme, para 16 px.
- **Ícone do site.** `favicon.svg` é o M sozinho, na cor do texto, e troca para a cor do papel quando o navegador está no tema escuro, para não sumir na aba. `favicon-48.png` é a reserva para navegador que não lê SVG, e `apple-touch-icon.png` (180 px) é o da tela inicial do celular: os dois levam o papel por baixo. O esqueleto aponta para a pasta da serifa em uso.
- **Uso:** ícone do site e, no celular, no lugar da assinatura quando falta espaço.
- **Cor:** uma cor só, no tom do texto, no ícone e no topo. A cor da família fica para usos decorativos e momentos específicos, cada um mostrado ao Gui na tela em que aparecer.
- **Tamanho mínimo:** conferir a 16 px. Na página do sistema ele aparece em 16, 24, 32, 64 e 112 px.

### Tipos: paleta e ícones

A regra de quem escolhe está em `docs/decisoes.md`, "Tipos de momento".

- **A paleta:** 23 cores, as onze das famílias e dos capítulos e doze que só entram pela escolha do tipo (limão, oliva, menta, musgo, céu, petróleo, anil, uva, ameixa, cereja, terracota e cacau), cada uma em quatro tons (pastel, meio, vivo e tinta), em `src/visual/tokens.css`. A lista e os nomes estão em `src/lib/visual.ts` (`CORES`, `CORES_NOVAS`, `PALETA`, `NOMES_DAS_CORES`).
- **O contraste é conferido por teste** (`testes/paleta.test.ts`, com a conta da WCAG sobre os valores de `tokens.css`, em `src/lib/contraste.ts`):

| Regra | Vale para |
| --- | --- |
| A tinta da cor sobre o papel e sobre a moldura branca: 4,5 para um | As 23 |
| O texto do site sobre o pastel da cor: 4,5 para um | As 23 |
| A tinta da cor sobre o pastel dela: 4,5 para um | As 23 |
| O vivo longe do pastel da mesma cor, pelo menos como na manteiga | As doze novas |
| Nenhuma cor mais perto de outra do que as duas mais próximas entre as onze (ardósia e azul no pastel, coral e pêssego no vivo) | Todos os pares |

- O vivo é ponto de destaque, nunca texto: sobre o pastel ele não chega a 3 para um em quase nenhuma cor. Por isso a regra dele é de distância, e não de contraste de leitura. O alerta do site usa a tinta do coral.
- **Os rabiscos:** 30, no mesmo traço (caixa de 24 por 24, traço de 1,6 com pontas redondas, sem preenchimento). Os onze de sempre: broto (nascimento), bolo (aniversário), alianças (casamento), estrela (conquista), aviãozinho de papel (viagem), casinha (casa), balões (festa), balão de fala (causo), xícara (dia a dia), flor (despedida) e brilho (outro e tipos sem escolha). E dezenove: capelo, mamadeira, sol e mar, pinheiro, garfo e faca, nota musical, bola, patinha, livro aberto, carro, presente, câmera, coração, sol, caixa de mudança, taça, barraca, montanha e peixe. Os desenhos e os nomes estão em `src/visual/rabiscos.ts`; `IconeDoTipo.astro` só desenha.
- **Como chega à tela:** `corDoTipo`, `estiloDoTipo` e `iconeDoTipo` (`src/lib/visual.ts`) leem a escolha; sem escolha, ou com um nome que não existe, vale a reserva (`corDeReserva` e o rabisco com o id do tipo). Toda tela pinta por `estiloDoTipo` e pelo `IconeDoTipo`. A lista de tipos do pedido fica guardada junto do pedido (`guardarTiposDoPedido`, em `src/lib/servidor/ambiente.ts`), e não numa variável do módulo, porque o mesmo servidor atende a homologação e as prévias. A coluna antiga `cor` não é mais lida. O espelho não mexe na tabela `tipos`.
- **A tela (`/admin/tipos`)**, na ordem "Tipos da lista", "Novo tipo" e, por último, o que foi escrito em "Outro", com a conta no alto. Cada tipo é uma linha com a etiqueta dele, que abre no lugar (um por vez): o nome, a grade de cores e a grade de desenhos, com "Cor" e "Desenho" como rótulos em mono e o nome do desenho marcado escrito embaixo da grade. As grades são rádios de formulário comum (sem script e pelo teclado), e a escolhida leva o tique e o negrito. A amostra de cor diz quem já usa ("em Viagem"); repetir cor pode, e o tipo novo já vem com uma cor que ninguém usa. Onde há mouse, a prévia (a etiqueta e o cartão da memória sem foto) fica parada ao lado; no toque, uma etiqueta pequena junto do "Salvar" e a etiqueta do resumo acompanham a escolha. Salvar volta para a linha do tipo, com o recado ali ("Viagem atualizado."). No "Outro", o tipo criado a partir de um texto escolhe a cor pelo nome, numa lista, e nasce com o brilho. O estilo está em `src/visual/telas/tipos.css` e a peça da escolha em `src/components/formularios/EscolhaDoTipo.astro`.
- A página do sistema mostra as doze cores novas, a tabela do contraste das 23 e todos os rabiscos com o nome.
- O acervo de exemplo tem três tipos a mais (Formatura, Praia e Bichos, em `semearTiposDeExemplo`), com uma memória em cada.

### A página do sistema fica

`/sistema` é a referência do projeto para o Gui, em todos os ambientes, inclusive no site de verdade.

- Na produção e na homologação, só os administradores abrem (para os outros, 404), com um link na seção "Administração" da conta. Nas prévias e no computador, abre para todos.
- Mostra o sistema com conteúdo fixo da própria página, nunca com dados do acervo. Fora das prévias, onde a peça pede foto, a página usa um quadro desenhado; nas prévias pode usar o Chico e a Karol. A trava está em `temAcervoDeExemplo()` (`src/lib/servidor/ambiente.ts`), conferida em `testes/sistema.test.ts` e na guarda da produção.
- Ela acompanha o sistema: toda peça, token ou regra nova entra nela no mesmo PR, e `testes/sistema.test.ts` falha se uma peça de `src/components/visual/` não aparecer na página.

### O que ficou de fora do sistema, de propósito

- **O cartão do painel** (`.cartao`) mora em `telas/painel.css`. Como peça, ele passava por cima da cor do cartão "contar", porque o CSS da tela é carregado antes do CSS das peças.
- **A galeria de fotos** (o `<dialog>` da página da memória) está em `telas/memoria.css` e no script da própria página. Vira peça quando uma segunda tela precisar ampliar foto.
- **A linha do tempo** (trilhos, épocas, faixa de décadas, o ano parado) é da tela, em `telas/linha.css`. Só o sinal do capítulo virou peça.
- **Camadas do CSS** (`@layer`): tentadas uma vez, mudaram a altura de várias telas, porque elas dependem da ordem dos arquivos, e não foram adotadas. A regra continua a de "A ordem do CSS", abaixo. Vale tentar numa branch só para isso, com `npm run capturas -- comparar` de todas as telas.
- **Tocador de áudio próprio.** O bloco usa o do aparelho.
- **Os efeitos da fase 4:** a frase que acende e a foto que amplia no lugar.
- **Modo escuro.** A decisão é claro, sem fundo escuro.

### Cuidados que custaram tempo

- **A ordem do CSS.** O CSS da tela entra antes do sistema (a página importa o dela e depois o esqueleto). Entre duas regras de mesmo peso, vence a do sistema. Para a tela ajustar uma peça, a regra da tela precisa de um seletor mais específico (`.dados .verso`, `.contar .botao`). Mover uma regra de uma tela para `pecas.css` pode mudar quem vence: compare as capturas antes e depois.
- **Safari do iPhone e peças paradas.** No iOS 26, um elemento preso (`sticky` ou `fixed`) encostado na borda da tela faz o Safari desenhar uma banda sólida atrás das barras dele. No toque, o que fica parado no alto anda por animação ligada à rolagem: o esqueleto põe a classe `pino-novo` no `html` quando o aparelho é de toque e o navegador tem `animation-timeline`, e as regras estão em `telas/linha.css`, com uma cobertura na cor do papel acima da faixa. Com mouse, o `sticky` continua. Uma peça só anda (`.parada`: a faixa de décadas e a gaveta com a cópia do ano), e nenhuma animação liga ou desliga durante a rolagem: com uma animação por ano, a faixa e o ano davam um pulinho na troca de ano. O cabeçalho de cada ano rola com a página, e o ano parado é uma cópia dele dentro da gaveta, do mesmo tamanho e no mesmo lugar em que ele chega ao alto. `position: fixed` não entra, e `sticky` novo só dentro de `(hover: hover) and (pointer: fine)`: o teste recusa o resto. Peça parada nova segue esse modelo e é conferida pelo Gui no iPhone.
- **`animation` e `animation-timeline` em regras separadas**, a segunda depois da primeira. Juntas, o compactador funde as duas e o navegador descarta a linha do tempo.
- **Movimento reduzido.** `base.css` desliga toda transição e toda animação, menos a de quem tem `data-preso`: o que está parado por animação ligada à rolagem é o lugar do elemento, e não enfeite. Peça parada nova leva `data-preso`. Efeito novo precisa aparecer pronto com movimento reduzido, e as capturas já rodam assim.
- **`@view-transition`** só pode aparecer uma vez, dentro de `prefers-reduced-motion: no-preference`: tem teste. Ele só serve para entrar e sair do modo TV.
- **Animação de chegada espera a foto.** Animação em CSS começa quando o elemento entra na página, antes da foto chegar. No modo TV a animação só roda com `data-pronta`, que o script põe depois de abrir todas as fotos (`decode()`), e cada `<img>` que chega é trocado pela `Image` já aberta. Animação nova de chegada segue isso.
- **Nó reaproveitado repete a animação de chegada.** Pôr um nó antigo de volta na página reinicia as animações em CSS dele. O que sai leva `animation: none !important`.
- **Campo sem contorno de foco.** O campo e a lacuna tiram o contorno padrão e põem uma linha grossa com fundo no lugar. Quem tirar um contorno põe outro sinal: tem teste.
- **A foto inclinada e a rolagem lateral.** O recorte fica em `main` e no rodapé, com `overflow-x: clip`. No `body`, o recorte passa para a janela e deixa de valer.
- **O `.miolo` é só `padding-inline`.** Uma regra de tela que zere o `padding-inline` de um elemento com `miolo` tira a margem da página.
- **Foto que só vale no computador.** Só `display: none` não basta: o navegador baixa a foto do mesmo jeito. Use `soOnde` na foto revelada, que põe o arquivo num `<source>` com a regra de mídia.
- **A assinatura depende de medidas.** A largura de "MEMÓRIAS" em cada serifa é um número medido (`--assinatura-em`). Mudar o peso, o espaçamento ou os ajustes da serifa de capa pede medir de novo.
- **Fotos de exemplo no computador.** No servidor local, as fotos de exemplo precisam ser enviadas uma vez por banco local (`NO_PROXY=localhost node scripts/enviar-fotos-de-exemplo.mjs http://localhost:4321`); sem isso, saem quebradas nas capturas. Confira as fotos também na prévia da branch.
- **O monograma e a biblioteca de fontes.** `scripts/monograma.mjs` usa o `fontkitten` e o `sharp`, que vêm com o Astro e não estão no `package.json`. O `fontkitten` não aplica os eixos de uma fonte variável lida de um woff2, e o script contorna isso para a Fraunces. Se uma atualização do Astro tirar uma das duas, o script para de rodar; o desenho e os ícones estão versionados, então o site não depende dele.
- **Variável definida por código.** O teste que procura variável usada e nunca definida tem uma lista do que é posto por script ou por estilo (`--alt`, `--barra-alt`, `--encolhe-a`…). Variável nova desse tipo entra na lista.
- **Regex de teste com `[^>]*`** para em qualquer `>` de dentro de uma expressão, como `m.fotos.length > 0`. Nos componentes, evite `>` dentro dos atributos que um teste lê.
- **A guarda da produção lê os arquivos versionados.** Depois de apagar ou mover arquivo, `npm run build` falha com `ENOENT` até um `git add -A`.
- **Vídeo das trocas:** o Playwright grava com `recordVideo` no contexto. As capturas rodam com movimento reduzido, então animação só se confere em contexto sem `reducedMotion`. Os vídeos não entram no repositório.
- **Capturas em JPEG.** As PNG de um grupo de telas passam de 30 MB; em JPEG, ficam em torno de 8 MB.

Origem: [histórico, "Sistema (fase 2)"](historico/visual-ate-2026-11-17.md#sistema-fase-2); ["Sistema (fase 2): como usar"](historico/visual-ate-2026-11-17.md#sistema-fase-2-como-usar); ["Componentes novos"](historico/visual-ate-2026-11-17.md#componentes-novos); ["Assinatura do nome"](historico/visual-ate-2026-11-17.md#assinatura-do-nome); ["Monograma"](historico/visual-ate-2026-11-17.md#monograma); ["A página do sistema fica"](historico/visual-ate-2026-11-17.md#a-página-do-sistema-fica-decisão-do-gui-16112026); ["Tipos: paleta e ícones"](historico/visual-ate-2026-11-17.md#tipos-paleta-e-ícones); ["Estado do grupo 1"](historico/visual-ate-2026-11-17.md#estado-do-grupo-1-para-a-próxima-sessão-seguir-sem-a-conversa).

## As telas

A regra de cada tela como ela é hoje. O comportamento (o que aparece, para quem, em que ordem) está em `docs/decisoes.md`; aqui fica a aparência e a composição.

### Topo e menu

- O menu do celular é uma sanfona. O retrato de quem está logado abre o menu da conta; no celular, ao lado de "Menu", ficam "Nova memória" e o retrato.
- A faixa de teste do alto (telas, fontes, "Ver como") só existe fora da produção.

### Início

`src/pages/index.astro`, `telas/painel.css`; os cartões de contar e do relato novo são `src/components/painel/Contar.astro` e `Fila.astro`. Página íntima: o papel tingido na cor da família de quem vê, os cartões, o nome sublinhado a caneta e o envelope do laboratório.

- **Primeira visita:** só a carta na tela.
- **A abertura** tem "Só você vê esta página" (sem a data de hoje), a saudação ("Oi, Fulano."), o resumo ("Entraram duas memórias e um relato desde a sua última visita."), a linha do rascunho quando há um, a última visita (com o ano, quando não é o corrente) e o link da carta. O envelope só aparece quando chegou algo.
- **A mesa, no computador,** fica à direita da abertura. Com novidade: até duas fotos novas e, embaixo delas, o relato, sempre na fileira dele. Quando há "E mais N", o relato e essa linha descem para uma fileira de largura inteira, embaixo da abertura e das fotos. Sem novidade: "Neste dia, em outros anos", com até duas fotos grandes e as outras numa linha menor; sem ele, a memória para contar.
- **Os cartões,** nesta ordem: contar, "Neste dia", aniversários ("Próximos aniversários"), você no acervo. No computador eles dividem a linha por quantos são: um ou dois, metade cada; três, um terço; quatro, dois a dois (lado a lado a partir de 100rem). "Neste dia" com três ou quatro memórias é uma faixa de oito colunas ao lado de contar, e os outros ficam na linha de baixo.
- **O cartão de contar** muda de arranjo pela largura que ele mesmo tem (`@container`): estreito, o botão ocupa a largura do cartão, embaixo da foto e do título. A foto leva à memória.
- **O relato novo** diz "Relato novo" no rótulo e traz o título da memória numa linha própria, em serifa.
- **O convite do fim** é "Explorar todas as memórias", em `t-2`, e as décadas se dizem como no filtro do Explorar ("Anos 2020", "Anos 90"). O botão de teste vem depois de um fio, com o rótulo "Teste".
- Memória sem foto ganha o cartão da foto revelada, com a cor e o ícone do tipo de momento no lugar da imagem, também em "Neste dia, em outros anos".

**Carta de Natal** (`src/components/Carta.astro`, no alto do painel e em `/carta`): a saudação "Oi, Elizete," grande, o primeiro parágrafo como abertura em serifa, o resto como texto de leitura, e a linha de quem assina partida em nomes, cada um à mão ("Gui, Giovanna e Magno" vira três assinaturas). O carimbo diz "Natal de" e o ano em que a carta foi escrita, sem lugar. No painel a ação é o botão "Abrir o acervo"; em `/carta`, "Voltar ao início" é uma ação sublinhada, sem seta, e os administradores têm ao lado "Editar a carta". As fotos ao lado são as três memórias mais recentes em que a pessoa aparece; cada uma leva à memória, e a da frente é a primeira na ordem do teclado.

### Sua conta

`/conta`, `telas/conta.css` (mais `telas/painel.css` pelo cartão). Página íntima, na cor da família da pessoa.

- No alto, o retrato em arco, o nome, a linha em mono com apelido, nascimento e e-mail (só o que existe), "Editar seus dados" e "Ver sua página".
- Composição da proposta A do conceito da sessão E (escolha do Gui, 17/11/2026; capturas em `docs/visual/sessao-e/conta/`). No desktop, para quem administra, o cartão **Administração** ocupa a metade direita, ao lado do nome, e a carta de Natal ("Natal de 2026 · Ler a carta de Natal") fica no pé da coluna do nome, alinhada com o fim do cartão. Logo abaixo, **O que você criou** é uma faixa sem cartão, entre dois fios, na largura toda, com as contas em tamanho de título de parte numa linha só; cada lista abre no lugar, uma por vez, sem script. Depois, **Avisos** na largura toda, e **Rascunhos e lixeira** e **Seus laços do coração** lado a lado. Quem não administra vê o nome na largura toda, a faixa logo abaixo e a carta no fim.
- No celular: quem é, o que criou, avisos, rascunhos, laços, a carta e, no fim, a administração, como cartão. A marcação segue essa ordem.
- O cartão da administração: o rótulo e, à direita, a conta das pendências com o ponto na cor de alerta. Os atalhos são quadros recuados (`--papel-recuo`, `--raio-moldura`), com o nome e a situação em mono; os da última linha se esticam até fechar a grade, e nenhum fica sozinho numa linha. O que pede ação tem o ponto e a tinta de alerta. No pé, depois de um fio, o banco como medida (`--vivo`; perto do limite, `--alerta`, com a frase curta), a linha da cópia mensal em mono e "Baixar cópia do acervo".
- Os textos da conta, da pessoa e da administração ficam como estão ("Sua conta", "Administração", "Voltar para a sua conta", "Confira antes de confirmar. Nada é apagado de vez.").

### Explorar

`src/pages/explorar.astro`; as partes em `src/components/explorar/`: `Controles.astro`, `Linha.astro` (a linha do tempo, com o script dela), `Mural.astro`, `Lista.astro` e `Palco.astro` (modo TV e ao acaso). O CSS da linha do tempo está em `telas/linha.css`; o dos filtros, do mural e do palco em `telas/explorar.css`; o da lista em `telas/lista.css`. Os textos do formulário, do palco e do pé do trilho ficam como estão: "Só as memórias", "com foto", "com áudio", "você já contou", "falta o seu relato" (os da proposta A, 18/11/2026), "Quem estava junto", "Mostrar memórias", "Limpar filtros", "Nenhuma memória passa nesses filtros.", "Sair do modo TV", "Passar sozinho", "Parar de passar sozinho", "Abrir esta memória", "Uma memória ao acaso", "Me mostre outra", "Voltar ao Explorar", "Fim do capítulo" e "Fim da época".

**Os controles: cada coisa no seu lugar** (proposta A do conceito da sessão D, decisão do Gui de 18/11/2026; capturas do conceito em `docs/visual/conceitos/sessao-d/`, as `explorar-a-*`). O alto da página é uma grade, e os controles entram nela peça por peça (`.controles` com `display: contents`), na ordem: a assinatura, as famílias, as abas, "Filtros" e "Ordem", as fichas ligadas, o tamanho das fotos (no mural) e, no celular, a conta. Cada coisa tem uma cara só: a família é pílula redonda com o ponto da cor, a forma de ver é aba de texto, o filtro é ficha de canto reto.

- **Família:** pílulas logo abaixo da assinatura, a `--e-3` dela. Cada opção tem o ponto na cor da família e acende inteira no pastel dela quando está marcada. Cada toque liga ou desliga só aquela família (`alternarFamilia`), "Família completa" desliga todas, e marcar todas volta sozinho à família completa. A cor da tela e a assinatura do topo e do rodapé acompanham. No celular, a fila rola para o lado.
- **As abas** (`.abas`): "Linha do tempo", "Mural de fotos" e "Lista", a `--e-7` das famílias e coladas no conteúdo, com o fio de tinta embaixo; a marcada em negrito com o traço grosso. "Modo TV" e "Me mostre uma memória" vêm logo depois, como saídas com seta. No computador, a conta das memórias fica na linha das abas, à direita.
- **Filtros:** fechado, "Filtros" com o número dos ligados numa bolinha de tinta e o sinal de mais; embaixo, cada filtro ligado é uma ficha escura com o xis (`.ficha-ligada`), que leva ao endereço sem ele. Aberto, um cartão branco (`.filtros__cartao`): "Só as memórias" com as fichas de um toque (`.ficha-de-filtro`, de papel, escuras quando ligadas) e os grupos em linhas com fio entre elas, que abrem no lugar (`.filtros__grupo`). No computador, as fichas e a saída à esquerda (colunas 1 a 4) e os grupos à direita (6 a 12), com as opções em três colunas; no celular, tudo em sequência, com as opções em duas colunas fixas. Com script, cada escolha vale na hora e o cartão continua aberto; o botão "Mostrar memórias" fica só para quem está sem script. Tudo é link ou formulário comum: funciona sem script e fica no endereço.
- **Ordem** (`.ordenar`): na linha de "Filtros", à direita. "Ordem" em mono e a escolha de agora em negrito, sublinhada, com a seta desenhada com o traço; aberto, um cartão com sombra de bilhete, por cima da faixa de décadas, com as quatro ordens (44 px cada) e o tique na de agora.
- **No meio da página** os controles ficam lá em cima, fora da tela, porque nada fica preso no alto além da faixa de décadas e do ano. Trazê-los para perto seria uma peça presa nova, que pede decisão e conferência no iPhone.

**A troca sem recarregar** (`src/lib/cliente/explorar-troca.ts`, ligada por `ligarTroca()`; vale no Explorar e na página da pessoa; regra em "Movimento que mostra o que mudou")

- A região que troca é o `<div data-explorar>`, que envolve a linha do tempo, o mural ou a lista, com os controles dentro. O caminho (`trocar`): busca a página do endereço novo, tira dela o `[data-explorar]`, mede o que está perto da tela, troca o nó inteiro, devolve a rolagem, avisa (`explorar:trocou`) e anima a diferença. Qualquer erro cai em `location.assign`.
- **Identidade:** `data-chave` em cada item (`m:<id>` para a memória, `a:<ano>` para o ano, `d:<década>` para o cartão do mural) e `data-ano`, que serve para achar o ano mais próximo. Item novo que precise se mover leva os dois.
- **A técnica é FLIP**, com a Web Animations API, porque funciona em todo Safari do iPhone, anima só o que está perto da tela e deixa cada item seguir o próprio caminho. Quem continua vai ao lugar novo (460 ms), e ao tamanho novo quando o tamanho das fotos muda; entre mural e linha do tempo, quem viaja é a foto de cada memória. Quem entra aparece no lugar (260 ms). Quem sai some onde estava (200 ms): o nó antigo é posto de volta por um instante, com `position: absolute`, no fim da lista, para não mexer no `nth-child` dos outros. Da lista para as outras formas, os itens aparecem no lugar, porque na lista a foto está escondida.
- **A foto já carregada** é levada do item antigo para o novo (`manterFotos`), para não piscar.
- **A rolagem nunca muda por causa de um filtro.** Quem usou um controle fica com ele no mesmo ponto da tela (o seletor `foco`, que vale na região antiga e na nova: por isso cada opção tem `data-opcao`, e o controle é achado por `aria-labelledby`). Sem controle, que é o voltar e o avançar, vale a primeira memória abaixo de 110 px do alto; se ela saiu, a do ano mais próximo (`anoMaisProximo`; no empate, o mais antigo).
- **O que continua aberto:** os `<details>` dos controles são copiados por posição da região antiga para a nova. Mudar a ordem deles entre uma página e outra quebra isso.
- **Histórico:** `pushState` a cada troca e `scrollRestoration = 'manual'` antes e depois dele, senão o navegador devolve a rolagem por conta própria ao voltar. Ao sair da página (`pagehide`), volta a `'auto'`. Quando só a âncora muda, o voltar não busca a página.
- **Scripts depois da troca:** o HTML que chega pelo `DOMParser` não roda `<script>`. O script da linha do tempo é uma função `iniciar`, chamada de novo em `explorar:trocou`, com um `AbortController` que desliga o que escutava a janela; o do mural escuta o documento. Script novo dentro da região segue um dos dois modelos.
- O foco fica na opção escolhida ou, depois de "Mostrar memórias", no controle dos filtros, e a conta das memórias é anunciada ao leitor de tela.
- O tamanho das fotos do mural não busca nada: troca o `data-tamanho` no lugar, com o mesmo medir e animar.

**A linha do tempo**

- Lista vertical; cada memória com a polaroid da foto-chave e a ficha numa linha mono. Cada ano ou década abre com o número grande em serifa. O fio do tempo é a linha principal: mais firme, contínuo do primeiro ao último ano, com um ponto em cada memória.
- **Faixa de décadas:** na cor da família bem diluída no papel, de ponta a ponta, parada no alto, com a década em leitura numa ficha de papel.
- **O link do título** tem 44 px nele mesmo, e o contorno do foco fica no próprio título; a memória inteira continua levando à página dela.
- **Trilhos dos capítulos:** à esquerda do fio, mais finos e mais claros, com a parada menor. O trilho usa o tom do meio da cor do capítulo, para não disputar com as fotos, e a parada usa o tom vivo. A memória presa ao capítulo tem uma parada no trilho; a de fora deixa o trilho tracejado. No alto, o trilho faz a curva até o título e o período do capítulo; embaixo, até a marca "Começo do capítulo “Natais”". Cabem dois trilhos no celular, quatro a partir de 62rem e seis a partir de 100rem. Cada memória mostra, embaixo da ficha, o sinal dos capítulos dela: a mesma parada, na cor do capítulo, com o nome (`CORES_DOS_CAPITULOS`, em `src/lib/visual.ts`).
- **Destaque do capítulo com o mouse:** passar o mouse por um trilho acende o capítulo inteiro, do começo ao fim, na cor viva dele, recua os outros trilhos e mostra ao lado do cursor o nome e o período. O sinal desse capítulo em cada memória fica sublinhado. O foco do teclado no título do capítulo faz o mesmo. Só existe em `(hover: hover) and (pointer: fine)`.
- **Em "Mais antigas primeiro",** a página leva ao presente e o trilho acaba, embaixo, em "Fim do capítulo “Natais”" e "Fim da época “…”". Em "Entraram por último" e "Mais contadas", a lista é corrida, sem a divisória dos anos, e cada memória traz a data inteira.
- **Na página da pessoa e do tema,** a mesma linha do tempo (`explorar/Linha.astro`), sem trilhos nem faixa de décadas.

**A época na linha do tempo.** A época é o chão: enquanto se rola por dentro dela, o papel muda de tom de ponta a ponta da tela. A época é fundo, o capítulo é linha e a memória é figura.

- O nome fica numa aba que sai do próprio chão, como a de uma divisória de fichário: no alto, a aba sobe para fora do chão, com "Época", o nome e o período; no fim, desce, com "Começo da época “Os anos de casa”".
- A linha da aba não tem margem, só espaço por dentro: o chão, o fio do tempo e os trilhos passam por ela inteiros (teste em `testes/visual.test.ts`).
- **Épocas que se sobrepõem:** onde duas valem ao mesmo tempo, o chão fica um tom mais fundo (até três tons, `--chao-1` a `--chao-3`), e cada época tem a sua aba, na cor do chão dela: a de dentro abre sobre o chão da de fora. Quando acabam juntas, fecha primeiro a de dentro. A conta é da montagem (`epocas`, `epocasDeCima` e `chaoDaEpoca`), com teste para épocas uma dentro da outra, que abrem juntas e que se cruzam. O texto suave escurece junto com o chão, para continuar em 4,5:1. O tom diz quantas épocas valem ali; quem diz quais são as abas e, no computador, a lista embaixo do ano.
- No computador, o ano diz as épocas que passam por ele, embaixo do número. No celular, o ano parado no alto leva o tom do chão logo embaixo dele.

**O mural**

- Uma superfície só: as fotos-chave como fotos reveladas, de ponta a ponta, cada uma com a inclinação dela e um pouco fora de fila, sem cabeçalho nem seção.
- **A década é um cartão no meio das fotos,** no lugar de uma foto, na cor da família, com "Anos" e o número grande em serifa ("90", "2010") e a conta das memórias da década. Um cartão por ano seria quase um por foto.
- **O ano é uma aba na primeira foto de cada ano,** saindo do alto da foto, sem ocupar lugar.
- **O título na margem:** só o título da memória, pequeno, na manuscrita, em até duas linhas. Vale também para a memória sem foto, que entra como cartão na cor do tipo.
- **O verso, no computador:** ao passar o mouse ou com o foco, a foto endireita e sobe um pouco e o verso abre em leque por trás, girando pelo canto de baixo: um cartão do mesmo tamanho da foto, de que aparece a quina de cima, com a data em mono (o dia e o mês numa linha, o ano na outra). Perto da borda direita, abre para a esquerda. Com movimento reduzido, aparece sem girar. No toque, não aparece. Virar a foto foi descartado: esconde a foto no momento em que a pessoa aponta para ela.
- **O tamanho das fotos:** colunas no celular, no computador e na tela grande: 3, 8 e 10 nas pequenas; 2, 6 e 8 nas médias (o padrão); 1, 4 e 5 nas grandes. Nas pequenas do celular, o título não cabe na margem e fica só a foto.
- Fora da ordem do tempo, saem os cartões de década e as abas de ano, e a data fica só no verso.

**A lista** (modelo do "Já rolou" da agenda da @bsurda; regras em `src/lib/explorar.ts`, `dataNaLista`, `quemNaLista`, `nomeCurto`, `mostraRascunho`)

- O ano grande abre cada bloco, com tamanho de título de página no computador, e a conta das memórias do ano, alinhada com o fim do texto das linhas. Fora da ordem do tempo não há blocos, e a data vai inteira na linha.
- Cada memória é uma linha, e a linha inteira é o link: o sinal na cor do tipo (o rabisco), o título, a data, o lugar, quem estava (até três nomes e "+N"), o sinal de áudio, a conta dos relatos e o capítulo, com a parada na cor dele. O rascunho aparece para quem escreveu, levando ao formulário.
- **A data:** dentro do bloco, o dia e o mês ("24 dez", "dez"); a aproximada diz "por volta de", com o mês quando é conhecido; quem só tem o ano fica sem data na linha. O nome curto que começa pelo parentesco leva a palavra seguinte ("Vó Bela", "Prima Carol").
- No celular, dois andares: o título e a data em cima, o resto embaixo, menor. No computador, uma linha em colunas; em 1280 px o lugar fica embaixo do título, em 1920 px ganha a coluna dele.
- **A foto-chave** aparece numa margem à direita quando o mouse ou o foco passa pela linha, só em `(min-width: 62rem) and (hover: hover) and (pointer: fine)`, sem encostar no cabeçalho do ano. No celular ela não é desenhada nem baixada (`soOnde`).

**O modo TV**

- Uma memória por vez, na tela inteira, sem o topo e o rodapé do site: a cor do tipo de momento no fundo, a foto como foto revelada, grande, com o lugar e o ano na margem, o carimbo, o título, um trecho do relato assinado à mão e quem estava. Na tela grande, o que se lê tem 24 px e os controles, 22 px. No celular, o carimbo e o título vêm antes das fotos.
- **As outras fotos** ficam em volta da principal, até quatro, menores e um pouco tortas, cada uma com a legenda. No celular, ficam atrás, aparecendo pelas bordas.
- **Os controles numa linha só:** "Anterior", "Próxima" e "Passar sozinho", que depois de ligado vira "Pausar" e "Retomar" no mesmo lugar. O foco já começa em "Próxima" (no controle da TV, o botão do meio passa); as setas passam, o Esc sai e tocar na foto passa para a seguinte. O tempo ("8 segundos", "10 segundos", "15 segundos"), "Parar de passar sozinho", a animação, "Só as fotos" e "Tela cheia" moram em "Ajustes", que abre no lugar, em colunas no computador. Numa janela de 720 px de altura, com "Ajustes" aberto, a página não rola: abaixo de 50rem de altura o respiro de baixo encolhe e cada ajuste fica numa linha, com o nome ao lado das opções.
- **Passar sozinho** (`TEMPOS_DE_PASSAR`): um toque liga em 10 segundos. Pausar não recarrega; retomar conta o tempo de novo, inteiro. Com a aba escondida, espera. Ligado, a última memória volta à primeira. Quem pausou e passa à mão continua pausado. Só existe com script: sem ele, o grupo nem aparece, e "Anterior" e "Próxima" continuam funcionando.
- **A passagem sem recarregar,** no script de `Palco.astro`: busca de antemão a página da memória de antes e a de depois, troca o `[data-palco]` inteiro com as fotos já abertas e usa `replaceState`, para o voltar sair do modo TV de uma vez. O estado de "passando sozinho" e da pausa viaja nos endereços dos links da página buscada.
- **Sem rede,** a memória da tela fica, a passagem espera com "Sem conexão. Tentando de novo…" e volta sozinha quando a rede volta.
- **As três animações** (`MOVIMENTOS`, em `src/lib/explorar.ts`; regras em `telas/explorar.css`; no endereço, `mov=a`, `b` ou `c`). A escolha fica com quem está vendo, em "Ajustes"; quem nunca escolheu vê a Álbum (`MOVIMENTO_PADRAO`). Os nomes ficam.

| | Passagem | As outras fotos | Título e trecho |
| --- | --- | --- | --- |
| Álbum | A foto vem da lateral, girando um pouco, e as que estavam na tela saem pelo outro lado, como fotos sendo empurradas; ao voltar, o sentido inverte. As que saem só vão embora | Fazem o mesmo movimento da principal, logo atrás dela | Sobem linha a linha |
| Revelação | A foto aparece clara e sem cor e vai se revelando, em três segundos e meio | Revelam-se depois, uma a uma | Surgem depois das fotos, sem deslocamento |
| Mesa | A foto é jogada na mesa, de perto e torta, e assenta | Caem em volta, uma a uma | Entram juntos, logo depois |

  Nas três, o fundo passa de uma cor à outra e as fotos se aproximam devagar enquanto a memória está na tela. Trocar de animação em "Ajustes" mostra a chegada de novo. Com movimento reduzido, nada disso roda.
- **"Só as fotos"** esconde o título, o trecho e os dados e deixa as fotos no meio da tela, maiores; "Mostrar o texto" desfaz. A tela não rola: o palco tem a altura exata da tela, e os controles ("Sair do modo TV" no alto; "Mostrar o texto", "Anterior", "Próxima", "Passar sozinho" e "Ajustes" numa barra no pé) ficam por cima das fotos. Eles somem depois de 5 segundos sem gesto (`SEGUNDOS_DOS_CONTROLES`), com o cursor do mouse. Qualquer gesto os traz de volta, com "Mostrar o texto" em destaque e com o foco; o primeiro toque ou clique só mostra os controles, e o Tab mostra e segue para o primeiro. Esc sempre volta ao modo com texto; já no modo com texto, sai do modo TV. As setas para os lados trocam de memória sem mostrar os controles. Escondidos, os controles saem da ordem do teclado (`visibility: hidden`). Com movimento reduzido, aparecem e somem sem animação. Quem entra com "Só as fotos" guardado vê os controles nos primeiros segundos, e sair da tela cheia pelo Esc do navegador também os mostra. A regra de cada gesto é `reacaoEmSoFotos`, com teste em `testes/explorar.test.ts`; os controles ficam em `.palco__controles` (`display: contents` fora de "Só as fotos").
- **"Tela cheia"** usa a do navegador e continua valendo de uma memória para a outra. Onde o navegador não tem tela cheia, como no iPhone, o botão não aparece.
- **Ao acaso:** "Me mostre uma memória" sorteia entre as que passam nos filtros e leva ao endereço da sorteada, no mesmo palco, com o topo do site. "Me mostre outra" sorteia de novo, sem repetir a que estava na tela. Entrar e sair do modo TV e o ao acaso são navegação comum.

**O que fica no endereço e o que fica no aparelho** (seremos poucos e ninguém vai mandar link de mural; no endereço fica só o que traz a pessoa de volta ao mesmo lugar)

| O quê | Onde fica |
| --- | --- |
| Forma de ver, família, filtros e ordem | No endereço |
| A memória da vez no modo TV (`m`) | No endereço |
| Tamanho das fotos do mural | No aparelho (`mural-tamanho`) |
| Animação do modo TV e o tempo do "Passar sozinho" | No aparelho (`tv-animacao`, `tv-tempo`) |
| "Só as fotos", no modo TV | No aparelho (`tv-so-fotos`) |
| Se está passando sozinho, a pausa e a tela cheia | Só enquanto o modo TV está aberto |

Sem script, os links levam tudo no endereço (`tamanho`, `passar`, `pausa`, `mov`), e o servidor aceita.

### Página da memória

`src/pages/memorias/[id].astro`, `telas/memoria.css`; regras em `src/lib/memoria.ts`, com teste em `testes/qa-respostas-memoria.test.ts`.

1. Abertura num bloco na cor do tipo: título grande, trecho de um relato e a foto-chave como polaroid, com o monte de fotos atrás. Com mais de uma foto e espaço (computador e tela grande), as fotos de trás se abrem em leque para os lados da principal; no celular, continuam em monte. Memória sem foto: a partir de 62rem, o cartão do tipo fica à direita, no lugar da foto; no celular, só o texto.
2. Ficha: parada à esquerda no computador, no alto no celular. Data, lugar, tipo, capítulos.
3. Quem estava, com os retratos e o parentesco de quem olha. No celular, até seis retratos e "Ver todos os 9", que abre o resto no lugar; a partir de 40rem, todos à vista; sem script, a lista inteira.
4. Relatos, um por pessoa, como bilhetes com o nome manuscrito, o áudio e as fotos que vieram com o relato (`.bilhete__fotos`). Com um só relato, sem áudio, contado pela própria pessoa e que coube inteiro no trecho da abertura, a seção não repete o bilhete.
5. **Parede de fotos:** todas como fotos reveladas, um pouco fora de fila, cada uma com a legenda.
6. Fim: o convite para escrever, um bilhete em branco com o retrato e o nome de quem está vendo, as linhas vazias e a assinatura dela ainda apagada, com a frase "Cada pessoa conta o dia do jeito que lembra." e "Escrever meu relato" em destaque; depois "Antes" e "Depois". Quem já contou vê a linha quieta descrita em `docs/decisoes.md`.

A ação principal fica também no alto, como atalho, para quem chega querendo contar.

**Galeria:** tocar em qualquer foto (da abertura, da parede ou de um relato) abre a galeria na própria página: a foto inteira, sem corte, com margem branca de ampliação, a legenda, "Foto 2 de 6" e os controles com nome escrito ("Anterior", "Próxima", "Fechar"). As fotos ficam numa fila que rola para o lado com a rolagem do próprio aparelho e encaixa em cada foto: no celular a foto acompanha o dedo e a seguinte entra, como no álbum de fotos do celular. Os botões e as setas do teclado fazem a mesma passagem, e a galeria abre subindo um pouco; com movimento reduzido, tudo troca sem deslizar. Fecha pelo Esc, pelo voltar do aparelho e pelo toque no fundo, sem sair da página. Sem script, cada foto é um link para a imagem. É um `<dialog>` no papel da página.

### Página da pessoa

`telas/pessoa.css`. O retrato e a voz.

- A abertura é um bloco na cor da família da pessoa, com o retrato em arco, o carimbo (espécie, famílias e o nascimento, sem rótulo), o parentesco de quem olha como a linha maior ("sua avó", "seu amigo-irmão") e o nome logo abaixo. Na própria página e na de quem não tem laço com quem olha, o nome é a linha grande. O retrato ocupa três das quatro colunas no celular e fica na margem da página em toda largura.
- Seguem "Sobre Fulano", "A voz de Fulano" (cada áudio com o título da memória e o bloco de áudio), "Família e laços", quieta, em colunas, com a peça Gente, e "Memórias com Fulano".
- **"Forma de ver"** das memórias: linha do tempo (o padrão), mural e lista, no endereço (`?ver=mural`), sem script pelo link (que volta a `#memorias-com`) e, com script, pela troca sem recarregar. O mural usa o tamanho de fotos guardado no aparelho e não tem o controle "Fotos". O controle só aparece para quem tem mais de uma memória.

### Pessoas

`telas/pessoas.css`. Proposta B do conceito da sessão E ("Índice ao lado", escolhida pelo Gui em 17/11/2026, com dois ajustes). O alto tem três grupos, a `--e-6` uns dos outros: o que a página é (o título "Pessoas" com a conta colada nele e a frase "Quem aparece nas memórias da família, por família."), achar alguém (busca, famílias e ordem) e o que dá para fazer ("Cadastrar pessoa", "Ver a árvore" e "Ver seu círculo", todas ações de texto, depois de um fio).

- **Celular:** só a busca fica à vista. O controle "Famílias e ordem" (um mais que vira xis) abre as famílias e a ordem no lugar, empurrando a página; fechado, diz o que está valendo. Sem script, tudo à vista e o controle não aparece.
- **Computador:** o alto vira o índice, na coluna da esquerda (3 das 12 colunas), com as famílias empilhadas e a conta de cada uma à direita da pílula; a lista ocupa da coluna 5 ao fim, em duas colunas de pessoas (três na tela grande). O índice acompanha a lista (`sticky`) só onde há mouse (`hover: hover` e `pointer: fine`) e quando a janela tem pelo menos 54rem de altura, porque com cinco famílias ele tem uns 790 px e não pode ficar cortado. No toque, nada fica preso.
- **Famílias:** a peça Pílula de família, uma por vez, com "Todas" no começo.
- **Cada família** é uma faixa na cor dela (`details`), com o nome em serifa, a conta por extenso e o sinal de abrir à direita, que abre e fecha a lista dela. Nasce aberta. As pessoas embaixo usam a peça Gente, com os retratos na margem do nome da família. Cada pessoa mostra o retrato, o nome, o que ela é para quem olha ("sua avó", "você") e a conta das memórias, com a espécie quando é bichinho.

### Capítulos, capítulo e tema

`telas/capitulo.css`; a linha de um capítulo é `src/components/capitulos/Entrada.astro`; testes em `testes/qa-respostas-capitulos.test.ts`.

- **A cor do capítulo fora da linha do tempo:** `coresDosCapitulos`, em `src/lib/linha-capitulos.ts`, dá a cada capítulo a mesma cor do trilho dele na linha do tempo inteira. Capítulo sem memória visível ganha uma cor fixa pela posição. Época não tem cor: ela é o chão.
- **Lista (`/capitulos`):** um sumário de livro, do mais antigo para o mais recente. À esquerda, "Capítulos", a frase, "Novo capítulo" e "Ver os temas", que desce até os temas, no fim (`#temas`); com mouse, esse alto fica parado. À direita, cada capítulo numa linha, com o título em `--t-titulo-3`, o ponto antes do selo (o da época vazado em cinza, para os selos alinharem), o que ele é em mono, o período em pílula e a conta das memórias. Os capítulos de dentro ficam recuados sob o maior, presos por um fio. Os temas vêm no fim, como ações quietas.
- **Capítulo (`/capitulos/<id>`):** abertura de capítulo de livro. A capa: o selo (e "Só Bayara", quando é restrito), o título grande, o período em pílula com a conta, "Entram as memórias do período com…", as ações, a abertura em serifa, as ligações ("Parte de", "Aconteceu durante", "Temas") e "Quem aparece". O capítulo de dentro diz, acima do título, "Capítulo de “Natais”", com o link. No celular a ordem é selo, título, período, frase de abertura e só então as ações. No computador com mouse ficam parados só o selo, o título, o período e as ações; o resto da capa rola por trás desse bloco. No toque, nada fica preso.
- **Quem aparece:** na tela grande, as seis pessoas que mais estão nas memórias, com retrato e conta (a peça Gente), e "e mais N pessoas". No celular, uma linha de nomes corrida, sem fotos, na capa ("Gui (6), Elizete (5)"), sem empurrar as memórias.
- **Forma de ver, no capítulo:** os marcos (o padrão), o mural e a lista, na própria página (`ver`), e "Passar no modo TV", que abre o Explorar com o capítulo. No mural e na lista as memórias usam a largura inteira, embaixo da capa.
- **Os marcos numerados:** cada memória é um marco: o número grande em serifa, com um traço na cor do capítulo, o carimbo com a data e o lugar (quebrando antes do ponto), o título, quem estava e a foto revelada pequena, sem legenda. A ordem é a de toda linha do tempo, das mais recentes para as mais antigas, e o número é a posição na história contada do começo (o mais recente leva o número mais alto). Na época, o título da parte é "Memórias da época". A partir de 100rem o corpo vai até a margem e a foto do marco cresce. A memória de um capítulo de dentro leva o sinal desse capítulo. À direita da capa ficam também "Capítulos dentro deste" e "Aconteceu neste período".
- **A cor da tela** vem das famílias do capítulo (as de "quem vê" e as de "de quem é"); sem nenhuma, a da família completa.
- **Tema (`/temas/<id>`):** "Tema", o nome grande, "Todos os capítulos e temas", os capítulos que usam o tema (a linha do sumário, com o período e a conta) e as memórias, com a "Forma de ver" da página da pessoa. A partir de 62rem, o nome e os capítulos à esquerda e as memórias à direita; a lista usa a largura inteira.

### Árvore e círculo

O comportamento, o quadro do mapa e o cartão estão em `docs/decisoes.md`, "Árvore" e "Círculo". A aparência:

- `telas/arvore.css`, `telas/mapa.css` (o quadro: `.quadro` na página e `.pm` no painel) e `telas/circulo.css`.
- As cores das famílias na árvore são as dos tokens, na ordem delas (`--arvore-familia-0` a `-3`, definidas em `.mapa`; no navegador, `fundoDe`, em `src/lib/cliente/arvore.ts`).
- O painel é um cartão branco pousado no mapa, com a sombra do bilhete e o raio da moldura: 20rem de largura na tela grande, 23rem na TV, e de margem a margem no celular, recolhido numa linha. A ficha traz o retrato em arco e o nome em serifa.
- A busca de "Partir de" tem o estilo do mapa (`.mapa .busca…`); a dos formulários, o de `formulario.css`.
- O círculo usa o mesmo quadro: `.quadro`, um `<aside class="pm" data-quadro>` com `pm__alto`, `pm__ficha`, `pm__corpo` e seções `pm__secao`, e a barra de baixo `mapa__zoom`. As três faixas são a cor da tela cada vez mais clara (`--faixa-1` a `--faixa-3`), e a tela é tingida na cor da família de quem olha, como a conta e o Início.

### Formulários

**A base, para todas as telas de formulário**

- **A página:** `src/components/formularios/Pagina.astro`: `<Pagina titulo="…" rotulo="…" nucleos={…} secao="…">`, com a frase de abertura em `slot="abertura"` e o formulário dentro; `semAbertura` tira a abertura, para a página trazer o próprio alto com o `h1` (a nova memória). Ela traz o esqueleto, a abertura quieta, os recados que voltam do servidor (`?ok=` e `?erro=`, na peça Recado), o `<noscript>` que esconde o que depende de script e mostra os blocos que ele mostraria, `guardarFormularios` (o digitado volta quando o servidor recusa) e `marcarEnvios` ("Salvando…"). `<Pagina larga>` alarga a coluna (`pagina-de-formulario--larga`) para listas e tabelas. A linha pequena acima do título ("Rascunho", "Memória publicada", "Administração") vem de `rotulo`.
- **O estilo:** `src/visual/telas/formulario.css`, um arquivo só, dentro de `.pagina-de-formulario`. A marcação continua com os nomes que os scripts de `src/lib/cliente/` criam e procuram (`campo`, `opcoes`, `opcao`, `marcar`, `dica`, `acoes`, `acoes--etapas`, `botao--leve`, `botao--arquivo`, `situacao`, `resumo`, `confirmacao`, `etapas`, `busca…`, `audio…`, `quem-estava…`, `foto-enviada`, `nova-pessoa`, `abas`, `painel`, `lista-de-marcar`, `passo-ano`, `campos-data`, `confirmar…`); o arquivo é o desenho desses nomes com os tokens. O desenho é o do sistema: rótulo em mono, resposta numa linha para escrever em cima, foco que engrossa a linha e acende o fundo.
- **O que o script esconde fica escondido:** `.pagina-de-formulario [hidden] { display: none !important }`. Sem isso, qualquer `display` deste arquivo mostrava o que estava escondido. O `<noscript>` da página vence essa regra por vir depois.
- **A pergunta** é a legenda de cada parte (`legend`), grande, em serifa. Dentro de outra parte, um degrau abaixo.
- **A trilha das etapas** (`ol.etapas`, criada por `etapas.ts`) é quieta: no celular, uma fila de números com 44 px de toque e a linha "Etapa 2 de 7: Quando e onde"; no computador, uma coluna à esquerda com o nome de cada etapa, e a abertura sobe para o alto da página. Todo formulário com etapas que é a página inteira tem a trilha em três colunas e a pergunta começando na quarta. A exceção é a nova memória, em que a frase é a trilha (abaixo). As ações param na largura dos campos, e o vão entre as colunas é `--calha`. Sem etapas (o relato), a abertura fica à esquerda e o formulário à direita. Entre páginas (nova pessoa e laços), a mesma trilha em versão de fluxo (`etapas--fluxo`): no celular só a etapa em que a pessoa está leva o nome.
- **Ações:** o botão cheio é a ação principal; `botao--leve` é texto sublinhado. Toda ação que não é a principal é texto sublinhado, inclusive "Escolher fotos" e "Gravar áudio".
- **Estados:** pressionado (a opção e os passos do ano encolhem um pouco), enviando (o `aria-disabled` do botão), erro (`aria-invalid` pinta a linha do campo no alerta; num grupo de opções, uma barra ao lado), desabilitado (linha tracejada e texto suave) e o recado do envio (`.situacao`, com a barra do alerta quando é erro).
- **A opção marcada** fica no pastel da tela (o do tipo de momento, quando há), com a borda na cor do texto. Os tipos de momento acendem na cor do tipo (`estiloDoTipo`).
- **A busca de pessoa** tem o estilo geral (`.pagina-de-formulario .busca…`).

**Nova memória (`/nova`): a frase é a trilha** (proposta B do conceito da sessão D, decisão do Gui de 18/11/2026; capturas do conceito em `docs/visual/conceitos/sessao-d/`, as `nova-b-*`)

- As sete etapas, cada uma com a pergunta grande. Vale para memória nova, rascunho e correção de memória publicada. Sem a trilha numerada: `montarEtapas` recebe `semTrilha`, e a frase faz o papel dela.
- **O alto** (`.em-frase__alto`, fora do formulário): o `h1` em mono, pequeno ("Nova memória · Etapa 2 de 7: Quando e onde"), a frase em serifa e o fio de progresso (`--feito`, posto pelo script). No celular é um cartão branco no alto; no computador, sem cartão, nas colunas 1 a 5, com cada parte numa linha e as que não são da etapa em tom suave, e o formulário nas colunas 7 a 12. A parte da etapa fica no pastel da família, como marca-texto; a vazia, em itálico. Cada parte é um trecho com papel de botão (`role="button"`, `tabindex="0"`), sublinhado como ação de texto, com foco visível. Nada fica preso: a frase rola com a página. Sem script, só o título aparece, sem cartão.
- **A data por toque** (`.grade-data`): "O ano" com a fila de décadas (texto, que rola para o lado no celular e quebra em linhas no computador, com "Antes de 1900" no fim) e a grade de dez anos (cinco por linha), depois "O mês, se souber" (quatro por linha no celular, seis no computador) e "O dia, se souber" (sete e onze por linha). Cada botão tem 44 px, em mono, com o fio fino; o marcado fica cheio na tinta, e o ano que ainda não chegou, tracejado. "Foi hoje" e "Não tenho certeza da data" ficam embaixo, depois de um fio. Sem script, os campos de sempre (`CampoData`).
- **"Confira antes de publicar"** é o cartão branco do resumo, com o tipo em mono, a frase completa um degrau abaixo da pergunta, os temas em mono, "Ficou sem:" com as idas diretas em ação quieta e a dica "Toque em qualquer parte da frase para mudar."
- **"Quem pode ver?"**: o seletor segmentado, com a explicação colada nele (`--e-2`), e as famílias num grupo à parte, a `--e-7`.
- **Fotos:** cada foto como uma foto revelada pequena, com a legenda, "Usar na linha do tempo" e "Remover foto" ao lado.

O resumo ao lado só existe no relato. Os outros formulários com etapas (o capítulo) usam a grade de sempre, com a trilha numerada à esquerda.

**Relato (`/memorias/<id>/relato`):** a abertura à esquerda, "Como foi?" à direita, com "Quem está contando" (a busca de pessoa), os áudios (cada um num cartão, com o tocador do aparelho, a transcrição recolhida e "Subir", "Descer" e "Remover") e o texto. À direita, no computador, a foto-chave e a ficha da memória de que o relato fala (`ao-lado--fixo`), sem mudar enquanto se escreve.

**Capítulo (`/capitulos/novo` e `/capitulos/<id>/editar`):** as etapas "Que capítulo é esse?", "Onde ele se encaixa?" e "Quem vê". O mês tem o rótulo "Mês, se souber" e a opção "Não sei", como na memória. Na edição, "Sobre o capítulo" vem primeiro, com a trilha na coluna da esquerda no computador; "Memórias do capítulo" mostra as que já estão marcadas, e as outras entram por uma busca (sem script, a lista vem inteira). As duas partes são separadas por um fio.

**Nova pessoa, ficha e retrato:** `/pessoas/nova` e `FichaDoIntegrante.astro`. O retrato no formulário (`CampoRetrato.astro`) aparece recortado em arco, sobre a cor da família (`data-familia`, de `corDaPessoa`).

**Editar página e laços (`/pessoas/<id>/editar`):** proposta A do conceito da sessão E (escolha do Gui, 18/11/2026; capturas em `docs/visual/sessao-e/editar/`). A página é larga. No computador, a abertura fica à esquerda com o índice (a ficha e cada grupo, com a conta em mono), que acompanha a rolagem só onde há mouse (`sticky` dentro de `(hover: hover) and (pointer: fine)`); a abertura ocupa a altura da página para ele ter por onde andar. À direita, "Ficha" e "Laços de Fulano" em rótulo mono, cada um colado no que nomeia (`--e-3`) e a `--e-7` da parte de cima. A ficha é um cartão branco de uma linha (retrato, nome, resumo em mono, começo de "Sobre" e "Editar a ficha"); aberta, os campos entram no mesmo cartão, abaixo de um fio, com as perguntas um degrau abaixo (`--t-titulo-3`). Cada grupo de laços é um cartão branco, a `--e-5` um do outro, com o título em serifa (`--t-titulo-3`) e a conta em mono ao lado; cada laço é uma linha com o retrato (3rem), o nome, o que a pessoa é e "Editar" à direita, com um fio entre as linhas. O editor e o "Adicionar" abertos ficam no papel, dentro do cartão. O grupo vazio é uma linha só, sem fundo, com um fio em volta e o título em `--tinta-suave`. Na tela grande, os grupos ficam dois a dois. Remover usa a confirmação no próprio lugar, com o botão na cor do alerta.

**Utilitárias, silenciosas:** o histórico da memória, as confirmações de excluir (um cartão com a marca do alerta), os rascunhos e a lixeira. As listas usam `linhas`: um fio entre os itens, o nome em destaque, a data em mono e a ação em texto sublinhado. O estado vazio é a peça Vazio.

**Administração:** tipos de momento (ver "Tipos: paleta e ícones"), famílias, carta de Natal e espelho da produção, com "Administração" acima do título e "Voltar para a sua conta". O texto do espelho manda abrir a conta e ir a "Administração" para baixar a cópia.

Origem: [histórico, "Página da memória"](historico/visual-ate-2026-11-17.md#página-da-memória); ["Linha do tempo, capítulo e laço"](historico/visual-ate-2026-11-17.md#linha-do-tempo-capítulo-e-laço); ["Conceito"](historico/visual-ate-2026-11-17.md#conceito-fase-1-em-aprovação); ["Grupo 1"](historico/visual-ate-2026-11-17.md#grupo-1-explorar-e-a-página-da-memória); ["Grupo 2"](historico/visual-ate-2026-11-17.md#grupo-2-pessoal); ["Grupo 3"](historico/visual-ate-2026-11-17.md#grupo-3-familia); ["Grupo 4"](historico/visual-ate-2026-11-17.md#grupo-4-formularios); ["Respostas do Gui às perguntas da fase 3"](historico/visual-ate-2026-11-17.md#respostas-do-gui-às-perguntas-da-fase-3-17112026); ["Parte 1"](historico/visual-ate-2026-11-17.md#parte-1-a-lista-as-formas-de-ver-da-pessoa-quem-aparece-e-o-link-do-título); ["Parte 2"](historico/visual-ate-2026-11-17.md#parte-2-a-frase-na-abertura-o-resumo-ao-lado-e-a-zona-de-perigo); ["Parte 3"](historico/visual-ate-2026-11-17.md#parte-3-a-árvore-nítida-no-zoom-o-cartão-de-bicho-e-a-conferência-final); ["Quadro do mapa"](historico/visual-ate-2026-11-17.md#quadro-do-mapa-árvore-e-círculo).

## Para o futuro

- **Página do laço:** título, período e pessoas parados à esquerda no computador; à direita, os marcos numerados, com data e lugar em mono (Union, "Our story"). As fases do casal em sanfona (Union, "The journey"): ano grande, nome da fase, data pequena; abre uma de cada vez.

Origem: [histórico, "Linha do tempo, capítulo e laço"](historico/visual-ate-2026-11-17.md#linha-do-tempo-capítulo-e-laço); ["Componentes novos"](historico/visual-ate-2026-11-17.md#componentes-novos).

## O que falta

**Da fase 4 (movimento e detalhes)**

- A frase que acende palavra por palavra, a foto que amplia no lugar e o tocador de áudio próprio ("O que ficou de fora do sistema, de propósito").

**Da fase 5 (QA visual no aparelho)**

- **No iPhone de verdade:** os controles do Explorar (as famílias e as abas rolando para o lado, o cartão dos filtros, o seletor da ordem por cima da faixa de décadas e o toque fora que o fecha); a troca com movimento do Explorar, a rolagem devolvida e o voltar pelo gesto; a linha do tempo depois de uma troca (a faixa de décadas e o ano parados); o modo TV com "Só as fotos"; a galeria da memória; a linha do tempo na página da pessoa e do tema; a lista; o gesto de dois dedos na árvore e a nitidez dela no zoom (também no Safari do computador); o mapa encostado no pé da tela (se o Safari desenha a banda atrás das barras); os formulários (teclado do aparelho, a frase da nova memória e a data por toque, a fila de décadas rolando para o lado, a zona de perigo, a gravação de áudio); o recorte do retrato; a tela de tipos.
- **Numa TV de verdade, com controle:** o modo TV (inclusive "Só as fotos" e "Tela cheia" e os 5 segundos dos controles, que são um ponto de partida), o painel e a busca do mapa, e os formulários em 1920 px.
- **Na homologação, com o espelho da produção:** a árvore, as páginas de pessoa e a lista de pessoas com o formato real da família.
- **Com alguém mais velho:** a aba do ano no mural. Se passar batida, a saída combinada é o ano na margem de toda foto.
- **O que nenhuma tela mostrou ainda:** o envio de foto nova (também chegando à frase da nova memória), a gravação de áudio, o recorte do retrato com uma foto e o histórico com alterações.
- Na pinça, o ponto entre os dedos desvia alguns pixels quando os dois dedos não se movem juntos: o zoom é feito em torno do meio dos dedos a cada movimento, sem acompanhar o deslocamento do meio.

**Limpeza**

- Separar os testes das telas do `describe('conceito')`, em `testes/visual.test.ts`.
- Refazer as capturas da árvore em `docs/visual/fase-3/familia/` (mostram o cartão de bichinho antigo) e as do Explorar em `docs/visual/fase-3/explorar/` (desatualizadas para o modo TV, a família e o mural), e pôr na lista de `scripts/capturas.mjs` "Só as fotos", as três animações e a família com duas marcadas.

Origem: [histórico, "O que falta"](historico/visual-ate-2026-11-17.md#o-que-falta); ["Estado do grupo 1"](historico/visual-ate-2026-11-17.md#estado-do-grupo-1-para-a-próxima-sessão-seguir-sem-a-conversa); ["Parte 3"](historico/visual-ate-2026-11-17.md#parte-3-a-árvore-nítida-no-zoom-o-cartão-de-bicho-e-a-conferência-final); ["Quadro do mapa"](historico/visual-ate-2026-11-17.md#quadro-do-mapa-árvore-e-círculo); ["Tipos: paleta e ícones"](historico/visual-ate-2026-11-17.md#tipos-paleta-e-ícones).
