// Regras de quem vê e quem pode o quê. Espelham docs/regras/permissoes.md.
// Funções puras, sem acesso a rede nem a banco, para serem fáceis de testar.
// As regras de quem vê o quê moram em src/lib/servidor/quem-ve.ts, em par com o SQL; as daqui que têm o
// mesmo nome de antes (podeVerMemoria, veORelato, estaNoPublicoDoRelato, pessoasQueNaoVe, comExcluidas)
// apontam para lá.
import { alcanca, comExcluidas, estaNoPublicoDoRelato, excluidasDe, pessoasQueNaoVe, relatoEspera, veMemoria, veORelato, type Publico } from './quem-ve';
import { ehEpoca, podeVerCapitulo, type Capitulo, type ModoDoFormulario } from '../capitulos';
import { casalDesfeito, ehEx } from '../ex-casal';
import type { Casal } from '../parentesco';

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
  // A lixeira fica com quem chama, como sempre: a memória que chega aqui já foi achada no lugar certo
  return veMemoria(usuario, m, { lixeira: 'qualquer' });
}

/**
 * O que a pessoa pode corrigir numa memória que vê ("Administradores podem mais", decisão do Gui,
 * 16/11/2026):
 * - "tudo": quem criou e as pessoas citadas, como sempre.
 * - "dados": os administradores, numa memória publicada de que não são autores nem citados. Só os dados
 *   (data, lugar, tipo de momento, quem estava, capítulos e temas), e não o conteúdo (título, fotos e
 *   legendas). Remover a foto de outra pessoa é uma regra à parte (podeRemoverFoto).
 * Quem pode ver continua sendo só de quem criou (podeMudarQuemVe). Ninguém corrige o que não vê.
 */
export type AlcanceDaCorrecao = 'tudo' | 'dados';
export function alcanceDaCorrecao(usuario: Usuario, m: AcessoDaMemoria): AlcanceDaCorrecao | null {
  if (!podeVerMemoria(usuario, m)) return null;
  if (m.criadaPor === usuario.pessoa) return 'tudo';
  if (m.situacao !== 'publicada') return null;
  if (m.integrantes.includes(usuario.pessoa)) return 'tudo';
  return usuario.admin ? 'dados' : null;
}

/** Corrigir a ficha: quem criou, as pessoas citadas e, só nos dados, os administradores, desde que vejam a memória. */
export function podeEditarMemoria(usuario: Usuario, m: AcessoDaMemoria): Decisao {
  if (!podeVerMemoria(usuario, m)) return nao('Memória não encontrada.');
  if (alcanceDaCorrecao(usuario, m)) return sim;
  return nao('Só quem criou a memória, as pessoas citadas nela e os administradores podem alterá-la.');
}

/** O conteúdo de uma memória, que o administrador sem autoria não muda: título, famílias e fotos com as legendas. */
export interface ConteudoDaMemoria {
  titulo: string;
  nucleos: string[];
  fotos: { id: number; legenda?: string | null; principal: boolean }[];
}

/**
 * Numa correção só dos dados, o que mudou no conteúdo, ou nada. Tirar uma foto é permitido (a regra é
 * podeRemoverFoto), e, sem a principal, outra toma o lugar dela; o resto das fotos fica como estava, na
 * mesma ordem, com as mesmas legendas. As famílias da memória ficam com quem criou e com quem estava nela.
 */
