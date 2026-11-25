// A regra 14 da guarda da produção (scripts/confere-producao.mjs): o simulador de data ("?hoje=AAAA-MM-DD")
// nunca vale na produção. Separada num módulo para o teste (testes/sala.test.ts) conferir cada recusa.
//
// - diaSimulado, em src/lib/sala.ts, começa recusando a produção: `if (ambiente === 'producao') return undefined;`
//   é a primeira linha da função, antes de ler o valor.
// - Só src/lib/servidor/dia-do-pedido.ts lê o "hoje" do endereço (searchParams.get('hoje')), e passa a
//   diaSimulado o ambiente do pedido (ambiente(), de src/lib/servidor/ambiente.ts), nunca um valor fixo.

const SO_CODIGO = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
export const ARQUIVO_DA_REGRA = 'src/lib/sala.ts';
export const ARQUIVO_DO_PEDIDO = 'src/lib/servidor/dia-do-pedido.ts';

/** O que quebra a regra, em frases para a guarda. `ler` lê um arquivo do repositório; `arquivos`, os versionados. */
export function problemasDoSimuladorDeData(ler, arquivos) {
  const problemas = [];
  const regra = SO_CODIGO(ler(ARQUIVO_DA_REGRA));
  if (!/export function diaSimulado\([^)]*\)[^{]*\{\s*if \(ambiente === 'producao'\) return undefined;/.test(regra)) {
    problemas.push(`${ARQUIVO_DA_REGRA}: diaSimulado começa recusando a produção (if (ambiente === 'producao') return undefined;).`);
  }
  const pedido = SO_CODIGO(ler(ARQUIVO_DO_PEDIDO));
  if (!/diaSimulado\(url\.searchParams\.get\('hoje'\), ambiente\(\)\)/.test(pedido) || !/import \{ ambiente \} from '\.\/ambiente';/.test(pedido)) {
    problemas.push(`${ARQUIVO_DO_PEDIDO}: o simulador de data recebe o ambiente do pedido (diaSimulado(url.searchParams.get('hoje'), ambiente())).`);
  }
  for (const arquivo of arquivos.filter((a) => /^src\/.*\.(ts|astro|mjs|js)$/.test(a) && a !== ARQUIVO_DO_PEDIDO)) {
    const codigo = SO_CODIGO(ler(arquivo));
    if (/\.get\(\s*['"`]hoje['"`]\s*\)/.test(codigo)) problemas.push(`${arquivo}: só ${ARQUIVO_DO_PEDIDO} lê o "hoje" do endereço (o simulador de data).`);
    if (arquivo !== ARQUIVO_DA_REGRA && /\bdiaSimulado\(/.test(codigo)) problemas.push(`${arquivo}: só ${ARQUIVO_DO_PEDIDO} chama diaSimulado, com o ambiente do pedido.`);
  }
  return problemas;
}
