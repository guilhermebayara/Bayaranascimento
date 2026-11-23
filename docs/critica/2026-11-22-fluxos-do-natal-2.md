# Crítica C2: os fluxos de quem recebe o acervo no Natal, com objetivos

22/11/2026, branch `critica-2-2026-11-22`, nascida da `homologa` em `f25696a` (#161, o modo TV com a barra). Esta crítica mede cada tela contra o objetivo que ela deveria cumprir, de uso e visual. Ela não muda código do site, não abre PR e não reabre decisão: onde questiona uma regra, a pergunta vai para o Gui, com o motivo.

Cada ponto com alternativa vem classificado, como pede o adendo de 22/11:

- **Pequeno e claro:** a alternativa descrita (com esboço, quando ajuda) já basta para o Gui aprovar pela pergunta.
- **Pede solução nova:** o problema, a direção e o que uma exploração precisaria resolver, sem desenhar a solução. A pergunta é se vale explorar.

## Como foi olhado

Site local com o acervo de exemplo (`npm run dev` e `npm run fotos-de-exemplo`), usado de verdade pelo "Ver como": tocar, rolar, escrever, enviar, publicar, responder e voltar, em 390 × 844, no celular deitado (844 × 390), em 1280 × 720 e em 1920 × 1080.

- **Elizete:** a carta na primeira visita, o Início (também como no dia 25, com `?hoje=2026-12-25`), o Explorar, a busca por "aquele Natal na casa da vó" pelos filtros, a memória "Natal de 2025" e o modo TV.
- **Lucas Magno:** do cartão "Você estava lá e ainda não contou" até o relato publicado em "Jantar de casamento", passando por enviar uma mensagem, sair sem publicar, voltar e publicar.
- **Giovanna:** o pedido para liberar o relato dela em "Casamento da Prima Carol", no Início e na memória.

**Um tropeço da sessão, para o Gui saber.** O clone desta sessão chegou com a `homologa` antiga (`aeb9526`, o #73), e a primeira passada foi feita nela. Só ao abrir a C1 apareceu a diferença (a página de escrever em forma de conversa). A passada inteira foi refeita na `homologa` de agora (`f25696a`), com o banco local do zero; tudo o que está aqui é dessa versão. Um defeito da versão antiga (a polaroid vazia no alto da página do relato, no celular) já não existe.

**O que não deu para ver:** o login do Cloudflare Access, a homologação com a família de verdade, uma TV e um iPhone de verdade, a gravação de áudio (o navegador de teste não tem microfone) e alguém mais velho usando.

## O que mais pesa

1. **O dia 25 é coletivo, e o site só tem entradas individuais.** A carta é lida uma vez, sozinha, no aparelho de quem abre; o Início diz "Só você vê esta página"; o caminho até a TV passa por Explorar e por um link pequeno. Ver junto, que é o que a família vai fazer na sala, não tem porta.
2. **Achar uma memória lembrada pede conhecer a organização do acervo.** "Aquele Natal na casa da vó" levou quatro toques e oito telas de rolagem, porque a pessoa precisa saber que "Natal" é capítulo e tema (e o tipo é "Festa") e achar a mãe pelo apelido numa lista de nomes.
3. **Contar a própria parte funciona, mas sem a memória à vista e com um rascunho que se esconde.** A janela de conversa é boa para os mais velhos (o microfone grande quando a caixa está vazia), e o caminho até ela, o "enviar" que não entrega e a decisão de liberar às cegas pesam contra.

---

## Fluxo 1: a primeira visita, do login ao Início

### Os objetivos

- **De uso:** entender o que é o presente e quem o deu, sentir que é da família dela, saber o que fazer primeiro.
- **Visual** (`docs/visual.md`, "Uma ideia forte por tela"): na primeira visita, a carta de Natal assinada à mão; depois, o que entrou de novo, como quem abre a caixa e acha fotos que não estavam lá. Aniversários e atalhos em segundo plano. Página íntima, tingida na cor da família.
- **Inferido (marcado assim):** no dia 25 a pessoa está com a família na sala, com a TV ligada; nas semanas seguintes, sozinha no celular. As duas situações pedem coisas diferentes do mesmo Início.

### Elemento por elemento

**A carta.**
1. Objetivo: dizer o que é o presente e quem deu, e fazer a pessoa se sentir em casa.
2. Elementos: "Oi, Elizete," enorme, o primeiro parágrafo em serifa, as três assinaturas à mão com o coração, o carimbo "Natal de 2026", o fundo manteiga (a família completa) e três fotos de memórias em que ela aparece.
3. Cumpre, nos dois objetivos. É a tela mais forte do site.
4. Porque fala com ela pelo nome, diz em uma frase o que o site é ("as fotos que estavam espalhadas pelos celulares e pelas gavetas") e o que se espera dela ("a sua versão delas ainda está faltando"). Em 1920 × 1080, sem o recado de teste, tudo cabe numa tela, com as fotos à esquerda como objetos sobre a mesa.
- Detalhe (baixa): cada foto leva à memória, mas a legenda diz só "BELO HORIZONTE (2026)". Quem olha não sabe que é "Jantar de casamento", nem que dá para tocar. No celular as fotos vêm depois de "Abrir o acervo", então quem toca no botão nunca as vê.

**A carta conta como vista ao abrir.**
1. Objetivo: a carta aparecer uma vez e depois dar lugar ao Início.
2. Elemento: `chegarAoPainel` marca a carta como vista na primeira página aberta, mesmo num recarregar.
3. Cumpre o objetivo escrito; afasta o do dia 25 (inferido).
4. Escada de porquês. Por que a carta some depois da primeira vez? Para o Início aparecer nas visitas seguintes. Por que a primeira vez é a única? Porque a carta foi pensada como a abertura de cada pessoa, no aparelho dela. A premissa é que cada um abre o presente sozinho. No dia 25, quem abre no celular à mesa gasta a carta ali, e a hora de ler junto, na TV, encontra o Início de quem estiver logado, com "Só você vê esta página". `/carta` existe, mas só como o link discreto "Carta de Natal". Gravidade: **média**, dentro do ponto do dia 25, abaixo.

**O Início depois da carta.**
1. Objetivo: saber o que fazer primeiro e se ver no acervo.
2. Elementos, no celular, nesta ordem: "Só você vê esta página", "Oi, Elizete." com o nome sublinhado a caneta, "Que bom que você chegou.", os avisos, a linha dos rascunhos, "Carta de Natal" e os cartões: "Você estava lá e ainda não contou" (com o único botão cheio, "Escrever meu relato"), "Neste dia, em outros anos", "Próximos aniversários", "Você no acervo" e "Explorar todas as memórias".
3. Em parte. Diz quem é a pessoa e dá uma tarefa clara. A tarefa é a errada para o primeiro dia.
4. No dia 25 a vontade é ver. O que mostra a pessoa a ela mesma ("Você aparece em 34 memórias, de 1968 a 2026", com as fotos) é o quarto cartão. E, no visual, a primeira tela do celular é só texto: sem avisos nem rascunhos (o que vai acontecer no dia 25, porque os avisos só nascem depois do primeiro acesso), ela fica com a saudação, "Que bom que você chegou.", o link da carta e o começo do cartão de contar. A ideia forte da tela ("o que entrou de novo") não tem como aparecer no primeiro dia: sem visita anterior, não há novidade nem envelope. Gravidade: **média**.

**"Neste dia, em outros anos" no dia 25.**
1. Objetivo: a lembrança do dia, como fotos tiradas da caixa.
2. Elemento: as memórias do mesmo dia; sem nenhuma, da semana; sem nenhuma, do mês.
3. No dia 25, mostra só "Natal com os primos" (25/12/1998). "Natal de 2025" (24/12), "O Natal em que faltou luz" e "Primeiro Natal na casa da Vó Vivica" ficam de fora, porque o dia já teve uma.
4. A regra é boa para qualquer dia e fraca justo no Natal, quando a família vai querer os Natais. Gravidade: **média** no dia 25, nenhuma no resto do ano.

**"Só você vê esta página" numa sala com TV.**
1. Objetivo visual: página íntima, na cor da família, só da pessoa.
2. Elementos: o rótulo, a cor da família mais recente, os avisos e rascunhos dela.
3. Cumpre nas semanas seguintes; no dia 25, na TV, mostra a intimidade de uma pessoa para a sala inteira.
4. Ver o ponto do dia 25.

### O ponto do dia 25 (pede solução nova)

- **O problema.** Os três momentos que mais importam no dia (ler a carta junto, ver os Natais da família, passar memórias na TV) não têm porta. O caminho de hoje é: alguém loga num computador ligado à TV, cai no Início dele ("Só você vê esta página"), vai a Explorar e toca em "Modo TV", que começa pela memória mais recente ("1 de 48", "Jantar de casamento"). Ou vai a Capítulos, Natais, "Passar no modo TV". Quem espelha o celular cai no modo TV empilhado, que no celular deitado mostra o título e meia foto e esconde os controles (844 × 390).
- **A direção.** Um "ver junto" do Natal: uma entrada, a partir da carta ou do Início nos dias do Natal, que leve a sala a uma sequência pensada para a TV (a carta lida em tela grande, os Natais da família, as memórias de quem está ali), sem passar pela página íntima de ninguém. O modo TV em janela deitada entra na mesma exploração, porque é o celular de alguém espelhado na sala.
- **O que a exploração precisa resolver.** De quem é o login na TV e o que essa pessoa deixa ver (o modo TV respeita quem vê o quê, então a TV mostra o acervo de quem logou); se a carta lida junto conta como a "primeira vez" de alguém; por quanto tempo a entrada existe (o dia 25, a semana, o que os administradores ligarem); como fica a TV com o celular deitado; o que acontece com quem abre sozinho, longe da festa.
- **Custo.** Antes de 10/12: médio, e é a última chance de ter efeito no dia. Depois do Natal: perde o sentido até o Natal seguinte.

### Alternativas pequenas e claras

| Alternativa | O que muda | Custo agora | Custo depois |
| --- | --- | --- | --- |
| **A. "Você no acervo" antes de contar, nos primeiros dias** (C1, 1.2) | Na primeira ida depois da carta e nas seguintes até a pessoa contar algo, o Início abre com ela nas memórias, e o convite para contar desce | Pequeno: a ordem é de `composicaoDoInicio()` | Pequeno |
| **B. No Natal, "Neste dia" são os Natais** | Do dia 24 ao 26, "Neste dia, em outros anos" mostra as memórias de 24 e 25 de dezembro (ou as do tema "Natal") em vez de só as do dia exato | Pequeno: uma regra em `src/lib/painel.ts`, com teste | Pequeno, mas só vale no ano seguinte |
| **C. A legenda das fotos da carta diz o que é** | O título da memória na margem, como no mural, em vez de só lugar e ano | Pequeno | Pequeno |

### O que funciona e deve ficar

- **A carta inteira.** Nome grande, assinaturas à mão, o carimbo e as fotos da pessoa fazem o que a tela promete: quem lê entende que ganhou algo feito para ela. É o modelo de "uma ideia forte por tela".
- **"Que bom que você chegou."** Uma frase só, no tom certo, para quem entra sem histórico.
- **"Você no acervo"** no desenho da sessão H (o número grande, os anos, as quatro fotos encostadas): é o melhor "isto é seu" do site; a crítica é só da posição.

---

## Fluxo 2: encontrar e ver memórias

### Os objetivos

- **De uso:** achar uma memória lembrada ("aquele Natal na casa da vó"), passear sem rumo e ver junto na TV.
- **Visual:** no Explorar, a assinatura grande e logo o ano mais recente abrindo a lista, com menu e filtros pequenos; na linha do tempo, o ano como divisória e as fotos-chave como polaroids; no mural, só as fotos, como a caixa aberta na mesa; no modo TV, uma memória por vez, grande, para ver junto; na memória, a foto e o verso, com os relatos como conversa.

### Elemento por elemento

**O alto do Explorar.**
1. Objetivo: a marca e o começo da lista (visual); chegar logo às memórias (uso).
2. Elementos: "MEMÓRIAS" e "Bayara & Bracarense" em tamanho de capa, as pílulas das famílias, as abas, "Filtros" e "Ordem", a conta e a faixa de décadas.
3. Cumpre a marca; afasta o uso e a ideia de álbum. Em 390 × 844, a primeira tela não tem nenhuma foto: a primeira polaroid começa a 800 px. Em 1920 × 1080, a primeira memória começa a 730 px, com a foto cortada. No mural da TV, a assinatura e os controles ocupam mais da metade da primeira tela, e a "caixa aberta na mesa" fica para baixo. A mesma assinatura, maior, fecha toda página no rodapé.
4. Escada de porquês. Por que a assinatura abre o Explorar? Porque é a ideia forte desta tela, na tabela de `docs/visual.md`. Por que a marca precisa da primeira tela toda vez? Porque, quando a tabela foi feita, a linha do tempo era a página inicial (`/`), e a capa era a entrada do site. Desde que o painel virou o Início, o Explorar é uma ferramenta que se abre pelo menu, várias vezes por visita, e a capa repete uma boas-vindas numa tela de trabalho. A premissa ficou de outra época. Gravidade: **média** (visual e uso).
- **Pede solução nova.** O problema: a tela de procurar e passear abre sem foto nenhuma. A direção: a primeira tela do Explorar mostra memórias, e a marca fica onde ela já é forte (o Início, a carta, o rodapé). A exploração precisa resolver: o que vira a ideia forte do Explorar, como a família e a assinatura do que está filtrado continuam dizendo "de quem é isto", e o que acontece no computador, onde a assinatura grande tem mais razão de ser.

**As saídas "Modo TV" e "Me mostre uma memória" no celular.**
1. Objetivo: passear sem rumo, com a porta mais fácil para quem não sabe o que procurar.
2. Elementos: as duas saídas com seta, no fim da fila das abas.
3. Não cumpre no celular: em 390 px a fila rola para o lado e só mostra um "M" cortado depois de "Lista".
4. "Me mostre uma memória" é, no celular, a melhor tela do fluxo para a Elizete: um botão, uma memória, a foto grande, o trecho do relato e "Me mostre outra". Esconder justo ela, numa fila que rola para o lado (a rolagem diferente que a Elizete já estranhou), inverte a prioridade. A fila das famílias, logo acima, também rola para o lado. Gravidade: **média**.
- **Pequeno e claro** (C1, 2.2). As três formas de ver cabem na largura; as duas saídas ganham a linha delas, à vista, e "Me mostre uma memória" entra também no fim do Início. Esboço: `explorar-saidas.html`, quadros A e B.

**Achar "aquele Natal na casa da vó".**
1. Objetivo: achar uma memória de que a pessoa se lembra por palavras.
2. Elementos: os filtros "Tipo de momento", "Quem estava junto", "Capítulo", "Tema" e "Período", a lista e a faixa de décadas.
3. Não cumpre. Medido como a Elizete: "Filtros", "Quem estava junto", procurar "Vó Vivica" (a 1.355 px do alto da lista, que é de nomes em ordem alfabética), "Ver as 11 memórias": "Primeiro Natal na casa da Vó Vivica" aparece a 6.564 px, umas oito telas abaixo. Pelo caminho mais natural, "Natal", a pessoa não acha: "Natal" não é tipo (o tipo é "Festa"); é o capítulo "Natais" e o tema "Natal", em dois grupos diferentes.
4. Escada de porquês. Por que os filtros são esses? Porque espelham como o acervo é organizado: tipo, capítulo, tema, pessoas, período. Por que procurar pela organização? Porque o acervo foi pensado de dentro, por quem cadastra. A premissa é que quem procura pensa nas categorias do acervo; quem procura pensa em palavras ("Natal", "vó", "Sabará") e em gente ("minha mãe"). Gravidade: **alta** nas semanas seguintes, quando o acervo terá centenas de memórias.
- **Pede solução nova** (C1, 2.1). O problema está descrito acima. A direção: procurar por palavra, que ache no título, no lugar, nas pessoas (pelo nome e pelo que ela é para quem procura), no capítulo, no tema e no tipo, numa caixa só. A exploração precisa resolver: onde a busca mora (no Explorar, no menu, no Início), como ela convive com os filtros (vira mais um filtro no endereço ou substitui parte deles), como respeita quem vê o quê (o que a pessoa não vê não pode aparecer nem como sugestão), o que acontece com "minha mãe" e "vó" (parentesco do ponto de vista de quem procura) e o custo da consulta com o acervo cheio.

**A lista de "Quem estava junto".**
1. Objetivo: marcar quem estava, reconhecendo as pessoas.
2. Elementos: caixas de marcar com os nomes, em duas colunas, de A a Z, sem retrato.
3. Não cumpre para os mais velhos.
4. O site diz "sua avó", "seu filho" em todo lugar, menos aqui, onde a pessoa mais precisa reconhecer alguém. A mãe da Elizete é "Vó Vivica", no fim da lista. Gravidade: **média**.
- **Pequeno e claro.** O parentesco embaixo de cada nome e, no alto, as pessoas mais próximas de quem olha (as mesmas sugestões que "Quem estava?" da nova memória já calcula). Esboço: `explorar-saidas.html`, quadro C.

**O modo TV em 1920 × 1080.**
1. Objetivo: uma memória por vez, grande, para ver junto, com controles que qualquer um usa com o controle remoto.
2. Elementos: a polaroid grande e torta, o carimbo, o título, o trecho assinado à mão, "Com Elizete, Giovanna, Gui e Lucas Magno", "Abrir esta memória" e a barra branca com símbolos de TV, com o nome escrito no foco.
3. Cumpre, nos dois objetivos.
4. A barra usa os símbolos que qualquer TV usa, não rola, e o foco começa em "Próxima". Detalhe (baixa): "Com Elizete, Giovanna…" está em mono, na tinta suave sobre o lilás, e é o que a sala vai comentar ("olha a tia ali"); vale conferir o contraste e o tamanho a três metros.

**O modo TV no celular deitado (844 × 390).** Cabem o título e metade de uma polaroid pequena; os controles e o trecho ficam abaixo, e a página rola. Está conforme a regra (abaixo de 62rem vale o modo TV empilhado), e é como o celular fica quando alguém espelha na TV ou vira o aparelho para mostrar. Gravidade: **média**. **Pede solução nova**, dentro do ponto do dia 25 (a composição de uma janela larga e baixa ainda não existe).

**A página da memória.**
1. Objetivo: a foto e o verso; rever junto e ler cada voz.
2. Elementos: a abertura na cor do tipo (carimbo, título, trecho assinado, o monte de fotos que se abre em leque no computador), a ficha, "Quem estava" com retratos e parentesco, os relatos como conversa num fundo recuado, a parede de fotos, o convite para contar, "Antes" e "Depois".
3. A abertura cumpre; o meio da página afasta o objetivo visual.
4. **"Quem estava" pesa mais que os relatos.** Em 1920 px, os nove retratos grandes ocupam uma tela inteira antes da primeira voz; no celular, uma tela e meia. A ficha de quem estava é informação; a voz de cada um é o que a memória tem de único. Gravidade: **média**. **Pequeno e claro:** na tela grande, "Quem estava" com retratos menores (a peça Gente, como em Pessoas), para os relatos subirem. A ordem da página fica como está.
- **As vozes como bolhas de mensagem.** Cada relato é uma bolha branca, de cantos redondos, num cartão recuado, com o coração e os três pontos embaixo; cada foto da parede também ganhou coração e três pontos. O padrão da conversa vem de uma premissa do Gui ("padrões que as pessoas já conhecem") e funciona para escrever. Para ler, contra o objetivo visual ("parecer revista, nunca scrapbook"; "o álbum de família editado"), a parte do meio da memória passa a parecer outro produto, um aplicativo de mensagens, entre uma abertura de revista e uma parede de fotos. A parede, com uma fileira de símbolos sob cada polaroid, perde a calma da "caixa aberta na mesa". Gravidade: **média** (visual). **Pede solução nova.** O problema: a leitura da memória mistura dois vocabulários. A direção: a voz de cada pessoa com a tipografia do álbum (o nome à mão, o texto como bilhete), guardando o que a conversa trouxe de bom (cada um uma voz, a ordem das mensagens, o áudio no meio do texto, "Citar"). A exploração precisa resolver: se a janela de escrever continua com cara de mensagem (lá o padrão ajuda), onde ficam as reações sem enfileirar símbolos, e como fica a voz de quem tem só áudio.

### O que funciona e deve ficar

- **"Me mostre uma memória".** No celular, é a tela mais fácil do site: um toque, uma memória inteira, outra a cada toque. Deve ser mais achada, sem mudar nada nela.
- **O modo TV com a barra**, em 1280 e 1920 px. Símbolos de TV com nome, nada rola, e o "Passar sozinho" com as animações faz do computador ligado à TV um álbum que se folheia sozinho.
- **A abertura da memória**, com o leque de fotos no computador: é a "foto e o verso" da direção visual, feita inteira.
- **A faixa de décadas e o ano parado no alto** da linha do tempo: para quem rola muito, saber em que ano está é o que segura a orientação.

---

## Fluxo 3: contar a própria parte

### Os objetivos

- **De uso:** escrever ou gravar o relato numa memória em que a pessoa estava; responder a um pedido para liberar um relato.
- **Visual:** nos formulários, "uma pergunta por tela, grande, em serifa, como quem conversa"; na memória, os relatos como conversa, cada pessoa uma voz.

### Elemento por elemento

**O caminho até escrever.**
1. Objetivo: chegar à janela com vontade de contar.
2. Elementos: o cartão do Início ("Você estava lá e ainda não contou", com a foto e "Escrever meu relato"), o atalho no alto da memória e o convite no fim dela.
3. Cumpre o caminho; o nome do botão puxa para escrever.
4. A carta promete "por escrito ou com a própria voz", e a janela trata as duas igual, com o microfone grande quando a caixa está vazia. O botão que leva até ela diz "Escrever". Para os mais velhos, falar é mais fácil. Gravidade: **baixa a média**. **Pequeno e claro** (C1, 1.3): um texto que sirva para falar e para escrever; o texto é do Gui.

**A página de escrever.**
1. Objetivo: lembrar e contar.
2. Elementos: "Meu relato", o título da memória como link e a data, "Seu relato" com a caixa vazia ("Conte como foi. Mande um texto, um áudio ou uma foto…"), a caixa "Mensagem" com o "+" e o microfone, "Só você vê até publicar. Enter envia…", "Publicar relato" (cheio), "Voltar para a memória", "Estou escrevendo por outra pessoa" e, embaixo, "Na memória", com os relatos dos outros e "Citar".
3. Cumpre o gesto; afasta a lembrança.
4. A foto da memória, que é o que traz o dia de volta, ficou na página de antes. A caixa vazia repete a frase de abertura com outras palavras. "Publicar relato" fica cheio e ativo antes de existir qualquer mensagem (tocar nele com a caixa vazia responde "Nenhuma mensagem ainda."). Gravidade: **média**. **Pequeno e claro** (C1, 3.2): a foto-chave pequena, a data, o lugar e quem estava no alto, num bloco na cor do tipo. Esboço: `relato-com-a-memoria.html`, quadro A.

**Enviar e publicar.**
1. Objetivo: o relato chegar à memória.
2. Elementos: Enter envia a mensagem, que aparece na janela, com "Rascunho salvo. Só você vê."; "Publicar relato" entrega tudo.
3. Em parte. Quem sai depois de enviar deixa o relato parado.
4. Escada de porquês. Por que enviar não entrega? Porque o relato nasce rascunho ("Primeiro publicar"). Por que rascunho? Para a pessoa arrumar antes de os outros verem e receberem aviso. Por que a janela tem cara de conversa? Para escrever e falar com o mesmo peso, num padrão conhecido. As duas premissas são boas e se contradizem: no padrão emprestado, enviar é entregar. Conferido: ao sair sem publicar, a memória mostra "Seu relato está em rascunho." para a pessoa; no Início, a linha diz só "Você tem um rascunho." (ou "2 rascunhos"), sem dizer de quê. Gravidade: **média**.
- **Pequeno e claro** (C1, 3.1 e "À parte" 4): a linha do Início diz de qual memória e que ainda ninguém viu. Esboço: `relato-com-a-memoria.html`, quadro B.
- **Pede solução nova** (C1, 3.3; a ideia do Gui em "Em aberto"): escrever na própria página da memória, onde o rascunho aparece no lugar em que vai ficar. A exploração precisa resolver o que acontece com `/memorias/<id>/relato`, com "Estou escrevendo por outra pessoa" e com "Citar".

**Depois de publicar.**
1. Objetivo: ver a própria voz entrar na memória (a recompensa do gesto).
2. Elementos: a página fica onde está, com "Salvo na memória." perto da janela e o bloco "Relato publicado" lá embaixo, depois dos relatos dos outros, com "Voltar para a memória".
3. Não cumpre: dois recados em lugares diferentes, e a voz publicada só aparece com mais um toque.
4. Gravidade: **média**. **Pequeno e claro** (C1, "À parte" 5): "Publicar relato" leva à memória, na voz que acabou de entrar.

**O pedido para liberar.**
1. Objetivo: decidir, com o que precisa saber, se o relato acompanha a memória aberta a mais gente.
2. Elementos: no Início, entre os avisos, "Gui abriu “Casamento da Prima Carol” para toda a família. Por enquanto, o seu relato continua só para quem via antes.", com "Liberar para quem passou a ver" e "Manter como estava", em texto, lado a lado. Na memória, acima do texto dela, "Visível só para quem via antes." e "Liberar para toda a família".
3. Não cumpre. A decisão vem sem o relato, sem quem passa a ler e sem dizer que não tem volta.
4. A pessoa decide sobre um texto que pode ter escrito meses antes, sem vê-lo; "quem passou a ver" não tem nomes; a mesma ação tem dois nomes; e liberar não tem volta pela tela, sem que a tela diga. É raro, e por isso precisa se explicar sozinho. Gravidade: **média** (rara, irreversível).
- **Pequeno e claro** (C1, 3.4 e "À parte" 3): o começo do relato, os nomes de quem passa a ler, um nome só para a ação, a frase "Liberar não tem volta." e as duas respostas como botões do mesmo peso. A regra de quem vê fica como está. Esboço: `pedido-com-o-relato.html`.

### O que funciona e deve ficar

- **O microfone que é o botão principal quando a caixa está vazia.** Falar fica tão fácil quanto escrever, sem um modo separado, e é o que a carta promete.
- **"Você estava lá e ainda não contou"**, com a foto: é o convite certo, para o momento certo (as semanas seguintes).
- **A frase do pedido**, "Por enquanto, o seu relato continua só para quem via antes.": diz o estado atual sem assustar. O que falta é o que vem depois dela.

---

## Comparação com a C1

**Onde as duas concordam.** O Início pede trabalho antes de mostrar a pessoa a ela mesma; falta busca por palavra; as saídas do Explorar ficam fora da tela no celular; o modo TV quebra no celular deitado; enviar parece entregar e o rascunho se esconde; a página de escrever não mostra a memória; depois de publicar a pessoa não vê o relato no lugar; o pedido para liberar decide às cegas e tem dois nomes; e, no dia 25, "Neste dia" não traz os Natais. Nenhuma das duas achou defeito de código pela regra escrita.

**Onde a C2 vai além ou discorda.**

- **O dia 25.** A C1 trata a sala como roteiro de entrega (o notebook no cabo, a pergunta 1.4). A C2 sobe a escada: o site inteiro supõe que cada um abre o presente sozinho, e o dia 25 é coletivo. Por isso junta a TV, a carta lida junto e o celular deitado numa direção só, para explorar.
- **O Explorar.** A C1 deixa a pílula das famílias como observação. A C2 questiona a premissa da assinatura de capa, herdada de quando o Explorar era a página inicial, e mede: nenhuma foto na primeira tela do celular.
- **A memória.** A C1 a chama de muito boa. A C2 concorda com a abertura e critica o meio: "Quem estava" pesa mais que as vozes, e as bolhas de mensagem fazem a leitura parecer outro produto.
- **A busca.** A C1 pede busca no título, no lugar e em quem estava. A C2 mostra por que os filtros não bastam (o "Natal" que é capítulo e tema, e não tipo) e acrescenta um ponto pequeno que a C1 não tem: o parentesco na lista de "Quem estava junto".
- **O pedido.** A C2 acrescenta o aviso de que liberar não tem volta e o peso igual das duas respostas.
- **A classificação.** Seguindo o adendo, a C2 separa o que é pequeno (com esboço) do que pede exploração (sem desenho). A C1 recomendava soluções para os dois.
- A C2 não olhou o login do Cloudflare Access; a pergunta 1.1 da C1 continua de pé, sem mudança.

---

## Perguntas para o Gui

As opções estão em letras, com a recomendada primeiro. Onde a C1 fez a mesma pergunta, a referência está ao lado.

### Fluxo 1: a primeira visita

**1.1. Vale explorar um "ver junto" do Natal, com a TV, a carta lida junto e o celular deitado?** (pede solução nova; junta a C1 1.4 e 2.3)
- a) Sim, antes de 10/12: uma sessão de exploração faz duas propostas numa prévia, com esta crítica no brief (recomendada; depois do Natal perde o sentido por um ano).
- b) Não no site: o dia se resolve com um roteiro de entrega e um notebook logado no modo TV dos Natais (o caminho da C1).
- c) Como está.

