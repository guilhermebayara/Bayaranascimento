// Quem vê o quê, num ponto só (sessão AC3, 26/11/2026; auditoria AC, seção 3.4). As regras estão em
// docs/regras/permissoes.md e nas outras regras que citam este arquivo.
//
// Cada regra vem em par: o predicado em TS, que as rotas e as telas usam, e o fragmento SQL, que as
// consultas de repositorio.ts usam para não ler o acervo inteiro. Os dois ficam lado a lado, e
// testes/quem-ve-equivalencia.test.ts confere, sobre o banco de verdade com o acervo de exemplo e os casos
// difíceis, que dizem o mesmo nos dois sentidos. Mudar um sem o outro faz o teste falhar. Uma consulta nova
// que precise de uma destas regras usa o fragmento daqui, e não escreve a regra de novo: o mesmo teste
// recusa as formas conhecidas da regra em repositorio.ts fora desta lista.
//
// O módulo é puro: sem banco, sem rede, sem nada do servidor. Por isso pode ser lido também por
// src/lib/sala.ts, src/lib/capitulos.ts e src/lib/parentesco.ts, que o código do navegador importa.
//
// Os fragmentos SQL recebem o apelido da tabela (m para memorias, r para relatos) e o parâmetro com o id de
// quem olha (?1 quase sempre). Um apelido vazio usa a coluna sem prefixo.

import type { Copias } from '../copias-das-fotos';

/** Quem olha: o id e os núcleos de que é membro (parente não conta). */
export interface Leitor {
  pessoa: string;
  nucleos?: readonly string[];
}

/** Quem vê uma memória ou um capítulo: toda a família, ou só quem é membro de um dos núcleos. */
export interface Publico {
  visibilidade: 'todos' | 'nucleos';
  nucleos: readonly string[];
}

const coluna = (apelido: string, nome: string) => (apelido ? `${apelido}.${nome}` : nome);

/**
 * Uma data do banco (a da lixeira, a do descarte) como o SQL a lê: só NULL, ou a ausência, é "sem data".
 * Qualquer texto, '' incluído, é data, o lado mais fechado (revisão MEM-2 da AC3): o TS não lê a data pela
 * verdade do valor, para '' não ser "sem data" aqui e "com data" no SQL (IS NULL).
 */
const temData = (valor: string | null | undefined): boolean => valor != null;

// --- Membro de um núcleo ----------------------------------------------------------------------------

/** Em SQL: `pessoa` é membro do núcleo da coluna `nucleo` (parente não conta). */
const sqlEhMembro = (nucleo: string, pessoa: string) =>
  `EXISTS (SELECT 1 FROM nucleo_membros nm WHERE nm.nucleo_id = ${nucleo} AND nm.integrante_id = ${pessoa} AND nm.papel = 'membro')`;

// --- Público e núcleos --------------------------------------------------------------------------------

/**
 * O público alcança quem olha: aberto a todos, ou restrito a núcleos e quem olha é membro de pelo menos um.
 * Vale para a memória, o capítulo, o casal com famílias escolhidas e o público de um pedido de relato.
 * Ser citado não dá acesso, e administrador não tem visão especial.
 */
export const alcanca = (p: Publico, nucleos: readonly string[] = []): boolean => p.visibilidade === 'todos' || p.nucleos.some((n) => nucleos.includes(n));

/** alcanca, em SQL, para a memória `m`: aberta a todos, ou um dos núcleos dela tem quem olha como membro. */
export const sqlAlcancaAMemoria = (m = 'm', pessoa = '?1'): string => `(
    ${coluna(m, 'visibilidade')} = 'todos'
    OR EXISTS (
      SELECT 1 FROM memoria_nucleos mn
      JOIN nucleo_membros nm ON nm.nucleo_id = mn.nucleo_id
      WHERE mn.memoria_id = ${coluna(m, 'id')} AND nm.integrante_id = ${pessoa} AND nm.papel = 'membro'
    )
  )`;

/** O casal que a família toda vê: aberto a todos. As pessoas do casal e quem cadastrou veem sempre (podeVerCasal). */
export const casalAberto = (c: { visibilidade: 'todos' | 'nucleos' | 'privado' }): boolean => c.visibilidade === 'todos';

