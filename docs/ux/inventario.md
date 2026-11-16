# Inventário da interface (QA de UX, 16/11/2026)

Levantamento da interface como está na `homologa` de 16/11/2026, com o acervo de exemplo. Serve de mapa para a troca de visual: o que existe, quantas vezes, onde, e o que ainda está escrito à mão. Não julga a aparência.

As capturas de referência estão em `docs/ux/capturas/`, uma por página em 390 px (`--celular`) e 1280 px (`--desktop`), vistas como Gui. Para tirar de novo: `npm run dev` e `npm run capturas -- tirar <pasta>`.

## Páginas percorridas

| Tipo | Páginas |
| --- | --- |
| Lista | Início (linha do tempo, todas e por núcleo), Pessoas, Capítulos, Tema, Rascunhos, Lixeira |
| Leitura | Memória, Pessoa (quem acessa, parente, bicho, amigo de fora), Capítulo (reunido e de época) |
| Formulário em etapas | Nova memória e Corrigir memória (6 etapas), Novo capítulo e Editar capítulo (3 etapas), Nova pessoa (2 etapas, a segunda é a edição) |
| Edição | Editar pessoa e laços, Editar capítulo (memórias do capítulo), Meu relato |
| Confirmação e histórico | Excluir memória, Histórico da memória |
| Admin | Tipos de momento, Espelho da produção |
| Mapa | Árvore |

Conferido também: "Ver como" Elizete e Lucas Magno, teclado (Tab em todas as páginas acima), movimento reduzido nas capturas e no código.

## Componentes que existem de fato

| Papel | Como é feito hoje | Usos | Onde |
| --- | --- | --- | --- |
| Botão principal | `.botao` (amarelo, 3,25 rem de altura) | 16 | formulários, relato, laços, admin |
| Botão leve | `.botao.botao--leve` (transparente, 2,75 rem) | 33 | todas as páginas com ação |
| Botão de perigo | `.botao.botao--perigo` | 2 | excluir memória, excluir capítulo |
| Ação no topo | `.topo__acao` ("Nova memória", pílula própria no menu) | 1 | cabeçalho |
| Link de ação solto | `<a>` no texto: "Histórico de alterações", "Excluir memória", "Descartar este rascunho", "Voltar para a página", "Voltar para o capítulo" | 6 | memória, rascunho, editar pessoa, editar capítulo |
| Botão do mapa | `button` sem classe de botão (zoom, "Ir ao foco", "Ver tudo", "Partir desta pessoa"), mais `.no__coracao` e `.no__ramo` | 8 tipos | árvore |
| Campo de texto | `label.campo` com `span` e `input` | 39 | formulários |
| Campo em linha | `.em-linha label` (rótulo e campo sem `.campo`) | 10 | laços na página de pessoa |
| Ano com passos | `.passo-ano` (agora `CampoAno.astro`) | 2 | memória, capítulo de época |
| Opção em pílula (rádio ou caixa) | `label.opcao` com `input` escondido e `span` | 14 | tipo de momento, pessoas, núcleos, família, pessoa ou bicho |
| Opção com explicação (aba) | `.abas` com `label.opcao` maior | 2 | tipo de laço, modo do capítulo |
| Caixa ou rádio nativo | `label.marcar` | 15 | data aproximada, "Já faleceu", "Já terminou", quem vê, camadas da árvore, memórias do capítulo |
| Filtro da linha do tempo | `.filtros button[aria-pressed]` | 1 | início, pessoa, tema |
| Etiqueta de tema | `a.etiqueta` | 1 | capítulos |
| Selo | `.selo` ("exemplo", "Capítulo de época", "Tema", "Só Bayara") | 4 | memória, capítulo, tema, cartão |
| Etiqueta de tipo | `.tipo` (ponto de cor e nome) | 4 | cartão, memória, foto, linha do tempo |
| Recado de sucesso | `.recado` | 2 | rodapé do layout, relato |
| Recado de erro | `.recado.recado--erro` | 1 | layout |
| Situação do envio | `.situacao` e `.situacao[data-tipo=erro]` | 2 | nova memória, relato |
| Alerta | `.alerta` | 2 | excluir memória, excluir capítulo |
| Confirmação depois de salvar | `.confirmacao` | 2 | memória guardada, relato publicado |
| Cartão da linha do tempo | `Cartao.astro` | 1 componente | início, pessoa, capítulo, tema |
| Cartão de lista | `.painel` e caixas brancas em lixeira e laços | 4 variações | lixeira, laços, editar capítulo, tipos |
| Lista simples | `.grupo` com título e data | 2 | rascunhos, pessoas |
| Ficha (rótulo e valor) | `.memoria__ficha` (dl) e `.resumo` (dl) | 2 | memória, resumo antes de publicar |
| Estado vazio | `.vazio` | 8 | linha do tempo, rascunhos, lixeira, histórico, capítulos, editar capítulo, árvore, tipos |
| Trilha de etapas | `.etapas` montada por `etapas.ts` | 2 formulários | memória, capítulo |
| Trilha de etapas fixa | `.etapas.etapas--fluxo` escrita à mão | 2 | nova pessoa, laços da pessoa nova |
| Parte recolhida | `details.mais` | 1 | datas e história da pessoa |
| Abertura da página | `.abertura` e `.abertura--curta` (agora `Abertura.astro` nas 15 curtas) | 18 | todas |