export function mudancaDeConteudo(anterior: ConteudoDaMemoria, pedido: ConteudoDaMemoria): Decisao {
  const motivo = 'Os administradores corrigem só os dados desta memória: data, lugar, tipo de momento, quem estava, capítulos e temas.';
  if (pedido.titulo.trim() !== anterior.titulo.trim()) return nao(`${motivo} O título fica com quem criou e com quem estava nela.`);
  const mesmas = (a: string[], b: string[]) => a.length === b.length && a.every((n) => b.includes(n));
  if (!mesmas([...new Set(pedido.nucleos)], anterior.nucleos)) return nao(`${motivo} As famílias da memória ficam com quem criou e com quem estava nela.`);
  const antes = new Map(anterior.fotos.map((f, ordem) => [f.id, { ...f, ordem }]));
  let ultima = -1;
  const principalFicou = pedido.fotos.some((f) => antes.get(f.id)?.principal);
  for (const foto of pedido.fotos) {
    const era = antes.get(foto.id);
    if (!era) return nao(`${motivo} Para acrescentar fotos, use “Acrescentar fotos”, na página da memória.`);
    if ((foto.legenda?.trim() || null) !== (era.legenda?.trim() || null)) return nao(`${motivo} As legendas ficam com quem criou e com quem estava nela.`);
    if (era.ordem < ultima) return nao(`${motivo} A ordem das fotos fica como está.`);
    ultima = era.ordem;
    if (principalFicou && foto.principal !== era.principal) return nao(`${motivo} A foto da linha do tempo fica como está.`);
  }
  return sim;
}

/**
 * Ao restringir uma memória a núcleos, pelo menos um deles precisa ser de quem
 * está salvando. Senão a pessoa esconderia a memória de si mesma.
 */
