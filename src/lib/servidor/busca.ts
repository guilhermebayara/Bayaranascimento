// A busca do site (docs/regras/explorar.md, "A busca"): o que ela acha, só com o que a pessoa vê. A regra de
// achar fica em src/lib/busca.ts; o índice dos textos, na migração 116 (busca_textos e o FTS5 busca_indice).
//
// O índice só acha candidatos. Quem vê o quê segue as regras de sempre, de src/lib/servidor/quem-ve.ts:
// - memória: só a publicada que a pessoa vê, fora da lixeira (sqlVeMemoria, na leitura das candidatas);
// - pessoa: só quem a pessoa vê (listarIntegrantesQueVe), sem o ex que ela deixou discreto ou fora;
// - relato: só o publicado que ela lê na página da memória (veORelato, sobre o relato lido junto do acerto), o que tira o
//   relato que espera de quem ainda não pode lê-lo (também a lista vazia, '[]', que espera como qualquer lista)
//   e o de quem só existe num laço privado de outra pessoa;
// - áudio: só a transcrição que não foi removida, de um relato desses;
// - legenda: só a da foto que não foi removida, que está na memória e, quando veio com um relato, desse relato.
// O que fica de fora não acha nada, não vira trecho, sugestão nem contagem, e o vazio responde igual ao que
// não existe. A regra da memória entra no SQL pelo fragmento importado de quem-ve.ts (a regra da AC3); a do
// relato é decidida no código, com o predicado de lá. Este arquivo não escreve condição de quem vê o quê à mão
// (a guarda confere, regra 15).
import { memoriaDoCapitulo, type Capitulo } from '../capitulos';
import { acha, buscar, normalizar, palavras, termos, consultaDoIndice, type Achado, type DocumentoDaBusca, type Motivo, type PessoaAchada, type TextoDaBusca } from '../busca';
import { tipoDaMemoria, type Tipo } from '../tipos';
import { fontesDaFoto, lerCopias, type Fontes } from '../copias-das-fotos';
import { coresDasPessoas } from '../familias';
import { enderecoDoRetrato } from '../retratos';
import { banco } from './ambiente';
import { parentescosDeQuemOlha } from './parentesco-de-quem-olha';
import type { Usuario } from './permissoes';
import { lerEspera, sqlVeMemoria, veORelato } from './quem-ve';
import {
  comoOsExesAparecem,
  listarCapitulos,
  listarCasais,
  listarNucleos,
  listarIntegrantesQueVe,
  listarTemas,
  listarTemasVisiveis,
  nomesDasPessoasExcluidas,
  pessoasQueONaoVe,
  type Integrante,
  type Memoria,
} from './repositorio';

const db = () => banco();
const dentro = `IN (SELECT value FROM json_each(?))`;
/**
 * A lista de ids lida pela junção com json_each, e não por `IN (SELECT ...)`: o IN monta uma tabela temporária a
 * cada consulta, e com centenas de ids a junção lê perto de 30% menos (medido com o acervo cheio).
 */
const lidaDaLista = (apelido: string, parametro = '?') => `json_each(${parametro}) ${apelido}`;

/** Uma memória como a busca a conhece: o que ela mostra e o que decide quem a vê. */
export interface MemoriaDaBusca {
  id: string;
  titulo: string;
  ano: number;
  mes: number | null;
  dia: number | null;
  aproximada: boolean;
  lugar: string | null;
  tipo: string;
  tipoOutro: string | null;
  situacao: 'rascunho' | 'publicada';
  visibilidade: 'todos' | 'nucleos';
  criadaPor: string;
  excluida: boolean;
  nucleos: string[];
  integrantes: string[];
  capitulos: string[];
  temas: string[];
}

export interface ResultadoDaBusca {
  /** as memórias que respondem, das que mais respondem para as que menos, com o porquê */
  achados: Achado[];
  /** os dados de cada memória achada, para a tela */
  memorias: Map<string, MemoriaDaBusca>;
  /** as pessoas cujo nome, apelido ou parentesco responde a todas as palavras, com a conta das memórias */
  pessoas: (PessoaAchada & { integrante: Integrante })[];
  capitulos: { id: string; nome: string }[];
  temas: { id: string; nome: string }[];
}

const VAZIO: ResultadoDaBusca = { achados: [], memorias: new Map(), pessoas: [], capitulos: [], temas: [] };

