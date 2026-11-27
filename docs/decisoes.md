# Decisões do acervo

O índice das regras em vigor do site da família e a fila de trabalho. Cada regra mora no arquivo do assunto, em `docs/regras/`, e diz o que vale hoje; o processo, as datas e o que mudou no caminho estão no histórico (`docs/historico/`), linkado no fim de cada seção. A marca "(Gui, 23/11)" diz que a regra foi decisão do Gui; "(chat, 24/11)", que foi decidida no chat e o Gui pode rever.

A sessão de construção lê o `CLAUDE.md`, este índice com a fila e os arquivos de `docs/regras/` do assunto que vai mexer, mais os que a regra dele cita. Abra o histórico quando uma regra parecer incompleta, contraditória ou sem motivo, e antes de mudar algo que pode ter sido decisão do Gui. Decisão nova entra no arquivo do assunto, já como regra.

## Índice

| Arquivo | O que cobre |
|---|---|
| [`regras/site.md`](regras/site.md) | Os princípios (memória, relato, pessoa, histórico, lixeira, endereço com código) e como o site funciona: página montada para quem está logado, linha do tempo, desempenho do servidor, topo, menu, rodapé e página não encontrada |
| [`regras/permissoes.md`](regras/permissoes.md) | Quem pode o quê, ação por ação, e o que os administradores podem e não podem |
| [`regras/infraestrutura.md`](regras/infraestrutura.md) | Cloudflare, banco e bucket, o aviso de tamanho, o espaço das fotos e áudios, as cópias menores das fotos e dos retratos, o que fica guardado no aparelho, o espelho e a cópia do acervo (o detalhe em `docs/copia-no-drive.md`) e o GitHub Actions |
| [`regras/exemplos.md`](regras/exemplos.md) | As fotos de exemplo (o Chico e a Karol) e os áudios de exemplo: onde moram, como chegam ao bucket de teste, a semente, a limpeza e a guarda |
| [`regras/familias.md`](regras/familias.md) | O nome do site, as famílias, núcleo e parentes, a família na ficha e no cadastro, bichinhos, e a assinatura do nome no topo |
| [`regras/integrantes.md`](regras/integrantes.md) | As pessoas e os laços: filiação, casais e fases, ex, laços do coração, parentesco, os formulários de pessoa e de laço, o retrato, a página do laço, quem só existe num laço privado e os cadastros duplicados |
| [`regras/arvore.md`](regras/arvore.md) | A árvore: quem aparece, ramos recolhidos, o mapa, os cartões, o arranjo e as linhas (decisões do Gui) |
| [`regras/circulo.md`](regras/circulo.md) | O círculo de cada pessoa: proximidade, o que só o dono vê e o desenho do mapa |
| [`regras/pessoa.md`](regras/pessoa.md) | A página da pessoa, quem já faleceu e "Como você chama" (o apelido de cada um) |
| [`regras/formularios.md`](regras/formularios.md) | Os tipos de momento e a interação dos formulários: nova memória, datas, "Quem estava?", fotos, rascunho, sem recarregar |
| [`regras/lixeira.md`](regras/lixeira.md) | Lixeira, excluir e restaurar, o histórico de versões, excluir pessoa e as fotos sem memória |
| [`regras/relatos.md`](regras/relatos.md) | Fotos pelo relato, áudios nos relatos e o relato como conversa |
| [`regras/capitulos.md`](regras/capitulos.md) | Capítulos, épocas e temas, as páginas deles e os capítulos na linha do tempo |
| [`regras/inicio.md`](regras/inicio.md) | O Início (o painel pessoal): a carta de Natal, as visitas, aniversários e o cartão "Na TV da sala" |
| [`regras/conta.md`](regras/conta.md) | "Sua conta", a Administração com as pendências e os avisos |
| [`regras/memoria.md`](regras/memoria.md) | As ações na memória: sugestão de correção, reações, o botão de menu e compartilhar como imagem |
| [`regras/ampliar.md`](regras/ampliar.md) | Ampliar quem vê uma memória que já tem relatos: o sim de quem registrou |
| [`regras/explorar.md`](regras/explorar.md) | O Explorar (controles, filtros, ordem, mural), a busca (a lupa, a folha, o `q` e quem vê o quê), o modo TV (a barra, as teclas, a TV da sala, a voz, uma memória por passagem) e o endereço dos filtros |
| [`regras/conferencias.md`](regras/conferencias.md) | O que a guarda da produção, os testes, as conferências com o servidor local e o build conferem, regra por regra |
| [`regras/telas.md`](regras/telas.md) | As regras de trabalho das telas: conferir em 390, 1280 e 1920 px, aspas curvas, nada salta, a gestalt que se confere sozinha e o conceito primeiro, com parada |

Fora de `docs/regras/`:

