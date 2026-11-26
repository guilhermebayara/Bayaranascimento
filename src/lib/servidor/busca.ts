// A busca do site (docs/regras/explorar.md, "A busca"): o que ela acha, só com o que a pessoa vê. A regra de
// achar fica em src/lib/busca.ts; o índice dos textos, na migração 116 (busca_textos e o FTS5 busca_indice).
//
// O índice só acha candidatos. Quem vê o quê é decidido aqui, pelo código, sobre eles, com as regras de
// sempre (src/lib/servidor/permissoes.ts):
// - memória: só a publicada que a pessoa vê (podeVerMemoria) e que não está na lixeira;
// - pessoa: só quem a pessoa vê (listarIntegrantesQueVe), sem o ex que ela deixou discreto ou fora;
// - relato: só o publicado que ela lê na página da memória (veORelato), o que tira o relato que espera de quem
//   ainda não pode lê-lo e o de quem só existe num laço privado de outra pessoa;
// - áudio: só a transcrição que não foi removida, de um relato desses;
// - legenda: só a da foto que não foi removida, que está na memória e, quando veio com um relato, desse relato.
// O que fica de fora não acha nada, não vira trecho, sugestão nem contagem, e o vazio responde igual ao que
// não existe. Este arquivo não escreve SQL de quem vê o quê: as consultas só leem linhas pelo id ou pelo
// índice, e a decisão é das funções exportadas por permissoes.ts (a sessão AC3 junta essas regras).
import { memoriaDoCapitulo, type Capitulo } from '../capitulos';
import { acha, buscar, normalizar, palavras, termos, consultaDoIndice, type Achado, type DocumentoDaBusca, type Motivo, type PessoaAchada, type TextoDaBusca } from '../busca';
import { tipoDaMemoria, type Tipo } from '../tipos';
import { fontesDaFoto, lerCopias, type Fontes } from '../copias-das-fotos';
import { coresDasPessoas } from '../familias';
import { enderecoDoRetrato } from '../retratos';
import { banco } from './ambiente';
import { parentescosDeQuemOlha } from './parentesco-de-quem-olha';
import { podeVerMemoria, veORelato, type Usuario } from './permissoes';
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

const nucleosDoRelato = (valor: unknown): string[] | null => {
  if (typeof valor !== 'string' || !valor) return null;
  try {
    const lista = JSON.parse(valor);
    return Array.isArray(lista) && lista.length ? (lista as string[]) : null;
  } catch {
    return null;
  }
};

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

/** A memória que a busca pode mostrar: publicada, fora da lixeira e que a pessoa vê (podeVerMemoria). */
const vistaNaBusca = (usuario: Usuario, m: MemoriaDaBusca) => !m.excluida && m.situacao === 'publicada' && podeVerMemoria(usuario, m);

/**
 * Lê as memórias pelo id, com as ligações que a busca usa. Só lê: quem decide se a pessoa vê é vistaNaBusca.
 */
async function lerMemorias(ids: string[]): Promise<Map<string, MemoriaDaBusca>> {
  if (ids.length === 0) return new Map();
  // Uma consulta só, com as ligações de cada memória em subconsultas pelo índice: a lista de ids é lida uma vez,
  // e não uma vez por tabela (com o acervo cheio, 1.600 linhas em vez de 2.500 para 115 memórias)
  const lista = (tabela: string, coluna: string) => `(SELECT json_group_array(${coluna}) FROM ${tabela} x WHERE x.memoria_id = m.id) AS ${tabela}`;
  const { results } = await db()
    .prepare(
      `SELECT m.id, m.titulo, m.ano, m.mes, m.dia, m.aproximada, m.lugar, m.tipo, m.tipo_outro, m.situacao, m.visibilidade, m.criada_por, m.excluida_em,
        ${lista('memoria_nucleos', 'nucleo_id')}, ${lista('memoria_integrantes', 'integrante_id')}, ${lista('capitulo_memorias', 'capitulo_id')}, ${lista('tema_memorias', 'tema_id')}
       FROM memorias m WHERE m.id ${dentro}`,
    )
    .bind(JSON.stringify(ids))
    .all<Record<string, unknown>>();
  const ler = (valor: unknown) => (typeof valor === 'string' ? (JSON.parse(valor) as string[]) : []);
  return new Map(
    (results as Record<string, unknown>[]).map((r) => {
      const m = daLinha(r);
      return [m.id, { ...m, nucleos: ler(r.memoria_nucleos), integrantes: ler(r.memoria_integrantes), capitulos: ler(r.capitulo_memorias), temas: ler(r.tema_memorias) }];
    }),
  );
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
  ref: number | null;
  id: number;
}

