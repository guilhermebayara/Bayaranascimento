// Leitura e gravação no banco. Toda leitura de memória recebe o usuário e já
// aplica a regra de visibilidade: nenhuma página consulta o banco por fora.
import { gravarEspera, lerEspera, quemNaoVe, relatoAberto, relatoNaTv, sqlEstaNoPublicoDoRelato, sqlRelatoAberto, sqlRelatoNaTv, sqlCasalAberto, sqlRelatoNaoEspera, sqlVeMemoria, sqlVeORelato, naoVeParaSql } from './quem-ve';
import { ambiente, apelidosDoPedido, banco } from './ambiente';
import type { Casal, DataDaAdocao, Fase, Filiacao, LacoDoCoracao, Papel, Qualidade, TipoDeFase, Tratamento } from '../parentesco';
import { podeVerCasal, podeVerLacoDoCoracao } from '../parentesco';
import { sqlMemoriaDoCapitulo, ehEpoca, formatarPeriodo, podeVerCapitulo, type Capitulo, type Tema } from '../capitulos';
import type { Dia, RegistroDeVisitas } from '../painel';
import { criarSlug, slugUnico } from './conteudo';
import type { Tipo } from '../tipos';
import { coresDosTrilhos, trilhosDosTrechos } from '../linha-capitulos';
import type { Filtros } from '../explorar';
import type { TipoDeAviso } from '../avisos';
import { exesDe, foraQueEPaiViraDiscreto, modosQueValem, type ModoDoEx } from '../ex-casal';
import { destinatarios, type Proposta, type SituacaoDaSugestao, type Sugestao, type TipoDeSugestao } from '../sugestoes';
import type { SimboloDaReacao } from '../reacoes';
import { mensagensDoRelato, type Mensagem } from '../conversa';
import { gravarCopias, lerCopias, type Copias } from '../copias-das-fotos';
import { gravarCopiaDoRetrato, lerCopiaDoRetrato, type CopiaDoRetrato } from '../retratos';
import { AJUSTE_DOS_NAO_DUPLICADOS } from '../juntar';
import {
  comExcluidas,
  pessoasQueNaoVe,
  podeVerRetrato,
  publicoConhecidoAntes,
  publicoConhecidoAoLiberar,
  relatoDepoisDaMudanca,
  jaRecusouEstePublico,
  veORelato,
  type AcessoDaMemoria,
  type Publico,
  chaveDoPublico,
  type PublicoConhecido,
  type Usuario,
} from './permissoes';

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
  /** As cópias menores (migração 110, src/lib/copias-das-fotos.ts). Vazio: a tela usa a original. */
  copias: Copias | null;
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
  /** a versão (migração 107): sobe a cada lote que conta com os relatos dela (ver conferirVersao) */
  versao: number;
  /** quando foi para a lixeira; vazio, fora dela */
  excluidaEm: string | null;
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
  /** O público mais amplo que o relato já teve (migração 105; ver relatoDepoisDaMudanca). Vazio: ainda sem registro. */
  publicoConhecido?: PublicoConhecido | null;
  /** O rascunho de relato que foi para a lixeira: fica parado, fora da espera e dos pedidos, até ser restaurado. */
  descartadoEm?: string | null;
}

/** A coluna so_para_nucleos (migração 025), em JSON, como lista: a leitura mora em quem-ve.ts (lerEspera). */
const lerNucleosDoRelato = lerEspera;

/** A coluna publico_conhecido (migração 105): "todos" ou a lista de núcleos em JSON. Vazia: ainda sem registro. */
const lerPublicoConhecido = (valor: unknown): PublicoConhecido | null =>
  valor === 'todos' ? 'todos' : typeof valor === 'string' && valor ? (JSON.parse(valor) as string[]) : null;
const gravarPublicoConhecido = (publico: PublicoConhecido): string => (publico === 'todos' ? 'todos' : JSON.stringify(publico));

const db = () => banco();

// --- A versão da memória (migração 107; revisão Y2 do PR #160, item 4b) ---

/** O recado de quem perdeu a corrida mais de uma vez seguida: nada foi gravado. */
export const RECADO_MEMORIA_MUDOU = 'Esta memória mudou enquanto você editava. Abra de novo para ver como ficou.';

/** O lote contava com uma versão da memória que já não é a de agora: nada foi gravado. */
export class MemoriaMudou extends Error {
  constructor() {
    super(RECADO_MEMORIA_MUDOU);
  }
}

/**
 * Sobe a versão a partir da que foi lida. Se outro lote subiu antes, o gatilho da migração 107 recusa, e o
 * lote inteiro volta (MemoriaMudou). Vai junto de todo lote que grava a espera ou o público conhecido de um
 * relato a partir do que leu.
 */
const conferirVersao = (memoriaId: string, lida: number) => db().prepare('UPDATE memorias SET versao = ? WHERE id = ?').bind(lida + 1, memoriaId);

/** Sobe a versão sem conferir: um relato novo, que quem leu os relatos antes não viu. */
const subirVersao = (memoriaId: string) => db().prepare('UPDATE memorias SET versao = versao + 1 WHERE id = ?').bind(memoriaId);

/** O lote, com a recusa do gatilho traduzida em MemoriaMudou. */
async function loteDaMemoria(comandos: Comando[]): Promise<void> {
  try {
    await db().batch(comandos);
  } catch (erro) {
    if (String((erro as Error)?.message ?? erro).includes('memoria-mudou')) throw new MemoriaMudou();
    throw erro;
  }
}

/**
 * Faz de novo, lendo o banco de agora, quando o lote perdeu a corrida para outro (MemoriaMudou): a conta
 * dos relatos sai do que existe na hora em que o lote grava. Depois de três tentativas, desiste, e quem
 * chama recusa com RECADO_MEMORIA_MUDOU, sem nada gravado.
 */
export async function refazerSeAMemoriaMudou<T>(fazer: () => Promise<T>, tentativas = 3): Promise<T | MemoriaMudou> {
  for (let vez = 1; ; vez++) {
    try {
      return await fazer();
    } catch (erro) {
      if (!(erro instanceof MemoriaMudou)) throw erro;
      if (vez >= tentativas) return erro;
    }
  }
}
/**
 * O código novo (da memória, da pessoa nova, do tema novo) foi usado por outro pedido entre a leitura e o
 * lote: o lote inteiro voltou, e o pedido pode ser tratado de novo, com um código lido do banco de agora
 * (D2 da sessão Z, 22/11/2026).
 */
export function codigoRepetido(erro: unknown): boolean {
  return /UNIQUE constraint failed: (memorias|integrantes|temas|capitulos|tipos)\.id\b/.test(String((erro as Error)?.message ?? erro));
}

/** As tentativas com código novo acabaram: quem chama volta para a página com o recado e o que foi digitado. */
export const SEM_CODIGO = Symbol('sem-codigo');

/**
 * O mesmo caminho do D2 da sessão Z nas outras rotas que geram código para gravar (sessão AA): se outro pedido
 * usou o código no meio tempo, o lote volta inteiro, e `fazer` roda de novo, com o número da vez, para ler os
 * códigos do banco de agora. Depois de três tentativas, devolve SEM_CODIGO, e a rota responde com o recado,
 * sem 500.
 */
export async function comCodigoNovo<T>(fazer: (vez: number) => Promise<T>, tentativas = 3): Promise<T | typeof SEM_CODIGO> {
  for (let vez = 1; ; vez++) {
    try {
      return await fazer(vez);
    } catch (erro) {
      if (!codigoRepetido(erro)) throw erro;
      if (vez >= tentativas) return SEM_CODIGO;
    }
  }
}

/** Um comando do banco, para gravar junto num lote (db.batch, uma transação). */
export type Comando = ReturnType<ReturnType<typeof banco>['prepare']>;

// --- Quem vê o quê, em SQL: os fragmentos de src/lib/servidor/quem-ve.ts, em par com o TS ---
// ?1 é sempre o id de quem olha. A regra não se escreve aqui: testes/quem-ve-equivalencia.test.ts confere que
// o SQL e o TS dizem o mesmo e recusa uma terceira cópia neste arquivo.

/** A memória que a pessoa pode ver, dentro ou fora da lixeira (a lixeira de quem pede). */
const FILTRO_SEM_LIXEIRA = sqlVeMemoria({ lixeira: 'qualquer' });

/** O que aparece no site: o que a pessoa pode ver e não está na lixeira. */
const FILTRO_VISIVEL = sqlVeMemoria();

/** O que aparece no site, só a memória publicada (sem o rascunho de quem escreve). */
const FILTRO_PUBLICADA = sqlVeMemoria({ so: 'publicada' });

// --- O que quase todo pedido lê (a guarda por pedido, src/lib/servidor/ambiente.ts) ---
//
// Cada leitura tem o SQL num lugar só, para o começo do pedido (aquecerOPedido) ler tudo num lote e as
// funções abaixo acharem a leitura já guardada: o mesmo SQL com os mesmos valores, para a mesma pessoa.
const SQL = {
  integrantes: 'SELECT id, nome, apelido, tipo, especie, tratamento, nascimento_ano, nascimento_mes, nascimento_dia, falecimento_ano, falecimento_mes, falecimento_dia, retrato, admin, criado_por, falecido FROM integrantes WHERE excluida_em IS NULL ORDER BY ordem, nome',
  membros: 'SELECT nucleo_id, integrante_id, papel FROM nucleo_membros',
  nucleos: 'SELECT id, nome, sobrenomes FROM nucleos ORDER BY ordem, nome',
  tipos: 'SELECT id, rotulo, cor, cor_da_paleta AS corDaPaleta, icone FROM tipos ORDER BY ordem, rotulo',
  apelidos: 'SELECT pessoa_id, apelido FROM apelidos_meus WHERE dono_id = ?',
  pessoasExcluidas: 'SELECT id, nome, tipo, excluida_em, excluida_por FROM integrantes WHERE excluida_em IS NOT NULL ORDER BY excluida_em DESC, nome',
  emPrivadosDeOutros: 'SELECT DISTINCT pessoa_id FROM lacos_coracao WHERE privado = 1 AND dono_id <> ?',
  casais: 'SELECT * FROM casais ORDER BY id',
  fases: 'SELECT * FROM casal_fases ORDER BY casal_id, ordem, id',
  familiasDosCasais: 'SELECT casal_id, nucleo_id FROM casal_nucleos ORDER BY nucleo_id',
  exParaMim: 'SELECT pessoa_id, modo FROM ex_para_mim WHERE dono_id = ?',
  carta: 'SELECT * FROM cartas ORDER BY id DESC LIMIT 1',
  tamanhoDoBanco: 'SELECT 1',
  copiaMensal: 'SELECT feita_em FROM copias_mensais ORDER BY id DESC LIMIT 1',
  ajuste: 'SELECT valor FROM ajustes WHERE chave = ?',
} as const;

// --- Integrantes e núcleos ---

/**
 * Excluir pessoa (decisão do Gui depois da sessão I, 18/11/2026): quem está na lixeira não aparece em
 * nenhuma lista de pessoas nem de laços. As linhas continuam no banco, para restaurar devolver tudo.
 */
const ativa = (coluna: string) => `${coluna} NOT IN (SELECT id FROM integrantes WHERE excluida_em IS NOT NULL)`;

export async function listarIntegrantes(): Promise<Integrante[]> {
  const [integrantes, membros] = await db().batch<Record<string, unknown>>([
    db().prepare(SQL.integrantes),
    db().prepare(SQL.membros),
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
    sobre: null, // O texto só é lido pela ficha da pessoa (lerSobreDaPessoa).
    retrato: (i.retrato as string | null) ?? null,
    admin: Boolean(i.admin),
    criadoPor: (i.criado_por as string | null) ?? null,
    falecido: Boolean(i.falecido) || i.falecimento_ano != null,
    nucleos: daPessoa(i.id as string, 'membro'),
    parenteDe: daPessoa(i.id as string, 'parente'),
  }));
}

/** Completa só o texto da pessoa cuja ficha já foi autorizada, sem repetir a lista do aquecimento. */
export async function lerSobreDaPessoa(pessoa: Integrante): Promise<void> {
  const r = await db().prepare('SELECT sobre FROM integrantes WHERE id = ? AND excluida_em IS NULL').bind(pessoa.id).first<{ sobre: string | null }>();
  pessoa.sobre = r?.sobre ?? null;
}

export async function listarNucleos(): Promise<Nucleo[]> {
  const { results } = await db().prepare(SQL.nucleos).all<{ id: string; nome: string; sobrenomes: string | null }>();
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
  await comandoDeCriarIntegrante(id, nome, criadoPor, tratamento).run();
}

/** O cadastro rápido como comando, para gravar junto com a memória que cita a pessoa (um lote só). */
export const comandoDeCriarIntegrante = (id: string, nome: string, criadoPor: string, tratamento: Tratamento = null): Comando =>
  db().prepare(`INSERT INTO integrantes (id, nome, criado_por, tratamento) VALUES (?, ?, ?, ?)`).bind(id, nome, criadoPor, tratamento);

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
  await lerSobreDaPessoa(anterior);
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

const SQL_FILIACOES = `SELECT filho_id, responsavel_id, qualidade, adocao_ano, adocao_mes, adocao_dia FROM filiacoes WHERE ${ativa('filho_id')} AND ${ativa('responsavel_id')}`;

