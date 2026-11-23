# Crítica C1: os fluxos de quem recebe o acervo no Natal

22/11/2026, branch `critica-2026-11-22`, nascida da `homologa` em `f25696a`. Esta crítica pergunta se cada solução é a certa, e não se foi bem feita. Ela não muda código e não reabre decisão: onde discorda de uma regra de `docs/decisoes.md` ou `docs/visual.md`, diz qual e propõe, e a escolha volta para o Gui.

**Como foi olhado.** Site local com o acervo de exemplo (`npm run dev` e `npm run fotos-de-exemplo`), pelo "Ver como" do topo, em 390 × 844 e 1920 × 1080, e o modo TV também em 844 × 390 (o celular deitado, como fica ao espelhar na TV). Pessoas usadas:

- **Elizete**, a pessoa mais velha do "Ver como", na primeira visita (carta e Início), no Explorar, na memória e no modo TV.
- **Lucas Magno**, quem tem menos memórias (10), escrevendo um relato em "Jantar de casamento" e saindo sem publicar.
- **Giovanna**, com o pedido para liberar o relato dela em "Casamento da Prima Carol".

O "Ver como" só tem Gui, Giovanna, Elizete e Lucas Magno. Não há, no acervo de exemplo, alguém que entra pela primeira vez sem avisos nem rascunhos: a Elizete chega à primeira visita com dois avisos e dois rascunhos de exemplo, o que não vai acontecer no dia 25 (ver "À parte").

**O que não deu para ver:** a tela de login do Cloudflare Access e o e-mail com o código, a homologação com a família de verdade, uma TV de verdade e um iPhone de verdade.

## O que mais pesa

1. **Primeira visita.** O site em si recebe bem: a carta diz o que é o acervo e convida a contar. O degrau mais alto fica antes dele, no login por código de e-mail do Cloudflare Access, que nenhum documento do projeto descreve e que ninguém da família vai ter visto antes. Depois da carta, o Início pede trabalho ("Escrever meu relato") antes de mostrar a pessoa a ela mesma.
2. **Encontrar e ver.** Para passear, o Explorar e a memória funcionam. Para achar uma memória específica falta uma busca por palavra, e no celular as duas saídas mais fáceis para quem tem pouca familiaridade ("Me mostre uma memória" e "Modo TV") ficam fora da tela. O modo TV é ótimo num computador ligado à TV e quebra no celular deitado, que é como muita gente vai mostrar na sala.
3. **Contar a própria parte.** A janela de conversa usa o gesto do WhatsApp ("enviar"), mas enviar guarda um rascunho que só a pessoa vê, e quem não tocar em "Publicar relato" deixa o relato parado sem saber. A página de escrever não mostra a foto da memória, que é o que traz a lembrança. O pedido para liberar um relato pede a decisão sem mostrar o relato nem quem passa a ver.

---

## Fluxo 1: a primeira visita, do login ao Início

### A tarefa e o momento

Dia 25, no meio da festa. A pessoa recebe o presente (um link, um cartão, alguém dizendo "entra aí"), abre no celular, muitas vezes com gente em volta, às vezes de pé. Ela quer entender o que ganhou, se ver ali e sentir que é dela. Contar a própria parte vem depois, em casa, nas semanas seguintes. Ninguém vai explicar passo a passo, e quem tem menos familiaridade desiste no primeiro passo que não entende.

### Como funciona hoje

1. **Receber o acesso.** Ainda não está definido como cada pessoa recebe o link e o convite (está na lista do QA de UX, em "Decidido, a construir": "como cada pessoa ganha o acesso").
2. **Login.** A página do Cloudflare Access pede o e-mail, manda um código por e-mail, a pessoa troca de aplicativo, copia o código, volta e cola. O login dura um mês ("Duração do login", em `docs/publicar.md`), e depois a mesma sequência volta.
3. **A carta** (`/`, primeira ida): só a carta na tela, na cor manteiga, com "Oi, Elizete,", o texto, as três assinaturas à mão, "Abrir o acervo" e três fotos de memórias em que ela aparece. Funciona. Diz o que é o site ("as fotos que estavam espalhadas pelos celulares e pelas gavetas") e o que se espera dela ("a sua versão delas ainda está faltando").
4. **O Início**, depois de "Abrir o acervo": "Oi, Elizete.", "Que bom que você chegou.", os avisos, a linha dos rascunhos, "Carta de Natal" e, em cartões: "Você estava lá e ainda não contou" com o botão cheio "Escrever meu relato", "Neste mês, em outros anos", "Próximos aniversários", "Você no acervo" e "Explorar todas as memórias" com as décadas.

