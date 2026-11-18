# Mapa da redução (18/11/2026)

Para onde foi cada título do `docs/decisoes.md` e do `docs/visual.md` antigos, copiados inteiros em `decisoes-ate-2026-11-17.md` e `visual-ate-2026-11-17.md`, nesta pasta.

- **Regra em <seção>:** o que vale hoje virou regra curta na seção indicada; o processo e as datas ficaram aqui no histórico.
- **Inteiro em <seção>:** o texto foi levado sem cortar conteúdo.
- **Só no histórico, porque <motivo>:** não está nos documentos enxutos. Os que podem ainda valer estão marcados com ⚑ e repetidos em "Para o Gui conferir", no fim.

Também foram para o histórico, sem mudança: `docs/qa/` (as perguntas e respostas do QA de design de 17/11/2026 e as perguntas novas, todas respondidas) em `historico/qa/`, e `docs/ux/` (o QA de UX de 16/11/2026, feito sobre a interface antiga: fluxos, inventário, padrões, a lista para a revisão visual e as capturas) em `historico/ux/`. Os comentários do código e dos testes que citam `docs/qa/...`, `docs/ux/...` ou seções que só existem no histórico (como "Grupo 4: formularios" e "Ajustes depois da fase 3") continuam com o texto antigo: a sessão foi só de documentação.

## decisoes.md

| Título antigo | Para onde foi |
| --- | --- |
| Decisões do acervo | Título do documento, com a introdução reescrita (o que é regra, onde está o histórico) |
| Estrutura | Regra em "Estrutura e princípios". A frase "O núcleo (Gui, Giovanna, Elizete) fica no menu" ficou só no histórico, porque o menu não lista mais as pessoas do núcleo ⚑ |
| Quem pode o quê | Inteiro em "Quem pode o quê" (a tabela e "Administradores podem mais"), sem as datas. O Magno administrador entrou ali, vindo de "Núcleo, parentes e laços" |
| Princípios | Regra em "Estrutura e princípios" |
| Infraestrutura | Regra em "Infraestrutura". O tamanho do banco passou do rodapé para "Sua conta", em Administração, como já está no site |
| Fotos de exemplo: o Chico e a Karol | Regra em "Fotos de exemplo" |
| Áudios de exemplo: voz sintetizada | Regra em "Áudios de exemplo". O item do atalho "Ouvir a voz de Vó Bela · 3 áudios", que ficava para outra sessão, ficou só no histórico, porque o atalho já existe (regra em "Interação dos formulários", "A página da pessoa") |
| Como o site funciona | Regra em "Como o site funciona" (linha do tempo, topo, menu da conta, rodapé, filtro por família). A menção a `Base.astro` saiu, porque o arquivo foi apagado |
| Tipos de momento | Regra em "Tipos de momento" |
| Integrantes e laços de árvore | Regra em "Integrantes e laços" (o modelo, o parentesco, os formulários, o retrato, quem só existe num laço privado) e em "Árvore" (desenho, controles, o mapa, cartões, arranjo e linhas). Só no histórico: a ficha "embaixo, no centro" no computador, a barra de duas linhas e o botão "Legenda" no celular, a legenda que abria na primeira visita, o "Mais" da ficha e a frase "Toque em alguém para ver quem é.", porque o quadro do mapa de 18/11/2026 os substituiu (conferido em `src/pages/arvore.astro`); a proposta B descartada; e "a aparência é a mínima do estilo atual" do retrato, porque o visual novo já chegou |
| Quem já faleceu | Regra em "Quem já faleceu" |
| Círculo | Regra em "Círculo". O seletor "Por família \| Seu círculo" que existia em Pessoas virou o motivo de uma frase |
| Lixeira e histórico | Regra em "Lixeira e histórico" |
| Interação dos formulários | Regra em "Interação dos formulários" (nova pessoa e o tipo de laço foram para "Integrantes e laços"). "Núcleos sugeridos" virou "Famílias sugeridas", com o mesmo conteúdo. O citado "Só quem é dos núcleos marcados" foi trocado pelo texto que está no site hoje, "Só quem é das famílias marcadas abaixo" ⚑. A menção à página Rascunhos saiu, porque ela não existe mais. "A aparência de cada estado é provisória" saiu, porque o visual já definiu os estados |
| Fotos pelo relato | Regra em "Fotos pelo relato" |
| Áudios nos relatos | Regra em "Áudios nos relatos" |
| Capítulos e temas | Regra em "Capítulos e temas", com "Capítulos na linha do tempo". "Isso entra com a linha do tempo nova, na fase 3" ficou só no histórico, porque já entrou |
| Núcleo, parentes e laços | Regra em "Famílias, núcleos e parentes" (nome do site, núcleo e parentes, família na ficha, sugestão de família, "família" na tela, bichos), em "Quem pode o quê" (o Magno) e em "Integrantes e laços" e "Árvore" (quem reconhece, laço resumido) |
| Assinatura do nome | Regra em "Assinatura do nome". Só no histórico: a nota de que esta regra vale sobre a primeira versão, a aparência mínima de `/admin/familias` e "por enquanto só nas telas do visual novo", porque todas as telas já são do visual novo |
| Visual | Regra curta em "Visual". O relato das fases 1 a 3 e dos PRs ficou só no histórico, porque é processo |
| Início (painel pessoal) | Regra em "Início (painel pessoal)"; a composição da tela em `visual.md`, "Início". "Neste dia, em outros anos" ganhou a regra do dia, da semana e do mês, que estava no conceito |
| Sua conta | Regra em "Sua conta" (com a ordem dos cartões e o que mudou depois do QA de design, que estava em `visual.md`) |
| Avisos | Regra em "Avisos". Só no histórico: o que o teste do espelho achou na primeira rodada, porque é processo |
| Ampliar quem vê uma memória com relatos | Inteiro em "Ampliar quem vê uma memória com relatos", sem as datas |
| Explorar | Regra em "Explorar"; o desenho em `visual.md`, "Explorar" |
| Decidido, a construir | Inteiro em "Decidido, a construir". Uma frase mudou: os arquivos de `docs/ux/` que "saem de cena quando a revisão terminar" ganharam a nota de que já foram para `docs/historico/ux/` |
| Em aberto | Inteiro em "Em aberto". O item "Círculo", que continuava lá embora o círculo já existisse, saiu depois, na limpeza da sessão L |
| Origem | Regra em "Estrutura e princípios" (o site como registro), "Famílias, núcleos e parentes" (as três famílias) e "Como o site funciona" (páginas montadas para cada pessoa). A lista das ideias do jantar ficou só no histórico, porque todas viraram regra. "Outras pessoas dos Bracarense, a definir", sobre os acessos, ficou só no histórico ⚑ |

