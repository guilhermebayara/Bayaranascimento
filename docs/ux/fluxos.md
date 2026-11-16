# Fluxos (QA de UX, 16/11/2026)

Cada fluxo tem os passos de hoje, onde a pessoa hesita ou volta, a recomendação e a alternativa descartada. As capturas citadas estão em `docs/ux/capturas/` e mostram a interface de antes das decisões abaixo.

## O que o Gui decidiu (16/11/2026)

Aprovado e construído na branch `qa-ux-decisoes`, com as regras em `docs/decisoes.md`:

1. Tipo de momento sem marcação, obrigatório para publicar.
2. "Quem pode ver" pergunta primeiro todos ou núcleos.
3. Um verbo só para publicar.
4. "Restaurar" em tudo o que traz de volta.
5. Excluir capítulo pela mesma página de confirmação da memória.
6. Remover laço e apagar casal com confirmação no próprio lugar.
7. Busca com sugestão para escolher pessoa ("Com quem", "Quem está contando", "Partir de").
8. Caixas de marcar com cara de caixa.
9. Uma peça só para datas, na ordem ano, mês, dia.
10. Ação principal no alto da memória, da pessoa e do capítulo.
11. Lixeira junto dos rascunhos.
12. Textos do parentesco: possessivo na própria página e "filho" ou "filha" conforme "como se referir".
13. Áreas de toque: ficam para a revisão visual (`docs/ux/revisao-visual.md`).
14. Estados pressionado, enviando, erro no campo e opção desabilitada.

## Segunda rodada: estrutura dos formulários (16/11/2026)

O Gui pediu atenção aos formulários pensando em quem tem menos familiaridade digital: a ordem faz sentido, a separação das etapas é boa, está fácil adicionar, que decisão pode ser facilitada ou automatizada. O princípio usado em todos: **uma pergunta principal por tela, o que já existe antes do que se cria, e o site adianta o que dá para deduzir, sempre deixando a pessoa conferir.** O que foi construído (regras em `docs/decisoes.md`):

| Onde | Antes | Agora | Por quê |
| --- | --- | --- | --- |
| Etapas da memória | 6, com a primeira juntando título, onze tipos e seis controles de data | 7: o que aconteceu, quando e onde, quem estava, fotos, relato, capítulo e temas, quem vê | Cada tela responde uma pergunta. As opcionais de organização (capítulo, temas) vão para o fim |
| Etapa opcional vazia | "Continuar", igual às obrigatórias | "Pular esta etapa" | Diz que dá para seguir sem preencher, sem a pessoa achar que esqueceu algo |
| "Quem estava?" | todos os nomes abertos, com filtro | marcados no alto, busca, sugestões pelos laços, lista inteira recolhida por família | A lista vai crescer. A família de quem foi marcado é quase sempre quem mais estava |
| Núcleos da memória | a pessoa marca | vêm marcados pelos núcleos de quem estava, com aviso | Decisão que o site consegue deduzir; a pessoa só confere |
| Memória a partir da pessoa ou do capítulo | começar do zero | "Nova memória com Fulano", "Nova memória neste capítulo" | Quem está olhando a página de alguém já disse de quem é a memória |
| Ficha de pessoa | "Já faleceu" dentro do recolhido; "É outra pessoa" sempre visível | "Já faleceu" no essencial; "É outra pessoa" só com nome repetido, embaixo do nome, com link | Falecimento muda como o site fala da pessoa. A pergunta do nome repetido só faz sentido quando ele se repete |
| Edição da pessoa | laços antes da ficha, cada laço só com "Remover" | índice no alto (Ficha, Laços), ficha primeiro, laços por tipo com "Editar" | Primeiro quem a pessoa é. Corrigir não exige apagar e recriar |
| Casal | todas as fases abertas, cada uma com "Terminou" | linha do tempo das fases, cada uma abre com "Mudar"; o fim de uma fase sai do começo da seguinte | O casal é uma história em sequência; a pessoa só informa quando cada fase começou |
| Listas curtas | lista suspensa em filiação, fase e proximidade | botões de opção | Tudo à vista, um toque só |

