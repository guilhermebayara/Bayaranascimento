# Decisões do acervo

Regras combinadas para o site da família. Servem de guia para o que for construído.

## Estrutura

- **Memória**: a ficha compartilhada de um acontecimento (título, data, lugar, pessoas, fotos).
- **Relato**: a lembrança de uma pessoa sobre uma memória. Um por pessoa em cada memória.
- **Pessoa**: quem aparece nas memórias. O núcleo (Gui, Giovanna, Elizete) fica no menu, e as demais ficam na página Pessoas.

## Quem pode o quê

| Ação | Quem |
|---|---|
| Criar memória, capítulo ou tema | Qualquer pessoa com acesso |
| Corrigir a ficha da memória ou mudar a visibilidade | Quem criou e as pessoas citadas nela, desde que vejam a memória |
| Acrescentar relato a uma memória | Qualquer pessoa que vê a memória, um relato por pessoa |
| Editar um relato | Só quem escreveu (ou quem registrou, no relato de quem não acessa o site) |
| Registrar relato de quem não acessa o site | Qualquer pessoa que vê a memória, creditada como "registrado por" |
| Acrescentar foto | Qualquer pessoa que vê a memória |
| Remover foto | Só quem enviou |
| Editar a própria página | A própria pessoa |
| Editar a página de quem não acessa o site | Quem divide um núcleo com a pessoa, quem a cadastrou e os admins |
| Criar ou mudar laços de árvore | Os envolvidos, quem divide um núcleo com algum deles e os admins |
| Criar ou mudar um laço do coração | Só o dono do laço |
| Excluir memória inteira | Os admins (Gui e Giovanna), com alerta, e só o que enxergam. Quem escreve um rascunho pode descartá-lo |

A regra em código está em `src/lib/servidor/permissoes.ts`, com testes em `testes/`.

## Princípios

- Ninguém interfere em como outra pessoa lembra de algo.
- Toda mudança fica registrada em um histórico e pode ser revertida.
- Excluir nunca apaga na hora: o conteúdo vai para uma lixeira e pode ser recuperado.
- O acervo é privado, com acesso por e-mail.

## Infraestrutura

- Site em Astro, publicado no Cloudflare em memorias.bayara.com.br
- Login com Cloudflare Access
- Textos, núcleos, rascunhos e histórico no banco D1 `bayara-memorias`
- Fotos no bucket R2 `bayara-memorias`, com o iCloud como casa dos originais
- Este repositório guarda só o código. Nenhum conteúdo da família fica aqui.

## Como o site funciona

- Toda página é montada para a pessoa logada, e é isso que esconde o que é restrito a um núcleo.
- A regra de quem vê está em `src/lib/servidor/permissoes.ts` e, em SQL, em `src/lib/servidor/repositorio.ts`. As duas mudam juntas.
- A estrutura do banco está em `src/lib/servidor/banco.ts`. O site aplica as mudanças sozinho na primeira visita depois de publicado.
- Prévias de branch usam o banco e o bucket `bayara-memorias-teste`, só com exemplos, e por isso funcionam sem login.
- A proposta completa de estrutura (laços, árvore, capítulos, temas) está no documento "Acervo da família: proposta de estrutura".

## Tipos de momento

- A lista de tipos vive no banco (tabela `tipos`), não no código. Só os admins criam, renomeiam e mudam a cor, em `/admin/tipos`.
- "Outro" é a saída de quem não achou o tipo: a pessoa pode escrever em uma ou duas palavras o que foi, e a memória é salva assim.
- A tela de admin mostra o que foi escrito em "Outro" e quantas memórias usam cada nome. Um nome que se repete pode virar tipo novo ou ser juntado a um tipo que já existe, e as memórias mudam junto.
- A contagem só considera memórias que o admin pode ver. A promoção vale para todas as memórias com aquele nome.
- Detalhes mais específicos ficam para os temas, que são livres.

## Integrantes e laços de árvore

