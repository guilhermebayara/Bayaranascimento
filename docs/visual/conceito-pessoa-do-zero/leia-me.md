# Conceito da página da pessoa, do zero (sessão L, 18/11/2026)

Duas propostas na prévia `tst-pessoa-do-zero`, com o acervo de exemplo, vendo como Gui. Em qualquer página de pessoa da prévia, a faixa "Conceito da página da pessoa" troca entre "Hoje", "A, o verbete" e "B, o álbum" (`?proposta=a`, `b` ou `hoje`; a escolha fica num cookie e segue de uma pessoa a outra). Fora das prévias a faixa e as propostas não existem.

Capturas nesta pasta, em 390, 1280 e 1920 px: `a-` e `b-` para cada proposta, com `muito` (Elizete, sua mãe: 34 memórias e 10 relatos), `faleceu` (Vô Tonho, seu avô) e `pouco` (Dona Lourdes, sua vó de consideração, sem memória nenhuma). As abas da B aparecem na Vó Bela, que tem áudios: `b-aba-contou`, `b-aba-familia`, `b-aba-sobre`. As capturas longas são cortadas em 4200 px (5200 no celular).

## A pergunta de partida: como uma página de pessoa existe neste site?

Ela é o lugar onde quatro caminhos se cruzam. Chega-se a ela pela árvore (a ficha, "Ver a página"), pelo círculo (a ficha da pessoa), pela página do laço (os dois retratos), pela memória ("Quem estava" e o nome de quem contou) e pela lista de Pessoas. Dela se sai para a árvore partindo da pessoa, para as memórias, para o laço entre ela e outra pessoa, e para o círculo de quem olha. Hoje a página leva só à árvore e às memórias: o laço e o círculo não têm porta de volta.

### Padrões que poderiam vir para cá

| Padrão | O que tem de bom aqui | O que não serve |
| --- | --- | --- |
| Perfil de rede social (Instagram, Facebook) | A família já sabe usar: retrato, nome, números que são abas, as fotos em grade como corpo da página, "amigos" como grade de retratos | Os números como vaidade ("seguidores"); aqui eles só dizem quanto há |
| Pessoa em site de genealogia (FamilySearch, MyHeritage) | A ficha com nascimento e família; a família de perto (pais, casal, filhos, irmãos) desenhada como um pedaço da árvore; a vida como linha do tempo de acontecimentos | Fontes e documentos, campos vazios de cadastro |
| Verbete (Wikipédia) | Uma frase de abertura que diz quem é; o quadro ao lado com o retrato e os dados; "ver também" no fim | O texto longo que aqui ninguém escreve: o "Sobre" quase sempre está vazio |
| Álbum de família | A pessoa como dona de um álbum: a capa, as fotos dela, a mão de quem conta | O álbum físico não sabe nada de laços |

### O que a página precisa mostrar (o que existe hoje)

- **Quem é:** retrato de álbum (com o tom suave que acende, de quem faleceu), nome, apelido entre parênteses, "Como você chama", o parentesco de quem olha como linha principal, espécie de bichinho, famílias, nascimento, "Mostrar datas" de quem faleceu, "em memória".
- **Ações:** "Nova memória com Fulano" (a principal), "Editar página e laços" ou "Adicionar laço", "Ver na árvore" (só com laço de árvore), "Sua conta" na própria página.
- **A voz:** "Sobre" e os áudios dos relatos dela.
- **Família e laços:** pais, casal (com a história das fases), filhos, irmãos, avós, parentes de fora das famílias, laços do coração, "No coração de".
- **Memórias com ela:** linha do tempo, mural e lista.

O que nenhuma das duas mexe: quem vê o quê (a página usa as mesmas consultas de hoje, montadas em `src/lib/servidor/pagina-da-pessoa.ts`), o parentesco de quem olha, a regra do ex discreto ou fora e o retrato de álbum.

### O que as duas acrescentam

