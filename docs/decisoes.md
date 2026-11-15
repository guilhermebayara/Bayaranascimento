# Decisões do acervo

Regras combinadas para o site da família. Servem de guia para o que for construído.

## Estrutura

- **Memória**: a ficha compartilhada de um acontecimento (título, data, lugar, pessoas, fotos).
- **Relato**: a lembrança de uma pessoa sobre uma memória. Um por pessoa em cada memória.
- **Pessoa**: quem aparece nas memórias. O núcleo (Gui, Giovanna, Elizete) fica no menu, e as demais ficam na página Pessoas.

## Quem pode o quê

| Ação | Quem |
|---|---|
| Criar memória | Qualquer pessoa com acesso |
| Corrigir a ficha da memória | Qualquer pessoa do núcleo |
| Acrescentar relato a uma memória | Qualquer pessoa com acesso |
| Editar um relato | Só quem escreveu |
| Registrar relato de quem não acessa o site | Qualquer pessoa com acesso, creditada como "registrado por" |
| Acrescentar foto | Qualquer pessoa com acesso |
| Remover foto | Só quem enviou |
| Editar a própria página | A própria pessoa |
| Editar a página de quem não acessa o site | Qualquer pessoa do núcleo |
| Excluir memória inteira | Só o Gui, com alerta de ação destrutiva |

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
- A árvore (`/arvore`) é centrada em uma pessoa e abre em quem está logado. Camadas que ligam e desligam: consideração, ex-casais e bichos.

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
- **Ano** vem preenchido com o ano atual e tem botões de −10, −1, +1 e +10. "Foi hoje" preenche a data inteira. O resumo final existe para pegar o caso de alguém esquecer de trocar o ano.
- **Nova pessoa** pede só o essencial (nome, pessoa ou bicho, como se referir). Datas e história ficam recolhidas. O cadastro segue para uma segunda etapa só de laços.
- **Tipo de laço** é escolhido em abas que dizem em uma frase o que cada uma é, e não em uma lista suspensa.
- Lista de pessoas com mais de dez nomes ganha um campo para filtrar.

## Em aberto

- Histórico de integrantes e laços no site (as versões já são guardadas) e apagar de vez o que está na lixeira
- Foto de retrato do integrante, juntar cadastros duplicados e sugestão de nomes parecidos ao digitar
- Árvore: visão geral com zoom, recorte por núcleo e página do laço com linha do tempo
- Laços do coração, capítulos, temas, círculo e avisos
- Fotos enviadas em um formulário abandonado ficam no bucket sem uso: falta uma limpeza periódica

## Ideias em discussão (ainda não decididas)

Surgiram no jantar de casamento da Giovanna, em 14 de novembro de 2026, o dia em que o site nasceu.

- **Árvore genealógica.** Guardar só os laços básicos de cada pessoa (pais e casal) e calcular o resto. A relação pode aparecer do ponto de vista de quem está olhando ("sua avó").
- **Núcleos familiares** como entidade, com página, árvore e linha do tempo próprias: Bayara Nascimento, Bayara Bracarense (Giovanna e Lucas Magno) e Bracarense. Uma pessoa e uma memória podem pertencer a mais de um.
- **Visibilidade configurável** por memória, que pode ser mudada depois: todos, só determinados núcleos, ou privada da pessoa.
- **Rascunhos.** Memória e relato podem ser salvos sem publicar, para escrever aos poucos, inclusive continuando em outro aparelho.
- **Acessos.** O Lucas Magno deve ter acesso. Outras pessoas dos Bracarense, a definir.
- O site como registro para a próxima geração.

Consequência técnica da visibilidade: páginas com conteúdo restrito não podem ser estáticas, porque uma página estática é igual para todos. As linhas do tempo e as memórias passariam a ser montadas para cada pessoa logada.
