// Memórias de exemplo para o computador de desenvolvimento e para as prévias
// de branch. Nunca roda em produção (quem chama confere o ambiente).
// Os exemplos cobrem os casos que precisam ser vistos: data aproximada,
// vários relatos, relato registrado em nome de outra pessoa, memória restrita
// a um núcleo e rascunho.
import { AMBIENTES_COM_EXEMPLOS, ambiente, ehHomologacao } from './ambiente';
import { TIPOS_DE_EXEMPLO } from '../tipos-de-exemplo';
import { AUDIOS_DE_EXEMPLO, TIPO_DOS_AUDIOS_DE_EXEMPLO, chaveDeAudioDeExemplo } from '../audios-de-exemplo';

interface Exemplo {
  id: string;
  titulo: string;
  ano: number;
  mes?: number;
  dia?: number;
  aproximada?: boolean;
  tipo: string;
  lugar?: string;
  visibilidade?: 'todos' | 'nucleos';
  situacao?: 'rascunho' | 'publicada';
  criadaPor: string;
  nucleos: string[];
  integrantes: string[];
  fotos?: string[];
  relatos?: { por: string; registradoPor?: string; texto: string }[];
}

const EXEMPLOS: Exemplo[] = [
  {
    id: '1968-foto-mais-antiga',
    titulo: 'A foto mais antiga da família',
    ano: 1968,
    aproximada: true,
    tipo: 'cotidiano',
    lugar: 'Minas Gerais',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['elizete', 'vo-bela'],
    fotos: ['Retrato de família, autor desconhecido'],
    relatos: [
      { por: 'gui', texto: 'Memória de exemplo com data aproximada: quando ninguém sabe o dia certo, basta o ano.' },
      { por: 'vo-bela', registradoPor: 'elizete', texto: 'Relato de exemplo de alguém que não acessa o site. Uma pessoa ouve a história e escreve, e as duas ficam creditadas.' },
    ],
  },
  {
    id: '1994-festa-de-aniversario',
    titulo: 'Festa de aniversário no quintal',
    ano: 1994,
    mes: 8,
    dia: 14,
    tipo: 'aniversario',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'giovanna', 'elizete'],
    fotos: ['A mesa do bolo', 'A turma toda reunida', 'Hora do parabéns'],
    relatos: [
      { por: 'gui', texto: 'Memória de exemplo com data completa, três fotos e mais de um relato.' },
      { por: 'elizete', texto: 'Cada pessoa conta o dia do jeito que lembra.\n\nEu fiz o bolo na véspera e quase não dormi.' },
      { por: 'giovanna', texto: 'Eu só lembro dos balões.' },
    ],
  },
  {
    id: '2001-carro-quebrou',
    titulo: 'O dia em que o carro quebrou na estrada',
    ano: 2001,
    mes: 1,
    tipo: 'causo',
    lugar: 'BR-040',
    criadaPor: 'giovanna',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'giovanna', 'elizete'],
    relatos: [{ por: 'giovanna', texto: 'Memória de exemplo sem foto. Os causos que a família repete em todo almoço também merecem registro.' }],
  },
  {
    id: '2019-casa-nova',
    titulo: 'Mudança para a casa nova',
    ano: 2019,
    mes: 5,
    tipo: 'casa',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['elizete'],
    fotos: ['As caixas na sala'],
    relatos: [{ por: 'gui', texto: 'Casas, mudanças e endereços também contam a história de uma família.' }],
  },
  {
    id: '2026-jantar-de-casamento',
    titulo: 'Jantar de casamento',
    ano: 2026,
    mes: 11,
    dia: 14,
    tipo: 'casamento',
    lugar: 'Belo Horizonte',
    criadaPor: 'giovanna',
    nucleos: ['bayara-nascimento', 'bayara-bracarense', 'bracarense'],
    integrantes: ['giovanna', 'lucas-magno', 'gui', 'elizete'],
    fotos: ['O brinde'],
    relatos: [{ por: 'giovanna', texto: 'Memória de exemplo que pertence a três núcleos e é vista por todos.' }],
  },
  {
    id: '2026-primeira-noite-em-casa',
    titulo: 'Primeira noite na casa nova, só nós dois',
    ano: 2026,
    mes: 11,
    dia: 16,
    tipo: 'casa',
    visibilidade: 'nucleos',
    criadaPor: 'giovanna',
    nucleos: ['bayara-bracarense'],
    integrantes: ['giovanna', 'lucas-magno', 'chico'],
    relatos: [{ por: 'giovanna', texto: 'Memória de exemplo restrita ao núcleo Bayara Bracarense. Quem não é membro não vê, nem percebe que existe.' }],
  },
  {
    id: '2024-almoco-de-domingo',
    titulo: 'Almoço de domingo',
    ano: 2024,
    mes: 10,
    dia: 6,
    tipo: 'cotidiano',
    lugar: 'Belo Horizonte',
    situacao: 'rascunho',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'giovanna', 'elizete'],
    relatos: [{ por: 'gui', texto: 'Rascunho de exemplo. Só quem está escrevendo vê, até publicar.' }],
  },
];

export async function semearExemplos(db: D1Database): Promise<void> {
  const ja = await db.prepare('SELECT COUNT(*) AS n FROM memorias').first<{ n: number }>();
  if (ja && ja.n > 0) return;

  const comandos: D1PreparedStatement[] = [];
  for (const e of EXEMPLOS) {
    comandos.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO memorias (id, titulo, ano, mes, dia, aproximada, tipo, lugar, visibilidade, situacao, exemplo, criada_por)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        )
        .bind(e.id, e.titulo, e.ano, e.mes ?? null, e.dia ?? null, e.aproximada ? 1 : 0, e.tipo, e.lugar ?? null, e.visibilidade ?? 'todos', e.situacao ?? 'publicada', e.criadaPor),
    );
    for (const n of e.nucleos) {
      comandos.push(db.prepare('INSERT OR IGNORE INTO memoria_nucleos (memoria_id, nucleo_id) VALUES (?, ?)').bind(e.id, n));
    }
    for (const i of e.integrantes) {
      comandos.push(db.prepare('INSERT OR IGNORE INTO memoria_integrantes (memoria_id, integrante_id) VALUES (?, ?)').bind(e.id, i));
    }
    (e.fotos ?? []).forEach((legenda, ordem) => {
      // chave vazia = espaço reservado, sem arquivo no bucket
      comandos.push(
        db
          .prepare(`INSERT INTO fotos (memoria_id, chave, legenda, principal, ordem, enviada_por) VALUES (?, '', ?, ?, ?, ?)`)
          .bind(e.id, legenda, ordem === 0 ? 1 : 0, ordem, e.criadaPor),
      );
    });
    for (const r of e.relatos ?? []) {
      comandos.push(
        db
          .prepare(`INSERT OR IGNORE INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, ?, ?, ?)`)
          .bind(e.id, r.por, r.registradoPor ?? r.por, r.texto, e.situacao ?? 'publicada'),
      );
    }
  }
  await db.batch(comandos);
}

// Parentes inventados, só fora da produção, para testar a árvore com mais cenários:
// tios, primos, um casal desfeito com filhos de dois casamentos, cunhados, sobrinhos e uma gata.
const PARENTES: { id: string; nome: string; tratamento: 'ela' | 'ele'; nucleo: string; bicho?: string }[] = [
  { id: 'ex-vo-tonho', nome: 'Vô Tonho', tratamento: 'ele', nucleo: 'bayara-nascimento' },
  { id: 'ex-tia-lourdes', nome: 'Tia Lourdes', tratamento: 'ela', nucleo: 'bayara-nascimento' },
  { id: 'ex-tio-jorge', nome: 'Tio Jorge', tratamento: 'ele', nucleo: 'bayara-nascimento' },
  { id: 'ex-prima-carol', nome: 'Prima Carol', tratamento: 'ela', nucleo: 'bayara-nascimento' },
  { id: 'ex-davi', nome: 'Davi', tratamento: 'ele', nucleo: 'bayara-nascimento' },
  { id: 'ex-igor', nome: 'Igor', tratamento: 'ele', nucleo: 'bayara-nascimento' },
  { id: 'ex-lia', nome: 'Lia', tratamento: 'ela', nucleo: 'bayara-nascimento' },
  { id: 'ex-ben', nome: 'Ben', tratamento: 'ele', nucleo: 'bayara-nascimento' },
  { id: 'ex-primo-rafa', nome: 'Primo Rafa', tratamento: 'ele', nucleo: 'bayara-nascimento' },
  { id: 'ex-tio-paulo', nome: 'Tio Paulo', tratamento: 'ele', nucleo: 'bayara-nascimento' },
  { id: 'ex-mel', nome: 'Mel', tratamento: 'ela', nucleo: 'bayara-nascimento', bicho: 'gata' },
  { id: 'ex-vo-zeca', nome: 'Vô Zeca', tratamento: 'ele', nucleo: 'bracarense' },
  { id: 'ex-luisa', nome: 'Luísa', tratamento: 'ela', nucleo: 'bracarense' },
  { id: 'ex-bruno', nome: 'Bruno', tratamento: 'ele', nucleo: 'bracarense' },
  { id: 'ex-dudu', nome: 'Dudu', tratamento: 'ele', nucleo: 'bracarense' },
];
// [filho, responsável, qualidade]
const FILIACOES_DE_EXEMPLO: [string, string, string][] = [
  ['elizete', 'ex-vo-tonho', 'biologica'],
  ['ex-tia-lourdes', 'vo-vivica', 'biologica'],
  ['ex-tia-lourdes', 'ex-vo-tonho', 'biologica'],
  ['ex-prima-carol', 'ex-tia-lourdes', 'biologica'],
  ['ex-prima-carol', 'ex-tio-jorge', 'biologica'],
  ['ex-primo-rafa', 'ex-tia-lourdes', 'biologica'],
  ['ex-primo-rafa', 'ex-tio-jorge', 'biologica'],
  ['ex-lia', 'ex-prima-carol', 'biologica'],
  ['ex-lia', 'ex-davi', 'biologica'],
  ['ex-ben', 'ex-prima-carol', 'biologica'],
  ['ex-ben', 'ex-igor', 'biologica'],
  ['ex-tio-paulo', 'vo-bela', 'biologica'],
  ['ex-mel', 'elizete', 'adotiva'],
  ['ana-candida', 'ex-vo-zeca', 'biologica'],
  ['ex-luisa', 'lucio', 'biologica'],
  ['ex-luisa', 'ana-candida', 'biologica'],
  ['ex-dudu', 'ex-luisa', 'biologica'],
  ['ex-dudu', 'ex-bruno', 'biologica'],
];
// [a, b, fases em ordem]
const CASAIS_DE_EXEMPLO: [string, string, string[]][] = [
  ['ex-vo-tonho', 'vo-vivica', ['casamento']],
  ['ex-tia-lourdes', 'ex-tio-jorge', ['casamento']],
  ['ex-davi', 'ex-prima-carol', ['casamento', 'separacao']],
  ['ex-igor', 'ex-prima-carol', ['namoro', 'uniao']],
  ['ex-bruno', 'ex-luisa', ['namoro', 'casamento']],
  ['ex-vo-zeca', 'regina', ['casamento']],
];