## visual.md

| Título antigo | Para onde foi |
| --- | --- |
| Direção visual | Título do documento, com a introdução reescrita e a frase do álbum de família inteira |
| Para quem | Inteiro em "Para quem" |
| Revisão do zero (decisão do Gui, 16/11/2026) | Regra em "A direção" (a régua de qualidade) e "Fundações que não mudam". O relato da decisão de refazer do zero ficou só no histórico, porque a revisão já foi feita |
| O que fica (fundações) | Inteiro em "Fundações que não mudam", sem a linha "Decisões visuais", que só apontava para a tabela |
| O que se refaz | Regra em "Fundações que não mudam" (a marcação pode mudar se os scripts e os testes acharem o que precisam). O resto ficou só no histórico, porque descrevia o trabalho da revisão sobre o CSS antigo, que foi apagado |
| A ideia central: a caixa de fotografias da família | Inteiro em "A direção" |
| Uma ideia forte por tela | Inteiro em "A direção". A linha "Tudo e famílias" virou "Explorar na linha do tempo e famílias", porque "Tudo" virou Explorar |
| O nível de qualidade | Inteiro em "O nível de qualidade", com "Gestalt em toda tela" inteiro e, logo depois, o exemplo da legenda da árvore, que estava em "Quadro do mapa" |
| Conceito (fase 1), em aprovação | Regra nas telas: os ícones dos tipos (em "Tipos: paleta e ícones"), o painel (em "Início"), o convite do fim da memória, os trilhos e a cor dos capítulos, os controles e a faixa de décadas, nada preso no toque, as fotos da memória (leque, parede, galeria), "Início" no menu, a carta assinada pelos três, a época na linha do tempo, o destaque do capítulo, a hierarquia das linhas e a memória sem foto. Só no histórico: onde ficavam as telas do conceito, a espera pela escolha das fontes, "O que é fixo de exemplo no painel", "O que ficou de fora de propósito" do conceito e as capturas, porque o conceito virou o site; os controles Família, Tipo e Década da linha do tempo do conceito, porque o Explorar os substituiu; a foto "que veio com o relato" fixa em duas memórias, porque "Fotos pelo relato" a substituiu; e o texto "Veio com o relato de …" na galeria, que não achei no código ⚑ |
| Sistema (fase 2) | Regra em "Sistema" ("Onde fica cada coisa", "As peças e como usar", "Como a fonte é trocada"). Só no histórico: a conferência pixel a pixel, "O que a fase 2 não fez" e as capturas, porque é processo |
| Sistema (fase 2): como usar | Regra em "Sistema" |
| Onde fica cada peça | Inteiro em "As peças e como usar", juntando a tabela de peças da fase 2 (a coluna "Situação" saiu: todas foram aprovadas) e entrando `Segmentado.astro` |
| Como montar uma tela nova | Regra em "Como montar uma tela nova", com o passo da Gestalt. O parágrafo do menu que ainda apontava para `/conceito` ficou só no histórico, porque já foi trocado |
| Os tokens e quando usar cada um | Inteiro em "Os tokens e quando usar cada um" ("as onze cores" virou "os nomes das cores", porque a paleta tem 23) |
| Como a fonte é trocada | Regra em "Como a fonte é trocada", com a tabela das três combinações, que estava no conceito |
| O que ficou de fora do sistema, de propósito | Regra em "O que ficou de fora do sistema, de propósito". Só no histórico: o ícone que não chegava ao `Base.astro`, `/admin/familias` no visual antigo e o comportamento dos formulários "da fase 3", porque já mudaram |
| Cuidados que custaram tempo | Inteiro em "Cuidados que custaram tempo", com os cuidados técnicos do grupo 1 e da lista somados |
| Referências | Inteiro em "A direção" |
| Decisões | Regra em "Decisões". A tabela ficou com o que vale hoje: a fonte escolhida, as cores dos tipos pela paleta, a manuscrita com os usos de hoje (relatos, carta, mural), "Painel" virou "Páginas íntimas" (painel, conta e círculo) e o menu entrou. Só no histórico: "na linha de Recoleta", "na linha de Geist", os valores `#faf2e6` e `#2b211a` do conceito e as datas, porque a fonte e as cores estão escolhidas e os valores estão em `tokens.css` |
| Movimento | Inteiro em "Movimento", com "Peças paradas no alto". A nota sobre o Safari e o site da @bsurda foi para "Cuidados que custaram tempo" |
| Componentes novos | Regra em "As peças e como usar" (as medidas da foto revelada, do monte, da etiqueta e do retrato) e em "Para o futuro" (a sanfona de fases da página do laço) |
| Assinatura do nome | Regra em "Assinatura do nome". O rascunho dos três pesos para comparar na prévia ficou só no histórico, porque a fonte foi escolhida |
| Monograma | Regra em "Monograma". Os dois Bs que ele substituiu e o detalhe do corte da Fraunces ficaram só no histórico, porque são processo |
| Página da memória | Regra em "Página da memória", com as respostas do QA de design e a galeria do conceito |
| Linha do tempo, capítulo e laço | Regra em "Explorar" (linha do tempo), na peça Pílula e em "Para o futuro" (página do laço) |
| Todas as telas (fase 3), em andamento | Só no histórico, porque descreve as branches empilhadas e a situação dos PRs #35 a #38, já incorporados |
| Estado do grupo 1, para a próxima sessão seguir sem a conversa | Regra em "Explorar" (como a troca sem recarregar está montada) e em "Cuidados que custaram tempo"; as pendências em "O que falta". Só no histórico: a tabela do que mudou desde o PR, porque é processo; e três notas que podem ainda valer ⚑ |
| Grupo 1: Explorar e a página da memória | Regra em "Explorar" (controles, troca, linha do tempo, mural, modo TV, endereço) e "Página da memória". Só no histórico: as rodadas do mural e do palco, "Sua conta, de passagem" e o que foi decidido ao ver o PR, porque viraram regra |
| Grupo 2: pessoal | Regra em "Início", "Sua conta" e "Página da pessoa" (e `decisoes.md`). Só no histórico: as marcas PROVISÓRIO, o que saiu do conceito, as capturas e o que foi conferido |
| Grupo 3: familia | Regra em "Capítulos, capítulo e tema", "Pessoas", "Árvore e círculo" e, em `decisoes.md`, "Árvore" (o cartão). Só no histórico: a conferência da árvore antes e depois e o achado do título, que não era defeito |
| Grupo 4: formularios | Regra em "Formulários". Só no histórico: os defeitos corrigidos no caminho, a saída do estilo antigo (com a lista de testes que mudaram de lugar), as capturas e o que foi conferido |
| O que falta | Regra em "O que falta", atualizado: a aprovação dos grupos, a escolha das fontes e o campo "Cor" dos tipos saíram, porque já foram resolvidos; as pendências de aparelho do grupo 1, da parte 3, do quadro do mapa e dos tipos entraram |
| A página do sistema fica (decisão do Gui, 16/11/2026) | Regra em "A página do sistema fica" |
| Respostas do Gui às perguntas da fase 3 (17/11/2026) | Regra nas telas: cada linha de "O que virou regra" está na seção da tela (Explorar, modo TV, carta, painel, conta, pessoa, Gente, capítulo, pessoas, árvore, formulários, cadastro guiado, laços, excluir). As respostas numeradas por PR ficaram só no histórico, porque viraram regra |
| Ajustes depois da fase 3 | Só no histórico (o título da branch `tst-visual-ajustes`); o conteúdo foi pelas três partes abaixo |
| Parte 1: a lista, as formas de ver da pessoa, "Quem aparece" e o link do título | Regra em "Explorar" ("A lista", "A linha do tempo"), "Página da pessoa" e "Capítulos, capítulo e tema" |
| Parte 2: a frase na abertura, o resumo ao lado e a zona de perigo | Regra em "Formulários" e, em `decisoes.md`, "Interação dos formulários" (zona de perigo e frase da abertura). A pergunta "no capítulo, na pessoa e nas telas utilitárias, nada à direita" foi respondida na P130 do QA de design (resumo só na memória e no relato, e a mesma grade nos outros), e isso entrou em "Formulários" |
| Parte 3: a árvore nítida no zoom, o cartão de bicho e a conferência final | Regra em `decisoes.md`, "Árvore" (zoom e cartão de bicho), em "A lista" (a foto e a conta do ano) e em "O que falta". Só no histórico: a causa provável, o que não deu para reproduzir no Chromium e a lista do que foi conferido |
| Quadro do mapa (árvore e círculo) | Regra em `decisoes.md`, "Árvore", e em "Árvore e círculo", "As peças" (o seletor segmentado), "O nível de qualidade" (o exemplo da proximidade) e "O que falta" |
| Tipos: paleta e ícones | Regra em "Tipos: paleta e ícones". Só no histórico: as quatro cores aprovadas que tinham a tinta abaixo de 4,5 e os valores escurecidos (estão em `tokens.css`), o chocalho trocado pela mamadeira, o que foi conferido e as capturas |