/** As outras formas de dizer o mesmo parentesco, como a família fala: "vó" e "vovó" também acham a avó. */
const FORMAS_DO_PARENTESCO: Record<string, string[]> = { avo: ['vo', 'vovo'], bisavo: ['bisa', 'biso'], mae: ['mamae'], pai: ['papai'], tia: ['titia'], tio: ['titio'] };
const palavrasDe = (texto: string) => palavras(normalizar(texto)).map((p) => p.palavra);
const palavrasDoParentesco = (parentesco: string) => {
  const base = palavrasDe(parentesco);
  return [...base, ...base.flatMap((p) => FORMAS_DO_PARENTESCO[p] ?? [])];
};
const achaEm = (termo: string, texto: string | null | undefined) => Boolean(texto) && palavrasDe(texto!).some((p) => acha(termo, p));

/** A memória de uma linha do banco, sem as ligações. */
function daLinha(r: Record<string, unknown>): MemoriaDaBusca {
  return {
    id: r.id as string,
    titulo: r.titulo as string,
    ano: r.ano as number,
    mes: (r.mes as number | null) ?? null,
    dia: (r.dia as number | null) ?? null,
    aproximada: Boolean(r.aproximada),
    lugar: (r.lugar as string | null) ?? null,
    tipo: r.tipo as string,
    tipoOutro: (r.tipo_outro as string | null) ?? null,
    situacao: r.situacao as MemoriaDaBusca['situacao'],
    visibilidade: r.visibilidade as MemoriaDaBusca['visibilidade'],
    criadaPor: r.criada_por as string,
    excluida: r.excluida_em != null,
    nucleos: [],
    integrantes: [],
    capitulos: [],
    temas: [],
  };
}

/**
 * Lê, pelo id, as memórias que a pessoa vê, só com o que a busca mostra (sem as ligações): a regra de quem vê
 * é o fragmento de quem-ve.ts, só publicada e fora da lixeira. As ligações que contam para a busca (as pessoas,
 * os capítulos e os temas achados) já vêm das consultas por pessoa, capítulo e tema.
 */
async function lerMemoriasQueVe(usuario: Usuario, lista: string[]): Promise<Map<string, MemoriaDaBusca>> {
  if (lista.length === 0) return new Map();
  const { results } = await db()
    .prepare(
      `SELECT m.id, m.titulo, m.ano, m.mes, m.dia, m.aproximada, m.lugar, m.tipo, m.tipo_outro, m.situacao, m.visibilidade, m.criada_por, m.excluida_em
       FROM ${lidaDaLista('j', '?1')} JOIN memorias m ON m.id = j.value WHERE ${sqlVeMemoria({ so: 'publicada', pessoa: '?2' })}`,
    )
    .bind(JSON.stringify(lista), usuario.pessoa)
    .all<Record<string, unknown>>();
  return new Map((results as Record<string, unknown>[]).map((r) => [r.id as string, daLinha(r)]));
}

/**
 * As ligações inteiras (pessoas e famílias) das memórias: só quando um capítulo por período com pessoas ou
 * famílias foi achado pelo nome, para memoriaDoCapitulo decidir.
 */
async function lerLigacoes(lista: string[]): Promise<Map<string, { integrantes: string[]; nucleos: string[] }>> {
  if (lista.length === 0) return new Map();
  const [integrantes, nucleos] = await db().batch<Record<string, unknown>>([
    db().prepare(`SELECT x.memoria_id, x.integrante_id FROM ${lidaDaLista('j')} JOIN memoria_integrantes x ON x.memoria_id = j.value ORDER BY x.memoria_id, x.integrante_id`).bind(JSON.stringify(lista)),
    db().prepare(`SELECT x.memoria_id, x.nucleo_id FROM ${lidaDaLista('j')} JOIN memoria_nucleos x ON x.memoria_id = j.value ORDER BY x.memoria_id, x.nucleo_id`).bind(JSON.stringify(lista)),
  ]);
  type Linhas = { results: Record<string, unknown>[] };
  const mapa = new Map(lista.map((id) => [id, { integrantes: [] as string[], nucleos: [] as string[] }]));
  for (const r of (integrantes as Linhas).results) mapa.get(r.memoria_id as string)?.integrantes.push(r.integrante_id as string);
  for (const r of (nucleos as Linhas).results) mapa.get(r.memoria_id as string)?.nucleos.push(r.nucleo_id as string);
  return mapa;
}

/** A memória que a página já leu (listarMemorias, só o que a pessoa vê), no jeito da busca. */
const daPagina = (m: Memoria): MemoriaDaBusca => ({
  id: m.id,
  titulo: m.titulo,
  ano: m.ano,
  mes: m.mes,
  dia: m.dia,
  aproximada: m.aproximada,
  lugar: m.lugar,
  tipo: m.tipo,
  tipoOutro: m.tipoOutro,
  situacao: m.situacao,
  visibilidade: m.visibilidade,
  criadaPor: m.criadaPor,
  excluida: false,
  nucleos: m.nucleos,
  integrantes: m.integrantes,
  capitulos: m.capitulos,
  temas: m.temas,
});

