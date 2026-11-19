// A transcrição automática no servidor (src/lib/transcricao.ts): se ela está ligada, quanto já foi usado
// hoje e a chamada ao modelo. Nada aqui roda sem o binding "AI" e o ajuste ligado.
import { AJUSTE_DA_TRANSCRICAO, chaveDoUso, situacaoDaTranscricao, type SituacaoDaTranscricao } from '../transcricao';
import { modeloDeTranscricao } from './ambiente';
import { lerAjuste } from './repositorio';

export async function situacaoDaTranscricaoAgora(): Promise<SituacaoDaTranscricao> {
  return situacaoDaTranscricao(Boolean(modeloDeTranscricao()), (await lerAjuste(AJUSTE_DA_TRANSCRICAO)) === true);
}

/** Os minutos transcritos hoje, pela anotação do dia. */
export async function minutosUsadosHoje(hoje = new Date()): Promise<number> {
  const valor = await lerAjuste(chaveDoUso(hoje));
  return typeof valor === 'number' ? valor : 0;
}
