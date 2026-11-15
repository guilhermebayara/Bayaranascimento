// Guarda da produção. Roda antes de todo build (prebuild) e no GitHub a cada push.
// O plano gratuito do GitHub não protege branches de repositório privado, então as regras
// que não podem falhar ficam aqui e travam a publicação quando são quebradas:
//
// 1. A produção usa o banco e o bucket reais e se declara "producao", o que desliga as
//    memórias de exemplo e exige login.
// 2. As prévias de branch nunca apontam para o banco ou o bucket reais.
// 3. As memórias de exemplo só são semeadas fora da produção.
// 4. Nenhum e-mail de verdade entra no repositório: quem tem acesso fica só no segredo
//    ACESSOS do Cloudflare. E-mails de exemplo (exemplo.com, example.com, b.com) passam.
// 5. Arquivos de segredo locais (.dev.vars, .env) nunca são versionados.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

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
}

// 3. Memórias de exemplo só fora da produção
const banco = readFileSync('src/lib/servidor/banco.ts', 'utf8');
const protecao = banco.indexOf("if (env.AMBIENTE !== 'producao') {");
const chamadas = [...banco.matchAll(/await semear\w+\(/g)].map((m) => m.index);
if (protecao < 0) falhar("src/lib/servidor/banco.ts: sumiu a proteção if (env.AMBIENTE !== 'producao') em volta das memórias de exemplo.");
else {
  const fimDaProtecao = banco.indexOf('\n  }', protecao);
  for (const posicao of chamadas) {
    if (posicao < protecao || posicao > fimDaProtecao) falhar('src/lib/servidor/banco.ts: há uma chamada a semear... fora da proteção da produção.');
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

if (falhas.length) {
  console.error('Guarda da produção: algo que protege o acervo real foi quebrado.\n');
  for (const f of falhas) console.error(`- ${f}`);
  process.exit(1);
}
console.log('Guarda da produção: tudo certo.');
