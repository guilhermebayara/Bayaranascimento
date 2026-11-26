# Quem pode o quê

## Quem pode o quê

| Ação | Quem |
|---|---|
| Criar memória, capítulo ou tema | Qualquer pessoa com acesso. Uma época, só os admins |
| Editar um capítulo | Quem criou e os admins, desde que vejam o capítulo. Uma época, só os admins, inclusive para transformar um capítulo em época |
| Corrigir a ficha da memória | Quem criou e as pessoas citadas nela, desde que vejam a memória. Os admins corrigem só os dados (data, lugar, tipo, quem estava, capítulos e temas) de uma memória publicada que veem; o título, as fotos, as legendas e as famílias ficam como estão, e eles não restauram versões |
| Mudar quem pode ver uma memória ou um capítulo | Só quem criou, também quando é um admin que corrige, e só quem criou grava o público no banco. Quem é citado ainda marca núcleos numa memória aberta a todos, o que não restringe nada. Ao ampliar, cada relato que já existia espera o sim de quem o registrou, só por quem nunca o viu (ver ["Ampliar quem vê uma memória com relatos"](ampliar.md#ampliar-quem-vê-uma-memória-com-relatos)) |
| Acrescentar relato a uma memória | Qualquer pessoa que vê a memória, um relato por pessoa |
| Editar um relato | Só quem escreveu (ou quem registrou, no relato de quem não acessa o site). Os admins também não |
| Registrar relato de quem não acessa o site | Qualquer pessoa que vê a memória, creditada como "registrado por". Cada pessoa pode ter o seu rascunho, que ninguém mais vê; publicado, fica um só |
| Acrescentar foto | Qualquer pessoa que vê a memória, pelo formulário da memória (quem pode corrigi-la), pelo próprio relato ou por "Acrescentar fotos", na página da memória |
| Remover foto | Quem enviou e os admins, numa memória que veem. A foto vai para a lixeira com o nome de quem tirou, e quem enviou e quem tirou a veem no histórico e restauram |
| Editar a página de quem acessa o site | A própria pessoa e os admins |
| Editar a página de quem não acessa o site | Quem divide um núcleo com a pessoa (ou o núcleo de que ela é parente), quem a cadastrou e os admins |
| Criar ou mudar laços de árvore | Os envolvidos, quem divide um núcleo com algum deles (ou o núcleo de que ele é parente) e os admins |
| Criar ou mudar um laço do coração | O dono do laço. Os admins mudam o nome e o lugar na árvore, e removem, os laços que veem; o "só eu vejo", a proximidade e o laço privado continuam só do dono |
| Excluir memória inteira | Os admins (Gui, Giovanna e Magno), com alerta, e só o que enxergam. Quem escreve um rascunho pode descartá-lo |

A regra em código está em `src/lib/servidor/permissoes.ts`, com testes em `testes/` (o que os admins podem, linha a linha, em `testes/administradores.test.ts`).

**Quem vê o quê mora num ponto só** (sessão AC3, 26/11/2026): `src/lib/servidor/quem-ve.ts`. Cada regra vem em par, o predicado em TS e o fragmento SQL lado a lado: a memória (`veMemoria` e `sqlVeMemoria`, com a lixeira e o "só publicada"), o público e os núcleos (`alcanca`, que vale também para o capítulo, o casal com famílias e o pedido de relato), o casal aberto, o relato que espera (`relatoEspera`, `estaNoPublicoDoRelato`), ver o relato (`veORelato`), o relato à vista (`relatoAberto`), o relato na TV (`relatoNaTv`), a entrada na sala (`entraNaSala`), a conta de quem quem olha não vê (`quemNaoVe`, a mesma da árvore) e a memória para quem olha (`paraOLeitor`, para a lista leve da D2). `permissoes.ts`, `src/lib/sala.ts`, `src/lib/capitulos.ts`, `src/lib/parentesco.ts` e `pedido-do-relato.ts` apontam para ele com os nomes de antes, e `repositorio.ts` usa os fragmentos SQL, sem escrever a regra de novo. `testes/quem-ve-equivalencia.test.ts` prende as duas línguas: sobre o banco de verdade, com o acervo de exemplo, os casos escondidos de `testes/apoio/casos-escondidos.ts` e os de borda, compara para cada leitor, nos dois sentidos, o que o SQL devolve e o que o TS aceita, em todas as memórias, relatos e fotos, e recusa as formas conhecidas da regra em SQL (`memoria_nucleos mn`, `nucleo_membros nm`, `so_para_nucleos IS`, `visibilidade = 'todos'`) em `repositorio.ts` fora de uma lista curta de gravações (e na busca da E2, quando ela existir). Consulta nova que precise de uma destas regras usa o fragmento de lá.

- **A lista de famílias vazia espera o sim** (Gui, 26/11). Um relato com `so_para_nucleos` em `'[]'` espera, como qualquer outra lista: fica só com quem o registrou até o sim, não vai à TV e recebe o pedido para liberar. Acontece com quem não é membro de família nenhuma e escreve, com a página de antes, numa memória que já teve mais de um público. "Sem espera" é sempre `NULL` no banco (`gravarEspera`), nunca `'[]'` nem `''`; o valor `''`, que o site não grava, é lido como sem espera. Os relatos que já existiam com `'[]'` continuam esperando, sem migração. Testes em `testes/quem-ve-casos.test.ts`.
- **O laço aberto com quem está na lixeira não conta** para "só você vê" (V-1 da auditoria AC, 26/11/2026; ver ["Memória com alguém que só você vê"](integrantes.md)): para a família, a pessoa da lixeira some, e o laço com ela também. Teste em `testes/quem-ve-casos.test.ts`.
- **O "Ver como" não existe na produção**: `/como/<id>` responde como um endereço que não existe, sem cookie, e o cookie de antes não vale (teste em `testes/quem-ve-casos.test.ts`).

**Administradores.** Há administradores em cada família (hoje Gui, Giovanna e Magno), para arrumar o acervo sem transformar cada correção numa tarefa para outra pessoa.

- O administrador nunca edita o que não enxerga. Ser administrador não faz ninguém ver memória, rascunho, laço ou pessoa que não via; os laços do coração "só eu vejo" continuam só do dono.
- Nunca edita o que outra pessoa escreveu: o relato continua de quem escreveu ou registrou.
- Na memória, só os dados (`alcanceDaCorrecao` e `mudancaDeConteudo`): numa memória publicada que vê e em que não está, corrige data, lugar, tipo de momento, quem estava, capítulos e temas. O título, as famílias, as fotos com as legendas, a ordem e a foto da linha do tempo ficam como estão, e a tela mostra isso travado. A rota grava as fotos como estão no banco, sem as que ele tirou, qualquer que seja a lista mandada (`fotosMostradas` com só uma parte das fotos, por pedido forjado ou pela página aberta antes de quem criou trocar a principal; teste em `testes/z-correcoes.test.ts`). Pode tirar uma foto, mas não acrescentar pelo formulário (para isso, "Acrescentar fotos" ou o próprio relato). Restaurar uma versão traz o título de volta, então fica com quem criou e com quem está na memória.
- Foto tirada por um administrador: quem tirou também restaura, além de quem enviou; os outros administradores, não (`podeRestaurarFoto`). No histórico, a foto aparece para os dois, e para quem tirou com "de Fulano, removida por você em".
- No laço do coração de outra pessoa, muda o nome e o lugar na árvore, e remove. Na edição da pessoa, esses laços aparecem em "Laços do coração de outras pessoas", só para os administradores.
- Histórico com o nome de quem fez: a ficha da pessoa, os laços de árvore e o laço do coração (versões `laco-coracao`, ao mudar e ao remover) guardam a versão de antes com o autor, e a foto removida guarda quem tirou (`fotos.removida_por`). No histórico da memória, quem enviou vê "removida por Fulano"; a correção dos dados aparece como "Fulano alterou".
- **O Magno** é administrador como o Gui e a Giovanna, usa a homologação, alimenta o acervo antes do Natal e assina a carta de Natal com os dois. É membro da família Bracarense e responde por ela. O acesso dele depende do e-mail no segredo `ACESSOS` e das políticas do Cloudflare Access da produção e da homologação, que o Gui ajusta.

Origem: [histórico, "Quem pode o quê"](../historico/decisoes-ate-2026-11-17.md#quem-pode-o-quê); ["Núcleo, parentes e laços"](../historico/decisoes-ate-2026-11-17.md#núcleo-parentes-e-laços-decisões-do-gui-15112026); [depois de 17/11](../historico/decisoes-depois-de-2026-11-17.md#quem-pode-o-quê).
