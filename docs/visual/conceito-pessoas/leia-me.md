# Conceito: Pessoas, página da pessoa, editar pessoa e laços, Sua conta

Sessão E, 18/11/2026. Branch `tst-pessoas`, nascida da `homologa` e apagada depois da construção: as rotas de conceito não existem mais, e esta pasta fica como registro da escolha.

**O que o Gui escolheu:** Pessoas na B, Editar pessoa e laços na A e Sua conta na A, com ajustes (PRs #70, #71 e #72); na página da pessoa, a C, da segunda rodada. As regras estão em `docs/decisoes.md` e `docs/visual.md`.

O texto abaixo é o da época do conceito. Só conceito: duas propostas para cada tela, em rotas de conceito, sem mexer nas páginas de verdade. A construção é de outra sessão, depois da escolha do Gui.

Os itens vêm de "Revisão de estrutura das telas", em "Decidido, a construir" (`docs/decisoes.md`). A régua é "Gestalt em toda tela" (`docs/visual.md`): o espaço entre grupos é pelo menos o dobro do espaço dentro do grupo, o que tem a mesma função tem a mesma cara, e o grupo que precisa ganha um limite à vista.

## Onde ver

Na prévia: https://tst-pessoas.memorias.bayara.com.br/conceito/pessoas (a faixa de teste do alto também leva lá, em "Conceito: pessoas"). Cada tela tem uma barra que troca entre A e B.

No computador: `npm run dev` e `/conceito/pessoas`.

| Tela | A | B |
| --- | --- | --- |
| Pessoas, o alto da página | `/conceito/pessoas/lista/a` | `/conceito/pessoas/lista/b` |
| Página da pessoa | `/conceito/pessoas/pessoa/a` | `/conceito/pessoas/pessoa/b` |
| Editar pessoa e laços | `/conceito/pessoas/editar/a` | `/conceito/pessoas/editar/b` |
| Sua conta | `/conceito/pessoas/conta/a` | `/conceito/pessoas/conta/b` |

O que os endereços aceitam: `?id=<pessoa>` na página da pessoa e no editar (sem ele, a Elizete e quem está logado); `?editando=1` no editar, para ver um laço aberto; `?parte=ficha` no editar B; `?aviso=1` na conta, que força duas pendências de exemplo. A conta de quem não administra aparece trocando o "Ver como" para a Elizete.

As capturas estão nesta pasta, em 390, 1280 e 1920 px (`<tela>-<proposta>-<largura>.jpg`). `hoje-<tela>-1280.jpg` é a tela como está na `homologa`, para comparar.

## 1. Pessoas, o alto da página

**O defeito de hoje** (`hoje-lista-1280.jpg`): sete elementos empilhados com espaços parecidos (conta, título, frase, botões, busca, ordem, famílias), sem dizer o que vai com o quê.

**O que as duas propostas têm em comum**

- O alto tem três grupos, e cada um é um grupo à vista: o que a página é (título com a conta colada nele e a frase como apoio), achar alguém (busca, famílias e ordem) e o que dá para fazer (cadastrar, árvore, círculo).
- As famílias são pills, com a cara das do Explorar: o ponto na cor viva e, marcada, a pill inteira no pastel da família.
- A lista de cada família não muda.

**A. Duas faixas** (`lista-a-*.jpg`). Em cima, o título à esquerda e as ações à direita. Embaixo, um cartão branco só para achar alguém, com a busca, as famílias e a ordem lado a lado. "Cadastrar pessoa" continua o botão cheio.

**B. Índice ao lado** (`lista-b-*.jpg`). No computador o alto vira uma coluna à esquerda, que acompanha a lista onde há mouse: título, busca, as famílias empilhadas com a conta de cada uma, a ordem e as ações. A lista ocupa o resto. Não há botão cheio: a tela é de procurar, e "Cadastrar pessoa" é uma ação de texto. No celular a B fica quase igual à A, sem o cartão.

**O que cada uma pede na construção**

- As duas: a pill de família como peça do sistema (`src/components/visual/`, `pecas.css`, página `/sistema` e a tabela de `docs/visual.md`), usada aqui e no Explorar. Hoje o desenho dela mora em `telas/linha.css`, dentro dos controles do Explorar. A sessão D está mexendo nesses controles: combinar com o que ela deixar.
- As duas: o filtro por família em `src/pages/pessoas/index.astro` (`?familia=<id>`, guardado junto com `?ordem=`), com teste em `testes/qa-respostas-pessoas.test.ts`. Ver o questionamento abaixo.
- A: só CSS e a ordem da marcação em `telas/pessoas.css`.
- B: a coluna parada usa `sticky`, que só pode existir dentro de `(hover: hover) and (pointer: fine)` (já está assim no conceito). A lista de cada família perde uma coluna (duas em 1280 px, três em 1920 px). Tirar o botão cheio da tela é decisão de texto e de hierarquia do Gui.

**Questionamento: pill que pula ou pill que filtra.** O pedido era só trocar os links das famílias por pills. Na prática, uma pill igual à do Explorar que só rola a página até a família engana: no Explorar a mesma peça filtra e fica marcada. Por isso, nas duas propostas, a pill filtra a lista e "Todas" volta a mostrar tudo. Se o Gui preferir que ela continue só levando até a família, a pill precisa de uma cara diferente da do Explorar (sem estado marcado), e isso contraria "família é sempre pill". Uma diferença que fica: no Explorar dá para marcar mais de uma família, e aqui é uma por vez.

## 2. Página da pessoa no desktop

**O defeito de hoje** (`hoje-pessoa-1280.jpg`): em 1280 px o retrato e o nome ocupam 620 px de altura, a primeira tela inteira; "Família e laços" é um rótulo do mesmo peso de "Filhos"; e abaixo da abertura a página é uma coluna só.

**O que as duas propostas têm em comum**

- A abertura fica mais baixa no computador: o retrato em duas colunas em vez de quatro, o parentesco ("sua avó") ainda como a linha maior, um degrau abaixo do tamanho de hoje. Em 1280 px ela passa de 620 para cerca de 390 px.
- "Família e laços" vira título em serifa, com a conta de pessoas ao lado. O nome de cada grupo continua em mono, colado nas pessoas dele, e os grupos ficam a `--e-6` uns dos outros.
- Os grupos se arrumam em colunas que se equilibram sozinhas, sem partir um grupo.
- No celular nada de estrutura muda: os laços continuam fechados numa linha que abre no lugar.
- "Memórias com Fulano" não muda. No conceito aparecem só as três mais recentes, e a "Forma de ver" ficou de fora.

**A. Laços ao lado** (`pessoa-a-*.jpg`, `pessoa-a-muitos-lacos-*.jpg`). Abaixo da abertura, duas colunas: "Sobre" e a voz à esquerda, e "Família e laços" num cartão branco à direita. Quem não tem "Sobre" nem áudio (a Elizete) fica com o cartão na largura toda, com os grupos em três ou quatro colunas.

**B. Laços na abertura** (`pessoa-b-*.jpg`, `pessoa-b-muitos-lacos-*.jpg`). Os laços entram no bloco de cor, numa segunda fileira embaixo do retrato e do nome: a abertura passa a ser a pessoa e a gente dela. "Sobre" e a voz ficam lado a lado embaixo. Quem não tem nenhum dos dois vai direto às memórias.

**O que cada uma pede na construção**

- As duas: `src/pages/pessoas/[id]/index.astro` e `telas/pessoa.css`. O servidor não muda. "Mostrar datas" e "Sua conta", que o conceito deixou de fora da abertura, continuam.
- A: o cartão dos laços é região nova na página (cartão branco, como os da conta). Com "Sobre" curto e muitos laços, a coluna da direita fica bem mais alta que a da esquerda (ver a Vó Bela em 1920 px, onde sobra espaço à direita do cartão com um grupo só).
- B: a abertura cresce com o número de laços (a Elizete, com dez pessoas, chega a 800 px em 1280 px). O fio e o texto de apoio dentro do bloco usam o tom `--meio` da família, e o contraste do texto suave sobre o pastel precisa ser conferido nas quatro cores.

**Questionamento: uma primeira versão da B não funcionou.** A ideia inicial era pôr os laços à direita do retrato, na mesma fileira. Com dez pessoas a abertura passava de 950 px e deixava metade do bloco vazia. A B que ficou põe os laços na fileira de baixo.

### Segunda rodada: C, em linha e os mais próximos primeiro

O Gui não escolheu nem A nem B (17/11/2026): as duas empilham cada grupo numa coluna e quebram com muitos laços. A C junta os dois caminhos que ele pediu (`/conceito/pessoas/pessoa/c`, `pessoa-c-*.jpg`).

- **A abertura baixa** da A, sem mudança.
- **"Família e laços" logo abaixo da abertura**, na largura toda, antes de "Sobre" e da voz.
- **Grupos em linha.** Cada grupo corre na horizontal: o retrato pequeno com o nome e a relação ao lado (a peça `Gente`, com 15 rem de largura, 16 rem em 1920 px), quebrando linha só quando falta espaço. Os grupos também se seguem na mesma linha quando cabem (Pais e Casal juntos, Filhos e Irmãos juntos na Elizete em 1920 px). Dentro do grupo, `--e-2` do nome do grupo às pessoas; entre grupos, `--e-7` na horizontal e `--e-6` na vertical. No celular cada grupo toma a largura toda e as pessoas ficam uma embaixo da outra.
- **Os mais próximos primeiro.** A ordem dos grupos é Pais, Casal, Filhos, Irmãos, Avós, Laços do coração, No coração de, Parentes. De cara aparecem os grupos inteiros que cabem em oito pessoas (o primeiro entra sempre, mesmo maior); um grupo nunca se parte. O resto fica atrás de "Ver todos os N", que abre no lugar e vira "Ver só os mais próximos". Sem script, tudo aparece. Na Elizete (10 pessoas) ficam de fora os dois laços do coração; na Vó Bela (2) não há botão.
- **No celular vale o mesmo.** A linha fechada "Família e laços · N pessoas" de hoje sai: os oito mais próximos já deixam a lista curta.

Perguntas da C: o limite de oito está bom? "Ver todos os N" e "Ver só os mais próximos" são textos para o Gui conferir. O celular perde a linha fechada que abre no lugar: fica assim?

## 3. Editar pessoa e laços

**O defeito de hoje** (`hoje-editar-1280.jpg`): uma coluna comprida em que a ficha inteira vem aberta antes dos laços, e "Pais", "Filhos" e "Seus laços do coração" são rótulos pequenos em mono, do peso de uma linha. "Adicionar outro laço" fica no fim, longe do grupo a que o laço novo vai pertencer.

**O que as duas propostas têm em comum**

- O nome do grupo vira título em serifa, e cada grupo tem um limite à vista.
- Cada laço mostra o retrato da pessoa, o nome e o que ela é.
- Adicionar mora dentro do grupo: "Adicionar pai ou mãe", "Adicionar casal", "Adicionar filho ou filha", "Adicionar laço do coração". O grupo vazio continua na tela, com a frase do que falta e a ação dele.
- Editar abre no lugar, como hoje, com "Salvar", "Cancelar" e a zona de perigo.
- No conceito os laços são os de verdade, mas os campos do editor são desenho: nenhum formulário de laço envia. A ficha é o formulário de verdade (`FichaDoIntegrante`).

**A. Uma página, grupos em cartões** (`editar-a-*.jpg`). A ficha vira um resumo de uma linha (retrato, nome, dados) com "Editar a ficha", que abre os campos no lugar, como um laço. Cada grupo de laços é um cartão branco. Na abertura, à esquerda, um índice com a ficha e cada grupo, com quantas pessoas tem. Em 1920 px os cartões ficam dois a dois.

**B. Duas telas, laços em volta** (`editar-b-*.jpg`, `editar-b-ficha-1280.jpg`). "Ficha" e "Laços" são duas telas, escolhidas no alto. Nos laços, o lugar de cada grupo diz o que ele é, como na árvore: os pais em cima, a pessoa no meio com o casal de um lado e o coração do outro, e os filhos embaixo. Cada laço é uma cartinha, e a vaga tracejada é o "Adicionar". No celular os grupos empilham na mesma ordem.

**O que cada uma pede na construção**

- As duas: `src/pages/pessoas/[id]/editar.astro` e `telas/formulario.css`. O "Adicionar laço" de hoje (um formulário com abas, no fim) passa a abrir dentro do grupo, já no tipo certo, sem a escolha de abas. O laço do coração que a família toda reconhece e o "parente de amigo" precisam de lugar: no conceito, o primeiro fica dentro de "Adicionar laço do coração" (a pergunta "quem reconhece" já existe ali), e o segundo é o grupo "Parentes de fora das famílias", que só aparece para quem é de fora. O cadastro guiado (`?novo=1`) não foi redesenhado e continua como está.
- As duas: os textos novos ("Adicionar pai ou mãe", as frases de grupo vazio, "Editar a ficha", "Fechar") são decisão do Gui.
- As duas: os scripts de `src/lib/cliente/` que procuram `details.editar`, `[data-editar]` e `[data-editar-cancelar]`, e as capturas (`abrirLaco`, em `scripts/capturas.mjs`), acompanham a marcação nova.
- A: a ficha fechada num resumo muda a regra "A ficha e os laços na mesma página" (`docs/decisoes.md`): o aviso de ficha com mudanças não salvas continua valendo e precisa abrir a ficha de volta. Quem chega por "Editar seus dados", na conta, deveria encontrar a ficha já aberta (`#ficha`).
- B: separar em duas telas acaba com o problema da ficha mexida e não salvada ao salvar um laço, e a regra acima sai. Pede um endereço para cada tela (`?parte=`, ou `/editar` e `/editar/lacos`), e os links que hoje apontam para `#lacos` e `#ficha` mudam junto. O quadro só tem lugar fixo para pais, casal, filhos e coração; "Parentes de fora das famílias" e "Laços do coração de outras pessoas" (só administradores) ficam numa fileira embaixo.

**Questionamento: a B é bonita com poucos laços e aperta com muitos.** Em 1280 px cada coluna do quadro tem uns 280 px. Com quatro filhos (a Elizete) a fileira de baixo quebra em duas, e com um laço em edição a cartinha aberta empurra as vizinhas. Funciona, mas a A aguenta melhor os casos difíceis do acervo de exemplo. Se o Gui gostar do quadro, vale conferir a Elizete em `/conceito/pessoas/editar/b?id=elizete&editando=1` antes de decidir.

## 4. Sua conta no desktop

**O defeito de hoje** (`hoje-conta-1280.jpg`): a administração é uma linha de links no fim da página, e "O que você criou" vem depois de três cartões, com um vazio à esquerda acima dela quando os laços são mais altos que os rascunhos.

**O que as duas propostas têm em comum**

- A administração é um cartão ao lado do nome, acima dos laços do coração. Cada item diz a situação dele em mono ("14 tipos", "3 famílias", "escrita em 2026"), e o banco aparece como medida, com "Baixar cópia do acervo" junto.
- O que pede ação de quem administra ganha um ponto na cor de alerta, e o alto do cartão conta as pendências ("2 pendências"). Hoje há duas possíveis: a carta de Natal por escrever e o banco perto do limite. Para ver, `?aviso=1`.
- "O que você criou" sobe para logo abaixo do nome, como uma faixa sem cartão, entre dois fios. As listas continuam abrindo no lugar.
- Quem não administra vê o nome na largura toda e a faixa logo abaixo (`conta-a-sem-administracao-1280.jpg`).
- No celular a ordem é: quem é, o que criou, avisos, rascunhos, laços, carta e, no fim, a administração, agora como cartão.

**A. Atalhos ao lado** (`conta-a-*.jpg`). A administração ocupa a metade direita, com os itens como atalhos em quadros recuados, três por linha. A faixa "O que você criou" vai na largura toda, depois os avisos, e rascunhos e laços lado a lado.

**B. Coluna da administração** (`conta-b-*.jpg`). A administração é uma coluna de quatro colunas de largura, com os itens em lista (o nome à esquerda, a situação à direita) e as pendências no alto da lista. À esquerda, empilhados sem vão: o nome, a faixa e os avisos. Embaixo, rascunhos e laços lado a lado.

**O que cada uma pede na construção**

- As duas: `src/pages/conta.astro` e `telas/conta.css`. Em `src/lib/conta.ts`, `administracao()` passa a devolver a situação de cada item e a marca de pendência, com teste em `testes/conta.test.ts` (no conceito isso está calculado na própria rota). O Gui decide o que conta como pendência além das duas de hoje. O número do retrato no topo não soma as pendências, a menos que ele peça.
- As duas: o recado do banco em aviso, que hoje é um `Recado` acima dos links, vira a medida vermelha com a frase curta. O texto completo (a saída combinada e onde está a conta) pode ficar no cartão ou na dica.
- A: a carta de Natal sobe do fim da página para o pé da coluna do nome (ver o questionamento).
- B: na coluna de oito, as contas de "O que você criou" descem um degrau de tamanho para caberem numa linha em 1280 px.

**Questionamento: o cartão ao lado dos dados abre um buraco.** O pedido junta duas coisas que brigam: o cartão da administração ao lado dos dados pessoais e "O que você criou" logo abaixo do topo, sem buraco acima. O cartão tem cerca de 420 px de altura e o nome com o retrato, 225 px. Na A, isso deixava uns 200 px vazios à esquerda, acima da faixa. O que fiz: na A, a carta de Natal ("Natal de 2026 · Ler a carta de Natal") foi para o pé da coluna do nome, alinhada com o fim do cartão; na B, a coluna da administração é estreita e alta, e à esquerda o nome, a faixa e os avisos empilham sem vão. A B resolve melhor. Se a carta no alto não agradar, a saída na A é um cartão mais baixo, sem a medida do banco.

## Perguntas para o Gui

1. Em cada tela, A ou B? Dá para misturar: por exemplo, a abertura baixa da pessoa com os laços de uma ou de outra.
2. Pessoas: a pill filtra a lista (como está) ou só leva até a família?
3. Editar: os grupos vazios ficam sempre à vista, com a frase e o "Adicionar"? No conceito, sim.
4. Conta: além da carta por escrever e do banco perto do limite, o que mais conta como pendência da administração?

## O que é do conceito e sai na construção

- `src/pages/conceito/pessoas/` (as rotas), `src/components/conceito-pessoas/Barra.astro`, `src/visual/telas/conceito-pessoas.css`, `conceito-lista.css`, `conceito-pessoa.css`, `conceito-editar.css` e `conceito-conta.css`.
- A linha "Conceito: pessoas" na faixa de teste, em `src/layouts/Visual.astro`.
- Esta pasta fica como registro da escolha, como `docs/visual/quadro-do-mapa/`.

Toda rota começa com `if (!conceitoDisponivel()) return naoEncontrado();`: na produção e na homologação elas respondem 404, e a guarda confere. Nenhuma página de verdade, nenhuma migração e nenhuma regra foram tocadas. A nova memória, o Explorar e o modo TV não foram abertos.

## O que não foi conferido

- A prévia publicada e o Safari do iPhone: as capturas são do servidor local, no Chromium.
- O teclado e o movimento reduzido tela a tela: as rotas usam link, `details` e botão comuns, e as capturas rodam com movimento reduzido, mas a conferência completa é da construção.
- A conferência automática de gestalt ainda não existe. Os espaços seguem a regra à mão: `--e-1` a `--e-4` dentro do grupo, `--e-5` a `--e-7` entre grupos.
