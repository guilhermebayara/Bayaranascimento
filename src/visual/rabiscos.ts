// Os rabiscos dos tipos de momento: traço redondo, como desenhado a caneta no verso da foto.
// Todos na mesma caixa (24 por 24), com a mesma espessura e as mesmas pontas, que vêm do
// IconeDoTipo.astro. Os onze primeiros são os dos tipos de sempre e levam o id do tipo, para o tipo
// sem escolha continuar com o dele. Os outros (tst-visual-tipos, 17/11/2026) sobram para os tipos
// que os administradores criarem em /admin/tipos.
// Em 18/11/2026 (decisão do Gui, tst-icones-e-cores) entraram mais 55, e todos ganharam um assunto:
// é por assunto que o seletor de /admin/tipos e a página do sistema arrumam os desenhos. Nenhum vem
// de biblioteca. Em fé, os símbolos são neutros (vela, mãos, pomba, livro, ramo), sem privilegiar
// uma religião, e nada aqui remete a cemitério. Conferido em testes/rabiscos.test.ts.
// PROVISÓRIO (pergunta 2 do PR dos tipos): os nomes de todos.

/** Os assuntos, na ordem em que aparecem no seletor. O id nunca vai para o banco. */
export const ASSUNTOS = [
  { id: 'familia', nome: 'Família' },
  { id: 'casa', nome: 'Casa' },
  { id: 'dia', nome: 'Dia a dia' },
  { id: 'trabalho', nome: 'Trabalho' },
  { id: 'escola', nome: 'Escola' },
  { id: 'saude', nome: 'Saúde' },
  { id: 'bichos', nome: 'Bichinhos' },
  { id: 'viagens', nome: 'Viagens' },
  { id: 'comida', nome: 'Comida' },
  { id: 'musica', nome: 'Música' },
  { id: 'esporte', nome: 'Esporte' },
  { id: 'fe', nome: 'Fé' },
  { id: 'festas', nome: 'Festas' },
] as const;
export type Assunto = (typeof ASSUNTOS)[number]['id'];

export interface Rabisco {
  /** o nome guardado no banco (tipos.icone) */
  id: string;
  /** como a pessoa lê na grade de /admin/tipos e em /sistema */
  nome: string;
  /** o grupo em que o desenho aparece no seletor e na página do sistema */
  assunto: Assunto;
  /** o miolo do SVG */
  desenho: string;
}

