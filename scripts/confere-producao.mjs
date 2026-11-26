// Guarda da produção. Roda antes de todo build (prebuild), tanto no do Cloudflare, a cada push, quanto no da máquina.
// No GitHub ela não roda desde 20/11/2026: lá só roda a gestalt (.github/workflows/confere.yml).
// O plano gratuito do GitHub não protege branches de repositório privado, então as regras
// que não podem falhar ficam aqui e travam a publicação quando são quebradas:
//
// 1. A produção usa o banco e o bucket reais e se declara "producao", o que desliga as
//    memórias de exemplo e exige login.
// 2. As prévias de branch nunca apontam para o banco ou o bucket reais.
// 3. As memórias de exemplo só são semeadas nas prévias e no computador, nunca na produção
//    nem na homologação. A homologação tem banco e bucket próprios.
// 4. Nenhum e-mail de verdade entra no repositório: quem tem acesso fica só no segredo
//    ACESSOS do Cloudflare. E-mails de exemplo (exemplo.com, example.com, b.com) passam.
// 5. Arquivos de segredo locais (.dev.vars, .env) nunca são versionados.
// 6. Nenhuma migração apaga uma tabela da qual outra ainda depende com ON DELETE CASCADE: a cascata
//    levaria as linhas da outra junto (ver scripts/migracoes.mjs).
// 7. As fotos de exemplo (o Chico e a Karol, em exemplos/fotos/) nunca chegam à produção: ficam fora
//    do pacote publicado, só são gravadas e apagadas no bucket de teste, pelas prévias e pelo
//    computador, e a homologação só lê o prefixo exemplos/ do bucket de teste. A limpeza de 7 dias
//    roda só no ambiente de teste.
// 7b. Os áudios de exemplo (voz sintetizada, em exemplos/audios/) seguem as mesmas regras: ficam fora do
//    pacote publicado, são os arquivos listados em src/lib/audios-de-exemplo.ts, a semente confere o
//    ambiente e a rota /audios/ só serve a chave de um deles onde há acervo de exemplo. O espelho da
//    homologação nunca os usa.
// 8. As telas do conceito da revisão visual (/conceito) trazem dados fixos de exemplo.
//    Só respondem onde há acervo de exemplo: na produção e na homologação, 404. A rota saiu em 26/11/2026
//    (sessão AC1); se voltar, precisa da trava de src/lib/servidor/conceito.ts, que a regra confere.
// 9. A página do sistema: fora das prévias de teste, só os administradores, sem ler o acervo.
// 10. Nenhum arquivo é apagado do bucket das fotos de verdade: só a limpeza do bucket de teste apaga, e a
//    foto sem memória há mais de 30 dias, que um administrador apaga em src/pages/api/fotos-soltas.ts,
//    junto com as cópias dela e só elas (sessão D1c), e o banco e o bucket são escolhidos só em ambiente.ts.
// 11. O espelho da homologação leva a família de verdade (decisão do Gui, 18/11/2026): nomes, datas e
//    laços passam; memórias, relatos, textos, retratos e fotos nunca passam. O espelho só lê da cópia as
//    tabelas da família, o "Sobre" sai vazio, e só a homologação (ou o computador) grava o espelho. Desde a
//    sessão D1e, o espelho só aceita a cópia para o espelho, que só lê as tabelas da família, coluna por
//    coluna, sem texto escrito nem arquivo (scripts/copia-para-o-espelho.mjs).
//    Nenhum arquivo da produção chega à homologação: o retrato é uma foto de exemplo, a cópia não lê o
//    bucket e o espelho não grava em bucket nenhum.
// 12. Os scripts de medição de desempenho (scripts/desempenho/) não tocam prévia, homologação ou produção
//    com dados de carga: a carga só grava no servidor local, pela Local Explorer, num banco com o acervo
//    de exemplo; a medição no navegador recusa a produção e a homologação; o site não os importa.
// 13. As cópias menores das fotos (sessão D1b, 23/11/2026; src/lib/copias-das-fotos.ts) só são gravadas pelas
//    rotas do site: a do envio da foto e a do ajuste da Administração, que só os administradores usam e
//    que confere de novo, foto por foto, quem vê a original e se ela já tem cópia. O nome da cópia nunca é
//    o de uma original, e a rota das fotos entrega a cópia só depois da conferência da original. As cópias
//    das fotos de exemplo ficam em exemplos/fotos/copias/, fora do pacote publicado.
//    A cópia pequena dos retratos (sessão D1c) segue o mesmo caminho: gravada só no envio do retrato e no
//    ajuste da Administração, com nome próprio, e entregue só depois da conferência do retrato.
//    Desde a sessão D1d (item 14 da revisão R-D1), a regra lê o código sem os comentários, em todos os
//    arquivos de src/: o nome da cópia montado à mão ou numa variável fora das rotas, guardarCopias fora
//    do ajuste, a gravação antes da reserva e a leitura da cópia antes da conferência são recusados, e a
//    cópia só é apagada junto da original, na rota das fotos soltas.
import { problemasDoSimuladorDeData } from './simulador-de-data.mjs';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { cascatasPerigosas } from './migracoes.mjs';
import { apagamentosProibidosNoProjeto, copiasApagadasErradas } from './apagar-no-bucket.mjs';
import { copiasErradas } from './copias-no-bucket.mjs';
import {
  GRAVAR_O_ESPELHO,
  LISTA as LISTA_DA_COPIA_PARA_O_ESPELHO,
  MONTAGEM as MONTAGEM_DA_COPIA_PARA_O_ESPELHO,
  ROTA as ROTA_DA_COPIA_PARA_O_ESPELHO,
  ROTA_DO_ESPELHO,
  TABELAS_DA_FAMILIA,
  copiaParaOEspelhoErrada,
} from './copia-para-o-espelho.mjs';