/** casalAberto, em SQL, para o casal `c`. */
export const sqlCasalAberto = (c = ''): string => `${coluna(c, 'visibilidade')} = 'todos'`;

// --- A memória ---------------------------------------------------------------------------------------

export interface MemoriaParaVer extends Publico {
  situacao: 'rascunho' | 'publicada';
  criadaPor: string;
  /** quando foi para a lixeira; null ou ausente, fora dela ('' conta como data, como no SQL) */
  excluidaEm?: string | null;
}

export interface OpcoesDaMemoria {
  /** "fora" (o padrão): a memória na lixeira some. "qualquer": a regra vale dentro e fora da lixeira. */
  lixeira?: 'fora' | 'qualquer';
  /** "publicada": só a memória publicada, sem o rascunho de quem escreve. */
  so?: 'publicada';
}

/**
 * Quem vê uma memória.
 * - Rascunho: só quem está escrevendo.
 * - Publicada: quem o público dela alcança (alcanca).
 * - Na lixeira: ninguém, salvo com `lixeira: 'qualquer'` (a lixeira de quem pede, a restauração).
 */
export function veMemoria(leitor: Leitor, m: MemoriaParaVer, opcoes: OpcoesDaMemoria = {}): boolean {
  if ((opcoes.lixeira ?? 'fora') === 'fora' && temData(m.excluidaEm)) return false;
  if (m.situacao === 'rascunho') return opcoes.so !== 'publicada' && m.criadaPor === leitor.pessoa;
  return alcanca(m, leitor.nucleos);
}

/** veMemoria, em SQL, para a memória `m` e quem olha em `pessoa`. */
export function sqlVeMemoria(opcoes: OpcoesDaMemoria & { m?: string; pessoa?: string } = {}): string {
  const { m = 'm', pessoa = '?1' } = opcoes;
  const situacao = coluna(m, 'situacao');
  const regra = `(
  (${situacao} = 'rascunho' AND ${coluna(m, 'criada_por')} = ${pessoa})
  OR (${situacao} = 'publicada' AND ${sqlAlcancaAMemoria(m, pessoa)})
)`;
  const semLixeira = (opcoes.lixeira ?? 'fora') === 'fora' ? `(${coluna(m, 'excluida_em')} IS NULL AND ${regra})` : regra;
  return opcoes.so === 'publicada' ? `(${semLixeira} AND ${situacao} = 'publicada')` : semLixeira;
}

// --- O relato que espera o sim de quem o registrou ---------------------------------------------------

/**
 * O relato espera o sim de quem o registrou: tem uma lista de famílias, vazia ou não. A lista vazia espera,
 * o lado mais fechado (resposta do Gui à pergunta 2 da auditoria AC, 26/11/2026): o relato fica só com quem
 * registrou até o sim. Sem espera é sempre NULL no banco (gravarEspera); o valor '' é lido como sem espera.
 */
export const relatoEspera = (soParaNucleos: readonly string[] | null | undefined): boolean => soParaNucleos != null;

/** relatoEspera, em SQL, para o relato `r`. */
export const sqlRelatoEspera = (r = 'r'): string => `(${coluna(r, 'so_para_nucleos')} IS NOT NULL AND ${coluna(r, 'so_para_nucleos')} <> '')`;

/** O contrário de sqlRelatoEspera: o relato acompanha a memória. */
export const sqlRelatoNaoEspera = (r = 'r'): string => `(${coluna(r, 'so_para_nucleos')} IS NULL OR ${coluna(r, 'so_para_nucleos')} = '')`;

/** A coluna so_para_nucleos (migração 025, em JSON) como o TS a lê: a lista, ou nada (sem espera). */
export const lerEspera = (valor: unknown): string[] | null => (typeof valor === 'string' && valor ? (JSON.parse(valor) as string[]) : null);

/** A coluna so_para_nucleos como o site grava: a lista em JSON, ou NULL (sem espera). Nunca '' nem '[]' para sem espera. */
export const gravarEspera = (soParaNucleos: readonly string[] | null | undefined): string | null => (relatoEspera(soParaNucleos) ? JSON.stringify([...soParaNucleos!]) : null);