### O que ainda fica recomendado

- **Trocar a pessoa de um laço** dentro de "Editar". Hoje continua sendo remover e adicionar. Precisa de uma ação nova na API que remove e cria numa vez só, com a mesma validação. Recomendo quando o histórico de laços existir.
- ~~Cadastro guiado de família~~ e ~~tipos mais usados à vista~~: aprovados pelo Gui e construídos (ver `docs/decisoes.md`).
- ~~Como se referir de quem entra pelo nome novo~~ e ~~o caminho do coração no cadastro guiado~~: aprovados pelo Gui e construídos (ver `docs/decisoes.md`).
- **Relato por áudio:** já está em "Decidido, a construir". Para quem tem menos familiaridade com teclado, gravar é mais fácil que escrever; a etapa do relato é o lugar natural para o botão de gravar.
- **Capítulo:** as três etapas funcionam. "Como as memórias entram?" (reunido ou de época) é a decisão mais difícil do site para quem não conhece a ideia; um exemplo visual de cada um, na revisão visual, ajuda mais que texto.

Ficaram como recomendação, sem decisão ainda: as outras propostas desta página, como o salto por década na linha do tempo, o menu só com seções, "Ver na árvore" na memória, botões de opção para "Destacar" na árvore, e o recado de primeira visita.

## Cadastrar pessoa e adicionar laços

Capturas: `pessoa-nova`, `pessoa-editar`, `pessoa-nova-como-magno`.

**Hoje**

1. Pessoas → "Cadastrar pessoa", ou "Adicionar alguém que não está na lista" dentro da memória, ou o nome novo no "Adicionar laço".
2. Etapa 1, "Quem é": nome, como é chamado na família, pessoa ou bicho, como se referir. "Datas e história" fica recolhido, com nascimento, "Já faleceu" e o falecimento. Embaixo, sempre visível, "É outra pessoa, mesmo que já exista alguém com esse nome".
3. "Cadastrar e ir para os laços" leva à página de edição da pessoa, com a trilha na etapa 2 e o recado "Fulano entrou no acervo. Agora, os laços."
4. "Que laço é?" em abas (Pais, Filhos, Casal, Do coração e, para quem é de fora, Parente de amigo). Cada aba mostra os campos dela: "Com quem" numa lista suspensa e, ao lado, "ou alguém que ainda não está no acervo".
5. "Adicionar laço" salva e volta para a mesma página. Repete para cada laço. "Concluir" vai para a página da pessoa, onde está "Ver na árvore".

**Atrito**

- **Escolher a outra pessoa:** a lista suspensa tem todo o acervo, e o nome novo é outro campo ao lado. Quem não acha o nome na lista precisa perceber que o campo do lado é a saída. Se preencher os dois, um vence sem aviso.
- **A caixa "É outra pessoa"** aparece antes de existir qualquer dúvida de nome repetido. Ela pede uma decisão que a pessoa ainda não sabe que precisa tomar.
- **"Família"** (de qual núcleo a pessoa é parente) não está no cadastro. Ela só aparece na edição e depende da sugestão feita pelo primeiro laço. Quem cadastra alguém sem laço fica sem família e sem cor na árvore até editar.
- **Na edição, Laços vem antes da Ficha.** Para quem chega pela etapa 2 do cadastro, faz sentido. Para quem chega por "Editar página e laços" querendo trocar o nome, a ficha está no fim de uma página longa.
- **Uma ida por laço:** cada laço recarrega a página. Para cadastrar pai, mãe e dois irmãos são quatro voltas, e a pessoa nova só vê o efeito na árvore depois de "Concluir" e "Ver na árvore".
- **Falecimento** está bem resolvido: só aparece ao marcar "Já faleceu". Mas fica dentro de "Datas e história", recolhido, e quem cadastra a bisavó não vê a opção sem abrir.

**Recomendação**