- O banco guarda só dois laços: filiação (biológica, adotiva ou de consideração) e casal. O resto é calculado em `src/lib/parentesco.ts`: avós, tios, primos, sobrinhos, sogros, cunhados, genro e nora, madrasta e enteado.
- Um casal é uma sequência de fases (namoro, noivado, casamento, união, separação, amizade), com anos opcionais. A última fase é a atual. Separar é acrescentar uma fase, e não apagar o casal.
- O parentesco aparece do ponto de vista de quem está logado ("sua avó"). Laço de consideração é dito com todas as letras ("seu filho de consideração"); adoção não ganha adjetivo.
- Cada integrante tem "como se referir" (ela, ele ou não informar), usado só para escrever os nomes de parentesco.
- Um casal pode ser marcado como "só os dois veem": aparece para as duas pessoas e para quem cadastrou. A opção "núcleos escolhidos" para casais desfeitos ainda não existe.
- Quem edita a ficha: a própria pessoa. Para quem não acessa o site, membros de um núcleo em comum, quem cadastrou e os admins.
- Quem mexe em laços de árvore: os envolvidos, quem divide um núcleo com algum deles e os admins.
- Os laços entram por um formulário só, "Adicionar laço": um seletor escolhe o tipo (filho de, pai de, casal, do coração) e mostra os campos daquele tipo. A outra pessoa pode ser da lista ou um nome novo, cadastrado na hora.
- **Laços do coração** (primeira versão): nome livre, "como se fosse" opcional (dá lugar na árvore de quem escolheu), proximidade que só o dono vê e a opção "só eu vejo". O laço é sempre de quem está logado. Ainda faltam o período do laço, o círculo e esconder do acervo a pessoa que só aparece em laços privados.
- A árvore (`/arvore`) é uma só: a família inteira, com todas as ligações desenhadas. Linha grossa liga o casal (pontilhada quando não está mais junto), uma linha desce dos pais e se abre para os irmãos, e tracejado marca consideração e coração.
- Os controles não trocam de tela: mudam o destaque e o que aparece, na hora. **Partir de** põe uma pessoa em foco e centraliza a árvore nela. **Destacar** um núcleo deixa os outros mais apagados, ainda ligados; desligar "Outros núcleos" esconde quem é de fora. As camadas ligam e desligam consideração e coração, ex-casais e bichos.
- Tocar em alguém põe a pessoa em foco. Tocar de novo abre a página dela. O estado fica no endereço, então dá para mandar o link de uma visão.
- O desenho é calculado no navegador (`src/lib/arvore-desenho.ts`): gerações em linhas, casais lado a lado como um bloco, filhos sob os pais. O casamento alinha as duas famílias na mesma geração.
- Laços do coração com "como se fosse" entram na geração que o papel indica, e a família de uma amiga fica perto de quem a escolheu. Para o dono, "seu amigo-irmão"; para os demais, "amigo-irmão de Gui".
- **Escadinha dos laços do coração.** Um laço "como se fosse" se liga pelo caminho mais próximo do sangue, sem inventar laços que não existem. Se a pessoa escolhida também tem laço do coração com o pai ou a mãe de quem escolheu, o laço passa por ele: a tia de consideração do Gui é amiga-irmã da Elizete, e a Dona Lourdes é mãe de consideração da Elizete, então as duas se ligam à Elizete e não ganham linha até o Gui. Quem não passa por ninguém (a Dona Déia) se liga direto, mesmo cruzando outras linhas. O laço do meio aparece junto, mesmo com os laços da Elizete recolhidos. Tios e tias "tortos" costumam ser casados com tios de sangue ou amigas da mãe, e entram por esses laços.
- "Como se fosse pai ou mãe" existe como papel, para casos como a mãe de consideração da Elizete.
- **Marca do ramo recolhido** (do FigJam): ocupa o lugar de mais um filho, ao lado de quem está na linha direta e do lado de fora do casal, e a linha dos pais se divide até ela. No meio da linha entre pais e filho ela parecia algo entre os dois. Dois ramos ao lado da mesma pessoa ficam um depois do outro, o do casal mais perto.
- **Linhas dos laços do coração em tronco**: os laços de uma pessoa para o mesmo lado saem juntos numa faixa só, descem no vão ao lado dela e entram pela lateral. O tronco e cada galho são desenhados uma vez só, sem trechos sobrepostos, para o tracejado não virar linha cheia. Curvas grandes mostram direção e bifurcação; ângulo reto fica para cruzamento. Vizinhos se ligam por uma linha reta.
- O cartão do ramo aberto não tem título: a linha até o casal já diz de onde ele vem. Fica só o botão de fechar, no canto.
- Casal sem ninguém da linha direta embaixo (Luísa e Bruno) ganha o ponto do casal e uma linha curta até a marca do ramo.
- A ordem das fileiras é buscada a partir de três arranjos (o que veio, o espelho e um ordenado pelos núcleos) e fica o melhor. Sem isso, abrir os laços do Gui e da Giovanna juntos espelhava a árvore, com o lado Bracarense à esquerda. Os dados da prévia ficam em `testes/dados/arvore-previa.json` e os testes conferem os lados com várias combinações de laços abertos.
- **Ramo aberto** (do Figma): a linha sai da marca do casal, corre por fora, logo acima do cartão, e só entra nele em cima de cada filho do ramo. O cartão nunca cobre quem liga o ramo à árvore (a Elizete, no ramo da Tia Lourdes). O resto da árvore recua, apagado e desfocado, e ficam nítidos o cartão, o casal de origem com a marca e quem é da mesma geração do ramo e vem do mesmo casal. Com vários ramos abertos, vale o último. Ao abrir, o mapa anda o mínimo para o cartão caber na tela.
- Só chega ao navegador o que a pessoa pode ver: casais e laços privados de outras pessoas ficam no servidor.
- Fora da produção, o banco de teste ganha parentes inventados (ids começando com `ex-`) para a árvore ter mais cenários.
- Sem "como se referir" informado, o parentesco sai nas duas formas: "seu tio ou sua tia".

