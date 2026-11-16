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
| Corrigir a ficha da memória | Quem criou e as pessoas citadas nela, desde que vejam a memória |
| Mudar quem pode ver uma memória ou um capítulo | Só quem criou. Quem é citado ainda marca núcleos numa memória aberta a todos, o que não restringe nada |
| Acrescentar relato a uma memória | Qualquer pessoa que vê a memória, um relato por pessoa |
| Editar um relato | Só quem escreveu (ou quem registrou, no relato de quem não acessa o site) |
| Registrar relato de quem não acessa o site | Qualquer pessoa que vê a memória, creditada como "registrado por". Cada pessoa pode ter o seu rascunho, que ninguém mais vê; publicado, fica um só |
| Acrescentar foto | Qualquer pessoa que vê a memória |
| Remover foto | Só quem enviou |
| Editar a própria página | A própria pessoa |
| Editar a página de quem não acessa o site | Quem divide um núcleo com a pessoa, quem a cadastrou e os admins |
| Criar ou mudar laços de árvore | Os envolvidos, quem divide um núcleo com algum deles e os admins |
| Criar ou mudar um laço do coração | Só o dono do laço |
| Excluir memória inteira | Os admins (Gui, Giovanna e Magno), com alerta, e só o que enxergam. Quem escreve um rascunho pode descartá-lo |

A regra em código está em `src/lib/servidor/permissoes.ts`, com testes em `testes/`.

## Princípios

- Memória e capítulo novos ganham um código aleatório no endereço, e não o título: o endereço de um rascunho guardava o título de antes da publicação, e um título repetido denunciava uma memória que a pessoa não vê.

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
- **Aviso de tamanho do banco** (decisão do Gui, 16/11/2026, `src/lib/tamanho-do-banco.ts`). No plano gratuito, cada banco D1 vai até 500 MB, e o aviso começa em 300 MB, para sobrar tempo de decidir. O tamanho só se sabe com o site rodando (o `meta.size_after` que o D1 devolve em cada consulta), então o aviso não cabe na guarda do build. Os administradores veem no rodapé, junto de "Baixar cópia do acervo", o tamanho do banco ("Banco: 12 MB de 500 MB"); passando de 300 MB, vira um recado com o tamanho e a saída combinada. A cópia mensal leva o tamanho (`banco` em `/api/copia`), e `scripts/copia-no-drive.gs` falha quando ele passa do aviso, o que faz o Google mandar o e-mail, sem deixar de salvar a cópia (ver `docs/copia-no-drive.md`). Se o limite chegar, a saída combinada é o plano Workers Paid (10 GB por banco), e não dividir o acervo em dois bancos. A conta está na seção "Custo" do documento de estrutura.

## Fotos de exemplo: o Chico e a Karol

Decisão do Gui, 16/11/2026 (`src/lib/fotos-de-exemplo.ts`, `src/lib/servidor/fotos-de-exemplo.ts`, testes em `testes/fotos-de-exemplo.test.ts`).

- O acervo de exemplo não tem foto vazia: tudo o que pede foto usa uma das 11 fotos dos dois cachorros, para conferir o visual com fotos de verdade. As cópias reduzidas (1600 px, JPEG) estão em `exemplos/fotos/` (`chico-1.jpg` a `chico-5.jpg`, `karol-1.jpg` a `karol-6.jpg`); os originais ficam na pasta do Drive.
- Retrato de quem é tratado como "ela": uma foto da Karol. De quem é tratado como "ele": uma foto do Chico. Bichos e "Não informar": de um dos dois. O recorte quadrado é feito na tela, com a foto cobrindo o quadrado do retrato. Fotos das memórias: de um dos dois.
- O sorteio é fixo, tirado do id do registro (da memória e da posição da foto, no caso das fotos), para a mesma pessoa e a mesma memória sempre mostrarem a mesma foto e as capturas de antes e depois serem comparáveis.
- O bucket de teste guarda só essas 11 fotos, debaixo de `exemplos/`: toda foto e todo retrato de exemplo apontam para um dos 11 arquivos (`exemplos/chico-1.jpg`), sem cópia por memória ou por pessoa.
- **Como as fotos chegam ao bucket de teste:** `npm run fotos-de-exemplo -- <endereço de uma prévia ou http://localhost:4321>` (`scripts/enviar-fotos-de-exemplo.mjs`). O site recebe pela rota `/api/fotos-de-exemplo`, que só existe nas prévias de teste e no computador e só aceita os 11 arquivos, conferidos pelo SHA-256. Basta uma vez, porque as prévias dividem o bucket; no computador, uma vez por banco local novo. Assim nada pesa no pacote publicado: `exemplos/` fica fora de `src/` e de `public/`.
- **Semente:** as fotos de exemplo que nasceram com a chave vazia passam a apontar para uma das 11, e cada pessoa e bicho ganha um retrato de exemplo, uma vez só (quem tirar ou trocar um retrato ao testar não o vê voltar). Roda dentro da mesma proteção das memórias de exemplo. Quem é cadastrado depois, ao testar, começa sem retrato, com as iniciais.
- **Homologação:** o espelho aponta as fotos das memórias (de nenhuma a três por memória) e os retratos para as mesmas 11 fotos, com o mesmo sorteio. A homologação não guarda cópia: lê os arquivos de `exemplos/` no bucket de teste, só leitura (`bucketDosExemplos`). O bucket `bayara-memorias-homologa` continua recebendo só o que o Gui e a Giovanna enviarem ao testar, e o banco da homologação continua sem o acervo de exemplo: só as fotos são compartilhadas.
- **Limpeza do bucket de teste:** as fotos e os retratos que as prévias enviaram ao testar (fora de `exemplos/`) são apagados depois de 7 dias, e o registro passa a apontar para uma foto de exemplo, pelo mesmo sorteio, para nada ficar vazio. Os áudios ficam de fora, porque já têm o teto de 200 MB, e nada de `exemplos/` é apagado. Roda junto da semente, no máximo uma vez por dia (a marca do dia fica na tabela `limpezas_do_teste`, que só existe no banco de teste), e um erro nela nunca derruba o site.
- A guarda da produção falha se as fotos de exemplo puderem chegar ao pacote publicado (arquivo em `src/` ou `public/`, ou código importando de `exemplos/`), se a produção puder ler o bucket dos exemplos, se a leitura da homologação puder gravar ou apagar, ou se a limpeza ou o envio puderem rodar na produção ou na homologação.

