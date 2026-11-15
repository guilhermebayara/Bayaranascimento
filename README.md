# Bayara Nascimento

Acervo de memórias da família, em [memorias.bayara.com.br](https://memorias.bayara.com.br). Site privado, feito em Astro.

## Rodar no computador

```sh
npm install
npm run dev
```

## Como adicionar uma memória

Crie um arquivo em `src/content/memorias/`, com o nome no formato `ano-titulo-curto.md`:

```md
---
titulo: Festa de aniversário no quintal
ano: 1994
mes: 8            # opcional
dia: 14           # opcional
aproximada: false # true quando a data for uma estimativa
tipo: aniversario
pessoas: [gui, giovanna, elizete]
lugar: Belo Horizonte
criadaPor: gui
fotos:
  - src: https://...
    legenda: A mesa do bolo
    chave: true   # a foto que aparece na linha do tempo
---
```

## Como adicionar um relato

Cada pessoa conta a memória do seu jeito, em um arquivo próprio: `src/content/relatos/<memoria>/<pessoa>.md`.

```md
---
memoria: 1994-festa-de-aniversario
por: elizete
---

Eu fiz o bolo na véspera e quase não dormi.
```

A regra da casa: qualquer pessoa pode acrescentar o seu relato a uma memória, e só quem escreveu pode editar o próprio relato.

- **Pessoas** ficam em `src/content/pessoas/`. O nome do arquivo é o identificador usado nas memórias.
- **Tipos de marco** ficam em `src/data/tipos.ts`.
- Memórias com `exemplo: true` são só para teste. Quando todas forem apagadas, o aviso do topo some.
- `rascunho: true` esconde a memória do site.

## Próximas etapas

1. Publicar no Cloudflare com login por e-mail (Cloudflare Access)
2. Bucket R2 para as fotos e carga inicial
3. Formulário para a família adicionar memórias pelo celular
