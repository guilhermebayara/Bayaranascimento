// Prova à mão, só leitura no SQLite LOCAL da carga. Nunca abre banco remoto.
// Antes: node_modules/.bin/esbuild src/lib/capitulos.ts --bundle --format=esm --outfile=/tmp/mem6-capitulos.mjs
// Depois: node scripts/desempenho/prova-restrita-mem6.mjs /tmp/mem6-estado/v3/d1/.../ARQUIVO.sqlite
import { DatabaseSync } from 'node:sqlite';
import { realpathSync, writeFileSync } from 'node:fs';
import { sqlVeMemoria, alcanca } from '../../src/lib/servidor/quem-ve.ts';
import { sqlMemoriaDoCapitulo } from '/tmp/mem6-capitulos.mjs';
const caminho = realpathSync(process.argv[2]);
if (!['/tmp/mem6-', '/private/tmp/mem6-'].some((p) => caminho.startsWith(p)) || !caminho.endsWith('.sqlite')) throw new Error('Só o estado local isolado da MEM-6.');
const banco = new DatabaseSync(caminho, { readOnly: true });
if (!banco.prepare("SELECT 1 FROM integrantes WHERE id LIKE 'ex-%'").get()) throw new Error('Só o banco de exemplo.');
const memoria = banco.prepare(`SELECT m.id, m.titulo, mi.integrante_id AS pessoa FROM memorias m
  JOIN capitulo_memorias cm ON cm.memoria_id = m.id JOIN memoria_integrantes mi ON mi.memoria_id = m.id
  WHERE cm.capitulo_id = 'natais' AND m.visibilidade = 'nucleos' AND m.id LIKE 'carga-%'
    AND (SELECT COUNT(*) FROM memoria_nucleos x WHERE x.memoria_id = m.id) = 1
    AND EXISTS (SELECT 1 FROM memoria_nucleos x WHERE x.memoria_id = m.id AND x.nucleo_id = 'bayara-nascimento')
  ORDER BY m.id, mi.integrante_id LIMIT 1`).get();
if (!memoria) throw new Error('Execute carga-local.mjs --fotos=exemplo antes.');
const nomes = (tabela, coluna, chave, id) => banco.prepare(`SELECT ${coluna} AS id FROM ${tabela} WHERE ${chave} = ?`).all(id).map((r) => r.id);
const linha = banco.prepare(`SELECT * FROM capitulos WHERE id = 'natais'`).get();
const leitores = [];
for (const pessoa of ['gui', 'elizete', 'lucas-magno']) {
  const nucleos = banco.prepare(`SELECT nucleo_id AS id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`).all(pessoa).map((r) => r.id);
  const filhos = banco.prepare(`SELECT id, visibilidade FROM capitulos WHERE pai_id = 'natais' AND excluido_em IS NULL`).all()
    .filter((c) => alcanca({ ...c, nucleos: nomes('capitulo_nucleos', 'nucleo_id', 'capitulo_id', c.id) }, nucleos)).map((c) => c.id);
  const grupo = `FROM memoria_integrantes mi JOIN memorias m ON m.id = mi.memoria_id WHERE mi.integrante_id = ?2 AND ${sqlVeMemoria({ so: 'publicada' })}`;
  const cap = `FROM memorias m WHERE ${sqlVeMemoria({ so: 'publicada' })} AND ${sqlMemoriaDoCapitulo('m', '?2', '?3')}`;
  const contar = (sql, valores, parametro) => ({ com: banco.prepare(`SELECT COUNT(*) AS n ${sql}`).get(...valores).n,
    sem: banco.prepare(`SELECT COUNT(*) AS n ${sql} AND m.id <> ?${parametro}`).get(...valores, memoria.id).n });
  const pessoas = contar(grupo, [pessoa, memoria.pessoa], 3);
  const capitulo = contar(cap, [pessoa, JSON.stringify({ id: linha.id, modo: linha.modo, inicio: null, fim: null, pessoas: [], familias: [] }), JSON.stringify(filhos)], 4);
  leitores.push({ pessoa, pessoas, capitulo, diferencaPessoas: pessoas.com - pessoas.sem, diferencaCapitulo: capitulo.com - capitulo.sem });
}
const resultado = { memoria, pessoaContada: banco.prepare('SELECT nome FROM integrantes WHERE id = ?').get(memoria.pessoa).nome, familia: 'bayara-nascimento', capitulo: 'natais', leitores };
writeFileSync('/tmp/mem6-prova-restrita.json', JSON.stringify(resultado, null, 2));
console.log(JSON.stringify(resultado, null, 2));
banco.close();
