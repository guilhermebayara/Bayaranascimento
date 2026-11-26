# Mapa da redução (26/11/2026, sessão AC2)

Para onde foi cada regra do `docs/decisoes.md`, do `docs/visual.md` e do `CLAUDE.md` de antes da sessão AC2. O texto antigo dos três está no commit `1c7a642` (`git show 1c7a642:docs/decisoes.md`), e o número de cada linha é o dele. Uma regra é uma linha do documento antigo: um item de lista, um parágrafo ou uma linha de tabela; os títulos, as linhas "Origem:" e os cabeçalhos de tabela ficam de fora.

Como ler a coluna "Para onde foi":

- **igual, em `regras/x.md`:** a regra foi copiada sem mudança para o arquivo do assunto, em `docs/regras/`, na seção de mesmo nome.
- **`regras/x.md`; ... no histórico:** a regra está no arquivo do assunto, e o processo que saiu dela (o parêntese de origem, a sessão, o "antes...") está em `decisoes-depois-de-2026-11-17.md`, nesta pasta, na seção de mesmo nome, com o número da linha.
- **marca (Gui, dd/mm):** onde a regra foi decisão do Gui, o parêntese longo virou essa marca curta.
- **juntada com:** a regra se repetia noutro lugar, e ficou num só, o indicado.
- **histórico, inteira:** a linha era só processo e saiu inteira para o histórico.
- **dividida:** uma parte foi para um lugar e outra parte para outro.

As contradições corrigidas pelo código (C-1 a C-7 do relatório da auditoria AC, `docs/auditoria/2026-11-estrutura.md` na branch `tst-auditoria-estrutura`) estão marcadas na linha da regra.

## docs/decisoes.md