1. Trocar "Com quem" por um campo de busca com sugestão, com "Cadastrar Fulano" como última sugestão quando o nome não existe. Um campo só, uma escolha só. A mesma peça serve para "Quem estava?" na memória, "Quem está contando" no relato e "Partir de" na árvore (ver "O controle certo para cada escolha").
2. Mostrar "É outra pessoa" só quando o nome digitado já existir, com o nome parecido ao lado ("Já existe Maria Bayara. É outra pessoa?").
3. Na edição, abrir na seção que a pessoa veio buscar: "Editar página" leva à Ficha, "Adicionar laço" leva aos Laços. As duas continuam na mesma página.
4. Mostrar "Já faleceu" fora do recolhido, logo depois de "Como se referir". Falecimento muda como o site fala da pessoa ("era", "1930 a ?"), então pertence ao essencial.

**Descartada:** um assistente que pergunta pai, mãe, irmãos e casal em sequência no cadastro. Ficaria mais longo para o caso comum (cadastrar alguém que aparece numa foto) e duplicaria o formulário de laço que já existe.

## Registrar memória

Capturas: `nova-1`, `editar-memoria-2` a `editar-memoria-5`, `rascunho-6-resumo`.

**Hoje**

1. "Nova memória", no menu. Seis etapas: O momento, Pessoas e lugar, Capítulo e temas, Fotos, Relato, Quem vê.
2. O momento: título, tipo de momento (onze pílulas, com "Dia a dia" já marcado), ano com ±10 e ±1, mês e dia opcionais, calendário, "Foi hoje", "Não tenho certeza da data".
3. Pessoas e lugar: pílulas com filtro, "Adicionar alguém que não está na lista", lugar.
4. Capítulo e temas: caixas de capítulos reunidos, temas separados por vírgula.
5. Fotos: "Escolher fotos", legenda e "Usar na linha do tempo" por foto.
6. Relato: "Quem está contando" (lista suspensa) e o texto.
7. Quem vê: pílulas dos núcleos ("De quais núcleos é esta memória?"), depois "Toda a família vê" ou "Só quem é dos núcleos marcados acima". Embaixo, "Confira antes de guardar" e "Publicar memória".
8. Depois de publicar: "Memória guardada", com "Ver a memória" e "Registrar outra memória".

**Atrito**

- **O tipo já vem marcado em "Dia a dia".** Quem passa direto publica um aniversário como dia a dia. As decisões dizem que o ano começa vazio para evitar o mesmo erro; o tipo não segue a regra.
- **Quem vê começa pelos núcleos** e só depois pergunta se a memória é de todos. Na ficha do capítulo a ordem é a contrária: primeiro "todos ou núcleos", depois quais. A mesma pergunta em duas ordens.
- **Resumo e botão usam verbos diferentes:** "Confira antes de guardar", "Publicar memória", "Memória guardada". A regra do `docs/qa-ux.md` pede o mesmo verbo do botão no recado.
- **O resumo não mostra os temas**, que a pessoa preencheu na etapa 3.
- **"Quem está contando"** é uma lista suspensa com todo mundo. O caso comum é "Eu"; o segundo é alguém que não acessa o site.
- **A data tem três caminhos na mesma tela** (ano com passos, mês e dia; calendário; "Foi hoje"). Funciona, mas é a única data do site com essa forma (ver "Datas").

**Recomendação**

1. Tipo sem nada marcado, obrigatório como o ano. Ou "Outro" marcado, se o Gui preferir não travar o avanço.
2. Quem vê na ordem do capítulo: primeiro "Toda a família vê" ou "Só alguns núcleos", e as caixas dos núcleos aparecem só na segunda opção. A pergunta "De quais núcleos é esta memória?" continua, mas vira parte da segunda opção.
3. Um verbo só: "Confira antes de publicar", "Publicar memória", "Memória publicada". Para o rascunho, "Salvar rascunho" e "Rascunho salvo", como já é.
4. Temas no resumo.
5. Em "Quem está contando", "Eu" e "Outra pessoa", e a busca com sugestão só na segunda.

**Descartada:** juntar as etapas em três (o que, quem e onde, fotos e relato) para encurtar. A etapa do relato precisa sumir na correção de uma memória publicada, e o resumo só funciona como última etapa; com etapas grandes, o "Continuar" bloqueado por um campo lá embaixo fica escondido no celular.