## Para o Gui conferir

O que ficou só no histórico e pode ainda valer. Diga o que entra de volta nos documentos enxutos.

Uma observação à parte: as respostas do QA de design (`historico/qa/2026-11-17-perguntas.md`) trazem regras que nunca estiveram no `decisoes.md` antigo. As que achei nesta sessão entraram nos enxutos ("Pular para o conteúdo", a marca e o retrato com 44 px, o Enter nas etapas, o resumo ao lado só em janela alta e só na memória e no relato, e a medição da linha do tempo depois do Natal), mas não li as 174 respostas uma a uma contra os enxutos.

1. **Estrutura:** "O núcleo (Gui, Giovanna, Elizete) fica no menu, e as demais ficam na página Pessoas." O menu de hoje não lista pessoas. Saiu por estar desatualizada.
2. **Origem, acessos:** "Outras pessoas dos Bracarense, a definir." Não achei outra decisão sobre isso.
3. **Quem pode ver, na memória:** o texto antigo citava "Só quem é dos núcleos marcados"; no site está "Só quem é das famílias marcadas abaixo", e foi esse que entrou.
4. **Em aberto, "Círculo":** resolvido. O item saiu de "Em aberto" na limpeza da sessão L, e o círculo tem a regra dele em "Círculo".
5. **Galeria:** a foto que veio com um relato dizia "Veio com o relato de …" na galeria. Não achei o texto no código. Ficou de fora até você dizer se deve voltar.
6. **Modo TV em 1280 × 720:** resolvido. O Gui decidiu que o modo TV cabe em 1280 × 720 com "Ajustes" aberto (17/11/2026): abaixo de 50rem de altura, o respiro de baixo encolhe e cada ajuste fica numa linha. A regra está em `decisoes.md`, "Explorar", com teste em `testes/explorar-controles.test.ts`.
7. **Etiquetas da família no Explorar:** você escolheu o formato, mas a nota do grupo 1 diz que ainda não tinha visto o resultado.
8. **`tsc` e `astro check`:** a nota do grupo 1 diz que travavam nas sessões e derrubavam o servidor local. O `CLAUDE.md` pede para anotar a contagem de erros de tipo; se continuar travando, vale escrever ali.