export async function listarFiliacoes(): Promise<Filiacao[]> {
  const { results } = await db().prepare(SQL_FILIACOES).all<Record<string, unknown>>();
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
    db().prepare(SQL.casais),
    db().prepare(SQL.fases),
    db().prepare(SQL.familiasDosCasais),
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
const SQL_LACOS_DO_CORACAO = `SELECT * FROM lacos_coracao WHERE ${ativa('dono_id')} AND ${ativa('pessoa_id')} ORDER BY COALESCE(proximidade, 9), nome`;

export async function listarLacosDoCoracao(usuario: Usuario): Promise<LacoDoCoracao[]> {
  const { results } = await db().prepare(SQL_LACOS_DO_CORACAO).all<Record<string, unknown>>();
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
    .prepare(SQL.emPrivadosDeOutros)
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
  // A conta mora em quem-ve.ts (a mesma da árvore): a pessoa logada sempre se vê
  return quemNaoVe(emPrivados, { filiacoes, casais, lacosDoCoracao: lacos }, usuario.pessoa);
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
  return (await acessoAoRetrato(usuario, chave)) !== null;
}

/**
 * podeVerRetratoDaChave com o que a rota precisa: nada, para quem não vê, e, para quem vê, se o retrato
 * pode ficar guardado no aparelho por 7 dias (decisão 3 do Gui, 23/11/2026). O retrato de quem está na
 * lixeira continua sendo conferido a cada uso, como antes.
 */
export async function acessoAoRetrato(usuario: Usuario, chave: string): Promise<{ guardar: boolean; copia: CopiaDoRetrato | null } | null> {
  // Um retrato de exemplo é dividido por várias pessoas: basta a pessoa logada ver uma delas
  const { results: donos } = await db()
    .prepare('SELECT id, excluida_em, (SELECT copia FROM retratos_enviados WHERE chave = ?1) AS copia FROM integrantes WHERE retrato = ?1')
    .bind(chave)
    .all<{ id: string; excluida_em: string | null; copia: string | null }>();
  if (donos.length === 0) return null;
  const naoVe = await pessoasQueONaoVe(usuario);
  const visiveis = (donos as { id: string; excluida_em: string | null; copia: string | null }[]).filter((dono) => podeVerRetrato(dono.id, naoVe));
  if (visiveis.length === 0) return null;
  // A cópia (sessão D1c) segue exatamente esta conferência: a rota da cópia chama esta função com a chave da original
  return { guardar: visiveis.some((dono) => !dono.excluida_em), copia: lerCopiaDoRetrato(visiveis[0]!.copia) };
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
  const { results } = await db().prepare(SQL.tipos).all<Tipo>();
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
       WHERE m.tipo = 'outro' AND TRIM(COALESCE(m.tipo_outro, '')) <> '' AND ${FILTRO_PUBLICADA}
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
    versao: Number(linha.versao ?? 0),
    // Para o TS refazer o filtro de quem vê (veMemoria, em quem-ve.ts)
    excluidaEm: (linha.excluida_em as string | null | undefined) ?? null,
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
      copias: lerCopias(f.copias),
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
 * As vozes que podem ir à TV, no banco: cada áudio de relato que passa em relatoNaTv. Exportada para o teste de
 * equivalência conferir o que o SQL devolve antes do filtro em TS (revisão MEM-2 da AC3), áudio por áudio.
 */
export const SQL_DAS_VOZES_NA_TV = `SELECT a.id AS audio, r.memoria_id, r.por, r.registrado_por, r.so_para_nucleos FROM audios a JOIN relatos r ON r.id = a.relato_id
  WHERE a.removido_em IS NULL AND ${sqlRelatoNaTv('r')}`;

/**
 * As memórias com voz que vai à TV (correção 4 da revisão R-AB2): áudio de relato que a pessoa vê e que passa em
 * relatoNaTv (publicado, sem esperar o sim de ninguém, não descartado). O filtro "com áudio" do modo TV usa esta,
 * e não memoriasComAudio, para não pôr na ordem uma memória cuja única voz a TV esconde.
 */
export async function memoriasComAudioNaTv(usuario: Usuario): Promise<Set<string>> {
  const [{ results }, naoVe] = await Promise.all([
    db().prepare(SQL_DAS_VOZES_NA_TV).all<LinhaDeRelato>(),
    pessoasQueONaoVe(usuario),
  ]);
  return new Set(
    (results as LinhaDeRelato[])
      .filter((r) => relatoNaTv({ situacao: 'publicada', soParaNucleos: lerNucleosDoRelato(r.so_para_nucleos) }) && veORelato(relatoDaLinha(r), usuario, naoVe))
      .map((r) => r.memoria_id),
  );
}

/** Dos relatos de onde vieram fotos, os que vão à TV (relatoNaTv): a foto deles vai junto; a dos outros, não. */
export async function relatosQueVaoATv(relatoIds: readonly number[]): Promise<Set<number>> {
  if (relatoIds.length === 0) return new Set();
  const { results } = await db()
    .prepare(`SELECT id, situacao, so_para_nucleos, descartado_em FROM relatos WHERE id IN (SELECT value FROM json_each(?))`)
    .bind(JSON.stringify(relatoIds))
    .all<{ id: number; situacao: 'rascunho' | 'publicada'; so_para_nucleos: string | null; descartado_em: string | null }>();
  return new Set(
    (results as { id: number; situacao: 'rascunho' | 'publicada'; so_para_nucleos: string | null; descartado_em: string | null }[])
      .filter((r) => relatoNaTv({ situacao: r.situacao, soParaNucleos: lerNucleosDoRelato(r.so_para_nucleos), descartadoEm: r.descartado_em }))
      .map((r) => Number(r.id)),
  );
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
  const condicoes = filtro.rascunhos ? [FILTRO_VISIVEL, `m.situacao = 'rascunho'`] : filtro.comRascunhos ? [FILTRO_VISIVEL, `m.situacao IN ('publicada', 'rascunho')`] : [FILTRO_PUBLICADA];
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
    .prepare(`SELECT m.* FROM memorias m WHERE ${condicoes.join(' AND ')} ORDER BY ${ORDEM_DA_LINHA}`)
    .bind(...valores)
    .all<Record<string, unknown>>();
  return completar(results.map(lerMemoria), usuario);
}

/**
 * A ordem da linha do tempo: pela data e, na mesma data, por quando entrou no acervo. O rowid desempata o
 * que entrou no mesmo instante (as memórias de exemplo), para a ordem ser sempre a mesma: a da linha do
 * tempo e a de "Antes" e "Depois" na página da memória (vizinhasDaMemoria).
 */
const ORDEM_DA_LINHA = 'm.ano, COALESCE(m.mes, 0), COALESCE(m.dia, 0), m.criada_em, m.rowid';

const ORDEM_INVERSA = 'm.ano DESC, COALESCE(m.mes, 0) DESC, COALESCE(m.dia, 0) DESC, m.criada_em DESC, m.rowid DESC';

/** Contar sem materializar as memórias nem os anexos. Mesma regra de listarMemorias, só publicadas. */
export async function contarMemoriasPorPessoa(usuario: Usuario): Promise<Map<string, number>> {
  const { results } = await db().prepare(`SELECT mi.integrante_id AS id, COUNT(*) AS n
    FROM memoria_integrantes mi JOIN memorias m ON m.id = mi.memoria_id WHERE ${FILTRO_PUBLICADA} GROUP BY mi.integrante_id`).bind(usuario.pessoa).all<{ id: string; n: number }>();
  return new Map(results.map((r) => [r.id, r.n]));
}

export async function contarMemoriasPorTipo(usuario: Usuario): Promise<Map<string, number>> {
  const { results } = await db().prepare(`SELECT m.tipo AS id, COUNT(*) AS n FROM memorias m
    WHERE ${FILTRO_PUBLICADA} GROUP BY m.tipo`).bind(usuario.pessoa).all<{ id: string; n: number }>();
  return new Map(results.map((r) => [r.id, r.n]));
}

/** O conjunto do sorteio, sem ordem nem peso: uma linha por memória elegível. Exportado para equivalência. */
export async function consultaDasCandidatasAoAcaso(usuario: Usuario, f: Filtros, capitulos: Capitulo[], busca: readonly string[] = []) {
  const { naoVe, excluidas } = naoVeParaSql(await pessoasQueONaoVe(usuario));
  const valores: unknown[] = f.comFoto || f.comAudio || f.contou || f.falta ? [usuario.pessoa, naoVe, excluidas] : [usuario.pessoa];
  const parametro = (v: unknown) => { valores.push(v); return `?${valores.length}`; };
  const lista = (v: readonly string[]) => `SELECT value FROM json_each(${parametro(JSON.stringify(v))})`;
  const condicoes = [FILTRO_PUBLICADA];
  if (f.tipos.length) condicoes.push(`m.tipo IN (${lista(f.tipos)})`);
  for (const pessoa of f.pessoas) condicoes.push(`EXISTS (SELECT 1 FROM memoria_integrantes mi WHERE mi.memoria_id = m.id AND mi.integrante_id = ${parametro(pessoa)})`);
  if (f.familias.length) condicoes.push(`EXISTS (SELECT 1 FROM memoria_nucleos mn2 WHERE mn2.memoria_id = m.id AND mn2.nucleo_id IN (${lista(f.familias)}))`);
  if (f.temas.length) condicoes.push(`EXISTS (SELECT 1 FROM tema_memorias tm WHERE tm.memoria_id = m.id AND tm.tema_id IN (${lista(f.temas)}))`);
  if (f.capitulos.length) {
    const escolhidos = capitulos.filter((c) => f.capitulos.includes(c.id)).map((c) => ({ ...c, filhos: comFilhos(c, capitulos) }));
    condicoes.push(`EXISTS (SELECT 1 FROM json_each(${parametro(JSON.stringify(escolhidos))}) c WHERE ${sqlMemoriaDoCapitulo('m', 'c.value', `json_extract(c.value, '$.filhos')`)})`);
  }
  if (f.de !== null) condicoes.push(`m.ano >= ${parametro(f.de)}`);
  if (f.ate !== null) condicoes.push(`m.ano <= ${parametro(f.ate)}`);
  if (f.decada !== null) condicoes.push(`m.ano BETWEEN ${parametro(f.decada)} AND ${parametro(f.decada + 9)}`);
  if (f.comFoto) condicoes.push(TEM_FOTO_VISIVEL);
  if (f.comAudio) condicoes.push(`EXISTS (SELECT 1 FROM audios a JOIN relatos r ON r.id = a.relato_id WHERE r.memoria_id = m.id AND a.removido_em IS NULL AND r.situacao = 'publicada' AND ${sqlVeORelato()})`);
  const contou = `EXISTS (SELECT 1 FROM relatos r WHERE r.memoria_id = m.id AND r.por = ?1 AND r.situacao = 'publicada' AND ${sqlVeORelato()})`;
  if (f.contou) condicoes.push(contou);
  if (f.falta) condicoes.push(`EXISTS (SELECT 1 FROM memoria_integrantes mi WHERE mi.memoria_id = m.id AND mi.integrante_id = ?1) AND NOT ${contou}`);
  if (f.busca) condicoes.push(`m.id IN (${lista(busca)})`);
  return { sql: `FROM memorias m WHERE ${condicoes.join(' AND ')}`, valores };
}

/** RANDOM() recebe uma linha por memória, como sortear em TS. A guarda por pedido nunca guarda RANDOM(). */
export async function escolherMemoriaAoAcaso(usuario: Usuario, f: Filtros, capitulos: Capitulo[], pedido: { id: string | null; outra: boolean; anterior: string | null; busca?: readonly string[] }) {
  const { sql, valores } = await consultaDasCandidatasAoAcaso(usuario, f, capitulos, pedido.busca);
  const conta = await db().prepare(`SELECT COUNT(*) AS total, MAX(CASE WHEN m.id = ?${valores.length + 1} THEN m.id END) AS pedida ${sql}`)
    .bind(...valores, pedido.id).first<{ total: number; pedida: string | null }>();
  if (!conta?.total) return { total: 0, id: undefined, redirecionar: false };
  if (conta.pedida && !pedido.outra) return { total: conta.total, id: conta.pedida, redirecionar: false };
  const excluir = conta.total > 1 && pedido.anterior;
  const escolhida = await db().prepare(`SELECT m.id ${sql}${excluir ? ` AND m.id <> ?${valores.length + 1}` : ''} ORDER BY RANDOM() LIMIT 1`)
    .bind(...valores, ...(excluir ? [pedido.anterior] : [])).first<{ id: string }>();
  return { total: conta.total, id: escolhida?.id, redirecionar: true };
}

/** Só títulos, para o relato da conta e o bilhete do Início. Nenhum anexo é necessário. */
export async function titulosDasMemorias(usuario: Usuario, ids: readonly string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { results } = await db().prepare(`SELECT m.id, m.titulo FROM memorias m WHERE ${FILTRO_VISIVEL}
    AND m.id IN (SELECT value FROM json_each(?2))`).bind(usuario.pessoa, JSON.stringify(ids)).all<{ id: string; titulo: string }>();
  return new Map(results.map((r) => [r.id, r.titulo]));
}

/** A existência de foto como completar a devolveria, inclusive a foto de relato que espera o sim.
 * completar só tira fotos dos relatos PUBLICADOS que o leitor não vê; conservar essa exceção é necessário.
 */
const TEM_FOTO_VISIVEL = `EXISTS (SELECT 1 FROM fotos f WHERE f.memoria_id = m.id AND f.removida_em IS NULL
  AND NOT EXISTS (SELECT 1 FROM relatos r WHERE r.id = f.relato_id AND r.situacao = 'publicada' AND NOT ${sqlVeORelato()}))`;

export async function fotosDaCarta(usuario: Usuario): Promise<Memoria[]> {
  const { naoVe, excluidas } = naoVeParaSql(await pessoasQueONaoVe(usuario));
  const { results } = await db().prepare(`SELECT m.* FROM memorias m WHERE ${FILTRO_PUBLICADA}
    AND EXISTS (SELECT 1 FROM memoria_integrantes mi WHERE mi.memoria_id = m.id AND mi.integrante_id = ?1)
    AND ${TEM_FOTO_VISIVEL} ORDER BY ${ORDEM_INVERSA} LIMIT 3`).bind(usuario.pessoa, naoVe, excluidas).all<Record<string, unknown>>();
  return completar(results.map(lerMemoria), usuario);
}

/** Os agregados e até onze memórias dos cartões. A lista inteira nunca sai do banco. */
export async function memoriasDoInicio(usuario: Usuario, desde: string | null, hoje: Dia, { soCarta = false } = {}) {
  if (soCarta) return {
    total: 0, de: 0, ate: 0, minhas: 0, minhaDe: 0, minhaAte: 0, novas: 0, novasIds: new Set<string>(), decadas: [] as number[],
    fotos: await fotosDaCarta(usuario), naMesa: [] as Memoria[], paraContar: undefined, outrosAnos: undefined,
    rascunhos: { total: 0, primeiro: null, ids: [] as string[] },
  };
  const { naoVe, excluidas } = naoVeParaSql(await pessoasQueONaoVe(usuario));
  const minha = `EXISTS (SELECT 1 FROM memoria_integrantes mi WHERE mi.memoria_id = m.id AND mi.integrante_id = ?1)`;
  const nova = `COALESCE(m.publicada_em, m.criada_em, '') > ?4 AND m.criada_por <> ?1`;
  const valores = [usuario.pessoa, naoVe, excluidas, desde ?? '9999', hoje.ano, hoje.mes, hoje.dia];
  const preparar = (sql: string) => {
    const n = Math.max(...[...sql.matchAll(/\?(\d+)/g)].map((m) => Number(m[1])));
    return db().prepare(sql).bind(...valores.slice(0, n));
  };
  const distancia = `ABS(julianday(printf('2000-%02d-%02d', m.mes, m.dia)) - julianday(printf('2000-%02d-%02d', ?6, ?7)))`;
  const [conta, decadas, minhasFotos, novas, contar, outros, rascunhos] = await db().batch<Record<string, unknown>>([
    preparar(`WITH vistas AS MATERIALIZED (SELECT m.id, m.ano, (${minha}) AS minha, (${nova}) AS nova
      FROM memorias m WHERE ${FILTRO_PUBLICADA})
      SELECT COUNT(*) AS total, MIN(ano) AS de, MAX(ano) AS ate,
      COUNT(CASE WHEN minha THEN 1 END) AS minhas,
      MIN(CASE WHEN minha THEN ano END) AS minhaDe, MAX(CASE WHEN minha THEN ano END) AS minhaAte,
      COUNT(CASE WHEN nova THEN 1 END) AS novas, json_group_array(id) FILTER (WHERE nova) AS novasIds FROM vistas`),
    preparar(`SELECT CAST(m.ano / 10 AS INTEGER) * 10 AS decada FROM memorias m WHERE ${FILTRO_PUBLICADA} GROUP BY decada ORDER BY decada DESC`),
    preparar(`SELECT m.* FROM memorias m WHERE ${FILTRO_PUBLICADA} AND ${minha} AND ${TEM_FOTO_VISIVEL} ORDER BY ${ORDEM_INVERSA} LIMIT 4`),
    preparar(`SELECT m.* FROM memorias m WHERE ${FILTRO_PUBLICADA} AND ${nova}
      ORDER BY COALESCE(m.publicada_em, m.criada_em, '') DESC, ${ORDEM_DA_LINHA} LIMIT 2`),
    preparar(`SELECT m.* FROM memorias m WHERE ${FILTRO_PUBLICADA} AND ${minha} AND NOT (${nova})
      AND NOT EXISTS (SELECT 1 FROM relatos r WHERE r.memoria_id = m.id AND r.por = ?1)
      ORDER BY ${TEM_FOTO_VISIVEL} DESC, ${ORDEM_INVERSA} LIMIT 1`),
    preparar(`WITH candidatas AS (SELECT m.*, CASE
        WHEN ?6 = 12 AND ?7 BETWEEN 24 AND 26 AND m.mes = 12 AND m.dia IN (24, 25) THEN 0
        WHEN m.mes = ?6 AND m.dia = ?7 THEN 1
        WHEN m.dia IS NOT NULL AND MIN(${distancia}, 366 - ${distancia}) <= 3 THEN 2
        WHEN m.mes = ?6 THEN 3 ELSE 4 END AS nivel, m.rowid AS desempate
      FROM memorias m WHERE ${FILTRO_PUBLICADA} AND m.ano < ?5 AND NOT m.aproximada AND m.mes IS NOT NULL)
      SELECT * FROM candidatas m WHERE nivel < 4 AND nivel = (SELECT MIN(nivel) FROM candidatas)
      ORDER BY m.ano DESC, COALESCE(m.mes, 0), COALESCE(m.dia, 0), m.criada_em, desempate LIMIT 4`),
    preparar(`SELECT COUNT(*) AS total, json_group_array(m.id) AS ids, (SELECT m.id FROM memorias m WHERE ${FILTRO_VISIVEL} AND m.situacao = 'rascunho'
      ORDER BY ${ORDEM_DA_LINHA} LIMIT 1) AS primeiro FROM memorias m WHERE ${FILTRO_VISIVEL} AND m.situacao = 'rascunho'`),
  ]);
  const escolhidas = new Map([...minhasFotos.results, ...novas.results, ...contar.results, ...outros.results].map((m) => [m.id as string, lerMemoria(m)]));
  await completar([...escolhidas.values()], usuario);
  const ler = (linhas: Record<string, unknown>[]) => linhas.map((r) => escolhidas.get(r.id as string)!);
  const c = conta.results[0] as unknown as { total: number; de: number; ate: number; minhas: number; minhaDe: number; minhaAte: number; novas: number; novasIds: string };
  return {
    ...c, novasIds: new Set<string>(JSON.parse(c.novasIds)), decadas: decadas.results.map((d) => d.decada as number),
    fotos: ler(minhasFotos.results), naMesa: ler(novas.results), paraContar: ler(contar.results)[0],
    outrosAnos: outros.results.length ? { proximidade: (['natal', 'dia', 'semana', 'mes'] as const)[outros.results[0].nivel as number], itens: ler(outros.results) } : undefined,
    rascunhos: { total: Number(rascunhos.results[0].total), primeiro: rascunhos.results[0].primeiro as string | null, ids: JSON.parse(rascunhos.results[0].ids as string) as string[] },
  };
}

/** Os resumos e as cores usam a mesma consulta, guardada pelo SQL no pedido.
 * Cada capítulo é um parâmetro constante. Isso evita repetir json_extract(c.value) e subconsultas
 * correlacionadas para cada par capítulo/memória, e conserva os intervalos entre as pontas dos trilhos.
 */
async function agregadosDosCapitulos(usuario: Usuario, capitulos: Capitulo[]) {
  const valores: unknown[] = [usuario.pessoa, JSON.stringify(capitulos.map((c) => ({
    capitulo: { id: c.id, modo: c.modo, inicio: c.inicio, fim: c.fim, pessoas: c.pessoas, familias: c.familias }, filhos: comFilhos(c, capitulos),
  })))];
  const ctes = [`visiveis AS MATERIALIZED (SELECT m.id, m.ano, m.mes, m.dia, m.criada_em, m.rowid AS desempate,
    ROW_NUMBER() OVER (ORDER BY ${ORDEM_INVERSA}) - 1 AS posicao FROM memorias m WHERE ${FILTRO_PUBLICADA})`];
  const selecoes: { n: string; inicio: string; fim: string; primeira: string; ultima: string }[] = [];
  const indices = new Map(capitulos.map((c, i) => [c.id, i]));
  const parametros = capitulos.map((c, i) => ({ capitulo: `json_extract(?2, '$[${i}].capitulo')`, filhos: `json_extract(?2, '$[${i}].filhos')` }));
  const ordem = 'm.ano * 10000 + COALESCE(m.mes, 1) * 100 + COALESCE(m.dia, 1)';
  const antes = `${ordem}, m.ano, COALESCE(m.mes, 0), COALESCE(m.dia, 0), m.criada_em, m.desempate`;
  const depois = `${ordem} DESC, m.ano DESC, COALESCE(m.mes, 0) DESC, COALESCE(m.dia, 0) DESC, m.criada_em DESC, m.desempate DESC`;
  capitulos.forEach((c, i) => {
    const { capitulo, filhos } = parametros[i];
    ctes.push(`p${i} AS MATERIALIZED (SELECT m.* FROM visiveis m WHERE ${sqlMemoriaDoCapitulo('m', capitulo, "'[]'", c.modo)})`);
    ctes.push(c.modo === 'epoca' || !comFilhos(c, capitulos).length
      ? `d${i} AS MATERIALIZED (SELECT * FROM p${i})`
      : `d${i} AS MATERIALIZED (SELECT m.* FROM visiveis m WHERE ${sqlMemoriaDoCapitulo('m', capitulo, filhos, c.modo)})`);
    const pontas = (sentido: string) => `(SELECT json_object('ano', m.ano, 'mes', m.mes, 'dia', m.dia) FROM d${i} m ORDER BY ${sentido} LIMIT 1)`;
    let primeira = 'NULL', ultima = 'NULL';
    if (!ehEpoca(c)) {
      const fontes = [i, ...capitulos.filter((x) => x.dentroDe === c.id && !ehEpoca(x)).map((x) => indices.get(x.id)!)];
      ctes.push(`t${i} AS MATERIALIZED (${fontes.map((n) => `SELECT posicao FROM p${n}`).join(' UNION ')})`);
      const periodo = c.modo === 'epoca' ? ` UNION ALL SELECT m.posicao FROM visiveis m WHERE ${sqlMemoriaDoCapitulo('m', `json_set(${capitulo}, '$.pessoas', json('[]'), '$.familias', json('[]'))`, "'[]'", 'epoca')}` : '';
      const faixa = `FROM (SELECT posicao FROM t${i}${periodo}) WHERE EXISTS (SELECT 1 FROM t${i})`;
      primeira = `(SELECT MIN(posicao) ${faixa})`;
      ultima = `(SELECT MAX(posicao) ${faixa})`;
    }
    selecoes.push({ n: `(SELECT COUNT(*) FROM d${i})`, inicio: pontas(antes), fim: pontas(depois), primeira, ultima });
  });
  if (!capitulos.length) return { resumos: new Map(), cores: new Map<string, number>() };
  const campo = (nome: keyof typeof selecoes[number]) => `CASE CAST(j.key AS INTEGER) ${selecoes.map((c, i) => `WHEN ${i} THEN ${c[nome]}`).join(' ')} END AS ${nome}`;
  const { results } = await db().prepare(`WITH ${ctes.join(', ')} SELECT json_extract(j.value, '$.capitulo.id') AS capitulo,
    ${(['n', 'inicio', 'fim', 'primeira', 'ultima'] as const).map(campo).join(', ')} FROM json_each(?2) j`)
    .bind(...valores).all<{ capitulo: string; n: number; inicio: string | null; fim: string | null; primeira: number | null; ultima: number | null }>();
  const trechos = capitulos.flatMap((c) => {
    const r = results.find((r) => r.capitulo === c.id)!;
    return r.primeira === null ? [] : [{ id: c.id, titulo: c.titulo, dentroDe: c.dentroDe, periodo: '', primeira: r.primeira, ultima: r.ultima! }];
  });
  const resumos = new Map(capitulos.map((c) => {
    const r = results.find((r) => r.capitulo === c.id)!;
    const p = c.modo === 'epoca' ? c.inicio && { inicio: c.inicio, fim: c.fim } : r.n ? { inicio: JSON.parse(r.inicio!), fim: JSON.parse(r.fim!) } : null;
    return [c.id, { memorias: r.n, datas: p, periodo: p ? formatarPeriodo(p.inicio, p.fim, c.modo === 'epoca', c.modo === 'epoca') : '',
      ordem: p ? p.inicio.ano * 100 + (p.inicio.mes ?? 0) + (c.modo === 'epoca' && p.inicio.mes ? (p.inicio.dia ?? 0) / 100 : 0) : 999999 }];
  }));
  return { resumos, cores: coresDosTrilhos(trilhosDosTrechos(trechos), capitulos.map((c) => ({ ...c, deTodos: ehEpoca(c) }))) };
}

export async function coresDosCapitulosNoBanco(usuario: Usuario, capitulos: Capitulo[]) {
  return (await agregadosDosCapitulos(usuario, capitulos)).cores;
}

const comFilhos = (c: Capitulo, capitulos: Capitulo[], incluir = true) => incluir ? capitulos.filter((x) => x.dentroDe === c.id).map((x) => x.id) : [];

export async function memoriasDoCapitulo(usuario: Usuario, c: Capitulo, capitulos: Capitulo[], incluirFilhos = true): Promise<Memoria[]> {
  const { results } = await db().prepare(`SELECT m.* FROM memorias m WHERE ${FILTRO_PUBLICADA}
    AND ${sqlMemoriaDoCapitulo('m', '?2', '?3', c.modo)} ORDER BY ${ORDEM_DA_LINHA}`)
    .bind(usuario.pessoa, JSON.stringify(c), ...(c.modo === 'reunido' ? [JSON.stringify(comFilhos(c, capitulos, incluirFilhos))] : [])).all<Record<string, unknown>>();
  return completar(results.map(lerMemoria), usuario);
}

/** Uma linha por capítulo: COUNT e as duas datas das pontas, sem completar nenhuma memória. */
export async function resumosDosCapitulos(usuario: Usuario, capitulos: Capitulo[]) {
  return (await agregadosDosCapitulos(usuario, capitulos)).resumos;
}

/**
 * A memória de antes e a de depois na linha do tempo, entre as publicadas que a pessoa vê: a mesma ordem de
 * listarMemorias, sem ler o acervo inteiro (causa 4 da medição M1: a página da memória lia todas as
 * memórias, com fotos, pessoas e relatos, só para achar as duas). Cada lado para na primeira que acha,
 * começando pelo índice da data (memorias_por_data). Sem mês ou sem dia vem antes, como em COALESCE(..., 0).
 */
export async function vizinhasDaMemoria(usuario: Usuario, memoria: Pick<Memoria, 'id' | 'ano' | 'mes' | 'dia' | 'criadaEm'>): Promise<{ antes?: Memoria; depois?: Memoria }> {
  const daqui = `(${ORDEM_DA_LINHA})`;
  const desta = '(?3, ?4, ?5, ?6, (SELECT rowid FROM memorias WHERE id = ?2))';
  const publicadas = `SELECT m.* FROM memorias m WHERE ${FILTRO_PUBLICADA} AND m.id <> ?2`;
  const valores = [usuario.pessoa, memoria.id, memoria.ano, memoria.mes ?? 0, memoria.dia ?? 0, memoria.criadaEm];
  const [antes, depois] = await db().batch<Record<string, unknown>>([
    db().prepare(`${publicadas} AND m.ano <= ?3 AND ${daqui} < ${desta} ORDER BY m.ano DESC, m.mes DESC, m.dia DESC, m.criada_em DESC, m.rowid DESC LIMIT 1`).bind(...valores),
    db().prepare(`${publicadas} AND m.ano >= ?3 AND ${daqui} > ${desta} ORDER BY m.ano, m.mes, m.dia, m.criada_em, m.rowid LIMIT 1`).bind(...valores),
  ]);
  const ler = (r: { results: Record<string, unknown>[] }) => (r.results[0] ? lerMemoria(r.results[0]) : undefined);
  return { antes: ler(antes), depois: ler(depois) };
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

/**
 * O que um lote faz com quem vê a memória (a visibilidade e as famílias). Só quem criou muda quem vê
 * (podeMudarQuemVe), e só a rota da memória, quando o público mudou de fato: "mudou". Numa memória aberta
 * a todos, quem pode corrigir marca ou tira famílias, que não restringem nada: "marcas", gravadas só se a
 * memória ainda estiver aberta a todos na hora do lote. Fora isso, o lote não toca no público: quem não
 * criou, ou quem salva por outro caminho (reações, sugestões, restaurar uma versão), grava a ficha e deixa
 * o público como está no banco, mesmo que ele tenha mudado depois da leitura (revisão Y2 do PR #160).
 */
export type GravarQuemVe = 'mudou' | 'marcas' | 'nao';

/** A memória ainda está aberta a todos na hora do lote: só então as marcas de família são gravadas. */
const AINDA_ABERTA = `EXISTS (SELECT 1 FROM memorias WHERE id = ?1 AND visibilidade = 'todos')`;

function comandosDeLigacao(id: string, dados: DadosDaMemoria, quemVe: GravarQuemVe = 'mudou'): D1PreparedStatement[] {
  const comandos = [db().prepare('DELETE FROM memoria_integrantes WHERE memoria_id = ?').bind(id)];
  if (quemVe === 'mudou') {
    comandos.push(db().prepare('DELETE FROM memoria_nucleos WHERE memoria_id = ?').bind(id));
    for (const n of dados.nucleos) {
      comandos.push(db().prepare('INSERT OR IGNORE INTO memoria_nucleos (memoria_id, nucleo_id) VALUES (?, ?)').bind(id, n));
    }
  } else if (quemVe === 'marcas') {
    comandos.push(db().prepare(`DELETE FROM memoria_nucleos WHERE memoria_id = ?1 AND ${AINDA_ABERTA}`).bind(id));
    for (const n of dados.nucleos) {
      comandos.push(db().prepare(`INSERT OR IGNORE INTO memoria_nucleos (memoria_id, nucleo_id) SELECT ?1, ?2 WHERE ${AINDA_ABERTA}`).bind(id, n));
    }
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
  comandos.push(comandoDaPrincipal(id));
  return comandos;
}

/**
 * Memória com foto sempre tem principal (docs/regras/formularios.md): sem nenhuma, a primeira vira a principal. No fim
 * do lote, para valer também com a foto que outra pessoa acrescentou entre a leitura e o lote (D8 da sessão Z).
 * Vai no lote da ficha, no de "Acrescentar fotos" e no das fotos pelo relato (Z2): a corrida tem dois lados.
 */
const comandoDaPrincipal = (memoriaId: string) =>
  db()
    .prepare(
      `UPDATE fotos SET principal = 1 WHERE id = (SELECT id FROM fotos WHERE memoria_id = ?1 AND removida_em IS NULL ORDER BY ordem, id LIMIT 1)
       AND NOT EXISTS (SELECT 1 FROM fotos WHERE memoria_id = ?1 AND removida_em IS NULL AND principal = 1)`,
    )
    .bind(memoriaId);

/**
 * Cria a memória num lote só. `antes`: o que a ficha cita e ainda não existe (a pessoa nova, o tema novo,
 * o laço aberto), gravado no mesmo lote; `junto`: o que vem depois dela (o relato de quem publica, os
 * avisos). Se um comando falha, nada fica (Y3 do PR #160).
 */
export async function criarMemoria(id: string, dados: DadosDaMemoria, usuario: Usuario, { antes = [], junto = [] }: { antes?: Comando[]; junto?: Comando[] } = {}): Promise<void> {
  await loteDaMemoria([
    ...antes,
    db()
      .prepare(
        `INSERT INTO memorias (id, titulo, ano, mes, dia, aproximada, tipo, tipo_outro, lugar, visibilidade, situacao, criada_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, dados.titulo, dados.ano, dados.mes ?? null, dados.dia ?? null, dados.aproximada ? 1 : 0, dados.tipo, dados.tipoOutro ?? null, dados.lugar ?? null, dados.visibilidade, dados.situacao, usuario.pessoa),
    marcarPublicacao(id),
    ...comandosDeLigacao(id, dados),
    ...junto,
  ]);
}

/** A data de publicação é a da primeira vez que a memória sai do rascunho, e não muda depois. */
const marcarPublicacao = (id: string) =>
  db().prepare(`UPDATE memorias SET publicada_em = datetime('now') WHERE id = ? AND situacao = 'publicada' AND publicada_em IS NULL`).bind(id);

/**
 * Atualiza a ficha, guardando a versão anterior no histórico. Fotos que saíram da lista vão para a lixeira.
 * `quemVe`: se o lote grava a visibilidade e as famílias (ver GravarQuemVe). Por padrão, não grava: a ficha
 * muda e o público fica como está no banco. "mudou" é só de quem criou.
 * `junto`: o que precisa gravar na mesma transação, como os relatos e os pedidos de uma mudança de quem vê
 * (comandosDaMudancaDeQuemVe): se um falhar, a memória continua com o público de antes (revisão Y do PR #160).
 * `antes`: o que a ficha cita e ainda não existe (a pessoa nova, o tema novo, o laço aberto), no mesmo lote.
 * `conferir`: o lote conta com a memória que leu (mudar quem vê, ou o relato que nasce junto): se ela mudou
 * no meio tempo, nada é gravado (MemoriaMudou), nem o que vai em `antes` e `junto` (Y3 do PR #160).
 */
export async function atualizarMemoria(
  anterior: Memoria,
  dados: DadosDaMemoria,
  usuario: Usuario,
  fotosRemovidas: number[],
  { junto = [], antes = [], quemVe = 'nao', conferir = false }: { junto?: Comando[]; antes?: Comando[]; quemVe?: GravarQuemVe; conferir?: boolean } = {},
): Promise<void> {
  if (quemVe === 'mudou' && anterior.criadaPor !== usuario.pessoa) throw new Error('Só quem criou muda quem pode ver.');
  const visibilidade = quemVe === 'mudou' ? ', visibilidade = ?' : '';
  await loteDaMemoria([
    // Mudar quem vê conta com os relatos que leu: se um relato nasceu ou mudou no meio tempo, o lote volta
    ...(quemVe === 'mudou' || conferir ? [conferirVersao(anterior.id, anterior.versao)] : []),
    ...antes,
    db()
      .prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('memoria', ?, ?, ?)`)
      .bind(anterior.id, JSON.stringify(anterior), usuario.pessoa),
    db()
      .prepare(
        `UPDATE memorias SET titulo = ?, ano = ?, mes = ?, dia = ?, aproximada = ?, tipo = ?, tipo_outro = ?, lugar = ?,
           situacao = ?${visibilidade}, atualizada_em = datetime('now') WHERE id = ?`,
      )
      .bind(
        dados.titulo,
        dados.ano,
        dados.mes ?? null,
        dados.dia ?? null,
        dados.aproximada ? 1 : 0,
        dados.tipo,
        dados.tipoOutro ?? null,
        dados.lugar ?? null,
        dados.situacao,
        ...(quemVe === 'mudou' ? [dados.visibilidade] : []),
        anterior.id,
      ),
    marcarPublicacao(anterior.id),
    ...fotosRemovidas.map((id) => db().prepare(`UPDATE fotos SET removida_em = datetime('now'), removida_por = ? WHERE id = ?`).bind(usuario.pessoa, id)),
    ...comandosDeLigacao(anterior.id, dados, quemVe),
    ...junto,
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

/**
 * Os ids dos temas com esses nomes, sem gravar nada: os que ainda não existem ganham o id aqui, e os
 * comandos que os criam vão no lote de quem os usa. Assim, um salvamento que perde a corrida não deixa
 * tema nenhum gravado (Y3 do PR #160).
 */
export async function resolverTemas(nomes: string[], usuario: Usuario): Promise<{ ids: string[]; comandos: Comando[] }> {
  if (nomes.length === 0) return { ids: [], comandos: [] };
  const existentes = await listarTemas();
  const ids = new Set(existentes.map((t) => t.id));
  const resultado: string[] = [];
  const comandos: Comando[] = [];
  for (const nome of nomes) {
    const igual = existentes.find((t) => t.nome.toLowerCase() === nome.toLowerCase() || t.id === criarSlug(nome));
    if (igual) {
      resultado.push(igual.id);
      continue;
    }
    const id = slugUnico(criarSlug(nome) || 'tema', ids);
    comandos.push(db().prepare('INSERT INTO temas (id, nome, criado_por) VALUES (?, ?, ?)').bind(id, nome, usuario.pessoa));
    ids.add(id);
    existentes.push({ id, nome });
    resultado.push(id);
  }
  return { ids: [...new Set(resultado)], comandos };
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

export async function salvarCapitulo(id: string, dados: DadosDoCapitulo, usuario: Usuario, novo: boolean, antes: Comando[] = []): Promise<void> {
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
    // Os temas novos do capítulo, no mesmo lote: se ele volta, nenhum tema fica gravado (sessão AA)
    ...antes,
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
    copias: lerCopias(f.copias),
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
export async function registrarFoto(chave: string, usuario: Usuario, tamanho: number | null = null, copias: Copias | null = null): Promise<number> {
  const resultado = await db()
    .prepare('INSERT INTO fotos (chave, enviada_por, tamanho, copias) VALUES (?, ?, ?, ?)')
    .bind(chave, usuario.pessoa, tamanho, copias ? gravarCopias(copias) : null)
    .run();
  return resultado.meta.last_row_id;
}

// --- Espaço das fotos e áudios (migração 070; regras em src/lib/espaco-dos-arquivos.ts) ---

/** Anota o retrato enviado, com o tamanho. A chave é a de integrantes.retrato, sem "retratos/". */
export async function registrarRetratoEnviado(chave: string, tamanho: number, usuario: Usuario, copia: CopiaDoRetrato | null = null): Promise<void> {
  await db()
    .prepare('INSERT OR IGNORE INTO retratos_enviados (chave, tamanho, enviado_por, copia) VALUES (?, ?, ?, ?)')
    .bind(chave, tamanho, usuario.pessoa, copia ? gravarCopiaDoRetrato(copia) : null)
    .run();
}

/**
 * Anota a cópia de um retrato de antes (o ajuste da Administração). O retrato de antes da contagem do espaço
 * ainda não tem linha: ela nasce aqui, com o tamanho da original. Nunca troca uma cópia que já existe.
 */
export async function guardarCopiaDoRetrato(chave: string, tamanhoDaOriginal: number, copia: CopiaDoRetrato, reserva: string): Promise<number> {
  // Só com a reserva ainda deste pedido (reservarCopias), e a reserva sai no mesmo lote
  const [r] = await db().batch([
    db()
      .prepare(
        `INSERT INTO retratos_enviados (chave, tamanho, copia)
         SELECT ?1, ?2, ?3 WHERE EXISTS (SELECT 1 FROM reservas_das_copias WHERE alvo = ?4 AND codigo = ?5)
         ON CONFLICT (chave) DO UPDATE SET copia = excluded.copia WHERE retratos_enviados.copia IS NULL`,
      )
      .bind(chave, tamanhoDaOriginal, gravarCopiaDoRetrato(copia), alvoDoRetrato(chave), reserva),
    db().prepare('DELETE FROM reservas_das_copias WHERE alvo = ? AND codigo = ?').bind(alvoDoRetrato(chave), reserva),
  ]);
  return r.meta.changes ?? 0;
}

/** O retrato está no ajuste? A rota das cópias só aceita o que o ajuste lista (como fotoEstaNoAjuste). */
export async function retratoEstaNoAjuste(usuario: Usuario, chave: string): Promise<boolean> {
  return (await listarRetratosSemCopia(usuario, chave)).includes(chave);
}

/** Este retrato já tem cópia? */
export async function retratoTemCopia(chave: string): Promise<boolean> {
  return Boolean(await db().prepare('SELECT 1 FROM retratos_enviados WHERE chave = ? AND copia IS NOT NULL').bind(chave).first());
}

/**
 * Os retratos de agora sem cópia que o administrador vê (o ajuste da Administração). Os de exemplo ficam de
 * fora: usam as cópias das fotos de exemplo. O retrato antigo, que já não é de ninguém, não aparece em tela.
 */
export async function listarRetratosSemCopia(usuario: Usuario, soEste: string | null = null): Promise<string[]> {
  const { results } = await db()
    .prepare(
      `SELECT i.id, i.retrato FROM integrantes i WHERE i.retrato IS NOT NULL AND i.retrato NOT LIKE 'exemplos/%'
         AND (?1 IS NULL OR i.retrato = ?1)
         AND NOT EXISTS (SELECT 1 FROM retratos_enviados r WHERE r.chave = i.retrato AND r.copia IS NOT NULL)
       ORDER BY i.id`,
    )
    .bind(soEste)
    .all<{ id: string; retrato: string }>();
  const naoVe = await pessoasQueONaoVe(usuario);
  return [...new Set((results as { id: string; retrato: string }[]).filter((r) => podeVerRetrato(r.id, naoVe)).map((r) => r.retrato))];
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
        (SELECT COALESCE(SUM(tamanho), 0) + COALESCE(SUM(json_extract(copias, '$.bytes')), 0) FROM fotos WHERE chave NOT LIKE 'exemplos/%') +
        (SELECT COALESCE(SUM(tamanho), 0) FROM audios WHERE chave NOT LIKE 'exemplos/%') +
        (SELECT COALESCE(SUM(tamanho), 0) + COALESCE(SUM(json_extract(copia, '$.bytes')), 0) FROM retratos_enviados WHERE chave NOT LIKE 'exemplos/%') AS bytes,
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
    copias: lerCopias(f.copias),
  }));
}

/**
 * Fotos pelo relato (docs/regras/relatos.md): prende ao relato as fotos da lista e, com o relato publicado, à
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
    // A principal é conferida no fim do lote, no banco: a foto que sai daqui pode ser a principal, e a única
    // foto da memória pode ter sido tirada entre a leitura e o lote (Z2, o outro lado da corrida do D8)
    comandoDaPrincipal(relato.memoriaId),
  ]);
  return validos.length;
}

/**
 * O usuário pode ver o arquivo desta chave? Foto solta: só quem enviou. Foto de memória: quem vê a memória.
 * Foto removida: só quem enviou. A foto que veio com um relato segue o relato (veORelato), como o áudio: a do
 * relato em nome de quem a pessoa não vê também fica de fora.
 */
export async function podeVerFoto(usuario: Usuario, chave: string): Promise<boolean> {
  return (await acessoAFoto(usuario, chave)) !== null;
}

/** O que a rota das fotos precisa saber de uma foto que a pessoa vê. */
export interface AcessoAFoto {
  /**
   * A foto pode ficar guardada no aparelho por 7 dias (decisão 3 do Gui, 23/11/2026): é de uma memória
   * publicada, fora da lixeira, não foi tirada da memória e não espera um relato em rascunho. Solta, de
   * rascunho, da lixeira ou removida: o navegador confere a permissão a cada uso, como antes.
   */
  guardar: boolean;
  /** As cópias menores, quando já existem (migração 110) */
  copias: Copias | null;
}

/**
 * podeVerFoto com o que a rota precisa: nada, para quem não vê (a mesma resposta de uma foto que não
 * existe), e, para quem vê, se a foto pode ficar guardada no aparelho e as cópias dela. As cópias seguem
 * exatamente a mesma conferência: a rota da cópia chama esta função com a chave da original.
 */
export async function acessoAFoto(usuario: Usuario, chave: string): Promise<AcessoAFoto | null> {
  const { results } = await db()
    .prepare(sqlDoAcessoAFoto())
    .bind(usuario.pessoa, chave, usuario.admin ? 1 : 0)
    .all<{ por: string | null; registrado_por: string | null; so_para_nucleos: string | null; copias: string | null; guardar: number }>();
  type Linha = { por: string | null; registrado_por: string | null; so_para_nucleos: string | null; copias: string | null; guardar: number };
  let linhas = results as Linha[];
  if (linhas.length === 0) return null;
  // A foto sem relato não depende de quem contou. A de relato fica só se a pessoa vê o relato: com a mesma
  // chave em mais de uma linha (as fotos de exemplo, nas prévias e na homologação), o guardar e as cópias
  // valem só pelas linhas que ela vê de fato (item 15 da revisão R-D1, sessão D1d)
  if (linhas.some((r) => r.por !== null)) {
    const naoVe = await pessoasQueONaoVe(usuario);
    linhas = linhas.filter((r) => r.por === null || veORelato({ por: r.por, registradoPor: r.registrado_por!, soParaNucleos: lerNucleosDoRelato(r.so_para_nucleos) }, usuario, naoVe));
    if (linhas.length === 0) return null;
  }
  // Uma foto de exemplo é dividida por várias memórias: basta uma publicada que a pessoa vê para guardar
  return { guardar: linhas.some((r) => Boolean(r.guardar)), copias: linhas.map((r) => lerCopias(r.copias)).find(Boolean) ?? null };
}

/**
 * A consulta de acessoAFoto: ?1 é quem olha, ?2 a chave e ?3 se quem olha administra. Exportada para o teste de
 * equivalência conferir o que o SQL devolve antes do filtro em TS (revisão MEM-2 da AC3), foto por foto.
 */
export const sqlDoAcessoAFoto = (): string =>
      `SELECT f.id AS foto, r.por, r.registrado_por, r.so_para_nucleos, f.copias,
         (f.removida_em IS NULL AND (f.relato_id IS NULL OR r.situacao = 'publicada') AND EXISTS (
           SELECT 1 FROM memorias m WHERE m.id = f.memoria_id AND m.situacao = 'publicada' AND m.excluida_em IS NULL
         )) AS guardar
       FROM fotos f LEFT JOIN relatos r ON r.id = f.relato_id WHERE f.chave = ?2 AND (
         (f.memoria_id IS NULL AND f.enviada_por = ?1 AND f.removida_em IS NULL)
         -- foto sem memória há mais de 30 dias: os administradores conferem antes de apagar (onda 2)
         OR (?3 = 1 AND ${FOTO_SOLTA})
         OR (
           -- foto removida: só quem enviou e quem removeu ainda veem, para poder devolvê-la à memória
           (f.removida_em IS NULL OR f.enviada_por = ?1 OR f.removida_por = ?1)
           AND EXISTS (SELECT 1 FROM memorias m WHERE m.id = f.memoria_id AND ${FILTRO_VISIVEL})
           -- a foto que veio com um relato que espera o sim do autor fica com o público antigo dele
           AND NOT EXISTS (SELECT 1 FROM relatos r WHERE r.id = f.relato_id AND NOT ${sqlEstaNoPublicoDoRelato('r', '?1')})
         )
       )`;

// --- As cópias menores das fotos que já existem (sessão D1b, 23/11/2026) ---

/**
 * As fotos sem cópia que o administrador vê, para o ajuste "Fazer as cópias das fotos que já existem":
 * uma por chave, das memórias que ele vê (as publicadas e os rascunhos dele), sem as removidas e sem as de
 * exemplo. Cada uma é conferida de novo pela rota das fotos ao baixar e pela rota das cópias ao enviar.
 */
export async function listarFotosSemCopia(usuario: Usuario, soEsta: string | null = null): Promise<string[]> {
  const { results } = await db()
    .prepare(
      `SELECT f.chave, r.por, r.registrado_por, r.so_para_nucleos FROM fotos f LEFT JOIN relatos r ON r.id = f.relato_id
       WHERE f.copias IS NULL AND f.removida_em IS NULL AND f.chave <> '' AND f.chave NOT LIKE 'exemplos/%'
         AND (?2 IS NULL OR f.chave = ?2)
         AND EXISTS (SELECT 1 FROM memorias m WHERE m.id = f.memoria_id AND ${FILTRO_VISIVEL})
       ORDER BY f.id`,
    )
    .bind(usuario.pessoa, soEsta)
    .all<{ chave: string; por: string | null; registrado_por: string | null; so_para_nucleos: string | null }>();
  const naoVe = await pessoasQueONaoVe(usuario);
  const chaves = new Set<string>();
  for (const r of results as { chave: string; por: string | null; registrado_por: string | null; so_para_nucleos: string | null }[]) {
    if (r.por !== null && !veORelato({ por: r.por, registradoPor: r.registrado_por!, soParaNucleos: lerNucleosDoRelato(r.so_para_nucleos) }, usuario, naoVe)) continue;
    chaves.add(r.chave);
  }
  return [...chaves];
}

/**
 * A foto está no ajuste (item 13b da revisão R-D1)? A rota das cópias só aceita o que o ajuste lista: foto de
 * memória que o administrador vê, fora da lixeira, não removida, sem cópia e fora dos exemplos. A foto solta
 * antiga e a removida, que acessoAFoto libera ao administrador para ele conferir, ficam de fora.
 */
export async function fotoEstaNoAjuste(usuario: Usuario, chave: string): Promise<boolean> {
  return (await listarFotosSemCopia(usuario, chave)).includes(chave);
}

/**
 * Anota as cópias de uma foto, em todas as linhas com essa chave que ainda não têm cópia, e solta a reserva,
 * num lote só. Só anota com a reserva ainda deste pedido (reservarCopias). Nunca troca cópias que já existem:
 * devolve quantas linhas mudaram (zero, se outra pessoa chegou antes).
 */
export async function guardarCopias(chave: string, copias: Copias, reserva: string): Promise<number> {
  const [r] = await db().batch([
    db()
      .prepare('UPDATE fotos SET copias = ?1 WHERE chave = ?2 AND copias IS NULL AND EXISTS (SELECT 1 FROM reservas_das_copias WHERE alvo = ?3 AND codigo = ?4)')
      .bind(gravarCopias(copias), chave, alvoDaFoto(chave), reserva),
    db().prepare('DELETE FROM reservas_das_copias WHERE alvo = ? AND codigo = ?').bind(alvoDaFoto(chave), reserva),
  ]);
  return r.meta.changes ?? 0;
}

// --- A reserva das cópias (item 13a da revisão R-D1, sessão D1d; migração 112) ---
//
// Dois envios ao mesmo tempo para a mesma foto passavam juntos pela conferência e os dois gravavam no bucket.
// Agora a rota reserva o alvo antes de gravar: só um pedido grava, e o outro recebe 409 sem gravar nada. A
// reserva de um pedido que morreu no meio vence sozinha depois de alguns minutos.

/** Os minutos que uma reserva vale. Um envio de cópias leva segundos. */
export const MINUTOS_DA_RESERVA_DAS_COPIAS = 5;
export const alvoDaFoto = (chave: string) => `foto:${chave}`;
export const alvoDoRetrato = (chave: string) => `retrato:${chave}`;

/** A reserva tomada (o código dela), ou por que não: a cópia já existe, ou outro pedido está fazendo. */
export type ReservaDasCopias = { codigo: string } | { recusa: 'feita' | 'reservada' };

/** A cópia deste alvo já existe? O SQL que a reserva confere, no mesmo lote em que reserva. */
function copiaJaFeita(alvo: string, parametro: 1 | 3): { sql: string; chave: string } {
  if (alvo.startsWith('foto:')) return { sql: `SELECT 1 FROM fotos WHERE chave = ?${parametro} AND copias IS NOT NULL`, chave: alvo.slice('foto:'.length) };
  if (alvo.startsWith('retrato:')) return { sql: `SELECT 1 FROM retratos_enviados WHERE chave = ?${parametro} AND copia IS NOT NULL`, chave: alvo.slice('retrato:'.length) };
  throw new Error(`Alvo de reserva desconhecido: ${alvo}`);
}

/**
 * Reserva o alvo para gravar as cópias, se a cópia ainda não existe e ninguém está fazendo (item 2 da revisão
 * D1f, 24/11/2026). A conferência e a reserva são uma operação só no banco: o INSERT só entra se a cópia não
 * existe, e o lote é uma transação, lida sem a guarda por pedido (um lote com gravação vai inteiro ao banco).
 * Antes, a conferência "ainda não tem cópia" reaproveitava a leitura guardada no começo do pedido, e um pedido
 * parado na leitura da original pegava a reserva que outro, já terminado, soltou, e gravava de novo no bucket.
 */
export async function reservarCopias(alvo: string): Promise<ReservaDasCopias> {
  const codigo = crypto.randomUUID();
  const feita = copiaJaFeita(alvo, 3);
  const conferencia = copiaJaFeita(alvo, 1);
  const [reserva, existe] = await db().batch([
    db()
      .prepare(
        `INSERT INTO reservas_das_copias (alvo, codigo) SELECT ?1, ?2 WHERE NOT EXISTS (${feita.sql})
         ON CONFLICT (alvo) DO UPDATE SET codigo = excluded.codigo, em = excluded.em
         WHERE reservas_das_copias.em < datetime('now', '-${MINUTOS_DA_RESERVA_DAS_COPIAS} minutes')`,
      )
      .bind(alvo, codigo, feita.chave),
    db().prepare(`SELECT EXISTS (${conferencia.sql}) AS feita`).bind(conferencia.chave),
  ]);
  if ((reserva.meta.changes ?? 0) > 0) return { codigo };
  return { recusa: (existe.results?.[0] as { feita?: number } | undefined)?.feita ? 'feita' : 'reservada' };
}

/** Solta a reserva, se ainda for deste pedido. */
export async function soltarReserva(alvo: string, codigo: string): Promise<void> {
  await db().prepare('DELETE FROM reservas_das_copias WHERE alvo = ? AND codigo = ?').bind(alvo, codigo).run();
}

/** Esta foto já tem cópias? */
export async function temCopias(chave: string): Promise<boolean> {
  return Boolean(await db().prepare('SELECT 1 FROM fotos WHERE chave = ? AND copias IS NOT NULL LIMIT 1').bind(chave).first());
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

// O "+" diante de f.relato_id faz o SQLite começar pelo índice das fotos sem memória, que são poucas, e
// não pelo das fotos sem relato, que são quase todas (3.079 linhas lidas no acervo cheio, contra nenhuma)
const SQL_ALGUMA_FOTO_SOLTA = `SELECT 1 AS ok FROM fotos f WHERE ${FOTO_SOLTA.replace('f.relato_id IS NULL', '+f.relato_id IS NULL')} LIMIT 1`;

/**
 * Se há alguma foto sem memória, sem contar todas: o número do retrato só precisa saber se a pendência
 * existe. Barato: a busca começa pelo índice das fotos sem memória (fotos_da_memoria) e para na primeira.
 * O mesmo filtro de FOTO_SOLTA; só a ordem da busca muda.
 */
export async function haFotoSolta(): Promise<boolean> {
  return Boolean(await db().prepare(SQL_ALGUMA_FOTO_SOLTA).first());
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
    publicoConhecido: lerPublicoConhecido(r.publico_conhecido),
    descartadoEm: (r.descartado_em as string | null | undefined) ?? null,
  };
}

/**
 * Relatos de uma memória: os publicados, mais os rascunhos de quem pede. O de quem a pessoa não vê fica de
 * fora (ver veORelato), e a memória que ela não vê não entrega relato nenhum, mesmo a quem chama sem
 * conferir antes (revisão Y2 do PR #160).
 */
export async function listarRelatos(usuario: Usuario, memoriaId: string): Promise<Relato[]> {
  const [{ results }, naoVe] = await Promise.all([
    db()
      .prepare(
        `SELECT r.* FROM relatos r JOIN memorias m ON m.id = r.memoria_id
         WHERE r.memoria_id = ?2 AND ${FILTRO_VISIVEL} AND ${sqlRelatoAberto('r', '?1')} ORDER BY r.criado_em, r.id`,
      )
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
      `SELECT * FROM relatos WHERE memoria_id = ? AND por = ? AND ${sqlRelatoAberto('', '?')}
       ORDER BY situacao = 'publicada' DESC LIMIT 1`,
    )
    .bind(memoriaId, por, usuario.pessoa)
    .first<Record<string, unknown>>();
  return linha ? lerRelato(linha) : undefined;
}

// --- Sua conta ---

/** A conta mostra dez itens de cada lista. Contagens inteiras ficam no SQL; só os itens mostrados são completados. */
export async function memoriasDaConta(usuario: Usuario) {
  const { naoVe, excluidas } = naoVeParaSql(await pessoasQueONaoVe(usuario));
  const foto = `f.enviada_por = ?1 AND f.removida_em IS NULL AND NOT EXISTS (
    SELECT 1 FROM relatos r WHERE r.id = f.relato_id AND r.situacao = 'publicada' AND NOT ${sqlVeORelato()})`;
  const valores = [usuario.pessoa, naoVe, excluidas];
  const [contas, criadas, fotos, rascunhos] = await db().batch<Record<string, unknown>>([
    db().prepare(`SELECT (SELECT COUNT(*) FROM memorias m WHERE ${FILTRO_PUBLICADA} AND m.criada_por = ?1) AS memorias,
      (SELECT COUNT(*) FROM fotos f JOIN memorias m ON m.id = f.memoria_id WHERE ${FILTRO_PUBLICADA} AND ${foto}) AS fotos`).bind(...valores),
    db().prepare(`SELECT m.id FROM memorias m WHERE ${FILTRO_PUBLICADA} AND m.criada_por = ?1 ORDER BY ${ORDEM_INVERSA} LIMIT 10`).bind(usuario.pessoa),
    db().prepare(`SELECT m.id AS memoria, f.id FROM fotos f JOIN memorias m ON m.id = f.memoria_id WHERE ${FILTRO_PUBLICADA} AND ${foto}
      ORDER BY ${ORDEM_INVERSA}, f.principal, f.ordem DESC, f.id DESC LIMIT 10`).bind(...valores),
    db().prepare(`SELECT m.id FROM memorias m WHERE ${FILTRO_VISIVEL} AND m.situacao = 'rascunho' ORDER BY ${ORDEM_DA_LINHA}`).bind(usuario.pessoa),
  ]);
  const ids = [...new Set([...criadas.results.map((r) => r.id), ...fotos.results.map((r) => r.memoria), ...rascunhos.results.map((r) => r.id)])];
  const { results } = await db().prepare(`SELECT m.* FROM memorias m WHERE ${FILTRO_VISIVEL}
    AND m.id IN (SELECT value FROM json_each(?2)) ORDER BY ${ORDEM_DA_LINHA}`).bind(usuario.pessoa, JSON.stringify(ids)).all<Record<string, unknown>>();
  const memorias = await completar(results.map(lerMemoria), usuario);
  const porId = new Map(memorias.map((m) => [m.id, m]));
  const de = (lista: Record<string, unknown>[]) => new Set(lista.map((r) => r.id));
  const criadasIds = de(criadas.results), rascunhosIds = de(rascunhos.results);
  return {
    totais: contas.results[0] as unknown as { memorias: number; fotos: number },
    criadas: memorias.filter((m) => criadasIds.has(m.id)),
    rascunhos: memorias.filter((m) => rascunhosIds.has(m.id)),
    fotos: fotos.results.map((f) => ({ memoria: porId.get(f.memoria as string)!, foto: porId.get(f.memoria as string)!.fotos.find((x) => x.id === f.id)! })).reverse(),
  };
}

export async function relatosDaConta(usuario: Usuario) {
  const base = `FROM relatos r JOIN memorias m ON m.id = r.memoria_id WHERE r.registrado_por = ?1
    AND r.descartado_em IS NULL AND ${FILTRO_VISIVEL} AND ${sqlVeORelato('r', '?1', "'[]'", "'[]'")}`;
  const [conta, publicados, rascunhos] = await db().batch<Record<string, unknown>>([
    db().prepare(`SELECT COUNT(*) AS n ${base} AND r.situacao = 'publicada' AND m.situacao = 'publicada'`).bind(usuario.pessoa),
    db().prepare(`SELECT r.*, m.titulo ${base} AND r.situacao = 'publicada' AND m.situacao = 'publicada' ORDER BY r.atualizado_em DESC, r.id LIMIT 10`).bind(usuario.pessoa),
    db().prepare(`SELECT r.*, m.titulo ${base} AND r.situacao = 'rascunho' ORDER BY r.atualizado_em DESC, r.id`).bind(usuario.pessoa),
  ]);
  const ler = (r: Record<string, unknown>) => ({ ...lerRelato(r), titulo: r.titulo as string });
  return { total: Number(conta.results[0].n), publicados: publicados.results.map(ler), rascunhos: rascunhos.results.map(ler) };
}

/** A conta só mostra a frase da lixeira. A página da lixeira mantém sua leitura completa. */
export async function resumoDaLixeira(usuario: Usuario) {
  const [memorias, relatos] = await db().batch<{ n: number; minhas: string }>([
    db().prepare(`SELECT COUNT(*) AS n, json_group_array(m.id) FILTER (WHERE m.excluida_por = ?1) AS minhas
      FROM memorias m WHERE m.excluida_em IS NOT NULL AND ${FILTRO_SEM_LIXEIRA}`).bind(usuario.pessoa),
    db().prepare(`SELECT COUNT(*) AS n FROM relatos r JOIN memorias m ON m.id = r.memoria_id
      WHERE r.situacao = 'rascunho' AND r.registrado_por = ?1 AND r.descartado_em IS NOT NULL
      AND ${FILTRO_PUBLICADA} AND ${sqlVeORelato('r', '?1', "'[]'", "'[]'")}`).bind(usuario.pessoa),
  ]);
  const minhas = (JSON.parse(memorias.results[0].minhas) as string[]).map((id) => ({ id }));
  return { memorias: memorias.results[0].n, relatos: relatos.results[0].n, minhas };
}

/** Os relatos que a pessoa registrou (os dela e os que escreveu por outra pessoa), em memórias que ela vê. */
export async function listarRelatosRegistradosPor(usuario: Usuario): Promise<(Relato & { titulo: string })[]> {
  const { results } = await db()
    .prepare(
      `SELECT r.*, m.titulo FROM relatos r JOIN memorias m ON m.id = r.memoria_id
       WHERE r.registrado_por = ?1 AND r.descartado_em IS NULL AND ${FILTRO_VISIVEL} ORDER BY r.atualizado_em DESC`,
    )
    .bind(usuario.pessoa)
    .all<Record<string, unknown>>();
  return results.map((r: Record<string, unknown>) => ({ ...lerRelato(r), titulo: r.titulo as string }));
}

export async function listarRascunhosDeRelato(usuario: Usuario): Promise<(Relato & { titulo: string })[]> {
  const { results } = await db()
    .prepare(
      `SELECT r.*, m.titulo FROM relatos r JOIN memorias m ON m.id = r.memoria_id
       WHERE r.situacao = 'rascunho' AND r.registrado_por = ?1 AND r.descartado_em IS NULL AND ${FILTRO_PUBLICADA} ORDER BY r.atualizado_em DESC`,
    )
    .bind(usuario.pessoa)
    .all<Record<string, unknown>>();
  return results.map((r) => ({ ...lerRelato(r), titulo: r.titulo as string }));
}

/**
 * O rascunho que a pessoa escreveu em nome de "por" e que ficou para trás porque outra pessoa publicou o
 * relato dele (resposta do Gui à P4 do QA de 23/11/2026). Só quem escreveu o rascunho o recebe.
 */
export async function obterRascunhoQueFicou(memoriaId: string, por: string, usuario: Usuario): Promise<Relato | undefined> {
  const linha = await db()
    .prepare(
      `SELECT * FROM relatos r WHERE r.memoria_id = ?1 AND r.por = ?2 AND r.registrado_por = ?3 AND r.situacao = 'rascunho' AND r.descartado_em IS NULL
       AND EXISTS (SELECT 1 FROM relatos p WHERE p.memoria_id = r.memoria_id AND p.por = r.por AND p.situacao = 'publicada' AND p.registrado_por <> r.registrado_por)`,
    )
    .bind(memoriaId, por, usuario.pessoa)
    .first<Record<string, unknown>>();
  return linha ? lerRelato(linha) : undefined;
}

/**
 * Descartar o rascunho que ficou para trás: vai para a lixeira de quem o escreveu, e nada é apagado. Na
 * lixeira ele fica parado, fora da conta da espera (comandosDaMudancaDeQuemVe), e guarda o público que já
 * teve até aqui, para voltar com o que a regra der a ele quando for restaurado (revisão Y do PR #160).
 */
export async function descartarRascunhoDeRelato(relato: Relato, memoria: Publico & { versao: number }): Promise<void> {
  const conhecido = gravarPublicoConhecido(publicoConhecidoAntes(relato, memoria));
  await loteDaMemoria([
    conferirVersao(relato.memoriaId, memoria.versao),
    db().prepare(`UPDATE relatos SET descartado_em = datetime('now'), publico_conhecido = ? WHERE id = ? AND situacao = 'rascunho'`).bind(conhecido, relato.id),
  ]);
}

/** Os rascunhos de relato que a pessoa descartou, em memórias que ela vê: a lixeira dela. */
export async function listarRascunhosDeRelatoDescartados(usuario: Usuario): Promise<(Relato & { titulo: string; descartadoEm: string })[]> {
  const { results } = await db()
    .prepare(
      `SELECT r.*, m.titulo FROM relatos r JOIN memorias m ON m.id = r.memoria_id
       WHERE r.situacao = 'rascunho' AND r.registrado_por = ?1 AND r.descartado_em IS NOT NULL AND ${FILTRO_PUBLICADA}
       ORDER BY r.descartado_em DESC`,
    )
    .bind(usuario.pessoa)
    .all<Record<string, unknown>>();
  return results.map((r) => ({ ...lerRelato(r), titulo: r.titulo as string, descartadoEm: r.descartado_em as string }));
}

/**
 * Restaurar o rascunho descartado: volta a ser de quem o escreveu, com o público que a regra dá a ele
 * agora, como um relato que ficou parado enquanto a memória mudava (relatoDepoisDaMudanca, a partir do
 * público que ele guardou ao ir para a lixeira). Se passou a esperar, quem o escreveu recebe o pedido
 * para liberar, de quem criou a memória; se a espera perdeu o sentido, o pedido sai da lista.
 */
export async function restaurarRascunhoDeRelato(relato: Relato, memoria: Publico & { criadaPor: string; versao: number }, paraQuem: (conhecido: PublicoConhecido) => string): Promise<void> {
  // Sem público antigo além do que ele guardou: a conta parte do público conhecido dele
  const novo = relatoDepoisDaMudanca(relato, { visibilidade: 'nucleos', nucleos: [] }, memoria, memoria.criadaPor);
  const jaRecusou = jaRecusouEstePublico(memoria, (await ultimasRespostas([relato.id])).get(relato.id));
  await loteDaMemoria([
    conferirVersao(relato.memoriaId, memoria.versao),
    db()
      .prepare('UPDATE relatos SET descartado_em = NULL, so_para_nucleos = ?, publico_conhecido = ? WHERE id = ?')
      .bind(gravarEspera(novo.soParaNucleos), gravarPublicoConhecido(novo.publicoConhecido), relato.id),
    ...comandosDosPedidos(relato, novo, { memoriaId: relato.memoriaId, de: memoria.criadaPor, paraQuem: paraQuem(novo.publicoConhecido), jaRecusou }),
  ]);
}

/**
 * Os pedidos para liberar que acompanham a nova situação de um relato: o que espera tem um pedido na lista,
 * com o público de agora, porque "Liberar para quem passou a ver" libera para quem vê a memória agora
 * (revisão Y do PR #160); o que deixou de esperar tem o pedido aberto tirado da lista, sem resposta. O
 * histórico guarda uma linha por ciclo de ampliar (decisão do Gui, 22/11/2026): o pedido aberto é o mesmo
 * até a resposta ou até a espera acabar, e o índice da migração 108 garante um só. Depois de "Manter como
 * estava", o relato que espera só ganha pedido novo quando o público é maior do que o perguntado
 * (`jaRecusou`, ver jaRecusouEstePublico, decisão do Gui de 22/11/2026); quando quem criou restringe para
 * um público que cabe no recusado, o pedido aberto sai da lista sem resposta (Y3 do PR #160).
 */
function comandosDosPedidos(
  relato: Relato,
  novo: { soParaNucleos: string[] | null },
  pedido: { memoriaId: string; de: string; paraQuem: string; jaRecusou: boolean },
) {
  if (novo.soParaNucleos && pedido.jaRecusou) {
    // O público de agora cabe num que a pessoa já respondeu com "Manter" (decisão do Gui, 22/11/2026): o
    // pedido aberto, feito para um público maior, sai da lista sem resposta, e o relato fica como ela escolheu
    return [db().prepare(`UPDATE avisos SET resolvido_em = datetime('now') WHERE relato_id = ? AND tipo = 'liberar-relato' AND resolvido_em IS NULL`).bind(relato.id)];
  }
  if (novo.soParaNucleos) {
    return [
      db()
        .prepare(`UPDATE avisos SET dados = json_set(COALESCE(dados, '{}'), '$.paraQuem', ?) WHERE relato_id = ? AND tipo = 'liberar-relato' AND resolvido_em IS NULL`)
        .bind(pedido.paraQuem, relato.id),
      db()
        // Um pedido aberto por relato, garantido pelo índice da migração 108: se já houver um, fica ele
        .prepare(`INSERT INTO avisos (para, tipo, memoria_id, relato_id, de, dados) VALUES (?, 'liberar-relato', ?, ?, ?, ?) ON CONFLICT DO NOTHING`)
        .bind(relato.registradoPor, pedido.memoriaId, relato.id, pedido.de, JSON.stringify({ paraQuem: pedido.paraQuem })),
    ];
  }
  if (relato.soParaNucleos) {
    return [db().prepare(`UPDATE avisos SET resolvido_em = datetime('now') WHERE relato_id = ? AND tipo = 'liberar-relato' AND resolvido_em IS NULL`).bind(relato.id)];
  }
  return [];
}

/** A última resposta ao pedido de cada relato, com o público que o pedido mostrava (ver jaRecusouEstePublico). */
async function ultimasRespostas(relatoIds: number[]): Promise<Map<number, { resposta: string; publico: Publico | null }>> {
  if (relatoIds.length === 0) return new Map();
  const { results } = await db()
    .prepare(
      `SELECT relato_id, resposta, json_extract(dados, '$.publico') AS publico FROM avisos
       WHERE tipo = 'liberar-relato' AND resposta IS NOT NULL AND relato_id IN (SELECT value FROM json_each(?)) ORDER BY id`,
    )
    .bind(JSON.stringify(relatoIds))
    .all<{ relato_id: number; resposta: string; publico: string | null }>();
  // Em ordem, a última de cada relato fica por cima
  type Linha = { relato_id: number; resposta: string; publico: string | null };
  return new Map((results as Linha[]).map((r) => [Number(r.relato_id), { resposta: r.resposta, publico: r.publico ? (JSON.parse(r.publico) as Publico) : null }]));
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
  // A rota do relato confere a versão da memória que leu, como os outros lotes (Y3 do PR #160): se a memória
  // mudou depois da leitura, nada é gravado (MemoriaMudou), e a rota refaz a conta com a memória de agora.
  // `nasce`: o relato novo que espera o sim de quem escreveu (relatoQueNasce), com o pedido
  // `envio`: a chave do envio único do formulário sem script (migração 109; a rota a faz do código da página, de
  // quem envia, do relato e do texto): repetida, nada é gravado (EnvioRepetido)
  // `junto`: o que grava no mesmo lote do relato, depois dele (as mensagens do envio sem script, para a falha
  // não deixar a mensagem só no texto do relato com o código do envio já gasto; fila da revisão Z2, sessão AA)
  { conferir, nasce, envio, junto = [] }: { conferir?: number; nasce?: RelatoQueNasceEsperando; envio?: string; junto?: Comando[] } = {},
): Promise<void> {
  const doEnvio = envio ? comandosDoEnvio(envio) : [];
  try {
    if (conferir === undefined) {
      await db().batch([...doEnvio, ...comandosDoRelato(memoriaId, por, texto, situacao, usuario, anterior, versao, { nasce }), ...junto]);
      return;
    }
    // Conferir a versão também a sobe: o relato novo dispensa a subida sem conferência
    await loteDaMemoria([conferirVersao(memoriaId, conferir), ...doEnvio, ...comandosDoRelato(memoriaId, por, texto, situacao, usuario, anterior, versao, { nasce, subir: false }), ...junto]);
  } catch (erro) {
    if (/UNIQUE constraint failed: envios\.codigo\b/.test(String((erro as Error)?.message ?? erro))) throw new EnvioRepetido();
    throw erro;
  }
}

/** O mesmo envio chegou de novo (o toque duplo sem script): o lote voltou, e nada foi gravado de novo. */
export class EnvioRepetido extends Error {}

/**
 * A chave de um envio único (migração 109): o resumo do código da página junto com o que mais identifica o
 * envio (quem envia, o quê, o conteúdo). O resumo não se desfaz: nem o código nem o conteúdo ficam na tabela.
 */
export async function chaveDoEnvioUnico(...partes: unknown[]): Promise<string> {
  const resumo = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(partes)));
  return [...new Uint8Array(resumo)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** O envio com esta chave já foi gravado: o toque duplo responde como o primeiro, sem gravar. */
export async function envioJaGravado(chave: string): Promise<boolean> {
  return Boolean(await db().prepare('SELECT 1 AS ja FROM envios WHERE codigo = ?').bind(chave).first());
}

/** O lote voltou porque a chave do envio já estava na tabela (outro toque igual gravou antes). */
export const envioRepetidoNoLote = (erro: unknown): boolean => /UNIQUE constraint failed: envios\.codigo\b/.test(String((erro as Error)?.message ?? erro));

/** Guarda a chave do envio no lote e tira as de mais de dois dias (migração 109). */
export const comandosDoEnvio = (codigo: string): Comando[] => [
  db().prepare(`DELETE FROM envios WHERE em < datetime('now', '-2 days')`),
  db().prepare('INSERT INTO envios (codigo) VALUES (?)').bind(codigo),
];

/** O relato novo que nasce esperando: só para estas famílias, com o pedido de quem criou a memória. */
export interface RelatoQueNasceEsperando {
  soParaNucleos: string[];
  de: string;
  paraQuem: string;
}

/**
 * Os públicos que a memória já teve, do histórico e o de agora, como chaves (chaveDoPublico). Um só quer
 * dizer que quem vê a memória nunca mudou.
 */
export async function publicosQueAMemoriaJaTeve(memoria: { id: string } & Publico): Promise<Set<string>> {
  const { results } = await db()
    .prepare(`SELECT json_extract(dados, '$.visibilidade') AS visibilidade, json_extract(dados, '$.nucleos') AS nucleos FROM versoes WHERE tipo = 'memoria' AND item_id = ?`)
    .bind(memoria.id)
    .all<{ visibilidade: string | null; nucleos: string | null }>();
  const chaves = new Set([chaveDoPublico(memoria)]);
  for (const v of results as { visibilidade: string | null; nucleos: string | null }[]) {
    // A versão sem o público (de antes de ele entrar na ficha) não diz nada: conta como uma mudança
    if (v.visibilidade !== 'todos' && v.visibilidade !== 'nucleos') chaves.add('desconhecido');
    else chaves.add(chaveDoPublico({ visibilidade: v.visibilidade, nucleos: v.nucleos ? (JSON.parse(v.nucleos) as string[]) : [] }));
  }
  return chaves;
}

/**
 * O relato como comandos: o que salvarRelato grava, para quem precisa gravar junto com outra coisa (a rota
 * da memória grava o relato de quem publica no mesmo lote da ficha, Y3 do PR #160).
 */
export function comandosDoRelato(
  memoriaId: string,
  por: string,
  texto: string,
  situacao: 'rascunho' | 'publicada',
  usuario: Usuario,
  anterior: Relato | undefined,
  versao: { guardar: boolean; mensagens?: Mensagem[] } = { guardar: true },
  { nasce, subir = true }: { nasce?: RelatoQueNasceEsperando; subir?: boolean } = {},
): Comando[] {
  // A data de publicação é a da primeira vez que o relato sai do rascunho, e não muda depois
  const marcar = `UPDATE relatos SET publicado_em = datetime('now') WHERE situacao = 'publicada' AND publicado_em IS NULL`;
  if (!anterior) {
    const esperando = gravarEspera(nasce?.soParaNucleos);
    // O relato que nasce esperando (relatoQueNasce): só para o público que a página mostrava, que é também
    // o único que o viu, e o pedido de sempre para quem o escreveu
    const doRelato = `SELECT MAX(id) FROM relatos WHERE memoria_id = ?1 AND por = ?2 AND registrado_por = ?3 AND descartado_em IS NULL`;
    return [
      db()
        .prepare('INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, so_para_nucleos, publico_conhecido) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(memoriaId, por, usuario.pessoa, texto, situacao, esperando, esperando),
      db().prepare(`${marcar} AND memoria_id = ? AND por = ? AND registrado_por = ?`).bind(memoriaId, por, usuario.pessoa),
      ...(nasce
        ? [
            db()
              .prepare(`INSERT INTO avisos (para, tipo, memoria_id, relato_id, de, dados) VALUES (?3, 'liberar-relato', ?1, (${doRelato}), ?4, ?5) ON CONFLICT DO NOTHING`)
              .bind(memoriaId, por, usuario.pessoa, nasce.de, JSON.stringify({ paraQuem: nasce.paraQuem })),
          ]
        : []),
      // Um relato que nasce agora não estava na leitura de quem muda quem vê ao mesmo tempo: aquele lote volta e refaz a conta
      ...(subir ? [subirVersao(memoriaId)] : []),
    ];
  }
  return [
    ...(versao.guardar
      ? [db().prepare(`INSERT INTO versoes (tipo, item_id, dados, autor) VALUES ('relato', ?, ?, ?)`).bind(String(anterior.id), JSON.stringify(versao.mensagens ? { ...anterior, mensagens: versao.mensagens } : anterior), usuario.pessoa)]
      : []),
    db().prepare(`UPDATE relatos SET texto = ?, situacao = ?, atualizado_em = datetime('now') WHERE id = ?`).bind(texto, situacao, anterior.id),
    db().prepare(`${marcar} AND id = ?`).bind(anterior.id),
  ];
}

/** O relato que esta pessoa registrou em nome de "por" nesta memória: é nele que entram os áudios dela. */
export async function obterRelatoRegistradoPor(memoriaId: string, por: string, usuario: Usuario): Promise<Relato | undefined> {
  const linha = await db()
    .prepare('SELECT * FROM relatos WHERE memoria_id = ? AND por = ? AND registrado_por = ? AND descartado_em IS NULL LIMIT 1')
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
 * O relato num lote: o id, quando ele já existe, ou a consulta que o acha no próprio lote em que nasce (o
 * relato que esta pessoa registrou em nome de "por" nesta memória, como obterRelatoRegistradoPor). Assim a
 * rota da memória grava o relato, os áudios e as mensagens dele no mesmo lote da ficha (D1, revisões do
 * PR #160): se o lote falha, nada fica, e o áudio continua solto para a nova tentativa.
 */
export type RelatoNoLote = number | { memoriaId: string; por: string; registradoPor: string };
function relatoNoLote(relato: RelatoNoLote): { sql: string; valores: (string | number)[] } {
  if (typeof relato === 'number') return { sql: '?', valores: [relato] };
  return {
    sql: '(SELECT MAX(id) FROM relatos WHERE memoria_id = ? AND por = ? AND registrado_por = ? AND descartado_em IS NULL)',
    valores: [relato.memoriaId, relato.por, relato.registradoPor],
  };
}

/**
 * Os áudios da lista que podem entrar no relato, na ordem dela: só os que a própria pessoa enviou para esta
 * memória (ou ainda soltos), e que não são de outro relato. `relatoId` vazio: o relato ainda vai nascer.
 */
export async function audiosQueEntram(relatoId: number | null, memoriaId: string, itens: { id: number; transcricao?: string }[], usuario: Usuario): Promise<{ id: number; transcricao?: string }[]> {
  const ids = itens.map((i) => i.id);
  const { results } = await db()
    .prepare(
      `SELECT id FROM audios WHERE removido_em IS NULL AND enviado_por = ? AND (memoria_id = ? OR memoria_id IS NULL)
       AND (relato_id IS NULL OR relato_id = ?) AND id IN (${ids.length ? ids.map(() => '?').join(', ') : 'NULL'})`,
    )
    .bind(usuario.pessoa, memoriaId, relatoId, ...ids)
    .all<{ id: number }>();
  const aceitos = new Set(results.map((r: { id: number }) => r.id));
  return itens.filter((i) => aceitos.has(i.id));
}

/**
 * Os comandos que ligam ao relato os áudios aceitos (audiosQueEntram), na ordem e com a transcrição de cada
 * um, e marcam como removidos os que eram do relato e saíram da lista.
 */
export function comandosDosAudios(relato: RelatoNoLote, memoriaId: string, aceitos: { id: number; transcricao?: string }[]): Comando[] {
  const r = relatoNoLote(relato);
  return [
    // A conferência na hora do lote (fila da revisão Z2, sessão AA): se um áudio da lista já não está solto
    // nem neste relato (outro pedido igual o levou para a memória dele no meio tempo), a versão sobe dois
    // degraus, o gatilho da migração 107 recusa, e o lote inteiro volta (MemoriaMudou). A nova tentativa lê o
    // banco de agora: o áudio fica preso a uma memória só, e nenhuma mensagem aponta para um áudio que não é
    // do relato
    ...(aceitos.length
      ? [
          db()
            .prepare(
              `UPDATE memorias SET versao = versao + 2 WHERE id = ? AND EXISTS (SELECT 1 FROM audios WHERE id IN (${aceitos.map(() => '?').join(', ')})
               AND NOT (removido_em IS NULL AND (memoria_id IS NULL OR memoria_id = ?) AND (relato_id IS NULL OR relato_id = ${r.sql})))`,
            )
            .bind(memoriaId, ...aceitos.map((i) => i.id), memoriaId, ...r.valores),
        ]
      : []),
    db()
      // Sem nenhum áudio que fica, a lista some: "id NOT IN (NULL)" nunca é verdadeiro e o último áudio não saía
      .prepare(`UPDATE audios SET removido_em = datetime('now') WHERE relato_id = ${r.sql} AND removido_em IS NULL${aceitos.length ? ` AND id NOT IN (${aceitos.map(() => '?').join(', ')})` : ''}`)
      .bind(...r.valores, ...aceitos.map((i) => i.id)),
    ...aceitos.map((item, ordem) =>
      db()
        .prepare(`UPDATE audios SET relato_id = ${r.sql}, memoria_id = ?, ordem = ?, transcricao = ? WHERE id = ?`)
        .bind(...r.valores, memoriaId, ordem, item.transcricao?.trim() || null, item.id),
    ),
  ];
}

/**
 * Liga ao relato os áudios da lista, na ordem dela e com a transcrição de cada um, e marca como removidos
 * os que eram do relato e saíram da lista. Só entram áudios que a própria pessoa enviou para esta memória.
 * Devolve quantos da lista foram aceitos.
 */
export async function ligarAudios(relatoId: number, memoriaId: string, itens: { id: number; transcricao?: string }[], usuario: Usuario): Promise<number> {
  // Um áudio que outro pedido levou no meio tempo recusa o lote (comandosDosAudios): a lista é lida de novo,
  // já sem ele
  for (let vez = 1; ; vez++) {
    const validos = await audiosQueEntram(relatoId, memoriaId, itens, usuario);
    try {
      await loteDaMemoria(comandosDosAudios(relatoId, memoriaId, validos));
      return validos.length;
    } catch (erro) {
      if (!(erro instanceof MemoriaMudou) || vez >= 3) throw erro;
    }
  }
}

/**
 * Quem pode ouvir: o áudio solto, só quem enviou; o áudio de um relato, quem vê o relato (publicado, ou o
 * rascunho de quem registrou) numa memória que vê; o removido, só quem enviou.
 */
export async function podeOuvirAudio(usuario: Usuario, chave: string): Promise<boolean> {
  return (await acessoAoAudio(usuario, chave)) !== null;
}

/**
 * podeOuvirAudio com o que a rota precisa: nada, para quem não pode ouvir (a mesma resposta de um áudio que
 * não existe), e, para quem pode, se o áudio pode ficar guardado no aparelho por 7 dias (decisão do Gui,
 * 23/11/2026, a mesma regra das fotos): é de um relato publicado numa memória publicada, fora da lixeira, e
 * não foi tirado do relato. Solto, de rascunho ou removido: o navegador confere a cada uso, como antes.
 */
export async function acessoAoAudio(usuario: Usuario, chave: string): Promise<{ guardar: boolean } | null> {
  // O áudio do relato de quem a pessoa não vê também fica de fora (ver veORelato)
  const { results } = await db()
    .prepare(
      `SELECT r.por, r.registrado_por, r.so_para_nucleos,
         (a.removido_em IS NULL AND EXISTS (
           SELECT 1 FROM relatos r3 JOIN memorias m3 ON m3.id = r3.memoria_id
           WHERE r3.id = a.relato_id AND r3.situacao = 'publicada' AND m3.situacao = 'publicada' AND m3.excluida_em IS NULL
         )) AS guardar
       FROM audios a LEFT JOIN relatos r ON r.id = a.relato_id WHERE a.chave = ?2 AND (
         (a.relato_id IS NULL AND a.enviado_por = ?1)
         OR (
           (a.removido_em IS NULL OR a.enviado_por = ?1)
           AND EXISTS (
             SELECT 1 FROM relatos r2 JOIN memorias m ON m.id = r2.memoria_id
             WHERE r2.id = a.relato_id AND ${sqlRelatoAberto('r2', '?1', { descartadoTambem: true })} AND ${FILTRO_VISIVEL}
           )
         )
       )`,
    )
    .bind(usuario.pessoa, chave)
    .all<{ por: string | null; registrado_por: string | null; so_para_nucleos: string | null; guardar: number }>();
  type Linha = { por: string | null; registrado_por: string | null; so_para_nucleos: string | null; guardar: number };
  let linhas = results as Linha[];
  if (linhas.length === 0) return null;
  // O áudio solto não tem relato
  if (!linhas.some((r) => r.por === null)) {
    const naoVe = await pessoasQueONaoVe(usuario);
    linhas = linhas.filter((r) => veORelato({ por: r.por!, registradoPor: r.registrado_por!, soParaNucleos: lerNucleosDoRelato(r.so_para_nucleos) }, usuario, naoVe));
    if (linhas.length === 0) return null;
  }
  // Um áudio de exemplo é dividido por vários relatos: basta um publicado que a pessoa ouve para guardar
  return { guardar: linhas.some((r) => Boolean(r.guardar)) };
}

/** Os áudios em que uma pessoa fala (os dos relatos dela), entre as memórias que quem pede vê. */
export async function listarAudiosDe(usuario: Usuario, pessoaId: string): Promise<(Audio & { memoriaTitulo: string; memoriaId: string })[]> {
  const { results } = await db()
    .prepare(
      `SELECT a.*, m.id AS memoria, m.titulo AS memoria_titulo, r.por AS relato_por, r.registrado_por AS relato_registrado_por, r.so_para_nucleos AS relato_so FROM audios a
       JOIN relatos r ON r.id = a.relato_id
       JOIN memorias m ON m.id = r.memoria_id
       WHERE a.removido_em IS NULL AND r.por = ?2 AND r.situacao = 'publicada' AND ${FILTRO_PUBLICADA}
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
       WHERE r.por = ?2 AND r.situacao = 'publicada' AND ${FILTRO_PUBLICADA}
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
    const resultado = await db().prepare(SQL.tamanhoDoBanco).run();
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
       WHERE r.situacao = 'publicada' AND COALESCE(r.publicado_em, r.criado_em) > ?2 AND ${FILTRO_PUBLICADA}
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
  const r = await db().prepare(SQL.carta).first<Record<string, string>>();
  return r ? { texto: r.texto!, assinatura: r.assinatura!, escritaPor: r.escrita_por!, escritaEm: r.escrita_em! } : undefined;
}

// --- Cópia mensal (migração 060; regras em src/lib/conta.ts, copiaAtrasada) ---

/** O script do Drive gravou a cópia no Drive e confirmou: anota o momento e a gerada_em do índice. Diz se anotou. */
export async function anotarCopiaMensal(geradaEm: string): Promise<boolean> {
  // Num comando só: a mesma gerada_em anota uma vez, por mais que a confirmação seja repetida (D1f4)
  const r = await db()
    .prepare('INSERT INTO copias_mensais (gerada_em) SELECT ?1 WHERE NOT EXISTS (SELECT 1 FROM copias_mensais WHERE gerada_em = ?1)')
    .bind(geradaEm)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

/** Quando o script do Drive confirmou que gravou a cópia no Drive pela última vez ("AAAA-MM-DD HH:MM:SS", em UTC), ou null se nunca. */
export async function ultimaCopiaMensal(): Promise<string | null> {
  const r = await db().prepare(SQL.copiaMensal).first<{ feita_em: string }>();
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
  /** quem vê a memória agora: o pedido para liberar manda a chave junto com a resposta (chaveDoPublico) */
  publico: Publico;
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
  await db().batch(comandosDosAvisos(avisos));
}

/** Os avisos como comandos, para gravar junto com o que os fez nascer (um lote só). */
export const comandosDosAvisos = (avisos: AvisoNovo[]): Comando[] =>
  avisos.map((a) =>
    db()
      .prepare('INSERT INTO avisos (para, tipo, memoria_id, relato_id, de, dados) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(a.para, a.tipo, a.memoriaId, a.relatoId ?? null, a.de, a.dados ? JSON.stringify(a.dados) : null),
  );

/**
 * Os avisos da pessoa, do mais novo para o mais antigo: os que estão na lista (pendentes) e, com
 * `historico`, também os que já saíram. Só entra o que ela vê agora: a memória publicada, fora da
 * lixeira, e o relato, quando o aviso é de um (ver veORelato). O que ela deixou de ver some daqui.
 */
/** Os avisos de uma pessoa, do banco: os da lista ou, com `historico`, também os já abertos. */
const sqlDosAvisos = (historico: boolean) => `SELECT a.*, m.titulo, m.visibilidade AS memoria_visibilidade,
         (SELECT json_group_array(nucleo_id) FROM memoria_nucleos WHERE memoria_id = m.id) AS memoria_nucleos, r.por AS relato_por, r.registrado_por AS relato_registrado_por, r.situacao AS relato_situacao, r.so_para_nucleos AS relato_so,
         r.descartado_em AS relato_descartado
       FROM avisos a JOIN memorias m ON m.id = a.memoria_id
       LEFT JOIN relatos r ON r.id = a.relato_id
       WHERE a.para = ?1 AND ${FILTRO_PUBLICADA} ${historico ? '' : 'AND a.resolvido_em IS NULL'}
       ORDER BY a.id DESC LIMIT 60`;

export async function listarAvisos(usuario: Usuario, { historico = false }: { historico?: boolean } = {}): Promise<Aviso[]> {
  const { results } = await db().prepare(sqlDosAvisos(historico)).bind(usuario.pessoa).all<Record<string, unknown>>();
  if (results.length === 0) return [];
  const naoVe = await pessoasQueONaoVe(usuario);
  const avisos: Aviso[] = [];
  for (const a of results as Record<string, unknown>[]) {
    let relato: Aviso['relato'] = null;
    if (a.relato_id !== null && a.relato_id !== undefined) {
      // O relato saiu (ou nunca chegou a quem recebe): o aviso some com ele
      if (!a.relato_por) continue;
      // O rascunho de relato que está na lixeira fica parado: o pedido dele some até ele ser restaurado
      if (a.relato_descartado) continue;
      relato = { id: a.relato_id as number, por: a.relato_por as string, registradoPor: a.relato_registrado_por as string, situacao: a.relato_situacao as 'rascunho' | 'publicada' };
      // O rascunho de outra pessoa não aparece (relatoAberto, em quem-ve.ts)
      if (!relatoAberto(relato, usuario)) continue;
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
      publico: { visibilidade: a.memoria_visibilidade as 'todos' | 'nucleos', nucleos: JSON.parse((a.memoria_nucleos as string | null) ?? '[]') as string[] },
    });
  }
  return avisos;
}

/**
 * Quantos avisos estão na lista: o número do retrato. A lista vem do começo do pedido (aquecerOPedido),
 * já guardada: barata quando não há nenhum (o índice avisos_de_quem), e poucas linhas quando há.
 */
export async function contarAvisosPendentes(usuario: Usuario): Promise<number> {
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
 * Quem criou a memória mudou quem vê: cada relato da memória (publicado ou em rascunho) fica como manda
 * relatoDepoisDaMudanca, em permissoes.ts. Ao ampliar, espera só o relato que o público novo nunca viu;
 * quando o público novo cabe no que o relato já teve, ele volta a acompanhar a memória, e o pedido sai da
 * lista sem resposta. O público conhecido de cada relato é gravado a cada mudança (migração 105).
 * Só lê: devolve os comandos, para quem chama gravá-los junto com a memória (atualizarMemoria), e os
 * relatos que passam a esperar.
 */
export async function comandosDaMudancaDeQuemVe(
  memoriaId: string,
  antes: Publico,
  depois: Publico,
  pedido: { quemNaoEspera: string; de: string; paraQuem: (conhecido: PublicoConhecido) => string },
): Promise<{ comandos: Comando[]; passaram: Relato[] }> {
  // O rascunho de relato na lixeira fica fora da conta: parado, até ser restaurado (restaurarRascunhoDeRelato)
  const { results } = await db().prepare('SELECT * FROM relatos WHERE memoria_id = ? AND descartado_em IS NULL').bind(memoriaId).all<Record<string, unknown>>();
  const relatos = results.map(lerRelato);
  if (relatos.length === 0) return { comandos: [], passaram: [] };
  const respostas = await ultimasRespostas(relatos.map((r: Relato) => r.id));
  const passaram: Relato[] = [];
  const comandos = relatos.flatMap((r) => {
    const novo = relatoDepoisDaMudanca(r, antes, depois, pedido.quemNaoEspera);
    if (novo.soParaNucleos && !r.soParaNucleos) passaram.push({ ...r, ...novo });
    return [
      db()
        .prepare('UPDATE relatos SET so_para_nucleos = ?, publico_conhecido = ? WHERE id = ?')
        .bind(gravarEspera(novo.soParaNucleos), gravarPublicoConhecido(novo.publicoConhecido), r.id),
      ...comandosDosPedidos(r, novo, { memoriaId, de: pedido.de, paraQuem: pedido.paraQuem(novo.publicoConhecido), jaRecusou: jaRecusouEstePublico(depois, respostas.get(r.id)) }),
    ];
  });
  return { comandos, passaram };
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
export async function responderPedidoDoRelato(relato: Relato, resposta: 'liberar' | 'manter', memoria: Publico & { versao: number }): Promise<void> {
  const relatoId = relato.id;
  // Liberar: quem vê a memória agora passa a ter visto o relato (publicoConhecidoAoLiberar)
  const conhecido = gravarPublicoConhecido(publicoConhecidoAoLiberar(relato, memoria));
  await loteDaMemoria([
    // A resposta conta com o público que leu: se a memória mudou no meio tempo, o lote volta
    conferirVersao(relato.memoriaId, memoria.versao),
    ...(resposta === 'liberar' ? [db().prepare('UPDATE relatos SET so_para_nucleos = NULL, publico_conhecido = ? WHERE id = ?').bind(conhecido, relatoId)] : []),
    // A resposta guarda o público que o pedido mostrava: "Manter" vale para ele (jaRecusouEstePublico)
    db()
      .prepare(
        `UPDATE avisos SET resolvido_em = datetime('now'), resposta = ?, dados = json_set(COALESCE(dados, '{}'), '$.publico', json(?))
         WHERE relato_id = ? AND tipo = 'liberar-relato' AND resolvido_em IS NULL`,
      )
      .bind(resposta, JSON.stringify({ visibilidade: memoria.visibilidade, nucleos: [...memoria.nucleos].sort() }), relatoId),
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
    // O laço aberto com quem está na lixeira não conta (V-1 da auditoria AC): para os outros, a pessoa da
    // lixeira some, e o laço com ela também (como em listarCasais e listarLacosDoCoracao)
    db().prepare(`SELECT a_id, b_id FROM casais WHERE ${sqlCasalAberto()} AND ${ativa('a_id')} AND ${ativa('b_id')}`).all<{ a_id: string; b_id: string }>(),
    db().prepare(`SELECT dono_id, pessoa_id FROM lacos_coracao WHERE privado = 0 AND ${ativa('dono_id')} AND ${ativa('pessoa_id')}`).all<{ dono_id: string; pessoa_id: string }>(),
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
 * família toda, com a versão de antes no histórico. A proximidade continua só do dono. Vem como
 * comandos, para gravar junto com a memória que publica a pessoa (um lote só).
 */
export function comandosDeAbrirLacosPrivados(usuario: Usuario, pessoas: string[]): Comando[] {
  if (pessoas.length === 0) return [];
  const lista = JSON.stringify(pessoas);
  return [
    db()
      .prepare(
        `INSERT INTO versoes (tipo, item_id, dados, autor) SELECT 'laco-coracao', CAST(id AS TEXT), json_object('dono', dono_id, 'pessoa', pessoa_id, 'nome', nome, 'papel', papel, 'proximidade', proximidade, 'privado', privado), ?1
         FROM lacos_coracao WHERE dono_id = ?1 AND privado = 1 AND pessoa_id IN (SELECT value FROM json_each(?2))`,
      )
      .bind(usuario.pessoa, lista),
    db().prepare('UPDATE lacos_coracao SET privado = 0 WHERE dono_id = ?1 AND privado = 1 AND pessoa_id IN (SELECT value FROM json_each(?2))').bind(usuario.pessoa, lista),
  ];
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
  await db().batch([
    ...validos.map((item) => {
      const principal = semPrincipal ? 1 : 0;
      semPrincipal = false;
      return db()
        .prepare('UPDATE fotos SET memoria_id = ?, legenda = ?, ordem = ?, principal = ? WHERE id = ?')
        .bind(memoriaId, item.legenda?.trim() || null, ordem++, principal, item.id);
    }),
    // A principal é conferida no fim do lote, no banco: a única foto da memória pode ter sido tirada entre a
    // leitura e o lote (Z2, o outro lado da corrida do D8)
    comandoDaPrincipal(memoriaId),
  ]);
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
  const { results } = await db().prepare(SQL.apelidos).bind(dono).all<{ pessoa_id: string; apelido: string }>();
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
  const { results } = await db().prepare(SQL.exParaMim).bind(usuario.pessoa).all<{ pessoa_id: string; modo: ModoDoEx }>();
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
  const linha = await db().prepare(SQL.ajuste).bind(chave).first<{ valor: string }>();
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
export async function conflitosAoJuntar(fica: string, sai: string, usuario: Usuario): Promise<ConflitosAoJuntar> {
  // Quem olha só lê o título das memórias que vê (decisão do Gui, 23/11/2026): as outras entram só como
  // "memórias que você não vê", sem título nem número. A recusa continua igual, veja ou não as memórias.
  // O título só aparece quando os dois relatos do conflito estão publicados e liberados: o conflito num
  // rascunho ou num relato que espera liberação entra nas "memórias que você não vê" (fila da revisão AA2).
  // Uma memória com um conflito à vista é citada pelo título, mesmo que tenha outro que não esteja
  const { results } = await db()
    .prepare(
      `SELECT m.id, m.titulo,
         MAX(CASE WHEN ${FILTRO_VISIVEL} AND rs.situacao = 'publicada' AND rf.situacao = 'publicada'
           AND ${sqlRelatoNaoEspera('rs')} AND ${sqlRelatoNaoEspera('rf')} THEN 1 ELSE 0 END) AS ve
       FROM relatos rs JOIN relatos rf ON rf.memoria_id = rs.memoria_id AND rf.por = ?2 JOIN memorias m ON m.id = rs.memoria_id
       WHERE rs.por = ?3 AND (rf.registrado_por = rs.registrado_por OR (rf.situacao = 'publicada' AND rs.situacao = 'publicada'))
       GROUP BY m.id, m.titulo`,
    )
    .bind(usuario.pessoa, fica, sai)
    .all<{ id: string; titulo: string; ve: number }>();
  const linhas = results as { id: string; titulo: string; ve: number }[];
  return { titulos: linhas.filter((r) => r.ve).map((r) => r.titulo), outras: linhas.some((r) => !r.ve) };
}

/** As memórias em que as duas fichas têm relato: os títulos que quem olha vê, e se há outras que não vê. */
export interface ConflitosAoJuntar {
  titulos: string[];
  outras: boolean;
}

/**
 * Junta duas fichas da mesma pessoa: a que fica recebe os campos escolhidos e tudo o que era da outra
 * (memórias, relatos, fotos, áudios, laços, famílias, capítulos, proximidades, avisos), e a que sai deixa
 * de existir. As duas fichas de antes ficam no histórico, a que saiu com a marca de para onde foi. Um
 * lote só: ou entra tudo, ou nada. Quem chama já conferiu a permissão e os conflitos.
 */
export async function juntarIntegrantes(fica: Integrante, sai: Integrante, ficha: DadosDoIntegrante, usuario: Usuario): Promise<void> {
  await Promise.all([lerSobreDaPessoa(fica), lerSobreDaPessoa(sai)]);
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
  comAcesso: ReadonlySet<string>,
): Promise<number> {
  const [r] = await db().batch([
    db()
      .prepare('INSERT INTO sugestoes (memoria_id, relato_id, de, para, tipo, proposta, texto) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id')
      .bind(s.memoriaId, s.relatoId, usuario.pessoa, s.para, s.tipo, s.proposta ? JSON.stringify(s.proposta) : null, s.texto),
  ]);
  const id = ((r as { results?: { id: number }[] }).results?.[0]?.id ?? 0) as number;
  const recebem = destinatarios({ tipo: s.tipo, para: s.para, de: usuario.pessoa }, memoria, comAcesso);
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

/**
 * Os códigos de todas as pessoas, inclusive as que estão na lixeira, mais "nova" (o endereço do formulário de
 * cadastro). Só servem para o código de uma pessoa nova não repetir: a pessoa na lixeira continua com a linha
 * no banco, e o mesmo código daria colisão (revisão AA2, 23/11/2026).
 */
export async function codigosOcupadosDePessoas(): Promise<Set<string>> {
  const { results } = await db().prepare('SELECT id FROM integrantes').all<{ id: string }>();
  return new Set([...results.map((r: { id: string }) => r.id), 'nova']);
}

/** Quem está na lixeira. */
export async function idsDasPessoasExcluidas(): Promise<Set<string>> {
  // A mesma leitura da lista das excluídas: uma consulta a menos por pedido, com as mesmas pessoas
  const { results } = await db().prepare(SQL.pessoasExcluidas).all<{ id: string }>();
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
    .prepare(SQL.pessoasExcluidas)
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
const SQL_PEDIDOS_DE_EXCLUSAO = `SELECT p.id, p.pessoa_id, p.pedido_por, p.motivo, p.criado_em FROM pedidos_de_exclusao p
       JOIN integrantes i ON i.id = p.pessoa_id AND i.excluida_em IS NULL
       WHERE p.resolvido_em IS NULL ORDER BY p.criado_em, p.id`;

export async function listarPedidosDeExclusao(): Promise<PedidoDeExclusao[]> {
  const { results } = await db().prepare(SQL_PEDIDOS_DE_EXCLUSAO).all<Record<string, unknown>>();
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
 * Os comandos que gravam as mensagens do relato, na ordem dada. A que tem id e é deste relato é atualizada
 * no lugar (guarda a hora em que foi enviada e o id, para quem a cita); a nova entra com a hora de agora; a
 * que saiu da lista é apagada. O relato que nasce no mesmo lote ainda não tem mensagem nenhuma.
 */
export async function comandosDasMensagens(relato: RelatoNoLote, mensagens: Mensagem[]): Promise<Comando[]> {
  const antes = typeof relato === 'number' ? ((await listarMensagensGravadas([relato])).get(relato) ?? []) : [];
  const deste = new Set(antes.map((m) => m.id));
  const ficam = new Set(mensagens.filter((m) => m.id !== undefined && deste.has(m.id)).map((m) => m.id));
  const r = relatoNoLote(relato);
  return [
    ...antes.filter((m) => !ficam.has(m.id)).map((m) => db().prepare('DELETE FROM relato_mensagens WHERE id = ?').bind(m.id)),
    ...mensagens.map((m, ordem) =>
      m.id !== undefined && deste.has(m.id)
        ? db()
            .prepare('UPDATE relato_mensagens SET ordem = ?, tipo = ?, texto = ?, audio_id = ?, foto_id = ?, cita_id = ? WHERE id = ? AND relato_id = ?')
            .bind(ordem, m.tipo, m.tipo === 'texto' ? (m.texto ?? '') : null, m.audioId ?? null, m.fotoId ?? null, m.citaId ?? null, m.id, relato)
        : db()
            .prepare(`INSERT INTO relato_mensagens (relato_id, ordem, tipo, texto, audio_id, foto_id, cita_id) VALUES (${r.sql}, ?, ?, ?, ?, ?, ?)`)
            .bind(...r.valores, ordem, m.tipo, m.tipo === 'texto' ? (m.texto ?? '') : null, m.audioId ?? null, m.fotoId ?? null, m.citaId ?? null),
    ),
  ];
}

/**
 * Grava as mensagens do relato, na ordem dada (comandosDasMensagens). Devolve as mensagens gravadas, com
 * os ids.
 */
export async function gravarMensagens(relatoId: number, mensagens: Mensagem[]): Promise<Mensagem[]> {
  const comandos = await comandosDasMensagens(relatoId, mensagens);
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

// --- O espaço das fotos e áudios, guardado para o número do retrato (causa 1c da medição M1) ---

/**
 * Somar o tamanho de todas as fotos, retratos e áudios lê o acervo inteiro (6.400 linhas no acervo cheio).
 * A soma inteira é feita na página da Administração, que guarda o resultado aqui. O número do retrato, em
 * toda página de quem administra, lê o que foi guardado; passadas algumas horas, a próxima página refaz a
 * soma e guarda de novo. O espaço só cresce aos poucos, e o aviso é a partir de 7 GB.
 */
export const AJUSTE_DO_ESPACO_GUARDADO = 'espaco-dos-arquivos-guardado';
export const HORAS_DO_ESPACO_GUARDADO = 6;

interface EspacoGuardado {
  bytes: number;
  semMedida: number;
  em: string;
}

export async function guardarEspacoDosArquivos(espaco: { bytes: number; semMedida: number }): Promise<void> {
  const valor: EspacoGuardado = { bytes: espaco.bytes, semMedida: espaco.semMedida, em: new Date().toISOString() };
  await db()
    .prepare(`INSERT INTO ajustes (chave, valor, mudado_por) VALUES (?, ?, NULL) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, mudado_em = datetime('now')`)
    .bind(AJUSTE_DO_ESPACO_GUARDADO, JSON.stringify(valor))
    .run();
}

/** O espaço guardado pela última soma, ou a soma de agora (guardada) quando a última passou do prazo. */
export async function espacoDosArquivosGuardado(agora = Date.now()): Promise<{ bytes: number; semMedida: number }> {
  const guardado = (await lerAjuste(AJUSTE_DO_ESPACO_GUARDADO)) as Partial<EspacoGuardado> | undefined;
  const em = typeof guardado?.em === 'string' ? Date.parse(guardado.em) : NaN;
  if (guardado && typeof guardado.bytes === 'number' && typeof guardado.semMedida === 'number' && agora - em < HORAS_DO_ESPACO_GUARDADO * 3_600_000 && em <= agora) {
    return { bytes: guardado.bytes, semMedida: guardado.semMedida };
  }
  const espaco = await espacoDosArquivos();
  try {
    await guardarEspacoDosArquivos(espaco);
  } catch {
    // Guardar é um extra: sem ele, a próxima página soma de novo
  }
  return espaco;
}

// --- O começo de cada pedido (causa 1a e 1b da medição M1) ---

/**
 * Que leituras o começo do pedido faz num lote só:
 * - 'arquivo': as rotas de fotos, áudios e retratos. Só as pessoas e os núcleos de cada uma, para saber
 *   quem pede: a conferência de quem vê lê o resto só quando precisa (a foto que veio com um relato, o
 *   retrato), para cada foto ler o mínimo.
 * - 'rota': as rotas de /api, que gravam. Mais quem está na lixeira, quem só existe num laço privado de
 *   outra pessoa e os tipos.
 * - 'pagina': as páginas. Mais o que o esqueleto (src/layouts/Visual.astro) e quase toda página leem: as
 *   famílias, os laços da árvore, os apelidos de quem olha (fora da administração), os exes, os avisos e,
 *   para quem administra, o que as pendências do retrato leem.
 */
export type ComecoDoPedido = 'arquivo' | 'rota' | 'pagina';

function leiturasDoComeco(pessoa: string, comeco: ComecoDoPedido, { admin, apelidos }: { admin: boolean; apelidos: boolean }): Comando[] {
  const lista = [db().prepare(SQL.integrantes), db().prepare(SQL.membros)];
  if (comeco === 'arquivo') return lista;
  lista.push(db().prepare(SQL.pessoasExcluidas), db().prepare(SQL.emPrivadosDeOutros).bind(pessoa), db().prepare(SQL.tipos));
  if (comeco === 'rota') return lista;
  lista.push(
    db().prepare(SQL.nucleos),
    db().prepare(SQL_FILIACOES),
    db().prepare(SQL.casais),
    db().prepare(SQL.fases),
    db().prepare(SQL.familiasDosCasais),
    db().prepare(SQL_LACOS_DO_CORACAO),
    db().prepare(SQL.exParaMim).bind(pessoa),
    // A lista dos avisos, para o número do retrato: poucas linhas, e o esqueleto não lê nada depois de a página responder
    db().prepare(sqlDosAvisos(false)).bind(pessoa),
  );
  if (apelidos) lista.push(db().prepare(SQL.apelidos).bind(pessoa));
  if (admin) {
    lista.push(
      db().prepare(SQL.carta),
      db().prepare(SQL.tamanhoDoBanco),
      // A cópia mensal só é conferida na produção (situacaoDasPendencias, em conta.ts)
      ...(ambiente() === 'producao' ? [db().prepare(SQL.copiaMensal)] : []),
      db().prepare(SQL.ajuste).bind(AJUSTE_DOS_NAO_DUPLICADOS),
      db().prepare(SQL.ajuste).bind(AJUSTE_DO_ESPACO_GUARDADO),
      db().prepare(SQL_PEDIDOS_DE_EXCLUSAO),
      db().prepare(SQL_ALGUMA_FOTO_SOLTA),
    );
  }
  return lista;
}

/**
 * Lê num lote só, no começo do pedido, o que ele vai ler muitas vezes. A guarda por pedido fica com cada
 * leitura, e as funções deste arquivo acham a leitura guardada em vez de ir ao banco de novo. Quem pede
 * ainda não foi conferido: `admin` diz o que o banco diz da pessoa, e só muda o que é lido.
 */
export async function aquecerOPedido(pessoa: string, comeco: ComecoDoPedido, { apelidos }: { apelidos: boolean }): Promise<void> {
  // Saber se a pessoa administra pede as pessoas: vêm no mesmo lote, e as pendências, num segundo, só para ela
  const primeiro = leiturasDoComeco(pessoa, comeco, { admin: false, apelidos });
  await db().batch(primeiro);
  if (comeco !== 'pagina') return;
  const eu = (await listarIntegrantes()).find((i) => i.id === pessoa);
  // As pendências só aparecem no esqueleto, depois da página: o lote vai sem esperar, junto com o que a
  // página lê. Quem chega antes dele encontra a leitura a caminho, guardada; um erro aqui só faz ler de novo.
  if (eu?.admin) db().batch(leiturasDoComeco(pessoa, comeco, { admin: true, apelidos })).catch(() => undefined);
}