/** Os acertos do índice para cada termo: as linhas de busca_textos que o FTS5 acha. */
async function acertosDoIndice(procurados: string[]): Promise<Acerto[][]> {
  const respostas = await db().batch<{ id: number; memoria_id: string; campo: Acerto['campo']; ref: number | null }>(
    procurados.map((t) =>
      db()
        .prepare(`SELECT t.id, t.memoria_id, t.campo, t.ref FROM busca_indice JOIN busca_textos t ON t.id = busca_indice.rowid WHERE busca_indice MATCH ?`)
        .bind(consultaDoIndice(t)),
    ),
  );
  type Linha = { id: number; memoria_id: string; campo: Acerto['campo']; ref: number | null };
  return (respostas as { results: Linha[] }[]).map((r) => r.results.map((l: Linha) => ({ memoria: l.memoria_id, campo: l.campo, ref: l.ref, id: l.id })));
}

/**
 * Os textos achados que a pessoa vê, por memória: o relato que ela lê na página da memória (veORelato), a
 * transcrição de um áudio dele que não foi removido e a legenda de uma foto que ela vê.
 */
async function textosQueVe(usuario: Usuario, acertos: Acerto[], nomeDe: (id: string) => string): Promise<Map<string, TextoDaBusca[]>> {
  const deTexto = acertos.filter((a) => a.campo === 'relato' || a.campo === 'audio' || a.campo === 'legenda');
  const porTexto = new Map<string, TextoDaBusca[]>();
  if (deTexto.length === 0) return porTexto;
  const ids = (campo: Acerto['campo']) => JSON.stringify([...new Set(deTexto.filter((a) => a.campo === campo).map((a) => a.ref))]);
  const [linhas, audios, fotos] = await db().batch<Record<string, unknown>>([
    db().prepare(`SELECT id, memoria_id, campo, ref, texto FROM busca_textos WHERE id ${dentro}`).bind(JSON.stringify([...new Set(deTexto.map((a) => a.id))])),
    db().prepare(`SELECT id, relato_id, removido_em FROM audios WHERE id ${dentro}`).bind(ids('audio')),
    db().prepare(`SELECT id, memoria_id, relato_id, removida_em FROM fotos WHERE id ${dentro}`).bind(ids('legenda')),
  ]);
  type Linhas = { results: Record<string, unknown>[] };
  const audioPorId = new Map((audios as Linhas).results.map((a: Record<string, unknown>) => [a.id as number, a]));
  const fotoPorId = new Map((fotos as Linhas).results.map((f: Record<string, unknown>) => [f.id as number, f]));
  const relatoIds = new Set<number>(deTexto.filter((a) => a.campo === 'relato').map((a) => a.ref as number));
  for (const a of (audios as Linhas).results) if (a.relato_id != null) relatoIds.add(a.relato_id as number);
  for (const f of (fotos as Linhas).results) if (f.relato_id != null) relatoIds.add(f.relato_id as number);
  const [relatos, naoVe] = await Promise.all([
    relatoIds.size
      ? db()
          .prepare(`SELECT id, memoria_id, por, registrado_por, so_para_nucleos, situacao FROM relatos WHERE id ${dentro}`)
          .bind(JSON.stringify([...relatoIds]))
          .all<Record<string, unknown>>()
      : Promise.resolve({ results: [] as Record<string, unknown>[] }),
    pessoasQueONaoVe(usuario),
  ]);
  const relatoPorId = new Map((relatos as Linhas).results.map((r: Record<string, unknown>) => [r.id as number, r]));
  /** O relato que a pessoa lê na página da memória: publicado e pela regra de veORelato */
  const relatoQueLe = (id: unknown, memoria: string) => {
    const r = relatoPorId.get(id as number);
    if (!r || r.situacao !== 'publicada' || r.memoria_id !== memoria) return undefined;
    return veORelato({ por: r.por as string, registradoPor: r.registrado_por as string, soParaNucleos: nucleosDoRelato(r.so_para_nucleos) }, usuario, naoVe) ? r : undefined;
  };
  for (const l of (linhas as Linhas).results) {
    const memoria = l.memoria_id as string;
    let texto: TextoDaBusca | undefined;
    if (l.campo === 'relato') {
      const r = relatoQueLe(l.ref, memoria);
      if (r) texto = { campo: 'relato', por: nomeDe(r.por as string), texto: l.texto as string };
    } else if (l.campo === 'audio') {
      const a = audioPorId.get(l.ref as number);
      const r = a && a.removido_em == null ? relatoQueLe(a.relato_id, memoria) : undefined;
      if (r) texto = { campo: 'audio', por: nomeDe(r.por as string), texto: l.texto as string };
    } else {
      const f = fotoPorId.get(l.ref as number);
      const daMemoria = f && f.removida_em == null && f.memoria_id === memoria;
      if (daMemoria && (f.relato_id == null || relatoQueLe(f.relato_id, memoria))) texto = { campo: 'legenda', por: '', texto: l.texto as string };
    }
    if (texto) porTexto.set(memoria, [...(porTexto.get(memoria) ?? []), texto]);
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
  const [integrantes, exes, capitulos, temas, excluidas, porTermo] = await Promise.all([
    listarIntegrantesQueVe(usuario),
    comoOsExesAparecem(usuario),
    listarCapitulos(usuario),
    // Com as memórias da página, os temas que ela vê (a página já leu); sem elas, todos, e o grupo "Capítulos e
    // temas" mostra só os que têm uma memória que a pessoa vê ou estão num capítulo que ela vê
    vistas ? listarTemasVisiveis(usuario) : listarTemas(),
    nomesDasPessoasExcluidas(),
    acertosDoIndice(procurados),
  ]);
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
      ...(todasAsPessoas.length ? [{ chave: 'pessoas', sql: `SELECT memoria_id, integrante_id FROM memoria_integrantes WHERE integrante_id ${dentro}`, valores: [JSON.stringify(todasAsPessoas)] }] : []),
      ...(reunidosAchados.length ? [{ chave: 'capitulos', sql: `SELECT memoria_id, capitulo_id FROM capitulo_memorias WHERE capitulo_id ${dentro}`, valores: [JSON.stringify(reunidosAchados)] }] : []),
      ...(temasAchados.length ? [{ chave: 'temas', sql: `SELECT memoria_id, tema_id FROM tema_memorias WHERE tema_id ${dentro}`, valores: [JSON.stringify(temasAchados)] }] : []),
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
    memorias = await lerMemorias([...new Set([...deTodas, ...[...dasPessoasAchadas.values()].flatMap((m) => [...m])])]);
    for (const [id, m] of memorias) if (!vistaNaBusca(usuario, m)) memorias.delete(id);
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

  // As memórias que podem responder a todas as palavras, entre as que a pessoa vê
  const candidatas = [...memorias.keys()].filter((id) => candidatasPorTermo.every((ids) => ids.has(id)));
  const textos = await textosQueVe(
    usuario,
    porTermo.flat().filter((a) => candidatas.includes(a.memoria)),
    nomeDe,
  );
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
      .filter((x) => x.situacao === 'publicada' && veORelato({ por: x.por as string, registradoPor: x.registrado_por as string, soParaNucleos: nucleosDoRelato(x.so_para_nucleos) }, usuario, naoVe))
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
