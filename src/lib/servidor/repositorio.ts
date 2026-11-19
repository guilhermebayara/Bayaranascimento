// Leitura e gravação no banco. Toda leitura de memória recebe o usuário e já
// aplica a regra de visibilidade: nenhuma página consulta o banco por fora.
import { apelidosDoPedido, banco } from './ambiente';
import type { Casal, DataDaAdocao, Fase, Filiacao, LacoDoCoracao, Papel, Qualidade, TipoDeFase, Tratamento } from '../parentesco';
import { podeVerCasal, podeVerLacoDoCoracao } from '../parentesco';
import { podeVerCapitulo, type Capitulo, type Tema } from '../capitulos';
import type { RegistroDeVisitas } from '../painel';
import { criarSlug, slugUnico } from './conteudo';
import type { Tipo } from '../tipos';
import type { TipoDeAviso } from '../avisos';
import { exesDe, foraQueEPaiViraDiscreto, modosQueValem, type ModoDoEx } from '../ex-casal';
import { destinatarios, type Proposta, type SituacaoDaSugestao, type Sugestao, type TipoDeSugestao } from '../sugestoes';
import type { SimboloDaReacao } from '../reacoes';
import { mensagensDoRelato, type Mensagem } from '../conversa';
import { comExcluidas, pessoasQueNaoVe, podeVerRetrato, veORelato, type AcessoDaMemoria, type Usuario } from './permissoes';

export interface Integrante {
  id: string;
  nome: string;
  /** O apelido que vale para quem olha: o que ela deu à pessoa, se deu ("Como você chama"), e senão o da família */
  apelido: string | null;
  /** O "como é chamado na família", o mesmo para todos: é o que a ficha de edição mostra e grava */
  apelidoDaFamilia?: string | null;
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
  /** O relato com que a foto veio ("Fotos pelo relato", migração 022). Vazio: veio pelo formulário da memória. */
  relatoId: number | null;
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
  /** quando entrou no acervo (data de cadastro) */
  criadaEm: string;
  fotos: Foto[];
  /** capítulos reunidos em que foi colocada (os por período são calculados pela data e por quem é o capítulo) */
  capitulos: string[];
  /** ids de temas */
  temas: string[];
  /** quantidade de relatos publicados */
  relatos: number;
  /** quando foi publicada (as de antes da migração 020, quando foram criadas); vazio no rascunho */
  publicadaEm: string;
}

export interface Relato {
  id: number;
  memoriaId: string;
  por: string;
  registradoPor: string;
  texto: string;
  situacao: 'rascunho' | 'publicada';
  /**
   * Depois de a memória ser ampliada, o relato espera o sim de quem o registrou e fica só para quem via
   * antes: os membros destes núcleos (ver estaNoPublicoDoRelato). Vazio: acompanha a memória.
   */
  soParaNucleos: string[] | null;
}

/** A coluna so_para_nucleos (migração 025), em JSON, como lista. */
const lerNucleosDoRelato = (valor: unknown): string[] | null => (typeof valor === 'string' && valor ? (JSON.parse(valor) as string[]) : null);

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

/**
 * Excluir pessoa (decisão do Gui depois da sessão I, 18/11/2026): quem está na lixeira não aparece em
 * nenhuma lista de pessoas nem de laços. As linhas continuam no banco, para restaurar devolver tudo.
 */
const ativa = (coluna: string) => `${coluna} NOT IN (SELECT id FROM integrantes WHERE excluida_em IS NOT NULL)`;

