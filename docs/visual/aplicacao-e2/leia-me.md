# Aplicação da E2: a busca como porta do site

Sessão AD, 26/11/2026, na branch `tst-aplicacao-e2`, nascida da `homologa` (53a9772). O brief e a escolha do Gui estão em `docs/historico/briefs/busca-no-explorar.md`; a exploração, na branch `tst-busca` (relatório em `docs/visual/exploracao-e2/leia-me.md` de lá). As regras ficaram em `docs/regras/explorar.md`, "A busca", e o desenho em `docs/visual.md`, "A busca" e "Explorar".

## A escolha entre a tabela normalizada e o FTS5

Medido no servidor local, com o acervo cheio (`scripts/desempenho/carga-local.mjs`: 654 memórias, 1.553 relatos, 203 áudios, 3.080 fotos; 3.797 textos no índice). Linhas lidas do D1 e tempo médio de 5 consultas, para achar os candidatos de uma palavra:

| Palavra | FTS5 (`busca_indice`) | Tabela com o texto normalizado (`instr`) | Achados |
| --- | --- | --- | --- |
| natal | 104 linhas, 4,5 ms | 3.797 linhas, 8,8 ms | 52 |
| vó | 1.548 linhas, 5,5 ms | 3.797 linhas, 7,4 ms | 774 |
| sabará | 14 linhas, 3,7 ms | 3.797 linhas, 7,1 ms | 7 |
| panela | 2 linhas, 3,6 ms | 3.797 linhas, 6,2 ms | 1 |
| 1994 | 16 linhas, 3,8 ms | 3.797 linhas, 7,9 ms | 8 |
| buquê | 4 linhas, 4,3 ms | 3.797 linhas, 7,3 ms | 2 |
| casamento | 80 linhas, 3,6 ms | 3.797 linhas, 6,4 ms | 40 |

**Ficou o FTS5.** A tabela normalizada lê a tabela inteira a cada palavra, e cresce com o acervo; o FTS5 lê duas linhas por texto achado. E pesou mais um motivo: o SQLite não tira acento, então a tabela normalizada só seria mantida pelo código, em cada caminho que grava (o site, os exemplos, a carga, a restauração, o espelho); com o FTS5, que tira acento ao indexar, gatilhos simples em `memorias`, `relatos`, `audios` e `fotos` mantêm o índice em qualquer caminho, sem mexer no `repositorio.ts` (a AC3 mexe nele ao mesmo tempo). O preço: o D1 não exporta tabela virtual de um jeito que volte ao D1, então o índice fica fora da cópia do acervo e do espelho e é refeito pelos gatilhos e pela migração 116 (`docs/copia-no-drive.md`). A cópia do acervo é feita pelo site, tabela por tabela, e não pelo export do D1: não muda nada nela.

## O custo no dia 25

`node scripts/desempenho/estimar-natal.mjs`, com o acervo cheio, agora com a busca: cada pessoa procura 3 vezes no dia, cada busca pede o resultado 4 vezes enquanto se digita e abre uma vez o Explorar com a busca.

| | Linhas lidas |
| --- | --- |
| O dia 25 antes da busca | 3.356.000 (a meta é 3 milhões) |
| O resultado da folha (3.222 linhas por pedido como o Gui, 3.332 como a Elizete) | 276.000 |
| "Ver no Explorar" (29.364 e 28.694 linhas: a página do Explorar, que lê o acervo inteiro, mais uns 1.100 da busca) | 608.000 |
| **Total, contando todo "Ver no Explorar" como página a mais** | **4.240.000** |

A busca em si soma perto de 300 mil linhas (o resultado da folha e a parte da busca no Explorar). O resto é a página do Explorar, que já é o maior custo do dia e que a D2 vai tirar do servidor. Se "Ver no Explorar" ficar no lugar de uma das 9 aberturas do Explorar que a conta já tem por pessoa, o dia fica em uns 3,66 milhões. Nos dois casos, abaixo dos 5 milhões do plano e acima da meta de 3 milhões, que já estava passada antes desta sessão.

Para chegar a 3.300 linhas por pedido (eram 7.100 na primeira versão): a folha cruza primeiro só os ids de cada palavra e lê as memórias e as ligações só das que respondem a todas; as ligações vêm numa consulta só, com subconsultas por memória; e sem as memórias da página, os temas vêm da lista de temas (16 linhas), e não da lista dos temas visíveis (694). Das 3.300, 533 são do começo de todo pedido (as pessoas e as famílias), e o resto é a busca: palavra curta e comum ("vó") é a que mais lê.

