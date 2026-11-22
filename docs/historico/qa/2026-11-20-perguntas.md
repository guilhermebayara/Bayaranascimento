# Perguntas do QA de 20/11/2026

Rodada detalhista na branch `qa-2026-11-20`, nascida da `homologa` (`d1283aa`). O que está aqui é decisão. Nada disto foi mudado.

**Respostas do Gui (registradas pela sessão U, 23/11/2026):** P1 A, os dados de exemplo ficam como estão (regra em "Capítulos e temas", em `docs/decisoes.md`). P2 entra no item "Espaço igual entre os itens dos controles Forma de ver e Mural", em "Decidido, a construir", que continua parado à espera da explicação do Gui. O relatório da rodada está em [`2026-11-20-relatorio.md`](2026-11-20-relatorio.md).

As 17 perguntas que ficaram abertas nos PRs #39 e #40 já foram respondidas na rodada de 17/11/2026, em `docs/historico/qa/2026-11-17-perguntas.md`. Esta rodada não as reabre.

**Como responder.** Cada pergunta tem um número e opções com letra. A primeira opção é a recomendada. Basta responder "P1 A". O que ficar sem resposta continua como está.

## Resumo

São 2 perguntas: 0 que mudam a experiência, 1 de ajuste e 1 de detalhe.

| Tela | Perguntas | Muda a experiência | Ajuste | Detalhe |
| --- | --- | --- | --- | --- |
| Tema e capítulo | P1 e P2 | 0 | 1 | 1 |

A que mais pesa é a P1: sem ela, a lista de capítulos que rola por dentro do tema não aparece em prévia nenhuma.

## Tema e capítulo

### P1. O acervo de exemplo ganha um tema com muitos capítulos? **Ajuste**

A coluna do tema, no computador com mouse, deixa a lista de capítulos rolar por dentro quando ela passa da altura da janela. Lista curta não chega ao teto e não rola. No acervo de exemplo o tema Natal tem um capítulo (Natais), e os outros temas também são curtos. A lista que rola por dentro não aparece em nenhuma prévia.

- **A. Manter como está.** (Resposta do Gui.) Os dados de exemplo continuam como estão. A regra fica no código e a lista longa aparece quando um tema de verdade tiver capítulos suficientes.
- **B. Acrescentar capítulos de exemplo num tema só,** para a lista interna aparecer na prévia e na gestalt.

### P2. No celular, "Lista" desce uma linha no tema e no capítulo? **Detalhe**

No Explorar, as opções que não cabem rolam para o lado, e a opção cortada na borda mostra que há mais (P32, 17/11/2026). No tema e no capítulo, em 390 px, "Linha do tempo" e "Mural de fotos" ficam na primeira linha e "Lista" desce para a de baixo. Trocar de forma não muda o lugar do título nem das memórias.

- **A. Manter como está.** As três opções continuam à vista, com "Lista" na linha de baixo.
- **B. A linha rola para o lado,** como no Explorar, e "Lista" fica na mesma linha das outras.

**Resposta do Gui:** entra no item "Espaço igual entre os itens dos controles Forma de ver e Mural", que continua parado à espera da explicação dele. O código não muda.
