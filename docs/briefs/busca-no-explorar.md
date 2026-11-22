# Busca por digitação no Explorar (exploração E2)

Situação: escrito no chat em 22/11/2026, esperando a aprovação do Gui. Aprovado, vira a sessão de exploração E2: duas propostas numa prévia `tst-busca`, e a sessão para até o Gui escolher. Prazo: antes de 10/12/2026.

## De onde vem

As críticas de design C1 e C2 de 22/11/2026 e as respostas do Gui no item "Críticas de design C1 e C2 dos fluxos de quem recebe o presente", em `docs/decisoes.md`, "Decidido, a construir". A busca está decidida (o Gui: "pesquisar digitando vai ser fundamental"); a exploração decide o como. A primeira tela do Explorar sem foto entra como questão desta mesma exploração. Os relatórios estão em `docs/critica/`. Ler antes de começar:

- C2, fluxo 2: "Achar “aquele Natal na casa da vó”", "A lista de “Quem estava junto”" e "O alto do Explorar".
- C1, fluxo 2: "Não há busca por palavra" e "A linha do tempo é pesada para procurar no celular".
- O esboço `explorar-saidas.html` da C2 (em `docs/critica/esbocos/`), que já mostra as saídas numa linha própria e o parentesco no filtro, pontos que vão na sessão AA.

## O problema

**Achar uma memória lembrada pede conhecer a organização do acervo.** Medido pela C2, como a Elizete: "aquele Natal na casa da vó" levou quatro toques e umas oito telas de rolagem ("Filtros", "Quem estava junto", achar "Vó Vivica" a 1.355 px numa lista alfabética, "Ver as 11 memórias", e a memória a 6.564 px). Pelo caminho mais natural ela não acha: "Natal" não é tipo de momento (o tipo é "Festa"); é o capítulo "Natais" e o tema "Natal", em dois grupos diferentes. Escada de porquês da C2: os filtros espelham como o acervo é organizado, porque o acervo foi pensado por quem cadastra. Quem procura pensa em palavras ("Natal", "vó", "Sabará") e em gente ("minha mãe"). Gravidade alta nas semanas depois do Natal, com centenas de memórias.

**A primeira tela do Explorar não tem foto.** Em 390 × 844, a primeira polaroid começa a 800 px; em 1920 × 1080, a 730 px, cortada. Escada de porquês da C2: a assinatura grande abre o Explorar porque é a ideia forte desta tela na tabela de `docs/visual.md`, feita quando a linha do tempo era a página inicial. Desde que o painel virou o Início, o Explorar é uma ferramenta aberta pelo menu várias vezes por visita, e a capa repete uma boas-vindas numa tela de trabalho.

## Os objetivos

**De uso.** No celular, achar em poucos toques uma memória de que a pessoa se lembra por uma palavra ou por alguém, sem saber o que é tipo, capítulo ou tema. Passear sem rumo continua tão fácil quanto hoje.

**Visual.** A primeira tela do Explorar mostra memórias. A marca continua dizendo "de quem é isto" onde ela é forte (o Início, a carta, o rodapé, a assinatura do que está filtrado). A busca é a caixa que todo mundo conhece ("Padrões que as pessoas já conhecem", em `docs/visual.md`), desenhada com o material do site, e não um campo de formulário solto.

## O que já está decidido e não se reabre

- A busca existe e entra antes de 10/12.
- As saídas "Modo TV" e "Me mostre uma memória" ficam à vista no celular, numa linha própria, e "Quem estava junto" ganha o parentesco de quem olha. Vão na sessão AA; a exploração parte desse desenho.
- A família, a forma de ver e os filtros são três coisas, cada uma com a sua cara (proposta A da sessão D). As formas de ver, os filtros e a ordem ficam no endereço e funcionam sem script.
- A troca no lugar, sem recarregar e sem tirar a pessoa do ponto da tela (`explorar-troca.ts`, "Movimento que mostra o que mudou"). "Nada salta na página".
- Quem vê o quê: o que a pessoa não vê responde igual ao que não existe (`soFiltrosConhecidos`), e isso vale também para sugestão, contagem e resultado vazio.
- Nada preso no alto além da faixa de décadas e do ano; peça parada nova pede decisão e conferência no iPhone.

## O que a exploração decide

1. **Onde a busca mora:** no alto do Explorar, no topo do site, no Início, ou em mais de um lugar.
2. **Como convive com os filtros:** mais um filtro no endereço (`q=`), com a ficha ligada como os outros, ou uma camada à parte que leva aos filtros.
3. **O que ela acha:** título, lugar, pessoas (pelo nome, pelo apelido e pelo parentesco de quem procura: "minha mãe", "vó"), capítulo, tema e tipo, numa caixa só. Sem diferença de acento e de maiúscula ("sabara" acha "Sabará"). O texto dos relatos depende da resposta do Gui (ver "Para o Gui decidir antes").
4. **Como mostra o resultado:** nas formas de ver de hoje, numa lista própria, ou agrupado (memórias, pessoas, capítulos), e o que aparece enquanto se digita.
5. **Sem resultado:** o que a tela diz e para onde leva.
6. **O teclado do celular:** o que fica à vista com o teclado aberto, em 390 × 844.
7. **A primeira tela do Explorar:** o que vira a ideia forte da tela, como a família e a assinatura do que está filtrado continuam dizendo de quem é, e o que acontece no computador, onde a assinatura grande tem mais razão de ser.
8. **O custo com o acervo cheio:** a consulta com centenas de memórias, e se a linha do tempo, que carrega tudo de uma vez, precisa mudar junto.

## As duas propostas

Sugestão de partida; a sessão pode trocar por duas mais distintas, explicando o porquê:

- **A. A caixa no alto do Explorar.** A busca abre a tela, no lugar da assinatura de capa no celular, e o resultado aparece nas formas de ver de hoje, como um filtro a mais. A marca vai para onde já é forte.
- **B. A busca como porta do site.** Uma lupa no topo, em todas as páginas, que abre a busca por cima, com o resultado agrupado e levando ao Explorar filtrado. O alto do Explorar fica mais compacto, com memórias na primeira tela.

## Limites da sessão

- Só a prévia `tst-busca`, nascida da `homologa`, com o acervo de exemplo. Sem PR para a `homologa`.
- Sem migração nova (a prévia divide o banco com as outras de teste). Se a proposta pedir índice ou tabela de busca, a sessão descreve para a aplicação.
- A consulta de busca respeita quem vê o quê desde a prévia: memória, relato que espera, rascunho e pessoa que a pessoa não vê nunca aparecem, nem como sugestão.
- A aplicação que sair daqui mexe no que cada pessoa vê, então tem revisão contra lista fechada, de outro modelo, como a AA2.

## O que a sessão entrega

- As duas propostas na prévia, com as capturas em 390 × 844 (também com o teclado aberto), 1280 × 720 e 1920 × 1080, por teclado e com movimento reduzido.
- Para cada uma, o caminho de "aquele Natal na casa da vó" medido como na C2 (toques e rolagem), comparado com os quatro toques e as oito telas de hoje.
- O que custa aplicar: telas, consulta, regras e testes que mudam.
- As perguntas que sobrarem, poucas por vez, e a tabela "O quê | Onde ver" com os endereços na prévia.
- E para. A escolha vira sessão de aplicação, com a revisão de outro modelo.

## Para o Gui decidir antes

- **A busca acha o texto dos relatos?** "O Natal em que faltou luz" pode estar só no relato de alguém. Achar no relato é mais útil e pede mais cuidado: o relato que espera e o rascunho não podem aparecer, nem o trecho deles.