- **Os relatos que ela contou**, além dos áudios (`listarRelatosDe`, em `repositorio.ts`, com a mesma regra de "A voz de Fulano": só relato publicado, em memória publicada que quem olha vê, e passando por `veORelato`).
- **O círculo de quem olha:** "No seu círculo: Próximo", com "só você vê", na página de outra pessoa. É o valor do círculo dele, que só ele recebe.
- **A página do laço:** "Ver o laço de vocês" (quem olha e a pessoa) e, nos laços da pessoa, o laço com cada uma.

## Proposta A, o verbete

**A ideia:** a página diz quem a pessoa é e conta a vida dela em ordem, pela idade, como um verbete com a ficha de genealogia ao lado.

- **Abertura:** o parentesco grande, o nome e uma frase de abertura em serifa: o primeiro parágrafo de "Sobre" ou, sem ele, o que o acervo sabe ("Elizete aparece em 34 memórias do acervo, de 1968 a 2026, e contou 10 delas."). A ação principal logo abaixo.
- **O quadro ao lado** (no celular, logo depois da abertura): o retrato, os dados (nasceu, família em pílula, quanto há no acervo), **"Na árvore"**, a família de perto em retratos pequenos (pais, casal, irmãos, filhos) com "Ver na árvore", e **"Você e Fulano"**, com o lugar no seu círculo e "Ver o laço de vocês".
- **"A vida de Fulano em memórias":** as memórias numa lista compacta, agrupadas pela idade dela ("Dos 30 aos 39 anos · 1988 a 1997"), cada uma com a foto pequena, a data, "aos 34 anos", o título e o lugar. Sem o ano de nascimento, pelas décadas. Na tela grande, duas colunas.
- **"Nas palavras de Fulano":** o resto do "Sobre", os áudios e os trechos dos relatos dela, três à vista e "Ver os outros 7 relatos".
- **"Família e laços"** no fim, quieta, como o "ver também" do verbete, com "O laço com Fulano" no casal e nos laços do coração.
- Muda em relação a hoje: a linha do tempo grande sai (a página da pessoa deixa de repetir o Explorar) e a forma de ver também; quem quiser o mural vai ao Explorar com o filtro da pessoa.

## Proposta B, o álbum

**A ideia:** a página é o álbum da pessoa, no padrão do perfil das redes que a família já usa: a capa e, embaixo, abas que trocam no lugar.

- **A capa,** no bloco da cor da família: o retrato, o parentesco grande, o nome, o carimbo (famílias e nascimento) e os números como no perfil ("34 memórias · 10 relatos · 10 laços"), cada um levando à sua aba. Ao lado, a ação principal e os caminhos: "Ver na árvore", "Você e Fulano" (a página do laço) e "No seu círculo: Muito próximo · só você vê".
- **As abas,** coladas no conteúdo, trocam sem recarregar e sem perder a rolagem; o endereço acompanha (`?aba=`), e sem script cada aba é um link. As setas do teclado passam de uma à outra. Abre na primeira que tem conteúdo.
    - **Memórias:** o mural, a caixa de fotografias dela, como no Explorar.
    - **Relatos:** "A voz de Fulano" com os áudios e, embaixo, cada relato como um bilhete com o título da memória, o trecho e o nome dela à mão.
    - **Família:** os laços em grade de retratos grandes, por grupo, cada um com "Ver o laço", e "Ver a árvore de Fulano" no alto.
    - **Sobre:** o texto e os dados (nasceu, famílias, de que ano a que ano aparece nas memórias).
- Muda em relação a hoje: a linha do tempo dá lugar ao mural; as abas escondem uma parte da página de cada vez (é o preço do padrão conhecido).

## A escolha (Gui, 18/11/2026)

1. **A, com um pouco mais da cor da família.** A página inteira em cor seria demais; a cor entra com medida (o retrato sobre o pastel no alto do quadro, o ponto de cada idade e o fio das citações).
2. **Pela idade é o padrão, com a linha do tempo como opção.** Ficaram três formas: pela idade, linha do tempo e mural de fotos.
3. **"No seu círculo" fica** na página de outra pessoa, só para quem olha.

A construção está na regra de `docs/decisoes.md` e `docs/visual.md`, "Página da pessoa". As rotas das propostas e a faixa que trocava entre elas saíram do site; ficam as capturas desta pasta.
