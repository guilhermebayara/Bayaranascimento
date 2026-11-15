// Tipos de marco. Para criar um novo, adicione uma linha aqui.
export const TIPOS = {
  nascimento: { rotulo: 'Nascimento', cor: '#2F7D6B' },
  aniversario: { rotulo: 'Aniversário', cor: '#D6455B' },
  casamento: { rotulo: 'Casamento', cor: '#8A5BB5' },
  conquista: { rotulo: 'Conquista', cor: '#C98A00' },
  viagem: { rotulo: 'Viagem', cor: '#2B74B8' },
  casa: { rotulo: 'Casa', cor: '#A8572E' },
  festa: { rotulo: 'Festa', cor: '#D2478F' },
  causo: { rotulo: 'Causo', cor: '#4E7F1E' },
  cotidiano: { rotulo: 'Dia a dia', cor: '#5B6B7A' },
  despedida: { rotulo: 'Despedida', cor: '#3D4A66' },
} as const;

export type TipoId = keyof typeof TIPOS;

export const TIPOS_IDS = Object.keys(TIPOS) as [TipoId, ...TipoId[]];
