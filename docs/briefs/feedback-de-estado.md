# A peça de feedback de estado (exploração E4)

Situação: escrito no chat e aprovado pelo Gui em 24/11/2026. A exploração foi feita em 25/11/2026: as duas propostas estão na prévia `tst-feedback`, e o relato, as frases, a medida das saídas sem rede e o custo de aplicar estão em `docs/visual/e4-feedback/leia-me.md` (só na branch `tst-feedback`). Espera a escolha do Gui. Vira a sessão de exploração E4: duas propostas numa prévia `tst-feedback`, e a sessão para até o Gui escolher. Prazo: antes de 10/12/2026. Se o prazo apertar, vale "O mínimo, se o prazo apertar", no fim.

## De onde vem

A medição M1 (`docs/desempenho/2026-11-22-medicao.md`) inventariou cada espera do site, na seção 4, e listou na seção 5 o que uma peça de feedback de estado precisa cobrir, sem desenhá-la. O brief de desempenho (`docs/briefs/desempenho.md`, "A ordem") pôs junto desta peça duas coisas decididas pelo Gui em 23/11/2026: o controle tocado marcado na hora e a pessoa fora da página de erro do navegador quando a rede cai, com recado em português. Ler antes de começar:

- M1, seções 4 e 5, inteiras.
- `docs/decisoes.md`, "Interação dos formulários": "Estados dos componentes", "Sem recarregar", "Recado sem formulário vai para o alto" e "O foco quando a própria região some".
- `docs/visual.md`, o modo TV sem rede ("Sem conexão. Tentando de novo…"), que já funciona e serve de referência, e a direção visual inteira.
- `docs/briefs/desempenho.md`, decisão 2 (o Explorar respondendo no próprio celular, que a D2 constrói).
- O código de hoje: `src/lib/cliente/enviando.ts`, `src/lib/cliente/no-lugar.ts`, o envio de fotos da nova memória e o envio do relato.

## O problema

Hoje cada parte do site avisa do seu jeito, e várias não avisam. As trocas do Explorar e da página da pessoa, o "Me mostre outra" e a passagem do modo TV que ainda não estava pronta esperam sem dizer nada. Os formulários que trocam no lugar travam os botões sem dizer "Salvando…". Sem rede, quase tudo cai no envio comum e leva a pessoa à página de erro do navegador. A nova memória, o relato e o envio de foto e de áudio mostram recado técnico em inglês ("Failed to fetch", "Load failed", erro de JSON). Dez fotos levam perto de um minuto no 4G lento só com "Enviando…" no lugar de cada uma, sem conta de quantas faltam, e o leitor de tela não sabe quando termina nem quando falha.

A família inclui gente com pouca familiaridade com sites, usando o celular no 4G, numa festa. Para essa pessoa, uma tela parada é uma tela quebrada, e a página de erro do navegador é o fim da visita.

## Os objetivos

**De uso.** Em toda ação, a pessoa vê no primeiro instante que o toque foi ouvido e, quando a resposta demora, sabe que algo está acontecendo até o fim. Quando falha, ela continua no site, com o que escreveu, e entende em português o que aconteceu e o que fazer.

**Visual.** Os estados falam a língua do álbum (`docs/visual.md`), quietos, sem esmaecer a tela nem segurar a rolagem. A espera curta não aparece. Uma peça só no código e no desenho, para o site inteiro avisar do mesmo jeito.

## O que já está decidido e não se reabre

- **Os oito estados e as regras da seção 5 da M1** são o requisito: tocado, esperando curto, esperando longo, enviando com progresso, deu certo, falhou dando para tentar de novo, falhou sem dar, sem rede. E as regras para todas as ações: uma região viva por página, que já existe antes da mudança; nenhum recado técnico na tela; falha de rede nunca leva para fora do site; o que a pessoa escreveu nunca se perde; com movimento reduzido, sem animação; um segundo toque durante a espera não manda de novo.
- **O envio comum fica como reserva para quem está sem script.** Quem perdeu a rede continua no site.
- **Recado sem formulário vai para a faixa do alto** (Gui, 22/11/2026), e o recado no alto pode ficar fora da tela no celular quando o cartão estava lá embaixo (Gui, 22/11/2026).
- **Nada preso na borda da tela fora do modelo `pino-novo`** (a banda do Safari no iPhone).
- **O Explorar vai responder no próprio celular** (decisão 2 do brief de desempenho, construída na D2). A exploração não desenha esperas longas para o Explorar que a D2 vai tirar: desenha o tocado dele e o que acontece quando o servidor, que fica de reserva, demora ou falha.
- **O que vem antes e muda as mesmas telas:** a aplicação de E1 refaz o palco do modo TV, e a aplicação de E2 põe a lupa no topo. A peça precisa caber nos dois sem ser redesenhada.
- Os textos falam com quem usa, em frases simples, com aspas curvas.

## O que a exploração decide