### Onde atrapalha

- **O login é o degrau mais alto, e está fora do desenho.** É a única tela que todo mundo vê e que o projeto não desenhou. O texto padrão da página e do e-mail com o código vem do Cloudflare, e nada em `docs/` diz como eles estão hoje (idioma, nome do site, logo, frase explicando o código). Para quem tem pouca familiaridade, "procure um código no seu e-mail e volte" já é uma tarefa difícil, e ela vai se repetir a cada mês.
- **O Início pede trabalho antes de mostrar a pessoa a ela mesma.** No celular, o primeiro cartão depois da abertura é "Você estava lá e ainda não contou", com o único botão cheio da tela: "Escrever meu relato". "Você no acervo" ("Você aparece em 34 memórias, de 1968 a 2026", com as fotos) é o que mais emociona no primeiro dia e é o quarto cartão, a uns 2.000 px do alto em 390 px. Na festa, a vontade é ver; escrever fica para depois.
- **"Escrever" quando o mais fácil é falar.** A carta diz "por escrito ou com a própria voz", mas o botão diz "Escrever meu relato". Para os mais velhos, falar é bem mais fácil que digitar, e o botão não sugere isso.
- **No computador, a coluna da direita** mostra "Neste mês, em outros anos" com uma foto grande, e o lado esquerdo fica com avisos e rascunhos. O que é novo e o que é da pessoa disputam com uma memória qualquer do mês.

### O que sobra

- Na primeira ida, a linha dos rascunhos, o link "Carta de Natal" e os avisos não têm o que mostrar para quem acabou de chegar no dia 25 (os avisos só nascem depois do primeiro acesso, ver "Avisos" em `docs/decisoes.md`). Isso já se resolve sozinho: com nada a mostrar, as linhas não aparecem. Só a prévia engana, com os avisos e rascunhos de exemplo.
- "Próximos aniversários" no dia 25 é útil, mas é o cartão mais fraco para quem acabou de chegar.

### Alternativas

| Alternativa | O que muda | Custo agora (até 10/12) | Custo depois do Natal |
| --- | --- | --- | --- |
| **A. Login assistido no dia** | O Gui, a Giovanna e o Magno fazem o primeiro login no celular de cada pessoa durante a festa e deixam o ícone na tela inicial. Mais o texto da página do Access em português, com o nome do acervo, se o Cloudflare deixar sem custo | Nenhum código. Um roteiro de meia página para os três e meia hora no painel do Cloudflare | Nenhum. Mas quem não estava na festa entra sozinho, e o login volta em um mês |
| **B. Login com o Google no Access** | Quem tem conta Google entra com um toque, sem código | Configuração no Access, com conferência de quem usa Gmail. Decisão de segurança do Gui | Mudar com a família usando confunde: o jeito de entrar muda |
| **C. "Você no acervo" primeiro, no primeiro dia** | Na primeira ida e na seguinte, o Início abre com a pessoa nas memórias, e o convite para contar desce | Pequeno: a ordem é de `composicaoDoInicio()` | Pequeno, mas quem já se acostumou com a ordem estranha a troca |
| **D. "Abrir o acervo" leva às memórias da pessoa** | O botão da carta leva ao Explorar filtrado por ela (`?pessoa=elizete`), em vez do Início | Pequeno: um link | Nenhum: a carta só abre uma vez |
| **E. Não ter o Início depois da carta** | Tirar o painel da primeira visita | Médio, e perde os aniversários e o convite | Não se aplica |

### Recomendação

- **Defeito:** nenhum de código neste fluxo.
- **Escolhas (perguntas 1.1 a 1.4, abaixo):** A antes de tudo, porque o login decide se a pessoa chega; C ou D para o primeiro contato ser "você está aqui" antes de "conte"; e o texto do botão de contar.

---

## Fluxo 2: encontrar e ver memórias

### A tarefa e o momento

Três tarefas diferentes, em momentos diferentes:

- **Passear,** sozinho, no sofá ou na fila, sem destino: ver fotos e ler o que os outros contaram.
- **Achar uma memória certa:** "a foto do casamento da Carol", "o Natal em que faltou luz". Quem procura sabe uma palavra, quase nunca o tipo de momento ou o capítulo.
- **Mostrar junto,** na sala, para várias pessoas, na TV ou passando o celular de mão em mão.

