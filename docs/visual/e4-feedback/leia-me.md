# E4: a peça de feedback de estado, duas propostas

Exploração pedida no brief `docs/briefs/feedback-de-estado.md` (24/11/2026). A prévia `tst-feedback` traz as duas propostas funcionando nos fluxos do brief, com um simulador de rede para ver cada estado no celular. Nada aqui foi para a `homologa`. A escolha do Gui vira a sessão de aplicação.

## Como ver na prévia

Abra https://tst-feedback.memorias.bayara.com.br e toque na faixa de teste do alto. Ela ganhou duas linhas:

- **Proposta:** "A, na voz do álbum" e "B, o sinal". A escolha fica guardada no aparelho.
- **Simular a rede:** Normal, Lenta, Sem rede, Servidor fora, Recusa e Instável. Também fica guardada, então volte para "Normal" no fim.

A faixa fechada mostra o resumo ("Proposta B · rede lenta"). Os endereços com `?proposta=b&rede=lenta` fazem a mesma escolha de uma vez, e os da tabela do relatório já vêm assim.

O que cada rede faz:

| Rede | O que acontece |
| --- | --- |
| Lenta | Cada pedido espera uns 2,6 s antes de sair. A foto sobe em uns 6 s, contando. "Me mostre outra" demora o mesmo para abrir. |
| Sem rede | O pedido falha como falha sem rede, o aparelho diz que está fora do ar, e a foto que sobe cai no meio. Tocar "Normal" depois é a rede voltando. |
| Servidor fora | O servidor responde com a página de erro (502). |
| Recusa | O que grava é recusado com uma frase de rota inventada ("Você não pode mudar isso. Só quem criou pode."). |
| Instável | Lenta, e um de cada três envios cai no meio. É o caso da foto que falha no meio de dez. |

O simulador troca, no navegador, o `fetch`, o envio de arquivo e o "estou sem rede" do aparelho. O servidor não muda. Sem rede, ele também segura os links comuns, para mostrar como ficaria com a saída da pergunta 2; essa saída não está na prévia. O simulador só liga em `tst-feedback.memorias.bayara.com.br` e no computador, e não vai para a aplicação.

## As duas propostas

As duas usam a mesma peça no código e a mesma marcação: uma linha de estado com o sinal, o texto, o fio do progresso e "Tentar de novo". O que muda é o desenho e uma regra só, a da falha.

| | A. Na voz do álbum | B. Um sinal próprio |
| --- | --- | --- |
| A ideia | O estado é escrito. O ponto de cor que o site já usa e o texto em mono, como o carimbo do verso da foto. O progresso é um fio, como o da frase da nova memória | O anel. Ele gira quando demora, enche como um relógio quando envia, fecha com o tique quando dá certo, vira a seta quando dá para tentar de novo e fica tracejado sem rede. O texto é o apoio |
| Tocado | O controle marcado na hora: a pílula, a aba, a ordem já escrita no seletor, o coração, o botão dizendo o que faz ("Salvando…", "Respondendo…", "Sorteando…") | O mesmo, e o controle afunda um instante, como um carimbo |
| Esperando, curto | Nada além do tocado | Nada além do tocado |
| Esperando, longo (400 ms) | O ponto aparece ao lado do controle e respira devagar. No Explorar, a conta das memórias vira "Buscando as memórias…", na mesma linha e na mesma altura | O anel aparece ao lado do controle e gira. No Explorar, o anel entra antes de "Buscando as memórias…" |
| Enviando | "Enviando a foto 3 de 10", com o fio enchendo embaixo, e cada foto com "Na fila" ou "Enviando · 42%" | O anel de cada foto enche, e o resumo tem o anel do total |
| Deu certo | O resultado na tela. Uma frase curta só onde a mudança não se vê ("Rascunho salvo. Só você vê.", "10 fotos enviadas."), que sai em 4 s | Igual, com o anel fechado no tique |
| Falhou, dá para tentar | A marca volta ao que estava (o que está marcado é sempre o que está na tela), a frase por extenso e "Tentar de novo". Nada é tentado sem a pessoa | A escolha fica de pé, marcada, com o anel tracejado. O que é leve vai sozinho quando a rede volta, como o modo TV. "Tentar de novo" continua lá |
| Falhou, não dá | A frase da rota, e a marca volta | Igual |
| Sem rede, na página | Um bilhete pousado logo abaixo do topo, com a frase inteira | Uma cápsula com o anel tracejado e "Sem conexão" |