## Como o site funciona

- **Linha do tempo** (decisão do Gui, 16/11/2026): as memórias mais recentes primeiro, e rolar leva ao passado (`maisRecentesPrimeiro`, em `src/lib/datas.ts`), em todas as páginas que mostram a linha do tempo. "Antes" e "Depois", no fim da memória, continuam pela data. Uma barra fixa no alto da linha do tempo leva direto a cada década (2020, 2010... 1950), só quando há mais de uma; com um filtro de tipo ligado, as décadas sem memória daquele tipo saem da barra.
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
- O parentesco aparece do ponto de vista de quem está logado ("sua avó"). Laço de consideração é dito com todas as letras ("seu filho de consideração"); adoção não ganha adjetivo. Na própria página, a família e os laços do coração usam o possessivo do mesmo jeito ("sua mãe", "sua vó de consideração"); na página de outra pessoa, o parentesco é o dela ("mãe"). Na edição dos laços, "filho ou filha" só aparece quando "como se referir" não está informado (decisão do Gui, 16/11/2026).
- Cada integrante tem "como se referir" (ela, ele ou não informar), usado só para escrever os nomes de parentesco.
- Um casal pode ser marcado como "só os dois veem": aparece para as duas pessoas e para quem cadastrou. Quem não vê esse casal consegue cadastrar o mesmo par normalmente, como um registro público à parte, e nada denuncia o privado; quem vê o privado continua vendo só ele. Se quem vê o privado o tornar público, ele toma o lugar do registro público. A opção "núcleos escolhidos" para casais desfeitos ainda não existe.
- Quem edita a ficha: a própria pessoa. Para quem não acessa o site, membros do núcleo da pessoa ou do núcleo de que ela é parente, quem cadastrou e os admins.
- Quem mexe em laços de árvore: os envolvidos, membros do núcleo de algum deles (ou do núcleo de que ele é parente) e os admins.
- Os laços entram por um formulário só, "Adicionar laço": um seletor escolhe o tipo (filho de, pai de, casal, do coração e, para quem é de fora das famílias, parente de amigo) e mostra os campos daquele tipo. A outra pessoa pode ser da lista ou um nome novo, cadastrado na hora.
- **Editar laço** (pedido do Gui, 16/11/2026): na edição da pessoa, os laços que já existem vêm primeiro, agrupados por tipo (Pais, Filhos, Casal, Parentes de fora das famílias, Laços do coração), e cada um tem "Editar", que abre os campos dele no próprio lugar: a filiação (biológica ou adotiva), o nome, o lugar na árvore, a proximidade e "só eu vejo" do laço do coração, o parentesco do parente de amigo, as fases do casal. Remover fica dentro da edição, separado e com confirmação. Um laço em edição por vez. Trocar a outra pessoa de um laço ainda é remover e adicionar. "Adicionar laço" fica depois da lista, para a pessoa ver o que existe antes de criar um repetido.
- **Foto de retrato** (decisão do Gui, 16/11/2026, migração `016`, `src/lib/retratos.ts`): opcional, para pessoas e bichos, e só por envio de foto nova (sem recortar de fotos de memórias). Em "Nova pessoa" fica no que vem recolhido ("Foto, nascimento e história"); em "Editar página e laços", à vista, com "Trocar foto" e "Tirar foto". Depois de escolher, a pessoa enquadra o rosto num quadrado (arrastar, "Aproximar", dois dedos no celular, setas no teclado) e vê como vai ficar antes de salvar. O navegador recorta e reduz para 800 px (`src/lib/cliente/retrato.ts`), e o arquivo vai junto com a ficha, quando ela é salva. O arquivo fica no bucket das fotos, debaixo de `retratos/`, e a chave em `integrantes.retrato`.
  - Quem põe, troca ou tira: quem pode editar a página da pessoa (`podeMudarRetrato`). Trocar ou tirar não apaga o arquivo: a chave anterior fica na versão guardada do cadastro, como os outros campos.
  - Quem vê: quem vê a pessoa, como vê o nome. Quem só existe num laço privado de outra pessoa, sem laço que se veja, não é visto (`pessoasQueNaoVe`), e o retrato dele responde como um que não existe. Só o retrato atual é entregue; os trocados ficam guardados sem aparecer.
  - Aparece na página da pessoa, em "Quem" na memória e na ficha que abre ao tocar na pessoa na árvore. Os cartões da árvore continuam sem foto. Sem retrato, as iniciais (primeira e última palavra do nome) sobre a cor da família, a mesma da árvore. A aparência é a mínima do estilo atual, até o retrato recortado da primeira versão do visual.
  - O espelho da produção não leva os retratos reais, como não leva áudios: no lugar, cada pessoa ganha um retrato de exemplo (ver "Fotos de exemplo"). Um retrato de exemplo é dividido por várias pessoas, e é entregue a quem vê pelo menos uma delas.
