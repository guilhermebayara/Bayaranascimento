// O marcador do "Ver como" nos endereços das fotos, das cópias e dos retratos (item 16 da revisão R-D1,
// decisão do chat, sessão D1d, 23/11/2026).
//
// Onde existe o "Ver como" (semLogin: as prévias, a homologação e o computador), a mesma foto pode valer para
// uma pessoa e não para outra, e a foto de memória publicada fica guardada no aparelho por 7 dias. Com o
// endereço igual para todos, trocar de pessoa no topo podia mostrar a foto guardada para a anterior (abrindo a
// imagem direto na aba e voltando no navegador, por exemplo). Por isso o endereço de toda foto, cópia e
// retrato que a página desenha leva "?v=<pessoa vista>": trocar de pessoa troca o endereço, e nada guardado
// para uma serve a outra. Na produção não existe "Ver como", e o endereço fica como sempre foi.
//
// O marcador nunca muda quem vê o quê: as rotas das fotos e dos retratos leem só o caminho e conferem pela
// pessoa do pedido; o "?v=" é ignorado na decisão.
//
// Função pura, usada pelo servidor, pelo navegador e pelos testes. No servidor, src/middleware.ts aponta o
// leitor para a pessoa do pedido em curso (só onde há "Ver como"); no navegador, o leitor é o atributo
// data-ver-como do <html>, que src/layouts/Visual.astro põe só onde há "Ver como".

let leitor: () => string | undefined = () => (typeof document === 'undefined' ? undefined : document.documentElement.dataset.verComo || undefined);

/** Aponta de onde vem a pessoa vista (o middleware, uma vez). */
export function lerMarcadorDe(fonte: () => string | undefined): void {
  leitor = fonte;
}

/** O endereço com o marcador da pessoa vista, onde existe o "Ver como"; sem ele, o endereço como está. */
export function comMarcador(endereco: string): string {
  const pessoa = leitor();
  if (!pessoa) return endereco;
  return `${endereco}${endereco.includes('?') ? '&' : '?'}v=${encodeURIComponent(pessoa)}`;
}
