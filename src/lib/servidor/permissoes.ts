// Regras de quem vê e quem pode o quê. Espelham docs/decisoes.md.
// Funções puras, sem acesso a rede nem a banco, para serem fáceis de testar.
// A regra de "quem vê" existe também em SQL, em repositorio.ts (FILTRO_VISIVEL):
// as duas precisam mudar juntas.

export interface Usuario {
  /** id do integrante, ex.: "giovanna" */
  pessoa: string;
  nome: string;
  admin: boolean;
  /** núcleos de que a pessoa é membro */
  nucleos: string[];
}

export interface AcessoDaMemoria {
  situacao: 'rascunho' | 'publicada';
  visibilidade: 'todos' | 'nucleos';
  criadaPor: string;
  nucleos: string[];
  integrantes: string[];
}

export interface RelatoExistente {
  por: string;
  registradoPor?: string;
}

export type Decisao = { ok: true } | { ok: false; motivo: string };

const sim: Decisao = { ok: true };
const nao = (motivo: string): Decisao => ({ ok: false, motivo });

/**
 * Quem vê uma memória.
 * - Rascunho: só quem está escrevendo.
 * - Visível a todos: qualquer pessoa com acesso.
 * - Restrita a núcleos: só membros de pelo menos um deles. Ser citado não dá acesso,
 *   e administrador não tem visão especial.
 */
export function podeVerMemoria(usuario: Usuario, m: AcessoDaMemoria): boolean {
  if (m.situacao === 'rascunho') return m.criadaPor === usuario.pessoa;
  if (m.visibilidade === 'todos') return true;
  return m.nucleos.some((n) => usuario.nucleos.includes(n));
}

/** Corrigir a ficha ou mudar a visibilidade: quem criou e as pessoas citadas, desde que vejam a memória. */
export function podeEditarMemoria(usuario: Usuario, m: AcessoDaMemoria): Decisao {
  if (!podeVerMemoria(usuario, m)) return nao('Memória não encontrada.');
  if (m.criadaPor === usuario.pessoa) return sim;
  if (m.situacao === 'publicada' && m.integrantes.includes(usuario.pessoa)) return sim;
  return nao('Só quem criou a memória e as pessoas citadas nela podem alterá-la.');
}

/**
 * Ao restringir uma memória a núcleos, pelo menos um deles precisa ser de quem
 * está salvando. Senão a pessoa esconderia a memória de si mesma.
 */
export function validarVisibilidade(usuario: Usuario, visibilidade: 'todos' | 'nucleos', nucleos: string[]): Decisao {
  if (visibilidade === 'todos') return sim;
  if (nucleos.length === 0) return nao('Escolha pelo menos um núcleo que pode ver a memória.');
  if (!nucleos.some((n) => usuario.nucleos.includes(n))) {
    return nao('Você só pode restringir uma memória a núcleos de que faz parte.');
  }
  return sim;
}

/** Dono de um relato: quem registrou em nome de outra pessoa, ou a própria pessoa. */
export function donoDoRelato(relato: RelatoExistente): string {
  return relato.registradoPor ?? relato.por;
}

/**
 * Escrever um relato em uma memória que a pessoa vê.
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

/** Remover uma foto: só quem enviou. */
export function podeRemoverFoto(usuario: Usuario, enviadaPor: string): Decisao {
  return enviadaPor === usuario.pessoa ? sim : nao('Só quem enviou a foto pode removê-la.');
}

/** Excluir uma memória inteira: administradores, e só o que enxergam. */
export function podeExcluirMemoria(usuario: Usuario, m: AcessoDaMemoria): Decisao {
  if (!podeVerMemoria(usuario, m)) return nao('Memória não encontrada.');
  return usuario.admin ? sim : nao('Só os administradores do acervo excluem memórias.');
}