const PRODUCAO = { banco: 'bayara-memorias', bucket: 'bayara-memorias' };
const DOMINIOS_DE_EXEMPLO = new Set(['exemplo.com', 'example.com', 'example.org', 'b.com']);

const falhas = [];
const falhar = (mensagem) => falhas.push(mensagem);

// wrangler.jsonc tem comentários: tira os comentários de linha antes de ler
const semComentarios = readFileSync('wrangler.jsonc', 'utf8')
  .split('\n')
  .map((linha) => linha.replace(/^\s*\/\/.*$/, '').replace(/,(\s*[}\]])/g, '$1'))
  .join('\n');
const config = JSON.parse(semComentarios.replace(/,(\s*[}\]])/g, '$1'));

// 1. Produção
const bancoDaProducao = config.d1_databases?.find((b) => b.binding === 'DB')?.database_name;
const bucketDaProducao = config.r2_buckets?.find((b) => b.binding === 'FOTOS')?.bucket_name;
if (config.vars?.AMBIENTE !== 'producao') falhar('wrangler.jsonc: a produção precisa de AMBIENTE "producao" (é o que exige login e desliga os exemplos).');
if (bancoDaProducao !== PRODUCAO.banco) falhar(`wrangler.jsonc: a produção deveria usar o banco ${PRODUCAO.banco}, e usa ${bancoDaProducao}.`);
if (bucketDaProducao !== PRODUCAO.bucket) falhar(`wrangler.jsonc: a produção deveria usar o bucket ${PRODUCAO.bucket}, e usa ${bucketDaProducao}.`);