export async function semearParentesDeExemplo(db: D1Database): Promise<void> {
  const ja = await db.prepare(`SELECT 1 AS ok FROM integrantes WHERE id = 'ex-tia-lourdes'`).first();
  if (ja) return;
  const comandos: D1PreparedStatement[] = [];
  PARENTES.forEach((p, i) => {
    comandos.push(
      db
        .prepare(`INSERT OR IGNORE INTO integrantes (id, nome, tipo, especie, tratamento, ordem, sobre) VALUES (?, ?, ?, ?, ?, ?, 'Parente de exemplo, só existe na versão de teste.')`)
        .bind(p.id, p.nome, p.bicho ? 'bicho' : 'pessoa', p.bicho ?? null, p.tratamento, 60 + i),
      db.prepare('INSERT OR IGNORE INTO nucleo_membros (nucleo_id, integrante_id) VALUES (?, ?)').bind(p.nucleo, p.id),
    );
  });
  for (const [filho, responsavel, qualidade] of FILIACOES_DE_EXEMPLO) {
    comandos.push(db.prepare('INSERT OR IGNORE INTO filiacoes (filho_id, responsavel_id, qualidade) VALUES (?, ?, ?)').bind(filho, responsavel, qualidade));
  }
  for (const [x, y, fases] of CASAIS_DE_EXEMPLO) {
    const [a, b] = x < y ? [x, y] : [y, x];
    comandos.push(db.prepare('INSERT OR IGNORE INTO casais (a_id, b_id) VALUES (?, ?)').bind(a, b));
    fases.forEach((tipo, ordem) => {
      comandos.push(
        db
          .prepare(
            `INSERT INTO casal_fases (casal_id, tipo, ordem) SELECT c.id, ?, ? FROM casais c WHERE c.a_id = ? AND c.b_id = ?
               AND NOT EXISTS (SELECT 1 FROM casal_fases f WHERE f.casal_id = c.id AND f.ordem = ?)`,
          )
          .bind(tipo, ordem, a, b, ordem),
      );
    });
  }
  await db.batch(comandos);
}

// ---------------------------------------------------------------------------
// Acervo de exemplo mais cheio, para ver a linha do tempo, os capítulos e a árvore
// perto de como vão ficar quando a família preencher. A maior parte das memórias
// cai entre 1992 (Gui) e hoje, com mais coisa a partir de 1999 (Giovanna).
// Cobre todos os tipos, datas completas, só mês, só ano e aproximadas, fotos,
// relatos de várias pessoas, relato em rascunho, memória restrita a núcleo,
// rascunho, lixeira, capítulos dos dois modos (com um dentro do outro), temas,
// parentes novos, um bicho que já se foi e laços do coração (um deles privado).
// ---------------------------------------------------------------------------

interface ExemploCompleto extends Exemplo {
  tipoOutro?: string;
  temas?: string[];
  /** vai direto para a lixeira */
  naLixeira?: boolean;
  /** há quantos dias foi cadastrada, para o "o que há de novo" ter o que mostrar */
  haDias?: number;
  relatos?: { por: string; registradoPor?: string; texto: string; rascunho?: boolean }[];
}

const NOVOS_PARENTES: {
  id: string;
  nome: string;
  tratamento: 'ela' | 'ele';
  nucleo?: string;
  bicho?: string;
  nasceu?: number;
  morreu?: number;
}[] = [
  { id: 'ex-tia-cida', nome: 'Tia Cida', tratamento: 'ela', nucleo: 'bayara-nascimento', nasceu: 1967 },
  { id: 'ex-prima-julia', nome: 'Prima Júlia', tratamento: 'ela', nucleo: 'bayara-nascimento', nasceu: 1996 },
  { id: 'ex-primo-teo', nome: 'Primo Téo', tratamento: 'ele', nucleo: 'bayara-nascimento', nasceu: 2002 },
  { id: 'ex-toto', nome: 'Totó', tratamento: 'ele', nucleo: 'bayara-nascimento', bicho: 'cachorro', nasceu: 1995, morreu: 2009 },
  { id: 'ex-dona-fatima', nome: 'Dona Fátima', tratamento: 'ela', nasceu: 1958 },
  { id: 'ex-caio-amigo', nome: 'Caio', tratamento: 'ele', nasceu: 1990 },
  { id: 'ex-marina', nome: 'Marina', tratamento: 'ela', nasceu: 1999 },
];

// Anos de nascimento (e de partida) para quem já está na árvore. Gui e Giovanna são reais;
// os outros são parentes inventados. Só preenche o que ainda estiver vazio.
const ANOS: [string, number, number?][] = [
  ['gui', 1992],
  ['giovanna', 1999],
  ['ex-vo-tonho', 1934, 2010],
  ['ex-vo-zeca', 1938],
  ['ex-tio-jorge', 1960],
  ['ex-tia-lourdes', 1962],
  ['ex-tio-paulo', 1965],
  ['ex-primo-rafa', 1988],
  ['ex-davi', 1987],
  ['ex-prima-carol', 1990],
  ['ex-igor', 1989],
  ['ex-bruno', 1991],
  ['ex-luisa', 1993],
  ['ex-mel', 2008],
  ['ex-lia', 2014],
  ['ex-ben', 2019],
  ['ex-dudu', 2021],
];

const NOVAS_FILIACOES: [string, string, string][] = [
  ['ex-prima-julia', 'ex-tio-paulo', 'biologica'],
  ['ex-prima-julia', 'ex-tia-cida', 'biologica'],
  ['ex-primo-teo', 'ex-tio-paulo', 'biologica'],
  ['ex-primo-teo', 'ex-tia-cida', 'biologica'],
  ['ex-toto', 'elizete', 'adotiva'],
];

// [a, b, fases: [tipo, início, fim?]]
const NOVOS_CASAIS: [string, string, [string, number, number?][]][] = [['ex-tia-cida', 'ex-tio-paulo', [['namoro', 1990], ['casamento', 1994]]]];

// Anos nas fases dos casais inventados que já existiam
const ANOS_DAS_FASES: [string, string, string, number, number?][] = [
  ['ex-davi', 'ex-prima-carol', 'casamento', 2012, 2017],
  ['ex-davi', 'ex-prima-carol', 'separacao', 2017],
  ['ex-igor', 'ex-prima-carol', 'namoro', 2017],
  ['ex-igor', 'ex-prima-carol', 'uniao', 2018],
  ['ex-bruno', 'ex-luisa', 'namoro', 2015],
  ['ex-bruno', 'ex-luisa', 'casamento', 2019],
  ['ex-tia-lourdes', 'ex-tio-jorge', 'casamento', 1985],
];

// [dono, pessoa, nome do laço, papel, proximidade, privado]
const NOVOS_LACOS: [string, string, string, string | null, number, boolean][] = [
  ['elizete', 'ex-dona-fatima', 'Amiga de infância', 'irmao', 1, false],
  ['gui', 'ex-dona-fatima', 'Tia de consideração', 'tio', 2, false],
  ['lucas-magno', 'ex-caio-amigo', 'Amigo de faculdade', 'irmao', 1, false],
  ['giovanna', 'ex-marina', 'Melhor amiga', 'irmao', 1, true],
];

