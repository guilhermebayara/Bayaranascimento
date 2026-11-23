// O relato como conversa, do banco para a tela (regras em src/lib/conversa.ts): as mensagens de cada
// relato de uma memória, com os áudios, as fotos e as citações resolvidas para quem olha. Serve à página
// da memória e à janela de escrever. Só cita o que quem olha vê: os relatos chegam já filtrados
// (listarRelatos passa por veORelato), e a citação de uma mensagem fora deles some.
import { mensagensNaTela, resumoDaMensagem, type Mensagem, type MensagemNaTela } from '../conversa';
import { listarAudiosDosRelatos, listarMensagensDosRelatos, type Relato } from './repositorio';
import type { Copias } from '../copias-das-fotos';

export async function conversaDosRelatos(
  relatos: Pick<Relato, 'id' | 'texto' | 'por'>[],
  fotos: readonly { id: number; chave: string; legenda: string | null; relatoId?: number | null; copias?: Copias | null }[],
  nome: (id: string) => string,
  /** para a foto abrir a galeria da memória: a posição dela entre as fotos da memória */
  galeriaDe?: (fotoId: number) => number | undefined,
  /** relatos de onde as citações podem vir (quem olha vê), além dos de `relatos` */
  daMemoria: Pick<Relato, 'id' | 'texto' | 'por'>[] = relatos,
): Promise<Map<number, MensagemNaTela[]>> {
  const todos = [...new Map([...relatos, ...daMemoria].map((r) => [r.id, r])).values()];
  const [mensagens, audios] = await Promise.all([listarMensagensDosRelatos(todos), listarAudiosDosRelatos(todos.map((r) => r.id))]);
  const porMensagem = new Map<number, { por: string; m: Mensagem }>();
  for (const r of todos) for (const m of mensagens.get(r.id) ?? []) if (m.id) porMensagem.set(m.id, { por: r.por, m });
  const citada = (id: number) => {
    const c = porMensagem.get(id);
    return c ? { quem: nome(c.por), resumo: resumoDaMensagem(c.m) } : undefined;
  };
  const audiosPorId = new Map([...audios.values()].flat().map((a) => [a.id, { chave: a.chave, duracao: a.duracao, transcricao: a.transcricao }]));
  const fotosPorId = new Map(fotos.map((f) => [f.id, { chave: f.chave, legenda: f.legenda, copias: f.copias ?? null, ...(galeriaDe?.(f.id) !== undefined ? { galeria: galeriaDe(f.id) } : {}) }]));
  return new Map(relatos.map((r) => [r.id, mensagensNaTela(mensagens.get(r.id) ?? [], audiosPorId, fotosPorId, citada)]));
}
