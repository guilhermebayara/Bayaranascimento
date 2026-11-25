# Memórias Bayara e Bracarense (memorias.bayara.com.br)

Instruções para qualquer sessão de trabalho neste repositório. O site é o acervo privado de memórias da família, presente de Natal de 2026 do Gui, da Giovanna e do Magno (Lucas Magno), que também cuidam do acervo. Até o Natal é surpresa: só os três usam e alimentam o acervo. O site é em português; o código, os comentários e as mensagens de commit também.

Leia também `docs/decisoes.md` (as regras combinadas e o que está em aberto), `docs/visual.md` (a direção e o sistema visual) e `docs/publicar.md` (ambientes e configuração no Cloudflare).

## Quem lê o quê

`docs/decisoes.md` e `docs/visual.md` trazem só as regras em vigor. O processo, as datas, o que mudou no caminho e as rodadas de QA fechadas estão em `docs/historico/`: a cópia inteira dos dois documentos até 17/11/2026, as perguntas e respostas de QA (`historico/qa/`) e o QA de UX de antes da revisão visual (`historico/ux/`). Cada seção dos documentos enxutos termina com o link para o trecho do histórico de onde veio, e `docs/historico/mapa-da-reducao.md` diz para onde foi cada título antigo.

- **Sessão de construção** lê os enxutos. Abre o histórico quando uma regra parecer incompleta, contraditória ou sem motivo, e antes de mudar algo que pode ter sido decisão do Gui.
- **Sessão de QA** lê tudo, inclusive o histórico.
- Decisão nova entra no enxuto, na seção do assunto, já como regra.

## Como o trabalho acontece

- **Divisão do trabalho (decisão do Gui, 15/11/2026):**
  - No chat (claude.ai, projeto "Gestão de projetos"), o Gui discute, decide, estrutura a documentação e explora ideias. Um conceito pode virar uma branch `tst-<assunto>` de exploração, para ver numa prévia antes de decidir.
  - O código é feito principalmente no Claude Code: tanto a construção quanto as sessões de QA, no mesmo modelo do site da @bsurda e do bayara.design.
  - A ponte entre os dois é a documentação. O que foi decidido e ainda não existe fica em `docs/decisoes.md`, na seção "Decidido, a construir", com o detalhe necessário para uma sessão do Claude Code construir sem precisar da conversa. Quando a construção termina, o item sai dali e vira regra na seção do assunto. Item grande (que pede conceito, muda várias telas ou o banco, ou não cabe em poucas linhas) ganha um brief à parte em `docs/briefs/<assunto>.md`, e a lista guarda só uma linha com o resumo e o link para ele (decisão do Gui, 18/11/2026, trazida do bayara.design). Item pequeno continua inteiro na lista. O brief é escrito no chat, ao preparar a sessão. Se uma sessão do Claude Code recebe um item grande que ainda não tem brief, a primeira coisa que ela faz é escrevê-lo a partir da lista e do histórico, e parar para o Gui aprovar antes de construir. Quando o item é construído, o brief vai para `docs/historico/briefs/`.
