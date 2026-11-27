# MEM-13 · Auditoria de complexidade e de custo no banco

27/11/2026 · `homologa` em `892d46917318c179397adb8529acb097ce05f507` · `tst-auditoria-complexidade`.

## Dez achados de maior valor

| Onde | O que | Ganho estimado | Risco | Defeito ou decisão | Esforço estimado | Ferramenta sugerida sem interface |
| --- | --- | --- | --- | --- | --- | --- |
| `servidor/explorar.ts`, `/explorar` e TV de entrada | Pedir contexto de áudio e de quem já contou só onde ele é lido | 324.762 lidas/dia no cenário, §2 e I | Baixo a médio. Lista, filtros ativos e regra da TV | Custo evitável | Meio dia | Wrangler local, gabaritos MEM-6 e `estimar-natal.mjs` |
| `repositorio.ts`, `completar` de Explorar | Para listas grandes, experimentar os planos de fotos, capítulos e temas sem as buscas repetidas por memória | 178.475 lidas/dia projetadas, §2 e H–I | Médio. Ordem, acervos menores e versões do SQLite | Custo evitável | Um dia | Local Explorer, `EXPLAIN QUERY PLAN` e gabarito HTML |
| `repositorio.ts`, Início e Sua conta | Indexar rascunhos e registros por autor e fotos por remetente, após isolar cada índice | Cerca de 1.550 por Início e 9.300–9.600 por Conta, §2 e H | Médio. Mais escritas por índice | Escolha de esquema para corrigir varreduras | Meio dia | D1 local, comparação por pedido e `rows_written` |
| `testes/arvore-meio-irmaos.test.ts` | Dividir a matriz exaustiva em casos por centro | Caso de 19,17 s observado sob concorrência passa a cinco casos menores, §3 e F | Baixo. Manter todas as combinações | Defeito de estabilidade do prebuild | Algumas horas | Vitest, `it.each` e relatório JSON |
| `testes/mem8-gravacao.test.ts` | Separar as provas de restauração das bordas da prova de transição, mantendo uma viagem completa pela cópia | Remover o risco do timeout observado de 5 s. A mesma prova levou 0,55 s isolada, §3 e F | Médio. Citações, anexos e IDs precisam permanecer cobertos | Defeito de estabilidade do prebuild | Meio dia | Vitest, cópia em partes e restauração SQLite |
| `repositorio.ts`, `memoriasComAudio` | Quando a consulta é necessária, começar em áudios | 2.624 lidas a menos no SQL ensaiado, §2 e H | Baixo. Conferir resultado e plano com volumes diferentes | Plano ineficiente | Algumas horas | Local Explorer e `EXPLAIN QUERY PLAN` |
| `repositorio.ts`, Capítulos | Começar o cruzamento do período em capítulos filtrados, mantendo o agregado num pedido só | 1.347 lidas a menos por página de Capítulos no SQL ensaiado, §2 e H | Médio. Posições e cores dos trilhos | Plano ineficiente | Meio dia | `medir-capitulos-mem8.mjs` e gabarito MEM-7 |
| `copia.ts`, partes | Conferir só o nome solicitado no esquema antes de ler a parte | 19.946 lidas a menos por cópia no ensaio de validação, §2 e H | Médio. Marca, tabelas excluídas e mudanças de esquema | Custo evitável sujeito ao contrato da cópia | Meio dia | Local Explorer, `copia-consistente` e restauração |
| `testes/qa-respostas-arvore.test.ts` e `revisao-z2.test.ts` | Fazer as provas de foco, recusa e recado observarem o comportamento | Menos falhas por renomeio e troca de marcação. Exemplos em §3 | Médio. Garantir a mesma cobertura | Escolha de teste e fragilidade | Um dia, por assunto | Vitest, testes de rota e Playwright local |
| `repositorio.ts` e `cliente/busca-pessoa.ts` | Isolar consultas de Capítulos por motivo de mudança e compartilhar só a parte equivalente da normalização | Arquivo de 3.928 linhas com 91 importadores. 12 usos de normalização NFD para classificar, §1 e A–C | Médio. Dependências e significado de acentos | Decisão de organização | Um dia por recorte | `rolldown`, compilador Astro, `rg` e suíte de equivalência |

A auditoria roda em worktree próprio. O D1 e o R2 usados nas medidas são locais, com o acervo sintético do repositório. A unidade da meta é `rows_read` da conta no dia. O cenário do medidor cobre uma parte desse consumo. As propostas são para sessões futuras.

## 1. Complexidade do código

### Tamanho e dependências

Em `src/` há 60.816 linhas físicas. Os dez maiores arquivos são `repositorio.ts` (3.928), `formulario.css` (2.786), `explorar.css` (1.676), `semente.ts` (1.600), `pecas.css` (1.565), `pessoas/[id]/editar.astro` (1.326), `arvore-desenho.ts` (1.307), `Palco.astro` (1.273), `banco.ts` (1.238) e `nova.astro` (1.133). Comando A no fim do relatório.

| Função | Arquivo e início | Linhas físicas |
| --- | --- | ---: |
| `montarArvore` | `src/lib/cliente/arvore.ts:29` | 801 |
| `desenharArvore` | `src/lib/arvore-desenho.ts:139` | 572 |
| `ligarConversa` | `src/lib/cliente/conversa.ts:72` | 472 |
| `otimizarOrdem` | `src/lib/arvore-desenho.ts:855` | 445 |
| `montarCirculo` | `src/lib/cliente/circulo.ts:20` | 345 |
| `tratar` | `src/pages/api/lacos.ts:57` | 328 |
| `desenhar` | `src/lib/cliente/arvore.ts:324` | 288 |
| `tratar` | `src/pages/api/memorias.ts:220` | 284 |
| `espelhar` | `src/lib/espelho.ts:132` | 251 |
| `ligarRetrato` | `src/lib/cliente/retrato.ts:21` | 210 |

Contagem pela árvore sintática, incluindo funções nomeadas dentro de outras. `desenhar` está dentro de `montarArvore`. Para Astro, a análise usa a árvore do compilador Astro. O tamanho é o intervalo de código da função, incluindo o corpo de funções aninhadas. Comando B.

Os imports e reexports locais vêm de 91 módulos de `src/` para `repositorio.ts`, que tem 18 dependências locais diretas. Em seguida vêm `datas.ts` (43 módulos), `visual.ts` (41) e `permissoes.ts` (40). Contagem de arquivos distintos por origem e destino, incluindo imports de tipos e imports dinâmicos com string literal. CSS e módulos externos ficam fora. Comando B.

- **`repositorio.ts` tem fronteiras por motivo de mudança.** A MEM-4 alterou a marca de cópia, a MEM-6 alterou seleções e agregados e a MEM-8 alterou gravações do relato e vínculos diretos de Capítulos. O histórico e as funções apontam domínios diferentes dentro do mesmo arquivo. Depois do Natal, tirar um recorte por vez. Começaria pelas consultas somente de leitura de Capítulos. Manteria as entradas atuais durante a extração e conferiria os gabaritos antes de retirar reexports. A mesma mudança preserva o contexto do pedido em `ambiente.ts`. Comandos A e B.
- **As funções grandes têm riscos diferentes.** `tratar` de memórias e de laços validam entrada, visibilidade e gravação no mesmo fluxo. Extrair só verificações puras, sem mover limites do lote ou a conferência de versão. Já `otimizarOrdem` e `desenharArvore` codificam decisões travadas do arranjo. Para ganhar tempo agora, mexer na forma de rodar os testes da árvore, preservando integralmente os casos. `ligarConversa` concentra rede, estado otimista e mídia. Um recorte de anexos no futuro precisa passar pelos casos de falha, reenvio e edição concorrente. Comandos B e F.

### Duplicação, exports e repasses

