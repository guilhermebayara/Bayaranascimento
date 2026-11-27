# MEM-15 · Correções do QA da homologa

27/11/2026. Base `892d469`, confirmada com `git ls-remote` antes da primeira gravação. O [QA da MEM-14](2026-11-27-qa-homologa.md), seu [roteiro](../../../scripts/qa-homologa-2026-11-27.mjs) e a [auditoria da MEM-13](../../auditoria/2026-11-27-complexidade.md) entraram com o conteúdo das branches de origem.

## Capítulos (L1)

O bisect dos três commits no Astro local, com a semente limpa, deu HTTP 200 nas oito combinações em `e2b478e` e HTTP 500 em todas em `f7b2f53` e `892d469`. A regressão entrou em [`f7b2f53`, MEM-6](https://github.com/guilhermebayara/Bayaranascimento/commit/f7b2f539eca933d707ba8f4ce240a544a2a273fc), que passou a calcular as pontas dos trilhos no SQL agregado. O `EXISTS` da faixa de um capítulo por período referenciava `do_trilho` pela segunda vez. O SQLite expandia de novo a cadeia de CTEs das memórias próprias e atingia seu limite de expansão de subconsultas. A MEM-8 reaproveitou os vínculos diretos. A falha já existia antes dela.

Agora as pontas agrupam as posições do trilho e as posições do período na mesma faixa. O grupo só entra se tiver pelo menos uma posição do trilho. Com isso, a consulta agrega as duas pontas sem expandir a mesma cadeia de novo. Continua com tamanho fixo, uma referência a `capitulo_memorias` e no máximo dois termos em cada `SELECT` composto. O filtro de `quem-ve.ts` é o mesmo. Os dois gabaritos passaram com **52 de 52 HTMLs iguais byte a byte** ao compilar a base e a correção com cópias do mesmo estado local.

| Motor local | Semente limpa, antes → depois | Carga com fotos, antes → depois |
| --- | --- | --- |
| `npm run dev`, workerd `1.20261110.1` | 8 × 500 → 8 × 200 | 8 × 500 → 8 × 200 |
| `wrangler dev --local` 4.162, workerd `1.20261113.1` | 8 × 200 → 8 × 200 | 8 × 200 → 8 × 200 |

O teste [`provar-capitulos-d1.mjs`](../../../scripts/provar-capitulos-d1.mjs) verifica o estado do D1 e faz os oito pedidos HTTP, para Gui, Elizete, Giovanna e Lucas Magno em `/capitulos` e `/capitulos/natais`. A segunda rodada usa `carga-local.mjs --fotos=exemplo` e a opção `--carga` no teste. O build original também devolveu 500 no Wrangler 4.160 com a semente limpa, usando o mesmo workerd do Astro. O log ali registrou `VIEWs and/or subqueries nested too deep`.

### Tempo e falha na homologação

Mediana de cinco pedidos locais quentes do Gui, do início até o fim da resposta, em milissegundos. A semente tem 54 memórias. A carga tem 654 memórias e 3.080 fotos. Os processos locais compartilharam a máquina durante parte da medição.

| Processo | `/capitulos` limpa / carga | `/capitulos/natais` limpa / carga |
| --- | ---: | ---: |
| Wrangler 4.162, base | 86 / 108 | 55 / 102 |
| Wrangler 4.162, correção | 42 / 42 | 49 / 53 |
| Astro, correção | 210 / 219 | 216 / 300 |

No Wrangler 4.160, na base com semente limpa, os pedidos quentes falharam em 19 a 49 ms. O log confirmou erro de SQL. Na homologação, Gui confirmou às 15h54 que a página abriu e que a observação era a demora. O Workers Observability registrou `/capitulos` às 15h38min30s com HTTP 200, 1.736 ms de tempo de parede e 43 ms de CPU, com resultado `ok`. Esse registro é compatível com a demora relatada. A reprodução do L1 é local.

O perfil de CPU usou o build do Worker no Wrangler 4.162, com cinco pedidos quentes por combinação. Cada célula traz **tempo até o fim do corpo / CPU amostrada / tempo D1 do `Server-Timing`**, em milissegundos. O tempo do D1 soma operações que podem acontecer em paralelo. O perfil pelo inspetor também acrescenta trabalho. Os pedidos todos responderam 200.

| Perfil | Página | Base limpa | Base com carga | Correção limpa | Correção com carga |
| --- | --- | ---: | ---: | ---: | ---: |
| Gui | `/capitulos` | 46,7 / 40,1 / 31 | 58,3 / 54,2 / 44 | 53,6 / 37,2 / 36 | 50,4 / 37,6 / 42 |
| Gui | `/capitulos/natais` | 61,8 / 51,0 / 48 | 72,7 / 58,8 / 68 | 70,6 / 58,5 / 45 | 79,2 / 43,3 / 77 |
| Elizete | `/capitulos` | 56,9 / 34,0 / 34 | 46,8 / 39,4 / 38 | 173,7 / 156,4 / 130 | 52,1 / 47,5 / 42 |
| Elizete | `/capitulos/natais` | 40,5 / 41,8 / 37 | 69,1 / 65,7 / 76 | 185,0 / 78,5 / 82 | 67,0 / 52,8 / 70 |
| Giovanna | `/capitulos` | 60,2 / 47,6 / 36 | 40,1 / 36,2 / 33 | 39,9 / 28,1 / 32 | 50,4 / 47,6 / 48 |
| Giovanna | `/capitulos/natais` | 52,4 / 41,7 / 45 | 59,6 / 56,5 / 62 | 53,4 / 37,3 / 40 | 83,6 / 48,4 / 93 |
| Lucas Magno | `/capitulos` | 42,1 / 38,9 / 32 | 43,6 / 38,8 / 38 | 31,0 / 23,0 / 24 | 62,1 / 56,0 / 55 |
| Lucas Magno | `/capitulos/natais` | 57,2 / 33,6 / 38 | 57,8 / 53,5 / 61 | 35,4 / 19,4 / 34 | 75,1 / 53,5 / 77 |

O perfil segue [`medir-cpu.mjs`](../../../scripts/desempenho/medir-cpu.mjs), com `--fase paginas --so '^(Capítulos|Capítulo reunido)' --pessoas gui,elizete,giovanna,lucas-magno --repeticoes 5`. A rodada também leu `d1;dur` do cabeçalho de cada resposta. Os tempos locais variaram entre rodadas. A amostra de homologação mede o percurso real da requisição, com mais de um segundo de tempo de parede e 43 ms de CPU. A origem da espera restante segue em aberto.

### Resposta de erro e leitura do período

O build em modo produção já ocultava a mensagem interna. [`provar-erro-500.mjs`](../../../scripts/provar-erro-500.mjs) testa isso com um banco local vazio e descartável. O teste força um erro do D1 no preparo do banco. A página `/capitulos` e a API `/api/copia` devolvem HTTP 500 sem o texto que aparece no log do servidor. Para repetir, inicie o Wrangler local com `--var AMBIENTE:producao` e `--persist-to` apontando para uma pasta nova.

O conserto por si só baixou o agregado de 13.934 para 13.482 linhas lidas para Gui e Elizete, e de 14.595 para 14.120 para Lucas Magno. O SQL ficou com 6.395 bytes no `medir-capitulos-mem8.mjs --exigir-uma-leitura`. Testei também iniciar os cruzamentos do período pelos capítulos filtrados. Os 52 HTMLs passaram, mas a economia adicional foi de 1.162 linhas por página para Gui e Elizete e de 1.222 para Lucas Magno. A auditoria mediu 1.347 na consulta anterior, com outra carga de teste. Deixei o cruzamento como estava porque a medição da variante não repetiu as 1.347 linhas.

## Ficha antiga de memória na lixeira (E1)

Quando a ficha tem o código de uma memória que já foi para a lixeira, o formulário responde HTTP 404 com “Memória não encontrada.”, como o JSON. O teste envia a ficha nos dois formatos depois de excluir a memória e confere a impressão do banco inteiro.

## Repetição do envio no limite (E2)

O formulário confere o código do envio já gravado antes de contar os parágrafos novos. O lote continua protegendo dois envios que cheguem juntos. A prova envia 199 mensagens, completa as 200, repete o envio e faz outro com texto novo e o mesmo código da página. O primeiro caso repete o sucesso. O segundo é recusado e o banco fica igual.

## Texto recusado na janela do relato (N1)

A rota sem script devolve a própria janela com o recado e o texto que chegou no pedido, tanto no limite de mensagens quanto nas outras recusas em que o formulário ainda existe. O texto fica só no pedido que devolve a página. O navegador recebe o código HTTP da recusa. Se a memória saiu do alcance de quem escrevia, ou a autoria ficou bloqueada enquanto a pessoa escrevia, a página já não oferece a caixa daquele relato. Devolver o texto nesses casos exige uma decisão sobre onde mostrá-lo.

## Recados de limite (E4)

Memórias, relatos e “Acrescentar fotos” usam os mesmos nomes de campos e recados de limite. O número vem do esquema da rota. A prova de cada campo em `pedido-recusado.test.ts` confere HTTP 400, o recado em português e o banco intacto. A ficha e a janela sem JavaScript também devolvem HTTP 400 com o recado na página.

## Testes acima de cinco segundos

A matriz da árvore de meio-irmãos agora tem um caso por centro, com os mesmos 16 subconjuntos de laços em cada um. A cópia oficial restaura separadamente os relatos de 80, 81 e 200 mensagens. A prova que leva o mesmo relato de 80 a 81 e depois a 200, recusando 201, também faz uma viagem completa pela cópia após a recusa. Continuam as provas de hora do envio, citação, ordem, texto e anexos restaurados.

A execução padrão também encontrou dois timeouts além dos apontados na auditoria. A prova do namoro na árvore foi dividida por combinação de laços abertos. A equivalência da cópia de retrato passou a ter um caso por leitor, com as mesmas chaves e a conferência de respostas permitidas e recusadas. Os limites dos testes e a configuração de workers seguem os do projeto.

| Caso | Antes | Depois |
| --- | ---: | --- |
| Meio-irmãos | 12,752 s, timeout | Padrão 3,292 s, Gui 1,139 s, Giovanna 1,092 s, Lucas Magno 0,170 s, Elizete 1,094 s |
| Cópia com citações e anexos | 7,242 s, timeout | 80 mensagens 0,982 s, 81 mensagens 0,664 s, 200 mensagens 0,743 s, transição e recusa 0,937 s |
| Namoro na árvore | 7,104 s, timeout | Cinco casos entre 0,172 s e 0,697 s |
| Equivalência da cópia do retrato | 10,921 s, timeout | 39 casos, até 0,194 s por leitor |

`npm test` com os workers padrão levou 34,21 s. Foram **2.668 testes, 2.625 aprovados, zero falhas e 43 ignorados**. Os ignorados são os testes de navegador que exigem um servidor local. As duas novas provas da caixa de relato foram executadas à parte no Chromium sem JavaScript.

`npm run confere` e `npm run build` passaram. O prebuild repetiu a suíte padrão com o mesmo resultado. A execução dos dois gabaritos no build completo confirmou 46 de 46 no primeiro roteiro e 6 de 6 no complemento de Capítulos.