const MAIS_EXEMPLOS: ExemploCompleto[] = [
  {
    id: '1958-casamento-vivica-tonho',
    titulo: 'Casamento da Vó Vivica e do Vô Tonho',
    ano: 1958,
    aproximada: true,
    tipo: 'casamento',
    lugar: 'Sabará',
    criadaPor: 'elizete',
    nucleos: ['bayara-nascimento'],
    integrantes: ['vo-vivica', 'ex-vo-tonho'],
    fotos: ['Os noivos na porta da igreja'],
    relatos: [{ por: 'vo-vivica', registradoPor: 'elizete', texto: 'Choveu a manhã inteira e parou meia hora antes. Ela conta isso até hoje como se fosse um recado.' }],
    temas: ['Casamentos'],
    haDias: 40,
  },
  {
    id: '1992-chegada-do-gui',
    titulo: 'A chegada do Gui',
    ano: 1992,
    tipo: 'nascimento',
    lugar: 'Belo Horizonte',
    criadaPor: 'elizete',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'elizete', 'aguilar', 'vo-bela', 'vo-vivica'],
    fotos: ['No colo da Vó Bela', 'O primeiro banho', 'A plaquinha da maternidade'],
    relatos: [
      { por: 'elizete', texto: 'Ele chegou de madrugada e não chorou. A enfermeira achou estranho, eu achei que era calma de família.' },
      { por: 'vo-bela', registradoPor: 'gui', texto: 'A Vó Bela fez canja para o hospital inteiro. Pelo menos é assim que ela lembra.' },
    ],
    haDias: 30,
  },
  {
    id: '1993-primeiros-passos',
    titulo: 'Primeiros passos no corredor',
    ano: 1993,
    aproximada: true,
    tipo: 'cotidiano',
    lugar: 'Belo Horizonte',
    criadaPor: 'elizete',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'elizete', 'aguilar'],
    relatos: [{ por: 'elizete', texto: 'Foram quatro passos até a porta da cozinha. Depois ele sentou e riu como quem já sabia.' }],
    haDias: 30,
  },
  {
    id: '1994-natal-na-vo-vivica',
    titulo: 'Primeiro Natal na casa da Vó Vivica',
    ano: 1994,
    mes: 12,
    dia: 24,
    tipo: 'festa',
    lugar: 'Sabará',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'elizete', 'aguilar', 'vo-vivica', 'ex-vo-tonho', 'ex-tia-lourdes', 'ex-tio-jorge', 'ex-primo-rafa', 'ex-prima-carol'],
    fotos: ['A árvore torta', 'Os primos embaixo da mesa'],
    relatos: [{ por: 'gui', texto: 'Não lembro de nada, mas a foto dos primos embaixo da mesa diz muito sobre a noite.' }],
    temas: ['Natal'],
    haDias: 28,
  },
  {
    id: '1995-toto-chega',
    titulo: 'O Totó chega em casa',
    ano: 1995,
    mes: 3,
    tipo: 'outro',
    tipoOutro: 'Bicho novo',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['ex-toto', 'gui', 'elizete'],
    fotos: ['Totó dentro da caixa de sapato'],
    relatos: [{ por: 'elizete', texto: 'Veio numa caixa de sapato, do vizinho. Ficou catorze anos.' }],
    temas: ['Bichos'],
    haDias: 26,
  },
  {
    id: '1996-ferias-em-guarapari',
    titulo: 'Férias em Guarapari',
    ano: 1996,
    mes: 7,
    tipo: 'viagem',
    lugar: 'Guarapari (ES)',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'elizete', 'aguilar', 'ex-tio-paulo', 'ex-tia-cida', 'ex-prima-julia'],
    fotos: ['Castelo de areia', 'A Kombi alugada', 'Picolé derretendo', 'Pôr do sol na Praia do Morro'],
    relatos: [
      { por: 'gui', texto: 'A Kombi não tinha rádio, então a trilha sonora da viagem foi o Tio Paulo cantando.' },
      { por: 'aguilar', registradoPor: 'gui', texto: 'O pai jura que pegou um peixe de meio metro. Não tem foto.' },
    ],
    temas: ['Praia'],
    haDias: 25,
  },
  {
    id: '1997-escolinha',
    titulo: 'O Gui entra na escolinha',
    ano: 1997,
    mes: 2,
    tipo: 'conquista',
    lugar: 'Belo Horizonte',
    criadaPor: 'elizete',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'elizete'],
    fotos: ['De uniforme e lancheira'],
    relatos: [{ por: 'elizete', texto: 'Quem chorou na porta fui eu.' }],
    temas: ['Escola'],
    haDias: 24,
  },
  {
    id: '1998-natal-com-os-primos',
    titulo: 'Natal com os primos',
    ano: 1998,
    mes: 12,
    dia: 25,
    tipo: 'festa',
    lugar: 'Sabará',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'ex-primo-rafa', 'ex-prima-carol', 'ex-prima-julia', 'vo-vivica'],
    fotos: ['Os quatro de pijama'],
    temas: ['Natal'],
    haDias: 24,
  },
  {
    id: '1999-chegada-da-giovanna',
    titulo: 'A chegada da Giovanna',
    ano: 1999,
    tipo: 'nascimento',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['giovanna', 'gui', 'elizete', 'aguilar', 'vo-bela', 'vo-vivica'],
    fotos: ['O Gui segurando a irmã pela primeira vez', 'Visita da Vó Vivica', 'O berço montado na sala'],
    relatos: [
      { por: 'gui', texto: 'Eu tinha sete anos e achei que ela ia ser grande no dia seguinte. Fiquei esperando.' },
      { por: 'elizete', texto: 'O Gui não saiu do lado do berço na primeira semana. Dormia no tapete.' },
      { por: 'giovanna', texto: 'Não lembro, obviamente, mas gosto de ouvir esse.' },
    ],
    haDias: 22,
  },
  {
    id: '1999-virada-do-milenio',
    titulo: 'A virada do milênio na casa da Vó Bela',
    ano: 1999,
    mes: 12,
    dia: 31,
    tipo: 'festa',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'giovanna', 'elizete', 'aguilar', 'vo-bela', 'ex-tio-paulo'],
    fotos: ['Fogos vistos da laje'],
    relatos: [{ por: 'gui', texto: 'Disseram que os computadores iam parar. Só a luz da rua piscou, e todo mundo gritou.' }],
    haDias: 21,
  },
  {
    id: '2000-um-ano-da-giovanna',
    titulo: 'Primeiro aniversário da Giovanna',
    ano: 2000,
    tipo: 'aniversario',
    lugar: 'Belo Horizonte',
    criadaPor: 'elizete',
    nucleos: ['bayara-nascimento'],
    integrantes: ['giovanna', 'gui', 'elizete', 'vo-bela'],
    fotos: ['Bolo de borboleta', 'Mão inteira no glacê'],
    temas: ['Aniversários'],
    haDias: 20,
  },
  {
    id: '2002-final-da-copa',
    titulo: 'A final da Copa na sala',
    ano: 2002,
    mes: 6,
    dia: 30,
    tipo: 'causo',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'giovanna', 'aguilar', 'ex-tio-paulo', 'ex-primo-teo'],
    relatos: [{ por: 'gui', texto: 'Jogo às oito da manhã. O pai acordou a rua inteira no segundo gol e ninguém reclamou.' }],
    temas: ['Futebol'],
    haDias: 19,
  },
  {
    id: '2003-bicicleta',
    titulo: 'A bicicleta azul',
    ano: 2003,
    mes: 9,
    tipo: 'aniversario',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'aguilar'],
    fotos: ['A bicicleta ainda com laço'],
    relatos: [{ por: 'gui', texto: 'Ralei os dois joelhos na primeira tarde e não contei para ninguém.' }],
    temas: ['Aniversários'],
    haDias: 18,
  },
  {
    id: '2004-carnaval-ouro-preto',
    titulo: 'Carnaval em Ouro Preto',
    ano: 2004,
    mes: 2,
    tipo: 'viagem',
    lugar: 'Ouro Preto',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'giovanna', 'elizete', 'ex-tia-lourdes', 'ex-primo-rafa'],
    fotos: ['Ladeira de pedra', 'Fantasias improvisadas'],
    haDias: 17,
  },
  {
    id: '2005-primeiro-dia-de-aula-giovanna',
    titulo: 'Primeiro dia de aula da Giovanna',
    ano: 2005,
    mes: 2,
    dia: 7,
    tipo: 'conquista',
    lugar: 'Belo Horizonte',
    criadaPor: 'elizete',
    nucleos: ['bayara-nascimento'],
    integrantes: ['giovanna', 'gui', 'elizete'],
    fotos: ['A mochila maior que ela'],
    relatos: [
      { por: 'elizete', texto: 'Ela entrou sem olhar para trás. Dessa vez quem ficou na porta foi o Gui.' },
      { por: 'giovanna', texto: 'Lembro do cheiro de massinha e de uma menina chamada Bia que virou minha dupla.' },
    ],
    temas: ['Escola'],
    haDias: 16,
  },
  {
    id: '2006-natal-sem-luz',
    titulo: 'O Natal em que faltou luz',
    ano: 2006,
    mes: 12,
    dia: 24,
    tipo: 'causo',
    lugar: 'Sabará',
    criadaPor: 'giovanna',
    nucleos: ['bayara-nascimento'],
    integrantes: ['giovanna', 'gui', 'elizete', 'vo-vivica', 'ex-vo-tonho', 'ex-tia-lourdes'],
    relatos: [
      { por: 'giovanna', texto: 'A ceia foi à luz de vela e o peru ficou meio cru. Melhor Natal, segundo todo mundo.' },
      { por: 'gui', texto: 'O Vô Tonho contou história de assombração até a luz voltar.' },
    ],
    temas: ['Natal'],
    haDias: 15,
  },
  {
    id: '2007-mudanca-para-o-apartamento',
    titulo: 'Mudança para o apartamento',
    ano: 2007,
    mes: 8,
    tipo: 'casa',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'giovanna', 'elizete', 'ex-toto'],
    fotos: ['O quarto dividido', 'Totó estranhando o elevador'],
    haDias: 15,
  },
  {
    id: '2008-mel-no-portao',
    titulo: 'A Mel aparece no portão',
    ano: 2008,
    mes: 4,
    tipo: 'outro',
    tipoOutro: 'Bicho novo',
    lugar: 'Belo Horizonte',
    criadaPor: 'giovanna',
    nucleos: ['bayara-nascimento'],
    integrantes: ['ex-mel', 'giovanna', 'elizete'],
    fotos: ['Mel desconfiada no sofá'],
    relatos: [{ por: 'giovanna', texto: 'Dei leite escondido por três dias. No quarto dia ela entrou e não saiu mais.' }],
    temas: ['Bichos'],
    haDias: 14,
  },
  {
    id: '2009-despedida-do-toto',
    titulo: 'Despedida do Totó',
    ano: 2009,
    mes: 11,
    tipo: 'despedida',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['ex-toto', 'gui', 'giovanna', 'elizete'],
    fotos: ['O último passeio'],
    relatos: [{ por: 'gui', texto: 'Catorze anos de rabo abanando na porta. A casa ficou grande demais por um tempo.' }],
    temas: ['Bichos'],
    haDias: 14,
  },
  {
    id: '2010-despedida-do-vo-tonho',
    titulo: 'Despedida do Vô Tonho',
    ano: 2010,
    mes: 8,
    tipo: 'despedida',
    lugar: 'Sabará',
    criadaPor: 'elizete',
    nucleos: ['bayara-nascimento'],
    integrantes: ['ex-vo-tonho', 'vo-vivica', 'elizete', 'ex-tia-lourdes', 'gui', 'giovanna'],
    relatos: [{ por: 'elizete', texto: 'Ele pediu que ninguém usasse preto. Foi um mar de camisa colorida.' }],
    haDias: 13,
  },
  {
    id: '2010-formatura-do-gui',
    titulo: 'Formatura do ensino médio',
    ano: 2010,
    mes: 12,
    dia: 11,
    tipo: 'conquista',
    lugar: 'Belo Horizonte',
    criadaPor: 'elizete',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'elizete', 'aguilar', 'giovanna', 'vo-bela'],
    fotos: ['Beca emprestada', 'Com a Giovanna de vestido de festa', 'O canudo'],
    temas: ['Escola'],
    haDias: 12,
  },
  {
    id: '2012-casamento-carol-davi',
    titulo: 'Casamento da Prima Carol',
    ano: 2012,
    mes: 5,
    dia: 19,
    tipo: 'casamento',
    lugar: 'Sabará',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['ex-prima-carol', 'ex-davi', 'ex-tia-lourdes', 'ex-tio-jorge', 'gui', 'giovanna'],
    fotos: ['Pista de dança', 'A Giovanna pegando o buquê'],
    relatos: [{ por: 'giovanna', texto: 'Peguei o buquê com treze anos e virei piada da família por uma década.' }],
    temas: ['Casamentos'],
    haDias: 11,
  },
  {
    id: '2013-estrada-ate-porto-seguro',
    titulo: 'De carro até Porto Seguro',
    ano: 2013,
    mes: 7,
    tipo: 'viagem',
    lugar: 'Porto Seguro (BA)',
    criadaPor: 'giovanna',
    nucleos: ['bayara-nascimento'],
    integrantes: ['giovanna', 'gui', 'elizete'],
    fotos: ['Mapa de papel no painel', 'Primeiro mergulho', 'Barraca de acarajé', 'Os três queimados de sol', 'Estrada ao amanhecer'],
    relatos: [
      { por: 'giovanna', texto: 'Dezoito horas de estrada, duas fitas de música e uma briga por causa do ar condicionado.' },
      { por: 'gui', texto: 'Eu dirigi a maior parte. Ela escolheu todas as músicas.' },
    ],
    temas: ['Praia'],
    haDias: 10,
  },
  {
    id: '2014-chegada-da-lia',
    titulo: 'Nasce a Lia',
    ano: 2014,
    mes: 3,
    tipo: 'nascimento',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['ex-lia', 'ex-prima-carol', 'ex-davi'],
    fotos: ['Lia de touquinha'],
    haDias: 10,
  },
  {
    id: '2014-primeiro-emprego',
    titulo: 'Primeiro emprego do Gui',
    ano: 2014,
    mes: 8,
    tipo: 'conquista',
    lugar: 'Belo Horizonte',
    criadaPor: 'elizete',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'elizete'],
    relatos: [{ por: 'elizete', texto: 'Com o primeiro salário ele levou a gente para jantar e esqueceu a carteira em casa.' }],
    haDias: 9,
  },
  {
    id: '2015-quinze-da-giovanna',
    titulo: 'Os quinze anos da Giovanna',
    ano: 2015,
    mes: 9,
    tipo: 'aniversario',
    lugar: 'Belo Horizonte',
    criadaPor: 'giovanna',
    nucleos: ['bayara-nascimento'],
    integrantes: ['giovanna', 'gui', 'elizete', 'aguilar', 'vo-bela', 'vo-vivica', 'ex-prima-julia'],
    fotos: ['Bolo de três andares', 'Valsa com o Gui', 'Mesa dos primos'],
    relatos: [{ por: 'giovanna', texto: 'Não quis festa grande, ganhei festa grande. Hoje agradeço.' }],
    temas: ['Aniversários'],
    haDias: 8,
  },
  {
    id: '2016-natal',
    titulo: 'Natal de 2016',
    ano: 2016,
    mes: 12,
    dia: 24,
    tipo: 'festa',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'giovanna', 'elizete', 'vo-bela', 'vo-vivica', 'ex-tio-paulo', 'ex-tia-cida', 'ex-primo-teo'],
    fotos: ['Amigo oculto', 'O pavê da Tia Cida'],
    temas: ['Natal'],
    haDias: 8,
  },
  {
    id: '2016-natal-foto-repetida',
    titulo: 'Natal de 2016 (foto repetida)',
    ano: 2016,
    mes: 12,
    tipo: 'festa',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui'],
    fotos: ['Amigo oculto'],
    naLixeira: true,
    haDias: 8,
  },
  {
    id: '2017-giovanna-no-vestibular',
    titulo: 'A Giovanna passa no vestibular',
    ano: 2017,
    mes: 1,
    dia: 27,
    tipo: 'conquista',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['giovanna', 'gui', 'elizete'],
    fotos: ['Cabeça pintada de tinta'],
    relatos: [{ por: 'gui', texto: 'Ela viu o resultado no celular dentro do ônibus e gritou. O motorista parou.' }],
    temas: ['Escola'],
    haDias: 7,
  },
  {
    id: '2019-almoco-com-o-magno',
    titulo: 'O primeiro almoço do Magno com a família',
    ano: 2019,
    mes: 3,
    aproximada: true,
    tipo: 'cotidiano',
    lugar: 'Belo Horizonte',
    criadaPor: 'giovanna',
    nucleos: ['bayara-nascimento', 'bayara-bracarense'],
    integrantes: ['giovanna', 'lucas-magno', 'gui', 'elizete'],
    relatos: [
      { por: 'giovanna', texto: 'Ele repetiu o feijão duas vezes. Foi aprovado ali.' },
      { por: 'lucas-magno', texto: 'Eu estava nervoso e comi por nervoso. Deu certo.' },
    ],
    haDias: 6,
  },
  {
    id: '2019-chegada-do-ben',
    titulo: 'Nasce o Ben',
    ano: 2019,
    mes: 10,
    tipo: 'nascimento',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['ex-ben', 'ex-prima-carol', 'ex-igor', 'ex-lia'],
    fotos: ['A Lia apresentando o irmão'],
    haDias: 6,
  },
  {
    id: '2020-aniversario-por-video',
    titulo: 'Aniversário por videochamada',
    ano: 2020,
    mes: 4,
    tipo: 'aniversario',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['gui', 'giovanna', 'elizete', 'vo-bela', 'ex-prima-julia'],
    fotos: ['Doze quadradinhos na tela'],
    relatos: [{ por: 'gui', texto: 'A Vó Bela ficou o tempo todo com a câmera no queixo e cantou parabéns atrasada.' }],
    temas: ['Aniversários'],
    haDias: 5,
  },
  {
    id: '2020-natal-pequeno',
    titulo: 'Natal pequeno, só a casa',
    ano: 2020,
    mes: 12,
    dia: 24,
    tipo: 'festa',
    lugar: 'Belo Horizonte',
    criadaPor: 'elizete',
    nucleos: ['bayara-nascimento'],
    integrantes: ['elizete', 'gui', 'giovanna', 'ex-mel'],
    fotos: ['Mesa para três'],
    temas: ['Natal'],
    haDias: 5,
  },
  {
    id: '2021-chegada-do-dudu',
    titulo: 'Nasce o Dudu',
    ano: 2021,
    mes: 6,
    tipo: 'nascimento',
    lugar: 'Belo Horizonte',
    criadaPor: 'lucas-magno',
    nucleos: ['bracarense'],
    integrantes: ['ex-dudu', 'ex-luisa', 'ex-bruno', 'ana-candida', 'lucio', 'lucas-magno'],
    fotos: ['O tio Magno com o sobrinho'],
    haDias: 4,
  },
  {
    id: '2021-formatura-da-giovanna',
    titulo: 'Formatura da Giovanna',
    ano: 2021,
    mes: 12,
    dia: 17,
    tipo: 'conquista',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento', 'bayara-bracarense'],
    integrantes: ['giovanna', 'gui', 'elizete', 'aguilar', 'lucas-magno', 'vo-bela'],
    fotos: ['Beca e capelo', 'Abraço da mãe', 'Família toda na escadaria'],
    relatos: [
      { por: 'gui', texto: 'Formatura de máscara, mas ninguém tirou o sorriso do rosto.' },
      { por: 'elizete', texto: 'Ver os dois formados. Não tem palavra.' },
    ],
    temas: ['Escola'],
    haDias: 4,
  },
  {
    id: '2022-serra-dos-bracarense',
    titulo: 'Fim de semana na serra',
    ano: 2022,
    mes: 7,
    tipo: 'viagem',
    lugar: 'Serra do Cipó',
    visibilidade: 'nucleos',
    criadaPor: 'lucas-magno',
    nucleos: ['bracarense'],
    integrantes: ['lucas-magno', 'ana-candida', 'lucio', 'ex-luisa', 'ex-bruno', 'ex-dudu', 'regina'],
    fotos: ['Cachoeira gelada', 'Fogueira', 'O Dudu dormindo no colo da Regina'],
    relatos: [{ por: 'lucas-magno', texto: 'Memória só do núcleo Bracarense. Quem é de fora não vê.' }],
    haDias: 3,
  },
  {
    id: '2023-chico-chega',
    titulo: 'O Chico chega',
    ano: 2023,
    mes: 3,
    dia: 12,
    tipo: 'outro',
    tipoOutro: 'Bicho novo',
    lugar: 'Belo Horizonte',
    criadaPor: 'giovanna',
    nucleos: ['bayara-bracarense'],
    integrantes: ['chico', 'giovanna', 'lucas-magno'],
    fotos: ['Chico no banco de trás', 'Primeira noite na caminha', 'O chinelo destruído'],
    relatos: [
      { por: 'giovanna', texto: 'Fomos só olhar. Voltamos com ele.' },
      { por: 'lucas-magno', texto: 'O chinelo foi o primeiro de muitos.' },
    ],
    temas: ['Bichos'],
    haDias: 3,
  },
  {
    id: '2024-noivado',
    titulo: 'O noivado da Giovanna e do Magno',
    ano: 2024,
    mes: 6,
    tipo: 'casamento',
    lugar: 'Tiradentes',
    criadaPor: 'giovanna',
    nucleos: ['bayara-nascimento', 'bayara-bracarense', 'bracarense'],
    integrantes: ['giovanna', 'lucas-magno', 'chico'],
    fotos: ['O anel', 'Os dois na rua de pedra'],
    relatos: [{ por: 'giovanna', texto: 'Ele escondeu o anel dentro da coleira do Chico. O Chico quase engoliu.' }],
    temas: ['Casamentos'],
    haDias: 2,
  },
  {
    id: '2024-aniversario-vo-bela',
    titulo: 'Almoço de aniversário da Vó Bela',
    ano: 2024,
    mes: 8,
    dia: 4,
    tipo: 'aniversario',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['vo-bela', 'aguilar', 'ex-tio-paulo', 'ex-tia-cida', 'gui', 'giovanna', 'ex-prima-julia', 'ex-primo-teo'],
    fotos: ['A Vó Bela soprando as velas', 'Os netos em volta', 'O doce de leite dela'],
    temas: ['Aniversários', 'Comida de vó'],
    haDias: 2,
  },
  {
    id: '2025-festa-junina',
    titulo: 'Festa junina no quintal da Vó Vivica',
    ano: 2025,
    mes: 6,
    tipo: 'festa',
    lugar: 'Sabará',
    criadaPor: 'giovanna',
    nucleos: ['bayara-nascimento', 'bayara-bracarense'],
    integrantes: ['vo-vivica', 'giovanna', 'lucas-magno', 'gui', 'elizete', 'ex-lia', 'ex-ben', 'chico'],
    fotos: ['Quadrilha desajeitada', 'Canjica da Vó Vivica'],
    temas: ['Comida de vó'],
    haDias: 1,
  },
  {
    id: '2025-natal',
    titulo: 'Natal de 2025',
    ano: 2025,
    mes: 12,
    dia: 24,
    tipo: 'festa',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento', 'bayara-bracarense'],
    integrantes: ['gui', 'giovanna', 'lucas-magno', 'elizete', 'aguilar', 'vo-bela', 'vo-vivica', 'chico', 'ex-mel'],
    fotos: ['A mesa posta', 'Chico de gorro', 'Amigo oculto', 'As duas avós juntas', 'O pavê', 'Todo mundo no sofá'],
    relatos: [
      { por: 'gui', texto: 'Primeiro Natal com o Magno oficialmente da família. Ele ganhou o pior presente do amigo oculto e adorou.' },
      { por: 'elizete', texto: 'Rascunho de exemplo dentro de uma memória publicada: só eu vejo até publicar.', rascunho: true },
    ],
    temas: ['Natal'],
    haDias: 1,
  },
  {
    id: '2026-pao-de-queijo-da-vo-bela',
    titulo: 'A receita do pão de queijo da Vó Bela',
    ano: 2026,
    mes: 3,
    tipo: 'cotidiano',
    lugar: 'Belo Horizonte',
    criadaPor: 'gui',
    nucleos: ['bayara-nascimento'],
    integrantes: ['vo-bela', 'gui'],
    fotos: ['A massa na bacia', 'O caderno de receitas'],
    relatos: [{ por: 'vo-bela', registradoPor: 'gui', texto: 'Polvilho azedo, queijo da Canastra e paciência. A medida do leite é "até ficar bom".' }],
    temas: ['Comida de vó'],
    haDias: 0,
  },
  {
    id: '2026-lista-de-convidados',
    titulo: 'Lista de convidados do casamento',
    ano: 2026,
    mes: 9,
    tipo: 'casamento',
    situacao: 'rascunho',
    criadaPor: 'giovanna',
    nucleos: ['bayara-bracarense'],
    integrantes: ['giovanna', 'lucas-magno'],
    relatos: [{ por: 'giovanna', texto: 'Rascunho da Giovanna. Só ela vê até publicar.' }],
    haDias: 0,
  },
];

