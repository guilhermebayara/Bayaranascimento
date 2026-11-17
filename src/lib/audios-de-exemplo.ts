// Áudios de exemplo (decisão do Gui, 17/11/2026, P102 do QA de design): três áudios curtos de voz
// sintetizada, nunca de ninguém real, para o bloco "A voz de Fulano" aparecer no acervo de exemplo.
// Seguem as regras das fotos de exemplo (src/lib/fotos-de-exemplo.ts):
// - os arquivos ficam em exemplos/audios/, fora de src/ e de public/, e nunca entram no site publicado;
// - chegam ao bucket de teste pelo mesmo envio das fotos (scripts/enviar-fotos-de-exemplo.mjs), que só
//   aceita estes arquivos, conferidos pelo SHA-256;
// - só o banco e o bucket de teste os recebem: a semente roda dentro da proteção das memórias de exemplo,
//   e a homologação e a produção nem servem a chave de um áudio de exemplo.
// A voz foi gerada com o espeak-ng (pt-br), e o texto falado começa por "Áudio de exemplo, com voz
// sintetizada", para ninguém confundir com uma gravação de verdade.

export interface AudioDeExemplo {
  nome: string;
  /** SHA-256 do arquivo em exemplos/audios/: só ele entra no bucket com esse nome */
  sha256: string;
  tamanho: number;
  /** segundos */
  duracao: number;
  /** a memória e quem conta: o áudio entra no relato publicado dessa pessoa nessa memória */
  memoria: string;
  por: string;
  /** o que a voz diz, que vira a transcrição */
  transcricao: string;
}

export const AUDIOS_DE_EXEMPLO: AudioDeExemplo[] = [
  {
    nome: 'vo-bela-canja.m4a',
    sha256: 'f04505db860f06bd3e4a3c3a8c07b2921845ae3ac5282a1347c6b0044d272a73',
    tamanho: 50101,
    duracao: 11.7,
    memoria: '1992-chegada-do-gui',
    por: 'vo-bela',
    transcricao: 'Áudio de exemplo, com voz sintetizada. Eu fiz canja para o hospital inteiro. As enfermeiras pediam mais, e eu ia buscando panela em casa.',
  },
  {
    nome: 'vo-bela-pao-de-queijo.m4a',
    sha256: '25bd51bde3f5994889177392025bdd77dde5c7f68f3a06dff2533610a34d0c2a',
    tamanho: 57547,
    duracao: 13.5,
    memoria: '2026-pao-de-queijo-da-vo-bela',
    por: 'vo-bela',
    transcricao: 'Áudio de exemplo, com voz sintetizada. Polvilho azedo, queijo da Canastra e paciência. O leite, você põe até ficar bom. Não tem medida, tem olho.',
  },
  {
    nome: 'vo-vivica-chuva.m4a',
    sha256: '1581a42cf42b90f20cbc14c6f29670cbeced3b8ed5a5f5e555ca7dba59bdbe52',
    tamanho: 46401,
    duracao: 10.9,
    memoria: '1958-casamento-vivica-tonho',
    por: 'vo-vivica',
    transcricao: 'Áudio de exemplo, com voz sintetizada. Choveu a manhã inteira. Meia hora antes da igreja, parou. Eu achei que era um recado.',
  },
];

/** O tipo de todos os áudios de exemplo: M4A, que o Safari do iPhone toca. */
export const TIPO_DOS_AUDIOS_DE_EXEMPLO = 'audio/mp4';

/** A pasta dos áudios de exemplo, dentro de "audios/" no bucket de teste. */
export const PASTA_DOS_AUDIOS_DE_EXEMPLO = 'exemplos/';

/** Chave de um áudio de exemplo no banco: "exemplos/vo-bela-canja.m4a". No bucket, debaixo de "audios/". */
export const chaveDeAudioDeExemplo = (nome: string) => `${PASTA_DOS_AUDIOS_DE_EXEMPLO}${nome}`;

const NOMES = new Set(AUDIOS_DE_EXEMPLO.map((a) => a.nome));

/** É a chave de um dos áudios de exemplo? Só essas passam pela rota /audios/ como exemplo. */
export function ehChaveDeAudioDeExemplo(chave: string): boolean {
  return chave.startsWith(PASTA_DOS_AUDIOS_DE_EXEMPLO) && NOMES.has(chave.slice(PASTA_DOS_AUDIOS_DE_EXEMPLO.length));
}
