# Ativar os formulários

O branch `formulario` acrescenta ao site o envio de memórias, relatos e fotos. Enquanto os dois segredos abaixo não existirem, as páginas aparecem mas não salvam nada.

## 1. Token do GitHub

O site grava os textos neste repositório. Para isso precisa de um token que só enxerga este repositório.

1. No GitHub: Settings (da sua conta) → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
2. Repository access: **Only select repositories** → `Bayaranascimento`.
3. Permissions → Repository permissions → **Contents: Read and write**. Nenhuma outra.
4. Validade: a maior disponível. Anote a data: quando vencer, os formulários param de salvar e é só gerar outro.
5. Copie o token.

## 2. Segredos no Cloudflare

No projeto `bayaranascimento` → Settings → Variables and Secrets, crie dois itens do tipo **Secret**:

- `GITHUB_TOKEN`: o token do passo 1.
- `ACESSOS`: um JSON em uma linha ligando cada e-mail de login à pessoa no acervo:

  ```json
  {"email-do-gui":"gui","email-da-giovanna":"giovanna","email-da-elizete":"elizete"}
  ```

  Os e-mails precisam ser os mesmos da política do Cloudflare Access. Os valores (`gui`, `giovanna`, `elizete`) são os nomes dos arquivos em `src/content/pessoas/`.

## 3. Publicar

Depois de revisar, incorpore o branch `formulario` ao `main`. O Cloudflare publica sozinho.

Confira no painel se o comando de build é `npm run build` e o de deploy é `npx wrangler deploy`.

## 4. Testar no ar

1. Abra `memorias.bayara.com.br/nova`. Deve aparecer "Olá, Gui".
2. Registre uma memória de teste com uma foto.
3. Em cerca de dois minutos ela aparece na linha do tempo.
4. Abra a memória e use "Escrever ou editar o meu relato".

Se aparecer "Não consegui identificar quem você é", o e-mail do login não está no `ACESSOS`.

## O que cada envio faz

- As fotos são reduzidas no próprio aparelho (lado maior de 2400 px) e vão para o bucket `bayara-memorias`.
- Os textos viram arquivos neste repositório, em um commit assinado com o nome de quem enviou. Esse histórico é a base do futuro "log de mudanças".
- O commit dispara uma nova publicação do site. Por isso a memória leva um ou dois minutos para aparecer.

## Rodar no computador

```sh
cp .dev.vars.exemplo .dev.vars
npm run github-falso   # em um terminal: imita o GitHub e grava nesta pasta
npm run dev            # em outro
npm test               # testes das regras de permissão, dos arquivos e do login
```

Em desenvolvimento não há login. `DEV_PESSOA` no `.dev.vars` define quem você é.
