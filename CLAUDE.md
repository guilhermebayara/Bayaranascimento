# Acervo da família Bayara Nascimento (memorias.bayara.com.br)

Instruções para qualquer sessão de trabalho neste repositório. O site é o acervo privado de memórias da família, presente de Natal de 2026 do Gui e da Giovanna. Até o Natal é surpresa: só os dois usam e alimentam o acervo. O site é em português; o código, os comentários e as mensagens de commit também.

Leia também `docs/decisoes.md` (as regras combinadas e o que está em aberto) e `docs/publicar.md` (ambientes e configuração no Cloudflare).

## Como o trabalho acontece

- O Gui cria e explora o site com o Claude no chat (claude.ai, projeto "Pessoal e família"). O Claude Code roda as sessões de QA, no mesmo modelo do site da @bsurda e do bayara.design.
- A estrutura completa (integrantes, laços, núcleos, memórias, capítulos, visibilidade, árvore, ordem de construção) está no documento "Acervo da família: proposta de estrutura", nos Claude Docs do Gui: https://claude.ai/artifact/35pDU29F4JH1edsCYZTGAD. Ele vale junto com `docs/decisoes.md`; quando os dois discordam, pergunte.
- A Giovanna não usa o Claude. Ela opina olhando a prévia da `formulario` e comentando numa cópia do documento de estrutura no Google Docs do Gui ("Acervo da família: proposta de estrutura (cópia para comentários)"). Os comentários dela voltam para o documento principal pelo Gui, numa conversa com o Claude.
- Prazo: Natal de 2026, quando o site é dado de presente. Até lá o Gui e a Giovanna alimentam o acervo, e os outros acessos são liberados no dia.
- Quando o trabalho fica em andamento e o Gui vai dormir ou sair, a última resposta diz tudo o que ele precisa ver quando voltar.

## O que o Gui já autorizou

- Abrir os sites que precisar, sem pedir.
- Configurar o Cloudflare pelo navegador, inclusive as variáveis do projeto, desde que não gere custo nem risco. Mudar de plano ou ligar algo pago é decisão dele.
- Apagar no GitHub as branches já incorporadas.
- Quando precisar que ele faça ou aprove algo (login, código de verificação, decisão), avise e espere.

## Branches e publicação

| Branch | Endereço | Dados | Login |
| --- | --- | --- | --- |
| `main` | memorias.bayara.com.br | Banco e fotos reais (`bayara-memorias`) | Cloudflare Access, a família |
| `homologa` | homologa.memorias.bayara.com.br | Banco e bucket `bayara-memorias-homologa`: a estrutura da família espelhada da produção, com nomes e memórias inventados | Cloudflare Access, só Gui e Giovanna |
| `tst-<assunto>` e as demais | `<branch>.memorias.bayara.com.br` | Banco e bucket `bayara-memorias-teste`, com o acervo de exemplo | Sem login |

- `main` é a produção. Cada push publica sozinho, com o banco e as fotos reais.
- `homologa` é a homologação: o ensaio da publicação. Ela recebe só o que vai para a `main` em seguida, e é onde o Gui e a Giovanna aprovam. O banco dela só muda com o código dela, no mesmo caminho que a produção vai seguir.
- `tst-<assunto>` é um teste: um experimento ou uma comparação de layout. Nasce da `homologa` (ou da `main`, enquanto a `homologa` não existir), tem a própria prévia e é apagada quando a ideia vai para a `homologa` ou é descartada. As prévias de teste dividem um banco só, com o acervo de exemplo, então podem mexer nele à vontade.
- O caminho de uma mudança: `tst-<assunto>` → PR com squash para a `homologa` → aprovação na homologação → `main` por fast-forward da `homologa`. Nunca force um push.
- Mudança só de documentação ou de regras de trabalho (`CLAUDE.md`, `README.md`, `docs/`) pode ir direto para a `main`, para toda sessão nova já encontrar. Depois, traga a `main` para a `homologa`.
- Depois do merge, apague a branch de teste. As sessões do Claude não conseguem apagar branch pelo git nem pela API: use a página Branches do GitHub no navegador, com a autorização que o Gui já deu.
- **Transição:** a `formulario` ainda existe e anda igual à `main`, porque a Giovanna recebeu esse endereço antes da homologação existir. Ela some quando a Giovanna passar a usar a homologação.

### O espelho da produção

A homologação usa a mesma estrutura de família da produção (filiações, casais com fases, laços do coração com papel e marca de privado, núcleos), com nomes inventados, anos deslocados e memórias de exemplo. Assim a árvore é testada com o formato real da família. Para refazer: no site de verdade, "Baixar cópia do acervo"; na homologação, rodapé → "Espelho da produção" → enviar o arquivo. Refaça depois de cargas grandes na produção e antes de testar mudanças na árvore.

