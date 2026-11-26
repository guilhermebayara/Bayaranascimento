# Memórias Bayara e Bracarense (memorias.bayara.com.br)

Instruções para qualquer sessão de trabalho neste repositório. O site é o acervo privado de memórias da família, presente de Natal de 2026 do Gui, da Giovanna e do Magno (Lucas Magno), que também cuidam do acervo. Até o Natal é surpresa: só os três usam e alimentam o acervo. O site é em português; o código, os comentários e as mensagens de commit também.

## Quem lê o quê

As regras em vigor moram em `docs/regras/`, um arquivo por assunto. `docs/decisoes.md` é o índice delas e a fila de trabalho ("Decidido, a construir" e "Em aberto"). `docs/visual.md` traz a direção visual, o sistema e o desenho de cada tela. O processo, as datas, o que mudou no caminho e as rodadas de QA fechadas estão em `docs/historico/`, linkado no fim de cada seção.

- **Sessão de construção** lê este arquivo, o índice e a fila de `docs/decisoes.md` e os arquivos de `docs/regras/` do assunto que vai mexer, mais os que a regra dele cita; quando mexe em tela, também `docs/visual.md`. Abre o histórico quando uma regra parecer incompleta, contraditória ou sem motivo, e antes de mudar algo que pode ter sido decisão do Gui.
- **Sessão de QA** lê tudo, inclusive o histórico, e segue `docs/qa.md`. **Sessão de QA de UX**, aberta só quando o Gui pedir, segue `docs/qa-ux.md`: avalia os fluxos e arruma a interface nos padrões do sistema visual que existe (`docs/visual.md`), sem julgar a aparência.
- Decisão nova entra no arquivo do assunto, em `docs/regras/`, já como regra. Onde a regra foi decisão do Gui, fica a marca curta "(Gui, 23/11)"; a origem e o que mudou vão para o histórico (`docs/historico/decisoes-depois-de-2026-11-17.md`).
- Outros documentos: `docs/publicar.md` (Cloudflare e computador), `docs/copia-no-drive.md` (a cópia do acervo e o espelho), `docs/sessoes.md` (cuidados que já custaram tempo), `docs/drive.md` (a pasta do projeto no Drive) e `docs/briefs/`.

## Como o trabalho acontece

- **Divisão do trabalho (Gui, 15/11):**
  - No chat (claude.ai, projeto "Gestão de projetos"), o Gui discute, decide, estrutura a documentação e explora ideias. Um conceito pode virar uma branch `tst-<assunto>` de exploração, para ver numa prévia antes de decidir.
  - O código é feito principalmente no Claude Code: tanto a construção quanto as sessões de QA, no mesmo modelo do site da @bsurda e do bayara.design.
  - A ponte entre os dois é a documentação. O que foi decidido e ainda não existe fica em `docs/decisoes.md`, na seção "Decidido, a construir", com o detalhe necessário para uma sessão do Claude Code construir sem precisar da conversa. Quando a construção termina, o item sai dali e vira regra no arquivo do assunto. Item grande (que pede conceito, muda várias telas ou o banco, ou não cabe em poucas linhas) ganha um brief à parte em `docs/briefs/<assunto>.md`, e a lista guarda só uma linha com o resumo e o link para ele (Gui, 18/11). Item pequeno continua inteiro na lista. O brief é escrito no chat, ao preparar a sessão. Se uma sessão do Claude Code recebe um item grande que ainda não tem brief, a primeira coisa que ela faz é escrevê-lo a partir da lista e do histórico, e parar para o Gui aprovar antes de construir. Quando o item é construído, o brief vai para `docs/historico/briefs/`.
- A estrutura completa (integrantes, laços, núcleos, memórias, capítulos, visibilidade, árvore, ordem de construção) está no documento "Acervo da família: proposta de estrutura", nos Claude Docs do Gui: https://claude.ai/artifact/35pDU29F4JH1edsCYZTGAD. Ele vale junto com `docs/regras/`; quando os dois discordam, pergunte.
- A Giovanna e o Magno não usam o Claude. Eles opinam olhando a homologação e comentando numa cópia do documento de estrutura no Google Docs do Gui ("Acervo da família: proposta de estrutura (cópia para comentários)", em `1_Documentos` da pasta do projeto). Essa cópia é a ponte dos dois com o projeto e é escrita para eles, com foco em colaborar. A parte técnica (como o trabalho acontece, os endereços, onde os dados ficam, cópias de segurança e custos) fica em outro documento na mesma pasta, "Acervo da família: parte técnica", linkado no alto da cópia. Quando algo mudar, os três documentos acompanham. Os comentários voltam para o documento principal pelo Gui, numa conversa com o Claude.
- Prazo: Natal de 2026, quando o site é dado de presente. Até lá o Gui, a Giovanna e o Magno alimentam o acervo, e os outros acessos são liberados no dia.
- Quando o trabalho fica em andamento e o Gui vai dormir ou sair, a última resposta diz tudo o que ele precisa ver quando voltar.
- **Repensar a interface em vez de forçar uma decisão (Gui, 22/11).** Quando uma decisão anterior faz algo travar, a sessão não força a decisão a funcionar: repensa a interface, mesmo que a mudança seja grande, como um designer resolvendo o problema. Uma transformação grande vem com uma pergunta ao Gui ou com duas versões numa prévia, para ele escolher olhando.
- A pasta do projeto no Drive do Gui (`My Drive/Pessoal/0_site_memorias`) é o ponto de apoio fora do código: `docs/drive.md` explica cada pasta. Nada dela entra no repositório, fora as fotos de exemplo do Chico e da Karol.

