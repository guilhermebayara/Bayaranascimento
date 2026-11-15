# Acervo da família Bayara Nascimento (memorias.bayara.com.br)

Instruções para qualquer sessão de trabalho neste repositório. O site é o acervo privado de memórias da família, presente de Natal de 2026 do Gui e da Giovanna. Até o Natal é surpresa: só os dois usam e alimentam o acervo. O site é em português; o código, os comentários e as mensagens de commit também.

Leia também `docs/decisoes.md` (as regras combinadas e o que está em aberto) e `docs/publicar.md` (ambientes e configuração no Cloudflare).

## Branches e publicação

- `main` é a produção. Cada push publica sozinho em memorias.bayara.com.br, com o banco e as fotos reais.
- Qualquer outra branch vira uma prévia em `<branch>.memorias.bayara.com.br`, com banco e bucket de teste, só com memórias de exemplo e com "Ver como" no topo para trocar de pessoa.
- `formulario` anda igual à `main`. A Giovanna usa essa prévia para ver o site com os exemplos. Depois de cada merge na `main`, iguale a `formulario` por fast-forward. Vale até o Gui e a Giovanna combinarem um fluxo de homologação.
- Trabalho novo nasce da `main` atualizada, numa branch por assunto, e chega à `main` por PR com squash.
- Mudança que altera o site só vai para a `main` depois que o Gui vê a prévia e aprova. Mudança só de documentação ou de regras de trabalho (`CLAUDE.md`, `README.md`, `docs/`) pode ir direto, para toda sessão nova já encontrar.
- Depois do merge, apague a branch. As sessões do Claude não conseguem apagar branch pelo git nem pela API: use a página Branches do GitHub no navegador, com a autorização que o Gui já deu.
- Nunca force um push.

## Antes de levar para a `main`

1. Traga a `main` para a branch.
2. `npm run build` sem erro. Ele roda antes a guarda da produção e os testes (ver "Conferências").
3. A prévia da branch publicada, com a marca verde do Cloudflare e a do GitHub no último commit.
4. A aprovação do Gui.

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

- `npm run confere` (`scripts/confere-producao.mjs`), a guarda da produção. Falha se a produção deixar de usar o banco e o bucket reais ou de se declarar `producao`, se uma prévia apontar para o banco ou o bucket reais, se alguma chamada às memórias de exemplo sair da proteção da produção, se aparecer um e-mail de verdade em arquivo versionado ou se um arquivo de segredo local for versionado.
- `npm test`: os testes em `testes/`, das regras de permissão, das datas, do login, do parentesco e da árvore.
- `npm run build` roda os dois antes do build (`prebuild`). O Cloudflare publica com `npm run build`: se algo falhar, nada vai ao ar e a versão anterior continua.
- No GitHub, `.github/workflows/confere.yml` roda o mesmo a cada push, em qualquer branch, e em todo PR para a `main`. Falha vira marca vermelha no commit e e-mail.

Regra nova que nasce de um achado vira teste em `testes/` ou verificação na guarda, no mesmo commit da correção, para continuar valendo sem depender de memória.

## Árvore

- As regras de arranjo e de linhas estão em `docs/decisoes.md` e nos testes `testes/arvore-*.test.ts`. Elas vieram de ajustes do Gui no FigJam e no Figma: o arranjo é decisão dele.
- `testes/dados/arvore-previa.json` é uma cópia dos dados da prévia como chegam ao navegador do Gui. Ao mudar o desenho, confira os lados da família e o tronco das linhas com várias combinações de laços abertos.
- A montagem fica em `src/lib/arvore-montagem.ts` (sem tela, testável) e o desenho em `src/lib/arvore-desenho.ts`. O código do navegador, em `src/lib/cliente/arvore.ts`, só desenha o resultado.

## Sessões de QA

Vale para sessões abertas só para conferir o site. As regras acima continuam valendo inteiras; esta seção diz o que muda quando o trabalho é QA.

### Onde a sessão trabalha

- Numa branch `qa-AAAA-MM-DD` nascida da branch testada (a `main`, salvo outra indicação). Cada push gera a prévia dela.
- A sessão nunca faz push nem merge na `main`, na `formulario` ou na branch testada. No fim, abre um PR para a branch testada e não faz o merge.
- Correção grande ou arriscada vai para uma branch `qa-<assunto>` separada.
- Tudo é conferido localmente, com `npm run dev` e o "Ver como" do topo, ou na prévia. Nunca na produção.

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
- As prévias leem a mesma configuração do `wrangler.jsonc`, no bloco `previews`. É ele que separa os dados de teste dos reais.
