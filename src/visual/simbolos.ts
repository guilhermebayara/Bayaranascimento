// Os símbolos dos controles: os sinais que todo mundo conhece do controle da TV e do tocador de
// música (anterior, próxima, tocar, pausar, tela cheia, ajustes). Nasceram no modo TV (decisão do
// Gui, 22/11/2026: "os botões de texto podem ser símbolos de play, pause... vamos usar a lógica de
// interface de tv") e ficam no sistema para a navegação usar depois.
//
// O traço é o dos rabiscos (src/visual/rabiscos.ts): caixa de 24 por 24, traço de 1,6 com pontas e
// cantos redondos, sem preenchimento nem transformação. A espessura e as pontas vêm de
// Simbolo.astro. Nenhum vem de biblioteca. Conferido em testes/simbolos.test.ts.
//
// Símbolo nunca fica sozinho: quem usa põe o nome (BotaoDeSimbolo.astro), que o leitor de tela lê e
// que aparece escrito junto do botão no foco e no ponteiro.

export interface Simbolo {
  id: string;
  /** o nome do desenho, para a página do sistema; o nome da ação é de quem usa */
  nome: string;
  /** o miolo do SVG */
  desenho: string;
}

export const SIMBOLOS = [
  { id: 'anterior', nome: 'Anterior', desenho: '<path d="M6.5 6v12"/><path d="M18.5 6.5 9.5 12l9 5.5z"/>' },
  { id: 'proxima', nome: 'Próxima', desenho: '<path d="M17.5 6v12"/><path d="M5.5 6.5l9 5.5-9 5.5z"/>' },
  { id: 'tocar', nome: 'Tocar', desenho: '<path d="M7.5 5.5v13L18.5 12z"/>' },
  { id: 'pausar', nome: 'Pausar', desenho: '<path d="M8.5 6v12"/><path d="M15.5 6v12"/>' },
  { id: 'tela-cheia', nome: 'Tela cheia', desenho: '<path d="M4 9V4h5"/><path d="M15 4h5v5"/><path d="M20 15v5h-5"/><path d="M9 20H4v-5"/>' },
  { id: 'sair-da-tela-cheia', nome: 'Sair da tela cheia', desenho: '<path d="M9 4v5H4"/><path d="M20 9h-5V4"/><path d="M15 20v-5h5"/><path d="M4 15h5v5"/>' },
  {
    id: 'ajustes',
    nome: 'Ajustes',
    desenho:
      '<path d="M10.3 5.3L10.7 3.1L13.3 3.1L13.7 5.3L15.6 6.1L17.4 4.8L19.2 6.6L17.9 8.4L18.7 10.3L20.9 10.7L20.9 13.3L18.7 13.7L17.9 15.6L19.2 17.4L17.4 19.2L15.6 17.9L13.7 18.7L13.3 20.9L10.7 20.9L10.3 18.7L8.4 17.9L6.6 19.2L4.8 17.4L6.1 15.6L5.3 13.7L3.1 13.3L3.1 10.7L5.3 10.3L6.1 8.4L4.8 6.6L6.6 4.8L8.4 6.1z"/><circle cx="12" cy="12" r="3"/>',
  },
  { id: 'ocultar', nome: 'Ocultar', desenho: '<path d="M3 12c2.2-4 5.2-6 9-6s6.8 2 9 6c-2.2 4-5.2 6-9 6s-6.8-2-9-6z"/><circle cx="12" cy="12" r="2.6"/><path d="M4.5 4.5l15 15"/>' },
] as const satisfies readonly Simbolo[];

export type IdDoSimbolo = (typeof SIMBOLOS)[number]['id'];

export function simbolo(id: IdDoSimbolo): Simbolo {
  return SIMBOLOS.find((s) => s.id === id)!;
}