| Linha | A regra (começo) | Para onde foi |
| --- | --- | --- |
| 3 | As regras em vigor do site da família, por … | docs/decisoes.md, abertura, reescrita para o índice: as regras moram em docs/regras/, e a marca (Gui, dd/mm) é explicada ali |
| 5 | Abra o histórico quando uma regra parecer incompleta, contraditória … | docs/decisoes.md, abertura, igual, junto com quem lê o quê |
| 9 | Memória: a ficha compartilhada de um acontecimento (título, data, … | igual, em `regras/site.md`, "Estrutura e princípios" |
| 10 | Relato: a lembrança de uma pessoa sobre uma memória. … | igual, em `regras/site.md`, "Estrutura e princípios" |
| 11 | Pessoa: quem aparece nas memórias. | igual, em `regras/site.md`, "Estrutura e princípios" |
| 12 | Ninguém interfere em como outra pessoa lembra de algo. | igual, em `regras/site.md`, "Estrutura e princípios" |
| 13 | Toda mudança fica registrada em um histórico e pode … | igual, em `regras/site.md`, "Estrutura e princípios" |
| 14 | Excluir nunca apaga na hora: o conteúdo vai para … | igual, em `regras/site.md`, "Estrutura e princípios" |
| 15 | O acervo é privado, com acesso por e-mail. | igual, em `regras/site.md`, "Estrutura e princípios" |
| 16 | Memória e capítulo novos ganham um código aleatório no … | regras/site.md, Estrutura e princípios; "denunciava" virou "denunciaria" (o motivo continua) |
| 17 | O site é o registro para a próxima geração. | igual, em `regras/site.md`, "Estrutura e princípios" |
| 25 | Criar memória, capítulo ou tema Qualquer pessoa com acesso. … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 26 | Editar um capítulo Quem criou e os admins, desde … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 27 | Corrigir a ficha da memória Quem criou e as … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 28 | Mudar quem pode ver uma memória ou um capítulo … | regras/permissoes.md; referência a "Ampliar quem vê..." virou link para ampliar.md |
| 29 | Acrescentar relato a uma memória Qualquer pessoa que vê … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 30 | Editar um relato Só quem escreveu (ou quem registrou, … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 31 | Registrar relato de quem não acessa o site Qualquer … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 32 | Acrescentar foto Qualquer pessoa que vê a memória, pelo … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 33 | Remover foto Quem enviou e os admins, numa memória … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 34 | Editar a página de quem acessa o site A … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 35 | Editar a página de quem não acessa o site … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 36 | Criar ou mudar laços de árvore Os envolvidos, quem … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 37 | Criar ou mudar um laço do coração O dono … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 38 | Excluir memória inteira Os admins (Gui, Giovanna e Magno), … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 40 | A regra em código está em src/lib/servidor/permissoes.ts, com testes … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 42 | Administradores. Há administradores em cada família (hoje Gui, Giovanna … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 44 | O administrador nunca edita o que não enxerga. Ser … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 45 | Nunca edita o que outra pessoa escreveu: o relato … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 46 | Na memória, só os dados (alcanceDaCorrecao e mudancaDeConteudo): numa … | regras/permissoes.md; "D4 da sessão Z" no histórico |
| 47 | Foto tirada por um administrador: quem tirou também restaura, … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 48 | No laço do coração de outra pessoa, muda o … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 49 | Histórico com o nome de quem fez: a ficha … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 50 | O Magno é administrador como o Gui e a … | igual, em `regras/permissoes.md`, "Quem pode o quê" |
| 56 | Site em Astro, publicado no Cloudflare em memorias.bayara.com.br, com … | igual, em `regras/infraestrutura.md`, "Infraestrutura" |
| 57 | Textos, núcleos, rascunhos e histórico no banco D1 bayara-memorias; … | igual, em `regras/infraestrutura.md`, "Infraestrutura" |
| 58 | Este repositório guarda só o código. Nenhum conteúdo da … | igual, em `regras/infraestrutura.md`, "Infraestrutura" |
| 59 | Aviso de tamanho do banco (src/lib/tamanho-do-banco.ts). No plano gratuito, … | igual, em `regras/infraestrutura.md`, "Infraestrutura" |
| 60 | Espaço das fotos e áudios (migração 070-tamanho-dos-arquivos, src/lib/espaco-dos-arquivos.ts, decisão … | regras/infraestrutura.md; a origem (sessão D1a) no histórico; marca (Gui, 18/11) |
| 61 | Duas cópias menores de cada foto (decisão 4 do … | regras/infraestrutura.md; a origem (sessões D1b, D1d) no histórico; marca (Gui, 23/11) |
| 62 | Cópias das fotos de antes: em Administração, "Cópias menores … | regras/infraestrutura.md; as revisões e o "Antes, ... Agora" no histórico |
| 63 | Cópia pequena de cada retrato (decisão do Gui de … | regras/infraestrutura.md; a origem (sessão D1c) no histórico; marca (Gui, 23/11) |
| 64 | Fotos, retratos e áudios guardados no aparelho por 7 … | regras/infraestrutura.md; as revisões no histórico; marcas (Gui, 23/11) e (chat, 24/11) |
| 65 | Espelho da produção (decisão do Gui, 18/11/2026; src/lib/espelho.ts, teste … | docs/copia-no-drive.md, O espelho da produção, "Espelho da produção"; em regras/infraestrutura.md fica uma linha com o link; marca (Gui, 18/11) |
| 66 | Cópia do acervo em partes (decisão do Gui, 23/11/2026, … | docs/copia-no-drive.md, Por dentro; em regras/infraestrutura.md fica uma linha ("Cópia do acervo"); marca (Gui, 23/11) |
| 67 | A cópia é de um instante só (item 1 … | docs/copia-no-drive.md, Por dentro; "Antes ... Agora" no histórico |
| 68 | As tabelas de registro não sobem a marca (D1f2, … | docs/copia-no-drive.md, Por dentro |
| 69 | A rede no fim da cópia (D1f3, 24/11/2026, decisão … | docs/copia-no-drive.md, Por dentro; marca (chat, 24/11, reversível) |
| 70 | A marca do esquema (D1f4, 24/11/2026; MARCA_DO_ESQUEMA, em src/lib/servidor/copia.ts). … | docs/copia-no-drive.md, Por dentro |
| 71 | O esquema que a cópia sustenta (D1f4; testes/esquema-da-copia.test.ts, com … | docs/copia-no-drive.md, Por dentro |
| 72 | Duas tabelas não vão na cópia (D1f3; TABELAS_FORA_DA_COPIA, em … | docs/copia-no-drive.md, Por dentro |
| 73 | A cópia mensal só conta no Drive (D1f3). O … | docs/copia-no-drive.md, Por dentro; marca (chat, 24/11) no risco aceito |
| 74 | Cópia mensal no Drive em partes (scripts/copia-no-drive.gs, sessão D1e). … | docs/copia-no-drive.md, Por dentro |
| 75 | "Baixar cópia do acervo" em partes (sessão D1e). Na … | docs/copia-no-drive.md, Por dentro |
| 76 | Cópia para o espelho (decisão do Gui, 23/11/2026; sessão … | docs/copia-no-drive.md, O espelho da produção, "Cópia para o espelho"; "caiu de 20 MB para 1 MB" virou "é 1 MB"; marca (Gui, 23/11) |
| 77 | Na página "Espelho da produção", o primeiro toque em … | docs/copia-no-drive.md, O espelho da produção (último item) |
| 78 | GitHub Actions enxuto (decisão do Gui, 20/11/2026). O repositório … | regras/infraestrutura.md; a estimativa de minutos no histórico; marca (Gui, 20/11) |
| 79 | Sem aviso de falha de build por e-mail (decisão … | regras/infraestrutura.md; marca (Gui, 20/11: o e-mail se perde) |
| 80 | Se o limite chegar, a saída é o plano … | igual, em `regras/infraestrutura.md`, "Infraestrutura" |
| 86 | src/lib/fotos-de-exemplo.ts, src/lib/servidor/fotos-de-exemplo.ts, testes em testes/fotos-de-exemplo.test.ts. | igual, em `regras/exemplos.md`, "Fotos de exemplo" |
| 88 | O acervo de exemplo não tem foto vazia: tudo … | igual, em `regras/exemplos.md`, "Fotos de exemplo" |
| 89 | Retrato de quem é tratado como "ela": uma foto … | igual, em `regras/exemplos.md`, "Fotos de exemplo" |
| 90 | O sorteio é fixo, tirado do id do registro … | igual, em `regras/exemplos.md`, "Fotos de exemplo" |
| 91 | O bucket de teste guarda só essas 11 fotos … | igual, em `regras/exemplos.md`, "Fotos de exemplo" |
| 92 | Envio: npm run fotos-de-exemplo -- <endereço de uma prévia … | igual, em `regras/exemplos.md`, "Fotos de exemplo" |
| 93 | Cópias menores (sessão D1b): a pequena e a média … | regras/exemplos.md; "(sessão D1b)" no histórico |
| 94 | Semente: as fotos de exemplo com chave vazia passam … | igual, em `regras/exemplos.md`, "Fotos de exemplo" |
| 95 | Homologação: o espelho aponta as fotos das memórias de … | igual, em `regras/exemplos.md`, "Fotos de exemplo" |
| 96 | Limpeza do bucket de teste: fotos e retratos enviados … | igual, em `regras/exemplos.md`, "Fotos de exemplo" |
| 97 | A guarda da produção falha se as fotos de … | igual, em `regras/exemplos.md`, "Fotos de exemplo" |
| 103 | src/lib/audios-de-exemplo.ts, testes em testes/audios-de-exemplo.test.ts. | igual, em `regras/exemplos.md`, "Áudios de exemplo" |
| 105 | Três áudios curtos (de 11 a 14 segundos), para … | igual, em `regras/exemplos.md`, "Áudios de exemplo" |
| 106 | Os arquivos (M4A, cerca de 50 KB) ficam em … | igual, em `regras/exemplos.md`, "Áudios de exemplo" |
| 107 | Chegam ao bucket de teste pelo mesmo envio das … | igual, em `regras/exemplos.md`, "Áudios de exemplo" |
| 108 | Semente: semearAudiosDeExemplo, em src/lib/servidor/semente.ts, dentro da proteção das memórias … | igual, em `regras/exemplos.md`, "Áudios de exemplo" |
| 109 | A rota /audios/ só serve a chave de um … | igual, em `regras/exemplos.md`, "Áudios de exemplo" |
| 110 | A guarda da produção falha se um arquivo de … | igual, em `regras/exemplos.md`, "Áudios de exemplo" |
| 116 | Toda página é montada para a pessoa logada, e … | igual, em `regras/site.md`, "Como o site funciona" |
| 117 | A regra de quem vê está em src/lib/servidor/permissoes.ts e, … | igual, em `regras/site.md`, "Como o site funciona" |
| 118 | A estrutura do banco está em src/lib/servidor/banco.ts. O site … | igual, em `regras/site.md`, "Como o site funciona" |
| 119 | Prévias de branch usam o banco e o bucket … | igual, em `regras/site.md`, "Como o site funciona" |
| 120 | A proposta completa de estrutura (laços, árvore, capítulos, temas) … | igual, em `regras/site.md`, "Como o site funciona" |
| 121 | Linha do tempo: as memórias mais recentes primeiro, e … | igual, em `regras/site.md`, "Como o site funciona" |
| 122 | Desempenho do servidor (sessão D1a, 23/11/2026; brief em docs/briefs/desempenho.md, … | regras/site.md, Como o site funciona; a origem (sessão D1a) no histórico |
| 123 | Guarda por pedido (src/lib/servidor/ambiente.ts): o que um pedido lê … | regras/site.md, Como o site funciona; "(revisão R-D1, D1d)" no histórico |
| 124 | O começo do pedido num lote só (aquecerOPedido, em … | igual, em `regras/site.md`, "Como o site funciona" |
| 125 | Server-Timing em toda resposta: servidor;dur= com o tempo do … | igual, em `regras/site.md`, "Como o site funciona" |
| 126 | Posicionamento inteligente ("placement": { "mode": "smart" } no wrangler.jsonc, … | igual, em `regras/site.md`, "Como o site funciona" |
| 127 | "Antes" e "Depois" na memória vêm de uma consulta … | igual, em `regras/site.md`, "Como o site funciona" |
| 128 | O modo TV lê uma memória só por passagem … | juntada com regras/explorar.md, Modo TV; em regras/site.md fica o link e a primeira página que lê o acervo; a medida no histórico |
| 129 | Duas conferências à mão, no computador, com o acervo … | regras/site.md, Como o site funciona; a frase do patch saiu (C-7, os patches não aplicam mais), anotada no histórico |
| 130 | Filtro por qualquer família: todo mundo filtra a linha … | igual, em `regras/site.md`, "Como o site funciona" |
| 132 | Topo, menu e rodapé (src/layouts/Visual.astro, testes em testes/qa-respostas-esqueleto.test.ts e … | igual, em `regras/site.md`, "Como o site funciona" |
| 134 | "Pular para o conteúdo" é o primeiro link da … | igual, em `regras/site.md`, "Como o site funciona" |
| 135 | No celular, "Nova memória" fica à vista na barra, … | igual, em `regras/site.md`, "Como o site funciona" |
| 136 | Menu da conta: o retrato e o nome no … | igual, em `regras/site.md`, "Como o site funciona" |
| 137 | O menu do celular fecha com Esc e com … | igual, em `regras/site.md`, "Como o site funciona" |
| 138 | "Sair" fica só no menu da conta. Leva à … | igual, em `regras/site.md`, "Como o site funciona" |
| 139 | O rodapé repete os cinco itens do menu como … | igual, em `regras/site.md`, "Como o site funciona" |
| 140 | A assinatura do rodapé é inteira nas telas de … | igual, em `regras/site.md`, "Como o site funciona" |
| 141 | O rodapé some só nas telas de mapa: a … | igual, em `regras/site.md`, "Como o site funciona" |
| 142 | /nova acende "Nova memória"; o relato acende "Explorar", como … | igual, em `regras/site.md`, "Como o site funciona" |
| 143 | /temas leva a /capitulos, no ponto onde os temas … | igual, em `regras/site.md`, "Como o site funciona" |
| 144 | Quem entra sem estar ligado a ninguém lê "Avise … | igual, em `regras/site.md`, "Como o site funciona" |
| 145 | Página não encontrada (src/pages/404.astro): "Não encontramos esta página. Ela … | igual, em `regras/site.md`, "Como o site funciona" |
| 151 | O nome do site é "Memórias Bayara e Bracarense": … | igual, em `regras/familias.md`, "Famílias, núcleos e parentes" |
| 152 | Famílias: Bayara Nascimento, Bayara Bracarense (Giovanna e Lucas Magno) … | igual, em `regras/familias.md`, "Famílias, núcleos e parentes" |
| 153 | "Família" na tela, "núcleo" no código: na tela, todo … | igual, em `regras/familias.md`, "Famílias, núcleos e parentes" |
| 154 | Núcleo e parentes. O núcleo são só as pessoas … | igual, em `regras/familias.md`, "Famílias, núcleos e parentes" |
| 155 | Família na ficha. A ficha de quem não acessa … | igual, em `regras/familias.md`, "Famílias, núcleos e parentes" |
| 156 | Sugestão de família no cadastro (src/lib/familias.ts). Quem entra por … | igual, em `regras/familias.md`, "Famílias, núcleos e parentes" |
| 157 | Bichinhos são filhos e netos, porque é assim que … | igual, em `regras/familias.md`, "Famílias, núcleos e parentes" |
| 158 | "Bichinho" e não "bicho" (decisão do Gui, 18/11/2026: "bicho" … | regras/familias.md; origem no histórico; marca (Gui, 18/11), o motivo fica |
| 164 | O banco guarda só dois laços: filiação (biológica, adotiva … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 165 | Um casal é uma sequência de fases (namoro, noivado, … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 166 | As datas das fases (migração 101-datas-das-fases, decisão do Gui … | regras/integrantes.md; a origem no histórico; marca (Gui, 18/11) |
| 167 | Namoro, ex e amizade: a fase decide, num registro … | regras/integrantes.md; a origem no histórico; marca (Gui, 18/11) |
| 168 | Noivado, casamento e união são família: casal na árvore, … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 169 | Namoro aparece como laço do coração, com a linha … | regras/integrantes.md; "Árvore" virou link para arvore.md |
| 170 | "Já é da família" (migração 100-namoro-da-familia, casais.ja_da_familia): para namoro … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 171 | Ex que nunca foi da família (só namorou e … | regras/integrantes.md; "o caso do Jean" no histórico |
| 172 | Ex da família (terminou depois de noivado, casamento, união … | regras/integrantes.md; "como antes" no histórico |
| 173 | Amizade: o ex que virou amigo (ver "O ex … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 174 | Parentesco do ponto de vista de quem está logado … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 175 | Cada integrante tem "como se referir" (ela, ele ou … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 176 | Casal "só os dois veem": aparece para as duas … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 177 | Falecimento é opção: a data só aparece depois de … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 178 | O fim e o resto da história do casal … | regras/integrantes.md; a origem no histórico; marca (Gui, 18/11) |
| 179 | Ex-casal (migração 071-ex-casal, decisões do Gui de 18/11/2026; regras … | regras/integrantes.md; a origem no histórico; marca (Gui, 18/11) |
| 180 | Quem vê este laço: "Todos", "Famílias escolhidas" ou "Só … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 181 | Como Fulano aparece para você: só para quem é … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 182 | Em Pessoas e em "Quem estava" (decisões do Gui … | regras/integrantes.md; a origem (QA) no histórico; marca (Gui, 18/11) |
| 183 | "Fora" de quem é pai ou mãe vale como … | regras/integrantes.md; a origem (sessão F) no histórico; marca (Gui, 18/11) |
| 184 | Aniversários: quem a pessoa deixou discreto ou fora sai … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 185 | O ex que virou amigo (observações do Gui, 18/11/2026, … | regras/integrantes.md; a origem (caso do Thiago, sessão I) no histórico; marcas (Gui, 18/11) |
| 186 | A ficha da árvore de quem só se liga … | regras/integrantes.md; o diagnóstico do Thiago na homologação no histórico |
| 187 | O espelho leva as famílias do casal e apaga … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 188 | A tarja (acabamento, 18/11/2026): o cartão como um documento … | regras/integrantes.md; "(acabamento, 18/11/2026)" no histórico |
| 189 | Data da adoção (migração 014): um laço adotivo pode … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 191 | Laços do coração | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 193 | Nome livre, "como se fosse" opcional (dá lugar na … | regras/integrantes.md; "Círculo" virou link para circulo.md |
| 194 | "Quem reconhece": o laço pergunta "só eu" ou "a … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 195 | "Como se fosse pai ou mãe" existe como papel, … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 196 | Laço resumido (lacos_resumidos), a aba "Parente de amigo": fora … | regras/integrantes.md; "Árvore" virou link para arvore.md |
| 198 | Quem só existe num laço privado de outra pessoa | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 200 | Some em todo lugar para quem não é dono … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 201 | O relato registrado em nome dela some inteiro para … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 202 | Memória com alguém que só você vê: enquanto a … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 204 | A página do laço (onda 2, decisão do Gui … | regras/integrantes.md; a origem (onda 2) no histórico; marca (Gui, 17/11) |
| 206 | A página de duas pessoas: os dois retratos com … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 207 | Com um dos dois já falecido, o casal fica … | regras/integrantes.md; a origem (defeito do QA) no histórico |
| 208 | No tempo: as fases do casal em sanfona, na … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 209 | As memórias dos dois: todas as memórias em que … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 210 | Chega-se por "Ver o laço", na ficha da árvore … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 211 | Só o que quem olha vê: as duas pessoas … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 212 | A aparência e a composição estão em docs/visual.md, "Página … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 214 | Cadastros duplicados (onda 2, decisão do Gui de 17/11/2026; … | regras/integrantes.md; a origem (onda 2) no histórico; marca (Gui, 17/11) |
| 216 | Nomes parecidos ao digitar, para todos: no cadastro de … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 217 | Juntar, só os administradores: em Administração, o atalho "Cadastros … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 218 | Comparar e juntar (/admin/duplicados/juntar): as duas fichas lado a … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 219 | Recusas: quem não administra; a ficha de quem acessa … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 220 | O recado de "Juntar" só cita o que o … | regras/integrantes.md; a origem (revisão AA2) no histórico; marca (Gui, 23/11) |
| 222 | Formulários de pessoa e laço | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 224 | Editar pessoa e laços é uma página só (proposta … | regras/integrantes.md; a origem (proposta A, sessão E) no histórico; marca (Gui, 18/11) |
| 225 | Os grupos de laço, nesta ordem: Pais, Casal, Filhos, … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 226 | O grupo vazio fica numa linha só, com um … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 227 | Adicionar mora no grupo, já no tipo certo, sem … | regras/integrantes.md; "Com quem?" gerava dúvida e a leitura descartada no histórico; marcas (Gui, 18/11) |
| 228 | Editar laço: cada laço tem "Editar", que abre os … | regras/integrantes.md; "Círculo" e "Interação dos formulários" viraram links |
| 229 | Casal: as fases aparecem como uma linha do tempo … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 230 | A ficha e os laços na mesma página: cada … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 231 | A ordem da ficha (pedido do Gui, 18/11/2026), em … | regras/integrantes.md; a origem no histórico; marca (Gui, 18/11) |
| 232 | Cadastro guiado: depois de "Cadastrar e ir para os … | regras/integrantes.md; a observação (ficava escondido no pé) no histórico; marca (Gui, 18/11) |
| 233 | Todos os tipos de laço: cada tela do cadastro … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 235 | Foto de retrato (migração 016, src/lib/retratos.ts) | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 237 | Opcional, para pessoas e bichinhos, só por envio de … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 238 | Depois de escolher, a pessoa enquadra o rosto num … | regras/integrantes.md; "Infraestrutura" virou link para infraestrutura.md |
| 239 | Quem põe, troca ou tira: quem pode editar a … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 240 | Quem vê: quem vê a pessoa. Retrato de quem … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 241 | Aparece na página da pessoa, em "Quem estava" na … | igual, em `regras/integrantes.md`, "Integrantes e laços" |
| 242 | A cor de quem é de duas famílias (pedido … | regras/integrantes.md; a origem (página da Giovanna) no histórico; marca (Gui, 18/11) |
| 243 | Na homologação, o retrato de cada pessoa é uma … | regras/integrantes.md; sessões G e H e o #97 no histórico; "Infraestrutura" virou link |
| 249 | O arranjo e as linhas vieram de ajustes do … | igual, em `regras/arvore.md`, "Árvore" |
| 251 | O que a árvore é | igual, em `regras/arvore.md`, "Árvore" |
| 253 | Uma só (/arvore): a família inteira, com todas as … | igual, em `regras/arvore.md`, "Árvore" |
| 254 | O desenho é calculado no navegador (src/lib/arvore-desenho.ts): gerações em … | igual, em `regras/arvore.md`, "Árvore" |
| 255 | Os centros da árvore (migração 073-ajustes-do-acervo, onda 2, decisão … | regras/arvore.md; onda 2 e a frase da decisão no histórico; marca (Gui, 17/11) |
| 256 | Só chega ao navegador o que a pessoa pode … | igual, em `regras/arvore.md`, "Árvore" |
| 257 | Fora da produção, o banco de teste ganha parentes … | igual, em `regras/arvore.md`, "Árvore" |
| 259 | Controles e gestos | igual, em `regras/arvore.md`, "Árvore" |
| 261 | Os controles não trocam de tela: mudam o destaque … | igual, em `regras/arvore.md`, "Árvore" |
| 262 | Partir de só oferece quem tem laço de árvore … | igual, em `regras/arvore.md`, "Árvore" |
| 263 | Nenhum filtro esconde de quem a árvore parte: partindo … | igual, em `regras/arvore.md`, "Árvore" |
| 264 | Tocar em alguém põe a pessoa em foco e … | igual, em `regras/arvore.md`, "Árvore" |
| 265 | Arrastar o mapa funciona começando em qualquer ponto, inclusive … | igual, em `regras/arvore.md`, "Árvore" |
| 266 | Zoom de 25% a 400%. A árvore fica nítida … | igual, em `regras/arvore.md`, "Árvore" |
| 267 | Pelo teclado: a caixa do mapa nunca rola. O … | igual, em `regras/arvore.md`, "Árvore" |
| 268 | A árvore é um recurso mais de desktop; no … | igual, em `regras/arvore.md`, "Árvore" |
| 270 | A página como mapa (proposta A, painel flutuante; conceito … | regras/arvore.md; proposta A no histórico; marca (Gui, 17 e 18/11) |
| 272 | A árvore usa a janela inteira abaixo do menu, … | igual, em `regras/arvore.md`, "Árvore" |
| 273 | No celular o painel é um cartão no alto … | igual, em `regras/arvore.md`, "Árvore" |
| 274 | Não há frase de instrução no alto do mapa. | igual, em `regras/arvore.md`, "Árvore" |
| 275 | A ficha: a árvore abre sem ficha. Tocar em … | igual, em `regras/arvore.md`, "Árvore" |
| 276 | A barra de baixo: "Voltar para Fulano" (quem está … | igual, em `regras/arvore.md`, "Árvore" |
| 277 | A legenda tem três grupos, "Famílias", "Linhas" e "Botões … | igual, em `regras/arvore.md`, "Árvore" |
| 278 | "Ajustar a árvore": "Partir de" mostra de quem a … | igual, em `regras/arvore.md`, "Árvore" |
| 279 | O enquadramento segue a altura da tela: a árvore … | igual, em `regras/arvore.md`, "Árvore" |
| 280 | Procurar na árvore: escolher alguém mantém a linha direta. … | igual, em `regras/arvore.md`, "Árvore" |
| 281 | O link de baixo é "Cadastrar pessoa", como em … | igual, em `regras/arvore.md`, "Árvore" |
| 282 | O quadro é src/visual/telas/mapa.css e src/lib/cliente/painel-do-mapa.ts, e o círculo … | igual, em `regras/arvore.md`, "Árvore" |
| 284 | Os cartões | igual, em `regras/arvore.md`, "Árvore" |
| 286 | O cartão é uma etiqueta: a cor da família … | igual, em `regras/arvore.md`, "Árvore" |
| 287 | Canto reto: aponta para o lado da família de … | igual, em `regras/arvore.md`, "Árvore" |
| 288 | Cartão de bichinho: todo arredondado, com a espécie em … | igual, em `regras/arvore.md`, "Árvore" |
| 289 | No cartão, que não tem foto, quem já faleceu … | regras/arvore.md; referência virou link para pessoa.md |
| 290 | A marca do ramo recolhido tem área de toque … | igual, em `regras/arvore.md`, "Árvore" |
| 292 | Laços do coração na árvore | igual, em `regras/arvore.md`, "Árvore" |
| 294 | O namoro fica colado (ajuste do Gui, 18/11/2026; colado, … | regras/arvore.md; opção A e as frases da decisão no histórico; marcas (Gui, 18/11); referência virou link para integrantes.md |
| 296 | Laços do coração com "como se fosse" entram na … | igual, em `regras/arvore.md`, "Árvore" |
| 297 | Amigos sem lugar na família (laço do coração sem … | igual, em `regras/arvore.md`, "Árvore" |
| 298 | Escadinha: um laço "como se fosse" se liga pelo … | igual, em `regras/arvore.md`, "Árvore" |
| 299 | Laço resumido: o parente entra junto com quem já … | igual, em `regras/arvore.md`, "Árvore" |
| 301 | Arranjo | igual, em `regras/arvore.md`, "Árvore" |
| 303 | Quem tem pais na fileira de cima fica embaixo … | igual, em `regras/arvore.md`, "Árvore" |
| 304 | A ordem das fileiras é buscada a partir de … | igual, em `regras/arvore.md`, "Árvore" |
| 305 | O pai ou a mãe dos meio-irmãos fica do … | regras/arvore.md; defeito do QA e o "mais" no histórico |
| 306 | Marca do ramo recolhido: ocupa o lugar de mais … | igual, em `regras/arvore.md`, "Árvore" |
| 307 | Ramo aberto: abre num cartão por cima, sem título … | regras/arvore.md; defeito do QA no histórico |
| 309 | Linhas | igual, em `regras/arvore.md`, "Árvore" |
| 311 | Curva mostra direção e bifurcação; ângulo reto fica para … | regras/arvore.md, "Linhas"; ganhou, depois da primeira frase, a regra geral do CLAUDE.md antigo (linha 139): "Linhas que andam juntas são desenhadas uma vez só, para o tracejado não virar linha cheia." (revisão R-AC2) |
| 312 | Linhas dos laços do coração em tronco: os laços … | igual, em `regras/arvore.md`, "Árvore" |
| 313 | Linhas contornam as caixas: nenhuma linha de coração ou … | igual, em `regras/arvore.md`, "Árvore" |
| 314 | Laço entra por cima de quem tem filhos embaixo: … | igual, em `regras/arvore.md`, "Árvore" |
| 315 | Linhas que se unem: linhas que chegam à mesma … | igual, em `regras/arvore.md`, "Árvore" |
| 316 | Linhas que saem do mesmo pé andam juntas: quando … | igual, em `regras/arvore.md`, "Árvore" |
| 317 | Linha do casal mesmo com mais responsáveis: quando dois … | igual, em `regras/arvore.md`, "Árvore" |
| 323 | /pessoas/<id>: o verbete (proposta A do conceito da sessão … | regras/pessoa.md; a origem (proposta A, sessão L) e "de antes" no histórico; marca (Gui, 18/11) |
| 325 | A abertura: o carimbo ("Você" na própria página e … | igual, em `regras/pessoa.md`, "Página da pessoa" |
| 326 | O quadro, ao lado da abertura no computador e … | regras/pessoa.md; origem (pedido, QA de 18/11) no histórico; marcas (Gui, 18/11) |
| 327 | Dados, aberta ao chegar: o nascimento com o aniversário … | regras/pessoa.md; origem (pedido do Gui; decisão desta sessão) no histórico; marca (Gui, 18/11) |
| 328 | Na árvore, fechada ao chegar, com o resumo: os … | regras/pessoa.md; "defeito do QA de 18/11/2026" no histórico |
| 329 | Você e Fulano, fechada, com a faixa do círculo … | regras/pessoa.md; origem no histórico; marca (Gui, 18/11) |
| 330 | "Nas palavras de Fulano": o resto de "Sobre" e … | regras/pessoa.md; origem no histórico; marca (Gui, 18/11) |
| 331 | "A vida de Fulano em memórias", com a forma … | regras/pessoa.md; origem e "a troca demorava" no histórico; marcas (Gui, 18/11) |
| 332 | "Família e laços", quieta, no fim, como o "ver … | igual, em `regras/pessoa.md`, "Página da pessoa" |
| 338 | O retrato é de foto de álbum (decisão do … | regras/pessoa.md; origem, "O arco saiu" e "voltou ... depois da sessão J" no histórico; marcas (Gui, 18/11) |
| 339 | A marca não depende da forma: a foto em … | regras/pessoa.md; origem (QA de 18/11) no histórico; marca (Gui, 18/11) |
| 340 | Acender a foto: o tom suave tem volta, como … | igual, em `regras/pessoa.md`, "Quem já faleceu" |
| 341 | No cartão da árvore, que não tem foto, a … | regras/pessoa.md; origem no histórico, motivo no presente; marca (Gui, 18/11) |
| 342 | A data do falecimento fica oculta em todo lugar, … | igual, em `regras/pessoa.md`, "Quem já faleceu" |
| 343 | O painel não lembra aniversário nem data de falecimento … | igual, em `regras/pessoa.md`, "Quem já faleceu" |
| 344 | Já faleceu quem está marcado assim ou tem data … | igual, em `regras/pessoa.md`, "Quem já faleceu" |
| 350 | Migração 030. Prazo geral: tudo resolvido até 10/12, e … | igual, em `regras/circulo.md`, "Círculo" |
| 352 | O que é: "Seu círculo", em /circulo, no menu … | igual, em `regras/circulo.md`, "Círculo" |
| 353 | Fora de Pessoas: Pessoas não tem seletor segmentado (ele … | igual, em `regras/circulo.md`, "Círculo" |
| 354 | Quem aparece: toda a família que a pessoa vê … | regras/circulo.md; sessão J e "o círculo volta ao redondo" no histórico; marca (Gui, 18/11) |
| 355 | Proximidade contínua: de 0 (colado no centro) a 99 … | igual, em `regras/circulo.md`, "Círculo" |
| 356 | Sem valor declarado, a família vem pela distância na … | igual, em `regras/circulo.md`, "Círculo" |
| 357 | O slider vai do mais distante ao mais próximo, … | regras/circulo.md; marca (Gui, 18/11) |
| 358 | O desenho do slider: a régua com os nomes … | regras/circulo.md; proposta A da sessão J e o "continua" no histórico; marca (Gui, 18/11) |
| 359 | O laço do coração usa a mesma escala e … | igual, em `regras/circulo.md`, "Círculo" |
| 360 | Proximidade em todo laço seu (decisão do Gui, 18/11/2026). … | regras/circulo.md; marca (Gui, 18/11) |
| 361 | Na tela grande e na TV são anéis, num … | igual, em `regras/circulo.md`, "Círculo" |
| 362 | Ajuste: tocar numa pessoa abre a ficha no painel … | igual, em `regras/circulo.md`, "Círculo" |
| 363 | Fora do círculo: o trecho tracejado do slider, ou … | igual, em `regras/circulo.md`, "Círculo" |
| 364 | Privacidade: ninguém mais vê o círculo nem os valores. … | igual, em `regras/circulo.md`, "Círculo" |
| 365 | Onde está: as contas em src/lib/circulo.ts, a montagem em … | regras/circulo.md; referência virou link para arvore.md |
| 371 | Decisão do Gui de 18/11/2026. Migração 090-como-voce-chama; regras em … | regras/pessoa.md; marca (Gui, 18/11) no lugar da frase |
| 373 | Cada pessoa pode dar o próprio apelido a outra … | regras/pessoa.md; "defeito visto pelo Gui depois da sessão I" no histórico; marca (Gui, 18/11) |
| 374 | Só quem deu vê, e no site inteiro, para … | regras/pessoa.md; referência a "Interação dos formulários" virou link para formularios.md |
| 375 | Tirar o apelido ("Voltar a Fulano") devolve o de … | igual, em `regras/pessoa.md`, "Como você chama" |
| 376 | Na ficha (decisão do Gui, 18/11/2026, depois da sessão … | regras/pessoa.md; "depois da sessão H" e "como antes" no histórico; marca (Gui, 18/11) |
| 377 | Como chega à tela: o middleware guarda no pedido … | igual, em `regras/pessoa.md`, "Como você chama" |
| 378 | Privacidade: a escolha é privada, como a proximidade do … | igual, em `regras/pessoa.md`, "Como você chama" |
| 384 | A lista de tipos vive no banco (tabela tipos), … | igual, em `regras/formularios.md`, "Tipos de momento" |
| 385 | Cor e desenho (migração 021): a cor é escolhida … | regras/formularios.md; origem no histórico; marca (Gui, 18/11) |
| 386 | "Outro" é a saída de quem não achou o … | igual, em `regras/formularios.md`, "Tipos de momento" |
| 387 | A tela de admin mostra o que foi escrito … | igual, em `regras/formularios.md`, "Tipos de momento" |
| 388 | Detalhes mais específicos ficam para os temas, que são … | igual, em `regras/formularios.md`, "Tipos de momento" |
| 394 | O visual pode mudar a aparência de cada peça … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 396 | Em todo formulário | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 398 | Formulário longo vira etapas (src/lib/cliente/etapas.ts): uma parte por vez, … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 399 | Sem JavaScript as etapas aparecem todas em sequência, e … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 400 | Quando o servidor recusa, a página volta com o … | regras/formularios.md; "fila da revisão Z2, sessão AA" no histórico |
| 401 | Salvar a memória grava tudo de uma vez (Y3 … | regras/formularios.md; Y3 do PR #160, D1 e D2 da sessão Z e sessão AA no histórico |
| 402 | Ações de etapa: "Voltar" à esquerda; "Salvar rascunho" e … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 403 | Avisos do formulário da memória: o que o formulário … | regras/formularios.md; a história do defeito e a revisão Z2 no histórico; fica o motivo da linha filha direta |
| 404 | Estados dos componentes: pressionado em botões, opções, filtros e … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 405 | Data: uma peça só em todos os formulários (CampoData.astro), … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 406 | Escolher uma pessoa entre muitas é uma busca com … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 407 | Como se referir de quem entra pelo nome novo: … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 408 | Caixa de marcar em pílula mostra uma caixa com … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 409 | Zona de perigo: nas telas de editar (memória, capítulo, … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 411 | Nova memória | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 413 | Sete etapas, uma pergunta principal em cada: o que … | regras/formularios.md; "D6 da sessão Z" no histórico |
| 414 | A frase é a trilha (proposta B do conceito … | regras/formularios.md; origem (proposta B, sessão D) no histórico; marca (Gui, 18/11) |
| 415 | No celular, a frase fica num cartão no alto, … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 416 | O resumo ao lado ("A memória até aqui") saiu: … | regras/formularios.md; "saiu" virou "não há"; frase antiga no histórico |
| 417 | Sem JavaScript, a frase e o fio não aparecem, … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 418 | A data por toque, sem teclado (proposta B, decisão … | regras/formularios.md; origem no histórico; marca (Gui, 18/11); "saiu da nova memória" virou "não usa" |
| 419 | "Confira antes de publicar" mostra a frase completa (decisão … | regras/formularios.md; origem no histórico; marca (Gui, 18/11) |
| 420 | Tipo de momento começa sem nada marcado e é … | regras/formularios.md; "passava" virou "passaria"; frase antiga no histórico |
| 421 | Rascunho só com o título: o ano e o … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 422 | Fotos e capítulo: a etapa das fotos pergunta "Tem … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 423 | Só sai da memória a foto que a pessoa … | regras/formularios.md; Y3 do PR #160, D7 e D8 da sessão Z e revisão Z2 no histórico |
| 424 | "Quem estava?" (QuemEstava.astro e src/lib/cliente/quem-estava.ts): os nomes não aparecem … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 425 | No relato da nova memória, "Quem está contando" fica … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 426 | Quem pode ver (decisão do Gui, 17 e 18/11/2026, … | regras/formularios.md; origem (sessão D) e "no lugar dos dois rádios" no histórico; marca (Gui, 17 e 18/11) |
| 427 | Famílias sugeridas: numa memória nova, ao chegar em "Quem … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 428 | Publicar tem um verbo só: "Confira antes de publicar", … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 429 | Atalhos para memória nova: "Nova memória com Fulano", na … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 431 | Nova pessoa | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 433 | Pede só o essencial (nome, pessoa ou bichinho, como … | regras/formularios.md; "confirmado pelo Gui em 18/11/2026" no histórico; marca (Gui, 18/11) |
| 435 | Sem recarregar (premissa do Gui de 18/11/2026, "Interação sem … | regras/formularios.md; origem no histórico; marca (Gui, 18/11) |
| 437 | O formulário do dia a dia marcado com data-no-lugar … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 438 | Recado sem formulário vai para o alto (decisão do … | regras/formularios.md; origem e revisão Z2 no histórico; marca (Gui, 22/11); a história da ligação dupla virou condicional |
| 439 | O foco quando a própria região some (sessão AA, … | regras/formularios.md; "sessão AA, 23/11/2026" no histórico |
| 440 | A região que envolve um pedaço sem caixa própria … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 441 | No lugar: reagir (rota própria, em JSON; ver "Reações"), … | regras/formularios.md; links para memoria.md e circulo.md; "já era" virou "também é", frase antiga no histórico |
| 442 | Continuam recarregando, de propósito: os formulários de trabalho (nova … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 444 | Páginas de leitura | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 446 | Ação principal no alto: na memória, "Contar como foi", … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 447 | Quem já contou vê, no fim da memória, uma … | igual, em `regras/formularios.md`, "Interação dos formulários" |
| 448 | O botão de contar diz "Contar como foi" em … | regras/formularios.md; "crítica C1" no histórico; marca (Gui, 22/11) |
| 449 | "Quem estava" na memória tem retratos pequenos (até 4,75rem … | regras/formularios.md; "crítica C2" no histórico; marca (Gui, 22/11), motivo fica |
| 450 | A lista de Pessoas (src/lib/ordem-das-pessoas.ts, testes em testes/qa-respostas-pessoas.test.ts): "Procurar … | regras/formularios.md; "depois da sessão H" no histórico; marca (Gui, 18/11) |
| 451 | O alto de Pessoas e o filtro por família … | regras/formularios.md; "proposta B da sessão E" no histórico; marca (Gui, 17/11) |
| 452 | A página da pessoa: o título é "Nome (apelido)", … | regras/formularios.md; sessão I e capturas da sessão K no histórico; marca (Gui, 18/11); link para pessoa.md |
| 458 | Excluir uma memória publicada é com os admins, passa … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 459 | A página de confirmação abre só com "Confira antes … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 460 | A lixeira mora em "Sua conta", no cartão "Rascunhos … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 461 | Rascunho é de quem escreve: a própria pessoa descarta, … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 462 | Cada pessoa vê na lixeira só o que pode … | regras/lixeira.md; "revisão Y do PR #160" no histórico; links para relatos.md e ampliar.md |
| 463 | "Restaurar" é o verbo de tudo o que volta: … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 464 | Remover um laço de árvore, um laço do coração … | regras/lixeira.md; "Continua valendo" virou "Vale mesmo", o de antes no histórico |
| 465 | Histórico de pessoas e laços (onda 2, decisão do … | regras/lixeira.md; a origem (onda 2) no histórico; marca (Gui, 17/11) |
| 466 | O histórico de uma memória (/memorias/<id>/historico) mostra cada alteração … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 467 | Restaurar uma versão traz título, data, tipo, lugar e … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 468 | Do relato, cada pessoa vê só os textos anteriores … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 469 | Fotos removidas aparecem no histórico para quem enviou e … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 470 | Apagar de vez (migração 072-apagados-de-vez, onda 2, decisão do … | regras/lixeira.md; a origem (onda 2) no histórico; marca (Gui, 17/11) |
| 472 | Excluir pessoa (decisão do Gui depois da sessão I, … | regras/lixeira.md; a origem (depois da sessão I) no histórico; marca (Gui, 18/11) |
| 474 | Só os administradores excluem. Os outros pedem a exclusão, … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 475 | O caminho fica na zona de perigo de "Editar … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 476 | Os pedidos são uma pendência da administração, no grupo … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 477 | A pessoa excluída vai para a lixeira, com volta, … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 478 | Na lixeira, só para os administradores, cada pessoa com … | regras/lixeira.md; o defeito do QA de 18/11 no histórico |
| 479 | No espelho da produção, quem está na lixeira continua … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 480 | Como funciona: integrantes.excluida_em marca quem está na lixeira; listarIntegrantes … | regras/lixeira.md; "revisão AA2, 23/11/2026" no histórico |
| 482 | Fotos sem memória (onda 2, decisão do Gui de … | regras/lixeira.md; a origem (onda 2) no histórico; marca (Gui, 17/11) |
| 484 | Fotos enviadas num formulário abandonado, ou soltas por "Apagar … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 485 | Em Administração, o atalho "Fotos sem memória" ("nenhuma" ou … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 486 | Entra a foto que não é de memória nem … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 487 | É a única rota que apaga arquivo do bucket … | regras/lixeira.md; o defeito da sessão D1c no histórico |
| 488 | Nas prévias, a limpeza de 7 dias continua cuidando … | igual, em `regras/lixeira.md`, "Lixeira e histórico" |
| 494 | Migração 022. Testes em testes/fotos-pelo-relato.test.ts e testes/acrescentar-fotos.test.ts, com a … | igual, em `regras/relatos.md`, "Fotos pelo relato" |
| 496 | Quem escreve um relato pode acrescentar fotos à memória … | igual, em `regras/relatos.md`, "Fotos pelo relato" |
| 497 | A foto sobe por /api/fotos, solta, como na memória. … | igual, em `regras/relatos.md`, "Fotos pelo relato" |
| 498 | A foto é da memória: vai para o fim … | igual, em `regras/relatos.md`, "Fotos pelo relato" |
| 499 | Relato em rascunho segura as fotos: elas ficam presas … | igual, em `regras/relatos.md`, "Fotos pelo relato" |
| 500 | Uma foto que sai da lista do relato vai … | igual, em `regras/relatos.md`, "Fotos pelo relato" |
| 501 | As fotos só se enviam com script. Sem a … | igual, em `regras/relatos.md`, "Fotos pelo relato" |
| 502 | Uma foto que chega pelo relato não cria versão … | igual, em `regras/relatos.md`, "Fotos pelo relato" |
| 503 | "Acrescentar fotos": na abertura da memória, ao lado de … | igual, em `regras/relatos.md`, "Fotos pelo relato" |
| 509 | Migração 015. | igual, em `regras/relatos.md`, "Áudios nos relatos" |
| 511 | Um relato pode ter vários áudios, em ordem, cada … | igual, em `regras/relatos.md`, "Áudios nos relatos" |
| 512 | Gravar é pela janela de escrever do relato como … | igual, em `regras/relatos.md`, "Áudios nos relatos" |
| 513 | Para os áudios de quem não acessa o site … | igual, em `regras/relatos.md`, "Áudios nos relatos" |
| 514 | Os áudios aparecem como mensagens da voz de quem … | regras/relatos.md; "ver Página da pessoa" virou link para pessoa.md |
| 515 | Quem ouve: o áudio de um relato, quem vê … | igual, em `regras/relatos.md`, "Áudios nos relatos" |
| 516 | Remover não apaga: o áudio sai do relato, e … | igual, em `regras/relatos.md`, "Áudios nos relatos" |
| 517 | Espaço (src/lib/audios.ts): os áudios ficam no bucket das fotos, … | igual, em `regras/relatos.md`, "Áudios nos relatos" |
| 518 | Transcrição automática (onda 2, decisão do Gui de 17/11/2026; … | regras/relatos.md; a origem (onda 2) no histórico; marca (Gui, 17/11) |
| 519 | A cota (documentação do Cloudflare, conferida em 18/11/2026): 10.000 … | regras/relatos.md; a data da conferência no histórico |
| 520 | Para ligar, os dois: o binding "ai": { "binding": … | regras/relatos.md; "desde 18/11/2026" e "sessão F" no histórico; marca (Gui, 18/11) |
| 521 | No computador (npm run dev), o adaptador roda com … | igual, em `regras/relatos.md`, "Áudios nos relatos" |
| 522 | Ainda não existe devolver um áudio removido. | igual, em `regras/relatos.md`, "Áudios nos relatos" |
| 523 | No espelho da produção, nenhum áudio: a tabela é … | igual, em `regras/relatos.md`, "Áudios nos relatos" |
| 529 | Escolha do Gui depois da sessão I (18/11/2026), a … | regras/relatos.md; a origem (sessão I, protótipo, commit) no histórico; o motivo virou frase no presente; marca (Gui, 18/11) |
| 531 | Cada envio é uma mensagem: um texto, um áudio … | igual, em `regras/relatos.md`, "Relato como conversa" |
| 532 | Primeiro publicar: o relato nasce rascunho; cada envio é … | regras/relatos.md; "crítica C1" no histórico; marca (Gui, 22/11) |
| 533 | Mudar uma mensagem é editar, com a versão anterior … | igual, em `regras/relatos.md`, "Relato como conversa" |
| 534 | Na memória, a conversa: cada pessoa é uma voz, … | igual, em `regras/relatos.md`, "Relato como conversa" |
| 535 | "Contou mais em 3 de dezembro de 2026": a … | igual, em `regras/relatos.md`, "Relato como conversa" |
| 536 | Responder citando: cada mensagem de outra pessoa tem "Citar", … | igual, em `regras/relatos.md`, "Relato como conversa" |
| 537 | A memória nova usa a mesma janela, na etapa … | igual, em `regras/relatos.md`, "Relato como conversa" |
| 538 | "Contar como foi" (/memorias/<id>/relato): a janela e, ao lado … | regras/relatos.md; "P5 do QA" no histórico; marca (Gui, 23/11) |
| 539 | O rascunho de quem não publicou primeiro (resposta do … | regras/relatos.md; "P4 do QA" no histórico; marca (Gui, 23/11) |
| 540 | Sem script: a janela é um formulário que acrescenta … | regras/relatos.md; D3 da sessão Z, revisão Z2 e sessão AA no histórico |
| 541 | No banco: a tabela relato_mensagens guarda o tipo, a … | igual, em `regras/relatos.md`, "Relato como conversa" |
| 548 | Um capítulo reúne memórias em um momento maior e … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 549 | Época e capítulo (migração 019-de-quem-e-o-capitulo). O capítulo por período … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 550 | A regra é uma só (memoriaDoCapitulo em src/lib/capitulos.ts, com … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 551 | No formulário, "Como as memórias entram?" tem três opções … | regras/capitulos.md; "os capítulos de antes ficam sem dia" no histórico; marca (Gui, 18/11) |
| 552 | A página do capítulo diz de quem ele é … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 553 | No acervo de exemplo, "A infância da Giovanna" é … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 554 | Um capítulo pode ficar dentro de outro, com no … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 555 | As relações pelo tempo são calculadas: a página de … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 556 | Temas são etiquetas livres para memórias e capítulos, digitadas … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 557 | O capítulo tem visibilidade própria (título e abertura). Cada … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 558 | Uma memória entra em um capítulo reunido pelo formulário … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 559 | Quem edita: quem criou e os admins (ter memórias … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 560 | Ficou para depois: capítulo ligado a uma fase de … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 561 | Página do tema: a coluna da esquerda fica parada … | regras/capitulos.md; marca (Gui, 19/11) |
| 562 | O acervo de exemplo fica sem tema de muitos … | regras/capitulos.md; a resposta à P1 do QA e o link dela no histórico; marca (Gui, 20/11) |
| 563 | Página do capítulo: a coluna da capa fica parada … | regras/capitulos.md; "como antes" e a saída do script no histórico; marca (Gui, 19/11) |
| 564 | Largura inteira é a largura inteira disponível; trocar a … | regras/capitulos.md; "Antes..." e "Agora" no histórico; marca (Gui, 19/11) |
| 566 | Capítulos na linha do tempo (montagem em src/lib/linha-capitulos.ts, com … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 568 | Trilho lateral: cada capítulo é um trilho vertical à … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 569 | Memória de fora no meio do capítulo: fica no … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 570 | Capítulo dentro de capítulo e capítulos ao mesmo tempo: … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 571 | O trilho de um capítulo por período vai da … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 572 | Só aparecem capítulos que a pessoa pode ver, e … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 573 | Cor e sinal: cada capítulo tem uma cor, e … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 574 | Hierarquia: o fio do tempo é a linha principal. … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 575 | Destaque com o mouse: no computador, passar o mouse … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 576 | A época é o chão da linha do tempo, … | igual, em `regras/capitulos.md`, "Capítulos e temas" |
| 582 | Migração 018. O desenho está em docs/visual.md ("Assinatura do … | igual, em `regras/familias.md`, "Assinatura do nome" |
| 584 | "MEMÓRIAS" é grande e fixo. Abaixo vêm os sobrenomes … | igual, em `regras/familias.md`, "Assinatura do nome" |
| 585 | Cada núcleo guarda os sobrenomes de que é feito … | igual, em `regras/familias.md`, "Assinatura do nome" |
| 586 | Só os administradores editam os sobrenomes, em /admin/familias (até … | igual, em `regras/familias.md`, "Assinatura do nome" |
| 587 | Uma linha mais longa que "Bayara & Bracarense" encolhe … | igual, em `regras/familias.md`, "Assinatura do nome" |
| 593 | As regras estão em src/lib/painel.ts, com teste em testes/painel-funcional.test.ts … | igual, em `regras/inicio.md`, "Início (painel pessoal)" |
| 595 | O painel é a página inicial (/). A linha … | igual, em `regras/inicio.md`, "Início (painel pessoal)" |
| 596 | A carta de Natal: escrita pelo Gui, pela Giovanna … | regras/inicio.md; a crítica C2 no histórico; marca (Gui, 22/11) |
| 597 | Visitas seguintes, nesta ordem: o que entrou de novo … | regras/inicio.md; a proposta B da sessão H e as críticas C1 e C2 no histórico; marcas (Gui, 18/11) e (Gui, 22/11) |
| 598 | "Neste dia, em outros anos": as memórias que a … | regras/inicio.md; a crítica C1 no histórico; marca (Gui, 22/11) |
| 599 | Num dia sem novidade, no computador, o lugar das … | igual, em `regras/inicio.md`, "Início (painel pessoal)" |
| 600 | Rascunho: quando a pessoa tem rascunho de memória ou … | regras/inicio.md; a crítica C1 no histórico; marca (Gui, 22/11) |
| 601 | Visita é só a conta de "o que entrou … | igual, em `regras/inicio.md`, "Início (painel pessoal)" |
| 602 | O nome nos aniversários e nas novidades é o … | igual, em `regras/inicio.md`, "Início (painel pessoal)" |
| 603 | Aniversários: só de quem está vivo e de quem … | igual, em `regras/inicio.md`, "Início (painel pessoal)" |
| 604 | Aniversário de casamento (decisão do Gui, 18/11/2026; aniversariosDeCasamento, teste … | regras/inicio.md; marca (Gui, 18/11) |
| 605 | O relato de uma memória que também é nova … | igual, em `regras/inicio.md`, "Início (painel pessoal)" |
| 606 | O painel só mostra memória publicada. | igual, em `regras/inicio.md`, "Início (painel pessoal)" |
| 607 | Os avisos ficam no alto do painel, logo abaixo … | regras/inicio.md; link para conta.md#avisos |
| 608 | Nas prévias e na homologação: o "Ver como" mostra … | igual, em `regras/inicio.md`, "Início (painel pessoal)" |
| 610 | O cartão "Na TV da sala" aparece no Início … | regras/inicio.md; link para explorar.md#explorar |
| 616 | As listas estão em src/lib/conta.ts (regras, com teste em … | igual, em `regras/conta.md`, "Sua conta" |
| 618 | Abre pelo menu do retrato, no topo (ver "Menu … | regras/conta.md; link para site.md#como-o-site-funciona |
| 619 | Igual para todos (decisão do Gui, 18/11/2026): a conta … | regras/conta.md; "escolha da sessão" no histórico; marca (Gui, 18/11) |
| 620 | No alto: retrato, nome (que quebra entre as palavras … | igual, em `regras/conta.md`, "Sua conta" |
| 621 | Ordem (proposta A do conceito da sessão E, escolha … | regras/conta.md; a proposta A da sessão E no histórico; "deixavam" virou "deixariam"; marca (Gui, 17/11) |
| 622 | O que você criou: uma faixa sem cartão, entre … | igual, em `regras/conta.md`, "Sua conta" |
| 623 | Avisos: um cartão na largura toda, com a lista … | igual, em `regras/conta.md`, "Sua conta" |
| 624 | Rascunhos e lixeira: os rascunhos da pessoa e o … | igual, em `regras/conta.md`, "Sua conta" |
| 625 | Seus laços do coração: os que ela definiu, inclusive … | igual, em `regras/conta.md`, "Sua conta" |
| 626 | A conta mostra a carta de Natal. | igual, em `regras/conta.md`, "Sua conta" |
| 627 | Administração em página própria (decisão do Gui, 18/11/2026: "Sua … | regras/conta.md; o de antes, a proposta A da sessão H, o QA e a W2/W3 no histórico; marcas (Gui, 18/11); links para infraestrutura.md |
| 628 | Pendências da administração: o que pede uma ação de … | regras/conta.md; links para infraestrutura.md, lixeira.md e integrantes.md |
| 629 | Cópia mensal atrasada: cada vez que o script do … | igual, em `regras/conta.md`, "Sua conta" |
| 630 | Na homologação e nas prévias, o "Ver como" mostra … | igual, em `regras/conta.md`, "Sua conta" |
| 636 | Migração 024-avisos. As regras estão em src/lib/avisos.ts, a geração … | igual, em `regras/conta.md`, "Avisos" |
| 638 | Dentro do site, sem e-mail nem notificação no celular. … | igual, em `regras/conta.md`, "Avisos" |
| 639 | Tipos: o pedido para liberar um relato (ver "Ampliar … | regras/conta.md; links para ampliar.md e memoria.md |
| 640 | Quando nasce: relato novo, quando um relato é publicado … | regras/conta.md; o defeito do QA de 23/11 no histórico |
| 641 | Quem recebe: só quem tem login, e só a … | regras/conta.md; a revisão D1f no histórico; marca (chat, 24/11) |
| 642 | Quem não vê o item não recebe aviso dele: … | igual, em `regras/conta.md`, "Avisos" |
| 643 | Sai da lista ao abrir a memória. O pedido … | igual, em `regras/conta.md`, "Avisos" |
| 644 | Cada aviso leva à memória e, quando é de … | igual, em `regras/conta.md`, "Avisos" |
| 645 | Espelho: apaga os avisos, como apaga os relatos. O … | igual, em `regras/conta.md`, "Avisos" |
| 646 | As prévias têm dois avisos de exemplo para cada … | igual, em `regras/conta.md`, "Avisos" |
| 652 | Migração 074-sugestoes-de-correcao (onda 2, decisão do Gui de 17/11/2026). … | regras/memoria.md; "onda 2" no histórico; marca (Gui, 17/11) |
| 654 | Ninguém muda o que outra pessoa registrou: quem recebe … | regras/memoria.md; "depois da sessão G" no histórico; marca (Gui, 18/11) |
| 655 | Os dados da memória, para quem criou e para … | regras/memoria.md; "sessão F" e "defeito do QA" no histórico; marca (Gui, 18/11) |
| 656 | Um recado sobre um relato, para quem escreveu ou … | igual, em `regras/memoria.md`, "Sugestão de correção" |
| 657 | Quem recebe ganha o aviso ("Elizete sugeriu uma correção … | regras/memoria.md; "P6 do QA" no histórico; marca (Gui, 23/11) |
| 658 | Privacidade: só quem mandou e quem recebeu veem a … | igual, em `regras/memoria.md`, "Sugestão de correção" |
| 664 | Migrações 075-reacoes e 081-reacoes-na-memoria (onda 2, decisão do Gui … | regras/memoria.md; "onda 2" e "refeitas na observação" no histórico; marca (Gui, 17 e 18/11) |
| 666 | Onde: na memória inteira (logo abaixo das ações do … | igual, em `regras/memoria.md`, "Reações" |
| 667 | Os quatro símbolos, desenhados com os rabiscos do site, … | regras/memoria.md; "a versão final de 18/11/2026" no histórico |
| 668 | Como nas redes: o coração fica à vista, e … | igual, em `regras/memoria.md`, "Reações" |
| 669 | As recebidas, ao lado: até três símbolos encostados e … | igual, em `regras/memoria.md`, "Reações": a frase "Não há mais o link Quem marcou" saiu e voltou na revisão R-AC2 |
| 670 | Sem script, tudo funciona: cada toque é um formulário … | igual, em `regras/memoria.md`, "Reações" |
| 671 | "Eu estava lá" numa memória em que a pessoa … | igual, em `regras/memoria.md`, "Reações" |
| 672 | Privacidade: só reage quem vê a memória, o relato … | igual, em `regras/memoria.md`, "Reações" |
| 678 | Observação do Gui de 18/11/2026 ("Padrões que as pessoas … | regras/memoria.md; a origem no histórico; o ponteiro para docs/visual.md fica; marca (Gui, 18/11) |
| 680 | A memória, cada relato e cada foto da parede … | regras/memoria.md; o motivo de antes ("o menu ficava escondido") e "continua como está" no histórico; marca (Gui, 18/11) |
| 681 | Memória: "Compartilhar como imagem", "Sugerir uma correção" (ou "Corrigir … | regras/memoria.md; "saíram do pé da página" no histórico |
| 682 | Relato: "Deixar um recado para Fulano" (no relato de … | igual, em `regras/memoria.md`, "Botão de menu nas memórias" |
| 683 | Foto: "Ver a foto inteira" e "Baixar a foto". | igual, em `regras/memoria.md`, "Botão de menu nas memórias" |
| 684 | Sem script, abre e fecha pelo próprio botão. Com … | igual, em `regras/memoria.md`, "Botão de menu nas memórias" |
| 690 | Onda 2, decisão do Gui de 17/11/2026. As regras … | regras/memoria.md; "onda 2" no histórico; marca (Gui, 17/11) |
| 692 | No menu da memória publicada e no de cada … | regras/memoria.md; "Não há mais a assinatura" no histórico; marca (Gui, 18/11) |
| 693 | A imagem é desenhada no navegador de quem compartilha, … | igual, em `regras/memoria.md`, "Compartilhar como imagem" |
| 694 | Só gera quem vê a memória publicada; quem não … | igual, em `regras/memoria.md`, "Compartilhar como imagem" |
| 695 | Qual nome usar (decisão do Gui, 18/11/2026, depois da … | regras/memoria.md; "sessão H" e "P7 do QA" no histórico; marcas (Gui, 18/11) e (Gui, 23/11) |
| 696 | O espaço de personalizar (proposta A do conceito da … | regras/memoria.md; "proposta A da sessão J" e "Em vez de uma escolha solta" no histórico; marca (Gui, 18/11) |
| 697 | Nome: quando quem compartilha deu um apelido próprio a … | igual, em `regras/memoria.md`, "Compartilhar como imagem" |
| 698 | Cores: sempre. "Papel" (o padrão), "Da família" (a cor … | igual, em `regras/memoria.md`, "Compartilhar como imagem" |
| 699 | Foto: quando a memória tem mais de uma. A … | igual, em `regras/memoria.md`, "Compartilhar como imagem" |
| 700 | Relato: quando há mais de um relato publicado que … | igual, em `regras/memoria.md`, "Compartilhar como imagem" |
| 701 | "Em memória" é opção (resposta do Gui, 18/11/2026): o … | regras/memoria.md; marca (Gui, 18/11) |
| 702 | O que entrar depois ganha uma aba. | igual, em `regras/memoria.md`, "Compartilhar como imagem" |
| 708 | Migrações 025-relato-so-para-quem-via, 105-publico-conhecido-do-relato, 107-versao-da-memoria e 108-um-pedido-aberto-por-relato. As regras estão … | igual, em `regras/ampliar.md`, "Ampliar quem vê uma memória com relatos" |
| 710 | Ampliar é a memória passar a ser vista por … | igual, em `regras/ampliar.md`, "Ampliar quem vê uma memória com relatos" |
| 711 | Só quem criou grava o público (revisão Y2 do … | regras/ampliar.md; "revisão Y2 do PR #160" no histórico |
| 712 | A conta sai dos relatos que existem na hora … | regras/ampliar.md; Y2, Y3 e "Caminho escolhido na W3" no histórico |
| 713 | Só a mudança de quem vê recalcula os relatos … | regras/ampliar.md; "revisão Y do PR #160" no histórico |
| 714 | O relato só espera por quem nunca o viu … | regras/ampliar.md; "P3 do QA" no histórico; marca (Gui, 23/11) |
| 715 | O público conhecido soma o público da memória a … | igual, em `regras/ampliar.md`, "Ampliar quem vê uma memória com relatos" |
| 716 | O rascunho de relato descartado fica fora da espera … | regras/ampliar.md; "revisão Y do PR #160" no histórico |
| 717 | Quem passou a ver não recebe nada do relato … | igual, em `regras/ampliar.md`, "Ampliar quem vê uma memória com relatos" |
| 718 | Quem ampliou vê, na própria memória, de quem são … | igual, em `regras/ampliar.md`, "Ampliar quem vê uma memória com relatos" |
| 719 | O autor recebe o pedido como aviso, com a … | regras/ampliar.md; "crítica C2" e "revisão Y" no histórico; marcas (Gui, 22/11) |
| 720 | Um pedido aberto por relato, garantido pelo banco (índice … | igual, em `regras/ampliar.md`, "Ampliar quem vê uma memória com relatos" |
| 721 | A resposta confere o público (revisão Y2 do PR … | regras/ampliar.md; "revisão Y2 do PR #160" no histórico |
| 722 | "Manter como estava" vale só para o público que … | regras/ampliar.md; "de antes da W3" no histórico; marca (Gui, 22/11) |
| 723 | O pedido para um público já recusado sai da … | regras/ampliar.md; "Y3 do PR #160" no histórico; marca (Gui, 22/11) |
| 724 | O relato que nasce depois de a memória abrir … | regras/ampliar.md; "Y3 do PR #160" e "D5 da sessão Z" no histórico; marca (Gui, 22/11) |
| 725 | Relato de quem não acessa o site: quem registrou … | igual, em `regras/ampliar.md`, "Ampliar quem vê uma memória com relatos" |
| 726 | Restringir não pede nada. Quando o público da memória … | igual, em `regras/ampliar.md`, "Ampliar quem vê uma memória com relatos" |
| 727 | A resposta é um formulário comum (/api/avisos), que funciona … | igual, em `regras/ampliar.md`, "Ampliar quem vê uma memória com relatos" |
| 728 | As prévias têm um pedido de exemplo: um relato … | igual, em `regras/ampliar.md`, "Ampliar quem vê uma memória com relatos" |
| 734 | /explorar: uma tela só. Os controles seguem a proposta … | regras/explorar.md, Explorar; a origem (proposta A da sessão D) no histórico; marca (Gui, 18/11); explorarMemorias, que a AC1 tirou, virou contextoDoExplorar |
| 736 | No alto, nesta ordem: as famílias, em pílula, logo … | igual, em `regras/explorar.md`, "Explorar" |
| 737 | "Filtros" é uma ferramenta só. Fechado, diz quantos filtros … | igual, em `regras/explorar.md`, "Explorar" |
| 738 | A ordem não é filtro: fica à parte, num … | igual, em `regras/explorar.md`, "Explorar" |
| 739 | "Forma de ver" tem as três formas que trocam … | regras/explorar.md, Explorar; a origem no histórico; marca (Gui, 22/11) |
| 740 | Família: uma ou mais. Com duas famílias marcadas entram … | igual, em `regras/explorar.md`, "Explorar" |
| 741 | Filtros, combináveis entre si: tipo de momento, pessoas juntas, … | igual, em `regras/explorar.md`, "Explorar" |
| 742 | "Quem estava junto" com o parentesco de quem olha … | regras/explorar.md, Explorar; a origem no histórico; marca (Gui, 22/11) |
| 743 | Ordem: mais recentes primeiro (o padrão), mais antigas primeiro, … | igual, em `regras/explorar.md`, "Explorar" |
| 744 | Com script, o fim dos filtros diz quantas memórias … | igual, em `regras/explorar.md`, "Explorar" |
| 745 | A linha do tempo termina com um fecho: "Aqui … | igual, em `regras/explorar.md`, "Explorar" |
| 746 | Os trilhos de capítulo e a barra de décadas … | igual, em `regras/explorar.md`, "Explorar" |
| 747 | A linha do tempo carrega todas as memórias de … | igual, em `regras/explorar.md`, "Explorar" |
| 748 | Tudo respeita a visibilidade: o sorteio, o mural, o … | igual, em `regras/explorar.md`, "Explorar" |
| 749 | Modo TV, a partir de 62rem: a barra (proposta … | regras/explorar.md, Modo TV ("A partir de 62rem, a barra"); a origem (sessão X) no histórico; marca (Gui, 22/11) |
| 750 | Não rola em nenhuma janela e com nenhuma memória. … | regras/explorar.md, Modo TV |
| 751 | Proporcional à janela. No modo TV, 1rem é 1/80 … | regras/explorar.md, Modo TV; as medidas juntadas com visual.md, O modo TV ("Tudo é proporcional à janela") |
| 752 | A barra é um cartão branco, o material do … | juntada com visual.md, O modo TV ("A barra" e "Ajustes") |
| 753 | Símbolos com nome. O que tem símbolo conhecido de … | regras/explorar.md, Modo TV; a lista dos símbolos juntada com visual.md, O modo TV ("Os símbolos"), com a frase da peça do sistema |
| 754 | As teclas seguem a lógica de interface de TV … | regras/explorar.md, Modo TV; a tabela das teclas veio de visual.md para o fim da seção |
| 755 | Ocultar os controles. Um botão na barra tira a … | regras/explorar.md, Modo TV, juntada com o comportamento de visual.md (teclas de mídia, foco no botão do canto); marca (Gui, 22/11) com o texto dele |
| 756 | A janela deitada abaixo de 62rem também usa a … | regras/explorar.md, Modo TV; a origem (aplicação da E1) no histórico; o desenho juntado com visual.md, "A janela deitada abaixo de 62rem" |
| 757 | Abaixo de 62rem, em pé, o modo TV é … | regras/explorar.md, Modo TV; "é o de antes" virou "fica sem a barra"; ganhou as setas, o Esc e o toque na foto, vindos de visual.md |
| 758 | Testes em testes/explorar-controles.test.ts, testes/explorar.test.ts, testes/simbolos.test.ts e testes/sala.test.ts. A conferência … | regras/explorar.md, Modo TV |
| 759 | O modo TV segue os filtros de onde foi … | regras/explorar.md, Modo TV; a origem no histórico; marcas (Gui, 22/11) e (Gui, 25/11) |
| 760 | A TV da sala (aplicação da E1, o modo … | regras/explorar.md, Modo TV; a origem (aplicação da E1) no histórico |
| 761 | A regra da sala: nas duas entradas do cartão … | regras/explorar.md, Modo TV; marca (Gui, 22 e 24/11) |
| 762 | O marcador da sala (sala=1 no endereço do modo … | regras/explorar.md, Modo TV; as correções da revisão R-AB no histórico; marca (Gui, 25/11) |
| 763 | A porta: no Início, de 24 a 26 de … | regras/explorar.md, Modo TV |
| 764 | A carta na TV (a da proposta A): "Oi, … | regras/explorar.md, Modo TV; a origem e a frase da janela deitada pequena no histórico; marca (Gui, 25/11) |
| 765 | O simulador de data: ?hoje=AAAA-MM-DD mostra o Início como … | regras/explorar.md, Modo TV; "desde a correção..." no histórico; marca (chat, 25/11) |
| 766 | O que não entrou: a rota /sala, o interruptor … | regras/explorar.md, Modo TV |
| 767 | A voz de quem contou no modo TV (aplicação … | regras/explorar.md, Modo TV; as correções da revisão R-AB no histórico; o desenho da voz juntado com visual.md, "O botão de som e a voz"; marca (chat, 25/11) |
| 768 | O modo TV lê uma memória só por passagem … | regras/explorar.md, Modo TV; a origem (causa 6 da M1) e a medida de 4G lento no histórico; juntada com a linha 128 (site.md aponta para cá) |
| 769 | Quais fotos o mural mostra (pedido do Gui, 18/11/2026; … | regras/explorar.md, Explorar; a origem no histórico; marca (Gui, 18/11) |
| 770 | Modo TV: quem está vendo escolhe o tempo do … | dividida: o modo TV em regras/explorar.md, Modo TV (primeiro item); "Mural:" em regras/explorar.md, Explorar (último item) |
| 772 | O endereço e as regras dos filtros | regras/explorar.md, virou a seção "## O endereço e as regras dos filtros" |
| 774 | No endereço: tipo, pessoa, nucleo (o mesmo dos atalhos … | igual, em `regras/explorar.md`, "Explorar" |
| 775 | No endereço fica só o que traz a pessoa … | igual, em `regras/explorar.md`, "Explorar" |
| 776 | Entre filtros diferentes vale o "e"; dentro de um … | igual, em `regras/explorar.md`, "Explorar" |
| 777 | "Com áudio" conta só áudio de relato publicado. "Contou" … | igual, em `regras/explorar.md`, "Explorar" |
| 778 | "Onde contou" e "onde estava e ainda não contou" … | igual, em `regras/explorar.md`, "Explorar" |
| 779 | O filtro de capítulo usa a regra da página … | igual, em `regras/explorar.md`, "Explorar" |
| 785 | A direção visual, o sistema e a regra de … | igual, em `regras/telas.md`, "Visual" |
| 786 | Toda mudança visual é conferida em 390, 1280 e … | igual, em `regras/telas.md`, "Visual" |
| 787 | A árvore muda só de aparência; o arranjo e … | regras/telas.md; "acima" virou link para regras/arvore.md |
| 788 | Aspas curvas (resposta do Gui à P8 do QA … | regras/telas.md; a origem no histórico; marca (Gui, 23/11) |
| 789 | Nada salta na página (decisão do Gui, 19/11/2026). "Largura … | regras/telas.md, só a marca (Gui, 19/11), o link e o que a sessão faz antes de mudar; a regra juntada com visual.md, O nível de qualidade |
| 790 | Gestalt que se confere sozinha (pedido do Gui, 17/11/2026; … | regras/telas.md; a origem no histórico; marca (Gui, 17/11) e (Gui, 18/11) nas exceções; o princípio fica só em visual.md ("pelo menos o dobro") |
| 791 | Conceito primeiro, com parada (pedido do Gui, 17/11/2026). Nos … | regras/telas.md; "Foi assim com..." no histórico; marca (Gui, 17/11) |
| 797 | O que o Gui decidiu no chat e ainda … | docs/decisoes.md, "Decidido, a construir"; "vira regra na seção do assunto" virou "no arquivo do assunto, em docs/regras/"; o relato da limpeza da sessão L no histórico |
| 799 | Críticas de design C1 e C2 dos fluxos de … | docs/decisoes.md; "Os pontos pequenos foram construídos na sessão AA..." virou "Os pontos pequenos já estão nas regras"; o texto antigo no histórico |
| 800 | Login no dia 25: o Gui, a Giovanna e … | docs/decisoes.md, "Decidido, a construir", igual |
| 801 | A foto no alto da página de escrever espera … | docs/decisoes.md, "Decidido, a construir", igual |
| 803 | Pontos que pedem solução nova, cada um com brief … | docs/decisoes.md, "Decidido, a construir", igual |
| 804 | Busca por digitação no Explorar (E2): escolhida a proposta … | docs/decisoes.md; ganhou "falta a aplicação" |
| 805 | A memória como lugar de ler e contar (E3): … | docs/decisoes.md, "Decidido, a construir", igual |
| 806 | A peça de feedback de estado (exploração E4, aprovada … | docs/decisoes.md; "a sessão para até o Gui escolher" virou "a exploração E4 foi feita, e a escolha do Gui está no brief; falta a aplicação" (auditoria AC, 2.2); marca (Gui, 24/11) |
| 807 | Desempenho antes do Natal (M1, decisões do Gui de … | docs/decisoes.md; "em sessões D1 e D2" virou "A D1 (D1a a D1f) e a causa 6 estão no site; faltam a D2 e a D3" (auditoria AC, 2.2) |
| 808 | QA de UX dos fluxos, logo depois do QA … | docs/decisoes.md, "Decidido, a construir", igual |
| 809 | Administração do zero, talvez um painel de administrador (pedido … | docs/decisoes.md, "Decidido, a construir", igual |
| 810 | Pacote pequeno para uma sessão só (Sonnet), na mesma … | docs/decisoes.md; "(Sonnet)" e "até segunda" no histórico |
| 811 | Espaço igual entre os itens dos controles "Forma de … | docs/decisoes.md, "Decidido, a construir", igual |
| 812 | Uma linha do tempo só, a do Explorar, que … | docs/decisoes.md, "Decidido, a construir", igual |
| 813 | Menu: nomes que digam o que há dentro (pedido … | docs/decisoes.md, "Decidido, a construir", igual |
| 814 | Rodapé melhor trabalhado, com um acesso rápido ao painel … | docs/decisoes.md, "Decidido, a construir", igual |
| 815 | Notificações na navegação do alto, se houver alertas que … | docs/decisoes.md, "Decidido, a construir", igual |
| 816 | Navegação do celular com cara de aplicativo (pergunta do … | docs/decisoes.md; "escrito na segunda" no histórico; "(ver Visual, no CLAUDE.md)" virou "Movimento", em docs/visual.md; a banda do Safari ganhou o link para docs/visual.md |
| 817 | Rever a navegação e os botões do formulário de … | docs/decisoes.md; "para depois de segunda" no histórico |
| 818 | O mínimo de recarregamentos no site todo (pedido do … | docs/decisoes.md; "Interação dos formulários" virou link para regras/formularios.md; "(sessão L)" no histórico |
| 819 | Revisão visual: movimento, detalhes e o aparelho (fases 4 … | docs/decisoes.md; "(ver Visual)" virou docs/visual.md |
| 820 | Movimento e detalhes, só os de docs/visual.md: a frase … | docs/decisoes.md; o tocador de áudio próprio saiu da fase 4, porque já está no site (C-6) |
| 821 | QA visual no celular de verdade: o que docs/visual.md … | docs/decisoes.md, "Decidido, a construir", igual |
| 822 | A polaroid em toda foto-chave fica para o Gui … | docs/decisoes.md; a frase de docs/ux/ (já movidos para o histórico) saiu, no histórico |
| 828 | Árvore: regras de ocultar e de exigir parentes de … | docs/decisoes.md, "Em aberto", igual |
| 829 | Adicionar pessoa direto pela árvore (ideia do Gui, 20/11/2026, … | docs/decisoes.md, "Em aberto", igual |
| 830 | Escrever o relato na própria página da memória, para … | docs/decisoes.md, "Em aberto", igual |
| 831 | Relato como conversa, para depois (anotadas pelo Gui ao … | docs/decisoes.md, "Em aberto", igual |

## docs/visual.md

| Linha | A regra (começo) | Para onde foi |
| --- | --- | --- |
| 3 | O que vale para construir: a direção, o nível … | igual, em `docs/visual.md`, abertura |
| 5 | A ideia em uma frase: um álbum de família … | igual, em `docs/visual.md`, abertura |
| 9 | A família inclui gente com pouca familiaridade com sites, … | igual, em `docs/visual.md`, "Para quem" |
| 15 | A régua de qualidade é o bayara.design e o … | igual, em `docs/visual.md`, "A direção" |
| 19 | Toda casa tem uma, com fotos reveladas, um envelope … | igual, em `docs/visual.md`, "A ideia central: a caixa de fotografias da família" |
| 21 | A foto e o verso. A memória é uma … | igual, em `docs/visual.md`, "A ideia central: a caixa de fotografias da família" |
| 22 | O ano como divisória. Na linha do tempo, cada … | igual, em `docs/visual.md`, "A ideia central: a caixa de fotografias da família" |
| 23 | A cor de cada família. Cada família tem sua … | igual, em `docs/visual.md`, "A ideia central: a caixa de fotografias da família" |
| 29 | Painel (página inicial) Na primeira visita, a carta de … | igual, em `docs/visual.md`, "Uma ideia forte por tela" |
| 30 | Explorar na linha do tempo e famílias A assinatura … | igual, em `docs/visual.md`, "Uma ideia forte por tela" |
| 31 | Linha do tempo O ano grande como divisória e … | igual, em `docs/visual.md`, "Uma ideia forte por tela" |
| 32 | Explorar, mural e modo TV No mural, só as … | igual, em `docs/visual.md`, "Uma ideia forte por tela" |
| 33 | Memória A foto e o verso: a imagem grande, … | igual, em `docs/visual.md`, "Uma ideia forte por tela" |
| 34 | Pessoa O verbete: o parentesco grande ("sua avó"), uma … | igual, em `docs/visual.md`, "Uma ideia forte por tela" |
| 35 | Capítulo Abertura de capítulo de livro: título, período, marcos … | igual, em `docs/visual.md`, "Uma ideia forte por tela" |
| 36 | Laço A história dos dois, contada como um capítulo: … | igual, em `docs/visual.md`, "Uma ideia forte por tela" |
| 37 | Árvore As famílias em cor, cartões como etiquetas com … | igual, em `docs/visual.md`, "Uma ideia forte por tela" |
| 38 | Formulários Uma pergunta por tela, grande, em serifa, como … | igual, em `docs/visual.md`, "Uma ideia forte por tela" |
| 39 | Sua conta O retrato e o nome da pessoa … | igual, em `docs/visual.md`, "Uma ideia forte por tela" |
| 40 | Rascunhos, lixeira, administração Utilitário e silencioso Tudo | igual, em `docs/visual.md`, "Uma ideia forte por tela" |
| 46 | Claro ou escuro Claro, sem modo escuro. Quando uma … | igual, em `docs/visual.md`, "Decisões" |
| 47 | Títulos Serifa macia | igual, em `docs/visual.md`, "Decisões" |
| 48 | Texto Grotesca neutra | igual, em `docs/visual.md`, "Decisões" |
| 49 | Legendas e fichas Mono pequena | igual, em `docs/visual.md`, "Decisões" |
| 50 | Manuscrita No nome de quem conta cada relato, nas … | igual, em `docs/visual.md`, "Decisões" |
| 51 | Fonte A combinação C, De cartaz: DM Serif Display, … | igual, em `docs/visual.md`, "Decisões" |
| 52 | Cor Pastéis como cores principais, em blocos sólidos. Cada … | igual, em `docs/visual.md`, "Decisões" |
| 53 | Neutros Quente e aconchegante: papel creme e tinta de … | igual, em `docs/visual.md`, "Decisões" |
| 54 | Cores das famílias Cada família tem uma cor só, … | igual, em `docs/visual.md`, "Decisões" |
| 55 | Cores dos tipos de momento Escolhidas pelos administradores numa … | igual, em `docs/visual.md`, "Decisões" |
| 56 | Foto revelada Toda foto-chave da linha do tempo é … | igual, em `docs/visual.md`, "Decisões" |
| 57 | Linha do tempo Lista vertical com a rolagem normal, … | igual, em `docs/visual.md`, "Decisões" |
| 58 | Marca "MEMÓRIAS" é a palavra principal e fixa. Abaixo … | igual, em `docs/visual.md`, "Decisões" |
| 59 | Ícones e ilustrações Cabem, com limpeza e elegância, para … | igual, em `docs/visual.md`, "Decisões" |
| 60 | Páginas íntimas O que só a pessoa vê (o … | igual, em `docs/visual.md`, "Decisões" |
| 61 | "Família", e não "núcleo" O site não mostra o … | igual, em `docs/visual.md`, "Decisões" |
| 62 | Menu "Início" no menu, no computador e no celular, … | igual, em `docs/visual.md`, "Decisões" |
| 68 | [Feminist](https://feminist.framer.website) Calor geral, serifa macia nos títulos, pastéis em … | igual, em `docs/visual.md`, "Referências" |
| 69 | [Mira](https://mirastudio.framer.website) Nome escrito à mão sobre o retrato; formulário … | igual, em `docs/visual.md`, "Referências" |
| 70 | [Vertical](https://vertical.framer.media) Legenda em mono "lugar (ano)"; bloco de áudio … | igual, em `docs/visual.md`, "Referências" |
| 71 | [Lurais](https://lurais.framer.website) Disciplina: poucos pesos, hierarquia pelo tamanho, a foto … | igual, em `docs/visual.md`, "Referências" |
| 72 | [Gobo](https://gobo.framer.media) Página de trabalho como modelo da memória: título, … | igual, em `docs/visual.md`, "Referências" |
| 73 | [Folira](https://folira-lite.framer.website) Polaroid; linha do tempo com trilho e ponto … | igual, em `docs/visual.md`, "Referências" |
| 74 | [Union](https://the-union-template.webflow.io) Página do casamento como modelo da memória (coluna … | igual, em `docs/visual.md`, "Referências" |
| 75 | Home do [bayara.design](https://bayara.design) A frase que acende palavra por … | igual, em `docs/visual.md`, "Referências" |
| 81 | O que o bayara.design e a @bsurda fazem e … | igual, em `docs/visual.md`, "O nível de qualidade" |
| 83 | Disciplina de tipo. O bayara usa uma família só … | igual, em `docs/visual.md`, "O nível de qualidade" |
| 84 | Grid rígido e alinhado à esquerda. Colunas fixas, tudo … | igual, em `docs/visual.md`, "O nível de qualidade" |
| 85 | Cor com função. No bayara, o azul marca o … | visual.md; marca (Gui, 16/11) |
| 86 | Objeto com sentido. O crachá da @bsurda imita uma … | igual, em `docs/visual.md`, "O nível de qualidade" |
| 87 | Ações tipográficas. Links e ações secundárias são texto sublinhado, … | igual, em `docs/visual.md`, "O nível de qualidade" |
| 88 | Padrões que as pessoas já conhecem (premissa do Gui, … | visual.md; marca (Gui, 18/11) |
| 89 | Interação sem recarregar a página (premissa do Gui, 18/11/2026). … | visual.md; marca (Gui, 18/11); citação virou link para regras/formularios.md |
| 90 | Nada salta na página (decisão do Gui, 19/11/2026). "Largura … | visual.md; marca (Gui, 19/11) |
| 91 | Gestalt em toda tela (premissa do Gui, 17/11/2026). Quem … | visual.md; marca (Gui, 17/11) |
| 92 | Proximidade: o espaço entre grupos é pelo menos o … | visual.md; "foi o caso das linhas na legenda da árvore" no histórico |
| 93 | Semelhança: o que tem a mesma função tem a … | igual, em `docs/visual.md`, "O nível de qualidade" |
| 94 | Região comum: quando a proximidade não basta, o grupo … | igual, em `docs/visual.md`, "O nível de qualidade" |
| 95 | Na prática: espaço dentro de um grupo usa --e-1 … | igual, em `docs/visual.md`, "O nível de qualidade" |
| 96 | Exemplo em uso: na legenda da árvore, os grupos … | visual.md; citação virou link para regras/telas.md#visual |
| 97 | Detalhe pequeno que se nota. Como o nome do … | igual, em `docs/visual.md`, "O nível de qualidade" |
| 98 | Celular primeiro, desktop de destaque. A família vai usar … | igual, em `docs/visual.md`, "O nível de qualidade" |
| 104 | O visual pode mudar a aparência e a composição … | igual, em `docs/visual.md`, "Fundações que não mudam" |
| 108 | Dados e regras Banco, migrações, permissões, visibilidade, rascunho, lixeira, … | igual, em `docs/visual.md`, "Fundações que não mudam" |
| 109 | Árvore O comportamento inteiro: arranjo, lados das famílias, linha … | igual, em `docs/visual.md`, "Fundações que não mudam" |
| 110 | Fluxos Cadastro guiado por caminho, as sete etapas da … | visual.md; citação virou link para regras/formularios.md |
| 111 | Organização As páginas e o que cada uma contém, … | igual, em `docs/visual.md`, "Fundações que não mudam" |
| 112 | Textos de interface O jeito de falar ("sua avó", … | igual, em `docs/visual.md`, "Fundações que não mudam" |
| 113 | Acessibilidade Funciona sem JavaScript, por teclado, com movimento reduzido, … | igual, em `docs/visual.md`, "Fundações que não mudam" |
| 119 | Regra: a rolagem é sempre a do aparelho, e … | igual, em `docs/visual.md`, "Movimento" |
| 121 | Entram: | igual, em `docs/visual.md`, "Movimento" |
| 123 | o cartão que aparece com um esmaecer curto; | igual, em `docs/visual.md`, "Movimento" |
| 124 | a sanfona que abre empurrando o conteúdo; | igual, em `docs/visual.md`, "Movimento" |
| 125 | a foto que amplia ao toque e fecha ao … | igual, em `docs/visual.md`, "Movimento" |
| 126 | o item da barra de décadas que acende; | igual, em `docs/visual.md`, "Movimento" |
| 127 | a foto de quem faleceu, que passa do tom … | igual, em `docs/visual.md`, "Movimento" |
| 128 | uma frase de abertura que acende palavra por palavra … | igual, em `docs/visual.md`, "Movimento" |
| 130 | Ficam de fora: cartão que deita ao rolar, foto … | igual, em `docs/visual.md`, "Movimento" |
| 132 | Movimento que mostra o que mudou. No Explorar e … | igual, em `docs/visual.md`, "Movimento" |
| 134 | O modo TV é o lugar de experimentar. É … | igual, em `docs/visual.md`, "Movimento" |
| 136 | Peças paradas no alto. Na linha do tempo, a … | igual, em `docs/visual.md`, "Movimento" |
| 142 | O CSS está em src/visual/ e os componentes em … | igual, em `docs/visual.md`, "Sistema" |
| 148 | Entrada única do estilo src/visual/sistema.ts: as fontes e, em … | igual, em `docs/visual.md`, "Onde fica cada coisa" |
| 149 | Tokens src/visual/tokens.css, em camadas: valores (neutros e as cores … | igual, em `docs/visual.md`, "Onde fica cada coisa" |
| 150 | Larguras de tela 62rem para o computador e 100rem … | igual, em `docs/visual.md`, "Onde fica cada coisa" |
| 151 | Peças src/visual/pecas.css (as ações em base.css, o recado e … | igual, em `docs/visual.md`, "Onde fica cada coisa" |
| 152 | Esqueleto src/layouts/Visual.astro. Recebe nucleos, os núcleos do que está … | igual, em `docs/visual.md`, "Onde fica cada coisa" |
| 153 | Funções puras src/lib/visual.ts: fontes, assinatura, cor da família, da … | igual, em `docs/visual.md`, "Onde fica cada coisa" |
| 154 | Testes testes/sistema.test.ts (fonte numa linha, assinatura, monograma, tokens e … | igual, em `docs/visual.md`, "Onde fica cada coisa" |
| 160 | A marca no alto ou no fim da página … | igual, em `docs/visual.md`, "As peças e como usar" |
| 161 | O M sozinho Monograma.astro <Monograma /> mostra o da … | igual, em `docs/visual.md`, "As peças e como usar" |
| 162 | A foto-chave de uma memória Polaroid.astro id, fotos, legenda … | igual, em `docs/visual.md`, "As peças e como usar" |
| 163 | Data e lugar Carimbo.astro <Carimbo itens={[carimboDaData(memoria), memoria.lugar]} />. Item … | igual, em `docs/visual.md`, "As peças e como usar" |
| 164 | O tipo de momento Etiqueta.astro <Etiqueta tipo={id} rotulo={nome} /> | igual, em `docs/visual.md`, "As peças e como usar" |
| 165 | Um período ou uma data aproximada Pilula.astro <Pilula>2018–2020</Pilula> ("2018-2020", … | igual, em `docs/visual.md`, "As peças e como usar" |
| 166 | A ficha (quando, onde, tipo, capítulos) Ficha.astro e Dado.astro … | igual, em `docs/visual.md`, "As peças e como usar" |
| 167 | A foto de uma pessoa Retrato.astro nome, foto (o … | igual, em `docs/visual.md`, "As peças e como usar" |
| 168 | Uma pessoa com nome e parentesco classes pessoa e … | igual, em `docs/visual.md`, "As peças e como usar" |
| 169 | Uma pessoa numa lista de laços Gente.astro href, nome, … | igual, em `docs/visual.md`, "As peças e como usar" |
| 170 | Um relato, na memória conversa/Voz.astro O relato como conversa: … | igual, em `docs/visual.md`, "As peças e como usar" |
| 171 | Escrever um relato conversa/Janela.astro A janela da conversa: as … | igual, em `docs/visual.md`, "As peças e como usar" |
| 172 | Um áudio Audio.astro rotulo, src, transcricao. Usa o tocador … | docs/visual.md, "As peças e como usar"; Audio.astro saiu na AC1, e a linha passou a apontar para conversa/Voz.astro com conversa/Mensagem.astro |
| 173 | O capítulo de uma memória SinalDoCapitulo.astro, Trilhos.astro id, titulo … | igual, em `docs/visual.md`, "As peças e como usar" |
| 174 | Reagir a uma memória, um relato ou uma foto … | igual, em `docs/visual.md`, "As peças e como usar" |
| 175 | As ações secundárias de um item MenuDeAcoes.astro rotulo ("Mais … | igual, em `docs/visual.md`, "As peças e como usar" |
| 176 | O slider de proximidade Proximidade.astro id, valor (o guardado, … | igual, em `docs/visual.md`, "As peças e como usar" |
| 177 | Fases de um casal ou marcos que abrem Sanfona.astro … | igual, em `docs/visual.md`, "As peças e como usar" |
| 178 | Recado de "salvou" ou de erro Recado.astro <Recado> ou … | igual, em `docs/visual.md`, "As peças e como usar" |
| 179 | Tela sem nada para mostrar Vazio.astro <Vazio frase="…"> com … | igual, em `docs/visual.md`, "As peças e como usar" |
| 180 | As ações de apagar de uma tela de editar … | igual, em `docs/visual.md`, "As peças e como usar" |
| 181 | Uma família que filtra ou que se escolhe PilulaDeFamilia.astro … | igual, em `docs/visual.md`, "As peças e como usar" |
| 182 | Uma escolha só entre poucas Segmentado.astro rotulo, nome, opcoes … | visual.md; marcas (Gui, 18/11) |
| 183 | Um controle com símbolo de TV ou de tocador … | visual.md; "Nasceu no modo TV (22/11/2026)" no histórico |
| 184 | Um símbolo sozinho, num lugar que já tem nome … | igual, em `docs/visual.md`, "As peças e como usar" |
| 185 | Ícone de tipo, rabisco de caneta IconeDoTipo.astro, Rabisco.astro São … | igual, em `docs/visual.md`, "As peças e como usar" |
| 186 | A ação principal da tela classe botao Uma por … | igual, em `docs/visual.md`, "As peças e como usar" |
| 187 | As outras ações classes acao e acao--quieta Texto sublinhado, … | igual, em `docs/visual.md`, "As peças e como usar" |
| 188 | Pergunta e campo de formulário classes pergunta, campo, campo__rotulo, … | igual, em `docs/visual.md`, "As peças e como usar" |
| 189 | A frase com lacunas classes frase e frase__lacuna Só … | igual, em `docs/visual.md`, "As peças e como usar" |
| 191 | Classes de texto, em base.css: t-capa, t-1, t-2, t-3 … | igual, em `docs/visual.md`, "As peças e como usar" |
| 193 | Medidas das peças. A foto revelada tem a moldura … | visual.md; "O arco saiu" virou regra no presente; marcas (Gui, 18/11) |
| 197 | Todos em src/visual/tokens.css. A tabela diz a intenção; os … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 201 | --papel, --papel-recuo O fundo da página e o fundo … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 202 | --branco A moldura da foto, o bilhete, o cartão … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 203 | --tinta, --tinta-suave O texto e o texto de apoio. … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 204 | --fio Linha fina entre partes | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 205 | --pastel, --meio, --vivo, --vivo-tinta A cor da família da … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 206 | --tipo-pastel, --tipo-meio, --tipo-cor, --tipo-tinta A cor do tipo de … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 207 | --trilho-cor, --trilho-ponto A cor do capítulo, posta por estiloDoCapitulo(cor) | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 208 | --alerta, --alerta-tinta O que deu errado: a marca e … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 209 | --chao-1 a --chao-3 O chão das épocas na linha … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 210 | Os nomes das cores (--verde-pastel, --azul-vivo…) Só para definir … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 211 | --e-1 a --e-4 Espaço dentro de um grupo | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 212 | --e-5 a --e-7 Espaço entre grupos | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 213 | --e-8, --e-9 Espaço entre partes da página | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 214 | --margem, --calha A margem lateral da página (classe miolo) … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 215 | --t-capa O ano da linha do tempo e número … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 216 | --t-titulo-1, --t-titulo-2, --t-titulo-3 Título da página, título de parte … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 217 | --t-abertura A frase de abertura em serifa | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 218 | --t-leitura O relato e o texto que se lê … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 219 | --t-corpo, --t-pequeno O texto da interface e o apoio | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 220 | --t-ficha, --t-micro A mono: ficha, rótulo e carimbo; selo | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 221 | --t-menu Só o menu do topo e o nome … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 222 | --medida A largura máxima de um texto corrido | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 223 | --raio-foto, --raio-moldura, --raio-bloco, --raio-carimbo, --raio-pilula A foto, o bilhete … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 224 | --traco A espessura do traço: sublinhado de ação, borda … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 225 | --toque 44 px: a altura mínima de tudo o … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 226 | --sombra-foto, --sombra-bilhete A foto revelada; o bilhete e o … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 227 | --curva, --tempo-curto, --tempo-medio Toda transição: uma curva e dois … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 228 | --tempo-lento Só a foto de quem faleceu, que acende … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 230 | As serifas trazem os próprios acertos (--escala-serifa, --aperto-titulo, --serifa-ajustes, … | igual, em `docs/visual.md`, "Os tokens e quando usar cada um" |
| 234 | A página usa o esqueleto novo. import Visual from … | igual, em `docs/visual.md`, "Como montar uma tela nova" |
| 235 | Diga o que a tela mostra. <Visual titulo="…" nucleos={ids}>: … | igual, em `docs/visual.md`, "Como montar uma tela nova" |
| 236 | O CSS da tela vai em src/visual/telas/<tela>.css, importado pela … | igual, em `docs/visual.md`, "Como montar uma tela nova" |
| 237 | A marcação usa os componentes. Uma tela não escreve … | igual, em `docs/visual.md`, "Como montar uma tela nova" |
| 238 | Celular primeiro. A tela nasce em 390 px. A … | igual, em `docs/visual.md`, "Como montar uma tela nova" |
| 239 | Gestalt antes dos detalhes. Confira os grupos de cada … | igual, em `docs/visual.md`, "Como montar uma tela nova" |
| 240 | Confira antes do push. npm run build; a tela … | igual, em `docs/visual.md`, "Como montar uma tela nova" |
| 244 | A fonte do site é FONTES_DO_SITE, em src/lib/visual.ts, hoje … | docs/visual.md, "Como a fonte é trocada", escrita já sem as combinações A e B (Gui, 26/11, pergunta 3 da auditoria AC; o código sai na AC1); os exemplos com combinacao('a') e combinacao('b') no histórico |
| 245 | Nada mais muda junto: o esqueleto põe data-serifa, data-grotesca, … | docs/visual.md, sem "o monograma certo acende" e sem public/icones/<serifa>/ (as três serifas saem na AC1); no histórico |
| 246 | As três combinações ficam no sistema, todas de licença … | juntada com a linha 244: só a C fica, com as quatro fontes; a tabela das três no histórico |
| 250 | A, Macia Fraunces Geist Geist Mono Oooh Baby A … | histórico (a combinação A sai na AC1) |
| 251 | B, Editorial Instrument Serif Instrument Sans IBM Plex Mono … | histórico (a combinação B sai na AC1) |
| 252 | C, De cartaz (a do site) DM Serif Display … | juntada com a linha 244 (as quatro fontes da C) |
| 254 | A página /sistema tem o seletor "Fontes dos exemplos" … | histórico (o seletor e /conceito/sobre saem na AC1) |
| 255 | A faixa do alto das prévias não troca mais … | docs/visual.md (o "mais", o "ainda" e a origem no histórico, como anotou a sessão do visual): "A faixa do alto das prévias não troca a fonte (Gui, 23/11)" e npm run capturas com a C; o cookie fontes e a comparação em /sistema no histórico (saem na AC1) |
| 256 | Fonte nova, fora das três: instalar pelo Fontsource, acrescentar … | docs/visual.md, "Fonte nova"; "fora das três" no histórico |
| 260 | O rascunho do Gui está em docs/visual/assinatura-hierarquia.png. A regra … | visual.md; citação virou link para regras/familias.md |
| 262 | "MEMÓRIAS" é a palavra principal e não muda: em … | igual, em `docs/visual.md`, "Assinatura do nome" |
| 263 | Logo abaixo vêm os sobrenomes das famílias, em caixa … | igual, em `docs/visual.md`, "Assinatura do nome" |
| 264 | Quem monta a linha é assinaturaDaTela, em src/lib/visual.ts. A … | igual, em `docs/visual.md`, "Assinatura do nome" |
| 265 | Telas que não são de um núcleo (pessoa, memória, … | igual, em `docs/visual.md`, "Assinatura do nome" |
| 266 | No texto corrido e na aba do navegador, o … | igual, em `docs/visual.md`, "Assinatura do nome" |
| 267 | No Explorar, em 1280 e 1920 px, a assinatura … | igual, em `docs/visual.md`, "Assinatura do nome" |
| 271 | O monograma é o M de Memórias, que não … | igual, em `docs/visual.md`, "Monograma" |
| 273 | Sai da serifa dos títulos, desenhado em SVG para … | docs/visual.md, "Monograma"; "dos arquivos das três serifas" e public/icones/<a, b ou c>/ viraram a serifa e public/icones/ (as três saem na AC1) |
| 274 | Ícone do site. favicon.svg é o M sozinho, na … | igual, em `docs/visual.md`, "Monograma" |
| 275 | Uso: ícone do site e, no celular, no lugar … | igual, em `docs/visual.md`, "Monograma" |
| 276 | Cor: uma cor só, no tom do texto, no … | igual, em `docs/visual.md`, "Monograma" |
| 277 | Tamanho mínimo: conferir a 16 px. Na página do … | igual, em `docs/visual.md`, "Monograma" |
| 281 | A regra de quem escolhe está em docs/decisoes.md, "Tipos … | visual.md; citação virou link para regras/formularios.md |
| 283 | A paleta: 34 cores, cada uma em quatro tons … | visual.md; as datas das levas viraram CORES_NOVAS e CORES_MAIS_NOVAS |
| 284 | Cor nova só entra com folga. As onze de … | visual.md; data da leva virou CORES_MAIS_NOVAS; as cores tentadas no histórico |
| 285 | O contraste é conferido por teste (testes/paleta.test.ts, com a … | igual, em `docs/visual.md`, "Tipos: paleta e ícones" |
| 289 | A tinta da cor sobre o papel e sobre … | igual, em `docs/visual.md`, "Tipos: paleta e ícones" |
| 290 | O texto do site sobre o pastel da cor: … | igual, em `docs/visual.md`, "Tipos: paleta e ícones" |
| 291 | A tinta da cor sobre o pastel dela: 4,5 … | igual, em `docs/visual.md`, "Tipos: paleta e ícones" |
| 292 | O vivo longe do pastel da mesma cor, pelo … | igual, em `docs/visual.md`, "Tipos: paleta e ícones" |
| 293 | Nenhuma cor mais perto de outra do que as … | igual, em `docs/visual.md`, "Tipos: paleta e ícones" |
| 294 | A mesma distância com folga de 1,2 vez As … | visual.md; data da leva virou CORES_MAIS_NOVAS |
| 296 | O vivo é ponto de destaque, nunca texto: sobre … | igual, em `docs/visual.md`, "Tipos: paleta e ícones" |
| 297 | Os rabiscos: 85, sem biblioteca, no mesmo traço (caixa … | visual.md; "Os 55 de 18/11/2026" virou "Os outros 55" |
| 298 | Como chega à tela: corDoTipo, estiloDoTipo e iconeDoTipo (src/lib/visual.ts) … | visual.md; "antiga" e "mais" no histórico |
| 299 | A tela (/admin/tipos), na ordem "Tipos da lista", "Novo … | igual, em `docs/visual.md`, "Tipos: paleta e ícones" |
| 300 | A página do sistema mostra as cores novas das … | igual, em `docs/visual.md`, "Tipos: paleta e ícones" |
| 301 | O acervo de exemplo tem três tipos a mais … | igual, em `docs/visual.md`, "Tipos: paleta e ícones" |
| 305 | /sistema é a referência do projeto para o Gui, … | igual, em `docs/visual.md`, "A página do sistema fica" |
| 307 | Na produção e na homologação, só os administradores abrem … | igual, em `docs/visual.md`, "A página do sistema fica" |
| 308 | Mostra o sistema com conteúdo fixo da própria página, … | igual, em `docs/visual.md`, "A página do sistema fica" |
| 309 | Ela acompanha o sistema: toda peça, token ou regra … | igual, em `docs/visual.md`, "A página do sistema fica" |
| 310 | No celular, a paleta ampliada mostra duas cores por … | igual, em `docs/visual.md`, "A página do sistema fica" |
| 314 | O cartão do painel (.cartao) mora em telas/painel.css. Como … | igual, em `docs/visual.md`, "O que ficou de fora do sistema, de propósito" |
| 315 | A galeria de fotos (o <dialog> da página da … | igual, em `docs/visual.md`, "O que ficou de fora do sistema, de propósito" |
| 316 | A linha do tempo (trilhos, épocas, faixa de décadas, … | igual, em `docs/visual.md`, "O que ficou de fora do sistema, de propósito" |
| 317 | Camadas do CSS (@layer): tentadas uma vez, mudaram a … | visual.md; a tentativa no histórico, a regra no presente |
| 318 | Tocador de áudio próprio. As mensagens de áudio da … | igual, em `docs/visual.md`, "O que ficou de fora do sistema, de propósito" |
| 319 | Os efeitos da fase 4: a frase que acende … | igual, em `docs/visual.md`, "O que ficou de fora do sistema, de propósito" |
| 320 | Modo escuro. A decisão é claro, sem fundo escuro. | igual, em `docs/visual.md`, "O que ficou de fora do sistema, de propósito" |
| 324 | A ordem do CSS. O CSS da tela entra … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 325 | Safari do iPhone e peças paradas. No iOS 26, … | visual.md (a banda do Safari mora aqui); "davam" virou "dão" |
| 326 | animation e animation-timeline em regras separadas, a segunda depois … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 327 | Movimento reduzido. base.css desliga toda transição e toda animação, … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 328 | @view-transition só pode aparecer uma vez, dentro de prefers-reduced-motion: … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 329 | Animação de chegada espera a foto. Animação em CSS … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 330 | Nó reaproveitado repete a animação de chegada. Pôr um … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 331 | Campo sem contorno de foco. O campo e a … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 332 | A foto inclinada e a rolagem lateral. O recorte … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 333 | O .miolo é só padding-inline. Uma regra de tela … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 334 | Foto que só vale no computador. Só display: none … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 335 | A assinatura depende de medidas. A largura de "MEMÓRIAS" … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 336 | Fotos de exemplo no computador. No servidor local, as … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 337 | O monograma e a biblioteca de fontes. scripts/monograma.mjs usa … | docs/visual.md, "Cuidados"; "o script contorna isso para a Fraunces" virou "uma serifa variável pede um contorno no script" (a Fraunces sai na AC1) |
| 338 | Variável definida por código. O teste que procura variável … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 339 | Regex de teste com [^>]* para em qualquer > … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 340 | A guarda da produção lê os arquivos versionados. Depois … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 341 | Vídeo das trocas: o Playwright grava com recordVideo no … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 342 | Capturas em JPEG. As PNG de um grupo de … | igual, em `docs/visual.md`, "Cuidados que custaram tempo" |
| 348 | A regra de cada tela como ela é hoje. … | visual.md; citação virou link para docs/regras/ |
| 352 | O menu do celular é uma sanfona. O retrato … | igual, em `docs/visual.md`, "Topo e menu" |
| 353 | A faixa de teste do alto (telas e "Ver … | igual, em `docs/visual.md`, "Topo e menu" |
| 357 | src/pages/index.astro, telas/painel.css; os cartões de contar e do relato … | igual, em `docs/visual.md`, "Início" |
| 359 | Primeira visita: só a carta na tela. | igual, em `docs/visual.md`, "Início" |
| 360 | A abertura tem "Só você vê esta página" (sem … | igual, em `docs/visual.md`, "Início" |
| 361 | A mesa, no computador, fica à direita da abertura. … | igual, em `docs/visual.md`, "Início" |
| 362 | Os cartões, nesta ordem: contar, "Neste dia", aniversários ("Próximos … | igual, em `docs/visual.md`, "Início" |
| 363 | O cartão de contar muda de arranjo pela largura … | igual, em `docs/visual.md`, "Início" |
| 364 | Você no acervo (proposta B do conceito da sessão … | visual.md; proposta e sessão H no histórico; marca (Gui, 18/11) |
| 365 | O relato novo diz "Relato novo" no rótulo e … | igual, em `docs/visual.md`, "Início" |
| 366 | O convite do fim é "Explorar todas as memórias", … | igual, em `docs/visual.md`, "Início" |
| 367 | Memória sem foto ganha o cartão da foto revelada, … | igual, em `docs/visual.md`, "Início" |
| 369 | Carta de Natal (src/components/Carta.astro, no alto do painel e … | igual, em `docs/visual.md`, "Início" |
| 373 | /conta, telas/conta.css (mais telas/painel.css pelo cartão). Página íntima, na … | igual, em `docs/visual.md`, "Sua conta" |
| 375 | No alto, o retrato, o nome, a linha em … | igual, em `docs/visual.md`, "Sua conta" |
| 376 | No alto, para quem administra, também o atalho "Administração", … | igual, em `docs/visual.md`, "Sua conta" |
| 377 | Composição da proposta A do conceito da sessão E … | visual.md; proposta, sessão E e "desde que..." no histórico; marca (Gui, 17/11) |
| 378 | No celular: quem é, o que criou, avisos, rascunhos, … | igual, em `docs/visual.md`, "Sua conta" |
| 379 | Administração (/admin, src/pages/admin/index.astro, também em telas/conta.css): papel sem tinta, … | igual, em `docs/visual.md`, "Sua conta" |
| 380 | O cartão da administração (proposta A do conceito da … | visual.md; proposta e sessão H no histórico; marca (Gui, 18/11) |
| 381 | Os textos da conta, da pessoa e da administração … | igual, em `docs/visual.md`, "Sua conta" |
| 385 | src/pages/explorar.astro; as partes em src/components/explorar/: Controles.astro, Linha.astro (a linha … | visual.md; "os da proposta A" no histórico; marca (Gui, 18/11) |
| 387 | Os controles: cada coisa no seu lugar (proposta A … | visual.md; proposta e sessão D no histórico; marca (Gui, 18/11) |
| 389 | Família: pílulas logo abaixo da assinatura, a --e-3 dela. … | igual, em `docs/visual.md`, "Explorar" |
| 390 | As abas (.abas): "Linha do tempo", "Mural de fotos" … | igual, em `docs/visual.md`, "Explorar" |
| 391 | Filtros: fechado, "Filtros" com o número dos ligados numa … | igual, em `docs/visual.md`, "Explorar" |
| 392 | Ordem (.ordenar): na linha de "Filtros", à direita. "Ordem" … | igual, em `docs/visual.md`, "Explorar" |
| 393 | No meio da página os controles ficam lá em … | igual, em `docs/visual.md`, "Explorar" |
| 395 | A troca sem recarregar (src/lib/cliente/explorar-troca.ts, ligada por ligarTroca(); vale … | igual, em `docs/visual.md`, "Explorar" |
| 397 | A região que troca é o <div data-explorar>, que … | igual, em `docs/visual.md`, "Explorar" |
| 398 | Identidade: data-chave em cada item (m:<id> para a memória, … | igual, em `docs/visual.md`, "Explorar" |
| 399 | A técnica é FLIP, com a Web Animations API, … | igual, em `docs/visual.md`, "Explorar" |
| 400 | A foto já carregada é levada do item antigo … | igual, em `docs/visual.md`, "Explorar" |
| 401 | A rolagem nunca muda por causa de um filtro. … | igual, em `docs/visual.md`, "Explorar" |
| 402 | O que continua aberto: os <details> dos controles são … | igual, em `docs/visual.md`, "Explorar" |
| 403 | Histórico: pushState a cada troca e scrollRestoration = 'manual' … | igual, em `docs/visual.md`, "Explorar" |
| 404 | Scripts depois da troca: o HTML que chega pelo … | igual, em `docs/visual.md`, "Explorar" |
| 405 | O foco fica na opção escolhida ou, depois de … | igual, em `docs/visual.md`, "Explorar" |
| 406 | O tamanho das fotos do mural não busca nada: … | igual, em `docs/visual.md`, "Explorar" |
| 408 | A linha do tempo | igual, em `docs/visual.md`, "Explorar" |
| 410 | Lista vertical; cada memória com a polaroid da foto-chave … | igual, em `docs/visual.md`, "Explorar" |
| 411 | Faixa de décadas: na cor da família bem diluída … | igual, em `docs/visual.md`, "Explorar" |
| 412 | O link do título tem 44 px nele mesmo, … | igual, em `docs/visual.md`, "Explorar" |
| 413 | Trilhos dos capítulos: à esquerda do fio, mais finos … | igual, em `docs/visual.md`, "Explorar" |
| 414 | Destaque do capítulo com o mouse: passar o mouse … | igual, em `docs/visual.md`, "Explorar" |
| 415 | Em "Mais antigas primeiro", a página leva ao presente … | igual, em `docs/visual.md`, "Explorar" |
| 416 | Na página da pessoa e do tema, a mesma … | igual, em `docs/visual.md`, "Explorar" |
| 418 | A época na linha do tempo. A época é … | igual, em `docs/visual.md`, "Explorar" |
| 420 | O nome fica numa aba que sai do próprio … | igual, em `docs/visual.md`, "Explorar" |
| 421 | A linha da aba não tem margem, só espaço … | igual, em `docs/visual.md`, "Explorar" |
| 422 | Épocas que se sobrepõem: onde duas valem ao mesmo … | igual, em `docs/visual.md`, "Explorar" |
| 423 | No computador, o ano diz as épocas que passam … | igual, em `docs/visual.md`, "Explorar" |
| 425 | O mural | igual, em `docs/visual.md`, "Explorar" |
| 427 | Uma superfície só: as fotos-chave como fotos reveladas, de … | igual, em `docs/visual.md`, "Explorar" |
| 428 | A década é um cartão no meio das fotos, … | igual, em `docs/visual.md`, "Explorar" |
| 429 | O ano é uma aba na primeira foto de … | igual, em `docs/visual.md`, "Explorar" |
| 430 | O título na margem: só o título da memória, … | igual, em `docs/visual.md`, "Explorar" |
| 431 | O verso, no computador: ao passar o mouse ou … | visual.md; "foi descartado" virou regra no presente |
| 432 | Quais fotos (19/11/2026): "Só as capas" (o padrão) ou … | visual.md; a data no histórico |
| 433 | O tamanho das fotos: colunas no celular, no computador … | igual, em `docs/visual.md`, "Explorar" |
| 434 | Fora da ordem do tempo, saem os cartões de … | igual, em `docs/visual.md`, "Explorar" |
| 436 | A lista (modelo do "Já rolou" da agenda da … | igual, em `docs/visual.md`, "Explorar" |
| 438 | O ano grande abre cada bloco, com tamanho de … | igual, em `docs/visual.md`, "Explorar" |
| 439 | Cada memória é uma linha, e a linha inteira … | igual, em `docs/visual.md`, "Explorar" |
| 440 | A data: dentro do bloco, o dia e o … | igual, em `docs/visual.md`, "Explorar" |
| 441 | No celular, dois andares: o título e a data … | igual, em `docs/visual.md`, "Explorar" |
| 442 | A foto-chave aparece numa margem à direita quando o … | igual, em `docs/visual.md`, "Explorar" |
| 444 | O modo TV | igual, em `docs/visual.md`, "Explorar" |
| 446 | Uma memória por vez, na tela inteira, sem o … | igual, em `docs/visual.md`, "Explorar" |
| 447 | As outras fotos ficam em volta da principal, até … | igual, em `docs/visual.md`, "Explorar" |
| 449 | A barra, a partir de 62rem (proposta A da … | docs/visual.md, "O modo TV"; proposta e sessão X no histórico; marca (Gui, 22/11) |
| 451 | A tela não rola, em nenhuma janela e com … | docs/visual.md, "A composição" (as colunas das fotos e do texto); a regra de não rolar e dos controles absolutos ficou em regras/explorar.md, "Modo TV" (D-5) |
| 452 | Tudo é proporcional à janela. No modo TV, 1rem … | docs/visual.md, igual (as medidas moram aqui; regras/explorar.md diz só o comportamento) |
| 453 | A memória longa desce na escala: o título tem … | docs/visual.md, igual |
| 454 | A barra: um cartão branco (o branco do bilhete, … | docs/visual.md, igual (o desenho da barra mora aqui; saiu de regras/explorar.md) |
| 455 | Os símbolos (Simbolo.astro e BotaoDeSimbolo.astro, ver "Sistema") no lugar … | docs/visual.md; ganhou "São peça do sistema, para a navegação usar depois", que veio de decisoes.md linha 753 |
| 456 | O nome de cada símbolo aparece escrito embaixo dele, … | docs/visual.md, igual |
| 457 | O foco é um contorno de tinta de 0,1875rem … | docs/visual.md, igual |
| 458 | "Ajustes" abre uma folha do mesmo cartão, que sobe … | docs/visual.md, igual |
| 459 | Ocultar os controles: tira a barra, o alto e … | dividida: o comportamento (teclas de mídia, Enter e Esc, o foco, o ponteiro, "Passar sozinho", a escolha que não fica guardada, sem script, "Só as fotos") em regras/explorar.md, "Modo TV", juntado com decisoes.md linha 755; o desenho do botão do canto ficou em docs/visual.md; marca (Gui, 22/11) em regras/explorar.md |
| 460 | As teclas (teclaNaTv, em src/lib/explorar.ts, com teste em testes/explorar.test.ts): | regras/explorar.md, "Modo TV" ("As teclas"); em docs/visual.md fica uma linha com o link |
| 464 | Seta para a esquerda ou para a direita, com … | regras/explorar.md, a tabela das teclas, igual |
| 465 | Seta para a esquerda ou para a direita, fora … | regras/explorar.md, a tabela das teclas, igual |
| 466 | Seta para cima e para baixo, com "Ajustes" aberto … | regras/explorar.md, a tabela das teclas, igual |
| 467 | Enter Aciona o botão ou o link com o … | regras/explorar.md, a tabela das teclas, igual |
| 468 | Espaço Aciona o botão ou o link com o … | regras/explorar.md, a tabela das teclas, igual |
| 469 | Tocar e pausar do controle (MediaPlayPause) Liga o "Passar … | regras/explorar.md, a tabela das teclas, igual |
| 470 | Próxima e anterior do controle (MediaTrackNext, MediaTrackPrevious) Memória próxima … | regras/explorar.md, a tabela das teclas, igual |
| 471 | Esc Na ordem: fecha "Ajustes"; mostra os controles escondidos; … | regras/explorar.md, a tabela das teclas, igual |
| 472 | Seta para a esquerda ou para a direita, com … | regras/explorar.md, a tabela das teclas, igual |
| 473 | Enter ou Esc, com os controles ocultos pelo botão … | regras/explorar.md, a tabela das teclas, igual |
| 474 | Qualquer tecla, em "Só as fotos" com os controles … | regras/explorar.md, a tabela das teclas, igual |
| 476 | As teclas de mídia só chegam à página quando … | regras/explorar.md, depois da tabela das teclas, igual |
| 478 | A janela deitada abaixo de 62rem (aplicação da E1, … | visual.md; "aplicação da E1, 25/11/2026" no histórico |
| 480 | O botão de som e a voz (aplicação da … | visual.md; "aplicação da E1" no histórico |
| 482 | A carta da sala (aplicação da E1, a carta … | visual.md; E1, proposta A e PR #174 no histórico; marca (Gui, 25/11) |
| 484 | "Ler tudo" na sala (correção 2 da revisão R-AB2; … | visual.md; a correção da revisão R-AB2 no histórico |
| 486 | Abaixo de 62rem, em pé, o modo TV é … | docs/visual.md: "não tem a barra"; as setas, o Esc, o toque na foto e "a tela cheia e o ocultar só existem na barra" foram para regras/explorar.md, "Modo TV" (D-5) |
| 488 | Passar sozinho (TEMPOS_DE_PASSAR): um toque liga em 10 segundos. … | igual, em `docs/visual.md`, "Explorar" |
| 489 | A passagem sem recarregar, no script de Palco.astro: busca … | igual, em `docs/visual.md`, "Explorar" |
| 490 | Sem rede, a memória da tela fica, a passagem … | igual, em `docs/visual.md`, "Explorar" |
| 491 | As três animações (MOVIMENTOS, em src/lib/explorar.ts; regras em telas/explorar.css; … | igual, em `docs/visual.md`, "Explorar" |
| 495 | Álbum A foto vem da lateral, girando um pouco, … | igual, em `docs/visual.md`, "Explorar" |
| 496 | Revelação A foto aparece clara e sem cor e … | igual, em `docs/visual.md`, "Explorar" |
| 497 | Mesa A foto é jogada na mesa, de perto … | igual, em `docs/visual.md`, "Explorar" |
| 499 | Nas três, o fundo passa de uma cor à … | igual, em `docs/visual.md`, "Explorar" |
| 500 | "Só as fotos" esconde o título, o trecho e … | igual, em `docs/visual.md`, "Explorar" |
| 501 | "Tela cheia" usa a do navegador e continua valendo … | igual, em `docs/visual.md`, "Explorar" |
| 502 | Ao acaso: "Me mostre uma memória" sorteia entre as … | igual, em `docs/visual.md`, "Explorar" |
| 504 | O que fica no endereço e o que fica … | igual, em `docs/visual.md`, "Explorar" |
| 508 | Forma de ver, família, filtros e ordem No endereço | igual, em `docs/visual.md`, "Explorar" |
| 509 | A memória da vez no modo TV (m) No … | igual, em `docs/visual.md`, "Explorar" |
| 510 | Tamanho das fotos do mural No aparelho (mural-tamanho) | igual, em `docs/visual.md`, "Explorar" |
| 511 | Quais fotos o mural mostra No endereço (fotos=todas; as … | igual, em `docs/visual.md`, "Explorar" |
| 512 | Animação do modo TV e o tempo do "Passar … | igual, em `docs/visual.md`, "Explorar" |
| 513 | "Só as fotos", no modo TV No aparelho (tv-so-fotos) | igual, em `docs/visual.md`, "Explorar" |
| 514 | Se está passando sozinho, a pausa e a tela … | igual, em `docs/visual.md`, "Explorar" |
| 516 | Sem script, os links levam tudo no endereço (tamanho, … | igual, em `docs/visual.md`, "Explorar" |
| 520 | src/pages/memorias/[id].astro, telas/memoria.css; regras em src/lib/memoria.ts, com teste em testes/qa-respostas-memoria.test.ts. | igual, em `docs/visual.md`, "Página da memória" |
| 522 | Abertura num bloco na cor do tipo: título grande, … | igual, em `docs/visual.md`, "Página da memória" |
| 523 | Ficha: parada à esquerda no computador, no alto no … | igual, em `docs/visual.md`, "Página da memória" |
| 524 | Quem estava, com os retratos e o parentesco de … | igual, em `docs/visual.md`, "Página da memória" |
| 525 | Relatos, um por pessoa, como vozes de uma conversa: … | visual.md; sessões K e L no histórico; marca (Gui, 18/11); citação virou link para regras/relatos.md |
| 526 | Parede de fotos: todas como fotos reveladas, um pouco … | igual, em `docs/visual.md`, "Página da memória" |
| 527 | Fim: o convite para escrever, um bilhete em branco … | visual.md; citação virou link para regras/formularios.md |
| 529 | A ação principal fica também no alto, como atalho, … | igual, em `docs/visual.md`, "Página da memória" |
| 531 | Galeria: tocar em qualquer foto (da abertura, da parede … | igual, em `docs/visual.md`, "Página da memória" |
| 535 | telas/pessoa.css, src/components/pessoa/VidaPorIdade.astro. O verbete (proposta A do conceito da … | visual.md; proposta e sessão L no histórico; marca (Gui, 18/11); citação virou link para regras/pessoa.md |
| 537 | No computador: a abertura, "Nas palavras de" e a … | igual, em `docs/visual.md`, "Página da pessoa" |
| 538 | A abertura: o carimbo, o parentesco em --t-titulo-1 (ou … | igual, em `docs/visual.md`, "Página da pessoa" |
| 539 | O quadro, como o painel da árvore: um cartão … | igual, em `docs/visual.md`, "Página da pessoa" |
| 540 | Dados: o nascimento e o falecimento em serifa, grandes, … | igual, em `docs/visual.md`, "Página da pessoa" |
| 541 | Na árvore: um pedaço da árvore, centrado: os pais … | igual, em `docs/visual.md`, "Página da pessoa" |
| 542 | A cor da família, com medida (pedido do Gui … | visual.md; "ao escolher" e "aprovada depois de ver" no histórico; marca (Gui, 18/11) |
| 543 | Nas palavras de: cada relato com a memória de … | igual, em `docs/visual.md`, "Página da pessoa" |
| 544 | A vida pela idade: cada idade é um título … | igual, em `docs/visual.md`, "Página da pessoa" |
| 545 | "Família e laços", no fim, em colunas (duas a … | igual, em `docs/visual.md`, "Página da pessoa" |
| 549 | telas/pessoas.css. Proposta B do conceito da sessão E ("Índice … | visual.md; proposta, sessão E e "com dois ajustes" no histórico; marca (Gui, 17/11) |
| 551 | Celular: só a busca fica à vista. O controle … | igual, em `docs/visual.md`, "Pessoas" |
| 552 | Computador: o alto vira o índice, na coluna da … | igual, em `docs/visual.md`, "Pessoas" |
| 553 | Famílias: a peça Pílula de família, uma por vez, … | igual, em `docs/visual.md`, "Pessoas" |
| 554 | Cada família é uma faixa na cor dela (details), … | igual, em `docs/visual.md`, "Pessoas" |
| 558 | telas/capitulo.css; a linha de um capítulo é src/components/capitulos/Entrada.astro; testes … | igual, em `docs/visual.md`, "Capítulos, capítulo e tema" |
| 560 | A cor do capítulo fora da linha do tempo: … | igual, em `docs/visual.md`, "Capítulos, capítulo e tema" |
| 561 | Lista (/capitulos): um sumário de livro, do mais antigo … | igual, em `docs/visual.md`, "Capítulos, capítulo e tema" |
| 562 | Capítulo (/capitulos/<id>): abertura de capítulo de livro. A capa: … | igual, em `docs/visual.md`, "Capítulos, capítulo e tema" |
| 563 | Quem aparece: na tela grande, as seis pessoas que … | igual, em `docs/visual.md`, "Capítulos, capítulo e tema" |
| 564 | Forma de ver, no capítulo: "Linha do tempo" (os … | igual, em `docs/visual.md`, "Capítulos, capítulo e tema" |
| 565 | Os marcos numerados: cada memória é um marco: o … | igual, em `docs/visual.md`, "Capítulos, capítulo e tema" |
| 566 | A cor da tela vem das famílias do capítulo … | igual, em `docs/visual.md`, "Capítulos, capítulo e tema" |
| 567 | Tema (/temas/<id>): "Tema", o nome grande, "Todos os capítulos … | igual, em `docs/visual.md`, "Capítulos, capítulo e tema" |
| 571 | /lacos/<a>/<b>, src/pages/lacos/[a]/[b].astro, telas/laco.css (mais telas/capitulo.css, pelos marcos); regras em … | visual.md; citação virou link para regras/integrantes.md |
| 573 | A ideia: a história dos dois, contada como um … | visual.md; "A régua da primeira rodada saiu" virou regra no presente |
| 574 | A capa: "Laço" em rótulo, os dois retratos lado … | igual, em `docs/visual.md`, "Página do laço" |
| 575 | No tempo: as fases do casal na peça Sanfona, … | igual, em `docs/visual.md`, "Página do laço" |
| 576 | As memórias dos dois: os marcos numerados do capítulo … | igual, em `docs/visual.md`, "Página do laço" |
| 577 | Tela grande: a mesma divisão de 5 e 6 … | igual, em `docs/visual.md`, "Página do laço" |
| 578 | A cor da tela vem das famílias das duas … | igual, em `docs/visual.md`, "Página do laço" |
| 582 | O comportamento, o quadro do mapa e o cartão … | visual.md; citação virou links para regras/arvore.md e regras/circulo.md |
| 584 | telas/arvore.css, telas/mapa.css (o quadro: .quadro na página e .pm … | igual, em `docs/visual.md`, "Árvore e círculo" |
| 585 | As cores das famílias na árvore são as dos … | igual, em `docs/visual.md`, "Árvore e círculo" |
| 586 | O painel é um cartão branco pousado no mapa, … | igual, em `docs/visual.md`, "Árvore e círculo" |
| 587 | A busca de "Partir de" tem o estilo do … | igual, em `docs/visual.md`, "Árvore e círculo" |
| 588 | O círculo usa o mesmo quadro: .quadro, um <aside … | igual, em `docs/visual.md`, "Árvore e círculo" |
| 592 | A base, para todas as telas de formulário | igual, em `docs/visual.md`, "Formulários" |
| 594 | A página: src/components/formularios/Pagina.astro: <Pagina titulo="…" rotulo="…" nucleos={…} secao="…">, com … | igual, em `docs/visual.md`, "Formulários" |
| 595 | O estilo: src/visual/telas/formulario.css, um arquivo só, dentro de .pagina-de-formulario. … | igual, em `docs/visual.md`, "Formulários" |
| 596 | O que o script esconde fica escondido: .pagina-de-formulario [hidden] … | igual, em `docs/visual.md`, "Formulários" |
| 597 | A pergunta é a legenda de cada parte (legend), … | igual, em `docs/visual.md`, "Formulários" |
| 598 | A trilha das etapas (ol.etapas, criada por etapas.ts) é … | igual, em `docs/visual.md`, "Formulários" |
| 599 | Ações: o botão cheio é a ação principal; botao--leve … | igual, em `docs/visual.md`, "Formulários" |
| 600 | Estados: pressionado (a opção e os passos do ano … | igual, em `docs/visual.md`, "Formulários" |
| 601 | A opção marcada fica no pastel da tela (o … | igual, em `docs/visual.md`, "Formulários" |
| 602 | A busca de pessoa tem o estilo geral (.pagina-de-formulario … | igual, em `docs/visual.md`, "Formulários" |
| 603 | O slider de proximidade (CampoProximidade.astro, .campo-proximidade): o mesmo da … | igual, em `docs/visual.md`, "Formulários" |
| 605 | Nova memória (/nova): a frase é a trilha (proposta … | visual.md; proposta e sessão D no histórico; marca (Gui, 18/11) |
| 607 | As sete etapas, cada uma com a pergunta grande. … | igual, em `docs/visual.md`, "Formulários" |
| 608 | O alto (.em-frase__alto, fora do formulário): o h1 em … | igual, em `docs/visual.md`, "Formulários" |
| 609 | A data por toque (.grade-data): "O ano" com a … | igual, em `docs/visual.md`, "Formulários" |
| 610 | "Confira antes de publicar" é o cartão branco do … | igual, em `docs/visual.md`, "Formulários" |
| 611 | "Quem pode ver?": o seletor segmentado, com a explicação … | igual, em `docs/visual.md`, "Formulários" |
| 612 | Fotos: cada foto como uma foto revelada pequena, com … | igual, em `docs/visual.md`, "Formulários" |
| 614 | Nenhum formulário tem o resumo ao lado: na nova … | igual, em `docs/visual.md`, "Formulários" |
| 616 | Relato (/memorias/<id>/relato): a janela da conversa (conversa/Janela.astro, ver "Relato … | visual.md; citação virou link para regras/relatos.md |
| 618 | Capítulo (/capitulos/novo e /capitulos/<id>/editar): as etapas "Que capítulo é … | igual, em `docs/visual.md`, "Formulários" |
| 620 | Nova pessoa, ficha e retrato: /pessoas/nova e FichaDoIntegrante.astro. O … | igual, em `docs/visual.md`, "Formulários" |
| 622 | Editar página e laços (/pessoas/<id>/editar): proposta A do conceito … | visual.md; proposta e sessão E no histórico; marca (Gui, 18/11) |
| 624 | Utilitárias, silenciosas: o histórico da memória, as confirmações de … | igual, em `docs/visual.md`, "Formulários" |
| 626 | Administração: tipos de momento (ver "Tipos: paleta e ícones"), … | igual, em `docs/visual.md`, "Formulários" |
| 632 | Nada anotado no momento. A página do laço, que … | visual.md; "A página do laço, que estava aqui, foi feita" no histórico |
| 638 | Da fase 4 (movimento e detalhes) | igual, em `docs/visual.md`, "O que falta" |
| 640 | A frase que acende palavra por palavra, a foto … | docs/visual.md, "O que falta", "Da fase 4"; o tocador de áudio próprio saiu da lista, porque já existe (conversa/Mensagem.astro, em "O que ficou de fora do sistema, de propósito"), como na fila do decisoes.md (C-6, revisão R-AC2) |
| 642 | Da fase 5 (QA visual no aparelho) | igual, em `docs/visual.md`, "O que falta" |
| 644 | No iPhone de verdade: os controles do Explorar (as … | igual, em `docs/visual.md`, "O que falta" |
| 645 | Numa TV de verdade, com controle: o modo TV … | igual, em `docs/visual.md`, "O que falta" |
| 646 | Na homologação, com o espelho da produção: a árvore, … | igual, em `docs/visual.md`, "O que falta" |
| 647 | Com alguém mais velho: a aba do ano no … | igual, em `docs/visual.md`, "O que falta" |
| 648 | O que nenhuma tela mostrou ainda: o envio de … | igual, em `docs/visual.md`, "O que falta" |
| 649 | Na pinça, o ponto entre os dedos desvia alguns … | igual, em `docs/visual.md`, "O que falta" |
| 651 | Limpeza | igual, em `docs/visual.md`, "O que falta" |
| 653 | Separar os testes das telas do describe('conceito'), em testes/visual.test.ts. | igual, em `docs/visual.md`, "O que falta" |
| 654 | Refazer as capturas da árvore em docs/visual/fase-3/familia/ (mostram o … | igual, em `docs/visual.md`, "O que falta" |

## CLAUDE.md

| Linha | A regra (começo) | Para onde foi |
| --- | --- | --- |
| 3 | Instruções para qualquer sessão de trabalho neste repositório. O … | CLAUDE.md, igual |
| 5 | Leia também docs/decisoes.md (as regras combinadas e o que … | juntada com CLAUDE.md, "Quem lê o quê" (o último item lista os outros documentos) |
| 9 | docs/decisoes.md e docs/visual.md trazem só as regras em vigor. … | CLAUDE.md, "Quem lê o quê", reescrita para a divisão em docs/regras/ (pedido do prompt da AC2, item 6); o texto antigo no histórico, "CLAUDE.md" |
| 11 | Sessão de construção lê os enxutos. Abre o histórico … | CLAUDE.md, "Quem lê o quê": lê o CLAUDE.md, o índice e a fila e os arquivos de docs/regras/ do assunto, mais docs/visual.md quando mexe em tela; o "abre o histórico quando..." ficou igual |
| 12 | Sessão de QA lê tudo, inclusive o histórico. | CLAUDE.md, "Quem lê o quê", e docs/qa.md |
| 13 | Decisão nova entra no enxuto, na seção do assunto, … | CLAUDE.md, "Quem lê o quê": entra no arquivo do assunto em docs/regras/, com a marca (Gui, dd/mm) e a origem no histórico |
| 17 | Divisão do trabalho (decisão do Gui, 15/11/2026): | CLAUDE.md, igual; marca (Gui, 15/11) |
| 18 | No chat (claude.ai, projeto "Gestão de projetos"), o Gui … | CLAUDE.md, igual |
| 19 | O código é feito principalmente no Claude Code: tanto … | CLAUDE.md, igual |
| 20 | A ponte entre os dois é a documentação. O … | CLAUDE.md; "na seção do assunto" virou "no arquivo do assunto"; marca (Gui, 18/11) no lugar de "(decisão do Gui, 18/11/2026, trazida do bayara.design)" |
| 21 | A estrutura completa (integrantes, laços, núcleos, memórias, capítulos, visibilidade, … | CLAUDE.md; "vale junto com docs/decisoes.md" virou "com docs/regras/" |
| 22 | A Giovanna e o Magno não usam o Claude. … | CLAUDE.md, igual |
| 23 | Prazo: Natal de 2026, quando o site é dado … | CLAUDE.md, igual |
| 24 | Quando o trabalho fica em andamento e o Gui … | CLAUDE.md, igual |
| 25 | Repensar a interface em vez de forçar uma decisão … | CLAUDE.md; marca (Gui, 22/11); "O caso que deu origem à regra (PR #157)" no histórico |
| 29 | My Drive/Pessoal/0_site_memorias é o ponto de apoio do projeto, … | docs/drive.md, igual; no CLAUDE.md, uma linha em "Como o trabalho acontece" |
| 31 | 0_Caixa de entrada: o que ainda não tem lugar. | docs/drive.md, igual |
| 32 | 1_Documentos: documentos de trabalho, como a cópia do documento … | docs/drive.md, igual |
| 33 | 2_Material para o acervo: fotos, áudios, textos e documentos … | docs/drive.md, igual |
| 34 | 3_Referências visuais: referências para a direção visual. | docs/drive.md, igual |
| 35 | 4_Natal 2026: o plano do presente. | docs/drive.md, igual |
| 36 | 9_Substituídos: o que saiu de uso. Nada se apaga. | docs/drive.md, igual |
| 37 | Acervo Bayara Nascimento, cópias: a cópia mensal do banco, … | docs/drive.md, igual |
| 39 | Nada desta pasta entra no repositório. A exceção são … | docs/drive.md, com o link para regras/exemplos.md; no CLAUDE.md, a linha do Drive |
| 43 | Abrir os sites que precisar, sem pedir. | CLAUDE.md, igual |
| 44 | Configurar o Cloudflare pelo navegador, inclusive as variáveis do … | CLAUDE.md, igual |
| 45 | Apagar no GitHub as branches já incorporadas. | CLAUDE.md, com o link para docs/sessoes.md (o como) |
| 46 | Quando precisar que ele faça ou aprove algo (login, … | CLAUDE.md, igual |
| 52 | main memorias.bayara.com.br Banco e fotos reais (bayara-memorias) Cloudflare Access, … | CLAUDE.md, a tabela, igual |
| 53 | homologa homologa.memorias.bayara.com.br Banco e bucket bayara-memorias-homologa: a família de … | CLAUDE.md, a tabela; "(nomes, retratos e laços)" corrigido pelo código para "o espelho da produção (a família de verdade, com memórias de exemplo)"; o login juntado com o de docs/publicar.md (aplicação e política do Access, troca de pessoa) |
| 54 | tst-<assunto> e as demais <branch>.memorias.bayara.com.br Banco e bucket bayara-memorias-teste, … | CLAUDE.md, a tabela; juntada com a linha da prévia de docs/publicar.md (troca de pessoa); a linha do computador veio de docs/publicar.md |
| 56 | main é a produção. Cada push publica sozinho, com … | CLAUDE.md, igual |
| 57 | homologa é a homologação: o ensaio da publicação. Ela … | CLAUDE.md, igual |
| 58 | tst-<assunto> é um teste: um experimento ou uma comparação … | CLAUDE.md; "(ou da main, enquanto a homologa não existir)" no histórico |
| 59 | O caminho de uma mudança: tst-<assunto> → PR com … | CLAUDE.md, igual, com "Depois do merge, apague a branch de teste" (da linha 61) |
| 60 | Mudança só de documentação ou de regras de trabalho … | saiu (contradição C-2); vale a linha 62, decisão do Gui de 26/11 (pergunta 6 da auditoria); no histórico |
| 61 | Depois do merge, apague a branch de teste. As … | a frase ficou no CLAUDE.md (linha 59); o como (página Branches, fetch DELETE) foi para docs/sessoes.md |
| 62 | A homologa vai para a main em rodadas, quando … | CLAUDE.md; marca (Gui, 18/11) e (Gui, 26/11); "antes disso, de 16 a 18/11..." e "A primeira rodada levou..." no histórico |
| 63 | A antiga prévia formulario, que a Giovanna usava antes … | histórico, inteira (processo vencido) |
| 67 | A homologação usa a família de verdade (decisão do … | docs/copia-no-drive.md, "O espelho da produção"; no CLAUDE.md, duas linhas em "Branches e publicação"; "(sessão D1e, 23/11/2026)" no histórico; o que passa coluna por coluna ficou só em "Espelho da produção" (juntada com decisoes.md linha 65) |
| 69 | A transformação está em src/lib/espelho.ts, testada em testes/espelho.test.ts: nada … | docs/copia-no-drive.md, "O espelho da produção", igual |
| 70 | A cópia para o espelho está em src/lib/copia-para-o-espelho.ts (a … | docs/copia-no-drive.md, "O espelho da produção", igual |
| 71 | O espelho é gravado direto no banco e no … | docs/copia-no-drive.md, "O espelho da produção", corrigida pelo código (C-1): o espelho não grava em bucket e a cópia para o espelho não lê o bucket; no CLAUDE.md, "O que nunca fazer" (a produção gravando na homologação) |
| 72 | A faixa do alto da homologação é listrada e … | CLAUDE.md, "Branches e publicação" ("listrada, para ninguém confundir"); o texto exato da faixa em docs/copia-no-drive.md, "Espelho da produção" (decisoes.md linha 65, que é o que o código mostra) |
| 73 | A escolha do banco é feita pelo endereço do … | docs/copia-no-drive.md, "O espelho da produção", igual |
| 74 | A homologação nunca recebe o acervo de exemplo. Só … | docs/copia-no-drive.md, "O espelho da produção", igual; o "nunca" repetido em CLAUDE.md, "O que nunca fazer" |
| 78 | Traga a main para a branch. | CLAUDE.md, igual |
| 79 | npm run build sem erro. Ele roda antes a … | CLAUDE.md, igual |
| 80 | A homologação publicada com a mudança, com a marca … | CLAUDE.md, igual |
| 81 | A aprovação do Gui na homologação. | CLAUDE.md, igual |
| 85 | Mexer na produção por fora do site: nada de … | CLAUDE.md, igual |
| 86 | Pôr e-mail de verdade no repositório, em commit, em … | CLAUDE.md, igual |
| 87 | Pedir, ver ou guardar o Client Secret do token … | CLAUDE.md, igual |
| 88 | Digitar senha em qualquer lugar. | CLAUDE.md, igual |
| 89 | Fazer as memórias de exemplo rodarem na produção. | CLAUDE.md, com a homologação junto (linha 74) |
| 90 | Mudar quem vê o quê sem o Gui decidir. … | CLAUDE.md; "estão em docs/decisoes.md" virou "em docs/regras/" |
| 94 | A estrutura do banco muda pela lista MIGRACOES em … | CLAUDE.md, igual; docs/publicar.md, "Mudar a estrutura do banco", passou a apontar para cá (juntada) |
| 95 | Uma migração já publicada nunca é editada. Mudança nova … | CLAUDE.md, igual, repetida em "O que nunca fazer" |
| 96 | O SQLite não altera um CHECK no lugar: a … | CLAUDE.md, igual |
| 97 | Os exemplos ficam em src/lib/servidor/semente.ts. O banco de teste … | CLAUDE.md, igual |
| 101 | O plano gratuito do GitHub não protege branches de … | regras/conferencias.md, abertura, igual |
| 103 | npm run confere (scripts/confere-producao.mjs), a guarda da produção. Falha … | regras/conferencias.md, "A guarda da produção", em itens, com as regras 8 e 9 que faltavam; "desde a revisão D1f" e "de antes" no histórico; no CLAUDE.md, uma linha |
| 104 | npm test: os testes em testes/, das regras de … | regras/conferencias.md, "Os testes", descrito pelo que é hoje; o item de esquema-da-copia.test.ts igual; no CLAUDE.md, uma linha |
| 105 | npm run gestalt (scripts/confere-gestalt.mjs), a gestalt que se confere … | regras/conferencias.md, "As conferências com o servidor local"; no CLAUDE.md, uma linha |
| 106 | Desempenho, à mão e fora do build, com o … | regras/conferencias.md, "As conferências com o servidor local"; no CLAUDE.md, uma linha; npm run tv entrou junto |
| 107 | npm run build roda os dois primeiros antes do … | CLAUDE.md e regras/conferencias.md, "O build e o GitHub" |
| 108 | No GitHub, .github/workflows/confere.yml roda só a gestalt, e só … | regras/conferencias.md, "O build e o GitHub", igual; o motivo em regras/infraestrutura.md, "GitHub Actions enxuto"; no CLAUDE.md, uma linha com (Gui, 20/11) |
| 109 | Toda rota que grava ganha um caso em testes/pedido-recusado.test.ts … | CLAUDE.md; "(proposta do QA de 23/11/2026, aceita pelo Gui em 22/11/2026)" virou (Gui, 22/11); também em regras/conferencias.md |
| 111 | Regra nova que nasce de um achado vira teste … | CLAUDE.md, igual |
| 115 | Sem travessão, sem a construção "não é x, é … | CLAUDE.md, igual |
| 116 | Texto que o Gui escreveu fica como ele escreveu, … | CLAUDE.md, igual |
| 117 | Os textos do site falam com quem está usando, … | CLAUDE.md, igual |
| 118 | O texto que o site mostra (recados, dicas, títulos) … | CLAUDE.md; marca (Gui, 23/11) |
| 122 | A direção visual foi definida em 16/11/2026 e está … | juntada com docs/visual.md, "A direção"; no CLAUDE.md, a primeira linha de "Visual" |
| 123 | Movimento: a rolagem é sempre a do aparelho e … | CLAUDE.md, "Visual", igual |
| 124 | A revisão visual foi do zero (o relato das … | histórico (processo); "Tela nova usa src/layouts/Visual.astro ou Pagina.astro" ficou no CLAUDE.md, "Visual"; "Na main, o estilo antigo continua no ar" saiu (C-4) |
| 125 | O sistema visual (fase 2) está em src/visual/ e … | juntada com docs/visual.md, "Sistema"; a regra do valor solto (testes/sistema.test.ts e visual.test.ts) ficou no CLAUDE.md, "Visual" |
| 126 | O monograma e os ícones do site são gerados … | juntada com docs/visual.md, "Monograma" |
| 127 | Celular primeiro, desktop de destaque: cada tela nasce em … | CLAUDE.md, igual |
| 128 | Toda mudança visual é conferida em 390, 1280 e … | CLAUDE.md, igual |
| 129 | Proximidade (pedido do Gui, 18/11/2026): gestalt faz parte de … | CLAUDE.md, "Visual"; "bem maior" virou "pelo menos o dobro" (a formulação de docs/visual.md e da gestalt); marca (Gui, 18/11); juntada com docs/visual.md, "Gestalt em toda tela" |
| 133 | As regras de arranjo e de linhas estão em … | CLAUDE.md, "Árvore"; docs/decisoes.md virou docs/regras/arvore.md |
| 134 | O que é travado e o que não é … | CLAUDE.md, "Árvore", igual; marca (Gui, 17/11) |
| 135 | testes/dados/arvore-previa.json é uma cópia dos dados da prévia como … | regras/arvore.md, "Como trabalhar na árvore", igual |
| 136 | A montagem fica em src/lib/arvore-montagem.ts (sem tela, testável) e … | regras/arvore.md, "Como trabalhar na árvore", igual |
| 137 | A árvore abre na linha direta de quem os … | juntada com regras/arvore.md, "Os centros da árvore", que já tinha o mesmo texto |
| 138 | O Gui desenha os ajustes no Figma, no time … | regras/arvore.md, "Como trabalhar na árvore"; "em docs/decisoes.md" virou "neste arquivo" |
| 139 | Nas linhas, curva mostra direção e bifurcação, e ângulo … | regras/arvore.md, "Linhas", primeiro item: a curva e o ângulo reto já estavam lá, e "Linhas que andam juntas são desenhadas uma vez só, para o tracejado não virar linha cheia" entrou como regra geral ao lado deles (revisão R-AC2); antes ela só aparecia no item dos troncos dos laços do coração |
| 143 | Formato que o Gui escolheu (18/11/2026): além do relatório, … | CLAUDE.md; "(18/11/2026)" virou "(18/11)" |
| 147 | Vale para sessões abertas só para conferir o site. … | docs/qa.md, abertura; "lê tudo" ganhou a lista do que é tudo |
| 151 | O QA confere a homologa com o acervo de … | docs/qa.md, igual |
| 152 | Depois, o Gui olha a homologação com o espelho … | docs/qa.md, igual |
| 153 | Com os dois níveis certos, a homologa vai para … | docs/qa.md, igual |
| 155 | Uma sessão de QA por chat: cada rodada começa … | docs/qa.md, igual |
| 159 | A branch testada é a homologa, salvo outra indicação: … | docs/qa.md, igual |
| 160 | A sessão trabalha numa branch qa-AAAA-MM-DD nascida da branch … | docs/qa.md, igual |
| 161 | A sessão nunca faz push nem merge na main, … | docs/qa.md, igual; o "nunca" repetido no CLAUDE.md, "O que nunca fazer" |
| 162 | Correção grande ou arriscada vai para uma branch qa-<assunto> … | docs/qa.md, igual |
| 163 | Tudo é conferido com o acervo de exemplo: localmente, … | docs/qa.md, igual; o "nunca na produção" repetido no CLAUDE.md |
| 164 | O espelho troca todo o banco local pelo espelho. … | docs/qa.md, igual |
| 168 | Antes de começar: trazer a branch testada e rodar … | docs/qa.md, igual |
| 169 | Antes de cada push: npm run build sem erro. | docs/qa.md, igual |
| 170 | O tsc acusa erros de tipo antigos no servidor … | docs/qa.md, igual |
| 174 | QA corrige defeito: algo quebrado, erro de build, comportamento … | docs/qa.md; "combinado em docs/decisoes.md" virou "em docs/regras/" |
| 176 | O QA continua sem mudar sozinho o que é … | docs/qa.md; "em Como o trabalho acontece" virou "no CLAUDE.md" |
| 178 | As pendências conhecidas estão em "Em aberto" e nas … | docs/qa.md; "e nas questões de docs/decisoes.md" virou ""Decidido, a construir" e "Em aberto", em docs/decisoes.md" |
| 182 | Toda sessão de QA termina com um relatório curto, … | docs/qa.md, igual |
| 184 | O que foi conferido. | docs/qa.md, igual |
| 185 | O que foi corrigido, com o commit e a … | docs/qa.md, igual |
| 186 | O que foi encontrado e ficou para o Gui … | docs/qa.md, igual |
| 187 | O que não deu para conferir e por quê, … | docs/qa.md, igual |
| 189 | Quando um achado merece virar regra permanente, o relatório … | docs/qa.md; "ver Conferências" virou o link para regras/conferencias.md |
| 193 | Aberta só quando o Gui pedir, não é recorrente. … | docs/qa-ux.md (o procedimento, já estava lá); no CLAUDE.md, uma linha que parte do visual que existe (D-2); o texto antigo no histórico |
| 197 | O GraphQL do GitHub não funciona nas sessões: use … | docs/sessoes.md, igual |
| 198 | Para saber se a prévia publicou: gh api repos/guilhermebayara/Bayaranascimento/commits/<sha>/check-runs. | docs/sessoes.md, igual |
| 199 | Mudança na aba Previews do Cloudflare só vale para … | juntada com docs/publicar.md ("Apply to existing Previews"), que já tinha; docs/sessoes.md aponta para lá |
| 200 | O servidor local (npm run dev) para entre uma … | docs/sessoes.md, igual |
| 201 | No computador, a página "Espelho da produção" também aparece, … | docs/sessoes.md e docs/copia-no-drive.md, "O espelho da produção", igual |
| 202 | As prévias leem a mesma configuração do wrangler.jsonc, no … | docs/sessoes.md, igual |
| 203 | O clone das sessões é raso e só traz … | docs/sessoes.md, igual |
| 204 | Merge de PR pela API: gh api -X PUT … | docs/sessoes.md, igual |
| 205 | Banda do Safari no iPhone (iOS 26): um elemento … | juntada com docs/visual.md, "Cuidados que custaram tempo" ("Safari do iPhone e peças paradas"), que já tinha o mesmo; docs/sessoes.md aponta para lá |
| 206 | O Playwright vem instalado globalmente: rode os scripts com … | docs/sessoes.md, igual |
| 207 | Para ver uma prévia como o Gui vê, use … | docs/sessoes.md, igual |
