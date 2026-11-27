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

No Wrangler 4.160, na base com semente limpa, os pedidos quentes falharam em 19 a 49 ms. O log confirmou erro de SQL. Na homologação, a consulta de Workers Observability para o intervalo de 15h35 a 15h50 encontrou `/capitulos` às 15h38min30s com HTTP 200, 1.736 ms de tempo de parede e 43 ms de CPU, com resultado `ok`. A consulta de invocações de 15h39 a 15h45 veio vazia. O pedido que o Gui viu falhar por volta das 15h40 ficou sem causa confirmada. Os registros disponíveis deixam em aberto SQL, tempo e CPU para aquele pedido.

### Resposta de erro e leitura do período

O build em modo produção já ocultava a mensagem interna. [`provar-erro-500.mjs`](../../../scripts/provar-erro-500.mjs) testa isso com um banco local vazio e descartável. O teste força um erro do D1 no preparo do banco. A página `/capitulos` e a API `/api/copia` devolvem HTTP 500 sem o texto que aparece no log do servidor. Para repetir, inicie o Wrangler local com `--var AMBIENTE:producao` e `--persist-to` apontando para uma pasta nova.

O conserto por si só baixou o agregado de 13.934 para 13.482 linhas lidas para Gui e Elizete, e de 14.595 para 14.120 para Lucas Magno. O SQL ficou com 6.395 bytes no `medir-capitulos-mem8.mjs --exigir-uma-leitura`. Testei também iniciar os cruzamentos do período pelos capítulos filtrados. Os 52 HTMLs passaram, mas a economia adicional foi de 1.162 linhas por página para Gui e Elizete e de 1.222 para Lucas Magno. A auditoria mediu 1.347 na consulta anterior, com outra carga de teste. Deixei o cruzamento como estava porque a medição da variante não repetiu as 1.347 linhas.