**1.2. O que o Início mostra primeiro, nos primeiros dias?** (pequeno e claro; C1 1.2)
- a) "Você no acervo" antes de "Você estava lá e ainda não contou", até a pessoa contar algo (recomendada).
- b) "Abrir o acervo", na carta, leva às memórias em que a pessoa aparece.
- c) Como está.

**1.3. No Natal, "Neste dia, em outros anos" mostra os Natais?** (pequeno e claro; C1, "À parte" 7)
- a) Sim: de 24 a 26 de dezembro, as memórias de 24 e 25 de dezembro de todos os anos (recomendada).
- b) Sim, pelo tema "Natal".
- c) Como está.

**1.4. As fotos da carta ganham o título da memória na legenda?** (pequeno e claro)
- a) Sim, o título à mão na margem, como no mural (recomendada).
- b) Como está, com lugar e ano.

### Fluxo 2: encontrar e ver

**2.1. Vale explorar a busca por palavra?** (pede solução nova; C1 2.1)
- a) Sim, antes de 10/12, junto com o modo como os filtros falam com quem procura (recomendada).
- b) Sim, depois do Natal, vendo o que a família procura.
- c) Não: filtros e lista bastam.

**2.2. As saídas à vista no celular e o parentesco em "Quem estava junto"?** (pequeno e claro; C1 2.2; esboço `explorar-saidas.html`)
- a) As duas: as saídas numa linha própria (e "Me mostre uma memória" no fim do Início) e a lista com o parentesco e os mais próximos no alto (recomendada).
- b) Só as saídas.
- c) Como está.