1. **O tocado.** Como cada tipo de controle (pílula, aba, seletor, ficha de filtro, botão, coração) fica marcado no mesmo instante, antes de qualquer resposta. E o que acontece com a marca quando a resposta falha: volta ao estado de antes, ou fica com o recado.
2. **O esperando longo.** O sinal quieto no lugar que vai mudar, a partir de quanto tempo (a M1 sugere uns 400 ms), sem esmaecer e sem segurar a rolagem. Como ele termina.
3. **Enviando, com progresso.** Fotos e áudios: quanto falta e quantos faltam ("Enviando a foto 3 de 10"), o que a pessoa pode fazer enquanto sobe (seguir preenchendo, sair da etapa) e como a falha de uma foto no meio de dez aparece.
4. **Deu certo.** Quando basta o resultado na tela e quando vale uma frase curta, e onde ela fica.
5. **As frases.** Uma tabela com a frase de cada caso: sem rede, servidor fora, recusa da rota (que já traz a própria frase), envio que falhou. Quando é "Tentar de novo" e quando o site tenta sozinho, como o modo TV.
6. **Sem rede no site inteiro.** Onde o estado aparece (um lugar só da página), como começa e como termina, e o que acontece com o que a pessoa toca enquanto dura: formulários, trocas no lugar e links para outra página. Link comum sem rede leva à página de erro do navegador; evitar isso pede um service worker ou outra saída. A sessão mede o custo e o ganho de cada saída pela regra "nada consome recurso sem critério" e traz como pergunta ao Gui (resposta dele de 24/11/2026). Nada disso entra na prévia antes da resposta.
7. **Guardar o que foi escrito.** O relato e "Como você chama" passam a guardar na aba, como a nova memória já faz. A exploração diz como a pessoa encontra o texto guardado ao voltar.
8. **Uma peça só no código.** O esboço da interface do módulo que toda ação usa (o que recebe, os estados, a região viva), no lugar dos avisos espalhados de hoje em `enviando.ts`, `no-lugar.ts`, no envio de fotos e no relato. A exploração propõe; a aplicação constrói.

## As duas propostas

Duas direções com premissas diferentes, para o Gui escolher entre caminhos distintos. Sugestão de partida, aceita pelo Gui em 24/11/2026; a sessão pode trocar por duas mais distintas, explicando o porquê:

- **A. Na voz do álbum.** Os estados são escritos: a tipografia do site, a linha de avisos, os pontos de cor que já existem. Quase nenhuma forma nova; a peça é sobretudo texto e marcação.
- **B. Um sinal próprio.** Uma peça visual reconhecível, a mesma em todo lugar do site, que a pessoa aprende uma vez (uma forma, uma marca, um movimento discreto), com o texto como apoio.

As duas cobrem os oito estados nos mesmos fluxos, e as duas resolvem a falta de rede e o progresso do envio, porque são o mesmo problema nas duas.

## Onde mostrar na prévia

- Explorar: tocar numa família, trocar a forma de ver, a ordem, um filtro, o voltar do navegador.
- "Me mostre outra".
- Reagir numa memória.
- "Como você chama", na página da pessoa, e a resposta a um pedido para liberar, no Início.
- Nova memória: salvar rascunho, publicar e enviar dez fotos.
- O relato: mandar mensagem, áudio e foto.
- Um formulário de trabalho comum (editar pessoa).
- O modo TV sem rede, só se a proposta mudar a aparência dele.

**Simular a rede.** A prévia ganha um jeito de simular rede lenta, sem rede, servidor fora e recusa, ligado só na `tst-feedback`, para o Gui ver cada estado no próprio celular sem desligar o Wi-Fi. O simulador fica fora da aplicação.

## Limites da sessão

- Só a prévia `tst-feedback`, nascida da `homologa`, com o acervo de exemplo. Sem PR para a `homologa`.
- Sem migração nova. As rotas do servidor só mudam no que for preciso para simular.
- Não antecipa a D2: nada de lista leve nem de Explorar respondendo no celular.
- Não muda quem vê o quê, textos que o Gui escreveu nem a ordem das telas.
- Confere com movimento reduzido, pelo teclado e pela árvore de acessibilidade do navegador (o VoiceOver fica para o Gui, na lista do relatório).

## O que a sessão entrega

- As duas propostas na prévia, com capturas de cada estado em 390 × 844, 1280 × 720 e 1920 × 1080, e com movimento reduzido.
- Para cada proposta: o tocado, as esperas, o progresso, o deu certo, a tabela das frases, a falta de rede e o esboço do módulo.
- O que custa aplicar cada uma: arquivos, testes e telas que mudam, e onde a aplicação cruza com as de E1 e E2 e com a D2. Uma sugestão de ordem: o que entra logo e o que entra junto da D2.
- As perguntas que sobrarem, poucas por vez.
- A tabela "O quê | Onde ver", com o endereço completo de cada estado na prévia.
- E para. A escolha vira sessão de aplicação.

## O mínimo, se o prazo apertar

Se o prazo de 10/12 apertar, cai primeiro esta exploração, e fica só o que o brief de desempenho já decidiu: o controle tocado marcado na hora e a falta de rede com recado em português, sem a pessoa ir para a página de erro do navegador. Essas duas coisas entram de todo jeito antes do Natal.
