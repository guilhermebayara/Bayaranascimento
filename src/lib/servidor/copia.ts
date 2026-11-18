// Cópia de segurança do banco: todas as tabelas, linha por linha, num JSON só.
//
// Vai para o Google Drive uma vez por mês (ver docs/copia-no-drive.md) e pode
// ser baixada a qualquer momento pelos admins. As fotos não entram: elas ficam
// no R2 e são grandes demais para caber aqui.
//
// A cópia para o espelho (`?retratos=1`, só pelo botão da conta) leva também a foto de cada retrato
// atual, em base64, para a homologação mostrar a família de verdade (decisão do Gui, 18/11/2026). Ler o
// bucket da produção não grava nada: quem grava os retratos no bucket da homologação é a homologação.
import { banco, bucketDeFotos } from './ambiente';
import { CHAVE_DE_RETRATO, PASTA_DOS_RETRATOS } from '../retratos';
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
  /** Só na cópia para o espelho: a foto de cada retrato atual, pela chave, em base64 */
  retratos?: Record<string, string>;
}

function emBase64(bytes: Uint8Array): string {
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

/** Os retratos atuais, para o espelho. Retrato que não está no bucket fica de fora. */
async function retratosAtuais(integrantes: Record<string, unknown>[]): Promise<Record<string, string>> {
  const retratos: Record<string, string> = {};
  for (const p of integrantes) {
    const chave = p.retrato;
    if (typeof chave !== 'string' || !CHAVE_DE_RETRATO.test(chave) || chave in retratos) continue;
    const objeto = await bucketDeFotos().get(`${PASTA_DOS_RETRATOS}${chave}`);
    if (objeto) retratos[chave] = emBase64(new Uint8Array(await objeto.arrayBuffer()));
  }
  return retratos;
}

export async function montarCopia(opcoes: { retratos?: boolean } = {}): Promise<Copia> {
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
    ...(opcoes.retratos ? { retratos: await retratosAtuais(tabelas.integrantes ?? []) } : {}),
  };
}

export async function respostaDaCopia(opcoes: { retratos?: boolean } = {}): Promise<Response> {
  const copia = await montarCopia(opcoes);
  const dia = copia.gerada_em.slice(0, 10);
  return new Response(JSON.stringify(copia, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="acervo-${opcoes.retratos ? 'para-o-espelho-' : ''}${dia}.json"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