**2.3. Vale explorar uma primeira tela do Explorar com memórias, e a assinatura de capa só onde ela já é forte?** (pede solução nova)
- a) Sim, com o celular primeiro (recomendada).
- b) Só no celular; no computador fica a capa.
- c) Não: a assinatura continua sendo a ideia forte da tela.

**2.4. E o meio da página da memória?**
- a) As duas coisas: "Quem estava" com retratos menores na tela grande (pequeno e claro) e uma exploração da voz dos relatos com a tipografia do álbum, depois do Natal (pede solução nova) (recomendada).
- b) Só os retratos menores.
- c) Como está.

### Fluxo 3: contar a própria parte

**3.1. A página de escrever mostra a memória, e publicar leva à memória?** (pequeno e claro; C1 3.2; esboço `relato-com-a-memoria.html`, quadro A)
- a) Sim: a foto-chave, a data, o lugar e quem estava no alto, e "Publicar relato" leva à voz que acabou de entrar (recomendada).
- b) Só publicar levando à memória.
- c) Como está.

**3.2. O rascunho que a pessoa não sabe que deixou?** (C1 3.1 e 3.3)
- a) Agora, a linha do Início diz de qual memória e que ninguém viu ainda (pequeno, esboço quadro B); e, depois do Natal, explorar escrever na própria página da memória (pede solução nova) (recomendada).
- b) Explorar já, antes de 10/12, publicar no primeiro envio ou escrever na memória.
- c) Como está.