interface Acerto {
  memoria: string;
  campo: TextoDaBusca['campo'] | 'titulo' | 'lugar';
  id: number;
  /** o texto achado, para o trecho (no relato, no áudio e na legenda) */
  texto: string;
  /** quem contou, no relato e no áudio */
  por: string | null;
}

/** A consulta dos detalhes de um acerto: o texto e a regra do relato, do áudio e da foto. */
const DETALHES = `t.id, t.memoria_id, t.campo, t.texto, r.id AS relato, r.memoria_id AS memoria_do_relato, r.por, r.registrado_por, r.so_para_nucleos, r.situacao AS situacao_do_relato,
  a.removido_em AS audio_removido, f.memoria_id AS memoria_da_foto, f.relato_id AS relato_da_foto, f.removida_em AS foto_removida`;
const JUNCOES = `LEFT JOIN audios a ON a.id = (CASE WHEN t.campo = 'audio' THEN t.ref END)
  LEFT JOIN fotos f ON f.id = (CASE WHEN t.campo = 'legenda' THEN t.ref END)
  LEFT JOIN relatos r ON r.id = (CASE t.campo WHEN 'relato' THEN t.ref WHEN 'audio' THEN a.relato_id WHEN 'legenda' THEN f.relato_id END)`;

/**
 * O acerto que a pessoa pode ler. O SQL só lê; quem decide é o código, aqui, linha por linha, com a regra de
 * quem-ve.ts: o relato pela regra da página da memória (veORelato, com a espera lida por lerEspera, que mantém
 * '[]' como espera), publicado e desta memória; o áudio não removido de um relato desses; a legenda da foto não
 * removida, desta memória e, quando veio com um relato, de um relato desses.
 */
function quemPodeLer(usuario: Usuario, naoVe: ReadonlySet<string>) {
  return (l: Record<string, unknown>): boolean => {
    if (l.campo === 'titulo' || l.campo === 'lugar') return true;
    const relatoLido =
      l.relato != null &&
      l.situacao_do_relato === 'publicada' &&
      l.memoria_do_relato === l.memoria_id &&
      veORelato({ por: l.por as string, registradoPor: l.registrado_por as string, soParaNucleos: lerEspera(l.so_para_nucleos) }, usuario, naoVe);
    if (l.campo === 'relato') return relatoLido;
    if (l.campo === 'audio') return relatoLido && l.audio_removido == null;
    return l.foto_removida == null && l.memoria_da_foto === l.memoria_id && (l.relato_da_foto == null || relatoLido);
  };
}
const paraAcerto = (l: Record<string, unknown>): Acerto => ({ memoria: l.memoria_id as string, campo: l.campo as Acerto['campo'], id: l.id as number, texto: l.texto as string, por: (l.por as string | null) ?? null });

/**
 * Os acertos do índice para cada termo. Com uma palavra, já com o texto e só os que a pessoa pode ler (o
 * relato do texto, do áudio ou da foto vem na mesma consulta, e quemPodeLer decide), e `detalhados` é verdade.
 * A regra do relato fica no código: o fragmento SQL dela (sqlVeORelato) lê uma linha a mais por acerto, no
 * `NOT IN` de quem a pessoa não vê, e a palavra comum acha centenas de relatos. Com mais de uma, só o lugar de cada acerto (o id e a memória), a mais e nunca a menos:
 * a palavra comum ("vó", "eu") acha centenas de textos, e os detalhes só valem para as memórias que respondem a
 * todas as palavras (detalharAcertos). O título e o lugar acompanham a memória, conferida na leitura das
 * candidatas (sqlVeMemoria). O áudio e a foto entram pelo id só no campo deles (o CASE no ON): com a condição
 * do campo fora do ON, cada acerto lia também o áudio e a foto de mesmo número.
 */
async function acertosDoIndice(usuario: Usuario, procurados: string[]): Promise<{ porTermo: Acerto[][]; detalhados: boolean }> {
  const indice = `busca_indice JOIN busca_textos t ON t.id = busca_indice.rowid`;
  if (procurados.length === 1) {
    const [{ results }, naoVe] = await Promise.all([
      db().prepare(`SELECT ${DETALHES} FROM ${indice} ${JUNCOES} WHERE busca_indice MATCH ?`).bind(consultaDoIndice(procurados[0]!)).all<Record<string, unknown>>(),
      pessoasQueONaoVe(usuario),
    ]);
    return { porTermo: [(results as Record<string, unknown>[]).filter(quemPodeLer(usuario, naoVe)).map(paraAcerto).sort((a, b) => a.id - b.id)], detalhados: true };
  }
  const respostas = await db().batch<Record<string, unknown>>(procurados.map((t) => db().prepare(`SELECT t.id, t.memoria_id, t.campo FROM ${indice} WHERE busca_indice MATCH ?`).bind(consultaDoIndice(t))));
  const porTermo = (respostas as { results: Record<string, unknown>[] }[]).map((r) =>
    r.results.map((l) => ({ memoria: l.memoria_id as string, campo: l.campo as Acerto['campo'], id: l.id as number, texto: '', por: null })).sort((a, b) => a.id - b.id),
  );
  return { porTermo, detalhados: false };
}

