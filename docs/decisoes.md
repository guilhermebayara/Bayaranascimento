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
- Fotos e áudios no Cloudflare R2, com o iCloud como casa dos originais
- Textos neste repositório

## Como o site grava

- Formulários no próprio site: `/nova` e "Escrever ou editar o meu relato" em cada memória
- Fotos reduzidas no aparelho antes do envio. O iCloud continua sendo a casa dos originais.
- Textos gravados neste repositório, um commit por envio, com o nome de quem enviou
- Passo a passo de ativação em `docs/ativar-formularios.md`

## Em aberto


- Corrigir a ficha de uma memória e acrescentar ou remover fotos depois de criada
- Histórico de mudanças visível no site, com reverter
- Excluir memória, com lixeira
- Editar a página de uma pessoa pelo site
- Fotos enviadas em um formulário abandonado ficam no bucket sem uso: falta uma limpeza periódica

- Reações e sugestões de correção em fotos e relatos
- Personalização por pessoa que acessa
- Direção visual definitiva (o visual atual é provisório)

## Ideias em discussão (ainda não decididas)

Surgiram no jantar de casamento da Giovanna, em 14 de novembro de 2026, o dia em que o site nasceu.

- **Árvore genealógica.** Guardar só os laços básicos de cada pessoa (pais e casal) e calcular o resto. A relação pode aparecer do ponto de vista de quem está olhando ("sua avó").
- **Núcleos familiares** como entidade, com página, árvore e linha do tempo próprias: Bayara Nascimento, Bayara Bracarense (Giovanna e Lucas Magno) e Bracarense. Uma pessoa e uma memória podem pertencer a mais de um.
- **Visibilidade configurável** por memória, que pode ser mudada depois: todos, só determinados núcleos, ou privada da pessoa.
- **Rascunhos.** Memória e relato podem ser salvos sem publicar, para escrever aos poucos, inclusive continuando em outro aparelho.
- **Acessos.** O Lucas Magno deve ter acesso. Outras pessoas dos Bracarense, a definir.
- O site como registro para a próxima geração.

Consequência técnica da visibilidade: páginas com conteúdo restrito não podem ser estáticas, porque uma página estática é igual para todos. As linhas do tempo e as memórias passariam a ser montadas para cada pessoa logada.
