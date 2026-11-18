// O espelho da produção, para a homologação.
//
// Recebe a cópia do acervo (a mesma do Google Drive e do botão "Baixar cópia do acervo") e devolve um
// acervo para a homologação com a família de verdade e as memórias de exemplo (decisão do Gui, 18/11/2026).
//
// A regra: nomes, datas e laços passam; memórias, relatos, textos, retratos e fotos nunca passam.
// - Passam, como estão na produção: as pessoas (id, nome, apelido, tipo, espécie, como se referir, as
//   datas de nascimento e de falecimento, quem administra), quem é de cada família, as filiações (com a
//   data da adoção), os casais com as fases e as famílias que veem, os laços do coração (com o nome, o
//   papel, a proximidade e a marca de privado) e os laços resumidos.
// - Nenhum arquivo da produção chega à homologação (observação do Gui, 18/11/2026): o retrato de cada
//   pessoa é uma das fotos de exemplo do Chico e da Karol, sorteada pelo id como nas prévias
//   (retratoDeExemplo), e a chave do retrato de verdade nem é lida.
// - Não passam: o "Sobre" de cada pessoa (é texto escrito), memórias, relatos, fotos de memória, áudios,
//   capítulos, temas, histórico, avisos, sugestões, reações e as escolhas que só o dono vê (proximidade do
//   círculo e como o ex aparece). No lugar das memórias entram memórias de exemplo, inventadas a partir
//   das pessoas, com as 11 fotos de exemplo do Chico e da Karol, lidas do bucket de teste.
//
// As colunas que passam são listadas uma a uma: coluna nova numa dessas tabelas não passa sem entrar
// aqui, e testes/espelho.test.ts confere que nada escrito de verdade chega à homologação.
// Nada daqui vai para o repositório: o espelho é gravado direto no banco da homologação.
import { NUCLEO_INICIAL } from './familias';
import { fotoDeMemoriaDeExemplo, quantasFotosNoEspelho, retratoDeExemplo } from './fotos-de-exemplo';

type Linha = Record<string, unknown>;

export interface CopiaDoAcervo {
  acervo: string;
  tabelas: Record<string, Linha[]>;
}

export interface Espelho {
  /** linhas por tabela, já na ordem de gravar */
  tabelas: [string, Linha[]][];
  resumo: { pessoas: number; filiacoes: number; casais: number; lacos: number; memorias: number };
}

/** Quem tem acesso ao site e aparece nas memórias de exemplo e nos casos que o QA confere. */
export const IDS_COM_ACESSO = ['gui', 'giovanna', 'elizete', 'lucas-magno'];

/** Tabelas apagadas antes de gravar o espelho, das que dependem para as de que se depende. */
export const TABELAS_APAGADAS = [
  // Os avisos apontam para memórias e relatos da produção: o espelho não leva nenhum
  'avisos',
  // As sugestões de correção apontam para memórias e relatos da produção (migração 074)
  'sugestoes',
  // As reações apontam para memórias, relatos e fotos da produção (migração 075)
  'reacoes',
  // A proximidade do círculo é de cada pessoa, e só ela vê: o espelho não leva nenhuma, e apaga as que houver
  'proximidades',
  // Como cada pessoa chama a outra é dela, e só ela vê: o espelho não leva nenhum (migração 090)
  'apelidos_meus',
  // Como o ex aparece é de cada pessoa, e só ela vê: o espelho não leva nenhuma escolha (migração 071)
  'ex_para_mim',
  'tema_capitulos',
  'tema_memorias',
  'temas',
  'capitulo_memorias',
  'capitulo_nucleos',
  'capitulo_pessoas',
  'capitulo_familias',
  'capitulos',
  'versoes',
  // As fotos apontam para relatos (a coluna relato_id, que veio depois por ALTER TABLE) e por isso
  // saem antes deles; o teste antigo só lia o CREATE TABLE e não via essa ligação
  'fotos',
  // Áudios apontam para relatos reais: o espelho não leva nenhum, e apaga os que houver
  'audios',
  'relatos',
  'memoria_integrantes',
  'memoria_nucleos',
  'memorias',
  'lacos_resumidos',
  'lacos_coracao',
  // As famílias que veem um casal desfeito (migração 071) apontam para os casais
  'casal_nucleos',
  'casal_fases',
  'casais',
  'filiacoes',
  'nucleo_membros',
  'integrantes',
];

