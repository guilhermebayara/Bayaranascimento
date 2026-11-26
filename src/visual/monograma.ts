// Gerado por "npm run monograma" (scripts/monograma.mjs). Não edite à mão.
// O M de Memórias em cada serifa do sistema, numa caixa de altura 100. "normal" é o desenho de
// título; "pequeno" é o mesmo M engrossado para ler em 16 px ("traco" é o contorno que o engrossa).
export interface CorteDoMonograma {
  d: string;
  largura: number;
  altura: number;
  traco: number;
}

export const MONOGRAMAS: Record<'c', { normal: CorteDoMonograma; pequeno: CorteDoMonograma }> = {
  "c": {
    "normal": {
      "d": "M0 100L0 98.5L3 97.4Q8.2 95.8 8.2 88.8L8.2 11.2Q8.2 8.2 7.5 6.4Q6.8 4.5 3.9 3.3L0 1.5L0 0L29.2 0L57.3 73.3L83.6 0L113.5 0L113.5 1.5L111.1 2.4Q108.2 3.5 107.1 5.4Q106.1 7.3 106.1 10.3L106.1 89.5Q106.1 92.6 106.8 94.2Q107.6 95.9 110.5 97.1L113.5 98.5L113.5 100L75.8 100L75.8 98.5L78.9 97.1Q81.8 95.9 82.6 94.2Q83.3 92.6 83.3 89.5L83.3 55.5L83.6 12.1L52 100L44.4 100L11.4 13.2L11.8 50.9L11.8 89.1Q11.8 92.4 12.8 94.5Q13.8 96.5 16.7 97.4L20 98.5L20 100Z",
      "largura": 113.5,
      "altura": 100,
      "traco": 0
    },
    "pequeno": {
      "d": "M1.1 101.1L1.1 99.6L4.1 98.5Q9.3 96.9 9.3 89.9L9.3 12.3Q9.3 9.3 8.6 7.5Q7.9 5.6 5 4.4L1.1 2.6L1.1 1.1L30.3 1.1L58.4 74.4L84.7 1.1L114.6 1.1L114.6 2.6L112.2 3.5Q109.3 4.6 108.2 6.5Q107.2 8.4 107.2 11.4L107.2 90.6Q107.2 93.7 107.9 95.3Q108.7 97 111.6 98.2L114.6 99.6L114.6 101.1L76.9 101.1L76.9 99.6L80 98.2Q82.9 97 83.7 95.3Q84.4 93.7 84.4 90.6L84.4 56.6L84.7 13.2L53.1 101.1L45.5 101.1L12.5 14.3L12.9 52L12.9 90.2Q12.9 93.5 13.9 95.6Q14.9 97.6 17.8 98.5L21.1 99.6L21.1 101.1Z",
      "largura": 115.7,
      "altura": 102.2,
      "traco": 2.2
    }
  }
};
