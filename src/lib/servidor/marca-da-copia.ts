// A marca de mudança do acervo (item 1 da revisão D1f, 24/11/2026; migração 113).
//
// A cópia do acervo vem em partes, e cada parte é um pedido (src/lib/servidor/copia.ts). Uma gravação entre
// duas partes deixava o arquivo juntado com o relato sem a memória, e a restauração falhava. Agora o banco
// tem um número que sobe a cada gravação em qualquer tabela, por gatilhos: o índice e cada parte trazem esse
// número, lido na mesma consulta das linhas. Quem junta (o script do Drive e o navegador) só aceita a cópia
// em que o número ficou igual do índice à última parte: nenhuma gravação entrou no meio, e o arquivo é o banco
// de um instante só. Se mudou, a sequência inteira é refeita, num número limitado de vezes.
//
// Os gatilhos não ficam numa migração: as tabelas mudam (as prévias criam `limpezas_do_teste` fora das
// migrações, e refazer uma tabela apaga os gatilhos dela). garantirGatilhosDaMarca cria os que faltam em toda
// tabela que existe, ao preparar o banco e de novo no índice da cópia, e a guarda por pedido sabe que gravar
// em qualquer tabela muda a marca (cobrirGravacaoEmTodaTabela, em ambiente.ts).
//
// As tabelas de registro não sobem a marca (D1f2, 24/11/2026). Elas anotam o uso do site, e não o acervo: a
// visita gravada a cada abertura do Início, o primeiro acesso, a anotação da cópia mensal. Com elas subindo a
// marca, num dia de uso o "Baixar cópia do acervo" encontrava uma visita no meio em todas as passadas e falhava.
// Elas continuam indo inteiras na cópia; só não fazem a sequência recomeçar. O critério para uma tabela estar
// em TABELAS_DE_REGISTRO, conferido no esquema de verdade por testes/copia-consistente.test.ts:
// 1. nenhuma outra tabela aponta para ela por chave estrangeira: nada no arquivo depende de uma linha dela;
// 2. as chaves estrangeiras dela, se houver, só apontam para tabelas que sobem a marca: uma linha dela nunca
//    chega ao arquivo apontando para algo que sumiu ou mudou sem a marca mudar (assim, um relato sem a memória
//    continua impossível);
// 3. uma linha dela não aparece duas vezes no arquivo quando a tabela vem em várias partes: nenhuma chave única
//    além da primária, nenhuma gravação com REPLACE, e a linha muda no lugar (upsert) ou é nova. A única que
//    apaga e volta a gravar a mesma chave é visitas ("Voltar à primeira visita", só para testar), com uma linha
//    por pessoa, menos que uma parte: ela vem numa consulta só.
// Um registro que passe a ser apontado por outra tabela, ou a apontar para uma tabela de registro, sai da lista.
//
// Duas tabelas nem vão na cópia (D1f3, 24/11/2026): reservas_das_copias, a trava de uns minutos enquanto um
// pedido grava as cópias de uma foto no bucket, e limpezas_do_teste, a faxina diária das prévias. Não são
// acervo, e uma reserva solta e retomada no meio da cópia saía duas vezes no arquivo. Restaurar sem elas só
// perde travas que venceriam sozinhas em 5 minutos e o dia da última faxina das prévias (a faxina roda de novo
// no próximo pedido, o que é inofensivo). Nenhuma tabela aponta para elas, e nenhum código lê delas algo que
// precise sobreviver a uma restauração.
//
// A marca é o atalho para recomeçar cedo. A rede está no fim: quem junta confere o arquivo montado contra o
// esquema do banco (src/lib/copia-em-partes.ts, conferirCopia), que vem no índice, lido das pragmas.

/** A tabela da marca: uma linha só, fora da cópia (ela não faz parte do acervo). */
export const TABELA_DA_MARCA = 'marca_da_copia';

/** As tabelas que não vão na cópia, além da marca: travas e faxinas passageiras, que não são acervo (D1f3). */
export const TABELAS_FORA_DA_COPIA: Readonly<Record<string, string>> = {
  reservas_das_copias: 'a reserva das cópias das fotos e dos retratos, que vence sozinha em 5 minutos',
  limpezas_do_teste: 'o dia da limpeza de 7 dias do bucket de teste, só nas prévias',
};
const FORA = [TABELA_DA_MARCA, ...Object.keys(TABELAS_FORA_DA_COPIA)].map((t) => `'${t}'`).join(', ');

