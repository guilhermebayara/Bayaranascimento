# Fotos e áudios de exemplo

## Fotos de exemplo

`src/lib/fotos-de-exemplo.ts`, `src/lib/servidor/fotos-de-exemplo.ts`, testes em `testes/fotos-de-exemplo.test.ts`.

- O acervo de exemplo não tem foto vazia: tudo o que pede foto usa uma das 11 fotos do Chico e da Karol, os cachorros. As cópias reduzidas (1600 px, JPEG) estão em `exemplos/fotos/` (`chico-1.jpg` a `chico-5.jpg`, `karol-1.jpg` a `karol-6.jpg`); os originais ficam na pasta do Drive.
- Retrato de quem é tratado como "ela": uma foto da Karol. De quem é tratado como "ele": uma foto do Chico. Bichinhos e "Não informar": de um dos dois. Fotos das memórias: de um dos dois. O recorte quadrado do retrato é feito na tela.
- O sorteio é fixo, tirado do id do registro (da memória e da posição da foto), para a mesma pessoa e a mesma memória sempre mostrarem a mesma foto e as capturas serem comparáveis.
- O bucket de teste guarda só essas 11 fotos (e as cópias menores delas), debaixo de `exemplos/`, e toda foto e todo retrato de exemplo apontam para um dos 11 arquivos, sem cópia por registro.
- **Envio:** `npm run fotos-de-exemplo -- <endereço de uma prévia ou http://localhost:4321>` (`scripts/enviar-fotos-de-exemplo.mjs`). A rota `/api/fotos-de-exemplo` só existe nas prévias de teste e no computador e só aceita os 11 arquivos, conferidos pelo SHA-256. Basta uma vez para as prévias, que dividem o bucket; no computador, uma vez por banco local novo. `exemplos/` fica fora de `src/` e de `public/`, para nada pesar no pacote.
- **Cópias menores**: a pequena e a média de cada foto de exemplo ficam em `exemplos/fotos/copias/` (feitas uma vez por `scripts/copias-das-fotos-de-exemplo.mjs`, com o SHA-256 e as medidas em `COPIAS_DE_EXEMPLO`), sobem pelo mesmo envio e moram ao lado das fotos, debaixo de `exemplos/`. A homologação só lê. Enquanto não forem enviadas a um bucket, a rota da cópia entrega a foto inteira.
- **Semente:** as fotos de exemplo com chave vazia passam a apontar para uma das 11, e cada pessoa e bichinho ganha um retrato de exemplo, uma vez só (quem tirar ou trocar um retrato ao testar não o vê voltar). Roda dentro da proteção das memórias de exemplo. Quem é cadastrado depois começa sem retrato, com as iniciais.
- **Homologação:** o espelho aponta as fotos das memórias de exemplo (de nenhuma a três por memória) para as mesmas 11 fotos, com o mesmo sorteio, e lê os arquivos de `exemplos/` no bucket de teste, só leitura (`bucketDosExemplos`). Os retratos das pessoas também são das 11 fotos, sorteados pelo id como nas prévias (`retratoDeExemplo`). O bucket `bayara-memorias-homologa` recebe só o que for enviado ao testar, e o banco da homologação continua sem o acervo de exemplo.
- **Limpeza do bucket de teste:** fotos e retratos enviados nas prévias (fora de `exemplos/`) são apagados depois de 7 dias, e o registro passa a apontar para uma foto de exemplo, pelo mesmo sorteio. Os áudios ficam de fora (já têm o teto de 200 MB), e nada de `exemplos/` é apagado. Roda junto da semente, no máximo uma vez por dia (marca na tabela `limpezas_do_teste`, que só existe no banco de teste), e um erro nela nunca derruba o site. O motivo dos 7 dias: o plano gratuito do R2 vai até 10 GB, somando a produção, a homologação e todas as prévias, e cada prévia de teste é descartável; sem a faxina, as fotos enviadas ao testar ocupariam a cota que é da família (`limparBucketDeTeste`, em `src/lib/servidor/fotos-de-exemplo.ts`).
- A guarda da produção falha se as fotos de exemplo puderem chegar ao pacote (arquivo em `src/` ou `public/`, ou código importando de `exemplos/`), se a produção puder ler o bucket dos exemplos, se a leitura da homologação puder gravar ou apagar, ou se a limpeza ou o envio puderem rodar na produção ou na homologação.

Origem: [histórico, "Fotos de exemplo"](../historico/decisoes-ate-2026-11-17.md#fotos-de-exemplo-o-chico-e-a-karol); [depois de 17/11](../historico/decisoes-depois-de-2026-11-17.md#fotos-de-exemplo).

## Áudios de exemplo

`src/lib/audios-de-exemplo.ts`, testes em `testes/audios-de-exemplo.test.ts`.

- Três áudios curtos (de 11 a 14 segundos), para os áudios aparecerem na memória e em "Nas palavras de Fulano", na página da pessoa: dois nos relatos da Vó Bela ("A chegada do Gui" e "A receita do pão de queijo da Vó Bela") e um no da Vó Vivica ("Casamento da Vó Vivica e do Vô Tonho"). São voz sintetizada (espeak-ng, pt-br), nunca de alguém da família, e a fala começa por "Áudio de exemplo, com voz sintetizada". A transcrição é o que a voz diz.
- Os arquivos (M4A, cerca de 50 KB) ficam em `exemplos/audios/`, fora de `src/` e de `public/`. No banco, a chave é `exemplos/<nome>.m4a`; no bucket de teste, `audios/exemplos/<nome>.m4a`.
- Chegam ao bucket de teste pelo mesmo envio das fotos de exemplo, que só aceita esses arquivos, conferidos pelo SHA-256.
- **Semente:** `semearAudiosDeExemplo`, em `src/lib/servidor/semente.ts`, dentro da proteção das memórias de exemplo, confere o ambiente de novo e entra uma vez só: quem remover um ao testar não o vê voltar.
- A rota `/audios/` só serve a chave de um áudio de exemplo onde há acervo de exemplo, e continua conferindo quem pode ouvir. A produção e a homologação nunca recebem esses áudios, o espelho não os leva e a limpeza de 7 dias não os apaga.
- A guarda da produção falha se um arquivo de áudio aparecer em `src/` ou `public/`, se `exemplos/audios/` tiver arquivos diferentes da lista, se a semente deixar de conferir o ambiente, se a rota servir a chave de exemplo fora das prévias ou se o espelho passar a usar os áudios de exemplo.

Origem: [histórico, "Áudios de exemplo"](../historico/decisoes-ate-2026-11-17.md#áudios-de-exemplo-voz-sintetizada).