// Capítulos: dois por época (as memórias entram pela data), os outros reunidos à mão.
// "Natais na Vó Vivica" fica dentro de "Natais"; "Só nós três" é restrito ao núcleo.
const CAPITULOS_DE_EXEMPLO: {
  id: string;
  titulo: string;
  abertura: string;
  modo: 'reunido' | 'epoca';
  inicio?: [number, number?];
  fim?: [number, number?];
  pai?: string;
  visibilidade?: 'todos' | 'nucleos';
  nucleos: string[];
  memorias?: string[];
  temas?: string[];
  criadoPor: string;
}[] = [
  {
    id: 'os-anos-90',
    titulo: 'Os anos 90',
    abertura: 'Do Gui de colo à Giovanna recém-chegada. Fitas, quintal e a casa cheia de primos.',
    modo: 'epoca',
    inicio: [1992, 1],
    fim: [1999, 12],
    nucleos: ['bayara-nascimento'],
    criadoPor: 'gui',
  },
  {
    id: 'infancia-da-giovanna',
    titulo: 'A infância da Giovanna',
    abertura: 'Dos primeiros passos ao primeiro buquê pego por engano.',
    modo: 'epoca',
    inicio: [1999],
    fim: [2012],
    nucleos: ['bayara-nascimento'],
    criadoPor: 'giovanna',
  },
  {
    id: 'pandemia',
    titulo: 'Os anos de casa',
    abertura: 'Quando a família se encontrou pela tela.',
    modo: 'epoca',
    inicio: [2020, 3],
    fim: [2021, 12],
    nucleos: ['bayara-nascimento'],
    criadoPor: 'gui',
  },
  {
    id: 'natais',
    titulo: 'Natais',
    abertura: 'Todo ano a mesma mesa, nunca a mesma história.',
    modo: 'reunido',
    nucleos: ['bayara-nascimento', 'bayara-bracarense'],
    memorias: ['1994-natal-na-vo-vivica', '1998-natal-com-os-primos', '2006-natal-sem-luz', '2016-natal', '2020-natal-pequeno', '2025-natal'],
    temas: ['Natal'],
    criadoPor: 'gui',
  },
  {
    id: 'natais-na-vo-vivica',
    titulo: 'Natais na Vó Vivica',
    abertura: 'Os que foram em Sabará.',
    modo: 'reunido',
    pai: 'natais',
    nucleos: ['bayara-nascimento'],
    memorias: ['1994-natal-na-vo-vivica', '1998-natal-com-os-primos', '2006-natal-sem-luz'],
    criadoPor: 'gui',
  },
  {
    id: 'viagens-de-familia',
    titulo: 'Viagens de família',
    abertura: 'Estrada, praia e alguma briga pelo rádio.',
    modo: 'reunido',
    nucleos: ['bayara-nascimento'],
    memorias: ['1996-ferias-em-guarapari', '2004-carnaval-ouro-preto', '2013-estrada-ate-porto-seguro', '2024-noivado'],
    temas: ['Praia'],
    criadoPor: 'giovanna',
  },
  {
    id: 'giovanna-e-magno',
    titulo: 'Giovanna e Magno',
    abertura: 'Do primeiro feijão repetido ao casamento.',
    modo: 'reunido',
    nucleos: ['bayara-bracarense'],
    memorias: ['2019-almoco-com-o-magno', '2023-chico-chega', '2024-noivado', '2026-jantar-de-casamento'],
    temas: ['Casamentos'],
    criadoPor: 'giovanna',
  },
  {
    id: 'so-nos-tres',
    titulo: 'Só nós três',
    abertura: 'Giovanna, Magno e Chico. Restrito ao núcleo.',
    modo: 'reunido',
    pai: 'giovanna-e-magno',
    visibilidade: 'nucleos',
    nucleos: ['bayara-bracarense'],
    memorias: ['2023-chico-chega', '2026-primeira-noite-em-casa'],
    criadoPor: 'giovanna',
  },
];