/** Os detalhes dos acertos dados, só os que a pessoa pode ler (a mesma regra da consulta de uma palavra). */
async function detalharAcertos(usuario: Usuario, lista: number[]): Promise<Acerto[]> {
  if (lista.length === 0) return [];
  const [{ results }, naoVe] = await Promise.all([
    db().prepare(`SELECT ${DETALHES} FROM ${lidaDaLista('j')} JOIN busca_textos t ON t.id = j.value ${JUNCOES}`).bind(JSON.stringify(lista)).all<Record<string, unknown>>(),
    pessoasQueONaoVe(usuario),
  ]);
  return (results as Record<string, unknown>[]).filter(quemPodeLer(usuario, naoVe)).map(paraAcerto);
}

/** Os textos achados de cada memória (o relato, o áudio e a legenda), na ordem do índice, sem repetir. */
function textosDosAcertos(acertos: Acerto[], memorias: ReadonlySet<string>, nomeDe: (id: string) => string): Map<string, TextoDaBusca[]> {
  const porTexto = new Map<string, TextoDaBusca[]>();
  const vistos = new Set<number>();
  for (const a of [...acertos].sort((x, y) => x.id - y.id)) {
    if (a.campo === 'titulo' || a.campo === 'lugar' || !memorias.has(a.memoria) || vistos.has(a.id)) continue;
    vistos.add(a.id);
    const texto: TextoDaBusca = { campo: a.campo, por: a.campo === 'legenda' ? '' : nomeDe(a.por ?? ''), texto: a.texto };
    porTexto.set(a.memoria, [...(porTexto.get(a.memoria) ?? []), texto]);
  }
  return porTexto;
}

/**
 * O que a busca acha para quem procura. `vistas`, se vier, são as memórias que a página já leu
 * (listarMemorias: só as que a pessoa vê); sem ela (a folha da busca e a página /busca), as memórias
 * candidatas são lidas pelo id, e quem vê o quê é decidido aqui, sobre elas.
 */
