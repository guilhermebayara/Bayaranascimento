// A regra 13 da guarda da produção (scripts/copias-no-bucket.mjs): as cópias das fotos e dos retratos só são
// gravadas pelas rotas do site, com o nome de chaveDaCopia e chaveDaCopiaDoRetrato, só depois das
// conferências, e só são apagadas junto da original. Fortalecida na sessão D1d (item 14 da revisão R-D1,
// 23/11/2026): cada violação que a revisão descreveu é dada à regra e precisa ser recusada.
import { describe, expect, it } from 'vitest';
import { AJUSTE_DAS_FOTOS, AJUSTE_DOS_RETRATOS, copiasErradas, separar } from '../scripts/copias-no-bucket.mjs';
import { APAGAR_A_FOTO_SOLTA, ROTA_DAS_FOTOS_SOLTAS } from '../scripts/apagar-no-bucket.mjs';

const fontes: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>(['../src/**/*.ts', '../src/**/*.astro', '../src/**/*.mjs', '../src/**/*.js'], { query: '?raw', import: 'default', eager: true })).map(([k, v]) => [k.replace('../', ''), v]),
);
/** As fontes com um arquivo trocado (ou novo) */
const com = (arquivo: string, texto: string) => ({ ...fontes, [arquivo]: texto });
const trocar = (arquivo: string, de: string, para: string) => {
  const texto = fontes[arquivo]!;
  expect(texto, `${arquivo} precisa ter: ${de}`).toContain(de);
  return com(arquivo, texto.replace(de, para));
};
const recusa = (f: Record<string, string>) => (copiasErradas(f) as string[]).length > 0;

const ajuste = fontes[AJUSTE_DAS_FOTOS]!;
const CONFERE_ACESSO = "if (!(await acessoAFoto(locals.usuario, chave))) return erro(404, 'Foto não encontrada.');";
const GRAVA_A_COPIA = 'await bucketDeFotos().put(chaveDaCopia(chave, t, conferidas.copias.formato), bytes[t],';