const slug = (nome: string) =>
  nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export async function semearAcervoDeExemplo(db: D1Database): Promise<void> {
  const ja = await db.prepare(`SELECT 1 AS ok FROM memorias WHERE id = '1992-chegada-do-gui'`).first();
  if (ja) return;
  const comandos: D1PreparedStatement[] = [];

  // Parentes, anos, filiações, casais e laços
  NOVOS_PARENTES.forEach((p, i) => {
    comandos.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO integrantes (id, nome, tipo, especie, tratamento, nascimento_ano, falecimento_ano, ordem, sobre)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Parente de exemplo, só existe na versão de teste.')`,
        )
        .bind(p.id, p.nome, p.bicho ? 'bicho' : 'pessoa', p.bicho ?? null, p.tratamento, p.nasceu ?? null, p.morreu ?? null, 80 + i),
    );
    if (p.nucleo) comandos.push(db.prepare('INSERT OR IGNORE INTO nucleo_membros (nucleo_id, integrante_id) VALUES (?, ?)').bind(p.nucleo, p.id));
  });
  for (const [id, nasceu, morreu] of ANOS) {
    comandos.push(db.prepare('UPDATE integrantes SET nascimento_ano = ? WHERE id = ? AND nascimento_ano IS NULL').bind(nasceu, id));
    if (morreu) comandos.push(db.prepare('UPDATE integrantes SET falecimento_ano = ? WHERE id = ? AND falecimento_ano IS NULL').bind(morreu, id));
  }
  for (const [filho, responsavel, qualidade] of NOVAS_FILIACOES) {
    comandos.push(db.prepare('INSERT OR IGNORE INTO filiacoes (filho_id, responsavel_id, qualidade) VALUES (?, ?, ?)').bind(filho, responsavel, qualidade));
  }
  for (const [x, y, fases] of NOVOS_CASAIS) {
    const [a, b] = x < y ? [x, y] : [y, x];
    comandos.push(db.prepare('INSERT OR IGNORE INTO casais (a_id, b_id) VALUES (?, ?)').bind(a, b));
    fases.forEach(([tipo, inicio, fim], ordem) => {
      comandos.push(
        db
          .prepare(`INSERT INTO casal_fases (casal_id, tipo, inicio_ano, fim_ano, ordem) SELECT id, ?, ?, ?, ? FROM casais WHERE a_id = ? AND b_id = ?`)
          .bind(tipo, inicio, fim ?? null, ordem, a, b),
      );
    });
  }
  for (const [x, y, tipo, inicio, fim] of ANOS_DAS_FASES) {
    const [a, b] = x < y ? [x, y] : [y, x];
    comandos.push(
      db
        .prepare(`UPDATE casal_fases SET inicio_ano = ?, fim_ano = ? WHERE tipo = ? AND casal_id = (SELECT id FROM casais WHERE a_id = ? AND b_id = ?)`)
        .bind(inicio, fim ?? null, tipo, a, b),
    );
  }
  for (const [dono, pessoa, nome, papel, proximidade, privado] of NOVOS_LACOS) {
    comandos.push(
      db
        .prepare('INSERT OR IGNORE INTO lacos_coracao (dono_id, pessoa_id, nome, papel, proximidade, privado) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(dono, pessoa, nome, papel, proximidade, privado ? 1 : 0),
    );
  }

  // Temas
  const temas = new Set([...MAIS_EXEMPLOS.flatMap((e) => e.temas ?? []), ...CAPITULOS_DE_EXEMPLO.flatMap((c) => c.temas ?? [])]);
  for (const nome of temas) comandos.push(db.prepare('INSERT OR IGNORE INTO temas (id, nome, criado_por) VALUES (?, ?, ?)').bind(slug(nome), nome, 'gui'));

  // Memórias
  for (const e of MAIS_EXEMPLOS) {
    const quando = `-${e.haDias ?? 0} days`;
    comandos.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO memorias (id, titulo, ano, mes, dia, aproximada, tipo, tipo_outro, lugar, visibilidade, situacao, exemplo, criada_por,
             criada_em, atualizada_em, excluida_em, excluida_por)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now', ?), datetime('now', ?), ?, ?)`,
        )
        .bind(
          e.id, e.titulo, e.ano, e.mes ?? null, e.dia ?? null, e.aproximada ? 1 : 0, e.tipo, e.tipoOutro ?? null, e.lugar ?? null,
          e.visibilidade ?? 'todos', e.situacao ?? 'publicada', e.criadaPor, quando, quando,
          e.naLixeira ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null, e.naLixeira ? e.criadaPor : null,
        ),
    );
    for (const n of e.nucleos) comandos.push(db.prepare('INSERT OR IGNORE INTO memoria_nucleos (memoria_id, nucleo_id) VALUES (?, ?)').bind(e.id, n));
    for (const i of e.integrantes) comandos.push(db.prepare('INSERT OR IGNORE INTO memoria_integrantes (memoria_id, integrante_id) VALUES (?, ?)').bind(e.id, i));
    (e.fotos ?? []).forEach((legenda, ordem) => {
      comandos.push(
        db
          .prepare(`INSERT INTO fotos (memoria_id, chave, legenda, principal, ordem, enviada_por) VALUES (?, '', ?, ?, ?, ?)`)
          .bind(e.id, legenda, ordem === 0 ? 1 : 0, ordem, e.criadaPor),
      );
    });
    for (const r of e.relatos ?? []) {
      const situacao = r.rascunho || e.situacao === 'rascunho' ? 'rascunho' : 'publicada';
      comandos.push(
        db.prepare(`INSERT OR IGNORE INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, ?, ?, ?, ?)`).bind(e.id, r.por, r.registradoPor ?? r.por, r.texto, situacao),
      );
    }
    for (const t of e.temas ?? []) comandos.push(db.prepare('INSERT OR IGNORE INTO tema_memorias (tema_id, memoria_id) VALUES (?, ?)').bind(slug(t), e.id));
  }

  // Capítulos (o de dentro depois do de fora, por causa da referência)
  for (const c of CAPITULOS_DE_EXEMPLO) {
    comandos.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO capitulos (id, titulo, abertura, modo, inicio_ano, inicio_mes, fim_ano, fim_mes, pai_id, visibilidade, criado_por)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          c.id, c.titulo, c.abertura, c.modo, c.inicio?.[0] ?? null, c.inicio?.[1] ?? null, c.fim?.[0] ?? null, c.fim?.[1] ?? null,
          c.pai ?? null, c.visibilidade ?? 'todos', c.criadoPor,
        ),
    );
    for (const n of c.nucleos) comandos.push(db.prepare('INSERT OR IGNORE INTO capitulo_nucleos (capitulo_id, nucleo_id) VALUES (?, ?)').bind(c.id, n));
    for (const m of c.memorias ?? []) comandos.push(db.prepare('INSERT OR IGNORE INTO capitulo_memorias (capitulo_id, memoria_id) VALUES (?, ?)').bind(c.id, m));
    for (const t of c.temas ?? []) comandos.push(db.prepare('INSERT OR IGNORE INTO tema_capitulos (tema_id, capitulo_id) VALUES (?, ?)').bind(slug(t), c.id));
  }
  await db.batch(comandos);
}