## Corrigir e desfazer

Capturas: `memoria`, `memoria-historico`, `memoria-excluir`, `lixeira`, `rascunhos`, `capitulo-editar`.

**Hoje**

- **Histórico da memória:** link "Histórico de alterações" no fim da página da memória, depois dos botões, ao lado de "Excluir memória". Mostra a ficha, os textos anteriores do próprio relato e as fotos removidas, cada um com o seu botão ("Voltar a ficha para como era antes", "Voltar para este texto", "Devolver à memória").
- **Histórico do relato:** na mesma página, sem entrada pelo relato.
- **Histórico de pessoa e laços:** não existe no site (está em "Em aberto").
- **Lixeira:** só no rodapé, ao lado das ferramentas de admin. Cada item tem "Recuperar".
- **Rascunhos:** no menu principal. Lista memórias; os rascunhos de relato aparecem quando existem.
- **Excluir memória:** página de confirmação, com o que sai junto e a lixeira dita no texto. O recado depois diz "foi para a lixeira. Dá para recuperar pelo link no rodapé."
- **Excluir capítulo:** um bloco de alerta no fim da edição, com o botão direto, sem página de confirmação.
- **Remover laço, remover casal, "Apagar, foi cadastrado por engano":** um toque, sem confirmação. O recado diz "Laço removido." e nada fala de volta.

**Atrito**

- Quem quer desfazer uma mudança na memória precisa saber que o histórico existe e procurar no fim da página. O recado depois de corrigir ("Memória guardada.") não menciona que a versão anterior ficou guardada.
- A lixeira está no rodapé, e o recado de excluir manda procurar lá. Para quem não é admin, a lixeira só tem os próprios rascunhos descartados, e o rodapé é o único caminho.
- Os dois jeitos de excluir (página de confirmação e bloco com botão direto) fazem a mesma coisa com pesos diferentes.
- Remover laço é a única exclusão sem volta visível: sem confirmação, sem lixeira e sem histórico na tela.
- Recuperar tem quatro nomes ("Recuperar", "Voltar a ficha para como era antes", "Voltar para este texto", "Devolver à memória"), e o recado usa um quinto ("restaurado").

**Recomendação**

1. Um verbo para trazer de volta, "Restaurar", em todos os botões, com o complemento do que volta: "Restaurar esta versão", "Restaurar este texto", "Restaurar a foto", "Restaurar" na lixeira. Recados: "Versão restaurada", "Foto restaurada".
2. Excluir capítulo pela mesma página de confirmação da memória.
3. Remover laço e casal com confirmação curta no próprio lugar ("Remover o laço com Fulano?" e os botões "Remover" e "Cancelar"), até o histórico de laços existir.
4. O recado depois de corrigir: "Memória atualizada. A versão anterior está no histórico." com o link.
5. Lixeira no menu "Rascunhos", como segunda lista da mesma página ("Rascunhos" e "Na lixeira"), ou como link fixo no alto da página de rascunhos. O rodapé continua com o link.

**Descartada:** um botão "Desfazer" no recado depois de cada mudança. Seria o mais rápido, mas cada tipo de mudança precisaria de um desfazer próprio no servidor, e o histórico já faz isso de forma geral.

## Percorrer o acervo

Capturas: `inicio`, `inicio-nucleo`, `memoria`, `pessoa-quem-acessa`, `capitulos`, `capitulo-reunido`, `tema`, `arvore`.

**Hoje**

- A linha do tempo vai **do mais antigo para o mais novo** (1958 no alto, 2026 no fim), agrupada por ano, com o ano grande à esquerda. Filtro por tipo de momento no alto.
- O menu: Tudo, um item por núcleo de quem está logado, Capítulos, Árvore, Pessoas, Rascunhos e "Nova memória". No celular, quebra em duas linhas.
- Da memória: as pessoas, o capítulo e os temas são links; no fim, a anterior e a seguinte. Não há link para a árvore.
- Da pessoa: "Ver na árvore", família e laços com links, e a linha do tempo dela.
- Do capítulo: a linha do tempo dele. Do tema: a linha do tempo dele.
- Da árvore: tocar duas vezes abre a página da pessoa.

