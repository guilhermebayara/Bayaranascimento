// As cópias menores das 11 fotos de exemplo (sessão D1b, 23/11/2026). Gera, para cada foto de
// exemplos/fotos/, a pequena e a média em WebP, com as medidas de src/lib/copias-das-fotos.ts, em
// exemplos/fotos/copias/, e escreve a tabela que vai em COPIAS_DE_EXEMPLO (src/lib/fotos-de-exemplo.ts).
// As cópias sobem ao bucket de teste junto com as fotos, por scripts/enviar-fotos-de-exemplo.mjs: a
// homologação só lê, e a produção nunca recebe.
//
//   node scripts/copias-das-fotos-de-exemplo.mjs
//
// Só rode de novo se uma foto de exemplo mudar.
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import sharp from 'sharp';

// O código do site importa sem a extensão ("./fotos-de-exemplo"): o Node precisa do ".ts"
const ACHAR_TS = `export async function resolve(nome, contexto, proximo) {
  try { return await proximo(nome, contexto); } catch (e) {
    if (nome.startsWith('.') && !/\\.[a-z]+$/.test(nome)) return proximo(nome + '.ts', contexto);
    throw e;
  }
}`;
register(`data:text/javascript,${encodeURIComponent(ACHAR_TS)}`);
const { QUALIDADE_DA_COPIA, TAMANHOS, chaveDaCopia, medidaDaCopia } = await import('../src/lib/copias-das-fotos.ts');

mkdirSync('exemplos/fotos/copias', { recursive: true });
const linhas = [];
for (const nome of readdirSync('exemplos/fotos').filter((n) => n.endsWith('.jpg')).sort()) {
  const entrada = readFileSync(`exemplos/fotos/${nome}`);
  const { width, height } = await sharp(entrada).metadata();
  const partes = [];
  for (const tamanho of TAMANHOS) {
    const [w, h] = medidaDaCopia(width, height, tamanho);
    const saida = await sharp(entrada).resize(w, h, { kernel: 'lanczos3' }).webp({ quality: Math.round(QUALIDADE_DA_COPIA.webp * 100) }).toBuffer();
    const arquivo = chaveDaCopia(`exemplos/${nome}`, tamanho, 'webp').replace('exemplos/', '');
    writeFileSync(`exemplos/fotos/copias/${arquivo}`, saida);
    partes.push(`${tamanho}: { medida: [${w}, ${h}], sha256: '${createHash('sha256').update(saida).digest('hex')}', bytes: ${saida.length} }`);
  }
  linhas.push(`  '${nome}': { original: [${width}, ${height}], ${partes.join(', ')} },`);
}
console.log(`export const COPIAS_DE_EXEMPLO: Record<string, Record<Tamanho, CopiaDeExemplo> & { original: [number, number] }> = {\n${linhas.join('\n')}\n};`);