// Duas avós de consideração do Gui, para os dois caminhos de um laço "como se fosse":
// Dona Déia não passa por ninguém e se liga direto ao Gui. Dona Lourdes é mãe de consideração
// da Elizete, então chega ao Gui pela mãe dele, sem linha própria até ele.
const AVOS_DE_CONSIDERACAO: { id: string; nome: string; nasceu: number }[] = [
  { id: 'ex-dona-deia', nome: 'Dona Déia', nasceu: 1940 },
  { id: 'ex-dona-lourdes', nome: 'Dona Lourdes', nasceu: 1936 },
];
const LACOS_DAS_AVOS: [string, string, string, string, number][] = [
  ['gui', 'ex-dona-deia', 'Vó de consideração', 'avo', 1],
  ['elizete', 'ex-dona-lourdes', 'Mãe de consideração', 'pai', 1],
  ['gui', 'ex-dona-lourdes', 'Vó de consideração', 'avo', 2],
];

export async function semearConsideracoesDeExemplo(db: D1Database): Promise<void> {
  const ja = await db.prepare(`SELECT 1 AS ok FROM integrantes WHERE id = 'ex-dona-deia'`).first();
  if (ja) return;
  const comandos: D1PreparedStatement[] = AVOS_DE_CONSIDERACAO.map((p, i) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO integrantes (id, nome, tipo, tratamento, nascimento_ano, ordem, sobre)
         VALUES (?, ?, 'pessoa', 'ela', ?, ?, 'Parente de exemplo, só existe na versão de teste.')`,
      )
      .bind(p.id, p.nome, p.nasceu, 100 + i),
  );
  for (const [dono, pessoa, nome, papel, proximidade] of LACOS_DAS_AVOS) {
    comandos.push(
      db
        .prepare('INSERT OR IGNORE INTO lacos_coracao (dono_id, pessoa_id, nome, papel, proximidade, privado) VALUES (?, ?, ?, ?, ?, 0)')
        .bind(dono, pessoa, nome, papel, proximidade),
    );
  }
  await db.batch(comandos);
}

// Namoro, ex e amizade: a fase decide (decisões do Gui, 18/11/2026; comoOCasalAparece, em
// src/lib/parentesco.ts). Um caso de cada, para as prévias mostrarem:
// - Thiago namorou a Giovanna, terminou e virou amigo: laço do coração em todo lugar;
// - Jean só namorou a Giovanna e terminou: não aparece na árvore nem na página dela;
// - Bia namora o Primo Téo: laço do coração, com a linha tracejada;
// - Renata namora o Primo Rafa há anos, marcada "já é da família": aparece como casal.
// E casamentos com dia e mês, para o aniversário de casamento no Início (o da Tia Lourdes e do Tio Jorge
// cai em dezembro, perto do Natal; o da Ana Candida e do Lúcio, no fim de novembro).
const PESSOAS_DOS_CASAIS: { id: string; nome: string; tratamento: 'ela' | 'ele'; nasceu: number }[] = [
  { id: 'ex-thiago', nome: 'Thiago', tratamento: 'ele', nasceu: 1995 },
  { id: 'ex-jean', nome: 'Jean', tratamento: 'ele', nasceu: 1993 },
  { id: 'ex-bia', nome: 'Bia', tratamento: 'ela', nasceu: 2003 },
  { id: 'ex-renata', nome: 'Renata', tratamento: 'ela', nasceu: 1998 },
];
// [a, b, "já é da família", fases: [tipo, ano]]
const CASAIS_DO_CORACAO: [string, string, boolean, [string, number][]][] = [
  ['ex-thiago', 'giovanna', false, [['namoro', 2014], ['separacao', 2016], ['amizade', 2018]]],
  ['ex-jean', 'giovanna', false, [['namoro', 2010], ['separacao', 2012]]],
  ['ex-bia', 'ex-primo-teo', false, [['namoro', 2024]]],
  ['ex-primo-rafa', 'ex-renata', true, [['namoro', 2017]]],
];
// [a, b, ano, mês, dia] do casamento, onde o casamento ainda não tem mês
const CASAMENTOS_COM_DIA: [string, string, number, number, number][] = [
  ['ex-tia-lourdes', 'ex-tio-jorge', 1985, 12, 2],
  ['ana-candida', 'lucio', 1990, 11, 25],
];

// O tipo do banco vem da função vizinha: os tipos do D1 não estão no tsc das sessões (erros antigos)
export async function semearCasaisDoCoracaoDeExemplo(db: Parameters<typeof semearConsideracoesDeExemplo>[0]): Promise<void> {
  const ja = await db.prepare(`SELECT 1 AS ok FROM integrantes WHERE id = 'ex-thiago'`).first();
  if (ja) return;
  const comandos = PESSOAS_DOS_CASAIS.map((p, i) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO integrantes (id, nome, tipo, tratamento, nascimento_ano, ordem, sobre)
         VALUES (?, ?, 'pessoa', ?, ?, ?, 'Pessoa de exemplo, só existe na versão de teste.')`,
      )
      .bind(p.id, p.nome, p.tratamento, p.nasceu, 110 + i),
  );
  for (const [x, y, daFamilia, fases] of CASAIS_DO_CORACAO) {
    const [a, b] = x < y ? [x, y] : [y, x];
    comandos.push(db.prepare('INSERT OR IGNORE INTO casais (a_id, b_id, ja_da_familia) VALUES (?, ?, ?)').bind(a, b, daFamilia ? 1 : 0));
    fases.forEach(([tipo, ano], ordem) => {
      comandos.push(
        db
          .prepare(`INSERT INTO casal_fases (casal_id, tipo, inicio_ano, ordem) SELECT id, ?, ?, ? FROM casais WHERE a_id = ? AND b_id = ? AND visibilidade = 'todos'`)
          .bind(tipo, ano, ordem, a, b),
      );
    });
  }
  for (const [x, y, ano, mes, dia] of CASAMENTOS_COM_DIA) {
    const [a, b] = x < y ? [x, y] : [y, x];
    comandos.push(
      db
        .prepare(
          `UPDATE casal_fases SET inicio_ano = COALESCE(inicio_ano, ?), inicio_mes = ?, inicio_dia = ?
           WHERE tipo = 'casamento' AND inicio_mes IS NULL AND casal_id = (SELECT id FROM casais WHERE a_id = ? AND b_id = ? AND visibilidade = 'todos')`,
        )
        .bind(ano, mes, dia, a, b),
    );
  }
  await db.batch(comandos);
}