**CPU por pedido** (`node scripts/desempenho/medir-cpu.mjs --fase paginas`, o build de publicação no workerd local, mediana de 5): o resultado da folha leva de 16 a 24 ms; a página `/busca`, de 16 a 18 ms; o Explorar com a busca, de 26 a 33 ms. Para comparar, na mesma rodada: o Explorar na linha do tempo, de 20 a 21 ms. O resultado da folha fica abaixo do Explorar, que é a referência da medição M2.

## Depois da revisão MEM-3 (26/11/2026)

A revisão de outra família (MEM-3, sobre 4a6380a) achou dois defeitos, corrigidos na mesma branch, depois de trazer a `homologa` com a AC3 (`src/lib/servidor/quem-ve.ts`).

**1. O relato com lista vazia aparecia na busca.** A leitura própria da espera do relato (`nucleosDoRelato`) tratava `'[]'` como sem espera, e quem não podia ler o relato achava a memória por ele, pelo texto, pela transcrição e pela legenda das fotos dele. Agora a espera é lida por `lerEspera`, de `quem-ve.ts`, que mantém `'[]'` como espera (Gui, 26/11) e lê `''` como sem espera. Teste em `testes/busca-banco.test.ts` ("o relato que espera com a lista vazia"), nos três campos e nos dois caminhos (a folha e `/busca`, que usam `folhaDaBusca`, e o Explorar com `q`); ele falha no código de 4a6380a. A guarda (regra 15) recusa a leitura própria da coluna.

**2. A palavra comum lia demais.** Medido como na revisão, com o acervo cheio de `carga-local.mjs --fotos=exemplo`, no servidor local, linhas lidas do D1 por pedido de `/busca/resultado`, como a Elizete:

| Busca | Antes (4a6380a) | Depois |
| --- | --- | --- |
| “vó” | 12.860 | 4.453 |
| “eu” | 14.242 | 4.860 |
| “natal” | 2.381 | 1.081 |
| “m” (uma letra) | 579 | 579 |
| “natal casa vó” | 7.480 * | 5.922 |
| “minha mãe” | 2.724 * | 1.119 |
| “sabará” | 720 * | 628 |

\* Medido na sessão anterior, com a carga padrão, no código de 4a6380a; os outros “antes” são desta sessão, com a carga da revisão.

Com a carga padrão (as fotos com chave própria), os mesmos números ficam a poucas linhas destes: “vó” 4.489, “eu” 4.816, “natal” 1.084, “natal casa vó” 5.926. Das linhas de cada pedido, 533 são do começo de todo pedido (as pessoas e as famílias), e “m” não acha nada.

O que mudou, sem mudar o que ninguém vê:

- A folha não lê mais as memórias candidatas com todas as ligações: lê leves, só as que a pessoa vê (o fragmento `sqlVeMemoria`, de `quem-ve.ts`), e as ligações que contam para a busca (as pessoas, os capítulos e os temas achados) vêm das consultas por pessoa, capítulo e tema que ela já fazia. As listas de ids vão pela junção com `json_each`, que lê perto de 30% menos que `IN (SELECT ...)`.
- Com uma palavra, o texto achado e o relato dele vêm na própria consulta do índice; com mais de uma, primeiro só os ids de cada palavra, e os detalhes só dos acertos das memórias que respondem a todas. O áudio e a foto entram pelo id só no campo deles (antes, cada acerto lia também o áudio e a foto de mesmo número).
- A regra do relato é decidida no código, com `veORelato` de `quem-ve.ts`, sobre o relato lido junto do acerto. O fragmento SQL dela (`sqlVeORelato`) custava uma linha a mais por acerto, no `NOT IN (SELECT value FROM json_each(...))` de quem a pessoa não vê: 771 acertos de “vó”, 700 linhas. Fica a observação para quem cuidar de `quem-ve.ts`: um `NOT EXISTS` ou a lista como texto talvez evite essa leitura em toda consulta que usa o fragmento.
- No empate de pontos, a ordem do resultado é a do id da memória, escrita no código; antes, ela vinha da ordem em que o SQL devolvia as linhas, que era a mesma.

**A prova de que nada mudou no que aparece.** Uma comparação feita só nesta sessão, fora do repositório: a folha antiga (de 4a6380a) e a nova, lado a lado, com o mesmo banco, deram o mesmo resultado (as cinco memórias, a ordem, o porquê com o trecho, a conta, as pessoas com a conta delas, os capítulos e os temas). Foram 4.560 buscas no acervo de exemplo (cada palavra do acervo, os começos de palavra, as frases, como as quatro pessoas do “Ver como”) e 1.568 no acervo cheio (uma amostra das palavras, como a Elizete e o Magno). Os testes de `testes/busca-banco.test.ts` continuam conferindo, em cada caso, que a folha e o Explorar dão o mesmo.

