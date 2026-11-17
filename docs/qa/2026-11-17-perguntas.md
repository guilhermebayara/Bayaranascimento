# QA de design de 17/11/2026: perguntas para o Gui

Sessão de QA de design pedida pelo Gui em 17/11/2026 (roteiro em `docs/qa-design.md`), na branch `qa-2026-11-17-design`, nascida da `homologa` com o visual novo inteiro. Todas as telas foram vistas na ordem do menu, com o acervo de exemplo, em 390, 1280 e 1920 px, por teclado e com movimento reduzido, e onde a tela promete, sem JavaScript.

**Como responder.** Cada pergunta tem um número (P1, P2...) e opções com letra. A primeira opção é a recomendada. Basta responder "P12 A, P13 C", e o que ficar sem resposta continua como está. Nada do que está aqui foi mudado: só os defeitos, listados logo depois do resumo. As capturas citadas estão em `docs/visual/qa-2026-11-17/`.

**Pesos.** **Muda a experiência**: muda o que a pessoa faz ou entende na tela. **Ajuste**: melhora sem mudar o caminho. **Detalhe**: acabamento.

As 17 perguntas que ficaram abertas nos PRs #39 e #40 estão na tela de cada uma, com o PR e o número no título, e com o que esta rodada viu a mais. Em três delas a recomendação mudou em relação ao PR, e a pergunta diz por quê.

## Respostas do Gui (17/11/2026)

**Todas as perguntas foram respondidas.** Vale a opção recomendada (a primeira, "A") em todas as 174, menos as listadas abaixo. Os dois textos novos ("Não encontramos esta página." e o aviso do ano) estão aprovados.

Diferente da recomendada, ou com acréscimo:

- **P32:** as duas coisas. Controles menores no celular (opção A) e assinatura menor só no Explorar em 1280 e 1920 px (opção B).
- **P98:** busca no alto e ordem por geração (opção A), com uma troca para ordem alfabética, para cada um achar do jeito que preferir.
- **P102:** opção A. Os áudios de exemplo são vozes sintetizadas curtas, nunca de ninguém da família, com as mesmas regras das fotos de exemplo: só no banco e no bucket de teste, nunca na produção, com a guarda cobrindo.