export async function listarIntegrantes(): Promise<Integrante[]> {
  const [integrantes, membros] = await db().batch<Record<string, unknown>>([
    db().prepare('SELECT * FROM integrantes WHERE excluida_em IS NULL ORDER BY ordem, nome'),
    db().prepare('SELECT nucleo_id, integrante_id, papel FROM nucleo_membros'),
  ]);
  const linhas = membros.results as Record<string, unknown>[];
  const daPessoa = (id: string, papel: 'membro' | 'parente') =>
    linhas.filter((m) => m.integrante_id === id && (m.papel ?? 'membro') === papel).map((m) => m.nucleo_id as string);
  const meus = apelidosDoPedido();
  return integrantes.results.map((i) => ({
    id: i.id as string,
    nome: i.nome as string,
    apelido: meus?.get(i.id as string) ?? (i.apelido as string | null),
    apelidoDaFamilia: i.apelido as string | null,
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
  const { results } = await db().prepare(`SELECT id, a_id, b_id, papel, criado_por FROM lacos_resumidos WHERE ${ativa('a_id')} AND ${ativa('b_id')} ORDER BY id`).all<Record<string, unknown>>();
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
  const { results } = await db().prepare(`SELECT filho_id, responsavel_id, qualidade, adocao_ano, adocao_mes, adocao_dia FROM filiacoes WHERE ${ativa('filho_id')} AND ${ativa('responsavel_id')}`).all<Record<string, unknown>>();
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
  const [casais, fases, familias] = await db().batch<Record<string, unknown>>([
    db().prepare('SELECT * FROM casais ORDER BY id'),
    db().prepare('SELECT * FROM casal_fases ORDER BY casal_id, ordem, id'),
    db().prepare('SELECT casal_id, nucleo_id FROM casal_nucleos ORDER BY nucleo_id'),
  ]);
  return casais.results.map((c) => ({
    id: c.id as number,
    a: c.a_id as string,
    b: c.b_id as string,
    visibilidade: c.visibilidade as Casal['visibilidade'],
    nucleos: familias.results.filter((f: Record<string, unknown>) => f.casal_id === c.id).map((f: Record<string, unknown>) => f.nucleo_id as string),
    criadoPor: (c.criado_por as string | null) ?? null,
    jaDaFamilia: Boolean(c.ja_da_familia),
    fases: fases.results
      .filter((f: Record<string, unknown>) => f.casal_id === c.id)
      .map((f: Record<string, unknown>) => ({
        tipo: f.tipo as TipoDeFase,
        inicioAno: (f.inicio_ano as number | null) ?? null,
        fimAno: (f.fim_ano as number | null) ?? null,
        inicioMes: (f.inicio_mes as number | null) ?? null,
        inicioDia: (f.inicio_dia as number | null) ?? null,
        fimMes: (f.fim_mes as number | null) ?? null,
        fimDia: (f.fim_dia as number | null) ?? null,
      })),
  }));
}

/** Do mais fechado para o mais aberto: quem vê mais de um registro do mesmo par fica com o mais fechado. */
const FECHAMENTO: Record<Casal['visibilidade'], number> = { privado: 2, nucleos: 1, todos: 0 };

/**
 * Os casais que a pessoa vê, um por par. Um par pode ter um registro restrito (só os dois, ou famílias
 * escolhidas) e um público, cadastrado por quem não via o restrito. Quem vê o restrito fica com ele.
 */
export async function listarCasais(usuario: Usuario): Promise<Casal[]> {
  const [casais, excluidas] = await Promise.all([lerCasais(), idsDasPessoasExcluidas()]);
  const visiveis = casais.filter((c) => podeVerCasal(usuario.pessoa, c, usuario.nucleos ?? []) && !excluidas.has(c.a) && !excluidas.has(c.b));
  const porPar = new Map<string, Casal>();
  for (const c of visiveis) {
    const chave = `${c.a}|${c.b}`;
    const ja = porPar.get(chave);
    if (!ja || FECHAMENTO[c.visibilidade] > FECHAMENTO[ja.visibilidade]) porPar.set(chave, c);
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

/**
 * Cria o casal ou troca as fases dele, guardando no histórico o que havia antes. `nucleos` são as
 * famílias que veem, com visibilidade 'nucleos' (casal desfeito, decisão do Gui de 18/11/2026).
 */
export async function salvarCasal(x: string, y: string, fases: Fase[], visibilidade: Casal['visibilidade'], usuario: Usuario, nucleos: string[] = [], jaDaFamilia = false): Promise<void> {
  const [a, b] = x < y ? [x, y] : [y, x];
  const anterior = await obterCasalDoPar(a, b, usuario);
  const comandos: D1PreparedStatement[] = [];
  // Quem vê o casal restrito e o torna público assume o lugar do registro público que outra pessoa tinha feito
  const publico = (await lerCasais()).find((c) => c.a === a && c.b === b && c.visibilidade === 'todos');
  if (anterior && anterior.visibilidade !== 'todos' && visibilidade === 'todos' && publico && publico.id !== anterior.id) {
    comandos.push(
      db().prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('casal', ?, ?, ?)`).bind(String(publico.id), JSON.stringify(publico), usuario.pessoa),
      db().prepare('DELETE FROM casal_fases WHERE casal_id = ?').bind(publico.id),
      db().prepare('DELETE FROM casais WHERE id = ?').bind(publico.id),
    );
  }
  if (anterior) {
    comandos.push(
      db().prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('casal', ?, ?, ?)`).bind(String(anterior.id), JSON.stringify(anterior), usuario.pessoa),
      db().prepare('UPDATE casais SET visibilidade = ?, ja_da_familia = ? WHERE id = ?').bind(visibilidade, jaDaFamilia ? 1 : 0, anterior.id),
      db().prepare('DELETE FROM casal_fases WHERE casal_id = ?').bind(anterior.id),
    );
  } else {
    comandos.push(db().prepare('INSERT INTO casais (a_id, b_id, visibilidade, criado_por, ja_da_familia) VALUES (?, ?, ?, ?, ?)').bind(a, b, visibilidade, usuario.pessoa, jaDaFamilia ? 1 : 0));
  }
  fases.forEach((fase, ordem) => {
    comandos.push(
      db()
        .prepare(
          `INSERT INTO casal_fases (casal_id, tipo, inicio_ano, inicio_mes, inicio_dia, fim_ano, fim_mes, fim_dia, ordem)
           VALUES ((SELECT id FROM casais WHERE a_id = ? AND b_id = ? AND visibilidade = ?), ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(a, b, visibilidade, fase.tipo, fase.inicioAno, fase.inicioMes ?? null, fase.inicioDia ?? null, fase.fimAno, fase.fimMes ?? null, fase.fimDia ?? null, ordem),
    );
  });
  // As famílias que veem: só com 'nucleos'; nas outras escolhas, a lista fica vazia
  const casalDoPar = `(SELECT id FROM casais WHERE a_id = ? AND b_id = ? AND visibilidade = ?)`;
  comandos.push(db().prepare(`DELETE FROM casal_nucleos WHERE casal_id = ${casalDoPar}`).bind(a, b, visibilidade));
  if (visibilidade === 'nucleos') {
    for (const n of [...new Set(nucleos)]) comandos.push(db().prepare(`INSERT INTO casal_nucleos (casal_id, nucleo_id) VALUES (${casalDoPar}, ?)`).bind(a, b, visibilidade, n));
  }
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
  const { results } = await db().prepare(`SELECT * FROM lacos_coracao WHERE ${ativa('dono_id')} AND ${ativa('pessoa_id')} ORDER BY COALESCE(proximidade, 9), nome`).all<Record<string, unknown>>();
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

/**
 * Quem a pessoa logada não vê (ver pessoasQueNaoVe), e quem está na lixeira (excluir pessoa), que ninguém
 * vê. O conjunto leva junto quem está na lixeira (`comExcluidas`), para o relato que ela escreveu ficar,
 * com o nome, sem link (veORelato). Barato quando ninguém tem laço privado.
 */
export async function pessoasQueONaoVe(usuario: Usuario): Promise<Set<string>> {
  const [emPrivados, excluidas] = await Promise.all([pessoasEmLacosPrivadosDeOutros(usuario), idsDasPessoasExcluidas()]);
  if (emPrivados.size === 0) return comExcluidas(new Set(excluidas), excluidas);
  return comExcluidas(new Set([...(await pessoasQueONaoVeEmPrivados(usuario, emPrivados)), ...excluidas]), excluidas);
}

async function pessoasQueONaoVeEmPrivados(usuario: Usuario, emPrivados: Set<string>): Promise<Set<string>> {
  const [filiacoes, casais, lacos] = await Promise.all([listarFiliacoes(), listarCasais(usuario), listarLacosDoCoracao(usuario)]);
  // A pessoa logada sempre se vê, mesmo sem laço nenhum além do privado de outra pessoa
  const comLaco = new Set([usuario.pessoa, ...filiacoes.flatMap((f) => [f.filho, f.responsavel]), ...casais.flatMap((c) => [c.a, c.b]), ...lacos.flatMap((l) => [l.dono, l.pessoa])]);
  return pessoasQueNaoVe(emPrivados, comLaco);
}

/**
 * Os integrantes que a pessoa logada vê: todos, menos quem só existe num laço do coração privado de
 * outra pessoa (decisão do Gui, 17/11/2026, C1). Vale para a lista de Pessoas, a página da pessoa, os
 * seletores de pessoa e as APIs que marcam alguém numa memória, num relato ou num capítulo.
 */
export async function listarIntegrantesQueVe(usuario: Usuario): Promise<Integrante[]> {
  const [todos, naoVe] = await Promise.all([listarIntegrantes(), pessoasQueONaoVe(usuario)]);
  return naoVe.size === 0 ? todos : todos.filter((i) => !naoVe.has(i.id));
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

/**
 * Remove um laço do coração que quem chama já pode mudar (podeMudarLacoDoCoracao). A versão de antes
 * fica guardada com o nome de quem removeu: o dono ou um administrador.
 */
export async function removerLacoDoCoracao(laco: LacoDoCoracao, usuario: Usuario): Promise<boolean> {
  const [, resultado] = await db().batch([
    db().prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) SELECT 'laco-coracao', CAST(id AS TEXT), json_object('dono', dono_id, 'pessoa', pessoa_id, 'nome', nome, 'papel', papel, 'proximidade', proximidade, 'privado', privado), ? FROM lacos_coracao WHERE id = ?`).bind(usuario.pessoa, laco.id),
    db().prepare('DELETE FROM lacos_coracao WHERE id = ?').bind(laco.id),
  ]);
  return ((resultado as { meta?: { changes?: number } })?.meta?.changes ?? 0) > 0;
}

/**
 * Um administrador muda o laço do coração de outra pessoa ("Administradores podem mais", 16/11/2026):
 * só o nome do laço e o lugar na árvore. A proximidade e o "só eu vejo" continuam do dono. A versão de
 * antes fica guardada com o nome de quem mudou.
 */
export async function mudarLacoDoCoracaoDeOutro(laco: LacoDoCoracao, dados: { nome: string; papel: Papel | null }, usuario: Usuario): Promise<void> {
  await db().batch([
    db().prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) SELECT 'laco-coracao', CAST(id AS TEXT), json_object('dono', dono_id, 'pessoa', pessoa_id, 'nome', nome, 'papel', papel, 'proximidade', proximidade, 'privado', privado), ? FROM lacos_coracao WHERE id = ?`).bind(usuario.pessoa, laco.id),
    db().prepare('UPDATE lacos_coracao SET nome = ?, papel = ? WHERE id = ?').bind(dados.nome, dados.papel, laco.id),
  ]);
}

// --- Tipos de momento ---

export async function listarTipos(): Promise<Tipo[]> {
  const { results } = await db().prepare('SELECT id, rotulo, cor, cor_da_paleta AS corDaPaleta, icone FROM tipos ORDER BY ordem, rotulo').all<Tipo>();
  return results;
}

/**
 * A cor é o nome de uma cor da paleta e o ícone, o de um rabisco: quem chama já conferiu os dois
 * contra as listas (src/pages/api/tipos.ts). A coluna antiga "cor" guarda o mesmo nome, porque não
 * aceita ficar vazia; o site não lê mais dela.
 */
export async function criarTipo(id: string, rotulo: string, cor: string, icone: string, usuario: Usuario): Promise<void> {
  await db()
    .prepare(
      `INSERT INTO tipos (id, rotulo, cor, cor_da_paleta, icone, ordem, criado_por)
       VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(ordem), 0) + 1 FROM tipos WHERE id <> 'outro'), ?)`,
    )
    .bind(id, rotulo, cor, cor, icone, usuario.pessoa)
    .run();
}

export async function atualizarTipo(id: string, rotulo: string, cor: string, icone: string): Promise<void> {
  await db().prepare('UPDATE tipos SET rotulo = ?, cor_da_paleta = ?, icone = ? WHERE id = ?').bind(rotulo, cor, icone, id).run();
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
  /** as publicadas e, junto, os rascunhos de quem pede (a linha do tempo de quem escreveu) */
  comRascunhos?: boolean;
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
    criadaEm: (linha.criada_em as string) ?? '',
    nucleos: [],
    integrantes: [],
    fotos: [],
    capitulos: [],
    temas: [],
    relatos: 0,
    publicadaEm: ((linha.publicada_em ?? (linha.situacao === 'publicada' ? linha.criada_em : '')) as string) ?? '',
  };
}

async function completar(memorias: Memoria[], usuario: Usuario): Promise<Memoria[]> {
  if (memorias.length === 0) return memorias;
  // A contagem de relatos deixa de fora o de quem a pessoa não vê (ver veORelato)
  const naoVe = await pessoasQueONaoVe(usuario);
  const ids = JSON.stringify(memorias.map((m) => m.id));
  const dentro = `IN (SELECT value FROM json_each(?))`;
  const [nucleos, integrantes, fotos, relatos, capitulos, temas] = await db().batch<Record<string, unknown>>([
    db().prepare(`SELECT memoria_id, nucleo_id FROM memoria_nucleos WHERE memoria_id ${dentro}`).bind(ids),
    db().prepare(`SELECT memoria_id, integrante_id FROM memoria_integrantes WHERE memoria_id ${dentro}`).bind(ids),
    db()
      .prepare(`SELECT * FROM fotos WHERE removida_em IS NULL AND memoria_id ${dentro} ORDER BY principal DESC, ordem, id`)
      .bind(ids),
    db()
      .prepare(`SELECT id, memoria_id, por, registrado_por, so_para_nucleos FROM relatos WHERE situacao = 'publicada' AND memoria_id ${dentro}`)
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
  // As fotos que vieram com um relato que a pessoa não vê também ficam de fora: ele foi escrito, com elas,
  // para quem via a memória antes de ela ser ampliada (ver estaNoPublicoDoRelato)
  const relatosQueNaoVe = new Set(
    relatos.results.filter((r) => !veORelato({ por: r.por as string, registradoPor: r.registrado_por as string, soParaNucleos: lerNucleosDoRelato(r.so_para_nucleos) }, usuario, naoVe)).map((r) => Number(r.id)),
  );
  for (const n of nucleos.results) porId.get(n.memoria_id as string)?.nucleos.push(n.nucleo_id as string);
  for (const i of integrantes.results) porId.get(i.memoria_id as string)?.integrantes.push(i.integrante_id as string);
  for (const f of fotos.results) {
    if (f.relato_id !== null && f.relato_id !== undefined && relatosQueNaoVe.has(Number(f.relato_id))) continue;
    porId.get(f.memoria_id as string)?.fotos.push({
      id: f.id as number,
      chave: f.chave as string,
      legenda: f.legenda as string | null,
      principal: Boolean(f.principal),
      enviadaPor: f.enviada_por as string,
      relatoId: (f.relato_id as number | null) ?? null,
    });
  }
  for (const c of capitulos.results) porId.get(c.memoria_id as string)?.capitulos.push(c.capitulo_id as string);
  for (const t of temas.results) porId.get(t.memoria_id as string)?.temas.push(t.tema_id as string);
  for (const r of relatos.results) {
    const memoria = porId.get(r.memoria_id as string);
    if (memoria && !relatosQueNaoVe.has(Number(r.id))) memoria.relatos += 1;
  }
  return memorias;
}

// --- Explorar ---

type LinhaDeRelato = { memoria_id: string; por: string; registrado_por: string; so_para_nucleos: string | null };
const relatoDaLinha = (r: LinhaDeRelato) => ({ por: r.por, registradoPor: r.registrado_por, soParaNucleos: lerNucleosDoRelato(r.so_para_nucleos) });

/**
 * Memórias com áudio em algum relato publicado que a pessoa vê (ver veORelato). Quem chama cruza com as
 * memórias que ela vê.
 */
export async function memoriasComAudio(usuario: Usuario): Promise<Set<string>> {
  const [{ results }, naoVe] = await Promise.all([
    db()
      .prepare(
        `SELECT DISTINCT r.memoria_id, r.por, r.registrado_por, r.so_para_nucleos FROM audios a JOIN relatos r ON r.id = a.relato_id
         WHERE a.removido_em IS NULL AND r.situacao = 'publicada'`,
      )
      .all<LinhaDeRelato>(),
    pessoasQueONaoVe(usuario),
  ]);
  return new Set((results as LinhaDeRelato[]).filter((r) => veORelato(relatoDaLinha(r), usuario, naoVe)).map((r) => r.memoria_id));
}

/**
 * Quem já contou algo (relato publicado) em cada memória, entre os relatos que a pessoa vê (ver
 * veORelato). Quem chama cruza com as memórias que ela vê.
 */
export async function quemContouEmCadaMemoria(usuario: Usuario): Promise<Map<string, Set<string>>> {
  const [{ results }, naoVe] = await Promise.all([
    db().prepare(`SELECT memoria_id, por, registrado_por, so_para_nucleos FROM relatos WHERE situacao = 'publicada'`).all<LinhaDeRelato>(),
    pessoasQueONaoVe(usuario),
  ]);
  const mapa = new Map<string, Set<string>>();
  for (const r of (results as LinhaDeRelato[]).filter((r) => veORelato(relatoDaLinha(r), usuario, naoVe))) {
    if (!mapa.has(r.memoria_id)) mapa.set(r.memoria_id, new Set());
    mapa.get(r.memoria_id)!.add(r.por);
  }
  return mapa;
}

/** Memórias que o usuário pode ver, da mais antiga para a mais recente. Rascunhos ficam de fora, salvo pedido. */
export async function listarMemorias(usuario: Usuario, filtro: FiltroDeMemorias = {}): Promise<Memoria[]> {
  // O rascunho só passa por FILTRO_VISIVEL para quem o criou
  const situacao = filtro.rascunhos ? `m.situacao = 'rascunho'` : filtro.comRascunhos ? `m.situacao IN ('publicada', 'rascunho')` : `m.situacao = 'publicada'`;
  const condicoes = [FILTRO_VISIVEL, situacao];
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
  return completar(results.map(lerMemoria), usuario);
}

/** Uma memória, se o usuário puder vê-la. Quem não pode recebe o mesmo que para uma memória inexistente. */
export async function obterMemoria(usuario: Usuario, id: string): Promise<Memoria | undefined> {
  const linha = await db()
    .prepare(`SELECT m.* FROM memorias m WHERE m.id = ?2 AND ${FILTRO_VISIVEL}`)
    .bind(usuario.pessoa, id)
    .first<Record<string, unknown>>();
  if (!linha) return undefined;
  return (await completar([lerMemoria(linha)], usuario))[0];
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
    marcarPublicacao(id),
    ...comandosDeLigacao(id, dados),
  ]);
}

/** A data de publicação é a da primeira vez que a memória sai do rascunho, e não muda depois. */
const marcarPublicacao = (id: string) =>
  db().prepare(`UPDATE memorias SET publicada_em = datetime('now') WHERE id = ? AND situacao = 'publicada' AND publicada_em IS NULL`).bind(id);

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
    marcarPublicacao(anterior.id),
    ...fotosRemovidas.map((id) => db().prepare(`UPDATE fotos SET removida_em = datetime('now'), removida_por = ? WHERE id = ?`).bind(usuario.pessoa, id)),
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
  const data = (ano: unknown, mes: unknown, dia: unknown) =>
    ano ? { ano: ano as number, mes: (mes as number | null) ?? null, dia: mes ? ((dia as number | null) ?? null) : null } : null;
  return {
    id: c.id as string,
    titulo: c.titulo as string,
    abertura: (c.abertura as string | null) ?? null,
    modo: c.modo as 'reunido' | 'epoca',
    inicio: data(c.inicio_ano, c.inicio_mes, c.inicio_dia),
    fim: data(c.fim_ano, c.fim_mes, c.fim_dia),
    dentroDe: (c.pai_id as string | null) ?? null,
    visibilidade: c.visibilidade as 'todos' | 'nucleos',
    nucleos: [],
    criadoPor: c.criado_por as string,
    temas: [],
    pessoas: [],
    familias: [],
  };
}

async function lerCapitulos(condicao: string): Promise<Capitulo[]> {
  const [capitulos, nucleos, temas, pessoas, familias] = await db().batch<Record<string, unknown>>([
    db().prepare(`SELECT * FROM capitulos WHERE ${condicao} ORDER BY COALESCE(inicio_ano, 9999), titulo`),
    db().prepare('SELECT capitulo_id, nucleo_id FROM capitulo_nucleos'),
    db().prepare('SELECT capitulo_id, tema_id FROM tema_capitulos'),
    db().prepare('SELECT capitulo_id, integrante_id FROM capitulo_pessoas'),
    db().prepare('SELECT capitulo_id, nucleo_id FROM capitulo_familias'),
  ]);
  const lista = capitulos.results.map(lerCapitulo);
  const porId = new Map(lista.map((c) => [c.id, c]));
  for (const n of nucleos.results) porId.get(n.capitulo_id as string)?.nucleos.push(n.nucleo_id as string);
  for (const t of temas.results) porId.get(t.capitulo_id as string)?.temas.push(t.tema_id as string);
  for (const p of pessoas.results) porId.get(p.capitulo_id as string)?.pessoas.push(p.integrante_id as string);
  for (const f of familias.results) porId.get(f.capitulo_id as string)?.familias.push(f.nucleo_id as string);
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

export interface DadosDoCapitulo {
  titulo: string;
  abertura?: string;
  modo: 'reunido' | 'epoca';
  inicio?: { ano: number; mes?: number | null; dia?: number | null };
  fim?: { ano: number; mes?: number | null; dia?: number | null };
  dentroDe?: string;
  visibilidade: 'todos' | 'nucleos';
  nucleos: string[];
  temas: string[];
  /** de quem é o capítulo por período; vazio junto com familias quer dizer época, de todos */
  pessoas: string[];
  familias: string[];
}

export async function salvarCapitulo(id: string, dados: DadosDoCapitulo, usuario: Usuario, novo: boolean): Promise<void> {
  const valores = [
    dados.titulo,
    dados.abertura ?? null,
    dados.modo,
    dados.modo === 'epoca' ? (dados.inicio?.ano ?? null) : null,
    dados.modo === 'epoca' ? (dados.inicio?.mes ?? null) : null,
    dados.modo === 'epoca' && dados.inicio?.mes ? (dados.inicio.dia ?? null) : null,
    dados.modo === 'epoca' ? (dados.fim?.ano ?? null) : null,
    dados.modo === 'epoca' ? (dados.fim?.mes ?? null) : null,
    dados.modo === 'epoca' && dados.fim?.mes ? (dados.fim.dia ?? null) : null,
    dados.dentroDe ?? null,
    dados.visibilidade,
  ];
  const comandos: D1PreparedStatement[] = [
    novo
      ? db()
          .prepare(
            `INSERT INTO capitulos (titulo, abertura, modo, inicio_ano, inicio_mes, inicio_dia, fim_ano, fim_mes, fim_dia, pai_id, visibilidade, id, criado_por)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(...valores, id, usuario.pessoa)
      : db()
          .prepare(
            `UPDATE capitulos SET titulo = ?, abertura = ?, modo = ?, inicio_ano = ?, inicio_mes = ?, inicio_dia = ?, fim_ano = ?, fim_mes = ?, fim_dia = ?,
               pai_id = ?, visibilidade = ?, atualizado_em = datetime('now') WHERE id = ?`,
          )
          .bind(...valores, id),
    db().prepare('DELETE FROM capitulo_nucleos WHERE capitulo_id = ?').bind(id),
    db().prepare('DELETE FROM tema_capitulos WHERE capitulo_id = ?').bind(id),
    ...dados.nucleos.map((n) => db().prepare('INSERT OR IGNORE INTO capitulo_nucleos (capitulo_id, nucleo_id) VALUES (?, ?)').bind(id, n)),
    ...dados.temas.map((t) => db().prepare('INSERT OR IGNORE INTO tema_capitulos (tema_id, capitulo_id) VALUES (?, ?)').bind(t, id)),
    // De quem é: só no capítulo por período. O reunido não guarda ninguém.
    db().prepare('DELETE FROM capitulo_pessoas WHERE capitulo_id = ?').bind(id),
    db().prepare('DELETE FROM capitulo_familias WHERE capitulo_id = ?').bind(id),
    ...(dados.modo === 'epoca' ? dados.pessoas : []).map((p) => db().prepare('INSERT OR IGNORE INTO capitulo_pessoas (capitulo_id, integrante_id) VALUES (?, ?)').bind(id, p)),
    ...(dados.modo === 'epoca' ? dados.familias : []).map((f) => db().prepare('INSERT OR IGNORE INTO capitulo_familias (capitulo_id, nucleo_id) VALUES (?, ?)').bind(id, f)),
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

/**
 * Apaga de vez uma memória que está na lixeira (onda 2): a ficha, os relatos, as versões, as pessoas,
 * as famílias, os capítulos e temas, os avisos e as reações. As fotos e os áudios ficam soltos, sem
 * legenda e sem transcrição: o arquivo continua no bucket, e as fotos passam a aparecer em "Fotos sem
 * memória", onde um administrador apaga o arquivo. Fica só a anotação de que algo foi apagado.
 */
export async function apagarMemoriaDeVez(id: string, usuario: Usuario): Promise<boolean> {
  const naLixeira = await db().prepare('SELECT 1 AS ok FROM memorias WHERE id = ? AND excluida_em IS NOT NULL').bind(id).first<{ ok: number }>();
  if (!naLixeira) return false;
  const relatos = `(SELECT CAST(id AS TEXT) FROM relatos WHERE memoria_id = ?1)`;
  await db().batch([
    db().prepare(`DELETE FROM versoes WHERE (tipo = 'memoria' AND item_id = ?1) OR (tipo = 'relato' AND item_id IN ${relatos})`).bind(id),
    db().prepare('DELETE FROM avisos WHERE memoria_id = ?1').bind(id),
    db().prepare('DELETE FROM sugestoes WHERE memoria_id = ?1').bind(id),
    db().prepare('DELETE FROM reacoes WHERE memoria_id = ?1').bind(id),
    db().prepare(`UPDATE fotos SET memoria_id = NULL, relato_id = NULL, legenda = NULL, principal = 0, removida_em = COALESCE(removida_em, datetime('now')), removida_por = COALESCE(removida_por, ?2) WHERE memoria_id = ?1 OR relato_id IN (SELECT id FROM relatos WHERE memoria_id = ?1)`).bind(id, usuario.pessoa),
    db().prepare(`UPDATE audios SET memoria_id = NULL, relato_id = NULL, transcricao = NULL, removido_em = COALESCE(removido_em, datetime('now')) WHERE memoria_id = ?1 OR relato_id IN (SELECT id FROM relatos WHERE memoria_id = ?1)`).bind(id),
    db().prepare('DELETE FROM relatos WHERE memoria_id = ?1').bind(id),
    db().prepare('DELETE FROM memorias WHERE id = ?1 AND excluida_em IS NOT NULL').bind(id),
    db().prepare(`INSERT INTO apagados_de_vez (tipo, item_id, por) VALUES ('memoria', ?1, ?2)`).bind(id, usuario.pessoa),
  ]);
  return true;
}

/** Apaga de vez um capítulo que está na lixeira. As memórias dele continuam; os capítulos de dentro ficam soltos. */
export async function apagarCapituloDeVez(id: string, usuario: Usuario): Promise<boolean> {
  const naLixeira = await db().prepare('SELECT 1 AS ok FROM capitulos WHERE id = ? AND excluido_em IS NOT NULL').bind(id).first<{ ok: number }>();
  if (!naLixeira) return false;
  await db().batch([
    db().prepare('UPDATE capitulos SET pai_id = NULL WHERE pai_id = ?1').bind(id),
    db().prepare(`DELETE FROM versoes WHERE tipo = 'capitulo' AND item_id = ?1`).bind(id),
    db().prepare('DELETE FROM capitulos WHERE id = ?1 AND excluido_em IS NOT NULL').bind(id),
    db().prepare(`INSERT INTO apagados_de_vez (tipo, item_id, por) VALUES ('capitulo', ?1, ?2)`).bind(id, usuario.pessoa),
  ]);
  return true;
}

/** A lixeira de quem pede: só o que a pessoa veria se a memória não tivesse sido excluída. */
export async function listarExcluidas(usuario: Usuario): Promise<MemoriaExcluida[]> {
  const { results } = await db()
    .prepare(`SELECT m.* FROM memorias m WHERE m.excluida_em IS NOT NULL AND ${FILTRO_SEM_LIXEIRA} ORDER BY m.excluida_em DESC`)
    .bind(usuario.pessoa)
    .all<Record<string, unknown>>();
  const completas = await completar(results.map(lerMemoria), usuario);
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
export async function listarVersoes<T>(tipo: 'memoria' | 'relato' | 'laco-coracao' | 'integrante', itemId: string): Promise<Versao<T>[]> {
  const { results } = await db()
    .prepare('SELECT id, dados, autor, criada_em FROM versoes WHERE tipo = ? AND item_id = ? ORDER BY id DESC LIMIT 50')
    .bind(tipo, itemId)
    .all<Record<string, unknown>>();
  return results.map((v) => ({ id: v.id as number, dados: JSON.parse(v.dados as string) as T, autor: v.autor as string, criadaEm: v.criada_em as string }));
}

/** Fotos tiradas de uma memória, que ainda podem voltar, com quem tirou (vazio nas antigas: foi quem enviou). */
export async function listarFotosRemovidas(memoriaId: string): Promise<(Foto & { removidaEm: string; removidaPor: string })[]> {
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
    relatoId: (f.relato_id as number | null) ?? null,
    removidaEm: f.removida_em as string,
    removidaPor: (f.removida_por as string | null) ?? (f.enviada_por as string),
  }));
}

/** Devolve a foto à memória: quem enviou e quem a removeu (podeRestaurarFoto). Nas antigas, quem removeu foi quem enviou. */
export async function restaurarFoto(id: number, memoriaId: string, usuario: Usuario): Promise<boolean> {
  const resultado = await db()
    .prepare('UPDATE fotos SET removida_em = NULL, removida_por = NULL, principal = 0 WHERE id = ?1 AND memoria_id = ?2 AND (enviada_por = ?3 OR removida_por = ?3) AND removida_em IS NOT NULL')
    .bind(id, memoriaId, usuario.pessoa)
    .run();
  return (resultado.meta.changes ?? 0) > 0;
}

// --- Fotos ---

/** A foto nasce solta, com o tamanho do arquivo, que entra na conta do espaço (migração 070). */
export async function registrarFoto(chave: string, usuario: Usuario, tamanho: number | null = null): Promise<number> {
  const resultado = await db().prepare('INSERT INTO fotos (chave, enviada_por, tamanho) VALUES (?, ?, ?)').bind(chave, usuario.pessoa, tamanho).run();
  return resultado.meta.last_row_id;
}

// --- Espaço das fotos e áudios (migração 070; regras em src/lib/espaco-dos-arquivos.ts) ---

/** Anota o retrato enviado, com o tamanho. A chave é a de integrantes.retrato, sem "retratos/". */
export async function registrarRetratoEnviado(chave: string, tamanho: number, usuario: Usuario): Promise<void> {
  await db().prepare('INSERT OR IGNORE INTO retratos_enviados (chave, tamanho, enviado_por) VALUES (?, ?, ?)').bind(chave, tamanho, usuario.pessoa).run();
}

/**
 * Quanto as fotos, os retratos e os áudios ocupam no bucket deste ambiente, pela soma do que cada um
 * guardou ao entrar. Conta também o que foi removido, que continua no bucket. Os arquivos de exemplo
 * ("exemplos/") moram no bucket de teste e ficam de fora. `semMedida` diz quantos arquivos de antes da
 * contagem ainda não têm tamanho: as fotos e os retratos atuais sem registro.
 */
export async function espacoDosArquivos(): Promise<{ bytes: number; semMedida: number }> {
  const linha = await db()
    .prepare(
      `SELECT
        (SELECT COALESCE(SUM(tamanho), 0) FROM fotos WHERE chave NOT LIKE 'exemplos/%') +
        (SELECT COALESCE(SUM(tamanho), 0) FROM audios WHERE chave NOT LIKE 'exemplos/%') +
        (SELECT COALESCE(SUM(tamanho), 0) FROM retratos_enviados WHERE chave NOT LIKE 'exemplos/%') AS bytes,
        (SELECT COUNT(*) FROM fotos WHERE tamanho IS NULL AND chave <> '' AND chave NOT LIKE 'exemplos/%') +
        (SELECT COUNT(DISTINCT retrato) FROM integrantes WHERE retrato IS NOT NULL AND retrato NOT LIKE 'exemplos/%'
          AND retrato NOT IN (SELECT chave FROM retratos_enviados)) AS sem_medida`,
    )
    .first<{ bytes: number; sem_medida: number }>();
  return { bytes: linha?.bytes ?? 0, semMedida: linha?.sem_medida ?? 0 };
}

/**
 * Mede aos poucos os arquivos de antes da contagem: até `limite` por vez, lendo só o tamanho no bucket
 * (head, que não baixa o arquivo nem grava nada). Quem não for achado no bucket fica com zero, para não
 * ser procurado de novo. Roda quando um administrador abre "Sua conta".
 */
export async function medirArquivosDeAntes(tamanhoNoBucket: (chave: string) => Promise<number | null>, limite = 20): Promise<number> {
  const { results: fotos } = await db()
    .prepare(`SELECT id, chave FROM fotos WHERE tamanho IS NULL AND chave <> '' AND chave NOT LIKE 'exemplos/%' LIMIT ?`)
    .bind(limite)
    .all<{ id: number; chave: string }>();
  const { results: retratos } = await db()
    .prepare(
      `SELECT DISTINCT retrato AS chave FROM integrantes WHERE retrato IS NOT NULL AND retrato NOT LIKE 'exemplos/%'
        AND retrato NOT IN (SELECT chave FROM retratos_enviados) LIMIT ?`,
    )
    .bind(Math.max(0, limite - fotos.length))
    .all<{ chave: string }>();
  const comandos: D1PreparedStatement[] = [];
  for (const f of fotos) comandos.push(db().prepare('UPDATE fotos SET tamanho = ? WHERE id = ?').bind((await tamanhoNoBucket(f.chave)) ?? 0, f.id));
  for (const r of retratos) {
    comandos.push(db().prepare('INSERT OR IGNORE INTO retratos_enviados (chave, tamanho) VALUES (?, ?)').bind(r.chave, (await tamanhoNoBucket(`retratos/${r.chave}`)) ?? 0));
  }
  if (comandos.length) await db().batch(comandos);
  return comandos.length;
}

export interface FotoNoBanco {
  id: number;
  memoriaId: string | null;
  chave: string;
  enviadaPor: string;
  /** Presa a um relato em rascunho, ou vinda com um relato. Uma foto presa a um relato não é solta. */
  relatoId: number | null;
}

export async function obterFotos(ids: number[]): Promise<FotoNoBanco[]> {
  if (ids.length === 0) return [];
  const { results } = await db()
    .prepare(`SELECT id, memoria_id, chave, enviada_por, relato_id FROM fotos WHERE removida_em IS NULL AND id IN (SELECT value FROM json_each(?))`)
    .bind(JSON.stringify(ids))
    .all<Record<string, unknown>>();
  return results.map((f) => ({
    id: f.id as number,
    memoriaId: f.memoria_id as string | null,
    chave: f.chave as string,
    enviadaPor: f.enviada_por as string,
    relatoId: (f.relato_id as number | null) ?? null,
  }));
}

/**
 * As fotos que vieram com um relato, na ordem da memória: as que já são da memória e, com o relato em
 * rascunho, as que esperam a publicação. As removidas ficam de fora.
 */
export async function listarFotosDoRelato(relatoId: number): Promise<Foto[]> {
  const { results } = await db()
    .prepare('SELECT * FROM fotos WHERE relato_id = ? AND removida_em IS NULL ORDER BY memoria_id IS NULL, ordem, id')
    .bind(relatoId)
    .all<Record<string, unknown>>();
  return results.map((f: Record<string, unknown>) => ({
    id: f.id as number,
    chave: f.chave as string,
    legenda: f.legenda as string | null,
    principal: Boolean(f.principal),
    enviadaPor: f.enviada_por as string,
    relatoId,
  }));
}

/**
 * Fotos pelo relato (docs/decisoes.md): prende ao relato as fotos da lista e, com o relato publicado, à
 * memória dele. Só entram as fotos soltas que a própria pessoa enviou e as que já eram deste relato:
 * ninguém prende foto de outra pessoa, nem foto que já é de outra memória ou de outro relato. Quem chama
 * já conferiu que a pessoa vê a memória e pode escrever o relato. As que chegam à memória vão para o
 * fim da ordem, sem mexer na principal; se a memória não tiver nenhuma, a primeira vira a principal.
 * As fotos do relato que saíram da lista vão para a lixeira da memória, e só as que a pessoa enviou.
 * Devolve quantas fotos ficaram no relato.
 */
export async function ligarFotosDoRelato(
  relato: { id: number; memoriaId: string; situacao: 'rascunho' | 'publicada' },
  itens: { id: number; legenda?: string }[],
  usuario: Usuario,
): Promise<number> {
  const ids = itens.map((i) => i.id);
  const { results } = await db()
    .prepare(
      `SELECT id, memoria_id FROM fotos WHERE removida_em IS NULL AND enviada_por = ?
       AND (relato_id = ? OR (relato_id IS NULL AND memoria_id IS NULL))
       AND (memoria_id IS NULL OR memoria_id = ?)
       AND id IN (SELECT value FROM json_each(?))`,
    )
    .bind(usuario.pessoa, relato.id, relato.memoriaId, JSON.stringify(ids))
    .all<{ id: number; memoria_id: string | null }>();
  const naMemoria = new Map(results.map((r: { id: number; memoria_id: string | null }) => [r.id, r.memoria_id]));
  const validos = itens.filter((i, n) => naMemoria.has(i.id) && ids.indexOf(i.id) === n);

  const ultima = await db()
    .prepare('SELECT MAX(ordem) AS ordem, MAX(principal) AS principal FROM fotos WHERE memoria_id = ? AND removida_em IS NULL')
    .bind(relato.memoriaId)
    .first<{ ordem: number | null; principal: number | null }>();
  let ordem = (ultima?.ordem ?? -1) + 1;
  let semPrincipal = !ultima?.principal;
  const publicado = relato.situacao === 'publicada';

  await db().batch([
    db()
      .prepare(
        `UPDATE fotos SET removida_em = datetime('now'), removida_por = ?2 WHERE relato_id = ?1 AND removida_em IS NULL AND enviada_por = ?2
         AND id NOT IN (SELECT value FROM json_each(?3))`,
      )
      .bind(relato.id, usuario.pessoa, JSON.stringify(validos.map((i) => i.id))),
    ...validos.map((item) => {
      const legenda = item.legenda?.trim() || null;
      // Já é da memória: muda só a legenda, sem sair do lugar
      if (naMemoria.get(item.id)) return db().prepare('UPDATE fotos SET legenda = ? WHERE id = ?').bind(legenda, item.id);
      // Relato em rascunho: a foto espera, presa a ele, e só quem enviou a vê
      if (!publicado) return db().prepare('UPDATE fotos SET relato_id = ?, legenda = ? WHERE id = ?').bind(relato.id, legenda, item.id);
      const principal = semPrincipal ? 1 : 0;
      semPrincipal = false;
      return db()
        .prepare('UPDATE fotos SET relato_id = ?, memoria_id = ?, legenda = ?, ordem = ?, principal = ? WHERE id = ?')
        .bind(relato.id, relato.memoriaId, legenda, ordem++, principal, item.id);
    }),
  ]);
  return validos.length;
}

/**
 * O usuário pode ver o arquivo desta chave? Foto solta: só quem enviou. Foto de memória: quem vê a memória.
 * Foto removida: só quem enviou. A foto que veio com um relato segue o relato (veORelato), como o áudio: a do
 * relato em nome de quem a pessoa não vê também fica de fora.
 */
export async function podeVerFoto(usuario: Usuario, chave: string): Promise<boolean> {
  const { results } = await db()
    .prepare(
      `SELECT r.por, r.registrado_por, r.so_para_nucleos FROM fotos f LEFT JOIN relatos r ON r.id = f.relato_id WHERE f.chave = ?2 AND (
         (f.memoria_id IS NULL AND f.enviada_por = ?1 AND f.removida_em IS NULL)
         -- foto sem memória há mais de 30 dias: os administradores conferem antes de apagar (onda 2)
         OR (?3 = 1 AND ${FOTO_SOLTA})
         OR (
           -- foto removida: só quem enviou e quem removeu ainda veem, para poder devolvê-la à memória
           (f.removida_em IS NULL OR f.enviada_por = ?1 OR f.removida_por = ?1)
           AND EXISTS (SELECT 1 FROM memorias m WHERE m.id = f.memoria_id AND ${FILTRO_VISIVEL})
           -- a foto que veio com um relato que espera o sim do autor fica com o público antigo dele
           AND NOT EXISTS (
             SELECT 1 FROM relatos r WHERE r.id = f.relato_id AND r.so_para_nucleos IS NOT NULL AND r.registrado_por <> ?1
               AND NOT EXISTS (
                 SELECT 1 FROM json_each(r.so_para_nucleos) j JOIN nucleo_membros nm ON nm.nucleo_id = j.value
                 WHERE nm.integrante_id = ?1 AND nm.papel = 'membro'
               )
           )
         )
       )`,
    )
    .bind(usuario.pessoa, chave, usuario.admin ? 1 : 0)
    .all<{ por: string | null; registrado_por: string | null; so_para_nucleos: string | null }>();
  type Linha = { por: string | null; registrado_por: string | null; so_para_nucleos: string | null };
  const linhas = results as Linha[];
  if (linhas.length === 0) return false;
  // A foto sem relato não depende de quem contou
  if (linhas.some((r) => r.por === null)) return true;
  const naoVe = await pessoasQueONaoVe(usuario);
  return linhas.some((r) => veORelato({ por: r.por!, registradoPor: r.registrado_por!, soParaNucleos: lerNucleosDoRelato(r.so_para_nucleos) }, usuario, naoVe));
}

// --- Fotos sem memória (onda 2, decisão do Gui de 17/11/2026) ---

/** Os dias que uma foto fica sem memória antes de entrar na lista dos administradores. */
export const DIAS_DA_FOTO_SOLTA = 30;

/**
 * A foto que ficou sem memória: enviada num formulário abandonado, ou solta por "Apagar de vez". Nem
 * de memória nem de relato, há mais de 30 dias. As fotos de exemplo (que as prévias dividem) nunca.
 */
const FOTO_SOLTA = `(f.memoria_id IS NULL AND f.relato_id IS NULL AND f.chave <> '' AND f.chave NOT LIKE 'exemplos/%'
  AND f.enviada_em < datetime('now', '-${DIAS_DA_FOTO_SOLTA} days'))`;

export interface FotoSolta {
  id: number;
  chave: string;
  enviadaPor: string;
  enviadaEm: string;
  tamanho: number | null;
}

export async function listarFotosSoltas(): Promise<FotoSolta[]> {
  const { results } = await db()
    .prepare(`SELECT f.id, f.chave, f.enviada_por, f.enviada_em, f.tamanho FROM fotos f WHERE ${FOTO_SOLTA} ORDER BY f.enviada_em, f.id`)
    .all<Record<string, unknown>>();
  return results.map((r: Record<string, unknown>) => ({ id: r.id as number, chave: r.chave as string, enviadaPor: r.enviada_por as string, enviadaEm: r.enviada_em as string, tamanho: (r.tamanho as number | null) ?? null }));
}

export async function contarFotosSoltas(): Promise<number> {
  const linha = await db().prepare(`SELECT COUNT(*) AS n FROM fotos f WHERE ${FOTO_SOLTA}`).first<{ n: number }>();
  return linha?.n ?? 0;
}

/** A foto solta deste id, conferida de novo no banco antes de apagar, ou nada. */
export async function obterFotoSolta(id: number): Promise<FotoSolta | undefined> {
  return (await listarFotosSoltas()).find((f) => f.id === id);
}

/** Tira o registro da foto solta, depois que o arquivo saiu do bucket. Só se ela continua solta. */
export async function esquecerFotoSolta(id: number): Promise<boolean> {
  const r = await db().prepare(`DELETE FROM fotos WHERE id = ? AND id IN (SELECT f.id FROM fotos f WHERE ${FOTO_SOLTA})`).bind(id).run();
  return (r.meta.changes ?? 0) > 0;
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
    soParaNucleos: lerNucleosDoRelato(r.so_para_nucleos),
  };
}

/**
 * Relatos de uma memória já conferida: os publicados, mais os rascunhos de quem pede. O de quem a pessoa
 * não vê fica de fora (ver veORelato).
 */
export async function listarRelatos(usuario: Usuario, memoriaId: string): Promise<Relato[]> {
  const [{ results }, naoVe] = await Promise.all([
    db()
      .prepare(`SELECT * FROM relatos WHERE memoria_id = ?2 AND (situacao = 'publicada' OR registrado_por = ?1) ORDER BY criado_em, id`)
      .bind(usuario.pessoa, memoriaId)
      .all<Record<string, unknown>>(),
    pessoasQueONaoVe(usuario),
  ]);
  return results.map(lerRelato).filter((r: Relato) => veORelato(r, usuario, naoVe));
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

// --- Sua conta ---

/** Os relatos que a pessoa registrou (os dela e os que escreveu por outra pessoa), em memórias que ela vê. */
export async function listarRelatosRegistradosPor(usuario: Usuario): Promise<(Relato & { titulo: string })[]> {
  const { results } = await db()
    .prepare(
      `SELECT r.*, m.titulo FROM relatos r JOIN memorias m ON m.id = r.memoria_id
       WHERE r.registrado_por = ?1 AND ${FILTRO_VISIVEL} ORDER BY r.atualizado_em DESC`,
    )
    .bind(usuario.pessoa)
    .all<Record<string, unknown>>();
  return results.map((r: Record<string, unknown>) => ({ ...lerRelato(r), titulo: r.titulo as string }));
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
  // O relato como conversa: só acrescentar mensagens no fim (voltar e contar mais) não guarda versão.
  // A versão leva junto as mensagens de antes, quando há (src/lib/conversa.ts)
  versao: { guardar: boolean; mensagens?: Mensagem[] } = { guardar: true },
): Promise<void> {
  // A data de publicação é a da primeira vez que o relato sai do rascunho, e não muda depois
  const marcar = `UPDATE relatos SET publicado_em = datetime('now') WHERE situacao = 'publicada' AND publicado_em IS NULL`;
  if (!anterior) {
    await db().batch([
      db()
        .prepare('INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, ?, ?, ?)')
        .bind(memoriaId, por, usuario.pessoa, texto, situacao),
      db().prepare(`${marcar} AND memoria_id = ? AND por = ? AND registrado_por = ?`).bind(memoriaId, por, usuario.pessoa),
    ]);
    return;
  }
  await db().batch([
    ...(versao.guardar
      ? [db().prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('relato', ?, ?, ?)`).bind(String(anterior.id), JSON.stringify(versao.mensagens ? { ...anterior, mensagens: versao.mensagens } : anterior), usuario.pessoa)]
      : []),
    db().prepare(`UPDATE relatos SET texto = ?, situacao = ?, atualizado_em = datetime('now') WHERE id = ?`).bind(texto, situacao, anterior.id),
    db().prepare(`${marcar} AND id = ?`).bind(anterior.id),
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
      // Sem nenhum áudio que fica, a lista some: "id NOT IN (NULL)" nunca é verdadeiro e o último áudio não saía
      .prepare(`UPDATE audios SET removido_em = datetime('now') WHERE relato_id = ? AND removido_em IS NULL${validos.length ? ` AND id NOT IN (${validos.map(() => '?').join(', ')})` : ''}`)
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
  // O áudio do relato de quem a pessoa não vê também fica de fora (ver veORelato)
  const { results } = await db()
    .prepare(
      `SELECT r.por, r.registrado_por, r.so_para_nucleos FROM audios a LEFT JOIN relatos r ON r.id = a.relato_id WHERE a.chave = ?2 AND (
         (a.relato_id IS NULL AND a.enviado_por = ?1)
         OR (
           (a.removido_em IS NULL OR a.enviado_por = ?1)
           AND EXISTS (
             SELECT 1 FROM relatos r2 JOIN memorias m ON m.id = r2.memoria_id
             WHERE r2.id = a.relato_id AND (r2.situacao = 'publicada' OR r2.registrado_por = ?1) AND ${FILTRO_VISIVEL}
           )
         )
       )`,
    )
    .bind(usuario.pessoa, chave)
    .all<{ por: string | null; registrado_por: string | null; so_para_nucleos: string | null }>();
  if (results.length === 0) return false;
  // O áudio solto não tem relato
  type Linha = { por: string | null; registrado_por: string | null; so_para_nucleos: string | null };
  if ((results as Linha[]).some((r) => r.por === null)) return true;
  const naoVe = await pessoasQueONaoVe(usuario);
  return (results as Linha[]).some((r) => veORelato({ por: r.por!, registradoPor: r.registrado_por!, soParaNucleos: lerNucleosDoRelato(r.so_para_nucleos) }, usuario, naoVe));
}

/** Os áudios em que uma pessoa fala (os dos relatos dela), entre as memórias que quem pede vê. */
export async function listarAudiosDe(usuario: Usuario, pessoaId: string): Promise<(Audio & { memoriaTitulo: string; memoriaId: string })[]> {
  const { results } = await db()
    .prepare(
      `SELECT a.*, m.id AS memoria, m.titulo AS memoria_titulo, r.por AS relato_por, r.registrado_por AS relato_registrado_por, r.so_para_nucleos AS relato_so FROM audios a
       JOIN relatos r ON r.id = a.relato_id
       JOIN memorias m ON m.id = r.memoria_id
       WHERE a.removido_em IS NULL AND r.por = ?2 AND r.situacao = 'publicada' AND m.situacao = 'publicada' AND ${FILTRO_VISIVEL}
       ORDER BY m.ano, m.mes, m.dia, a.ordem, a.id`,
    )
    .bind(usuario.pessoa, pessoaId)
    .all<Record<string, unknown>>();
  // "A voz de Fulano" também deixa de fora o relato de quem a pessoa não vê (ver veORelato)
  const naoVe = await pessoasQueONaoVe(usuario);
  return results
    .filter((r: Record<string, unknown>) => veORelato({ por: r.relato_por as string, registradoPor: r.relato_registrado_por as string, soParaNucleos: lerNucleosDoRelato(r.relato_so) }, usuario, naoVe))
    .map((r: Record<string, unknown>) => ({ ...lerAudio(r), memoriaId: r.memoria as string, memoriaTitulo: r.memoria_titulo as string }));
}

/**
 * Os relatos que a pessoa contou (publicados, em memórias publicadas que quem olha vê), com o título e
 * o ano da memória. Passa pela mesma regra de "A voz de Fulano" (veORelato). Conceito da página da
 * pessoa, sessão L.
 */
export async function listarRelatosDe(usuario: Usuario, pessoaId: string): Promise<(Relato & { memoriaTitulo: string; memoriaAno: number })[]> {
  const { results } = await db()
    .prepare(
      `SELECT r.*, m.titulo AS memoria_titulo, m.ano AS memoria_ano FROM relatos r
       JOIN memorias m ON m.id = r.memoria_id
       WHERE r.por = ?2 AND r.situacao = 'publicada' AND m.situacao = 'publicada' AND ${FILTRO_VISIVEL}
       ORDER BY m.ano DESC, m.mes DESC, m.dia DESC`,
    )
    .bind(usuario.pessoa, pessoaId)
    .all<Record<string, unknown>>();
  const naoVe = await pessoasQueONaoVe(usuario);
  return results
    .map((r: Record<string, unknown>) => ({ ...lerRelato(r), memoriaTitulo: r.memoria_titulo as string, memoriaAno: r.memoria_ano as number }))
    .filter((r: Relato) => veORelato(r, usuario, naoVe));
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

// --- Painel pessoal (migração 020) ---

/** Relatos publicados depois de `desde`, em memórias que a pessoa vê. */
export async function listarRelatosPublicadosDesde(usuario: Usuario, desde: string): Promise<(Relato & { publicadoEm: string })[]> {
  const { results } = await db()
    .prepare(
      `SELECT r.*, COALESCE(r.publicado_em, r.criado_em) AS publicado FROM relatos r JOIN memorias m ON m.id = r.memoria_id
       WHERE r.situacao = 'publicada' AND COALESCE(r.publicado_em, r.criado_em) > ?2 AND m.situacao = 'publicada' AND ${FILTRO_VISIVEL}
       ORDER BY publicado DESC LIMIT 50`,
    )
    .bind(usuario.pessoa, desde)
    .all<Record<string, unknown>>();
  // Nas novidades também não entra o relato de quem a pessoa não vê (ver veORelato)
  const naoVe = await pessoasQueONaoVe(usuario);
  return results.map((r: Record<string, unknown>) => ({ ...lerRelato(r), publicadoEm: r.publicado as string })).filter((r: Relato) => veORelato(r, usuario, naoVe));
}

/** As memórias em que a pessoa já contou algo, publicado ou em rascunho. */
export async function memoriasComRelatoDe(pessoa: string): Promise<Set<string>> {
  const { results } = await db().prepare('SELECT DISTINCT memoria_id FROM relatos WHERE por = ?').bind(pessoa).all<{ memoria_id: string }>();
  return new Set(results.map((r: { memoria_id: string }) => r.memoria_id));
}

export async function obterVisitas(pessoa: string): Promise<RegistroDeVisitas | undefined> {
  const r = await db().prepare('SELECT * FROM visitas WHERE pessoa = ?').bind(pessoa).first<Record<string, string | null>>();
  if (!r) return undefined;
  return { primeira: r.primeira_em!, visita: r.visita_em!, ultima: r.ultima_em!, anterior: r.anterior_em, carta: r.carta_em };
}

export async function salvarVisitas(pessoa: string, v: RegistroDeVisitas): Promise<void> {
  await db()
    .prepare(
      `INSERT INTO visitas (pessoa, primeira_em, visita_em, ultima_em, anterior_em, carta_em) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT (pessoa) DO UPDATE SET primeira_em = ?2, visita_em = ?3, ultima_em = ?4, anterior_em = ?5, carta_em = ?6`,
    )
    .bind(pessoa, v.primeira, v.visita, v.ultima, v.anterior, v.carta)
    .run();
}

/** Volta a pessoa à primeira visita. Só para conferir a carta na homologação e nas prévias. */
export async function esquecerVisitas(pessoa: string): Promise<void> {
  await db().prepare('DELETE FROM visitas WHERE pessoa = ?').bind(pessoa).run();
}

export interface Carta {
  texto: string;
  assinatura: string;
  escritaPor: string;
  escritaEm: string;
}

/** A carta de Natal: a versão mais recente. */
export async function obterCarta(): Promise<Carta | undefined> {
  const r = await db().prepare('SELECT * FROM cartas ORDER BY id DESC LIMIT 1').first<Record<string, string>>();
  return r ? { texto: r.texto!, assinatura: r.assinatura!, escritaPor: r.escrita_por!, escritaEm: r.escrita_em! } : undefined;
}

// --- Cópia mensal (migração 060; regras em src/lib/conta.ts, copiaAtrasada) ---

/** O script do Drive baixou a cópia com o token de serviço: anota o momento. */
export async function anotarCopiaMensal(): Promise<void> {
  await db().prepare('INSERT INTO copias_mensais DEFAULT VALUES').run();
}

/** Quando o script do Drive baixou a cópia pela última vez ("AAAA-MM-DD HH:MM:SS", em UTC), ou null se nunca. */
export async function ultimaCopiaMensal(): Promise<string | null> {
  const r = await db().prepare('SELECT feita_em FROM copias_mensais ORDER BY id DESC LIMIT 1').first<{ feita_em: string }>();
  return r?.feita_em ?? null;
}

/** Cada versão salva da carta é uma linha nova: a anterior fica guardada. */
export async function salvarCarta(texto: string, assinatura: string, usuario: Usuario): Promise<void> {
  await db().prepare('INSERT INTO cartas (texto, assinatura, escrita_por) VALUES (?, ?, ?)').bind(texto, assinatura, usuario.pessoa).run();
}

// --- Avisos (migração 024; regras em src/lib/avisos.ts) ---

/** Anota o primeiro acesso da pessoa: os avisos dela só contam a partir dele. */
export async function registrarAcesso(pessoa: string): Promise<void> {
  await db().prepare('INSERT OR IGNORE INTO acessos (pessoa) VALUES (?)').bind(pessoa).run();
}

export async function quemJaEntrou(): Promise<Set<string>> {
  const { results } = await db().prepare('SELECT pessoa FROM acessos').all<{ pessoa: string }>();
  return new Set(results.map((r: { pessoa: string }) => r.pessoa));
}

export interface Aviso {
  id: number;
  tipo: TipoDeAviso;
  memoriaId: string;
  titulo: string;
  relato: { id: number; por: string; registradoPor: string; situacao: 'rascunho' | 'publicada' } | null;
  de: string;
  dados: Record<string, unknown>;
  criadoEm: string;
  resolvidoEm: string | null;
  resposta: string | null;
}

export interface AvisoNovo {
  para: string;
  tipo: TipoDeAviso;
  memoriaId: string;
  relatoId?: number | null;
  de: string;
  dados?: Record<string, unknown>;
}

export async function criarAvisos(avisos: AvisoNovo[]): Promise<void> {
  if (avisos.length === 0) return;
  await db().batch(
    avisos.map((a) =>
      db()
        .prepare('INSERT INTO avisos (para, tipo, memoria_id, relato_id, de, dados) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(a.para, a.tipo, a.memoriaId, a.relatoId ?? null, a.de, a.dados ? JSON.stringify(a.dados) : null),
    ),
  );
}

/**
 * Os avisos da pessoa, do mais novo para o mais antigo: os que estão na lista (pendentes) e, com
 * `historico`, também os que já saíram. Só entra o que ela vê agora: a memória publicada, fora da
 * lixeira, e o relato, quando o aviso é de um (ver veORelato). O que ela deixou de ver some daqui.
 */
export async function listarAvisos(usuario: Usuario, { historico = false }: { historico?: boolean } = {}): Promise<Aviso[]> {
  const { results } = await db()
    .prepare(
      `SELECT a.*, m.titulo, r.por AS relato_por, r.registrado_por AS relato_registrado_por, r.situacao AS relato_situacao, r.so_para_nucleos AS relato_so
       FROM avisos a JOIN memorias m ON m.id = a.memoria_id
       LEFT JOIN relatos r ON r.id = a.relato_id
       WHERE a.para = ?1 AND m.situacao = 'publicada' AND ${FILTRO_VISIVEL} ${historico ? '' : 'AND a.resolvido_em IS NULL'}
       ORDER BY a.id DESC LIMIT 60`,
    )
    .bind(usuario.pessoa)
    .all<Record<string, unknown>>();
  if (results.length === 0) return [];
  const naoVe = await pessoasQueONaoVe(usuario);
  const avisos: Aviso[] = [];
  for (const a of results as Record<string, unknown>[]) {
    let relato: Aviso['relato'] = null;
    if (a.relato_id !== null && a.relato_id !== undefined) {
      // O relato saiu (ou nunca chegou a quem recebe): o aviso some com ele
      if (!a.relato_por) continue;
      relato = { id: a.relato_id as number, por: a.relato_por as string, registradoPor: a.relato_registrado_por as string, situacao: a.relato_situacao as 'rascunho' | 'publicada' };
      const meu = relato.registradoPor === usuario.pessoa;
      if (!meu && relato.situacao !== 'publicada') continue;
      if (!veORelato({ ...relato, soParaNucleos: lerNucleosDoRelato(a.relato_so) }, usuario, naoVe)) continue;
    }
    // Quem fez a ação também precisa ser alguém que a pessoa vê
    if (naoVe.has(a.de as string)) continue;
    avisos.push({
      id: a.id as number,
      tipo: a.tipo as TipoDeAviso,
      memoriaId: a.memoria_id as string,
      titulo: a.titulo as string,
      relato,
      de: a.de as string,
      dados: a.dados ? (JSON.parse(a.dados as string) as Record<string, unknown>) : {},
      criadoEm: a.criado_em as string,
      resolvidoEm: (a.resolvido_em as string | null) ?? null,
      resposta: (a.resposta as string | null) ?? null,
    });
  }
  return avisos;
}

/** Quantos avisos estão na lista: o número do retrato. Barato quando não há nenhum. */
export async function contarAvisosPendentes(usuario: Usuario): Promise<number> {
  const algum = await db().prepare('SELECT 1 AS ok FROM avisos WHERE para = ? AND resolvido_em IS NULL LIMIT 1').bind(usuario.pessoa).first();
  if (!algum) return 0;
  return (await listarAvisos(usuario)).length;
}

/** A pessoa abriu a memória: saem da lista os avisos dela que apontam para ali, menos o pedido para liberar. */
export async function abrirAvisosDaMemoria(usuario: Usuario, memoriaId: string): Promise<void> {
  await db()
    .prepare(`UPDATE avisos SET resolvido_em = datetime('now') WHERE para = ? AND memoria_id = ? AND resolvido_em IS NULL AND tipo NOT IN ('liberar-relato', 'sugestao')`)
    .bind(usuario.pessoa, memoriaId)
    .run();
}

// --- Ampliar quem vê uma memória com relatos (migração 025; regras em permissoes.ts) ---

/**
 * Quem criou a memória ampliou quem vê: cada relato que já existia (publicado ou em rascunho) e ainda
 * acompanhava a memória passa a ficar só para o público antigo, até quem o registrou concordar. O
 * relato de quem ampliou não espera: foi ela mesma que abriu. Devolve os relatos que passaram a esperar.
 */
export async function guardarRelatosParaOPublicoAntigo(memoriaId: string, nucleosAntigos: readonly string[], quemAmpliou: string): Promise<Relato[]> {
  const { results } = await db()
    .prepare('SELECT * FROM relatos WHERE memoria_id = ? AND registrado_por <> ? AND so_para_nucleos IS NULL')
    .bind(memoriaId, quemAmpliou)
    .all<Record<string, unknown>>();
  const relatos = results.map(lerRelato);
  if (relatos.length === 0) return [];
  await db().batch(relatos.map((r) => db().prepare('UPDATE relatos SET so_para_nucleos = ? WHERE id = ?').bind(JSON.stringify([...nucleosAntigos]), r.id)));
  return relatos.map((r) => ({ ...r, soParaNucleos: [...nucleosAntigos] }));
}

/**
 * Restringir não pede nada: quando o público da memória volta a caber no público antigo de um relato,
 * a espera dele perde o sentido. O relato volta a acompanhar a memória, e o pedido sai da lista.
 */
export async function soltarEsperasSemSentido(memoriaId: string, dentroDoPublico: (soParaNucleos: string[]) => boolean): Promise<void> {
  const { results } = await db().prepare('SELECT * FROM relatos WHERE memoria_id = ? AND so_para_nucleos IS NOT NULL').bind(memoriaId).all<Record<string, unknown>>();
  const soltos = results.map(lerRelato).filter((r) => dentroDoPublico(r.soParaNucleos!));
  if (soltos.length === 0) return;
  await db().batch(
    soltos.flatMap((r) => [
      db().prepare('UPDATE relatos SET so_para_nucleos = NULL WHERE id = ?').bind(r.id),
      db().prepare(`UPDATE avisos SET resolvido_em = datetime('now') WHERE relato_id = ? AND tipo = 'liberar-relato' AND resolvido_em IS NULL`).bind(r.id),
    ]),
  );
}

/** O relato por id, sem conferir quem vê: quem chama confere (podeLiberarRelato). */
export async function obterRelatoPorId(id: number): Promise<Relato | undefined> {
  const linha = await db().prepare('SELECT * FROM relatos WHERE id = ?').bind(id).first<Record<string, unknown>>();
  return linha ? lerRelato(linha) : undefined;
}

export async function obterAviso(id: number, usuario: Usuario): Promise<{ id: number; tipo: TipoDeAviso; relatoId: number | null; memoriaId: string } | undefined> {
  const a = await db().prepare('SELECT id, tipo, relato_id, memoria_id FROM avisos WHERE id = ? AND para = ?').bind(id, usuario.pessoa).first<Record<string, unknown>>();
  return a ? { id: a.id as number, tipo: a.tipo as TipoDeAviso, relatoId: (a.relato_id as number | null) ?? null, memoriaId: a.memoria_id as string } : undefined;
}

/**
 * A resposta de quem registrou o relato. "liberar": o relato volta a acompanhar a memória. "manter": ele
 * continua só para quem via antes, e a linha no próprio relato deixa liberar depois. Os dois tiram o
 * pedido da lista, com a resposta no histórico.
 */
export async function responderPedidoDoRelato(relatoId: number, resposta: 'liberar' | 'manter'): Promise<void> {
  await db().batch([
    ...(resposta === 'liberar' ? [db().prepare('UPDATE relatos SET so_para_nucleos = NULL WHERE id = ?').bind(relatoId)] : []),
    db().prepare(`UPDATE avisos SET resolvido_em = datetime('now'), resposta = ? WHERE relato_id = ? AND tipo = 'liberar-relato' AND resolvido_em IS NULL`).bind(resposta, relatoId),
  ]);
}

// --- Memória com alguém que só você vê (documento de estrutura; decisão do Gui de 17/11/2026) ---

/**
 * As pessoas que só a pessoa logada vê: as dos laços do coração "só eu vejo" dela que não têm nenhum
 * laço que a família toda vê (filiação, casal aberto, laço do coração aberto). Para os outros, essas
 * pessoas nem existem (pessoasQueNaoVe); publicar uma memória com elas as revelaria por tabela.
 */
export async function pessoasQueSoVoceVe(usuario: Usuario): Promise<Set<string>> {
  const { results: meus } = await db().prepare('SELECT pessoa_id FROM lacos_coracao WHERE dono_id = ? AND privado = 1').bind(usuario.pessoa).all<{ pessoa_id: string }>();
  if (meus.length === 0) return new Set();
  const [filiacoes, casais, abertos] = await Promise.all([
    listarFiliacoes(),
    db().prepare(`SELECT a_id, b_id FROM casais WHERE visibilidade = 'todos'`).all<{ a_id: string; b_id: string }>(),
    db().prepare('SELECT dono_id, pessoa_id FROM lacos_coracao WHERE privado = 0').all<{ dono_id: string; pessoa_id: string }>(),
  ]);
  const comLacoAberto = new Set([
    ...filiacoes.flatMap((f) => [f.filho, f.responsavel]),
    ...casais.results.flatMap((c: { a_id: string; b_id: string }) => [c.a_id, c.b_id]),
    ...abertos.results.flatMap((l: { dono_id: string; pessoa_id: string }) => [l.dono_id, l.pessoa_id]),
  ]);
  comLacoAberto.delete(usuario.pessoa);
  return pessoasQueNaoVe(new Set(meus.map((m: { pessoa_id: string }) => m.pessoa_id)), comLacoAberto);
}

/**
 * "Abrir para todos": os laços "só eu vejo" da pessoa logada com estas pessoas passam a ser vistos pela
 * família toda, com a versão de antes no histórico. A proximidade continua só do dono.
 */
export async function abrirLacosPrivados(usuario: Usuario, pessoas: string[]): Promise<void> {
  if (pessoas.length === 0) return;
  const lista = JSON.stringify(pessoas);
  await db().batch([
    db()
      .prepare(
        `INSERT INTO versoes (tipo, item_id, dados, autor) SELECT 'laco-coracao', CAST(id AS TEXT), json_object('dono', dono_id, 'pessoa', pessoa_id, 'nome', nome, 'papel', papel, 'proximidade', proximidade, 'privado', privado), ?1
         FROM lacos_coracao WHERE dono_id = ?1 AND privado = 1 AND pessoa_id IN (SELECT value FROM json_each(?2))`,
      )
      .bind(usuario.pessoa, lista),
    db().prepare('UPDATE lacos_coracao SET privado = 0 WHERE dono_id = ?1 AND privado = 1 AND pessoa_id IN (SELECT value FROM json_each(?2))').bind(usuario.pessoa, lista),
  ]);
}

// --- Acrescentar fotos (resposta do Gui ao PR #51, 17/11/2026) ---

/**
 * "Acrescentar fotos", na página da memória: quem vê a memória manda fotos sem escrever relato. Só entram
 * fotos soltas que a própria pessoa enviou (nem de outra pessoa, nem de outra memória, nem presas a um
 * relato). Vão para o fim da ordem, sem trocar a principal; numa memória sem nenhuma, a primeira vira a
 * principal, como no relato. Quem chama já conferiu que a pessoa vê a memória publicada. Não cria versão
 * no histórico, como as fotos do relato. Devolve quantas entraram.
 */
export async function acrescentarFotos(memoriaId: string, itens: { id: number; legenda?: string }[], usuario: Usuario): Promise<number> {
  const ids = itens.map((i) => i.id);
  const { results } = await db()
    .prepare(
      `SELECT id FROM fotos WHERE removida_em IS NULL AND enviada_por = ? AND memoria_id IS NULL AND relato_id IS NULL
       AND id IN (SELECT value FROM json_each(?))`,
    )
    .bind(usuario.pessoa, JSON.stringify(ids))
    .all<{ id: number }>();
  const soltas = new Set(results.map((r: { id: number }) => r.id));
  const validos = itens.filter((i, n) => soltas.has(i.id) && ids.indexOf(i.id) === n);
  if (validos.length === 0) return 0;
  const ultima = await db()
    .prepare('SELECT MAX(ordem) AS ordem, MAX(principal) AS principal FROM fotos WHERE memoria_id = ? AND removida_em IS NULL')
    .bind(memoriaId)
    .first<{ ordem: number | null; principal: number | null }>();
  let ordem = (ultima?.ordem ?? -1) + 1;
  let semPrincipal = !ultima?.principal;
  await db().batch(
    validos.map((item) => {
      const principal = semPrincipal ? 1 : 0;
      semPrincipal = false;
      return db()
        .prepare('UPDATE fotos SET memoria_id = ?, legenda = ?, ordem = ?, principal = ? WHERE id = ?')
        .bind(memoriaId, item.legenda?.trim() || null, ordem++, principal, item.id);
    }),
  );
  return validos.length;
}

// --- O círculo: a proximidade de cada pessoa para o dono (migração 030) -------------------------

export interface Proximidade {
  valor: number;
  /** o lugar na volta, em graus, de quem foi arrastado; vazio, o site espalha */
  angulo: number | null;
}

// --- "Como você chama", só seu (migração 090; regras em src/lib/apelidos.ts) ---

/** Os apelidos que uma pessoa deu. Só o dono lê os dele: ninguém mais vê. */
export async function listarMeusApelidos(dono: string): Promise<Map<string, string>> {
  const { results } = await db().prepare('SELECT pessoa_id, apelido FROM apelidos_meus WHERE dono_id = ?').bind(dono).all<{ pessoa_id: string; apelido: string }>();
  return new Map(results.map((r: { pessoa_id: string; apelido: string }) => [r.pessoa_id, r.apelido]));
}

/** Guarda o apelido que o dono dá à pessoa; sem apelido, apaga, e vale o da família. */
export async function guardarMeuApelido(dono: string, pessoa: string, apelido: string | null): Promise<void> {
  if (!apelido) {
    await db().prepare('DELETE FROM apelidos_meus WHERE dono_id = ? AND pessoa_id = ?').bind(dono, pessoa).run();
    return;
  }
  await db()
    .prepare(`INSERT INTO apelidos_meus (dono_id, pessoa_id, apelido) VALUES (?, ?, ?) ON CONFLICT (dono_id, pessoa_id) DO UPDATE SET apelido = excluded.apelido, mudado_em = datetime('now')`)
    .bind(dono, pessoa, apelido)
    .run();
}

/** As proximidades que uma pessoa declarou. Só o dono lê as dele: ninguém mais vê o círculo nem o valor. */
export async function listarProximidades(dono: string): Promise<Map<string, Proximidade>> {
  const { results } = await db().prepare('SELECT pessoa_id, valor, angulo FROM proximidades WHERE dono_id = ?').bind(dono).all<{ pessoa_id: string; valor: number; angulo: number | null }>();
  return new Map(results.map((l) => [l.pessoa_id, { valor: l.valor, angulo: l.angulo }]));
}

/**
 * Guarda a proximidade de alguém para o dono. Se os dois têm um laço do coração, a faixa dele
 * acompanha (os três níveis de sempre), para a conta e o formulário do laço dizerem o mesmo. Fora do
 * círculo, o laço continua com a faixa que tinha.
 */
export async function salvarProximidade(dono: string, pessoa: string, valor: number, angulo: number | null, nivel: number | null): Promise<void> {
  const comandos = [
    db()
      .prepare(
        `INSERT INTO proximidades (dono_id, pessoa_id, valor, angulo) VALUES (?, ?, ?, ?)
         ON CONFLICT (dono_id, pessoa_id) DO UPDATE SET valor = excluded.valor, angulo = COALESCE(excluded.angulo, proximidades.angulo), mudado_em = datetime('now')`,
      )
      .bind(dono, pessoa, valor, angulo),
  ];
  if (nivel !== null) comandos.push(db().prepare('UPDATE lacos_coracao SET proximidade = ? WHERE dono_id = ? AND pessoa_id = ?').bind(nivel, dono, pessoa));
  await db().batch(comandos);
}

/** Apaga a proximidade declarada: a pessoa volta para a faixa que o parentesco ou o laço dão. */
export async function removerProximidade(dono: string, pessoa: string): Promise<void> {
  await db().prepare('DELETE FROM proximidades WHERE dono_id = ? AND pessoa_id = ?').bind(dono, pessoa).run();
}

// --- Ex-casal: como o ex aparece para mim (migração 071; regras em src/lib/ex-casal.ts) ---

/**
 * Como cada ex aparece para a pessoa logada: só as escolhas dela, e só de quem ainda é ex dela num casal
 * desfeito que ela vê. Ninguém mais lê estas linhas: não há rota de leitura.
 */
export async function comoOsExesAparecem(usuario: Usuario): Promise<Map<string, Exclude<ModoDoEx, 'presente'>>> {
  const { results } = await db().prepare('SELECT pessoa_id, modo FROM ex_para_mim WHERE dono_id = ?').bind(usuario.pessoa).all<{ pessoa_id: string; modo: ModoDoEx }>();
  if (results.length === 0) return new Map();
  const exes = exesDe(usuario.pessoa, await listarCasais(usuario));
  const valem = modosQueValem(new Map(results.map((r: { pessoa_id: string; modo: ModoDoEx }) => [r.pessoa_id, r.modo])), exes);
  // "Fora" de quem é pai ou mãe de alguém que a pessoa vê vale como "Discreto" (resposta do Gui à sessão F)
  if (![...valem.values()].includes('fora')) return valem;
  const ve = new Set((await listarIntegrantesQueVe(usuario)).map((i) => i.id));
  return foraQueEPaiViraDiscreto(valem, await listarFiliacoes(), (id) => ve.has(id) || id === usuario.pessoa);
}

/** Guarda como o ex aparece para quem escolheu. "Presente" apaga a escolha, e tudo volta a ser como era. */
export async function salvarComoOExAparece(usuario: Usuario, pessoa: string, modo: ModoDoEx): Promise<void> {
  if (modo === 'presente') {
    await db().prepare('DELETE FROM ex_para_mim WHERE dono_id = ? AND pessoa_id = ?').bind(usuario.pessoa, pessoa).run();
    return;
  }
  await db()
    .prepare(`INSERT INTO ex_para_mim (dono_id, pessoa_id, modo) VALUES (?, ?, ?) ON CONFLICT (dono_id, pessoa_id) DO UPDATE SET modo = excluded.modo, mudado_em = datetime('now')`)
    .bind(usuario.pessoa, pessoa, modo)
    .run();
}

// --- Ajustes do acervo, escolhidos pelos administradores (migração 073) ---

/** O valor de um ajuste, já lido do JSON, ou nada. */
export async function lerAjuste(chave: string): Promise<unknown> {
  const linha = await db().prepare('SELECT valor FROM ajustes WHERE chave = ?').bind(chave).first<{ valor: string }>();
  if (!linha) return undefined;
  try {
    return JSON.parse(linha.valor);
  } catch {
    return undefined;
  }
}

/** Guarda um ajuste. O valor de antes vai para o histórico, com quem mudou. */
export async function salvarAjuste(chave: string, valor: unknown, usuario: Usuario): Promise<void> {
  await db().batch([
    db().prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) SELECT 'ajuste', chave, valor, ? FROM ajustes WHERE chave = ?`).bind(usuario.pessoa, chave),
    db()
      .prepare(`INSERT INTO ajustes (chave, valor, mudado_por) VALUES (?, ?, ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, mudado_por = excluded.mudado_por, mudado_em = datetime('now')`)
      .bind(chave, JSON.stringify(valor), usuario.pessoa),
  ]);
}

/** Quem mudou o ajuste por último, e quando. */
export async function quemMudouOAjuste(chave: string): Promise<{ por: string | null; em: string } | undefined> {
  const linha = await db().prepare('SELECT mudado_por, mudado_em FROM ajustes WHERE chave = ?').bind(chave).first<{ mudado_por: string | null; mudado_em: string }>();
  return linha ? { por: linha.mudado_por, em: linha.mudado_em } : undefined;
}

// --- Histórico de pessoas e laços (onda 2; regras em src/lib/historico-da-pessoa.ts) ---

/** As versões da ficha de uma pessoa, da mais nova para a mais antiga. */
export async function listarVersoesDaFicha(id: string): Promise<Versao<Integrante>[]> {
  const { results } = await db()
    .prepare(`SELECT id, dados, autor, criada_em FROM versoes WHERE tipo = 'integrante' AND item_id = ? ORDER BY id DESC LIMIT 50`)
    .bind(id)
    .all<Record<string, unknown>>();
  return results.map((v: Record<string, unknown>) => ({ id: v.id as number, dados: JSON.parse(v.dados as string) as Integrante, autor: v.autor as string, criadaEm: v.criada_em as string }));
}

/**
 * As versões dos laços em que a pessoa está: filiações removidas, casais mudados ou removidos e laços
 * do coração mudados ou removidos. Sem filtro: quem mostra passa cada uma por veAVersaoDoLaco.
 */
export async function listarVersoesDosLacos(id: string): Promise<(Versao<unknown> & { tipo: 'filiacao' | 'casal' | 'laco-coracao' })[]> {
  const { results } = await db()
    .prepare(
      `SELECT id, tipo, dados, autor, criada_em FROM versoes WHERE
        (tipo = 'filiacao' AND (json_extract(dados, '$.filho') = ?1 OR json_extract(dados, '$.responsavel') = ?1))
        OR (tipo = 'casal' AND (json_extract(dados, '$.a') = ?1 OR json_extract(dados, '$.b') = ?1))
        OR (tipo = 'laco-coracao' AND (json_extract(dados, '$.dono') = ?1 OR json_extract(dados, '$.pessoa') = ?1))
       ORDER BY id DESC LIMIT 100`,
    )
    .bind(id)
    .all<Record<string, unknown>>();
  return results.map((v: Record<string, unknown>) => ({
    id: v.id as number,
    tipo: v.tipo as 'filiacao' | 'casal' | 'laco-coracao',
    dados: JSON.parse(v.dados as string) as unknown,
    autor: v.autor as string,
    criadaEm: v.criada_em as string,
  }));
}

/** Uma versão pelo id, com o tipo. */
export async function obterVersao(id: number): Promise<{ id: number; tipo: string; itemId: string; dados: unknown } | undefined> {
  const v = await db().prepare('SELECT id, tipo, item_id, dados FROM versoes WHERE id = ?').bind(id).first<{ id: number; tipo: string; item_id: string; dados: string }>();
  return v ? { id: v.id, tipo: v.tipo, itemId: v.item_id, dados: JSON.parse(v.dados) } : undefined;
}

/**
 * Restaura um laço do coração guardado: o dono volta com tudo; um administrador, só o nome e o lugar na
 * árvore (num laço que já existe) ou o laço como era, aberto (num laço removido). A versão de hoje vai
 * para o histórico.
 */
export async function restaurarLacoDoCoracao(dados: { dono: string; pessoa: string; nome: string; papel: Papel | null; proximidade?: number | null; privado: number | boolean }, usuario: Usuario): Promise<void> {
  const doDono = dados.dono === usuario.pessoa;
  await db().batch([
    db().prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) SELECT 'laco-coracao', CAST(id AS TEXT), json_object('dono', dono_id, 'pessoa', pessoa_id, 'nome', nome, 'papel', papel, 'proximidade', proximidade, 'privado', privado), ? FROM lacos_coracao WHERE dono_id = ? AND pessoa_id = ?`).bind(usuario.pessoa, dados.dono, dados.pessoa),
    doDono
      ? db()
          .prepare(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, papel, proximidade, privado) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (dono_id, pessoa_id) DO UPDATE SET nome = excluded.nome, papel = excluded.papel, proximidade = excluded.proximidade, privado = excluded.privado`)
          .bind(dados.dono, dados.pessoa, dados.nome, dados.papel, dados.proximidade ?? null, dados.privado ? 1 : 0)
      : db()
          .prepare(`INSERT INTO lacos_coracao (dono_id, pessoa_id, nome, papel, proximidade, privado) VALUES (?, ?, ?, ?, ?, 0) ON CONFLICT (dono_id, pessoa_id) DO UPDATE SET nome = excluded.nome, papel = excluded.papel`)
          .bind(dados.dono, dados.pessoa, dados.nome, dados.papel, dados.proximidade ?? null),
  ]);
}

// --- Juntar cadastros duplicados (onda 2; regras em src/lib/nomes-parecidos.ts e permissoes.ts) ---

/**
 * As memórias em que as duas fichas têm relato e que impedem juntar: um relato por pessoa em cada
 * memória. Quem administra resolve antes (um dos dois relatos sai), e junta depois.
 */
export async function conflitosAoJuntar(fica: string, sai: string): Promise<string[]> {
  const { results } = await db()
    .prepare(
      `SELECT DISTINCT m.titulo FROM relatos rs JOIN relatos rf ON rf.memoria_id = rs.memoria_id AND rf.por = ?1 JOIN memorias m ON m.id = rs.memoria_id
       WHERE rs.por = ?2 AND (rf.registrado_por = rs.registrado_por OR (rf.situacao = 'publicada' AND rs.situacao = 'publicada'))`,
    )
    .bind(fica, sai)
    .all<{ titulo: string }>();
  return results.map((r: { titulo: string }) => r.titulo);
}

/**
 * Junta duas fichas da mesma pessoa: a que fica recebe os campos escolhidos e tudo o que era da outra
 * (memórias, relatos, fotos, áudios, laços, famílias, capítulos, proximidades, avisos), e a que sai deixa
 * de existir. As duas fichas de antes ficam no histórico, a que saiu com a marca de para onde foi. Um
 * lote só: ou entra tudo, ou nada. Quem chama já conferiu a permissão e os conflitos.
 */
export async function juntarIntegrantes(fica: Integrante, sai: Integrante, ficha: DadosDoIntegrante, usuario: Usuario): Promise<void> {
  const [A, B] = [fica.id, sai.id];
  const c: D1PreparedStatement[] = [];
  const q = (sql: string, ...v: unknown[]) => c.push(db().prepare(sql).bind(...v));
  // O histórico: as duas fichas como eram
  q(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('integrante', ?, ?, ?)`, A, JSON.stringify(fica), usuario.pessoa);
  q(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('integrante', ?, ?, ?)`, B, JSON.stringify({ ...sai, juntadaEm: A }), usuario.pessoa);
  q(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('juntar', ?, ?, ?)`, A, JSON.stringify({ fica: A, sai: B, nomeDaQueSaiu: sai.nome }), usuario.pessoa);
  // Famílias: quem era membro numa das duas continua membro
  q(`INSERT OR IGNORE INTO nucleo_membros (nucleo_id, integrante_id, papel) SELECT nucleo_id, ?1, papel FROM nucleo_membros WHERE integrante_id = ?2`, A, B);
  q(`UPDATE nucleo_membros SET papel = 'membro' WHERE integrante_id = ?1 AND nucleo_id IN (SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ?2 AND papel = 'membro')`, A, B);
  q(`DELETE FROM nucleo_membros WHERE integrante_id = ?`, B);
  // Memórias, relatos, fotos e áudios
  q(`UPDATE memorias SET criada_por = ?1 WHERE criada_por = ?2`, A, B);
  q(`INSERT OR IGNORE INTO memoria_integrantes (memoria_id, integrante_id) SELECT memoria_id, ?1 FROM memoria_integrantes WHERE integrante_id = ?2`, A, B);
  q(`DELETE FROM memoria_integrantes WHERE integrante_id = ?`, B);
  q(`UPDATE relatos SET por = ?1 WHERE por = ?2`, A, B);
  q(`UPDATE relatos SET registrado_por = ?1 WHERE registrado_por = ?2`, A, B);
  q(`UPDATE fotos SET enviada_por = ?1 WHERE enviada_por = ?2`, A, B);
  q(`UPDATE fotos SET removida_por = ?1 WHERE removida_por = ?2`, A, B);
  q(`UPDATE audios SET enviado_por = ?1 WHERE enviado_por = ?2`, A, B);
  // Filiações: sem repetir e sem a pessoa virar filha de si mesma
  q(
    `INSERT OR IGNORE INTO filiacoes (filho_id, responsavel_id, qualidade, criado_por, criado_em, adocao_ano, adocao_mes, adocao_dia)
     SELECT CASE WHEN filho_id = ?2 THEN ?1 ELSE filho_id END, CASE WHEN responsavel_id = ?2 THEN ?1 ELSE responsavel_id END, qualidade, criado_por, criado_em, adocao_ano, adocao_mes, adocao_dia
     FROM filiacoes WHERE (filho_id = ?2 OR responsavel_id = ?2) AND NOT (filho_id = ?2 AND responsavel_id = ?1) AND NOT (filho_id = ?1 AND responsavel_id = ?2)`,
    A,
    B,
  );
  q(`DELETE FROM filiacoes WHERE filho_id = ?1 OR responsavel_id = ?1`, B);
  // Casais: o par se refaz em ordem; se a que fica já tem o mesmo casal, fica o dela
  for (const casal of (await lerCasais()).filter((x) => x.a === B || x.b === B)) {
    const outro = casal.a === B ? casal.b : casal.a;
    const [na, nb] = A < outro ? [A, outro] : [outro, A];
    if (outro === A) {
      q(`DELETE FROM casal_fases WHERE casal_id = ?`, casal.id);
      q(`DELETE FROM casais WHERE id = ?`, casal.id);
      continue;
    }
    q(`DELETE FROM casal_fases WHERE casal_id = ?1 AND EXISTS (SELECT 1 FROM casais WHERE a_id = ?2 AND b_id = ?3 AND visibilidade = ?4)`, casal.id, na, nb, casal.visibilidade);
    q(`DELETE FROM casais WHERE id = ?1 AND EXISTS (SELECT 1 FROM casais WHERE a_id = ?2 AND b_id = ?3 AND visibilidade = ?4)`, casal.id, na, nb, casal.visibilidade);
    q(`UPDATE casais SET a_id = ?2, b_id = ?3 WHERE id = ?1`, casal.id, na, nb);
  }
  // Laços do coração, laços resumidos, capítulos, proximidades e ex
  for (const [tabela, x, y] of [
    ['lacos_coracao', 'dono_id', 'pessoa_id'],
    ['lacos_resumidos', 'a_id', 'b_id'],
    ['proximidades', 'dono_id', 'pessoa_id'],
    ['ex_para_mim', 'dono_id', 'pessoa_id'],
    ['apelidos_meus', 'dono_id', 'pessoa_id'],
  ] as const) {
    q(`DELETE FROM ${tabela} WHERE (${x} = ?1 AND ${y} = ?2) OR (${x} = ?2 AND ${y} = ?1)`, A, B);
    q(`UPDATE OR IGNORE ${tabela} SET ${x} = ?1 WHERE ${x} = ?2`, A, B);
    q(`UPDATE OR IGNORE ${tabela} SET ${y} = ?1 WHERE ${y} = ?2`, A, B);
    q(`DELETE FROM ${tabela} WHERE ${x} = ?1 OR ${y} = ?1`, B);
  }
  q(`UPDATE capitulos SET criado_por = ?1 WHERE criado_por = ?2`, A, B);
  q(`INSERT OR IGNORE INTO capitulo_pessoas (capitulo_id, integrante_id) SELECT capitulo_id, ?1 FROM capitulo_pessoas WHERE integrante_id = ?2`, A, B);
  q(`DELETE FROM capitulo_pessoas WHERE integrante_id = ?`, B);
  for (const [tabela, coluna] of [
    ['avisos', 'para'],
    ['avisos', 'de'],
    ['integrantes', 'criado_por'],
    ['casais', 'criado_por'],
    ['filiacoes', 'criado_por'],
    ['lacos_resumidos', 'criado_por'],
    ['cartas', 'escrita_por'],
  ] as const) {
    q(`UPDATE ${tabela} SET ${coluna} = ?1 WHERE ${coluna} = ?2`, A, B);
  }
  // Quem sai não tem login (a rota confere): as marcas de visita e de acesso dela não servem
  q(`DELETE FROM visitas WHERE pessoa = ?`, B);
  q(`DELETE FROM acessos WHERE pessoa = ?`, B);
  // A ficha que fica, com os campos escolhidos, e a que sai deixa de existir
  const retrato = ficha.retrato === undefined ? fica.retrato : ficha.retrato;
  q(
    `UPDATE integrantes SET nome = ?, apelido = ?, tipo = ?, especie = ?, tratamento = ?, nascimento_ano = ?, nascimento_mes = ?,
       nascimento_dia = ?, falecimento_ano = ?, falecimento_mes = ?, falecimento_dia = ?, falecido = ?, sobre = ?, retrato = ? WHERE id = ?`,
    ...valoresDoIntegrante(ficha),
    retrato,
    A,
  );
  q(`DELETE FROM integrantes WHERE id = ?`, B);
  await db().batch(c);
}

// --- Sugestão de correção (migração 074; regras em src/lib/sugestoes.ts e permissoes.ts) ---

const lerSugestao = (r: Record<string, unknown>): Sugestao => ({
  id: r.id as number,
  memoriaId: r.memoria_id as string,
  relatoId: (r.relato_id as number | null) ?? null,
  de: r.de as string,
  para: r.para as string,
  tipo: r.tipo as TipoDeSugestao,
  proposta: r.proposta ? (JSON.parse(r.proposta as string) as Proposta) : null,
  texto: (r.texto as string | null) ?? null,
  situacao: r.situacao as SituacaoDaSugestao,
  resposta: (r.resposta as string | null) ?? null,
  criadaEm: r.criada_em as string,
  respondidaEm: (r.respondida_em as string | null) ?? null,
  respondidaPor: (r.respondida_por as string | null) ?? (r.respondida_em ? (r.para as string) : null),
});

type MemoriaDaSugestao = { id: string; criadaPor: string; integrantes: readonly string[] };

/**
 * Guarda a sugestão e o aviso para cada um que recebe (`destinatarios`: na de dados, quem criou e quem
 * está na memória; no recado, quem registrou o relato).
 */
export async function criarSugestao(
  s: { memoriaId: string; relatoId: number | null; para: string; tipo: TipoDeSugestao; proposta: Proposta | null; texto: string | null },
  usuario: Usuario,
  memoria: MemoriaDaSugestao,
): Promise<number> {
  const [r] = await db().batch([
    db()
      .prepare('INSERT INTO sugestoes (memoria_id, relato_id, de, para, tipo, proposta, texto) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id')
      .bind(s.memoriaId, s.relatoId, usuario.pessoa, s.para, s.tipo, s.proposta ? JSON.stringify(s.proposta) : null, s.texto),
  ]);
  const id = ((r as { results?: { id: number }[] }).results?.[0]?.id ?? 0) as number;
  const recebem = destinatarios({ tipo: s.tipo, para: s.para, de: usuario.pessoa }, memoria);
  await criarAvisos(recebem.map((para) => ({ para, tipo: 'sugestao' as const, memoriaId: s.memoriaId, relatoId: s.relatoId, de: usuario.pessoa, dados: { sugestao: id, recado: s.tipo === 'recado' } })));
  return id;
}

/**
 * As sugestões de uma memória que a pessoa mandou ou recebeu (é um dos destinatários hoje). As dos
 * outros, ninguém vê.
 */
export async function listarSugestoes(memoria: MemoriaDaSugestao, usuario: Usuario): Promise<Sugestao[]> {
  const { results } = await db().prepare('SELECT * FROM sugestoes WHERE memoria_id = ? ORDER BY id DESC').bind(memoria.id).all<Record<string, unknown>>();
  return results.map(lerSugestao).filter((s) => s.de === usuario.pessoa || destinatarios(s, memoria).includes(usuario.pessoa));
}

/** Quantas sugestões abertas a pessoa recebeu numa memória. */
export async function contarSugestoesAbertas(memoria: MemoriaDaSugestao, usuario: Usuario): Promise<number> {
  return (await listarSugestoes(memoria, usuario)).filter((s) => s.situacao === 'aberta' && s.de !== usuario.pessoa).length;
}

export async function obterSugestao(id: number): Promise<Sugestao | undefined> {
  const r = await db().prepare('SELECT * FROM sugestoes WHERE id = ?').bind(id).first<Record<string, unknown>>();
  return r ? lerSugestao(r) : undefined;
}

/**
 * Responde a sugestão: guarda o que foi feito, a mensagem e quem respondeu, tira o aviso da lista de todos
 * que receberam (o primeiro que responde resolve) e avisa quem sugeriu.
 */
export async function responderSugestao(s: Sugestao, situacao: Exclude<SituacaoDaSugestao, 'aberta'>, resposta: string | null, usuario: Usuario): Promise<void> {
  await db().batch([
    db().prepare(`UPDATE sugestoes SET situacao = ?, resposta = ?, respondida_em = datetime('now'), respondida_por = ? WHERE id = ? AND situacao = 'aberta'`).bind(situacao, resposta, usuario.pessoa, s.id),
    db().prepare(`UPDATE avisos SET resolvido_em = datetime('now'), resposta = ? WHERE tipo = 'sugestao' AND json_extract(dados, '$.sugestao') = ? AND resolvido_em IS NULL`).bind(situacao, s.id),
  ]);
  await criarAvisos([{ para: s.de, tipo: 'sugestao-resposta', memoriaId: s.memoriaId, relatoId: s.relatoId, de: usuario.pessoa, dados: { sugestao: s.id, situacao, recado: s.tipo === 'recado' } }]);
}

// --- Reações (migração 075; regras em src/lib/reacoes.ts) ---

/**
 * As reações de uma memória, por item ("relato:12", "foto:3"), com quem marcou cada símbolo. Só entram
 * os itens que quem pede vê (`alvos`) e as pessoas que ela vê: a conta nunca denuncia quem ela não vê.
 */
export async function listarReacoes(memoriaId: string, usuario: Usuario, alvos: ReadonlySet<string>): Promise<Map<string, Map<SimboloDaReacao, string[]>>> {
  const { results } = await db()
    .prepare('SELECT alvo, alvo_id, pessoa, simbolo FROM reacoes WHERE memoria_id = ? ORDER BY id')
    .bind(memoriaId)
    .all<{ alvo: string; alvo_id: number; pessoa: string; simbolo: SimboloDaReacao }>();
  const porItem = new Map<string, Map<SimboloDaReacao, string[]>>();
  if (results.length === 0) return porItem;
  const naoVe = await pessoasQueONaoVe(usuario);
  for (const r of results as { alvo: string; alvo_id: number; pessoa: string; simbolo: SimboloDaReacao }[]) {
    const chave = `${r.alvo}:${r.alvo_id}`;
    if (!alvos.has(chave) || naoVe.has(r.pessoa)) continue;
    const doItem = porItem.get(chave) ?? new Map<SimboloDaReacao, string[]>();
    doItem.set(r.simbolo, [...(doItem.get(r.simbolo) ?? []), r.pessoa]);
    porItem.set(chave, doItem);
  }
  return porItem;
}

/** Marca ou desmarca a reação da pessoa. Devolve se ficou marcada. */
export async function alternarReacao(memoriaId: string, alvo: 'memoria' | 'relato' | 'foto', alvoId: number, simbolo: SimboloDaReacao, usuario: Usuario): Promise<boolean> {
  const apagou = await db()
    .prepare('DELETE FROM reacoes WHERE memoria_id = ? AND alvo = ? AND alvo_id = ? AND pessoa = ? AND simbolo = ?')
    .bind(memoriaId, alvo, alvoId, usuario.pessoa, simbolo)
    .run();
  if ((apagou.meta.changes ?? 0) > 0) return false;
  await db().prepare('INSERT INTO reacoes (memoria_id, alvo, alvo_id, pessoa, simbolo) VALUES (?, ?, ?, ?, ?)').bind(memoriaId, alvo, alvoId, usuario.pessoa, simbolo).run();
  return true;
}

/** A pessoa marcou "eu estava lá" em algo desta memória? */
export async function disseQueEstava(memoriaId: string, usuario: Usuario): Promise<boolean> {
  return Boolean(await db().prepare(`SELECT 1 AS ok FROM reacoes WHERE memoria_id = ? AND pessoa = ? AND simbolo = 'estava' LIMIT 1`).bind(memoriaId, usuario.pessoa).first());
}

/** A ficha de uma memória como ela está, para salvar com uma mudança só (aceitar sugestão, entrar em Quem estava). */
export function fichaComoEsta(m: Memoria): DadosDaMemoria {
  return {
    titulo: m.titulo,
    ano: m.ano,
    mes: m.mes ?? undefined,
    dia: m.dia ?? undefined,
    aproximada: m.aproximada,
    tipo: m.tipo,
    tipoOutro: m.tipoOutro ?? undefined,
    lugar: m.lugar ?? undefined,
    visibilidade: m.visibilidade,
    situacao: m.situacao,
    nucleos: m.nucleos,
    integrantes: m.integrantes,
    fotos: m.fotos.map((f) => ({ id: f.id, legenda: f.legenda ?? undefined, principal: f.principal })),
  };
}

// --- Transcrição automática (onda 2; regras em src/lib/transcricao.ts) ---

/** Um áudio que a pessoa pode transcrever: o que ela enviou, ainda solto ou num relato que ela registrou. */
export async function audioParaTranscrever(id: number, usuario: Usuario): Promise<{ id: number; chave: string; tipo: string; tamanho: number; duracao: number | null } | undefined> {
  const a = await db()
    .prepare(
      `SELECT a.id, a.chave, a.tipo, a.tamanho, a.duracao FROM audios a LEFT JOIN relatos r ON r.id = a.relato_id
       WHERE a.id = ?1 AND a.removido_em IS NULL AND ((a.relato_id IS NULL AND a.enviado_por = ?2) OR r.registrado_por = ?2)`,
    )
    .bind(id, usuario.pessoa)
    .first<{ id: number; chave: string; tipo: string; tamanho: number; duracao: number | null }>();
  return a ?? undefined;
}


// --- Excluir pessoa (decisão do Gui depois da sessão I, 18/11/2026; migração 102-excluir-pessoa) ---
// A pessoa excluída vai para a lixeira: some do site na hora (listarIntegrantes, os laços e
// pessoasQueONaoVe deixam de vê-la), e as linhas dela ficam no banco, para restaurar devolver tudo.

/** Quem está na lixeira. */
export async function idsDasPessoasExcluidas(): Promise<Set<string>> {
  const { results } = await db().prepare('SELECT id FROM integrantes WHERE excluida_em IS NOT NULL').all<{ id: string }>();
  return new Set(results.map((r: { id: string }) => r.id));
}

export interface PessoaExcluida {
  id: string;
  nome: string;
  tipo: 'pessoa' | 'bicho';
  excluidaEm: string;
  excluidaPor: string | null;
}

/** Quem está na lixeira, das excluídas mais recentes para as mais antigas. */
export async function listarPessoasExcluidas(): Promise<PessoaExcluida[]> {
  const { results } = await db()
    .prepare('SELECT id, nome, tipo, excluida_em, excluida_por FROM integrantes WHERE excluida_em IS NOT NULL ORDER BY excluida_em DESC, nome')
    .all<Record<string, unknown>>();
  return results.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    nome: r.nome as string,
    tipo: r.tipo as 'pessoa' | 'bicho',
    excluidaEm: r.excluida_em as string,
    excluidaPor: (r.excluida_por as string | null) ?? null,
  }));
}

/** O nome de quem está na lixeira, para o relato que ela escreveu continuar assinado. */
export async function nomesDasPessoasExcluidas(): Promise<Map<string, string>> {
  return new Map((await listarPessoasExcluidas()).map((p) => [p.id, p.nome]));
}

/**
 * Manda a pessoa para a lixeira. O pedido aberto para ela fica resolvido como excluída. Devolve false
 * quando ela já estava na lixeira ou não existe.
 */
export async function excluirPessoa(id: string, usuario: Usuario): Promise<boolean> {
  const [feito] = await db().batch([
    db().prepare(`UPDATE integrantes SET excluida_em = datetime('now'), excluida_por = ? WHERE id = ? AND excluida_em IS NULL`).bind(usuario.pessoa, id),
    db()
      .prepare(`UPDATE pedidos_de_exclusao SET resolvido_em = datetime('now'), resolvido_por = ?, resposta = 'excluida' WHERE pessoa_id = ? AND resolvido_em IS NULL`)
      .bind(usuario.pessoa, id),
  ]);
  return Boolean(feito.meta?.changes);
}

/** Tira a pessoa da lixeira: ela volta com tudo, os laços, "quem estava" e os relatos. */
export async function restaurarPessoa(id: string): Promise<boolean> {
  const feito = await db().prepare('UPDATE integrantes SET excluida_em = NULL, excluida_por = NULL WHERE id = ? AND excluida_em IS NOT NULL').bind(id).run();
  return Boolean(feito.meta?.changes);
}

export interface PedidoDeExclusao {
  id: number;
  pessoa: string;
  pedidoPor: string;
  motivo: string | null;
  criadoEm: string;
}

/** Os pedidos abertos, dos mais antigos aos mais novos. Só de quem ainda não está na lixeira. */
export async function listarPedidosDeExclusao(): Promise<PedidoDeExclusao[]> {
  const { results } = await db()
    .prepare(
      `SELECT p.id, p.pessoa_id, p.pedido_por, p.motivo, p.criado_em FROM pedidos_de_exclusao p
       JOIN integrantes i ON i.id = p.pessoa_id AND i.excluida_em IS NULL
       WHERE p.resolvido_em IS NULL ORDER BY p.criado_em, p.id`,
    )
    .all<Record<string, unknown>>();
  return results.map((r: Record<string, unknown>) => ({
    id: r.id as number,
    pessoa: r.pessoa_id as string,
    pedidoPor: r.pedido_por as string,
    motivo: (r.motivo as string | null) ?? null,
    criadoEm: r.criado_em as string,
  }));
}

/** O pedido aberto para essa pessoa, se houver. */
export async function pedidoAbertoDeExclusao(pessoa: string): Promise<PedidoDeExclusao | undefined> {
  return (await listarPedidosDeExclusao()).find((p) => p.pessoa === pessoa);
}

/** Pede a exclusão. Um pedido aberto por pessoa: o segundo não entra. Devolve se entrou. */
export async function pedirExclusao(pessoa: string, motivo: string | null, usuario: Usuario): Promise<boolean> {
  const feito = await db()
    .prepare('INSERT OR IGNORE INTO pedidos_de_exclusao (pessoa_id, pedido_por, motivo) VALUES (?, ?, ?)')
    .bind(pessoa, usuario.pessoa, motivo || null)
    .run();
  return Boolean(feito.meta?.changes);
}

/** Recusa o pedido aberto: a pessoa continua no acervo. */
export async function recusarPedidoDeExclusao(id: number, usuario: Usuario): Promise<boolean> {
  const feito = await db()
    .prepare(`UPDATE pedidos_de_exclusao SET resolvido_em = datetime('now'), resolvido_por = ?, resposta = 'recusado' WHERE id = ? AND resolvido_em IS NULL`)
    .bind(usuario.pessoa, id)
    .run();
  return Boolean(feito.meta?.changes);
}


// --- O relato como conversa (migração 103-mensagens-do-relato; regras em src/lib/conversa.ts) ---

function lerMensagem(r: Record<string, unknown>): Mensagem & { id: number; relatoId: number; enviadaEm: string } {
  return {
    id: r.id as number,
    relatoId: r.relato_id as number,
    tipo: r.tipo as Mensagem['tipo'],
    ...(r.texto != null ? { texto: r.texto as string } : {}),
    ...(r.audio_id != null ? { audioId: r.audio_id as number } : {}),
    ...(r.foto_id != null ? { fotoId: r.foto_id as number } : {}),
    citaId: (r.cita_id as number | null) ?? null,
    enviadaEm: r.enviada_em as string,
  };
}

/** As mensagens gravadas de cada relato, na ordem. Relato sem nenhuma fica de fora (vale a derivada). */
export async function listarMensagensGravadas(relatoIds: number[]): Promise<Map<number, ReturnType<typeof lerMensagem>[]>> {
  const mapa = new Map<number, ReturnType<typeof lerMensagem>[]>();
  if (!relatoIds.length) return mapa;
  const { results } = await db()
    .prepare(`SELECT * FROM relato_mensagens WHERE relato_id IN (${relatoIds.map(() => '?').join(', ')}) ORDER BY relato_id, ordem, id`)
    .bind(...relatoIds)
    .all<Record<string, unknown>>();
  for (const r of results.map(lerMensagem)) mapa.set(r.relatoId, [...(mapa.get(r.relatoId) ?? []), r]);
  return mapa;
}

/**
 * As mensagens que valem para cada relato (mensagensDoRelato): as gravadas, sem o áudio ou a foto que
 * saiu, ou as derivadas do relato de antes da conversa. Só com os áudios e as fotos que ainda são dele.
 */
export async function listarMensagensDosRelatos(relatos: Pick<Relato, 'id' | 'texto'>[]): Promise<Map<number, Mensagem[]>> {
  const ids = relatos.map((r) => r.id);
  const [gravadas, audios, fotos] = await Promise.all([
    listarMensagensGravadas(ids),
    listarAudiosDosRelatos(ids),
    ids.length
      ? db()
          .prepare(`SELECT id, relato_id FROM fotos WHERE removida_em IS NULL AND relato_id IN (${ids.map(() => '?').join(', ')}) ORDER BY memoria_id IS NULL, ordem, id`)
          .bind(...ids)
          .all<{ id: number; relato_id: number }>()
      : Promise.resolve({ results: [] as { id: number; relato_id: number }[] }),
  ]);
  const fotosDe = new Map<number, number[]>();
  for (const f of fotos.results as { id: number; relato_id: number }[]) fotosDe.set(f.relato_id, [...(fotosDe.get(f.relato_id) ?? []), f.id]);
  return new Map(
    relatos.map((r) => [r.id, mensagensDoRelato(gravadas.get(r.id) ?? [], r.texto, (audios.get(r.id) ?? []).map((a) => a.id), fotosDe.get(r.id) ?? [])]),
  );
}

/**
 * Grava as mensagens do relato, na ordem dada. A que tem id e é deste relato é atualizada no lugar
 * (guarda a hora em que foi enviada e o id, para quem a cita); a nova entra com a hora de agora; a que
 * saiu da lista é apagada. Devolve as mensagens gravadas, com os ids.
 */
export async function gravarMensagens(relatoId: number, mensagens: Mensagem[]): Promise<Mensagem[]> {
  const antes = (await listarMensagensGravadas([relatoId])).get(relatoId) ?? [];
  const deste = new Set(antes.map((m) => m.id));
  const ficam = new Set(mensagens.filter((m) => m.id !== undefined && deste.has(m.id)).map((m) => m.id));
  const comandos = [
    ...antes.filter((m) => !ficam.has(m.id)).map((m) => db().prepare('DELETE FROM relato_mensagens WHERE id = ?').bind(m.id)),
    ...mensagens.map((m, ordem) =>
      m.id !== undefined && deste.has(m.id)
        ? db()
            .prepare('UPDATE relato_mensagens SET ordem = ?, tipo = ?, texto = ?, audio_id = ?, foto_id = ?, cita_id = ? WHERE id = ? AND relato_id = ?')
            .bind(ordem, m.tipo, m.tipo === 'texto' ? (m.texto ?? '') : null, m.audioId ?? null, m.fotoId ?? null, m.citaId ?? null, m.id, relatoId)
        : db()
            .prepare('INSERT INTO relato_mensagens (relato_id, ordem, tipo, texto, audio_id, foto_id, cita_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(relatoId, ordem, m.tipo, m.tipo === 'texto' ? (m.texto ?? '') : null, m.audioId ?? null, m.fotoId ?? null, m.citaId ?? null),
    ),
  ];
  if (comandos.length) await db().batch(comandos);
  return (await listarMensagensGravadas([relatoId])).get(relatoId) ?? [];
}

/** Uma mensagem gravada, com a memória e o relato dela, para conferir uma citação. */
export async function obterMensagem(id: number): Promise<(Mensagem & { relatoId: number; memoriaId: string; por: string; registradoPor: string; soParaNucleos: string[] | null; situacao: string }) | undefined> {
  const r = await db()
    .prepare(
      `SELECT m.*, r.memoria_id, r.por, r.registrado_por, r.so_para_nucleos, r.situacao FROM relato_mensagens m JOIN relatos r ON r.id = m.relato_id WHERE m.id = ?`,
    )
    .bind(id)
    .first<Record<string, unknown>>();
  if (!r) return undefined;
  return {
    ...lerMensagem(r),
    memoriaId: r.memoria_id as string,
    por: r.por as string,
    registradoPor: r.registrado_por as string,
    soParaNucleos: lerNucleosDoRelato(r.so_para_nucleos) ?? null,
    situacao: r.situacao as string,
  };
}