### Como funciona hoje

- **Explorar** (`/explorar`): a assinatura grande, as famílias em pílula, as abas "Linha do tempo", "Mural de fotos" e "Lista", as saídas "Modo TV" e "Me mostre uma memória", "Filtros" (tipo, quem estava junto, capítulo, tema, período, com foto, com áudio, você já contou, falta o seu relato) e "Ordem". A linha do tempo é o padrão.
- **A memória:** a abertura na cor do tipo, a ficha, "Quem estava" com o parentesco, a conversa dos relatos, a parede de fotos, o convite para contar e "Antes" e "Depois". Muito boa: lê-se de cima para baixo sem precisar entender nada, e "Antes" e "Depois" deixam passear sem voltar à lista.
- **Modo TV:** uma memória por vez, na tela inteira; a barra com símbolos no computador; no celular, a composição empilhada que rola.

### Onde atrapalha

- **Não há busca por palavra.** Para achar "o casamento da Carol" a pessoa precisa saber que é um tipo de momento ("Casamento"), ou rolar, ou filtrar por quem estava. A única busca do site é de pessoa (Pessoas, árvore, círculo). Para quem tem pouca familiaridade, a caixa de busca é o padrão mais conhecido de todos ("Padrões que as pessoas já conhecem", em `docs/visual.md`).
- **A linha do tempo é pesada para procurar no celular.** Em 390 px cabe pouco mais de uma memória por tela: as 48 memórias de exemplo dão 34.000 px de página, contra 9.800 px na lista. Depois da carga do Natal, com centenas de memórias, a linha do tempo vira uma rolagem muito longa, e ela carrega tudo de uma vez (o próprio `docs/decisoes.md` pede para medir de novo). Para passear, ela é a identidade do site e está certa; para procurar, a lista resolve em um quarto da rolagem.
- **No celular, "Modo TV" e "Me mostre uma memória" ficam fora da tela.** A fila das abas rola para o lado, e em 390 px aparece só um "M" cortado depois de "Lista". "Me mostre uma memória" é a porta mais fácil para quem não sabe o que procurar (um toque, uma surpresa), e quase ninguém vai achá-la. O Início também não oferece essa porta: só "Explorar todas as memórias".
- **O modo TV no celular deitado não cabe.** Em 844 × 390 aparecem o título e metade da foto; "Próxima" e "Passar sozinho" ficam abaixo, e a página rola. É exatamente o que acontece quando alguém espelha o celular na TV da sala ou vira o celular para mostrar. A regra atual diz que abaixo de 62rem o modo TV é o de antes, com a rolagem do aparelho: está conforme a regra, mas a regra não previu esse uso.
- **Como a TV chega à sala.** O modo TV no computador ligado à TV por cabo é o caminho que funciona. O navegador da própria TV pede o login do Access com o controle remoto (e-mail e código digitados letra a letra). O espelhamento do celular cai no ponto acima. Nenhum documento diz qual é o caminho planejado para o dia 25.
- **Na TV, a voz não toca.** O que mais emociona na sala é ouvir a Vó Bela. O modo TV mostra o trecho do relato e não toca os áudios. Está em "Em aberto" ("Relato como conversa, para depois": o modo TV com as mensagens chegando e os áudios tocando).

### O que sobra

- Para quem chega pela primeira vez, o alto do Explorar tem muitas camadas de controle: famílias, três abas, duas saídas, filtros, ordem e, no mural, tamanho e "Mostrar". Nenhuma está errada, e cada uma tem lugar e cara próprios. O que sobra é a família em pílula logo no alto, que só filtra: quem não pensa em "famílias" vê quatro botões coloridos no lugar mais nobre da tela. Fica como observação, sem proposta de tirar.

### Alternativas

