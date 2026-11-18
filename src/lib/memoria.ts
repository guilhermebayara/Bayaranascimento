// Regras da página da memória que dá para conferir sem tela (respostas do Gui ao QA de design de
// 17/11/2026, docs/qa/2026-11-17-perguntas.md, P51 e P52).

/** No celular, "Quem estava" mostra até este tanto de retratos; o resto abre no lugar, em "Ver todos os N". */
export const RETRATOS_NO_CELULAR = 6;

/** "Quem estava" só ganha o "Ver todos" quando há gente além do que cabe à vista. */
export function recolheQuemEstava(pessoas: number): boolean {
  return pessoas > RETRATOS_NO_CELULAR;
}

interface RelatoDaPagina {
  id: string;
  por: string;
  registradoPor: string;
  situacao: string;
  texto: string;
}

/**
 * O relato já foi lido inteiro na abertura? Vale quando a memória tem um só relato, publicado, sem
 * áudio, contado pela própria pessoa, e o texto coube inteiro no trecho da abertura. Nesse caso a
 * seção "Relato" não repete o bilhete. Com áudio, com mais de um relato, com um rascunho ou com um
 * relato registrado por outra pessoa, o bilhete traz algo que a abertura não traz, e continua.
 */
export function relatoJaEstaNaAbertura(relatos: RelatoDaPagina[], trecho: string | undefined, audios: (relato: string) => number): boolean {
  if (relatos.length !== 1 || !trecho) return false;
  const [relato] = relatos as [RelatoDaPagina];
  if (relato.situacao !== 'publicada' || relato.registradoPor !== relato.por) return false;
  if (audios(relato.id) > 0) return false;
  return relato.texto.trim() === trecho;
}

/**
 * O aviso de quem tenta publicar com alguém que só ela vê. Com script, vem junto da escolha; sem script,
 * diz o caminho: abrir o laço na página da pessoa ou tirá-la de "Quem estava".
 */
export function mensagemDaPessoaPrivada(nomes: string[], jaPublicada: boolean): string {
  const lista = nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`;
  const so = nomes.length === 1 ? `${lista} só aparece para você` : `${lista} só aparecem para você`;
  const fica = jaPublicada ? 'Para salvar' : 'Enquanto for assim, a memória fica em rascunho. Para publicar';
  return `${so}: o laço de vocês está marcado como “só eu vejo”, e a memória mostraria isso a todos. ${fica}, abra o laço para todos ou tire ${nomes.length === 1 ? 'essa pessoa' : 'essas pessoas'} de “Quem estava”.`;
}