- **Data da adoção** (pedido do Gui, 16/11/2026, migração `014`): um laço adotivo pode ter a data da adoção, flexível como as outras (só o ano basta). O campo aparece quando "Adotiva" é marcada, no cadastro e na edição do laço. Nos outros tipos de filiação a data é apagada. Aparece na página da pessoa ("adoção em maio de 2001") e na lista de laços. No espelho da produção, só o ano, deslocado como os outros.
- **Cadastro guiado** (pedidos do Gui, 16/11/2026): depois de "Cadastrar e ir para os laços", a primeira pergunta é "Como Fulano se liga a vocês?", com dois caminhos: **Da família** (pais, casal, filhos) e **Do coração** (o laço com quem está cadastrando, o casal, e parentes que estão no acervo, pelo laço resumido; amigos quase nunca têm os pais cadastrados). Bicho vai direto para "Quem é a família de Fulano?". Uma pergunta por tela, cada uma com a busca de pessoa, "Adicionar" e o caminho para a próxima ("Pular esta pergunta" enquanto ninguém foi adicionado, "Próxima pergunta" depois). A pergunta dos parentes só vale para quem é de fora das famílias, como o laço resumido. A tela final mostra o que foi cadastrado e oferece o outro caminho.
- **Todos os tipos de laço:** cada tela do cadastro guiado tem "Ver todos os tipos de laço", o formulário com abas, para quem já sabe o que quer (inclusive o laço do coração que a família toda reconhece, que fica fora do guiado). Dali, "abrir sempre assim" deixa o modo completo como padrão para aquela pessoa, guardado num cookie do navegador; "Voltar para as perguntas guiadas" desfaz.
- **Casal** (pedido do Gui, 16/11/2026): as fases aparecem como uma linha do tempo ("Namoro, 2015 a 2018", "Casamento, desde 2020"). Uma fase sem fim informado acaba quando a seguinte começa (`periodosDasFases`, em `src/lib/parentesco.ts`), e a separação é um momento ("em 2019"); isso só muda o que se mostra, o banco guarda o que foi informado. Em "Editar o casal", cada fase é uma linha que abre com "Mudar", "Terminou em" só aparece na última fase (ou onde já foi preenchido), e "O que aconteceu depois?" acrescenta uma fase. A fase é escolhida em botões de opção, não em lista suspensa.
- **Falecimento e fim de relação são opções** (decisão do Gui, 15/11/2026): a data só aparece depois de marcar "Já faleceu", na ficha, ou "Já terminou", no casal. Dá para saber que alguém faleceu sem saber quando ("1930 a ?" na árvore). No cadastro do casal, "Já terminou" acrescenta a separação depois da fase de hoje; nas fases de um casal, só a última pede o fim, porque cada fase termina quando a seguinte começa (ver "Casal", abaixo).
- **Laços do coração** (primeira versão): nome livre, "como se fosse" opcional (dá lugar na árvore de quem escolheu), proximidade que só o dono vê e a opção "só eu vejo". O laço é sempre de quem está logado. Ainda faltam o período do laço, o círculo e esconder do acervo a pessoa que só aparece em laços privados.
- A árvore (`/arvore`) é uma só: a família inteira, com todas as ligações desenhadas. Linha grossa liga o casal (pontilhada quando não está mais junto), uma linha desce dos pais e se abre para os irmãos, e tracejado marca consideração e coração.
- Os controles não trocam de tela: mudam o destaque e o que aparece, na hora. **Partir de** põe uma pessoa em foco e centraliza a árvore nela. **Destacar** um núcleo deixa os outros mais apagados, ainda ligados; desligar "Outros núcleos" esconde quem é de fora. As camadas ligam e desligam consideração e coração, ex-casais e bichos.
- **Partir de** só oferece quem tem laço de árvore (filiação ou casal): de quem só tem laço do coração, a árvore seria a pessoa sozinha. A página dessas pessoas não tem "Ver na árvore", e a ficha delas na árvore não tem "Partir desta pessoa". Um endereço que parte de alguém assim abre a árvore padrão.
- Nenhum filtro esconde de quem a árvore parte: partindo de um bicho, "Bichos" fica ligado e travado; partindo de alguém de fora do núcleo em destaque, "Outros núcleos" fica ligado e travado, com a dica do motivo.
- **Amigos sem lugar na família** (laço do coração sem "como se fosse") não aparecem na árvore por padrão, nem contam no botão ♥: haverá muito mais amigos cadastrados do que gente como da família. A opção "Amigos sem lugar na família", em Mostrar, traz esses laços, na geração de quem escolheu. Quem é pai ou mãe de alguém com lugar na árvore (o pai de um "como se fosse sobrinho") aparece como família dessa pessoa, sem linha própria até quem escolheu.
- Tocar em alguém põe a pessoa em foco. Tocar de novo abre a página dela. O estado fica no endereço, então dá para mandar o link de uma visão.
- O desenho é calculado no navegador (`src/lib/arvore-desenho.ts`): gerações em linhas, casais lado a lado como um bloco, filhos sob os pais. O casamento alinha as duas famílias na mesma geração.
- Laços do coração com "como se fosse" entram na geração que o papel indica, e a família de uma amiga fica perto de quem a escolheu. Para o dono, "seu amigo-irmão"; para os demais, "amigo-irmão de Gui".
- **Escadinha dos laços do coração.** Um laço "como se fosse" se liga pelo caminho mais próximo do sangue, sem inventar laços que não existem. Se a pessoa escolhida também tem laço do coração com o pai ou a mãe de quem escolheu, o laço passa por ele: a tia de consideração do Gui é amiga-irmã da Elizete, e a Dona Lourdes é mãe de consideração da Elizete, então as duas se ligam à Elizete e não ganham linha até o Gui. Quem não passa por ninguém (a Dona Déia) se liga direto, mesmo cruzando outras linhas. O laço do meio aparece junto, mesmo com os laços da Elizete recolhidos. Tios e tias "tortos" costumam ser casados com tios de sangue ou amigas da mãe, e entram por esses laços.
- "Como se fosse pai ou mãe" existe como papel, para casos como a mãe de consideração da Elizete.
- **Marca do ramo recolhido** (do FigJam): ocupa o lugar de mais um filho, ao lado de quem está na linha direta e do lado de fora do casal, e a linha dos pais se divide até ela. No meio da linha entre pais e filho ela parecia algo entre os dois. Dois ramos ao lado da mesma pessoa ficam um depois do outro, o do casal mais perto.
- **Linhas dos laços do coração em tronco**: os laços de uma pessoa para o mesmo lado saem juntos numa faixa só, descem no vão ao lado dela e entram pela lateral. O tronco e cada galho são desenhados uma vez só, sem trechos sobrepostos, para o tracejado não virar linha cheia. Curvas grandes mostram direção e bifurcação; ângulo reto fica para cruzamento. Vizinhos se ligam por uma linha reta.
- **Linhas contornam as caixas** (correção do Gui no FigJam, 16/11/2026, seção "correção árvore"): nenhuma linha de coração ou de consideração passa por cima de alguém. Quando há uma fileira no meio, o galho sobe pelo vão livre mais próximo que não alonga o caminho, nunca pelo vão de um casal, e nunca na mesma coluna em que desce ou chega outra linha. Os galhos do mesmo tronco dividem a subida e se separam numa curva; os de troncos diferentes sobem em colunas próprias.
- **Laço entra por cima de quem tem filhos embaixo:** o pé de uma pessoa é de onde sai a linha dos filhos dela. Um laço do coração com alguém de cima que tem filhos desenhados contorna e entra pelo alto da caixa, como o tio de consideração com a filha no espelho. Quem não tem filhos embaixo continua recebendo pelo pé, como as vós de consideração.
- O cartão do ramo aberto não tem título: a linha até o casal já diz de onde ele vem. Fica só o botão de fechar, no canto. Ele fica por cima da legenda, e abaixo de "Ajustar a árvore", da ficha e do zoom.
- **Linhas que se unem:** linhas que chegam à mesma pessoa podem se juntar antes dela e chegar como uma só. A consideração do Gui até o Chico se une à linha dos pais dele, e é assim que deve ser: menos elementos na tela. A árvore é um recurso mais de desktop; no celular basta dar para navegar por ela e pelos ramos.
- **Quem tem pais na fileira de cima fica embaixo deles** (achado do Gui, 16/11/2026): um laço do coração com alguém de outra geração não tira a pessoa de lá. O Otto, filho da Nati e do Renan e sobrinho de coração do Gui, ia para perto da Karol, e a linha dos pais dele cruzava a do Caio.
- **Linhas que saem do mesmo pé andam juntas** (achado do Gui, 16/11/2026): quando alguém é responsável por filhos ou bichos em grupos diferentes sem formar casal com os outros responsáveis (a Karol, do Gui e da Giovanna, e o Chico, dos dois e do Magno), as linhas desses grupos correm na mesma altura e se sobrepõem. Em alturas diferentes, as curvas ficavam a poucos pixels umas das outras e viravam um emaranhado.
- **Linha do casal mesmo com mais responsáveis** (decisão do Gui, 16/11/2026): quando dois dos responsáveis por alguém são um casal lado a lado, a linha sai do ponto do casal, e quem não faz parte do casal tem a linha própria, saindo do pé. O Chico, da Giovanna, do Magno e do Gui, recebe uma linha do casal e outra do Gui.
- **Um raio só para todas as curvas** (decisão do Gui, 16/11/2026): toda curva da árvore tem o mesmo raio, o mais visível, para ficar óbvio o que é bifurcação ou junção de linhas (curva) e o que é cruzamento (ângulo reto). Quando uma descida ou um desvio ficaria a menos de dois raios de um pé, de um ponto de casal ou do meio da caixa, a linha entra reta, um pouco fora do meio da caixa, em vez de fazer curvas menores (aprovado pelo Gui na homologação). A descida só se alinha com o pé ou o ponto de onde vem a linha da própria família: alinhada com o de outra, pareceria vir só dali. O teste `testes/arvore-linhas.test.ts` confere o raio em todas as combinações da prévia.
- Casal sem ninguém da linha direta embaixo (Luísa e Bruno) ganha o ponto do casal e uma linha curta até a marca do ramo.
- A ordem das fileiras é buscada a partir de três arranjos (o que veio, o espelho e um ordenado pelos núcleos) e fica o melhor. Sem isso, abrir os laços do Gui e da Giovanna juntos espelhava a árvore, com o lado Bracarense à esquerda. Os dados da prévia ficam em `testes/dados/arvore-previa.json` e os testes conferem os lados com várias combinações de laços abertos.
- **Ramo aberto** (do Figma): a linha sai da marca do casal, corre por fora, logo acima do cartão, e só entra nele em cima de cada filho do ramo. O cartão nunca cobre quem liga o ramo à árvore (a Elizete, no ramo da Tia Lourdes). O resto da árvore recua, apagado e desfocado, e ficam nítidos o cartão, o casal de origem com a marca e quem é da mesma geração do ramo e vem do mesmo casal. Com vários ramos abertos, vale o último. Ao abrir, o mapa anda o mínimo para o cartão caber na tela.
- Só chega ao navegador o que a pessoa pode ver: casais e laços privados de outras pessoas ficam no servidor.
- Fora da produção, o banco de teste ganha parentes inventados (ids começando com `ex-`) para a árvore ter mais cenários.
- Sem "como se referir" informado, o parentesco sai nas duas formas: "seu tio ou sua tia".

