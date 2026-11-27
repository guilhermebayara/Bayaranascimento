# Desempenho antes do Natal

Situação: escrito no chat em 23/11/2026, com as respostas do Gui à medição M1. O relatório inteiro está em `docs/desempenho/2026-11-22-medicao.md` (cópia do que nasceu na branch `tst-desempenho`, onde ficam os números em `docs/desempenho/dados/` e os scripts em `scripts/desempenho/`, inclusive o acervo cheio só no computador e a regra 12 da guarda). As causas citadas aqui pelo número são as da seção 3 do relatório.

## O problema, em poucas linhas

No celular da família, no 4G, o site é lento hoje e fica bem mais lento com o acervo cheio (umas 600 memórias). As páginas vão ao banco dezenas de vezes, muitas em fila; as fotos vão inteiras para todo lugar; a linha do tempo carrega o acervo inteiro e cada toque no Explorar baixa a página inteira de novo; e cada página lê o acervo inteiro do banco. Várias esperas não mostram nada, e quando a rede cai a pessoa vai parar na página de erro do navegador.

## O que o Gui decidiu (23/11/2026)

1. **A conta continua no plano gratuito do Cloudflare.** Por isso, antes do Natal, é obrigatório caber nos limites dele com folga, no dia 25, com 7 pessoas e o modo TV passando na sala:
   - 5 milhões de linhas lidas do D1 por dia. Hoje, com o acervo cheio, o dia 25 leria uns 5,6 milhões só com as 7 pessoas, e uma hora de modo TV mais 11 milhões. Passando do limite, o banco recusa consultas até as 21h e o site para.
   - 50 consultas ao D1 por pedido (hoje há páginas com 85) e 10 ms de processador por pedido. A M1 viu as páginas funcionando na prévia acima desses números; a sessão de correção confere na documentação e no painel (só leitura) se esses limites valem na conta e, valendo ou não, deixa toda página abaixo deles.
   - Obrigatórias por isso: a causa 1 (ler uma vez por pedido o que hoje é lido várias vezes, e o esqueleto sem a fila própria), a causa 4 (a linha do tempo sem ler e desenhar o acervo inteiro) e a causa 6 (o modo TV lendo uma memória só por passagem). Fica junto uma conferência que estima as linhas lidas num dia de Natal com o acervo cheio e falha se passar de 3 milhões.
2. **O Explorar responde ao toque no próprio celular** (a opção A da pergunta 2, que muda a regra "a linha do tempo carrega todas as memórias de uma vez"). Já: o controle tocado fica marcado na hora. Depois: a página traz uma lista leve das memórias que a pessoa vê, e o celular filtra, ordena, troca a forma de ver, troca a família e sorteia o "Me mostre outra"; a linha do tempo é desenhada a partir dessa lista, em partes, enquanto a pessoa rola. O servidor continua de reserva para o endereço, o voltar do navegador e quem está sem script, e tudo continua no endereço como hoje. A lista leve só leva o que a pessoa vê (a mesma regra de quem vê o quê de hoje), e por isso a aplicação tem revisão contra lista fechada de outro modelo.
3. **As fotos ficam guardadas no aparelho por 7 dias** (pergunta 3). O navegador deixa de perguntar ao servidor a cada vez que a foto aparece. Consequência aceita pelo Gui: quem perder o acesso a uma memória ainda vê, só no aparelho dele e até o prazo vencer, as fotos que já tinha aberto. Vale para fotos e retratos. Os áudios ficam como hoje até o Gui decidir: se a sessão achar o mesmo ganho neles, traz a pergunta. Rascunho e lixeira seguem as regras de hoje.
4. **O celular faz duas cópias menores no envio** (pergunta 4), além da foto guardada, e um ajuste na Administração faz as cópias das fotos que já existem. Sem custo; o espaço cresce uns 15%. As telas usam a cópia do tamanho certo (`srcset` e `sizes`), e a foto principal da memória ganha prioridade alta.

## A ordem, combinada com o resto da fila

- **Junto da peça de feedback de estado:** marcar na hora o controle tocado (pergunta 2, primeira parte) e tirar a pessoa da página de erro do navegador quando a rede cai, com recado em português.
- **Sessão D1, logo depois da AA, em paralelo com o conceito da peça:** causa 1 (as leituras repetidas e a fila do esqueleto, abaixo de 50 consultas por pedido), causa 3 (as fotos guardadas por 7 dias e a conferência de permissão mais barata), causa 2 com a decisão 4 (as cópias menores e o `srcset`) e causa 7 (o `preload` das fontes da primeira tela). Mexe no servidor e nas fotos, e quase nada nas telas, então não cruza com as aplicações. Revisão de outro modelo na parte das fotos guardadas e da permissão.
- **Na aplicação de E1:** a causa 6, porque a aplicação já refaz o palco do modo TV.
- **Sessão D2, depois da aplicação de E2:** a decisão 2 inteira (a lista leve, o celular respondendo, a linha do tempo em partes) e a causa 5, porque a E2 muda o alto do Explorar e a busca usa a mesma lista. Com revisão de outro modelo.
- Sem pressa: a causa 9.

## Medida de pronto

