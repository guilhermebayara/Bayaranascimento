// Cópia de segurança do banco: todas as tabelas, linha por linha, num JSON só.
//
// Vai para o Google Drive uma vez por mês (ver docs/copia-no-drive.md) e pode
// ser baixada a qualquer momento pelos admins. As fotos não entram: elas ficam
// no R2 e são grandes demais para caber aqui.
import { banco } from './ambiente';

export interface Copia {
  acervo: 'Bayara Nascimento';
  gerada_em: string;
  tabelas: Record<string, Record<string, unknown>[]>;
}

export async function montarCopia(): Promise<Copia> {
  const { results: nomes } = await banco().prepare(
    `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'
     ORDER BY name`,
  ).all<{ name: string }>();

  const consultas = nomes.map((t) => banco().prepare(`SELECT * FROM "${t.name.replace(/"/g, '""')}"`));
  const resultados = consultas.length ? await banco().batch(consultas) : [];

  const tabelas: Copia['tabelas'] = {};
  nomes.forEach((t, i) => {
    tabelas[t.name] = (resultados[i]?.results ?? []) as Record<string, unknown>[];
  });
  return { acervo: 'Bayara Nascimento', gerada_em: new Date().toISOString(), tabelas };
}

export async function respostaDaCopia(): Promise<Response> {
  const copia = await montarCopia();
  const dia = copia.gerada_em.slice(0, 10);
  return new Response(JSON.stringify(copia, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="acervo-${dia}.json"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
