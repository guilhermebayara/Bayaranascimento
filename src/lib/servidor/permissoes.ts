// Regras de quem pode o quê. Espelham docs/decisoes.md.
// Funções puras, sem acesso a rede, para serem fáceis de testar.

export interface Usuario {
  /** id da pessoa no acervo, ex.: "giovanna" */
  pessoa: string;
  nome: string;
  nucleo: boolean;
  admin: boolean;
}

export interface RelatoExistente {
  por: string;
  registradoPor?: string;
}

export type Decisao = { ok: true } | { ok: false; motivo: string };

const sim: Decisao = { ok: true };
const nao = (motivo: string): Decisao => ({ ok: false, motivo });

/** Dono de um relato: quem registrou em nome de outra pessoa, ou a própria pessoa. */
export function donoDoRelato(relato: RelatoExistente): string {
  return relato.registradoPor ?? relato.por;
}

/**
 * Escrever um relato em uma memória.
 * - Cada pessoa tem no máximo um relato por memória.
 * - O próprio relato: só a pessoa escreve e edita.
 * - Relato de quem não acessa o site: qualquer um registra, e só quem registrou edita.
 * - Ninguém escreve em nome de quem tem acesso ao site.
 */
export function podeEscreverRelato(
  usuario: Usuario,
  por: string,
  existente: RelatoExistente | undefined,
  pessoasComAcesso: ReadonlySet<string>,
): Decisao {
  if (por === usuario.pessoa) {
    if (existente && donoDoRelato(existente) !== usuario.pessoa) {
      return nao('Já existe um relato seu nesta memória, registrado por outra pessoa.');
    }
    return sim;
  }
  if (pessoasComAcesso.has(por)) {
    return nao('Essa pessoa acessa o site e escreve o próprio relato.');
  }
  if (existente && donoDoRelato(existente) !== usuario.pessoa) {
    return nao('Só quem registrou este relato pode editá-lo.');
  }
  return sim;
}

/** Corrigir a ficha de uma memória (título, data, lugar, pessoas). */
export function podeEditarFicha(usuario: Usuario): Decisao {
  return usuario.nucleo ? sim : nao('Só o núcleo da família corrige a ficha de uma memória.');
}

/** Remover uma foto: só quem enviou. Fotos antigas, sem registro de envio, só o admin. */
export function podeRemoverFoto(usuario: Usuario, enviadaPor: string | undefined): Decisao {
  if (enviadaPor === usuario.pessoa) return sim;
  if (!enviadaPor && usuario.admin) return sim;
  return nao('Só quem enviou a foto pode removê-la.');
}

/** Editar a página de uma pessoa: a própria, ou o núcleo quando a pessoa não acessa o site. */
export function podeEditarPessoa(usuario: Usuario, pessoa: string, pessoasComAcesso: ReadonlySet<string>): Decisao {
  if (pessoa === usuario.pessoa) return sim;
  if (pessoasComAcesso.has(pessoa)) return nao('Cada pessoa cuida da própria página.');
  return usuario.nucleo ? sim : nao('Só o núcleo da família edita a página de quem não acessa o site.');
}

/** Excluir uma memória inteira. */
export function podeExcluirMemoria(usuario: Usuario): Decisao {
  return usuario.admin ? sim : nao('Só o administrador do acervo exclui memórias.');
}