| Alternativa | O que muda | Custo agora | Custo depois do Natal |
| --- | --- | --- | --- |
| **A. Busca por palavra no Explorar** | Uma caixa "Procurar" acima das abas, que acha no título, no lugar e nos nomes de quem estava, respeitando quem vê o quê, e troca no lugar como os filtros | Médio: uma consulta nova, um filtro novo no endereço (`q=`) e testes de visibilidade | Médio, e a família passa as primeiras semanas sem ela |
| **B. Lista como padrão no celular** | No celular, o Explorar abre na lista; no computador, na linha do tempo | Pequeno, mas mexe na regra "Nada salta na página" se a forma mudar com a largura. Precisa de cuidado | Pequeno |
| **C. "Me mostre uma memória" à vista** | No celular, a saída vai para fora da fila das abas (ou para o Início, como um botão: "Me mostre uma memória") | Pequeno | Pequeno |
| **D. Modo TV para tela deitada e baixa** | Quando a janela é mais larga que alta, usar a composição da barra (foto à esquerda, texto à direita, sem rolar) também abaixo de 62rem | Médio: o modo TV acabou de ser refeito (sessões X e X2) e tem `npm run tv` para conferir | Médio |
| **E. Roteiro da sala** | Decidir o caminho do dia 25: um notebook no cabo HDMI, já logado, aberto no modo TV do capítulo "Natais" | Nenhum código | Não se aplica |
| **F. Áudio no modo TV** | O áudio do relato do trecho toca na vez da memória, com um botão de som na barra | Grande para antes de 10/12 | Médio |

### Recomendação

- **Defeito:** nenhum pela regra escrita. O modo TV no celular deitado está conforme a regra e vai em "À parte" como tropeço.
- **Escolhas (perguntas 2.1 a 2.4):** E e C, que custam quase nada; A, que é o que mais falta no uso das semanas seguintes; D, para o espelhamento.

---

## Fluxo 3: contar a própria parte

### A tarefa e o momento

Dias ou semanas depois do Natal, em casa, num momento calmo. A pessoa vê uma memória em que estava (pelo cartão do Início, por um aviso, passeando) e tem vontade de dizer "não foi bem assim" ou "eu lembro de outra coisa". Os mais velhos preferem falar. Quem escreve pensa em mensagem de WhatsApp: escreve, envia, pronto.

O segundo caso é raro e chega sem pedir: alguém abriu uma memória para mais gente, e o site pergunta se o relato da pessoa pode ir junto.

### Como funciona hoje

- **Escrever.** "Escrever meu relato" leva a `/memorias/<id>/relato`: "Meu relato", o título da memória com a data, a área da conversa, a caixa "Mensagem" com o "+" e o microfone, "Só você vê até publicar. Enter envia; Shift e Enter muda de linha.", o botão cheio "Publicar relato", "Voltar para a memória", "Estou escrevendo por outra pessoa" e, embaixo no celular (ao lado no computador), os relatos dos outros com "Citar".
- Enviar uma mensagem mostra "Rascunho salvo. Só você vê." e a mensagem na área da conversa. "Publicar relato" publica, inclusive o texto que ficou na caixa sem enviar (conferido: nada se perde). Depois de publicar, a página fica onde está, com "Salvo na memória.".
- Quem sai sem publicar encontra, na memória, "Seu relato está em rascunho." e "Continuar meu relato", e no Início, "Você tem um rascunho." e "Continuar o rascunho".
- **Liberar.** No Início, nos avisos: "Gui abriu “Casamento da Prima Carol” para toda a família. Por enquanto, o seu relato continua só para quem via antes.", com "Liberar para quem passou a ver" e "Manter como estava". A frase leva à memória. Na memória, o relato tem a linha "Visível só para quem via antes." e "Liberar para toda a família".

### Onde atrapalha