**Atrito**

- Quem abre o site vê primeiro o que é mais antigo e precisa rolar mais de 11 mil pixels no desktop para chegar ao que foi registrado ontem. O "Antes" e "Depois" da memória segue a mesma ordem.
- O filtro por tipo está no alto; depois de rolar, voltar a ele é rolar tudo de novo. Não há salto por década ou ano.
- O menu do celular ocupa duas linhas e mistura navegação (Tudo, núcleos) com seções (Capítulos, Pessoas) e trabalho (Rascunhos, Nova memória).
- Os núcleos no menu repetem a página inicial com filtro, enquanto o filtro por tipo fica dentro da página. São dois jeitos de filtrar a mesma lista.

**Recomendação**

1. ~~Manter a ordem do antigo para o novo~~. **Decisão do Gui (16/11/2026): o contrário, mais recentes primeiro**, e rolar leva ao passado; já construído. O salto por década no alto, fixo ao rolar, continua recomendado, agora ainda mais útil para chegar às memórias antigas.
2. Núcleo como mais um filtro da linha do tempo, ao lado do tipo, e o menu fica com as seções: Linha do tempo, Capítulos, Árvore, Pessoas, e "Nova memória" como ação. Rascunhos e lixeira vão para um item "Meus rascunhos" (ver "Corrigir e desfazer").
3. Na memória, "Ver na árvore" junto das pessoas, quando houver mais de uma pessoa da família.

**Descartada:** inverter a linha do tempo (mais novo no alto). Ajuda quem volta para ver o que entrou, mas esse papel é do painel pessoal, que já está em "Em aberto"; e a primeira visita no Natal começaria por memórias recentes, sem o começo da história.

## Primeira visita

Capturas: `inicio`, `inicio-como-elizete`.

**Hoje:** a pessoa entra no Natal pelo Cloudflare Access e cai na linha do tempo, com o nome do site em letras grandes, "41 memórias da nossa família, de 1958 a 2026" e a primeira memória de 1958. Não há boas-vindas, nem explicação do que dá para fazer, nem sinal de onde a pessoa aparece.

**Atrito:** quem não participou da montagem não sabe que pode escrever o próprio relato numa memória, que existe a árvore com "sua avó" do ponto de vista dela, nem que as memórias restritas ao núcleo dela estão ali e as outras pessoas não veem.

**Recomendação:** o painel pessoal com as boas-vindas de Natal já está em "Em aberto" nas decisões. Para ele, a ordem sugerida é: boas-vindas com o nome da pessoa; "Você aparece em N memórias" levando à página dela; a árvore partindo dela; uma memória para escrever o primeiro relato; e a linha do tempo inteira. Enquanto o painel não existe, um recado único no alto da linha do tempo na primeira visita, com os dois links (sua página e a árvore), resolve o essencial.

**Descartada:** um tour guiado por cima das telas. Pesado para quem só quer olhar fotos, e frágil quando o visual mudar.

## O controle certo para cada escolha

| Onde | Escolha | Controle de hoje | Proposta |
| --- | --- | --- | --- |
| Laço, "Com quem" | uma pessoa entre todas, ou nome novo | lista suspensa e campo de texto ao lado | busca com sugestão, com "Cadastrar" no fim |
| Relato, "Quem está contando" | eu ou outra pessoa | lista suspensa com todos | "Eu" e "Outra pessoa", com busca |
| Árvore, "Partir de" | uma pessoa entre todas | lista suspensa | busca com sugestão |
| Árvore, "Destacar" | um núcleo entre 3 ou 4, ou nenhum | lista suspensa | botões de opção |
| Laço, "Filiação" | biológica ou adotiva | lista suspensa | botões de opção |
| Casal, "Fase de hoje" | 6 fases | lista suspensa | botões de opção, ou manter a lista (está no limite) |
| Laço do coração, "Proximidade" | poucas opções, mais "Não dizer" | lista suspensa | botões de opção |
| Memória, "Quem estava?" | várias pessoas | pílulas com filtro | manter; o filtro já existe a partir de dez nomes |
| Ficha, "Família" | uma ou mais famílias | pílulas iguais às de opção única | caixas de marcar com cara de caixa (ver inventário) |
| Memória, "Quem pode ver?" | todos ou núcleos | rádio nativo, depois dos núcleos | pílulas, como o tipo de momento, e núcleos depois |
| Memória, mês | 12 meses ou "Não sei" | lista suspensa | manter |
| Memória, dia | 1 a 31 | campo de número | manter, mas igual nos três formulários (ver "Datas") |
| Capítulo, "Dentro de" | um capítulo entre poucos | lista suspensa | manter enquanto forem poucos |

