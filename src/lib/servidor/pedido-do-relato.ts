// O pedido para liberar um relato, com o relato à vista (crítica C2, esboço pedido-com-o-relato.html;
// resposta do Gui de 22/11/2026). O aviso mostra o começo do relato e diz, em nomes, quem passa a ler; a
// ação tem o mesmo nome no aviso e na linha do relato, na memória. A regra de quem vê não muda: aqui só se
// diz, para quem registrou o relato, o que liberar faria.
//
// Os nomes seguem a visibilidade de quem olha: quem está em pessoasQueONaoVe não entra nem no nome nem na
// conta ("e mais N"), para a frase não denunciar quem a pessoa não vê.
import { paraQuemPassouAVer, comoPublicoAntigo } from './avisos';
import { estaNoPublicoDoRelato, type Publico, type Usuario } from './permissoes';
import { listarIntegrantes, listarMensagensDosRelatos, listarNucleos, obterRelatoPorId, pessoasQueONaoVe } from './repositorio';
import { resumoDaMensagem } from '../conversa';
import { jaFaleceu } from '../datas';
import { listaCurta, trechoDoRelato } from '../visual';

/** O que liberar faria: o texto do botão e a frase dos nomes. */
export interface PedidoDoRelato {
  /** o começo do relato, como quem registrou o escreveu */
  comeco: string;
  /** para quem a memória passou a ser visível, do ponto de vista do relato: "toda a família" */
  paraQuem: string;
  /** a ação, com um nome só no aviso e na memória: "Liberar para toda a família" */
  acao: string;
  /** "Ana Candida, Lúcio, Prima Júlia e mais 4", só com quem quem olha vê; vazio quando ninguém que ela vê passa a ler */
  leitores: string;
}

/**
 * Quem passa a ler um relato se ele for liberado: os membros das famílias que veem a memória agora e não
 * estão no público do relato, vivos, fora quem registrou. Quem olha só lê os nomes de quem vê.
 */
export async function quemPassaALer(relato: { registradoPor: string; soParaNucleos?: readonly string[] | null }, publico: Publico, quemOlha: Usuario): Promise<string[]> {
  if (!relato.soParaNucleos) return [];
  const [integrantes, naoVe] = await Promise.all([listarIntegrantes(), pessoasQueONaoVe(quemOlha)]);
  const saida: string[] = [];
  for (const i of integrantes) {
    // Os membros das famílias (o que vira Usuario.nucleos ao entrar); quem só é parente não lê pela família
    const { nucleos } = i;
    if (!nucleos.length || i.id === relato.registradoPor || naoVe.has(i.id) || jaFaleceu(i)) continue;
    const veAMemoria = publico.visibilidade === 'todos' || publico.nucleos.some((n) => nucleos.includes(n));
    if (veAMemoria && !estaNoPublicoDoRelato(relato, { pessoa: i.id, nucleos })) saida.push(i.id);
  }
  return saida;
}

/** O pedido de cada relato, pelo id: o começo do relato, para quem, a ação e os nomes de quem passa a ler. */
export async function pedidosDosRelatos(quemOlha: Usuario, pedidos: { relatoId: number; publico: Publico }[]): Promise<Map<number, PedidoDoRelato>> {
  const saida = new Map<number, PedidoDoRelato>();
  if (pedidos.length === 0) return saida;
  const [nucleos, integrantes] = await Promise.all([listarNucleos(), listarIntegrantes()]);
  const nome = (id: string) => {
    const i = integrantes.find((x) => x.id === id);
    return i?.apelido ?? i?.nome ?? id;
  };
  for (const { relatoId, publico } of pedidos) {
    const relato = await obterRelatoPorId(relatoId);
    // Só quem registrou lê o pedido do próprio relato
    if (!relato || relato.registradoPor !== quemOlha.pessoa || !relato.soParaNucleos) continue;
    const texto = relato.texto.trim();
    const comeco = texto ? trechoDoRelato(texto) : resumoDaMensagem((await listarMensagensDosRelatos([relato])).get(relato.id)?.[0] ?? { tipo: 'texto', texto: '' });
    const paraQuem = paraQuemPassouAVer(comoPublicoAntigo(relato.publicoConhecido ?? relato.soParaNucleos), publico, nucleos);
    const ids = await quemPassaALer(relato, publico, quemOlha);
    const nomes = ids.map(nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    saida.set(relatoId, { comeco, paraQuem, acao: `Liberar para ${paraQuem}`, leitores: nomes.length ? listaCurta(nomes) : '' });
  }
  return saida;
}