| Arquivo | O que cobre |
|---|---|
| `docs/visual.md` | A direção visual, o sistema (peças, tokens, fontes) e o desenho de cada tela |
| `docs/copia-no-drive.md` | A cópia do acervo (instalação, restauração e as regras por dentro) e o espelho da produção |
| `docs/publicar.md` | A configuração no Cloudflare, rodar no computador e mudar a estrutura do banco |
| `docs/qa.md` e `docs/qa-ux.md` | As sessões de QA e de QA de UX |
| `docs/sessoes.md` | Cuidados que já custaram tempo às sessões |
| `docs/drive.md` | A pasta do projeto no Drive do Gui |
| `docs/briefs/` | Um brief por item grande da fila |

O mapa do que foi para onde na divisão de 26/11/2026 está em [`historico/mapa-da-reducao-2.md`](historico/mapa-da-reducao-2.md).

## Decidido, a construir

O que o Gui decidiu no chat e ainda não existe no site. É daqui que uma sessão do Claude Code tira o que construir. Ao terminar, o item sai desta lista e vira regra no arquivo do assunto, em `docs/regras/`. Item grande tem um brief à parte em `docs/briefs/`, e aqui fica só a linha com o resumo e o link (ver "Como o trabalho acontece", no CLAUDE.md). Ainda sem brief, a escrever antes da construção: "Navegação" (menu, rodapé, notificações e o celular com cara de app), "Administração do zero", "Rever a navegação e os botões do formulário de memória nova", "O mínimo de recarregamentos no site todo", "Revisão visual: movimento, detalhes e o aparelho" e, quando sair de "Em aberto", "Escrever o relato na própria página da memória". A lista como estava em 18/11/2026 fica em [`historico/decidido-ate-2026-11-18.md`](historico/decidido-ate-2026-11-18.md).

- **Críticas de design C1 e C2 dos fluxos de quem recebe o presente** (respostas do Gui, 22/11/2026; relatórios e esboços em `docs/critica/`). Os pontos pequenos já estão nas regras. Ficam:
    - **Login no dia 25:** o Gui, a Giovanna e o Magno fazem o primeiro login no celular de cada pessoa, na festa, com o ícone na tela inicial. A página de entrada do Cloudflare Access ganha texto em português, e a sessão dura o máximo que o Access permitir sem custo. É configuração no Cloudflare, sem código, feita pelo chat.
    - **A foto no alto da página de escrever** espera a exploração "A memória como lugar de ler e contar" (E3).

  Pontos que pedem solução nova, cada um com brief e a escolha do Gui:
    - **A memória como lugar de ler e contar** (E3): ainda sem exploração. Brief em [`briefs/memoria-ler-e-contar.md`](briefs/memoria-ler-e-contar.md).