**3.3. O pedido para liberar?** (pequeno e claro; C1 3.4; esboço `pedido-com-o-relato.html`)
- a) Mostra o começo do relato e quem passa a ler, usa um nome só para a ação, diz que não tem volta e põe as duas respostas com o mesmo peso (recomendada).
- b) Só o nome igual nos dois lugares e o aviso de que não tem volta.
- c) Como está.

**3.4. O botão de contar sugere a voz?** (pequeno e claro; C1 1.3)
- a) Sim, com um texto que sirva para falar e para escrever, escolhido pelo Gui (por exemplo, "Contar como foi") (recomendada).
- b) Fica "Escrever meu relato".

---

## Defeitos

Nenhum defeito de código pela regra escrita, na `homologa` de agora. Os tropeços acima são escolhas: o site faz o que a regra diz, e é a regra ou o texto que afasta o objetivo.

Anotações de passagem, para o QA, sem fazer delas o assunto:

- No modo TV, "Com Elizete, Giovanna, Gui e Lucas Magno" em mono na tinta suave sobre o lilás: medir o contraste com a cor de cada tipo e conferir a três metros.
- No Início, as fotos da carta e de "Você no acervo" no celular só têm nome para o leitor de tela (o `aria-label` traz o título); para quem vê, a legenda é lugar e ano.
- Defeito da versão antiga, já resolvido: a polaroid vazia em largura inteira no alto de "Escrever meu relato", no celular (o `soOnde` não baixava a foto e a moldura aparecia). A página nova não tem mais a foto.