export function validarVisibilidade(usuario: Usuario, visibilidade: 'todos' | 'nucleos', nucleos: string[], doQue: 'memoria' | 'capitulo' = 'memoria'): Decisao {
  if (visibilidade === 'todos') return sim;
  const [o, um] = doQue === 'capitulo' ? ['o capítulo', 'um capítulo'] : ['a memória', 'uma memória'];
  if (nucleos.length === 0) return nao(`Escolha pelo menos um núcleo que pode ver ${o}.`);
  if (!alcanca({ visibilidade: 'nucleos', nucleos }, usuario.nucleos)) {
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

/**
 * Remover uma foto: quem enviou e os administradores ("Administradores podem mais", 16/11/2026). Quem
 * chama já conferiu que a pessoa vê a memória. A foto vai para a lixeira, com o nome de quem tirou.
 */
export function podeRemoverFoto(usuario: Usuario, enviadaPor: string): Decisao {
  if (enviadaPor === usuario.pessoa || usuario.admin) return sim;
  return nao('Só quem enviou a foto e os administradores podem removê-la.');
}

/**
 * Restaurar uma foto removida (resposta do Gui ao PR #52, 17/11/2026): quem enviou e quem a removeu.
 * Um administrador que tirou a foto de outra pessoa pode desfazer o que fez; os outros administradores, não.
 */
export function podeRestaurarFoto(usuario: Usuario, foto: { enviadaPor: string; removidaPor: string | null }): Decisao {
  if (foto.enviadaPor === usuario.pessoa || foto.removidaPor === usuario.pessoa) return sim;
  return nao('Só quem enviou a foto e quem a removeu podem restaurá-la.');
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
 * Editar o cadastro de um integrante. Quem chama já conferiu que a pessoa logada vê o integrante.
 * - Quem acessa o site cuida da própria página, e os administradores também ("Administradores podem
 *   mais", 16/11/2026: pedir à mãe do Gui para editar alguém viraria uma tarefa para ela).
 * - Quem não acessa: membros do núcleo da pessoa ou do núcleo de que ela é parente, quem cadastrou e os admins.
 */
export function podeEditarIntegrante(usuario: Usuario, integrante: IntegranteParaPermissao, comAcesso: ReadonlySet<string>): Decisao {
  if (integrante.id === usuario.pessoa || usuario.admin) return sim;
  if (comAcesso.has(integrante.id)) return nao('Só a própria pessoa e os administradores editam a página dela.');
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
 * Mudar ou remover um laço do coração: o dono e, nos laços que veem, os administradores ("Administradores
 * podem mais", 16/11/2026). O laço "só eu vejo" continua só do dono: o administrador nem o vê. A
 * proximidade e o "só eu vejo" são do dono: o administrador muda o nome do laço e o lugar na árvore.
 */
export function podeMudarLacoDoCoracao(usuario: Usuario, laco: { dono: string; privado: boolean }): Decisao {
  if (laco.dono === usuario.pessoa) return sim;
  if (usuario.admin && !laco.privado) return sim;
  return nao('Só quem definiu o laço e os administradores podem mudá-lo.');
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

// Quem a pessoa logada não vê, ver um relato e quem está na lixeira (excluir pessoa, decisão do Gui depois
// da sessão I, 18/11/2026): as regras moram em quem-ve.ts.
export { comExcluidas, excluidasDe, pessoasQueNaoVe, veORelato };

/** A pessoa que alguém quer excluir: quem acessa o site não sai por aqui, nem a própria pessoa. */
export interface AlvoDaExclusao {
  id: string;
  /** a pessoa entra no site (está no segredo ACESSOS) */
  acessa: boolean;
}

/**
 * Excluir uma pessoa: só os administradores. Ela vai para a lixeira, some do site e volta por "Restaurar".
 * Ninguém exclui a si mesmo nem quem acessa o site: a pessoa perderia a própria página.
 */
export function podeExcluirPessoa(usuario: Usuario, alvo: AlvoDaExclusao): Decisao {
  if (alvo.id === usuario.pessoa) return nao('Você não pode excluir a sua própria página.');
  if (alvo.acessa) return nao('Quem entra no site não pode ser excluído: a pessoa perderia a própria página.');
  if (!usuario.admin) return nao('Só os administradores excluem uma pessoa. Você pode pedir a exclusão.');
  return sim;
}

/** Pedir a exclusão: quem não administra, nas mesmas condições. Um administrador aprova ou recusa. */
export function podePedirExclusao(usuario: Usuario, alvo: AlvoDaExclusao): Decisao {
  if (alvo.id === usuario.pessoa) return nao('Você não pode pedir para excluir a sua própria página.');
  if (alvo.acessa) return nao('Quem entra no site não pode ser excluído: a pessoa perderia a própria página.');
  if (usuario.admin) return nao('Quem administra exclui direto, sem pedir.');
  return sim;
}

/** Restaurar uma pessoa da lixeira, aprovar ou recusar um pedido: só os administradores. */
export function podeCuidarDaExclusao(usuario: Usuario): Decisao {
  return usuario.admin ? sim : nao('Só os administradores cuidam das pessoas na lixeira e dos pedidos de exclusão.');
}

// --- Ampliar quem vê uma memória com relatos (decisão do Gui, 17/11/2026) ---

/** Quem vê uma memória: toda a família, ou só quem é membro de um dos núcleos (em quem-ve.ts). */
export type { Publico };

/**
 * O público da memória mudou de fato: outra visibilidade, ou outras famílias numa memória restrita. Numa
 * memória aberta a todos, marcar ou tirar famílias não muda quem vê (revisão Y do PR #160, 22/11/2026):
 * só a mudança de público recalcula os relatos.
 */
export function publicoMudou(antes: Publico, depois: Publico): boolean {
  if (antes.visibilidade !== depois.visibilidade) return true;
  if (depois.visibilidade === 'todos') return false;
  return antes.nucleos.length !== depois.nucleos.length || antes.nucleos.some((n) => !depois.nucleos.includes(n));
}

/**
 * O público da memória como o pedido para liberar o mostra, numa chave que a página manda junto com a
 * resposta: "todos", ou "nucleos:" e as famílias em ordem. Se a de agora for outra, a memória mudou depois
 * de a pessoa ler o pedido, e a resposta não vale (revisão Y2 do PR #160). Marcar ou tirar famílias numa
 * memória aberta a todos não muda quem vê, e não muda a chave (como publicoMudou).
 */
export function chaveDoPublico(publico: Publico): string {
  return publico.visibilidade === 'todos' ? 'todos' : `nucleos:${[...publico.nucleos].sort().join(',')}`;
}

/** A chave de chaveDoPublico de volta ao público. O que não for uma chave dá undefined. */
export function publicoDaChave(chave: string): Publico | undefined {
  if (chave === 'todos') return { visibilidade: 'todos', nucleos: [] };
  const nucleos = /^nucleos:(.+)$/.exec(chave)?.[1].split(',').filter(Boolean);
  return nucleos?.length ? { visibilidade: 'nucleos', nucleos } : undefined;
}

/**
 * O relato que nasce depois de a memória abrir para mais gente do que a página mostrava (decisão do Gui,
 * 22/11/2026, Y3 do PR #160): nasce só para o público que a página mostrava e espera o sim de quem
 * escreveu, como os relatos que já existiam na ampliação. Quem criou a memória nunca espera, e o relato
 * escrito com a página certa (ou com a memória restringida depois) acompanha a memória, como sempre.
 */
export function relatoQueNasce(paginaMostrava: Publico, memoria: Publico, quemEscreve: string, criadaPor: string): { soParaNucleos: string[] | null } {
  if (quemEscreve === criadaPor || cabeNoConhecido(memoria, comoConhecido(paginaMostrava))) return { soParaNucleos: null };
  // Aqui a página mostrava só algumas famílias: "todos" caberia em qualquer público
  return { soParaNucleos: [...paginaMostrava.nucleos].sort() };
}

/** O relato que espera o sim do autor fica só para quem já o viu: a regra mora em quem-ve.ts. */
export { estaNoPublicoDoRelato };

/**
 * O público mais amplo que um relato já teve (migração 105; resposta do Gui à P3 do QA de 23/11/2026,
 * docs/historico/qa/2026-11-23-perguntas.md): "todos", ou os núcleos cujos membros já o viram. Ao ampliar,
 * o relato só espera por quem nunca o viu.
 */
export type PublicoConhecido = 'todos' | readonly string[];

/** O público da memória como público conhecido: "todos", ou os núcleos dela. */
const comoConhecido = (publico: Publico): PublicoConhecido => (publico.visibilidade === 'todos' ? 'todos' : [...publico.nucleos]);

/** A soma de dois públicos conhecidos: quem viu num ou no outro. */
export function juntarPublicos(a: PublicoConhecido, b: PublicoConhecido): PublicoConhecido {
  if (a === 'todos' || b === 'todos') return 'todos';
  return [...new Set([...a, ...b])].sort();
}

/** O público da memória cabe inteiro no que o relato já teve: ninguém ali o veria pela primeira vez. */
export function cabeNoConhecido(publico: Publico, conhecido: PublicoConhecido): boolean {
  if (conhecido === 'todos') return true;
  return publico.visibilidade === 'nucleos' && publico.nucleos.every((n) => conhecido.includes(n));
}

/**
 * O que um relato já teve, antes de uma mudança de quem vê a memória. Sem registro (relato de antes da
 * migração 105, ou escrito depois da última mudança), vale o público de hoje, sem supor passado: o
 * público antigo, se ele espera, ou o da memória antes da mudança. Um relato que acompanha a memória
 * também já foi visto por quem a via antes.
 */
export function publicoConhecidoAntes(
  relato: { soParaNucleos?: readonly string[] | null; publicoConhecido?: PublicoConhecido | null },
  antes: Publico,
): PublicoConhecido {
  if (relatoEspera(relato.soParaNucleos)) return juntarPublicos(relato.publicoConhecido ?? relato.soParaNucleos!, relato.soParaNucleos!);
  return juntarPublicos(relato.publicoConhecido ?? comoConhecido(antes), comoConhecido(antes));
}

/**
 * Quem vê a memória mudou (ampliar ou restringir): como fica cada relato. O relato de quem mudou nunca
 * espera. Os outros esperam só quando o público novo tem alguém que nunca os viu: ficam com o público
 * conhecido até quem os registrou concordar. Quando o público novo cabe no que o relato já teve, ele
 * acompanha a memória, sem pedido (restringir e reabrir não pede nada).
 */
export function relatoDepoisDaMudanca(
  relato: { registradoPor: string; soParaNucleos?: readonly string[] | null; publicoConhecido?: PublicoConhecido | null },
  antes: Publico,
  depois: Publico,
  quemMudou: string,
): { soParaNucleos: string[] | null; publicoConhecido: PublicoConhecido } {
  const conhecido = publicoConhecidoAntes(relato, antes);
  if (relato.registradoPor === quemMudou || cabeNoConhecido(depois, conhecido)) {
    return { soParaNucleos: null, publicoConhecido: juntarPublicos(conhecido, comoConhecido(depois)) };
  }
  // Aqui o conhecido não é "todos": todo público caberia nele
  return { soParaNucleos: [...(conhecido as readonly string[])], publicoConhecido: conhecido };
}

/**
 * "Manter como estava" vale para o público que foi perguntado (decisão do Gui, 22/11/2026): ampliar de
 * novo para esse mesmo público, ou para parte dele, não pede de novo; um público maior é outra pergunta.
 * `ultima` é a última resposta de quem registrou o relato, com o público que o pedido mostrava. Sem o
 * público (respostas de antes de a resposta guardá-lo), pede de novo, que não revela nada a ninguém.
 */
export function jaRecusouEstePublico(depois: Publico, ultima: { resposta: string; publico?: Publico | null } | undefined): boolean {
  if (ultima?.resposta !== 'manter' || !ultima.publico) return false;
  return cabeNoConhecido(depois, comoConhecido(ultima.publico));
}

/** Liberar o relato: quem vê a memória agora passa a ter visto o relato. */
export function publicoConhecidoAoLiberar(
  relato: { soParaNucleos?: readonly string[] | null; publicoConhecido?: PublicoConhecido | null },
  memoria: Publico,
): PublicoConhecido {
  return juntarPublicos(relato.publicoConhecido ?? relato.soParaNucleos ?? [], comoConhecido(memoria));
}

/** Responder ao pedido para liberar, ou liberar depois pela linha do relato: só quem registrou o relato. */
export function podeLiberarRelato(usuario: Usuario, relato: { registradoPor: string; soParaNucleos?: readonly string[] | null }): Decisao {
  if (relato.registradoPor !== usuario.pessoa) return nao('Só quem escreveu ou registrou o relato decide quem passa a vê-lo.');
  if (!relatoEspera(relato.soParaNucleos)) return nao('Este relato já aparece para todos que veem a memória.');
  return sim;
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

// --- Ex-casal: quem vê e como aparece para mim (decisões do Gui, 18/11/2026; src/lib/ex-casal.ts) ---

/**
 * Mudar quem vê um casal desfeito: as duas pessoas do casal. Quando nenhuma das duas acessa o site (o
 * casal dos avós, por exemplo), vale a regra dos laços de árvore, que quem chama confere. Num casal
 * junto, quem vê continua com a regra dos laços.
 */
export function podeMudarQuemVeOCasal(usuario: Usuario, casal: Pick<Casal, 'a' | 'b' | 'fases'>, comAcesso: ReadonlySet<string>): Decisao {
  if (!casalDesfeito(casal as Casal)) return sim;
  if (casal.a === usuario.pessoa || casal.b === usuario.pessoa) return sim;
  if (!comAcesso.has(casal.a) && !comAcesso.has(casal.b)) return sim;
  return nao('Só as duas pessoas do casal mudam quem vê este laço.');
}

/** Escolher como o ex aparece para mim: só quem é uma das duas pessoas de um casal desfeito, e só para si. */
export function podeEscolherComoOExAparece(usuario: Usuario, casal: Pick<Casal, 'a' | 'b' | 'fases'>): Decisao {
  if (casal.a !== usuario.pessoa && casal.b !== usuario.pessoa) return nao('Casal não encontrado.');
  if (!ehEx(casal as Casal)) return nao('Só dá para escolher como alguém aparece para você depois que o casal terminou.');
  return sim;
}

// --- Apagar de vez o que está na lixeira (decisão do Gui, 17/11/2026, onda 2) ---

/**
 * Apagar de vez: só os administradores, item a item, e só o que já está na lixeira e que eles veem ali
 * (quem chama acha o item pela lixeira de quem pede). Nada some sozinho.
 */
export function podeApagarDeVez(usuario: Usuario, item: { naLixeira: boolean }): Decisao {
  if (!usuario.admin) return nao('Só os administradores apagam de vez o que está na lixeira.');
  if (!item.naLixeira) return nao('Só dá para apagar de vez o que já está na lixeira.');
  return sim;
}

/** Apagar uma foto que ficou sem memória há mais de 30 dias: só os administradores (onda 2). */
export function podeApagarFotoSolta(usuario: Usuario): Decisao {
  return usuario.admin ? sim : nao('Só os administradores apagam fotos sem memória.');
}

/**
 * Fazer as cópias menores das fotos que já existem (sessão D1b, 23/11/2026): só os administradores, e só
 * das fotos que eles veem (a rota confere de novo, foto por foto).
 */
export function podeFazerCopiasDasFotos(usuario: Usuario): Decisao {
  return usuario.admin ? sim : nao('Só os administradores fazem as cópias das fotos.');
}

/** Os ajustes do acervo (os centros da árvore): só os administradores (onda 2, 17/11/2026). */
export function podeMudarAjustes(usuario: Usuario): Decisao {
  return usuario.admin ? sim : nao('Só os administradores mudam os ajustes do acervo.');
}

// --- Juntar cadastros duplicados (onda 2, decisão do Gui de 17/11/2026) ---

/**
 * Juntar duas fichas da mesma pessoa: só os administradores, e só fichas que eles veem (quem chama acha as
 * duas na lista de quem vê). A ficha de quem acessa o site é sempre a que fica: o login aponta para ela.
 */
export function podeJuntarCadastros(usuario: Usuario, fica: string, sai: string, comAcesso: ReadonlySet<string>): Decisao {
  if (!usuario.admin) return nao('Só os administradores juntam cadastros.');
  if (fica === sai) return nao('Escolha duas fichas diferentes.');
  if (comAcesso.has(sai)) return nao(comAcesso.has(fica) ? 'As duas fichas são de quem acessa o site: não dá para juntar.' : 'A ficha de quem acessa o site é a que fica.');
  return sim;
}

// --- Sugestão de correção (onda 2, decisão do Gui de 17/11/2026; src/lib/sugestoes.ts) ---

/**
 * Sugerir uma correção dos dados: quem vê a memória publicada, menos quem a criou (ela mesma corrige). A
 * sugestão vai para quem criou.
 */
export function podeSugerirDados(usuario: Usuario, m: AcessoDaMemoria): Decisao {
  if (!podeVerMemoria(usuario, m) || m.situacao !== 'publicada') return nao('Memória não encontrada.');
  if (m.criadaPor === usuario.pessoa) return nao('Você criou esta memória: corrija direto em “Corrigir esta memória”.');
  return sim;
}

/** Deixar um recado sobre um relato: quem vê o relato publicado, menos quem o registrou. */
export function podeDeixarRecado(usuario: Usuario, relato: { registradoPor: string; situacao: string }, veORelatoAgora: boolean): Decisao {
  if (!veORelatoAgora || relato.situacao !== 'publicada') return nao('Relato não encontrado.');
  if (relato.registradoPor === usuario.pessoa) return nao('O relato é seu: mude direto em “Editar meu relato”.');
  return sim;
}

/**
 * Responder uma sugestão (aceitar, recusar, responder): só quem a recebeu (`recebem`, de `destinatarios`,
 * em src/lib/sugestoes.ts), e só enquanto está aberta. O primeiro que responde resolve para todos.
 */
export function podeResponderSugestao(usuario: Usuario, s: { situacao: string }, recebem: readonly string[]): Decisao {
  if (!recebem.includes(usuario.pessoa)) return nao('Sugestão não encontrada.');
  if (s.situacao !== 'aberta') return nao('Esta sugestão já foi respondida.');
  return sim;
}
