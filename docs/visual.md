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
- **Cor com função.** No bayara, o azul marca o resultado e o terracota marca um custo. Aqui, o pastel marca a família e o saturado marca o que importa. Cor sem função não entra.
- **Objeto com sentido.** O crachá da @bsurda imita uma coisa real do mundo da festa. Aqui, a polaroid e o carimbo do verso imitam o mundo da família.
- **Ações tipográficas.** Links e ações secundárias são texto sublinhado, sem pílula. Botão cheio só para a ação principal da tela.
- **Detalhe pequeno que se nota.** Como o nome do topo do bayara, que se preenche quando o nome grande sai da tela. Um ou dois no site, nunca em toda parte.
- **Celular primeiro, desktop de destaque.** A família vai usar quase só no celular, então cada tela nasce em 390 px. O desktop é o momento especial, a versão de ver juntos na TV: cada tela ganha composição própria em tela grande (de 1280 a 1920 px), com fotos grandes e tipo de capa, e nunca é o celular esticado.

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
| Neutros | Fundo de papel quente (perto de `#F4F2F0` ou `#FFFAEB`); texto quase preto, sem chegar ao preto puro |
| Polaroid | Preferência: polaroid em toda foto-chave da linha do tempo. Confirmar na implementação vendo como fica na linha do tempo |
| Linha do tempo | Lista vertical com a rolagem normal, das mais recentes para as mais antigas, sem efeito de folhear nem carrossel |
| Página da memória | Ordem abaixo, com o convite para escrever o relato no fim |
| Marca | "MEMÓRIAS" é a palavra principal e fixa. Abaixo dela vêm os sobrenomes das famílias do que está sendo visto, que mudam conforme a tela (ver "Assinatura do nome"). O símbolo é um monograma com o M de Memórias |

## Movimento

Regra: a rolagem é sempre a do aparelho, e nenhum efeito quebra um padrão de navegação conhecido. Efeito é bem-vindo, sem excesso.

Entram:

- o cartão que aparece com um esmaecer curto;
- a sanfona que abre empurrando o conteúdo;
- a foto que amplia ao toque e fecha ao tocar fora;
- o item da barra de décadas que acende;
- uma frase de abertura que acende palavra por palavra como na home do bayara.design: acompanha a rolagem natural, não prende a página e aparece pronta com movimento reduzido.

Ficam de fora: cartão que deita ao rolar, foto que cresce enquanto se rola, carrossel lateral, anel 3D, imagem distorcida, tela de carregamento com porcentagem, faixa que corre sozinha e qualquer trecho que segura a página. Com movimento reduzido, nem o esmaecer.

O Safari do iPhone já deu trabalho com efeitos presos à rolagem no site da @bsurda (ver o `CLAUDE.md` daquele repositório, "Banda do Safari no iPhone"): nada de `sticky` ou `fixed` novo sem conferir no aparelho.

## Componentes novos

As medidas abaixo vêm das referências e são ponto de partida: o desenho final sai da revisão.


| Componente | Onde | Detalhe |
| --- | --- | --- |
| Polaroid | Foto-chave na linha do tempo e na abertura da memória | Moldura branca, margem de baixo mais larga com a legenda, cantos de uns 12 px, sombra suave (no Folira: 5 px, 20 px, 40 px de desfoque, preto a 12%). Inclinação entre poucos valores (por exemplo −3°, −1°, 2°), escolhida pelo id da memória para ficar sempre igual |
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
- **Os sobrenomes acompanham o que está sendo visto.** Na linha do tempo geral ("Tudo") e no núcleo Bayara Bracarense: "Bayara & Bracarense". No núcleo Bayara (Gui, Giovanna e Elizete): "Bayara". No núcleo Bracarense: "Bracarense". Assim a assinatura cresce com o acervo: se um dia entrar outra família, por um casamento, a combinação aparece sozinha nas telas em que ela estiver.
- Para isso cada núcleo precisa dizer de quais famílias ele é (Bayara Bracarense = Bayara e Bracarense). A linha junta os sobrenomes sem repetir, na ordem dos lados da árvore (Bayara à esquerda), com "&" antes do último e vírgula entre os outros ("Bayara, Bracarense & Silva").
- Telas que não são de um núcleo (pessoa, memória, capítulo) usam as famílias do que mostram: os núcleos da memória ou do capítulo, as famílias da pessoa. Na dúvida, a versão de "Tudo".
- No texto corrido e na aba do navegador, o nome por extenso continua "Memórias Bayara e Bracarense".
- O rascunho mostra três pesos e larguras (normal, condensada, negrito) da mesma família: comparar na prévia, junto com a escolha da fonte.

## Monograma

Decisão do Gui de 16/11/2026: o monograma é o M de Memórias, que não muda, enquanto os sobrenomes mudam com a tela. Substitui os dois Bs ("uma haste"), que só valiam para duas famílias.

- Sai da serifa dos títulos, desenhado em SVG para funcionar pequeno.
- **Uso:** ícone do site (favicon e ícone de tela inicial do celular) e, no celular, no lugar da assinatura quando falta espaço.
- **Cor:** uma cor só, no tom do texto. Pode ganhar a cor da família da tela, como opção a comparar na prévia.
- **Tamanho mínimo:** conferir a 16 px (favicon).

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