### Variações que fazem o mesmo papel

- **Escolher uma opção entre poucas** tem dois desenhos: pílula (`.opcao`, no tipo de momento e em "pessoa ou bicho") e rádio nativo (`.marcar`, em "Toda a família vê / Só quem é dos núcleos"). O mesmo formulário de memória usa os dois.
- **Caixa de marcar** também tem dois: pílula (`.opcao` em pessoas, núcleos e família) e nativa (`.marcar` em "Já faleceu" e nas memórias do capítulo). Na pílula, uma caixa e um rádio ficam idênticos: em "Família", na ficha da pessoa, não dá para saber que pode marcar mais de uma.
- **Trilha de etapas** existe em duas versões: a montada pelo script (barras no celular e "Etapa 1 de 6") e a escrita à mão na nova pessoa (número e nome, sem barra).
- **Campo** tem duas montagens: `.campo` em quase tudo e `.em-linha label` nos laços.
- **Lista de itens** aparece como cartão branco (lixeira, laços), linha com fio embaixo (rascunhos) e cartão da linha do tempo.
- **Voltar** aparece como link na abertura ("Voltar para a página", "Voltar para o capítulo", o título da memória no relato e no histórico), como botão leve ("Cancelar") e como botão principal ("Voltar para a memória", depois de publicar o relato).

## Valores soltos no CSS

Antes desta sessão, `global.css` tinha 13 tokens (7 cores, 4 do núcleo, 2 fontes) e larguras. Todo o resto estava escrito à mão. A branch `qa-ux-tokens` troca por tokens o que já se repetia, com o mesmo valor. O que segue abaixo continua escrito à mão porque não cabe na escala sem mudar a tela.