A regra da falha é a diferença que pesa. Na A, a pessoa sempre sabe que nada acontece sem ela; na B, ela não precisa voltar e tocar de novo quando a rede volta. Dá para combinar o desenho de uma com a regra da outra.

O que é "leve" (vai sozinho na B): as trocas do Explorar e da página da pessoa, reagir, a mensagem do relato, "Como você chama", a resposta ao pedido, as fotos e os áudios que sobem e "Me mostre outra". Pede a pessoa nas duas: salvar e publicar a memória, os formulários de trabalho e tudo o que falhou com o servidor fora.

### Detalhes que valem para as duas

- **Uma voz por página.** A região viva fica no esqueleto (`Visual.astro`, `data-voz`), antes de qualquer mudança. Saíram as regiões vivas da conta do Explorar, das reações (uma por memória), da lista e da linha da janela do relato, da linha de avisos da nova memória e da linha das fotos de "Acrescentar fotos". Ficaram as de telas fora do brief (ver "Custo").
- **Nenhum recado técnico.** "Failed to fetch", "Load failed" e o erro de JSON viram as frases da tabela abaixo. A resposta que não é JSON conta como servidor fora.
- **Ninguém sai do site por falha.** O Explorar, as reações, os formulários no lugar, a nova memória e o relato não caem mais no envio comum quando o pedido falha. O envio comum continua como reserva para quem está sem script.
- **Nada salta.** O sinal da espera longa fica ao lado do controle, fora da caixa dele. A linha de falha entra embaixo do controle e empurra o que vem depois: é o recado junto do formulário, como os de hoje. O aviso de rede da página fica por cima do começo da página, sem empurrar (pergunta 3).
- **Um segundo toque não manda de novo** em nenhum desses lugares, como já era.
- **Movimento reduzido:** o ponto não respira, o anel não gira e o controle não afunda. O anel parado mostra um quarto aceso.

## As fotos

Na nova memória (e em "Acrescentar fotos", que usa a mesma peça):

- As fotos escolhidas aparecem **na hora**, com a imagem do próprio aparelho, e sobem uma por vez.
- Logo abaixo de "Escolher fotos", a conta: "Enviando a foto 3 de 10", com o total andando.
- Dá para escrever as legendas e sair da etapa enquanto sobem. Fora da etapa, a linha de avisos acima dos botões diz "As fotos continuam subindo. Enviando a foto 3 de 10." Publicar espera as fotos, como hoje, e diz quanto falta.
- **Falha de uma no meio de dez:** as outras seguem. Na A, a foto fica com "A conexão caiu no meio do envio." e "Tentar de novo". Na B, ela volta sozinha para o fim da fila, uma vez; se cair de novo, fica com "Tentar de novo". No fim, "9 de 10 enviadas. Uma não foi." com "Tentar de novo" para todas.
- **Sem rede:** a fila para inteira, sem cada foto falhar uma por uma. Na A, "Tentar de novo" manda as que faltam; na B, elas voltam a subir quando a rede volta.

O mesmo vale para a foto e o áudio do relato, com "Enviando o áudio · 40%" na linha da janela.

## As frases

