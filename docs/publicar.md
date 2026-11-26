# Publicar o site

## Ambientes

A tabela dos ambientes (produção, homologação, prévias e computador) está no `CLAUDE.md`, "Branches e publicação".

O branch `main` é a produção. Qualquer outro branch vira uma prévia. A homologação é a prévia da branch `homologa`: o site reconhece o endereço dela e usa o banco e o bucket próprios (`DB_HOMOLOGA` e `FOTOS_HOMOLOGA`, ligados no bloco `previews` do `wrangler.jsonc`). O login dela é uma aplicação própria no Access ("memorias homologa", política "Homologação"), só com o Gui, a Giovanna e o Magno.

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

### Duração do login

Quanto tempo a pessoa fica logada é do Cloudflare Access, fora do site. O Gui quer o máximo (Gui, 17/11), para a família não precisar pedir código toda hora. No painel Zero Trust, em Access → Applications, abra a aplicação da produção, depois a "memorias homologa", e em "Session Duration" escolha o maior valor da lista (um mês). Se a conta tiver um limite geral de sessão (em Settings → Authentication), ele também precisa ser o máximo. Não gera custo.

## Rodar no computador

```sh
cp .dev.vars.exemplo .dev.vars
npm install
npm run dev
npm test
```

O banco local nasce com as memórias de exemplo, mesmo sem o `.dev.vars`: no computador o site sempre se considera em desenvolvimento. Para recomeçar do zero, apague a pasta `.wrangler`.

## Mudar a estrutura do banco

As regras estão no `CLAUDE.md`, "Banco de dados".
