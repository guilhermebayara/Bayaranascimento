# Cuidados que já custaram tempo

Para as sessões do Claude Code. Os cuidados do CSS e do navegador (a banda do Safari no iPhone, a ordem do CSS, o movimento reduzido) estão em `docs/visual.md`, "Cuidados que custaram tempo"; os do Cloudflare ("Apply to existing Previews"), em `docs/publicar.md`.

- O GraphQL do GitHub não funciona nas sessões: use `gh api repos/guilhermebayara/Bayaranascimento/...` (REST).
- Para saber se a prévia publicou: `gh api repos/guilhermebayara/Bayaranascimento/commits/<sha>/check-runs`.
- Merge de PR pela API: `gh api -X PUT repos/guilhermebayara/Bayaranascimento/pulls/<n>/merge -f merge_method=squash`. Abrir PR: `gh api repos/.../pulls -f head=<branch> -f base=main ...` (o `gh pr` usa GraphQL).
- Apagar uma branch já incorporada: as sessões não conseguem pelo git nem pela API. Use a página Branches do GitHub no navegador, com a autorização que o Gui já deu: na página Branches, um `fetch` com `method: 'DELETE'` para `/guilhermebayara/Bayaranascimento/branches/<branch>` e o cabeçalho `GitHub-Verified-Fetch: true` apaga a branch sem clicar em cada uma.
- O clone das sessões é raso e só traz uma branch. Para comparar com outra: `git fetch --depth=50 origin +refs/heads/<branch>:refs/remotes/origin/<branch>`.
- O servidor local (`npm run dev`) para entre uma conversa e outra: suba de novo antes de conferir.
- No computador, a página "Espelho da produção" também aparece, para testar o espelho. Ele troca todo o banco local; para voltar ao acervo de exemplo, apague a pasta `.wrangler`.
- As prévias leem a mesma configuração do `wrangler.jsonc`, no bloco `previews`. É ele que separa os dados de teste dos reais.
- O Playwright vem instalado globalmente: rode os scripts com `NODE_PATH=$(npm root -g) node arquivo.js`.
- Para ver uma prévia como o Gui vê, use o navegador embutido do app. O `curl` das sessões não alcança os domínios do site.