No celular, no 4G lento, com o acervo cheio: tocar num controle do Explorar muda a tela em menos de 100 ms, e o INP fica abaixo de 200 ms; nenhuma página passa de 50 consultas ao D1; a conferência das linhas do dia de Natal fica abaixo de 3 milhões; e a foto principal da memória aparece bem antes dos 9,6 s de hoje (a sessão diz o número). Para a memória, vale o tempo da foto principal, e não o LCP (resposta do Gui, 25/11/2026): as fotos de trás da pilha giram mais que a principal, então o navegador mede uma delas como o maior elemento, e elas chegam depois de propósito, para não disputar a rede com a principal.

## O que já está no site

- **D1a a D1f** (23 e 24/11/2026): a causa 1 (a guarda por pedido, com os gatilhos que gravam; o começo do pedido num lote só; as páginas e o esqueleto sem fila; o posicionamento inteligente e o Server-Timing), a causa 3a, a causa 7 e a anterior e a seguinte da memória por consulta própria; as duas cópias menores das fotos e a cópia pequena dos retratos, com o ajuste da Administração para as de antes e a reserva antes de gravar no bucket; as fotos, os retratos e os áudios guardados no aparelho por 7 dias; o marcador do "Ver como" nos endereços; a cópia do acervo em partes, de um instante só, e a cópia só da família para o espelho. As regras estão em `docs/regras/infraestrutura.md`, `docs/regras/site.md` ("Desempenho do servidor") e `docs/copia-no-drive.md`.
- **A causa 6 e o LCP da pilha**, na aplicação da E1 (AB a AB4, 25/11/2026): o modo TV lê uma memória só por passagem. As regras estão em `docs/regras/explorar.md`, "Modo TV".
- **Os números da MEM-6**, com o acervo cheio (26/11/2026): nenhuma rota conferida passa de 50 consultas; o dia 25 (`estimar-natal.mjs`) ficou em 3.466.868 linhas na carga padrão da série AD (antes: 4.227.876) e em 4.822.218 com `--fotos=exemplo` (antes: 5.585.396). As duas cargas ainda passam de 3 milhões. A MEM-7 identificou a diferença entre as cargas; os dois medidores dão o mesmo total no mesmo acervo. Na rodada original (`9e76667`), as oito páginas medidas ficaram abaixo de 10 ms na estimativa de CPU sem banco local da M2. A repetição adicional da MEM-7 não revalidou essa margem, com variação também na própria base; o relatório preserva as amostras das duas rodadas. O Explorar e a busca permanecem para a D2; as amostras e os limites do método estão no relatório.
- **MEM-6, D3 e causa 9** (26/11/2026): contagens e escolhas no banco nas páginas do escopo, preparo em lote e marca do conserto dos relatos. O [relatório da MEM-6](../desempenho/2026-11-26-mem6.md) registra as medições e o gabarito.
- **Falta:** a D2 (a decisão 2 inteira e a causa 5, depois da aplicação de E2), para baixar as leituras que permanecem no dia 25.

O relato de cada sessão, com os números de antes e depois, está em [`historico/briefs/desempenho-feito.md`](../historico/briefs/desempenho-feito.md).

**Respostas do Gui à M2** (23/11/2026; relatório em `docs/desempenho/2026-11-23-m2-cpu.md`, o limite de 10 ms de CPU e 128 MB por pedido do plano gratuito):

- **O Explorar até a D2:** fica como está. A D2 resolve para quem tem script e decide o que quem está sem script vê; a medida de pronto da D2 passa a incluir CPU.
- **A cópia do acervo:** em partes, compacta. O Apps Script pede a cópia em partes, cada pedido abaixo de 10 ms, e junta no Drive; o JSON sai sem recuo. Sem segredo novo.
- **O espelho:** uma cópia só da família na produção (pessoas, famílias, laços e o que o espelho já lê), de poucos KB, num botão da Administração. A guarda confere que ela não leva memória, relato, texto, foto nem áudio.
- **Decidido pelo chat, sem pergunta:** as páginas que leem o acervo inteiro só para contar ou escolher (Início, Pessoas, capítulos, carta, Nova memória, Sua conta, "Me mostre uma memória") passam a contar e escolher no banco, com `completar` só no que a página mostra, numa sessão depois da D2 (D3), obrigatória antes do Natal pela mesma regra do plano gratuito. A conferência permanente da seção 8 da M2 entra junto.

**Viabilidade acima de função** (decisão do Gui, 23/11/2026, 15h05). Se uma função precisar cair para o acervo continuar viável no plano gratuito, ela pode cair. A sessão que chegar a esse ponto não decide sozinha: traz a pergunta ao Gui com os números da medição, o que a família perde, o que se ganha e a alternativa de manter (o custo ou o trabalho).

**Revisão de outra família da pilha D1** (24/11/2026). Os itens 1 a 19 rodaram no Gemini Neon e os 20 a 30 no Codex Sol, em cinco rodadas; as correções saíram na D1d e na D1f (#172). A última rodada deu "Juntar", e a pilha #164 a #172 foi juntada na homologa em ordem. O que o Codex deixou para depois está na fila do acervo, no chat de gestão.