// 2. Prévias
const previas = config.previews;
if (!previas) falhar('wrangler.jsonc: falta o bloco "previews", e sem ele as prévias herdariam o banco real.');
else {
  const banco = previas.d1_databases?.find((b) => b.binding === 'DB')?.database_name;
  const bucket = previas.r2_buckets?.find((b) => b.binding === 'FOTOS')?.bucket_name;
  if (!banco || banco === PRODUCAO.banco) falhar(`wrangler.jsonc: as prévias precisam de um banco próprio de teste, e usam ${banco ?? 'o da produção'}.`);
  if (!bucket || bucket === PRODUCAO.bucket) falhar(`wrangler.jsonc: as prévias precisam de um bucket próprio de teste, e usam ${bucket ?? 'o da produção'}.`);
  if (previas.vars?.AMBIENTE === 'producao') falhar('wrangler.jsonc: as prévias não podem se declarar "producao".');
  // A homologação tem banco e bucket próprios, diferentes dos reais e dos de teste
  const bancoH = previas.d1_databases?.find((b) => b.binding === 'DB_HOMOLOGA')?.database_name;
  const bucketH = previas.r2_buckets?.find((b) => b.binding === 'FOTOS_HOMOLOGA')?.bucket_name;
  if (bancoH && (bancoH === PRODUCAO.banco || bancoH === banco)) falhar(`wrangler.jsonc: a homologação precisa de um banco só dela, e usa ${bancoH}.`);
  if (bucketH && (bucketH === PRODUCAO.bucket || bucketH === bucket)) falhar(`wrangler.jsonc: a homologação precisa de um bucket só dela, e usa ${bucketH}.`);
}
// A produção nunca enxerga o banco da homologação
if (config.d1_databases?.some((b) => b.binding === 'DB_HOMOLOGA') || config.r2_buckets?.some((b) => b.binding === 'FOTOS_HOMOLOGA')) {
  falhar('wrangler.jsonc: o banco e o bucket da homologação ficam só no bloco "previews".');
}

// 3. Memórias de exemplo só nas prévias e no computador
const banco = readFileSync('src/lib/servidor/banco.ts', 'utf8');
const protecao = banco.indexOf('if (AMBIENTES_COM_EXEMPLOS.includes(ambiente())) {');
const chamadas = [...banco.matchAll(/await (semear|limpar)\w+\(/g)].map((m) => m.index);
if (protecao < 0) falhar('src/lib/servidor/banco.ts: sumiu a proteção if (AMBIENTES_COM_EXEMPLOS.includes(ambiente())) em volta das memórias de exemplo.');
else {
  const fimDaProtecao = banco.indexOf('\n  }', protecao);
  for (const posicao of chamadas) {
    if (posicao < protecao || posicao > fimDaProtecao) falhar('src/lib/servidor/banco.ts: há uma chamada a semear... ou limpar... fora da proteção da produção.');
  }
}
const ambientes = readFileSync('src/lib/servidor/ambiente.ts', 'utf8').match(/AMBIENTES_COM_EXEMPLOS: Ambiente\[\] = \[([^\]]*)\]/);
if (!ambientes) falhar('src/lib/servidor/ambiente.ts: não achei a lista AMBIENTES_COM_EXEMPLOS.');
else if (/producao|homologa/.test(ambientes[1])) falhar('src/lib/servidor/ambiente.ts: produção e homologação nunca recebem as memórias de exemplo.');

