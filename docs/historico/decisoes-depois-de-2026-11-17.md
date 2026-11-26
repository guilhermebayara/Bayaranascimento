# Decisões depois de 17/11/2026: o processo

O processo que entrou nas regras depois do enxugamento de 17/11/2026 e saiu delas na sessão AC2, em 26/11/2026: os parênteses de origem (decisão, sessão, revisão, PR, pergunta de QA), as frases "antes…", "caiu de…", "foi assim com…" e as medidas de uma vez. Cada seção tem o título da seção da regra, em `docs/regras/`, e cada item diz a regra, a linha dela no `docs/decisoes.md` antigo (commit `1c7a642`) e o que saiu, com as palavras de antes. Onde a regra foi decisão do Gui, ficou nela a marca curta "(Gui, 23/11)".

As regras de `docs/visual.md` vêm no fim, com o título "visual.md, ...", e depois as mudanças no `CLAUDE.md` e nos outros documentos. Para onde foi cada regra está em `mapa-da-reducao-2.md`, nesta pasta.

## Como o site funciona

- **Desempenho do servidor** (linha 122): "(sessão D1a, 23/11/2026; ...)".
- **Guarda por pedido** (linha 123): "(revisão R-D1, D1d)".
- **O modo TV lê uma memória só por passagem** (linha 128): "(aplicação da E1, ver "Explorar")"; a medida "uma passagem lê umas 580 linhas no acervo cheio, e não 28 mil". A regra inteira está em `docs/regras/explorar.md`, "Modo TV".
- **Duas conferências à mão** (linha 129): a frase "A fila se mede com `scripts/desempenho/atraso-no-d1-guarda.patch`, que nunca vai para o repositório aplicado." saiu: os dois patches de `scripts/desempenho/` não aplicam mais no `ambiente.ts` de hoje (`git apply --check`: "patch does not apply", auditoria AC, C-7) e foram para `scripts/historico/` na sessão AC1.

## Quem pode o quê

- **Na memória, só os dados** (linha 46): "(`fotosMostradas` com só uma parte das fotos, por pedido forjado ou pela página aberta antes de quem criou trocar a principal; D4 da sessão Z, teste em `testes/z-correcoes.test.ts`)".

## Infraestrutura

As regras das linhas 65 a 77 (o espelho, a cópia do acervo por dentro e a cópia para o espelho) foram para `docs/copia-no-drive.md`, nas seções "O espelho da produção" e "Por dentro: as regras da cópia", uma regra por título `###`, e o texto do `CLAUDE.md`, "O espelho da produção", foi junto. Em `docs/regras/infraestrutura.md` ficaram duas linhas com o link.

