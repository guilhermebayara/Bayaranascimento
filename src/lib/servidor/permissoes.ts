// Regras de quem vê e quem pode o quê. Espelham docs/decisoes.md.
// Funções puras, sem acesso a rede nem a banco, para serem fáceis de testar.
// A regra de "quem vê" existe também em SQL, em repositorio.ts (FILTRO_VISIVEL):
// as duas precisam mudar juntas.
import { ehEpoca, podeVerCapitulo, type Capitulo, type ModoDoFormulario } from '../capitulos';

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
export function validarVisibilidade(usuario: Usuario, visibilidade: 'todos' | 'nucleos', nucleos: string[], doQue: 'memoria' | 'capitulo' = 'memoria'): Decisao {
  if (visibilidade === 'todos') return sim;
  const [o, um] = doQue === 'capitulo' ? ['o capítulo', 'um capítulo'] : ['a memória', 'uma memória'];
  if (nucleos.length === 0) return nao(`Escolha pelo menos um núcleo que pode ver ${o}.`);
  if (!nucleos.some((n) => usuario.nucleos.includes(n))) {
    return nao(`Você só pode restringir ${um} a núcleos de que faz parte.`);
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

/**
 * Excluir uma memória inteira: administradores, e só o que enxergam.
 * Um rascunho é de quem está escrevendo, então a própria pessoa pode descartar.
 * A memória excluída vai para a lixeira e pode ser recuperada.
 */
export function podeExcluirMemoria(usuario: Usuario, m: AcessoDaMemoria): Decisao {
  if (!podeVerMemoria(usuario, m)) return nao('Memória não encontrada.');
  if (m.situacao === 'rascunho') return sim;
  return usuario.admin ? sim : nao('Só os administradores do acervo excluem memórias.');
}

export interface IntegranteParaPermissao {
  id: string;
  nucleos: string[];
  /** núcleos de que é parente: quem é do núcleo cuida dos parentes dele */
  parenteDe?: string[];
  criadoPor?: string | null;
}

const divideNucleo = (usuario: Usuario, integrante: IntegranteParaPermissao) =>
  [...integrante.nucleos, ...(integrante.parenteDe ?? [])].some((n) => usuario.nucleos.includes(n));

/**
 * Editar o cadastro de um integrante.
 * - Quem acessa o site cuida da própria página, e só ela.
 * - Quem não acessa: membros do núcleo da pessoa ou do núcleo de que ela é parente, quem cadastrou e os admins.
 */
export function podeEditarIntegrante(usuario: Usuario, integrante: IntegranteParaPermissao, comAcesso: ReadonlySet<string>): Decisao {
  if (integrante.id === usuario.pessoa) return sim;
  if (comAcesso.has(integrante.id)) return nao('Só a própria pessoa edita a página dela.');
  if (usuario.admin || integrante.criadoPor === usuario.pessoa || divideNucleo(usuario, integrante)) return sim;
  return nao('Só quem é de um núcleo em comum com a pessoa pode editar a página dela.');
}

/**
 * Criar ou mudar um laço de árvore (filiação ou casal): quem é um dos envolvidos,
 * quem divide um núcleo com algum deles, e os admins.
 */
export function podeMexerEmLaco(usuario: Usuario, envolvidos: IntegranteParaPermissao[]): Decisao {
  if (usuario.admin) return sim;
  if (envolvidos.some((e) => e.id === usuario.pessoa || divideNucleo(usuario, e))) return sim;
  return nao('Só quem é de um núcleo em comum com as pessoas envolvidas pode mudar esse laço.');
}

/**
 * Uma versão antiga da ficha, guardada enquanto a memória ainda era rascunho, só aparece para quem
 * escreveu o rascunho. Senão o histórico mostraria a outras pessoas o título e o lugar de antes da publicação.
 */
export function podeVerVersao(usuario: Usuario, memoria: Pick<AcessoDaMemoria, 'criadaPor'>, versao: { situacao?: string }): boolean {
  return versao.situacao !== 'rascunho' || memoria.criadaPor === usuario.pessoa;
}

/**
 * Mudar quem pode ver uma memória ou um capítulo: só quem criou. Decisão do Gui (16/11/2026): quem é citado
 * não pode restringir, porque restringir a um núcleo de que a criadora não faz parte tirava a memória dela.
 * Quem é citado continua marcando núcleos de uma memória aberta a todos, o que não restringe nada.
 */
export function podeMudarQuemVe(
  usuario: Usuario,
  atual: { criadaPor: string; visibilidade: 'todos' | 'nucleos'; nucleos: string[] },
  visibilidade: 'todos' | 'nucleos',
  nucleos: string[],
): Decisao {
  if (atual.criadaPor === usuario.pessoa) return sim;
  const mesmos = (a: string[], b: string[]) => a.length === b.length && a.every((n) => b.includes(n));
  if (visibilidade !== atual.visibilidade) return nao('Só quem criou muda quem pode ver.');
  if (visibilidade === 'nucleos' && !mesmos(nucleos, atual.nucleos)) return nao('Só quem criou muda quem pode ver.');
  return sim;
}

/**
 * Quem a pessoa logada não vê: quem só existe num laço do coração privado de outra pessoa, sem nenhum
 * laço que ela veja (filiação, casal que ela vê ou laço do coração dela ou aberto). Nem o nome aparece,
 * na árvore, e nem o retrato é entregue.
 */
export function pessoasQueNaoVe(emPrivadosDeOutros: ReadonlySet<string>, comLacoVisivel: ReadonlySet<string>): Set<string> {
  return new Set([...emPrivadosDeOutros].filter((id) => !comLacoVisivel.has(id)));
}

/**
 * Ver um relato de quem a pessoa logada não vê (decisão do Gui, 17/11/2026): o relato registrado em nome
 * de quem só existe num laço do coração privado de outra pessoa some inteiro, como se não existisse, da
 * página da memória, da contagem de relatos, dos áudios e de "A voz de Fulano". Quem registrou continua
 * vendo. O dono do laço vê a pessoa e, por isso, vê o relato. A memória em si não muda.
 */
export function veORelato(relato: { por: string; registradoPor: string }, usuario: Pick<Usuario, 'pessoa'>, naoVe: ReadonlySet<string>): boolean {
  return !naoVe.has(relato.por) || relato.registradoPor === usuario.pessoa;
}

/** Pôr, trocar ou tirar a foto de retrato: quem pode editar a página da pessoa (decisão do Gui, 16/11/2026). */
export function podeMudarRetrato(usuario: Usuario, integrante: IntegranteParaPermissao, comAcesso: ReadonlySet<string>): Decisao {
  const decisao = podeEditarIntegrante(usuario, integrante, comAcesso);
  return decisao.ok ? sim : nao('Só quem pode editar a página da pessoa troca a foto dela.');
}

/** Ver o retrato: quem vê a pessoa, como vê o nome. Quem não vê recebe o mesmo que um retrato que não existe. */
export function podeVerRetrato(integranteId: string, naoVe: ReadonlySet<string>): boolean {
  return !naoVe.has(integranteId);
}

type CapituloParaPermissao = Pick<Capitulo, 'visibilidade' | 'nucleos' | 'criadoPor' | 'modo'> & Partial<Pick<Capitulo, 'pessoas' | 'familias'>>;

/**
 * Editar um capítulo (decisão do Gui, 16/11/2026): quem criou e os administradores, desde que vejam o
 * capítulo. Ter memórias nele não basta. Uma época, que vale para a família inteira, só os
 * administradores editam, mesmo quem a criou.
 */
export function podeEditarCapitulo(usuario: Usuario, c: CapituloParaPermissao): Decisao {
  if (!podeVerCapitulo(usuario, c)) return nao('Capítulo não encontrado.');
  if (ehEpoca(c)) return usuario.admin ? sim : nao('Só os administradores alteram uma época.');
  if (usuario.admin || c.criadoPor === usuario.pessoa) return sim;
  return nao('Só quem criou o capítulo e os administradores podem alterá-lo.');
}

/**
 * Salvar o formulário do capítulo: criar um novo (`atual` vazio) ou alterar um que existe. Criar uma
 * época ou transformar um capítulo em época é só dos administradores (decisão do Gui, 16/11/2026).
 */
export function podeSalvarCapitulo(usuario: Usuario, atual: CapituloParaPermissao | undefined, escolha: ModoDoFormulario): Decisao {
  if (atual) {
    const editar = podeEditarCapitulo(usuario, atual);
    if (!editar.ok) return editar;
  }
  if (escolha === 'epoca' && !usuario.admin) return nao(atual ? 'Só os administradores transformam um capítulo em época.' : 'Só os administradores criam uma época.');
  return sim;
}