## O que o Gui já autorizou

- Abrir os sites que precisar, sem pedir.
- Configurar o Cloudflare pelo navegador, inclusive as variáveis do projeto, desde que não gere custo nem risco. Mudar de plano ou ligar algo pago é decisão dele.
- Apagar no GitHub as branches já incorporadas (como, em `docs/sessoes.md`).
- Quando precisar que ele faça ou aprove algo (login, código de verificação, decisão), avise e espere.

## Branches e publicação

| Branch | Endereço | Dados | Login |
| --- | --- | --- | --- |
| `main` | memorias.bayara.com.br | Banco e fotos reais (`bayara-memorias`) | Cloudflare Access, a família |
| `homologa` | homologa.memorias.bayara.com.br | Banco e bucket `bayara-memorias-homologa`: o espelho da produção (a família de verdade, com memórias de exemplo). As fotos de exemplo das memórias são lidas de `exemplos/` no bucket de teste, só leitura | Cloudflare Access (aplicação "memorias homologa", política "Homologação"), só Gui, Giovanna e Magno, com troca de pessoa no topo |
| `tst-<assunto>` e as demais | `<branch>.memorias.bayara.com.br` | Banco e bucket `bayara-memorias-teste`, com o acervo de exemplo | Sem login, com troca de pessoa no topo |
| Computador | localhost | Banco local, com o acervo de exemplo | Sem login, com troca de pessoa no topo |

- `main` é a produção. Cada push publica sozinho, com o banco e as fotos reais.
- `homologa` é a homologação: o ensaio da publicação. Ela recebe só o que vai para a `main` em seguida, e é onde o Gui, a Giovanna e o Magno aprovam. O banco dela só muda com o código dela, no mesmo caminho que a produção vai seguir.
- `tst-<assunto>` é um teste: um experimento ou uma comparação de layout. Nasce da `homologa`, tem a própria prévia e é apagada quando a ideia vai para a `homologa` ou é descartada. As prévias de teste dividem um banco só, com o acervo de exemplo, então podem mexer nele à vontade.
- O caminho de uma mudança: `tst-<assunto>` → PR com squash para a `homologa` → aprovação na homologação → `main` por fast-forward da `homologa`. Nunca force um push. Depois do merge, apague a branch de teste.
- **A `homologa` vai para a `main` em rodadas, quando o Gui aprova** (Gui, 18/11). Documentação também vai para a `homologa`, e não direto para a `main` (Gui, 26/11): os PRs de código também mudam `docs/`, e duas versões dos documentos em paralelo viram conflito. Toda sessão nasce da `homologa` e lê os documentos de lá; a `main` recebe os documentos junto com cada rodada.
- **O espelho da produção** (Gui, 18/11): a homologação tem a família de verdade. Nomes, datas e laços passam; memórias, relatos, textos, retratos e fotos nunca passam, e nenhum arquivo da produção chega à homologação. Como refazer e como funciona: `docs/copia-no-drive.md`, "O espelho da produção". A faixa do alto da homologação é listrada, para ninguém confundir com o site de verdade.

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
- Fazer as memórias de exemplo rodarem na produção. A homologação também nunca recebe o acervo de exemplo.
- Mudar quem vê o quê sem o Gui decidir. As regras de visibilidade, rascunho, lixeira, laços privados e permissões estão em `docs/regras/` (`permissoes.md` e o arquivo de cada assunto).
- Forçar um push, ou editar uma migração já publicada.
- Deixar a produção gravar na homologação, ou o espelho levar o que alguém escreveu ou fotografou.
- Numa sessão de QA: fazer push ou merge na `main`, na `homologa` ou na branch testada, ou conferir algo na produção.

## Banco de dados

- A estrutura do banco muda pela lista `MIGRACOES` em `src/lib/servidor/banco.ts`. O próprio site aplica as migrações novas no primeiro acesso, na produção e nas prévias.
- Uma migração já publicada nunca é editada. Mudança nova é uma migração nova, com o número seguinte.
- O SQLite não altera um `CHECK` no lugar: a tabela é refeita com os mesmos dados (ver `010-papel-pai`). Se outra tabela depende dela com `ON DELETE CASCADE`, `SET NULL` ou `SET DEFAULT` (também pela chave posta por `ALTER TABLE ... ADD COLUMN`), refaça a dependente antes de apagar a antiga (ver `012-casal-publico-a-parte`); a guarda da produção recusa a ordem errada.
- Os exemplos ficam em `src/lib/servidor/semente.ts`. O banco de teste já foi semeado, então exemplo novo entra numa função própria, protegida pela existência de um dos registros novos, chamada dentro da proteção da produção em `banco.ts`.

