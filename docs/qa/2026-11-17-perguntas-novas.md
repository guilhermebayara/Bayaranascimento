# Perguntas novas da rodada de respostas (17/11/2026)

A sessão que aplicou as 174 respostas do QA de design (PRs #44 a #47, já na `homologa`) deixou estas perguntas. Cada uma é chamada pelo PR e pelo número: `46-N1` é a N1 do PR #46.

## Respostas do Gui (17/11/2026)

Vale a opção que já está em uso em todas, menos nas listadas abaixo, que pedem mudança:

| Pergunta | Resposta |
| --- | --- |
| 44-N7 | A carta saúda com o mesmo nome do painel ("Oi, Elizete,"). |
| 45-N8 | Com rascunho do relato: "Seu relato está em rascunho." e o botão "Continuar meu relato". |
| 46-N7 | A primeira forma de ver do capítulo se chama "Linha do tempo", como na página da pessoa. |
| 46-N9 | Em "Aconteceu neste período", a marca vai em "em parte": no acervo real, o raro é a memória que atravessa a borda do capítulo. |
| 46-N11 | Excluir capítulo usa a mesma forma da memória: "você, a Giovanna ou o Lucas Magno". |
| 47-N2 | Zona de perigo do laço: "O laço some da árvore e das páginas das duas pessoas. Não vai para a lixeira." No casal, "O casal some da árvore e das páginas das duas pessoas. Não vai para a lixeira." |
| 47-N3 | "Como estão hoje?" no "Adicionar laço" completo oferece só as quatro fases de estar junto, igual ao guiado. |
| 47-N6 | Enter na busca de pessoa nunca envia o formulário, em todo o site. |
| 47-N10 | No celular, a frase com lacunas some na última etapa da nova memória. |
| 47-N11 | "Adicionar outro laço" desce um degrau de tamanho. |

Confirmadas como estão, entre as que mudam a experiência: 46-N1 (o toque em quem está em foco mostra a ficha; o segundo abre a página), 47-N1 (rascunho sem ano guarda 0 e aparece como "sem data", sem migração), 44-N1 (a carta conta como vista ao abrir a página) e 45-N1 (a primeira foto do Explorar no celular fica onde está).

## Grupo 1: esqueleto, Início, carta (PR #44)

Seguindo com a recomendada enquanto isso.

### 44-N1. A carta "uma vez" vale mesmo se a pessoa recarregar a página sem querer?

**muda a experiência**

- Contexto: a P15 A diz que a carta aparece no alto uma vez.
- O que vi: a carta conta como vista quando a página é montada. Um recarregar acidental na noite de Natal leva ao painel, com a carta só no link discreto.
- Opções:
  - A (recomendada, em uso): uma vez, como respondido. A carta continua em "Carta de Natal" e em "Sua conta".
  - B: a carta só conta como vista quando a pessoa toca em "Abrir o acervo".
  - C: a carta continua no alto por alguns minutos depois da primeira aparição.

### 44-N2. "Neste dia" com três ou quatro memórias pode dividir a linha com o cartão de contar?

**ajuste**

- Contexto: a P16 põe contar na primeira coluna e a P19 mantém a faixa para três ou quatro memórias. As duas juntas não dizem onde a faixa fica.
- O que vi: com a faixa na largura inteira, contar ficava sozinho numa linha.
- Opções:
  - A (recomendada, em uso): contar em 4 colunas e a faixa em 8 ao lado.
  - B: a faixa na largura inteira acima dos cartões.
- Captura: `inicio/p19-cartoes-faixa-ao-lado-de-contar--1280.jpg`

### 44-N3. Quais telas de navegação ficam com a assinatura inteira no rodapé?

**ajuste**

- Contexto: a P7 A cita Início, memória, pessoa e capítulo como leitura.
- O que vi: Explorar, as listas de Capítulos e de Pessoas, a Árvore, o Tema e a Carta não estão em nenhum dos dois grupos.
- Opções:
  - A (recomendada, em uso): ficam com a inteira.
  - B: as listas e a Árvore passam para a metade.

### 44-N4. O link da carta em "Sua conta" pode ser "Ler a carta de Natal"?

**detalhe**

- Contexto: na Administração já existe um "Carta de Natal", que leva à tela de escrever.
- Opções:
  - A (recomendada, em uso): "Ler a carta de Natal".
  - B: "Carta de Natal", renomeando o da Administração para "Escrever a carta de Natal".

### 44-N5. "Sair" deve aparecer também na homologação?

**detalhe**

- Contexto: na homologação há login, mas quem a pessoa "é" vem do "Ver como".
- Opções:
  - A (recomendada, em uso): aparece na produção e na homologação, para conferir a saída antes de ir ao ar.
  - B: só na produção.

### 44-N6. Apelido com parentesco, para quem não tem laço calculado com a pessoa: fica o apelido?

**detalhe**

- Contexto: a P22 A fala de "parentesco que não é o de quem olha".
- O que vi: para a Giovanna, "Tia Lourdes" não tem parentesco calculado.
- Opções:
  - A (recomendada, em uso): sem laço conhecido, o apelido fica.
  - B: sem laço, tirar o parentesco ("Lourdes").

### 44-N7. A saudação da carta usa o apelido da própria pessoa?

**detalhe**

- O que vi: a carta saúda com o apelido ("Oi, Tia Cida,") e o painel usa o nome do acesso ("Oi, Elizete."). Não mexi.
- Opções:
  - A (recomendada): a carta usa o mesmo nome do painel.
  - B: manter como está (em uso).

### 44-N8. Um cartão sozinho na fileira ocupa metade da largura?

**detalhe**

- Opções:
  - A (recomendada, em uso): metade.
  - B: largura inteira.

### 44-N9. No celular, o rodapé cresceu de 290 para 362 px. Tudo bem?

**detalhe**

- Opções:
  - A (recomendada, em uso): manter.
  - B: "Voltar ao alto" na mesma linha dos itens do menu.

Ficou de fora, para uma próxima rodada: `scripts/capturas.mjs` e as capturas antigas de `docs/visual/fase-3/pessoal/` não acompanham o Início novo.

## Grupo 2: Explorar, memória, excluir (PR #45)

Seguindo com a recomendada enquanto isso.

### 45-N1. No celular, a primeira foto do Explorar pode subir mais?

**muda a experiência**

- Contexto: resposta à P32, para a primeira tela mostrar uma foto nas três larguras.
- O que vi: em 390 × 844 a foto começa em y = 810 com a faixa de teste, perto de 774 sem ela. Entre a faixa de décadas e a foto ficam o ano (94 px), a marca do capítulo (64 px) e a linha da data (51 px).
- Opções:
  - A (recomendada, em uso): manter.
  - B: o nome de cada controle na mesma linha das opções (cerca de 54 px a menos).
  - C: no celular, a foto antes da linha da data e do tipo (cerca de 50 px a menos).
- Captura: `explorar/` (as da P32 em 390 px)

### 45-N2. No mural e na lista dentro de outras telas, vale a mesma legenda de 11 px?

**detalhe**

- Contexto: a P40 pôs o piso na peça da foto revelada, que todas as telas usam.
- O que vi: em 1280 px, a legenda mais longa da lista ("Belo Horizonte (2026)") ocupa duas linhas.
- Opções:
  - A (recomendada, em uso): o piso vale em todas.
  - B: só na linha do tempo.

### 45-N3. O fecho da linha do tempo aparece com filtro?

**detalhe**

- Contexto: P41, "Aqui começa o acervo.".
- O que vi: com filtro, ou em "Mais antigas primeiro", a última memória da tela não é a mais antiga do acervo.
- Opções:
  - A (recomendada, em uso): a frase só quando é verdade; nos outros casos ficam "Nova memória" e "Voltar ao começo".
  - B: sem fecho nenhum quando há filtro.

### 45-N4. No celular, "Voltar ao começo" e "Voltar ao alto" ficam os dois?

**detalhe**

- Contexto: o fecho da linha do tempo (P41) tem "Voltar ao começo" e, logo abaixo, o rodapé do celular (P3) tem "Voltar ao alto".
- O que vi: os dois levam ao alto da mesma página, a uma tela de distância um do outro.
- Opções:
  - A (recomendada, em uso): ficam os dois, cada um na sua peça.
  - B: no Explorar, o fecho fica só com "Nova memória".

### 45-N5. A ordem nova do modo TV no celular vale em "Me mostre uma memória"?

**detalhe**

- Contexto: a P49 fala do modo TV; as duas telas usam a mesma peça.
- Opções:
  - A (recomendada, em uso): vale nas duas.
  - B: só no modo TV.

### 45-N6. "Próxima" tocada à mão, sem rede, também espera?

**detalhe**

- Contexto: o C3 fala de passar sozinho. Antes, o toque sem rede levava à página de erro do navegador.
- Opções:
  - A (recomendada, em uso): mesmo aviso e mesma volta.
  - B: só quando passa sozinho.

### 45-N7. Relato registrado por outra pessoa também some da seção "Relato" quando coube na abertura?

**detalhe**

- Contexto: a P52 tira o bilhete repetido. O bilhete diz "registrado por Fulano"; a abertura não diz.
- Opções:
  - A (recomendada, em uso): nesse caso o bilhete continua.
  - B: some também.

### 45-N8. Quem só tem rascunho do relato lê "Você já contou esse dia."?

**detalhe**

- Contexto: já era assim antes da P54, e a linha nova herdou.
- O que vi: a Elizete, com um rascunho em "Natal de 2025", lê "Você já contou esse dia.".
- Opções:
  - A (recomendada): com rascunho, "Seu relato está em rascunho." e "Continuar meu relato".
  - B: manter como está (em uso, porque a pergunta não pedia).

Sobre a P45: a opção A é "em branco, como está", então nada mudou ali. O aviso do ano aprovado é o da P143, que vai no PR dos formulários.

## Grupo 3: capítulos, tema, árvore, pessoas, pessoa (PR #46)

Seguindo com a recomendada enquanto isso.

### 46-N1. Com a ficha fechada, o toque em quem já está em foco mostra a ficha ou abre a página?

**muda a experiência**

- Contexto: a árvore abre com quem olha em foco e sem ficha (P84). Os gestos do mapa são travados.
- O que vi: sem mudança, o primeiro toque em si mesmo abriria a página direto, diferente do toque em qualquer outra pessoa.
- Opções:
  - A (recomendada, em uso): o toque mostra a ficha; com a ficha à vista, o segundo toque abre a página.
  - B: o toque em quem está em foco abre sempre a página, como era.

### 46-N2. No celular, com os ajustes abertos, "Ver a árvore inteira" pode enquadrar só a área acima do painel?

**ajuste**

- Contexto: a P92 levou o painel de ajustes para o pé do mapa no celular.
- O que vi: sem descontar o painel, uma árvore pequena ficava escondida atrás dele. A conta do enquadramento mudou só nesse caso (celular, painel aberto).
- Opções:
  - A (recomendada, em uso): desconta o painel.
  - B: enquadra na área inteira, como antes.

### 46-N3. Em 1280 px a ficha fica uma linha acima da barra de baixo. Serve?

**ajuste**

- Contexto: a P85 pede a ficha "entre a legenda e o zoom". Com os nomes novos da P95, a barra mede cerca de 470 px e encostaria na ficha.
- Opções:
  - A (recomendada, em uso): até 1600 px a ficha sobe uma linha; daí em diante fica na linha da barra.
  - B: nomes mais curtos na barra em 1280 px.
  - C: a ficha um pouco à esquerda do centro.

### 46-N4. No mural e na lista do capítulo, a capa fica em cima e as memórias usam a largura inteira?

**ajuste**

- Contexto: a P69 trouxe as formas de ver para a página. O mural e a lista foram feitos para a largura da página e não cabem na coluna direita do capítulo.
- Opções:
  - A (recomendada, em uso): nessas duas formas a capa fica em cima e nada fica parado.
  - B: mural e lista só pelo Explorar, e a página fica só com os marcos.

### 46-N5. Na ordem por geração, onde entra quem não tem laço de árvore?

**ajuste**

- Contexto: amigos e parentes sem filiação nem casal não têm geração.
- Opções:
  - A (recomendada, em uso): depois das gerações e antes dos bichos, pelo nome.
  - B: pela idade, no meio das gerações.

### 46-N6. Os textos novos da árvore e de Pessoas ficam?

**detalhe**

- Contexto: as perguntas pediam os itens e as ações, sem dar o texto.
- O que vi: na legenda, "de duas famílias", "abre outro ramo da família", "você", "quem você tocou", "bicho da família". Na ficha do celular, "Mais". Em Pessoas, "Ordem: Por geração · De A a Z" e "Escreva o nome".
- Opções:
  - A (recomendada, em uso): ficam.
  - B: o Gui reescreve.

### 46-N7. A primeira opção de "Forma de ver" do capítulo se chama "Marcos"?

**detalhe**

- Contexto: a P69 fala em "marcos, mural, lista"; "marcos" nunca tinha aparecido na tela.
- Opções:
  - A (em uso): "Marcos".
  - B: "Em ordem".
  - C: "Linha do tempo", como na pessoa.

### 46-N8. "Capítulo de “Natais”" com aspas?

**detalhe**

- Contexto: a P70 pede "Capítulo de Natais". Sem aspas, um título com artigo fica "Capítulo de A infância da Giovanna".
- Opções:
  - A (recomendada, em uso): com aspas.
  - B: sem aspas.

### 46-N9. Em "Aconteceu neste período", qual é a exceção no acervo real?

**detalhe**

- Contexto: a P73 A diz para marcar "o que for mais raro no acervo real", que a sessão não vê.
- Opções:
  - A (em uso): marcar só "inteiro neste período".
  - B: marcar só "em parte".

### 46-N10. Com dia e mês conhecidos, o carimbo da pessoa mostra a data inteira ou só o ano?

**detalhe**

- Contexto: a P108 dá como exemplo "BAYARA · 1999". Só com o ano, o aniversário sumiria da página.
- Opções:
  - A (recomendada, em uso): o que se sabe de cada data ("4 DE MAIO DE 1942").
  - B: só os anos.

### 46-N11. A frase de quem restaura o capítulo acompanha a da memória?

**detalhe**

- Contexto: a P59 trocou a frase só na memória. Em Excluir capítulo continua "você ou a Giovanna e o Lucas Magno podem restaurar como estava".
- Opções:
  - A (recomendada): a mesma forma, "você, a Giovanna ou o Lucas Magno".
  - B: manter como está (em uso, porque a P80 não pedia).

### 46-N12. O sinal "+" de "Ajustar a árvore" continua igual ao "+" dos ramos?

**detalhe**

- Contexto: a P92 apontou a semelhança, mas a opção A não trata dela.
- Opções:
  - A (recomendada, em uso): manter.
  - B: trocar o sinal do painel por uma seta.

## Grupo 4: formulários, conta, administração, sistema, erro (PR #47)

Seguindo com a recomendada enquanto isso, salvo onde está dito.

### 47-N1. O rascunho sem ano guarda 0 no banco e aparece como "sem data"?

**muda a experiência**

- Contexto: a P132 deixou salvar o rascunho só com o título. A coluna do ano é obrigatória.
- O que vi: o rascunho guarda 0 e as listas escrevem "sem data" (conta, lixeira, confirmação de descartar). O servidor recusa publicar sem ano.
- Opções:
  - A (recomendada, em uso): como está, sem migração.
  - B: migração que torna o ano opcional, refazendo a tabela das memórias e as dependentes.
  - C: como A, mas sem escrever nada no lugar da data.

### 47-N2. Qual é a frase da zona de perigo dentro do laço?

**detalhe**

- Contexto: a P131 pede acertar no laço a frase do que acontece. Remover um laço não vai para a lixeira.
- O que vi: a zona do laço tem só o título e o link.
- Opções:
  - A (recomendada): "O laço some da árvore e das páginas das duas pessoas. Não vai para a lixeira." (no casal, "O casal some…").
  - B: sem frase (em uso, porque o texto é novo).

### 47-N3. No "Adicionar laço" completo, "Como estão hoje?" também perde Separação e Amizade?

**ajuste**

- Contexto: a P109 fala do cadastro guiado. O formulário com abas tem a mesma pergunta com as seis fases.
- Opções:
  - A (recomendada): igual ao guiado, só as quatro fases de estar junto.
  - B: manter as seis ali (em uso, porque a P109 cita só o guiado).

### 47-N4. Na conta, "O que você criou" fica depois dos laços também no celular?

**ajuste**

- Contexto: a P148 pede as contas numa linha só na tela grande. Para o teclado seguir a ordem da tela, a ordem do código mudou.
- O que vi: no celular a ordem passou a ser rascunhos, laços, o que você criou.
- Opções:
  - A (recomendada, em uso): a nova ordem em todas as larguras.
  - B: voltar à ordem antiga no celular.

### 47-N5. "Ver todas no Explorar" serve sem filtro de quem criou?

**ajuste**

- Contexto: a P151 pedia o filtro "se existir". Não existe.
- O que vi: o link abre o Explorar inteiro, com as memórias de todos.
- Opções:
  - A (recomendada, em uso): deixar assim até existir o filtro.
  - B: criar o filtro "criadas por mim" no Explorar.
  - C: tirar o link e mostrar só a contagem.

### 47-N6. Enter na busca de "Quem está contando", sem nome escolhido, salva o relato?

**ajuste**

- Contexto: "Meu relato" não tem etapas, então Enter num campo envia. Já era assim.
- Opções:
  - A (recomendada): Enter na busca nunca envia.
  - B: manter (em uso, porque a busca é uma peça comum).

### 47-N7. O texto "Sobre você" deve aparecer na conta?

**detalhe**

- Contexto: ele ficava no cartão "Seus dados", que saiu pela P149.
- Opções:
  - A (recomendada, em uso): fica só na página da pessoa.
  - B: volta para a conta, num cartão próprio.

### 47-N8. Os textos novos destes formulários ficam?

**detalhe**

- O que vi: o aviso da ficha não salva ("A ficha tem mudanças que ainda não foram salvas. O que você escreveu continua lá.", "Voltar à ficha para salvar"); "será removida ao salvar"; na conta, "chamado de" ou "chamada de" conforme o tratamento, e "e-mail de acesso: …".
- Opções:
  - A (recomendada, em uso): ficam.
  - B: o Gui reescreve.

### 47-N9. Os nomes e as memórias dos três tipos de exemplo servem?

**detalhe**

- O que vi: Formatura, Praia e Bichos, com "Formatura da Luísa" (2023), "Uma semana na praia" (2022) e "A Mel descobre a varanda" (2021).
- Opções:
  - A (recomendada, em uso): manter.
  - B: trocar.

### 47-N10. No fim da nova memória, no celular, a frase com lacunas aparece logo depois do "Confira antes de publicar"?

**detalhe**

- Contexto: a P126 pôs a frase abaixo da pergunta no celular. Na última etapa ela repete o resumo.
- Opções:
  - A (recomendada): some na última etapa, no celular.
  - B: fica (em uso, que é o que a P126 descreve).

### 47-N11. "Adicionar outro laço" continua do tamanho de "Laços"?

**detalhe**

- Opções:
  - A (recomendada): descer um degrau.
  - B: manter (em uso).

### 47-N12. No espelho, a pergunta fala em "homologação" também no computador?

**detalhe**

- Opções:
  - A (recomendada, em uso): manter o texto aprovado.
  - B: texto por ambiente.