const LUGARES = ['Em casa', 'Na casa da vó', 'No sítio', 'Na praia', 'Na serra', 'No clube', 'No centro da cidade', 'Na casa nova', 'No interior', 'Num restaurante'];
const FRASES = [
  'Lembro do cheiro da casa e de todo mundo falando ao mesmo tempo.',
  'Foi um dia comprido, e no fim ninguém queria ir embora.',
  'Tem uma foto desse dia que até hoje aparece nos almoços de domingo.',
  'Choveu de manhã e abriu um sol bonito depois do almoço.',
  'A gente riu tanto que a vizinha veio perguntar o que tinha acontecido.',
  'Ninguém lembra direito do que comemos, mas todo mundo lembra da música.',
  'Foi a primeira vez que vi aquela parte da família reunida.',
  'Tem gente que conta essa história diferente, mas eu lembro assim.',
];

/** Gerador de números pseudoaleatórios com semente, para o espelho sair igual com a mesma cópia e a mesma semente. */
function sorteador(semente: number) {
  let a = semente >>> 0 || 1;
  const proximo = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const embaralhar = <T>(lista: T[]): T[] => {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(proximo() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };
  const um = <T>(lista: T[]): T => lista[Math.floor(proximo() * lista.length)];
  const entre = (min: number, max: number) => min + Math.floor(proximo() * (max - min + 1));
  return { proximo, embaralhar, um, entre };
}

const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function espelhar(copia: CopiaDoAcervo, opcoes: { semente?: number; agora?: Date } = {}): Espelho {
  if (copia.acervo !== 'Bayara Nascimento' || !Array.isArray(copia.tabelas?.integrantes)) {
    throw new Error('Este arquivo não parece uma cópia do acervo.');
  }
  const t = (nome: string) => copia.tabelas[nome] ?? [];
  const agora = opcoes.agora ?? new Date();
  const anoAtual = agora.getFullYear();
  const s = sorteador(opcoes.semente ?? Math.floor(agora.getTime() / 1000));
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
  const mapear = (v: unknown) => (typeof v === 'string' && v ? v : null);

  // --- Pessoas: como estão na produção, sem o "Sobre" ---
  const originais = [...t('integrantes')].sort((a, b) => (numero(a.ordem) ?? 50) - (numero(b.ordem) ?? 50) || String(a.id).localeCompare(String(b.id)));
  const integrantes: Linha[] = originais.map((p) => {
    const bicho = p.tipo === 'bicho';
    const tratamento = p.tratamento === 'ela' || p.tratamento === 'ele' ? p.tratamento : null;
    return {
      id: String(p.id),
      nome: String(p.nome),
      apelido: texto(p.apelido),
      tipo: bicho ? 'bicho' : 'pessoa',
      especie: bicho ? texto(p.especie) : null,
      tratamento,
      nascimento_ano: numero(p.nascimento_ano),
      nascimento_mes: numero(p.nascimento_mes),
      nascimento_dia: numero(p.nascimento_dia),
      falecimento_ano: numero(p.falecimento_ano),
      falecimento_mes: numero(p.falecimento_mes),
      falecimento_dia: numero(p.falecimento_dia),
      falecido: numero(p.falecido) ?? (p.falecimento_ano != null ? 1 : 0),
      // O "Sobre" é texto escrito: não passa
      sobre: null,
      // O retrato de verdade não passa: no lugar, uma das fotos de exemplo, como nas prévias
      retrato: retratoDeExemplo(String(p.id), tratamento, bicho),
      admin: numero(p.admin) ?? 0,
      ordem: numero(p.ordem) ?? 50,
      criado_por: mapear(p.criado_por),
    };
  });

  const existe = (id: unknown) => typeof id === 'string' && integrantes.some((i) => i.id === id);
  const nucleoMembros = t('nucleo_membros')
    // Cópia de antes da migração 013, sem papel: vale a mesma regra da migração (só quem acessa é membro)
    .map((m) => ({
      nucleo_id: m.nucleo_id,
      integrante_id: mapear(m.integrante_id),
      papel: m.papel === 'parente' || (m.papel === undefined && !NUCLEO_INICIAL.includes(String(m.integrante_id))) ? 'parente' : 'membro',
    }))
    .filter((m) => existe(m.integrante_id));
  const filiacoes = t('filiacoes')
    .map((f) => ({
      filho_id: mapear(f.filho_id),
      responsavel_id: mapear(f.responsavel_id),
      qualidade: f.qualidade ?? 'biologica',
      criado_por: mapear(f.criado_por),
      adocao_ano: f.qualidade === 'adotiva' ? numero(f.adocao_ano) : null,
      adocao_mes: f.qualidade === 'adotiva' ? numero(f.adocao_mes) : null,
      adocao_dia: f.qualidade === 'adotiva' ? numero(f.adocao_dia) : null,
    }))
    .filter((f) => existe(f.filho_id) && existe(f.responsavel_id));

  // Casais: mesmo id, para as fases continuarem ligadas
  const casais = t('casais')
    .map((c) => {
      const [a, b] = [mapear(c.a_id), mapear(c.b_id)];
      if (!existe(a) || !existe(b)) return null;
      // O banco guarda o par em ordem alfabética
      const [x, y] = String(a) < String(b) ? [a, b] : [b, a];
      return { id: numero(c.id), a_id: x, b_id: y, visibilidade: c.visibilidade ?? 'todos', criado_por: mapear(c.criado_por) };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
  const idsDosCasais = new Set(casais.map((c) => c.id));
  // As famílias que veem um casal desfeito: os núcleos têm os mesmos ids na homologação
  const casalNucleos = t('casal_nucleos')
    .filter((f) => idsDosCasais.has(numero(f.casal_id)))
    .map((f) => ({ casal_id: numero(f.casal_id), nucleo_id: f.nucleo_id }));
  const casalFases = t('casal_fases')
    .filter((f) => idsDosCasais.has(numero(f.casal_id)))
    .map((f) => ({ casal_id: numero(f.casal_id), tipo: f.tipo, inicio_ano: numero(f.inicio_ano), fim_ano: numero(f.fim_ano), ordem: numero(f.ordem) ?? 0 }));

  const lacos = t('lacos_coracao')
    .map((l) => {
      const [dono, pessoa] = [mapear(l.dono_id), mapear(l.pessoa_id)];
      if (!existe(dono) || !existe(pessoa)) return null;
      return {
        dono_id: dono,
        pessoa_id: pessoa,
        nome: String(l.nome ?? ''),
        papel: l.papel ?? null,
        proximidade: numero(l.proximidade),
        privado: numero(l.privado) ?? 0,
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  const resumidos = t('lacos_resumidos')
    .map((r) => ({ a_id: mapear(r.a_id), b_id: mapear(r.b_id), papel: r.papel, criado_por: mapear(r.criado_por) }))
    .filter((r) => existe(r.a_id) && existe(r.b_id));

  // --- Memórias de exemplo, inventadas a partir das pessoas espelhadas ---
  const memorias: Linha[] = [];
  const memoriaIntegrantes: Linha[] = [];
  const memoriaNucleos: Linha[] = [];
  const relatos: Linha[] = [];
  const nomeDe = new Map(integrantes.map((i) => [String(i.id), String(i.nome)]));
  const nascimentoDe = new Map(integrantes.map((i) => [String(i.id), numero(i.nascimento_ano)]));
  const comAcesso = IDS_COM_ACESSO.filter((id) => existe(id));
  const nucleosDe = (id: string) => nucleoMembros.filter((m) => m.integrante_id === id && m.papel === 'membro').map((m) => String(m.nucleo_id));
  const filhosDe = (ids: unknown[]) => filiacoes.filter((f) => ids.includes(f.responsavel_id) && f.qualidade !== 'consideracao').map((f) => String(f.filho_id));
  const pessoas = integrantes.filter((i) => i.tipo === 'pessoa').map((i) => String(i.id));
  const quando = (dias: number) => new Date(agora.getTime() - dias * 86_400_000).toISOString().replace('T', ' ').slice(0, 19);

  // Grupos que fazem sentido juntos: um casal com os filhos, irmãos, um laço do coração
  const grupos: string[][] = [
    ...casais.map((c) => [String(c.a_id), String(c.b_id), ...new Set(filhosDe([c.a_id, c.b_id]))]),
    ...lacos.map((l) => [String(l.dono_id), String(l.pessoa_id)]),
    ...pessoas.map((p) => [p]),
  ].filter((g) => g.length > 0);

  let n = 0;
  const criar = (memoria: { titulo: string; tipo: string; ano: number; grupo: string[]; criadaPor?: string }) => {
    n++;
    const id = `espelho-${String(n).padStart(3, '0')}`;
    const criadaPor = memoria.criadaPor ?? (comAcesso.find((c) => memoria.grupo.includes(c)) ?? s.um(comAcesso.length ? comAcesso : pessoas));
    const precisao = n % 4;
    const restrita = n % 7 === 3 && nucleosDe(criadaPor).length > 0;
    memorias.push({
      id,
      titulo: memoria.titulo,
      ano: Math.min(memoria.ano, anoAtual),
      mes: precisao >= 1 ? s.entre(1, 12) : null,
      dia: precisao >= 2 ? s.entre(1, 28) : null,
      aproximada: precisao === 3 ? 1 : 0,
      tipo: memoria.tipo,
      lugar: s.um(LUGARES),
      visibilidade: restrita ? 'nucleos' : 'todos',
      situacao: 'publicada',
      exemplo: 1,
      criada_por: criadaPor,
      criada_em: quando(s.entre(1, 300)),
      atualizada_em: quando(0),
    });
    if (restrita) memoriaNucleos.push({ memoria_id: id, nucleo_id: nucleosDe(criadaPor)[0] });
    for (const integrante of new Set([...memoria.grupo, criadaPor])) memoriaIntegrantes.push({ memoria_id: id, integrante_id: integrante });
    if (s.proximo() < 0.7) relatos.push({ memoria_id: id, por: criadaPor, registrado_por: criadaPor, texto: `${s.um(FRASES)} ${s.um(FRASES)}`, situacao: 'publicada' });
    const outro = comAcesso.find((c) => c !== criadaPor && memoria.grupo.includes(c));
    if (outro && s.proximo() < 0.5) relatos.push({ memoria_id: id, por: outro, registrado_por: outro, texto: s.um(FRASES), situacao: 'publicada' });
    return id;
  };

  // Nascimentos e casamentos seguem os anos espelhados
  for (const p of s.embaralhar(pessoas).slice(0, 8)) {
    const nasceu = nascimentoDe.get(p);
    const pais = filiacoes.filter((f) => f.filho_id === p).map((f) => String(f.responsavel_id));
    if (nasceu) criar({ titulo: `Nascimento de ${nomeDe.get(p)}`, tipo: 'nascimento', ano: nasceu, grupo: [p, ...pais] });
  }
  for (const c of casais) {
    const fase = casalFases.find((f) => f.casal_id === c.id && f.tipo === 'casamento');
    if (fase?.inicio_ano) criar({ titulo: `Casamento de ${nomeDe.get(String(c.a_id))} e ${nomeDe.get(String(c.b_id))}`, tipo: 'casamento', ano: fase.inicio_ano, grupo: [String(c.a_id), String(c.b_id)] });
  }
  // O resto, espalhado pelos anos e pelos grupos
  const modelos: [string, (g: string[]) => string][] = [
    ['aniversario', (g) => `Aniversário de ${nomeDe.get(g[0])}`],
    ['viagem', () => `Viagem de ${s.um(['férias', 'feriado', 'fim de semana'])}`],
    ['festa', () => s.um(['Festa de fim de ano', 'Festa junina', 'Natal na casa da vó', 'Réveillon'])],
    ['causo', (g) => `O dia em que ${nomeDe.get(g[0])} ${s.um(['se perdeu na feira', 'trouxe um bicho para casa', 'errou o caminho da festa', 'cozinhou pela primeira vez'])}`],
    ['cotidiano', () => s.um(['Almoço de domingo', 'Tarde de jogos', 'Café na varanda'])],
    ['casa', () => s.um(['Mudança para a casa nova', 'A reforma da cozinha'])],
    ['conquista', (g) => `${s.um(['Formatura', 'Primeiro emprego', 'Carteira de motorista'])} de ${nomeDe.get(g[0])}`],
  ];
  const primeiroAno = Math.min(...[...nascimentoDe.values()].filter((v): v is number => v !== null), anoAtual - 40);
  for (let i = 0; i < 28 && grupos.length; i++) {
    const grupo = s.um(grupos);
    const [tipo, titulo] = s.um(modelos);
    const nascimentos = grupo.map((g) => nascimentoDe.get(g)).filter((v): v is number => v !== null);
    const desde = Math.max(primeiroAno, ...nascimentos);
    criar({ titulo: titulo(grupo), tipo, ano: s.entre(desde, anoAtual), grupo });
  }

  // Os casos de visibilidade que o QA confere: um rascunho, um relato em rascunho, uma memória na lixeira
  const autoraDoRascunho = comAcesso.includes('giovanna') ? 'giovanna' : comAcesso[0];
  if (autoraDoRascunho) {
    const id = criar({ titulo: 'Rascunho ainda sem data certa', tipo: 'causo', ano: anoAtual - 1, grupo: [autoraDoRascunho], criadaPor: autoraDoRascunho });
    memorias.find((m) => m.id === id)!.situacao = 'rascunho';
  }
  const autoraDoRelato = comAcesso.includes('elizete') ? 'elizete' : comAcesso[0];
  const publicada = memorias.find((m) => m.situacao === 'publicada' && m.visibilidade === 'todos');
  if (autoraDoRelato && publicada && !relatos.some((r) => r.memoria_id === publicada.id && r.por === autoraDoRelato)) {
    relatos.push({ memoria_id: publicada.id, por: autoraDoRelato, registrado_por: autoraDoRelato, texto: 'Ainda estou escrevendo esta lembrança.', situacao: 'rascunho' });
  }
  if (comAcesso.includes('gui')) {
    const id = criar({ titulo: 'Memória excluída, na lixeira', tipo: 'cotidiano', ano: anoAtual - 2, grupo: ['gui'], criadaPor: 'gui' });
    Object.assign(memorias.find((m) => m.id === id)!, { excluida_em: quando(2), excluida_por: 'gui' });
  }

  // Fotos das memórias: de nenhuma a três, cada uma apontando para uma das 11 fotos de exemplo
  const fotos: Linha[] = memorias.flatMap((m) =>
    Array.from({ length: quantasFotosNoEspelho(String(m.id)) }, (_, ordem) => ({
      memoria_id: m.id,
      chave: fotoDeMemoriaDeExemplo(String(m.id), ordem),
      legenda: null,
      principal: ordem === 0 ? 1 : 0,
      ordem,
      enviada_por: m.criada_por,
    })),
  );

  return {
    tabelas: [
      ['integrantes', integrantes],
      ['nucleo_membros', nucleoMembros],
      ['filiacoes', filiacoes],
      ['casais', casais],
      ['casal_fases', casalFases],
      ['casal_nucleos', casalNucleos],
      ['lacos_coracao', lacos],
      ['lacos_resumidos', resumidos],
      ['memorias', memorias],
      ['memoria_nucleos', memoriaNucleos],
      ['memoria_integrantes', memoriaIntegrantes],
      ['relatos', relatos],
      ['fotos', fotos],
    ],
    resumo: {
      pessoas: integrantes.length,
      filiacoes: filiacoes.length,
      casais: casais.length,
      lacos: lacos.length,
      memorias: memorias.length,
    },
  };
}

/** Os comandos que trocam o conteúdo do banco pelo espelho, numa transação só. */
export function comandosDoEspelho(espelho: Espelho): { sql: string; valores: unknown[] }[] {
  const comandos: { sql: string; valores: unknown[] }[] = [{ sql: 'PRAGMA defer_foreign_keys = true', valores: [] }];
  for (const tabela of TABELAS_APAGADAS) comandos.push({ sql: `DELETE FROM ${tabela}`, valores: [] });
  for (const [tabela, linhas] of espelho.tabelas) {
    for (const linha of linhas) {
      const colunas = Object.keys(linha).filter((c) => linha[c] !== undefined);
      comandos.push({
        sql: `INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})`,
        valores: colunas.map((c) => linha[c] ?? null),
      });
    }
  }
  return comandos;
}
