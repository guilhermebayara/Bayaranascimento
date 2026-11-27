# O site: princípios e funcionamento

## Estrutura e princípios

- **Memória:** a ficha compartilhada de um acontecimento (título, data, lugar, pessoas, fotos).
- **Relato:** a lembrança de uma pessoa sobre uma memória. Um por pessoa em cada memória.
- **Pessoa:** quem aparece nas memórias.
- Ninguém interfere em como outra pessoa lembra de algo.
- Toda mudança fica registrada em um histórico e pode ser revertida.
- Excluir nunca apaga na hora: o conteúdo vai para uma lixeira e pode ser recuperado.
- O acervo é privado, com acesso por e-mail.
- Memória e capítulo novos ganham um código aleatório no endereço, nunca o título: o título no endereço denunciaria rascunhos e memórias que a pessoa não vê.
- O site é o registro para a próxima geração.

Origem: [histórico, "Estrutura"](../historico/decisoes-ate-2026-11-17.md#estrutura); ["Princípios"](../historico/decisoes-ate-2026-11-17.md#princípios); ["Origem"](../historico/decisoes-ate-2026-11-17.md#origem).

## Como o site funciona

- Toda página é montada para a pessoa logada, e é isso que esconde o que é restrito a um núcleo. Por isso as páginas com conteúdo restrito não podem ser estáticas.
- A regra de quem vê mora em `src/lib/servidor/quem-ve.ts`, em par, o TS e o SQL lado a lado, e `testes/quem-ve-equivalencia.test.ts` confere que os dois dizem o mesmo (ver ["Quem vê o quê mora num ponto só"](permissoes.md#quem-pode-o-quê)).
- A estrutura do banco está em `src/lib/servidor/banco.ts`. O site aplica as mudanças sozinho na primeira visita depois de publicado.
- Prévias de branch usam o banco e o bucket `bayara-memorias-teste`, só com exemplos, e por isso funcionam sem login.
- A proposta completa de estrutura (laços, árvore, capítulos, temas) está no documento "Acervo da família: proposta de estrutura".
- **Linha do tempo:** as memórias mais recentes primeiro, e rolar leva ao passado (`maisRecentesPrimeiro`, em `src/lib/datas.ts`), em todas as páginas que mostram a linha do tempo. "Antes" e "Depois", no fim da memória, seguem a data. A barra de décadas no alto (2020, 2010... 1950) só aparece quando há mais de uma; com um filtro de tipo ligado, as décadas sem memória daquele tipo saem dela.
- **Desempenho do servidor** (brief em `docs/briefs/desempenho.md`, números em `docs/desempenho/2026-11-23-d1a.md`). O plano gratuito permite 50 consultas ao D1 por pedido e 5 milhões de linhas lidas por dia.
    - **Guarda por pedido** (`src/lib/servidor/ambiente.ts`): o que um pedido lê do banco fica guardado só durante ele, com a pessoa do pedido na chave; nada fica numa variável do módulo. Um INSERT ou UPDATE faz ler de novo o que lê a tabela gravada; um DELETE, ou qualquer outra gravação, faz ler tudo de novo. Um gatilho que grava em outra tabela conta junto: a guarda lê os gatilhos do próprio SQL das migrações (`cobrirGatilhosQueGravam`, chamada por `banco.ts` com a lista `MIGRACOES`), e gravar na tabela de origem faz ler de novo também as de destino, em cadeia; um gatilho que apaga, ou cujo destino não se lê, faz ler tudo de novo. Nenhuma lista é mantida à mão, e `testes/guarda-gatilhos.test.ts` falha se o esquema de verdade tiver um gatilho que grava sem estar coberto. O sorteio nunca é guardado. Testes em `testes/guarda-por-pedido.test.ts` e `testes/guarda-gatilhos.test.ts`.
    - **O começo do pedido num lote só** (`aquecerOPedido`, em `repositorio.ts`): o middleware lê de uma vez as pessoas, os núcleos e, nas páginas, as famílias, os laços, os exes, os apelidos de quem olha e os avisos; para quem administra, num segundo lote que não espera, o que as pendências do retrato leem. As rotas de fotos, áudios e retratos leem só as pessoas e os núcleos, sem os tipos e os apelidos. As páginas e o esqueleto leem o resto junto (`Promise.all`), em duas ou três idas.
    - **Server-Timing** em toda resposta: `servidor;dur=` com o tempo do servidor e `d1;desc="consultas=N idas=M"`, contando cada comando (também os de um lote) e cada ida ao banco até a página começar a ser entregue. Só números, nada do acervo.
    - **Posicionamento inteligente** (`"placement": { "mode": "smart" }` no `wrangler.jsonc`, na produção e nas prévias, preso por `testes/posicionamento.test.ts`): o Cloudflare roda o servidor perto do banco. O cabeçalho `cf-placement` diz o que ele escolheu.
    - **"Antes" e "Depois" na memória** vêm de uma consulta própria (`vizinhasDaMemoria`), na mesma ordem da linha do tempo, que desempata pelo `rowid` o que entrou no mesmo instante.
    - **Contar e escolher no banco (MEM-6):** Início, Pessoas, Capítulos, um capítulo, Carta, Nova memória, Sua conta e o palco ao acaso usam contagens ou seleções próprias em `repositorio.ts`. Só as memórias que aparecem são completadas. A linha de rascunhos do Início lê os rascunhos de relato, sem trazer os relatos publicados. As consultas usam os fragmentos de `quem-ve.ts`; a regra do capítulo tem o par TS/SQL em `capitulos.ts`. `testes/contar-no-banco.test.ts` compara os agregados, cartões, cores e conjuntos do sorteio com as regras anteriores. O gabarito bruto e a medição de cinco pedidos estão em `scripts/desempenho/gabarito-mem6.mjs`.
    - **Preparo do processo (B-3):** a criação e leitura de `_migracoes` e a leitura do esquema vão no primeiro lote. A marca `mensagens-dos-relatos-de-antes`, em `ajustes`, dispensa novas varreduras dos relatos. O espelho refaz as mensagens e a marca depois da importação. `SQL.integrantes` é compartilhado entre o aquecimento e a lista, com colunas explícitas; o texto “Sobre” é lido só para a ficha autorizada, a edição, a comparação de fichas e o histórico de gravação.
    - **O modo TV lê uma memória só por passagem** (ver ["Modo TV"](explorar.md#modo-tv)); a primeira página do modo TV lê o acervo, uma vez, para montar a ordem.
    - **Duas conferências à mão**, no computador, com o acervo cheio (`scripts/desempenho/carga-local.mjs`): `conferir-consultas.mjs` falha se alguma página da medição passar de 50 consultas, como o Gui e como a Elizete; `estimar-natal.mjs` estima as linhas lidas no dia 25 (7 pessoas e uma hora de modo TV na sala: a primeira página com a ordem, 360 passagens pela rota de uma memória, uma foto por passagem e a voz numa de cada três) e falha acima de 3 milhões. Ficam fora do build, que não tem servidor.
- **Filtro por qualquer família:** todo mundo filtra a linha do tempo por todas as famílias, e não só pelas de que é membro. O filtro não muda quem vê o quê: de uma família de que a pessoa não é membro, aparece só o que foi aberto a todos (`listarMemorias`). Teste em `testes/visual.test.ts`.

**Topo, menu e rodapé** (`src/layouts/Visual.astro`, testes em `testes/qa-respostas-esqueleto.test.ts` e `testes/menu-da-conta.test.ts`):

- "Pular para o conteúdo" é o primeiro link da página e só aparece com o foco.
- No celular, "Nova memória" fica à vista na barra, entre a marca e o retrato. A marca e o retrato têm 44 px, e só a palavra "Menu" abre o menu. O retrato e o item "Sua conta" do menu continuam os dois.
- **Menu da conta:** o retrato e o nome no topo abrem um menu, por cima da página e embaixo do retrato: "Sua página" (só para quem tem página de pessoa), "Seu círculo" (idem), "Sua conta" (com "N avisos" ao lado, quando há), "Administração" (só os administradores, leva à página dela, `/admin`, com as pendências ao lado, como os avisos) e "Sair" (só onde há login). O número de avisos fica no retrato. Fecha com Esc, que devolve o foco ao retrato, e com o toque fora; abrir o menu da conta fecha o "Menu" do celular, e o contrário também. Sem script, abre e fecha pelo próprio retrato.
- O menu do celular fecha com Esc e com o toque fora. Sem script, só pelo "Menu".
- "Sair" fica só no menu da conta. Leva à saída do Cloudflare Access (`/cdn-cgi/access/logout`) e só aparece onde há login: na produção e na homologação (`temLogin`, em `src/lib/servidor/acesso.ts`).
- O rodapé repete os cinco itens do menu como ações quietas, diz "Você entrou como Fulano" e, no celular, tem "Voltar ao alto". Não tem o link da lixeira.
- A assinatura do rodapé é inteira nas telas de leitura e tem metade da largura nos formulários e nas telas utilitárias (rascunhos, lixeira, administração, "Sua conta", página não encontrada e a página do sistema). Quem decide é a propriedade `rodape` do esqueleto; o padrão é a inteira.
- **O rodapé some só nas telas de mapa:** a árvore e o círculo ocupam a janela inteira abaixo do menu, e a página não rola (`mapa`, em `Visual.astro`). "Sair" continua ao alcance pelo menu da conta.
- `/nova` acende "Nova memória"; o relato acende "Explorar", como a memória; a carta segue em "Início". O menu acende "Capítulos" na lista, no capítulo e no tema, "Pessoas" na lista e "Árvore" na árvore (`secao`).
- `/temas` leva a `/capitulos`, no ponto onde os temas começam.
- Quem entra sem estar ligado a ninguém lê "Avise o Gui, a Giovanna ou o Magno para liberarem seu acesso.", e quando o espaço dos áudios acaba, "Avise o Gui, a Giovanna ou o Magno."
- **Página não encontrada** (`src/pages/404.astro`): "Não encontramos esta página. Ela pode ter mudado de lugar ou não estar aberta para você.", com "Voltar ao início" e o menu do site. A mesma página serve para o que não existe e para o que a pessoa não pode ver: a resposta 404 em texto de qualquer página vira esta (`ehNaoEncontradaSemPagina`, no middleware).

Origem: [histórico, "Como o site funciona"](../historico/decisoes-ate-2026-11-17.md#como-o-site-funciona); [QA de design, "Defeitos corrigidos nesta rodada"](../historico/qa/2026-11-17-perguntas.md#defeitos-corrigidos-nesta-rodada); ["Origem"](../historico/decisoes-ate-2026-11-17.md#origem).; [depois de 17/11](../historico/decisoes-depois-de-2026-11-17.md#como-o-site-funciona).
