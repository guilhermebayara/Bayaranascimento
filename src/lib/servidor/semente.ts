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
