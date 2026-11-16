// Leitura e gravação no banco. Toda leitura de memória recebe o usuário e já
// aplica a regra de visibilidade: nenhuma página consulta o banco por fora.
import { banco } from './ambiente';
import type { Casal, DataDaAdocao, Fase, Filiacao, LacoDoCoracao, Papel, Qualidade, TipoDeFase, Tratamento } from '../parentesco';
import { podeVerCasal, podeVerLacoDoCoracao } from '../parentesco';
import { podeVerCapitulo, type Capitulo, type Tema } from '../capitulos';
import { criarSlug, slugUnico } from './conteudo';
import type { Tipo } from '../tipos';
import { pessoasQueNaoVe, podeVerRetrato, type AcessoDaMemoria, type Usuario } from './permissoes';

export interface Integrante {
  id: string;
  nome: string;
  apelido: string | null;
  tipo: 'pessoa' | 'bicho';
  especie: string | null;
  tratamento: Tratamento;
  nascimentoAno: number | null;
  nascimentoMes: number | null;
  nascimentoDia: number | null;
  falecimentoAno: number | null;
  falecimentoMes: number | null;
  falecimentoDia: number | null;
  sobre: string | null;
  /** Chave da foto de retrato no bucket, debaixo de "retratos/". Vazio: as iniciais sobre a cor da família. */
  retrato: string | null;
  admin: boolean;
  criadoPor: string | null;
  /** Já faleceu, mesmo sem data conhecida */
  falecido: boolean;
  /** Núcleos de que é membro: quem acessa o site. Decide o que a pessoa vê. */
  nucleos: string[];
  /** Núcleos de que é parente: a família dela no acervo, sem acesso ao que é restrito. */
  parenteDe: string[];
}

/** Todas as famílias de uma pessoa, como membro ou parente. Na tela as duas aparecem iguais. */
export const familiasDe = (i: Pick<Integrante, 'nucleos' | 'parenteDe'>): string[] => [...i.nucleos, ...i.parenteDe];

export interface Nucleo {
  id: string;
  nome: string;
  /** As famílias de que o núcleo é feito, para a assinatura do nome (src/lib/visual.ts, "assinaturaDaTela") */
  sobrenomes: string[];
}

export interface Foto {
  id: number;
  chave: string;
  legenda: string | null;
  principal: boolean;
  enviadaPor: string;
}

export interface Memoria extends AcessoDaMemoria {
  id: string;
  titulo: string;
  ano: number;
  mes: number | null;
  dia: number | null;
  aproximada: boolean;
  tipo: string;
  /** texto livre de quem escolheu "Outro" */
  tipoOutro: string | null;
  lugar: string | null;
  exemplo: boolean;
  fotos: Foto[];
  /** capítulos reunidos em que foi colocada (os de época são calculados pela data) */
  capitulos: string[];
  /** ids de temas */
  temas: string[];
  /** quantidade de relatos publicados */
  relatos: number;
}

export interface Relato {
  id: number;
  memoriaId: string;
  por: string;
  registradoPor: string;
  texto: string;
  situacao: 'rascunho' | 'publicada';
}

const db = () => banco();

/**
 * Regra de visibilidade em SQL. ?1 é sempre o id do usuário.
 * Precisa dizer o mesmo que podeVerMemoria, em permissoes.ts.
 */
const FILTRO_SEM_LIXEIRA = `(
  (m.situacao = 'rascunho' AND m.criada_por = ?1)
  OR (m.situacao = 'publicada' AND (
    m.visibilidade = 'todos'
    OR EXISTS (
      SELECT 1 FROM memoria_nucleos mn
      JOIN nucleo_membros nm ON nm.nucleo_id = mn.nucleo_id
      WHERE mn.memoria_id = m.id AND nm.integrante_id = ?1 AND nm.papel = 'membro'
    )
  ))
)`;

/** O que aparece no site: o que a pessoa pode ver e não está na lixeira. */
const FILTRO_VISIVEL = `(m.excluida_em IS NULL AND ${FILTRO_SEM_LIXEIRA})`;

// --- Integrantes e núcleos ---

export async function listarIntegrantes(): Promise<Integrante[]> {
  const [integrantes, membros] = await db().batch<Record<string, unknown>>([
    db().prepare('SELECT * FROM integrantes ORDER BY ordem, nome'),
    db().prepare('SELECT nucleo_id, integrante_id, papel FROM nucleo_membros'),
  ]);
  const linhas = membros.results as Record<string, unknown>[];
  const daPessoa = (id: string, papel: 'membro' | 'parente') =>
    linhas.filter((m) => m.integrante_id === id && (m.papel ?? 'membro') === papel).map((m) => m.nucleo_id as string);
  return integrantes.results.map((i) => ({
    id: i.id as string,
    nome: i.nome as string,
    apelido: i.apelido as string | null,
    tipo: i.tipo as 'pessoa' | 'bicho',
    especie: i.especie as string | null,
    tratamento: (i.tratamento as Tratamento) ?? null,
    nascimentoAno: i.nascimento_ano as number | null,
    nascimentoMes: (i.nascimento_mes as number | null) ?? null,
    nascimentoDia: (i.nascimento_dia as number | null) ?? null,
    falecimentoAno: i.falecimento_ano as number | null,
    falecimentoMes: (i.falecimento_mes as number | null) ?? null,
    falecimentoDia: (i.falecimento_dia as number | null) ?? null,
    sobre: i.sobre as string | null,
    retrato: (i.retrato as string | null) ?? null,
    admin: Boolean(i.admin),
    criadoPor: (i.criado_por as string | null) ?? null,
    falecido: Boolean(i.falecido) || i.falecimento_ano != null,
    nucleos: daPessoa(i.id as string, 'membro'),
    parenteDe: daPessoa(i.id as string, 'parente'),
  }));
}

export async function listarNucleos(): Promise<Nucleo[]> {
  const { results } = await db().prepare('SELECT id, nome, sobrenomes FROM nucleos ORDER BY ordem, nome').all<{ id: string; nome: string; sobrenomes: string | null }>();
  return results.map((n: { id: string; nome: string; sobrenomes: string | null }) => ({ id: n.id, nome: n.nome, sobrenomes: lerSobrenomes(n.sobrenomes) }));
}

/** Os sobrenomes de um núcleo, como estão no banco: uma lista em JSON. Qualquer outra coisa conta como lista vazia. */
export function lerSobrenomes(valor: string | null): string[] {
  if (!valor) return [];
  try {
    const lista: unknown = JSON.parse(valor);
    return Array.isArray(lista) ? lista.filter((s): s is string => typeof s === 'string' && s.trim() !== '').map((s) => s.trim()) : [];
  } catch {
    return [];
  }
}

/** Troca os sobrenomes de um núcleo. Só os administradores chegam aqui (src/pages/api/nucleos.ts). */
export async function atualizarSobrenomesDoNucleo(id: string, sobrenomes: string[]): Promise<void> {
  await db().prepare('UPDATE nucleos SET sobrenomes = ? WHERE id = ?').bind(JSON.stringify(sobrenomes), id).run();
}

/** Cadastro rápido, pelo nome digitado num laço ou numa memória. "Como se referir" vem junto, se a pessoa disse. */
export async function criarIntegrante(id: string, nome: string, criadoPor: string, tratamento: Tratamento = null): Promise<void> {
  await db().prepare(`INSERT INTO integrantes (id, nome, criado_por, tratamento) VALUES (?, ?, ?, ?)`).bind(id, nome, criadoPor, tratamento).run();
}