## Lixeira e histórico

- Excluir uma memória publicada é com os admins, passa por uma página de confirmação e manda para a lixeira (`/lixeira`). A memória some do site com fotos e relatos, mas nada é apagado. Excluir um capítulo passa pela mesma confirmação (`/capitulos/<id>/excluir`).
- A lixeira tem um link fixo no alto da página Rascunhos, além do rodapé (decisão do Gui, 16/11/2026).
- Trazer algo de volta se diz sempre "Restaurar": "Restaurar esta versão", "Restaurar este texto", "Restaurar a foto" no histórico e "Restaurar" na lixeira. Os recados usam o mesmo verbo ("Versão restaurada", "Foto restaurada").
- Remover um laço de árvore, um laço do coração ou um parente de amigo, e apagar um casal, pedem confirmação no próprio lugar (`ConfirmarRemocao.astro`): o primeiro toque abre a pergunta com o nome das duas pessoas, e só "Remover" envia. Vale até existir o histórico de laços no site.
- Rascunho é de quem escreve: a própria pessoa descarta, e ele também vai para a lixeira.
- Cada pessoa vê na lixeira só o que pode restaurar: admins, as memórias que enxergavam; os demais, os próprios rascunhos.
- O histórico de uma memória (`/memorias/<id>/historico`) mostra cada alteração da ficha, com o que mudou e como era antes. Quem pode corrigir a memória pode voltar a ficha para uma versão anterior.
- Restaurar uma versão traz título, data, tipo, lugar e pessoas. Quem pode ver, núcleos e fotos ficam como estão, para uma restauração nunca abrir a memória a mais gente.
- Do relato, cada pessoa vê só os textos anteriores do que ela mesma escreveu ou registrou, e pode voltar a um deles.
- Fotos removidas aparecem no histórico para quem enviou, que pode devolvê-las à memória.
- Ainda não existe apagar de vez: o que vai para a lixeira fica lá.

## Interação dos formulários

Decisões de interação, independentes do visual. O visual pode mudar a aparência de cada peça sem mudar o comportamento.