## Conferências

O que cada uma confere, regra por regra, está em `docs/regras/conferencias.md`.

- `npm run confere` (`scripts/confere-producao.mjs`), a guarda da produção: separa a produção, a homologação e as prévias, guarda os exemplos, os e-mails, os segredos e o que se apaga do bucket, as migrações, o espelho, as cópias das fotos, os scripts de desempenho, o simulador de data, a trava das telas do conceito, se elas voltarem (regra 8) e a página do sistema (regra 9).
- `npm test`: os testes de `testes/`, que cobrem quase todo o site.
- `npm run build` roda os dois primeiros antes do build (`prebuild`). O Cloudflare publica com `npm run build`: se algo falhar, nada vai ao ar e a versão anterior continua.
- Com o servidor local no ar, fora do build: `npm run gestalt` (a proximidade dos títulos, em 390 e 1280 px; antes de cada push para a `homologa`, é a única conferência dela nesse caminho), `npm run tv` (o modo TV em oito janelas) e, com o acervo cheio, `node scripts/desempenho/conferir-consultas.mjs` e `node scripts/desempenho/estimar-natal.mjs`.
- No GitHub, `.github/workflows/confere.yml` roda só a gestalt, no PR para a `main` e por disparo manual (Gui, 20/11).
- Toda rota que grava ganha um caso em `testes/pedido-recusado.test.ts` quando alguém mexer nela: o pedido recusado, com a impressão do banco inteiro antes e depois, que precisa sair igual (Gui, 22/11).

Regra nova que nasce de um achado vira teste em `testes/` ou verificação na guarda, no mesmo commit da correção, para continuar valendo sem depender de memória.

## Escrita

- Sem travessão, sem a construção "não é x, é y" e sem grupos de três para dar ritmo. Vale para o site, os documentos, os commits e as respostas ao Gui.
- Texto que o Gui escreveu fica como ele escreveu, a menos que ele peça mudança.
- Os textos do site falam com quem está usando, em frases simples: "sua avó", "seu amigo", "Nova memória". O botão diz o que acontece ao tocar nele.
- O texto que o site mostra (recados, dicas, títulos) usa aspas curvas: “Festa”, nunca "Festa" (Gui, 23/11). `testes/aspas-curvas.test.ts` falha com aspas retas em volta de palavras fora de comentários, atributos e seletores; os dados de exemplo ficam de fora.

## Visual

- A direção visual, o sistema e o desenho de cada tela estão em `docs/visual.md`. Tela nova usa `src/layouts/Visual.astro` ou, se for formulário ou página de trabalho, `src/components/formularios/Pagina.astro`, e as peças e os tokens que existem: valor solto de cor, fonte, raio ou largura de tela não passa em `testes/sistema.test.ts` e `testes/visual.test.ts`.
- Celular primeiro, desktop de destaque: cada tela nasce em 390 px e ganha composição própria na tela grande, pensada para ver na TV (até 1920 px).
- Toda mudança visual é conferida em 390, 1280 e 1920 px, por teclado, e com movimento reduzido.
- A rolagem é sempre a do aparelho e nenhum efeito quebra um padrão de navegação conhecido. A família inclui gente com pouca familiaridade com sites.
- Gestalt faz parte de todo desenho (Gui, 18/11): o espaço entre grupos é pelo menos o dobro do espaço dentro de um grupo, e um título fica colado no que nomeia (ver "Gestalt em toda tela", em `docs/visual.md`).

## Árvore

- As regras de arranjo e de linhas estão em `docs/regras/arvore.md` e nos testes `testes/arvore-*.test.ts`. Elas vieram de ajustes do Gui no FigJam e no Figma: o arranjo é decisão dele.
- **O que é travado e o que não é (Gui, 17/11).** Travado é como a árvore se desenha e se comporta: o arranjo, as linhas, quem aparece, os ramos recolhidos, a abertura dos cartões de ramo e os gestos do mapa. Tudo em volta pode mudar como qualquer tela: o título e a descrição da página, a legenda, os controles de camadas e de centro, a ficha da pessoa (o cartão com nome e "Ver página") e onde cada uma dessas peças fica. Na dúvida, se a mudança não altera a montagem (`arvore-montagem.ts`) nem o desenho (`arvore-desenho.ts`), ela é livre.

## Relatório no fim de toda sessão

Formato que o Gui escolheu (18/11): além do relatório, toda sessão termina com uma tabela "O quê | Onde ver", uma linha por assunto, com o endereço completo e clicável onde ele confere o resultado (`https://homologa.memorias.bayara.com.br/...` depois do merge, ou a prévia da branch, `https://<branch>.memorias.bayara.com.br/...`, antes). Endereço de página com id usa uma pessoa ou memória que exista no espelho ou no acervo de exemplo. O Gui responde por linha, citando o endereço.