- A transformação está em `src/lib/espelho.ts`, testada em `testes/espelho.test.ts`: nenhum nome, texto ou memória real passa para o espelho.
- O espelho é gravado direto no banco da homologação e nunca entra no repositório.
- A escolha do banco é feita pelo endereço do pedido (`src/lib/servidor/ambiente.ts`): o Cloudflare aplica a mesma configuração a todas as prévias, e só `homologa.memorias.bayara.com.br` usa `DB_HOMOLOGA` e `FOTOS_HOMOLOGA`.
- A homologação nunca recebe o acervo de exemplo. Na homologação e nas prévias, o "Ver como" do topo continua valendo.

## Antes de levar para a `main`

1. Traga a `main` para a branch.
2. `npm run build` sem erro. Ele roda antes a guarda da produção e os testes (ver "Conferências").
3. A homologação publicada com a mudança, com a marca verde do Cloudflare e a do GitHub no último commit.
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
- O SQLite não altera um `CHECK` no lugar: a tabela é refeita com os mesmos dados (ver `010-papel-pai`).
- Os exemplos ficam em `src/lib/servidor/semente.ts`. O banco de teste já foi semeado, então exemplo novo entra numa função própria, protegida pela existência de um dos registros novos, chamada dentro da proteção da produção em `banco.ts`.

## Conferências

O plano gratuito do GitHub não protege branches de repositório privado. As regras que não podem falhar ficam no próprio repositório e travam a publicação:

- `npm run confere` (`scripts/confere-producao.mjs`), a guarda da produção. Falha se a produção deixar de usar o banco e o bucket reais ou de se declarar `producao`, se uma prévia apontar para o banco ou o bucket reais, se a homologação dividir banco ou bucket com a produção ou com as prévias de teste, se a produção enxergar o banco da homologação, se as memórias de exemplo puderem rodar na produção ou na homologação, se aparecer um e-mail de verdade em arquivo versionado ou se um arquivo de segredo local for versionado.
- `npm test`: os testes em `testes/`, das regras de permissão, das datas, do login, do parentesco e da árvore.
- `npm run build` roda os dois antes do build (`prebuild`). O Cloudflare publica com `npm run build`: se algo falhar, nada vai ao ar e a versão anterior continua.
- No GitHub, `.github/workflows/confere.yml` roda o mesmo a cada push, em qualquer branch, e em todo PR para a `main`. Falha vira marca vermelha no commit e e-mail.

Regra nova que nasce de um achado vira teste em `testes/` ou verificação na guarda, no mesmo commit da correção, para continuar valendo sem depender de memória.

## Escrita

- Sem travessão, sem a construção "não é x, é y" e sem grupos de três para dar ritmo. Vale para o site, os documentos, os commits e as respostas ao Gui.
- Texto que o Gui escreveu fica como ele escreveu, a menos que ele peça mudança.
- Os textos do site falam com quem está usando, em frases simples: "sua avó", "seu amigo", "Nova memória". O botão diz o que acontece ao tocar nele.

## Visual

- A direção visual ainda não foi definida: o Gui está pesquisando referências. A experiência (ordem, hierarquia, interação) evolui agora; o visual vem depois e pode pedir ajustes nela.
- As cores dos núcleos na árvore (`--nucleo-0` a `--nucleo-3` em `src/styles/global.css`) são provisórias, e o mesmo vale para o resto do estilo.
- Toda mudança visual é conferida em largura de celular e de desktop, por teclado, e com movimento reduzido.

## Árvore