| Tipo | Usos antes | Viraram token | Ficaram à mão | O que fazer com o que ficou |
| --- | --- | --- | --- | --- |
| Cor | 14 literais (o resto já usava os 7 tokens) | todos | 0 | `testes/tokens.test.ts` impede cor solta nova |
| Espaço | 220, contando os zeros | 111 | 78 (47 valores) | aproximar da escala: 0,15, 0,2, 0,3, 0,35, 0,4, 0,45, 0,6, 0,7, 0,85, 0,9, 1,1, 1,4, 1,75 rem; os `clamp()` das aberturas e da linha do tempo viram tokens de ritmo de página |
| Tamanho de texto | 77 | 64 | 13 (`clamp()` dos títulos, 0,6875, 0,75, 2 e 7 rem) | tokens de título por nível (`--titulo-pagina`, `--titulo-ano`) quando houver visual |
| Peso de fonte | 50 | todos | 0 | |
| Raio | 36 | 31 | 5 (dois círculos de 50%, 2 px no foco, 9 px e 28 px na árvore) | |
| Borda | 52 | 40 | 6 larguras únicas (1, 2, 2,5, 3, 4, 6 px) | definir espessuras por papel: fio, separador, destaque |
| Sombra | 2 | todas | 0 | |
| Foco | 11 | todos | 0 | |
| Altura e largura mínimas | 22 | 10 | 12 (3 rem, 2,5 rem, 3,2 rem e os `min-width: 0` de grade) | `2.5rem` está abaixo de 44 px (ver "Estados que faltam") |
| Tempo de animação | 11 | só a curva | 8 durações (0,2 a 0,5 s), todas na árvore | `--tempo-curto` e `--tempo-medio` quando houver visual |
| Largura de leitura | 17 | 4 | 40 rem é o token; 44 rem, 38 rem, 34 ch, 44 ch e 16 ch ficaram | escolher uma ou duas larguras de leitura |

Fora do CSS:

- `src/layouts/Base.astro`: `<meta name="theme-color" content="#edf2ee">` repete o fundo. Não dá para usar variável ali; precisa mudar junto com `--cor-fundo`.
- As cores dos tipos de momento vêm do banco (tabela `tipos`, `banco.ts` e `admin/tipos.astro`). São dado, e o visual final pode pedir uma paleta nova para elas.
- `Foto.astro` e `tipos.ts` usam `var(--cor-texto)` como cor de reserva.

## Ações e os nomes que recebem

| Ação | Nomes usados hoje | Onde |
| --- | --- | --- |
| Criar | "Nova memória", "Novo capítulo", "Cadastrar pessoa", "Criar capítulo", "Cadastrar e ir para os laços", "Criar tipo", "Adicionar laço" | menu, capítulos, pessoas, formulários, admin |
| Editar | "Corrigir esta memória", "Editar página e laços", "Editar capítulo", "Escolher memórias e editar", "Escrever ou editar o meu relato" | memória, pessoa, capítulo |
| Salvar edição | "Salvar alterações", "Salvar página", "Salvar capítulo", "Salvar memórias do capítulo", "Salvar fases", "Salvar" | memória, pessoa, capítulo, casal, admin |
| Publicar | "Publicar memória", "Publicar relato" | memória, relato |
| Recado depois de publicar | "Memória guardada." e o título "Memória guardada"; "Relato publicado." | memória, relato |
| Resumo antes de publicar | "Confira antes de guardar" com o botão "Publicar memória" | nova memória |
| Excluir | "Excluir memória", "Excluir e mandar para a lixeira", "Excluir capítulo", "Descartar rascunho", "Descartar este rascunho", "Remover laço", "Remover foto", "Remover", "Apagar, foi cadastrado por engano" | memória, capítulo, laços, fotos |
| Recuperar | "Recuperar" (lixeira), "Voltar a ficha para como era antes", "Voltar para este texto", "Devolver à memória" (histórico) | lixeira, histórico |
| Voltar | "Voltar" (etapa), "Cancelar", "Voltar para a página", "Voltar para o capítulo", "Voltar para a memória", "Concluir" | formulários e edições |
| Ver | "Ver a memória", "Ver na árvore", "Ver a árvore", "Ver a página", "Ver tudo", "Ir ao foco" | depois de salvar, pessoa, árvore |

Pontos para decisão (detalhes em `docs/ux/fluxos.md`): "guardar" e "publicar" para a mesma ação; quatro verbos para tirar algo (excluir, descartar, remover, apagar); quatro para voltar uma versão (recuperar, voltar, devolver, restaurar no recado).

### Textos de interface que destoam