| Caso | Frase | Tentar de novo | Vai sozinho |
| --- | --- | --- | --- |
| Sem rede, na ação | "Sem conexão. Confira a internet e tente de novo." | Sim | Não |
| Sem rede, na ação leve, proposta B | "Sem conexão. Vai sozinho quando a internet voltar." | Sim | Sim |
| Sem rede, na página (A) | "Sem conexão. Você continua nesta página. Quando a internet voltar, toque de novo no que quiser fazer." | | |
| Sem rede, na página (B) | "Sem conexão" (a voz diz "Sem conexão. Você continua nesta página, e o que você fizer agora vai quando a internet voltar.") | | |
| A rede voltou | "A conexão voltou." (sai em 4 s) | | |
| Servidor fora | "O site não respondeu agora. Tente de novo daqui a pouco." | Sim | Não |
| Recusa da rota | A frase da própria rota | Não | Não |
| Recusa sem frase | "Não deu para fazer isso." | Não | Não |
| Envio que caiu no meio | "A conexão caiu no meio do envio." | Sim | Na B, uma vez |
| A mensagem do relato que não foi | "A mensagem não foi salva." e a frase do caso | Sim | Na B, sem rede |
| Formulário de trabalho sem rede | "Sem conexão. Confira a internet e tente de novo. O que você escreveu continua aqui." | Sim | Não |
| Espera longa no Explorar | "Buscando as memórias…" | | |
| Espera longa num formulário | O botão diz ("Salvando…"); depois de 3 s, a voz diz "Ainda salvando. Não precisa tocar de novo." | | |
| "Me mostre outra" | "Sorteando…" no botão; a voz diz "Sorteando outra memória…" | | |
| O texto guardado, ao voltar | "Isto não foi salvo da outra vez. Confira e salve." ("…e envie." no relato) | | |

Os gerúndios novos do botão: "Liberando…", "Respondendo…" (em "Manter como estava") e "Voltando…" (em "Voltar a…").

## Sem rede no site inteiro

- **Onde:** um lugar só, logo abaixo do topo. Ele aparece quando o aparelho avisa que caiu ou quando um pedido falha por falta de rede, e sai quando o aparelho avisa que voltou ou quando um pedido dá certo. A voz diz as duas coisas.
- **Formulários no lugar e trocas:** ficam onde estão, com a frase na ação (A) ou esperando a rede (B).
- **Formulários de trabalho:** com o aparelho dizendo que está sem rede, o envio não sai; a pessoa fica no formulário, com o que escreveu, e "Tentar de novo". Com o servidor fora, continua indo para a página de erro, como hoje (ver pergunta 2).
- **Links comuns:** levam à página de erro do navegador. É a pergunta 2.

### As saídas para o link sem rede, medidas

Medido no computador, com o Chromium, celular 390 × 844, processador 4 vezes mais lento, 4G lento e o servidor local, 9 navegações por página (`/pessoas/vo-bela` e `/memorias/2025-natal`), mediana.

| Saída | Custo medido | O que resolve | O que não resolve |
| --- | --- | --- | --- |
| Nada | Nenhum | | Toda falta de rede num link vira a página de erro do navegador, em inglês ou no português do Safari |
| Guarda dos links (sem service worker) | Umas 40 linhas no script que toda página já baixa. Nenhum pedido a mais | O aparelho que sabe que está sem rede (modo avião, Wi-Fi e dados desligados): o link não sai, e a página diz "Sem conexão" | A rede fraca (conectado sem passar dado), o servidor fora e o link aberto de fora do site |
| Service worker só de reserva, com navigation preload | Um arquivo de 950 bytes, baixado uma vez e conferido pelo navegador no máximo uma vez por dia, sem passar pelo servidor do site. O primeiro byte: de 162 a 177 ms sem ele, de 169 a 181 ms com ele, e 178 a 180 ms com ele frio (parado antes de cada navegação). O carregamento inteiro igual nos três, dentro do ruído | Toda navegação que falha mostra uma página do site em português ("Sem conexão. Esta página abre quando a internet voltar.") e abre sozinha quando a rede volta. Vale para a rede fraca, para o servidor fora (dá para mostrar outra frase) e para o link aberto de fora | Não guarda páginas: sem rede, nenhuma página nova abre, só o aviso |

Cuidados com o service worker: ele fica no aparelho até ser trocado, então um defeito nele dura até a próxima versão chegar; a saída é publicar uma versão que se desliga sozinha, e a aplicação precisa deixá-la pronta. Ele não guarda nenhuma página nem foto, para não mostrar nada velho nem guardar no aparelho o que é do acervo. O navigation preload é o que esconde a partida dele: sem preload, a medida não serve (o Chromium não aplica a rede lenta aos pedidos do próprio worker), então a versão sem preload ficou de fora. Não medido: o Safari do iPhone e um celular de verdade.