export async function buscarNoAcervo(usuario: Usuario, tipos: readonly Tipo[], busca: string, vistas?: Memoria[]): Promise<ResultadoDaBusca> {
  const procurados = termos(busca);
  if (procurados.length === 0) return VAZIO;
  const [integrantes, exes, capitulos, temas, excluidas, doIndice] = await Promise.all([
    listarIntegrantesQueVe(usuario),
    comoOsExesAparecem(usuario),
    listarCapitulos(usuario),
    // Com as memórias da página, os temas que ela vê (a página já leu); sem elas, todos, e o grupo "Capítulos e
    // temas" mostra só os que têm uma memória que a pessoa vê ou estão num capítulo que ela vê
    vistas ? listarTemasVisiveis(usuario) : listarTemas(),
    nomesDasPessoasExcluidas(),
    acertosDoIndice(usuario, procurados),
  ]);
  const porTermo = doIndice.porTermo;
  // O ex que quem procura deixou discreto ou fora não é achado pelo nome (docs/regras/integrantes.md, "Ex-casal")
  const pessoas = integrantes.filter((i) => !exes.has(i.id));
  const parentescos = await parentescosDeQuemOlha(usuario, pessoas);
  const pessoaPorId = new Map(pessoas.map((p) => [p.id, p]));
  const nomeDe = (id: string) => {
    const i = integrantes.find((x) => x.id === id);
    return i?.apelido ?? i?.nome ?? excluidas.get(id) ?? 'alguém';
  };
  const nomesDaPessoa = (p: Integrante) => [p.apelido ?? p.nome, p.nome, p.apelidoDaFamilia ?? ''].filter(Boolean);
  const pessoaResponde = (p: Integrante, termo: string) => nomesDaPessoa(p).some((n) => achaEm(termo, n)) || palavrasDoParentesco(parentescos.get(p.id) ?? '').some((w) => acha(termo, w));
  const tipoResponde = (t: Tipo, termo: string) => t.id !== '' && achaEm(termo, t.rotulo);

  // Para cada termo, o que o acha fora do índice: as pessoas, os capítulos, os temas, os tipos e o ano
  const fora = procurados.map((termo) => ({
    pessoas: pessoas.filter((p) => pessoaResponde(p, termo)).map((p) => p.id),
    capitulos: capitulos.filter((c) => achaEm(termo, c.titulo)),
    temas: temas.filter((t) => achaEm(termo, t.nome)).map((t) => t.id),
    tipos: tipos.filter((t) => tipoResponde(t, termo)).map((t) => t.id),
    ano: /^\d{4}$/.test(termo) ? Number(termo) : undefined,
  }));
  const pessoasAchadas = pessoas.filter((p) => procurados.every((t) => pessoaResponde(p, t)));

  // As memórias candidatas de cada termo. Com as memórias da página, tudo sai delas; sem elas, o banco diz
  // quais memórias têm a pessoa, o capítulo, o tema, o tipo ou o ano, e o índice diz as do texto
  const reunidos = (c: Capitulo) => new Set([c.id, ...capitulos.filter((x) => x.dentroDe === c.id).map((x) => x.id)]);
  const doCapitulo = (m: Pick<MemoriaDaBusca, 'capitulos' | 'ano' | 'mes' | 'dia' | 'integrantes' | 'nucleos'>, c: Capitulo) =>
    c.modo === 'epoca' ? memoriaDoCapitulo(m, c) : m.capitulos.some((x) => reunidos(c).has(x));
  let candidatasPorTermo: Set<string>[];
  let comPessoa: Map<string, Set<string>>;
  let memorias: Map<string, MemoriaDaBusca>;
  if (vistas) {
    memorias = new Map(vistas.filter((m) => m.situacao === 'publicada').map((m) => [m.id, daPagina(m)]));
    const todas = [...memorias.values()];
    candidatasPorTermo = fora.map((f, i) => {
      const ids = new Set(porTermo[i]!.map((a) => a.memoria));
      for (const m of todas) {
        if (m.integrantes.some((p) => f.pessoas.includes(p)) || f.capitulos.some((c) => doCapitulo(m, c)) || m.temas.some((t) => f.temas.includes(t)) || f.tipos.includes(m.tipo) || m.ano === f.ano) ids.add(m.id);
      }
      return ids;
    });
    comPessoa = new Map(pessoasAchadas.map((p) => [p.id, new Set(todas.filter((m) => m.integrantes.includes(p.id)).map((m) => m.id))]));
  } else {
    const todasAsPessoas = [...new Set([...fora.flatMap((f) => f.pessoas), ...pessoasAchadas.map((p) => p.id)])];
    const reunidosAchados = [...new Set(fora.flatMap((f) => f.capitulos.filter((c) => c.modo !== 'epoca').flatMap((c) => [...reunidos(c)])))];
    const porPeriodo = [...new Set(fora.flatMap((f) => f.capitulos.filter((c) => c.modo === 'epoca' && c.inicio)))];
    const temasAchados = [...new Set(fora.flatMap((f) => f.temas))];
    const tiposAchados = [...new Set(fora.flatMap((f) => f.tipos))];
    const anosAchados = [...new Set(fora.map((f) => f.ano).filter((a): a is number => a !== undefined))];
    // Primeiro, só os ids: as memórias de cada pessoa, capítulo, tema, tipo e ano achados. Só as consultas que têm
    // o que procurar vão ao banco; o capítulo por período entra pelo intervalo de anos (a regra fina vem depois)
    type Linhas = { results: Record<string, unknown>[] };
    const consultas: { chave: string; sql: string; valores: unknown[] }[] = [
      ...(todasAsPessoas.length ? [{ chave: 'pessoas', sql: `SELECT x.memoria_id, x.integrante_id FROM ${lidaDaLista('j')} JOIN memoria_integrantes x ON x.integrante_id = j.value`, valores: [JSON.stringify(todasAsPessoas)] }] : []),
      ...(reunidosAchados.length ? [{ chave: 'capitulos', sql: `SELECT x.memoria_id, x.capitulo_id FROM ${lidaDaLista('j')} JOIN capitulo_memorias x ON x.capitulo_id = j.value`, valores: [JSON.stringify(reunidosAchados)] }] : []),
      ...(temasAchados.length ? [{ chave: 'temas', sql: `SELECT x.rowid AS ordem, x.memoria_id, x.tema_id FROM ${lidaDaLista('j')} JOIN tema_memorias x ON x.tema_id = j.value`, valores: [JSON.stringify(temasAchados)] }] : []),
      ...(tiposAchados.length ? [{ chave: 'tipos', sql: `SELECT id, tipo FROM memorias WHERE tipo ${dentro}`, valores: [JSON.stringify(tiposAchados)] }] : []),
      ...anosAchados.map((a) => ({ chave: `ano:${a}`, sql: `SELECT id FROM memorias WHERE ano = ?`, valores: [a] })),
      ...porPeriodo.map((c) => ({ chave: `periodo:${c.id}`, sql: `SELECT id FROM memorias WHERE ano BETWEEN ? AND ?`, valores: [c.inicio!.ano, c.fim?.ano ?? 9999] })),
    ];
    const respostas: Linhas[] = consultas.length ? await db().batch<Record<string, unknown>>(consultas.map((c) => db().prepare(c.sql).bind(...c.valores))) : [];
    const resposta = new Map(consultas.map((c, n) => [c.chave, respostas[n]!.results]));
    const ligadas = (chave: string, coluna: string, valores: readonly string[]) =>
      (resposta.get(chave) ?? []).filter((l) => valores.includes(l[coluna] as string)).map((l) => (l.memoria_id ?? l.id) as string);
    const ids = (chave: string) => (resposta.get(chave) ?? []).map((l) => l.id as string);
    // As que podem responder a cada termo (a mais, nunca a menos: o período ainda sem a regra fina)
    const largasPorTermo = fora.map((f, i) => {
      const daqui = new Set(porTermo[i]!.map((a) => a.memoria));
      for (const id of ligadas('pessoas', 'integrante_id', f.pessoas)) daqui.add(id);
      for (const c of f.capitulos) {
        if (c.modo === 'epoca') for (const id of ids(`periodo:${c.id}`)) daqui.add(id);
        else for (const id of ligadas('capitulos', 'capitulo_id', [...reunidos(c)])) daqui.add(id);
      }
      for (const id of ligadas('temas', 'tema_id', f.temas)) daqui.add(id);
      for (const id of ligadas('tipos', 'tipo', f.tipos)) daqui.add(id);
      if (f.ano !== undefined) for (const id of ids(`ano:${f.ano}`)) daqui.add(id);
      return daqui;
    });
    // Depois, os dados e as ligações só das que podem responder a todas as palavras, e das memórias das
    // pessoas achadas (para a conta delas)
    const deTodas = [...largasPorTermo[0]!].filter((id) => largasPorTermo.every((l) => l.has(id)));
    const dasPessoasAchadas = new Map(pessoasAchadas.map((p) => [p.id, new Set(ligadas('pessoas', 'integrante_id', [p.id]))]));
    // As memórias são lidas leves, só as que a pessoa vê (sqlVeMemoria). Das ligações, a memória leva as que contam
    // para a busca, que já vieram das consultas acima: as pessoas, os capítulos reunidos e os temas achados, na
    // ordem em que a página da memória as lê (a pessoa pelo id, o tema pela ordem de entrada)
    memorias = await lerMemoriasQueVe(usuario, [...new Set([...deTodas, ...[...dasPessoasAchadas.values()].flatMap((m) => [...m])])]);
    const pessoasDe = new Map<string, string[]>();
    for (const l of resposta.get('pessoas') ?? []) pessoasDe.set(l.memoria_id as string, [...(pessoasDe.get(l.memoria_id as string) ?? []), l.integrante_id as string]);
    const capitulosDe = new Map<string, string[]>();
    for (const l of resposta.get('capitulos') ?? []) capitulosDe.set(l.memoria_id as string, [...(capitulosDe.get(l.memoria_id as string) ?? []), l.capitulo_id as string]);
    const temasDe = new Map<string, Record<string, unknown>[]>();
    for (const l of resposta.get('temas') ?? []) temasDe.set(l.memoria_id as string, [...(temasDe.get(l.memoria_id as string) ?? []), l]);
    // O capítulo por período com pessoas ou famílias precisa das ligações inteiras (memoriaDoCapitulo)
    const precisaDasLigacoes = porPeriodo.some((c) => c.pessoas.length > 0 || c.familias.length > 0);
    const inteiras = precisaDasLigacoes ? await lerLigacoes(deTodas.filter((id) => memorias.has(id))) : new Map<string, { integrantes: string[]; nucleos: string[] }>();
    for (const m of memorias.values()) {
      m.integrantes = inteiras.get(m.id)?.integrantes ?? [...(pessoasDe.get(m.id) ?? [])].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      m.nucleos = inteiras.get(m.id)?.nucleos ?? [];
      m.capitulos = capitulosDe.get(m.id) ?? [];
      m.temas = (temasDe.get(m.id) ?? []).sort((a, b) => (a.ordem as number) - (b.ordem as number)).map((l) => l.tema_id as string);
    }
    // A regra fina, com as ligações lidas: o capítulo por período pela data e de quem é (memoriaDoCapitulo)
    candidatasPorTermo = fora.map((f, i) => {
      const daqui = new Set([...largasPorTermo[i]!].filter((id) => !f.capitulos.some((c) => c.modo === 'epoca') || porTermo[i]!.some((a) => a.memoria === id)));
      for (const id of largasPorTermo[i]!) {
        const m = memorias.get(id);
        if (!m) continue;
        const pelaRegra =
          m.integrantes.some((p) => f.pessoas.includes(p)) || f.capitulos.some((c) => doCapitulo(m, c)) || m.temas.some((t) => f.temas.includes(t)) || f.tipos.includes(m.tipo) || m.ano === f.ano;
        if (pelaRegra) daqui.add(id);
      }
      return daqui;
    });
    comPessoa = dasPessoasAchadas;
  }

  // As memórias que podem responder a todas as palavras, entre as que a pessoa vê, pelo id: no empate de pontos,
  // a ordem do resultado é a do id, nos dois caminhos
  const candidatas = [...memorias.keys()].filter((id) => candidatasPorTermo.every((ids) => ids.has(id))).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  // Com mais de uma palavra, os detalhes (o texto e a regra) só dos acertos das memórias que podem responder
  const dasCandidatas = new Set(candidatas);
  const acertos = doIndice.detalhados
    ? porTermo.flat()
    : await detalharAcertos(usuario, [...new Set(porTermo.flat().filter((a) => a.campo !== 'titulo' && a.campo !== 'lugar' && dasCandidatas.has(a.memoria)).map((a) => a.id))]);
  const textos = textosDosAcertos(acertos, dasCandidatas, nomeDe);
  const nomeDoCapitulo = (m: MemoriaDaBusca) => capitulos.filter((c) => doCapitulo(m, c)).map((c) => c.titulo);
  const nomeDoTema = new Map(temas.map((t) => [t.id, t.nome]));
  const docs: DocumentoDaBusca[] = candidatas.map((id) => {
    const m = memorias.get(id)!;
    const tipo = tipoDaMemoria([...tipos], m);
    return {
      id,
      titulo: m.titulo,
      ano: m.ano,
      lugar: m.lugar,
      tipo: tipo.id ? tipo.rotulo : null,
      capitulos: nomeDoCapitulo(m),
      temas: m.temas.map((t) => nomeDoTema.get(t)).filter((t): t is string => Boolean(t)),
      pessoas: m.integrantes
        .filter((p) => pessoaPorId.has(p))
        .map((p) => {
          const i = pessoaPorId.get(p)!;
          return { id: p, nome: i.apelido ?? i.nome, outrosNomes: [i.nome, i.apelidoDaFamilia ?? ''].filter(Boolean), parentesco: parentescos.get(p) };
        }),
      textos: textos.get(id) ?? [],
    };
  });
  const achados = buscar(docs, busca);
  // As que a pessoa vê, entre as lidas, para a conta de cada pessoa achada e os temas que ela vê
  const visiveis = new Set(memorias.keys());
  const memoriasLidas = new Map(memorias);
  const achadas = new Set(achados.map((a) => a.id));
  for (const id of [...memorias.keys()]) if (!achadas.has(id)) memorias.delete(id);
  return {
    achados,
    memorias,
    pessoas: pessoasAchadas
      .map((p) => {
        // A conta: só as memórias que a pessoa vê e que a busca leu (as da página, ou as lidas pelo id)
        const ids = [...(comPessoa.get(p.id) ?? [])].filter((id) => visiveis.has(id));
        return { id: p.id, nome: p.apelido ?? p.nome, parentesco: parentescos.get(p.id), memorias: ids.length, integrante: p };
      })
      .filter((p) => p.memorias > 0)
      .sort((a, b) => b.memorias - a.memorias || a.nome.localeCompare(b.nome, 'pt-BR')),
    capitulos: capitulos.filter((c) => procurados.every((t) => achaEm(t, c.titulo))).map((c) => ({ id: c.id, nome: c.titulo })),
    temas: temas
      .filter((t) => procurados.every((x) => achaEm(x, t.nome)))
      .filter((t) => vistas || [...visiveis].some((id) => memoriasLidas.get(id)?.temas.includes(t.id)) || capitulos.some((c) => c.temas.includes(t.id)))
      .map((t) => ({ id: t.id, nome: t.nome })),
  };
}

