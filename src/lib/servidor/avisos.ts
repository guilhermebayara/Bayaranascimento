// Quando nasce um aviso (docs/decisoes.md, "Avisos"). As regras de quem recebe estão em src/lib/avisos.ts;
// aqui elas encontram o banco: quem tem login, quem já entrou e quem vê a memória.
import { quemRecebeQuemEstava, quemRecebeRelatoNovo, type Destinatarios } from '../avisos';
import { pessoasComAcesso } from './acesso';
import { podeVerMemoria, type AcessoDaMemoria, type Usuario } from './permissoes';
import { criarAvisos, listarIntegrantes, quemJaEntrou } from './repositorio';

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
