// Leitura e gravação no banco. Toda leitura de memória recebe o usuário e já
// aplica a regra de visibilidade: nenhuma página consulta o banco por fora.
import { env } from 'cloudflare:workers';
import type { Casal, Fase, Filiacao, Qualidade, TipoDeFase, Tratamento } from '../parentesco';
import { podeVerCasal } from '../parentesco';
import type { Tipo } from '../tipos';
import type { AcessoDaMemoria, Usuario } from './permissoes';

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
  admin: boolean;
  criadoPor: string | null;
  nucleos: string[];
}

export interface Nucleo {
  id: string;
  nome: string;
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

const db = () => env.DB;

/**
 * Regra de visibilidade em SQL. ?1 é sempre o id do usuário.
 * Precisa dizer o mesmo que podeVerMemoria, em permissoes.ts.
 */
const FILTRO_VISIVEL = `(
  (m.situacao = 'rascunho' AND m.criada_por = ?1)
  OR (m.situacao = 'publicada' AND (
    m.visibilidade = 'todos'
    OR EXISTS (
      SELECT 1 FROM memoria_nucleos mn
      JOIN nucleo_membros nm ON nm.nucleo_id = mn.nucleo_id
      WHERE mn.memoria_id = m.id AND nm.integrante_id = ?1
    )
  ))
)`;

// --- Integrantes e núcleos ---

export async function listarIntegrantes(): Promise<Integrante[]> {
  const [integrantes, membros] = await db().batch<Record<string, unknown>>([
    db().prepare('SELECT * FROM integrantes ORDER BY ordem, nome'),
    db().prepare('SELECT nucleo_id, integrante_id FROM nucleo_membros'),
  ]);
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
    admin: Boolean(i.admin),
    criadoPor: (i.criado_por as string | null) ?? null,
    nucleos: membros.results.filter((m) => m.integrante_id === i.id).map((m) => m.nucleo_id as string),
  }));
}

export async function listarNucleos(): Promise<Nucleo[]> {
  const { results } = await db().prepare('SELECT id, nome FROM nucleos ORDER BY ordem, nome').all<Nucleo>();
  return results;
}

export async function criarIntegrante(id: string, nome: string, criadoPor: string): Promise<void> {
  await db().prepare(`INSERT INTO integrantes (id, nome, criado_por) VALUES (?, ?, ?)`).bind(id, nome, criadoPor).run();
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
  sobre?: string;
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
  d.sobre ?? null,
];

export async function criarIntegranteCompleto(id: string, dados: DadosDoIntegrante, usuario: Usuario): Promise<void> {
  await db()
    .prepare(
      `INSERT INTO integrantes (nome, apelido, tipo, especie, tratamento, nascimento_ano, nascimento_mes, nascimento_dia,
         falecimento_ano, falecimento_mes, falecimento_dia, sobre, id, criado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(...valoresDoIntegrante(dados), id, usuario.pessoa)
    .run();
}

/** Atualiza o cadastro, guardando a versão anterior no histórico. */
export async function atualizarIntegrante(anterior: Integrante, dados: DadosDoIntegrante, usuario: Usuario): Promise<void> {
  await db().batch([
    db().prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('integrante', ?, ?, ?)`).bind(anterior.id, JSON.stringify(anterior), usuario.pessoa),
    db()
      .prepare(
        `UPDATE integrantes SET nome = ?, apelido = ?, tipo = ?, especie = ?, tratamento = ?, nascimento_ano = ?, nascimento_mes = ?,
           nascimento_dia = ?, falecimento_ano = ?, falecimento_mes = ?, falecimento_dia = ?, sobre = ? WHERE id = ?`,
      )
      .bind(...valoresDoIntegrante(dados), anterior.id),
  ]);
}

// --- Laços de árvore ---

export async function listarFiliacoes(): Promise<Filiacao[]> {
  const { results } = await db().prepare('SELECT filho_id, responsavel_id, qualidade FROM filiacoes').all<Record<string, unknown>>();
  return results.map((r) => ({ filho: r.filho_id as string, responsavel: r.responsavel_id as string, qualidade: r.qualidade as Qualidade }));
}

export async function salvarFiliacao(filho: string, responsavel: string, qualidade: Qualidade, usuario: Usuario): Promise<void> {
  await db()
    .prepare(
      `INSERT INTO filiacoes (filho_id, responsavel_id, qualidade, criado_por) VALUES (?, ?, ?, ?)
       ON CONFLICT (filho_id, responsavel_id) DO UPDATE SET qualidade = excluded.qualidade`,
    )
    .bind(filho, responsavel, qualidade, usuario.pessoa)
    .run();
}