/**
 * O relato que espera fica só para quem já o viu: os membros dos núcleos do público conhecido dele. Quem
 * registrou sempre vê o que escreveu. Sem espera, o relato acompanha a memória.
 */
export function estaNoPublicoDoRelato(relato: { registradoPor: string; soParaNucleos?: readonly string[] | null }, leitor: Leitor): boolean {
  if (!relatoEspera(relato.soParaNucleos)) return true;
  if (relato.registradoPor === leitor.pessoa) return true;
  return relato.soParaNucleos!.some((n) => (leitor.nucleos ?? []).includes(n));
}

/** estaNoPublicoDoRelato, em SQL. O CASE garante que a lista só é lida quando o relato espera. */
export const sqlEstaNoPublicoDoRelato = (r = 'r', pessoa = '?1'): string =>
  `(CASE WHEN ${sqlRelatoEspera(r)} THEN (${coluna(r, 'registrado_por')} = ${pessoa} OR EXISTS (
    SELECT 1 FROM json_each(${coluna(r, 'so_para_nucleos')}) j WHERE ${sqlEhMembro('j.value', pessoa)}
  )) ELSE 1 END)`;

// --- Quem quem olha não vê ---------------------------------------------------------------------------

const EXCLUIDAS = Symbol('excluidas');
type ComExcluidas = ReadonlySet<string> & { [EXCLUIDAS]?: ReadonlySet<string> };

/**
 * Marca, no conjunto de quem a pessoa logada não vê, quem está ali por estar na lixeira. Para as telas,
 * as duas coisas são iguais (a pessoa some); só o relato distingue: o de quem está na lixeira fica.
 */
export function comExcluidas<T extends Set<string>>(naoVe: T, excluidas: ReadonlySet<string>): T {
  Object.defineProperty(naoVe, EXCLUIDAS, { value: excluidas, enumerable: false });
  return naoVe;
}
export const excluidasDe = (naoVe: ReadonlySet<string>): ReadonlySet<string> => (naoVe as ComExcluidas)[EXCLUIDAS] ?? new Set();

/**
 * Quem a pessoa logada não vê: quem só existe num laço do coração privado de outra pessoa, sem nenhum
 * laço que ela veja. Nem o nome aparece, na árvore, e nem o retrato é entregue.
 */
export function pessoasQueNaoVe(emPrivadosDeOutros: ReadonlySet<string>, comLacoVisivel: ReadonlySet<string>): Set<string> {
  return new Set([...emPrivadosDeOutros].filter((id) => !comLacoVisivel.has(id)));
}

/**
 * A conta de quem quem olha não vê, a partir dos laços que ela vê (filiações, os casais que ela vê e os
 * laços do coração que ela vê). Quem olha sempre se vê, mesmo sem laço nenhum além do privado de outra
 * pessoa. É a mesma conta da árvore e de pessoasQueONaoVe (repositorio.ts).
 */
export function quemNaoVe(
  emPrivadosDeOutros: ReadonlySet<string>,
  lacos: {
    filiacoes: readonly { filho: string; responsavel: string }[];
    casais: readonly { a: string; b: string }[];
    lacosDoCoracao: readonly { dono: string; pessoa: string }[];
  },
  eu: string,
): Set<string> {
  const comLaco = new Set([eu, ...lacos.filiacoes.flatMap((f) => [f.filho, f.responsavel]), ...lacos.casais.flatMap((c) => [c.a, c.b]), ...lacos.lacosDoCoracao.flatMap((l) => [l.dono, l.pessoa])]);
  return pessoasQueNaoVe(emPrivadosDeOutros, comLaco);
}

/** Quem quem olha não vê, como parâmetros de sqlVeORelato: as duas listas em JSON. */
export const naoVeParaSql = (naoVe: ReadonlySet<string>): { naoVe: string; excluidas: string } => ({ naoVe: JSON.stringify([...naoVe]), excluidas: JSON.stringify([...excluidasDe(naoVe)]) });