export interface DadosDoIntegrante {
  nome: string;
  apelido?: string;
  tipo: 'pessoa' | 'bicho';
  especie?: string;
  tratamento: Tratamento;
  nascimentoAno?: number;
  nascimentoMes?: number;
  nascimentoDia?: number;
  falecimentoAno?: number;
  falecimentoMes?: number;
  falecimentoDia?: number;
  falecido?: boolean;
  sobre?: string;
  /** A chave do retrato. undefined: fica o que já está. null: tira o retrato. */
  retrato?: string | null;
}

const valoresDoIntegrante = (d: DadosDoIntegrante) => [
  d.nome,
  d.apelido ?? null,
  d.tipo,
  d.tipo === 'bicho' ? (d.especie ?? null) : null,
  d.tratamento,
  d.nascimentoAno ?? null,
  d.nascimentoMes ?? null,
  d.nascimentoDia ?? null,
  d.falecimentoAno ?? null,
  d.falecimentoMes ?? null,
  d.falecimentoDia ?? null,
  d.falecido || d.falecimentoAno ? 1 : 0,
  d.sobre ?? null,
];

export async function criarIntegranteCompleto(id: string, dados: DadosDoIntegrante, usuario: Usuario): Promise<void> {
  await db()
    .prepare(
      `INSERT INTO integrantes (nome, apelido, tipo, especie, tratamento, nascimento_ano, nascimento_mes, nascimento_dia,
         falecimento_ano, falecimento_mes, falecimento_dia, falecido, sobre, retrato, id, criado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(...valoresDoIntegrante(dados), dados.retrato ?? null, id, usuario.pessoa)
    .run();
}

/**
 * Atualiza o cadastro, guardando a versão anterior no histórico. O retrato entra na versão como os
 * outros campos: a chave anterior fica guardada, e o arquivo continua no bucket.
 */
export async function atualizarIntegrante(anterior: Integrante, dados: DadosDoIntegrante, usuario: Usuario): Promise<void> {
  const retrato = dados.retrato === undefined ? anterior.retrato : dados.retrato;
  await db().batch([
    db().prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('integrante', ?, ?, ?)`).bind(anterior.id, JSON.stringify(anterior), usuario.pessoa),
    db()
      .prepare(
        `UPDATE integrantes SET nome = ?, apelido = ?, tipo = ?, especie = ?, tratamento = ?, nascimento_ano = ?, nascimento_mes = ?,
           nascimento_dia = ?, falecimento_ano = ?, falecimento_mes = ?, falecimento_dia = ?, falecido = ?, sobre = ?, retrato = ? WHERE id = ?`,
      )
      .bind(...valoresDoIntegrante(dados), retrato, anterior.id),
  ]);
}

/**
 * As famílias de que a pessoa é parente. Nunca mexe em quem é membro (acesso ao site é com os admins):
 * um núcleo de que a pessoa já é membro fica de fora da lista de parente.
 */
export async function definirParentes(id: string, nucleos: string[]): Promise<void> {
  await db().batch([
    db().prepare(`DELETE FROM nucleo_membros WHERE integrante_id = ? AND papel = 'parente'`).bind(id),
    ...[...new Set(nucleos)].map((n) =>
      db().prepare(`INSERT OR IGNORE INTO nucleo_membros (nucleo_id, integrante_id, papel) VALUES (?, ?, 'parente')`).bind(n, id),
    ),
  ]);
}

// --- Laços resumidos: o parente de alguém de fora das famílias, sem o caminho inteiro ---

export interface LacoResumido {
  id: number;
  /** b é <papel> de a */
  a: string;
  b: string;
  papel: Papel;
  criadoPor: string | null;
}

export async function listarLacosResumidos(): Promise<LacoResumido[]> {
  const { results } = await db().prepare('SELECT id, a_id, b_id, papel, criado_por FROM lacos_resumidos ORDER BY id').all<Record<string, unknown>>();
  return results.map((r) => ({ id: r.id as number, a: r.a_id as string, b: r.b_id as string, papel: r.papel as Papel, criadoPor: (r.criado_por as string | null) ?? null }));
}

export async function salvarLacoResumido(a: string, b: string, papel: Papel, usuario: Usuario): Promise<void> {
  // Um par só tem um laço resumido, num sentido só: o novo substitui o anterior
  await db().batch([
    db().prepare('DELETE FROM lacos_resumidos WHERE (a_id = ? AND b_id = ?) OR (a_id = ? AND b_id = ?)').bind(a, b, b, a),
    db().prepare('INSERT INTO lacos_resumidos (a_id, b_id, papel, criado_por) VALUES (?, ?, ?, ?)').bind(a, b, papel, usuario.pessoa),
  ]);
}

export async function removerLacoResumido(id: number, usuario: Usuario): Promise<void> {
  await db().batch([
    db()
      .prepare(
        `INSERT INTO versoes (tipo, item_id, dados, autor)
         SELECT 'laco-resumido', id, json_object('a', a_id, 'b', b_id, 'papel', papel), ? FROM lacos_resumidos WHERE id = ?`,
      )
      .bind(usuario.pessoa, id),
    db().prepare('DELETE FROM lacos_resumidos WHERE id = ?').bind(id),
  ]);
}

// --- Laços de árvore ---

export async function listarFiliacoes(): Promise<Filiacao[]> {
  const { results } = await db().prepare('SELECT filho_id, responsavel_id, qualidade, adocao_ano, adocao_mes, adocao_dia FROM filiacoes').all<Record<string, unknown>>();
  return results.map((r) => ({
    filho: r.filho_id as string,
    responsavel: r.responsavel_id as string,
    qualidade: r.qualidade as Qualidade,
    adocao: r.adocao_ano ? { ano: r.adocao_ano as number, mes: (r.adocao_mes as number | null) ?? null, dia: (r.adocao_dia as number | null) ?? null } : null,
  }));
}

/** Salva ou atualiza a filiação. A data da adoção só fica num laço adotivo; nos outros, é apagada. */
export async function salvarFiliacao(filho: string, responsavel: string, qualidade: Qualidade, usuario: Usuario, adocao: DataDaAdocao | null = null): Promise<void> {
  const data = qualidade === 'adotiva' ? adocao : null;
  await db()
    .prepare(
      `INSERT INTO filiacoes (filho_id, responsavel_id, qualidade, criado_por, adocao_ano, adocao_mes, adocao_dia) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (filho_id, responsavel_id) DO UPDATE SET qualidade = excluded.qualidade,
         adocao_ano = excluded.adocao_ano, adocao_mes = excluded.adocao_mes, adocao_dia = excluded.adocao_dia`,
    )
    .bind(filho, responsavel, qualidade, usuario.pessoa, data?.ano ?? null, data?.mes ?? null, data?.dia ?? null)
    .run();
}

export async function removerFiliacao(filho: string, responsavel: string, usuario: Usuario): Promise<void> {
  await db().batch([
    db()
      .prepare(
        `INSERT INTO versoes (tipo, item_id, dados, autor)
         SELECT 'filiacao', filho_id || '>' || responsavel_id, json_object('filho', filho_id, 'responsavel', responsavel_id, 'qualidade', qualidade, 'adocao_ano', adocao_ano, 'adocao_mes', adocao_mes, 'adocao_dia', adocao_dia), ?
         FROM filiacoes WHERE filho_id = ? AND responsavel_id = ?`,
      )
      .bind(usuario.pessoa, filho, responsavel),
    db().prepare('DELETE FROM filiacoes WHERE filho_id = ? AND responsavel_id = ?').bind(filho, responsavel),
  ]);
}

