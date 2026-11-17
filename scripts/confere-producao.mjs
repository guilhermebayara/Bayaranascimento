// Guarda da produção. Roda antes de todo build (prebuild) e no GitHub a cada push.
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
// 8. As telas do conceito da revisão visual (/conceito) trazem dados fixos de exemplo.
//    Só respondem onde há acervo de exemplo: na produção e na homologação, 404.
// 9. A página do sistema: fora das prévias de teste, só os administradores, sem ler o acervo.
// 10. Nenhum arquivo é apagado do bucket das fotos de verdade: só a limpeza do bucket de teste apaga,
//    e o banco e o bucket são escolhidos só em ambiente.ts.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { cascatasPerigosas } from './migracoes.mjs';

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

// 10. Nada se apaga do bucket das fotos de verdade: excluir nunca apaga na hora (docs/decisoes.md,
// "Princípios"). O único lugar que apaga arquivo é a limpeza de 7 dias, e só no bucket de teste, por
// bucketDeTesteParaGravar(), que recusa a produção e a homologação. A escolha do banco e do bucket
// fica só em ambiente.ts: código que lê env.DB ou env.FOTOS direto passaria por cima dela.
// Achado do QA de código de 17/11/2026.
{
  const fontes = existsSync('src') ? readdirSync('src', { recursive: true }).map((a) => `src/${String(a).replace(/\\/g, '/')}`).filter((a) => /\.(astro|ts|mjs|js)$/.test(a)) : [];
  for (const arquivo of fontes) {
    const texto = readFileSync(arquivo, 'utf8');
    if (arquivo !== 'src/lib/servidor/ambiente.ts' && /\benv\.(DB|FOTOS)\w*/.test(texto)) {
      falhar(`${arquivo}: o banco e o bucket são escolhidos só em src/lib/servidor/ambiente.ts (banco(), bucketDeFotos()), nunca por env.DB ou env.FOTOS.`);
    }
    for (const uso of texto.matchAll(/([\w.]*bucket\w*(?:\(\))?)\??\.delete\(/gi)) {
      const quem = uso[1];
      const doTeste = quem === 'bucketDeTesteParaGravar()' || (quem === 'bucket' && /const bucket = bucketDeTesteParaGravar\(\);/.test(texto) && !/\bbucket = (?!bucketDeTesteParaGravar)/.test(texto));
      if (!doTeste) falhar(`${arquivo}: ${quem}.delete(...) apagaria arquivos. Só a limpeza do bucket de teste apaga, por bucketDeTesteParaGravar().`);
    }
  }
}

// 6. Migrações que apagariam dados por cascata
for (const problema of cascatasPerigosas(readFileSync('src/lib/servidor/banco.ts', 'utf8'))) falhar(`src/lib/servidor/banco.ts, migração ${problema}`);

if (falhas.length) {
  console.error('Guarda da produção: algo que protege o acervo real foi quebrado.\n');
  for (const f of falhas) console.error(`- ${f}`);
  process.exit(1);
}
console.log('Guarda da produção: tudo certo.');
