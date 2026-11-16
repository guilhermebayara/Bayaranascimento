# Memórias Bayara e Bracarense

Acervo de memórias da família, em [memorias.bayara.com.br](https://memorias.bayara.com.br). Site privado, feito em Astro.

## Como está organizado

- `CLAUDE.md`: regras de trabalho para as sessões do Claude, inclusive as de QA
- `docs/decisoes.md`: as regras combinadas e o que ainda está em aberto
- `docs/publicar.md`: ambientes, configuração no Cloudflare e como rodar no computador
- `src/lib/servidor/`: banco, regras de permissão e login
- `src/pages/`: as páginas e as rotas de envio
- `testes/`: testes das regras de permissão, das datas, do login, do parentesco e da árvore
- `scripts/confere-producao.mjs`: a guarda que protege o acervo real, rodada antes de todo build

Este repositório guarda só o código. As memórias, os relatos e as fotos ficam no banco de dados e no bucket do Cloudflare.
