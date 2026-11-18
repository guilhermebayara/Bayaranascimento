// A regra da proximidade, sem navegador: recebe as caixas já medidas de um título e do que vem
// antes e depois dele, e diz se o espaço acima é pelo menos o dobro do espaço abaixo.
// Quem mede é scripts/confere-gestalt.mjs; o teste é testes/gestalt.test.ts.
// O princípio está em "Gestalt em toda tela", em docs/visual.md.

/** Tolerância de arredondamento, em px: as caixas do navegador vêm com frações. */
export const FOLGA = 1;

/** Duas caixas dividem alguma faixa na horizontal (uma está em cima da outra, e não ao lado). */
function naMesmaColuna(a, b) {
  return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0;
}

/**
 * Julga um título. `medida` traz `titulo`, `anterior` e `proximo`, cada um com top, bottom,
 * left e right (anterior e proximo podem faltar). Devolve a situação ("ok", "falha" ou
 * "ignorado"), os espaços acima e abaixo e, se ignorado, o motivo.
 */
export function julgar({ titulo, anterior, proximo }) {
  // anterior.titulo: o que vem antes também é um título (uma pilha de títulos, como o da página e o
  // de uma seção logo abaixo); a regra vale para a pilha, e não para cada degrau dela.
  // anterior.sobretitulo: o que vem antes é a linha curta que abre o mesmo cabeçalho.
  // anterior.fio: um fio separa o título do que vem antes (região comum): a linha já faz a divisão.
  if (!anterior) return { situacao: 'ignorado', motivo: 'primeiro do contêiner' };
  if (!proximo) return { situacao: 'ignorado', motivo: 'sem conteúdo abaixo' };
  if (anterior.titulo) return { situacao: 'ignorado', motivo: 'logo depois de outro título' };
  if (anterior.sobretitulo) return { situacao: 'ignorado', motivo: 'sobretítulo' };
  if (anterior.fio) return { situacao: 'ignorado', motivo: 'separado por um fio' };
  if (!naMesmaColuna(anterior, titulo) || !naMesmaColuna(proximo, titulo)) return { situacao: 'ignorado', motivo: 'lado a lado' };
  const acima = Math.round((titulo.top - anterior.bottom) * 10) / 10;
  const abaixo = Math.round((proximo.top - titulo.bottom) * 10) / 10;
  if (acima < -FOLGA || abaixo < -FOLGA) return { situacao: 'ignorado', motivo: 'sobreposto', acima, abaixo };
  const ok = acima + FOLGA >= 2 * Math.max(0, abaixo);
  return { situacao: ok ? 'ok' : 'falha', acima, abaixo };
}

const bate = (padrao, texto) => (padrao instanceof RegExp ? padrao.test(texto ?? '') : padrao === texto);

/** Uma exceção vale para o título se a tela e o vizinho de cima (quando dados) e o seletor batem. */
export function eExcecao(excecoes, { tela, seletor, anterior }) {
  return excecoes.find((e) => (!e.tela || e.tela === tela) && bate(e.seletor, seletor) && (!e.anterior || bate(e.anterior, anterior?.seletor)));
}

/**
 * Julga todas as medidas e separa as falhas. Cada medida traz tela, largura, seletor e as caixas.
 * Devolve as falhas (fora das exceções), as exceções que foram usadas e quantos títulos passaram.
 */
export function conferir(medidas, excecoes = []) {
  const falhas = [];
  const usadas = new Set();
  let conferidos = 0;
  for (const m of medidas) {
    const r = julgar(m);
    if (r.situacao === 'ignorado') continue;
    conferidos++;
    if (r.situacao === 'ok') continue;
    const excecao = eExcecao(excecoes, m);
    if (excecao) {
      usadas.add(excecao);
      continue;
    }
    falhas.push({ tela: m.tela, largura: m.largura, seletor: m.seletor, texto: m.texto, anterior: m.anterior?.seletor, proximo: m.proximo?.seletor, acima: r.acima, abaixo: r.abaixo });
  }
  return { falhas, usadas: [...usadas], conferidos };
}