// Época e capítulo (decisão do Gui, 16/11/2026, migração 019): "A infância da Giovanna" é o caso do
// furo que o Gui achou, um capítulo por período que é da vida de uma pessoa só. No acervo de exemplo
// ele passa a ser da Giovanna; os outros capítulos por período continuam épocas de todos.
export async function semearDeQuemDeExemplo(db: D1Database): Promise<void> {
  const ja = await db.prepare('SELECT 1 AS ok FROM capitulo_pessoas LIMIT 1').first();
  if (ja) return;
  const existe = await db.prepare(`SELECT 1 AS ok FROM capitulos WHERE id = 'infancia-da-giovanna'`).first();
  if (!existe) return;
  await db.prepare(`INSERT OR IGNORE INTO capitulo_pessoas (capitulo_id, integrante_id) VALUES ('infancia-da-giovanna', 'giovanna')`).run();
}

// Painel pessoal (migração 020): aniversários de exemplo, um parente por mês, para sempre haver algum
// nos próximos 30 dias nas prévias. Só preenche quem ainda não tem mês de nascimento.
const ANIVERSARIOS_DE_EXEMPLO: [string, number, number][] = [
  ['ex-tia-lourdes', 1, 12],
  ['ex-tio-jorge', 2, 29],
  ['ex-prima-carol', 3, 8],
  ['ex-davi', 4, 21],
  ['ex-lia', 5, 3],
  ['ex-primo-rafa', 6, 17],
  ['ex-tio-paulo', 7, 25],
  ['ex-luisa', 8, 9],
  ['ex-bruno', 9, 14],
  ['ex-dudu', 10, 30],
  ['ex-tia-cida', 11, 19],
  ['ex-prima-julia', 12, 28],
  ['ex-vo-tonho', 12, 5],
  ['ex-mel', 6, 2],
];

export async function semearAniversariosDeExemplo(db: D1Database): Promise<void> {
  const ja = await db.prepare(`SELECT 1 AS ok FROM integrantes WHERE id LIKE 'ex-%' AND nascimento_mes IS NOT NULL LIMIT 1`).first();
  if (ja) return;
  await db.batch(
    ANIVERSARIOS_DE_EXEMPLO.map(([id, mes, dia]) =>
      db.prepare('UPDATE integrantes SET nascimento_mes = ?, nascimento_dia = ? WHERE id = ? AND nascimento_mes IS NULL').bind(mes, dia, id),
    ),
  );
}

// O nascimento inteiro da Elizete, inventado, para a página dela mostrar o aniversário em destaque em
// "Dados" (pedido do Gui, 18/11/2026). Só entra se ela ainda não tem nascimento: o que alguém mudar ao
// testar fica.
export async function semearNascimentoDaElizeteDeExemplo(db: D1Database): Promise<void> {
  const ela = await db.prepare(`SELECT nascimento_ano AS ano FROM integrantes WHERE id = 'elizete'`).first<{ ano: number | null }>();
  if (!ela || ela.ano) return;
  await db.prepare(`UPDATE integrantes SET nascimento_ano = 1966, nascimento_mes = 10, nascimento_dia = 12 WHERE id = 'elizete' AND nascimento_ano IS NULL`).run();
}

// O dia no começo de "Os anos de casa", para a prévia mostrar um capítulo com dia (pedido do Gui,
// 18/11/2026: o capítulo de período e a época com dia opcional). Só entra se o começo ainda não tem dia.
export async function semearDiaDosCapitulosDeExemplo(db: D1Database): Promise<void> {
  const ja = await db.prepare('SELECT 1 AS ok FROM capitulos WHERE inicio_dia IS NOT NULL OR fim_dia IS NOT NULL LIMIT 1').first();
  if (ja) return;
  await db.prepare(`UPDATE capitulos SET inicio_dia = 16 WHERE id = 'pandemia' AND inicio_mes = 3 AND inicio_dia IS NULL`).run();
}

// A carta de Natal de exemplo, a mesma que o conceito da revisão visual mostrava fixa na tela. Só
// entra onde ainda não há carta nenhuma: a que alguém escrever ao testar nunca é trocada.
// Aprovado pelo Gui em 17/11/2026 (pergunta 2 do PR do grupo "pessoal"): o texto de exemplo é o do conceito.
const CARTA_DE_EXEMPLO = [
  'Este acervo é o nosso presente de Natal para você.',
  'Juntamos aqui as fotos que estavam espalhadas pelos celulares e pelas gavetas, e as histórias que a gente só ouve quando a família se senta à mesa. Cada memória diz quando foi e quem estava lá.',
  'O acervo está só começando. Ele cresce toda vez que alguém conta o que lembra, por escrito ou com a própria voz. Você está em muitas destas histórias, e a sua versão delas ainda está faltando.',
  'Feliz Natal.',
].join('\n\n');

export async function semearCartaDeExemplo(db: D1Database): Promise<void> {
  const ja = await db.prepare('SELECT 1 AS ok FROM cartas LIMIT 1').first();
  if (ja) return;
  await db.prepare('INSERT INTO cartas (texto, assinatura, escrita_por) VALUES (?, ?, ?)').bind(CARTA_DE_EXEMPLO, 'Gui, Giovanna e Magno', 'gui').run();
}

// Três tipos de momento de exemplo, com cores e rabiscos da paleta ampliada, e uma memória em cada:
// para o QA e a Giovanna verem as cores novas em uso sem trocar nada na mão (resposta do Gui à P166
// do QA de design, 17/11/2026). As memórias nascem com data de cadastro antiga, para não entrarem
// como novidade no início de ninguém.
export { TIPOS_DE_EXEMPLO };
const MEMORIAS_DOS_TIPOS_DE_EXEMPLO: { id: string; titulo: string; ano: number; mes?: number; dia?: number; tipo: string; lugar: string; nucleo: string; integrantes: string[] }[] = [
  { id: '2023-formatura-da-luisa', titulo: 'Formatura da Luísa', ano: 2023, mes: 12, dia: 15, tipo: 'formatura', lugar: 'Belo Horizonte', nucleo: 'bracarense', integrantes: ['ex-luisa', 'giovanna'] },
  { id: '2022-uma-semana-na-praia', titulo: 'Uma semana na praia', ano: 2022, mes: 1, tipo: 'praia', lugar: 'Guarapari', nucleo: 'bayara-nascimento', integrantes: ['gui', 'ex-prima-julia', 'ex-primo-teo'] },
  { id: '2021-a-mel-descobre-a-varanda', titulo: 'A Mel descobre a varanda', ano: 2021, tipo: 'bichos', lugar: 'Belo Horizonte', nucleo: 'bayara-nascimento', integrantes: ['ex-mel', 'elizete'] },
];

export async function semearTiposDeExemplo(db: D1Database): Promise<void> {
  const ja = await db.prepare(`SELECT 1 AS ok FROM memorias WHERE id = '2023-formatura-da-luisa'`).first();
  if (ja) return;
  const comandos: D1PreparedStatement[] = [];
  // Se alguém já criou um tipo com o mesmo nome ao testar, vale o dele
  TIPOS_DE_EXEMPLO.forEach((t, i) => {
    comandos.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO tipos (id, rotulo, cor, cor_da_paleta, icone, ordem, criado_por)
           VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(ordem), 0) + 1 + ? FROM tipos WHERE id <> 'outro'), 'gui')`,
        )
        .bind(t.id, t.rotulo, t.cor, t.cor, t.icone, i),
    );
  });
  for (const m of MEMORIAS_DOS_TIPOS_DE_EXEMPLO) {
    comandos.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO memorias (id, titulo, ano, mes, dia, aproximada, tipo, lugar, visibilidade, situacao, exemplo, criada_por, criada_em, atualizada_em)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'todos', 'publicada', 1, 'gui', datetime('now', '-90 days'), datetime('now', '-90 days'))`,
        )
        .bind(m.id, m.titulo, m.ano, m.mes ?? null, m.dia ?? null, m.tipo, m.lugar),
    );
    comandos.push(db.prepare('INSERT OR IGNORE INTO memoria_nucleos (memoria_id, nucleo_id) VALUES (?, ?)').bind(m.id, m.nucleo));
    for (const i of m.integrantes) comandos.push(db.prepare('INSERT OR IGNORE INTO memoria_integrantes (memoria_id, integrante_id) VALUES (?, ?)').bind(m.id, i));
  }
  await db.batch(comandos);
}