## Datas

Quatro jeitos de informar data hoje:

| Onde | Campos | Ordem |
| --- | --- | --- |
| Memória | ano com ±10 e ±1, mês (lista), dia (número), calendário, "Foi hoje", "Não tenho certeza da data" | ano, mês, dia |
| Capítulo de época | ano com ±10 e ±1 e mês na mesma linha | ano, mês |
| Nascimento e falecimento | dia (número), mês (lista), ano (número sem passos) | dia, mês, ano |
| Fases do casal | só ano (número) | ano |

**Recomendação:** uma peça só, `CampoData`, com a ordem ano, mês, dia em todos os lugares (o ano é o que quase sempre se sabe), os passos ±10 e ±1 no ano, e partes ligáveis: o dia some nas fases do casal e no capítulo; "Foi hoje" e o calendário só aparecem na memória; "Não tenho certeza" vale para memória e nascimento. A peça `CampoAno.astro`, extraída nesta sessão, é o começo dela.

**Descartada:** o calendário do navegador como campo principal. Não aceita "só o ano" nem "mês e ano", que são a maioria das memórias antigas.

## Ação principal

- Nos formulários em etapas, "Voltar" à esquerda e a principal à direita, como combinado. Na nova pessoa, as ações ficam à esquerda e empilhadas no celular ("Cadastrar e ir para os laços" e "Cancelar" embaixo).
- Na página da memória, as duas ações ("Escrever ou editar o meu relato" e "Corrigir esta memória") são botões leves iguais, no fim da página. Na página da pessoa, as ações ficam no alto.
- Na edição da pessoa há duas principais na mesma tela: "Adicionar laço" e "Salvar página".
- O botão de perigo aparece ao lado de "Cancelar" na confirmação de excluir memória, e sozinho no bloco do capítulo.

**Recomendação:** a ação principal de leitura no alto, junto do título, em memória, pessoa e capítulo ("Escrever meu relato", "Editar página", "Editar capítulo"); as secundárias e o histórico logo abaixo dela; excluir sempre por último, separado. Na edição da pessoa, cada seção com o seu botão, e só uma seção aberta por vez.

## Volta e confirmação

| Depois de | Vai para | Recado |
| --- | --- | --- |
| Publicar memória | confirmação na mesma página | "Memória guardada" |
| Salvar rascunho | a mesma página | "Rascunho salvo." |
| Publicar relato | confirmação na mesma página | "Relato publicado" |
| Cadastrar pessoa | edição, etapa 2 | "Fulano entrou no acervo. Agora, os laços." |
| Salvar ficha da pessoa | página da pessoa | "Página atualizada." |
| Salvar laço | a mesma edição | "Laço salvo." e variações |
| Criar capítulo | página do capítulo | "Capítulo criado. Agora é só colocar as memórias nele." |
| Excluir memória | início | "... foi para a lixeira. Dá para recuperar pelo link no rodapé." |
| Excluir capítulo | capítulos | "... foi para a lixeira. As memórias dele continuam no acervo." |
| Remover laço | a mesma edição | "Laço removido." |

Os recados seguem um padrão bom, com o resultado e o próximo passo. As exceções são "guardada" para publicar, e "Laço removido." sem dizer se dá para voltar.