- **"Enviar" que não envia.** A janela é de conversa, e na conversa que todo mundo conhece, enviar é entregar. Aqui, enviar guarda um rascunho que ninguém vê, e entregar é um segundo botão. O lembrete existe ("Só você vê até publicar", "Rascunho salvo. Só você vê."), mas em letra pequena, logo depois de um gesto que a pessoa já entendeu de outro jeito. O risco é o relato que a pessoa acha que contou e que fica parado: ninguém recebe aviso, ninguém vê, e a linha do Início ("Você tem um rascunho.") não diz de quê nem que ainda não apareceu para ninguém. Isso vem da decisão "Primeiro publicar" (em "Relato como conversa").
- **A página de escrever não mostra a memória.** Nem a foto, nem quem estava. Quem escreve sai da página que mostrava a foto, justo o que puxa a lembrança, para uma página com o título e um espaço vazio. A ideia em "Em aberto" de escrever na própria página da memória resolveria isso sem peça nova.
- **O botão diz "Escrever".** Ver o fluxo 1: na janela, o microfone é o botão grande e colorido quando a caixa está vazia, o que é bom; mas o caminho até ela se chama "Escrever meu relato".
- **Depois de publicar, a pessoa não vê o relato no lugar dele.** Fica na página de escrever, com "Salvo na memória.". Ver a própria voz entrando na conversa da memória é a recompensa do gesto, e ela precisa tocar em "Voltar para a memória" para ter.
- **O pedido para liberar pede uma decisão às cegas.** O aviso não mostra o relato (que a pessoa escreveu talvez meses antes) nem diz quem passa a ver em nomes ("toda a família" é claro; "a família Bracarense" é menos, para quem não pensa em famílias). Os dois botões ficam no Início, longe do relato. E a mesma ação tem dois nomes: "Liberar para quem passou a ver" no aviso e "Liberar para toda a família" na memória.
- **O pedido é raro, e o peso dele é alto.** Com sete pessoas com login, quantas vezes alguém vai abrir uma memória que tem relatos de outros? Provavelmente poucas por ano. A regra por trás é das mais trabalhadas do site (revisões Y, Y2 e Y3) e está certa como privacidade. A crítica aqui é só da tela: por ser rara, ela precisa se explicar sozinha, porque ninguém vai lembrar o que é.

### O que sobra

- "Estou escrevendo por outra pessoa", logo abaixo de "Voltar para a memória", na mesma página de quem escreve o próprio relato. É útil para quem registra a Vó Bela, e quase ninguém mais vai usar. Pode ficar, mais quieto, no menu da memória ou no fim.
- No computador, a página de escrever tem uma coluna de texto à esquerda que repete o que o título já diz, e a conversa no meio fica estreita.

### Alternativas

| Alternativa | O que muda | Custo agora | Custo depois do Natal |
| --- | --- | --- | --- |
| **A. Escrever na página da memória** (a ideia de "Em aberto") | A janela fica no pé da conversa, na memória; o rascunho aparece ali, marcado "só você vê", com "Publicar relato" ao lado; depois de publicado, a voz já está no lugar. A foto e quem estava ficam à vista | Grande: brief antes, e decidir o que acontece com `/relato` e com "Citar" | Grande, e muda o caminho que a família já aprendeu |
| **B. Mostrar a memória na página de escrever** | A foto-chave e "Quem estava" no alto de `/relato`; depois de publicar, levar à memória, no relato | Pequeno | Pequeno |
| **C. Publicar no primeiro envio** | O primeiro envio já entra na memória, como hoje acontece depois de publicado; "Editar" e "Apagar" de cada mensagem continuam | Pequeno no código, grande na regra: o rascunho do relato deixa de existir no caminho comum (continua para quem registra por outra pessoa) | Médio: os rascunhos parados na hora da troca pedem uma decisão |
| **D. Rascunho que se diz** | Manter "Primeiro publicar", mas a linha do Início diz o quê ("Seu relato em “Jantar de casamento” ainda não foi publicado. Só você vê."), e sair da página com mensagem enviada e sem publicar pergunta "Publicar agora?" | Pequeno | Pequeno |
| **E. Pedido para liberar que mostra o relato** | O aviso mostra o começo do relato e diz em nomes quem passa a ver ("Ana Candida, Lúcio e mais 4"), e a mesma ação tem o mesmo nome nos dois lugares | Pequeno | Pequeno |
| **F. Pedido decidido na memória** | O aviso só leva à memória, no relato, e a decisão fica na linha que já existe ali ("Visível só para quem via antes"), com os dois botões | Pequeno | Pequeno |
| **G. Sem pedido** | O relato acompanha sempre a memória, e quem amplia é avisado de que os relatos vão junto | Pequeno no código, grande na regra de privacidade | Grande: muda o combinado depois de a família ter escrito |

### Recomendação

- **Defeito:** nenhum pela regra escrita.
- **Escolhas (perguntas 3.1 a 3.4):** B e D agora, que são pequenos e tiram os dois maiores riscos; A como a direção para depois do Natal, se o Gui confirmar a ideia de "Em aberto"; E (ou F) para o pedido. C e G mexem em regra combinada e ficam como alternativas registradas, sem recomendação.

---

## Perguntas para o Gui

As opções estão em letras, com a recomendada primeiro.

### Fluxo 1: a primeira visita

