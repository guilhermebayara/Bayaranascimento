// A regra 15 da guarda da produção (scripts/confere-producao.mjs): onde a busca existe e o que ela nunca faz
// (aplicação da E2; a regra 8b da exploração, trazida e ajustada: na exploração, a busca só existia nas prévias;
// agora existe no site inteiro, menos onde está escrito abaixo). Separada num módulo para o teste
// (testes/guarda-busca.test.ts) conferir cada recusa.
//
// - Onde a busca não existe, o `q` não vale, e a lupa, a folha e /busca não aparecem:
//   - no modo TV (o palco, sem topo): Visual.astro só põe a lupa e a folha com `comBusca`, que é `!palco`;
//   - na TV da sala: ordemDoModoTv (src/lib/servidor/tv.ts) passa `busca: !sala` a soFiltrosConhecidos, e o `q`
//     de um endereço da sala é ignorado. Fora da sala, o modo TV segue a busca do Explorar de onde foi aberto.
// - Toda chamada de soFiltrosConhecidos diz se a busca existe ali (`busca:`), para nenhuma tela nova ligar o `q`
//   sem decidir.
// - src/lib/servidor/busca.ts não escreve SQL de quem vê o quê: as consultas só leem linhas pelo id ou pelo índice,
//   e quem decide é o código, com as funções de permissoes.ts (a sessão AC3 junta essas regras num módulo só).
//   Nada de FILTRO_VISIVEL, nem de condição de visibilidade, núcleo, situação ou lixeira escrita no SQL.

const SO_CODIGO = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** As chamadas de soFiltrosConhecidos(...) de um texto, com o objeto dos conhecidos. */
function chamadasDeSoFiltros(texto) {
  const chamadas = [];
  const re = /soFiltrosConhecidos\(/g;
  let m;
  while ((m = re.exec(texto))) {
    // A chamada vai até o parêntese que fecha a de abertura
    let nivel = 1;
    let i = m.index + m[0].length;
    for (; i < texto.length && nivel > 0; i++) {
      if (texto[i] === '(') nivel++;
      else if (texto[i] === ')') nivel--;
    }
    chamadas.push(texto.slice(m.index, i));
  }
  return chamadas.filter((c) => !/^soFiltrosConhecidos\(f: Filtros/.test(c));
}

/**
 * Os problemas da regra 15. `ler` lê um arquivo do repositório; `arquivos` são os versionados (para achar toda
 * chamada de soFiltrosConhecidos no site).
 */
export function problemasDaBusca(ler, arquivos) {
  const problemas = [];
  const visual = SO_CODIGO(ler('src/layouts/Visual.astro'));
  if (!/const comBusca = !palco;/.test(visual)) problemas.push('src/layouts/Visual.astro: a lupa e a folha só existem fora do modo TV (const comBusca = !palco).');
  const lupa = /<a class="topo__procurar"/.exec(visual);
  if (!lupa || !/comBusca && \(\s*$/.test(visual.slice(Math.max(0, lupa.index - 40), lupa.index))) problemas.push('src/layouts/Visual.astro: a lupa do topo só aparece com comBusca.');
  const folha = /<dialog class="folha-busca"/.exec(visual);
  if (!folha || !/comBusca && [^\n]*\(\s*$/.test(visual.slice(Math.max(0, folha.index - 80), folha.index))) problemas.push('src/layouts/Visual.astro: a folha da busca só existe com comBusca.');

  const tv = SO_CODIGO(ler('src/lib/servidor/tv.ts'));
  const daTv = chamadasDeSoFiltros(tv);
  if (daTv.length === 0 || daTv.some((c) => !/\bbusca: !sala\b/.test(c))) problemas.push('src/lib/servidor/tv.ts: na TV da sala, a busca não existe (soFiltrosConhecidos com busca: !sala).');

  for (const arquivo of arquivos.filter((a) => /^src\/.*\.(ts|astro)$/.test(a) && a !== 'src/lib/explorar.ts')) {
    for (const chamada of chamadasDeSoFiltros(SO_CODIGO(ler(arquivo)))) {
      if (!/\bbusca:/.test(chamada)) problemas.push(`${arquivo}: soFiltrosConhecidos sem dizer se a busca existe ali (busca: true ou false).`);
    }
  }

  const busca = SO_CODIGO(ler('src/lib/servidor/busca.ts'));
  const sqls = [...busca.matchAll(/`([^`]*\b(?:SELECT|INSERT|UPDATE|DELETE)\b[^`]*)`/g)].map((m) => m[1]);
  const VISIBILIDADE = /FILTRO_VISIVEL|FILTRO_SEM_LIXEIRA|\bvisibilidade\b|\bnucleo_membros\b|\bso_para_nucleos\s*(?:IS|=|<>|IN)|\bsituacao\s*(?:=|<>|IN)|\bexcluida_em\s+IS|\bremovid[ao]_em\s+IS/i;
  for (const sql of sqls) {
    // Ler a coluna para o código decidir é permitido (SELECT ... visibilidade ...); filtrar por ela no SQL, não
    const filtro = sql.split(/\bWHERE\b/i).slice(1).join(' WHERE ');
    if (VISIBILIDADE.test(filtro) || /FILTRO_VISIVEL|FILTRO_SEM_LIXEIRA/.test(sql)) {
      problemas.push(`src/lib/servidor/busca.ts: SQL de quem vê o quê na busca (${sql.replace(/\s+/g, ' ').slice(0, 90)}…). Quem decide é o código, com permissoes.ts.`);
    }
  }
  if (!/\bpodeVerMemoria\b/.test(busca) || !/\bveORelato\b/.test(busca)) problemas.push('src/lib/servidor/busca.ts: quem vê o quê na busca é decidido por podeVerMemoria e veORelato (permissoes.ts).');
  return problemas;
}
