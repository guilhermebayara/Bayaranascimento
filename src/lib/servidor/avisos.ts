// Quando nasce um aviso (docs/decisoes.md, "Avisos"). As regras de quem recebe estão em src/lib/avisos.ts;
// aqui elas encontram o banco: quem tem login, quem já entrou e quem vê a memória.
import { quemRecebeQuemEstava, quemRecebeRelatoNovo, type Destinatarios } from '../avisos';
import { pessoasComAcesso } from './acesso';
import { podeVerMemoria, publicoAmpliado, publicoDentroDe, type AcessoDaMemoria, type Publico, type Usuario } from './permissoes';
import { criarAvisos, guardarRelatosParaOPublicoAntigo, listarIntegrantes, listarNucleos, quemJaEntrou, soltarEsperasSemSentido, type Relato } from './repositorio';

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
 * Quem criou a memória mudou quem vê. Ao ampliar, cada relato que já existia fica só para quem via antes,
 * e quem o registrou recebe o pedido para liberar (vale mesmo antes do primeiro acesso). Ao restringir,
 * nada é pedido, e as esperas que perderam o sentido se desfazem. Devolve os relatos publicados que
 * passaram a esperar.
 */
export async function mudouQuemVe(memoriaId: string, antes: Publico, depois: Publico, quem: Usuario): Promise<Relato[]> {
  if (!publicoAmpliado(antes, depois)) {
    await soltarEsperasSemSentido(memoriaId, (so) => publicoDentroDe(depois, so));
    return [];
  }
  const esperam = await guardarRelatosParaOPublicoAntigo(memoriaId, antes.nucleos, quem.pessoa);
  const paraQuem = paraQuemPassouAVer(antes, depois, await listarNucleos());
  await criarAvisos(esperam.map((r) => ({ para: r.registradoPor, tipo: 'liberar-relato', memoriaId, relatoId: r.id, de: quem.pessoa, dados: { paraQuem } })));
  return esperam.filter((r) => r.situacao === 'publicada');
}