| Onde | Evidência e próximo recorte |
| --- | --- |
| `texto.ts`, `cliente/busca-pessoa.ts`, `cliente/quem-estava.ts`, `ordem-das-pessoas.ts`, entre outros | 12 ocorrências de `.normalize('NFD')` em `src/`. `texto.ts` usa `\p{M}` e mantém posições para grifar o original. As versões de seletores têm regras próprias de espaços e pontuação. Unificar só a remoção de marcas onde a equivalência for demonstrada, mantendo as políticas de tokenização, slug e índice FTS. As duas versões de normalização para localizar pessoas são o primeiro recorte. Comando C. |
| `api/memorias.ts` e `api/relatos.ts` | Têm versões de `tratarComAMemoriaDeAgora`, e ambas têm de distinguir a repetição, o conflito e a possibilidade de recompor o relato. Extrair apenas a classificação de erros comum depois de conferir os casos que justificam cada ramo. A decisão de recompor no fluxo sem script continua na rota. Comando C. |
| `capitulos.ts`, `servidor/explorar.ts`, `servidor/busca.ts`, `servidor/repositorio.ts` | A regra de pertinência tem o par TS/SQL em `capitulos.ts`. Continuam espalhadas as formas de montar os filhos diretos: `comFilhos`, a filtragem inline do contexto e `reunidos` na busca. Juntar a seleção dos mesmos filhos com casos para pai, filho, restrição e época. O achado antigo de regra em três lugares já foi endereçado em parte pela MEM-6. Comando C. |
| `servidor/permissoes.ts`, `sala.ts`, `parentesco.ts` | Alguns nomes de antes delegam a `servidor/quem-ve.ts`, como `podeVerMemoria`, `relatoNaTv` e `pessoasQueNaoVe`. Isso preserva as entradas de domínio e a regra TS/SQL com prova de equivalência. Importar direto só onde o repasse não adapta argumentos nem poupa a camada do navegador de uma dependência com nome de servidor. Comandos B e C. |
| `servidor/http.ts`, `servidor/repositorio.ts`, `servidor/ambiente.ts` | `pedeJson`, `lerSobrenomes` e `linhasDevolvidas` têm chamadores apenas no próprio módulo. Tirar `export` é uma limpeza pequena. `sqlAlcancaAMemoria` e `temaDeNatal` estão na mesma situação. Comando C. |
| `servidor/tv.ts`, `conta.ts`, `copia-em-partes.ts` | `comNaTv`, `diaDaCopia`, `enderecoDaParte` e `linhasComoObjetos` são candidatos a export privado, pois continuam com chamador interno. `paraOLeitor` tem prova e consumidor previsto na D2. `ligarAudios` tem cobertura direta de teste. Conservar esses dois enquanto se decidir o destino da API. Comando C. |

Em `busca.ts`, `buscarPessoas` e `buscarNomes` têm chamadores apenas em testes. `oQueVoceCriou`, em `conta.ts`, também só tem chamadores em testes e serve de referência da MEM-6. Essa referência vai para o apoio dos testes se a extração mantiver a comparação independente. A busca por nomes fora do arquivo gera candidatos. A decisão de remover uma função exige conferir chamados internos, testes, scripts, reexports e entradas implícitas de Astro. A lista inicial separa um export dispensável de um corpo sem uso.

## 2. Custo no banco

### Carga, método e cenário do dia 25

Build da base em `wrangler dev --local`, com a configuração de medição do repositório. `carga-local.mjs` rodou no modo padrão, com os arquivos grandes. Ficaram **654 memórias, 3.080 fotos, 1.553 relatos, 203 áudios e 2.247 reações**. O medidor complementar soma `rows_read` e `rows_written` dos spans D1 de cada pedido, incluindo o que vem depois do cabeçalho. As páginas são a mediana de três pedidos quentes. O complemento distingue novos rastros e valida o status HTTP. O medidor de Capítulos também fez o recorte do agregado. Os scripts e o estado ficaram em `/tmp`. Comandos D e E.

