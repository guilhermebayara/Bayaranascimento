// Leva as 11 fotos de exemplo (exemplos/fotos/) e os áudios de exemplo de voz sintetizada
// (exemplos/audios/) ao bucket de teste, pela rota /api/fotos-de-exemplo de uma prévia ou do computador.
// Basta uma vez: as prévias dividem o bucket de teste, e a homologação lê dele as fotos. O site só aceita
// esses arquivos, conferidos pelo SHA-256, e só nas prévias e no computador.
//
//   node scripts/enviar-fotos-de-exemplo.mjs https://tst-qualquer.memorias.bayara.com.br
//   node scripts/enviar-fotos-de-exemplo.mjs http://localhost:4321
import { readdirSync, readFileSync } from 'node:fs';

const endereco = process.argv[2];
if (!endereco || /^https:\/\/(memorias|homologa\.memorias)\.bayara\.com\.br/.test(endereco)) {
  console.error('Diga o endereço de uma prévia de teste ou do computador. Produção e homologação não recebem as fotos nem os áudios.');
  process.exit(1);
}
const rota = new URL('/api/fotos-de-exemplo', endereco);
const corpo = new FormData();
for (const nome of readdirSync('exemplos/fotos').filter((n) => n.endsWith('.jpg')).sort()) {
  corpo.append('foto', new Blob([readFileSync(`exemplos/fotos/${nome}`)], { type: 'image/jpeg' }), nome);
}
for (const nome of readdirSync('exemplos/audios').filter((n) => n.endsWith('.m4a')).sort()) {
  corpo.append('audio', new Blob([readFileSync(`exemplos/audios/${nome}`)], { type: 'audio/mp4' }), nome);
}
const resposta = await fetch(rota, { method: 'POST', body: corpo });
console.log(resposta.status, await resposta.text());
const situacao = await (await fetch(rota)).json();
console.log(`No bucket de teste: ${situacao.presentes.length} de ${situacao.total}.`);
if (!resposta.ok || situacao.presentes.length !== situacao.total) process.exit(1);