## Lixeira e histórico

- Excluir uma memória publicada é com os admins, passa por uma página de confirmação e manda para a lixeira (`/lixeira`). A memória some do site com fotos e relatos, mas nada é apagado.
- Rascunho é de quem escreve: a própria pessoa descarta, e ele também vai para a lixeira.
- Cada pessoa vê na lixeira só o que pode recuperar: admins, as memórias que enxergavam; os demais, os próprios rascunhos.
- O histórico de uma memória (`/memorias/<id>/historico`) mostra cada alteração da ficha, com o que mudou e como era antes. Quem pode corrigir a memória pode voltar a ficha para uma versão anterior.
- Restaurar uma versão traz título, data, tipo, lugar e pessoas. Quem pode ver, núcleos e fotos ficam como estão, para uma restauração nunca abrir a memória a mais gente.
- Do relato, cada pessoa vê só os textos anteriores do que ela mesma escreveu ou registrou, e pode voltar a um deles.
- Fotos removidas aparecem no histórico para quem enviou, que pode devolvê-las à memória.
- Ainda não existe apagar de vez: o que vai para a lixeira fica lá.

## Interação dos formulários

Decisões de interação, independentes do visual. O visual pode mudar a aparência de cada peça sem mudar o comportamento.

- **Formulário longo vira etapas** (`src/lib/cliente/etapas.ts`): uma parte por vez, com a trilha no topo. Voltar é livre; para avançar, o obrigatório da etapa precisa estar preenchido. Sem JavaScript, as etapas aparecem todas em sequência.
- **Nova memória** tem cinco etapas: o momento, pessoas e lugar, fotos, relato, quem vê. "Salvar rascunho" fica disponível em todas; "Publicar" só na última, depois de um resumo para conferir.
- **Data:** o ano começa vazio (preenchido com o ano atual, alguém poderia publicar uma memória antiga com o ano errado) e tem botões de −10, −1, +1 e +10. Mês e dia são opcionais. Um calendário e o botão "Foi hoje" preenchem dia, mês e ano de uma vez, para quem sabe a data exata.
- **Ações de etapa:** "Voltar" à esquerda; "Salvar rascunho" e a ação principal ("Continuar" ou "Publicar") à direita.
- **Nova pessoa** pede só o essencial (nome, pessoa ou bicho, como se referir). Datas e história ficam recolhidas. O cadastro segue para uma segunda etapa só de laços.
- **Tipo de laço** é escolhido em abas que dizem em uma frase o que cada uma é, e não em uma lista suspensa.
- Lista de pessoas com mais de dez nomes ganha um campo para filtrar.

## Capítulos e temas

- Um capítulo reúne memórias em um momento maior e tem dois modos. **Reunido:** alguém escolhe as memórias, e o período vai da primeira à última. **De época:** tem início e fim (o fim pode ficar em aberto), e as memórias entram sozinhas pela data.
- Um capítulo pode ficar dentro de outro, com no máximo dois níveis. A página do maior mostra as memórias dele e as dos capítulos de dentro.
- As relações pelo tempo são calculadas: a página de uma época lista os capítulos que aconteceram nela (inteiros ou "em parte"), e a de um capítulo diz durante quais épocas ele aconteceu.
- **Temas** são etiquetas livres para memórias e capítulos, digitadas separadas por vírgula. Cada tema tem uma página que junta tudo o que o usa.
- O capítulo tem visibilidade própria (título e abertura). Cada memória mantém a dela: contagem, período e lista consideram só o que quem olha pode ver.
- Uma memória entra em um capítulo reunido pelo formulário da memória ou pela página do capítulo, onde cada pessoa marca as memórias que pode corrigir.
- Edita o capítulo quem criou e quem tem memórias nele. Excluir é com os admins e manda para a lixeira; as memórias continuam no acervo.
- Ficou para depois: capítulo ligado a uma fase de casal ou a pessoas, recorte de época por núcleo ou pessoa, foto de capa escolhida e os capítulos como faixas na linha do tempo (depende do visual).