- **Espaço das fotos e áudios** (linha 60): "decisão do Gui de 18/11/2026" (virou a marca); "(sessão D1a, 23/11/2026)".
- **Duas cópias menores de cada foto** (linha 61): "(decisão 4 do Gui no brief de desempenho, 23/11/2026; sessão D1b; ...)"; "(sessão D1d, item 14 da revisão R-D1)".
- **Cópias das fotos de antes** (linha 62): "(sessão D1d, item 13b da revisão R-D1)"; "(item 2 da revisão D1f, 24/11/2026)"; "Antes, a segunda conferência reaproveitava a leitura guardada no começo do pedido: com o primeiro pedido parado na leitura da original e o segundo terminando e soltando a reserva, o primeiro pegava a reserva, gravava no bucket e só depois recebia 409. Agora ele recebe 409 ("Esta foto já tem as cópias.") sem gravar;" (ficou "Com o primeiro pedido parado na leitura da original e o segundo terminando e soltando a reserva, o primeiro recebe 409 ... sem gravar;"); "(sessão D1c)".
- **Cópia pequena de cada retrato** (linha 63): "(decisão do Gui de 23/11/2026; sessão D1c; ...)".
- **Fotos, retratos e áudios guardados no aparelho por 7 dias** (linha 64): "(decisão 3 do Gui no brief de desempenho, 23/11/2026, para fotos e retratos; os áudios entraram na sessão D1c, por outra decisão do Gui do mesmo dia)"; "(decisão do chat, sessão D1d, item 16 da revisão R-D1; ...)" (virou "(chat, 24/11; ...)", pela data do PR #167 da D1d); "(sessão D1d, item 15 da revisão R-D1; ...)".
- **Espelho da produção** (linha 65): "(decisão do Gui, 18/11/2026; ...)"; "(observação do Gui, 18/11/2026)". Foi para `docs/copia-no-drive.md`, "Espelho da produção".
- **Cópia do acervo em partes** (linha 66): "(decisão do Gui, 23/11/2026, nas respostas à medição M2; sessão D1e; ...)"; "A cópia inteira num pedido só gastava ... Agora `/api/copia`" (ficou "gastaria"); "agora sem recuo"; "a restauração e o espelho leem esse formato como antes". Foi para "Por dentro".
- **A cópia é de um instante só** (linha 67): "(item 1 da revisão D1f, 24/11/2026; ...)"; "deixavam no arquivo o relato sem a memória, e a restauração falhava na chave estrangeira. Agora o banco tem" (ficou "deixariam", "falharia", "Por isso o banco tem"); "o mesmo formato de antes, e a restauração e o espelho o leem como antes". Foi para "Por dentro".
- **As tabelas de registro não sobem a marca** (linha 68): "(D1f2, 24/11/2026; ...)"; "encontrava uma visita no meio em todas as passadas e falhava. Hoje são" (ficou "encontraria", "falharia", "São"). Foi para "Por dentro".
- **A rede no fim da cópia** (linha 69): "(D1f3, 24/11/2026, decisão do chat, reversível: ...)" (virou "(chat, 24/11, reversível: ...)"); "com a falha de hoje" (ficou "com a mesma falha da marca"). Foi para "Por dentro".
- **A marca do esquema** (linha 70): "(D1f4, 24/11/2026; ...)". Foi para "Por dentro".
- **O esquema que a cópia sustenta** (linha 71): "(D1f4; ...)". Foi para "Por dentro".
- **Duas tabelas não vão na cópia** (linha 72): "(D1f3; ...)". Foi para "Por dentro".
- **A cópia mensal só conta no Drive** (linha 73): "(D1f3)"; "O middleware não anota mais a cópia ao entregar a última parte, o que contava como feita uma passada que depois era descartada." (ficou "não anota", "contaria", "fosse descartada"); "(D1f4, migração ...)"; "Risco aceito (decisão do chat, 24/11/2026)". Foi para "Por dentro".
- **Cópia mensal no Drive em partes** (linha 74): "(..., sessão D1e)". Foi para "Por dentro".
- **"Baixar cópia do acervo" em partes** (linha 75): "(sessão D1e)". Foi para "Por dentro".
- **Cópia para o espelho** (linha 76): "(decisão do Gui, 23/11/2026; sessão D1e; ...)"; "O limite do arquivo do espelho caiu de 20 MB para 1 MB" (ficou "é 1 MB"); "(correção 7 da revisão R-AB)". Foi para `docs/copia-no-drive.md`, "Cópia para o espelho".
- **GitHub Actions enxuto** (linha 78): "(decisão do Gui, 20/11/2026)"; "A estimativa era de 800 a 1.300 minutos por mês antes e de 50 a 70 depois."; "e não mais do e-mail do GitHub".
- **Sem aviso de falha de build por e-mail** (linha 79): "(decisão do Gui, 20/11/2026: o e-mail se perde)" virou "(Gui, 20/11: o e-mail se perde)".

`docs/copia-no-drive.md`, que já existia, também perdeu processo: o título "Em partes (desde 23/11/2026, sessão D1e)" e o título "De um instante só (desde 24/11/2026, sessões D1f e D1f3)" deram lugar a "Como a cópia é feita", que resume as duas seções (o detalhe ficou em "Por dentro"); saíram "desde a D1f3" e "O script não precisou mudar para isso.". Os textos antigos das duas seções:

> Em partes: No plano gratuito da Cloudflare, cada pedido ao site tem 10 ms de processador. A cópia inteira num pedido só gastava de 6 a 12 vezes isso com o acervo cheio. Por isso a cópia vem em partes: o script (e o navegador, no "Baixar cópia do acervo") pede primeiro o índice, em `/api/copia`, com as tabelas e quantas linhas cada uma tem, e depois cada tabela em páginas, em `/api/copia?tabela=<nome>`, seguindo `&depois=<n>` enquanto a parte disser `proxima`. Quem pede junta tudo e grava um arquivo só, no formato de sempre, sem recuo. Uma parte que falha é pedida de novo, até 3 vezes. Se ainda falhar, nada é gravado e o script falha, e o Google manda o e-mail. O script novo funciona também com o site de antes, que mandava a cópia inteira de uma vez. O script de antes, com o site novo, falha (o índice não é a cópia) e manda o e-mail. O token, as propriedades e o agendamento não mudam.

> De um instante só: O índice e cada parte trazem a `marca`, um número que sobe a cada gravação no acervo. As gravações de registro, que anotam o uso do site (a visita ao abrir o Início, o primeiro acesso, a anotação da cópia mensal), não sobem a marca: num dia de uso, a cópia não recomeça por causa delas. Se a marca de uma parte for diferente da do índice, algo foi gravado no meio da cópia, e o arquivo juntado poderia não restaurar (um relato sem a memória dele, por exemplo). Então quem junta recomeça a cópia inteira, até 4 vezes, com uma espera entre elas. Se o acervo mudar nas 4, nada é gravado: o script falha e o Google manda o e-mail ("o acervo mudou durante a cópia"); o botão da Administração diz para tentar de novo daqui a pouco. Basta rodar `fazerCopia` de novo mais tarde. O índice e cada parte trazem também a marca do esquema: uma tabela criada ou refeita no meio da cópia (numa publicação, por exemplo) faz a cópia recomeçar, como quando o acervo muda. Antes de gravar, o script confere o arquivo montado contra o esquema do banco, que vem no índice: nenhuma chave repetida e nenhuma linha apontando para outra que não está no arquivo. Se não conferir, a cópia é refeita, nas mesmas 4 tentativas. O arquivo continua com o mesmo nome e o mesmo formato. Ficam fora dele a tabela da marca e, desde a D1f3, `reservas_das_copias` (travas de minutos) e `limpezas_do_teste` (a faxina das prévias). O script novo funciona com o site de antes (sem a marca), juntando sem conferir. A conferência só vale com os dois atualizados.

## Fotos de exemplo

- **Cópias menores** (linha 93): "**Cópias menores** (sessão D1b):".

## Famílias, núcleos e parentes

- **"Bichinho" e não "bicho"** (linha 158): "(decisão do Gui, 18/11/2026: "bicho" soa frio)" virou "(Gui, 18/11: "bicho" soa frio)".

## Integrantes e laços

- **As datas das fases** (linha 166): "migração `101-datas-das-fases`, decisão do Gui de 18/11/2026" (a marca ficou como "Gui, 18/11").
- **Namoro, ex e amizade: a fase decide, num registro só** (linha 167): "decisões do Gui de 18/11/2026" (a marca ficou como "Gui, 18/11").
- **Ex que nunca foi da família** (linha 171): "(só namorou e terminou, sem a marca; o caso do Jean)"; saiu "; o caso do Jean".
- **Ex da família** (linha 172): "ex-casal, como antes (ver "Ex-casal")"; saiu "como antes".
- **O fim e o resto da história do casal são uma ação** (linha 178): "decisão do Gui, 18/11/2026: é o padrão de casal no site inteiro" (a marca ficou como "Gui, 18/11: é o padrão de casal no site inteiro").
- **Ex-casal** (linha 179): "migração `071-ex-casal`, decisões do Gui de 18/11/2026" (a marca ficou como "Gui, 18/11").
- **Em Pessoas e em "Quem estava"** (linha 182): "decisões do Gui depois do QA de 18/11/2026" (a marca ficou como "Gui, 18/11").
- **"Fora" de quem é pai ou mãe vale como "Discreto"** (linha 183): "resposta do Gui à sessão F, 18/11/2026" (a marca ficou como "Gui, 18/11").
- **O ex que virou amigo** (linha 185): "observações do Gui, 18/11/2026, o caso do Thiago"; "Na árvore (decisão do Gui depois da sessão I, 18/11/2026)" (as duas marcas ficaram como "Gui, 18/11").
- **A ficha da árvore** (linha 186): "O Thiago na homologação, até onde dá para ver sem entrar nela: a regra já pegava a amizade como fase de hoje; o que faltava era a ficha, que só olhava o parentesco de quem olha e ficava sem laço. Se no espelho o casal dele não tiver amizade como última fase (por exemplo, um registro só com namoro e separação), ele aparece pela regra do namoro que acabou e sai da árvore."
- **A tarja** (linha 188): "(acabamento, 18/11/2026)".
- **A página do laço** (linha 204): "onda 2, decisão do Gui de 17/11/2026" (a marca ficou como "Gui, 17/11").
- **Com um dos dois já falecido, o casal fica no passado** (linha 207): "defeito do QA de 18/11/2026; ".
- **Cadastros duplicados** (linha 214): "onda 2, decisão do Gui de 17/11/2026" (a marca ficou como "Gui, 17/11").
- **O recado de "Juntar" só cita o que o administrador vê** (linha 220): "decisão do Gui, 23/11/2026" (a marca ficou como "Gui, 23/11"); "revisão AA2, 23/11/2026; ".
- **Editar pessoa e laços é uma página só** (linha 224): "(proposta A do conceito da sessão E, escolha do Gui de 18/11/2026)" (a marca ficou como "Gui, 18/11").
- **Adicionar mora no grupo** (linha 227): "(correção do Gui, 18/11/2026)" (a marca ficou como "Gui, 18/11"); ""Com quem?" gerava dúvida (observação do Gui, 18/11/2026), e a pergunta diz o que fazer, conforme a escolha:" (a frase ficou "A pergunta diz o que fazer (Gui, 18/11), conforme a escolha:"); "A outra leitura, "Quem é essa pessoa para você?", ficou de fora porque pergunta o que a pessoa é, que é o "Nome do laço", logo embaixo."
- **A ordem da ficha** (linha 231): "(pedido do Gui, 18/11/2026)" (a marca ficou como "Gui, 18/11").
- **Cadastro guiado** (linha 232): "(observação do Gui, 18/11/2026: no pé, longe da pergunta, ficava escondido)" (a marca ficou como "Gui, 18/11").
- **A cor de quem é de duas famílias** (linha 242): "(pedido do Gui, 18/11/2026, visto na página da Giovanna)" (a marca ficou como "Gui, 18/11").
- **Na homologação, o retrato de cada pessoa é uma foto de exemplo** (linha 243): "(o espelho da sessão G, antes do #97)"; "defeito visto pelo Gui depois da sessão H, "; "os arquivos reais que a sessão G gravou debaixo de `retratos/`" (ficou "os arquivos reais gravados debaixo de `retratos/`").

## Árvore

- **Os centros da árvore** (linha 255): "(migração `073-ajustes-do-acervo`, onda 2, decisão do Gui de 17/11/2026; `src/lib/centros-da-arvore.ts`, teste em `testes/centros-da-arvore.test.ts`)", que virou "(Gui, 17/11; migração `073-ajustes-do-acervo`; ...)"; saíram "onda 2" e "decisão do Gui de 17/11/2026".
- **A página como mapa** (linha 270): "(proposta A, painel flutuante; conceito do Gui no Figma, https://www.figma.com/design/ymPTKrTROQFhfsYTfpLoRk, nó 16-1601; capturas em `docs/visual/quadro-do-mapa/`)"; saiu "proposta A", e a marca "(Gui, 17 e 18/11)" veio do histórico até 17/11 ("pedido do Gui em 17/11/2026, com conceito dele no Figma ...; escolha em 18/11/2026"); "conceito do Gui no Figma" virou "conceito dele no Figma".
- **O namoro fica colado** (linha 294): "(ajuste do Gui, 18/11/2026; `colado`, ...)"; "(decisão do Gui, 18/11/2026, opção A: na prévia, o Ed deixa de ser vizinho do Gui quando a namorada entra)"; "(decisão do Gui, 18/11/2026)".
- **O pai ou a mãe dos meio-irmãos fica do lado deles** (linha 305): "(defeito do QA de 18/11/2026; teste em `testes/arvore-meio-irmaos.test.ts`)"; "e a linha dela não passa mais por baixo dele."
- **Ramo aberto** (linha 307): "(defeito do QA de 18/11/2026, a Bia do Primo Téo; teste em `testes/arvore-ramo-namoro.test.ts`)".

## Página da pessoa

- **`/pessoas/<id>`: o verbete** (linha 323): "(proposta A do conceito da sessão L, escolha do Gui de 18/11/2026; o estudo, ...)" virou "(Gui, 18/11; o estudo, ...)"; "com as mesmas regras de quem vê o quê de antes" virou "com as regras de quem vê o quê".
- **O quadro** (linha 326): "tratado como o painel da árvore (pedido do Gui, 18/11/2026)"; "em tela baixa (decisão do Gui depois do QA de 18/11/2026, em 1280×800)".
- **Dados** (linha 327): "o nascimento com o aniversário em destaque (pedido do Gui, 18/11/2026)"; "Ver o histórico da página", para quem pode mudá-la "(decisão desta sessão, com a liberdade que o Gui deu: o histórico é da página da pessoa, então ganha o caminho dali; ...)".
- **Na árvore** (linha 328): "(defeito do QA de 18/11/2026; `nomeDoGrupoDePerto` e `contaDaFamiliaDePerto`, em `src/lib/pagina-da-pessoa.ts`)".
- **Você e Fulano** (linha 329): "("No seu círculo: Próximo", com "só você vê"; decisão do Gui, 18/11/2026)".
- **"Nas palavras de Fulano"** (linha 330): "como as mensagens da conversa na página da memória (pedido do Gui, 18/11/2026)".
- **"A vida de Fulano em memórias"** (linha 331): "com a forma de ver (pedido do Gui, 18/11/2026: pela idade é o padrão, e a linha do tempo continua como opção)"; "para a troca ser imediata (a troca demorava; observação do Gui, 18/11/2026)".

## Quem já faleceu

- **O retrato é de foto de álbum** (linha 338): "(decisão do Gui, 18/11/2026)"; "O arco saiu porque qualquer forma alta de topo redondo lembrava lápide." (virou "Sem arco, porque qualquer forma alta de topo redondo lembra lápide."); "todo mundo no círculo, que voltou aos retratos redondos depois da sessão J (decisão do Gui, 18/11/2026), e quem contou, na conversa dos relatos, o padrão de mensagens (decisão do Gui depois do QA de 18/11/2026)".
- **A marca** (linha 339): "Na ficha da árvore, no círculo e na conversa dos relatos (decisão do Gui depois do QA de 18/11/2026) o retrato fica em tom suave".
- **No cartão da árvore** (linha 341): "(ideia do Gui, 18/11/2026; o tom suave no cartão se confundia com o que a árvore apaga ao destacar uma família)" (o motivo ficou, no presente: "se confunde").

## Como você chama

- **Abertura da seção** (linha 371): "Decisão do Gui de 18/11/2026."
- **Cada pessoa pode dar o próprio apelido** (linha 373): "(defeito visto pelo Gui depois da sessão I; teste em `testes/apelidos.test.ts`)". A sessão I e as observações do Gui depois dela são de 18/11/2026.
- **Na ficha** (linha 376): "(decisão do Gui, 18/11/2026, depois da sessão H; `apelidosDaFicha` ...)"; "Quem não pode mudar a ficha dá o apelido só seu na página da pessoa, como antes."

## Círculo

- **Quem aparece** (linha 354): "(decisão do Gui depois da sessão J, 18/11/2026: o círculo volta ao redondo; o retrato de álbum fica no resto do site)".
- **O slider vai do mais distante ao mais próximo, em todo lugar** (linha 357): "(decisão do Gui, 18/11/2026)".
- **O desenho do slider: a régua com os nomes** (linha 358): "(proposta A do conceito da sessão J, escolha do Gui de 18/11/2026; a peça `Proximidade.astro`, ...)"; "O slider continua livre, sem etapas".
- **Proximidade em todo laço seu** (linha 360): "(decisão do Gui, 18/11/2026)".

## Tipos de momento

- **Cor e desenho** (linha 385): decisão do Gui, 18/11/2026 (o parêntese era "(decisão do Gui, 18/11/2026: sem biblioteca, todos no mesmo traço; em Fé, símbolos neutros; nada que remeta a cemitério)").

## Interação dos formulários

- **Quando o servidor recusa** (linha 400): fila da revisão Z2, sessão AA (o parêntese era "(`src/lib/formulario-devolvido.ts`; fila da revisão Z2, sessão AA)").
- **Salvar a memória grava tudo de uma vez** (linha 401): Y3 do PR #160, 22/11/2026 (o parêntese era "(Y3 do PR #160, 22/11/2026; `src/pages/api/memorias.ts`, testes em `testes/y3-falhas.test.ts` e `testes/y3-correcoes.test.ts`)"); "Os áudios e as mensagens do relato vão no mesmo lote (D1 da sessão Z, 22/11/2026)"; "com o que digitou (D2 da sessão Z)"; "(`comCodigoNovo`, sessão AA, teste em `testes/codigo-novo.test.ts`)".
- **Avisos do formulário da memória** (linha 403): "Na memória nova e no rascunho o script escrevia na linha da janela do relato, que vem antes na página e mora numa etapa escondida, e nada aparecia (revisão Z2, 23/11/2026; o script pega a linha que é filha direta do formulário, com teste em `testes/revisao-z2.test.ts`)."
- **Sete etapas** (linha 413): "(D6 da sessão Z, teste em `testes/z-correcoes.test.ts`)".
- **A frase é a trilha** (linha 414): "(proposta B do conceito da sessão D, decisão do Gui de 18/11/2026)".
- **O resumo ao lado** (linha 416): "O resumo ao lado ("A memória até aqui") saiu: a frase é o resumo. A frase de boas-vindas também saiu; a nota do administrador que só corrige os dados e a da correção de memória publicada ficam na primeira etapa."
- **A data por toque, sem teclado** (linha 418): "(proposta B, decisão do Gui de 18/11/2026)"; "O calendário do aparelho saiu da nova memória."
- **"Confira antes de publicar" mostra a frase completa** (linha 419): "(decisão do Gui, 18/11/2026)".
- **Tipo de momento** (linha 420): "marcado em "Dia a dia", um aniversário passava como dia a dia."
- **Só sai da memória a foto que a pessoa viu e tirou** (linha 423): "(Y3 do PR #160, 22/11/2026; teste em `testes/y3-correcoes.test.ts`)"; "e "Memória atualizada" não promete nada sobre as fotos (D7 da sessão Z)"; "(`comandoDaPrincipal`; D8 da sessão Z, teste em `testes/z-correcoes.test.ts`)"; "(revisão Z2, teste em `testes/revisao-z2.test.ts`)".
- **Quem pode ver** (linha 426): "(decisão do Gui, 17 e 18/11/2026, conceito da sessão D)"; "Na memória, um seletor segmentado com "Toda a família" e "Famílias escolhidas", no lugar dos dois rádios, com a explicação colada nele".
- **Nova pessoa: Pede só o essencial** (linha 433): "(o nascimento fica à vista no primeiro passo, ao lado de "Já faleceu": confirmado pelo Gui em 18/11/2026)".
- **Sem recarregar** (linha 435): "(premissa do Gui de 18/11/2026, "Interação sem recarregar a página", em `docs/visual.md`; `src/lib/cliente/no-lugar.ts`, teste em `testes/no-lugar.test.ts`)".
- **Recado sem formulário vai para o alto** (linha 438): "(decisão do Gui, 22/11/2026)"; "Cada formulário no lugar é ligado uma vez só: a página da pessoa chama o script de novo, e com a marca vazia cada toque mandava o pedido duas vezes e dizia o recado duas vezes."; "(revisão Z2, 23/11/2026; testes em `testes/revisao-z2.test.ts` e, no navegador, `testes/revisao-z2-navegador.test.ts`)".
- **O foco quando a própria região some** (linha 439): "(sessão AA, 23/11/2026; `no-lugar.ts`, teste no navegador em `testes/revisao-z2-navegador.test.ts`)".
- **No lugar** (linha 441): "Abrir e fechar (menus, sanfonas, fichas, "Quem marcou") já era no lugar, e o Explorar e o círculo já trocavam sem recarregar."
- **O botão de contar diz "Contar como foi"** (linha 448): "(resposta do Gui à crítica C1, 22/11/2026)".
- **"Quem estava" na memória** (linha 449): "(resposta do Gui à crítica C2, 22/11/2026: a voz de cada um é o que a memória tem de único)".
- **A lista de Pessoas** (linha 450): "(decisão do Gui, 18/11/2026, depois da sessão H; `nomeComApelido` e `buscaAcha`, testes em `testes/qa-respostas-pessoas.test.ts`)".
- **O alto de Pessoas e o filtro por família** (linha 451): "(proposta B do conceito da sessão E, escolhida pelo Gui em 17/11/2026; regras em `src/lib/ordem-das-pessoas.ts`, testes em `testes/qa-respostas-pessoas.test.ts`)".
- **A página da pessoa** (linha 452): "(`apelidoAoLado`; defeito visto pelo Gui depois da sessão I, teste em `testes/apelidos.test.ts`; capturas em `docs/visual/sessao-k/apelido/`)". A marca "(Gui, 18/11)" vem da data da observação do Gui depois da sessão I (18/11/2026, em `docs/historico/decidido-ate-2026-11-18.md`).

## Lixeira e histórico

- **Cada pessoa vê na lixeira só o que pode restaurar** (linha 462): "(revisão Y do PR #160)", no fim de "Ele conta na frase da lixeira de "Sua conta" ("Uma coisa sua na lixeira."), para quem administra e para os demais".
- **Remover um laço de árvore, um laço do coração ou um parente de amigo** (linha 464): "Continua valendo com o histórico de laços" (ficou "Vale mesmo com o histórico de laços").
- **Histórico de pessoas e laços** (linha 465): "onda 2, decisão do Gui de 17/11/2026" (ficou a marca "(Gui, 17/11)").
- **Apagar de vez** (linha 470): "onda 2, decisão do Gui de 17/11/2026" (ficou a marca "(Gui, 17/11)").
- **Excluir pessoa** (linha 472): "decisão do Gui depois da sessão I, 18/11/2026" (ficou a marca "(Gui, 18/11)").
- **Na lixeira,** (linha 478): "defeito do QA de 18/11/2026: a rota voltava para a lixeira", no parêntese do teste.
- **Como funciona: `integrantes.excluida_em`** (linha 480): "revisão AA2, 23/11/2026", no parêntese do teste.
- **Fotos sem memória** (linha 482): "onda 2, decisão do Gui de 17/11/2026" (ficou a marca "(Gui, 17/11)").
- **É a única rota que apaga arquivo do bucket das fotos de verdade** (linha 487): "(defeito corrigido na sessão D1c: antes as cópias ficavam no bucket sem uso)".

## Áudios nos relatos

- **Transcrição automática** (linha 518): onda 2, decisão do Gui de 17/11/2026.
- **A cota** (linha 519): conferida em 18/11/2026 (era "documentação do Cloudflare, conferida em 18/11/2026").
- **Para ligar** (linha 520): que está lá desde 18/11/2026; resposta do Gui à sessão F.

## Relato como conversa

- **Abertura da seção** (linha 529): Escolha do Gui depois da sessão I (18/11/2026), a partir do protótipo de `tst-relato-conversa` (a branch foi apagada; o leia-me do protótipo está em `docs/visual/sessao-i/conversa/leia-me.md`, trazido do commit `51d0587`), com as respostas às perguntas da construção no mesmo dia; Nasceu do pedido de escrever e falar com o mesmo peso, sem o áudio vir antes como se fosse a única possibilidade.
- **Primeiro publicar** (linha 532): resposta do Gui à crítica C1, 22/11/2026.
- **"Contar como foi"** (linha 538): resposta do Gui à P5 do QA de 23/11/2026.
- **O rascunho de quem não publicou primeiro** (linha 539): resposta do Gui à P4 do QA de 23/11/2026.
- **Sem script** (linha 540): D3 da sessão Z; revisão Z2 (era "(revisão Z2, teste em `testes/revisao-z2.test.ts`)"); (fila da revisão Z2, sessão AA).

## Capítulos e temas

- **No formulário, "Como as memórias entram?"** (linha 551): "pedido do Gui, 18/11/2026" (ficou a marca "(Gui, 18/11: para alguns capítulos, o dia faz diferença; ...)"); "e os capítulos de antes ficam sem dia", depois de "migração `104-dia-dos-capitulos`".
- **Página do tema: a coluna da esquerda fica parada e a lista rola por dentro** (linha 561): "(pedido do Gui, 19/11/2026)" (ficou a marca "(Gui, 19/11)").
- **O acervo de exemplo fica sem tema de muitos capítulos** (linha 562): "(resposta do Gui à P1 do QA de 20/11/2026, [`historico/qa/2026-11-20-perguntas.md`](historico/qa/2026-11-20-perguntas.md))" (ficou a marca "(Gui, 20/11)").
- **Página do capítulo: a coluna da capa fica parada e o que vem abaixo da data rola por dentro** (linha 563): "pedido do Gui, 19/11/2026" (ficou a marca "(Gui, 19/11; mesmo modelo da página do tema)"); "como antes", no fim de "e no celular as colunas se empilham como antes"; "Como a capa agora nunca passa da janela, o script que a media e a classe `.capitulo__parado--solta` saíram."
- **Largura inteira é a largura inteira disponível; trocar a forma de ver não muda o lugar de nada** (linha 564): "decisão do Gui, 19/11/2026" (ficou a marca "(Gui, 19/11; regra geral em ...)"); "Antes, a lista do tema e o mural e a lista do capítulo desciam para a largura toda, embaixo da capa, e a capa e as memórias saltavam a cada troca. Agora o conteúdo se adapta à coluna:" (ficou "O conteúdo se adapta à coluna:").

## Início (painel pessoal)

- **A carta de Natal** (linha 596): "resposta do Gui à crítica C2, 22/11/2026" (ficou a marca "(Gui, 22/11; a peça Polaroid aceita o `titulo`)").
- **Visitas seguintes, nesta ordem** (linha 597): "(proposta B do conceito da sessão H, escolha do Gui de 18/11/2026: o retrato pequeno ..." (ficou "(Gui, 18/11: o retrato pequeno ..."); "(resposta do Gui às críticas C1 e C2, 22/11/2026: no primeiro dia, a vontade é se ver)" (ficou "(Gui, 22/11: no primeiro dia, a vontade é se ver)").
- **"Neste dia, em outros anos"** (linha 598): "resposta do Gui à crítica C1, 22/11/2026" (ficou a marca "(Gui, 22/11; `noNatal` e `emOutrosAnos`, ...)").
- **Rascunho** (linha 600): "resposta do Gui à crítica C1, 22/11/2026" (ficou a marca "Gui, 22/11", dentro do parêntese).
- **Aniversário de casamento** (linha 604): "decisão do Gui, 18/11/2026" (ficou a marca "(Gui, 18/11; `aniversariosDeCasamento`, ...)").

## Sua conta

- **Igual para todos** (linha 619): "(decisão do Gui, 18/11/2026)" (ficou a marca "(Gui, 18/11)"); "O formato foi escolha da sessão, seguindo as ações do alto da conta, e fica para o Gui aprovar." (ficou "O formato segue as ações do alto da conta e fica para o Gui aprovar.").
- **Ordem** (linha 621): "(proposta A do conceito da sessão E, escolha do Gui de 17/11/2026)" (ficou a marca "(Gui, 17/11)"); "na largura toda, os avisos deixavam vazio demais com poucos itens." (ficou "deixariam").
- **Administração em página própria** (linha 627): "(decisão do Gui, 18/11/2026: "Sua conta" e "Administração" levavam à mesma página)" (ficou a marca "(Gui, 18/11)"); "O cartão (`administracao()` e `pendenciasDaAdministracao()`, em `src/lib/conta.ts`) continua como era em "Sua conta"." (ficou "O cartão vem de `administracao()` e `pendenciasDaAdministracao()`, em `src/lib/conta.ts`."); "Proposta A do conceito da sessão H (escolha do Gui, 18/11/2026; registro em `docs/visual/conceito-h/`): os atalhos ficam em grupos por tema (`gruposDaAdministracao`)," (ficou "Os atalhos ficam em grupos por tema (Gui, 18/11; registro em `docs/visual/conceito-h/`; `gruposDaAdministracao`),"); "(decisão do Gui depois do QA de 18/11/2026: a cópia continua levando tudo," (ficou "(Gui, 18/11: a cópia leva tudo,"); "(observação do Gui depois da sessão H, 18/11/2026)" (ficou a marca "(Gui, 18/11)"); "As pessoas ficavam fora da conta (achado da W2, corrigido na W3)."

## Avisos

- **Quando nasce** (linha 640): "(defeito do QA de 23/11/2026: os dois não avisavam)", depois de "inclusive aceitar uma sugestão de correção e restaurar uma versão pelo histórico".
- **O registro do primeiro acesso vale mesmo quando a rota recusa o pedido** (linha 641): "(decisão do chat, 24/11/2026, item 6 da revisão D1f)" (ficou a marca "(chat, 24/11)").

## Sugestão de correção

- **Abertura da seção** (linha 652): onda 2, decisão do Gui de 17/11/2026.
- **Ninguém muda o que outra pessoa registrou** (linha 654): observação do Gui, 18/11/2026, depois da sessão G.
- **Os dados da memória** (linha 655): resposta do Gui à sessão F, 18/11/2026; defeito do QA de 23/11/2026.
- **Quem recebe ganha o aviso** (linha 657): resposta do Gui à P6 do QA de 23/11/2026.

## Reações

- **Abertura da seção** (linha 664): onda 2, decisão do Gui de 17/11/2026; refeitas no padrão das redes na observação de 18/11/2026.
- **Os quatro símbolos** (linha 667): a versão final de 18/11/2026 (do riso).
- **As recebidas** (linha 669): Não há mais o link "Quem marcou".

## Botão de menu nas memórias

- **Abertura da seção** (linha 678): Observação do Gui de 18/11/2026 (era "Observação do Gui de 18/11/2026 ("Padrões que as pessoas já conhecem", em `docs/visual.md`).").
- **A memória, cada relato e cada foto da parede** (linha 680): sugestão do Gui, 18/11/2026: o menu ficava escondido na ponta da coluna, encostado nas fotos; No celular continua como está.
- **Memória** (linha 681): Compartilhar e sugerir saíram do pé da página; o pé continua com corrigir, as sugestões abertas, o histórico e excluir.

## Compartilhar como imagem

- **Abertura da seção** (linha 690): Onda 2, decisão do Gui de 17/11/2026.
- **No menu da memória publicada** (linha 692): Não há mais a assinatura com o nome do site (observação do Gui, 18/11/2026).
- **Qual nome usar** (linha 695): decisão do Gui, 18/11/2026, depois da sessão H; resposta do Gui à P7 do QA de 23/11/2026.
- **O espaço de personalizar** (linha 696): proposta A do conceito da sessão J, escolha do Gui de 18/11/2026; Em vez de uma escolha solta, que mudava o tamanho da página,.
- **"Em memória" é opção** (linha 701): resposta do Gui, 18/11/2026.

## Ampliar quem vê uma memória com relatos

- **Só quem criou grava o público** (linha 711): revisão Y2 do PR #160, 22/11/2026.
- **A conta sai dos relatos que existem na hora do lote** (linha 712): (revisão Y2 do PR #160); (Y3 do PR #160), depois de "a gravação do relato, nova ou não"; Caminho escolhido na W3 no lugar de calcular a espera no SQL do lote (ficou "A espera não é calculada no SQL do lote").
- **Só a mudança de quem vê recalcula os relatos** (linha 713): revisão Y do PR #160, 22/11/2026.
- **O relato só espera por quem nunca o viu** (linha 714): resposta do Gui à P3 do QA de 23/11/2026.
- **O rascunho de relato descartado fica fora da espera** (linha 716): (revisão Y do PR #160).
- **O autor** (linha 719): resposta do Gui à crítica C2, 22/11/2026 (do pedido que mostra o relato); (revisão Y do PR #160), do pedido que diz o público de agora; decisão do Gui, 22/11/2026 (do histórico do pedido com uma linha por ciclo de ampliar).
- **A resposta confere o público** (linha 721): (revisão Y2 do PR #160).
- **"Manter como estava" vale só para o público que foi perguntado** (linha 722): decisão do Gui, 22/11/2026; As respostas de antes da W3, sem o público guardado, pedem de novo.
- **O pedido para um público já recusado sai da lista** (linha 723): decisão do Gui, 22/11/2026, Y3 do PR #160.
- **O relato que nasce depois de a memória abrir espera** (linha 724): decisão do Gui, 22/11/2026, Y3 do PR #160; D5 da sessão Z.

## Explorar

- **`/explorar`: uma tela só** (linha 734): "Os controles seguem a proposta A do conceito da sessão D, "cada coisa no seu lugar" (decisão do Gui, 18/11/2026)".
- **"Forma de ver"** (linha 739): "(respostas do Gui às críticas C1 e C2, 22/11/2026, e escolha dele na E2: sem a segunda linha do esboço `explorar-saidas.html`, para a primeira foto subir)".
- **"Quem estava junto" com o parentesco de quem olha** (linha 742): "(respostas do Gui às críticas C1 e C2, 22/11/2026; ...)".
- **Quais fotos o mural mostra** (linha 769): "(pedido do Gui, 18/11/2026; construído em 19/11/2026)".
- **Modo TV: quem está vendo escolhe o tempo** (linha 770): a primeira metade do item foi para a seção "Modo TV", e "Mural:" ficou como item próprio em "Explorar". Nada saiu.

## Modo TV

A seção "Modo TV" separou do "Explorar" os itens do modo TV (linhas 749 a 770), sem mudar a ordem entre eles. O desenho que se repetia com `docs/visual.md`, "O modo TV", ficou só lá; o comportamento que só estava no `visual.md` (as teclas de mídia com os controles ocultos, o foco no botão do canto, o ponteiro à vista, a tabela das teclas, as setas, o Esc e o toque na foto abaixo de 62rem em pé) veio para cá.

- **Modo TV, a partir de 62rem: a barra** (linha 749): "(proposta A da sessão X, escolhida pelo Gui em 22/11/2026, com as respostas do mesmo dia; o conceito está em [`historico/sessao-x/leia-me.md`](sessao-x/leia-me.md))". O título dizia "Modo TV, a partir de 62rem: a barra"; com a seção própria, ficou "A partir de 62rem, a barra".
- **Proporcional à janela** (linha 751): as medidas foram juntadas com `docs/visual.md` ("Tudo é proporcional à janela" e "A memória longa desce na escala"), que já as tinha: "No modo TV, 1rem é 1/80 da largura ou 1/45 da altura, o que for menor: 16 px em 1280 × 720 e 24 px em 1920 × 1080, onde o que se lê tem 24 px e os controles, 22 px."
- **A barra** (linha 752): juntada com `docs/visual.md` ("A barra" e ""Ajustes""): "A barra é um cartão branco, o material do site, que flutua no pé da tela, centrado. "Sair do modo TV" e a conta ("Modo TV · 25 de 49") ficam no alto. "Ajustes" abre uma folha do mesmo cartão, que sobe da barra."
- **Símbolos com nome** (linha 753): a lista dos símbolos foi juntada com `docs/visual.md` ("Os símbolos"), que já a tinha: "anterior, tocar e pausar (no mesmo botão, que troca o símbolo e o nome: "Passar sozinho", "Pausar", "Retomar"), próxima, tela cheia e sair da tela cheia, ajustes e ocultar os controles. "Sair do modo TV", "Abrir esta memória", "Só as fotos" e "Mostrar o texto" continuam escritos." A frase "Os símbolos são peça do sistema (`Simbolo.astro` e `BotaoDeSimbolo.astro`), para a navegação usar depois." foi para `docs/visual.md`, "Os símbolos".
- **As teclas** (linha 754): "a tabela está em `docs/visual.md`" virou "A tabela das teclas está no fim desta seção": a tabela veio do `visual.md` (linhas 461 a 476 do `visual.md` antigo).
- **Ocultar os controles** (linha 755): "(pedidos do Gui, 22/11/2026: desocultar precisa ser fácil, e tocar em qualquer lugar ou apertar qualquer tecla não pode ser o comando, porque o teclado continua passando as memórias)" virou a marca "(Gui, 22/11: ...)", com o texto do Gui inteiro. Do `visual.md` (linha 459) vieram as teclas de mídia, o foco no botão do canto ao chegar a memória seguinte, o ponteiro à vista e "até a pessoa pedir de volta".
- **A janela deitada** (linha 756): "(aplicação da E1, 25/11/2026)". O desenho foi juntado com `docs/visual.md`, "A janela deitada abaixo de 62rem": "a unidade é outra para o toque continuar com 44 px (1rem é 1/52 da largura ou 1/24 da altura). A barra fica embaixo da foto, à esquerda, com a folha de "Ajustes" subindo da ponta dela e o botão que traz os controles no mesmo canto. O título fica em até duas linhas, o trecho em até duas, quem estava numa só".
- **Abaixo de 62rem, em pé** (linha 757): "o modo TV é o de antes" virou "o modo TV fica sem a barra". Do `visual.md` (linha 486) vieram "As setas passam, o Esc fecha "Ajustes" e depois sai, e tocar na foto passa para a seguinte. A tela cheia e o ocultar só existem na barra."
- **O modo TV segue os filtros de onde foi aberto** (linha 759): "(escolha do Gui, 22/11/2026, depois da exploração E1)"; "o tema e a pessoa na resposta do Gui à pergunta 2 do PR #174, 25/11/2026".
- **A TV da sala** (linha 760): "(aplicação da E1, o modo TV como porta; brief em ...)".
- **A regra da sala** (linha 761): "(respostas do Gui de 22 e 24/11/2026)".
- **O marcador da sala** (linha 762): "(correção 2 da revisão R-AB, 25/11/2026; ...)"; "(decisão do Gui, 25/11/2026, pergunta 4 do PR #174; correção 2 da revisão R-AB2)"; "O tamanho foi escolhido pela tela: a `npm run tv` confere cada parte nas oito janelas, e 480 é o maior que coube em 667 × 375 com um relato de 2.400 letras."; "(correção 2 da revisão R-AB3)"; "(R-AB4)"; "Capturas em `docs/visual/aplicacao-e1/ler-tudo-*.jpg`."
- **A carta na TV** (linha 764): "(a da proposta A)"; "(correção 3 da revisão R-AB2)"; "(correção 4 da revisão R-AB)"; "(resposta do Gui à pergunta 3 do PR #174, 25/11/2026)"; "Na janela deitada pequena, o parágrafo grande coube (667 × 375); a carta numa tela só, a reserva da exploração, não foi preciso."
- **O simulador de data** (linha 765): "desde a correção 8 da revisão R-AB"; "Desde a correção 5 da revisão R-AB2, também"; "Com essas, a regra para aqui (decisão do chat)".
- **A voz de quem contou no modo TV** (linha 767): "(aplicação da E1)"; "(`relatoNaTv`; a foto na correção 3 da revisão R-AB)"; "(correção 1 da revisão R-AB)"; "(correção 1 da revisão R-AB2)"; "(correção 1 da revisão R-AB3; `portaoDaVoz`, ...)"; "Os defeitos de uso achados na revisão R-AB4:" (virou "E mais:"); "(correção 4 da revisão R-AB2)"; "(correção 6 da revisão R-AB, decidido pelo chat; o Gui pode trocar)". O desenho foi juntado com `docs/visual.md`, "O botão de som e a voz": "Embaixo do trecho, "A voz de Vó Vivica · 0:11", com o fio que anda enquanto ela fala"; "(os símbolos `som` e `sem-som`)"; "o símbolo ganha um ponto na cor viva".
- **O modo TV lê uma memória só por passagem** (linha 768): "(causa 6 da medição M1, feita na aplicação da E1)"; "(correção 5 da revisão R-AB)"; "correção 1 da revisão R-AB"; e a medida: "No acervo cheio, celular e 4G lento: a passagem logo em seguida continua em 43 a 60 ms; depois de 35 segundos parado, a próxima leva uns 310 ms (o pedaço de novo); "Passar sozinho" a 10 segundos pede um pedaço por passagem e a 15, 1,7."

## Visual

- **Aspas curvas** (linha 788): "(resposta do Gui à P8 do QA de 23/11/2026)".
- **Nada salta na página** (linha 789): "(decisão do Gui, 19/11/2026)". A regra foi juntada com `docs/visual.md`, "O nível de qualidade", que já a tinha inteira: ""Largura inteira" quer dizer a largura inteira disponível: com um elemento parado ao lado, o conteúdo vai até onde dá, sem mudar de lugar. Trocar a forma de ver nunca muda o lugar de nada."
- **Gestalt que se confere sozinha** (linha 790): "(pedido do Gui, 17/11/2026; construída em 18/11/2026)"; "As exceções da lista ficam como o QA de 18/11/2026 deixou (decisão do Gui)." virou "ficam como estão (Gui, 18/11)".
- **Conceito primeiro, com parada** (linha 791): "(pedido do Gui, 17/11/2026)"; "Foi assim com o quadro do mapa, editar pessoa e laços, Pessoas, a conta, os controles do Explorar e a página da pessoa."

## visual.md, O nível de qualidade

- **Cor com função** (linha 85): "Deleite visual também é função (decisão do Gui, 16/11/2026)" (ficou a marca "(Gui, 16/11)").
- **Padrões que as pessoas já conhecem** (linha 88): "(premissa do Gui, 18/11/2026)" (ficou a marca "(Gui, 18/11)").
- **Interação sem recarregar a página** (linha 89): "(premissa do Gui, 18/11/2026)" (ficou a marca "(Gui, 18/11)").
- **Nada salta na página** (linha 90): "(decisão do Gui, 19/11/2026)" (ficou a marca "(Gui, 19/11)").
- **Gestalt em toda tela** (linha 91): "(premissa do Gui, 17/11/2026)" (ficou a marca "(Gui, 17/11)").
- **Proximidade** (linha 92): "(foi o caso das linhas na legenda da árvore)", depois de "\"Quase o mesmo antes e depois\" é defeito".

## visual.md, Sistema

**As peças e como usar**

- **Segmentado.astro** (linha 182): "(aprovado pelo Gui, 18/11/2026)" (ficou a marca "(Gui, 18/11)"); "A regra (liberada pelo Gui, 18/11/2026):" (ficou "A regra (Gui, 18/11):").
- **BotaoDeSimbolo.astro** (linha 183): "Nasceu no modo TV (22/11/2026) e fica para a navegação" (ficou "Fica para a navegação").
- **Medidas das peças** (linha 193): "O retrato é de foto de álbum (decisão do Gui, 18/11/2026)" (ficou a marca "(Gui, 18/11)"); "O arco saiu: qualquer forma alta de topo redondo lembrava lápide em quem faleceu." (ficou "O retrato não tem arco: qualquer forma alta de topo redondo lembra lápide em quem faleceu."); "No círculo, todos os retratos são redondos (decisão do Gui depois da sessão J)." (ficou a marca "(Gui, 18/11)", a data das decisões do Gui depois da sessão J); "(decisão do Gui depois do QA de 18/11/2026)" (ficou a marca "(Gui, 18/11)"); "(`TarjaDoDiscreto.astro`, pedido do Gui de 18/11/2026)" (ficou "(`TarjaDoDiscreto.astro`; Gui, 18/11)").

**Como a fonte é trocada**

- **A faixa do alto das prévias** (linha 255): "A faixa do alto das prévias não troca mais a combinação (decisão do Gui, 23/11/2026)" (ficou "não troca a combinação (Gui, 23/11)"); "Quem ainda tem uma combinação guardada de antes (o cookie `fontes`, ...)" (ficou "Quem tem uma combinação guardada (o cookie `fontes`, ...)").

**Tipos: paleta e ícones**

- **A paleta** (linha 283): "as doze de 17/11/2026 (limão, ...)" e "as onze de 18/11/2026 (salmão, ...)" (ficaram "as doze de `CORES_NOVAS`" e "as onze de `CORES_MAIS_NOVAS`").
- **Cor nova só entra com folga** (linha 284): "As onze de 18/11/2026 ficam" (ficou "As onze de `CORES_MAIS_NOVAS` ficam"); "mostarda, jade e tangerina foram tentadas e não couberam.", depois de "Entre o amarelo e o verde e entre o laranja e o amarelo a paleta está cheia:".
- **A mesma distância com folga de 1,2 vez** (linha 294): "As onze de 18/11/2026, contra todas" (ficou "As onze de `CORES_MAIS_NOVAS`, contra todas").
- **Os rabiscos** (linha 297): "Os 55 de 18/11/2026:" (ficou "Os outros 55:").
- **Como chega à tela** (linha 298): "A coluna antiga `cor` não é mais lida." (ficou "A coluna `cor` não é lida.").

**O que ficou de fora do sistema, de propósito**

- **Camadas do CSS** (linha 317): "tentadas uma vez, mudaram a altura de várias telas, porque elas dependem da ordem dos arquivos, e não foram adotadas. A regra continua a de \"A ordem do CSS\", abaixo." (ficou "não são usadas, porque as telas dependem da ordem dos arquivos, e com elas a altura de várias telas muda. A regra é a de \"A ordem do CSS\", abaixo.").

**Cuidados que custaram tempo**

- **Safari do iPhone e peças paradas** (linha 325): "com uma animação por ano, a faixa e o ano davam um pulinho na troca de ano" (ficou "dão um pulinho").

## visual.md, As telas

**Início**

- **Você no acervo** (linha 364): "(proposta B do conceito da sessão H, capturas em `docs/visual/conceito-h/`)" (ficou "(Gui, 18/11; capturas em `docs/visual/conceito-h/`)").

**Sua conta**

- **Composição** (linha 377): "Composição da proposta A do conceito da sessão E (escolha do Gui, 17/11/2026; capturas em `docs/visual/sessao-e/conta/`), igual para todos desde que a administração ganhou página própria (18/11/2026)." (ficou "Composição (Gui, 17/11; capturas em `docs/visual/sessao-e/conta/`), igual para todos.").
- **O cartão da administração** (linha 380): "(proposta A do conceito da sessão H, capturas em `docs/visual/conceito-h/`)" (ficou "(Gui, 18/11; capturas em `docs/visual/conceito-h/`)").

**Explorar**

- **Os textos do formulário, do palco e do pé do trilho** (linha 385): "(os da proposta A, 18/11/2026)" (ficou a marca "(Gui, 18/11)").
- **Os controles: cada coisa no seu lugar** (linha 387): "(proposta A do conceito da sessão D, decisão do Gui de 18/11/2026; capturas do conceito em ...)" (ficou "(Gui, 18/11; capturas do conceito em ...)").
- **O verso, no computador** (linha 431): "Virar a foto foi descartado: esconde a foto no momento em que a pessoa aponta para ela." (ficou "A foto não vira: virar esconderia a foto no momento em que a pessoa aponta para ela.").
- **Quais fotos** (linha 432): "(19/11/2026)".
- **A barra, a partir de 62rem** (linha 449): "(proposta A da sessão X, escolhida pelo Gui em 22/11/2026: o material do site ...)" (ficou "(Gui, 22/11: o material do site ...)").
- **A janela deitada abaixo de 62rem** (linha 478): "aplicação da E1, 25/11/2026; ".
- **O botão de som e a voz** (linha 480): "(aplicação da E1)".
- **A carta da sala** (linha 482): "aplicação da E1, a carta da proposta A; "; "(pergunta 3 do PR #174)" (ficou a marca "(Gui, 25/11)", a data da resposta do Gui à pergunta 3 do PR #174).
- **"Ler tudo" na sala** (linha 484): "correção 2 da revisão R-AB2; ".

**Página da memória**

- **4. Relatos, um por pessoa** (linha 525): "(observação do Gui depois da sessão K, construída na sessão L)" (ficou a marca "(Gui, 18/11)").

**Página da pessoa**

- **O verbete** (linha 535): "(proposta A do conceito da sessão L, escolha do Gui de 18/11/2026; o estudo ...)" (ficou "(Gui, 18/11; o estudo ...)").
- **A cor da família, com medida** (linha 542): "(pedido do Gui ao escolher: a página inteira em cor seria demais; aprovada depois de ver)" (ficou "(Gui, 18/11: a página inteira em cor seria demais)").

**Pessoas**

- **O alto** (linha 549): "Proposta B do conceito da sessão E (\"Índice ao lado\", escolhida pelo Gui em 17/11/2026, com dois ajustes)." (ficou "O desenho é o \"Índice ao lado\" (Gui, 17/11).").

**Página do laço**

- **A ideia** (linha 573): "A régua da primeira rodada saiu: ela dizia de novo o que as fases e os marcos já dizem, cortava os nomes das fases no celular e pintava cada fase com uma cor sem função." (ficou "Não há régua: ela diria de novo o que as fases e os marcos já dizem, cortaria os nomes das fases no celular e pintaria cada fase com uma cor sem função.").

**Formulários**

- **Nova memória (`/nova`): a frase é a trilha** (linha 605): "(proposta B do conceito da sessão D, decisão do Gui de 18/11/2026; capturas do conceito em ...)" (ficou "(Gui, 18/11; capturas do conceito em ...)").
- **Editar página e laços (`/pessoas/<id>/editar`)** (linha 622): "proposta A do conceito da sessão E (escolha do Gui, 18/11/2026; capturas em `docs/visual/sessao-e/editar/`)." (ficou "(Gui, 18/11; capturas em `docs/visual/sessao-e/editar/`)").

## visual.md, Para o futuro

- **Nada anotado no momento** (linha 632): "A página do laço, que estava aqui, foi feita (ver \"Página do laço\", em \"As telas\")."

## visual.md, as fontes A e B e a rota do conceito

O Gui decidiu em 26/11/2026 (pergunta 3 da auditoria AC, resposta a) tirar as combinações A e B de fontes e a rota do conceito (`/conceito/sobre`), e deixar a página do sistema só com a C; a sessão AC1 tira o código. O `visual.md` foi escrito já sem essas peças. O que saiu de "Como a fonte é trocada", "Monograma" e "Cuidados que custaram tempo":

- "hoje a combinação C. A combinação inteira: `combinacao('a')`, `combinacao('b')` ou `combinacao('c')`. Misturada: `{ ...combinacao('a'), mao: 'b' }`."
- "o monograma certo acende, a largura da assinatura acompanha e o ícone vem de `public/icones/<serifa>/`."
- "As três combinações ficam no sistema, todas de licença livre, pelo Fontsource:" e a tabela: A, Macia (Fraunces, Geist, Geist Mono, Oooh Baby; a mais próxima de Recoleta); B, Editorial (Instrument Serif, Instrument Sans, IBM Plex Mono, Reenie Beanie; condensada, de revista, com a grotesca do bayara.design); C, De cartaz, a do site (DM Serif Display, DM Sans, DM Mono, Nothing You Could Do; pesada, de cartaz).
- "A página `/sistema` tem o seletor "Fontes dos exemplos" (`?fontes=a`, `b` ou `c`), que põe os quatro atributos só no bloco dos exemplos (`.sis__exemplos`), para comparar se a decisão mudar. `/conceito/sobre` mostra as três lado a lado nas prévias."
- "A faixa do alto das prévias não troca a combinação (Gui, 23/11): a fonte do site está escolhida, e a comparação fica em `/sistema`. Quem tem uma combinação guardada (o cookie `fontes`, que só vale nas prévias de teste e no computador) vê um recado na faixa, com o link de volta à do site."
- "Fonte nova, fora das três".
- Monograma: "lê o M direto dos arquivos das três serifas" e "os ícones em `public/icones/<a, b ou c>/`".
- Cuidados: "e o script contorna isso para a Fraunces".

## CLAUDE.md

O `CLAUDE.md` passou de 31 KB para uns 15 KB em 26/11/2026 (sessão AC2, auditoria AC, proposta D-6, com o sim do Gui na pergunta 5). O texto inteiro de antes está no commit `1c7a642`. O que saiu como processo:

- **Quem lê o quê:** reescrito para a divisão em `docs/regras/` (D-7). Antes: "`docs/decisoes.md` e `docs/visual.md` trazem só as regras em vigor. ... Cada seção dos documentos enxutos termina com o link para o trecho do histórico de onde veio, e `docs/historico/mapa-da-reducao.md` diz para onde foi cada título antigo. Sessão de construção lê os enxutos. ... Decisão nova entra no enxuto, na seção do assunto, já como regra."
- **Divisão do trabalho:** "(decisão do Gui, 15/11/2026)"; "(decisão do Gui, 18/11/2026, trazida do bayara.design)".
- **Repensar a interface em vez de forçar uma decisão:** "(decisão do Gui, 22/11/2026)"; "O caso que deu origem à regra: o modo TV que cabia em 1280 × 720 à custa de cortar os controles (PR #157, fechado sem juntar)."
- **Pasta do projeto no Drive:** foi inteira para `docs/drive.md`; no `CLAUDE.md` ficou uma linha.
- **Branches e publicação:** a tabela juntou a do `docs/publicar.md` (a linha do computador, a aplicação do Access da homologação e a troca de pessoa no topo). A descrição dos dados da homologação dizia "a família de verdade espelhada da produção (nomes, retratos e laços)"; os retratos nunca passam (o código e `docs/copia-no-drive.md`), e a linha passou a dizer "o espelho da produção (a família de verdade, com memórias de exemplo)". Saíram: "(ou da `main`, enquanto a `homologa` não existir)"; "Mudança só de documentação ou de regras de trabalho (`CLAUDE.md`, `README.md`, `docs/`) pode ir direto para a `main`, para toda sessão nova já encontrar. Depois, traga a `main` para a `homologa`." (contradizia a linha da rodada; o Gui escolheu a `homologa` em 26/11, pergunta 6 da auditoria AC); "(decisão do Gui, 18/11/2026; antes disso, de 16 a 18/11, nada de código ia para a `main`). A primeira rodada levou a revisão visual e as estruturas novas em 18/11/2026."; "A antiga prévia `formulario`, que a Giovanna usava antes de a homologação existir, foi aposentada em 16/11/2026. A Giovanna usa a homologação." O jeito de apagar a branch pela página Branches foi para `docs/sessoes.md`.
- **O espelho da produção:** foi para `docs/copia-no-drive.md`, "O espelho da produção"; no `CLAUDE.md` ficaram duas linhas. Saiu "(sessão D1e, 23/11/2026)". Corrigido pelo código (auditoria AC, C-1): o texto dizia "O espelho é gravado direto no banco e no bucket da homologação" e "ela só lê os próprios retratos para montar a cópia"; o espelho não grava em bucket nenhum e a cópia para o espelho não lê o bucket. A frase da faixa ("diz "Homologação: a família de verdade, com memórias de exemplo"") ficou só como "listrada": o texto exato está em `docs/copia-no-drive.md`, "Espelho da produção".
- **O que nunca fazer:** ganhou as regras de "nunca" que estavam em outras seções (forçar push, editar migração publicada, a produção gravando na homologação, a sessão de QA na `main`), sem mudar o sentido.
- **Conferências:** o parágrafo da guarda, o de `npm test`, o da gestalt, o do desempenho e o do GitHub foram para `docs/regras/conferencias.md`. Saiu "desde a revisão D1f" e "de antes" (as recusas pela leitura do texto). A descrição de `npm test` dizia "os testes em `testes/`, das regras de permissão, das datas, do login, do parentesco e da árvore"; são mais de 130 arquivos sobre quase todo o site (auditoria AC, 2.2). Entraram `npm run tv` e as regras 8 e 9 da guarda, que faltavam. "(proposta do QA de 23/11/2026, aceita pelo Gui em 22/11/2026)" virou "(Gui, 22/11)"; "O motivo (decisão do Gui, 20/11/2026): o repositório vira privado depois de 10/12/2026, e a cota mensal de Actions do plano gratuito é uma só para todos os repositórios privados da conta" ficou em `docs/regras/infraestrutura.md`, "GitHub Actions enxuto".
- **Escrita:** "(resposta do Gui à P8 do QA de 23/11/2026)".
- **Visual:** "A direção visual foi definida em 16/11/2026 e está em `docs/visual.md`: claro, serifa macia nos títulos, pastéis com pontos saturados, foto como objeto e movimento discreto. A análise das referências está no Claude Doc linkado ali." (juntada com `docs/visual.md`, "A direção"); "A revisão visual foi do zero (o relato das fases está no histórico, `docs/historico/visual-ate-2026-11-17.md`). Na fase 3 todas as telas passaram para o visual novo, em quatro PRs empilhados para a `homologa`, e o estilo antigo (`src/styles/global.css`, `Base.astro`) foi apagado no último." e "Na `main`, o estilo antigo continua no ar até a revisão inteira ser levada para lá." (já não valia: a `main` não tem os dois arquivos; auditoria AC, C-4); "O sistema visual (fase 2) está em `src/visual/` e `src/components/visual/`, descrito em "Sistema" de `docs/visual.md`. A fonte do site é uma linha só: `FONTES_DO_SITE`, em `src/lib/visual.ts`." (juntada com `docs/visual.md`, "Sistema"); "O monograma e os ícones do site são gerados por `npm run monograma` e ficam versionados. Só rode de novo se uma serifa mudar." (juntada com `docs/visual.md`, "Monograma"); "Proximidade (pedido do Gui, 18/11/2026): ... O espaço entre grupos é bem maior que o espaço dentro de um grupo, e um título fica colado no que nomeia, nunca com quase o mesmo espaço antes e depois." virou "pelo menos o dobro", a formulação de `docs/visual.md` e a que `npm run gestalt` confere (auditoria AC, D-5).
- **Árvore:** os itens do arquivo de dados da prévia, da montagem e do desenho e do Figma foram para `docs/regras/arvore.md`, "Como trabalhar na árvore"; o dos centros da árvore foi juntado com "Os centros da árvore", que já tinha o mesmo texto. "(decisão do Gui, 17/11/2026)" virou "(Gui, 17/11)".
- **Relatório no fim de toda sessão:** "(18/11/2026)" virou "(18/11)".
- **Sessões de QA:** foi inteira para `docs/qa.md`, com as regras de "nunca" repetidas no `CLAUDE.md`. "As pendências conhecidas estão em "Em aberto" e nas questões de `docs/decisoes.md`" virou ""Decidido, a construir" e "Em aberto", em `docs/decisoes.md`".
- **Sessão de QA de UX:** o texto "arruma a interface atual em padrões ... para que a troca para o visual final seja feita em poucos lugares, sem julgar a aparência de hoje" partia de uma direção visual que ainda não existia (auditoria AC, D-2). No `CLAUDE.md` ficou uma linha que parte do visual que existe; o procedimento continua em `docs/qa-ux.md`.
- **Cuidados que já custaram tempo:** foram para `docs/sessoes.md`, fora a banda do Safari, que já estava inteira em `docs/visual.md`, "Cuidados que custaram tempo", e "Apply to existing Previews", que já estava em `docs/publicar.md`.

## Outros documentos

- **`docs/qa-ux.md`:** a premissa "A direção visual ainda não existe. Quando ela chegar, a interface atual vai trocar de pele: cores, tipografia, tamanhos, cantos, espaçamentos. Essa troca é barata se o site já repete poucos padrões bem nomeados, e cara se cada página resolve o mesmo problema do seu jeito. O objetivo da sessão é deixar a interface atual organizada em padrões, para que a troca de visual seja feita mexendo em poucos lugares. Ela não julga a aparência. Cor, fonte, raio e tamanho de hoje são provisórios e não entram como defeito." deu lugar à premissa do visual que existe. Também mudaram o título ("QA de UX: padrões para a troca de visual"), os exemplos de token (`--espaco-2` e `--toque-minimo`, que não existem, viraram `--e-2` e `--toque`), "para o visual final ajustar", o item 6 do relatório ("O que fica para quando o visual for definido") e o prompt ("A direção visual ainda não foi definida: não julgue aparência"; "para que a troca para o visual final seja feita em poucos lugares"). O escopo não mudou.
- **`docs/qa-design.md`:** foi para `docs/historico/qa-design.md`. Nenhum documento em uso apontava para ele, e ele falava da rodada de 17/11/2026.
- **`docs/publicar.md`:** a tabela dos ambientes foi juntada com a do `CLAUDE.md`; "O login dela é uma aplicação própria no Access, só com o Gui e a Giovanna." ganhou o Magno (auditoria AC, C-3); "(17/11/2026)" virou "(Gui, 17/11)"; "Mudar a estrutura do banco" passou a apontar para o `CLAUDE.md`, que tinha as mesmas regras.
- **`docs/briefs/busca-no-explorar.md` e `docs/briefs/feedback-de-estado.md`:** a linha "Situação" dizia "Vira a sessão de exploração E2 (E4): duas propostas numa prévia ..., e a sessão para até o Gui escolher."; a escolha já estava no fim de cada brief.
- **`docs/briefs/desempenho.md`:** os blocos "Feito na D1a" a "Feito na AB4" foram inteiros para `docs/historico/briefs/desempenho-feito.md`, e no lugar ficou "O que já está no site", com o estado atual.
- **`README.md`:** a lista dos documentos acompanhou a divisão, e `testes/` deixou de ser descrito como "testes das regras de permissão, das datas, do login, do parentesco e da árvore".

## Decidido, a construir

- **A introdução** (linha 797): "A limpeza de 18/11/2026 (sessão L) tirou daqui tudo o que já estava no site: as observações depois das sessões F, G, I e J, o retrato de álbum, o slider, o espaço de personalizar a imagem, os ícones e as cores dos tipos, a fonte C, a revisão de estrutura das telas, a página da pessoa (das sessões E e L), o círculo de volta aos retratos redondos e a conversa na página da memória; cada um está na seção do assunto, e a lista como estava antes fica em ...".
- **Críticas de design C1 e C2** (linha 799): "Os pontos pequenos foram construídos na sessão AA (23/11/2026) e viraram regra nas seções do assunto: "Início (painel pessoal)", "Explorar", "Páginas de leitura", "Relato como conversa" e "Ampliar quem vê uma memória com relatos"."
- **A peça de feedback de estado** (linha 806): "(exploração E4, aprovada pelo Gui em 24/11/2026)"; "Duas propostas numa prévia `tst-feedback`, e a sessão para até o Gui escolher." (a escolha foi feita em 24/11 e está no brief).
- **Desempenho antes do Natal** (linha 807): "em sessões D1 e D2" (a D1 e a causa 6 já estão no site; faltam a D2 e a D3).
- **Pacote pequeno** (linha 810): "(Sonnet)"; "até segunda".
- **Navegação do celular com cara de aplicativo** (linha 816): "escrito na segunda"; "(ver "Visual", no CLAUDE.md)" virou "Movimento", em `docs/visual.md`.
- **Rever a navegação e os botões do formulário de memória nova** (linha 817): "para depois de segunda".
- **O mínimo de recarregamentos** (linha 818): "(sessão L)".
- **Revisão visual: movimento, detalhes e o aparelho** (linhas 819 a 822): "e o tocador de áudio próprio" saiu da fase 4, porque já está no site (`docs/visual.md`; auditoria AC, C-6); "Quando a revisão terminar, `docs/ux/revisao-visual.md`, `docs/ux/padroes.md` e `docs/ux/capturas/` saem de cena (já movidos para `docs/historico/ux/` em 18/11/2026)."


## Depois da AC1

A AC1 (#176, juntada na `homologa` em 26/11/2026) mudou código que os documentos citavam. Ao trazer a `homologa`, os documentos acompanharam:

- `docs/regras/explorar.md`, abertura: a consulta citada era `explorarMemorias`, que a AC1 tirou por não ter uso; a citação passou a `contextoDoExplorar`, o que os filtros leem do banco.
- `docs/visual.md`, "As peças e como usar": a linha "Um áudio" apontava para `Audio.astro`, que a AC1 tirou; passou a apontar para a voz da conversa. Em "A página do sistema fica", entrou a voz da conversa no lugar do bloco de áudio.
- A guarda das migrações recusa também `ON DELETE SET NULL` e `SET DEFAULT` e a chave posta por `ALTER TABLE ... ADD COLUMN` (`docs/regras/conferencias.md` e `CLAUDE.md`, "Banco de dados"); o teste do esquema da cópia recusa tabela `WITHOUT ROWID` (`docs/copia-no-drive.md`, "O esquema que a cópia sustenta", e `docs/regras/conferencias.md`).
- `npm run tv` recusa a produção e a homologação (`docs/regras/conferencias.md` e `docs/regras/explorar.md`).
- A regra 8 da guarda passou a dizer que a rota do conceito não existe e que, se voltar, precisa da trava.
- Os motivos que a auditoria pedia escritos (6.4): o dos registros do Workers (`observability`) em `docs/regras/infraestrutura.md`, e o dos 7 dias da limpeza do bucket de teste em `docs/regras/exemplos.md`, como a AC1 escreveu no código.

## Revisão R-AC2

A revisão da AC2 (Grok e Codex) fechou com três correções de texto, sem mudar o sentido de nenhuma regra:

- `docs/regras/arvore.md`, "Linhas": voltou a regra geral do `CLAUDE.md` antigo (linha 139 de `1c7a642`), "Linhas que andam juntas são desenhadas uma vez só, para o tracejado não virar linha cheia.", ao lado da regra de curva e ângulo reto. Ela tinha sido dada como juntada com o item dos troncos dos laços do coração, que só cobre esse caso.
- `docs/regras/memoria.md`, "Reações": voltou "Não há mais o link "Quem marcou"." (linha 669 de `1c7a642`), que tinha saído como processo. O item "As recebidas" de "Reações", acima, registrava a saída.
- `docs/visual.md`, "O que falta", "Da fase 4": o tocador de áudio próprio saiu da lista, porque já existe (`conversa/Mensagem.astro`), como na fila de `docs/decisoes.md` (C-6).
