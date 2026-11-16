# Direção visual

Decisões do Gui de 16/11/2026, tiradas da análise das referências no documento "Direção visual: análise das referências" (Claude Docs: https://claude.ai/artifact/RtLSAGbAbnsRVpHsFXzcxw). Este arquivo é o que vale para construir; o documento guarda a análise de cada site.

A ideia em uma frase: um álbum de família editado. Papel claro, títulos em serifa macia, legendas pequenas em mono com lugar e ano, foto tratada como objeto (polaroid, monte de fotos, retrato recortado) e movimento discreto, que qualquer pessoa entende sem pensar.

## Para quem

A família inclui gente com pouca familiaridade com sites, usando sobretudo o celular. A Elizete teve dificuldade com a rolagem diferente da página Sobre da @bsurda. Toda escolha visual passa por essa pergunta: a pessoa entende sem pensar?

## Referências

| Ref | O que levar |
| --- | --- |
| [Feminist](https://feminist.framer.website) | Calor geral, serifa macia nos títulos, pastéis em blocos sólidos com pontos saturados, retrato recortado em forma (arco, cápsula), etiqueta em forma de balão |
| [Mira](https://mirastudio.framer.website) | Nome escrito à mão sobre o retrato; formulário em forma de frase |
| [Vertical](https://vertical.framer.media) | Legenda em mono "lugar (ano)"; bloco de áudio com título, onde e quando foi gravado e duração |
| [Lurais](https://lurais.framer.website) | Disciplina: poucos pesos, hierarquia pelo tamanho, a foto fazendo o trabalho da cor |
| [Gobo](https://gobo.framer.media) | Página de trabalho como modelo da memória: título, frase de abertura, ficha em mono, citação, anterior e próximo |
| [Folira](https://folira-lite.framer.website) | Polaroid; linha do tempo com trilho e ponto marcando o que está em leitura, período em pílula |
| [Union](https://the-union-template.webflow.io) | Página do casamento como modelo da memória (coluna parada, blocos numerados); "Our story" e "The journey" para capítulo e laço; monte de fotos |
| Home do [bayara.design](https://bayara.design) | A frase que acende palavra por palavra acompanhando a rolagem (`src/redesign/motion.js` do repositório `bayara`) |

## Decisões

| Assunto | Decisão |
| --- | --- |
| Claro ou escuro | Claro como padrão. Sem fundo escuro: quando uma seção precisa se destacar, o fundo é colorido, nas cores das famílias |
| Títulos | Serifa macia, na linha de Recoleta ou DM Serif Display |
| Texto | Grotesca neutra, na linha de Geist ou Mona Sans |
| Legendas e fichas | Mono pequena, na linha de Geist Mono |
| Manuscrita | Só no nome de quem conta cada relato |
| Cor | Pastéis como cores principais, em blocos sólidos, como no Feminist. Cada cor tem uma versão saturada para pontos de contraste e destaques, que também pode ser usada inteira como opção. Vale para as cores, não para os neutros |
| Neutros | Fundo de papel quente (perto de `#F4F2F0` ou `#FFFAEB`); texto quase preto, sem chegar ao preto puro |
| Polaroid | Preferência: polaroid em toda foto-chave da linha do tempo. Confirmar na implementação vendo como fica na linha do tempo |
| Linha do tempo | Lista vertical com a rolagem normal, das mais recentes para as mais antigas, sem efeito de folhear nem carrossel |
| Página da memória | Ordem abaixo, com o convite para escrever o relato no fim |
| Marca | "MEMÓRIAS" é a palavra principal e fixa. Abaixo dela vêm os sobrenomes das famílias do que está sendo visto, que mudam conforme a tela (ver "Assinatura do nome"). O símbolo é um monograma com o M de Memórias |

## Movimento

Regra: a rolagem é sempre a do aparelho, e nenhum efeito quebra um padrão de navegação conhecido. Efeito é bem-vindo, sem excesso.

Entram:

- o cartão que aparece com um esmaecer curto;
- a sanfona que abre empurrando o conteúdo;
- a foto que amplia ao toque e fecha ao tocar fora;
- o item da barra de décadas que acende;
- uma frase de abertura que acende palavra por palavra como na home do bayara.design: acompanha a rolagem natural, não prende a página e aparece pronta com movimento reduzido.

Ficam de fora: cartão que deita ao rolar, foto que cresce enquanto se rola, carrossel lateral, anel 3D, imagem distorcida, tela de carregamento com porcentagem, faixa que corre sozinha e qualquer trecho que segura a página. Com movimento reduzido, nem o esmaecer.

O Safari do iPhone já deu trabalho com efeitos presos à rolagem no site da @bsurda (ver o `CLAUDE.md` daquele repositório, "Banda do Safari no iPhone"): nada de `sticky` ou `fixed` novo sem conferir no aparelho.

## Componentes novos

| Componente | Onde | Detalhe |
| --- | --- | --- |
| Polaroid | Foto-chave na linha do tempo e na abertura da memória | Moldura branca, margem de baixo mais larga com a legenda, cantos de uns 12 px, sombra suave (no Folira: 5 px, 20 px, 40 px de desfoque, preto a 12%). Inclinação entre poucos valores (por exemplo −3°, −1°, 2°), escolhida pelo id da memória para ficar sempre igual |
| Monte de fotos | Memória com mais de uma foto | As outras fotos aparecem atrás da principal, levemente giradas. O monte já diz que há mais fotos |
| Legenda "lugar (ano)" | Polaroid, cartão de memória, fotos | Em mono, pequena |
| Etiqueta-balão | Tipo de momento | Pílula com um canto reto, na cor do tipo |
| Ficha em mono | Topo da memória, do capítulo e da pessoa | Rótulo pequeno em caixa alta e valor: quando, onde, tipo, capítulos, temas, núcleos |
| Retrato recortado | "Quem estava", página da pessoa | Foto de retrato do cadastro em arco ou cápsula (o envio da foto entra junto com esta versão, ver "Decidido, a construir" em `docs/decisoes.md`). Quem não tem foto aparece com as iniciais sobre a cor da família |
| Nome manuscrito | Relato | O nome de quem conta, escrito à mão, junto de "registrado por" quando for o caso |
| Bloco de áudio | Relato | Botão de tocar, título, onde e quando foi gravado, duração, "Ler a transcrição" |
| Sanfona de fases | Página do laço | Ano grande, nome da fase, data pequena; abre uma de cada vez |
| Formulário em frase | Abertura da Nova memória | "Isso aconteceu em ___, em ___, com ___", sem mudar a ordem das etapas nem o que é obrigatório |

## Assinatura do nome

Decisões do Gui de 16/11/2026. Rascunho dele em `docs/visual/assinatura-hierarquia.png`.

- "MEMÓRIAS" é a palavra principal e não muda: em caixa alta, grande, na serifa dos títulos.
- Logo abaixo vêm os sobrenomes das famílias, em caixa alta e baixa, bem menores (no rascunho, perto de metade da altura de "MEMÓRIAS"), alinhados à esquerda.
- **Os sobrenomes acompanham o que está sendo visto.** Na linha do tempo geral ("Tudo") e no núcleo Bayara Bracarense: "Bayara & Bracarense". No núcleo Bayara (Gui, Giovanna e Elizete): "Bayara". No núcleo Bracarense: "Bracarense". Assim a assinatura cresce com o acervo: se um dia entrar outra família, por um casamento, a combinação aparece sozinha nas telas em que ela estiver.
- Para isso cada núcleo precisa dizer de quais famílias ele é (Bayara Bracarense = Bayara e Bracarense). A linha junta os sobrenomes sem repetir, na ordem dos lados da árvore (Bayara à esquerda), com "&" antes do último e vírgula entre os outros ("Bayara, Bracarense & Silva").
- Telas que não são de um núcleo (pessoa, memória, capítulo) usam as famílias do que mostram: os núcleos da memória ou do capítulo, as famílias da pessoa. Na dúvida, a versão de "Tudo".
- No texto corrido e na aba do navegador, o nome por extenso continua "Memórias Bayara e Bracarense".
- O rascunho mostra três pesos e larguras (normal, condensada, negrito) da mesma família: comparar na prévia, junto com a escolha da fonte.

## Monograma

Decisão do Gui de 16/11/2026: o monograma é o M de Memórias, que não muda, enquanto os sobrenomes mudam com a tela. Substitui os dois Bs ("uma haste"), que só valiam para duas famílias.

- Sai da serifa dos títulos, desenhado em SVG para funcionar pequeno.
- **Uso:** ícone do site (favicon e ícone de tela inicial do celular) e, no celular, no lugar da assinatura quando falta espaço.
- **Cor:** uma cor só, no tom do texto. Pode ganhar a cor da família da tela, como opção a comparar na prévia.
- **Tamanho mínimo:** conferir a 16 px (favicon).

## Página da memória

1. Abertura: título grande, trecho de um relato e a foto-chave como polaroid, com o monte de fotos atrás.
2. Ficha: parada à esquerda no computador, no alto no celular. Data, lugar, tipo, capítulos.
3. Quem estava, com os retratos e o parentesco do ponto de vista de quem olha ("sua avó").
4. Relatos, um por pessoa, com o nome manuscrito e o áudio.
5. Fotos em grade, que ampliam ao toque.
6. Fim: "Escrever meu relato" em destaque, depois "Antes" e "Depois".

Hoje a ação principal fica no alto (decisão do QA de UX). Mantenha um atalho pequeno no alto para quem chega querendo contar, e o convite grande no fim.

## Linha do tempo, capítulo e laço

- **Linha do tempo:** lista vertical, a barra de décadas parada no alto como já está, um trilho fino com um ponto marcando a memória em leitura (Folira). Cada memória com a polaroid da foto-chave e a legenda "lugar (ano)".
- **Capítulo e laço:** título, período e pessoas parados à esquerda no computador; à direita, os marcos numerados, com data e lugar em mono (Union, "Our story"). As fases do casal em sanfona (Union, "The journey").
- **Data aproximada e período:** em pílula, como no Folira ("2018-2020", "por volta de 1994").

## O que não muda

A ordem das etapas, os textos, as regras de permissão, o arranjo da árvore e o comportamento dos formulários continuam como estão em `docs/decisoes.md`. Esta é uma troca de aparência: muda token, componente e o desenho de algumas páginas, não o que o site faz. Na árvore, os cartões continuam retos e alinhados (sem polaroid), e só as cores mudam.