// --- O resultado para a tela (a folha e a página /busca) --------------------------------------------


/** Quantas memórias a folha mostra; as outras ficam no "Ver as N memórias no Explorar". */
export const MEMORIAS_NA_FOLHA = 5;
/** Quantas pessoas, capítulos e temas a folha mostra. */
export const PESSOAS_NA_FOLHA = 4;
export const NOMES_NA_FOLHA = 3;

export interface MemoriaNaFolha {
  id: string;
  titulo: string;
  ano: number;
  mes: number | null;
  dia: number | null;
  aproximada: boolean;
  lugar: string | null;
  tipo: string;
  foto?: Fontes;
  motivos: Motivo[];
}
export interface PessoaNaFolha {
  id: string;
  nome: string;
  parentesco?: string;
  memorias: number;
  retrato: string | null;
  familia?: string;
  falecido: boolean;
}
export interface Folha {
  busca: string;
  memorias: MemoriaNaFolha[];
  total: number;
  pessoas: PessoaNaFolha[];
  capitulos: { id: string; nome: string }[];
  temas: { id: string; nome: string }[];
}

/**
 * O resultado da busca como a folha mostra: até cinco memórias, com a foto-chave pequena (a que a pessoa vê:
 * não removida e, se veio com um relato, de um relato que ela lê), as pessoas com o retrato e a cor da família,
 * e os capítulos e temas.
 */