**O cenário padrão deu 3.465.377 linhas lidas e 21 escritas. Faltam 465.377 linhas para a meta de 3.000.000.** `conferir-consultas.mjs` passou nos tetos do roteiro. As duas réguas medem coisas diferentes. A cota do D1 conta linhas examinadas, inclusive as que o SQL descarta. Reduzir as colunas de `SELECT *` pode ajudar bytes e CPU. Medir `rows_read` continua necessário. [Preços e métricas do D1](https://developers.cloudflare.com/d1/platform/pricing/).

O cenário usa sete leitores representados por Gui e Elizete, 360 passagens de TV e a mistura de busca e arquivos do script. A navegação pesa 1.977.533, a busca junto do “Ver no Explorar” pesa 872.052, fotos e retratos pesam 219.940 e a hora de TV pesa 395.852. A estimativa herda a data do relógio do Início. No dia 25 simulado, o Início aquecido leu 356 linhas a menos por pedido nos dois perfis. Substituir só esses pedidos na conta dá **3.457.901**. São duas leituras da mesma base com calendário diferente. Para comparar com a MEM-8, o número de referência continua 3.465.377.

Capítulos, relato, Nova memória, Sua conta, a cópia, as escritas de conteúdo e o preparo de processos ficam fora da mistura padrão. As 21 escritas modeladas vêm das visitas ao Início. A carga inclui chaves de mídia reaproveitadas. O custo do áudio de exemplo é uma amostra de uma chave compartilhada, com vários vínculos. O dia real depende também da quantidade e da distribuição de chaves, da carta existente na primeira visita e do tráfego dos demais bancos da conta. Comandos D, E e I.

### Dez rotas ou variantes mais caras no roteiro

Ordenadas pela maior mediana observada entre os dois perfis. As consultas `q` entram como uma variante de busca, com o termo de maior custo. As formas de Explorar com o mesmo lote são agrupadas nas suas linhas. Cada célula de medição é **lidas / escritas** por pedido. As reduções de pedidos distintos podem ser comparadas diretamente. No mesmo pedido, as propostas que atingem a mesma consulta se sobrepõem. Comandos E, G e H.

| Rota ou variante | Gui | Elizete | Causa no rastro e proposta | O que a pessoa vê muda? |
| --- | ---: | ---: | --- | --- |
| `/explorar?q=natal+casa+vó` | 32.106 / 0 | 31.431 / 0 | Monta o acervo inteiro antes de aplicar a busca. No Gui, o lote `completar` lê 21.023 e o lote inicial de FTS lê 3.366. Estimar **6.674–6.858** poupadas por pedido com contexto sob demanda e os três planos de ligações para listas grandes, preservando todos os resultados e as contagens. | Não. A D2, com renderização em partes e escolha do caminho sem script, é outra etapa e requer decisão de interface. |
| `/explorar` e variantes de linha do tempo, mural, lista e filtro de família | 28.232 / 0 | 27.566 / 0 | O mesmo lote monta todos os anexos e o contexto antes do filtro. Sem filtros de relato ou áudio, poupar **4.435** por pedido. A lista ainda usa o indicador de áudio. Nela, poupar **1.411** evitando a consulta de quem contou, e outras **cerca de 2.600** com o plano que começa nos áudios. Os três planos de ligações grandes têm ganho experimental de **2.239–2.423** por pedido, inclusive onde todas as fotos precisam continuar. | Não. O mural “Todas as fotos” continua trazendo todas. |
| `/explorar?ver=tv` e TV da sala na primeira página | 28.001 / 0 | 27.997 / 0 | Pico na porta da carta. TV pessoal simples: 27.575 / 27.570. Sala sem carta, a do modelo: 25.652 / 25.647. A ordem ainda monta as memórias com anexos, e o contexto geral lê quem contou e onde há áudio. Evitar **4.435** nessas entradas sem filtros de relato ou áudio. Separar depois os dados necessários à ordem dos dados do palco. O lote da ordem da sala, sozinho, leu 18.482, o limite bruto do que pode ser atacado. | Não, se permanecerem a ordem, os passos da carta, as vizinhas e os filtros, inclusive o que pode ir à TV. |
| `/api/copia` (índice) | 19.561 / 0 | 185 / 0, HTTP 403 | O lote da régua de esquema, contagens e marca lê 19.044. Testar se dá para eliminar a primeira leitura de nomes ou reaproveitar seu resultado de forma segura. Teto imediato de **332** no índice. Nas partes, validar só o nome solicitado poupou **238–334** no ensaio, **19.946** no conjunto de 71. Preservar a descoberta de tabelas novas e a conferência de consistência. | Não, se o arquivo e a régua de restauração permanecerem iguais. |
| `/conta` | 18.844 / 0 | 17.388 / 0 | Lotes de memórias/fotos (10.298 no Gui) e relatos registrados (4.635) varrem autores em consultas separadas. O ensaio de índices poupou **9.281 / 9.644** na página sem mudar o build. | Não. |
| `/capitulos/natais` | 16.621 / 0 | 16.616 / 0 | O agregado global de resumos e cores lê 13.986. O resto inclui os itens do capítulo. Fixar a ordem entre os capítulos de período e `visiveis` no SQL poupou **1.347** no agregado reexecutado. Preservar as cores, a posição das faixas e os resultados dos capítulos com filhos. | Não. Retirar cores ou mudar trilhos exigiria decisão de interface. |
| `/capitulos` | 15.264 / 0 | 15.259 / 0 | O mesmo agregado de 13.986 domina. Usar o mesmo recorte SQL da linha anterior. **1.347** por pedido no ensaio. | Não. |
| `/?hoje=2026-12-25` (Início) | 12.114 / 1 | 12.143 / 1 | O lote de cartões leu 9.042 no Gui. Só a leitura de rascunhos de relato leu 1.565. O ensaio de índices poupou **1.549 / 1.546**. Manter a seleção dos cartões e o registro de visitas. | Não. |
| `/pessoas` | 7.433 / 0 | 7.428 / 0 | Contar memórias por pessoa leu 6.895 na amostra do Gui. Calcular uma vez os núcleos do leitor dentro daquele SQL poupou **335** no recorte, com as mesmas 39 contagens. A alternativa materializando todas as memórias antes do `JOIN` gastou 443 a mais. | Não. A contagem na lista continua exata. |
| `/pessoas/gui` | 7.191 / 0 | 7.166 / 0 | O verbete leu 3.379 para completar memórias, 940 para áudios e 931 para relatos no Gui. Um índice parcial por autor, adicionado separadamente aos três índices do ensaio anterior, poupou **1.623** para os dois leitores. | Não. |

### Demais pedidos e variantes

| Pedido | Gui | Elizete | Observação |
| --- | ---: | ---: | --- |
| `/busca/resultado`, seis buscas | 633–6.087 / 0 | 628–5.926 / 0 | Para “natal casa vó”, o lote do FTS lê 3.366 e os vínculos de pessoa 1.352 no Gui. Em “eu”, a consulta com detalhes lê 3.105 de 4.821. O teto bruto para otimizar os vínculos é 1.352 no primeiro termo. Conferir ranking, motivos, contagens e permissões antes de estreitar a seleção. Mudar o número de requisições enquanto a pessoa digita pode alterar quando a folha responde e deve passar pelo Gui. |
| `/nova` | 2.752 / 0 | 2.747 / 0 | 1.474 na contagem por tipo no Gui. A tela só usa a contagem quando tem mais de oito tipos. Pular a consulta nas configurações com até oito poupa o custo desse agregado naquele estado. O acervo medido usa o agregado e o índice ensaiado não o barateou. |
| `/explorar?ver=acaso&m=1992-chegada-do-gui` | 2.203 / 0 | 2.198 / 0 | Entra pela seleção já otimizada na MEM-6. É o pedido com memória escolhida. |
| `/memorias/1992-chegada-do-gui` | 676 / 0 | 670 / 0 | O lote comum responde por mais leituras que a ficha. Manter as vizinhas e a permissão. |
| `/memorias/1992-chegada-do-gui/relato` | 591 / 0 | 589 / 0 | 534 no lote comum do Gui. Mensagens e mídias da conversa ficam locais à memória. No ensaio, o índice geral de relato por memória não reduziu a página. |
| `/explorar/palco` (meio da ordem da sala) | 571 / 0 | 566 / 0 | Este é o pedido recorrente. A otimização da primeira página deve manter este caminho separado. |
| `/fotos/pequena/exemplos/chico-4.jpg`, `/retratos/pequeno/exemplos/karol-3.jpg` | 144 / 0 e 491 / 0 | 144 / 0 e 491 / 0 | As chaves são as que o cenário extrai das páginas. |
| `/audios/exemplos/vo-bela-canja.m4a` | 940 / 0 | 940 / 0 | No Gui, 454 no SQL de acesso à chave compartilhada. Manter conferência de acesso e guarda privada. |
| `/api/copia?tabela=...` e `/api/copia-para-o-espelho` | Até 1.759 / 0 por parte e 338 / 0 pelo espelho | Espelho: 185 / 0, HTTP 403 | O download manual inteiro deu **90.478** lidas e **0** escritas: índice de 19.561 mais 71 pedidos de partes, com 70.917 lidas. O espelho é outra exportação, só de dados da família. A medição usa o caminho autenticado de administrador e não mede a confirmação via Drive. |
| `POST /api/memorias`, memória simples | 1.236 / 19 | n/a | Mediana de três criações fictícias com uma pessoa marcada e sem anexos, HTTP 201. |
| `POST /api/relatos`, publicar texto | n/a | 571 / 22 | Mediana de três publicações fictícias de uma mensagem nas memórias recém-criadas, HTTP 201. Inclui as escritas do lote e dos gatilhos. |

### Quanto falta e quais ensaios merecem uma sessão

- **Contexto de Explorar sob demanda.** Em linha do tempo e mural sem filtro de áudio, 3.024 linhas do áudio e 1.411 de quem contou podem sair daquelas leituras. Na lista, manter áudio. Na TV, conservar a consulta específica de voz com o filtro ligado. Pela mistura padrão, a projeção isolada é **324.762 linhas/dia** (`(49 + 21 + 1) × 4.435 + 7 × 1.411`). Sobra **3.140.615**. Usar os gabaritos de HTML das formas, filtros, busca e TV para provar que os consumidores de cada consulta continuam atendidos. Quando precisa de áudio, o SQL equivalente iniciando em `audios` caiu de 3.030 para 406 no ensaio, com as mesmas 203 linhas de resultado. Esse ganho adicional vale nos pedidos que ainda fazem a consulta. Comandos G, H e I.
- **Ligações da lista grande, usando os índices onde a seleção é pequena.** Reexecutei cada consulta de `completar` com os mesmos IDs e comparei `NOT INDEXED`. Na carga com as três gravações de teste, os conjuntos de linhas bateram. Fotos, capítulos e temas também conservaram a ordem por memória nos dois perfis. Somando só os três, o Gui poupa `946 + 695 + 782 = 2.423`; a Elizete, `831 + 663 + 745 = 2.239`. Núcleos, integrantes e relatos mudaram de ordem no ensaio. Deixar esses três caminhos como estão até ter prova da ordem. Um plano de varredura global aplicado também a listas pequenas pode piorar memória, relato e passagem de TV. Medir o corte com vários tamanhos e começar só pelo Explorar que monta o acervo todo. Comando H.
- **Projeção combinada.** Aplicar o delta de ligações a 33 pedidos do Gui e 44 da Elizete, sem contar a ordem da TV, estima mais **178.475** linhas poupadas. Com o contexto sob demanda, projeta **2.962.140** na série comparável. Com o ganho de Início observado no ensaio dos índices, a projeção fica em **2.929.647**. Esse número combina medições separadas, feitas no D1 local, e pressupõe consultas que se eliminam sem interagir com o plano das ligações. O ensaio de SQL conferiu linhas e ordem por memória. O aceite de implementação exige HTML equivalente e medição do cenário completo, com margem para os pedidos de fora do modelo. Comando I.
- **Índices da conta e Início.** Testei três índices juntos após os POSTs sintéticos, com o acervo constante entre antes e depois. O índice por `relatos(memoria_id, por)` ficou sem ganho nas rotas de memória e relato amostradas. Repetir com cada índice sozinho e comparar escritas de conteúdo antes de escolher a migração. O índice separado do verbete tem benefício menor no dia: `1.623 × 7 = 11.361` no roteiro. Índices custam nas escritas e no armazenamento. Comandos E e H. [Preços e métricas do D1](https://developers.cloudflare.com/d1/platform/pricing/).

## 3. Build e testes

### Tempo de relógio e resultado

Mac da sessão, Node `v24.22.0`, Vitest `5.1.0`, Wrangler `4.162.0` e dez processadores lógicos reportados ao Node. Os tempos são desta máquina. Concorrência entre testes e carga da máquina mudam os resultados. Comando F.

| Comando | Relógio | Resultado |
| --- | ---: | --- |
| `npm run build` | 60,93 s | A guarda passou. A suíte levou 55,76 s e parou com 2 timeouts, 2.513 aprovações e 41 pulados. O Astro não chegou a iniciar. |
| `VITEST_MAX_WORKERS=1 npm run build` | 115,74 s | Suíte de 106,02 s, 2.515 aprovados em 152 arquivos e 41 pulados em dois arquivos. A guarda passou. O Astro registrou 2,22 s para o build do servidor e terminou o build. |
| `npm test` com os repórteres padrão e JSON | 46,31 s | Vitest: 45,24 s, 2.514 aprovados, 41 pulados e um timeout da árvore. Os testes de navegador continuam pulados sem `SALA_SERVIDOR` e `Z2_SERVIDOR`. |
| Seis arquivos lentos, um worker | 17,96 s | 241 passaram. O caso da árvore levou 2,00 s e o da restauração levou 0,55 s. |

### Arquivos mais lentos e onde ganhar

Tempos dos arquivos no relatório JSON da suíte concorrente. O recorte isolado tem as mesmas asserções e ajuda a distinguir custo próprio de disputa por CPU. As durações dos arquivos em execução simultânea não somam tempo de relógio. Comando F.

| Arquivo | Suíte concorrente | Recorte isolado | Proposta, ganho e risco |
| --- | ---: | ---: | --- |
| `arvore-lados.test.ts` | 38,54 s | 6,02 s | O caso inicial tem timeout explícito de 60 s. Os outros centros já têm arquivos próprios. Separar combinações por cenário dentro de cada centro dá casos menores e deixa o diagnóstico mais localizado. Tempo total precisa ser medido. Risco baixo com a mesma matriz e o mesmo número de montagens. |
| `arvore-linhas.test.ts` | 28,05 s | 3,22 s | As montagens já são reutilizadas e os defeitos já juntam uma asserção por caso. A próxima oportunidade é reutilizar a leitura de trechos SVG por desenho sem mudar os cruzamentos verificados. Teto de ganho no recorte de 3,22 s, sendo só uma fração na prática. Risco baixo com as mesmas invariantes e dados. |
| `copia-rede.test.ts` | 22,35 s | 1,70 s | Separar os casos de transporte e tentativas, mantendo integração real para marca, esquema e restauração. Ganho de relógio depende da concorrência. Risco médio se o recorte deixar de testar a remontagem do arquivo. |
| `arvore-lados-gui.test.ts`, `arvore-lados-giovanna.test.ts` e `arvore-lados-elizete.test.ts` | 22,00 s, 21,83 s e 21,41 s | n/a | Medir o ganho de subdividir os casos após resolver os timeouts. A mesma regra roda nos centros, com dados e combinações diferentes. |
| `arvore-meio-irmaos.test.ts` | 19,35 s | 2,04 s | O caso de 19,17 s falhou na segunda rodada. Na primeira levou 7,99 s e também falhou. São cinco centros e 16 subconjuntos de laços, 80 montagens. `it.each(CENTROS)` preserva a cobertura e reduz de 80 a 16 montagens por timeout. Risco baixo. |
| `revisao-z2.test.ts` | 18,21 s | n/a | Agrupar por comportamento só depois de tirar o teste que procura o nome dos outros casos. Ganho principal é manutenção. Risco médio ao retirar um caso que reproduz uma corrida diferente. |
| `guarda-copias.test.ts` | 14,83 s | 1,29 s | As recusas já usam o recorte pequeno da AC1. A única passagem pelo projeto inteiro levou 0,82 s isolada. Compartilhar a leitura da árvore com a guarda só vale se preservar as provas de recusa e reduzir tempo medido. |
| `mem8-gravacao.test.ts` | 8,03 s | 1,26 s | A restauração longa levou 5,52 s e falhou no primeiro build. Na segunda suíte, a mesma prova passou em 3,22 s. O teste faz quatro ciclos completos de cópia e restauração. Manter uma prova da evolução 80 → 81 → 200 e da recusa de 201. Separar os ciclos redundantes e provar os limites no menor teste que conserve o contrato. Ganho esperado é evitar o timeout, com risco médio para a cobertura de anexos e citações. |

Até estabilizar, a configuração de um worker é uma maneira medida de completar o build. A diferença de relógio entre as rodadas inclui concorrência e resultado diferente do prebuild. Vale medir a configuração de workers depois de distribuir os casos, sem mudar o limite global. A AC1 já dividiu `arvore-lados` por centro, passou a reutilizar montagens em `arvore-linhas` e recortou os casos negativos de `guarda-copias`.

### Fragilidade ao ler o texto da implementação

A busca estática encontra **80 arquivos** de teste com pelo menos uma chamada ou menção aos leitores pesquisados no comando F. É uma triagem. Alguns arquivos também rodam a rota e inspecionam o banco. A contagem de arquivos não representa o número de asserções por texto.

| Exemplo | O que prende | Prova mais estável |
| --- | --- | --- |
| `testes/qa-respostas-arvore.test.ts` | Template literal da ficha, nomes locais e formato do código de foco | Teste de navegador local abrindo e fechando a ficha, olhando o foco e a região de aviso. Preservar o desenho já aprovado. |
| `testes/revisao-z2.test.ts:1422` | Texto de `pedido-recusado.test.ts` e `z-correcoes.test.ts` para conferir a existência de outros testes | Manter os casos de recusa com o banco igual. Se a regra também precisar inventariar rotas cobertas, usar dados declarados pelo teste e conferidos pela guarda. |
| `testes/revisao-z2.test.ts:1478` | String exata do HTML da Janela, ordem de trechos e espaçamento do código | Conferir o recado na região `aria-live` depois de uma gravação ou falha, com a mesma posição funcional. |
| `testes/aspas-curvas.test.ts` e regras de tokens | Convenção que incide diretamente sobre o código | Manter leitura de fonte quando a regra é sobre o próprio texto. |

Trocar as provas por comportamento dá liberdade para renomear funções e mover componentes. O risco é perder uma condição de recusa ou acessibilidade se a nova prova medir só o resultado feliz. As comparações do banco inteiro, de permissões e de versão devem acompanhar cada troca.

## 4. Antes e depois do Natal

### Antes do Natal

1. **Estabilizar o prebuild e abrir a sessão de Explorar sem mudança visível.** Dividir a matriz de meio-irmãos e recortar a prova da cópia. Em Explorar, entregar o contexto sob demanda primeiro e medir a lista completa com os planos alternativos. A verificação do resultado compara HTML, filtros de relato/áudio, lista, mural com todas as fotos e TV. Repetir o Natal na carga padrão e registrar a folga para o tráfego fora do roteiro.
2. **Medir os índices separados para Início e Sua conta.** Agregar ao pacote do Natal só o que demonstrar ganho em leitura e custo aceitável de escrita. Manter a carta, a visita e as ações de quem administra como estão.
3. **Usar a fronteira de interface da D2.** A lista leve e a renderização em partes já estão no brief. Qualquer execução que altere o que aparece ao rolar, o caminho sem script ou o tempo em que a busca responde para a pessoa precisa da decisão do Gui sobre aquela parte. A auditoria chega até a necessidade, sem escolher esse desenho. [Brief de desempenho](../briefs/desempenho.md).

### Depois do Natal

- Fazer Capítulos, Pessoas, verbetes e cópia em sessões separadas. Capítulos e cópia ficam fora da conta padrão, e as mudanças de plano precisam preservar trilhos e restauração. O verbete pesa pouco no total mesmo com ganho local. A validação da cópia é custo de uma descarga inteira, mas a automática costuma rodar em outro dia, segundo o agendamento do repositório. [Regras da cópia](../copia-no-drive.md).
- Extrair partes de `repositorio.ts`, privatizar os exports confirmados e consolidar a normalização por contrato. A priorização segue a frequência de mudança e os chamadores confirmados. Evitar uma reorganização ampla enquanto houver mudanças transacionais em relato e memória.
- Substituir testes por texto por assunto, preservando os de convenções de código. Deixar otimizações do algoritmo da árvore para quando houver gabarito do desenho inteiro. Por ora, o ganho de estabilidade vem do teste.
- O preparo de processos e o custo da conta inteira ainda pedem amostragem separada com dados representativos. A MEM-8 já retirou a varredura de relatos do primeiro pedido. A auditoria de estrutura também já motivou a divisão de regras, a centralização de visibilidade, os cortes nos testes antigos e a mudança de colunas de pessoa. Esses trabalhos têm prova própria. [Auditoria de estrutura](https://github.com/guilhermebayara/bayaranascimento/blob/tst-auditoria-estrutura/docs/auditoria/2026-11-estrutura.md), [MEM-8](../desempenho/2026-11-27-mem8.md).

## Como reproduzir os números

Os comandos partem da raiz de um worktree em `892d469`. Use uma pasta temporária própria. O arquivo do relatório contém os três scripts auxiliares reproduzíveis. A seção de ensaios executa DDL e POSTs apenas no acervo descartável indicado, com o Wrangler em modo local. A contagem de esforço no quadro inicial é uma estimativa de escopo.

### A. Linhas físicas e histórico

```sh
git ls-files src | xargs wc -l | sort -nr | head -11
git log --oneline 1c7a642..892d469 -- src/lib/servidor/repositorio.ts
```

### B. Funções e imports

Use o relatório como arquivo de entrada para extrair scripts em `/tmp`. Em um checkout limpo da base, `RELATORIO` pode apontar para este arquivo no worktree da auditoria.

```sh
AUDIT_DIR=$(mktemp -d /tmp/mem13.XXXXXX)
RELATORIO=docs/auditoria/2026-11-27-complexidade.md
extrair() {
  awk -v nome="$1" '
    $0 == "<!-- script:" nome ":inicio -->" { ler=1; next }
    $0 == "<!-- script:" nome ":fim -->" { exit }
    ler && !/^```/ { print }
  ' "$RELATORIO" > "$AUDIT_DIR/$1"
}
for script in codigo.cjs rotas.mjs sql.mjs; do extrair "$script"; done
npm ci
node "$AUDIT_DIR/codigo.cjs" > "$AUDIT_DIR/codigo.json"
node -e 'const {fn,peso}=require(process.argv[1]); console.table(fn); console.table(peso)' "$AUDIT_DIR/codigo.json"
```

### C. Duplicação, chamadores e repasses

```sh
rg -n "\.normalize\(['\"]NFD['\"]\)" src
rg -n "\.normalize\(['\"]NFD['\"]\)" src | wc -l
rg -n '\b(tratarComAMemoriaDeAgora|comFilhos|reunidos|memoriaDoCapitulo)\b' src
rg -n '\b(podeVerMemoria|relatoNaTv|pessoasQueNaoVe)\b' src/lib/{servidor/permissoes,sala,parentesco,servidor/quem-ve}.ts
for nome in pedeJson lerSobrenomes linhasDevolvidas sqlAlcancaAMemoria temaDeNatal comNaTv diaDaCopia enderecoDaParte linhasComoObjetos paraOLeitor ligarAudios buscarNomes buscarPessoas oQueVoceCriou; do
  git grep -n -w -e "$nome" -- src testes scripts
done
```

### D. Build, servidor de medição e acervo cheio

Em um terminal, após preparar as dependências com B, use o build da suíte serial de F. Suba o Worker local com os bindings fictícios da configuração de medição. [Comando `wrangler dev`](https://developers.cloudflare.com/workers/wrangler/commands/workers/#dev).

```sh
BASE=http://127.0.0.1:4373
WRANGLER_LOG_PATH="$AUDIT_DIR/wrangler.log" WRANGLER_SEND_METRICS=false \
  node node_modules/wrangler/bin/wrangler.js dev --local \
  -c scripts/desempenho/wrangler-cpu.jsonc --persist-to "$AUDIT_DIR/d1" \
  --ip 127.0.0.1 --port 4373 --inspector-port 9373
```

No outro terminal, com os mesmos valores de `AUDIT_DIR` e `BASE`:

```sh
curl -fsS -o /dev/null "$BASE/"
node scripts/enviar-fotos-de-exemplo.mjs "$BASE" > "$AUDIT_DIR/exemplos.log"
node scripts/desempenho/carga-local.mjs "$BASE" > "$AUDIT_DIR/carga.log"
tail -2 "$AUDIT_DIR/carga.log"
```

### E. Rastros por pedido e cópia

Antes de gravar os exemplos dos POSTs ou criar os índices candidatos, rode os medidores em sequência contra a mesma instância. `estimar-natal.mjs` sai com código 1 acima da meta. Os dois outros medidores do repositório saíram com zero nesta rodada.

```sh
node scripts/desempenho/estimar-natal.mjs --base "$BASE" --json > "$AUDIT_DIR/natal.log" 2>&1
node scripts/desempenho/conferir-consultas.mjs --base "$BASE" --json > "$AUDIT_DIR/consultas.log" 2>&1
node scripts/desempenho/medir-capitulos-mem8.mjs "$BASE" --exigir-uma-leitura > "$AUDIT_DIR/capitulos.json"
node "$AUDIT_DIR/rotas.mjs" "$BASE" copia > "$AUDIT_DIR/copia.ndjson"
node "$AUDIT_DIR/rotas.mjs" "$BASE" paginas > "$AUDIT_DIR/rotas.ndjson"
node "$AUDIT_DIR/rotas.mjs" "$BASE" gravar > "$AUDIT_DIR/gravar.ndjson"
node - "$AUDIT_DIR" <<'JS'
const fs = require('node:fs');
const ler = nome => fs.readFileSync(`${process.argv[2]}/${nome}.ndjson`,'utf8').trim().split('\n').map(JSON.parse);
const copia = ler('copia');
const partes = copia.filter(r => r.caminho.startsWith('/api/copia?'));
const resumo = ({como,caminho,l,e,status}) => ({como,caminho,l,e,status});
console.table(ler('rotas').concat(copia.filter(r=>!partes.includes(r)),ler('gravar')).map(resumo));
console.log({partes:partes.length, lidas:partes.reduce((s,r)=>s+r.l,0), escritas:partes.reduce((s,r)=>s+r.e,0), max:Math.max(...partes.map(r=>r.l))});
JS
```

### F. Tempos, casos e fonte de testes

Faça as rodadas de relógio separadamente. A primeira e a terceira podem terminar com código 1 pelo timeout. O recorte isolado usa as mesmas provas incluídas na suíte.

```sh
node -v
node -p "require('node:os').availableParallelism()"
node node_modules/vitest/vitest.mjs --version
node node_modules/wrangler/bin/wrangler.js --version
/usr/bin/time -p npm run build > "$AUDIT_DIR/build.log" 2>&1
VITEST_MAX_WORKERS=1 /usr/bin/time -p npm run build > "$AUDIT_DIR/build-serial.log" 2>&1
/usr/bin/time -p npm test -- --reporter=default --reporter=json --outputFile.json="$AUDIT_DIR/testes.json" > "$AUDIT_DIR/testes.log" 2>&1
/usr/bin/time -p node node_modules/vitest/vitest.mjs run --maxWorkers=1 \
  --reporter=default --reporter=json --outputFile.json="$AUDIT_DIR/foco.json" \
  testes/arvore-meio-irmaos.test.ts testes/arvore-lados.test.ts testes/arvore-linhas.test.ts \
  testes/guarda-copias.test.ts testes/mem8-gravacao.test.ts testes/copia-rede.test.ts > "$AUDIT_DIR/foco.log" 2>&1
rg -n 'Test Files|Tests |Duration|Server built|real |timed out' "$AUDIT_DIR"/{build,build-serial,testes,foco}.log
node - "$AUDIT_DIR/testes.json" "$AUDIT_DIR/foco.json" <<'JS'
for (const arquivo of process.argv.slice(2)) {
  const {testResults} = require(arquivo);
  const tempo = t => t.endTime - t.startTime;
  for (const t of testResults.sort((a,b) => tempo(b)-tempo(a)).slice(0,12)) {
    const maiores = t.assertionResults.sort((a,b)=>(b.duration??0)-(a.duration??0)).slice(0,2);
    console.log(t.name.split('/').at(-1), tempo(t).toFixed(0), maiores.map(a=>[a.title,a.status,a.duration]));
  }
}
JS
rg -l 'readFileSync|readFile\(|lerCodigo\(|lerFonte\(' testes -g '*.test.ts' | wc -l
rg -n 'CENTROS|DONOS|subconjuntos' testes/arvore-meio-irmaos.test.ts
rg -n '\[80, 81, 200\]|conferirCopia\(id\)' testes/mem8-gravacao.test.ts
rg -n 'fichaAberta|aria-live|readFileSync.*testes/' testes/{qa-respostas-arvore,revisao-z2}.test.ts
```

### G. Atribuição do custo aos lotes e consultas

```sh
node - "$AUDIT_DIR" <<'JS'
const fs = require('node:fs');
for (const arquivo of ['rotas','copia']) {
  for (const linha of fs.readFileSync(`${process.argv[2]}/${arquivo}.ndjson`,'utf8').trim().split('\n')) {
    const {caminho,como,spans} = JSON.parse(linha);
    if (arquivo==='copia' && caminho.includes('?') && caminho!=='/api/copia?tabela=fotos') continue;
    console.log(caminho, como, spans.sort((a,b)=>b.l-a.l).slice(0,9)
      .map(s=>[s.l,s.e,s.sql?.trim().slice(0,145)]));
  }
}
JS
```

### H. Planos e índices no banco local descartável

Depois de E, meça as rotas imediatamente antes e depois dos índices. Execute uma vez em cada acervo descartável. `--revisar` usa a consulta do build para Pessoas e Capítulos e valida os resultados da alternativa. `--ligacoes` também compara a ordem das linhas dentro de cada memória. Os ensaios usam o acervo após as três criações e publicações sintéticas, com a mesma carga em cada par.

```sh
node "$AUDIT_DIR/rotas.mjs" "$BASE" indices > "$AUDIT_DIR/indices-antes.ndjson"
node "$AUDIT_DIR/sql.mjs" "$BASE" --indices > "$AUDIT_DIR/sql.log"
node "$AUDIT_DIR/rotas.mjs" "$BASE" indices > "$AUDIT_DIR/indices-depois.ndjson"
node "$AUDIT_DIR/sql.mjs" "$BASE" --revisar "$AUDIT_DIR/indices-depois.ndjson" > "$AUDIT_DIR/revisar.log"
for leitor in gui elizete; do
  node "$AUDIT_DIR/sql.mjs" "$BASE" --ligacoes "$AUDIT_DIR/indices-depois.ndjson" "$leitor" > "$AUDIT_DIR/ligacoes-$leitor.log"
done
node "$AUDIT_DIR/rotas.mjs" "$BASE" verbete > "$AUDIT_DIR/verbete-antes.ndjson"
node "$AUDIT_DIR/sql.mjs" "$BASE" --por > "$AUDIT_DIR/verbete-index.log"
node "$AUDIT_DIR/rotas.mjs" "$BASE" verbete > "$AUDIT_DIR/verbete-depois.ndjson"
node "$AUDIT_DIR/sql.mjs" "$BASE" --copia "$AUDIT_DIR/copia.ndjson" > "$AUDIT_DIR/copia-sql.log"
node - "$AUDIT_DIR" <<'JS'
const fs = require('node:fs');
const ler = s => fs.readFileSync(`${process.argv[2]}/${s}.ndjson`,'utf8').trim().split('\n').map(JSON.parse);
for (const nome of ['indices','verbete']) {
  const antes = ler(`${nome}-antes`), depois = ler(`${nome}-depois`);
  console.table(antes.map((r,i)=>({rota:r.caminho,como:r.como,antes:r.l,depois:depois[i].l,poupadas:r.l-depois[i].l})));
}
JS
```

### I. Contas do cenário e projeções

O script `estimar-natal.mjs` contém os pesos. Em Explorar, o cenário tem oito pedidos sem busca por pessoa e três com busca aberta nessa tela. O cálculo do contexto usa sete dos oito sem busca para poupar ambas as consultas e reserva o indicador de áudio para a lista. `ROOT` usa a diferença observada no simulador. Os totais seguintes são aritmética de projeção sobre as medições da seção 2.

```sh
node - <<'JS'
const total = 3465377, meta = 3000000;
const ROOT = 21 * 356;
const contexto = (49 + 21 + 1) * (3024 + 1411) + 7 * 1411;
const ligacoes = 33 * (946 + 695 + 782) + 44 * (831 + 663 + 745);
const indicesInicio = 9 * 1549 + 12 * 1546;
console.log({gap:total-meta,simulacao:total-ROOT,contexto,ligacoes,indicesInicio,
  comContexto:total-contexto,comLigacoes:total-contexto-ligacoes,
  comIndices:total-contexto-ligacoes-indicesInicio,
  copia:19561+70917,verbete:1623*7,
  audios:3030-406,pesoNavegacao:856617+1120916,pesoBusca:377886+494166,pesoArquivos:94260+125680});
JS
```

### Scripts auxiliares usados fora do repositório

<!-- script:codigo.cjs:inicio -->
```js
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { parseAst } = require(require.resolve('rolldown/parseAst', { paths: [process.cwd()] }));
const arquivos = cp.execFileSync('git', ['ls-files', 'src', 'testes']).toString().trim().split('\n');
const funcoes = [], imports = [], expFun = [];
const ativos = new Set(arquivos);
(async () => {
const { parseAstroSync } = await import(require('node:url').pathToFileURL(require.resolve('@astrojs/compiler-binding', {paths:[process.cwd()]})).href);
for (const arquivo of arquivos.filter(f => /\.(astro|ts)$/.test(f))) {
  const texto = fs.readFileSync(arquivo, 'utf8');
  const astro = arquivo.endsWith('.astro');
  const ast = astro ? JSON.parse(parseAstroSync(texto).ast) : parseAst(texto, {lang:'ts', sourceType:'module'});
  const linha = i => (astro ? Buffer.from(texto).subarray(0,i).toString() : texto.slice(0,i)).split('\n').length;
  {
    function dependente(no, s) {
      if (!s?.startsWith('.')) return;
      const base = path.normalize(path.join(path.dirname(arquivo), s));
      const alvo = [base, base + '.ts', base + '.astro', base + '/index.ts'].find(f => ativos.has(f));
      if (alvo) imports.push([arquivo, alvo, no.type, (no.specifiers ?? []).map(x => x.imported?.name ?? x.local?.name ?? x.type)]);
    }
    function visita(no, pai) {
      if (!no || typeof no.type !== 'string') return;
      if (/^(FunctionDeclaration|ArrowFunctionExpression|FunctionExpression)$/.test(no.type)) {
        const nome = no.id?.name ?? pai?.id?.name ?? pai?.key?.name;
        if (nome && nome !== '__cabecalho_do_astro__' && arquivo.startsWith('src/')) funcoes.push([linha(no.end - 1) - linha(no.start) + 1, arquivo, linha(no.start), nome]);
      }
      if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(no.type)) dependente(no, no.source?.value);
      if (no.type === 'ExportNamedDeclaration' && arquivo.startsWith('src/')) {
        if (no.declaration?.type === 'FunctionDeclaration') expFun.push([arquivo, linha(no.start), no.declaration.id.name]);
        if (no.declaration?.type === 'VariableDeclaration') for (const d of no.declaration.declarations) if (d.id.name && /FunctionExpression$/.test(d.init?.type ?? '')) expFun.push([arquivo, linha(no.start), d.id.name]);
      }
      for (const valor of Object.values(no)) {
        if (Array.isArray(valor)) valor.forEach(i => visita(i, no));
        else if (valor && typeof valor === 'object') visita(valor, no);
      }
    }
    visita(ast, null);
  }
}
const pares = [...new Map(imports.map(r => [JSON.stringify(r.slice(0,2)), r.slice(0,2)])).values()];
const entrada = pares.filter(r => r[0].startsWith('src/'));
const fn = funcoes.sort((a,b) => b[0]-a[0]).slice(0,15);
const peso = [...new Set(entrada.map(r => r[1]))].map(f => [entrada.filter(r => r[1] === f).length, entrada.filter(r => r[0] === f).length, f]).sort((a,b) => b[0]-a[0]).slice(0,12);
const fontes = arquivos.map(f => [f, fs.readFileSync(f, 'utf8')]);
const sem = expFun.map(r => [...r, ...['src/', 'testes/'].map(p => fontes.filter(([f,t]) => f.startsWith(p) && f !== r[0] && new RegExp('\\b' + r[2] + '\\b').test(t)).length)]).filter(r => !r[3] && !['GET','POST','PUT','DELETE','HEAD','PATCH','OPTIONS','ALL','onRequest','getStaticPaths'].includes(r[2]));
console.log(JSON.stringify({fn,peso,sem,imports},null,2));

})();
```
<!-- script:codigo.cjs:fim -->

<!-- script:rotas.mjs:inicio -->
```js
import { randomUUID } from 'node:crypto';
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:4373');
if (base.protocol !== 'http:' || base.hostname !== '127.0.0.1') throw Error('Use loopback');
const api = new URL('/cdn-cgi/local/explorer/api', base);
const pausa = ms => new Promise(ok => setTimeout(ok, ms));
const mediana = v => [...v].sort((a,b) => a-b)[Math.floor(v.length/2)];
async function obs(sql, params) {
  const r = await fetch(api.href + '/local/observability/query', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({sql,params}) });
  const {result} = await r.json();
  if (!r.ok || !result) throw Error('Local Explorer sem rastro: ' + r.status);
  return result.rows.map(row => Object.fromEntries(result.columns.map((c,i) => [c,row[i]])));
}
async function mede(caminho, como, esperado = 200, repeticoes = 3, dados) {
  const rodadas = [];
  let corpo;
  for (let k=0; k<repeticoes; k++) {
    const url = new URL(caminho, base);
    if (url.pathname !== '/') url.searchParams.set('_mem13', randomUUID());
    const raizSql = `SELECT trace_id FROM spans WHERE parent_id IS NULL AND json_extract(attributes,'$."url.full"') = ? AND duration_ms IS NOT NULL ORDER BY start_ms DESC LIMIT 1`;
    const [anterior] = url.pathname === '/' ? await obs(raizSql, [url.href]) : [];
    const headers = {cookie:`como=${como}`};
    if (dados) Object.assign(headers, {origin:base.origin, 'content-type':'application/json', accept:'application/json'});
    const r = await fetch(url, {headers, redirect:'manual', ...(dados ? {method:'POST',body:JSON.stringify(dados)} : {})});
    corpo = await r.text();
    if (r.status !== esperado) throw Error(`${como} ${caminho}: ${r.status} ${corpo.slice(0,120)}`);
    let spans;
    for (let i=0; i<80; i++) {
      const [raiz] = await obs(raizSql, [url.href]);
      if (!raiz || raiz.trace_id === anterior?.trace_id) { await pausa(150); continue; }
      const sql = `SELECT coalesce(json_extract(attributes,'$."cloudflare.d1.response.rows_read"'),0) AS l, coalesce(json_extract(attributes,'$."cloudflare.d1.response.rows_written"'),0) AS e, json_extract(attributes,'$."db.query.text"') AS sql FROM spans WHERE trace_id = ? AND kind = 'd1' ORDER BY start_ms`;
      await pausa(75);
      spans = await obs(sql, [raiz.trace_id]);
      break;
    }
    if (!spans) throw Error(`Sem rastro ${url}`);
    const idasNoCabecalho = +(r.headers.get('server-timing')?.match(/idas=(\d+)/)?.[1] ?? 0);
    if (spans.length < idasNoCabecalho) throw Error(`Rastro incompleto ${url}`);
    rodadas.push({l:spans.reduce((s,p)=>s+p.l,0), e:spans.reduce((s,p)=>s+p.e,0), spans});
  }
  const l = mediana(rodadas.map(x=>x.l)), e = mediana(rodadas.map(x=>x.e));
  console.log(JSON.stringify({caminho,como,status:esperado,l,e,rodadas:rodadas.map(({l,e})=>[l,e]), spans:rodadas.find(r=>r.l===l).spans}));
  return corpo;
}
const modo = process.argv[3] ?? 'paginas';
if (modo === 'paginas') for (const como of ['gui','elizete']) {
  const memoria = '/memorias/1992-chegada-do-gui';
  const caminhos = ['/?hoje=2026-11-27','/?hoje=2026-12-25','/explorar','/explorar?ver=mural','/explorar?ver=mural&fotos=todas','/explorar?ver=lista','/explorar?nucleo=bracarense','/explorar?ver=acaso&m=1992-chegada-do-gui','/capitulos','/capitulos/natais',memoria,`${memoria}/relato`,'/pessoas','/pessoas/gui','/nova','/conta','/explorar?ver=tv','/explorar?ver=tv&sala=1','/explorar?ver=tv&sala=1&tema=natal&ordem=antigas&carta=1&m=carta-1'];
  for (const caminho of caminhos) await mede(caminho, como);
  for (const q of ['natal','natal casa vó','minha mãe','sabará','vó','eu']) {
    for (const rota of ['/busca/resultado','/explorar']) await mede(`${rota}?q=${encodeURIComponent(q)}`, como);
  }
  const html = await (await fetch(new URL('/explorar?ver=tv&sala=1',base),{headers:{cookie:`como=${como}`}})).text();
  const ordem = JSON.parse(/data-ordem-da-tv>([^<]*)</.exec(html)?.[1] ?? '[]');
  if (ordem.length < 3) throw Error('Ordem da TV ausente');
  const i = Math.floor(ordem.length/2);
  await mede(`/explorar/palco?ver=tv&sala=1&m=${ordem[i]}&antes=${ordem[i-1]}&depois=${ordem[i+1]}`,como);
  const m = await (await fetch(new URL(memoria,base),{headers:{cookie:`como=${como}`}})).text();
  const p = await (await fetch(new URL('/pessoas',base),{headers:{cookie:`como=${como}`}})).text();
  await mede(/(?:src|srcset)="(\/fotos\/[^"\s]+)"/.exec(m)[1],como);
  await mede(/src="(\/retratos\/[^"\s]+)"/.exec(p)[1],como);
  await mede('/audios/exemplos/vo-bela-canja.m4a',como);
}
if (modo === 'copia') {
  const indice = JSON.parse(await mede('/api/copia','gui'));
  for (const {tabela} of indice.indice) {
    let depois = null;
    do {
      const r = JSON.parse(await mede(`/api/copia?tabela=${encodeURIComponent(tabela)}${depois === null ? '' : `&depois=${depois}`}`,'gui',200,1));
      depois = r.proxima;
    } while (depois !== null);
  }
  await mede('/api/copia-para-o-espelho','gui');
  await mede('/api/copia','elizete',403);
  await mede('/api/copia-para-o-espelho','elizete',403);
}