- **Formulário longo vira etapas** (`src/lib/cliente/etapas.ts`): uma parte por vez, com a trilha no topo. Voltar é livre; para avançar, o obrigatório da etapa precisa estar preenchido. Sem JavaScript, as etapas aparecem todas em sequência. E os formulários funcionam: somem os botões que dependem de script (Voltar, Continuar, ±10, "Foi hoje", calendário, escolher fotos), aparecem os blocos que o script mostraria conforme a escolha, e os envios viram formulário comum. Fotos novas só se enviam com JavaScript; as que a memória já tem ficam.
- **Quando o servidor recusa** um formulário, a página volta com o recado e com o que a pessoa tinha digitado. Fica guardado só nesta aba do navegador, até dar certo ou a aba fechar.
- **Nova memória** tem sete etapas, uma pergunta principal em cada (QA de UX, 16/11/2026): o que aconteceu (título e tipo), quando e onde, quem estava, fotos, relato, capítulo e temas, quem vê. As que contam a memória vêm antes das opcionais de organização. Numa etapa opcional ainda vazia, o botão diz "Pular esta etapa" em vez de "Continuar". Numa memória já publicada, a etapa do relato some: cada pessoa cuida do seu na página da memória. "Salvar rascunho" fica disponível em todas; "Publicar" só na última, depois de um resumo para conferir.
- **Data:** uma peça só em todos os formulários (`CampoData.astro`, decisão do Gui, 16/11/2026), na ordem ano, mês e dia, porque o ano é o que quase sempre se sabe. O ano começa vazio (preenchido com o ano atual, alguém poderia publicar uma memória antiga com o ano errado) e tem botões de −10, −1, +1 e +10 (`CampoAno.astro`), também no capítulo de época e nas fases do casal, que só pedem ano (e mês, no capítulo). Mês e dia são opcionais. Na memória, um calendário e o botão "Foi hoje" preenchem dia, mês e ano de uma vez, para quem sabe a data exata. Uma data que não existe (31 de fevereiro, dia sem mês) é avisada ao lado dos campos assim que é escolhida, e segura o "Continuar"; vale também para nascimento e falecimento na ficha de pessoa.
- **Tipos à vista:** com mais de oito tipos de momento, ficam à vista os seis mais usados nas memórias que a pessoa vê (na ordem da lista dos admins), e o resto em "Ver mais tipos", que já vem aberto se o tipo escolhido estiver lá. Com oito ou menos, todos à vista.
- **Tipo de momento** começa sem nada marcado e é obrigatório para publicar, como o ano: marcado em "Dia a dia", um aniversário passava como dia a dia. Um rascunho pode ser salvo sem tipo (aparece como "Sem tipo").
- **Quem pode ver**, na memória e no capítulo, pergunta primeiro "Toda a família vê" ou "Só quem é dos núcleos marcados", e depois quais núcleos. Na memória, os núcleos continuam visíveis com "toda a família", porque dizem de que núcleos a memória é.
- **Publicar** tem um verbo só: "Confira antes de publicar", "Publicar memória", "Memória publicada". Na correção de uma memória publicada: "Confira antes de salvar", "Salvar alterações" e "Memória atualizada", com o lembrete de que a versão anterior ficou no histórico.
- **Ações de etapa:** "Voltar" à esquerda; "Salvar rascunho" e a ação principal ("Continuar" ou "Publicar") à direita.
- **Nova pessoa** pede só o essencial (nome, pessoa ou bicho, como se referir, e "Já faleceu", que muda como o site fala da pessoa). Nascimento e história ficam recolhidos. "É outra pessoa, mesmo com o mesmo nome" só aparece, logo abaixo do nome, quando o nome digitado já existe no acervo, com o link para quem já está lá. O cadastro segue para uma segunda etapa só de laços.
- **Tipo de laço** é escolhido em abas que dizem em uma frase o que cada uma é, e não em uma lista suspensa.
- **"Quem estava?"** (pedido do Gui, 16/11/2026, `QuemEstava.astro` e `src/lib/cliente/quem-estava.ts`): os nomes não aparecem todos de cara. No alto, quem já foi marcado; depois, a busca pelo nome, com "Cadastrar Fulano" quando o nome não existe; e as sugestões tiradas dos laços: sem ninguém marcado, quem escreve e a família dela; depois, a família de quem foi marcado (casal, pais, filhos e irmãos), primeiro quem tem mais laços com os marcados. A lista inteira fica recolhida em "Ver todos os nomes", agrupada por família. Sem JavaScript, a lista inteira aparece aberta.
- **Núcleos sugeridos:** numa memória nova, ao chegar em "Quem vê", vêm marcados os núcleos de quem estava, entre os que a pessoa pode marcar, com um aviso para conferir. Se ela mexer nos núcleos, a sugestão para.
- **Como se referir de quem entra pelo nome novo** (pedido do Gui, 16/11/2026): quem é cadastrado na hora, por "Cadastrar Fulano" num laço ou numa memória, ganha logo abaixo do nome "Ela", "Ele" ou "Não informar", para o site escrever "sua tia" ou "seu tio" desde o começo.
- **Atalhos para memória nova:** "Nova memória com Fulano", na página da pessoa, já marca a pessoa em "Quem estava?"; "Nova memória neste capítulo", num capítulo reunido, já marca o capítulo.
- **Escolher uma pessoa entre muitas** é uma busca com sugestão (`src/lib/cliente/busca-pessoa.ts`, decisão do Gui, 16/11/2026): "Com quem" no "Adicionar laço", "Quem está contando" no relato e "Partir de" na árvore. No laço, a última sugestão é "Cadastrar Fulano", para quem ainda não está no acervo; o campo separado de nome novo some. Sem JavaScript, volta a lista suspensa de antes.
- **Caixa de marcar em pílula** mostra uma caixa com tique antes do nome, para "várias" se distinguir de "uma" (o rádio em pílula não tem caixa).
- **Ação principal no alto:** na memória ("Escrever meu relato" ou "Editar meu relato", depois "Corrigir esta memória" e o histórico), na pessoa ("Editar página e laços", depois "Ver na árvore") e no capítulo. Excluir fica por último, separado.
- **Estados dos componentes:** pressionado em botões, opções, filtros e etiquetas; enviando em todo formulário comum (`src/lib/cliente/enviando.ts`), com o botão travado, o texto do que acontece ("Salvando…") e um segundo toque sem efeito; erro marcado no campo, além do balão do navegador; opção desabilitada com aparência própria. A aparência de cada estado é provisória, até o visual (`docs/ux/revisao-visual.md`).

## Áudios nos relatos (liberado pelo Gui em 16/11/2026, migração `015`)