/** Todos os casais, sem filtro de visibilidade. Para conferências internas, nunca para mostrar. */
async function lerCasais(): Promise<Casal[]> {
  const [casais, fases] = await db().batch<Record<string, unknown>>([
    db().prepare('SELECT * FROM casais ORDER BY id'),
    db().prepare('SELECT * FROM casal_fases ORDER BY casal_id, ordem, id'),
  ]);
  return casais.results.map((c) => ({
    id: c.id as number,
    a: c.a_id as string,
    b: c.b_id as string,
    visibilidade: c.visibilidade as 'todos' | 'privado',
    criadoPor: (c.criado_por as string | null) ?? null,
    fases: fases.results
      .filter((f) => f.casal_id === c.id)
      .map((f) => ({ tipo: f.tipo as TipoDeFase, inicioAno: (f.inicio_ano as number | null) ?? null, fimAno: (f.fim_ano as number | null) ?? null })),
  }));
}

/** Casais que o usuário pode ver: os abertos a todos e os privados de que ele faz parte ou que cadastrou. */
/**
 * Os casais que a pessoa vê, um por par. Um par pode ter um registro privado (que só os dois e quem
 * cadastrou veem) e um público, cadastrado por quem não via o privado. Quem vê o privado fica com ele.
 */
export async function listarCasais(usuario: Usuario): Promise<Casal[]> {
  const visiveis = (await lerCasais()).filter((c) => podeVerCasal(usuario.pessoa, c));
  const porPar = new Map<string, Casal>();
  for (const c of visiveis) {
    const chave = `${c.a}|${c.b}`;
    const ja = porPar.get(chave);
    if (!ja || (ja.visibilidade === 'todos' && c.visibilidade === 'privado')) porPar.set(chave, c);
  }
  return visiveis.filter((c) => porPar.get(`${c.a}|${c.b}`) === c);
}

/** O casal desse par que a pessoa vê (o privado, se ela vê um), ou nenhum. Um casal privado de outros não conta. */
export async function obterCasalDoPar(x: string, y: string, usuario: Usuario): Promise<Casal | undefined> {
  const [a, b] = x < y ? [x, y] : [y, x];
  return (await listarCasais(usuario)).find((c) => c.a === a && c.b === b);
}

export async function obterCasal(id: number): Promise<Casal | undefined> {
  return (await lerCasais()).find((c) => c.id === id);
}

/** Cria o casal ou troca as fases dele, guardando no histórico o que havia antes. */
export async function salvarCasal(x: string, y: string, fases: Fase[], visibilidade: 'todos' | 'privado', usuario: Usuario): Promise<void> {
  const [a, b] = x < y ? [x, y] : [y, x];
  const anterior = await obterCasalDoPar(a, b, usuario);
  const comandos: D1PreparedStatement[] = [];
  // Quem vê o casal privado e o torna público assume o lugar do registro público que outra pessoa tinha feito
  const publico = (await lerCasais()).find((c) => c.a === a && c.b === b && c.visibilidade === 'todos');
  if (anterior && anterior.visibilidade === 'privado' && visibilidade === 'todos' && publico && publico.id !== anterior.id) {
    comandos.push(
      db().prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('casal', ?, ?, ?)`).bind(String(publico.id), JSON.stringify(publico), usuario.pessoa),
      db().prepare('DELETE FROM casal_fases WHERE casal_id = ?').bind(publico.id),
      db().prepare('DELETE FROM casais WHERE id = ?').bind(publico.id),
    );
  }
  if (anterior) {
    comandos.push(
      db().prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('casal', ?, ?, ?)`).bind(String(anterior.id), JSON.stringify(anterior), usuario.pessoa),
      db().prepare('UPDATE casais SET visibilidade = ? WHERE id = ?').bind(visibilidade, anterior.id),
      db().prepare('DELETE FROM casal_fases WHERE casal_id = ?').bind(anterior.id),
    );
  } else {
    comandos.push(db().prepare('INSERT INTO casais (a_id, b_id, visibilidade, criado_por) VALUES (?, ?, ?, ?)').bind(a, b, visibilidade, usuario.pessoa));
  }
  fases.forEach((fase, ordem) => {
    comandos.push(
      db()
        .prepare(
          `INSERT INTO casal_fases (casal_id, tipo, inicio_ano, fim_ano, ordem)
           VALUES ((SELECT id FROM casais WHERE a_id = ? AND b_id = ? AND visibilidade = ?), ?, ?, ?, ?)`,
        )
        .bind(a, b, visibilidade, fase.tipo, fase.inicioAno, fase.fimAno, ordem),
    );
  });
  await db().batch(comandos);
}

