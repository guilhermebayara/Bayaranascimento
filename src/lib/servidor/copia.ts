// Cópia de segurança do banco: todas as tabelas, linha por linha, num JSON só.
//
// Vai para o Google Drive uma vez por mês (ver docs/copia-no-drive.md) e pode
// ser baixada a qualquer momento pelos admins. As fotos não entram: elas ficam
// no R2 e são grandes demais para caber aqui.
import { banco } from './ambiente';
import { tamanhoDoBanco } from './repositorio';
import { AVISO_A_PARTIR_DE, LIMITE_DO_PLANO, situacaoDoBanco } from '../tamanho-do-banco';

export interface Copia {
  acervo: 'Bayara Nascimento';
  gerada_em: string;
  /**
   * O tamanho do banco, para a cópia mensal avisar quando passar de 300 MB (o script do Drive falha
   * de propósito, e o Google manda o e-mail). Vazio se o banco não informar o tamanho.
   */
  banco: { tamanho_em_bytes: number | null; aviso_a_partir_de: number; limite_do_plano: number; passou_do_aviso: boolean };
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
  const situacao = situacaoDoBanco(await tamanhoDoBanco());
  return {
    acervo: 'Bayara Nascimento',
    gerada_em: new Date().toISOString(),
    banco: {
      tamanho_em_bytes: situacao?.bytes ?? null,
      aviso_a_partir_de: AVISO_A_PARTIR_DE,
      limite_do_plano: LIMITE_DO_PLANO,
      passou_do_aviso: situacao?.passouDoAviso ?? false,
    },
    tabelas,
  };
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