// 7. Fotos de exemplo
{
  const fonteDoAmbiente = readFileSync('src/lib/servidor/ambiente.ts', 'utf8');
  if (!fonteDoAmbiente.includes("return ambiente() === 'producao' ? null : env.FOTOS;")) {
    falhar('src/lib/servidor/ambiente.ts: bucketDosExemplos() precisa devolver null na produção.');
  }
  if (!fonteDoAmbiente.includes("if (!AMBIENTES_COM_EXEMPLOS.includes(ambiente()) || ehHomologacao()) throw")) {
    falhar('src/lib/servidor/ambiente.ts: bucketDeTesteParaGravar() precisa recusar a produção e a homologação.');
  }
  // Pelas pastas, e não pelo git: arquivo novo, ainda não versionado, também é conferido
  const fontes = ['src', 'public'].flatMap((pasta) => (existsSync(pasta) ? readdirSync(pasta, { recursive: true }).map((a) => `${pasta}/${String(a).replace(/\\/g, '/')}`) : []));
  for (const arquivo of fontes) {
    if (/(^|\/)(chico|karol)-\d+\.(jpe?g|png|webp)$/i.test(arquivo)) falhar(`${arquivo}: as fotos de exemplo ficam em exemplos/fotos/, fora do pacote publicado.`);
    if (!/\.(astro|ts|mjs|js)$/.test(arquivo) || statSync(arquivo).isDirectory()) continue;
    const texto = readFileSync(arquivo, 'utf8');
    if (/from\s+['"][./]*exemplos\//.test(texto) || /import\(\s*['"][./]*exemplos\//.test(texto) || texto.includes('exemplos/fotos/*')) {
      falhar(`${arquivo}: o código do site não importa nada de exemplos/: as fotos iriam para o pacote publicado.`);
    }
    // A leitura do bucket das fotos de exemplo é só leitura
    for (const uso of texto.matchAll(/bucketDosExemplos\(\)\??\.(\w+)/g)) {
      if (!['get', 'head'].includes(uso[1])) falhar(`${arquivo}: bucketDosExemplos() é só para ler (get ou head), e aqui faz ${uso[1]}.`);
    }
    // Gravar e apagar no bucket de teste passa por bucketDeTesteParaGravar(), que recusa a produção e a homologação
    if (texto.includes('bucketDeTesteParaGravar()') && arquivo !== 'src/lib/servidor/ambiente.ts' && !/AMBIENTES_COM_EXEMPLOS\.includes\(ambiente\(\)\) && !ehHomologacao\(\)/.test(texto)) {
      falhar(`${arquivo}: quem grava no bucket de teste confere antes se está numa prévia de teste (AMBIENTES_COM_EXEMPLOS e não homologação).`);
    }
  }
  if (!existsSync('exemplos/fotos') || readdirSync('exemplos/fotos').filter((n) => n.endsWith('.jpg')).length !== 11) {
    falhar('exemplos/fotos/: são 11 fotos de exemplo (chico-1 a chico-5, karol-1 a karol-6).');
  }
}

// 7b. Áudios de exemplo
{
  const lista = readFileSync('src/lib/audios-de-exemplo.ts', 'utf8');
  const nomes = [...lista.matchAll(/nome: '([^']+\.m4a)'/g)].map((m) => m[1]).sort();
  const arquivos = existsSync('exemplos/audios') ? readdirSync('exemplos/audios').filter((n) => !n.startsWith('.')).sort() : [];
  if (nomes.length === 0 || JSON.stringify(nomes) !== JSON.stringify(arquivos)) {
    falhar('exemplos/audios/: os arquivos precisam ser exatamente os de AUDIOS_DE_EXEMPLO, em src/lib/audios-de-exemplo.ts.');
  }
  const fontes = ['src', 'public'].flatMap((pasta) => (existsSync(pasta) ? readdirSync(pasta, { recursive: true }).map((a) => `${pasta}/${String(a).replace(/\\/g, '/')}`) : []));
  for (const arquivo of fontes) {
    if (/\.(m4a|mp3|ogg|opus|wav|webm)$/i.test(arquivo)) falhar(`${arquivo}: os áudios de exemplo ficam em exemplos/audios/, fora do pacote publicado.`);
  }
  const semente = readFileSync('src/lib/servidor/semente.ts', 'utf8');
  const funcao = semente.slice(semente.indexOf('export async function semearAudiosDeExemplo'));
  if (!funcao.startsWith('export async function semearAudiosDeExemplo(db: D1Database): Promise<void> {\n  if (!AMBIENTES_COM_EXEMPLOS.includes(ambiente()) || ehHomologacao()) return;')) {
    falhar('src/lib/servidor/semente.ts: semearAudiosDeExemplo() começa conferindo que está numa prévia de teste (AMBIENTES_COM_EXEMPLOS e não homologação).');
  }
  const rota = readFileSync('src/pages/audios/[...chave].ts', 'utf8');
  if (!rota.includes('const deExemplo = temAcervoDeExemplo() && ehChaveDeAudioDeExemplo(chave);')) {
    falhar('src/pages/audios/[...chave].ts: a chave de um áudio de exemplo só é servida onde há acervo de exemplo (temAcervoDeExemplo).');
  }
  if (/audios-de-exemplo|AUDIOS_DE_EXEMPLO/.test(readFileSync('src/lib/espelho.ts', 'utf8'))) {
    falhar('src/lib/espelho.ts: o espelho da homologação não leva os áudios de exemplo.');
  }
}

// 4 e 5. Arquivos versionados
const versionados = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
for (const arquivo of versionados) {
  if (/(^|\/)(\.dev\.vars|\.env)(\..*)?$/.test(arquivo) && !arquivo.endsWith('.exemplo')) falhar(`${arquivo}: arquivo de segredo local não pode ser versionado.`);
  if (arquivo === 'package-lock.json' || /\.(png|jpe?g|webp|avif|gif|woff2?|ico)$/i.test(arquivo)) continue;
  let texto;
  try {
    texto = readFileSync(arquivo, 'utf8');
  } catch {
    continue;
  }
  for (const [email, dominio] of texto.matchAll(/[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g)) {
    if (DOMINIOS_DE_EXEMPLO.has(dominio.toLowerCase()) || /^noreply@/i.test(email)) continue;
    falhar(`${arquivo}: parece um e-mail de verdade (${email.replace(/^(.).*@/, '$1…@')}). E-mails de acesso ficam só no segredo ACESSOS.`);
  }
}

// 8. O conceito da revisão visual só existe onde há acervo de exemplo
if (existsSync('src/pages/conceito')) {
  const trava = existsSync('src/lib/servidor/conceito.ts') ? readFileSync('src/lib/servidor/conceito.ts', 'utf8') : '';
  if (!trava.includes('return AMBIENTES_COM_EXEMPLOS.includes(ambiente()) && !ehHomologacao();')) {
    falhar('src/lib/servidor/conceito.ts: conceitoDisponivel() só vale nas prévias de teste e no computador (AMBIENTES_COM_EXEMPLOS e não homologação).');
  }
  for (const arquivo of versionados.filter((a) => a.startsWith('src/pages/conceito/'))) {
    if (!/if \(!conceitoDisponivel\(\)[^\n]*return naoEncontrado\(\);/.test(readFileSync(arquivo, 'utf8'))) {
      falhar(`${arquivo}: toda rota do conceito começa com "if (!conceitoDisponivel()) return naoEncontrado();": ela usa dados fixos de exemplo.`);
    }
  }
}

// 9. A página do sistema existe em todos os ambientes. Fora das prévias de teste, só os
// administradores abrem, e ela nunca lê o acervo nem usa fotos de exemplo.
if (existsSync('src/pages/sistema.astro')) {
  const sistema = readFileSync('src/pages/sistema.astro', 'utf8');
  if (!/const comExemplos = temAcervoDeExemplo\(\);\nif \(!comExemplos && !usuario\.admin\) return naoEncontrado\(\);/.test(sistema)) {
    falhar('src/pages/sistema.astro: fora das prévias de teste, só os administradores abrem a página do sistema.');
  }
  if (/listarMemorias\(/.test(sistema) && !/const memorias = comExemplos \? \(await listarMemorias\(usuario\)\)/.test(sistema)) {
    falhar('src/pages/sistema.astro: a memória de exemplo da foto revelada só é lida onde há acervo de exemplo (comExemplos).');
  }
  if (/exemplos\/|\/fotos\/|\/retratos\//.test(sistema)) falhar('src/pages/sistema.astro: a página do sistema não aponta para foto nem retrato.');
  const ambiente = readFileSync('src/lib/servidor/ambiente.ts', 'utf8');
  if (!ambiente.includes('export function temAcervoDeExemplo(): boolean {\n  return AMBIENTES_COM_EXEMPLOS.includes(ambiente()) && !ehHomologacao();')) {
    falhar('src/lib/servidor/ambiente.ts: temAcervoDeExemplo() só vale nas prévias de teste e no computador.');
  }
}

// 10. Nada se apaga do bucket das fotos de verdade: excluir nunca apaga na hora (docs/regras/site.md,
// "Estrutura e princípios"). O único lugar que apaga arquivo é a limpeza de 7 dias, e só no bucket de teste, por
// bucketDeTesteParaGravar(), que recusa a produção e a homologação. A escolha do banco e do bucket
// fica só em ambiente.ts: código que lê env.DB ou env.FOTOS direto passaria por cima dela.
// Achado do QA de código de 17/11/2026. A regra mora em scripts/apagar-no-bucket.mjs, testada em
// testes/guarda-apagar.test.ts. Desde a sessão D1c, a rota das fotos soltas apaga também as cópias da foto.
{
  const fontes = existsSync('src') ? readdirSync('src', { recursive: true }).map((a) => `src/${String(a).replace(/\\/g, '/')}`).filter((a) => /\.(astro|ts|mjs|js)$/.test(a)) : [];
  for (const arquivo of fontes) {
    const texto = readFileSync(arquivo, 'utf8');
    if (arquivo !== 'src/lib/servidor/ambiente.ts' && /\benv\.(DB|FOTOS)\w*/.test(texto)) {
      falhar(`${arquivo}: o banco e o bucket são escolhidos só em src/lib/servidor/ambiente.ts (banco(), bucketDeFotos()), nunca por env.DB ou env.FOTOS.`);
    }
  }
  // O bucket seguido até a origem pelo projeto inteiro (item 3 da revisão D1f): com qualquer nome no meio
  for (const mensagem of apagamentosProibidosNoProjeto(Object.fromEntries(fontes.map((a) => [a, readFileSync(a, 'utf8')])))) falhar(mensagem);
}

// 10b. A foto sem memória que a rota acima apaga: nunca uma de exemplo (as prévias dividem os 11
// arquivos), nunca uma presa a memória ou relato, e só depois de 30 dias.
{
  const repo = readFileSync('src/lib/servidor/repositorio.ts', 'utf8');
  const regra = /const FOTO_SOLTA = `([\s\S]*?)`;/.exec(repo)?.[1] ?? '';
  if (!/export const DIAS_DA_FOTO_SOLTA = 30;/.test(repo) || !regra.includes("f.chave NOT LIKE 'exemplos/%'") || !regra.includes('f.memoria_id IS NULL') || !regra.includes('f.relato_id IS NULL') || !regra.includes("datetime('now', '-${DIAS_DA_FOTO_SOLTA} days')")) {
    falhar('src/lib/servidor/repositorio.ts: FOTO_SOLTA precisa deixar de fora as fotos de exemplo e as presas a memória ou relato, e esperar 30 dias.');
  }
}

// 10c. As cópias que a rota das fotos soltas apaga são só as da foto (sessão D1c)
for (const mensagem of copiasApagadasErradas(readFileSync('src/lib/copias-das-fotos.ts', 'utf8'))) falhar(mensagem);

// 11. O espelho: só as tabelas da família passam, e o que alguém escreveu nunca
{
  const espelho = readFileSync('src/lib/espelho.ts', 'utf8');
  const PODE_LER = new Set(['integrantes', 'nucleo_membros', 'filiacoes', 'casais', 'casal_nucleos', 'casal_fases', 'lacos_coracao', 'lacos_resumidos']);
  const lidas = [...espelho.matchAll(/\bt\('(\w+)'\)/g)].map((m) => m[1]);
  for (const tabela of lidas) if (!PODE_LER.has(tabela)) falhar(`src/lib/espelho.ts: o espelho lê "${tabela}" da cópia; só as tabelas da família passam (nomes, retratos e laços).`);
  if (/copia\.tabelas\[(?!nome\])|copia\.tabelas\./.test(espelho)) falhar('src/lib/espelho.ts: a cópia só é lida pela função t(), para a guarda ver cada tabela lida.');
  if (!/\n      sobre: null,\n/.test(espelho)) falhar('src/lib/espelho.ts: o "Sobre" de cada pessoa é texto escrito e não passa para a homologação (sobre: null).');
  const servidor = readFileSync('src/lib/servidor/espelho.ts', 'utf8');
  if (!servidor.includes("if (!podeEspelhar()) throw new Error('O espelho só pode ser gravado na homologação.');") || !servidor.includes('return ehHomologacao() || import.meta.env.DEV;')) {
    falhar('src/lib/servidor/espelho.ts: o espelho só é gravado na homologação ou no computador.');
  }
  // Nenhum arquivo da produção chega à homologação (observação do Gui, 18/11/2026)
  const soCodigo = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  if (!/\n      retrato: retratoDeExemplo\(String\(p\.id\), tratamento, bicho\),\n/.test(espelho) || /p\.retrato|copia\.retratos|base64/.test(soCodigo(espelho))) {
    falhar('src/lib/espelho.ts: o retrato de cada pessoa no espelho é uma foto de exemplo (retratoDeExemplo); o retrato de verdade não é lido.');
  }
  if (/bucket|\.put\(/i.test(soCodigo(servidor))) falhar('src/lib/servidor/espelho.ts: o espelho grava só o banco; nenhum arquivo vai para o bucket da homologação.');
  if (/bucket/i.test(soCodigo(readFileSync('src/lib/servidor/copia.ts', 'utf8')))) falhar('src/lib/servidor/copia.ts: a cópia do acervo leva só o banco; ela não lê fotos nem retratos do bucket.');
  // A cópia para o espelho (sessão D1e): só as tabelas da família, coluna por coluna, e o espelho só aceita ela.
  // A regra mora em scripts/copia-para-o-espelho.mjs, testada em testes/guarda-copia-para-o-espelho.test.ts.
  const fontesDaCopia = [LISTA_DA_COPIA_PARA_O_ESPELHO, MONTAGEM_DA_COPIA_PARA_O_ESPELHO, ROTA_DA_COPIA_PARA_O_ESPELHO, ROTA_DO_ESPELHO, GRAVAR_O_ESPELHO];
  for (const mensagem of copiaParaOEspelhoErrada(Object.fromEntries(fontesDaCopia.filter((a) => existsSync(a)).map((a) => [a, readFileSync(a, 'utf8')])))) falhar(mensagem);
  for (const tabela of TABELAS_DA_FAMILIA) if (!PODE_LER.has(tabela)) falhar(`scripts/copia-para-o-espelho.mjs: "${tabela}" não é uma das tabelas que o espelho pode ler.`);
}

// 12. Os scripts de medição de desempenho (scripts/desempenho/) nunca tocam prévia, homologação ou produção
// com dados de carga. O de carga só fala com o servidor local do computador, pela Local Explorer do
// Wrangler, e só num banco com o acervo de exemplo; os que abrem o site recusam a produção e a
// homologação; e nenhum deles entra no site publicado.
if (existsSync('scripts/desempenho')) {
  const pasta = readdirSync('scripts/desempenho').filter((a) => /\.(mjs|js|ts)$/.test(a));
  const soCodigo = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const nome of pasta) {
    const arquivo = `scripts/desempenho/${nome}`;
    const codigo = soCodigo(readFileSync(arquivo, 'utf8'));
    if (/--remote|wrangler\s+(d1|r2|deploy)|api\.cloudflare\.com/.test(codigo)) falhar(`${arquivo}: medição não usa o Wrangler nem a API do Cloudflare para chegar a um banco ou bucket remoto.`);
    if (/\/d1\/database|\/r2\/buckets/.test(codigo)) {
      // Quem grava no banco ou no bucket: só o servidor local, e só o acervo de exemplo
      const local = codigo.includes("const ENDERECOS_LOCAIS = new Set(['127.0.0.1', 'localhost', '[::1]']);") && /if \(endereco\.protocol !== 'http:' \|\| !ENDERECOS_LOCAIS\.has\(endereco\.hostname\)\) \{[^}]*process\.exit\(1\);/.test(codigo) && codigo.includes("const API = new URL('/cdn-cgi/local/explorer/api', endereco).href;");
      const soExemplo = /FROM integrantes WHERE id LIKE 'ex-%'/.test(codigo) && /if \(!exemplos\) \{[^}]*process\.exit\(1\);/.test(codigo);
      if (!local || !soExemplo) falhar(`${arquivo}: a carga só grava no servidor local (127.0.0.1, pela Local Explorer) e só num banco com o acervo de exemplo.`);
    }
    if (/chromium|fetch\(/.test(codigo) && !/\/d1\/database|\/r2\/buckets/.test(codigo) && !/const BASE = 'http:\/\/127\.0\.0\.1:4321';/.test(codigo) && !/new Error\('O proxy só repassa para o servidor local\.'\)/.test(codigo)) {
      if (!codigo.includes("if (/^(memorias|homologa\\.memorias)\\.bayara\\.com\\.br$/.test(new URL(BASE).hostname)) {")) falhar(`${arquivo}: a medição no navegador recusa a produção e a homologação.`);
    }
  }
  const fontes = existsSync('src') ? readdirSync('src', { recursive: true }).map((a) => `src/${String(a).replace(/\\/g, '/')}`).filter((a) => /\.(astro|ts|mjs|js)$/.test(a)) : [];
  for (const arquivo of fontes) if (/scripts\/desempenho/.test(readFileSync(arquivo, 'utf8'))) falhar(`${arquivo}: o site não usa os scripts de medição (scripts/desempenho/).`);
}

// 13. As cópias menores das fotos: gravadas só pelas rotas do site, com nome próprio, e entregues só depois
// da conferência da original (sessão D1b, 23/11/2026). A regra mora em scripts/copias-no-bucket.mjs, testada
// em testes/guarda-copias.test.ts, e lê o código sem os comentários (sessão D1d, item 14 da revisão R-D1).
{
  const fontes = existsSync('src') ? readdirSync('src', { recursive: true }).map((a) => `src/${String(a).replace(/\\/g, '/')}`).filter((a) => /\.(astro|ts|mjs|js)$/.test(a)) : [];
  for (const mensagem of copiasErradas(Object.fromEntries(fontes.map((a) => [a, readFileSync(a, 'utf8')])))) falhar(mensagem);
  // As cópias de exemplo: só os 22 arquivos, em exemplos/fotos/copias/, nunca no pacote publicado
  const deExemplo = existsSync('exemplos/fotos/copias') ? readdirSync('exemplos/fotos/copias') : [];
  if (deExemplo.length !== 22 || deExemplo.some((n) => !/^(chico|karol)-\d+\.(pequena|media)\.webp$/.test(n))) falhar('exemplos/fotos/copias/: são as 22 cópias das fotos de exemplo, a pequena e a média de cada uma.');
  const pacote = ['src', 'public'].flatMap((pasta) => (existsSync(pasta) ? readdirSync(pasta, { recursive: true }).map((a) => `${pasta}/${String(a).replace(/\\/g, '/')}`) : []));
  for (const arquivo of pacote) if (/(^|\/)(chico|karol)-\d+\.(pequena|media)\.\w+$/i.test(arquivo)) falhar(`${arquivo}: as cópias das fotos de exemplo ficam em exemplos/fotos/copias/, fora do pacote publicado.`);
}

// 6. Migrações que apagariam dados por cascata
for (const problema of cascatasPerigosas(readFileSync('src/lib/servidor/banco.ts', 'utf8'))) falhar(`src/lib/servidor/banco.ts, migração ${problema}`);

// 14. O simulador de data (aplicação da E1): "?hoje=AAAA-MM-DD" mostra o Início como num outro dia, para ver o
// cartão "Na TV da sala" antes do Natal. Ele nunca vale na produção: diaSimulado (src/lib/sala.ts) recusa a
// produção logo no começo, e só src/lib/servidor/dia-do-pedido.ts lê o "hoje" do endereço, passando o ambiente
// do pedido. As regras estão em scripts/simulador-de-data.mjs, com teste em testes/sala.test.ts.
for (const problema of problemasDoSimuladorDeData((caminho) => readFileSync(caminho, 'utf8'), versionados)) falhar(problema);

if (falhas.length) {
  console.error('Guarda da produção: algo que protege o acervo real foi quebrado.\n');
  for (const f of falhas) console.error(`- ${f}`);
  process.exit(1);
}
console.log('Guarda da produção: tudo certo.');