export async function removerCasal(casal: Casal, usuario: Usuario): Promise<void> {
  await db().batch([
    db().prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('casal', ?, ?, ?)`).bind(String(casal.id), JSON.stringify(casal), usuario.pessoa),
    db().prepare('DELETE FROM casal_fases WHERE casal_id = ?').bind(casal.id),
    db().prepare('DELETE FROM casais WHERE id = ?').bind(casal.id),
  ]);
}

// --- Laços do coração ---

/** Laços do coração que o usuário pode ver. A proximidade só acompanha os laços dele. */
export async function listarLacosDoCoracao(usuario: Usuario): Promise<LacoDoCoracao[]> {
  const { results } = await db().prepare('SELECT * FROM lacos_coracao ORDER BY COALESCE(proximidade, 9), nome').all<Record<string, unknown>>();
  return results
    .map((l) => ({
      id: l.id as number,
      dono: l.dono_id as string,
      pessoa: l.pessoa_id as string,
      nome: l.nome as string,
      papel: (l.papel as Papel | null) ?? null,
      proximidade: l.dono_id === usuario.pessoa ? ((l.proximidade as number | null) ?? null) : null,
      privado: Boolean(l.privado),
    }))
    .filter((l) => podeVerLacoDoCoracao(usuario.pessoa, l));
}

/** Pessoas que aparecem em laços privados de outras pessoas (o laço em si fica escondido). */
export async function pessoasEmLacosPrivadosDeOutros(usuario: Usuario): Promise<Set<string>> {
  const { results } = await db()
    .prepare('SELECT DISTINCT pessoa_id FROM lacos_coracao WHERE privado = 1 AND dono_id <> ?')
    .bind(usuario.pessoa)
    .all<{ pessoa_id: string }>();
  return new Set(results.map((r) => r.pessoa_id));
}

/** Quem a pessoa logada não vê (ver pessoasQueNaoVe). Barato quando ninguém tem laço privado. */
export async function pessoasQueONaoVe(usuario: Usuario): Promise<Set<string>> {
  const emPrivados = await pessoasEmLacosPrivadosDeOutros(usuario);
  if (emPrivados.size === 0) return emPrivados;
  const [filiacoes, casais, lacos] = await Promise.all([listarFiliacoes(), listarCasais(usuario), listarLacosDoCoracao(usuario)]);
  const comLaco = new Set([...filiacoes.flatMap((f) => [f.filho, f.responsavel]), ...casais.flatMap((c) => [c.a, c.b]), ...lacos.flatMap((l) => [l.dono, l.pessoa])]);
  return pessoasQueNaoVe(emPrivados, comLaco);
}

/**
 * O retrato desta chave pode ser entregue? Só o retrato atual de alguém que a pessoa logada vê. O
 * retrato trocado ou tirado não é entregue a ninguém: o arquivo fica no bucket, e a chave, nas versões.
 */
export async function podeVerRetratoDaChave(usuario: Usuario, chave: string): Promise<boolean> {
  // Um retrato de exemplo é dividido por várias pessoas: basta a pessoa logada ver uma delas
  const { results: donos } = await db().prepare('SELECT id FROM integrantes WHERE retrato = ?').bind(chave).all<{ id: string }>();
  if (donos.length === 0) return false;
  const naoVe = await pessoasQueONaoVe(usuario);
  return donos.some((dono) => podeVerRetrato(dono.id, naoVe));
}

export async function salvarLacoDoCoracao(
  usuario: Usuario,
  pessoa: string,
  dados: { nome: string; papel: Papel | null; proximidade: number | null; privado: boolean },
): Promise<void> {
  await db()
    .prepare(
      `INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, papel, proximidade, privado) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (dono_id, pessoa_id) DO UPDATE SET nome = excluded.nome, papel = excluded.papel,
         proximidade = excluded.proximidade, privado = excluded.privado`,
    )
    .bind(usuario.pessoa, pessoa, dados.nome, dados.papel, dados.proximidade, dados.privado ? 1 : 0)
    .run();
}

/** Só o dono remove o próprio laço. */
export async function removerLacoDoCoracao(usuario: Usuario, id: number): Promise<boolean> {
  const resultado = await db().prepare('DELETE FROM lacos_coracao WHERE id = ? AND dono_id = ?').bind(id, usuario.pessoa).run();
  return (resultado.meta.changes ?? 0) > 0;
}

// --- Tipos de momento ---

export async function listarTipos(): Promise<Tipo[]> {
  const { results } = await db().prepare('SELECT id, rotulo, cor FROM tipos ORDER BY ordem, rotulo').all<Tipo>();
  return results;
}

export async function criarTipo(id: string, rotulo: string, cor: string, usuario: Usuario): Promise<void> {
  await db()
    .prepare(
      `INSERT INTO tipos (id, rotulo, cor, ordem, criado_por)
       VALUES (?, ?, ?, (SELECT COALESCE(MAX(ordem), 0) + 1 FROM tipos WHERE id <> 'outro'), ?)`,
    )
    .bind(id, rotulo, cor, usuario.pessoa)
    .run();
}

export async function atualizarTipo(id: string, rotulo: string, cor: string): Promise<void> {
  await db().prepare('UPDATE tipos SET rotulo = ?, cor = ? WHERE id = ?').bind(rotulo, cor, id).run();
}

/**
 * O que as pessoas escreveram ao escolher "Outro", com quantas memórias cada texto tem.
 * Conta só memórias que o admin pode ver, para não revelar nada de núcleos alheios.
 */
export async function listarTextosDeOutro(usuario: Usuario): Promise<{ texto: string; memorias: number }[]> {
  const { results } = await db()
    .prepare(
      `SELECT MIN(TRIM(m.tipo_outro)) AS texto, COUNT(*) AS memorias FROM memorias m
       WHERE m.tipo = 'outro' AND TRIM(COALESCE(m.tipo_outro, '')) <> '' AND m.situacao = 'publicada' AND ${FILTRO_VISIVEL}
       GROUP BY LOWER(TRIM(m.tipo_outro)) ORDER BY memorias DESC, texto`,
    )
    .bind(usuario.pessoa)
    .all<{ texto: string; memorias: number }>();
  return results;
}

/** Passa para um tipo oficial todas as memórias marcadas como "Outro" com aquele texto. */
/**
 * Passa para um tipo todas as memórias com esse texto em "Outro". Devolve quantas delas quem promoveu
 * enxerga: contar as outras entregaria que existem memórias que essa pessoa não vê.
 */
export async function promoverTextoDeOutro(texto: string, tipoId: string, usuario: Usuario): Promise<number> {
  const mesmoTexto = `m.tipo = 'outro' AND LOWER(TRIM(m.tipo_outro)) = LOWER(TRIM(?2))`;
  const [visiveis] = await db().batch<{ n: number }>([
    db().prepare(`SELECT COUNT(*) AS n FROM memorias m WHERE ${mesmoTexto} AND ${FILTRO_VISIVEL}`).bind(usuario.pessoa, texto),
    db().prepare(`UPDATE memorias SET tipo = ?1, tipo_outro = NULL WHERE tipo = 'outro' AND LOWER(TRIM(tipo_outro)) = LOWER(TRIM(?2))`).bind(tipoId, texto),
  ]);
  return visiveis.results[0]?.n ?? 0;
}

// --- Memórias ---

interface FiltroDeMemorias {
  integrante?: string;
  nucleo?: string;
  /** só os rascunhos de quem pede */
  rascunhos?: boolean;
  /** memórias colocadas em qualquer um destes capítulos reunidos */
  capitulos?: string[];
  tema?: string;
}

function lerMemoria(linha: Record<string, unknown>): Memoria {
  return {
    id: linha.id as string,
    titulo: linha.titulo as string,
    ano: linha.ano as number,
    mes: linha.mes as number | null,
    dia: linha.dia as number | null,
    aproximada: Boolean(linha.aproximada),
    tipo: linha.tipo as string,
    tipoOutro: (linha.tipo_outro as string | null) ?? null,
    lugar: linha.lugar as string | null,
    visibilidade: linha.visibilidade as 'todos' | 'nucleos',
    situacao: linha.situacao as 'rascunho' | 'publicada',
    exemplo: Boolean(linha.exemplo),
    criadaPor: linha.criada_por as string,
    nucleos: [],
    integrantes: [],
    fotos: [],
    capitulos: [],
    temas: [],
    relatos: 0,
  };
}

async function completar(memorias: Memoria[]): Promise<Memoria[]> {
  if (memorias.length === 0) return memorias;
  const ids = JSON.stringify(memorias.map((m) => m.id));
  const dentro = `IN (SELECT value FROM json_each(?))`;
  const [nucleos, integrantes, fotos, relatos, capitulos, temas] = await db().batch<Record<string, unknown>>([
    db().prepare(`SELECT memoria_id, nucleo_id FROM memoria_nucleos WHERE memoria_id ${dentro}`).bind(ids),
    db().prepare(`SELECT memoria_id, integrante_id FROM memoria_integrantes WHERE memoria_id ${dentro}`).bind(ids),
    db()
      .prepare(`SELECT * FROM fotos WHERE removida_em IS NULL AND memoria_id ${dentro} ORDER BY principal DESC, ordem, id`)
      .bind(ids),
    db()
      .prepare(`SELECT memoria_id, COUNT(*) AS n FROM relatos WHERE situacao = 'publicada' AND memoria_id ${dentro} GROUP BY memoria_id`)
      .bind(ids),
    db()
      .prepare(
        `SELECT cm.memoria_id, cm.capitulo_id FROM capitulo_memorias cm JOIN capitulos c ON c.id = cm.capitulo_id
         WHERE c.excluido_em IS NULL AND cm.memoria_id ${dentro}`,
      )
      .bind(ids),
    db().prepare(`SELECT memoria_id, tema_id FROM tema_memorias WHERE memoria_id ${dentro}`).bind(ids),
  ]);
  const porId = new Map(memorias.map((m) => [m.id, m]));
  for (const n of nucleos.results) porId.get(n.memoria_id as string)?.nucleos.push(n.nucleo_id as string);
  for (const i of integrantes.results) porId.get(i.memoria_id as string)?.integrantes.push(i.integrante_id as string);
  for (const f of fotos.results) {
    porId.get(f.memoria_id as string)?.fotos.push({
      id: f.id as number,
      chave: f.chave as string,
      legenda: f.legenda as string | null,
      principal: Boolean(f.principal),
      enviadaPor: f.enviada_por as string,
    });
  }
  for (const c of capitulos.results) porId.get(c.memoria_id as string)?.capitulos.push(c.capitulo_id as string);
  for (const t of temas.results) porId.get(t.memoria_id as string)?.temas.push(t.tema_id as string);
  for (const r of relatos.results) {
    const memoria = porId.get(r.memoria_id as string);
    if (memoria) memoria.relatos = r.n as number;
  }
  return memorias;
}

/** Memórias que o usuário pode ver, da mais antiga para a mais recente. Rascunhos ficam de fora, salvo pedido. */
export async function listarMemorias(usuario: Usuario, filtro: FiltroDeMemorias = {}): Promise<Memoria[]> {
  const condicoes = [FILTRO_VISIVEL, filtro.rascunhos ? `m.situacao = 'rascunho'` : `m.situacao = 'publicada'`];
  const valores: unknown[] = [usuario.pessoa];
  if (filtro.integrante) {
    valores.push(filtro.integrante);
    condicoes.push(`EXISTS (SELECT 1 FROM memoria_integrantes mi WHERE mi.memoria_id = m.id AND mi.integrante_id = ?${valores.length})`);
  }
  if (filtro.nucleo) {
    valores.push(filtro.nucleo);
    condicoes.push(`EXISTS (SELECT 1 FROM memoria_nucleos mn2 WHERE mn2.memoria_id = m.id AND mn2.nucleo_id = ?${valores.length})`);
  }
  if (filtro.capitulos) {
    valores.push(JSON.stringify(filtro.capitulos));
    condicoes.push(`EXISTS (SELECT 1 FROM capitulo_memorias cm WHERE cm.memoria_id = m.id AND cm.capitulo_id IN (SELECT value FROM json_each(?${valores.length})))`);
  }
  if (filtro.tema) {
    valores.push(filtro.tema);
    condicoes.push(`EXISTS (SELECT 1 FROM tema_memorias tm WHERE tm.memoria_id = m.id AND tm.tema_id = ?${valores.length})`);
  }
  const { results } = await db()
    .prepare(`SELECT m.* FROM memorias m WHERE ${condicoes.join(' AND ')} ORDER BY m.ano, COALESCE(m.mes, 0), COALESCE(m.dia, 0), m.criada_em`)
    .bind(...valores)
    .all<Record<string, unknown>>();
  return completar(results.map(lerMemoria));
}

/** Uma memória, se o usuário puder vê-la. Quem não pode recebe o mesmo que para uma memória inexistente. */
export async function obterMemoria(usuario: Usuario, id: string): Promise<Memoria | undefined> {
  const linha = await db()
    .prepare(`SELECT m.* FROM memorias m WHERE m.id = ?2 AND ${FILTRO_VISIVEL}`)
    .bind(usuario.pessoa, id)
    .first<Record<string, unknown>>();
  if (!linha) return undefined;
  return (await completar([lerMemoria(linha)]))[0];
}

export async function idsDeMemorias(): Promise<Set<string>> {
  const { results } = await db().prepare('SELECT id FROM memorias').all<{ id: string }>();
  return new Set(results.map((r) => r.id));
}

export interface DadosDaMemoria {
  titulo: string;
  ano: number;
  mes?: number;
  dia?: number;
  aproximada: boolean;
  tipo: string;
  tipoOutro?: string;
  lugar?: string;
  visibilidade: 'todos' | 'nucleos';
  situacao: 'rascunho' | 'publicada';
  nucleos: string[];
  integrantes: string[];
  /** capítulos reunidos em que a memória entra. undefined deixa como está. */
  capitulos?: string[];
  /** ids de temas. undefined deixa como está. */
  temas?: string[];
  /** fotos na ordem final: ids já enviados, com legenda e qual é a principal */
  fotos: { id: number; legenda?: string; principal: boolean }[];
}

function comandosDeLigacao(id: string, dados: DadosDaMemoria): D1PreparedStatement[] {
  const comandos = [
    db().prepare('DELETE FROM memoria_nucleos WHERE memoria_id = ?').bind(id),
    db().prepare('DELETE FROM memoria_integrantes WHERE memoria_id = ?').bind(id),
  ];
  for (const n of dados.nucleos) {
    comandos.push(db().prepare('INSERT OR IGNORE INTO memoria_nucleos (memoria_id, nucleo_id) VALUES (?, ?)').bind(id, n));
  }
  for (const i of dados.integrantes) {
    comandos.push(db().prepare('INSERT OR IGNORE INTO memoria_integrantes (memoria_id, integrante_id) VALUES (?, ?)').bind(id, i));
  }
  if (dados.capitulos) {
    comandos.push(db().prepare('DELETE FROM capitulo_memorias WHERE memoria_id = ?').bind(id));
    for (const c of dados.capitulos) comandos.push(db().prepare('INSERT OR IGNORE INTO capitulo_memorias (capitulo_id, memoria_id) VALUES (?, ?)').bind(c, id));
  }
  if (dados.temas) {
    comandos.push(db().prepare('DELETE FROM tema_memorias WHERE memoria_id = ?').bind(id));
    for (const t of dados.temas) comandos.push(db().prepare('INSERT OR IGNORE INTO tema_memorias (tema_id, memoria_id) VALUES (?, ?)').bind(t, id));
  }
  dados.fotos.forEach((foto, ordem) => {
    comandos.push(
      db()
        .prepare('UPDATE fotos SET memoria_id = ?, legenda = ?, principal = ?, ordem = ? WHERE id = ?')
        .bind(id, foto.legenda ?? null, foto.principal ? 1 : 0, ordem, foto.id),
    );
  });
  return comandos;
}

export async function criarMemoria(id: string, dados: DadosDaMemoria, usuario: Usuario): Promise<void> {
  await db().batch([
    db()
      .prepare(
        `INSERT INTO memorias (id, titulo, ano, mes, dia, aproximada, tipo, tipo_outro, lugar, visibilidade, situacao, criada_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, dados.titulo, dados.ano, dados.mes ?? null, dados.dia ?? null, dados.aproximada ? 1 : 0, dados.tipo, dados.tipoOutro ?? null, dados.lugar ?? null, dados.visibilidade, dados.situacao, usuario.pessoa),
    ...comandosDeLigacao(id, dados),
  ]);
}