- O parentesco aparece em duas pessoas na mesma página: "Elizete mãe" em "Pais" e "Dona Déia sua vó de consideração" em "Laços do coração" (`/pessoas/gui`). Na árvore, "sua mãe".
- Os laços dizem "filho ou filha" mesmo quando a pessoa tem "como se referir" informado: "Vó Bela é filho ou filha de alguém" na aba Pais, e "Aguilar é filho ou filha de Vó Bela" na lista (os dois têm tratamento informado).
- "Corrigir memória" é o título da página, e o botão que leva a ela diz "Corrigir esta memória". O título "Continuar rascunho" fica sobre o texto "Conte o que aconteceu", pensado para memória nova.

## Estados que faltam

| Componente | Normal | Foco | Pressionado | Desabilitado | Carregando | Erro |
| --- | --- | --- | --- | --- | --- | --- |
| Botão principal | sim | sim | **falta** | sim | só pelo recado ao lado, em memória e relato | não se aplica |
| Botão leve | sim | sim | **falta** | herda do principal | **falta** | |
| Botão de perigo | sim | sim | **falta** | herda do principal | **falta** | |
| Opção em pílula | sim | sim | **falta** | **falta** (núcleos travados ficam iguais aos livres) | | **falta** |
| Campo | sim | sim | | navegador | | **falta**: o erro só aparece no balão do navegador e no recado da data |
| Filtro e etiqueta | sim | sim | **falta** | | | |
| Botões do mapa | sim | sim | `aria-pressed` | só caixas de camada | | |

- **Envio sem retorno:** os formulários comuns (pessoa, laço, casal, capítulo, tipos, lixeira, histórico) não desabilitam o botão nem mostram que estão enviando. Um toque duplo manda duas vezes. Memória e relato já fazem isso.
- **Área de toque abaixo de 44 px**, medida em 390 px: a trilha de etapas (botões de 18 px de altura nas barras), os itens do menu (37 px), os links "Histórico de alterações" e "Excluir memória" (25 px), as caixas `.marcar` (28 px), as etiquetas de tema e as camadas da árvore (40 px, `min-height: 2.5rem`), os botões ♥ e + da árvore (cerca de 37 por 49 px com a área estendida) e os links da ficha na árvore (25 px).
- **Movimento reduzido:** a árvore desliga transições e animações; `etapas.ts` rola sem animação. Nenhuma outra animação fica de fora.
- **Foco pelo teclado:** visível em tudo o que foi percorrido. O botão interno do calendário do Chromium não mostra contorno, o que é do navegador.

## Estrutura das páginas

| Tipo | Ordem de hoje | Diferenças |
| --- | --- | --- |
| Lista | título, texto, ação (às vezes), conteúdo | Capítulos e Pessoas põem a ação ("Novo capítulo", "Cadastrar pessoa") como botão leve na abertura; Rascunhos e Lixeira não têm ação |
| Página de pessoa | título, resumo, ações no alto ("Ver na árvore", "Editar página e laços"), família e laços, linha do tempo | as ações ficam no alto |
| Página de memória | etiquetas, título, ficha, fotos, relatos, ações no fim ("Escrever ou editar o meu relato", "Corrigir esta memória"), links soltos (histórico, excluir), vizinhas | as ações ficam no fim |
| Página de capítulo | etiquetas, título, abertura, ação, linha do tempo | |
| Formulário em etapas | título, texto, trilha, etapa, ações (Voltar à esquerda, rascunho e principal à direita) | a nova pessoa usa outra trilha e põe as ações à esquerda, empilhadas |
| Edição | título, link de volta, seções | Editar pessoa põe Laços antes da Ficha; Editar capítulo põe as memórias antes da ficha e o alerta de excluir no fim |

## Marcação

- Grupos com `fieldset` e `legend` nos formulários; "Quem reconhece este laço?" usa `role="radiogroup"` com `aria-labelledby`. Correto.
- Os botões do mapa e os passos do ano são `button` sem classe de componente: o estilo vem do contexto (`.mapa__zoom button`, `.passo-ano button`).
- Nomes de aparência ainda presentes nas classes: nenhum. Os nomes de aparência estavam nos tokens (`--amarelo`, `--branco`, `--papel`, `--tinta`) e foram trocados por nomes de papel na `qa-ux-tokens`.