**A meta.** “vó” e “eu” ficaram em 4.450 a 4.860 linhas, perto de 1,4 vez a média de 3.300 do relatório anterior; a média das quatro buscas dele caiu para 2.188. Uma palavra que aparece em 771 textos de 424 memórias lê, no mínimo, o índice e o texto de cada acerto (1.542 linhas) e cada memória (424), mais as 533 do começo do pedido: perto de 2.500. Para chegar mais perto disso:

| Opção | “vó” e “eu” | O que muda |
| --- | --- | --- |
| a) Como está | 4.450 e 4.860 | Nada |
| b) Migração 117: a tabela do índice leva o que a regra do relato lê (quem contou, quem registrou, a espera, a situação), mantido pelos gatilhos | perto de 3.700 e 3.800 | Uma linha a menos por acerto; a regra do relato ganha mais uma cópia dos dados para a AC3 cobrir, e liberar um relato regrava as linhas dele no índice |
| c) A conta do resultado com teto (“Ver mais de 100 memórias no Explorar”) | perto de 3.000 | Muda o que aparece: decisão do Gui |

Recomendo a (a) até a carga de verdade do Natal: o resultado da folha pesa 255 mil linhas no dia 25 (abaixo), e o que pesa é o Explorar.

**O dia 25** (`node scripts/desempenho/estimar-natal.mjs`, carga padrão, com “vó” e “eu” na mistura das buscas): 4.295.748 linhas. A busca responde por 872 mil: 255 mil do resultado da folha (3.048 linhas por pedido como o Gui, 3.013 como a Elizete, na média das seis buscas) e 617 mil de “Ver no Explorar”, que é a página do Explorar, com o acervo inteiro (29.797 e 29.129 linhas). Sem a busca, o dia fica em 3,42 milhões. A mesma conta com a carga `--fotos=exemplo` dá 5,65 milhões, mas por causa das fotos: cada foto da carga usa uma das 11 chaves de exemplo, e cada foto pedida confere centenas de linhas com a mesma chave (1.128 linhas por foto, contra 144 com a carga padrão). Isso é da carga de medida, e não do site.

## O caminho de "aquele Natal na casa da vó", como a Elizete, em 390 × 844

| | Toques | Rolagem até a memória |
| --- | --- | --- |
| Antes (C2) | 4 ("Filtros", "Quem estava junto", "Vó Vivica", "Ver as 11 memórias") e o da memória | "Vó Vivica" a 1.344 px na lista de nomes; a memória cerca de 7,8 telas depois |
| Agora | 1 (a lupa) e o da memória | Nenhuma: "Primeiro Natal na casa da Vó Vivica" aparece a 179 px, acima do teclado aberto |

Conferido com o Playwright (movimento reduzido): a lupa põe o foco na caixa; o voltar do aparelho fecha a folha e fica na página; abrir uma memória pela folha e voltar volta à página de antes, com a folha fechada, num toque só; pelo teclado, em 1280 × 720, o Tab chega à lupa, o Enter abre com o foco na caixa, o Esc fecha (mesmo com texto escrito) e o foco volta à lupa.

## Capturas

Em `docs/visual/aplicacao-e2/`, como a Elizete, com movimento reduzido. O teclado aberto é simulado pela parte da tela acima dele no iPhone (390 × 470).

| Arquivo | O que mostra |
| --- | --- |
| `inicio-lupa-390.jpg`, `-1280`, `-1920` | A lupa no topo do Início |
| `folha-antes-de-digitar-390.jpg`, `-1280`, `-1920` | A folha aberta, com os exemplos |
| `b-390-natal-casa-vo.jpg` | "aquele Natal na casa da vó" |
| `folha-minha-mae-390.jpg`, `-1280`, `-1920` | As pessoas primeiro: "Vó Vivica · sua mãe" |
| `teclado-aberto-minha-mae-390.jpg` | O mesmo, com o teclado aberto |
| `folha-sem-resultado-390.jpg`, `-1280`, `-1920` | Sem resultado |
| `pagina-busca-panela-390.jpg`, `-1280`, `-1920` | A página `/busca`, com o achado na transcrição de um áudio |
| `explorar-alto-compacto-390.jpg`, `-1280`, `-1920` | O alto compacto do Explorar |
| `explorar-com-q-390.jpg`, `-1280`, `-1920` | "Ver no Explorar": o `q` como ficha ligada |
| `teclado-foco-na-lupa-1280.jpg`, `teclado-sabara-1280.jpg` | Só pelo teclado |

## O que só dá para conferir no iPhone

- A folha no Safari: a banda atrás das barras (a folha é o `<dialog>` do navegador, sem `sticky` nem `fixed` nosso) e a altura com o teclado aberto (a caixa e as primeiras memórias à vista).
- O "Buscar" do teclado fecha o teclado com o resultado à vista.
- O gesto de voltar (deslizar da borda) com a folha aberta fecha a folha.
- O alto compacto do Explorar com a fonte do iPhone.