export async function folhaDaBusca(usuario: Usuario, tipos: readonly Tipo[], busca: string): Promise<Folha> {
  const r = await buscarNoAcervo(usuario, tipos, busca);
  const primeiras = r.achados.slice(0, MEMORIAS_NA_FOLHA);
  const ids = JSON.stringify(primeiras.map((a) => a.id));
  const [fotos, nucleos, casais, naoVe] = await Promise.all([
    primeiras.length
      ? db().prepare(`SELECT id, memoria_id, chave, copias, relato_id, removida_em FROM fotos WHERE memoria_id ${dentro} ORDER BY principal DESC, ordem, id`).bind(ids).all<Record<string, unknown>>()
      : Promise.resolve({ results: [] as Record<string, unknown>[] }),
    r.pessoas.length ? listarNucleos() : Promise.resolve([]),
    r.pessoas.length ? listarCasais(usuario) : Promise.resolve([]),
    pessoasQueONaoVe(usuario),
  ]);
  type Linhas = { results: Record<string, unknown>[] };
  const deRelato = [...new Set((fotos as Linhas).results.map((f: Record<string, unknown>) => f.relato_id).filter((x: unknown) => x != null))];
  const relatos: Linhas = deRelato.length
    ? await db().prepare(`SELECT id, memoria_id, por, registrado_por, so_para_nucleos, situacao FROM relatos WHERE id ${dentro}`).bind(JSON.stringify(deRelato)).all<Record<string, unknown>>()
    : { results: [] };
  const relatoQueLe = new Set(
    relatos.results
      .filter((x) => x.situacao === 'publicada' && veORelato({ por: x.por as string, registradoPor: x.registrado_por as string, soParaNucleos: lerEspera(x.so_para_nucleos) }, usuario, naoVe))
      .map((x) => x.id as number),
  );
  const fotoDe = new Map<string, Fontes>();
  for (const f of (fotos as Linhas).results) {
    const memoria = f.memoria_id as string;
    // A foto removida e a que veio com um relato que a pessoa não lê ficam de fora, como na página da memória
    if (fotoDe.has(memoria) || f.removida_em != null || (f.relato_id != null && !relatoQueLe.has(f.relato_id as number))) continue;
    fotoDe.set(memoria, fontesDaFoto({ chave: f.chave as string, copias: lerCopias(f.copias) }, 'pequena', '72px'));
  }
  const corDe = r.pessoas.length ? coresDasPessoas(r.pessoas.map((p) => p.integrante), casais, nucleos.map((n: { id: string }) => n.id)) : () => undefined;
  return {
    busca,
    total: r.achados.length,
    memorias: primeiras.map((a) => {
      const m = r.memorias.get(a.id)!;
      return { id: m.id, titulo: m.titulo, ano: m.ano, mes: m.mes, dia: m.dia, aproximada: m.aproximada, lugar: m.lugar, tipo: m.tipo, foto: fotoDe.get(m.id), motivos: a.motivos };
    }),
    pessoas: r.pessoas.slice(0, PESSOAS_NA_FOLHA).map((p) => ({
      id: p.id,
      nome: p.nome,
      parentesco: p.parentesco,
      memorias: p.memorias,
      retrato: p.integrante.retrato ? enderecoDoRetrato(p.integrante.retrato) : null,
      familia: corDe(p.id),
      falecido: p.integrante.falecido,
    })),
    capitulos: r.capitulos.slice(0, NOMES_NA_FOLHA),
    temas: r.temas.slice(0, NOMES_NA_FOLHA),
  };
}
