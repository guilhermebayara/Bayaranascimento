# Ver junto no Natal (exploração E1)

Situação: escrito no chat e aprovado pelo Gui em 22/11/2026. Vira a sessão de exploração E1: duas propostas numa prévia `tst-ver-junto`, e a sessão para até o Gui escolher. Prazo: antes de 10/12/2026.

## De onde vem

As críticas de design C1 e C2 de 22/11/2026 e as respostas do Gui no item "Críticas de design C1 e C2 dos fluxos de quem recebe o presente", em `docs/decisoes.md`, "Decidido, a construir". Os relatórios estão em `docs/critica/` (cópia dos que nasceram nas branches `critica-2026-11-22` e `critica-2-2026-11-22`). Ler antes de começar:

- C2, fluxo 1, "O ponto do dia 25", e fluxo 2, "O modo TV no celular deitado".
- C1, fluxo 2, "Como a TV chega à sala" e "Na TV, a voz não toca", e o item 1 de "À parte".

## O problema

O dia 25 é coletivo, e o site só tem entradas individuais. Hoje:

- A carta conta como vista na primeira página aberta, no aparelho de quem abre (`chegarAoPainel`). Quem abre no celular à mesa gasta a carta ali, sozinho.
- Quem leva o site à TV cai no próprio Início, que diz "Só você vê esta página", com os avisos e rascunhos dele.
- O caminho até a TV passa pelo Explorar ("Modo TV", que começa pela memória mais recente) ou por Capítulos, Natais, "Passar no modo TV".
- O celular espelhado na TV fica deitado. Em 844 × 390 cabem o título e metade da foto, e os controles ficam abaixo, numa página que rola. Está conforme a regra (abaixo de 62rem vale o modo TV empilhado), e a regra não previu esse uso.
- Na TV, a voz não toca. O que mais emociona na sala é ouvir quem contou.

## Os objetivos

**De uso.** Na sala, no dia 25, o Gui, a Giovanna ou o Magno levam o acervo à TV em poucos toques, a partir do aparelho que estiver à mão. A sala vê a carta, os Natais da família e as memórias de quem está ali, sem passar pela página íntima de ninguém. Quem segura o controle, o teclado ou o celular passa as memórias sem aprender nada novo.

**Visual.** O modo TV com a barra (sessão X, em `docs/visual.md`, "O modo TV") é a referência que já funciona: uma memória por vez, grande, para ver junto; símbolos de TV com nome; nada rola. A carta é a tela mais forte do site (C2), e na tela grande ela continua sendo a carta assinada à mão. O modo TV é o lugar de experimentar no movimento (`docs/visual.md`, "Movimento"), e o dia é de festa.

**O aparelho da sala** (resposta do Gui, 22/11/2026): um computador no cabo HDMI ou um celular espelhado (AirPlay, Chromecast), os dois. O navegador da própria TV fica de fora, porque o login do Access com o controle remoto é penoso.

## O que já está decidido e não se reabre

- O modo TV com a barra, a partir de 62rem, como está. A exploração usa e estende, sem trocar o que existe.
- Quem vê o quê: o modo TV só mostra o que a pessoa logada vê; rascunho nunca aparece; relato que espera nunca aparece, nem o áudio dele.
- A carta é uma por pessoa, com a saudação no nome dela, escrita em `/admin/carta`. Aparece sozinha na primeira ida e depois fica em `/carta`.
- **Na sala, só o que é aberto a toda a família** (resposta do Gui, 22/11/2026). No "ver junto", entram só as memórias abertas a todos, seja qual for o login: nada restrito a uma ou mais famílias vai para a TV, mesmo que quem logou veja. Dentro delas, valem as regras de sempre (relato que espera, rascunho). As contagens da sala contam só o que entra.
- O login do dia 25 é assistido: os três fazem o primeiro login no celular de cada pessoa, com o ícone na tela inicial. A página do Access em português é configuração à parte, sem código.
- "Neste dia" no Natal, de 24 a 26 de dezembro, mostra as memórias de 24 e de 25 de dezembro de todos os anos. Vai na sessão AA.
- As fundações de `docs/visual.md`, a rolagem do aparelho, a gestalt e o modelo `pino-novo` para qualquer peça parada (a banda do Safari).

## O que a exploração decide

1. **A porta.** Onde o "ver junto" começa (a carta, o Início nos dias do Natal, o menu, o capítulo dos Natais) e por quanto tempo ela existe (o dia 25, os dias do Natal, um interruptor dos administradores).
2. **A sequência.** O que a sala vê e em que ordem (a carta, os Natais, as memórias de quem está ali, ao acaso), e quem escolhe.
3. **A carta na tela grande.** Como ela aparece para a sala. A carta é por pessoa: na sala, ela é de quem? Uma versão para a família inteira, sem a saudação de uma pessoa, é uma saída possível; o texto é do Gui. E se ver a carta junto conta como a primeira vez de alguém.
4. **A janela deitada.** O modo TV em 844 × 390, e em toda janela mais larga que alta abaixo de 62rem, sem rolar e com os controles à vista.
5. **O áudio dos relatos.** O áudio do trecho na vez da memória, o controle de som e o que acontece com "Passar sozinho" enquanto alguém fala. Os navegadores só tocam som depois de um gesto da pessoa: a proposta diz qual é esse gesto.
6. **Quem está na sala.** Se dá para escolher as pessoas presentes e ver as memórias delas, sem virar formulário.
7. **Como a regra da sala aparece.** O que entra está decidido (ver abaixo); a exploração decide como a sala sabe disso, se é que precisa saber, e o que acontece quando quem logou toca numa memória restrita fora do "ver junto".
8. **Quem abre sozinho, longe da festa.** O que essa pessoa vê da porta nova.

