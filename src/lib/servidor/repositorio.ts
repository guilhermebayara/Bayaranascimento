// Leitura e gravação no banco. Toda leitura de memória recebe o usuário e já
// aplica a regra de visibilidade: nenhuma página consulta o banco por fora.
import { env } from 'cloudflare:workers';
import type { AcessoDaMemoria, Usuario } from './permissoes';

export interface Integrante {
  id: string;
  nome: string;
  apelido: string | null;
  tipo: 'pessoa' | 'bicho';
  especie: string | null;
  nascimentoAno: number | null;
  falecimentoAno: number | null;
  sobre: string | null;
  admin: boolean;
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
    nascimentoAno: i.nascimento_ano as number | null,
    falecimentoAno: i.falecimento_ano as number | null,
    sobre: i.sobre as string | null,
    admin: Boolean(i.admin),
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
        `INSERT INTO memorias (id, titulo, ano, mes, dia, aproximada, tipo, lugar, visibilidade, situacao, criada_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, dados.titulo, dados.ano, dados.mes ?? null, dados.dia ?? null, dados.aproximada ? 1 : 0, dados.tipo, dados.lugar ?? null, dados.visibilidade, dados.situacao, usuario.pessoa),
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
        `UPDATE memorias SET titulo = ?, ano = ?, mes = ?, dia = ?, aproximada = ?, tipo = ?, lugar = ?,
           visibilidade = ?, situacao = ?, atualizada_em = datetime('now') WHERE id = ?`,
      )
      .bind(dados.titulo, dados.ano, dados.mes ?? null, dados.dia ?? null, dados.aproximada ? 1 : 0, dados.tipo, dados.lugar ?? null, dados.visibilidade, dados.situacao, anterior.id),
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
