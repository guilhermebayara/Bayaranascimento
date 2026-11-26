# Memórias Bayara e Bracarense

Acervo de memórias da família, em [memorias.bayara.com.br](https://memorias.bayara.com.br). Site privado, feito em Astro.

## Como está organizado

- `CLAUDE.md`: regras de trabalho para as sessões do Claude
- `docs/decisoes.md`: o índice das regras e a fila de trabalho (o que está decidido a construir e o que ainda está em aberto)
- `docs/regras/`: as regras combinadas, um arquivo por assunto
- `docs/visual.md`: a direção visual, o sistema e o desenho de cada tela
- `docs/qa.md` e `docs/qa-ux.md`: as sessões de QA
- `docs/historico/`: o processo, as datas, as rodadas de QA fechadas e os mapas das reduções
- `docs/publicar.md`: configuração no Cloudflare e como rodar no computador
- `src/lib/servidor/`: banco, regras de permissão e login
- `src/pages/`: as páginas e as rotas de envio
- `testes/`: os testes, que cobrem quase todo o site
- `scripts/confere-producao.mjs`: a guarda que protege o acervo real, rodada antes de todo build

Este repositório guarda só o código. As memórias, os relatos e as fotos ficam no banco de dados e no bucket do Cloudflare.
