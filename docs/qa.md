# Sessões de QA

Vale para sessões abertas só para conferir o site. As regras do `CLAUDE.md` continuam valendo inteiras; este documento diz o que muda quando o trabalho é QA. A sessão de QA lê tudo: o `CLAUDE.md`, `docs/decisoes.md`, todos os arquivos de `docs/regras/`, `docs/visual.md` e o histórico (`docs/historico/`). A sessão de QA de UX tem o procedimento próprio, em `docs/qa-ux.md`.

## Os dois níveis de aprovação

1. O QA confere a `homologa` com o acervo de exemplo, que reúne casos difíceis inventados de propósito para estressar o site.
2. Depois, o Gui olha a homologação com o espelho da produção: a família de verdade, com memórias de exemplo.
3. Com os dois níveis certos, a `homologa` vai para a `main`.

Uma sessão de QA por chat: cada rodada começa numa sessão nova do Claude Code, conectada na `homologa`.

## Onde a sessão trabalha

- A branch testada é a `homologa`, salvo outra indicação: é o que está para ir ao ar.
- A sessão trabalha numa branch `qa-AAAA-MM-DD` nascida da branch testada. Cada push gera a prévia dela, com o acervo de exemplo.
- A sessão nunca faz push nem merge na `main`, na `homologa` ou na branch testada. No fim, abre um PR para a branch testada e não faz o merge.
- Correção grande ou arriscada vai para uma branch `qa-<assunto>` separada.
- Tudo é conferido com o acervo de exemplo: localmente, com `npm run dev` e o "Ver como" do topo, ou na prévia da branch de QA. Nunca na produção. A homologação fica atrás de login e a sessão não entra nela: o que só dá para ver lá vai para a lista do relatório.
- O espelho troca todo o banco local pelo espelho. Se a rodada conferir o espelho, faça isso por último e, depois, apague a pasta `.wrangler` para o banco local voltar ao acervo de exemplo.

## Antes de começar e antes de cada push

- Antes de começar: trazer a branch testada e rodar `npm test` e `npm run build` para saber o estado de partida.
- Antes de cada push: `npm run build` sem erro.
- O `tsc` acusa erros de tipo antigos no servidor (tipos do D1 e parâmetros sem tipo). Anote a contagem de partida e relate só o que aumentar.

## O que QA não decide

QA corrige defeito: algo quebrado, erro de build, comportamento diferente do combinado em `docs/regras/`. Texto, layout, cor, regras de privacidade e de permissão, o arranjo da árvore e os dados de exemplo são decisões do Gui e da Giovanna: relate e espere. Na dúvida, trate como decisão. A direção visual está em `docs/visual.md`: o que fugir dela entra como observação, e o que ela ainda não cobre também.

O QA continua sem mudar sozinho o que é decisão. Quando as opções de uma pergunta só remendam o que trava, a pergunta traz também uma opção que repensa a interface (ver "Repensar a interface em vez de forçar uma decisão", no `CLAUDE.md`).

As pendências conhecidas estão em "Decidido, a construir" e "Em aberto", em `docs/decisoes.md`. Não relate como defeito o que já está listado ali.

## Relatório no fim

Toda sessão de QA termina com um relatório curto, nesta ordem:

1. O que foi conferido.
2. O que foi corrigido, com o commit e a branch.
3. O que foi encontrado e ficou para o Gui decidir.
4. O que não deu para conferir e por quê, com a lista do que o Gui precisa conferir na homologação, no Safari do iPhone e na produção.

E a tabela "O quê | Onde ver" do `CLAUDE.md`. Quando um achado merece virar regra permanente, o relatório propõe o teste ou a verificação na guarda (ver [`regras/conferencias.md`](regras/conferencias.md)). Criá-la segue as mesmas regras de branch deste documento.
