# Publicar o site

## Ambientes

| Ambiente | Endereço | Dados | Login |
| --- | --- | --- | --- |
| Produção | memorias.bayara.com.br | Banco e bucket `bayara-memorias` | Cloudflare Access |
| Prévia de branch | endereço que o Cloudflare gera para cada branch | Banco e bucket `bayara-memorias-teste`, só exemplos | Sem login, com troca de pessoa no topo |
| Computador | localhost | Banco local, só exemplos | Sem login, com troca de pessoa no topo |

O branch `main` é a produção. Qualquer outro branch vira uma prévia.

## Configuração no Cloudflare

No projeto `bayaranascimento` → Settings:

- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- **Comando de deploy de outros branches:** `npx wrangler preview`
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

O banco local nasce com as memórias de exemplo. Para recomeçar do zero, apague a pasta `.wrangler`.

## Mudar a estrutura do banco

Acrescente uma migração no fim da lista em `src/lib/servidor/banco.ts`. Nunca edite uma migração já publicada. O site aplica a nova estrutura sozinho na primeira visita depois da publicação.