- Um relato pode ter vários áudios, em ordem, cada um com a transcrição opcional. Com áudio, o texto escrito é opcional: o relato pode ser só a voz de quem contou.
- Em "Escrever meu relato" e na etapa do relato de uma memória nova, "Gravar áudio" grava no navegador e "Enviar arquivo de áudio" aceita o que já está no celular (os do WhatsApp, gravações do iPhone): M4A, MP3, OGG, OPUS, WEBM ou WAV, conferidos pelo conteúdo do arquivo. Cada áudio sobe na hora e entra no relato quando ele é salvo. Numa memória nova, ele fica solto (só quem enviou ouve) até a memória ser salva. A gravação funciona no Safari do iPhone (conferido pelo Gui, 16/11/2026). "Subir", "Descer" e "Remover" arrumam a lista.
- Para os áudios de quem não acessa o site (os 12 da Vó Bela, em `2_Material para o acervo/Áudios Vó`), escolha a pessoa em "Quem está contando" e envie os arquivos: o relato fica "registrado por" quem enviou.
- Os áudios aparecem dentro do relato, na página da memória, com "Ler a transcrição". A página da pessoa reúne os áudios em que ela fala ("A voz de Fulano"), os dos relatos dela.
- Quem ouve: o áudio de um relato, quem vê o relato numa memória que vê; o áudio ainda não salvo num relato, só quem enviou. Para os outros, um áudio que não pode ouvir é igual a um que não existe.
- Remover não apaga: o áudio sai do relato, e o arquivo continua no bucket (ainda não há como devolver pela tela).
- **Espaço** (`src/lib/audios.ts`): os áudios ficam no bucket das fotos, debaixo de `audios/`. Gravado no site, a 32 kbps, um minuto de voz ocupa cerca de 240 KB (o iPhone pode gravar em qualidade maior, até cerca de 1 MB por minuto). A gravação para sozinha em 15 minutos, cada arquivo tem no máximo 25 MB, e todos os áudios juntos, contando os removidos, no máximo 3 GB na produção: de 50 a 200 horas de voz, conforme o aparelho. O plano gratuito do R2 dá 10 GB por mês para a conta inteira (conferido na documentação da Cloudflare em 16/11/2026), e produção, homologação e prévias dividem esse espaço com as fotos; por isso a homologação e as prévias, que só servem para testar, têm teto de 200 MB cada. Passando do teto, o site recusa e pede para avisar o Gui ou a Giovanna.
- Ainda não existe: transcrição automática (precisa rodar fora deste ambiente, que não baixa os modelos), e devolver um áudio removido.
- No espelho da produção, nenhum áudio: a tabela é esvaziada.

## Capítulos e temas

- Um capítulo reúne memórias em um momento maior e tem dois modos. **Reunido:** alguém escolhe as memórias, e o período vai da primeira à última. **De época:** tem início e fim (o fim pode ficar em aberto), e as memórias entram sozinhas pela data.
- Um capítulo pode ficar dentro de outro, com no máximo dois níveis. A página do maior mostra as memórias dele e as dos capítulos de dentro.
- As relações pelo tempo são calculadas: a página de uma época lista os capítulos que aconteceram nela (inteiros ou "em parte"), e a de um capítulo diz durante quais épocas ele aconteceu.
- **Temas** são etiquetas livres para memórias e capítulos, digitadas separadas por vírgula. Cada tema tem uma página que junta tudo o que o usa.
- O capítulo tem visibilidade própria (título e abertura). Cada memória mantém a dela: contagem, período e lista consideram só o que quem olha pode ver.
- Uma memória entra em um capítulo reunido pelo formulário da memória ou pela página do capítulo, onde cada pessoa marca as memórias que pode corrigir.
- Edita o capítulo quem criou e quem tem memórias nele. Quem pode ver o capítulo, só quem criou muda. Excluir é com os admins e manda para a lixeira; as memórias continuam no acervo.
- Ficou para depois: capítulo ligado a uma fase de casal ou a pessoas, recorte de época por núcleo ou pessoa, foto de capa escolhida (os capítulos na linha do tempo viraram item de "Decidido, a construir" em 16/11/2026) (depende do visual).

## Núcleo, parentes e laços (decisões do Gui, 15/11/2026)

- **O nome do site** é "Memórias Bayara e Bracarense": as duas famílias com "e", para ler como a ligação entre elas e não como o núcleo da Giovanna e do Magno. A pasta da cópia mensal no Drive e a marca `acervo` dentro do arquivo da cópia continuam "Bayara Nascimento": o script e o espelho encontram a cópia por eles.
- **Núcleo e parentes.** O núcleo são só as pessoas que acessam o site: Gui, Giovanna, Lucas Magno, Elizete, Ana Candida, Lúcio e Regina (`NUCLEO_INICIAL`, migração `013`). O resto da família é parente de um núcleo (`nucleo_membros.papel`): leva a cor e o lado dele na árvore, e quem é do núcleo edita a página dele e mexe nos laços dele. Parente nunca vê o que é restrito ao núcleo. Na tela os dois aparecem iguais; a diferença fica no banco, para saber quem está envolvido e vendo o site e quem é personagem. Aguilar, Vó Bela, Vó Vivica e o Chico viraram parentes.
- **Família na ficha.** A ficha de quem não acessa o site tem "Família", com uma caixa por núcleo. Quem edita a ficha marca e desmarca as famílias de parente; os núcleos de quem é membro aparecem marcados e travados, porque acesso é com os admins.
- **Sugestão de família no cadastro** (`src/lib/familias.ts`). Quem entra por um laço de árvore e ainda não tem família sai marcado como parente, e o recado diz qual, para quem cadastrou trocar se precisar. Filho de quem divide um núcleo vai para ele (o filho da Giovanna com o Magno é Bayara Bracarense, o núcleo que os dois criaram); com um pai só cadastrado, vale o que ele divide com quem está casado; se não dividem nada, vem a família de origem de cada um. Pai, mãe e casal levam a família de origem de quem está do outro lado: as famílias dele menos as que formou com quem casou (o pai do Magno é Bracarense). Vale para bichos. Ninguém vira membro por esse caminho.
- **Laço do coração com "quem reconhece".** O laço do coração pergunta "só eu" ou "a família toda". "Só eu" é o laço pessoal de sempre. "A família toda" é um laço entre a pessoa da página e outra, gravado como filiação de consideração, e segue as permissões dos laços de árvore: filho e pai ou mãe são uma filiação; irmão é filho de consideração dos pais de quem escolheu (é preciso ter os pais cadastrados). Tio, avô, primo e sobrinho passam pela pessoa do meio e são cadastrados na página dela, pela escadinha. "De consideração" saiu das opções de filiação. Os nomes deixam de se cruzar: "de consideração" fica para o que a família toda reconhece, e o laço pessoal é dito com o papel ("amigo-irmão", "como uma mãe").
- **Laço resumido** (`lacos_resumidos`), a aba "Parente de amigo". Fora das famílias, entre pessoas do coração e os parentes delas, vale um laço de sangue sem o caminho completo: "Caio é sobrinho do Ed". Usa os papéis do "como se fosse". É recusado quando uma das pessoas é de um núcleo ou parente de um, e a aba só aparece na página de quem é de fora. Remove quem cadastrou ou os admins. Na árvore, o parente entra junto com quem já está nela, na geração que o papel indica, com traço contínuo de sangue, sem depender da camada de consideração. Quando o parente está na geração logo abaixo, sem pais na árvore, e o amigo não tem filhos desenhados, ele fica logo abaixo do amigo e a linha desce reta do pé de um até o alto do outro, como a de pai para filho (o Caio embaixo do Ed, achado do Gui, 16/11/2026). Na ordem da fileira, esse parente conta como filho do amigo, para a linha dele não cruzar a dos filhos de outra pessoa (o Caio e o Otto). Nos outros casos, a linha sai pela lateral. Pela escadinha, o laço de coração do Gui com o Caio passa pelo Ed e não ganha linha própria. Quem fica no meio é quem está mais perto de quem escolheu (o amigo-irmão, na mesma geração, fica entre o Gui e o sobrinho), seja o laço resumido dito como "Caio é sobrinho do Ed" ou como "Ed é tio do Caio" (achado do Gui na homologação, 15/11/2026). Quando o caminho completo passa a existir pela árvore (o irmão do Ed como pai do Caio, com os pais dos dois), o recado do laço salvo avisa, e a página oferece "Trocar pelo caminho completo", que qualquer pessoa que mexe nos laços dos dois pode usar.
- **Bichos.** Continuam como filhos e netos, porque é assim que as duas famílias os tratam. A diferença vem do tipo: o rótulo segue "filho", o cartão mostra a espécie e tem cantos mais redondos, e a linha dos pais até o bicho é mais leve. Tudo provisório até o visual.