/** As tabelas que a cópia leva: todas, menos as do próprio SQLite, as da Cloudflare, a da marca e as de fora. */
export const TABELAS_DA_COPIA = `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT IN (${FORA})
     ORDER BY name`;

const OPERACOES = ['INSERT', 'UPDATE', 'DELETE'] as const;
const entreAspas = (nome: string) => `"${nome.replace(/"/g, '""')}"`;
const nomeDoGatilho = (tabela: string, operacao: (typeof OPERACOES)[number]) => `${TABELA_DA_MARCA}_${tabela}_${operacao.toLowerCase()}`;

/** Os três gatilhos de uma tabela: depois de inserir, mudar ou apagar uma linha, a marca sobe. */
export function gatilhosDaMarca(tabela: string): string[] {
  return OPERACOES.map(
    (operacao) =>
      `CREATE TRIGGER IF NOT EXISTS ${entreAspas(nomeDoGatilho(tabela, operacao))} AFTER ${operacao} ON ${entreAspas(tabela)} BEGIN UPDATE ${TABELA_DA_MARCA} SET valor = valor + 1 WHERE id = 1; END`,
  );
}

/** As tabelas de registro: vão na cópia, mas gravar nelas não sobe a marca (o critério está no alto). */
export const TABELAS_DE_REGISTRO: Readonly<Record<string, string>> = {
  visitas: 'a visita de cada pessoa, gravada a cada abertura do Início (salvarVisitas)',
  acessos: 'o primeiro acesso de cada pessoa, anotado pelo middleware (registrarAcesso)',
  copias_mensais: 'a data de cada cópia mensal, anotada quando o script confirma que gravou no Drive (anotarCopiaMensal)',
  envios: 'o código de cada envio sem script, só para recusar o mesmo envio repetido',
};
const ehDeRegistro = (tabela: string) => Object.hasOwn(TABELAS_DE_REGISTRO, tabela);

/** A tabela entra na cópia (a mesma regra de TABELAS_DA_COPIA)? */
export const tabelaDaCopia = (nome: string) => !/^sqlite_/i.test(nome) && !/^_cf_/i.test(nome) && nome !== TABELA_DA_MARCA && !Object.hasOwn(TABELAS_FORA_DA_COPIA, nome);

/** As tabelas que precisam dos três gatilhos: as da cópia que não são de registro. */
export const precisaDosGatilhos = (tabela: string) => tabelaDaCopia(tabela) && !ehDeRegistro(tabela);
export { nomeDoGatilho };

interface BancoParaAMarca {
  prepare(sql: string): { all<T>(): Promise<{ results: T[] }> };
  batch(comandos: never[]): Promise<unknown>;
}

/**
 * Cria os gatilhos que faltam, em toda tabela da cópia que não é de registro, e apaga os das tabelas de
 * registro (os que a primeira versão da migração 113 criou nelas). Uma leitura só quando nada muda; devolve
 * quantos gatilhos foram criados ou apagados. Sem a tabela da marca (antes da migração 113), não faz nada.
 */
export async function garantirGatilhosDaMarca(db: BancoParaAMarca): Promise<number> {
  const { results } = await db.prepare(`SELECT type, name FROM sqlite_master WHERE type IN ('table', 'trigger')`).all<{ type: string; name: string }>();
  const linhas = results as { type: string; name: string }[];
  if (!linhas.some((l) => l.type === 'table' && l.name === TABELA_DA_MARCA)) return 0;
  const existentes = new Set(linhas.filter((l) => l.type === 'trigger').map((l) => l.name));
  const faltam: string[] = [];
  // Toda tabela: as que precisam ganham os que faltam; as de registro e as de fora da cópia perdem os que tiverem
  for (const { name: tabela } of linhas.filter((l) => l.type === 'table' && l.name !== TABELA_DA_MARCA && !/^(sqlite_|_cf_)/i.test(l.name))) {
    const sqls = gatilhosDaMarca(tabela);
    OPERACOES.forEach((operacao, i) => {
      const nome = nomeDoGatilho(tabela, operacao);
      if (!precisaDosGatilhos(tabela)) {
        if (existentes.has(nome)) faltam.push(`DROP TRIGGER IF EXISTS ${entreAspas(nome)}`);
      } else if (!existentes.has(nome)) faltam.push(sqls[i]!);
    });
  }
  if (faltam.length > 0) await db.batch(faltam.map((sql) => db.prepare(sql) as never));
  return faltam.length;
}
