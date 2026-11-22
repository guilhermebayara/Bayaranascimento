// Quando nasce um aviso (docs/decisoes.md, "Avisos"). As regras de quem recebe estão em src/lib/avisos.ts;
// aqui elas encontram o banco: quem tem login, quem já entrou e quem vê a memória.
import { quemRecebeQuemEstava, quemRecebeRelatoNovo, type Destinatarios } from '../avisos';
import { pessoasComAcesso } from './acesso';
import { podeVerMemoria, type AcessoDaMemoria, type Publico, type PublicoConhecido, type Usuario } from './permissoes';
import { ajustarRelatosAoPublico, criarAvisos, listarIntegrantes, listarNucleos, quemJaEntrou, type Relato } from './repositorio';

async function destinatarios(autor: string): Promise<Destinatarios> {
  const [comAcesso, jaEntraram] = await Promise.all([pessoasComAcesso(), quemJaEntrou()]);
  return { comAcesso, jaEntraram, autor };
}

/** Só recebe quem vê a memória: ser citado não dá acesso a uma memória restrita. */
async function soQuemVe(pessoas: string[], memoria: AcessoDaMemoria): Promise<string[]> {
  if (pessoas.length === 0) return [];
  const integrantes = await listarIntegrantes();
  return pessoas.filter((p) => {
    const i = integrantes.find((x) => x.id === p);
    const usuario: Usuario = { pessoa: p, nome: '', admin: false, nucleos: i?.nucleos ?? [] };
    return Boolean(i) && podeVerMemoria(usuario, memoria);
  });
}

/** Um relato acabou de ser publicado numa memória publicada: avisa quem criou a memória e quem estava nela. */
export async function avisarRelatoNovo(memoria: AcessoDaMemoria & { id: string }, relato: { id: number; por: string; registradoPor: string }, autor: Usuario): Promise<void> {
  if (memoria.situacao !== 'publicada') return;
  const para = await soQuemVe(quemRecebeRelatoNovo(memoria, relato, await destinatarios(autor.pessoa)), memoria);
  await criarAvisos(para.map((p) => ({ para: p, tipo: 'relato-novo', memoriaId: memoria.id, relatoId: relato.id, de: autor.pessoa })));
}

/**
 * A memória foi publicada ou corrigida: avisa quem entrou agora em "Quem estava". `antes` são os marcados
 * da versão publicada anterior; numa memória que acabou de sair do rascunho, ninguém.
 */
export async function avisarQuemEstava(memoria: AcessoDaMemoria & { id: string }, antes: string[], autor: Usuario): Promise<void> {
  if (memoria.situacao !== 'publicada') return;
  const para = await soQuemVe(quemRecebeQuemEstava(antes, memoria.integrantes, await destinatarios(autor.pessoa)), memoria);
  await criarAvisos(para.map((p) => ({ para: p, tipo: 'quem-estava', memoriaId: memoria.id, de: autor.pessoa })));
}

/** Para quem a memória passou a ser visível, como o pedido diz: "toda a família", "a família Bracarense". */
export function paraQuemPassouAVer(antes: Publico, depois: Publico, nomes: { id: string; nome: string }[]): string {
  if (depois.visibilidade === 'todos') return 'toda a família';
  const novos = depois.nucleos.filter((n) => !antes.nucleos.includes(n)).map((n) => nomes.find((x) => x.id === n)?.nome ?? n);
  if (novos.length === 1) return `a família ${novos[0]}`;
  return `as famílias ${novos.slice(0, -1).join(', ')} e ${novos.at(-1)}`;
}

/**
 * Quem criou a memória mudou quem vê. Ao ampliar, o relato que o público novo nunca viu fica só para quem
 * já o viu, e quem o registrou recebe o pedido para liberar (vale mesmo antes do primeiro acesso), dizendo
 * para quem a memória passou a ser visível do ponto de vista do relato. O relato que já teve o público
 * novo volta a acompanhar a memória sem pedido (resposta do Gui à P3 do QA de 23/11/2026). Ao restringir,
 * nada é pedido, e as esperas que perderam o sentido se desfazem. Devolve os relatos publicados que
 * passaram a esperar.
 */
export async function mudouQuemVe(memoriaId: string, antes: Publico, depois: Publico, quem: Usuario, criadaPor: string): Promise<Relato[]> {
  // "Quem ampliou não espera" vale só para quem criou, a única pessoa que muda quem vê
  const esperam = await ajustarRelatosAoPublico(memoriaId, antes, depois, quem.pessoa === criadaPor ? criadaPor : '');
  if (esperam.length === 0) return [];
  const nucleos = await listarNucleos();
  const comoPublico = (conhecido: PublicoConhecido | null | undefined): Publico => ({ visibilidade: 'nucleos', nucleos: conhecido === 'todos' ? [] : [...(conhecido ?? [])] });
  await criarAvisos(
    esperam.map((r) => ({ para: r.registradoPor, tipo: 'liberar-relato' as const, memoriaId, relatoId: r.id, de: quem.pessoa, dados: { paraQuem: paraQuemPassouAVer(comoPublico(r.publicoConhecido), depois, nucleos) } })),
  );
  return esperam.filter((r) => r.situacao === 'publicada');
}