- A estrutura completa (integrantes, laços, núcleos, memórias, capítulos, visibilidade, árvore, ordem de construção) está no documento "Acervo da família: proposta de estrutura", nos Claude Docs do Gui: https://claude.ai/artifact/35pDU29F4JH1edsCYZTGAD. Ele vale junto com `docs/decisoes.md`; quando os dois discordam, pergunte.
- A Giovanna e o Magno não usam o Claude. Eles opinam olhando a homologação e comentando numa cópia do documento de estrutura no Google Docs do Gui ("Acervo da família: proposta de estrutura (cópia para comentários)", em `1_Documentos` da pasta do projeto). Essa cópia é a ponte dos dois com o projeto e é escrita para eles, com foco em colaborar. A parte técnica (como o trabalho acontece, os endereços, onde os dados ficam, cópias de segurança e custos) fica em outro documento na mesma pasta, "Acervo da família: parte técnica", linkado no alto da cópia. Quando algo mudar, os três documentos acompanham. Os comentários voltam para o documento principal pelo Gui, numa conversa com o Claude.
- Prazo: Natal de 2026, quando o site é dado de presente. Até lá o Gui, a Giovanna e o Magno alimentam o acervo, e os outros acessos são liberados no dia.
- Quando o trabalho fica em andamento e o Gui vai dormir ou sair, a última resposta diz tudo o que ele precisa ver quando voltar.
- **Repensar a interface em vez de forçar uma decisão (decisão do Gui, 22/11/2026).** Quando uma decisão anterior faz algo travar, a sessão não força a decisão a funcionar: repensa a interface, mesmo que a mudança seja grande, como um designer resolvendo o problema. Uma transformação grande vem com uma pergunta ao Gui ou com duas versões numa prévia, para ele escolher olhando. O caso que deu origem à regra: o modo TV que cabia em 1280 × 720 à custa de cortar os controles (PR #157, fechado sem juntar).

## Pasta do projeto no Drive (do Gui)

`My Drive/Pessoal/0_site_memorias` é o ponto de apoio do projeto, fora do código. O documento "00 Leia-me", na raiz, explica cada pasta e precisa acompanhar qualquer mudança de estrutura.

- `0_Caixa de entrada`: o que ainda não tem lugar.
- `1_Documentos`: documentos de trabalho, como a cópia do documento de estrutura para os comentários da Giovanna.
- `2_Material para o acervo`: fotos, áudios, textos e documentos que ainda vão virar memórias, por assunto ou pessoa (por exemplo, `Áudios Vó`, com os áudios da Vó Bela). Os originais continuam no iCloud e nos celulares.
- `3_Referências visuais`: referências para a direção visual.
- `4_Natal 2026`: o plano do presente.
- `9_Substituídos`: o que saiu de uso. Nada se apaga.
- `Acervo Bayara Nascimento, cópias`: a cópia mensal do banco, feita pelo script de `scripts/copia-no-drive.gs`. Tem tudo do acervo, inclusive o que é restrito a núcleos. Não mude o nome: o script encontra a pasta pelo nome.

Nada desta pasta entra no repositório. A exceção são as fotos do Chico e da Karol, os cachorros, que o Gui escolheu para os exemplos: cópias reduzidas ficam em `exemplos/fotos/` (ver "Fotos de exemplo" em `docs/decisoes.md`).

## O que o Gui já autorizou

- Abrir os sites que precisar, sem pedir.
- Configurar o Cloudflare pelo navegador, inclusive as variáveis do projeto, desde que não gere custo nem risco. Mudar de plano ou ligar algo pago é decisão dele.
- Apagar no GitHub as branches já incorporadas.
- Quando precisar que ele faça ou aprove algo (login, código de verificação, decisão), avise e espere.

## Branches e publicação

| Branch | Endereço | Dados | Login |
| --- | --- | --- | --- |
| `main` | memorias.bayara.com.br | Banco e fotos reais (`bayara-memorias`) | Cloudflare Access, a família |
| `homologa` | homologa.memorias.bayara.com.br | Banco e bucket `bayara-memorias-homologa`: a família de verdade espelhada da produção (nomes, retratos e laços), com memórias de exemplo. As fotos de exemplo das memórias são lidas de `exemplos/` no bucket de teste, só leitura | Cloudflare Access, só Gui, Giovanna e Magno |
| `tst-<assunto>` e as demais | `<branch>.memorias.bayara.com.br` | Banco e bucket `bayara-memorias-teste`, com o acervo de exemplo | Sem login |

- `main` é a produção. Cada push publica sozinho, com o banco e as fotos reais.
- `homologa` é a homologação: o ensaio da publicação. Ela recebe só o que vai para a `main` em seguida, e é onde o Gui, a Giovanna e o Magno aprovam. O banco dela só muda com o código dela, no mesmo caminho que a produção vai seguir.
- `tst-<assunto>` é um teste: um experimento ou uma comparação de layout. Nasce da `homologa` (ou da `main`, enquanto a `homologa` não existir), tem a própria prévia e é apagada quando a ideia vai para a `homologa` ou é descartada. As prévias de teste dividem um banco só, com o acervo de exemplo, então podem mexer nele à vontade.
- O caminho de uma mudança: `tst-<assunto>` → PR com squash para a `homologa` → aprovação na homologação → `main` por fast-forward da `homologa`. Nunca force um push.
- Mudança só de documentação ou de regras de trabalho (`CLAUDE.md`, `README.md`, `docs/`) pode ir direto para a `main`, para toda sessão nova já encontrar. Depois, traga a `main` para a `homologa`.
- Depois do merge, apague a branch de teste. As sessões do Claude não conseguem apagar branch pelo git nem pela API: use a página Branches do GitHub no navegador, com a autorização que o Gui já deu. Na página Branches, um `fetch` com `method: 'DELETE'` para `/guilhermebayara/Bayaranascimento/branches/<branch>` e o cabeçalho `GitHub-Verified-Fetch: true` apaga a branch sem clicar em cada uma.
- **A `homologa` vai para a `main` em rodadas, quando o Gui aprova** (decisão do Gui, 18/11/2026; antes disso, de 16 a 18/11, nada de código ia para a `main`). A primeira rodada levou a revisão visual e as estruturas novas em 18/11/2026. Documentação continua indo direto para a `homologa`, e não para a `main`: os PRs de código também mudam `docs/`, e duas versões dos documentos em paralelo viram conflito. Toda sessão nasce da `homologa` e lê os documentos de lá; a `main` recebe os documentos junto com cada rodada.
- A antiga prévia `formulario`, que a Giovanna usava antes de a homologação existir, foi aposentada em 16/11/2026. A Giovanna usa a homologação.

### O espelho da produção

A homologação usa a família de verdade (decisão do Gui, 18/11/2026): **nomes, datas e laços passam; memórias, relatos, textos, retratos e fotos nunca passam.** Passam as pessoas com os nomes e as datas, quem é de cada família, as filiações, os casais com as fases e os laços do coração; o "Sobre" de cada pessoa é texto e fica vazio. No lugar das memórias entram memórias de exemplo, e os retratos e as fotos são os do Chico e da Karol: nenhum arquivo da produção chega à homologação. Para refazer: no site de verdade, "Baixar cópia para o espelho", em "Espaço e cópias" (só as tabelas da família, alguns KB); na homologação, "Espelho da produção" → enviar esse arquivo. A cópia inteira do acervo é recusada pelo espelho, com recado (sessão D1e, 23/11/2026). Os dois ficam na conta (o retrato do topo), em "Administração". Refaça depois de cargas grandes na produção e antes de testar mudanças na árvore.

- A transformação está em `src/lib/espelho.ts`, testada em `testes/espelho.test.ts`: nada que alguém escreveu ou fotografou passa (memória, relato, "Sobre", foto, áudio, capítulo, carta), e as escolhas que só o dono vê (círculo, como o ex aparece) são apagadas. A guarda confere que o espelho só lê da cópia as tabelas da família e que o "Sobre" sai vazio.
- A cópia para o espelho está em `src/lib/copia-para-o-espelho.ts` (a lista das tabelas e colunas) e `src/lib/servidor/copia-para-o-espelho.ts` (a leitura), testada em `testes/copia-para-o-espelho.test.ts`. A guarda (`scripts/copia-para-o-espelho.mjs`) confere que ela só lê as tabelas da família, coluna por coluna, sem texto escrito nem arquivo, e que o espelho só aceita ela.
- O espelho é gravado direto no banco e no bucket da homologação e nunca entra no repositório. A produção nunca grava na homologação: ela só lê os próprios retratos para montar a cópia, e quem grava é a homologação, ao receber o arquivo.
- A faixa do alto da homologação é listrada e diz "Homologação: a família de verdade, com memórias de exemplo", para ninguém confundir com o site de verdade.
- A escolha do banco é feita pelo endereço do pedido (`src/lib/servidor/ambiente.ts`): o Cloudflare aplica a mesma configuração a todas as prévias, e só `homologa.memorias.bayara.com.br` usa `DB_HOMOLOGA` e `FOTOS_HOMOLOGA`.
- A homologação nunca recebe o acervo de exemplo. Só as 11 fotos de exemplo são compartilhadas, lidas do bucket de teste (ver "Fotos de exemplo" em `docs/decisoes.md`). Na homologação e nas prévias, o "Ver como" do topo continua valendo.

## Antes de levar para a `main`

1. Traga a `main` para a branch.
2. `npm run build` sem erro. Ele roda antes a guarda da produção e os testes (ver "Conferências").
3. A homologação publicada com a mudança, com a marca verde do Cloudflare no último commit e, no PR para a `main`, a da gestalt do GitHub.
4. A aprovação do Gui na homologação.

## O que nunca fazer

- Mexer na produção por fora do site: nada de `wrangler deploy` manual, `--remote` ou `wrangler d1 execute` no banco `bayara-memorias`, nem gravar no bucket `bayara-memorias`.
- Pôr e-mail de verdade no repositório, em commit, em log colado ou em relatório. Quem tem acesso fica só no segredo `ACESSOS` do Cloudflare e na política do Access.
- Pedir, ver ou guardar o Client Secret do token de serviço da cópia mensal, ou qualquer outro segredo.
- Digitar senha em qualquer lugar.
- Fazer as memórias de exemplo rodarem na produção.
- Mudar quem vê o quê sem o Gui decidir. As regras de visibilidade, rascunho, lixeira, laços privados e permissões estão em `docs/decisoes.md`.

## Banco de dados

- A estrutura do banco muda pela lista `MIGRACOES` em `src/lib/servidor/banco.ts`. O próprio site aplica as migrações novas no primeiro acesso, na produção e nas prévias.
- Uma migração já publicada nunca é editada. Mudança nova é uma migração nova, com o número seguinte.
- O SQLite não altera um `CHECK` no lugar: a tabela é refeita com os mesmos dados (ver `010-papel-pai`). Se outra tabela depende dela com `ON DELETE CASCADE`, refaça a dependente antes de apagar a antiga (ver `012-casal-publico-a-parte`); a guarda da produção recusa a ordem errada.
- Os exemplos ficam em `src/lib/servidor/semente.ts`. O banco de teste já foi semeado, então exemplo novo entra numa função própria, protegida pela existência de um dos registros novos, chamada dentro da proteção da produção em `banco.ts`.

## Conferências

O plano gratuito do GitHub não protege branches de repositório privado. As regras que não podem falhar ficam no próprio repositório e travam a publicação:

- `npm run confere` (`scripts/confere-producao.mjs`), a guarda da produção. Falha se a produção deixar de usar o banco e o bucket reais ou de se declarar `producao`, se uma prévia apontar para o banco ou o bucket reais, se a homologação dividir banco ou bucket com a produção ou com as prévias de teste, se a produção enxergar o banco da homologação, se as memórias de exemplo puderem rodar na produção ou na homologação, se as fotos de exemplo puderem chegar ao pacote ou ao bucket da produção, se a homologação puder fazer no bucket de teste algo além de ler o prefixo `exemplos/`, se a limpeza de 7 dias do bucket de teste puder rodar na produção ou na homologação, se aparecer um e-mail de verdade em arquivo versionado, se um arquivo de segredo local for versionado, se o código apagar arquivo do bucket das fotos fora da limpeza do bucket de teste e da rota das fotos sem memória (`src/pages/api/fotos-soltas.ts`, que só os administradores usam, que nunca apaga uma foto de exemplo nem uma de menos de 30 dias e que apaga as cópias de uma foto só junto com ela, `scripts/apagar-no-bucket.mjs`) ou ler `env.DB` e `env.FOTOS` fora de `ambiente.ts`, ou se uma migração apagar uma tabela da qual outra ainda depende com exclusão em cascata (`scripts/migracoes.mjs`: a cascata levaria as linhas da outra junto), ou se um script de medição de desempenho (`scripts/desempenho/`, regra 12) puder tocar prévia, homologação ou produção com dados de carga: a carga só grava no servidor local, pela Local Explorer, num banco com o acervo de exemplo; a medição no navegador recusa a produção e a homologação; e o site não importa esses scripts; ou se as cópias menores das fotos e dos retratos (regra 13, `scripts/copias-no-bucket.mjs`) puderem ser gravadas fora das rotas do site (o envio e o ajuste da Administração, que é só dos administradores e confere de novo, foto por foto, quem vê a original e se ela já tem cópia), ganharem o nome de uma original, forem entregues antes da conferência da original, ou se as cópias das fotos de exemplo puderem chegar ao pacote publicado; ou se o simulador de data (`?hoje=`, que mostra o cartão "Na TV da sala" antes do Natal) puder valer na produção (regra 14, `scripts/simulador-de-data.mjs`: `diaSimulado` recusa a produção, e só `src/lib/servidor/dia-do-pedido.ts` lê o "hoje" do endereço). A regra das exclusões e a regra 13 leem a árvore do código (`scripts/codigo-lido.mjs`, desde a revisão D1f): o bucket é seguido até `bucketDeFotos` ou o env, e `chaveDaCopia`, `chaveDaCopiaDoRetrato`, `chavesDasCopias` e `guardarCopias` são reconhecidas pela origem, com qualquer nome local (apelido na importação, `import * as`, variável, desestruturação, função do projeto que devolve o valor ou recebe o bucket); as recusas pela leitura do texto, de antes, continuam somadas. A regra da cópia para o espelho lê toda importação da montagem pela árvore, com aspas simples ou duplas, reexportada, dinâmica ou por `require`.
- `npm test`: os testes em `testes/`, das regras de permissão, das datas, do login, do parentesco e da árvore. Um deles, `testes/esquema-da-copia.test.ts`, falha se o esquema de verdade passar a ter coluna gerada, índice único por expressão ou collation diferente da BINARY numa coluna de chave: a cópia do acervo confere o arquivo por uma régua que não sustenta isso, e o recado diz para ajustar a cópia junto (ver "A rede no fim da cópia" e "O esquema que a cópia sustenta", em `docs/decisoes.md`).
- `npm run gestalt` (`scripts/confere-gestalt.mjs`), a gestalt que se confere sozinha: abre as telas em 390 e 1280 px e falha quando um título ou rótulo de grupo tem acima menos que o dobro do espaço de baixo. Precisa do servidor local no ar (`npm run dev` e `npm run fotos-de-exemplo`); recebe o endereço, como `npm run gestalt -- http://localhost:4400`. Exceção de propósito entra na lista do script, com o motivo. A regra está em "Visual", em `docs/decisoes.md`.
- Desempenho, à mão e fora do build, com o servidor local e o acervo cheio (`scripts/desempenho/carga-local.mjs`): `node scripts/desempenho/conferir-consultas.mjs` falha se uma página passar de 50 consultas ao D1, e `node scripts/desempenho/estimar-natal.mjs`, se o dia 25 passar de 3 milhões de linhas lidas. Ver "Desempenho do servidor" em `docs/decisoes.md`.
- `npm run build` roda os dois primeiros antes do build (`prebuild`); a gestalt fica fora, porque o build do Cloudflare não tem servidor nem navegador. O Cloudflare publica com `npm run build`: se algo falhar, nada vai ao ar e a versão anterior continua.
- No GitHub, `.github/workflows/confere.yml` roda só a gestalt, e só no PR para a `main` e por disparo manual (aba Actions, "Run workflow"). Ele sobe o servidor local com o acervo de exemplo e abre o navegador, o que o build do Cloudflare não faz. A guarda e os testes não rodam no GitHub: ficam no build do Cloudflare, que já roda em todo push e trava a publicação. Nos PRs para a `homologa`, o GitHub não roda nada, e a gestalt da máquina da sessão, antes de cada push, é a única conferência dela nesse caminho. PR só de documento não dispara. Um push novo no PR, ou um novo disparo manual na mesma branch, cancela a rodada anterior. Falha vira marca vermelha no PR. O motivo (decisão do Gui, 20/11/2026): o repositório vira privado depois de 10/12/2026, e a cota mensal de Actions do plano gratuito é uma só para todos os repositórios privados da conta (ver "Infraestrutura", em `docs/decisoes.md`).
- Toda rota que grava ganha um caso em `testes/pedido-recusado.test.ts` quando alguém mexer nela: o pedido recusado, com a impressão do banco inteiro (todas as tabelas) antes e depois, que precisa sair igual (proposta do QA de 23/11/2026, aceita pelo Gui em 22/11/2026).

Regra nova que nasce de um achado vira teste em `testes/` ou verificação na guarda, no mesmo commit da correção, para continuar valendo sem depender de memória.

## Escrita

- Sem travessão, sem a construção "não é x, é y" e sem grupos de três para dar ritmo. Vale para o site, os documentos, os commits e as respostas ao Gui.
- Texto que o Gui escreveu fica como ele escreveu, a menos que ele peça mudança.
- Os textos do site falam com quem está usando, em frases simples: "sua avó", "seu amigo", "Nova memória". O botão diz o que acontece ao tocar nele.
- O texto que o site mostra (recados, dicas, títulos) usa aspas curvas: “Festa”, nunca "Festa" (resposta do Gui à P8 do QA de 23/11/2026). `testes/aspas-curvas.test.ts` falha com aspas retas em volta de palavras fora de comentários, atributos e seletores; os dados de exemplo ficam de fora.

## Visual

- A direção visual foi definida em 16/11/2026 e está em `docs/visual.md`: claro, serifa macia nos títulos, pastéis com pontos saturados, foto como objeto e movimento discreto. A análise das referências está no Claude Doc linkado ali.
- Movimento: a rolagem é sempre a do aparelho e nenhum efeito quebra um padrão de navegação conhecido. A família inclui gente com pouca familiaridade com sites.
- A revisão visual foi do zero (o relato das fases está no histórico, `docs/historico/visual-ate-2026-11-17.md`). Na fase 3 todas as telas passaram para o visual novo, em quatro PRs empilhados para a `homologa`, e o estilo antigo (`src/styles/global.css`, `Base.astro`) foi apagado no último. Tela nova usa `src/layouts/Visual.astro` ou, se for formulário ou página de trabalho, `src/components/formularios/Pagina.astro`. Na `main`, o estilo antigo continua no ar até a revisão inteira ser levada para lá.
- O sistema visual (fase 2) está em `src/visual/` e `src/components/visual/`, descrito em "Sistema" de `docs/visual.md`. A fonte do site é uma linha só: `FONTES_DO_SITE`, em `src/lib/visual.ts`. Tela nova usa as peças e os tokens que existem; valor solto de cor, fonte, raio ou largura de tela não passa em `testes/sistema.test.ts` e `testes/visual.test.ts`.
- O monograma e os ícones do site são gerados por `npm run monograma` e ficam versionados. Só rode de novo se uma serifa mudar.
- Celular primeiro, desktop de destaque: cada tela nasce em 390 px e ganha composição própria na tela grande, pensada para ver na TV (até 1920 px).
- Toda mudança visual é conferida em 390, 1280 e 1920 px, por teclado, e com movimento reduzido.
- Proximidade (pedido do Gui, 18/11/2026): gestalt faz parte de todo desenho. O espaço entre grupos é bem maior que o espaço dentro de um grupo, e um título fica colado no que nomeia, nunca com quase o mesmo espaço antes e depois.

## Árvore

- As regras de arranjo e de linhas estão em `docs/decisoes.md` e nos testes `testes/arvore-*.test.ts`. Elas vieram de ajustes do Gui no FigJam e no Figma: o arranjo é decisão dele.
- **O que é travado e o que não é (decisão do Gui, 17/11/2026).** Travado é como a árvore se desenha e se comporta: o arranjo, as linhas, quem aparece, os ramos recolhidos, a abertura dos cartões de ramo e os gestos do mapa. Tudo em volta pode mudar como qualquer tela: o título e a descrição da página, a legenda, os controles de camadas e de centro, a ficha da pessoa (o cartão com nome e "Ver página") e onde cada uma dessas peças fica. Na dúvida, se a mudança não altera a montagem (`arvore-montagem.ts`) nem o desenho (`arvore-desenho.ts`), ela é livre.
- `testes/dados/arvore-previa.json` é uma cópia dos dados da prévia como chegam ao navegador do Gui. Ao mudar o desenho, confira os lados da família e o tronco das linhas com várias combinações de laços abertos.
- A montagem fica em `src/lib/arvore-montagem.ts` (sem tela, testável) e o desenho em `src/lib/arvore-desenho.ts`. O código do navegador, em `src/lib/cliente/arvore.ts`, só desenha o resultado.
- A árvore abre na linha direta de quem os administradores escolhem em Administração, "Centros da árvore"; sem escolha, Gui, Giovanna e Lucas Magno (`CENTROS_PADRAO` em `src/lib/centros-da-arvore.ts`). Tios, primos e sobrinhos ficam em ramos recolhidos, que abrem num cartão por cima.
- O Gui desenha os ajustes no Figma, no time Bayara: laços do coração e arranjo no FigJam (https://www.figma.com/board/B7Ke0nL9jG9wQa6uS3Tliw) e o comportamento dos ramos no Figma Design (https://www.figma.com/design/ymPTKrTROQFhfsYTfpLoRk). Ele olha posição e linhas: as duas contam. Ao ler um ajuste, transforme em regra no código, em teste e em `docs/decisoes.md`.
- Nas linhas, curva mostra direção e bifurcação, e ângulo reto fica para cruzamento. Linhas que andam juntas são desenhadas uma vez só, para o tracejado não virar linha cheia.

## Relatório no fim de toda sessão

Formato que o Gui escolheu (18/11/2026): além do relatório, toda sessão termina com uma tabela "O quê | Onde ver", uma linha por assunto, com o endereço completo e clicável onde ele confere o resultado (`https://homologa.memorias.bayara.com.br/...` depois do merge, ou a prévia da branch, `https://<branch>.memorias.bayara.com.br/...`, antes). Endereço de página com id usa uma pessoa ou memória que exista no espelho ou no acervo de exemplo. O Gui responde por linha, citando o endereço.

## Sessões de QA

Vale para sessões abertas só para conferir o site. As regras acima continuam valendo inteiras; esta seção diz o que muda quando o trabalho é QA. A sessão de QA lê tudo, inclusive `docs/historico/` (ver "Quem lê o quê").

### Os dois níveis de aprovação

1. O QA confere a `homologa` com o acervo de exemplo, que reúne casos difíceis inventados de propósito para estressar o site.
2. Depois, o Gui olha a homologação com o espelho da produção: a família de verdade, com memórias de exemplo.
3. Com os dois níveis certos, a `homologa` vai para a `main`.

Uma sessão de QA por chat: cada rodada começa numa sessão nova do Claude Code, conectada na `homologa`.

### Onde a sessão trabalha

- A branch testada é a `homologa`, salvo outra indicação: é o que está para ir ao ar.
- A sessão trabalha numa branch `qa-AAAA-MM-DD` nascida da branch testada. Cada push gera a prévia dela, com o acervo de exemplo.
- A sessão nunca faz push nem merge na `main`, na `homologa` ou na branch testada. No fim, abre um PR para a branch testada e não faz o merge.
- Correção grande ou arriscada vai para uma branch `qa-<assunto>` separada.
- Tudo é conferido com o acervo de exemplo: localmente, com `npm run dev` e o "Ver como" do topo, ou na prévia da branch de QA. Nunca na produção. A homologação fica atrás de login e a sessão não entra nela: o que só dá para ver lá vai para a lista do relatório.
- O espelho troca todo o banco local pelo espelho. Se a rodada conferir o espelho, faça isso por último e, depois, apague a pasta `.wrangler` para o banco local voltar ao acervo de exemplo.

### Antes de começar e antes de cada push

- Antes de começar: trazer a branch testada e rodar `npm test` e `npm run build` para saber o estado de partida.
- Antes de cada push: `npm run build` sem erro.
- O `tsc` acusa erros de tipo antigos no servidor (tipos do D1 e parâmetros sem tipo). Anote a contagem de partida e relate só o que aumentar.

### O que QA não decide

QA corrige defeito: algo quebrado, erro de build, comportamento diferente do combinado em `docs/decisoes.md`. Texto, layout, cor, regras de privacidade e de permissão, o arranjo da árvore e os dados de exemplo são decisões do Gui e da Giovanna: relate e espere. Na dúvida, trate como decisão. A direção visual está em `docs/visual.md`: o que fugir dela entra como observação, e o que ela ainda não cobre também.

O QA continua sem mudar sozinho o que é decisão. Quando as opções de uma pergunta só remendam o que trava, a pergunta traz também uma opção que repensa a interface (ver "Repensar a interface em vez de forçar uma decisão", em "Como o trabalho acontece").

As pendências conhecidas estão em "Em aberto" e nas questões de `docs/decisoes.md`. Não relate como defeito o que já está listado ali.

### Relatório no fim

Toda sessão de QA termina com um relatório curto, nesta ordem:

1. O que foi conferido.
2. O que foi corrigido, com o commit e a branch.
3. O que foi encontrado e ficou para o Gui decidir.
4. O que não deu para conferir e por quê, com a lista do que o Gui precisa conferir na homologação, no Safari do iPhone e na produção.

Quando um achado merece virar regra permanente, o relatório propõe o teste ou a verificação na guarda (ver "Conferências"). Criá-la segue as mesmas regras de branch desta seção.

## Sessão de QA de UX

Aberta só quando o Gui pedir, não é recorrente. Avalia os fluxos (ordem dos formulários, tipo de controle de cada escolha, onde mora cada informação, ordem da linha do tempo) e arruma a interface atual em padrões (tokens, componentes, estados, estrutura de página, textos de interface) para que a troca para o visual final seja feita em poucos lugares, sem julgar a aparência de hoje. O procedimento, o relatório e o prompt estão em `docs/qa-ux.md`.

## Cuidados que já custaram tempo

- O GraphQL do GitHub não funciona nas sessões: use `gh api repos/guilhermebayara/Bayaranascimento/...` (REST).
- Para saber se a prévia publicou: `gh api repos/guilhermebayara/Bayaranascimento/commits/<sha>/check-runs`.
- Mudança na aba Previews do Cloudflare só vale para branches novas, a menos que seja salva com "Apply to existing Previews".
- O servidor local (`npm run dev`) para entre uma conversa e outra: suba de novo antes de conferir.
- No computador, a página "Espelho da produção" também aparece, para testar o espelho. Ele troca todo o banco local; para voltar ao acervo de exemplo, apague a pasta `.wrangler`.
- As prévias leem a mesma configuração do `wrangler.jsonc`, no bloco `previews`. É ele que separa os dados de teste dos reais.
- O clone das sessões é raso e só traz uma branch. Para comparar com outra: `git fetch --depth=50 origin +refs/heads/<branch>:refs/remotes/origin/<branch>`.
- Merge de PR pela API: `gh api -X PUT repos/guilhermebayara/Bayaranascimento/pulls/<n>/merge -f merge_method=squash`. Abrir PR: `gh api repos/.../pulls -f head=<branch> -f base=main ...` (o `gh pr` usa GraphQL).
- **Banda do Safari no iPhone (iOS 26):** um elemento preso (`sticky` ou `fixed`) encostado na borda da tela faz o Safari desenhar uma banda sólida atrás das barras dele. No visual novo, em aparelho de toque, o que fica parado no alto anda por animação ligada à rolagem, como no site da @bsurda: classe `pino-novo`, posta por `src/layouts/Visual.astro`, e regras em `src/visual/telas/linha.css`. Uma peça só anda (`.parada`: a faixa de décadas e a gaveta com a cópia do ano), e nenhuma animação liga ou desliga durante a rolagem: com uma animação por ano, a faixa e o ano davam um pulinho na troca de ano. Ao criar algo preso novo, siga esse modelo e peça ao Gui para conferir no iPhone.
- O Playwright vem instalado globalmente: rode os scripts com `NODE_PATH=$(npm root -g) node arquivo.js`.
- Para ver uma prévia como o Gui vê, use o navegador embutido do app. O `curl` das sessões não alcança os domínios do site.