---

## Onde ver

Na prévia, cada endereço passa por `/como/<pessoa>` e cai na tela com aquela pessoa. A prévia divide o banco com as outras prévias de teste: o pedido de exemplo da Giovanna pode já ter sido respondido, e a carta só aparece na primeira ida (para ver de novo, "Voltar Elizete à primeira visita", no fim do Início).

| O quê | Onde ver |
| --- | --- |
| A carta da Elizete (depois da primeira ida) | https://critica-2-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fcarta |
| O Início da Elizete no dia 25 | https://critica-2-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2F%3Fhoje%3D2026-12-25 |
| O Início do Lucas Magno ("Você estava lá e ainda não contou") | https://critica-2-2026-11-22.memorias.bayara.com.br/como/lucas-magno?volta=%2F |
| O Explorar na linha do tempo (abrir em 390 px para ver o "M" cortado) | https://critica-2-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fexplorar |
| O mural, na tela grande | https://critica-2-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fexplorar%3Fver%3Dmural |
| As memórias com a Vó Vivica (o caminho pelos filtros) | https://critica-2-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fexplorar%3Fpessoa%3Dvo-vivica |
| A memória procurada: "Primeiro Natal na casa da Vó Vivica" | https://critica-2-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fmemorias%2F1994-natal-na-vo-vivica |
| Me mostre uma memória | https://critica-2-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fexplorar%3Fver%3Dacaso |
| O modo TV (no computador e no celular deitado) | https://critica-2-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fexplorar%3Fver%3Dtv |
| A memória "Natal de 2025" (Quem estava e as vozes) | https://critica-2-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fmemorias%2F2025-natal |
| Escrever o relato, como o Lucas Magno | https://critica-2-2026-11-22.memorias.bayara.com.br/como/lucas-magno?volta=%2Fmemorias%2F2026-jantar-de-casamento%2Frelato |
| O pedido para liberar, no Início da Giovanna | https://critica-2-2026-11-22.memorias.bayara.com.br/como/giovanna?volta=%2F |
| O relato que espera, na memória | https://critica-2-2026-11-22.memorias.bayara.com.br/como/giovanna?volta=%2Fmemorias%2F2012-casamento-carol-davi |
| Esboço: saídas à vista e parentesco no filtro (2.2) | https://critica-2-2026-11-22.memorias.bayara.com.br/esbocos-critica/explorar-saidas.html |
| Esboço: escrever vendo a memória e o rascunho que se diz (3.1 e 3.2) | https://critica-2-2026-11-22.memorias.bayara.com.br/esbocos-critica/relato-com-a-memoria.html |
| Esboço: o pedido para liberar com o relato (3.3) | https://critica-2-2026-11-22.memorias.bayara.com.br/esbocos-critica/pedido-com-o-relato.html |