## Decidido, a construir

O que o Gui decidiu no chat e ainda não existe no site. É daqui que uma sessão do Claude Code tira o que construir. Ao terminar, o item sai desta lista e vira regra na seção do assunto.

- **Revisão visual do zero** (decisões do Gui, 16/11/2026). Refazer toda a aparência do site seguindo `docs/visual.md`, sem adaptar o CSS atual. Ficam as fundações listadas lá ("O que fica"). A régua é o bayara.design e o site da @bsurda. Branch `tst-visual`, nascida da `homologa`. Em fases, cada uma conferida em 390, 1280 e 1920 px, por teclado e com movimento reduzido:
    1. **Conceito.** Três telas de ponta a ponta com o acervo de exemplo: o painel pessoal (primeira visita com a carta e uma visita seguinte), a linha do tempo (Tudo) e uma memória. O cadastro guiado fica para a fase 3. CSS novo, escrito do zero numa pasta própria. Para as fontes, duas ou três combinações de licença livre (Fontsource) para o Gui escolher; a serifa precisa ter acentos e itálico bons em português. Parar aqui e esperar a aprovação do Gui na prévia.
    2. **Sistema.** Com a direção aprovada, tokens e componentes viram sistema (os de `docs/visual.md`, incluindo o monograma com o M de Memórias e a assinatura com os sobrenomes).
    3. **Todas as telas,** uma a uma, sem levar nada do CSS antigo, até `src/styles/global.css` poder ser apagado. A árvore muda só de aparência; os testes dela continuam passando sem mudança.
    4. **Movimento e detalhes,** por último, só os de `docs/visual.md`.
    5. **QA visual** no celular de verdade antes do PR para a `homologa`.
  `npm run capturas` serve para registrar antes e depois de cada tela. A polaroid em toda foto-chave fica para o Gui confirmar vendo a linha do tempo pronta. Ao terminar, o resumo de `docs/visual.md` vira regra aqui, e `docs/ux/revisao-visual.md` e `docs/ux/padroes.md` saem de cena.
- **Capítulos na linha do tempo** (decisões do Gui, 16/11/2026). Entra no conceito da revisão visual, na tela da linha do tempo, e é construído com ela.
    - **Trilho lateral.** Cada capítulo é um trilho vertical à esquerda das memórias, do começo ao fim do capítulo. As memórias dele se prendem ao trilho. Como a linha do tempo vai do mais novo para o mais antigo, o trilho começa no alto com o título e o período do capítulo (que leva à página dele) e termina embaixo com uma marca pequena ("começo da Pandemia").
    - **Memória de fora no meio do capítulo.** Fica no lugar dela na ordem do tempo, sem se prender ao trilho, e o trilho continua tracejado nesse trecho. A ordem do tempo nunca é quebrada para agrupar um capítulo.
    - **Capítulo dentro de capítulo e capítulos ao mesmo tempo.** Trilhos lado a lado, o mais longo ou de fora mais à esquerda. No celular cabem dois trilhos; a partir do terceiro, o capítulo aparece como etiqueta na memória. Na tela grande cabem mais, e o título do capítulo ganha mais espaço.
    - O trilho de um capítulo de época vai da data de início à de fim (ou até hoje, se não tiver fim). O de um capítulo reunido vai da primeira à última memória dele.
    - Só aparecem capítulos que a pessoa pode ver, e o trilho só conta memórias que ela vê. Um capítulo sem nenhuma memória visível naquela linha do tempo não aparece.
    - A cor do trilho e o desenho final saem da revisão visual. A regra: o trilho não pode competir com as fotos nem com a cor das famílias.
    - Teste da montagem (sem tela, como a da árvore): ordem dos trilhos, trechos tracejados, o corte no terceiro trilho do celular e a visibilidade.