export async function removerFiliacao(filho: string, responsavel: string, usuario: Usuario): Promise<void> {
  await db().batch([
    db()
      .prepare(
        `INSERT INTO versoes (tipo, item_id, dados, autor)
         SELECT 'filiacao', filho_id || '>' || responsavel_id, json_object('filho', filho_id, 'responsavel', responsavel_id, 'qualidade', qualidade), ?
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
export async function listarCasais(usuario: Usuario): Promise<Casal[]> {
  return (await lerCasais()).filter((c) => podeVerCasal(usuario.pessoa, c));
}

export async function obterCasalDoPar(x: string, y: string): Promise<Casal | undefined> {
  const [a, b] = x < y ? [x, y] : [y, x];
  return (await lerCasais()).find((c) => c.a === a && c.b === b);
}

export async function obterCasal(id: number): Promise<Casal | undefined> {
  return (await lerCasais()).find((c) => c.id === id);
}

/** Cria o casal ou troca as fases dele, guardando no histórico o que havia antes. */
export async function salvarCasal(x: string, y: string, fases: Fase[], visibilidade: 'todos' | 'privado', usuario: Usuario): Promise<void> {
  const [a, b] = x < y ? [x, y] : [y, x];
  const anterior = await obterCasalDoPar(a, b);
  const comandos: D1PreparedStatement[] = [];
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
           VALUES ((SELECT id FROM casais WHERE a_id = ? AND b_id = ?), ?, ?, ?, ?)`,
        )
        .bind(a, b, fase.tipo, fase.inicioAno, fase.fimAno, ordem),
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
export async function promoverTextoDeOutro(texto: string, tipoId: string): Promise<number> {
  const resultado = await db()
    .prepare(`UPDATE memorias SET tipo = ?, tipo_outro = NULL WHERE tipo = 'outro' AND LOWER(TRIM(tipo_outro)) = LOWER(TRIM(?))`)
    .bind(tipoId, texto)
    .run();
  return resultado.meta.changes ?? 0;
}

// --- Memórias ---

interface FiltroDeMemorias {
  integrante?: string;
  nucleo?: string;
  /** só os rascunhos de quem pede */
  rascunhos?: boolean;
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
    relatos: 0,
  };
}

async function completar(memorias: Memoria[]): Promise<Memoria[]> {
  if (memorias.length === 0) return memorias;
  const ids = JSON.stringify(memorias.map((m) => m.id));
  const dentro = `IN (SELECT value FROM json_each(?))`;
  const [nucleos, integrantes, fotos, relatos] = await db().batch<Record<string, unknown>>([
    db().prepare(`SELECT memoria_id, nucleo_id FROM memoria_nucleos WHERE memoria_id ${dentro}`).bind(ids),
    db().prepare(`SELECT memoria_id, integrante_id FROM memoria_integrantes WHERE memoria_id ${dentro}`).bind(ids),
    db()
      .prepare(`SELECT * FROM fotos WHERE removida_em IS NULL AND memoria_id ${dentro} ORDER BY principal DESC, ordem, id`)
      .bind(ids),
    db()
      .prepare(`SELECT memoria_id, COUNT(*) AS n FROM relatos WHERE situacao = 'publicada' AND memoria_id ${dentro} GROUP BY memoria_id`)
      .bind(ids),
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

/** O usuário pode ver o arquivo desta chave? Foto solta: só quem enviou. Foto de memória: quem vê a memória. */
export async function podeVerFoto(usuario: Usuario, chave: string): Promise<boolean> {
  const linha = await db()
    .prepare(
      `SELECT 1 AS ok FROM fotos f WHERE f.chave = ?2 AND f.removida_em IS NULL AND (
         (f.memoria_id IS NULL AND f.enviada_por = ?1)
         OR EXISTS (SELECT 1 FROM memorias m WHERE m.id = f.memoria_id AND ${FILTRO_VISIVEL})
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

export async function obterRelato(memoriaId: string, por: string): Promise<Relato | undefined> {
  const linha = await db().prepare('SELECT * FROM relatos WHERE memoria_id = ? AND por = ?').bind(memoriaId, por).first<Record<string, unknown>>();
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