## Decidido em 15/11, a construir depois do QA

Decisões do Gui que ainda não estão no código. Não são defeitos: o site ainda funciona do jeito antigo nesses pontos.

- **Núcleo e parentes.** O núcleo são só as pessoas que acessam o site: Gui, Giovanna, Lucas Magno, Elizete, Ana Candida, Lúcio e Regina. O resto da família são parentes de um núcleo: levam a cor e o lado dele na árvore, e quem é do núcleo edita a página deles e mexe nos laços deles. Na tela os dois aparecem iguais; a diferença fica no banco. Aguilar, Vó Bela, Vó Vivica e o Chico passam de membros para parentes. Hoje ninguém cadastrado pelo site entra em núcleo nenhum, e por isso aparece com a cor de quem é de fora (o avô materno do Gui foi o primeiro caso real).
- **Sugestão de família no cadastro.** Ao cadastrar alguém como marido, filho ou pai de uma pessoa, o site já marca a família dela, e quem cadastra confirma ou troca. Se o pai e a mãe dividem um núcleo, o filho vai para ele (filho da Giovanna com o Lucas Magno é Bayara Bracarense); se não dividem, vêm as famílias de cada um. Vale para bichos. Ninguém vira membro de núcleo por esse caminho: acesso continua com os admins.
- **Laço do coração com "quem reconhece".** A filiação de consideração e o laço do coração viram um formulário só, com a pergunta "só eu" ou "a família toda reconhece". O segundo grava uma filiação de consideração e segue as permissões dos laços de árvore. "De consideração" fica para o que a família reconhece; o laço pessoal é dito pelo papel ("amigo-irmão", "como uma mãe").
- **Laço resumido.** Fora das famílias, entre pessoas do coração e os parentes delas, vale um laço de sangue sem o caminho completo ("Caio é sobrinho do Ed"), com os papéis do "como se fosse". É recusado quando uma das pessoas é de um núcleo ou parente de um. Pela escadinha, o Caio passa pelo Ed e aparece no ramo dele. Se o caminho completo for cadastrado depois, o site oferece a troca.
- **Bichos.** Continuam como filhos e netos, porque é assim que as duas famílias os tratam. A diferença vem do tipo: o rótulo segue "filho", e o cartão e a linha na árvore ganham uma marca própria, provisória até o visual.
- **Áudios nos relatos.** Um relato pode ter vários áudios, em ordem, e uma transcrição opcional. A página da pessoa reúne os áudios em que ela fala. Os primeiros são os 12 áudios da Vó Bela, em `2_Material para o acervo/Áudios Vó` no Drive do Gui. A transcrição automática precisa rodar fora deste ambiente, que não baixa os modelos.

## Em aberto

- Histórico de integrantes e laços no site (as versões já são guardadas) e apagar de vez o que está na lixeira
- Foto de retrato do integrante, juntar cadastros duplicados e sugestão de nomes parecidos ao digitar
- Árvore: regras de ocultar e de exigir parentes de sangue, centros padrão escolhidos na administração e página do laço com linha do tempo
- Quem só existe em laço privado de outra pessoa já some da árvore, mas ainda aparece na lista de Pessoas
- Painel pessoal como página inicial, com as boas-vindas de Natal na primeira visita
- Círculo e avisos
- Fotos enviadas em um formulário abandonado ficam no bucket sem uso: falta uma limpeza periódica

## Origem

As ideias abaixo surgiram no jantar de casamento da Giovanna, em 14 de novembro de 2026, o dia em que o site nasceu. Todas viraram decisões, detalhadas no documento "Acervo da família: proposta de estrutura" e nas seções acima; a lista fica como registro.

- **Árvore genealógica.** Guardar só os laços básicos de cada pessoa (pais e casal) e calcular o resto. A relação pode aparecer do ponto de vista de quem está olhando ("sua avó").
- **Núcleos familiares** como entidade, com página, árvore e linha do tempo próprias: Bayara Nascimento, Bayara Bracarense (Giovanna e Lucas Magno) e Bracarense. Uma pessoa e uma memória podem pertencer a mais de um.
- **Visibilidade configurável** por memória, que pode ser mudada depois: todos, só determinados núcleos, ou privada da pessoa.
- **Rascunhos.** Memória e relato podem ser salvos sem publicar, para escrever aos poucos, inclusive continuando em outro aparelho.
- **Acessos.** O Lucas Magno deve ter acesso. Outras pessoas dos Bracarense, a definir.
- O site como registro para a próxima geração.

Consequência técnica da visibilidade: páginas com conteúdo restrito não podem ser estáticas, porque uma página estática é igual para todos. As linhas do tempo e as memórias passariam a ser montadas para cada pessoa logada.