**1.1. Como a família entra no dia 25?**
- a) O Gui, a Giovanna e o Magno fazem o primeiro login no celular de cada um durante a festa, com o ícone na tela inicial, e a página do Access ganha texto em português com o nome do acervo (recomendada).
- b) Cada pessoa entra sozinha pelo link, com um cartão impresso explicando o código.
- c) Trocar o código por e-mail pelo login com o Google no Access.

**1.2. O que o Início mostra primeiro, na primeira ida depois da carta?**
- a) "Você no acervo" no alto, com as fotos das memórias da pessoa, e "Você estava lá e ainda não contou" logo depois (recomendada).
- b) "Abrir o acervo", na carta, leva direto às memórias em que a pessoa aparece, e o Início fica como está.
- c) Como está: o convite para contar primeiro.

**1.3. O botão de contar diz "Escrever meu relato" em todo o site. Ele pode sugerir a voz?**
- a) "Contar o meu lado", "Contar como foi" ou outro texto que sirva para falar e para escrever (recomendada; o texto é do Gui).
- b) Fica "Escrever meu relato".

**1.4. Quer um roteiro da entrega, à parte do site?**
- a) Sim: uma página em `docs/` com a ordem do dia 25 (a TV, a carta, os logins), escrita no chat (recomendada).
- b) Não, o dia se resolve na hora.

### Fluxo 2: encontrar e ver

**2.1. O Explorar ganha uma busca por palavra (título, lugar e quem estava)?**
- a) Sim, antes de 10/12, como um filtro a mais no endereço (recomendada).
- b) Sim, depois do Natal, olhando o que a família procura.
- c) Não: os filtros e a lista bastam.

**2.2. Onde fica "Me mostre uma memória" no celular?**
- a) À vista no celular, fora da fila que rola, e também como um botão no Início (recomendada).
- b) Só no Início.
- c) Como está, no fim da fila das abas.

**2.3. Qual é o caminho da TV no dia 25?**
- a) Um notebook no cabo HDMI, já logado, aberto no modo TV do capítulo "Natais"; o celular deitado ganha a composição da barra depois (recomendada).
- b) O mesmo notebook, e o modo TV no celular deitado ganha a composição da barra antes de 10/12.
- c) O navegador da própria TV, com o login feito antes pelo controle.

**2.4. O áudio dos relatos toca no modo TV?**
- a) Depois do Natal, com o resto do "Relato como conversa, para depois" (recomendada pelo prazo).
- b) Antes de 10/12, só o áudio do trecho que aparece na tela.

### Fluxo 3: contar a própria parte

**3.1. O que fazer com o rascunho que a pessoa não sabe que deixou?**
- a) Manter "Primeiro publicar", com a linha do Início dizendo de qual memória é e que ainda não apareceu para ninguém, e a pergunta "Publicar agora?" ao sair com mensagem enviada (recomendada).
- b) Publicar no primeiro envio, como depois de publicado, e deixar o rascunho só para quem registra por outra pessoa.
- c) Como está.

**3.2. A página de escrever mostra a memória?**
- a) Sim: a foto-chave e "Quem estava" no alto, e "Publicar relato" leva à memória, no relato publicado (recomendada).
- b) Não, fica como está até a decisão da pergunta 3.3.

**3.3. A ideia de escrever na própria página da memória (em "Em aberto") vira a direção?**
- a) Sim, com brief para depois do Natal; a pergunta 3.2 resolve o que é urgente até lá (recomendada).
- b) Sim, antes de 10/12.
- c) Não: a página de escrever continua separada.

**3.4. Como o pedido para liberar se apresenta?**
- a) O aviso mostra o começo do relato e diz em nomes quem passa a ver, e a ação tem o mesmo nome no aviso e na memória (recomendada).
- b) O aviso só leva à memória, e a decisão fica na linha do relato.
- c) Como está.

---

## À parte: defeitos e tropeços

Nenhum defeito de código pela regra escrita apareceu nos três fluxos. Os itens abaixo são tropeços: o site faz o que a regra diz, e a regra ou o texto atrapalha. Ficam aqui para não virarem o assunto.