/** Atualiza a ficha, guardando a versão anterior no histórico. Fotos que saíram da lista vão para a lixeira. */
export async function atualizarMemoria(anterior: Memoria, dados: DadosDaMemoria, usuario: Usuario, fotosRemovidas: number[]): Promise<void> {
  await db().batch([
    db()
      .prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('memoria', ?, ?, ?)`)
      .bind(anterior.id, JSON.stringify(anterior), usuario.pessoa),
    db()
      .prepare(
        `UPDATE memorias SET titulo = ?, ano = ?, mes = ?, dia = ?, aproximada = ?, tipo = ?, tipo_outro = ?, lugar = ?,
           visibilidade = ?, situacao = ?, atualizada_em = datetime('now') WHERE id = ?`,
      )
      .bind(dados.titulo, dados.ano, dados.mes ?? null, dados.dia ?? null, dados.aproximada ? 1 : 0, dados.tipo, dados.tipoOutro ?? null, dados.lugar ?? null, dados.visibilidade, dados.situacao, anterior.id),
    ...fotosRemovidas.map((id) => db().prepare(`UPDATE fotos SET removida_em = datetime('now') WHERE id = ?`).bind(id)),
    ...comandosDeLigacao(anterior.id, dados),
  ]);
}

// --- Capítulos e temas ---

export async function listarTemas(): Promise<Tema[]> {
  const { results } = await db().prepare('SELECT id, nome FROM temas ORDER BY nome').all<Tema>();
  return results;
}

/**
 * Temas que a pessoa pode ver: os de pelo menos uma memória ou um capítulo que ela vê. O nome de um
 * tema usado só numa memória restrita ou num rascunho de outra pessoa entregaria que ela existe.
 */
export async function listarTemasVisiveis(usuario: Usuario): Promise<Tema[]> {
  const [{ results: dasMemorias }, capitulos, todos] = await Promise.all([
    db()
      .prepare(`SELECT DISTINCT tm.tema_id AS id FROM tema_memorias tm JOIN memorias m ON m.id = tm.memoria_id WHERE ${FILTRO_VISIVEL}`)
      .bind(usuario.pessoa)
      .all<{ id: string }>(),
    listarCapitulos(usuario),
    listarTemas(),
  ]);
  const visiveis = new Set<string>([...dasMemorias.map((t: { id: string }) => t.id), ...capitulos.flatMap((c: Capitulo) => c.temas)]);
  return todos.filter((t: Tema) => visiveis.has(t.id));
}

/** Devolve os ids dos temas com esses nomes, criando os que ainda não existem. */
export async function garantirTemas(nomes: string[], usuario: Usuario): Promise<string[]> {
  if (nomes.length === 0) return [];
  const existentes = await listarTemas();
  const ids = new Set(existentes.map((t) => t.id));
  const resultado: string[] = [];
  for (const nome of nomes) {
    const igual = existentes.find((t) => t.nome.toLowerCase() === nome.toLowerCase() || t.id === criarSlug(nome));
    if (igual) {
      resultado.push(igual.id);
      continue;
    }
    const id = slugUnico(criarSlug(nome) || 'tema', ids);
    await db().prepare('INSERT INTO temas (id, nome, criado_por) VALUES (?, ?, ?)').bind(id, nome, usuario.pessoa).run();
    ids.add(id);
    existentes.push({ id, nome });
    resultado.push(id);
  }
  return [...new Set(resultado)];
}

function lerCapitulo(c: Record<string, unknown>): Capitulo {
  const data = (ano: unknown, mes: unknown) => (ano ? { ano: ano as number, mes: (mes as number | null) ?? null } : null);
  return {
    id: c.id as string,
    titulo: c.titulo as string,
    abertura: (c.abertura as string | null) ?? null,
    modo: c.modo as 'reunido' | 'epoca',
    inicio: data(c.inicio_ano, c.inicio_mes),
    fim: data(c.fim_ano, c.fim_mes),
    dentroDe: (c.pai_id as string | null) ?? null,
    visibilidade: c.visibilidade as 'todos' | 'nucleos',
    nucleos: [],
    criadoPor: c.criado_por as string,
    temas: [],
  };
}

async function lerCapitulos(condicao: string): Promise<Capitulo[]> {
  const [capitulos, nucleos, temas] = await db().batch<Record<string, unknown>>([
    db().prepare(`SELECT * FROM capitulos WHERE ${condicao} ORDER BY COALESCE(inicio_ano, 9999), titulo`),
    db().prepare('SELECT capitulo_id, nucleo_id FROM capitulo_nucleos'),
    db().prepare('SELECT capitulo_id, tema_id FROM tema_capitulos'),
  ]);
  const lista = capitulos.results.map(lerCapitulo);
  const porId = new Map(lista.map((c) => [c.id, c]));
  for (const n of nucleos.results) porId.get(n.capitulo_id as string)?.nucleos.push(n.nucleo_id as string);
  for (const t of temas.results) porId.get(t.capitulo_id as string)?.temas.push(t.tema_id as string);
  return lista;
}

/** Capítulos que o usuário pode ver. */
export async function listarCapitulos(usuario: Usuario): Promise<Capitulo[]> {
  return (await lerCapitulos('excluido_em IS NULL')).filter((c) => podeVerCapitulo(usuario, c));
}

export async function idsDeCapitulos(): Promise<Set<string>> {
  const { results } = await db().prepare('SELECT id FROM capitulos').all<{ id: string }>();
  return new Set(results.map((r) => r.id));
}

/** Quem criou as memórias colocadas no capítulo: essas pessoas também podem editá-lo. */
export async function autoresDasMemoriasDoCapitulo(capituloId: string): Promise<string[]> {
  const { results } = await db()
    .prepare(
      `SELECT DISTINCT m.criada_por FROM capitulo_memorias cm JOIN memorias m ON m.id = cm.memoria_id
       WHERE cm.capitulo_id = ? AND m.excluida_em IS NULL AND m.situacao = 'publicada'`,
    )
    .bind(capituloId)
    .all<{ criada_por: string }>();
  return results.map((r) => r.criada_por);
}

export interface DadosDoCapitulo {
  titulo: string;
  abertura?: string;
  modo: 'reunido' | 'epoca';
  inicio?: { ano: number; mes?: number };
  fim?: { ano: number; mes?: number };
  dentroDe?: string;
  visibilidade: 'todos' | 'nucleos';
  nucleos: string[];
  temas: string[];
}

export async function salvarCapitulo(id: string, dados: DadosDoCapitulo, usuario: Usuario, novo: boolean): Promise<void> {
  const valores = [
    dados.titulo,
    dados.abertura ?? null,
    dados.modo,
    dados.modo === 'epoca' ? (dados.inicio?.ano ?? null) : null,
    dados.modo === 'epoca' ? (dados.inicio?.mes ?? null) : null,
    dados.modo === 'epoca' ? (dados.fim?.ano ?? null) : null,
    dados.modo === 'epoca' ? (dados.fim?.mes ?? null) : null,
    dados.dentroDe ?? null,
    dados.visibilidade,
  ];
  const comandos: D1PreparedStatement[] = [
    novo
      ? db()
          .prepare(
            `INSERT INTO capitulos (titulo, abertura, modo, inicio_ano, inicio_mes, fim_ano, fim_mes, pai_id, visibilidade, id, criado_por)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(...valores, id, usuario.pessoa)
      : db()
          .prepare(
            `UPDATE capitulos SET titulo = ?, abertura = ?, modo = ?, inicio_ano = ?, inicio_mes = ?, fim_ano = ?, fim_mes = ?,
               pai_id = ?, visibilidade = ?, atualizado_em = datetime('now') WHERE id = ?`,
          )
          .bind(...valores, id),
    db().prepare('DELETE FROM capitulo_nucleos WHERE capitulo_id = ?').bind(id),
    db().prepare('DELETE FROM tema_capitulos WHERE capitulo_id = ?').bind(id),
    ...dados.nucleos.map((n) => db().prepare('INSERT OR IGNORE INTO capitulo_nucleos (capitulo_id, nucleo_id) VALUES (?, ?)').bind(id, n)),
    ...dados.temas.map((t) => db().prepare('INSERT OR IGNORE INTO tema_capitulos (tema_id, capitulo_id) VALUES (?, ?)').bind(t, id)),
  ];
  await db().batch(comandos);
}

export async function mudarMemoriasDoCapitulo(capituloId: string, colocar: string[], tirar: string[]): Promise<void> {
  const comandos = [
    ...colocar.map((m) => db().prepare('INSERT OR IGNORE INTO capitulo_memorias (capitulo_id, memoria_id) VALUES (?, ?)').bind(capituloId, m)),
    ...tirar.map((m) => db().prepare('DELETE FROM capitulo_memorias WHERE capitulo_id = ? AND memoria_id = ?').bind(capituloId, m)),
  ];
  if (comandos.length) await db().batch(comandos);
}

/** Manda o capítulo para a lixeira. As memórias continuam onde estão; capítulos de dentro ficam soltos. */
export async function excluirCapitulo(id: string, usuario: Usuario): Promise<void> {
  await db().batch([
    db().prepare('UPDATE capitulos SET pai_id = NULL WHERE pai_id = ?').bind(id),
    db().prepare(`UPDATE capitulos SET excluido_em = datetime('now'), excluido_por = ? WHERE id = ?`).bind(usuario.pessoa, id),
  ]);
}

export async function listarCapitulosExcluidos(usuario: Usuario): Promise<(Capitulo & { excluidoEm: string })[]> {
  const { results } = await db().prepare('SELECT id, excluido_em FROM capitulos WHERE excluido_em IS NOT NULL').all<{ id: string; excluido_em: string }>();
  const quando = new Map(results.map((r) => [r.id, r.excluido_em]));
  return (await lerCapitulos('excluido_em IS NOT NULL')).filter((c) => podeVerCapitulo(usuario, c)).map((c) => ({ ...c, excluidoEm: quando.get(c.id) ?? '' }));
}

export async function restaurarCapitulo(id: string): Promise<void> {
  await db().prepare('UPDATE capitulos SET excluido_em = NULL, excluido_por = NULL WHERE id = ?').bind(id).run();
}

// --- Lixeira e histórico ---

export interface MemoriaExcluida extends Memoria {
  excluidaEm: string;
  excluidaPor: string | null;
}

export async function excluirMemoria(id: string, usuario: Usuario): Promise<void> {
  await db().prepare(`UPDATE memorias SET excluida_em = datetime('now'), excluida_por = ? WHERE id = ?`).bind(usuario.pessoa, id).run();
}

/** A lixeira de quem pede: só o que a pessoa veria se a memória não tivesse sido excluída. */
export async function listarExcluidas(usuario: Usuario): Promise<MemoriaExcluida[]> {
  const { results } = await db()
    .prepare(`SELECT m.* FROM memorias m WHERE m.excluida_em IS NOT NULL AND ${FILTRO_SEM_LIXEIRA} ORDER BY m.excluida_em DESC`)
    .bind(usuario.pessoa)
    .all<Record<string, unknown>>();
  const completas = await completar(results.map(lerMemoria));
  return completas.map((m, i) => ({ ...m, excluidaEm: results[i].excluida_em as string, excluidaPor: (results[i].excluida_por as string | null) ?? null }));
}

export async function restaurarExcluida(id: string): Promise<void> {
  await db().prepare('UPDATE memorias SET excluida_em = NULL, excluida_por = NULL WHERE id = ?').bind(id).run();
}

export interface Versao<T> {
  id: number;
  dados: T;
  autor: string;
  criadaEm: string;
}

/** Versões anteriores de um item, da mais recente para a mais antiga. */
export async function listarVersoes<T>(tipo: 'memoria' | 'relato', itemId: string): Promise<Versao<T>[]> {
  const { results } = await db()
    .prepare('SELECT id, dados, autor, criada_em FROM versoes WHERE tipo = ? AND item_id = ? ORDER BY id DESC LIMIT 50')
    .bind(tipo, itemId)
    .all<Record<string, unknown>>();
  return results.map((v) => ({ id: v.id as number, dados: JSON.parse(v.dados as string) as T, autor: v.autor as string, criadaEm: v.criada_em as string }));
}

/** Fotos tiradas de uma memória, que ainda podem voltar. */
export async function listarFotosRemovidas(memoriaId: string): Promise<(Foto & { removidaEm: string })[]> {
  const { results } = await db()
    .prepare('SELECT * FROM fotos WHERE memoria_id = ? AND removida_em IS NOT NULL ORDER BY removida_em DESC')
    .bind(memoriaId)
    .all<Record<string, unknown>>();
  return results.map((f) => ({
    id: f.id as number,
    chave: f.chave as string,
    legenda: f.legenda as string | null,
    principal: false,
    enviadaPor: f.enviada_por as string,
    removidaEm: f.removida_em as string,
  }));
}

/** Devolve a foto à memória. Só quem enviou, a mesma pessoa que pode remover. */
export async function restaurarFoto(id: number, memoriaId: string, usuario: Usuario): Promise<boolean> {
  const resultado = await db()
    .prepare('UPDATE fotos SET removida_em = NULL, principal = 0 WHERE id = ? AND memoria_id = ? AND enviada_por = ? AND removida_em IS NOT NULL')
    .bind(id, memoriaId, usuario.pessoa)
    .run();
  return (resultado.meta.changes ?? 0) > 0;
}

// --- Fotos ---

export async function registrarFoto(chave: string, usuario: Usuario): Promise<number> {
  const resultado = await db().prepare('INSERT INTO fotos (chave, enviada_por) VALUES (?, ?)').bind(chave, usuario.pessoa).run();
  return resultado.meta.last_row_id;
}

export interface FotoNoBanco {
  id: number;
  memoriaId: string | null;
  chave: string;
  enviadaPor: string;
}

export async function obterFotos(ids: number[]): Promise<FotoNoBanco[]> {
  if (ids.length === 0) return [];
  const { results } = await db()
    .prepare(`SELECT id, memoria_id, chave, enviada_por FROM fotos WHERE removida_em IS NULL AND id IN (SELECT value FROM json_each(?))`)
    .bind(JSON.stringify(ids))
    .all<Record<string, unknown>>();
  return results.map((f) => ({ id: f.id as number, memoriaId: f.memoria_id as string | null, chave: f.chave as string, enviadaPor: f.enviada_por as string }));
}

/** O usuário pode ver o arquivo desta chave? Foto solta: só quem enviou. Foto de memória: quem vê a memória. Foto removida: só quem enviou. */
export async function podeVerFoto(usuario: Usuario, chave: string): Promise<boolean> {
  const linha = await db()
    .prepare(
      `SELECT 1 AS ok FROM fotos f WHERE f.chave = ?2 AND (
         (f.memoria_id IS NULL AND f.enviada_por = ?1 AND f.removida_em IS NULL)
         OR (
           -- foto removida: só quem enviou ainda vê, para poder devolvê-la à memória
           (f.removida_em IS NULL OR f.enviada_por = ?1)
           AND EXISTS (SELECT 1 FROM memorias m WHERE m.id = f.memoria_id AND ${FILTRO_VISIVEL})
         )
       ) LIMIT 1`,
    )
    .bind(usuario.pessoa, chave)
    .first();
  return Boolean(linha);
}

// --- Relatos ---

function lerRelato(r: Record<string, unknown>): Relato {
  return {
    id: r.id as number,
    memoriaId: r.memoria_id as string,
    por: r.por as string,
    registradoPor: r.registrado_por as string,
    texto: r.texto as string,
    situacao: r.situacao as 'rascunho' | 'publicada',
  };
}

/** Relatos de uma memória já conferida: os publicados, mais os rascunhos de quem pede. */
export async function listarRelatos(usuario: Usuario, memoriaId: string): Promise<Relato[]> {
  const { results } = await db()
    .prepare(`SELECT * FROM relatos WHERE memoria_id = ?2 AND (situacao = 'publicada' OR registrado_por = ?1) ORDER BY criado_em, id`)
    .bind(usuario.pessoa, memoriaId)
    .all<Record<string, unknown>>();
  return results.map(lerRelato);
}

/**
 * O relato de uma pessoa que vale para quem está escrevendo: o publicado, se houver, ou o rascunho que
 * a própria pessoa logada guardou. Rascunhos de outras pessoas não contam: ninguém fica sabendo deles.
 */
export async function obterRelato(memoriaId: string, por: string, usuario: Usuario): Promise<Relato | undefined> {
  const linha = await db()
    .prepare(
      `SELECT * FROM relatos WHERE memoria_id = ? AND por = ? AND (situacao = 'publicada' OR registrado_por = ?)
       ORDER BY situacao = 'publicada' DESC LIMIT 1`,
    )
    .bind(memoriaId, por, usuario.pessoa)
    .first<Record<string, unknown>>();
  return linha ? lerRelato(linha) : undefined;
}

export async function listarRascunhosDeRelato(usuario: Usuario): Promise<(Relato & { titulo: string })[]> {
  const { results } = await db()
    .prepare(
      `SELECT r.*, m.titulo FROM relatos r JOIN memorias m ON m.id = r.memoria_id
       WHERE r.situacao = 'rascunho' AND r.registrado_por = ?1 AND m.situacao = 'publicada' AND ${FILTRO_VISIVEL} ORDER BY r.atualizado_em DESC`,
    )
    .bind(usuario.pessoa)
    .all<Record<string, unknown>>();
  return results.map((r) => ({ ...lerRelato(r), titulo: r.titulo as string }));
}

export async function salvarRelato(
  memoriaId: string,
  por: string,
  texto: string,
  situacao: 'rascunho' | 'publicada',
  usuario: Usuario,
  anterior: Relato | undefined,
): Promise<void> {
  if (!anterior) {
    await db()
      .prepare('INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, ?, ?, ?)')
      .bind(memoriaId, por, usuario.pessoa, texto, situacao)
      .run();
    return;
  }
  await db().batch([
    db().prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('relato', ?, ?, ?)`).bind(String(anterior.id), JSON.stringify(anterior), usuario.pessoa),
    db().prepare(`UPDATE relatos SET texto = ?, situacao = ?, atualizado_em = datetime('now') WHERE id = ?`).bind(texto, situacao, anterior.id),
  ]);
}

/** O relato que esta pessoa registrou em nome de "por" nesta memória: é nele que entram os áudios dela. */
export async function obterRelatoRegistradoPor(memoriaId: string, por: string, usuario: Usuario): Promise<Relato | undefined> {
  const linha = await db()
    .prepare('SELECT * FROM relatos WHERE memoria_id = ? AND por = ? AND registrado_por = ? LIMIT 1')
    .bind(memoriaId, por, usuario.pessoa)
    .first<Record<string, unknown>>();
  return linha ? lerRelato(linha) : undefined;
}

// --- Áudios dos relatos (migração 015) ---

export interface Audio {
  id: number;
  relatoId: number | null;
  memoriaId: string | null;
  chave: string;
  tipo: string;
  duracao: number | null;
  transcricao: string | null;
  ordem: number;
  enviadoPor: string;
}

function lerAudio(r: Record<string, unknown>): Audio {
  return {
    id: r.id as number,
    relatoId: (r.relato_id as number | null) ?? null,
    memoriaId: (r.memoria_id as string | null) ?? null,
    chave: r.chave as string,
    tipo: r.tipo as string,
    duracao: (r.duracao as number | null) ?? null,
    transcricao: (r.transcricao as string | null) ?? null,
    ordem: r.ordem as number,
    enviadoPor: r.enviado_por as string,
  };
}

/** Quanto os áudios ocupam no bucket, contando os removidos, que continuam lá. */
export async function espacoDosAudios(): Promise<number> {
  const linha = await db().prepare('SELECT COALESCE(SUM(tamanho), 0) AS total FROM audios').first<{ total: number }>();
  return linha?.total ?? 0;
}

export async function registrarAudio(dados: { chave: string; tipo: string; tamanho: number; duracao: number | null; memoriaId: string | null }, usuario: Usuario): Promise<number> {
  const resultado = await db()
    .prepare('INSERT INTO audios (chave, tipo, tamanho, duracao, memoria_id, enviado_por) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(dados.chave, dados.tipo, dados.tamanho, dados.duracao, dados.memoriaId, usuario.pessoa)
    .run();
  return resultado.meta.last_row_id;
}

/** Os áudios ainda em uso de vários relatos de uma vez, na ordem. */
export async function listarAudiosDosRelatos(relatoIds: number[]): Promise<Map<number, Audio[]>> {
  const mapa = new Map<number, Audio[]>();
  if (!relatoIds.length) return mapa;
  const { results } = await db()
    .prepare(`SELECT * FROM audios WHERE removido_em IS NULL AND relato_id IN (${relatoIds.map(() => '?').join(', ')}) ORDER BY ordem, id`)
    .bind(...relatoIds)
    .all<Record<string, unknown>>();
  for (const r of results) {
    const a = lerAudio(r);
    mapa.set(a.relatoId!, [...(mapa.get(a.relatoId!) ?? []), a]);
  }
  return mapa;
}

/**
 * Liga ao relato os áudios da lista, na ordem dela e com a transcrição de cada um, e marca como removidos
 * os que eram do relato e saíram da lista. Só entram áudios que a própria pessoa enviou para esta memória.
 * Devolve quantos da lista foram aceitos.
 */
export async function ligarAudios(relatoId: number, memoriaId: string, itens: { id: number; transcricao?: string }[], usuario: Usuario): Promise<number> {
  const ids = itens.map((i) => i.id);
  const { results } = await db()
    .prepare(
      `SELECT id FROM audios WHERE removido_em IS NULL AND enviado_por = ? AND (memoria_id = ? OR memoria_id IS NULL)
       AND (relato_id IS NULL OR relato_id = ?) AND id IN (${ids.length ? ids.map(() => '?').join(', ') : 'NULL'})`,
    )
    .bind(usuario.pessoa, memoriaId, relatoId, ...ids)
    .all<{ id: number }>();
  const aceitos = new Set(results.map((r: { id: number }) => r.id));
  const validos = itens.filter((i) => aceitos.has(i.id));
  await db().batch([
    db()
      .prepare(`UPDATE audios SET removido_em = datetime('now') WHERE relato_id = ? AND removido_em IS NULL AND id NOT IN (${validos.length ? validos.map(() => '?').join(', ') : 'NULL'})`)
      .bind(relatoId, ...validos.map((i) => i.id)),
    ...validos.map((item, ordem) =>
      db()
        .prepare('UPDATE audios SET relato_id = ?, memoria_id = ?, ordem = ?, transcricao = ? WHERE id = ?')
        .bind(relatoId, memoriaId, ordem, item.transcricao?.trim() || null, item.id),
    ),
  ]);
  return validos.length;
}

/**
 * Quem pode ouvir: o áudio solto, só quem enviou; o áudio de um relato, quem vê o relato (publicado, ou o
 * rascunho de quem registrou) numa memória que vê; o removido, só quem enviou.
 */
export async function podeOuvirAudio(usuario: Usuario, chave: string): Promise<boolean> {
  const linha = await db()
    .prepare(
      `SELECT 1 AS ok FROM audios a WHERE a.chave = ?2 AND (
         (a.relato_id IS NULL AND a.enviado_por = ?1)
         OR (
           (a.removido_em IS NULL OR a.enviado_por = ?1)
           AND EXISTS (
             SELECT 1 FROM relatos r JOIN memorias m ON m.id = r.memoria_id
             WHERE r.id = a.relato_id AND (r.situacao = 'publicada' OR r.registrado_por = ?1) AND ${FILTRO_VISIVEL}
           )
         )
       ) LIMIT 1`,
    )
    .bind(usuario.pessoa, chave)
    .first();
  return Boolean(linha);
}

/** Os áudios em que uma pessoa fala (os dos relatos dela), entre as memórias que quem pede vê. */
export async function listarAudiosDe(usuario: Usuario, pessoaId: string): Promise<(Audio & { memoriaTitulo: string; memoriaId: string })[]> {
  const { results } = await db()
    .prepare(
      `SELECT a.*, m.id AS memoria, m.titulo AS memoria_titulo FROM audios a
       JOIN relatos r ON r.id = a.relato_id
       JOIN memorias m ON m.id = r.memoria_id
       WHERE a.removido_em IS NULL AND r.por = ?2 AND r.situacao = 'publicada' AND m.situacao = 'publicada' AND ${FILTRO_VISIVEL}
       ORDER BY m.ano, m.mes, m.dia, a.ordem, a.id`,
    )
    .bind(usuario.pessoa, pessoaId)
    .all<Record<string, unknown>>();
  return results.map((r: Record<string, unknown>) => ({ ...lerAudio(r), memoriaId: r.memoria as string, memoriaTitulo: r.memoria_titulo as string }));
}

// --- Tamanho do banco (aviso de 300 MB, ver src/lib/tamanho-do-banco.ts) ---

/**
 * O tamanho do banco em bytes. O D1 informa em cada consulta (meta.size_after); por isso o aviso só
 * existe com o site rodando, e não no build. Devolve null se o banco não informar.
 */
export async function tamanhoDoBanco(): Promise<number | null> {
  try {
    const resultado = await db().prepare('SELECT 1').run();
    const tamanho = (resultado.meta as { size_after?: number } | undefined)?.size_after;
    return typeof tamanho === 'number' ? tamanho : null;
  } catch {
    return null;
  }
}
