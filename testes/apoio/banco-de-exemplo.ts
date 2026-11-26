// O banco de teste (testes/apoio/d1.ts) com o acervo de exemplo semeado pelas próprias migrações, para os testes
// que conferem uma regra pelo comportamento, rodando a consulta de verdade (revisão MEM-2 da AC3). O arquivo de
// teste continua mockando 'cloudflare:workers' com o env que passa aqui.
import { criarD1, type D1DeTeste } from './d1';

type Valor = string | number | null;

export async function abrirBancoDeExemplo(env: { DB: unknown; FOTOS: unknown }) {
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  // Um bucket vazio: a limpeza do bucket de teste lista e não acha nada
  env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };
  const { prepararBanco } = await import('../../src/lib/servidor/banco');
  await prepararBanco();
  const repo = await import('../../src/lib/servidor/repositorio');
  const sql = (texto: string, ...valores: Valor[]) => banco.sqlite.prepare(texto).run(...valores);
  const linha = <T>(texto: string, ...valores: Valor[]) => banco.sqlite.prepare(texto).get(...valores) as T;
  const usuarioDe = (pessoa: string) => {
    const i = linha<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = (banco.sqlite.prepare(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa) as { nucleo_id: string }[]).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  /** Uma memória aberta a todos, publicada e fora da lixeira, do acervo de exemplo */
  const memoriaAberta = () => linha<{ id: string }>(`SELECT id FROM memorias WHERE situacao = 'publicada' AND visibilidade = 'todos' AND excluida_em IS NULL ORDER BY id LIMIT 1`).id;
  /** O id do último relato gravado */
  const ultimoRelato = () => linha<{ id: number }>('SELECT MAX(id) AS id FROM relatos').id;
  return { banco, repo, sql, linha, usuarioDe, memoriaAberta, ultimoRelato };
}