- **Painel pessoal como página inicial** (ideia do Gui de 15/11/2026, decisões de 16/11/2026). A parte funcional pode ser construída antes da revisão visual, numa branch própria e com a aparência mínima, como a foto de retrato (já construída: ver "Foto de retrato" em "Integrantes e laços de árvore"). A tela final é desenhada no conceito da revisão.
    - O painel substitui a linha do tempo como página inicial (`/`). A linha do tempo continua inteira no seu endereço e no menu.
    - **Primeira visita:** abre com uma carta de Natal escrita pelo Gui, pela Giovanna e pelo Magno, com o nome da pessoa na saudação e assinada à mão. Depois da primeira visita, a carta sai do alto e fica num link discreto no painel ("Carta de Natal"). O texto é escrito pelos administradores no próprio site e fica no banco, nunca no repositório. Uma migração nova guarda a carta e, para cada pessoa com acesso, a data da primeira e da última visita.
    - **Visitas seguintes, nesta ordem:** o que entrou de novo desde a última visita (memórias e relatos que a pessoa pode ver); os aniversários dos próximos 30 dias; a pessoa no acervo ("Você aparece em N memórias", levando à página dela, e a árvore partindo dela); uma memória em que ela aparece e ainda não contou nada, para escrever o primeiro relato; e o caminho para a linha do tempo inteira.
    - **Aniversários:** só de quem está vivo e de quem a pessoa vê no acervo, com o parentesco do ponto de vista dela ("sua avó") e a idade que vai fazer quando o ano de nascimento é conhecido. Quem tem só ano, sem mês e dia, não entra.
    - Quem entra com acesso mas não tem página no acervo vê o painel sem a parte "Você aparece".
    - Na homologação e nas prévias, o "Ver como" mostra o painel daquela pessoa, e um botão volta a pessoa à primeira visita, para conferir a carta.
    - Testes em `testes/`: o que entrou de novo e os aniversários respeitam a visibilidade; quem faleceu não aparece nos aniversários; a carta aparece só na primeira visita.
- **Sua conta** (decisões do Gui, 16/11/2026). Uma página própria de cada pessoa, para cuidar do que é dela, separada do painel inicial: o painel é o lugar de chegar e ver o que é novo, a conta é o lugar de cuidar das próprias coisas. Abre pelo retrato ou nome de quem está logado, no topo. Entra como tela nova na revisão visual (fase 3); as listas são consultas testáveis sem tela e podem ser construídas antes.
    - **Seus dados e sua página:** retrato, nome, apelido, nascimento e o texto sobre a pessoa, editáveis ali, com o link para a página dela como os outros veem. O e-mail aparece, mas só os administradores mudam.
    - **Rascunhos e lixeira:** os rascunhos da pessoa e o que ela mesma mandou para a lixeira, para recuperar. "Rascunhos" sai do menu e passa a morar aqui. Sem mudar quem pode restaurar o quê (regras em "Quem pode o quê").
    - **O que você criou:** as memórias que criou, os relatos que escreveu (inclusive os registrados em nome de outra pessoa, marcados assim), as fotos que enviou e os capítulos que criou, cada um com acesso direto. Só entra o que a pessoa ainda pode ver.
    - **Seus laços do coração:** os laços que ela definiu, inclusive os "só eu", com a proximidade, que só ela vê, e o caminho para editar cada um.
    - **Administração**, só para os administradores (Gui, Giovanna e Magno), numa seção à parte no fim: tipos de momento, famílias e membros, o tamanho do banco, "Baixar cópia do acervo" e, na homologação, o espelho da produção. Sai do rodapé.
    - Os avisos (pedido para liberar relato, sugestão de correção, relato novo onde a pessoa aparece) ficam no alto do painel inicial, junto das novidades. A conta guarda o histórico deles.
    - Na homologação e nas prévias, o "Ver como" mostra a conta da pessoa escolhida.
    - Testes em `testes/`: as listas de "O que você criou" e dos laços trazem só o que é da pessoa e o que ela vê, e a seção de administração não aparece para quem não é administrador.
- **Assinatura do nome** (decisões do Gui, 16/11/2026), construída dentro da revisão visual, na fase 2. Detalhe em `docs/visual.md` ("Assinatura do nome") e no rascunho `docs/visual/assinatura-hierarquia.png`.
    - "MEMÓRIAS" grande e fixo; abaixo, os sobrenomes das famílias do que está sendo visto ("Bayara & Bracarense" em "Tudo" e no núcleo Bayara Bracarense, "Bayara" no núcleo Bayara, "Bracarense" no núcleo Bracarense).
    - Uma migração nova dá a cada núcleo as famílias de que ele é feito (sobrenomes), editáveis pelos administradores. A linha junta os sobrenomes sem repetir, na ordem dos lados da árvore, com "&" antes do último. Teste em `testes/` para as combinações, incluindo uma terceira família.
    - Mostrar na prévia as variações de peso e largura do rascunho.

- **O Magno entra como quem presenteia e cuida do acervo** (decisão do Gui e da Giovanna, 16/11/2026). Ele é administrador como os dois (migração `017-magno-administrador`, PR para a `homologa`), usa a homologação, alimenta o acervo antes do Natal e assina a carta de Natal com eles. O acesso dele depende do e-mail no segredo `ACESSOS` e nas políticas do Cloudflare Access da produção e da homologação, que o Gui ajusta. Também responde à pergunta de quem administra a família Bracarense: o Magno é membro dela.

## Em aberto

- Histórico de integrantes e laços no site (as versões já são guardadas, inclusive a chave do retrato anterior) e apagar de vez o que está na lixeira
- Juntar cadastros duplicados e sugestão de nomes parecidos ao digitar
- Árvore: regras de ocultar e de exigir parentes de sangue, centros padrão escolhidos na administração e página do laço com linha do tempo
- Quem só existe em laço privado de outra pessoa já some da árvore, mas ainda aparece na lista de Pessoas
- Círculo e avisos
- Fotos enviadas em um formulário abandonado ficam no bucket sem uso: falta uma limpeza periódica na produção (nas prévias, a limpeza de 7 dias já cuida)

## Origem

As ideias abaixo surgiram no jantar de casamento da Giovanna, em 14 de novembro de 2026, o dia em que o site nasceu. Todas viraram decisões, detalhadas no documento "Acervo da família: proposta de estrutura" e nas seções acima; a lista fica como registro.

- **Árvore genealógica.** Guardar só os laços básicos de cada pessoa (pais e casal) e calcular o resto. A relação pode aparecer do ponto de vista de quem está olhando ("sua avó").
- **Núcleos familiares** como entidade, com página, árvore e linha do tempo próprias: Bayara Nascimento, Bayara Bracarense (Giovanna e Lucas Magno) e Bracarense. Uma pessoa e uma memória podem pertencer a mais de um.
- **Visibilidade configurável** por memória, que pode ser mudada depois: todos, só determinados núcleos, ou privada da pessoa.
- **Rascunhos.** Memória e relato podem ser salvos sem publicar, para escrever aos poucos, inclusive continuando em outro aparelho.
- **Acessos.** O Lucas Magno deve ter acesso. Outras pessoas dos Bracarense, a definir.
- O site como registro para a próxima geração.

Consequência técnica da visibilidade: páginas com conteúdo restrito não podem ser estáticas, porque uma página estática é igual para todos. As linhas do tempo e as memórias passariam a ser montadas para cada pessoa logada.
