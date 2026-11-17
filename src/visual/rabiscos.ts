// Os rabiscos dos tipos de momento: traço redondo, como desenhado a caneta no verso da foto.
// Todos na mesma caixa (24 por 24), com a mesma espessura e as mesmas pontas, que vêm do
// IconeDoTipo.astro. Os onze primeiros são os dos tipos de sempre e levam o id do tipo, para o tipo
// sem escolha continuar com o dele. Os outros (tst-visual-tipos, 17/11/2026) sobram para os tipos
// que os administradores criarem em /admin/tipos.
// PROVISÓRIO (pergunta 2 do PR dos tipos): os rabiscos novos e os nomes de todos.

export interface Rabisco {
  /** o nome guardado no banco (tipos.icone) */
  id: string;
  /** como a pessoa lê na grade de /admin/tipos e em /sistema */
  nome: string;
  /** o miolo do SVG */
  desenho: string;
}

export const RABISCOS: Rabisco[] = [
  { id: 'nascimento', nome: 'Broto', desenho: '<path d="M12 21c0-4 .2-6.5.1-9.5"/><path d="M12 13c-3.6.4-6-1.4-6.6-4.6 3.4-.5 6 .9 6.6 4.6z"/><path d="M12.2 10.6c.2-3.4 2.2-5.6 5.6-5.8.3 3.3-1.9 5.6-5.6 5.8z"/>' },
  { id: 'aniversario', nome: 'Bolo', desenho: '<path d="M5 20.5h14.2v-7.3c0-1-.8-1.7-1.8-1.7H6.7c-1 0-1.7.8-1.7 1.8z"/><path d="M5.2 15.2c1.2 1.3 2.4 1.3 3.5 0 1.1 1.3 2.3 1.3 3.4 0 1.1 1.3 2.3 1.3 3.4 0 1.1 1.3 2.3 1.2 3.5 0"/><path d="M12 11.4V8.2"/><path d="M12 6.4c-.9-.9-.7-1.9 0-2.9.8 1 .9 2 0 2.9z"/>' },
  { id: 'casamento', nome: 'Alianças', desenho: '<circle cx="9" cy="14.2" r="5"/><circle cx="15.2" cy="14.2" r="5"/><path d="M7.5 6.6l1.5-2.1 1.5 2.1L9 8.3z"/>' },
  { id: 'conquista', nome: 'Estrela', desenho: '<path d="M12 3.6l2.5 5.3 5.7.7-4.2 4 1.1 5.7-5.1-2.8-5.1 2.8 1.1-5.7-4.2-4 5.7-.7z"/>' },
  { id: 'viagem', nome: 'Aviãozinho de papel', desenho: '<path d="M3.5 11.2l16.8-7-4.4 15.6-4.3-6.1z"/><path d="M11.6 13.7l8.7-9.5"/><path d="M11.6 13.7v5.2l2.3-2.9"/>' },
  { id: 'casa', nome: 'Casinha', desenho: '<path d="M3.8 11.6L12 4.4l8.2 7.2"/><path d="M6 10v9.6h12V10"/><path d="M10.4 19.6v-5.2h3.2v5.2"/>' },
  { id: 'festa', nome: 'Balões', desenho: '<ellipse cx="9" cy="8.6" rx="3.8" ry="4.6"/><path d="M9 13.2c-.6 2.6 1.6 4.2.4 7.3"/><ellipse cx="16.2" cy="7" rx="3.2" ry="3.9"/><path d="M16.2 10.9c.5 2.4-1.4 3.9-.6 6.6"/>' },
  { id: 'causo', nome: 'Balão de fala', desenho: '<path d="M4.5 6.5c0-1 .8-1.8 1.8-1.8h11.4c1 0 1.8.8 1.8 1.8v7.4c0 1-.8 1.8-1.8 1.8h-6.2l-4.3 3.6v-3.6h-.9c-1 0-1.8-.8-1.8-1.8z"/><path d="M8.6 10.2h.01M12 10.2h.01M15.4 10.2h.01" stroke-width="2.2"/>' },
  { id: 'cotidiano', nome: 'Xícara', desenho: '<path d="M5 10h11.5v4.8c0 2.7-2.2 4.9-4.9 4.9h-1.7C7.2 19.7 5 17.5 5 14.8z"/><path d="M16.5 11.6h1.3c1.3 0 2.3 1 2.3 2.3s-1 2.3-2.3 2.3h-1.5"/><path d="M8.6 7.3c-.8-1.1.8-1.8 0-3M12 7.3c-.8-1.1.8-1.8 0-3"/>' },
  { id: 'despedida', nome: 'Flor', desenho: '<path d="M12 21v-8.5"/><path d="M12 17.6c2.2-.2 3.8-1.6 4.2-3.8-2.2.1-3.8 1.4-4.2 3.8z"/><path d="M8 5.2c0 4.3 1.5 7 4 7s4-2.7 4-7l-2 1.8-2-2.6-2 2.6z"/>' },
  { id: 'outro', nome: 'Brilho', desenho: '<path d="M12 3.5c.5 4.6 2.4 7 8 8.5-5.6 1.5-7.5 3.9-8 8.5-.5-4.6-2.4-7-8-8.5 5.6-1.5 7.5-3.9 8-8.5z"/>' },
  { id: 'formatura', nome: 'Capelo', desenho: '<path d="M2.8 9.4L12 5l9.2 4.4L12 13.8z"/><path d="M6.6 11.4v4.2c1.5 1.5 3.3 2.2 5.4 2.2s3.9-.7 5.4-2.2v-4.2"/><path d="M21.2 9.4v5.4"/>' },
  { id: 'mamadeira', nome: 'Mamadeira', desenho: '<path d="M8.4 10h7.2v7.8c0 1.2-1 2.2-2.2 2.2h-2.8c-1.2 0-2.2-1-2.2-2.2z"/><path d="M7.8 7.8h8.4V10H7.8z"/><path d="M10.2 7.8c0-1.8.6-2.6 1.8-3.6 1.2 1 1.8 1.8 1.8 3.6"/><path d="M8.4 13.4h2.6M8.4 16.2h2.6"/>' },
  { id: 'praia', nome: 'Sol e mar', desenho: '<circle cx="16.2" cy="7.6" r="3.1"/><path d="M2.8 14.8c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0"/><path d="M2.8 19.2c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0"/>' },
  { id: 'pinheiro', nome: 'Pinheiro', desenho: '<path d="M12 3.6l4.2 5.4h-2.4l4 5.2h-2.6l3.6 4.6H5.2l3.6-4.6H6.2l4-5.2H7.8z"/><path d="M12 18.8v2.2"/>' },
  { id: 'talheres', nome: 'Garfo e faca', desenho: '<path d="M7.4 3.8v5.6c0 1.2.9 2.2 2.1 2.2s2.1-1 2.1-2.2V3.8"/><path d="M9.5 3.8v16.4"/><path d="M16.6 20.2V3.8c-1.9 1.5-2.8 3.7-2.8 6.6v2.8h2.8"/>' },
  { id: 'musica', nome: 'Nota musical', desenho: '<path d="M9.4 17.6V6l9.2-2.2v11.8"/><path d="M9.4 9.6l9.2-2.2"/><ellipse cx="6.9" cy="17.6" rx="2.5" ry="2.1"/><ellipse cx="16.1" cy="15.6" rx="2.5" ry="2.1"/>' },
  { id: 'bola', nome: 'Bola', desenho: '<circle cx="12" cy="12" r="8.2"/><path d="M12 8.4l3.4 2.5-1.3 4h-4.2l-1.3-4z"/><path d="M12 8.4V3.8M15.4 10.9l4.2-1.5M14.1 14.9l2.6 3.7M9.9 14.9l-2.6 3.7M8.6 10.9L4.4 9.4"/>' },
  { id: 'patinha', nome: 'Patinha', desenho: '<path d="M12 12.4c-2.6 0-4.8 2.2-4.8 4.5 0 1.5 1.1 2.4 2.5 2.4.9 0 1.5-.4 2.3-.4s1.4.4 2.3.4c1.4 0 2.5-.9 2.5-2.4 0-2.3-2.2-4.5-4.8-4.5z"/><ellipse cx="6.1" cy="10.6" rx="1.5" ry="2"/><ellipse cx="9.8" cy="6.6" rx="1.5" ry="2.1"/><ellipse cx="14.2" cy="6.6" rx="1.5" ry="2.1"/><ellipse cx="17.9" cy="10.6" rx="1.5" ry="2"/>' },
  { id: 'livro', nome: 'Livro aberto', desenho: '<path d="M12 6.6c-2-1.4-4.6-1.9-8-1.6v13.4c3.4-.3 6 .2 8 1.6 2-1.4 4.6-1.9 8-1.6V5c-3.4-.3-6 .2-8 1.6z"/><path d="M12 6.6V20"/>' },
  { id: 'carro', nome: 'Carro', desenho: '<path d="M5.6 16.8H3.6v-3.6c0-.8.5-1.4 1.3-1.6l1.7-.4 1.6-3.6c.3-.7 1-1.1 1.7-1.1h4.6c.7 0 1.4.4 1.7 1l1.9 3.7 1.4.4c.8.2 1.3.9 1.3 1.6v3.6h-2.2"/><path d="M9.6 16.8h5"/><circle cx="7.6" cy="16.8" r="1.9"/><circle cx="16.6" cy="16.8" r="1.9"/><path d="M6.8 11.2h11.2"/>' },
  { id: 'presente', nome: 'Presente', desenho: '<path d="M4.6 10.2h14.8v9.6H4.6z"/><path d="M3.6 7.2h16.8v3H3.6z"/><path d="M12 7.2v12.6"/><path d="M12 7.2c-1.2-2.6-2.6-3.6-4-3.2-1.5.5-1.4 2.6.4 3.2M12 7.2c1.2-2.6 2.6-3.6 4-3.2 1.5.5 1.4 2.6-.4 3.2"/>' },
  { id: 'camera', nome: 'Câmera', desenho: '<path d="M4 8.4c0-.9.7-1.6 1.6-1.6h2.2l1.4-2h5.6l1.4 2h2.2c.9 0 1.6.7 1.6 1.6v9c0 .9-.7 1.6-1.6 1.6H5.6c-.9 0-1.6-.7-1.6-1.6z"/><circle cx="12" cy="12.8" r="3.4"/>' },
  { id: 'coracao', nome: 'Coração', desenho: '<path d="M12 19.6c-4.6-3.2-7.8-6-7.8-9.6 0-2.4 1.8-4.2 4-4.2 1.6 0 3 .9 3.8 2.3.8-1.4 2.2-2.3 3.8-2.3 2.2 0 4 1.8 4 4.2 0 3.6-3.2 6.4-7.8 9.6z"/>' },
  { id: 'sol', nome: 'Sol', desenho: '<circle cx="12" cy="12" r="4"/><path d="M12 3.4v2.2M12 18.4v2.2M3.4 12h2.2M18.4 12h2.2M5.9 5.9l1.6 1.6M16.5 16.5l1.6 1.6M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6"/>' },
  { id: 'caixa', nome: 'Caixa de mudança', desenho: '<path d="M4 8.2l8-3.8 8 3.8v8.6l-8 3.8-8-3.8z"/><path d="M4 8.2l8 3.8 8-3.8M12 12v8.6"/><path d="M8 6.3l8 3.8"/>' },
  { id: 'taca', nome: 'Taça', desenho: '<path d="M7.2 4.4h9.6c0 4.4-1.8 7.4-4.8 7.4s-4.8-3-4.8-7.4z"/><path d="M12 11.8v7.6M8.6 19.6h6.8"/>' },
  { id: 'barraca', nome: 'Barraca', desenho: '<path d="M3.4 19.4L12 5.6l8.6 13.8z"/><path d="M9.4 19.4L12 14.2l2.6 5.2"/><path d="M10.8 3.8L12 5.6l1.2-1.8"/>' },
  { id: 'montanha', nome: 'Montanha', desenho: '<path d="M2.8 19.2l6.4-10.6 3.4 5.4 2.2-3.4 6.4 8.6z"/><path d="M7.5 11.6l1.7 1.4 1.5-1.6"/>' },
  { id: 'peixe', nome: 'Peixe', desenho: '<path d="M3.6 12c2.4-3.4 5.2-5 8.4-5 2.6 0 4.8 1.2 6.4 3.4l2.4-2.6v8.4l-2.4-2.6c-1.6 2.2-3.8 3.4-6.4 3.4-3.2 0-6-1.6-8.4-5z"/><path d="M8 11.4h.01" stroke-width="2.2"/>' },
];

/** O rabisco de quem não tem um: o brilho. */
export const RABISCO_PADRAO = 'outro';

export const ehRabisco = (id: string | null | undefined): boolean => RABISCOS.some((r) => r.id === id);

export function rabisco(id: string | null | undefined): Rabisco {
  return RABISCOS.find((r) => r.id === id) ?? RABISCOS.find((r) => r.id === RABISCO_PADRAO)!;
}