/**
 * Os áudios de exemplo (decisão do Gui, 17/11/2026, P102): voz sintetizada nos relatos da Vó Bela e da
 * Vó Vivica, para o bloco "A voz de Fulano" aparecer. Entram uma vez só, protegidos pela existência de
 * um deles: quem remover um ao testar não o vê voltar. Os arquivos chegam ao bucket de teste pelo envio
 * das fotos de exemplo. Confere o ambiente de novo aqui, além da proteção de banco.ts.
 */
export async function semearAudiosDeExemplo(db: D1Database): Promise<void> {
  if (!AMBIENTES_COM_EXEMPLOS.includes(ambiente()) || ehHomologacao()) return;
  const ja = await db.prepare(`SELECT 1 AS ok FROM audios WHERE chave LIKE 'exemplos/%' LIMIT 1`).first();
  if (ja) return;
  const comandos: D1PreparedStatement[] = [];
  for (const a of AUDIOS_DE_EXEMPLO) {
    const relato = await db
      .prepare(`SELECT id, registrado_por FROM relatos WHERE memoria_id = ? AND por = ? AND situacao = 'publicada'`)
      .bind(a.memoria, a.por)
      .first<{ id: number; registrado_por: string }>();
    if (!relato) continue;
    comandos.push(
      db
        .prepare(`INSERT INTO audios (relato_id, memoria_id, chave, tipo, tamanho, duracao, transcricao, ordem, enviado_por) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`)
        .bind(relato.id, a.memoria, chaveDeAudioDeExemplo(a.nome), TIPO_DOS_AUDIOS_DE_EXEMPLO, a.tamanho, a.duracao, a.transcricao, relato.registrado_por),
    );
  }
  if (comandos.length) await db.batch(comandos);
}

// Avisos de exemplo (docs/decisoes.md, "Avisos"): para o "Ver como" das prévias mostrar a lista do Início,
// o número no retrato e "Sua conta" sem precisar de duas pessoas. Um relato novo e uma marcação em
// "Quem estava" para cada pessoa do "Ver como", tirados de memórias abertas a todos. Abrir a memória
// tira o aviso da lista, como de verdade. Marcados em "dados" para não se confundirem com os reais.
export async function semearAvisosDeExemplo(db: D1Database): Promise<void> {
  const ja = await db.prepare(`SELECT 1 AS ok FROM avisos WHERE dados = '{"exemplo":true}' LIMIT 1`).first();
  if (ja) return;
  const comandos: D1PreparedStatement[] = [];
  for (const para of ['gui', 'giovanna', 'elizete', 'lucas-magno']) {
    comandos.push(
      db
        .prepare(
          `INSERT INTO avisos (para, tipo, memoria_id, relato_id, de, dados)
           SELECT ?1, 'relato-novo', r.memoria_id, r.id, r.registrado_por, '{"exemplo":true}' FROM relatos r
           JOIN memorias m ON m.id = r.memoria_id
           WHERE r.situacao = 'publicada' AND r.registrado_por <> ?1 AND r.por <> ?1 AND m.situacao = 'publicada'
             AND m.visibilidade = 'todos' AND m.excluida_em IS NULL
             AND (m.criada_por = ?1 OR EXISTS (SELECT 1 FROM memoria_integrantes mi WHERE mi.memoria_id = m.id AND mi.integrante_id = ?1))
           ORDER BY m.ano DESC LIMIT 1`,
        )
        .bind(para),
      db
        .prepare(
          `INSERT INTO avisos (para, tipo, memoria_id, de, dados)
           SELECT ?1, 'quem-estava', m.id, m.criada_por, '{"exemplo":true}' FROM memorias m
           JOIN memoria_integrantes mi ON mi.memoria_id = m.id AND mi.integrante_id = ?1
           WHERE m.situacao = 'publicada' AND m.visibilidade = 'todos' AND m.excluida_em IS NULL AND m.criada_por <> ?1
           ORDER BY m.ano DESC LIMIT 1`,
        )
        .bind(para),
    );
  }
  await db.batch(comandos);
}

// O rascunho que ficou para trás (resposta do Gui à P4 do QA de 23/11/2026): a Elizete começou o relato do
// Aguilar em "Férias em Guarapari", que o Gui já publicou. No "Ver como" da Elizete, a página do relato do
// Aguilar mostra o recado, o texto dela para copiar e "Descartar este rascunho".
export async function semearRascunhoQueFicouDeExemplo(db: D1Database): Promise<void> {
  const ja = await db.prepare(`SELECT 1 AS ok FROM relatos WHERE memoria_id = '1996-ferias-em-guarapari' AND por = 'aguilar' AND registrado_por = 'elizete' LIMIT 1`).first();
  if (ja) return;
  const publicado = await db
    .prepare(`SELECT 1 AS ok FROM relatos WHERE memoria_id = '1996-ferias-em-guarapari' AND por = 'aguilar' AND situacao = 'publicada' AND registrado_por = 'gui'`)
    .first();
  if (!publicado) return;
  await db
    .prepare(
      `INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES ('1996-ferias-em-guarapari', 'aguilar', 'elizete', ?, 'rascunho')`,
    )
    .bind('O Aguilar me contou que o peixe era do tamanho do braço dele.\n\nE que o Tio Paulo ajudou a puxar a linha.')
    .run();
}

// Um pedido para liberar de exemplo (docs/decisoes.md, "Ampliar quem vê uma memória com relatos"): um
// relato da Giovanna numa memória do Gui aberta a todos fica só para a família Bayara Nascimento, como
// se o Gui tivesse acabado de abrir a memória. No "Ver como", a Giovanna vê o pedido, o Gui vê a frase
// de quem ampliou e o Magno não vê o relato até ela liberar.
export async function semearPedidoDeExemplo(db: D1Database): Promise<void> {
  const ja = await db.prepare(`SELECT 1 AS ok FROM avisos WHERE tipo = 'liberar-relato' AND dados LIKE '%"exemplo":true%' LIMIT 1`).first();
  if (ja) return;
  const relato = await db
    .prepare(
      `SELECT r.id, r.memoria_id FROM relatos r JOIN memorias m ON m.id = r.memoria_id
       WHERE r.registrado_por = 'giovanna' AND r.por = 'giovanna' AND r.situacao = 'publicada' AND r.so_para_nucleos IS NULL
         AND m.criada_por = 'gui' AND m.visibilidade = 'todos' AND m.situacao = 'publicada' AND m.excluida_em IS NULL
       ORDER BY m.ano DESC LIMIT 1`,
    )
    .first<{ id: number; memoria_id: string }>();
  if (!relato) return;
  await db.batch([
    db.prepare(`UPDATE relatos SET so_para_nucleos = '["bayara-nascimento"]' WHERE id = ?`).bind(relato.id),
    db
      .prepare(`INSERT INTO avisos (para, tipo, memoria_id, relato_id, de, dados) VALUES ('giovanna', 'liberar-relato', ?, ?, 'gui', '{"paraQuem":"toda a família","exemplo":true}')`)
      .bind(relato.memoria_id, relato.id),
  ]);
}

// A regra da sala (aplicação da E1, decisão do Gui de 24/11/2026: exemplo permanente). Um Natal restrito à
// família da Giovanna e do Magno: vendo como a Giovanna ou o Lucas Magno, ele aparece no Explorar e no tema
// Natal de lá, e nunca na TV da sala ("na sala, só o que é aberto a toda a família"). Nasceu na exploração E1
// (semearNatalRestritoDaExploracao, na prévia tst-ver-junto), e as prévias dividem o banco: por isso entra
// uma vez só, protegido pela existência da memória, com o mesmo conteúdo de lá, inclusive o texto do relato.
// A data de cadastro é antiga, para não virar novidade no Início de ninguém. A foto vazia vira uma das fotos
// de exemplo, como as outras.
export async function semearCeiaRestritaDeExemplo(db: D1Database): Promise<void> {
  const id = '2024-ceia-so-nossa';
  const ja = await db.prepare(`SELECT 1 AS ok FROM memorias WHERE id = ?`).bind(id).first();
  if (ja) return;
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO memorias (id, titulo, ano, mes, dia, aproximada, tipo, lugar, visibilidade, situacao, exemplo, criada_por, criada_em, atualizada_em)
         VALUES (?, 'Ceia só nossa, no apartamento novo', 2024, 12, 24, 0, 'festa', 'Belo Horizonte', 'nucleos', 'publicada', 1, 'giovanna', datetime('now', '-90 days'), datetime('now', '-90 days'))`,
      )
      .bind(id),
    db.prepare(`INSERT OR IGNORE INTO memoria_nucleos (memoria_id, nucleo_id) VALUES (?, 'bayara-bracarense')`).bind(id),
    ...['giovanna', 'lucas-magno', 'chico'].map((i) => db.prepare('INSERT OR IGNORE INTO memoria_integrantes (memoria_id, integrante_id) VALUES (?, ?)').bind(id, i)),
    db.prepare(`INSERT INTO fotos (memoria_id, chave, legenda, principal, ordem, enviada_por) VALUES (?, '', 'A mesa posta para dois', 1, 0, 'giovanna')`).bind(id),
    db.prepare(`INSERT OR IGNORE INTO tema_memorias (tema_id, memoria_id) VALUES ('natal', ?)`).bind(id),
    db
      .prepare(
        `INSERT OR IGNORE INTO relatos (memoria_id, por, registrado_por, texto, situacao, criado_em, atualizado_em, publicado_em)
         VALUES (?, 'giovanna', 'giovanna', ?, 'publicada', datetime('now', '-90 days'), datetime('now', '-90 days'), datetime('now', '-90 days'))`,
      )
      .bind(id, 'Memória de exemplo da exploração E1, restrita à família Bayara Bracarense: aparece no Explorar de quem é dela e nunca na sala.'),
  ]);
}
