# Famílias e o nome do site

## Famílias, núcleos e parentes

- **O nome do site** é "Memórias Bayara e Bracarense": as duas famílias com "e", para ler como a ligação entre elas e não como o núcleo da Giovanna e do Magno. A pasta da cópia mensal no Drive e a marca `acervo` dentro do arquivo da cópia continuam "Bayara Nascimento": o script e o espelho encontram a cópia por eles.
- **Famílias:** Bayara Nascimento, Bayara Bracarense (Giovanna e Lucas Magno) e Bracarense, cada uma com página, árvore e linha do tempo. Uma pessoa e uma memória podem ser de mais de uma.
- **"Família" na tela, "núcleo" no código:** na tela, todo núcleo se chama família ("Família Bayara", "Outras famílias", "De quais famílias é esta memória?"), e "núcleo" fica só no código e no banco. "Toda a família" quer dizer todo mundo. Teste em `testes/visual.test.ts`.
- **Núcleo e parentes.** O núcleo são só as pessoas que acessam o site: Gui, Giovanna, Lucas Magno, Elizete, Ana Candida, Lúcio e Regina (`NUCLEO_INICIAL`, migração `013`). O resto da família é parente de um núcleo (`nucleo_membros.papel`): leva a cor e o lado dele na árvore, e quem é do núcleo edita a página dele e mexe nos laços dele. Parente nunca vê o que é restrito ao núcleo. Na tela os dois aparecem iguais; a diferença fica no banco. Aguilar, Vó Bela, Vó Vivica e o Chico são parentes.
- **Família na ficha.** A ficha de quem não acessa o site tem "Família", com uma caixa por núcleo. Quem edita a ficha marca e desmarca as famílias de parente; os núcleos de quem é membro aparecem marcados e travados, porque acesso é com os admins.
- **Sugestão de família no cadastro** (`src/lib/familias.ts`). Quem entra por um laço de árvore e ainda não tem família sai marcado como parente, e o recado diz qual, para quem cadastrou trocar se precisar. Filho de quem divide um núcleo vai para ele (o filho da Giovanna com o Magno é Bayara Bracarense); com um pai só cadastrado, vale o que ele divide com quem está casado; se não dividem nada, vem a família de origem de cada um. Pai, mãe e casal levam a família de origem de quem está do outro lado: as famílias dele menos as que formou com quem casou (o pai do Magno é Bracarense). Vale para bichinhos. Ninguém vira membro por esse caminho.
- **Bichinhos** são filhos e netos, porque é assim que as duas famílias os tratam. A diferença vem do tipo: o rótulo segue "filho", o cartão mostra a espécie e é todo arredondado, e a linha dos pais até o bichinho é mais leve.
- **"Bichinho" e não "bicho"** (Gui, 18/11: "bicho" soa frio). Todo texto da tela diz "bichinho": o cadastro ("É pessoa ou bichinho?", "Que bichinho?"), a contagem de Pessoas ("2 bichinhos"), a camada e a legenda da árvore ("Bichinhos", "bichinho da família"), o círculo e os textos de ajuda. No código, os nomes internos (`tipo = 'bicho'` no banco, as variáveis, as classes do CSS, o nome do campo e da camada) ficam como estão, sem migração. `testes/bichinho.test.ts` procura "bicho" solto no texto das páginas, dos componentes e do código do navegador. Os dados de exemplo (o tipo e o tema "Bichos" das prévias) são conteúdo, como a família escreveria, e ficam.

Origem: [histórico, "Núcleo, parentes e laços"](../historico/decisoes-ate-2026-11-17.md#núcleo-parentes-e-laços-decisões-do-gui-15112026); ["Origem"](../historico/decisoes-ate-2026-11-17.md#origem); [depois de 17/11](../historico/decisoes-depois-de-2026-11-17.md#famílias-núcleos-e-parentes).

## Assinatura do nome

Migração `018`. O desenho está em `docs/visual.md` ("Assinatura do nome") e no rascunho `docs/visual/assinatura-hierarquia.png`.

- "MEMÓRIAS" é grande e fixo. Abaixo vêm os sobrenomes das famílias do que está sendo visto: "Bayara & Bracarense" na família completa, e o nome da família, como é, numa família só ("Bayara", "Bracarense", "Bayara Bracarense"). O "&" só aparece quando a tela é de mais de uma família.
- Cada núcleo guarda os sobrenomes de que é feito (coluna `sobrenomes`). A linha junta os sobrenomes sem repetir, na ordem dos lados da árvore, com vírgula entre eles e "&" antes do último. Núcleo sem lista usa as palavras do próprio nome.
- Só os administradores editam os sobrenomes, em `/admin/familias` (até quatro por família, só letras). As famílias são um formulário só, com "Salvar famílias" no fim. Se uma tiver erro, nenhuma é gravada, e o recado diz qual.
- Uma linha mais longa que "Bayara & Bracarense" encolhe para caber na largura de "MEMÓRIAS". Testes em `testes/sistema.test.ts`, incluindo uma terceira família.

Origem: [histórico, "Assinatura do nome"](../historico/decisoes-ate-2026-11-17.md#assinatura-do-nome-decisões-do-gui-16112026-migração-018).