- As regras de arranjo e de linhas estão em `docs/decisoes.md` e nos testes `testes/arvore-*.test.ts`. Elas vieram de ajustes do Gui no FigJam e no Figma: o arranjo é decisão dele.
- `testes/dados/arvore-previa.json` é uma cópia dos dados da prévia como chegam ao navegador do Gui. Ao mudar o desenho, confira os lados da família e o tronco das linhas com várias combinações de laços abertos.
- A montagem fica em `src/lib/arvore-montagem.ts` (sem tela, testável) e o desenho em `src/lib/arvore-desenho.ts`. O código do navegador, em `src/lib/cliente/arvore.ts`, só desenha o resultado.
- A árvore abre na linha direta de Gui, Giovanna e Lucas Magno (`CENTROS_PADRAO` em `src/pages/arvore.astro`). Tios, primos e sobrinhos ficam em ramos recolhidos, que abrem num cartão por cima.
- O Gui desenha os ajustes no Figma, no time Bayara: laços do coração e arranjo no FigJam (https://www.figma.com/board/B7Ke0nL9jG9wQa6uS3Tliw) e o comportamento dos ramos no Figma Design (https://www.figma.com/design/ymPTKrTROQFhfsYTfpLoRk). Ele olha posição e linhas: as duas contam. Ao ler um ajuste, transforme em regra no código, em teste e em `docs/decisoes.md`.
- Nas linhas, curva mostra direção e bifurcação, e ângulo reto fica para cruzamento. Linhas que andam juntas são desenhadas uma vez só, para o tracejado não virar linha cheia.

## Sessões de QA

Vale para sessões abertas só para conferir o site. As regras acima continuam valendo inteiras; esta seção diz o que muda quando o trabalho é QA.

### Os dois níveis de aprovação

1. O QA confere a `homologa` com o acervo de exemplo, que reúne casos difíceis inventados de propósito para estressar o site.
2. Depois, o Gui olha a homologação com o espelho da produção: o formato real da família, com nomes inventados.
3. Com os dois níveis certos, a `homologa` vai para a `main`.

Uma sessão de QA por chat: cada rodada começa numa sessão nova do Claude Code, conectada na `homologa`.

### Onde a sessão trabalha

- A branch testada é a `homologa`, salvo outra indicação: é o que está para ir ao ar.
- A sessão trabalha numa branch `qa-AAAA-MM-DD` nascida da branch testada. Cada push gera a prévia dela, com o acervo de exemplo.
- A sessão nunca faz push nem merge na `main`, na `homologa`, na `formulario` ou na branch testada. No fim, abre um PR para a branch testada e não faz o merge.
- Correção grande ou arriscada vai para uma branch `qa-<assunto>` separada.
- Tudo é conferido com o acervo de exemplo: localmente, com `npm run dev` e o "Ver como" do topo, ou na prévia da branch de QA. Nunca na produção. A homologação fica atrás de login e a sessão não entra nela: o que só dá para ver lá vai para a lista do relatório.
- O espelho troca todo o banco local pelo espelho. Se a rodada conferir o espelho, faça isso por último e, depois, apague a pasta `.wrangler` para o banco local voltar ao acervo de exemplo.

### Antes de começar e antes de cada push

- Antes de começar: trazer a branch testada e rodar `npm test` e `npm run build` para saber o estado de partida.
- Antes de cada push: `npm run build` sem erro.
- O `tsc` acusa erros de tipo antigos no servidor (tipos do D1 e parâmetros sem tipo). Anote a contagem de partida e relate só o que aumentar.

### O que QA não decide

QA corrige defeito: algo quebrado, erro de build, comportamento diferente do combinado em `docs/decisoes.md`. Texto, layout, cor, regras de privacidade e de permissão, o arranjo da árvore e os dados de exemplo são decisões do Gui e da Giovanna: relate e espere. Na dúvida, trate como decisão. A direção visual ainda não foi definida, então estranhezas de estilo entram como observação.

As pendências conhecidas estão em "Em aberto" e nas questões de `docs/decisoes.md`. Não relate como defeito o que já está listado ali.

### Relatório no fim

1. O que foi conferido.
2. O que foi corrigido, com o commit e a branch.
3. O que foi encontrado e ficou para o Gui decidir.
4. O que não deu para conferir e por quê, com a lista do que o Gui precisa conferir na prévia, no Safari do iPhone e na produção.

## Cuidados que já custaram tempo

- O GraphQL do GitHub não funciona nas sessões: use `gh api repos/guilhermebayara/Bayaranascimento/...` (REST).
- Para saber se a prévia publicou: `gh api repos/guilhermebayara/Bayaranascimento/commits/<sha>/check-runs`.
- Mudança na aba Previews do Cloudflare só vale para branches novas, a menos que seja salva com "Apply to existing Previews".
- O servidor local (`npm run dev`) para entre uma conversa e outra: suba de novo antes de conferir.
- No computador, a página "Espelho da produção" também aparece, para testar o espelho. Ele troca todo o banco local; para voltar ao acervo de exemplo, apague a pasta `.wrangler`.
- As prévias leem a mesma configuração do `wrangler.jsonc`, no bloco `previews`. É ele que separa os dados de teste dos reais.
- O clone das sessões é raso e só traz uma branch. Para comparar com outra: `git fetch --depth=50 origin +refs/heads/<branch>:refs/remotes/origin/<branch>`.
- Merge de PR pela API: `gh api -X PUT repos/guilhermebayara/Bayaranascimento/pulls/<n>/merge -f merge_method=squash`. Abrir PR: `gh api repos/.../pulls -f head=<branch> -f base=main ...` (o `gh pr` usa GraphQL).
- O Playwright vem instalado globalmente: rode os scripts com `NODE_PATH=$(npm root -g) node arquivo.js`.
- Para ver uma prévia como o Gui vê, use o navegador embutido do app. O `curl` das sessões não alcança os domínios do site.