- **A peça de feedback de estado** (Gui, 24/11): os oito estados da seção 5 da M1 numa peça só, com o controle tocado marcado na hora e a falta de rede em português, sem levar a pessoa à página de erro do navegador. A exploração E4 foi feita, e a escolha do Gui está no brief; falta a aplicação. Brief em [`briefs/feedback-de-estado.md`](briefs/feedback-de-estado.md).
- **Desempenho antes do Natal** (M1, decisões do Gui de 23/11/2026): o plano gratuito com folga no dia 25, o Explorar respondendo no próprio celular, as fotos guardadas no aparelho por 7 dias e as cópias menores no envio. A D1 (D1a a D1f) e a causa 6 estão no site; as contagens e escolhas da D3 e o primeiro lote da causa 9 foram aplicados na MEM-6 ([relatório](desempenho/2026-11-26-mem6.md)). Falta a D2 para reduzir as leituras restantes. A MEM-8 reuniu a gravação do relato e das mensagens e passou a ler uma vez os vínculos diretos de capítulos ([relatório](desempenho/2026-11-27-mem8.md)). Falta medir e calibrar a CPU na homologação. Brief em [`briefs/desempenho.md`](briefs/desempenho.md).
  - **Conflito no mesmo relato** (chat, revisão MEM-9): a gravação que perde recebe HTTP 409 com o recado existente. O formulário que só acrescenta relê a conversa e põe a mensagem nova no fim. Fundir edições fica para depois, se o conflito aparecer na prática. [Correções da revisão](desempenho/2026-11-27-mem8.md#correções-da-mem-9)
- **QA de UX dos fluxos, logo depois do QA detalhista** (decisão do Gui, 18/11/2026; o QA detalhista terminou com a sessão U, de 23/11/2026, relatório em [`historico/qa/2026-11-23-relatorio.md`](historico/qa/2026-11-23-relatorio.md)): a sessão de QA de UX (`docs/qa-ux.md`) passa por todos os fluxos e devolve uma lista priorizada do que precisa melhorar. Os briefs saem dessa lista. Fluxos que o Gui já marcou para revisar: editar ficha e laços ("vai precisar de muita melhoria"), cadastrar pessoa e laço (pessoa nova, cadastro guiado do casal, laço do coração), as fotos de uma memória (enviar, ordenar, escolher a foto-chave, mover e tirar), capítulos (criar, juntar memórias e editar) e a chegada no Natal (a primeira visita e a carta de quem entra no dia 25, e como cada pessoa ganha o acesso), além do formulário de memória nova e da Administração, já nesta lista. O QA de 23/11/2026 não deixou a lista "Para o QA de UX" nem fez a passada de teclado e de movimento reduzido: o QA de UX faz as duas, com um caminho de cada fluxo só pelo teclado e as telas dos fluxos com movimento reduzido. Parte dos atritos está anotada no relatório de 23/11: ordenar as fotos e mover uma foto para outra memória não existem hoje (o formulário só tem a foto-chave e "Remover foto").
- **Administração do zero, talvez um painel de administrador** (pedido do Gui, 18/11/2026, depois de ver a página própria da sessão O): a página nova está aprovada como está, mas vai ser repensada do zero, podendo ir além do que já foi previsto. Item grande: o brief é escrito antes, e a construção começa por um conceito com parada. Ideia do Gui para o brief: um bloco "Quem já entrou", com a primeira e a última visita de cada pessoa (o dado já existe, na tabela `visitas`).
- **Pacote pequeno para uma sessão só, na mesma branch** (pedido do Gui, 19/11/2026: uma sessão com vários pontos pequenos, e não várias separadas). Entra o que couber; a lista cresce enquanto o Gui anota.
    - **Espaço igual entre os itens dos controles "Forma de ver" e "Mural" e os seus subcontroles** (observação do Gui, 19/11/2026): na horizontal e na vertical, os itens têm o mesmo espaço entre si, sem agrupamento nem separação. Aplicar a gestalt: espaço dentro de um grupo bem menor que o espaço entre grupos. **Pendência: não mexer ainda.** O Gui não conseguiu ver o problema com o conteúdo da produção e vai trazer melhor explicado quando houver uma prévia `tst-` com dados que mostrem o caso. A sessão só constrói isto se o Gui trouxer a explicação antes. Entra aqui também a P2 do QA de 20/11/2026 ([`historico/qa/2026-11-20-perguntas.md`](historico/qa/2026-11-20-perguntas.md)): no celular, em 390 px, "Lista" desce para a linha de baixo do seletor da forma de ver no tema e no capítulo, enquanto no Explorar as opções rolam para o lado. Fica parada junto com o resto do item, sem mudar o código.
- **Uma linha do tempo só, a do Explorar, que se ajusta à largura disponível** (decisão do Gui, 19/11/2026). Vale para a página da pessoa, a do tema, a do capítulo e a do laço; os marcos numerados saem do capítulo e do laço, e a versão simples da coluna também sai. Item grande: brief em `docs/briefs/` antes da construção, depois do QA de 23/11. Nada é construído antes disso.
- **Menu: nomes que digam o que há dentro** (pedido do Gui, 19/11/2026). Rever os nomes de cada item do menu para ficar óbvio o que se encontra ali. Texto de interface é decisão do Gui: a sessão propõe os nomes (dois por item, no máximo) e espera a escolha antes de trocar.
- **Rodapé melhor trabalhado, com um acesso rápido ao painel pessoal** (ideia do Gui, 19/11/2026). Pensar uma navegação melhor no rodapé, talvez um mini painel pessoal com o que for prioritário para quem está logado. Vai junto com a revisão da navegação (abaixo) e passa pelo conceito com parada.
- **Notificações na navegação do alto, se houver alertas que justifiquem** (ideia do Gui, 19/11/2026). Primeiro avaliar: quantos tipos de aviso o site já tem hoje (rascunhos, pedidos de acesso, relatos novos, aniversários) e se bastam para um lugar só deles. Entra na sessão de QA de UX como pergunta, com a conta feita, e só vira construção se o Gui decidir.
- **Navegação do celular com cara de aplicativo** (pergunta do Gui, 19/11/2026): menus e navegação no celular podem ganhar um layout de app (barra embaixo, folhas que sobem, gestos de voltar)? Item grande, junto com o rodapé, o menu e as notificações: um brief só, "Navegação". A rolagem continua sendo a do aparelho e nenhum gesto quebra um padrão conhecido (ver "Movimento", em `docs/visual.md`). Cuidado com a banda do Safari: nada preso na borda da tela fora do modelo `pino-novo` (ver "Cuidados que custaram tempo", em `docs/visual.md`). O que o Gui detalhou em 21/11/2026: o objetivo é facilitar para quem tem menos familiaridade com sites, usando padrões que as pessoas já conhecem de aplicativos; o conteúdo segue como está; o brief "Navegação" define o que fica na barra de baixo e o que fica no alto da tela.
- **Rever a navegação e os botões do formulário de memória nova** (pedido do Gui, 18/11/2026): vai mudar bastante. Item grande: o brief é escrito antes da construção, com as observações do Gui sobre o que mudar.
- **O mínimo de recarregamentos no site todo** (pedido do Gui, 18/11/2026). Revisar o que ainda recarrega (a lista em "Sem recarregar", em [`regras/formularios.md`](regras/formularios.md#interação-dos-formulários)) e passar para o lugar tudo o que não leva a outra página, com o mesmo `no-lugar.ts` e o formulário comum como reserva. A página da pessoa já foi.
- **Revisão visual: movimento, detalhes e o aparelho** (fases 4 e 5 da revisão do zero, decisões do Gui de 16/11/2026). As fases 1 a 3 estão no site (ver `docs/visual.md`). Falta:
    4. **Movimento e detalhes,** só os de `docs/visual.md`: a frase que acende palavra por palavra e a foto que amplia no lugar ("O que ficou de fora do sistema, de propósito"). O tocador de áudio próprio já está no site.
    5. **QA visual no celular de verdade:** o que `docs/visual.md` lista em "O que falta", "Da fase 5".
  A polaroid em toda foto-chave fica para o Gui confirmar vendo a linha do tempo.

Origem: [histórico, "Decidido, a construir"](historico/decisoes-ate-2026-11-17.md#decidido-a-construir); [depois de 17/11](historico/decisoes-depois-de-2026-11-17.md#decidido-a-construir).

## Em aberto

- **Pendências da revisão MEM-9.** Conferir o teto de fotos no envio por `mensagens` e reunir as leituras de citações que hoje são feitas uma a uma. Conferir o tamanho da linha com a soma dos textos de 200 mensagens grandes. Rever `ligarAudios`, que ficou sem chamador em produção, e a ordem de restauração das tabelas por arquivo `.sql` com chaves conferidas a cada comando.

- Árvore: regras de ocultar e de exigir parentes de sangue
- **Adicionar pessoa direto pela árvore** (ideia do Gui, 20/11/2026, para investigar). Versão simples: "Adicionar parente" na ficha da pessoa, levando ao cadastro com a pessoa de partida e o laço já preenchidos. Versão completa: marcadores de "+" no mapa, que mexem no desenho travado. Falta decidir quem pode adicionar depois do Natal. Entra no QA de UX, no fluxo "cadastrar pessoa e laço".
- **Escrever o relato na própria página da memória, para depois do QA** (ideia do Gui, 18/11/2026): a exibição é quase a mesma da janela de escrever, então por que levar para outro lugar? Caminho provável, a decidir: a janela fica no pé da conversa, na memória; o rascunho aparece ali mesmo, marcado "só você vê", com "Publicar relato"; depois de publicado, cada mensagem nova entra direto, como hoje. A lógica de rascunho e publicar não muda, só o lugar. Falta decidir o que acontece com `/memorias/<id>/relato` (sai, ou fica para "Estou escrevendo por outra pessoa") e com a coluna de "Citar" ao lado da janela.
- **Relato como conversa, para depois** (anotadas pelo Gui ao escolher o que entrava, 18/11/2026; o leia-me do protótipo, em `docs/visual/sessao-i/conversa/leia-me.md`, descreve cada uma): reagir a uma mensagem, e não só ao relato; compartilhar uma mensagem escolhida como imagem; o modo TV, com as mensagens chegando uma a uma e os áudios tocando na vez deles; e perguntas da família, que mexem em quem vê e em avisos. Também falta escrever a legenda de uma foto pela conversa.

- **As marcas de provisório no código**, perguntas que esperam o Gui: as cores novas dos tipos e os nomes delas (`src/lib/visual.ts`, pergunta 1 do PR dos tipos, #127); os nomes de todos os rabiscos (`src/visual/rabiscos.ts`, pergunta 2); repetir cor de tipo, que a amostra só avisa (`src/components/formularios/EscolhaDoTipo.astro`, pergunta 5); o tipo novo que nasce com uma cor e o desenho escolhido depois (`src/pages/admin/tipos.astro`, pergunta 6); o desenho da tarja do ex discreto (`TARJA_DO_DISCRETO`, em `src/lib/arvore-desenho.ts`), que vai passar pelo acabamento visual; a espécie no cartão do bichinho na árvore (`src/lib/cliente/arvore.ts`, "marca provisória"); e a aparência mínima de `src/pages/admin/familias.astro`.

Origem: [histórico, "Em aberto"](historico/decisoes-ate-2026-11-17.md#em-aberto).