## Guardar o que foi escrito

- **"Como você chama" e os outros formulários no lugar:** na falha, o que estava nos campos fica guardado na aba. Se a pessoa sair e voltar à página nesta aba, o campo volta preenchido, o bloco abre e a linha diz "Isto não foi salvo da outra vez. Confira e salve." Dá certo, e o guardado sai.
- **O relato:** o que está na caixa é guardado na aba a cada letra, e as mensagens que não foram salvas também, juntas. Ao voltar, elas aparecem na caixa com "Isto não foi salvo da outra vez. Confira e envie." Na conversa, a mensagem que não foi salva fica com um contorno tracejado até ir.
- **A nova memória** já guardava o título, o lugar e o relato no aparelho, e continua.

## O módulo

`src/lib/cliente/estado.ts`, uma peça só para o site:

```ts
// Os oito estados e a falha em português
type Estado = 'tocado' | 'esperando' | 'demorando' | 'enviando' | 'feito' | 'falhou' | 'recusado' | 'sem-rede';
class Falha extends Error { tipo: 'sem-rede' | 'servidor' | 'recusa'; frase: string }
const FRASES: { semRede, semRedeTente, semRedeEspera, servidor, recusa, caiuNoMeio, voltou, … };

// Pedidos que só devolvem resposta boa; toda falha sai como Falha
pedir(endereco, init): Promise<Response>;
pedirJson<T>(endereco, init): Promise<T>;
enviarArquivo<T>(endereco, corpo, aoAndar: (fracao) => void): Promise<T>; // conta o que subiu

// A voz: a região viva da página, uma só (data-voz, no esqueleto)
dizer(texto): void;

// A linha de estado de um lugar (a conta do Explorar, a linha de avisos, a foto)
linhaDe(el): Linha;        // mostrar(estado, texto, { andou, tentar }), limpar()
linhaDepois(el): Linha;    // uma linha nova logo depois de um elemento

// A ação: tocado na hora, demorando depois de 400 ms, feito ou a falha certa
agir({ linha, controle, marcar, fazer, tocado, demorando, feito, dizerFeito, leve, vale, aoFalhar }): Promise<T | undefined>;

// A fila dos envios: um por vez, "Enviando a foto 3 de 10", a falha no meio sem segurar as outras
criarFila(resumo, nome, aoMudar): { por(envio), ocupada(), resumo() };

// A rede da página
ligarRede(); semRede(); redeVoltou(); quandoVoltar(fazer); aparelhoSemRede();
ligarLinksQueEsperam(); // o link com data-espera ("Me mostre outra")
```

Quem usa: `explorar-troca.ts` (com `marcarOpcao`, o tocado das pílulas, abas e ordem), `no-lugar.ts`, `reacoes.ts`, `enviando.ts`, `fotos.ts` (`enviarFotoComProgresso`, `filaDeFotos`, `porNaFila`), `conversa.ts` e `nova.astro`. O desenho fica em `src/visual/estado.css`; na aplicação, só a proposta escolhida, sem o `data-proposta`.

## O custo de aplicar

O que muda é o mesmo nas duas; a B tem um pouco mais de CSS (o anel em sete estados) e a regra de ir sozinho, que pede mais testes.