Do QA de código (#42):

- **C1:** esconder em todo lugar. Quem só existe num laço do coração privado de outra pessoa some, para quem não é dono do laço, da lista de Pessoas, dos seletores de pessoa (não pode ser marcado em memória nem capítulo) e da própria página (404), com a mesma regra da árvore.
- **C2:** o Explorar desinverte sozinho um período invertido ("de 2000 a 1990" vira "de 1990 a 2000").
- **C3:** no modo TV passando sozinho, sem rede, a memória da tela fica, a passagem pausa com "Sem conexão. Tentando de novo…" e volta sozinha quando a rede volta.
- **C4:** a linha do tempo continua carregando tudo; medir de novo depois da carga do Natal.
- **P88:** autorizada a correção do teclado e do foco na árvore em `src/lib/cliente/arvore.ts`, sem mudar desenho, arranjo nem gestos; os testes `testes/arvore-*.test.ts` passam sem mudança.

## Resumo

São 174 perguntas: 24 que mudam a experiência, 78 de ajuste e 72 de detalhe.

| Tela | Perguntas | Muda a experiência | Ajuste | Detalhe |
| --- | --- | --- | --- | --- |
| Esqueleto (topo, menu e rodapé) | P1 a P12 | 2 | 5 | 5 |
| Início | P13 a P28 | 4 | 6 | 6 |
| Carta de Natal | P29 a P31 | 0 | 1 | 2 |
| Explorar: o alto da página e os controles | P32 a P39 | 2 | 3 | 3 |
| Explorar: linha do tempo | P40 a P42 | 0 | 1 | 2 |
| Explorar: lista | P43 a P46 | 0 | 2 | 2 |
| Explorar: mural | P47 | 0 | 0 | 1 |
| Explorar: modo TV | P48 a P50 | 1 | 1 | 1 |
| Página da memória | P51 a P56 | 0 | 4 | 2 |
| Excluir memória | P57 a P59 | 0 | 0 | 3 |
| Capítulos | P60 a P64 | 0 | 3 | 2 |
| Capítulo | P65 a P74 | 1 | 5 | 4 |
| Novo capítulo | P75 a P77 | 0 | 1 | 2 |
| Editar capítulo | P78 a P79 | 1 | 1 | 0 |
| Excluir capítulo | P80 | 0 | 0 | 1 |
| Tema | P81 a P83 | 0 | 2 | 1 |
| Árvore | P84 a P97 | 4 | 6 | 4 |
| Pessoas | P98 a P101 | 1 | 1 | 2 |
| Pessoa | P102 a P108 | 2 | 4 | 1 |
| Nova pessoa e cadastro guiado | P109 a P113 | 1 | 0 | 4 |
| Editar página e laços | P114 a P125 | 1 | 8 | 3 |
| Nova memória | P126 a P146 | 2 | 12 | 7 |
| Meu relato | P147 | 0 | 1 | 0 |
| Sua conta | P148 a P153 | 1 | 2 | 3 |
| Rascunhos e lixeira | P154 a P156 | 0 | 2 | 1 |
| Administração: tipos de momento | P157 a P168 | 1 | 5 | 6 |
| Administração: famílias, carta de Natal e espelho da produção | P169 a P171 | 0 | 1 | 2 |
| Sistema visual | P172 a P173 | 0 | 0 | 2 |
| Página não encontrada | P174 | 0 | 1 | 0 |

**As cinco que mais mudam a experiência:**

1. **P32, Explorar: o alto da página e os controles:** A primeira tela do Explorar pode mostrar uma foto? Nas três larguras, a tela mais usada do acervo abre sem nenhuma foto à vista.
2. **P14, Início:** Na primeira visita, a carta fica sozinha na tela ou com o painel embaixo? É o momento do presente, na noite de Natal.
3. **P13, Início:** Num dia sem novidade, o que a primeira tela mostra no computador? Vai ser o estado da maioria das visitas, e hoje a primeira tela fica quase vazia.
4. **P84, Árvore:** A ficha deve aparecer só depois de tocar em alguém, e ter como fechar? A ficha da árvore abre sozinha, não fecha e cobre pessoas nas três larguras.
5. **P2, Esqueleto (topo, menu e rodapé):** No celular, "Nova memória" deve ficar à vista na barra? O acervo cresce quando alguém conta, e no celular a ação está no fim do menu.

## Até onde a sessão chegou

Todas as telas do roteiro foram vistas, e o arquivo está completo. A revisão foi dividida em cinco frentes, uma por grupo de telas, que rodaram ao mesmo tempo; cada defeito foi reproduzido de novo antes de ser corrigido.

## Defeitos corrigidos nesta rodada

Tudo na branch `qa-2026-11-17-design`, com teste em `testes/qa-design.test.ts` (e em `testes/conteudo.test.ts` e `testes/conta.test.ts`).

| Tela | O que estava errado | O que foi feito |
| --- | --- | --- |
| Recados | "Só o Gui e a Giovanna", sem o Magno, nos recados de `/api/tipos`, `/api/espelho` e `/api/copia` | "Só os administradores…", como nas outras rotas |
| Todas | Memória, pessoa, capítulo ou endereço que não existe respondia texto puro, sem menu e sem volta | Página de erro com o esqueleto do site e "Voltar ao início". O texto é provisório (pergunta da "Página não encontrada") |
| Todas, no celular | A marca e o retrato do topo tinham 27 e 36 px de largura, e o "Menu" ocupava a barra inteira por baixo | 44 px nos dois, e só a palavra "Menu" abre o menu |
| Todas | Não havia como pular o menu pelo teclado | "Pular para o conteúdo", o primeiro link da página, que só aparece com foco |
| Menu do celular, Início | "Nova memória" e "E mais N: ver o que entrou por último" perdiam o sublinhado e não pareciam links | Sublinhado de volta |
| Formulários em etapas | Enter num campo enviava o formulário no meio do caminho: o capítulo era criado sem passar por "Quem vê", e a memória era salva como rascunho | Enter faz o mesmo que "Continuar". Na última etapa, envia |
| Nova memória | "Informe o ano" aparecia na etapa 1, onde não há ano | Leva a "Quando e onde", com o foco no ano |
| Nova memória | Depois de "Salvar rascunho", o aviso ficava fora da tela em 390 e 1280 px | O recado aparece no alto, onde a página abre |
| Nova memória, 1280 px | O resumo ao lado ficava cortado para sempre numa janela baixa de notebook | Só fica parado em janela alta o bastante |
| Relato, sem script | O relato já escrito vinha vazio, com os botões de relato novo | O texto vem no campo, com "Salvar alterações" |
| Correção, sem script | "Remover foto" aparecia e não fazia nada | Some com os outros botões que dependem de script |
| Busca de pessoa | Um Tab deixava o foco em lugar nenhum (parava na lista de sugestões escondida) | A lista sai da ordem do Tab |
| Editar capítulo, computador | A trilha encostava na pergunta (0 px) | Respiro abaixo da trilha |
| Capítulo, computador | A capa parada era mais alta que a janela, e "Quem aparece" ficava fora de alcance até o fim da página | Capa mais alta que a janela não fica parada |
| Capítulo vazio | A frase mandava usar "Escolher memórias e editar" para quem vê o botão como "Escolher memórias" | A frase cita o nome que o botão tem para quem vê |
| Árvore, sem script | Mapa vazio com controles que não fazem nada, e o aviso só depois de rolar | O aviso no lugar do mapa |
| Árvore, celular | O mapa passava do pé da janela e a barra de zoom abria cortada | A altura do mapa desconta o que há acima dele |
| Pessoa | O nome do laço do coração saía com maiúscula na página de outra pessoa ("Vó de consideração") | Minúscula, como na árvore |
| Editar página e laços | Abrir o "Editar" de um laço com outro aberto acima jogava a página para longe | O laço tocado fica onde o dedo tocou |
| Sua conta | O mesmo rascunho aparecia duas vezes, como memória e como relato em andamento | Uma linha só |
| Cadastro guiado | Links no meio da frase com 18 a 21 px de toque; em 1920 px, os dois cartões do caminho com alturas diferentes | 44 px de toque e cartões da mesma altura |
| Tipos de momento, 1920 px | A marca de quem usa a cor aparecia cortada ("em Conqui…") | A marca quebra em duas linhas |
| Modo TV, computador | As fotos de volta da direita cobriam a primeira letra do título e de cada linha do trecho | As fotos saem menos para a direita (39 px de folga em 1280 px) |
| Linha do tempo sem resultado, celular | Uma faixa na cor do papel cobria o resumo dos filtros e a frase do estado vazio | Sem memória nenhuma, a cobertura não acende. Precisa ser visto no iPhone |
| Linha do tempo, celular | O título do capítulo e o da época tinham 20 px de toque | 44 px, sem mudar o desenho |
| `scripts/capturas.mjs` | Dois endereços apontavam para uma memória e uma família que não existem | Endereços certos |

**Defeitos que ficaram sem correção, e por quê:**

- **Árvore, pelo teclado** (o mapa rola por dentro e leva os controles embora; abrir um ramo perde o foco). A correção mexe em `src/lib/cliente/arvore.ts`, que é comportamento travado. Está como pergunta na tela da árvore.
- **Árvore, a ficha cobre pessoas ao abrir.** A correção depende de onde a ficha mora e de quando ela aparece, que são as primeiras perguntas da árvore.
- **Zona de perigo, 1280 px:** sai 3,5 px para cada lado da coluna da pergunta. Fica para ser acertado junto com a resposta da pergunta da zona.
- **Novo capítulo, celular:** o exemplo do título aparece cortado. O texto é do Gui: está como pergunta.

## Esqueleto (topo, menu e rodapé)

### P1. O mesmo lugar tem três nomes. Qual fica?

**Feito (opção A):** o menu segue "Explorar" e a carta segue "Abrir o acervo"; o convite do fim do Início passou a dizer "Explorar todas as memórias". Capturas: p20-convite-decadas-e-teste--390.jpg, p20-convite-decadas-e-teste--1280.jpg.

**muda a experiência**

- Contexto: o Gui aprovou "Explorar" como nome do item do menu e do endereço, "Ver a linha do tempo inteira" no Início e "Abrir o acervo" na carta.
- O que vi: os três levam a `/explorar`. Quem lê a carta toca "Abrir o acervo", chega numa tela cujo item aceso se chama "Explorar", e no Início o convite para a mesma tela diz "linha do tempo". A palavra "acervo" volta em "Você no acervo". Para quem tem pouca familiaridade, são três lugares.
- Opções:
  - A (recomendada): o menu segue "Explorar", a carta segue "Abrir o acervo" (é o gesto da carta) e o convite do Início passa a usar a palavra do menu, por exemplo "Explorar todas as memórias".
  - B: o item do menu passa a se chamar "Memórias", que é a palavra que a família usa, e os dois convites dizem "Ver todas as memórias".
  - C: manter como está.

### P2. No celular, "Nova memória" deve ficar à vista na barra?

**Feito (opção A):** "Nova memória" entrou na barra do celular, sublinhada, entre a marca e o retrato, e saiu do fim do menu. Capturas: p02-barra--390.jpg, p02-barra--320.jpg, p09-menu-aberto--390.jpg.

**muda a experiência**

- Contexto: o acervo cresce quando alguém conta. No computador, "Nova memória" está sempre à vista, sublinhada. O menu em sanfona foi aprovado.
- O que vi: em 390 px, "Nova memória" é o sétimo e último item do menu, a 472 px do alto, depois de "Sua conta". São dois toques e uma rolagem de olho. A barra tem 205 px livres entre o "M" e o retrato.
- Opções:
  - A (recomendada): "Nova memória" entra na barra do celular, como ação sublinhada entre a marca e o retrato, e sai do fim do menu.
  - B: continua no menu, mas como primeiro item, acima de "Início".
  - C: manter como está.

### P3. O rodapé deve repetir o menu e ter "Voltar ao alto"?

**Feito (opção A):** o rodapé ganhou os cinco itens do menu como ações quietas e, no celular, "Voltar ao alto". Capturas: p03-rodape-inicio--390.jpg, p03-rodape-inicio--1280.jpg.

**ajuste**

- Contexto: o topo não fica parado ao rolar (o cuidado com o Safari do iPhone pede isso), e o rodapé tem só a frase "Acervo privado da família. Você entrou como Fulano." e a assinatura.
- O que vi: em 390 px, o Explorar tem mais de 23.000 px de altura (a década de 1990 começa em 23.615 px) e o Início, de 2.800 a 4.100 px. Quem chega ao fim de uma tela não tem nenhum link: precisa rolar tudo de volta para trocar de seção.
- Opções:
  - A (recomendada): o rodapé ganha os cinco itens do menu como ações quietas e, no celular, "Voltar ao alto".
  - B: só "Voltar ao alto".
  - C: manter como está.

### P4. Como alguém sai da conta num aparelho dividido?

**Feito (opção A):** "Sair" no fim de "Sua conta" e ao lado da frase do rodapé, levando à saída do Access, só na produção e na homologação (as capturas foram tiradas com o login forçado no computador). Capturas: p04-sair-na-conta-e-no-rodape--390.jpg, p04-sair-na-conta-e-no-rodape--1280.jpg.

**ajuste**

- Contexto: o login é o do Cloudflare Access. O desktop é pensado para "ver juntos na TV", e o Início e a conta são páginas que só a pessoa vê.
- O que vi: não há "Sair" no topo, no menu, no rodapé nem em "Sua conta". Num computador ou tablet da casa, quem abrir depois vê o Início, os rascunhos e os laços privados de quem entrou antes. O rodapé já diz "Você entrou como Elizete", que é o lugar natural da saída.
- Opções:
  - A (recomendada): "Sair" no fim de "Sua conta" e ao lado da frase do rodapé ("Você entrou como Elizete. Sair"), levando à saída do Access. Só aparece onde há login.
  - B: só em "Sua conta".
  - C: manter como está.

### P5. Onde mora a carta depois da primeira visita?

**Feito (opção A):** o link do Início ficou e "Sua conta" ganhou, para todos, o carimbo "Natal de 2026" com "Ler a carta de Natal". Capturas: p05-carta-na-conta--390.jpg, p05-carta-na-conta--1280.jpg.

**ajuste**

- Contexto: depois da primeira visita, a carta fica num "link discreto" do Início (`docs/decisoes.md`).
- O que vi: o único caminho é "Carta de Natal", em 14 px e cor suave, ao lado de "Sua última visita foi em 17 nov.", na abertura do Início. Em "Sua conta", só os administradores têm um link de carta, e ele leva à tela de escrever. Uma avó que queira reler a carta em março dificilmente acha.
- Opções:
  - A (recomendada): manter o link do Início e pôr a carta também em "Sua conta", para todos, com o carimbo "Natal de 2026".
  - B: tirar do Início e deixar só no rodapé de todas as telas.
  - C: manter como está.

### P6. O Início deve avisar dos rascunhos da pessoa?

**Feito (opção A):** com rascunho, a abertura do Início mostra "Você tem um rascunho." e "Continuar o rascunho", que leva direto a ele; com mais de um, "Ver seus rascunhos" leva à lista. Capturas: p25-abertura-rascunho-e-ultima-visita--390.jpg.

**ajuste**

- Contexto: em 16/11/2026 o Gui decidiu que "Rascunhos" sai do menu e mora em "Sua conta". A lixeira também.
- O que vi: para continuar um rascunho, a pessoa toca no retrato (que no celular não tem nome nem rótulo), acha o cartão "Rascunhos e lixeira" e abre. O Início, que é o lugar de chegar, não diz nada sobre o que ela deixou pela metade, e o cartão "Você estava lá e ainda não contou" pode até oferecer outra memória.
- Opções:
  - A (recomendada): quando houver rascunho, o Início mostra uma linha na abertura ("Você tem um rascunho: continuar"), que leva direto a ele ou à lista.
  - B: um cartão "Seus rascunhos" entre os cartões do Início.
  - C: manter como está, só na conta.

### P7. A assinatura do rodapé precisa desse tamanho em todas as telas?

**Feito (opção A):** a assinatura do rodapé tem metade da largura nos formulários e nas telas utilitárias (rascunhos, lixeira, administração, "Sua conta", página não encontrada, sistema) e segue inteira nas outras. Capturas: p07-rodape-metade-rascunhos--390.jpg, p07-rodape-metade-rascunhos--1280.jpg, p07-rodape-metade-rascunhos--1920.jpg, p07-rodape-inteiro-memoria--1920.jpg.

**ajuste**

- Contexto: a assinatura "MEMÓRIAS" e os sobrenomes, na largura inteira, é a marca do site e foi aprovada.
- O que vi: o rodapé mede 290 px em 390 px, 637 px em 1280 px (71% da altura da tela) e 847 px em 1920 px (78%). Vale para todas as telas, inclusive formulários, rascunhos e lixeira, que a tabela "Uma ideia forte por tela" quer silenciosas. No Explorar, a mesma assinatura já abre a página no alto.
- Opções:
  - A (recomendada): inteira nas telas de leitura (Início, memória, pessoa, capítulo) e pela metade da largura nos formulários e nas telas utilitárias.
  - B: manter inteira em todas.
  - C: metade da largura em todas, deixando a inteira só para o alto do Explorar.
- Captura: inicio-esqueleto-rodape--1920.jpg

### P8. Quem a pessoa deve avisar quando o acesso ou o espaço falha?

**Feito (opção A):** os dois recados dizem "Avise o Gui, a Giovanna ou o Magno", e `docs/decisoes.md` acompanha. Capturas: nenhuma, é só texto.

**detalhe**

- Contexto: o Magno é administrador desde 16/11/2026. Nesta rodada, os recados de permissão passaram a dizer "os administradores" (era o defeito conhecido da API de tipos, e havia mais dois iguais, no espelho e na cópia).
- O que vi: dois recados continuam com nomes, porque dizem quem procurar, e `docs/decisoes.md` registra o texto assim: "Avise o Gui ou a Giovanna para liberarem seu acesso." (quem entra sem estar ligado a ninguém) e "Avise o Gui ou a Giovanna." (quando o espaço dos áudios acaba).
- Opções:
  - A (recomendada): incluir o Magno nos dois ("Avise o Gui, a Giovanna ou o Magno").
  - B: manter como está, com os dois nomes que a família procura primeiro.

### P9. O menu do celular deve fechar com Esc e com o toque fora?

**Feito (opção A):** um script pequeno fecha o menu com Esc (o foco volta ao "Menu") e com o toque fora; sem script, continua como era. Capturas: p09-menu-aberto--390.jpg.

**detalhe**

- Contexto: o menu é uma sanfona sem script, que empurra a página. Aprovado.
- O que vi: aberto, ele empurra a página 464 px. Esc não fecha e tocar fora não fecha: só o "Menu" de novo. Quem abre sem querer fica com o conteúdo lá embaixo.
- Opções:
  - A (recomendada): um script pequeno fecha com Esc e ao tocar fora. Sem script, continua como hoje.
  - B: manter como está.

### P10. Que item acende em "Nova memória", no relato e na carta?

**Feito (opção A):** `/nova` acende "Nova memória" (no topo do computador e na barra do celular) e o relato acende "Explorar"; a carta segue em "Início". Capturas: p10-nova-acesa--390.jpg, p10-nova-acesa--1280.jpg.

**detalhe**

- Contexto: o sinal de onde a pessoa está é o ponto de 6 px na cor viva e o texto mais escuro, no item do menu.
- O que vi: em `/nova` nenhum item acende, embora "Nova memória" esteja no menu. Em `/memorias/<id>/relato` nenhum acende, e a página da memória acende "Explorar". Em `/carta` acende "Início". No celular, com o menu fechado, não há sinal nenhum de onde se está.
- Opções:
  - A (recomendada): `/nova` acende "Nova memória" e o relato acende "Explorar", como a memória. A carta segue em "Início".
  - B: manter como está.

### P11. `/temas` deve levar aos capítulos?

**Feito (opção A):** `/temas` leva a `/capitulos#temas`. Capturas: nenhuma, é só o caminho.

**detalhe**

- Contexto: os temas não têm item no menu. Aparecem no fim da lista de capítulos, como ações quietas.
- O que vi: `/temas` responde 404, e `/temas/<id>` existe. Quem apaga o fim do endereço de um tema cai no erro. No menu, nada sugere que os temas ficam dentro de "Capítulos".
- Opções:
  - A (recomendada): `/temas` leva a `/capitulos`, no ponto onde os temas começam.
  - B: além disso, o item do menu passa a dizer "Capítulos e temas".
  - C: manter como está.

### P12. No celular, "Sua conta" precisa estar na barra e no menu?

**Feito (opção A):** mantido como está. Capturas: p02-barra--390.jpg.

**detalhe**

- Contexto: `docs/decisoes.md` diz que a conta abre pelo retrato ou pelo nome, no topo. No celular a barra mostra só o retrato, e o menu repete "Sua conta".
- O que vi: o retrato de 36 px, sem nome, é uma foto pequena ao lado de "Menu". Nada diz que é um botão nem para onde leva. O item "Sua conta" do menu é o que de fato explica.
- Opções:
  - A (recomendada): manter os dois. A repetição ajuda, e o tamanho do toque do retrato foi corrigido nesta rodada.
  - B: tirar o retrato da barra e pôr o retrato com o nome dentro do menu, no item "Sua conta".

## Início

### P13. Num dia sem novidade, o que a primeira tela mostra no computador?

**Feito (opção A):** sem novidade, no computador, a mesa da direita recebe "Neste dia, em outros anos" como fotos ou, sem ele, a memória para contar, e o envelope só aparece quando chegou algo. Capturas: p13-sem-novidade-neste-dia-na-mesa--390.jpg, p13-sem-novidade-neste-dia-na-mesa--1280.jpg, p13-sem-novidade-neste-dia-na-mesa--1920.jpg, p13-sem-novidade-contar-na-mesa--1280.jpg.

**muda a experiência**

- Contexto: a ideia forte do Início é "o que entrou de novo". A composição do computador põe a abertura em cinco colunas à esquerda e a mesa das novidades nas sete da direita. "Que bom que você chegou." foi aprovado como frase.
- O que vi: sem novidade, que vai ser o estado da maioria das visitas, as sete colunas da direita ficam vazias. Em 1280 px a abertura vai até 717 px e o primeiro cartão começa em 874 px, abaixo da dobra de 900. Em 1920 px, 859 e 1035 px. A primeira tela inteira é "Oi, Gui.", "Nada de novo desde a sua última visita." e o envelope com fotos saindo, que diz o contrário da frase. Vale igual para "Que bom que você chegou.". No celular a abertura termina em 395 px e o problema não existe.
- Opções:
  - A (recomendada): sem novidade, a mesa da direita recebe "Neste dia, em outros anos" (ou, sem ele, a memória para contar), como fotos tiradas da caixa. O envelope fica só para quando chegou algo.
  - B: sem novidade, a abertura encolhe (sem envelope) e os cartões sobem para a primeira tela.
  - C: manter como está.
- Captura: inicio-painel-sem-novidade--1280.jpg, inicio-painel-sem-novidade--1920.jpg, inicio-painel-chegou--1280.jpg

### P14. Na primeira visita, a carta fica sozinha na tela ou com o painel embaixo?

**Feito (opção A):** na primeira visita a tela é só a carta, e "Abrir o acervo" leva ao Início normal, com a carta no link discreto. Capturas: p14-primeira-visita-so-a-carta--390.jpg, p14-primeira-visita-so-a-carta--1280.jpg.

**muda a experiência**

- Contexto: a ideia forte da primeira visita é a carta. Hoje o painel inteiro (neste dia, aniversários, você no acervo, a memória para contar, o caminho) vem logo abaixo dela, e "Abrir o acervo" leva ao Explorar. O texto do botão foi aprovado.
- O que vi: em 390 px a carta termina em 1.336 px e a página tem 3.693 px. O botão cheio "Abrir o acervo" fica em 898 px e tira a pessoa da página antes de ela ver o que está embaixo. A tela tem dois botões cheios ("Abrir o acervo" e "Escrever meu relato"). A carta diz "a sua versão delas ainda está faltando", e o cartão que responde a isso está 1.900 px abaixo.
- Opções:
  - A (recomendada): na primeira visita, só a carta. "Abrir o acervo" leva ao Início normal, com a saudação e os cartões, e a carta vira o link discreto.
  - B: a carta e o painel juntos, como hoje, mas o botão da carta desce para o painel ("Ver o que tem para você") em vez de sair para o Explorar.
  - C: manter como está.
- Captura: inicio-painel-carta-fim--390.jpg

### P15. A carta deve voltar ao alto toda vez que a pessoa toca em "Início" na primeira visita?

**Feito (opção A):** a carta aparece no alto uma vez; na volta ao Início vem o painel, com o link "Carta de Natal" (regra em `chegarAoPainel`, teste ajustado). Capturas: p15-volta-ao-inicio-depois-da-carta--390.jpg, p15-volta-ao-inicio-depois-da-carta--1280.jpg.

**muda a experiência**

- Contexto: regra de `src/lib/painel.ts`: a carta fica no alto durante toda a visita em que apareceu, e a visita só termina depois de duas horas sem abrir o Início.
- O que vi: como Elizete, li a carta, fui ao Explorar e voltei ao Início: a carta estava no alto de novo. Na noite de Natal, cada volta ao Início repete a carta inteira, com o painel 1.336 px abaixo no celular, e a saudação "Oi, Elizete." do painel nunca aparece nesse dia.
- Opções:
  - A (recomendada): a carta aparece no alto uma vez. Na volta ao Início, o painel normal, com o link "Carta de Natal".
  - B: na volta, a carta aparece recolhida (o carimbo, "Oi, Elizete," e "Ler a carta de novo"), com o painel logo abaixo.
  - C: manter como está.

### P16. "Você estava lá e ainda não contou" deve subir na página?

**Feito (opção A):** o cartão de contar vem logo depois das novidades (ou da abertura), antes de "Neste dia", e é a primeira coluna no computador. Capturas: p16-contar-antes-de-neste-dia--390.jpg, p19-cartoes-tres--1280.jpg.

**muda a experiência**

- Contexto: `docs/visual.md` põe aniversários e atalhos em segundo plano. O cartão de contar é o único com botão cheio no Início, e é o que faz o acervo crescer.
- O que vi: a ordem é novidades, "Neste dia", aniversários, "Você no acervo", contar. Em 390 px o cartão de contar começa em 2.230 px sem novidades e em 3.020 px com novidades, da terceira tela em diante. No computador é a terceira coluna da segunda fileira.
- Opções:
  - A (recomendada): contar vem logo depois das novidades (ou da abertura, sem novidade), antes de "Neste dia". No computador, primeira coluna.
  - B: contar troca de lugar só com aniversários.
  - C: manter como está.
- Captura: inicio-painel-contar-e-caminho--390.jpg

### P17. Com uma memória e um relato novos, onde fica o relato no computador?

**Feito (opção A):** o relato tem sempre a fileira dele, embaixo das fotos, com sete colunas da mesa. Capturas: p17-uma-memoria-e-um-relato--1280.jpg.

**ajuste**

- Contexto: `painel.css` tem uma regra para o relato ocupar a segunda fileira da mesa, em sete colunas (`.novidade--relato`, linhas 493-497). A captura aprovada do painel mostra o caso de uma memória e um relato.
- O que vi: nesse caso o relato é o segundo item, e a regra `.novidade:nth-child(2)` (linhas 488-492) vence a do relato. Em 1280 px o bilhete cai no lugar da segunda foto, com 241 px de largura e 473 px de altura. O rótulo "Relato novo · em O Chico chega" quebra em três linhas (cabe em 166 px), o trecho em três e a assinatura "Lucas Magno" em duas. Com duas memórias e um relato, a regra do relato vale e o bilhete tem 344 px.
- Opções:
  - A (recomendada): o relato sempre na fileira própria, com as sete colunas, como a regra já pretendia.
  - B: manter o relato ao lado da foto, mas com seis colunas no lugar de cinco.
  - C: manter como está.
- Captura: inicio-painel-mesa-relato-estreito--1280.jpg

### P18. Com muitas novidades, o que ocupa a esquerda da mesa no computador?

**Feito (opção A):** quando há "E mais N", o relato e essa linha descem para uma fileira de largura inteira, embaixo da abertura e das duas fotos. Capturas: p18-muitas-novidades--1280.jpg, p18-muitas-novidades--1920.jpg.

**ajuste**

- Contexto: a abertura fica em cinco colunas à esquerda e a mesa desce à direita.
- O que vi: com duas memórias, um relato e "E mais 34", a abertura termina em 717 px e a mesa em 1.294 px, em 1280 px. Em 1920 px, 859 e 1.425 px. Sobra uma coluna vazia de cerca de 570 px de altura à esquerda, embaixo do envelope, e "E mais 34" fica perdido no meio da tela.
- Opções:
  - A (recomendada): o relato e "E mais N" passam para uma fileira de largura inteira, embaixo da abertura e das duas fotos.
  - B: "E mais N" sobe para a abertura, ao lado da frase do resumo ("Entraram 35 memórias… Ver todas").
  - C: manter como está.
- Captura: inicio-painel-novidades-e-mais-n--1280.jpg

### P19. Os cartões devem se ajustar ao que têm dentro?

**Feito (opção A):** com dois cartões, duas colunas; "Neste dia" com uma ou duas memórias é um cartão da fileira, e com três ou quatro é uma faixa ao lado do cartão de contar. Capturas: p19-cartoes-dois--1280.jpg, p19-cartoes-tres--1280.jpg, p19-cartoes-faixa-ao-lado-de-contar--1280.jpg, p19-cartoes-faixa-ao-lado-de-contar--1920.jpg.

**ajuste**

- Contexto: no computador, os cartões ficam em três colunas da mesma altura, e "Neste dia" numa faixa de quatro colunas.
- O que vi: em 1280 px, com dois aniversários, o cartão tem 193 px vazios embaixo, e o de contar, 174 px. Sem aniversários (Gui, em 14 de agosto), ficam dois cartões e um buraco de 377 px na terceira coluna. "Neste dia" com uma memória só ocupa um quarto da faixa, e o resto do cartão branco fica vazio.
- Opções:
  - A (recomendada): com dois cartões, duas colunas. Com uma ou duas memórias em "Neste dia", ele vira um cartão da fileira, ao lado dos outros.
  - B: só acertar o caso dos dois cartões.
  - C: manter como está.
- Captura: inicio-painel-cartoes--1280.jpg, inicio-painel-cartoes-dois--1280.jpg

### P20. "Ver a linha do tempo inteira" precisa ser do tamanho do título da página?

**Feito (opção A):** o convite desceu para `t-2`, e a saudação é o único título grande. Capturas: p20-convite-decadas-e-teste--390.jpg, p20-convite-decadas-e-teste--1280.jpg.

**ajuste**

- Contexto: o convite do fim da página usa `t-1`, o mesmo tamanho de "Oi, Gui.".
- O que vi: em 1280 px os dois têm 91 px de letra. O convite quebra em duas linhas e o link mede 556 por 200 px. É o maior elemento da página, maior que a saudação, e fica no fim. Em 390 px, 45 px de letra nos dois.
- Opções:
  - A (recomendada): o convite desce para `t-2`. A saudação fica sendo o único título grande.
  - B: manter como está, como fecho da página.

### P21. O botão "Escrever meu relato" pode quebrar em duas linhas?

**Feito (opção A):** no cartão estreito (390 e 1280 px), o botão ocupa a largura do cartão, embaixo da foto e do título, numa linha só. Capturas: p16-contar-antes-de-neste-dia--390.jpg, p19-cartoes-tres--1280.jpg.

**ajuste**

- Contexto: o cartão de contar põe a foto e o texto lado a lado, em 2 para 3 no celular e 5 para 7 no computador.
- O que vi: o botão tem 171 px de largura em 390 px e 168 px em 1280 px, e o texto quebra em "Escrever" e "meu relato", com a seta ao lado. Em 1280 px o título "Jantar de casamento" quebra em duas linhas de 34 px na mesma coluna. Em 1920 px o botão tem 260 px e cabe numa linha.
- Opções:
  - A (recomendada): em 390 e 1280 px, o botão sai da coluna e ocupa a largura do cartão, embaixo da foto e do título.
  - B: a foto diminui e a coluna do texto ganha a largura que falta.
  - C: manter como está.
- Captura: inicio-painel-contar-e-caminho--390.jpg, inicio-painel-cartoes--1280.jpg

### P22. Apelido com parentesco aparece igual para todo mundo?

**Feito (opção A):** apelido com parentesco que não é o de quem olha vira o nome, com o parentesco de quem olha embaixo (para a Elizete, "Lourdes", "sua irmã"); sem parentesco conhecido com quem olha, o apelido fica. Capturas: p22-aniversarios-nome-de-quem-olha--390.jpg.

**ajuste**

- Contexto: nos aniversários, o parentesco não se repete quando o apelido já traz ("Tia Cida" fica sem "sua tia"). O apelido é um só por pessoa.
- O que vi: como Elizete, o cartão diz "Tia Lourdes" e, embaixo, "sua irmã, faz 65 anos". O apelido é o do ponto de vista do Gui. O mesmo vale para "Prima Júlia" e para "Gui adicionou" quando o apelido de quem adicionou tem parentesco.
- Opções:
  - A (recomendada): quando o apelido traz um parentesco que não é o de quem olha, o Início mostra o nome ("Lourdes") com o parentesco de quem olha embaixo.
  - B: manter o apelido sempre, como nome de família, e deixar o parentesco de quem olha embaixo.
- Captura: inicio-painel-aniversarios--390.jpg

### P23. As décadas do fim da página parecem anos?

**Feito (opção A):** as décadas dizem "Anos 2020", "Anos 90", como no filtro do Explorar. Capturas: p20-convite-decadas-e-teste--390.jpg.

**detalhe**

- Contexto: o convite para a linha do tempo termina com os atalhos "2020 2010 2000 1990 1960 1950". No Explorar, o filtro diz "Anos 2020" e a faixa de décadas diz "2020".
- O que vi: soltos, em serifa de 24 px, os números se leem como anos: "2020" parece o ano de 2020. Os links funcionam (`/explorar#decada-1990` desce até a década).
- Opções:
  - A (recomendada): "Anos 2020", "Anos 2010", como no filtro do Explorar.
  - B: manter, com um rótulo antes ("Ir para a década").
  - C: manter como está.
- Captura: inicio-painel-contar-e-caminho--390.jpg

### P24. "Relato novo · em O Chico chega" se lê bem?

**Feito (opção A):** o rótulo diz só "Relato novo", e o título da memória vem numa linha própria, em serifa. Capturas: p24-relato-novo-e-mais-n--390.jpg.

**detalhe**

- Contexto: o rótulo da novidade vai em mono, caixa alta.
- O que vi: fica "RELATO NOVO · EM O CHICO CHEGA" e "RELATO NOVO · EM A CHEGADA DO GUI". Em caixa alta não dá para ver onde começa o título, e "em o", "em a" soa errado.
- Opções:
  - A (recomendada): o rótulo diz só "Relato novo" e o título da memória vem numa linha própria, em serifa, como nas memórias novas.
  - B: "Relato novo · O Chico chega", sem o "em".
  - C: manter como está.
- Captura: inicio-painel-e-mais-n--390.jpg

### P25. A data de hoje precisa estar no alto do Início?

**Feito (opção A):** a data de hoje saiu do alto, e a última visita leva o ano quando não é o corrente ("em 1 jan de 2020"). Capturas: p25-abertura-rascunho-e-ultima-visita--390.jpg.

**detalhe**

- Contexto: acima da saudação vêm duas linhas em mono: "Só você vê esta página" (pedido do Gui) e a data de hoje.
- O que vi: "24 dez 2026" não leva a nada e não explica nada na tela. Em 390 px o rótulo quebra em três linhas ao lado do envelope. Logo abaixo, "Sua última visita foi em 17 nov." vem sem ano, o que confunde quando a visita anterior é de outro ano (vi "1 jan." para uma visita de 2020).
- Opções:
  - A (recomendada): tirar a data de hoje e pôr o ano na última visita quando não for o ano corrente.
  - B: manter a data e só acertar o ano da última visita.
  - C: manter como está.

### P26. A foto do cartão de contar deve ser link?

**Feito (opção A):** a foto do cartão de contar leva à memória, como o título. Capturas: p16-contar-antes-de-neste-dia--390.jpg.

**detalhe**

- Contexto: nas novidades e em "Neste dia", a foto leva à memória. No cartão de contar, só o título leva.
- O que vi: a foto revelada do cartão é igual às outras e não responde ao toque. O título ao lado leva à memória e o botão leva ao relato.
- Opções:
  - A (recomendada): a foto leva à memória, como o título.
  - B: manter como está.

### P27. "Aniversários dos próximos 30 dias" pode ser mais curto?

**Feito (opção A):** o título do cartão é "Próximos aniversários". Capturas: p22-aniversarios-nome-de-quem-olha--390.jpg.

**detalhe**

- Contexto: é o título em mono do cartão.
- O que vi: em 1280 px quebra em duas linhas ao lado do ícone. É o único título de cartão que fala como relatório.
- Opções:
  - A (recomendada): "Próximos aniversários".
  - B: manter como está.

### P28. O botão de teste "Voltar Fulano à primeira visita" deve ficar separado?

**Feito (opção A):** o botão de teste fica depois de um espaço e de um fio, com o rótulo "Teste" em mono. Capturas: p20-convite-decadas-e-teste--390.jpg, p20-convite-decadas-e-teste--1280.jpg.

**detalhe**

- Contexto: só existe fora da produção, no fim do Início.
- O que vi: começa a 0 px das décadas (em 390 px, logo embaixo de "1960 1950"; em 1280 px, na linha seguinte), no mesmo alinhamento, e parece parte do convite para a linha do tempo. A Giovanna usa a homologação e vai ver.
- Opções:
  - A (recomendada): separar com espaço e um fio, com o rótulo "Teste" em mono.
  - B: levar para dentro da faixa de teste do alto.
  - C: manter como está.

## Carta de Natal

### P29. As fotos da carta devem levar às memórias?

**Feito (opção A):** cada foto da carta leva à memória dela, com nome para o leitor de tela, e a da frente é a primeira na ordem do teclado. Capturas: p29-carta-fotos-e-acoes--390.jpg, p29-carta-fotos-e-acoes--1280.jpg.

**ajuste**

- Contexto: as três fotos que vêm com a carta são as memórias mais recentes em que a pessoa aparece. Hoje são enfeite, escondidas do leitor de tela.
- O que vi: são as mesmas fotos reveladas que, no resto do site, abrem a memória. Aqui não respondem ao toque. Em 390 px a legenda da primeira fica cortada pela foto do meio ("BELO HORIZONTE (2"). São as fotos da própria pessoa, e é a primeira coisa que ela vai querer tocar.
- Opções:
  - A (recomendada): cada foto leva à memória dela, e a da frente ganha o foco primeiro.
  - B: manter como enfeite, mas sem legenda nas duas de trás.
  - C: manter como está.
- Captura: inicio-painel-carta-fim--390.jpg

### P30. Em `/carta`, o administrador lê "Escrever a carta" com a carta já escrita?

**Feito (opção A):** com a carta escrita, o link dos administradores diz "Editar a carta"; sem carta, "Escrever a carta". Capturas: p29-carta-fotos-e-acoes--390.jpg.

**detalhe**

- Contexto: abaixo do botão, os administradores têm um link para `/admin/carta`.
- O que vi: o link diz "Escrever a carta" tanto na tela vazia quanto embaixo da carta pronta e assinada.
- Opções:
  - A (recomendada): "Editar a carta" quando ela existe, "Escrever a carta" quando não existe.
  - B: manter como está.

### P31. "Voltar ao início" deve ser botão cheio com seta para a frente?

**Feito (opção A):** em `/carta`, "Voltar ao início" é uma ação sublinhada, sem seta. Capturas: p29-carta-fotos-e-acoes--390.jpg, p29-carta-fotos-e-acoes--1280.jpg.

**detalhe**

- Contexto: em `/carta`, a ação do fim é o botão cheio "Voltar ao início", com a seta do botão apontando para a direita.
- O que vi: a palavra diz voltar e a seta aponta para a frente. No painel, o mesmo lugar tem "Abrir o acervo", onde a seta faz sentido.
- Opções:
  - A (recomendada): em `/carta`, "Voltar ao início" vira ação sublinhada, sem seta.
  - B: manter o botão cheio e tirar a seta.
  - C: manter como está.

## Explorar: o alto da página e os controles

### P32. A primeira tela do Explorar pode mostrar uma foto?

**Feito (opções A e B):** no celular, as opções de "Forma de ver" e de "Família" ficam numa linha só que rola para o lado e os respiros do alto encolheram; em 1280 e 1920 px a assinatura do Explorar tem dois terços do tamanho, e o primeiro ano vem logo abaixo da faixa de décadas. A primeira foto começa em y = 732 em 1280 × 900 e em y = 834 em 1920 × 1080. No celular (390 × 844) ela começa em y = 810 com a faixa de teste, e só a borda de cima aparece. Capturas: p32-primeira-tela--390.jpg, p32-primeira-tela--1280.jpg, p32-primeira-tela--1920.jpg.

**muda a experiência**

- Contexto: a ideia da tela é "a assinatura grande, e logo o ano mais recente abrindo a lista", com menu e filtros pequenos.
- O que vi: nas três larguras, a primeira tela não tem foto nenhuma. A primeira foto começa em y = 1018 no celular (tela de 844), em y = 922 em 1280 × 900 e em y = 1085 em 1920 × 1080. No celular, a assinatura e os controles ocupam a tela inteira (os controles vão de y = 319 a 692) e o ano aparece cortado no pé. Em 1920 px a assinatura sozinha ocupa uns 420 px de altura.
- Opções:
  - A (recomendada): manter a assinatura e encolher os controles no celular: "Forma de ver" numa linha só que rola para o lado ou em três opções mais um "mais", e "Família" numa linha. A foto sobe cerca de 130 px e entra na primeira tela.
  - B: assinatura menor só no Explorar em 1280 e 1920 px (cerca de dois terços), para o ano e a primeira foto caberem.
  - C: manter como está.
- Captura: `explorar-linha-primeira-tela--390.jpg`, `explorar-linha-primeira-tela--1280.jpg`, `explorar-linha-primeira-tela--1920.jpg`

### P33. No celular, quem marca um filtro fica sabendo que ele valeu?

**Feito (opção A):** com script, o fim do formulário tem o botão "Ver as 3 memórias" ("Ver a memória" com uma), que fecha o painel, leva ao começo do resultado e muda a cada escolha; sem resultado, diz "Nenhuma memória passa nesses filtros.". Capturas: p33-ver-as-memorias--390.jpg, p33-ver-as-memorias--1280.jpg, p33-depois-de-ver--390.jpg.

**muda a experiência**

- Contexto: cada escolha dos filtros vale na hora e o painel continua aberto (decisão do Gui). "Mostrar memórias" só existe sem script.
- O que vi: em 390 px o formulário aberto tem 1166 px de altura. Ao marcar "Viagem", a caixa fica onde estava (certo), mas o resultado está mais de uma tela abaixo, a conta "3 memórias · de 1996 a 2013" está lá no alto, fora da tela, e a única coisa que muda à vista é a própria caixa. Para ver o resultado é preciso rolar o formulário inteiro ou subir e fechar o painel. Em 1280 px o formulário tem 786 px e o resultado também fica fora da tela.
- Opções:
  - A (recomendada): no fim do formulário, uma linha com a conta e uma ação que fecha o painel e leva ao resultado: "Ver as 3 memórias". Ela muda a cada escolha.
  - B: a conta ("3 memórias") ao lado do resumo dos filtros, que fica logo acima do formulário, sem ação nova.
  - C: manter como está.
- Captura: `explorar-filtros-abertos--390.jpg`

### P34. "Modo TV" e "Me mostre uma memória" são formas de ver como as outras três?

**Feito (opção A):** "Forma de ver" ficou com as três formas que trocam no lugar, e "Modo TV" e "Me mostre uma memória" são duas ações ao lado, com seta. Capturas: p32-primeira-tela--1280.jpg, p32-primeira-tela--390.jpg.

**ajuste**

- Contexto: "Forma de ver" tem cinco opções com o mesmo desenho. O nome do controle foi aprovado.
- O que vi: "Linha do tempo", "Mural de fotos" e "Lista" trocam o conteúdo no lugar e mantêm os controles. "Modo TV" leva a uma tela sem menu e sem controles, e "Me mostre uma memória" sorteia e leva a outra página: as duas nunca ficam marcadas como a opção em uso, porque saem dali. No celular as cinco ocupam três linhas (132 px).
- Opções:
  - A (recomendada): "Forma de ver" fica com as três que trocam no lugar. "Modo TV" e "Me mostre uma memória" viram duas ações ao lado, com seta, por serem saídas.
  - B: manter as cinco juntas e só dar uma seta às duas que saem.
  - C: manter como está.

### P35. "Década" aparece duas vezes, com dois efeitos: fica assim?

**Feito (opção A):** a faixa se chama "Ir para a década" nas três larguras, e o filtro ficou só com "Do ano" e "Até o ano". O endereço antigo com a década continua valendo e aparece nos dois campos. Capturas: p32-primeira-tela--1280.jpg, p36-filtros-em-colunas--390.jpg.

**ajuste**

- Contexto: a faixa de décadas pula para a década na página. Em "Filtros", "Período" tem "Década", que tira as outras décadas, e ainda "Do ano" e "Até o ano".
- O que vi: em 1280 e 1920 px a faixa se chama "Década" e o campo do filtro, logo acima dela com o painel aberto, também se chama "Década". No celular a faixa se chama "Ir para a década", que deixa claro. O filtro tem dois jeitos de dizer o período (a década ou o intervalo de anos).
- Opções:
  - A (recomendada): a faixa se chama "Ir para a década" nas três larguras, e o filtro fica só com "Do ano" e "Até o ano".
  - B: só renomear a faixa no computador.
  - C: manter como está.

### P36. No celular, as caixas de "Tipo de momento" podem ficar em colunas?

**Feito (opção A):** no celular, as caixas de marcar ficam em duas colunas fixas. Capturas: p36-filtros-em-colunas--390.jpg.

**ajuste**

- Contexto: os filtros são caixas de marcar que quebram linha conforme o tamanho do nome.
- O que vi: em 390 px ficam duas por linha, e a segunda caixa de cada linha começa num x diferente: 193, 189, 165, 151 e 171. A ordem de "Ordem" faz o mesmo ("Mais contadas" em x = 214). A leitura vira um zigue-zague, num sistema que pede tudo alinhado à esquerda.
- Opções:
  - A (recomendada): duas colunas fixas no celular, com a segunda sempre no mesmo x.
  - B: uma opção por linha (o formulário cresce uns 250 px).
  - C: manter como está.
- Captura: `explorar-filtros-abertos--390.jpg`

### P37. A etiqueta da família pode parar de mexer de lugar quando é marcada?

**Feito (opção A):** toda opção reserva a largura do negrito, e nenhuma muda de lugar ao ser marcada (medido em 390, 1280 e 1920 px). Capturas: p37-familia-marcada--1280.jpg.

**detalhe**

- Contexto: a etiqueta marcada fica em negrito, e a que perde a marca volta ao peso normal.
- O que vi: ao marcar "Bayara" em 1280 px, "Família completa" encolhe de 175 para 169 px e as outras andam: "Bayara" vai de x = 400 para 394, bem embaixo do mouse. No celular, de 188 para 183.
- Opções:
  - A (recomendada): reservar a largura do negrito em toda etiqueta, para nenhuma mudar de lugar.
  - B: manter como está.
- Captura: `explorar-familia-marcada--1280.jpg`

### P38. Sem resultado, a linha da conta deve dizer "Nenhuma memória"?

**Feito (opção A):** sem resultado, a conta diz "Nenhuma memória". Capturas: p38-nenhuma-memoria--390.jpg.

**detalhe**

- Contexto: abaixo da assinatura fica a conta ("46 memórias · de 1958 a 2026"), que também é lida pelo leitor de tela a cada troca.
- O que vi: com filtro sem resultado, a conta vira "As memórias da nossa família", e é isso que o leitor de tela anuncia. A frase "Nenhuma memória passa nesses filtros." fica mais abaixo e não é anunciada.
- Opções:
  - A (recomendada): a conta diz "Nenhuma memória" nesse caso.
  - B: manter como está.

### P39. Ao sair do modo TV, a pessoa volta para onde estava?

**Feito (opção A):** "Sair do modo TV", o Esc e "Voltar ao Explorar" levam à linha do tempo, na memória que estava na tela. Capturas: p39-volta-do-modo-tv--390.jpg, p39-volta-do-modo-tv--1280.jpg.

**detalhe**

- Contexto: "Sair do modo TV" e o Esc levam ao Explorar com os mesmos filtros.
- O que vi: a volta é sempre para a linha do tempo, no alto da página, mesmo para quem entrou pelo mural ou pela lista e mesmo depois de passar por trinta memórias. "Voltar ao Explorar", no ao acaso, faz o mesmo.
- Opções:
  - A (recomendada): voltar à linha do tempo já na memória que estava na tela (a âncora dela), para continuar dali.
  - B: voltar à forma de ver de onde a pessoa veio.
  - C: manter como está.

## Explorar: linha do tempo

### P40. A legenda da foto na linha do tempo pode ser maior que 9 px?

**Feito (opção A):** a legenda da foto tem piso de 11 px. Na linha do tempo, "lugar (ano)" continua numa linha; na foto pequena da lista, em 1280 px, a legenda mais longa ocupa duas linhas, como já ocupava com 9 px. Capturas: p39-volta-do-modo-tv--390.jpg, p41-fecho--1280.jpg.

**ajuste**

- Contexto: toda foto revelada leva "lugar (ano)" na margem, em mono maiúscula. O tamanho acompanha a largura da foto, com piso de 9 px.
- O que vi: na linha do tempo a legenda mede 9 px em 390 px e 9,1 px em 1280 px ("BELO HORIZONTE (2026)"). Na foto da lista, ao passar o mouse, também 9 px. Na parede da página da memória ela tem 11 px no celular e 12,4 px no computador. É o menor texto do site, numa tela pensada para as pessoas mais velhas.
- Opções:
  - A (recomendada): piso de 11 px na legenda (`clamp` em `.polaroid__legenda`, `src/visual/pecas.css`, linha 70), conferindo se "lugar (ano)" continua cabendo numa linha.
  - B: no celular, tirar a legenda da linha do tempo, já que a data está logo acima e o lugar pode ir para a linha de baixo do título.
  - C: manter como está.

### P41. No fim da linha do tempo, a página pode ter um fecho?

**Feito (opção A):** depois da última memória, o fecho "Aqui começa o acervo." com "Nova memória" e "Voltar ao começo". A frase só aparece quando a última memória da tela é a mais antiga do acervo; com filtro ou em outra ordem ficam só as duas ações. Capturas: p41-fecho--390.jpg, p41-fecho--1280.jpg, p41-fecho--1920.jpg.

**detalhe**

- Contexto: a linha vai da memória mais recente à mais antiga.
- O que vi: depois da última memória (1958) vem o rodapé, sem nada. No celular são 33 mil px de rolagem até ali, e a volta é pela faixa de décadas ou rolando tudo de novo.
- Opções:
  - A (recomendada): um fecho curto: "Aqui começa o acervo." com "Nova memória" e "Voltar ao começo".
  - B: manter como está.
- Captura: `explorar-linha-fim--390.jpg`

### P42. Na tela grande e no toque, dá para saber de qual capítulo é cada trilho?

**Feito (opção A):** mantido como está.

**detalhe**

- Contexto: os trilhos foram aprovados, inclusive o trecho tracejado onde a memória é de fora. No computador, o nome do capítulo aparece ao passar o mouse pelo trilho.
- O que vi: em 1920 px, entre 2006 e 2005, há cinco linhas paralelas (verde, vermelha tracejada, lilás tracejada, azul e a do tempo) e um só nome na tela ("A infância da Giovanna", no sinal da memória). Na TV e no toque não há mouse para perguntar ao trilho.
- Opções:
  - A (recomendada): manter como está. O sinal em cada memória e o começo e o fim de cada capítulo já dão o nome, e mais texto pesaria.
  - B: repetir o nome do capítulo, pequeno, junto ao trilho no cabeçalho de cada década.
- Captura: `explorar-linha-trilhos--1920.jpg`

## Explorar: lista

### P43. Lista em 1280 px: o lugar fica embaixo do título? (PR #39, pergunta 3)

**Feito (opção A):** mantido como está.

**ajuste**

- Contexto: com a margem da foto à direita, as sete colunas não cabem em 1280 px sem cortar "Belo Horizonte" e o nome do capítulo.
- O que vi: em 1280 px o lugar fica embaixo do título, menor. Em 1920 px ele tem a coluna dele. A foto aparece numa margem reservada, sem cobrir o texto. Visto nesta rodada: em 1280 px a coluna de nomes corta com reticências ("Elizete, Giovanna, G… +1") enquanto sobram cerca de 180 px vazios à direita, reservados para a foto do mouse.
- Opções:
  - A (recomendada): lugar embaixo do título em 1280 px, como está.
  - B: sete colunas também em 1280 px, com a foto por cima da coluna do capítulo.
  - C: sem a margem da foto: a foto acompanha o cursor, como na agenda da @bsurda (pede script).

### P44. Na lista, o ano precisa ser do tamanho de capa?

**Feito (opção A):** na lista, em 1280 e 1920 px, o ano tem tamanho de título de página (91 e 124 px), com a conta ao lado. A lista inteira passou de 14.760 para 12.064 px em 1280 e de 16.976 para 13.250 px em 1920. Capturas: p44-lista--1280.jpg, p44-lista--1920.jpg.

**ajuste**

- Contexto: a lista é a forma compacta, no modelo do "Já rolou" da @bsurda. O ano grande abre cada bloco.
- O que vi: em 1280 px o ano tem 189 px de letra e o cabeçalho, 168 px de altura, para blocos de duas ou três linhas de 80 px. Em 1920 px, 256 px de letra e 222 px de cabeçalho. A lista inteira mede 14.760 px em 1280 e 16.976 px em 1920, contra 9.747 px no celular: a forma compacta é a mais comprida justamente na tela grande.
- Opções:
  - A (recomendada): na lista, o ano em tamanho de título de página, com a conta ao lado, no computador e na tela grande. O ano de capa fica como marca da linha do tempo.
  - B: manter o tamanho e pôr o ano numa coluna à esquerda, parado, com as linhas ao lado (como na linha do tempo).
  - C: manter como está.
- Captura: `explorar-lista-ano--1280.jpg`

### P45. Lista: o que mostrar no lugar da data quando a memória só tem o ano? (PR #39, pergunta 2)

**Feito (opção A):** mantido como está.

**detalhe**

- Contexto: dentro do bloco do ano, a linha mostra o dia e o mês. Memória só com o ano não tem o que mostrar ali.
- O que vi: fica em branco, porque o ano já está no alto do bloco. A data aproximada diz "por volta de" e, quando o mês é conhecido, "por volta de ago".
- Opções:
  - A (recomendada): em branco, como está.
  - B: repetir o ano ("2019"), para nenhuma linha ficar sem data.
  - C: escrever "sem dia".

### P46. Lista: qual nome entra em "quem estava" e quantos capítulos? (PR #39, pergunta 4)

**Feito (opção A):** mantido como é chamada ou o primeiro nome, e o nome que começa pelo parentesco ou pelo tratamento entra com a palavra seguinte ("Vó Bela", "Prima Júlia", "Dona Fátima"). Capturas: p44-lista--390.jpg.

**detalhe**

- Contexto: a linha pede nomes curtos. O cadastro tem o nome inteiro e, às vezes, como a pessoa é chamada na família.
- O que vi: entra como a pessoa é chamada ("Vó Bela") ou, sem isso, o primeiro nome ("Lucas"). Do capítulo, entra o primeiro e "+N" para os outros. Esta pergunta tem a mesma raiz da pergunta do Início sobre apelido com parentesco ("Tia Lourdes" para quem é irmã dela): vale responder as duas juntas. Visto nesta rodada, em 390 px: aparecem "Prima" e "Primo" como nomes ("Aguilar, Prima, Primo +5") e "Vó" sozinho ("Gui, Vó"). O nome curto corta "Prima Carol" e "Vó Bela" na primeira palavra, e o que sobra deixa de dizer quem é.
- Opções:
  - A (recomendada): como é chamada, ou o primeiro nome, como está.
  - B: sempre o primeiro nome.
- Em qualquer opção, o nome de família com duas palavras ("Vó Bela", "Prima Carol") precisa entrar inteiro: hoje ele é cortado na primeira.

## Explorar: mural

### P47. Em 1920 px, o mural é para ver do sofá ou de perto?

**Feito (opção A):** mantido como está.

**detalhe**

- Contexto: no tamanho médio a tela grande mostra oito colunas. Para ver junto existe o modo TV.
- O que vi: em 1920 px o título à mão tem 18,7 px, a aba do ano 14,7 px e a data do verso 13 px. Do sofá, só as fotos se leem.
- Opções:
  - A (recomendada): manter. O mural é das fotos, e quem quer ler usa o modo TV ou escolhe "Grandes".
  - B: a partir de 100rem, "Grandes" (cinco colunas) passa a ser o tamanho de quem nunca escolheu.
- Captura: `explorar-mural--1920.jpg`

## Explorar: modo TV

### P48. No modo TV em 1920 px, os textos pequenos dão para ler do sofá?

**Feito (opção A):** no modo TV a partir de 100rem, o carimbo, quem estava e a legenda da foto principal têm 24 px, e os controles e os ajustes, 22 px. Capturas: p48-modo-tv--1920.jpg, p50-ajustes-abertos--1920.jpg.

**muda a experiência**

- Contexto: o modo TV é a tela de ver junto, parado, na sala.
- O que vi: em 1920 × 1080, o título tem 77 px e o trecho 38 px, que se leem bem. O resto é de tela de mesa: "Com Aguilar, Chico, Elizete…" 14,7 px, o carimbo com data e lugar 14,7 px, "Modo TV · 4 de 46" 14,7 px, a legenda da foto 16 px, "Ajustes" 16,4 px e as opções dele no mesmo tamanho, os controles 19,8 px. A referência usual para TV a três metros é perto de 24 px no mínimo.
- Opções:
  - A (recomendada): no modo TV a partir de 100rem, piso de 24 px para o que se lê (carimbo, quem estava, legenda) e de 22 px para controles e ajustes. Título e trecho ficam.
  - B: aumentar só o carimbo e "quem estava", que são conteúdo, e deixar controles como estão.
  - C: manter como está, e conferir na TV de verdade antes de decidir.
- Captura: `explorar-tv-texto-coberto--1920.jpg`

### P49. No celular, o modo TV pode dizer qual é a memória antes dos controles?

**Feito (opção A):** no celular, o carimbo e o título vêm antes das fotos, e o trecho depois dos controles. Vale também no "ao acaso", que usa a mesma tela. Capturas: p48-modo-tv--390.jpg, p49-ao-acaso--390.jpg.

**ajuste**

- Contexto: no celular as outras fotos ficam atrás da principal e os controles vêm logo abaixo.
- O que vi: em 390 × 844 a ordem é fotos, "Anterior", "Próxima", "Passar sozinho", "Ajustes", e só então o carimbo e o título, que começa em y = 740. O trecho fica cortado no pé da tela. Com "Ajustes" aberto o título desce para fora da tela. Quem passa as memórias pelo botão vê a foto mudar sem ver o nome.
- Opções:
  - A (recomendada): no celular, carimbo e título acima das fotos, e o trecho depois dos controles.
  - B: manter a ordem e encolher a foto para o título caber na primeira tela.
  - C: manter como está, porque o modo é da tela grande.
- Captura: `explorar-tv-celular--390.jpg`

### P50. "Ajustes" aberto pode caber na tela também em 1280 × 900?

**Feito (opção A):** no computador, as três partes de "Ajustes" abrem lado a lado, numa faixa abaixo da cena. Com "Ajustes" aberto a página cabe em 1280 × 900 e em 1920 × 1080; em 1280 × 720 ela tem 818 px. Capturas: p50-ajustes-abertos--1280.jpg, p50-ajustes-abertos--1920.jpg.

**detalhe**

- Contexto: já está anotado que em 1280 × 720 "Ajustes" fica no pé e, aberto, pede rolagem.
- O que vi: acontece também em 1280 × 900: com "Ajustes" aberto a página passa a ter 988 px e "Animação" fica abaixo da dobra. Em 1280 × 720, mesmo fechado, a página tem de 730 a 841 px conforme a memória, e rola.
- Opções:
  - A (recomendada): as três partes de "Ajustes" lado a lado, em colunas, quando há largura (o texto ocupa 480 px e sobram colunas).
  - B: "Ajustes" abre por cima das fotos, à esquerda, sem empurrar nada.
  - C: manter como está.
- Captura: `explorar-tv-ajustes--1280.jpg`

## Página da memória

### P51. No celular, "Quem estava" pode ocupar menos, para o relato chegar antes?

**Feito (opção A):** no celular, "Quem estava" mostra seis retratos e "Ver todos os 9" abre o resto no lugar, com o foco na primeira pessoa que aparece; sem script e a partir de 40rem, todos à vista. Capturas: `p51-quem-estava--390.jpg`, `p51-quem-estava-aberto--390.jpg`, `p51-quem-estava--1280.jpg`, `p51-quem-estava--1920.jpg`.

**ajuste**

- Contexto: a ordem combinada é abertura, ficha, quem estava, relatos, fotos. Os retratos são grandes, três por linha no celular.
- O que vi: em "Natal de 2025", com nove pessoas, a lista de retratos tem 646 px de altura em 390 px. O título "Relato" só aparece em y = 1998, depois de quase duas telas e meia. Numa memória de família grande, com quinze ou vinte pessoas, seriam mais de mil px de retratos antes do primeiro relato.
- Opções:
  - A (recomendada): no celular, até seis retratos e uma ação "Ver todos os 9", que abre o resto no lugar.
  - B: retratos menores no celular, quatro por linha.
  - C: manter como está.
- Captura: `explorar-memoria-quem-estava--390.jpg`

### P52. Quando o relato inteiro já está na abertura, ele precisa aparecer de novo logo abaixo?

**Feito (opção A):** com um só relato, sem áudio, contado pela própria pessoa e que coube inteiro no trecho da abertura, a seção "Relato" não aparece e a página segue para as fotos. Capturas: `p51-quem-estava--390.jpg` (de "Quem estava" a página vai direto para "Fotos").

**ajuste**

- Contexto: a abertura traz um trecho do primeiro relato, assinado à mão. Mais abaixo, a seção "Relato" mostra os bilhetes.
- O que vi: em "Natal de 2025" o relato tem 104 letras e cabe inteiro no trecho. A pessoa lê a mesma frase, com a mesma assinatura do Gui, duas vezes na mesma página: na abertura e no único bilhete.
- Opções:
  - A (recomendada): manter a abertura. Quando há um só relato, sem áudio, e ele coube inteiro no trecho, a seção "Relato" não repete o bilhete e a página segue para as fotos e o convite.
  - B: nesses casos a abertura fica sem trecho e o bilhete é o único lugar do relato.
  - C: manter como está.

### P53. Memória sem foto: o que ocupa o lado direito da abertura em 1280 e 1920 px?

**Feito (opção A):** a partir de 62rem, a memória sem foto leva à direita o cartão do tipo de momento, o mesmo da linha do tempo; no celular nada muda. Capturas: `p53-sem-foto--390.jpg`, `p53-sem-foto--1280.jpg`, `p53-sem-foto--1920.jpg`.

**ajuste**

- Contexto: com foto, a abertura tem o texto à esquerda e a foto revelada à direita. Na linha do tempo e no mural, a memória sem foto ganha um cartão com o desenho do tipo.
- O que vi: em "Primeira noite na casa nova, só nós dois", em 1280 px, o bloco de cor tem cerca de 750 px de altura e toda a metade direita fica vazia. No celular fica bem.
- Opções:
  - A (recomendada): o mesmo cartão do tipo de momento usado na linha do tempo, à direita, no lugar da foto.
  - B: sem foto, o título usa a largura toda e o bloco fica mais baixo.
  - C: manter como está.
- Captura: `explorar-memoria-sem-foto--1280.jpg`

### P54. Quem já contou precisa do convite grande com o botão cheio?

**Feito (opção A):** quem já contou vê uma linha quieta, "Você já contou esse dia." e "Editar meu relato" como ação de texto, sem cartão e sem botão cheio; a página termina em "Antes" e "Depois". Capturas: `p54-ja-contou--390.jpg`, `p54-ja-contou--1280.jpg`, `p54-ja-contou--1920.jpg`.

**ajuste**

- Contexto: no fim da página fica o convite, com o botão principal. Para quem já escreveu, o bilhete diz "Você já contou esse dia." e o botão vira "Editar meu relato".
- O que vi: para quem já contou, a ação principal da página, em botão cheio e num cartão de 300 px de altura com a forma de cor atrás, é editar um texto que já está pronto. No alto, o atalho também diz "Editar meu relato". O convite perdeu o motivo e continua com o mesmo peso.
- Opções:
  - A (recomendada): quem já contou vê uma linha quieta ("Você já contou esse dia." e "Editar meu relato" como ação de texto), sem botão cheio. A página termina em "Antes" e "Depois".
  - B: manter o cartão e trocar o botão cheio por ação de texto.
  - C: manter como está.
- Captura: `explorar-memoria-convite-feito--1280.jpg`

### P55. Tocar fora da foto deve fechar a galeria?

**Feito (opção A):** clicar ou tocar no fundo fecha a galeria; a foto, a legenda e os controles não fecham, e o Esc e o voltar continuam valendo. Capturas: `p55-galeria--1280.jpg`, `p55-galeria--1920.jpg`.

**detalhe**

- Contexto: a regra de movimento diz "a foto que amplia ao toque e fecha ao tocar fora". A galeria fecha por "Fechar", pelo Esc e pelo voltar do aparelho.
- O que vi: a galeria ocupa a tela inteira, na cor do papel. Em 1280 px, com foto em pé, sobram 435 px vazios de cada lado, e clicar ali não faz nada. A legenda fica com 18 px nas três larguras, sem crescer em 1920 px como o resto.
- Opções:
  - A (recomendada): clicar ou tocar no fundo fecha a galeria.
  - B: manter como está.
- Captura: `explorar-memoria-galeria--1920.jpg`

### P56. "Antes" e "Depois" devem seguir de onde a pessoa veio?

**Feito (opção A):** mantido como está.

**detalhe**

- Contexto: "Antes" e "Depois" são as vizinhas no acervo inteiro que a pessoa vê.
- O que vi: quem abre a memória a partir de um filtro ("Viagem") ou de um capítulo ("Natais") encontra em "Antes" e "Depois" memórias de fora daquele recorte. A página também não tem um caminho de volta ao Explorar além do menu e do voltar do navegador (que devolve a rolagem certa).
- Opções:
  - A (recomendada): manter como está. O voltar do navegador já devolve o lugar, e guardar de onde a pessoa veio pede endereço mais comprido.
  - B: quando a memória é de um capítulo, uma terceira ligação ao lado: "Seguinte em Natais".

## Excluir memória

### P57. "Nada é apagado de vez" precisa aparecer duas vezes?

**Feito (opção A):** na memória publicada o subtítulo fica só "Confira antes de confirmar."; no rascunho, onde o cartão não repete a frase, continua inteiro. Capturas: `p57-p58-p59-excluir--390.jpg`, `p57-p58-p59-excluir--1280.jpg`.

**detalhe**

- Contexto: o subtítulo "Confira antes de confirmar. Nada é apagado de vez." foi aprovado para as telas de confirmação.
- O que vi: nesta tela, o cartão logo abaixo começa o segundo parágrafo com "Nada é apagado de vez: a memória vai para a lixeira…". A mesma frase fica a quatro linhas uma da outra.
- Opções:
  - A (recomendada): aqui o subtítulo fica só "Confira antes de confirmar.", e a explicação fica no cartão.
  - B: manter como está.
- Captura: `explorar-excluir-confirmacao--390.jpg`

### P58. O botão vermelho de excluir leva seta?

**Feito (opção A):** o botão de perigo não leva mais a seta, aqui e nas outras confirmações (a regra é do botão). Capturas: `p57-p58-p59-excluir--390.jpg`, `p57-p58-p59-excluir--1280.jpg`.

**detalhe**

- Contexto: o botão que confirma é cheio, na cor de alerta (aprovado). O botão cheio do sistema traz uma seta.
- O que vi: "Excluir e mandar para a lixeira →". A seta diz "seguir adiante", e ali a ação termina. No celular o botão quebra em duas linhas (297 × 56 px) com a seta ao lado.
- Opções:
  - A (recomendada): botão de perigo sem seta, aqui e nas outras confirmações.
  - B: manter como está.
- Captura: `explorar-excluir-confirmacao--390.jpg`

### P59. A frase de quem pode restaurar pode ficar mais simples?

**Feito (opção A):** "você, a Giovanna ou o Lucas Magno podem restaurar tudo como estava"; com um só outro administrador, "você ou a Giovanna". Capturas: `p57-p58-p59-excluir--390.jpg`.

**detalhe**

- Contexto: o texto é do site e os textos são decisão do Gui.
- O que vi: como `gui`, a tela diz "você ou a Giovanna e o Lucas Magno podem restaurar tudo como estava". O "ou" seguido de "e" pede uma segunda leitura.
- Opções:
  - A (recomendada): "você, a Giovanna ou o Lucas Magno podem restaurar tudo como estava".
  - B: "qualquer administrador pode restaurar tudo como estava".
  - C: manter como está.

## Capítulos

### P60. A lista de capítulos vai do mais antigo ao mais recente. Deve seguir o resto do site?

**Feito (opção A):** mantido como está.

**ajuste**

- Contexto: toda linha do tempo do site vai do mais recente ao mais antigo, e os marcos do capítulo também (aprovado em 17/11). A lista de capítulos ordena pelo começo do período, do mais antigo para o mais novo.
- O que vi: "Os anos 90" (1992) abre a lista e "Os anos de casa" (2020) fecha, nas três larguras. É a única lista do site nesse sentido.
- Opções:
  - A (recomendada): manter como está. É um sumário de livro, e sumário se lê do começo.
  - B: mais recentes primeiro, como o resto.
  - C: épocas num bloco à parte, no alto, e os capítulos embaixo.

### P61. O título de cada capítulo precisa ser tão grande?

**Feito (opção A):** o título de cada linha do sumário passou para o tamanho de item de lista (`--t-titulo-3`); a lista de sete capítulos caiu para 806 px em 390 px e 718 px em 1280 px. Capturas: `p61-p63-p64-lista-alto--390.jpg`, `p61-p63-p64-lista-alto--1280.jpg`, `p61-p63-p64-lista-alto--1920.jpg`.

**ajuste**

- Contexto: cada linha do sumário usa o tamanho de título de parte (`--t-titulo-2`).
- O que vi: em 1280 px cada título tem 54 px, contra 91 px do "Capítulos" do alto; em 390 px, 33 contra 45. Oito capítulos ocupam 1.246 px em 1280 px e 1.272 px em 390 px: na primeira tela do celular cabem dois. Com trinta capítulos, a lista vira muitas telas.
- Opções:
  - A (recomendada): baixar para o tamanho de item de lista (`--t-titulo-3`), como já é nos capítulos de dentro, e deixar o respiro fazer a hierarquia.
  - B: manter como está.
- Captura: `familia-capitulos-alto--1280.jpg`

### P62. No computador, a coluna do título fica vazia quando a lista rola. Ela deve ficar parada?

**Feito (opção A):** com mouse, o alto do sumário fica parado enquanto a lista rola. Capturas: `p62-lista-rolada--1280.jpg`.

**ajuste**

- Contexto: o comentário do CSS diz "a capa e o alto do sumário ficam parados", mas só a capa do capítulo tem a regra; o alto do sumário não.
- O que vi: em 1280 px, rolando 900 px, a metade esquerda da tela fica em branco até o rodapé, e "Novo capítulo" some. Em 1920 px, igual.
- Opções:
  - A (recomendada): prender o alto do sumário ("Capítulos", a frase e "Novo capítulo") onde há mouse, como a capa do capítulo. Ele mede 400 px, cabe na janela.
  - B: manter como está, e corrigir só o comentário.
- Captura: `familia-capitulos-rolado--1280.jpg`

### P63. "Época" começa em outra margem que "Capítulo", por não ter o ponto de cor. Alinhar?

**Feito (opção A):** toda linha tem o ponto, e o da época é vazado em cinza; os selos começam na mesma margem (46 px em 390 px, 678 px em 1280 px). Capturas: `p61-p63-p64-lista-alto--390.jpg`, `p61-p63-p64-lista-alto--1280.jpg`.

**detalhe**

- Contexto: a época é o chão da linha do tempo e fica sem ponto de cor; os capítulos têm o ponto antes do selo.
- O que vi: em 1280 px, "ÉPOCA" começa em x = 652 e "CAPÍTULO" em x = 678 (20 e 46 em 390 px). Lida de cima a baixo, a coluna dos selos dança. E "Capítulo" se repete em cinco das sete linhas.
- Opções:
  - A (recomendada): reservar o lugar do ponto também na época (um ponto vazado em cinza, ou só o espaço), para os selos alinharem.
  - B: tirar o selo "Capítulo" e deixar só "Época" e "Por período", que são as exceções.
  - C: manter como está.

### P64. Os temas moram no fim da lista de capítulos. É onde a pessoa procura?

**Feito (opção A):** os temas continuam no fim, e o alto ganhou o atalho quieto "Ver os temas", que desce até eles (âncora `#temas`). Capturas: `p61-p63-p64-lista-alto--390.jpg`, `p64-temas--390.jpg`.

**detalhe**

- Contexto: os temas vêm depois do último capítulo, como ações quietas. O menu não tem "Temas".
- O que vi: em 390 px os temas começam a 1.900 px do alto. Quem chega pelo menu "Capítulos" não sabe que eles existem até o fim da página. A página do tema volta com "Todos os capítulos e temas".
- Opções:
  - A (recomendada): manter no fim e pôr, no alto, um atalho quieto "Ver os temas", que desce até eles (como os atalhos de família em Pessoas).
  - B: levar os temas para o Explorar, como filtro, e tirar daqui.
  - C: manter como está.

## Capítulo

### P65. No celular, a primeira memória aparece depois de uma tela e meia de capa. A abertura deve vir antes dos botões?

**Feito (opção A):** no celular a ordem é título, período, frase de abertura e depois as ações (a abertura subiu de 476 px para 291 px do alto em "Natais"); o botão e a ação de texto ficam numa linha quando cabem. Capturas: `p65-p67-p70-capitulo-reunido--390.jpg`, `p65-p67-p70-capitulo-epoca--390.jpg`.

**muda a experiência**

- Contexto: a ideia da tela é "abertura de capítulo de livro". A capa fica no alto no celular (decidido em 17/11), com "Quem aparece" numa linha.
- O que vi: em 390 px, a ordem é selo, título, período, botão cheio, "Nova memória neste capítulo", "Ver no Explorar" (as três ações empilhadas ocupam 160 px), e só então a frase de abertura, a 476 px do alto. O primeiro marco começa em 1.141 px ("Natais") e em 1.346 px ("A infância da Giovanna"). A frase em serifa, que é o que faz a tela parecer livro, vem depois dos botões.
- Opções:
  - A (recomendada): título, período, frase de abertura e, depois dela, as ações numa linha só (o botão e as outras como texto ao lado).
  - B: manter a ordem e levar "Aconteceu durante", "Temas" e "Quem aparece" para depois dos marcos, no celular.
  - C: manter como está.
- Captura: `familia-capitulo-capa--390.jpg`

### P66. No celular, os nomes de "Quem aparece" são links? (PR #39, pergunta 1)

**Feito (opção A):** mantido como está (links, com a linha alta).

**ajuste**

- Contexto: no celular, a linha corrida "Gui (6), Elizete (5)" tomou o lugar da lista com retratos, que levava à página de cada pessoa.
- O que vi: cada nome é um link, e a linha ficou com 44 px de altura para o toque. Medido nesta rodada, em 390 px: letra de 12 px com linha de 44 px dá duas linhas de nomes separadas por 32 px de vazio (88 px no total), que parecem dois itens soltos. Sem os links, caberia em 40 px.
- Opções:
  - A (recomendada): links, com a linha alta, como está. Mantém o caminho para a pessoa.
  - B: só texto, com a entrelinha normal. Fica compacto e perde o caminho para a pessoa no celular.
  - C: texto corrido e um link só no fim ("ver as pessoas"), que abre a lista com retratos.

### P67. O botão cheio da página do capítulo deve ser o de editar?

**Feito (opção A):** no reunido o botão cheio é "Nova memória neste capítulo" e editar virou texto; nos outros não há botão cheio, só "Editar capítulo" ou "Editar época" como texto. Capturas: `p65-p67-p70-capitulo-reunido--390.jpg`, `p65-p67-p70-capitulo-reunido--1280.jpg`, `p65-p67-p70-capitulo-reunido--1920.jpg`.

**ajuste**

- Contexto: "a ação principal fica no alto, junto do título" (decisão de 16/11). Hoje o botão cheio é "Escolher memórias e editar" (reunido), "Editar capítulo" ou "Editar época".
- O que vi: a página é de leitura, e o que mais chama a atenção nela, depois do título, é um botão preto de edição. No reunido há três ações no alto; "Nova memória neste capítulo" fica como texto. Para a Elizete, que não edita, o botão cheio vira "Escolher memórias". Pelo que `docs/visual.md` diz da tela, a edição é "o que fica quieto".
- Opções:
  - A (recomendada): no reunido, o botão cheio é "Nova memória neste capítulo", e editar vira texto; nos outros, sem botão cheio, só "Editar capítulo" como texto.
  - B: nenhuma ação cheia nesta página; as três como texto.
  - C: manter como está.

### P68. Com a capa parada, o que fica à vista?

**Feito (opção A):** ficam parados só o selo, o título, o período e as ações; a abertura, as notas e "Quem aparece" rolam e passam por trás desse bloco. Capturas: `p68-capa-parada--1280.jpg`, `p68-capa-parada--1920.jpg`.

**ajuste**

- Contexto: a capa era mais alta que a janela e "Quem aparece" ficava cortado enquanto os marcos rolavam. Nesta rodada, a capa mais alta que a janela deixou de ficar parada; esta pergunta é sobre o que deve ficar à vista.
- O que vi: capa de 1.050 a 1.269 px em 1280x900.
- Opções:
  - A (recomendada): parados só o selo, o título, o período e as ações. A abertura, as notas e "Quem aparece" rolam com a página.
  - B: tudo parado, com "Quem aparece" reduzido a três pessoas e as notas numa linha, para caber em 800 px.
  - C: nada parado.
- Captura: `familia-capitulo-capa-parada--1280.jpg`

### P69. "Ver no Explorar" leva para fora do capítulo, sem volta. O nome e o destino estão certos?

**Feito (opção A):** "Ver no Explorar" saiu; a página ganhou "Forma de ver" (Marcos, Mural de fotos, Lista), que troca no lugar, e "Passar no modo TV". Capturas: `p69-p72-marcos--390.jpg`, `p69-p72-marcos--1280.jpg`, `p69-mural--390.jpg`, `p69-mural--1280.jpg`, `p69-mural--1920.jpg`, `p69-lista--390.jpg`, `p69-lista--1280.jpg`.

**ajuste**

- Contexto: abre `/explorar?capitulo=<id>`, com o capítulo como filtro.
- O que vi: no Explorar, o capítulo aparece só dentro de "Filtros" ("Natais · Mais recentes primeiro"); o título da tela é "MEMÓRIAS" e não há caminho de volta para a página do capítulo. A pessoa ganha ali o mural, a lista e o modo TV do capítulo, mas o nome do link não conta isso.
- Opções:
  - A (recomendada): trocar por "Forma de ver" na própria página do capítulo, como na página da pessoa (marcos, mural, lista), e manter um "Passar no modo TV".
  - B: manter o link com outro nome: "Ver em mural, lista ou modo TV".
  - C: manter como está.

### P70. No capítulo de dentro, "Parte de" deve subir para cima do título?

**Feito (opção A):** o capítulo de dentro diz "Capítulo de “Natais”", com o link, acima do título, no lugar do selo; "Parte de" saiu das notas. Capturas: `p65-p67-p70-capitulo-de-dentro--390.jpg`, `p65-p67-p70-capitulo-de-dentro--1280.jpg`.

**ajuste**

- Contexto: "Parte de Natais" fica nas notas, depois das ações e da abertura.
- O que vi: em `/capitulos/natais-na-vo-vivica`, em 1280 px, "Parte de" está a 720 px do alto; em 390 px, abaixo da primeira tela. Quem chega pelo sinal de uma memória não vê de que capítulo este faz parte.
- Opções:
  - A (recomendada): uma linha acima do título, no lugar do selo ou junto dele: "Capítulo de Natais", com o link.
  - B: manter como está.

### P71. Numa época, o título dos marcos diz "Memórias do capítulo". Trocar?

**Feito (opção A):** "Memórias da época" na época e "Memórias do capítulo" nos outros. Capturas: `p71-p73-epoca--390.jpg`, `p71-p73-epoca--1280.jpg`.

**detalhe**

- Contexto: o selo e o botão já dizem "Época" e "Editar época".
- O que vi: `/capitulos/os-anos-90` traz "Memórias do capítulo" sobre os marcos. O estado vazio da época já fala "neste período".
- Opções:
  - A (recomendada): "Memórias da época" na época e "Memórias do capítulo" nos outros.
  - B: só "Memórias", sempre.
  - C: manter como está.

### P72. A legenda da foto do marco repete o carimbo ao lado. Tirar?

**Feito (opção A):** a foto do marco vai sem legenda, e o carimbo quebra antes do ponto (o ponto abre a segunda linha). Capturas: `p69-p72-marcos--390.jpg`, `p69-p72-marcos--1280.jpg`.

**detalhe**

- Contexto: o marco tem o carimbo ("24 DEZ 2025 · BELO HORIZONTE") e a foto revelada com a legenda de sempre ("BELO HORIZONTE (2025)").
- O que vi: nas três larguras, o lugar e o ano aparecem duas vezes no mesmo marco, a 20 px um do outro em 1280 px. Em 390 px o carimbo ainda quebra em duas linhas, com o ponto do meio sobrando no fim da primeira (51 px de altura).
- Opções:
  - A (recomendada): foto sem legenda nos marcos, e o carimbo quebrando antes do ponto no celular.
  - B: manter como está.

### P73. "em parte neste período" em todas as linhas de "Aconteceu neste período". Dizer só a exceção?

**Feito (opção A):** "em parte neste período" saiu; só o que coube inteiro é marcado, com "inteiro neste período". Capturas: `p71-p73-epoca--390.jpg`, `p71-p73-epoca--1280.jpg`.

**detalhe**

- O que vi: em "Os anos 90", as quatro linhas dizem "em parte neste período". O texto vira ruído.
- Opções:
  - A (recomendada): não dizer nada quando é em parte, e marcar só o que coube inteiro ("inteiro neste período"), ou o contrário, o que for mais raro no acervo real.
  - B: manter como está.

### P74. Em 1920 px, a coluna da direita acaba antes da margem. É de propósito?

**Feito (opção A):** a partir de 100rem o corpo vai da coluna 6 até a margem (termina em x = 1.851, como o menu), no capítulo e na lista, e a foto do marco cresceu de 11 para 14rem. Capturas: `p65-p67-p70-capitulo-reunido--1920.jpg`, `p61-p63-p64-lista-alto--1920.jpg`.

**detalhe**

- Contexto: em 1920 px a capa ocupa as colunas 1 a 4 e o corpo as colunas 6 a 11; a 12 fica vazia. Vale para o capítulo e para a lista de capítulos.
- O que vi: o corpo termina em x = 1.699 e o menu do topo vai até 1.851: as fotos dos marcos não alinham com nada do alto.
- Opções:
  - A (recomendada): corpo das colunas 6 a 12, com a foto do marco maior.
  - B: manter como está.

## Novo capítulo

### P75. As etapas do capítulo viram perguntas?

**Feito (opção A):** as etapas são "Que capítulo é esse?" e "Onde ele se encaixa?", na trilha e na pergunta. Capturas: `p75-p76-novo--390.jpg`, `p75-p76-novo--1280.jpg`.

**ajuste**

- Contexto: uma pergunta por tela, como quem conversa.
- O que vi: as legendas são "O capítulo", "Onde se encaixa" e "Quem pode ver?". Só a terceira pergunta. Dentro da primeira já há "Como as memórias entram?", "De quem é este período?" e "Quais pessoas?".
- Opções:
  - A (recomendada): "Que capítulo é esse?" e "Onde ele se encaixa?".
  - B: manter como está.

### P76. O exemplo do título pode ser mais curto?

**Feito (opção A):** o exemplo é "Ex.: Natais na casa da vó" (204 px num campo de 349 px). Capturas: `p75-p76-novo--390.jpg`.

**detalhe**

- Contexto: o campo do título traz um exemplo em cinza.
- O que vi: em 390 px, "Ex.: Casamento da Giovanna e do Lucas Magno" mede 388 px num campo de 349 px e termina em "Lucas Ma".
- Opções:
  - A (recomendada): "Ex.: Natais na casa da vó".
  - B: "Ex.: Casamento da Giovanna".
  - C: manter como está.
- Captura: form-capitulo-novo-exemplo-cortado--390.jpg

### P77. O mês do capítulo tem o mesmo desenho do mês da memória?

**Feito (opção A):** o mês do capítulo tem o rótulo "Mês, se souber" e o valor "Não sei", como na memória. Capturas: `p77-mes-do-capitulo--390.jpg`, `p77-mes-do-capitulo--1280.jpg`.

**detalhe**

- Contexto: `CampoData` na memória e `CampoAno` com o mês no capítulo por período.
- O que vi: na memória, o mês tem o rótulo "MÊS, SE SOUBER" e o valor "Não sei". No capítulo, não tem rótulo à vista e o valor é "Mês, se souber". Em 390 px, o mês do capítulo cai sozinho numa linha abaixo dos botões do ano.
- Opções:
  - A (recomendada): o mesmo rótulo e o mesmo "Não sei" nos dois.
  - B: manter como está.

## Editar capítulo

### P78. "Sobre o capítulo" vem antes de "Memórias do capítulo"?

**Feito (opção A):** "Sobre o capítulo" vem primeiro (o título do capítulo subiu de y = 2966 para 554 em 390 px); "Memórias do capítulo" mostra as marcadas e uma busca traz as outras para marcar. Sem script, a lista vem inteira. Capturas: `p78-p79-editar-alto--390.jpg`, `p78-memorias-do-capitulo--1280.jpg`, `p78-memorias-busca--390.jpg`.

**muda a experiência**

- Contexto: num capítulo reunido, a tela tem duas partes, cada uma com o próprio botão de salvar.
- O que vi: em "Natais", a lista de marcar tem 40 memórias e ocupa 2.125 px no celular. "Salvar memórias do capítulo" está em y = 2609 e o campo do título do capítulo, em y = 2966. Para mudar o nome, a pessoa rola três telas. Há dois botões cheios na página ("Salvar memórias do capítulo" e "Continuar"), e é fácil marcar memórias, descer, salvar a ficha e perder as marcas.
- Opções:
  - A (recomendada): a lista mostra as memórias marcadas e uma busca para acrescentar, como "Quem estava?", e fica depois de "Sobre o capítulo".
  - B: só inverter a ordem das duas partes.
  - C: duas telas separadas, "Editar capítulo" e "Escolher memórias".
  - D: manter como está.
- Captura: `form-capitulo-editar-comeco--390.jpg`

### P79. Na edição, a trilha vai para a coluna da esquerda, como no capítulo novo?

**Feito (opção A):** no computador, a trilha de "Sobre o capítulo" fica na coluna da esquerda, na altura dessa parte. Capturas: `p78-p79-editar-alto--1280.jpg`, `p78-p79-editar-alto--1920.jpg`.

**ajuste**

- Contexto: nesta rodada a trilha ganhou respiro, sem mudar de lugar. No computador, a coluna da esquerda da edição só tem o título da página, e fica vazia por 3.500 px.
- O que vi: em 1280 px, tudo fica na coluna de x = 451 a 1155, e a esquerda fica em branco do começo ao fim.
- Opções:
  - A (recomendada): a trilha de "Sobre o capítulo" à esquerda, na altura dessa parte.
  - B: na edição, sem etapas: os campos em sequência e um só "Salvar capítulo".
  - C: manter, só com o espaço corrigido.
- Captura: `form-capitulo-editar-trilha-colada--1280.jpg`

## Excluir capítulo

### P80. A confirmação repete "Nada é apagado de vez" e muda o nome da ação?

**Feito (opção A):** a abertura ficou só "Confira antes de confirmar." e o botão diz "Excluir capítulo". Capturas: `p80-excluir--390.jpg`, `p80-excluir--1280.jpg`.

**detalhe**

- Contexto: os textos das telas utilitárias foram aprovados.
- O que vi: a abertura diz "Confira antes de confirmar. Nada é apagado de vez." e o cartão repete "Nada é apagado de vez: o capítulo vai para a lixeira…". A ação se chama "Excluir capítulo" na zona de perigo e no título, e "Excluir e mandar para a lixeira" no botão. No rascunho, o nome é o mesmo nos três lugares ("Descartar rascunho").
- Opções:
  - A (recomendada): a abertura fica só com "Confira antes de confirmar." e o botão diz "Excluir capítulo".
  - B: manter como está.

## Tema

### P81. No computador, a primeira tela do tema não mostra nenhuma memória. Recompor?

**Feito (opção A):** a partir de 62rem, o nome do tema e os capítulos ficam à esquerda e as memórias à direita, desde o alto (a primeira memória aparece em y = 604 em 1280 px). Capturas: `p81-p83-tema--390.jpg`, `p81-p83-tema--1280.jpg`, `p81-p83-tema--1920.jpg`.

**ajuste**

- Contexto: a página empilha "Tema", o nome, o link de volta, os capítulos e depois as memórias, igual ao celular.
- O que vi: em 1280x900, a primeira tela tem o nome, um capítulo numa linha que ocupa metade da largura e o título "Memórias"; a metade direita fica vazia. Em 1920x1080, a primeira foto aparece no pé da tela.
- Opções:
  - A (recomendada): duas colunas, como o capítulo: à esquerda o nome do tema e os capítulos que o usam; à direita, as memórias desde o alto.
  - B: manter como está.
- Captura: `familia-tema-alto--1280.jpg`

### P82. O tema deve ter "Forma de ver", como a pessoa?

**Feito (opção A):** o tema ganhou a "Forma de ver" da pessoa (Linha do tempo, Mural de fotos, Lista), que troca no lugar. Capturas: `p82-tema-mural--390.jpg`, `p82-tema-mural--1280.jpg`, `p82-tema-lista--1280.jpg`.

**ajuste**

- Contexto: a página da pessoa ganhou linha do tempo, mural e lista (17/11). O tema mostra só a linha do tempo, sem caminho para o Explorar nem "Nova memória".
- O que vi: `/temas/natal` não tem controle nenhum sobre as seis memórias.
- Opções:
  - A (recomendada): a mesma "Forma de ver" da pessoa.
  - B: um link "Ver no Explorar", como no capítulo.
  - C: manter como está.

### P83. Na lista de capítulos do tema, a linha vem sem período e sem conta. Completar?

**Feito (opção A):** a linha do capítulo no tema traz o período e a conta, como no sumário. Capturas: `p81-p83-tema--390.jpg`, `p81-p83-tema--1280.jpg`.

**detalhe**

- O que vi: "Natais / CAPÍTULO", sem "DEZ DE 1994 A DEZ DE 2025" nem "6 memórias", que a mesma linha mostra em `/capitulos`.
- Opções:
  - A (recomendada): a linha igual à do sumário.
  - B: manter como está.

## Árvore

### P84. A ficha deve aparecer só depois de tocar em alguém, e ter como fechar?

**Feito (opção A):** a árvore abre sem ficha; tocar em alguém mostra a ficha, e o "×", o Esc e o toque no vazio fecham. Com a ficha fechada, o toque em quem já está em foco mostra a ficha em vez de abrir a página. Capturas: `arvore/p84-abre-sem-ficha--390.jpg`, `--1280.jpg`, `--1920.jpg`.

**muda a experiência**

- Contexto: a ficha é o cartão com o retrato, o nome, o parentesco e três ações. Hoje ela está sempre na tela, inclusive ao abrir, mostrando quem olha ("Giovanna / você, 1999"), e não fecha: não há "×", Esc não faz nada, tocar no vazio não tira.
- O que vi: ao abrir, a ficha de quem olha ocupa 17% do mapa em 390 px e esconde pessoas. A primeira coisa que a pessoa lê sobre a árvore é a ficha dela mesma, com "Partir desta pessoa".
- Opções:
  - A (recomendada): a árvore abre sem ficha. Tocar em alguém mostra a ficha; "×", Esc ou tocar no vazio fecham. O anel de quem está em foco continua.
  - B: manter sempre aberta, com um "×" que a recolhe até o próximo toque.
  - C: manter como está.
- Captura: `familia-arvore-abre--390.jpg`

### P85. No computador, a ficha fica no canto de cima, longe de quem foi tocado. Onde ela deve ficar?

**Feito (opção A):** a ficha fica embaixo, no centro, com 22rem de largura. Em 1920 px ela fica na linha da barra, entre a legenda e o zoom; até lá, uma linha acima da barra, porque a barra com os nomes novos não deixa lugar ao lado. Capturas: `arvore/p85-ficha-da-elizete--1280.jpg`, `--1920.jpg`.

**muda a experiência**

- Contexto: em 640 px ou mais, a ficha fica no alto à direita; os ajustes no alto à esquerda, a legenda embaixo à esquerda e o zoom embaixo à direita.
- O que vi: em 1920 px, tocando na Elizete (no meio do mapa), a ficha aparece a 600 px dela, no canto. A largura muda com as ações (339, 278 ou 217 px), e a borda esquerda pula de pessoa para pessoa. Os quatro cantos do mapa ficam ocupados, e a vista "Ver tudo" não desconta nenhum deles.
- Opções:
  - A (recomendada): a ficha embaixo, no centro, com largura fixa, entre a legenda e o zoom; a legenda começa fechada (pergunta abaixo).
  - B: a ficha presa ao cartão tocado, como um balão logo abaixo dele.
  - C: uma coluna à direita, fora do mapa, em 1280 px ou mais, com espaço para mais conteúdo (pais, casal, quantas memórias).
  - D: manter como está.
- Captura: `familia-arvore-ficha-cobre--1280.jpg`, `familia-arvore-abre--1920.jpg`

### P86. No celular, a ficha, o zoom e os ajustes tomam 28% do mapa, e a ficha cobre o ramo aberto. Encolher?

**Feito (opção A):** no celular a ficha é uma linha de 53 px (era de 125), com "Mais" para a segunda ação, e sai enquanto um ramo está aberto. Capturas: `arvore/p85-ficha-da-elizete--390.jpg`, `arvore/p86-ficha-com-mais--390.jpg`, `arvore/p86-ramo-aberto-sem-ficha--390.jpg`.

**muda a experiência**

- Contexto: no celular a ficha fica embaixo, acima do zoom. Com os ajustes abertos ela sai.
- O que vi: em 390 px, o mapa tem 668 px de altura; a ficha tem 125 px, o zoom 44 e "Ajustar a árvore" 44. Sobram 390 px livres. Com o ramo da Tia Lourdes aberto, a ficha cobre Lia e Ben, a última fileira do cartão, e continua mostrando quem estava em foco antes, que nem aparece mais.
- Opções:
  - A (recomendada): ficha de uma linha no celular (retrato pequeno, nome, parentesco e "Ver a página"), com as outras ações num segundo toque; e ela sai enquanto um ramo está aberto.
  - B: ficha como folha que sobe do pé da tela ao tocar, e desce ao tocar fora.
  - C: manter como está.
- Captura: `familia-arvore-ramo-e-ficha--390.jpg`

### P87. No celular a legenda não existe. Como a pessoa descobre o que é tracejado, o que é "♥ 2" e o que são as cores?

**Feito (opção A):** botão "Legenda" na barra de baixo do celular, que abre a legenda por cima do mapa; fecha no "×" e no Esc. A barra passou a ter duas linhas no celular. Captura: `arvore/p90-legenda--390.jpg`.

**muda a experiência**

- Contexto: abaixo de 640 px a legenda é escondida ("para sobrar árvore"). O texto do alto explica o arrasto, o toque e o "+".
- O que vi: em 390 px nada explica as cores das famílias, o tracejado, o pontilhado do casal desfeito, o cartão em cápsula nem o botão "♥". A família vai usar quase só o celular.
- Opções:
  - A (recomendada): um botão "Legenda" na barra de baixo, junto do zoom, que abre a legenda por cima do mapa e fecha no "×".
  - B: a legenda abaixo do mapa, no fluxo da página, sempre à vista para quem rola.
  - C: manter como está.

### P88. Pelo teclado, o mapa pode andar sozinho até o cartão em foco?

**Feito (opção A):** a caixa do mapa não rola mais, o mapa anda o mínimo até o cartão que recebeu o foco do teclado, e o foco volta para a marca do ramo depois de abrir ou recolher. Conferido com o Tab pelos 51 alvos do mapa em 390, 1280 e 1920 px: nenhum fora da vista. Capturas: `arvore/p88-teclado-cartao-em-foco--390.jpg`, `--1280.jpg`.

**ajuste**

- Contexto: é um defeito de teclado, mas a correção mexe em `src/lib/cliente/arvore.ts`, que é o comportamento travado da árvore. Por isso ficou como pergunta, sem mudança.
- O que vi: com o Tab num cartão fora da vista, o navegador rola a própria caixa do mapa, e "Ajustar a árvore", a ficha e o zoom saem da tela (em 390 px, depois de nove Tabs; em 1280 e 1920 px, depois de aproximar duas vezes). Arrastar não desfaz. Cartão fora da vista à esquerda ou acima recebe o foco sem aparecer. E abrir um ramo pelo teclado ("+ 1", Enter) perde o foco, porque a marca é desenhada de novo.
- Opções:
  - A (recomendada): autorizar a correção: a caixa nunca rola, o mapa anda o mínimo até o cartão em foco (a mesma conta que já traz o cartão do ramo para a tela), e o foco volta para a marca do ramo. Arranjo, linhas, arrasto e zoom não mudam.
  - B: manter como está. A árvore é mais de mouse e de toque.
- Captura: familia-arvore-teclado-rola-o-mapa--390.jpg, familia-arvore-teclado-rola-o-mapa--1280.jpg

### P89. No computador, a legenda deve abrir fechada e lembrar a escolha?

**Feito (opção A):** no computador a legenda abre na primeira visita e o aparelho lembra se a pessoa fechou. Capturas: `arvore/p89-legenda-na-primeira-visita--1280.jpg`, `--1920.jpg`.

**ajuste**

- Contexto: a legenda nasce aberta, embaixo à esquerda, e reabre a cada visita.
- O que vi: em 1280 px ela mede 508 por 170 px (10% do mapa) e passa por cima da linha de consideração do Gui até o Chico; ao pôr a Elizete em foco, cobre Mel e Totó. Fechei, recarreguei, e ela voltou aberta.
- Opções:
  - A (recomendada): aberta só na primeira visita; depois, guarda no aparelho se a pessoa fechou.
  - B: sempre fechada, só o botão "Legenda".
  - C: manter como está.

### P90. A legenda explica tudo o que a árvore mostra?

**Feito (opção A):** três grupos com título, os itens que faltavam ("+ 1", você, quem você tocou, de duas famílias) e o bicho mostrado pela forma do cartão. Os textos dos itens novos são meus e estão no relatório. Capturas: `arvore/p90-legenda--390.jpg`, `--1280.jpg`, `--1920.jpg`.

**ajuste**

- Contexto: hoje tem dez itens: três famílias, "amigos e de fora", casal, "não estão mais juntos", pais e filhos, "consideração ou coração", "bichos da família" e "♥ 2 abre os laços do coração de alguém".
- O que vi: faltam o botão "+ 1" (o texto do alto fala dele, a legenda não), a faixa escura de quem olha, o anel de quem está em foco e o cartão de duas cores na diagonal (quem é de duas famílias). "Bichos da família" mostra uma linha fina, mas o que se nota no desenho é o cartão arredondado com a espécie. Os itens de cor e de linha se misturam nas duas colunas. O texto tem 12 px, em mono.
- Opções:
  - A (recomendada): três grupos com título ("Famílias", "Linhas", "Botões e marcas"), com os itens que faltam, o bicho mostrado pela forma do cartão, e a explicação do "+" saindo do texto do alto.
  - B: só acrescentar o "+ 1" e trocar a amostra do bicho.
  - C: manter como está.

### P91. As ações da ficha dizem o que acontece? ("Laços", "Partir desta pessoa")

**Feito (opção A):** a ficha tem "Ver a página" e "Ver a árvore de Fulano"; "Laços" saiu. Capturas: as da P85.

**ajuste**

- Contexto: a ficha tem "Ver a página", "Laços" e "Partir desta pessoa". Tocar de novo no cartão também abre a página.
- O que vi: "Laços" leva ao formulário de editar a pessoa, na parte dos laços; o nome não diz que é edição, e aparece para qualquer pessoa. "Partir desta pessoa" é vocabulário do controle "Partir de": quem não abriu os ajustes não sabe o que é. Ele some em quem já é o centro e em quem não tem laço de árvore, sem aviso.
- Opções:
  - A (recomendada): "Ver a página" como ação única à vista; "Ver a árvore de Elizete" no lugar de "Partir desta pessoa"; "Laços" sai da ficha (o caminho fica na página da pessoa, em "Editar página e laços").
  - B: manter as três com nomes novos: "Ver a página", "Editar laços", "Ver a árvore de Elizete".
  - C: manter como está.

### P92. "Ajustar a árvore": o nome, o campo "Partir de" e a opção travada estão claros?

**Feito (opção A):** o valor de agora de "Partir de" aparece em tinta, com "Voltar ao começo" quando o centro foi trocado; "Outras famílias" só aparece com uma família em destaque; no celular o painel abre no pé do mapa, com as caixas em duas colunas e a árvore enquadrada acima; Esc fecha. O sinal de abrir continua o mesmo. Capturas: `arvore/p92-ajustes--390.jpg`, `arvore/p92-ajustes-com-centro--390.jpg`, `--1280.jpg`, `--1920.jpg`.

**ajuste**

- Contexto: o painel tem "Partir de" (busca), "Destacar" (lista) e cinco caixas em "Mostrar". Fica no alto à esquerda, fechado.
- O que vi: (1) "Partir de" mostra "Gui, Giovanna e Lucas Magno" em cinza, como texto de exemplo: parece campo vazio, e não o valor de agora. Depois de escolher "Vó Bela", não há nada que diga como voltar ao começo (é apagando o campo). (2) "Outras famílias" aparece marcada e apagada enquanto "Destacar" está em "Família inteira", sem dizer por quê. (3) Em 390 px o painel aberto mede 472 px e cobre o meio da árvore, de modo que não se vê o efeito de cada caixa. (4) Esc não fecha. (5) O sinal "+" do painel é o mesmo "+" dos ramos.
- Opções:
  - A (recomendada): o valor de agora escrito como valor, com um "Voltar ao começo" ao lado quando o centro foi trocado; "Outras famílias" só aparece quando uma família está em destaque; no celular o painel abre no pé da tela, baixo, com as caixas em duas colunas; Esc fecha.
  - B: só os textos: dica "A árvore começa em Gui, Giovanna e Lucas Magno. Escreva um nome para trocar." e o motivo da trava.
  - C: manter como está.
- Captura: `familia-arvore-ajustes--390.jpg`

### P93. O texto do alto pode encolher?

**Feito (opção A):** o texto do alto é "Toque em alguém para ver quem é.". Capturas: as da P84.

**ajuste**

- Contexto: "Arraste para andar pela família. Toque em alguém para ver quem é, e de novo para abrir a página. Os botões + abrem os outros ramos da família."
- O que vi: em 390 px são três linhas, e o topo passa a ocupar 146 px, o que empurra o mapa para fora da janela (a altura do mapa foi corrigida nesta rodada). No computador o texto diz "Toque", fica ao lado do título em corpo pequeno e cinza, e quase não se lê em 1920 px. O que ele explica também é assunto da legenda.
- Opções:
  - A (recomendada): uma frase só, "Toque em alguém para ver quem é.", e o resto na legenda.
  - B: o texto some depois da primeira visita.
  - C: manter como está.

### P94. Até onde o zoom vai? (PR #39, pergunta 10)

**Feito (opção A):** mantido em 400%; saiu a marca de provisório do código.

**detalhe**

- Contexto: o zoom ia até 200%, e o pedido foi conferir a nitidez até 400%.
- O que vi: o máximo é 400%. Nesse zoom um cartão ocupa quase a tela inteira do celular. Quanto maior o zoom, mais cartões ficam fora da vista para quem anda pelo teclado (ver a pergunta seguinte).
- Opções:
  - A (recomendada): 400%, como está. Ajuda quem enxerga pouco.
  - B: 300%.
  - C: voltar a 200%.

### P95. "Ir ao foco" e "Ver tudo": os nomes servem?

**Feito (opção A):** "Voltar para Fulano", com o nome de quem está em foco, e "Ver a árvore inteira". Capturas: as da P85.

**detalhe**

- Contexto: a barra de baixo tem "Ir ao foco", "Ver tudo", "−", a porcentagem e "+".
- O que vi: "foco" é palavra do código; na tela, a pessoa em foco é quem está com o anel e na ficha. Em 390 px a barra ocupa a largura toda (349 px).
- Opções:
  - A (recomendada): "Voltar para Elizete" (o nome de quem está em foco) e "Ver a árvore inteira".
  - B: manter como está.

### P96. "Cadastrar uma pessoa" aqui e "Cadastrar pessoa" em Pessoas. Unificar?

**Feito (opção A):** "Cadastrar pessoa" nos dois.

**detalhe**

- O que vi: o link abaixo do mapa diz "Cadastrar uma pessoa"; o botão de `/pessoas` diz "Cadastrar pessoa". É a mesma ação.
- Opções:
  - A (recomendada): "Cadastrar pessoa" nos dois.
  - B: manter como está.

### P97. Na ficha, "você, 1999" e "seu irmão, 1995 a 2009". Dizer de outro jeito?

**Feito (opção A):** o parentesco e os anos em caixa alta, separados pelo ponto do carimbo. Capturas: as da P85.

**detalhe**

- O que vi: o parentesco e os anos vêm numa linha só, separados por vírgula, em mono. "você, 1999" não se entende de primeira.
- Opções:
  - A (recomendada): duas informações separadas pelo ponto do carimbo: "SUA MÃE · 1961", "SEU IRMÃO · 1995 A 2009".
  - B: manter como está.

## Pessoas

### P98. Com 35 nomes, a lista precisa de busca e de uma ordem que se entenda?

**Feito (opção A, com a troca de ordem):** "Procurar pelo nome" no alto, com a busca de pessoa do site, que abre a página de quem foi escolhido; dentro de cada família, ordem por geração, dos mais velhos aos mais novos, com os bichos no fim; e a troca "Por geração" ou "De A a Z", por link (`?ordem=nome`), sem script. Capturas: `pessoas/p98-busca-e-ordem-por-geracao--390.jpg`, `--1280.jpg`, `--1920.jpg`, `pessoas/p98-procurar-pelo-nome--390.jpg`, `pessoas/p98-ordem-de-a-a-z--1280.jpg`.

**muda a experiência**

- Contexto: cada família é um bloco, e dentro dele as pessoas seguem a ordem do cadastro. Há atalhos para cada família no alto.
- O que vi: em "Bayara" a ordem é Gui, Giovanna, Elizete, Aguilar, Vó Bela, Vó Vivica, Vô Tonho, Tia Lourdes, Tio Jorge, Prima Carol, Davi, Igor… Nem alfabética, nem por geração, nem por quem tem mais memórias. Em 390 px a página tem 4.624 px. Para achar o "Primo Téo", a pessoa lê tudo. Na produção serão mais nomes.
- Opções:
  - A (recomendada): um campo "Procurar pelo nome" no alto (a busca de pessoa que o site já tem) e, dentro de cada família, ordem por geração, dos mais velhos aos mais novos, com os bichos no fim.
  - B: só a ordem: alfabética dentro de cada família.
  - C: manter como está.
- Captura: `familia-pessoas-lista--1280.jpg`

### P99. Quem é de duas famílias aparece duas vezes. É o que se quer?

**Feito (opção A):** a repetição continua, e a conta de cada bloco vem por extenso ("19 pessoas · 2 bichos"). Capturas: as da P98.

**ajuste**

- Contexto: membros e parentes de cada família aparecem juntos no bloco dela.
- O que vi: Giovanna está em "Bayara" e em "Bayara Bracarense"; Lucas Magno, em "Bayara Bracarense" e em "Bracarense". São 37 linhas para 35 pessoas, e a soma dos blocos (21, 3, 8 e 5) não fecha com "32 pessoas · 3 bichos" do alto.
- Opções:
  - A (recomendada): manter a repetição (é assim que a família é) e escrever a conta do bloco por extenso, "21 pessoas", para ninguém somar.
  - B: cada pessoa uma vez só, na família em que nasceu, com uma marca da outra.
  - C: manter como está.

### P100. A lista tem três margens à esquerda. Alinhar?

**Feito (opção A):** os retratos nascem na margem do nome da família (73 px em 1280 e 93 px em 1920). Capturas: as da P98.

**detalhe**

- Contexto: "grid rígido e alinhado à esquerda" (`docs/visual.md`).
- O que vi: em 1280 px, o título e o bloco de cor começam em x = 49, os retratos em 57 e o nome da família, dentro do bloco, em 73. Em 1920 px: 69, 77 e 93.
- Opções:
  - A (recomendada): os retratos na mesma margem do nome da família (73 e 93), para as linhas nascerem debaixo dele.
  - B: os retratos na margem da página (49 e 69).
  - C: manter como está.

### P101. "0 memórias" precisa aparecer?

**Feito (opção A):** a linha das memórias some quando a conta é zero. Capturas: as da P98.

**detalhe**

- O que vi: Regina, Vô Zeca e outros três trazem "0 memórias" em mono.
- Opções:
  - A (recomendada): sem a linha quando a conta é zero.
  - B: manter como está.

## Pessoa

### P102. "A voz de Fulano" nunca aparece no acervo de exemplo. Pôr áudios de exemplo?

**Feito (opção A, só a tela):** o atalho "Ouvir a voz de Fulano · N áudios" no alto da página, que desce até os áudios e só conta os que quem olha pode ouvir. Os áudios de exemplo são de outra sessão. Conferido com áudios postos só no banco local. Capturas: `pessoas/p102-atalho-da-voz--390.jpg`, `--1280.jpg`, `--1920.jpg`, `pessoas/p102-a-voz-depois-do-atalho--390.jpg`.

**muda a experiência**

- Contexto: a ideia da tela é "o retrato e a voz". O bloco "A voz de Fulano" só aparece quando a pessoa tem relato com áudio.
- O que vi: nenhuma das 35 pessoas do acervo de exemplo tem áudio (o arquivo dos exemplos não cria nenhum). Em `/pessoas/vo-bela` a página vai do retrato direto para "Família e laços". Metade da ideia da tela não pôde ser vista, nem nas capturas da fase 3. Simulei o bloco no navegador (sem tocar nos dados): com "Sobre", "A voz" começa a 984 px do alto em 390 px, na segunda tela, e nada no alto avisa que há áudios.
- Opções:
  - A (recomendada): dois ou três áudios de exemplo curtos nos relatos da Vó Bela e de mais uma pessoa, e, no bloco do alto, um atalho "Ouvir a voz de Vó Bela · 3 áudios", que desce até eles.
  - B: só os áudios de exemplo.
  - C: manter como está, e conferir na homologação com um áudio enviado à mão.

### P103. No celular, "Família e laços" empurra as memórias para longe. Recolher?

**Feito (opção A):** no celular os laços ficam fechados numa linha, "Família e laços · 11 pessoas", que abre no lugar. Na página da Giovanna, "Memórias com Giovanna" passou de 2.108 px para cerca de 940 px do alto. Sem script a lista fica aberta. Capturas: `pessoas/p103-lacos-fechados--390.jpg`, `pessoas/p103-lacos-abertos--390.jpg`.

**muda a experiência**

- Contexto: a lista de laços é "o que fica quieto" na tela. A mesma questão apareceu no capítulo, e "Quem aparece" virou uma linha no celular para não empurrar as memórias.
- O que vi: em 390 px, na página da Giovanna, os laços (11 pessoas em seis grupos) ocupam 1.339 px, e "Memórias com Giovanna" começa a 2.108 px do alto, na terceira tela. Na da Vó Bela, com dois filhos, a 1.086 px.
- Opções:
  - A (recomendada): no celular, os laços fechados numa linha, "Família e laços · 11 pessoas", que abre no lugar. No computador, como está.
  - B: no celular, os laços depois das memórias.
  - C: os laços em linhas corridas por grupo, sem retrato ("Pais: Elizete, Aguilar"), como "Quem aparece".
  - D: manter como está.
- Captura: `familia-pessoa-lacos--390.jpg`

### P104. O botão cheio da página da pessoa deve ser "Editar página e laços"?

**Feito (opção A):** o botão cheio é "Nova memória com Fulano"; "Editar página e laços" (ou "Adicionar laço") e "Ver na árvore" são texto. Capturas: as da P102.

**ajuste**

- Contexto: "a ação principal fica no alto" (16/11). O botão cheio é "Editar página e laços" e, para quem não pode editar, "Adicionar laço".
- O que vi: como a Elizete, a página do Lúcio (sogro da filha dela) tem "Adicionar laço" como botão preto, a ação mais forte da tela. "Nova memória com Fulano", que é o que alimenta o acervo, fica como texto, em terceiro. Em 390 px as três ações empilham.
- Opções:
  - A (recomendada): o botão cheio é "Nova memória com Fulano"; editar e "Ver na árvore" como texto.
  - B: nenhuma ação cheia; as três como texto, numa linha.
  - C: manter como está.

### P105. No celular, o retrato é pequeno para uma tela que tem o retrato como ideia. Aumentar?

**Feito (opção A):** o retrato ocupa três das quatro colunas no celular (258 por 322 px). Captura: `pessoas/p107-a-propria-pagina--390.jpg`.

**ajuste**

- Contexto: o retrato em arco ocupa duas das quatro colunas em 390 px.
- O que vi: 167 por 208 px, com metade do bloco de cor vazia à direita. Em 1280 px ele tem 377 por 472 px e domina a tela.
- Opções:
  - A (recomendada): três das quatro colunas (cerca de 258 por 322 px).
  - B: o retrato na largura toda, com o texto por baixo.
  - C: manter como está.
- Captura: `familia-pessoa-alto--390.jpg`

### P106. Em 1920 px o retrato sai da margem da página. É de propósito?

**Feito (opção A):** em 1920 px o retrato fica nas colunas 1 a 4, na margem da página (x = 69, 572 por 715 px). Captura: `pessoas/p102-atalho-da-voz--1920.jpg`.

**ajuste**

- Contexto: em 1920 px o retrato vai para as colunas 2 a 4; em 1280 px fica nas colunas 1 a 4.
- O que vi: o retrato começa em x = 221, e tudo o mais da página (a marca, "Família e laços", "Memórias com") em x = 69. É a única peça fora da margem esquerda.
- Opções:
  - A (recomendada): colunas 1 a 4 também em 1920 px, maior, alinhado à margem.
  - B: manter como está.
- Captura: `familia-pessoa-alto--1920.jpg`

### P107. Na própria página, nada diz que é você. Marcar?

**Feito (opção A):** na própria página o carimbo começa com "VOCÊ", o botão é "Nova memória com você" e há o link quieto "Sua conta". Capturas: `pessoas/p107-a-propria-pagina--390.jpg`, `--1280.jpg`, `--1920.jpg`.

**ajuste**

- Contexto: na própria página, o nome é a linha grande, e os laços usam "sua mãe", "seu irmão".
- O que vi: `/pessoas/giovanna`, vista pela Giovanna, é igual à de qualquer pessoa: "Nova memória com Giovanna", sem "você" em lugar nenhum e sem caminho para "Sua conta" (a conta tem "Ver sua página", mas a volta não existe).
- Opções:
  - A (recomendada): o carimbo ganha "VOCÊ", a ação vira "Nova memória com você" e entra um link quieto "Sua conta".
  - B: só o link "Sua conta".
  - C: manter como está.

### P108. "Nascimento: 1999" deve ser um carimbo, sem rótulo?

**Feito (opção A):** o nascimento entra no carimbo das famílias, sem rótulo ("BAYARA · 1999", "1942 A 2019"). Quando o dia e o mês são conhecidos, eles continuam aparecendo ("4 DE MAIO DE 1942"). Capturas: as da P107.

**detalhe**

- Contexto: o comentário do código diz que a linha viraria itens de carimbo, "sem o rótulo quando é só o nascimento". Na tela sai "Nascimento: 1999", em mono, com dois-pontos.
- O que vi: nas páginas da Giovanna e do Caio. Na ficha da árvore a mesma pessoa aparece como "1999".
- Opções:
  - A (recomendada): junto do carimbo das famílias: "BAYARA · 1999" ou "1942 A 2019".
  - B: manter como está, e acertar o comentário.

## Nova pessoa e cadastro guiado

### P109. Na pergunta do casal, "Separação" e "Já terminou" dizem a mesma coisa de dois jeitos?

**Feito (opção A):** no cadastro guiado, "Como estão hoje?" oferece só Namoro, Noivado, Casamento e União, e "Já terminou" é o único caminho para o fim. Capturas: `p109-guiado-casal--390.jpg`, `p109-guiado-casal--1280.jpg`, `p109-guiado-casal--1920.jpg`.

**muda a experiência**

- Contexto: a pergunta "Fulano tem ou teve um casal?" pede "Como estão hoje?" (Namoro, Noivado, Casamento, União, Separação, Amizade), com "Casamento" já marcado, e logo abaixo a caixa "Já terminou". Está decidido que "Já terminou" acrescenta a separação depois da fase de hoje.
- O que vi: em 390 px, quem quer cadastrar um casal que se separou tem dois caminhos na mesma tela: marcar "Separação" em "Como estão hoje?" ou deixar "Casamento" e marcar "Já terminou". Marcar os dois também é possível. "Amizade" como resposta a "como estão hoje" pede a mesma leitura. É a tela em que mais se hesita no guiado.
- Opções:
  - A (recomendada): "Como estão hoje?" passa a oferecer só o que é estar junto (Namoro, Noivado, Casamento, União), e "Já terminou" continua sendo o único caminho para o fim. A separação e a amizade entram depois, em "O que aconteceu depois?".
  - B: tirar "Já terminou" do guiado e deixar só as seis fases, com "Terminou em" aparecendo quando a fase é Separação.
  - C: manter como está.
- Captura: `conta-guiado-casal--390.jpg`.

### P110. O título "Adicionar" acima do formulário de cada pergunta é preciso?

**Feito (opção A):** o título acima do formulário só aparece depois de alguém ser adicionado, como "Adicionar mais alguém". Capturas: `p110-sem-titulo--390.jpg`, `p110-sem-titulo--1280.jpg`, `p110-adicionar-mais-alguem--390.jpg`, `p110-adicionar-mais-alguem--1280.jpg`.

**detalhe**

- Contexto: cada pergunta do guiado é grande, em serifa. Abaixo dela vem um título "Adicionar", também em serifa, e no fim o botão "Adicionar".
- O que vi: em 1280 px, "Quem são os pais de Caio?" e, 110 px abaixo, "Adicionar" em 34 px, antes do campo "Pai ou mãe". A palavra aparece duas vezes na tela e o título não diz nada que a pergunta já não diga. Ele só ganha sentido depois de alguém ser adicionado, quando vira "Adicionar mais alguém".
- Opções:
  - A (recomendada): mostrar o título só quando já há alguém adicionado ("Adicionar mais alguém").
  - B: manter como está.

### P111. A trilha do cadastro deve mostrar quantas perguntas vêm?

**Feito (opção A):** mantido como está.

**detalhe**

- Contexto: a trilha numerada foi aprovada. Na tela dos dois caminhos ela mostra quatro passos ("Quem é", "Ligação", "Perguntas", "Pronto"). Depois da escolha, mostra seis.
- O que vi: em 390 px, a trilha passa de "1 2 3 4" para "1 2 3 4 5 6" ao escolher o caminho, e só o passo atual tem nome. A pessoa que achava estar no meio descobre que está no começo.
- Opções:
  - A (recomendada): manter como está. O nome "Perguntas" já avisa que há mais de uma, e a troca acontece uma vez só.
  - B: na tela dos caminhos, mostrar só "1 Quem é" e "2 Ligação", sem prometer o fim.

### P112. Na tela final, "Ver todos os tipos de laço" é o melhor nome para "adicionar mais um laço"?

**Feito (opção A):** na tela final, o link diz "Adicionar outro laço", ou "Adicionar um laço" quando não há nenhum. Capturas: `p112-fim-com-lacos--390.jpg`.

**detalhe**

- Contexto: a tela "Fulano está no acervo" tem o botão "Ver a página de Fulano" e dois links: "Ver todos os tipos de laço" e "Cadastrar outra pessoa".
- O que vi: em 390 px, com "Nenhum laço por enquanto." logo acima, o link que serve para adicionar um laço se chama "Ver todos os tipos de laço". Quem pulou as perguntas e quer voltar atrás não acha "Voltar" nem "Adicionar um laço".
- Opções:
  - A (recomendada): nesta tela o link diz "Adicionar outro laço" (ou "Adicionar um laço", quando não há nenhum).
  - B: manter como está.

### P113. "Foto, nascimento e história" e a frase ao lado parecem dois links?

**Feito (opção A):** só o nome do recolhido é sublinhado, a frase ao lado fica sem sublinhado, e na edição a frase sai. Capturas: `p113-nova-pessoa-recolhido--390.jpg`, `p113-nova-pessoa-recolhido--1280.jpg`, `p113-nova-pessoa-recolhido--1920.jpg`.

**detalhe**

- Contexto: a parte recolhida de "Nova pessoa" abre por um resumo com o nome e, ao lado, "(opcional, dá para preencher depois)".
- O que vi: em 1280 px, os dois trechos estão sublinhados separadamente, lado a lado, como duas ações. É um toque só. Na edição o resumo diz "Nascimento e história (opcional, dá para preencher depois)" mesmo com o nascimento já preenchido e a parte aberta.
- Opções:
  - A (recomendada): sublinhar só o nome, deixar a frase sem sublinhado, e na edição tirar a frase.
  - B: manter como está.

## Editar página e laços

### P114. A ficha e os laços devem continuar na mesma página, cada um com o seu "Salvar"?

**Feito (opção A):** a página continua única. Conferido antes: salvar um laço recarregava a página e o que estava escrito na ficha se perdia. Agora a ficha mexida fica guardada nesta aba ao salvar um laço, volta para os campos e um aviso em "Laços" leva de volta a ela. A foto escolhida não fica guardada, e o aviso diz. Capturas: `p114-aviso-da-ficha--390.jpg`, `p114-aviso-da-ficha--1280.jpg`, `p114-aviso-da-ficha--1920.jpg`.

**muda a experiência**

- Contexto: a página tem a ficha, com "Salvar página", e depois os laços, cada um com o próprio "Salvar". Foi decidido que a ficha vem antes dos laços.
- O que vi: em 390 px a página da Giovanna tem 4191 px. "Salvar página" fica no meio, perto de 2300 px do alto, e não salva o que está abaixo dele. Abaixo vêm seis lugares com botão próprio. Quem muda o nome, desce, edita um laço e toca em "Salvar" envia só o laço. Não testei se o que foi digitado na ficha se perde nesse caso, para não gravar nos dados de exemplo.
- Opções:
  - A (recomendada): manter a página única e avisar: se a ficha foi mexida e não foi salva, o "Editar" de um laço pergunta antes ou a ficha guarda o digitado. Pede conferir primeiro o que acontece hoje.
  - B: separar em duas telas, "Editar página" e "Editar laços", com os dois links na página da pessoa e na conta (que já aponta para `#lacos`).
  - C: manter como está.

### P115. Como se sai do editor de um laço sem salvar?

**Feito (opção A):** "Cancelar" em texto sublinhado ao lado de "Salvar", em todo editor de laço: fecha o cartão, desfaz o que foi mexido nele e devolve o foco ao "Editar". Capturas: `p117-zona-quieta--390.jpg`, `p121-quem-ve--1280.jpg`.

**ajuste**

- Contexto: "Editar" abre os campos do laço num cartão branco, no lugar. Dentro do cartão há "Salvar" e a zona de perigo.
- O que vi: nas três larguras, o cartão aberto não tem "Cancelar" nem "Fechar". O único jeito de fechar é tocar de novo em "Editar", que fica acima do cartão e não muda de nome. No casal, em 390 px, o cartão tem 1650 px de altura: quem chega ao fim e desiste precisa rolar duas telas para cima para achar o "Editar". As outras telas do site têm "Cancelar" ao lado do botão cheio ("Salvar página", "Cadastrar e ir para os laços").
- Opções:
  - A (recomendada): "Cancelar" em texto sublinhado ao lado de "Salvar", que fecha o cartão e desfaz o que foi mexido nele.
  - B: o link de cima passa a dizer "Fechar" enquanto o cartão está aberto.
  - C: manter como está.
- Captura: `conta-editar-casal-zona--1280.jpg`.

### P116. Os títulos dentro da tela de editar devem ter degraus?

**Feito (opção A):** "O que aconteceu depois?" passou a um título menor, sem serifa, e o título "Ficha" ficou só para o leitor de tela, com "Quem é" abrindo a parte. Capturas: `p116-ficha-sem-titulo--390.jpg`, `p116-ficha-sem-titulo--1280.jpg`, `p116-ficha-sem-titulo--1920.jpg`, `p120-fase-sera-removida--390.jpg`.

**ajuste**

- Contexto: a pergunta grande em serifa é a ideia dos formulários. Dentro de uma parte, ela desce um degrau.
- O que vi: "Laços" (o título da parte), "Adicionar outro laço" e "O que aconteceu depois?" (dentro do cartão do casal, que está dentro de um item da lista) têm o mesmo tamanho: 24 px em 390, 34 px em 1280 e 40 px em 1920. Na ficha, "Ficha" e "Quem é" vêm um em cima do outro, do mesmo tamanho, e depois "Foto de retrato", "Nascimento", "Sobre" e "Família", todos iguais. Já os grupos "Pais", "Filhos" e "Casal" são rótulos de 12 px. O que está mais fundo na página fala mais alto que o que o contém.
- Opções:
  - A (recomendada): dentro do cartão de um laço, as perguntas ("O que aconteceu depois?") passam a rótulo ou a um título menor, e na ficha sai o "Ficha" ou o "Quem é".
  - B: só tirar "Ficha", que repete o índice.
  - C: manter como está.
- Captura: `conta-editar-casal-fases--390.jpg`.

### P117. A zona de perigo dentro do cartão de um laço deve ser mais quieta?

**Feito (opção A):** dentro do cartão, a zona é uma linha fina na cor de alerta com o rótulo e o link, sem fundo, a 40 px do "Salvar", e só vira bloco com a pergunta aberta. Capturas: `p117-zona-quieta--390.jpg`, `p117-zona-quieta--1280.jpg`, `p117-zona-quieta--1920.jpg`, `p117-zona-pergunta-aberta--390.jpg`, `p117-zona-pergunta-aberta--1280.jpg`, `p117-zona-pergunta-aberta--1920.jpg`.

**ajuste**

- Contexto: a zona de perigo foi pedida para as telas de editar, e dentro do editor de laço ela é a versão menor. Esta pergunta é sobre o tamanho e o peso dela dentro do cartão. O nome e os textos já estão na pergunta aberta do PR #39.
- O que vi: no editor de uma filiação, que tem um campo só, a zona com a pergunta aberta ocupa 339 dos 560 px do cartão em 390 px, e mesmo fechada é um bloco rosado com borda vermelha, mais chamativo que o campo e o "Salvar". A distância até o "Salvar" é de 24 px. Com a pergunta aberta são quatro camadas, uma dentro da outra: o papel, o cartão branco, a zona rosada e a caixa branca com a barra vermelha.
- Opções:
  - A (recomendada): dentro do cartão, a zona vira uma linha fina na cor de alerta com o rótulo e o link, sem fundo, e só ganha o bloco quando a pergunta abre. A distância até o "Salvar" sobe para a de entre grupos.
  - B: manter o bloco e só aumentar a distância até o "Salvar".
  - C: manter como está.
- Captura: `conta-editar-filiacao-zona--390.jpg`, `conta-editar-filiacao-zona--1280.jpg`, `conta-editar-filiacao-zona--1920.jpg`, `conta-editar-casal-zona--390.jpg`, `conta-editar-casal-zona--1920.jpg`.

### P118. "Tirar foto" pode ser lido como "fotografar"?

**Feito (opção A):** a ação do retrato se chama "Remover foto". Capturas: `p118-remover-foto--390.jpg`.

**ajuste**

- Contexto: no retrato, as ações são "Trocar foto" e "Tirar foto", nomes combinados em 16/11/2026.
- O que vi: nas três larguras, "Tirar foto" fica ao lado de "Trocar foto", sem confirmação. No celular, "tirar foto" é o que a câmera faz. Quem toca esperando a câmera vê o retrato sumir e a frase "A foto sai quando você salvar a página.". Nas fotos da memória a mesma ação se chama "Remover foto".
- Opções:
  - A (recomendada): "Remover foto", o mesmo nome das fotos da memória.
  - B: "Ficar sem foto".
  - C: manter como está.

### P119. O quadro de enquadrar deve mostrar o arco em que o retrato aparece?

**Feito (opção A):** o quadro desenha por cima o arco em que o retrato aparece, com o que fica de fora mais apagado. Capturas: `p119-quadro-com-arco--390.jpg`, `p119-quadro-com-arco--1280.jpg`, `p119-quadro-com-arco--1920.jpg`.

**ajuste**

- Contexto: o retrato aparece no site recortado em arco, mais alto que largo (104 por 130 px na própria tela de editar). O quadro de enquadrar é um quadrado de 288 px.
- O que vi: nas três larguras, a pessoa enquadra num quadrado com cantos retos e o resultado aparece num arco de outra proporção, que corta os cantos de cima e as laterais. O que ela enquadrou não é o que ela vê depois. A dica diz "Assim vai ficar." só depois de tocar em "Usar esta foto".
- Opções:
  - A (recomendada): desenhar por cima do quadro a máscara do arco, com o que fica de fora mais apagado.
  - B: manter o quadrado e mostrar ao lado, enquanto se arrasta, o retrato em arco.
  - C: manter como está.
- Captura: `conta-editar-retrato-enquadrar--390.jpg`.

### P120. "Remover esta fase" deve continuar como uma caixa de marcar dentro da fase?

**Feito (opção A):** a caixa continua, e a linha da fase marcada aparece riscada, com "será removida ao salvar", mesmo com a fase fechada. Capturas: `p120-fase-sera-removida--390.jpg`, `p120-fase-sera-removida--1280.jpg`, `p120-fase-sera-removida--1920.jpg`.

**ajuste**

- Contexto: no casal, cada fase abre com "Mudar". Dentro dela, quando há mais de uma fase, existe a caixa "Remover esta fase", que vale quando o casal é salvo.
- O que vi: em 390 e 1280 px, é a única ação de apagar da tela que fica fora da zona de perigo e que não é um botão. Depois de marcada, a linha da fase continua dizendo "1. Namoro", sem sinal de que vai sair. Fechando a fase, a marca some da vista e o "Salvar o casal" remove sem avisar.
- Opções:
  - A (recomendada): manter a caixa e marcar a linha da fase quando ela está marcada (riscada, com "será removida ao salvar").
  - B: trocar por um link "Remover esta fase", com a mesma pergunta no lugar das outras remoções.
  - C: manter como está.

### P121. "Só os dois veem este casal" está no lugar certo?

**Feito (opção A):** a caixa vem depois de um fio, com o rótulo "Quem vê", antes de "Salvar o casal". Capturas: `p121-quem-ve--390.jpg`, `p121-quem-ve--1280.jpg`, `p121-quem-ve--1920.jpg`.

**ajuste**

- Contexto: a caixa vale para o casal inteiro. No cartão, ela vem logo depois dos campos de "O que aconteceu depois?".
- O que vi: nas três larguras, a caixa fica 50 px abaixo do campo "Em que ano?" da fase nova, com o mesmo respiro dos campos da fase. Parece dizer que só os dois veem a fase nova. É a escolha de privacidade do casal e está escondida entre os campos de uma parte opcional.
- Opções:
  - A (recomendada): separar com um fio e um rótulo "Quem vê", antes do "Salvar o casal".
  - B: levar a caixa para o alto do cartão, antes das fases.
  - C: manter como está.
- Captura: `conta-editar-casal-zona--1280.jpg`.

### P122. O "Editar" de cada laço pode ficar na mesma linha do nome?

**Feito (opção A):** a partir de 1280 px, "Editar" fica à direita, na linha do nome. No celular, como estava. Capturas: `p122-lacos-lista--390.jpg`, `p122-lacos-lista--1280.jpg`, `p122-lacos-lista--1920.jpg`.

**ajuste**

- Contexto: cada laço é uma linha com o nome e o parentesco, e "Editar" abaixo.
- O que vi: em 390 px cada laço ocupa perto de 100 px, metade deles para o "Editar" sozinho numa linha. Em 1280 px a linha tem 704 px de largura, o nome e o parentesco ocupam 200 px, e o "Editar" continua embaixo, com o resto da linha vazio. A lista da Giovanna, com cinco laços, leva uma tela e meia do celular antes de abrir qualquer um.
- Opções:
  - A (recomendada): a partir de 1280 px, "Editar" à direita na mesma linha. No celular, como está.
  - B: nas três larguras, "Editar" à direita na mesma linha.
  - C: manter como está.

### P123. Os campos devem terminar na mesma linha que o resto da página?

**Feito (opção A):** mantido como está.

**detalhe**

- Contexto: grid rígido, tudo começa na mesma linha à esquerda.
- O que vi: em 1280 px, os campos "Nome", "Como é chamado" e "Sobre" terminam em 1082 px, e a linha de mês e dia, os laços e os fios terminam em 1155 px. Em 1920 px, 1348 contra 1506. À esquerda tudo alinha. À direita há duas bordas, 73 e 158 px distantes.
- Opções:
  - A (recomendada): manter como está. O campo de texto segue a medida de leitura, e a esquerda é a que conta.
  - B: os campos de uma linha vão até a borda da coluna.

### P124. O quadro de enquadrar pode crescer na tela grande?

**Feito (opção A):** a partir de 1280 px o quadro tem 416 px, com "Aproximar" e os botões ao lado. Capturas: `p119-quadro-com-arco--1280.jpg`, `p119-quadro-com-arco--1920.jpg`.

**detalhe**

- Contexto: o desktop é a versão de ver junto.
- O que vi: em 1920 px o quadro tem os mesmos 288 px do celular, dentro de um cartão de 832 px. O resto do cartão fica vazio, e o rosto se enquadra num quadro pequeno numa tela enorme.
- Opções:
  - A (recomendada): o quadro cresce até uns 420 px a partir de 1280 px, com "Aproximar" e os botões ao lado.
  - B: manter como está.
- Captura: `conta-editar-retrato-enquadrar--1920.jpg`.

### P125. As famílias que a pessoa não pode mudar devem aparecer como caixas travadas?

**Feito (opção A):** as famílias que a pessoa não pode mudar viram texto ("Gui é da família Bayara."), e só aparecem caixas para o que dá para mexer. Capturas: `p125-familias--390.jpg`, `p125-familias--1280.jpg`, `p125-familias--1920.jpg`.

**detalhe**

- Contexto: em "Família", as famílias de quem acessa o site são marcadas pelos administradores, e a frase da parte avisa.
- O que vi: nas três larguras, "Bayara" e "Bayara Bracarense" aparecem como caixas marcadas, com borda tracejada e o nome em texto suave sobre o pastel (contraste de 4,1 para um, abaixo de 4,5). Ao lado, "Bracarense" aparece normal. Parece um controle quebrado: metade responde e metade não.
- Opções:
  - A (recomendada): o que não muda vira texto ("Giovanna é das famílias Bayara e Bayara Bracarense."), e só aparecem caixas para o que a pessoa pode mexer.
  - B: manter as caixas e escurecer o texto das travadas.
  - C: manter como está.

## Nova memória

### P126. No celular, a pergunta da etapa pode subir para o alto da tela?

**muda a experiência**

- Contexto: a ideia forte dos formulários é uma pergunta por tela, grande. A frase da abertura entrou por decisão do Gui.
- O que vi: em 390 x 844, antes da pergunta vêm o título, a frase de boas-vindas, a frase com lacunas e a trilha. "O que aconteceu?" começa em y = 526, e "Continuar" em y = 972, fora da tela. Ao avançar, a página rola até a trilha, e aí a pergunta fica perto do alto. O problema é a chegada e o retorno depois de salvar.
- Opções:
  - A (recomendada): no celular, a frase de boas-vindas só na etapa 1 e a frase com lacunas abaixo da pergunta, ou recolhida numa linha pequena.
  - B: ao chegar, rolar até a trilha, como já acontece ao avançar.
  - C: manter como está.
- Captura: `form-nova-abertura--390.jpg`

### P127. Depois de salvar o rascunho, a pessoa volta para a etapa em que estava?

**muda a experiência**

- Contexto: "Salvar rascunho" está em todas as etapas. Hoje a página recarrega na etapa 1 (o aviso de rascunho salvo passou a aparecer no alto, nesta rodada).
- O que vi: salvei na etapa 7 e caí na etapa 1, no alto. Para seguir, são seis toques em "Continuar" ou um na trilha.
- Opções:
  - A (recomendada): voltar na mesma etapa, com o aviso à vista.
  - B: sair do formulário e ir para "Rascunhos", com o aviso lá.
  - C: manter a volta para a etapa 1, só com o aviso à vista.

### P128. Frase da abertura: o que as lacunas vazias dizem? (PR #39, pergunta 5)

**ajuste**

- Contexto: vazia, cada lacuna precisa dizer o que falta.
- O que vi: "Isso aconteceu *em que data?* *em que lugar?* *com quem?*". Preenchida: "Isso aconteceu em 2024, em Ouro Preto, com Gui, Giovanna, Elizete e mais 2." Visto nesta rodada: com as três vazias, a frase não tem vírgula e ocupa duas linhas em 390 px, com "em" numa linha e "que lugar?" na outra. Preenchidas, as lacunas tomam a cor viva da família da tela, que muda de uma memória para outra sem a pessoa ter escolhido nada.
- Opções:
  - A (recomendada): perguntas nas lacunas vazias, como está. É o mesmo "em que data?" já aprovado na etapa.
  - B: traços no lugar das perguntas ("em ___, em ___, com ___").
  - C: só aparece o que já foi preenchido, e a frase cresce aos poucos.

### P129. Resumo ao lado: o que entra e como se chama? (PR #39, pergunta 7)

**ajuste**

- Contexto: a partir de 1280 px, "A memória até aqui" acompanha o preenchimento.
- O que vi: o título "A memória até aqui", o título da memória em serifa e a ficha com Tipo, Quando, Onde, Quem estava (quatro nomes e "e mais N"), Fotos, Capítulo e Quem vê. Os temas e o relato ficaram de fora. Visto nesta rodada: sem tipo escolhido, o cartão aparece lilás, com a estrela de "Outro", antes de qualquer escolha, e parece que o site já escolheu um tipo.
- Opções:
  - A (recomendada): como está, e o cartão sem tipo passa a ser neutro (papel, sem ícone) até a pessoa escolher.
  - B: como está, sem mudar o cartão.
  - C: sem "Quem vê" e "Capítulo", que são das últimas etapas.
  - D: com os temas e uma linha do relato.

### P130. Resumo ao lado nos outros formulários? (PR #39, pergunta 8)

**ajuste**

- Contexto: o pedido vale para os formulários em 1280 e 1920 px. Na Nova memória ele acompanha o preenchimento.
- O que vi: no relato, a foto-chave e a ficha da memória. No capítulo, na pessoa e nas telas utilitárias, nada à direita. Medido nesta rodada, em 1920 px: o capítulo novo deixa 570 px vazios à direita, e a coluna da pergunta começa em x = 674, enquanto na Nova memória começa em 523. As duas telas de formulário com etapas têm grades diferentes.
- Opções:
  - A (recomendada): só na memória e no relato, como está, mas com a mesma grade nos outros formulários (a pergunta começa na mesma coluna).
  - B: no capítulo, a capa dele (título, período, quantas memórias); na pessoa, o retrato e o parentesco.
  - C: manter como está.

### P131. Zona de perigo: o nome, os textos e o que entra? (PR #39, pergunta 9)

**ajuste**

- Contexto: o bloco se chama "Zona de perigo", com uma frase dizendo o que acontece e o caminho para a confirmação ("Excluir esta memória", "Descartar este rascunho", "Excluir capítulo"). No editor de cada laço, "Remover este laço" e "Apagar, foi cadastrado por engano" ficam numa zona menor, depois do "Salvar". "Remover foto" e "Tirar foto" ficaram onde estavam.
- O que vi: nesta rodada, em 1920 px, o bloco tem 832 px de largura para uma linha de texto e um link, e o raio grande com o fundo rosado chama mais atenção que o botão principal da etapa. Em 1280 px ele sai 3,5 px para cada lado da coluna da pergunta (350,7 a 929,3 contra 354,2 a 925,8), o que ficou sem correção nesta rodada. Dentro dos editores de laço, vistos na tela pela primeira vez: a zona fica depois do "Salvar", a 24 px dele, e cabe no cartão nas três larguras. Ela não tem a frase que diz o que acontece (a da memória tem), e remover um laço não vai para a lixeira. O link é vermelho na memória e no capítulo e da cor do texto no laço. São dois verbos ("Remover este laço" com o botão "Remover", e "Apagar, foi cadastrado por engano" com o botão "Apagar", que quebra em duas linhas em 390 px). O botão vermelho que confirma leva a seta de avançar. Esc não fecha a pergunta aberta.
- Opções:
  - A (recomendada): o nome e os textos como estão, com o bloco mais quieto: da largura do texto, sem fundo, só o fio e o título na cor de alerta.
  - B: como está.
  - C: outro nome: "Apagar" ou "Cuidado".
  - D: "Tirar foto" do retrato também dentro de uma zona, no fim da ficha.
- Em qualquer opção, vale acertar o que destoa no laço: a frase do que acontece, o link na cor de alerta e o botão de confirmar sem a seta.
- Captura: conta-editar-casal-zona--390.jpg, conta-editar-casal-zona--1280.jpg

### P132. "Salvar rascunho" só com o título pede o ano. É o que se quer?

**ajuste**

- Contexto: a abertura diz que dá para salvar como rascunho a qualquer momento, mas o ano é obrigatório também no rascunho. O tipo de momento, não.
- O que vi: quem escreve só o título e toca em "Salvar rascunho" recebia "Informe o ano" na etapa 1, onde não há ano (corrigido nesta rodada: o aviso agora leva a "Quando e onde", com o foco no ano). Mas quem ainda não escolheu o tipo não consegue passar da etapa 1, e fica nela com o aviso 'Informe o ano, mesmo que seja aproximado, na etapa "Quando e onde".', texto novo desta rodada.
- Opções:
  - A (recomendada): o rascunho pode ser salvo só com o título. O ano passa a ser obrigatório só para publicar, como o tipo.
  - B: manter o ano obrigatório no rascunho, com o aviso novo.
  - C: manter, e a frase da abertura deixa de prometer "a qualquer momento".

### P133. Na etapa "Quando e onde", a pergunta e a frase precisam ser as duas grandes?

**ajuste**

- Contexto: a frase com lacunas é a própria pergunta dessa etapa. A legenda "Quando e onde foi?" continua em cima.
- O que vi: em 390 px as duas têm 32,6 px, uma logo acima da outra. Em 1920 px, as duas passam de 60 px e ocupam do alto até y = 490. São dois títulos na mesma tela.
- Opções:
  - A (recomendada): nessa etapa a legenda fica só para o leitor de tela e a frase é a pergunta.
  - B: a legenda fica pequena, em mono, como rótulo.
  - C: manter como está.
- Captura: `form-nova-quando-e-onde--1920.jpg`

### P134. Na última etapa, os dois resumos ficam lado a lado?

**ajuste**

- Contexto: "A memória até aqui" acompanha todas as etapas no computador, e "Confira antes de publicar" aparece na última.
- O que vi: em 1280 e 1920 px, a última etapa mostra as mesmas informações duas vezes, uma ao lado da outra. A ordem também difere: o resumo final diz Quando, Quem, Onde; o do lado diz Quando, Onde, Quem estava; a frase diz data, lugar, quem.
- Opções:
  - A (recomendada): na última etapa o resumo ao lado mostra só a foto e o título, e a ficha fica em "Confira antes de publicar". As três peças usam a ordem da frase.
  - B: só alinhar a ordem.
  - C: manter como está.
- Captura: `form-correcao-dois-resumos--1920.jpg`

### P135. Na correção, o botão cheio muda de lugar em relação à memória nova?

**ajuste**

- Contexto: o Gui aprovou "Continuar" cheio e o envio em contorno quando os dois convivem.
- O que vi: na memória nova, o botão cheio é sempre o último (à direita no computador, embaixo no celular). Na correção, "Continuar" cheio vem antes e "Salvar alterações" em contorno fica à direita (1280 px: x = 511 e x = 717) ou embaixo (390 px). Na última etapa o cheio volta para a direita. Quem aprende "o botão de seguir é o da ponta" erra na correção.
- Opções:
  - A (recomendada): "Continuar" sempre na ponta, e "Salvar alterações" em contorno antes dele.
  - B: "Salvar alterações" vira texto sublinhado, como "Salvar rascunho".
  - C: manter como está.
- Captura: `form-correcao-botoes-e-zona--390.jpg`

### P136. A zona de perigo aparece em todas as etapas?

**ajuste**

- Contexto: pedido do Gui, para o apagar ficar longe do salvar.
- O que vi: no rascunho e na correção, o bloco vermelho aparece embaixo de cada uma das etapas. Em 390 px, fica uns 70 px abaixo de "Continuar". Na etapa "Fotos" do rascunho, os dois cabem na mesma tela. Em 1280 px, na etapa 1, fica 366 px abaixo dos botões, por causa da altura do resumo ao lado.
- Opções:
  - A (recomendada): só na última etapa, depois do resumo.
  - B: só na primeira etapa.
  - C: manter em todas.
- Captura: `form-rascunho-zona-em-toda-etapa--390.jpg`

### P137. "Quem está contando" precisa ser o primeiro campo do relato?

**ajuste**

- Contexto: serve para registrar o relato de quem não usa o site. Quase sempre a resposta é "Eu".
- O que vi: é o primeiro campo de "Como foi?". Ao receber o foco, abre uma lista de 30 linhas ("Aguilar, e eu estou escrevendo"…) que cobre o áudio e o começo do texto em 390 px.
- Opções:
  - A (recomendada): o campo vai para depois do texto, como uma linha "Estou escrevendo por outra pessoa", que abre a busca.
  - B: fica onde está, e a lista só abre quando a pessoa digita.
  - C: manter como está.
- Captura: `form-nova-quem-esta-contando--390.jpg`

### P138. A frase da abertura pode usar a largura que sobra no computador?

**ajuste**

- Contexto: a frase fica no alto, acima das três colunas.
- O que vi: em 1280 px a frase tem 704 px de largura e "com quem?" quebra no meio ("com" numa linha, "quem?" na outra), com 480 px livres à direita. Em 1920 px tem 832 px e quebra igual, com mais de 900 px livres.
- Opções:
  - A (recomendada): a frase vai até a largura do miolo e cada lacuna curta não quebra no meio.
  - B: só impedir a quebra dentro das lacunas vazias.
  - C: manter como está.
- Captura: `form-nova-frase-quebra--1280.jpg`

### P139. Em 1920 px, os campos acompanham a largura da coluna?

**ajuste**

- Contexto: a rodada anterior não olhou os formulários em 1920 px.
- O que vi: a coluna da pergunta vai de x = 523 a 1355 (832 px). O título, a busca e o texto do relato param em 1197 (674 px), e o fio e os botões vão até 1355. A margem direita dos campos e a das ações não coincidem. A trilha ocupa 421 px para nomes de 150 px. A composição se sustenta, com a foto do resumo maior.
- Opções:
  - A (recomendada): as ações param na mesma largura dos campos (674 px).
  - B: os campos vão até a largura da coluna.
  - C: manter como está.
- Captura: `form-nova-abertura--1920.jpg`

### P140. Frase da abertura: ela sai na etapa "Quando e onde"? (PR #39, pergunta 6)

**detalhe**

- Contexto: nessa etapa a frase com a data e o lugar já é a própria pergunta, logo abaixo.
- O que vi: a frase da abertura some só nessa etapa e volta nas outras. Visto nesta rodada: ao sair, a página encurta 116 px e a trilha sobe. Quem vai e volta entre as etapas 1, 2 e 3 vê a trilha mudar de altura duas vezes.
- Opções:
  - A (recomendada): sai nessa etapa, como está.
  - B: fica sempre, mesmo repetida. A trilha não muda de lugar.
  - C: fica só na primeira etapa.

### P141. "Fotos" vira pergunta, como as outras etapas?

**detalhe**

- Contexto: uma pergunta por tela, como quem conversa.
- O que vi: as legendas são "O que aconteceu?", "Quando e onde foi?", "Quem estava?", "Como foi?", "Faz parte de algo maior?" e "Quem pode ver?". Só a quarta é um rótulo: "Fotos".
- Opções:
  - A (recomendada): "Tem fotos desse dia?"
  - B: "Quais fotos entram?"
  - C: manter "Fotos".

### P142. "criar um capítulo" abre outra aba no meio da memória?

**detalhe**

- Contexto: etapa "Capítulo e temas".
- O que vi: o link abre `/capitulos/novo` em aba nova (`target="_blank"`), sem avisar. No celular, a pessoa passa a ter duas abas do site e a lista de capítulos da memória não se atualiza ao voltar. O link tem 18 px de altura, dentro de uma frase.
- Opções:
  - A (recomendada): tirar o link e deixar a frase: "Dá para criar o capítulo depois e colocar esta memória nele."
  - B: manter o link e escrever "(abre em outra aba)".
  - C: manter como está.

### P143. O ano fora do intervalo ganha aviso ao lado, como o 31 de fevereiro?

**detalhe**

- Contexto: a data que não existe é avisada ao lado dos campos. Para o ano antes de 1800 ou depois do ano atual só há o balão do navegador.
- O que vi: com 1700 ou 2090, "Continuar" segura e aparece só o balão, no idioma do navegador. A lacuna da frase chega a escrever "em 1700".
- Opções:
  - A (recomendada): o mesmo aviso ao lado ("O ano vai de 1800 a 2026.").
  - B: manter só o balão.

### P144. A lacuna do lugar acompanha o tamanho do que foi escrito?

**detalhe**

- Contexto: a lacuna do lugar é um campo de largura fixa.
- O que vi: com "Belo Horizonte", em 1920 px, o campo vai até x = 1056 e o ponto final fica solto, 100 px depois da última letra. Em 390 px, vazio, o ponto fica sozinho no fim da linha.
- Opções:
  - A (recomendada): o campo cresce e encolhe com o texto.
  - B: tirar o ponto final da frase da etapa.
  - C: manter como está.

### P145. O sublinhado da ação de perigo muda de cor ao passar o mouse?

**detalhe**

- Contexto: toda ação em texto ganha o sublinhado na cor viva da família ao passar o mouse.
- O que vi: "Descartar este rascunho" fica com o texto vermelho e o sublinhado verde no rascunho de exemplo, e amarelo na correção.
- Opções:
  - A (recomendada): dentro da zona de perigo, o sublinhado continua na cor de alerta.
  - B: manter como está.

### P146. No teclado, o ano vem antes dos botões de −10 e −1?

**detalhe**

- Contexto: o controle da data, na ordem ano, mês e dia.
- O que vi: a ordem do Tab é a lacuna da data, o lugar, "Dez anos antes", "Um ano antes" e só então o ano. São dois toques a mais para o campo que quase todo mundo vai digitar. O campo do calendário tem quatro paradas próprias do navegador.
- Opções:
  - A (recomendada): manter a ordem visual, e a lacuna da data continua pondo o foco direto no ano.
  - B: os quatro botões saem da ordem do Tab e o ano responde às setas para cima e para baixo.

## Meu relato

### P147. O relato tem um caminho de volta sem salvar?

**ajuste**

- Contexto: a tela tem só "Salvar alterações" (ou "Publicar relato" e "Salvar rascunho").
- O que vi: quem abre e desiste só volta pelo link do título da memória na abertura, ou pelo "voltar" do navegador. As confirmações de excluir têm "Cancelar" ao lado do botão.
- Opções:
  - A (recomendada): "Voltar para a memória", em texto sublinhado, ao lado do botão.
  - B: manter como está.

## Sua conta

### P148. Os números de "O que você criou" devem ter o tamanho do nome da pessoa?

**Feito (opção A):** os números desceram para o tamanho de título de parte e, a partir de 1280 px, ficam numa linha só com o nome curto ("24 memórias", "19 relatos"), cada um abrindo a sua lista na largura do cartão; o cartão passou para depois dos laços, na largura toda. Capturas: `p148-contas-numa-linha--390.jpg`, `p148-contas-numa-linha--1280.jpg`, `p148-contas-numa-linha--1920.jpg`.

**muda a experiência**

- Contexto: a ideia da conta é o retrato e o nome no alto, e as coisas da pessoa em ordem. O número grande foi construído no grupo 2.
- O que vi: o nome ("Gui") e cada um dos quatro números ("24", "19", "45", "4") têm o mesmo tamanho de letra: 45 px em 390, 91 px em 1280 e 124 px em 1920. Em 1920 px o cartão "O que você criou" tem 714 px de altura e é a parte mais forte da página, mais que o alto. As contas são curiosidade. Os rascunhos, que são o que a pessoa vem buscar, estão em letra de texto no cartão ao lado.
- Opções:
  - A (recomendada): os números descem para o tamanho de título de parte, numa linha só em 1280 e 1920 px ("24 memórias · 19 relatos · 45 fotos · 4 capítulos"), cada um abrindo a sua lista.
  - B: manter os números grandes e passar o cartão para o fim da página, depois dos laços.
  - C: manter como está.
- Captura: `conta-conta-criou--1280.jpg`, `conta-conta-criou--1920.jpg`.

### P149. O cartão "Seus dados" precisa existir na tela grande?

**Feito (opção A):** o cartão "Seus dados" saiu; o nascimento, o apelido (quando é diferente do nome) e, na produção, o e-mail de acesso ficam numa linha em mono abaixo do nome, só com o que existe, e os rascunhos são o primeiro cartão. O texto "Sobre você" deixou de aparecer na conta (continua na página da pessoa). Capturas: `p149-alto-e-cartoes--390.jpg`, `p149-alto-e-cartoes--1280.jpg`, `p149-alto-e-cartoes--1920.jpg`, `p149-alto-elizete--1280.jpg`.

**ajuste**

- Contexto: o cartão mostra nome, como é chamado na família e nascimento, e na produção o e-mail de acesso. "Editar seus dados" é o botão do alto.
- O que vi: em 1280 px o cartão tem 679 por 382 px e três dados no canto de cima, um deles o nome, que está a 91 px logo acima. Em 1920 px, 1026 por 402 px. Ele estica para acompanhar o cartão dos rascunhos ao lado e fica quase todo vazio. "Não informado" aparece duas vezes na conta da Elizete.
- Opções:
  - A (recomendada): os dados sobem para o alto, numa linha em mono abaixo do nome ("1992 · chamado de …"), e o cartão sai. Os rascunhos passam a ser o primeiro cartão.
  - B: manter o cartão e não esticar a altura dele.
  - C: manter como está.
- Captura: `conta-conta-alto--1280.jpg`, `conta-conta-alto--1920.jpg`.

### P150. A página Rascunhos ainda é precisa?

**Feito (opção A):** a página `/rascunhos` saiu; na lixeira o link é "Voltar para a sua conta", e descartar um rascunho volta para a conta, com o recado.

**ajuste**

- Contexto: está decidido que a lixeira tem um link fixo no alto da página Rascunhos e que, no visual novo, ela mora também na conta. A conta lista os rascunhos no próprio cartão.
- O que vi: nenhum link do site leva a `/rascunhos`, fora "Ver os rascunhos" na lixeira e o retorno de descartar um rascunho. O menu não tem, a conta não tem. A página mostra a mesma lista do cartão da conta, com a data por extenso. São duas listas da mesma coisa, e uma delas só se acha passando pela lixeira.
- Opções:
  - A (recomendada): a página sai. "Ver os rascunhos" na lixeira vira "Voltar para a sua conta", e descartar um rascunho volta para a conta.
  - B: a página fica e o cartão da conta ganha "Ver todos os rascunhos" quando passam de três.
  - C: manter como está.

### P151. A lista aberta de "O que você criou" deve mostrar tudo de uma vez?

**Feito (opção A):** a lista aberta mostra as dez mais recentes, com "As 10 mais recentes de 24." e "Ver todas no Explorar" (capítulos: "Ver todos em Capítulos"). O Explorar não tem filtro de quem criou, então o link abre o Explorar inteiro. Capturas: `p151-lista-aberta--390.jpg`, `p151-lista-aberta--1280.jpg`, `p151-lista-aberta--1920.jpg`, `p151-fotos-abertas--1280.jpg`.

**detalhe**

- Contexto: cada conta abre no lugar a lista inteira, uma por vez.
- O que vi: em 390 px, a lista de memórias da Elizete (10) deixa o cartão com 804 px. A do Gui tem 24 memórias e 45 fotos. Na produção, com o acervo cheio, a lista aberta passa de várias telas e empurra os laços e a administração para longe.
- Opções:
  - A (recomendada): mostrar as dez mais recentes e um link "Ver todas no Explorar", com o filtro de quem criou, se existir.
  - B: manter como está.

### P152. "Nada seu na lixeira." serve para quem administra?

**Feito (opção A):** para quem administra, a frase conta o que a lixeira mostra ("Nada na lixeira.", "Uma coisa na lixeira.", "3 coisas na lixeira."); para os demais, continua a conta do que é deles. Captura: `p149-alto-e-cartoes--1280.jpg`.

**detalhe**

- Contexto: a conta conta só o que a própria pessoa mandou para a lixeira. A lixeira dos administradores mostra tudo o que eles enxergavam.
- O que vi: como `giovanna`, a conta diz "Nada seu na lixeira." e "Abrir a lixeira" mostra "Natal de 2016 (foto repetida)", excluída pelo Gui. A frase está certa, mas quem lê espera uma lixeira vazia.
- Opções:
  - A (recomendada): para administradores, a frase conta o que a lixeira mostra ("Uma memória na lixeira.").
  - B: manter como está.

### P153. Na administração, "Baixar cópia do acervo" e "Famílias e membros" dizem o que acontece?

**Feito (opção A):** o link passou a "Famílias", e "Baixar cópia do acervo" foi para uma linha própria, junto de "Banco: 0,4 MB de 500 MB". Capturas: `p153-administracao--390.jpg`, `p153-administracao--1280.jpg`, `p153-administracao--1920.jpg`.

**detalhe**

- Contexto: os rótulos da administração foram aprovados em 17/11/2026. A lista é uma fila de seis links iguais.
- O que vi: "Baixar cópia do acervo" baixa um arquivo ao toque e tem a mesma aparência dos cinco que abrem página. "Famílias e membros" abre a página "Famílias", que só tem os sobrenomes de cada família e nada sobre membros.
- Opções:
  - A (recomendada): o link passa a "Famílias", e "Baixar cópia do acervo" vai para uma linha própria, junto de "Banco: 0,4 MB de 500 MB".
  - B: manter como está.

## Rascunhos e lixeira

### P154. "Restaurar" deve tirar a pessoa da lixeira?

**Feito (opção A):** restaurar deixa a pessoa na lixeira, com o recado "Rascunho restaurado." (ou "Memória restaurada.", "Capítulo restaurado.") e o link "Continuar o rascunho" (ou "Ver a memória", "Ver o capítulo"). Capturas: `p154-restaurar-fica-na-lixeira--390.jpg`, `p154-restaurar-fica-na-lixeira--1280.jpg`, `p154-restaurar-fica-na-lixeira--1920.jpg`.

**ajuste**

- Contexto: "Restaurar" traz de volta o que foi descartado ou excluído.
- O que vi: em 390 px, restaurar um rascunho abre o formulário "Continuar rascunho", com o recado "Memória restaurada da lixeira." entre a frase da abertura e a trilha. A pessoa sai da lixeira e cai num formulário de sete etapas. Quem queria restaurar dois itens precisa voltar. O recado chama o rascunho de "memória".
- Opções:
  - A (recomendada): ficar na lixeira, com o recado "Rascunho restaurado." e um link "Continuar o rascunho" (ou "Ver a memória").
  - B: continuar levando ao rascunho e só acertar o recado para "Rascunho restaurado.".
  - C: manter como está.
- Captura: `conta-lixeira-itens--390.jpg`.

### P155. Rascunhos e lixeira devem ter "Voltar para a sua conta"?

**Feito (opção A):** a lixeira tem "Voltar para a sua conta" no alto, inclusive vazia; a página Rascunhos saiu pela P150. Captura: `p156-restaurar-na-linha-do-titulo--390.jpg`.

**ajuste**

- Contexto: as telas de administração têm "Administração" acima do título e "Voltar para a sua conta". Rascunhos e lixeira têm "Sua conta" acima do título.
- O que vi: nas três larguras, "Sua conta" acima do título é só um rótulo, sem link. O único link do alto leva de uma para a outra ("Ver a lixeira", "Ver os rascunhos"). Para voltar à conta, só pelo retrato do topo. A lixeira vazia ("A lixeira está vazia.") não tem ação nenhuma.
- Opções:
  - A (recomendada): "Voltar para a sua conta" nas duas, como na administração.
  - B: o rótulo "Sua conta" vira link.
  - C: manter como está.

### P156. "Restaurar" pode ficar na linha do título?

**Feito (opção A):** a partir de 1280 px, "Restaurar" fica à direita, na linha do título; no celular continua embaixo. Capturas: `p156-restaurar-na-linha-do-titulo--390.jpg`, `p156-restaurar-na-linha-do-titulo--1280.jpg`, `p156-restaurar-na-linha-do-titulo--1920.jpg`.

**detalhe**

- Contexto: as listas utilitárias têm o nome em destaque, a data em mono e a ação em texto sublinhado.
- O que vi: em 390 px cada item da lixeira tem 161 px (título e data, a linha "Descartado por Gui em…", e "Restaurar" numa linha própria). Em 1280 px a linha vai até a borda da coluna e "Restaurar" continua embaixo, à esquerda.
- Opções:
  - A (recomendada): a partir de 1280 px, "Restaurar" à direita, na linha do título.
  - B: manter como está.

## Administração: tipos de momento

### P157. A prévia deve ficar à vista enquanto se escolhe a cor e o desenho?

**Feito (opção A):** onde há mouse (1280 e 1920 px) a prévia fica parada ao lado enquanto as grades rolam; no celular, uma etiqueta pequena junto do "Salvar" e a etiqueta do resumo do tipo acompanham a escolha. Capturas: `p157-previa-com-os-desenhos--390.jpg`, `p157-previa-com-os-desenhos--1280.jpg`, `p157-previa-com-os-desenhos--1920.jpg`, `p168-nome-do-desenho-e-etiqueta-no-salvar--390.jpg`.

**muda a experiência**

- Contexto: cada tipo abre com o nome, a prévia "Como fica", a grade de 23 cores e a de 30 desenhos. A prévia acompanha a escolha na hora.
- O que vi: em 390 px a prévia fica acima das grades. A grade de cores tem 736 px (doze linhas de duas) e a de desenhos começa 1047 px abaixo do alto da prévia: com a grade de desenhos na tela, a prévia está 783 px acima da janela. Nas cores, ela some a partir da décima linha. Em 1280 e 1920 px a prévia fica à direita e aparece junto das cores, mas com os desenhos na tela ela está 213 px (1280) e 98 px (1920) acima da janela. A escolha do desenho nunca é vista na prévia sem rolar de volta.
- Opções:
  - A (recomendada): em 1280 e 1920 px a prévia fica parada ao lado (onde há mouse, como o resumo da Nova memória). No celular, uma segunda etiqueta pequena ao lado do "Salvar" e a etiqueta do resumo do tipo acompanhando a escolha.
  - B: no celular, a prévia desce para entre as duas grades. No computador, parada ao lado.
  - C: manter como está.
- Captura: `conta-tipos-aberto--390.jpg`, `conta-tipos-desenhos-sem-previa--390.jpg`.

### P158. As doze cores novas e os nomes ficam? (PR #40, pergunta 1)

**Feito (opção A):** mantido como está.

**ajuste**

- Contexto: a paleta precisava de bem mais que onze cores, na mesma temperatura. Foram feitas doze (limão, oliva, menta, musgo, céu, petróleo, anil, uva, ameixa, cereja, terracota e cacau), medidas para não ficarem mais perto umas das outras do que as onze já ficam entre si.
- O que vi: ver a paleta em `/sistema` e em `/admin/tipos`.
- Opções:
  - A (recomendada): ficar com as doze como estão.
  - B: tirar ou trocar alguma (dizer qual), mantendo o contraste.
  - C: acrescentar mais. Cabe pouco: mostarda e jade foram tentadas e ficaram perto demais de cores que já existem.

### P159. Os dezenove rabiscos novos e os nomes de todos ficam? (PR #40, pergunta 2)

**Feito (opção A):** mantido como está.

**ajuste**

- Contexto: capelo, mamadeira, sol e mar, pinheiro, garfo e faca, nota musical, bola, patinha, livro aberto, carro, presente, câmera, coração, sol, caixa de mudança, taça, barraca, montanha e peixe. Os nomes aparecem para o leitor de tela e em `/sistema`.
- O que vi: no tamanho da grade (27 px num quadro de 63 px em 390 px, de 53 px em 1280 e 52 px em 1920), os trinta se distinguem. Os que pedem um segundo olhar em 27 px são a mamadeira e a flor.
- Opções:
  - A (recomendada): ficar com os dezenove.
  - B: trocar ou tirar algum (dizer qual).
  - C: pedir outros (igreja, bicicleta, troféu, por exemplo).

### P160. Quatro das onze cores aprovadas não chegam a 4,5 com a tinta sobre o próprio pastel. Escurecer? (PR #40, pergunta 4)

**Feito (opção A):** só a tinta das quatro escureceu até 4,5 sobre o próprio pastel (pêssego `#a04314`, coral `#a8281e`, rosa `#aa2557`, manteiga `#885700`); o pastel e o vivo não mudaram, o piso saiu do teste e a página do sistema não marca mais nenhuma. Captura: `p160-contraste-das-quatro--1280.jpg`.

**ajuste**

- Contexto: pêssego (3,9), coral (4,2), rosa (4,2) e manteiga (4,4). Aparece no carimbo e no ícone sobre o bloco de cor. O texto corrido não é afetado, porque usa a cor do texto do site.
- O que vi: o teste guarda o valor de hoje como piso, e a página do sistema marca as quatro.
- Opções:
  - A (recomendada): escurecer só a tinta dessas quatro até 4,5. O pastel e o vivo não mudam, e o carimbo fica um pouco mais escuro. O PR recomendava deixar; nesta revisão a recomendação muda, porque o carimbo é texto que se lê (data e lugar) e 4,5 é a regra do resto do site.
  - B: deixar como está, com o piso no teste.

### P161. Depois de salvar um tipo, a página deve voltar para ele?

**Feito (opção A):** salvar volta para a linha do tipo (âncora no endereço), com o recado ali, dizendo o nome ("Viagem atualizado."). Capturas: `p161-volta-para-o-tipo--390.jpg`, `p161-volta-para-o-tipo--1280.jpg`, `p161-volta-para-o-tipo--1920.jpg`.

**ajuste**

- Contexto: "Salvar" envia e a página recarrega com o recado.
- O que vi: em 390 px, depois de salvar "Viagem", a página volta ao alto com "Tipo atualizado.". O tipo mexido está fechado, perto de mil pixels abaixo, depois da parte de "Outro". O recado não diz qual tipo. Para ver como ficou, a pessoa rola e procura.
- Opções:
  - A (recomendada): voltar para a linha do tipo (âncora no endereço), com o recado dizendo o nome ("Viagem atualizado.").
  - B: só o recado com o nome.
  - C: manter como está.

### P162. "Tipos da lista" deve vir antes de "O que a família escreveu em 'Outro'"?

**Feito (opção A):** a ordem passou a "Tipos da lista", "Novo tipo" e, por último, o que foi escrito em "Outro", com a conta no alto ("3 nomes escritos em \"Outro\"") levando até lá. Capturas: `p162-tipos-primeiro--390.jpg`, `p162-tipos-primeiro--1280.jpg`, `p162-tipos-primeiro--1920.jpg`.

**ajuste**

- Contexto: a página tem três partes, nesta ordem: o que foi escrito em "Outro", os tipos da lista e "Novo tipo".
- O que vi: em 390 px, com os textos de "Outro" do acervo de exemplo, o primeiro tipo da lista aparece a 1096 px do alto. Cada texto de "Outro" traz dois formulários. Na produção essa parte cresce com o uso, e a lista de tipos, que é o que dá nome à página, desce junto.
- Opções:
  - A (recomendada): "Tipos da lista" primeiro, depois "Novo tipo", e "Outro" por último, com a conta no alto ("3 nomes escritos em Outro") levando até lá.
  - B: manter a ordem e recolher "Outro" quando passar de três textos.
  - C: manter como está.

### P163. Os textos novos de `/admin/tipos` ficam? (PR #40, pergunta 3)

**Feito (opção A):** mantido como está. O recado de salvar passou a dizer o nome do tipo por causa da P161.

**detalhe**

- Contexto: "Cor", "Desenho", "Como fica", "Mudar a cor e o desenho", "em Viagem" (na amostra de uma cor em uso) e "Cada tipo tem uma cor e um desenho, que aparecem na etiqueta e no cartão da memória sem foto."
- O que vi: o resumo de cada tipo diz "Mudar a cor e o desenho", mas ali também se muda o nome. Depois de salvar, o recado é "Tipo atualizado.", sem o nome do tipo.
- Opções:
  - A (recomendada): ficar como está.
  - B: "Ícone" no lugar de "Desenho".
  - C: como está, com "Mudar o nome, a cor e o desenho" no resumo e o nome do tipo no recado ("Viagem atualizado.").

### P164. Dois tipos podem ter a mesma cor? (PR #40, pergunta 5)

**Feito (opção A):** mantido como está.

**detalhe**

- Contexto: hoje pode. A amostra avisa quem já usa, e o tipo novo vem com uma cor livre.
- O que vi: a marca "em Viagem" tem 11 px em 390 px e contraste de 5,4. Lê-se, mas é o menor texto da tela. Em 1920 px cinco delas apareciam cortadas (corrigido nesta rodada: a marca quebra em duas linhas).
- Opções:
  - A (recomendada): continuar podendo, com o aviso.
  - B: proibir. Com 23 cores, a lista de tipos teria esse teto.

### P165. O tipo criado a partir de um texto de "Outro" escolhe a cor numa lista de nomes? (PR #40, pergunta 6)

**Feito (opção A):** mantido como está.

**detalhe**

- Contexto: ali o formulário é uma linha só: a cor é escolhida numa lista de nomes e o tipo nasce com o brilho. O desenho se escolhe depois, em "Tipos da lista".
- O que vi: a cor é uma lista suspensa com os 23 nomes, sem amostra. É o único lugar do site em que se escolhe cor pelo nome.
- Opções:
  - A (recomendada): ficar assim, com a linha curta.
  - B: abrir as duas grades também ali.

### P166. O acervo de exemplo ganha tipos novos? (PR #40, pergunta 7)

**Feito (opção A):** o acervo de exemplo ganhou três tipos com cores e rabiscos novos (Formatura em anil com o capelo, Praia em céu com o sol e mar, Bichos em terracota com a patinha) e uma memória em cada, só onde os exemplos já rodam. Capturas: `p166-memoria-com-tipo-novo--390.jpg`, `p166-memoria-com-tipo-novo--1280.jpg`.

**detalhe**

- Contexto: nas prévias, os tipos são os onze de sempre. Para ver uma cor nova numa memória é preciso trocar um tipo na mão.
- O que vi: nenhuma memória de exemplo usa cor ou rabisco novo.
- Opções:
  - A (recomendada): semear dois ou três tipos de exemplo com cores e rabiscos novos, e uma memória em cada. O PR recomendava deixar; para o QA e para a Giovanna verem as cores novas em uso sem trocar nada na mão, vale semear.
  - B: deixar assim.

### P167. "Cor" e "Desenho" devem ser títulos grandes dentro do tipo?

**Feito (opção A):** "Cor" e "Desenho" viraram rótulos em mono, iguais a "Nome". Capturas: `p167-cor-e-desenho-em-mono--390.jpg`, `p167-cor-e-desenho-em-mono--1280.jpg`, `p167-cor-e-desenho-em-mono--1920.jpg`.

**detalhe**

- Contexto: dentro do tipo aberto, "Nome" é um rótulo pequeno em mono, e "Cor" e "Desenho" são legendas em serifa.
- O que vi: "Cor" e "Desenho" têm 24 px em 390, 34 px em 1280 e 40 px em 1920, o mesmo tamanho de "Tipos da lista", que é o título da parte. Os três são campos do mesmo formulário e só um tem cara de campo.
- Opções:
  - A (recomendada): "Cor" e "Desenho" como rótulos em mono, iguais a "Nome".
  - B: manter como está.

### P168. O desenho escolhido deve dizer o nome?

**Feito (opção A):** uma linha abaixo da grade diz o nome do desenho marcado ("Desenho: Aviãozinho de papel") e acompanha a escolha. Capturas: `p168-nome-do-desenho-e-etiqueta-no-salvar--390.jpg`, `p168-nome-do-desenho-e-etiqueta-no-salvar--1280.jpg`, `p168-nome-do-desenho-e-etiqueta-no-salvar--1920.jpg`.

**detalhe**

- Contexto: a grade de desenhos mostra só os rabiscos, com o nome para o leitor de tela e no `title`. A marcada leva borda mais grossa, fundo e um tique.
- O que vi: nos 27 px em que aparecem, os trinta se distinguem. O nome só aparece com o mouse parado. No celular não aparece. O tique da marcada tem 12 px, no canto do quadro de 63 px. Na página do sistema os mesmos rabiscos têm o nome escrito embaixo.
- Opções:
  - A (recomendada): uma linha abaixo da grade com o nome do desenho marcado ("Desenho: Aviãozinho de papel").
  - B: manter como está.

## Administração: famílias, carta de Natal e espelho da produção

### P169. "Refazer o espelho" deve pedir confirmação e ter cara de ação que apaga?

**ajuste**

- Contexto: o espelho troca o banco inteiro da homologação. A tela só existe na homologação e no computador, para administradores.
- O que vi: em 390 px, o texto diz "Tudo o que está hoje nesta homologação é apagado e trocado pelo espelho novo." em letra de apoio, e o botão é o cheio escuro de sempre, sem pergunta depois do toque. É a ação mais destrutiva do site e a única de apagar sem confirmação e sem a cor de alerta. O campo de arquivo é o do navegador, sem o estilo de "Escolher fotos".
- Opções:
  - A (recomendada): manter o botão e acrescentar a confirmação no lugar, como nos laços ("Trocar tudo o que está na homologação?").
  - B: manter como está. Só o Gui e a Giovanna usam, e o que se perde é dado inventado.
- Captura: `conta-espelho--390.jpg`.

### P170. "Ver como fica" deve avisar que mostra a carta salva?

**detalhe**

- Contexto: na Carta de Natal, "Salvar carta" é o botão cheio e "Ver como fica" é o link ao lado, que abre `/carta`.
- O que vi: nas três larguras, quem muda o texto e toca em "Ver como fica" sai da página e vê a versão salva, sem a mudança.
- Opções:
  - A (recomendada): o link passa a dizer "Ver a carta salva".
  - B: "Ver como fica" salva antes de abrir.
  - C: manter como está.

### P171. Um "Salvar" por família, ou um só para a tela?

**detalhe**

- Contexto: em Famílias, cada uma das três linhas tem o campo dos sobrenomes e o próprio "Salvar", em texto sublinhado.
- O que vi: nas três larguras a tela não tem botão cheio. São três "Salvar" iguais, um por linha. São três formulários separados: mudar duas famílias pede dois envios, um de cada vez.
- Opções:
  - A (recomendada): um formulário só, com um "Salvar famílias" cheio no fim.
  - B: manter como está.

## Sistema visual

### P172. No celular, a paleta ampliada pode ser mais compacta?

**detalhe**

- Contexto: a página do sistema é a referência do Gui. Em `#paleta-ampliada`, cada cor é uma faixa com os quatro tons e o nome embaixo.
- O que vi: em 390 px são doze faixas de 141 px, uma por linha, 2049 px de rolagem só para as cores novas. Em 1920 px são sete por linha e cabem em 323 px. O nome embaixo é o do código, sem acento ("limao", "ceu", "petroleo"), e em `/admin/tipos` a mesma cor se chama "Limão", "Céu" e "Petróleo".
- Opções:
  - A (recomendada): duas cores por linha no celular, com o nome de gente e o do código juntos ("Limão · limao").
  - B: manter como está.

### P173. A tabela do contraste deve caber no celular?

**detalhe**

- Contexto: a tabela tem a cor e três colunas de contraste, e marca o que fica abaixo de 4,5.
- O que vi: em 390 px a tabela tem 611 px dentro de uma área de 349 px que rola de lado. Só a primeira coluna de números aparece, e nada indica que há mais duas à direita. A área que rola não recebe foco do teclado.
- Opções:
  - A (recomendada): no celular, os três números de cada cor numa linha só abaixo do nome, sem rolagem lateral.
  - B: manter como está.

## Página não encontrada

### P174. O que a página de erro diz e oferece?

**ajuste**

- Contexto: a página não existia e foi criada nesta rodada, com a frase "Não encontramos esta página." e "Voltar ao início". O texto é provisório, e texto é decisão do Gui.
- O que vi: "Memória não encontrada", em texto puro. O mesmo texto serve para a memória que não existe e, pelo que o código indica, para a que a pessoa não pode ver.
- Opções:
  - A (recomendada): uma frase só para tudo, que não revela se a coisa existe: "Não encontramos esta página. Ela pode ter mudado de lugar ou não estar aberta para você.", com "Voltar ao início" e o menu do site.
  - B: uma frase por tipo ("Não encontramos esta memória."), com "Voltar ao início" e "Explorar".
- Captura: inicio-esqueleto-404-memoria--390.jpg