// --- Ver um relato ----------------------------------------------------------------------------------

/**
 * Ver um relato (decisão do Gui, 17/11/2026): o relato registrado em nome de quem quem olha não vê some
 * inteiro; o de quem está na lixeira fica, com o nome. Quem registrou sempre vê. Por cima, o relato que
 * espera fica com o público dele (estaNoPublicoDoRelato). A memória em si não muda.
 */
export function veORelato(relato: { por: string; registradoPor: string; soParaNucleos?: readonly string[] | null }, leitor: Leitor, naoVe: ReadonlySet<string>): boolean {
  if (relato.registradoPor === leitor.pessoa) return true;
  const naLixeira = excluidasDe(naoVe).has(relato.por);
  return (naLixeira || !naoVe.has(relato.por)) && estaNoPublicoDoRelato(relato, leitor);
}

/** veORelato, em SQL. `naoVe` e `excluidas` são os parâmetros com as listas de naoVeParaSql. */
export const sqlVeORelato = (r = 'r', pessoa = '?1', naoVe = '?2', excluidas = '?3'): string =>
  `(${coluna(r, 'registrado_por')} = ${pessoa} OR (
    (${coluna(r, 'por')} IN (SELECT value FROM json_each(${excluidas})) OR ${coluna(r, 'por')} NOT IN (SELECT value FROM json_each(${naoVe})))
    AND ${sqlEstaNoPublicoDoRelato(r, pessoa)}
  ))`;

/**
 * O relato está à vista: publicado, ou o rascunho de quem o registrou que não foi descartado. O rascunho de
 * outra pessoa não aparece, e ninguém fica sabendo dele.
 * `descartadoTambem` é a exceção do áudio (V-3 da auditoria AC, na fila): quem registrou ainda ouve o áudio
 * do rascunho que descartou.
 */
export function relatoAberto(relato: { situacao: 'rascunho' | 'publicada'; registradoPor: string; descartadoEm?: string | null }, leitor: Leitor, opcoes: { descartadoTambem?: boolean } = {}): boolean {
  return relato.situacao === 'publicada' || (relato.registradoPor === leitor.pessoa && (Boolean(opcoes.descartadoTambem) || !temData(relato.descartadoEm)));
}

/** relatoAberto, em SQL. */
export const sqlRelatoAberto = (r = 'r', pessoa = '?1', opcoes: { descartadoTambem?: boolean } = {}): string =>
  `(${coluna(r, 'situacao')} = 'publicada' OR (${coluna(r, 'registrado_por')} = ${pessoa}${opcoes.descartadoTambem ? '' : ` AND ${coluna(r, 'descartado_em')} IS NULL`}))`;

// --- A TV e a sala ----------------------------------------------------------------------------------

/**
 * O relato vai à TV: publicado, sem esperar o sim de ninguém e não descartado. O relato que espera nunca vai
 * à TV, nem o texto nem a voz, na sala ou fora dela: a TV é uma tela que outras pessoas olham.
 */
export const relatoNaTv = (r: { situacao: 'rascunho' | 'publicada'; soParaNucleos: readonly string[] | null; descartadoEm?: string | null }): boolean =>
  r.situacao === 'publicada' && !relatoEspera(r.soParaNucleos) && !temData(r.descartadoEm);

/** relatoNaTv, em SQL. */
export const sqlRelatoNaTv = (r = 'r'): string => `(${coluna(r, 'situacao')} = 'publicada' AND ${sqlRelatoNaoEspera(r)} AND ${coluna(r, 'descartado_em')} IS NULL)`;

/** A memória entra na sala: publicada e aberta a toda a família. */
export const entraNaSala = (m: { situacao: 'rascunho' | 'publicada'; visibilidade: 'todos' | 'nucleos' }): boolean => m.situacao === 'publicada' && m.visibilidade === 'todos';

/** entraNaSala, em SQL. */
export const sqlEntraNaSala = (m = 'm'): string => `(${coluna(m, 'situacao')} = 'publicada' AND ${coluna(m, 'visibilidade')} = 'todos')`;

// --- A memória para quem olha (para a D2) -------------------------------------------------------------

