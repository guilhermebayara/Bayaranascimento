# Perguntas para o Gui, parte 1 dos ajustes

Provisório: a segunda parte dos ajustes leva estas perguntas para o PR e apaga este arquivo.

1. **Capítulo, no celular: os nomes de "Quem aparece" são links?**
   A linha corrida "Gui (6), Elizete (5)" tomou o lugar da lista com retratos, que levava à página de cada pessoa.
   O que foi feito: cada nome é um link, e a linha ficou com 44 px de altura para o toque, mais arejada que um texto corrido.
   - **Links, com a linha alta (recomendada).** Mantém o caminho para a pessoa.
   - Só texto, com a entrelinha normal. Fica mais compacto e perde o caminho para a pessoa no celular.

2. **Lista: o que mostrar no lugar da data quando a memória só tem o ano?**
   Dentro do bloco do ano, a linha mostra o dia e o mês. Memória só com o ano não tem o que mostrar ali.
   O que foi feito: fica em branco, porque o ano já está no alto do bloco. A data aproximada diz "por volta de" e, quando o mês é conhecido, "por volta de ago", sem o dia.
   - **Em branco (recomendada).**
   - Repetir o ano ("2019"), para nenhuma linha ficar sem data.
   - Escrever "sem dia".

3. **Lista em 1280 px: o lugar embaixo do título.**
   Com a margem da foto à direita, as sete colunas não cabem em 1280 px sem cortar "Belo Horizonte" e o nome do capítulo.
   O que foi feito: em 1280 px o lugar fica embaixo do título, menor; em 1920 px ele tem a coluna dele. A foto-chave aparece numa margem reservada à direita, sem cobrir o texto da linha.
   - **Lugar embaixo do título em 1280 px (recomendada).**
   - Sete colunas também em 1280 px, com a foto por cima da coluna do capítulo.
   - Sem a margem da foto: a foto acompanha o cursor, como na agenda da @bsurda (pede script).

4. **Lista: qual nome entra em "quem estava" e quantos capítulos.**
   A linha pede nomes curtos. O cadastro tem o nome inteiro e, às vezes, como a pessoa é chamada na família.
   O que foi feito: entra como a pessoa é chamada ("Vó Bela") ou, sem isso, o primeiro nome ("Lucas"), na ordem em que estão na memória. Do capítulo, entra o primeiro e "+N" para os outros.
   - **Como é chamada, ou o primeiro nome (recomendada).**
   - Sempre o primeiro nome.
