// Os três tipos de momento de exemplo (resposta do Gui à P166). Ficam fora de semente.ts, que lê o
// ambiente do Cloudflare, para os testes poderem conferir as cores sem subir o servidor.
export const TIPOS_DE_EXEMPLO: { id: string; rotulo: string; cor: string; icone: string }[] = [
  { id: 'formatura', rotulo: 'Formatura', cor: 'anil', icone: 'formatura' },
  { id: 'praia', rotulo: 'Praia', cor: 'ceu', icone: 'praia' },
  { id: 'bichos', rotulo: 'Bichos', cor: 'terracota', icone: 'patinha' },
];
