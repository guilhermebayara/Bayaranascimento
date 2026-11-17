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