| | A | B |
| --- | --- | --- |
| Arquivos novos | `estado.ts` (umas 430 linhas sem o simulador) e `estado.css` (umas 120) | Os mesmos, `estado.css` com umas 160 |
| Arquivos que mudam | `explorar-troca.ts`, `no-lugar.ts`, `reacoes.ts`, `enviando.ts`, `fotos.ts`, `conversa.ts`, `nova.astro`, `memorias/[id]/fotos.astro`, `Janela.astro`, `Reacoes.astro`, `Palco.astro` (o `data-espera`), `explorar.astro` (a conta sem `aria-live`) e `Visual.astro` (a voz, o lugar da rede e o script) | Os mesmos |
| Testes que mudam | Os que travavam a reserva do envio comum na falha: `explorar-troca`, `no-lugar`, `reacoes`, um de `visual` e um de `revisao-z2` (já mudados na prévia) | Os mesmos |
| Testes novos | `estado.test.ts`: as frases de cada falha, `agir` com relógio falso (nada antes de 400 ms, o sinal depois), a volta da marca e a fila (conta, falha no meio, sem rede parando tudo). Uma guarda: nenhum `e.message` vai para a tela nos scripts do cliente, e uma região viva por página nas telas do brief | Os mesmos, e a ida sozinha quando a rede volta (uma vez, e nada quando a pessoa já tocou em outra coisa) |
| Telas para conferir | Explorar, pessoa, memória, Início, Sua conta, nova memória, relato, "Acrescentar fotos", um formulário de trabalho, nas três larguras | As mesmas |
| Fica para depois | As regiões vivas fora do brief (a conta da galeria da memória, a ficha da árvore e do círculo, a frase dos apelidos, o retrato, a cópia na Administração e o aviso do modo TV) e os outros envios por script (a transcrição já ganhou as frases) | Igual |

**Onde cruza com as outras sessões:**

- **E1 (o palco do modo TV):** o modo TV continua com o aviso dele ("Sem conexão. Tentando de novo…"), que já faz o que a B propõe. Na aplicação, ele passa a usar a falha e as frases do módulo, e o "Me mostre outra" leva o `data-espera`. Se a E1 refizer o palco, é só manter esse atributo no botão.
- **E2 (a lupa no topo):** o lugar do aviso de rede mora dentro do topo, pousado embaixo dele. A lupa entra no topo sem mexer nele. A busca usa `pedir` e `agir`, com a espera longa na região do resultado.
- **D2 (o Explorar no próprio celular):** a maior parte das esperas do Explorar some, e com elas o "Buscando as memórias…". Fica o tocado (`marcarOpcao`), que a D2 aproveita, e a falha de quando o servidor de reserva é chamado.

**Sugestão de ordem:**

1. **Logo, antes da D2:** o módulo sem a fila, a voz, a rede da página, o tocado do Explorar e os formulários no lugar, reações, nova memória e relato sem sair do site e sem recado técnico, e o formulário de trabalho que não sai sem rede. É o mínimo que o brief de desempenho já decidiu, e o que mais protege a família na festa.
2. **Junto:** a fila das fotos com quanto falta, e guardar o que foi escrito.
3. **A resposta da pergunta 2** (service worker ou guarda dos links), que é pequena e independente.
4. **Junto da D2:** tirar as esperas do Explorar que a lista leve resolve, mantendo o tocado e a falha do servidor de reserva.
5. **Junto da E1:** o modo TV com as frases do módulo.

## O que foi conferido

- Os estados de cada fluxo do brief nas duas propostas, pelo simulador, no servidor local com o acervo de exemplo. As capturas estão nesta pasta: `<cena>-<proposta>-<largura>.png`, em 390 × 844 para todas, em 1280 × 720 e 1920 × 1080 para oito, e em 390 com movimento reduzido para quatro (`-calmo`).
- Pelo teclado, no Explorar sem rede: Enter na pílula; o foco fica na pílula, a voz diz a falha, e "Tentar de novo" é alcançável. Na conta do Explorar, ele vem antes das pílulas na ordem do teclado (Shift+Tab a partir da pílula), porque a conta vem antes na página.
- Pela árvore de acessibilidade: a linha de estado é um parágrafo com o texto e o botão "Tentar de novo"; o sinal é escondido do leitor de tela. O Explorar fica com uma região viva só, a voz.
- `npm test`, `npm run build` e a gestalt local (669 títulos) passaram antes do push.

**O que fugiu da regra do brief:** cinco testes que travavam o comportamento antigo (a falha cair no envio comum, as regiões vivas antigas) foram mudados para a prévia passar no build. Eles mudam de novo na aplicação, junto com a proposta escolhida.

**Para o Gui conferir:** o VoiceOver no iPhone (a voz diz cada estado uma vez, e o "Você marcou Coração." continua), o Safari do iPhone com o simulador (o anel girando, o bilhete do alto e a banda do Safari, que não deve aparecer porque nada fica preso) e o celular de verdade em rede lenta.
