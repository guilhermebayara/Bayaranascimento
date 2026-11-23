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

No celular, no 4G lento, com o acervo cheio: tocar num controle do Explorar muda a tela em menos de 100 ms, e o INP fica abaixo de 200 ms; nenhuma página passa de 50 consultas ao D1; a conferência das linhas do dia de Natal fica abaixo de 3 milhões; e a foto principal da memória aparece bem antes dos 9,6 s de hoje (a sessão diz o número).

Feito na D1b (23/11/2026, branch `tst-d1-fotos`): as duas cópias menores no envio, em WebP ou JPEG, com `srcset` e `sizes` em toda tela por uma peça só (`fontesDaFoto`), prioridade alta na foto principal da memória e do palco, as fotos de trás da pilha depois dela, a foto da lista do computador só quando a linha é apontada, o ajuste "Cópias menores das fotos" na Administração e as fotos e retratos guardados no aparelho por 7 dias (rascunho, lixeira e áudios como antes). No celular, 4G lento, acervo cheio: o LCP da memória foi de 9,7 s para 4,0 s (1,9 s com retratos leves, ver a pergunta dos retratos), o mural de 4,4 MB para 452 KB, o Início de 2,0 MB para 802 KB e o capítulo de 1,5 MB para 327 KB; na TV, o mural de 7,5 MB para 620 KB e a lista de 6,6 MB para 239 KB. As cópias ocupam uns 30% a mais no bucket. Regras em `docs/decisoes.md`, "Infraestrutura".