## As duas propostas

Duas direções com premissas diferentes, para o Gui escolher entre caminhos e não entre variações. Sugestão de partida; a sessão pode trocar por duas mais distintas, explicando o porquê:

- **A. Um modo da sala.** Uma entrada própria, que começa pela carta em tela grande e segue numa sequência pronta, usando o palco do modo TV.
- **B. O modo TV como porta.** Nenhum modo novo: o modo TV ganha a carta como primeira tela, entradas diretas nos dias do Natal e a composição deitada.

As duas resolvem a janela deitada e o áudio, porque são o mesmo problema nas duas.

## Limites da sessão

- Só a prévia `tst-ver-junto`, nascida da `homologa`, com o acervo de exemplo. Sem PR para a `homologa`.
- Sem migração nova: a prévia divide o banco com as outras de teste, e os números de migração seguem a `homologa` (a 109 já é do #163). O que precisar ser guardado fica simulado na prévia e descrito no relatório para a aplicação.
- Dados de exemplo são decisão do Gui. Se faltar caso (um áudio num Natal, por exemplo), a sessão acrescenta numa função própria da semente, marcada como da exploração, e diz no relatório.
- `npm run tv` continua passando nas janelas de hoje, e as janelas deitadas entram na conferência.
- Nada restrito a uma ou mais famílias chega à sala, nem como contagem, foto ou trecho, desde a prévia.
- A aplicação que sair daqui decide o que aparece na sala, então tem revisão contra lista fechada, de outro modelo.

## O que a sessão entrega

- As duas propostas na prévia, com as capturas em 390 × 844, 844 × 390, 1280 × 720 e 1920 × 1080, e com movimento reduzido.
- Para cada proposta: a porta, a sequência, a carta, a janela deitada, o áudio e o que custa aplicar (telas, regras e testes que mudam).
- As perguntas que sobrarem, poucas por vez.
- A tabela "O quê | Onde ver", com o endereço completo de cada tela na prévia.
- E para. A escolha vira sessão de aplicação; se a proposta escolhida for grande, ela pode passar antes por uma crítica (`claude/critica-design.md`, no Projeto).


## A escolha do Gui (22/11/2026, depois da exploração)

A exploração está na branch `tst-ver-junto` (relatório em `docs/visual/exploracao-e1/leia-me.md`, commit `76ebeb0`). O Gui escolheu a **proposta B, o modo TV como porta**, com estas mudanças. É isto que a sessão de aplicação constrói:

- **Fora do Natal, o modo TV segue os filtros de onde foi aberto.** Aberto da linha do tempo sem filtro, mostra tudo o que a pessoa vê; filtrado por uma família, só aquela família; o mesmo para os outros filtros e para as páginas que abrem o modo TV (capítulo, tema, pessoa). A regra da prévia da B, de mostrar só o aberto a toda a família o ano todo, sai.
- **No Natal, a porta "A carta e os Natais" mostra tudo o que é aberto a toda a família**, sem escolher quem está na sala. O que é restrito a uma ou mais famílias não aparece na TV da sala (decisão de 22/11 mantida, confirmada depois da exploração). Escolher as pessoas da sala, da proposta A, fica de fora: no Natal é a família toda, e no resto do ano os filtros dão conta.
- **A carta é a da proposta A:** "Oi, família,", um parágrafo por vez, no tamanho de capa, com as assinaturas à mão, sem contar como a primeira vez de ninguém.
- **Das duas propostas, ficam:** o modo TV no celular deitado (abaixo de 62rem, a janela mais larga que alta usa a barra e não rola) e a voz de quem contou, com o botão de som na barra e "Passar sozinho" esperando a voz terminar.
- **Decidido pelo chat, pela recomendação das sessões** (o Gui pode trocar): a porta aparece no Início de 24 a 26 de dezembro; o som começa desligado e liga no símbolo do som, como na B. Se a aplicação achar um gesto mais óbvio para ligar o som logo na primeira tela, ela propõe.
- A aplicação usa a peça de feedback de estado do sistema (carregando, pronto, falhou), que entra antes dela, e tem revisão contra lista fechada de outro modelo (a E1 foi construída no Opus).

### Respostas do Gui de 24/11/2026, ao preparar a aplicação

- **O cartão "Na TV da sala" do Início segue inteiro a regra da sala.** As duas entradas, "A carta e os Natais" e "Todas as memórias", mostram só o que é aberto a toda a família, seja qual for o login. "Todas as memórias" é o modo TV com todas as memórias abertas a todos, e não o modo TV sem filtro de quem logou.
- **A memória de exemplo "Ceia só nossa, no apartamento novo" fica** (24/12/2024, restrita à família Bayara Bracarense, com a Giovanna, o Lucas Magno e o Chico). Vira exemplo permanente da regra da sala na semente das prévias: aparece no Explorar da Giovanna e nunca na sala.
- **Junto da aplicação vão a causa 6 e o LCP da pilha de fotos da memória** (`docs/briefs/desempenho.md` e a D1c): o modo TV lê uma memória só por passagem, e a foto que é o LCP da memória deixa de esperar a principal.
