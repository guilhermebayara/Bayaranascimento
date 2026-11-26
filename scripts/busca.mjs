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
// - src/lib/servidor/busca.ts não escreve SQL de quem vê o quê à mão. Desde a AC3 (src/lib/servidor/quem-ve.ts,
//   "consulta nova que precisa de quem vê o quê usa o fragmento de lá"), a regra entra no SQL só por um fragmento
//   importado de quem-ve.ts (`${sqlVeMemoria(...)}`, `${sqlVeORelato(...)}`); qualquer outra interpolação sql…
//   é recusada, e o texto escrito no SQL continua sem FILTRO_VISIVEL nem condição de visibilidade, núcleo,
//   situação, espera do relato, lixeira ou remoção. A memória passa por sqlVeMemoria; o relato, pelo predicado
//   veORelato (ou pelo fragmento sqlVeORelato), e a espera dele é lida só por lerEspera, que mantém '[]' como
//   espera (MEM-3, defeito 1).

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
  const VISIBILIDADE = /FILTRO_VISIVEL|FILTRO_SEM_LIXEIRA|\bvisibilidade\b|\bnucleo_membros\b|\bmemoria_nucleos\b|\bso_para_nucleos\b|\bregistrado_por\s*(?:=|<>|IN)|\bsituacao\s*(?:=|<>|IN)|\bexcluida_em\s+IS|\bremovid[ao]_em\s+IS|\bdescartado_em\b/i;
  for (const sql of sqls) {
    // Ler a coluna para o código decidir é permitido (SELECT ... visibilidade ...); filtrar por ela no SQL, não
    const filtro = sql.split(/\bWHERE\b/i).slice(1).join(' WHERE ');
    if (VISIBILIDADE.test(filtro) || /FILTRO_VISIVEL|FILTRO_SEM_LIXEIRA/.test(sql)) {
      problemas.push(`src/lib/servidor/busca.ts: SQL de quem vê o quê na busca (${sql.replace(/\s+/g, ' ').slice(0, 90)}…). Quem decide é o código, com permissoes.ts.`);
    }
  }
  // Os fragmentos de quem vê o quê: só os importados de quem-ve.ts
  const importados = new Set(
    [...busca.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]\.\/quem-ve['"]/g)].flatMap((m) => m[1].split(',').map((n) => n.trim().split(/\s+as\s+/).pop()).filter(Boolean)),
  );
  for (const sql of sqls) {
    for (const [, nome] of sql.matchAll(/\$\{\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
      if (/^sql/i.test(nome) && !importados.has(nome)) problemas.push(`src/lib/servidor/busca.ts: o fragmento ${nome} não vem de quem-ve.ts. Regra de quem vê o quê no SQL só pelos fragmentos de lá.`);
    }
  }
  const usa = (nome) => importados.has(nome) && sqls.some((sql) => new RegExp(`\\$\\{\\s*${nome}\\s*\\(`).test(sql));
  if (!usa('sqlVeMemoria')) problemas.push('src/lib/servidor/busca.ts: a memória que a busca lê passa pela regra de quem-ve.ts (sqlVeMemoria).');
  // O relato: decidido no código, com o predicado de quem-ve.ts (veORelato), ou pelo fragmento (sqlVeORelato)
  if (!(importados.has('veORelato') && /\bveORelato\(/.test(busca)) && !usa('sqlVeORelato')) problemas.push('src/lib/servidor/busca.ts: o relato que a busca lê passa pela regra de quem-ve.ts (veORelato ou sqlVeORelato).');
  // A espera do relato (so_para_nucleos) só é lida por lerEspera, de quem-ve.ts: '[]' espera como qualquer lista
  // (MEM-3, defeito 1: uma leitura própria tratava '[]' como sem espera)
  if (/so_para_nucleos/.test(busca.replace(/`[^`]*`/g, '')) && !(importados.has('lerEspera') && /\blerEspera\(/.test(busca))) problemas.push('src/lib/servidor/busca.ts: a espera do relato é lida por lerEspera, de quem-ve.ts.');
  if (/JSON\.parse\([^)]*so_para_nucleos/.test(busca) || /so_para_nucleos[^\n]*JSON\.parse/.test(busca)) problemas.push('src/lib/servidor/busca.ts: a espera do relato não é lida à mão (JSON.parse); use lerEspera, de quem-ve.ts.');
  return problemas;
}