export const RABISCOS: Rabisco[] = [
  { id: 'nascimento', nome: 'Broto', assunto: 'familia', desenho: '<path d="M12 21c0-4 .2-6.5.1-9.5"/><path d="M12 13c-3.6.4-6-1.4-6.6-4.6 3.4-.5 6 .9 6.6 4.6z"/><path d="M12.2 10.6c.2-3.4 2.2-5.6 5.6-5.8.3 3.3-1.9 5.6-5.6 5.8z"/>' },
  { id: 'aniversario', nome: 'Bolo', assunto: 'festas', desenho: '<path d="M5 20.5h14.2v-7.3c0-1-.8-1.7-1.8-1.7H6.7c-1 0-1.7.8-1.7 1.8z"/><path d="M5.2 15.2c1.2 1.3 2.4 1.3 3.5 0 1.1 1.3 2.3 1.3 3.4 0 1.1 1.3 2.3 1.3 3.4 0 1.1 1.3 2.3 1.2 3.5 0"/><path d="M12 11.4V8.2"/><path d="M12 6.4c-.9-.9-.7-1.9 0-2.9.8 1 .9 2 0 2.9z"/>' },
  { id: 'casamento', nome: 'Alianças', assunto: 'familia', desenho: '<circle cx="9" cy="14.2" r="5"/><circle cx="15.2" cy="14.2" r="5"/><path d="M7.5 6.6l1.5-2.1 1.5 2.1L9 8.3z"/>' },
  { id: 'conquista', nome: 'Estrela', assunto: 'dia', desenho: '<path d="M12 3.6l2.5 5.3 5.7.7-4.2 4 1.1 5.7-5.1-2.8-5.1 2.8 1.1-5.7-4.2-4 5.7-.7z"/>' },
  { id: 'viagem', nome: 'Aviãozinho de papel', assunto: 'viagens', desenho: '<path d="M3.5 11.2l16.8-7-4.4 15.6-4.3-6.1z"/><path d="M11.6 13.7l8.7-9.5"/><path d="M11.6 13.7v5.2l2.3-2.9"/>' },
  { id: 'casa', nome: 'Casinha', assunto: 'casa', desenho: '<path d="M3.8 11.6L12 4.4l8.2 7.2"/><path d="M6 10v9.6h12V10"/><path d="M10.4 19.6v-5.2h3.2v5.2"/>' },
  { id: 'festa', nome: 'Balões', assunto: 'festas', desenho: '<ellipse cx="9" cy="8.6" rx="3.8" ry="4.6"/><path d="M9 13.2c-.6 2.6 1.6 4.2.4 7.3"/><ellipse cx="16.2" cy="7" rx="3.2" ry="3.9"/><path d="M16.2 10.9c.5 2.4-1.4 3.9-.6 6.6"/>' },
  { id: 'causo', nome: 'Balão de fala', assunto: 'dia', desenho: '<path d="M4.5 6.5c0-1 .8-1.8 1.8-1.8h11.4c1 0 1.8.8 1.8 1.8v7.4c0 1-.8 1.8-1.8 1.8h-6.2l-4.3 3.6v-3.6h-.9c-1 0-1.8-.8-1.8-1.8z"/><path d="M8.6 10.2h.01M12 10.2h.01M15.4 10.2h.01" stroke-width="2.2"/>' },
  { id: 'cotidiano', nome: 'Xícara', assunto: 'comida', desenho: '<path d="M5 10h11.5v4.8c0 2.7-2.2 4.9-4.9 4.9h-1.7C7.2 19.7 5 17.5 5 14.8z"/><path d="M16.5 11.6h1.3c1.3 0 2.3 1 2.3 2.3s-1 2.3-2.3 2.3h-1.5"/><path d="M8.6 7.3c-.8-1.1.8-1.8 0-3M12 7.3c-.8-1.1.8-1.8 0-3"/>' },
  { id: 'despedida', nome: 'Flor', assunto: 'dia', desenho: '<path d="M12 21v-8.5"/><path d="M12 17.6c2.2-.2 3.8-1.6 4.2-3.8-2.2.1-3.8 1.4-4.2 3.8z"/><path d="M8 5.2c0 4.3 1.5 7 4 7s4-2.7 4-7l-2 1.8-2-2.6-2 2.6z"/>' },
  { id: 'outro', nome: 'Brilho', assunto: 'dia', desenho: '<path d="M12 3.5c.5 4.6 2.4 7 8 8.5-5.6 1.5-7.5 3.9-8 8.5-.5-4.6-2.4-7-8-8.5 5.6-1.5 7.5-3.9 8-8.5z"/>' },
  { id: 'formatura', nome: 'Capelo', assunto: 'escola', desenho: '<path d="M2.8 9.4L12 5l9.2 4.4L12 13.8z"/><path d="M6.6 11.4v4.2c1.5 1.5 3.3 2.2 5.4 2.2s3.9-.7 5.4-2.2v-4.2"/><path d="M21.2 9.4v5.4"/>' },
  { id: 'mamadeira', nome: 'Mamadeira', assunto: 'familia', desenho: '<path d="M8.4 10h7.2v7.8c0 1.2-1 2.2-2.2 2.2h-2.8c-1.2 0-2.2-1-2.2-2.2z"/><path d="M7.8 7.8h8.4V10H7.8z"/><path d="M10.2 7.8c0-1.8.6-2.6 1.8-3.6 1.2 1 1.8 1.8 1.8 3.6"/><path d="M8.4 13.4h2.6M8.4 16.2h2.6"/>' },
  { id: 'praia', nome: 'Sol e mar', assunto: 'viagens', desenho: '<circle cx="16.2" cy="7.6" r="3.1"/><path d="M2.8 14.8c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0"/><path d="M2.8 19.2c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0"/>' },
  { id: 'pinheiro', nome: 'Pinheiro', assunto: 'viagens', desenho: '<path d="M12 3.6l4.2 5.4h-2.4l4 5.2h-2.6l3.6 4.6H5.2l3.6-4.6H6.2l4-5.2H7.8z"/><path d="M12 18.8v2.2"/>' },
  { id: 'talheres', nome: 'Garfo e faca', assunto: 'comida', desenho: '<path d="M7.4 3.8v5.6c0 1.2.9 2.2 2.1 2.2s2.1-1 2.1-2.2V3.8"/><path d="M9.5 3.8v16.4"/><path d="M16.6 20.2V3.8c-1.9 1.5-2.8 3.7-2.8 6.6v2.8h2.8"/>' },
  { id: 'musica', nome: 'Nota musical', assunto: 'musica', desenho: '<path d="M9.4 17.6V6l9.2-2.2v11.8"/><path d="M9.4 9.6l9.2-2.2"/><ellipse cx="6.9" cy="17.6" rx="2.5" ry="2.1"/><ellipse cx="16.1" cy="15.6" rx="2.5" ry="2.1"/>' },
  { id: 'bola', nome: 'Bola', assunto: 'esporte', desenho: '<circle cx="12" cy="12" r="8.2"/><path d="M12 8.4l3.4 2.5-1.3 4h-4.2l-1.3-4z"/><path d="M12 8.4V3.8M15.4 10.9l4.2-1.5M14.1 14.9l2.6 3.7M9.9 14.9l-2.6 3.7M8.6 10.9L4.4 9.4"/>' },
  { id: 'patinha', nome: 'Patinha', assunto: 'bichos', desenho: '<path d="M12 12.4c-2.6 0-4.8 2.2-4.8 4.5 0 1.5 1.1 2.4 2.5 2.4.9 0 1.5-.4 2.3-.4s1.4.4 2.3.4c1.4 0 2.5-.9 2.5-2.4 0-2.3-2.2-4.5-4.8-4.5z"/><ellipse cx="6.1" cy="10.6" rx="1.5" ry="2"/><ellipse cx="9.8" cy="6.6" rx="1.5" ry="2.1"/><ellipse cx="14.2" cy="6.6" rx="1.5" ry="2.1"/><ellipse cx="17.9" cy="10.6" rx="1.5" ry="2"/>' },
  { id: 'livro', nome: 'Livro aberto', assunto: 'escola', desenho: '<path d="M12 6.6c-2-1.4-4.6-1.9-8-1.6v13.4c3.4-.3 6 .2 8 1.6 2-1.4 4.6-1.9 8-1.6V5c-3.4-.3-6 .2-8 1.6z"/><path d="M12 6.6V20"/>' },
  { id: 'carro', nome: 'Carro', assunto: 'viagens', desenho: '<path d="M5.6 16.8H3.6v-3.6c0-.8.5-1.4 1.3-1.6l1.7-.4 1.6-3.6c.3-.7 1-1.1 1.7-1.1h4.6c.7 0 1.4.4 1.7 1l1.9 3.7 1.4.4c.8.2 1.3.9 1.3 1.6v3.6h-2.2"/><path d="M9.6 16.8h5"/><circle cx="7.6" cy="16.8" r="1.9"/><circle cx="16.6" cy="16.8" r="1.9"/><path d="M6.8 11.2h11.2"/>' },
  { id: 'presente', nome: 'Presente', assunto: 'festas', desenho: '<path d="M4.6 10.2h14.8v9.6H4.6z"/><path d="M3.6 7.2h16.8v3H3.6z"/><path d="M12 7.2v12.6"/><path d="M12 7.2c-1.2-2.6-2.6-3.6-4-3.2-1.5.5-1.4 2.6.4 3.2M12 7.2c1.2-2.6 2.6-3.6 4-3.2 1.5.5 1.4 2.6-.4 3.2"/>' },
  { id: 'camera', nome: 'Câmera', assunto: 'dia', desenho: '<path d="M4 8.4c0-.9.7-1.6 1.6-1.6h2.2l1.4-2h5.6l1.4 2h2.2c.9 0 1.6.7 1.6 1.6v9c0 .9-.7 1.6-1.6 1.6H5.6c-.9 0-1.6-.7-1.6-1.6z"/><circle cx="12" cy="12.8" r="3.4"/>' },
  { id: 'coracao', nome: 'Coração', assunto: 'familia', desenho: '<path d="M12 19.6c-4.6-3.2-7.8-6-7.8-9.6 0-2.4 1.8-4.2 4-4.2 1.6 0 3 .9 3.8 2.3.8-1.4 2.2-2.3 3.8-2.3 2.2 0 4 1.8 4 4.2 0 3.6-3.2 6.4-7.8 9.6z"/>' },
  { id: 'sol', nome: 'Sol', assunto: 'dia', desenho: '<circle cx="12" cy="12" r="4"/><path d="M12 3.4v2.2M12 18.4v2.2M3.4 12h2.2M18.4 12h2.2M5.9 5.9l1.6 1.6M16.5 16.5l1.6 1.6M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6"/>' },
  { id: 'caixa', nome: 'Caixa de mudança', assunto: 'casa', desenho: '<path d="M4 8.2l8-3.8 8 3.8v8.6l-8 3.8-8-3.8z"/><path d="M4 8.2l8 3.8 8-3.8M12 12v8.6"/><path d="M8 6.3l8 3.8"/>' },
  { id: 'taca', nome: 'Taça', assunto: 'comida', desenho: '<path d="M7.2 4.4h9.6c0 4.4-1.8 7.4-4.8 7.4s-4.8-3-4.8-7.4z"/><path d="M12 11.8v7.6M8.6 19.6h6.8"/>' },
  { id: 'barraca', nome: 'Barraca', assunto: 'viagens', desenho: '<path d="M3.4 19.4L12 5.6l8.6 13.8z"/><path d="M9.4 19.4L12 14.2l2.6 5.2"/><path d="M10.8 3.8L12 5.6l1.2-1.8"/>' },
  { id: 'montanha', nome: 'Montanha', assunto: 'viagens', desenho: '<path d="M2.8 19.2l6.4-10.6 3.4 5.4 2.2-3.4 6.4 8.6z"/><path d="M7.5 11.6l1.7 1.4 1.5-1.6"/>' },
  { id: 'peixe', nome: 'Peixe', assunto: 'bichos', desenho: '<path d="M3.6 12c2.4-3.4 5.2-5 8.4-5 2.6 0 4.8 1.2 6.4 3.4l2.4-2.6v8.4l-2.4-2.6c-1.6 2.2-3.8 3.4-6.4 3.4-3.2 0-6-1.6-8.4-5z"/><path d="M8 11.4h.01" stroke-width="2.2"/>' },
  // Família
  { id: 'familia', nome: 'Família', assunto: 'familia', desenho: '<circle cx="6.6" cy="6.8" r="2.3"/><circle cx="17.4" cy="6.8" r="2.3"/><circle cx="12" cy="13" r="1.8"/><path d="M3 19.6v-4.4c0-2 1.6-3.6 3.6-3.6.6 0 1.1.1 1.6.4"/><path d="M21 19.6v-4.4c0-2-1.6-3.6-3.6-3.6-.6 0-1.1.1-1.6.4"/><path d="M8.8 19.6v-.2c0-1.8 1.4-3.2 3.2-3.2s3.2 1.4 3.2 3.2v.2"/>' },
  { id: 'carrinho', nome: 'Carrinho de bebê', assunto: 'familia', desenho: '<path d="M4.6 10.4h13.6c0 3.6-2.8 6-6.8 6s-6.8-2.4-6.8-6z"/><path d="M11.4 10.4V4.2c3.8 0 6.8 2.6 6.8 6.2"/><path d="M4.6 10.4L4 7.2H2.8"/><circle cx="8" cy="19" r="1.6"/><circle cx="15" cy="19" r="1.6"/>' },
  { id: 'chupeta', nome: 'Chupeta', assunto: 'familia', desenho: '<path d="M9.6 9.2c-.9-1.6-.5-4.6 2.4-4.6s3.3 3 2.4 4.6"/><path d="M6 9.2h12c.9 0 1.6.7 1.6 1.6s-.7 1.6-1.6 1.6H6c-.9 0-1.6-.7-1.6-1.6S5.1 9.2 6 9.2z"/><circle cx="12" cy="16.6" r="3.4"/>' },
  { id: 'arvore', nome: 'Árvore', assunto: 'familia', desenho: '<path d="M7.4 14.2c-2.2-.3-3.6-2-3.6-4 0-2 1.5-3.6 3.5-3.9C8 4.6 9.8 3.4 12 3.4s4 1.2 4.7 2.9c2 .3 3.5 1.9 3.5 3.9 0 2-1.4 3.7-3.6 4z"/><path d="M10.8 14.2v3.8c0 1.2-.6 2.2-1.8 2.8h6c-1.2-.6-1.8-1.6-1.8-2.8v-3.8"/>' },
  // Casa
  { id: 'chave', nome: 'Chave', assunto: 'casa', desenho: '<circle cx="8.2" cy="15.8" r="3.8"/><path d="M10.9 13.1l8.7-8.7M15.8 8.2l2.4 2.4M18.4 5.6l2 2"/>' },
  { id: 'poltrona', nome: 'Poltrona', assunto: 'casa', desenho: '<path d="M6.4 10.6V7.4c0-1.5 1.2-2.8 2.8-2.8h5.6c1.5 0 2.8 1.2 2.8 2.8v3.2"/><path d="M3.6 12.4c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8v2.4h9.6v-2.4c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8v5.2H3.6z"/><path d="M6 17.6v2.2M18 17.6v2.2"/>' },
  { id: 'cama', nome: 'Cama', assunto: 'casa', desenho: '<path d="M3.6 5.6v13.6M20.4 19.2v-5.4c0-1-.8-1.8-1.8-1.8H3.6M3.6 16.4h16.8"/><path d="M6 12V9.8c0-.6.4-1 1-1h3c.6 0 1 .4 1 1V12"/>' },
  { id: 'planta', nome: 'Vaso de planta', assunto: 'casa', desenho: '<path d="M7 14h10l-1.2 6.2H8.2z"/><path d="M12 14V8.6"/><path d="M12 10.8c-3 .2-4.8-1.2-5.2-3.8 2.8-.3 4.8 1 5.2 3.8z"/><path d="M12 8.6c.2-2.8 1.8-4.6 4.6-4.8.2 2.8-1.5 4.6-4.6 4.8z"/>' },
  { id: 'porta', nome: 'Porta', assunto: 'casa', desenho: '<path d="M6.6 20.4V5c0-.6.4-1 1-1h8.8c.6 0 1 .4 1 1v15.4"/><path d="M4 20.4h16"/><path d="M14.2 12.6h.01" stroke-width="2.2"/>' },
  // Trabalho
  { id: 'maleta', nome: 'Maleta', assunto: 'trabalho', desenho: '<path d="M3.8 8.6c0-.8.6-1.4 1.4-1.4h13.6c.8 0 1.4.6 1.4 1.4v9.6c0 .8-.6 1.4-1.4 1.4H5.2c-.8 0-1.4-.6-1.4-1.4z"/><path d="M9 7.2V5.4c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v1.8"/><path d="M3.8 12.6h16.4M12 11.4v2.4"/>' },
  { id: 'computador', nome: 'Computador', assunto: 'trabalho', desenho: '<path d="M5.4 15.6V6.6c0-.7.5-1.2 1.2-1.2h10.8c.7 0 1.2.5 1.2 1.2v9"/><path d="M2.8 15.6h18.4l-1 2.6c-.2.5-.6.8-1.1.8H4.9c-.5 0-.9-.3-1.1-.8z"/>' },
  { id: 'martelo', nome: 'Martelo', assunto: 'trabalho', desenho: '<path d="M5.6 4.8h8.8c2 0 3.6 1.4 4 3.4H5.6z"/><path d="M10.6 8.2v11.2c0 .6.5 1 1 1h.8c.6 0 1-.4 1-1V8.2"/>' },
  { id: 'predio', nome: 'Prédio', assunto: 'trabalho', desenho: '<path d="M4.6 20.4V5.2c0-.6.4-1 1-1h7c.6 0 1 .4 1 1v15.2"/><path d="M13.6 10.4h4.8c.6 0 1 .4 1 1v9"/><path d="M3 20.4h18"/><path d="M7.6 8h.01M10.6 8h.01M7.6 11.6h.01M10.6 11.6h.01M7.6 15.2h.01M10.6 15.2h.01M16.5 14h.01M16.5 17.2h.01" stroke-width="2.2"/>' },
  // Escola
  { id: 'lapis', nome: 'Lápis', assunto: 'escola', desenho: '<path d="M4 20l1.2-4.6L16.4 4.2c.8-.8 2-.8 2.8 0l.6.6c.8.8.8 2 0 2.8L8.6 18.8z"/><path d="M5.2 15.4l3.4 3.4M14.6 6l3.4 3.4"/>' },
  { id: 'mochila', nome: 'Mochila', assunto: 'escola', desenho: '<path d="M5.6 20.6V11c0-3.5 2.9-6.4 6.4-6.4s6.4 2.9 6.4 6.4v9.6z"/><path d="M8.6 20.6v-5c0-.6.4-1 1-1h4.8c.6 0 1 .4 1 1v5"/><path d="M10 4.9V3.8c0-.4.3-.6.6-.6h2.8c.3 0 .6.2.6.6v1.1"/><path d="M9.4 10.2h5.2"/>' },
  { id: 'lousa', nome: 'Lousa', assunto: 'escola', desenho: '<path d="M3.6 5h16.8v10.6H3.6z"/><path d="M8.4 20.2l1.6-4.6M15.6 20.2L14 15.6"/><path d="M7 9.2h5.4M7 12h3"/>' },
  { id: 'diploma', nome: 'Diploma', assunto: 'escola', desenho: '<path d="M12.6 16.6H4.4V4.6h15.2v6.8"/><path d="M7.6 8.2h8.8M7.6 11.4h4"/><circle cx="17" cy="15.4" r="2.6"/><path d="M15.6 17.8v3l1.4-1 1.4 1v-3"/>' },
  // Saúde
  { id: 'curativo', nome: 'Curativo', assunto: 'saude', desenho: '<path d="M4.3 15.2L15.2 4.3c1.2-1.2 3.3-1.2 4.5 0s1.2 3.3 0 4.5L8.8 19.7c-1.2 1.2-3.3 1.2-4.5 0s-1.2-3.3 0-4.5z"/><path d="M8.2 11.3l4.5 4.5M11.3 8.2l4.5 4.5"/><path d="M12 12h.01" stroke-width="2.2"/>' },
  { id: 'estetoscopio', nome: 'Estetoscópio', assunto: 'saude', desenho: '<path d="M6 4.2H5c-.4 0-.8.4-.8.8v4.6c0 2.6 2 4.6 4.6 4.6s4.6-2 4.6-4.6V5c0-.4-.4-.8-.8-.8h-1"/><path d="M8.8 14.2v1.6c0 2.6 2 4.6 4.5 4.6s4.5-2 4.5-4.6V14"/><circle cx="17.8" cy="11.6" r="2.4"/>' },
  { id: 'termometro', nome: 'Termômetro', assunto: 'saude', desenho: '<path d="M9.8 13.6V5.6c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2v8c1.1.7 1.8 1.9 1.8 3.2 0 2.2-1.8 4-4 4s-4-1.8-4-4c0-1.3.7-2.5 1.8-3.2z"/><path d="M12 16.8V9.4"/><path d="M12 16.8h.01" stroke-width="2.2"/><path d="M16.6 6.2h2M16.6 9.4h2"/>' },
  { id: 'dente', nome: 'Dente', assunto: 'saude', desenho: '<path d="M12 6.6c-1.4-1.2-2.6-1.8-4-1.8-2 0-3.4 1.6-3.4 3.8 0 1.6.6 2.6 1 4.2.5 2 .6 4.2 1.2 5.8.3.8.9 1.2 1.5 1.2.8 0 1.2-.6 1.4-1.6.4-2 .8-3.6 2.3-3.6s1.9 1.6 2.3 3.6c.2 1 .6 1.6 1.4 1.6.6 0 1.2-.4 1.5-1.2.6-1.6.7-3.8 1.2-5.8.4-1.6 1-2.6 1-4.2 0-2.2-1.4-3.8-3.4-3.8-1.4 0-2.6.6-4 1.8z"/>' },
  // Bichinhos
  { id: 'cachorro', nome: 'Cachorro', assunto: 'bichos', desenho: '<path d="M7.6 5.4c1.3-.6 2.8-.9 4.4-.9s3.1.3 4.4.9"/><path d="M7.6 5.4C5.4 5 3.8 6.4 3.8 8.6v3.6c0 1 .8 1.6 1.6 1.2 1-.4 1.6-1.4 1.8-2.6"/><path d="M16.4 5.4c2.2-.4 3.8 1 3.8 3.2v3.6c0 1-.8 1.6-1.6 1.2-1-.4-1.6-1.4-1.8-2.6"/><path d="M7.2 10.8v2.8c0 3.4 2 6 4.8 6s4.8-2.6 4.8-6v-2.8"/><path d="M9.8 10.6h.01M14.2 10.6h.01" stroke-width="2.2"/><path d="M11 14.2h2l-1 1.2z"/>' },
  { id: 'gato', nome: 'Gato', assunto: 'bichos', desenho: '<path d="M5 4.6l1 5.2c-.9 1.2-1.4 2.6-1.4 4 0 3.6 3.2 6 7.4 6s7.4-2.4 7.4-6c0-1.4-.5-2.8-1.4-4l1-5.2-4.4 2.6c-.8-.3-1.7-.4-2.6-.4s-1.8.1-2.6.4z"/><path d="M9.4 12.8h.01M14.6 12.8h.01" stroke-width="2.2"/><path d="M11.2 15.4h1.6l-.8 1z"/>' },
  { id: 'passarinho', nome: 'Passarinho', assunto: 'bichos', desenho: '<path d="M19 9.8c0-2.8-2.2-5-5-5s-5 2.2-5 5v.6L3.4 16c1.6 1.6 4 2.6 6.8 2.6 4.8 0 8.8-3.6 8.8-8.8z"/><path d="M19 9l2.2.8-2.2.9"/><path d="M15 8.8h.01" stroke-width="2.2"/><path d="M9.6 12.8c1.4 1.4 3.2 1.6 5 .6"/><path d="M11 18.6v2M13.6 18.2v2.4"/>' },
  { id: 'osso', nome: 'Osso', assunto: 'bichos', desenho: '<path d="M7.6 10.4h8.8c-.5-1.5.5-3 2-3 1.2 0 2.2 1 2.2 2.2 0 1-.6 1.8-1.4 2.1v.6c.8.3 1.4 1.1 1.4 2.1 0 1.2-1 2.2-2.2 2.2-1.5 0-2.5-1.5-2-3H7.6c.5 1.5-.5 3-2 3-1.2 0-2.2-1-2.2-2.2 0-1 .6-1.8 1.4-2.1v-.6c-.8-.3-1.4-1.1-1.4-2.1 0-1.2 1-2.2 2.2-2.2 1.5 0 2.5 1.5 2 3z"/>' },
  { id: 'borboleta', nome: 'Borboleta', assunto: 'bichos', desenho: '<path d="M12 7.6v10.8"/><path d="M12 9.6C10.4 6.6 8 5 5.6 5.2c-1.6.2-2.2 1.6-1.8 3.4.5 2.4 2.4 3.9 5 4-1.9.5-2.9 1.9-2.6 3.6.3 1.6 1.6 2.4 3 2 1.5-.4 2.4-1.8 2.8-3.8"/><path d="M12 9.6c1.6-3 4-4.6 6.4-4.4 1.6.2 2.2 1.6 1.8 3.4-.5 2.4-2.4 3.9-5 4 1.9.5 2.9 1.9 2.6 3.6-.3 1.6-1.6 2.4-3 2-1.5-.4-2.4-1.8-2.8-3.8"/><path d="M10.6 4.4l1.4 3.2 1.4-3.2"/>' },
  // Viagens
  { id: 'mala', nome: 'Mala', assunto: 'viagens', desenho: '<path d="M5.4 8.4c0-.8.6-1.4 1.4-1.4h10.4c.8 0 1.4.6 1.4 1.4v9.4c0 .8-.6 1.4-1.4 1.4H6.8c-.8 0-1.4-.6-1.4-1.4z"/><path d="M9.4 7V4.6c0-.5.4-.8.8-.8h3.6c.5 0 .8.4.8.8V7"/><path d="M9.4 10.4v5.4M14.6 10.4v5.4"/><path d="M8 19.2v1.4M16 19.2v1.4"/>' },
  { id: 'lugar', nome: 'Marcador de lugar', assunto: 'viagens', desenho: '<path d="M12 20.6c-4-4.4-6-7.6-6-10.4 0-3.4 2.6-6 6-6s6 2.6 6 6c0 2.8-2 6-6 10.4z"/><circle cx="12" cy="10.2" r="2.2"/>' },
  { id: 'bussola', nome: 'Bússola', assunto: 'viagens', desenho: '<circle cx="12" cy="12" r="8.2"/><path d="M15.4 8.6l-1.8 5-5 1.8 1.8-5z"/>' },
  { id: 'veleiro', nome: 'Veleiro', assunto: 'viagens', desenho: '<path d="M3.6 15.8h16.8c-.8 2.6-2.6 4-5 4H8.6c-2.4 0-4.2-1.4-5-4z"/><path d="M11.4 15.8V3.8c3.6 2.2 6 5.2 7 9.2h-7"/><path d="M9 13V7.4C7.4 9 6.4 10.8 6 13z"/>' },
  { id: 'globo', nome: 'Globo', assunto: 'viagens', desenho: '<circle cx="12" cy="12" r="8.2"/><path d="M3.8 12h16.4"/><path d="M12 3.8c-2.2 2.2-3.4 5-3.4 8.2s1.2 6 3.4 8.2c2.2-2.2 3.4-5 3.4-8.2s-1.2-6-3.4-8.2z"/>' },
  // Comida
  { id: 'panela', nome: 'Panela', assunto: 'comida', desenho: '<path d="M5.4 10.6h13.2v6.2c0 1.5-1.2 2.8-2.8 2.8H8.2c-1.5 0-2.8-1.2-2.8-2.8z"/><path d="M5.4 12.6H3M18.6 12.6H21"/><path d="M6.6 10.6c.6-2.2 2.8-3.6 5.4-3.6s4.8 1.4 5.4 3.6"/><path d="M12 7V5.2"/>' },
  { id: 'pizza', nome: 'Fatia de pizza', assunto: 'comida', desenho: '<path d="M4.2 7.4c2.4-1.6 5-2.4 7.8-2.4s5.4.8 7.8 2.4L12 20.6z"/><path d="M5.6 10c2-1.2 4.2-1.8 6.4-1.8s4.4.6 6.4 1.8"/><path d="M10.4 12.6h.01M13.8 13.2h.01M12 16.4h.01" stroke-width="2.2"/>' },
  { id: 'sorvete', nome: 'Sorvete', assunto: 'comida', desenho: '<path d="M7.2 11.2L12 20.8l4.8-9.6"/><path d="M6.4 11.2c-.3-.6-.4-1.2-.4-1.9 0-3.3 2.7-5.9 6-5.9s6 2.6 6 5.9c0 .7-.1 1.3-.4 1.9z"/><path d="M9.6 15.4l4.2-4.2"/>' },
  { id: 'maca', nome: 'Maçã', assunto: 'comida', desenho: '<path d="M12 8.2c-1.4-1-2.8-1.3-4.2-.9-2.2.6-3.6 2.8-3.6 5.4 0 3.8 2.4 7.6 5 7.6 1 0 1.8-.5 2.8-.5s1.8.5 2.8.5c2.6 0 5-3.8 5-7.6 0-2.6-1.4-4.8-3.6-5.4-1.4-.4-2.8-.1-4.2.9z"/><path d="M12 8.2V5.8"/><path d="M12 5.8c.4-1.6 1.8-2.6 3.8-2.4-.2 1.8-1.6 2.8-3.8 2.4z"/>' },
  { id: 'cozinheiro', nome: 'Chapéu de cozinheiro', assunto: 'comida', desenho: '<path d="M7.4 14.4c-2-.4-3.6-2.1-3.6-4.2 0-2.3 1.9-4.2 4.2-4.2.3 0 .6 0 .9.1C9.5 4.8 10.7 4 12 4s2.5.8 3.1 2.1c.3-.1.6-.1.9-.1 2.3 0 4.2 1.9 4.2 4.2 0 2.1-1.6 3.8-3.6 4.2v5.2H7.4z"/><path d="M7.4 16.8h9.2"/>' },
  // Música
  { id: 'violao', nome: 'Violão', assunto: 'musica', desenho: '<path d="M13.6 8.4c1.4.6 2.4 1.9 2.4 3.4 0 1.2-.6 1.8-1.4 2.4-.8.6-1 1.2-1 2.2 0 2.4-2.2 4.2-5 4.2-2.9 0-5.2-2.3-5.2-5.2 0-2.8 1.8-5 4.2-5 1 0 1.6-.2 2.2-1 .6-.8 1.2-1.4 2.4-1.4.5 0 1 .1 1.4.4z"/><path d="M14.4 9.6l5-5M18 3.2l2.8 2.8"/><circle cx="9.4" cy="14.6" r="1.4"/>' },
  { id: 'microfone', nome: 'Microfone', assunto: 'musica', desenho: '<path d="M9 7c0-1.7 1.3-3 3-3s3 1.3 3 3v4.6c0 1.7-1.3 3-3 3s-3-1.3-3-3z"/><path d="M5.8 11.4c0 3.4 2.8 6.2 6.2 6.2s6.2-2.8 6.2-6.2"/><path d="M12 17.6v3M8.8 20.6h6.4"/>' },
  { id: 'fones', nome: 'Fones de ouvido', assunto: 'musica', desenho: '<path d="M4.6 15.4V12c0-4.1 3.3-7.4 7.4-7.4s7.4 3.3 7.4 7.4v3.4"/><path d="M4.6 14.2h1.8c.7 0 1.2.5 1.2 1.2v3c0 .7-.5 1.2-1.2 1.2h-.6c-.7 0-1.2-.5-1.2-1.2z"/><path d="M19.4 14.2h-1.8c-.7 0-1.2.5-1.2 1.2v3c0 .7.5 1.2 1.2 1.2h.6c.7 0 1.2-.5 1.2-1.2z"/>' },
  { id: 'disco', nome: 'Disco', assunto: 'musica', desenho: '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="2.4"/><path d="M6.8 12c0-2.9 2.3-5.2 5.2-5.2M17.2 12c0 2.9-2.3 5.2-5.2 5.2"/>' },
  // Esporte
  { id: 'trofeu', nome: 'Troféu', assunto: 'esporte', desenho: '<path d="M7.6 4.4h8.8v4.8c0 2.4-2 4.4-4.4 4.4s-4.4-2-4.4-4.4z"/><path d="M7.6 6H4.8c0 2.6 1.2 4.2 3.2 4.6M16.4 6h2.8c0 2.6-1.2 4.2-3.2 4.6"/><path d="M12 13.6v3.2M8.4 20h7.2M9.6 20c0-1.8 1-3.2 2.4-3.2s2.4 1.4 2.4 3.2"/>' },
  { id: 'medalha', nome: 'Medalha', assunto: 'esporte', desenho: '<circle cx="12" cy="15.2" r="4.8"/><path d="M9.2 11.2L6 3.8M14.8 11.2L18 3.8M10.2 3.8l1.8 4.2 1.8-4.2"/><circle cx="12" cy="15.2" r="1.6"/>' },
  { id: 'bicicleta', nome: 'Bicicleta', assunto: 'esporte', desenho: '<circle cx="6.2" cy="15.6" r="3.6"/><circle cx="17.8" cy="15.6" r="3.6"/><path d="M6.2 15.6l3.2-6.4h5.8l2.6 6.4M9.4 9.2l3.2 6.4 2.6-6.4M9.4 9.2l-.7-2.2M7.6 7h2.6M15.2 9.2l-.8-2.4h2.2"/>' },
  { id: 'tenis', nome: 'Tênis', assunto: 'esporte', desenho: '<path d="M3.6 18.6V8.8c1.8.900 3.4.700 4.6-.6l4.8 4.6 4.8 1.2c1.6.400 2.6 1.6 2.6 3.2v1.4z"/><path d="M3.6 15.6h16.4"/><path d="M10 10l-1.5 1.5M12 12l-1.5 1.5"/>' },
  { id: 'haltere', nome: 'Haltere', assunto: 'esporte', desenho: '<path d="M8.4 12h7.2"/><path d="M6.8 7.4c.9 0 1.6.7 1.6 1.6v6c0 .9-.7 1.6-1.6 1.6s-1.6-.7-1.6-1.6V9c0-.9.7-1.6 1.6-1.6z"/><path d="M17.2 7.4c.9 0 1.6.7 1.6 1.6v6c0 .9-.7 1.6-1.6 1.6s-1.6-.7-1.6-1.6V9c0-.9.7-1.6 1.6-1.6z"/><path d="M2.8 10.4v3.2M21.2 10.4v3.2"/>' },
  // Fé: símbolos neutros, sem privilegiar uma religião
  { id: 'vela', nome: 'Vela', assunto: 'fe', desenho: '<path d="M9 20.4V11.4c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v9"/><path d="M6.6 20.4h10.8"/><path d="M12 10.4V8.8"/><path d="M12 7.4c-1.4-1.2-1.2-2.6 0-4 1.2 1.4 1.4 2.8 0 4z"/>' },
  { id: 'maos', nome: 'Mãos unidas', assunto: 'fe', desenho: '<path d="M12 3.8c-1.2 1.6-1.8 3.4-1.8 5.6v3.4L7 16c-.5.5-.6 1.3-.2 1.9l1.8 2.7"/><path d="M12 3.8c1.2 1.6 1.8 3.4 1.8 5.6v3.4L17 16c.5.5.6 1.3.2 1.9l-1.8 2.7"/><path d="M12 3.8v12.4"/>' },
  { id: 'pomba', nome: 'Pomba', assunto: 'fe', desenho: '<path d="M3.4 9.6l3-.9c.8-1.6 2.2-2.5 3.8-2.5 1.2 0 2.2.5 3 1.4l1.6 2 5.8-4.4c.2 4-1.2 7-4.2 8.8l-1.2 4.4-3.4-2.6c-3.4.2-5.8-1.8-6.2-5.2z"/><path d="M9.4 9.4h.01" stroke-width="2.2"/>' },
  { id: 'livrofita', nome: 'Livro com fita', assunto: 'fe', desenho: '<path d="M6 4.4h10.6c.8 0 1.4.6 1.4 1.4v13.8H7.6c-.9 0-1.6-.7-1.6-1.6z"/><path d="M6 18c0-.9.7-1.6 1.6-1.6H18"/><path d="M13 4.4v6.4l-1.6-1.2-1.6 1.2V4.4"/>' },
  { id: 'ramo', nome: 'Ramo', assunto: 'fe', desenho: '<path d="M4.8 19.2L16 8"/><path d="M16 8c-.2-2.4 1.2-4 3.8-4.2.2 2.6-1.4 4-3.8 4.2z"/><path d="M8.4 15.6c-2-.8-3-2.6-2.6-5 2.2.8 3.2 2.6 2.6 5z"/><path d="M12.2 11.8c-2-.8-3-2.6-2.6-5 2.2.8 3.2 2.6 2.6 5z"/><path d="M10.4 13.6c.8 2 2.6 3 5 2.6-.8-2.2-2.6-3.2-5-2.6z"/><path d="M14.2 9.8c.8 2 2.6 3 5 2.6-.8-2.2-2.6-3.2-5-2.6z"/>' },
  // Festas
  { id: 'bandeirinhas', nome: 'Bandeirinhas', assunto: 'festas', desenho: '<path d="M2.8 6.6c6 3 12.4 3 18.4 0"/><path d="M4.8 7.8l1.8 7 3.2-5.4M9.8 9.4L12 16.8l2.2-7.4M14.2 9.4l3.2 5.4 1.8-7"/>' },
  { id: 'chapeuzinho', nome: 'Chapéu de festa', assunto: 'festas', desenho: '<path d="M12 6.2L5.8 19.4c2 .8 4 1.2 6.2 1.2s4.2-.4 6.2-1.2z"/><circle cx="12" cy="4.4" r="1.6"/><path d="M9.6 11.4c1.6.6 3.2.6 4.8 0M7.8 15.4c2.8 1 5.6 1 8.4 0"/>' },
  { id: 'fogos', nome: 'Fogos', assunto: 'festas', desenho: '<path d="M12 7.6V4.8M12 13.4v2.8M9.1 10.5H6.3M17.7 10.5h-2.8M9.9 8.4L8 6.5M14.1 12.6l1.9 1.9M14.1 8.4L16 6.5M9.9 12.6L8 14.5"/><path d="M5 4.2h.01M19 4.2h.01M4 13.6h.01M20 13.6h.01" stroke-width="2.2"/><path d="M12 17.4v3.2"/>' },
  { id: 'fogueira', nome: 'Fogueira', assunto: 'festas', desenho: '<path d="M12 3.8c.6 2.4 3.8 4 3.8 7.4 0 2.2-1.7 3.8-3.8 3.8s-3.8-1.6-3.8-3.8c0-1.4.6-2.4 1.6-3.4.2 1 .7 1.6 1.4 1.8-.4-2 0-4 .8-5.8z"/><path d="M5 17.2l14 3.4M19 17.2L5 20.6"/>' },
  { id: 'mascara', nome: 'Máscara de carnaval', assunto: 'festas', desenho: '<path d="M3.6 9.4c2.6-1.4 5.4-1.2 8.4.6 3-1.8 5.8-2 8.4-.6-.2 4.2-2.2 6.8-5 6.8-1.6 0-2.6-.8-3.4-2-.8 1.2-1.8 2-3.4 2-2.8 0-4.8-2.6-5-6.8z"/><path d="M7 12c.8-.6 1.8-.6 2.8.2M17 12c-.8-.6-1.8-.6-2.8.2"/>' },
];

/** O rabisco de quem não tem um: o brilho. */
export const RABISCO_PADRAO = 'outro';

/** Os rabiscos arrumados por assunto, na ordem dos assuntos; dentro de cada um, na ordem da lista. */
export function rabiscosPorAssunto(): { id: Assunto; nome: string; rabiscos: Rabisco[] }[] {
  return ASSUNTOS.map((a) => ({ id: a.id, nome: a.nome, rabiscos: RABISCOS.filter((r) => r.assunto === a.id) }));
}

export const ehRabisco = (id: string | null | undefined): boolean => RABISCOS.some((r) => r.id === id);

export function rabisco(id: string | null | undefined): Rabisco {
  return RABISCOS.find((r) => r.id === id) ?? RABISCOS.find((r) => r.id === RABISCO_PADRAO)!;
}