/** A foto que paraOLeitor lê: a da memória (sem relato) pode virar a foto-chave. */
interface FotoDeEntrada {
  chave: string;
  legenda: string | null;
  principal: boolean;
  relatoId: number | null;
  copias: Copias | null;
}

/** A memória que paraOLeitor lê: a Memoria de repositorio.ts serve, com o que mais tiver. */
export interface MemoriaDeEntrada {
  id: string;
  titulo: string;
  ano: number;
  mes: number | null;
  dia: number | null;
  aproximada: boolean;
  lugar: string | null;
  tipo: string;
  tipoOutro: string | null;
  fotos: readonly FotoDeEntrada[];
  integrantes: readonly string[];
  capitulos: readonly string[];
  temas: readonly string[];
}

/**
 * O que pode sair do servidor para quem olha, numa lista leve: só os campos desta lista. Sem núcleos, sem
 * relatos, sem quem criou e sem as outras fotos. A D2 acrescenta campo aqui de propósito, se precisar.
 */
export interface MemoriaParaOLeitor {
  id: string;
  titulo: string;
  ano: number;
  mes: number | null;
  dia: number | null;
  aproximada: boolean;
  lugar: string | null;
  tipo: string;
  tipoOutro: string | null;
  /** a foto principal da memória, nunca uma que veio com um relato */
  fotoChave: { chave: string; legenda: string | null; copias: Copias | null } | null;
  /** quem estava, sem quem o leitor não vê */
  integrantes: string[];
  /** os capítulos que o leitor vê */
  capitulos: string[];
  /** os temas que o leitor vê */
  temas: string[];
}

/** O que o leitor vê, para paraOLeitor: quem ele não vê (pessoasQueONaoVe) e os capítulos e temas que vê. */
export interface VistoPeloLeitor {
  naoVe: ReadonlySet<string>;
  capitulosQueVe: ReadonlySet<string>;
  temasQueVe: ReadonlySet<string>;
}

/**
 * As cópias da foto-chave, campo a campo como Copias as lista (rodada 2 da revisão MEM-2): o que mais vier no
 * objeto do banco fica no servidor. As medidas saem como listas novas, e a da original só quando existe.
 */
function projetarCopias(copias: Copias | null): Copias | null {
  if (!copias) return null;
  const medida = (m: readonly [number, number]): [number, number] => [m[0], m[1]];
  return {
    formato: copias.formato,
    pequena: medida(copias.pequena),
    media: medida(copias.media),
    ...(copias.original ? { original: medida(copias.original) } : {}),
    bytes: copias.bytes,
  };
}

/**
 * A memória como pode sair do servidor para quem olha: uma projeção campo a campo (revisão MEM-2 da AC3), e
 * não a memória inteira com filtros. Sai só o que MemoriaParaOLeitor lista, sem as pessoas que ele não vê
 * (quem só existe num laço privado de outra pessoa, quem está na lixeira), sem os capítulos e os temas que
 * ele não vê e sem as fotos que vieram com um relato. Hoje as telas tiram cada coisa por conta própria; a
 * lista leve da D2 nasce daqui, para não levar ao celular o que as telas escondem.
 */
export function paraOLeitor(m: MemoriaDeEntrada, visto: VistoPeloLeitor): MemoriaParaOLeitor {
  const daMemoria = m.fotos.filter((f) => f.relatoId === null);
  const chave = daMemoria.find((f) => f.principal) ?? daMemoria[0];
  return {
    id: m.id,
    titulo: m.titulo,
    ano: m.ano,
    mes: m.mes,
    dia: m.dia,
    aproximada: m.aproximada,
    lugar: m.lugar,
    tipo: m.tipo,
    tipoOutro: m.tipoOutro,
    fotoChave: chave ? { chave: chave.chave, legenda: chave.legenda, copias: projetarCopias(chave.copias) } : null,
    integrantes: m.integrantes.filter((id) => !visto.naoVe.has(id)),
    capitulos: m.capitulos.filter((id) => visto.capitulosQueVe.has(id)),
    temas: m.temas.filter((id) => visto.temasQueVe.has(id)),
  };
}
