# Conferências: a guarda, os testes e o build

## Conferências

O plano gratuito do GitHub não protege branches de repositório privado. As regras que não podem falhar ficam no próprio repositório e travam a publicação. Os comandos estão no `CLAUDE.md`, "Conferências"; aqui fica o que cada um confere.

### A guarda da produção

`npm run confere` (`scripts/confere-producao.mjs`) falha:

- se a produção deixar de usar o banco e o bucket reais ou de se declarar `producao`, se uma prévia apontar para o banco ou o bucket reais, se a homologação dividir banco ou bucket com a produção ou com as prévias de teste, ou se a produção enxergar o banco da homologação;
- se as memórias de exemplo puderem rodar na produção ou na homologação;
- se as fotos de exemplo puderem chegar ao pacote ou ao bucket da produção, se a homologação puder fazer no bucket de teste algo além de ler o prefixo `exemplos/`, ou se a limpeza de 7 dias do bucket de teste puder rodar na produção ou na homologação (os áudios de exemplo seguem as mesmas regras; ver [`exemplos.md`](exemplos.md#fotos-de-exemplo));
- se aparecer um e-mail de verdade em arquivo versionado, ou se um arquivo de segredo local for versionado;
- se as telas do conceito da revisão visual (a rota `/conceito`, que hoje não existe) voltarem sem a trava do servidor que só as deixa responder onde há acervo de exemplo (regra 8);
- se a página do sistema, que existe em todos os ambientes, abrir para quem não é administrador fora das prévias de teste, ler o acervo ou usar fotos de exemplo (regra 9);
- se o código apagar arquivo do bucket das fotos fora da limpeza do bucket de teste e da rota das fotos sem memória (`src/pages/api/fotos-soltas.ts`, que só os administradores usam, que nunca apaga uma foto de exemplo nem uma de menos de 30 dias e que apaga as cópias de uma foto só junto com ela, `scripts/apagar-no-bucket.mjs`), ou ler `env.DB` e `env.FOTOS` fora de `ambiente.ts`;
- se uma migração apagar uma tabela da qual outra ainda depende com exclusão em cascata, ou com `ON DELETE SET NULL` ou `SET DEFAULT` (`scripts/migracoes.mjs`: a cascata levaria as linhas da outra junto, e o `SET NULL` anularia as chaves dela, mesmo com `defer_foreign_keys`), valendo também para a chave que entrou por `ALTER TABLE ... ADD COLUMN ... REFERENCES`;
- se a cópia para o espelho ler algo além das tabelas da família, coluna por coluna, ou o espelho aceitar outro arquivo (regra 11, `scripts/copia-para-o-espelho.mjs`; ver [`docs/copia-no-drive.md`](../copia-no-drive.md#o-espelho-da-produção));
- se um script de medição de desempenho (`scripts/desempenho/`, regra 12) puder tocar prévia, homologação ou produção com dados de carga: a carga só grava no servidor local, pela Local Explorer, num banco com o acervo de exemplo; a medição no navegador recusa a produção e a homologação; e o site não importa esses scripts;
- se as cópias menores das fotos e dos retratos (regra 13, `scripts/copias-no-bucket.mjs`) puderem ser gravadas fora das rotas do site (o envio e o ajuste da Administração, que é só dos administradores e confere de novo, foto por foto, quem vê a original e se ela já tem cópia), ganharem o nome de uma original, forem entregues antes da conferência da original, ou se as cópias das fotos de exemplo puderem chegar ao pacote publicado;
- se o simulador de data (`?hoje=`, que mostra o cartão "Na TV da sala" antes do Natal) puder valer na produção (regra 14, `scripts/simulador-de-data.mjs`: `diaSimulado` recusa a produção, e só `src/lib/servidor/dia-do-pedido.ts` lê o "hoje" do endereço, conferido pela árvore do código em qualquer forma: `.get`, `.getAll`, `.has`, também por colchete, `Object.fromEntries`, desestruturação, comparação, modelo de texto com interpolação, as expressões da marcação dos `.astro` ou `diaSimulado` importado com outro nome).
- se a busca existir onde não deve, ou decidir quem vê o quê em SQL (regra 15, `scripts/busca.mjs`, com teste em `testes/guarda-busca.test.ts`): a lupa e a folha só existem fora do modo TV (`comBusca = !palco`, em `Visual.astro`); na TV da sala o `q` não vale (`busca: !sala` em `ordemDoModoTv`); toda chamada de `soFiltrosConhecidos` diz se a busca existe ali; e `src/lib/servidor/busca.ts` não filtra por visibilidade, núcleo, situação, lixeira ou remoção no SQL (as consultas leem as colunas, e quem decide é o código, com `podeVerMemoria` e `veORelato`).

A regra das exclusões e a regra 13 leem a árvore do código (`scripts/codigo-lido.mjs`): o bucket é seguido até `bucketDeFotos` ou o env, e `chaveDaCopia`, `chaveDaCopiaDoRetrato`, `chavesDasCopias` e `guardarCopias` são reconhecidas pela origem, com qualquer nome local (apelido na importação, `import * as`, variável, desestruturação, função do projeto que devolve o valor ou recebe o bucket); as recusas pela leitura do texto continuam somadas. A regra da cópia para o espelho lê toda importação da montagem pela árvore, com aspas simples ou duplas, reexportada, dinâmica ou por `require`.

### Os testes

`npm test` roda os testes de `testes/`, que cobrem quase todo o site: as regras de quem vê e de quem pode, as datas, o login, o parentesco, a árvore, as telas e os textos, as rotas que gravam e os módulos da guarda. Dois arquivos rodam no navegador e ficam pulados sem o servidor (`SALA_SERVIDOR` e `Z2_SERVIDOR`). Alguns que valem para toda sessão:

- `testes/esquema-da-copia.test.ts` falha se o esquema de verdade passar a ter coluna gerada, índice único por expressão, collation diferente da BINARY numa coluna de chave ou tabela `WITHOUT ROWID`: a cópia do acervo confere o arquivo por uma régua que não sustenta isso, e o recado diz para ajustar a cópia junto (ver "A rede no fim da cópia" e "O esquema que a cópia sustenta", em [`docs/copia-no-drive.md`](../copia-no-drive.md#por-dentro-as-regras-da-cópia)).
- `testes/pedido-recusado.test.ts`: para cada rota que grava, o pedido recusado, com a impressão do banco inteiro (todas as tabelas) antes e depois, que precisa sair igual.
- `testes/aspas-curvas.test.ts`, `testes/sistema.test.ts` e `testes/visual.test.ts`, as regras de escrita e do sistema visual.
- `testes/documentos-historico.test.ts` e `testes/documentos-referencias.test.ts`, os links e as referências dos documentos.

### As conferências com o servidor local

Ficam fora do build, porque o build do Cloudflare não tem servidor nem navegador.

- `npm run gestalt` (`scripts/confere-gestalt.mjs`): a gestalt que se confere sozinha. Precisa do servidor local no ar (`npm run dev` e `npm run fotos-de-exemplo`); recebe o endereço, como `npm run gestalt -- http://localhost:4400`. A regra e o que fica de fora estão em ["Visual"](telas.md#visual).
- `npm run tv` (`scripts/confere-tv.mjs`): o modo TV com todas as memórias de exemplo em oito janelas (ver ["Modo TV"](explorar.md#modo-tv)). Roda só no computador e nas prévias de teste: recusa a produção e a homologação.
- Desempenho, à mão, com o acervo cheio (`scripts/desempenho/carga-local.mjs`): `node scripts/desempenho/conferir-consultas.mjs` falha se uma página passar de 50 consultas ao D1, e `node scripts/desempenho/estimar-natal.mjs`, se o dia 25 passar de 3 milhões de linhas lidas (ver "Desempenho do servidor", em [`site.md`](site.md#como-o-site-funciona)).

### O build e o GitHub

- `npm run build` roda a guarda e os testes antes do build (`prebuild`). O Cloudflare publica com `npm run build`: se algo falhar, nada vai ao ar e a versão anterior continua.
- No GitHub, `.github/workflows/confere.yml` roda só a gestalt, e só no PR para a `main` e por disparo manual (aba Actions, "Run workflow"). Ele sobe o servidor local com o acervo de exemplo e abre o navegador, o que o build do Cloudflare não faz. A guarda e os testes não rodam no GitHub: ficam no build do Cloudflare, que já roda em todo push e trava a publicação. Nos PRs para a `homologa`, o GitHub não roda nada, e a gestalt da máquina da sessão, antes de cada push, é a única conferência dela nesse caminho. PR só de documento não dispara. Um push novo no PR, ou um novo disparo manual na mesma branch, cancela a rodada anterior. Falha vira marca vermelha no PR. O motivo (Gui, 20/11) está em ["Infraestrutura"](infraestrutura.md#infraestrutura), "GitHub Actions enxuto".

Origem: o `CLAUDE.md`, "Conferências", até 26/11/2026; o processo está no [histórico depois de 17/11](../historico/decisoes-depois-de-2026-11-17.md#claudemd).