if (modo === 'gravar') {
  for (let i=0; i<3; i++) {
    const {id} = JSON.parse(await mede('/api/memorias','gui',201,1,{
      titulo:`Almoço sintético MEM-13 ${i+1}`, ano:2001, tipo:'cotidiano', pessoas:['elizete'], visibilidade:'todos', situacao:'publicada',
    }));
    await mede('/api/relatos','elizete',201,1,{memoria:id, por:'elizete', situacao:'publicada', mensagens:[{tipo:'texto', texto:'Um parágrafo de exemplo.'}]});
  }
}
if (modo === 'indices') for (const como of ['gui','elizete']) {
  for (const caminho of ['/?hoje=2026-12-25','/conta','/capitulos','/nova','/explorar','/explorar?ver=tv&sala=1','/pessoas','/memorias/1992-chegada-do-gui','/memorias/1992-chegada-do-gui/relato','/audios/exemplos/vo-bela-canja.m4a']) await mede(caminho,como);
}
if (modo === 'verbete') for (const como of ['gui','elizete']) await mede('/pessoas/gui',como);
```
<!-- script:rotas.mjs:fim -->

<!-- script:sql.mjs:inicio -->
```js
const base = new URL(process.argv[2]);
if (base.protocol !== 'http:' || base.hostname !== '127.0.0.1') throw Error('Use loopback');
const api = new URL('/cdn-cgi/local/explorer/api', base).href;
async function chamar(path, payload) {
  const r = await fetch(api + path, payload && {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  const d = await r.json();
  if (!r.ok || !d.success) throw Error(JSON.stringify(d).slice(0,500));
  return d.result;
}
const [banco] = await chamar('/d1/database');
if (banco.name !== 'DB') throw Error('Esperava DB local');
async function sql(q) { return (await chamar(`/d1/database/${banco.uuid}/raw`, {sql:q}))[0]; }
const check = await sql("SELECT count(*) FROM integrantes WHERE id LIKE 'ex-%'");
if (!check.results.rows[0][0]) throw Error('Esperava acervo sintético');
const audio = `SELECT DISTINCT r.memoria_id, r.por, r.registrado_por, r.so_para_nucleos FROM audios a JOIN relatos r ON r.id = a.relato_id WHERE a.removido_em IS NULL AND r.situacao = 'publicada'`;
const som = texto => ({l:texto.meta.rows_read,e:texto.meta.rows_written,n:texto.results.rows.length});
const a = await sql(audio), b = await sql(audio.replace('JOIN relatos','CROSS JOIN relatos'));
const ordenar = r => JSON.stringify(r.results.rows.map(JSON.stringify).sort());
if (ordenar(a) !== ordenar(b)) throw Error('Resultado diferente');
console.log(JSON.stringify({audio:{atual:som(a),alternativa:som(b),planos:await Promise.all([audio,audio.replace('JOIN relatos','CROSS JOIN relatos')].map(async q => (await sql('EXPLAIN QUERY PLAN '+q)).results.rows))}}));
if (process.argv.includes('--indices')) {
  for (const q of [
    'CREATE INDEX mem13_r_dono ON relatos(registrado_por, situacao) WHERE descartado_em IS NULL',
    'CREATE INDEX mem13_r_memoria ON relatos(memoria_id, por)',
    'CREATE INDEX mem13_f_dono ON fotos(enviada_por, memoria_id) WHERE removida_em IS NULL',
  ]) console.log(JSON.stringify({q,medida:som(await sql(q))}));
}
if (process.argv.includes('--revisar')) {
  const fs = await import('node:fs');
  const rotas = fs.readFileSync(process.argv[process.argv.indexOf('--revisar')+1],'utf8').trim().split('\n').map(JSON.parse);
  const literal = x => `'${String(x).replaceAll("'", "''")}'`;
  async function comparar(nome, original, alternativas) {
    const a = await sql(original);
    const saida = [];
    for (const q of alternativas) {
      if (q === original) throw Error('Consulta sem alteração');
      const b = await sql(q);
      if (ordenar(a) !== ordenar(b)) throw Error(nome + ': resultado diferente');
      saida.push(som(b));
    }
    console.log(JSON.stringify({nome,atual:som(a),alternativas:saida}));
  }
  const colunas = r => r.results.rows.map(row => Object.fromEntries(r.results.columns.map((c,i) => [c,row[i]])));
  for (const como of ['gui','elizete']) {
    const trace = caminho => rotas.find(x => x.como === como && x.caminho === caminho).spans;
    const q = trace('/pessoas').find(x => x.sql.startsWith('SELECT mi.integrante_id AS id, COUNT(*)')).sql.replaceAll('?1',literal(como));
    const corte = q.indexOf(' WHERE '), fim = q.lastIndexOf(' GROUP BY ');
    const alternativa = 'WITH vistas AS MATERIALIZED (SELECT m.id FROM memorias m' + q.slice(corte,fim) + ') SELECT mi.integrante_id AS id, COUNT(*) AS n FROM vistas m CROSS JOIN memoria_integrantes mi ON mi.memoria_id = m.id GROUP BY mi.integrante_id';
    await comparar(`pessoas ${como}`,q,[alternativa]);
    const capitulos = colunas(await sql(`SELECT c.*, (SELECT json_group_array(integrante_id) FROM capitulo_pessoas p WHERE p.capitulo_id = c.id) AS pessoas,
      (SELECT json_group_array(nucleo_id) FROM capitulo_familias f WHERE f.capitulo_id = c.id) AS familias
      FROM capitulos c WHERE c.excluido_em IS NULL AND (c.visibilidade = 'todos' OR EXISTS
      (SELECT 1 FROM capitulo_nucleos cn JOIN nucleo_membros nm ON nm.nucleo_id = cn.nucleo_id
       WHERE cn.capitulo_id = c.id AND nm.integrante_id = ${literal(como)} AND nm.papel = 'membro'))
      ORDER BY COALESCE(c.inicio_ano,9999), c.titulo`));
    const data = (ano,mes,dia) => ano ? {ano,mes,dia:mes ? dia : null} : null;
    const cs = capitulos.map(c => ({capitulo:{id:c.id, modo:c.modo, inicio:data(c.inicio_ano,c.inicio_mes,c.inicio_dia), fim:data(c.fim_ano,c.fim_mes,c.fim_dia), pessoas:JSON.parse(c.pessoas), familias:JSON.parse(c.familias)}, filhos:capitulos.filter(x=>x.pai_id===c.id).map(x=>x.id), dentro:c.pai_id, epoca:c.modo==='epoca' && c.pessoas==='[]' && c.familias==='[]'}));
    const cap = trace('/capitulos').find(x => x.sql.includes('visiveis AS MATERIALIZED')).sql.replaceAll('?1',literal(como)).replaceAll('?2',literal(JSON.stringify(cs)));
    await comparar(`capitulos ${como}`,cap,[
      cap.replaceAll('FROM cs c JOIN visiveis m','FROM cs c CROSS JOIN visiveis m'),
      cap.replace('FROM membros p JOIN visiveis m','FROM membros p CROSS JOIN visiveis m'),
      cap.replaceAll('FROM cs c JOIN visiveis m','FROM cs c CROSS JOIN visiveis m').replace('FROM membros p JOIN visiveis m','FROM membros p CROSS JOIN visiveis m'),
    ]);
  }
}
if (process.argv.includes('--ligacoes')) {
  const fs = await import('node:fs');
  const rotas = fs.readFileSync(process.argv[process.argv.indexOf('--ligacoes')+1],'utf8').trim().split('\n').map(JSON.parse);
  const pos = process.argv.indexOf('--ligacoes');
  const como = process.argv[pos + 2] ?? 'gui';
  const rota = rotas.find(x => x.como===como && x.caminho==='/explorar');
  if (!['gui','elizete'].includes(como)) throw Error('Leitor inesperado');
  const m = rota.spans.find(x => x.sql?.startsWith('SELECT m.* FROM memorias m')).sql.replaceAll('?1',`'${como}'`);
  const ids = JSON.stringify((await sql(m.replace('SELECT m.*','SELECT m.id'))).results.rows.map(r=>r[0]));
  const lote = rota.spans.find(x => x.sql?.startsWith('SELECT memoria_id, nucleo_id FROM memoria_nucleos')).sql.trim().split(/\n(?=SELECT)/);
  let leituraLote=0;
  for (const trecho of lote) {
    const atual = trecho.replace('?',`'${ids}'`);
    const a = await sql(atual);
    leituraLote += som(a).l;
    const candidatos = [];
    const nomes = ['memoria_nucleos','memoria_integrantes','fotos','relatos','capitulo_memorias','tema_memorias'];
    const tabela = nomes.find(t => atual.includes('FROM '+t+' ') || atual.includes('FROM '+t+'\n'));
    const semIndice = tabela === 'capitulo_memorias' ? atual.replace('FROM capitulo_memorias cm', 'FROM capitulo_memorias cm NOT INDEXED') : atual.replace('FROM '+tabela, 'FROM '+tabela+' NOT INDEXED');
    const b = await sql(semIndice);
    if (ordenar(a)!==ordenar(b)) throw Error('Mudou o lote');
    const porMemoria = r => {
      const i = r.results.columns.indexOf('memoria_id');
      const grupos = Object.groupBy(r.results.rows, row => row[i]);
      return JSON.stringify(Object.entries(grupos).sort(([a],[b]) => a.localeCompare(b)));
    };
    candidatos.push({...som(b), ordemPorMemoriaIgual:porMemoria(a)===porMemoria(b)});
    console.log(JSON.stringify({trecho:trecho.split('\n')[0],medida:som(a),candidatos,plano:(await sql('EXPLAIN QUERY PLAN '+atual)).results.rows}));
  }
  console.log(JSON.stringify({leituraLote}));
  const pessoas = rotas.find(x => x.como==='gui' && x.caminho==='/pessoas').spans.find(x=>x.sql.startsWith('SELECT mi.integrante_id')).sql.replaceAll('?1',"'gui'");
  const p = pessoas.replace(/JOIN nucleo_membros nm ON nm.nucleo_id = mn.nucleo_id\s+WHERE mn.memoria_id = m.id AND nm.integrante_id = 'gui' AND nm.papel = 'membro'/, `WHERE mn.memoria_id = m.id AND mn.nucleo_id IN (SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = 'gui' AND papel = 'membro')`);
  if (p===pessoas) throw Error('Predicado não encontrado');
  const a = await sql(pessoas), b = await sql(p);
  if (ordenar(a)!==ordenar(b)) throw Error('Mudou o total de cada pessoa');
  console.log(JSON.stringify({pessoas:{atual:som(a),porNucleoUmaVez:som(b)}}));
}
if (process.argv.includes('--por')) {
  const q = "CREATE INDEX mem13_r_por ON relatos(por, memoria_id) WHERE situacao = 'publicada'";
  console.log(JSON.stringify({q,medida:som(await sql(q))}));
}
if (process.argv.includes('--copia')) {
  const fs = await import('node:fs');
  const origem = process.argv[process.argv.indexOf('--copia')+1];
  const rotas = fs.readFileSync(origem,'utf8').trim().split('\n').map(JSON.parse).filter(r=>r.caminho.startsWith('/api/copia?'));
  const base = rotas[0].spans.find(r=>r.sql.startsWith('SELECT name FROM sqlite_master')).sql;
  const antes = som(await sql(base)).l;
  const depois = new Map();
  for (const rota of rotas) {
    const t = new URL(rota.caminho,'http://127.0.0.1').searchParams.get('tabela');
    if (!/^[a-z_]+$/.test(t)) throw Error(`Tabela inesperada: ${t}`);
    if (depois.has(t)) continue;
    const r = await sql(base.replace('ORDER BY name',`AND name = '${t}' LIMIT 1`));
    if (r.results.rows.length !== 1 || r.results.rows[0][0]!==t) throw Error('Tabela mudou');
    depois.set(t,som(r).l);
  }
  const poupa = rotas.map(x => antes - depois.get(new URL(x.caminho,'http://127.0.0.1').searchParams.get('tabela')));
  console.log(JSON.stringify({partes:rotas.length, antes, min:Math.min(...poupa), max:Math.max(...poupa), total:poupa.reduce((a,b)=>a+b,0), fotos:depois.get('fotos')}));
}
```
<!-- script:sql.mjs:fim -->
