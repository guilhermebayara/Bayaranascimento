// Memórias de exemplo para o computador de desenvolvimento e para as prévias
// de branch. Nunca roda em produção (quem chama confere o ambiente).
// Os exemplos cobrem os casos que precisam ser vistos: data aproximada,
// vários relatos, relato registrado em nome de outra pessoa, memória restrita
// a um núcleo e rascunho.

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