// Cada recusa lê o projeto inteiro pela árvore do código: os casos com muitas variantes levam alguns segundos
describe('a regra 13 da guarda: as cópias no bucket', { timeout: 60_000 }, () => {
  it('o código de hoje passa', () => {
    expect(Object.keys(fontes).length).toBeGreaterThan(100);
    expect(copiasErradas(fontes)).toEqual([]);
  });

  it('os comentários não contam, e um "//" dentro de um texto não é comentário', () => {
    const { codigo, literais } = separar("const a = 'http://x'; // comentário com .put(chaveDaCopia(\n/* outro\n .put( */ const b = `${c}.pequena.webp`; const r = /'/; const d = 'depois';");
    expect(codigo).toContain("'http://x'");
    expect(codigo).not.toContain('comentário');
    expect(codigo).not.toContain('outro');
    expect(codigo).toContain("const d = 'depois'");
    expect(literais).toContain('.pequena.webp');
    expect(literais).toContain('depois');
    // Uma gravação comentada em qualquer arquivo não é gravação
    expect(recusa(com('src/pages/api/audios.ts', `${fontes['src/pages/api/audios.ts']}\n// await bucketDeFotos().put(chaveDaCopia(chave, 'pequena', 'webp'), bytes);\n`))).toBe(false);
  });

  it('a conferência que só existe num comentário não vale: a ordem é lida sem eles', () => {
    expect(recusa(trocar(AJUSTE_DAS_FOTOS, CONFERE_ACESSO, `// ${CONFERE_ACESSO}`))).toBe(true);
    const leitor = 'src/pages/fotos/[...chave].ts';
    const conferencia = 'const acesso = await acessoAFoto(locals.usuario, chave);';
    expect(recusa(trocar(leitor, conferencia, `/* ${conferencia} */ const acesso = { copias: null, guardar: true };`))).toBe(true);
  });

  it('gravar cópia em outro arquivo é recusado: pela função, numa variável ou com o nome montado à mão', () => {
    const outro = 'src/pages/api/audios.ts';
    const base = fontes[outro]!;
    const importa = "import { chaveDaCopia } from '../../lib/copias-das-fotos';\n";
    // Pela função, direto na chamada
    expect(recusa(com(outro, `${importa}${base}\nawait bucketDeFotos().put(chaveDaCopia(chave, 'pequena', 'webp'), bytes);`))).toBe(true);
    // Com a chave numa variável
    expect(recusa(com(outro, `${importa}${base}\nconst destino = chaveDaCopia(chave, 'pequena', 'webp');\nawait bucketDeFotos().put(destino, bytes);`))).toBe(true);
    // Com o bucket numa variável
    expect(recusa(com(outro, `${importa}${base}\nconst b = bucketDeFotos();\nawait b.put(chaveDaCopia(chave, 'media', 'webp'), bytes);`))).toBe(true);
    // Montada à mão, sem a função
    expect(recusa(com(outro, `${base}\nawait bucketDeFotos().put(chave.replace('.jpg', '.pequena.webp'), bytes);`))).toBe(true);
    expect(recusa(com(outro, `${base}\nconst nome = \`\${base}.media.\${formato}\`;\nawait bucketDeFotos().put(nome, bytes);`))).toBe(true);
    // A cópia do retrato, também
    expect(recusa(com(outro, `${base}\nawait bucketDeFotos().put(\`\${PASTA_DOS_RETRATOS}\${chaveDaCopiaDoRetrato(chave, 'webp')}\`, bytes);`))).toBe(true);
    expect(recusa(com(outro, `${base}\nawait bucketDeFotos().put(\`retratos/\${chave.replace('.jpg', '')}.pequeno.webp\`, bytes);`))).toBe(true);
    // Num arquivo novo, também
    expect(recusa(com('src/lib/servidor/copias-escondidas.ts', `${importa}export const gravar = (c: string, b: Uint8Array) => bucketDeFotos().put(chaveDaCopia(c, 'pequena', 'jpg'), b);`))).toBe(true);
  });

  it('nas rotas das cópias: a chave numa variável, o bucket errado ou o nome à mão são recusados', () => {
    expect(recusa(trocar(AJUSTE_DAS_FOTOS, GRAVA_A_COPIA, 'const destino = chaveDaCopia(chave, t, conferidas.copias.formato);\n      await bucketDeFotos().put(destino, bytes[t],'))).toBe(true);
    expect(recusa(trocar(AJUSTE_DAS_FOTOS, GRAVA_A_COPIA, 'await bucketDosExemplos().put(chaveDaCopia(chave, t, conferidas.copias.formato), bytes[t],'))).toBe(true);
    expect(recusa(trocar(AJUSTE_DAS_FOTOS, GRAVA_A_COPIA, "await bucketDeFotos().put(chave.replace(/\\.\\w+$/, `.${t}.webp`), bytes[t],"))).toBe(true);
    // A cópia da foto pela rota dos retratos, e a do retrato fora da pasta dos retratos
    expect(recusa(trocar(AJUSTE_DOS_RETRATOS, 'const tipo = conferida.copia.formato', "await bucketDeFotos().put(chaveDaCopia(chave, 'pequena', 'webp'), bytes);\n    const tipo = conferida.copia.formato"))).toBe(true);
    expect(recusa(trocar(AJUSTE_DOS_RETRATOS, '.put(`${PASTA_DOS_RETRATOS}${chaveDaCopiaDoRetrato(', '.put(`${chaveDaCopiaDoRetrato('))).toBe(true);
  });

  it('guardarCopias e guardarCopiaDoRetrato fora do ajuste de cada uma são recusadas', () => {
    const outro = 'src/pages/api/fotos.ts';
    expect(recusa(com(outro, `${fontes[outro]}\nawait guardarCopias(chave, copias, 'x');`))).toBe(true);
    expect(recusa(com(outro, `${fontes[outro]}\nawait guardarCopiaDoRetrato(chave, 1, copia, 'x');`))).toBe(true);
    expect(recusa(com(AJUSTE_DOS_RETRATOS, `${fontes[AJUSTE_DOS_RETRATOS]}\nawait guardarCopias(chave, copias, 'x');`))).toBe(true);
    // Uma segunda definição, fora do repositório, passaria por cima
    expect(recusa(com('src/lib/servidor/outro.ts', 'export async function guardarCopias(chave: string) { return chave; }'))).toBe(true);
  });

  it('o ajuste que grava antes das conferências, sem a reserva ou sem soltá-la é recusado', () => {
    // Sem a conferência de que a foto está no ajuste (a foto solta antiga, a removida)
    expect(recusa(trocar(AJUSTE_DAS_FOTOS, "if (!(await fotoEstaNoAjuste(locals.usuario, chave))) return erro(404, 'Foto não encontrada.');", ''))).toBe(true);
    expect(recusa(trocar(AJUSTE_DOS_RETRATOS, "if (!(await retratoEstaNoAjuste(locals.usuario, chave))) return erro(404, 'Retrato não encontrado.');", ''))).toBe(true);
    // Sem a reserva, ou ignorando a recusa dela
    expect(recusa(trocar(AJUSTE_DAS_FOTOS, "if ('recusa' in reserva) return erro(409, reserva.recusa === 'feita' ? 'Esta foto já tem as cópias.' : 'As cópias desta foto já estão sendo feitas.');", ''))).toBe(true);
    expect(recusa(trocar(AJUSTE_DAS_FOTOS, 'const reserva = await reservarCopias(alvoDaFoto(chave));', "const reserva = { codigo: 'qualquer' };"))).toBe(true);
    // Gravando antes da reserva
    const antes = ajuste.replace('  // Só um pedido grava: a reserva só é tomada se a cópia ainda não existe, numa operação só no banco, e quem\n', `  await bucketDeFotos().put(chaveDaCopia(chave, 'pequena', conferidas.copias.formato), bytes.pequena);\n`);
    expect(antes).not.toBe(ajuste);
    expect(recusa(com(AJUSTE_DAS_FOTOS, antes))).toBe(true);
    // Sem soltar a reserva no fim, ou sem a reserva na anotação
    expect(recusa(trocar(AJUSTE_DAS_FOTOS, 'if (!guardadas) await soltarReserva(alvoDaFoto(chave), reserva.codigo);', ''))).toBe(true);
    expect(recusa(trocar(AJUSTE_DAS_FOTOS, 'guardarCopias(chave, conferidas.copias, reserva.codigo)', "guardarCopias(chave, conferidas.copias, 'outra')"))).toBe(true);
    // Sem a permissão de administrador
    expect(recusa(trocar(AJUSTE_DOS_RETRATOS, 'if (!decisao.ok) return erro(403, decisao.motivo);\n  if (Number', 'if (Number'))).toBe(true);
  });

  it('toda rota que lê uma cópia confere a original antes; uma rota nova que lê cópia é recusada', () => {
    const rota = 'src/pages/fotos/[...chave].ts';
    expect(recusa(trocar(rota, '  const acesso = await acessoAFoto(locals.usuario, chave);', "  const cedo = chaveDaCopia(chave, 'pequena', 'webp');\n  const acesso = await acessoAFoto(locals.usuario, chave);"))).toBe(true);
    const retratos = 'src/pages/retratos/[...chave].ts';
    expect(recusa(trocar(retratos, 'if (!acesso) return naoEncontrado();', ''))).toBe(true);
    expect(recusa(com('src/pages/miniaturas/[...chave].ts', "import { chaveDaCopia } from '../../lib/copias-das-fotos';\nexport const GET = async ({ params }) => new Response((await bucketDeFotos().get(chaveDaCopia(params.chave, 'pequena', 'webp')))?.body);"))).toBe(true);
    // Lendo pelo nome montado à mão, sem a função
    expect(recusa(com('src/pages/miniaturas/[...chave].ts', "export const GET = async ({ params }) => new Response((await bucketDeFotos().get(params.chave.replace('.jpg', '.pequena.webp')))?.body);"))).toBe(true);
  });

  // Itens 3 e 4 da revisão D1f: a regra procurava chaveDaCopia e o bucket pelo nome. Agora segue a importação
  // até a origem e o bucket até bucketDeFotos ou o env, com qualquer nome local
  describe('com outro nome local (itens 3 e 4 da revisão D1f)', () => {
    const outro = 'src/pages/api/audios.ts';
    const base = fontes[outro]!;
    const apelido = "import { chaveDaCopia as k } from '../../lib/copias-das-fotos';\n";
    it('a cópia gravada fora das rotas, com chaveDaCopia importada com outro nome', () => {
      expect(recusa(com(outro, `${apelido}${base}\nawait bucketDeFotos().put(k(chave, 'pequena', 'webp'), bytes);`))).toBe(true);
      expect(recusa(com(outro, `${apelido}${base}\nconst destino = k(chave, 'pequena', 'webp');\nconst armazenamento = bucketDeFotos();\nawait armazenamento.put(destino, bytes);`))).toBe(true);
      expect(recusa(com(outro, `import * as nomes from '../../lib/copias-das-fotos';\n${base}\nawait bucketDeFotos().put(nomes.chaveDaCopia(chave, 'pequena', 'webp'), bytes);`))).toBe(true);
      expect(recusa(com(outro, `import { chaveDaCopiaDoRetrato as r } from '../../lib/retratos';\n${base}\nawait bucketDeFotos().put(\`retratos/\${r(chave, 'webp')}\`, bytes);`))).toBe(true);
      // Por uma função de outro arquivo que devolve o nome da cópia
      expect(
        recusa({
          ...fontes,
          'src/lib/servidor/nome.ts': "import { chaveDaCopia } from '../copias-das-fotos';\nexport const nome = (c: string) => chaveDaCopia(c, 'pequena', 'webp');",
          [outro]: `import { nome } from '../../lib/servidor/nome';\n${base}\nawait bucketDeFotos().put(nome(chave), bytes);`,
        }),
      ).toBe(true);
    });
    it('a cópia lida antes da conferência, com outro nome', () => {
      const rota = 'src/pages/fotos/[...chave].ts';
      const cedo = trocar(rota, '  const acesso = await acessoAFoto(locals.usuario, chave);', "  const cedo = k(chave, 'pequena', 'webp');\n  const acesso = await acessoAFoto(locals.usuario, chave);")[rota]!;
      expect(recusa(com(rota, `${apelido}${cedo}`))).toBe(true);
      expect(recusa(com('src/pages/miniaturas/[...chave].ts', `${apelido}export const GET = async ({ params }) => new Response((await bucketDeFotos().get(k(params.chave, 'pequena', 'webp')))?.body);`))).toBe(true);
    });
    it('guardarCopias com outro nome, fora do ajuste', () => {
      expect(recusa(com(outro, `import { guardarCopias as anotar } from '../../lib/servidor/repositorio';\n${base}\nawait anotar(chave, copias, 'x');`))).toBe(true);
    });
    it('a cópia apagada com o bucket e a função com outros nomes', () => {
      expect(recusa(com(outro, `${apelido}${base}\nconst armazenamento = bucketDeFotos();\nawait armazenamento.delete(k(chave, 'pequena', 'webp'));`))).toBe(true);
      expect(recusa(com(outro, `import { chavesDasCopias as nomes } from '../../lib/copias-das-fotos';\n${base}\nconst armazenamento = bucketDeFotos();\nawait armazenamento.delete(nomes(chave));`))).toBe(true);
      expect(recusa(trocar(ROTA_DAS_FOTOS_SOLTAS, APAGAR_A_FOTO_SOLTA, `${APAGAR_A_FOTO_SOLTA}\n  const armazenamento = bucketDeFotos();\n  await armazenamento.delete(chavesDasCopias(foto.chave));`))).toBe(true);
    });
  });

  it('apagar uma cópia só junto da original, na rota das fotos soltas, também com o bucket numa variável (sessão D1c)', () => {
    expect(recusa(trocar(ROTA_DAS_FOTOS_SOLTAS, APAGAR_A_FOTO_SOLTA, `${APAGAR_A_FOTO_SOLTA}\n  const b = bucketDeFotos();\n  await b.delete(chavesDasCopias(foto.chave));`))).toBe(true);
    const outro = AJUSTE_DAS_FOTOS;
    expect(recusa(com(outro, `${ajuste}\nconst b = bucketDeFotos();\nawait b.delete(chaveDaCopia(chave, 'pequena', 'webp'));`))).toBe(true);
    expect(recusa(com('src/pages/api/audios.ts', `${fontes['src/pages/api/audios.ts']}\nconst nomes = chavesDasCopias(chave);`))).toBe(true);
  });
});