| # | O quê | Pela regra | Onde |
| --- | --- | --- | --- |
| 1 | Modo TV em 844 × 390 (celular deitado): só cabem o título e metade da foto; "Anterior", "Próxima" e "Passar sozinho" ficam abaixo, e a página rola (826 px de altura) | Conforme: abaixo de 62rem vale o modo TV de antes, com a rolagem | `/explorar?ver=tv` |
| 2 | Explorar em 390 px: "Modo TV" e "Me mostre uma memória" ficam fora da tela, no fim da fila das abas que rola para o lado; só aparece um "M" cortado | Não está escrito se as saídas podem ficar fora da tela | `/explorar` |
| 3 | A mesma ação com dois nomes: "Liberar para quem passou a ver" (aviso) e "Liberar para toda a família" (linha do relato na memória) | Texto de interface, decisão do Gui | Início da Giovanna; `/memorias/2012-casamento-carol-davi` |
| 4 | A linha do Início "Você tem um rascunho." / "Continuar o rascunho" não diz se é memória ou relato, de qual memória, nem que ninguém vê ainda | Conforme ("a abertura avisa numa linha") | Início de quem tem rascunho |
| 5 | Depois de "Publicar relato", a pessoa fica na página de escrever, com "Salvo na memória.", e não vê o relato na memória | Não está escrito para onde vai | `/memorias/<id>/relato` |
| 6 | A prévia não representa o dia 25: na primeira visita da Elizete já há dois avisos e dois rascunhos de exemplo, e o "Ver como" não tem ninguém que chega sem nada. Para ensaiar a chegada, valeria uma pessoa de exemplo sem avisos, sem rascunhos e com poucas memórias | Os dados de exemplo são decisão do Gui | Início, depois de "Voltar Elizete à primeira visita" |
| 7 | No dia 25 (`/?hoje=2026-12-25`), "Neste dia, em outros anos" mostra só "Natal com os primos" (25/12/1998): o "Natal de 2025", de 24/12, fica de fora porque a regra só passa para a semana quando o dia não tem nenhuma. E "Você estava lá e ainda não contou" continua no "Jantar de casamento". No Natal, a família vai querer os Natais | Conforme | `/?hoje=2026-12-25` |

Nada foi corrigido: a sessão não muda código.

---

## Onde ver

Na prévia, o "Ver como" vale para quem abrir o link: cada endereço passa por `/como/<pessoa>` e cai na tela com aquela pessoa. A prévia divide o banco com as outras prévias de teste, então o pedido de exemplo da Giovanna pode já ter sido respondido por outra sessão.

| O quê | Onde ver |
| --- | --- |
| A carta, na primeira visita da Elizete (tocar em "Voltar Elizete à primeira visita", no fim, e abrir o Início de novo) | https://critica-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2F |
| A carta, depois da primeira visita | https://critica-2026-11-22.memorias.bayara.com.br/carta |
| O Início da Elizete | https://critica-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2F |
| O Início no dia 25 | https://critica-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2F%3Fhoje%3D2026-12-25 |
| O Explorar, na linha do tempo | https://critica-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fexplorar |
| O Explorar, com os filtros | https://critica-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fexplorar |
| O mural | https://critica-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fexplorar%3Fver%3Dmural |
| A lista | https://critica-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fexplorar%3Fver%3Dlista |
| Me mostre uma memória | https://critica-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fexplorar%3Fver%3Dacaso |
| A memória com um relato só ("Jantar de casamento") | https://critica-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fmemorias%2F2026-jantar-de-casamento |
| A memória com a conversa de três relatos ("A chegada da Giovanna") | https://critica-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fmemorias%2F1999-chegada-da-giovanna |
| O modo TV (abrir em tela de computador e com o celular deitado) | https://critica-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fexplorar%3Fver%3Dtv |
| O modo TV do capítulo "Natais" (pelo capítulo) | https://critica-2026-11-22.memorias.bayara.com.br/como/elizete?volta=%2Fcapitulos |
| Escrever um relato, como o Lucas Magno | https://critica-2026-11-22.memorias.bayara.com.br/como/lucas-magno?volta=%2Fmemorias%2F2026-jantar-de-casamento%2Frelato |
| O Início do Lucas Magno (para ver a linha do rascunho, envie antes uma mensagem na linha de cima e saia sem publicar) | https://critica-2026-11-22.memorias.bayara.com.br/como/lucas-magno?volta=%2F |
| O pedido para liberar, no Início da Giovanna | https://critica-2026-11-22.memorias.bayara.com.br/como/giovanna?volta=%2F |
| O relato que espera, na memória ("Casamento da Prima Carol") | https://critica-2026-11-22.memorias.bayara.com.br/como/giovanna?volta=%2Fmemorias%2F2012-casamento-carol-davi |
