# Publicar o site

## Ambientes

| Ambiente | Endereço | Dados | Login |
| --- | --- | --- | --- |
| Produção | memorias.bayara.com.br | Banco e bucket `bayara-memorias` | Cloudflare Access |
| Homologação (branch `homologa`) | homologa.memorias.bayara.com.br | Banco e bucket `bayara-memorias-homologa`, com o espelho da produção | Cloudflare Access (aplicação "memorias homologa", política "Homologação"), com troca de pessoa no topo |
| Prévia de branch | `<branch>.memorias.bayara.com.br` (ex.: `tst-arvore.memorias.bayara.com.br`) | Banco e bucket `bayara-memorias-teste`, só exemplos | Sem login, com troca de pessoa no topo |
| Computador | localhost | Banco local, só exemplos | Sem login, com troca de pessoa no topo |

O branch `main` é a produção. Qualquer outro branch vira uma prévia. A homologação é a prévia da branch `homologa`: o site reconhece o endereço dela e usa o banco e o bucket próprios (`DB_HOMOLOGA` e `FOTOS_HOMOLOGA`, ligados no bloco `previews` do `wrangler.jsonc`). O login dela é uma aplicação própria no Access, só com o Gui e a Giovanna.

## Configuração no Cloudflare

No projeto `bayaranascimento` → Settings:

- **Build command:** `npm run build`. Antes do build ele roda a guarda da produção e os testes (`prebuild`); se algo falhar, nada é publicado e a versão anterior continua no ar.
- **Deploy command:** `npx wrangler deploy`
- **Prévias (aba Previews Base):** Build command vazio e Preview command `npm run build && npx wrangler preview`. O campo Build command das prévias não era executado, por isso o build vai junto no comando de prévia. Ao mudar algo nessa aba, salvar com "Apply to existing Previews", senão só vale para branches novos.
- **Segredo `ACESSOS`** (Variables and Secrets, tipo Secret): um JSON em uma linha ligando cada e-mail de login ao integrante.

  ```json
  {"email-do-gui":"gui","email-da-giovanna":"giovanna"}
  ```

  Os e-mails precisam ser os mesmos da política do Cloudflare Access. Os valores são os ids dos integrantes no banco.

Para dar acesso a mais alguém: acrescentar o e-mail na política do Access e no segredo `ACESSOS`.

## Rodar no computador

```sh
cp .dev.vars.exemplo .dev.vars
npm install
npm run dev
npm test
```

O banco local nasce com as memórias de exemplo, mesmo sem o `.dev.vars`: no computador o site sempre se considera em desenvolvimento. Para recomeçar do zero, apague a pasta `.wrangler`.

## Mudar a estrutura do banco

Acrescente uma migração no fim da lista em `src/lib/servidor/banco.ts`. Nunca edite uma migração já publicada. O site aplica a nova estrutura sozinho na primeira visita depois da publicação.
